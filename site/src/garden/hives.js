// The beehives, in the orchard past the potager: four Langstroth hives in a row, each a different
// soft colour gone a little chalky with the weather, turned to face the morning and the path.
// Each stands on a timber stand with legs and a sloping landing board; a bottom board with its
// entrance reducer; a deep brood box and a super or two, every box a shade apart (they were
// bought one at a time) with hand-holds and a line of propolis at the joins; a telescoping roof
// with a galvanised cap and a brick on top; a hand-painted name board. The nearest, Bramble,
// is open: roof upturned on the grass beside it with a super on it, the crown board leaning on
// the stand, the frames' top bars showing and one frame of capped comb lifted out against an
// upturned crate, where the smoker, the hive tool and the veiled hat are. Lavender and catmint in
// front; a straw skep under its own little shingled roof; and by the path an honesty stall of
// honey with a hand-painted sign, where a visitor can take a jar (E).
//
// K.hives (read by the bees, life.js and others): for each hive { x, y, z } a point just in front
// of its entrance (as before), entrance: { x, y, z } the middle of the entrance slot, yaw the way
// it faces (it faces +z turned by yaw, as a model does: the direction is (sin yaw, 0, cos yaw)).

import * as THREE from 'three';
import { PAINT } from './tools.js';
import { place, ownPlants } from './little_library.js';
import { rng } from './cards.js';

const ROW = { x: 93, z: -101, yaw: -0.64 };           // the row's middle; it faces south-east, toward the orchard path
const W = 0.677, D = 0.828;                           // half the width and depth of a ten-frame box (16¼ by 19⅞ inches)
const STAND = 'c#7d6d5a/1', RAW = 'c#c2a578/0.85', DARK = 'c#1c150e/1', SEAM = 'c#4a3320/1', TIN = 'c#a3a6a1/0.45/1';
const COLOURS = [['e6dcc0', 'Bramble'], ['9cb9b0', 'Clover'], ['d6a48c', 'Linden'], ['d4c47a', 'Marigold']];
const FONT = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
const shade = (hex, k) => { const c = new THREE.Color(parseInt(hex, 16)).multiplyScalar(k); return 'c#' + c.getHexString() + '/0.8'; };

export function buildHives(K) {
  const R = place(K, ROW.x, 0, ROW.z, ROW.yaw), r = rng(4242);
  COLOURS.forEach(([hex, name], i) => {
    const open = i === 0, h = R.sub(-5.4 + i * 3.6, 0, (r() - 0.5) * 0.3, (r() - 0.5) * 0.12);
    const top = hive(h, hex, name, open ? 1 : 1 + (i % 2), open, r);
    const e = h.w(0, 1.39, 0.86), front = h.w(0, 1.6, 1.4);
    K.hives.push({ x: front.x, y: front.y, z: front.z, entrance: { x: e.x, y: e.y, z: e.z }, yaw: h.yaw, name });
    h.collide(-0.8, 0.8, -0.95, 1.2, top + 0.6);
    h.keepOut(-0.85, 0.85, -0.95, 1.3);
  });
  bramblesThings(R, K);
  honesty(K);
  skep(K);
  // in front of the hives, where the bees come and go: lavender and catmint
  ownPlants(K, 5150, F => {
    for (let x = -6.6; x <= 6.6; x += 1.1) { const p = R.w(x + (r() - 0.5) * 0.5, 0, 2.5 + (r() - 0.5) * 0.8); F.add(Math.round(x / 1.1) % 3 ? 'lavender' : 'catmint', p.x, p.z, 0.8 + r() * 0.25); }
    for (let x = -6; x <= 6; x += 2.4) { const p = R.w(x, 0, 3.8 + r()); F.add(r() < 0.5 ? 'wildflowers' : 'catmint', p.x, p.z, 0.75); }
  });
}

