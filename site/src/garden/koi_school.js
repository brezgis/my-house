// How the koi swim. Plain numbers only (no three.js), so the whole school can
// be stepped and checked with node; koi.js draws what this module decides.
//
// Each fish has a place it is heading for and a depth it would like, a speed
// it is working up to (or gliding down from), and a turning rate that is tied
// to its speed: a fish can turn no tighter than a circle of about 0.6 of its
// own length, so nothing ever spins on the spot. Feelers ahead keep it off the
// bank, the bridge piles, the boulders and the other fish; fish that would
// touch pass over and under each other. On top of that sit the moods: cruising
// in loose company, resting, the odd dart, rising to kiss the surface, coming
// to the visitor at the edge, and feeding.
//
// All state is in typed arrays made once; step() allocates nothing.

import { POND, rim, sAt, depthAtS, OBSTACLES } from './pond_shape.js';

export function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const TAU = Math.PI * 2;
const wrap = a => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);

export const MODE = { CRUISE: 0, REST: 1, DART: 2, FEED: 3, MILL: 4, BEG: 5 };
export const TURN = 0.6;                   // tightest turning circle, in body lengths
// Body proportions used for "do two fish touch": three balls along the spine
export const BALLS = [[0.3, 0.115], [0.0, 0.12], [-0.3, 0.075]];      // [offset along the body, radius], in body lengths

// The fish. len in feet; bold: how readily it comes to people (1 = first there);
// pace: how briskly it goes about; fins: 1 ordinary, more for the butterfly koi.
export const CAST = [
  { name: 'Admiral', kind: 'yamabuki', len: 3.0, bold: 0.9, pace: 0.8 },      // the old gold one; came with the house
  { kind: 'kohaku', len: 2.7, bold: 0.6, pace: 0.85, seed: 11 },
  { kind: 'showa', len: 2.6, bold: 0.5, pace: 0.9, seed: 12 },
  { kind: 'chagoi', len: 2.5, bold: 0.95, pace: 0.85, seed: 13 },
  { kind: 'sanke', len: 2.3, bold: 0.55, pace: 0.95, seed: 14 },
  { kind: 'asagi', len: 2.2, bold: 0.4, pace: 0.9, seed: 15 },
  { name: 'Dot', kind: 'tancho', len: 2.1, bold: 0.7, pace: 1, seed: 16 },
  { kind: 'platinum', len: 2.0, bold: 0.5, pace: 1, seed: 17 },
  { kind: 'kohaku', len: 2.0, bold: 0.65, pace: 0.95, seed: 18, fins: 1.9 },      // butterfly koi
  { name: 'Marmalade', kind: 'orenji', len: 1.9, bold: 1.0, pace: 1.25, seed: 19 },      // the orange one: always first
  { kind: 'kiutsuri', len: 1.9, bold: 0.35, pace: 1, seed: 20 },
  { kind: 'kumonryu', len: 1.8, bold: 0.45, pace: 0.95, seed: 21, fins: 2.0 },     // butterfly koi
  { kind: 'shusui', len: 1.8, bold: 0.5, pace: 1.05, seed: 22 },
  { kind: 'bekko', len: 1.8, bold: 0.6, pace: 1, seed: 23 },
  { kind: 'kohaku', len: 1.6, bold: 0.55, pace: 1.1, seed: 24 },
  { kind: 'sanke', len: 1.5, bold: 0.45, pace: 1.1, seed: 25 },
  { kind: 'tanchosanke', len: 1.1, bold: 0.6, pace: 1.25, seed: 26 },
  { kind: 'kohaku', len: 1.0, bold: 0.7, pace: 1.3, seed: 27 },
  { kind: 'showa', len: 0.95, bold: 0.5, pace: 1.3, seed: 28 },
  { kind: 'yamabuki', len: 0.9, bold: 0.75, pace: 1.35, seed: 29 },
];

