// The household staff: three robots who run the place (Bartholomew, Mortimer
// and Fig), Sir Reginald the vacuum, and two gardeners outside (Bramble and
// Thistle, staff/gardeners.js, on their own outdoor plan, staff/outdoor.js). main.js calls hireStaff(ctx) once the
// house is built. Everything here is optional to the rest of the house.
//
// URL parameters (for testing):
//   ?staffdemo=1|robots|drinks|reggie|garden   stage the cast in front of the camera (use with view=)
//   ?stafftime=N                        run the household N seconds before the first frame
//   ?staffseed=N                        fix the dice
//
// Files: staff/nav.js (walkable grid, A*, path following), staff/agent.js (tasks
// as generators), staff/robots.js (the policy), staff/roomba.js, staff/talk.js
// (the conversation card), staff/drinks.js (menu and glassware), staff/models.js
// (bodies), staff/lines.js (what they say), staff/bubbles.js (speech bubbles).

import { makeNav } from './staff/nav.js';
import { makeBubbles } from './staff/bubbles.js';
import { makeTalk } from './staff/talk.js';
import { useThree } from './staff/models.js';
import { useThreeDrinks, buildDrink, setFill, MENU, GARDEN_GIFTS } from './staff/drinks.js';
import { Robot } from './staff/robots.js';
import { Roomba } from './staff/roomba.js';
import { makeOutdoor } from './staff/outdoor.js';
import { Gardener, gardenSpots } from './staff/gardeners.js';
import { POIS } from './staff/lines.js';
import { rngFrom } from './staff/agent.js';
import { shuffle } from './shuffle.js';

const PLAN_W = 43.33;
const wx = X => X - PLAN_W / 2, wz = Y => -Y;

