// Fireworks, from the box of rockets in the catalogue. A rocket goes up from the grass in front of
// the visitor on a tail of gold, and opens a hundred feet over the garden. All of it is one pool of
// points (sparks.js): no lights are added, and nothing runs once the last spark has gone out.
// Test hook (catalogue.js): ?catalogue=fireworks sends up three.

import { makeSparks } from './sparks.js';

const KINDS = [
  { n: 'peony', cols: [0xff5a7a, 0xffc2d0] }, { n: 'peony', cols: [0x7ad0ff, 0xe0f6ff] }, { n: 'peony', cols: [0x9dff8a, 0xf2ffd0] }, { n: 'peony', cols: [0xc59bff, 0xffd75e] },
  { n: 'willow', cols: [0xffc45a, 0xffe2a0] }, { n: 'ring', cols: [0xff7ac8, 0x7ae0ff] }, { n: 'crackle', cols: [0xffffff, 0xffd75e] },
];

export function makeFireworks(ctx) {
  const { THREE, scene } = ctx;
  const S = makeSparks(THREE, 1100); scene.add(S.points);
  const live = [];                       // rockets on the way up
  let ticking = false, shots = 0;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const thump = big => { try { ctx.sound?.note?.(big ? 31 : 38, 0, 1.4, big ? 0.3 : 0.16); ctx.sound?.note?.(26, 0.02, 1.8, big ? 0.22 : 0.1); } catch { /* no sound yet */ } };

  function burst(x, y, z, K) {
    const n = K.n === 'ring' ? 90 : K.n === 'willow' ? 150 : 170, sp = K.n === 'willow' ? 18 : 26;
    for (let i = 0; i < n; i++) {
      let dx, dy, dz;
      if (K.n === 'ring') { const a = i / n * Math.PI * 2; dx = Math.cos(a); dy = Math.sin(a) * 0.35; dz = Math.sin(a); }
      else { const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u); dx = r * Math.cos(a); dy = u; dz = r * Math.sin(a); }
      const v = sp * (K.n === 'ring' ? 1 : 0.55 + 0.45 * Math.random());
      const col = K.cols[i % K.cols.length];
      if (K.n === 'willow') S.spawn(x, y, z, dx * v, dy * v + 6, dz * v, rnd(3.2, 4.6), col, 1.0, { g: 9, drag: 0.9, twinkle: 0 });
      else S.spawn(x, y, z, dx * v, dy * v, dz * v, rnd(1.6, 2.6), col, K.n === 'crackle' ? 1.2 : 1.7, { g: 7, drag: 1.5, twinkle: K.n === 'crackle' ? 30 : 0 });
    }
    S.spawn(x, y, z, 0, 0, 0, 0.35, 0xffffff, 26);                               // the flash at the heart of it
    if (K.n === 'crackle') for (let i = 0; i < 60; i++) setTimeout(() => S.spawn(x + rnd(-22, 22), y + rnd(-18, 14), z + rnd(-22, 22), 0, -2, 0, rnd(0.3, 0.7), 0xfff2c0, 1.1, { twinkle: 40 }), 700 + Math.random() * 900);
    thump(true);
    for (let i = 0; i < 4; i++) try { ctx.sound?.note?.(96 + Math.floor(Math.random() * 10), 0.25 + i * 0.13, 0.4, 0.035); } catch { /* quiet */ }
  }

  function tick(t, dt) {
    dt = Math.min(dt, 0.05);
    for (let i = live.length - 1; i >= 0; i--) {
      const r = live[i]; r.t += dt;
      r.vy -= 16 * dt; r.x += r.vx * dt; r.y += r.vy * dt; r.z += r.vz * dt;
      for (let k = 0; k < 2; k++) S.spawn(r.x + rnd(-0.2, 0.2), r.y, r.z + rnd(-0.2, 0.2), rnd(-1, 1), rnd(-9, -4), rnd(-1, 1), rnd(0.35, 0.8), 0xffc060, 0.5, { g: 6 });
      S.spawn(r.x, r.y, r.z, 0, 0, 0, 0.08, 0xfff4d0, 1.1);
      if (r.vy < 6 || r.t > 3.2) { live.splice(i, 1); burst(r.x, r.y, r.z, r.K); }
    }
    if (!S.step(dt) && !live.length) { ticking = false; return false; }
    return true;
  }
  const runner = (t, dt) => { if (ticking) tick(t, dt); };
  ctx.animated.push(runner);

  // Send one up from (x, y, z), leaning a little the way (dx, dz) points
  function launch(x, y, z, dx = 0, dz = 0) {
    const K = KINDS[(shots++ * 3 + Math.floor(Math.random() * 2)) % KINDS.length], L = Math.hypot(dx, dz) || 1;
    live.push({ x, y, z, vx: dx / L * rnd(9, 13) + rnd(-2, 2), vy: rnd(41, 47), vz: dz / L * rnd(9, 13) + rnd(-2, 2), t: 0, K });      // (it opens about sixty feet up and forty ahead: in view with the head tipped back a little)
    ticking = true; thump(false);
    try { for (let i = 0; i < 7; i++) ctx.sound?.note?.(72 + i * 3, i * 0.05, 0.25, 0.03); } catch { /* quiet */ }      // the whistle, more or less
    return K.n;
  }
  return { launch, get busy() { return ticking; }, sparks: S };
}
