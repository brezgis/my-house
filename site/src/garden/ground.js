// Ground surfaces with real textures: gravel, flagstone, soil, bark mulch,
// meadow, sand. Shapes are recorded during layout (ribbons along smooth
// curves, irregular blobs, polygons) and built in setup() with materials made
// here, since materials.js belongs to the house. Texture coordinates are world
// feet, so every piece tiles at true scale and joins seamlessly.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from './cards.js';
import { paintHedge } from './paint.js';
import { sharedTexture } from '../materials.js';        // one copy of each photo, shared with the house

const SETS = {
  //          texture      feet/tile  tint       height  rough
  gravel:    ['gravel',     6,        0xd8d2c4,  0.07,   1],
  flagstone: ['flagstone',  6.6,        0xd9cfc2,  0.09,   0.95],
  soil:      ['soil',       6,        0x9a8778,  0.08,   1],
  mulch:     ['mulch',      6.9,        0x6e5444,  0.065,  1],
  meadow:    ['meadow',     8,       0xb8b48a,  0.055,  1],
  sand:      ['gravel',     3,        0xf2e2b8,  0.5,    1],
  bark:      ['mulch',      3,        0x5a3e30,  0.06,   1],
  lawn:      ['grass',      9,        0xd9dc9c,  0.075,  1],
  mud:       ['gravel',     1.6,      0x84532c,  0.082,  0.6],      // wet earth round a puddle
  compost:   ['mulch',      4,        0xe8d0b0,  0,      1],        // heaps (solid, like the rocks): half-rotted, and finished
  compostDark: ['soil',     4,        0xffffff,  0,      1],
  wallstone: ['flagstone',  5.5,        0xb4aca0,  0,      0.95],
  rock:      ['gravel',     2.2,      0xa8a296,  0,      1],
  rockDark:  ['gravel',     2.2,      0x7a7468,  0,      1],
  rockMoss:  ['gravel',     2.2,      0x76825a,  0,      1],
  yew:       [null,         3,        0xffffff,  0,      0.95],
  boxwood:   [null,         2.2,      0xffffff,  0,      0.95],
};

// Loose surfaces have no drawn edge of their own: a bed of mulch wavers, gravel strays into the grass.
//          the edge wavers by (ft), over about (ft); bits stray out this far (ft); the darkest the texture gets (linear green)
const LOOSE = {
  gravel: [0.3,  5,  0.9, 0.246],
  soil:   [0.4,  7,  0.6, 0.031],
  mulch:  [0.4,  7,  0.6, 0.063],
  meadow: [1.6,  22, 2.4, 0.141],
  mud:    [0.2,  4,  0.45, 0.246],
};
const SIDES = ['z0', 'x1', 'z1', 'x0'];      // the sides of a rect, in the order of its corners

