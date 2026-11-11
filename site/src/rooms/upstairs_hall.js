// Upstairs hall. This file also holds the small-props workshop shared by the
// upstairs rooms (bath, bedrooms, dressing room, sleeping porch): plants,
// towels, bottles, clothes, shoes, mirrors, sconces. It draws only through
// the kit (frames, B.mesh, sign), so it keeps working when kit.js changes.
import * as THREE from 'three';
import { LINEN, OAT, SAGE, RUST, NAVY, MUSTARD, CREAM, ROSE, ENAMEL, BRASS, STEEL, BLACK, GREEN, MARBLE, DARK, WHITE, G, DIRS } from '../kit.js';
import { wx, wz } from '../builder.js';
import { F1, F2 } from '../house.js';

// ---- The props workshop ---------------------------------------------------------------
export function upstairsProps(kit, seed = 1) {
  const { B } = kit;
  let s = 91813 + seed * 7919;
  const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const lerp = (a, b, t) => a + (b - a) * t;
  // local frame point -> world
  const W3 = (f, x, y, z) => { const [X, Y] = f.map(x, y); return [wx(X), f.h + z, wz(Y)]; };
  // angle of the frame's local x axis, for turning lathes and extrusions
  const theta = f => { const [a, b] = f.map(0, 0), [c, d] = f.map(1, 0); return Math.atan2(d - b, c - a); };

  // Geometry from raw world positions (two-sided strips are built by the caller).
  function meshFrom(mat, pos, idx, uv) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv ?? new Array((pos.length / 3) * 2).fill(0), 2));
    g.setIndex(idx); g.computeVertexNormals(); B.mesh(mat, g);
  }

  // A turned shape: profile [[radius, z], ...] from the bottom up (go up the outside and back
  // down the inside for a bowl). sx/sy stretch it along the frame's x / y.
  function lathe(f, mat, x, y, z, prof, o = {}) {
    const g = new THREE.LatheGeometry(prof.map(([rr, zz]) => new THREE.Vector2(Math.max(0.0005, rr), zz)), o.seg ?? 20);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 3, uv.getY(i));
    if (o.sx || o.sy) g.scale(o.sx ?? 1, 1, o.sy ?? 1);
    g.rotateY(theta(f)); const [a, b, c] = W3(f, x, y, z); g.translate(a, b, c); B.mesh(mat, g);
    if (o.both) lathe(f, o.inner ?? mat, x, y, z, [...prof].reverse(), { ...o, both: false });   // two-sided (bowls, basins)
  }
  // A round rod between two local points (handles, rails, stems, chains, hanger wire).
  function rod(f, mat, p, q, rad = 0.02, seg = 6) {
    const A = new THREE.Vector3(...W3(f, ...p)), Bv = new THREE.Vector3(...W3(f, ...q));
    const d = Bv.clone().sub(A), L = d.length(); if (L < 1e-4) return;
    const g = new THREE.CylinderGeometry(rad, rad, L, seg, 1);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * rad * 6, uv.getY(i) * L);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
    const m = A.clone().add(Bv).multiplyScalar(0.5); g.translate(m.x, m.y, m.z); B.mesh(mat, g);
  }
  // A flat outline (in the frame's x-y plane, [[x,y],...]) with holes, extruded up from z0 to z1.
  function slab(f, mat, outline, holes, z0, z1) {
    const sh = new THREE.Shape(outline.map(([a, b]) => new THREE.Vector2(a, b)));
    for (const h of holes ?? []) sh.holes.push(new THREE.Path(h.map(([a, b]) => new THREE.Vector2(a, b))));
    const g = new THREE.ExtrudeGeometry(sh, { depth: z1 - z0, bevelEnabled: false, curveSegments: 24 });
    // shape x,y = local x,y; extrude along local z. Map vertex by vertex into the world.
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const [a, b, c] = W3(f, p.getX(i), p.getY(i), z0 + p.getZ(i)); p.setXYZ(i, a, b, c); }
    g.deleteAttribute('normal'); g.computeVertexNormals(); B.mesh(mat, g);   // frame-to-world is a pure rotation
  }
  const ellipse = (cx, cy, rx, ry, n = 28) => Array.from({ length: n }, (_, i) => [cx + rx * Math.cos((i / n) * 6.2832), cy + ry * Math.sin((i / n) * 6.2832)]);

  // ---- Leaves -------------------------------------------------------------------------
  // Each leaf: base (x,y,z), heading a (radians in the frame), rise e, length, width, droop,
  // cup. Built as a two-sided cupped strip; a few dozen triangles each.
  function leaves(f, mat, list) {
    const pos = [], idx = [], uv = [];
    for (const L of list) {
      const N = L.n ?? 5, ca = Math.cos(L.a), sa = Math.sin(L.a), sx = -sa, sy = ca;
      const rows = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N, h = L.len * t * Math.cos(L.e), v = L.len * t * Math.sin(L.e) - (L.droop ?? 0) * L.len * t * t;
        let hw = (L.w / 2) * Math.pow(Math.sin(Math.PI * Math.pow(t, L.shape ?? 0.8)), 0.75);
        if (L.notch && i % 2) hw *= 0.45;
        const cx = L.x + ca * h, cy = L.y + sa * h, cz = L.z + v, cup = (L.cup ?? 0.3) * hw;
        rows.push([[cx - sx * hw, cy - sy * hw, cz + cup], [cx, cy, cz], [cx + sx * hw, cy + sy * hw, cz + cup]]);
      }
      for (const side of [0, 1]) {
        const base = pos.length / 3;
        rows.forEach((row, i) => row.forEach((p, k) => { pos.push(...W3(f, p[0], p[1], p[2] + (side ? -0.004 : 0))); uv.push(k * 0.5, i / N); }));
        for (let i = 0; i < N; i++) for (let k = 0; k < 2; k++) {
          const a = base + i * 3 + k, b = a + 1, c = a + 3, d = a + 4;
          side ? idx.push(a, b, d, a, d, c) : idx.push(a, d, b, a, c, d);
        }
      }
    }
    meshFrom(mat, pos, idx, uv);
  }
  const LEAF = ['c#3f5a32/0.6', 'c#4f6b3c/0.6', 'c#5a7a44/0.6'];

  function pot(f, x, y, z, rad, tall, mat = 'c#b5704f/0.9') {
    f.cyl(mat, x, y, z, z + tall, rad * 0.78, rad, 18); f.cyl(mat, x, y, z + tall - 0.09, z + tall, rad + 0.03, rad + 0.03, 18);
    f.cyl('c#2a2622/0.9', x, y, z + tall, z + tall + 0.012, rad - 0.03, rad - 0.03, 16);
    return z + tall;
  }
  // Boston fern: arching notched fronds that spill over the pot. Loves a steamy bath.
  function fern(f, x, y, z, o = {}) {
    const k = o.size ?? 1, top = o.noPot ? z : pot(f, x, y, z, 0.42 * k, 0.75 * k, o.pot);
    const list = [];
    for (let i = 0; i < (o.n ?? 30); i++) {
      const a = o.dir !== undefined ? o.dir + (r() - 0.5) * (o.spread ?? 3) : r() * 6.283, rr = r() * 0.15 * k;
      list.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr, z: top, a, e: 0.35 + r() * 0.95, len: (1.1 + r() * 0.7) * k, w: 0.3 * k, droop: o.droop ?? 0.95, cup: 0.15, n: 9, notch: true, shape: 0.6 });
    }
    leaves(f, o.mat ?? 'c#4f6b44/0.6', list);
  }
  // Snake plant: stiff upright blades.
  function snake(f, x, y, z, o = {}) {
    const k = o.size ?? 1, top = pot(f, x, y, z, 0.38 * k, 0.8 * k, o.pot ?? 'c#cfcbc4/0.4');
    const list = [];
    for (let i = 0; i < 11; i++) { const a = r() * 6.283, rr = r() * 0.17 * k; list.push({ x: x + Math.cos(a) * rr, y: y + Math.sin(a) * rr, z: top - 0.02, a, e: 1.3 + r() * 0.24, len: (1.4 + r() * 1.3) * k, w: 0.24 * k, droop: 0, cup: 0.45, n: 4, shape: 0.55 }); }
    leaves(f, 'c#3f5a36/0.6', list);
  }
  // Fiddle-leaf fig: a floor tree with big paddle leaves.
  function fig(f, x, y, z, o = {}) {
    const k = o.size ?? 1, top = pot(f, x, y, z, 0.55 * k, 1.2 * k, o.pot ?? 'c#d8d0bd/0.4');
    const h = 4.6 * k;
    f.cyl('c#5a4a32/0.9', x, y, top, top + h * 0.75, 0.05, 0.03, 6);
    const list = [];
    for (let i = 0; i < 34; i++) {
      const t = 0.32 + 0.68 * (i / 34), a = o.dir !== undefined ? o.dir + (r() - 0.5) * (o.spread ?? 3) : r() * 6.283, zz = top + h * t;
      list.push({ x: x + Math.cos(a) * 0.05, y: y + Math.sin(a) * 0.05, z: zz, a, e: -0.1 + r() * 0.8 + (t > 0.9 ? 0.5 : 0), len: (0.8 + r() * 0.35) * k, w: 0.55 * k, droop: 0.35, cup: 0.25, n: 5, shape: 1.1 });
    }
    leaves(f, pickL(), list.slice(0, 17)); leaves(f, pickL(), list.slice(17));
  }
  const pickL = () => LEAF[Math.floor(r() * LEAF.length)];
  // Pothos: heart leaves on vines trailing over the edge of a shelf or pot.
  function pothos(f, x, y, z, o = {}) {
    const k = o.size ?? 1, top = o.noPot ? z : pot(f, x, y, z, 0.32 * k, 0.5 * k, o.pot ?? 'c#cfcbc4/0.4');
    const list = [];
    for (let v = 0; v < (o.vines ?? 7); v++) {
      const a0 = (o.dir ?? r() * 6.283) + (r() - 0.5) * (o.spread ?? 6.283);
      const len = (o.trail ?? 1.6) * (0.4 + r() * 0.8);
      for (let t = 0; t < len; t += 0.17) {
        const out = Math.min(t, 0.35) + 0.25 * k, down = Math.max(0, t - 0.3);
        list.push({ x: x + Math.cos(a0) * out, y: y + Math.sin(a0) * out, z: top + 0.08 - down, a: a0 + (r() - 0.5) * 2.2, e: -0.2 + r() * 0.6, len: 0.24 * k, w: 0.2 * k, droop: 0.1, cup: 0.3, n: 3, shape: 1.2 });
      }
    }
    leaves(f, o.mat ?? 'c#4f6b3c/0.6', list);
  }
  // A cluster of tulip-ish blooms in a jar (a lighter alternative to posy).
  function stems(f, x, y, z, colour = 'c#c9707a/0.9', n = 7, o = {}) {
    f.cyl(o.jar ?? 'glass', x, y, z, z + 0.5, 0.1, 0.13, 14);
    const list = [];
    for (let i = 0; i < n; i++) {
      const a = r() * 6.283, tilt = 0.12 + r() * 0.2, hh = 0.85 + r() * 0.3, bx = x + Math.cos(a) * tilt, by = y + Math.sin(a) * tilt;
      rod(f, 'c#4f6b44/0.9', [x, y, z + 0.1], [bx, by, z + hh], 0.012, 4);
      f.soft(colour, bx - 0.06, bx + 0.06, by - 0.06, by + 0.06, z + hh - 0.03, z + hh + 0.13, 0.05);
      list.push({ x: x + Math.cos(a) * 0.05, y: y + Math.sin(a) * 0.05, z: z + 0.45, a, e: 0.9, len: 0.35, w: 0.08, droop: 0.4, n: 3 });
    }
    leaves(f, 'c#4f6b44/0.6', list);
  }

  // ---- Linen ----------------------------------------------------------------------------
  // A stack of folded towels (or sweaters): the fold faces the frame's front.
  function towels(f, x, y, z, n, colours, w = 1.05, d = 0.75, t = 0.15) {
    for (let i = 0; i < n; i++) {
      const c = colours[i % colours.length], o = (r() - 0.5) * 0.06, zz = z + i * t;
      f.soft(c, x - w / 2 + o, x + w / 2 + o, y - d / 2, y + d / 2, zz, zz + t - 0.005, Math.min(0.06, t * 0.45));
    }
    return z + n * t;
  }
  // A towel folded over a bar that runs along x at (y, z).
  function hungTowel(f, x0, x1, y, z, colour, drop = 1.4) {
    f.soft(colour, x0, x1, y - 0.075, y - 0.025, z - drop, z + 0.04, 0.025);
    f.soft(colour, x0 + 0.03, x1 - 0.03, y + 0.025, y + 0.075, z - drop * 0.82, z + 0.04, 0.025);
    f.soft(colour, x0, x1, y - 0.075, y + 0.075, z + 0.0, z + 0.06, 0.03);
  }
  // Rolled towels standing upright (spa-style), in a row along x.
  function rolls(f, x, y, z, n, colour, rad = 0.17) { for (let i = 0; i < n; i++) f.cyl(colour, x + i * rad * 2.05, y, z, z + 0.85, rad, rad, 14); }

  // ---- Bottles and toiletries ------------------------------------------------------------
  function bottle(f, x, y, z, o = {}) {
    const h = o.h ?? 0.6, rad = o.r ?? 0.1, neck = o.neck ?? 0.035;
    lathe(f, o.mat ?? 'c#8a6a48/0.2', x, y, z, [[0, 0], [rad * 0.95, 0], [rad, 0.03], [rad, h * 0.68], [rad * 0.75, h * 0.8], [neck, h * 0.88], [neck, h]], { seg: 16 });
    if (o.cap !== false) f.cyl(o.cap ?? 'c#2a2622/0.4', x, y, z + h, z + h + (o.capH ?? 0.09), neck + 0.012, neck + 0.012, 10);
    if (o.label) f.cyl(o.label, x, y, z + h * 0.2, z + h * 0.55, rad + 0.004, rad + 0.004, 16);
    if (o.pump) { f.cyl(o.cap ?? BLACK, x, y, z + h + 0.09, z + h + 0.16, 0.02, 0.02, 8); f.box(o.cap ?? BLACK, -0.02 + x, x + 0.12, y - 0.018, y + 0.018, z + h + 0.14, z + h + 0.18); }
  }
  // Square perfume flacon with a gold cap.
  function perfume(f, x, y, z, o = {}) {
    const w = o.w ?? 0.17, h = o.h ?? 0.22;
    f.soft(o.glass ?? 'c#e3c99a/0.05', x - w / 2, x + w / 2, y - w * 0.32, y + w * 0.32, z, z + h, 0.02);
    f.cyl(o.juice ?? 'c#c9a24a/0.2', x, y, z + 0.015, z + h * 0.7, w * 0.3, w * 0.3, 10);
    f.cyl(BRASS, x, y, z + h, z + h + 0.03, 0.025, 0.025, 10); f.soft(o.cap ?? BRASS, x - 0.05, x + 0.05, y - 0.05, y + 0.05, z + h + 0.03, z + h + 0.13, 0.02);
  }
  // A tube of lotion lying down along x, cap to +x.
  function tube(f, x, y, z, colour = 'c#efe8d8/0.4', cap = 'c#c9b48a/0.4', len = 0.55) {
    f.soft(colour, x - len / 2, x + len * 0.15, y - 0.075, y + 0.075, z, z + 0.08, 0.035);
    f.soft(colour, x - len / 2 - 0.02, x - len / 2 + 0.06, y - 0.085, y + 0.085, z + 0.02, z + 0.05, 0.012);
    f.soft(colour, x + len * 0.15 - 0.01, x + len * 0.38, y - 0.06, y + 0.06, z + 0.005, z + 0.095, 0.045);
    rod(f, cap, [x + len * 0.38, y, z + 0.05], [x + len / 2, y, z + 0.05], 0.045, 10);
  }
  // Low jar of cream with a lid.
  function jar(f, x, y, z, o = {}) { const rad = o.r ?? 0.12; f.cyl(o.mat ?? 'c#efe8d8/0.2', x, y, z, z + (o.h ?? 0.12), rad, rad, 16); f.cyl(o.lid ?? BRASS, x, y, z + (o.h ?? 0.12), z + (o.h ?? 0.12) + 0.04, rad + 0.01, rad + 0.01, 16); }
  // A glass of water (glass shell, water inside).
  function glassOfWater(f, x, y, z, tall = 0.36) { f.cyl('c#cfcbc4/0.05', x, y, z, z + tall * 0.7, 0.085, 0.095, 14); f.cyl('glass', x, y, z, z + tall, 0.09, 0.1, 14); }
  function carafe(f, x, y, z) {
    lathe(f, 'glass', x, y, z, [[0, 0], [0.2, 0], [0.22, 0.12], [0.2, 0.42], [0.08, 0.6], [0.065, 0.82], [0.08, 0.86]], { seg: 18 });
    lathe(f, 'c#b8d0d4/0.05', x, y, z + 0.01, [[0, 0], [0.19, 0], [0.205, 0.12], [0.19, 0.4], [0, 0.4]], { seg: 18 });
    glassOfWater(f, x + 0.25, y + 0.2, z, 0.34);
  }
  // A shallow dish (jewellery, soap, keys).
  function dish(f, x, y, z, o = {}) {
    const rad = o.r ?? 0.24;
    lathe(f, o.mat ?? BRASS, x, y, z, [[0, 0], [rad * 0.7, 0], [rad, 0.06], [rad - 0.02, 0.065], [rad * 0.68, 0.02], [0, 0.02]], { seg: 22 });
  }
  // A few rings and a looped chain in a dish.
  function jewellery(f, x, y, z) {
    dish(f, x, y, z, { r: 0.26 });
    for (const [dx, dy, c] of [[-0.08, 0.04, 'c#c9a24a/0.2/1'], [0.06, -0.06, 'c#cfcbc4/0.2/1'], [0.08, 0.07, 'c#c9a24a/0.2/1']]) f.cyl(c, x + dx, y + dy, z + 0.02, z + 0.05, 0.035, 0.035, 10);
    for (let i = 0; i < 14; i++) { const a = (i / 14) * 6.28; f.cyl('c#c9a24a/0.2/1', x + Math.cos(a) * 0.13, y + Math.sin(a) * 0.09, z + 0.021, z + 0.035, 0.012, 0.012, 5); }
    f.cyl('c#efe8d8/0.2', x + 0.13, y + 0.0, z + 0.02, z + 0.06, 0.03, 0.03, 8);
  }
  // Tray: a low-rimmed rectangle along x.
  function tray(f, x0, x1, y0, y1, z, mat = 'oak_light#8a6a48') {
    f.box(mat, x0, x1, y0, y1, z, z + 0.04, G);
    for (const [a, b, c, d] of [[x0, x1, y0, y0 + 0.04], [x0, x1, y1 - 0.04, y1], [x0, x0 + 0.04, y0, y1], [x1 - 0.04, x1, y0, y1]]) f.box(mat, a, b, c, d, z + 0.04, z + 0.12, G);
    return z + 0.04;
  }

  // ---- Clothes ----------------------------------------------------------------------------
  // A garment on a hanger hanging from a rail that runs along x at height z; shoulders across y.
  function garment(f, x, y, z, o = {}) {
    const kind = o.kind ?? 'shirt', c = o.c ?? 'linen#c9c0ac', sh = (o.w ?? 1.45) / 2, t = o.t ?? 0.07;
    // hanger: a hook and a shallow wooden bar
    rod(f, 'c#b9b4aa/0.3/1', [x, y, z + 0.02], [x, y, z - 0.16], 0.008, 4);
    f.box('oak_light#a3825c', x - 0.025, x + 0.025, y - sh + 0.04, y + sh - 0.04, z - 0.25, z - 0.17);
    const top = z - 0.2;
    if (kind === 'trousers') { f.soft(c, x - t, x + t, y - sh * 0.6, y + sh * 0.6, top - 1.3, top - 0.05, 0.03); return; }
    f.soft(c, x - t, x + t, y - sh, y + sh, top - 0.45, top + 0.02, 0.06);                // shoulders
    const len = o.len ?? (kind === 'dress' ? 3.6 : kind === 'coat' ? 3.2 : 2.1);
    if (kind === 'dress') {
      f.soft(c, x - t * 0.9, x + t * 0.9, y - sh * 0.78, y + sh * 0.78, top - 1.4, top - 0.3, 0.05);
      f.soft(c, x - t, x + t, y - sh * 1.0, y + sh * 1.0, top - 2.5, top - 1.3, 0.06);
      f.soft(c, x - t * 1.1, x + t * 1.1, y - sh * 1.18, y + sh * 1.18, top - len, top - 2.4, 0.06);
    } else {
      f.soft(c, x - t, x + t, y - sh * 0.92, y + sh * 0.92, top - len, top - 0.3, 0.06);
      if (kind === 'coat') f.soft(c, x - t - 0.04, x + t + 0.04, y - sh * 0.95, y + sh * 0.95, top - 0.7, top - 0.1, 0.08);
    }
  }
  // Shoes and slippers come from the kit's modelled ones (toes toward +y).
  function shoes(f, x, y, z, colour, kind = 'flat') { kit.shoes(f, x, y, z, kind === 'heel' ? 'flat' : kind, colour); }
  function slippers(f, x, y, z, colour = 'wool#a8a49c') { kit.shoes(f, x, y, z, 'slipper', colour); }
  // A round hat box with a lid and a ribbon band.
  function hatBox(f, x, y, z, rad = 0.65, h = 0.75, colour = 'c#d8d0bd/0.9', band = 'c#4f7f86/0.6') {
    f.cyl(colour, x, y, z, z + h - 0.12, rad, rad, 24); f.cyl(colour, x, y, z + h - 0.15, z + h, rad + 0.025, rad + 0.025, 24);
    f.cyl(band, x, y, z + h * 0.35, z + h * 0.48, rad + 0.006, rad + 0.006, 24);
  }
  // A bathrobe hanging from a hook on the wall (wall at y = 0, front toward +y).
  function robe(f, x, z, colour = 'wool#e6e0d4') {
    f.cyl(BRASS, x, 0.06, z - 0.02, z + 0.1, 0.035, 0.035, 8); rod(f, BRASS, [x, 0.0, z + 0.04], [x, 0.2, z + 0.1], 0.025, 6);
    const dk = shadeOf(colour);
    // hung by its loop: a pinched neck, the body widening to the hem, sleeves hanging at the sides
    f.soft(colour, x - 0.16, x + 0.16, 0.04, 0.2, z - 0.4, z + 0.06, 0.06);
    f.soft(colour, x - 0.42, x + 0.42, 0.03, 0.2, z - 1.2, z - 0.3, 0.08);
    f.soft(colour, x - 0.5, x + 0.5, 0.03, 0.2, z - 2.4, z - 1.05, 0.08);
    f.soft(colour, x - 0.56, x + 0.56, 0.03, 0.21, z - 3.5, z - 2.3, 0.08);
    for (const s of [-1, 1]) f.soft(colour, x + s * 0.6 - 0.11, x + s * 0.6 + 0.11, 0.06, 0.24, z - 2.25, z - 0.75, 0.08);        // sleeves
    for (const s of [-1, 1]) f.soft(dk, x + s * 0.1 - 0.07, x + s * 0.1 + 0.07, 0.18, 0.225, z - 1.7, z - 0.35, 0.03);            // shawl collar
    f.box(dk, x + 0.02, x + 0.045, 0.2, 0.225, z - 3.45, z - 1.7);                                                               // the overlapping front
    f.soft(colour, x - 0.52, x + 0.52, 0.2, 0.25, z - 2.2, z - 2.08, 0.03);                                                      // tied belt, ends hanging
    f.soft(colour, x + 0.05, x + 0.15, 0.22, 0.27, z - 2.85, z - 2.15, 0.03); f.soft(colour, x + 0.18, x + 0.28, 0.21, 0.26, z - 2.7, z - 2.15, 0.03);
  }
  const shadeOf = c => { const m = /^(.*#)([0-9a-f]{6})(.*)$/i.exec(c); if (!m) return c; const v = parseInt(m[2], 16), k = 0.8, ch = sh => Math.round(((v >> sh) & 255) * k); return m[1] + ((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0') + m[3]; };

  // ---- Light and reflection ----------------------------------------------------------------
  // Wall sconce (wall at y = 0): brass plate and arm, a pleated warm shade. Lit.
  function sconce(f, x, z, o = {}) {
    f.box(o.metal ?? BRASS, x - 0.12, x + 0.12, 0.0, 0.05, z - 0.3, z + 0.1);
    rod(f, o.metal ?? BRASS, [x, 0.04, z - 0.15], [x, 0.42, z - 0.05], 0.025, 8); f.cyl(o.metal ?? BRASS, x, 0.42, z - 0.08, z + 0.06, 0.04, 0.03, 8);
    f.cyl('shade', x, 0.42, z + 0.02, z + 0.5, 0.28, 0.18, 18);
    kit.lampAt(f, x, 0.42, z + 0.25, o.power ?? 0.55);
  }
  // A ceiling pendant hung but never switched on: brass stem and a milk-glass schoolhouse shade.
  function pendant(f, x, y, ceil, drop = 1.7) {
    f.cyl(BRASS, x, y, ceil - 0.08, ceil - 0.01, 0.22, 0.22, 18);
    f.cyl(BRASS, x, y, ceil - drop + 0.5, ceil - 0.08, 0.025, 0.025, 8);
    f.cyl(BRASS, x, y, ceil - drop + 0.38, ceil - drop + 0.52, 0.16, 0.14, 16);
    lathe(f, 'c#efe8d8/0.2', x, y, ceil - drop - 0.45, [[0.1, 0], [0.22, 0.03], [0.4, 0.2], [0.42, 0.42], [0.2, 0.75], [0.15, 0.85]], { seg: 22 });
  }
  // A mirror in a frame, on the wall behind the frame origin.
  function mirror(f, x, z, w, h, o = {}) {
    const b = o.border ?? 0.12, m = o.frame ?? BRASS, d = o.d ?? 0.08;
    f.box(m, x - w / 2, x + w / 2, 0, d, z - h / 2, z - h / 2 + b, G); f.box(m, x - w / 2, x + w / 2, 0, d, z + h / 2 - b, z + h / 2, G);
    f.box(m, x - w / 2, x - w / 2 + b, 0, d, z - h / 2 + b, z + h / 2 - b, G); f.box(m, x + w / 2 - b, x + w / 2, 0, d, z - h / 2 + b, z + h / 2 - b, G);
    f.box(o.glass ?? 'c#c3ced0/0.03/1', x - w / 2 + b, x + w / 2 - b, 0, d - 0.03, z - h / 2 + b, z + h / 2 - b);
  }
  // A small framed photo standing on a surface, with a drawn picture. Faces +y.
  function photo(f, x, y, z, draw, w = 0.42, h = 0.55, frameMat = 'c#2a2622/0.4') {
    f.box(frameMat, x - w / 2, x + w / 2, y - 0.03, y + 0.03, z, z + h);
    f.box(frameMat, x - 0.04, x + 0.04, y - 0.2, y - 0.03, z, z + h * 0.6);
    kit.sign(f, x, y + 0.035, z + h / 2, w - 0.08, h - 0.08, draw, { cw: 128, ch: 160 });
  }
  // Drawn snapshots for photos: a sky, a horizon and a couple of figures.
  const snap = (sky, ground, figs = 2) => (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, sky[0]); gr.addColorStop(1, sky[1]); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = ground; g.fillRect(0, h * 0.62, w, h * 0.38);
    for (let i = 0; i < figs; i++) { const cx = w * (0.35 + i * 0.3); g.fillStyle = ['#3b2f2a', '#6a3b2e', '#2c3a4a'][i % 3]; g.fillRect(cx - w * 0.07, h * 0.42, w * 0.14, h * 0.32); g.fillStyle = '#d8b49a'; g.beginPath(); g.arc(cx, h * 0.36, w * 0.07, 0, 6.28); g.fill(); g.fillStyle = '#2a1f1a'; g.beginPath(); g.arc(cx, h * 0.33, w * 0.072, 3.14, 6.28); g.fill(); }
    g.strokeStyle = '#f4efe4'; g.lineWidth = w * 0.05; g.strokeRect(0, 0, w, h);
  };
  // Ghirardelli-style chocolate square, drawn wrapper, lying flat.
  function chocolate(f, x, y, z, colour = '#5a2e1c') {
    f.box('c#5a2e28/0.4', x - 0.11, x + 0.11, y - 0.11, y + 0.11, z, z + 0.025);
    kit.sign(f, x, y, z + 0.031, 0.22, 0.22, (g, w, h) => { g.fillStyle = colour; g.fillRect(0, 0, w, h); g.strokeStyle = '#c9a24a'; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16); g.fillStyle = '#e8d29a'; g.font = 'bold 30px serif'; g.textAlign = 'center'; g.fillText('GHIRARDELLI', w / 2, h * 0.45); g.font = '22px serif'; g.fillText('dark 72%', w / 2, h * 0.68); }, { flat: true, cw: 256, ch: 256 });
  }
  // An open book lying face up (two leaves and a cover).
  function openBook(f, x, y, z, cover = 'c#6b2a25/0.7') {
    f.box(cover, x - 0.5, x + 0.5, y - 0.35, y + 0.35, z, z + 0.02);
    f.box('c#efe8d8/0.9', x - 0.47, x - 0.01, y - 0.32, y + 0.32, z + 0.02, z + 0.08);
    f.box('c#efe8d8/0.9', x + 0.01, x + 0.47, y - 0.32, y + 0.32, z + 0.02, z + 0.08);
    kit.sign(f, x, y, z + 0.082, 0.9, 0.6, (g, w, h) => { g.fillStyle = '#f2ecdd'; g.fillRect(0, 0, w, h); g.fillStyle = '#9a9184'; for (let p = 0; p < 2; p++) for (let i = 0; i < 16; i++) g.fillRect(p * w / 2 + 14, 16 + i * 14, w / 2 - 28 - (i % 5 === 4 ? 40 : 0), 5); g.fillStyle = '#c9c0ae'; g.fillRect(w / 2 - 1, 0, 2, h); }, { flat: true, cw: 256, ch: 170 });
  }
  // Fairy lights strung along a line (local points), little warm bulbs.
  function bulbs(f, p, q, n, sag = 0.25) {
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = lerp(p[0], q[0], t), y = lerp(p[1], q[1], t), z = lerp(p[2], q[2], t) - sag * 4 * t * (1 - t);
      f.soft('e#ffd9a0/2.2', x - 0.04, x + 0.04, y - 0.04, y + 0.04, z - 0.1, z - 0.02, 0.03);
    }
    for (let i = 0; i < 8; i++) { const t0 = i / 8, t1 = (i + 1) / 8; rod(f, 'c#2a2622/0.6', [lerp(p[0], q[0], t0), lerp(p[1], q[1], t0), lerp(p[2], q[2], t0) - sag * 4 * t0 * (1 - t0)], [lerp(p[0], q[0], t1), lerp(p[1], q[1], t1), lerp(p[2], q[2], t1) - sag * 4 * t1 * (1 - t1)], 0.008, 3); }
  }
  // A plain wooden piece: top, four square legs, an apron; for benches, desks, stands.
  function legs(f, x0, x1, y0, y1, tall, mat = 'oak_light#8a6a48', o = {}) {
    const t = o.top ?? 0.1, lg = o.leg ?? 0.16, in_ = o.inset ?? 0.05;
    f.box(mat, x0, x1, y0, y1, tall - t, tall, G);
    for (const x of [x0 + in_, x1 - in_ - lg]) for (const y of [y0 + in_, y1 - in_ - lg]) f.box(mat, x, x + lg, y, y + lg, 0, tall - t, G);
    if (o.apron !== false) { f.box(mat, x0 + in_ + 0.02, x1 - in_ - 0.02, y0 + in_ + 0.02, y0 + in_ + 0.06, tall - t - 0.3, tall - t, G); f.box(mat, x0 + in_ + 0.02, x1 - in_ - 0.02, y1 - in_ - 0.06, y1 - in_ - 0.02, tall - t - 0.3, tall - t, G); }
    if (o.shelf) f.box(mat, x0 + in_, x1 - in_, y0 + in_, y1 - in_, o.shelf, o.shelf + 0.07, G);
    f.block(x0, x1, y0, y1, 0, tall);
  }

  return { r, W3, lathe, rod, slab, ellipse, leaves, pot, fern, snake, fig, pothos, stems, towels, hungTowel, rolls, bottle, perfume, tube, jar, glassOfWater, carafe, dish, jewellery, tray, garment, shoes, slippers, hatBox, robe, sconce, pendant, mirror, photo, snap,  chocolate, openBook, bulbs, legs };
}

