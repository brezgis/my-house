// Flying the airship (bus.js) with or without the visitor aboard: called by a bell, coming in from far
// off across the sky, docking at a stage, taking the visitor on a pleasure flight and back, or out into
// a cloud bank and on to another place; arriving from another place; drifting past in the distance now
// and then when nobody has rung. Shared by Anna's House and Vesper Street: it imports three and bus.js
// only, and everything about the place (the dock, the paths, the alighting point, what is said) comes
// in as data.
//
//   const air = makeAirship(ctx, data)      (it pushes its own per-frame step onto ctx.animated)
//   air.call()      ring for it
//   Boarding is on foot: while she is docked with her door open, walk up her gangplank. Once you are inside she
//   shuts the door and goes. Aboard you can walk about, stand at the front, or sit on any bench (E), also in flight;
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
//                              plus bus.wheel; yaw as an Object3D's, a multiple of a quarter turn: forward is (sin yaw, cos yaw))
//   alight: { x, y, z, yaw }   where the visitor is set down if they leave walking view while aboard (walker feet; yaw as walk.js)
//   approach: [[x,y,z], ...]   from far off to just short of the dock, the last points in line with the dock's yaw
//   lineup:   how many of approach's last points she flies through when coming back early (default 2)
//   leave:    [[x,y,z], ...]   from just past the dock away out of sight
//   tour:     [{ p: [x,y,z], say: 'text' }, ...] or null: a pleasure flight from the dock and back (end it in line with the dock)
//   transit:  { url: '', query: () => '?from=house', cloud: [[x,y,z], ...] }: when url is set, boarding flies the
//             cloud path, whites out and goes to url + query(); with no url, never
//   arrive:   [[x,y,z], ...]   from inside a cloud to just short of the dock (for a visitor from the other place)
//   passes:   [[[x,y,z], ...], ...] far-off paths for the fly-past; firstPass, passEvery: [min, max] seconds
//   blind:    { tour, transit, home }   what the destination blind reads
//   say(text)          how the bus speaks (a toast, a bubble); lines: extra or replacement lines (see DANDELION)
//   hint(text|null)    optional: what to show while aboard; onDock(open) optional: the stage's gate
//   secs:     { approach, tour, transit, arrive, leave, pass, dwell } seconds (defaults below)
//   bus:      options for buildBus (e.g. { plank: 9, drop: 0 }: the gangplank's length, and how far it slopes down to the ground)

import * as THREE from 'three';
import { buildBus, DANDELION } from './bus.js';

const smooth = k => k * k * (3 - 2 * k);
const EASE = { inout: smooth, out: k => 1 - Math.pow(1 - k, 2.2), in: k => k * k, line: k => k, cruise: k => (k < 0.1 ? k * k / 0.18 : k > 0.9 ? 1 - (1 - k) * (1 - k) / 0.18 : (k - 0.05) / 0.9) };      // speeds up, cruises, slows
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

