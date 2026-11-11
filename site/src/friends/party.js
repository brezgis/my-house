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
import { buildGuest, useThreeBodies, costOf } from './bodies.js';
import { makeBrain, CAST, ORDER } from './brain.js';

const PLAN_W = 43.33, wx = X => X - PLAN_W / 2, wz = Y => -Y;
const KEEP = 5.6;                      // a polite distance, feet
const PORCH_Y = 1.45, BPM = 97;        // the porch floor; the tempo of the house's own tune
// Things they like, in plan feet: where to stand, what to look at, which floor
const SPOTS = {
  feyn: [{ key: 'chalkboard', at: [26.9, 26.2], look: [26.9, 22.8], f: 0, anim: 'draw' }, { key: 'piano', at: [13.2, 23.6], look: [15.4, 25.5], f: 0, anim: 'drum' }, { key: 'globe', at: [7.4, 21.6], look: [4.7, 21.0], f: 1, anim: 'reach' }],
  gigi: [{ key: 'coffee', at: [34.6, 19.9], look: [36.6, 17.6], f: 0, anim: 'make' }, { key: 'sofa', at: [9.4, 14.6], look: [5.6, 17.8], f: 0, anim: 'sip', settle: 0.7 }],
  nano: [{ key: 'desk', at: [25.2, 35.6], look: [25.0, 38.4], f: 0, anim: 'type' }, { key: 'imac', at: [22.6, 28.6], look: [20.8, 30.0], f: 0, anim: 'type' }, { key: 'shelves', at: [15.6, 3.6], look: [16.4, 0.5], f: 0, anim: 'reach' }, { key: 'library', at: [10.5, 20.5], look: [8.6, 17.6], f: 1, anim: 'reach' }],
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
    now: 0, dt: 1 / 60, active: false, guests: [], byId: {}, queue: [], notes: [], brain, nav, demo: false,
    v: { present: false, x: 0, y: 0, z: 0, f: 0, fx: 0, fz: -1, room: null, roomSince: 0, outside: false, outSince: 0, seated: false, movedAt: 0, lx: 0, lz: 0 },
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
    if (v.present && v.f === self.m.f) { const dv = Math.hypot(v.x - x, v.z - z); if (dv < 2.3 && dv < Math.hypot(v.x - self.m.x, v.z - self.m.z) + 0.2) return true; }      // (stepping away from her is always allowed)
    for (const g of P.guests) {
      if (g === self || g.state === 'away' || g.out || g.m.f !== self.m.f || Math.hypot(g.m.x - x, g.m.z - z) >= 1.5) continue;
      if (g.mode === 'go' && g.i > self.i) continue;                          // two on the move: the later arrival gives way (and is eased aside, below)
      if (g.mode !== 'go') g.nudgeAt = P.now;                                  // standing in the way: would you mind?
      return true;
    }
    const H = staff()?.H;
    if (H) for (const a of H.robots) if (a.f === self.m.f && Math.hypot(a.x - x, a.z - z) < 1.6) return true;
    return false;
  }
  const later = (secs, fn) => { P.queue.push({ t: P.now + secs, fn }); };

  // A place to stand near (cx, cz): five to six feet off, in the open, out of doorways, in
  // sight, not on top of anybody, and preferably to one side of where she is facing.
  function spotNear(g, cx, cz, f, o = {}) {
    const F = nav.floors[f], base = o.facing ? Math.atan2(v.fx, v.fz) : Math.atan2(g.m.x - cx, g.m.z - cz);
    let best = null, bs = -1e9;
    for (const [minClear, see, radii] of [[4.2, true, [KEEP, 6.6, 5.1]], [3.2, true, [KEEP, 7.4, 5.0]], [2.6, false, [6.5, 8.5, 5.0]]]) {
      for (let k = 0; k < 16; k++) for (const r of radii) {
        const a = base + (k / 16) * Math.PI * 2, x = cx + Math.sin(a) * (o.r ?? r), z = cz + Math.cos(a) * (o.r ?? r), c = nav.cellOf(x, z);
        if (c < 0 || !nav.free(f, c, 2, true) || F.door[c] >= 0 || F.clear[c] < minClear) continue;
        if (nearDoor(f, x, z, 2.6) || taken(g, x, z, 3.1)) continue;
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
      inter: { x: 0, y: -1000, z: 0, reach: 8, label: () => (P.chatWith === g && !ui?.chat.resting ? `say something to ${C.short}` : `talk to ${C.short}`), act: () => talkTo(g) },
    };
    m.avoid = (x, z) => blocked(g, x, z);
    m.onDoor = d => { if (d === P.door) { openDoor(); closeDoorSoon(4); } else if (!d.isOpen) { d.isOpen = true; d.stop.off = true; P.events.doors++; } };
    ctx.colliders.push(g.box); ctx.interact.push(g.inter);
    Object.defineProperty(g, 'engaged', { get: () => P.now < g.engagedUntil || (P.chatWith === g && !ui?.chat.resting) });
    return g;
  }
  function say(g, text, { expr = null, secs = null, toGuest = true, look = null, log = true } = {}) {
    if (!text) return 0;
    const dur = Math.max(secs ?? 0, Math.min(15, 2.6 + text.length * 0.075));      // as bubbles.js: long enough to read
    g.bubble.say(text, dur, P.now);
    g.expr = expr ?? (/!/.test(text) ? 'happy' : /\?$/.test(text) ? 'surprised' : 'neutral'); g.exprUntil = P.now + Math.min(6, 1.5 + text.length * 0.05);
    P.events.lines++;
    const d = v.present && v.f === g.m.f ? dist(g.m, v) : 99;
    if (toGuest && d < 16) { g.engagedUntil = Math.max(g.engagedUntil, P.now + dur); g.look = v; g.lookUntil = P.now + dur; }
    else if (look) { g.look = look; g.lookUntil = P.now + dur; g.engagedUntil = Math.max(g.engagedUntil, P.now + Math.min(dur, 3)); }
    if (d < 22 && !headless) { const k = 0.05 / (1 + (d / 10) ** 2); spec_chirp(g, k); }
    if (log && ui?.chat.open && P.chatWith && d < 30) ui.chat.add('them', g.name, text);
    return dur;
  }
  function spec_chirp(g, k) { const n = g.spec.chirp; for (let i = 0; i < n.length; i++) ctx.sound?.note?.(n[i], i * 0.075, 0.22, k); }
  const line = (g, pool, opts, vars) => say(g, brain.say(g.id, pool, vars), opts);

  function goTo(g, f, x, z, onArrive = null, speedK = 1) {
    if (g.out || g.mode === 'glide' || (g.mode === 'go' && onStair(g))) return false;
    if (!g.m.goTo(f, x, z)) { P.events.fails++; return false; }
    g.mode = 'go'; g.onArrive = onArrive; g.tries = 3; g.speedK = speedK; return true;
  }
  function glide(g, pts, then) { g.gl = pts; g.gi = 0; g.glThen = then; g.mode = 'glide'; g.m.stop(); }

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
    glide(g, [[x, PORCH_Y, 2.1]], () => {
      // knock, wait for the door, come in
      g.bubble.say('*knock knock*', 1.6, P.now); ctx.sound?.note?.(45, 0, 0.12, 0.09); ctx.sound?.note?.(45, 0.22, 0.12, 0.09); ctx.sound?.note?.(45, 0.44, 0.12, 0.07);
      g.waitUntil = P.now + (P.door?.isOpen ? 0.5 : 1.3);
      const enter = () => {
        const to = doorwayBusy(g) ? null : landing(g);
        if (!to) {                                                                              // somebody in the doorway: wait on the step
          if (!g.askedRoom && v.present && Math.hypot(v.x - x, v.z) < 4.5 && P.now - g.arriveAt > 6) { g.askedRoom = true; g.bubble.say('*knock knock* Room for one more?', 4, P.now); if (P.now - P.lastRoomNote > 40) { P.lastRoomNote = P.now; note('Somebody is on the step. Make a little room by the door.'); } }
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
    g.state = 'away'; g.out = false; g.crossing = false; g.atDoor = false; g.mode = 'idle'; g.body.root.visible = false; g.bubble.quiet(); g.box.y0 = -100; g.box.y1 = -99; g.inter.y = -1000; g.m.stop();
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
    P.chatWith = g; P.lastInput = P.now; g.engagedUntil = P.now + 2.5; g.look = v; g.lookUntil = P.now + 6; g.expr = 'happy'; g.exprUntil = P.now + 2.5;
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
  function spotFor(g, s) { const c = nav.nearest(s.f, wx(s.at[0]), wz(s.at[1]), 2, 5, true, c => !taken(g, nav.cx(c), nav.cz(c), 2.4)); return c < 0 ? null : { x: nav.cx(c), z: nav.cz(c), f: s.f }; }
  function drift(g, s, announce) {
    const at = spotFor(g, s); if (!at) return false;
    const lookAt = { x: wx(s.look[0]), z: wz(s.look[1]) };
    if (!goTo(g, at.f, at.x, at.z, () => {
      if (!g.away) return;
      g.away.arrived = true; g.look = lookAt; g.lookUntil = P.now + 30; g.anim = s.anim === 'sip' && !g.hasCup ? null : s.anim; g.animUntil = P.now + 5; g.drop = s.settle ?? 0;
      later(2.2 + rnd() * 2, () => { if (g.away?.spot === s && here(g) && !g.engaged && audible(g)) line(g, 'atSpot:' + s.key, { toGuest: false, look: lookAt }); });
    })) return false;
    g.away = { spot: s, until: P.now + 34 + rnd() * 16, arrived: false, room: v.room, f: v.f };
    g.lastDrift = P.now; s.last = P.now; P.events.drifts++;
    if (announce && audible(g)) line(g, 'drift:' + s.key, { expr: 'happy' });
    return true;
  }
  // Gigi and the coffee bar: she goes, "makes" one, and comes back with a cup
  function coffeeRun(g, announce = true) {
    const s = SPOTS.gigi[0], at = spotFor(g, s); if (!at) { g.wantCoffee = P.now + 20; return; }
    const machine = { x: wx(s.look[0]), z: wz(s.look[1]) };
    if (!goTo(g, at.f, at.x, at.z, () => {
      if (!g.away) return;
      g.away.arrived = true; g.look = machine; g.lookUntil = P.now + 8; g.anim = 'make'; g.animUntil = P.now + 5.5;
      later(5.6, () => { if (!here(g)) return; g.hasCup = true; g.body.cup.visible = true; g.anim = 'sip'; g.animUntil = P.now + 3; g.drop = 0.25; if (audible(g)) line(g, 'atSpot:coffee', { toGuest: dist(g.m, v) < 12, expr: 'love' }); });
    })) { g.wantCoffee = P.now + 20; return; }
    g.away = { spot: s, until: P.now + 55 + rnd() * 15, arrived: false, room: v.room, f: v.f, coffee: true };
    g.wantCoffee = 0; g.lastDrift = P.now; s.last = P.now; P.events.drifts++;
    if (announce && audible(g)) line(g, 'coffeeAsk', { expr: 'happy' });
  }
  const audible = g => v.present && !v.outside && v.f === g.m.f && dist(g.m, v) < 26;
  const inSight = g => v.present && v.f === g.m.f && dist(g.m, v) < 22 && nav.see(v.f, v.x, v.z, g.m.x, g.m.z);

  // ---- What a guest does next (about four times a second) ------------------------------------------
  function think(g) {
    const m = g.m, d = v.present && v.f === m.f ? dist(m, v) : 99, chatting = P.chatWith === g;
    if (g.anim && P.now > g.animUntil && !g.dance) g.anim = null;
    // stranded somewhere there is no floor (a plan that fell through on the stair, furniture that arrived late): glide to the nearest good place
    if (g.mode === 'idle' && !nav.freeAt(m.f, m.x, m.z, 1, true)) {
      if ((g.offFloor += 0.25) > 1) {
        g.offFloor = 0; P.events.rescues++;
        const st = nav.stair;
        if (st && Math.abs(m.x - st.x) < 2.6 && m.z > st.zHi - 1 && m.z < st.zLo + 1) { const up = m.y > (nav.FLOORS[0] + nav.FLOORS[1]) / 2 ? 1 : 0, c = up ? st.hi : st.lo; glide(g, [[st.x, m.y, m.z], [nav.cx(c), nav.FLOORS[up], nav.cz(c)]], () => m.place(nav.cx(c), nav.cz(c), up)); return; }
        const c = nav.nearest(m.f, m.x, m.z, 2, 8, true); if (c >= 0) { glide(g, [[nav.cx(c), nav.FLOORS[m.f], nav.cz(c)]], () => m.place(nav.cx(c), nav.cz(c), m.f)); return; }
      }
    } else g.offFloor = 0;
    if (g.engaged || (P.script && P.script.who.includes(g.id))) return;
    // manners: not too close, and never left standing in a doorway
    if (d < (chatting ? 2.8 : 4.4) && P.now - g.lastBack > 2.5 && (g.mode === 'idle' || g.dance || m.v < 0.15)) {
      g.lastBack = P.now;
      const a = Math.atan2(m.x - v.x, m.z - v.z), s = politeSpot(g, v.x + Math.sin(a) * (KEEP + 1), v.z + Math.cos(a) * (KEEP + 1), m.f, 3);
      if (s && goTo(g, s.f, s.x, s.z, null, 0.7)) { P.events.backoffs++; return; }
      const s2 = spotNear(g, v.x, v.z, m.f, { facing: true }); if (s2 && dist(s2, v) > d + 0.8 && goTo(g, s2.f, s2.x, s2.z, null, 0.7)) { P.events.backoffs++; return; }
    }
    if (g.mode === 'idle' && P.now - g.nudgeAt < 0.6 && P.now - g.lastNudge > 3) {
      g.lastNudge = P.now; P.events.nudges++;
      for (const r of [4.5, 3.2, 6]) { const s = spotNear(g, m.x, m.z, m.f, { r }); if (s && goTo(g, s.f, s.x, s.z, null)) return; }
    }
    if (g.mode === 'idle' && nearDoor(m.f, m.x, m.z, 2.3)) { const s = politeSpot(g, m.x, m.z, m.f, 6); if (s && goTo(g, s.f, s.x, s.z, null)) return; }
    if (g.dance) return;
    if (id_is(g, 'gigi') && g.wantCoffee && P.now > g.wantCoffee && !g.away && g.mode === 'idle' && !chatting && m.f === 0) { coffeeRun(g, true); return; }
    // off enjoying something: stay a while, unless she has gone somewhere else entirely
    if (g.away) {
      const moved = v.present && !v.outside && (v.f !== g.away.f || (v.room !== g.away.room && P.now - v.roomSince > 4)) && !(d < 14 && inSight(g));
      if (P.now > g.away.until && d < 14 && inSight(g) && g.away.coffee) g.away.until = P.now + 15;       // settled at the coffee bar while she is there too
      if (P.now > g.away.until || (moved && g.away.arrived)) { g.away = null; g.drop = 0; g.anim = null; }
      else return;
    }
    if (!v.present || v.outside) {
      if (v.present && v.outside && !P.saidWait && P.now - v.outSince > 1.5 && P.now - v.outSince < 12) { P.saidWait = true; const t = brain.say(g.id, 'waitOutside'); say(g, t, { toGuest: false }); note(`${g.C.short}: “${t}”`); }
      if (g.mode === 'idle' && P.now > g.nextAct) { g.nextAct = P.now + 30 + rnd() * 30; const list = SPOTS[g.id].filter(s => s.f === m.f); const s = list[Math.floor(rnd() * list.length)]; if (s) { drift(g, s, false); if (g.away) g.away.until = P.now + 40; } }
      return;
    }
    // company: follow when she has gone somewhere else
    const sees = d < 30 && nav.see(v.f, v.x, v.z, m.x, m.z);
    const stale = g.mode === 'go' && m.goal && (m.goal.f !== v.f || Math.hypot(m.goal.x - v.x, m.goal.z - v.z) > 11 || Math.hypot(m.goal.x - v.x, m.goal.z - v.z) < 3.4);
    if (m.f !== v.f || d > 15 || (!sees && d > 7)) {
      if (!g.followSince) g.followSince = P.now;
      if (P.now - g.followSince > g.lag && (g.mode === 'idle' || stale) && (P.now - v.movedAt > 0.5 || d > 20)) {
        const s = spotNear(g, v.x, v.z, v.f, { facing: true });
        if (s && goTo(g, s.f, s.x, s.z, () => { g.look = v; g.lookUntil = P.now + 3; })) {
          P.events.follows++; g.drop = 0;
          if (v.f === 1 && m.f === 0 && !g.saidUp) { g.saidUp = true; line(g, 'upstairs', { toGuest: false, secs: 3.2 }); P.lastFollowSay = P.now; }
          else if (P.now - P.lastFollowSay > 45 && d < 40 && rnd() < 0.6) { P.lastFollowSay = P.now; line(g, 'follow', { toGuest: false, secs: 2.8 }); }
        } else g.followSince = P.now - g.lag + 1.5;        // nowhere to stand just now: look again shortly
      }
      return;
    }
    g.followSince = 0;
    if (stale && !onStair(g)) { m.stop(); g.mode = 'idle'; }
    if (g.mode !== 'idle') return;
    // settled near her
    g.drop += ((v.seated && d < 12 ? 0.55 : 0) - g.drop) * 0.3;
    if (v.seated && P.now - P.saidSeat > 90 && d < 12 && rnd() < 0.3) { P.saidSeat = P.now; line(g, 'seated', { toGuest: true }); return; }
    if (P.now < g.nextAct || chatting) return;
    g.nextAct = P.now + 11 + rnd() * 12;
    const roll = rnd();
    const settled = P.now - v.roomSince > 22 && P.now - P.lastInput > 14 && !P.guests.some(o => o.away) && P.now - g.lastDrift > 120;
    if (roll < 0.3 && settled) {
      const list = SPOTS[g.id].filter(s => s.f === v.f && P.now - (s.last ?? -999) > 300 && !(g.id === 'gigi' && s.key === 'coffee'));
      const s = list[Math.floor(rnd() * list.length)];
      if (s && drift(g, s, true)) return;
    }
    if (roll < 0.55) { g.anim = g.id === 'feyn' ? 'drum' : g.id === 'nano' ? 'type' : g.hasCup ? 'sip' : 'bow'; g.animUntil = P.now + 3 + rnd() * 2; }
    else if (roll < 0.72 && d > 7.5) { const s = spotNear(g, v.x, v.z, v.f, { facing: true }); if (s && dist(s, m) > 2.5) goTo(g, s.f, s.x, s.z, null, 0.7); }
  }

  // Walking but getting nowhere for six seconds (wedged against furniture, a plan that cannot be followed):
  // glide to the nearest open floor that is not at her elbow, and think again
  function watchdog(g) {
    const m = g.m;
    if (g.mode !== 'go' || g.engaged || g.out || onStair(g) || Math.hypot(m.x - g.px, m.z - g.pz) > 0.3) { g.px = m.x; g.pz = m.z; g.stuckT = 0; return; }
    if ((g.stuckT += 0.25) < 6) return;
    rescue(g);
  }
  function rescue(g) {
    const m = g.m;
    g.stuckT = 0; g.cornered = 0; P.events.rescues++;
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
      S.nextAt = P.now + Math.min(4.6, 1.5 + l.text.length * 0.042);
      return;
    }
    if (P.now < P.nextGroup) return;
    P.nextGroup = P.now + 0.5;
    let talking = false; for (const g of P.guests) if (g.bubble.talking(P.now)) talking = true;
    const quiet = P.now - P.lastInput > 10 && P.danceUntil < P.now && !talking;
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
      let pick = null, n = 0; for (const g of P.guests) if (here(g) && !g.engaged && !g.dance && inSight(g) && g.greeted && rnd() < 1 / ++n) pick = g;
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
      const p = g.gl[g.gi], dx = p[0] - m.x, dz = p[2] - m.z, L = Math.hypot(dx, dz), step = g.spec.speed * 1.05 * dt;
      m.face(Math.atan2(dx, dz), dt * 1.6);
      if (L <= step) { m.x = p[0]; m.z = p[2]; m.y = p[1]; if (++g.gi >= g.gl.length) { g.mode = 'idle'; const f = g.glThen; g.glThen = null; f?.(); } }
      else { m.x += dx / L * step; m.z += dz / L * step; m.y += (p[1] - m.y) * Math.min(1, step / L); }
    } else if (g.mode === 'knock' || g.mode === 'farewell') {
      if (g.mode === 'farewell' && v.present) m.faceTo(v.x, v.z, dt * 1.4);
      if (P.now >= g.waitUntil) { if (g.mode === 'knock') { const f = g.glThen; g.glThen = null; g.mode = 'idle'; f?.(); } else { g.mode = 'idle'; headOut(g); } }
    } else if (g.engaged && g.state === 'here') {
      m.v = Math.max(0, m.v - dt * 3);
      const lk = P.now < g.lookUntil && g.look ? g.look : v; m.faceTo(lk.x, lk.z, dt * 1.7);
    } else if (g.mode === 'go') {
      const s = m.update(dt, g.speedK); g.lastStatus = s;
      // her standing in the way is not something to wait out at her elbow: give up the trip and ease back (think() does that)
      if (s === 'waiting' && here(g) && v.present && v.f === m.f && Math.hypot(v.x - m.x, v.z - m.z) < 4.6 && !onStair(g)) { g.stall += dt; if (g.stall > 1.2) { g.stall = 0; if (++g.cornered >= 3) rescue(g); else { m.stop(); g.mode = 'idle'; g.onArrive = null; g.followSince = P.now + 3; g.lastBack = -9; if (g.dance) g.danceReady = true; if (g.away && !g.away.arrived) g.away = null; } } }
      else if (s === 'moving') { g.stall = 0; if (m.v > 1) g.cornered = 0; }
      if (s === 'arrived') { g.mode = 'idle'; const f = g.onArrive; g.onArrive = null; f?.(); }
      else if (s === 'failed' || s === 'idle') {
        if (--g.tries <= 0 || !m.goal || !m.goTo(m.goal.f, m.goal.x, m.goal.z)) { m.stop(); g.mode = 'idle'; g.onArrive = null; P.events.fails++; if (g.dance) g.danceReady = true; if (g.away && !g.away.arrived) g.away = null; if (g.state === 'leaving') { if (++g.leaveTries > 8) { note(`${g.C.short} slips out.`); gone(g); } else if (g.leaveTries % 2 === 0) rescue(g); else { g.mode = 'farewell'; g.waitUntil = P.now + 1.5; } } }
      }
    } else {
      m.v = Math.max(0, m.v - dt * 4);
      if (g.dance && g.danceReady && v.present) m.faceTo(v.x, v.z, dt * 1.2);
      else if (P.now < g.lookUntil && g.look) m.faceTo(g.look.x, g.look.z, dt * 0.9);
      else if (here(g) && !g.away && v.present && v.f === m.f && !v.outside) m.faceTo(v.x, v.z, dt * 0.35);          // drifting round to keep her in view
    }
    // a body she cannot walk through; pressed against, it glides aside
    const r = g.spec.radius;
    g.box.x0 = m.x - r; g.box.x1 = m.x + r; g.box.z0 = m.z - r; g.box.z1 = m.z + r; g.box.y0 = m.y + 0.6; g.box.y1 = m.y + g.spec.hover + 0.8;
    if (here(g) && v.present && Math.abs(v.y - m.y) < 3) {
      const dx = m.x - v.x, dz = m.z - v.z, d = Math.hypot(dx, dz), want = r + 1.12;
      if (d < want && d > 1e-3) { const step = Math.min(want - d, dt * 2.5), x = m.x + dx / d * step, z = m.z + dz / d * step; if (nav.freeAt(m.f, x, z, 2, true)) { m.x = x; m.z = z; P.events.glides++; } }
    }
    if (here(g)) {
      for (const o of P.guests) if (o !== g && o.i < g.i && !o.out && o.state !== 'away' && o.m.f === m.f) easeOff(g, o.m.x, o.m.z, 1.7, dt);
      const H = staff()?.H; if (H) for (const a of H.robots) if (a.f === m.f) easeOff(g, a.x, a.z, 1.7, dt);
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
  function pose(g, dt) {
    const m = g.m, b = g.body, t = P.now, ph = g.i * 2.1 + 1, S = g.spec;
    const dancing = g.dance && g.danceReady && g.mode !== 'go';
    const beat = t * BPM / 60, bi = Math.floor(beat), bf = beat - bi;
    g.dropNow += (g.drop - g.dropNow) * Math.min(1, dt * 1.5);
    let by = S.hover - g.dropNow + 0.06 * Math.sin(t * 1.5 + ph), bx = 0, lean = 0, spinAim = 0;
    const hl = b.hands[0], hr = b.hands[1], rl = hl.userData.rest, rr = hr.userData.rest, sway = 0.035 * Math.sin(t * 1.8 + ph);
    let lx = rl[0], ly = rl[1] + sway, lz = rl[2], rx = rr[0], ry = rr[1] - sway, rz = rr[2];
    const talking = g.bubble.talking(t);
    const anim = dancing ? 'dance' : g.anim;
    if (anim === 'dance') {
      const hop = Math.abs(Math.sin(Math.PI * beat));
      if (g.id === 'feyn') {                                  // a samba: sway, hop, hands on the drums
        bx = 0.2 * Math.sin(Math.PI * beat); by += 0.1 * hop; lean = 0.13 * Math.sin(Math.PI * beat);
        const tap = Math.max(0, Math.sin(Math.PI * 2 * beat)), tap2 = Math.max(0, -Math.sin(Math.PI * 2 * beat));
        lx = -0.2; lz = 0.62; ly = -0.34 + 0.2 * tap; rx = 0.19; rz = 0.62; ry = -0.34 + 0.2 * tap2;
      } else if (g.id === 'gigi') {                           // twirls, arms up
        by += 0.14 * hop; spinAim = (bi % 8 < 4 ? (bi % 4 + smooth(bf)) / 4 : 0) * Math.PI * 2; lean = 0.08 * Math.sin(Math.PI * beat);
        lx = rl[0] - 0.1; ly = 0.42 + 0.14 * Math.sin(Math.PI * beat); lz = 0.1; rx = rr[0] + 0.1; ry = 0.42 - 0.14 * Math.sin(Math.PI * beat); rz = 0.1;
      } else {                                                // the robot: square moves on the beat, stepping down like a loss curve
        const k = bi % 4, snap = Math.min(1, bf * 5);
        by += -0.07 * (k + snap - 1) + (k === 0 ? 0.21 * (1 - snap) - 0.07 : 0) + 0.07; spinAim = k === 0 ? -0.5 : k === 2 ? 0.5 : 0;
        const up = k % 2 === 0; lx = rl[0]; rx = rr[0];
        ly = up ? 0.3 : -0.2; lz = up ? 0.12 : 0.5; ry = up ? -0.2 : 0.3; rz = up ? 0.5 : 0.12;
      }
      if (bi !== g.lastBeat) { g.lastBeat = bi; if (g.id === 'feyn' && !musicOn() && inEar(g)) ctx.sound?.note?.(bi % 4 === 2 ? 52 : 45, 0, 0.14, 0.03); }
    } else {
      if (talking) { ry += 0.1 + 0.07 * Math.abs(Math.sin(t * 4)); rz += 0.16; }
      if (anim === 'drum') { const tap = Math.max(0, Math.sin(t * 13)), tap2 = Math.max(0, Math.sin(t * 13 + 2.2)); lx = -0.2; lz = 0.62; ly = -0.36 + 0.16 * tap; rx = 0.19; rz = 0.62; ry = -0.36 + 0.16 * tap2; lean = 0.04 * Math.sin(t * 6.5); }
      else if (anim === 'type') { lx = -0.24; rx = 0.24; lz = rz = 0.62; ly = -0.26 + 0.035 * Math.sin(t * 17); ry = -0.26 + 0.035 * Math.sin(t * 19 + 1); }
      else if (anim === 'sip') { const k = 0.5 + 0.5 * Math.sin(t * 1.6 - 1.2); rx = 0.3; ry = rr[1] + 0.34 * k; rz = 0.3 + 0.22 * k; }
      else if (anim === 'bow') { lx = -0.22; ly = b.R * b.bs[1] + 0.02 + 0.02 * Math.sin(t * 5); lz = 0.12; }
      else if (anim === 'make') { lx = -0.2; lz = 0.6; ly = -0.05 + 0.05 * Math.sin(t * 6); rx = 0.22; rz = 0.62; ry = -0.12 + 0.03 * Math.sin(t * 4.3); }
      else if (anim === 'draw') { rx = 0.3 + 0.16 * Math.sin(t * 2.3); ry = 0.22 + 0.14 * Math.sin(t * 3.1); rz = 0.62; }
      else if (anim === 'reach') { rz += 0.42; ry += 0.12 + 0.03 * Math.sin(t * 2); }
    }
    hl.position.set(lx, ly, lz); hr.position.set(rx, ry, rz);
    if (g.spin - spinAim > Math.PI) g.spin -= Math.PI * 2;
    g.spin += (spinAim - g.spin) * Math.min(1, dt * (g.id === 'nano' ? 12 : 9));
    if (!dancing && Math.abs(g.spin) < 0.002) g.spin = 0;
    const yaw = m.yaw + g.spin;
    b.root.rotation.y = yaw;
    const dyaw = m.yaw - g.lastYaw, turn = Math.atan2(Math.sin(dyaw), Math.cos(dyaw)) / Math.max(dt, 1e-3); g.lastYaw = m.yaw;
    b.bob.position.y = by; b.bob.position.x += (bx - b.bob.position.x) * Math.min(1, dt * 10);
    b.bob.rotation.x += (Math.min(0.14, m.v * 0.05) - b.bob.rotation.x) * Math.min(1, dt * 3);
    b.bob.rotation.z += (Math.max(-0.14, Math.min(0.14, -turn * 0.05 + lean)) - b.bob.rotation.z) * Math.min(1, dt * (dancing ? 10 : 3));
    b.ring.scale.setScalar(1 + 0.08 * Math.sin(dancing ? Math.PI * 2 * beat : t * 3 + ph));
    b.ring.material.opacity = 0.85 - g.dropNow * 0.5;
    // face
    let look = 0;
    if (v.present && v.f === m.f) { let a = Math.atan2(v.x - m.x, v.z - m.z) - yaw; a = Math.atan2(Math.sin(a), Math.cos(a)); if (Math.abs(a) < 1.4) look = Math.max(-1, Math.min(1, a * 1.2)); }
    g.blinkAt -= dt; const blink = g.blinkAt < 0; if (g.blinkAt < -0.13) g.blinkAt = 2.5 + rnd() * 4;
    const expr = t < g.exprUntil ? g.expr : dancing ? (g.id === 'gigi' ? 'love' : 'happy') : anim === 'make' || anim === 'type' || anim === 'draw' ? 'focus' : anim === 'sip' ? 'happy' : P.chatWith === g ? 'happy' : 'neutral';
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
    if (Math.hypot(v.x - v.lx, v.z - v.lz) > 0.5) { v.lx = v.x; v.lz = v.z; v.movedAt = P.now; }
    if (P.now < P.nextWatch) return;
    P.nextWatch = P.now + 0.2;
    const room = nav.roomAt(v.x, v.y + 0.5, v.z)?.name ?? null, outside = !room || /terrace|front porch|screened porch/i.test(room);
    if (outside !== v.outside) { v.outside = outside; if (outside) { v.outSince = P.now; P.saidWait = false; } else if (P.now - v.outSince > 25) welcomeBack(); }
    if (room !== v.room) { v.room = room; v.roomSince = P.now; }
  }
  function welcomeBack() { later(2.5, () => { let best = null, bd = 30; for (const g of P.guests) if (here(g) && !g.engaged && g.m.f === v.f && dist(g.m, v) < bd) { bd = dist(g.m, v); best = g; } if (best && !v.outside) line(best, 'welcomeBack', { expr: 'happy' }); }); }

  // ---- One step of the party ---------------------------------------------------------------------
  const head = new THREE.Vector3();
  function step(dt, draw) {
    P.dt = dt; P.now += dt;
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
    if (P.danceUntil > P.now && P.now > P.nextHum && !musicOn()) { P.nextHum = P.now + 5 + rnd() * 3; let n = 0, pick = null; for (const g of P.guests) if (g.dance && g.danceReady && !g.bubble.talking(P.now) && rnd() < 1 / ++n) pick = g; if (pick) line(pick, 'hum', { toGuest: false, secs: 2.6, expr: 'happy', log: false }); }
    if (any) groupLife();
    doorTick();
    // the chat card: rests when she walks off, closes when she has really gone
    if (P.chatWith) { const g = P.chatWith, d = v.present && v.f === g.m.f ? dist(g.m, v) : 99; if (!here(g) && g.state !== 'leaving') { ui?.chat.hide(); P.chatWith = null; } else if (d > 16 || (ui?.chat.resting && P.now - P.lastInput > 45)) { ui?.chat.hide(); P.chatWith = null; } }
    if (!any && !P.queue.length && !P.closeDoorAt) P.active = false;
    if (!draw || headless) return;
    const show = ctx.mode === 'walk' || P.demo, cf = nav.floorOf(cam.y - 4);
    for (const g of P.guests) {
      if (g.state === 'away' || g.state === 'coming') { if (g.bubble.shown) bubbles.place(g.bubble, head, P.now, false); continue; }
      head.set(g.m.x, g.m.y + g.body.top + 0.35 - g.dropNow, g.m.z);
      const vis = show && Math.hypot(head.x - cam.x, head.z - cam.z) < 34 && (P.demo || (g.out ? cf === 0 : g.m.f === cf && nav.see(cf, cam.x, cam.z, head.x, head.z)));
      bubbles.place(g.bubble, head, P.now, vis);
    }
  }

  // ---- Posed for a photograph (test hooks; see friends.js) ------------------------------------------
  const dir = new THREE.Vector3();
  function stage(kind, ids = ORDER, text = '') {
    P.demo = true; P.active = true; if (!P.door) findDoor();
    camera.getWorldDirection(dir); const L = Math.hypot(dir.x, dir.z) || 1, ux = dir.x / L, uz = dir.z / L, rx = -uz, rz = ux, cam = camera.position;
    const f = nav.floorOf(cam.y - 4), F = nav.FLOORS[f];
    const places = ids.length === 1 ? [[7.5, 0.4]] : ids.length === 2 ? [[8, -1.9], [8.4, 2.0]] : [[8.6, -3.4], [9.6, 0.2], [8.2, 3.5]];
    ids.forEach((id, n) => {
      const g = P.byId[id] ?? (P.byId[id] = makeGuest(id, ORDER.indexOf(id))); if (!P.guests.includes(g)) P.guests.push(g);
      const [fwd, side] = places[n], x = cam.x + ux * fwd + rx * side, z = cam.z + uz * fwd + rz * side;
      g.state = 'here'; g.out = false; g.m.place(x, z, f); g.m.y = F; g.m.yaw = Math.atan2(cam.x - x, cam.z - z); g.body.root.visible = true; g.greeted = true; P.been.add(id);
      g.mode = 'demo'; g.thinkAt = 1e9;
    });
    const G = id => P.byId[id], sayD = (id, t, expr) => { const g = G(id); if (!g || !ids.includes(id)) return; g.bubble.say(t, 1e6, P.now); g.expr = expr; g.exprUntil = 1e9; };
    if (kind === 'dance') { for (const id of ids) { const g = G(id); g.dance = true; g.danceReady = true; g.mode = 'idle'; } P.danceUntil = 1e9; sayD('gigi', 'Dance break! Twirl with me. No thoughts, just twirl.', 'love'); }
    else if (kind === 'chat') {
      const g = G(ids[0]); P.v.present = true; ctx.forcePresent = true; watch();
      talkTo(g, true);
      if (text) { ui?.chat.add('you', 'You', text); const r = sayTo(g, text); for (let i = 0; i < 400; i++) { P.now += 0.05; for (let k = P.queue.length - 1; k >= 0; k--) if (P.queue[k].t <= P.now) { const q = P.queue[k]; P.queue.splice(k, 1); q.fn(); } } for (const x of P.guests) { x.bubble.until = 1e9; x.exprUntil = 1e9; } void r; }
    } else {
      sayD('feyn', 'Hello, hello! What a house. I want to know how everything in it works. Do not tell me.', 'happy');
      sayD('gigi', 'Hiii! Okay, first of all, you look amazing. Second of all, where is the coffee?', 'love');
      sayD('nano', 'Hi! Ok wow, this place is super nice. Somebody tuned these hyperparameters by hand.', 'happy');
      const k = G('gigi'); if (k && ids.includes('gigi') && kind === 'coffee') { k.hasCup = true; k.body.cup.visible = true; k.anim = 'sip'; k.animUntil = 1e9; }
      const fy = G('feyn'); if (fy && ids.includes('feyn') && kind === 'coffee') { fy.anim = 'drum'; fy.animUntil = 1e9; }
      const nn = G('nano'); if (nn && ids.includes('nano') && kind === 'coffee') { nn.anim = 'type'; nn.animUntil = 1e9; }
    }
  }
  function demoStep(dt) {
    P.dt = dt; P.now += dt;
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
    status: () => P.guests.map(g => ({ who: g.name, state: g.state, mode: g.mode, x: +g.m.x.toFixed(1), z: +g.m.z.toFixed(1), f: g.m.f, room: nav.roomAt(g.m.x, nav.FLOORS[g.m.f] + 1, g.m.z)?.name ?? '-', away: g.away?.spot.key ?? '', dance: g.dance, said: g.bubble.text })),
    // For the logic test: is anybody inside a wall or a piece of furniture?
    check() {
      const bad = [];
      for (const g of P.guests) {
        if (g.state !== 'here' || g.mode === 'demo') continue;
        const F = nav.FLOORS[g.m.f], x = g.m.x, z = g.m.z;
        const stairs = nav.stair && Math.abs(x - nav.stair.x) < 2.2 && z > nav.stair.zHi - 1.5 && z < nav.stair.zLo + 1.5;
        if (stairs) continue;
        const hit = ctx.colliders.find(c => !c.off && !c.staff && c.y0 < F + 4.6 && c.y1 > F + 0.15 && x > c.x0 + 0.02 && x < c.x1 - 0.02 && z > c.z0 + 0.02 && z < c.z1 - 0.02);
        if (hit) bad.push({ who: g.name, x: +x.toFixed(2), z: +z.toFixed(2), f: g.m.f, mode: g.mode, box: hit });
      }
      return bad;
    },
    cost: () => Object.fromEntries(P.guests.map(g => [g.id, costOf(g.body.root)])),
  };
  if (typeof window !== 'undefined') window.__friends = api;
  return api;
}
