// Kitchen  (X 31-42.83, Y 22.8-35)
// A cook's kitchen for someone who entertains. North wall: the long sage run with a deep
// farmhouse sink under the window, open shelves and a glass cupboard. South wall: the cream
// fridge (it opens), the brick flue with its pot rail and clock, the white range under a
// copper hood. East wall: a tall pantry cupboard and the sideboard set for guests under the
// Milkmaid. West: coffee laid out under the back window. A butcher-block work table in the
// middle, mid-bake. The helpers exported here (tools, ART) are shared with the coffee bar
// and the back porch.
import * as THREE from 'three';
import { BRASS, STEEL, BLACK, DARK, G } from '../kit.js';
import { wx, wz } from '../builder.js';
import { F1 } from '../house.js';
import { lathe, sweep, rng, loft } from '../kit/geom.js';
import { photoDraw } from '../photos.js';

const TAU = Math.PI * 2;
export const SAGEP = 'painted_wood#87937a', HONEY = 'oak_light#c4a477', OAKW = 'oak_light#a3825c', WALNUT = 'fir#7d5b45';
export const PORC = 'c#ebe6dc/0.18', NICKEL = 'c#c6c2ba/0.22/1', CHROME = 'c#d4d6d8/0.12/1', COPPER = 'c#b06a3c/0.32/1';
export const CLAY = 'c#b8755a/0.85', CREAMF = 'c#eee4cc/0.32', GLASSY = 'glass', TILE = 'tile_subway';
export const LEAF = ['c#4f6b3c/0.7', 'c#5d7a45/0.7', 'c#46613a/0.75', 'c#6b8550/0.7'];

// ---- Fewer materials, fewer draw calls -------------------------------------------------------
// Every distinct material name is a draw call, so plain colours are snapped to a small palette
// (and three roughnesses); metals to brass, copper, steel, chrome or iron.
const PAL = ['f4f1ea', 'e8e2d4', 'd9cdb2', 'c9b48a', 'c9ccd0', '9a9590', '5a5a56', '2b2724', '17140f', 'b08a5a', '8a5a2a', '6a4a2a', '3a2214', 'a8784a', 'c9a77a',
  'c8202a', '8a1c1c', 'b8361f', 'e8907a', 'e88aa8', 'e0782a', 'd9b35a', 'f3d96a', 'e8c73a', 'c9952a', '7fa04a', '5d8a3a', '4a6e38', '2f4a2a', '3a6a3a', '9fb0a4',
  '2a63b8', '2f5a6a', '26364f', '9fb0d8', 'c9d6d8', '4a2240', '8a5ab0', 'b9b8b2', 'efe2bc'].map(h => [h, parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]);
const METALS = ['b08d4a', 'b06a3c', 'c9ccd0', 'd4d6d8', '2b2724', 'a8aca8'].map(h => [h, parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]);
const SNAP = new Map();
export function snapMat(m) {
  if (typeof m !== 'string' || !m.startsWith('c#')) return m;
  if (SNAP.has(m)) return SNAP.get(m);
  const q = /^c#([0-9a-f]{6})(?:\/([\d.]+))?(?:\/([\d.]+))?$/i.exec(m); if (!q) return m;
  const v = parseInt(q[1], 16), r = (v >> 16) & 255, g = (v >> 8) & 255, b = v & 255, metal = Number(q[3] ?? 0) > 0.5, rough = Number(q[2] ?? 0.85);
  let best = null, bd = 1e9; for (const [h, R, G2, B2] of metal ? METALS : PAL) { const d = 2 * (r - R) ** 2 + 4 * (g - G2) ** 2 + 3 * (b - B2) ** 2; if (d < bd) { bd = d; best = h; } }
  const out = `c#${best}/${rough < 0.28 ? 0.2 : rough < 0.6 ? 0.45 : 0.8}${metal ? '/1' : ''}`;
  SNAP.set(m, out); return out;
}

// ---- Helpers shared by the kitchen, the coffee bar and the porch ------------------------------
export function tools(kit, seed = 1) {
  const { B } = kit;
  const rnd = rng(seed, 7.3), pick = a => a[Math.floor(rnd() * a.length)];
  const M4 = new THREE.Matrix4();
  // Place a geometry built in a frame's own space (x along, y out from the wall, z up).
  function put(f, g, mat, x = 0, y = 0, z = 0) {
    const [X0, Y0] = f.map(x, y), [X1, Y1] = f.map(x + 1, y), [X2, Y2] = f.map(x, y + 1);
    M4.set(X1 - X0, X2 - X0, 0, wx(X0), 0, 0, 1, f.h + z, -(Y1 - Y0), -(Y2 - Y0), 0, wz(Y0), 0, 0, 0, 1);
    g.applyMatrix4(M4); B.mesh(snapMat(mat), g);
  }
  // A turned shape: profile [[r, z], ...] from the bottom centre up and round.
  const ves = (f, mat, x, y, z, prof, seg = 18) => put(f, lathe(prof, { seg }), mat, x, y, z);
  // A lying cylinder: ax 'x' along the frame, 'y' out from the wall, 'z' upright.
  function hcyl(f, mat, ax, x, y, z, len, r0, r1 = r0, seg = 12, open = false) {
    const g = new THREE.CylinderGeometry(r1, r0, len, seg, 1, open);
    if (ax === 'x') g.rotateZ(-Math.PI / 2); else if (ax === 'z') g.rotateX(Math.PI / 2);
    g.translate(x, y, z); put(f, g, mat);
  }
  // A ball (squashed by sz), sitting on z.
  function ball(f, mat, x, y, z, r, seg = 10, sz = 1) {
    const g = new THREE.SphereGeometry(r, seg, Math.max(4, Math.round(seg * 0.6)));
    g.rotateX(Math.PI / 2); g.scale(1, 1, sz); g.translate(x, y, z + r * sz); put(f, g, mat);
  }
  const tube = (f, mat, path, r, seg = 6, caps = false) => put(f, sweep(path, r, { seg, caps }), mat);
  // Fruit, turned: apple, orange, lemon (lying), pear, tomato.
  function fruit(f, kind, x, y, z, s = 1) {
    const r = { apple: 0.13, orange: 0.14, lemon: 0.11, pear: 0.11, tomato: 0.11, lime: 0.09, plum: 0.09, onion: 0.12, potato: 0.12 }[kind] * s;
    const col = { apple: pick(['c#a8231c/0.45', 'c#b8361f/0.45', 'c#8f1d18/0.45', 'c#c9a33a/0.5']), orange: 'c#e0851f/0.6', lemon: 'c#e8c73a/0.55', pear: pick(['c#b9b24a/0.55', 'c#a88f3a/0.6']),
      tomato: 'c#c0321e/0.35', lime: 'c#6f9a2e/0.5', plum: 'c#4a2240/0.4', onion: 'c#b87d3a/0.7', potato: 'c#a88a5a/0.95' }[kind];
    if (kind === 'pear') { ves(f, col, x, y, z, [[0, 0], [r * 0.7, r * 0.1], [r, r * 0.7], [r * 0.85, r * 1.3], [r * 0.45, r * 1.8], [r * 0.3, r * 2.15], [0, r * 2.25]], 12); tube(f, 'c#4a3a24/0.8', [[x, y, z + r * 2.2], [x + 0.02, y, z + r * 2.55]], 0.012, 4); return; }
    if (kind === 'lemon' || kind === 'lime') { const g = new THREE.SphereGeometry(r, 12, 8); g.scale(1.35, 1, 1); g.rotateZ(rnd() * 3); g.translate(x, y, z + r * 0.95); put(f, g, col); return; }
    if (kind === 'potato') { const g = new THREE.SphereGeometry(r, 9, 6); g.scale(1.3, 0.95, 0.75); g.rotateZ(rnd() * 3); g.translate(x, y, z + r * 0.72); put(f, g, col); return; }
    const sq = kind === 'tomato' || kind === 'onion' ? 0.82 : kind === 'apple' ? 0.92 : 0.95;
    ves(f, col, x, y, z, [[0, r * 0.12], [r * 0.6, 0], [r * 0.95, r * 0.45 * sq], [r, r * sq], [r * 0.9, r * 1.55 * sq], [r * 0.45, r * 1.88 * sq], [0, r * 1.75 * sq]], 12);
    if (kind === 'apple' || kind === 'pear') tube(f, 'c#4a3a24/0.8', [[x, y, z + r * 1.7], [x + 0.015, y, z + r * 2.05]], 0.01, 4);
    if (kind === 'onion') tube(f, 'c#c9a46a/0.8', [[x, y, z + r * 1.6], [x, y, z + r * 2.1]], 0.02, 4);
  }
  // A bunch of grapes, hanging down from z.
  function grapes(f, x, y, z, col = 'c#4a2a48/0.35') {
    for (let i = 0; i < 16; i++) { const k = i / 16, rr = 0.11 * (1 - k * 0.6); ball(f, col, x + Math.cos(i * 2.4) * rr, y + Math.sin(i * 2.4) * rr, z + k * 0.3, 0.04, 7); }
  }
  // A leafy plant in a pot. leaves: count, len, w width, up, out, droop; pot colour / size.
  const LSH = Array.from({ length: 6 }, (_, i) => [0.16 * Math.cos(i / 6 * TAU), Math.sin(i / 6 * TAU)]);
  function leaves(f, x, y, z, o = {}) {
    const n = o.n ?? 12, len = o.len ?? 0.5, w = o.w ?? 0.06, col = o.col ?? LEAF, sp = o.spread ?? 0.06;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rnd() * 0.8, L = len * (0.65 + rnd() * 0.55), up = (o.up ?? 0.85) * (0.75 + rnd() * 0.4), out = (o.out ?? 0.55) * (0.6 + rnd() * 0.7), droop = o.droop ?? 0.5;
      const bx = x + Math.cos(a) * sp * rnd(), by = y + Math.sin(a) * sp * rnd(), pts = [];
      for (let k = 0; k <= 5; k++) { const t = k / 5; pts.push([bx + Math.cos(a) * out * L * t, by + Math.sin(a) * out * L * t, z + L * (up * t - droop * out * t * t)]); }
      put(f, sweep(pts, t => w * Math.pow(Math.sin(Math.PI * Math.min(0.97, 0.06 + t * 0.94)), 0.75) + 0.003, { shape: LSH, seg: 6 }), pick(col));
    }
  }
  function potted(f, x, y, z, o = {}) {
    const r = o.r ?? 0.2, h = o.h ?? r * 1.4, pot = o.pot ?? CLAY;
    ves(f, pot, x, y, z, [[0, 0], [r * 0.72, 0], [r * 0.95, h * 0.9], [r * 1.08, h * 0.92], [r * 1.08, h], [r * 0.93, h], [r * 0.9, h * 0.86], [0, h * 0.86]], o.seg ?? 16);
    ves(f, 'c#3b2a1f/1', x, y, z + h * 0.84, [[0, 0], [r * 0.9, 0], [r * 0.85, 0.02], [0, 0.03]], 12);
    leaves(f, x, y, z + h * 0.84, { spread: r * 0.5, ...o });
  }
  // A clear glass vessel holding something (fill colour, fill level 0..1).
  function jar(f, x, y, z, r, h, fill, lvl = 0.8, lid = 'c#c9ccd0/0.3/1') {
    ves(f, GLASSY, x, y, z, [[0, 0], [r, 0], [r, h * 0.92], [r * 0.85, h], [0, h]], 14);
    if (fill) ves(f, fill, x, y, z + 0.01, [[0, 0], [r - 0.012, 0], [r - 0.012, h * lvl * 0.9], [0, h * lvl * 0.9]], 12);
    if (lid) f.cyl(lid, x, y, z + h, z + h + 0.05, r * 0.9, r * 0.9, 14);
  }
  function bottle(f, x, y, z, o = {}) {
    const r = o.r ?? 0.11, h = o.h ?? 0.95, col = o.col ?? 'c#2c4a2a/0.15', neck = o.neck ?? 0.035;
    ves(f, col, x, y, z, [[0, 0], [r, 0], [r, h * 0.62], [r * 0.6, h * 0.74], [neck, h * 0.82], [neck, h], [0, h]], 14);
    if (o.cap) f.cyl(o.cap, x, y, z + h - 0.08, z + h + 0.005, neck + 0.008, neck + 0.008, 10);
    if (o.label) f.cyl(o.label, x, y, z + h * 0.18, z + h * 0.5, r + 0.004, r + 0.004, 14);
  }
  // A tin can with a label band.
  function tin(f, x, y, z, r, h, label, band) {
    f.cyl('c#b9b8b2/0.3/1', x, y, z, z + h, r, r, 14); f.cyl(label, x, y, z + 0.02, z + h - 0.02, r + 0.004, r + 0.004, 14);
    if (band) f.cyl(band, x, y, z + h * 0.35, z + h * 0.6, r + 0.007, r + 0.007, 14);
  }
  const plate = (f, x, y, z, r = 0.38, col = PORC) => ves(f, col, x, y, z, [[0, 0], [r * 0.6, 0], [r * 0.65, 0.015], [r, 0.05], [r, 0.06], [r * 0.6, 0.03], [0, 0.03]], 20);
  const bowl = (f, x, y, z, r, h, col = PORC, seg = 20) => ves(f, col, x, y, z, [[0, 0], [r * 0.5, 0], [r * 0.85, h * 0.45], [r, h], [r * 0.93, h], [r * 0.8, h * 0.5], [r * 0.45, h * 0.12], [0, h * 0.12]], seg);
  const glass = (f, x, y, z, r = 0.11, h = 0.42, fill) => { ves(f, GLASSY, x, y, z, [[0, 0], [r * 0.85, 0], [r, h], [r * 0.93, h], [r * 0.78, 0.04], [0, 0.04]], 14); if (fill) ves(f, fill, x, y, z + 0.04, [[0, 0], [r * 0.8, 0], [r * 0.9, h * 0.6], [0, h * 0.6]], 12); };
  const cupSaucer = (f, x, y, z, col = PORC, coffee = true) => {
    ves(f, col, x, y, z, [[0, 0], [0.16, 0], [0.19, 0.03], [0.18, 0.035], [0, 0.02]], 16);
    ves(f, col, x, y, z + 0.02, [[0, 0], [0.07, 0], [0.12, 0.08], [0.13, 0.2], [0.12, 0.2], [0.1, 0.06], [0, 0.04]], 14);
    if (coffee) f.cyl('c#3b2416/0.2', x, y, z + 0.17, z + 0.175, 0.115, 0.115, 12);
    tube(f, col, [[x + 0.12, y, z + 0.17], [x + 0.2, y, z + 0.15], [x + 0.19, y, z + 0.08], [x + 0.12, y, z + 0.07]], 0.014, 5);
  };
  // A cloth hanging over a bar at height z, front at y, x0..x1, hanging length len.
  function towel(f, x0, x1, y, z, len, col, stripe) {
    f.soft(col, x0, x1, y - 0.07, y + 0.012, z - 0.06, z + 0.03, 0.015);
    f.box(col, x0, x1, y + 0.005, y + 0.025, z - len, z - 0.02); f.box(col, x0 + 0.01, x1 - 0.01, y - 0.08, y - 0.06, z - len * 0.7, z - 0.02);
    if (stripe) for (const k of [0.25, 0.32]) f.box(stripe, x0 - 0.002, x1 + 0.002, y + 0.024, y + 0.028, z - len * k - 0.02, z - len * k);
  }
  // ---- A run of base cabinets: Shaker doors and drawers, toe kick, stone top, optional sink ----
  function front(f, a, b, z0, z1, y, paint, s = 0.17) {
    f.box(paint, a, b, y, y + 0.035, z0, z1);
    f.box(paint, a, a + s, y + 0.035, y + 0.07, z0, z1); f.box(paint, b - s, b, y + 0.035, y + 0.07, z0, z1);
    f.box(paint, a + s, b - s, y + 0.035, y + 0.07, z0, z0 + s); f.box(paint, a + s, b - s, y + 0.035, y + 0.07, z1 - s, z1);
  }
  function run(f, x0, x1, o = {}) {
    const d = o.d ?? 2, paint = o.paint ?? SAGEP, top = o.top ?? 'marble', sink = o.sink, fy = d - 0.07;
    f.box('c#2c2520/0.6', x0 + 0.02, x1 - 0.02, 0.05, d - 0.25, 0, 0.33);
    const cut = sink ? [[x0, sink[0], 2.88], [sink[0], sink[1], 2.1], [sink[1], x1, 2.88]] : [[x0, x1, 2.88]];
    for (const [a, b, zt] of cut) f.box(paint, a, b, 0.02, fy, 0.33, zt);
    const bays = [];
    const fillB = (a, b) => { const n = Math.max(1, Math.round((b - a) / 1.6)), w = (b - a) / n; for (let i = 0; i < n; i++) bays.push([a + i * w, a + (i + 1) * w, (bays.length % 3 === 1) ? 'drawers' : 'door']); };
    if (sink) { fillB(x0, sink[0]); bays.push([sink[0], sink[1], 'sink']); fillB(sink[1], x1); } else fillB(x0, x1);
    for (const [a0, b0, kind] of bays) {
      const a = a0 + 0.025, b = b0 - 0.025, m = (a + b) / 2;
      if (kind === 'drawers') {
        for (const [z0, z1] of [[0.42, 1.25], [1.32, 2.08], [2.15, 2.8]]) { front(f, a, b, z0, z1, fy, paint, 0.11); f.box(BRASS, m - 0.22, m + 0.22, fy + 0.07, fy + 0.11, (z0 + z1) / 2 + 0.08, (z0 + z1) / 2 + 0.12); f.box(BRASS, m - 0.24, m - 0.2, fy + 0.07, fy + 0.11, (z0 + z1) / 2 + 0.0, (z0 + z1) / 2 + 0.12); f.box(BRASS, m + 0.2, m + 0.24, fy + 0.07, fy + 0.11, (z0 + z1) / 2 + 0.0, (z0 + z1) / 2 + 0.12); }
      } else if (kind === 'sink') {
        const h = (b - a) / 2;
        for (const [p, q] of [[a, a + h - 0.01], [a + h + 0.01, b]]) { front(f, p, q, 0.42, 2.02, fy, paint); hcyl(f, BRASS, 'y', p === a ? q - 0.18 : p + 0.18, fy + 0.11, 1.7, 0.07, 0.035, 0.045, 10); }
      } else {
        front(f, a, b, 2.15, 2.8, fy, paint, 0.11); f.box(BRASS, m - 0.22, m + 0.22, fy + 0.07, fy + 0.11, 2.52, 2.56); f.box(BRASS, m - 0.24, m - 0.2, fy + 0.07, fy + 0.11, 2.44, 2.56); f.box(BRASS, m + 0.2, m + 0.24, fy + 0.07, fy + 0.11, 2.44, 2.56);
        front(f, a, b, 0.42, 2.08, fy, paint); hcyl(f, BRASS, 'y', b - 0.2, fy + 0.11, 1.78, 0.07, 0.035, 0.045, 10);
      }
    }
    const tops = sink ? [[x0 - 0.02, sink[0], -0.0, d + 0.08], [sink[1], x1 + 0.02, 0, d + 0.08], [sink[0], sink[1], 0, 0.45]] : [[x0 - 0.02, x1 + 0.02, 0, d + 0.08]];
    for (const [a, b, y0, y1] of tops) f.box(top, a, b, y0 + 0.005, y1, 2.9, 3.02, G);
    if (sink) {
      const [s0, s1] = sink, m = (s0 + s1) / 2;
      f.soft(PORC, s0, s1, d - 0.1, d + 0.03, 2.1, 3.0, 0.035);                                   // apron front
      f.box(PORC, s0, s1, 0.45, 0.53, 2.1, 3.0); f.box(PORC, s0, s0 + 0.08, 0.45, d - 0.08, 2.1, 3.0); f.box(PORC, s1 - 0.08, s1, 0.45, d - 0.08, 2.1, 3.0);
      f.box(PORC, s0 + 0.08, s1 - 0.08, 0.53, d - 0.08, 2.1, 2.2);                               // nine inches deep
      f.cyl('c#9a9590/0.3/1', m, 1.25, 2.2, 2.21, 0.1, 0.1, 14); f.cyl('c#3a3632/0.5', m, 1.25, 2.205, 2.215, 0.05, 0.05, 10);
      // Bridge faucet in unlacquered brass
      for (const s of [-0.38, 0.38]) { f.cyl(BRASS, m + s, 0.3, 3.02, 3.36, 0.045, 0.04, 12); f.box(BRASS, m + s - 0.14, m + s + 0.14, 0.27, 0.33, 3.4, 3.44); f.cyl('c#efe9dc/0.3', m + s, 0.3, 3.36, 3.42, 0.03, 0.03, 8); }
      hcyl(f, BRASS, 'x', m, 0.3, 3.3, 0.76, 0.035);
      tube(f, BRASS, [[m, 0.3, 3.28], [m, 0.3, 3.85], [m, 0.36, 4.1], [m, 0.55, 4.18], [m, 0.75, 4.05], [m, 0.82, 3.8], [m, 0.82, 3.62]], 0.035, 10);
      f.cyl(BRASS, m + 0.55, 0.3, 3.02, 3.35, 0.03, 0.025, 8);                                  // side spray
    }
    f.block(x0, x1, 0, d, 0, 3);
  }

  const wrap = f => { const g = Object.create(f); g.box = (m, ...a) => f.box(snapMat(m), ...a); g.soft = (m, ...a) => f.soft(snapMat(m), ...a); g.cyl = (m, ...a) => f.cyl(snapMat(m), ...a); g.sub = (...a) => wrap(f.sub(...a)); return g; };
  return { wrap, run, front, rnd, pick, put, ves, hcyl, ball, tube, fruit, grapes, leaves, potted, jar, bottle, tin, plate, bowl, glass, cupSaucer, towel };
}