// ---- Flight: moves an object along a smooth path, nose along the way, banking into turns ------------
export class Flight {
  constructor(obj) { this.obj = obj; this.leg = null; this.yaw = obj.rotation.y; this.roll = 0; this.pitch = 0; }
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
  update(dt, snap = false) {
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
  const open = () => !!D.transit?.url;
  function make() {
    if (bus) return bus;
    bus = buildBus(D.bus ?? {}); bus.root.visible = false; ctx.scene.add(bus.root);
    flight = new Flight(bus.root); rider = new Rider(ctx, bus);
    // while she stands at the stop she is solid: her hull, as a box in the world (the dock's yaw is a quarter turn)
    { const c = Math.cos(dock.yaw), sn = Math.sin(dock.yaw), xs = [], zs = [];
      for (const [x, z] of [[-4.15, -10.3], [4.15, -10.3], [-4.15, 12.7], [4.15, 12.7]]) { xs.push(dock.x + x * c + z * sn); zs.push(dock.z - x * sn + z * c); }
      hull = { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs), y0: dock.y - 3, y1: dock.y + 9, off: true };
      ctx.walker?.colliders?.push?.(hull); }
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
  const blind = k => bus?.setBlind(D.blind?.[k] ?? '');
  const hornAt = (near = 1) => horn(ctx.sound, 0.55 * near);
  const lineup = () => (D.approach ?? []).slice(-(D.lineup ?? 2));

  function docked(first = true) {
    flight.place(dock); show(true); state = 'docked'; setDoor(true); dwell = SECS.dwell; blind(open() ? 'transit' : 'tour');
    bus.setFace('happy'); if (first) { speak('arrive'); bus.wave?.(); }
  }
  function call() {
    if (state === 'away' || state === 'passing') {
      make(); state = 'wait'; timer = D.wait ?? 3; flight.leg = null; show(false); return 'rung';
    }
    if (state === 'wait' || state === 'coming') { speak('coming'); return 'coming'; }
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
  const shut = () => { state = 'closing'; setDoor(false); timer = 2.6; speak('board'); bus.setFace('happy'); };
  function board() {      // without the walk: for tests
    if (!canBoard() || !canGo()) return false;
    if (!rider.on) rider.capture(new THREE.Vector3(-2.4, 0, 6.4)); fresh = true; shut(); return true;
  }
  function setOff() {
    if (open()) {
      state = 'departing'; speak('transit'); hornAt(1); blind('transit');
      flight.go(D.transit.cloud, SECS.transit, { ease: 'in', onDone: () => { veil.set(1); state = 'gone'; const url = D.transit.url + (D.transit.query?.() ?? ''); if (D.transit.url) location.href = url; } });
      return;
    }
    state = 'touring'; speak('depart'); hornAt(1); blind('tour');
    const pts = D.tour.map(s => V(s.p)), leg = flight.go([...pts, dockP], SECS.tour, { ease: 'cruise', endYaw: dock.yaw, onDone: home });
    const fr = Flight.fractions(leg.curve, leg.curve.points.length), says = [];
    D.tour.forEach((s, i) => { if (s.say) says.push({ u: fr[i + 1] ?? 1, fn: () => D.say?.(s.say) }); });
    leg.marks = says; tipped = 0;
  }
  // back at the stage with the visitor aboard: open up, then set them down
  function home() { flight.place(dock); state = 'unloading'; setDoor(true); timer = 1.6; blind(open() ? 'transit' : 'tour'); veilAim = 0; }
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
    switch (state) {
      case 'wait': if ((timer -= dt) <= 0) come(); break;
      case 'docked':
        dwell -= dt;
        if (rider.on || (w?.pos && Math.hypot(w.pos.x - dock.x, w.pos.z - dock.z) < 28)) dwell = Math.max(dwell, 8);      // she waits while you are aboard or on the stage
        if (rider.on && fresh && canGo() && door > 0.85) { insideT = rider.inside ? insideT + dt : 0; if (insideT > 1.1) shut(); }      // once you are inside, she shuts the door and goes
        else if (dwell <= 0) leave();
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
    get doorAt() { if (!bus || !bus.root.visible) return null; bus.root.updateMatrixWorld(); return bus.door.clone().applyMatrix4(bus.root.matrixWorld); },
    get veil() { return veil.get(); },
    // test views: put the bus straight into a state, k (0..1) of the way along
    stage(name, k = 0.5) {
      make();
      if (name === 'docked') { docked(false); door = 1; bus.setDoor(1); bus.setArm(1); dwell = 1e9; return; }
      if (name === 'coming') { come(); flight.seek(k); return; }
      if (name === 'pass') { pass(); flight.seek(k); return; }
      if (name === 'arrive') { arrive(); flight.seek(k); rider.lastYaw = bus.root.rotation.y; rider.post(); veil.set(0); veilAim = 0; return; }
      if (name === 'aboard') { docked(false); door = 1; bus.setDoor(1); bus.setArm(1); dwell = 1e9; rider.capture(new THREE.Vector3(-0.3, 0, k * 14 - 8)); fresh = false; return; }      // standing in the aisle, k of the way forward
      if (name === 'tour' || name === 'depart') { docked(false); door = 1; board(); rider.sit(bus.SEAT0, D.lookOnBoard ?? 0, D.pitchOnBoard ?? -0.05); timer = 0; setOff(); flight.seek(k); rider.lastYaw = bus.root.rotation.y; rider.post(); door = 0; bus.setDoor(0); bus.setArm(0); return; }
    },
  };
  return api;
}
