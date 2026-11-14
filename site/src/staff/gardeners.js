// The gardeners: Bramble and Thistle, the outdoor branch of the family. Same
// manners as the house staff (they are Robots, see robots.js): unhurried, they
// turn to you to speak and hold still until you are done, keep a polite 5-6 ft,
// and only one robot attends you at a time. Outside, the policy is theirs:
//
//   - she steps outside: the nearer gardener finds some work in her part of the
//     garden (once per outing; they do not trail after her). When she lingers within
//     sight, that one walks over, stops a polite way off and introduces itself:
//     name, what it does here, a little of who it is. Each introduces itself once
//     in a visit (H.mem.met); after that it is "hello again".
//   - spoken to (E), they are company first and service second: the card leads with
//     something not yet talked about (what she is standing next to, themselves, each
//     other, the indoor staff, the bees, the koi, the weather, the hour) and every
//     answer offers follow-ups. The conversation is a small tree in lines.js
//     (GARDEN_TALK); what has been asked is remembered (H.mem.asked, "g.<who>.<id>").
//   - asked for something, they pick it at the nearest bed or border (a strawberry,
//     a tomato, a sweet pea), or produce one from under the hat if the beds are far,
//     or fetch a lemonade from the kitchen door, and bring it in a trug
//   - otherwise their work, as a round of nearby jobs rather than a criss-cross of
//     the island: watering the beds, deadheading, the wheelbarrow (Thistle), the
//     hives, feeding the koi, a sit on a bench, looking out from the rim, a word
//     with each other when their rounds cross; at night Bramble tucks herself by
//     the glasshouse and Thistle by the back porch, and they wake for a visitor.
//
// Hands and tools. The work is done with the tools, where the work is: each job sets this.work (what kind,
// and the point in the world it is aimed at) and the hands are placed every frame from it (pose(), only
// when she is near enough to see): the watering can's rose over the plants with water falling from it,
// the secateurs at a flower head, the trowel in the soil, the smoker's nozzle at the hive entrance, a
// throwing hand scattering food onto the water, the broom's bristles on the path. Small tools come out of
// a pouch (Bramble's, on her pot's rim) or a satchel (Thistle's, on his belt) and go back into it; the
// hand travels there to fetch or stow them (want[] says what each hand should be holding). Hands ease
// between poses and never pass through the body. Spoken to, a gardener lowers its tool and turns to her.
//
// Thistle's wheelbarrow (Barrow, below) is a small mechanism: it pivots about its wheel's contact with the
// ground, its wheel turns by the distance rolled, and it is lifted onto the wheel to be pushed and set
// down on its legs to stand. He walks round to the handles, bends, takes them in both hands (the hands
// are placed on the grips, wherever the grips are) and lifts; he leans into the push and back as he
// slows. A barrow round is a reason to push it: to a bed (weeding) or a path (sweeping, the broom rides
// in the barrow), or to the compost first for a load to dig in, parked off the path beside the work; full,
// it goes to the compost bays and is tipped there; then back to its place beside the bays.

import { Robot } from './robots.js';
import { weighted } from './agent.js';
import { shuffle } from '../shuffle.js';
import { buildGardener, buildBarrow, GARDENER_SPECS, TOOL_TIPS, BARROW, holdInHand } from './models.js';
import { GARDEN_GIFTS } from './drinks.js';
import { VOICE, GARDEN_FACTS, PLACES, GARDEN_TALK, GARDEN_CATS, GARDEN_LEADS, GARDEN_NEAR, GARDEN_HOURS, GARDEN_BANTER, partOfDay } from './lines.js';
import { POND, feedKoi } from '../garden/pond.js';
import { ISLAND, islandEdge } from '../garden.js';

const TRAITS = {
  bramble: { host: 1.0, greeter: 2, chat: 1, rest: 0.7, home: 0, likes: [], work: { water: 5, deadhead: 4, tend: 10, hives: 1.5, koi: 2, bench: 2, rim: 1.5, ponder: 1 } },
  thistle: { host: 0.6, greeter: 1, chat: 0.7, rest: 0.8, home: 0, likes: [], work: { deadhead: 3, cart: 3, tend: 14, hives: 3, koi: 2, bench: 2, rim: 2, ponder: 1 } },
};
// Places the garden's plan does not hand us (garden/potager.js builds them; numbers copied from there):
// the compost bays' open fronts, where the barrow is tipped, the barrow's own place beside them, the
// gates, and the narrow ways through (the barrow is never left on these: inside the potager, where every
// space between the beds is a path, it is left along a bed's edge with room to pass), and paths to sweep.
const COMPOST = { x0: 57.4, x1: 66.2, z: -108, nx: 0, nz: 1 };
const BARROW_HOME = { x: 68.7, z: -112.4, yaw: Math.PI };
const GATES = [[46, -56], [46, -104], [26, -80], [46, -108]];
const WAYS = [[[26.5, -80], [7, -80], 2.4], [[48, -106], [62, -106.5], 2.6], [[62, -106.5], [72, -104], 2.6], [[72, -104], [82, -108], 2.6], [[72, -104], [80, -92], 2.4], [[80, -92], [86, -76], 2.4],
  [[46, -103], [46, -107.5], 2.8], [[15, -50.5], [46, -56.5], 2.8]];
const SWEEPS = [{ a: [23, -80], b: [12, -80] }, { a: [77.5, -96], b: [83, -82] }];
// The land ends at the island's outline, which is not round (garden.js; the barrier she meets stands at 0.965
// of it, main.js). A last resort, whatever the garden plan says is open ground: 0 on the land, otherwise the
// scale, about the island's centre, that brings (x, z) back to 6 ft inside the edge (islandEdge joins the
// outline's points with straight lines, up to 3.7 ft outside the curve main.js draws through them).
const RIM_SAFE = Math.min(...ISLAND.outline) * 0.965 - 6;
function offLand(x, z) {
  const dx = x - ISLAND.x, dz = z - ISLAND.z, d2 = dx * dx + dz * dz;
  if (d2 < RIM_SAFE * RIM_SAFE) return 0;
  const lim = islandEdge(Math.atan2(dz, dx)) * 0.965 - 6, d = Math.sqrt(d2);
  return d > lim ? lim / d : 0;
}
// The garden plan (outdoor.js) takes the island for a circle of its greatest radius, so its open ground ran up
// to 44 ft out over the sky where the outline falls short of that, and paths were planned across the bays. Until
// outdoor.js asks islandEdge itself, the plan is trimmed to the land here each time it is rebuilt (staff.js calls
// gardenSpots straight after): nothing is open within 8 ft of the barrier, and clearance counts the edge as a wall.
function trimToLand(nav) {
  const F = nav.floors[0], { walk, clear } = F, near = (RIM_SAFE - 8) ** 2; let cut = false;
  for (const c of F.cells) {
    const dx = nav.cx(c) - ISLAND.x, dz = nav.cz(c) - ISLAND.z, d2 = dx * dx + dz * dz; if (d2 < near) continue;
    const room = islandEdge(Math.atan2(dz, dx)) * 0.965 - 8 - Math.sqrt(d2);
    if (room <= 0) { walk[c] = 0; clear[c] = 0; cut = true; } else if (room < clear[c]) clear[c] = room;
  }
  if (cut) F.cells = F.cells.filter(c => walk[c]);
}
// The glasshouse (potager.js; numbers copied from there): its inside, its door (in the wall toward the potager,
// 3.2 ft wide with the leaf standing open beside it: too tight for the garden plan's 1.2 ft of clearance, so it
// is walked through in a straight line down its middle), the staging down both sides, the potting bench across
// the back, the tomato in its pot inside the door. And the two bean teepees in the potager.
const GLASS = { x0: 38.5, x1: 53.5, z0: -121.5, z1: -108.2, door: { x: 46, out: -105.6, sill: -107.2, in: -111.6 } };
const GLASS_JOBS = [
  { job: 'pot', x: 46, z: -117.6, fx: 46, fz: -120.5, y: 3.3 },                          // potting on at the bench
  { job: 'stage', x: 49.6, z: -114.5, fx: 52.2, fz: -114.5, y: 3.0, top: 3.7 },          // the staging, either side
  { job: 'stage', x: 42.7, z: -116.5, fx: 39.8, fz: -116.5, y: 3.0, top: 3.7 },
  { job: 'pinch', x: 45.2, z: -112.2, fx: 42.8, fz: -109.85, y: 3.9 },                   // pinching out the tomato
];
const TEEPEES = [[50.9, -67.2], [50.9, -73.0]];
const onWay = (x, z) => WAYS.some(([[ax, az], [bx, bz], w]) => { const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2)); return Math.hypot(ax + dx * t - x, az + dz * t - z) < w + 0.6; });

// Where the work is, found on the garden's own plan at run time
export function gardenSpots(out, ctx) {
  const S = { beds: [], borders: [], hives: [], pond: [], benches: [], rim: [] };
  trimToLand(out);
  const snap = (x, z, r = 5, need = 1.2) => { const c = out.nearest(0, x, z, need, r); return c < 0 ? null : { x: out.cx(c), z: out.cz(c) }; };
  // raised beds in the potager: solid boxes about 2.4 ft high (y: the soil; top: the plants)
  for (const c of ctx.colliders) {
    if (c.staff || c.x0 < 25 || c.x1 > 67 || c.z0 < -105 || c.z1 > -55 || Math.abs(c.y1 - 2.4) > 0.05 || (c.x1 - c.x0) * (c.z1 - c.z0) < 6) continue;
    const fx = (c.x0 + c.x1) / 2, fz = (c.z0 + c.z1) / 2, p = snap(fx, fz, 6); if (p) S.beds.push({ ...p, fx, fz, y: 2.35, top: 2.9, box: c });
  }
  // borders are tended from the lawn side, never from the brick walk to the front door
  for (const [x, z, fx, fz] of [[9, -60, 2, -60], [9, -75, 2, -75], [9, -95, 2, -95], [9, -112, 2, -112], [14.5, 30, 8.5, 30], [-12, 40, -6.5, 40], [-14, 55, -6.5, 52], [-19, 20, -19, 14.6]]) { const p = snap(x, z, 4); if (p) S.borders.push({ ...p, fx, fz, y: 0.05, top: 1.5 }); }
  // the hives: stand beside the entrance, out of the bees' line of flight (hives give their entrance and the
  // way it faces when they have them; the older ones face +z with the entrance at their front)
  for (const h of ctx.garden?.hives ?? []) {
    const e = h.entrance ?? { x: h.x, y: h.y ?? 1.2, z: h.z }, yaw = h.yaw ?? 0, nx = Math.sin(yaw), nz = Math.cos(yaw);
    const p = [-1, 1].map(s => snap(e.x + nz * s * 2.7 + nx * 0.9, e.z - nx * s * 2.7 + nz * 0.9, 2.5)).filter(Boolean).sort((a, b) => Math.hypot(a.x - e.x, a.z - e.z) - Math.hypot(b.x - e.x, b.z - e.z))[0];
    if (p) S.hives.push({ ...p, fx: e.x, fz: e.z, ex: e.x, ey: e.y ?? 1.2, ez: e.z, nx, nz });
  }
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, p = snap(POND.x + Math.cos(a) * (POND.rx + 4.5), POND.z + Math.sin(a) * (POND.rz + 4.5), 3); if (p) S.pond.push({ ...p, fx: POND.x, fz: POND.z }); }
  for (const s of ctx.items?.seats ?? []) {
    if (s.y > 4.5 || (s.x > -36 && s.x < 24 && s.z > -50 && s.z < 15)) continue;
    // in front of the seat, facing the way it faces (a gardener perches on its front edge)
    const ax = -Math.sin(s.yaw), az = -Math.cos(s.yaw), c = out.nearest(0, s.x + ax * 1.0, s.z + az * 1.0, 0.9, 2.5, false, c => (out.cx(c) - s.x) * ax + (out.cz(c) - s.z) * az > 0.4);
    const p = c >= 0 ? { x: out.cx(c), z: out.cz(c) } : snap(s.x, s.z, 4); if (!p) continue;
    const rimSeat = Math.hypot(s.x - ISLAND.x, s.z - ISLAND.z) > ISLAND.r * 0.75;
    (rimSeat ? S.rim : S.benches).push({ ...p, fx: s.x - Math.sin(s.yaw) * 8, fz: s.z - Math.cos(s.yaw) * 8, seat: c >= 0 ? { x: s.x, z: s.z, h: s.y - 2.45 } : null });
  }
  // (the edge in that direction, not the island's greatest radius: the outline is not round, and 22 ft in from
  // the far point of it was up to 29 ft out over the sky in three of these four directions)
  for (const a of [0.3, 1.9, 3.3, 4.6]) { const d = islandEdge(a) - 22, p = snap(ISLAND.x + Math.cos(a) * d, ISLAND.z + Math.sin(a) * d, 6); if (p) S.rim.push({ ...p, fx: ISLAND.x + Math.cos(a) * (ISLAND.r + 40), fz: ISLAND.z + Math.sin(a) * (ISLAND.r + 40) }); }
  // paths that want sweeping (and that a barrow can be parked beside)
  S.sweeps = SWEEPS.map(w => { const p = snap((w.a[0] + w.b[0]) / 2, (w.a[1] + w.b[1]) / 2, 3); return p ? { ...p, fx: w.b[0], fz: w.b[1], a: w.a, b: w.b, y: 0.05, sweep: true } : null; }).filter(Boolean);
  // Tending (Gardener.tend): each raised bed from its other long side too (weeding, picking), the bean poles
  // (tying in), and the jobs in the glasshouse (in: reached through its door)
  S.tend = [];
  for (const b of S.beds) {
    const c = b.box, long = c.z1 - c.z0 > c.x1 - c.x0;
    for (const sg of [-1, 1]) for (const k of [0.3, 0.7]) {
      const ex = long ? (sg < 0 ? c.x0 : c.x1) : c.x0 + (c.x1 - c.x0) * k, ez = long ? c.z0 + (c.z1 - c.z0) * k : (sg < 0 ? c.z0 : c.z1);
      const p = snap(ex + (long ? sg * 1.6 : 0), ez + (long ? 0 : sg * 1.6), 2.5); if (!p) continue;
      S.tend.push({ ...p, fx: long ? b.fx : p.x, fz: long ? p.z : b.fz, y: b.y, top: b.top, box: c, job: 'bed' });
    }
  }
  for (const [tx, tz] of TEEPEES) { const b = S.beds.find(b => tx > b.box.x0 && tx < b.box.x1 && tz > b.box.z0 && tz < b.box.z1); if (!b) continue; for (const sg of [-1, 1]) { const p = snap((sg < 0 ? b.box.x0 : b.box.x1) + sg * 1.6, tz, 2); if (p) S.tend.push({ ...p, fx: tx + sg * 1.25, fz: tz, y: 4.2 + sg * 0.3, job: 'tie' }); } }
  for (const j of GLASS_JOBS) if (out.freeAt(0, j.x, j.z, 1.2)) S.tend.push({ ...j, in: true });
  S.kitchenDoor = snap(15, -54, 6); if (S.kitchenDoor) Object.assign(S.kitchenDoor, { fx: 15, fz: -46 });
  S.night = { bramble: snap(46, -104, 5), thistle: snap(17, -58, 6) ?? snap(22, -60, 8) };
  return S;
}