// One hive in its own frame (front +z); returns the height of its top
function hive(f, hex, name, supers, open, r) {
  // the stand: four legs, rails, and a landing board sloping down to the grass
  for (const x of [-0.58, 0.58]) for (const z of [-0.7, 0.7]) f.box(STAND, x - 0.08, x + 0.08, 0, 1.06, z - 0.08, z + 0.08);
  for (const x of [-0.62, 0.62]) f.box(STAND, x - 0.07, x + 0.07, 1.04, 1.22, -0.86, 0.86);
  for (const z of [-0.8, 0.8]) f.box(STAND, -0.69, 0.69, 1.04, 1.2, z - 0.06, z + 0.06);
  f.box(STAND, -0.5, 0.5, 1.03, 1.08, 1.1, 1.62, { rot: [0.5, 0, 0] });
  // the bottom board, run out in front, and the entrance reducer with its slot
  f.box(shade(hex, 0.8), -0.69, 0.69, 1.22, 1.36, -0.84, 0.98);
  f.box(RAW, -0.64, 0.64, 1.36, 1.44, 0.8, 0.845); f.box(DARK, -0.2, 0.2, 1.362, 1.418, 0.846, 0.85);
  // the boxes: a deep brood box, then shallower supers; each a slightly different shade
  let y = 1.44;
  const sizes = [0.8, ...Array(supers).fill(0.55)];
  sizes.forEach((ht, k) => {
    const last = k === sizes.length - 1, c = shade(hex, 0.93 + r() * 0.12), dx = (r() - 0.5) * 0.02, dz = (r() - 0.5) * 0.02;
    if (open && last) {                     // the open box: four walls, the frames' top bars inside
      f.box(c, -W + dx, W + dx, y, y + ht - 0.012, -D + dz, -D + 0.06 + dz); f.box(c, -W + dx, W + dx, y, y + ht - 0.012, D - 0.06 + dz, D + dz);
      for (const s of [-1, 1]) f.box(c, s * W - (s > 0 ? 0.06 : 0) + dx, s * W + (s < 0 ? 0.06 : 0) + dx, y, y + ht - 0.012, -D + dz, D + dz);
      f.box(DARK, -W + 0.06, W - 0.06, y + ht - 0.3, y + ht - 0.28, -D + 0.06, D - 0.06);
      for (let b = 0; b < 10; b++) {
        if (b === 3) continue;                // the frame lifted out
        const x = -W + 0.12 + b * 0.126;
        f.box(RAW, x - 0.04, x + 0.04, y + ht - 0.07, y + ht - 0.03, -D + 0.02, D - 0.02);
        f.box('c#9a7432/0.6', x + 0.04, x + 0.085, y + ht - 0.26, y + ht - 0.07, -D + 0.12, D - 0.12);       // comb between the bars
        if (b % 3 === 1) f.box('c#d8b860/0.5', x - 0.05, x + 0.02, y + ht - 0.035, y + ht - 0.015, -0.2 + b * 0.05, 0.1 + b * 0.05);       // a little burr comb
      }
    } else f.box(c, -W + dx, W + dx, y, y + ht - 0.012, -D + dz, D + dz);
    if (!(open && last)) f.box(SEAM, -W + 0.01, W - 0.01, y + ht - 0.013, y + ht + 0.001, -D + 0.01, D - 0.01);
    // hand-holds on both sides and at the back: a dark recess with a lip of paint over it
    const hy = y + ht * 0.62;
    for (const s of [-1, 1]) { f.box(SEAM, s * W - 0.004, s * W + 0.004, hy - 0.04, hy + 0.035, -0.2, 0.2); f.box(c, s * W - 0.012, s * W + 0.012, hy + 0.035, hy + 0.06, -0.22, 0.22); }
    f.box(SEAM, -0.2, 0.2, hy - 0.04, hy + 0.035, -D - 0.004, -D + 0.004); f.box(c, -0.22, 0.22, hy + 0.035, hy + 0.06, -D - 0.012, -D + 0.012);
    if (k === 0) f.box(shade(hex, 0.62), -W - 0.003, W + 0.003, y, y + 0.05, -D - 0.003, D + 0.003);      // weathered at the foot
    y += ht;
  });
  // its name, painted on a little board on the top box
  f.box('c#efe4c8/0.9', -0.27, 0.27, y - 0.33, y - 0.17, D + 0.005, D + 0.02);
  f.sign((g, w, h) => { g.fillStyle = '#efe4c8'; g.fillRect(0, 0, w, h); g.fillStyle = '#3d3a2e'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `italic 46px ${FONT}`; g.fillText(name, w / 2, h / 2 + 3); g.fillStyle = '#d8a830'; g.beginPath(); g.ellipse(22, h / 2, 8, 6, 0, 0, 7); g.fill(); g.beginPath(); g.ellipse(w - 22, h / 2, 8, 6, 0, 0, 7); g.fill(); }, 300, 88, 0.52, 0.15, 0, y - 0.25, D + 0.022);
  if (open) return y;
  // the telescoping roof: a painted rim over the top box, a galvanised cap, a brick to keep it on
  const rim = shade(hex, 0.9), X = W + 0.08, Z = D + 0.08;
  for (const s of [-1, 1]) { f.box(rim, s * (W + 0.02), s * X, y - 0.2, y + 0.06, -Z, Z); f.box(rim, -X, X, y - 0.2, y + 0.06, s * (D + 0.02), s * Z); }
  f.box(rim, -X, X, y + 0.0, y + 0.06, -Z, Z);
  f.box(TIN, -X - 0.02, X + 0.02, y + 0.06, y + 0.085, -Z - 0.02, Z + 0.02);
  for (const s of [-1, 1]) { f.box(TIN, s * (X + 0.005), s * (X + 0.025), y - 0.02, y + 0.085, -Z - 0.02, Z + 0.02); f.box(TIN, -X - 0.02, X + 0.02, y - 0.02, y + 0.085, s * (Z + 0.005), s * (Z + 0.025)); }
  f.box('brick', -0.33, 0.33, y + 0.085, y + 0.27, -0.16, 0.16, { rot: [0, 0.3 + r() * 0.6, 0] });
  return y + 0.27;
}