// ---- The hall ---------------------------------------------------------------------------------
// X 19.2-27.4 (to 30.3 behind the stair), Y 0.5-20.8. The stair well (X 24-27.4, Y 7-17.4) is
// railed; doors: our bedroom (west, Y 10.2-12.9), library (west, Y 17.9-20.6), bath and little
// bedroom (north side, Y 21), guest room (Y 12.5, X 27.85-30.25). Low window to the street.
export default function (kit) {
  const { B, fr, world, yawOf, seat, lampAt, model, tableLamp, floorLamp, candle, book, bookRow, bookStack, bookcase, sofa, armchair, bed, table, mug, picture, rug, posy, cabinets, cup, rnd, pick, lamps, seats, candles, models, extras, books, steam } = kit;
  const P = upstairsProps(kit, 7);

  // The low bookcase along the west wall, by the street window, with the sheet of drawings over it
  const hb = fr(19.26, 5.2, F2, 3); bookcase(hb, 6.6, 3.3, { d: 0.9 });   // clear of the baseboard
  const ht = 3.3 + 0.125;                                                         // the top of the cornice
  tableLamp(hb, -2.2, 0.6, ht, 'c#a8a49c/0.4'); P.pothos(hb, 2.45, 0.5, ht, { dir: 1.57, spread: 2.4, trail: 1.9 });
  model('si_ewer', hb, 0.4, 0.5, ht, 0, { turn: 0.4 });                          // a blue-and-white porcelain ewer
  bookStack(hb, -0.9, 0.45, ht, 3); P.photo(hb, 1.25, 0.4, ht, P.snap(['#9cc0d8', '#e8e0cc'], '#c8b48a', 2));
  picture(hb, 'plan_details', 0, 5.5, 1.9, 2.0, { frame: BLACK, border: 0.07, mat: 0.2 });

  // The window nook: a deep chair turned to the light, a little table, a tall plant, a lamp
  const ch = fr(24.3, 4.3, F2, 2); kit.armchair(ch, 'linen#4f6b44', 'linen#b48530');
  kit.throwBlanket(ch, 0.94, 1.5, 0.3, 2.6, 2.05, 'wool#cfcbc4', { over: 'arm' });
  const nt = fr(25.6, 5.3, F2); nt.cyl('oak_light#8a6a48', 0, 0, 1.78, 1.86, 0.62, 0.62, 24); nt.cyl('oak_light#8a6a48', 0, 0, 0.05, 1.78, 0.06, 0.06, 8); nt.cyl('oak_light#8a6a48', 0, 0, 0, 0.06, 0.42, 0.42, 20); nt.block(-0.62, 0.62, -0.62, 0.62, 0, 1.86);
  mug(nt, 0.2, -0.2, 1.86, 'c#d8d0bd/0.4', true); P.openBook(nt.sub(-0.1, 0.15, 1.86, 1), 0, 0, 0, 'c#2f4a3a/0.6');
  { const fg = fr(26.7, 5.5, F2); P.fig(fg, 0, 0, 0, { size: 0.9, dir: 3.14, spread: 1.6 }); fg.block(-0.5, 0.5, -0.5, 0.5, 0, 3.5); }   // clear of the stair rail
  floorLamp(fr(22.15, 1.5, F2), 0, 0);
  picture(fr(27.4, 3.2, F2, 1), 'pissarro_rabbit_warren_snow', 0, 5.0, 2.2, 1.79, { frame: 'c#9a8a6a/0.4/0.6', border: 0.13 });
  kit.ceilingLight(fr(22.6, 4.2, F2), 0, 0, 8.0, { kind: 'schoolhouse', drop: 1.6 });   // hung, never switched on

  // Between the two bedroom doors: a bench under the Willow Bough, with a cushion and a basket
  const bn = fr(19.2, 15.4, F2, 3);
  P.legs(bn, -1.9, 1.9, 0.06, 1.36, 1.5, 'oak_light#8a6a48', { leg: 0.17 });
  bn.soft('linen#7a9a6a', -1.85, 1.85, 0.08, 1.34, 1.5, 1.72, 0.08); kit.cushion(bn, -1.2, 0.38, 1.72, 1.1, 1.0, RUST, { tilt: 0.3, thick: 0.4 });
  seat(bn, 0.4, 0.9, 1.72, 'sit on the bench');
  kit.toteBag(bn, 1.05, 0.75, 0, 'linen#c9b48a', { w: 1.0, h: 0.6 }); P.slippers(bn, -0.9, 0.95, 0.0, 'wool#8a8580');
  picture(bn, 'morris_willow_bough', 0, 4.9, 1.75, 2.26, { frame: 'c#2a2622/0.4', border: 0.1, mat: 0.18 });
  P.sconce(bn, -1.7, 4.5, { power: 0.35 }); P.sconce(bn, 1.7, 4.5, { power: 0.35 });

  // The landing at the top of the stair: a tall plant in the corner by the guest room
  { const sp = fr(29.75, 16.7, F2); P.snake(sp, 0, 0, 0, { size: 1.0, pot: 'c#7a5a44/0.6' }); sp.block(-0.38, 0.38, -0.38, 0.38, 0, 2.6); }

  // Runner the length of the hall, and a small one across the landing
  rug(20.4, 23.2, 1.6, 20.4, F2, 'runner');
}