export class Ground {
  constructor() { this.parts = Object.fromEntries(Object.keys(SETS).map(k => [k, []])); this.edges = {}; }
  _y(kind, y) { return y ?? SETS[kind][3]; }
  // A strip of width w along a smooth curve through pts [[x, z], ...]
  ribbon(kind, pts, w, o = {}) {
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), !!o.closed, 'centripetal');
    const n = Math.max(2, Math.ceil(curve.getLength() / 1.2)), y = this._y(kind, o.y), pos = [], idx = [];
    const L = [], R = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, p = curve.getPointAt(t), d = curve.getTangentAt(t), nx = -d.z, nz = d.x;
      const ww = (w / 2) * (1 + (o.wobble ?? 0) * Math.sin(i * 1.7) * Math.sin(i * 0.43));
      pos.push(p.x + nx * ww, y, p.z + nz * ww, p.x - nx * ww, y, p.z - nz * ww);
      L.push([p.x + nx * ww, p.z + nz * ww, nx, nz, true]); R.push([p.x - nx * ww, p.z - nz * ww, -nx, -nz, true]);
      if (i < n) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    this._push(kind, pos, idx);
    if (LOOSE[kind] && !o.crisp && !o.closed) { this._stray(kind, L, y, false); this._stray(kind, R, y, false); }
    return curve;
  }
  // An irregular rounded blob
  blob(kind, cx, cz, rx, rz, o = {}) {
    const r = rng(o.seed ?? Math.round(cx * 31 + cz * 17)), n = 40, pts = [], k = o.wobble ?? 0.12;
    const ph = [r() * 6, r() * 6, r() * 6];
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, f = 1 + k * (Math.sin(a * 2 + ph[0]) * 0.6 + Math.sin(a * 3 + ph[1]) * 0.4 + Math.sin(a * 5 + ph[2]) * 0.25); pts.push([cx + Math.cos(a) * rx * f, cz + Math.sin(a) * rz * f]); }
    this.poly(kind, pts, o);
    return pts;
  }
  // The outline of a loose patch as a garden edge: corners rounded and the sides wavering, straight only where
  // `hard` lists a side that lies against something built. Gives [x, z, outward x, outward z, runs on loose?].
  _soft(kind, pts, o) {
    const [amp0, wave] = LOOSE[kind], n = pts.length, hard = o.hard ?? [];
    let area = 0, short = Infinity;
    const E = pts.map((a, i) => { const b = pts[(i + 1) % n], l = Math.hypot(b[0] - a[0], b[1] - a[1]); area += a[0] * b[1] - b[0] * a[1]; return { a, l, tx: (b[0] - a[0]) / l, tz: (b[1] - a[1]) / l, hard: hard.includes(i) }; });
    const sgn = area > 0 ? 1 : -1;
    for (const e of E) { e.nx = sgn * e.tz; e.nz = -sgn * e.tx; if (!e.hard) short = Math.min(short, e.l); }
    const amp = Math.min(amp0, short * 0.14), rad = Math.min(short * 0.35, amp * 3 + 0.6), step = Math.max(1, wave / 4), out = [];
    E.forEach((e, i) => {
      const p = E[(i + n - 1) % n], q = E[(i + 1) % n], [ax, az] = e.a;
      if (p.hard && e.hard) out.push([ax, az, 0, 0, false, 0]);
      else if (p.hard || e.hard) { const s = e.hard ? p : e; out.push([ax, az, s.nx, s.nz, !e.hard, 1]); }      // slides along the built side
      else for (let j = 0; j <= 4; j++) {                                                                        // a rounded corner
        const t = j / 4, u = 1 - t, x = ax - p.tx * rad * u * u + e.tx * rad * t * t, z = az - p.tz * rad * u * u + e.tz * rad * t * t;
        const nx = p.nx * u + e.nx * t, nz = p.nz * u + e.nz * t, l = Math.hypot(nx, nz);
        out.push([x, z, nx / l, nz / l, true, 1]);
      }
      if (e.hard) return;
      const d0 = p.hard ? 0 : rad, d1 = e.l - (q.hard ? 0 : rad), m = Math.ceil((d1 - d0) / step);
      for (let j = 1; j < m; j++) { const d = d0 + (d1 - d0) * j / m; out.push([ax + e.tx * d, az + e.tz * d, e.nx, e.nz, true, 1]); }
    });
    let len = 0; const at = out.map((q, i) => { const b = out[(i + 1) % out.length], s = len; len += Math.hypot(b[0] - q[0], b[1] - q[1]); return s; });
    const r = rng(o.seed ?? Math.round(pts[0][0] * 31 + pts[0][1] * 17)), ph = [r() * 6.3, r() * 6.3, r() * 6.3];
    const k = [1, 0.43, 0.19].map(f => Math.max(1, Math.round(len / (wave * f))) * Math.PI * 2 / len);
    out.forEach((q, i) => { const d = q[5] * amp * (0.6 * Math.sin(at[i] * k[0] + ph[0]) + 0.4 * Math.sin(at[i] * k[1] + ph[1]) + 0.25 * Math.sin(at[i] * k[2] + ph[2])); q[0] += q[2] * d; q[1] += q[3] * d; q.length = 5; });
    return out;
  }
  // Where a loose surface meets the grass: a band past the outline in which the surface thins out to nothing,
  // stone by stone (the texture itself says which bits stay: see build). line: [x, z, outward x, outward z, on?]
  _stray(kind, line, y, closed = true) {
    const [, , w, dark] = LOOSE[kind], n = line.length, pos = [], col = [], uv = [], idx = [], a0 = 0.5 / dark;
    for (const [x, z, nx, nz] of line) { pos.push(x, y, z, x + nx * w, y, z + nz * w); col.push(1, 1, 1, a0, 1, 1, 1, 0); uv.push(x, -z, x + nx * w, -(z + nz * w)); }
    for (let i = 0; i < (closed ? n : n - 1); i++) {
      const j = (i + 1) % n, p = line[i], q = line[j]; if (!p[4]) continue;
      const a = i * 2, b = j * 2, left = p[2] * -(q[1] - p[1]) + p[3] * (q[0] - p[0]) > 0;
      if (left) idx.push(a + 1, b + 1, a, a, b + 1, b); else idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
    if (!idx.length) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4)); g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((v, i) => (i % 3 === 1 ? 1 : 0)), 3));
    g.setIndex(idx);
    (this.edges[kind] ??= []).push(g);
  }
  // Loose kinds lying on the ground get a garden edge (o.crisp: none; o.soft: straight sides waver too, all but o.hard)
  poly(kind, pts, o = {}) {
    const loose = LOOSE[kind] && !o.crisp && !o.holes && this._y(kind, o.y) < 0.3;
    let line = null;
    if (loose && o.soft) { line = this._soft(kind, pts, o); pts = line; }
    else if (loose) {
      let area = 0; pts.forEach((a, i) => { const b = pts[(i + 1) % pts.length]; area += a[0] * b[1] - b[0] * a[1]; });
      const s = area > 0 ? 1 : -1, n = pts.length;
      line = pts.map((a, i) => { const p = pts[(i + n - 1) % n], q = pts[(i + 1) % n], tx = q[0] - p[0], tz = q[1] - p[1], l = Math.hypot(tx, tz) || 1; return [a[0], a[1], s * tz / l, -s * tx / l, true]; });
    }
    if (line) this._stray(kind, line, this._y(kind, o.y));
    const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, z)));
    if (o.holes) for (const h of o.holes) shape.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, z))));
    const g = new THREE.ShapeGeometry(shape);
    const p = g.attributes.position, y = this._y(kind, o.y), pos = [];
    for (let i = 0; i < p.count; i++) pos.push(p.getX(i), y, p.getY(i));
    const idx = Array.from(g.index.array);
    for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
    this._push(kind, pos, idx);
  }
  // A rectangle. Of a loose kind on the ground it is only roughly one: say which sides are built (hard: 'x0 z1')
  rect(kind, x0, x1, z0, z1, o = {}) {
    const soft = LOOSE[kind] && o.y === undefined && !o.crisp;
    this.poly(kind, [[x0, z0], [x1, z0], [x1, z1], [x0, z1]], soft ? { ...o, soft: true, hard: (o.hard ?? '').split(' ').map(s => SIDES.indexOf(s)).filter(i => i >= 0) } : o);
  }
  disc(kind, cx, cz, rad, o = {}) { const pts = []; for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2; pts.push([cx + Math.cos(a) * rad, cz + Math.sin(a) * rad]); } this.poly(kind, pts, o); }
  // A box with texture coordinates in feet on every face (walls, clipped hedges).
  // round: soften the top edges of a hedge by bulging the top outward a little
  box(kind, x0, x1, y0, y1, z0, z1, o = {}) {
    const sx = x1 - x0, sy = y1 - y0, sz = z1 - z0, g = new THREE.BoxGeometry(sx, sy, sz, o.seg ?? 1, 1, o.seg ?? 1).toNonIndexed();
    const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) + (x0 + x1) / 2, y = p.getY(i) + (y0 + y1) / 2, z = p.getZ(i) + (z0 + z1) / 2;
      if (Math.abs(n.getX(i)) > 0.5) uv.setXY(i, z, y); else if (Math.abs(n.getY(i)) > 0.5) uv.setXY(i, x, z); else uv.setXY(i, x, y);
      p.setXYZ(i, x, y, z);
    }
    if (o.batter) for (let i = 0; i < p.count; i++) if (p.getY(i) > y0 + 0.01) { const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2; p.setX(i, cx + (p.getX(i) - cx) * (1 - o.batter)); p.setZ(i, cz + (p.getZ(i) - cz) * (1 - o.batter)); }
    g.computeVertexNormals();
    this.parts[kind].push(g);
  }
  // Any non-indexed geometry (rocks): texture coordinates projected from the world
  mesh(kind, g) {
    const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) { const ny = Math.abs(n.getY(i)), nx = Math.abs(n.getX(i)); uv[i * 2] = ny > 0.7 ? p.getX(i) : nx > 0.7 ? p.getZ(i) : p.getX(i); uv[i * 2 + 1] = ny > 0.7 ? p.getZ(i) : p.getY(i); }
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal'].includes(k)) g.deleteAttribute(k);
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    this.parts[kind].push(g);
  }
  _push(kind, pos, idx) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const uv = []; for (let i = 0; i < pos.length; i += 3) uv.push(pos[i], -pos[i + 2]);
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    const n = g.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
    this.parts[kind].push(g);
  }

  build(scene, renderer, grassMat) {
    const loader = new THREE.TextureLoader(), aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const tex = (file, size, srgb) => { const t = sharedTexture(file); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / size, 1 / size); t.anisotropy = aniso; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
    const mats = {};
    // Each flat layer is pulled toward the eye a little more than the one beneath it, so layers a
    // fraction of an inch apart do not fight. The pull must follow their HEIGHTS: it used to follow the
    // order of the table above, so from a distance the meadow (low, but late in the table) covered the
    // soil round the fire pit and flagstones in the lawn, and they appeared as you walked up.
    const rank = Object.fromEntries(Object.keys(SETS).filter(k => SETS[k][3] > 0 && this.parts[k].length).sort((a, b) => SETS[a][3] - SETS[b][3]).map((k, i) => [k, i]));
    for (const [kind, [file, size, tint, , rough]] of Object.entries(SETS)) {
      if (!this.parts[kind].length) continue;
      let m;
      if (!file) {
        const t = new THREE.CanvasTexture(paintHedge(kind === 'yew' ? 'yew' : 'box')); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / size, 1 / size); t.anisotropy = aniso;
        m = new THREE.MeshStandardMaterial({ map: t, roughness: rough, envMapIntensity: 0.6 });
      } else m = kind === 'lawn' && grassMat ? grassMat.clone() : new THREE.MeshStandardMaterial({ map: tex(file + '_color', size, true), normalMap: tex(file + '_normal', size), color: tint, roughness: rough, envMapIntensity: 0.5 });
      const solid = SETS[kind][3] === 0;
      if (kind === 'lawn' && grassMat) { m.transparent = false; m.alphaMap = null; m.depthWrite = true; }
      if (!solid) { const order = rank[kind]; m.polygonOffset = true; m.polygonOffsetFactor = -1 - order; m.polygonOffsetUnits = -2 - order * 2; }
      const mesh = new THREE.Mesh(mergeGeometries(this.parts[kind]), m);
      mesh.receiveShadow = true; mesh.castShadow = solid; mesh.name = 'ground ' + kind;
      scene.add(mesh); mats[kind] = m;
      if (this.edges[kind]) {      // the straying edge: the same surface, kept only where its own texture is brighter than the fade asks
        const em = m.clone(); em.alphaMap = em.map; em.alphaTest = 0.5; em.vertexColors = true;
        const edge = new THREE.Mesh(mergeGeometries(this.edges[kind]), em);
        edge.receiveShadow = true; edge.name = 'ground ' + kind + ' edge'; scene.add(edge);
      }
    }
    return mats;
  }
}
