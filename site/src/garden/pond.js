// The koi pond, south of the terrace. A dug, stone-edged ornamental pond kept
// by someone who loves it: clear water over a pebbled shelf and a dark deep
// middle, twenty koi, water lilies, iris and rushes in clumps at the back and
// the ends, open banks of flat stones where people stand, an arched timber
// bridge with proper rails, a snow-viewing lantern, a bamboo spout, a warm
// stone and a bench to sit on. Two ducks nobody invited, and the frog.
//
//   pond_shape.js   where the water is and how deep (plain numbers)
//   koi_school.js   how the fish swim, feed and beg (plain numbers; tested with node)
//   koi.js          the fish, drawn: one instanced mesh
//   pond_water.js   the surface, and the look of things under water
//
// Test hooks (in the style of ?toy=): ?pondt=40 runs the pond forward 40 s before the first frame;
// ?pondfeed=8 scatters food 8 s before that moment (pondfeed=8@bridge from the bridge);
// ?pondstand=x,z has the visitor stand there all that while; ?pondfreeze holds everything still.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PAINT, GLOW_WARM } from './tools.js';
import { rng } from './cards.js';
import { POND, at, outline, spanAt, sAt, depthAt, BRIDGE, BOULDERS } from './pond_shape.js';
import { makeSchool, CAST } from './koi_school.js';
import { makeKoi } from './koi.js';
import { U, basinSheet, basinMesh, waterMesh } from './pond_water.js';

export { POND };
let sheet = null;                         // the basin's geometry, gathered during layout and built in pondLife()
const WOOD = ['c#b3a085/1', 'c#bcab90/1', 'c#a8957a/1', 'c#b0a089/1'], POST = 'c#9a8770/1', PEG = 'c#2b2521/0.8', GRANITE = 'c#99958b/1', BAMBOO = 'c#9aa062/0.8';
const deckH = z => BRIDGE.base + BRIDGE.rise * Math.sin(Math.PI * THREE.MathUtils.clamp((z - BRIDGE.z0) / (BRIDGE.z1 - BRIDGE.z0), 0, 1));
const SPOUT = at(3.05, 0.74);              // where the bamboo spout's water lands
const FROG = at(0.3, 0.7);
// Where food can be thrown from: where to look (x, y, z), how far away you may stand, where it lands
const FEED = [
  { p: [...at(0.7, 0.88), 0.4], reach: 10, to: at(0.62, 0.56) }, { p: [...at(1.95, 0.9), 0.4], reach: 10, to: at(1.95, 0.6) }, { p: [...at(-0.12, 0.9), 0.4], reach: 10, to: at(-0.12, 0.62) },
  { p: [BRIDGE.x - 2.6, POND.z + 2, 3.2], reach: 6, to: [BRIDGE.x - 5.5, POND.z + 2] }, { p: [BRIDGE.x + 2.6, POND.z + 2, 3.2], reach: 6, to: [BRIDGE.x + 5.5, POND.z + 1] },
];
let school = null, clock = 0;
// Scatter food on the pond near (x, z): for anyone else who feeds the koi (the gardeners)
export function feedKoi(x = FEED[0].to[0], z = FEED[0].to[1]) { school?.feed(x, z, clock); }