// ---- Small effects: water from the rose, food on the pond, smoke, a cut flower head, leaves, soil --------
// One Points object per gardener (one draw call, and only while something is in the air), its buffers
// made once and rewritten in place.
const FX = { WATER: 1, PELLET: 2, PUFF: 3, PETAL: 4, LEAF: 5, CLOD: 6 };
const FXG = [0, -26, -22, 0.35, -2.2, 0, -22];
let dotTex = null;
class Fx {
  constructor(H, n = 72) {
    const T = H.THREE; this.n = n; this.next = 0; this.any = false;
    this.p = new Float32Array(n * 3).fill(-1e4); this.c = new Float32Array(n * 3); this.v = new Float32Array(n * 3);
    this.life = new Float32Array(n); this.kind = new Uint8Array(n); this.floor = new Float32Array(n);
    const g = new T.BufferGeometry();
    this.pa = new T.BufferAttribute(this.p, 3).setUsage(T.DynamicDrawUsage); this.ca = new T.BufferAttribute(this.c, 3).setUsage(T.DynamicDrawUsage);
    g.setAttribute('position', this.pa); g.setAttribute('color', this.ca);
    if (!dotTex && typeof document !== 'undefined') {
      const cv = document.createElement('canvas'); cv.width = cv.height = 32; const x = cv.getContext('2d');
      const gr = x.createRadialGradient(16, 16, 2, 16, 16, 15); gr.addColorStop(0, '#fff'); gr.addColorStop(0.7, '#fff'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = gr; x.beginPath(); x.arc(16, 16, 15, 0, 7); x.fill(); dotTex = new T.CanvasTexture(cv);
    }
    this.pts = new T.Points(g, new T.PointsMaterial({ size: 0.11, vertexColors: true, map: dotTex, alphaTest: 0.45, sizeAttenuation: true }));
    this.pts.frustumCulled = false; this.pts.visible = false; this.pts.userData.staff = true;
    // (main.js shows each of the staff group's children by the zone where it stands: this one stands with its gardener)
    this.wrap = new T.Group(); this.wrap.userData.staff = true; this.wrap.add(this.pts); H.group.add(this.wrap);
  }
  spawn(kind, x, y, z, vx, vy, vz, col, life, floor = 0.05) {
    let i = -1;
    for (let k = 0; k < this.n; k++) { const j = (this.next + k) % this.n; if (this.life[j] <= 0) { i = j; break; } }
    if (i < 0) i = this.next;
    this.next = (i + 1) % this.n;
    const a = i * 3; this.p[a] = x; this.p[a + 1] = y; this.p[a + 2] = z; this.v[a] = vx; this.v[a + 1] = vy; this.v[a + 2] = vz;
    this.c[a] = col[0]; this.c[a + 1] = col[1]; this.c[a + 2] = col[2]; this.ca.needsUpdate = true;
    this.life[i] = life; this.kind[i] = kind; this.floor[i] = floor; this.any = true; this.pts.visible = true;
    return i;
  }
  update(dt, t, x = 0, z = 0) {
    this.wrap.position.set(x, 0, z); this.pts.position.set(-x, 0, -z);
    if (!this.any) return;
    let any = false;
    for (let i = 0; i < this.n; i++) {
      if (this.life[i] <= 0) continue;
      const a = i * 3, k = this.kind[i];
      this.life[i] -= dt;
      if (this.life[i] <= 0) { this.p[a + 1] = -1e4; continue; }
      any = true;
      if (k === FX.LEAF) continue;                                          // lies where it is (the broom moves it)
      const p = this.p, v = this.v;
      if (p[a + 1] <= this.floor[i]) { p[a + 1] = this.floor[i]; v[a] = v[a + 1] = v[a + 2] = 0; if (k === FX.WATER) this.life[i] = 0, p[a + 1] = -1e4; continue; }
      v[a + 1] += FXG[k] * dt;
      if (k === FX.PUFF) { const d = Math.exp(-dt * 1.6); v[a] *= d; v[a + 2] *= d; v[a + 1] = Math.min(v[a + 1], 0.5); }
      if (k === FX.PETAL) { v[a + 1] = Math.max(v[a + 1], -1.1); p[a] += Math.sin(t * 5 + i) * dt * 0.4; }
      p[a] += v[a] * dt; p[a + 1] += v[a + 1] * dt; p[a + 2] += v[a + 2] * dt;
    }
    this.pa.needsUpdate = true;
    if (!any) { this.any = false; this.pts.visible = false; }
  }
  clear() { this.life.fill(0); for (let i = 0; i < this.n; i++) this.p[i * 3 + 1] = -1e4; this.pa.needsUpdate = true; this.any = false; this.pts.visible = false; }
}
const rgb = h => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255].map(c => c ** 2.2);
const COL = { water: rgb(0xd8ecf6), water2: rgb(0xa9cfe2), pellet: rgb(0x8a5a2e), puff: rgb(0xdedcd4), puff2: rgb(0xbdbab2), petal: [rgb(0xd8758e), rgb(0xa8642c), rgb(0xe0b14a)],
  leaf: [rgb(0xb8742e), rgb(0xc99a3e), rgb(0x8f5a2a)], soil: rgb(0x4a3424), weed: rgb(0x6f8f3e) };

// ---- Thistle's wheelbarrow ------------------------------------------------------------------------------
// State: the wheel's contact with the ground (x, z), the way it points (yaw: from the handles to the
// wheel), how far it is tipped up on its wheel (a: 0 on its legs; PUSH_A, carried; up to TIP_A, tipped
// out), the wheel's turn (spin). Everything else follows from these.
const WR = BARROW.wheelR, GL = -BARROW.grips[0][2], GY = BARROW.grips[0][1], GX = BARROW.grips[1][0], REACH = 0.8;
const gripH = a => GL * Math.cos(a) - GY * Math.sin(a);              // wheel to grips, along the ground
const gripY = a => WR + GY * Math.cos(a) + GL * Math.sin(a);         // grips above the ground
const PUSH_A = (() => { let a = 0; while (gripY(a) < 1.95 && a < 0.8) a += 0.005; return a; })(), TIP_A = 1.02;
class Barrow {
  constructor(H) {
    this.H = H; this.root = buildBarrow(); this.B = this.root.userData.barrow; H.group.add(this.root);
    this.x = 0; this.z = 0; this.yaw = 0; this.a = 0; this.spin = 0; this.held = false; this.roll = 0; this.bump = 0; this.rolled = 0;
    this.marked = []; this.markedVer = -1;
    this.box = { x0: 0, x1: 0, y0: -100, y1: -99, z0: 0, z1: 0, staff: true }; H.ctx.colliders.push(this.box);      // she cannot walk through it either
  }
  get ux() { return Math.sin(this.yaw); } get uz() { return Math.cos(this.yaw); }
  place(x, z, yaw) { this.x = x; this.z = z; this.yaw = yaw; this.sync(); }
  // roll to (x, z) heading yaw: the wheel turns by the distance it rolled along the way it points
  move(x, z, yaw) {
    const ds = (x - this.x) * Math.sin(yaw) + (z - this.z) * Math.cos(yaw);
    this.spin += ds / WR; this.rolled += Math.abs(ds); this.x = x; this.z = z; this.yaw = yaw;
  }
  // where the barrow's parts stand for a pose: the wheel, the middle of the tray, the back of the tray, the
  // grips, and the one pushing it
  at(x, z, yaw, a, along) { return { x: x - Math.sin(yaw) * along, z: z - Math.cos(yaw) * along }; }
  robotSpot(a = this.a, x = this.x, z = this.z, yaw = this.yaw) { const d = gripH(a) + REACH; return { x: x - Math.sin(yaw) * d, z: z - Math.cos(yaw) * d }; }
  sync() {
    const ground = 0.05;
    this.root.position.set(this.x, ground, this.z); this.root.rotation.set(0, this.yaw, 0); this.root.rotateZ(this.roll);
    this.B.pivot.rotation.x = this.a; this.B.pivot.position.y = WR + this.bump; this.B.wheel.rotation.x = this.spin;
    // her collider: the box round the tray and handles
    const ux = this.ux, uz = this.uz, mx = this.x - ux * 1.35, mz = this.z - uz * 1.35, hx = Math.abs(ux) * 1.45 + Math.abs(uz) * 0.6, hz = Math.abs(uz) * 1.45 + Math.abs(ux) * 0.6;
    const B = this.box; B.x0 = mx - hx; B.x1 = mx + hx; B.z0 = mz - hz; B.z1 = mz + hz; B.y0 = 0; B.y1 = 1.2;
  }
  // A parked barrow is a thing in the way: its cells are marked on the garden plan (and given back when it
  // is taken up), so nobody's path goes through it. The plan is rebuilt now and then: marked again after.
  mark(nav, on) {
    const walk = nav.floors[0].walk;
    if (!on) { for (const [c, w] of this.marked) walk[c] = w; this.marked.length = 0; return; }
    if (this.marked.length) this.mark(nav, false);
    const ux = this.ux, uz = this.uz;
    for (let s = -0.3; s <= 2.4; s += 0.45) for (const l of [-0.45, 0, 0.45]) {
      const c = nav.cellOf(this.x - ux * s + uz * l, this.z - uz * s - ux * l);
      if (c < 0 || !walk[c] || this.marked.some(m => m[0] === c) || this.H.gardeners?.some(g => nav.cellOf(g.x, g.z) === c)) continue;      // (not from under anybody's feet)
      this.marked.push([c, walk[c]]); walk[c] = 0;
    }
    this.markedVer = nav.version;
  }
  grip(i, out) { this.root.updateMatrixWorld(true); return this.B.pivot.localToWorld(out.set(...BARROW.grips[i])); }
  trayPoint(out, dx = 0, dz = 0) { this.root.updateMatrixWorld(true); return this.B.pivot.localToWorld(out.set(BARROW.tray[0] + dx, BARROW.tray[1], BARROW.tray[2] + dz)); }
}
// Does the barrow (and the one pushing it) fit here, on the garden plan?
const STATIONS = [0, 0.5, 1, 1.5, 2, 2.5, 2.8], LATS = [-0.55, 0, 0.55], PIVOTS = [0, 0.7, 1.4], PIVOTS4 = [0, 0.7, 1.4, 0], NOPIVOT = [0];
// (front: how much of it, from the wheel back, may hang over something low: a bay's lip, when tipping)
function fits(nav, x, z, yaw, a, front = 0) {
  const ux = Math.sin(yaw), uz = Math.cos(yaw), d = gripH(a) + REACH;
  if (offLand(x, z) || offLand(x - ux * d, z - uz * d)) return false;      // never rolled out past the island's edge
  // the footprint itself, wheel to grips, its whole width, on open ground
  for (const s of STATIONS) if (s >= front) for (const l of LATS) if (!nav.freeAt(0, x - ux * s + uz * l, z - uz * s - ux * l, l ? 0.01 : 0.9)) return false;
  return nav.freeAt(0, x - ux * d, z - uz * d, 0.75);
}
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
let P0, P1, Q0, Q1, Q2, T1, T2, T3, T4, TIPV, E, DOWN, TG, QQ;
function temps(T) { if (P0) return; [P0, P1, T1, T2, T3, T4, TIPV] = [0, 1, 2, 3, 4, 5, 6].map(() => new T.Vector3()); [Q0, Q1, Q2] = [0, 1, 2].map(() => new T.Quaternion()); E = new T.Euler(); DOWN = new T.Vector3(0, -1, 0); TG = [P0, P1]; QQ = [Q0, Q1]; }

const KEEP_OFF = 12;                 // work is never picked closer to her than this
const TOPIC = Object.fromEntries(GARDEN_TALK.map(n => [n.id, n]));

export class Gardener extends Robot {
  constructor(H, key, i, out) {
    super(H, key, i, { body: buildGardener(key), spec: GARDENER_SPECS[key], traits: TRAITS[key], nav: out, need: 1.2 });
    this.outdoor = true; this.lastOut = 0; this.cameFor = -1; this.cameTries = 0; this.comeAgain = 0; this.greetTried = -1e9;
    this.m.avoid = (x, z) => H.blocked(this, x, z, this.carrying ? 1.25 : 2.5);      // a wide berth round her, unless handing something over
    temps(H.THREE);
    this.work = { kind: null, T: new H.THREE.Vector3(), T2: new H.THREE.Vector3(), t0: 0, pour: 0, top: 1.4 };
    this.want = ['glove', key === 'bramble' ? 'can' : 'glove']; this.swapT = [0, 0]; this.lean = 0; this.grip = 0; this.load = ''; this.pushing = false;
    if (key === 'bramble') holdInHand(this.body.hands[1], 'can');                  // her can, always to hand
    this.fx = new Fx(H);
    if (key === 'thistle') { const b = this.barrow = new Barrow(H); b.B.setLoad('', true); b.place(BARROW_HOME.x, BARROW_HOME.z, BARROW_HOME.yaw); b.mark(out, true); }
    // nobody walks into a barrow being pushed (a parked one is marked on the plan)
    const avoid = this.m.avoid;
    this.m.avoid = (x, z) => {
      if (avoid(x, z)) return true;
      for (const g of H.gardeners) { const b = g.barrow; if (!b?.held || g === this) continue; const t = clamp(-((x - b.x) * b.ux + (z - b.z) * b.uz), 0, 2.6); if (Math.hypot(b.x - b.ux * t - x, b.z - b.uz * t - z) < 1.3) return true; }
      return false;
    };
    // ?gardenjob=thistle.cart,bramble.water: that job, over and over, near where she stands (for pictures and checks)
    const job = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('gardenjob') : null;
    for (const p of (job ?? '').split(',')) { const [who, k, what] = p.split('.'); if (who === key && k) { this.stageJob = k; this.stageWhat = what; } }      // (thistle.tend.pot: that kind of tending)
    // Speech bubbles outdoors. staff.js decides whether a bubble is in view with the house plan's line of sight
    // (nav.see), and that plan ends at the walls, so out here the answer was always "no" and the gardeners were
    // mute. Until staff.js asks the garden plan instead, a gardener's bubble answers for itself.
    this.bubble.inView = pos => {
      const cam = H.ctx.camera?.position;
      return !!cam && H.ctx.mode === 'walk' && cam.y < 14 && Math.hypot(pos.x - cam.x, pos.z - cam.z) < 34 && out.see(0, cam.x, cam.z, pos.x, pos.z);
    };
    if (!H.bubbles.placeIndoors) { const place = H.bubbles.placeIndoors = H.bubbles.place; H.bubbles.place = (b, pos, now, vis) => place(b, pos, now, vis || (!!b.inView && b.inView(pos))); }
  }
  inDomain() { const v = this.H.visitor; return v.present && v.outside; }
  seeGuest() { const v = this.H.visitor; return this.nav.see(0, this.x, this.z, v.x, v.z); }
  helpDoors() {}
  lookTarget() { return this.pointAt && this.H.now < this.pointAt.until ? this.pointAt : null; }
  speedScale() { return this.m.remaining() > 35 ? 1.3 : 1; }            // a long leg is walked a little more briskly
  get spots() { return this.H.gspots; }
  get other() { return this.H.gardeners.find(g => g !== this); }
  // long lines get the time they need to be read
  say(text, o = {}) {
    const H = this.H, v = H.visitor, t = super.say(text, { ...o, secs: o.secs ?? Math.min(10, 2.6 + text.length * 0.047) });
    // the little chirp: Robot.say asks the house plan whether she is in earshot, which fails outdoors (see the constructor)
    if (!H.near(this, 20) && v.present && Math.hypot(v.x - this.x, v.z - this.z) < 20 && this.nav.see(0, v.x, v.z, this.x, this.z)) H.chirp(this.spec.chirp, 0.05, this);
    return t;
  }
  label() { return this.H.talk.robot === this && !(this.carrying && this.forGuest) ? 'next line (or 1–4)' : super.label(); }
  // A place to stand near (x, z): not on top of her, and (open) with room around it, so never in the middle of
  // a path between two borders. Better to talk across the flowers than to stand in her way.
  nearSpot(x, z, r = 10, open = 0) {
    const v = this.H.visitor, nav = this.nav, clear = nav.floors[0].clear;
    const c = nav.nearest(0, x, z, 1.2, r, false, c => clear[c] >= open && Math.hypot(nav.cx(c) - v.x, nav.cz(c) - v.z) >= 4.8);
    return c < 0 ? null : { f: 0, x: nav.cx(c), z: nav.cz(c) };
  }
  roomHere() { const c = this.nav.cellOf(this.x, this.z); return c < 0 ? 0 : this.nav.floors[0].clear[c]; }
  // Is she looking roughly my way? (A bubble only shows on screen; nothing is said to the back of her head.)
  inHerView(cos = 0.6) { const v = this.H.visitor, dx = this.x - v.x, dz = this.z - v.z, d = Math.hypot(dx, dz) || 1; return (dx * v.fx + dz * v.fz) / d > cos; }
  // Where to stand to speak to her: in front and to one side, where she can see me, with room around me
  // (so not on a path between borders), a little farther off if the near ground is taken up by flowers
  standSpot() {
    const H = this.H, v = H.visitor, nav = this.nav, clear = nav.floors[0].clear, f0 = Math.atan2(v.fx, v.fz);
    this.side ??= H.rnd() < 0.5 ? 1 : -1;
    for (const dist of [6.5, 8.5, 10.5, 12]) for (const ang of [0.5, -0.5, 0.8, -0.8, 1.05, -1.05]) {
      const a = f0 + ang * this.side, x = v.x + Math.sin(a) * dist, z = v.z + Math.cos(a) * dist, c = nav.cellOf(x, z);
      if (c >= 0 && nav.free(0, c, 1.2) && clear[c] >= 3.2 && nav.see(0, v.x, v.z, x, z)) return { f: 0, x: nav.cx(c), z: nav.cz(c) };
    }
    return null;
  }
  // Is she by this place? near: { x, z, r } or { rim: true } (anywhere along the island's edge)
  isNear(n) {
    const v = this.H.visitor;
    if (n.rim) return Math.hypot(v.x - ISLAND.x, v.z - ISLAND.z) > islandEdge(Math.atan2(v.z - ISLAND.z, v.x - ISLAND.x)) - 34;
    return Math.hypot(v.x - n.x, v.z - n.z) < n.r;
  }

