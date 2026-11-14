// Moth, who keeps the chapel (garden/chapel.js). Small, quiet, a little dry: it tends the three
// candles on the table with a lamplighter's pole, looks up at the windows, and keeps out of the way.
// It does not explain the glass unless asked, and it offers one question a visit instead of answers
// (the lines are in chaplain_lines.js).
//
// Of the household's robot family (staff/models.js): a floating round body, a glowing face, a ring
// of light, two mitten hands. Moth-coloured, with two feathery antennae, the eye-spots of a moth's
// wings on its back, a bookbinder's leather apron with a candle end in the pocket, and a brass pole
// with a wick-holder and a snuffer bell, carried over its shoulder.
//
// Manners: when she comes in it steps aside to a wall, never in the doorway while she is near it and
// never between her and the great window; turns to her when spoken to; holds still while it speaks.
// It lights the candles at dusk and snuffs them in the morning if she is about (through the candles'
// own switches, so the house remembers them as it does every candle). It talks through the staff's
// speech bubbles and conversation card (staff/bubbles.js, staff/talk.js), E to talk, three lines a card.
//
// Cost: six draw calls (body, face, ring, two hands, a taper flame shown only while lighting), about
// 4k triangles; no lights; casts no shadow. It is built the first time anyone comes within 120 ft, and
// nothing of it runs beyond that.
//
//   chaplain(ctx, K)   from garden.js after chapelLife; returns { step(dt), state(), me } for tests

import { CHAPEL } from './chapel.js';
import { paint, solid, makeFace, useThree } from '../staff/models.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as SAY from './chaplain_lines.js';

// ---- the room (world feet; the numbers are chapel.js's) ------------------------------------------
const CX = CHAPEL.x, FL = CHAPEL.floor;
const IX0 = CHAPEL.inside.x0 + 0.5, IX1 = CHAPEL.inside.x1 - 0.5, IZ0 = CHAPEL.inside.z0 + 0.5, IZ1 = CHAPEL.inside.z1 - 0.5;
const SEAT_W = 1.55, SEAT_Z0 = IZ0 + 4.4;                                         // window seats along both long walls, from here to the door end
const TBL = { x0: CX - 2.6, x1: CX + 2.6, z0: IZ0 + 0.9, z1: IZ0 + 2.5 };       // the stone table before the great window
const DOOR = { x0: CHAPEL.door.x - 1.5, x1: CHAPEL.door.x + 1.5, z: IZ1 };
const WIN = { x0: CX - 2.8, x1: CX + 2.8, z: IZ0 };                              // the great window, for "never between her and it"
const M = 0.55;                                                                  // how close its middle comes to anything
// Floor it can float over: the aisle between the seats, the band across in front of the table, and the
// two pockets either side of the table (convex pieces; a path crosses from one to the next where they overlap)
const REGIONS = [
  { x0: IX0 + SEAT_W + M, x1: IX1 - SEAT_W - M, z0: TBL.z1 + M, z1: IZ1 - M },
  { x0: IX0 + M, x1: IX1 - M, z0: TBL.z1 + M, z1: SEAT_Z0 - M },
  { x0: IX0 + M, x1: TBL.x0 - M, z0: IZ0 + M, z1: SEAT_Z0 - M },
  { x0: TBL.x1 + M, x1: IX1 - M, z0: IZ0 + M, z1: SEAT_Z0 - M },
];
const HOVER = 2.3, R = 0.4, BS = [1, 1.06, 0.96], SPEED = 1.5, CENTRE = { x: CX, z: (IZ0 + IZ1) / 2 };
const FAR = 120, KEY = 'chaplain';

const inRect = (r, x, z, e = 0.01) => x >= r.x0 - e && x <= r.x1 + e && z >= r.z0 - e && z <= r.z1 + e;
const regionOf = (x, z) => REGIONS.findIndex(r => inRect(r, x, z));
const clampTo = (r, x, z, out) => { out.x = Math.max(r.x0, Math.min(r.x1, x)); out.z = Math.max(r.z0, Math.min(r.z1, z)); return out; };
const overlap = (a, b) => { const r = { x0: Math.max(a.x0, b.x0), x1: Math.min(a.x1, b.x1), z0: Math.max(a.z0, b.z0), z1: Math.min(a.z1, b.z1) }; return r.x0 <= r.x1 && r.z0 <= r.z1 ? r : null; };
const LINKS = REGIONS.map((a, i) => REGIONS.map((b, j) => (i !== j ? overlap(a, b) : null)));
const segDist = (px, pz, ax, az, bx, bz) => { const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz, t = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L)) : 0; return Math.hypot(px - ax - dx * t, pz - az - dz * t); };
const inDoorway = (x, z) => x > DOOR.x0 - 0.4 && x < DOOR.x1 + 0.4 && z > DOOR.z - 1.3 && z < DOOR.z + 2.4;
// Is (x, z) within `pad` of the wedge from her eye to the great window's two edges?
function betweenHerAndWindow(vx, vz, x, z, pad) {
  if (vz <= WIN.z + 1) return false;
  const ax = WIN.x0, bx = WIN.x1, s = (px, pz, qx, qz, rx, rz) => (qx - px) * (rz - pz) - (qz - pz) * (rx - px);
  const d1 = s(vx, vz, ax, WIN.z, x, z), d2 = s(ax, WIN.z, bx, WIN.z, x, z), d3 = s(bx, WIN.z, vx, vz, x, z);
  const inside = !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
  return inside || segDist(x, z, vx, vz, ax, WIN.z) < pad || segDist(x, z, vx, vz, bx, WIN.z) < pad;
}
const store = {
  get(k, d) { try { const v = localStorage.getItem(`${KEY}.${k}`); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(`${KEY}.${k}`, JSON.stringify(v)); } catch { /* a private window: forgotten next time */ } },
};

