// Flying the airship (bus.js) with or without the visitor aboard: called by a bell, coming in from far
// off across the sky, docking at a stage, taking the visitor on a pleasure flight and back, or out into
// a cloud bank and on to another place; arriving from another place; drifting past in the distance now
// and then when nobody has rung. Shared by Anna's House and Vesper Street: it imports three and bus.js
// only, and everything about the place (the dock, the paths, the alighting point, what is said) comes
// in as data.
//
//   const air = makeAirship(ctx, data)      (it pushes its own per-frame step onto ctx.animated)
//   air.call()      ring for it       air.board()     get on (only when docked, door open)
//   air.getOff()    get off: at the stage, at once; in the air, it turns back to the stage and sets you down there
//   air.arrive()    start aboard, coming down out of cloud to the stage (a visitor from the other place)
//   air.state, air.bus, air.canBoard, air.doorAt (world point just outside the door, or null)
//   air.stage(name, k)  for test views: 'docked', 'coming', 'tour', 'pass', 'arrive', 'depart' at fraction k
//
// ctx fields used: scene (the bus is added to it), camera, animated, walker (pos, yaw, pitch, seated,
// place(), wasSeated), mode ('walk' while walking: leaving it sets the visitor down), sound (optional:
// isMuted(), volume()), day (optional: light 0..1), renderer (optional: toneMappingExposure).
//
// data:
//   dock:   { x, y, z, yaw }   the bus's pose at the stage (y = its cabin floor; yaw as an Object3D's: forward is (sin yaw, cos yaw))
//   alight: { x, y, z, yaw }   where the visitor is set down, standing (walker feet; yaw as walk.js)
//   approach: [[x,y,z], ...]   from far off to just short of the dock, the last points in line with the dock's yaw
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
//   bus:      options for buildBus (e.g. { plank: 9 }, the gangplank's length to reach the ground from the dock)

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

