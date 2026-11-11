// Dressing room (over the kitchen): X 31.3-42.83, Y 30.0-35.0, ceiling 7.7 above the floor.
// Door from the little bedroom in the north wall (X 36.2-38.8, swinging in); windows on the back
// wall (X 33.6-40.2), east (Y 31.4-34) and west onto the sleeping porch (Y 31.5-33.9).
// A painted wardrobe whose doors open onto clothes, an open rail of coats and dresses with shoes
// beneath, a dressing table in the east light, a cheval glass, hat boxes, a stool and a pouf.
import { LINEN, OAT, SAGE, RUST, NAVY, MUSTARD, CREAM, ROSE, ENAMEL, BRASS, STEEL, BLACK, GREEN, MARBLE, DARK, WHITE, G, DIRS } from '../kit.js';
import { wx, wz } from '../builder.js';
import { F1, F2 } from '../house.js';
import { upstairsProps } from './upstairs_hall.js';

export default function (kit) {
  const { B, fr, world, yawOf, seat, lampAt, model, tableLamp, floorLamp, candle, book, bookRow, bookStack, bookcase, sofa, armchair, bed, table, mug, picture, rug, posy, cabinets, cup, rnd, pick, lamps, seats, candles, models, extras, books, steam } = kit;
  const P = upstairsProps(kit, 6);
  rug(32.6, 40.0, 32.3, 34.55, F2, 'garden');
  const PAINTED = 'painted_wood#a8a49c', OAKW = 'oak_light#a3825c';

  // ---- The wardrobe, west of the door: the kit's oak wardrobe (doors open onto clothes, jumpers on the shelf,
  // two drawers below), in place of a home-made one in a weathered plank finish ----
  const wd = fr(33.8, 30.0, F2, 0);                                    // back to the wall; X 32.15-35.45, clear of the
  const WW = 3.3, WT = 6.9;                                             // west window and of the door casing (35.62)
  kit.wardrobe(wd, WW, WT, { d: 2.0, kinds: ['shirt', 'dress', 'jacket', 'shirt', 'coat', 'trousers', 'dress'], colours: ['linen#efe8d8', 'linen#b8d0d4', 'wool#2a3549', 'linen#d8d0bd', 'linen#7a3b2e', 'velvet#2f4a3a', 'linen#e8d0c8'] });
  // hat boxes stacked on top, under the ceiling
  P.hatBox(wd, -0.95, 1.0, WT, 0.55, 0.42, 'c#d8d0bd/0.9', 'c#4f7f86/0.6');
  P.hatBox(wd, 0.25, 1.0, WT, 0.5, 0.4, 'c#2a2622/0.6', 'c#c9b48a/0.6');
  P.hatBox(wd, 1.22, 1.1, WT, 0.38, 0.36, 'c#e8d0c8/0.9', 'c#f2efe8/0.6');

  // ---- The open rail, east of the door: coats and dresses, shoes on the shelf below ----
  const rl = fr(40.9, 30.0, F2, 0);
  const IRON = 'c#2b2724/0.55/0.7';
  for (const x of [-1.4, 1.4]) { rl.cyl(IRON, x, 0.95, 0.0, 6.1, 0.04, 0.04, 8); rl.box(IRON, x - 0.04, x + 0.04, 0.1, 1.8, 0.0, 0.06); }
  P.rod(rl, IRON, [-1.4, 0.95, 5.6], [1.4, 0.95, 5.6], 0.03, 8); rl.box(OAKW, -1.45, 1.45, 0.1, 1.8, 6.1, 6.18, G);
  rl.box(OAKW, -1.36, 1.36, 0.15, 1.75, 0.5, 0.57, G);
  kit.clothes(rl, -1.35, 1.35, 0.95, 5.6, { kinds: ['coat', 'coat', 'dress', 'dress', 'jacket'], colours: ['wool#7a3b2e', 'wool#c9ad9a', 'linen#4f4a46', 'linen#e3c99a', 'velvet#5a2e3a', 'wool#2a2622', 'linen#cfcbc4'] });
  for (const [x, c, k] of [[-0.95, 'leather#2a2622', 'boot'], [0.0, 'c#a8756f/0.6', 'heel'], [0.9, 'leather#785028', 'flat']]) P.shoes(rl, x, 1.0, 0.57, c, k);
  for (const [x, c, k] of [[-0.6, 'c#f2efe8/0.6', 'sneaker'], [0.5, 'leather#5a3a28', 'flat']]) P.shoes(rl, x, 1.0, 0.0, c, k);
  P.hatBox(rl, -0.6, 0.95, 6.18, 0.5, 0.48, 'c#cfcbc4/0.9', 'c#7a3b2e/0.6'); kit.hat(rl, 0.65, 0.95, 6.18, 'cloche', 'wool#c9b48a');
  rl.block(-1.45, 1.45, 0.1, 1.8, 0, 6.2);

  // ---- The dressing table in front of the east window ----
  const vt = fr(42.45, 33.4, F2, 1);                                   // faces west; local x runs toward +Y
  P.legs(vt, -1.2, 1.2, 0.05, 1.4, 2.5, OAKW, { leg: 0.13 });
  vt.box(OAKW, -1.05, 1.05, 1.3, 1.36, 2.05, 2.3); vt.box(BRASS, -0.15, 0.15, 1.36, 1.39, 2.15, 2.2);      // drawer
  // a warm brass sconce on the wall beside the window (the other side is curtain): the room's own light after dark
  { const sw = fr(42.826, 33.4, F2, 1); P.sconce(sw, -1.75, 5.5, { power: 0.9 }); }
  // a tilting oval-ish glass on a stand
  const mf = vt.sub(0, 0.3, 2.5, 0);
  for (const x of [-0.62, 0.62]) mf.box(OAKW, x - 0.04, x + 0.04, -0.05, 0.05, 0.0, 1.55);
  mf.box(OAKW, -0.66, 0.66, -0.12, 0.12, 0.0, 0.08);
  P.mirror(mf.sub(0, 0.0, 0, 0), 0, 0.95, 1.05, 1.3, { frame: OAKW, border: 0.07, d: 0.05 });
  for (const s of [-1, 1]) P.rod(mf, BRASS, [s * 0.585, 0.025, 0.95], [s * 0.505, 0.025, 0.95], 0.025, 8);   // the pivots it tilts on
  // cosmetics: lipsticks, a compact, brushes in a cup, perfumes on a mirrored tray, cream, a lotion tube
  const vz = 2.5;
  P.tray(vt, 0.35, 1.05, 0.5, 1.1, vz, 'c#b08d4a/0.35/1');
  P.perfume(vt, 0.5, 0.75, vz + 0.04); P.perfume(vt, 0.75, 0.68, vz + 0.04, { glass: 'c#d8e4ea/0.05', juice: 'c#e8d0c8/0.2', cap: 'c#2a2622/0.2', w: 0.13, h: 0.3 }); P.perfume(vt, 0.92, 0.88, vz + 0.04, { w: 0.12, h: 0.18, cap: 'c#efe8d8/0.2' });
  for (const [x, y, c] of [[-0.38, 0.74, 'c#a8323a/0.4'], [-0.29, 0.8, 'c#c9707a/0.4'], [-0.2, 0.72, 'c#7a3b2e/0.4']]) { vt.cyl(BRASS, x, y, vz, vz + 0.14, 0.03, 0.03, 10); vt.cyl(c, x, y, vz + 0.14, vz + 0.2, 0.022, 0.018, 8); }
  vt.cyl('c#c9a24a/0.2/1', -0.3, 1.15, vz, vz + 0.04, 0.12, 0.12, 18); vt.cyl('c#e8d0c8/0.4', -0.3, 1.15, vz + 0.04, vz + 0.05, 0.1, 0.1, 18);   // a compact
  vt.cyl('c#cfcbc4/0.2', -0.95, 1.05, vz, vz + 0.32, 0.09, 0.1, 12); for (const [dx, c] of [[-0.03, 'c#2a2622/0.4'], [0.02, 'c#c9b48a/0.4'], [0.05, 'c#2a2622/0.4']]) P.rod(vt, c, [-0.95 + dx, 1.05, vz + 0.1], [-0.95 + dx * 4, 1.05 + dx, vz + 0.62], 0.016, 5);
  P.jar(vt, 0.6, 1.25, vz, { r: 0.1, lid: 'c#cfcbc4/0.2/1' }); P.tube(vt, -0.25, 0.55, vz, 'c#e8d0c8/0.4', 'c#b08d4a/0.35/1', 0.45);
  P.jewellery(vt, 0.08, 0.95, vz);
  P.stems(vt, -0.62, 1.15, vz, 'c#f2ead8/0.8', 5, { jar: 'c#b8c4c8/0.2' });
  // the stool, upholstered, tucked toward the table
  const sl = fr(40.45, 33.4, F2);
  for (const [x, y] of [[-0.38, -0.38], [0.3, -0.38], [-0.38, 0.3], [0.3, 0.3]]) sl.box(OAKW, x, x + 0.08, y, y + 0.08, 0, 1.24, G);
  for (const [a, b] of [[-0.38, 0.38], [-0.38, -0.38]]) sl.box(OAKW, -0.36, 0.36, b < 0 ? -0.36 : 0.3, b < 0 ? -0.32 : 0.34, 0.5, 0.56, G);   // stretchers
  sl.soft('linen#a8756f', -0.48, 0.48, -0.48, 0.48, 1.22, 1.55, 0.12); sl.block(-0.48, 0.48, -0.48, 0.48, 0, 1.6);
  seats.push({ x: wx(40.45), y: F2 + 1.55 + 2.45, z: wz(33.4), yaw: Math.atan2(-DIRS[3][0], DIRS[3][1]), label: 'sit at the dressing table' });
  candle(vt, -0.95, 0.42, vz, 0.75);                                    // a taper (a table lamp here put its shade through the glass's stand)

  // ---- South-west corner: hat boxes, a snake plant; Hiroshige's plum garden ----
  // (the tall cheval glass that stood here was taken out: the room is narrow)
  P.hatBox(fr(32.2, 34.45, F2), 0, 0, 0, 0.5, 0.6, 'c#efe8d8/0.9', 'c#2a3549/0.6'); P.hatBox(fr(32.2, 34.45, F2 + 0.6), 0, 0, 0, 0.4, 0.45, 'c#b8504a/0.6', 'c#f2efe8/0.6');
  picture(fr(41.75, 35.0, F2, 2), 'hiroshige_kameido_plum', 0, 5.2, 1.0, 1.45, { frame: BLACK, border: 0.06, mat: 0.15 });
  

  // ---- A pouf (out of the way between the wardrobe and the door), a cardigan thrown over it ----
  const pf = fr(35.8, 34.3, F2);
  pf.cyl('wool#c9ad9a', 0, 0, 0, 1.2, 0.58, 0.58, 22); pf.cyl('wool#c9ad9a', 0, 0, 1.18, 1.25, 0.5, 0.5, 22); pf.block(-0.58, 0.58, -0.58, 0.58, 0, 1.5);
  pf.soft('wool#7a9a6a', -0.4, 0.62, -0.35, 0.2, 1.25, 1.33, 0.04); pf.soft('wool#7a9a6a', 0.58, 0.66, -0.3, 0.12, 0.62, 1.3, 0.035);   // its sleeve hanging down the side
  seat(pf, 0, 0, 1.25, 'sit on the pouf');
}
