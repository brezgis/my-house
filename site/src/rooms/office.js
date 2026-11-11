// Office, in the downstairs bedroom  (X 19.5-30.6, Y 22.8-39.2)
//   The door from the back hall is at X 20.1-22.8 on the east wall and swings in: nothing
//   stands within 3 ft of it (X 20.1-22.8, Y 22.8-25.8).
import { LINEN, OAT, SAGE, RUST, NAVY, MUSTARD, CREAM, ROSE, ENAMEL, BRASS, STEEL, BLACK, GREEN, MARBLE, DARK, WHITE, G, DIRS } from '../kit.js';
import { wx, wz } from '../builder.js';
import { F1, F2 } from '../house.js';
import { props, DRAWN } from './trinkets.js';

export default function (kit) {
  const { B, fr, world, yawOf, seat, lampAt, model, tableLamp, floorLamp, candle, book, bookRow, bookStack, bookcase, sofa, armchair, bed, table, mug, picture, rug, posy, cabinets, cup, rnd, pick, lamps, seats, candles, models, extras, books, steam, sign } = kit;
  const P = props(kit);
  rug(21.7, 28.7, 26.2, 35.6, F1, 'kilim');
  bookcase(fr(30.6, 29.3, F1, 1), 11.4, 6.8);                                          // a wall of books, under the picture rail
  P.pothos(fr(30.6, 26.0, F1 + 6.93, 1), 0, 0.8, 0, 1.1, 'c#e9e3d6/0.3', 41);            // trailing off the top
  const d = fr(25.0, 38.9, F1, 2);                                                     // desk under the west window, off its stool and curtains
  d.box('fir', -2.9, 2.9, 0.1, 2.7, 2.38, 2.5, G); d.box('fir', -2.8, -1.3, 0.2, 2.6, 0.3, 2.38, G); for (const z of [0.9, 1.5, 2.05]) d.box(BRASS, -2.2, -1.9, 2.6, 2.64, z, z + 0.05);
  for (const y of [0.25, 2.4]) d.box('fir', 2.6, 2.78, y, y + 0.18, 0, 2.38, G); d.block(-2.9, 2.9, 0.1, 2.7, 0, 2.5);
  for (const [x, tilt, key] of [[-0.95, 1, 'screenA'], [0.95, -1, 'screenB']]) {
    d.cyl(BLACK, x, 0.7, 2.5, 2.54, 0.35); d.cyl(BLACK, x, 0.7, 2.54, 3.1, 0.04);
    d.box(BLACK, x - 0.92, x + 0.92, 0.72, 0.8, 2.95, 4.1);
    const [a, c] = world(d, x, 0.81);
    extras.push({ canvas: key, glow: 1.1, x: a, y: d.h + 3.525, z: c, rotY: yawOf(d.dir) + tilt * 0.12, w: 1.74, h: 1.05 });
  }
  d.box('c#e9e6df/0.5', -0.7, 0.7, 1.55, 2.0, 2.5, 2.55); d.soft('c#e9e6df/0.5', 0.95, 1.15, 1.6, 1.9, 2.5, 2.58, 0.04);       // keyboard and mouse
  mug(d, 1.9, 1.5, 2.5, 'c#c98f8a/0.5', true); bookStack(d, -2.1, 1.3, 2.5, 3); posy(d, 2.4, 0.7, 2.5);
  d.box('c#f3efe3/0.9', 1.35, 2.1, 1.9, 2.5, 2.5, 2.52); d.cyl('c#d9a441/0.6', 1.9, 2.05, 2.52, 2.54, 0.015);                   // notes
  model('desk_lamp_arm_01', d, -2.3, 1.05, 2.5, 0, { turn: -0.7 }); lampAt(d, -1.7, 1.35, 3.9, 0.7);   // its arm clear of the curtains
  kit.diningChair(d, 0, 3.35, { dq: 2, arms: true, wood: 'oak_light#a3825c', back: 'spindle', seat: 'leather#7a4a30' });   // a proper desk chair (the lounge chair was 3.3 ft wide, ran into the desk and had no collider)
  // A student's working mess: papers, sticky notes, the cold second mug, headphones
  const papers = [['Attention Is All\nYou Need', 2], ['Universal Dependencies v2:\nan evergrowing treebank', 5], ['On the Dangers of\nStochastic Parrots', 8]];
  papers.forEach(([title, seed], i) => sign(d, -1.5 + i * 0.12, 2.12 - i * 0.05, 2.505 + i * 0.004, 0.72, 0.93, DRAWN.paper(title, seed), { flat: true, turn: Math.PI + (i - 1) * 0.22, cw: 300, ch: 388 }));
  const notes = [['ask Prof.\nre: eval', '#fff59a'], ['tokens\n≠ words', '#ffd1dc'], ['oat milk!', '#c8f0c0'], ['git push', '#a8d8ea']];
  notes.forEach(([t, c], i) => { const x = [-1.75, -0.2, 0.25, 1.75][i]; sign(d, x, 0.93, [3.06, 3.09, 3.04, 3.92][i], 0.17, 0.17, DRAWN.sticky(t, c), { cw: 96, ch: 96, turn: (i - 1.5) * 0.04 }); });
  mug(d, -0.25, 2.35, 2.5, 'c#2f4a5a/0.4');
  P.openBook(d, 0.55, 2.3, 2.5, 0.8, 0.55, 'c#b48530/0.6', 0.1); d.cyl('c#2a3549/0.4', 0.5, 2.05, 2.56, 2.585, 0.012);           // spiral notebook
  { const hp = d.sub(-0.95, 1.25, 2.5); hp.cyl('c#2a2a2c/0.5', -0.28, 0, 0, 0.09, 0.15); hp.cyl('c#2a2a2c/0.5', 0.28, 0, 0, 0.09, 0.15);
    P.torus(hp, 'c#2a2a2c/0.5', 0, 0, 0.06, 0.3, 0.025, Math.PI, { rot: [0, 0, Math.PI] }); }                                      // headphones
  model('stationery_supplies', d, -2.35, 2.25, 2.5, 2, { scale: 0.9 });
  model('st_wastebasket_wire', d, 1.6, 1.6, 0, 0, { scale: 0.9 });

  // The pink iMac, on its own little table, with a pinboard over it
  const it = fr(19.5, 30.0, F1, 3); table(it.sub(0, 1.2), 2.6, 2.2, 2.4);
  const im = it.sub(0, 1.25, 2.4), PINK = 'c#f0609a/0.25', MILK = 'c#f6eef0/0.3';
  im.soft(PINK, -0.62, 0.62, -0.75, 0.3, 0.12, 1.45, 0.3); im.soft(MILK, -0.66, 0.66, 0.2, 0.62, 0.05, 1.5, 0.14); im.soft(MILK, -0.5, 0.5, -0.1, 0.6, 0, 0.14, 0.05);
  im.box(PINK, -0.3, 0.3, -0.3, 0.1, 1.45, 1.55);
  { const [a, c] = world(im, 0, 0.625); extras.push({ canvas: 'imac', glow: 1.0, x: a, y: im.h + 0.85, z: c, rotY: yawOf(im.dir), w: 0.92, h: 0.7 }); }
  im.box(MILK, -0.6, 0.6, 0.8, 1.15, 0, 0.06); im.cyl(PINK, 0.85, 0.95, 0, 0.07, 0.13);
  it.box('fir', -1.4, 1.4, 0.0, 0.08, 4.05, 5.85, G);
  sign(it, 0, 0.09, 4.95, 2.6, 1.7, DRAWN.pinboard, { cw: 640, ch: 420, rough: 0.95 });
  // Chalkboard, on the wall by the door
  const cb = fr(26.9, 22.8, F1, 0);
  picture(cb, null, 0, 4.7, 5.6, 3.3, { canvas: 'chalk', border: 0.14 });
  cb.box('fir', -2.9, 2.9, 0.08, 0.3, 2.85, 2.92, G); for (const [x, c] of [[-1.2, WHITE], [-0.9, 'c#f2d16b/0.9'], [0.4, 'c#e58f9a/0.9']]) cb.box(c, x, x + 0.22, 0.14, 0.2, 2.92, 2.97);
  cb.soft('c#3a3a3a/0.9', 1.6, 2.1, 0.1, 0.28, 2.92, 3.05, 0.03);
  // The reading chair, moved off the door to the south window, with its lamp and a throw
  const ac = fr(19.95, 33.4, F1, 3);
  armchair(ac, ROSE, CREAM); kit.throwBlanket(ac, 0.92, 1.54, 0.5, 2.8, 2.12, 'wool#6c7a60', { over: 'arm' });
  floorLamp(fr(20.4, 35.6, F1), 0, 0); B.block(20.1, 20.7, 35.3, 35.9, F1, F1 + 5.5);
  kit.pottedPlant(fr(20.4, 38.3, F1), 0, 0, 0, 'snake', { size: 1.3, pot: 'c#b8755a/0.8' }); B.block(20.0, 20.8, 37.9, 38.7, F1, F1 + 3);
  model('Ukulele_01', fr(30.3, 36.0, F1, 1), 0, 0.1, 3.4, 0, { hang: true });              // hung on the wall (this stretch of wall is the outer wall, face X 30.3)
  picture(fr(30.3, 37.4, F1, 1), 'dow_boats_at_rest', 0, 5.3, 1.8, 1.3, { frame: 'oak_light#a3825c', border: 0.1, mat: 0.15 });
}