  // ---- decisions ---------------------------------------------------------------------------------
  // The one who looks after her just now: nobody, if she has only just had company; otherwise the nearer
  // (Bramble, the readier talker, by a head)
  attending() {
    const H = this.H, v = H.visitor, o = this.other;
    if (!v.present || H.gardeners.some(g => H.host === g || H.now - g.hostEndedAt < 100)) return false;
    const d = a => Math.hypot(a.x - v.x, a.z - v.z) - a.traits.greeter * 10;
    return !o || !!o.carrying || d(this) <= d(o);
  }
  wantsToGreet() {
    const H = this.H, v = H.visitor;
    if (!this.inDomain() || H.host || H.talk.robot || H.now - v.outSince < 4 || H.now - this.greetedAt < 300 || H.now - H.lastHostEnd < 45) return false;
    if (H.now - this.greetTried < 25 || H.now - (H.mem.gLastGreet ?? -1e9) < 90) return false;      // one welcome at a time
    const d = this.visitorDist(); if (d > 45 || !this.seeGuest()) return false;
    // the readier greeter goes, unless the other is clearly nearer; one who has already said hello does not count
    const rival = H.gardeners.find(g => g !== this && g.interruptible && H.now - g.greetedAt > 300 && g.visitorDist() < d + (g.traits.greeter > this.traits.greeter ? 15 : -15));
    return !rival;
  }
  // toward: she has just stepped out and nobody is near; find work in her part of the garden
  think(toward = false) {
    const H = this.H, R = H.rnd, night = H.day.light < 0.3;
    // The day begins with Bramble in the front garden, where a guest first looks out or steps out, and Thistle
    // up by the orchard (staff.js sets both down in the potager; this is before anyone has seen them)
    if (!this.begun) { this.begun = true; const s = this.key === 'bramble' && H.now < 5 && this.spots.borders.find(b => b.z > 25 && b.x < -5); if (s) this.m.place(s.x, s.z, 0); }
    if (this.inGlass()) return this.run('tend', this.leaveGlass());      // whatever comes next, out through the door first
    if (this.carrying) return this.run('deliver', this.deliver(), false);
    if (this.wantsToGreet()) return this.run('greet', this.greet(), false);
    const empty = H.empties.find(e => !e.claimed && e.outside && !(e.skipUntil > H.now));
    if (empty && (!H.host || H.host === this)) { empty.claimed = this; return this.run('clear', this.clear(empty), false); }
    if (night && !this.inDomain()) return this.run('tuck', this.tuck());
    const o = this.other;
    if (o && !toward && o.interruptible && !o.engaged && !o.carrying && !H.host && o.taskName !== 'tuck' && H.now - (H.lastGBanter ?? -200) > 150
      && Math.hypot(o.x - this.x, o.z - this.z) < 45 && R() < 0.5 * this.traits.chat) return this.run('banter', this.banter(o), false);
    const b = this.barrow;
    if (b && !b.held && !toward && (onWay(b.x - b.ux * 1.2, b.z - b.uz * 1.2) || GATES.some(([gx, gz]) => Math.hypot(gx - b.x, gz - b.z) < 5))) return this.run('cart', this.stow());
    const plan = this.planWork(night, toward) ?? (toward ? this.planWork(night, false) : null);
    if (!plan || plan.k === 'ponder') return this.run('ponder', this.orLinger(this.ponder()));
    this.run(plan.k, this.orLinger(this[plan.k](plan.s)));
  }
  // What to do next, and where. Jobs are weighted by temperament; places by how near they are (a round,
  // not a criss-cross of the island), and, for the one attending her, by being in her part of the garden.
  planWork(night, toward) {
    const H = this.H, v = H.visitor, S = this.spots;
    let w = this.traits.work;
    const lists = { water: S.beds.length ? S.beds : S.borders, deadhead: S.borders, hives: S.hives, koi: S.pond, bench: S.benches, rim: S.rim, tend: S.tend ?? [], cart: this.barrow ? [...S.beds, ...S.borders.slice(0, 4), ...S.sweeps] : [] };
    const o = this.other;
    if (this.barrow && Math.hypot(this.barrow.x - BARROW_HOME.x, this.barrow.z - BARROW_HOME.z) > 2) w = { ...w, cart: w.cart * 3 };      // it is not where it lives: see to it
    const mine = this.attending(), opts = [], off = H.host && H.host !== this ? 26 : KEEP_OFF;       // well clear while the other has her company
    for (const k in lists) {
      const list = lists[k], base = (w[k] ?? 0) * (night ? (k === 'bench' || k === 'rim' ? 1.5 : 0.3) : 1);
      if (!base || !list.length) continue;
      for (const s of list) {
        const ds = Math.hypot(s.x - this.x, s.z - this.z);
        if (o && (o.site === s || Math.hypot(s.x - o.x, s.z - o.z) < 5)) continue;      // the other one is at it
        if (s.in && o && (o.inGlass() || o.site?.in)) continue;                              // one at a time in the glasshouse: its door is narrow
        let q = (ds < 6 ? 0.15 : 1) / (1 + (ds / 45) ** 2);
        if (v.present) {
          const dv = Math.hypot(s.x - v.x, s.z - v.z);
          if (v.outside && dv < off) q *= 0.05;
          else if (toward) q = dv < 55 ? 1 / (1 + Math.abs(dv - 28) / 20) : 0;
          else if (mine && !v.outside) q = ((s.x - 0) * (v.x - 0) + (s.z + 23) * (v.z + 23) > 0 ? 1 : 0.06) / (1 + (Math.max(0, dv - 50) / 25) ** 2);     // she is indoors: on her side of the house, in view of her windows
          else if (mine) q *= 1 + 5 / (1 + (Math.max(0, dv - 30) / 30) ** 2);
        } else if (toward) q = 0;
        if (q > 0) opts.push([{ k, s }, (base * q) / list.length]);
      }
    }
    if (!toward) opts.push([{ k: 'ponder' }, (w.ponder ?? 0) * 0.25]);
    return weighted(opts, H.rnd);
  }

  // ---- meeting her --------------------------------------------------------------------------------
  // Walk over, unhurried, re-aiming as she moves, and speak only from a few feet away. If she walks on,
  // let her go and try another time; nothing is called across the garden.
  *greet() {
    const H = this.H, v = H.visitor, mem = H.mem, t0 = H.now, asks = H.events.asks;
    H.host = this; let replan = 0, held = 0;
    const giveUp = () => { this.greetTried = H.now; this.m.stop(); if (H.host === this) H.host = null; this.comeAgain = H.now + 20; };
    for (;;) {
      const d = this.visitorDist();
      if (d > 60 || H.now - t0 > 35) return giveUp();     // she has walked on: another time
      if (d < 8.5 && this.seeGuest() && this.roomHere() >= 3 && this.inHerView()) break;     // near enough, out of her path, and she can see me
      if (H.now > replan) {
        replan = H.now + 2.5;
        // on the terrace or a porch (not our ground) come to its edge; on our ground, stand where there is room
        const s = this.standSpot() ?? this.nearSpot(v.x, v.z, 13, this.nav.freeAt(0, v.x, v.z, 0.5) ? 3.2 : 1.2);
        if (s && Math.hypot(s.x - this.x, s.z - this.z) > 1.5) this.m.goTo(0, s.x, s.z);
        else if (d < 14 && this.seeGuest()) break;        // as near as good manners allow
      }
      this.m.update(H.dt, 1.2);
      held = this.m.v < 0.05 && d < 10 ? held + H.dt : 0;
      if (held > 3 && this.seeGuest()) break;             // she is in the way of where I meant to stand: this will do
      yield;
    }
    this.m.stop();
    yield* this.wait(0.6, () => { this.m.faceTo(v.x, v.z, H.dt); return false; });
    // if she is looking the other way, a small chirp, and a moment for her to turn round
    if (!this.inHerView() && this.visitorDist() < 14) { H.chirp(this.spec.chirp, 0.06, this); yield* this.wait(6, () => { this.m.faceTo(v.x, v.z, H.dt); return this.inHerView() || this.visitorDist() > 14; }); }
    if (this.visitorDist() > 14) return giveUp();
    if (this.visitorDist() < 4.6) { const s = this.standSpot(); if (s) yield* this.go(0, s.x, s.z, { tries: 1 }); }       // she came right up: a step back first
    this.greetedAt = H.now; mem.gLastGreet = H.now; mem.gHello = v.outSince; H.events.greets++;
    if (H.events.asks === asks) {                         // unless she spoke first on the way over
      if (!mem.met.has(this.key)) yield* this.introduce();
      else this.line('greet', { expr: 'happy' });
    }
    yield* this.wait(0.2);
    yield* this.host(true);
  }
  // First meeting: who I am, what I do here, a little of myself; then how to talk to me
  *introduce() {
    const H = this.H, mem = H.mem, pool = mem.met.has(this.other?.key) ? 'introAfter' : 'intro';
    const beats = H.bag(`${this.key}.${pool}`, VOICE[this.key][pool]), asks = H.events.asks;
    mem.met.add(this.key);
    for (let i = 0; i < beats.length; i++) {
      if (i) { yield* this.wait(0.5); if (H.events.asks !== asks || this.visitorDist() > 12) return; }     // she spoke first, or walked on
      this.say(beats[i], { expr: i ? 'wink' : 'happy' });
      yield;
    }
  }
  act() {
    const H = this.H;
    // spoken to before any introduction: say who you are first
    H.mem.gHello = H.visitor.outSince;
    if (!(this.carrying && this.forGuest) && H.talk.robot !== this && !H.mem.met.has(this.key)) { H.mem.met.add(this.key); this.line('introShort', { expr: 'happy' }); }
    super.act();
  }