// Roman shades for the windows over counters (marks them so no curtains are hung there).
export function romanShades(kit, test) {
  for (const w of kit.house?.windows ?? []) {
    if (w.fl > 5 || !test(w)) continue; w.noDrape = true;
    const mid = (w.u0 + w.u1) / 2, half = (w.u1 - w.u0) / 2, f = w.isX ? kit.fr(mid, w.c, w.fl, w.sg > 0 ? 0 : 2) : kit.fr(w.c, mid, w.fl, w.sg > 0 ? 3 : 1), L = 'linen#e6dccb', h = w.head;
    f.box(L, -half - 0.1, half + 0.1, 0.13, 0.16, h - 0.5, h + 0.42);
    for (let k = 0; k < 3; k++) f.soft(L, -half - 0.1, half + 0.1, 0.12, 0.25, h - 0.62 + k * 0.28, h - 0.46 + k * 0.28, 0.06);
    f.box('c#8a6a4a/0.6', -half - 0.1, half + 0.1, 0.15, 0.2, h - 0.66, h - 0.6);
  }
}

// Text on a drawn surface.
export function T(g, s, x, y, px, col, o = {}) {
  g.font = `${o.it ? 'italic ' : ''}${o.w ?? 'bold'} ${Math.round(px)}px ${o.f ?? 'Georgia, serif'}`;
  g.textAlign = o.a ?? 'center'; g.textBaseline = 'middle';
  if (o.stroke) { g.lineJoin = 'round'; g.lineWidth = o.lw ?? px * 0.12; g.strokeStyle = o.stroke; g.strokeText(s, x, y, o.max); }
  g.fillStyle = col; g.fillText(s, x, y, o.max);
}
const SANS = 'Helvetica, Arial, sans-serif', HEAVY = '"Arial Black", Impact, Helvetica, sans-serif', SCRIPT = '"Brush Script MT", "Segoe Script", cursive';
const bg = (g, w, h, c) => { g.fillStyle = c; g.fillRect(0, 0, w, h); };
const disc = (g, x, y, r, c, s) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = c; g.fill(); if (s) { g.strokeStyle = s; g.lineWidth = r * 0.12; g.stroke(); } };
const rect = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(x, y, w, h); };
// Trader Joe's: a red serif wordmark on kraft and cream, old engravings, hand lettering.
const tj = (g, w, y, px = w * 0.1) => T(g, "TRADER JOE'S", w / 2, y, px, '#c8102e', { f: 'Georgia, serif', max: w * 0.9 });
// Whole Foods' own brand: a big 365 in a roundel.
const w365 = (g, x, y, r) => { disc(g, x, y, r, '#fff', '#1f1f1f'); T(g, '365', x, y + r * 0.05, r * 0.95, '#1f1f1f', { f: HEAVY, max: r * 1.7 }); };