// Bramble's things: her roof upturned on the grass with a super on it, the crown board against
// the stand, an upturned crate with the smoker, the hive tool, the veiled hat, a frame of comb
function bramblesThings(R, K) {
  const hex = COLOURS[0][0];
  const g = R.sub(-7.35, 0, 0.25, 0.25), X = W + 0.08, Z = D + 0.08;
  g.box(TIN, -X - 0.02, X + 0.02, 0.01, 0.035, -Z - 0.02, Z + 0.02);
  for (const s of [-1, 1]) { g.box(shade(hex, 0.88), s * (W + 0.02), s * X, 0.035, 0.29, -Z, Z); g.box(shade(hex, 0.88), -X, X, 0.035, 0.29, s * (D + 0.02), s * Z); }
  g.box(shade(hex, 0.98), -W, W, 0.29, 0.83, -D, D);
  for (let b = 0; b < 10; b++) { const x = -W + 0.12 + b * 0.126; g.box(RAW, x - 0.04, x + 0.04, 0.83, 0.86, -D + 0.02, D - 0.02); }
  g.collide(-0.85, 0.85, -1, 1, 1.2);
  // the crown board, leaning on the back of the stand
  const cb = R.sub(-5.4, 0, -1.12, 0, -0.32);
  cb.box(RAW, -0.7, 0.7, 0, 1.68, -0.03, 0.03); cb.box(DARK, -0.12, 0.12, 0.78, 0.9, 0.031, 0.036);
  // the crate, upside down, behind and to the side
  const c = R.sub(-7.6, 0, -2.0, -0.35), CR = 'c#a48c6a/1';
  for (const x of [-0.62, 0.62]) for (const z of [-0.47, 0.47]) c.box(CR, x - 0.06, x + 0.06, 0, 1.0, z - 0.06, z + 0.06);
  for (const y of [0.08, 0.42, 0.76]) { for (const s of [-1, 1]) { c.box(CR, -0.62, 0.62, y, y + 0.2, s * 0.5 - 0.02, s * 0.5 + 0.02); c.box(CR, s * 0.65 - 0.02, s * 0.65 + 0.02, y, y + 0.2, -0.47, 0.47); } }
  for (let x = -0.6; x < 0.65; x += 0.31) c.box(CR, x, x + 0.25, 0.97, 1.02, -0.52, 0.52);
  c.collide(-0.7, 0.7, -0.55, 0.55, 1.6);
  // the smoker: a tin can with a cone and spout, bellows of wood and leather beside it
  const STEEL = 'c#8e908b/0.4/1';
  c.cyl(STEEL, -0.32, 1.02, 1.5, 0.05, 0.14, 0.14, 12); c.lathe(STEEL, -0.32, 1.5, 0.05, [[0.14, 0], [0.12, 0.08], [0.05, 0.18], [0.04, 0.26], [0.01, 0.26]], 12);
  c.tube(STEEL, [-0.32, 1.72, 0.05], [-0.42, 1.8, 0.12], 0.035, 6);
  for (let y = 1.08; y < 1.48; y += 0.08) c.cyl('c#5a5c58/0.5/1', -0.32, y, y + 0.012, 0.05, 0.16, 0.16, 12);       // the heat shield's bands
  c.box('c#7a5a3a/0.9', -0.16, -0.13, 1.05, 1.42, -0.05, 0.15, { rot: [0, 0, -0.12] }); c.box('c#7a5a3a/0.9', -0.06, -0.03, 1.05, 1.42, -0.05, 0.15, { rot: [0, 0, 0.1] });
  c.box('c#5b3e28/0.95', -0.13, -0.06, 1.08, 1.36, -0.03, 0.13);
  // the hive tool: a flat steel bar, its end painted red
  c.box(STEEL, -0.05, 0.42, 1.02, 1.035, 0.3, 0.38, { rot: [0, 0.4, 0] }); c.box('c#b3352a/0.5', 0.25, 0.48, 1.024, 1.04, 0.22, 0.31, { rot: [0, 0.4, 0] });
  // the hat with its veil
  c.lathe('c#ece6d6/0.9', 0.32, 1.02, -0.15, [[0.21, 0.32], [0.38, 0.31], [0.36, 0.33], [0.21, 0.36], [0.2, 0.5], [0.17, 0.6], [0.01, 0.62]], 16);
  c.lathe('c#2e302b/0.95', 0.32, 1.02, -0.15, [[0.3, 0.0], [0.27, 0.12], [0.215, 0.33]], 16);
  // a frame of capped comb, lifted out and leaning against the crate
  const fr = R.sub(-6.55, 0, -1.42, -0.35 + Math.PI, -0.22);
  fr.box(RAW, -0.8, 0.8, 0.74, 0.8, -0.02, 0.02); fr.box(RAW, -0.62, 0.62, 0.0, 0.04, -0.015, 0.015);
  for (const s of [-1, 1]) fr.box(RAW, s * 0.6, s * 0.64, 0, 0.74, -0.02, 0.02);
  fr.box('c#9a7432/0.6', -0.6, 0.6, 0.04, 0.74, -0.012, 0.012);
  fr.sign((gx, w, h) => {
    gx.fillStyle = '#8f6526'; gx.fillRect(0, 0, w, h);
    const s = 9, hgt = s * Math.sqrt(3);
    for (let row = 0; row * hgt * 0.5 < h + hgt; row++) for (let col = 0; col * s * 3 < w + s * 3; col++) {
      const cx = col * s * 3 + (row % 2) * s * 1.5, cy = row * hgt * 0.5, d = Math.hypot((cx - w * 0.5) / w, (cy - h * 0.4) / h);
      gx.fillStyle = d < 0.36 ? '#e9cf86' : d < 0.42 ? '#d9a948' : '#a8752e';
      gx.beginPath(); for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; gx.lineTo(cx + Math.cos(a) * s * 0.88, cy + Math.sin(a) * s * 0.88); } gx.fill();
    }
  }, 400, 240, 1.2, 0.7, 0, 0.39, 0.016);
}