  // ---- talking ---------------------------------------------------------------------------------
  // What a line resolves to in this gardener's voice (see GARDEN_TALK in lines.js)
  voice(v, bagKey) {
    const H = this.H, mem = H.mem, o = this.other;
    const c = { key: this.key, night: H.day.light < 0.35, hour: H.day.hour, met: k => mem.met.has(k), heard: id => mem.asked.has(`g.${o?.key}.${id}`), had: id => mem.drinks.includes(id) };
    for (let i = 0; i < 4 && v != null && typeof v !== 'string'; i++) v = typeof v === 'function' ? v(c) : Array.isArray(v) ? H.bag(`${this.key}.${bagKey}`, v) : v[this.key];
    return v ?? null;
  }
  asked(n) { return this.H.mem.asked.has(`g.${this.key}.${n.id}`); }
  // The card, kept to three lines: one thing to talk about (what she is standing by, or the next thing
  // on this gardener's own list), something from the garden, and goodbye
  dialogue() {
    const H = this.H, v = H.visitor, mem = H.mem, out = [];
    const reply = (pool, opts) => () => { this.line(pool, opts); return null; };
    if (H.day.light < 0.35 && !mem.asked.has('gdark')) out.push({ text: "It's dark out here.", act: () => { mem.asked.add('gdark'); this.line(H.ctx.flashlight ? 'lantern' : 'dark', { expr: 'wink' }); return this.followUps(null, null); } });
    else { const lead = this.leadTopic(); if (lead) out.push(this.topicOpt(lead, null)); }
    const coming = this.fetching ?? this.promised;
    if (coming) out.push({ text: `How's my ${coming.name} coming?`, act: reply('busy') });
    else if (v.holding) out.push({ text: `This ${v.holding.name} is lovely.`, act: reply(v.holding.food ? 'enjoyingFood' : v.holding.gift ? 'enjoying' : 'enjoyingDrink', { extra: { drink: v.holding.name }, expr: 'love' }) });
    else out.push({ text: 'Could I have something from the garden?', act: () => this.serviceCard() });
    out.push({ text: "That's all, thank you.", act: reply('bye') });
    return out;
  }
  // What leads the card: what she is standing by, then whatever has not come up yet (with anyone, then with me)
  leadTopic() {
    const mem = this.H.mem, any = n => !n.own && mem.asked.has(`g.${n.id}`);
    const here = GARDEN_TALK.find(n => n.near && !this.asked(n) && this.isNear(n.near));
    if (here) return here;
    const order = GARDEN_LEADS.map(id => TOPIC[id]).filter(Boolean);
    return order.find(n => !this.asked(n) && !any(n)) ?? order.find(n => !this.asked(n)) ?? null;
  }
  topicOpt(n, sibs) { return { text: this.voice(n.ask, n.id + '.ask'), act: () => this.answer(n, sibs) }; }
  answer(n, sibs) {
    const H = this.H, v = H.visitor, mem = H.mem;
    mem.asked.add(`g.${this.key}.${n.id}`); mem.asked.add(`g.${n.id}`);
    if (n.serve) return this.serviceCard();
    let more = null;
    if (n.where) more = this.suggestPlace() ? { text: 'And after that?', act: () => this.answer(n, sibs) } : null;
    else if (n.hour) { const p = partOfDay(H.day.hour); this.say(H.bag(`${this.key}.hour.${p}`, GARDEN_HOURS[p][this.key])); }
    else if (n.pool) this.line(n.pool, { expr: 'happy' });
    else {
      if (n.point && Math.hypot(n.point.x - v.x, n.point.z - v.z) > 30) this.pointAt = { x: n.point.x, z: n.point.z, until: H.now + 3.5 };
      this.say(this.voice(n.say, n.id));
    }
    return this.followUps(n.then ?? sibs, more);
  }
  // After an answer: one way on and a way out. The conversation is a path, not a menu: the way on
  // is what follows from what was just said, or else the next thing this gardener has not told her yet.
  followUps(group, more) {
    let on = more ?? null;
    if (!on) { const f = (group ?? []).find(f => !this.asked(f)); if (f) on = this.topicOpt(f, group); }
    if (!on) { const lead = this.leadTopic(); if (lead && !lead.serve) on = this.topicOpt(lead, null); }
    return [...(on ? [on] : []), { text: `Thank you, ${this.name}.`, act: () => { this.line('bye'); return null; } }];
  }
  catCard() { return [...GARDEN_CATS.map(([cat, text]) => ({ text, act: () => this.topicCard(cat) })), { text: "That's all, thank you.", act: () => { this.line('bye'); return null; } }]; }
  // Three topics at a time, what has not come up yet first; "Something else." turns the page, then goes back to the subjects
  topicCard(cat, page = 0) {
    const all = GARDEN_TALK.filter(n => n.cat === cat), list = [...all.filter(n => !this.asked(n)), ...all.filter(n => this.asked(n))];
    const more = list.length > (page + 1) * 3;
    return [...list.slice(page * 3, page * 3 + 3).map(n => this.topicOpt(n, null)), { text: 'Something else.', act: () => (more ? this.topicCard(cat, page + 1) : this.catCard()) }];
  }
  // Somewhere she has not been pointed to yet, a walk away from here
  suggestPlace() {
    const H = this.H, v = H.visitor, mem = H.mem;
    const left = PLACES.filter(p => !mem.asked.has('g.place.' + p.id) && Math.hypot(p.x - v.x, p.z - v.z) > 35);
    if (!left.length) { this.line('suggestDone'); return false; }
    const p = left[0]; mem.asked.add('g.place.' + p.id);
    this.pointAt = { x: p.x, z: p.z, until: H.now + 3.5 };
    this.say(p[this.key] ?? p.say);
    return left.length > 1;
  }
  // Something from the garden: two things to pick and the lemonade
  serviceCard() {
    const H = this.H, o = this.other;
    if (H.visitor.holding) { this.line('already', { expr: 'sass' }); return null; }
    if (this.fetching || this.promised || this.carrying) { this.line('busy'); return null; }
    if (o && (o.fetching || o.promised || (o.carrying && o.forGuest))) { this.say(this.key === 'bramble' ? `${o.name}'s already on his way with something for you, love. One treat at a time.` : `${o.name}'s fetching. One at a time.`); return null; }
    this.line('serve', { expr: 'happy' });
    const picks = shuffle(GARDEN_GIFTS.filter(g => g.gift), H.rnd).slice(0, 2);
    return [...[...picks, GARDEN_GIFTS.find(g => g.id === 'lemonade')].map(d => ({ text: d.id === 'lemonade' ? 'A glass of lemonade, please.' : `A ${d.name}, please.`, act: () => { this.order(d); return null; } })),
      { text: 'Not just now, thank you.', act: () => { this.line('bye'); return null; } }];
  }
  // Where a thing is picked: sweet peas in the borders, fruit in the raised beds; null if none is near
  pickingSpot(d) {
    if (!d.gift) return this.spots.kitchenDoor;
    const list = d.id === 'sweetpea' ? [...this.spots.borders, ...this.spots.beds] : this.spots.beds, far = d.id === 'sweetpea' ? 60 : 75;
    const near = list.map(s => [s, Math.hypot(s.x - this.x, s.z - this.z)]).sort((a, b) => a[1] - b[1])[0];
    return near && near[1] < far ? near[0] : null;
  }
  order(d) {
    const H = this.H;
    if (H.visitor.holding) { this.line('already', { expr: 'sass' }); return; }
    const pocket = d.gift && !this.pickingSpot(d);
    const pool = pocket ? 'pocket' : d.gift ? 'offer' : 'offerDrink';
    this.say(`${d.gift ? 'A ' + d.name : 'Lemonade'}${pocket ? '.' : ', ' + d.note + '.'} ${this.fill(H.bag(`${this.key}.${pool}`, VOICE[this.key][pool]))}`, { expr: 'happy' });
    H.mem.lastDrink = d; H.mem.finished = false; this.promised = d;
    const prev = this.taskName;
    this.run('fetch', this.fetchThenHost(d, prev === 'host' || prev === 'greet'), false);
    if (!H.host) H.host = this;
  }
  giveDrink() {
    const H = this.H, d = this.carrying, g = this.drinkObj;
    this.body.slot.remove(g); this.body.tray.visible = false; this.carrying = null; this.drinkObj = null; this.forGuest = false;
    H.hold(d, g);
    this.line(d.gift ? 'thanks' : 'thanksDrink', { expr: 'happy' });
    H.events.drinksTaken++;
  }
  // A remark while keeping her company: where she is standing, the offer of something, the hour, an opinion
  comment() {
    const H = this.H, v = H.visitor, mem = H.mem, k = this.key;
    if (!this.inHerView(0.5)) return false;                    // wait until she is looking this way
    if (H.day.light < 0.35 && !mem.gToldDark && !mem.asked.has('gdark')) { mem.gToldDark = true; this.line(H.ctx.flashlight ? 'lantern' : 'dark', { expr: 'wink' }); return true; }
    const said = (H.gNearSaid ??= {}), place = GARDEN_NEAR.find(p => H.now - (said[p.id] ?? -1e9) > 400 && this.isNear(p));
    if (place) { said[place.id] = H.now; this.say(H.bag(`${k}.near.${place.id}`, place[k])); return true; }
    if (!v.holding && !H.gardeners.some(g => g.fetching || g.carrying) && H.now - H.lastOffer > 150 && H.now - (mem.lastSip ?? -1e9) > 120) { H.lastOffer = H.now; this.line('offerHint'); return true; }
    const pick = weighted([['hour', H.now - (H.gHourSaid ?? -1e9) > 400 ? 3 : 0], ['aside', 2.5], ['fact', 1], ['season', 0.5]], H.rnd);
    if (pick === 'hour') { H.gHourSaid = H.now; const p = partOfDay(H.day.hour); this.say(H.bag(`${k}.hour.${p}`, GARDEN_HOURS[p][k])); }
    else if (pick === 'fact') this.say(H.bag(`${k}.gfacts`, GARDEN_FACTS.filter(f => !f.includes(this.name))));
    else if (pick === 'season') this.say(this.voice(TOPIC.season.say, 'season'));
    else this.line('aside');
    return true;
  }

  // ---- fetching: picked here, or lemonade from the kitchen door ----------------------------------
  *fetch(d) {
    const H = this.H, v = H.visitor;
    while (this.engaged) { this.m.faceTo(v.x, v.z, H.dt); yield; }
    this.fetching = d; this.promised = null; H.events.fetches++;
    try {
      const spot = this.pickingSpot(d);
      if (spot && (yield* this.go(0, spot.x, spot.z, { speed: 1.4 }))) {
        for (let t = 0; t < 0.8; t += H.dt) { this.m.faceTo(spot.fx, spot.fz, H.dt); yield; }
        if (d.gift && this.visitorDist() < 24) this.line('making', { toGuest: false });
      }
      if (!d.gift && spot) this.say(this.key === 'bramble' ? '*taps on the kitchen door* Mort, love! One lemonade!' : '*knocks* Lemonade. Please.', { toGuest: false });
      const g = H.makeDrink(d); if (!d.gift) g.userData.making = true;
      this.anim = 'pick'; this.body.tray.visible = true;
      const T = d.prep ?? 2.5;
      for (let t = 0; t < T; t += H.dt) { if (t > T * 0.5 && !g.parent) this.body.slot.add(g); H.fill(g, Math.min(1, t / T), t); yield; }
      if (!g.parent) this.body.slot.add(g);
      g.userData.making = false; H.fill(g, 1); this.drinkObj = g;
      this.carrying = d; this.forGuest = true;
    } finally { this.fetching = null; this.anim = null; }
    yield* this.deliver();
  }
  // Bring it to her. On the terrace or a porch (not our ground) come to its edge and hold it out (she can take it from there); if she has
  // gone indoors, wait a minute where we stand, then let it go.
  *deliver() {
    const H = this.H, v = H.visitor, t0 = H.now;
    let arrived = 0, nextWait = H.now + 60, away = 0, replan = 0, edge = false;
    while (this.carrying) {
      if (!this.inDomain()) {
        away += H.dt; this.m.stop();
        if (away > (v.present ? 60 : 20)) { if (v.present) this.line('selfDrink', { extra: { drink: this.carrying.name }, toGuest: false }); this.dropDrink(); return; }
        yield; continue;
      }
      away = 0;
      const d = this.visitorDist();
      if (d > (edge ? 11.5 : 4.2)) {
        if (H.now > replan) {
          replan = H.now + 1.2; edge = false;
          const k = Math.max(0.01, d), tx = d < 40 ? v.x + ((this.x - v.x) / k) * 3.4 : v.x, tz = d < 40 ? v.z + ((this.z - v.z) / k) * 3.4 : v.z;
          if (!this.m.goTo(0, tx, tz)) {
            const s = this.nearSpot(v.x, v.z, 16);
            if (s && Math.hypot(s.x - this.x, s.z - this.z) > 1) { if (!this.m.goTo(0, s.x, s.z)) edge = true; } else edge = true;
          }
        }
        const st = this.m.update(H.dt, d > 12 ? 1.4 : 0.9);
        if (st === 'idle' || st === 'arrived') { edge = true; this.m.faceTo(v.x, v.z, H.dt); }
        if (edge && d < 30 && H.now > nextWait) { nextWait = H.now + 30; this.line('waiting', { extra: { drink: this.carrying.name }, toGuest: false }); }
      } else {
        this.m.stop(); this.m.faceTo(v.x, v.z, H.dt);
        if (!arrived) { arrived = H.now; nextWait = H.now + (edge ? 24 : 16); this.line(edge && d > 6 ? 'edge' : 'deliver', { extra: { drink: this.carrying.name }, expr: 'happy' }); H.events.deliveries++; }
        else if (H.now > nextWait) { nextWait = H.now + 16; this.line('waiting', { extra: { drink: this.carrying.name }, expr: 'sass' }); }
      }
      if ((arrived && H.now - arrived > 90) || H.now - t0 > 240) { this.line('selfDrink', { extra: { drink: this.carrying.name }, expr: 'sass' }); this.dropDrink(); return; }
      yield;
    }
    const s = this.hostSpot() ?? (this.roomHere() < 3 ? this.nearSpot(v.x, v.z, 13, 3.2) : null); if (s) yield* this.go(s.f, s.x, s.z, { tries: 1 });     // handed over: step back, out of her path
  }
  // An empty glass outdoors. One left on the terrace table is out of our reach: that is the house staff's.
  *clear(e) {
    const H = this.H, nav = this.nav;
    try {
      const c = nav.nearest(0, e.x, e.z, 1.2, 5), ok = c >= 0 && (yield* this.go(0, nav.cx(c), nav.cz(c)));
      if (!ok || Math.hypot(e.x - this.x, e.z - this.z) > 4.6) {
        if (e.inHand) e.skipUntil = H.now + 30; else { e.outside = false; if (this.visitorDist() < 14) this.line('passOn', { toGuest: false }); }
        return;
      }
      for (let t = 0; t < 0.8; t += H.dt) { this.m.faceTo(e.x, e.z, H.dt); yield; }
      this.anim = 'pick'; yield* this.wait(0.8); this.anim = null;
      if (!H.empties.includes(e)) return;
      H.takeEmpty(e, this);
      this.line('clear', { toGuest: this.visitorDist() < 10 });
      yield* this.linger(5);
      this.body.slot.clear(); this.body.tray.visible = false;
    } finally { e.claimed = null; this.anim = null; }
  }

  // ---- the work ----------------------------------------------------------------------------------------
  // Go to a place of work and face it; false if it could not be reached
  *goWork(s) {
    const H = this.H; if (!s) return false;
    if (!(yield* this.go(0, s.x, s.z))) return false;
    for (let t = 0; t < 0.8; t += H.dt) { this.m.faceTo(s.fx, s.fz, H.dt); yield; }
    return true;
  }
  // Where the work is: from where I stand toward the bed or border, just over its edge; y: the soil
  workPoint(s, out, inset = 0.7, along = 0) {
    const dx = s.fx - this.x, dz = s.fz - this.z, L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L;
    let e = 0.6; while (e < Math.min(L, 4.5) && this.nav.freeAt(0, this.x + ux * e, this.z + uz * e, 0.01)) e += 0.2;
    const d = Math.min(e + inset, L, 3.2);
    return out.set(this.x + ux * d - uz * along, s.y ?? 0.05, this.z + uz * d + ux * along);
  }
  line2(pool, chance) { const H = this.H; if (pool && H.rnd() < chance) this.line(H.day.light < 0.3 && VOICE[this.key][pool + 'Night'] ? pool + 'Night' : pool, { toGuest: false, expr: 'happy' }); }
  // Wait until the hand holds what it should (it fetches it from the pouch, or puts it back)
  *ready(i, what) { this.want[i] = what; const t0 = this.H.now; while (this.body.hands[i].userData.holding !== what && this.H.now - t0 < 2.5) yield; if (this.body.hands[i].userData.holding !== what) this.swap(i, what); }
  *work_(kind, secs, s, o = {}) {
    const H = this.H, w = this.work, end = H.now + secs;
    w.kind = kind; w.t0 = H.now; w.n = 0;
    while (H.now < end) { if (o.step?.(w) === false) break; this.lookIdle(s); yield; }
  }
  // While working, a glance at her now and then (as linger), but the work stays where it is
  lookIdle(s) { const H = this.H, v = H.visitor, d = this.visitorDist(); if (d < 16 && H.now < this.glance && this.seeGuest()) this.m.faceTo(v.x, v.z, H.dt * 0.4); else if (s) this.m.faceTo(s.fx, s.fz, H.dt * 0.8); if (H.now > this.glance + 8 && d < 16 && H.rnd() < H.dt * 0.05) this.glance = H.now + 1.5 + H.rnd(); }
  doneWork() { const w = this.work; w.kind = null; w.pour = 0; this.drop = 0; this.want[0] = 'glove'; this.want[1] = this.key === 'bramble' ? 'can' : 'glove'; }

