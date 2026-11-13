// Walking. A person 5'-5" at the eye, who cannot pass through walls, climbs
// stairs, and steps over thresholds. Mouse or touch to look, keys to move.

import * as THREE from 'three';

const RADIUS = 0.72, STEP_UP = 1.3, GRAVITY = 32, JUMP = 10.5;
let EYE = Number((() => { try { return localStorage.getItem('eye'); } catch { return null; } })() ?? 4.85);
export const eyeHeight = () => EYE;
export function setEyeHeight(v) { EYE = Math.max(4.2, Math.min(6.4, v)); try { localStorage.setItem('eye', EYE); } catch { /* private window */ } return EYE; }

export class Walker {
  constructor(camera, dom, { colliders, surfaces }) {
    this.camera = camera; this.dom = dom;
    this.colliders = colliders; this.surfaces = surfaces;
    this.pos = new THREE.Vector3();      // feet
    this.yaw = 0; this.pitch = 0;
    this.keys = new Set();
    this.enabled = false;
    this.touchMove = { x: 0, y: 0 };
    this.grounded = true; this.vy = 0; this.running = false;
    this.onLockChange = () => {};
    this.bind();
  }

  place(x, y, z, yaw = 0, pitch = 0) {
    this.pos.set(x, y, z); this.yaw = yaw; this.pitch = pitch; this.apply();
  }

