// Flying the airship (bus.js) with or without the visitor aboard: called by a bell, coming in from far
// off across the sky, docking at a stage, taking the visitor on a pleasure flight and back, or out into
// a cloud bank and on to another place; arriving from another place; drifting past in the distance now
// and then when nobody has rung. Shared by Anna's House, Vesper Street and Cloud Spring Harbor: it imports three
// and bus.js only, and everything about the place (the dock, the paths, the alighting point, what is
// said, where the line goes from here: see line.js) comes in as data.
//
//   const air = makeAirship(ctx, data)      (it pushes its own per-frame step onto ctx.animated)
//   air.call()      ring for it. Where she can go to more than one place from here (transit.stops), ringing again
//                   while she stands at the stop with nobody aboard turns her blind to the next of them ('turned')
//   air.bound       the stop she is bound for ({ name, blind, url, ... } from transit.stops), or null
//   air.other       the stop a ring would turn her blind to just now, or null (for the bell's label)
//   Boarding is on foot: while she is docked with her door open, walk up her gangplank. Once you are inside she
//   shuts the door and goes; with more than one place to go (her stops, the flight round the island) she first asks
//   where to, on a small card (a number key or a click; Esc and she waits). Aboard you can walk about, stand at the front, or sit on any bench (E), also in flight;
//   back at the stop the door opens and you walk off when you like.
//   air.getOff()    in the air: she turns back to the stop (asked twice: she is there at once); while the door is
//                   closing: she opens it again and stays
//   air.board()     put the visitor aboard without the walk (tests)
//   air.arrive()    start aboard, sat by the window, coming down out of cloud to the stop (a visitor from the other place)
//   air.state, air.bus, air.aboard, air.canBoard, air.doorAt (world point at the foot of the gangplank, or null)
//   air.stage(name, k)  for test views: 'docked', 'coming', 'tour', 'pass', 'arrive', 'depart' at fraction k
//
// ctx fields used: scene (the bus is added to it), camera, animated, interact (optional: the benches and the
// bell cord are put on it), walker (pos, yaw, pitch, seated, sit(), apply(), colliders, rim, wasSeated, grounded,
// vy), mode ('walk' while walking: leaving it sets the visitor down), sound (optional: isMuted(), volume()),
// day (optional: light 0..1), renderer (optional: toneMappingExposure).
//
// data:
//   dock:   { x, y, z, yaw }   the bus's pose at the stage (y = its cabin floor: where she stands on a road, the road
//                              plus bus.wheel; yaw as an Object3D's: forward is (sin yaw, cos yaw). At a quarter turn her
//                              hull is a box among the walker's colliders; at any other heading the walker is held off
//                              her in her own frame instead)
//   alight: { x, y, z, yaw }   where the visitor is set down if they leave walking view while aboard (walker feet; yaw as walk.js)
//   approach: [[x,y,z], ...]   from far off to just short of the dock, the last points in line with the dock's yaw
//   lineup:   how many of approach's last points she flies through when coming back early (default 2)
//   leave:    [[x,y,z], ...]   from just past the dock away out of sight
//   tour:     [{ p: [x,y,z], say: 'text' }, ...] or null: a pleasure flight from the dock and back (end it in line with the dock)
//   transit:  { url: '', query: () => '?from=house', cloud: [[x,y,z], ...] }: when url is set, boarding flies the
//             cloud path, whites out and goes to url + query(); with no url, never.
//             Or, for a stop with more than one place to go: { stops: [{ name, blind, url }, ...], query: stop => '?from=..',
//             cloud }: she is bound for the first; ringing again while she stands turns her blind to the next, and
//             round. (stops may be a getter: it is read afresh each time. Empty: she only goes round the island.)
//   arrive:   [[x,y,z], ...]   from inside a cloud to just short of the dock (for a visitor from the other place)
//   passes:   [[[x,y,z], ...], ...] far-off paths for the fly-past; firstPass, passEvery: [min, max] seconds
//   blind:    { tour, transit, home }   what the destination blind reads
//   say(text)          how the bus speaks (a toast, a bubble); lines: extra or replacement lines (see DANDELION)
//   hint(text|null)    optional: what to show while aboard; onDock(open) optional: the stage's gate
//   secs:     { approach, tour, transit, arrive, leave, pass, dwell } seconds (defaults below)
//   bus:      options for buildBus (e.g. { plank: 9, drop: 0 }: the gangplank's length, and how far it slopes down to the ground)
//   steady:   optional, for a stop she must come down to and go up from steeply: true, or { level: [0.6, 9], heading:
//             [14, 22], within: 60 } (feet above the dock, and feet from it across the ground). Below level[1] her nose
//             and bank are eased out, to nothing at level[0]; below heading[1] she is eased round to the dock's
//             heading, and holds it below heading[0]. Left out, she flies as her path slopes until the instant she arrives.

import * as THREE from 'three';
import { buildBus, DANDELION } from './bus.js';

const smooth = k => k * k * (3 - 2 * k);
const EASE = { inout: smooth, out: k => 1 - Math.pow(1 - k, 2.2), in: k => k * k, line: k => k, cruise: k => (k < 0.1 ? k * k / 0.18 : k > 0.9 ? 1 - (1 - k) * (1 - k) / 0.18 : (k - 0.05) / 0.9) };      // speeds up, cruises, slows
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

