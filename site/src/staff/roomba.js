// Sir Reginald, the vacuum. Trundles about the ground floor in straight lines,
// turns when he meets something, now and then sets off for another room, and
// goes home to his dock for a rest. He has googly eyes; Fig stuck them on.
//
// He can be given a treat: a few crumbs dropped on the floor in front of the
// visitor. He notices, hurries over, hoovers them up one by one, and wiggles.
// And like the rest of the staff he gets out of her way.

import { Agent } from './agent.js';
import { Mover } from './nav.js';
import { buildRoomba } from './models.js';

// What he "says" (his own strings: lines.js is the robots')
const PATS = ['*beep boop*', '*Reginald has no thoughts. Reginald is at peace.*', '*happy little whirr*', '*bumps your foot affectionately*'];
const NOTICE = ['*!!*', '*sensors twitch*', '*a crumb? A CRUMB?*', '*beep?! beep!*'];
const YUM = ['*ecstatic whirring*', '*does a little spin. Best day of his life.*', '*contented hum. That was a good crumb.*', '*beep boop (thank you)*', '*Reginald will remember this.*'];
const SORRY = ['*apologetic beep. He could not get there.*', '*sad boop. The crumbs were out of reach.*'];
const NO_STAIRS = '*Reginald does not do stairs. He sends his regrets.*';
const NO_OUT = '*Reginald is an indoor gentleman.*';
const NO_ROOM = '*no clear floor here for crumbs*';
const N = 9, COOL = 25, GIVEUP = 30, CRUMB = 0xc89a5c;
// Crumbs of bakery things; bits of anything else, in roughly its colour
function crumbKind(n) {
  if (/cake|tart|turnover|bread|roll|pretzel|cheez|croissant|scone|biscuit|cookie|muffin|toast/i.test(n)) return { crumbs: true, color: /chocolate/i.test(n) ? 0x4a2c1c : /cheez/i.test(n) ? 0xe08a2a : CRUMB };
  if (/chocolate/i.test(n)) return { crumbs: true, color: 0x4a2c1c };
  return { crumbs: false, color: /apple|pomegranate/i.test(n) ? 0xf2e6c4 : /pear/i.test(n) ? 0xe9e2a8 : /peach|mandarin/i.test(n) ? 0xf0a040 : /banana/i.test(n) ? 0xf3e3a0 : /lemon/i.test(n) ? 0xf4e04a : 0xd8c8a0 };
}
const DET_C = new Int32Array(160), DET_W = new Uint8Array(160);       // her floor, briefly marked as furniture

export class Roomba extends Agent {
  constructor(H) {
    super(H);
    this.name = 'Reginald';
    this.body = buildRoomba(); H.group.add(this.body.root);
    this.m = new Mover(H.nav, { need: 2, opener: false, speed: 1.1, turn: 2.5 });
    this.m.avoid = (x, z) => H.blocked(this, x, z, 0.9);
    this.top = this.body.top; this.rider = null; this.mode = 'dock'; this.heldUntil = 0; this.dock = null;
    this.bubble = H.bubbles.make('Reginald');
    this.inter = { x: 0, y: 0, z: 0, reach: 5, label: () => this.label(), act: () => this.act() };
    H.ctx.interact.push(this.inter);
    this.pats = 0; this.treats = 0; this.treatReady = 0; this.crumbs = null; this.spin = 0;
    this.aside = { on: 0, x: 0, z: 0, t0: 0, goal: false, gx: 0, gz: 0 }; this.nextManners = 0.1;
  }
  get x() { return this.m.x; } get z() { return this.m.z; } get y() { return this.m.y; } get f() { return this.m.f; } get yaw() { return this.m.yaw; }
  hold(s) { this.heldUntil = this.H.now + s; }
  patted() {
    const H = this.H;
    this.bubble.say(PATS[this.pats++ % PATS.length], 3, H.now);
    H.chirp([84, 88], 0.035, this);
  }

