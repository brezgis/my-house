// The grounds: a big old family garden in high summer, on an island in the
// sky (ISLAND below; main.js draws the land). Mown lawns and paths through
// long grass, shade trees, shrubs grown a bit too big, self-seeded flowers.
// Toward the rim it runs wild: long grass, hedgerow, old trees, boulders,
// and two benches looking out over the edge. Rooms, from the gate:
//
//   Front garden    a loose cottage garden either side of the brick walk, what
//                   is left of an old picket fence and its gate (always open)
//                   under a rambling rose, a tree seat and a tyre swing on the
//                   old oak, a mossy bird bath
//   The terrace     string lights across the pergola, bistro set, potted
//                   magnolias, ferns and hydrangeas
//   Koi pond        south of the terrace: a natural pond with reeds and a mossy
//                   stone edge, a weathered plank bridge, lilies, a willow, a
//                   frog on a lily pad, two ducks
//   North lawn      the play set (tower, slide, swings, monkey bars, sandbox),
//                   birches, a lilac
//   The potager     north-west of the kitchen: picket fence, eight raised beds,
//                   sundial, glasshouse, compost, scarecrow; beyond it the
//                   orchard and the beehives
//   Long border     one deep, loose border along a mown walk west from the
//                   house, long grass on the other side, to a clearing with a
//                   bench and an old summerhouse with a day bed
//   The meadow      south-west: mown paths through wildflowers to a fire pit
//                   and a hammock between two maples; fireflies at night
//
// World coordinates (feet): x north(+)/south(-), y up, z street(+)/back(-).
// The house stands in x -21.7..21.7, z 0..-46.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { W } from './builder.js';
import { F1 } from './house.js';
import { makeKit, PAINT, GLOW, GLOW_WARM } from './garden/tools.js';
import { buildPond, pondLife, POND } from './garden/pond.js';
import { buildPlay, playLife } from './garden/play.js';
import { buildPotager } from './garden/potager.js';
import { creatures } from './garden/creatures.js';
import { wind, rng } from './garden/cards.js';
import { inPoly } from './garden/flora.js';

export const BOUNDS = { x0: -110, x1: 100, z0: -142, z1: 68 };
// The island the house stands on (main.js draws the land and its rocky
// underside). Its outline is fitted round what stands on it: each radius
// reaches just past the farthest thing in that direction, so the land bulges
// for the pond and the orchard, runs out in tongues to the two lookout
// benches, and pulls in tight where nothing needs room.
const ANCHORS = [
  [-36, 18], [-36, -16], [22, 16], [22, -50], [2, 70], [-44, 70], [48, 70],              // house, terrace, front fence
  [2, 103], [-4, 98], [8, 98],                                                              // the tongue to the front lookout
  [-62, 54], [-50, 56], [-36, 52], [-88, 4], [-94, 18], [-72, -10], [-70, 24], [-80, 34],   // old oak, bird bath, pond, willow
  [80, -8], [80, 22], [46, 26], [96, 28], [98, -22],                                         // play set, north lawn
  [68, -56], [68, -104], [58, -124], [38, -124], [100, -60], [100, -114], [92, -120],         // potager, glasshouse, orchard, hives
  [-26, -130], [-108, -128], [-112, -26], [-100, -122], [-104, -40], [-110, -80],            // meadow, hammock, meadow bench
  [-18, -144], [2, -144], [-8, -168], [-14, -162], [-2, -162],                               // summerhouse, the tongue to the back lookout
];
export const ISLAND = (() => {
  const x = -5, z = -24, N = 40, raw = new Array(N).fill(62);
  for (const [ax, az] of ANCHORS) {
    const d = Math.hypot(ax - x, az - z), a = Math.atan2(az - z, ax - x);
    for (let i = 0; i < N; i++) { let da = Math.abs(((i / N) * Math.PI * 2 - a + Math.PI * 3) % (Math.PI * 2) - Math.PI); if (da < 0.2) raw[i] = Math.max(raw[i], (d + 14) * (1 - da * 0.35)); }
  }
  const outline = raw.map((v, i) => Math.round(Math.max(v, (raw[(i + N - 1) % N] + raw[(i + 1) % N]) * 0.47)));
  return { x, z, r: Math.max(...outline), outline };
})();
// The island's edge radius in any direction (the barrier stands at 0.965 of it)
export function islandEdge(a) {
  const o = ISLAND.outline, N = o.length, f = ((((a / (Math.PI * 2)) % 1) + 1) % 1) * N, i = Math.floor(f), t = f - i;
  return o[i % N] * (1 - t) + o[(i + 1) % N] * t;
}

// The standing trees (see trees.js); the garden adds orchard apples, potted
// trees and more when it is laid out.
export const TREES = [
  // front garden
  { kind: 'oak', x: -62, z: 42, seed: 3, height: 52, trunk: 2.4 },
  { kind: 'oak', x: 56, z: 50, seed: 8, height: 46 },
  { kind: 'apple', x: -42, z: 27, seed: 5, height: 19 },
  { kind: 'apple', x: 26, z: 29, seed: 6, height: 17 },
  { kind: 'cherry', x: -98, z: 58, seed: 9, height: 22 },
  { kind: 'maple', x: 88, z: 62, seed: 10, height: 44 },
  { kind: 'birch', x: 34, z: 22, seed: 11 }, { kind: 'birch', x: 40, z: 29, seed: 12, height: 32 }, { kind: 'birch', x: 30, z: 31, seed: 13, height: 30 },
  { kind: 'oak', x: -104, z: 22, seed: 14, height: 50 },
  { kind: 'pine', x: -114, z: 70, seed: 15 }, { kind: 'pine', x: 104, z: 70, seed: 16, height: 52 },
  // north side
  { kind: 'oak', x: 97, z: 30, seed: 17, height: 44 },
  { kind: 'maple', x: 101, z: -22, seed: 18, height: 42 },
  { kind: 'lilac', x: 40, z: -6, seed: 19 }, { kind: 'lilac', x: 58, z: -47, seed: 20 },
  { kind: 'pine', x: 108, z: -60, seed: 21, height: 50 },
  // around the pond
  { kind: 'willow', x: -91, z: 17, seed: 22, height: 38 },
  { kind: 'apple', x: -46, z: 21, seed: 23, height: 15 },
  { kind: 'cherry', x: -42, z: -24, seed: 24, height: 20 },
  // south boundary
  { kind: 'pine', x: -114, z: 0, seed: 25 }, { kind: 'pine', x: -112, z: -38, seed: 26, height: 48 },
  { kind: 'oak', x: -108, z: -72, seed: 27, height: 48 },
  // the meadow
  { kind: 'birch', x: -100, z: -50, seed: 28 }, { kind: 'birch', x: -106, z: -58, seed: 29, height: 33 }, { kind: 'birch', x: -97, z: -64, seed: 30, height: 30 },
  { kind: 'maple', x: -97, z: -102, seed: 31, height: 40 }, { kind: 'maple', x: -97, z: -124, seed: 32, height: 42 },
  { kind: 'oak', x: -68, z: -136, seed: 33, height: 50, trunk: 2.3 },
  { kind: 'pine', x: -113, z: -96, seed: 34 }, { kind: 'pine', x: -114, z: -150, seed: 35, height: 54 },
  { kind: 'cherry', x: -40, z: -112, seed: 36, height: 21 },
  // the back
  { kind: 'maple', x: -38, z: -155, seed: 37, height: 46 },
  { kind: 'oak', x: 20, z: -148, seed: 38, height: 48 },
  { kind: 'magnolia', x: 8, z: -132, seed: 39, height: 17 },
  { kind: 'lilac', x: 28, z: -128, seed: 40 },
  { kind: 'maple', x: 50, z: -150, seed: 41, height: 40 },
  { kind: 'pine', x: 64, z: -158, seed: 42, height: 50 }, { kind: 'pine', x: 108, z: -158, seed: 43 },
  { kind: 'oak', x: 66, z: -36, seed: 44, height: 40 },
  // close overhead: a few more near the house
  { kind: 'oak', x: -33, z: -48, seed: 45, height: 44 }, { kind: 'maple', x: 34, z: 48, seed: 46, height: 38 }, { kind: 'oak', x: 44, z: -27, seed: 47, height: 40 }, { kind: 'maple', x: -42, z: -66, seed: 48, height: 36 },
];