// ---- the body ------------------------------------------------------------------------------------
const POLE_TIP = [0, 1.62, 0], BELL = [0.075, 1.44, 0];         // the wick-holder's tip and the snuffer bell's mouth, in the right hand's frame
function buildBody(THREE) {
  useThree(THREE);
  const T = (g, { p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1] } = {}) => g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...s)));
  const sph = (r, w, h) => new THREE.SphereGeometry(r, w, h), cyl = (a, b, h, n = 10) => new THREE.CylinderGeometry(a, b, h, n);
  const visor = (r, phi, t0, t1) => { const g = new THREE.SphereGeometry(r, 18, 9, Math.PI / 2 - phi, phi * 2, t0, t1 - t0); g.scale(...BS); return g; };
  const onBody = (a, th, out = 0) => [(R + out) * Math.sin(th) * Math.sin(a) * BS[0], (R + out) * Math.cos(th) * BS[1], (R + out) * Math.sin(th) * Math.cos(a) * BS[2]];
  const mesh = (g, m = solid()) => { const o = new THREE.Mesh(g, m); o.castShadow = false; o.receiveShadow = true; return o; };
  const root = new THREE.Group(), bob = new THREE.Group(); root.add(bob); bob.position.y = HOVER; root.name = 'Moth';
  const parts = [];
  // dusky moth brown, a little paler on top
  parts.push(paint(T(sph(R, 24, 16), { s: BS }), p => (p.y > 0.12 ? '#9c8670' : p.y > -0.1 ? '#8c7661' : '#755f4d')));
  // its wings, folded down its back like a roof: mottled brown, darker at the seam and the edges, a pale mark on each
  {
    const g = new THREE.SphereGeometry(R + 0.008, 26, 14, Math.PI * 1.5 - 1.15, 2.3, 0.35, 1.75); g.scale(...BS);
    parts.push(paint(g, p => {
      const u = Math.atan2(p.x, -p.z), v = p.y / (R * BS[1]), half = 0.2 + (0.85 - v) * 0.75, a = Math.abs(u);
      if (v < -0.55 || a > half) return v > 0.3 ? '#9c8670' : v > -0.25 ? '#8c7661' : '#755f4d';
      if (a < 0.05 || half - a < 0.12) return '#4a3a2e';
      if (Math.hypot(a - 0.5, v + 0.05) < 0.11) return '#d9c7a2';
      return v > 0.1 ? '#735c48' : '#64503f';
    }));
  }
  // a bookbinder's leather apron, with a pocket and the end of a candle in it
  parts.push(paint(visor(R + 0.007, 0.78, 1.62, 2.45), '#5a4030'));
  { const at = onBody(0.5, 2.12, 0.015), g = T(new THREE.BoxGeometry(0.14, 0.1, 0.03), { p: at, r: [0.5, 0.5, 0] }); parts.push(paint(g, '#4b3427')); parts.push(paint(T(cyl(0.02, 0.02, 0.08, 8), { p: [at[0] + 0.03, at[1] + 0.06, at[2] - 0.01], r: [0.45, 0, -0.2] }), '#efe6d2')); }
  parts.push(paint(T(new THREE.TorusGeometry(R * 0.86, 0.012, 5, 30), { p: [0, onBody(0, 1.62)[1], 0], r: [Math.PI / 2, 0, 0], s: [BS[0], BS[2], 1] }), '#3e2b20'));       // the apron's tie
  // feathery antennae: a fine stalk with a frond along it
  for (const sx of [-1, 1]) {
    const a = new THREE.Vector3(sx * 0.08, R * BS[1] - 0.03, 0.1), b = new THREE.Vector3(sx * 0.2, R * BS[1] + 0.15, 0.16), c = new THREE.Vector3(sx * 0.38, R * BS[1] + 0.19, 0.0);
    const curve = new THREE.QuadraticBezierCurve3(a, b, c);
    parts.push(paint(new THREE.TubeGeometry(curve, 8, 0.011, 4, false), '#4a3d33'));
    const mid = curve.getPoint(0.6), tan = curve.getTangent(0.6), q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan);
    const frond = sph(0.1, 10, 6); frond.scale(0.36, 1.75, 0.08); frond.applyQuaternion(q); frond.translate(mid.x, mid.y, mid.z); parts.push(paint(frond, '#a88f6a'));
  }
  // brass cap underneath, as the rest of the family
  parts.push(paint(T(new THREE.SphereGeometry(0.2, 14, 5, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), { p: [0, -R * BS[1] * 0.92, 0], s: [1, 0.6, 1] }), '#b8954f'));
  const body = mesh(mergeGeometries(parts.map(g => g.index ? g.toNonIndexed() : g), false)); bob.add(body);
  const face = makeFace({ eye: '#ffd28e', gap: 38, eyeW: 28, eyeH: 30, bg: '#120c08' });
  face.mesh = mesh(visor(R + 0.009, 0.8, 0.78, 1.42), face.mat); bob.add(face.mesh);
  const ring = new THREE.Mesh(T(new THREE.TorusGeometry(R * 0.5, 0.028, 6, 26), { r: [Math.PI / 2, 0, 0] }), new THREE.MeshBasicMaterial({ color: 0xffc477, toneMapped: false, transparent: true, opacity: 0.85 }));
  ring.position.y = -R * BS[1] - 0.12; bob.add(ring);
  // mitten hands; the right carries the pole
  const mitten = () => paint(T(sph(0.095, 10, 7), { s: [1, 0.85, 1.15] }), '#ece0c8');
  const pole = [
    paint(T(cyl(0.017, 0.017, 2.05, 6), { p: [0, 0.57, 0] }), '#a8844a'),
    paint(T(cyl(0.022, 0.022, 0.06, 6), { p: [0, -0.44, 0] }), '#7d6036'),                       // the ferrule
    paint(T(new THREE.BoxGeometry(0.09, 0.015, 0.015), { p: [0.04, 1.53, 0] }), '#a8844a'),      // the arm the bell hangs from
    paint(T(new THREE.ConeGeometry(0.05, 0.09, 10, 1, true), { p: [BELL[0], BELL[1] + 0.045, 0] }), '#b8954f'),
    paint(T(cyl(0.012, 0.016, 0.05, 6), { p: [0, POLE_TIP[1] - 0.025, 0] }), '#3a2c22'),          // the wick-holder
  ];
  const hands = [[-0.5, -0.1, 0.12], [0.5, -0.08, 0.14]].map((p, i) => {
    const h = new THREE.Group(); h.position.set(...p); h.add(mesh(i ? mergeGeometries([mitten(), ...pole].map(g => g.index ? g.toNonIndexed() : g), false) : mitten())); bob.add(h); return h;
  });
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6).scale(1, 2.2, 1), new THREE.MeshBasicMaterial({ color: 0xffc56a, toneMapped: false }));
  flame.position.set(POLE_TIP[0], POLE_TIP[1] + 0.05, POLE_TIP[2]); flame.visible = false; hands[1].add(flame);
  root.traverse(o => { o.castShadow = false; if (o.isMesh) o.receiveShadow = !(o.material?.isMeshBasicMaterial); });
  return { root, bob, body, face, ring, hands, flame, top: HOVER + R * BS[1] + 0.35 };
}

