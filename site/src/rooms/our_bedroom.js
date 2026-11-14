// Our bedroom (no. 2, south-east): X 0.5-18.8, Y 0.5-13.8. Door from the hall in the east wall
// (Y 10.2-12.9, swinging in); windows to the street (X 6.1-13.7) and to the south (Y 2.9-9.8).
// Serene and layered: the oak bed dressed deep, Van Gogh's Sunflowers over it, a dresser of
// small treasures, a reading corner in the light, a full-length mirror, slippers by the bed.
import { LINEN, OAT, SAGE, RUST, NAVY, MUSTARD, CREAM, ROSE, ENAMEL, BRASS, STEEL, BLACK, GREEN, MARBLE, DARK, WHITE, G, DIRS } from '../kit.js';
import { wx, wz } from '../builder.js';
import { F1, F2 } from '../house.js';
import { upstairsProps } from './upstairs_hall.js';

export default function (kit) {
  const { B, fr, world, yawOf, seat, lampAt, model, tableLamp, floorLamp, candle, book, bookRow, bookStack, bookcase, sofa, armchair, bed, table, mug, picture, rug, posy, cabinets, cup, rnd, pick, lamps, seats, candles, models, extras, books, steam } = kit;
  const P = upstairsProps(kit, 3);
  rug(4.2, 14.8, 2.2, 10.6, F2, 'garden');

  // ---- The bed, head to the north wall, facing the street ----
  const b = fr(9.5, 13.8, F2, 2);
  model('oak_mission_bed_queen_procedural', b, 0, 3.56, 0, 0, { seat: 2.0, collide: true });
  // a soft rust throw across the foot, folded double, its ends hanging down the sides (it lies over the model's own flat one)
  kit.throwBlanket(b, -2.76, 2.76, 4.66, 6.46, 2.36, 'wool#b9785c', { over: 'foot', drop: { l: 0.75, r: 0.55, f: 0.12, b: 0.12 } });
  // dressed deeper: Euro shams against the headboard, a lumbar cushion, a mustard pillow
  // (stuffed kit cushions, not boxes)
  for (const x of [-1.23, 1.23]) kit.cushion(b, x, 0.55, 2.1, 2.2, 1.45, 'linen#d8d0bd', { tilt: 0.25, thick: 0.5 });
  kit.cushion(b, 0, 2.2, 2.15, 1.7, 0.75, 'linen#7a9a6a', { tilt: 0.45, thick: 0.38 });
  kit.cushion(b, -1.45, 1.95, 2.2, 0.95, 0.95, 'linen#b48530', { tilt: 0.4, thick: 0.35, turn: 0.15 });
  picture(b, 'sunflowers', 0, 5.6, 1.7, 2.14, { border: 0.13 });          // its frame clear of the picture rail

  // ---- Bedside tables ----
  // hers, by the window side: lamp, books, a jar candle, a glass of water, hand cream, spectacles
  const n1 = b.sub(-3.95, 0.06);                                         // local x -3.95 is the north-east side
  kit.nightstand(n1, { w: 1.8, d: 1.45, h: 2.13 });
  tableLamp(n1, 0.35, 0.65, 2.13, 'c#d8d0bd/0.4');
  bookStack(n1, -0.35, 0.6, 2.13, 3); P.glassOfWater(n1, -0.2, 1.15, 2.13);
  kit.jarCandle(n1, -0.55, 1.1, 2.13, { label: 'c#c9ad9a/0.6', r: 0.15, tall: 0.3, lid: false });
  P.tube(n1, 0.35, 1.2, 2.13, 'c#f2efe8/0.4', 'c#c9b48a/0.4', 0.45);
  // his: lamp, a tall book pile, an alarm clock, a photograph
  const n2 = b.sub(3.95, 0.06);
  kit.nightstand(n2, { w: 1.8, d: 1.45, h: 2.13 });
  tableLamp(n2, -0.35, 0.65, 2.13, 'c#7a9a6a/0.4');
  bookStack(n2, 0.4, 0.55, 2.13, 4); kit.lotionTube(n2, 0.4, 1.15, 2.13);
  P.photo(n2, -0.45, 1.15, 2.13, P.snap(['#c9d8e8', '#f0e4cc'], '#9ab07a', 2), 0.36, 0.46);
  mug(n2, -0.05, 1.25, 2.13, 'c#4f4a46/0.4');
  P.slippers(fr(5.9, 9.0, F2, 1), 0, 0, 0, 'wool#c9ad9a');
  P.slippers(fr(13.2, 8.6, F2, 3), 0, 0, 0, 'wool#8a8580');

  // ---- The dresser on the east wall, with the Almond Blossom over it ----
  const d = fr(18.8, 5.2, F2, 1);
  model('oak_mission_dresser_procedural', d, 0, 0.95, 0, 0, { collide: true });
  const dz = 2.82;
  P.jewellery(d, -0.2, 0.95, dz); P.perfume(d, 0.45, 0.6, dz); P.perfume(d, 0.72, 0.75, dz, { glass: 'c#e8d6dc/0.05', juice: 'c#c9ad9a/0.2', cap: 'c#efe8d8/0.2', w: 0.15, h: 0.26 });
  P.photo(d, -1.15, 0.45, dz, P.snap(['#f2d0a8', '#e8a888'], '#c89a6a', 2), 0.5, 0.62, 'c#b08d4a/0.35/1');
  P.photo(d, -0.65, 0.35, dz, P.snap(['#b8cfd8', '#e6eef0'], '#d8d0b8', 1), 0.38, 0.48);
  P.tray(d, 1.05, 1.85, 0.5, 1.2, dz, 'c#b08d4a/0.35/1'); P.bottle(d, 1.25, 0.8, dz + 0.04, { h: 0.38, r: 0.08, mat: 'c#efe8d8/0.2', cap: BRASS, pump: true });
  P.jar(d, 1.6, 0.75, dz + 0.04, { r: 0.12, lid: BRASS }); P.tube(d, 1.45, 1.05, dz + 0.04, 'c#c9d4dc/0.4', 'c#f2efe8/0.4', 0.42);
  P.pothos(d, -1.6, 1.15, dz, { size: 0.85, dir: 3.14, spread: 2.4, trail: 1.9 });
  kit.pillarCandle(d, 0.3, 1.4, dz, 0.42, 0.12, 'c#efe6d2/0.6');                 // (the jar candle is on her bedside)
  picture(d, 'van_gogh_almond_blossom', 0, 5.35, 3.0, 2.37, { frame: 'c#9a8a6a/0.4/0.6', border: 0.13 });

  // ---- The reading corner: a deep chair with a throw, a lamp, a small table, Water Lilies ----
  const rc = fr(0.9, 3.4, F2, 3); kit.armchair(rc, 'linen#505078', 'linen#c9ad9a');                  // faces the bed
  kit.throwBlanket(rc, -1.5, -0.94, 0.3, 2.7, 2.05, 'wool#a8a49c', { over: 'arm' });
  floorLamp(fr(1.25, 1.3, F2), 0, 0);
  const rt = fr(1.5, 5.6, F2);
  rt.cyl('oak_light#8a6a48', 0, 0, 1.95, 2.03, 0.6, 0.6, 22); rt.cyl('oak_light#8a6a48', 0, 0, 0.05, 1.95, 0.055, 0.055, 8); rt.cyl('oak_light#8a6a48', 0, 0, 0, 0.06, 0.38, 0.38, 18); rt.block(-0.6, 0.6, -0.6, 0.6, 0, 2.03);
  bookStack(rt, -0.1, -0.15, 2.03, 2); mug(rt, 0.25, 0.25, 2.03, 'c#efe8d8/0.4', true);
  P.stems(rt, -0.25, 0.3, 2.03, 'c#e8d0c8/0.9', 5, { jar: 'c#b8c4c8/0.2' });
  picture(fr(3.1, 0.5, F2, 0), 'monet_water_lilies', 0, 5.0, 1.9, 1.82, { frame: 'c#2a2622/0.4', border: 0.12, mat: 0.2 });

  // ---- Bench at the foot of the bed ----
  const bn = fr(9.5, 5.95, F2, 2);
  P.legs(bn, -2.2, 2.2, -0.65, 0.65, 1.35, 'oak_light#8a6a48', { leg: 0.16, apron: false });
  kit.seatPads(bn, 'linen#b3a892', -2.18, 2.18, -0.63, 0.63, 1.35, 1.6, { n: 1 }); bn.block(-2.2, 2.2, -0.65, 0.65, 0, 1.7);   // solid to the walker
  P.towels(bn, -1.3, 0.0, 1.62, 2, ['wool#c9ad9a', 'wool#7a9a6a'], 1.3, 0.95, 0.14);
  bookStack(bn, 0.9, 0.0, 1.62, 2);
  seat(bn, 0.4, 0.5, 1.62, 'sit on the bench');

  // ---- West wall: a full-length mirror, a basket of blankets in the window light, a fig in the corner ----
  const mw = fr(0.5, 11.25, F2, 3);
  P.mirror(mw, 0, 3.55, 1.6, 5.6, { frame: 'oak_light#8a6a48', border: 0.14, d: 0.1 });
  model('wicker_basket_02', fr(1.6, 7.6, F2), 0, 0, 0, 0, { scale: 1.1 });
  P.towels(fr(1.6, 7.6, F2), 0, 0, 0.62, 2, ['wool#c9ad9a', 'wool#7a9a6a'], 0.75, 0.6, 0.12);
  { const fg = fr(1.5, 12.8, F2); P.fig(fg, 0, 0, 0, { size: 1.0, dir: -0.785, spread: 2.2 }); fg.block(-0.55, 0.55, -0.55, 0.55, 0, 3.5); }
  { const sp = fr(17.2, 2.15, F2); P.snake(sp, 0, 0, 0, { size: 0.95, pot: 'c#b5704f/0.9' }); sp.block(-0.38, 0.38, -0.38, 0.38, 0, 2.6); }
}