// ---- things added to the basin's one mesh: positions, colours, [pebbles, sway] ----
const V = new THREE.Vector3();
function tri(a, b, c, ca, cb = ca, cc = ca, peb = 0, sa = 0, sb = sa, sc = sa) { sheet.pos.push(...a, ...b, ...c); sheet.col.push(...ca, ...cb, ...cc); sheet.aux.push(peb, sa, peb, sb, peb, sc); }
const shade = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
// An old boulder standing in the water: grey above, mossy on top, dark and green below the waterline
function boulder(x, z, r, h, seed) {
  const g = new THREE.IcosahedronGeometry(1, 2), p = g.attributes.position, q = rng(seed * 131 + 7), ph = [q() * 6, q() * 6, q() * 6], rot = q() * 6.28;
  const cy = POND.y - 0.3, ry = h + 0.3, rxz = r / Math.sqrt(1 - (0.3 / ry) ** 2), cr = Math.cos(rot), sr = Math.sin(rot);
  const pt = i => {
    let px = p.getX(i), py = p.getY(i), pz = p.getZ(i);
    const k = 0.9 + 0.1 * Math.sin(px * 2.3 + ph[0]) * Math.cos(pz * 2.1 + ph[1]) + 0.07 * Math.sin(py * 3.7 + px * 1.3 + ph[2]) + 0.03 * Math.sin(px * 9 + pz * 7);
    px *= k * rxz * (1 + 0.15 * Math.sin(ph[0])); py = (py > 0 ? py * k : Math.max(-0.75, py * 1.6)) * ry; pz *= k * rxz * 0.88;
    return [x + px * cr - pz * sr, cy + py, z + px * sr + pz * cr];
  };
  const stone = [0.34 + q() * 0.05, 0.335, 0.31], moss = [0.17, 0.24, 0.08];
  const colour = v => { const up = (v[1] - POND.y) / h, wet = v[1] < POND.y + 0.08; return wet ? lerp3([0.12, 0.13, 0.09], [0.07, 0.1, 0.06], Math.min(1, (POND.y - v[1]) * 1.5)) : lerp3(stone, moss, THREE.MathUtils.smoothstep(up + 0.25 * Math.sin(v[0] * 3 + v[2] * 2.3), 0.5, 0.95) * 0.85); };
  for (let i = 0; i < p.count; i += 3) { const a = pt(i), b = pt(i + 1), c = pt(i + 2); tri(a, b, c, colour(a), colour(b), colour(c), 0.45); }
}
// A water-lily pad (a notched disc just clear of the water) and a flower (three rings of petals)
function pad(x, z, rad, rot, bronze = 0) {
  const y = POND.y + 0.045, n = 17, c0 = lerp3([0.075, 0.2, 0.06], [0.24, 0.15, 0.08], bronze), ctr = [x, y + 0.014, z], gap = 0.2;
  const rimPt = i => { const a = rot + gap + (i / (n - 1)) * (Math.PI * 2 - 2 * gap), w = rad * (1 + 0.04 * Math.sin(i * 2.4 + x)); return [x + Math.cos(a) * w, y + (i % 4 === 0 ? 0.012 : 0), z + Math.sin(a) * w]; };
  for (let i = 0; i < n - 1; i++) { const k0 = 0.78 + 0.12 * Math.sin(i * 1.9 + z), k1 = 0.78 + 0.12 * Math.sin((i + 1) * 1.9 + z); tri(ctr, rimPt(i + 1), rimPt(i), shade(c0, 1.3), shade(c0, k1), shade(c0, k0)); }
}
function lily(x, z, s, pink) {
  const y = POND.y + 0.06;
  for (const [n, len, tilt, wid, tone] of [[9, 0.44, 0.35, 0.13, 0], [7, 0.36, 0.85, 0.11, 0.5], [5, 0.25, 1.25, 0.09, 1]]) for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.283 + tilt * 2 + x, ca = Math.cos(a), sa = Math.sin(a), L = len * s, w = wid * s, r0 = 0.05 * s;
    const base = [x + ca * r0, y + tone * 0.04, z + sa * r0], mid = (k) => [x + ca * L * 0.55 * Math.cos(tilt) - sa * w * k, y + L * 0.55 * Math.sin(tilt) + 0.02, z + sa * L * 0.55 * Math.cos(tilt) + ca * w * k], tip = [x + ca * L * Math.cos(tilt), y + L * Math.sin(tilt), z + sa * L * Math.cos(tilt)];
    const cb = pink ? lerp3([0.9, 0.42, 0.55], [0.95, 0.6, 0.7], tone) : lerp3([0.93, 0.92, 0.84], [0.97, 0.95, 0.8], tone), ct = pink ? [0.97, 0.8, 0.86] : [0.98, 0.98, 0.95];
    tri(base, mid(-1), tip, cb, ct, ct); tri(base, tip, mid(1), cb, ct, ct);
  }
  const yc = y + 0.12 * s; for (let i = 0; i < 5; i++) { const a = i * 1.257, b = a + 1.257; tri([x, yc + 0.07 * s, z], [x + Math.cos(a) * 0.07 * s, yc, z + Math.sin(a) * 0.07 * s], [x + Math.cos(b) * 0.07 * s, yc, z + Math.sin(b) * 0.07 * s], [0.95, 0.72, 0.1]); }
}
// A sword-shaped leaf or a rush: a narrow tapering blade that leans out and bows a little
function blade(x, y, z, h, wid, lean, dir, c0, c1, sway) {
  const ca = Math.cos(dir), sa = Math.sin(dir), nx = -sa, nz = ca, segs = [0, 0.45, 0.8, 1], P = [];
  for (const t of segs) { const out = lean * h * t * t, w = wid * (1 - 0.85 * t * t) * 0.5; P.push([[x + ca * out - nx * w, y + h * t * (1 - 0.12 * lean * t), z + sa * out - nz * w], [x + ca * out + nx * w, y + h * t * (1 - 0.12 * lean * t), z + sa * out + nz * w], t]); }
  for (let i = 0; i < 3; i++) {
    const [a, b, t0] = P[i], [c, d, t1] = P[i + 1], k0 = lerp3(c0, c1, t0), k1 = lerp3(c0, c1, t1), s0 = sway * t0 * t0 * h, s1 = sway * t1 * t1 * h;
    if (i < 2) { tri(a, b, d, k0, k0, k1, 0, s0, s0, s1); tri(a, d, c, k0, k1, k1, 0, s0, s1, s1); } else tri(a, b, [(c[0] + d[0]) / 2, c[1], (c[2] + d[2]) / 2], k0, k0, k1, 0, s0, s0, s1);
  }
  return P[3][0];
}
function irisClump(x, z, q, { n = 12, h = 2.5, flowers = 3, hue = 0 } = {}) {
  const y = sAt(x, z) < 1 ? POND.y - 0.1 : POND.y + 0.05;
  for (let i = 0; i < n; i++) { const a = q() * 6.28, d = q() * 0.45; blade(x + Math.cos(a) * d, y, z + Math.sin(a) * d, h * (0.6 + q() * 0.45), 0.2, 0.1 + q() * 0.3, a, [0.1, 0.2, 0.07], [0.24, 0.36, 0.13], 0.012); }
  const cols = [[[0.33, 0.2, 0.62], [0.48, 0.36, 0.78]], [[0.93, 0.78, 0.15], [0.97, 0.88, 0.4]], [[0.9, 0.9, 0.93], [0.75, 0.72, 0.9]]][hue];
  for (let i = 0; i < flowers; i++) {
    const a = q() * 6.28, d = q() * 0.35, fx = x + Math.cos(a) * d, fz = z + Math.sin(a) * d, fh = h * (0.95 + q() * 0.2), top = [fx, y + fh, fz];
    blade(fx, y, fz, fh, 0.07, 0.02, a, [0.14, 0.26, 0.09], [0.2, 0.32, 0.12], 0.012);
    const sw = 0.012 * fh;
    for (let k = 0; k < 3; k++) {            // three falls drooping, three standards upright
      const b = a + k * 2.094, cb = Math.cos(b), sb = Math.sin(b), nx = -sb, nz = cb;
      const tipF = [fx + cb * 0.36, y + fh - 0.16, fz + sb * 0.36], mL = [fx + cb * 0.2 - nx * 0.11, y + fh + 0.03, fz + sb * 0.2 - nz * 0.11], mR = [fx + cb * 0.2 + nx * 0.11, y + fh + 0.03, fz + sb * 0.2 + nz * 0.11];
      tri(top, mL, tipF, [0.95, 0.85, 0.3], cols[0], cols[1], 0, sw); tri(top, tipF, mR, [0.95, 0.85, 0.3], cols[1], cols[0], 0, sw);
      const b2 = b + 1.047, c2 = Math.cos(b2), s2 = Math.sin(b2);
      tri(top, [fx + c2 * 0.1 - s2 * 0.07, y + fh + 0.17, fz + s2 * 0.1 + c2 * 0.07], [fx + c2 * 0.14, y + fh + 0.3, fz + s2 * 0.14], cols[0], cols[1], cols[1], 0, sw);
      tri(top, [fx + c2 * 0.14, y + fh + 0.3, fz + s2 * 0.14], [fx + c2 * 0.1 + s2 * 0.07, y + fh + 0.17, fz + s2 * 0.1 - c2 * 0.07], cols[0], cols[1], cols[1], 0, sw);
    }
  }
}
function rushClump(x, z, q, { n = 16, h = 4.6, tails = 3 } = {}) {
  const y = sAt(x, z) < 1 ? POND.y - 0.15 : POND.y + 0.05;
  for (let i = 0; i < n; i++) { const a = q() * 6.28, d = q() * 0.6; blade(x + Math.cos(a) * d, y, z + Math.sin(a) * d, h * (0.6 + q() * 0.5), 0.11, 0.05 + q() * 0.22, a, [0.11, 0.2, 0.08], [0.33, 0.42, 0.17], 0.01); }
  for (let i = 0; i < tails; i++) {           // reedmace: a brown velvet head on a straight stem
    const a = q() * 6.28, d = q() * 0.4, fx = x + Math.cos(a) * d, fz = z + Math.sin(a) * d, fh = h * (0.85 + q() * 0.2), sw = 0.008 * fh, br = [0.27, 0.16, 0.08];
    blade(fx, y, fz, fh, 0.05, 0.02, a, [0.16, 0.26, 0.1], [0.3, 0.36, 0.16], 0.008);
    for (let k = 0; k < 4; k++) { const b0 = k * 1.571, b1 = b0 + 1.571, r = 0.055, y0 = y + fh - 0.75, y1 = y + fh - 0.1, A = [fx + Math.cos(b0) * r, y0, fz + Math.sin(b0) * r], B = [fx + Math.cos(b1) * r, y0, fz + Math.sin(b1) * r], C = [fx + Math.cos(b1) * r, y1, fz + Math.sin(b1) * r], D = [fx + Math.cos(b0) * r, y1, fz + Math.sin(b0) * r]; tri(A, B, C, shade(br, 0.8 + 0.3 * (k % 2)), undefined, undefined, 0, sw); tri(A, C, D, shade(br, 0.8 + 0.3 * (k % 2)), undefined, undefined, 0, sw); }
  }
}

