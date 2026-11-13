// Having friends round. Loaded the first time somebody is rung (friends.js), so a
// house with no guests pays nothing for any of this.
//
// Each guest is a body (bodies.js) moved by the staff's own path-follower (staff/nav.js
// Mover, on the staff's walkable plan when the staff are in, or one of our own), a
// speech bubble (staff/bubbles.js) and a small state machine, stepped every frame
// without allocating:
//
//   coming -> porch (glides up to the front door, knocks, opens it, comes in)
//          -> here  (see below)  -> leaving (says goodbye, goes out by the front door) -> away
//
// While here, a guest decides what to do about four times a second, in this order:
//   1. Attention. Spoken to, or speaking to the visitor or another guest: hold still
//      and face them.
//   2. Manners. Never nearer the visitor than about four feet (ease back to five or six);
//      never left standing in a doorway.
//   3. Dancing, if a dance is on.
//   4. Company. If the visitor has gone to another room or floor, follow after a
//      moment (each guest with their own delay, so they do not move as a pack) to a
//      spot five to six feet off, to one side, in the open, in sight. If she has gone
//      out into the garden, stay in and say so.
//   5. Their own pleasures: a remark, a fidget, a wander to something they like
//      (the chalkboard, the coffee bar, the bookshelves), saying where they are going.
// Group life (overheard conversations, chiming in on what is said to somebody else)
// comes from brain.js and is played out here as bubbles, with everyone turning to
// whoever is speaking.

import { Mover, makeNav } from '../staff/nav.js';
import { makeBubbles } from '../staff/bubbles.js';
import { buildGuest, useThreeBodies, costOf, handPose } from './bodies.js';
import { makeBrain, CAST, ORDER, tempoFor } from './brain.js';
import { JIGSAW } from '../jigsaw.js';
import { F1 } from '../house.js';

const PLAN_W = 43.33, wx = X => X - PLAN_W / 2, wz = Y => -Y;
const KEEP = 5.6;                      // a polite distance, feet
const PORCH_Y = 1.45, BPM = 97;        // the porch floor; the tempo of the house's own tune (sound.js, "Come On In")
// What they like doing in the house, in plan feet: where to stand (at) or which seat to take (seat,
// the seat nearest that point), what they attend to (look: X, Y and height above the floor; the hands
// go there too, for typing, drawing, playing, taking a book down), which floor, the gesture (bodies.js
// handPose), how far they lower themselves to it (drop), a prop (a book off the shelf), how much they
// like it (w), and a liking for the fire after dark (night). Lines for a place, where there are any, are
// in cast.js (drift:key and atSpot:key); for the rest they simply go, and nobody announces it.
// friendtest.html checks every one against the furniture as it now stands (api.checkActs).
// The jigsaw (jigsaw.js says where its board is): one stands at the place it names, leaning over, the other a couple
// of feet along the same side (across the table there are only the backs of the far chairs, too far to reach), so
// they never share a spot. That side is where she sits down to play, so neither is taken (and both are given up)
// while she is sitting at the puzzle.
const JX = JIGSAW.x + PLAN_W / 2, JY = -JIGSAW.z, JH = JIGSAW.y - F1, JS = [JIGSAW.stand.x + PLAN_W / 2, -JIGSAW.stand.z], JO = [JX - 1.6, JS[1] + 0.2];
const CHESS = [6.6, 25.95];                                    // the chess table in the library (plan feet; its set is toys.js's)
const ACTS = {
  feyn: [
    { key: 'chalkboard', at: [26.9, 24.1], look: [26.9, 22.95, 4.5], f: 0, pose: 'draw', w: 3 },
    { key: 'piano', seat: [15.4, 25.5], look: [17.3, 25.5, 2.62], f: 0, pose: 'piano', w: 2 },
    { key: 'books', at: [2.7, 2.8], look: [2.7, 1.1, 4.3], f: 0, pose: 'read', prop: 'book', w: 2 },
    { key: 'fire', at: [13.5, 18.4], look: [16.8, 17.8, 1.3], f: 0, pose: 'warm', w: 1, night: 3 },
    { key: 'jigsaw', at: JO, look: [JX, JY, JH], f: 0, pose: 'lean', drop: 0.45, w: 1, playSide: true },
    { key: 'window', at: [2.4, 4.5], look: [0.3, 4.5, 4.6], f: 0, pose: 'behind', w: 1 },
    { key: 'globe', at: [7.4, 21.6], look: [4.7, 21.0, 3.3], f: 1, pose: 'reach', w: 1 },
    { key: 'chess', at: [6.6, 23.8], look: [6.6, 25.95, 1.8], f: 1, pose: 'lean', drop: 0.45, w: 1 },
  ],
  gigi: [
    { key: 'coffee', at: [37.7, 19.6], look: [37.7, 17.65, 3.3], f: 0, pose: 'make', w: 0 },         // her coffee run (coffeeRun), not a pastime
    { key: 'sofa', seat: [7.7, 17.8], look: null, f: 0, pose: 'sip', w: 3 },
    { key: 'kiss', at: [4.5, 14.6], look: [0.6, 14.6, 4.9], f: 0, pose: 'chin', w: 2 },
    { key: 'records', at: [3.4, 17.6], look: [1.2, 17.6, 1.1], f: 0, pose: 'browse', drop: 0.35, w: 2 },
    { key: 'sunflowers', at: [30.2, 3.6], look: [30.2, 0.6, 6.0], f: 0, pose: 'chin', w: 1 },
    { key: 'window', at: [2.4, 5.6], look: [0.3, 5.6, 4.6], f: 0, pose: 'behind', w: 1 },
    { key: 'fire', at: [13.5, 17.0], look: [16.8, 17.8, 1.3], f: 0, pose: 'warm', w: 1, night: 3 },
    { key: 'jigsaw', at: JS, look: [JX, JY, JH], f: 0, pose: 'lean', drop: 0.4, w: 1, playSide: true },
  ],
  nano: [
    { key: 'desk', seat: [25.0, 35.6], look: [25.0, 37.5, 2.55], f: 0, pose: 'type', w: 3 },
    { key: 'imac', at: [23.0, 28.2], look: [21.5, 28.2, 2.5], f: 0, pose: 'type', drop: 1.0, w: 2 },
    { key: 'library', at: [12.0, 20.2], look: [12.0, 18.75, 4.4], f: 1, pose: 'read', prop: 'book', w: 2 },
    { key: 'shelves', at: [16.6, 2.8], look: [16.6, 1.1, 4.3], f: 0, pose: 'read', prop: 'book', w: 2 },
    { key: 'chess', at: [6.6, 23.8], look: [6.6, 25.95, 1.8], f: 1, pose: 'lean', drop: 0.6, w: 1 },
    { key: 'globe', at: [7.4, 21.6], look: [4.7, 21.0, 3.3], f: 1, pose: 'reach', w: 1 },
    { key: 'fire', at: [13.5, 19.2], look: [16.8, 17.8, 1.3], f: 0, pose: 'warm', w: 1, night: 3 },
    { key: 'window', at: [2.4, 3.4], look: [0.3, 3.4, 4.6], f: 0, pose: 'behind', w: 1 },
  ],
};