  // Watering (Bramble, left-handed with the can): the rose over the plants, water falling from it onto them,
  // along the bed's edge; she lifts the can between goes, and the water stops
  *water(s) {
    const H = this.H, w = this.work;
    try {
      if (!(yield* this.goWork(s))) return;
      yield* this.ready(1, 'can');
      this.drop = s.y > 1 ? 0 : 0.65; w.top = s.top ?? 1.4;
      this.line2('water', 0.6);
      let along = -0.8 + H.rnd() * 0.4, dir = 1;
      yield* this.work_('water', 20 + H.rnd() * 14, s, { step: ww => {
        const k = ((H.now - ww.t0) % 4.6);
        ww.pour = k < 3.6 ? 1 : 0;                                         // pour, then lift the can and move along
        if (k < 3.6) along += dir * H.dt * 0.35; if (Math.abs(along) > 1.1) dir = -dir;
        this.workPoint(s, ww.T, 1.4, along);
      } });
      H.events.tidies++;
    } finally { this.doneWork(); }
  }
  // Deadheading: secateurs out of the pouch, to a spent flower head, snip, the head falls; the next one
  *deadhead(s) {
    const H = this.H, w = this.work;
    try {
      if (!(yield* this.goWork(s))) return;
      yield* this.ready(0, 'secateurs');
      this.drop = s.y > 1 ? 0 : 0.45;
      this.line2('deadhead', 0.6);
      const n = 10 + Math.floor(H.rnd() * 8);
      w.kind = 'snip'; w.t0 = H.now;
      for (let i = 0; i < n; i++) {
        this.workPoint(s, w.T, 0.4 + H.rnd() * 0.4, (H.rnd() - 0.5) * 1.6); w.T.y = (s.top ?? 1.4) - 0.1 - H.rnd() * 0.4;
        w.cut = -1;
        yield* this.wait(1.1, () => { this.lookIdle(s); return false; });
        w.cut = H.now; w.fire = 'petal';                                   // snip: the head drops
        yield* this.wait(0.9, () => { this.lookIdle(s); return false; });
      }
    } finally { this.doneWork(); }
  }
  *hives(s) {
    const H = this.H, w = this.work;
    try {
      if (!(yield* this.goWork(s))) return;
      // the smoker's nozzle a little in front of the entrance (Thistle; Bramble only watches them)
      w.T.set(s.ex + s.nx * 0.5, s.ey + 0.15, s.ez + s.nz * 0.5);
      if (this.key === 'thistle') yield* this.ready(0, 'smoker');
      this.line2('hives', 0.6);
      yield* this.work_(this.key === 'thistle' ? 'smoke' : 'look', 18 + H.rnd() * 10, { fx: s.ex, fz: s.ez });
    } finally { this.doneWork(); }
  }
  // Feeding the koi: a pinch from the pouch, thrown out over the water where they gather
  *koi(s) {
    const H = this.H, w = this.work, fx = s.x + (s.fx - s.x) * 0.45, fz = s.z + (s.fz - s.z) * 0.45;
    feedKoi(fx, fz);      // the fish really come (pond.js keeps the food in open water)
    try {
      if (!(yield* this.goWork(s))) return;
      this.line2('koi', 0.6);
      w.T.set(fx, POND.y, fz);
      for (let i = 0; i < 4; i++) { w.kind = 'throw'; w.t0 = H.now; w.thrown = false; yield* this.wait(1.7, () => { this.lookIdle(s); return false; }); }
      yield* this.wait(1.5, () => { this.lookIdle(s); return false; });
    } finally { this.doneWork(); }
  }
  *rim(s) { try { if (!(yield* this.goWork(s))) return; this.line2('rim', 0.5); this.work.kind = 'look'; yield* this.linger(12 + this.H.rnd() * 8, { x: s.fx, z: s.fz }); } finally { this.doneWork(); } }
  // A sit on a bench: perched on the front of the seat, settled down onto it, hands in the lap
  *bench(s) {
    const H = this.H;
    try {
      if (!(yield* this.goWork(s))) return;
      if (s.seat) {
        // back up toward the seat as far as the ground allows
        const ax = s.seat.x - this.x, az = s.seat.z - this.z, L = Math.hypot(ax, az) || 1;
        for (let t = 0; t < 1.2; t += H.dt) {
          const nx = this.m.x + (ax / L) * H.dt * 0.5, nz = this.m.z + (az / L) * H.dt * 0.5;
          if (Math.hypot(s.seat.x - nx, s.seat.z - nz) > 0.9 && this.nav.freeAt(0, nx, nz, 0.3)) { this.m.x = nx; this.m.z = nz; }
          this.m.faceTo(s.fx, s.fz, H.dt); yield;
        }
      }
      const bottom = this.key === 'bramble' ? 0.56 : 0.58, seatH = s.seat?.h ?? 1.4;
      this.drop = clamp(this.spec.hover - bottom - seatH, 0.3, 0.9);
      this.work.kind = 'bench';
      this.line2('bench', 0.4);
      yield* this.linger(18 + H.rnd() * 20, { x: s.fx, z: s.fz });
    } finally { this.doneWork(); }
  }
  *tuck() {
    const H = this.H, s = this.spots.night[this.key];
    if (s) yield* this.go(0, s.x, s.z);
    if (H.rnd() < 0.5) this.line('tuck', { toGuest: false, expr: 'sleepy' });
    this.drop = 0.9;
    try { while (H.day.light < 0.35) { this.expr = 'sleepy'; this.exprUntil = H.now + 1; if (this.wantsToGreet()) break; yield; } }
    finally { this.drop = 0; }
  }

  // ---- tending: a bout of 20 to 50 seconds at a bed, the bean poles or in the glasshouse ----------------------
  // At a bed: weeding (Thistle with his trowel, Bramble by hand) or, Thistle, picking into his trug. At the
  // teepees: tying in the beans. In the glasshouse: potting on at the bench, watering the staging (Bramble, who
  // has the can; Thistle looks the pots over by hand), pinching out the tomato.
  inGlass() { return this.x > GLASS.x0 && this.x < GLASS.x1 && this.z > GLASS.z0 && this.z < GLASS.z1; }
  // A few straight steps where the plan's clearance is too tight for its paths (the glasshouse door)
  *stepTo(x, z) {
    const H = this.H, m = this.m; m.stop();
    for (let t = 0; t < 14; t += H.dt) {
      const dx = x - m.x, dz = z - m.z, d = Math.hypot(dx, dz); if (d < 0.08) { m.v = 0; return true; }
      const st = Math.min(d, 1.5 * H.dt), nx = m.x + (dx / d) * st, nz = m.z + (dz / d) * st;
      m.faceTo(x, z, H.dt * 1.5);
      if (!m.avoid(nx, nz) && this.nav.freeAt(0, nx, nz, 0.8)) { m.x = nx; m.z = nz; m.v = 1.5; } else m.v = 0;
      yield;
    }
    m.v = 0; return false;
  }
  *enterGlass() {
    if (this.inGlass()) return true;
    const o = this.other; if (o && (o.inGlass() || o.site?.in)) return false;
    const D = GLASS.door, c = this.nav.nearest(0, D.x, D.out, 1.2, 3); if (c < 0) return false;
    if (!(yield* this.go(0, this.nav.cx(c), this.nav.cz(c)))) return false;
    return (yield* this.stepTo(D.x, D.sill)) && (yield* this.stepTo(D.x, D.in));
  }
  *leaveGlass() {
    const D = GLASS.door;
    if (Math.abs(this.x - D.x) > 0.6 || this.z < D.in - 0.5) yield* this.go(0, D.x, D.in, { tries: 2 });
    if ((yield* this.stepTo(D.x, D.in)) && (yield* this.stepTo(D.x, D.sill))) yield* this.stepTo(D.x, D.out);
  }
  *tend(s) {
    const H = this.H, w = this.work, b = this.body, thistle = this.key === 'thistle';
    try {
      this.site = s;
      if (s.in) { if (!(yield* this.enterGlass()) || !(yield* this.go(0, s.x, s.z, { tries: 2 }))) return; for (let t = 0; t < 0.8; t += H.dt) { this.m.faceTo(s.fx, s.fz, H.dt); yield; } }
      else if (!(yield* this.goWork(s))) return;
      const end = H.now + 22 + H.rnd() * 26, job = s.job === 'bed' ? (thistle && H.rnd() < 0.45 ? 'pick' : 'weed') : s.job;
      const at = (inset, along, y) => { this.workPoint(s, w.T, inset, along); w.T.y = y; };
      this.line2(job === 'pick' || job === 'stage' ? 'water' : 'deadhead', 0.25);
      if (job === 'weed') {
        if (thistle) yield* this.ready(0, 'trowel');
        this.drop = 0.15; this.lean = 0.08;
        while (H.now < end) { at(0.5, (H.rnd() - 0.5) * 1.6, s.y - 0.02); yield* this.work_(thistle ? 'dig' : 'hands', 3.2 + H.rnd() * 1.5, s); if (thistle) { w.kind = 'drop'; w.T2.copy(w.T).y += 0.1; w.T2.x += (this.x - w.T.x) * 0.3; w.T2.z += (this.z - w.T.z) * 0.3; w.fire = 'weed'; yield* this.wait(0.7); } }
      } else if (job === 'pick') {
        yield* this.ready(0, 'secateurs'); b.tray.visible = true; w.kind = 'snip'; w.t0 = H.now;
        while (H.now < end) { at(0.4 + H.rnd() * 0.3, (H.rnd() - 0.5) * 1.6, (s.top ?? 2.9) - 0.1 - H.rnd() * 0.3); w.cut = -1; yield* this.wait(1.3, () => { this.lookIdle(s); return false; }); w.cut = H.now; yield* this.wait(1.2, () => { this.lookIdle(s); return false; }); }
      } else if (job === 'stage' && !thistle) {
        yield* this.ready(1, 'can'); w.top = s.top; let along = -0.8, dir = 1;
        yield* this.work_('water', end - H.now, s, { step: ww => { const k = (H.now - ww.t0) % 4.6; ww.pour = k < 3.6 ? 1 : 0; if (k < 3.6) along += dir * H.dt * 0.35; if (Math.abs(along) > 1.3) dir = -dir; w.T.set(s.fx + (s.x - s.fx) * 0.35, s.y, s.fz + along); } });
      } else {
        // by hand: tying in, firming the compost round a seedling, turning the pots, pinching out
        const dx = s.fx - s.x, dz = s.fz - s.z, L = Math.hypot(dx, dz) || 1, reach = Math.min(L, 1.9);
        while (H.now < end) { const side = (H.rnd() - 0.5) * (job === 'tie' || job === 'pinch' ? 0.3 : 1.6); w.T.set(s.x + (dx / L) * reach - (dz / L) * side, s.y + (H.rnd() - 0.5) * (job === 'tie' ? 1.2 : 0.2), s.z + (dz / L) * reach + (dx / L) * side); yield* this.work_(job === 'pot' && thistle && H.rnd() < 0.5 ? 'dig' : 'hands', 3 + H.rnd() * 2, s); }
      }
      H.events.tidies++;
    } finally { b.tray.visible = false; this.site = null; this.lean = 0; this.doneWork(); }
  }

  // ---- rung for at the fire pit (garden/smores.js) ----------------------------------------------------
  // Free to come? Not while seeing to her, carrying for her, or tucked up for the night.
  canBring() {
    const H = this.H;
    return !this.inGlass() && !this.carrying && !this.fetching && !this.engaged && H.host !== this && H.talk.robot !== this && !['tuck', 'greet', 'fetch', 'deliver', 'clear', 'smores', 'demo', 'staged'].includes(this.taskName);
  }
  // Walk over with the board of s'mores things (job.things, carried where the trug is), set it down by the
  // fire, say a word. Whatever becomes of the errand, the board ends up by the fire (job.arrive).
  *smores(job) {
    const H = this.H, b = this.body, trug = b.tray.children[0];
    try {
      trug.visible = false; b.slot.add(job.things); b.tray.visible = true;
      const c = this.nav.nearest(0, job.x, job.z, 1.2, 6);
      if (c >= 0 && (yield* this.go(0, this.nav.cx(c), this.nav.cz(c), { speed: 1.4 }))) {
        for (let t = 0; t < 0.7; t += H.dt) { this.m.faceTo(job.tx, job.tz, H.dt); yield; }
        this.drop = 0.35; this.lean = 0.12; yield* this.wait(0.5);                 // bend, and set it down
      }
      b.slot.remove(job.things); b.tray.visible = false; trug.visible = true; job.arrive();
      yield* this.wait(0.4); this.drop = 0; this.lean = 0;
      this.say(this.key === 'bramble' ? 'S’mores things, love. The chocolate’s the good kind, and the sticks are hazel.' : 'Marshmallows. Sticks. Don’t burn them.', { expr: 'happy' });
      yield* this.wait(2.5);
    } finally { b.slot.remove(job.things); b.tray.visible = false; trug.visible = true; this.drop = 0; this.lean = 0; job.arrive(); }
  }

