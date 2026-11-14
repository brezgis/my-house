// Getting about the garden: a 1 ft grid over the grounds, built at run time.
// Blocked: anything solid near the ground (fences, raised beds, benches, hives,
// tree trunks, boulders), the house and its terrace, the koi pond, the flower
// borders (soft, but nobody walks through the cosmos), and the island's edge.
// It looks to a Mover exactly like the house plan does (one floor, no doors),
// so the gardeners use the same path-following as the indoor staff.

import { POND } from '../garden/pond.js';
import { ISLAND, islandEdge } from '../garden.js';

const X0 = -256, Z0 = -281, NX = 502, NZ = 502, N = NX * NZ, CELL = 1;           // the whole island
// Flower borders and beds that are planted but not solid (from garden.js)
const BEDS = [
  { x: -6.5, z: 39, rx: 5.4, rz: 19.8 }, { x: 8.5, z: 30, rx: 4.2, rz: 10.3 }, { x: -19, z: 14.6, rx: 15.3, rz: 3.2 },
  { x: -2, z: -90, rx: 9.5, rz: 39 },                                             // the long border, both sides of its walk
  { x: 96, z: -134, rx: 4, rz: 8 }, { x: 95, z: -124, rx: 3.5, rz: 3.5 },        // lavender and catmint by the hives
];