export function hireStaff(ctx) {
  const { THREE, scene, camera } = ctx;
  useThree(THREE); useThreeDrinks(THREE);
  const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
  const headless = !!ctx.headless;
  const nav = makeNav(ctx);
  const group = new THREE.Group(); group.name = 'staff'; group.userData.staff = true; scene.add(group);
  nav.rebuild(group);
  const out = makeOutdoor(ctx); out.rebuild();

  const seed = Number(Q.get('staffseed') ?? ctx.seed ?? Math.floor(Math.random() * 1e9));
  const H = {
    ctx, nav, group, THREE, now: 0, dt: 1 / 60, rnd: rngFrom(seed), day: ctx.day,
    bubbles: makeBubbles(THREE, camera, headless),
    visitor: { present: false, since: 0, outside: false, outSince: 0, x: 0, y: 0, z: 0, f: 0, fx: 0, fz: -1, room: null, roomSince: 0, poi: null, poiSince: 0, aimed: null, holding: null },
    // what the household remembers about this visit
    mem: { greeted: false, met: new Set(), asked: new Set(), rooms: new Set(), drinks: [], lastDrink: null, finished: false, lastSip: -1e9, toldDark: false },
    robots: [], gardeners: [], cats: [], roomba: null, out, spots: {}, empties: [],
    host: null, lastBanter: -60, lastOffer: -60, lastHostEnd: -999, lastNod: 0, hourSaid: -999,
    roomSaid: {}, poiSaid: new Map(), bags: new Map(),
    events: { lines: 0, greets: 0, hosts: 0, fetches: 0, deliveries: 0, drinksTaken: 0, setDown: 0, cleared: 0, doors: 0, banter: 0, tidies: 0, bumps: 0, asks: 0, choices: 0, looks: 0, lamps: 0 },
  };
  H.talk = makeTalk(H, headless);

  // A shuffled bag per pool: nothing repeats until everything has been said once.
  H.bag = (key, list) => {
    let b = H.bags.get(key);
    if (!b || b.i >= b.order.length || b.order.length !== list.length) {
      const last = b?.order[b.order.length - 1];
      const order = shuffle(list.map((_, i) => i), H.rnd);
      if (order.length > 1 && order[0] === last) order.push(order.shift());
      b = { order, i: 0 }; H.bags.set(key, b);
    }
    return list[b.order[b.i++]];
  };
  const camFloor = () => nav.floorOf(camera.position.y - 4);
  H.see = (a, b) => (a.f ?? 0) === (b.f ?? 0) && nav.see(a.f ?? 0, a.x, a.z, b.x, b.z);
  H.near = (a, d) => { const v = H.visitor; return v.present && v.f === a.f && Math.hypot(v.x - a.x, v.z - a.z) < d && nav.see(v.f, v.x, v.z, a.x, a.z); };
  H.busyTalking = () => { const v = H.visitor; return [...H.robots, ...H.gardeners].some(r => r.bubble.talking(H.now) && Math.hypot(r.x - v.x, r.z - v.z) < 20); };
  H.nearDoor = (f, x, z, r) => nav.doors.some(d => d.staffFloor === f && Math.hypot(d.cx - x, d.cz - z) < r);
  H.anyoneNear = (x, z, r) => {
    const v = H.visitor;
    if (v.present && Math.hypot(v.x - x, v.z - z) < r) return true;
    return [...H.robots, ...H.gardeners, H.roomba].some(a => a && Math.hypot(a.x - x, a.z - z) < r);
  };
  // Is someone standing at (x, z), from the point of view of `self`? Robots give the guest a wide berth
  // unless they are the one attending her.
  H.blocked = (self, x, z, r) => {
    const v = H.visitor;
    if (v.present && v.f === self.f) {
      const attending = self === H.host || self.carrying;
      if (Math.hypot(v.x - x, v.z - z) < r + (self instanceof Robot && !attending ? 2.2 : 0.35)) return true;
    }
    if (self instanceof Robot) return [...H.robots, ...H.gardeners].some(o => o !== self && o.f === self.f && Math.hypot(o.x - x, o.z - z) < r + 0.3);
    return false;
  };
  // Sound: little chirps, quieter with distance
  const vol = a => { const v = H.visitor; if (!v.present || headless) return 0; const d = Math.hypot(v.x - a.x, v.z - a.z) + Math.abs(v.f - a.f) * 30; return 1 / (1 + (d / 10) ** 2); };
  H.chirp = (notes, v0, a, gap = 0.075) => { const k = vol(a) * v0; if (k < 0.004) return; notes.forEach((n, i) => ctx.sound?.note?.(n, i * gap, 0.22, k)); };
  // Light the candle nearest the guest (the staff's answer to "it's dark in here")
  H.lightNearbyLamp = () => {
    const v = H.visitor; let best = null, bd = 16;
    for (const it of ctx.interact) {
      let l = ''; try { l = it.label?.() ?? ''; } catch { /* not ours to worry about */ }
      if (!/^light the candle/.test(l)) continue;
      const d = Math.hypot(it.x - v.x, it.z - v.z) + Math.abs(it.y - v.y - 3); if (d < bd) { bd = d; best = it; }
    }
    if (best) { best.act(); H.events.lamps++; }
  };

  // ---- Drinks: made on trays, held in the hand, set down, cleared -------------------------------
  H.makeDrink = d => buildDrink(d);
  H.fill = (g, f, t = H.now) => { g.userData.fill = f; setFill(g, f, t); };
  let held = null;
  H.hold = (d, g) => {
    if (held) group.remove(held.g);
    g = g ?? H.makeDrink(d); g.removeFromParent(); group.add(g); if (!d.food) H.fill(g, 1);
    held = { d, g, since: H.now, s0: g.scale.x, bites: 0 };
    H.visitor.holding = d; H.mem.drinks.push(d.id); H.mem.lastDrink = d; H.mem.finished = false;
    H.bubbles.toast(`You take the ${d.name}.${H.mem.toldSip ? '' : d.food || d.gift ? ' Press Q to eat.' : ' Press Q to sip.'}`, H.now, 4); H.mem.toldSip = true;
  };
  // Sipping and eating: Q, or E / a tap with nothing in front of you. A drink goes down a sixth at a
  // sip (it also goes down slowly by itself); food goes in three bites; a strawberry in one.
  let sipAt = -1e9;
  const QS = new URLSearchParams(location.search), sipTest = QS.has('sip') ? Number(QS.get('sip')) : null;      // test hooks: ?hold=latte|croissant &sip=0.5
  if (QS.has('hold')) setTimeout(() => { const id = QS.get('hold'), d = MENU.find(m => m.id === id); if (d) H.hold(d); else ctx.interact.find(i => i.label?.().includes(id))?.act(); }, 1500);
  H.sip = () => {
    if (!held || H.now - sipAt < 1.25) return false;
    sipAt = H.now; const d = held.d;
    if (d.food) { if (++held.bites >= (d.bites ?? 3)) held.gone = true; }
    else if (d.gift) held.gone = d.vessel !== 'flower';
    else held.since -= (d.last ?? 75) / 6;
    return true;
  };
  ctx.sip = H.sip;
  addEventListener('keydown', e => { if (e.code === 'KeyQ' && !e.repeat && !/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName ?? '')) H.sip(); });
  // Things to eat that are lying about the house: take one (there are always more)
  const FOOD = {
    croissant: { id: 'croissant', name: 'croissant', model: 'croissant', done: 'You finish the croissant. Flaky, buttery, gone.' },
    st_bread_1: { id: 'bread', name: 'piece of bread', model: 'st_bread_2', done: 'You finish the bread. Good crust.' },
    st_cake_stand: { id: 'cake', name: 'little iced cake', done: 'You finish the little cake. Lemon, with a sugar violet.' },
  };
  for (const m of ctx.items.models ?? []) {
    const f = FOOD[m.id]; if (!f) continue;
    const d = { ...f, food: true, gift: true, vessel: 'food', last: 900, from: 'here', note: '' };
    ctx.interact.push({ x: m.x, y: m.y + (m.id === 'st_cake_stand' ? 0.6 : 0.1), z: m.z, reach: 5.5, label: () => `have a ${d.name}`, act: async () => {
      let g;
      if (d.model) { try { g = await ctx.loadModel(d.model); g.traverse(n => { if (n.isMesh) n.castShadow = false; }); } catch { return; } }
      else { g = new THREE.Group(); const cake = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.11, 14), new THREE.MeshStandardMaterial({ color: 0xf3e3a8, roughness: 0.6 })); cake.position.y = 0.055; const top = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), new THREE.MeshStandardMaterial({ color: 0x7a5aa8, roughness: 0.5 })); top.position.y = 0.118; g.add(cake, top); }
      g.userData.drink = d; H.hold(d, g);
    } });
  }
  // A surface near the guest to put an empty on: a table, a counter, a sideboard
  function surfaceNear(v) {
    const F = nav.FLOORS[v.f]; let best = null, bd = 7;
    for (const c of ctx.colliders) {
      if (c.off || c.staff || c.y1 < F + 1.3 || c.y1 > F + 3.4 || c.y0 > F + 0.5 || (c.x1 - c.x0) * (c.z1 - c.z0) > 70 || Math.min(c.x1 - c.x0, c.z1 - c.z0) < 0.9) continue;
      const x = Math.max(c.x0 + 0.3, Math.min(c.x1 - 0.3, v.x)), z = Math.max(c.z0 + 0.3, Math.min(c.z1 - 0.3, v.z)), d = Math.hypot(x - v.x, z - v.z);
      if (d < bd && nav.see(v.f, v.x, v.z, x, z)) { bd = d; best = { x, y: c.y1 + 0.005, z }; }
    }
    return best;
  }
  const tmpV = new THREE.Vector3(), tmpR = new THREE.Vector3();
  function holdUpdate() {
    if (!held) return;
    const v = H.visitor, g = held.g, age = H.now - held.since, LAST = held.d.last ?? 75;
    const sk = sipTest ?? (H.now - sipAt) / 1.1, bell = sk > 0 && sk < 1 ? Math.sin(Math.PI * sk) : 0;      // the hand comes up to the mouth and back
    if (held.gone && sk >= 0.55) held.since = -1e9;
    if (held.d.gift && (H.now - held.since > LAST || !v.present)) { if (v.present) H.bubbles.toast(held.d.done, H.now, 4); group.remove(g); held = null; v.holding = null; H.mem.lastSip = H.now; return; }
    if (!held.d.gift) H.fill(g, Math.max(0.06, 1 - age / LAST));
    if (age > LAST || !v.present) {
      // finished: set it down nearby, or keep holding the empty until someone takes it
      held = null; v.holding = null; H.mem.finished = true; H.mem.lastSip = H.now;
      const s = v.present ? surfaceNear(v) : null;
      if (s) { g.position.set(s.x, s.y, s.z); g.rotation.set(0, H.rnd() * 6, 0); H.empties.push({ g, d: g.userData.drink, x: s.x, y: s.y, z: s.z, f: v.f, outside: v.outside }); H.events.setDown++; H.bubbles.toast(`You set the empty ${g.userData.drink.name.replace(/^(cup|glass) of /, '')} down.`, H.now, 3.5); }
      else if (v.present) { H.empties.push({ g, d: g.userData.drink, inHand: true, x: v.x, y: v.y, z: v.z, f: v.f, outside: v.outside }); H.bubbles.toast(`You finish the ${g.userData.drink.name}.`, H.now, 3.5); }
      else group.remove(g);
      return;
    }
    if (headless) return;
    camera.getWorldDirection(tmpV); tmpR.set(-tmpV.z, 0, tmpV.x).normalize();
    g.position.copy(camera.position).addScaledVector(tmpV, 0.95 - 0.42 * bell).addScaledVector(tmpR, 0.4 - 0.33 * bell); g.position.y -= 0.6 - 0.34 * bell - Math.sin(H.now * 1.3) * 0.006;
    g.rotation.order = 'YXZ'; g.rotation.set(0.75 * bell, Math.atan2(-tmpV.x, -tmpV.z) + 0.5, 0);
    if (held.d.food) g.scale.setScalar(held.s0 * (1 - 0.27 * Math.min(held.bites, 3) * (sk > 0.5 || held.bites === 0 ? 1 : (held.bites - 1) / held.bites)));
  }
  function emptiesUpdate() {
    const v = H.visitor;
    for (const e of H.empties) if (e.inHand) {
      if (!v.present) { group.remove(e.g); H.empties.splice(H.empties.indexOf(e), 1); return; }
      e.x = v.x; e.y = v.y; e.z = v.z; e.f = v.f; e.outside = v.outside;
      if (!headless) { camera.getWorldDirection(tmpV); tmpR.set(-tmpV.z, 0, tmpV.x).normalize(); e.g.position.copy(camera.position).addScaledVector(tmpV, 0.95).addScaledVector(tmpR, 0.4); e.g.position.y -= 0.6; }
    }
  }
  H.takeEmpty = (e, robot) => {
    const i = H.empties.indexOf(e); if (i >= 0) H.empties.splice(i, 1);
    e.g.removeFromParent(); e.g.position.set(0, 0, 0); e.g.rotation.set(0, 0, 0);
    robot.body.slot.add(e.g); robot.body.tray.visible = true; H.events.cleared++;
    if (e.inHand) H.bubbles.toast(`${robot.name} takes the empty from you.`, H.now, 3);
  };

  // ---- Places in the house that matter to the household --------------------------------------
  function findSpots() {
    const S = { lookouts: [], rest: {} };
    for (const w of ctx.house.windows) {
      const f = nav.floorOf(w.fl + 1), mid = (w.u0 + w.u1) / 2, pt = d => (w.isX ? [wx(mid), wz(w.c + w.sg * d)] : [wx(w.c + w.sg * d), wz(mid)]);
      const [lx, lz] = pt(2.4), lc = nav.nearest(f, lx, lz, 2, 2.5, true);
      if (lc >= 0) S.lookouts.push({ f, x: pt(0)[0], z: pt(0)[1], ax: nav.cx(lc), az: nav.cz(lc) });
    }
    const snap = (f, X, Y, need = 2, r = 4) => { const c = nav.nearest(f, wx(X), wz(Y), need, r, true); return c < 0 ? null : { f, x: nav.cx(c), z: nav.cz(c) }; };
    const bar = snap(0, 36.6, 19.6); if (bar) S.bar = { ...bar, fx: wx(36.6), fz: wz(17.6) };
    const kit = snap(0, 34.6, 24.6); if (kit) S.kitchen = { ...kit, fx: wx(32.4), fz: wz(24.4) };
    S.rest = { barty: snap(0, 14.9, 17.8, 2, 3) ?? snap(0, 10, 8), mort: snap(0, 39.5, 26.5) ?? snap(0, 36, 25), fig: snap(1, 22.2, 3.5) ?? snap(1, 24, 19) };
    S.dock = snap(0, 20.7, 21.4, 2, 3) ?? snap(0, 21, 15);
    H.spots = S;
  }
  findSpots();

  // ---- Hire everyone ---------------------------------------------------------------------------
  H.robots = ['barty', 'mort', 'fig'].map((k, i) => new Robot(H, k, i));
  H.roomba = new Roomba(H);
  H.gspots = gardenSpots(out, ctx);
  H.gardeners = [new Gardener(H, 'bramble', 3, out), new Gardener(H, 'thistle', 4, out)];
  for (const [g, x, z] of [[H.gardeners[0], 46, -70], [H.gardeners[1], 86, -100]]) { const c = out.nearest(0, x, z, 1.2, 12); if (c >= 0) g.m.place(out.cx(c), out.cz(c), 0); }
  H.roomba.dock = H.spots.dock ? { ...H.spots.dock, yaw: 0 } : null;
  const place = (a, f, X, Y, need) => { const c = nav.nearest(f, wx(X), wz(Y), need, 8); if (c >= 0) a.m.place(nav.cx(c), nav.cz(c), f); else { const s = nav.randomSpot(f, need, H.rnd); if (s) a.m.place(s.x, s.z, f); } };
  place(H.robots[0], 0, 33.0, 19.6, 2);          // Barty at the coffee bar
  place(H.robots[1], 0, 36.0, 25.0, 2);          // Mort in the kitchen
  place(H.robots[2], 1, 23.0, 4.0, 2);           // Fig upstairs
  place(H.roomba, 0, 34.0, 6.0, 2);              // Reginald in the dining room
  H.robots.forEach((r, i) => { r.m.yaw = i * 2; });

  // ---- Bodies the visitor cannot walk through ----------------------------------------------------
  // One collider per character, moved every frame (marked staff, so our own plans ignore them). If she
  // is pressed against one, the character glides aside rather than pinning her.
  const bodies = [...H.robots, ...H.gardeners, H.roomba].map(a => {
    const r = a === H.roomba ? 0.55 : a.key === 'fig' ? 0.55 : a.key === 'barty' ? 0.7 : 0.85;
    const box = { x0: 0, x1: 0, y0: -100, y1: -99, z0: 0, z1: 0, staff: true };
    ctx.colliders.push(box);
    return { a, r, box };
  });
  function bodiesUpdate(dt) {
    const v = H.visitor;
    for (const { a, r, box } of bodies) {
      const m = a.m, y = m.y;
      if (a.taskName === 'demo' && !demo) { box.y0 = -100; box.y1 = -99; continue; }
      box.x0 = m.x - r; box.x1 = m.x + r; box.z0 = m.z - r; box.z1 = m.z + r;
      if (a === H.roomba) { box.y0 = y; box.y1 = y + 1.6; } else { box.y0 = y + 0.6; box.y1 = y + a.spec.hover + 0.8; }
      if (!v.present || Math.abs(v.y - y) > 3) continue;
      const dx = m.x - v.x, dz = m.z - v.z, d = Math.hypot(dx, dz), want = r + 0.72 + 0.4;
      if (d >= want || d < 1e-3) continue;
      const nv = a.outdoor ? out : nav, need = a.outdoor ? 1.2 : 2;
      const step = Math.min(want - d, dt * 2.5);
      for (const turn of [0, 0.8, -0.8, 1.6, -1.6]) {
        const c = Math.cos(turn), s2 = Math.sin(turn), ux = (dx * c - dz * s2) / d, uz = (dx * s2 + dz * c) / d;
        const x = m.x + ux * step, z = m.z + uz * step;
        if (nv.freeAt(m.f, x, z, need, true)) { m.x = x; m.z = z; H.events.glides = (H.events.glides ?? 0) + 1; break; }
      }
    }
  }

  // ---- The visitor ------------------------------------------------------------------------------
  const dir = new THREE.Vector3(), to = new THREE.Vector3();
  let poiTimer = 0;
  const poiPts = POIS.map(p => ({ p, x: wx(p.at[0]), y: p.h, z: wz(p.at[1]), f: p.floor }));
  const mine = new Set([...H.robots, ...H.gardeners, H.roomba].map(a => a.inter));
  function watchVisitor() {
    const v = H.visitor, w = ctx.walker;
    const present = !!w && (ctx.mode === 'walk' || ctx.forcePresent);
    if (present && !v.present) v.since = H.now;
    v.present = present;
    if (!present) { v.room = null; return; }
    v.x = w.pos.x; v.y = w.pos.y; v.z = w.pos.z; v.f = nav.floorOf(w.pos.y + 0.5);
    v.fx = -Math.sin(w.yaw); v.fz = -Math.cos(w.yaw); v.seated = w.seated;
    const room = nav.roomAt(v.x, v.y + 0.5, v.z)?.name ?? null;
    const outside = !room || /terrace|front porch/i.test(room);
    if (outside && !v.outside) v.outSince = H.now;
    v.outside = outside;
    if (room !== v.room) { v.room = room; v.roomSince = H.now; if (room) H.mem.rooms.add(room); }
    if ((poiTimer -= H.dt) > 0) return;
    poiTimer = 0.3;
    camera.getWorldDirection(dir);
    let best = null, ba = 0.2;
    for (const q of poiPts) {
      if (q.f !== v.f) continue;
      to.set(q.x - camera.position.x, q.y - camera.position.y, q.z - camera.position.z);
      const d = to.length(); if (d > 16 || d < 1) continue;
      const a = Math.acos(Math.max(-1, Math.min(1, to.dot(dir) / d)));
      if (a < ba) { const k = Math.max(0, (d - 0.8) / d); if (nav.see(v.f, camera.position.x, camera.position.z, camera.position.x + to.x * k, camera.position.z + to.z * k)) { ba = a; best = q.p; } }
    }
    if (best !== v.poi) { v.poi = best; v.poiSince = H.now; }
    let aim = null, score = 0.92;
    for (const it of ctx.interact) {
      if (!it || mine.has(it)) continue;
      to.set(it.x - camera.position.x, it.y - camera.position.y, it.z - camera.position.z);
      const d = to.length(); if (d > it.reach) continue;
      const s = to.multiplyScalar(1 / d).dot(dir) - d * 0.004;
      if (s > score) { score = s; aim = it; }
    }
    try { v.aimed = aim ? (aim.label?.() ?? null) : null; } catch { v.aimed = null; }
  }

  // ---- Keeping the plan up to date as the furniture arrives ------------------------------------
  let lastSig = '', sigTimer = 0;
  function maybeRebuild(force = false) {
    const sig = `${ctx.colliders.length}|${scene.children.length}`;
    if (!force && sig === lastSig) return;
    lastSig = sig; nav.rebuild(group); findSpots(); out.rebuild(); H.gspots = gardenSpots(out, ctx);
    for (const a of [...H.robots, H.roomba]) {
      if (!nav.free(a.m.f, nav.cellOf(a.m.x, a.m.z), a.m.need, a.m.opener)) {
        const c = nav.nearest(a.m.f, a.m.x, a.m.z, a.m.need, 6, a.m.opener);
        if (c >= 0) { a.m.x = nav.cx(c); a.m.z = nav.cz(c); a.m.y = nav.floorY(a.m.f, a.m.x, a.m.z); }
      }
    }
    for (const g of H.gardeners) if (!out.freeAt(0, g.m.x, g.m.z, 1.2)) { const c = out.nearest(0, g.m.x, g.m.z, 1.2, 10); if (c >= 0) { g.m.x = out.cx(c); g.m.z = out.cz(c); } }
  }

  // ---- Bubbles on screen -------------------------------------------------------------------------
  const head = new THREE.Vector3();
  let demo = false;
  function placeBubbles() {
    const cf = camFloor(), cx = camera.position.x, cz = camera.position.z, show = ctx.mode === 'walk' || demo;
    for (const a of [...H.robots, ...H.gardeners, H.roomba]) {
      const pos = a.headPos(head);
      const vis = show && a.f === cf && Math.hypot(pos.x - cx, pos.z - cz) < 34 && (demo || nav.see(cf, cx, cz, pos.x, pos.z));
      H.bubbles.place(a.bubble, pos, H.now, vis);
    }
    H.bubbles.update(H.now);
  }
  H.roomba.headPos = out => out.set(H.roomba.x, H.roomba.y + 0.9, H.roomba.z);

  // ---- One step of the world --------------------------------------------------------------------
  const near = a => { const p = camera.position; return Math.abs(p.y - a.y - 3) < 9 && Math.hypot(p.x - a.x, p.z - a.z) < 70; };
  function step(dt, draw) {
    H.dt = dt; H.now += dt;
    watchVisitor();
    for (const r of H.robots) r.update(dt, H.now, draw && near(r));
    for (const g of H.gardeners) g.update(dt, H.now, draw && near(g));
    H.roomba.update(dt, H.now);
    H.talk.update();
    holdUpdate(); emptiesUpdate(); bodiesUpdate(dt);
    if (H.host && ![...H.robots, ...H.gardeners].some(r => r === H.host && ['host', 'greet', 'fetch', 'deliver', 'clear'].includes(r.taskName))) H.host = null;
  }

  // ---- Demos for still pictures -------------------------------------------------------------------
  function stage(kind) {
    demo = true;
    camera.getWorldDirection(dir); const L = Math.hypot(dir.x, dir.z) || 1, ux = dir.x / L, uz = dir.z / L, rx = -uz, rz = ux;
    const f = nav.floorOf(camera.position.y - 4), F = nav.FLOORS[f], cam = camera.position;
    const at = (a, fwd, side) => { const x = cam.x + ux * fwd + rx * side, z = cam.z + uz * fwd + rz * side; a.m.place(x, z, f); a.m.y = F; a.m.yaw = Math.atan2(cam.x - x, cam.z - z); return a; };
    const hold = a => a.run('demo', (function* () { for (;;) yield; })(), false);
    for (const a of [...H.robots, ...H.gardeners, H.roomba]) { a.m.place(cam.x + 200, cam.z + 200, f); hold(a); }
    const sayR = (r, text, expr) => { r.say(text, { secs: 1e6, expr, toGuest: false }); r.expr = expr; r.exprUntil = 1e9; };
    const tray = (r, id) => { const d = [...MENU, ...GARDEN_GIFTS].find(m => m.id === id), g = H.makeDrink(d); r.drinkObj = g; r.body.slot.add(g); r.body.tray.visible = true; r.carrying = d; r.forGuest = true; };
    if (kind === 'robots') {
      const [b, m, g] = H.robots;
      at(b, 8.5, -0.3); at(m, 9.5, -3.6); at(g, 8, 3.1);
      sayR(b, 'Welcome, darling. I run this house. Madame thinks she does. Adorable.', 'sass');
      sayR(m, 'Please wipe your feet.', 'neutral'); sayR(g, 'Hiii! I do upstairs!', 'happy');
      tray(b, 'phin'); m.anim = 'dust';
    } else if (kind === 'drinks') {
      MENU.forEach((d, i) => { const g = H.makeDrink(d), k = i - (MENU.length - 1) / 2; g.position.set(cam.x + ux * 3.2 + rx * k * 0.42, cam.y - 0.75, cam.z + uz * 3.2 + rz * k * 0.42); g.scale.setScalar(1.15); if (d.id === 'phin') { g.userData.making = true; H.fill(g, 0.6, 0.3); } group.add(g); });
    } else if (kind === 'garden') {
      const [b, t] = H.gardeners;
      at(b, 8, -1.6); at(t, 9.5, 2.4); tray(b, 'lemonade');
      sayR(b, "A strawberry, love? Sun-warm. Or lemonade, I'll knock on the kitchen door.", 'happy');
      sayR(t, 'Thistle. Gardener. The other one.', 'neutral');
      t.pushing = true; t.anim = 'push'; t.update(0.016, H.now, true);
    } else if (kind === 'reggie') {
      at(H.roomba, 4.5, 0.4); H.roomba.bubble.say('*beep boop*', 1e6, H.now);
    } else {
      const [b] = H.robots;
      at(b, 6.5, 0.8); tray(b, 'latte');
      sayR(b, 'One latte, darling. With a little heart on top. Take it before I get attached.', 'happy');
      H.visitor.present = true; H.talk.open(b, b.dialogue());
    }
  }

  // ---- Running ------------------------------------------------------------------------------------
  let started = false, since = 0;
  const wantDemo = Q.get('staffdemo'), fastForward = Number(Q.get('stafftime') ?? 0);
  function tick(t, dt) {
    since += dt; sigTimer -= dt;
    if (sigTimer <= 0) { sigTimer = 1.5; maybeRebuild(); }
    if (!started && (typeof window === 'undefined' || window.__ready || since > 14 || headless)) {
      started = true; maybeRebuild(true);
      if (fastForward > 0) { const n = Math.ceil(fastForward * 15); for (let i = 0; i < n; i++) step(1 / 15, false); }
      if (wantDemo) stage(wantDemo);
    }
    if (demo) { H.dt = Math.min(dt, 0.05); for (const r of [...H.robots, ...H.gardeners]) r.update(H.dt, H.now += H.dt, true); placeBubbles(); return; }
    step(Math.min(dt, 0.05), !headless);
    if (!headless) placeBubbles();
  }
  if (!headless) ctx.animated.push(tick);

  const api = {
    H, nav, step: (dt = 1 / 30) => tick(H.now, dt), rebuild: () => maybeRebuild(true), stage,
    // For the logic test: is anybody inside a wall or a piece of furniture?
    check() {
      const bad = [];
      for (const g of H.gardeners) {
        const x = g.m.x, z = g.m.z, hit = ctx.colliders.find(c => !c.off && !c.staff && c.y0 < 2.5 && c.y1 > 0.4 && x > c.x0 + 0.02 && x < c.x1 - 0.02 && z > c.z0 + 0.02 && z < c.z1 - 0.02);
        if (hit) bad.push({ who: g.name, x, z, f: 0, task: g.taskName, box: hit });
        else if (!out.freeAt(0, x, z, 0.01)) bad.push({ who: g.name, x, z, f: 0, task: g.taskName + ' (in a bed, the pond or off the plan)', box: { x0: x, x1: x, z0: z, z1: z, y0: 0, y1: 0 } });
      }
      for (const a of [...H.robots, H.roomba]) {
        if (a.taskName === 'demo') continue;
        const F = nav.FLOORS[a.m.f], x = a.m.x, z = a.m.z;
        const hit = ctx.colliders.find(c => !c.off && !c.staff && c.y0 < F + 4.6 && c.y1 > F + 0.15 && x > c.x0 + 0.02 && x < c.x1 - 0.02 && z > c.z0 + 0.02 && z < c.z1 - 0.02);
        if (hit) bad.push({ who: a.name, x, z, f: a.m.f, task: a.taskName, box: hit });
      }
      return bad;
    },
    cost() {
      let calls = 0, tris = 0;
      group.traverseVisible(o => { if (!o.isMesh) return; calls++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; });
      return { calls, tris: Math.round(tris) };
    },
    status: () => [...H.robots, ...H.gardeners, H.roomba].map(a => ({ who: a.name, x: +a.x.toFixed(1), z: +a.z.toFixed(1), f: a.f, task: a.taskName, room: a.outdoor ? 'garden' : nav.roomAt(a.x, nav.FLOORS[a.f] + 1, a.z)?.name ?? '-', carrying: a.carrying?.name ?? '' })),
  };
  if (typeof window !== 'undefined') window.__staff = api;
  return api;
}