export function buildPond(K) {
  const { G, F, r } = K, P = POND, pts = outline(64), q = rng(2718);
  sheet = basinSheet();
  K.water = { pts, y: P.y }; K.pondPts = pts;

  // ---- You cannot walk on the water: strips across it, leaving the bridge open ----
  const bx = BRIDGE.x, bw = BRIDGE.w;
  for (let x = P.x - P.rx * 1.2; x < P.x + P.rx * 1.2; x += 2) {
    const x0 = x, x1 = x + 2;
    for (const [a, b] of x1 > bx - bw - 0.2 && x0 < bx + bw + 0.2 ? [[x0, Math.min(x1, bx - bw - 0.2)], [Math.max(x0, bx + bw + 0.2), x1]] : [[x0, x1]]) {
      if (b - a < 0.05) continue;
      const [z0, z1] = spanAt((a + b) / 2); if (!isFinite(z0)) continue;
      K.collide(a, b, z0 + 0.25, z1 - 0.25, 2.2);
    }
  }

  // ---- The edge: flat stones where people stand, bigger mossy ones where the planting is ----
  // angles round the pond: 0 is the terrace end, pi/2 the street side, pi the willow end
  const ang = a => ((a + Math.PI * 3) % (Math.PI * 2)) - Math.PI, within = (a, list) => list.some(([a0, a1]) => a >= a0 && a <= a1);
  const OPEN = [[-0.38, 1.22], [1.62, 2.38]], TALL = [[2.55, Math.PI], [-Math.PI, -2.45], [-2.4, -1.72], [-1.12, -0.5]];
  const nearBridge = x => Math.abs(x - bx) < bw + 1.3;
  for (let i = 0; i < 74; i++) {
    const a = ang((i / 74) * Math.PI * 2 + (q() - 0.5) * 0.03), open = within(a, OPEN), tall = within(a, TALL), k = q();
    const [ex, ez] = at(a, 1), nx = Math.cos(a) * P.rz, nz = Math.sin(a) * P.rx, nl = Math.hypot(nx, nz), ox = nx / nl, oz = nz / nl;      // outward from the edge
    if (nearBridge(ex)) continue;
    const mat = k < 0.4 ? PAINT.moss : k < 0.75 ? PAINT.stone : PAINT.stoneDark;
    if (open) {
      if (i % 3 === 0) { const w = 1.5 + q() * 0.7; K.rock(k < 0.7 ? PAINT.stone : PAINT.moss, ex + ox * 0.75, P.y + 0.02, ez + oz * 0.75, w, 0.3, 1.0 + q() * 0.4, -Math.atan2(oz, ox) + Math.PI / 2 + (q() - 0.5) * 0.3, 1); }
      else if (q() < 0.75) { const w = 0.55 + q() * 0.5; K.rock(mat, ex + ox * (0.35 + q() * 0.3), P.y, ez + oz * (0.35 + q() * 0.3), w, 0.24 + q() * 0.16, w * (0.7 + q() * 0.4), undefined, 1); }
    } else {
      const big = tall && q() < 0.4, w = big ? 1.4 + q() * 0.9 : 0.75 + q() * 0.6, hgt = big ? 0.7 + q() * 0.5 : 0.36 + q() * 0.25;
      K.rock(big ? (q() < 0.7 ? PAINT.moss : PAINT.stoneDark) : mat, ex + ox * w * 0.62, P.y + hgt * 0.2, ez + oz * w * 0.62, w, hgt, w * (0.7 + q() * 0.4), undefined, big ? 2 : 1);
      if (q() < 0.3) K.rock(PAINT.stoneDark, ex + ox * (w * 1.3 + 0.5), 0.12, ez + oz * (w * 1.3 + 0.5), 0.5 + q() * 0.4, 0.3, 0.5 + q() * 0.3, undefined, 1);
    }
  }
  for (const [x, z, rad, h, seed] of BOULDERS) boulder(x, z, rad, h, seed);

  // ---- The bridge: weathered teak, a low arch, posts with caps, three rails and ebony pegs ----
  {
    const { z0, z1 } = BRIDGE, len = z1 - z0;
    for (let z = z0, i = 0; z < z1 - 0.2; z += 0.54, i++) { const zc = Math.min(z + 0.25, z1 - 0.25), y = deckH(zc), sl = Math.atan2(deckH(zc + 0.25) - deckH(zc - 0.25), 0.5); K.box(WOOD[(i * 7 + (i >> 2)) % 4], bx - bw - 0.12, bx + bw + 0.12, y - 0.13, y, zc - 0.25, zc + 0.25, { rot: [-sl, 0, 0] }); }
    const N = 6, zs = Array.from({ length: N + 1 }, (_, i) => z0 + 0.35 + ((len - 0.7) * i) / N);
    for (const s of [-1, 1]) {
      const x = bx + s * bw;
      for (let i = 0; i < 14; i++) { const za = z0 + (len * i) / 14, zb = z0 + (len * (i + 1)) / 14; K.beam(POST, [bx + s * (bw - 0.25), deckH(za) - 0.42, za], [bx + s * (bw - 0.25), deckH(zb) - 0.42, zb], 0.3, 0.56); }      // the arched beams under the deck
      zs.forEach((z, i) => {
        const y = deckH(z), end = i === 0 || i === N, t = end ? 0.24 : 0.19, top = y + (end ? 3.5 : 3.15);
        K.box(POST, x - t, x + t, y - 0.5, top, z - t, z + t);
        K.box(WOOD[1], x - t - 0.09, x + t + 0.09, top, top + 0.09, z - t - 0.09, z + t + 0.09); K.box(POST, x - t + 0.05, x + t - 0.05, top + 0.09, top + 0.17, z - t + 0.05, z + t - 0.05);      // a stepped cap
        for (const py of [y + 0.55, y + 1.75, y + 2.8]) K.box(PEG, x + s * t - 0.012, x + s * t + 0.012, py - 0.045, py + 0.045, z - 0.045, z + 0.045);      // pegs where the rails are housed
        if (i < N) {
          const zb = zs[i + 1], yb = deckH(zb), zm = (z + zb) / 2, ym = (y + yb) / 2;
          K.beam(WOOD[0], [x, y + 2.8, z], [x, yb + 2.8, zb], 0.3, 0.2);                 // top rail, broad enough to lean on
          K.beam(WOOD[2], [x, y + 1.75, z], [x, yb + 1.75, zb], 0.13, 0.17); K.beam(WOOD[2], [x, y + 0.55, z], [x, yb + 0.55, zb], 0.13, 0.17);
          for (const dz of [-0.55, 0.55]) K.box(WOOD[3], x - 0.05, x + 0.05, ym + 1.8 + (deckH(zm + dz) - ym), ym + 2.72 + (deckH(zm + dz) - ym), zm + dz - 0.075, zm + dz + 0.075);      // paired spindles under the top rail
          K.box(WOOD[3], x - 0.045, x + 0.045, ym + 0.6, ym + 1.7, zm - 0.3, zm + 0.3);                                                                   // a plain panel board below
        }
      });
      K.collide(x - 0.2, x + 0.2, z0, z1, 6);
    }
    for (const [px, pz] of BRIDGE.piles) {      // the piles stand in the water (in the basin's mesh: brown above, dark and green below)
      const top = deckH(pz) - 0.4, R = BRIDGE.pileR, lv = [P.y - depthAt(px, pz) - 0.1, P.y - 0.25, P.y + 0.12, top], cs = [[0.07, 0.09, 0.06], [0.1, 0.1, 0.07], [0.3, 0.26, 0.21], [0.33, 0.29, 0.24]];
      for (let k = 0; k < 3; k++) for (let i = 0; i < 8; i++) { const a0 = i * 0.7854, a1 = a0 + 0.7854, A = [px + Math.cos(a0) * R, lv[k], pz + Math.sin(a0) * R], B = [px + Math.cos(a1) * R, lv[k], pz + Math.sin(a1) * R], C = [px + Math.cos(a1) * R, lv[k + 1], pz + Math.sin(a1) * R], D = [px + Math.cos(a0) * R, lv[k + 1], pz + Math.sin(a0) * R], sh = 0.85 + 0.3 * (i % 2); tri(A, C, B, shade(cs[k], sh), shade(cs[k + 1], sh), shade(cs[k], sh)); tri(A, D, C, shade(cs[k], sh), shade(cs[k + 1], sh), shade(cs[k + 1], sh)); }
    }
    for (const z of [BRIDGE.piles[0][1], BRIDGE.piles[2][1]]) K.box(POST, bx - bw + 0.1, bx + bw - 0.1, deckH(z) - 0.72, deckH(z) - 0.42, z - 0.17, z + 0.17);      // the cross-beam on each pair of piles
    // a stone at each end to step up from, and the walk itself: short ramps that follow the arch
    for (const [z, d] of [[z0, -1], [z1, 1]]) { K.box(GRANITE, bx - bw - 0.35, bx + bw + 0.35, -0.1, 0.2, Math.min(z, z + d * 1.5), Math.max(z, z + d * 1.5)); K.surface(bx - bw - 0.35, bx + bw + 0.35, Math.min(z, z + d * 1.5), Math.max(z, z + d * 1.5), 0.2); }
    for (let i = 0; i < 12; i++) { const za = z0 + (len * i) / 12, zb = z0 + (len * (i + 1)) / 12; K.surface(bx - bw, bx + bw, za, zb, deckH(zb), deckH(za)); }
    K.bridge = { x: bx, z0, z1 };
  }

  // ---- Water lilies in three rafts (fish pass under them), and the frog's big pad ----
  const lilySpots = [];
  for (const [a, s, n, rx, rz] of [[2.2, 0.72, 11, 3.4, 2.0], [-0.95, 0.66, 9, 3.0, 1.8], [0.3, 0.72, 5, 2.0, 1.4], [-2.35, 0.74, 6, 2.2, 1.5]]) {
    const [cx, cz] = at(a, s);
    for (let i = 0, tries = 0; i < n && tries < 60; tries++) {
      const t = q() * 6.28, d = Math.sqrt(q()), x = cx + Math.cos(t) * rx * d, z = cz + Math.sin(t) * rz * d, rad = 0.5 + q() * 0.42;
      if (sAt(x, z) > 0.93 || nearBridge(x) || lilySpots.some(([px, pz, pr]) => Math.hypot(px - x, pz - z) < (pr + rad) * 0.9) || Math.hypot(x - FROG[0], z - FROG[1]) < 1.9) continue;
      pad(x, z, rad, q() * 6.28, q() < 0.2 ? 0.7 : q() * 0.15); lilySpots.push([x, z, rad]); i++;
      if (q() < 0.34) lily(x + Math.cos(t + 2) * rad * 0.8, z + Math.sin(t + 2) * rad * 0.8, 0.8 + q() * 0.35, q() < 0.45);
    }
  }
  K.frogPad = { x: FROG[0], z: FROG[1], y: P.y + 0.06 };
  pad(FROG[0], FROG[1], 1.25, 0.9); lily(FROG[0] - 1.2, FROG[1] - 0.8, 1.1, true);

  // ---- Planting, in groups: rushes and long grass at the willow end and the back, iris by the bridge and the stones ----
  for (const [a, s, kind, o] of [
    [2.75, 0.97, 'rush', { n: 18, h: 5.2 }], [3.0, 1.05, 'rush', { n: 14, h: 4.6 }], [-3.0, 0.97, 'rush', { n: 18, h: 5.0 }], [-2.75, 1.04, 'rush', { n: 12, h: 4.4, tails: 2 }], [-0.8, 0.97, 'rush', { n: 16, h: 4.8 }], [-1.0, 1.05, 'rush', { n: 10, h: 4.2, tails: 2 }],
    [2.6, 0.96, 'iris', { hue: 0, flowers: 4 }], [-2.55, 0.96, 'iris', { hue: 0, flowers: 4, n: 14 }], [-2.2, 0.97, 'iris', { hue: 1, flowers: 3 }], [-1.85, 0.97, 'iris', { hue: 0, flowers: 3 }], [-0.62, 0.96, 'iris', { hue: 2, flowers: 3 }],
    [1.22, 0.99, 'iris', { hue: 0, flowers: 3, h: 2.3 }], [1.62, 0.99, 'iris', { hue: 1, flowers: 2, h: 2.2, n: 9 }], [-1.2, 0.99, 'iris', { hue: 1, flowers: 3, h: 2.3 }], [-1.6, 0.99, 'iris', { hue: 0, flowers: 2, h: 2.2, n: 9 }], [0.36, 1.0, 'iris', { hue: 0, flowers: 2, h: 2.0, n: 8 }], [2.42, 1.0, 'iris', { hue: 2, flowers: 2, h: 2.2, n: 9 }],
  ]) { const [x, z] = at(a, s); (kind === 'rush' ? rushClump : irisClump)(x, z, q, o); }
  const drift = (a, s, kind, n, size, rx = 1.6) => { const [x, z] = at(a, s); F.drift(kind, x, z, rx, rx, n, size); };
  drift(2.85, 1.24, 'grass', 5, 1.25, 2.2); drift(-2.95, 1.22, 'grass', 5, 1.25, 2.2); drift(-2.1, 1.2, 'grass', 4, 1.1); drift(-0.85, 1.22, 'grass', 4, 1.15, 2);
  drift(2.5, 1.2, 'fern', 3, 0.95); drift(-2.45, 1.2, 'fern', 3, 0.95); drift(-1.75, 1.18, 'hosta', 3, 1.0, 1.2); drift(-0.55, 1.17, 'hosta', 3, 1.0, 1.2); drift(-1.15, 1.2, 'fern', 2, 0.9, 1);
  drift(1.3, 1.17, 'hosta', 2, 0.9, 0.8); drift(0.36, 1.16, 'hosta', 2, 0.9, 0.8); drift(2.44, 1.15, 'hosta', 2, 0.95, 0.9);

  // ---- The far end: a bamboo spout runs a thread of water in over the big boulder ----
  {
    const [bxx, bzz, , bh] = BOULDERS[0], [ox, oz] = at(3.05, 1.2), dx = SPOUT[0] - ox, dz = SPOUT[1] - oz, dl = Math.hypot(dx, dz), ux = dx / dl, uz = dz / dl;
    const mouth = [bxx + ux * 1.5, P.y + bh + 0.55, bzz + uz * 1.5], back = [ox - ux * 0.6, P.y + bh + 1.05, oz - uz * 0.6];
    K.tube(BAMBOO, back, mouth, 0.085, 7);
    for (const k of [0.25, 0.6]) { const j = back.map((v, i) => v + (mouth[i] - v) * k); K.tube('c#6f7446/0.8', [j[0] - ux * 0.012, j[1], j[2] - uz * 0.012], [j[0] + ux * 0.012, j[1], j[2] + uz * 0.012], 0.094, 7); }      // the nodes of the cane
    const prop = back.map((v, i) => v + (mouth[i] - v) * 0.3); for (const s of [-1, 1]) K.tube(BAMBOO, [prop[0] - uz * s * 0.55, 0.1, prop[2] + ux * s * 0.55], [prop[0] + uz * s * 0.12, prop[1] + 0.3, prop[2] - ux * s * 0.12], 0.05, 6);
    // the falling water: two crossed ribbons, in the basin's mesh
    const fall = t => [mouth[0] + ux * 0.9 * t, mouth[1] - 0.04 - (mouth[1] - P.y) * t * t, mouth[2] + uz * 0.9 * t], wc = [0.78, 0.86, 0.9];
    for (let i = 0; i < 6; i++) { const a = fall(i / 6), b = fall((i + 1) / 6), w = 0.035 + 0.012 * i; for (const [wx, wy, wz] of [[-uz * w, 0, ux * w], [0, w, 0]]) { tri([a[0] - wx, a[1] - wy, a[2] - wz], [a[0] + wx, a[1] + wy, a[2] + wz], [b[0] + wx, b[1] + wy, b[2] + wz], wc); tri([a[0] - wx, a[1] - wy, a[2] - wz], [b[0] + wx, b[1] + wy, b[2] + wz], [b[0] - wx, b[1] - wy, b[2] - wz], wc); } }
    const land = fall(1); SPOUT[0] = land[0]; SPOUT[1] = land[2];
    K.collide(bxx - 1.8, bxx + 1.2, bzz - 2, bzz + 2, 3);
  }

  // ---- A snow-viewing lantern on its own stone at the terrace end; it glows after dark ----
  {
    const [ex, ez] = at(0.14, 1.06), y0 = P.y + 0.32;
    K.rock(PAINT.stoneDark, ex, P.y + 0.05, ez, 1.5, 0.42, 1.3, 0.4, 2);
    for (let i = 0; i < 3; i++) { const a = i * 2.094 + 0.5; K.beam(GRANITE, [ex + Math.cos(a) * 0.62, y0 - 0.05, ez + Math.sin(a) * 0.62], [ex + Math.cos(a) * 0.36, y0 + 0.82, ez + Math.sin(a) * 0.36], 0.17, 0.2); }
    K.cyl(GRANITE, ex, y0 + 0.8, y0 + 0.93, ez, 0.56, 0.6, 6);
    K.cyl(GRANITE, ex, y0 + 0.93, y0 + 1.03, ez, 0.4, 0.4, 6); K.cyl(GRANITE, ex, y0 + 1.36, y0 + 1.42, ez, 0.4, 0.4, 6);
    for (let i = 0; i < 6; i++) { const a = i * 1.0472; K.box(GRANITE, ex + Math.cos(a) * 0.36 - 0.055, ex + Math.cos(a) * 0.36 + 0.055, y0 + 1.03, y0 + 1.36, ez + Math.sin(a) * 0.36 - 0.055, ez + Math.sin(a) * 0.36 + 0.055); }
    K.cyl(GLOW_WARM, ex, y0 + 1.03, y0 + 1.36, ez, 0.29, 0.29, 6);                      // the lit paper inside, showing between the six posts
    K.lathe(GRANITE, ex, y0 + 1.42, ez, [[0.01, 0], [1.0, 0], [1.03, 0.07], [0.85, 0.15], [0.4, 0.4], [0.16, 0.56], [0.01, 0.6]], 6);
    K.lathe(PAINT.moss, ex, y0 + 1.5, ez, [[0.9, 0.06], [0.7, 0.2], [0.42, 0.37], [0.3, 0.44]], 6);
    K.sphere(GRANITE, ex, y0 + 2.08, ez, 0.13, 1.2, 1);
    K.lamp(ex, y0 + 1.2, ez, 0.26, 'candle');
    K.collide(ex - 0.7, ex + 0.7, ez - 0.7, ez + 0.7, 3);
  }

  // ---- Places to sit and watch: a warm flat stone on the feeding bank, the bench on the willow side ----
  {
    const [sx, sz] = at(0.52, 1.2), yaw = Math.atan2(sx - P.x, sz - P.z);
    K.rock(PAINT.stone, sx, 0.5, sz, 2.1, 0.95, 1.5, 0.5, 2); K.collide(sx - 1.5, sx + 1.5, sz - 1.2, sz + 1.2, 1.6);
    K.seat(sx, 1.25, sz, yaw, 'sit on the warm stone');
    const bz = spanAt(P.x - 9)[1] + 4.4;
    K.model('painted_wooden_bench', P.x - 9, bz, Math.PI, { scale: 1.25, collide: true });
    K.seat(P.x - 9, 1.6, bz - 0.4, 0, 'sit by the pond');
    K.model('garden_gnome', P.x - 14, P.z - 11.2, 1.2, { scale: 0.8 });          // half lost in the ferns
    F.drift('fern', P.x - 14.5, P.z - 11.6, 1.5, 1.5, 3, 0.9);
  }
}

