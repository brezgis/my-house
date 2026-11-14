// Little bedroom (no. 4, north-west): X 27.8-42.83, Y 21.2-29.5. Door from the hall at its
// south-west corner (X 27.85-30.25), a glass door out to the sleeping porch (X 27.95-30.55) and a
// door to the dressing room (X 36.2-38.8), both in the back wall; window to the north over the bed.
// A snug den: a single bed piled with cushions, a desk, a tall plant,
// low shelves. The strip from the hall door to the porch door, and the way to the dressing room,
// stay clear.
import { LINEN, OAT, SAGE, RUST, NAVY, MUSTARD, CREAM, ROSE, ENAMEL, BRASS, STEEL, BLACK, GREEN, MARBLE, DARK, WHITE, G, DIRS } from '../kit.js';
import { wx, wz } from '../builder.js';
import { F1, F2 } from '../house.js';
import { upstairsProps } from './upstairs_hall.js';

export default function (kit) {
  const { B, fr, world, yawOf, seat, lampAt, model, tableLamp, floorLamp, candle, book, bookRow, bookStack, bookcase, sofa, armchair, bed, table, mug, picture, rug, posy, cabinets, cup, rnd, pick, lamps, seats, candles, models, extras, books, steam } = kit;
  const P = upstairsProps(kit, 4);
  rug(32.7, 38.4, 22.6, 27.0, F2, 'tabriz');

  // ---- The bed along the north wall under the window, heaped like a daybed ----
  const lb = fr(40.6, 21.2, F2, 0);                                    // head to the hall wall, foot toward the back
  model('oak_mission_bed_twin_procedural', lb, 0, 3.56, 0, 0, { seat: 2.0, collide: true });
  // a soft rust throw across the foot, folded double, its ends hanging down the sides (it lies over the model's own flat one)
  kit.throwBlanket(lb, -1.81, 1.81, 4.66, 6.46, 2.36, 'wool#b9785c', { over: 'foot', drop: { l: 0.6, r: 0.5, f: 0.12, b: 0.12 } });
  // cushions along the window side, so it reads as a sofa by day
  // (stuffed kit cushions leaning on the wall, not boxes)
  for (const [y, c, s] of [[1.45, 'linen#2a3549', 1.3], [2.85, 'linen#b48530', 1.2], [4.2, 'velvet#96492f', 1.15], [5.5, 'linen#7a9a6a', 1.25]]) kit.cushion(lb, 1.38, y, y > 4.6 ? 2.42 : 2.12, s, s * 0.9, c, { tilt: 0.28, thick: 0.42, turn: Math.PI / 2 });
  kit.cushion(lb, 0, 0.62, 2.12, 2.3, 1.15, 'linen#efe8d8', { tilt: 0.35, thick: 0.45 });
  // a book left face down (the bed's own rust throw is across the foot: no second blanket)
  P.openBook(lb.sub(-0.3, 3.6, 2.27, 0), 0, 0, 0, 'c#6b2a25/0.7');
  // little lights strung along the wall over the bed
  P.bulbs(fr(39.0, 21.25, F2, 0), [0, 0.05, 6.6], [3.6, 0.05, 6.6], 12, 0.35);
  P.bulbs(fr(42.25, 21.63, F2, 0), [0, 0.0, 6.6], [0, 6.8, 6.6], 16, 0.3);
  lampAt(fr(41.0, 24.5, F2), 0, 0, 6.2, 0.25);
  // a watercolour of boats on the Charles, pinned up over the bed head
  kit.sign(fr(40.6, 21.2, F2, 0), 0, 0.03, 5.3, 1.3, 1.0, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#cfe0ea'); sky.addColorStop(0.55, '#f2e6d0'); sky.addColorStop(0.56, '#6f9ab0'); sky.addColorStop(1, '#3d6a80'); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    g.fillStyle = '#8a9a7b'; g.fillRect(0, h * 0.5, w, h * 0.06);
    for (const [x, s, c] of [[70, 1, '#f4efe2'], [170, 0.8, '#e8c8a0'], [235, 0.6, '#f4efe2']]) { g.fillStyle = '#3a2e26'; g.fillRect(x - 30 * s, h * 0.66, 60 * s, 8 * s); g.fillStyle = c; g.beginPath(); g.moveTo(x, h * 0.66); g.lineTo(x, h * 0.66 - 70 * s); g.lineTo(x + 34 * s, h * 0.66 - 4); g.fill(); }
    g.strokeStyle = '#f4efe2'; g.lineWidth = 10; g.strokeRect(0, 0, w, h);
  }, { cw: 300, ch: 240 });
  for (const x of [-0.6, 0.6]) fr(40.6, 21.2, F2, 0).cyl('c#b8504a/0.4', x, 0.04, 5.75, 5.78, 0.03, 0.03, 8);

  // ---- Bedside: a small table and lamp, a stack of comics, a glass of water ----
  const ns = fr(38.15, 21.26, F2, 0);                                  // clear of the baseboard
  const nh = kit.nightstand(ns, { w: 1.3, d: 1.0, h: 1.6 });
  tableLamp(ns, -0.15, 0.6, nh, 'c#4f4a46/0.4'); bookStack(ns, 0.3, 0.4, nh, 2); P.glassOfWater(ns, 0.4, 0.82, nh);

  // ---- A tall plant between the bookcase and the bedside table ----
  { const fg = fr(36.85, 21.75, F2); P.fig(fg, 0, 0, 0, { size: 0.72, dir: 1.57, spread: 1.1 }); fg.block(-0.4, 0.4, -0.4, 0.4, 0, 3.5); }

  // ---- The low bookcase on the hall wall, east of the television ----
  const bc = fr(35.0, 21.26, F2, 0);                                     // faces into the room; X 33.85-36.15
  bookcase(bc, 2.3, 2.9, { d: 1.0, wood: 'oak_light#a3825c' });   // the same oak as the desk
  const bt = 2.9 + 0.125;                                               // the top of its cornice
  P.pothos(bc, -0.62, 0.5, bt, { size: 0.8, dir: 1.57, spread: 2.0, trail: 1.5 });
  model('si_stereoscope', bc, -0.05, 0.5, bt, 0, { turn: 0.35, scale: 0.85 });    // a Victorian stereoscope
  P.photo(bc, 0.45, 0.45, bt, P.snap(['#d8e4ec', '#f0e8d8'], '#a8b890', 2), 0.42, 0.52);
  kit.jarCandle(bc, 0.88, 0.62, bt, { label: 'c#4f7f86/0.6', r: 0.13, tall: 0.28 });

  // ---- A desk on the back wall between the flue breast and the dressing-room door; Hokusai's cranes over it ----
  const dk = fr(34.6, 29.5, F2, 2);                                     // faces the hall wall; X 33.1-36.1
  P.legs(dk, -1.5, 1.5, 0.05, 1.85, 2.5, 'oak_light#a3825c', { leg: 0.15, shelf: 0.5 });
  tableLamp(dk, 0.95, 0.62, 2.5, 'c#b48530/0.4');
  bookStack(dk, -0.95, 0.45, 2.5, 3); P.openBook(dk, 0.0, 1.15, 2.5, 'c#4f7f86/0.6');
  mug(dk, 0.75, 1.4, 2.5, 'c#b8504a/0.4');
  for (let i = 0; i < 7; i++) book(dk, -1.3 + i * 0.12, -1.3 + i * 0.12 + 0.1, 0.15, 0.75, 0.57, 1.3 + (i % 3) * 0.06);   // books on the low shelf
  kit.diningChair(dk, 0.0, 2.35, { dq: 2, back: 'spindle' });
  picture(dk, 'hokusai_cranes_pine', 0, 5.2, 1.0, 2.17, { frame: BLACK, border: 0.07, mat: 0.18 });

  // ---- The television, on a low oak console standing out from the hall wall, facing the bed across the room ----
  // (its back to the strip from the hall door to the porch door, which stays clear; the way into the room
  // passes between its north end and the flue breast, 2.9 ft)
  const tv = fr(31.0, 23.1, F2, 3);                                    // faces the bed; Y 21.4-24.8
  const th = kit.console(tv, 3.4, { d: 1.2, h: 1.75 });
  tv.box('c#1d1a17/0.5', -0.55, 0.55, 0.35, 0.85, th, th + 0.03);           // stand foot
  tv.box('c#1d1a17/0.5', -0.06, 0.06, 0.5, 0.56, th + 0.03, th + 0.6);     // neck
  const z0 = th + 0.3, SW = 3.6, SH = 2.03, BZ = 0.05;
  tv.box('c#1d1a17/0.4', -SW / 2 - BZ, SW / 2 + BZ, 0.56, 0.66, z0, z0 + SH + 2 * BZ);   // the set: a thin dark slab
  tv.box('c#0b0a09/0.15', -SW / 2, SW / 2, 0.66, 0.665, z0 + BZ, z0 + BZ + SH);          // its screen face (picture drawn by the lead)
  { const [x, z] = world(tv, 0, 0.685); (kit.spots ??= []).push({ action: 'tv', x, y: F2 + z0 + BZ + SH / 2, z, rotY: yawOf(tv.dir), w: SW, h: SH }); }
  kit.remote(tv, 1.2, 0.85, th); bookStack(tv, -1.25, 0.6, th, 2);
  seat(fr(39.25, 23.1, F2, 1), 0, 0, 2.0, 'sit and watch');

  // ---- On the floor: a big cushion by the bed ----
  const fc = fr(37.95, 25.4, F2); fc.cushion('linen#4f7f86', -0.65, 0.65, -0.65, 0.65, 0.0, 0.56, 0.22, { crown: 0.07, bulge: 0.04, welt: 0.012, sag: [[0.1, -0.1, 0.03, 0.6]] });
}
