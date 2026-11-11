// Getting about the house. A walkable grid per floor (half-foot cells), built
// at run time from the house's own colliders and floor surfaces, so it follows
// the furniture wherever the room designers put it. A* across both floors (the
// stair is a single link between them), then the path is pulled taut.
//
// Doors are passable cells that know which door they belong to: robots open
// them; cats and the vacuum treat a closed door as a wall.

import { F1, F2 } from '../house.js';

export const CELL = 0.5;
const X0 = -23.5, Z0 = -42.0, NX = 94, NZ = 88, N = NX * NZ;
const FLOORS = [F1, F2];
const BAND_LO = 0.15, BAND_HI = 4.6;          // anything in this band above the floor is in the way

export function makeNav(ctx) {
  const { house, colliders, scene, THREE } = ctx;
  const doors = house.doors.filter(d => !d.fixed);
  const stops = new Set(house.doors.map(d => d.stop));
  const floors = FLOORS.map(y => ({ y, walk: new Uint8Array(N), clear: new Float32Array(N), wall: new Uint8Array(N), door: new Int16Array(N).fill(-1), cells: [] }));
  const ramp = house.surfaces.find(s => s.ramp && Math.abs(s.h - F1) < 0.05 && Math.abs(s.h2 - F2) < 0.05);
  let version = 0, stair = null;

  const cellOf = (x, z) => { const i = Math.floor((x - X0) / CELL), k = Math.floor((z - Z0) / CELL); return i < 0 || k < 0 || i >= NX || k >= NZ ? -1 : k * NX + i; };
  const cx = c => X0 + ((c % NX) + 0.5) * CELL, cz = c => Z0 + (Math.floor(c / NX) + 0.5) * CELL;
  const floorOf = y => (y < (F1 + F2) / 2 ? 0 : 1);
  const roomAt = (x, y, z) => house.rooms.find(r => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1 && y >= r.y0 && y <= r.y1) ?? null;

  // Things the room designers placed as models without colliders (plants, side tables, lamps)
  function modelBoxes(skip) {
    const out = [], box = new THREE.Box3();
    for (const o of scene.children) {
      if (o === skip || o.isLight || o.isSprite || o.isPoints || o.userData.staff) continue;
      if (o.isMesh && o.geometry?.type === 'PlaneGeometry') continue;         // pictures, rugs, screens
      if (house.doors.some(d => Math.abs(o.position.x - d.x) < 0.01 && Math.abs(o.position.z - d.z) < 0.01)) continue;
      box.setFromObject(o);
      if (box.isEmpty()) continue;
      const sx = box.max.x - box.min.x, sz = box.max.z - box.min.z, sy = box.max.y - box.min.y;
      if (sx > 7 || sz > 7 || sy < 0.35 || sx < 0.15 || sz < 0.15) continue;
      out.push({ x0: box.min.x, x1: box.max.x, y0: box.min.y, y1: box.max.y, z0: box.min.z, z1: box.max.z });
    }
    return out;
  }

  function rebuild(skip) {
    const extra = modelBoxes(skip);
    for (const [fi, F] of floors.entries()) {
      const { walk, clear, wall, door } = F, y = F.y;
      walk.fill(0); wall.fill(0); door.fill(-1);
      const rooms = house.rooms.filter(r => Math.abs(r.y0 - (y - 1)) < 0.05);
      const surfs = house.surfaces.filter(s => !s.ramp && Math.abs(s.h - y) < 0.05);
      for (let c = 0; c < N; c++) {
        const x = cx(c), z = cz(c);
        if (!surfs.some(s => x >= s.x0 && x <= s.x1 && z >= s.z0 && z <= s.z1)) continue;
        if (!rooms.some(r => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1)) continue;
        if (fi === 0 && ramp && x >= ramp.x0 - 0.1 && x <= ramp.x1 + 0.1 && z >= ramp.z0 && z <= ramp.z1 + 0.1) continue;   // under the stair
        walk[c] = 1;
      }
      const stamp = (b, isWall) => {
        const i0 = Math.max(0, Math.floor((b.x0 - X0) / CELL)), i1 = Math.min(NX - 1, Math.floor((b.x1 - X0) / CELL));
        const k0 = Math.max(0, Math.floor((b.z0 - Z0) / CELL)), k1 = Math.min(NZ - 1, Math.floor((b.z1 - Z0) / CELL));
        for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) { const c = k * NX + i; if (isWall) wall[c] = 1; else walk[c] = walk[c] ? 2 : 0; }
      };
      for (const b of colliders) {
        if (stops.has(b) || b.off || b.staff) continue;
        if (b.y0 >= y + BAND_HI || b.y1 <= y + BAND_LO) continue;
        stamp(b, false);
        if (b.y1 >= y + 6.4 && b.y0 <= y + 1.5) stamp(b, true);                  // walls and tall cases block the view too
      }
      for (const b of extra) if (b.y0 < y + BAND_HI && b.y1 > y + BAND_LO && b.y0 > y - 0.6) stamp(b, false);
      for (let c = 0; c < N; c++) if (walk[c] === 2) walk[c] = 0;
      for (const d of house.doors) if (d.fixed) stamp(d.stop, true);
      // Door cells: the opening itself, a little either side of the leaf
      doors.forEach((d, n) => {
        const s = d.stop; if (s.y0 > y + 1 || s.y1 < y + 1) return;
        const thinX = s.x1 - s.x0 < s.z1 - s.z0, pad = 0.4;
        const b = thinX ? { x0: s.x0 - pad, x1: s.x1 + pad, z0: s.z0 + 0.05, z1: s.z1 - 0.05 } : { x0: s.x0 + 0.05, x1: s.x1 - 0.05, z0: s.z0 - pad, z1: s.z1 + pad };
        const i0 = Math.floor((b.x0 - X0) / CELL), i1 = Math.floor((b.x1 - X0) / CELL), k0 = Math.floor((b.z0 - Z0) / CELL), k1 = Math.floor((b.z1 - Z0) / CELL);
        for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) { const c = k * NX + i; if (c >= 0 && c < N && walk[c]) door[c] = n; }
        d.staffFloor = fi;
      });
      // Clearance: distance to the nearest unwalkable cell, in cells (3-4 chamfer)
      for (let c = 0; c < N; c++) clear[c] = walk[c] ? 1e6 : 0;
      const relax = (c, n, w) => { if (clear[n] + w < clear[c]) clear[c] = clear[n] + w; };
      for (let k = 0; k < NZ; k++) for (let i = 0; i < NX; i++) {
        const c = k * NX + i; if (!clear[c]) continue;
        if (i > 0) relax(c, c - 1, 3); else clear[c] = Math.min(clear[c], 3);
        if (k > 0) { relax(c, c - NX, 3); if (i > 0) relax(c, c - NX - 1, 4); if (i < NX - 1) relax(c, c - NX + 1, 4); }
      }
      for (let k = NZ - 1; k >= 0; k--) for (let i = NX - 1; i >= 0; i--) {
        const c = k * NX + i; if (!clear[c]) continue;
        if (i < NX - 1) relax(c, c + 1, 3);
        if (k < NZ - 1) { relax(c, c + NX, 3); if (i < NX - 1) relax(c, c + NX + 1, 4); if (i > 0) relax(c, c + NX - 1, 4); }
      }
      F.cells = [];
      for (let c = 0; c < N; c++) { clear[c] /= 3; if (walk[c]) F.cells.push(c); }
    }
    // The stair: one link from the hall to the landing
    stair = null;
    if (ramp) {
      const x = (ramp.x0 + ramp.x1) / 2;
      const lo = nearest(0, x, ramp.z1 + 0.8, 2, 3), hi = nearest(1, x, ramp.z0 - 0.9, 2, 3);
      if (lo >= 0 && hi >= 0) stair = { lo, hi, x, zLo: ramp.z1, zHi: ramp.z0 };
    }
    version++;
  }

  // Can an agent needing `need` cells of clearance stand here?
  function free(f, c, need, opener) {
    const F = floors[f];
    if (c < 0 || !F.walk[c]) return false;
    const d = F.door[c];
    if (d >= 0 && !opener && !doors[d].isOpen) return false;
    return F.clear[c] >= need;
  }
  const freeAt = (f, x, z, need, opener) => free(f, cellOf(x, z), need, opener);

  function nearest(f, x, z, need, maxR = 6, opener = false, ok = null) {
    const c0 = cellOf(x, z); if (c0 < 0) return -1;
    const i0 = c0 % NX, k0 = Math.floor(c0 / NX), R = Math.ceil(maxR / CELL);
    let best = -1, bd = 1e9;
    for (let k = Math.max(0, k0 - R); k <= Math.min(NZ - 1, k0 + R); k++) for (let i = Math.max(0, i0 - R); i <= Math.min(NX - 1, i0 + R); i++) {
      const c = k * NX + i; if (!free(f, c, need, opener) || floors[f].door[c] >= 0 || (ok && !ok(c))) continue;
      const d = (cx(c) - x) ** 2 + (cz(c) - z) ** 2;
      if (d < bd) { bd = d; best = c; }
    }
    return bd <= maxR * maxR ? best : -1;
  }

  // ---- A* ------------------------------------------------------------------------
  const g = new Float32Array(2 * N), from = new Int32Array(2 * N), seen = new Uint32Array(2 * N), done = new Uint32Array(2 * N);
  let gen = 0;
  const heap = [];
  const push = (n, f) => { heap.push([f, n]); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  const NB = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];

  function search(f0, c0, f1, c1, need, opener, limit = 60000) {
    gen++; heap.length = 0;
    const tx = cx(c1), tz = cz(c1);
    const hz = (f, c) => { const x = cx(c), z = cz(c); if (f === f1) return Math.hypot(x - tx, z - tz); return stair ? Math.hypot(x - cx(f ? stair.hi : stair.lo), z - cz(f ? stair.hi : stair.lo)) + 13 + Math.hypot(cx(f ? stair.lo : stair.hi) - tx, cz(f ? stair.lo : stair.hi) - tz) : 1e5; };
    const s = f0 * N + c0, goal = f1 * N + c1;
    g[s] = 0; seen[s] = gen; from[s] = -1; push(s, hz(f0, c0));
    let steps = 0;
    while (heap.length && steps++ < limit) {
      const [, n] = pop();
      if (done[n] === gen) continue; done[n] = gen;
      if (n === goal) break;
      const f = n >= N ? 1 : 0, c = n - f * N, i = c % NX, k = Math.floor(c / NX), F = floors[f];
      const relax = (m, cost) => { if (done[m] === gen) return; const ng = g[n] + cost; if (seen[m] !== gen || ng < g[m]) { seen[m] = gen; g[m] = ng; from[m] = n; const mf = m >= N ? 1 : 0; push(m, ng + hz(mf, m - mf * N)); } };
      for (const [di, dk, w] of NB) {
        const ii = i + di, kk = k + dk; if (ii < 0 || kk < 0 || ii >= NX || kk >= NZ) continue;
        const m = kk * NX + ii;
        if (!free(f, m, need, opener)) continue;
        if (di && dk && (!free(f, k * NX + ii, need, opener) || !free(f, kk * NX + i, need, opener))) continue;
        const tight = F.door[m] >= 0 ? 0 : Math.max(0, 3 - F.clear[m]) * 0.35;      // keep off the furniture where there is room
        relax(f * N + m, w * CELL * (1 + tight));
      }
      if (stair && f === 0 && c === stair.lo) relax(N + stair.hi, 14);
      if (stair && f === 1 && c === stair.hi) relax(stair.lo, 14);
    }
    if (done[goal] !== gen) return null;
    const out = [];
    for (let n = goal; n >= 0; n = from[n]) out.push(n);
    return out.reverse();
  }

  // Line of sight on one floor for an agent of this size
  function clearLine(f, x0, z0, x1, z1, need, opener) {
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.ceil(L / 0.2));
    for (let s = 0; s <= n; s++) { const u = s / n; if (!freeAt(f, x0 + (x1 - x0) * u, z0 + (z1 - z0) * u, need, opener)) return false; }
    return true;
  }
  // Can one see from here to there (walls and closed doors only)?
  function see(f, x0, z0, x1, z1) {
    const F = floors[f], L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.ceil(L / 0.35));
    for (let s = 1; s < n; s++) {
      const u = s / n, c = cellOf(x0 + (x1 - x0) * u, z0 + (z1 - z0) * u); if (c < 0) return false;
      if (F.wall[c]) return false;
      const d = F.door[c]; if (d >= 0 && !doors[d].isOpen) return false;
    }
    return true;
  }

  // A taut path: [{ x, z, f }], with the stair as two consecutive points on different floors
  function path(f0, x0, z0, f1, x1, z1, need, opener) {
    let c0 = cellOf(x0, z0);
    if (!free(f0, c0, need, opener)) c0 = nearest(f0, x0, z0, need, 3, opener);
    let c1 = cellOf(x1, z1);
    if (!free(f1, c1, need, opener) || floors[f1].door[c1] >= 0) c1 = nearest(f1, x1, z1, need, 4, opener);
    if (c0 < 0 || c1 < 0) return null;
    if (f0 !== f1 && !stair) return null;
    const nodes = search(f0, c0, f1, c1, need, opener);
    if (!nodes) return null;
    const pts = nodes.map(n => { const f = n >= N ? 1 : 0, c = n - f * N; return { x: cx(c), z: cz(c), f }; });
    pts[pts.length - 1] = { ...pts[pts.length - 1] };
    // pull taut, floor by floor: from each anchor, reach as far ahead as can be seen
    const out = [{ x: x0, z: z0, f: f0 }];
    let a = 0;
    while (a < pts.length - 1) {
      if (pts[a + 1].f !== pts[a].f) { out.push(pts[a + 1]); a++; continue; }
      const from = out[out.length - 1];
      let b = a + 1, misses = 0;
      for (let j = a + 2; j < pts.length && pts[j].f === pts[a].f; j++) {
        if (clearLine(pts[a].f, from.x, from.z, pts[j].x, pts[j].z, need, opener)) { b = j; misses = 0; } else if (++misses > 8) break;
      }
      out.push(pts[b]); a = b;
    }
    if (out.length < 2) out.push(pts[pts.length - 1]);
    return out;
  }

  // Height of the floor under a point (the stair rises along it)
  function floorY(f, x, z) {
    if (ramp && x >= ramp.x0 - 0.3 && x <= ramp.x1 + 0.3 && z >= ramp.z0 && z <= ramp.z1) return ramp.h + (ramp.h2 - ramp.h) * ((ramp.z1 - z) / (ramp.z1 - ramp.z0));
    return FLOORS[f];
  }

  // A random walkable cell, optionally within a room, with room to spare
  function randomSpot(f, need, rnd = Math.random, room = null, minClear = need) {
    const F = floors[f];
    for (let tries = 0; tries < 200; tries++) {
      const c = F.cells[Math.floor(rnd() * F.cells.length)];
      if (c === undefined) return null;
      if (F.door[c] >= 0 || F.clear[c] < minClear) continue;
      const x = cx(c), z = cz(c);
      if (room && !(x >= room.x0 && x <= room.x1 && z >= room.z0 && z <= room.z1)) continue;
      return { x, z, f };
    }
    return null;
  }

  return {
    rebuild, free, freeAt, nearest, path, clearLine, see, floorY, floorOf, roomAt, randomSpot, cellOf, cx, cz, floors, doors,
    get version() { return version; }, get stair() { return stair; }, FLOORS, CELL,
  };
}