  // ---- a treat ------------------------------------------------------------------------------------
  // E offers crumbs when he is ready for some (a short pause after the last), and a pat otherwise.
  treatable() { return this.H.now >= this.treatReady && this.taskName !== 'treat'; }
  // What she could share: food in her hand (hands/carry.js) first, then food the staff served her
  shareable() {
    const h = window.__hands?.holding;
    if (h?.eat) return { n: h.n, hand: true };
    const v = this.H.visitor;
    return v.holding?.food ? { n: v.holding.name.replace(/^(piece|slice) of /, ''), hand: false } : null;
  }
  label() {
    if (!this.treatable()) return 'pat Reginald';
    const f = this.shareable(); if (!f) return 'drop a few crumbs for Sir Reginald';
    const k = crumbKind(f.n);
    return k.crumbs ? `share some ${f.n.replace(/^(box|bag|bar) of /, '')} crumbs with Sir Reginald` : `share a few bits of ${f.n} with Sir Reginald`;
  }
  act() {
    const H = this.H, v = H.visitor;
    if (!this.treatable()) return this.patted();
    const st = H.nav.stair, onStair = st && Math.abs(v.x - st.x) < 2.6 && v.z > st.zHi - 0.5 && v.z < st.zLo + 0.3 && v.y > H.nav.FLOORS[0] + 0.3;
    if (v.outside) return this.bubble.say(NO_OUT, 3.5, H.now);
    if (onStair || v.f !== 0) return this.bubble.say(NO_STAIRS, 4, H.now);
    const at = this.crumbSpot(); if (!at) return H.bubbles.toast(NO_ROOM, H.now, 3);
    const f = this.shareable();
    this.scatter(at.x, at.z, f ? crumbKind(f.n).color : CRUMB);
    if (f?.hand) window.__hands.crumble?.();                                    // (a little less of it left in her hand)
    this.aside.on = 0; this.run('treat', this.treat());
  }
  // A little clear floor a couple of feet in front of her that he can reach (never inside the furniture)
  crumbSpot() {
    const H = this.H, v = H.visitor, nav = H.nav, L = Math.hypot(v.fx, v.fz) || 1, fx = v.fx / L, fz = v.fz / L;
    for (const a of [0, 0.45, -0.45, 0.9, -0.9, 1.4, -1.4]) for (const d of [2.4, 3, 2.1, 3.6]) {
      const c = Math.cos(a), s = Math.sin(a), x = v.x + (fx * c - fz * s) * d, z = v.z + (fx * s + fz * c) * d;
      if (nav.freeAt(0, x, z, 2, false) && nav.freeAt(0, x + 0.4, z, 1, false) && nav.freeAt(0, x - 0.4, z, 1, false) && nav.freeAt(0, x, z + 0.4, 1, false) && nav.freeAt(0, x, z - 0.4, 1, false) && nav.see(0, v.x, v.z, x, z)) return { x, z };
    }
    return null;
  }
  // The crumbs: a few specks, one draw call, made the first time and kept
  scatter(x, z, color = CRUMB) {
    const H = this.H, THREE = H.THREE, y = H.nav.floorY(0, x, z) + 0.012;
    if (!this.crumbs) {
      const mesh = new THREE.InstancedMesh(new THREE.DodecahedronGeometry(0.042, 0), new THREE.MeshStandardMaterial({ color: 0xc89a5c, roughness: 0.95 }), N);
      mesh.userData.staff = true; mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = false;
      this.crumbs = { mesh, pts: new Float32Array(N * 2), left: 0, eaten: new Uint8Array(N), o: new THREE.Object3D() };
    }
    const C = this.crumbs, o = C.o; C.mesh.material.color.setHex(color);
    for (let i = 0; i < N; i++) {
      const a = H.rnd() * Math.PI * 2, r = 0.06 + Math.sqrt(H.rnd()) * 0.36, px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r;
      C.pts[i * 2] = px; C.pts[i * 2 + 1] = pz; C.eaten[i] = 0;
      o.position.set(px - x, 0, pz - z); o.rotation.set(H.rnd() * 3, H.rnd() * 3, 0); o.scale.setScalar(0.6 + H.rnd() * 0.9); o.updateMatrix();
      C.mesh.setMatrixAt(i, o.matrix);
    }
    C.mesh.position.set(x, y, z);                     // (placed where they lie: main.js shows the staff's things by the room they are in)
    C.mesh.instanceMatrix.needsUpdate = true; C.left = N; C.x = x; C.z = z; C.y = y;
    if (!C.mesh.parent) H.group.add(C.mesh);
    H.events.treats = (H.events.treats ?? 0) + 1;
  }
  eat(i) {
    const C = this.crumbs, o = C.o; C.eaten[i] = 1; C.left--;
    o.position.set(0, -1000, 0); o.scale.setScalar(0); o.updateMatrix(); C.mesh.setMatrixAt(i, o.matrix); C.mesh.instanceMatrix.needsUpdate = true;
    if (!C.left) C.mesh.removeFromParent();
  }
  sweepAway() { const C = this.crumbs; if (!C) return; C.left = 0; C.mesh.removeFromParent(); }
  // Plan a trip round her, not through her ankles (her cells are put back at once)
  goRound(x, z) {
    const H = this.H, v = H.visitor, nav = H.nav, walk = nav.floors[0].walk, r = 1.7; let n = 0;
    if (v.present && v.f === 0 && !v.outside) for (let dz = -r; dz <= r; dz += nav.CELL) for (let dx = -r; dx <= r; dx += nav.CELL) {
      if (dx * dx + dz * dz > r * r || n >= DET_C.length) continue;
      const c = nav.cellOf(v.x + dx, v.z + dz); if (c < 0 || !walk[c] || Math.hypot(nav.cx(c) - this.m.x, nav.cz(c) - this.m.z) < 0.8) continue;
      DET_C[n] = c; DET_W[n] = walk[c]; walk[c] = 0; n++;
    }
    let ok = false;
    try { ok = this.m.goTo(0, x, z); } finally { for (let i = n - 1; i >= 0; i--) walk[DET_C[i]] = DET_W[i]; }
    return ok || this.m.goTo(0, x, z);
  }
  *treat() {
    const H = this.H, m = this.m, C = this.crumbs, t0 = H.now;
    this.mode = 'treat'; this.aside.on = 0;
    try {
      // he notices: a beat, a chirp, a turn toward them
      this.bubble.say(NOTICE[this.treats % NOTICE.length], 2.2, H.now); H.chirp([88, 93], 0.04, this);
      for (let t = 0; t < 0.7; t += H.dt) { m.v = 0; m.faceTo(C.x, C.z, H.dt * 3); yield; }
      // and hurries over (as fast as a vacuum hurries)
      let tries = 3, ok = this.goRound(C.x, C.z);
      while (Math.hypot(C.x - m.x, C.z - m.z) > 0.9) {
        if (H.now - t0 > GIVEUP || (!ok && --tries <= 0)) { m.stop(); this.sweepAway(); this.bubble.say(SORRY[this.treats % SORRY.length], 3.5, H.now); H.chirp([76, 72], 0.035, this); return; }
        const s = ok ? m.update(H.dt, 1.9) : 'failed';
        if (s === 'arrived' && Math.hypot(C.x - m.x, C.z - m.z) > 0.9) ok = false;          // (the nearest he could get was not near enough)
        if (s === 'failed' || s === 'idle' || !ok || m.blockedFor > 1.2) { ok = this.goRound(C.x, C.z); if (!ok) yield* this.wait(0.8); }
        yield;
      }
      m.stop();
      // one by one: steer onto each speck and hoover it up
      while (C.left > 0) {
        let k = -1, bd = 1e9;
        for (let i = 0; i < N; i++) if (!C.eaten[i]) { const d = Math.hypot(C.pts[i * 2] - m.x, C.pts[i * 2 + 1] - m.z); if (d < bd) { bd = d; k = i; } }
        const px = C.pts[k * 2], pz = C.pts[k * 2 + 1], tk = H.now;
        for (;;) {
          const dx = px - m.x, dz = pz - m.z, d = Math.hypot(dx, dz);
          if (d < 0.22 || H.now - tk > 3) break;
          m.faceTo(px, pz, H.dt * 2.5);
          let off = Math.atan2(dx, dz) - m.yaw; off = Math.abs(Math.atan2(Math.sin(off), Math.cos(off)));
          const step = Math.min(d, H.dt * 0.9 * Math.max(0, Math.cos(Math.min(off, 1.5))));
          const nx = m.x + Math.sin(m.yaw) * step, nz = m.z + Math.cos(m.yaw) * step;
          if (H.nav.freeAt(0, nx, nz, 1, false)) { m.x = nx; m.z = nz; m.v = step / H.dt; } else if (d < 0.7) break;      // (near enough: the brush reaches it)
          yield;
        }
        this.eat(k); if (H.rnd() < 0.5) H.chirp([96], 0.02, this);
        yield* this.wait(0.12);
      }
      // delight
      this.treats++; H.events.treatsEaten = (H.events.treatsEaten ?? 0) + 1;
      this.bubble.say(YUM[(this.treats - 1) % YUM.length], 3.5, H.now); H.chirp([84, 88, 91, 96], 0.045, this, 0.09);
      for (let t = 0; t < 1.6; t += H.dt) { m.v = 0; this.spin = Math.PI * 4 * (1 - Math.cos(Math.PI * t / 1.6)) / 2; yield; }
      this.spin = 0;
      for (let t = 0; t < 0.9; t += H.dt) { this.spin = 0.25 * Math.sin(t * 22) * (1 - t / 0.9); yield; }      // a wiggle
      this.spin = 0;
      yield* this.wait(1.5);
    } finally { this.spin = 0; this.mode = 'clean'; this.treatReady = H.now + COOL; if (C.left) this.sweepAway(); }
  }

