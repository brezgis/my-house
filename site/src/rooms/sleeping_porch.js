// Sleeping porch (1910 addition): X 19.5-30.8, Y 30.0-39.2, a shingled parapet 2.9 high with
// screens above on three sides. The glass door from the little bedroom is in the house wall at
// X 27.95-30.55; the bath's high window is above the cot. Made for summer nights: an iron cot and
// a daybed made up with quilts, lanterns, string lights, ferns hanging from the beams, a telescope
// pointed out through the back screen, a little table with books and a thermos.
import { LINEN, OAT, SAGE, RUST, NAVY, MUSTARD, CREAM, ROSE, ENAMEL, BRASS, STEEL, BLACK, GREEN, MARBLE, DARK, WHITE, G, DIRS } from '../kit.js';
import { wx, wz } from '../builder.js';
import { F1, F2 } from '../house.js';
import { upstairsProps } from './upstairs_hall.js';

export default function (kit) {
  const { B, fr, world, yawOf, seat, lampAt, model, tableLamp, floorLamp, candle, book, bookRow, bookStack, bookcase, sofa, armchair, bed, table, mug, picture, rug, posy, cabinets, cup, rnd, pick, lamps, seats, candles, models, extras, books, steam } = kit;
  const P = upstairsProps(kit, 8);
  const IRON = 'c#2b2724/0.55/0.7', TOP = 7.56;
  rug(22.9, 27.4, 30.6, 36.6, F2, 'kilim');

  // ---- The iron cot against the house wall, made up with a patchwork quilt ----
  const ct = fr(21.26, 30.25, F2, 0);                                    // head to the house wall (clear of the bath window's sill), foot to the back
  const CW = 3.1, CL = 6.9;
  for (const [x, y, h] of [[-CW / 2, 0.1, 3.5], [CW / 2, 0.1, 3.5], [-CW / 2, CL, 2.7], [CW / 2, CL, 2.7]]) { ct.cyl(IRON, x, y, 0, h, 0.055, 0.055, 10); ct.cyl(BRASS, x, y, h, h + 0.12, 0.08, 0.05, 12); }
  for (const [y, h, lo] of [[0.1, 3.4, 1.0], [CL, 2.6, 1.0]]) {
    P.rod(ct, IRON, [-CW / 2, y, h], [CW / 2, y, h], 0.04, 8); P.rod(ct, IRON, [-CW / 2, y, lo], [CW / 2, y, lo], 0.035, 8);
    for (let x = -CW / 2 + 0.3; x < CW / 2 - 0.1; x += 0.3) P.rod(ct, IRON, [x, y, lo], [x, y, h], 0.018, 5);
  }
  for (const x of [-CW / 2, CW / 2]) P.rod(ct, IRON, [x, 0.1, 1.0], [x, CL, 1.0], 0.04, 8);
  // soft kit pieces, not boxes: a crowned mattress, the sheet turned down, and the patchwork quilt as real cloth
  // (pieced from the same eight colours) lying over the mattress with some loft and falling in folds down both sides
  ct.cushion('curtain#efe8d8', -CW / 2 + 0.06, CW / 2 - 0.06, 0.18, CL - 0.08, 1.0, 1.72, 0.14, { n: [3, 7, 1], crown: 0.035, bulge: 0.02, welt: 0.012 });   // mattress
  kit.cloth(ct, 'curtain#ece7dc', { cx: 0, cy: 1.95, z: 1.8, a: CW / 2 - 0.03, b: 0.55, l: 0.4, r: 0.4, bk: 0.1, rho: 0.07, folds: 0.03, freq: 1.0, ph: 2, thick: 0.05, res: 0.26 });   // sheet turned down
  kit.cloth(ct, 'linen#c9ad9a', { cx: 0, cy: (2.3 + CL - 0.1) / 2, z: 1.87, a: CW / 2, b: (CL - 0.1 - 2.3) / 2, l: 0.62, r: 0.62, rho: 0.1, folds: 0.06, freq: 0.75, lumps: 0.05, wrinkle: 0.012, ph: 4, thick: 0.06, res: 0.28,
    patch: { size: 0.5, colours: ['linen#b8504a', 'linen#e8d8b8', 'linen#4f7f86', 'linen#c9a24a', 'linen#8a9a7b', 'linen#d8a8a0', 'linen#2a3549', 'linen#efe6d2'] } });
  // pillows: stuffed kit cushions, one lying flat and one propped on the head rail, a teal one in front
  kit.cushion(ct, 0, 0.95, 1.72, 2.3, 1.15, 'curtain#ece7dc', { tilt: 1.35, thick: 0.4 });
  kit.cushion(ct, -0.35, 0.42, 1.78, 1.5, 1.0, 'curtain#ece7dc', { tilt: 0.45, thick: 0.42, turn: 0.08 });
  kit.cushion(ct, 0.55, 0.62, 1.8, 0.95, 0.85, 'linen#4f7f86', { tilt: 0.5, thick: 0.32, turn: -0.15 });
  kit.throwBlanket(ct, -CW / 2 - 0.1, CW / 2 + 0.1, 5.45, 6.6, 1.97, 'wool#efe8d8', { over: 'foot', rho: 0.13 });   // a wool blanket folded across the foot, its ends hanging
  ct.block(-CW / 2, CW / 2, 0.05, CL + 0.05, 0, 1.9);
  seats.push({ x: wx(22.3), y: F2 + 1.84 + 2.45, z: wz(34.2), yaw: Math.atan2(-1, 0), label: 'sit on the cot' });
  picture(fr(20.55, 30.0, F2, 0), 'hokusai_great_wave', 0, 4.75, 1.3, 0.89, { frame: BLACK, border: 0.06, mat: 0.14 });

  // ---- The daybed along the east side, back to the dressing-room wall ----
  const db = fr(30.1, 36.14, F2, 1);                                     // faces west into the porch, clear of the screen's sill cap
  model('vintage_day_bed', db, 0, 1.42, 0, 0, { scale: 0.9, seat: 1.5, collide: true });

  // ---- The telescope (the house's only one), pointed out through the back screen; its tripod is solid ----
  // (smaller than before so the way from the cot to the reading table stays open)
  model('st_telescope', fr(25.45, 37.6, F2), 0, 0, 0, 0, { scale: 0.55, turn: 1.57 }); B.block(24.6, 26.3, 36.6, 38.6, F2, F2 + 3.6);   // its tripod

  // ---- A little table in the corner: books, a thermos, a mug, the hurricane lantern ----
  const tb = fr(21.2, 38.45, F2);
  P.legs(tb, -0.85, 0.85, -0.6, 0.6, 2.2, 'oak_light#7a5a44', { leg: 0.12 });
  bookStack(tb, -0.35, 0.15, 2.2, 3); P.openBook(tb, 0.3, 0.25, 2.2, 'c#6b2a25/0.7');
  tb.cyl('c#4f4a46/0.4/0.5', 0.55, -0.3, 2.2, 3.05, 0.13, 0.13, 14); tb.cyl(STEEL, 0.55, -0.3, 3.05, 3.25, 0.11, 0.11, 12);   // thermos
  mug(tb, 0.15, -0.3, 2.2, 'c#d8d0bd/0.4', true);
  model('Lantern_01', tb, -0.5, -0.32, 2.2, 0, { scale: 0.9 }); lampAt(tb, -0.5, -0.32, 2.6, 0.7);
  { const wb = fr(23.2, 38.6, F2); wb.box('wicker', -0.68, 0.68, -0.5, 0.5, 0, 0.08); for (const [a, b, c, d] of [[-0.68, 0.68, -0.5, -0.45], [-0.68, 0.68, 0.45, 0.5], [-0.68, -0.63, -0.45, 0.45], [0.63, 0.68, -0.45, 0.45]]) wb.box('wicker', a, b, c, d, 0, 0.55); }
  for (const [z, c] of [[0.1, 'linen#b8504a'], [0.28, 'linen#e8d0c8'], [0.46, 'linen#4f7f86']]) fr(23.2, 38.6, F2).soft(c, -0.6, 0.6, -0.42, 0.42, z, z + 0.17, 0.06);   // spare quilts

  // ---- Ferns hanging from the beams, pots along the parapet cap ----
  // (each hangs from a ceiling beam, X 20, 22 ... 30, over the cot, the daybed and the telescope, above head height)
  for (const [X, Y] of [[22.0, 32.8], [28.0, 36.4], [26.0, 37.8]]) {
    const h = fr(X, Y, F2), B0 = 6.15;
    for (const a of [0.5, 2.6, 4.7]) P.rod(h, 'c#a8756f/0.4/0.6', [Math.cos(a) * 0.42, Math.sin(a) * 0.42, B0 + 0.45], [0, 0, TOP - 0.42], 0.008, 3);
    h.cyl('wicker', 0, 0, B0, B0 + 0.45, 0.36, 0.48, 16); h.cyl('c#2a2622/0.9', 0, 0, B0 + 0.45, B0 + 0.465, 0.44, 0.44, 14);
    P.fern(h, 0, 0, B0 + 0.46, { size: 0.72, noPot: true, droop: 1.0, n: 24 });
  }
  for (const [X, k] of [[23.4, 0], [26.3, 1], [27.1, 2]]) {                  // between the screen posts
    const pf = fr(X, 39.32, F2 + 3.04);
    P.snake(pf, 0, 0, 0, { size: [0.45, 0.36, 0.42][k], pot: ['c#b5704f/0.9', 'c#cfcbc4/0.4', 'c#b5704f/0.9'][k] });     // (no trailing pothos: it hung through the sill cap)
  }

  // ---- Pillar candles on a slate by the cot's head (the rocking chair that stood here blocked the way in,
  // and repeated the back porch's; the floor lantern repeated the one on the table) ----
  { const sl = fr(23.2, 30.75, F2); sl.box('c#4f4a46/0.6', -0.45, 0.45, -0.3, 0.3, 0, 0.05);
    kit.pillarCandle(sl, -0.2, 0.0, 0.05, 0.62, 0.13); kit.pillarCandle(sl, 0.12, -0.08, 0.05, 0.42, 0.12); kit.pillarCandle(sl, 0.22, 0.14, 0.05, 0.28, 0.1); }

  // ---- String lights along the plate on the back and west sides ----
  // (strung on a wire just under the screen plates, not floating in front of them)
  P.bulbs(fr(19.7, 39.17, F2, 0), [0, 0, 7.095], [10.3, 0, 7.095], 13, 0.22);
  P.bulbs(fr(19.53, 30.4, F2, 0), [0, 0, 7.095], [0, 8.6, 7.095], 11, 0.22);
  lamps.push({ x: wx(24.5), y: F2 + 6.4, z: wz(37.5), power: 0.7, kind: 'lamp' });
}
