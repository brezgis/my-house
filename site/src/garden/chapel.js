// The chapel: a small shingled building at the island's south edge, past the willow at the end of
// the stepping stones from the pond. Not a church: a place to sit and think, about minds and how
// things come to be. It is of the house's family (dark-stained timber, shingles, a clinker brick
// base, a steep roof on exposed rafters) and twelve by eighteen feet inside, plastered pale so the
// coloured light shows on it.
//
//   the door, standing open, at the east end, MORE IS DIFFERENT cut in the lintel over it
//   W1  murmuration         round, in the gable over the door (morning sun)
//   W7  ingressing minds    the great window in the west gable, opposite the door (afternoon sun)
//   south wall, on the edge: the eigen window, Life (it moves), and the strange loop, with a clear
//                            roundel at its heart that looks out over the edge
//   north wall, the garden: the neuron, broken symmetry, Turing
//   on the ridge over the door, where a church has its cross, a weathervane: four plain arms, all
//        directions equal, until the wind chooses one; its vane a murmuration of copper starlings drawing
//        together into a single bird at the point; a Möbius band at the top for the strange loop
//   inside: window seats along both walls, a stone table before the great window with candles and
//   a bowl of water, Piaget's sentence cut in its front edge
//
// The glass is drawn in chapel_glass.js. Here it is lit: from inside by day each window shines with
// the sky behind it, brighter when the sun is on it; from outside by day it is dark; after dark,
// if the candles are lit, it glows. Where the sun comes through, each window's colours are laid on
// the floor and walls (one mesh lining the room, its shader following the sun back to the glass).
// The room counts as indoors for the house's light (lighting.js) and for the eye (main.js).

import * as THREE from 'three';
import { PAINT } from './tools.js';
import { wind } from './cards.js';
import { WINDOWS, makeLife, poolCopy, w7Outline, FONT, rng, LOOP_EYE } from './chapel_glass.js';

// ---- where it stands (world feet) -----------------------------------------------------------------
const CX = -104, CZ = -19, IX0 = -110, IX1 = -98, IZ0 = -28, IZ1 = -10, TH = 0.6;
const OX0 = IX0 - TH, OX1 = IX1 + TH, OZ0 = IZ0 - TH, OZ1 = IZ1 + TH;
// its own colours: new cedar shingles (lighter and warmer than the old house's), cream-painted trim, a verdigris door
const SHAKE = 'shake#ffd8a8', TRIM = 'c#fff3d8/0.7', DOORPAINT = 'c#58786e/0.6';
// (a shingle tint is taken as linear and gained 1.5, a paint colour as linear times 0.78: these come out as new
// cedar, lighter and warmer than the house's shingle, since its front is always in shade, and a warm cream near e9dcc0)
const FL = 1.0, PLATE = 9.5, PITCH = 1.28;                          // floor, top of the side walls, roof slope (52 degrees)
const yC = d => PLATE + (6 - d) * PITCH;                           // the ceiling, d feet from the middle line
const yO = d => yC(d) + 1.0;                                        // the roof's top
const DOOR = { x0: CX - 1.5, x1: CX + 1.5, h: 7 };
const TABLE = { x0: CX - 2.6, x1: CX + 2.6, z0: IZ0 + 0.9, z1: IZ0 + 2.5, y: FL + 2.7 };

export const CHAPEL = {
  x: CX, z: CZ, floor: FL,
  door: { x: CX, z: OZ1, yaw: Math.PI },                            // the doorway; yaw faces out of it (as walk.js: 0 looks toward -z)
  inside: { x0: IX0 - 0.5, x1: IX1 + 0.5, y0: 0.5, y1: yO(0) + 0.2, z0: IZ0 - 0.5, z1: IZ1 + 0.5 },     // lit as indoors (lighting.js): the walls' inner faces in, outer faces out
  table: { x: CX, y: TABLE.y, z: (TABLE.z0 + TABLE.z1) / 2 },
  keeper: { x: CX + 3.6, y: FL, z: TABLE.z1 + 1.4, yaw: Math.atan2(3.6, 1.4 + (TABLE.z1 - TABLE.z0) / 2) },     // a spot by the candles for someone small to stand, facing the table
};

// The windows: where each one's glass is, which way is out, which way its picture runs seen from inside
const SILL = FL + 2.6, WW = 2.5, WH = 5.0, ROUND = { r: 2.0, y: FL + 10.3 };      // ROUND: the window over the door
const side = (id, wall, z) => wall === 'S'
  ? { id, c: [OX0 + 0.15, SILL + WH / 2, z], n: [-1, 0, 0], u: [0, 0, -1], w: WW, h: WH }
  : { id, c: [OX1 - 0.15, SILL + WH / 2, z], n: [1, 0, 0], u: [0, 0, 1], w: WW, h: WH };
const GLASS = [
  side('eigen', 'S', -13.5), side('life', 'S', -19), side('loop', 'S', -24.5),
  side('neuron', 'N', -13.5), side('symmetry', 'N', -19), side('turing', 'N', -24.5),
  { id: 'murmuration', c: [CX, ROUND.y, OZ1 - 0.15], n: [0, 0, 1], u: [-1, 0, 0], w: ROUND.r * 2, h: ROUND.r * 2, round: true },
  { id: 'ingression', c: [CX, FL + 2.0 + 5, OZ0 + 0.15], n: [0, 0, -1], u: [1, 0, 0], w: 5.0, h: 10.0, gable: true },
];