// ---- Flight: moves an object along a smooth path, nose along the way, banking into turns ------------
export class Flight {
  constructor(obj) { this.obj = obj; this.leg = null; this.yaw = obj.rotation.y; this.roll = 0; this.pitch = 0; this.steady = null; }
  // near the ground at a steep stop (data.steady): level, and on the stop's heading
  settle() {
    const S = this.steady; if (!S) return;
    const p = this.obj.position, h = p.y - S.y; if (h >= S.heading[1] || Math.hypot(p.x - S.x, p.z - S.z) >= S.within) return;
    const s = k => smooth(Math.max(0, Math.min(1, k))), f = s((h - S.level[0]) / (S.level[1] - S.level[0])), y = s((h - S.heading[0]) / (S.heading[1] - S.heading[0]));
    this.pitch *= f; this.roll *= f; this.yaw = S.yaw + wrap(this.yaw - S.yaw) * y; this.apply();
  }
  place(p) { this.leg = null; this.obj.position.set(p.x, p.y, p.z); this.yaw = p.yaw ?? this.yaw; this.roll = this.pitch = 0; this.apply(); }
  apply() { this.obj.rotation.set(this.pitch, this.yaw, this.roll, 'YXZ'); this.obj.updateMatrixWorld(); }
  // points: where to go from here; the path starts where the object now is
  go(points, secs, { ease = 'inout', marks = [], onDone = null, endYaw = null } = {}) {
    const pts = [this.obj.position.clone()];
    for (const p of points) { const v = Array.isArray(p) ? new THREE.Vector3(...p) : new THREE.Vector3(p.x, p.y, p.z); if (v.distanceTo(pts.at(-1)) > 0.5) pts.push(v); }
    if (pts.length < 2) pts.push(pts[0].clone().add(new THREE.Vector3(0, 0.01, 0)));
    const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
    this.leg = { curve, secs: Math.max(0.1, secs), t: 0, ease: EASE[ease] ?? EASE.inout, marks: marks.map(m => ({ ...m })), onDone, endYaw, k: 0 };
    return this.leg;
  }
  // where along the path each of the given points falls (0..1 of its length), for marks
  static fractions(curve, n) { const L = curve.getLengths(400), tot = L.at(-1); return Array.from({ length: n }, (_, i) => L[Math.round((i / (n - 1)) * 400)] / tot); }
  seek(k) { if (this.leg) { this.leg.t = k * this.leg.secs; for (const m of this.leg.marks) if (m.u <= this.leg.ease(k)) m.done = true; this.update(0, true); } }
  get k() { return this.leg ? this.leg.k : 1; }
  update(dt, snap = false) { this.advance(dt, snap); this.settle(); }
  advance(dt, snap) {
    const L = this.leg; if (!L) return;
    L.t += dt; const k = Math.min(1, L.t / L.secs), u = Math.min(1, Math.max(0, L.ease(k))); L.k = k;
    const p = L.curve.getPointAt(u), tan = L.curve.getTangentAt(Math.min(0.999, Math.max(0.001, u)));
    this.obj.position.copy(p);
    const flat = Math.hypot(tan.x, tan.z);
    let want = flat > 0.05 ? Math.atan2(tan.x, tan.z) : this.yaw;
    if (L.endYaw !== null && k > 0.85) want = this.yaw + wrap(L.endYaw - this.yaw) * ((k - 0.85) / 0.15);
    const dy = wrap(want - this.yaw), turn = snap ? dy : dy * (1 - Math.exp(-dt * 3.5));
    this.yaw = wrap(this.yaw + turn);
    const rate = dt > 0 ? turn / dt : 0, speed = L.curve.getLength() / L.secs;
    const rollAim = THREE.MathUtils.clamp(-rate * speed * 0.004, -0.2, 0.2), pitchAim = THREE.MathUtils.clamp(-Math.atan2(tan.y, Math.max(0.05, flat)) * 0.45, -0.13, 0.13);
    const f = snap ? 1 : 1 - Math.exp(-dt * 2);
    this.roll += (rollAim - this.roll) * f; this.pitch += (pitchAim - this.pitch) * f;
    if (k >= 1) { this.roll = 0; this.pitch = 0; if (L.endYaw !== null) this.yaw = L.endYaw; }
    this.apply();
    for (const m of L.marks) if (!m.done && u >= m.u) { m.done = true; m.fn?.(); }
    if (k >= 1) { this.leg = null; L.onDone?.(); }
  }
}