export function plantGarden(B, items) {
  const K = makeKit(B, items, TREES);
  K.extras = items.extras; K.ferns = [];
  const { G, F, r } = K;
  const px = X => X - W / 2;

  // ======================================================================================
  // What is left of the old picket fence, and the gate that always stands open
  // ======================================================================================
  const { z1: BZ1 } = BOUNDS;
  const OLDPAINT = 'c#d6cfbd/0.9', OLDWOOD = 'c#8a8070/1';
  {
    const fz = BZ1, gx0 = px(20.55) - 0.1, gx1 = px(26.55) + 0.1;
    const fence = (xa, xb, z = fz) => {
      for (let x = xa; x <= xb + 0.01; x += (xb - xa) / Math.max(1, Math.round((xb - xa) / 7))) { K.box(OLDPAINT, x - 0.2, x + 0.2, 0, 3.9 + (r() - 0.5) * 0.2, z - 0.2, z + 0.2); }
      for (const y of [0.8, 3.0]) K.box(OLDPAINT, xa, xb, y, y + 0.25, z - 0.16, z - 0.06);
      for (let x = xa + 0.35; x < xb - 0.2; x += 0.45) {
        if (r() < 0.07) continue;                                          // a picket gone here and there
        const lean = r() < 0.12 ? (r() - 0.5) * 0.25 : 0;
        K.box(OLDPAINT, x - 0.13, x + 0.13, 0.25, 3.45, z - 0.06, z + 0.02, lean ? { rot: [0, 0, lean] } : undefined);
      }
      K.collide(xa, xb, z - 0.3, z + 0.3, 5);
      for (let x = xa; x < xb; x += 3 + r() * 3) F.add(r() < 0.5 ? 'grass' : 'wildflowers', x, z + (r() - 0.5) * 2, 0.9 + r() * 0.4);
    };
    fence(gx0 - 21, gx0); fence(gx1, gx1 + 17); fence(gx1 + 32, gx1 + 41);
    // one bay fallen flat in the grass
    for (let x = -42; x < -32; x += 0.45) K.box(OLDPAINT, x - 0.13, x + 0.13, 0.05, 0.12, fz - 2.8, fz - 0.4);
    K.box(OLDPAINT, -42.2, -31.8, 0.1, 0.22, fz - 1.0, fz - 0.8); K.box(OLDPAINT, -42.2, -31.8, 0.1, 0.22, fz - 2.4, fz - 2.2);
    // the arbour, smothered in a rambling rose
    for (const x of [gx0 - 0.3, gx1 + 0.3]) for (const z of [fz - 1.2, fz + 0.6]) K.box(OLDPAINT, x - 0.2, x + 0.2, 0, 8.4, z - 0.2, z + 0.2);
    for (const z of [fz - 1.2, fz + 0.6]) { const cx = (gx0 + gx1) / 2, R = (gx1 - gx0) / 2 + 0.3; for (let i = 0; i < 14; i++) { const a0 = Math.PI * i / 14, a1 = Math.PI * (i + 1) / 14; K.beam(OLDPAINT, [cx + Math.cos(a0) * R, 8.4 + Math.sin(a0) * 1.6, z], [cx + Math.cos(a1) * R, 8.4 + Math.sin(a1) * 1.6, z], 0.3, 0.3); } }
    for (let x = gx0 - 0.3; x <= gx1 + 0.31; x += 0.9) { const cx = (gx0 + gx1) / 2, R = (gx1 - gx0) / 2 + 0.3, y = 8.4 + 1.6 * Math.sqrt(Math.max(0, 1 - ((x - cx) / R) ** 2)); K.box(OLDPAINT, x - 0.08, x + 0.08, y - 0.1, y + 0.1, fz - 1.6, fz + 1.0); }
    for (const x of [gx0 - 0.3, gx1 + 0.3]) for (let y = 0.3; y < 8; y += 1.6) F.add('rose', x + (r() - 0.5), fz - 0.3, 0.6, { y, w: 2.8, h: 2.8 });
    for (let i = 0; i < 9; i++) { const cx = (gx0 + gx1) / 2, a = Math.PI * (i + 0.5) / 9, R = (gx1 - gx0) / 2 + 0.3; F.add('rose', cx + Math.cos(a) * R, fz - 0.3 + (r() - 0.5), 0.7, { y: 7.6 + Math.sin(a) * 1.6 }); }
    // the gate, standing open
    for (const [hx, s] of [[gx0, 1], [gx1, -1]]) {
      const len = (gx1 - gx0) / 2 - 0.1, ang = 1.35, ex = hx + s * Math.cos(ang) * len, ez = fz - Math.sin(ang) * len;
      for (const y of [0.9, 2.9]) K.beam(OLDPAINT, [hx, y, fz - 0.2], [ex, y, ez - 0.2], 0.22, 0.12);
      for (let i = 0; i <= 6; i++) { const t = i / 6, x = hx + (ex - hx) * t, z = fz - 0.2 + (ez - fz) * t, h = 3.3 + 0.5 * Math.sin(Math.PI * t * 0.5 + (s < 0 ? Math.PI / 2 : 0)); K.box(OLDPAINT, x - 0.12, x + 0.12, 0.4, h, z - 0.04, z + 0.04); }
      K.collide(Math.min(hx, ex) - 0.1, Math.max(hx, ex) + 0.1, Math.min(fz, ez) - 0.3, Math.max(fz, ez), 4);
    }
    B.wbox('pavers', px(20.55), px(26.55), -0.05, 0.06, 61.9, fz + 1);
    K.extras.push({ draw: (g, w, h) => { g.fillStyle = '#d9d2c0'; g.fillRect(0, 0, w, h); g.strokeStyle = '#8a9480'; g.lineWidth = 8; g.strokeRect(8, 8, w - 16, h - 16); g.fillStyle = '#4a4f44'; g.font = 'italic 64px "Iowan Old Style", Palatino, Georgia, serif'; g.textAlign = 'center'; g.fillText('Come in,', w / 2, 96); g.font = 'italic 44px "Iowan Old Style", Palatino, Georgia, serif'; g.fillText('the garden is always open', w / 2, 166); }, cw: 600, ch: 230, w: 3.0, h: 1.15, x: px(23.55), y: 7.5, z: fz + 1.12, rotY: 0.04, rough: 0.9 });
  }

  // ======================================================================================
  // Front garden: an easy, overgrown cottage garden either side of the brick walk
  // ======================================================================================
  {
    G.blob('mulch', -6.5, 39, 4.6, 19, { wobble: 0.2 });
    F.drift('lavender', -2.4, 24, 1.4, 5, 7, 1); F.drift('lavender', -2.6, 49, 1.2, 4, 5, 1);
    F.drift('catmint', -2.6, 36, 1.4, 4, 4, 1); F.drift('cosmos', -6, 30, 2.5, 4, 5, 0.9); F.drift('spires', -10, 44, 2, 4, 5, 0.9);
    F.drift('rose', -8, 54, 2.5, 3, 3, 1.05); F.drift('wildflowers', -6, 47, 2.5, 3, 6, 0.9); F.drift('hydrangea', -11, 26, 2, 3, 2, 1);
    G.blob('mulch', 8.5, 30, 3.4, 9.5, { wobble: 0.25 });
    F.drift('lavender', 6.1, 22, 1.2, 4, 5, 1); F.drift('rose', 9.5, 31, 2.2, 3, 3, 1); F.drift('catmint', 6.2, 34, 1.2, 3, 3, 1); F.drift('cosmos', 11, 37, 2, 3, 4, 0.9); F.drift('coneflower', 8, 26, 1.5, 2, 3, 0.9);
    F.fill(K.G.blob ? [[-10.5, 22], [-2.2, 22], [-2.2, 57], [-10.5, 57]] : [], [['catmint', 2, 0.9], ['cosmos', 2, 0.9], ['wildflowers', 3, 0.9], ['lavender', 1, 1], ['spires', 1, 0.8], ['grass', 1, 0.8]], 2.2);
    F.fill([[5.6, 21.5], [11.5, 21.5], [11.5, 39], [5.6, 39]], [['catmint', 2, 0.9], ['cosmos', 1, 0.9], ['wildflowers', 2, 0.9], ['lavender', 2, 1], ['coneflower', 1, 0.8]], 2.2);
    // self-seeded things along the walk, and clover in the lawn
    for (let z = 18; z < 66; z += 2.2 + r() * 3) { const s = r() < 0.5 ? -1 : 1, x = s < 0 ? -1.4 - r() : 5.2 + r(); if (z > 41 && z < 60 && s > 0) F.add(r() < 0.6 ? 'wildflowers' : 'grass', x + 1, z, 0.6); else if (z > 60) F.add(r() < 0.6 ? 'wildflowers' : 'grass', x, z, 0.7); }
    // Foundation planting: hydrangeas grown big, ferns
    G.rect('mulch', 8.6, 21.4, 0.5, 6.8);
    F.row('hydrangea', 9.8, 2.3, 20.5, 2.3, 2.4, 1.2); F.row('fern', 9.5, 5.4, 20.8, 5.4, 2.0, 0.9); F.drift('hosta', 15, 5.6, 5, 0.6, 4, 1);
    G.blob('mulch', -19, 14.6, 14.5, 2.4, { wobble: 0.15 });
    F.drift('rose', -26, 14.2, 5, 1, 3, 1.05); F.drift('lavender', -16, 15.4, 8, 0.8, 7, 0.95); F.drift('catmint', -9, 15, 3, 0.6, 3, 0.9); F.drift('spires', -31, 15, 1.5, 0.6, 2, 0.8);
    G.rect('mulch', -38.6, -34.0, -13.5, 13.5);
    F.row('hydrangea', -36.6, -11.5, -36.6, 11.5, 3.0, 1.2); F.row('fern', -38.0, -12.5, -38.0, 12.5, 2.2, 0.95); F.drift('hosta', -35, -2, 0.6, 9, 5, 1.1);
    // Shade bed along the north wall of the house, and stepping stones past it
    G.rect('mulch', 21.9, 25.5, -36, -1);
    F.row('fern', 23.2, -2, 23.2, -35, 4.6, 1); for (const z of [-5, -16, -27]) K.ferns.push([23.4, 0.05, z, 1.0]); F.row('hosta', 24.6, -3, 24.6, -34, 2.6, 1.1); F.drift('hydrangea', 23, -18, 0.8, 8, 3, 1);
    for (let z = 12; z > -50; z -= 2.6) { const x = 29 + Math.sin(z * 0.12) * 1.4; G.blob('flagstone', x, z, 1.25, 0.95, { y: 0.09, wobble: 0.18, seed: Math.round(z * 10) }); }
    // A tree seat round the old oak, and a tyre swing from one of its limbs
    {
      const ox = -62, oz = 42, R0 = 3.2, R1 = 4.8, h = 1.55;
      for (let i = 0; i < 8; i++) {
        const a0 = (i / 8) * Math.PI * 2, a1 = ((i + 1) / 8) * Math.PI * 2;
        for (let k = 0; k < 4; k++) { const rr = R0 + (R1 - R0) * (k + 0.5) / 4; K.beam(OLDWOOD, [ox + Math.cos(a0) * rr, h, oz + Math.sin(a0) * rr], [ox + Math.cos(a1) * rr, h, oz + Math.sin(a1) * rr], 0.32, 0.1); }
        K.box(OLDWOOD, ox + Math.cos(a0) * (R1 - 0.3) - 0.12, ox + Math.cos(a0) * (R1 - 0.3) + 0.12, 0, h - 0.06, oz + Math.sin(a0) * (R1 - 0.3) - 0.12, oz + Math.sin(a0) * (R1 - 0.3) + 0.12);
        K.box(OLDWOOD, ox + Math.cos(a0) * (R0 + 0.2) - 0.12, ox + Math.cos(a0) * (R0 + 0.2) + 0.12, 0, h - 0.06, oz + Math.sin(a0) * (R0 + 0.2) - 0.12, oz + Math.sin(a0) * (R0 + 0.2) + 0.12);
      }
      K.collide(ox - R1, ox + R1, oz - R1, oz + R1, 2.0);
      K.seat(ox + 4.2, h, oz - 1.8, -0.8, 'sit under the old oak');
      K.squirrelOn = { x: ox - 3.9, y: 1.62, z: oz + 1.2, ry: -2.2 };
      K.tyre = { x: ox + 9, z: oz + 6, top: 16 };
      G.blob('soil', ox + 9, oz + 6, 2.6, 1.8, { y: 0.06, wobble: 0.3 });
      K.beam(OLDWOOD, [ox + 3, 15.6, oz + 2], [ox + 13, 17.5, oz + 9], 0.7, 0.7);          // the limb it hangs from
    }
    // An old stone bird bath, mossy, with a blue tit
    {
      const x = -34, z = 46;
      K.lathe('c#8b8a76/1', x, 0, z, [[0.01, 0], [0.9, 0], [0.9, 0.2], [0.45, 0.45], [0.3, 1.2], [0.36, 2.2], [0.5, 2.5], [1.5, 2.75], [1.6, 2.95], [1.45, 2.95], [0.01, 2.75]], 18);
      K.lathe(PAINT.moss, x, 0.02, z, [[0.92, 0], [0.92, 0.12], [0.5, 0.38], [0.01, 0.4]], 14);
      K.cyl('c#5a6a62/0.05/0.2', x, 2.78, 2.86, z, 1.42, 1.42, 18);
      K.titOn = { x: x - 1.45, y: 2.95, z: z + 0.3, ry: 0.4 };
      K.collide(x - 1.2, x + 1.2, z - 1.2, z + 1.2, 3.2);
      F.drift('wildflowers', x, z, 3.2, 3.2, 5, 0.8); F.drift('grass', x, z, 2.4, 2.4, 3, 0.7);
    }
    K.hedgehogAt = { x: -10.2, z: 47.5, ry: -0.6 };
  }

  // ======================================================================================
  // Porch and terrace
  // ======================================================================================
  {
    const pf = F1 - 0.15;                                                 // porch floor
    K.model('Rockingchair_01', px(19.3), 6.5, 0.25, { y: pf, seat: 1.45 }); K.model('Rockingchair_01', px(27.8), 6.5, -0.25, { y: pf, seat: 1.45 });
    K.model('wooden_lantern_01', px(17.9) + 0.4, 10.6, 0, { y: pf }); K.lamp(px(17.9), F1 + 1, 10.6, 0.3);
    // small pots either side of the front door: ferns and a little lavender, well clear of the wall
    for (const x of [-2.4, 6.2]) { const top = K.pot(x, pf, 1.45, 0.85, [['lavender', 0.5, 0.25, 0.1]], { collide: false }); K.ferns.push([x - 0.15, top - 0.1, 1.5, 0.45]); K.collide(x - 0.85, x + 0.85, 0.6, 2.3, pf + 3, pf); }
    for (const x of [-2.2, 6.0]) { const top = K.pot(x, pf, 10.3, 0.95, [], { collide: false }); K.ferns.push([x, top - 0.1, 10.3, 0.55]); K.collide(x - 0.95, x + 0.95, 9.35, 11.25, pf + 3, pf); }
    K.snails = [{ x: -2.2 + 0.75, y: pf + 0.8, z: 10.3 + 0.3, ry: 0.3, rz: 0, s: 1.2 }];
    for (const [x, z] of [[-7.0, 15.4], [10.6, 15.4]]) K.pot(x, 0, z, 1.3, [['hydrangea', 0.5]]);
    K.model('watering_can_metal_01', 11.0, 13.6, 2.2, { scale: 1.1 });
    const ty = F1 - 0.4;
    K.model('outdoor_table_chair_set_01', px(-6.4), 5.0, 0.6, { y: ty, collide: true }); K.seat(px(-6.4) + 1.2, ty + 1.5, 3.4, 0.6, 'sit on the terrace');
    K.model('outdoor_table_chair_set_01', px(-6.0), -6.0, -0.4, { y: ty, collide: true }); K.seat(px(-6.0) - 1.1, ty + 1.5, -4.4, -0.4 + Math.PI, 'sit under the lights');
    K.model('Lantern_01', px(-6.4), 5.0, 0.4, { y: ty + 2.42 });
    const corner = [[-30.2, 8.4, 1.6, 'magnolia'], [-30.2, -8.4, 1.6, 'lilac'], [-8.6, 9.4, 1.15, null], [-23.1, 10.2, 1.2, null], [-22.6, -10.0, 1.1, null]];
    for (const [x, z, s, tree] of corner) {
      const top = K.pot(x, ty, z, s, tree ? [] : [[K.pick(['hydrangea', 'lavender', 'fern', 'catmint']), 0.6]]);
      if (tree) TREES.push({ kind: tree, x, z, y: top - 0.2, height: 5.5, seed: Math.round(z + 77), collide: false });
    }
    for (const [x, z] of [[-32.0, 3.2], [-32.0, -3.2], [-15.7, 10.4]]) { const top = K.pot(x, ty, z, 0.85, [], { collide: false }); K.ferns.push([x, top - 0.12, z, 0.5]); K.collide(x - 0.85, x + 0.85, z - 0.85, z + 0.85, ty + 3, ty); }
    K.terrace = { x0: px(-12), x1: px(-0.2), z0: -13, z1: 13, y: F1 + 8.3 };
  }

  // ======================================================================================
  // The pond, the play set, the potager
  // ======================================================================================
  buildPond(K);
  for (const [x, z] of [[-30, -16.5], [-35.5, -18.6], [-41, -19.3], [-46.5, -18.4], [-51.8, -16.6], [-57, -14.6], [-61.5, -14.0]]) G.blob('flagstone', x, z, 1.5, 1.1, { y: 0.09, wobble: 0.2, seed: Math.round(x * 7) });
  for (const [x, z] of [[-64.5, 23.6], [-63.5, 28.5], [-61.6, 33.2]]) G.blob('flagstone', x, z, 1.4, 1.05, { y: 0.09, wobble: 0.2, seed: Math.round(z * 7) });
  buildPlay(K);
  buildPotager(K);
  K.pondAt = { x: POND.x, z: POND.z, y: POND.y };

  // ======================================================================================
  // The long border: one deep, loose border along a mown walk west from the house,
  // long grass and foxgloves on the other side, to a clearing and the summerhouse
  // ======================================================================================
  {
    const z0 = -110, z1 = -52;
    G.blob('mulch', 1.5, -81, 5.5, 29, { wobble: 0.12 });
    const pal = { back: [['spires', 1.1], ['hydrangea', 1.2], ['rose', 1.15], ['cosmos', 1.2], ['grass', 1.3], ['shrub', 0.55]], mid: [['rose', 1], ['coneflower', 1.0], ['cosmos', 1], ['lavender', 1.2], ['wildflowers', 1.1]], front: [['catmint', 1.1], ['lavender', 1], ['herbs', 1.2], ['wildflowers', 0.9], ['grass', 0.8]] };
    F.border([[-3.5, z1 - 1], [-3, -76]], 10, 1, { ...pal, step: 6.5 }); F.border([[-3, -84], [-3.8, z0 + 1]], 10, 1, { ...pal, step: 6.5 });
    // the other side: long grass running into the meadow, foxgloves seeding about
    for (let z = z1; z > z0; z -= 2.4) for (let x = -24; x < -13; x += 2.4) { const qx = x + (r() - 0.5) * 2, qz = z + (r() - 0.5) * 2; if (qx > -16 + Math.sin(qz * 0.2) * 1.5) continue; F.add(r() < 0.6 ? 'grass' : r() < 0.7 ? 'wildflowers' : 'spires', qx, qz, 0.8 + r() * 0.4); }
    // a weathered bench in the clearing, looking back at the house
    K.model('painted_wooden_bench', -9, -118, 0, { scale: 1.25, collide: true }); K.seat(-9, 1.6, -117.6, Math.PI, 'sit in the clearing');
  }

  // ======================================================================================
  // The summerhouse at the far end
  // ======================================================================================
  {
    const cx = -8, z0 = -140.4, z1 = -130, x0 = cx - 7.5, x1 = cx + 7.5, fl = 1.05, eave = 8.6, ridge = 12.6;
    K.box('brick', x0, x1, 0, fl - 0.15, z0, z1); K.box('timber', x0 + 0.1, x1 - 0.1, fl - 0.15, fl, z0 + 0.1, z1 - 0.1, { grain: 'long' });
    K.box('brick', cx - 2.5, cx + 2.5, 0, fl / 2, z1, z1 + 1.1);
    K.surface(x0, x1, z0, z1, fl); K.surface(cx - 2.5, cx + 2.5, z1, z1 + 1.1, fl / 2);
    for (const x of [x0 + 0.4, cx - 2.6, cx + 2.6, x1 - 0.4]) for (const z of [z0 + 0.4, z1 - 0.4]) { K.box('timber', x - 0.28, x + 0.28, fl, eave - 0.4, z - 0.28, z + 0.28, { grain: 'long' }); K.collide(x - 0.32, x + 0.32, z - 0.32, z + 0.32, 9); }
    for (const z of [z0 + 0.4, z1 - 0.4]) K.box('timber', x0 - 1.2, x1 + 1.2, eave - 0.9, eave - 0.2, z - 0.3, z + 0.3, { grain: 'long' });
    for (const x of [x0 + 0.4, x1 - 0.4]) K.box('timber', x - 0.25, x + 0.25, eave - 0.7, eave - 0.1, z0 - 1.6, z1 + 1.6, { grain: 'long' });
    const zc = (z0 + z1) / 2, half = (z1 - z0) / 2 + 2.6, ang = Math.atan2(ridge - eave, half), len = Math.hypot(half, ridge - eave);
    for (const s of [-1, 1]) {
      const g = new THREE.BoxGeometry(x1 - x0 + 4, 0.25, len + 0.3); g.rotateX(s * ang); g.translate(cx, (ridge + eave) / 2 + 0.3, zc + s * half / 2); B.mesh('roof', g);
      for (let x = x0 - 1.6; x <= x1 + 1.61; x += 1.5) K.beam('timber', [x, eave - 0.05, zc + s * half], [x, ridge, zc], 0.2, 0.4);
    }
    for (const s of [-1, 1]) { const g = new THREE.BufferGeometry(), x = s < 0 ? x0 + 0.2 : x1 - 0.2; const pos = [x, eave - 0.1, zc - half + 2.6, x, eave - 0.1, zc + half - 2.6, x, ridge, zc]; g.setAttribute('position', new THREE.Float32BufferAttribute(s < 0 ? pos : [...pos.slice(3, 6), ...pos.slice(0, 3), ...pos.slice(6)], 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2)); g.computeVertexNormals(); B.mesh('shake', g); }
    K.box('timber', x0 - 2.5, x1 + 2.5, ridge - 0.35, ridge + 0.3, zc - 0.3, zc + 0.3, { grain: 'long' });
    for (let x = x0 + 0.8; x < x1 - 0.5; x += 0.55) K.box('timber', x - 0.06, x + 0.06, fl, fl + 3, z0 + 0.3, z0 + 0.42);
    K.box('timber', x0, x1, fl + 3, fl + 3.25, z0 + 0.2, z0 + 0.6); K.collide(x0, x1, z0, z0 + 0.6, 6);
    for (const x of [x0 + 0.4, x1 - 0.4]) { for (let z = z0 + 0.8; z < z1 - 0.8; z += 0.55) K.box('timber', x - 0.06, x + 0.06, fl, fl + 3, z - 0.06, z + 0.06); K.box('timber', x - 0.2, x + 0.2, fl + 3, fl + 3.25, z0, z1); K.collide(x - 0.25, x + 0.25, z0, z1, 6); }
    K.model('vintage_day_bed', cx, z0 + 3.2, 0, { y: fl, collide: true });
    K.seat(cx, fl + 0.9, z0 + 3.4, 0, 'lie on the day bed');
    K.model('side_table_01', cx + 4.6, z0 + 2.4, 0, { y: fl });
    K.model('vintage_oil_lamp', cx + 4.6, z0 + 2.4, 0.4, { y: fl + 2.05, scale: 1 }); K.lamp(cx + 4.6, fl + 3, z0 + 2.4, 0.25, 'candle');
    K.model('ArmChair_01', cx - 4.5, z0 + 4.2, 0.5, { y: fl, seat: 1.5 });
    K.model('wicker_basket_01', cx - 5.6, z0 + 1.6, 0, { y: fl });
    F.drift('rose', x0 - 1.5, z1 - 1, 1.5, 3, 3, 1.1); F.drift('hydrangea', x1 + 1.8, z0 + 4, 1.5, 4, 3, 1.1);
    F.row('fern', x0 - 3.4, z0 + 1, x0 - 3.4, z1, 3, 1); F.drift('grass', x1 + 3, z1 - 2, 2, 4, 5, 1);
  }

  // ======================================================================================
  // The meadow: mown paths, a fire pit, a hammock
  // ======================================================================================
  {
    const poly = [[-26.5, -24], [-26.5, -126], [-100, -128], [-110, -26], [-84, -16], [-50, -22], [-38, -30]];
    G.poly('meadow', poly);
    const paths = [
      [[-34, -21], [-46, -36], [-56, -58], [-62, -72]],
      [[-62, -88], [-78, -98], [-92, -110], [-95, -113]],
      [[-92, -118], [-72, -124], [-44, -122], [-24, -116]],
      [[-24.5, -80], [-40, -80.5], [-53, -80]],
      [[-56, -58], [-80, -44], [-98, -40]],
    ];
    for (const p of paths) G.ribbon('lawn', p, 4.5, { wobble: 0.2 });
    const fx = -62, fz = -80;
    G.blob('soil', fx, fz, 8.5, 8, { y: 0.085, wobble: 0.2 });
    const near = []; for (const p of paths) { const c = new THREE.CatmullRomCurve3(p.map(([x, z]) => new THREE.Vector3(x, 0, z))); for (let i = 0; i <= 60; i++) near.push(c.getPointAt(i / 60)); }
    K.nearPaths = near;
    const clear = (x, z) => near.every(p => Math.hypot(p.x - x, p.z - z) > 3.3) && Math.hypot(x - fx, z - fz) > 10.5 && Math.hypot(x + 96, z + 113) > 9;
    for (let x = -110; x < -27; x += 3.1) for (let z = -128; z < -18; z += 3.1) {
      const qx = x + (r() - 0.5) * 2.8, qz = z + (r() - 0.5) * 2.8;
      if (!inPoly(qx, qz, poly) || !clear(qx, qz)) continue;
      const k = r(); F.add(k < 0.55 ? 'grass' : k < 0.95 ? 'wildflowers' : 'spires', qx, qz, 0.8 + r() * 0.45);
    }
    // the fire pit: logs to sit on and two old kitchen chairs
    K.model('stone_fire_pit', fx, fz, 0, { scale: 1.25, collide: true });
    K.fire = { x: fx, y: 0.75, z: fz };
    for (let i = 0; i < 3; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3, x = fx + Math.cos(a) * 6, z = fz + Math.sin(a) * 6;
      K.cyl('c#5a4636/1', x, 0, 1.5, z, 0.85, 0.8, 10); K.cyl('c#b89a74/0.9', x, 1.5, 1.52, z, 0.8, 0.8, 10);
      K.collide(x - 0.75, x + 0.75, z - 0.75, z + 0.75, 2.0);
      K.seat(x, 1.5, z, Math.atan2(x - fx, z - fz), 'sit by the fire');
    }
    for (const i of [3, 4]) { const a = (i / 5) * Math.PI * 2 + 0.3, x = fx + Math.cos(a) * 6.4, z = fz + Math.sin(a) * 6.4, yaw = Math.atan2(x - fx, z - fz); K.model('painted_wooden_chair_01', x, z, yaw + Math.PI + (r() - 0.5) * 0.4, { seat: 1.5 }); }
    K.model('wicker_basket_01', fx + 7.4, fz - 3.6, 0.3);
    for (let i = 0; i < 6; i++) K.cyl('c#6a5038/1', fx + 7.6 + (i % 3) * 0.5, 0.25 + Math.floor(i / 3) * 0.45, 0.25 + Math.floor(i / 3) * 0.45 + 0.01, fz - 5.6, 0.22, 0.22, 7);
    K.hammock = { x: -96.5, z0: -104.4, z1: -121.6, low: 2.4 };
    K.model('painted_wooden_bench', -100, -40, Math.PI * 0.25, { scale: 1.25, collide: true }); K.seat(-99.7, 1.6, -40.3, -Math.PI * 0.75, 'sit in the meadow');
    K.model('dead_tree_trunk_02', -102, -82, 1.4, { scale: 0.8, collide: true });
    K.fireflySpots = [[-70, -100, 30], [-90, -60, 18], [-60, -130, 20], [POND.x, POND.z, 16], [86, -90, 16], [4, 82, 14], [-95, -60, 14]];
  }

  // ======================================================================================
  // Toward the edge of the island: long grass, hedgerow, old trees, boulders at the brink
  // ======================================================================================
  {
    const I = ISLAND, inGarden = (x, z) => x > -112 && x < 100 && z > -132 && z < 66 && !(x > 66 && z > -54 && z < -30);
    const polar = (x, z) => [Math.hypot(x - I.x, z - I.z), Math.atan2(z - I.z, x - I.x)];
    const room = (x, z) => { const [d, a] = polar(x, z); return islandEdge(a) * 0.95 - d; };      // feet to the barrier
    const lane = (x, z) => Math.abs(x - 2) < 3 && z > 66;                                  // the mown way out to the front lookout
    const backLane = (x, z) => Math.abs(x + 8) < 3 && z < -141;
    // long grass and wildflowers wherever the garden gives out, thicker toward the edge
    for (let x = I.x - I.r; x < I.x + I.r; x += 4.6) for (let z = I.z - I.r; z < I.z + I.r; z += 4.6) {
      const qx = x + (r() - 0.5) * 4, qz = z + (r() - 0.5) * 4, gap = room(qx, qz);
      if (gap < 2 || inGarden(qx, qz) || lane(qx, qz) || backLane(qx, qz)) continue;
      const k = r(); F.add(k < 0.6 ? 'grass' : k < 0.93 ? 'wildflowers' : 'spires', qx, qz, 0.9 + r() * 0.45 + (gap < 14 ? 0.25 : 0));
      if (gap < 16 && r() < 0.5) F.add(r() < 0.6 ? 'grass' : 'wildflowers', qx + 2, qz + 1, 1.1);
    }
    // trees out in the long grass and at the brink, close and overhead
    const kinds = ['oak', 'maple', 'birch', 'apple', 'oak', 'pine', 'cherry', 'maple'];
    let n = 0;
    for (let i = 0; i < 600 && n < 16; i++) {
      const a = r() * Math.PI * 2, e = islandEdge(a), d = e * (0.7 + r() * 0.22), x = I.x + Math.cos(a) * d, z = I.z + Math.sin(a) * d;
      if (inGarden(x, z) || lane(x, z) || Math.abs(x - 2) < 12 && z > 66 || backLane(x, z) || room(x, z) < 6) continue;
      if (TREES.some(t => Math.hypot(t.x - x, t.z - z) < 22)) continue;
      const kind = kinds[n % kinds.length];
      TREES.push({ kind, x, z, seed: 300 + n, height: kind === 'apple' ? 16 : kind === 'cherry' ? 22 : kind === 'birch' ? 32 : 36 + r() * 12 }); n++;
    }
    // boulders, mossy, at the brink
    for (let i = 0; i < 26; i++) {
      const a = r() * Math.PI * 2, d = islandEdge(a) * (0.86 + r() * 0.06), x = I.x + Math.cos(a) * d, z = I.z + Math.sin(a) * d;
      if (lane(x, z) || backLane(x, z) || inGarden(x, z)) continue;
      const s = 1.4 + r() * 2.2; K.rock(r() < 0.5 ? PAINT.moss : PAINT.stoneDark, x, s * 0.25, z, s * (1 + r() * 0.5), s * 0.7, s);
      K.collide(x - s * 0.9, x + s * 0.9, z - s * 0.9, z + s * 0.9, 3);
      F.add('grass', x + s, z, 1.1); F.add('fern', x - s, z + 0.5, 0.9);
    }
    // two benches looking out over the edge, at the ends of the mown ways
    const look = (x, z) => { const out = Math.atan2(x - I.x, z - I.z); K.model('painted_wooden_bench', x, z, out, { scale: 1.25, collide: true }); K.seat(x - Math.sin(out) * 0.3, 1.6, z - Math.cos(out) * 0.3, out + Math.PI, 'sit and look out'); };
    look(2, 95); look(-8, -158);
    // a few posts of an old fence near the north edge
    for (let i = 0; i < 6; i++) { const a = 0.2 + i * 0.05, d = islandEdge(a) * 0.86, x = I.x + Math.cos(a) * d, z = I.z + Math.sin(a) * d; if (inGarden(x, z)) continue; K.box(OLDWOOD, x - 0.25, x + 0.25, 0, 3.6 - (i % 3) * 0.5, z - 0.25, z + 0.25, { rot: [0, 0, (r() - 0.5) * 0.2] }); }
    // anything planted where the land has gone is taken away again
    for (let i = TREES.length - 1; i >= 0; i--) { const t = TREES[i]; if (t.y) continue; if (room(t.x, t.z) < 4) TREES.splice(i, 1); }
  }
    K.flowerSpots = [[1.9, 40], [-8, -70], [-8, -100], [46, -70], [46, -92], [-60, -100], [-60, -60], [86, -100], [-20, 60], [30, 60], [-34, 46], [-80, -118], [2, 85]];

  // ======================================================================================
  // String lights across the pergola, four modest strands
  // ======================================================================================
  {
    const T = K.terrace, xa = px(-12) + 0.2, xb = px(-0.2) - 0.2, y = T.y - 0.9;
    const strand = (ax, az, bx, bz, sag, n) => {
      let prev = null;
      for (let i = 0; i <= n; i++) {
        const t = i / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t, yy = y - sag * 4 * t * (1 - t);
        if (prev) K.tube(PAINT.wire, prev, [x, yy, z], 0.018, 3);
        if (i > 0 && i < n) { K.tube(PAINT.wire, [x, yy, z], [x, yy - 0.18, z], 0.012, 3); K.lathe(GLOW, x, yy - 0.36, z, [[0.01, 0], [0.055, 0.02], [0.08, 0.08], [0.07, 0.14], [0.04, 0.17], [0.04, 0.2]], 6); K.cyl(PAINT.brass, x, yy - 0.18, yy - 0.14, z, 0.045, 0.045, 6); }
        prev = [x, yy, z];
      }
    };
    for (const z of [-10.5, -3.5, 3.5, 10.5]) strand(xa, z, xb, z + 1.2, 0.8, 8);
    K.lamp(px(-6), y - 0.8, -5, 0.32); K.lamp(px(-6), y - 0.8, 6, 0.32);
  }

  // ======================================================================================
  // Built once materials exist, and the things that move
  // ======================================================================================
  const setup = ctx => {
    const { THREE: T3, scene, renderer, materials, animated, day, house } = ctx;
    for (const s of K.surfaces) house.surfaces.push(s);
    K.G.build(scene, renderer, materials.grass);
    K.P.build(scene, mergeGeometries);
    // real ferns (Poly Haven fern_02), one instanced mesh for all of them
    ctx.loadModel('fern_02').then(o => {
      o.updateMatrixWorld(true); let best = null, mat = null;
      o.traverse(n => { if (!n.isMesh) return; const g = n.geometry.clone().applyMatrix4(n.matrixWorld); const c = g.attributes.position.count; if (!best || c > best.attributes.position.count) { best = g; mat = n.material; } });
      for (const k of Object.keys(best.attributes)) if (!['position', 'normal', 'uv'].includes(k)) best.deleteAttribute(k);
      best.computeBoundingBox(); const bb = best.boundingBox, geo = best;
      geo.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
      const k3 = 3 / Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z); geo.scale(k3, k3, k3);
      mat = mat.clone(); mat.alphaTest = 0.5; mat.transparent = false; mat.side = T3.DoubleSide; mat.envMapIntensity = 0.7;
      const inst = new T3.InstancedMesh(geo, mat, K.ferns.length), m = new T3.Matrix4(), q = new T3.Quaternion(), rr = rng(5);
      K.ferns.forEach(([x, y, z, s], i) => inst.setMatrixAt(i, m.compose(new T3.Vector3(x, y, z), q.setFromAxisAngle(new T3.Vector3(0, 1, 0), rr() * 6.28), new T3.Vector3(s, s * (0.9 + rr() * 0.2), s))));
      inst.castShadow = inst.receiveShadow = true; inst.name = 'ferns'; scene.add(inst);
    }).catch(() => {});
    const flora = K.F.build(scene);
    // the glow of bulbs and lanterns: soft by day, bright after dark
    const glows = [GLOW, GLOW_WARM].map(n => materials.make(n));
    animated.push((t, dt) => {
      wind.value = t;
      for (const g of glows) g.emissiveIntensity = 0.08 + 1.9 * day.night + 0.4 * (1 - day.light) * (1 - day.night);
    });
    // the tyre swing on the old oak
    if (K.tyre) {
      const t = K.tyre, grp = new T3.Group(); grp.position.set(t.x, t.top, t.z); scene.add(grp);
      const rope = new T3.Mesh(new T3.CylinderGeometry(0.04, 0.04, t.top - 2.4, 5), new T3.MeshStandardMaterial({ color: 0x9a8a6a, roughness: 1 })); rope.position.y = -(t.top - 2.4) / 2; grp.add(rope);
      const tyre = new T3.Mesh(new T3.TorusGeometry(1.0, 0.36, 10, 22), new T3.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.9 })); tyre.position.y = -(t.top - 2.0); tyre.castShadow = true; grp.add(tyre);
      const seat = { x: t.x, y: 4.6, z: t.z, yaw: 0.6, label: 'sit in the tyre swing' };
      ctx.interact.push({ x: t.x, y: 2.4, z: t.z, reach: 6, seat, label: () => 'sit in the tyre swing' });
      let amp = 0.04, ph = 0;
      animated.push((tt, dt) => { const on = ctx.walker?.seated === seat; amp += ((on ? 0.4 : 0.012) - amp) * Math.min(1, dt * 0.4); ph += dt * Math.sqrt(32 / (t.top - 2)); const a = amp * Math.sin(ph); grp.rotation.x = a; grp.rotation.y = 0.3 * Math.sin(tt * 0.05); seat.z = t.z - (t.top - 2) * Math.sin(a); seat.y = t.top - (t.top - 2) * Math.cos(a) + 2.6; });
      ctx.colliders.push({ x0: t.x - 1.2, x1: t.x + 1.2, z0: t.z - 1.2, z1: t.z + 1.2, y0: 0, y1: 3 });
    }
    // the fire pit: flames after dark (or whenever you light it)
    if (K.fire) {
      const f = K.fire, lamp = { x: f.x, y: f.y + 1.6, z: f.z, power: 0, kind: 'fire' }; items.lamps.push(lamp);
      const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 100, 2, 32, 76, 80); gr.addColorStop(0, 'rgba(255,244,200,1)'); gr.addColorStop(0.35, 'rgba(255,170,60,.9)'); gr.addColorStop(0.75, 'rgba(220,70,20,.35)'); gr.addColorStop(1, 'rgba(120,20,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 128);
      const mat = new T3.MeshBasicMaterial({ map: new T3.CanvasTexture(c), transparent: true, depthWrite: false, blending: T3.AdditiveBlending, side: T3.DoubleSide, toneMapped: false });
      const hearth = new T3.Group(); hearth.position.set(f.x, f.y, f.z); scene.add(hearth);
      const logMat = new T3.MeshStandardMaterial({ color: 0x2a1a12, roughness: 1, emissive: 0x401000, emissiveIntensity: 0 });
      for (let i = 0; i < 4; i++) { const l = new T3.Mesh(new T3.CylinderGeometry(0.17, 0.2, 2.0, 7), logMat); l.rotation.set(Math.PI / 2 - 0.35, (i / 4) * Math.PI * 2, 0); l.position.set(Math.cos(i * 1.57) * 0.3, 0.35, Math.sin(i * 1.57) * 0.3); hearth.add(l); }
      const tongues = [0, 1, 2, 3, 4].map(i => { const fl = new T3.Mesh(new T3.PlaneGeometry(1.1, 1.8), mat); fl.rotation.y = (i / 5) * Math.PI; hearth.add(fl); return fl; });
      let manual = null;
      ctx.interact.push({ x: f.x, y: 1.4, z: f.z, reach: 8, label: () => (lit() ? 'let the fire die down' : 'light the fire'), act: () => { manual = !lit(); } });
      const lit = () => manual ?? day.night > 0.45;
      animated.push(t => { const on = lit(); lamp.power = on ? 0.9 : 0; logMat.emissiveIntensity = on ? 0.8 + 0.3 * Math.sin(t * 7) : 0; tongues.forEach((fl, i) => { fl.visible = on; const k = 0.8 + 0.25 * Math.sin(t * (7 + i) + i * 2) + 0.12 * Math.sin(t * 19 + i); fl.scale.set(0.8 + 0.2 * Math.sin(t * 5 + i), k, 1); fl.position.y = 0.3 + 0.8 * k; }); });
    }
    // the hammock, swaying a little; lie in it and look up into the leaves
    if (K.hammock) {
      const h = K.hammock, len = h.z0 - h.z1, cz = (h.z0 + h.z1) / 2, top = 5.6;
      const geo = new T3.PlaneGeometry(len * 0.72, 3.2, 16, 4), p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) { const u = p.getX(i) / (len * 0.72) * 2, v = p.getY(i) / 1.6; p.setZ(i, (1 - u * u) * -1.3 + v * v * 0.55); }
      geo.rotateX(-Math.PI / 2); geo.rotateY(Math.PI / 2); geo.computeVertexNormals();
      const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d'); for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#efe6d2' : '#c9573f'; g.fillRect(i * 8, 0, 8, 64); }
      const tex = new T3.CanvasTexture(c); tex.colorSpace = T3.SRGBColorSpace;
      const cloth = new T3.Mesh(geo, new T3.MeshStandardMaterial({ map: tex, side: T3.DoubleSide, roughness: 0.95 }));
      const grp = new T3.Group(); grp.position.set(h.x, top, cz); scene.add(grp);
      cloth.position.y = h.low + 1.3 - top; cloth.castShadow = true; grp.add(cloth);
      const ropeMat = new T3.MeshStandardMaterial({ color: 0xb8a57c, roughness: 1 });
      for (const s of [-1, 1]) for (const dx of [-1.4, 0, 1.4]) { const a = new T3.Vector3(0, 0.6, s * len / 2), b = new T3.Vector3(dx, h.low + 1.3 - top + 0.55, s * len * 0.36); const d = b.clone().sub(a); const rope = new T3.Mesh(new T3.CylinderGeometry(0.025, 0.025, d.length(), 4), ropeMat); rope.position.copy(a).add(b).multiplyScalar(0.5); rope.quaternion.setFromUnitVectors(new T3.Vector3(0, 1, 0), d.normalize()); grp.add(rope); }
      const seat = { x: h.x, y: h.low + 1.2, z: cz, yaw: Math.PI / 2, label: 'lie in the hammock' };
      ctx.interact.push({ x: h.x, y: h.low + 0.6, z: cz, reach: 6, seat, label: () => 'lie in the hammock' });
      let was = false;
      animated.push(t => { const a = 0.02 * Math.sin(t * 0.5); grp.rotation.z = a; seat.x = h.x - Math.sin(a) * (top - h.low); const w = ctx.walker; const on = w?.seated === seat; if (on && !was) w.pitch = 0.75; was = on; });
      ctx.colliders.push({ x0: h.x - 1.8, x1: h.x + 1.8, z0: h.z1 + 2, z1: h.z0 - 2, y0: 0, y1: 2.6 });
    }
    pondLife(ctx, K);
    playLife(ctx, K);
    creatures(ctx, K);
    if (new URLSearchParams(location.search).has('gstats')) setTimeout(() => {
      const by = {}; let calls = 0, tris = 0;
      scene.traverse(o => { if (!o.isMesh && !o.isPoints) return; const g = o.geometry, n = (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); const k = o.isInstancedMesh ? 'inst:' + o.name : (o.name || o.parent?.name || 'anon').slice(0, 18); by[k] = by[k] || [0, 0]; by[k][0]++; by[k][1] += n; calls++; tris += n; });
      const top = Object.entries(by).sort((a, b) => b[1][1] - a[1][1]).slice(0, 14).map(([k, [c, n]]) => `${k}:${c}/${(n / 1000).toFixed(0)}k`).join(' ');
      const topc = Object.entries(by).sort((a, b) => b[1][0] - a[1][0]).slice(0, 10).map(([k, [c]]) => `${k}:${c}`).join(' ');
      console.log('GSTATS meshes', calls, 'tris', (tris / 1000).toFixed(0) + 'k |', top, '|| calls:', topc, '| plants', flora.count);
    }, 15000);
  };

  return { hives: K.hives, setup };
}
