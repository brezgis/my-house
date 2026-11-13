// The treehouse, in the great oak at the north brink of the island, past the play set: small, and quiet, as if
// one person built it over a summer and the tree is holding it up.
//
//   the oak       old and broad, right at the brink, its roots over the lip (the TREES entry in garden.js; its
//                 limbs are grown again here, treehouse_bits.js oakBones, so the floor sits on the real fork)
//   the frame     three heavy beams lashed and bolted across the limbs, a few knee braces back to the trunk;
//                 no posts to the ground. Two limbs come up through the porch boards
//   the way up    one steep ship's stair from the lawn, rope handrails; you climb it at a climbing pace
//   the cabin     brown shingles in the house's own manner, rafter tails, the great limb sweeping past its
//                 north eave (the shingles cut round it); a green Dutch door with a hood and its sign, a round
//                 casement with a brass telescope trained on the house; inside, a window seat with cushions,
//                 books and a tin of shortbread, a blanket, the map of the island, drawings pinned up, a shelf,
//                 a jacket on its hook, a string of paper flags, a lantern
//   the balcony   out of the cabin's east door, just big enough for two, past the lip over the sky; beside it
//                 a net slung from the limb to lie in and look down
//   and           a plank swing on long ropes from the far limb; jar lanterns, a lantern by the door, one short
//                 string of bulbs under the south eave, and the cabin's windows warm after dark
//
// The porch, the cabin's floor and the balcony are the walker's surfaces, flagged `free`: while you stand on
// them the island's rim (walk.js) lets you go and their rails (colliders) hold you instead. The garden's shared
// paint takes the timber; the shingles are the house's own material; everything else (ropes, net, printed
// things, the lights, and the swing, which moves) is one mesh of its own.

import * as THREE from 'three';
import { PAINT } from './tools.js';
import { PLAY } from './play.js';
import { POND } from './pond.js';
import { POT } from './potager.js';
import { CHAPEL } from './chapel.js';
import { oakBones, inWood, isPaint, Sheet, quad, netPatch, makeMovers, drawSheet, drawGlow, prep, paintColour, RECT, BOOKS } from './treehouse_bits.js';

export const TREEHOUSE = { x: 106, z: 29, deck: 15 };
const TX = TREEHOUSE.x, TZ = TREEHOUSE.z, D = TREEHOUSE.deck;

// ---- the plan, in feet from the trunk (x north, out over the edge; z east). The lip is at x 5.5 to 7 here.
const PORCH = { x0: -4.0, x1: 1.6, z0: -8.6, z1: -1.6 };                            // in front of the cabin's west door
const CAB = { x0: 1.6, x1: 6.8, z0: -8.4, z1: -3.0, plate: D + 6.4 };              // the cabin, outside faces
const DOOR = { z0: -6.3, z1: -4.3, h: 6.0 };                                        // a door in each gable: in from the porch, out to the balcony
const ROUND = { z: -7.45, y: D + 4.6, r: 0.5 };                                     // the round casement, beside the west door
const SEATWIN = { x0: 3.3, x1: 5.9, y0: D + 2.4, y1: D + 5.0 };                     // south, over the window seat
const BALC = { x0: 6.8, x1: 10.8, z0: -9.2, z1: -4.0 };                             // the balcony, out past the lip (its south end clear of the cabin: the view back to the house)
const STAIR = { x0: -3.9, x1: -1.7, z0: -19.6, z1: -8.6 };                          // the ship's stair, from the lawn to the porch
const NET = { x0: 7.3, x1: 10.9, z0: -3.7, z1: 0.3, sag: 1.15 };
const BEAMS = [[-1.9, -4.4, 2.4], [-3.85, -4.4, 11.1], [-7.6, -4.4, 11.1]];        // [z, x0, x1]: the first lashed to the limbs
const SCOPE = { e: [2.85, D + 4.55, -7.15], d: [-0.925, -0.02, -0.381] };          // eyepiece, and toward the house
const CLIMB = 1.3;                                                                   // ft a second along the stair: a climb, not a glide

const CEDAR = 'c#8c7058/0.9', CEDAR2 = 'c#7a604a/0.9', DECKB = ['c#97785c/0.9', 'c#8d6f55/0.9', 'c#9c8064/0.9'], TRIM = 'c#3e2c1e/0.8';      // cedar a few summers old
const LINING = 'c#c4a47c/0.9', DOORPAINT = 'c#4c6a52/0.6', IRON = 'c#2a2926/0.45/0.7', BRASS = PAINT.brass, ROPE = PAINT.rope, CABLE = 'c#4a3f34/0.6';
const GLASS = 'c#2a3a40/0.15';
// Every obstacle on the floors reaches at least this high: a jump tops out 1.7 ft up (walk.js), so nothing can be
// jumped onto (a walker landing inside a low obstacle beside a rail would be put out by its nearest face, which
// could be the far side of the rail).
const LOW = D + 3.3;