  // ---- manners: out of her way --------------------------------------------------------------------
  // In the line she is walking (or under her feet), he scoots off it, waits for her to pass, carries on.
  manners() {
    const H = this.H, v = H.visitor, m = this.m, a = this.aside;
    if (this.taskName === 'treat' || this.taskName === 'demo' || !v.present || v.outside || v.f !== 0) return;
    const rx = m.x - v.x, rz = m.z - v.z, d = Math.hypot(rx, rz);
    if (a.on === 2) { if (v.speed < 0.6 ? d > 3 : rx * v.dx + rz * v.dz < -1 || d > 8) this.unAside(); else if (H.now - a.t0 > 7) this.unAside(); return; }
    if (a.on) return;
    const ahead = rx * v.dx + rz * v.dz, lat = rx * v.dz - rz * v.dx;
    if (!(v.speed > 1.2 && ahead > -0.3 && ahead < 7 && Math.abs(lat) < 2) && !(d < 2.2 && v.speed > 0.6)) return;
    const nav = H.nav, side = Math.sign(lat) || 1;
    let best = null, bs = -1e9;
    for (const r of [1.6, 2.6, 3.6]) for (let k = 0; k < 12; k++) {
      const ang = (k / 12) * Math.PI * 2, x = m.x + Math.sin(ang) * r, z = m.z + Math.cos(ang) * r;
      if (!nav.freeAt(0, x, z, 2, false)) continue;
      const qx = x - v.x, qz = z - v.z, ah = qx * v.dx + qz * v.dz, lt = qx * v.dz - qz * v.dx;
      if ((ah > -1 && Math.abs(lt) < 2.5) || Math.hypot(qx, qz) < 2.6 || (x - m.x) * rx + (z - m.z) * rz < -0.25 * r * d) continue;
      if (!nav.clearLine(0, m.x, m.z, x, z, 1, false)) continue;
      const s = -r + (Math.sign(lt) === side ? 1 : 0) + Math.min(nav.floors[0].clear[nav.cellOf(x, z)], 6) * 0.2;
      if (s > bs) { bs = s; best = best ?? { x: 0, z: 0 }; best.x = x; best.z = z; }
    }
    if (!best) return;
    a.goal = !!(m.path && m.goal); if (a.goal) { a.gx = m.goal.x; a.gz = m.goal.z; }
    if (m.goTo(0, best.x, best.z)) { a.on = 1; a.t0 = H.now; H.events.asides = (H.events.asides ?? 0) + 1; }
  }
  unAside() { const a = this.aside, m = this.m; a.on = 0; m.stop(); if (a.goal) m.goTo(0, a.gx, a.gz); }

