// Geometry batching. Everything in the house is added through a Builder, which
// groups geometry by material name and merges each group into one mesh, so the
// whole house is a couple of dozen draw calls however many boards it has.
//
// Units are feet. Plan coordinates follow the 1906 drawings:
//   X runs along the street front, south (0) to north (W)
//   Y runs from the front wall (0) back toward the west
// World: x = X - W/2, y = up, z = -Y. The street front faces +z.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const W = 43.33;
export const wx = X => X - W / 2;
export const wz = Y => -Y;

export class Builder {
  constructor() {
    this.batches = new Map();
    this.colliders = [];
    // Zones, for drawing only what can be seen (see visibility.js): geometry goes to
    // this.zone if set, else to whatever this.zoner(geometry) says, else to ''.
    this.zone = null;
    this.zoner = null;
  }

  add(mat, geom) {
    const g = geom.index ? geom.toNonIndexed() : geom;
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    // Plain colours ('c#rrggbb/rough/metal') would each be a material and a draw call of
    // their own. Instead the colour is painted onto the vertices, and so is the finish
    // (roughness, in four steps, and metal or not), and every plain-coloured thing shares
    // one material, 'vc' (see materials.js).
    const plain = /^c#([0-9a-f]{6})(?:\/([\d.]+))?(?:\/([\d.]+))?$/i.exec(mat);
    if (plain) {
      const rough = Number(plain[2] ?? 0.85), metal = Number(plain[3] ?? 0) > 0.5 ? 1 : 0, q = rough < 0.33 ? 0.25 : rough < 0.55 ? 0.45 : rough < 0.78 ? 0.65 : 0.9;
      mat = 'vc';
      // (Held compactly: 16-bit colour and 8-bit finish instead of floats, and no texture coordinates,
      // which a plain colour never reads. These batches are half the house's geometry.)
      const c = new THREE.Color(parseInt(plain[1], 16)).multiplyScalar(0.78), n = g.attributes.position.count, col = new Uint16Array(n * 3), rm = new Uint8Array(n * 2);
      const cr = Math.round(c.r * 65535), cg = Math.round(c.g * 65535), cb = Math.round(c.b * 65535), q8 = Math.round(q * 255), m8 = metal * 255;
      for (let i = 0; i < n; i++) { col[i * 3] = cr; col[i * 3 + 1] = cg; col[i * 3 + 2] = cb; rm[i * 2] = q8; rm[i * 2 + 1] = m8; }
      g.setAttribute('color', new THREE.BufferAttribute(col, 3, true));
      g.setAttribute('rm', new THREE.BufferAttribute(rm, 2, true));
      if (g.attributes.uv) g.deleteAttribute('uv');
    } else {
      // Tinted photographic materials ('linen#8a9a7b') likewise: the tint goes on the vertices
      // (filled in by finalize, which knows the materials) and every tint of one cloth or wood
      // shares one material, '<name>/vc'.
      const tint = /^([a-z_]+)#([0-9a-f]{6})$/i.exec(mat);
      if (tint && tint[1] !== 'c' && tint[1] !== 'e') { mat = tint[1] + '/vc'; g.userData.tint = parseInt(tint[2], 16); }
    }
    // Normals as 16-bit integers (half the bytes of floats, and far finer than the eye can tell)
    const nf = g.attributes.normal;
    if (nf && nf.array instanceof Float32Array) {
      const a = nf.array, b = new Int16Array(a.length);
      for (let i = 0; i < a.length; i++) b[i] = Math.max(-32767, Math.min(32767, Math.round(a[i] * 32767)));
      g.setAttribute('normal', new THREE.BufferAttribute(b, 3, true));
    }
    const zone = this.zone ?? this.zoner?.(g, mat) ?? '', key = zone + '|' + mat;
    if (!this.batches.has(key)) this.batches.set(key, { zone, mat, list: [] });
    this.batches.get(key).list.push(g);
  }