// Package fronts, drawn (no photographs, no downloaded logos).
export const ART = {
  cheezit(g, w, h) {
    bg(g, w, h, '#d52b1e'); g.fillStyle = '#f7c600'; g.beginPath(); g.moveTo(0, h * 0.1); g.lineTo(w, h * 0.04); g.lineTo(w, h * 0.33); g.lineTo(0, h * 0.4); g.fill();
    T(g, 'Cheez-It', w / 2, h * 0.215, w * 0.27, '#d52b1e', { f: HEAVY, it: 1, stroke: '#fff', lw: w * 0.03, max: w * 0.94 });
    T(g, 'ORIGINAL', w / 2, h * 0.47, w * 0.1, '#fff', { f: SANS });
    for (let i = 0; i < 9; i++) { const x = w * 0.2 + (i % 3) * w * 0.3 + (i > 2 ? -w * 0.06 : 0), y = h * 0.58 + Math.floor(i / 3) * h * 0.11; g.save(); g.translate(x, y); g.rotate(0.25 * (i % 2 ? 1 : -1)); rect(g, -w * 0.11, -w * 0.11, w * 0.22, w * 0.22, '#e8952a'); disc(g, 0, 0, w * 0.018, '#a8561a'); g.restore(); }
    T(g, 'BAKED SNACK CRACKERS', w / 2, h * 0.94, w * 0.07, '#fff', { f: SANS, max: w * 0.9 });
  },
  ghirardelli(g, w, h) {
    bg(g, w, h, '#2a1810'); rect(g, 0, h * 0.08, w, h * 0.02, '#c9a24a'); rect(g, 0, h * 0.9, w, h * 0.02, '#c9a24a');
    T(g, 'GHIRARDELLI', w / 2, h * 0.2, w * 0.12, '#d8b65a', { f: 'Georgia, serif', max: w * 0.9 });
    T(g, 'CHOCOLATE', w / 2, h * 0.29, w * 0.07, '#d8b65a', { w: 'normal', max: w * 0.8 });
    T(g, 'Intense Dark', w / 2, h * 0.4, w * 0.1, '#f3e6c4', { it: 1, w: 'normal', max: w * 0.9 });
    for (let i = 0; i < 4; i++) { const x = w * (0.22 + (i % 2) * 0.32), y = h * (0.52 + Math.floor(i / 2) * 0.17); g.save(); g.translate(x + w * 0.08, y + w * 0.08); g.rotate(0.3 - i * 0.2); rect(g, -w * 0.12, -w * 0.12, w * 0.24, w * 0.24, i % 2 ? '#3a2318' : '#b88d3a'); rect(g, -w * 0.08, -w * 0.08, w * 0.16, w * 0.16, i % 2 ? '#56362a' : '#d8b65a'); g.restore(); }
    T(g, 'SQUARES · 72% CACAO', w / 2, h * 0.95, w * 0.065, '#d8b65a', { f: SANS, max: w * 0.9 });
  },
  lindor(g, w, h) {
    bg(g, w, h, '#c4122f'); T(g, 'Lindt', w / 2, h * 0.14, w * 0.2, '#fff', { f: SCRIPT, w: 'normal', it: 1 });
    T(g, 'LINDOR', w / 2, h * 0.3, w * 0.2, '#e4c06a', { f: 'Georgia, serif', max: w * 0.9 });
    T(g, 'MILK CHOCOLATE TRUFFLES', w / 2, h * 0.39, w * 0.055, '#fff', { f: SANS, max: w * 0.9 });
    for (let i = 0; i < 5; i++) { const x = w * (0.22 + (i % 3) * 0.28 + (i > 2 ? 0.14 : 0)), y = h * (0.56 + Math.floor(i / 3) * 0.2); disc(g, x, y, w * 0.13, '#a50e26', '#e4c06a'); disc(g, x - w * 0.04, y - w * 0.04, w * 0.03, '#e8606a'); }
    T(g, 'smooth melting', w / 2, h * 0.93, w * 0.08, '#fff', { it: 1, w: 'normal' });
  },
  crunch(g, w, h) {
    bg(g, w, h, '#1d5aa6'); T(g, 'Nestlé', w * 0.5, h * 0.17, w * 0.07, '#fff', { f: SANS, w: 'normal' });
    g.save(); g.translate(w / 2, h * 0.52); g.rotate(-0.06); T(g, 'CRUNCH', 0, 0, h * 0.42, '#fff', { f: HEAVY, stroke: '#d6202a', lw: h * 0.08, max: w * 0.9 }); g.restore();
    T(g, 'MILK CHOCOLATE · CRISPED RICE', w / 2, h * 0.86, h * 0.08, '#fff', { f: SANS, max: w * 0.9 });
  },
  joejoes(g, w, h) {
    bg(g, w, h, '#efe4c8'); rect(g, 0, 0, w, h * 0.06, '#c8102e'); tj(g, w, h * 0.12, w * 0.09);
    T(g, "Joe-Joe's", w / 2, h * 0.3, w * 0.22, '#3a1e14', { f: SCRIPT, it: 1, max: w * 0.9 });
    T(g, 'Chocolate Sandwich Cremes', w / 2, h * 0.43, w * 0.07, '#c8102e', { it: 1, w: 'normal', max: w * 0.9 });
    for (let i = 0; i < 3; i++) { const x = w * (0.26 + i * 0.24), y = h * 0.64; disc(g, x, y, w * 0.12, '#2a1610'); rect(g, x - w * 0.12, y - h * 0.012, w * 0.24, h * 0.024, '#f6f1e6'); }
    T(g, 'with real peppermint candy', w / 2, h * 0.86, w * 0.06, '#2a3549', { it: 1, w: 'normal', max: w * 0.9 });
  },
  pretzels(g, w, h) {
    bg(g, w, h, '#f3e9d2'); tj(g, w, h * 0.13, w * 0.1); T(g, 'Peanut Butter', w / 2, h * 0.35, w * 0.13, '#7a3b1c', { it: 1, max: w * 0.9 });
    T(g, 'FILLED PRETZEL NUGGETS', w / 2, h * 0.5, w * 0.075, '#2a3549', { f: SANS, max: w * 0.9 });
    for (let i = 0; i < 5; i++) disc(g, w * (0.2 + i * 0.15), h * (0.72 + (i % 2) * 0.08), w * 0.08, '#a8642a');
  },
  pbcups(g, w, h) {
    bg(g, w, h, '#3a2416'); tj(g, w, h * 0.12, w * 0.09); rect(g, 0, h * 0.2, w, h * 0.03, '#e7b33a');
    T(g, 'Dark Chocolate', w / 2, h * 0.33, w * 0.11, '#f4e7c6', { it: 1, max: w * 0.9 }); T(g, 'PEANUT BUTTER CUPS', w / 2, h * 0.45, w * 0.075, '#e7b33a', { f: SANS, max: w * 0.9 });
    for (let i = 0; i < 3; i++) { disc(g, w * (0.25 + i * 0.25), h * 0.7, w * 0.11, '#201208'); disc(g, w * (0.25 + i * 0.25), h * 0.7, w * 0.07, '#4a2c18'); }
  },
  popcorn(g, w, h) {
    bg(g, w, h, '#f6eed8'); rect(g, 0, h * 0.82, w, h * 0.18, '#2c7a5a'); tj(g, w, h * 0.1, w * 0.1);
    T(g, 'Organic Popcorn', w / 2, h * 0.3, w * 0.12, '#2c7a5a', { it: 1, max: w * 0.92 }); T(g, 'WITH OLIVE OIL', w / 2, h * 0.42, w * 0.08, '#c8102e', { f: SANS });
    for (let i = 0; i < 14; i++) disc(g, w * (0.2 + (i * 37 % 60) / 100), h * (0.55 + (i * 23 % 22) / 100), w * 0.06, '#fff8e4', '#e6d39a');
  },
  joesOs(g, w, h) {
    bg(g, w, h, '#f2c12e'); tj(g, w, h * 0.08, w * 0.09); T(g, "Joe's O's", w / 2, h * 0.24, w * 0.2, '#1f4e8c', { f: HEAVY, max: w * 0.9 });
    T(g, 'Toasted Whole Grain Oat Cereal', w / 2, h * 0.36, w * 0.06, '#1f4e8c', { f: SANS, max: w * 0.9 });
    disc(g, w / 2, h * 0.66, w * 0.3, '#fff', '#1f4e8c'); for (let i = 0; i < 12; i++) { const a = i * 2.4, rr = w * 0.18 * Math.sqrt(i / 12); disc(g, w / 2 + Math.cos(a) * rr, h * 0.64 + Math.sin(a) * rr * 0.6, w * 0.04, '#c99a3a'); disc(g, w / 2 + Math.cos(a) * rr, h * 0.64 + Math.sin(a) * rr * 0.6, w * 0.015, '#fff'); }
  },
  tjPB(g, w, h) {
    bg(g, w, h, '#e9d8b4'); tj(g, w, h * 0.2, w * 0.13); T(g, 'Creamy Salted', w / 2, h * 0.48, w * 0.13, '#5a2e14', { it: 1, max: w * 0.9 }); T(g, 'PEANUT BUTTER', w / 2, h * 0.68, w * 0.11, '#2a3549', { f: SANS, max: w * 0.9 });
  },
  spaghetti(g, w, h) {
    bg(g, w, h, '#1b3f8b'); rect(g, 0, h * 0.18, w, h * 0.16, '#f5c400'); T(g, 'De Cecco', w / 2, h * 0.26, h * 0.11, '#1b3f8b', { it: 1, max: w * 0.9 });
    rect(g, w * 0.15, h * 0.42, w * 0.7, h * 0.36, '#f3dc9a'); for (let i = 0; i < 20; i++) rect(g, w * 0.17 + i * w * 0.033, h * 0.43, w * 0.012, h * 0.34, '#e6c46a');
    T(g, 'SPAGHETTI n° 12', w / 2, h * 0.88, h * 0.06, '#fff', { f: SANS, max: w * 0.9 });
  },
  penne(g, w, h) {
    bg(g, w, h, '#fbfaf5'); w365(g, w * 0.5, h * 0.18, w * 0.18); T(g, 'WHOLE FOODS MARKET', w / 2, h * 0.34, w * 0.07, '#333', { f: SANS, max: w * 0.9 });
    T(g, 'Organic Penne Rigate', w / 2, h * 0.46, w * 0.08, '#1f6b4a', { f: SANS, max: w * 0.92 });
    for (let i = 0; i < 6; i++) { g.save(); g.translate(w * (0.25 + (i % 3) * 0.25), h * (0.63 + Math.floor(i / 3) * 0.14)); g.rotate(0.6); rect(g, -w * 0.1, -h * 0.025, w * 0.2, h * 0.05, '#e3b85a'); g.restore(); }
  },
  broth(g, w, h) {
    bg(g, w, h, '#f5efe0'); w365(g, w * 0.5, h * 0.17, w * 0.2); T(g, 'Organic', w / 2, h * 0.38, w * 0.12, '#1f6b4a', { it: 1 });
    T(g, 'CHICKEN BROTH', w / 2, h * 0.52, w * 0.1, '#7a3b1c', { f: SANS, max: w * 0.92 }); rect(g, 0, h * 0.7, w, h * 0.3, '#e8a53a'); disc(g, w / 2, h * 0.82, w * 0.22, '#d9892a');
  },
  flour(g, w, h) {
    bg(g, w, h, '#f7f4ec'); disc(g, w / 2, h * 0.27, w * 0.22, '#fff', '#c8102e'); g.strokeStyle = '#1f3b78'; g.lineWidth = w * 0.03; g.beginPath(); g.moveTo(w * 0.4, h * 0.2); g.lineTo(w * 0.6, h * 0.34); g.moveTo(w * 0.6, h * 0.2); g.lineTo(w * 0.4, h * 0.34); g.stroke();
    T(g, 'KING ARTHUR', w / 2, h * 0.5, w * 0.12, '#1f3b78', { f: 'Georgia, serif', max: w * 0.92 }); T(g, 'BAKING COMPANY', w / 2, h * 0.57, w * 0.06, '#c8102e', { f: SANS });
    T(g, 'Unbleached', w / 2, h * 0.7, w * 0.1, '#1f3b78', { it: 1 }); T(g, 'ALL-PURPOSE FLOUR', w / 2, h * 0.8, w * 0.08, '#1f3b78', { f: SANS, max: w * 0.92 });
  },
  rice(g, w, h) {
    bg(g, w, h, '#f4ead6'); rect(g, 0, 0, w, h * 0.22, '#c42a3a'); T(g, 'THREE LADIES', w / 2, h * 0.11, w * 0.1, '#f7d36a', { f: SANS, max: w * 0.9 });
    for (let i = 0; i < 3; i++) { disc(g, w * (0.3 + i * 0.2), h * 0.4, w * 0.07, '#2a1c14'); rect(g, w * (0.25 + i * 0.2), h * 0.45, w * 0.1, h * 0.17, ['#c42a3a', '#2a6a4a', '#d8a030'][i]); }
    T(g, 'JASMINE RICE', w / 2, h * 0.75, w * 0.11, '#c42a3a', { f: SANS, max: w * 0.9 }); T(g, 'Gạo Thơm', w / 2, h * 0.86, w * 0.08, '#2a6a4a', { it: 1, w: 'normal' });
  },
  oliveoil(g, w, h) {
    bg(g, w, h, '#2f4a2a'); rect(g, w * 0.08, h * 0.08, w * 0.84, h * 0.84, '#e9dfb8'); T(g, 'OLIO', w / 2, h * 0.25, w * 0.2, '#2f4a2a'); T(g, 'extra vergine', w / 2, h * 0.38, w * 0.11, '#7a6a2a', { it: 1, w: 'normal' });
    disc(g, w / 2, h * 0.62, w * 0.16, '#6b7a2a'); T(g, 'SICILIA', w / 2, h * 0.84, w * 0.1, '#2f4a2a', { f: SANS });
  },
  trungNguyen(g, w, h) {
    bg(g, w, h, '#3a2014'); rect(g, 0, h * 0.62, w, h * 0.06, '#c8202a'); rect(g, 0, h * 0.69, w, h * 0.012, '#d8b048');
    disc(g, w / 2, h * 0.28, w * 0.2, '#c8202a', '#d8b048'); g.fillStyle = '#3a2014'; g.beginPath(); g.ellipse(w / 2, h * 0.28, w * 0.07, w * 0.11, 0.4, 0, TAU); g.fill(); g.strokeStyle = '#d8b048'; g.lineWidth = w * 0.012; g.beginPath(); g.moveTo(w * 0.47, h * 0.22); g.quadraticCurveTo(w * 0.53, h * 0.28, w * 0.48, h * 0.34); g.stroke();
    T(g, 'TRUNG NGUYÊN', w / 2, h * 0.5, w * 0.12, '#e3bd55', { max: w * 0.92 }); T(g, 'LEGEND', w / 2, h * 0.57, w * 0.07, '#e3bd55', { f: SANS });
    T(g, 'Cà Phê Phin', w / 2, h * 0.79, w * 0.1, '#f3e2bd', { it: 1, w: 'normal' }); T(g, 'PREMIUM BLEND', w / 2, h * 0.88, w * 0.075, '#e3bd55', { f: SANS, max: w * 0.9 });
  },
  trungCan(g, w, h) {
    bg(g, w, h, '#b8202a'); rect(g, 0, h * 0.12, w, h * 0.03, '#e3bd55'); rect(g, 0, h * 0.85, w, h * 0.03, '#e3bd55');
    T(g, 'TRUNG NGUYÊN', w / 2, h * 0.32, h * 0.13, '#f3d27a', { max: w * 0.92 }); T(g, 'Sáng tạo 8', w / 2, h * 0.52, h * 0.12, '#fff', { it: 1, w: 'normal' }); T(g, 'GROUND COFFEE', w / 2, h * 0.7, h * 0.08, '#f3d27a', { f: SANS });
  },
  longevity(g, w, h) {
    bg(g, w, h, '#f8f6ee'); rect(g, 0, 0, w, h * 0.2, '#1d4f9a'); rect(g, 0, h * 0.8, w, h * 0.2, '#1d4f9a');
    T(g, 'LONGEVITY', w * 0.62, h * 0.4, h * 0.17, '#c8202a', { max: w * 0.6 }); T(g, 'Sweetened Condensed Milk', w * 0.62, h * 0.6, h * 0.09, '#1d4f9a', { f: SANS, max: w * 0.6 });
    disc(g, w * 0.17, h * 0.5, h * 0.24, '#f3d9a8', '#c8202a'); disc(g, w * 0.17, h * 0.43, h * 0.08, '#e6b98a'); rect(g, w * 0.13, h * 0.5, w * 0.08, h * 0.14, '#c8202a'); T(g, 'Ông Thọ', w * 0.5, h * 0.9, h * 0.08, '#fff', { it: 1, w: 'normal' });
  },
  stringCheese(g, w, h) {
    bg(g, w, h, '#f2f6fb'); rect(g, 0, 0, w, h * 0.26, '#1d4f9a'); T(g, 'Cheese Heads', w / 2, h * 0.13, h * 0.13, '#f5c400', { it: 1, max: w * 0.9 });
    T(g, 'STRING CHEESE', w / 2, h * 0.38, h * 0.1, '#1d4f9a', { f: HEAVY, max: w * 0.9 }); T(g, 'Mozzarella · 12 sticks', w / 2, h * 0.49, h * 0.065, '#444', { f: SANS });
    for (let i = 0; i < 4; i++) { g.save(); g.translate(w * (0.24 + i * 0.17), h * 0.75); g.rotate(-0.4); rect(g, -w * 0.05, -h * 0.17, w * 0.1, h * 0.34, '#fbf7ea'); rect(g, -w * 0.05, -h * 0.17, w * 0.1, h * 0.03, '#e6dcc0'); g.restore(); }
  },
  pepperoni(g, w, h) {
    bg(g, w, h, '#b71c1c'); rect(g, 0, h * 0.06, w, h * 0.2, '#111'); T(g, 'HORMEL', w / 2, h * 0.16, h * 0.13, '#fff', { f: HEAVY });
    T(g, 'Original', w / 2, h * 0.36, h * 0.1, '#fff', { it: 1, w: 'normal' }); T(g, 'PEPPERONI', w / 2, h * 0.5, h * 0.15, '#fff', { f: HEAVY, max: w * 0.9 });
    for (let i = 0; i < 6; i++) disc(g, w * (0.2 + i * 0.12), h * (0.76 + (i % 2) * 0.05), w * 0.09, '#a8261c', '#7a160e');
    T(g, 'SLICED', w * 0.85, h * 0.92, h * 0.07, '#fff', { f: SANS });
  },
  martinelli(g, w, h) {
    bg(g, w, h, '#d8b048'); rect(g, w * 0.06, h * 0.08, w * 0.88, h * 0.84, '#f4e7c0');
    T(g, "Martinelli's", w / 2, h * 0.28, h * 0.17, '#9a1c1c', { it: 1, max: w * 0.86 }); T(g, 'GOLD MEDAL', w / 2, h * 0.47, h * 0.1, '#9a7a2a', { f: SANS });
    T(g, '100% APPLE JUICE', w / 2, h * 0.65, h * 0.1, '#9a1c1c', { f: SANS, max: w * 0.86 }); disc(g, w / 2, h * 0.82, h * 0.06, '#c8202a');
  },
  milk(g, w, h) {
    bg(g, w, h, '#ffffff'); rect(g, 0, h * 0.62, w, h * 0.38, '#2a63b8'); w365(g, w / 2, h * 0.2, w * 0.2);
    T(g, 'Organic', w / 2, h * 0.42, w * 0.13, '#2a63b8', { it: 1 }); T(g, 'WHOLE MILK', w / 2, h * 0.53, w * 0.11, '#1f2f5a', { f: SANS, max: w * 0.9 });
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, h * 0.7); for (let i = 0; i <= 8; i++) g.quadraticCurveTo(w * (i + 0.5) / 8, h * (i % 2 ? 0.66 : 0.74), w * (i + 1) / 8, h * 0.7); g.lineTo(w, h * 0.62); g.lineTo(0, h * 0.62); g.fill();
  },
  hummus(g, w, h) {
    bg(g, w, h, '#f3e8cc'); tj(g, w, h * 0.22, w * 0.1); T(g, 'Mediterranean Hummus', w / 2, h * 0.58, h * 0.16, '#2f5a2a', { it: 1, max: w * 0.9 }); rect(g, 0, h * 0.82, w, h * 0.18, '#c8102e');
  },
  yogurt(g, w, h) {
    bg(g, w, h, '#ffffff'); rect(g, 0, 0, w, h * 0.3, '#1e8a5a'); T(g, 'FAGE', w / 2, h * 0.15, h * 0.2, '#fff', { f: HEAVY }); T(g, 'Total 5%', w / 2, h * 0.5, h * 0.16, '#1e8a5a', { f: SANS }); T(g, 'Greek Strained Yoghurt', w / 2, h * 0.75, h * 0.11, '#333', { it: 1, w: 'normal', max: w * 0.9 });
  },
  // Shopping list in Anna's hand
  list(g, w, h) {
    bg(g, w, h, '#fbf6e6'); g.strokeStyle = '#9fc0e0'; g.lineWidth = 2; for (let y = h * 0.2; y < h; y += h * 0.075) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    rect(g, w * 0.12, 0, 2, h, '#e8a0a0'); T(g, 'for the weekend', w * 0.55, h * 0.1, h * 0.06, '#7a2a5a', { f: SCRIPT, w: 'normal', it: 1 });
    ['string cheese!!', 'pepperoni', 'apple juice', 'Cheez-Its', 'lemons ×6', 'cream (heavy)', 'TJ\'s PB cups', 'Lindor (red)', 'parmesan', 'flowers for Sat', 'Trung Nguyên'].forEach((s, i) => T(g, s, w * 0.17, h * (0.2 + i * 0.075) - h * 0.012, h * 0.055, '#2a3a6a', { f: SCRIPT, w: 'normal', a: 'left', it: 1 }));
    g.strokeStyle = '#2a3a6a'; g.beginPath(); g.moveTo(w * 0.16, h * 0.344); g.lineTo(w * 0.55, h * 0.34); g.stroke();
  },
  polaroid(g, w, h) {
    bg(g, w, h, '#f6f3ea'); const gr = g.createLinearGradient(0, 0, 0, h * 0.78); gr.addColorStop(0, '#d9c49a'); gr.addColorStop(1, '#8a6a4a'); rect(g, w * 0.07, h * 0.06, w * 0.86, h * 0.7, '#c9b087'); g.fillStyle = gr; g.fillRect(w * 0.07, h * 0.5, w * 0.86, h * 0.26);
    rect(g, w * 0.07, h * 0.06, w * 0.86, h * 0.3, '#e8b07a'); disc(g, w * 0.5, h * 0.36, w * 0.12, '#f3d27a'); rect(g, w * 0.07, h * 0.36, w * 0.86, h * 0.4, '#2a6a8a'); for (let i = 0; i < 5; i++) rect(g, w * (0.15 + i * 0.13), h * (0.45 + i * 0.05), w * 0.12, h * 0.012, '#f3d27a');
    T(g, 'Hội An ♥', w / 2, h * 0.87, h * 0.08, '#333', { f: SCRIPT, w: 'normal', it: 1 });
  },
  postcard(g, w, h) {
    const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#5aa0c8'); gr.addColorStop(0.55, '#f3d9a0'); gr.addColorStop(0.56, '#2a6a8a'); gr.addColorStop(1, '#1d4a6a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    T(g, 'Hội An', w / 2, h * 0.25, h * 0.2, '#fff', { f: SCRIPT, w: 'normal', it: 1 }); for (let i = 0; i < 5; i++) disc(g, w * (0.15 + i * 0.17), h * 0.48, h * 0.06, ['#e8402a', '#f3b02a', '#e8402a', '#d82a6a', '#f3b02a'][i]);
  },
  menu(g, w, h) {
    bg(g, w, h, '#2a2c2a'); T(g, 'THIS WEEK', w / 2, h * 0.12, h * 0.07, '#efe9da', { f: SANS }); ['Sat — dinner for 8', 'lamb, white beans', 'lemon tart', 'Sun — brunch'].forEach((s, i) => T(g, s, w / 2, h * (0.3 + i * 0.16), h * 0.075, ['#efe9da', '#e9c46a', '#efe9da', '#9fc6b0'][i], { f: SCRIPT, w: 'normal', it: 1, max: w * 0.9 }));
  },
  recipe(g, w, h) {
    bg(g, w, h, '#f6f0e0'); rect(g, w / 2 - 1, 0, 2, h, '#d8cdb4');
    T(g, 'Tarte au citron', w * 0.25, h * 0.12, h * 0.07, '#5a2e14', { it: 1, max: w * 0.45 }); for (let i = 0; i < 9; i++) rect(g, w * 0.05, h * (0.24 + i * 0.07), w * (0.3 + (i * 7 % 5) * 0.03), h * 0.015, '#8a7a6a');
    const gr = g.createLinearGradient(0, h * 0.1, 0, h * 0.9); gr.addColorStop(0, '#f3e08a'); gr.addColorStop(1, '#c9953a'); g.fillStyle = gr; g.beginPath(); g.ellipse(w * 0.75, h * 0.45, w * 0.18, h * 0.3, 0, 0, TAU); g.fill(); disc(g, w * 0.75, h * 0.45, w * 0.12, '#f7e27a');
    for (let i = 0; i < 4; i++) rect(g, w * 0.57, h * (0.82 + i * 0.04), w * 0.36, h * 0.012, '#8a7a6a');
  },
  clock(g, w, h) {
    disc(g, w / 2, h / 2, w * 0.49, '#f6f1e4'); g.strokeStyle = '#1d1a17'; for (let i = 0; i < 60; i++) { const a = i / 60 * TAU, r0 = i % 5 ? w * 0.44 : w * 0.4; g.lineWidth = i % 5 ? 2 : 5; g.beginPath(); g.moveTo(w / 2 + Math.sin(a) * r0, h / 2 - Math.cos(a) * r0); g.lineTo(w / 2 + Math.sin(a) * w * 0.47, h / 2 - Math.cos(a) * w * 0.47); g.stroke(); }
    for (let i = 1; i <= 12; i++) { const a = i / 12 * TAU; T(g, String(i), w / 2 + Math.sin(a) * w * 0.33, h / 2 - Math.cos(a) * w * 0.33, w * 0.08, '#1d1a17', { w: 'normal' }); }
    T(g, 'Cambridge', w / 2, h * 0.68, w * 0.045, '#5a4a3a', { it: 1, w: 'normal' });
    const hand = (a, l, lw) => { g.lineWidth = lw; g.lineCap = 'round'; g.beginPath(); g.moveTo(w / 2, h / 2); g.lineTo(w / 2 + Math.sin(a) * l, h / 2 - Math.cos(a) * l); g.stroke(); };
    hand(10.2 / 12 * TAU, w * 0.22, 7); hand(2 / 12 * TAU, w * 0.36, 4); g.strokeStyle = '#a8261c'; hand(7 / 12 * TAU, w * 0.4, 2); disc(g, w / 2, h / 2, 6, '#1d1a17');
  },
};