// ---- Moth --------------------------------------------------------------------------------------
export function chaplain(ctx, K) {
  const THREE = ctx.THREE;
  const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
  const headless = !!ctx.headless;
  const glass = (K?.chapel?.glass ?? []).map(w => ({ id: w.id, key: SAY.WINDOWS[w.id] ? w.id : /loop|strange/i.test(w.id) ? 'loop' : null, x: w.c[0], y: w.c[1], z: w.c[2], n: w.n, size: Math.max(w.w, w.h) / 2 })).filter(w => w.key);
  glass.push({ id: 'table', key: 'table', x: CX, y: CHAPEL.table.y - 0.2, z: TBL.z1, size: 2.4 });
  const candles = K?.candlesAt?.length ? K.candlesAt : (ctx.items?.candles ?? []).filter(c => inRect(TBL, c.x, c.z, 0.2));
  let switches = null;                       // the candles' own interactions (life.js), found when first needed
  const findSwitches = () => (switches ??= candles.map(c => ctx.interact.find(it => it.x === c.x && it.y === c.y && it.z === c.z && it.act) ?? null));

  // where it stands to do things, each a point on its floor and what it faces
  const P = (x, z, o = {}) => ({ x, z, ...o });
  const keeper = P(CHAPEL.keeper.x, CHAPEL.keeper.z, { kind: 'tend', fx: CX + 1.6, fz: TBL.z0 + 0.8 });
  const SPOTS = [
    keeper,
    P(IX1 - 0.75, IZ0 + 1.3, { kind: 'aside' }), P(IX0 + 0.75, IZ0 + 1.3, { kind: 'aside' }),
    P(IX0 + 0.8, -24.5, { kind: 'look', win: 'loop' }),
    P(IX0 + SEAT_W + 0.7, IZ1 - 0.8, { kind: 'aside', byDoor: true }), P(IX1 - SEAT_W - 0.7, IZ1 - 0.8, { kind: 'aside', byDoor: true }),
  ];
  // places from which to look up at each window (the ones in the aisle only when nobody is in the room)
  const LOOKS = glass.filter(w => w.id !== 'table').map(w => {
    if (w.n[0]) return P(w.n[0] < 0 ? IX0 + 3.3 : IX1 - 3.3, w.z, { kind: 'look', win: w.key, w });
    if (w.n[2] > 0) return P(CX + 0.8, IZ1 - 4.5, { kind: 'look', win: w.key, w });
    return P(CX - 0.6, TBL.z1 + 0.7, { kind: 'look', win: w.key, w });
  });
  for (const s of [...SPOTS, ...LOOKS]) { const r = regionOf(s.x, s.z); if (r < 0) { const o = {}; let best = 1e9; for (const g of REGIONS) { clampTo(g, s.x, s.z, o); const d = Math.hypot(o.x - s.x, o.z - s.z); if (d < best) { best = d; s.cx = o.x; s.cz = o.z; } } s.x = s.cx; s.z = s.cz; } }
  const loopWin = glass.find(w => w.key === 'loop');
  if (loopWin) Object.assign(SPOTS[3], { x: IX0 + 0.8, z: Math.max(REGIONS[1].z0, Math.min(REGIONS[1].z1, loopWin.z)), w: loopWin });
  else SPOTS.splice(3, 1);
  // where to stand to reach each candle with the pole: off the end of the table, never in front of it
  const candleSpot = c => { const left = c.x < CX, px = left ? TBL.x0 - 1.0 : TBL.x1 + 1.0, r = REGIONS[left ? 2 : 3], o = {}; clampTo(r, px, c.z + 0.1, o); return P(o.x, o.z, { fx: c.x, fz: c.z }); };

  // ---- state
  const S = {
    built: null, active: false, now: 0, x: keeper.x, z: keeper.z, yaw: 0, tilt: 0, v: 0,
    path: [], goal: null, task: null, taskName: 'none', face: null, faceYaw: null, anim: null, reachTo: null, reach: 0,
    expr: 'neutral', exprUntil: 0, blinkAt: 2, look: 0,
    thinkAt: 0, visit: null, lastNear: -1e9, insideSince: -1, still: 0, px: 0, pz: 0,
    lastRemark: -1e9, candleSeen: candles.map(c => !!c.lit), selfToggle: false, lastCandleSay: -1e9, litTonight: false, sawNight: false, snuffed: false,
    pending: null, cardWindow: null, lastSpots: null,
  };
  S.yaw = Math.atan2(keeper.fx - keeper.x, keeper.fz - keeper.z);
  const box = { x0: 0, x1: 0, y0: -100, y1: -99, z0: 0, z1: 0, staff: true }; ctx.colliders?.push(box);

  // ---- the staff's bubbles and card (staff.js), or a small set of our own if there is no staff
  let H = null, bubble = null;
  const staffH = () => (typeof window !== 'undefined' ? window.__staff?.H : null) ?? ctx.staff?.H ?? null;
  async function connect() {
    H = staffH();
    if (!H) {
      const [{ makeBubbles }, { makeTalk }] = await Promise.all([import('../staff/bubbles.js'), import('../staff/talk.js')]);
      if (staffH()) { H = staffH(); } else {
        H = { now: 0, own: true, visitor: { present: false, f: 0, x: 0, z: 0 }, events: { choices: 0, asks: 0 }, bubbles: makeBubbles(THREE, ctx.camera, headless) };
        H.talk = makeTalk(H, headless);
      }
    }
    bubble = H.bubbles.make(SAY.NAME);
  }
  let connecting = null;

  const rnd = Math.random;
  const bag = (key, list) => {                // a shuffled bag per pool, kept for the page's life
    const b = (bag.m ??= new Map()).get(key);
    if (!b || !b.left.length) { const left = list.map((_, i) => i).sort(() => rnd() - 0.5); if (b && left.length > 1 && left[0] === b.last) left.push(left.shift()); bag.m.set(key, { left, last: null }); }
    const e = bag.m.get(key), i = e.left.shift(); e.last = i; return list[i];
  };
  // ---- her
  const V = { present: false, x: 0, y: 0, z: 0, fx: 0, fz: -1, inside: false, d: 1e9, dDoor: 1e9, speed: 0 };
  function watch(dt) {
    const w = ctx.walker, present = !!w && (ctx.mode === 'walk' || ctx.forcePresent);
    V.present = present; if (!present) { V.inside = false; V.d = V.dDoor = 1e9; return; }
    const ddx = w.pos.x - V.x, ddz = w.pos.z - V.z;
    V.x = w.pos.x; V.y = w.pos.y; V.z = w.pos.z; V.fx = -Math.sin(w.yaw); V.fz = -Math.cos(w.yaw);
    const sp = Math.hypot(ddx, ddz) / Math.max(dt, 1e-3); V.speed = sp > 30 ? 0 : V.speed * 0.7 + sp * 0.3;
    V.inside = V.x > IX0 && V.x < IX1 && V.z > IZ0 && V.z < IZ1 && V.y < FL + 4;
    V.d = Math.hypot(V.x - S.x, V.z - S.z); V.dDoor = Math.hypot(V.x - CHAPEL.door.x, V.z - DOOR.z);
  }
  const inHerView = (cos = 0.45) => { const dx = S.x - V.x, dz = S.z - V.z, d = Math.hypot(dx, dz) || 1; return (dx * V.fx + dz * V.fz) / d > cos; };
  const near = () => V.inside || V.dDoor < 9;                  // she is in, or at the door

  // ---- speaking
  function say(text, o = {}) {
    if (!bubble) return;
    const now = H.now;
    bubble.say(text, o.secs ?? Math.min(12, 2.6 + text.length * 0.05), now);
    if (typeof window !== 'undefined') window.__said?.push(`${SAY.NAME}: ${text}`);
    S.expr = o.expr ?? 'neutral'; S.exprUntil = S.now + Math.min(6, 1.5 + text.length * 0.05);
    if (o.toHer !== false && V.d < 14) S.faceHerUntil = S.now + Math.min(10, 2.5 + text.length * 0.06);
    if (!H.own && V.d < 20 && H.chirp) H.chirp([60, 64], 0.03, me);
  }
  const later = (secs, text, o) => { S.pending = { at: S.now + secs, text, o }; };

  // ---- the question of the visit
  function question() {
    const v = S.visit; if (v.q != null) return SAY.QUESTIONS[v.q];
    let used = store.get('asked', []); if (!Array.isArray(used) || used.length >= SAY.QUESTIONS.length) used = [];
    const left = SAY.QUESTIONS.map((_, i) => i).filter(i => !used.includes(i)), i = left[Math.floor(rnd() * left.length)];
    used.push(i); store.set('asked', used); v.q = i; return SAY.QUESTIONS[i];
  }
  function offerQuestion() { const q = question(); S.visit.offered = true; say(bag('pre', SAY.PREFACE), { expr: 'neutral' }); later(3.2, q, { expr: 'focus' }); }

  // ---- the card (staff/talk.js asks for these)
  const asked = new Set(store.get('topics', []));
  const markAsked = id => { asked.add(id); store.set('topics', [...asked]); };
  const bye = () => ({ text: SAY.ASK.leave, act: () => { say(bag('bye', SAY.BYE), { expr: 'happy' }); return null; } });
  const thanks = () => ({ text: SAY.ASK.thanks, act: () => { say(bag('bye', SAY.BYE), { expr: 'happy' }); return null; } });
  function aimedWindow() {
    const cam = ctx.camera; if (!cam) return null;
    const d = cam.getWorldDirection(tmpA); let best = null, err = 1e9;
    for (const w of glass) {
      tmpB.set(w.x - cam.position.x, w.y - cam.position.y, w.z - cam.position.z); const L = tmpB.length(); if (L > 22) continue;
      const a = Math.acos(Math.max(-1, Math.min(1, tmpB.dot(d) / L))), allow = Math.atan(w.size / L) + 0.12;
      if (a < allow && a / allow < err) { err = a / allow; best = w; }
    }
    return best;
  }
  function nextTopic() { return SAY.TOPICS.find(t => !asked.has(t.id) && (!t.after || asked.has(t.after))) ?? null; }
  const topicOpt = t => ({ text: t.ask, act: () => { markAsked(t.id); say(t.say, { expr: t.id === 'mind' ? 'focus' : 'neutral' }); return follow(); } });
  function follow() { const t = nextTopic(); return [...(t ? [topicOpt(t)] : []), thanks()]; }
  function windowOpt(w) {
    return { text: w.key === 'table' ? SAY.ASK.table : SAY.ASK.window, act: () => {
      const lines = SAY.WINDOWS[w.key]; say(lines[0]); S.lookAt = { x: w.x, y: w.y, z: w.z, until: S.now + 4 };
      return lines[1] ? [{ text: SAY.ASK.more, act: () => { say(lines[1], { expr: 'focus' }); return [thanks()]; } }, thanks()] : follow();
    } };
  }
  function questionOpt() {
    const v = S.visit;
    if (v.q == null) return { text: SAY.ASK.question, act: () => { const q = question(); v.offered = true; say(q, { expr: 'focus' }); return answerCard(); } };
    return { text: SAY.ASK.questionAgain, act: () => { say(SAY.AGAIN); later(2.6, SAY.QUESTIONS[v.q], { expr: 'focus' }); return null; } };
  }
  const answerCard = () => [{ text: SAY.ASK.doYouKnow, act: () => { say(bag('know', SAY.DO_YOU_KNOW), { expr: 'happy' }); return null; } }, { text: SAY.ASK.think, act: () => { say(bag('think', SAY.THINK), { expr: 'happy' }); return null; } }];
  const me = {
    name: SAY.NAME, spec: { name: SAY.NAME }, key: 'moth',
    get x() { return S.x; }, get z() { return S.z; }, get y() { return FL; }, get f() { return H?.nav?.floorOf?.(FL + 0.5) ?? H?.visitor?.f ?? 0; },
    dialogue() {
      ensureVisit();
      const w = aimedWindow(), t = nextTopic(), out = [];
      if (w) out.push(windowOpt(w)); else if (t) out.push(topicOpt(t));
      out.push(questionOpt(), bye());
      return out;
    },
    line(pool) { if (pool === 'walkedOff') say(bag('bye', SAY.BYE), { toHer: false }); },
  };
  const inter = { x: S.x, y: FL + HOVER, z: S.z, reach: 7, size: 1.2, label: () => (H?.talk?.robot === me ? 'next line (or 1–3)' : `talk to ${SAY.NAME}`), act: () => {
    if (!H) return;
    H.events && H.events.asks++;
    if (H.talk.robot !== me && H.talk.robot) H.talk.close();
    S.faceHerUntil = S.now + 3; H.talk.press(me);
  } };
  ctx.interact?.push(inter);

  // ---- a visit: she comes near after being away a while
  function ensureVisit() {
    if (!S.visit || S.now - S.lastNear > 120) { S.visit = { greeted: false, q: null, offered: false, remarks: 0, night: false, start: S.now }; }
  }

  // ---- getting about
  const o1 = {}, tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), tmpQ = new THREE.Quaternion(), restQ = new THREE.Quaternion(), UP = new THREE.Vector3(0, 1, 0);
  function planPath(x, z) {
    let a = regionOf(S.x, S.z);
    if (a < 0) { let best = 1e9; REGIONS.forEach((r, i) => { clampTo(r, S.x, S.z, o1); const d = Math.hypot(o1.x - S.x, o1.z - S.z); if (d < best) { best = d; a = i; } }); }
    const b = regionOf(x, z); if (b < 0) return null;
    const prev = REGIONS.map(() => -1), seen = REGIONS.map((_, i) => i === a), queue = [a];
    while (queue.length) { const i = queue.shift(); if (i === b) break; LINKS[i].forEach((l, j) => { if (l && !seen[j]) { seen[j] = true; prev[j] = i; queue.push(j); } }); }
    if (!seen[b]) return null;
    const chain = []; for (let i = b; i !== a; i = prev[i]) chain.unshift(i);
    const pts = []; let from = a, px = S.x, pz = S.z;
    clampTo(REGIONS[a], px, pz, o1); if (Math.hypot(o1.x - px, o1.z - pz) > 0.01) { pts.push({ x: o1.x, z: o1.z }); }
    for (const j of chain) { const l = LINKS[from][j]; clampTo(l, x, z, o1); const ix = o1.x, iz = o1.z; clampTo(l, (px + x) / 2, (pz + z) / 2, o1); pts.push({ x: (ix + o1.x) / 2, z: (iz + o1.z) / 2 }); px = pts.at(-1).x; pz = pts.at(-1).z; from = j; }
    pts.push({ x, z });
    return pts;
  }
  // Is it all right to be at (x, z) with her where she is?
  const seesWindow = () => V.inside || (V.dDoor < 14 && V.z > DOOR.z && Math.abs(V.x - CHAPEL.door.x) < 6);      // in the room, or looking in at the door
  function okAt(x, z, talking = false) {
    if (!V.present) return true;
    if (Math.hypot(x - V.x, z - V.z) < (talking ? 2.4 : 3.2)) return false;
    if (V.dDoor < 14 && inDoorway(x, z)) return false;
    if (seesWindow() && betweenHerAndWindow(V.x, V.z, x, z, 0.7)) return false;
    return true;
  }
  function pathClear(pts) {
    if (!V.present || !pts) return !!pts;
    let ax = S.x, az = S.z, escaping = seesWindow() && betweenHerAndWindow(V.x, V.z, S.x, S.z, 0.6), run0 = 0;
    for (const p of pts) {
      const d0 = Math.hypot(ax - V.x, az - V.z);
      if (segDist(V.x, V.z, ax, az, p.x, p.z) < Math.min(1.8, d0 - 0.05)) return false;      // (moving away from her is always fine)
      if (V.dDoor < 16 && segDist(CHAPEL.door.x, DOOR.z, ax, az, p.x, p.z) < 2.2) return false;
      if (seesWindow()) for (let k = 1; k <= 6; k++) { const f = k / 6; if (!betweenHerAndWindow(V.x, V.z, ax + (p.x - ax) * f, az + (p.z - az) * f, 0.6)) escaping = false; else if (!escaping || run0 + Math.hypot(p.x - ax, p.z - az) * f > 1.6) return false; }      // never across her view of the great window (only out of it)
      run0 += Math.hypot(p.x - ax, p.z - az); ax = p.x; az = p.z;
    }
    return true;
  }
  function go(spot) { const pts = planPath(spot.x, spot.z); if (!pts || !pathClear(pts)) return false; S.path = pts; S.goal = spot; return true; }
  const arrived = () => !S.path.length;

  // ---- what it does: little generators, stepped every frame
  function* waitFor(secs, until) { const end = S.now + secs; while (S.now < end && !(until && until())) yield; }
  function* goThere(spot) { if (!go(spot)) { yield; return false; } while (!arrived()) yield; return true; }
  function* tend() {
    if (!(yield* goThere(keeper))) return;
    S.face = keeper; S.anim = 'trim'; S.expr = 'focus'; S.exprUntil = S.now + 3;
    try { yield* waitFor(8 + rnd() * 10); } finally { S.anim = null; }
  }
  function* lookUp(spot) {
    if (!(yield* goThere(spot))) return;
    const w = spot.w ?? glass.find(g => g.key === spot.win); if (!w) return;
    S.lookAt = { x: w.x, y: w.y, z: w.z, until: S.now + 7 + rnd() * 6 };
    yield* waitFor(S.lookAt.until - S.now);
  }
  function* rest(spot) {
    if (!(yield* goThere(spot))) return;
    S.face = null; yield* waitFor(10 + rnd() * 12);
  }
  // Light (on) or snuff (!on) every candle that needs it
  function* candlesTask(on) {
    const sw = findSwitches();
    if (V.present && V.d < 16 && !(on && S.saidLighting)) { if (on) S.saidLighting = true; say(on ? bag('lighting', SAY.LIGHTING) : bag('snuff', SAY.SNUFFING), { toHer: false }); }
    try {
      // each that still needs doing, nearest first, as long as it can be reached without crossing her way
      for (let blocked = 0; ;) {
        const todo = candles.map((c, i) => i).filter(i => !!candles[i].lit !== on && sw[i]).sort((a, b) => Math.hypot(candleSpot(candles[a]).x - S.x, candleSpot(candles[a]).z - S.z) - Math.hypot(candleSpot(candles[b]).x - S.x, candleSpot(candles[b]).z - S.z));
        if (!todo.length) return;
        const i = todo.find(k => go(candleSpot(candles[k])));
        if (i == null) { if ((blocked += 0.5) > 15) { if (on) { S.litTonight = false; S.lightAgain = S.now + 30; } return; } yield* waitFor(0.5); continue; }      // she is in the way: another time
        const c = candles[i], spot = S.goal;
        while (!arrived()) yield;
        S.face = spot; yield* waitFor(0.6);
        if (on) S.built.flame.visible = true;
        S.reachTo = { x: c.x, y: c.y + (on ? -0.12 : 0.04), z: c.z, tip: on ? POLE_TIP : BELL };      // (aimed a little low: the pole comes up short of full reach) S.anim = 'reach';
        yield* waitFor(1.3);
        if (!!c.lit !== on) { S.selfToggle = true; sw[i].act(); S.candleSeen[i] = !!c.lit; }
        yield* waitFor(0.6); S.reachTo = null; yield* waitFor(0.7);
      }
    } finally { S.reachTo = null; S.anim = null; if (S.built) S.built.flame.visible = false; }
  }
  function run(name, gen) { S.task = gen; S.taskName = name; }

  // ---- deciding, a few times a second
  const lampOn = () => { const L = ctx.day?.light ?? 1, t = Math.max(0, Math.min(1, (L - 0.42) / (0.97 - 0.42))); return 1 - t * t * (3 - 2 * t); };      // as lighting.js
  function think() {
    const talking = H?.talk?.robot === me, dark = lampOn();
    if (dark > 0.6) S.sawNight = true;
    if (dark < 0.25) S.litTonight = S.saidLighting = false;
    if (dark > 0.5) S.snuffed = false;
    // keep the gardeners out of my chapel: none sits on its window seats, none comes to say hello in it
    if (H && !H.own) {
      const g = H.gspots;
      if (g && g !== S.lastSpots) { S.lastSpots = g; for (const k of ['benches', 'rim']) if (g[k]) g[k] = g[k].filter(s => !(s.x > IX0 - 1 && s.x < IX1 + 1 && s.z > IZ0 - 1 && s.z < IZ1 + 1)); }
      if (V.inside || V.dDoor < 10) H.lastHostEnd = Math.max(H.lastHostEnd ?? -1e9, H.now);
    }
    // the candles: did she light or blow one out?
    candles.forEach((c, i) => {
      const lit = !!c.lit; if (lit === S.candleSeen[i]) return;
      S.candleSeen[i] = lit;
      if (S.selfToggle) return;
      if (V.present && Math.hypot(V.x - c.x, V.z - c.z) < 9 && S.now - S.lastCandleSay > 40 && !talking) { S.lastCandleSay = S.now; say(lit ? bag('she lit', SAY.SHE_LIT) : bag('she out', SAY.SHE_OUT), { expr: lit ? 'happy' : 'wink' }); }
    });
    S.selfToggle = false;
    // her visit
    if (V.present && Math.hypot(V.x - CENTRE.x, V.z - CENTRE.z) < 30) { ensureVisit(); S.lastNear = S.now; }
    const v = S.visit;
    if (V.inside) { if (S.insideSince < 0) S.insideSince = S.now; } else S.insideSince = -1;
    S.still = V.speed < 0.4 ? S.still + 0.25 : 0;
    const inFor = S.insideSince < 0 ? 0 : S.now - S.insideSince, quiet = !talking && !(bubble?.talking(H.now)) && !S.pending;
    const otherTalk = H?.talk?.robot && H.talk.robot !== me;
    if (v && quiet && !otherTalk) {
      if (!v.greeted && inFor > 1 && (inHerView(0.2) || V.d < 8)) {
        v.greeted = true;
        if (!store.get('met', false)) { store.set('met', true); say(SAY.INTRO, { expr: 'happy' }); } else say(dark > 0.6 ? bag('hn', SAY.HELLO_NIGHT) : bag('hello', SAY.HELLO), { expr: 'happy' });
      } else if (v.greeted && !v.offered && inFor > 25 && S.still > 3 && V.d > 3 && V.d < 14 && inHerView()) offerQuestion();
      else if (v.greeted && inFor > 15 && dark > 0.7 && !v.night && S.still > 4 && inHerView(0.3)) { v.night = true; v.remarks++; S.lastRemark = S.now; say(bag('night', SAY.NIGHT)); }
      else if (v.offered && v.remarks < 2 && inFor > 45 && S.now - S.lastRemark > 70 && S.still > 5 && V.d < 14 && inHerView(0.3) && rnd() < 0.01) { v.remarks++; S.lastRemark = S.now; say(bag('idle', SAY.IDLE)); }
    }
    // where to be
    const busyCandles = S.taskName === 'light' || S.taskName === 'snuff';
    if (talking || (S.faceHerUntil > S.now && V.d < 14)) {
      if (!okAt(S.x, S.z, true) || (S.goal && !okAt(S.goal.x, S.goal.z, true))) { S.path.length = 0; stepAside(true); }
      else if (!busyCandles && S.taskName !== 'aside') { S.path.length = 0; S.anim = null; S.task = null; S.taskName = 'listen'; }
      return;
    }
    if (near()) {
      const goalOk = S.goal && okAt(S.goal.x, S.goal.z) && pathClear(S.path);
      const enRoute = S.path.length && goalOk && (S.taskName === 'aside' || SPOTS.includes(S.goal));
      if ((!okAt(S.x, S.z) && !enRoute) || (S.path.length && !goalOk)) { S.path.length = 0; return stepAside(); }
      if (S.taskName === 'look' && !SPOTS.includes(S.goal)) return stepAside();      // the aisle is hers now
    }
    if (S.task) return;
    // nothing on: the candles if the hour wants it, else small business
    if (dark > 0.55 && !S.litTonight && !(S.lightAgain > S.now) && candles.some(c => !c.lit)) { S.litTonight = true; return run('light', candlesTask(true)); }
    if (dark > 0.55 && !(S.lightAgain > S.now)) S.litTonight = true;
    if (dark < 0.15 && S.sawNight && !S.snuffed && candles.some(c => c.lit)) { S.snuffed = true; return run('snuff', candlesTask(false)); }
    if (near()) {
      // she is here: something quiet, somewhere out of her way
      const opts = SPOTS.filter(s => okAt(s.x, s.z));
      const s = opts.includes(keeper) && rnd() < 0.55 ? keeper : opts[Math.floor(rnd() * opts.length)];
      if (!s) return;
      if (s === keeper) return run('tend', tend());
      if (s.kind === 'look') return run('look', lookUp(s));
      return run('rest', rest(s));
    }
    const k = rnd();
    if (k < 0.4) run('tend', tend());
    else if (k < 0.85 && LOOKS.length) run('look', lookUp(LOOKS[Math.floor(rnd() * LOOKS.length)]));
    else run('rest', rest(SPOTS[1 + Math.floor(rnd() * (SPOTS.length - 1))]));
  }
  // Out of her way: the nearest good place (and the keeper's place by the candles, if that is one)
  function stepAside(talking = false) {
    let best = null, bs = 1e9;
    for (const s of SPOTS) {
      if (!okAt(s.x, s.z, talking)) continue;
      const pts = planPath(s.x, s.z); if (!pts || !pathClear(pts)) continue;
      let len = 0, ax = S.x, az = S.z; for (const p of pts) { len += Math.hypot(p.x - ax, p.z - az); ax = p.x; az = p.z; }
      const dv = Math.hypot(s.x - V.x, s.z - V.z), sc = len + Math.abs(dv - 7) * 0.3 - (s === keeper ? 1.5 : 0) + (s.byDoor && V.dDoor < 9 ? 6 : 0);      // not by the door she is coming in at
      if (sc < bs) { bs = sc; best = { s, pts }; }
    }
    if (!best) {          // boxed in: out of her view of the window, sideways, or else at least away from her, within the floor
      const r = REGIONS[Math.max(0, regionOf(S.x, S.z))], dx = S.x - V.x, dz = S.z - V.z, L = Math.hypot(dx, dz) || 1;
      if (seesWindow() && betweenHerAndWindow(V.x, V.z, S.x, S.z, 0.7)) clampTo(r, S.x < CX ? WIN.x0 - 1.6 : WIN.x1 + 1.6, S.z, o1);
      else clampTo(r, S.x + dx / L * 2, S.z + dz / L * 2, o1); S.path = [{ x: o1.x, z: o1.z }]; S.goal = null; S.task = null; S.taskName = 'aside'; return;
    }
    S.anim = null; S.lookAt = null;
    const s = best.s;
    run('aside', (function* () {
      S.path = best.pts; S.goal = s; while (!arrived()) yield;
      if (s === keeper && !talking) { S.face = keeper; S.anim = 'trim'; try { yield* waitFor(10 + rnd() * 8); } finally { S.anim = null; } }
      else { S.face = null; yield* waitFor(6 + rnd() * 6); }
    })());
  }

  // ---- moving and drawing, every frame
  function move(dt) {
    let sp = 0;
    if (S.path.length) {
      const p = S.path[0], dx = p.x - S.x, dz = p.z - S.z, L = Math.hypot(dx, dz), step = SPEED * dt * Math.min(1, 0.4 + L);
      if (L <= step) { S.x = p.x; S.z = p.z; S.path.shift(); } else { S.x += dx / L * step; S.z += dz / L * step; }
      sp = step / dt;
      if (L > 0.3) turnTo(Math.atan2(dx, dz), dt);
    }
    S.v = sp;
    // never pressed against her: drift off a little if she walks into me
    if (V.present && V.d < 1.35) {
      const dx = S.x - V.x, dz = S.z - V.z, L = Math.hypot(dx, dz) || 1, r = REGIONS[Math.max(0, regionOf(S.x, S.z))];
      clampTo(r, S.x + dx / L * dt * 2.2, S.z + dz / L * dt * 2.2, o1); S.x = o1.x; S.z = o1.z;
    }
    if (!S.path.length) {
      const herTurn = !S.reachTo && V.present && V.d < 14 && (S.faceHerUntil > S.now || H?.talk?.robot === me);      // (not with the pole up)
      if (herTurn) turnTo(Math.atan2(V.x - S.x, V.z - S.z), dt);
      else if (S.lookAt && S.now < S.lookAt.until) turnTo(Math.atan2(S.lookAt.x - S.x, S.lookAt.z - S.z), dt);
      else if (S.face?.fx != null) turnTo(Math.atan2(S.face.fx - S.x, S.face.fz - S.z), dt);
      else if (V.inside && V.d < 12 && S.taskName === 'aside') turnTo(Math.atan2(V.x - S.x, V.z - S.z), dt * 0.5);
    }
  }
  function turnTo(a, dt) { let d = a - S.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); S.yaw += Math.sign(d) * Math.min(Math.abs(d), dt * 2.4); S.yaw = Math.atan2(Math.sin(S.yaw), Math.cos(S.yaw)); }
  function draw(t, dt) {
    const B = S.built, { root, bob, hands, face } = B;
    // how far up it looks: at a window, or at her face
    let tilt = 0;
    const herTurn = !S.reachTo && V.present && V.d < 14 && (S.faceHerUntil > S.now || H?.talk?.robot === me);      // (not with the pole up)
    if (herTurn) tilt = Math.atan2(V.y + 4.85 - (FL + HOVER), Math.max(1, V.d)) * 0.6;
    else if (S.lookAt && S.now < S.lookAt.until) tilt = Math.min(0.55, Math.atan2(S.lookAt.y - (FL + HOVER), Math.max(1, Math.hypot(S.lookAt.x - S.x, S.lookAt.z - S.z))) * 0.7);
    else if (S.anim === 'trim') tilt = -0.18;
    S.tilt += (tilt - S.tilt) * Math.min(1, dt * 2.5);
    root.position.set(S.x, FL, S.z); root.rotation.y = S.yaw;
    bob.position.y = HOVER + 0.05 * Math.sin(t * 1.3) + (S.reachTo ? 0.12 * S.reach : 0);
    bob.rotation.x = -S.tilt + Math.min(0.12, S.v * 0.05); bob.rotation.z = 0.02 * Math.sin(t * 0.7);
    B.ring.material.opacity = 0.7 + 0.15 * Math.sin(t * 2.1);
    // hands: at rest the pole leans on its shoulder; trimming, the left hand works at the candles; reaching, the pole goes to the wick
    const [hl, hr] = hands;
    hl.position.set(-0.5, -0.1 + 0.03 * Math.sin(t * 1.1 + 1), 0.12); hl.rotation.set(0, 0, 0);
    if (S.anim === 'trim') { hl.position.set(-0.3, 0.02 + 0.03 * Math.sin(t * 6), 0.48); }
    S.reach += ((S.reachTo ? 1 : 0) - S.reach) * Math.min(1, dt * 2.2);
    restQ.setFromEuler(tmpE.set(-0.32, 0, -0.14));
    hr.position.set(0.5, -0.08 + 0.03 * Math.sin(t * 1.1), 0.14);
    if (S.reach > 0.001 && (S.reachTo || S.lastReach)) {
      const rt = S.reachTo ?? S.lastReach; S.lastReach = rt;
      const dx = rt.x - S.x, dz = rt.z - S.z, c = Math.cos(S.yaw), s = Math.sin(S.yaw);
      const lx = dx * c - dz * s, lz = dx * s + dz * c, ly = rt.y - (FL + bob.position.y);
      tmpA.set(lx - 0.32, ly - 0.05, lz - 0.38); const len = tmpA.length(); tmpA.normalize();
      const tipLen = Math.hypot(rt.tip[0], rt.tip[1]), slide = Math.max(-0.15, Math.min(0.7, len - tipLen));
      tmpQ.setFromUnitVectors(UP, tmpA);
      hr.quaternion.copy(restQ).slerp(tmpQ, S.reach);
      hr.position.set(0.5 + (0.32 - 0.5 + tmpA.x * slide) * S.reach, -0.08 + (0.13 + tmpA.y * slide) * S.reach, 0.14 + (0.24 + tmpA.z * slide) * S.reach);
    } else { S.lastReach = null; hr.quaternion.copy(restQ); }
    // the face: an expression for a while, a blink now and then, eyes toward whatever it looks at
    if (S.now > S.blinkAt) S.blinkAt = S.now + 2.5 + rnd() * 4;
    const blink = S.blinkAt - S.now > 0 && S.blinkAt - S.now < 0.12;
    const expr = S.now < S.exprUntil ? S.expr : S.anim === 'trim' || S.anim === 'reach' ? 'focus' : 'neutral';
    face.draw(expr, 0, blink);
  }
  const tmpE = new THREE.Euler();

  // ---- the frame
  const head = new THREE.Vector3();
  let wasActive = false;
  function frame(t, dt) {
    const cam = ctx.camera?.position;
    const far = !cam || (cam.x - CENTRE.x) ** 2 + (cam.z - CENTRE.z) ** 2 > FAR * FAR;
    if (far) {
      if (wasActive) {
        wasActive = false;
        if (S.built) S.built.root.visible = false;
        box.y0 = -100; box.y1 = -99;
        if (H && bubble) { bubble.quiet(); if (!headless) H.bubbles.place(bubble, head, H.now, false); }
        if (H?.talk?.robot === me) H.talk.close();
      }
      return;
    }
    if (!S.built) {
      S.built = buildBody(THREE); ctx.scene.add(S.built.root);
      if (typeof window !== 'undefined') window.__chaplain = api;
    }
    if (!H && !connecting) connecting = connect().catch(() => {});
    if (!wasActive) { wasActive = true; S.built.root.visible = true; }
    dt = Math.min(dt, 0.1); S.now += dt;
    if (H?.own) { H.now += dt; H.visitor.present = V.present; H.visitor.x = V.x; H.visitor.z = V.z; H.talk.update(); }
    watch(dt);
    if (!S.frozen && S.now >= S.thinkAt) { S.thinkAt = S.now + 0.25; think(); }
    if (S.pending && S.now >= S.pending.at && bubble) { const p = S.pending; S.pending = null; say(p.text, p.o); }
    if (S.task) { const r = S.task.next(); if (r.done) { S.task = null; S.taskName = 'none'; S.face = null; } }
    move(dt);
    // where it is, for the house: something she cannot walk through, something to press E on
    box.x0 = S.x - 0.5; box.x1 = S.x + 0.5; box.z0 = S.z - 0.5; box.z1 = S.z + 0.5; box.y0 = FL + 1.7; box.y1 = FL + 3.1;
    inter.x = S.x; inter.z = S.z; inter.y = FL + HOVER;
    if (!headless) {
      draw(t, dt);
      if (bubble) {
        head.set(S.x, FL + S.built.top + 0.25, S.z);
        const cp = ctx.camera.position, dx = S.x - cp.x, dz = S.z - cp.z, cin = cp.x > IX0 && cp.x < IX1 && cp.z > IZ0 && cp.z < IZ1;
        let vis = ctx.mode === 'walk' && Math.hypot(dx, dz) < 30;
        if (vis && !cin) { const tz = (DOOR.z - cp.z) / (S.z - cp.z), xd = cp.x + (S.x - cp.x) * tz; vis = !CHAPEL.door.shut && cp.z > DOOR.z && tz > 0 && tz < 1 && xd > DOOR.x0 + 0.2 && xd < DOOR.x1 - 0.2; }      // (from outside: only through the open door)
        H.bubbles.place(bubble, head, H.now, vis);
      }
    }
  }
  ctx.animated?.push(frame);

  // ---- tests and pictures
  const api = {
    me, step: (dt = 1 / 20) => frame(S.now, dt),
    state: () => ({ x: S.x, z: S.z, yaw: S.yaw, task: S.taskName, reach: S.reach, built: !!S.built, inside: S.x > IX0 && S.x < IX1 && S.z > IZ0 && S.z < IZ1, doorway: inDoorway(S.x, S.z), between: V.present && (V.inside || V.dDoor < 6) && betweenHerAndWindow(V.x, V.z, S.x, S.z, 0), her: { ...V }, visit: S.visit && { ...S.visit } }),
    regions: REGIONS, table: TBL, door: DOOR, candles,
    say, place(x, z, yaw) { S.x = x; S.z = z; if (yaw != null) S.yaw = yaw; S.path.length = 0; },
    // hold still at (x, z) facing yaw, deciding nothing (for still pictures)
    pose(x, z, yaw, anim = null) { S.frozen = true; api.place(x, z, yaw); S.task = null; S.faceHerUntil = 0; S.face = { fx: x + Math.sin(yaw), fz: z + Math.cos(yaw) }; S.anim = anim; },
  };
  // ?chaplain=say:<text> or ?chaplain=card holds a pose for still pictures
  if (Q.has('chaplain')) {
    const how = Q.get('chaplain');
    const hold = () => { if (!S.built || !H || !bubble) return setTimeout(hold, 300); S.task = (function* () { for (;;) yield; })(); S.taskName = 'demo'; S.faceHerUntil = 1e9;
      if (how === 'card') { H.visitor.present = true; ensureVisit(); H.talk.open(me, me.dialogue()); say(SAY.WINDOWS.ingression[0], { secs: 1e6 }); }
      else if (how.startsWith('say:')) say(decodeURIComponent(how.slice(4)), { secs: 1e6 });
      else if (how === 'light') { S.taskName = 'light'; S.task = candlesTask(true); }
      else if (how.startsWith('pose:')) { const [x, z, yaw] = how.slice(5).split(',').map(Number); api.pose(x, z, yaw); }
    };
    setTimeout(hold, 500);
  }
  return api;
}
