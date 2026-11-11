// Screened back porch, off the kitchen  (X 30.8-42.83, Y 35.5-45.83; floor 1.5)
// A working porch: the mudroom corner by the kitchen door (bench, boots, hooks with the sun
// hat and the jacket), a potting bench of herbs left of the garden steps, firewood right of
// them, and a rocker with a lantern, and a lemon tree along the north screen.
// Painted floor, cream beadboard below the screens, a haint-blue ceiling, café lights.
import * as THREE from 'three';
import { BRASS, STEEL, BLACK, DARK, G } from '../kit.js';
import { F1 } from '../house.js';
import { tools, ART, T, HONEY, OAKW, WALNUT, PORC, NICKEL, CLAY, LEAF } from './kitchen.js';

const TAU = Math.PI * 2;
const totePrint = (g, w, h) => { g.fillStyle = '#e3d8bf'; g.fillRect(0, 0, w, h); T(g, "TRADER JOE'S", w / 2, h * 0.42, h * 0.16, '#c8102e', { max: w * 0.88 }); T(g, 'reusable · since 1967', w / 2, h * 0.62, h * 0.08, '#2a3549', { it: 1, w: 'normal' }); };
const seeds = (g, w, h) => {
  g.fillStyle = '#9a8a6a'; g.fillRect(0, 0, w, h);
  [['Basil', '#3a7a3a', '#f3ead0'], ['Sweet Pea', '#c86a9a', '#f6efe0'], ['Tomato', '#c8302a', '#f3ead0']].forEach(([s, c, p], i) => {
    const x = w * (0.04 + i * 0.32), y = h * (0.1 + (i % 2) * 0.08); g.fillStyle = p; g.fillRect(x, y, w * 0.29, h * 0.78); g.fillStyle = c; g.fillRect(x + w * 0.02, y + h * 0.08, w * 0.25, h * 0.42);
    T(g, s, x + w * 0.145, y + h * 0.62, h * 0.1, '#2a2420', { it: 1, max: w * 0.27 }); T(g, 'SEEDS', x + w * 0.145, y + h * 0.72, h * 0.06, '#5a4a3a', { f: 'Helvetica, sans-serif' });
  });
};