  // A tour of the ground floor: travel to the next room through the open doorways, clean it in long
  // straight runs (bump, turn, carry on), then the next; home to the dock now and then for a charge.
  think() {
    const H = this.H;
    this.sinceDock = (this.sinceDock ?? 0);
    if (this.sinceDock > 360 && H.rnd() < 0.7) { this.sinceDock = 0; return this.run('dock', this.toDock(35 + H.rnd() * 40)); }
    this.run('roam', this.roam());
  }
  *roam() {
    const H = this.H, nav = H.nav, t0 = H.now;
    const rooms = [...new Map(H.ctx.house.rooms.filter(r => Math.abs(r.y0 - (nav.FLOORS[0] - 1)) < 0.05).map(r => [r.name, r])).values()];
    this.tour = ((this.tour ?? Math.floor(H.rnd() * rooms.length)) + 1) % Math.max(1, rooms.length);
    const room = rooms[this.tour];
    this.mode = 'clean';
    const s = room && nav.randomSpot(0, 2, H.rnd, room, 3);
    if (s) yield* this.go(0, s.x, s.z, { tries: 2 });
    yield* this.clean(30 + H.rnd() * 35, room);
    this.sinceDock += H.now - t0;
  }
  *toDock(secs) {
    const H = this.H; this.mode = 'going';
    if (this.dock) yield* this.go(0, this.dock.x, this.dock.z);
    this.mode = 'dock';
    if (this.dock) { const end = H.now + 3; while (H.now < end) { this.m.face(this.dock.yaw, H.dt); yield; } }
    yield* this.wait(secs);
  }
  // Bump and turn
  *clean(secs, room = null) {
    const H = this.H, nav = H.nav, m = this.m, end = H.now + secs;
    this.mode = 'clean';
    let turning = null, lastX = m.x, lastZ = m.z, still = 0, wander = H.now + 15 + H.rnd() * 25;
    while (H.now < end) {
      const dt = H.dt;
      if (H.now < this.heldUntil) { m.v = 0; yield; continue; }
      if (turning !== null) {
        let d = Math.atan2(Math.sin(turning - m.yaw), Math.cos(turning - m.yaw));
        const step = Math.sign(d) * Math.min(Math.abs(d), dt * 1.8); m.yaw += step;
        if (Math.abs(d) < 0.03) turning = null;
        yield; continue;
      }
      const sp = 1.15, fx = Math.sin(m.yaw), fz = Math.cos(m.yaw);
      const ahead = (dist) => nav.freeAt(m.f, m.x + fx * dist, m.z + fz * dist, 2, false);
      if (!ahead(0.55) || !ahead(0.3) || H.blocked(this, m.x + fx * 1.0, m.z + fz * 1.0, 0.9)) {
        // pick a new heading that has room in front of it
        let best = null;
        for (let k = 0; k < 14; k++) {
          const a = m.yaw + Math.PI * (0.5 + H.rnd()) * (H.rnd() < 0.5 ? 1 : -1), ok = [0.6, 1.2, 2.0].every(s => nav.freeAt(m.f, m.x + Math.sin(a) * s, m.z + Math.cos(a) * s, 2, false));
          if (ok) { best = a; break; }
        }
        turning = best ?? m.yaw + Math.PI * 0.75;
        H.events.bumps++;
        yield; continue;
      }
      m.v = sp; m.x += fx * sp * dt; m.z += fz * sp * dt; m.y = nav.floorY(m.f, m.x, m.z);
      if (H.now > wander) { wander = H.now + 12 + H.rnd() * 15; turning = m.yaw + (H.rnd() - 0.5) * 1.6; }
      // stay mostly in the room being cleaned: past its walls, turn back toward its middle
      if (room && (m.x < room.x0 - 1 || m.x > room.x1 + 1 || m.z < room.z0 - 1 || m.z > room.z1 + 1) && H.rnd() < dt * 0.5) turning = Math.atan2((room.x0 + room.x1) / 2 - m.x, (room.z0 + room.z1) / 2 - m.z);
      still = Math.hypot(m.x - lastX, m.z - lastZ) < 0.02 ? still + dt : 0; lastX = m.x; lastZ = m.z;
      // if he has wedged himself somewhere, he heads for open floor
      if (!nav.freeAt(m.f, m.x, m.z, 2, false) || still > 6) {
        const c = nav.nearest(m.f, m.x, m.z, 2, 4);
        if (c >= 0) yield* this.go(m.f, nav.cx(c), nav.cz(c), { tries: 1 });
        still = 0;
      }
      yield;
    }
  }