// ---- the building, laid out with the garden's kit ------------------------------------------------------
export function buildChapel(K, items) {
  const { B, F, G } = K;
  // nothing grows through it, and the trees thrown at random round the rim stand back
  (F.keepOut ??= []).push([OX0 - 1.2, OX1 + 1.2, OZ0 - 1.2, OZ1 + 2.5]);
  for (let i = K.trees.length - 1; i >= 0; i--) { const t = K.trees[i]; if (!t.y && Math.hypot(t.x - CX, t.z - CZ) < 26 && t.x < -90) K.trees.splice(i, 1); }

  // floor, base and steps
  // the base course: the full wall's thickness up to the floor, and above it only the outer 0.3 ft, under the
  // shingles (the plaster comes down to the floor inside, so the brick must not show its face in the plaster's)
  const base = (x0, x1, z0, z1, xin, zin) => { K.box('clinker', x0, x1, 0, FL, z0, z1); K.box('clinker', xin?.[0] ?? x0, xin?.[1] ?? x1, FL, FL + 0.6, zin?.[0] ?? z0, zin?.[1] ?? z1); };
  base(OX0 - 0.15, OX1 + 0.15, OZ0 - 0.15, OZ0 + TH, null, [OZ0 - 0.15, OZ0 + 0.3]);           // west
  base(OX0 - 0.15, DOOR.x0, OZ1 - TH, OZ1 + 0.15, null, [OZ1 - 0.3, OZ1 + 0.15]);                // east, either side of the door
  base(DOOR.x1, OX1 + 0.15, OZ1 - TH, OZ1 + 0.15, null, [OZ1 - 0.3, OZ1 + 0.15]);
  base(OX0 - 0.15, OX0 + TH, OZ0 + TH, OZ1 - TH, [OX0 - 0.15, OX0 + 0.3]);                       // south
  base(OX1 - TH, OX1 + 0.15, OZ0 + TH, OZ1 - TH, [OX1 - 0.3, OX1 + 0.15]);                       // north
  K.box('clinker', DOOR.x0, DOOR.x1, 0, FL - 0.02, OZ1 - TH, OZ1 + 0.15);                        // under the threshold
  // the floor: pale limestone flags, two by three, a little different one from the next
  K.box('c#8a7f6c/1', IX0, IX1, FL - 0.3, FL - 0.03, IZ0, IZ1);
  for (let x = IX0, i = 0; x < IX1 - 0.01; x += 2, i++) for (let z = IZ0 - (i % 2), j = 0; z < IZ1 - 0.01; z += 3, j++) {
    const z0 = Math.max(IZ0, z), z1 = Math.min(IZ1, z + 3), v = ((i * 7 + j * 5) % 5) - 2, base = [0xa6, 0x97, 0x7e].map((c, k) => Math.max(0, Math.min(255, c + v * 5 + ((i + j) % 3) * 3 - k * ((i * j) % 2))));
    K.box('c#' + base.map(c => c.toString(16).padStart(2, '0')).join('') + '/0.85', x + 0.012, Math.min(IX1, x + 2) - 0.012, FL - 0.2, FL, z0 + 0.012, z1 - 0.012);
  }
  K.box('timber', DOOR.x0, DOOR.x1, FL - 0.1, FL + 0.02, OZ1 - TH - 0.05, OZ1 + 0.1);            // the threshold board
  K.box('clinker', DOOR.x0 - 1.1, DOOR.x1 + 1.1, 0, 0.5, OZ1 + 0.15, OZ1 + 1.6);                 // a step up
  K.surface(IX0, IX1, IZ0, IZ1, FL); K.surface(DOOR.x0, DOOR.x1, OZ1 - TH - 0.1, OZ1 + 0.15, FL); K.surface(DOOR.x0 - 1.1, DOOR.x1 + 1.1, OZ1 + 0.15, OZ1 + 1.6, 0.5);
  // clinker piers at the corners, as at the house's porch
  for (const x of [OX0, OX1]) for (const z of [OZ0, OZ1]) { K.box('clinker', x - 0.7, x + 0.7, 0, 3.2, z - 0.7, z + 0.7); K.box('timber', x - 0.78, x + 0.78, 3.2, 3.38, z - 0.78, z + 0.78); K.collide(x - 0.75, x + 0.75, z - 0.75, z + 0.75, 4); }

  // the long walls: shingles outside, plaster inside, round the window openings
  const holes = wall => GLASS.filter(g => g.n[0] === (wall === 'S' ? -1 : 1)).map(g => [g.c[2] - g.w / 2 - 0.1, g.c[2] + g.w / 2 + 0.1, SILL - 0.1, SILL + WH + 0.1]);
  for (const wall of ['S', 'N']) {
    const s = wall === 'S' ? -1 : 1, xo = s < 0 ? OX0 : OX1, xm = xo - s * 0.3, xi = s < 0 ? IX0 : IX1;
    for (const [z0, z1, y0, y1] of around(OZ0 + 0.3, OZ1 - 0.3, FL + 0.6, PLATE, holes(wall))) K.box(SHAKE, xo, xm, y0, y1, z0, z1);
    for (const [z0, z1, y0, y1] of around(IZ0, IZ1, FL, PLATE, holes(wall))) K.box('plaster', xm, xi, y0, y1, z0, z1);
    K.collide(Math.min(xo, xi), Math.max(xo, xi), OZ0, OZ1, 12);
    // sills inside and out, a dark timber band at the top of the plaster
    for (const [z0, z1] of holes(wall)) {
      K.box('timber', xi - s * 0.02, xi + s * 0.18, SILL - 0.16, SILL - 0.02, z0 - 0.15, z1 + 0.15);
      K.box(TRIM, xo - s * 0.05, xo + s * 0.32, SILL - 0.25, SILL - 0.05, z0 - 0.2, z1 + 0.2);
      K.box(TRIM, xo - s * 0.06, xo + s * 0.02, SILL + WH + 0.07, SILL + WH + 0.45, z0 - 0.3, z1 + 0.3);
    }
    K.box('timber', xi - s * 0.02, xi + s * 0.14, PLATE - 0.55, PLATE - 0.02, IZ0, IZ1);
    K.box('timber', xo - s * 0.08, xo + s * 0.02, FL + 0.6, FL + 0.82, OZ0 - 0.1, OZ1 + 0.1);          // the belt over the brick
  }
  // the end walls: gables, cut as outlines with their openings
  endWall(K, 'E'); endWall(K, 'W');
  // the windows' frames: each opening is cut 0.1 ft bigger than its glass all round; a frame of dark
  // timber fills that and laps 0.1 over the glass's edge, its outside running 0.02 into the wall so no
  // slit shows anywhere. It stands from 0.04 in from the outer face to 0.28 (the glass at 0.15): a
  // shallow reveal outside, a deep one in.
  for (const g of GLASS) {
    if (g.round || g.gable) continue;
    const s = g.n[0], xo = s < 0 ? OX0 : OX1, zc = g.c[2], a = z => s * z;      // a: along the wall, so the frame is never mirrored
    const box = (z0, z1, y0, y1) => [[a(z0), y0], [a(z1), y0], [a(z1), y1], [a(z0), y1]];
    frameRing(K, box(zc - g.w / 2 - 0.12, zc + g.w / 2 + 0.12, SILL - 0.12, SILL + WH + 0.12), box(zc - g.w / 2 + 0.1, zc + g.w / 2 - 0.1, SILL + 0.1, SILL + WH - 0.1),
      new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, s), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-s, 0, 0)).setPosition(xo - s * 0.04, 0, 0));
  }
  {
    const ring = (r, n = 64) => Array.from({ length: n }, (_, i) => [Math.cos(i / n * Math.PI * 2) * r, ROUND.y + Math.sin(i / n * Math.PI * 2) * r]);
    frameRing(K, ring(ROUND.r + 0.14), ring(ROUND.r - 0.1), new THREE.Matrix4().makeBasis(new THREE.Vector3(-1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, -1)).setPosition(CX, 0, OZ1 - 0.04));
    const head = (w, h, y0) => w7Outline(w, h).map(([u, v]) => [u - w / 2, y0 + h - v]);
    frameRing(K, head(5.24, 10.24, FL + 1.88), head(4.8, 9.8, FL + 2.1), new THREE.Matrix4().setPosition(CX, 0, OZ0 + 0.04));
  }
  K.collide(OX0, DOOR.x0, OZ1 - TH, OZ1, 12); K.collide(DOOR.x1, OX1, OZ1 - TH, OZ1, 12); K.collide(OX0, OX1, OZ0, OZ0 + TH, 12);
  K.collide(DOOR.x0, DOOR.x1, OZ1 - TH, OZ1, 30, FL + DOOR.h);

  // the doorway: casings, the lintel (lettered in chapelLife), the door standing open
  // (the casings stand a little proud into the opening, so no face of theirs lies in the wall's)
  K.box(TRIM, DOOR.x0 - 0.22, DOOR.x0 + 0.03, FL + 0.02, FL + DOOR.h - 0.03, OZ1 - TH - 0.04, OZ1 + 0.08);
  K.box(TRIM, DOOR.x1 - 0.03, DOOR.x1 + 0.22, FL + 0.02, FL + DOOR.h - 0.03, OZ1 - TH - 0.04, OZ1 + 0.08);
  K.box(TRIM, DOOR.x0 - 0.22, DOOR.x1 + 0.22, FL + DOOR.h - 0.03, FL + DOOR.h + 0.2, OZ1 - TH - 0.04, OZ1 + 0.06);
  K.box('timber', DOOR.x0 - 0.9, DOOR.x1 + 0.9, FL + DOOR.h, FL + DOOR.h + 0.85, OZ1, OZ1 + 0.4);            // the lintel
  K.box('timber', DOOR.x0 - 1.0, DOOR.x1 + 1.0, FL + DOOR.h + 0.85, FL + DOOR.h + 1.0, OZ1, OZ1 + 0.5);            // its drip cap
  {
    // the leaf, hinged on the south jamb, swung out and back toward the wall (clear of the lintel seen from the path)
    const a = Math.PI - 1.25, ax = Math.cos(a), az = Math.sin(a), W = DOOR.x1 - DOOR.x0 - 0.05, hx = DOOR.x0 - 0.08, hz = OZ1 + 0.14, rot = [0, -a, 0];
    const at = (along, half, y0, y1, thick, mat, o = {}) => { const cx = hx + ax * along, cz = hz + az * along; K.box(mat, cx - half, cx + half, y0, y1, cz - thick, cz + thick, { rot, ...o }); };
    at(W / 2, W / 2, FL + 0.03, FL + DOOR.h - 0.05, 0.09, DOORPAINT);
    for (const y of [FL + 0.8, FL + 3.4, FL + 6.0]) at(W / 2, W / 2 - 0.18, y, y + 0.42, 0.15, DOORPAINT);
    for (const y of [FL + 1.0, FL + 6.15]) at(1.05, 1.0, y, y + 0.13, 0.17, PAINT.iron);
    const ex = hx + ax * W, ez = hz + az * W;
    K.collide(Math.min(hx, ex) - 0.2, Math.max(hx, ex) + 0.2, Math.min(hz, ez) - 0.2, Math.max(hz, ez) + 0.2, FL + DOOR.h, 0);
  }

  // a lantern on a bracket beside the door, north of it: black iron and amber glass that glows after
  // dark (lighting.js turns 'e#' glows down by day and up at night; it is not a light)
  {
    const lx = DOOR.x1 + 0.95, ly = FL + 5.9, lz = OZ1 + 0.62;
    K.box(PAINT.iron, lx - 0.1, lx + 0.1, ly + 0.55, ly + 0.95, OZ1, OZ1 + 0.05);                     // the backplate
    K.box(PAINT.iron, lx - 0.025, lx + 0.025, ly + 0.72, ly + 0.77, OZ1 + 0.05, lz);                  // the arm
    K.box(PAINT.iron, lx - 0.2, lx + 0.2, ly + 0.5, ly + 0.58, lz - 0.2, lz + 0.2);                   // the cap
    K.box(PAINT.iron, lx - 0.06, lx + 0.06, ly + 0.58, ly + 0.74, lz - 0.06, lz + 0.06);              // its chimney, up to the arm
    K.box(PAINT.iron, lx - 0.17, lx + 0.17, ly - 0.06, ly, lz - 0.17, lz + 0.17);                     // the base
    for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) K.box(PAINT.iron, lx + dx * 0.15 - 0.02, lx + dx * 0.15 + 0.02, ly, ly + 0.5, lz + dz * 0.15 - 0.02, lz + dz * 0.15 + 0.02);
    K.box('e#ffd9a0/0.7', lx - 0.13, lx + 0.13, ly + 0.01, ly + 0.49, lz - 0.13, lz + 0.13);          // the glass
  }

  // the roof's timbers (the roof itself, a material of its own, is made in chapelLife):
  // rafters inside under the plaster, their tails out under the eaves, collar ties, bargeboards
  for (const s of [-1, 1]) {
    for (let z = IZ0 + 1; z <= IZ1 - 0.9; z += 2) {
      K.beam('timber', [CX + s * 6.0, yC(6.0) - 0.24, z], [CX + s * 0.25, yC(0.25) - 0.24, z], 0.42, 0.24);
    }
    for (let z = OZ0 - 1.4; z <= OZ1 + 1.5; z += 2) {
      K.beam('timber', [CX + s * 6.5, yO(6.5) - 0.62, z], [CX + s * 8.6, yO(8.6) - 0.62, z], 0.34, 0.26);
    }
    for (const z of [OZ0 - 1.75, OZ1 + 1.75]) K.beam('timber', [CX + s * 8.75, yO(8.75) - 0.35, z], [CX, yO(0) - 0.35, z], 0.9, s < 0 ? 0.26 : 0.2);     // (not both one thickness: they cross at the apex)
  }
  for (const s of [-1, 1]) K.B.mesh('plaster', slab(0, 6.05, yC, 0.12, IZ0, IZ1, s, true));
  for (const z of [IZ0 + 4.5, IZ1 - 4.5]) { const d = 6 - (12.55 - PLATE) / PITCH; K.box('timber', CX - d - 0.3, CX + d + 0.3, 12.3, 12.8, z - 0.2, z + 0.2); }
  // outriggers under the gable overhangs
  for (const z0 of [OZ0, OZ1]) for (const s of [-1, 1]) { const d = 4.2, y = yO(d) - 0.62, dz = z0 < CZ ? -1 : 1; K.box('timber', CX + s * d - 0.15, CX + s * d + 0.15, y - 0.4, y, Math.min(z0, z0 + dz * 1.75), Math.max(z0, z0 + dz * 1.75)); }

  // window seats along both long walls
  for (const s of [-1, 1]) {
    const xi = s < 0 ? IX0 : IX1, xf = xi - s * 1.55, z0 = IZ0 + 4.4, z1 = IZ1 - 0.8;
    K.box('timber', Math.min(xi, xf), Math.max(xi, xf), FL + 1.38, FL + 1.55, z0, z1, { grain: 'long' });
    K.box('timber', Math.min(xf, xf + s * 0.15), Math.max(xf, xf + s * 0.15), FL, FL + 1.38, z0 + 0.05, z1 - 0.05);
    for (const z of [z0, z1 - 0.12]) K.box('timber', Math.min(xi, xf), Math.max(xi, xf), FL, FL + 1.38, z, z + 0.12);
    K.collide(Math.min(xi, xf), Math.max(xi, xf), z0, z1, FL + 1.5, 0);
    for (const z of [-13.5, -19]) K.seat(xi - s * 0.85, FL + 1.55, z, s < 0 ? -Math.PI / 2 : Math.PI / 2, 'sit for a while');
  }
  // the table: a slab of pale stone on two brick piers, before the great window
  {
    const { x0, x1, z0, z1, y } = TABLE;
    K.box('c#d5cebf/0.85', x0, x1, y - 0.45, y, z0, z1);
    for (const px of [x0 + 0.9, x1 - 0.9]) K.box('clinker', px - 0.45, px + 0.45, FL, y - 0.45, z0 + 0.2, z1 - 0.2);
    K.collide(x0, x1, z0, z1, y + 0.4, 0);
    // three candles and a bowl of water
    const candle = (x, z, tall, r) => {
      K.lathe('c#ddd7cb/0.3', x, y, z, [[0.01, 0], [r + 0.08, 0], [r + 0.1, 0.03], [r + 0.08, 0.035], [0.01, 0.02]], 16);
      K.lathe('c#efe6d2/0.6', x, y, z, [[0.01, 0.02], [r, 0.02], [r, tall], [r - 0.02, tall + 0.01], [r * 0.5, tall - 0.02], [0.01, tall - 0.025]], 16);
      K.cyl('c#1b1612/0.9', x, y + tall - 0.03, y + tall + 0.03, z, 0.006, 0.004, 4);
      const c = { x, y: y + tall, z }; K.candlesAt.push(c); items.candles?.push(c); return c;
    };
    K.candlesAt = [];
    candle(CX - 1.7, z0 + 0.75, 0.75, 0.15); candle(CX - 1.25, z0 + 1.05, 0.48, 0.13); candle(CX + 1.6, z0 + 0.8, 0.6, 0.14);
    K.lathe('c#5e6a6a/0.4', CX + 0.1, y, z0 + 0.82, [[0.01, 0], [0.32, 0], [0.5, 0.06], [0.68, 0.2], [0.72, 0.27], [0.66, 0.27], [0.5, 0.12], [0.01, 0.08]], 24);
    K.chapelWater = { x: CX + 0.1, y: y + 0.22, z: z0 + 0.82, r: 0.64 };
  }

  // trees round it (none to the south: that is the edge, and the sun), a little planting
  K.trees.push({ kind: 'birch', x: -93, z: 3, seed: 501, height: 31 }, { kind: 'birch', x: -88.5, z: -3, seed: 502, height: 27 }, { kind: 'birch', x: -92, z: 9, seed: 507, height: 29 });
  K.trees.push({ kind: 'maple', x: -85, z: -33, seed: 503, height: 38 }, { kind: 'cherry', x: -92.5, z: -27, seed: 504, height: 19 }, { kind: 'oak', x: -78, z: -4, seed: 505, height: 42 });
  F.drift('hydrangea', OX1 + 1.8, OZ1 + 2.2, 1.2, 1.2, 2, 1.1); F.drift('fern', OX0 - 1.0, OZ1 + 1.6, 1.0, 1.2, 3, 1);
  F.row('lavender', OX1 + 1.4, OZ1 - 2.5, OX1 + 1.4, OZ0 + 2, 2.4, 1); F.drift('fern', OX1 + 1.6, OZ0 - 1.2, 1.4, 1.2, 4, 1);
  F.drift('rose', OX0 - 1.2, OZ0 - 1.2, 1.2, 1.2, 2, 1.1);
  // the way in: stepping stones on from the pond's, through long grass and flowers
  // (a curve swinging wide of the pond, clear of the bank's ferns and grass, the gnome and the trees:
  // every stone is at least 1.75 times the water's radius out, pond_shape.js sAt() >= 1.75)
  const way = [[-61.5, -14], [-65.8, -15.1], [-70.2, -15.9], [-74.6, -16.2], [-79.2, -15.8], [-83.5, -14.7], [-87.6, -13], [-91.6, -11.1], [-95.6, -9.1], [-99.7, -7.4], [-104, -6.6]];
  for (let i = 1; i < way.length; i++) { const [x, z] = way[i]; G.blob('flagstone', x, z, 1.35, 1.0, { y: 0.09, wobble: 0.2, seed: Math.round(x * 13 + z) }); }
  const near = (x, z) => way.some(([wx, wz]) => Math.hypot(x - wx, z - wz) < 2.6);
  for (let x = -112; x < -76; x += 2.3) for (let z = -32; z < 10; z += 2.3) {
    const qx = x + (K.r() - 0.5) * 2, qz = z + (K.r() - 0.5) * 2, k = K.r();
    if (near(qx, qz) || (qx > OX0 - 2 && qx < OX1 + 2.2 && qz > OZ0 - 2 && qz < OZ1 + 3) || Math.hypot(qx + 68, qz - 4) < 24) continue;
    const edge = Math.min(Math.hypot(qx - CX, qz - CZ) / 22, 1);
    if (K.r() > 0.25 + 0.55 * (1 - edge) + (qx < -100 ? 0.3 : 0)) continue;
    F.add(k < 0.5 ? 'grass' : k < 0.88 ? 'wildflowers' : 'spires', qx, qz, 0.8 + K.r() * 0.4);
  }
  K.lamp(CX, PLATE + 1.5, CZ, 0.5, 'fill');                                // daylight bounced round the room, as the house's rooms have
  K.chapel = { glass: GLASS };
}