  // ---- the wheelbarrow -------------------------------------------------------------------------------
  // Walk round to the handles, bend, take hold with both hands, lift it onto its wheel
  *takeBarrow() {
    const H = this.H, b = this.barrow, nav = this.nav;
    if (b.held) return true;
    b.mark(nav, false);
    const r = b.robotSpot(0), c = nav.nearest(0, r.x, r.z, 0.75, 3);
    if (c < 0) return false;
    if (Math.hypot(nav.cx(c) - this.x, nav.cz(c) - this.z) > 0.6 && !(yield* this.go(0, nav.cx(c), nav.cz(c), { tries: 2 }))) { b.mark(nav, true); return false; }
    // the last step onto the handles, facing the way it points
    for (let t = 0; t < 1.6; t += H.dt) {
      const g = b.robotSpot(0), k = Math.min(1, H.dt * 3);
      if (nav.freeAt(0, g.x, g.z, 0.3)) { this.m.x += (g.x - this.m.x) * k; this.m.z += (g.z - this.m.z) * k; }
      this.m.face(b.yaw, H.dt * 1.6);
      if (t > 0.6 && Math.abs(wrap(b.yaw - this.m.yaw)) < 0.06 && Math.hypot(g.x - this.m.x, g.z - this.m.z) < 0.08) break;
      yield;
    }
    this.m.yaw = b.yaw;
    this.drop = 0.35; this.lean = 0.12;                                     // bend
    yield* this.wait(0.45);
    b.held = true; this.grip = 0;                                          // hands to the grips
    while (this.grip < 1) { this.grip = Math.min(1, this.grip + H.dt * 2.2); this.follow(0); yield; }
    // and lift: the grips come up and toward him, he straightens and steps in
    this.drop = 0;
    for (let a = 0; a < PUSH_A; a += H.dt * 0.6) { if (!b.held) return false; b.a = a; this.follow(0); yield; }
    b.a = PUSH_A; this.lean = 0;
    return true;
  }
  // Set it down on its legs and let go
  *setDown() {
    const H = this.H, b = this.barrow;
    if (!b.held) return;
    this.lean = -0.04;
    while (b.a > 0) { b.a = Math.max(0, b.a - H.dt * 0.55); this.drop = 0.35 * (1 - b.a / PUSH_A); this.follow(0); yield; }
    this.letGo();
    yield* this.wait(0.4);
    this.drop = 0; this.lean = 0;
  }
  letGo() { const b = this.barrow; if (!b?.held) return; b.held = false; this.grip = 0; this.lean = 0; this.m.v = 0; b.mark(this.nav, true); }
  // Stand where the grips put me (pushing, lifting, tipping): the one pushing follows the barrow
  follow(v) {
    const b = this.barrow, r = b.robotSpot();
    if (this.nav.freeAt(0, r.x, r.z, 0.3)) { this.m.x = r.x; this.m.z = r.z; }
    this.m.yaw = b.yaw; this.m.v = Math.abs(v);
  }
  // Push it to (tx, tz), arriving heading tyaw. The wheel is steered along a path planned for it: he swings
  // the handles to point it (it turns about the wheel), and it rolls the way it points.
  *pushTo(tx, tz, tyaw, o = {}) {
    const H = this.H, b = this.barrow, nav = this.nav, run = o.runIn ?? 2.2, fr = o.front ?? 0;
    const ux = Math.sin(tyaw), uz = Math.cos(tyaw);
    let path = null;
    const plan = () => { for (const need of [1.5, 1.2, 0.9]) { path = nav.path(0, b.x, b.z, 0, tx - ux * run, tz - uz * run, need); if (path) break; } };
    plan();
    // the way on is behind it (it stands alongside a bed, where it was left): pull it back out first
    if (path && path.length > 1 && Math.abs(wrap(Math.atan2(path[1].x - b.x, path[1].z - b.z) - b.yaw)) > 1.2) { yield* this.backOut(2.4); plan(); }
    if (!path) { this.cartLog?.push(`no path to ${tx.toFixed(1)},${tz.toFixed(1)}`); return false; }
    path.push({ x: tx, z: tz });
    let i = 1, v = 0, stuck = 0, backing = 0, last = 0, best = 1e9, since = H.now;
    this.m.stop();
    for (;;) {
      const dt = H.dt;
      if (!b.held) return false;
      while (i < path.length - 1 && Math.hypot(path[i].x - b.x, path[i].z - b.z) < 1.1) i++;
      const fin = i === path.length - 1, dL = Math.hypot(tx - b.x, tz - b.z);
      if (fin && dL < 0.25) break;
      // getting somewhere? (by the path still to go) if not for a while, that counts as stuck
      const togo = (path.length - i) * 20 + Math.hypot(path[i].x - b.x, path[i].z - b.z);
      if (togo < best - 0.3) { best = togo; since = H.now; } else if (H.now - since > 7) { since = H.now; best = togo; stuck = 2; }
      let want = Math.atan2(path[i].x - b.x, path[i].z - b.z);
      if (fin && dL < 0.7) want = tyaw;
      const err = wrap(want - b.yaw), om = clamp(err * 1.7, -0.75, 0.75);
      let vt = 1.25 * Math.max(0, Math.cos(err)) ** 3 * Math.min(1, 0.2 + dL / 2.5);
      if (Math.abs(err) > 0.9) vt = 0;                                      // swing it round on its wheel first
      if (i < path.length - 1) {                                           // and slow for a corner coming
        const ax = path[i].x - b.x, az = path[i].z - b.z, bx = path[i + 1].x - path[i].x, bz = path[i + 1].z - path[i].z;
        const turn = Math.abs(wrap(Math.atan2(bx, bz) - Math.atan2(ax, az))), dd = Math.hypot(ax, az);
        if (turn > 0.5 && dd < 2.5) vt = Math.min(vt, 0.25 + dd * 0.3);
      }
      if (fin && dL < 0.7) vt = Math.min(vt, 0.35);
      if (this.m.avoid(b.x + b.ux * 1.4, b.z + b.uz * 1.4)) { vt = 0; stuck += dt; }       // somebody in front of it: wait
      if (backing > 0) { backing -= dt; vt = -0.45; }
      v += (vt - v) * Math.min(1, dt * 2.4);
      // it turns about its wheel; where that leaves him no room (a narrow path), about a point a little
      // way back along it, no further back than it must
      const ny = b.yaw + om * dt, s = v * dt;
      let ok = false;
      const lip = (x, z) => (Math.hypot(tx - x, tz - z) < run + 0.3 ? fr : 0);
      const dr = gripH(b.a) + REACH;
      PIVOTS4[3] = dr;
      for (const c of om ? (stuck > 0.5 ? PIVOTS4 : PIVOTS) : NOPIVOT) {          // (at a pinch, he turns on the spot and swings it round)
        const px = b.x - b.ux * c, pz = b.z - b.uz * c, nx = px + Math.sin(ny) * (c + s), nz = pz + Math.cos(ny) * (c + s);
        if (fits(nav, nx, nz, ny, b.a, lip(nx, nz))) { b.move(nx, nz, ny); ok = true; break; }
      }
      if (!ok && s && fits(nav, b.x + b.ux * s, b.z + b.uz * s, b.yaw, b.a, lip(b.x, b.z))) { b.move(b.x + b.ux * s, b.z + b.uz * s, b.yaw); ok = true; }
      if (!ok && om) {
        // cramped (a narrow path, off its middle): shuffle it over toward the roomier side, turning as it goes
        const qx = b.uz, qz = -b.ux, F = nav.floors[0], cl = sg => { const c = nav.cellOf(b.x - b.ux * 1.4 + qx * sg * 1.2, b.z - b.uz * 1.4 + qz * sg * 1.2); return c < 0 ? 0 : F.clear[c]; };
        const sg = cl(1) >= cl(-1) ? 1 : -1, sh = 0.35 * dt * sg, px = b.x - b.ux * 1.4 + qx * sh, pz = b.z - b.uz * 1.4 + qz * sh;
        for (let k = 0, yy = ny; k < 2; k++, yy = b.yaw) { const nx = px + Math.sin(yy) * 1.4, nz = pz + Math.cos(yy) * 1.4; if (fits(nav, nx, nz, yy, b.a, lip(nx, nz))) { b.move(nx, nz, yy); ok = true; break; } }
      }
      if (ok) stuck = Math.max(0, stuck - dt * 0.5); else { v *= 0.5; stuck += dt; }
      if (stuck > 1.2 && backing <= 0) {                                    // back off a little and try again
        backing = 1.2; stuck = 0;
        this.cartLog?.push(`backing at ${b.x.toFixed(1)},${b.z.toFixed(1)} yaw ${b.yaw.toFixed(2)} for ${path[i].x.toFixed(1)},${path[i].z.toFixed(1)}`);
        if (dL < 3.2 && last >= 2) break;                                    // near enough: it will do here
        if (++last > 6) { this.cartLog?.push(`stuck at ${b.x.toFixed(1)},${b.z.toFixed(1)} going to ${tx.toFixed(1)},${tz.toFixed(1)}`); return false; }
      }
      // lean into the push, and back as he slows
      const acc = (v - (this.pv ?? 0)) / Math.max(dt, 1e-3); this.pv = v;
      this.lean = clamp(0.06 + v * 0.05 + acc * 0.12, -0.08, 0.2);
      this.follow(v);
      yield;
    }
    // stop, and square up on the wheel to the way it should point
    for (let t = 0; t < 2.5 && Math.abs(wrap(tyaw - b.yaw)) > 0.04 && Math.abs(wrap(tyaw - b.yaw)) < 0.5; t += H.dt) {
      const ny = b.yaw + clamp(wrap(tyaw - b.yaw) * 2, -0.6, 0.6) * H.dt;
      if (!fits(nav, b.x, b.z, ny, b.a, fr)) break;
      b.move(b.x, b.z, ny); this.follow(0.2); yield;
    }
    this.pv = 0; this.lean = 0; this.m.v = 0;
    return true;
  }
  // Tip it out over its wheel: handles up, the load slides out over the front, a shake, down again
  *tipOut() {
    const H = this.H, b = this.barrow;
    this.lean = 0.14;
    for (let a = b.a; a < TIP_A; a += H.dt * 0.7) { b.a = a; this.follow(0); if (a > TIP_A - 0.3 && b.B.load) { this.spill(); } yield; }
    for (let t = 0; t < 0.8; t += H.dt) { b.a = TIP_A + 0.04 * Math.sin(t * 16); this.follow(0); if (b.B.load) this.spill(); yield; }
    b.B.setLoad(''); this.load = '';
    for (let a = b.a; a > PUSH_A; a -= H.dt * 0.7) { b.a = a; this.follow(0); yield; }
    b.a = PUSH_A; this.lean = 0;
  }
  // Pull it back out, straight, the way it came in (from the bays: its front was over the lip)
  *backOut(dist, front = 0) {
    const H = this.H, b = this.barrow;
    for (let d = 0, v = 0; d < dist; ) {
      v = Math.min(0.6, v + H.dt * 1.2); const s = v * H.dt, nx = b.x - b.ux * s, nz = b.z - b.uz * s;
      if (!b.held || !fits(this.nav, nx, nz, b.yaw, b.a, front)) break;
      b.move(nx, nz, b.yaw); d += s; this.lean = -0.06; this.follow(-v); yield;
    }
    this.lean = 0; this.m.v = 0;
  }
  spill() {
    const H = this.H, b = this.barrow, fx = this.fx;
    if (!this.drawn || H.rnd() > 0.5) return;
    b.trayPoint(T1, (H.rnd() - 0.5) * 0.6, 0.5 + H.rnd() * 0.3);
    const col = this.load === 'weeds' ? COL.weed : this.load === 'leaves' ? COL.leaf[Math.floor(H.rnd() * 3)] : COL.soil;
    fx.spawn(FX.CLOD, T1.x, T1.y, T1.z, b.ux * 1.2 + (H.rnd() - 0.5) * 0.6, -0.5, b.uz * 1.2 + (H.rnd() - 0.5) * 0.6, col, 2.5, 0.08);
  }
  // A place to leave it while working at s: beside the work, alongside an edge (a bed, a fence), not on a
  // way through, not in a gate, with room to pass it and room to take it up again
  parkFor(s) {
    const nav = this.nav, F = nav.floors[0], v = this.H.visitor;
    let best = null, bs = -1e9; const why = this.parkWhy = {}, no = k => { why[k] = (why[k] ?? 0) + 1; };
    for (let dx = -5; dx <= 5; dx += 1) for (let dz = -5; dz <= 5; dz += 1) {
      const c = nav.cellOf(s.x + dx, s.z + dz); if (c < 0 || !F.walk[c]) continue;
      const mx = nav.cx(c), mz = nav.cz(c), dw = Math.hypot(mx - s.x, mz - s.z);
      if (dw < 1.8 || dw > 4.8) continue; if (onWay(mx, mz) || GATES.some(([gx, gz]) => Math.hypot(gx - mx, gz - mz) < 5)) { no('way'); continue; }
      if (v.present && v.outside && Math.hypot(v.x - mx, v.z - mz) < 4) continue;
      for (let k = 0; k < 8; k++) {
        const yaw = (k / 8) * Math.PI * 2, ux = Math.sin(yaw), uz = Math.cos(yaw), wx = mx + ux * 1.2, wz = mz + uz * 1.2;
        if (!fits(nav, wx, wz, yaw, 0)) { no('fit'); continue; }
        // alongside an edge: a blocked cell close on one side, open ground on the other
        let side = 0;
        for (const sg of [-1, 1]) { if (!nav.freeAt(0, mx + uz * sg * 1.9, mz - ux * sg * 1.9, 0.01) && !nav.freeAt(0, wx + uz * sg * 1.9, wz - ux * sg * 1.9, 0.01)) side = sg; }
        if (side && !nav.freeAt(0, mx - uz * side * 2.2, mz + ux * side * 2.2, 0.5)) { no('pass'); continue; }               // room to pass it
        const r = { x: wx - ux * (gripH(0) + REACH), z: wz - uz * (gripH(0) + REACH) };
        if (!nav.freeAt(0, r.x, r.z, 0.9) || onWay(wx, wz)) { no('robot'); continue; }
        const px = wx - ux * 2.2, pz = wz - uz * 2.2;                                                 // the run-in to it, from open path
        if (!nav.freeAt(0, px, pz, 1.0) || !fits(nav, px, pz, yaw, PUSH_A)) { no('runin'); continue; }
        // (alongside the bed rather than poking at it, and pointing the way it will arrive: no turning on the spot)
        const arrive = Math.atan2(wx - this.barrow.x, wz - this.barrow.z), along = Math.abs(Math.sin(yaw - Math.atan2(s.fx - s.x, s.fz - s.z)));
        const sc = (side ? 3 : 0) - Math.abs(dw - 2.8) * 0.8 - Math.hypot(wx - this.barrow.x, wz - this.barrow.z) * 0.01 + along * 0.8 + Math.cos(yaw - arrive) * 1.2;
        if (sc > bs) { bs = sc; best = { x: wx, z: wz, yaw }; }
      }
    }
    return best;
  }
  // The compost: the wheel at the open front of a bay, pointing in; turned as needed for him to fit behind it
  // (the bays face a path between them and the potager's fence too narrow to stand square to them in, so it
  // comes in from the open end of that path, along it, and is tipped into the end bay's mouth, its front over
  // the bay's lip)
  tipSpot() {
    const nav = this.nav;
    for (const x of [COMPOST.x1 - 1.2, COMPOST.x1 - 1.7, COMPOST.x1 - 0.7]) for (const z of [COMPOST.z + 0.8, COMPOST.z + 1.1]) for (const t of [0.45, 0.3, 0.6, 0.2]) {
      const yaw = -Math.PI / 2 - t;
      if (fits(nav, x, z, yaw, PUSH_A, 1.2)) return { x, z, yaw, front: 1.2 };
    }
    return null;
  }
  // A barrow round: take it to the work for a reason, work, take the load to the compost and tip it, put it away
  *cart(site) {
    const H = this.H, b = this.barrow, w = this.work;
    if (!b || !site) return;
    const home = Math.hypot(b.x - BARROW_HOME.x, b.z - BARROW_HOME.z) < 2;
    const log = this.cartLog = [];
    const kind = site.sweep ? 'sweep' : this.forceKind ?? (home && site.box && H.rnd() < 0.35 ? 'mulch' : 'weed');
    try {
      if (!home && Math.hypot(b.x - site.x, b.z - site.z) > 8 && H.rnd() < 0.5) { yield* this.putAway(); return; }       // tidy it away first
      const park = this.parkFor(site); log.push(`${kind} park ${park ? park.x.toFixed(1) + ',' + park.z.toFixed(1) : 'NONE'}`); if (!park) return;
      if (!(yield* this.takeBarrow())) return;
      if (H.rnd() < 0.5) this.line('barrow', { toGuest: false });
      if (kind === 'mulch') {                                                // a load of the good stuff from the bays first
        const tp = this.tipSpot();
        if (tp && (yield* this.pushTo(tp.x, tp.z, tp.yaw, tp))) { yield* this.setDown(); yield* this.scoop(true); if (!(yield* this.takeBarrow())) return; yield* this.backOut(3.2, tp.front); }
      }
      if (!(yield* this.pushTo(park.x, park.z, park.yaw))) { log.push(`push to park failed at ${b.x.toFixed(1)},${b.z.toFixed(1)}`); yield* this.setDown(); return; }
      yield* this.setDown();
      // the work
      if (kind === 'sweep') yield* this.sweep(site);
      else if (kind === 'mulch' && this.load) yield* this.mulch(site);
      else yield* this.weed(site);
      // full: to the compost, tip it out; then home
      if (!(yield* this.takeBarrow())) return;
      if (this.load) { const tp = this.tipSpot(); log.push(tp ? `tip ${tp.x.toFixed(1)},${tp.yaw.toFixed(2)}` : 'no tip spot'); if (tp && (yield* this.pushTo(tp.x, tp.z, tp.yaw, tp))) { yield* this.tipOut(); yield* this.backOut(3.2, tp.front); } }
      yield* this.putAway(true);
    } finally { this.letGo(); this.doneWork(); }
  }
  *stow() { try { yield* this.putAway(); } finally { this.letGo(); this.doneWork(); } }
  *putAway(holding = false) {
    if (!holding && !(yield* this.takeBarrow())) return;
    // back out of the bays' front before turning for home
    if (yield* this.pushTo(BARROW_HOME.x, BARROW_HOME.z, BARROW_HOME.yaw)) yield* this.setDown();
    else yield* this.setDown();
    const s = this.nav.nearest(0, this.x - Math.sin(this.m.yaw) * 1.5, this.z - Math.cos(this.m.yaw) * 1.5, 1.2, 3);
    if (s >= 0) yield* this.go(0, this.nav.cx(s), this.nav.cz(s), { tries: 1 });            // and a step away from it
  }
  // Weeding beside the parked barrow: trowel out, dig, pull, and the weeds go into the barrow
  *weed(s) {
    const H = this.H, w = this.work, b = this.barrow;
    if (!(yield* this.goWork(s))) return;
    yield* this.ready(0, 'trowel');
    this.drop = s.y > 1 ? 0.15 : 0.9; this.lean = s.y > 1 ? 0.08 : 0.2;
    if (H.rnd() < 0.5) this.line2('deadhead', 0.3);
    for (let i = 0; i < 4; i++) {
      this.workPoint(s, w.T, 0.5, (H.rnd() - 0.5) * 1.4); w.T.y = (s.y ?? 0.05) - 0.02;
      yield* this.work_('dig', 3.2 + H.rnd(), s);
      // the weeds into the barrow, if it is within reach of a turn
      if (Math.hypot(b.x - b.ux * 1 - this.x, b.z - b.uz * 1 - this.z) < 4.2) {
        w.kind = 'drop'; b.trayPoint(w.T2);
        for (let t = 0; t < 1.2; t += H.dt) { this.m.faceTo(w.T2.x, w.T2.z, H.dt * 2); yield; }
        b.B.setLoad(i < 1 ? b.B.load || 'weeds' : 'weeds'); this.load = 'weeds'; w.fire = 'weed';
        yield* this.wait(0.5);
      }
    }
    this.drop = 0; this.lean = 0; this.doneWork(); yield* this.wait(0.6);
  }
  // Sweeping the path: the broom from the barrow, strokes along the path into a heap, the heap into the barrow
  *sweep(s) {
    const H = this.H, w = this.work, b = this.barrow, fx = this.fx;
    const [ax, az] = s.a, [bx, bz] = s.b, L = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / L, dz = (bz - az) / L;
    // the leaves, lying along the stretch to sweep (only drawn when she is near)
    const leaves = [];
    for (let i = 0; i < 14; i++) { const t = H.rnd() * L * 0.7, l = (H.rnd() - 0.5) * 3; leaves.push(fx.spawn(FX.LEAF, ax + dx * t - dz * l, 0.07, az + dz * t + dx * l, 0, 0, 0, COL.leaf[i % 3], 200)); }
    // the broom
    const tray = b.trayPoint(T1); if (!(yield* this.go(0, ...this.nearCell(tray.x, tray.z)))) return;
    for (let t = 0; t < 0.6; t += H.dt) { this.m.faceTo(tray.x, tray.z, H.dt * 2); yield; }
    yield* this.ready(0, 'broom');
    // stroke along the path, a step at a time, the heap ahead of the broom
    const pileX = ax + dx * L * 0.8, pileZ = az + dz * L * 0.8;
    for (let t = 0; t <= L * 0.75; t += 1.4) {
      const px = ax + dx * t - dz * 0.3, pz = az + dz * t + dx * 0.3;
      if (!(yield* this.go(0, ...this.nearCell(px - dx * 1.6, pz - dz * 1.6), { tries: 1 }))) continue;
      w.kind = 'sweep'; w.t0 = H.now; w.T.set(px + dx * 0.4, 0.06, pz + dz * 0.4); w.sx = -dz; w.sz = dx;
      for (let k = 0; k < 2.2; k += H.dt) {
        this.m.faceTo(bx, bz, H.dt * 1.5);
        // each stroke pushes the leaves near the bristles toward the heap
        for (const i of leaves) { const a = i * 3, p = fx.p; if (p[a + 1] < -100) continue; if (Math.hypot(p[a] - w.T.x, p[a + 2] - w.T.z) < 1.3) { p[a] += (pileX - p[a]) * H.dt * 0.5; p[a + 2] += (pileZ - p[a + 2]) * H.dt * 0.5; } }
        fx.pa.needsUpdate = true;
        yield;
      }
    }
    w.kind = null;
    yield* this.ready(0, 'glove');                                        // (the broom back in the barrow, on the way)
    // the heap into the barrow, two handfuls
    const sp = this.nearCell(pileX, pileZ); yield* this.go(0, ...sp, { tries: 1 });
    w.T.set(pileX, 0.1, pileZ); b.trayPoint(w.T2);
    for (let k = 0; k < 2; k++) { w.kind = 'scoop'; w.t0 = H.now; yield* this.wait(1.6, () => { this.m.faceTo(pileX, pileZ, H.dt); return false; }); }
    for (const i of leaves) fx.life[i] = 0.01;
    b.B.setLoad('leaves'); this.load = 'leaves';
    // the broom back in the barrow, if it is near; it rides home with the leaves
    this.doneWork();
  }
  // A load from the compost bays: handfuls scooped from the heap into the barrow
  *scoop(fill) {
    const H = this.H, w = this.work, b = this.barrow;
    const sx = this.x + b.ux * 2.6, sz = this.z + b.uz * 2.6;
    b.trayPoint(w.T2); w.T.set(b.x + b.ux * 0.6, 0.4, b.z + b.uz * 0.6);
    const sp = this.nearCell(b.x - b.uz * 1.3 + b.ux * 0.2, b.z + b.ux * 1.3 + b.uz * 0.2); yield* this.go(0, ...sp, { tries: 1 });
    for (let k = 0; k < 3; k++) { w.kind = 'scoop'; w.t0 = H.now; yield* this.wait(1.6, () => { this.m.faceTo(sx, sz, H.dt); return false; }); if (fill && k === 0) { b.B.setLoad('compost'); this.load = 'compost'; } }
    this.doneWork();
  }
  // Digging it in: handfuls from the barrow onto the bed, until it is gone
  *mulch(s) {
    const H = this.H, w = this.work, b = this.barrow;
    if (!(yield* this.goWork(s))) return;
    b.trayPoint(w.T); this.workPoint(s, w.T2, 0.6, 0); w.T2.y = (s.y ?? 0.05) + 0.1;
    for (let k = 0; k < 4; k++) { w.kind = 'scoop'; w.t0 = H.now; w.rev = true; yield* this.wait(1.6, () => { this.lookIdle(k % 2 ? s : { fx: w.T.x, fz: w.T.z }); return false; }); }
    b.B.setLoad(''); this.load = '';
    w.rev = false; this.doneWork();
  }
  nearCell(x, z) { const c = this.nav.nearest(0, x, z, 1.2, 4); return c < 0 ? [this.x, this.z] : [this.nav.cx(c), this.nav.cz(c)]; }