// ---- Following a path ----------------------------------------------------------------
// Shared by everyone who moves. Speeds in feet per second.
export class Mover {
  constructor(nav, { need = 2, opener = false, speed = 3, turn = 5, ease = 3 } = {}) {
    this.nav = nav; this.ease = ease; this.need = need; this.opener = opener; this.speed = speed; this.turnRate = turn;
    this.x = 0; this.z = 0; this.f = 0; this.y = nav.FLOORS[0]; this.yaw = 0; this.v = 0;
    this.path = null; this.i = 0; this.goal = null; this.ver = -1; this.wait = 0; this.blockedFor = 0;
    this.avoid = null;            // (x, z) => true if someone is standing there
    this.onDoor = null;           // (door) => void, when an opener opens one
  }
  place(x, z, f) { this.x = x; this.z = z; this.f = f; this.y = this.nav.floorY(f, x, z); this.path = null; }
  goTo(f, x, z) {
    const p = this.nav.path(this.f, this.x, this.z, f, x, z, this.need, this.opener);
    this.goal = { f, x, z }; this.ver = this.nav.version;
    if (!p) { this.path = null; return false; }
    this.path = p; this.i = 1; this.blockedFor = 0;
    return true;
  }
  stop() { this.path = null; this.goal = null; }
  get moving() { return !!this.path; }
  remaining() { if (!this.path) return 0; let d = 0, px = this.x, pz = this.z; for (let j = this.i; j < this.path.length; j++) { d += Math.hypot(this.path[j].x - px, this.path[j].z - pz); px = this.path[j].x; pz = this.path[j].z; } return d; }
  face(yaw, dt) { let d = yaw - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); this.yaw += d * Math.min(1, dt * this.turnRate); }
  faceTo(x, z, dt) { if (Math.hypot(x - this.x, z - this.z) > 0.05) this.face(Math.atan2(x - this.x, z - this.z), dt); }

  // -> 'idle' | 'moving' | 'arrived' | 'waiting' | 'failed'
  update(dt, speedScale = 1) {
    if (!this.path) { this.v = Math.max(0, this.v - dt * 4); return 'idle'; }
    const nav = this.nav;
    if (this.ver !== nav.version && this.goal) { if (!this.goTo(this.goal.f, this.goal.x, this.goal.z)) return 'failed'; }
    if (this.wait > 0) { this.wait -= dt; this.v = 0; return 'waiting'; }
    const p = this.path[this.i], stairLeg = p.f !== this.f || (this.i > 0 && this.path[this.i - 1].f !== p.f);
    // Doors ahead
    if (!stairLeg) {
      const dx = p.x - this.x, dz = p.z - this.z, L = Math.hypot(dx, dz), look = Math.min(L, 3.2), F = nav.floors[this.f];
      for (let s = 0.3; s <= look; s += 0.25) {
        const c = nav.cellOf(this.x + (dx / L) * s, this.z + (dz / L) * s), d = c >= 0 ? F.door[c] : -1;
        if (d >= 0 && !nav.doors[d].isOpen) {
          if (this.opener) { this.onDoor?.(nav.doors[d]); this.wait = 0.7; return 'waiting'; }
          this.path = null; return 'failed';
        }
      }
    }
    const want = this.speed * speedScale;
    const dx = p.x - this.x, dz = p.z - this.z, L = Math.hypot(dx, dz);
    if (this.avoid && L > 0.01 && this.avoid(this.x + (dx / L) * 1.1, this.z + (dz / L) * 1.1)) {
      this.v = Math.max(0, this.v - dt * 6); this.blockedFor += dt;
      this.faceTo(p.x, p.z, dt);
      const inDoor = nav.doors.some(d => d.staffFloor === this.f && Math.hypot(d.cx - this.x, d.cz - this.z) < 2.4);   // never stand waiting in a doorway
      if (this.blockedFor > (inDoor ? 0.6 : 2.5) && this.goal) { this.blockedFor = 0; return 'failed'; }
      return 'waiting';
    }
    this.blockedFor = 0;
    // ease in and out
    const left = this.remaining();
    const target = Math.min(want, 0.3 + left * this.ease * 0.4);
    this.v += (target - this.v) * Math.min(1, dt * this.ease);
    const yawTo = Math.atan2(dx, dz);
    this.face(yawTo, dt);
    const off = Math.abs(Math.atan2(Math.sin(yawTo - this.yaw), Math.cos(yawTo - this.yaw)));
    const step = this.v * dt * Math.max(0.12, Math.cos(Math.min(off, 1.45)));
    if (L <= step || L < 0.05) {
      this.x = p.x; this.z = p.z; this.f = p.f; this.i++;
      if (this.i >= this.path.length) { this.path = null; this.y = nav.floorY(this.f, this.x, this.z); return 'arrived'; }
      this.y = nav.floorY(this.f, this.x, this.z); return 'moving';
    } else {
      const nx = this.x + (dx / L) * step, nz = this.z + (dz / L) * step;
      // never step into anything solid, whatever the path says (a corner cut from an awkward start)
      if (!stairLeg && !nav.freeAt(this.f, nx, nz, this.need > 1.5 ? 1 : 0.6, this.opener) && nav.freeAt(this.f, this.x, this.z, this.need > 1.5 ? 1 : 0.6, this.opener)) { this.blockedFor += dt; if (this.blockedFor > 1 && this.goal) { this.blockedFor = 0; return 'failed'; } return 'waiting'; }
      this.x = nx; this.z = nz;
    }
    // height: along the stair the floor rises under you
    if (stairLeg) {
      const st = nav.stair;
      this.y = st && this.z < st.zHi ? nav.FLOORS[1] : nav.floorY(0, this.x, this.z);
      this.f = this.y > (nav.FLOORS[0] + nav.FLOORS[1]) / 2 ? 1 : 0;
    } else this.y = nav.floorY(this.f, this.x, this.z);
    return 'moving';
  }
}
