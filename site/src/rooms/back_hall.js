// Back hall behind the stair: the coat-closet corner.
//   X 19.2-27.4, Y 17.4 (the back of the stair, X 24-27.4) to 22.4 (the pantry-hall wall).
//   Three ways through it stay open: from the hall (X 20.5-23.6), to the office door
//   (X 20.1-22.8 on the back wall; nothing within 3 ft of it), and to the pantry opening
//   (Y 18.3-21.1 on the north side, X 27.4; nothing within 3 ft of it).
import { LINEN, OAT, SAGE, RUST, NAVY, MUSTARD, CREAM, ROSE, ENAMEL, BRASS, STEEL, BLACK, GREEN, MARBLE, DARK, WHITE, G, DIRS } from '../kit.js';
import { wx, wz } from '../builder.js';
import { F1, F2 } from '../house.js';
import { props } from './trinkets.js';

const OAK = 'oak_light#a3825c';

export default function (kit) {
  const { B, fr, world, yawOf, seat, lampAt, model, tableLamp, floorLamp, candle, book, bookRow, bookStack, bookcase, sofa, armchair, bed, table, mug, picture, rug, posy, cabinets, cup, rnd, pick, lamps, seats, candles, models, extras, books, steam, sign, pack } = kit;
  const P = props(kit);

  // The grandfather clock, on the back wall between the office door and the pantry opening
  model('vintage_grandfather_clock_01', fr(26.2, 22.38, F1, 2), 0, 0.72, 0, 0, { collide: true });

  // ---- Against the back of the stair (X 24-27.4, facing the passage): a boot bench ----
  const b = fr(25.7, 17.36, F1, 0);
  for (const x of [-1.4, 1.28]) b.box(OAK, x, x + 0.12, 0.02, 0.85, 0, 1.55, G);
  b.box(OAK, -1.4, 1.4, 0.02, 0.85, 1.43, 1.55, G); b.box(OAK, -1.28, 1.28, 0.06, 0.82, 0.18, 0.24, G); b.box(OAK, -1.28, 1.28, 0.02, 0.08, 0.24, 1.43, G);
  b.block(-1.4, 1.4, 0, 0.85, 0, 1.55);
  P.boxBasket(b, -0.62, 0.45, 0.25, 1.15, 0.7, 0.75); P.boxBasket(b, 0.62, 0.45, 0.25, 1.15, 0.7, 0.75);
  P.folded(b, -0.62, 0.45, 0.3, 0.95, 0.55, ['wool#6c7a60', 'wool#c9c0ac', 'wool#96492f', 'wool#2a3549']);    // spare throws and hats
  P.folded(b, 0.62, 0.45, 0.3, 0.95, 0.55, ['linen#d8ccb0', 'linen#a39678', 'linen#c9c0ac']);                // reusable bags
  P.rbox(b, 'linen#b3a892', 0, 0.45, 1.62, 2.6, 0.75, 0.14, 0.06, { seg: 2 });
  // A Trader Joe's bag left on the bench, the week's flowers still in it
  const tj = (g, w, h) => {
    g.fillStyle = '#b5926a'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(90,60,30,0.15)'; for (let i = 0; i < 9; i++) g.fillRect(0, h * (0.05 + i * 0.11), w, 2);
    g.fillStyle = '#b5201e'; g.font = `italic bold ${h * 0.16}px Georgia, serif`; g.textAlign = 'center'; g.fillText("Trader Joe's", w / 2, h * 0.36);
    g.strokeStyle = '#b5201e'; g.lineWidth = h * 0.012; g.strokeRect(w * 0.08, h * 0.08, w * 0.84, h * 0.84);
    g.fillStyle = '#3a3530'; g.font = `${h * 0.06}px Georgia, serif`; g.fillText('your neighborhood grocery store', w / 2, h * 0.5);
    g.strokeStyle = '#3a3530'; g.lineWidth = 2; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(w * (0.22 + i * 0.14), h * 0.85); g.lineTo(w * (0.25 + i * 0.13), h * 0.62); g.lineTo(w * (0.3 + i * 0.13), h * 0.85); g.stroke(); }
  };
  pack(b, 0.75, 0.42, 1.69, 0.95, 0.5, 0.95, 'c#b08a5a/0.9', tj);
  P.bouquet(b, 0.75, 0.42, 2.3, 0.75, ['c#f2c14a/0.8', 'c#f2ead8/0.8', 'c#e8a0a8/0.8'], 31, 9, 0.2);
  P.hat(b, -0.65, 0.52, 1.69, 'wool#7a3b5e', 'c#c9c0ac/0.8');                          // somebody's hat, put down on the way in
  // Mishima in the morning mist, between two sconces
  picture(b, 'hiroshige_mishima_mist', 0, 5.0, 2.0, 1.28, { frame: OAK, border: 0.08, mat: 0.12 });
  for (const x of [-1.5, 1.5]) kit.sconce(b, x, 5.25, { kind: 'shade', lit: true, power: 0.4 });

  // ---- Hooks and boots on the back wall, between the office door and the clock (X 23.25-25.1) ----
  const h = fr(24.15, 22.4, F1, 2);
  h.box(OAK, -0.88, 0.88, 0.02, 0.14, 5.05, 5.45, G);
  const hk = [-0.25, 0.2, 0.65];
  for (const x of hk) { h.box(BRASS, x - 0.03, x + 0.03, 0.14, 0.32, 5.2, 5.26); h.cyl(BRASS, x, 0.33, 5.16, 5.32, 0.035); }
  kit.coatOnPeg(h, -0.28, 0.2, 5.5, 'wool#b48530', 'coat');                                   // a mustard rain mac
  kit.scarf(h, 0.68, 0.4, 5.3, 'wool#c9c0ac', { l1: 1.4, l2: 1.0 });                     // on its own hook, not through the coat
  kit.toteBag(h, 0.88, 0.35, 0.0, 'linen#3d5a4a', { w: 0.9, h: 1.0 });                       // set down under the hooks
  kit.bootTray(h, -0.3, 0.7, 1.3, { kinds: ['boot', 'boot'], colours: ['c#3d5a3a/0.5', 'leather#5a3420'] });
  h.block(-0.88, 0.88, 0, 1.0, 0, 6);

  // ---- The other wall beside the office door: a picture and a lidded basket ----
  const v = fr(19.2, 21.0, F1, 3);
  picture(v, 'vermeer_little_street', 0, 5.0, 1.45, 1.8, { frame: BLACK, border: 0.08, mat: 0.18 });
  model('wicker_basket_02', v, 0, 0.46, 0, 0, { scale: 0.7 });
}
