// Guest room (bedroom no. 5, north-east): X 27.8-42.83, Y 0.5-12.3. Door from the hall in the
// north wall (X 27.85-30.25, swinging in); windows to the street (X 33-40.2) and north (Y 3-10.2).
// Made up for someone expected: towels folded on the bed, chocolate on the pillow, a carafe of
// water and flowers by the bed, a rack for the suitcase, pegs with hangers, a desk with a note.
import { LINEN, OAT, SAGE, RUST, NAVY, MUSTARD, CREAM, ROSE, ENAMEL, BRASS, STEEL, BLACK, GREEN, MARBLE, DARK, WHITE, G, DIRS } from '../kit.js';
import { wx, wz } from '../builder.js';
import { F1, F2 } from '../house.js';
import { upstairsProps } from './upstairs_hall.js';

export default function (kit) {
  const { B, fr, world, yawOf, seat, lampAt, model, tableLamp, floorLamp, candle, book, bookRow, bookStack, bookcase, sofa, armchair, bed, table, mug, picture, rug, posy, cabinets, cup, rnd, pick, lamps, seats, candles, models, extras, books, steam } = kit;
  const P = upstairsProps(kit, 5);
  rug(30.6, 39.8, 1.6, 8.4, F2, 'kilim');

  // ---- The bed, head to the west wall ----
  const gb = fr(27.8, 4.95, F2, 3);                                  // faces east; local x runs toward -Y
  // the kit's bed with a channelled, upholstered headboard (our bedroom has the oak Mission bed: not the same bed twice)
  bed(gb.sub(0, 0.08), 5.0, 'wool#a9b8a8', { headboard: 'upholstered', fabric: 'linen#8a8f7a', sham: 'linen#c9ad9a', accent: 'linen#efe8d8' });
  // the welcome: towels folded at the foot, a chocolate and a sprig of lavender tied with twine on top
  const tz = P.towels(gb, 0.0, 5.7, 2.36, 3, ['wool#e6e0d4', 'wool#e6e0d4', 'wool#a9b8a8'], 1.25, 0.9, 0.14);
  P.chocolate(gb, 0.38, 5.9, tz);
  for (let i = 0; i < 7; i++) {                                         // stems lying together, each with a spike of buds
    const x0 = -0.32 + i * 0.035, x1 = x0 + 0.16 + ((i % 3) - 1) * 0.05, y0 = 5.32, y1 = 6.08 - (i % 2) * 0.05, zz = tz + 0.012 + (i % 2) * 0.012;
    P.rod(gb, 'c#6f7d58/0.8', [x0, y0, zz], [x1, y1, zz + 0.004], 0.008, 4);
    for (let k = 0; k < 8; k++) {
      const t = 0.66 + k * 0.045, px = x0 + (x1 - x0) * t, py = y0 + (y1 - y0) * t, sz = 0.026 * (1 - k * 0.07);
      gb.soft(k % 2 ? 'c#6e5a9a/0.9' : 'c#8a76b4/0.9', px - sz + (k % 2 ? 0.008 : -0.008), px + sz + (k % 2 ? 0.008 : -0.008), py - sz * 1.4, py + sz * 1.4, zz - sz * 0.6, zz + sz * 1.2, sz * 0.8);
    }
  }
  P.rod(gb, 'c#b89a6a/0.9', [-0.34, 5.56, tz + 0.024], [0.0, 5.6, tz + 0.03], 0.009, 6);           // the twine
  P.leaves(gb, 'c#7a8a6a/0.6', [{ x: -0.2, y: 5.5, z: tz + 0.02, a: 1.3, e: 0.0, len: 0.3, w: 0.06, n: 3 }, { x: -0.1, y: 5.5, z: tz + 0.02, a: 1.8, e: 0.0, len: 0.26, w: 0.05, n: 3 }]);
  picture(gb, 'van_gogh_bedroom', 0, 5.72, 2.6, 2.04, { frame: 'c#2a2622/0.4', border: 0.12, mat: 0.18 });

  // ---- Bedside: carafe and glass, flowers, a book, lamps both sides ----
  const n1 = gb.sub(3.65, 0.06);                                         // toward the street wall
  const nz = kit.nightstand(n1, { w: 1.5, d: 1.2, h: 1.9 });
  tableLamp(n1, -0.25, 0.55, nz, 'c#c9b48a/0.4'); P.carafe(n1, 0.3, 0.45, nz);
  P.stems(n1, 0.35, 0.95, nz, 'c#e8b0b8/0.9', 6, { jar: 'c#cfcbc4/0.2' });
  const n2 = gb.sub(-3.65, 0.06);                                        // toward the door
  kit.nightstand(n2, { w: 1.5, d: 1.2, h: 1.9 });
  tableLamp(n2, 0.25, 0.55, nz, 'c#c9b48a/0.4'); bookStack(n2, -0.3, 0.55, nz, 2);
  P.dish(n2, -0.3, 0.98, nz + 0.0, { mat: 'c#cfcbc4/0.2', r: 0.14 });

  // ---- Luggage rack at the foot of the bed, the suitcase waiting on it ----
  const lr = fr(36.15, 4.95, F2, 3);
  for (const x of [-1.15, 1.05]) { P.rod(lr, 'oak_light#8a6a48', [x, 0.0, 0], [x + 0.1, 1.3, 1.75], 0.05, 8); P.rod(lr, 'oak_light#8a6a48', [x, 1.3, 0], [x + 0.1, 0.0, 1.75], 0.05, 8); }
  for (const y of [0.05, 1.25]) lr.box('oak_light#8a6a48', -1.2, 1.2, y - 0.04, y + 0.04, 1.7, 1.8, G);
  for (const x of [-0.6, 0.0, 0.6]) lr.box('c#7a5a44/0.9', x - 0.12, x + 0.12, 0.0, 1.3, 1.78, 1.81);
  lr.block(-1.2, 1.2, 0, 1.3, 0, 1.8);
  model('si_gottlieb_suitcase', lr, 0, 0.65, 1.81, 1, { scale: 0.85 });

  // ---- The reading chair in the window corner, a lamp and a fern ----
  model('st_armchair_12_oak', fr(40.2, 2.5, F2), 0, 0, 0, 0, { seat: 1.3, turn: 0.785, collide: true });
  floorLamp(fr(42.1, 1.15, F2), 0, 0);
  const ct = fr(38.05, 1.35, F2); ct.cyl('oak_light#8a6a48', 0, 0, 1.65, 1.73, 0.5, 0.5, 20); ct.cyl('oak_light#8a6a48', 0, 0, 0, 1.65, 0.07, 0.05, 8); ct.cyl('oak_light#8a6a48', 0, 0, 0, 0.05, 0.35, 0.35, 16); ct.block(-0.5, 0.5, -0.5, 0.5, 0, 1.73);
  bookStack(ct, 0.0, 0.05, 1.73, 2); cup(ct, 0.25, -0.22, 1.73, 'c#efe8d8/0.4');
  kit.pottedPlant(fr(41.7, 11.35, F2), 0, 0, 0, 'leafy', { size: 0.9, pot: 'c#b5704f/0.9' });

  // ---- North wall: pegs with hangers for the guest; a writing desk with a welcome note ----
  const pr = fr(34.5, 12.3, F2, 2);                                     // faces south into the room
  pr.box('oak_light#8a6a48', -2.4, 2.4, 0, 0.08, 5.3, 5.62, G);
  for (const x of [-1.9, -0.4, 1.0, 2.0]) P.rod(pr, 'oak_light#8a6a48', [x, 0.08, 5.45], [x, 0.36, 5.5], 0.04, 8);
  kit.coatOnPeg(pr, -1.9, 0.3, 5.5, 'linen#cfcbc4', 'shirt');
  kit.coatOnPeg(pr, -0.4, 0.3, 5.5, 'wool#e6e0d4', 'coat');                     // a robe for the guest
  pr.soft('c#c9b48a/0.9', 0.75, 1.25, 0.12, 0.3, 4.15, 5.35, 0.05); P.rod(pr, 'c#c9b48a/0.9', [0.85, 0.25, 5.35], [1.0, 0.36, 5.5], 0.02, 4);   // a canvas tote
  pr.soft('c#7a9a6a/0.9', 1.85, 2.0, 0.16, 0.3, 3.6, 5.52, 0.04); pr.soft('c#7a9a6a/0.9', 2.02, 2.17, 0.18, 0.32, 3.9, 5.52, 0.04);   // a scarf over the end peg
  const dk = fr(39.6, 12.3, F2, 2);
  P.legs(dk, -1.7, 1.7, 0.05, 1.75, 2.5, 'oak_light#8a6a48', { leg: 0.15 });
  kit.diningChair(dk, 0.3, 2.2, { dq: 2, back: 'ladder', seat: 'linen#8a8f7a' });
  tableLamp(dk, -1.2, 0.62, 2.5, 'c#a8a49c/0.4');
  P.pothos(dk, 1.3, 0.45, 2.5, { size: 0.8, dir: 1.57, spread: 2.2, trail: 1.5 });
  // the note, propped against a little vase, and a dish of wrapped chocolates
  kit.sign(dk.sub(0.0, 0.5, 2.5 + 0.28, 0), 0, 0, 0, 0.55, 0.42, (g, w, h) => { g.fillStyle = '#f4efe2'; g.fillRect(0, 0, w, h); g.fillStyle = '#3a3f5a'; g.font = 'italic 34px serif'; g.textAlign = 'center'; g.fillText('Welcome!', w / 2, h * 0.32); g.font = 'italic 19px serif'; g.fillText('towels on the bed, robe on the peg', w / 2, h * 0.55); g.fillText('wifi: auntiecat / tea downstairs', w / 2, h * 0.72); g.fillText('xx', w / 2, h * 0.9); }, { cw: 300, ch: 230 });
  dk.box('c#cfcbc4/0.9', -0.3, 0.3, 0.42, 0.46, 2.5, 2.55);
  P.dish(dk, 0.55, 1.05, 2.5, { mat: 'c#cfcbc4/0.2', r: 0.2 });
  for (const [dx, dy, c] of [[-0.06, 0.02, 'c#c9a24a/0.4'], [0.07, -0.04, 'c#7a3b2e/0.4'], [0.02, 0.08, 'c#2a3549/0.4']]) dk.soft(c, 0.55 + dx - 0.06, 0.55 + dx + 0.06, 1.05 + dy - 0.05, 1.05 + dy + 0.05, 2.52 + dx * 0.05, 2.58 + dx * 0.05, 0.02);
  P.stems(dk, -0.45, 0.6, 2.5, 'c#f0d880/0.9', 5, { jar: 'c#b8c4c8/0.2' });
  picture(dk, 'sisley_street_in_moret', -0.2, 5.25, 2.0, 1.6, { frame: 'c#9a8a6a/0.4/0.6', border: 0.12 });
}