export function buildTreehouse(K, opts = {}) {
  try { build(K, opts); } catch (e) { console.warn('treehouse: not built', e); delete K.treehouse; }
}
function build(K, opts) {
  const oak = K.trees.find(t => t.kind === 'oak' && t.seed === 17 && Math.hypot(t.x - TX, t.z - TZ) < 1);
  if (!oak) return;
  const { limbs, trunkR } = oakBones({ ...oak, x: 0, z: 0 });
  const wood = limbs.filter(l => l.depth >= 0 && l.depth <= 2);
  const sheet = new Sheet(), T = { sheet, limbs, movers: makeMovers(), parts: {}, island: opts.island, outline: opts.outline };
  K.treehouse = T; TREEHOUSE.kit = K;      // (the kit, for the tests: gardentest.html ?treehouse=1)
  const glow = (g, k = 1) => sheet.print(g, RECT.bulb, k);                          // a bulb or a lantern's glass
  // ---- the kit, in the treehouse's own feet --------------------------------------------------------------
  const put = (mat, g, own = false) => {
    if (!isPaint(mat)) { K.B.mesh(mat, g); return; }
    g.computeBoundingBox(); const cx = (g.boundingBox.min.x + g.boundingBox.max.x) / 2;
    if (own || cx >= 119.5) sheet.paint(mat, g); else K.put(mat, g);
  };
  const box = (mat, x0, x1, y0, y1, z0, z1, o = {}) => {
    const ax = Math.min(x0, x1), bx = Math.max(x0, x1), az = Math.min(z0, z1), bz = Math.max(z0, z1);
    if (!isPaint(mat)) return K.box(mat, TX + ax, TX + bx, Math.min(y0, y1), Math.max(y0, y1), TZ + az, TZ + bz, o);
    const g = new THREE.BoxGeometry(bx - ax, Math.abs(y1 - y0), bz - az);
    if (o.rot) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...o.rot)));
    g.translate(TX + (ax + bx) / 2, (y0 + y1) / 2, TZ + (az + bz) / 2); put(mat, g, o.own);
  };
  const V = (p) => new THREE.Vector3(TX + p[0], p[1], TZ + p[2]);
  const beam = (mat, a, b, w, h = w, own = false) => {
    const A = V(a), d = V(b).sub(A), len = d.length(); if (len < 0.01) return;
    const g = new THREE.BoxGeometry(w, len, h).toNonIndexed(); g.translate(0, len / 2, 0);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * len);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(A.x, A.y, A.z); put(mat, g, own);
  };
  const tube = (mat, a, b, rad, seg = 5, own = true) => {
    const A = V(a), d = V(b).sub(A), len = d.length(); if (len < 0.005) return;
    const g = new THREE.CylinderGeometry(rad, rad, len, seg, 1, true); g.translate(0, len / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(A.x, A.y, A.z); put(mat, g, own);
  };
  const rope = (mat, pts, rad, seg = 4, own = true) => { for (let i = 1; i < pts.length; i++) tube(mat, pts[i - 1], pts[i], rad, seg, own); };
  const sagged = (a, b, sag, n = 6) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n; return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t]; });
  const cyl = (mat, x, y0, y1, z, r0, r1 = r0, seg = 12, own = false) => { const g = new THREE.CylinderGeometry(r1, r0, y1 - y0, seg); g.translate(TX + x, (y0 + y1) / 2, TZ + z); put(mat, g, own); };
  const lathe = (mat, x, y, z, prof, seg = 12, own = false) => { const g = new THREE.LatheGeometry(prof.map(([r, h]) => new THREE.Vector2(r, h)), seg); g.translate(TX + x, y, TZ + z); put(mat, g, own); };
  const sphere = (mat, x, y, z, rad, sy = 1, detail = 1, own = false) => { const g = new THREE.IcosahedronGeometry(rad, detail); g.scale(1, sy, 1); g.translate(TX + x, y, TZ + z); put(mat, g, own); };
  const print = (rect, c, u, v, w, h) => sheet.print(quad([TX + c[0], c[1], TZ + c[2]], u, v, w, h), rect);
  const collide = (x0, x1, z0, z1, y1, y0 = 0) => K.collide(TX + x0, TX + x1, TZ + z0, TZ + z1, y1, y0);
  const surface = (x0, x1, z0, z1, h, h2, free = true) => K.surfaces.push({ x0: TX + x0, x1: TX + x1, z0: TZ + z0, z1: TZ + z1, h, ...(h2 === undefined ? {} : { h2, ramp: true }), ...(free ? { free: true } : {}) });
  // Runs of a line along x (or z) that are clear of the oak's wood: the line is sampled along several
  // parallel tracks (pts: [y, z] for x-lines, [x, y] for z-lines) and a run ends wherever any of them is in wood
  const clear = (axis, a0, a1, pts, pad, cutters = wood) => {
    const n = Math.max(8, Math.ceil(Math.abs(a1 - a0) / 0.08)), out = []; let s = null;
    for (let i = 0; i <= n; i++) {
      const a = a0 + (a1 - a0) * i / n, hit = pts.some(([p, q]) => (axis === 'x' ? inWood(cutters, a, p, q, pad) : inWood(cutters, p, q, a, pad)) > 0);
      if (!hit && s === null) s = a;
      if ((hit || i === n) && s !== null) { const e = hit ? a - (a1 - a0) / n : a; if (e - s > 0.12) out.push([s, e]); s = null; }
    }
    return out;
  };

  // a ship's lantern hung at (x, y, z) from an arm back to (ax, az): iron frame, glass that glows
  const lantern = (x, y, z, ax, az) => {
    box(IRON, Math.min(x, ax) - 0.03, Math.max(x, ax) + 0.03, y + 0.72, y + 0.78, Math.min(z, az) - 0.03, Math.max(z, az) + 0.03);
    tube(IRON, [x, y + 0.72, z], [x, y + 0.6, z], 0.012, 3, false);
    box(IRON, x - 0.17, x + 0.17, y + 0.5, y + 0.6, z - 0.17, z + 0.17); box(IRON, x - 0.15, x + 0.15, y - 0.05, y, z - 0.15, z + 0.15);
    for (const [dx, dz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) box(IRON, x + dx * 0.13 - 0.018, x + dx * 0.13 + 0.018, y, y + 0.5, z + dz * 0.13 - 0.018, z + dz * 0.13 + 0.018);
    const g = new THREE.BoxGeometry(0.22, 0.46, 0.22); g.translate(TX + x, y + 0.25, TZ + z); glow(g);
  };

  // ---- the oak's own: its trunk, the limbs where they pass up through the floors, the roots over the lip --------
  collide(-trunkR * 0.9, trunkR * 0.9, -trunkR * 0.9, trunkR * 0.9, 12, -1);
  for (const l of limbs) {
    if (l.depth < 1 || l.depth > 2) continue;
    const len = l.a.distanceTo(l.b), n = Math.ceil(len / 0.45);
    for (let i = 0; i <= n; i++) {
      const p = l.a.clone().lerp(l.b, i / n), rr = l.r0 + (l.r1 - l.r0) * i / n + 0.05;
      if (p.y - rr < D + 5.8 && p.y + rr > D && p.x > PORCH.x0 - 1 && p.x < BALC.x1 + 1 && p.z > PORCH.z0 - 1 && p.z < PORCH.z1 + 1) collide(p.x - rr, p.x + rr, p.z - rr, p.z + rr, Math.max(p.y + 0.6, LOW), D - 0.3);
    }
  }
  {
    // the island's edge here (island.js, measured): level, then a shoulder of rough grass falling about a foot to the
    // nose of the sod lip, which is about 5 ft out from the trunk on the cabin's side and nearer 2 ft further north
    const LIP = [[-9, 5.1], [-3, 5.0], [1, 4.2], [5, 2.1], [9, 0.5]], lipX = z => { for (let i = 1; i < LIP.length; i++) if (z <= LIP[i][0]) { const [z0, x0] = LIP[i - 1], [z1, x1] = LIP[i], t = THREE.MathUtils.clamp((z - z0) / (z1 - z0), 0, 1); return x0 + (x1 - x0) * t; } return LIP.at(-1)[1]; };
    const ground = (x, z) => { const b = lipX(z); return x < b - 3.9 ? 0.03 : 0.03 - Math.min(1, (x - b + 3.9) / 3.9); };
    const bark = (pts) => {      // a root through pts [x, y, z, r], in the oak's own bark (the trees' material)
      for (let i = 1; i < pts.length; i++) {
        const [ax, ay, az, ar] = pts[i - 1], [bx, by, bz, br] = pts[i], A = new THREE.Vector3(TX + ax, ay, TZ + az), d = new THREE.Vector3(TX + bx, by, TZ + bz).sub(A), len = d.length();
        const g = new THREE.CylinderGeometry(br, ar, len + (i < pts.length - 1 ? br * 0.8 : 0), 7, 1, true), uv = g.attributes.uv; for (let j = 0; j < uv.count; j++) uv.setXY(j, uv.getX(j) * 2, uv.getY(j) * len / 5);
        g.translate(0, len / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(A.x, A.y, A.z); K.B.mesh('bark', g);
      }
    };
    for (const [ang, r0] of [[-0.8, 0.5], [-0.35, 0.58], [0.1, 0.5], [0.55, 0.42], [2.5, 0.4], [-2.6, 0.38], [1.3, 0.36]]) {
      const pts = [], cx = Math.cos(ang), cz = Math.sin(ang), inland = cx < 0.2;
      for (let d = trunkR * 0.75, i = 0; i < 30; i++, d += 0.9) {
        const wob = Math.sin(d * 0.9 + ang * 3) * 0.3, x = cx * d - cz * wob, z = cz * d + cx * wob, t = Math.min(1, (d - trunkR * 0.75) / 5), rr = Math.max(0.12, r0 * (1 - 0.65 * t));
        if (inland ? d > trunkR + 3.5 : x > lipX(z) - 0.25) {
          if (inland) { pts.push([x, ground(x, z) - 0.15, z, 0.05]); break; }
          const y = ground(x, z);      // over the nose of the lip, and down its face, thinning to a point
          pts.push([x + cx * 0.35, y - 0.35, z + cz * 0.35, rr * 0.8], [x + cx * 0.55, y - 1.4, z + cz * 0.55, rr * 0.5], [x + cx * 0.45, y - 2.8, z + cz * 0.45, 0.04]);
          break;
        }
        pts.push([x, ground(x, z) + rr * (i === 0 ? 0.9 : 0.25), z, rr]);
      }
      bark(pts);
    }
  }

  // ---- the frame: three beams across the fork, lashed and bolted; knee braces to the trunk; joists; boards -------
  for (const [z, x0, x1] of BEAMS) for (const [a, b] of clear('x', x0, x1, [[D - 1.1, z - 0.32], [D - 1.1, z + 0.32]], 0.04)) box(CEDAR2, a, b, D - 1.75, D - 0.6, z - 0.32, z + 0.32);
  {
    // where the first beam meets the limbs: rope lashings round both, and an iron bolt through
    const z = BEAMS[0][0];
    for (const l of limbs.filter(q => q.depth === 1)) {
      const t = (D - 1.2 - l.a.y) / (l.b.y - l.a.y); if (t < 0 || t > 1) continue;
      const p = l.a.clone().lerp(l.b, t), rr = l.r0 + (l.r1 - l.r0) * t; if (Math.abs(p.z - z) > rr + 0.8) continue;
      for (const dx of [-0.25, 0.25]) { const g = new THREE.TorusGeometry(1, 0.05, 4, 16); g.scale(0.5, (rr + 0.7) / 1.5, (Math.abs(p.z - z) + rr + 0.6) / 2); g.rotateY(Math.PI / 2); g.translate(TX + p.x + dx, D - 1.2, TZ + (p.z + z) / 2); put(ROPE, g, true); }
      box(IRON, p.x - 0.09, p.x + 0.09, D - 1.25, D - 1.07, z - 0.4, z + 0.4);
    }
  }
  for (const [a, b] of [[[1.3, 8.4, -1.3], [3.6, D - 1.75, -3.85]], [[1.3, 8.4, -1.3], [4.2, D - 1.75, -7.6]], [[-1.4, 8.4, -1.3], [-3.6, D - 1.75, -3.85]], [[-1.4, 8.4, -1.3], [-3.9, D - 1.75, -7.6]],
    [[1.8, 6.6, -0.9], [9.6, D - 1.75, -7.6]], [[1.8, 6.6, -0.9], [9.6, D - 1.75, -3.85]]]) beam(CEDAR2, a, b, 0.42, 0.42);      // knee braces from the trunk
  for (let x = PORCH.x0 + 0.3; x < CAB.x1 - 0.2; x += 1.5) { const z1 = x < PORCH.x1 ? PORCH.z1 - 0.1 : CAB.z1 - 0.1; for (const [a, b] of clear('z', PORCH.z0 + 0.1, z1, [[x - 0.13, D - 0.38], [x + 0.13, D - 0.38]], 0.06)) box(CEDAR2, x - 0.13, x + 0.13, D - 0.6, D - 0.16, a, b); }
  {
    let i = 0;
    for (let z = PORCH.z0; z < PORCH.z1 - 0.1; z += 0.5, i++) {
      const z0 = z + 0.02, z1 = Math.min(PORCH.z1, z + 0.48), xe = z1 > CAB.z0 + 0.1 && z0 < CAB.z1 - 0.1 ? CAB.x1 - 0.2 : PORCH.x1;
      for (const [a, b] of clear('x', PORCH.x0 - 0.06, xe + 0.06, [[D - 0.07, z0], [D - 0.07, z1]], 0.07)) box(DECKB[(i * 7 + Math.round(a + 20)) % 3], a, b, D - 0.15, D, z0, z1);
    }
    for (let x = BALC.x0 - 0.2, k = 0; x < BALC.x1 - 0.1; x += 0.5, k++) box(DECKB[k % 3], x + 0.02, Math.min(BALC.x1 + 0.04, x + 0.48), D - 0.15, D, BALC.z0 - 0.05, BALC.z1 + 0.05);
  }
  surface(PORCH.x0, PORCH.x1, PORCH.z0, PORCH.z1, D); surface(CAB.x0, CAB.x1, CAB.z0, CAB.z1, D); surface(BALC.x0, BALC.x1, BALC.z0, BALC.z1, D);
  // nobody gets in under the porch from the stair (as by a jump near its head): a block under it, too high to touch
  // from the lawn (a walker there reaches 5.7 ft) and too low to touch from the porch; and a short ramp just inside the
  // stair's head catches anyone who arrives a little below the boards
  collide(PORCH.x0, PORCH.x1, PORCH.z0, PORCH.z1, D - 0.5, 5.8);
  surface(STAIR.x0, STAIR.x1, PORCH.z0, PORCH.z0 + 1.6, D, D - 1.6, false);

  // ---- railings: posts, a cap rail and one rail between; the colliders are as high as no jump can clear -----------
  const jars = [];
  const rail = (ax, az, bx, bz, o = {}) => {
    const len = Math.hypot(bx - ax, bz - az), ux = (bx - ax) / len, uz = (bz - az) / len, at = t => [ax + ux * len * t, az + uz * len * t], top = D + 3.25;
    const n = Math.max(1, Math.ceil(len / 3.2));
    for (let i = 0; i <= n; i++) { if ((i === 0 && o.noStart) || (i === n && o.noEnd)) continue; const [x, z] = at(i / n); box(CEDAR, x - 0.15, x + 0.15, D - 0.55, top + 0.12, z - 0.15, z + 0.15); if (o.jar === i) jars.push([x, top + 0.12, z]); }
    const [x0, z0] = at(0), [x1, z1] = at(1), w = (a, b) => [Math.min(a, b), Math.max(a, b)];
    for (const [y0, y1, t] of [[top, top + 0.12, 0.2], [D + 1.45, D + 1.6, 0.06]]) {
      const [xa, xb] = w(x0, x1), [za, zb] = w(z0, z1), ex = t * Math.abs(uz) + 0.02, ez = t * Math.abs(ux) + 0.02;
      const ym = (y0 + y1) / 2, runs = ux ? clear('x', xa, xb, [[ym, z0]], 0.08) : clear('z', za, zb, [[x0, ym]], 0.08);      // cut where a limb passes
      for (const [a, b] of runs) box(t > 0.1 ? CEDAR : CEDAR2, ux ? a : xa - ex, ux ? b : xb + ex, y0, y1, ux ? za - ez : a, ux ? zb + ez : b);
    }
    collide(Math.min(x0, x1) - 0.15, Math.max(x0, x1) + 0.15, Math.min(z0, z1) - 0.15, Math.max(z0, z1) + 0.15, D + 5.1, D - 0.3);
  };
  rail(PORCH.x0, PORCH.z0, PORCH.x0, PORCH.z1, { jar: 1 });                   // west, to the garden
  rail(PORCH.x0, PORCH.z1, PORCH.x1, PORCH.z1, { noStart: true });            // north, past the limb
  rail(PORCH.x1, PORCH.z1, PORCH.x1, CAB.z1 - 0.12, { noStart: true, noEnd: true });  // the step back to the cabin's corner
  rail(STAIR.x1 + 0.1, PORCH.z0, CAB.x0, PORCH.z0, { noEnd: true });          // south, from the stair's head
  rail(BALC.x0, BALC.z0, BALC.x1, BALC.z0, { noStart: true });                // the balcony
  rail(BALC.x1, BALC.z0, BALC.x1, BALC.z1, { noStart: true, jar: 1 });
  rail(BALC.x0, BALC.z1, BALC.x1, BALC.z1, { noStart: true, noEnd: true });

  // ---- the ship's stair: steep, two stringers, flat treads, rope handrails ------------------------------------------
  {
    const S = STAIR, n = 20, run = (S.z1 - S.z0) / n, rise = D / n;
    for (let i = 0; i < n; i++) { const y = rise * (i + 0.5), za = S.z0 + run * i; box(DECKB[i % 3], S.x0 + 0.04, S.x1 - 0.04, y - 0.12, y, za + 0.05, za + run + 0.12); }
    for (const x of [S.x0 - 0.12, S.x1 + 0.12]) beam(CEDAR2, [x, -0.3, S.z0 - 0.15], [x, D - 0.4, S.z1 + 0.1], 0.22, 0.75);
    for (const x of [S.x0 - 0.22, S.x1 + 0.22]) {
      const pts = [];
      for (const k of [0, 0.5, 1]) { const z = S.z0 + (S.z1 - S.z0) * k, y = D * k; box(CEDAR, x - 0.1, x + 0.1, y - 0.3, y + 3.1, z - 0.1, z + 0.1); pts.push([x, y + 2.95, z]); }
      rope(ROPE, [...sagged(pts[0], pts[1], 0.15, 3), ...sagged(pts[1], pts[2], 0.15, 3).slice(1)], 0.07, 5);
      collide(x - 0.1, x + 0.1, S.z0, S.z1, D + 5.6, -0.3);
    }
    surface(S.x0, S.x1, S.z0, S.z1, D, 0.05, false);
    collide(S.x0, S.x1, S.z0 + (S.z1 - S.z0) * 2.4 / D, S.z1, 2.0, 0);      // nobody walks in under it
    K.G.blob('soil', TX + (S.x0 + S.x1) / 2, TZ + S.z0 - 1.4, 1.8, 1.2, { wobble: 0.3, y: 0.06 });
    T.stair = S;
  }

  // ---- the cabin ------------------------------------------------------------------------------------------------
  const k = 0.85, ZC = (CAB.z0 + CAB.z1) / 2, HALF = (CAB.z1 - CAB.z0) / 2, OVER = 1.3, R = CAB.plate + HALF * k, slopeA = Math.atan(k);
  const RX0 = CAB.x0 - 1.2, RX1 = CAB.x1 + 1.0, roofY = z => R - Math.abs(z - ZC) * k, HE = HALF + OVER;
  {
    const C = CAB, T0 = 0.2, T1 = 0.32;
    // gables: shingle outside, lining in, a door notched in each, the round window beside the west one
    const gable = (mat, x, depth, west, top, inset = 0) => {      // (the lining is inset at its ends, inside the long walls)
      const z0 = C.z0 + inset, z1 = C.z1 - inset, pts = [[z0, D + 0.02], [DOOR.z0, D + 0.02], [DOOR.z0, D + DOOR.h], [DOOR.z1, D + DOOR.h], [DOOR.z1, D + 0.02], [z1, D + 0.02], [z1, C.plate], [ZC, top], [z0, C.plate]];
      const sh = new THREE.Shape(pts.map(([u, v]) => new THREE.Vector2(u, v)));
      if (west) sh.holes.push(new THREE.Path().absarc(ROUND.z, ROUND.y, ROUND.r + 0.06, 0, Math.PI * 2, true));
      const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false, curveSegments: 20 });
      g.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-1, 0, 0)).setPosition(TX + x, 0, TZ));
      put(mat, g);
    };
    gable('shake', C.x0 + T0, T0, true, R); gable(LINING, C.x0 + T1, T1 - T0, true, R - 0.45, T0);
    gable('shake', C.x1, T0, false, R); gable(LINING, C.x1 - T0, T1 - T0, false, R - 0.45, T0);
    const around = (a0, a1, y0, y1, holes) => { const out = []; let at = a0; for (const [h0, h1, hy0, hy1] of holes) { if (h0 > at) out.push([at, h0, y0, y1]); out.push([h0, h1, y0, hy0], [h0, h1, hy1, y1]); at = h1; } if (a1 > at) out.push([at, a1, y0, y1]); return out; };
    for (const [zo, s, holes] of [[C.z0, 1, [[SEATWIN.x0, SEATWIN.x1, SEATWIN.y0, SEATWIN.y1]]], [C.z1, -1, []]]) for (const [x0, x1, y0, y1] of around(C.x0 + T0 + 0.01, C.x1 - T0 - 0.01, D + 0.02, C.plate, holes)) {
      box('shake', x0, x1, y0, y1, zo, zo + s * T0); box(LINING, Math.max(x0, C.x0 + T1), Math.min(x1, C.x1 - T1), y0, y1, zo + s * T0, zo + s * T1);
    }
    for (const [x0, x1, z0, z1] of [[C.x0 - 0.05, C.x1 + 0.05, C.z0 - 0.05, C.z0 + 0.02], [C.x0 - 0.05, C.x1 + 0.05, C.z1 - 0.02, C.z1 + 0.05], [C.x0 - 0.05, C.x0 + 0.02, C.z0 + 0.01, DOOR.z0], [C.x0 - 0.05, C.x0 + 0.02, DOOR.z1, C.z1 - 0.01], [C.x1 - 0.02, C.x1 + 0.05, C.z0 + 0.01, DOOR.z0], [C.x1 - 0.02, C.x1 + 0.05, DOOR.z1, C.z1 - 0.01]]) box(TRIM, x0, x1, D, D + 0.45, z0, z1);      // (each a little into the wall: no face of theirs lies in the wall's)
    for (const [x, z] of [[C.x0, C.z0], [C.x1, C.z0], [C.x0, C.z1], [C.x1, C.z1]]) box(TRIM, x - 0.22, x + 0.22, D, C.plate, z - 0.22, z + 0.22);
    for (const z of [C.z0 - 0.06, C.z1 + 0.06]) box(TRIM, C.x0 - 0.1, C.x1 + 0.1, C.plate - 0.45, C.plate, Math.min(z, z + (z < ZC ? 0.08 : -0.08)), Math.max(z, z + (z < ZC ? 0.08 : -0.08)));
    for (const [x0, x1] of [[C.x0, C.x0 + T1], [C.x1 - T1, C.x1]]) { collide(x0, x1, C.z0, DOOR.z0, D + 7, D - 0.3); collide(x0, x1, DOOR.z1, C.z1, D + 7, D - 0.3); }
    collide(C.x0, C.x1, C.z0, C.z0 + T1, D + 7, D - 0.3); collide(C.x0, C.x1, C.z1 - T1, C.z1, D + 7, D - 0.3);
    // the roof: shingle courses on rafters, cut round the limb that sweeps past the north eave
    const Ls = HE / Math.cos(slopeA), n = 7, e = Ls / n;
    for (const s of [-1, 1]) for (let i = 0; i < n; i++) {
      const dc = Ls - (i + 0.5) * e, off = 0.1 + 0.022 * i, w = e + 0.24;
      const zc = ZC + s * Math.cos(slopeA) * dc + s * Math.sin(slopeA) * off, yc = R - Math.sin(slopeA) * dc + Math.cos(slopeA) * off;
      const dz = s * Math.cos(slopeA) * w / 2, dy = -Math.sin(slopeA) * w / 2;
      for (const [a, b] of clear('x', RX0, RX1, [[yc - dy, zc - dz], [yc, zc], [yc + dy, zc + dz]], 0.06)) box('shake', a, b, yc - 0.05, yc + 0.05, zc - w / 2, zc + w / 2, { rot: [s * slopeA, 0, 0] });
    }
    for (const s of [-1, 1]) for (const [a, b] of clear('x', RX0 - 0.1, RX1 + 0.1, [[R + 0.3, ZC + s * 0.2]], 0.1)) beam(TRIM, [a, R + 0.27, ZC + s * 0.17], [b, R + 0.27, ZC + s * 0.17], 0.42, 0.12);
    for (const s of [-1, 1]) for (let x = C.x0 + 0.45; x < C.x1 - 0.2; x += 1.3) {
      const zw = s < 0 ? C.z0 : C.z1, ze = ZC + s * (HE + 0.15);
      if (inWood(wood, x, roofY(ze), ze, 0.3) > 0 || inWood(wood, x, roofY((zw + ze) / 2), (zw + ze) / 2, 0.3) > 0) continue;
      beam(TRIM, [x, roofY(zw) - 0.28, zw], [x, roofY(ze) - 0.28, ze], 0.22, 0.34);
    }
    for (const x of [RX0 + 0.03, RX1 - 0.03]) for (const s of [-1, 1]) {
      const a = [x, roofY(ZC + s * (HE + 0.05)) - 0.05, ZC + s * (HE + 0.05)], b = [x, R + 0.15, ZC];
      let run = null;
      for (let i = 0; i <= 24; i++) { const t = i / 24, p = [a[0], a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], hit = inWood(wood, p[0], p[1], p[2], 0.35) > 0; if (!hit && !run) run = p; if ((hit || i === 24) && run) { beam(TRIM, run, p, 0.14, 0.55); run = null; } }
    }
    // inside: the ceiling boards (lamplit after dark: the sheet's glow map), the ridge beam, a collar tie
    for (const s of [-1, 1]) {
      const z0 = s < 0 ? C.z0 + T1 : C.z1 - T1, len = Math.abs(ZC - z0) / Math.cos(slopeA), zc = (z0 + ZC) / 2, yc = (roofY(z0) + R) / 2 - 0.42;
      const g = new THREE.BoxGeometry(C.x1 - C.x0 - 2 * T1, 0.06, len); g.rotateX(s * slopeA); g.translate(TX + (C.x0 + C.x1) / 2, yc, TZ + zc); sheet.print(g, RECT.glow, 1);
    }
    box(TRIM, C.x0 + T1, C.x1 - T1, R - 0.95, R - 0.5, ZC - 0.17, ZC + 0.17);
    box(TRIM, 4.1, 4.32, C.plate - 0.05, C.plate + 0.25, C.z0 + T1, C.z1 - T1);
    // the porch side: the hood on brackets over the west door, its sign, a mat, boots, red geraniums, a lantern
    {
      const y = D + DOOR.h + 0.35, zm = (DOOR.z0 + DOOR.z1) / 2;
      for (const z of [DOOR.z0 - 0.3, DOOR.z1 + 0.3]) { box(TRIM, C.x0 - 1.3, C.x0 + 0.06, y - 0.12, y, z - 0.1, z + 0.1); beam(TRIM, [C.x0 - 0.05, y - 0.9, z], [C.x0 - 1.1, y - 0.1, z], 0.16, 0.15); }
      for (const s of [-1, 1]) box('shake', C.x0 - 1.45, C.x0 + 0.1, y + 0.02, y + 0.12, zm + (s < 0 ? -1.6 : 0), zm + (s < 0 ? 0 : 1.6), { rot: [s * 0.32, 0, 0] });
      print(RECT.sign, [C.x0 - 0.04, y + 1.05, zm], [0, 0, 1], [0, 1, 0], 1.4, 0.55);
      box(TRIM, C.x0 - 0.012, C.x0 + 0.002, y + 0.73, y + 1.37, zm - 0.75, zm + 0.75);
      box('c#7a5a3a/1', C.x0 - 1.05, C.x0 - 0.05, D, D + 0.04, DOOR.z0 + 0.1, DOOR.z1 - 0.1);
      for (const dz of [0, 0.4]) { lathe('c#b0302a/0.5', C.x0 - 0.5, D, DOOR.z0 - 0.75 - dz, [[0.01, 0], [0.15, 0], [0.16, 0.05], [0.14, 0.9], [0.15, 0.95], [0.12, 0.95], [0.11, 0.3], [0.01, 0.28]], 8); box('c#b0302a/0.5', C.x0 - 0.8, C.x0 - 0.45, D, D + 0.26, DOOR.z0 - 0.83 - dz, DOOR.z0 - 0.67 - dz); }
      {      // a pot of red geraniums (made here: the garden's own pots draw on its shared dice, and would move what is planted after them)
        const px = C.x0 - 0.7, pz = C.z0 + 0.55, k2 = 0.5;
        lathe(PAINT.terracotta, px, D, pz, [[0.01, 0], [0.62, 0], [0.7, 0.08], [0.86, 1.0], [0.96, 1.04], [0.97, 1.2], [0.88, 1.22], [0.84, 1.1]].map(([r, h]) => [r * k2, h * k2]), 12);
        for (const [dx, dy, dz, c, r] of [[0, 0.9, 0, 'c#4f6b38/1', 0.3], [0.16, 0.78, 0.12, 'c#58753e/1', 0.24], [-0.15, 0.82, -0.1, 'c#4a6534/1', 0.25], [0.05, 1.14, 0.08, 'c#c8323a/0.9', 0.12], [-0.13, 1.05, 0.14, 'c#d43a44/0.9', 0.1], [0.18, 1.02, -0.11, 'c#c02c36/0.9', 0.11]]) sphere(c, px + dx, D + dy, pz + dz, r, 0.8, 0);
        collide(px - 0.4, px + 0.4, pz - 0.4, pz + 0.4, LOW, D);
      }
      lantern(C.x0 - 0.5, D + 5.55, ROUND.z, C.x0, ROUND.z);
    }
    // the doors: casings and thresholds; the green Dutch door's halves swung out, the east door swung out on the balcony
    {
      const H = D + DOOR.h, W2 = DOOR.z1 - DOOR.z0 - 0.04;
      for (const [xa, xb] of [[C.x0 - 0.06, C.x0 + T1 + 0.04], [C.x1 - T1 - 0.04, C.x1 + 0.06]]) {
        box(TRIM, xa, xb, D + 0.005, H + 0.2, DOOR.z0 - 0.22, DOOR.z0 + 0.02); box(TRIM, xa, xb, D + 0.005, H + 0.2, DOOR.z1 - 0.02, DOOR.z1 + 0.22);
        box(TRIM, xa, xb, H - 0.03, H + 0.2, DOOR.z0 - 0.22, DOOR.z1 + 0.22); box(TRIM, xa + 0.04, xb - 0.04, D, D + 0.05, DOOR.z0, DOOR.z1);
      }
      // a leaf hinged at (hx, hz); shut, it runs toward sz*z; it opens ang toward sx*x
      const leaf = (hx, hz, sx, sz, ang, y0, y1, top, mat) => {
        const d = [sx * Math.sin(ang), sz * Math.cos(ang)], rot = [0, Math.atan2(-d[1], d[0]) + Math.PI / 2, 0];
        const at = (along, half, ya, yb, th, m) => { const x = hx + d[0] * along, z = hz + d[1] * along; box(m, x - th, x + th, ya, yb, z - half, z + half, { rot }); };
        at(W2 / 2, W2 / 2, y0, y1, 0.075, mat);
        at(W2 / 2, W2 / 2 - 0.1, y0 + 0.15, y0 + 0.4, 0.11, mat); at(W2 / 2, W2 / 2 - 0.1, y1 - 0.4, y1 - 0.15, 0.11, mat);
        if (top) { at(W2 / 2, 0.5, y0 + 0.8, y0 + 2.1, 0.085, GLASS); at(W2 / 2, 0.03, y0 + 0.8, y0 + 2.1, 0.1, mat); }
        at(0.35, 0.3, y0 + 0.5, y0 + 0.58, 0.1, IRON); at(0.35, 0.3, y1 - 0.58, y1 - 0.5, 0.1, IRON);
        at(W2 - 0.2, 0.05, y0 + (top ? 0.3 : 2.4), y0 + (top ? 0.4 : 2.5), 0.14, BRASS);
      };
      leaf(C.x0 - 0.06, DOOR.z1 - 0.02, -1, -1, 2.18, D + 0.04, D + 2.95, false, DOORPAINT); leaf(C.x0 - 0.06, DOOR.z1 - 0.02, -1, -1, 1.92, D + 3.0, H - 0.04, true, DOORPAINT);
      collide(C.x0 - 2.0, C.x0, DOOR.z1, DOOR.z1 + 1.3, D + 6.0, D);
      leaf(C.x1 + 0.06, DOOR.z0 + 0.02, 1, 1, 2.85, D + 0.04, H - 0.04, false, 'c#7a5a3e/0.85');
      collide(C.x1, C.x1 + 0.7, DOOR.z0 - 2.05, DOOR.z0, D + 6.0, D);
    }
    // the windows: the seat's casements standing open, and the round casement swung open on its hinge
    {
      const casement = (hx, hz, ang, w, y0, y1, sign) => {
        const dir = [Math.cos(ang) * sign[0] - Math.sin(ang) * sign[1], -Math.sin(ang) * sign[0] - Math.cos(ang) * sign[1]];
        const at = (al, half, ya, yb, th, mat) => { const x = hx + dir[0] * al, z = hz + dir[1] * al; box(mat, x - half, x + half, ya, yb, z - th, z + th, { rot: [0, Math.atan2(-dir[1], dir[0]), 0] }); };
        at(w / 2, w / 2, y0, y0 + 0.14, 0.06, TRIM); at(w / 2, w / 2, y1 - 0.14, y1, 0.06, TRIM); at(0.07, 0.07, y0, y1, 0.06, TRIM); at(w - 0.07, 0.07, y0, y1, 0.06, TRIM);
        at(w / 2, w / 2 - 0.14, y0 + 0.14, y1 - 0.14, 0.02, GLASS); at(w / 2, 0.025, y0 + 0.14, y1 - 0.14, 0.04, TRIM);
      };
      const w = SEATWIN, zo = C.z0;
      box(TRIM, w.x0 - 0.2, w.x1 + 0.2, w.y0 - 0.16, w.y0 + 0.02, zo - 0.22, zo + T1 + 0.05); box(TRIM, w.x0 - 0.25, w.x1 + 0.25, w.y1, w.y1 + 0.2, zo - 0.08, zo + T1 + 0.02);
      for (const x of [w.x0 - 0.12, w.x1 + 0.12, (w.x0 + w.x1) / 2]) box(TRIM, x - 0.1, x + 0.1, w.y0, w.y1, zo - 0.06, zo + T1 + 0.02);
      const half = (w.x1 - w.x0) / 2 - 0.12;
      casement(w.x0, zo - 0.04, 1.92, half, w.y0, w.y1, [1, 0]); casement(w.x1, zo - 0.04, -1.92, half, w.y0, w.y1, [-1, 0]);
      const ring = (r0, r1, depth) => { const sh = new THREE.Shape().absarc(0, 0, r1, 0, Math.PI * 2, false); sh.holes.push(new THREE.Path().absarc(0, 0, r0, 0, Math.PI * 2, true)); return new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false, curveSegments: 20 }); };
      const onWall = (g, x) => { g.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-1, 0, 0)).setPosition(TX + x, ROUND.y, TZ + ROUND.z)); return g; };
      put(TRIM, onWall(ring(ROUND.r + 0.02, ROUND.r + 0.26, 0.12), C.x0 + 0.04)); put(TRIM, onWall(ring(ROUND.r + 0.02, ROUND.r + 0.12, T1 - 0.05), C.x0 + T1 + 0.03));
      // the casement: a plain round sash of timber with its glass, hinged on its south side, swung out flat-ish against the wall
      const sash = [ring(ROUND.r - 0.08, ROUND.r - 0.0, 0.08), new THREE.CircleGeometry(ROUND.r - 0.06, 20)], mats = [TRIM, GLASS];
      sash.forEach((g, i) => { g.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-1, 0, 0))); g.translate(0, 0, ROUND.r); g.rotateY(-1.85); g.translate(TX + C.x0 - 0.06, ROUND.y, TZ + ROUND.z - ROUND.r); put(mats[i], g); });
    }
  }

  // ---- inside the cabin -------------------------------------------------------------------------------------------
  {
    const C = CAB, ix0 = C.x0 + 0.32, ix1 = C.x1 - 0.32, iz0 = C.z0 + 0.32, iz1 = C.z1 - 0.32;
    // the lining's boards and the frame behind them: a fine joint every 0.5 ft, a few studs and the corner posts
    {
      const J = 'c#8a6c4c/0.9', gaps = (a0, a1, cuts) => { const out = []; let at = a0; for (const [c0, c1] of cuts.sort((p, q) => p[0] - q[0])) { if (c0 > at) out.push([at, c0]); at = Math.max(at, c1); } if (a1 > at) out.push([at, a1]); return out.filter(([a, b]) => b - a > 0.05); };
      for (let y = D + 0.5; y < C.plate - 0.5; y += 0.5) {
        for (const [zw, s, cut] of [[iz0, 1, y > SEATWIN.y0 - 0.2 && y < SEATWIN.y1 + 0.2 ? [[SEATWIN.x0 - 0.25, SEATWIN.x1 + 0.25]] : []], [iz1, -1, []]]) for (const [a, b] of gaps(ix0, ix1, cut)) sheet.paint(J, quad([TX + (a + b) / 2, y, TZ + zw + s * 0.022], [s, 0, 0], [0, 1, 0], b - a, 0.026));
        const dr = y < D + DOOR.h + 0.25 ? [[DOOR.z0 - 0.25, DOOR.z1 + 0.25]] : [], q = ROUND.r + 0.3, ro = Math.abs(y - ROUND.y) < q ? [[ROUND.z - Math.sqrt(q * q - (y - ROUND.y) ** 2), ROUND.z + Math.sqrt(q * q - (y - ROUND.y) ** 2)]] : [];
        for (const [xw, s, cuts] of [[ix0, 1, [...dr, ...ro]], [ix1, -1, dr]]) for (const [a, b] of gaps(iz0, iz1, cuts)) sheet.paint(J, quad([TX + xw + s * 0.022, y, TZ + (a + b) / 2], [0, 0, -s], [0, 1, 0], b - a, 0.026));
      }
      const ST = 'c#7a5c3e/0.9', h = C.plate - 0.45 - D, yc = D + h / 2;
      for (const x of [ix0 + 0.12, ix1 - 0.12, 4.05, 6.25]) sheet.paint(ST, quad([TX + x, yc, TZ + iz1 - 0.03], [-1, 0, 0], [0, 1, 0], 0.24, h));
      for (const x of [ix0 + 0.12, ix1 - 0.12, SEATWIN.x0 - 0.35]) sheet.paint(ST, quad([TX + x, yc, TZ + iz0 + 0.03], [1, 0, 0], [0, 1, 0], 0.24, h));
      for (const [xw, s] of [[ix0, 1], [ix1, -1]]) for (const z of [iz0 + 0.12, iz1 - 0.12]) sheet.paint(ST, quad([TX + xw + s * 0.03, yc, TZ + z], [0, 0, -s], [0, 1, 0], 0.24, h));
    }
    // the window seat along the south wall, under the casements: a cushion, two pillows, the books, the tin, the blanket
    const sx0 = 3.0, sz1 = iz0 + 1.5, sy = D + 1.55;
    box('c#7a5a3e/0.85', sx0, ix1, sy - 0.15, sy, iz0, sz1);
    box('c#6a4c32/0.9', sx0 + 0.1, ix1 - 0.02, D, sy - 0.15, sz1 - 0.12, sz1); box('c#6a4c32/0.9', sx0, sx0 + 0.12, D, sy, iz0, sz1);
    box('c#6f8a7a/1', sx0 + 0.15, ix1 - 0.05, sy, sy + 0.28, iz0 + 0.05, sz1 - 0.08);
    for (const [x, col, tilt, wd] of [[4.3, 'c#c9a44a/1', 0.3, 0.55], [5.25, 'c#a8584a/1', 0.36, 0.45]]) {      // plump pillows, leaning back against the wall
      const g = new THREE.BoxGeometry(2 * wd, 1.0, 0.34, 5, 5, 1), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const u = p.getX(i) / wd, v = p.getY(i) / 0.5; p.setXYZ(i, p.getX(i) * (1 - 0.1 * v * v), p.getY(i) * (1 - 0.1 * u * u), p.getZ(i) * (1 - 0.8 * u ** 4) * (1 - 0.8 * v ** 4)); }
      g.computeVertexNormals(); g.rotateX(-tilt); g.translate(TX + x, sy + 0.8, TZ + iz0 + 0.4); put(col, g);
    }
    collide(sx0, ix1, iz0, sz1, LOW, D);
    K.seat(TX + 4.8, sy + 0.25, TZ + iz0 + 0.9, 0, 'sit in the window seat');
    {
      let y = sy + 0.28; const bx = 3.5, zc = sz1 - 0.35;
      BOOKS.slice(0, 6).forEach((b, i) => {
        const d = 0.6 + ((i * 37) % 7) * 0.03, w = 0.42 + ((i * 53) % 5) * 0.025, th = 0.07 + ((i * 29) % 4) * 0.016, dx = ((i * 41) % 5 - 2) * 0.02, dz = ((i * 17) % 5 - 2) * 0.018;
        const z0 = zc - w / 2 + dz, z1 = zc + w / 2 + dz;
        box('c#' + b[3].slice(1) + '/0.9', bx + dx - d / 2, bx + dx + d / 2, y, y + th, z0, z1);
        box('c#efe8d8/0.9', bx + dx - d / 2 - 0.006, bx + dx + d / 2 + 0.006, y + 0.014, y + th - 0.014, z0 - 0.006, z1 - 0.04);
        print([RECT.books[0], RECT.books[1] + i * 16, 256, 16], [bx + dx, y + th / 2, z1 + 0.004], [1, 0, 0], [0, 1, 0], d, th);
        y += th + 0.004;
      });
      T.books = { x: TX + bx, y, z: TZ + zc };
      const tx = 4.35, tz = zc + 0.05;
      cyl('c#1f3a5f/0.4', tx, sy + 0.28, sy + 0.45, tz, 0.27, 0.27, 16); cyl('c#c9a24a/0.4', tx, sy + 0.45, sy + 0.5, tz, 0.285, 0.285, 16);
      const lid = new THREE.CircleGeometry(0.27, 16); lid.rotateX(-Math.PI / 2); lid.translate(TX + tx, sy + 0.502, TZ + tz); sheet.print(lid, RECT.tin);
      T.tin = { x: TX + tx, y: sy + 0.48, z: TZ + tz };
      box('c#8c3b2e/1', 5.85, ix1 - 0.08, sy + 0.28, sy + 0.5, iz0 + 0.1, iz0 + 1.15);
      box('c#d9c79f/1', 5.84, ix1 - 0.07, sy + 0.37, sy + 0.395, iz0 + 0.09, iz0 + 1.16);
      box('c#8c3b2e/1', 5.95, ix1 - 0.15, sy - 0.7, sy + 0.3, sz1 + 0.01, sz1 + 0.07, { rot: [0.08, 0, 0] });
    }
    // the lantern from the ridge
    {
      const x = 4.2, y = R - 1.75, z = ZC;
      tube(IRON, [x, R - 0.95, z], [x, y + 0.75, z], 0.015, 3, false); lantern(x, y, z, x, z);
      K.lamp(TX + x, y + 0.2, TZ + z, 0.3, 'lamp');
    }
    // a shelf with a jar of pencils, a toy boat and a pine cone; a yellow jacket on its hook by the door; a string of paper flags
    {
      const y = D + 5.0, z0 = iz1 - 0.45;
      box('c#8a6a4a/0.85', 4.35, 6.3, y - 0.07, y, z0, iz1 - 0.01);
      for (const x of [4.6, 6.05]) box('c#6a4c32/0.9', x - 0.05, x + 0.05, y - 0.45, y - 0.07, iz1 - 0.35, iz1 - 0.01);
      lathe('c#9fb7b0/0.2', 4.65, y, z0 + 0.22, [[0.01, 0], [0.12, 0], [0.12, 0.32], [0.1, 0.33]], 8);
      for (const [dx, c] of [[-0.04, 'c#c0392b/0.8'], [0.03, 'c#2f6f8f/0.8'], [0.0, 'c#e3b23c/0.8']]) tube(c, [4.65 + dx, y + 0.1, z0 + 0.22 + dx], [4.65 + dx * 2, y + 0.55, z0 + 0.2 + dx], 0.018, 4, false);
      box('c#b0302a/0.6', 5.1, 5.75, y, y + 0.16, z0 + 0.12, z0 + 0.32); box('c#efe6cf/0.8', 5.12, 5.73, y + 0.16, y + 0.2, z0 + 0.14, z0 + 0.3);
      const sail = new THREE.BufferGeometry(); sail.setAttribute('position', new THREE.Float32BufferAttribute([TX + 5.4, y + 0.22, TZ + z0 + 0.22, TX + 5.4, y + 0.75, TZ + z0 + 0.22, TX + 5.72, y + 0.22, TZ + z0 + 0.22], 3)); sail.computeVertexNormals(); sheet.paint('c#efe6cf/0.9', sail);
      tube('c#5a3a24/0.8', [5.4, y + 0.18, z0 + 0.22], [5.4, y + 0.8, z0 + 0.22], 0.015, 4, false);
      sphere('c#7a5a34/1', 6.05, y + 0.14, z0 + 0.22, 0.13, 1.3, 0);
      // the jacket
      const hz = iz1 - 0.38, hx = ix0;
      tube(IRON, [hx, D + 5.1, hz], [hx + 0.22, D + 5.15, hz], 0.025, 5, false);
      box('c#c9a032/0.95', hx + 0.06, hx + 0.24, D + 3.3, D + 5.0, hz - 0.33, hz + 0.33, { rot: [0.04, 0, 0.05] });
      for (const s of [-1, 1]) box('c#b8922a/0.95', hx + 0.08, hx + 0.22, D + 3.55, D + 4.85, hz + s * 0.36 - 0.07, hz + s * 0.36 + 0.07, { rot: [s * 0.08, 0, 0] });
      sphere('c#c9a032/0.95', hx + 0.2, D + 5.05, hz, 0.2, 0.7, 0);
      // paper flags, strung along the north wall over the map and the shelf
      const a = [ix0 + 0.1, D + 6.1, iz1 - 0.08], b = [ix1 - 0.1, D + 6.1, iz1 - 0.08], pts = sagged(a, b, 0.3, 12), cols = ['c#c0392b/1', 'c#e3b23c/1', 'c#2f6f8f/1', 'c#6f8a4a/1', 'c#e8dcc0/1'];
      rope('c#e8dcc0/1', pts, 0.008, 3);
      for (let i = 1; i < pts.length; i++) { const p = pts[i - 1], q = pts[i], g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([TX + p[0] + 0.03, p[1], TZ + p[2], TX + q[0] - 0.03, q[1], TZ + q[2], TX + (p[0] + q[0]) / 2, (p[1] + q[1]) / 2 - 0.32, TZ + p[2] - 0.01], 3)); g.computeVertexNormals(); sheet.paint(cols[i % cols.length], g); }
    }
    // the rug, the map and the drawings, pinned up
    {
      for (const [r, y, col] of [[1.2, D + 0.03, 'c#7a4a3a/1'], [0.85, D + 0.045, 'c#c9a46a/1'], [0.45, D + 0.06, 'c#5a6a4a/1']]) { const g = new THREE.CylinderGeometry(r, r, 0.04, 24); g.scale(1.2, 1, 0.7); g.translate(TX + 4.3, y, TZ + (DOOR.z0 + DOOR.z1) / 2 + 0.1); put(col, g); }
      const N = iz1 - 0.035, E = ix1 - 0.035, tack = (x, y, z, c) => sphere(c, x, y, z, 0.035, 1, 0, true);
      print(RECT.map, [3.0, D + 3.95, N], [-1, 0, 0], [0, 1, 0], 1.75, 1.75);
      for (const [dx, dy] of [[-0.82, 0.82], [0.82, 0.82], [-0.82, -0.82], [0.82, -0.82]]) tack(3.0 + dx, D + 3.95 + dy, N - 0.02, 'c#b3261e/0.5');
      print(RECT.d1, [5.3, D + 3.9, N], [-1, 0, 0], [0, 1, 0], 0.8, 0.8); tack(5.3, D + 4.26, N - 0.02, 'c#2f6f8f/0.5');
      print(RECT.d2, [E, D + 4.3, -7.4], [0, 0, 1], [0, 1, 0], 0.65, 0.65); tack(E - 0.02, D + 4.58, -7.4, 'c#e3b23c/0.5');
      print(RECT.d3, [E, D + 4.3, -3.82], [0, 0, 1], [0, 1, 0], 0.5, 0.5); tack(E - 0.02, D + 4.52, -3.82, 'c#b3261e/0.5');
      T.map = { x: TX + 3.0, y: D + 3.95, z: TZ + N - 0.2 };
    }
    // the telescope at the round window, trained on the house
    {
      const [ex, ey, ez] = SCOPE.e, [dx, dy, dz] = SCOPE.d, o = [ex + dx * 2.2, ey + dy * 2.2, ez + dz * 2.2];
      tube(BRASS, [ex, ey, ez], [ex + dx * 1.15, ey + dy * 1.15, ez + dz * 1.15], 0.075, 10, false);
      tube(BRASS, [ex + dx * 1.1, ey + dy * 1.1, ez + dz * 1.1], o, 0.1, 10, false);
      for (const t of [0.05, 1.12, 2.15]) { const p = [ex + dx * t, ey + dy * t, ez + dz * t]; tube('c#3a2a1a/0.6', [p[0] - dx * 0.05, p[1], p[2] - dz * 0.05], [p[0] + dx * 0.05, p[1], p[2] + dz * 0.05], t > 2 ? 0.12 : t > 1 ? 0.11 : 0.09, 10, false); }
      const m = [ex + dx * 0.5, ey + dy * 0.5 - 0.12, ez + dz * 0.5];
      for (const ang of [0.2, 2.3, 4.4]) beam('c#6a4a2e/0.8', m, [m[0] + Math.cos(ang) * 0.5, D + 0.02, m[2] + Math.sin(ang) * 0.5], 0.06, 0.06);
      collide(m[0] - 0.45, m[0] + 0.45, m[2] - 0.45, m[2] + 0.45, D + 4, D);
      T.scope = { x: TX + ex - dx * 0.35, y: ey + 0.06, z: TZ + ez - dz * 0.35, yaw: Math.atan2(-dx, -dz), at: [TX + ex, ey, TZ + ez] };
    }
  }

  // ---- the lights: jar lanterns on two posts, one short string of bulbs under the south eave --------------------------
  for (const [x, y, z] of jars) {
    const g = new THREE.LatheGeometry([[0.01, 0], [0.14, 0.03], [0.14, 0.38], [0.1, 0.46], [0.01, 0.48]].map(([r, h]) => new THREE.Vector2(r, h)), 8); g.translate(TX + x, y + 0.02, TZ + z); glow(g);
    cyl(BRASS, x, y + 0.48, y + 0.54, z, 0.105, 0.105, 8);
  }
  {
    const ze = ZC - HE + 0.1, y = roofY(ze) - 0.3, pts = sagged([RX0 + 0.35, y, ze], [RX1 - 0.35, y, ze], 0.25, 16);
    rope(CABLE, pts, 0.012, 3);
    for (let i = 1; i < pts.length - 1; i += 2) { const g = new THREE.SphereGeometry(0.13, 8, 5); g.scale(1, 1.2, 1); g.translate(TX + pts[i][0], pts[i][1] - 0.2, TZ + pts[i][2]); glow(g); }
  }

  // ---- the net, slung beside the balcony from a spar hung off the great limb ------------------------------------------
  {
    const N = NET, P = (s, t) => [TX + N.x0 + (N.x1 - N.x0) * s, D - 0.25 - N.sag * Math.pow(Math.sin(Math.PI * s), 0.7) * Math.pow(Math.sin(Math.PI * t), 0.7), TZ + N.z0 + (N.z1 - N.z0) * t];
    sheet.print(netPatch(P, N.x1 - N.x0, N.z1 - N.z0, 0.9), RECT.net, 1);
    const edge = (f, n = 8) => Array.from({ length: n + 1 }, (_, i) => { const p = f(i / n); return [p[0] - TX, p[1], p[2] - TZ]; });
    for (const f of [s => P(s, 0), s => P(s, 1), t => P(0, t), t => P(1, t)]) rope(ROPE, edge(f), 0.055, 5);
    const sz = N.z1 + 0.25, l3 = limbs.filter(q => q.depth === 1).reduce((a, q) => (q.b.x > a.b.x ? q : a)), kid = limbs.filter(q => q.depth === 2 && q.b.x > 10 && q.b.z > 0)[0] ?? l3;
    const under = (l, x) => { const t = THREE.MathUtils.clamp((x - l.a.x) / (l.b.x - l.a.x), 0, 1), p = l.a.clone().lerp(l.b, t); return [p.x, p.y - (l.r0 + (l.r1 - l.r0) * t) * 0.85, p.z]; };
    beam(CEDAR2, [N.x0 - 0.3, D - 0.3, sz], [N.x1 + 0.3, D - 0.3, sz], 0.26, 0.26);
    for (const [x, l] of [[N.x0 - 0.15, l3], [N.x1 + 0.15, kid]]) { const q = under(l, x); rope(ROPE, [[x, D - 0.18, sz], q], 0.05, 4); }
  }

  // ---- the swing on its long ropes from the far limb ---------------------------------------------------------------
  {
    const west = limbs.filter(l => l.depth === 2).reduce((a, l) => (l.b.x < a.b.x ? l : a));
    const hang = west.a.clone().lerp(west.b, 0.94); hang.y -= (west.r0 + (west.r1 - west.r0) * 0.94) * 0.9;
    T.swing = { x: TX + hang.x, top: hang.y, z: TZ + hang.z, len: hang.y - 2.25 };
    K.G.blob('soil', TX + hang.x, TZ + hang.z, 1.4, 3.8, { wobble: 0.3, y: 0.06 });
    const L = T.swing.len, P = (mat, g) => prep(g, paintColour(mat), null), pieces = [];
    const Cy = (mat, r, h, x, y) => { const g = new THREE.CylinderGeometry(r, r, h, 5, 1, true); g.translate(x, y + h / 2, 0); return P(mat, g); };
    const Bx = (mat, w, h, d, x, y, z) => { const g = new THREE.BoxGeometry(w, h, d); g.translate(x, y, z); return P(mat, g); };
    for (const dx of [-0.85, 0.85]) { pieces.push(Cy(ROPE, 0.045, L - 0.2, dx, -L + 0.15)); const g = new THREE.IcosahedronGeometry(0.1, 0); g.scale(1, 1.4, 1); g.translate(dx, -L + 0.35, 0); pieces.push(P('c#9a865e/1', g)); }
    pieces.push(Bx('c#9a7a57/0.85', 2.1, 0.14, 0.75, 0, -L, 0), Bx('c#87694a/0.9', 2.2, 0.06, 0.12, 0, -L - 0.09, 0.25), Bx('c#87694a/0.9', 2.2, 0.06, 0.12, 0, -L - 0.09, -0.25));
    T.parts.swing = T.movers.part(pieces);
  }
}