// The honesty stall by the path: jars on two shelves under a little roof, a tin for coins
function honesty(K) {
  const s = place(K, 79.1, 0, -100.4, -0.98), BOX = 'c#c9b8d6/0.8', BOARD = 'c#efe4c8/0.9';
  s.box('timber', -0.14, 0.14, 0, 2.55, -0.14, 0.14);
  s.box(BOX, -0.85, 0.85, 2.55, 2.63, -0.4, 0.42);                                           // floor
  for (const x of [-0.85, 0.85]) s.box(BOX, x - 0.04, x + 0.04, 2.63, 3.95, -0.4, 0.4);
  s.box(BOX, -0.85, 0.85, 2.63, 3.95, -0.42, -0.36); s.box(BOX, -0.81, 0.81, 3.26, 3.3, -0.36, 0.36);
  for (const sd of [-1, 1]) {                                                                  // a little gabled roof, mossy
    const g = new THREE.BoxGeometry(1.2, 0.06, 1.1).toNonIndexed(); g.rotateZ(-sd * 0.62); g.translate(sd * 0.48, 4.29, 0.02); s.geo('c#6f5a48/1', g);
  }
  s.prism(BOX, [[-0.89, 3.95], [0.89, 3.95], [0, 4.6]], -0.42, -0.36);
  s.sphere(PAINT.moss, 0.4, 4.42, 0.25, 0.16, 0.3, 1, 1.4, 1);
  const jar = (x, y, z, k) => {
    s.lathe('c#c98a1e/0.25', x, y, z, [[0.01, 0], [0.11, 0], [0.12, 0.02], [0.12, 0.24], [0.1, 0.27], [0.09, 0.3]], 12);
    s.cyl(k % 2 ? 'c#b3352a/0.9' : 'c#e8dfcc/0.9', x, y + 0.29, y + 0.33, z, 0.13, 0.12, 12);
    s.box('c#efe4c8/0.9', x - 0.07, x + 0.07, y + 0.09, y + 0.18, z + 0.115, z + 0.125);
  };
  [-0.6, -0.3, 0.02, 0.32].forEach((x, k) => jar(x, 2.63, 0.05 + (k % 2) * 0.08, k));
  [-0.55, -0.22, 0.12].forEach((x, k) => jar(x, 3.3, 0.04, k + 1));
  s.cyl('c#5f7a8a/0.5/0.8', 0.55, 3.3, 3.55, 0.05, 0.13, 0.13, 12); s.box(DARK, 0.5, 0.6, 3.55, 3.552, 0.0, 0.03);            // the tin
  // the sign under it: HONEY, and how it works
  s.box(BOARD, -0.62, 0.62, 1.62, 2.38, 0.14, 0.18);
  s.sign((g, w, h) => {
    g.fillStyle = '#efe4c8'; g.fillRect(0, 0, w, h); g.strokeStyle = '#c9963a'; g.lineWidth = 6; g.strokeRect(12, 12, w - 24, h - 24);
    g.fillStyle = '#7a4f1c'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `italic 96px ${FONT}`; g.fillText('Honey', w / 2, 96);
    g.fillStyle = '#4a3d2c'; g.font = `italic 32px ${FONT}`; g.fillText('from the orchard hives', w / 2, 168);
    g.fillText('take a jar, leave a coin', w / 2, 222); g.fillText('(or a kind word)', w / 2, 262);
    const bee = (x, y, a) => { g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = 'rgba(220,226,240,.9)'; for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(sd * 6, -11, 9, 6, sd * 0.5, 0, 7); g.fill(); } g.fillStyle = '#e0aa28'; g.beginPath(); g.ellipse(0, 0, 15, 10, 0, 0, 7); g.fill(); g.fillStyle = '#2a2420'; g.fillRect(-5, -9, 4, 18); g.fillRect(4, -9, 4, 18); g.restore(); };
    bee(70, 70, -0.4); bee(w - 66, 96, 0.3);
    g.strokeStyle = '#8a7a5a'; g.setLineDash([4, 7]); g.lineWidth = 2; g.beginPath(); g.moveTo(84, 82); g.bezierCurveTo(130, 140, 60, 150, 110, 110); g.stroke(); g.setLineDash([]);
  }, 420, 300, 1.2, 0.74, 0, 2.0, 0.185);
  s.collide(-0.9, 0.9, -0.45, 0.45, 4.6);
  s.keepOut(-1, 1, -0.6, 0.8);
  const at = s.w(0, 3.0, 0.45);
  const LINES = ['You take a jar of honey. It is still a little warm from the sun.', 'Another jar. The bees, who did the work, do not seem to mind.', 'Clover and apple blossom, mostly. Spread it thickly.'];
  let n = 0;
  K.setups.push(ctx => ctx.interact.push({ x: at.x, y: at.y, z: at.z, reach: 6, size: 0.8, label: () => 'take a jar of honey', act: () => window.houseUI?.toast?.(LINES[n++ % LINES.length]) }));
  ownPlants(K, 8818, F => { for (const [x, z, k] of [[-1.1, 0.3, 'catmint'], [1.1, 0.1, 'lavender'], [0.6, -0.8, 'wildflowers']]) { const p = s.w(x, 0, z); F.add(k, p.x, p.z, 0.75); } });
}

