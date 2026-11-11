// Pantry and coffee bar, in the old butler's pantry  (X 27.8-42.83, Y 16.7-22.4)
// East side (against the dining room): the coffee counter, a two-group lever espresso
// machine under a brass eagle, the grinder, and the Vietnamese corner (Trung Nguyên, a phin
// on a glass of condensed milk). West side (against the kitchen): the pantry proper, floor
// to ceiling, with a wine rack at the window end and a library step for the top shelves.
// The west end is left clear: it is where the dining door, the back hall and the kitchen meet.
import * as THREE from 'three';
import { BRASS, STEEL, BLACK, DARK, G } from '../kit.js';
import { F1 } from '../house.js';
import { tools, romanShades, ART, T, SAGEP, HONEY, OAKW, WALNUT, PORC, NICKEL, CHROME, COPPER, GLASSY, TILE } from './kitchen.js';

const TAU = Math.PI * 2;
const disc = (g, x, y, r, c) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = c; g.fill(); };
const gauge = (g, w, h) => {
  disc(g, w / 2, h / 2, w * 0.49, '#f4eedd'); g.strokeStyle = '#1d1a17';
  for (let i = 0; i <= 12; i++) { const a = -2.3 + i / 12 * 4.6; g.lineWidth = i % 3 ? 2 : 4; g.beginPath(); g.moveTo(w / 2 + Math.sin(a) * w * 0.32, h / 2 - Math.cos(a) * w * 0.32); g.lineTo(w / 2 + Math.sin(a) * w * 0.42, h / 2 - Math.cos(a) * w * 0.42); g.stroke(); }
  g.strokeStyle = '#3a8a4a'; g.lineWidth = 8; g.beginPath(); g.arc(w / 2, h / 2, w * 0.37, -Math.PI / 2 + 0.6, -Math.PI / 2 + 1.3); g.stroke();
  T(g, 'BAR', w / 2, h * 0.68, w * 0.1, '#1d1a17', { w: 'normal' }); g.strokeStyle = '#a8261c'; g.lineWidth = 4; g.beginPath(); g.moveTo(w / 2, h / 2); g.lineTo(w / 2 + Math.sin(0.9) * w * 0.36, h / 2 - Math.cos(0.9) * w * 0.36); g.stroke(); disc(g, w / 2, h / 2, 6, '#1d1a17');
};
const coffeeMenu = (g, w, h) => {
  g.fillStyle = '#2a2c2a'; g.fillRect(0, 0, w, h);
  T(g, '~ today ~', w / 2, h * 0.12, h * 0.07, '#efe9da', { it: 1, w: 'normal' });
  ['cà phê sữa đá', 'cortado', 'oat flat white', 'cardamom buns', 'mint tea for Maks'].forEach((s, i) => T(g, s, w / 2, h * (0.3 + i * 0.15), h * 0.08, ['#efe9da', '#e9c46a', '#efe9da', '#e8a8a0', '#9fc6b0'][i], { f: '"Brush Script MT", "Segoe Script", cursive', w: 'normal', it: 1, max: w * 0.9 }));
};
// Several identical packages side by side (or stacked) drawn on one surface: one draw call.
const multi = (draw, n, vert, gap) => (g, w, h) => {
  g.fillStyle = '#1d1a17'; g.fillRect(0, 0, w, h);
  const cw = vert ? w : (w - gap * (n - 1)) / n, ch = vert ? (h - gap * (n - 1)) / n : h;
  for (let i = 0; i < n; i++) { g.save(); g.translate(vert ? 0 : i * (cw + gap), vert ? i * (ch + gap) : 0); g.beginPath(); g.rect(0, 0, cw, ch); g.clip(); draw(g, cw, ch); g.restore(); }
};
const tagLabel = (txt, bgc, fg) => (g, w, h) => { g.fillStyle = bgc; g.fillRect(0, 0, w, h); g.strokeStyle = fg; g.lineWidth = 3; g.strokeRect(6, 6, w - 12, h - 12); T(g, txt, w / 2, h / 2, h * 0.32, fg, { it: 1, w: 'normal', max: w * 0.85 }); };