// ---- built once materials exist, and the swing and the stair's pace ---------------------------------------------------
export function treehouseLife(ctx, K) {
  try { life(ctx, K); } catch (e) { console.warn('treehouse: not set going', e); }
}
function life(ctx, K) {
  const T = K.treehouse; if (!T) return;
  const { scene, animated, interact, camera } = ctx, T3 = THREE;
  const outline = T.outline ?? (() => 100);
  const canvas = drawSheet({ outline: a => outline(a) * 1.04, cx: T.island?.x ?? -5, cz: T.island?.z ?? -24, trees: K.trees, pond: POND, pot: POT, play: PLAY, chapel: CHAPEL, here: { x: TX, z: TZ } });
  const tex = new T3.CanvasTexture(canvas); tex.colorSpace = T3.SRGBColorSpace; tex.anisotropy = 4;
  const glowTex = new T3.CanvasTexture(drawGlow()); glowTex.colorSpace = T3.SRGBColorSpace; glowTex.magFilter = glowTex.minFilter = T3.NearestFilter; glowTex.generateMipmaps = false;
  const mat = new T3.MeshStandardMaterial({ map: tex, vertexColors: true, roughness: 0.85, side: T3.DoubleSide, alphaTest: 0.45, envMapIntensity: 0.6, emissive: 0xffffff, emissiveMap: glowTex, emissiveIntensity: 0.3 });
  // one mesh: everything printed, roped, netted or lit, and the swing at the end of it (the only part that moves)
  const C = new T3.Vector3(TX - 4, 14, TZ - 2), mesh = T.movers.build(mat, T.sheet.build(), C, 34);
  mesh.name = 'treehouse'; mesh.receiveShadow = true; scene.add(mesh);
  const toast = s => window.houseUI?.toast?.(s), xyz = (x, y, z) => ({ x: TX + x, y, z: TZ + z });

  // the books, the tin, the map
  let book = 0;
  interact.push({ x: T.books.x, y: T.books.y, z: T.books.z, reach: 5, size: 0.6, label: () => `take a book from the stack (<i>${BOOKS[book % 6][0]}</i>)`, act: () => {
    const b = BOOKS[book++ % 6], rec = { title: b[0], author: b[1], year: b[2], colour: b[3], shelf: 'children', size: 'small' }, h = window.__hands;
    if (h?.takeDown) h.takeDown(rec).catch?.(() => toast(`${rec.title}, by ${rec.author}`)); else toast(`${rec.title}, by ${rec.author} (${rec.year})`);
  } });
  const BISCUITS = ['Shortbread, still crisp. Somebody keeps this tin filled.', 'Another one. Nobody is counting.', 'The last one with the sugar on top. Worth it.'];
  let bis = 0; interact.push({ x: T.tin.x, y: T.tin.y, z: T.tin.z, reach: 5, size: 0.5, label: () => 'have a biscuit', act: () => toast(BISCUITS[bis++ % BISCUITS.length]) });
  interact.push({ x: T.map.x, y: T.map.y, z: T.map.z, reach: 5, size: 1.1, label: () => 'look at the map', act: () => toast('A map of the island, drawn by hand and pinned up crooked. X marks the treehouse.') });
  // the telescope: sit at the eyepiece and the view closes in on the house
  const scopeSeat = { x: T.scope.x, y: T.scope.y, z: T.scope.z, yaw: T.scope.yaw, label: 'look through the telescope' };
  interact.push({ x: T.scope.at[0], y: T.scope.at[1], z: T.scope.at[2], reach: 5, size: 0.6, seat: scopeSeat, label: () => 'look through the telescope' });
  let scopeOn = false, fov0 = 56, look0 = 1;
  // the net: lie in it face down and look through it at the sky below
  const nz = (NET.z0 + NET.z1) / 2, netSeat = { ...xyz((NET.x0 + NET.x1) / 2, D - 0.65, nz), yaw: -Math.PI / 2 + 0.25, label: 'lie in the net' };
  interact.push({ ...xyz((NET.x0 + NET.x1) / 2 - 0.4, D - 0.3, nz - 0.7), reach: 6.5, size: 2.0, seat: netSeat, label: () => 'lie in the net and look down' });
  let inNet = false;
  // the swing
  const sw = T.swing, swingSeat = { x: sw.x, y: 4.7, z: sw.z, yaw: 0, label: 'swing' };
  interact.push({ x: sw.x, y: 2.6, z: sw.z, reach: 6, seat: swingSeat, label: () => 'sit on the rope swing' });
  ctx.colliders.push({ x0: sw.x - 1.2, x1: sw.x + 1.2, z0: sw.z - 0.6, z1: sw.z + 0.6, y0: 0, y1: 3 });
  let swAmp = 0.03, swPh = 0;
  const m4 = new T3.Matrix4(), q = new T3.Quaternion(), e = new T3.Euler(), one = new T3.Vector3(1, 1, 1), p3 = new T3.Vector3();
  // the stair: a climb, not a glide (whoever is on it moves along it no faster than CLIMB)
  const S = T.stair, onStair = p => p.x > TX + S.x0 - 0.1 && p.x < TX + S.x1 + 0.1 && p.z > TZ + S.z0 && p.z < TZ + S.z1 && p.y > 0.25 && p.y < D - 0.05;
  const was = new T3.Vector3(); let wasOn = false;
  const day = ctx.day;
  animated.push((t, dt) => {
    const w = ctx.walker;
    mat.emissiveIntensity = 0.25 + 1.9 * (day?.night ?? 0) + 0.4 * (1 - (day?.light ?? 1)) * (1 - (day?.night ?? 0));      // lit as the garden's own bulbs are
    if (w && !w.seated) {
      const on = onStair(w.pos);
      if (on && wasOn) {
        const dz = w.pos.z - was.z, max = CLIMB * dt;
        if (Math.abs(dz) > max) { w.pos.z = was.z + Math.sign(dz) * max; w.pos.x = was.x + (w.pos.x - was.x) * max / Math.abs(dz); w.pos.y = 0.05 + (D - 0.05) * (w.pos.z - (TZ + S.z0)) / (S.z1 - S.z0); w.apply(); }
      }
      was.copy(w.pos); wasOn = on;
    }
    if (camera.position.distanceToSquared(C) > 140 * 140) return;
    // the swing
    const on = w?.seated === swingSeat;
    swAmp += ((on ? 0.34 : 0.018) - swAmp) * Math.min(1, dt * (on ? 0.3 : 0.5)); swPh += dt * Math.sqrt(32 / sw.len);
    const a = swAmp * Math.sin(swPh);
    e.set(a, 0, 0, 'YXZ'); q.setFromEuler(e); m4.compose(p3.set(sw.x, sw.top, sw.z), q, one); T.movers.set(T.parts.swing, m4);
    swingSeat.z = sw.z - sw.len * Math.sin(a); swingSeat.y = sw.top - sw.len * Math.cos(a) + 2.55;
    // the telescope and the net change how you look while you are in them
    const scoping = w?.seated === scopeSeat;
    if (scoping !== scopeOn) {
      if (scoping) { fov0 = camera.fov; look0 = w.lookScale ?? 1; camera.fov = 9; w.lookScale = 0.18; } else { camera.fov = fov0; w.lookScale = look0; }
      camera.updateProjectionMatrix(); scopeOn = scoping;
    }
    const netting = w?.seated === netSeat;
    if (netting && !inNet) w.pitch = -1.25;
    inNet = netting;
  });
  T.state = () => ({ swing: swAmp });
}
