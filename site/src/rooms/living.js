// Living room  (X 0.5-18.8, Y 0.5-29.5; fireplace on the north side, Y 14.3-21.3)
import { LINEN, OAT, SAGE, RUST, NAVY, MUSTARD, CREAM, ROSE, ENAMEL, BRASS, STEEL, BLACK, GREEN, MARBLE, DARK, WHITE, G, DIRS } from '../kit.js';
import { wx, wz } from '../builder.js';
import { F1, F2 } from '../house.js';
import { props, DRAWN } from './trinkets.js';

export default function (kit) {
  const { B, fr, world, yawOf, seat, lampAt, model, tableLamp, floorLamp, candle, book, bookRow, bookStack, bookcase, sofa, armchair, bed, table, mug, picture, rug, posy, cabinets, cup, rnd, pick, lamps, seats, candles, models, extras, books, steam, sign, jarCandle, throwBlanket } = kit;
  const P = props(kit);
  rug(4.6, 15.4, 11.6, 24.0, F1, 'garden');
  const s = fr(5.6, 17.8, F1, 3); sofa(s, 7.8);                               // facing the fire
  throwBlanket(s, -3.15, -1.85, 1.42, 3.36, 1.63, 'wool#96492f', { over: 'front' });               // a rust knit throw left on the far cushion
  const ct = fr(11.9, 17.8, F1, 3); table(ct, 4.2, 2.3, 1.35); ct.block(-2.1, 2.1, -1.15, 1.15, 0, 1.6);   /* a block tall enough that the walker cannot stride through */ bookStack(ct, -1.2, 0.2, 1.35, 3); candle(ct, 0.9, -0.5, 1.35, 0.35); candle(ct, 1.2, -0.2, 1.35, 0.5);
  mug(ct, 0.2, 0.55, 1.35, 'c#d9c9b0/0.5'); P.lathe(ct, 'oak_light#8a6a48', 0.3, -0.2, 1.35, [[0, 0], [0.22, 0], [0.42, 0.1], [0.5, 0.28], [0.47, 0.29], [0.38, 0.13], [0.2, 0.04], [0, 0.04]], 28);   // turned bowl (was a 14k-triangle scan)
  const mz = kit.magazines(ct, -0.55, -0.45, 1.35, 3, { turn: 0.35 });
  P.glasses(ct, -0.5, -0.5, mz + 0.004, 0.6);                                            // reading glasses left on the magazine
  model('modern_arm_chair_01', fr(13.2, 12.3, F1, 0), 0, 0, 0, 0, { seat: 1.45, turn: 0.35, collide: true });
  model('modern_arm_chair_01', fr(13.0, 23.4, F1, 2), 0, 0, 0, 0, { seat: 1.45, turn: -0.35, collide: true });
  const t1 = fr(6.9, 12.7, F1, 3); model('side_table_01', t1, 0, 0, 0, 0, { collide: true }); tableLamp(t1, 0, 0.1, 1.8); bookStack(t1, 0, -0.1, 0.62, 2);
  const t2 = fr(6.9, 22.9, F1, 3); model('side_table_01', t2, 0, 0, 0, 0, { collide: true }); tableLamp(t2, 0, -0.1, 1.8, 'c#b9a27a/0.4'); model('potted_plant_04', t2, 0.45, 0.4, 1.8);
  { const lb = fr(18.8, 22.15, F1, 1); P.boxBasket(lb, 0, 0.55, 0, 1.3, 0.9, 0.7); P.folded(lb, 0, 0.55, 0.45, 1.0, 0.7, ['wool#6c7a60', 'wool#c9b48a', 'wool#96492f']); lb.block(-0.65, 0.65, 0.1, 1.0, 0, 1.6); }   // a basket of throws by the fire (was a 22k-triangle model scaled up 1.7x, in the chair's way)
  // Mantel
  const m = fr(16.15, 17.8, F1 + 4.8, 1);
  model('mantel_clock_01', m, -2.3, -0.2, 0); candle(m, 2.2, -0.2, 0, 0.7); candle(m, 2.6, -0.15, 0, 0.5); candle(m, 2.95, -0.22, 0, 0.6);
  model('antique_ceramic_vase_01', m, 3.35, -0.2, 0, 0, { scale: 0.6 });
  model('carved_wooden_elephant', m, -1.55, -0.22, 0, 0, { turn: 0.3, scale: 1.2 }); P.photoFrame(m, -1.0, -0.22, 0, 0.36, 0.46, 51, BRASS, 'people');
  P.bowl(m, 0.95, -0.22, 0, 0.2, 'c#8fa8a0/0.3'); jarCandle(m, 1.55, -0.24, 0, { label: 'c#d9b8a0/0.6', r: 0.15, tall: 0.32, lid: false });
  picture(fr(16.7, 17.8, F1, 1), 'golden_autumn', 0, 6.45, 4.0, 2.57, { frame: 'c#8a6b33/0.45/0.6', border: 0.2 });
  picture(fr(0.5, 14.6, F1, 3), 'the_kiss', 0, 4.9, 3.3, 3.3, { frame: 'c#8a6b33/0.45/0.6', border: 0.18 });
  picture(fr(11.95, 29.5, F1, 2), 'savrasov_rooks', 0, 4.8, 1.0, 1.31, { frame: 'c#8a6b33/0.45/0.6', border: 0.1 });        // on the pier between the west windows
  picture(fr(18.8, 13.43, F1, 1), 'fantin_latour_roses', 0, 5.2, 1.15, 0.96, { frame: 'c#8a6b33/0.45/0.6', border: 0.08 }); // beside the chimney breast
  // Piano against the north partition, west of the fireplace
  const p = fr(18.75, 25.5, F1, 1);
  p.box(BLACK, -2.5, 2.5, 0, 1.15, 0, 4.1); p.box(BLACK, -2.55, 2.55, 0, 1.3, 4.1, 4.2);
  p.box(BLACK, -2.5, 2.5, 1.15, 2.1, 2.05, 2.5); p.box(BLACK, -2.5, -2.3, 1.15, 2.1, 0, 2.05); p.box(BLACK, 2.3, 2.5, 1.15, 2.1, 0, 2.05);
  p.box('c#f4f0e6/0.3', -2.28, 2.28, 1.3, 2.08, 2.5, 2.56);
  for (let i = 0; i < 36; i++) { const x = -2.2 + i * 0.124; if ([0, 1, 3, 4, 5].includes(i % 7)) p.box(BLACK, x + 0.085, x + 0.165, 1.3, 1.8, 2.56, 2.62); }
  p.box(BLACK, -1.3, 1.3, 1.1, 1.22, 2.9, 3.75); p.box('c#f6f2e8/0.9', -0.75, 0.75, 1.2, 1.26, 2.95, 3.7);     // music desk, score open
  for (const x of [-0.25, 0, 0.25]) p.box(BRASS, x - 0.04, x + 0.04, 1.15, 1.5, 0.2, 0.26);
  p.block(-2.5, 2.5, 0, 2.1, 0, 4);
  const pb = p.sub(0, 3.2); pb.box(BLACK, -1.4, 1.4, -0.55, 0.55, 1.45, 1.6); for (const x of [-1.25, 1.1]) for (const y of [-0.45, 0.3]) pb.box(BLACK, x, x + 0.15, y, y + 0.15, 0, 1.45);
  pb.soft(RUST, -1.35, 1.35, -0.5, 0.5, 1.58, 1.74, 0.07); pb.block(-1.4, 1.4, -0.55, 0.55, 0, 1.6);
  seats.push({ x: wx(15.4), y: F1 + 1.74 + 2.45, z: wz(25.5), yaw: Math.atan2(-1, 0), label: 'sit at the piano' });
  picture(p, 'hunters', 0, 5.5, 3.45, 2.45, { border: 0.15 });                       // its top clear of the picture rail
  tableLamp(p, -1.9, 0.6, 4.2, 'c#3d4b44/0.4'); posy(p, 1.8, 0.6, 4.2);
  // Window seat round the south-west corner, under the band of casements
  const ws = (X0, X1, Y0, Y1, sx, sy, q) => {
    B.pbox('fir', X0, X1, Y0, Y1, F1, F1 + 1.3, G); B.prbox(LINEN, X0 + 0.04, X1 - 0.04, Y0 + 0.04, Y1 - 0.04, F1 + 1.28, F1 + 1.66, 0.1); B.block(X0, X1, Y0, Y1, F1, F1 + 1.6);
    seats.push({ x: wx(sx), y: F1 + 1.66 + 2.45, z: wz(sy), yaw: Math.atan2(-DIRS[q][0], DIRS[q][1]), label: 'sit in the window' });
  };
  ws(0.5, 2.5, 19.2, 29.5, 1.5, 23.5, 3); ws(2.5, 10.8, 27.5, 29.5, 6.5, 28.5, 2);
  for (const [X, Y, c] of [[1.35, 20.4, MUSTARD], [1.35, 26.6, SAGE], [1.35, 28.6, RUST], [4.2, 28.65, CREAM], [9.6, 28.65, NAVY]])   /* clear of the window stools */ B.prbox(c, X - 0.55, X + 0.55, Y - 0.55, Y + 0.55, F1 + 1.62, F1 + 2.1, 0.2);
  bookStack(fr(7.5, 28.6, F1 + 1.66, 2), 0, 0, 0, 4);
  P.folded(fr(5.75, 28.55, F1 + 1.66, 2), 0, 0, 0, 1.1, 0.8, ['wool#6c7a60', 'wool#c9c0ac']);   // spare throws on the window seat
  floorLamp(fr(3.3, 26.6, F1), 0, 0); B.block(3.0, 3.6, 26.3, 26.9, F1, F1 + 5.5);
  // By the street window: two chairs for morning coffee, and bookcases either side
  armchair(fr(6.0, 3.3, F1, 3), SAGE, CREAM); armchair(fr(14.0, 3.3, F1, 1), SAGE, MUSTARD);
  throwBlanket(fr(6.0, 3.3, F1, 3), 0.92, 1.54, 0.5, 2.8, 2.12, 'wool#c9b48a', { over: 'arm' });   /* on the arm, not in it (arm top 2.05) */
  const mt = fr(10, 2.6, F1); mt.cyl('fir', 0, 0, 1.75, 1.85, 1.0, 1.0, 24); mt.cyl('fir', 0, 0, 0, 1.75, 0.1); mt.cyl('fir', 0, 0, 0, 0.08, 0.55); mt.block(-0.9, 0.9, -0.9, 0.9, 0, 1.8);
  posy(mt, 0.2, 0.2, 1.85); mug(mt, -0.45, -0.1, 1.85); bookStack(mt, 0.1, -0.5, 1.85, 2);
  bookcase(fr(3.2, 0.5, F1, 0), 4.6, 6.8); bookcase(fr(16.4, 0.5, F1, 0), 4.2, 6.8);   // clear of the window's head casing
  kit.pottedPlant(fr(2.2, 10.9, F1), 0, 0, 0, 'leafy', { size: 2.0, pot: 'c#b8755a/0.8' }); B.block(1.6, 2.8, 10.3, 11.5, F1, F1 + 4);             // grown tall in the corner by the garden doors
  // The record player, under The Kiss, with a crate of records beside it
  {
    const c = fr(0.5, 14.6, F1, 3);
    c.box('oak_light', -2.1, 2.1, 0.05, 1.5, 0.55, 2.2, G); for (const x of [-1.95, 1.8]) for (const y of [0.15, 1.3]) c.box('oak_light', x, x + 0.15, y, y + 0.15, 0, 0.55, G);
    for (const x of [-2.0, 0.05]) c.box('wicker', x, x + 1.95, 1.5, 1.53, 0.7, 2.05);                      // cane doors
    c.block(-2.1, 2.1, 0.05, 1.5, 0, 2.2);
    c.soft('c#3a2e26/0.5', -0.2, 1.5, 0.2, 1.35, 2.2, 2.42, 0.04); c.cyl('c#8a8a88/0.3/1', 0.6, 0.78, 2.42, 2.45, 0.52);   // plinth and platter
    c.cyl('c#b9b4aa/0.3/1', 1.3, 1.15, 2.42, 2.6, 0.05); c.box('c#b9b4aa/0.3/1', 0.8, 1.3, 1.13, 1.17, 2.56, 2.59);        // tone arm
    const [a, b] = world(c, 0.6, 0.78); (kit.spots ??= []).push({ x: a, y: F1 + 2.47, z: b, action: 'record' });
    // Crate of records on the floor: sleeves leaning in a wooden box
    const k = fr(0.5, 17.6, F1, 3);
    k.box('oak_light', -0.75, 0.75, 0.1, 0.16, 0, 1.0, G); k.box('oak_light', -0.75, 0.75, 1.24, 1.3, 0, 1.0, G); k.box('oak_light', -0.75, -0.69, 0.1, 1.3, 0, 1.0, G); k.box('oak_light', 0.69, 0.75, 0.1, 1.3, 0, 1.0, G); k.box('oak_light', -0.75, 0.75, 0.1, 1.3, 0, 0.06, G);
    const SLEEVES = ['c#b8452e', 'c#2a3549', 'c#c9a23a', 'c#3d5a4a', 'c#d9cdb2', 'c#17140f', 'c#7a3b5e', 'c#4f7f86', 'c#a8583a', 'c#e8dfc8', 'c#26364f', 'c#6b2a25'];
    SLEEVES.forEach((col, i) => k.box(col + '/0.7', -0.66, 0.66, 0.2 + i * 0.085, 0.2 + i * 0.085 + 0.03, 0.06, 1.1 + (i % 3) * 0.02));
    k.block(-0.75, 0.75, 0.1, 1.3, 0, 1.6);
  }
}
