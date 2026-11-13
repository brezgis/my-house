// The furnishing kit: the frame system and the ready-made builders every room
// uses. Rooms live in src/rooms/, one file each; the builders themselves live
// in src/kit/ (geometry in geom.js, upholstery and cloth in soft.js, joinery in
// wood.js, lamps and fittings in light.js, the bathroom in bath.js, small
// things in props.js, material names in mats.js).
//
// Positions are in plan feet (see builder.js). A "frame" puts a piece at a
// point, turned in quarter turns: q = 0 faces west (+Y), 1 south (-X),
// 2 east, the street (-Y), 3 north (+X). Inside a frame, x runs along the
// piece, y is depth with the front toward +y, z is height above the frame.
//
// ?showroom (or ?showroom=soft|wood|bath|kitchen|light|props) lays every piece
// out on the front lawn for close inspection, labelled with its triangle count.

import * as THREE from 'three';
import { wx, wz } from './builder.js';
import { F1, F2 } from './house.js';
import * as geom from './kit/geom.js';
import * as M from './kit/mats.js';
import { makeSoft } from './kit/soft.js';
import { makeWood } from './kit/wood.js';
import { makeLight } from './kit/light.js';
import { makeBath } from './kit/bath.js';
import { makeProps } from './kit/props.js';
import { showroom } from './kit/showroom.js';

// Fabrics are woven (textured linen in these colours); the rest are plain paints, glazes and metals.
export const LINEN = 'linen#b3a892', OAT = 'linen#a39678', SAGE = 'linen#6c7a60', RUST = 'linen#96492f';
export const NAVY = 'linen#2a3549', MUSTARD = 'linen#b48530', CREAM = 'linen#c9c0ac', ROSE = 'linen#a8756f';
export const ENAMEL = 'c#cfcbc2/0.35', BRASS = 'c#b08d4a/0.35/1', STEEL = 'c#c9ccd0/0.22/1', BLACK = 'c#17140f/0.3';
export const GREEN = 'c#66755e/0.6', MARBLE = 'marble', DARK = 'c#2c2520/0.6', WHITE = 'c#cfcbc2/0.6';
export const G = { grain: 'long' };
export const DIRS = [[0, 1], [-1, 0], [0, -1], [1, 0]];
export const { FIR, OAK, HONEY, WALNUT, EBONY, PAINT, PAINT_SAGE, PAINT_GREEN, PAINT_BLUE, OLD_BRASS, BRONZE, NICKEL, IRON, CHROME, PORCELAIN, CLAY, COTTON, TICKING, TERRY, GLASS, MIRROR, PAPER } = M;

