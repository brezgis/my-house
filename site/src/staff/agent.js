// What every member of the household has in common: a body that moves with a
// Mover, and a current task, written as a generator that yields once a frame.
// A task can be replaced at any moment (if it allows) by something better.

export class Agent {
  constructor(H) { this.H = H; this.task = null; this.taskName = 'idle'; this.interruptible = true; this.history = []; }
  run(name, gen, interruptible = true) {
    if (this.task) { const old = this.task; this.task = null; try { old.return(); } catch { /* already finished */ } }
    this.m?.stop();
    this.task = gen; this.taskName = name; this.interruptible = interruptible;
    this.history.push([Math.round(this.H.now), name]); if (this.history.length > 200) this.history.shift();
  }
  stepTask() {
    if (!this.task) return;
    let r;
    try { r = this.task.next(); } catch (err) { console.warn('staff task', this.name, this.taskName, err); r = { done: true }; }
    if (r.done && this.task) { this.task = null; this.taskName = 'idle'; this.interruptible = true; }
  }
  *wait(s, until = null) { const end = this.H.now + s; while (this.H.now < end) { if (until?.()) return true; yield; } return false; }
  *go(f, x, z, o = {}) {
    const m = this.m; let tries = o.tries ?? 3;
    if (!m.goTo(f, x, z)) return false;
    for (;;) {
      const s = m.update(this.H.dt, o.speed ?? this.speedScale?.() ?? 1);
      if (s === 'arrived') return true;
      if (s === 'failed' || s === 'idle') { if (--tries <= 0 || !m.goTo(f, x, z)) { m.stop(); return false; } }
      if (o.until?.()) { m.stop(); return true; }
      yield;
    }
  }
  dist(o) { return Math.hypot(o.x - this.m.x, o.z - this.m.z); }
}

export function rngFrom(seed) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
export function weighted(list, rnd) {
  const tot = list.reduce((a, [, w]) => a + Math.max(0, w), 0); if (tot <= 0) return null;
  let r = rnd() * tot; for (const [k, w] of list) { r -= Math.max(0, w); if (r <= 0) return k; } return list[list.length - 1][0];
}