// ---- The rider: the visitor aboard, walking about, standing or sat down, carried with the bus --------
// Their feet are kept in the bus's own frame (this.l). Each frame, before the bus moves, pre() reads where
// the walker has walked to since (walk.js moved it in the world, with no walls: the walker's own colliders
// and the island's rim are set aside while aboard) and holds that to the deck (bus.hold); after the bus has
// moved, post() puts the walker back in the world at the same place on the deck, turned as the bus turned.
export class Rider {
  constructor(ctx, bus) {
    this.ctx = ctx; this.bus = bus; this.on = false; this.l = new THREE.Vector3(0, 0, 0); this.v = new THREE.Vector3(); this.inv = new THREE.Matrix4(); this.lastYaw = 0; this.saved = null;
    this.seats = bus.seats.map((local, i) => ({ x: 0, y: -999, z: 0, yaw: 0, label: 'ride the airship', airship: true, i, local }));
  }
  get walker() { return this.ctx.walker; }
  get seat() { const s = this.walker?.seated; return s && s.airship ? s : null; }
  get inside() { return this.on && this.l.x > -3.3; }
  toLocal(p) { const r = this.bus.root; r.updateMatrixWorld(); return this.v.copy(p).applyMatrix4(this.inv.copy(r.matrixWorld).invert()); }
  // step aboard where they stand (or at a given place in the bus's frame)
  capture(local) {
    const w = this.walker; if (!w || this.on) return;
    if (local) this.l.copy(local); else this.l.copy(this.toLocal(w.pos));
    this.on = true; this.lastYaw = this.bus.root.rotation.y;
    this.saved = { colliders: w.colliders, rim: w.rim }; w.colliders = []; w.rim = null;
    this.post();
  }
  release() {
    const w = this.walker; this.on = false; if (!w) return;
    if (this.saved) { w.colliders = this.saved.colliders; w.rim = this.saved.rim; this.saved = null; }
    if (w.seated?.airship) w.seated = null;
    for (const s of this.seats) s.y = -999;
  }
  sit(i, look = 0, pitch = -0.05) {
    const w = this.walker, s = this.seats[i]; if (!w || !s || !this.on) return;
    this.l.set(Math.sign(s.local.x) * 0.45, 0, s.local.z + 0.25); this.post();      // standing up again puts you in the aisle beside it
    if (w.sit) w.sit(s); else w.seated = s;
    w.yaw = s.yaw + look; w.pitch = pitch; this.ctx.camera?.position.set(s.x, s.y, s.z);
  }
  pre(doorOpen) {
    const w = this.walker; if (!this.on || !w) return true;
    if (!this.seat) { const p = this.toLocal(w.pos); this.l.x = p.x; this.l.z = p.z; }
    return this.bus.hold(this.l, doorOpen);
  }
  post() {
    const w = this.walker, r = this.bus.root; if (!this.on || !w) return;
    r.updateMatrixWorld(); w.yaw += wrap(r.rotation.y - this.lastYaw); this.lastYaw = r.rotation.y;
    this.l.y = this.bus.deckY(this.l); w.pos.copy(this.v.copy(this.l).applyMatrix4(r.matrixWorld)); w.vy = 0; w.grounded = true;
    for (const s of this.seats) { this.v.copy(s.local).applyMatrix4(r.matrixWorld); s.x = this.v.x; s.y = this.v.y; s.z = this.v.z; s.yaw = r.rotation.y + Math.PI; }      // walk.js: yaw 0 looks toward -z, so the bus's forward (+z) is yaw + PI
    const s = this.seat;
    if (s) this.ctx.camera?.position.set(s.x, s.y, s.z); else { w.wasSeated = false; w.apply?.(); }
  }
  // set down in the world (only when the visitor leaves walking view while aboard)
  alight(p) {
    const w = this.walker; this.release(); if (!w || !p) return;
    if (w.place) w.place(p.x, p.y, p.z, p.yaw ?? w.yaw, 0); else { w.pos?.set(p.x, p.y, p.z); w.yaw = p.yaw ?? w.yaw; w.pitch = 0; }
    w.wasSeated = false; w.grounded = true; w.vy = 0;
  }
}

// ---- A horn like a brass band's tuba: two low notes, oom-PAH. Its own tiny audio graph, made on the
// first call (the bell is a gesture, so the browser allows it); quiet, and silent when the house is muted.
let AC = null;
// A soft engine purr while she flies with you aboard: two low detuned oscillators through a lowpass, faded in and out.
// Uses the horn's audio context (so only once there has been a gesture), and is silent when the house is muted.
let purrNodes = null;
export function purr(sound, on) {
  try {
    if (!AC && !on) return;
    AC ??= new (window.AudioContext || window.webkitAudioContext)();
    if (!purrNodes) {
      const g2 = AC.createGain(), lp = AC.createBiquadFilter(), a = AC.createOscillator(), b = AC.createOscillator(), lfo = AC.createOscillator(), lg = AC.createGain();
      a.type = 'sawtooth'; a.frequency.value = 46; b.type = 'triangle'; b.frequency.value = 46.7; lp.type = 'lowpass'; lp.frequency.value = 170;
      lfo.frequency.value = 7.5; lg.gain.value = 0.25; lfo.connect(lg); lg.connect(g2.gain);
      g2.gain.value = 0; a.connect(lp); b.connect(lp); lp.connect(g2); g2.connect(AC.destination); for (const o of [a, b, lfo]) o.start();
      purrNodes = { g2, lg };
    }
    const v = on && !sound?.isMuted?.() ? 0.035 * (sound?.volume?.() ?? 1) : 0;
    purrNodes.g2.gain.setTargetAtTime(v, AC.currentTime, 0.6); purrNodes.lg.gain.setTargetAtTime(v * 0.3, AC.currentTime, 0.6);
  } catch { /* no sound here */ }
}
export function horn(sound, vol = 0.5, notes = [[41, 0, 0.32], [46, 0.4, 0.8]]) {
  try {
    if (sound?.isMuted?.()) return;
    AC ??= new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    const v = vol * (sound?.volume?.() ?? 1); if (v < 0.005) return;
    for (const [m, at, len] of notes) {
      const t = AC.currentTime + at + 0.02, f = 440 * Math.pow(2, (m - 69) / 12);
      const o = AC.createOscillator(), o2 = AC.createOscillator(), lp = AC.createBiquadFilter(), g2 = AC.createGain(), vib = AC.createOscillator(), vg = AC.createGain();
      o.type = 'sawtooth'; o.frequency.value = f; o2.type = 'triangle'; o2.frequency.value = f / 2;
      vib.frequency.value = 5.2; vg.gain.value = f * 0.006; vib.connect(vg); vg.connect(o.frequency);
      lp.type = 'lowpass'; lp.frequency.setValueAtTime(220, t); lp.frequency.linearRampToValueAtTime(700, t + 0.08); lp.frequency.exponentialRampToValueAtTime(380, t + len); lp.Q.value = 1.2;
      g2.gain.setValueAtTime(0.0001, t); g2.gain.exponentialRampToValueAtTime(0.16 * v, t + 0.07); g2.gain.setValueAtTime(0.16 * v, t + len * 0.7); g2.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.12);
      o.connect(lp); o2.connect(lp); lp.connect(g2); g2.connect(AC.destination);
      for (const x of [o, o2, vib]) { x.start(t); x.stop(t + len + 0.2); }
    }
  } catch { /* no sound here */ }
}