export function makeOutdoor(ctx) {
  const walk = new Uint8Array(N), clear = new Float32Array(N), door = new Int16Array(N).fill(-1);
  const floors = [{ walk, clear, door, cells: [] }];
  let version = 0;
  const cellOf = (x, z) => { const i = Math.floor((x - X0) / CELL), k = Math.floor((z - Z0) / CELL); return i < 0 || k < 0 || i >= NX || k >= NZ ? -1 : k * NX + i; };
  const cx = c => X0 + ((c % NX) + 0.5) * CELL, cz = c => Z0 + (Math.floor(c / NX) + 0.5) * CELL;
  const inEll = (x, z, e, pad = 0) => ((x - e.x) / (e.rx + pad)) ** 2 + ((z - e.z) / (e.rz + pad)) ** 2 < 1;

  function rebuild() {
    for (let c = 0; c < N; c++) {
      const x = cx(c), z = cz(c);
      let ok = Math.hypot(x - ISLAND.x, z - ISLAND.z) < islandEdge(Math.atan2(z - ISLAND.z, x - ISLAND.x)) * 0.965 - 8;      // well inside the invisible barrier, which follows the island's outline (as a circle of the widest radius, a third of these cells were in the air)
      if (ok && x > -36 && x < 24 && z > -50 && z < 15) ok = false;              // the house, terrace, porch and steps
      if (ok && x > 12 && x < 24 && z > -60 && z <= -50) ok = false;             // the screened porch and back steps
      if (ok && inEll(x, z, POND, 2)) ok = false;
      if (ok && BEDS.some(b => inEll(x, z, b))) ok = false;
      walk[c] = ok ? 1 : 0;
    }
    for (const b of ctx.colliders) {
      if (b.off || b.staff || b.y0 > 2.5 || b.y1 < 0.4 || b.y0 > 9) continue;
      const i0 = Math.max(0, Math.floor((b.x0 - X0) / CELL)), i1 = Math.min(NX - 1, Math.floor((b.x1 - X0) / CELL));
      const k0 = Math.max(0, Math.floor((b.z0 - Z0) / CELL)), k1 = Math.min(NZ - 1, Math.floor((b.z1 - Z0) / CELL));
      if (i1 - i0 > 60 && k1 - k0 > 60) continue;
      for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) walk[k * NX + i] = 0;
    }
    // clearance in feet (3-4 chamfer)
    for (let c = 0; c < N; c++) clear[c] = walk[c] ? 1e6 : 0;
    const relax = (c, n, w) => { if (clear[n] + w < clear[c]) clear[c] = clear[n] + w; };
    for (let k = 0; k < NZ; k++) for (let i = 0; i < NX; i++) { const c = k * NX + i; if (!clear[c]) continue; if (i > 0) relax(c, c - 1, 3); else clear[c] = 3; if (k > 0) { relax(c, c - NX, 3); if (i > 0) relax(c, c - NX - 1, 4); if (i < NX - 1) relax(c, c - NX + 1, 4); } }
    for (let k = NZ - 1; k >= 0; k--) for (let i = NX - 1; i >= 0; i--) { const c = k * NX + i; if (!clear[c]) continue; if (i < NX - 1) relax(c, c + 1, 3); if (k < NZ - 1) { relax(c, c + NX, 3); if (i < NX - 1) relax(c, c + NX + 1, 4); if (i > 0) relax(c, c + NX - 1, 4); } }
    floors[0].cells = [];
    for (let c = 0; c < N; c++) { clear[c] /= 3; if (walk[c]) floors[0].cells.push(c); }
    version++;
  }

  // need is in feet of clearance (the indoor plan counts half-foot cells; the gardeners ask in feet)
  const free = (f, c, need) => c >= 0 && walk[c] === 1 && clear[c] >= need;
  const freeAt = (f, x, z, need) => free(0, cellOf(x, z), need);
  function nearest(f, x, z, need, maxR = 6, opener, ok = null) {
    const c0 = cellOf(x, z); if (c0 < 0) return -1;
    const i0 = c0 % NX, k0 = Math.floor(c0 / NX), R = Math.ceil(maxR);
    let best = -1, bd = 1e9;
    for (let k = Math.max(0, k0 - R); k <= Math.min(NZ - 1, k0 + R); k++) for (let i = Math.max(0, i0 - R); i <= Math.min(NX - 1, i0 + R); i++) {
      const c = k * NX + i; if (!free(0, c, need) || (ok && !ok(c))) continue;
      const d = (cx(c) - x) ** 2 + (cz(c) - z) ** 2; if (d < bd) { bd = d; best = c; }
    }
    return bd <= maxR * maxR ? best : -1;
  }
  const g = new Float32Array(N), from = new Int32Array(N), seen = new Uint32Array(N), done = new Uint32Array(N);
  let gen = 0; const heap = [];
  const push = (n, f) => { heap.push([f, n]); let i = heap.length - 1; while (i) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = 2 * i + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  const NB = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.414], [1, -1, 1.414], [-1, 1, 1.414], [-1, -1, 1.414]];
  function clearLine(x0, z0, x1, z1, need) {
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.ceil(L / 0.4));
    for (let s = 0; s <= n; s++) { const u = s / n; if (!freeAt(0, x0 + (x1 - x0) * u, z0 + (z1 - z0) * u, need)) return false; }
    return true;
  }
  function path(f0, x0, z0, f1, x1, z1, need) {
    let c0 = cellOf(x0, z0); if (!free(0, c0, need)) c0 = nearest(0, x0, z0, need, 4);
    let c1 = cellOf(x1, z1); if (!free(0, c1, need)) c1 = nearest(0, x1, z1, need, 5);
    if (c0 < 0 || c1 < 0) return null;
    gen++; heap.length = 0;
    const tx = cx(c1), tz = cz(c1);
    g[c0] = 0; seen[c0] = gen; from[c0] = -1; push(c0, 0);
    let steps = 0, found = false;
    while (heap.length && steps++ < 260000) {
      const [, c] = pop(); if (done[c] === gen) continue; done[c] = gen;
      if (c === c1) { found = true; break; }
      const i = c % NX, k = Math.floor(c / NX);
      for (const [di, dk, w] of NB) {
        const ii = i + di, kk = k + dk; if (ii < 0 || kk < 0 || ii >= NX || kk >= NZ) continue;
        const m = kk * NX + ii; if (!free(0, m, need) || done[m] === gen) continue;
        if (di && dk && (!free(0, k * NX + ii, need) || !free(0, kk * NX + i, need))) continue;
        const ng = g[c] + w * (1 + Math.max(0, 4 - clear[m]) * 0.25);
        if (seen[m] !== gen || ng < g[m]) { seen[m] = gen; g[m] = ng; from[m] = c; push(m, ng + Math.hypot(cx(m) - tx, cz(m) - tz)); }
      }
    }
    if (!found) return null;
    const pts = []; for (let c = c1; c >= 0; c = from[c]) pts.push({ x: cx(c), z: cz(c), f: 0 }); pts.reverse();
    const out = [{ x: x0, z: z0, f: 0 }]; let a = 0;
    while (a < pts.length - 1) {
      const p0 = out[out.length - 1]; let b = a + 1, miss = 0;
      for (let j = a + 2; j < pts.length; j++) { if (clearLine(p0.x, p0.z, pts[j].x, pts[j].z, need)) { b = j; miss = 0; } else if (++miss > 10) break; }
      out.push(pts[b]); a = b;
    }
    if (out.length < 2) out.push(pts[pts.length - 1]);
    return out;
  }
  // Seeing: only tall things (trunks, the house, hedges) block the view
  function see(f, x0, z0, x1, z1) {
    const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.ceil(L / 1.5));
    for (let s = 1; s < n; s++) { const u = s / n, x = x0 + (x1 - x0) * u, z = z0 + (z1 - z0) * u; if (x > -34 && x < 22 && z > -48 && z < 1) return false; }
    return true;
  }
  function randomSpot(f, need, rnd, box = null, minClear = need) {
    const cells = floors[0].cells;
    for (let t = 0; t < 300; t++) { const c = cells[Math.floor(rnd() * cells.length)]; if (clear[c] < minClear) continue; const x = cx(c), z = cz(c); if (box && !(x > box.x0 && x < box.x1 && z > box.z0 && z < box.z1)) continue; return { x, z, f: 0 }; }
    return null;
  }
  return { rebuild, free, freeAt, nearest, path, see, randomSpot, cellOf, cx, cz, floors, doors: [], FLOORS: [0], stair: null, floorY: () => 0.05, floorOf: () => 0, get version() { return version; }, CELL };
}