// A frame: the ring between two outlines (in a plane: a along the wall, y up), 0.24 ft deep, set by m
function frameRing(K, outer, inner, m) {
  const sh = new THREE.Shape(outer.map(([a, y]) => new THREE.Vector2(a, y)));
  sh.holes.push(new THREE.Path(inner.map(([a, y]) => new THREE.Vector2(a, y))));
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.24, bevelEnabled: false, curveSegments: 4 });
  g.applyMatrix4(m); K.B.mesh(TRIM, g);
}

// The rectangles of a wall [a0..a1] x [y0..y1] left round its holes [[ha0, ha1, hy0, hy1], ...]
function around(a0, a1, y0, y1, holes) {
  const out = []; let at = a0;
  for (const [h0, h1, hy0, hy1] of [...holes].sort((p, q) => p[0] - q[0])) {
    if (h0 > at) out.push([at, h0, y0, y1]);
    out.push([h0, h1, y0, hy0], [h0, h1, hy1, y1]); at = h1;
  }
  if (a1 > at) out.push([at, a1, y0, y1]);
  return out.filter(([a, b, c, d]) => b - a > 0.01 && d - c > 0.01);
}

// A gable wall: an outline (the door notched into it on the east) extruded through its thickness,
// shingles outside and plaster in, with the round window or the great window cut out of both
function endWall(K, which) {
  const east = which === 'E', zo = east ? OZ1 : OZ0, s = east ? 1 : -1;
  // Each gable is made as two halves meeting on the middle line, the window's opening cut half from
  // each: a shape with a hole in it is triangulated with a bridge to its edge, and that seam let light
  // through as a hairline from the apex to the door.
  const halves = (half, base, top) => {
    const left = [[-half, base]];
    if (east) {
      const R = ROUND.r + 0.12;
      left.push([DOOR.x0 - CX, base], [DOOR.x0 - CX, FL + DOOR.h], [0, FL + DOOR.h]);
      for (let k = 0; k <= 32; k++) { const a = -Math.PI / 2 - Math.PI * k / 32; left.push([Math.cos(a) * R, ROUND.y + Math.sin(a) * R]); }
    } else {
      const o = w7Outline(5.2, 10.2).map(([u, v]) => [u - 2.6, FL + 1.9 + (10.2 - v)]);      // apex, right shoulder, right foot, left foot, left shoulder
      left.push([0, base], [0, o[3][1]], o[3], o[4], o[0]);
    }
    left.push([0, top(0)], [-half, top(half)]);
    return [left, left.map(([x, y]) => [-x, y]).reverse()].map(pts => new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))));
  };
  const layer = (mat, half, base, top, z0, depth) => {
    for (const sh of halves(half, base, top)) { const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false }); g.translate(CX, 0, z0); K.B.mesh(mat, g); }
  };
  // shingles from the outer face 0.3 in, plaster from there to the inner face
  layer(SHAKE, 6.6, FL + 0.6, d => yO(d) - 0.3, east ? zo - 0.3 : zo, 0.3);
  layer('plaster', 6.0, FL, d => yC(d), east ? zo - TH : zo + 0.3, 0.3);
  // the belt over the brick, and the sill of the great window
  // (on the door's gable it stops at the casings either side: it used to run straight across the doorway)
  for (const [bx0, bx1] of east ? [[OX0 - 0.1, DOOR.x0 - 0.22], [DOOR.x1 + 0.22, OX1 + 0.1]] : [[OX0 - 0.1, OX1 + 0.1]]) K.box('timber', bx0, bx1, FL + 0.6, FL + 0.82, Math.min(zo, zo + s * 0.08), Math.max(zo, zo + s * 0.08));
  if (!east) { K.box('timber', CX - 2.8, CX + 2.8, FL + 1.75, FL + 1.92, IZ0 - 0.02, IZ0 + 0.25); K.box('timber', CX - 2.9, CX + 2.9, FL + 1.72, FL + 1.93, OZ0 - 0.3, OZ0 + 0.05); }
}