export function makeSchool(cast = CAST, { seed = 7, obstacles = OBSTACLES, pellets: NP = 30, rings: NR = 12 } = {}) {
  const n = cast.length, r = rng(seed), P = POND, F = k => new Float32Array(k), I = k => new Int8Array(k);
  const NO = obstacles.length, ob = F(NO * 3); obstacles.forEach((o, k) => ob.set(o, k * 3));
  // what koi.js draws
  const x = F(n), z = F(n), d = F(n), h = F(n), pitch = F(n), roll = F(n), bend = F(n), phase = F(n), amp = F(n), fin = F(n), gulp = F(n);
  // the rest of each fish
  const len = F(n), hgt = F(n), bold = F(n), pace = F(n), lim = F(n), dTop = F(n);
  const v = F(n), w = F(n), vd = F(n), tx = F(n), tz = F(n), td = F(n), vt = F(n), timer = F(n), bias = F(n), biasT = F(n), slow = F(n), lift = F(n), delay = F(n), sNow = F(n);
  const mode = I(n), pel = I(n).fill(-1), kiss = I(n), buddy = I(n), lap = I(n);
  // pellets on the water
  const px = F(NP), pz = F(NP), pt = F(NP), palive = I(NP), pclaim = I(NP), pvx = F(NP), pvz = F(NP);
  // ripple rings for the water: x, z, time it began, strength
  const ev = F(NR * 4).fill(-1000); let evN = 0;
  const S = { n, x, z, d, h, pitch, roll, bend, phase, amp, fin, gulp, len, hgt, mode, v, w, tx, tz, lim, dTop, pel, bold,
    pellets: { n: NP, x: px, z: pz, t: pt, alive: palive }, rings: ev, obstacles: ob,
    stats: { pushes: 0, eaten: 0 }, feeding: false, dwell: 0, begX: 0, begZ: 0, feedX: 0, feedZ: 0 };
  const ring = (ex, ez, t, k) => { const o = (evN++ % NR) * 4; ev[o] = ex; ev[o + 1] = ez; ev[o + 2] = t; ev[o + 3] = k; };
  S.ring = ring;

  const clearOf = (qx, qz, pad) => { for (let k = 0; k < NO; k++) { const dx = qx - ob[k * 3], dz = qz - ob[k * 3 + 1], rr = ob[k * 3 + 2] + pad; if (dx * dx + dz * dz < rr * rr) return false; } return true; };
  // A random point of open water inside normalised radius smax
  let qx = 0, qz = 0;
  const anywhere = (smax, pad) => {
    for (let k = 0; k < 6; k++) { const a = r() * TAU, s = smax * Math.sqrt(r()), f = rim(a) * s; qx = P.x + Math.cos(a) * P.rx * f; qz = P.z + Math.sin(a) * P.rz * f; if (clearOf(qx, qz, pad)) return; }
  };
  // Pull a point inside normalised radius smax
  const inside = (smax) => { const s = sAt(qx, qz); if (s > smax) { const k = smax / s; qx = P.x + (qx - P.x) * k; qz = P.z + (qz - P.z) * k; } };
  const floorFor = (i, s) => Math.max(dTop[i], Math.min(2.5, depthAtS(s) - 0.5 * hgt[i] - 0.15));

  for (let i = 0; i < n; i++) {
    const c = cast[i]; len[i] = c.len; hgt[i] = 0.24 * c.len; bold[i] = c.bold ?? 0.5; pace[i] = c.pace ?? 1; dTop[i] = 0.5 * hgt[i] + 0.07;
    let s = 0.9; while (s > 0.3 && depthAtS(s) < hgt[i] + 0.4) s -= 0.01; lim[i] = s;      // the shallowest water its body fits in
    for (let k = 0; k < 40; k++) {
      anywhere(lim[i] * 0.9, c.len); let ok = true;
      for (let j = 0; j < i; j++) if (Math.hypot(qx - x[j], qz - z[j]) < 0.7 * (len[i] + len[j])) ok = false;
      if (ok) break;
    }
    x[i] = qx; z[i] = qz; h[i] = r() * TAU - Math.PI; sNow[i] = sAt(qx, qz);
    d[i] = td[i] = dTop[i] + r() * (floorFor(i, sNow[i]) - dTop[i]) * 0.8;
    v[i] = vt[i] = c.len * 0.3; amp[i] = 0.5; fin[i] = 0.5; phase[i] = r() * TAU; slow[i] = 1; timer[i] = r() * 4; tx[i] = qx; tz[i] = qz;
    buddy[i] = Math.floor(r() * n); lap[i] = r() < 0.5 ? 1 : -1;
  }

  // ---- what to do next ------------------------------------------------------------------
  function cruise(i, far) {
    mode[i] = MODE.CRUISE;
    const j = buddy[i];
    if (!far && j !== i && r() < 0.3) { qx = tx[j] + (r() - 0.5) * 9; qz = tz[j] + (r() - 0.5) * 9; inside(lim[i] * 0.92); if (!clearOf(qx, qz, 1.2)) anywhere(lim[i] * 0.92, 1.2); }      // loose company
    else if (far || r() < 0.15) anywhere(lim[i] * 0.92, 1.2);
    else {                                                 // mostly it does laps: on round the pond the way it likes to go
      if (r() < 0.12) lap[i] = -lap[i];
      const a = Math.atan2((z[i] - P.z) / P.rz, (x[i] - P.x) / P.rx) + lap[i] * (0.5 + 1.1 * r()), f = rim(a) * lim[i] * 0.92 * (0.3 + 0.7 * Math.sqrt(r()));
      qx = P.x + Math.cos(a) * P.rx * f; qz = P.z + Math.sin(a) * P.rz * f; if (!clearOf(qx, qz, 1.2)) anywhere(lim[i] * 0.92, 1.2);
    }
    if (r() < 0.3) buddy[i] = Math.floor(r() * n);
    tx[i] = qx; tz[i] = qz;
    const k = r(); td[i] = dTop[i] + k * Math.sqrt(k) * 2.3;
    vt[i] = len[i] * pace[i] * (0.26 + 0.24 * r()); timer[i] = 7 + 10 * r();
  }
  function next(i) {
    const k = r();
    if (k < 0.16 && sNow[i] < lim[i] - 0.12) { mode[i] = MODE.REST; vt[i] = 0.035 * len[i]; timer[i] = 4 + 10 * r(); td[i] = d[i] + r() * 0.8; tx[i] = x[i] + Math.cos(h[i]) * 6; tz[i] = z[i] + Math.sin(h[i]) * 6; }
    else if (k < 0.19) { mode[i] = MODE.DART; anywhere(lim[i] * 0.85, 1.5); tx[i] = qx; tz[i] = qz; vt[i] = len[i] * (1.9 + r() * 0.8); timer[i] = 0.6 + r() * 0.6; }
    else { cruise(i, k > 0.8); if (k > 0.9) { kiss[i] = 1; td[i] = dTop[i]; } }      // now and then it comes up to kiss the surface on the way
  }
  function beg(i) {
    mode[i] = MODE.BEG;
    qx = S.begX + (r() - 0.5) * 5; qz = S.begZ + (r() - 0.5) * 5; inside(lim[i] * 0.97); if (!clearOf(qx, qz, 0.8)) { qx = S.begX; qz = S.begZ; inside(lim[i] * 0.9); }
    tx[i] = qx; tz[i] = qz; td[i] = dTop[i] + r() * 0.35; vt[i] = len[i] * pace[i] * (0.2 + 0.14 * r()); timer[i] = 3 + 4 * r();
    if (r() < 0.3) { kiss[i] = 1; td[i] = dTop[i]; }
  }
  function drop(i) { if (pel[i] >= 0) { pclaim[pel[i]]--; pel[i] = -1; } }
  function choosePellet(i, t) {
    drop(i);
    let best = -1, bd = 1e9, waiting = false;
    for (let k = 0; k < NP; k++) {
      if (!palive[k]) continue; if (pt[k] > t) { waiting = true; continue; }
      const dx = px[k] - x[i], dz = pz[k] - z[i], q = (dx * dx + dz * dz) * (1 + 1.5 * pclaim[k]);
      if (q < bd) { bd = q; best = k; }
    }
    if (best >= 0) { pel[i] = best; pclaim[best]++; timer[i] = 9; return 1; }
    return waiting ? 2 : 0;
  }

  // Scatter food on the water round (fx, fz). Fish notice after a moment, the bold and the near first.
  S.feed = (fx, fz, t) => {
    qx = fx; qz = fz; inside(0.66);
    for (let k = 0; k < NO; k++) { const dx = qx - ob[k * 3], dz = qz - ob[k * 3 + 1], e = Math.hypot(dx, dz) || 1, need = ob[k * 3 + 2] + 2.2; if (e < need) { qx += dx / e * (need - e); qz += dz / e * (need - e); } }
    inside(0.66); fx = qx; fz = qz;
    S.feedX = fx; S.feedZ = fz; S.feeding = true; S.feedT = t;
    for (let k = 0; k < NP; k++) {
      const a = r() * TAU, q = Math.sqrt(r()) * 2.6; qx = fx + Math.cos(a) * q * 1.25; qz = fz + Math.sin(a) * q; inside(0.74);
      if (!clearOf(qx, qz, 1.3)) { qx = fx + Math.cos(a) * 0.5; qz = fz + Math.sin(a) * 0.5; }
      px[k] = qx; pz[k] = qz; pt[k] = t + 0.25 + r() * 0.8; palive[k] = 1; pclaim[k] = 0; pvx[k] = Math.cos(a) * 0.05; pvz[k] = Math.sin(a) * 0.05;
    }
    for (let i = 0; i < n; i++) { pel[i] = -1; delay[i] = 0.5 + Math.hypot(x[i] - fx, z[i] - fz) / (5 + 6 * bold[i]) * 0.6 + r() * (1.6 - bold[i]); }
  };

  let frame = 0, lastVX = 0, lastVZ = 0;
  // dt seconds (at most 0.05 is assumed), t the clock, (visX, visZ) where the visitor stands (or NaN)
  S.step = (dt, t, visX, visZ) => {
    frame++;
    // ---- the visitor: stand at the edge or on the bridge a few seconds and the bold ones come over
    if (visX === visX) {
      const sv = sAt(visX, visZ), sp = Math.hypot(visX - lastVX, visZ - lastVZ) / Math.max(dt, 1e-3); lastVX = visX; lastVZ = visZ;
      if (sv < 1.32) { S.dwell = sp > 1.5 ? Math.max(0, S.dwell - dt * 2) : Math.min(30, S.dwell + dt); const k = Math.min(sv, 0.74) / Math.max(sv, 1e-3); S.begX = P.x + (visX - P.x) * k; S.begZ = P.z + (visZ - P.z) * k; }
      else S.dwell = Math.max(0, S.dwell - dt * 4);
    } else S.dwell = 0;
    const boldEnough = S.dwell < 3 ? 2 : 1 - 0.4 * clamp((S.dwell - 3) / 9, 0, 1);

    // ---- pellets drift a little, and dissolve in the end
    let food = 0;
    if (S.feeding) {
      for (let k = 0; k < NP; k++) {
        if (!palive[k]) continue;
        if (t > pt[k]) { if (pvx[k] !== 0 && t - pt[k] < dt * 1.5) ring(px[k], pz[k], t, 0.25); px[k] += pvx[k] * dt; pz[k] += pvz[k] * dt; pvx[k] *= 1 - 0.3 * dt; pvz[k] *= 1 - 0.3 * dt; }
        if (t > pt[k] + 50) { palive[k] = 0; continue; }
        food++;
      }
      if (!food && t > S.feedT + 2) S.feeding = false;
    }

    for (let i = 0; i < n; i++) {
      const L = len[i];
      let m = mode[i];
      // ---- mood
      timer[i] -= dt;
      if (S.feeding && m !== MODE.FEED && delay[i] > -1) { delay[i] -= dt; if (delay[i] <= 0) { delay[i] = -2; m = mode[i] = MODE.FEED; kiss[i] = 0; } }
      if (m === MODE.FEED) {
        let k = pel[i];
        if (k < 0 || !palive[k]) {
          const got = choosePellet(i, t);
          if (!got) { m = mode[i] = MODE.MILL; timer[i] = 3 + 6 * r(); tx[i] = S.feedX + (r() - 0.5) * 7; tz[i] = S.feedZ + (r() - 0.5) * 7; td[i] = dTop[i] + r() * 0.5; vt[i] = L * 0.3; }
          else if (got === 2) { tx[i] = S.feedX; tz[i] = S.feedZ; td[i] = dTop[i] + 0.2; vt[i] = L * pace[i] * 0.9; }
          k = pel[i];
        }
        if (k >= 0 && timer[i] < 0) { pclaim[k] += 3; choosePellet(i, t); k = pel[i]; }      // cannot get at that one: try another
        if (k >= 0) {
          const nx = x[i] + Math.cos(h[i]) * L * 0.5, nz = z[i] + Math.sin(h[i]) * L * 0.5, dn = Math.hypot(px[k] - nx, pz[k] - nz);
          tx[i] = px[k]; tz[i] = pz[k];
          td[i] = dn < 3 + L ? dTop[i] - 0.05 : dTop[i] + 0.25;
          vt[i] = clamp(dn * 0.9, 0.3 * L, L * pace[i] * 1.25 + 0.6);
          if (dn < 0.28 + 0.08 * L && d[i] < dTop[i] + 0.15) {                 // got it: a mouth at the surface, a ring
            palive[k] = 0; pclaim[k] = 0; pel[i] = -1; S.stats.eaten++; gulp[i] = 1; ring(px[k], pz[k], t, 0.9);
          }
        }
      } else if (m === MODE.MILL) {
        if (timer[i] < 0) { delay[i] = 0; cruise(i, true); m = mode[i]; }
        else if (Math.hypot(tx[i] - x[i], tz[i] - z[i]) < L) { tx[i] = S.feedX + (r() - 0.5) * 8; tz[i] = S.feedZ + (r() - 0.5) * 8; }
      } else {
        const arrived = Math.hypot(tx[i] - x[i], tz[i] - z[i]) < 1.2 * L + 0.4;
        if (m === MODE.BEG) { if (bold[i] < boldEnough) cruise(i, true); else if (arrived || timer[i] < 0) beg(i); }
        else if (bold[i] >= boldEnough && (m === MODE.CRUISE || m === MODE.REST) && ((i + frame) & 31) === 0) beg(i);
        else if (m === MODE.REST) { if (timer[i] < 0) cruise(i); }
        else if (m === MODE.DART) { if (timer[i] < 0) cruise(i); }
        else if (arrived || timer[i] < 0) next(i);
        m = mode[i];
      }
      if (kiss[i] && d[i] <= dTop[i] + 0.02) { kiss[i] = 0; gulp[i] = 1; ring(x[i] + Math.cos(h[i]) * L * 0.5, z[i] + Math.sin(h[i]) * L * 0.5, t, 0.6); td[i] = dTop[i] + 0.3 + r() * 0.8; }

      // ---- feelers, every third frame: the bank, things in the water, the other fish
      const ch = Math.cos(h[i]), sh = Math.sin(h[i]);
      if ((i + frame) % 3 === 0) {
        const look = 1.3 * L + v[i] * 1.3;
        let av = 0, sl = 1, up = 0;
        const sC = sAt(x[i] + ch * look, z[i] + sh * look), edge = lim[i] - 0.03;
        if (sC > edge) {
          if (biasT[i] <= 0) {
            const sL = sAt(x[i] + Math.cos(h[i] + 0.9) * look, z[i] + Math.sin(h[i] + 0.9) * look), sR = sAt(x[i] + Math.cos(h[i] - 0.9) * look, z[i] + Math.sin(h[i] - 0.9) * look);
            bias[i] = sL < sR ? 1 : -1; biasT[i] = 1.5;
          }
          av = bias[i] * Math.min(1.7, 0.7 + 9 * (sC - edge)); sl = 0.7;
          if (m === MODE.REST) timer[i] = -1;
        }
        let home = 0;
        if (sNow[i] > lim[i] - 0.035) { home = clamp(wrap(Math.atan2(P.z - z[i], P.x - x[i]) - h[i]), -1.7, 1.7); if (home > -0.3 && home < 0.3) home = 0; else { sl = 0.7; if (m === MODE.REST) timer[i] = -1; } }      // too near the bank: make for the middle
        for (let k = 0; k < NO; k++) {
          const dx = ob[k * 3] - x[i], dz = ob[k * 3 + 1] - z[i], R = ob[k * 3 + 2], along = dx * ch + dz * sh, lat = dz * ch - dx * sh, room = R + 0.2 * L + 0.4;
          if (along > -0.3 * L && along < look + R && lat > -room && lat < room) { av = (lat > 0 ? -1 : 1) * (0.8 + 0.8 * (1 - Math.abs(lat) / room)); sl = Math.min(sl, 0.75); if (m === MODE.REST) timer[i] = -1; }
        }
        for (let j = 0; j < n; j++) {
          if (j === i) continue;
          const dx = x[j] - x[i], dz = z[j] - z[i], reach = 0.75 * (L + len[j]);
          if (dx > reach || dx < -reach || dz > reach || dz < -reach) continue;
          const dd = d[j] - d[i], tall = 0.7 * (hgt[i] + hgt[j]);
          if (dd > tall || dd < -tall) continue;
          up += dd > 0 || (dd === 0 && i < j) ? -1 : 1;                            // the upper one rises, the lower one sinks
          const along = dx * ch + dz * sh, lat = dz * ch - dx * sh;
          if (along > 0 && along < reach && Math.abs(lat) < 0.3 * (L + len[j]) && m !== MODE.FEED) { if (av === 0) av = lat > 0 ? -0.5 : 0.5; sl = Math.min(sl, 0.75); }
        }
        if (home !== 0) av = home;
        if (av === 0) biasT[i] = 0; else biasT[i] -= dt * 3;
        bias[i] = av === 0 ? 0 : bias[i]; slow[i] = sl; lift[i] = clamp(up, -1, 1);
        // remember the steer for the frames in between
        S._av[i] = av;
      }
      const av = S._av[i];

      // ---- speed: work up to it briskly, glide down from it slowly
      const vT = vt[i] * slow[i], acc = vT > v[i] ? 1.8 : 0.5;
      const thrust = Math.max(0, vT - v[i]) / L;
      v[i] += (vT - v[i]) * Math.min(1, dt * acc);
      const rel = v[i] / L;
      phase[i] += TAU * (0.55 + 1.7 * rel + 1.6 * thrust) * dt; if (phase[i] > 1000) phase[i] -= 160 * TAU;
      amp[i] += (clamp(0.22 + 0.85 * rel + 1.2 * thrust, 0.15, 1.5) - amp[i]) * Math.min(1, dt * 3);
      fin[i] += (clamp(1.1 - rel * 1.4, 0.1, 1) - fin[i]) * Math.min(1, dt * 2);
      // ---- turn: no tighter than its turning circle allows at this speed
      const tdx = tx[i] - x[i], tdz = tz[i] - z[i], dist = Math.hypot(tdx, tdz);
      let dh = av !== 0 ? av : wrap(Math.atan2(tdz, tdx) - h[i]);
      const Rt = TURN * L;
      if (av === 0 && dist < 2 * Rt * Math.abs(Math.sin(dh)) * 1.05) dh = 0;       // too close beside it to turn onto: carry straight on and come round
      const wmax = v[i] / Rt;
      w[i] += (clamp(dh * 2.4, -wmax, wmax) - w[i]) * Math.min(1, dt * 5);
      w[i] = clamp(w[i], -wmax, wmax);
      h[i] = wrap(h[i] + w[i] * dt);

      x[i] += Math.cos(h[i]) * v[i] * dt; z[i] += Math.sin(h[i]) * v[i] * dt;

      // ---- depth
      const vdT = clamp((td[i] - d[i]) * 1.3, -0.1 - 0.4 * v[i], 0.1 + 0.4 * v[i]) + lift[i] * 0.25;
      vd[i] += (vdT - vd[i]) * Math.min(1, dt * 3);
      d[i] += vd[i] * dt;
      pitch[i] += (Math.atan2(-vd[i], Math.max(v[i], 0.4 * L)) + 0.5 * gulp[i] - pitch[i]) * Math.min(1, dt * 4);
      roll[i] += (clamp(-w[i] * 0.3, -0.5, 0.5) - roll[i]) * Math.min(1, dt * 3);
      bend[i] += (clamp(w[i] * L / Math.max(v[i], 0.2 * L), -1.6, 1.6) - bend[i]) * Math.min(1, dt * 6);
      if (gulp[i] > 0) gulp[i] = Math.max(0, gulp[i] - dt * 2.2);
    }

    // ---- nothing passes through anything: other fish, the bank, the piles and boulders, the bottom (twice over, so they settle)
    for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < n; i++) {
      const Li = len[i];
      for (let j = i + 1; j < n; j++) {
        const Lj = len[j], reach = 0.42 * (Li + Lj), dx = x[j] - x[i], dz = z[j] - z[i];
        if (dx > reach || dx < -reach || dz > reach || dz < -reach) continue;
        const dd = d[j] - d[i]; if (dd > 0.13 * (Li + Lj) || dd < -0.13 * (Li + Lj)) continue;
        const ci = Math.cos(h[i]), si = Math.sin(h[i]), cj = Math.cos(h[j]), sj = Math.sin(h[j]);
        for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) {
          const oa = BALLS[a][0] * Li, ob2 = BALLS[b][0] * Lj, rr = BALLS[a][1] * Li + BALLS[b][1] * Lj;
          const ex = x[j] + cj * ob2 - x[i] - ci * oa, ez = z[j] + sj * ob2 - z[i] - si * oa, ey = d[j] - d[i];
          const q = ex * ex + ez * ez + ey * ey;
          if (q >= rr * rr) continue;
          const e = Math.sqrt(q), pen = (rr - e) * 0.5, k = e > 1e-4 ? pen / e : 0;
          let ux = ex * k, uz = ez * k, uy = ey * k; if (e <= 1e-4) uy = i < j ? pen : -pen;
          x[i] -= ux; z[i] -= uz; d[i] -= uy; x[j] += ux; z[j] += uz; d[j] += uy; S.stats.pushes++;
        }
      }
    }
    for (let i = 0; i < n; i++) {
      const s = sAt(x[i], z[i]), smax = lim[i] + 0.03;
      if (s > smax) { const k = smax / s; x[i] = P.x + (x[i] - P.x) * k; z[i] = P.z + (z[i] - P.z) * k; }
    }
    for (let i = 0; i < n; i++) {
      const L = len[i];
      for (let k = 0; k < NO; k++) {
        const R = ob[k * 3 + 2] + 0.115 * L; { const dx = x[i] - ob[k * 3], dz = z[i] - ob[k * 3 + 1], far = R + 0.5 * L; if (dx > far || dx < -far || dz > far || dz < -far) continue; }
        for (let a = 0; a < 4; a++) {        // four points along the body
          const o = (0.5 - a * 0.25) * L, bx = x[i] + Math.cos(h[i]) * o, bz = z[i] + Math.sin(h[i]) * o, dx = bx - ob[k * 3], dz = bz - ob[k * 3 + 1], q = dx * dx + dz * dz;
          if (q < R * R) { const e = Math.sqrt(q) || 1e-3, p = (R - e) / e; x[i] += dx * p; z[i] += dz * p; }
        }
      }
    }
    }
    for (let i = 0; i < n; i++) {
      const s = sAt(x[i], z[i]); sNow[i] = s;
      const lo = floorFor(i, s), hi = dTop[i] - 0.06 * gulp[i] - (mode[i] === MODE.FEED ? 0.05 : 0);
      if (d[i] > lo) { d[i] = lo; if (vd[i] > 0) vd[i] = 0; } if (d[i] < hi) { d[i] = hi; if (vd[i] < 0) vd[i] = 0; }
    }
  };
  S._av = F(n);
  return S;
}