export function makeKit(B) {
  const lamps = [], seats = [], candles = [], models = [], extras = [], books = [], steam = [];
  // Accept the short form of a plain colour ('c#111/0.6' = 'c#111111/0.6') wherever geometry is added.
  if (!B.add.short) { const add = B.add.bind(B); B.add = Object.assign((mat, g) => add(typeof mat === 'string' ? mat.replace(/^([ce])#([0-9a-f])([0-9a-f])([0-9a-f])(?![0-9a-f])/i, '$1#$2$2$3$3$4$4') : mat, g), { short: true }); }
  let seed = 20261110;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pick = a => a[Math.floor(rnd() * a.length)];

  function fr(X, Y, h, q = 0) {
    const map = (lx, ly) => (q === 0 ? [X + lx, Y + ly] : q === 1 ? [X - ly, Y + lx] : q === 2 ? [X - lx, Y - ly] : [X + ly, Y - lx]);
    const span = (x0, x1, y0, y1) => { const [a, b] = map(x0, y0), [c, d] = map(x1, y1); return [Math.min(a, c), Math.max(a, c), Math.min(b, d), Math.max(b, d)]; };
    return {
      X, Y, h, q, map, dir: DIRS[q],
      box(mat, x0, x1, y0, y1, z0, z1, o) { B.pbox(mat, ...span(x0, x1, y0, y1), h + z0, h + z1, o); },
      soft(mat, x0, x1, y0, y1, z0, z1, r) { B.prbox(mat, ...span(x0, x1, y0, y1), h + z0, h + z1, r); },
      cyl(mat, x, y, z0, z1, r0, r1, seg) { const [a, b] = map(x, y); B.pcyl(mat, a, b, h + z0, h + z1, r0, r1 ?? r0, seg); },
      block(x0, x1, y0, y1, z0, z1) { B.block(...span(x0, x1, y0, y1), h + z0, h + z1); },
      sub(x, y, z = 0, dq = 0) { const [a, b] = map(x, y); return fr(a, b, h + z, (q + dq) % 4); },
      // A chamfered board (edges eased by e), grain along its longest side unless o.grain says.
      bev(mat, x0, x1, y0, y1, z0, z1, e = 0.015, o) { put(this, mat, geom.bev(x0, x1, y0, y1, z0, z1, e, o)); },
      // A cushion-like rounded box; o as geom.softBox (crown, bulge, sag, welt ...).
      cushion(mat, x0, x1, y0, y1, z0, z1, r = 0.1, o) { put(this, mat, geom.softBox(x0, x1, y0, y1, z0, z1, r, o)); },
      // A turned shape: profile [[r, z], ...] bottom to top, centred at (x, y).
      lathe(mat, x, y, profile, o = {}) { put(this, mat, geom.lathe(profile, o), { at: [x, y, 0] }); },
    };
  }
  // The matrix taking a frame's local feet (x along, y depth, z up) to world space.
  const mtx = new THREE.Matrix4();
  function frameMatrix(f) {
    const o = f.map(0, 0), ex = f.map(1, 0), ey = f.map(0, 1);
    return mtx.set(ex[0] - o[0], ey[0] - o[0], 0, wx(o[0]), 0, 0, 1, f.h, -(ex[1] - o[1]), -(ey[1] - o[1]), 0, -o[1], 0, 0, 0, 1);
  }
  // Add any geometry built in a frame's local coordinates (see kit/geom.js). t: { at, rx, ry, rz, s }
  function put(f, mat, g, t) { if (t) geom.xf(g, t); g.applyMatrix4(frameMatrix(f)); B.mesh(mat, g); return g; }

  const world = (f, x, y) => { const [a, b] = f.map(x, y); return [wx(a), wz(b)]; };
  const yawOf = ([dx, dy]) => Math.atan2(dx, -dy);                       // for models and pictures
  const seat = (f, x, y, z, label = 'sit') => { const [a, b] = world(f, x, y); seats.push({ x: a, y: f.h + z + 2.45, z: b, yaw: Math.atan2(-f.dir[0], f.dir[1]), label }); };
  const lampAt = (f, x, y, z, power) => { const [a, b] = world(f, x, y); lamps.push({ x: a, y: f.h + z, z: b, power, kind: 'lamp' }); };
  const model = (id, f, x, y, z = 0, dq = 0, o = {}) => { const [a, b] = world(f, x, y); models.push({ id, x: a, y: f.h + z, z: b, rotY: yawOf(DIRS[(f.q + dq) % 4]) + (o.turn ?? 0), ...o }); };

  // ---- Books -----------------------------------------------------------------------
  const nooks = [];             // gaps left on shelves, for trinkets
  const book = (f, x0, x1, y0, y1, z0, z1, lying = false) => {
    const [a, b] = f.map(x0, y0), [c, d] = f.map(x1, y1);
    books.push({ x: wx((a + c) / 2), y: f.h + (z0 + z1) / 2, z: wz((b + d) / 2), sx: Math.abs(c - a), sy: z1 - z0, sz: Math.abs(d - b), q: f.q, lying });
  };
  // A row of books standing on a shelf whose back is at y = back.
  function bookRow(f, x0, x1, back, z, clear, fill = 0.9) {
    let x = x0;
    while (x < x1 - 0.1) {
      if (rnd() > fill) { const gap = 0.3 + rnd() * 1.1; if (gap > 0.7 && x + gap < x1) nooks.push({ f, x: x + gap / 2, y: back + 0.42, z, w: gap, clear }); x += gap; continue; }
      if (rnd() < 0.07 && x1 - x > 1.1) {                                // a few lying flat
        const n = 2 + Math.floor(rnd() * 3), len = 0.7 + rnd() * 0.25;
        for (let i = 0; i < n; i++) book(f, x, x + len, back + 0.05, back + 0.6, z + i * 0.13, z + i * 0.13 + 0.12, true);
        x += len + 0.08; continue;
      }
      const t = 0.07 + rnd() * 0.13, ht = Math.min(clear - 0.08, 0.62 + rnd() * 0.36), dp = 0.5 + rnd() * 0.18;
      book(f, x, x + t, back + 0.04, back + 0.04 + dp, z, z + ht);
      x += t + 0.008;
    }
  }
  const bookStack = (f, x, y, z, n = 3) => { for (let i = 0; i < n; i++) { const w = 0.62 + rnd() * 0.2, d = 0.45 + rnd() * 0.12, o = (rnd() - 0.5) * 0.08; book(f, x - w / 2 + o, x + w / 2 + o, y - d / 2, y + d / 2, z + i * 0.12, z + i * 0.12 + 0.11, true); } };

  // ---- Printed surfaces, rugs, doors -------------------------------------------------------
  // A drawn surface: a label, package front, magazine cover, screen, sign.
  // draw(g, w, h) paints a canvas of cw x ch pixels. It hangs at local (x, y)
  // facing the frame's front, centred at height z, w feet wide and tall feet
  // high; with flat: true it lies face-up at height z instead (w along x, tall along y).
  function sign(f, x, y, z, w, tall, draw, o = {}) {
    const [a, c] = world(f, x, y);
    extras.push({ draw, cw: o.cw ?? 256, ch: o.ch ?? 256, x: a, y: f.h + z, z: c, rotY: yawOf(f.dir) + (o.turn ?? 0), w, h: tall, flat: !!o.flat, glow: o.glow, rough: o.rough, tilt: o.tilt });
  }
  // A printed box or bag: a body with a drawn front (and the same on the back if both: true).
  function pack(f, x, y, z, w, d, tall, colour, draw, o = {}) {
    put(f, colour, geom.bev(x - w / 2, x + w / 2, y - d / 2, y + d / 2, z, z + tall, Math.min(0.012, w * 0.05, d * 0.05, tall * 0.05)));
    sign(f, x, y + d / 2 + 0.004, z + tall / 2, w * 0.98, tall * 0.98, draw, o);
  }
  const rug = (X0, X1, Y0, Y1, h, style) => extras.push({ rug: style, x: wx((X0 + X1) / 2), y: h + 0.035, z: wz((Y0 + Y1) / 2), w: X1 - X0, d: Y1 - Y0 });
  // A hinged panel visitors can open and shut (cupboard, fridge, wardrobe).
  // It closes flush across x0..x1 at depth y, and swings out toward the
  // frame's front. hinge: 'left' (at x0) or 'right' (at x1).
  const hinged = [];
  function hingedDoor(f, x0, x1, y, z0, z1, o = {}) {
    const right = o.hinge === 'right', [hx, hy] = f.map(right ? x1 : x0, y), [ex, ey] = f.map(right ? x0 : x1, y);
    const closed = Math.atan2(ey - hy, ex - hx), cross = Math.cos(closed) * f.dir[1] - Math.sin(closed) * f.dir[0];
    hinged.push({ x: wx(hx), z: wz(hy), y0: f.h + z0, y1: f.h + z1, w: Math.abs(x1 - x0), closed, open: closed + Math.sign(cross) * (o.swing ?? 1.75),
      slab: { th: o.thick ?? 0.07, mat: o.mat ?? GREEN, handle: o.handle ?? BRASS }, label: o.label ?? 'cupboard', cx: wx((hx + ex) / 2), cz: wz((hy + ey) / 2) });
  }

  // ---- The builders ----------------------------------------------------------------------
  const K = { B, F1, F2, wx, wz, geom, mats: M, fr, put, frameMatrix, world, yawOf, seat, lampAt, model, rnd, pick, lamps, seats, candles, models, extras, books, steam, hinged, nooks, book, bookRow, bookStack, sign, pack, rug, hingedDoor,
    LINEN, OAT, SAGE, RUST, NAVY, MUSTARD, CREAM, ROSE, ENAMEL, BRASS, STEEL, BLACK, GREEN, MARBLE, DARK, WHITE };
  for (const make of [makeLight, makeProps, makeSoft, makeWood, makeBath]) Object.assign(K, make(K));

  if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('showroom')) showroom(K, new URLSearchParams(location.search).get('showroom'));
  return K;
}