  update(dt, t) {
    const H = this.H, a = this.aside, m = this.m;
    if (H.now >= this.nextManners) { this.nextManners = H.now + 0.25; this.manners(); }
    if (a.on === 1) { const s = m.update(dt, 1.6); if (s !== 'moving' && s !== 'waiting' || H.now - a.t0 > 5) { m.stop(); a.on = 2; a.t0 = H.now; } }
    else if (a.on === 2) { m.v = 0; if (H.visitor.present) m.faceTo(H.visitor.x, H.visitor.z, dt * 1.5); }
    else {
      if (!this.task) this.think();
      this.stepTask();
    }
    const b = this.body;
    b.root.position.set(m.x, m.y + 0.005, m.z); b.root.rotation.y = m.yaw + this.spin;
    if (this.mode !== 'dock') b.brush.rotation.y += dt * (this.mode === 'treat' ? 30 : 14);
    b.led.material.color.setHex(this.mode === 'dock' ? (Math.sin(t * 2) > 0 ? 0x6dff9a : 0x1c4a2a) : this.mode === 'treat' ? (Math.sin(t * 9) > 0 ? 0xffd27a : 0x6dff9a) : 0x6dff9a);
    this.inter.x = m.x; this.inter.y = m.y + 0.6; this.inter.z = m.z;
  }
}