// ---- built once materials exist: the glass, its light, the roof, the lettering --------------------------
export function chapelLife(ctx, K) {
  const { THREE: T3 = THREE, scene, animated, day, materials, camera } = ctx;
  const Q = new URLSearchParams(location.search);
  const sun = new T3.Vector3(), U = {
    uSunDir: { value: sun }, uSunCol: { value: new T3.Color() }, uSky: { value: new T3.Color() }, uOut: { value: new T3.Color() }, uGlow: { value: 0 }, uIn: { value: 0 },
  };
  // ---- the glass
  const glassMat = (tex, n, cut = false) => {
    const m = new T3.ShaderMaterial({
      uniforms: { map: { value: tex }, uN: { value: new T3.Vector3(...n) }, uCut: { value: cut ? 1 : 0 }, ...U },
      vertexShader: `varying vec2 vUv; varying vec3 vW;
void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform sampler2D map; uniform vec3 uN, uSunDir, uSunCol, uSky, uOut; uniform float uGlow, uIn, uCut; varying vec2 vUv; varying vec3 vW;
void main() {
  vec4 tx = texture2D(map, vUv);
  if (uCut > 0.5 && tx.a < 0.5) discard;  // cut away: only the strange loop's clear roundel, which has real glass behind it
  vec3 t = tx.rgb;
  vec3 V = normalize(cameraPosition - vW);
  float side = dot(V, uN), facing = max(dot(uSunDir, uN), 0.0);
  // from inside: the sky behind it, and the sun when the sun is on this side, most of all when you look toward it
  float toward = pow(max(dot(-V, uSunDir), 0.0), 8.0);
  vec3 lit = t * (uSky + uSunCol * facing * (0.35 + 0.9 * toward)) + t * uIn;
  // from outside: by day the picture dull but there (the daylight on it, about a fifth of what it is
  // from inside), the sky's sheen in it, more at a slant, and a glint where the sun is reflected;
  // after dark, the candles' glow from within
  float fr = pow(1.0 - abs(side), 4.0);
  float glint = pow(max(dot(reflect(-uSunDir, uN), V), 0.0), 90.0);
  vec3 dark = t * (uOut + uGlow) + uSky * (0.03 + 0.18 * fr) + uSunCol * glint * 0.5;
  gl_FragColor = vec4(side < 0.0 ? lit : dark, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`,
      side: T3.DoubleSide,
    });
    return m;
  };
  const place = (geo, w) => {           // geometry drawn facing +z with u to the right, set into its wall seen from inside
    const u = new T3.Vector3(...w.u), up = new T3.Vector3(0, 1, 0), inn = new T3.Vector3(...w.n).negate();
    geo.applyMatrix4(new T3.Matrix4().makeBasis(u, up, inn).setPosition(...w.c)); return geo;
  };
  const panes = {}, canvases = {}, jobs = [];
  for (const w of GLASS) {
    if (w.id === 'loop') {                // the clear roundel at the loop's heart: the house's window glass, just outside the stained glass
      const e = LOOP_EYE, d = new T3.CircleGeometry(e.r * w.w, 40); d.translate((e.u - 0.5) * w.w, (0.5 - e.v) * w.h, -0.03);
      const clear = materials.glass.clone(); clear.emissiveIntensity = 0; clear.emissive = new T3.Color(0);
      const eye = new T3.Mesh(place(d, w), clear); eye.name = 'chapel loop roundel'; scene.add(eye);
    }
    const [cw, ch] = w.id === 'life' ? [512, 1024] : WINDOWS[w.id], c = document.createElement('canvas'); c.width = cw; c.height = ch;
    const g = c.getContext('2d'); g.fillStyle = '#2a2622'; g.fillRect(0, 0, cw, ch);
    const tex = new T3.CanvasTexture(c); tex.colorSpace = T3.SRGBColorSpace; tex.anisotropy = 4;
    let geo;
    if (w.round) { geo = new T3.CircleGeometry(w.w / 2, 48); }
    else if (w.gable) { const o = w7Outline(w.w, w.h).map(([x, y]) => new T3.Vector2(x - w.w / 2, w.h / 2 - y)); geo = new T3.ShapeGeometry(new T3.Shape(o)); const p = geo.attributes.position, uv = geo.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / w.w + 0.5, p.getY(i) / w.h + 0.5); }
    else geo = new T3.PlaneGeometry(w.w, w.h);
    const mesh = new T3.Mesh(place(geo, w), glassMat(tex, w.n, w.id === 'loop')); mesh.name = 'chapel glass ' + w.id; mesh.castShadow = true; scene.add(mesh);
    panes[w.id] = { mesh, tex, w }; canvases[w.id] = c;
    jobs.push({ id: w.id, g, c, tex });
  }
  // ---- the roof: shingles lit as outdoors even where they pass over the room's box (lighting.js
  // treats everything inside the box as a room; this patch takes that out, as outdoorLit does for windows)
  {
    const m = materials.roof.clone();
    m.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('#define HOUSE_LIGHT', ''); };
    m.customProgramCacheKey = () => 'chapel-roof';
    const parts = [slab(-0.15, 8.6, yO, 0.35, OZ0 - 1.75, OZ1 + 1.75, -1), slab(-0.15, 8.6, yO, 0.35, OZ0 - 1.75, OZ1 + 1.75, 1)];
    { const g = feetBox(0.7, 0.4, OZ1 - OZ0 + 3.6); g.translate(CX, yO(0) + 0.1, CZ); parts.push(g); }     // the ridge
    const roof = new T3.Mesh(mergeAll(parts), m); roof.castShadow = roof.receiveShadow = true; roof.name = 'chapel roof'; scene.add(roof);
  }
  // ---- the lettering: MORE IS DIFFERENT cut in the lintel, Piaget's sentence in the table's edge
  {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const g = c.getContext('2d');
    const tex = new T3.CanvasTexture(c); tex.colorSpace = T3.SRGBColorSpace; tex.anisotropy = 4;
    const draw = () => {
      const rnd = rng(19);
      // the lintel: dark-stained fir, letters cut and filled with old cream paint
      g.fillStyle = '#3b2a1f'; g.fillRect(0, 0, 1024, 128);
      for (let i = 0; i < 40; i++) { g.strokeStyle = `rgba(${i % 2 ? '20,12,8' : '90,66,48'},.25)`; g.lineWidth = 1 + (i % 3); g.beginPath(); const y = rnd() * 128; g.moveTo(0, y); g.bezierCurveTo(300, y + 4, 700, y - 4, 1024, y + 2); g.stroke(); }
      carve(g, 'MORE IS DIFFERENT', 512, 88, 62, { track: 0.32, ink: '#f1e6c8', shadow: 'rgba(0,0,0,.6)', light: 'rgba(255,240,210,.12)' });
      // the stone: pale limestone, the letters cut in and darkened
      g.fillStyle = '#cfc7b8'; g.fillRect(0, 128, 1024, 128);
      for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(${rnd() < 0.5 ? '255,250,240' : '90,80,70'},${0.05 + rnd() * 0.06})`; g.fillRect(rnd() * 1024, 128 + rnd() * 128, 2 + rnd() * 4, 1 + rnd() * 2); }
      carve(g, 'Intelligence organises the world by organising itself.', 512, 128 + 62, 38, { italic: true, track: 0.03, ink: '#4a443c', shadow: 'rgba(40,30,20,.55)', light: 'rgba(255,255,250,.5)' });
      carve(g, 'JEAN PIAGET · 1937', 512, 128 + 104, 20, { track: 0.28, ink: '#5a5248', shadow: 'rgba(40,30,20,.45)', light: 'rgba(255,255,250,.45)' });
      tex.needsUpdate = true;
    };
    draw(); document.fonts?.load?.(`40px ${FONT}`).then(() => { draw(); }).catch(() => {});
    document.fonts?.load?.(`italic 40px ${FONT}`).then(() => { draw(); }).catch(() => {});
    const m = new T3.MeshStandardMaterial({ map: tex, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });     // laid on its board, never in it
    const quad = (x0, x1, y0, y1, z, v0, v1) => { const g2 = new T3.PlaneGeometry(x1 - x0, y1 - y0); const uv = g2.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setY(i, v0 + uv.getY(i) * (v1 - v0)); g2.translate((x0 + x1) / 2, (y0 + y1) / 2, z); return g2; };
    const { x0, x1, z1, y } = TABLE;
    const mesh = new T3.Mesh(mergeAll([quad(DOOR.x0 - 0.9, DOOR.x1 + 0.9, FL + DOOR.h, FL + DOOR.h + 0.85, OZ1 + 0.42, 0.5, 1), quad(x0, x1, y - 0.45, y, z1 + 0.02, 0, 0.5)]), m);
    mesh.receiveShadow = true; mesh.name = 'chapel lettering'; scene.add(mesh);
  }
  // ---- water in the bowl
  if (K.chapelWater) { const w = K.chapelWater, d = new T3.Mesh(new T3.CircleGeometry(w.r, 28).rotateX(-Math.PI / 2), materials.water); d.position.set(w.x, w.y, w.z); d.name = 'chapel water'; scene.add(d); }

  // ---- coloured light on the floor and walls
  // One mesh lines the room (floor, walls, seat and table tops). For each of its points its shader
  // looks back along the sun's direction: if that line passes through a window, the window's colours
  // (a small blurred copy, from an atlas) are added there, as light on whatever colour the surface is.
  const LIT = GLASS, NW = LIT.length, SLOT = [32, 64];
  const atlas = document.createElement('canvas'); atlas.width = SLOT[0] * NW; atlas.height = SLOT[1];
  { const a = atlas.getContext('2d'); a.fillStyle = '#000'; a.fillRect(0, 0, atlas.width, atlas.height); }
  const atlasTex = new T3.CanvasTexture(atlas); atlasTex.colorSpace = T3.SRGBColorSpace;
  const uW = { c: [], u: [], n: [], s: [], r: [] };
  LIT.forEach((w, i) => {
    uW.c.push(new T3.Vector3(...w.c)); uW.u.push(new T3.Vector3(...w.u)); uW.n.push(new T3.Vector3(...w.n)); uW.s.push(new T3.Vector2(w.w / 2, w.h / 2));
    const sh = w.round ? SLOT[0] / SLOT[1] : 1;                              // the round one fills the top of its slot
    uW.r.push(new T3.Vector4(i * SLOT[0] / atlas.width, 1 - sh, SLOT[0] / atlas.width, sh));
  });
  const uPool = { value: 0 };
  const liner = (() => {
    const quads = [], e = 0.012;
    const rectXZ = (x0, x1, z0, z1, y) => quads.push([[x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0]]);
    const rectZY = (x, z0, z1, y0, y1, s) => quads.push(s > 0 ? [[x, y0, z0], [x, y0, z1], [x, y1, z1], [x, y1, z0]] : [[x, y0, z1], [x, y0, z0], [x, y1, z0], [x, y1, z1]]);
    const rectXY = (z, x0, x1, y0, y1, s) => quads.push(s > 0 ? [[x1, y0, z], [x0, y0, z], [x0, y1, z], [x1, y1, z]] : [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]]);
    rectXZ(IX0, IX1, IZ0, IZ1, FL + e);
    for (const [wall, x, s] of [['S', IX0 + e, 1], ['N', IX1 - e, -1]]) for (const [z0, z1, y0, y1] of around(IZ0, IZ1, FL, PLATE, GLASS.filter(g => g.n[0] === (wall === 'S' ? -1 : 1)).map(g => [g.c[2] - g.w / 2 - 0.1, g.c[2] + g.w / 2 + 0.1, SILL - 0.1, SILL + WH + 0.1]))) rectZY(x, z0, z1, y0, y1, s);
    for (const [x0, x1, y0, y1] of around(IX0, IX1, FL, PLATE, [[DOOR.x0, DOOR.x1, FL - 1, FL + DOOR.h], [CX - Math.sqrt(Math.max(0, (ROUND.r + 0.12) ** 2 - (ROUND.y - PLATE) ** 2)) - 0.05, CX + Math.sqrt(Math.max(0, (ROUND.r + 0.12) ** 2 - (ROUND.y - PLATE) ** 2)) + 0.05, ROUND.y - ROUND.r - 0.15, PLATE + 1]])) rectXY(IZ1 - e, x0, x1, y0, y1, -1);
    for (const [x0, x1, y0, y1] of around(IX0, IX1, FL, PLATE, [[CX - 2.6, CX + 2.6, FL + 1.9, PLATE + 1]])) rectXY(IZ0 + e, x0, x1, y0, y1, 1);
    for (const s of [-1, 1]) { const xi = s < 0 ? IX0 : IX1, xf = xi - s * 1.55; rectXZ(Math.min(xi, xf), Math.max(xi, xf), IZ0 + 4.4, IZ1 - 0.8, FL + 1.55 + e); }
    rectXZ(TABLE.x0, TABLE.x1, TABLE.z0, TABLE.z1, TABLE.y + e);
    const pos = [], idx = [];
    for (const q of quads) { const n = pos.length / 3; for (const p of q) pos.push(...p); idx.push(n, n + 1, n + 2, n, n + 2, n + 3); }
    const geo = new T3.BufferGeometry(); geo.setAttribute('position', new T3.Float32BufferAttribute(pos, 3)); geo.setIndex(idx);
    const mat = new T3.ShaderMaterial({
      uniforms: { uAtlas: { value: atlasTex }, uSun: { value: sun }, uK: uPool, uWc: { value: uW.c }, uWu: { value: uW.u }, uWn: { value: uW.n }, uWs: { value: uW.s }, uWr: { value: uW.r } },
      defines: { NW },
      vertexShader: 'varying vec3 vW; void main() { vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `uniform sampler2D uAtlas; uniform vec3 uSun; uniform float uK; uniform vec3 uWc[NW]; uniform vec3 uWu[NW]; uniform vec3 uWn[NW]; uniform vec2 uWs[NW]; uniform vec4 uWr[NW]; varying vec3 vW;
void main() {
  vec3 acc = vec3(0.0);
  for (int i = 0; i < NW; i++) {
    float sn = dot(uSun, uWn[i]);
    if (sn < 0.03) continue;
    if (dot(vW - uWc[i], uWn[i]) > -0.8) continue;      // a window lights nothing on its own wall (a grazing sun drew a hairline there)
    float t = dot(uWc[i] - vW, uWn[i]) / sn;
    if (t < 0.4) continue;
    vec3 h = vW + uSun * t - uWc[i];
    vec2 q = vec2(dot(h, uWu[i]) / uWs[i].x, h.y / uWs[i].y) * 0.5 + 0.5;
    if (q.x < 0.0 || q.y < 0.0 || q.x > 1.0 || q.y > 1.0) continue;
    vec3 c = texture2D(uAtlas, uWr[i].xy + q * uWr[i].zw).rgb;
    acc += c * c * smoothstep(0.03, 0.25, sn);
  }
  gl_FragColor = vec4(acc * uK, 1.0);
}`,
      transparent: true, depthWrite: false, blending: T3.CustomBlending, blendSrc: T3.DstColorFactor, blendDst: T3.OneFactor,
      polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, toneMapped: false, side: T3.DoubleSide,
    });
    const m = new T3.Mesh(geo, mat); m.name = 'chapel window light'; m.renderOrder = 1; m.visible = false; scene.add(m); return m;
  })();

  // ---- the candles are the house's own (life.js lights them and gives each a lamp)
  const candles = K.candlesAt ?? [];

  // ---- the hour
  let lastHour = null, readyAt = -1;
  const skyCol = new T3.Color(), warm = new T3.Color(1.0, 0.62, 0.3);
  const setHour = () => {
    const L = day.light ?? 1, sd = day.sunDir ?? new T3.Vector3(0, 1, 0), el = sd.y;
    sun.copy(sd).normalize();
    const up = THREE.MathUtils.smoothstep(el, -0.02, 0.12);
    // the sky behind the glass, as seen from inside: bright and cool by day, a deep blue glow at dusk, almost nothing at night
    skyCol.setRGB(0.62, 0.7, 0.82).multiplyScalar(0.03 + 1.25 * L * L);
    U.uSky.value.copy(skyCol);
    U.uSunCol.value.setRGB(1.0, 0.93, 0.8).multiplyScalar(1.8 * up * (0.5 + 0.5 * THREE.MathUtils.smoothstep(el, 0.0, 0.3)));
    U.uOut.value.copy(skyCol).multiplyScalar(0.2).add(new T3.Color(0.012, 0.012, 0.014));      // by day a fifth of the inside, at night almost nothing
    uPool.value = 4.5 * up * THREE.MathUtils.smoothstep(el, 0.0, 0.15);
    liner.visible = uPool.value > 0.01 && readyAt >= 0;
  };

  // ---- drawing the glass a little at a time, the first time anyone comes near
  const centre = new T3.Vector3(CX, 6, CZ);
  let job = null, started = false, life = null, lastStep = 0, seenAt = -1;
  const fonts = Promise.all([`20px ${FONT}`, `italic 20px ${FONT}`].map(f => document.fonts?.load?.(f) ?? Promise.resolve())).catch(() => {});
  const begin = () => { started = true; fonts.then(() => { job = run(); }); };
  function* run() {
    for (const j of jobs) {
      if (j.id === 'life') { life = makeLife(j.g, j.c.width, j.c.height); j.tex.needsUpdate = true; yield; continue; }
      const it = WINDOWS[j.id][2](j.g);
      while (!it.next().done) yield;
      j.tex.needsUpdate = true; yield;
    }
    // the atlas for the light on the floor
    const a = atlas.getContext('2d');
    LIT.forEach((w, i) => {
      const c = canvases[w.id], small = poolCopy(c, SLOT[0], w.round ? SLOT[0] : SLOT[1]);
      if (w.round) {      // the round one: only its disc, fading at its rim, and dimmer (its pale ring of words would otherwise print as a bright hoop)
        const sg = small.getContext('2d'), R = SLOT[0] / 2, fade = sg.createRadialGradient(R, R, R * 0.35, R, R, R * 0.92);
        fade.addColorStop(0, 'rgba(0,0,0,1)'); fade.addColorStop(1, 'rgba(0,0,0,0)');
        sg.globalCompositeOperation = 'destination-in'; sg.fillStyle = fade; sg.fillRect(0, 0, SLOT[0], SLOT[0]);
        a.globalAlpha = 0.55; a.drawImage(small, i * SLOT[0], 0); a.globalAlpha = 1;
      } else a.drawImage(small, i * SLOT[0], 0);
    });
    atlasTex.needsUpdate = true; readyAt = 1; lastHour = null;
  }
  if (Q.has('chapelnow')) { started = true; Promise.resolve(fonts).then(() => { const it = run(); while (!it.next().done); }); }
  // the Life window steps about once a second, only while it is being drawn on screen
  if (panes.life) panes.life.mesh.onBeforeRender = () => { seenAt = performance.now(); };

  animated.push((t) => {
    if (!started && camera.position.distanceToSquared(centre) < 170 * 170) begin();
    if (job) { const t0 = performance.now(); while (performance.now() - t0 < 6) { if (job.next().done) { job = null; break; } } }
    if (day.hour !== lastHour) { lastHour = day.hour; setHour(); }
    // the candles: the glass glows outward after dark when they are lit
    let lit = 0; for (const c of candles) if (c.lit) lit++;
    const night = day.night ?? 0;
    U.uGlow.value = (lit / Math.max(1, candles.length)) * (0.03 + 0.22 * THREE.MathUtils.smoothstep(night, 0.3, 0.9));
    U.uIn.value = (lit / Math.max(1, candles.length)) * 0.03 * night;
    if (life && performance.now() - seenAt < 400 && t - lastStep > 0.9) { lastStep = t; life.step(); panes.life.tex.needsUpdate = true; }
  });
  if (Q.has('lifesteps')) { const n = Number(Q.get('lifesteps')); const wait = () => { if (life) { for (let i = 0; i < n; i++) life.step(); panes.life.tex.needsUpdate = true; } else setTimeout(wait, 200); }; wait(); }
  weathervane(ctx);
}

// ---- the weathervane -------------------------------------------------------------------------------
// Copper gone to verdigris, rubbed bright here and there. A mast on the ridge over the door; four plain
// arms with a ball at each end and no letters (every direction the same); the vane, which turns: a
// loose cloud of starlings cut from sheet, joined by fine wire, drawing together along the shaft to one
// bird at the point; above it all a Möbius band. It swings into the garden's wind (cards.js), with a
// little lag and overshoot, and wanders when the gusts come.
function weathervane(ctx) {
  const { scene, animated, camera } = ctx;
  const top = yO(0) + 0.3, X = CX, Z = OZ1 + 0.1;                  // the ridge's top, over the east wall
  // verdigris, mottled: a small canvas of greens and blues with copper showing through
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'), rnd = rng(91);
  g.fillStyle = '#5f9c8c'; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 260; i++) { const k = rnd(); g.fillStyle = k < 0.45 ? `rgba(120,184,164,${0.3 + rnd() * 0.4})` : k < 0.8 ? `rgba(58,104,98,${0.3 + rnd() * 0.4})` : `rgba(150,92,52,${0.4 + rnd() * 0.4})`; g.beginPath(); g.arc(rnd() * 128, rnd() * 128, 1 + rnd() * 6, 0, Math.PI * 2); g.fill(); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  const verd = new THREE.MeshStandardMaterial({ map: tex, color: 0xffffff, metalness: 0.35, roughness: 0.62, side: THREE.DoubleSide });
  const bright = new THREE.MeshStandardMaterial({ color: 0xc8874e, metalness: 0.85, roughness: 0.32, side: THREE.DoubleSide });
  const cyl = (r, x0, y0, z0, x1, y1, z1, n = 8) => {      // a rod from one point to another
    const a = new THREE.Vector3(x0, y0, z0), b = new THREE.Vector3(x1, y1, z1), d = b.clone().sub(a), geo = new THREE.CylinderGeometry(r, r, d.length(), n, 1);
    geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize())); geo.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2); return geo;
  };
  const ball = (r, x, y, z) => new THREE.SphereGeometry(r, 12, 8).translate(x, y, z);
  // ---- what stands still: the foot on the ridge, the mast, the arms, the Möbius band
  const H = 3.5, armsY = 1.45, vaneY = 2.45;
  const still = [cyl(0.15, 0, 0, 0, 0, 0.12, 0, 12), cyl(0.09, 0, 0.12, 0, 0, 0.3, 0, 10), cyl(0.032, 0, 0.3, 0, 0, H, 0), ball(0.07, 0, armsY, 0), ball(0.05, 0, vaneY - 0.12, 0), ball(0.05, 0, vaneY + 0.12, 0)];
  const wear = [];
  for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2, ex = Math.cos(a) * 0.95, ez = Math.sin(a) * 0.95; still.push(cyl(0.017, 0, armsY, 0, ex, armsY, ez, 6)); wear.push(ball(0.075, ex, armsY, ez)); }
  {   // the Möbius band: one strip, one side (three half twists, so the twist shows), standing on the mast's tip
    const R = 0.27, w = 0.1, N = 120, pos = [], uv = [];
    const pt = (u, v) => { const r = R + v * Math.cos(1.5 * u); return [r * Math.cos(u), r * Math.sin(u), v * Math.sin(1.5 * u)]; };      // three half twists: still one side
    for (let i = 0; i < N; i++) {
      const u0 = i / N * Math.PI * 2, u1 = (i + 1) / N * Math.PI * 2, q = [pt(u0, -w), pt(u1, -w), pt(u1, w), pt(u0, w)];
      for (const k of [0, 1, 2, 0, 2, 3]) { pos.push(...q[k]); uv.push(k === 1 || k === 2 ? (i + 1) / N : i / N, k >= 2 ? 1 : 0); }
    }
    const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); m.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); m.computeVertexNormals();
    m.rotateY(Math.PI / 4); m.translate(0, H + R + 0.02, 0); still.push(m);
  }
  const foot = new THREE.Group(); foot.position.set(X, top, Z); foot.scale.setScalar(1.15); scene.add(foot);     // (drawn in feet a little under size)
  const add = (list, mat, name, parent) => { const mesh = new THREE.Mesh(mergeAll(list.map(q => q.attributes.normal ? q : (q.computeVertexNormals(), q))), mat); mesh.name = name; mesh.castShadow = true; parent.add(mesh); return mesh; };
  add(still, verd, 'chapel weathervane', foot); add(wear, bright, 'chapel weathervane wear', foot);
  // ---- the vane: the point is +x; birds cut from sheet, each a little thick, none in another's plane
  // a starling in flight as a silhouette: round head and short beak, long pointed wings curving back, a short square tail
  const BIRD = [[0.58, 0.0], [0.5, 0.025], [0.44, 0.06], [0.36, 0.075], [0.22, 0.08], [0.148, 0.198], [0.073, 0.323], [-0.005, 0.435], [-0.087, 0.524], [-0.172, 0.581], [-0.26, 0.6], [-0.211, 0.454], [-0.171, 0.32], [-0.146, 0.204], [-0.14, 0.1], [-0.22, 0.07], [-0.36, 0.06], [-0.46, 0.08], [-0.44, 0.0], [-0.46, -0.08], [-0.36, -0.06], [-0.22, -0.07], [-0.14, -0.1], [-0.146, -0.204], [-0.171, -0.32], [-0.211, -0.454], [-0.26, -0.6], [-0.172, -0.581], [-0.087, -0.524], [-0.005, -0.435], [0.073, -0.323], [0.148, -0.198], [0.22, -0.08], [0.36, -0.075], [0.44, -0.06], [0.5, -0.025]];
  const bird = (x, y, size, tilt, flip, z) => {
    const sh = new THREE.Shape(BIRD.map(([a, b]) => new THREE.Vector2(a, flip ? -b : b)));
    const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.05 / size, bevelEnabled: false });
    geo.translate(0, 0, -0.025 / size); geo.scale(size, size, size); geo.rotateZ(tilt); geo.translate(x, y, z); return geo;
  };
  const vr = rng(37), flock = [], wires = [], spots = [];
  for (let tries = 0; spots.length < 22 && tries < 3000; tries++) {
    const t = Math.sqrt(vr()), x = -0.45 - t * 1.6, half = 0.06 + 0.5 * Math.pow(t, 0.9) * (1 - 0.35 * t * t), y = (vr() * 2 - 1) * half, size = 0.27 + vr() * 0.08;
    if (spots.some(([px, py]) => Math.hypot(px - x, py - y) < 0.2)) continue;
    spots.push([x, y, size]);
  }
  spots.sort((a, b) => b[0] - a[0]);
  spots.forEach(([x, y, size], i) => {
    flock.push(bird(x, y, size, (vr() - 0.5) * 0.6 + y * 0.4, false, ((i % 7) - 3) * 0.014));     // each a little off the others' planes
    // each wired to its neighbour nearer the point (or the shaft), fine, so the birds carry the outline
    const to = spots.slice(0, i).reduce((b, q) => (Math.hypot(q[0] - x, q[1] - y) < Math.hypot(b[0] - x, b[1] - y) ? q : b), [Math.min(-0.3, x + 0.3), 0]);
    wires.push(cyl(0.005, x, y, 0, to[0], to[1], 0, 4));
  });
  // the shaft, the bird at the point, a collar where it turns
  wires.push(cyl(0.012, -0.9, 0, 0, 0.6, 0, 0, 6), cyl(0.04, 0, -0.1, 0, 0, 0.1, 0, 10));
  const head = [bird(0.95, 0, 0.66, 0, false, 0).scale(1, 1, 1.5)];      // (twice the size, and a thicker sheet)
  const vane = new THREE.Group(); vane.position.set(0, vaneY, 0); foot.add(vane);
  add([...flock, ...wires], verd, 'chapel weathervane vane', vane); add(head, bright, 'chapel weathervane bird', vane);
  // ---- the wind: where it comes from wanders slowly; the gusts (as the foliage's swell) push it about.
  // The vane follows on a soft spring, so it lags, overshoots a little and settles.
  let ang = 2.6, vel = 0, last = -1;
  const near = new THREE.Vector3(X, top, Z);
  const target = t => { const gust = THREE.MathUtils.smoothstep(Math.sin(t * 0.11), 0.55, 1.0); return 2.6 + 0.7 * Math.sin(t * 0.017) + 0.3 * Math.sin(t * 0.047 + 2) + gust * (0.35 * Math.sin(t * 0.83) + 0.2 * Math.sin(t * 1.9 + 1)); };
  ang = target(wind.value); vane.rotation.y = ang;
  const fixed = new URLSearchParams(location.search).get('vaneyaw');
  if (fixed !== null) { vane.rotation.y = Number(fixed); return; }
  animated.push(() => {
    const t = wind.value, dt = last < 0 ? 0 : Math.min(0.05, Math.max(0, t - last)); last = t;
    if (camera.position.distanceToSquared(near) > 260 * 260 || !dt) return;
    let d = target(t) - ang; d = Math.atan2(Math.sin(d), Math.cos(d));
    vel += (5 * d - 1.4 * vel) * dt; ang += vel * dt; vane.rotation.y = ang;
  });
}

// ---- small helpers ------------------------------------------------------------------------------------
// A sloping slab on side s (-1 south, +1 north) from d0 to d1 feet off the middle line, its top (or with
// under, its underside) on the surface y(d), th thick, running z0..z1; texture in feet, courses along the ridge
function slab(d0, d1, y, th, z0, z1, s, under = false) {
  const cos = 1 / Math.hypot(1, PITCH), sin = PITCH * cos, run = d1 - d0, mid = (d0 + d1) / 2;
  const g = feetBox(z1 - z0, th, run / cos);
  const ex = new THREE.Vector3(0, 0, s < 0 ? 1 : -1), n = new THREE.Vector3(s * sin, cos, 0), dz = new THREE.Vector3(s * cos, -sin, 0);
  const at = new THREE.Vector3(CX + s * mid, y(mid), (z0 + z1) / 2).addScaledVector(n, under ? th / 2 / cos * cos : -th / 2);
  g.applyMatrix4(new THREE.Matrix4().makeBasis(ex, n, dz).setPosition(at));
  return g;
}
// Box geometry with texture coordinates in feet (as the Builder's), non-indexed
function feetBox(sx, sy, sz) {
  const g = new THREE.BoxGeometry(sx, sy, sz).toNonIndexed(), n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    const [su, sv] = ax > 0.5 ? [sz, sy] : ay > 0.5 ? [sx, sz] : [sx, sy];
    uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  }
  return g;
}
function mergeAll(list) {
  const out = new THREE.BufferGeometry(), keys = ['position', 'normal', 'uv'], arrays = keys.map(() => []);
  for (const g0 of list) { const g = g0.index ? g0.toNonIndexed() : g0; keys.forEach((k, i) => { const a = g.attributes[k]; if (a) arrays[i].push(...a.array); }); }
  keys.forEach((k, i) => out.setAttribute(k, new THREE.Float32BufferAttribute(arrays[i], k === 'uv' ? 2 : 3)));
  return out;
}
// Letters cut into a surface: a shadow along the upper edge of each stroke, light along the lower, then the fill
function carve(g, text, x, y, size, o) {
  const draw = (dx, dy, style) => {
    g.fillStyle = style; let w = 0; const fs = s => `${o.italic ? 'italic ' : ''}${s}px ${FONT}`;
    g.font = fs(size); for (const ch of text) w += g.measureText(ch).width + size * o.track; w -= size * o.track;
    let cx = x - w / 2; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
    for (const ch of text) { g.fillText(ch, cx + dx, y + dy); cx += g.measureText(ch).width + size * o.track; }
  };
  draw(0, -1.5, o.shadow); draw(0, 1.2, o.light); draw(0, 0, o.ink);
}