  // A word with the other gardener, when their rounds cross
  *banter(p) {
    const H = this.H;
    H.lastGBanter = H.now;
    const mineFirst = GARDEN_BANTER.filter(b => b.pair[0] === this.key), script = H.bag(`gbanter.${this.key}`, mineFirst.length ? mineFirst : GARDEN_BANTER);
    const mx = (this.x + p.x) / 2, mz = (this.z + p.z) / 2, dx = this.x - p.x, dz = this.z - p.z, L = Math.max(0.01, Math.hypot(dx, dz));
    const a = this.politeSpot(mx + (dx / L) * 2.5, mz + (dz / L) * 2.5, 4), b = this.politeSpot(mx - (dx / L) * 2.5, mz - (dz / L) * 2.5, 4);
    const convo = { ready: 0, done: false };
    p.run('banter', p.banterJoin(convo, this, b), false);
    try {
      if (a) yield* this.go(0, a.x, a.z, { tries: 1 });
      convo.ready++;
      yield* this.wait(20, () => convo.ready >= 2);
      if (Math.hypot(p.x - this.x, p.z - this.z) > 14) return;                           // never shouted across the lawn
      for (const [who, text] of script.lines) {
        const sp = who === 'a' ? this : p;
        const t = sp.say(text, { toGuest: false, secs: Math.min(6, 2.2 + text.length * 0.05) });
        const end = H.now + Math.min(6, 2.2 + t.length * 0.05);
        while (H.now < end) { this.m.faceTo(p.x, p.z, H.dt); yield; }
      }
      H.events.banter++;
    } finally { convo.done = true; }
  }

  // A job staged for a picture or a check (?gardenjob=thistle.cart or bramble.water...): at the nearest place
  // for it to where she stands, over and over, and nothing else
  *staged(k) {
    const H = this.H, S = this.spots, v = H.visitor;
    const lists = { water: S.beds, deadhead: S.borders, hives: S.hives, koi: S.pond, bench: S.benches, rim: S.rim, tend: (S.tend ?? []).filter(t => !this.stageWhat || t.job === this.stageWhat), cart: [...S.beds, ...S.borders.slice(0, 4)], sweep: S.sweeps, weed: S.beds, mulch: S.beds };
    for (;;) {
      const list = lists[k] ?? [], s = list.slice().sort((a, b) => Math.hypot(a.x - v.x, a.z - v.z) - Math.hypot(b.x - v.x, b.z - v.z))[0];
      if (!s) return;
      if (['sweep', 'weed', 'mulch'].includes(k)) { this.forceKind = k === 'sweep' ? null : k; yield* this.cart(s); }
      else yield* this[k](s);
      yield* this.wait(1);
    }
  }

  update(dt, t, draw) {
    const H = this.H, v = H.visitor;
    // She is outside and nobody has said hello yet this outing: the one attending finds work in her part of the
    // garden (at most three times an outing; once she has been greeted, or has spoken to one of us, never)
    if (H.now - this.lastOut > 1) {
      this.lastOut = H.now;
      if (this.interruptible && v.present && v.outside && H.mem.gHello !== v.outSince && H.now - v.outSince > 3 && H.now > this.comeAgain && this.taskName !== 'demo') {
        if (this.cameFor !== v.outSince) { this.cameFor = v.outSince; this.cameTries = 0; }
        // not if one of us is already on the way, or near enough to see her and about to say hello
        const inHand = H.gardeners.some(g => g.taskName === 'greet' || (Math.hypot(g.x - v.x, g.z - v.z) < 45 && g.seeGuest() && g.wantsToGreet()));
        if (!inHand && this.cameTries < 3 && this.attending()) { this.cameTries++; this.comeAgain = H.now + 45; this.think(true); }
      }
    }
    if (this.stageJob && !this.stagedOn && H.now > 1) { this.stagedOn = true; this.run('staged', this.staged(this.stageJob), false); }
    const bw = this.barrow, b = this.body, m = this.m;
    // a picture of him pushing it (staff.js's ?staffdemo=garden sets pushing): there it is, in his hands
    if (bw && this.pushing && !bw.held) { bw.mark(this.nav, false); const d = gripH(PUSH_A) + REACH; bw.place(m.x + Math.sin(m.yaw) * d, m.z + Math.cos(m.yaw) * d, m.yaw); bw.a = PUSH_A; bw.held = true; this.grip = 1; }
    // spoken to while holding it: set it down where it is (a moment, on its legs) and turn to her
    if (bw?.held && this.engaged && this.visitorDist() < 12 && this.taskName !== 'demo') this.letGo();
    if (bw && !bw.held && bw.a > 0) bw.a = Math.max(0, bw.a - dt * 1.2);
    if (bw && !bw.held && bw.markedVer !== this.nav.version && bw.marked.length) bw.mark(this.nav, true);           // the plan was rebuilt
    // (the lean and the bend are this gardener's own, on top of what Robot.update does with the body)
    if (!m.path && !bw?.held) m.v = Math.max(0, m.v - dt * 3);
    b.bob.rotation.x -= this.leanNow ?? 0;
    // nobody stands out past the island's edge: brought back to the nearest ground safely inside it (see offLand)
    { const k = offLand(m.x, m.z); if (k) { m.x = ISLAND.x + (m.x - ISLAND.x) * k; m.z = ISLAND.z + (m.z - ISLAND.z) * k; } }
    super.update(dt, t, draw);
    this.leanNow = (this.leanNow ?? 0) + ((bw?.held || this.work.kind ? this.lean : 0) - (this.leanNow ?? 0)) * Math.min(1, dt * 3);
    b.bob.rotation.x += this.leanNow;
    this.inter.reach = H.host === this || (this.carrying && this.forGuest) ? 12 : 8;      // within call across the terrace edge, where we cannot follow
    if (bw) {
      // a little side-to-side as it rolls, and a bump now and then on the gravel
      const moving = bw.held && m.v > 0.05;
      bw.roll += ((moving ? 0.03 * Math.sin(bw.rolled * 2.1) : 0) - bw.roll) * Math.min(1, dt * 6);
      bw.bump = moving ? 0.025 * Math.max(0, Math.sin(bw.rolled * 3.3) * Math.sin(bw.rolled * 1.7 + 1)) : 0;
      bw.sync();
    }
    this.drawn = draw;
    if (!draw) {
      // out of sight: nothing in the air, and a tool asked for is simply in the hand (or put away)
      if (this.fx.any) this.fx.clear();
      for (let i = 0; i < 2; i++) if (b.hands[i].userData.holding !== this.want[i]) this.swap(i, this.want[i]);
      return;
    }
    this.pose(dt, t);
    this.fx.update(dt, t, m.x, m.z);
  }
  // Put a tool in hand i (or back: 'glove'); the broom comes from, and goes back to, the barrow
  swap(i, what) {
    const h = this.body.hands[i], was = h.userData.holding;
    if (!holdInHand(h, what)) return;
    if (this.barrow && (what === 'broom' || was === 'broom')) this.barrow.B.setLoad(this.barrow.B.load, was === 'broom');
  }

