// Hall, downstairs: arrivals. Coats, shoes, keys, post; the Greenes' drawings and the clock.
//   Hall X 19.2-27.4 (the living-room partition face to the dining partition), Y 0.5 (front
//   door) to 17.4, where the back hall begins. The stair (X 24-27.4) rises from Y 5.3; its
//   hall-side wall face is X 23.6 from Y 7.
import { LINEN, OAT, SAGE, RUST, NAVY, MUSTARD, CREAM, ROSE, ENAMEL, BRASS, STEEL, BLACK, GREEN, MARBLE, DARK, WHITE, G, DIRS } from '../kit.js';
import { wx, wz } from '../builder.js';
import { F1, F2 } from '../house.js';
import { props } from './trinkets.js';

const OAK = 'oak_light#a3825c';

export default function (kit) {
  const { B, fr, world, yawOf, seat, lampAt, model, tableLamp, floorLamp, candle, book, bookRow, bookStack, bookcase, sofa, armchair, bed, table, mug, picture, rug, posy, cabinets, cup, rnd, pick, lamps, seats, candles, models, extras, books, steam, sign, jarCandle } = kit;
  const P = props(kit);

  rug(20.35, 23.55, 0.62, 2.75, F1, 'mat');                                            // doormat inside the front door
  rug(20.0, 23.0, 3.0, 21.4, F1, 'runner');
  // The Greenes' own drawings for the house, along the stair wall
  const g = fr(23.6, 12.2, F1, 1);
  [['plan_first', -3.6], ['plan_front', -1.2], ['plan_second', 1.2], ['plan_side', 3.6]].forEach(([file, x]) => picture(g, file, x, 5.15, 1.7, 1.76, { frame: BLACK, border: 0.07, mat: 0.2 }));

  // ---- Console, mirror, keys and post, on the living-room partition (Y 12.7-16.5) ----
  const c = fr(19.2, 14.6, F1, 3);
  const ctop = kit.console(c, 3.8, { wood: OAK, d: 1.05 });
  tableLamp(c, -1.3, 0.72, ctop, 'c#c8b79a/0.4');                                      // shade clear of the mirror frame
  P.vase(c, 1.25, 0.45, ctop, 0.75, 'c#e9e3d6/0.3', 'jug', 0.42);                       // a jug of tulips and eucalyptus
  P.bouquet(c, 1.25, 0.45, ctop + 0.52, 0.95, ['c#e8a0a8/0.8', 'c#f2ead8/0.8', 'c#e58f7a/0.8'], 11, 11, 0.28);
  P.bowl(c, 0.25, 0.55, ctop, 0.3, 'c#8fa8a0/0.3');                                    // the key dish
  P.torus(c, 'c#c9ccd0/0.25/1', 0.2, 0.5, ctop + 0.03, 0.06, 0.008); P.slab(c, 'c#b08d4a/0.3/1', 0.3, 0.52, ctop + 0.04, 0.05, 0.22, 0.015, { yaw: 0.4 });
  P.slab(c, 'c#c9ccd0/0.25/1', 0.12, 0.6, ctop + 0.04, 0.05, 0.19, 0.015, { yaw: -0.3 }); P.rbox(c, 'c#96492f/0.6', 0.3, 0.38, ctop + 0.05, 0.12, 0.08, 0.04, 0.015);
  P.lettersPile(c, -0.45, 0.6, ctop, 4, 3, 0.15);                                      // today's post
  P.photoFrame(c, -0.75, 0.25, ctop, 0.42, 0.52, 21, BRASS, 'people');
  kit.lotionTube(c, 0.6, 0.8, ctop, { turn: 0.3, colour: 'c#f0ece2/0.4', cap: 'c#c98f8a/0.3' });                       // hand cream by the door
  bookStack(c, -0.9, 0.55, 0.57, 3); P.boxBasket(c, 0.8, 0.55, 0.57, 1.1, 0.7, 0.5);   // gloves and hats live in the basket
  P.rbox(c, 'wool#96492f', 0.65, 0.55, 1.11, 0.35, 0.3, 0.12, 0.05); P.rbox(c, 'wool#6c7a60', 0.95, 0.5, 1.12, 0.3, 0.28, 0.1, 0.05);
  // A plain oak-framed mirror over it
  const mr = c.sub(0, 0);
  mr.box(OAK, -1.15, 1.15, 0.02, 0.14, 3.6, 3.8, G); mr.box(OAK, -1.25, 1.25, 0.02, 0.18, 6.3, 6.55, G);
  for (const x of [-1.15, 0.97]) mr.box(OAK, x, x + 0.18, 0.02, 0.14, 3.8, 6.3, G);
  mr.box('c#5d676b/0.28', -0.97, 0.97, 0.02, 0.06, 3.8, 6.3);

  // ---- Hall tree where the hall meets the back hall (Y 16.8-19.6, X 19.2-20.6) ----
  kit.hallTree(fr(19.26, 18.2, F1, 3), 2.8, { wood: OAK });                            // off the baseboard

  // ---- Shoe rack, with a cushion to sit on, under the drawings on the stair wall (Y 8.0-11.6) ----
  const s = fr(23.6, 9.8, F1, 1);
  kit.shoeRack(s, 3.6, { wood: OAK, kinds: ['loafer', 'sneaker', 'flat', 'flat', 'slipper', 'loafer'] });   // no boot: one stood up through the seat cushion
  s.cushion('wool#6c7a60', -1.7, 0.45, 0.08, 1.0, 1.49, 1.64, 0.06);
  P.boxBasket(s, 1.15, 0.5, 1.49, 0.9, 0.7, 0.35);                                        // sunglasses, a dog-eared map, spare keys
  P.folded(s, 1.15, 0.5, 1.55, 0.7, 0.5, ['wool#c9c0ac', 'wool#7a3b5e']); P.glasses(s, 0.1, 0.5, 1.65, 0.3);

  // ---- Umbrella stand behind the front door ----
  kit.umbrellaStand(fr(19.55, 1.05, F1), 0, 0, { mat: 'c#2f4a5a/0.3' }); B.block(19.25, 19.85, 0.75, 1.35, F1, F1 + 3);
  // A snake plant by the foot of the stair (was a small aloe blown up 2.6x, in front of the
  // dining-room opening and the front door's fixed leaf)
  kit.pottedPlant(fr(23.05, 7.35, F1), 0, 0, 0, 'snake', { size: 1.2, pot: 'c#b8755a/0.8' }); B.block(22.7, 23.5, 6.95, 7.75, F1, F1 + 3);   // where the hall is widest, by the stair
}