export function makeParty(ctx, ui) {
  const { THREE, scene, camera } = ctx;
  const headless = !!ctx.headless;
  useThreeBodies(THREE);
  const staff = () => (typeof window !== 'undefined' ? window.__staff : null) ?? ctx.staff ?? null;
  // The plan of the house: the staff keep one up to date; without them we keep our own
  let nav = staff()?.nav ?? null, ownNav = false, navSig = '', navTimer = 0;
  const group = new THREE.Group(); group.name = 'friends'; group.userData.staff = true; scene.add(group);
  if (!nav) { nav = makeNav(ctx); ownNav = true; nav.rebuild(group); }
  const bubbles = staff()?.H?.bubbles ?? makeBubbles(THREE, camera, headless);
  const brain = makeBrain({ rnd: ctx.friendsRnd ?? Math.random });
  const rnd = ctx.friendsRnd ?? Math.random;
  const note = t => { if (!headless) window.houseUI?.toast?.(t); P.notes.push(t); };

  const P = {
    now: 0, dt: 1 / 60, active: false, guests: [], byId: {}, queue: [], notes: [], brain, nav, demo: false, rescueLog: [],
    v: { present: false, x: 0, y: 0, z: 0, f: 0, fx: 0, fz: -1, room: null, roomSince: 0, outside: false, outSince: 0, seated: false, movedAt: 0, lx: 0, lz: 0, dx: 0, dz: -1, speed: 0 },
    walkOff: 0, beat: 0, bpm: BPM, bpmAim: BPM, feel: 1, feelAim: 1, tune: '', tuneAt: 0,
    chatWith: null, lastInput: -99, nextGroup: 0, nextWatch: 0, script: null, nextBanter: 40, nextSolo: 18, danceUntil: 0, nextHum: 0, lastFollowSay: -99, saidWait: false, saidSeat: -99, lastStaffSay: -99,
    been: new Set(), lastArrive: -99, lastRoomNote: -99, door: null, doorOpenedByUs: false, closeDoorAt: 0,
    events: { rings: 0, arrivals: 0, leaves: 0, lines: 0, follows: 0, backoffs: 0, banters: 0, solos: 0, drifts: 0, dances: 0, doors: 0, glides: 0, fails: 0, nudges: 0, rescues: 0 },
  };

  // ---- small helpers (no allocation: these run every frame) ---------------------------------
  const v = P.v;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
  // Places nobody should be left standing: door swings, the narrower cased openings, the foot and head of the stair
  const passages = ctx.house.portals.filter(p => ['cased', 'door', 'gdoor'].includes(p.kind) && Math.max(p.x1 - p.x0, p.z1 - p.z0) < 6.5 && !ctx.house.doors.some(d => d.fixed && Math.abs(d.cx - (p.x0 + p.x1) / 2) < 0.3 && Math.abs(d.cz - (p.z0 + p.z1) / 2) < 0.3))
    .map(p => ({ x0: p.x0, x1: p.x1, z0: p.z0, z1: p.z1, alongX: p.x1 - p.x0 > p.z1 - p.z0, y: p.y0 }));
  function nearDoor(f, x, z, r) {
    for (const d of nav.doors) if (d.staffFloor === f && Math.hypot(d.cx - x, d.cz - z) < r) return true;
    const y = nav.FLOORS[f], pad = r - 0.4;
    for (const p of passages) { if (Math.abs(p.y - y) > 1) continue; if (p.alongX ? (x > p.x0 - 0.3 && x < p.x1 + 0.3 && z > p.z0 - pad && z < p.z1 + pad) : (z > p.z0 - 0.3 && z < p.z1 + 0.3 && x > p.x0 - pad && x < p.x1 + pad)) return true; }
    const st = nav.stair; if (st) { const c = f ? st.hi : st.lo; if (Math.hypot(nav.cx(c) - x, nav.cz(c) - z) < r + 0.6) return true; }
    return false;
  }
  const musicOn = () => !!ctx.sound?.nowPlaying?.() && !ctx.sound?.isMuted?.();
  const here = g => g.state === 'here';
  // Is somebody else standing (or about to stand) near this point?
  function taken(self, x, z, r) {
    for (const g of P.guests) {
      if (g === self || g.state === 'away') continue;
      if (Math.hypot(g.m.x - x, g.m.z - z) < r) return true;
      if (g.mode === 'go' && g.m.goal && Math.hypot(g.m.goal.x - x, g.m.goal.z - z) < r) return true;
      if (g.mode === 'glide' && g.gl) { const q = g.gl[g.gl.length - 1]; if (Math.hypot(q[0] - x, q[2] - z) < r) return true; }
    }
    const H = staff()?.H;
    if (H) { for (const a of H.robots) if (a.f === self.m.f && Math.hypot(a.x - x, a.z - z) < r) return true; const rb = H.roomba; if (rb && rb.f === self.m.f && Math.hypot(rb.x - x, rb.z - z) < r * 0.6) return true; }
    return false;
  }
  // On the stair: nobody stops, turns back or changes their mind there
  function onStair(g) { const st = nav.stair, m = g.m; return !!st && !g.out && Math.abs(m.x - st.x) < 2.4 && m.z > st.zHi - 0.6 && m.z < st.zLo + 0.6 && (m.f === 1 || m.y > nav.FLOORS[0] + 0.05 || (m.path && m.path[m.i] && m.path[m.i].f === 1 && m.z < st.zLo + 0.3)); }
  // The path-follower asks this about the next step: is anyone in the way?
  function blocked(self, x, z) {
    if (self.mode === 'go' && onStair(self)) return false;
    // the stair is one at a time: with somebody else on it, wait a little way off its foot (or its head) until it is clear
    const st = nav.stair, sm = self.m;
    if (st && self.mode === 'go' && sm.path) {
      let up = false; for (let j = sm.i; j < sm.path.length; j++) if (sm.path[j].f !== sm.f) { up = true; break; }
      const end = sm.f ? st.hi : st.lo, far = sm.f ? st.lo : st.hi, ff = sm.f ? 0 : 1;
      if (up && Math.hypot(x - nav.cx(end), z - nav.cz(end)) < 2.4) for (const o of P.guests) if (o !== self && o.state !== 'away' && !o.out && ((o.m.y > nav.FLOORS[0] + 0.05 && o.m.y < nav.FLOORS[1] - 0.05) || (o.m.f === ff && Math.hypot(o.m.x - nav.cx(far), o.m.z - nav.cz(far)) < 2.4))) { self.why = 'stair'; return true; }      // (on it, or just off its other end)
    }
    if (v.present && v.f === self.m.f) { const dv = Math.hypot(v.x - x, v.z - z); if (dv < 2.3 && dv < Math.hypot(v.x - self.m.x, v.z - self.m.z) + 0.2) { self.why = 'her'; return true; } }      // (stepping away from her is always allowed)
    for (const g of P.guests) {
      if (g === self || g.state === 'away' || g.out || g.m.f !== self.m.f || Math.hypot(g.m.x - x, g.m.z - z) >= 1.5 || Math.hypot(g.m.x - x, g.m.z - z) > Math.hypot(g.m.x - self.m.x, g.m.z - self.m.z) + 0.05) continue;      // (stepping away from somebody is always allowed: pressed up against them, that is the only way out)
      if (g.mode === 'go' && g.i > self.i) continue;                          // two on the move: the later arrival gives way (and is eased aside, below)
      if (g.mode !== 'go') g.nudgeAt = P.now;                                  // standing in the way: would you mind?
      self.why = g.id + '/' + g.mode; return true;
    }
    const H = staff()?.H;
    if (H) for (const a of H.robots) if (a.f === self.m.f && Math.hypot(a.x - x, a.z - z) < botR(a) + self.spec.radius + 0.05 && Math.hypot(a.x - x, a.z - z) <= Math.hypot(a.x - self.m.x, a.z - self.m.z) + 0.05) { self.why = 'staff ' + a.name + ' ' + (a.taskName ?? ''); return true; }
    self.why = ''; return false;
  }
  const later = (secs, fn) => { P.queue.push({ t: P.now + secs, fn }); };
  const botR = a => (a.key === 'fig' ? 0.55 : a.key === 'barty' ? 0.7 : 0.85);      // the robots' own sizes (staff.js): squeeze by Fig, give Mort room

  // A place to stand near (cx, cz): five to six feet off, in the open, out of doorways, in
  // sight, not on top of anybody, and preferably to one side of where she is facing.
  function spotNear(g, cx, cz, f, o = {}) {
    const F = nav.floors[f], base = o.facing ? Math.atan2(v.fx, v.fz) : Math.atan2(g.m.x - cx, g.m.z - cz);
    let best = null, bs = -1e9;
    for (const [minClear, see, radii, hallOk] of [[4.2, true, [KEEP, 6.6, 5.1], false], [3.2, true, [KEEP, 7.4, 5.0], false], [3.2, true, [KEEP, 7.4, 5.0], true], [2.6, false, [6.5, 8.5, 5.0], true], [1.6, false, [5.2, 6.5, 8.0, 10.0], true]]) {      // (the last for a small, full room: somewhere, rather than nowhere)
      for (let k = 0; k < 16; k++) for (const r of radii) {
        const a = base + (k / 16) * Math.PI * 2, x = cx + Math.sin(a) * (o.r ?? r), z = cz + Math.cos(a) * (o.r ?? r), c = nav.cellOf(x, z);
        if (c < 0 || !nav.free(f, c, 2, true) || F.door[c] >= 0 || F.clear[c] < minClear) continue;
        if (nearDoor(f, x, z, 2.6) || taken(g, x, z, 3.1) || (!hallOk && inHall(f, x, z))) continue;
        if (!o.facing && v.present && v.f === f && Math.hypot(v.x - x, v.z - z) < 4.8) continue;
        if (see && !nav.see(f, cx, cz, x, z)) continue;
        let rel = a - Math.atan2(v.fx, v.fz); rel = Math.atan2(Math.sin(rel), Math.cos(rel));
        let s = Math.min(F.clear[c], 8) * 0.12 - (g.m.f === f ? Math.hypot(g.m.x - x, g.m.z - z) * 0.06 : 0);
        if (o.facing) s += -Math.abs(Math.abs(rel) - g.side) * 1.1 - (Math.abs(rel) < 0.55 ? 2.5 : 0) + (Math.sign(rel) === g.sideSign ? 0.4 : 0);
        if (s > bs) { bs = s; best = (best ?? {}); best.x = nav.cx(c); best.z = nav.cz(c); best.f = f; }
      }
      if (best) return best;
    }
    return null;
  }
  // A polite place to wait near (x, z): room around it, not in a doorway
  function politeSpot(g, x, z, f, r = 5) {
    const F = nav.floors[f];
    const c = nav.nearest(f, x, z, 2, r, true, c => F.clear[c] >= 3 && !nearDoor(f, nav.cx(c), nav.cz(c), 2.6) && !taken(g, nav.cx(c), nav.cz(c), 2.6) && !(v.present && v.f === f && Math.hypot(nav.cx(c) - v.x, nav.cz(c) - v.z) < 4.6));
    return c < 0 ? null : { f, x: nav.cx(c), z: nav.cz(c) };
  }

  // ---- The front door ---------------------------------------------------------------------------
  function findDoor() {
    let best = null, bd = 1e9;
    for (const d of ctx.house.doors) { if (d.fixed || !d.exterior) continue; const k = Math.hypot(d.cx - wx(21.95), d.cz - wz(0.25)); if (k < bd) { bd = k; best = d; } }
    P.door = best;
    const x = best?.cx ?? wx(21.95), c = nav.nearest(0, x + 0.2, -2.9, 2, 4, true);
    P.inside = c >= 0 ? { x: nav.cx(c), z: nav.cz(c) } : { x, z: -2.9 };
  }
  function landing(g) {
    const x = P.door?.cx ?? wx(21.95), F = nav.floors[0];
    const c = nav.nearest(0, x + 0.3, -3.2, 2, 5, true, c => nav.cx(c) - x > -1.0 && nav.cx(c) - x < 2.6 && nav.cz(c) < -2.2 && F.clear[c] >= 2.4 && !taken(g, nav.cx(c), nav.cz(c), 2.2) && !(v.present && Math.hypot(nav.cx(c) - v.x, nav.cz(c) - v.z) < 3.0));
    return c < 0 ? null : { x: nav.cx(c), z: nav.cz(c) };
  }
  // The doorway is one at a time, and never with her standing in it
  function doorwayBusy(g) {
    const d = P.door; if (!d) return false;
    if (v.present && Math.abs(v.x - d.cx) < 2.3 && Math.abs(v.z - d.cz) < 3.3) return true;
    for (const o of P.guests) if (o !== g && o.crossing) return true;
    return false;
  }
  const openDoor = () => { const d = P.door; if (d && !d.isOpen) { d.isOpen = true; d.stop.off = true; P.doorOpenedByUs = true; P.events.doors++; ctx.sound?.note?.(50, 0, 0.3, 0.05); } };
  function closeDoorSoon(secs) { if (P.doorOpenedByUs) P.closeDoorAt = P.now + secs; }
  function doorTick() {
    if (shut.length) shutTick();
    if (!P.closeDoorAt || P.now < P.closeDoorAt) return;
    const d = P.door; if (!d) { P.closeDoorAt = 0; return; }
    for (const g of P.guests) if ((g.state === 'porch' || g.state === 'leaving' || g.state === 'coming') || (here(g) && Math.hypot(g.m.x - d.cx, g.m.z - d.cz) < 3.2)) { P.closeDoorAt = P.now + 2; return; }
    if (v.present && Math.hypot(v.x - d.cx, v.z - d.cz) < 4.5) { P.closeDoorAt = P.now + 2; return; }       // never shut it on her
    if (d.isOpen) { d.isOpen = false; d.stop.off = false; }
    P.closeDoorAt = 0; P.doorOpenedByUs = false;
  }

  // ---- A guest --------------------------------------------------------------------------------------
  function makeGuest(id, i) {
    const C = CAST[id], body = buildGuest(id), spec = body.spec;
    body.root.visible = false; group.add(body.root);
    const m = new Mover(nav, { need: 2, opener: true, speed: spec.speed, turn: 2.4, ease: 1.7 });
    const g = {
      id, C, spec, body, m, i, name: C.short, state: 'away', mode: 'idle', out: false,
      bubble: bubbles.make(C.short), side: [1.15, 1.15, 2.1][i % 3], sideSign: [1, -1, 1][i % 3], lag: 1.1 + i * 1.5,
      thinkAt: 0, tries: 0, onArrive: null, speedK: 1, gl: null, gi: 0, glThen: null, waitUntil: 0,
      engagedUntil: 0, look: null, lookUntil: 0, expr: 'neutral', exprUntil: 0, drop: 0, dropNow: 0, spin: 0, lastYaw: 0, blinkAt: 2 + i,
      anim: null, animUntil: 0, nudgeAt: -9, lastNudge: -9, stall: 0, cornered: 0, offFloor: 0, px: 0, pz: 0, stuckT: 0, staffSaid: {}, dance: false, danceReady: false, lastBeat: -1,
      away: null, lastDrift: -60, followSince: 0, lastBack: -9, nextAct: 8 + i * 3, saidUp: false, wantCoffee: 0, hasCup: false, greeted: false, arriveAt: 0, leaveTries: 0, visits: 0,
      box: { x0: 0, x1: 0, y0: -100, y1: -99, z0: 0, z1: 0, staff: true },
      inter: { x: 0, y: -1000, z: 0, reach: 8, label: () => (P.chatWith === g ? `say something to ${C.short}` : `talk to ${C.short}`), act: () => talkTo(g) },
    };
    m.avoid = (x, z) => blocked(g, x, z);
    m.onDoor = d => { if (d === P.door) { openDoor(); closeDoorSoon(4); } else if (!d.isOpen) { d.isOpen = true; d.stop.off = true; P.events.doors++; } };
    ctx.colliders.push(g.box); ctx.interact.push(g.inter);
    Object.defineProperty(g, 'engaged', { get: () => P.now < g.engagedUntil || P.chatWith === g });
    return g;
  }
  // A long line goes up over their head a sentence or two at a time (no bubble wider than a short paragraph);
  // the conversation card has it whole
  function pieces(text) {
    if (text.length <= 100) return null;
    const parts = text.match(/[^.!?]+[.!?]+["”)]*\s*|[^.!?]+$/g); if (!parts || parts.length < 2) return null;
    const out = []; let cur = '';
    for (const p of parts) { if (cur && (cur + p).trim().length > 95) { out.push(cur.trim()); cur = ''; } cur += p; }
    if (cur.trim()) out.push(cur.trim());
    return out.length > 1 ? out : null;
  }
  // Hands while talking, chosen loosely from the line: a question shrugs or offers a palm, an exclamation opens both
  // hands, a list counts off, "you" points (gently), anything else an open hand now and then, or a thought
  const TALK_SETS = [['shrug', 'open', 'chin'], ['open2', 'open', 'point'], ['count', 'open', 'count'], ['point', 'open', 'open2'], ['open', 'rest', 'open2', 'chin', 'rest']];
  const talkSetFor = text => (/\b(first|second|third|one|two|three|four|both|list|steps?)\b/i.test(text) ? TALK_SETS[2] : /\?\s*$/.test(text) ? TALK_SETS[0] : /!/.test(text) ? TALK_SETS[1] : /\byou\b/i.test(text) ? TALK_SETS[3] : TALK_SETS[4]);
  function say(g, text, { expr = null, secs = null, toGuest = true, look = null, log = true } = {}) {
    if (!text) return 0;
    g.talkSet = /^\*/.test(text) ? TALK_SETS[4] : talkSetFor(text); g.gestI = -1; g.gestNext = 0;
    const dur = Math.max(secs ?? 0, Math.min(15, 2.6 + text.length * 0.075));      // as bubbles.js: long enough to read
    // one speaker at a time: anybody else nearby who is still showing a line lets it go as this one starts
    for (const o of P.guests) if (o !== g && o.state !== 'away' && o.bubble.talking(P.now) && Math.hypot(o.m.x - g.m.x, o.m.z - g.m.z) < 26) o.bubble.until = Math.min(o.bubble.until, P.now + 0.4);
    const parts = pieces(text), tok = g.sayTok = (g.sayTok ?? 0) + 1;
    if (parts) {
      let t = 0;
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i], hold = Math.min(7, 1.6 + part.length * 0.06), last = i === parts.length - 1;
        if (i === 0) g.bubble.say(part, last ? dur - t : hold + 0.3, P.now);
        else { const at = t; later(at, () => { if (g.sayTok === tok && g.state !== 'away') g.bubble.say(part, last ? Math.max(2.5, dur - at) : hold + 0.3, P.now); }); }
        t += hold;
      }
    } else g.bubble.say(text, dur, P.now);
    P.lastLine = g.lastLine = P.now;
    g.expr = expr ?? (/!/.test(text) ? 'happy' : /\?$/.test(text) ? 'surprised' : 'neutral'); g.exprUntil = P.now + Math.min(6, 1.5 + text.length * 0.05);
    P.events.lines++;
    const d = v.present && v.f === g.m.f ? dist(g.m, v) : 99;
    if (toGuest && d < 16) { g.engagedUntil = Math.max(g.engagedUntil, P.now + dur); g.look = v; g.lookUntil = P.now + dur; }
    else if (look) { g.look = look; g.lookUntil = P.now + dur; g.engagedUntil = Math.max(g.engagedUntil, P.now + Math.min(dur, 3)); }
    if (d < 22 && !headless) { const k = 0.05 / (1 + (d / 10) ** 2); spec_chirp(g, k); }
    if (log && ui?.chat.open && P.chatWith === g) ui.chat.add('them', g.name, text);
    return dur;
  }
  function spec_chirp(g, k) { const n = g.spec.chirp; for (let i = 0; i < n.length; i++) ctx.sound?.note?.(n[i], i * 0.075, 0.22, k); }
  const line = (g, pool, opts, vars) => say(g, brain.say(g.id, pool, vars), opts);
  // May this one pipe up with something nobody asked for? Not over somebody else, not straight after them,
  // and not twice in a row (a remark, then another, then "I will just sit here" in one breath)
  function chime(g, gap = 10) {
    if (P.now - (P.lastLine ?? -99) < 2.5 || P.now - (g.lastLine ?? -99) < gap) return false;
    for (const o of P.guests) if (o.state !== 'away' && o.bubble.talking(P.now)) return false;
    return true;
  }

  function goTo(g, f, x, z, onArrive = null, speedK = 1) {
    if (g.out || g.mode === 'glide' || (g.mode === 'go' && onStair(g))) return false;
    if (g.sitting) {                                              // up off the seat first, then on the way
      const a = g.seatAccess; g.sitting = false; if (g.seat) g.seat.by = null; g.seat = null; g.drop = 0;
      g.seatGlide = true;
      glide(g, [[a.x, nav.FLOORS[a.f], a.z]], () => { g.seatGlide = false; g.m.place(a.x, a.z, a.f); goTo(g, f, x, z, onArrive, speedK); });
      return true;
    }
    if (!planAround(g, f, x, z) && !plan(g.m, f, x, z)) { P.events.fails++; return false; }      // round people if there is a way, through them (waiting) if not
    g.stall = 0; g.stairWait = 0; g.mode = 'go'; g.onArrive = onArrive; g.tries = 3; g.speedK = speedK; return true;
  }
  // The path-follower's plan, with one repair. From a cramped start (eased up against a chair) the taut
  // path skips the first open cell and heads straight past the furniture, which the follower then
  // refuses to step into, and stands there walking on the spot. Put that cell back as the first stop.
  function plan(m, f, x, z) {
    if (!m.goTo(f, x, z)) return false;
    const p = m.path[1];
    if (p && p.f === m.f && !nav.clearLine(m.f, m.x, m.z, p.x, p.z, 1, true)) {
      const c = nav.nearest(m.f, m.x, m.z, 2, 3, true);
      if (c >= 0) m.path.splice(1, 0, { x: nav.cx(c), z: nav.cz(c), f: m.f });
    }
    return true;
  }
  function glide(g, pts, then) { g.gl = pts; g.gi = 0; g.glThen = then; g.mode = 'glide'; g.glHold = 0; g.m.stop(); }

  // ---- Making themselves at home: the furniture is for sitting on -----------------------------------
  // the garden's benches and chairs (at the ground, outdoors): for sitting near her when she sits out there
  const GSEATS = (ctx.items.seats ?? []).filter(q => q.y - 2.45 < 2.2 && !nav.roomAt(q.x, q.y - 1, q.z)).map(q => ({ x: q.x, z: q.z, top: q.y - 2.45, yaw: q.yaw + Math.PI, by: null }));
  const SEATS = (ctx.items.seats ?? []).map(q => { const top = q.y - 2.45, f = top > nav.FLOORS[1] - 0.6 ? 1 : 0; return { x: q.x, z: q.z, top, yaw: q.yaw + Math.PI, f, by: null }; })      // a seat's yaw is the sitter's view (camera convention); a body's heading is the opposite angle
    .filter(q => q.top - nav.FLOORS[q.f] > 0.9 && q.top - nav.FLOORS[q.f] < 2.7);
  const inHall = (f, x, z) => { const r = nav.roomAt(x, nav.FLOORS[f] + 1, z); return !!r && /hall/i.test(r.name); };
  function takeSeat(g) {
    if (g.sitting || g.out || !v.present || v.outside) return false;
    const m = g.m; let best = null, bs = 1e9, bc = -1;
    for (const q of SEATS) {
      if (q.f !== m.f || q.f !== v.f || q.by) continue;
      const dv = Math.hypot(q.x - v.x, q.z - v.z); if (dv < 3.8 || dv > 22) continue;      // (not the seat right beside hers)
      if (v.room && nav.roomAt(q.x, q.top + 1, q.z)?.name !== v.room) continue;                      // somewhere in the room she is in
      if (taken(g, q.x, q.z, 1.6) || SEATS.some(o => o !== q && o.by && o.by !== g && Math.hypot(o.x - q.x, o.z - q.z) < 2.3)) continue;      // not on top of somebody, nor in their lap
      const c = nav.nearest(q.f, q.x, q.z, 2, 3.4, true); if (c < 0) continue;
      const score = Math.abs(dv - 8) + Math.hypot(q.x - m.x, q.z - m.z) * 0.15 + rnd() * 2.5;
      if (score < bs) { bs = score; best = q; bc = c; }
    }
    if (!best) return false;
    return sitIn(g, best, bc, () => { if (rnd() < 0.5 && P.now - P.saidSeat > 50 && chime(g)) { P.saidSeat = P.now; line(g, g.C.pools.sitDown ? 'sitDown' : 'seated', { toGuest: false, secs: 3 }); } });
  }
  // To a seat and into it: walk to the open floor beside it, then settle in, facing out of it, at its height
  // (the body resting just above the cushion: a robot sits on its bottom like anybody else)
  function sitIn(g, q, bc, then = null) {
    if (bc === undefined || bc < 0) bc = nav.nearest(q.f, q.x, q.z, 2, 3.4, true);
    if (bc < 0) return false;
    const ax = nav.cx(bc), az = nav.cz(bc), f = q.f;
    q.by = g; g.seatWant = q;
    const ok = goTo(g, f, ax, az, () => {
      if (q.by !== g) return;
      if (v.seated && Math.hypot(q.x - v.x, q.z - v.z) < 2.4) { q.by = null; g.seatWant = null; return; }   // she got there first
      g.seatGlide = true;
      glide(g, [[q.x, nav.FLOORS[f], q.z]], () => {
        g.seatGlide = false; g.sitting = true; g.seat = q; g.seatWant = null; g.seatAccess = { x: ax, z: az, f };
        const tall = g.spec.tall ?? 1; g.drop = Math.max(0, g.spec.hover - (q.top - nav.FLOORS[f]) - (g.body.R * g.body.bs[1] * tall + 0.08));
        g.m.x = q.x; g.m.z = q.z; g.m.v = 0;
        then?.();
      });
    }, 0.8);
    if (!ok) { q.by = null; g.seatWant = null; }
    return ok;
  }
  // A place to be that is a room, not a way through
  function roomSpot(g) {
    const m = g.m, F = nav.floors[m.f];
    const c = nav.nearest(m.f, m.x, m.z, 2, 16, true, c => F.clear[c] >= 3 && !inHall(m.f, nav.cx(c), nav.cz(c)) && !nearDoor(m.f, nav.cx(c), nav.cz(c), 2.8) && !taken(g, nav.cx(c), nav.cz(c), 2.6));
    return c < 0 ? null : { f: m.f, x: nav.cx(c), z: nav.cz(c) };
  }

  // ---- Out of doors with her: the porches, and the garden beyond them ------------------------------
  // The house plan (staff/nav.js) stops at the outside walls and the gardeners' plan (staff/outdoor.js)
  // starts at the foot of the steps. In between are the three porches, a few inches below the floor:
  // the terrace that wraps the living-room corner and runs into the front porch, and the screened porch
  // behind the kitchen. A small plan of our own covers them (half-foot cells, built the first time
  // anybody goes out, so a house with no guests never pays for it), with the doors that open onto
  // them and the steps down into the garden. Out there a guest glides along planned paths, picks a
  // place five or six feet off her, to one side, and goes out and comes in by whichever door is
  // nearest her: the front door, the terrace door in the living room, or the kitchen door.
  const O = () => staff()?.H?.out ?? null;                        // the garden's own plan (the gardeners')
  const DK = { X0: -34.5, Z0: -47.5, NX: 116, NZ: 124, C: 0.5, NEED: 1.0 };
  let deck = null;
  const dCell = (x, z) => { const i = Math.floor((x - DK.X0) / DK.C), k = Math.floor((z - DK.Z0) / DK.C); return i < 0 || k < 0 || i >= DK.NX || k >= DK.NZ ? -1 : k * DK.NX + i; };
  const dcx = c => DK.X0 + ((c % DK.NX) + 0.5) * DK.C, dcz = c => DK.Z0 + (Math.floor(c / DK.NX) + 0.5) * DK.C;
  function buildDeck() {
    const N = DK.NX * DK.NZ, walk = new Uint8Array(N), clear = new Float32Array(N), h = new Float32Array(N), comp = new Int16Array(N).fill(-1);
    const F1 = nav.FLOORS[0], rooms = ctx.house.rooms.filter(r => /^(Terrace|Front porch|Screened porch)$/.test(r.name));
    const surfs = ctx.house.surfaces.filter(s => !s.ramp && s.h > 0.6 && s.h < F1 - 0.05), stops = new Set(ctx.house.doors.map(d => d.stop));
    for (let c = 0; c < N; c++) {
      const x = dcx(c), z = dcz(c);
      if (!rooms.some(r => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1)) continue;
      for (const s of surfs) if (x >= s.x0 && x <= s.x1 && z >= s.z0 && z <= s.z1) { walk[c] = 1; h[c] = Math.max(h[c], s.h); }
    }
    for (const b of ctx.colliders) {
      if (b.off || b.staff || stops.has(b) || b.y1 < 0.6 || b.y0 > F1 + 4.6) continue;
      const i0 = Math.max(0, Math.floor((b.x0 - DK.X0) / DK.C)), i1 = Math.min(DK.NX - 1, Math.floor((b.x1 - DK.X0) / DK.C)), k0 = Math.max(0, Math.floor((b.z0 - DK.Z0) / DK.C)), k1 = Math.min(DK.NZ - 1, Math.floor((b.z1 - DK.Z0) / DK.C));
      for (let k = k0; k <= k1; k++) for (let i = i0; i <= i1; i++) { const c = k * DK.NX + i; if (walk[c] && b.y0 < h[c] + 4.6 && b.y1 > h[c] + 0.15) walk[c] = 2; }
    }
    for (let c = 0; c < N; c++) { if (walk[c] === 2) walk[c] = 0; clear[c] = walk[c] ? 1e6 : 0; }
    const NX = DK.NX, NZ = DK.NZ, relax = (c, n, w) => { if (clear[n] + w < clear[c]) clear[c] = clear[n] + w; };      // clearance, as the house plan does it (3-4 chamfer)
    for (let k = 0; k < NZ; k++) for (let i = 0; i < NX; i++) { const c = k * NX + i; if (!clear[c]) continue; if (i > 0) relax(c, c - 1, 3); else clear[c] = 3; if (k > 0) { relax(c, c - NX, 3); if (i > 0) relax(c, c - NX - 1, 4); if (i < NX - 1) relax(c, c - NX + 1, 4); } else clear[c] = Math.min(clear[c], 3); }
    for (let k = NZ - 1; k >= 0; k--) for (let i = NX - 1; i >= 0; i--) { const c = k * NX + i; if (!clear[c]) continue; if (i < NX - 1) relax(c, c + 1, 3); else clear[c] = Math.min(clear[c], 3); if (k < NZ - 1) { relax(c, c + NX, 3); if (i < NX - 1) relax(c, c + NX + 1, 4); if (i > 0) relax(c, c + NX - 1, 4); } else clear[c] = Math.min(clear[c], 3); }
    for (let c = 0; c < N; c++) clear[c] = clear[c] / 3 * DK.C;
    // which porch is which (the terrace and the front porch are one; the screened porch is its own)
    const q = new Int32Array(N); let nc = 0;
    for (let c0 = 0; c0 < N; c0++) {
      if (clear[c0] < DK.NEED || comp[c0] >= 0) continue;
      let qh = 0, qt = 0; q[qt++] = c0; comp[c0] = nc;
      while (qh < qt) { const c = q[qh++], i = c % NX; for (const n of [c - 1, c + 1, c - NX, c + NX]) { if (n < 0 || n >= N || (n === c - 1 && i === 0) || (n === c + 1 && i === NX - 1) || comp[n] >= 0 || clear[n] < DK.NEED) continue; comp[n] = nc; q[qt++] = n; } }
      nc++;
    }
    deck = { walk, clear, h, comp, sig: ctx.colliders.length, exits: [], steps: [], g: new Float32Array(N), from: new Int32Array(N), gen: new Uint32Array(N), done: new Uint32Array(N), hk: new Float32Array(N * 2), hv: new Int32Array(N * 2), run: 0 };
    const size = new Int32Array(nc); for (let c = 0; c < N; c++) if (comp[c] >= 0) size[comp[c]]++;
    deck.big = Array.from(size, n => n > 150);
    // the doors out: a place just inside on the house plan, a place just outside on ours
    for (const d of nav.doors) {
      if (!d.exterior || d.staffFloor !== 0) continue;
      const s = d.stop, alongX = s.x1 - s.x0 > s.z1 - s.z0;
      for (const sg of [1, -1]) {
        const ix = d.cx + (alongX ? 0 : sg * 1.8), iz = d.cz + (alongX ? sg * 1.8 : 0), ci = nav.nearest(0, ix, iz, 2, 1.6, true), co = deckNearest(d.cx - (alongX ? 0 : sg * 1.8), d.cz - (alongX ? sg * 1.8 : 0), 1.2, 2.2);
        if (ci >= 0 && co >= 0) { deck.exits.push({ d, ix: nav.cx(ci), iz: nav.cz(ci), ox: dcx(co), oz: dcz(co), oy: h[co], comp: comp[co], front: d === P.door }); break; }
      }
    }
    // the steps down to the garden (the ramps that never reach the floor of the house); all run along z
    for (const s of ctx.house.surfaces) {
      if (!s.ramp || Math.max(s.h, s.h2) > F1 - 0.05) continue;
      const xm = (s.x0 + s.x1) / 2, topZ1 = s.h > s.h2, zt = topZ1 ? s.z1 : s.z0, zf = topZ1 ? s.z0 : s.z1, sg = Math.sign(zt - zf);
      const ct = deckNearest(xm, zt + sg * 1.0, 1.2, 2.5); if (ct < 0) continue;
      deck.steps.push({ tx: dcx(ct), tz: dcz(ct), ty: h[ct], comp: comp[ct], fx: xm, fz: zf - sg * 1.0, gx: null, gz: 0, front: Math.abs(xm - (P.door?.cx ?? 0)) < 4 && zt > 0 });
    }
  }
  function deckNearest(x, z, need, maxR, ok = null) {
    const D = deck, c0 = dCell(x, z); if (c0 < 0) return -1;
    const R = Math.ceil(maxR / DK.C), i0 = c0 % DK.NX, k0 = Math.floor(c0 / DK.NX); let best = -1, bd = maxR * maxR;
    for (let k = Math.max(0, k0 - R); k <= Math.min(DK.NZ - 1, k0 + R); k++) for (let i = Math.max(0, i0 - R); i <= Math.min(DK.NX - 1, i0 + R); i++) {
      const c = k * DK.NX + i; if (D.clear[c] < need || D.comp[c] < 0 || (ok && !ok(c))) continue;
      const d = (dcx(c) - x) ** 2 + (dcz(c) - z) ** 2; if (d < bd) { bd = d; best = c; }
    }
    return best;
  }
  const deckFree = (x, z, need) => { const c = dCell(x, z); return c >= 0 && deck.clear[c] >= need; };
  function deckLine(x0, z0, x1, z1) { const L = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.ceil(L / 0.25)); for (let s = 1; s <= n; s++) if (!deckFree(x0 + (x1 - x0) * s / n, z0 + (z1 - z0) * s / n, DK.NEED)) return false; return true; }
  // Where on the porches is somebody standing (the cell), or -1 for the garden
  // (on the porch proper: a seat at the bistro table is inside the chairs' box, and the gaps between the pots by the rail lead nowhere)
  const deckAt = (x, y, z) => { if (!deck) return -1; const c = deckNearest(x, z, DK.NEED, 4, c => deck.big[deck.comp[c]]); return c >= 0 && Math.abs(y - deck.h[c]) < 1.0 ? c : -1; };
  // A* over the porches (typed arrays, a hand-rolled heap), pulled taut; points for a glide, or null
  // (with whoever is standing about out there marked as in the way for the length of the search, as indoors)
  const MK_C = new Int32Array(1024), MK_V = new Float32Array(1024);
  function markPeople(g, arr, cellOfF, step, x1, z1) {
    let n = 0;
    const mark = (px, pz, r) => {
      if (Math.hypot(px - x1, pz - z1) < r) return;
      for (let dz = -r; dz <= r; dz += step) for (let dx = -r; dx <= r; dx += step) { if (dx * dx + dz * dz > r * r || n >= MK_C.length) continue; const c = cellOfF(px + dx, pz + dz); if (c < 0 || !arr[c]) continue; MK_C[n] = c; MK_V[n] = arr[c]; arr[c] = 0; n++; }
    };
    for (const o of P.guests) if (o !== g && o.state !== 'away' && o.out && !o.crossing && o.mode !== 'glide') mark(o.m.x, o.m.z, 1.6);
    if (v.present && v.outside) mark(v.x, v.z, 2.2);
    return n;
  }
  const unmark = (arr, n) => { for (let i = n - 1; i >= 0; i--) arr[MK_C[i]] = MK_V[i]; };
  function deckPath(x0, z0, x1, z1, pts, who = null) {
    if (who) { const n = markPeople(who, deck.clear, dCell, DK.C, x1, z1); try { return deckPath(x0, z0, x1, z1, pts, null); } finally { unmark(deck.clear, n); } }
    const D = deck, NX = DK.NX;
    let c0 = dCell(x0, z0); if (c0 < 0 || D.clear[c0] < DK.NEED) c0 = deckNearest(x0, z0, DK.NEED, 3);
    let c1 = dCell(x1, z1); if (c1 < 0 || D.clear[c1] < DK.NEED) c1 = deckNearest(x1, z1, DK.NEED, 3);
    if (c0 < 0 || c1 < 0 || D.comp[c0] !== D.comp[c1]) return false;
    const run = ++D.run, tx = dcx(c1), tz = dcz(c1); let hn = 0;
    const push = (c, f) => { if (hn >= D.hk.length) return; let i = hn++; while (i) { const p = (i - 1) >> 1; if (D.hk[p] <= f) break; D.hk[i] = D.hk[p]; D.hv[i] = D.hv[p]; i = p; } D.hk[i] = f; D.hv[i] = c; };
    const pop = () => { const top = D.hv[0], k = D.hk[--hn], c = D.hv[hn]; let i = 0; for (;;) { const l = 2 * i + 1; if (l >= hn) break; const r = l + 1, m = r < hn && D.hk[r] < D.hk[l] ? r : l; if (D.hk[m] >= k) break; D.hk[i] = D.hk[m]; D.hv[i] = D.hv[m]; i = m; } D.hk[i] = k; D.hv[i] = c; return top; };
    D.g[c0] = 0; D.gen[c0] = run; D.from[c0] = -1; push(c0, 0);
    let found = false, steps = 0;
    while (hn && steps++ < 20000) {
      const c = pop(); if (D.done[c] === run) continue; D.done[c] = run;
      if (c === c1) { found = true; break; }
      const i = c % NX, k = (c - i) / NX;
      for (let di = -1; di <= 1; di++) for (let dk = -1; dk <= 1; dk++) {
        if (!di && !dk) continue; const ii = i + di, kk = k + dk; if (ii < 0 || kk < 0 || ii >= NX || kk >= DK.NZ) continue;
        const n = kk * NX + ii; if (D.clear[n] < DK.NEED || D.done[n] === run) continue;
        if (di && dk && (D.clear[k * NX + ii] < DK.NEED || D.clear[kk * NX + i] < DK.NEED)) continue;
        const ng = D.g[c] + (di && dk ? 1.414 : 1) * DK.C * (1 + Math.max(0, 1.6 - D.clear[n]) * 0.5);
        if (D.gen[n] !== run || ng < D.g[n]) { D.gen[n] = run; D.g[n] = ng; D.from[n] = c; push(n, ng + Math.hypot(dcx(n) - tx, dcz(n) - tz)); }
      }
    }
    if (!found) return false;
    const cells = []; for (let c = c1; c >= 0; c = D.from[c]) cells.push(c); cells.reverse();
    let ax = x0, az = z0, a = 0;
    while (a < cells.length - 1) {
      let b = a + 1; for (let j = cells.length - 1; j > a + 1; j--) if (deckLine(ax, az, dcx(cells[j]), dcz(cells[j]))) { b = j; break; }
      ax = dcx(cells[b]); az = dcz(cells[b]); pts.push([ax, D.h[cells[b]], az]); a = b;
    }
    if (!pts.length || Math.hypot(pts[pts.length - 1][0] - tx, pts[pts.length - 1][2] - tz) > 0.1) pts.push([tx, D.h[c1], tz]);
    return true;
  }
  const herDeck = () => deckAt(v.x, v.y, v.z);
  // The foot of a flight of steps, on the gardeners' plan
  function stepFoot(st) { if (st.gx === null) { const o = O(), c = o ? o.nearest(0, st.fx, st.fz, 2, 12) : -1; st.gx = c >= 0 ? o.cx(c) : st.fx; st.gz = c >= 0 ? o.cz(c) : st.fz; } return st; }
  // A place on the porches near her: five or six feet off, to one side of where she is looking, room round it
  // (failing that, on a small porch, anywhere with room that is not the doorway nor at her elbow)
  const atExit = (x, z) => deck.exits.some(e => Math.hypot(e.ox - x, e.oz - z) < 2.0);
  function deckSpot(g, hc) {
    const D = deck, base = Math.atan2(v.fx, v.fz), comp = D.comp[hc]; let best = -1, bs = -1e9;
    for (const [minClear, radii, gap] of [[1.3, [KEEP, 6.6, 5.0, 7.6], 3.1], [1.0, [4.4, 8.6, 9.6], 2.4]]) {
    for (let k = 0; k < 16; k++) for (const r of radii) {
      const a = base + (k / 16) * Math.PI * 2, c = dCell(v.x + Math.sin(a) * r, v.z + Math.cos(a) * r);
      if (c < 0 || D.clear[c] < minClear || D.comp[c] !== comp || taken(g, dcx(c), dcz(c), gap) || atExit(dcx(c), dcz(c))) continue;
      let rel = a - base; rel = Math.atan2(Math.sin(rel), Math.cos(rel));
      const s = Math.min(D.clear[c], 4) * 0.3 - Math.abs(Math.abs(rel) - g.side) * 1.1 - (Math.abs(rel) < 0.55 ? 2.5 : 0) + (Math.sign(rel) === g.sideSign ? 0.4 : 0) - Math.hypot(dcx(c) - g.m.x, dcz(c) - g.m.z) * 0.03;
      if (s > bs) { bs = s; best = c; }
    }
    if (best >= 0) return best;
    }
    return best;
  }
  // A place on the lawn near her: as before, a little to her side
  function lawnSpot(g) {
    const o = O(); if (!o) return null;
    const base = Math.atan2(v.fx, v.fz) + g.sideSign * 0.9;
    for (let k = 0; k < 14; k++) {
      const a = base + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.5, r = 6.4 + (k > 5 ? 2 : 0), x = v.x + Math.sin(a) * r, z = v.z + Math.cos(a) * r;
      if (o.freeAt(0, x, z, 2) && !taken(g, x, z, 3)) return { x, z };
    }
    return null;
  }
  function lawnPath(x0, z0, x1, z1, pts, who = null) {
    const o = O(); if (!o) return false;
    const W = o.floors[0].walk, n = who ? markPeople(who, W, o.cellOf, 1, x1, z1) : 0; let p = null;
    try { p = o.path(0, x0, z0, 0, x1, z1, 2); } finally { unmark(W, n); }
    if (!p) return false; for (const q of p) pts.push([q.x, 0.05, q.z]); return true;
  }
  // On a porch or on the lawn? The height says (porches 1.2 to 1.5 ft up, the lawn at the ground)
  const onDeck = g => g.m.y > 0.6;
  const gcomp = g => (onDeck(g) ? deck.comp[deckNearest(g.m.x, g.m.z, DK.NEED, 2.5)] ?? -1 : -1);
  // Steps from where this guest is (porch component, or the lawn when comp < 0) toward a point
  function bestStep(comp, x0, z0, x1, z1) { let best = null, bs = 1e9; for (const st of deck.steps) { if (comp >= 0 && st.comp !== comp) continue; const s = comp >= 0 ? Math.hypot(st.tx - x0, st.tz - z0) + Math.hypot(st.fx - x1, st.fz - z1) : Math.hypot(st.fx - x0, st.fz - z0) + Math.hypot(st.tx - x1, st.tz - z1); if (s < bs) { bs = s; best = st; } } return best; }
  // Doors we opened at the back of the house, to shut behind us
  const shut = [];
  function openExt(d) {
    if (d === P.door) { openDoor(); return; }
    if (!d.isOpen) { d.isOpen = true; d.stop.off = true; d.ours = true; P.events.doors++; ctx.sound?.note?.(50, 0, 0.3, 0.05); }
  }
  function shutSoon(d, secs) {
    if (d === P.door) { closeDoorSoon(secs); return; }
    if (!d.ours) return; for (const s of shut) if (s.d === d) { s.at = P.now + secs; return; } shut.push({ d, at: P.now + secs });
  }
  function shutTick() {
    for (let i = shut.length - 1; i >= 0; i--) {
      const s = shut[i], d = s.d; if (P.now < s.at) continue;
      let busy = v.present && Math.hypot(v.x - d.cx, v.z - d.cz) < 4.5;
      for (const g of P.guests) if (g.state !== 'away' && (g.crossing || g.outing || g.cominIn) && Math.hypot(g.m.x - d.cx, g.m.z - d.cz) < 9) busy = true;
      if (busy) { s.at = P.now + 2; continue; }
      d.isOpen = false; d.stop.off = false; d.ours = false; shut.splice(i, 1);
    }
  }
  // A door is one at a time, never through her, and not onto somebody standing on the step (on a small porch the last one out waits at the door)
  const exitBusy = (g, e, outward) => (v.present && Math.hypot(v.x - e.d.cx, v.z - e.d.cz) < 2.6) || P.guests.some(o => o !== g && o.state !== 'away' && ((o.crossing && o.exit === e) || (outward && o.out && !o.crossing && Math.hypot(o.m.x - e.ox, o.m.z - e.oz) < 1.8)));
  // Out we go, by the door nearest where she is
  function goOut(g) {
    if (g.outing || g.out || g.state !== 'here') return;
    if (!deck || deck.sig !== ctx.colliders.length) buildDeck();
    const hc = herDeck(); let best = null, bs = 1e9;
    for (const e of deck.exits) {
      let s = Math.hypot(g.m.x - e.ix, g.m.z - e.iz) * (g.m.f ? 1 : 0.6) + (e.d === g.badExit && P.now < g.badUntil ? 60 : 0);      // (a door we could not get to just now: another, if there is one)
      if (hc >= 0) { if (e.comp !== deck.comp[hc]) continue; s += Math.hypot(e.ox - v.x, e.oz - v.z); }
      else { const st = bestStep(e.comp, e.ox, e.oz, v.x, v.z); if (!st) continue; s += Math.hypot(e.ox - st.tx, e.oz - st.tz) + Math.hypot(st.fx - v.x, st.fz - v.z); }
      if (s < bs) { bs = s; best = e; }
    }
    if (!best) return;
    g.outing = true; g.exit = best; g.outTries = 0;
    const cross = () => {
      if (!v.outside || g.state !== 'here' || ++g.outTries > 20) { g.outing = false; g.mode = 'idle'; return; }
      if (exitBusy(g, best, true)) { g.waitUntil = P.now + 0.7; g.glThen = cross; g.mode = 'knock'; return; }
      openExt(best.d);
      g.out = true; g.crossing = true; g.garden = true; g.away = null; g.gSettled = false; g.anim = null; g.drop = 0;
      glide(g, [[best.d.cx, (nav.FLOORS[0] + best.oy) / 2, best.d.cz], [best.ox, best.oy, best.oz]], () => { g.crossing = false; g.outing = false; shutSoon(best.d, 2.5); g.thinkAt = 0; });
    };
    if (!goTo(g, 0, best.ix, best.iz, cross, 1.1)) g.outing = false;
  }
  // Back indoors when she is: by the door nearest her
  function comeIn(g) {
    if (g.cominIn || !deck) return;
    const m = g.m, comp = gcomp(g), pts = []; let best = null, bs = 1e9, via = null;
    for (const e of deck.exits) {
      if (e.d === g.skipExit && P.now < g.skipUntil) continue;
      let s = Math.hypot(e.ix - v.x, e.iz - v.z) * 0.7, st = null;
      if (comp >= 0) { if (e.comp !== comp) continue; s += Math.hypot(m.x - e.ox, m.z - e.oz); }
      else { st = bestStep(-1, m.x, m.z, e.ox, e.oz); if (!st || st.comp !== e.comp) st = deck.steps.filter(q => q.comp === e.comp).sort((a, b) => Math.hypot(a.fx - m.x, a.fz - m.z) - Math.hypot(b.fx - m.x, b.fz - m.z))[0]; if (!st) continue; s += Math.hypot(m.x - st.fx, m.z - st.fz) + Math.hypot(st.tx - e.ox, st.tz - e.oz); }
      if (s < bs) { bs = s; best = e; via = st; }
    }
    if (!best) { gone(g); return; }                              // (nowhere to come in by: nobody sees this, but never leave anyone stranded)
    let sx = m.x, sz = m.z;
    if (P.now - (g.comeInTry ?? -9) < 2) return; g.comeInTry = P.now;          // (a plan that cannot be made now is tried again in a moment, not every frame)
    if (via) { stepFoot(via); if (!lawnPath(m.x, m.z, via.gx, via.gz, pts, g)) return; pts.push([via.fx, 0.05, via.fz], [via.tx, via.ty, via.tz]); sx = via.tx; sz = via.tz; }
    // to wait by the door: its step if free, or a place beside it (never two on one spot)
    const w = deckNearest(best.ox, best.oz, DK.NEED, 3.5, c => !taken(g, dcx(c), dcz(c), 1.8)), wx0 = w >= 0 ? dcx(w) : best.ox, wz0 = w >= 0 ? dcz(w) : best.oz;
    if (!deckPath(sx, sz, wx0, wz0, pts, g)) return;
    if (g.gSeat) { g.gSeat.by = null; g.gSeat = null; g.drop = 0; }
    g.cominIn = true; g.exit = best; g.glK = 1.6; g.gSettled = false; g.inWait = 0;
    glide(g, pts, () => {
      const tryIn = () => {
        // in, to a place just inside that is not at her elbow; with her standing in the way, wait on the step a little, then try another door
        const c = exitBusy(g, best) ? -1 : nav.nearest(0, best.ix, best.iz, 2, 5, true, c => !taken(g, nav.cx(c), nav.cz(c), 2) && !nearDoor(0, nav.cx(c), nav.cz(c), 1.6) && !(v.present && v.f === 0 && Math.hypot(nav.cx(c) - v.x, nav.cz(c) - v.z) < 4.4) && nav.clearLine(0, best.ix, best.iz, nav.cx(c), nav.cz(c), 1, true));
        if (c < 0 && (g.inWait += 0.8) > 7 && deck.exits.length > 1) { g.skipExit = best.d; g.skipUntil = P.now + 60; g.cominIn = false; g.mode = 'idle'; comeIn(g); return; }
        if (c < 0) { g.waitUntil = P.now + 0.8; g.glThen = tryIn; g.mode = 'knock'; return; }
        const x = nav.cx(c), z = nav.cz(c);
        openExt(best.d); g.crossing = true; g.glK = 1;
        glide(g, [[best.d.cx, (nav.FLOORS[0] + best.oy) / 2, best.d.cz], [best.ix, nav.FLOORS[0], best.iz], [x, nav.FLOORS[0], z]], () => {
          g.out = false; g.garden = false; g.crossing = false; g.cominIn = false; g.m.place(x, z, 0); g.mode = 'idle'; g.thinkAt = 0; shutSoon(best.d, 3);
        });
      };
      tryIn();
    });
  }
  // Out of doors: keep near her, on the porch or on the lawn, wherever she is
  function outThink(g) {
    const m = g.m;
    if (g.crossing || g.mode === 'glide' || g.mode === 'knock' || g.cominIn || !v.present) return;
    if (!v.outside) { if (P.now - (v.inSince ?? 0) > 2.5 + g.i * 1.2) comeIn(g); return; }
    const hc = herDeck(), d = Math.hypot(m.x - v.x, m.z - v.z), onLawn = !onDeck(g);
    const wantBench = hc < 0 && v.seated && !g.gSeat && P.now - (g.gSeatTry ?? -99) > 10;
    if (g.gSettled && d < (hc >= 0 ? 11 : 15) && (hc < 0) === onLawn && d > 3.4 && !wantBench) return;      // settled near her, where she is
    if (P.now - v.movedAt < 1.2 && d < 40) return;                                             // let her get where she is going first
    for (const o of P.guests) if (o !== g && o.garden && o.mode === 'glide' && Math.hypot(o.m.x - m.x, o.m.z - m.z) < 6) return;      // one at a time along the path
    const pts = [], comp = onLawn ? -1 : gcomp(g);
    if (g.gSeat) { g.gSeat.by = null; g.gSeatLeft = g.gSeat; g.gSeatLeftAt = P.now; g.gSeat = null; g.drop = 0; }      // up off the bench, if they were on one
    g.gSeatWant = null;
    if (wantBench && onLawn) {                                    // she has sat down on a bench in the garden: they take one near her too
      g.gSeatTry = P.now; let q = null, bd = 13;
      for (const o of GSEATS) { const dv = Math.hypot(o.x - v.x, o.z - v.z); if (dv < 2.4 || dv > bd || (o.by && o.by !== g) || taken(g, o.x, o.z, 1.6)) continue; bd = dv; q = o; }
      if (q) {
        const fx = q.x + Math.sin(q.yaw) * 1.3, fz = q.z + Math.cos(q.yaw) * 1.3;
        if (lawnPath(m.x, m.z, fx, fz, pts, g)) {
          q.by = g; pts.push([q.x, 0.05, q.z]); g.gSeatWant = q;
          g.glK = 1.6; glide(g, pts, () => { g.glK = 1; g.gSettled = true; g.gSeat = q; g.gSeatWant = null; const tall = g.spec.tall ?? 1; g.drop = Math.max(0, g.spec.hover - q.top - (g.body.R * g.body.bs[1] * tall + 0.08)); });
          return;
        }
        pts.length = 0;
      }
    }
    if (hc >= 0) {                                                // she is on a porch
      const c = deckSpot(g, hc);
      if (c < 0) {                                                // no room out there (a small porch, a full one): back in, and wait by the door
        if (atExit(m.x, m.z) || d < 3.8) { g.noRoom = P.now + 25; comeIn(g); } else g.gSettled = true;
        return;
      }
      const x = dcx(c), z = dcz(c);
      if (comp === deck.comp[hc]) { if (!deckPath(m.x, m.z, x, z, pts, g)) { g.gSettled = true; return; } }
      else if (comp >= 0) { comeIn(g); return; }                  // the other porch: through the house is the way
      else { const st = bestStep(-1, m.x, m.z, x, z); if (!st || st.comp !== deck.comp[hc]) { g.gSettled = true; return; } stepFoot(st); if (!lawnPath(m.x, m.z, st.gx, st.gz, pts, g)) { g.gSettled = true; return; } pts.push([st.fx, 0.05, st.fz], [st.tx, st.ty, st.tz]); if (!deckPath(st.tx, st.tz, x, z, pts, g)) { g.gSettled = true; return; } }
      g.glK = 1.4; glide(g, pts, () => { g.glK = 1; g.gSettled = true; g.look = v; g.lookUntil = P.now + 3; });
    } else {                                                      // she is in the garden
      const s = lawnSpot(g); if (!s) { g.gSettled = true; return; }
      if (!onLawn) { const st = bestStep(comp, m.x, m.z, s.x, s.z); if (!st) { g.gSettled = true; return; } stepFoot(st); if (!deckPath(m.x, m.z, st.tx, st.tz, pts, g)) return; pts.push([st.fx, 0.05, st.fz]); if (!lawnPath(st.gx, st.gz, s.x, s.z, pts, g)) return; }
      else if (!lawnPath(m.x, m.z, s.x, s.z, pts, g)) { g.gSettled = true; return; }
      g.glK = 1.9; glide(g, pts, () => { g.glK = 1; g.gSettled = true; g.look = v; g.lookUntil = P.now + 3; });
    }
    if ((!P.saidOut || P.now - P.saidOut > 120) && chime(g)) { P.saidOut = P.now; line(g, 'follow', { toGuest: false, secs: 2.8 }); }
  }
  // Sent home from out of doors: round by the porch steps and away down the front walk
  function leaveOut(g) {
    const m = g.m, pts = [], comp = gcomp(g);
    const front = deck?.steps.find(s => s.front) ?? null;
    if (comp >= 0) { const st = deck.steps.find(s => s.front && s.comp === comp) ?? bestStep(comp, m.x, m.z, front?.fx ?? m.x, front?.fz ?? m.z); if (st) { deckPath(m.x, m.z, st.tx, st.tz, pts, g); pts.push([st.fx, 0.05, st.fz]); } }
    else if (front) { stepFoot(front); lawnPath(m.x, m.z, front.gx, front.gz, pts, g); }
    const last = pts[pts.length - 1] ?? [m.x, m.y, m.z]; pts.push([last[0] + 0.6, 0.05, last[2] + 6]);
    line(g, 'leave', { toGuest: false, secs: 3, expr: 'happy' }); g.inter.y = -1000; g.glK = 1.4;
    glide(g, pts, () => gone(g));
  }

  // ---- Coming and going ------------------------------------------------------------------------------
  function ring(id) {
    const g = P.byId[id] ?? (P.byId[id] = makeGuest(id, ORDER.indexOf(id)));
    if (!P.guests.includes(g)) P.guests.push(g);
    if (g.state !== 'away') return brain.say(id, 'phoneAgain');
    if (!P.door) findDoor();
    P.active = true; P.events.rings++;
    g.state = 'coming'; g.arriveAt = Math.max(P.now + (ctx.friendsDelay ?? 9 + rnd() * 6), P.lastArrive + 6); P.lastArrive = g.arriveAt; g.visits++;
    return brain.say(id, P.been.has(id) ? 'phoneAgain' : 'phone');
  }
  function arrive(g) {
    const d = P.door, x = d?.cx ?? wx(21.95);
    g.state = 'porch'; g.out = true; g.body.root.visible = true; g.away = null; g.dance = false; g.anim = null; g.drop = 0; g.spin = 0; g.greeted = false; g.saidUp = false; g.askedRoom = false;
    g.m.x = x + 0.5 + g.i * 0.9 - 0.9; g.m.z = 10.6; g.m.y = PORCH_Y; g.m.f = 0; g.m.yaw = Math.PI; g.m.v = 0;
    if (id_is(g, 'gigi')) { g.hasCup = false; g.body.cup.visible = false; g.wantCoffee = P.now + 38 + rnd() * 20; }
    note(`${g.C.short} is at the front door.`);
    glide(g, [[x + (g.i - 1) * 1.9, PORCH_Y, 2.5 + Math.abs(g.i - 1) * 0.5]], () => {      // each to their own place on the step
      // knock, wait for the door, come in
      g.bubble.say('*knock knock*', 1.6, P.now); ctx.sound?.note?.(45, 0, 0.12, 0.09); ctx.sound?.note?.(45, 0.22, 0.12, 0.09); ctx.sound?.note?.(45, 0.44, 0.12, 0.07);
      g.waitUntil = P.now + (P.door?.isOpen ? 0.5 : 1.3);
      const enter = () => {
        const to = doorwayBusy(g) ? null : landing(g);
        if (!to) {                                                                              // somebody in the doorway: wait on the step
          if (!g.askedRoom && v.present && Math.hypot(v.x - x, v.z) < 4.5 && P.now - g.arriveAt > 6 && P.now - (P.askedRoomAt ?? -99) > 25) { g.askedRoom = true; P.askedRoomAt = P.now; g.bubble.say('*knock knock* Room for one more?', 4, P.now); if (P.now - P.lastRoomNote > 40) { P.lastRoomNote = P.now; note('Somebody is on the step. Make a little room by the door.'); } }
          g.waitUntil = P.now + 0.7; g.glThen = enter; g.mode = 'knock'; return;
        }
        openDoor(); g.crossing = true;
        glide(g, [[x, PORCH_Y + 0.05, 0.9], [x + Math.max(-0.4, Math.min(0.8, to.x - x)), nav.FLOORS[0], -1.3], [to.x, nav.FLOORS[0], to.z]], () => {
          g.out = false; g.crossing = false; g.m.place(to.x, to.z, 0); g.state = 'here'; g.mode = 'idle'; g.thinkAt = 0; P.events.arrivals++; P.been.add(g.id);
          closeDoorSoon(3.5); ui?.phone.draw(); settleIn(g);
        });
      };
      g.glThen = enter; g.mode = 'knock';
    });
  }
  const id_is = (g, id) => g.id === id;
  // Just through the door: go and say hello, or find somewhere to be if nobody is in
  function settleIn(g) {
    const greet = () => { if (g.greeted || !here(g)) return; g.greeted = true; line(g, 'arrive', { expr: 'happy' }); g.nextAct = P.now + 14 + rnd() * 8; };
    if (v.present && !v.outside) {
      const s = spotNear(g, v.x, v.z, v.f, { facing: true });
      if (s && goTo(g, s.f, s.x, s.z, greet)) { g.followSince = 0; if (v.f === 0 && dist(g.m, v) < 16 && nav.see(0, g.m.x, g.m.z, v.x, v.z)) later(0.6, greet); return; }
    }
    const s = politeSpot(g, wx(21.6), wz(6.5), 0, 6);
    if (s) goTo(g, s.f, s.x, s.z, null);
    if (!v.present || v.outside) { g.greeted = true; note(`${g.C.short}: “${brain.say(g.id, 'arriveAlone')}”`); }
    else later(1.2, greet);
  }
  function sendHome(id, quiet = false) {
    const g = P.byId[id]; if (!g || g.state !== 'here') return '';
    const text = quiet ? '' : brain.say(id, 'sentHome');
    g.state = 'leaving'; g.askedRoom = false; g.away = null; g.dance = false; g.anim = null; g.drop = 0; g.spin = 0; g.leaveTries = 0;
    const stair = g.mode === 'go' && onStair(g); if (!stair) { g.mode = 'idle'; g.m.stop(); }
    if (P.script?.who.includes(id)) P.script = null;
    if (P.chatWith === g) later(quiet ? 3.2 : 4.5, () => { if (P.chatWith === g) ui?.chat.hide(); });
    const dur = text ? say(g, text, { expr: 'happy' }) : 3;
    g.waitUntil = P.now + Math.min(dur, 4.2); if (stair) g.onArrive = () => { g.mode = 'farewell'; }; else g.mode = 'farewell';
    P.events.leaves++; ui?.phone.draw();
    return text;
  }
  function headOut(g) {
    if (g.out && !g.crossing) { leaveOut(g); return; }
    const to = landing(g) ?? P.inside;
    const out = () => {
      if (doorwayBusy(g)) {
        if (!g.askedRoom && v.present && P.door && Math.abs(v.x - P.door.cx) < 2.3 && Math.abs(v.z - P.door.cz) < 3.3) { g.askedRoom = true; g.bubble.say('*ahem* Could I squeeze by?', 4, P.now); if (P.now - P.lastRoomNote > 40) { P.lastRoomNote = P.now; note(`${g.C.short} would like to get to the door.`); } }
        g.waitUntil = P.now + 0.8; g.mode = 'farewell'; g.atDoor = true; return;
      }
      openDoor(); line(g, 'leave', { toGuest: false, secs: 3, expr: 'happy' });
      const x = P.door?.cx ?? wx(21.95);
      g.out = true; g.crossing = true; g.atDoor = false; g.inter.y = -1000;
      glide(g, [[x + Math.max(-0.4, Math.min(0.8, g.m.x - x)), nav.FLOORS[0], -1.3], [x, PORCH_Y + 0.05, 0.9], [x, PORCH_Y, 2.4]], () => { g.crossing = false; glide(g, [[x + 0.6, PORCH_Y, 11.5]], () => gone(g)); });
    };
    if (g.atDoor && Math.abs(g.m.x - (P.door?.cx ?? 0)) < 1.4 && g.m.z > -5) { out(); return; }
    const ok = goTo(g, 0, to.x, to.z, out, 1.1);
    if (!ok) { if (++g.leaveTries > 8) { note(`${g.C.short} slips out.`); gone(g); } else { g.waitUntil = P.now + 1.5; g.mode = 'farewell'; } }
  }
  function gone(g) {
    if (g.gSeat) { g.gSeat.by = null; g.gSeat = null; }
    g.state = 'away'; g.out = false; g.crossing = false; g.atDoor = false; g.garden = false; g.cominIn = false; g.outing = false; g.gSettled = false; g.glK = 1; g.mode = 'idle'; g.body.root.visible = false; g.bubble.quiet(); g.box.y0 = -100; g.box.y1 = -99; g.inter.y = -1000; g.m.stop();
    closeDoorSoon(1.5); ui?.phone.draw();
    if (!P.guests.some(x => x.state !== 'away')) { P.script = null; P.danceUntil = 0; }
  }

  // ---- Talking -------------------------------------------------------------------------------------
  const hereIds = () => P.guests.filter(g => here(g) && (!v.present || (g.m.f === v.f && dist(g.m, v) < 34))).map(g => g.id);
  const chatApi = {
    say: (id, text) => sayTo(P.byId[id], text),
    dance: () => (P.danceUntil > P.now ? stopDance() : startDance(P.chatWith)),
    dancing: () => P.danceUntil > P.now,
    chips: id => brain.chips(id, { present: hereIds() }),
    closed: () => { P.chatWith = null; },
  };
  function talkTo(g, focus = true) {
    if (!here(g)) return;
    staff()?.H?.talk?.close?.();                         // one conversation at a time
    P.script = null; P.chatWith = g; P.lastInput = P.now; g.engagedUntil = P.now + 2.5; g.look = v; g.lookUntil = P.now + 6; g.expr = 'happy'; g.exprUntil = P.now + 2.5;
    if (g.mode === 'go' && !g.dance && !onStair(g)) { g.m.stop(); g.mode = 'idle'; }
    ui?.chat.show({ id: g.id, name: g.C.name, short: g.C.short, tag: g.C.tag }, chatApi, focus);
  }
  function sayTo(g, text) {
    if (!g || !here(g)) return null;
    P.lastInput = P.now;
    if (P.script) P.script = null;                       // they stop their own chat to listen
    const r = brain.reply(g.id, text, { present: hereIds(), music: musicOn(), hour: ctx.day?.hour ?? 12 });
    let t = 0.4, mainDur = 0;
    for (const l of r.lines) {
      const who = P.byId[l.who]; if (!who || !here(who)) continue;
      const main = l.kind !== 'react';
      if (!main) continue;                               // the others keep their own counsel while you two talk
      later(t, () => { if (!here(who) && who.state !== 'leaving') return; const speaker = P.byId[r.to]; say(who, l.text, { expr: l.expr, toGuest: main || l.who === r.to, look: main ? null : (rnd() < 0.5 ? speaker?.m : v) }); });
      const dur = Math.min(5.2, 1.5 + l.text.length * 0.04); if (main) mainDur = dur;
      t += dur;
    }
    if (r.act === 'dance') later(Math.min(t, 2.2), () => startDance(P.byId[r.to]));
    else if (r.act === 'leave') { const who = P.byId[r.to]; later(0.5, () => { if (here(who)) sendHome(who.id, true); }); }
    else if (r.act === 'close') later(mainDur + 1.2, () => { if (P.chatWith === g && P.now - P.lastInput > mainDur) ui?.chat.hide(); });
    else if (r.act === 'drum') later(1.0, () => { const f = P.byId.feyn; if (f && here(f)) { f.anim = 'drum'; f.animUntil = P.now + 5; } });
    else if (r.act === 'coffee') later(t + 0.6, () => { const k = P.byId.gigi; if (k && here(k) && !k.away && P.now - P.lastInput > 3) coffeeRun(k, false); else if (k) k.wantCoffee = P.now + 12; });
    if (r.to !== g.id && P.byId[r.to]) { const o = P.byId[r.to]; o.engagedUntil = P.now + 3; }
    ui?.chat.setChips(r.chips); ui?.chat.sync();
    return r;
  }

  // ---- Dancing ---------------------------------------------------------------------------------------
  function startDance(from) {
    if (!P.guests.some(here)) return;
    P.danceUntil = P.now + 26; P.nextHum = P.now + 2.5; P.events.dances++; P.script = null;
    for (const g of P.guests) {
      if (!here(g) || (v.present && (g.m.f !== v.f || dist(g.m, v) > 32))) continue;
      g.dance = true; g.danceReady = false; g.away = null; g.drop = 0; g.anim = null;
      const s = v.present ? spotNear(g, v.x, v.z, v.f, { facing: true }) : null;
      if (!s || dist(s, g.m) < 2.5 || !goTo(g, s.f, s.x, s.z, () => { g.danceReady = true; })) g.danceReady = true;
    }
    if (v.present) note(musicOn() ? 'You dance too. The floorboards approve.' : 'You dance too. (No record on: E at the crate by the record player.)');
    ui?.chat.sync();
  }
  function stopDance() { P.danceUntil = 0; for (const g of P.guests) { g.dance = false; g.spin = 0; g.anim = null; } ui?.chat.sync(); }

  // ---- Their own pleasures ---------------------------------------------------------------------------
  // The place to stand for an activity: the open floor nearest its mark (within a foot or so), free of others
  function spotFor(g, s, r = 1.3) { const c = nav.nearest(s.f, wx(s.at[0]), wz(s.at[1]), 2, r, true, c => !taken(g, nav.cx(c), nav.cz(c), 2.2)); return c < 0 ? null : { x: nav.cx(c), z: nav.cz(c), f: s.f }; }
  // ...or the seat it names (the one nearest its mark), if nobody has it
  function seatFor(g, s) { let best = null, bd = 1.6; for (const q of SEATS) { if (q.f !== s.f || (q.by && q.by !== g)) continue; const d = Math.hypot(q.x - wx(s.seat[0]), q.z - wz(s.seat[1])); if (d < bd && !(v.seated && Math.hypot(q.x - v.x, q.z - v.z) < 2.4)) { bd = d; best = q; } } return best; }
  // Is she sitting at the jigsaw? (a seat within a few feet of its board)
  const atPuzzle = () => v.present && v.seated && v.f === 0 && Math.hypot(v.x - JIGSAW.x, v.z - JIGSAW.z) < 5;
  const anchorOf = s => (s.look ? { x: wx(s.look[0]), y: nav.FLOORS[s.f] + s.look[2], z: wz(s.look[1]) } : null);
  // Begun: the gesture, the hands' anchor, eyes on the work; a book is taken down first
  function startAct(g, s) {
    if (!g.away) return;
    g.away.arrived = true; g.away.at = P.now;
    g.anchorW = anchorOf(s); g.look = g.anchorW; g.lookUntil = g.anchorW ? P.now + 1e6 : 0;
    g.anim = s.pose === 'sip' && !g.hasCup ? null : s.prop === 'book' ? 'reach' : s.pose; g.animUntil = 1e9; g.actAnim = true;
    if (!g.sitting) g.drop = s.drop ?? 0;
    if (s.pose === 'piano' && !musicOn() && audible(g) && dist(g.m, v) < 20) later(1.5, () => { if (g.away?.spot === s && g.sitting && !musicOn()) ctx.sound?.playPhrase?.(); });      // with no record on, he plays (the house piano's own phrase)
    later(2.2 + rnd() * 2, () => { if (g.away?.spot === s && here(g) && !g.engaged && audible(g) && chime(g)) line(g, 'atSpot:' + s.key, { toGuest: false, look: g.anchorW }); });
  }
  // Ended, for whatever reason: the book back on the shelf (or simply away), hands free, up to height
  function endAct(g) {
    g.away = null; g.actAnim = false; g.anim = null; g.anchorW = null; g.lookUntil = 0; g.bookPhase = 0;
    if (g.body.book) g.body.book.visible = false;
    if (!g.sitting) g.drop = 0;
  }
  // The book: up to the shelf for it, read a while, and back up to the shelf with it before going
  function bookTick(g) {
    const a = g.away, s = a?.spot, bk = g.body.book; if (!a?.arrived || s.prop !== 'book' || !bk) return;
    const t = P.now - a.at, left = a.until - P.now;
    if (left < 2.4) { g.anim = 'reach'; if (left < 1.2) bk.visible = false; }
    else if (t < 1.3) { g.anim = 'reach'; bk.visible = t > 1.0; }
    else { g.anim = 'read'; bk.visible = true; }
  }
  function drift(g, s, announce) {
    const go = () => { if (g.away?.spot === s) startAct(g, s); };
    if (s.seat) { const q = seatFor(g, s); if (!q || !sitIn(g, q, -1, go)) return false; }
    else { const at = spotFor(g, s); if (!at || !goTo(g, at.f, at.x, at.z, go)) return false; }
    g.away = { spot: s, until: P.now + 34 + rnd() * 20, arrived: false, room: v.room, f: v.f };
    g.lastDrift = P.now; s.last = P.now; P.events.drifts++;
    if (announce && audible(g) && chime(g, 6)) line(g, 'drift:' + s.key, { expr: 'happy' });
    return true;
  }
  // Something they would like to do on this floor: a weighted choice, nearer things a little likelier, nothing
  // done in the last few minutes, nothing somebody else is already doing there, the fire likelier after dark
  function pickAct(g, f) {
    let tot = 0;
    const night = (ctx.day?.night ?? 0) > 0.4, wt = s => (s.w <= 0 || s.f !== f || (s.playSide && atPuzzle()) || P.now - (s.last ?? -999) < 240 || P.guests.some(o => o !== g && o.away && (o.away.spot.key === s.key || (s.at && o.away.spot.at && Math.hypot(o.away.spot.at[0] - s.at[0], o.away.spot.at[1] - s.at[1]) < 3)))) ? 0
      : s.w * (night && s.night ? s.night : 1) / (1 + Math.hypot(wx((s.at ?? s.seat)[0]) - g.m.x, wz((s.at ?? s.seat)[1]) - g.m.z) / 30);
    for (const s of ACTS[g.id]) tot += wt(s);
    if (tot <= 0) return null;
    let r = rnd() * tot; for (const s of ACTS[g.id]) { r -= wt(s); if (r <= 0 && wt(s) > 0) return s; }
    return null;
  }
  // ---- Empties: a finished cup set down on a real surface, for the staff to clear (cups(), takeCup()) ----------
  // A surface: a table, a counter, a sideboard (a box whose top is 1.7 to 3.4 ft up and no side longer than 6 ft,
  // so not a bed nor a wall), on her floor, within 7 ft, with open floor beside it to stand at, nobody's spot.
  const cupsDown = [];                                                       // { obj, x, y, z, fill }
  function setDown(g) {
    g.setDownAt = P.now + 20;                                                // (nothing suitable: she keeps it, and looks again later)
    const m = g.m, F = nav.FLOORS[m.f]; let best = null, bs = 1e9, bc = -1, px = 0, pz = 0;
    for (const b of ctx.colliders) {
      if (b.off || b.staff || b.y1 - F < 1.7 || b.y1 - F > 3.4 || b.y0 > F + 1 || b.x1 - b.x0 > 6 || b.z1 - b.z0 > 6 || b.x1 - b.x0 < 1.0 || b.z1 - b.z0 < 1.0) continue;      // (a plant's pot is narrower than a table)
      const qx = Math.max(b.x0 + 0.25, Math.min(b.x1 - 0.25, m.x)), qz = Math.max(b.z0 + 0.25, Math.min(b.z1 - 0.25, m.z)), d = Math.hypot(qx - m.x, qz - m.z);
      const bx = (b.x0 + b.x1) / 2, bz = (b.z0 + b.z1) / 2;
      if ((m.f === 0 && Math.min(Math.hypot(bx - JIGSAW.x, bz - JIGSAW.z), Math.hypot(qx - JIGSAW.x, qz - JIGSAW.z)) < 3) || (m.f === 1 && Math.min(Math.hypot(bx - wx(CHESS[0]), bz - wz(CHESS[1])), Math.hypot(qx - wx(CHESS[0]), qz - wz(CHESS[1]))) < 2.4)) continue;      // not on the puzzle, nor among the chessmen
      if (d > 7 || nav.roomAt(qx, F + 1, qz) !== nav.roomAt(m.x, F + 1, m.z) || cupsDown.some(c => Math.hypot(c.x - qx, c.z - qz) < 0.5)) continue;
      const c = nav.nearest(m.f, qx, qz, 2, 1.8, true, c => !taken(g, nav.cx(c), nav.cz(c), 2) && !(v.present && Math.hypot(nav.cx(c) - v.x, nav.cz(c) - v.z) < 3.5)); if (c < 0) continue;
      if (Math.hypot(nav.cx(c) - qx, nav.cz(c) - qz) > 1.8 || !nav.see(m.f, nav.cx(c), nav.cz(c), qx, qz)) continue;
      if (d < bs) { bs = d; best = b; bc = c; px = qx; pz = qz; }
    }
    if (!best) return false;
    const top = best.y1, at = { x: px, y: top + 0.05, z: pz };
    return goTo(g, m.f, nav.cx(bc), nav.cz(bc), () => {
      if (!g.hasCup) return;
      g.anchorW = at; g.look = at; g.lookUntil = P.now + 2; g.anim = 'reach'; g.animUntil = P.now + 1.4;
      later(1.1, () => {
        if (!g.hasCup) return;
        const cup = g.body.cup.clone(); cup.position.set(px, top, pz); cup.rotation.set(0, rnd() * 6.28, 0); cup.visible = true; group.add(cup);
        cupsDown.push({ obj: cup, x: px, y: top, z: pz, fill: 0 });
        g.hasCup = false; g.body.cup.visible = false; g.anchorW = null; g.anim = null; g.wantCoffee = P.now + 90 + rnd() * 90;      // (another, later)
        P.events.cupsDown = (P.events.cupsDown ?? 0) + 1;
      });
    }, 0.8);
  }
  // Geneva and the coffee bar: she goes, makes one, and comes back with a cup
  function coffeeRun(g, announce = true) {
    const s = ACTS.gigi[0], at = spotFor(g, s); if (!at) { g.wantCoffee = P.now + 20; return; }
    if (!goTo(g, at.f, at.x, at.z, () => {
      if (!g.away) return;
      startAct(g, s); g.anim = 'make';
      later(5.6, () => { if (!here(g) || g.away?.spot !== s) return; g.hasCup = true; g.cupFill = 1; g.wantCoffee = 0; g.body.cup.visible = true; g.anim = 'sip'; g.drop = 0.25; if (audible(g)) line(g, 'atSpot:coffee', { toGuest: dist(g.m, v) < 12, expr: 'love' }); });
    })) { g.wantCoffee = P.now + 20; return; }
    g.away = { spot: s, until: P.now + 55 + rnd() * 15, arrived: false, room: v.room, f: v.f, coffee: true };
    g.wantCoffee = P.now + 60; g.lastDrift = P.now; s.last = P.now; P.events.drifts++;      // (if the trip comes to nothing, she tries again in a minute)
    if (announce && audible(g)) line(g, 'coffeeAsk', { expr: 'happy' });
  }
  const audible = g => v.present && !v.outside && v.f === g.m.f && dist(g.m, v) < 26;
  const inSight = g => v.present && v.f === g.m.f && dist(g.m, v) < 22 && nav.see(v.f, v.x, v.z, g.m.x, g.m.z);

  // ---- What a guest does next (about four times a second) ------------------------------------------
  function think(g) {
    if (g.garden) { outThink(g); return; }
    const m = g.m, d = v.present && v.f === m.f ? dist(m, v) : 99, chatting = P.chatWith === g;
    if (!g.sitting && g.seatWant && g.mode === 'idle') { if (g.seatWant.by === g) g.seatWant.by = null; g.seatWant = null; }      // a seat she never reached
    if (g.anim && P.now > g.animUntil && !g.dance) g.anim = null;
    // an activity left behind (sent off elsewhere, stood up, asked to make room): hands free, book away
    if (g.actAnim && (!g.away || (g.away.arrived && (g.mode === 'go' || (g.away.spot.seat && !g.sitting && !g.seatGlide))))) endAct(g);
    // stranded somewhere there is no floor (a plan that fell through on the stair, furniture that arrived late): glide to the nearest good place
    if (g.mode === 'idle' && !g.sitting && !nav.freeAt(m.f, m.x, m.z, 1, true)) {
      if ((g.offFloor += 0.25) > 1) {
        g.offFloor = 0; P.events.rescues++; if (P.rescueLog.length < 40) P.rescueLog.push(`t=${P.now.toFixed(1)} ${g.name} offfloor at ${m.x.toFixed(1)},${m.z.toFixed(1)} f${m.f} y${m.y.toFixed(2)} in ${nav.roomAt(m.x, nav.FLOORS[m.f] + 1, m.z)?.name ?? '-'}`);
        const st = nav.stair;
        if (st && Math.abs(m.x - st.x) < 2.6 && m.z > st.zHi - 1 && m.z < st.zLo + 1) { const up = m.y > (nav.FLOORS[0] + nav.FLOORS[1]) / 2 ? 1 : 0, c = up ? st.hi : st.lo; glide(g, [[st.x, m.y, m.z], [nav.cx(c), nav.FLOORS[up], nav.cz(c)]], () => m.place(nav.cx(c), nav.cz(c), up)); return; }
        const c = nav.nearest(m.f, m.x, m.z, 2, 8, true); if (c >= 0) { glide(g, [[nav.cx(c), nav.FLOORS[m.f], nav.cz(c)]], () => m.place(nav.cx(c), nav.cz(c), m.f)); return; }
      }
    } else g.offFloor = 0;
    // (busy talking or listening: they hold still, unless she has come right up to them and it is not her they are talking to; then a step back first)
    if ((g.engaged || (P.script && P.script.who.includes(g.id))) && !(d < 3.8 && !chatting && !g.sitting && P.now - g.lastBack > 2.5 && !(g.look === v && g.bubble.talking(P.now)))) return;
    if (P.now < (g.holdUntil ?? 0) && v.present && !v.seated && d < 7 && d > 4.4 && P.now - v.movedAt > 0.6) return;      // standing still out of politeness until she moves (but never at her elbow, and not once she has sat down: then they settle too)
    // manners: not too close, and never left standing in a doorway
    if (!g.sitting && d < (chatting ? 2.8 : 4.4) && P.now - g.lastBack > 2.5 && (g.mode === 'idle' || g.dance || m.v < 0.15)) {
      g.lastBack = P.now;
      const a = Math.atan2(m.x - v.x, m.z - v.z), s = politeSpot(g, v.x + Math.sin(a) * (KEEP + 1), v.z + Math.cos(a) * (KEEP + 1), m.f, 3);
      if (s && goTo(g, s.f, s.x, s.z, null, 0.7)) { P.events.backoffs++; return; }
      const s2 = spotNear(g, v.x, v.z, m.f, { facing: true }); if (s2 && dist(s2, v) > d + 0.8 && goTo(g, s2.f, s2.x, s2.z, null, 0.7)) { P.events.backoffs++; return; }
      const s3 = politeSpot(g, m.x, m.z, m.f, 9); if (s3 && goTo(g, s3.f, s3.x, s3.z, null, 0.7)) { P.events.backoffs++; if (g.away) { g.away = null; g.anim = null; g.drop = 0; } return; }      // a small room: anywhere that is not at her elbow
    }
    // two standing in one place (both sent to the same gap): the later one finds another
    if (g.mode === 'idle' && !g.sitting && P.now - g.lastNudge > 3) for (const o of P.guests) if (o !== g && o.i < g.i && here(o) && !o.out && o.m.f === m.f && dist(o.m, m) < 1.6) { g.nudgeAt = P.now; break; }
    if (g.mode === 'idle' && !g.sitting && P.now - g.nudgeAt < 0.6 && P.now - g.lastNudge > 3) {
      g.lastNudge = P.now; P.events.nudges++;
      for (const r of [4.5, 3.2, 6]) { const s = spotNear(g, m.x, m.z, m.f, { r }); if (s && goTo(g, s.f, s.x, s.z, null)) return; }
    }
    if (g.mode === 'idle' && !g.sitting && nearDoor(m.f, m.x, m.z, 2.3)) { const s = politeSpot(g, m.x, m.z, m.f, 6); if (s && goTo(g, s.f, s.x, s.z, null)) return; }
    // nobody is left standing in a hall: it is a way through, not a place to be
    if (g.mode === 'idle' && !g.sitting && !g.dance && inHall(m.f, m.x, m.z) && P.now - (g.hallAt ?? -9) > 3) {
      g.hallAt = P.now;
      const s = (v.present && !v.outside && v.f === m.f && !inHall(v.f, v.x, v.z) ? spotNear(g, v.x, v.z, v.f, { facing: true }) : null) ?? roomSpot(g);
      if (s && goTo(g, s.f, s.x, s.z, null)) return;
    }
    if (g.dance) return;
    if (id_is(g, 'gigi') && g.wantCoffee && !g.hasCup && P.now > g.wantCoffee && !g.away && g.mode === 'idle' && !chatting && m.f === 0) { coffeeRun(g, true); return; }
    // her coffee goes down sip by sip (a couple of minutes, quicker while she is sipping); finished, she puts the cup down on a table
    if (g.hasCup) { g.cupFill = Math.max(0, (g.cupFill ?? 1) - 0.25 / (g.anim === 'sip' ? 60 : 150)); if (g.cupFill <= 0 && !g.out && !g.away && g.mode === 'idle' && !chatting && !g.engaged && P.now > (g.setDownAt ?? 0) && setDown(g)) return; }
    // off enjoying something: stay a while, unless she has gone somewhere else entirely
    if (g.away) {
      const moved = v.present && (v.outside ? P.now - v.outSince > 3 : (v.f !== g.away.f || (v.room !== g.away.room && P.now - v.roomSince > 4)) && !(d < 14 && inSight(g)));
      if (P.now > g.away.until && d < 14 && inSight(g) && g.away.coffee) g.away.until = P.now + 15;       // settled at the coffee bar while she is there too
      if (P.now > g.away.until || (moved && g.away.arrived) || (g.away.spot.playSide && atPuzzle())) endAct(g);      // (her side of the puzzle, when she sits down to it)
      else { bookTick(g); return; }
    }
    if (!v.present || v.outside) {
      if (g.outing && g.mode === 'idle') { g.outing = false; g.badExit = g.exit?.d; g.badUntil = P.now + 30; }      // a trip to the door that was given up on the way
      if (v.present && v.outside && P.now < (g.noRoom ?? 0)) {             // no room for one more out there: wait just inside the door, looking out
        const e = g.exit; if (e && g.mode === 'idle' && Math.hypot(m.x - e.ix, m.z - e.iz) > 3.5) { const s = politeSpot(g, e.ix, e.iz, 0, 4); if (s) goTo(g, 0, s.x, s.z, null, 0.8); }
        return;
      }
      if (v.present && v.outside && P.now - v.outSince > 3.5 + g.i * 2.5 && !g.outing && g.mode !== 'glide' && g.mode !== 'knock') {      // out we go too
        goOut(g);
        if (g.outing && !P.saidWait && P.now - v.outSince < 20) { P.saidWait = true; const t = brain.say(g.id, herDeck() >= 0 ? 'goOutPorch' : 'waitOutside'); say(g, t, { toGuest: false }); note(`${g.C.short}: “${t}”`); }
        if (g.outing) return;
      }
      // (wandering off to their own pleasures, but not the moment she steps out: they are coming too)
      if (g.mode === 'idle' && P.now > g.nextAct && (!v.present || P.now - v.outSince > 40)) { g.nextAct = P.now + 30 + rnd() * 30; const s = pickAct(g, m.f); if (s && s.key !== 'coffee') { drift(g, s, false); if (g.away) g.away.until = P.now + 40; } }
      return;
    }
    // company: follow when she has gone somewhere else
    const sees = d < 30 && nav.see(v.f, v.x, v.z, m.x, m.z);
    const stale = g.mode === 'go' && m.goal && (m.goal.f !== v.f || Math.hypot(m.goal.x - v.x, m.goal.z - v.z) > 11 || Math.hypot(m.goal.x - v.x, m.goal.z - v.z) < 3.4);
    const sameRoom = v.room && nav.roomAt(m.x, nav.FLOORS[m.f] + 1, m.z)?.name === v.room;
    if (g.sitting && v.f === m.f && (sameRoom ? d < 30 : d < 13 && sees)) { g.followSince = 0; if (P.now > g.nextAct && !chatting) { g.nextAct = P.now + 14 + rnd() * 14; if (rnd() < 0.5) { g.anim = g.id === 'feyn' ? 'drum' : g.id === 'nano' ? 'type' : g.hasCup ? 'sip' : 'hair'; g.animUntil = P.now + 3 + rnd() * 2; } } return; }      // comfortable where they are
    if (m.f !== v.f || d > 15 || (!sees && d > 7)) {
      if (!g.followSince) g.followSince = P.now;
      // she is standing at the foot (or the head) of the stair: no use arriving on top of her, so wait at the other end a little
      const st = nav.stair, end = st && m.f !== v.f ? (v.f ? st.hi : st.lo) : -1, atEnd = end >= 0 && Math.hypot(nav.cx(end) - v.x, nav.cz(end) - v.z) < 5.5 && P.now - g.followSince < 14;
      if (!atEnd && P.now - g.followSince > g.lag + (g.sitting ? 6 : 0) && (g.mode === 'idle' || stale) && (P.now - v.movedAt > 0.5 || d > 20)) {
        const s = spotNear(g, v.x, v.z, v.f, { facing: true });
        if (s && goTo(g, s.f, s.x, s.z, () => { g.look = v; g.lookUntil = P.now + 3; })) {
          P.events.follows++; g.drop = 0;
          if (v.f === 1 && m.f === 0 && !g.saidUp) { g.saidUp = true; if (P.now - (P.saidUpAt ?? -99) > 25 && chime(g)) { P.saidUpAt = P.now; line(g, 'upstairs', { toGuest: false, secs: 3.2 }); P.lastFollowSay = P.now; } }      // (one of them remarks on the stair, not a chorus)
          else if (P.now - P.lastFollowSay > 45 && d < 40 && rnd() < 0.6 && chime(g)) { P.lastFollowSay = P.now; line(g, 'follow', { toGuest: false, secs: 2.8 }); }
        } else { g.followSince = P.now - g.lag + 1.5; g.lastStatus = s ? 'nogo' : 'nospot'; }        // nowhere to stand just now: look again shortly
      }
      return;
    }
    g.followSince = 0;
    if (stale && !onStair(g)) { m.stop(); g.mode = 'idle'; }
    if (g.mode !== 'idle') return;
    // settled near her
    // she has sat down: they settle too, in a seat nearby if there is one, else standing at ease a comfortable way off
    if (!g.sitting && !chatting && !g.dance && P.now > (g.nextSeat ?? 0) && P.now - v.movedAt > 2 && P.now - v.roomSince > 4) { g.nextSeat = P.now + (v.seated ? 3 + rnd() * 3 : 10 + rnd() * 10); if (takeSeat(g)) return; }
    if (v.seated && !g.sitting && d < 5.2 && P.now - g.lastBack > 4) { g.lastBack = P.now; const s = politeSpot(g, v.x + (m.x - v.x) / Math.max(d, 0.1) * 6.2, v.z + (m.z - v.z) / Math.max(d, 0.1) * 6.2, m.f, 3) ?? spotNear(g, v.x, v.z, m.f, { facing: true }); if (s && dist(s, v) > d + 0.5 && goTo(g, s.f, s.x, s.z, null, 0.6)) { P.events.backoffs++; return; } }
    if (!g.sitting) g.drop += ((v.seated && d < 12 ? 0.55 : 0) - g.drop) * 0.3;
    if (v.seated && P.now - P.saidSeat > 90 && d < 12 && rnd() < 0.3 && chime(g)) { P.saidSeat = P.now; line(g, 'seated', { toGuest: true }); return; }
    if (P.now < g.nextAct || chatting) return;
    g.nextAct = P.now + 11 + rnd() * 12;
    const roll = rnd();
    // off to something they like, now and then: never more than two of them away at once, so there is always company
    let awayN = 0; for (const o of P.guests) if (o.away) awayN++;
    const settled = P.now - v.roomSince > 22 && P.now - P.lastInput > 14 && awayN < 2 && P.now - g.lastDrift > 90;
    if (roll < 0.38 && settled) { const s = pickAct(g, v.f); if (s && drift(g, s, true)) return; }
    if (roll < 0.55) { g.anim = g.id === 'feyn' ? 'drum' : g.id === 'nano' ? 'type' : g.hasCup ? 'sip' : 'hair'; g.animUntil = P.now + 3 + rnd() * 2; }
    else if (roll < 0.72 && d > 7.5) { const s = spotNear(g, v.x, v.z, v.f, { facing: true }); if (s && dist(s, m) > 2.5) goTo(g, s.f, s.x, s.z, null, 0.7); }
  }

  // ---- Going round people: the plan of the house knows the furniture, not who is standing about ----
  // Most of what used to wedge a guest was somebody in the way who was not going to move: a robot
  // pondering at the head of the stair, Barty greeting in the hall, a friend standing in the one
  // gap, her. Waiting it out at their elbow is rude and gets nowhere. So after a moment of being
  // held up, plan the trip again with everyone who is standing about marked as furniture for the
  // length of that one search (their cells are put back at once), and take the way round if there
  // is one. If there is none (the hall is too narrow), give up the trip, step back and try later.
  const DET_C = new Int32Array(2048), DET_W = new Uint8Array(2048);
  function planAround(g, f, x, z) {
    const m = g.m, F = nav.floors[m.f], walk = F.walk, st = nav.stair; let n = 0;
    const mark = (px, pz, r) => {
      if (Math.hypot(px - m.x, pz - m.z) > 30 || Math.hypot(px - x, pz - z) < r * 0.8) return;      // (nobody far off, nor whoever is standing on the very spot we want)
      for (let dz = -r; dz <= r; dz += nav.CELL) for (let dx = -r; dx <= r; dx += nav.CELL) {
        if (dx * dx + dz * dz > r * r || n >= DET_C.length) continue;
        const c = nav.cellOf(px + dx, pz + dz); if (c < 0 || !walk[c] || (st && (c === st.lo || c === st.hi))) continue;
        DET_C[n] = c; DET_W[n] = walk[c]; walk[c] = 0; n++;
      }
    };
    const H = staff()?.H;
    if (H) { for (const a of H.robots) if (a.f === m.f) mark(a.x, a.z, botR(a) + g.spec.radius + 0.25); const rb = H.roomba; if (rb && rb.f === m.f) mark(rb.x, rb.z, 1.3); }
    for (const o of P.guests) if (o !== g && o.state !== 'away' && !o.out && o.m.f === m.f && (o.mode !== 'go' || o.m.v < 0.3 || o.i < g.i)) mark(o.m.x, o.m.z, 1.8);
    if (v.present && v.f === m.f && !v.outside) mark(v.x, v.z, 2.6);
    let ok = false;
    try { ok = plan(m, f, x, z); } finally { for (let i = n - 1; i >= 0; i--) walk[DET_C[i]] = DET_W[i]; }
    return ok;
  }
  // Held up on the way: plan again round whoever it is
  function pathAround(g) {
    const m = g.m, goal = m.goal; if (!goal) return false;
    const oldPath = m.path, oldI = m.i;
    if (!planAround(g, goal.f, goal.x, goal.z)) { m.path = oldPath; m.i = oldI; m.goal = goal; return false; }
    P.events.detours = (P.events.detours ?? 0) + 1;
    return true;
  }
  // Give up a trip politely: stand, and think again shortly
  function giveWay(g, secs = 2.5) {
    const m = g.m;
    // turned back by her three times in a few seconds (a corner with her at the mouth of it): stop trying, and simply stand a while
    if (g.why === 'her') { g.herRun = P.now - (g.herGaveAt ?? -9) < 4 ? (g.herRun ?? 0) + 1 : 1; g.herGaveAt = P.now; if (g.herRun >= 3) { g.herRun = 0; g.holdUntil = P.now + 7; } } m.stop(); g.mode = 'idle'; g.onArrive = null; g.followSince = P.now + secs - g.lag; g.lastBack = -9; g.stuckT = 0;
    if (g.dance) g.danceReady = true; if (g.away && !g.away.arrived) g.away = null;
    if (g.state === 'leaving') { g.mode = 'farewell'; g.waitUntil = P.now + secs; }
    P.events.gaveway = (P.events.gaveway ?? 0) + 1;
  }

  // Walking but getting nowhere for six seconds (wedged against furniture, a plan that cannot be followed):
  // glide to the nearest open floor that is not at her elbow, and think again
  function watchdog(g) {
    const m = g.m;
    if (g.mode !== 'go' || g.engaged || g.out || onStair(g) || Math.hypot(m.x - g.px, m.z - g.pz) > 0.3) { g.px = m.x; g.pz = m.z; g.stuckT = 0; return; }
    if ((g.stuckT += 0.25) < 6) return;
    // standing on open floor: give the trip up and think again (a glide would pass through the furniture)
    if (nav.freeAt(m.f, m.x, m.z, 1, true)) { P.events.stuck = (P.events.stuck ?? 0) + 1; if (P.rescueLog.length < 40) P.rescueLog.push(`t=${P.now.toFixed(1)} ${g.name} gave up a trip that went nowhere at ${m.x.toFixed(1)},${m.z.toFixed(1)} f${m.f}`); giveWay(g, 1.5); return; }
    rescue(g, 'stuck');
  }
  function rescue(g, why = '') {
    const m = g.m;
    g.stuckT = 0; g.cornered = 0; P.events.rescues++;
    if (P.rescueLog.length < 40) P.rescueLog.push(`t=${P.now.toFixed(1)} ${g.name} ${why} ${g.state}/${g.mode} at ${m.x.toFixed(1)},${m.z.toFixed(1)} f${m.f} in ${nav.roomAt(m.x, nav.FLOORS[m.f] + 1, m.z)?.name ?? '-'}, held up by ${g.why || 'nothing'}`);      // (for the logic test)
    const F = nav.floors[m.f], c = nav.nearest(m.f, m.x, m.z, 2, 7, true, c => F.clear[c] >= 3 && !(v.present && v.f === m.f && Math.hypot(nav.cx(c) - v.x, nav.cz(c) - v.z) < 4.6) && !taken(g, nav.cx(c), nav.cz(c), 2));
    m.stop(); g.onArrive = null; if (g.away && !g.away.arrived) g.away = null; if (g.dance) g.danceReady = true;
    if (c < 0) { g.mode = g.state === 'leaving' ? 'farewell' : 'idle'; g.waitUntil = P.now + 1; return; }
    const x = nav.cx(c), z = nav.cz(c), f = m.f;
    glide(g, [[x, nav.FLOORS[f], z]], () => { m.place(x, z, f); if (g.state === 'leaving') { g.mode = 'farewell'; g.waitUntil = P.now + 0.3; } });
  }

  // ---- Overheard: conversations among themselves, and passing remarks ---------------------------
  function groupLife() {
    const S = P.script;
    if (S) {
      if (P.now < S.nextAt) return;
      const l = S.lines[S.i++];
      if (!l) { P.script = null; P.nextBanter = P.now + 40 + rnd() * 40; return; }
      const g = P.byId[l.who], other = P.byId[S.lines[S.i]?.who ?? S.lines[S.i - 2]?.who] ?? null;
      if (!g || !here(g) || (v.present && dist(g.m, v) > 40)) { P.script = null; P.nextBanter = P.now + 30; return; }
      const dur = say(g, l.text, { toGuest: false, look: other && other !== g ? other.m : null, secs: Math.min(6.5, 2.2 + l.text.length * 0.05) });
      g.engagedUntil = P.now + dur;
      for (const id of S.who) { const o = P.byId[id]; if (o && o !== g) { o.look = g.m; o.lookUntil = P.now + dur + 1; o.engagedUntil = Math.max(o.engagedUntil, P.now + dur * 0.8); } }
      S.nextAt = P.now + Math.min(6, 1.9 + l.text.length * 0.05);      // (time to read it: the next speaker's bubble takes its place)
      return;
    }
    if (P.now < P.nextGroup) return;
    P.nextGroup = P.now + 0.5;
    let talking = false; for (const g of P.guests) if (g.bubble.talking(P.now)) talking = true;
    const quiet = P.now - P.lastInput > 10 && P.danceUntil < P.now && !talking && !(P.chatWith && ui?.chat.open);      // their own talk waits while you are in a conversation
    if (P.now > P.nextBanter && quiet) {
      P.nextBanter = P.now + 6;
      let n = 0; for (const g of P.guests) if (here(g) && !g.away && g.mode === 'idle' && inSight(g)) n++;
      if (n >= 2) {
        const ids = P.guests.filter(g => here(g) && !g.away && g.mode === 'idle' && inSight(g)).map(g => g.id), s = brain.banter(ids);
        if (s) { P.script = { who: s.who, lines: s.lines, i: 0, nextAt: P.now + 0.4 }; P.events.banters++; P.nextSolo = Math.max(P.nextSolo, P.now + 20); }
      }
      return;
    }
    if (P.now > P.nextSolo && quiet) {
      P.nextSolo = P.now + 16 + rnd() * 16;
      let pick = null, n = 0; for (const g of P.guests) if (here(g) && !g.engaged && !g.dance && inSight(g) && g.greeted && P.now - (g.lastLine ?? -99) > 12 && rnd() < 1 / ++n) pick = g;
      if (!pick) return;
      const H = staff()?.H;
      if (H && P.now - P.lastStaffSay > 70) for (const a of [...H.robots, H.roomba]) {
        const key = a?.key ?? (a === H.roomba ? 'reggie' : null);
        if (a && key && pick.C.staffNear[key] && P.now - (pick.staffSaid[key] ?? -999) > 240 && a.f === pick.m.f && Math.hypot(a.x - pick.m.x, a.z - pick.m.z) < 9) { P.lastStaffSay = P.now; pick.staffSaid[key] = P.now; P.events.solos++; line(pick, 'staffNear:' + key, { toGuest: false, look: a }); return; }
      }
      P.events.solos++; line(pick, 'idle', { toGuest: false });
    }
  }

  // ---- One guest, one frame -------------------------------------------------------------------------
  function update(g, dt, draw) {
    const m = g.m, b = g.body;
    if (g.state === 'coming') { if (P.now >= g.arriveAt) arrive(g); return; }
    if (g.state === 'away') return;
    // deciding
    if (P.now >= g.thinkAt && (here(g) || g.state === 'leaving')) { g.thinkAt = P.now + 0.25; if (here(g)) think(g); watchdog(g); }
    // moving
    if (g.mode === 'glide') {
      const p = g.gl[g.gi], dx = p[0] - m.x, dz = p[2] - m.z, L = Math.hypot(dx, dz), step = g.spec.speed * 1.05 * (g.glK ?? 1) * dt;
      m.face(Math.atan2(dx, dz), dt * 1.6);
      // out of doors the glides do not see each other: somebody just ahead on the same path, wait a moment (the later of two gives way, and never for long)
      let hold = false;
      if (g.out && L > 0.01 && (g.glHold ?? 0) < 3) for (const o of P.guests) { if (o === g || o.state === 'away' || (o.mode === 'glide' && o.i > g.i)) continue; const ox = o.m.x - m.x, oz = o.m.z - m.z, od = Math.hypot(ox, oz); if (od < 1.5 && (ox * dx + oz * dz) / L > 0.3 && Math.abs(o.m.y - m.y) < 2) { hold = true; break; } }
      if (hold) { g.glHold = (g.glHold ?? 0) + dt; m.v = 0; } else { m.v = step / Math.max(dt, 1e-3);
      if (L <= step) { m.x = p[0]; m.z = p[2]; m.y = p[1]; if (++g.gi >= g.gl.length) { g.mode = 'idle'; const f = g.glThen; g.glThen = null; f?.(); } }
      else { m.x += dx / L * step; m.z += dz / L * step; m.y += (p[1] - m.y) * Math.min(1, step / L); }
      }
    } else if (g.mode === 'knock' || g.mode === 'farewell') {
      if (v.present && (g.mode === 'farewell' || (here(g) && v.outside && Math.hypot(v.x - m.x, v.z - m.z) < 20))) m.faceTo(v.x, v.z, dt * 1.4);      // (waiting at a door to go out: looking out at her)
      if (P.now >= g.waitUntil) { if (g.mode === 'knock') { const f = g.glThen; g.glThen = null; g.mode = 'idle'; f?.(); } else { g.mode = 'idle'; headOut(g); } }
    } else if (g.engaged && g.state === 'here' && !(g.mode === 'go' && onStair(g))) {      // (nobody stops on the stair to chat)
      m.v = Math.max(0, m.v - dt * 3);
      const lk = P.now < g.lookUntil && g.look ? g.look : v; m.faceTo(lk.x, lk.z, dt * 1.7);
    } else if (g.mode === 'go') {
      const s = m.update(dt, g.speedK); g.lastStatus = s;
      // her standing in the way is not something to wait out at her elbow: give up the trip and ease back (think() does that)
      // held up by somebody: after a moment, the way round them; failing that, give the trip up and try again later
      // held up just off the foot (or head) of the stair, where the plan has no floor: a step off it onto open floor, then on
      if (s === 'waiting' && m.blockedFor > 0.6 && g.why !== 'stair' && !nav.freeAt(m.f, m.x, m.z, 1, true) && nav.stair && Math.min(Math.hypot(m.x - nav.cx(nav.stair.lo), m.z - nav.cz(nav.stair.lo)), Math.hypot(m.x - nav.cx(nav.stair.hi), m.z - nav.cz(nav.stair.hi))) < 2.6) {
        const c = nav.nearest(m.f, m.x, m.z, 2, 3, true, c => !taken(g, nav.cx(c), nav.cz(c), 1.6) && !(v.present && Math.hypot(nav.cx(c) - v.x, nav.cz(c) - v.z) < 2.5));
        if (c >= 0) { const goal = m.goal, cb = g.onArrive, x = nav.cx(c), z = nav.cz(c), f = m.f; P.events.stairSteps = (P.events.stairSteps ?? 0) + 1; glide(g, [[x, nav.FLOORS[f], z]], () => { m.place(x, z, f); if (goal) goTo(g, goal.f, goal.x, goal.z, cb); }); }
      } else if (s === 'waiting' && g.why === 'stair') { m.blockedFor = 0; if ((g.stairWait = (g.stairWait ?? 0) + dt) > 15) { g.stairWait = 0; giveWay(g, 2); } }      // taking turns on the stair: no detours, just wait
      else if (s === 'waiting' && m.blockedFor > (g.why === 'her' ? 0.45 : 0.8) && !onStair(g) && P.now - (g.detourAt ?? -9) > 1.2) {
        g.detourAt = P.now;
        // (nearly there, and somebody is standing on the spot: this is close enough; round them twice and still held up: later)
        // (and her at arm's length in the way is not something to walk round: step back instead; think() does that)
        const herClose = g.why === 'her' && Math.hypot(v.x - m.x, v.z - m.z) < 4.6;
        if (herClose || m.remaining() < 2.2 || ++g.stall > 3 || (!pathAround(g) && (g.why === 'her' || g.stall >= 2))) giveWay(g, g.why === 'her' ? 3 : 2.5);
      }
      if (s === 'arrived') { g.mode = 'idle'; const f = g.onArrive; g.onArrive = null; f?.(); }
      else if (s === 'failed' || s === 'idle') {
        if (--g.tries <= 0 || !m.goal || !plan(m, m.goal.f, m.goal.x, m.goal.z)) { m.stop(); g.mode = 'idle'; g.onArrive = null; P.events.fails++; if (g.dance) g.danceReady = true; if (g.away && !g.away.arrived) g.away = null; if (g.state === 'leaving') { if (++g.leaveTries > 8) { note(`${g.C.short} slips out.`); gone(g); } else if (g.leaveTries % 2 === 0) rescue(g, 'leaving'); else { g.mode = 'farewell'; g.waitUntil = P.now + 1.5; } } }
      }
    } else {
      m.v = Math.max(0, m.v - dt * 4);
      if (g.dance && g.danceReady && v.present) m.faceTo(v.x, v.z, dt * 1.2);
      else if (P.now < g.lookUntil && g.look) m.faceTo(g.look.x, g.look.z, dt * 0.9);
      else if (g.away?.arrived && g.anchorW) m.faceTo(g.anchorW.x, g.anchorW.z, dt * 0.9);                     // back to what they were doing
      else if (g.gSeat) m.face(g.gSeat.yaw, dt * 1.2);                                                           // sat on a garden bench, the way it faces
      else if (g.sitting && g.seat && P.chatWith !== g) m.face(g.seat.yaw, dt * 1.2);                                // sat the way the chair faces
      else if (here(g) && !g.away && v.present && (g.garden ? v.outside : (v.f === m.f && !v.outside) || (v.outside && P.now < (g.noRoom ?? 0)))) m.faceTo(v.x, v.z, dt * 0.35);          // drifting round to keep her in view
    }
    // a body she cannot walk through; pressed against, it glides aside
    const r = g.spec.radius;
    g.box.x0 = m.x - r; g.box.x1 = m.x + r; g.box.z0 = m.z - r; g.box.z1 = m.z + r; g.box.y0 = m.y + 0.6; g.box.y1 = m.y + g.spec.hover + 0.8;
    // stepping out of her way: someone standing in the line she is walking moves aside before she arrives
    if (here(g) && !g.sitting && !g.out && v.present && v.f === m.f && v.speed > 1.5 && (g.mode === 'idle' || g.engaged) && g.mode !== 'glide' && P.now - (g.lastYield ?? -9) > 1.3 && !onStair(g)) {
      const rx = m.x - v.x, rz = m.z - v.z, ahead = rx * v.dx + rz * v.dz, lat = rx * v.dz - rz * v.dx;
      if (ahead > 0.3 && ahead < 8 && Math.abs(lat) < 1.9) {
        g.lastYield = P.now;
        const s0 = Math.sign(lat) || g.sideSign; let done = false;
        for (const sgn of [s0, -s0]) { for (const k of [3.2, 2.4, 4.2]) { const x = m.x + v.dz * sgn * k, z = m.z - v.dx * sgn * k; if (nav.freeAt(m.f, x, z, 2, true) && !taken(g, x, z, 1.6) && goTo(g, m.f, x, z, null, 1.7)) { done = true; break; } } if (done) break; }
        if (done) P.events.yields = (P.events.yields ?? 0) + 1;
      }
    }
    if (here(g) && !g.sitting && !g.out && v.present && Math.abs(v.y - m.y) < 3) {
      const dx = m.x - v.x, dz = m.z - v.z, d = Math.hypot(dx, dz), want = r + 1.12;
      if (d < want && d > 1e-3) { const step = Math.min(want - d, dt * 2.5), x = m.x + dx / d * step, z = m.z + dz / d * step; if (nav.freeAt(m.f, x, z, 2, true)) { m.x = x; m.z = z; P.events.glides++; } }
    }
    if (here(g) && !g.sitting && !g.out) {
      for (const o of P.guests) if (o !== g && o.i < g.i && !o.out && o.state !== 'away' && o.m.f === m.f) easeOff(g, o.m.x, o.m.z, 2.1, dt);
      const H = staff()?.H; if (H) for (const a of H.robots) if (a.f === m.f) easeOff(g, a.x, a.z, 2.1, dt);
    }
    g.inter.x = m.x; g.inter.z = m.z; g.inter.y = here(g) ? m.y + g.spec.hover - g.dropNow : -1000;
    b.root.position.set(m.x, m.y, m.z);
    if (!draw) return;
    pose(g, dt);
  }

  // Two bodies in the same place: this one eases away (if there is floor to ease onto)
  function easeOff(g, ox, oz, want, dt) {
    const m = g.m, dx = m.x - ox, dz = m.z - oz, d = Math.hypot(dx, dz);
    if (d >= want) return;
    const step = Math.min(want - d, dt * 2.2), ux = d > 0.05 ? dx / d : Math.cos(g.i * 2.4), uz = d > 0.05 ? dz / d : Math.sin(g.i * 2.4);
    if (nav.freeAt(m.f, m.x + ux * step, m.z + uz * step, 2, true)) { m.x += ux * step; m.z += uz * step; }
    else if (nav.freeAt(m.f, m.x - uz * step, m.z + ux * step, 2, true)) { m.x -= uz * step; m.z += ux * step; }
    else if (nav.freeAt(m.f, m.x + uz * step, m.z - ux * step, 2, true)) { m.x += uz * step; m.z -= ux * step; }
  }

  // ---- How it looks: bobbing, hands, faces, dancing ---------------------------------------------
  // What the hands are doing, in order: the dance; the task in hand (unless talking pulls them off it);
  // talking (a small vocabulary of gestures, changed every second or two, keyed loosely to the line);
  // listening; sitting; carrying a cup; and when there is nothing else, an idle stance that changes now and then.
  // Every target goes through bodies.js handPose and is eased towards, never snapped to.
  const FAST = new Set(['type', 'drum', 'piano', 'draw', 'knock', 'wave', 'make']), WORK = new Set(['type', 'draw', 'piano', 'read', 'lean', 'browse', 'make']);
  const TALK_OVER = new Set(['type', 'draw', 'piano', 'reach', 'warm', 'browse', 'lean', 'make', 'behind', 'chin', 'hair', 'drum']);      // (put down for a word with her)
  const ANCHORED = new Set(['type', 'draw', 'piano', 'reach', 'lean']);
  const IDLE = { feyn: ['rest', 'hips', 'behind', 'rest'], gigi: ['rest', 'clasp', 'rest', 'hips'], nano: ['rest', 'behind', 'clasp', 'rest'] };
  const LISTEN = { feyn: 'chin', gigi: 'clasp', nano: 'clasp' };
  const HP = new Float32Array(8), tmpV = new THREE.Vector3(), tmpCup = new THREE.Vector3();
  function pose(g, dt) {
    const m = g.m, b = g.body, t = P.now, ph = g.i * 2.1 + 1, S = g.spec;
    const dancing = g.dance && g.danceReady && g.mode !== 'go';
    const beat = P.beat, bi = Math.floor(beat), bf = beat - bi, k = P.feel;
    g.dropNow += (g.drop - g.dropNow) * Math.min(1, dt * 1.5);
    let by = S.hover - g.dropNow + 0.06 * Math.sin(t * 1.5 + ph), bx = 0, lean = 0, spinAim = 0, tilt = 0;
    const hl = b.hands[0], hr = b.hands[1], rl = hl.userData.rest, rr = hr.userData.rest;
    let lx, ly, lz, rx, ry, rz, tl = 0, tr = 0, rate = 8, gest = null;
    const talking = g.bubble.talking(t);
    const anim = dancing ? 'dance' : g.anim;
    if (anim === 'dance') {
      const hop = Math.abs(Math.sin(Math.PI * beat)); rate = 16;
      if (g.id === 'feyn') {                                  // a samba: sway, hop, hands on the drums
        bx = 0.2 * Math.sin(Math.PI * beat); by += 0.1 * hop * k; lean = 0.13 * k * Math.sin(Math.PI * beat);
        handPose(b, 'drum', t, beat, null, HP, 0); lx = HP[0]; ly = HP[1]; lz = HP[2]; rx = HP[3]; ry = HP[4]; rz = HP[5];
      } else if (g.id === 'gigi') {                           // twirls, arms up, swaying in turn
        by += 0.14 * hop * k; spinAim = (bi % 8 < 4 ? (bi % 4 + smooth(bf)) / 4 : 0) * Math.PI * 2; lean = 0.08 * Math.sin(Math.PI * beat);
        lx = rl[0] - 0.1; ly = 0.42 + 0.14 * Math.sin(Math.PI * beat); lz = 0.1; rx = rr[0] + 0.1; ry = 0.42 - 0.14 * Math.sin(Math.PI * beat); rz = 0.1;
      } else {                                                // the robot: square moves on the beat, stepping down like a loss curve
        const q = bi % 4, snap = Math.min(1, bf * (k < 0.7 ? 2.5 : 5));          // (to a slow record the moves ease into place instead of snapping)
        by += (-0.07 * (q + snap - 1) + (q === 0 ? 0.21 * (1 - snap) - 0.07 : 0) + 0.07) * k; spinAim = (q === 0 ? -0.5 : q === 2 ? 0.5 : 0) * k;
        const up = q % 2 === 0; lx = rl[0]; rx = rr[0];
        ly = up ? 0.3 : -0.2; lz = up ? 0.12 : 0.5; ry = up ? -0.2 : 0.3; rz = up ? 0.5 : 0.12;
      }
      if (bi !== g.lastBeat) { g.lastBeat = bi; if (g.id === 'feyn' && !musicOn() && inEar(g)) ctx.sound?.note?.(bi % 4 === 2 ? 52 : 45, 0, 0.14, 0.03); }
    } else {
      gest = anim === 'bow' ? 'hair' : anim;
      if (talking && (!gest || TALK_OVER.has(gest) || gest === 'sip')) {
        if (t > (g.gestNext ?? 0)) { const set = g.talkSet ?? TALK_SETS[4]; g.gestI = ((g.gestI ?? -1) + 1) % set.length; g.gest = set[g.gestI]; g.gestNext = t + 1.3 + rnd() * 1.3; }
        gest = gest === 'read' ? 'holdbook' : g.gest;
      } else if (gest === 'read' && g.engaged) gest = 'holdbook';
      else if (!gest && g.engaged) gest = LISTEN[g.id];
      if (!gest) {
        if (g.sitting) gest = 'sit';
        else { if (t > (g.idleNext ?? 0)) { const set = IDLE[g.id]; g.idleGest = set[Math.floor(rnd() * set.length)]; g.idleNext = t + 9 + rnd() * 10; } gest = g.idleGest ?? 'rest'; }
      }
      let a = null;
      if (g.anchorW && ANCHORED.has(gest) && !(talking && TALK_OVER.has(anim))) {        // the keys, the board, the shelf: into the body's own frame
        b.root.position.set(m.x, m.y, m.z); b.root.rotation.y = m.yaw + g.spin; b.bob.position.y = by; b.root.updateMatrixWorld(true);
        a = b.bob.worldToLocal(tmpV.set(g.anchorW.x, g.anchorW.y, g.anchorW.z));
        const L = Math.hypot(a.x, a.y, a.z), max = gest === 'draw' || gest === 'reach' ? 1.75 : 1.35; if (L > max) a.multiplyScalar(max / L);       // (out of reach: as far as a hand goes; a little further up a board or a shelf)
      }
      handPose(b, gest, t, beat, a, HP, g.i * 1.7);
      lx = HP[0]; ly = HP[1]; lz = HP[2]; rx = HP[3]; ry = HP[4]; rz = HP[5]; tl = HP[6]; tr = HP[7];
      if (g.hasCup && gest !== 'sip' && gest !== 'make' && gest !== 'carry') { handPose(b, 'carry', t, beat, null, HP, 0); rx = HP[3]; ry = HP[4]; rz = HP[5]; tr = 0; }    // the coffee stays in her hand
      if (FAST.has(gest)) rate = 22;
      if (WORK.has(gest)) tilt = 0.1;                                                    // leaning in to it
      if (gest === 'lean' || gest === 'browse') tilt = 0.22;
    }
    // eased: nothing snaps from one pose to the next
    const e = 1 - Math.exp(-dt * rate);
    hl.position.x += (lx - hl.position.x) * e; hl.position.y += (ly - hl.position.y) * e; hl.position.z += (lz - hl.position.z) * e;
    hr.position.x += (rx - hr.position.x) * e; hr.position.y += (ry - hr.position.y) * e; hr.position.z += (rz - hr.position.z) * e;
    hl.rotation.x += (tl - hl.rotation.x) * e; hr.rotation.x += (tr - hr.rotation.x) * e;
    if (g.spin - spinAim > Math.PI) g.spin -= Math.PI * 2;
    g.spin += (spinAim - g.spin) * Math.min(1, dt * (g.id === 'nano' ? 12 : 9));
    if (!dancing && Math.abs(g.spin) < 0.002) g.spin = 0;
    const yaw = m.yaw + g.spin;
    b.root.rotation.y = yaw;
    const dyaw = m.yaw - g.lastYaw, turn = Math.atan2(Math.sin(dyaw), Math.cos(dyaw)) / Math.max(dt, 1e-3); g.lastYaw = m.yaw;
    b.bob.position.y = by; b.bob.position.x += (bx - b.bob.position.x) * Math.min(1, dt * 10);
    b.bob.rotation.x += (Math.min(0.22, m.v * 0.05 + tilt) - b.bob.rotation.x) * Math.min(1, dt * 3);
    b.bob.rotation.z += (Math.max(-0.14, Math.min(0.14, -turn * 0.05 + lean)) - b.bob.rotation.z) * Math.min(1, dt * (dancing ? 10 : 3));
    b.ring.scale.setScalar(1 + 0.08 * Math.sin(dancing ? Math.PI * 2 * beat : t * 3 + ph));
    b.ring.material.opacity = 0.85 - g.dropNow * 0.5;
    // face
    let look = 0;
    if (v.present && v.f === m.f) { let a = Math.atan2(v.x - m.x, v.z - m.z) - yaw; a = Math.atan2(Math.sin(a), Math.cos(a)); if (Math.abs(a) < 1.4) look = Math.max(-1, Math.min(1, a * 1.2)); }
    g.blinkAt -= dt; const blink = g.blinkAt < 0; if (g.blinkAt < -0.13) g.blinkAt = 2.5 + rnd() * 4;
    const expr = t < g.exprUntil ? g.expr : dancing ? (g.id === 'gigi' ? 'love' : 'happy') : WORK.has(gest) ? 'focus' : gest === 'sip' || gest === 'warm' ? 'happy' : P.chatWith === g ? 'happy' : 'neutral';
    b.face.draw(expr, look, blink);
  }
  const smooth = x => x * x * (3 - 2 * x);
  const inEar = g => v.present && Math.hypot(g.m.x - v.x, g.m.z - v.z) < 25;

  // ---- The visitor ----------------------------------------------------------------------------------
  function watch() {
    const w = ctx.walker, present = !!w && (ctx.mode === 'walk' || !!ctx.forcePresent);
    v.present = present; if (!present) return;
    v.x = w.pos.x; v.y = w.pos.y; v.z = w.pos.z; v.f = nav.floorOf(w.pos.y + 0.5);
    v.fx = -Math.sin(w.yaw); v.fz = -Math.cos(w.yaw); v.seated = !!w.seated;
    { const ddx = v.x - (v.px ?? v.x), ddz = v.z - (v.pz ?? v.z), L = Math.hypot(ddx, ddz), sp = L / Math.max(P.dt, 1e-3); v.speed = (v.speed ?? 0) * 0.8 + sp * 0.2; if (L > 1e-4 && sp > 0.5) { v.dx = ddx / L; v.dz = ddz / L; } v.px = v.x; v.pz = v.z; }
    if (Math.hypot(v.x - v.lx, v.z - v.lz) > 0.5) { v.lx = v.x; v.lz = v.z; v.movedAt = P.now; }
    if (P.now < P.nextWatch) return;
    P.nextWatch = P.now + 0.2;
    const room = nav.roomAt(v.x, v.y + 0.5, v.z)?.name ?? null, outside = !room || /terrace|front porch|screened porch/i.test(room);
    if (outside !== v.outside) { v.outside = outside; if (outside) { v.outSince = P.now; P.saidWait = false; for (const g of P.guests) g.noRoom = 0; } else { v.inSince = P.now; if (P.now - v.outSince > 25 && !P.guests.some(g => g.garden)) welcomeBack(); } }
    if (room !== v.room) { v.room = room; v.roomSince = P.now; }
  }
  function welcomeBack() { later(2.5, () => { let best = null, bd = 30; for (const g of P.guests) if (here(g) && !g.engaged && g.m.f === v.f && dist(g.m, v) < bd) { bd = dist(g.m, v); best = g; } if (best && !v.outside) line(best, 'welcomeBack', { expr: 'happy' }); }); }

  // ---- One step of the party ---------------------------------------------------------------------
  const head = new THREE.Vector3();
  // The beat goes on in one clock for everybody; its tempo eases to the record's, so the steps never jump
  function beatTick(dt) {
    if ((P.tuneAt -= dt) <= 0) {
      P.tuneAt = 1;
      const on = musicOn(), title = on ? ctx.sound.nowPlaying() : '';
      if (title !== P.tune) {
        P.tune = title; P.bpmAim = BPM; P.feelAim = 1;
        if (title) { const T = tempoFor(title, ctx.sound?.nowTrack?.()?.bpm); P.bpmAim = T.bpm; P.feelAim = T.feel; }
      }
    }
    P.bpm += (P.bpmAim - P.bpm) * Math.min(1, dt * 1.5); P.feel += (P.feelAim - P.feel) * Math.min(1, dt * 1.5);
    P.beat += dt * P.bpm / 60;
  }
  function step(dt, draw) {
    P.dt = dt; P.now += dt;
    if (P.danceUntil) beatTick(dt);
    watch();
    if (ownNav && (navTimer -= dt) <= 0) { navTimer = 1.5; const sig = `${ctx.colliders.length}|${scene.children.length}`; if (sig !== navSig) { navSig = sig; nav.rebuild(group); P.door = null; findDoor(); } }
    for (let i = P.queue.length - 1; i >= 0; i--) if (P.queue[i].t <= P.now) { const q = P.queue[i]; P.queue.splice(i, 1); q.fn(); }
    let any = false;
    const cam = camera.position;
    for (const g of P.guests) {
      if (g.state !== 'away') any = true;
      const near = draw && g.state !== 'away' && g.state !== 'coming' && Math.abs(cam.y - g.m.y - 3) < 9 && Math.hypot(cam.x - g.m.x, cam.z - g.m.z) < 70;
      update(g, dt, near);
      if (g.state !== 'away' && g.state !== 'coming') g.body.root.visible = near || !draw;
    }
    if (P.danceUntil) { let near = !v.present; for (const g of P.guests) if (g.dance && g.m.f === v.f && dist(g.m, v) < 34) near = true; if (P.now > P.danceUntil || !near) stopDance(); }
    if (P.danceUntil > P.now && P.now > P.nextHum && !musicOn()) { P.nextHum = P.now + 7 + rnd() * 4; let n = 0, pick = null; for (const g of P.guests) if (g.dance && g.danceReady && !g.bubble.talking(P.now) && g !== P.lastHum && rnd() < 1 / ++n) pick = g; if (pick) { P.lastHum = pick; line(pick, 'hum', { toGuest: false, secs: 2.6, expr: 'happy', log: false }); } }      // (taking turns to keep the beat going)
    if (any) groupLife();
    doorTick();
    // The conversation fades when she walks away: further than about twelve feet, or turned well away from
    // them, the card dims as she goes, and after a moment's grace (in case she was only glancing round)
    // the talk is let go, politely: the card fades out, their line fades, nobody calls after her.
    if (P.chatWith) {
      const g = P.chatWith, d = v.present && v.f === g.m.f ? dist(g.m, v) : 99;
      if (!here(g) && g.state !== 'leaving') { ui?.chat.hide(true, true); P.chatWith = null; }
      else {
        const dot = d < 99 && d > 0.1 ? ((g.m.x - v.x) * v.fx + (g.m.z - v.z) * v.fz) / d : -1, gone = d > 12 || (d > 3 && dot < 0.2);      // (0.2: nearly eighty degrees off to one side)
        P.walkOff = gone ? P.walkOff + dt : Math.max(0, P.walkOff - dt * 2);
        ui?.chat.fade(Math.min(1 - P.walkOff / 2.2, d < 99 ? 1 - Math.max(0, d - 10) / 6 : 0));
        if (P.walkOff > 2.2 || d > 16) {
          P.walkOff = 0; P.chatWith = null; ui?.chat.hide(true, true); ui?.relock?.();
          g.bubble.until = Math.min(g.bubble.until, P.now + (d < 12 && dot > 0.2 ? 1.5 : 0.2)); g.engagedUntil = Math.min(g.engagedUntil, P.now + 1); g.expr = 'happy'; g.exprUntil = P.now + 2;
        }
      }
    } else P.walkOff = 0;
    if (!any && !P.queue.length && !P.closeDoorAt) P.active = false;
    if (!draw || headless) return;
    const show = ctx.mode === 'walk' || P.demo, cf = nav.floorOf(cam.y - 4);
    for (const g of P.guests) {
      if (g.state === 'away' || g.state === 'coming') { if (g.bubble.shown) bubbles.place(g.bubble, head, P.now, false); continue; }
      head.set(g.m.x, g.m.y + g.body.top + 0.35 - g.dropNow, g.m.z);
      // bubbles fade with distance (full to fourteen feet, gone by thirty), and are not seen through walls or behind her (bubbles.js drops those behind the camera)
      const dc = Math.hypot(head.x - cam.x, head.z - cam.z), vis = show && dc < 30 && (P.demo || (g.out ? cf === 0 : g.m.f === cf && nav.see(cf, cam.x, cam.z, head.x, head.z)));
      bubbles.place(g.bubble, head, P.now, vis);
      if (g.bubble.el) { const op = P.demo ? 1 : Math.round(Math.max(0.15, Math.min(1, (30 - dc) / 16)) * 20) / 20; if (op !== g.bOp) { g.bOp = op; g.bubble.el.style.opacity = op; } }
    }
  }

  // ---- Posed for a photograph (test hooks; see friends.js) ------------------------------------------
  const dir = new THREE.Vector3();
  // kind 'live': posed the same way, but then left to the real party (to see a conversation, and walking away from it)
  function stage(kind, ids = ORDER, text = '') {
    P.demo = kind !== 'live'; P.active = true; if (!P.door) findDoor();
    camera.getWorldDirection(dir); const L = Math.hypot(dir.x, dir.z) || 1, ux = dir.x / L, uz = dir.z / L, rx = -uz, rz = ux, cam = camera.position;
    const f = nav.floorOf(cam.y - 4), F = nav.FLOORS[f];
    const places = ids.length === 1 ? [[7.5, 0.4]] : ids.length === 2 ? [[8, -1.9], [8.4, 2.0]] : [[8.6, -3.4], [9.6, 0.2], [8.2, 3.5]];
    ids.forEach((id, n) => {
      const g = P.byId[id] ?? (P.byId[id] = makeGuest(id, ORDER.indexOf(id))); if (!P.guests.includes(g)) P.guests.push(g);
      const [fwd, side] = places[n], x = cam.x + ux * fwd + rx * side, z = cam.z + uz * fwd + rz * side;
      g.state = 'here'; g.out = false; g.m.place(x, z, f); g.m.y = F; g.m.yaw = Math.atan2(cam.x - x, cam.z - z); g.body.root.visible = true; g.greeted = true; P.been.add(id);
      g.mode = P.demo ? 'demo' : 'idle'; g.thinkAt = P.demo ? 1e9 : 0; g.lastLine = P.now;
    });
    const G = id => P.byId[id], sayD = (id, t, expr) => { const g = G(id); if (!g || !ids.includes(id)) return; g.bubble.say(t, 1e6, P.now); g.expr = expr; g.exprUntil = 1e9; };
    if (kind === 'dance') { for (const id of ids) { const g = G(id); g.dance = true; g.danceReady = true; g.mode = 'idle'; } P.danceUntil = 1e9; sayD('gigi', 'Dance break! Twirl with me. No thoughts, just twirl.', 'love'); }
    else if (kind === 'chat') {
      const g = G(ids[0]); P.v.present = true; ctx.forcePresent = true; watch();
      talkTo(g, true);
      if (text) { const r = sayTo(g, text); for (let i = 0; i < 400; i++) { P.now += 0.05; for (let k = P.queue.length - 1; k >= 0; k--) if (P.queue[k].t <= P.now) { const q = P.queue[k]; P.queue.splice(k, 1); q.fn(); } } g.bubble.until = 1e9; g.exprUntil = 1e9; void r; }      // (only the one you are talking with has a bubble up)
    } else if (kind === 'live') {
      P.v.present = true; ctx.forcePresent = true; watch(); P.lastInput = P.now;
      const g = G(ids[0]); g.greeted = true; talkTo(g, true); if (text) sayTo(g, text);
    } else {
      // one speaker at a time, even for the photograph: the others smile and wait their turn
      const first = ids.includes('gigi') ? 'gigi' : ids[0];
      if (first === 'feyn') sayD('feyn', 'Hello, hello! What a house. I want to know how everything in it works. Do not tell me.', 'happy');
      if (first === 'gigi') sayD('gigi', 'Hiii! Okay, first of all, you look amazing. Second of all, where is the coffee?', 'love');
      if (first === 'nano') sayD('nano', 'Hi! Ok wow, this place is super nice. Somebody tuned these hyperparameters by hand.', 'happy');
      for (const id of ids) if (id !== first) { const o = G(id); o.expr = 'happy'; o.exprUntil = 1e9; }
      const k = G('gigi'); if (k && ids.includes('gigi') && kind === 'coffee') { k.hasCup = true; k.body.cup.visible = true; k.anim = 'sip'; k.animUntil = 1e9; }
      const fy = G('feyn'); if (fy && ids.includes('feyn') && kind === 'coffee') { fy.anim = 'drum'; fy.animUntil = 1e9; }
      const nn = G('nano'); if (nn && ids.includes('nano') && kind === 'coffee') { nn.anim = 'type'; nn.animUntil = 1e9; }
    }
  }
  function demoStep(dt) {
    P.dt = dt; P.now += dt; beatTick(dt);
    const cam = camera.position, cf = nav.floorOf(cam.y - 4);
    for (const g of P.guests) {
      if (g.state !== 'here') continue;
      g.body.root.position.set(g.m.x, g.m.y, g.m.z); pose(g, dt);
      g.inter.x = g.m.x; g.inter.z = g.m.z; g.inter.y = g.m.y + g.spec.hover;
      head.set(g.m.x, g.m.y + g.body.top + 0.35, g.m.z); bubbles.place(g.bubble, head, P.now, g.m.f === cf);
    }
  }

  // ---- Running ---------------------------------------------------------------------------------------
  function tick(t, dt) {
    if (!P.active) return;
    if (P.demo) { demoStep(Math.min(dt, 0.05)); return; }
    step(Math.min(dt, 0.05), !headless);
  }
  if (!headless) ctx.animated.push(tick);

  const api = {
    P, brain, nav, nearDoor, ring, sendHome, talkTo: id => talkTo(P.byId[id]), sayTo: (id, text) => sayTo(P.byId[id], text), startDance, stopDance, stage, coffeeRun: () => P.byId.gigi && coffeeRun(P.byId.gigi),
    step: (dt = 1 / 30, draw = false) => { if (P.active) step(dt, draw); },
    list: () => ORDER.map(id => { const g = P.byId[id], C = CAST[id]; return { id, name: C.name, short: C.short, tag: C.tag, status: !g || g.state === 'away' ? 'away' : g.state === 'here' ? 'here' : g.state === 'leaving' ? 'leaving' : 'coming', been: P.been.has(id) }; }),
    status: () => P.guests.map(g => ({ who: g.name, state: g.state, mode: g.mode, x: +g.m.x.toFixed(1), z: +g.m.z.toFixed(1), f: g.m.f, room: nav.roomAt(g.m.x, nav.FLOORS[g.m.f] + 1, g.m.z)?.name ?? '-', away: g.away?.spot.key ?? '', dance: g.dance, said: g.bubble.text, where: (g.out ? (g.crossing ? 'crossing' : onDeck(g) ? 'porch' : 'lawn') : '') + (g.gSeat || g.sitting ? ' seated' : '') })),
    // For the logic test: is anybody inside a wall or a piece of furniture?
    check() {
      const bad = [];
      for (const g of P.guests) {
        if (g.state !== 'here' || g.mode === 'demo' || g.sitting || g.seatGlide || g.gSeat || (g.gSeatWant && Math.hypot(g.m.x - g.gSeatWant.x, g.m.z - g.gSeatWant.z) < 1.6) || (g.gSeatLeft && P.now - g.gSeatLeftAt < 3 && Math.hypot(g.m.x - g.gSeatLeft.x, g.m.z - g.gSeatLeft.z) < 1.6)) continue;      // (on a bench, or getting into or up out of one)      // a seat is inside its chair's box: that is the point of it
        const F = nav.FLOORS[g.m.f], x = g.m.x, z = g.m.z;
        const stairs = nav.stair && Math.abs(x - nav.stair.x) < 2.2 && z > nav.stair.zHi - 1.5 && z < nav.stair.zLo + 1.5;
        if (stairs) continue;
        const hit = ctx.colliders.find(c => !c.off && !c.staff && c.y0 < F + 4.6 && c.y1 > F + 0.15 && x > c.x0 + 0.02 && x < c.x1 - 0.02 && z > c.z0 + 0.02 && z < c.z1 - 0.02);
        if (hit) bad.push({ who: g.name, x: +x.toFixed(2), z: +z.toFixed(2), f: g.m.f, mode: g.mode, box: hit });
      }
      return bad;
    },
    cost: () => Object.fromEntries(P.guests.map(g => [g.id, costOf(g.body.root)])),
    deck: () => { if (!deck) buildDeck(); return { ...deck, DK, dcx, dcz }; },      // for the logic test
    // The guests' cups, for the staff to clear: the one in Geneva's hand (empty once she has drunk it) and any she has
    // set down. { x, y, z (world feet, the cup's base), f (how full, 0..1), outside, obj (the THREE object), empty, held }
    cups() {
      const out = [];
      const k = P.byId.gigi;
      if (k && k.hasCup && k.state !== 'away') { k.body.cup.getWorldPosition(tmpCup); out.push({ x: tmpCup.x, y: tmpCup.y, z: tmpCup.z, f: k.cupFill ?? 1, outside: !!k.out, obj: k.body.cup, empty: (k.cupFill ?? 1) <= 0, held: true }); }
      for (const c of cupsDown) out.push({ x: c.x, y: c.y, z: c.z, f: c.fill, outside: false, obj: c.obj, empty: true, held: false });
      return out;
    },
    // Take one away (a robot clearing it): from the table, or (if it is the one she holds) out of her hand
    takeCup(cup) {
      const obj = cup?.obj ?? cup, k = P.byId.gigi;
      if (k && obj === k.body.cup) { if (!k.hasCup) return false; k.hasCup = false; k.body.cup.visible = false; k.cupFill = 0; if (k.anim === 'sip') k.anim = null; return true; }
      const i = cupsDown.findIndex(c => c.obj === obj); if (i < 0) return false;
      group.remove(obj); cupsDown.splice(i, 1); return true;
    },
    // For the logic test: every activity against the furniture as it stands. Somewhere to stand (on open floor
    // within a foot or so of its mark, nobody's body inside anything) or its seat; what they attend to within
    // reach (horizontally 0.4 to 3 ft off) and not through a wall.
    // For screenshots (friends.js ?friends=act:feyn:chalkboard): a guest already at an activity, the party live.
    // Returns where they are, so the camera can be put in front of them.
    stageAct(id, key) {
      const s = ACTS[id]?.find(a => a.key === key); if (!s) return null;
      if (!P.door) findDoor(); P.active = true; ctx.forcePresent = true; watch();
      const g = P.byId[id] ?? (P.byId[id] = makeGuest(id, ORDER.indexOf(id))); if (!P.guests.includes(g)) P.guests.push(g);
      g.state = 'here'; g.out = false; g.body.root.visible = true; g.greeted = true; P.been.add(id); g.mode = 'idle'; g.thinkAt = 0;
      if (s.seat) { const q = seatFor(g, s); if (!q) return null; g.m.place(q.x, q.z, q.f); g.sitting = true; g.seat = q; q.by = g; g.seatAccess = { x: q.x, z: q.z, f: q.f }; g.m.yaw = q.yaw; const tall = g.spec.tall ?? 1; g.drop = g.dropNow = Math.max(0, g.spec.hover - (q.top - nav.FLOORS[q.f]) - (g.body.R * g.body.bs[1] * tall + 0.08)); }
      else { const at = spotFor(g, s); if (!at) return null; g.m.place(at.x, at.z, at.f); const a = anchorOf(s); if (a) g.m.yaw = Math.atan2(a.x - at.x, a.z - at.z); }
      if (id === 'gigi' && (s.pose === 'sip' || s.key === 'sofa')) { g.hasCup = true; g.body.cup.visible = true; }
      g.away = { spot: s, until: P.now + 1e6, arrived: false, room: v.room, f: s.f }; startAct(g, s); g.dropNow = g.drop;
      return { x: g.m.x, y: nav.FLOORS[g.m.f], z: g.m.z, yaw: g.m.yaw, f: g.m.f };
    },
    checkActs() {
      const out = [];
      for (const id of ORDER) for (const s of ACTS[id]) {
        const F = nav.FLOORS[s.f], a = anchorOf(s), r = { who: id, key: s.key, ok: true, why: '' };
        let x, z;
        if (s.seat) { let q = null, bd = 1.6; for (const o of SEATS) { const d = Math.hypot(o.x - wx(s.seat[0]), o.z - wz(s.seat[1])); if (o.f === s.f && d < bd) { bd = d; q = o; } } if (!q) { r.ok = false; r.why = 'no seat there'; out.push(r); continue; } if (nav.nearest(q.f, q.x, q.z, 2, 3.4, true) < 0) { r.ok = false; r.why = 'no floor beside the seat'; } x = q.x; z = q.z; }
        else {
          const c = nav.nearest(s.f, wx(s.at[0]), wz(s.at[1]), 2, 1.3, true); if (c < 0) { r.ok = false; r.why = 'nowhere to stand within 1.3 ft of the mark'; out.push(r); continue; }
          x = nav.cx(c); z = nav.cz(c); r.moved = +Math.hypot(x - wx(s.at[0]), z - wz(s.at[1])).toFixed(2);
          const R = 0.7, hit = ctx.colliders.find(b => !b.off && !b.staff && b.y0 < F + 4.6 && b.y1 > F + 0.6 && x + R > b.x0 && x - R < b.x1 && z + R > b.z0 && z - R < b.z1 && !(b.x1 - b.x0 < 0.6 && b.z1 - b.z0 < 0.6 && b.y1 - b.y0 < 0.5));
          if (hit) { r.ok = false; r.why = `body inside a box x ${hit.x0.toFixed(1)}..${hit.x1.toFixed(1)} z ${hit.z0.toFixed(1)}..${hit.z1.toFixed(1)}`; }
        }
        if (a) {
          const h = Math.hypot(a.x - x, a.z - z); r.reach = +h.toFixed(2);
          const touch = !['chin', 'behind', 'warm', 'sip'].includes(s.pose), far = !touch ? 5.0 : s.pose === 'lean' ? 3.3 : 3.0;      // (hands on it, or only looking at it; leaning over the backs of chairs reaches a little further)
          if (h < 0.4 || h > far) { r.ok = false; r.why += ` what they attend to is ${h.toFixed(1)} ft off`; }
          const u = Math.max(0, (h - 0.6) / Math.max(h, 1e-3)); if (!nav.see(s.f, x, z, x + (a.x - x) * u, z + (a.z - z) * u)) { r.ok = false; r.why += ' a wall between'; }
        }
        out.push(r);
      }
      return out;
    },
  };
  if (typeof window !== 'undefined') window.__friends = api;
  return api;
}