// The skep, for the look of it, under a little shingled roof on a stone plinth
function skep(K) {
  const s = place(K, 95.5, 0, -84, -1.4), R0 = 'c#6f5a48/1';
  s.box(PAINT.stoneDark, -1.0, 1.0, 0, 1.6, -0.8, 0.8); s.box(PAINT.stone, -1.15, 1.15, 1.6, 1.75, -0.95, 0.95);
  for (const x of [-0.95, 0.95]) s.box('timber', x - 0.09, x + 0.09, 1.75, 3.9, -0.7, -0.52);
  for (const x of [-0.95, 0.95]) s.box('timber', x - 0.09, x + 0.09, 1.75, 3.9, 0.52, 0.7);
  for (const sd of [-1, 1]) { const g = new THREE.BoxGeometry(1.25, 0.08, 2.1).toNonIndexed(); g.rotateZ(-sd * 0.62); g.translate(sd * 0.52, 4.25, 0); s.geo(R0, g); }
  s.box('timber', -0.06, 0.06, 4.55, 4.66, -1.08, 1.08);
  for (const z of [-0.62, 0.62]) s.prism('timber', [[-1.05, 3.9], [1.05, 3.9], [0, 4.6]], z - 0.04, z + 0.04);
  s.lathe(PAINT.straw, 0, 1.75, 0, [[0.62, 0], [0.66, 0.25], [0.62, 0.6], [0.5, 0.92], [0.3, 1.14], [0.01, 1.2]], 16);
  for (let k = 0; k < 9; k++) { const t = k / 9, rr = 0.64 - t * t * 0.55, y = 1.79 + t * 1.12; const g = new THREE.TorusGeometry(rr, 0.035, 4, 18); g.rotateX(Math.PI / 2); g.translate(0, y, 0); s.geo('c#bd9a50/1', g); }
  s.box(DARK, -0.12, 0.12, 1.76, 1.86, 0.6, 0.66);                                        // its doorway
  s.collide(-1.2, 1.2, -1.0, 1.0, 4.7);
}