  bind() {
    const d = this.dom;
    addEventListener('keydown', e => {
      if (e.code === 'KeyW' && !e.repeat) { const now = performance.now(); if (now - (this.lastW ?? 0) < 300) this.running = true; this.lastW = now; }
      if (e.code === 'Space' && this.enabled) { e.preventDefault(); if (this.grounded && !this.seated) { this.vy = JUMP; this.grounded = false; } }
      this.keys.add(e.code);
    });
    addEventListener('keyup', e => { if (e.code === 'KeyW') this.running = false; });
    addEventListener('keyup', e => this.keys.delete(e.code));
    addEventListener('blur', () => this.keys.clear());
    document.addEventListener('pointerlockchange', () => this.onLockChange(document.pointerLockElement === d));
    const look = (dx, dy, k) => {
      this.yaw -= dx * k; this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch - dy * k));
    };
    let drag = false;
    d.addEventListener('mousedown', () => { drag = true; });
    addEventListener('mouseup', () => { drag = false; });
    addEventListener('mousemove', e => {
      if (!this.enabled) return;
      if (document.pointerLockElement === d) look(e.movementX, e.movementY, 0.0022 * (this.lookScale ?? 1));
      else if (drag) look(-e.movementX, -e.movementY, 0.004 * (this.lookScale ?? 1));
    });
    // Touch: left half of the screen moves, right half looks.
    const touches = new Map();
    d.addEventListener('touchstart', e => {
      for (const t of e.changedTouches) touches.set(t.identifier, { x0: t.clientX, y0: t.clientY, x: t.clientX, y: t.clientY, move: t.clientX < innerWidth / 2 });
    }, { passive: true });
    d.addEventListener('touchmove', e => {
      if (!this.enabled) return;
      for (const t of e.changedTouches) {
        const s = touches.get(t.identifier); if (!s) continue;
        if (s.move) this.touchMove = { x: THREE.MathUtils.clamp((t.clientX - s.x0) / 60, -1, 1), y: THREE.MathUtils.clamp((t.clientY - s.y0) / 60, -1, 1) };
        else look(-(t.clientX - s.x), -(t.clientY - s.y), 0.005 * (this.lookScale ?? 1));
        s.x = t.clientX; s.y = t.clientY;
      }
      e.preventDefault();
    }, { passive: false });
    const end = e => { for (const t of e.changedTouches) { if (touches.get(t.identifier)?.move) this.touchMove = { x: 0, y: 0 }; touches.delete(t.identifier); } };
    d.addEventListener('touchend', end); d.addEventListener('touchcancel', end);
  }

  // The highest surface you could be standing on here, given how high you are.
  floorAt(x, z, y) {
    let best = 0;
    for (const s of this.surfaces) {
      if (x < s.x0 || x > s.x1 || z < s.z0 || z > s.z1) continue;
      const h = s.ramp ? s.h + (s.h2 - s.h) * ((s.z1 - z) / (s.z1 - s.z0)) : s.h;
      if (h <= y + (this.grounded ? STEP_UP : 0.35) && h > best) best = h;
    }
    return best;
  }

  collide(p) {
    const lo = p.y + 1.4, hi = p.y + (this.crouch > 0.5 ? 3.3 : 5.7);
    for (let pass = 0; pass < 3; pass++) {
      for (const c of this.colliders) {
        if (c.off || c.y1 <= lo || c.y0 >= hi) continue;
        const nx = Math.max(c.x0, Math.min(p.x, c.x1)), nz = Math.max(c.z0, Math.min(p.z, c.z1));
        const dx = p.x - nx, dz = p.z - nz, d2 = dx * dx + dz * dz;
        if (d2 >= RADIUS * RADIUS) continue;
        if (d2 > 1e-8) { const d = Math.sqrt(d2), k = (RADIUS - d) / d; p.x += dx * k; p.z += dz * k; }
        else {                                        // centre is inside the box: leave by the nearest face
          const l = p.x - c.x0, r = c.x1 - p.x, n = p.z - c.z0, f = c.z1 - p.z, m = Math.min(l, r, n, f);
          if (m === l) p.x = c.x0 - RADIUS; else if (m === r) p.x = c.x1 + RADIUS; else if (m === n) p.z = c.z0 - RADIUS; else p.z = c.z1 + RADIUS;
        }
      }
    }
  }

  // Sit down somewhere; any step stands you up again where you were.
  sit(seat) { this.seated = seat; this.yaw = seat.yaw; this.pitch = -0.05; }

  update(dt) {
    // Crouch while C is held (and stay down if there is no room to stand)
    this.crouching = this.enabled && !this.seated && this.keys.has('KeyC');
    this.crouch = (this.crouch ?? 0) + ((this.crouching ? 1 : 0) - (this.crouch ?? 0)) * Math.min(1, dt * 10);
    if (this.enabled && this.seated) {
      const k = this.keys;
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown'].some(c => k.has(c)) || Math.hypot(this.touchMove.x, this.touchMove.y) > 0.3) this.seated = null;
      if (k.has('ArrowLeft')) this.yaw += dt * 1.6;
      if (k.has('ArrowRight')) this.yaw -= dt * 1.6;
    } else if (this.enabled) {
      const k = this.keys;
      let f = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0) - this.touchMove.y;
      let s = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0) + this.touchMove.x;
      if (k.has('ArrowLeft')) this.yaw += dt * 1.6;
      if (k.has('ArrowRight')) this.yaw -= dt * 1.6;
      const len = Math.hypot(f, s);
      if (len > 0.01) {
        const speed = (this.crouching ? 2.6 : this.running || k.has('ShiftLeft') || k.has('ShiftRight') ? 11.5 : 5.2) * Math.min(1, len) / len;
        const sin = Math.sin(this.yaw), cos = Math.cos(this.yaw);
        const vx = (-sin * f + cos * s) * speed, vz = (-cos * f - sin * s) * speed;
        // Small sub-steps, so a fast walker cannot tunnel through a thin wall
        const n = Math.max(1, Math.ceil((speed * dt) / 0.3));
        for (let i = 0; i < n; i++) { this.pos.x += (vx * dt) / n; this.pos.z += (vz * dt) / n; this.collide(this.pos); }
      }
      // The edge of the world: the island's rim holds you back gently (but not while you are up on a deck
      // flagged `free`, as the treehouse's out over the edge are: their own rails hold you there)
      if (this.rim && !this.surfaces.some(s => s.free && this.pos.x >= s.x0 && this.pos.x <= s.x1 && this.pos.z >= s.z0 && this.pos.z <= s.z1 && this.pos.y > Math.min(s.h, s.h2 ?? s.h) - 0.8)) { const dx = this.pos.x - this.rim.x, dz = this.pos.z - this.rim.z, d = Math.hypot(dx, dz), max = this.rim.at ? this.rim.at(Math.atan2(dz, dx)) : this.rim.r; if (d > max) { this.pos.x = this.rim.x + (dx / d) * max; this.pos.z = this.rim.z + (dz / d) * max; } }
      // Feet: step up small rises smoothly; fall, or jump, under gravity.
      const floor = this.floorAt(this.pos.x, this.pos.z, this.pos.y);
      if (this.grounded && floor >= this.pos.y - 0.6) this.pos.y += (floor - this.pos.y) * Math.min(1, dt * 14);
      else {
        this.grounded = false; this.vy = (this.vy ?? 0) - GRAVITY * dt; this.pos.y += this.vy * dt;
        if (this.pos.y <= floor) { this.pos.y = floor; this.vy = 0; this.grounded = true; }
      }
    }
    this.apply();
  }

  apply() {
    const s = this.seated, c = this.camera.position;
    if (s) c.lerp(new THREE.Vector3(s.x, s.y, s.z), 0.12);
    else if (this.wasSeated) c.lerp(new THREE.Vector3(this.pos.x, this.pos.y + EYE * (1 - 0.45 * (this.crouch ?? 0)), this.pos.z), 0.15);
    else c.set(this.pos.x, this.pos.y + EYE * (1 - 0.45 * (this.crouch ?? 0)), this.pos.z);
    this.wasSeated = s || (this.wasSeated && c.distanceTo(new THREE.Vector3(this.pos.x, this.pos.y + EYE * (1 - 0.45 * (this.crouch ?? 0)), this.pos.z)) > 0.05);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }
}
