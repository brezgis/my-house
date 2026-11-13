// Dining room  (X 27.8-42.8, Y 0.5-16.3): a long table people live at.
//   Ways through: the cased opening from the hall (X 27.8, Y 0.9-4.9) to the door to the
//   coffee bar (Y 16.3, X 29.2-31.9) runs along the hall wall, X 27.8-31.1; keep it clear.
//   Wainscot with a plate rail (top at 5.14, 0.3 deep) on every wall.
import * as THREE from 'three';
import { LINEN, OAT, SAGE, RUST, NAVY, MUSTARD, CREAM, ROSE, ENAMEL, BRASS, STEEL, BLACK, GREEN, MARBLE, DARK, WHITE, G, DIRS } from '../kit.js';
import { wx, wz } from '../builder.js';
import { F1, F2 } from '../house.js';
import { OAK } from '../kit/mats.js';
import { props, DRAWN } from './trinkets.js';
import { tools } from './kitchen.js';
import { PLACE as JIG } from '../jigsaw_shapes.js';

// ---- Plates with decals ------------------------------------------------------------------------
// Each decal is drawn on a 256 px canvas whose inscribed circle becomes the plate's round face (0.95 r),
// so the outer rings sit near the rim and the centre motif in the well. The background is the glaze.
const TAU = Math.PI * 2;
const lin = c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4), srgb = c => (c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055);
// A plain colour 'c#rrggbb' is painted at 0.78 of its linear value (builder.js): match that on canvas.
const glazeOnCanvas = hex => '#' + [0, 2, 4].map(i => Math.round(255 * srgb(0.78 * 0.76 * lin(parseInt(hex.slice(i, i + 2), 16) / 255))).toString(16).padStart(2, '0')).join('');
const disc = (g, x, y, r, c) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = c; g.fill(); };
const ring = (g, x, y, r, w, c) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.strokeStyle = c; g.lineWidth = w; g.stroke(); };
const around = (g, n, R, fn, ph = 0) => { for (let i = 0; i < n; i++) { const a = ph + i / n * TAU; g.save(); g.translate(128 + Math.cos(a) * R, 128 + Math.sin(a) * R); g.rotate(a + Math.PI / 2); fn(g, i); g.restore(); } };
const petals = (g, n, len, wid, c, ph = 0) => { g.fillStyle = c; for (let i = 0; i < n; i++) { g.save(); g.rotate(ph + i / n * TAU); g.beginPath(); g.ellipse(0, -len / 2, wid, len / 2, 0, 0, TAU); g.fill(); g.restore(); } };
const PLATES = {
  // vintage-milk-glass style: white body, a small repeating border in harvest gold
  harvest: { body: 'f2efe8', draw(g) { ring(g, 128, 128, 122, 2, '#b98a2a'); ring(g, 128, 128, 98, 1.5, '#b98a2a');
    around(g, 18, 110, (g, i) => { if (i % 2) { petals(g, 4, 9, 3.2, '#c9952a', 0.4); disc(g, 0, 0, 2, '#8a5a1a'); } else { g.fillStyle = '#9a7a2a'; g.beginPath(); g.ellipse(-4, 0, 5, 2.2, 0.5, 0, TAU); g.ellipse(4, 0, 5, 2.2, -0.5, 0, TAU); g.fill(); } });
    petals(g, 6, 16, 5, 'rgba(201,149,42,0.55)'); disc(g, 128, 128, 4, '#b98a2a'); } },
  // avocado and burnt orange: little leaves and dots, very 1974
  avocado: { body: 'f2efe8', draw(g) { ring(g, 128, 128, 121, 3, '#6b7a2a'); ring(g, 128, 128, 97, 1.5, '#6b7a2a');
    around(g, 22, 109, (g, i) => { if (i % 2) disc(g, 0, 0, 4, '#c8642a'); else { g.fillStyle = '#6b7a2a'; g.beginPath(); g.ellipse(0, 0, 3.5, 8, 0, 0, TAU); g.fill(); } }); } },
  // blue cornflower sprays at four points, a thin blue rim line
  cornflower: { body: 'f4f2ec', draw(g) { ring(g, 128, 128, 123, 2, '#3a5aa8');
    around(g, 6, 98, g => { g.strokeStyle = '#5a7a4a'; g.lineWidth = 1.6; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(0, 8); g.quadraticCurveTo(s * 10, 0, s * 18, -6); g.stroke(); }
      for (const [x, y, r] of [[0, -4, 7], [-16, -9, 5], [16, -9, 5]]) { g.save(); g.translate(x, y); petals(g, 8, r, 1.8, '#3f63b8'); disc(g, 0, 0, 1.8, '#26364f'); g.restore(); } }); } },
  // a daisy chain on a green vine
  daisy: { body: 'f2efe8', draw(g) { ring(g, 128, 128, 108, 2.2, '#5d8a3a'); ring(g, 128, 128, 124, 1.2, '#c9952a');
    around(g, 12, 108, (g, i) => { if (i % 2) { g.fillStyle = '#5d8a3a'; g.beginPath(); g.ellipse(6, -5, 6, 2.5, 0.7, 0, TAU); g.fill(); return; } petals(g, 10, 11, 2.6, '#ffffff'); g.strokeStyle = 'rgba(120,120,110,0.5)'; g.lineWidth = 0.6; disc(g, 0, 0, 4, '#e8b52a'); }); } },
  // blue-and-white transferware: a lake, a willow, a little bridge and two birds, scalloped border
  transferScene: { body: 'eef0f2', draw(g) { const B = '#2a4a8a';
    g.strokeStyle = B; g.fillStyle = B; ring(g, 128, 128, 124, 5, B);
    around(g, 28, 114, g => { g.beginPath(); g.arc(0, 0, 6, Math.PI, TAU); g.lineWidth = 2; g.stroke(); disc(g, 0, -2, 1.6, B); });
    ring(g, 128, 128, 104, 1.5, B);
    g.save(); g.beginPath(); g.arc(128, 128, 96, 0, TAU); g.clip();
    g.fillStyle = 'rgba(42,74,138,0.18)'; g.fillRect(30, 150, 200, 80);                                       // the lake
    g.lineWidth = 2; for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(50 + i * 8, 172 + i * 7); g.lineTo(120 + i * 14, 172 + i * 7); g.stroke(); }
    g.lineWidth = 3; g.beginPath(); g.moveTo(80, 150); g.quadraticCurveTo(128, 120, 176, 150); g.stroke();          // the bridge
    for (let x = 92; x < 170; x += 14) { g.beginPath(); g.moveTo(x, 150 - (x > 100 && x < 160 ? 14 : 6)); g.lineTo(x, 152); g.lineWidth = 1.5; g.stroke(); }
    g.lineWidth = 4; g.beginPath(); g.moveTo(70, 150); g.quadraticCurveTo(62, 100, 80, 58); g.stroke();             // the willow
    g.lineWidth = 1.2; for (let i = 0; i < 16; i++) { g.beginPath(); g.moveTo(70 + i * 2.5, 62 + i * 3); g.quadraticCurveTo(90 + i * 3, 70 + i * 2, 96 + i * 3, 110 + i * 3); g.stroke(); }
    g.fillStyle = B; g.fillRect(166, 104, 34, 28); g.beginPath(); g.moveTo(160, 106); g.lineTo(183, 86); g.lineTo(206, 106); g.fill();   // a pavilion
    g.lineWidth = 2; for (const [x, y] of [[150, 60], [176, 50]]) { g.beginPath(); g.moveTo(x - 9, y); g.quadraticCurveTo(x - 4, y - 6, x, y); g.quadraticCurveTo(x + 4, y - 6, x + 9, y); g.stroke(); }
    g.restore(); } },
  // blue-and-white again: a medallion of roses and leaves
  transferFloral: { body: 'eef0f2', draw(g) { const B = '#2a4a8a';
    ring(g, 128, 128, 123, 6, B); ring(g, 128, 128, 112, 1.2, B);
    around(g, 12, 100, (g, i) => { g.fillStyle = B; g.beginPath(); g.ellipse(0, 0, 9, 4, 0, 0, TAU); g.fill(); if (i % 2) { disc(g, 0, -10, 4, B); } });
    for (let k = 0; k < 3; k++) { g.save(); g.translate(128 + Math.cos(k * 2.1) * 34, 128 + Math.sin(k * 2.1) * 34); for (let j = 0; j < 4; j++) ring(g, 0, 0, 4 + j * 4, 2.2, B); g.restore(); }
    g.fillStyle = B; around(g, 6, 58, g => { g.beginPath(); g.ellipse(0, 0, 5, 12, 0, 0, TAU); g.fill(); }); } },
  // pressed "depression glass": tinted, with radial ribs and a lacy moulded rim
  depPink: { body: 'e8b4bf', glass: true, draw(g) { pressed(g, '#f6d6dc', '#c98a98'); } },
  depGreen: { body: 'b9d9b0', glass: true, draw(g) { pressed(g, '#dcf0d4', '#86ae7a'); } },
  // the one silly plate: a souvenir of Sir Reginald, the house's robot vacuum
  reginald: { body: 'f0e6cc', draw(g) {
    ring(g, 128, 128, 124, 4, '#b08d4a'); ring(g, 128, 128, 117, 1.2, '#b08d4a');
    g.strokeStyle = '#5d7a3a'; g.fillStyle = '#5d7a3a';                                            // laurel wreath
    for (const s of [-1, 1]) { g.lineWidth = 2; g.beginPath(); g.arc(128, 128, 82, Math.PI / 2 + s * 0.35, Math.PI / 2 + s * 2.5, s < 0); g.stroke();
      for (let i = 0; i < 9; i++) { const a = Math.PI / 2 + s * (0.5 + i * 0.22); g.save(); g.translate(128 + Math.cos(a) * 82, 128 + Math.sin(a) * 82); g.rotate(a + s * 0.9); g.beginPath(); g.ellipse(0, 0, 9, 3.5, 0, 0, TAU); g.fill(); g.restore(); } }
    disc(g, 128, 132, 40, '#3a3836'); disc(g, 128, 132, 34, '#5a5754'); ring(g, 128, 132, 40, 2, '#c9ccd0');   // Sir Reginald, from above
    disc(g, 116, 124, 5, '#f4f0e6'); disc(g, 140, 124, 5, '#f4f0e6'); disc(g, 117, 125, 2.4, '#17140f'); disc(g, 141, 125, 2.4, '#17140f');
    g.strokeStyle = '#f4f0e6'; g.lineWidth = 2.4; g.beginPath(); g.arc(128, 136, 10, 0.3, Math.PI - 0.3); g.stroke();
    g.fillStyle = '#a8261c'; g.beginPath(); g.moveTo(128, 154); g.lineTo(116, 148); g.lineTo(116, 160); g.closePath(); g.moveTo(128, 154); g.lineTo(140, 148); g.lineTo(140, 160); g.closePath(); g.fill();   // bow tie
    g.fillStyle = '#d9b35a'; g.beginPath(); g.moveTo(110, 96); g.lineTo(114, 84); g.lineTo(121, 92); g.lineTo(128, 80); g.lineTo(135, 92); g.lineTo(142, 84); g.lineTo(146, 96); g.closePath(); g.fill();   // a little crown
    g.fillStyle = '#2a3549'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = 'bold 17px Georgia, serif'; g.fillText('SIR REGINALD', 128, 46);
    g.font = 'italic 11px Georgia, serif'; g.fillText('Hero of the Hall Runner', 128, 62);
    g.font = 'bold 10px Georgia, serif'; g.fillText('ONE MILLION CRUMBS', 128, 196); g.font = 'italic 10px Georgia, serif'; g.fillText('Cambridge · 2026', 128, 210); } },
};
function pressed(g, light, dark) {
  for (let i = 0; i < 48; i++) { const a = i / 48 * TAU; g.strokeStyle = i % 2 ? light : dark; g.globalAlpha = 0.55; g.lineWidth = 2.5; g.beginPath(); g.moveTo(128 + Math.cos(a) * 30, 128 + Math.sin(a) * 30); g.lineTo(128 + Math.cos(a) * 92, 128 + Math.sin(a) * 92); g.stroke(); }
  g.globalAlpha = 0.7; ring(g, 128, 128, 30, 3, dark); ring(g, 128, 128, 95, 2, dark);
  around(g, 30, 110, (g, i) => { g.strokeStyle = i % 2 ? light : dark; g.lineWidth = 2; g.beginPath(); g.arc(0, 0, 8, 0, Math.PI); g.stroke(); disc(g, 0, 4, 1.8, light); });   // lace
  g.globalAlpha = 0.35; disc(g, 100, 92, 22, '#ffffff'); g.globalAlpha = 1;                                          // a sheen
}
const decal = key => { const p = PLATES[key], bg = glazeOnCanvas(p.body); return p.fn ??= (g, w, h) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.save(); g.scale(w / 256, h / 256); p.draw(g); g.restore(); }; };