export default function (kit) {
  const { model, picture, rug, lampAt, tableLamp, bookRow, bookStack, seat, sign, pack, hingedDoor, steam } = kit;
  const K = tools(kit, 11), fr = (...a) => K.wrap(kit.fr(...a)), { run, rnd, pick, put, ves, hcyl, ball, tube, fruit, grapes, leaves, potted, jar, bottle, tin, plate, bowl, glass, cupSaucer, towel } = K;
  const SHADE = 'shade', MARB = 'marble', BUTCHER = 'oak_light#a3825c';

  // Over the counters the curtains would hang into the worktops: linen Roman shades instead.
  romanShades(kit, w => (!w.isX && Math.abs(w.c - 42.83) < 0.1 && (w.u0 + w.u1) / 2 > 22.8 && (w.u0 + w.u1) / 2 < 35) || (w.isX && Math.abs(w.c - 35.0) < 0.1 && (w.u0 + w.u1) / 2 > 31));

  // ========================================================================================
  // North wall: sink run under the window
  // ========================================================================================
  const n = fr(42.83, 22.8, F1, 1);                         // x = Y - 22.8, y = out from the wall (-X)
  run(n, 0.02, 12.18, { sink: [4.95, 7.45] });
  n.box(TILE, 0.02, 2.93, 0.004, 0.035, 3.02, 4.58); n.box(TILE, 9.47, 12.18, 0.004, 0.035, 3.02, 4.58);
  // Open oak shelves, left of the window: plates, bowls, cookbooks, crocks
  for (const z of [4.6, 5.55, 6.5]) { n.box(HONEY, 0.1, 2.8, 0.035, 1.0, z - 0.1, z, G); for (const x of [0.35, 2.5]) { n.box('c#2b2724/0.55/0.7', x - 0.03, x + 0.03, 0.035, 0.75, z - 0.14, z - 0.1); n.box('c#2b2724/0.55/0.7', x - 0.03, x + 0.03, 0.035, 0.08, z - 0.55, z - 0.1); } }
  n.box(SHADE, 0.2, 2.7, 0.8, 0.86, 4.45, 4.49);
  for (let k = 0; k < 7; k++) plate(n, 0.7, 0.5, 4.6 + k * 0.035, 0.36, k % 3 ? PORC : 'c#d8dcd6/0.25');
  for (let k = 0; k < 3; k++) bowl(n, 1.55, 0.5, 4.6 + k * 0.09, 0.28 - k * 0.02, 0.2, 'c#d9cbb0/0.35');
  jar(n, 2.2, 0.45, 4.6, 0.13, 0.45, 'c#d9b35a/0.8', 0.85); jar(n, 2.5, 0.6, 4.6, 0.11, 0.34, 'c#8a4a2a/0.8', 0.7);
  bookRow(n, 0.18, 1.85, 0.06, 5.55, 0.88, 1); ves(n, 'c#2f4a5a/0.3', 2.25, 0.5, 5.55, [[0, 0], [0.12, 0], [0.16, 0.25], [0.12, 0.42], [0.14, 0.5], [0.1, 0.5], [0, 0.45]], 14);
  ves(n, 'c#c9b48a/0.6', 0.6, 0.5, 6.5, [[0, 0], [0.18, 0], [0.22, 0.25], [0.2, 0.42], [0.16, 0.44], [0, 0.44]], 16);
  ves(n, PORC, 1.3, 0.5, 6.5, [[0, 0], [0.14, 0], [0.18, 0.2], [0.13, 0.32], [0.06, 0.36], [0.04, 0.4], [0, 0.4]], 14);
  bowl(n, 2.05, 0.5, 6.5, 0.3, 0.22, 'c#2f5a6a/0.3');
  // Glass-front cupboard right of the window
  {
    const a = 9.6, b = 12.05, y1 = 1.15, z0 = 4.62, z1 = 6.9;                // clear of the back window's head casing
    n.box(SAGEP, a, b, 0.035, 0.08, z0, z1); n.box(SAGEP, a, a + 0.07, 0.035, y1, z0, z1); n.box(SAGEP, b - 0.07, b, 0.035, y1, z0, z1);
    n.box(SAGEP, a, b, 0.035, y1, z0, z0 + 0.08); n.box(SAGEP, a - 0.03, b + 0.02, 0.035, y1 + 0.05, z1 - 0.02, z1 + 0.06);
    for (const z of [5.4, 6.12]) n.box('c#dfe6e6/0.15', a + 0.07, b - 0.07, 0.08, y1 - 0.08, z - 0.03, z);
    const mid = (a + b) / 2;
    for (const [p, q] of [[a + 0.02, mid - 0.01], [mid + 0.01, b - 0.02]]) {
      n.box(SAGEP, p, q, y1 - 0.04, y1, z0 + 0.02, z0 + 0.18); n.box(SAGEP, p, q, y1 - 0.04, y1, z1 - 0.16, z1 - 0.02);
      n.box(SAGEP, p, p + 0.12, y1 - 0.04, y1, z0 + 0.18, z1 - 0.16); n.box(SAGEP, q - 0.12, q, y1 - 0.04, y1, z0 + 0.18, z1 - 0.16);
      n.box(SAGEP, p + 0.12, q - 0.12, y1 - 0.035, y1 - 0.005, 5.75, 5.8); n.box(GLASSY, p + 0.12, q - 0.12, y1 - 0.025, y1 - 0.015, z0 + 0.18, z1 - 0.16);
    }
    hcyl(n, BRASS, 'y', mid - 0.12, y1 + 0.03, 5.55, 0.06, 0.03); hcyl(n, BRASS, 'y', mid + 0.12, y1 + 0.03, 5.55, 0.06, 0.03);
    for (let i = 0; i < 6; i++) { const x = a + 0.3 + i * 0.36; ves(n, GLASSY, x, 0.5, 4.7, [[0, 0], [0.09, 0], [0.09, 0.012], [0.015, 0.03], [0.015, 0.25], [0.08, 0.3], [0.1, 0.45], [0.095, 0.45], [0, 0.3]], 12); }
    for (let i = 0; i < 4; i++) cupSaucer(n, a + 0.4 + i * 0.55, 0.55, 5.4, i % 2 ? 'c#e6e0d2/0.2' : 'c#c9d6d8/0.25', false);
    for (let i = 0; i < 5; i++) glass(n, a + 0.35 + i * 0.45, 0.5, 6.12, 0.1, 0.38);
    n.box(SHADE, a + 0.1, b - 0.1, 0.9, 0.96, z0 - 0.05, z0 - 0.01);
  }
  // Herbs on the window sill: basil, rosemary, thyme; parsley and mint
  for (const [x, o] of [[4.35, { n: 14, len: 0.28, w: 0.05, up: 0.7, out: 0.8 }], [4.75, { n: 18, len: 0.42, w: 0.012, up: 1.0, out: 0.35, col: ['c#4a5a44/0.8'] }], [7.8, { n: 16, len: 0.24, w: 0.03, up: 0.8, out: 0.7 }], [8.15, { n: 14, len: 0.3, w: 0.045, up: 0.75, out: 0.85, col: ['c#5d8a3a/0.7'] }]])
    potted(n, x, 0.14, 3.405, { r: 0.1, h: 0.16, ...o });
  // Knife strip, utensil crock, cutting boards, canisters
  n.box(WALNUT, 0.85, 2.3, 0.035, 0.1, 3.95, 4.08);
  [[1.0, 0.07, 0.36], [1.22, 0.1, 0.5], [1.48, 0.13, 0.62], [1.78, 0.09, 0.5], [2.05, 0.05, 0.42]].forEach(([x, w, l]) => { n.box(STEEL, x - w / 2, x + w / 2, 0.1, 0.112, 4.0 - l, 4.05); n.box(BLACK, x - 0.03, x + 0.03, 0.095, 0.13, 4.08, 4.42); });
  ves(n, 'c#d9cdb2/0.4', 0.45, 1.25, 3.02, [[0, 0], [0.18, 0], [0.22, 0.12], [0.22, 0.5], [0.24, 0.55], [0.2, 0.55], [0, 0.5]], 16);
  for (let i = 0; i < 7; i++) { const a = i * 0.9, x = 0.45 + Math.cos(a) * 0.08, y = 1.25 + Math.sin(a) * 0.08, tx = x + Math.cos(a) * 0.22, ty = y + Math.sin(a) * 0.22, tz = 3.02 + 1.05 + (i % 3) * 0.12;
    tube(n, i % 3 === 2 ? BLACK : 'c#b08a5a/0.7', [[x, y, 3.15], [tx, ty, tz]], 0.022, 5);
    if (i % 3 === 0) ball(n, 'c#b08a5a/0.7', tx, ty, tz - 0.02, 0.07, 8, 1.6); else if (i % 3 === 1) n.box(i % 2 ? 'c#b08a5a/0.7' : BLACK, tx - 0.07, tx + 0.07, ty - 0.012, ty + 0.012, tz, tz + 0.2); }
  for (let k = 0; k < 4; k++) { const z = 3.05 + k * 0.06; tube(n, STEEL, [[0.45 + Math.cos(k) * 0.05, 1.25, 3.2], [0.4 + Math.cos(k * 1.7) * 0.12, 1.25 + Math.sin(k * 1.7) * 0.12, 4.0 + z * 0], [0.45 + Math.cos(k + 3) * 0.05, 1.25, 3.2]], 0.006, 4); }
  n.box(BUTCHER, 9.65, 10.65, 0.07, 0.17, 3.02, 4.25, { rot: [0, 0, 0] }); n.box('c#a07a4a/0.6', 10.4, 11.15, 0.18, 0.26, 3.02, 3.9);
  n.cyl('c#2b2724/0.6', 10.15, 0.12, 3.85, 3.95, 0.08, 0.08, 10);
  // Toaster with the toast up
  { const tx = 11.3, ty = 1.0;   /* clear of the window stool */ n.soft(CHROME, tx - 0.5, tx + 0.5, ty - 0.3, ty + 0.3, 3.04, 3.72, 0.12); n.box(BLACK, tx - 0.45, tx + 0.45, ty - 0.25, ty + 0.25, 3.02, 3.06);
    for (const dy of [-0.1, 0.1]) { n.box('c#1a1714/0.6', tx - 0.38, tx + 0.38, ty + dy - 0.04, ty + dy + 0.04, 3.7, 3.73); n.soft('c#c9944a/0.8', tx - 0.33, tx + 0.33, ty + dy - 0.03, ty + dy + 0.03, 3.45, 3.92, 0.04); }
    n.box(BLACK, tx + 0.5, tx + 0.58, ty - 0.04, ty + 0.04, 3.35, 3.45); }
  // Canisters by the window
  [[3.25, 0.62, 0.75, 'FLOUR'], [3.72, 0.55, 0.62, 'SUGAR'], [4.12, 0.62, 0.5, 'TEA']].forEach(([x, y, h], i) => { ves(n, 'c#e8e2d4/0.3', x, y, 3.02, [[0, 0], [0.2, 0], [0.2, h], [0.18, h], [0, h]], 18); ves(n, 'c#e8e2d4/0.3', x, y, 3.02 + h, [[0, 0], [0.21, 0], [0.21, 0.05], [0.08, 0.08], [0.05, 0.14], [0, 0.14]], 18); f_band(x, y, h); });
  function f_band(x, y, h) { n.cyl('c#5a7a7a/0.4', x, y, 3.02 + h * 0.45, 3.02 + h * 0.55, 0.204, 0.204, 18); }
  // In the sink: a colander of just-washed apples and greens; soap and brush; a dish rack
  bowl(n, 5.9, 1.25, 2.2, 0.45, 0.32, CHROME, 22); for (let i = 0; i < 4; i++) fruit(n, 'apple', 5.75 + (i % 2) * 0.28, 1.15 + Math.floor(i / 2) * 0.22, 2.36);
  leaves(n, 6.0, 1.3, 2.45, { n: 8, len: 0.35, w: 0.09, up: 0.4, out: 0.9, droop: 0.4, col: ['c#6b8a3a/0.6'] });
  ves(n, 'c#e8e2d4/0.25', 7.62, 0.6, 3.02, [[0, 0], [0.09, 0], [0.09, 0.38], [0.05, 0.45], [0.02, 0.5], [0, 0.5]], 12); f_cap(7.62, 0.6);
  function f_cap(x, y) { n.cyl(BRASS, x, y, 3.52, 3.6, 0.025, 0.025, 8); }
  n.soft('c#b08a5a/0.7', 7.55, 7.85, 0.85, 1.0, 3.02, 3.1, 0.03); n.box('c#d9c28a/0.9', 7.57, 7.83, 0.86, 0.99, 2.98, 3.03);
  { const a = 8.0, b = 9.4, y0 = 0.55, y1 = 1.75;                         // wire rack, plates on edge, glasses upside down
    n.box('c#2b2724/0.5/0.6', a, b, y0, y1, 3.02, 3.06); for (const x of [a, b]) n.box('c#c9ccd0/0.3/1', x - 0.02, x + 0.02, y0, y1, 3.06, 3.35);
    for (let i = 0; i < 6; i++) { const g = new THREE.CylinderGeometry(0.34, 0.34, 0.02, 20); g.rotateZ(Math.PI / 2); g.translate(a + 0.2 + i * 0.12, 0.95, 3.4); put(n, g, i % 2 ? PORC : 'c#c9d6d8/0.25'); }
    for (let i = 0; i < 3; i++) ves(n, GLASSY, a + 0.3 + i * 0.4, 1.5, 3.06, [[0, 0.42], [0.1, 0.42], [0.085, 0], [0.09, 0], [0.105, 0.42]], 12);
    hcyl(n, 'c#d9c28a/0.9', 'x', b - 0.25, 1.5, 3.12, 0.3, 0.05); }
  towel(n, 5.2, 5.75, 2.12, 3.0, 0.7, 'linen#e6dccb', 'c#a8261c/0.8');
  // A little lamp in the corner under the shelves is too tall; warm light comes from under the shelves and the hood.

  // ========================================================================================
  // South wall: the bin corner, the fridge, the flue (pot rail, clock), the range and hood
  // ========================================================================================
  // The corner by the pantry door: the kitchen bin and a step-on compost caddy
  { const cc = fr(31.0, 24.2, F1, 3);
    ves(cc, 'c#e8e2d4/0.3', 0.7, 0.5, 0, [[0, 0], [0.38, 0], [0.4, 1.7], [0.42, 1.72], [0, 1.72]], 20); ves(cc, CHROME, 0.7, 0.5, 1.72, [[0, 0], [0.42, 0], [0.4, 0.06], [0.1, 0.1], [0, 0.1]], 20);
    cc.box(CHROME, 0.6, 0.8, 0.85, 1.0, 0.04, 0.08);
    ves(cc, 'c#5a7a5a/0.5', -0.2, 0.4, 0, [[0, 0], [0.22, 0], [0.24, 0.62], [0.25, 0.66], [0, 0.66]], 16); cc.block(0.25, 1.15, 0.05, 0.95, 0, 1.75); }

  // The fridge: cream, rounded, a real door onto lit, stocked shelves
  {
    const fz = fr(31.0, 26.47, F1, 3);                    // x -1.15..1.15 = Y 27.62..25.32, y out to X 33.2
    fz.soft(CREAMF, -1.15, 1.15, 0.0, 0.25, 0, 5.75, 0.08); fz.soft(CREAMF, -1.15, -0.98, 0, 2.2, 0, 5.75, 0.07); fz.soft(CREAMF, 0.98, 1.15, 0, 2.2, 0, 5.75, 0.07);
    fz.soft(CREAMF, -1.15, 1.15, 0, 2.2, 5.42, 5.75, 0.12); fz.box(CREAMF, -0.99, 0.99, 0.05, 2.2, 0.0, 0.42); fz.box(DARK, -0.85, 0.85, 2.2, 2.215, 0.08, 0.32);
    for (let i = 0; i < 7; i++) fz.box('c#8a8478/0.5', -0.8, 0.8, 2.214, 2.218, 0.11 + i * 0.03, 0.125 + i * 0.03);
    const LINER = 'c#f2efe8/0.3';
    fz.box('e#fff1d0/0.5', -0.98, 0.98, 0.25, 0.27, 0.42, 5.42); fz.box(LINER, -0.98, -0.95, 0.27, 2.2, 0.42, 5.42); fz.box(LINER, 0.95, 0.98, 0.27, 2.2, 0.42, 5.42);
    fz.box(LINER, -0.98, 0.98, 0.25, 2.2, 0.42, 0.46); fz.box(LINER, -0.98, 0.98, 0.25, 2.2, 5.38, 5.42); fz.box('e#fff1d0/2', -0.25, 0.25, 1.75, 1.95, 5.33, 5.38);
    for (const z of [1.55, 2.6, 3.6, 4.55]) { fz.box('c#dfe8e8/0.08', -0.95, 0.95, 0.27, 2.12, z - 0.025, z); fz.box('c#c9ccd0/0.3/1', -0.95, 0.95, 2.1, 2.14, z - 0.05, z); }
    if (!location.search.includes('fridgeopen')) hingedDoor(fz, -1.15, 1.15, 2.33, 0.05, 5.7, { hinge: 'left', mat: CREAMF, handle: CHROME, label: 'fridge', thick: 0.24, swing: 1.5 });
    fz.block(-1.15, 1.15, 0, 2.45, 0, 5.75);
    // Crispers: lettuce, lemons, carrots
    for (const [a, b] of [[-0.92, -0.02], [0.02, 0.92]]) { fz.box(GLASSY, a, b, 0.3, 2.08, 0.47, 1.4); fz.box('c#dfe8e8/0.1', a + 0.005, b - 0.005, 1.98, 2.09, 1.3, 1.41); }
    ball(fz, 'c#7fa04a/0.7', -0.5, 1.2, 0.47, 0.3, 10, 0.8); ball(fz, 'c#5d8a3a/0.7', -0.62, 0.65, 0.47, 0.22, 8, 0.8);
    for (let i = 0; i < 4; i++) fruit(fz, i % 2 ? 'lime' : 'lemon', 0.25 + (i % 2) * 0.3, 1.5 + Math.floor(i / 2) * 0.28, 0.47);
    for (let i = 0; i < 4; i++) hcyl(fz, 'c#d9772a/0.7', 'y', 0.35 + i * 0.12, 0.85, 0.55, 0.7, 0.035, 0.012, 7);
    // Shelf 1: Martinelli's, milk, eggs, butter
    { const ax = -0.65, ay = 1.6, z = 1.55; ves(fz, 'c#d9a33a/0.15', ax, ay, z, [[0, 0], [0.17, 0.01], [0.24, 0.25], [0.23, 0.45], [0.14, 0.6], [0.05, 0.68], [0.045, 0.82], [0, 0.82]], 16); fz.cyl('c#c8a24a/0.3/1', ax, ay, z + 0.78, z + 0.86, 0.055, 0.055, 10);
      sign(fz, ax, ay + 0.245, z + 0.33, 0.3, 0.22, ART.martinelli, { cw: 160, ch: 120 }); }
    pack(fz, -0.05, 1.5, 1.55, 0.36, 0.36, 0.78, 'c#f7f5ef/0.5', ART.milk, { cw: 128, ch: 256 }); fz.box('c#f7f5ef/0.5', -0.23, 0.13, 1.32, 1.68, 2.33, 2.45, { rot: [0, 0, 0] });
    fz.box('c#cdb38a/0.95', 0.25, 0.9, 1.35, 1.75, 1.55, 1.75); for (let i = 0; i < 6; i++) ball(fz, 'c#efe2c8/0.6', 0.33 + (i % 3) * 0.21, 1.45 + Math.floor(i / 3) * 0.2, 1.7, 0.07, 8, 1.25);
    fz.box(GLASSY, 0.3, 0.85, 0.5, 0.9, 1.55, 1.75); fz.box('c#f3df8a/0.4', 0.4, 0.75, 0.6, 0.8, 1.56, 1.66);
    // Shelf 2: her snacks — string cheese, pepperoni, hummus, yogurt, berries
    pack(fz, -0.58, 1.55, 2.6, 0.62, 0.12, 0.62, 'c#f2f6fb/0.4', ART.stringCheese, { cw: 192, ch: 192 });
    pack(fz, 0.08, 1.7, 2.6, 0.5, 0.08, 0.6, 'c#b71c1c/0.4', ART.pepperoni, { cw: 160, ch: 192 });
    ves(fz, 'c#f3e8cc/0.4', 0.62, 1.6, 2.6, [[0, 0], [0.2, 0], [0.24, 0.24], [0, 0.24]], 16); fz.cyl('c#c8102e/0.4', 0.62, 1.6, 2.84, 2.87, 0.25, 0.25, 16);
    sign(fz, 0.62, 1.84, 2.72, 0.24, 0.14, ART.hummus, { cw: 128, ch: 80 });
    for (let i = 0; i < 3; i++) ves(fz, 'c#ffffff/0.4', -0.1 + i * 0.22, 0.85, 2.6, [[0, 0], [0.08, 0], [0.1, 0.22], [0, 0.22]], 12);
    sign(fz, 0.12, 0.96, 2.72, 0.2, 0.13, ART.yogurt, { cw: 128, ch: 80 });
    ves(fz, 'c#dfe8e8/0.1', -0.55, 0.75, 2.6, [[0, 0], [0.3, 0], [0.3, 0.2], [0, 0.2]], 4); for (let i = 0; i < 10; i++) ball(fz, i % 3 ? 'c#b8261c/0.5' : 'c#2a2a5a/0.4', -0.55 + Math.cos(i * 2.4) * 0.17, 0.75 + Math.sin(i * 2.4) * 0.17, 2.65, 0.05, 6);
    // Shelf 3: a lemon tart under foil, prosecco, leftovers
    ves(fz, 'c#d9cdb2/0.5', -0.4, 1.3, 3.6, [[0, 0], [0.45, 0], [0.47, 0.12], [0.42, 0.12], [0, 0.08]], 20); ves(fz, 'c#f3d96a/0.5', -0.4, 1.3, 3.6, [[0, 0.06], [0.42, 0.06], [0.42, 0.1], [0, 0.11]], 20);
    bottle(fz, 0.55, 0.9, 3.6, { r: 0.13, h: 0.85, col: 'c#1f3a24/0.15', cap: 'c#d9b35a/0.3/1', label: 'c#efe6cc/0.5' });
    fz.box(GLASSY, 0.15, 0.85, 1.4, 1.95, 3.6, 3.82); fz.box('c#c9784a/0.7', 0.2, 0.8, 1.45, 1.9, 3.61, 3.74); fz.box('c#3a6a8a/0.4', 0.15, 0.85, 1.4, 1.95, 3.82, 3.85);
    // Top shelf: jars — pickles, jam, mustard, fish sauce, condensed milk
    jar(fz, -0.7, 1.6, 4.55, 0.13, 0.42, 'c#7a8a3a/0.6', 0.85, 'c#c8a24a/0.3/1'); jar(fz, -0.35, 1.7, 4.55, 0.1, 0.28, 'c#8a1c2a/0.5', 0.85, 'c#e8e2d4/0.4');
    jar(fz, -0.05, 1.65, 4.55, 0.09, 0.26, 'c#c99a2a/0.5', 0.85, BLACK); bottle(fz, 0.3, 1.5, 4.55, { r: 0.08, h: 0.7, col: 'c#8a4a1a/0.15', cap: 'c#c8202a/0.4', label: 'c#efe6cc/0.5', neck: 0.025 });
    bottle(fz, 0.6, 1.6, 4.55, { r: 0.07, h: 0.55, col: 'c#c8202a/0.4', cap: 'c#2a7a3a/0.4', neck: 0.03 });
  }
  // Magnets and the list on the fridge's open side
  { const fs = fr(32.15, 25.32, F1, 2);                  // x → -X, y → -Y (out from the fridge side)
    sign(fs, -0.25, 0.006, 4.4, 0.5, 0.75, ART.list, { cw: 200, ch: 300 }); sign(fs, 0.45, 0.006, 4.65, 0.36, 0.42, photoDraw(7, ART.polaroid), { cw: 180, ch: 210 });
    sign(fs, 0.35, 0.006, 3.55, 0.55, 0.36, ART.postcard, { cw: 176, ch: 112 }); sign(fs, -0.3, 0.006, 3.3, 0.5, 0.62, ART.menu, { cw: 160, ch: 200 });
    for (const [x, z, c] of [[-0.25, 4.75, 'c#c8202a/0.4'], [0.45, 4.85, 'c#f3c43a/0.4'], [0.15, 3.7, 'c#2a63b8/0.4'], [-0.3, 3.6, 'c#3a8a5a/0.4'], [0.75, 3.95, 'c#e88aa8/0.4'], [-0.75, 4.1, 'c#f08a2a/0.4']])
      fs.soft(c, x - 0.05, x + 0.05, 0.0, 0.035, z - 0.05, z + 0.05, 0.02); }

  // Brick flue: brass pot rail with copper pans, and the kitchen clock above
  { const pr = fr(33.0, 28.7, F1, 3);                    // x → -Y (Y 29.55..27.85), y → +X
    pr.box(BRASS, -0.86, -0.8, 0, 0.26, 5.56, 5.64); pr.box(BRASS, 0.8, 0.86, 0, 0.26, 5.56, 5.64); hcyl(pr, BRASS, 'x', 0, 0.24, 5.6, 1.72, 0.025);
    const hang = (x, zt, body) => { tube(pr, 'c#2b2724/0.55/0.7', [[x, 0.24, 5.62], [x + 0.03, 0.28, 5.57], [x, 0.26, 5.5], [x, 0.24, zt]], 0.01, 4); body(); };
    // copper saucepan, opening to the room
    hang(-0.55, 5.35, () => { const g = lathe([[0, 0], [0.27, 0], [0.28, 0.32], [0.3, 0.34], [0.27, 0.34], [0.26, 0.03], [0, 0.03]], { seg: 20 }); g.rotateX(-Math.PI / 2); g.translate(-0.55, 0.08, 4.72); put(pr, g, COPPER); tube(pr, BRASS, [[-0.55, 0.12, 5.0], [-0.55, 0.13, 5.38]], 0.03, 6); });
    hang(0.05, 5.2, () => { const g = lathe([[0, 0], [0.36, 0], [0.4, 0.12], [0.37, 0.12], [0.34, 0.025], [0, 0.025]], { seg: 22 }); g.rotateX(-Math.PI / 2); g.translate(0.05, 0.08, 4.62); put(pr, g, 'c#2b2724/0.5/0.6'); tube(pr, 'c#2b2724/0.5/0.6', [[0.05, 0.12, 4.98], [0.05, 0.13, 5.24]], 0.035, 6); });
    hang(0.5, 5.3, () => { tube(pr, NICKEL, [[0.5, 0.26, 5.3], [0.5, 0.28, 4.75]], 0.015, 5); const g = lathe([[0, 0], [0.12, 0.02], [0.15, 0.1], [0, 0.1]], { seg: 12 }); g.translate(0.5, 0.3, 4.6); put(pr, g, NICKEL); });
    hang(0.72, 5.32, () => { for (let k = 0; k < 5; k++) { const a = k * 0.63; tube(pr, NICKEL, [[0.72, 0.26, 5.0], [0.72 + Math.cos(a) * 0.08, 0.26 + Math.sin(a) * 0.08, 4.75], [0.72, 0.26, 4.56], [0.72 - Math.cos(a) * 0.08, 0.26 - Math.sin(a) * 0.08, 4.75], [0.72, 0.26, 5.0]], 0.005, 3); } pr.cyl(BLACK, 0.72, 0.26, 5.0, 5.32, 0.025, 0.025, 8); });
    hang(-0.8, 5.35, () => { pr.box('c#b08a5a/0.7', -0.83, -0.77, 0.24, 0.27, 4.65, 5.35); ball(pr, 'c#b08a5a/0.7', -0.8, 0.255, 4.42, 0.08, 8, 1.5); });
    sign(pr, 0, 0.11, 7.0, 1.05, 1.05, ART.clock, { cw: 256, ch: 256 });
    { const g = new THREE.TorusGeometry(0.54, 0.05, 8, 32); g.rotateX(Math.PI / 2); g.translate(0, 0.07, 7.0); put(pr, g, 'c#2b2724/0.4'); }}

  // The range: white enamel, six burners, backguard shelf; a copper hood over it
  {
    const r = fr(31.0, 30.85, F1, 3), WH = 'c#ece6da/0.28';   // x -1.1..1.1 = Y 31.95..29.75, y out to X 33.2
    r.box(TILE, -1.1, 1.1, 0.004, 0.035, 3.0, 5.6);
    r.box(DARK, -1.0, 1.0, 0.2, 2.0, 0, 0.35); for (const x of [-0.95, 0.95]) for (const y of [0.3, 1.95]) r.cyl(CHROME, x, y, 0, 0.35, 0.06, 0.05, 10);
    r.soft(WH, -1.1, 1.1, 0.05, 2.2, 0.35, 2.95, 0.06); r.box('c#1d1b19/0.45', -1.08, 1.08, 0.12, 2.18, 2.95, 3.0);
    for (const x of [-0.6, 0.6]) for (const y of [0.75, 1.7]) {                         // burners and cast-iron grates
      r.cyl('c#2a2622/0.5/0.4', x, y, 3.0, 3.03, 0.22, 0.2, 16); r.cyl('c#111111/0.6', x, y, 3.03, 3.05, 0.1, 0.1, 12);
      r.box('c#191714/0.5', x - 0.42, x + 0.42, y - 0.025, y + 0.025, 3.05, 3.12); r.box('c#191714/0.5', x - 0.025, x + 0.025, y - 0.42, y + 0.42, 3.05, 3.12);
    }
    r.box('c#191714/0.5', -0.12, 0.12, 0.3, 2.1, 3.05, 3.08);
    r.soft(WH, -1.1, 1.1, 0.0, 0.32, 3.0, 3.95, 0.05); r.box(CHROME, -1.1, 1.1, 0.0, 0.38, 3.95, 3.99);  // backguard and its shelf
    sign(r, 0, 0.325, 3.5, 0.42, 0.42, ART.clock, { cw: 128, ch: 128 }); r.cyl(CHROME, -0.5, 0.33, 3.45, 3.55, 0, 0);
    r.box(WH, -1.0, 1.0, 2.2, 2.25, 0.6, 2.45); r.box('c#1a1714/0.1', -0.6, 0.6, 2.25, 2.26, 1.25, 2.0); r.box(CHROME, -0.62, 0.62, 2.25, 2.262, 1.23, 1.26); r.box(CHROME, -0.62, 0.62, 2.25, 2.262, 1.99, 2.02);
    hcyl(r, CHROME, 'x', 0, 2.38, 2.32, 1.6, 0.03); for (const x of [-0.75, 0.75]) r.box(CHROME, x - 0.03, x + 0.03, 2.22, 2.4, 2.29, 2.35);
    r.box(WH, -1.0, 1.0, 2.2, 2.25, 0.4, 0.56); r.box(CHROME, -0.3, 0.3, 2.25, 2.29, 0.46, 0.5);
    for (let i = 0; i < 6; i++) { const x = -0.85 + i * 0.34; hcyl(r, BLACK, 'y', x, 2.28, 2.75, 0.1, 0.07, 0.065, 12); r.box(CHROME, x - 0.012, x + 0.012, 2.33, 2.35, 2.72, 2.82); }
    towel(r, -0.55, -0.1, 2.41, 2.34, 0.75, 'linen#e6dccb', 'c#2a4a7a/0.8');
    r.block(-1.1, 1.1, 0, 2.2, 0, 3);
    // On the shelf: salt, pepper mill, spices, matches
    ves(r, WALNUT, -0.85, 0.2, 3.99, [[0, 0], [0.07, 0], [0.06, 0.1], [0.05, 0.25], [0.065, 0.32], [0.03, 0.42], [0, 0.42]], 12);
    ves(r, 'c#e8e2d4/0.4', -0.55, 0.2, 3.99, [[0, 0], [0.12, 0], [0.13, 0.14], [0, 0.14]], 14);
    for (let i = 0; i < 5; i++) jar(r, -0.2 + i * 0.2, 0.2, 3.99, 0.06, 0.2, pick(['c#a8401a/0.9', 'c#c9952a/0.9', 'c#5a6a2a/0.9', 'c#8a2a1a/0.9', 'c#d9c08a/0.9']), 0.8, BLACK);
    r.box('c#c8202a/0.6', 0.8, 1.0, 0.12, 0.25, 3.99, 4.06);
    // On the burners: stock simmering, onions in the skillet, the kettle, a copper pan with a spoon
    ves(r, STEEL, -0.6, 0.75, 3.12, [[0, 0], [0.4, 0], [0.42, 0.72], [0.4, 0.72], [0.38, 0.05], [0, 0.05]], 22); r.cyl('c#b98a4a/0.3', -0.6, 0.75, 3.6, 3.62, 0.38, 0.38, 20);
    hcyl(r, STEEL, 'x', -0.6, 0.75, 3.7, 0.98, 0.02); { const [a, b] = kit.world(r, -0.6, 0.75); steam.push({ x: a, y: F1 + 3.85, z: b }); }
    ves(r, 'c#1d1b19/0.5/0.5', -0.6, 1.7, 3.12, [[0, 0], [0.36, 0], [0.4, 0.14], [0.37, 0.14], [0.34, 0.03], [0, 0.03]], 20); tube(r, 'c#1d1b19/0.5/0.5', [[-0.6, 2.06, 3.22], [-0.6, 2.5, 3.3], [-0.6, 2.7, 3.33]], 0.035, 6);
    for (let i = 0; i < 16; i++) ball(r, i % 4 ? 'c#d9b56a/0.6' : 'c#a86a2a/0.6', -0.6 + Math.cos(i * 2.4) * 0.25 * Math.sqrt(i / 16), 1.7 + Math.sin(i * 2.4) * 0.25 * Math.sqrt(i / 16), 3.15, 0.04, 5, 0.6);
    tube(r, 'c#b08a5a/0.7', [[-0.45, 1.65, 3.17], [-0.2, 1.95, 3.45]], 0.02, 5); ball(r, 'c#b08a5a/0.7', -0.48, 1.62, 3.14, 0.06, 6, 0.6);
    ves(r, 'c#2f5d6b/0.35', 0.6, 1.7, 3.12, [[0, 0], [0.3, 0], [0.36, 0.2], [0.33, 0.42], [0.2, 0.52], [0.06, 0.55], [0.07, 0.6], [0, 0.62]], 18);
    tube(r, 'c#2f5d6b/0.35', [[0.6, 1.98, 3.3], [0.6, 2.2, 3.55], [0.6, 2.28, 3.62]], 0.04, 6); tube(r, BLACK, [[0.6, 1.5, 3.6], [0.6, 1.62, 3.88], [0.6, 1.82, 3.88], [0.6, 1.92, 3.62]], 0.025, 6);
    ves(r, COPPER, 0.6, 0.75, 3.12, [[0, 0], [0.28, 0], [0.29, 0.32], [0.27, 0.32], [0.26, 0.03], [0, 0.03]], 18); tube(r, BRASS, [[0.88, 0.75, 3.4], [1.05, 0.75, 3.45]], 0.025, 6);   // the handle stops short of the flue
    tube(r, 'c#b08a5a/0.7', [[0.55, 0.7, 3.2], [0.45, 0.62, 3.75]], 0.02, 5);
    // Copper hood
    const rows = [[1.1, 1.13, 5.6], [1.1, 1.13, 5.95], [0.98, 1.0, 6.25], [0.52, 0.55, 7.55], [0.48, 0.5, 8.18]];
    put(r, loft(rows.map(([a, b, z]) => ({ a, b, z, y: b + 0.03 })), { seg: 28, e: 5 }), COPPER);
    r.box('c#2b2724/0.6', -1.05, 1.05, 0.06, 2.2, 5.6, 5.64); r.box('e#ffcf8a/3', -0.7, -0.5, 1.2, 1.4, 5.585, 5.6); r.box('e#ffcf8a/3', 0.5, 0.7, 1.2, 1.4, 5.585, 5.6);
    hcyl(r, BRASS, 'x', 0, 2.27, 5.62, 2.24, 0.035); r.box(BRASS, -1.12, 1.12, 0.05, 2.27, 5.92, 5.98);
    lampAt(r, 0, 1.3, 5.3, 0.4);
  }

  // ========================================================================================
  // East wall: the tall pantry cupboard, and the sideboard set for guests under the Milkmaid
  // ========================================================================================
  {
    const pc = fr(37.55, 22.9, F1, 0), D = 1.6, H = 7.3;       // x -0.95..0.95 = X 36.6..38.5, off the picture rail and the opening's head casing
    pc.box(SAGEP, -0.95, -0.88, 0, D, 0, H); pc.box(SAGEP, 0.88, 0.95, 0, D, 0, H); pc.box(SAGEP, -0.95, 0.95, 0, 0.05, 0, H);
    pc.box(SAGEP, -1.0, 1.0, 0, D + 0.06, H, H + 0.12); pc.box('c#2c2520/0.6', -0.88, 0.88, 0.1, D - 0.15, 0, 0.32); pc.box(SAGEP, -0.88, 0.88, 0.05, D, 0.32, 0.4);
    const shelves = [0.4, 1.55, 2.7, 3.85, 5.0, 6.15];
    for (const z of shelves.slice(1)) pc.box(HONEY, -0.88, 0.88, 0.05, D - 0.08, z - 0.06, z, G);
    pc.box(SAGEP, -0.88, 0.88, 0.05, D - 0.05, H - 0.1, H);
    hingedDoor(pc, -0.95, 0, D + 0.04, 0.35, H - 0.05, { hinge: 'left', mat: SAGEP, label: 'pantry cupboard' });
    hingedDoor(pc, 0, 0.95, D + 0.04, 0.35, H - 0.05, { hinge: 'right', mat: SAGEP, label: 'pantry cupboard' });
    pc.block(-0.95, 0.95, 0, D + 0.1, 0, H);
    // potatoes and onions in baskets; tins; jars of grains; cereal; oils; baking things
    for (const [x, kind] of [[-0.45, 'potato'], [0.45, 'onion']]) { pc.box('wicker', x - 0.38, x + 0.38, 0.2, 1.3, 0.4, 0.43); for (const s of [-1, 1]) pc.box('wicker', x + s * 0.38 - 0.03, x + s * 0.38 + 0.03, 0.2, 1.3, 0.4, 0.85); pc.box('wicker', x - 0.38, x + 0.38, 1.27, 1.3, 0.4, 0.85); pc.box('wicker', x - 0.38, x + 0.38, 0.2, 0.23, 0.4, 0.85);
      for (let i = 0; i < 7; i++) fruit(pc, kind, x - 0.2 + (i % 3) * 0.2, 0.45 + Math.floor(i / 3) * 0.3, 0.43 + (i > 3 ? 0.12 : 0)); }
    for (let i = 0; i < 6; i++) tin(pc, -0.7 + (i % 3) * 0.26, 0.6 + Math.floor(i / 3) * 0.5, 1.55, 0.12, 0.38, pick(['c#c8202a/0.5', 'c#e8d8b0/0.5', 'c#2a6a3a/0.5']), 'c#f3e8cc/0.5');
    for (let i = 0; i < 3; i++) jar(pc, 0.15 + i * 0.25, 0.8, 1.55, 0.11, 0.55, pick(['c#e8dcb8/0.9', 'c#c9a46a/0.9', 'c#8a5a3a/0.9', 'c#d9c9a0/0.9']), 0.85);
    pack(pc, -0.4, 0.8, 2.7, 0.8, 0.3, 1.05, 'c#f2c12e/0.5', ART.joesOs, { cw: 160, ch: 210 });
    jar(pc, 0.35, 0.8, 2.7, 0.18, 0.75, 'c#d9c9a0/0.9', 0.8, HONEY); jar(pc, 0.72, 0.9, 2.7, 0.12, 0.55, 'c#e8e2d4/0.9', 0.75, HONEY);
    pack(pc, -0.45, 0.8, 3.85, 0.62, 0.42, 0.95, 'c#f7f4ec/0.8', ART.flour, { cw: 140, ch: 214 });
    jar(pc, 0.15, 0.8, 3.85, 0.14, 0.5, 'c#3a2010/0.9', 0.85); jar(pc, 0.5, 0.85, 3.85, 0.12, 0.42, 'c#e3b55a/0.4', 0.9, 'c#e8e2d4/0.4');
    for (let i = 0; i < 4; i++) bottle(pc, -0.65 + i * 0.32, 0.8, 5.0, { r: 0.1, h: 0.85 + (i % 2) * 0.15, col: pick(['c#3a5a2a/0.15', 'c#6a4a1a/0.15', 'c#8a2a2a/0.2', 'c#c9b04a/0.15']), cap: pick([BLACK, BRASS, 'c#e8e2d4/0.4']), label: pick(['c#efe6cc/0.5', 'c#2a3549/0.5']) });
    bowl(pc, 0, 0.8, 6.15, 0.6, 0.3, 'c#c9b48a/0.6'); ves(pc, PORC, 0.55, 0.8, 6.15, [[0, 0], [0.14, 0], [0.2, 0.35], [0.12, 0.5], [0.14, 0.62], [0, 0.6]], 14);
  }
  // Sideboard for guests: a tray of lemonade and glasses, pastries under a glass dome, napkins, flowers
  {
    const sb = fr(39.66, 22.8, F1, 0), W2 = 1.04, D = 1.35;
    for (const x of [-W2 + 0.04, W2 - 0.2]) for (const y of [0.05, D - 0.2]) sb.box(OAKW, x, x + 0.16, y, y + 0.16, 0, 2.85, G);
    sb.box(OAKW, -W2 + 0.04, W2 - 0.04, 0.05, D - 0.05, 0.6, 2.85); sb.box(OAKW, -W2 - 0.03, W2 + 0.03, 0.02, D + 0.04, 2.85, 2.97, G);
    for (const [a, b] of [[-W2 + 0.2, -0.01], [0.01, W2 - 0.2]]) { sb.box(OAKW, a, b, D - 0.05, D - 0.01, 0.75, 2.15); sb.box(OAKW, a + 0.12, b - 0.12, D - 0.01, D + 0.02, 0.87, 2.03); sb.box(OAKW, a, b, D - 0.05, D - 0.01, 2.22, 2.75); }
    for (const x of [-0.55, 0.55]) { sb.box('c#2b2724/0.55/0.7', x - 0.12, x + 0.12, D + 0.02, D + 0.06, 2.46, 2.5); sb.box('c#2b2724/0.55/0.7', x - 0.03, x + 0.03, D + 0.02, D + 0.06, 1.35, 1.6); }
    sb.block(-W2, W2, 0, D, 0, 3);
    const z = 2.97;
    // brass tray, a glass pitcher of lemonade, four glasses, a lemon
    ves(sb, BRASS, -0.42, 0.75, z, [[0, 0], [0.5, 0], [0.52, 0.05], [0.5, 0.05], [0, 0.015]], 28);
    ves(sb, GLASSY, -0.55, 0.62, z + 0.015, [[0, 0], [0.18, 0], [0.2, 0.3], [0.17, 0.62], [0.16, 0.7], [0.2, 0.74], [0.15, 0.74], [0, 0.7]], 18);
    ves(sb, 'c#efd76a/0.15', -0.55, 0.62, z + 0.03, [[0, 0], [0.17, 0], [0.185, 0.3], [0.16, 0.5], [0, 0.5]], 16);
    tube(sb, GLASSY, [[-0.37, 0.62, z + 0.62], [-0.28, 0.62, z + 0.5], [-0.3, 0.62, z + 0.25], [-0.37, 0.62, z + 0.18]], 0.025, 6);
    for (let i = 0; i < 3; i++) { const g = new THREE.CylinderGeometry(0.12, 0.12, 0.012, 14); g.rotateZ(Math.PI / 2 * 0.3); g.translate(-0.55 + (i - 1) * 0.06, 0.62, z + 0.2 + i * 0.1); put(sb, g, 'c#f3e27a/0.5'); }
    for (const [x, y] of [[-0.15, 0.55], [-0.12, 0.92], [-0.45, 1.05], [-0.75, 0.85]]) glass(sb, x, y, z + 0.015, 0.1, 0.36, null);
    fruit(sb, 'lemon', -0.3, 0.38, z + 0.015);
    // the cake stand and dome: jam tarts, a croissant, a hand pie
    ves(sb, PORC, 0.45, 0.65, z, [[0, 0], [0.18, 0], [0.08, 0.05], [0.06, 0.3], [0.1, 0.33], [0.45, 0.35], [0.46, 0.38], [0, 0.37]], 24);
    for (const [x, y] of [[0.28, 0.6], [0.55, 0.82], [0.68, 0.55]]) { ves(sb, 'c#d9a85a/0.8', x, y, z + 0.38, [[0, 0], [0.11, 0], [0.12, 0.05], [0.1, 0.06], [0, 0.04]], 14); sb.cyl('c#a8201c/0.25', x, y, z + 0.43, z + 0.445, 0.075, 0.075, 12); } model('croissant', sb, 0.42, 0.42, z + 0.38, 0, { turn: 0.4 });
    ves(sb, GLASSY, 0.45, 0.65, z + 0.37, [[0.42, 0], [0.43, 0.2], [0.38, 0.45], [0.22, 0.6], [0.05, 0.65], [0.04, 0.72], [0.06, 0.74], [0, 0.76]], 24);
    // folded napkins, small plates, forks; a posy of ranunculus
    for (let k = 0; k < 5; k++) plate(sb, 0.62, 1.12, z + k * 0.03, 0.24, 'c#e8e2d4/0.25');
    for (let k = 0; k < 4; k++) sb.soft(pick(['linen#e6dccb', 'linen#e6dccb', 'linen#e6dccb']), 0.95 - 0.2, 0.95 + 0.05, 0.85, 1.15, z + k * 0.035, z + k * 0.035 + 0.03, 0.01);
    for (let i = 0; i < 4; i++) sb.box(NICKEL, 0.2 + i * 0.05, 0.23 + i * 0.05, 1.05, 1.25, z, z + 0.01);
    kit.posy(sb, 0.85, 0.35, z, ['c#e8907a/0.7', 'c#f3c4b0/0.7', 'c#e8d07a/0.7']);
  }
  picture(fr(39.66, 22.8, F1, 0), 'milkmaid', 0, 5.4, 1.9, 2.13, { border: 0.12 });

  // ========================================================================================
  // The work table, mid-bake
  // ========================================================================================
  {
    const t = fr(37.05, 28.9, F1, 0), W2 = 1.2, D2 = 2.0, z = 3.05;   // X 35.85..38.25, Y 26.9..30.9
    t.box(BUTCHER, -W2, W2, -D2, D2, z - 0.2, z, G);
    t.box(OAKW, -W2 + 0.12, W2 - 0.12, -D2 + 0.12, D2 - 0.12, z - 0.5, z - 0.2, G);
    for (const x of [-W2 + 0.08, W2 - 0.3]) for (const y of [-D2 + 0.08, D2 - 0.3]) t.box(OAKW, x, x + 0.22, y, y + 0.22, 0, z - 0.2, G);
    t.box(OAKW, -W2 + 0.1, W2 - 0.1, -D2 + 0.1, D2 - 0.1, 0.5, 0.58, G);
    t.block(-W2, W2, -D2, D2, 0, z);
    // underneath: nested bowls, the dutch oven, a basket of onions, sheet pans
    for (let k = 0; k < 3; k++) bowl(t, -0.65, -1.2, 0.58 + k * 0.06, 0.42 - k * 0.08, 0.3 - k * 0.04, ['c#e8e2d4/0.3', 'c#c9d6d8/0.3', 'c#d9a88a/0.3'][k]);
    ves(t, 'c#8a1c1c/0.3', 0.55, -1.1, 0.58, [[0, 0], [0.3, 0], [0.34, 0.08], [0.34, 0.36], [0.3, 0.38], [0, 0.38]], 20); ves(t, 'c#8a1c1c/0.3', 0.55, -1.1, 0.96, [[0, 0], [0.33, 0], [0.3, 0.06], [0.06, 0.1], [0.05, 0.15], [0, 0.15]], 20); hcyl(t, 'c#8a1c1c/0.3', 'x', 0.55, -1.1, 0.88, 0.85, 0.035);
    t.box('wicker', -0.95, 0.15, 0.4, 1.4, 0.58, 0.62); for (let i = 0; i < 6; i++) fruit(t, i % 2 ? 'onion' : 'potato', -0.75 + (i % 3) * 0.35, 0.65 + Math.floor(i / 3) * 0.4, 0.62);
    for (let k = 0; k < 3; k++) t.box('c#9a9590/0.35/0.8', 0.35, 1.15, 0.5, 1.75, 0.58 + k * 0.04, 0.6 + k * 0.04);
    // the red stand mixer, facing the sink
    { const m = t.sub(0.5, -1.35, z, 3), RED = 'c#b3262b/0.22';
      m.soft(RED, -0.34, 0.34, -0.55, 0.5, 0, 0.13, 0.06); put(m, loft([{ a: 0.2, b: 0.17, z: 0.1, y: -0.38 }, { a: 0.17, b: 0.14, z: 0.5, y: -0.4 }, { a: 0.15, b: 0.13, z: 0.85, y: -0.42 }, { a: 0.17, b: 0.15, z: 1.0, y: -0.42 }], { seg: 20, e: 2.6 }), RED);
      const head = lathe([[0, 0], [0.18, 0.02], [0.22, 0.15], [0.21, 0.7], [0.18, 0.9], [0.1, 1.0], [0, 1.02]], { seg: 20 }); head.rotateX(-Math.PI / 2); head.translate(0, -0.6, 1.1); put(m, head, RED);
      hcyl(m, CHROME, 'y', 0, 0.43, 1.1, 0.05, 0.08);
      ves(m, 'c#d8d8d4/0.3/0.6', 0, 0.18, 0.14, [[0, 0], [0.16, 0], [0.28, 0.2], [0.32, 0.52], [0.34, 0.56], [0.31, 0.56], [0.29, 0.5], [0.25, 0.2], [0.14, 0.04], [0, 0.04]], 22);
      ves(m, 'c#efe2c0/0.8', 0, 0.18, 0.2, [[0, 0], [0.24, 0.05], [0.27, 0.2], [0.18, 0.32], [0, 0.34]], 16);
      m.cyl(CHROME, 0, 0.18, 0.5, 0.92, 0.025, 0.025, 8); m.box(CHROME, -0.1, 0.1, 0.16, 0.2, 0.42, 0.6);
      hcyl(m, CHROME, 'x', 0.26, -0.3, 1.0, 0.1, 0.05); m.box(CHROME, -0.38, 0.38, 0.3, 0.42, 0.14, 0.18); }
    // flour, a round of pastry, the rolling pin
    bowl(t, -0.62, -1.15, z, 0.38, 0.28, 'c#e8e2d4/0.3'); ves(t, 'c#f3ede0/0.95', -0.62, -1.15, z + 0.04, [[0, 0.12], [0.3, 0.18], [0.33, 0.22], [0, 0.28]], 14);
    t.cyl('c#f6f1e4/0.95', 0.05, -0.55, z, z + 0.005, 0.6, 0.6, 24); ves(t, 'c#e9d6a8/0.9', 0.05, -0.55, z + 0.005, [[0, 0], [0.42, 0], [0.44, 0.02], [0.4, 0.03], [0, 0.03]], 24);
    hcyl(t, 'c#c9a77a/0.6', 'x', -0.05, -0.15, z + 0.08, 0.9, 0.08); hcyl(t, 'c#a07a4a/0.6', 'x', -0.6, -0.15, z + 0.08, 0.22, 0.04); hcyl(t, 'c#a07a4a/0.6', 'x', 0.5, -0.15, z + 0.08, 0.22, 0.04);
    // cutting board: carrots chopped, half an onion, garlic, parsley, the knife
    t.box('c#a8784a/0.6', -0.35, 0.65, 0.15, 0.75, z, z + 0.07, G);
    for (let i = 0; i < 16; i++) { const g = new THREE.CylinderGeometry(0.035, 0.035, 0.02, 9); g.rotateX(Math.PI / 2 * (i % 3 ? 1 : 0.6)); g.translate(-0.15 + (i % 6) * 0.05 + (i > 11 ? 0.05 : 0), 0.32 + Math.floor(i / 6) * 0.07, z + 0.1); put(t, g, 'c#e0782a/0.6'); }
    hcyl(t, 'c#e0782a/0.6', 'x', 0.25, 0.6, z + 0.11, 0.45, 0.045, 0.02, 9);
    ves(t, 'c#e8e0c8/0.7', 0.45, 0.3, z + 0.07, [[0, 0], [0.12, 0], [0.13, 0.05], [0.1, 0.1], [0, 0.11]], 12);
    for (let i = 0; i < 3; i++) ball(t, 'c#efe6d6/0.7', 0.2 + i * 0.07, 0.5, z + 0.07, 0.035, 6, 1.2);
    leaves(t, -0.2, 0.62, z + 0.08, { n: 10, len: 0.3, w: 0.035, up: 0.15, out: 1, droop: 0.1, col: ['c#4a7a3a/0.7'], spread: 0.02 });
    t.box(STEEL, -0.1, 0.38, 0.12, 0.2, z + 0.07, z + 0.08); t.box(BLACK, -0.42, -0.1, 0.13, 0.19, z + 0.07, z + 0.11);
    // a tray of oils, vinegar, salt and pepper by the range side
    t.box(WALNUT, -1.15, -0.55, 0.35, 1.05, z, z + 0.04);
    bottle(t, -1.0, 0.5, z + 0.04, { r: 0.08, h: 0.8, col: 'c#4a5a1a/0.15', cap: BRASS, neck: 0.02 }); pack(t, -0.72, 0.5, z + 0.04, 0.24, 0.24, 0.55, 'c#2f4a2a/0.4', ART.oliveoil, { cw: 96, ch: 200 });
    bottle(t, -0.9, 0.85, z + 0.04, { r: 0.06, h: 0.62, col: 'c#5a1a1a/0.15', cap: 'c#e8e2d4/0.4', neck: 0.018 });
    ves(t, WALNUT, -0.68, 0.88, z + 0.04, [[0, 0], [0.06, 0], [0.05, 0.12], [0.045, 0.3], [0.06, 0.38], [0.03, 0.46], [0, 0.46]], 12);
    ves(t, 'c#e8e2d4/0.4', -1.0, 1.0, z + 0.04, [[0, 0], [0.09, 0], [0.1, 0.1], [0, 0.1]], 12);
    // bread on its board, with the bread knife
    t.box('c#9a6a3a/0.6', -1.1, -0.2, 1.3, 1.85, z, z + 0.06, G); model('st_bread_1', t, -0.62, 1.55, z + 0.06, 0, { turn: 1.4 }); t.box(STEEL, -0.95, -0.4, 1.36, 1.39, z + 0.06, z + 0.075); t.box(WALNUT, -1.2, -0.95, 1.35, 1.4, z + 0.06, z + 0.1);
    // the fruit bowl
    bowl(t, 0.62, 1.25, z, 0.5, 0.26, 'c#c9d6d8/0.25', 24);
    for (const [k, x, y, zz] of [['apple', 0.48, 1.12, 0.1], ['apple', 0.75, 1.1, 0.1], ['orange', 0.62, 1.42, 0.1], ['pear', 0.85, 1.35, 0.1], ['lemon', 0.42, 1.38, 0.12], ['apple', 0.62, 1.25, 0.3], ['orange', 0.38, 1.0, 0.16]]) fruit(t, k, x, y, z + zz);
    grapes(t, 0.9, 1.05, z + 0.18, 'c#6a2a4a/0.35');
    // the cookbook open on its stand
    t.box(WALNUT, 0.7, 1.25, 0.05, 0.12, z, z + 0.04); { const ck = t.sub(0.97, -0.05, z, 0); ck.box(WALNUT, -0.32, 0.32, 0.0, 0.03, 0.02, 0.5, { rot: [0, 0, 0] }); sign(ck, 0, 0.04, 0.3, 0.6, 0.42, ART.recipe, { cw: 256, ch: 180 }); }
  }
  // (the pine stool that stood here is gone: it was in the way of walking round the kitchen)
  rug(38.5, 40.62, 25.9, 33.6, F1, 'runner');

  // ========================================================================================
  // West wall: coffee for guests under the back window, by the door to the porch
  // ========================================================================================
  {
    const w = fr(38.17, 35.0, F1, 2);                     // x → -X (x -2.555 = X 40.725, 2.57 = X 35.6), y → -Y
    run(w, -2.555, 2.57);
    w.box(TILE, 1.81, 2.57, 0.004, 0.035, 3.02, 4.2);
    const z = 3.02;
    // Chemex of coffee on a wooden trivet, cups on saucers, cream and sugar, a plate of biscotti
    w.cyl(WALNUT, -1.2, 0.85, z, z + 0.04, 0.3, 0.3, 18);
    ves(w, GLASSY, -1.2, 0.85, z + 0.04, [[0, 0], [0.2, 0.02], [0.26, 0.2], [0.24, 0.38], [0.08, 0.62], [0.08, 0.68], [0.2, 0.95], [0.24, 1.2], [0.23, 1.22], [0, 1.0]], 20);
    ves(w, 'c#3a2010/0.15', -1.2, 0.85, z + 0.06, [[0, 0], [0.19, 0.02], [0.245, 0.2], [0.22, 0.32], [0, 0.32]], 18);
    ves(w, 'c#b08a5a/0.7', -1.2, 0.85, z + 0.6, [[0.1, 0], [0.14, 0.05], [0.18, 0.2], [0.16, 0.22], [0.1, 0.06]], 18); w.box('c#6a4a2a/0.8', -1.36, -1.3, 0.82, 0.88, z + 0.62, z + 0.72);
    for (let i = 0; i < 4; i++) cupSaucer(w, -0.6 + i * 0.4, 0.75 + (i % 2) * 0.35, z, i % 2 ? 'c#e6e0d2/0.2' : 'c#d8c9b0/0.3', i === 1);
    ves(w, PORC, 0.95, 0.6, z, [[0, 0], [0.1, 0], [0.12, 0.2], [0.1, 0.3], [0.13, 0.32], [0.09, 0.32], [0, 0.3]], 14);
    bowl(w, 1.25, 0.95, z, 0.16, 0.16, PORC); for (let i = 0; i < 6; i++) w.box('c#f3eee4/0.6', 1.2 + (i % 3) * 0.04, 1.24 + (i % 3) * 0.04, 0.9 + Math.floor(i / 3) * 0.05, 0.94 + Math.floor(i / 3) * 0.05, z + 0.13, z + 0.17);
    plate(w, 0.2, 1.45, z, 0.36, 'c#2f5a6a/0.3'); for (let i = 0; i < 6; i++) w.soft('c#d9b06a/0.8', 0.0 + i * 0.07, 0.06 + i * 0.07, 1.3 - (i % 2) * 0.05, 1.6, z + 0.04 + (i % 2) * 0.04, z + 0.1 + (i % 2) * 0.04, 0.02);
    // the lamp by the door, and the Coorte over it
    tableLamp(w, 2.15, 0.75, z, 'c#c9b48a/0.4');
    // potted things on the window sill
    potted(w, -1.4, 0.15, 3.405, { r: 0.12, h: 0.2, n: 14, len: 0.34, w: 0.06, up: 0.5, out: 0.6, droop: 0.6, pot: PORC });   // kept small: the sill is 3 in deep
    potted(w, -0.1, 0.14, 3.405, { r: 0.11, h: 0.17, n: 10, len: 0.22, w: 0.07, up: 0.5, out: 0.9, col: ['c#3a5a2a/0.7'] });
    for (let i = 0; i < 6; i++) ball(w, 'c#8a5ab0/0.6', -0.1 + Math.cos(i) * 0.08, 0.14 + Math.sin(i) * 0.08, 3.62, 0.03, 6);
    // cookbooks between brass bookends at the corner
    w.box(BRASS, -2.35, -2.3, 0.32, 0.8, z, z + 0.6); bookRow(w, -2.28, -1.6, 0.3, z, 0.9, 1); w.box(BRASS, -1.58, -1.53, 0.32, 0.8, z, z + 0.6);   // out from under the window stool
  }
  picture(fr(35.85, 35.0, F1, 2), 'coorte_strawberries', 0, 5.5, 0.9, 1.14, { border: 0.1 });
  picture(fr(31.0, 33.6, F1, 3), 'van_gogh_grapes_lemons', 0, 5.4, 1.45, 1.2, { border: 0.12 });
  rug(32.3, 34.5, 33.75, 34.92, F1, 'mat');

}