  // Axis-aligned box in world space, with texture coordinates in feet so that
  // materials tile at real scale and run continuously across adjoining pieces.
  //   rot:    [rx, ry, rz] rotation about the box centre
  //   grain:  'long' turns the texture so its v axis follows the longer side of
  //           each face (for boards, whose grain runs along v)
  //   swap:   swap u and v on every face
  //   collide: register the box as an obstacle for walking
  wbox(mat, x0, x1, y0, y1, z0, z1, o = {}) {
    if (x0 > x1) [x0, x1] = [x1, x0];
    if (y0 > y1) [y0, y1] = [y1, y0];
    if (z0 > z1) [z0, z1] = [z1, z0];
    const sx = x1 - x0, sy = y1 - y0, sz = z1 - z0;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2;
    const g = new THREE.BoxGeometry(sx, sy, sz).toNonIndexed();
    const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
    const off = o.rot ? [0, 0, 0] : [cx, cy, cz];
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) + off[0], y = p.getY(i) + off[1], z = p.getZ(i) + off[2];
      let u, v, du, dv;
      if (Math.abs(n.getX(i)) > 0.5) { u = z; v = y; du = sz; dv = sy; }
      else if (Math.abs(n.getY(i)) > 0.5) { u = x; v = z; du = sx; dv = sz; }
      else { u = x; v = y; du = sx; dv = sy; }
      if (o.swap || (o.grain === 'long' && du > dv)) [u, v] = [v, u];
      uv.setXY(i, u, v);
    }
    if (o.rot) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...o.rot)));
    g.translate(cx, cy, cz);
    this.add(mat, g);
    if (o.collide) this.colliders.push({ x0, x1, y0, y1, z0, z1 });
  }

  // A soft-edged box (cushions, mattresses), in plan coordinates.
  prbox(mat, X0, X1, Y0, Y1, h0, h1, r = 0.15) {
    const sx = Math.abs(X1 - X0), sy = h1 - h0, sz = Math.abs(Y1 - Y0);
    const g = new RoundedBoxGeometry(sx, sy, sz, 2, Math.min(r, sx / 2.01, sy / 2.01, sz / 2.01));
    // Texture coordinates in feet, so cloth and leather weave at their true scale
    const n = g.attributes.normal, uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
      const [su, sv] = ax >= ay && ax >= az ? [sz, sy] : ay >= az ? [sx, sz] : [sx, sy];
      uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
    }
    g.translate(wx((X0 + X1) / 2), (h0 + h1) / 2, wz((Y0 + Y1) / 2));
    this.add(mat, g);
  }

  // An upright cylinder or cone frustum, in plan coordinates.
  pcyl(mat, X, Y, h0, h1, rBottom, rTop = rBottom, seg = 18) {
    const g = new THREE.CylinderGeometry(rTop, rBottom, h1 - h0, seg), uv = g.attributes.uv, girth = Math.PI * (rTop + rBottom);
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * girth, uv.getY(i) * (h1 - h0));
    g.translate(wx(X), (h0 + h1) / 2, wz(Y));
    this.add(mat, g);
  }

  // Any geometry, already in world space.
  mesh(mat, g) { this.add(mat, g); }

  // An invisible obstacle, in plan coordinates.
  block(X0, X1, Y0, Y1, h0, h1) {
    this.colliders.push({ x0: wx(Math.min(X0, X1)), x1: wx(Math.max(X0, X1)), y0: h0, y1: h1, z0: wz(Math.max(Y0, Y1)), z1: wz(Math.min(Y0, Y1)) });
  }

  // The same box, given in plan coordinates and heights.
  pbox(mat, X0, X1, Y0, Y1, h0, h1, o) {
    this.wbox(mat, wx(X0), wx(X1), h0, h1, wz(Y1), wz(Y0), o);
  }

  // A polygon in the world x-y plane (an elevation outline), extruded along z.
  prism(mat, pts, z0, z1) {
    const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    const g = new THREE.ExtrudeGeometry(s, { depth: z1 - z0, bevelEnabled: false });
    g.translate(0, 0, z0);
    this.add(mat, g);
  }

  // One mesh per zone and material. Returns the meshes, each with userData.zone.
  finalize(parent, materials) {
    const meshes = [];
    for (const { zone, mat: name, list } of this.batches.values()) {
      let m;
      if (name.endsWith('/vc')) {
        const base = name.slice(0, -3);
        m = materials.vcOf(base);
        for (const g of list) {
          const c = materials.tint(base, g.userData.tint), n = g.attributes.position.count, col = new Float32Array(n * 3);
          for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
          g.setAttribute('color', new THREE.BufferAttribute(col, 3));
          if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
        }
      } else m = materials[name] ?? materials.make?.(name);
      if (!m?.isMaterial) throw new Error('no material named ' + name);
      const mesh = new THREE.Mesh(mergeGeometries(list, false), m);
      const seeThrough = name === 'glass' || name === 'screen' || name === 'water';
      mesh.castShadow = !seeThrough;
      mesh.receiveShadow = !seeThrough;
      if (seeThrough) mesh.renderOrder = 2;
      mesh.name = name; mesh.userData.zone = zone; mesh.userData.cat = 'b-' + (zone.split(':')[0] || 'all') + ':' + name;
      parent.add(mesh);
      meshes.push(mesh);
    }
    this.batches.clear();
    return meshes;
  }
}