export default function (kit) {
  const { B, fr, world, yawOf, seat, lampAt, model, tableLamp, floorLamp, candle, book, bookRow, bookStack, bookcase, sofa, armchair, bed, table, mug, picture, rug, posy, cabinets, cup, rnd, pick, lamps, seats, candles, models, extras, books, steam, sign, pack, jarCandle } = kit;
  const P = props(kit), K = tools(kit, 51);

  // A flat Corelle-ish plate, standing on the rail or lying down. Its decoration is a round drawn face
  // (life.js: round), 0.95 of the plate across so a thin rim of the plate's own glaze shows round it, lying
  // 0.04 off the plate's base along its own axis (just clear of the raised rim), at the plate's own lean.
  const PR = r => [[0, 0], [r * 0.7, 0], [r * 0.75, 0.008], [r, 0.03], [r * 0.985, 0.036], [r * 0.72, 0.016], [0, 0.016]];
  const face = (f, x, y, z, D, key, o) => { const [a, c] = world(f, x, y); extras.push({ draw: decal(key), cw: 256, ch: 256, x: a, y: f.h + z, z: c, rotY: yawOf(f.dir), w: D, h: D, round: true, rough: 0.25, ...o }); };
  function decoPlate(f, x, y, z, r, key, o = {}) {
    const p = PLATES[key], body = `c#${p.body}/${p.glass ? 0.1 : 0.2}`, D = r * 1.9, OFF = 0.04;
    if (o.stand) {
      const L = 0.05, py = y + r * Math.sin(L) + 0.04, pz = z + r * Math.cos(L);          // leaning back L from upright
      P.lathe(f, body, x, py, pz, PR(r), 32, { rot: [-Math.PI / 2 + L, 0, 0] });
      face(f, x, py + OFF * Math.cos(L), pz + OFF * Math.sin(L), D, key, { tilt: L });
    } else {
      P.lathe(f, body, x, y, z, PR(r), 32);
      face(f, x, y, z + OFF, D, key, { flat: true });
    }
  }

  rug(31.2, 41.4, 4.3, 12.7, F1, 'tabriz');
  // The long trestle table, its south end kept 3 ft off the path from the hall
  const t = fr(36.3, 8.5, F1, 0);
  t.box('fir', -3.6, 3.6, -1.75, 1.75, 2.32, 2.5, G);
  for (const x of [-2.6, 2.6]) { t.box('fir', x - 0.14, x + 0.14, -1.1, 1.1, 0.25, 2.32, G); t.box('fir', x - 0.2, x + 0.2, -1.4, 1.4, 0, 0.25, G); }
  t.box('fir', -2.46, 2.46, -0.1, 0.1, 0.9, 1.25, G); t.block(-3.6, 3.6, -1.75, 1.75, 0, 2.5);
  t.soft(OAT, -2.9, 2.9, -0.55, 0.55, 2.5, 2.52, 0.01);                                 // linen runner
  candle(t, -0.9, 0, 2.52, 0.75); candle(t, 0, 0.05, 2.52, 0.9); candle(t, 0.9, -0.03, 2.52, 0.7);
  // One matching set: oak ladder-backs with cognac leather seats (seat 18.6 in against the 30 in
  // table), carvers with arms at the two ends.
  const CH = { wood: OAK, seat: 'leather#7a4a30', back: 'ladder' };
  for (const x of [-2.2, 0, 2.2]) { kit.diningChair(t, x, -2.2, { ...CH }); kit.diningChair(t, x, 2.2, { ...CH, dq: 2 }); }
  kit.diningChair(t, -4.0, 0, { ...CH, dq: 3, arms: true }); kit.diningChair(t, 4.0, 0, { ...CH, dq: 1, arms: true });

  // ---- What's on the table ----
  const z = 2.52;
  // the fruit bowl: a turned oak bowl of lemons, a pear and a mandarin (built, not scanned: light)
  P.lathe(t, 'oak_light#8a6a48', -2.0, 0.1, z, [[0, 0], [0.28, 0], [0.5, 0.12], [0.62, 0.3], [0.58, 0.31], [0.46, 0.15], [0.26, 0.05], [0, 0.05]], 28);
  K.fruit(t, 'lemon', -2.15, 0.05, z + 0.06); K.fruit(t, 'lemon', -1.85, 0.0, z + 0.06); K.fruit(t, 'pear', -2.25, 0.3, z + 0.06); K.fruit(t, 'orange', -1.85, 0.3, z + 0.06, 0.8); K.fruit(t, 'lemon', -2.0, 0.15, z + 0.24);
  // a laptop left open at the street-side end, the recipe still on screen
  kit.laptop(t.sub(2.5, -1.05, z, 2), 0, 0, 0, { draw: DRAWN.laptop });
  mug(t, 1.85, -1.25, z, 'c#2f4a5a/0.4');
  // a jigsaw, a third done, on a green felt board; the pieces, the loose ones round it and the box lid
  // leaning on the jug are src/jigsaw.js (playable: E), placed by PLACE in src/jigsaw_shapes.js
  t.box('c#4f6a55/0.95', JIG.cx - JIG.bw / 2, JIG.cx + JIG.bw / 2, JIG.cy - JIG.bd / 2, JIG.cy + JIG.bd / 2, z, z + JIG.bz);
  // the post, a book face down, reading glasses
  P.lettersPile(t, -3.0, -1.15, z, 5, 9, 0.3);
  bookStack(t, -1.1, -1.2, z, 2); kit.openBook(t, 0.0, -1.15, z, { cover: 'c#2f4a3a/0.7', turn: 0.15 }); P.glasses(t, 0.75, -1.05, z, -0.4);
  // tea for two on the west side
  P.plate(t, -1.4, 1.15, z, 0.36, 'c#ebe6dc/0.2', { rim: 'c#2f4a7a/0.3' }); P.teapot(t, -1.4, 1.15, z + 0.05, 'c#ebe6dc/0.2');
  P.cupSaucer(t, -2.3, 1.2, z); P.cupSaucer(t, -0.6, 1.3, z);
  P.plate(t, -3.0, 1.1, z, 0.32, 'c#ebe6dc/0.2', { rim: 'c#2f4a7a/0.3' });
  P.lathe(t, 'c#d9a85a/0.8', -3.0, 1.1, z + 0.045, [[0, 0], [0.15, 0], [0.16, 0.06], [0.13, 0.07], [0, 0.05]], 18); t.cyl('c#a8201c/0.25', -3.0, 1.1, z + 0.105, z + 0.118, 0.11, 0.11, 16);   // a jam tart
  // a jug of garden roses at the north end
  model('jug_01', t, 3.05, 0.1, z, 2, { scale: 1.0 });
  P.bouquet(t, 3.05, 0.1, z + 0.55, 0.85, ['c#e8a0a8/0.8', 'c#f2ead8/0.8', 'c#d9667a/0.8', 'c#f0c8b0/0.8'], 14, 12, 0.3);

  // ---- The sideboard against the coffee-bar wall; refreshments laid out for guests on it ----
  // (was a 61k-triangle antique hutch: dark, ornate and heavy; this is the kit's oak sideboard,
  // which suits the trestle table and the chairs, with plates on the rail above it)
  const hf = fr(38.6, 16.24, F1, 2);
  const cz = kit.sideboard(hf, 6.4, { wood: OAK, d: 1.9, h: 3.0, pull: 'bail' });
  model('st_cake_stand', hf, -2.2, 1.05, cz, 0, { scale: 1.0 });
  // macarons on the stand's top tier (the coffee bar has the croissants)
  for (const [dx, dy, c] of [[-0.09, -0.06, 'c#e8b4bf/0.6'], [0.08, -0.07, 'c#c9d8a8/0.6'], [0.0, 0.08, 'c#e8d6a0/0.6'], [-0.1, 0.1, 'c#c8b4d8/0.6'], [0.11, 0.07, 'c#f0e6d6/0.6']]) {
    const x = -2.2 + dx, y = 1.05 + dy, z0 = cz + 0.435;
    hf.cyl(c, x, y, z0, z0 + 0.03, 0.055, 0.06, 14); hf.cyl('c#f4efe4/0.7', x, y, z0 + 0.03, z0 + 0.045, 0.05, 0.05, 14); hf.cyl(c, x, y, z0 + 0.045, z0 + 0.075, 0.06, 0.05, 14);
  }
  P.plate(hf, -1.05, 1.05, cz, 0.42, 'c#ebe6dc/0.2'); model('strawberry_chocolate_cake', hf, -1.05, 1.05, cz + 0.055, 0, { scale: 0.85 });
  P.pitcher(hf, 0.15, 1.02, cz, 'glass', 'c#e8d27a/0.2');                              // lemonade
  for (const [x, y] of [[0.65, 0.92], [0.9, 1.15], [1.15, 0.92], [1.4, 1.15]]) P.glass(hf, x, y, cz);
  for (let i = 0; i < 4; i++) P.plate(hf, 2.0, 1.02, cz + i * 0.035, 0.3, 'c#ebe6dc/0.2', { rim: 'c#6a8a7a/0.3' });
  decoPlate(hf, 2.0, 1.02, cz + 4 * 0.035, 0.3, 'harvest');                              // the top of the stack is a Corelle
  P.folded(hf, 2.65, 1.05, cz, 0.42, 0.42, ['linen#d8ccb0', 'linen#c9a8a0']);              // napkins
  jarCandle(hf, -2.85, 1.0, cz, { label: 'c#c9a8b8/0.6', r: 0.15, tall: 0.32 });

  // ---- Plates on the plate rail (rail top at 5.14 above the floor): Corelle-ish borders,
  // blue-and-white transferware, pressed depression glass, and one souvenir plate ----
  const rail = (f, list) => list.forEach(([x, key]) => decoPlate(f, x, 0.04, 5.15, 0.42, key, { stand: true }));
  rail(fr(27.8, 0, F1, 3), [[-5.75, 'harvest'], [-6.7, 'transferScene'], [-7.65, 'depPink'], [-8.6, 'cornflower'], [-12.6, 'daisy'], [-13.6, 'transferFloral'], [-14.6, 'avocado'], [-15.5, 'depGreen']]);   // hall wall (local x runs -Y)
  rail(fr(42.83, 0, F1, 1), [[1.4, 'cornflower'], [2.4, 'reginald'], [3.4, 'transferScene'], [15.8, 'avocado']]);   // north wall (local x runs +Y)
  rail(fr(0, 0.5, F1, 0), [[28.6, 'transferFloral'], [31.9, 'harvest']]);                     // street wall (local x runs +X)
  rail(fr(0, 16.3, F1, 2), [[-36.3, 'depPink'], [-40.9, 'daisy']]);                            // over the sideboard (local x runs -X)
  // ---- Pictures above the rail ----
  picture(fr(27.8, 10.8, F1, 3), 'larsson', 0, 6.06, 2.1, 1.4, { border: 0.1 });
  picture(fr(42.83, 14.2, F1, 1), 'bruegel_harvesters', 0, 6.07, 2.0, 1.47, { frame: 'c#8a6b33/0.45/0.6', border: 0.12 });
  picture(fr(30.2, 0.5, F1, 0), 'klimt_farm_garden_sunflowers', 0, 6.07, 1.45, 1.47, { frame: 'c#8a6b33/0.45/0.6', border: 0.12 });
  picture(fr(38.6, 16.3, F1, 2), 'larsson_breakfast_birch', 0, 6.07, 2.0, 1.37, { border: 0.1 });   // on the wall, centred over the sideboard

  // ---- An old Craftsman lantern fixture over the table: there, but we don't light it ----
  const fx = t.sub(0, 0, 0), AMBER = 'c#c9a46a/0.25';
  fx.box('fir', -1.05, 1.05, -0.2, 0.2, 8.03, 8.18, G);                                    // ceiling bar the chains hang from
  for (const x of [-0.9, 0.9]) { fx.cyl('c#5a4632/0.45/1', x, 0, 6.65, 8.03, 0.02); fx.box('fir', x - 0.06, x + 0.06, -0.06, 0.06, 7.95, 8.03); }
  fx.box('fir', -1.75, 1.75, -0.12, 0.12, 6.45, 6.65, G);
  for (const x of [-1.25, 0, 1.25]) {
    fx.cyl('c#5a4632/0.45/1', x, 0, 6.1, 6.45, 0.015);
    fx.box('fir', x - 0.32, x + 0.32, -0.32, 0.32, 5.98, 6.1, G); fx.box('fir', x - 0.18, x + 0.18, -0.18, 0.18, 6.1, 6.16);
    fx.box(AMBER, x - 0.22, x + 0.22, -0.22, 0.22, 5.5, 5.98);
    for (const [a, b] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) fx.box('fir', x + a * 0.22 - 0.03, x + a * 0.22 + 0.03, b * 0.22 - 0.03, b * 0.22 + 0.03, 5.45, 5.98);
    fx.box('fir', x - 0.27, x + 0.27, -0.27, 0.27, 5.4, 5.47, G);
  }

  floorLamp(fr(41.6, 1.7, F1), 0, 0); B.block(41.3, 41.9, 1.4, 2.0, F1, F1 + 5.5);       // the lamp has no collider of its own
  kit.pottedPlant(fr(28.55, 15.3, F1), 0, 0, 0, 'snake', { size: 1.2, pot: 'c#2f4a5a/0.35' });                  // in the corner, clear of the door
  B.block(28.2, 28.9, 14.95, 15.65, F1, F1 + 3);
}
