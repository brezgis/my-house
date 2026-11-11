// Sir Reginald, the vacuum. Trundles about the ground floor in straight lines,
// turns when he meets something, now and then sets off for another room, and
// goes home to his dock for a rest. He has googly eyes; Fig stuck them on.

import { Agent } from './agent.js';
import { Mover } from './nav.js';
import { buildRoomba } from './models.js';

export class Roomba extends Agent {
  constructor(H) {
    super(H);
    this.name = 'Reginald';
    this.body = buildRoomba(); H.group.add(this.body.root);
    this.m = new Mover(H.nav, { need: 2, opener: false, speed: 1.1, turn: 2.5 });
    this.m.avoid = (x, z) => H.blocked(this, x, z, 0.9);
    this.top = this.body.top; this.rider = null; this.mode = 'dock'; this.heldUntil = 0; this.dock = null;
    this.bubble = H.bubbles.make('Reginald');
    this.inter = { x: 0, y: 0, z: 0, reach: 5, label: () => 'pat Reginald', act: () => this.patted() };
    H.ctx.interact.push(this.inter);
    this.pats = 0;
  }
  get x() { return this.m.x; } get z() { return this.m.z; } get y() { return this.m.y; } get f() { return this.m.f; } get yaw() { return this.m.yaw; }
  hold(s) { this.heldUntil = this.H.now + s; }
  patted() {
    const H = this.H, lines = ['*beep boop*', '*Reginald has no thoughts. Reginald is at peace.*', '*happy little whirr*', '*bumps your foot affectionately*'];
    this.bubble.say(lines[this.pats++ % lines.length], 3, H.now);
    H.chirp([84, 88], 0.035, this);
  }

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
    const H = this.H;
    if (!this.task) this.think();
    this.stepTask();
    const b = this.body, m = this.m;
    b.root.position.set(m.x, m.y + 0.005, m.z); b.root.rotation.y = m.yaw;
    if (this.mode !== 'dock') b.brush.rotation.y += dt * 14;
    b.led.material.color.setHex(this.mode === 'dock' ? (Math.sin(t * 2) > 0 ? 0x6dff9a : 0x1c4a2a) : 0x6dff9a);
    this.inter.x = m.x; this.inter.y = m.y + 0.6; this.inter.z = m.z;
  }
}
