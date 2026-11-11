// Library (bedroom no. 3, south-west, upstairs): X 0.5-18.8, Y 17.6-29.5.
//   Bookcases on the east wall (front at Y 18.55), the north wall (front X 17.85, Y 21.5-29.1)
//   and the west wall north of the window (front Y 28.55, X 12.5-18.5). Window seat under the
//   south window (X 0.5-2.3, Y 19.9-26.7); west window X 4.5-11.7. Door X 18.8, Y 17.9-20.6.
import { LINEN, OAT, SAGE, RUST, NAVY, MUSTARD, CREAM, ROSE, ENAMEL, BRASS, STEEL, BLACK, GREEN, MARBLE, DARK, WHITE, G, DIRS } from '../kit.js';
import { wx, wz } from '../builder.js';
import { F1, F2 } from '../house.js';
import { props } from './trinkets.js';

const OAK = 'oak_light#a3825c';

export default function (kit) {
  const { B, fr, world, yawOf, seat, lampAt, model, tableLamp, floorLamp, candle, book, bookRow, bookStack, bookcase, sofa, armchair, bed, table, mug, picture, rug, posy, cabinets, cup, rnd, pick, lamps, seats, candles, models, extras, books, steam, jarCandle, throwBlanket } = kit;
  const P = props(kit);
  rug(3.0, 15.6, 19.5, 28.2, F2, 'tabriz');
  bookcase(fr(8.6, 17.6, F2, 0), 15.6, 6.8); bookcase(fr(18.8, 25.3, F2, 1), 7.6, 6.8); bookcase(fr(15.5, 29.5, F2, 2), 6.0, 6.8);   // tops under the picture rail (6.95)
  // A ladder for the top shelves
  const ld = fr(9.4, 18.75, F2, 0); ld.block(-0.7, 0.7, -0.2, 0.9, 0, 6);   /* moved along, out of the telescope's way */ for (const x of [-0.65, 0.55]) ld.box('fir', x, x + 0.1, 0, 0.12, 0, 7.2, { rot: [0.17, 0, 0], ...G });
  for (let z = 0.9; z < 7; z += 0.95) ld.box('fir', -0.6, 0.6, 0.55 - z * 0.17, 0.85 - z * 0.17, z, z + 0.07, G);
  P.pothos(fr(12.0, 17.6, F2 + 6.93, 0), 0, 0.85, 0, 1.1, 'c#b8755a/0.8', 61);          // trailing off the top of the east bookcase

  // ---- The reading table: a long oak library table, lamp lit, books open ----
  const tt = fr(13.4, 23.4, F2, 0);
  table(tt, 5.2, 3.0, 2.5, OAK, 0.24);
  tt.box(OAK, -2.2, 2.2, -1.1, 1.1, 0.5, 0.58, G);                                       // low shelf
  bookStack(tt, -1.2, -0.3, 0.58, 4); bookStack(tt, 1.0, 0.2, 0.58, 3);
  model('st_bankers_lamp', tt, -1.9, -0.95, 2.5, 2); lampAt(tt, -1.9, -0.7, 3.6, 0.8);
  kit.openBook(tt, -0.2, 0.1, 2.5, { cover: 'c#6b2a25/0.7', turn: 0.05 });                          // an atlas open in the middle
  kit.openBook(tt, 1.35, -0.55, 2.5, { cover: 'c#26364f/0.7', turn: -0.25 });
  { const mg = tt.sub(1.2, -0.5, 2.565); P.torus(mg, BRASS, 0, 0, 0.02, 0.15, 0.018); P.lathe(mg, 'glass', 0, 0, 0.012, [[0, 0], [0.145, 0], [0.145, 0.016], [0, 0.016]], 20); P.rbox(mg, 'c#2a2520/0.4', 0.3, -0.1, 0.02, 0.32, 0.06, 0.04, 0.02, { yaw: -0.32 }); }   // a magnifier lying on the page (the scanned one stood on its rim)
  // a Greek kylix under study on a folded cloth, a winged stereoscope, tea going cold
  P.rbox(tt, 'linen#d8ccb0', 1.75, 0.65, 2.53, 1.0, 0.8, 0.05, 0.02);
  model('si_kylix_greek_cup', tt, 1.75, 0.65, 2.56, 0, { turn: 0.4 });
  P.cupSaucer(tt, -1.55, 0.95, 2.5); bookStack(tt, -2.1, 0.45, 2.5, 3);
  P.book(tt, 0.65, 1.05, 2.5, 0.55, 0.75, 0.06, 'c#2a2623/0.6'); tt.cyl('c#b08d4a/0.3/1', 0.95, 1.0, 2.565, 2.59, 0.012);   // notebook and pen
  kit.diningChair(tt, 0.8, -2.0, { wood: OAK, back: 'spindle', seat: 'leather#5a3a28' }); kit.diningChair(tt, -0.8, 2.0, { wood: OAK, back: 'spindle', seat: 'leather#5a3a28', dq: 2 });

  // ---- Two deep chairs at the west window, a game of chess left mid-play between them ----
  const lt = fr(6.6, 25.95, F2); lt.cyl('fir', 0, 0, 1.6, 1.7, 1.15, 1.15, 28); lt.cyl('fir', 0, 0, 0, 1.6, 0.12); lt.cyl('fir', 0, 0, 0, 0.08, 0.6); lt.block(-1, 1, -1, 1, 0, 1.7);
  // (the chess set itself is set out by toys.js, so that its pieces can be played)
  // deep armchairs in green velvet, a throw over each arm (frames: 3 x 3, facing the chess table)
  const ca = fr(2.4, 25.95, F2, 3), cb = fr(10.8, 25.95, F2, 1);
  armchair(ca, 'linen#4a6650', 'linen#b48530'); armchair(cb, 'linen#4a6650', 'linen#96492f');
  throwBlanket(ca, 0.95, 1.5, 0.5, 2.8, 2.12, 'wool#c9c0ac', { over: 'arm' }); throwBlanket(cb, -1.5, -0.95, 0.5, 2.8, 2.12, 'wool#96492f', { over: 'arm' });
  P.basket(fr(9.0, 23.5, F2), 0, 0, 0, 0.55, 0.85, 'wicker'); B.block(8.45, 9.55, 22.95, 24.05, F2, F2 + 1.6);   // throws within reach
  P.folded(fr(9.0, 23.5, F2), 0, 0, 0.42, 0.85, 0.75, ['wool#96492f', 'wool#c9c0ac', 'wool#2f4a3a']);
  // A glass-topped case of fossils under the window, behind the chess table
  const vc = fr(6.9, 29.25, F2, 2);
  for (const x of [-1.15, 1.03]) for (const y of [0.1, 0.98]) vc.box(OAK, x, x + 0.12, y, y + 0.12, 0, 1.75, G);
  vc.box(OAK, -1.2, 1.2, 0.05, 1.15, 1.6, 1.75, G); vc.box(OAK, -1.2, 1.2, 0.05, 1.15, 0.35, 0.42, G);
  vc.box('linen#2a3549', -1.1, 1.1, 0.15, 1.05, 1.75, 1.8);
  for (const [x0, x1, y0, y1] of [[-1.2, 1.2, 0.05, 0.11], [-1.2, 1.2, 1.09, 1.15], [-1.2, -1.14, 0.11, 1.09], [1.14, 1.2, 0.11, 1.09]]) vc.box(OAK, x0, x1, y0, y1, 1.75, 2.12);
  vc.box('glass', -1.14, 1.14, 0.11, 1.09, 2.06, 2.1);
  vc.block(-1.2, 1.2, 0.05, 1.15, 0, 2.12);
  model('si_trilobite', vc, -0.6, 0.6, 1.8, 0, { scale: 0.9, turn: 0.3 }); model('si_ammonite_exiteloceras', vc, 0.15, 0.6, 1.8, 0, { scale: 0.55 });
  model('si_megalodon_tooth', vc, 0.75, 0.55, 1.8, 0, { scale: 0.55, turn: -0.4 }); 
  P.bowl(vc, 0, 0.2, 2.12, 0.2, 'c#8a6a4a/0.5'); 

  // ---- Curiosities on plinths ----
  const mp = fr(1.5, 28.3, F2, 3);                                                       // the kneeling winged monster, SW corner
  mp.box('c#3a332c/0.6', -0.8, 0.8, -0.75, 0.75, 0, 0.96); mp.box('c#3a332c/0.6', -0.85, 0.85, -0.8, 0.8, 0.96, 1.02); mp.block(-0.8, 0.8, -0.8, 0.8, 0, 4);   // narrower, clear of the armchair
  model('si_kneeling_winged_monster', mp, 0, 0, 1.02, 0, { turn: -0.55, scale: 0.82 });
  picture(fr(0.5, 28.3, F2, 3), 'hammershoi_music_room', 0, 5.45, 1.5, 1.78, { frame: BLACK, border: 0.08, mat: 0.16 });
  const bp = fr(12.0, 28.4, F2);                                                         // a marble bust on a fluted column
  P.lathe(bp, MARBLE, 0, 0, 0, [[0, 0], [0.48, 0], [0.48, 0.18], [0.38, 0.24], [0.33, 0.3], [0.3, 3.0], [0.36, 3.08], [0.44, 3.14], [0.44, 3.28], [0, 3.28]], 24);
  bp.block(-0.45, 0.45, -0.45, 0.45, 0, 4);
  model('marble_bust_01', bp, 0, 0, 3.28, 2, { turn: -0.5 });

  // ---- Lamps, plants, and a throw on the window seat ----
  floorLamp(fr(13.6, 27.6, F2), 0, 0); floorLamp(fr(3.25, 28.8, F2), 0, 0); B.block(13.3, 13.9, 27.3, 27.9, F2, F2 + 5.5); B.block(2.95, 3.55, 28.5, 29.1, F2, F2 + 5.5);
  // A floor-standing library globe by the south window (the house's one telescope is on the sleeping porch):
  // an oak stand of four turned legs with a stretcher ring, the horizon band, a brass meridian, a parchment ball
  { const gl = fr(4.7, 21.0, F2, 0), OAKG = 'oak_light#7a5a44';
    for (const a of [0.785, 2.356, 3.927, 5.498]) { const cx = Math.cos(a) * 0.86, cy = Math.sin(a) * 0.86; gl.cyl(OAKG, cx, cy, 0, 2.66, 0.055, 0.045, 8); gl.cyl(OAKG, cx, cy, 0, 0.06, 0.09, 0.09, 10); }
    P.torus(gl, OAKG, 0, 0, 0.75, 0.86, 0.04);                                                   // stretcher ring
    gl.cyl(OAKG, 0, 0, 0.75, 0.82, 0.12, 0.12, 12); gl.cyl(OAKG, 0, 0, 0.82, 1.95, 0.035, 0.035, 8);   // centre post to the meridian
    P.torus(gl, OAKG, 0, 0, 2.7, 0.9, 0.07);                                                     // horizon band
    P.torus(gl, BRASS, 0, 0, 2.7, 0.8, 0.022, Math.PI * 2, { rot: [Math.PI / 2, 0, 0] });            // the meridian ring
    // (the ball, with its map, is hung here by toys.js so that it can spin)
    gl.cyl(BRASS, 0, 0, 1.9, 1.98, 0.06, 0.04, 10); }
  B.block(3.75, 5.65, 20.05, 21.95, F2, F2 + 3.5);
  kit.pottedPlant(fr(17.1, 27.6, F2), 0, 0, 0, 'snake', { size: 1.27, pot: 'c#2f4a5a/0.35' }); B.block(16.7, 17.5, 27.2, 28.0, F2, F2 + 3);
  B.pbox('fir', 0.5, 2.3, 19.9, 26.7, F2, F2 + 1.3, G); B.prbox(OAT, 0.54, 2.26, 19.94, 26.66, F2 + 1.28, F2 + 1.66, 0.1); B.block(0.5, 2.3, 19.9, 26.7, F2, F2 + 1.6);
  seats.push({ x: wx(1.4), y: F2 + 1.66 + 2.45, z: wz(23.3), yaw: Math.atan2(-1, 0), label: 'sit in the window' });
  B.prbox(MUSTARD, 0.7, 1.9, 20.1, 21.2, F2 + 1.62, F2 + 2.1, 0.2); B.prbox(NAVY, 0.7, 1.9, 25.4, 26.5, F2 + 1.62, F2 + 2.1, 0.2);
  throwBlanket(fr(1.4, 22.6, F2 + 1.66, 3), -0.9, 0.9, -0.7, 0.94, 0.01, 'wool#6c7a60', { over: 'front' });   // its fall clear of the seat front (X 2.3)
  jarCandle(tt, 2.25, -1.05, 2.5, { label: 'c#a8b8a0/0.6', r: 0.15, tall: 0.32 });
}