export default function (kit) {
  const { model, picture, rug, lampAt, sign, pack, steam, bookRow } = kit;
  const room = kit.house?.rooms?.find(r => r.name === 'Coffee bar'); if (room) room.name = 'Pantry and coffee bar';
  const K = tools(kit, 23), fr = (...a) => K.wrap(kit.fr(...a)), { run, rnd, pick, put, ves, hcyl, ball, tube, fruit, potted, jar, bottle, tin, plate, bowl, glass, cupSaucer, towel } = K;
  const CREAMP = 'painted_wood#d8d0bd';
  romanShades(kit, w => !w.isX && Math.abs(w.c - 42.83) < 0.1 && (w.u0 + w.u1) / 2 > 16.5 && (w.u0 + w.u1) / 2 < 22.6);

  // ========================================================================================
  // The coffee counter, against the dining-room wall
  // ========================================================================================
  const b = fr(38.2, 16.7, F1, 0);                          // x = X - 38.2 (-4.6..4.6), y = Y - 16.7
  run(b, -4.6, 4.6, { top: 'marble' });
  b.box(TILE, -4.6, 4.6, 0.004, 0.035, 3.02, 4.42);
  // Shelves: a short one at the window end, a long high one over everything
  const shelf = (x0, x1, z, d = 0.85) => { b.box(HONEY, x0, x1, 0.035, d, z - 0.1, z, G); for (let x = x0 + 0.3; x < x1; x += Math.max(1.2, (x1 - x0 - 0.6) / Math.round((x1 - x0) / 2.6))) { b.box(BRASS, x - 0.025, x + 0.025, 0.035, d - 0.15, z - 0.14, z - 0.1); tube(b, BRASS, [[x, 0.04, z - 0.6], [x, 0.3, z - 0.32], [x, d - 0.2, z - 0.14]], 0.022, 5); } };
  shelf(0.9, 4.55, 4.55); shelf(-4.5, 4.55, 6.3);
  b.box('shade', 1.0, 4.45, 0.72, 0.78, 4.4, 4.44); b.box('shade', -4.4, 4.45, 0.72, 0.78, 6.15, 6.19);
  // low shelf: jars of beans, a row of tins, the good cups
  for (let i = 0; i < 5; i++) jar(b, 1.25 + i * 0.4, 0.4, 4.55, 0.15, 0.55, pick(['c#3a2214/0.9', 'c#4a2a18/0.9', 'c#2a180e/0.9']), 0.8, pick([BRASS, 'c#c9ccd0/0.3/1', 'c#2a2622/0.5']));
  for (let i = 0; i < 3; i++) { const x = 3.4 + i * 0.38; tin(b, x, 0.4, 4.55, 0.15, 0.45, pick(['c#c8202a/0.4', 'c#2a4a6a/0.4', 'c#d9b35a/0.4']), 'c#efe6cc/0.5'); }
  // high shelf: cups and saucers, a stack of plates, teapots, the cake tin
  for (let i = 0; i < 5; i++) cupSaucer(b, -4.1 + i * 0.42, 0.45, 6.3, pick([PORC, 'c#c9d6d8/0.25', 'c#e3c9b8/0.3']), false);
  for (let k = 0; k < 8; k++) plate(b, -1.2, 0.45, 6.3 + k * 0.035, 0.34, k % 2 ? PORC : 'c#2f5a6a/0.3');
  ves(b, 'c#2f5a6a/0.3', -0.3, 0.45, 6.3, [[0, 0], [0.2, 0], [0.26, 0.15], [0.24, 0.32], [0.12, 0.4], [0.05, 0.42], [0.06, 0.48], [0, 0.5]], 16);
  ves(b, PORC, 0.45, 0.45, 6.3, [[0, 0], [0.18, 0], [0.24, 0.14], [0.2, 0.3], [0.1, 0.36], [0.04, 0.4], [0, 0.42]], 16);
  for (let i = 0; i < 6; i++) glass(b, 1.2 + i * 0.32, 0.45, 6.3, 0.09, 0.3);
  ves(b, 'c#d9cdb2/0.4', 3.55, 0.45, 6.3, [[0, 0], [0.3, 0], [0.3, 0.32], [0.28, 0.34], [0, 0.34]], 20);
  ves(b, 'c#7a2a2a/0.4', 4.2, 0.45, 6.3, [[0, 0], [0.13, 0], [0.17, 0.25], [0.1, 0.45], [0.12, 0.55], [0, 0.55]], 14);

  // ---- The espresso machine: two lever groups either side of a copper boiler, a brass eagle on top
  {
    const e = b.sub(-0.5, 0.95, 3.02);
    e.soft(CHROME, -1.05, 1.05, -0.62, 0.55, 0, 0.42, 0.06); e.box(BRASS, -1.06, 1.06, -0.63, 0.56, 0.36, 0.4);
    e.box(STEEL, -0.98, 0.98, 0.55, 0.95, 0.06, 0.14); for (let i = 0; i < 13; i++) e.box('c#9a9a96/0.25/1', -0.92 + i * 0.152, -0.89 + i * 0.152, 0.58, 0.92, 0.14, 0.16);
    e.box(BRASS, -0.98, 0.98, 0.94, 0.97, 0.06, 0.14);
    ves(e, COPPER, 0, -0.08, 0.4, [[0, 0], [0.5, 0], [0.5, 1.12], [0.47, 1.2], [0.42, 1.2], [0.42, 1.25], [0.38, 1.5], [0.24, 1.7], [0.1, 1.78], [0, 1.8]], 28);
    for (const z of [0.62, 1.2]) e.cyl(BRASS, 0, -0.08, z, z + 0.06, 0.515, 0.515, 28);
    ball(e, BRASS, 0, -0.08, 2.18, 0.07, 10); e.cyl(BRASS, 0, -0.08, 2.18, 2.26, 0.035, 0.035, 8);
    ball(e, BRASS, 0, -0.08, 2.28, 0.09, 10, 1.3);                                       // the eagle: body, head, wings
    ball(e, BRASS, 0, -0.0, 2.48, 0.05, 8);
    for (const s of [-1, 1]) tube(e, BRASS, [[0, -0.08, 2.4], [s * 0.15, -0.1, 2.5], [s * 0.26, -0.12, 2.66], [s * 0.3, -0.12, 2.72]], t => 0.05 * (1 - t) + 0.01, 6);
    // pressure gauge
    hcyl(e, CHROME, 'y', 0, 0.44, 1.32, 0.08, 0.15, 0.15, 20); sign(e, 0, 0.485, 1.32, 0.24, 0.24, gauge, { cw: 128, ch: 128 });
    // the two groups, levers up
    for (const s of [-1, 1]) {
      const x = s * 0.74, y = 0.32;
      hcyl(e, CHROME, 'x', s * 0.6, -0.02, 1.15, 0.3, 0.08);
      e.cyl(CHROME, x, y, 0.95, 1.35, 0.17, 0.2, 18); e.cyl(CHROME, x, y, 1.35, 1.75, 0.1, 0.1, 14); e.cyl(BRASS, x, y, 1.72, 1.78, 0.12, 0.12, 14);
      tube(e, CHROME, [[x, y, 1.72], [x, y + 0.12, 1.95], [x, y + 0.35, 2.35], [x, y + 0.5, 2.55]], 0.03, 8); ball(e, BLACK, x, y + 0.5, 2.5, 0.09, 12);
      e.cyl(CHROME, x, y, 0.8, 0.95, 0.15, 0.16, 16); tube(e, 'c#5a3a24/0.45', [[x, y + 0.14, 0.87], [x, y + 0.5, 0.86], [x, y + 0.72, 0.84]], 0.04, 8);
      e.cyl(CHROME, x, y, 0.72, 0.8, 0.04, 0.05, 8);
      ves(e, PORC, x, y + 0.02, 0.16, [[0, 0], [0.06, 0], [0.09, 0.06], [0.09, 0.18], [0.085, 0.18], [0, 0.05]], 14);
      e.cyl('c#8a5a2a/0.3', x, y + 0.02, 0.32, 0.325, 0.08, 0.08, 12); tube(e, PORC, [[x + 0.09, y + 0.02, 0.32], [x + 0.15, y + 0.02, 0.28], [x + 0.09, y + 0.02, 0.22]], 0.012, 4);
      const [a1, c1] = kit.world(e, x, y + 0.02); if (s > 0) steam.push({ x: a1, y: F1 + 3.02 + 0.4, z: c1 });
    }
    tube(e, CHROME, [[0.45, -0.02, 1.3], [0.85, 0.2, 1.25], [1.0, 0.45, 1.1], [1.0, 0.5, 0.55]], 0.025, 6); ball(e, BLACK, 0.52, 0.02, 1.36, 0.06, 8);
    tube(e, CHROME, [[-0.45, -0.02, 1.3], [-0.85, 0.2, 1.25], [-0.98, 0.45, 1.1], [-0.98, 0.5, 0.65]], 0.025, 6); ball(e, BLACK, -0.52, 0.02, 1.36, 0.06, 8);
  }
  // Grinder (conical burr) with beans in the hopper, the knock box, tamper, milk jugs
  { const x = -2.35, y = 0.95, z = 3.02;
    b.soft('c#2a2622/0.35', x - 0.27, x + 0.27, y - 0.35, y + 0.3, z, z + 1.05, 0.08); b.box(CHROME, x - 0.2, x + 0.2, y + 0.3, y + 0.32, z + 0.55, z + 0.95);
    b.box('c#2a2622/0.35', x - 0.15, x + 0.15, y + 0.15, y + 0.45, z + 0.25, z + 0.32); ves(b, CHROME, x, y + 0.35, z, [[0, 0], [0.12, 0], [0.13, 0.22], [0.12, 0.22], [0, 0.03]], 14);
    ves(b, GLASSY, x, y - 0.05, z + 1.05, [[0.08, 0], [0.24, 0.45], [0.25, 0.5], [0, 0.5]], 18); ves(b, 'c#3a2214/0.9', x, y - 0.05, z + 1.07, [[0.08, 0], [0.2, 0.3], [0, 0.32]], 14); b.cyl(BLACK, x, y - 0.05, z + 1.55, z + 1.6, 0.25, 0.25, 18); }
  b.box(WALNUT, 0.75, 1.2, 0.9, 1.4, 3.02, 3.4); b.box('c#2a2622/0.6', 0.8, 1.15, 0.95, 1.35, 3.38, 3.41); hcyl(b, BLACK, 'x', 0.97, 1.15, 3.39, 0.4, 0.03);
  ves(b, WALNUT, 1.45, 0.55, 3.02, [[0, 0], [0.12, 0], [0.12, 0.08], [0.04, 0.12], [0.05, 0.32], [0, 0.34]], 14); ves(b, STEEL, 1.45, 0.55, 3.02, [[0, 0], [0.12, 0], [0.12, 0.02], [0, 0.02]], 14);
  for (const [x, y, s] of [[1.45, 1.25, 1], [1.75, 1.0, 0.8]]) { ves(b, STEEL, x, y, 3.02, [[0, 0], [0.13 * s, 0], [0.14 * s, 0.25 * s], [0.12 * s, 0.4 * s], [0, 0.4 * s]], 14); tube(b, STEEL, [[x + 0.12 * s, y, 3.02 + 0.35 * s], [x + 0.22 * s, y, 3.02 + 0.3 * s], [x + 0.13 * s, y, 3.02 + 0.1 * s]], 0.015, 4); }

  // ---- The Vietnamese corner: Trung Nguyên, a phin dripping over condensed milk -------------
  { const z = 3.02;
    pack(b, 2.2, 0.55, z, 0.52, 0.22, 0.82, 'c#3a2014/0.6', ART.trungNguyen, { cw: 160, ch: 252 }); b.box('c#3a2014/0.6', 1.96, 2.44, 0.46, 0.64, z + 0.82, z + 0.9);
    b.cyl('c#b8202a/0.35/0.6', 2.75, 0.5, z, z + 0.55, 0.19, 0.19, 20); b.cyl('c#d8b048/0.3/1', 2.75, 0.5, z + 0.55, z + 0.6, 0.195, 0.195, 20);
    sign(b, 2.75, 0.695, z + 0.28, 0.3, 0.4, ART.trungCan, { cw: 120, ch: 160 });
    // a glass: condensed milk at the bottom, coffee dripping in; the phin on top with its lid
    const gx = 2.35, gy = 1.25;
    ves(b, GLASSY, gx, gy, z, [[0, 0], [0.12, 0], [0.13, 0.4], [0.12, 0.4], [0, 0.03]], 16);
    ves(b, 'c#efe2bc/0.3', gx, gy, z + 0.03, [[0, 0], [0.11, 0], [0.115, 0.08], [0, 0.08]], 14); ves(b, 'c#4a2a14/0.2', gx, gy, z + 0.11, [[0, 0], [0.115, 0], [0.12, 0.13], [0, 0.13]], 14);
    ves(b, STEEL, gx, gy, z + 0.4, [[0, 0], [0.22, 0], [0.22, 0.015], [0.13, 0.02], [0.14, 0.22], [0.15, 0.24], [0.13, 0.24], [0, 0.04]], 18);
    ves(b, STEEL, gx, gy, z + 0.64, [[0.15, 0], [0.12, 0.06], [0.04, 0.08], [0.04, 0.11], [0, 0.12]], 16);
    { const [a1, c1] = kit.world(b, gx, gy); steam.push({ x: a1, y: F1 + z + 0.8, z: c1 }); }
    tin(b, 3.0, 1.3, z, 0.13, 0.28, 'c#f8f6ee/0.5'); sign(b, 3.0, 1.435, z + 0.14, 0.24, 0.17, ART.longevity, { cw: 160, ch: 112 });
    for (let i = 0; i < 2; i++) b.cyl(STEEL, 2.75 + i * 0.05, 1.45, z, z + 0.01, 0.07, 0.07, 10);
    hcyl(b, STEEL, 'x', 2.72, 1.55, z + 0.012, 0.4, 0.012);
    // ice in a bucket for cà phê sữa đá
    ves(b, NICKEL, 3.45, 1.35, z, [[0, 0], [0.18, 0], [0.22, 0.32], [0.2, 0.32], [0, 0.05]], 18); for (let i = 0; i < 6; i++) b.box('c#e8f0f2/0.05', 3.35 + (i % 3) * 0.07, 3.41 + (i % 3) * 0.07, 1.27 + Math.floor(i / 3) * 0.08, 1.33 + Math.floor(i / 3) * 0.08, z + 0.24, z + 0.3);
  }
  { const kx = 3.9, ky = 0.75, KC = 'c#efe2bc/0.3'; b.cyl(BLACK, kx, ky, 3.02, 3.1, 0.3, 0.3, 18); ves(b, KC, kx, ky, 3.1, [[0, 0], [0.26, 0], [0.3, 0.3], [0.27, 0.6], [0.16, 0.75], [0.15, 0.8], [0, 0.82]], 20); ball(b, BLACK, kx, ky, 3.9, 0.05, 8); tube(b, BLACK, [[kx - 0.22, ky, 3.75], [kx - 0.45, ky, 3.7], [kx - 0.42, ky, 3.3], [kx - 0.27, ky, 3.25]], 0.035, 6); tube(b, KC, [[kx + 0.25, ky, 3.35], [kx + 0.42, ky, 3.6], [kx + 0.48, ky, 3.72]], 0.04, 6); }
  // A plate of cardamom buns and croissants under a cloth, the sugar, the menu leaning on the wall
  plate(b, -3.6, 1.1, 3.02, 0.42, 'c#e8e2d4/0.25'); model('croissant', b, -3.75, 1.0, 3.06, 0, { turn: 0.5 }); model('croissant', b, -3.45, 1.2, 3.06, 0, { turn: 2.2 });
  for (const [x, y] of [[-3.55, 0.85], [-3.35, 0.98]]) { ves(b, 'c#c98a42/0.8', x, y, 3.06, [[0, 0], [0.1, 0], [0.11, 0.06], [0.07, 0.1], [0, 0.11]], 10); }
  b.soft('linen#e6dccb', -3.95, -3.2, 1.3, 1.55, 3.02, 3.06, 0.02);
  ves(b, PORC, -2.95, 0.55, 3.02, [[0, 0], [0.12, 0], [0.13, 0.22], [0.11, 0.24], [0.12, 0.26], [0.06, 0.3], [0.03, 0.34], [0, 0.34]], 14);
  { const mf = b.sub(-4.05, 0.22, 3.02); mf.box(WALNUT, -0.42, 0.42, 0, 0.06, 0, 1.15, { rot: [0, 0, 0] }); sign(mf, 0, 0.065, 0.58, 0.72, 1.02, coffeeMenu, { cw: 176, ch: 250 }); }
  potted(b, -1.9, 0.55, 6.3, { r: 0.14, h: 0.22, n: 14, len: 0.45, w: 0.07, up: 0.2, out: 1, droop: 1.6, pot: PORC });   // leaves short of the wall
  towel(b, 1.4, 1.95, 2.12, 3.0, 0.7, 'linen#e6dccb', 'c#2a4a7a/0.8');
  lampAt(b, -0.5, 1.0, 4.6, 0.6);

  // ========================================================================================
  // The pantry, against the kitchen wall: floor to ceiling, a wine rack at the window end
  // ========================================================================================
  {
    // Set 0.09 off the wall (clear of its picture rail and baseboard), its north end short of the
    // window's stool and casing (X 42.55), its south end clear of the kitchen opening's head (X 36.6).
    const ps = fr(39.75, 22.31, F1, 2), D = 1.25, H = 7.45;      // x = 39.75 - X (-2.8..3.15), y = 22.31 - Y
    const P = CREAMP, XW = -2.8;
    for (const x of [XW, -1.78, 0.68, 3.08]) ps.box(P, x, x + 0.07, 0, D, 0, H);
    ps.box(P, XW, 3.15, 0, 0.04, 0, H); ps.box(P, XW - 0.05, 3.2, 0, D + 0.06, H, H + 0.12); ps.box('c#2c2520/0.6', XW + 0.07, 3.08, 0.1, D - 0.15, 0, 0.28);
    const Z = [0.35, 1.45, 2.55, 3.6, 4.65, 5.7, 6.75];
    for (const z of Z) { ps.box(HONEY, -1.71, 0.68, 0.04, D, z - 0.07, z, G); ps.box(HONEY, 0.75, 3.08, 0.04, D, z - 0.07, z, G); if (z >= 4.6 || z < 0.4) ps.box(HONEY, XW + 0.07, -1.78, 0.04, D, z - 0.07, z, G); }
    ps.box('shade', XW + 0.1, 3.0, D - 0.12, D - 0.07, 6.664, 6.676); ps.block(XW, 3.15, 0, D, 0, H);     // the light strip just under the top shelf, not sharing its face
    lampAt(ps, 0.5, 1.6, 6.0, 0.45);
    // wine: a lattice of cubbies with bottles lying neck-out
    { const x0 = XW + 0.07, x1 = -1.78, z0 = 0.35, z1 = 4.58, nx = 2, nz = 9, cw = (x1 - x0) / nx, ch = (z1 - z0) / nz;
      for (let i = 1; i < nx; i++) ps.box(HONEY, x0 + i * cw - 0.02, x0 + i * cw + 0.02, 0.04, D, z0, z1);
      for (let k = 1; k <= nz; k++) ps.box(HONEY, x0, x1, 0.04, D, z0 + k * ch - 0.025, z0 + k * ch + 0.005);
      for (let i = 0; i < nx; i++) for (let k = 0; k < nz; k++) { if ((i * 7 + k * 3) % 11 === 4) continue; const cx = x0 + (i + 0.5) * cw, cz = z0 + k * ch + 0.17, col = pick(['c#1f3a24/0.15', 'c#2a1a14/0.2', 'c#3a2a14/0.2', 'c#c9b98a/0.15']);
        hcyl(ps, col, 'y', cx, 0.65, cz, 0.85, 0.135, 0.135, 12); hcyl(ps, col, 'y', cx, 1.13, cz, 0.12, 0.13, 0.04, 10); hcyl(ps, pick(['c#7a1a1a/0.4', 'c#d9b35a/0.3/1', 'c#1a1a1a/0.4', 'c#e8e2d4/0.4']), 'y', cx, 1.22, cz, 0.06, 0.042, 0.042, 8); } }
    for (let i = 0; i < 3; i++) ves(ps, GLASSY, -2.5 + i * 0.3, 0.6, 4.65, [[0, 0], [0.09, 0], [0.09, 0.012], [0.015, 0.03], [0.015, 0.28], [0.09, 0.33], [0.11, 0.5], [0.105, 0.5], [0, 0.33]], 12);
    ves(ps, GLASSY, -2.06, 0.6, 5.7, [[0, 0], [0.25, 0], [0.28, 0.25], [0.12, 0.45], [0.06, 0.7], [0.08, 0.72], [0, 0.72]], 18);
    pack(ps, -2.52, 0.6, 5.7, 0.36, 0.36, 0.95, 'c#e8c34a/0.4', tagLabel('Veuve', '#e8a32a', '#1d1a17'), { cw: 96, ch: 240 });
    ves(ps, PORC, -2.25, 0.6, 6.75, [[0, 0], [0.18, 0], [0.06, 0.04], [0.04, 0.25], [0.36, 0.27], [0.36, 0.3], [0.04, 0.3], [0.03, 0.5], [0.26, 0.52], [0.26, 0.55], [0.02, 0.55], [0.02, 0.62], [0, 0.64]], 20);

    const A = -0.52, Bc = 1.9;                                  // centres of the two food bays
    // floor: rice, a sack of flour, sparkling water, a basket of potatoes
    pack(ps, A - 0.6, 0.6, 0.35, 0.75, 0.42, 0.95, 'c#f4ead6/0.8', ART.rice, { cw: 160, ch: 202 });
    ps.soft('linen#e6dccb', A + 0.05, A + 1.1, 0.25, 1.0, 0.35, 1.25, 0.15); ps.box('c#c8202a/0.6', A + 0.08, A + 1.07, 0.995, 1.005, 0.7, 0.78);
    ps.box('c#2a5a3a/0.5', Bc - 1.05, Bc + 0.05, 0.2, 1.1, 0.35, 0.55); for (let i = 0; i < 12; i++) bottle(ps, Bc - 0.92 + (i % 4) * 0.26, 0.35 + Math.floor(i / 4) * 0.3, 0.45, { r: 0.1, h: 0.85, col: 'c#3a6a3a/0.15', cap: 'c#c9ccd0/0.3/1', neck: 0.03 });
    ps.box('wicker', Bc + 0.2, Bc + 1.1, 0.2, 1.1, 0.35, 0.39); for (const s of [-1, 1]) ps.box('wicker', Bc + 0.65 + s * 0.45 - 0.03, Bc + 0.65 + s * 0.45 + 0.03, 0.2, 1.1, 0.35, 0.75); ps.box('wicker', Bc + 0.2, Bc + 1.1, 1.07, 1.1, 0.35, 0.75); ps.box('wicker', Bc + 0.2, Bc + 1.1, 0.2, 0.23, 0.35, 0.75);
    for (let i = 0; i < 8; i++) fruit(ps, i % 3 ? 'potato' : 'onion', Bc + 0.38 + (i % 3) * 0.24, 0.38 + Math.floor(i / 3) * 0.25, 0.39 + (i > 5 ? 0.14 : 0));
    // pasta, tomatoes, broth, olive oil, beans
    ps.box('c#1b3f8b/0.5', A - 1.0, A - 0.7, 0.5, 0.7, 1.45, 2.4); ps.box('c#1b3f8b/0.5', A - 0.65, A - 0.35, 0.5, 0.7, 1.45, 2.4); sign(ps, A - 0.675, 0.704, 1.925, 0.65, 0.93, multi(ART.spaghetti, 2, false, 15), { cw: 192, ch: 240 });
    pack(ps, A - 0.05, 0.6, 1.45, 0.42, 0.25, 0.7, 'c#fbfaf5/0.6', ART.penne, { cw: 128, ch: 200 });
    for (const x of [A + 0.42, A + 0.7]) { for (const lv of [0, 1]) tin(ps, x, 0.55, 1.45 + lv * 0.405, 0.13, 0.4, 'c#c8202a/0.45', 'c#e8d07a/0.5'); tin(ps, x, 0.9, 1.45, 0.13, 0.4, 'c#c8202a/0.45', 'c#e8d07a/0.5'); }
    ps.box('c#f5efe0/0.6', Bc - 1.03, Bc - 0.67, 0.45, 0.75, 1.45, 2.23); ps.box('c#f5efe0/0.6', Bc - 0.63, Bc - 0.27, 0.45, 0.75, 1.45, 2.23); sign(ps, Bc - 0.65, 0.754, 1.84, 0.76, 0.76, multi(ART.broth, 2, false, 11), { cw: 224, ch: 224 });
    pack(ps, Bc + 0.05, 0.6, 1.45, 0.34, 0.34, 0.85, 'c#2f4a2a/0.4', ART.oliveoil, { cw: 112, ch: 260 });
    for (let i = 0; i < 4; i++) tin(ps, Bc + 0.5 + (i % 2) * 0.28, 0.5 + Math.floor(i / 2) * 0.32, 1.45, 0.13, 0.36, pick(['c#e8d8b0/0.5', 'c#3a6a3a/0.5', 'c#8a2a1a/0.5']), 'c#f3e8cc/0.5');
    // eye level: her snacks
    pack(ps, A - 0.75, 0.62, 2.55, 0.55, 0.22, 0.82, 'c#d52b1e/0.5', ART.cheezit, { cw: 140, ch: 210 });
    ps.box('c#efe4c8/0.5', A - 0.395, A + 0.155, 0.46, 0.78, 2.55, 2.97); ps.box('c#efe4c8/0.5', A - 0.385, A + 0.165, 0.46, 0.78, 2.98, 3.4); sign(ps, A - 0.115, 0.784, 2.975, 0.55, 0.85, multi(ART.joejoes, 2, true, 3), { cw: 176, ch: 272 });
    ves(ps, 'c#f3e9d2/0.4', A + 0.42, 0.6, 2.55, [[0, 0], [0.2, 0], [0.21, 0.55], [0, 0.55]], 18); ps.cyl('c#c8102e/0.4', A + 0.42, 0.6, 3.1, 3.16, 0.22, 0.22, 18);
    sign(ps, A + 0.42, 0.815, 2.83, 0.3, 0.38, ART.pretzels, { cw: 120, ch: 152 });
    pack(ps, Bc - 0.85, 0.66, 2.55, 0.42, 0.16, 0.62, 'c#2a1810/0.5', ART.ghirardelli, { cw: 128, ch: 190 });
    pack(ps, Bc - 0.38, 0.66, 2.55, 0.42, 0.16, 0.58, 'c#c4122f/0.5', ART.lindor, { cw: 128, ch: 176 });
    ps.box('c#1d5aa6/0.5', Bc - 0.095, Bc + 0.455, 0.56, 0.76, 2.55, 2.72); ps.box('c#1d5aa6/0.5', Bc - 0.075, Bc + 0.475, 0.56, 0.76, 2.72, 2.89); sign(ps, Bc + 0.19, 0.764, 2.72, 0.55, 0.34, multi(ART.crunch, 2, true, 0), { cw: 200, ch: 128 });
    pack(ps, Bc + 0.2, 0.66, 2.89, 0.5, 0.25, 0.32, 'c#3a2416/0.5', ART.pbcups, { cw: 160, ch: 104 });
    pack(ps, Bc + 0.78, 0.66, 2.55, 0.45, 0.2, 0.75, 'c#f6eed8/0.5', ART.popcorn, { cw: 120, ch: 200 });
    // jars: nuts, dried apricots, honey, peanut butter, tea tins, syrup
    for (let i = 0; i < 4; i++) jar(ps, A - 0.85 + i * 0.36, 0.6, 3.6, 0.14, 0.55, ['c#c99a5a/0.8', 'c#e08a3a/0.7', 'c#8a5a2a/0.8', 'c#d9c9a0/0.8'][i], 0.85, BLACK);
    ves(ps, 'c#e9d8b4/0.4', A + 0.5, 0.65, 3.6, [[0, 0], [0.15, 0], [0.16, 0.4], [0, 0.4]], 16); ps.cyl('c#c8102e/0.4', A + 0.5, 0.65, 4.0, 4.06, 0.16, 0.16, 16);
    sign(ps, A + 0.5, 0.815, 3.8, 0.22, 0.28, ART.tjPB, { cw: 96, ch: 120 });
    for (let i = 0; i < 4; i++) tin(ps, Bc - 0.85 + i * 0.36, 0.55, 3.6, 0.15, 0.48, ['c#2f5a6a/0.4', 'c#c8a24a/0.4', 'c#7a2a2a/0.4', 'c#1d1a17/0.4'][i]);
    jar(ps, Bc + 0.62, 0.65, 3.6, 0.13, 0.4, 'c#e3a53a/0.3', 0.92, HONEY); bottle(ps, Bc + 0.92, 0.6, 3.6, { r: 0.09, h: 0.6, col: 'c#8a4a1a/0.15', cap: 'c#c8202a/0.4', neck: 0.03, label: 'c#efe6cc/0.5' });
    // baking
    pack(ps, A - 0.6, 0.6, 4.65, 0.62, 0.42, 0.88, 'c#f7f4ec/0.8', ART.flour, { cw: 140, ch: 200 });
    jar(ps, A + 0.05, 0.6, 4.65, 0.17, 0.7, 'c#f3eee4/0.9', 0.8); jar(ps, A + 0.45, 0.6, 4.65, 0.14, 0.55, 'c#4a2a18/0.9', 0.7);
    bottle(ps, Bc - 0.85, 0.6, 4.65, { r: 0.06, h: 0.4, col: 'c#3a2010/0.15', cap: BLACK, neck: 0.025, label: 'c#efe6cc/0.5' });
    for (let k = 0; k < 3; k++) bowl(ps, Bc - 0.1, 0.6, 4.65 + k * 0.08, 0.45 - k * 0.07, 0.3 - k * 0.04, ['c#e8e2d4/0.3', 'c#c9d6d8/0.3', 'c#d9a88a/0.3'][k]);
    ves(ps, 'c#d9cdb2/0.4', Bc + 0.7, 0.6, 4.65, [[0, 0], [0.25, 0], [0.25, 0.3], [0.27, 0.32], [0, 0.32]], 20);
    // paper towels, napkins, a stock pot, platters
    for (let i = 0; i < 3; i++) hcyl(ps, 'c#f6f3ec/0.9', 'z', A - 0.75 + i * 0.42, 0.6, 5.7 + 0.45, 0.9, 0.2, 0.2, 16);
    ps.box('c#e9e1cc/0.9', A + 0.5, A + 0.62, 0.3, 1.0, 5.7, 6.4); ves(ps, STEEL, Bc - 0.45, 0.6, 5.7, [[0, 0], [0.45, 0], [0.47, 0.75], [0.45, 0.75], [0, 0.05]], 22);
    for (let k = 0; k < 3; k++) { const g = new THREE.CylinderGeometry(0.45, 0.45, 0.03, 24); g.rotateZ(Math.PI / 2); g.rotateY(0.15); g.translate(Bc + 0.55 + k * 0.08, 0.7, 5.7 + 0.47); put(ps, g, [PORC, 'c#2f5a6a/0.3', 'c#e3c9b8/0.3'][k]); }
    // top: baskets and a big crock
    for (const x of [A - 0.6, A + 0.3, Bc - 0.5]) { ps.box('wicker', x - 0.4, x + 0.4, 0.15, 1.1, 6.75, 7.3); }
    ves(ps, 'c#c9b48a/0.6', Bc + 0.6, 0.6, 6.75, [[0, 0], [0.25, 0], [0.32, 0.3], [0.25, 0.55], [0.27, 0.6], [0, 0.6]], 18);
  }
  // A library step under the window for the top shelves
  { const st = fr(42.83, 19.9, F1, 1);                       // x → +Y, y → out from the north wall
    st.box(OAKW, -0.65, -0.58, 0.15, 1.25, 0, 1.6); st.box(OAKW, 0.58, 0.65, 0.15, 1.25, 0, 1.6);
    st.box(OAKW, -0.65, 0.65, 0.65, 1.25, 0.78, 0.86, G); st.box(OAKW, -0.65, 0.65, 0.15, 0.7, 1.55, 1.63, G); st.box(OAKW, -0.58, 0.58, 0.15, 0.22, 0.86, 1.55);
    st.soft('linen#9a5a3a', -0.6, 0.6, 0.2, 0.68, 1.63, 1.7, 0.03); st.block(-0.65, 0.65, 0.15, 1.25, 0, 1.6); }
  rug(33.9, 41.4, 18.85, 21.0, F1, 'runner');
  // Pictures at the meeting place at the west end: Larsson's kitchen, Cezanne's apples
  picture(fr(29.6, 22.4, F1, 2), 'larsson_kitchen', 0, 5.3, 2.1, 1.44, { border: 0.13 });
  picture(fr(31.95, 22.4, F1, 2), 'cezanne_basket_of_apples', 0, 5.3, 1.3, 1.04, { border: 0.12 });
}