// ---- A passenger: the visitor sat in the bus, the view carried with it --------------------------------
export class Passenger {
  constructor(ctx, bus) { this.ctx = ctx; this.bus = bus; this.seat = { x: 0, y: 0, z: 0, yaw: 0, label: 'ride the airship', airship: true }; this.on = false; this.v = new THREE.Vector3(); this.lastYaw = 0; }
  get walker() { return this.ctx.walker; }
  board(lookYaw = 0, pitch = -0.05) {
    const w = this.walker; this.on = true; this.bus.root.updateMatrixWorld(); this.lastYaw = this.bus.root.rotation.y;
    this.sync(); w.seated = this.seat; w.yaw = this.lastYaw + Math.PI + lookYaw; w.pitch = pitch;      // walk.js: yaw 0 looks toward -z, so the bus's forward (+z) is yaw + PI
    this.ctx.camera?.position.set(this.seat.x, this.seat.y, this.seat.z);
  }
  sync() {
    const r = this.bus.root; r.updateMatrixWorld(); this.v.copy(this.bus.seat).applyMatrix4(r.matrixWorld);
    Object.assign(this.seat, { x: this.v.x, y: this.v.y, z: this.v.z, yaw: r.rotation.y + Math.PI });
    if (!this.on) return;
    const d = wrap(r.rotation.y - this.lastYaw); this.lastYaw = r.rotation.y; const w = this.walker;
    if (w) w.yaw += d;
    if (w?.seated === this.seat) this.ctx.camera?.position.copy(this.v);
  }
  get left() { return this.on && this.walker?.seated !== this.seat; }
  reseat() { if (this.on && this.walker) this.walker.seated = this.seat; }
  alight(p) {
    const w = this.walker; this.on = false; if (!w) return;
    w.seated = null;
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
  let o = 0;
  return { set(v) { v = Math.max(0, Math.min(1, v)); if (Math.abs(v - o) < 0.002) return; o = v; el.style.opacity = String(v); }, get: () => o };
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
  const open = () => !!D.transit?.url;
  function make() {
    if (bus) return bus;
    bus = buildBus(D.bus ?? {}); bus.root.visible = false; ctx.scene.add(bus.root);
    flight = new Flight(bus.root); rider = new Passenger(ctx, bus);
    return bus;
  }
  const show = v => { if (bus) bus.root.visible = v; };
  const setDoor = on => { doorAim = on ? 1 : 0; armAim = on ? 1 : 0; bus?.flash(on); D.onDock?.(on); };
  const blind = k => bus?.setBlind(D.blind?.[k] ?? '');
  const hornAt = (near = 1) => horn(ctx.sound, 0.55 * near);
  const lineup = () => (D.approach ?? []).slice(-2);

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
  const canBoard = () => state === 'docked' && door > 0.85 && (open() || !!D.tour?.length);      // somewhere to go: the other place, or round
  function board() {
    if (!canBoard()) return false;
    rider.board(D.lookOnBoard ?? 0, D.pitchOnBoard ?? -0.05); state = 'closing'; setDoor(false); timer = 2.4; speak('board'); bus.setFace('happy'); return true;
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
  function setDown() { rider.alight(D.alight); bus.wave?.(); speak(fromAway ? 'landed' : 'alight'); fromAway = false; state = 'docked'; dwell = 40; bus.setFace('happy'); }
  function getOff() {
    if (!rider?.on) return false;
    if (state === 'closing' || state === 'unloading' || state === 'docked') { const was = state; flight.place(dock); setDoor(true); door = Math.max(door, 0.3); rider.alight(D.alight); state = 'docked'; dwell = 40; if (was === 'closing') speak('stay'); veilAim = 0; return true; }
    if (state === 'touring' || state === 'departing') {
      rider.reseat(); state = 'returning'; ret = 0; speak('back'); veilAim = 0; veilRate = 1.5;
      const p = bus.root.position, ln = lineup(), first = ln[0] ?? dockP, mid = [(p.x + first[0]) / 2, Math.max(p.y, first[1]) + 12, (p.z + first[2]) / 2];
      const dist = p.distanceTo(new THREE.Vector3(...first));
      flight.go(dist > 60 ? [mid, ...ln, dockP] : [...ln, dockP], THREE.MathUtils.clamp(dist / 34, 7, 18), { ease: 'inout', endYaw: dock.yaw, onDone: home });
      return true;
    }
    // asked again on the way back (or while coming in from elsewhere): blink, and you are there
    if (state === 'returning' || state === 'arriving') { rider.reseat(); state = 'blink'; timer = 0.45; veilAim = 1; veilRate = 4; return true; }
    return false;
  }
  function arrive() {
    make(); const A = D.arrive; flight.place({ x: A[0][0], y: A[0][1], z: A[0][2], yaw: Math.atan2(A[1][0] - A[0][0], A[1][2] - A[0][2]) }); show(true);
    rider.board(D.lookOnArrive ?? 0, D.pitchOnArrive ?? -0.12); state = 'arriving'; fromAway = true; blind('home'); bus.setFace('neutral'); setDoor(false); door = 0;
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
    const w = ctx.walker;
    // the visitor is the boss: any step, E, Esc or a tap while aboard means "let me off"
    if (rider.on && rider.left) { if (ctx.mode !== undefined && ctx.mode !== 'walk') { flight.place(dock); rider.on = false; state = 'docked'; setDoor(true); dwell = 40; veilAim = 0; } else getOff(); }
    switch (state) {
      case 'wait': if ((timer -= dt) <= 0) come(); break;
      case 'docked':
        dwell -= dt;
        if (w?.pos && Math.hypot(w.pos.x - dock.x, w.pos.z - dock.z) < 28) dwell = Math.max(dwell, 8);      // it waits while you are on the stage
        if (dwell <= 0) leave();
        break;
      case 'leaving': if (timer > 0 && (timer -= dt) <= 0) { flight.go([...(D.leave ?? [])], SECS.leave, { ease: 'in', onDone: () => { state = 'away'; show(false); nextPass(); } }); } break;
      case 'closing': if ((timer -= dt) <= 0) setOff(); break;
      case 'unloading': if ((timer -= dt) <= 0 && door > 0.85) setDown(); break;
      case 'departing': veilAim = THREE.MathUtils.clamp((flight.k - 0.62) / 0.33, 0, 1); veilRate = 3; break;
      case 'returning': ret += dt; if (ret > 40) { flight.leg = null; home(); } break;
      case 'blink': if ((timer -= dt) <= 0) { home(); door = 1; setDown(); veilAim = 0; veilRate = 2.5; } break;
    }
    if (state === 'touring' && rider.on && tipped < 1 && D.pitchOnTour !== undefined && ctx.walker) { tipped = Math.min(1, tipped + dt / 7); ctx.walker.pitch += (D.pitchOnTour - ctx.walker.pitch) * Math.min(1, dt * 0.7); }      // as it rises, the view tips down to the island
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
    if (rider.on) rider.sync();
    const h = rider.on ? (state === 'returning' || state === 'blink' ? D.hintBack ?? 'back to the stop shortly · E again to be there at once' : D.hintAboard ?? 'E · get off (it takes you back to the stop)') : null;
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
      if (name === 'arrive') { arrive(); flight.seek(k); rider.lastYaw = bus.root.rotation.y; veil.set(0); veilAim = 0; return; }
      if (name === 'tour' || name === 'depart') { docked(false); door = 1; board(); timer = 0; setOff(); flight.seek(k); rider.lastYaw = bus.root.rotation.y; door = 0; bus.setDoor(0); bus.setArm(0); return; }
    },
  };
  return api;
}