export default function (kit) {
  const { model, rug, lampAt, sign, seat, candle, extras } = kit;
  const K = tools(kit, 37), fr = (...a) => K.wrap(kit.fr(...a)), { rnd, pick, put, ves, hcyl, ball, tube, fruit, leaves, potted, jar, bottle, tin, bowl } = K;
  const PH = F1 - 0.1, P0 = fr(0, 0, PH, 0);                 // P0: plain plan coordinates on the porch floor
  const CREAMP = 'painted_wood#d8d0bd', GROOVE = 'c#9a917e/0.8', IRON = 'c#2b2724/0.55/0.7';

  // ---- The shell made light: painted floor, cream beadboard, a pale blue ceiling ------------------
  P0.box('painted_wood#9aa3a0', 30.82, 42.81, 35.52, 39.72, 0, 0.015); P0.box('painted_wood#9aa3a0', 31.32, 42.81, 39.72, 45.81, 0, 0.015);
  P0.box('c#b9d3da/0.8', 30.8, 42.83, 35.5, 46.08, 7.955, 7.985);
  // A stretch of beadboard on a low wall's inside face. ax: the axis the face looks along, at: the
  // face's coordinate, d: +1/-1 into the room, u0..u1: its extent along the wall.
  const bead = (ax, at, d, u0, u1) => {
    const bx = (p0, p1, q0, q1, z0, z1, m) => ax === 'X' ? P0.box(m, Math.min(p0, p1), Math.max(p0, p1), q0, q1, z0, z1) : P0.box(m, q0, q1, Math.min(p0, p1), Math.max(p0, p1), z0, z1);
    bx(at - d * 0.03, at, u0, u1, 0.015, 2.98, CREAMP);
    for (let u = u0 + 0.33; u < u1 - 0.1; u += 0.33) bx(at, at + d * 0.006, u - 0.008, u + 0.008, 0.42, 2.9, GROOVE);
    bx(at, at + d * 0.045, u0, u1, 0.015, 0.4, CREAMP); bx(at, at + d * 0.03, u0, u1, 2.85, 2.95, CREAMP);
  };
  bead('X', 42.79, -1, 35.55, 45.79);                                       // north
  bead('X', 31.34, 1, 39.72, 45.79);                                        // south, beyond the bedroom wing
  bead('Y', 45.79, -1, 31.34, 34.83); bead('Y', 45.79, -1, 38.57, 42.79);   // west, either side of the steps
  for (const [X0, X1, Y0, Y1] of [[42.74, 43.38, 35.5, 46.38], [31.0, 31.38, 39.68, 46.38], [30.95, 35.2, 45.76, 46.38], [38.2, 43.38, 45.76, 46.38]]) P0.box(CREAMP, X0, X1, Y0, Y1, 3.0, 3.08, G);

  // ---- Café lights along the north and west screens ---------------------------------------
  { const string = (pts) => { const path = []; for (let i = 0; i + 1 < pts.length; i++) { const [a, b] = [pts[i], pts[i + 1]]; for (let k = 0; k < 8; k++) { const t = k / 8; path.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, 7.55 - 0.38 * Math.sin(Math.PI * t)]); } } path.push([...pts[pts.length - 1], 7.55]);
      tube(P0, IRON, path, 0.012, 4); path.forEach(([x, y, z], i) => { if (i % 2 === 1) { P0.cyl(IRON, x, y, z - 0.08, z, 0.02, 0.02, 6); ball(P0, 'e#ffcf8a/3', x, y, z - 0.22, 0.065, 8, 1.3); } }); };
    string([[42.55, 35.9], [42.55, 40.8], [42.55, 45.6]]); string([[42.55, 45.6], [38.4, 45.6], [35.0, 45.6], [31.6, 45.6]]); string([[31.6, 45.6], [31.6, 40.2]]); }

  // ========================================================================================
  // Mudroom corner, against the bedroom wing by the kitchen door
  // ========================================================================================
  { const sw = fr(30.8, 37.6, PH, 3);                       // x = 37.6 - Y (-1.75..1.55), y = X - 30.8
    for (const x of [-1.75, 1.48]) sw.box(OAKW, x, x + 0.07, 0.02, 1.25, 0, 1.45, G);
    sw.box(OAKW, -1.78, 1.58, 0.02, 1.28, 1.38, 1.48, G); sw.box(OAKW, -1.68, 1.48, 1.12, 1.2, 1.15, 1.38, G); sw.box(OAKW, -1.68, 1.48, 0.02, 0.1, 1.0, 1.38, G);
    sw.soft('linen#7d8b96', -1.72, 1.52, 0.05, 1.24, 1.48, 1.68, 0.08);
    for (let x = -1.6; x < 1.45; x += 0.28) sw.box('linen#e6dccb', x, x + 0.07, 1.243, 1.248, 1.52, 1.64);
    sw.soft('linen#c96f4a', 0.25, 1.25, 0.06, 0.42, 1.65, 2.6, 0.18); sw.soft('linen#d9c79a', -0.65, 0.35, 0.08, 0.4, 1.65, 2.45, 0.18);
    kit.throwBlanket(sw, -1.7, -0.95, 0.15, 1.15, 1.68, 'wool#8a9a7a');
    seat(sw, 0.2, 0.8, 1.68, 'sit on the bench'); sw.block(-1.78, 1.58, 0, 1.28, 0, 1.6);
    kit.shoes(sw, -0.9, 0.3, 0.015, 'boot', 'c#3a6a4a'); kit.shoes(sw, 0.0, 0.3, 0.015, 'boot', 'c#26364f'); kit.shoes(sw, 0.9, 0.3, 0.015, 'sneaker', 'c#e8e2d4');   // toes under the bench, out of the doorway
    // garden clogs on a boot tray at the end
    sw.box('c#2a2622/0.6', -1.75, -0.95, 1.35, 2.15, 0.015, 0.06);
    for (const [x, c] of [[-1.55, 'c#3a6a4a/0.5'], [-1.35, 'c#3a6a4a/0.5'], [-1.15, 'c#d9772a/0.5']]) { sw.soft(c, x - 0.09, x + 0.09, 1.45, 2.05, 0.06, 0.26, 0.08); sw.box('c#1a1714/0.6', x - 0.06, x + 0.06, 1.55, 1.8, 0.24, 0.27); }
    // Hooks: the sun hat, the waxed jacket, a tote with leeks and a baguette, a scarf, the umbrella
    sw.box(OAKW, -1.72, 1.52, 0.0, 0.07, 4.7, 5.05, G);
    for (const x of [-1.52, -0.5, 0.55, 1.1, 1.42]) { tube(sw, IRON, [[x, 0.06, 4.85], [x, 0.24, 4.75], [x, 0.3, 4.88]], 0.018, 5); ball(sw, IRON, x, 0.3, 4.86, 0.03, 6); }
    { const g = lathe2([[0, 0], [0.62, 0], [0.64, 0.03], [0.3, 0.06], [0.26, 0.1], [0.27, 0.32], [0.18, 0.42], [0, 0.44]]); g.scale(0.78, 0.78, 0.78); g.rotateX(-Math.PI / 2); g.translate(-1.52, 0.1, 4.45); put(sw, g, 'wicker#d8c08a');   // a smaller brim, on its own hook
      const r = lathe2([[0.275, 0], [0.285, 0], [0.285, 0.08], [0.275, 0.08]]); r.scale(0.78, 0.78, 0.78); r.rotateX(-Math.PI / 2); r.translate(-1.52, 0.155, 4.45); put(sw, r, 'c#2a3549/0.6');
      tube(sw, 'c#2a3549/0.6', [[-1.34, 0.18, 4.4], [-1.28, 0.2, 4.0], [-1.32, 0.22, 3.75]], 0.02, 4); }
    { const JK = 'c#4f5236/0.55', rows = [[0.62, 0.17, 4.78], [0.66, 0.24, 4.5], [0.6, 0.26, 3.9], [0.62, 0.27, 3.2], [0.68, 0.27, 2.7]].reverse();
      put(sw, loft2(rows.map(([a, b, z]) => ({ a, b, z, x: -0.5, y: 0.33 }))), JK);
      put(sw, loft2([{ a: 0.66, b: 0.24, z: 4.78, x: -0.5, y: 0.33 }, { a: 0.3, b: 0.12, z: 4.9, x: -0.5, y: 0.3 }]), JK);
      for (const s of [-1, 1]) tube(sw, JK, [[-0.5 + s * 0.55, 0.33, 4.6], [-0.5 + s * 0.68, 0.36, 4.0], [-0.5 + s * 0.66, 0.38, 3.2]], 0.13, 8, true);
      sw.soft('c#6a4a2a/0.8', -0.78, -0.22, 0.3, 0.62, 4.62, 4.86, 0.06);
      for (let k = 0; k < 5; k++) sw.cyl(BRASS, -0.5, 0.6, 3.0 + k * 0.38, 3.03 + k * 0.38, 0.03, 0.03, 6); }
    { const x = 0.55; tube(sw, 'linen#e6dccb', [[x - 0.3, 0.2, 3.9], [x, 0.3, 4.82], [x + 0.3, 0.2, 3.9]], 0.03, 5);
      sw.soft('linen#e6dccb', x - 0.42, x + 0.42, 0.12, 0.32, 3.0, 3.95, 0.05); sign(sw, x, 0.325, 3.5, 0.72, 0.45, totePrint, { cw: 192, ch: 120 });
      tube(sw, 'c#d9b56a/0.8', [[x - 0.15, 0.22, 3.8], [x - 0.2, 0.22, 4.5]], 0.07, 8, true); for (let i = 0; i < 2; i++) tube(sw, i ? 'c#5a7a3a/0.7' : 'c#e8e8d8/0.6', [[x + 0.12 + i * 0.08, 0.2, 3.85], [x + 0.14 + i * 0.1, 0.24, 4.35]], 0.05, 6); }
    { const x = 1.1; sw.soft('wool#a8564a', x - 0.12, x + 0.12, 0.1, 0.22, 3.3, 4.8, 0.05); sw.soft('wool#a8564a', x + 0.05, x + 0.25, 0.14, 0.26, 3.6, 4.8, 0.05); for (let i = 0; i < 5; i++) sw.box('wool#a8564a', x - 0.1 + i * 0.05, x - 0.08 + i * 0.05, 0.14, 0.18, 3.18, 3.3); }
    { const x = 1.42; tube(sw, 'c#5a3a24/0.5', [[x, 0.3, 4.9], [x + 0.12, 0.3, 4.95], [x + 0.14, 0.32, 4.82], [x + 0.02, 0.32, 4.72], [x + 0.02, 0.32, 4.5]], 0.025, 6);
      ves(sw, 'c#26364f/0.6', x + 0.02, 0.32, 2.4, [[0, 0], [0.02, 0], [0.12, 0.35], [0.1, 1.6], [0.04, 2.1], [0, 2.1]], 10); }
    // a wall lantern above the hooks
    lantern(sw, 1.05, 0.45, 5.9, 0.42, 0.7, true); sw.box(IRON, 1.02, 1.08, 0.0, 0.47, 6.92, 6.97); sw.box(IRON, 1.0, 1.1, 0.0, 0.03, 6.75, 7.05); lampAt(sw, 1.05, 0.75, 6.0, 0.8);   // hood clear of the wall
  }
  rug(32.25, 34.55, 35.6, 36.95, PH, 'mat');

  // ========================================================================================
  // Potting bench, left of the garden steps
  // ========================================================================================
  { const pb = fr(33.05, 45.83, PH, 2), WD = 'oak_light#a3825c';    // x = 33.05 - X (-1.6..1.6), y = 45.83 - Y
    for (const x of [-1.55, 1.42]) for (const y of [0.15, 1.35]) pb.box(WD, x, x + 0.13, y, y + 0.13, 0, 2.85, G);
    pb.box(WD, -1.6, 1.6, 0.1, 1.55, 2.85, 2.95, G); for (let x = -1.45; x < 1.5; x += 0.32) pb.box(WD, x, x + 0.27, 0.15, 1.45, 0.6, 0.66, G);
    for (const y of [0.15, 1.35]) pb.box(WD, -1.42, 1.42, y, y + 0.13, 0.48, 0.6, G);      // bearers under the shelf slats (they floated)
    pb.box(WD, -1.6, 1.6, 0.1, 0.17, 2.95, 3.35, G); pb.block(-1.6, 1.6, 0.1, 1.55, 0, 3);
    const z = 2.95;
    [['basil', { n: 16, len: 0.32, w: 0.06, up: 0.7, out: 0.85, col: ['c#4f7f3a/0.6'] }], ['rosemary', { n: 22, len: 0.5, w: 0.012, up: 1.0, out: 0.3, col: ['c#4a5a44/0.8'] }],
     ['mint', { n: 18, len: 0.28, w: 0.045, up: 0.75, out: 0.8, col: ['c#5d8a3a/0.7'] }], ['thyme', { n: 26, len: 0.22, w: 0.015, up: 0.7, out: 0.8, col: ['c#5a6a44/0.8'] }],
     ['parsley', { n: 18, len: 0.36, w: 0.05, up: 0.75, out: 0.75, col: ['c#3a6a2a/0.7'] }]].forEach(([, o], i) => potted(pb, -1.3 + i * 0.42, 0.5 + (i % 2) * 0.12, z, { r: 0.17, h: 0.26, ...o }));
    pb.box('c#1a1a1a/0.7', 0.8, 1.5, 0.75, 1.3, z, z + 0.12); for (let i = 0; i < 6; i++) { const sx = 0.92 + (i % 3) * 0.22, sy = 0.88 + Math.floor(i / 3) * 0.27; pb.box('c#3b2a1f/1', sx - 0.09, sx + 0.09, sy - 0.1, sy + 0.1, z + 0.11, z + 0.115); leaves(pb, sx, sy, z + 0.11, { n: 4, len: 0.12, w: 0.03, up: 0.8, out: 0.7, col: ['c#7aa04a/0.6'] }); }
    for (const [x, y] of [[0.2, 1.15], [0.42, 1.25]]) { pb.soft('c#3f8a8a/0.8', x - 0.09, x + 0.09, y - 0.2, y + 0.12, z, z + 0.05, 0.02); for (let k = 0; k < 4; k++) pb.soft('c#3f8a8a/0.8', x - 0.08 + k * 0.045, x - 0.05 + k * 0.045, y + 0.1, y + 0.3, z, z + 0.04, 0.012); pb.box('c#7a7a74/0.9', x - 0.1, x + 0.1, y - 0.3, y - 0.18, z, z + 0.06); }
    tube(pb, 'c#5a3a24/0.6', [[0.95, 0.35, z + 0.04], [1.25, 0.45, z + 0.04]], 0.03, 6); pb.box(STEEL, 0.55, 0.95, 0.27, 0.43, z + 0.01, z + 0.03);
    sign(pb, -0.55, 1.15, z + 0.006, 0.66, 0.3, seeds, { cw: 256, ch: 116, flat: true });
    // underneath: nested terracotta pots, a sack of potting soil, the watering can
    for (let k = 0; k < 4; k++) ves(pb, CLAY, -1.0, 0.75, 0.66 + k * 0.12, [[0, 0], [0.18, 0], [0.24, 0.3], [0.26, 0.31], [0.26, 0.35], [0.22, 0.35], [0.2, 0.06], [0, 0.06]], 16);
    pb.soft('c#5a4a2a/0.9', -0.45, 0.55, 0.3, 1.0, 0.66, 1.45, 0.12); pb.box('c#2f6a3a/0.8', -0.42, 0.52, 0.995, 1.005, 0.95, 1.2);
    { const GALV = 'c#a8aca8/0.4/0.8'; ves(pb, GALV, 1.0, 0.85, 0.66, [[0, 0], [0.24, 0], [0.25, 0.55], [0.2, 0.6], [0, 0.6]], 18); tube(pb, GALV, [[1.0, 1.05, 0.75], [1.0, 1.35, 1.05], [1.0, 1.5, 1.3]], 0.035, 8); ves(pb, GALV, 1.0, 1.52, 1.27, [[0.04, 0], [0.07, 0.06], [0, 0.07]], 10); tube(pb, GALV, [[1.0, 0.68, 1.22], [1.0, 0.75, 1.5], [1.0, 0.98, 1.5], [1.0, 1.05, 1.24]], 0.02, 6); }
  }

  // ========================================================================================
  // Firewood, right of the steps: split logs ends-out on an iron rack, kindling in a basket
  // ========================================================================================
  { const fw = fr(40.7, 45.83, PH, 2);                     // x = 40.7 - X (-2.0..2.0), y = 45.83 - Y
    for (const x of [-1.95, 1.95]) { fw.box(IRON, x - 0.04, x + 0.04, 0.12, 0.18, 0, 2.6); fw.box(IRON, x - 0.04, x + 0.04, 1.25, 1.31, 0, 2.6); fw.box(IRON, x - 0.04, x + 0.04, 0.12, 1.31, 0.15, 0.2); fw.box(IRON, x - 0.04, x + 0.04, 0.12, 1.31, 2.55, 2.6); }
    for (const y of [0.15, 1.28]) fw.box(IRON, -1.95, 1.95, y - 0.03, y + 0.03, 0.15, 0.2);
    const bark = 'bark', end = 'c#cfa877/0.85', end2 = 'c#a8784a/0.85';
    let zRow = 0.2;
    for (let row = 0; row < 6; row++) {
      let x = -1.88 + (row % 2) * 0.12, rMax = 0;
      while (x < 1.85) { const r = 0.14 + rnd() * 0.08; if (x + 2 * r > 1.9) break; const len = 1.15 + rnd() * 0.15, cx = x + r, cz = zRow + r;
        const g = new THREE.CylinderGeometry(r, r * 1.04, len, 8, 1, true); g.translate(cx, 0.15 + len / 2, cz); put(fw, g, bark);
        const c = new THREE.CircleGeometry(r * 0.96, 8); c.rotateX(-Math.PI / 2); c.translate(cx, 0.152 + len, cz); put(fw, c, rnd() < 0.5 ? end : end2);
        x += 2 * r + 0.01; rMax = Math.max(rMax, r); }
      zRow += rMax * 1.75; if (zRow > 2.25) break;
    }
    fw.block(-2.0, 2.0, 0.1, 1.35, 0, 2.6);
  }
  { const kb = fr(39.3, 43.9, PH + 0.015, 0); kb.block(-0.5, 0.5, -0.5, 0.5, 0, 1.6); ves(kb, 'wicker', 0, 0, 0, [[0, 0], [0.42, 0], [0.48, 0.7], [0.46, 0.72], [0.4, 0.06], [0, 0.06]], 18);
    for (let i = 0; i < 12; i++) { const a = i * 2.1; tube(kb, 'c#8a6a4a/0.9', [[Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0.1], [Math.cos(a) * 0.32, Math.sin(a) * 0.3, 0.95 + (i % 3) * 0.1]], 0.025, 4); }
    for (let i = 0; i < 5; i++) ball(kb, 'c#c9b48a/0.9', -0.15 + i * 0.07, 0.1 - i * 0.04, 0.55, 0.07, 6, 0.8); }

  // ========================================================================================
  // Along the north screen: a lemon tree, the rocker, a table with a lantern, a fern
  // ========================================================================================
  const nw = fr(42.83, 35.5, PH, 1);                        // x = Y - 35.5, y = 42.83 - X
  { // Meyer lemon in a big glazed pot
    const x = 1.15, y = 0.95; nw.block(x - 0.7, x + 0.7, y - 0.7, y + 0.7, 0, 3);
    ves(nw, 'c#2f5a6a/0.3', x, y, 0, [[0, 0], [0.45, 0], [0.62, 0.6], [0.66, 0.95], [0.68, 1.0], [0.6, 1.0], [0.58, 0.92], [0, 0.92]], 22);
    ves(nw, 'c#3b2a1f/1', x, y, 0.9, [[0, 0], [0.58, 0], [0, 0.03]], 16);
    tube(nw, 'c#6a5a44/0.9', [[x, y, 0.92], [x + 0.05, y - 0.03, 2.2], [x - 0.02, y + 0.02, 3.1]], 0.05, 6);
    for (const [dx, dy, dz] of [[0.3, 0.1, 2.6], [-0.3, -0.1, 2.9], [0.1, -0.3, 3.4], [-0.1, 0.3, 3.2], [0, 0, 3.8]]) tube(nw, 'c#6a5a44/0.9', [[x, y, 2.4], [x + dx, y + dy, dz]], 0.025, 5);
    for (let i = 0; i < 190; i++) { const a = i * 2.4, el = (i % 11) / 11 * 2.4 - 1.2, R = (0.45 + 0.4 * rnd()) * Math.cos(el * 0.8), cx = x + Math.cos(a) * R * 0.95, cy = y + Math.sin(a) * R * 0.8, cz = 3.2 + Math.sin(el) * 0.75;
      put(nw, sweep2([[cx, cy, cz], [cx + Math.cos(a) * 0.16, cy + Math.sin(a) * 0.16, cz + 0.06], [cx + Math.cos(a) * 0.32, cy + Math.sin(a) * 0.32, cz + 0.0]], t => 0.075 * Math.sin(Math.PI * (0.08 + t * 0.9)) + 0.003), pick(['c#3f6232/0.5', 'c#4a6e38/0.5', 'c#355a2c/0.5'])); }
    for (const [a, R, z] of [[0.4, 0.62, 2.8], [2.1, 0.7, 3.1], [3.6, 0.6, 3.5], [5.0, 0.68, 2.95], [1.2, 0.5, 3.7]]) fruit(nw, 'lemon', x + Math.cos(a) * R, y + Math.sin(a) * R * 0.85, z, 1.1);
    for (let i = 0; i < 3; i++) fruit(nw, 'lemon', x + 0.25 - i * 0.2, y + 0.35, 0.92);
  }
  model('khr_sheen_chair', fr(41.0, 39.75, PH, 0), 0, 0, 0.015, 0, { turn: 0.6, seat: 1.5, collide: true });      // a mango velvet lounge chair (the rocking chairs are the front porch's)
  { const t = fr(41.75, 42.65, PH, 0);
    const z = kit.sideTable(t, 0, 0, { kind: 'round', h: 2.0, r: 0.85 }) + 0.015;
    lantern(t, 0.15, -0.1, z, 0.34, 0.55, true); lampAt(t, 0.15, -0.1, z + 0.45, 0.45);
    ves(t, 'c#d9c9b0/0.5', -0.35, 0.3, z, [[0, 0], [0.11, 0], [0.13, 0.3], [0.12, 0.3], [0, 0.03]], 14); t.cyl('c#b98a5e/0.5', -0.35, 0.3, z + 0.25, z + 0.255, 0.115, 0.115, 12);
    kit.bookStack(t, -0.2, -0.35, z, 2);
  }
  nw.block(8.0, 8.9, 0.6, 1.5, 0, 1.6); potted(nw, 8.4, 1.05, 0.015, { r: 0.34, h: 0.62, pot: CLAY, n: 30, len: 0.7, w: 0.13, up: 0.9, out: 0.8, droop: 0.9, col: ['c#4f7a3a/0.7', 'c#5d8a45/0.7'] });
  rug(34.8, 40.3, 38.7, 43.3, PH, 'kilim');

  // ========================================================================================
  // Along the kitchen wall: the broom, a basket of cut flowers, a Boston fern on a stand
  // ========================================================================================
  { const kw = fr(0, 35.5, PH, 0);                          // x = X, y = Y - 35.5
    // corn broom leaning by the door
    tube(kw, 'c#c9a46a/0.6', [[35.45, 0.12, 4.6], [35.6, 0.35, 0.88]], 0.035, 6);
    put(kw, loft2([{ a: 0.1, b: 0.05, z: 0.95, x: 35.6, y: 0.36 }, { a: 0.2, b: 0.06, z: 0.6, x: 35.62, y: 0.37 }, { a: 0.42, b: 0.07, z: 0.03, x: 35.66, y: 0.39 }].reverse(), 16), 'c#d6b46a/0.95');
    for (const z of [0.7, 0.82]) kw.cyl('c#a8261c/0.6', 35.6, 0.36, z, z + 0.03, 0.17, 0.15, 12);
    // a trug of cut hydrangeas and garden shears
    kw.block(37.0, 38.0, 0.1, 1.1, 0, 1.6); ves(kw, 'wicker', 37.5, 0.6, 0, [[0, 0], [0.35, 0], [0.5, 0.45], [0.48, 0.48], [0.33, 0.05], [0, 0.05]], 18);
    tube(kw, 'c#8a6a4a/0.9', [[37.0, 0.6, 0.45], [37.5, 0.6, 1.2], [38.0, 0.6, 0.45]], 0.03, 5);
    for (let i = 0; i < 5; i++) ball(kw, pick(['c#9fb0d8/0.8', 'c#c8a8d8/0.8', 'c#e8e2f0/0.8']), 37.3 + (i % 3) * 0.2, 0.5 + Math.floor(i / 3) * 0.2, 0.35, 0.16, 9, 0.85);
    // a fern on a plant stand, and a bench-height shelf of pots under the window
    { const x = 39.6, y = 0.95; for (const [dx, dy] of [[-0.3, -0.3], [0.3, -0.3], [-0.3, 0.3], [0.3, 0.3]]) kw.box(WALNUT, x + dx - 0.04, x + dx + 0.04, y + dy - 0.04, y + dy + 0.04, 0, 1.6); kw.box(WALNUT, x - 0.4, x + 0.4, y - 0.4, y + 0.4, 1.6, 1.68); kw.box(WALNUT, x - 0.35, x + 0.35, y - 0.35, y + 0.35, 0.4, 0.45); kw.block(x - 0.4, x + 0.4, y - 0.4, y + 0.4, 0, 1.7);
      potted(kw, x, y, 1.68, { r: 0.3, h: 0.45, pot: PORC, n: 30, len: 0.85, w: 0.09, up: 0.6, out: 0.9, droop: 1.2, col: ['c#5d8a3a/0.7', 'c#6b9a45/0.7'] }); }
    kw.block(40.3, 40.9, 0.45, 1.05, 0, 1.6); potted(kw, 40.6, 0.75, 0.015, { r: 0.28, h: 0.45, n: 16, len: 0.9, w: 0.16, up: 1.0, out: 0.45, droop: 0.4, col: ['c#3f6a3a/0.6'] });
  }
  // Lanterns either side of the steps, candles inside to light
  for (const X of [34.95, 38.45]) { const f = fr(X, 45.5, PH + 0.015, 0); lantern(f, 0, 0, 0, 0.42, 0.75, false); candle(f, 0, 0, 0.06, 0.3); }

  // ---- local helpers -----------------------------------------------------------------------------
  function lathe2(p) { return kit.geom.lathe(p, { seg: 22 }); }
  function loft2(rows, seg = 18) { return kit.geom.loft(rows, { seg }); }
  function sweep2(path, r) { return kit.geom.sweep(path, r, { seg: 5, shape: Array.from({ length: 5 }, (_, i) => [0.18 * Math.cos(i / 5 * TAU), Math.sin(i / 5 * TAU)]) }); }
  // A square lantern: iron frame, glass sides, a hood and a ring; glow: a lit bulb inside
  function lantern(f, x, y, z, w, h, glow) {
    const s = w / 2;
    f.box(IRON, x - s - 0.03, x + s + 0.03, y - s - 0.03, y + s + 0.03, z, z + 0.06);
    for (const dx of [-s, s]) for (const dy of [-s, s]) f.box(IRON, x + dx - 0.025, x + dx + 0.025, y + dy - 0.025, y + dy + 0.025, z + 0.06, z + h);
    for (const [a, b, c, d] of [[-s, s, -s, -s + 0.01], [-s, s, s - 0.01, s], [-s, -s + 0.01, -s, s], [s - 0.01, s, -s, s]]) f.box('glass', x + a, x + b, y + c, y + d, z + 0.06, z + h);
    put(f, kit.geom.loft([{ a: s + 0.06, b: s + 0.06, z: z + h, x, y }, { a: s + 0.06, b: s + 0.06, z: z + h + 0.04, x, y }, { a: 0.06, b: 0.06, z: z + h + 0.22, x, y }],   // (the hood was built at the frame's origin)
 { seg: 4, th0: Math.PI / 4, th1: Math.PI / 4 + TAU }), IRON);
    const g = new THREE.TorusGeometry(0.07, 0.012, 6, 14); g.rotateX(Math.PI / 2); g.translate(x, y, z + h + 0.3); put(f, g, IRON);
    if (glow) { ball(f, 'e#ffcf8a/3', x, y, z + h * 0.3, 0.11, 10, 1.4); f.cyl('c#d9cfb8/0.4', x, y, z + 0.06, z + h * 0.35, 0.05, 0.05, 8); }
  }
}