// ---- A veil over the view: cloud closing in (white), or a blink -------------------------------------
export function makeVeil(color = '#f4f6f8') {
  if (typeof document === 'undefined') return { set() {}, get() { return 0; } };
  const el = document.createElement('div'); el.style.cssText = `position:fixed;inset:0;z-index:7;pointer-events:none;background:${color};opacity:0`; document.body.appendChild(el);
  // (The value is always kept exactly; only the write to the page is skipped for changes too small to see. It used
  // to drop those changes altogether, so a slow fade stalled with a third of the cloud still on the glass.)
  let o = 0, shown = 0;
  return { set(v) { v = Math.max(0, Math.min(1, v)); if (v < 0.004) v = 0; o = v; if (Math.abs(v - shown) < 0.002 && v !== 0 && v !== 1) return; shown = v; el.style.opacity = String(v); }, get: () => o };
}

// ---- The service --------------------------------------------------------------------------------------
export function makeAirship(ctx, D) {
  const L = { ...DANDELION.lines, ...(D.lines ?? {}) }, SECS = { approach: 32, tour: 100, transit: 34, arrive: 30, leave: 30, pass: 110, dwell: 75, ...(D.secs ?? {}) };
  const V = p => (Array.isArray(p) ? p : [p.x, p.y, p.z]);
  const dock = D.dock, dockP = [dock.x, dock.y, dock.z];
  const pick = a => (Array.isArray(a) ? a[Math.floor(Math.random() * a.length)] : a);
  const speak = k => { const s = pick(L[k]); if (s) D.say?.(s); };
  const veil = makeVeil();
  let bus = null, flight = null, rider = null, state = 'away', timer = 0, dwell = 0, door = 0, doorAim = 0, armAim = 0, veilAim = 0, veilRate = 1;
  let passT = D.firstPass ?? 120 + Math.random() * 120, shownHint = undefined, started = false, ret = 0, tipped = 1, fromAway = false, purring = false;
  let fresh = true, insideT = 0, hull = null, spots = [];      // fresh: they have stepped aboard since she last set them down (so she may go)
  // where she goes from here: one place (transit.url), or several (transit.stops), of which she is bound for one
  let bound = 0, tell = 0;
  const dests = () => D.transit?.stops ?? (D.transit?.url ? [{ url: D.transit.url }] : []);
  const dest = () => { const d = dests(); return d.length ? d[bound % d.length] : null; };
  const next = () => { const d = dests(); return d.length > 1 ? d[(bound + 1) % d.length] : null; };
  const turnable = () => state === 'docked' && !rider?.on && !!next();      // a ring now turns her blind
  const open = () => !!dest()?.url;
  function make() {
    if (bus) return bus;
    bus = buildBus(D.bus ?? {}); bus.root.visible = false; ctx.scene.add(bus.root);
    flight = new Flight(bus.root); rider = new Rider(ctx, bus);
    if (D.steady) flight.steady = { level: [0.6, 9], heading: [14, 22], within: 60, ...(D.steady === true ? {} : D.steady), x: dock.x, y: dock.y, z: dock.z, yaw: dock.yaw };
    // while she stands at the stop she is solid: her hull, as a box in the world where the dock's yaw is a quarter turn
    // (at any other heading a box square to the world would not be her shape: the walker is fended off in her own frame, below)
    { const c = Math.cos(dock.yaw), sn = Math.sin(dock.yaw), xs = [], zs = [];
      for (const [x, z] of [[-4.15, -10.3], [4.15, -10.3], [-4.15, 12.7], [4.15, 12.7]]) { xs.push(dock.x + x * c + z * sn); zs.push(dock.z - x * sn + z * c); }
      hull = { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs), y0: dock.y - 3, y1: dock.y + 9, off: true };
      hull.askew = Math.abs(Math.sin(2 * dock.yaw)) > 1e-6;
      if (!hull.askew) ctx.walker?.colliders?.push?.(hull); }
    // the benches (sit anywhere), and the speaking tube by her face (ask her to turn back)
    if (ctx.interact) {
      spots = rider.seats.map(s => ({ x: 0, y: -999, z: 0, reach: 6.5, size: 1.0, seat: s, label: () => 'sit down', act: () => rider.sit(s.i) }));
      spots.push({ x: 0, y: -999, z: 0, reach: 7, size: 1.0, tube: new THREE.Vector3(-1.75, 4.5, 8.2), label: () => (state === 'returning' ? 'ask to be there at once' : 'ask Dandelion to turn back to the stop'), act: () => getOff() });
      ctx.interact.push(...spots);
    }
    return bus;
  }
  const show = v => { if (bus) bus.root.visible = v; };
  const setDoor = on => { doorAim = on ? 1 : 0; armAim = on ? 1 : 0; bus?.flash(on); D.onDock?.(on); };
  const blind = k => bus?.setBlind((k === 'transit' ? dest()?.blind : null) ?? D.blind?.[k] ?? '');
  // her hull at a heading that is not a quarter turn: the walker is put back outside it, the nearest way, in her frame
  function fend(w) {
    const dx = w.pos.x - dock.x, dz = w.pos.z - dock.z, c = Math.cos(dock.yaw), sn = Math.sin(dock.yaw), x = dx * c - dz * sn, z = dx * sn + dz * c;
    const RAD = 0.72, hx = 4.15 + RAD, z0 = -10.3 - RAD, z1 = 12.7 + RAD;
    if (Math.abs(x) >= hx || z <= z0 || z >= z1 || w.pos.y > dock.y + 9) return;
    const a = hx - Math.abs(x), b = z - z0, e = z1 - z, m = Math.min(a, b, e), nx = m === a ? (x < 0 ? -hx : hx) : x, nz = m === a ? z : m === b ? z0 : z1;
    w.pos.x = dock.x + nx * c + nz * sn; w.pos.z = dock.z - nx * sn + nz * c; w.apply?.();
  }
  const hornAt = (near = 1) => horn(ctx.sound, 0.55 * near);
  const lineup = () => (D.approach ?? []).slice(-(D.lineup ?? 2));

  function docked(first = true) {
    flight.place(dock); show(true); state = 'docked'; setDoor(true); dwell = SECS.dwell; blind(open() ? 'transit' : 'tour');
    bus.setFace('happy'); if (first) { speak('arrive'); bus.wave?.(); tell = 4.5; }
  }
  function call() {
    if (state === 'away' || state === 'passing') {
      make(); state = 'wait'; timer = D.wait ?? 3; flight.leg = null; show(false); return 'rung';
    }
    if (state === 'wait' || state === 'coming') { speak('coming'); return 'coming'; }
    if (turnable()) {      // two places to go and one blind: ringing again turns it
      bound = (bound + 1) % dests().length; tell = 0; dwell = Math.max(dwell, 20); blind('transit'); bus.wave?.();
      D.say?.(`${dest().name} it is. All aboard who is coming aboard.`); return 'turned';
    }
    if (state === 'docked' || state === 'unloading') { bus.wave?.(); speak('here'); return 'here'; }
    if (state === 'leaving') { state = 'coming'; setDoor(false); blind(open() ? 'transit' : 'tour'); flight.go([...lineup(), dockP], 12, { ease: 'inout', onDone: docked }); speak('rung'); return 'rung'; }
    return 'busy';
  }
  function come() {
    const A = D.approach; flight.place({ x: A[0][0], y: A[0][1], z: A[0][2], yaw: Math.atan2(A[1][0] - A[0][0], A[1][2] - A[0][2]) }); show(true); state = 'coming'; bus.setFace('neutral'); blind(open() ? 'transit' : 'tour');
    flight.go([...A.slice(1), dockP], SECS.approach, { ease: 'out', endYaw: dock.yaw, marks: [{ u: 0.02, fn: () => hornAt(0.35) }, { u: 0.86, fn: () => hornAt(1) }], onDone: docked });
  }
  const canGo = () => open() || !!D.tour?.length;                                              // somewhere to go: the other place, or round
  const canBoard = () => state === 'docked' && door > 0.85;
  const shut = (quiet = false) => { state = 'closing'; setDoor(false); timer = 2.6; if (!quiet) speak('board'); bus.setFace('happy'); };
  // ---- "Where to?": with more than one place to go, she asks once you are inside, and goes where she is told.
  // The places are her stops from here and, where there is one, the flight round the island. A small card, the same
  // at every stop: a number key or a click chooses; Esc (or walking off again) and she waits with the door open.
  let ask = null, wish = null;      // wish 'tour': round the island though the line is open
  const choices = () => [
    ...dests().map((d, i) => ({ d, i })).filter(c => c.d.url).map(c => ({ name: c.d.name ?? 'the other side of the clouds', go: () => { bound = c.i; wish = null; } })),
    ...(D.tour?.length ? [{ name: 'just round the island', tour: true, go: () => { wish = 'tour'; } }] : []),
  ];
  function askClose() { if (!ask) return; removeEventListener('keydown', ask.key, true); cancelAnimationFrame(ask.raf); ask.el.remove(); ask = null; }
  function choose(i) {
    const c = ask?.list[i]; if (!c) return;
    c.go(); askClose(); tell = 0; blind(c.tour ? 'tour' : 'transit'); bus.wave?.();
    D.say?.(c.tour ? 'Round the island it is. Sit anywhere.' : `${c.name} it is. Sit anywhere.`); shut(true);
  }
  // The card is the one the robots' conversations use (staff/talk.js, clerks/talk.js, faculty/talk.js: the same paper at
  // the lower right, the name above, a key cap before each line, the hint below), and it answers the same way: a
  // number chooses at once; E moves down the list, and the highlighted line is taken after a moment's pause.
  const ASK_CSS = `
#airship-ask { position: fixed; right: max(16px, 5vw); bottom: calc(16% + 10px); min-width: 240px; max-width: min(400px, calc(100vw - 32px));
  padding: 10px 14px 9px; border-radius: 3px; background: var(--grain, none), var(--paper, #f0e5cf); color: var(--ink, #2a1c13);
  box-shadow: var(--lift, 0 6px 24px rgba(0, 0, 0, .35)); font-family: var(--serif, Georgia, serif); font-size: 15.5px; line-height: 1.35; z-index: 4; }
#airship-ask .who { font-style: italic; font-size: 13px; color: var(--teak, #7a4b2a); margin-bottom: 4px; }
#airship-ask .opt { position: relative; padding: 4px 6px 5px 36px; border-radius: 2px; cursor: pointer; opacity: .82; }
#airship-ask .opt b { position: absolute; left: 6px; top: 4px; display: inline-flex; align-items: center; justify-content: center; min-width: 1.5em; height: 1.5em;
  border-radius: 3px; background: var(--ink, #2a1c13); color: var(--paper, #f0e5cf); font-weight: 400; font-size: .85em; font-variant-numeric: lining-nums;
  box-shadow: inset 0 1px 0 rgba(255, 240, 210, .22), inset 0 -2px 0 rgba(0, 0, 0, .45); }
#airship-ask .opt.hi { opacity: 1; background: rgba(122, 75, 42, .12); }
#airship-ask .opt .bar { position: absolute; left: 36px; right: 6px; bottom: 1px; height: 1.5px; background: var(--teak, #7a4b2a); transform-origin: left; transform: scaleX(0); }
#airship-ask .hint { font-size: 12px; color: var(--ink-soft, #5b4636); margin-top: 5px; font-style: italic; }
`;
  const PICK_AFTER = 1.3;      // seconds after the last E before the highlighted line is taken (as the robots' cards)
  function askOpen() {
    if (!document.getElementById('airship-ask-style')) { const st = document.createElement('style'); st.id = 'airship-ask-style'; st.textContent = ASK_CSS; document.head.appendChild(st); }
    const list = choices(), el = document.createElement('div'); el.id = 'airship-ask';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Where to?');
    const who = document.createElement('div'); who.className = 'who'; who.textContent = 'Dandelion · “Where to, then?”'; el.append(who);
    const opts = list.map((c, i) => {
      const o = document.createElement('div'); o.className = 'opt' + (i ? '' : ' hi');
      const k = document.createElement('b'); k.textContent = `${i + 1}`;
      const bar = document.createElement('span'); bar.className = 'bar';
      const name = c.tour ? 'Just round the island, please' : c.name;
      o.append(k, name.charAt(0).toUpperCase() + name.slice(1), bar); o.addEventListener('click', () => choose(i)); el.append(o);
      return { o, bar };
    });
    const hint = document.createElement('div'); hint.className = 'hint'; hint.textContent = `1–${list.length} to choose · E for the next line · Esc and she waits`; el.append(hint);
    const me = { el, list, idx: 0, lastE: 0, pending: false, raf: 0 };
    const mark = () => opts.forEach(({ o, bar }, i) => { o.classList.toggle('hi', i === me.idx); if (i !== me.idx) bar.style.transform = 'scaleX(0)'; });
    const tick = () => {
      if (ask !== me) return;
      if (me.pending) {
        const k = (performance.now() - me.lastE) / 1000 / PICK_AFTER;
        opts[me.idx].bar.style.transform = `scaleX(${Math.min(1, k).toFixed(3)})`;
        if (k >= 1) { me.pending = false; choose(me.idx); return; }
      }
      me.raf = requestAnimationFrame(tick);
    };
    me.key = e => {
      const n = /^(Digit|Numpad)([1-9])$/.exec(e.code);
      if (n && list[n[2] - 1]) { e.preventDefault(); e.stopImmediatePropagation(); choose(n[2] - 1); }
      else if (e.code === 'KeyE') { e.preventDefault(); e.stopImmediatePropagation(); me.idx = (me.idx + 1) % list.length; me.lastE = performance.now(); me.pending = true; mark(); }
      else if (e.code === 'Escape') { askClose(); fresh = false; insideT = 0; dwell = Math.max(dwell, 40); speak('stay'); }
    };
    addEventListener('keydown', me.key, true); document.body.append(el); ask = me; me.raf = requestAnimationFrame(tick);
  }
  function board() {      // without the walk: for tests
    if (!canBoard() || !canGo()) return false;
    if (!rider.on) rider.capture(new THREE.Vector3(-2.4, 0, 6.4)); fresh = true; shut(); return true;
  }
  function setOff() {
    if (wish !== 'tour' && open()) {
      state = 'departing'; speak('transit'); hornAt(1); blind('transit');
      flight.go(D.transit.cloud, SECS.transit, { ease: 'in', onDone: () => { veil.set(1); state = 'gone'; const to = dest(), url = to.url + (D.transit.query?.(to) ?? ''); if (to.url) location.href = url; } });
      return;
    }
    state = 'touring'; speak('depart'); hornAt(1); blind('tour');
    const pts = D.tour.map(s => V(s.p)), leg = flight.go([...pts, dockP], SECS.tour, { ease: 'cruise', endYaw: dock.yaw, onDone: home });
    const fr = Flight.fractions(leg.curve, leg.curve.points.length), says = [];
    D.tour.forEach((s, i) => { if (s.say) says.push({ u: fr[i + 1] ?? 1, fn: () => D.say?.(s.say) }); });
    leg.marks = says; tipped = 0;
  }
  // back at the stage with the visitor aboard: open up, then set them down
  function home() { wish = null; flight.place(dock); state = 'unloading'; setDoor(true); timer = 1.6; blind(open() ? 'transit' : 'tour'); veilAim = 0; }
  // at the stop with the door open: she says so, and waits for them to walk off in their own time
  function setDown() { bus.wave?.(); speak(fromAway ? 'landed' : 'alight'); fromAway = false; state = 'docked'; dwell = 40; fresh = false; insideT = 0; bus.setFace('happy'); }
  function getOff() {
    if (!rider?.on) return false;
    if (state === 'closing') { state = 'docked'; setDoor(true); dwell = 40; fresh = false; insideT = 0; speak('stay'); return true; }      // she opens up again; step off and on to go after all
    if (state === 'unloading' || state === 'docked') return false;
    if (state === 'touring' || state === 'departing') {
      state = 'returning'; ret = 0; speak('back'); veilAim = 0; veilRate = 1.5;
      const p = bus.root.position, ln = lineup(), first = ln[0] ?? dockP, mid = [(p.x + first[0]) / 2, Math.max(p.y, first[1]) + 12, (p.z + first[2]) / 2];
      const dist = p.distanceTo(new THREE.Vector3(...first));
      flight.go(dist > 60 ? [mid, ...ln, dockP] : [...ln, dockP], THREE.MathUtils.clamp(dist / 34, 7, 18), { ease: 'inout', endYaw: dock.yaw, onDone: home });
      return true;
    }
    // asked again on the way back (or while coming in from elsewhere): blink, and you are there
    if (state === 'returning' || state === 'arriving') { state = 'blink'; timer = 0.45; veilAim = 1; veilRate = 4; return true; }
    return false;
  }
  function arrive() {
    make(); const A = D.arrive; flight.place({ x: A[0][0], y: A[0][1], z: A[0][2], yaw: Math.atan2(A[1][0] - A[0][0], A[1][2] - A[0][2]) }); show(true);
    rider.capture(new THREE.Vector3(-0.45, 0, 1.75)); rider.sit(bus.SEAT0, D.lookOnArrive ?? 0, D.pitchOnArrive ?? -0.12); state = 'arriving'; fromAway = true; fresh = false; blind('home'); bus.setFace('neutral'); setDoor(false); door = 0;
    veil.set(1); veilAim = 0; veilRate = 0.35;
    flight.go([...A.slice(1), dockP], SECS.arrive, { ease: 'out', endYaw: dock.yaw, marks: [{ u: 0.55, fn: () => speak('welcome') }, { u: 0.85, fn: () => hornAt(1) }], onDone: home });
  }
  function leave() {
    state = 'leaving'; setDoor(false); timer = 1.6; speak('leave'); bus.setFace('neutral');
  }
  function pass() {
    const paths = D.passes ?? []; if (!paths.length) return;
    make(); const P = paths[Math.floor(Math.random() * paths.length)];
    flight.place({ x: P[0][0], y: P[0][1], z: P[0][2], yaw: Math.atan2(P[1][0] - P[0][0], P[1][2] - P[0][2]) }); show(true); state = 'passing'; blind(open() ? 'transit' : 'tour'); setDoor(false); door = 0;
    flight.go(P.slice(1), SECS.pass, { ease: 'line', onDone: () => { state = 'away'; show(false); } });
  }
  const nextPass = () => { const [a, b] = D.passEvery ?? [240, 420]; passT = a + Math.random() * (b - a); };

  const step = (t, dt) => {
    if (!started) { started = true; D.onStart?.(api); }
    if (state === 'away') { if (D.passes?.length && (passT -= dt) <= 0) { nextPass(); if (ctx.mode === undefined || ctx.mode === 'walk') pass(); } }
    if (!bus) return;
    const w = ctx.walker, walking = ctx.mode === undefined || ctx.mode === 'walk';
    // leaving walking view while aboard: she is back at the stop and they are set down beside her
    if (rider.on && !walking) { flight.place(dock); rider.alight(D.alight); state = 'docked'; setDoor(true); dwell = 40; veilAim = 0; fresh = true; }
    // The door is a way through while she is docked and it is open (and for the first moment of its closing, so
    // that stepping back out holds it).
    const doorOpen = (door > 0.85 && (state === 'docked' || state === 'unloading')) || (state === 'closing' && timer > 1.9);
    if (rider.on) {
      if (!rider.pre(doorOpen)) { rider.release(); fresh = true; insideT = 0; if (state === 'closing') { state = 'docked'; setDoor(true); dwell = 40; speak('stay'); } else bus.wave?.(); }      // walked off the gangplank
    } else if (doorOpen && state !== 'closing' && walking && w?.pos && !w.seated && bus.onPlank(rider.toLocal(w.pos))) rider.capture();      // walked onto it
    hull.off = rider.on || !(state === 'docked' || state === 'unloading' || state === 'closing');
    if (hull.askew && !hull.off && walking && w?.pos && !w.seated) fend(w);
    if (ask && (state !== 'docked' || !rider.on || !walking)) askClose();
    switch (state) {
      case 'wait': if ((timer -= dt) <= 0) come(); break;
      case 'docked':
        dwell -= dt;
        if (tell > 0 && (tell -= dt) <= 0 && turnable() && open()) D.say?.(`Next stop, ${dest().name}. Or ${next().name}: tell me when you come aboard.`);      // once she has said hello
        if (rider.on || (w?.pos && Math.hypot(w.pos.x - dock.x, w.pos.z - dock.z) < 28)) dwell = Math.max(dwell, 8);      // she waits while you are aboard or on the stage
        if (rider.on && fresh && canGo() && door > 0.85) {      // once you are inside she asks where to (if there is a choice), shuts the door and goes
          insideT = rider.inside ? insideT + dt : 0;
          if (ask && !rider.inside) askClose(); else if (insideT > 1.1 && !ask) { if (choices().length > 1) askOpen(); else shut(); }
        } else if (dwell <= 0) leave();
        break;
      case 'leaving': if (timer > 0 && (timer -= dt) <= 0) { flight.go([...(D.leave ?? [])], SECS.leave, { ease: 'in', onDone: () => { state = 'away'; show(false); nextPass(); } }); } break;
      case 'closing':
        if (!rider.inside && timer > 1.9) { state = 'docked'; setDoor(true); dwell = 40; insideT = 0; speak('stay'); }      // back in the doorway: she holds the door
        else if ((timer -= dt) <= 0) setOff();
        break;
      case 'unloading': if ((timer -= dt) <= 0 && door > 0.85) setDown(); break;
      case 'departing': veilAim = THREE.MathUtils.clamp((flight.k - 0.62) / 0.33, 0, 1); veilRate = 3; break;
      case 'returning': ret += dt; if (ret > 40) { flight.leg = null; home(); } break;
      case 'blink': if ((timer -= dt) <= 0) { home(); door = 1; setDown(); veilAim = 0; veilRate = 2.5; } break;
    }
    if (state === 'touring' && rider.seat && tipped < 1 && D.pitchOnTour !== undefined && ctx.walker) { tipped = Math.min(1, tipped + dt / 7); ctx.walker.pitch += (D.pitchOnTour - ctx.walker.pitch) * Math.min(1, dt * 0.7); }      // as it rises, the view tips down to the island
    const flying = !!rider?.on && ['touring', 'departing', 'returning', 'arriving'].includes(state);
    if (flying !== purring) { purring = flying; purr(ctx.sound, flying); }
    flight.update(dt);
    door += (doorAim - door) * Math.min(1, dt * 2.2); bus.setDoor(door);
    const arm = bus.armOut + (armAim - bus.armOut) * Math.min(1, dt * 1.8); bus.setArm(arm);
    veil.set(veil.get() + (veilAim - veil.get()) * Math.min(1, dt * veilRate));
    if (bus.root.visible) {
      bus.update(t, dt, { light: ctx.day?.light ?? 1, exposure: ctx.renderer?.toneMappingExposure ?? 1 });
      if (state === 'docked' && ctx.camera) {      // it watches you on the stage
        const c = ctx.camera.position, r = bus.root, dx = c.x - r.position.x, dz = c.z - r.position.z, a = wrap(Math.atan2(dx, dz) - r.rotation.y);
        bus.look(Math.hypot(dx, dz) < 40 ? THREE.MathUtils.clamp(-Math.sin(a) * 1.6, -1, 1) : 0);
      } else bus.look(0);
    }
    if (rider.on) rider.post();
    // the benches and the speaking tube can be used while standing aboard; what the foot of the screen says while sat in flight
    for (const sp of spots) {
      if (!rider.on || rider.seat) { sp.y = -999; continue; }
      if (sp.seat) { sp.x = sp.seat.x; sp.y = sp.seat.y - 1.7; sp.z = sp.seat.z; }
      else if (flying || state === 'returning') { const p = sp.tube.clone().applyMatrix4(bus.root.matrixWorld); sp.x = p.x; sp.y = p.y; sp.z = p.z; } else sp.y = -999;
    }
    const h = rider.seat && (flying || state === 'blink') ? (state === 'returning' || state === 'blink' ? D.hintBack ?? 'back to the stop shortly · Esc again to be there at once' : D.hintAboard ?? 'Esc · back to the stop · any step stands you up') : null;
    if (h !== shownHint) { shownHint = h; D.hint?.(h); }
  };
  ctx.animated.push(step);

  const api = {
    call, board, getOff, arrive, step,
    get state() { return state; }, get bus() { return bus; }, get canBoard() { return canBoard(); }, get aboard() { return !!rider?.on; },
    get bound() { return dest(); }, get other() { return turnable() ? next() : null; },
    get doorAt() { if (!bus || !bus.root.visible) return null; bus.root.updateMatrixWorld(); return bus.door.clone().applyMatrix4(bus.root.matrixWorld); },
    get veil() { return veil.get(); },
    // test views: put the bus straight into a state, k (0..1) of the way along
    stage(name, k = 0.5) {
      make();
      if (name === 'docked') { docked(false); door = 1; bus.setDoor(1); bus.setArm(1); dwell = 1e9; return; }
      if (name === 'coming') { come(); flight.seek(k); return; }
      if (name === 'pass') { pass(); flight.seek(k); return; }
      if (name === 'arrive') { arrive(); flight.seek(k); rider.lastYaw = bus.root.rotation.y; rider.post(); veil.set(0); veilAim = 0; return; }
      if (name === 'ask') { docked(false); door = 1; bus.setDoor(1); bus.setArm(1); dwell = 1e9; rider.capture(new THREE.Vector3(-0.3, 0, k * 14 - 8)); fresh = true; return; }      // just come aboard: she asks where to
      if (name === 'aboard') { docked(false); door = 1; bus.setDoor(1); bus.setArm(1); dwell = 1e9; rider.capture(new THREE.Vector3(-0.3, 0, k * 14 - 8)); fresh = false; return; }      // standing in the aisle, k of the way forward
      if (name === 'tour' || name === 'depart') { docked(false); door = 1; board(); rider.sit(bus.SEAT0, D.lookOnBoard ?? 0, D.pitchOnBoard ?? -0.05); timer = 0; setOff(); flight.seek(k); rider.lastYaw = bus.root.rotation.y; rider.post(); door = 0; bus.setDoor(0); bus.setArm(0); return; }
    },
  };
  return api;
}