  // ---- hands -------------------------------------------------------------------------------------------
  // Every frame she can see: where each hand should be (in the body's frame) and how it is turned, from what
  // the work is and where; then eased there. Targets in the world are brought into the body's frame.
  pose(dt, t) {
    const H = this.H, b = this.body, bob = b.bob, w = this.work, hands = b.hands, bw = this.barrow, m = this.m, fx = this.fx;
    b.root.updateMatrixWorld(true);
    const tg = TG, q = QQ, right = 0, left = 1, bram = this.key === 'bramble', R0 = hands[0].userData.rest, R1 = hands[1].userData.rest;
    Q0.identity(); Q1.identity();
    // at rest, swinging a little as he walks
    const sw = Math.min(1, m.v / 1.6) * 0.14 * Math.sin(t * 4.4 + this.i);
    tg[0].set(R0[0] * 0.92, R0[1] - 0.05 + 0.02 * Math.sin(t * 1.8), R0[2] + sw);
    tg[1].set(R1[0] * 0.92, R1[1] - 0.05 - 0.02 * Math.sin(t * 1.8), R1[2] - sw);
    let exact = false;
    const listening = this.engaged && this.visitorDist() < 12;
    const talking = this.bubble.talking(H.now);
    if (bw?.held && this.grip > 0) {
      // both hands on the grips, wherever the grips are
      for (let i = 0; i < 2; i++) { this.toBody(bw.grip(i, T1), T2); T2.y += 0.06; tg[i].lerp(T2, this.grip); }
      exact = this.grip >= 1;
    } else if (listening) {
      // the tool lowered, by the side; the free hand talks
      tg[0].y -= 0.2; tg[0].z += 0.05; if (hands[0].userData.holding !== 'glove') { tg[0].x *= 1.05; }
      const fr = hands[0].userData.holding === 'glove' ? 0 : 1;
      if (talking && !(bram && fr === 1)) { tg[fr].y += 0.12 + 0.07 * Math.abs(Math.sin(t * 4)); tg[fr].z += 0.25; tg[fr].x *= 0.85; }
    } else if (w.kind === 'water') {
      w.pourNow = (w.pourNow ?? 0) + ((w.pour ?? 0) - (w.pourNow ?? 0)) * Math.min(1, dt * 3);
      T1.copy(w.T); T1.y = w.top + 0.55; this.toBody(T1, T2);
      this.aim(left, T2, TOOL_TIPS.can, 0.1 + w.pourNow * 0.75);
      tg[right].set(-0.62, -0.08, 0.05);                                                  // the other hand on her hip
    } else if (w.kind === 'snip') {
      this.toBody(w.T, T2); const cut = H.now - (w.cut ?? -9) < 0.25;
      this.aim(right, T2, TOOL_TIPS.secateurs, -0.25, cut ? 0.35 : 0);
      if (!bram) { tg[left].copy(T2); tg[left].x += 0.3; tg[left].y -= 0.2; tg[left].z -= 0.1; }      // steadying the stem
      else { tg[left].y -= 0.12; }
    } else if (w.kind === 'dig') {
      const ph = ((H.now - w.t0) * 0.85) % 1, d = ph < 0.45 ? -0.12 * Math.sin((ph / 0.45) * Math.PI) : 0.32 * Math.sin(((ph - 0.45) / 0.55) * Math.PI);
      T1.copy(w.T); T1.y += d; this.toBody(T1, T2);
      this.aim(right, T2, TOOL_TIPS.trowel, 1.05 - d * 1.2);
      T1.copy(w.T); T1.y += 0.15 + Math.max(0, d) * 0.6; this.toBody(T1, T3); tg[left].copy(T3); tg[left].x += 0.35;   // pulling the loosened weeds
    } else if (w.kind === 'hands') {
      // both hands busy at the work (Bramble's left keeps her can, lowered)
      const ph = (H.now - w.t0) * 3.4; this.toBody(w.T, T2);
      tg[right].copy(T2); tg[right].x -= 0.15; tg[right].y += 0.07 * Math.sin(ph); tg[right].z += 0.05 * Math.cos(ph);
      if (!bram) { tg[left].copy(T2); tg[left].x += 0.15; tg[left].y -= 0.07 * Math.sin(ph); tg[left].z -= 0.05 * Math.cos(ph); } else tg[left].y -= 0.12;
    } else if (w.kind === 'drop') {
      this.toBody(w.T2, T2); T2.y += 0.35; tg[left].copy(T2);
      if (w.fire === 'weed') { w.fire = null; hands[left].updateMatrixWorld(); hands[left].getWorldPosition(T1); for (let k = 0; k < 4; k++) fx.spawn(FX.CLOD, T1.x, T1.y - 0.1, T1.z, (H.rnd() - 0.5) * 0.4, 0, (H.rnd() - 0.5) * 0.4, COL.weed, 1.2, w.T2.y - 0.05); }
    } else if (w.kind === 'throw') {
      // dip into the pouch, draw back, swing out and let go over the water
      const ph = (H.now - w.t0) / 1.5, hol = b.holster;
      if (ph < 0.3) tg[right].set(hol[0], hol[1] + 0.05, hol[2] + 0.05);
      else if (ph < 0.6) tg[right].set(-0.6, 0.15, -0.05);
      else if (ph < 0.85) { this.toBody(w.T, T2); T2.y = 0.35; T2.setLength(1.05); T2.x -= 0.15; tg[right].copy(T2); }
      else tg[right].set(-0.6, -0.1, 0.35);
      if (ph >= 0.72 && !w.thrown) {
        w.thrown = true; hands[right].updateMatrixWorld(); hands[right].getWorldPosition(T1);
        for (let k = 0; k < 7; k++) {
          const tx = w.T.x + (H.rnd() - 0.5) * 1.6, tz = w.T.z + (H.rnd() - 0.5) * 1.6, ft = 0.55 + H.rnd() * 0.15;
          fx.spawn(FX.PELLET, T1.x, T1.y, T1.z, (tx - T1.x) / ft, (w.T.y - T1.y) / ft + 11 * ft, (tz - T1.z) / ft, COL.pellet, 2.6, w.T.y);
        }
      }
      if (bram) tg[left].y -= 0.1; else { tg[left].set(0.55, -0.05, 0.45); }
    } else if (w.kind === 'smoke') {
      this.toBody(w.T, T2); const ph = ((H.now - w.t0) / 1.4) % 1, squeeze = ph < 0.18;
      this.aim(right, T2, TOOL_TIPS.smoker, 0.55); if (squeeze) tg[right].y -= 0.05;
      if (squeeze && !w.puffed) { w.puffed = true; hands[right].updateMatrixWorld(); T1.fromArray(TOOL_TIPS.smoker); hands[right].localToWorld(T1); for (let k = 0; k < 5; k++) fx.spawn(FX.PUFF, T1.x, T1.y, T1.z, (w.T.x - T1.x) * 0.9 + (H.rnd() - 0.5) * 0.3, 0.1 + H.rnd() * 0.15, (w.T.z - T1.z) * 0.9 + (H.rnd() - 0.5) * 0.3, H.rnd() < 0.5 ? COL.puff : COL.puff2, 1.6 + H.rnd(), -1); }
      if (!squeeze) w.puffed = false;
      tg[left].set(0.7, -0.22, 0.05);                                                       // hand on hip
    } else if (w.kind === 'sweep') {
      // the bristles on the path, in strokes across it (lifted on the way back); the broom's handle runs up
      // through the upper hand, the lower hand further down it
      const ph = ((H.now - w.t0) * 0.9) % 1, fwd = ph < 0.6, s = fwd ? -0.7 + (ph / 0.6) * 1.4 : 0.7 - ((ph - 0.6) / 0.4) * 1.4;
      T1.set(w.T.x + w.sx * s, w.T.y + (fwd ? 0 : 0.12), w.T.z + w.sz * s); this.toBody(T1, T2);
      T3.set(-0.25, 0.1, 0.45); T4.copy(T3).sub(T2).normalize(); tg[right].copy(T2).addScaledVector(T4, -TOOL_TIPS.broom[1]);
      T4.negate(); q[right].setFromUnitVectors(DOWN, T4); tg[left].copy(tg[right]).addScaledVector(T4, 0.8);
      if (fwd && ph > 0.05 && ph < 0.55 && H.rnd() < dt * 6) fx.spawn(FX.PETAL, T1.x, 0.1, T1.z, w.sx * 0.6, 0.6, w.sz * 0.6, COL.leaf[Math.floor(H.rnd() * 3)], 0.6, 0.06);   // a bit of dust and leaf kicked up
    } else if (w.kind === 'scoop') {
      // handfuls: from the heap to the barrow (or the barrow to the bed)
      const ph = ((H.now - w.t0) / 1.6) % 1, from = w.rev ? w.T : w.T, to = w.rev ? w.T2 : w.T2;
      if (ph < 0.4) { this.toBody(from, T2); T2.y += 0.05; tg[0].copy(T2); tg[1].copy(T2); tg[0].x -= 0.13; tg[1].x += 0.13; }
      else { this.toBody(to, T2); T2.y += 0.35; tg[0].copy(T2); tg[1].copy(T2); tg[0].x -= 0.12; tg[1].x += 0.12; }
      if (ph >= 0.75 && !w.dropped) { w.dropped = true; hands[0].updateMatrixWorld(); hands[0].getWorldPosition(T1); for (let k = 0; k < 6; k++) fx.spawn(FX.CLOD, T1.x + 0.1, T1.y - 0.1, T1.z, (H.rnd() - 0.5) * 0.5, 0, (H.rnd() - 0.5) * 0.5, this.load === 'leaves' ? COL.leaf[k % 3] : COL.soil, 1.0, to.y - 0.1); }
      if (ph < 0.75) w.dropped = false;
    } else if (w.kind === 'bench') {
      tg[0].set(-0.3, -0.28, 0.5); if (!bram) tg[1].set(0.3, -0.28, 0.5); else tg[1].set(0.82, -0.12, 0.2);
    } else if (w.kind === 'look') {
      if (bram) { tg[0].set(-0.64, -0.06, 0.08); } else { tg[0].set(-0.25, -0.35, -0.72); tg[1].set(0.25, -0.35, -0.72); }      // hand on hip; hands behind his back
    }
    if (!listening && !(bw?.held)) {
      if (b.tray.visible) { const ta = b.tray.position, i = ta.x < 0 ? 0 : 1; tg[i].set(ta.x + (i ? 0.05 : -0.05), ta.y - 0.1, ta.z - 0.05); q[i].identity(); }
      if (this.anim === 'pick') { const i = b.tray.position.x < 0 ? 1 : 0; tg[i].set(i ? 0.3 : -0.3, -0.45 + 0.05 * Math.sin(t * 5), 0.7); if (!bram) tg[1 - i].set(i ? -0.3 : 0.3, -0.4, 0.6); }
      if (this.lookTarget()) { const p = this.lookTarget(), i = bram || hands[0].userData.holding !== 'glove' ? 0 : 0; this.toBody(T1.set(p.x, b.root.position.y + 6, p.z), T2); T2.setLength(1.1); if (!(bram && i === 1)) tg[i].copy(T2); }
    }
    // fetching or putting back a tool: the hand goes to the pouch (or to the barrow, for the broom)
    for (let i = 0; i < 2; i++) {
      const want = this.want[i], held = hands[i].userData.holding;
      if (held === want) { this.swapT[i] = 0; continue; }
      if (want === 'broom' || held === 'broom') { bw.trayPoint(T1, 0.1, -0.6); this.toBody(T1, T2); tg[i].copy(T2); T2.y += 0.1; }
      else { const hl = b.holster; T2.set(hl[0], hl[1], hl[2]); tg[i].copy(T2); }
      q[i].identity();
      this.swapT[i] += dt;
      if (hands[i].position.distanceTo(T2) < 0.12 || this.swapT[i] > 1.4) { this.swap(i, want); this.swapT[i] = 0; }
    }
    // never through the body; then ease there (on the grips, exactly there)
    const k = exact ? 1 : 1 - Math.exp(-dt * 9), kq = 1 - Math.exp(-dt * 8);
    for (let i = 0; i < 2; i++) {
      this.unbody(tg[i], bram && i === 1 ? 0.84 : 0.74);
      hands[i].position.lerp(tg[i], k); hands[i].quaternion.slerp(q[i], exact ? 1 : kq);
    }
    // what the tools do in the world
    if (w.kind === 'water' && !listening && (w.pourNow ?? 0) > 0.6) {
      hands[1].updateMatrixWorld(); T1.fromArray(TOOL_TIPS.can); hands[1].localToWorld(T1);
      T3.set(0, 0.6, 0.8).applyQuaternion(hands[1].getWorldQuaternion(Q2));      // out along the spout
      this.dropAcc = (this.dropAcc ?? 0) + dt * 80;
      for (; this.dropAcc >= 1; this.dropAcc--) fx.spawn(FX.WATER, T1.x + (H.rnd() - 0.5) * 0.08, T1.y, T1.z + (H.rnd() - 0.5) * 0.08, T3.x * 1.2 + (H.rnd() - 0.5) * 0.5, T3.y * 1.2, T3.z * 1.2 + (H.rnd() - 0.5) * 0.5, H.rnd() < 0.5 ? COL.water : COL.water2, 1.2, w.T.y + 0.05);
    }
    if (w.fire === 'petal' && w.kind === 'snip') {
      w.fire = null; hands[0].updateMatrixWorld(); T1.fromArray(TOOL_TIPS.secateurs); hands[0].localToWorld(T1);
      const c = COL.petal[Math.floor(H.rnd() * 3)]; for (let k = 0; k < 3; k++) fx.spawn(FX.PETAL, T1.x + (H.rnd() - 0.5) * 0.1, T1.y, T1.z + (H.rnd() - 0.5) * 0.1, 0, 0, 0, c, 4, (this.work.T.y > 1 ? 2.4 : 0.06));
    }
  }
  toBody(v, out) { return this.body.bob.worldToLocal(out.copy(v)); }
  // turn hand i toward the target (in the body's frame) and put the tool's tip on it
  aim(i, target, tip, pitch, roll = 0) {
    const a = TG[i], rx = this.body.hands[i].userData.rest[0], yaw = Math.atan2(target.x - rx * 0.5, target.z - 0.1);
    E.set(pitch, yaw, roll, 'YXZ'); QQ[i].setFromEuler(E);
    a.copy(TIPV.fromArray(tip).applyQuaternion(QQ[i])).negate().add(target);
  }
  // Keep a hand out of the body (an ellipsoid round Thistle; the pot and the head for Bramble)
  unbody(p, r) {
    if (this.key === 'thistle') { const e = (p.x / 0.86) ** 2 + (p.y / 0.66) ** 2 + (p.z / 0.8) ** 2; if (e < 1) p.multiplyScalar(1 / Math.sqrt(e)); return; }
    const d = Math.hypot(p.x, p.z);
    if (p.y > -0.7 && p.y < 0.62 && d < r) { if (d < 1e-3) p.z = r; else { p.x *= r / d; p.z *= r / d; } }
    const hx = p.x, hy = p.y - 0.82, hz = p.z, hd = Math.hypot(hx, hy, hz);
    if (hd < 0.56) { const s = 0.56 / Math.max(hd, 1e-3); p.set(hx * s, 0.82 + hy * s, hz * s); }
  }
}
// (for the checks in gardentest.html ?barrow=1)
export { onWay as barrowOnWay, BARROW_HOME, TOOL_TIPS as TIPS };
export const COMPOST_Z = COMPOST.z;