// ---- Life on the pond -------------------------------------------------------------------
export function pondLife(ctx, K) {
  const { scene, animated, interact, day } = ctx, P = POND, Q = new URLSearchParams(location.search);
  const basin = basinMesh(sheet); sheet = null; scene.add(basin);
  const water = waterMesh(); scene.add(water);
  U.uSpout.value.set(SPOUT[0], SPOUT[1], 0.5);
  const S = school = makeSchool(CAST); U.uRings.value = S.rings;
  let koi = null; makeKoi(CAST).then(k => { koi = k; scene.add(k.mesh); k.update(S); }).catch(e => console.warn('koi', e));

  // food pellets: small brown crumbs that drop onto the water and float
  const NP = S.pellets.n, pellets = new THREE.InstancedMesh((() => { const g = new THREE.IcosahedronGeometry(0.05, 0); g.scale(1, 0.55, 1); return g; })(), new THREE.MeshStandardMaterial({ color: 0x7a5226, roughness: 0.9 }), NP);
  pellets.name = 'koi food'; pellets.frustumCulled = false; pellets.visible = false; pellets.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(pellets);
  { const m = pellets.instanceMatrix.array; m.fill(0); for (let k = 0; k < NP; k++) m[k * 16 + 15] = 1; }
  let fedShown = false;
  const showPellets = () => {
    const m = pellets.instanceMatrix.array, Pl = S.pellets; let any = false;
    for (let k = 0; k < NP; k++) {
      const o = k * 16, fall = Pl.t[k] - clock, on = Pl.alive[k] && fall < 0.45, sc = on ? 1 : 0;
      m[o] = m[o + 5] = m[o + 10] = sc; m[o + 12] = Pl.x[k]; m[o + 13] = P.y + 0.012 + (fall > 0 ? fall * fall * 16 : 0.006 * Math.sin(clock * 2 + k)); m[o + 14] = Pl.z[k]; if (on) any = true;
    }
    pellets.instanceMatrix.needsUpdate = true; pellets.visible = any; fedShown = any;
  };

  // ---- the hour: murk, caustics and shadows follow the light ----
  const light = () => {
    const L = day?.light ?? 1, sd = day?.sunDir;
    U.uMurk.value.setRGB(0.028, 0.05, 0.03).multiplyScalar(0.05 + 0.95 * L);
    U.uBank.value.setRGB(0.03 * (0.06 + 1.1 * L) + 0.006 * (1 - L), 0.055 * (0.06 + 1.1 * L) + 0.01 * (1 - L), 0.028 * (0.06 + 1.1 * L) + 0.02 * (1 - L));      // by night a little of the sky's blue stays on the water
    const high = sd ? THREE.MathUtils.smoothstep(sd.y, 0.12, 0.5) : 1;
    U.uCaus.value = 0.34 * L * high; U.uShade.value = 0.5 * L * (0.4 + 0.6 * high);
    if (sd && sd.y > 0.05) { const hl = Math.hypot(sd.x, sd.z), sinR = hl / 1.33, tanR = sinR / Math.sqrt(1 - sinR * sinR); U.uSunSlope.value.set(hl > 1e-4 ? sd.x / hl * tanR : 0, hl > 1e-4 ? sd.z / hl * tanR : 0); }
  };

  // ---- test hooks ----
  const freeze = Q.has('pondfreeze'), pre = Number(Q.get('pondt') ?? 0), stand = Q.get('pondstand')?.split(',').map(Number);
  let feedAt = NaN, feedSpot = FEED[0].to;
  if (Q.has('pondfeed')) { const [s, where] = Q.get('pondfeed').split('@'); feedAt = Math.max(0, pre - Number(s || 8)); if (where === 'bridge') feedSpot = FEED[3].to; }
  for (let k = 0, n = Math.round(pre * 30); k < n; k++) { if (clock >= feedAt) { S.feed(feedSpot[0], feedSpot[1], clock); feedAt = NaN; } S.step(1 / 30, clock, stand ? stand[0] : NaN, stand ? stand[1] : NaN); clock += 1 / 30; }
  U.uT.value = clock; light(); showPellets();

  const cam = ctx.camera.position;
  animated.push((t, dt) => {
    light();
    if (freeze) { koi?.update(S); return; }
    dt = Math.min(dt, 0.05); clock += dt; U.uT.value = clock;
    S.step(dt, clock, stand ? stand[0] : cam.x, stand ? stand[1] : cam.z);
    koi?.update(S);
    if (S.feeding || fedShown) showPellets();
  });

  // ---- feeding and watching ----
  const toast = text => window.houseUI?.toast?.(text);
  const FED = ['You scatter a handful. Marmalade, the orange one, gets there first. She always does.', 'A handful on the water. Admiral, the old gold one, arrives last and eats the most.', 'They come up as if you were the dinner bell.', 'A pinch of food. Dot, with the one red spot, takes exactly one and looks pleased.'];
  const WATCH = ['The big gold one is Admiral. He came with the house, and behaves accordingly.', 'Marmalade is the quick orange one. She has never once been late for a meal.', 'Dot wears a single red spot on her head, like a small sun. She knows.', 'The two with the long trailing fins are butterfly koi. They are aware of the effect.'];
  let said = 0;
  for (const f of FEED) interact.push({ x: f.p[0], y: f.p[2], z: f.p[1], reach: f.reach, label: () => (S.feeding ? 'watch the koi' : 'feed the koi'),
    act: () => { if (S.feeding) toast(WATCH[said++ % WATCH.length]); else { S.feed(f.to[0], f.to[1], clock); toast(FED[said++ % FED.length]); } } });
  interact.push({ x: P.x - 6, y: 0.4, z: P.z - 3, reach: 9, label: () => 'watch the koi', act: () => toast(WATCH[said++ % WATCH.length]) });
  window.__pond = { school: S, feed: feedKoi, get clock() { return clock; } };

  // ---- Two mallards (village animal models), paddling round the willow end, each drawing a little wake ----
  const FT = 3.28084, loader = new GLTFLoader();
  const glb = id => new Promise((ok, bad) => loader.load(`assets/models/${id}/${id}.glb`, g => ok(g.scene), undefined, bad));
  const prep = (o, s, tint) => { o.scale.setScalar(FT * s); o.traverse(n => { if (n.isMesh) { n.castShadow = false; n.receiveShadow = true; if (tint) { n.material = n.material.clone(); n.material.color.multiply(new THREE.Color(tint)); } } }); return o; };
  glb('v_duck_mallard').then(src => {
    const ducks = [prep(src.clone(true), 1.0), prep(src.clone(true), 0.95, 0xb8a58a)];
    for (const d of ducks) scene.add(d);
    const loop = new THREE.CatmullRomCurve3([[-8, -3.5], [-10.4, -0.4], [-9, 2.6], [-5.2, 2.3], [-4.4, -2]].map(([dx, dz]) => new THREE.Vector3(P.x + dx, 0, P.z + dz)), true);
    const p = new THREE.Vector3(), tn = new THREE.Vector3(), wake = [0, 0.8];
    const place = (d, i, c) => {
      const s = ((c * 0.0042 + i * 0.075) % 1 + 1) % 1; loop.getPointAt(s, p); loop.getTangentAt(s, tn);
      d.position.set(p.x, P.y - 0.2 + 0.012 * Math.sin(c * 1.7 + i * 2), p.z); d.rotation.set(0.03 * Math.sin(c * 1.3 + i), Math.atan2(tn.x, tn.z), 0.04 * Math.sin(c * 0.9 + i * 3), 'YXZ');     // the model faces +z
    };
    ducks.forEach((d, i) => place(d, i, clock));
    animated.push(() => { if (freeze) return; ducks.forEach((d, i) => { place(d, i, clock); if (clock > wake[i]) { wake[i] = clock + 1.7; S.ring(d.position.x, d.position.z, clock, 0.3); } }); });
  }).catch(() => {});

  // ---- The frog on the big lily pad (village model): sits, and jumps in with a plop if you say hello ----
  glb('v_frog').then(src => {
    const fp = K.frogPad, g = prep(src.clone(true), 1.3); g.position.set(fp.x, fp.y, fp.z); g.rotation.y = Math.atan2(P.x - fp.x, P.z - fp.z) + Math.PI; scene.add(g);
    let hop = -1;
    interact.push({ x: fp.x, y: fp.y + 0.3, z: fp.z, reach: 12, label: () => (hop >= 0 ? 'the frog has gone for a swim' : 'say hello to the frog'), act: () => { if (hop < 0) hop = 0; } });
    const dx = P.x - fp.x, dz = P.z - fp.z, dl = Math.hypot(dx, dz), ux = dx / dl, uz = dz / dl;
    animated.push((t, dt) => {
      if (hop < 0) { g.scale.y = FT * 1.3 * (1 + 0.04 * Math.max(0, Math.sin(t * 4)) * (Math.sin(t * 0.6) > 0.4 ? 1 : 0)); return; }
      const was = hop; hop += dt;
      if (hop < 0.55) { const u = hop / 0.55; g.visible = true; g.rotation.y = Math.atan2(ux, uz); g.position.set(fp.x + ux * u * 2.6, fp.y + Math.sin(Math.PI * u) * 1.0 - u * 0.4, fp.z + uz * u * 2.6); }
      else if (hop < 8) { g.visible = false; if (was < 0.55) S.ring(fp.x + ux * 2.6, fp.z + uz * 2.6, clock, 1.2); }
      else if (hop < 8.6) { const u = (hop - 8) / 0.6; g.visible = true; g.position.set(fp.x, fp.y - 0.3 * (1 - u), fp.z); g.rotation.y = Math.atan2(P.x - fp.x, P.z - fp.z) + Math.PI; }
      else { hop = -1; g.position.set(fp.x, fp.y, fp.z); }
    });
  }).catch(() => {});
}
