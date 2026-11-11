// Bath (X 19.2-27.4, Y 21.2-29.5). Door from the hall in the north-east wall (Y 21, X 21.6-24.1,
// swinging in); a high window over the tub in the back wall (X 21.8-25.0, sill 3.4).
// Hex tile floor laid over the boards, subway-tile wainscot with a glazed cap, a roll-top
// claw-foot tub under the window with a tray across it, a marble-topped washstand with a
// sunk basin, a high-tank toilet, towels everywhere, warm sconces.
import { LINEN, OAT, SAGE, RUST, NAVY, MUSTARD, CREAM, ROSE, ENAMEL, BRASS, STEEL, BLACK, GREEN, MARBLE, DARK, WHITE, G, DIRS } from '../kit.js';
import { wx, wz } from '../builder.js';
import { F1, F2 } from '../house.js';
import { upstairsProps } from './upstairs_hall.js';

export default function (kit) {
  const { B, fr, world, yawOf, seat, lampAt, model, tableLamp, floorLamp, candle, book, bookRow, bookStack, bookcase, sofa, armchair, bed, table, mug, picture, rug, posy, cabinets, cup, rnd, pick, lamps, seats, candles, models, extras, books, steam } = kit;
  const P = upstairsProps(kit, 2);
  const X0 = 19.2, X1 = 27.4, Y0 = 21.2, Y1 = 29.5;
  const TERRY = 'wool#e6e0d4', TERRY2 = 'wool#a9b8a8', TERRY3 = 'wool#c9ad9a', PORC = 'c#ebe6dc/0.18', OAKW = 'oak_light#a3825c', CAP = 'c#cfcbc4/0.2';

  // ---- Tile: hex mosaic over the floor, a marble saddle at the door, subway wainscot ----
  B.pbox('tile_hex', X0, X1, Y0, Y1, F2 - 0.01, F2 + 0.02);
  B.pbox(MARBLE, 21.62, 24.08, 20.82, Y0 + 0.01, F2 - 0.01, F2 + 0.035);   // inside the jambs, not flush with them
  const WH = 3.9, LOW = 2.76;                                   // wainscot height, and under the window
  const tileX = (a, b, y0, y1, top) => { B.pbox('tile_subway', a, b, y0, y1, F2, F2 + top); };
  const capX = (a, b, y0, y1, top) => B.pbox(CAP, a, b, y0, y1, F2 + top, F2 + top + 0.12);
  // west and east walls run full length
  tileX(X0 + 0.004, X0 + 0.08, Y0, Y1, WH); capX(X0, X0 + 0.13, Y0, Y1, WH);
  tileX(X1 - 0.08, X1 - 0.004, Y0, Y1, WH); capX(X1 - 0.13, X1, Y0, Y1, WH);
  // north wall, either side of the door casing
  for (const [a, b] of [[X0 + 0.08, 21.24], [24.46, X1 - 0.08]]) { tileX(a, b, Y0 + 0.004, Y0 + 0.08, WH); capX(Math.max(a, X0 + 0.13), Math.min(b, X1 - 0.13), Y0, Y0 + 0.13, WH); }
  // back wall: full height either side of the window, lower beneath its apron
  tileX(21.3, 25.5, Y1 - 0.08, Y1 - 0.004, LOW); capX(21.3, 25.5, Y1 - 0.13, Y1, LOW);        // (only under the window: the full-height runs either side are not doubled)
  for (const [a, b] of [[X0 + 0.08, 21.3], [25.5, X1 - 0.08]]) { tileX(a, b, Y1 - 0.08, Y1 - 0.004, WH); capX(Math.max(a, X0 + 0.13), Math.min(b, X1 - 0.13), Y1 - 0.13, Y1, WH); }

  // ---- The tub, under the window, with a tray across it ----
  const tb = fr(23.6, 28.0, F2, 2);                           // front faces the room (east)
  model('clawfoot_tub_procedural', tb, 0, 0, 0.02, 0, { collide: true });
  // bath tray of oiled teak across the rim: a book, a three-wick candle, a glass of something
  const tt = tb.sub(0.6, 0, 2.08, 1);                          // x now runs across the tub
  const tz = P.tray(tt, -1.38, 1.38, -0.38, 0.38, 0, 'oak_light#7a5a44');   // clear of the back wall
  P.openBook(tt.sub(-0.55, 0.0, tz, 0), 0, 0, 0, 'c#2a3549/0.6');
  kit.jarCandle(tt, 0.35, -0.05, tz, { label: 'c#c9ad9a/0.6', r: 0.15, tall: 0.3 });
  P.glassOfWater(tt, 0.95, 0.12, tz, 0.4);
  P.dish(tt, 1.0, -0.2, tz, { mat: 'c#cfcbc4/0.2', r: 0.12 });
  model('rubber_duck_toy', tb, 2.66, -0.1, 2.05, 0, { scale: 0.36, turn: 0.9 });   // on the rolled rim at the foot
  // bath-side: a teak stool by the taps with rolled towels and bath oils
  const st = fr(20.0, 27.6, F2);
  st.cyl('oak_light#7a5a44', 0, 0, 1.55, 1.65, 0.48, 0.48, 20); for (const a of [0.4, 2.5, 4.6]) st.cyl('oak_light#7a5a44', Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0, 1.55, 0.05, 0.04, 6); st.block(-0.48, 0.48, -0.48, 0.48, 0, 1.65);
  P.rolls(st, -0.17, -0.12, 1.65, 2, TERRY2, 0.15); P.bottle(st, 0.2, 0.2, 1.65, { h: 0.5, r: 0.08, mat: 'c#b48530/0.2', cap: BRASS });
  P.bottle(st, -0.15, 0.25, 1.65, { h: 0.42, r: 0.075, mat: 'c#efe8d8/0.4', cap: 'c#3d4b44/0.4', pump: true });
  // the fern that loves the steam, high on a plant stand in the far corner
  const fs = fr(20.05, 28.55, F2);
  fs.cyl(OAKW, 0, 0, 2.3, 2.38, 0.42, 0.42, 18); for (const a of [0.8, 2.9, 5.0]) fs.cyl(OAKW, Math.cos(a) * 0.3, Math.sin(a) * 0.3, 0, 2.3, 0.04, 0.04, 6); fs.block(-0.42, 0.42, -0.42, 0.42, 0, 2.4);
  P.fern(fs, 0, 0, 2.38, { size: 0.75, pot: 'c#cfcbc4/0.4', dir: -0.785, spread: 2.2 });
  // Mary Cassatt over the tub's head, The Child's Bath
  picture(fr(X0, 26.9, F2, 3), 'cassatt_childs_bath', 0, 5.75, 1.25, 1.9, { frame: 'c#9a8a6a/0.4/0.6', border: 0.1, mat: 0.15 });
  // tub-end wall: a brass shelf of soaps and a shell under the window? no: candles on the sill
  kit.pillarCandle(fr(23.0, Y1, F2 + 3.4, 2), 0, 0.14, 0, 0.36, 0.1); kit.pillarCandle(fr(23.0, Y1, F2 + 3.4, 2), 0.3, 0.14, 0, 0.24, 0.09);
  P.bottle(fr(26.1, Y1, F2 + WH + 0.12, 2), 0, 0.07, 0, { h: 0.45, r: 0.06, mat: 'c#4f4a46/0.2', cap: BRASS });

  // ---- Washstand on the east wall: oak base, marble top with a sunk oval basin ----
  const ws = fr(X1 - 0.08, 23.6, F2, 1);                               // faces west into the room; x runs toward -Y
  const W = 3.4, D = 1.75, H = 2.85;
  for (const x of [-W / 2 + 0.12, W / 2 - 0.3]) for (const y of [0.12, D - 0.3]) ws.box(OAKW, x, x + 0.18, y, y + 0.18, 0, H - 0.5, G);   // legs
  // apron frame (open in the middle, where the basin hangs) with a drawer either side
  ws.box(OAKW, -W / 2 + 0.12, W / 2 - 0.12, D - 0.16, D - 0.1, H - 0.62, H - 0.12, G); ws.box(OAKW, -W / 2 + 0.12, W / 2 - 0.12, 0.12, 0.18, H - 0.62, H - 0.12, G);
  for (const x of [-W / 2 + 0.12, W / 2 - 0.18]) ws.box(OAKW, x, x + 0.06, 0.18, D - 0.16, H - 0.62, H - 0.12, G);
  for (const x of [-0.85, 0.85]) ws.box(OAKW, x - 0.6, x + 0.6, D - 0.11, D - 0.08, H - 0.56, H - 0.18, G);
  for (const x of [-0.85, 0.85]) ws.box(BRASS, x - 0.18, x + 0.18, D - 0.08, D - 0.04, H - 0.4, H - 0.34);
  ws.box(OAKW, -W / 2 + 0.15, W / 2 - 0.15, 0.15, D - 0.15, 0.55, 0.62, G);           // low shelf
  P.towels(ws, -0.85, 0.85, 0.62, 3, [TERRY, TERRY2, TERRY], 1.1, 0.95, 0.17);
  P.rolls(ws, 0.45, 0.85, 0.62, 3, 'wool#a9b8a8', 0.17);
  // marble top with an oval hole, and the basin sunk into it
  P.slab(ws, 'marble', [[-W / 2, 0], [W / 2, 0], [W / 2, D], [-W / 2, D]], [P.ellipse(0, 0.86, 0.66, 0.5)], H - 0.12, H);
  ws.box('marble', -W / 2, W / 2, 0, 0.06, H, H + 0.42);                                // backsplash
  P.lathe(ws, PORC, 0, 0.86, H - 0.5, [[0.0, 0.005], [0.5, 0.06], [0.64, 0.22], [0.66, 0.38], [0.665, 0.49], [0.63, 0.49], [0.61, 0.38], [0.58, 0.24], [0.46, 0.1], [0.0, 0.06]], { sx: 1, sy: 0.5 / 0.66, seg: 28, both: true });
  ws.cyl('c#8a8580/0.2/1', 0, 0.86, H - 0.445, H - 0.43, 0.06, 0.06, 12);               // drain
  // bridge faucet in unlacquered brass
  ws.cyl(BRASS, 0, 0.22, H, H + 0.55, 0.05, 0.04, 12); P.rod(ws, BRASS, [0, 0.22, H + 0.55], [0, 0.6, H + 0.6], 0.035, 8); ws.cyl(BRASS, 0, 0.6, H + 0.42, H + 0.62, 0.035, 0.03, 8);
  for (const x of [-0.42, 0.42]) { ws.cyl(BRASS, x, 0.22, H, H + 0.22, 0.05, 0.05, 10); ws.box('c#f2efe8/0.2', x - 0.12, x + 0.12, 0.2, 0.24, H + 0.2, H + 0.26); }
  ws.block(-W / 2, W / 2, 0, D, 0, H + 0.4);
  // on the counter: soap dish, hand soap, a cup of brushes, perfume, a tube of lotion, a jar of cream
  P.dish(ws, -1.2, 0.5, H, { mat: 'c#cfcbc4/0.2', r: 0.17 }); ws.soft('c#e8d0c8/0.6', -1.3, -1.1, 0.43, 0.57, H + 0.02, H + 0.1, 0.03);
  P.bottle(ws, -1.3, 1.05, H, { h: 0.45, r: 0.085, mat: 'c#7a5a44/0.2', cap: BLACK, pump: true, label: 'c#efe8d8/0.9' });
  ws.cyl('c#cfcbc4/0.05', 1.25, 0.45, H, H + 0.35, 0.09, 0.1, 12); for (const [dx, c] of [[-0.03, 'c#efe8d8/0.4'], [0.04, 'c#7a9a6a/0.4']]) P.rod(ws, c, [1.25 + dx, 0.45, H + 0.1], [1.25 + dx * 3, 0.45 + dx, H + 0.62], 0.018, 5);
  P.perfume(ws, 0.9, 0.35, H); P.perfume(ws, 1.25, 0.95, H, { glass: 'c#cfcbc4/0.05', juice: 'c#e8d0c8/0.2', cap: 'c#2a2622/0.2', w: 0.14, h: 0.28 });
  P.tube(ws, -1.08, 1.38, H, 'c#efe8d8/0.4', 'c#4f4a46/0.4'); P.jar(ws, 1.3, 1.4, H, { r: 0.11, lid: 'c#cfcbc4/0.2/1' });
  // the mirror over it, framed in brass, between two warm sconces
  const mw = fr(X1 - 0.004, 23.6, F2, 1);
  P.mirror(mw, 0, 5.45, 2.1, 2.7, { frame: BRASS, border: 0.1 });
  P.sconce(mw, -1.5, 5.4, { power: 0.75 }); P.sconce(mw, 1.5, 5.4, { power: 0.75 });

  // ---- Towels: a heated rail on the east wall and a linen étagère by the door ----
  const tr = fr(X1 - 0.004, 26.2, F2, 1);
  for (const x of [-0.75, 0.75]) { tr.cyl(BRASS, x, 0.25, 0.9, 4.3, 0.03, 0.03, 8); P.rod(tr, BRASS, [x, 0, 1.1], [x, 0.25, 1.1], 0.025, 6); P.rod(tr, BRASS, [x, 0, 4.1], [x, 0.25, 4.1], 0.025, 6); }
  for (const z of [1.3, 2.3, 3.2, 4.15]) P.rod(tr, BRASS, [-0.75, 0.25, z], [0.75, 0.25, z], 0.022, 6);
  P.hungTowel(tr, -0.62, 0.62, 0.25, 4.15, TERRY, 1.5); P.hungTowel(tr, -0.5, 0.55, 0.25, 2.3, TERRY2, 0.95);
  tr.block(-0.8, 0.8, 0, 0.35, 0, 4.4);
  picture(fr(X1, 26.2, F2, 1), 'redoute_rose', 0, 5.75, 0.9, 1.3, { frame: 'c#f2efe8/0.4', border: 0.07, mat: 0.12 });
  // étagère: open oak shelves stacked with towels, a basket of washcloths, a pothos on top
  const et = fr(X0 + 0.13, 22.4, F2, 3);                                // against the west wall, faces east
  const EW = 2.0, ED = 1.15, ETall = 5.6;
  for (const x of [-EW / 2, EW / 2 - 0.1]) et.box(OAKW, x, x + 0.1, 0.05, ED, 0, ETall, G);
  for (const z of [0.25, 1.55, 2.85, 4.1, ETall - 0.08]) et.box(OAKW, -EW / 2 + 0.1, EW / 2 - 0.1, 0.05, ED, z - 0.08, z, G);
  et.block(-EW / 2, EW / 2, 0.05, ED, 0, ETall);
  P.towels(et, -0.42, 0.62, 0.25, 6, [TERRY, TERRY, TERRY3], 0.8, 0.85, 0.16);
  P.towels(et, 0.46, 0.62, 0.25, 5, [TERRY2, TERRY], 0.8, 0.85, 0.16);
  P.towels(et, -0.45, 0.62, 1.55, 5, [TERRY3, TERRY], 0.75, 0.85, 0.16);
  P.rolls(et, 0.3, 0.6, 1.55, 2, TERRY, 0.17); P.rolls(et, 0.33, 0.95, 1.55, 2, TERRY2, 0.15);
  model('wicker_basket_02', et, -0.35, 0.6, 2.85, 0, { scale: 0.8 });
  P.bottle(et, 0.3, 0.45, 2.85, { h: 0.7, r: 0.12, mat: 'glass', cap: 'c#c9b48a/0.4', label: 'c#cfcbc4/0.9' }); P.jar(et, 0.62, 0.7, 2.85, { r: 0.13, h: 0.2, mat: 'c#cfcbc4/0.05', lid: 'c#b9b4aa/0.3/1' });
  P.jar(et, 0.3, 0.85, 2.85, { r: 0.1, h: 0.25, mat: 'c#f2efe8/0.2', lid: 'oak_light#8a6a48' });
  P.towels(et, -0.42, 0.6, 4.1, 2, [TERRY3, TERRY2], 0.8, 0.85, 0.16); bookStack(et, 0.5, 0.6, 4.1, 2);
  P.pothos(et, 0.15, 0.6, ETall, { dir: 1.57, spread: 2.6, trail: 2.2, size: 0.9 });
  // robe and a spare towel on brass hooks east of the door
  const rb = fr(25.45, Y0, F2, 0); rb.cyl(BRASS, 0, 0.05, 5.95, 6.13, 0.05, 0.05, 10); P.rod(rb, BRASS, [0, 0, 6.04], [0, 0.34, 6.1], 0.03, 8);
  kit.coatOnPeg(rb, 0, 0.3, 5.95, 'wool#d8d0bd', 'coat', { squash: 1.05 });
  { // what makes it a robe: a rolled shawl collar, a tied belt with its ends hanging, the front edge
    const RB = 'wool#c9bfa8', y = 0.56;
    for (const s of [-1, 1]) P.rod(rb, RB, [s * 0.2, y - 0.06, 5.72], [s * 0.03, y, 4.22], 0.065, 8);
    P.rod(rb, RB, [-0.6, y - 0.05, 4.15], [0.6, y - 0.05, 4.15], 0.06, 8);
    rb.cyl(RB, 0.08, y, 4.07, 4.23, 0.09, 0.09, 10);
    P.rod(rb, RB, [0.1, y, 4.1], [0.2, y, 3.35], 0.04, 6); P.rod(rb, RB, [0.06, y, 4.1], [-0.02, y, 3.5], 0.04, 6);
    P.rod(rb, 'wool#b3a88f', [0.03, y - 0.03, 4.05], [0.06, y - 0.05, 2.75], 0.014, 5);
  }         // the robe: the kit's lofted coat, not puffed out
  const hk = fr(26.8, Y0, F2, 0); hk.cyl(BRASS, 0, 0.06, 5.25, 5.37, 0.035, 0.035, 8); P.rod(hk, BRASS, [0, 0, 5.3], [0, 0.27, 5.38], 0.025, 6);
  P.hungTowel(fr(26.8, Y0 + 0.27, F2, 0), -0.3, 0.3, 0, 5.38, TERRY2, 1.6);

  // ---- High-tank toilet against the west wall ----
  const wc = fr(X0, 24.85, F2, 3);                              // faces east
  wc.soft(PORC, -0.38, 0.38, 0.35, 1.25, 0.02, 0.95, 0.18);                  // pedestal
  wc.soft(PORC, -0.6, 0.6, 0.25, 2.15, 0.85, 1.32, 0.3);                     // bowl
  wc.soft('c#cfcbc4/0.2', -0.5, 0.5, 0.45, 1.95, 1.3, 1.33, 0.2);            // the water's shadow inside the rim
  wc.soft(OAKW, -0.62, 0.62, 0.38, 2.2, 1.33, 1.4, 0.3);                     // oak seat
  wc.soft(OAKW, -0.6, 0.6, 0.42, 2.18, 1.4, 1.47, 0.3);                      // lid, down
  wc.box(OAKW, -0.65, 0.65, 0.04, 0.95, 5.75, 6.7, G); wc.box(OAKW, -0.7, 0.7, 0.04, 1.0, 6.7, 6.78, G);   // the high oak cistern, under the picture rail
  for (const x of [-0.45, 0.45]) wc.box(BRASS, x - 0.04, x + 0.04, 0.02, 0.5, 5.5, 5.75);                // brackets
  wc.cyl(BRASS, 0, 0.35, 1.3, 5.75, 0.05, 0.05, 10); P.rod(wc, BRASS, [0, 0.35, 1.3], [0, 0.75, 1.15], 0.05, 10);
  P.rod(wc, BRASS, [0.5, 0.9, 6.05], [0.5, 1.15, 6.05], 0.02, 6); P.rod(wc, 'c#b9b4aa/0.3/1', [0.5, 1.15, 6.05], [0.55, 1.2, 4.6], 0.01, 4);
  wc.cyl('c#f2efe8/0.2', 0.55, 1.2, 4.3, 4.6, 0.04, 0.05, 10);            // porcelain pull
  wc.block(-0.62, 0.62, 0, 2.2, 0, 1.5);
  // paper on a brass holder, a spare roll, and a small framed print over the cistern? no: a plant
  const ph = fr(X0, 23.55, F2, 3); P.rod(ph, BRASS, [0, 0.0, 2.3], [0, 0.3, 2.3], 0.025, 6); P.rod(ph, BRASS, [-0.25, 0.3, 2.3], [0.25, 0.3, 2.3], 0.02, 6);   P.rod(ph, 'c#f2efe8/0.9', [-0.22, 0.3, 2.3], [0.22, 0.3, 2.3], 0.18, 14);
  // the bath mat, in front of the tub
  const mt = fr(23.4, 25.6, F2 + 0.02);
  mt.soft('wool#efe8d8', -1.4, 1.4, -0.85, 0.85, 0, 0.07, 0.04); for (let x = -1.3; x < 1.2; x += 0.26) mt.box('wool#cfcbc4', x, x + 0.1, -0.86, -0.82, 0.02, 0.06);
  // a snake plant in the gap at the tub's foot, and slippers kicked off by the mat
  P.snake(fr(26.92, 28.95, F2 + 0.02), 0, 0, 0, { size: 0.78, pot: 'c#cfcbc4/0.4' });
  P.slippers(fr(25.17, 25.7, F2 + 0.02, 2), 0, 0, 0, 'wool#d8d0bd');
}
