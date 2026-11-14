// The play set on the north lawn, silvered with age: a timber tower with a canvas roof,
// a staircase up, a slide you can really go down, monkey bars you can swing
// across, two swings on a long beam, and a sandbox with a half-built castle.

import * as THREE from 'three';
import { PAINT } from './tools.js';

export const PLAY = { x: 62, z: 6, deck: 5.0 };

export function buildPlay(K) {
  const { G } = K, { x: X, z: Z, deck: D } = PLAY;
  const cedar = PAINT.cedar, G0 = { grain: 'long' };
  const x0 = X - 2.5, x1 = X + 2.5, z0 = Z - 2.5, z1 = Z + 2.5;
  G.blob('soil', X - 11.6, Z, 2.4, 6.5, { wobble: 0.3, y: 0.06 }); G.blob('soil', X - 6.4, Z, 2.2, 6, { wobble: 0.3, y: 0.06 }); G.blob('soil', X, Z - 15.2, 2, 1.6, { wobble: 0.3, y: 0.06 });   // worn bare under the swings and the slide

  // Tower: posts, deck, rails, and the roof
  for (const [px, pz] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) K.box(cedar, px - 0.18, px + 0.18, 0, 10.2, pz - 0.18, pz + 0.18, G0);
  K.box(cedar, x0 - 0.1, x1 + 0.1, D - 0.5, D - 0.15, z0 - 0.1, z1 + 0.1, G0);                       // joists
  for (let x = x0; x < x1 - 0.1; x += 0.5) K.box(cedar, x + 0.02, x + 0.46, D - 0.15, D, z0, z1, G0);       // deck boards
  K.collide(x0, x1, z0, z1, D - 0.1); K.surface(x0, x1, z0, z1, D);
  const rail = (ax, bx, az, bz) => {
    for (const h of [D + 1.4, D + 2.9]) K.box(cedar, Math.min(ax, bx) - 0.1, Math.max(ax, bx) + 0.1, h, h + 0.22, Math.min(az, bz) - 0.1, Math.max(az, bz) + 0.1, G0);
    const n = Math.round(Math.hypot(bx - ax, bz - az) / 0.45);
    for (let i = 1; i < n; i++) { const t = i / n, x = ax + (bx - ax) * t, z = az + (bz - az) * t; K.box(cedar, x - 0.06, x + 0.06, D, D + 2.9, z - 0.06, z + 0.06); }
    K.collide(ax - 0.12, bx + 0.12, az - 0.12, bz + 0.12, D + 3.2, D - 0.2);
  };
  rail(x0, x0, z0, z1);                                    // swing side
  rail(x1, x1, z0, Z - 1.3); rail(x1, x1, Z + 1.3, z1);     // monkey-bar opening
  rail(x0, X - 1.15, z0, z0); rail(X + 1.15, x1, z0, z0);   // slide opening
  rail(x0, X - 1.45, z1, z1); rail(X + 1.45, x1, z1, z1);   // stair opening
  // Roof: two striped canvas slopes on a ridge
  const ridge = 12.4, eave = 10.0;
  K.box(cedar, X - 0.15, X + 0.15, 10.2, ridge, z0 - 0.15, z0 + 0.15); K.box(cedar, X - 0.15, X + 0.15, 10.2, ridge, z1 - 0.15, z1 + 0.15);
  K.box(cedar, X - 0.15, X + 0.15, ridge - 0.25, ridge + 0.05, z0 - 0.6, z1 + 0.6, G0);
  for (const s of [-1, 1]) for (let i = 0; i < 8; i++) {
    const za = z0 - 0.6 + (i * (z1 - z0 + 1.2)) / 8, zb = za + (z1 - z0 + 1.2) / 8;
    const g = new THREE.BufferGeometry(), a = [X, ridge, za], b = [X, ridge, zb], c = [X + s * 3.1, eave, zb], d = [X + s * 3.1, eave, za];
    const pos = s > 0 ? [...a, ...b, ...c, ...a, ...c, ...d] : [...a, ...c, ...b, ...a, ...d, ...c];
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(12).fill(0), 2)); g.computeVertexNormals();
    K.put(i % 2 ? PAINT.canvas : PAINT.stripe, g);
    const g2 = g.clone(); const p = g2.attributes.position; for (let k = 0; k < p.count; k++) p.setY(k, p.getY(k) - 0.04);
    const arr = Array.from(p.array); const flip = []; for (let k = 0; k < arr.length; k += 9) flip.push(...arr.slice(k, k + 3), ...arr.slice(k + 6, k + 9), ...arr.slice(k + 3, k + 6));
    g2.setAttribute('position', new THREE.Float32BufferAttribute(flip, 3)); g2.computeVertexNormals(); K.put(i % 2 ? PAINT.canvas : PAINT.stripe, g2);
  }
  // A faded pennant
  K.box(PAINT.iron, X - 0.04, X + 0.04, ridge, ridge + 3.2, Z - 0.04, Z + 0.04);
  K.flag = { x: X, y: ridge + 3.1, z: Z };

  // Staircase up the street side
  {
    const sx0 = X - 1.4, sx1 = X + 1.4;
    for (let i = 0; i < 5; i++) { const h = (D * (i + 1)) / 6, z = z1 + 5 - i * 1.0; K.box(cedar, sx0, sx1, h - 0.15, h, z - 1.0, z, G0); }
    for (const sx of [sx0 - 0.15, sx1 + 0.15]) { K.beam(cedar, [sx, 0, z1 + 5.2], [sx, D, z1], 0.25, 0.7); K.collide(sx - 0.15, sx + 0.15, z1, z1 + 5.2, D + 3); }
    for (const sx of [sx0 - 0.15, sx1 + 0.15]) { K.box(cedar, sx - 0.1, sx + 0.1, 0, 3.2, z1 + 5.0, z1 + 5.2); K.beam(cedar, [sx, 3.1, z1 + 5.1], [sx, D + 2.9, z1], 0.18, 0.18); }
    K.surface(sx0, sx1, z1, z1 + 5.2, 0.1, D);
  }

  // The slide, down the back
  // One continuous chute: steep off the deck, easing out level to a low lip (it used to be straight
  // boards with a separate flat end piece a step lower, and side boards that twisted from one length
  // to the next). Bed, both sides and their top edges are strips cut from the same curve.
  const sl = { x: X, top: z0, bottom: z0 - 11.2, w: 1.1 };
  {
    const N = 28, LIP = 0.62, h = t => LIP + (D - LIP) * (1 - t) * (1 - t) * (1 + 0.6 * t), zOf = t => sl.top - (sl.top - sl.bottom) * t;
    const bed = [], bedUnder = [], side = [], quad = (list, a, b, c, d) => list.push(...a, ...b, ...c, ...a, ...c, ...d, ...a, ...c, ...b, ...a, ...d, ...c);      // both faces
    for (let i = 0; i < N; i++) {
      const t0 = i / N, t1 = (i + 1) / N, za = zOf(t0), zb = zOf(t1), ya = h(t0), yb = h(t1), W = sl.w, TH = 0.07, UP = 0.62;
      quad(bed, [X - W, ya, za], [X + W, ya, za], [X + W, yb, zb], [X - W, yb, zb]);
      quad(bedUnder, [X - W, ya - 0.08, za], [X + W, ya - 0.08, za], [X + W, yb - 0.08, zb], [X - W, yb - 0.08, zb]);
      for (const s of [-1, 1]) {
        const xi = X + s * W, xo = X + s * (W + TH);
        quad(side, [xi, ya - 0.08, za], [xi, ya + UP, za], [xi, yb + UP, zb], [xi, yb - 0.08, zb]);        // inner face
        quad(side, [xo, ya - 0.08, za], [xo, ya + UP, za], [xo, yb + UP, zb], [xo, yb - 0.08, zb]);        // outer face
        quad(side, [xi, ya + UP, za], [xo, ya + UP, za], [xo, yb + UP, zb], [xi, yb + UP, zb]);            // top edge
        if (i === N - 1) quad(side, [xi, yb - 0.08, zb], [xo, yb - 0.08, zb], [xo, yb + UP, zb], [xi, yb + UP, zb]);      // end
      }
    }
    for (const [mat, list] of [['c#b8aa72/0.4', bed], ['c#8f8456/0.6', bedUnder], ['c#a89a62/0.5', side]]) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(list, 3)); g.computeVertexNormals(); K.put(mat, g); }
    for (const s of [-1, 1]) { K.box(cedar, X + s * 0.9 - 0.12, X + s * 0.9 + 0.12, 0, LIP - 0.08, sl.bottom + 0.2, sl.bottom + 0.4); K.collide(X + s * (sl.w + 0.05) - 0.12, X + s * (sl.w + 0.05) + 0.12, sl.bottom, sl.top, 7.5); }
    for (let k = 0; k < 10; k++) K.surface(X - sl.w + 0.05, X + sl.w - 0.05, zOf((k + 1) / 10), zOf(k / 10), h(k / 10) + 0.02, h((k + 1) / 10) + 0.02);
    K.slide = { ...sl, h };
  }

  // Monkey bars toward the north
  {
    const mx0 = x1, mx1 = x1 + 11, H = D + 2.4;
    for (const s of [-1, 1]) { K.box(cedar, mx0, mx1, H - 0.2, H + 0.1, Z + s * 1.25 - 0.12, Z + s * 1.25 + 0.12, G0); K.box(cedar, mx1 - 0.18, mx1 + 0.18, 0, H + 0.1, Z + s * 1.25 - 0.18, Z + s * 1.25 + 0.18, G0); K.collide(mx1 - 0.25, mx1 + 0.25, Z + s * 1.25 - 0.25, Z + s * 1.25 + 0.25, 9); }
    for (let x = mx0 + 0.8; x < mx1 - 0.3; x += 1.05) K.tube('c#4f6a5e/0.6/0.6', [x, H - 0.25, Z - 1.25], [x, H - 0.25, Z + 1.25], 0.07, 8);
    for (let y = 1; y < H - 0.5; y += 1.1) K.tube('c#4f6a5e/0.6/0.6', [mx1, y, Z - 1.25], [mx1, y, Z + 1.25], 0.07, 8);
    K.monkey = { x0: mx0, x1: mx1, y: H - 0.25, z: Z };
  }

  // Swing beam toward the south, on an A-frame
  {
    const bx0 = x0, bx1 = x0 - 14, H = 9.6;
    K.box(cedar, bx1 - 0.4, bx0, H, H + 0.55, Z - 0.22, Z + 0.22, G0);
    for (const s of [-1, 1]) { K.beam(cedar, [bx1, 0, Z + s * 4.2], [bx1, H + 0.1, Z + s * 0.2], 0.4, 0.4); K.collide(bx1 - 0.35, bx1 + 0.35, Z + s * 4.2 - 0.4, Z + s * 4.2 + 0.4, 8); K.collide(bx1 - 0.3, bx1 + 0.3, Z + s * 2.2 - 0.4, Z + s * 2.2 + 0.4, 8); }
    K.beam(cedar, [bx1, 3.2, Z - 2.9], [bx1, 3.2, Z + 2.9], 0.25, 0.4);
    K.swings = [{ x: bx0 - 4.2, y: H, z: Z, len: 7.5 }, { x: bx0 - 9.4, y: H, z: Z, len: 7.5 }];
  }

  // Sandbox, with a castle and a bucket
  {
    const ax0 = X + 6, ax1 = X + 12, az0 = Z + 6, az1 = Z + 12;
    for (const [a, b, c, d] of [[ax0, ax1, az0, az0 + 0.4], [ax0, ax1, az1 - 0.4, az1], [ax0, ax0 + 0.4, az0, az1], [ax1 - 0.4, ax1, az0, az1]]) K.box(cedar, a, b, 0, 0.8, c, d, G0);
    G.rect('sand', ax0 + 0.4, ax1 - 0.4, az0 + 0.4, az1 - 0.4, { y: 0.5 }); K.surface(ax0, ax1, az0, az1, 0.5);
    const cx = ax0 + 3.4, cz = az0 + 3.2;
    K.cyl(PAINT.sand, cx, 0.5, 1.15, cz, 0.6, 0.5, 10); K.cyl(PAINT.sand, cx, 1.15, 1.45, cz, 0.38, 0.32, 10);
    for (const [dx, dz] of [[-0.75, -0.75], [0.75, -0.75], [-0.75, 0.75], [0.75, 0.75]]) { K.cyl(PAINT.sand, cx + dx, 0.5, 1.0, cz + dz, 0.25, 0.22, 8); K.lathe(PAINT.sand, cx + dx, 1.0, cz + dz, [[0.01, 0], [0.24, 0], [0.01, 0.35]], 8); }
    K.lathe('c#d8473a/0.5', ax0 + 1.5, 0.5, az0 + 1.4, [[0.01, 0], [0.32, 0], [0.42, 0.62], [0.44, 0.66], [0.4, 0.66], [0.38, 0.1]], 14);
    K.tube(PAINT.iron, [ax0 + 1.1, 1.15, az0 + 1.4], [ax0 + 1.9, 1.15, az0 + 1.4], 0.02, 4);
    K.box('c#3a7ad9/0.5', ax0 + 2.0, ax0 + 2.15, 0.52, 0.56, az0 + 4.4, az0 + 5.4);
    K.box('c#3a7ad9/0.5', ax0 + 1.85, ax0 + 2.3, 0.52, 0.6, az0 + 5.4, az0 + 5.9);
    // E turns out a bucket of sand beside the bucket: three towers, a fourth on top of them with a flag; once more
    // and it is patted flat to start again. Built here and hidden; nothing runs except for a moment after a press.
    K.setups.push(ctx => {
      const sand = new THREE.MeshStandardMaterial({ color: new THREE.Color(0xd9c79f).multiplyScalar(0.78), roughness: 0.78, envMapIntensity: 0.7 });
      const turned = new THREE.LatheGeometry([[0.001, 0], [0.4, 0], [0.38, 0.07], [0.3, 0.6], [0.001, 0.6]].map(([a, b]) => new THREE.Vector2(a, b)), 12);
      const towers = [[0.95, 0.5, 2.75, 1], [1.85, 0.5, 2.7, 1], [1.4, 0.5, 3.5, 1], [1.4, 1.08, 2.98, 0.82]].map(([x, y, z, s]) => {
        const m = new THREE.Mesh(turned, sand); m.position.set(ax0 + x, y, az0 + z); m.userData.s = s; m.visible = false; m.castShadow = m.receiveShadow = true; m.name = 'sand tower'; ctx.scene.add(m); return m;
      });
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.55, 5), sand); stick.position.y = 0.6 + 0.26;
      const pennant = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.25, 0), new THREE.Vector3(0, 0.05, 0), new THREE.Vector3(0.3, 0.15, 0.04)]), new THREE.MeshStandardMaterial({ color: 0xc23b30, roughness: 0.8, side: THREE.DoubleSide }));
      pennant.geometry.computeVertexNormals(); stick.add(pennant); towers[3].add(stick);
      let n = 0, run = 0;
      // a tower comes out of the bucket with a little bounce; the lot slumps flat
      const move = (list, up) => {
        const t0 = performance.now(), id = ++run;
        const step = () => {
          const k = Math.min(1, (performance.now() - t0) / (up ? 320 : 420));
          for (const m of list) { const s = m.userData.s; if (up) { const e = 1 + 2.2 * (k - 1) ** 3 + 1.2 * (k - 1) ** 2; m.scale.setScalar(s * (0.35 + 0.65 * e)); } else m.scale.set(s * (1 + 0.5 * k), s * (1 - 0.97 * k), s * (1 + 0.5 * k)); }
          if (k < 1 && id === run) requestAnimationFrame(step); else for (const m of list) { m.scale.setScalar(m.userData.s); if (!up) m.visible = false; }
        };
        step();
      };
      ctx.interact.push({ x: ax0 + 1.4, y: 1.0, z: az0 + 3.0, reach: 6, size: 0.9,
        label: () => (n < 3 ? 'turn out a bucket of sand' : n === 3 ? 'one more on top, and the flag' : 'pat the sandcastle flat'),
        act: () => { if (n < 4) { const m = towers[n++]; m.visible = true; move([m], true); } else { n = 0; move(towers, false); } } });
    });
  }
  K.model('football', X + 15, Z - 12, 0.4, { scale: 1 });
}

// Moving parts: swings that carry you, the slide ride, the monkey bars, the pennant
export function playLife(ctx, K) {
  const { scene, animated, interact } = ctx;
  const chain = new THREE.MeshStandardMaterial({ color: 0x8a8a86, roughness: 0.4, metalness: 0.8 });
  const strap = new THREE.MeshStandardMaterial({ color: 0x2b3a33, roughness: 0.7 });
  K.swings.forEach((s, i) => {
    const g = new THREE.Group(); g.position.set(s.x, s.y, s.z); scene.add(g);
    for (const dx of [-0.8, 0.8]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, s.len, 5), chain); c.position.set(dx, -s.len / 2, 0); g.add(c); }
    const seatM = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.62), strap); seatM.position.y = -s.len; g.add(seatM);
    const seat = { x: s.x, y: s.y - s.len + 2.6, z: s.z, yaw: Math.PI, label: 'sit on the swing' };
    interact.push({ x: s.x, y: s.y - s.len + 1.2, z: s.z, reach: 6, seat, label: () => 'sit on the swing' });
    let amp = 0.05, ph = i * 1.9, th = 0;
    animated.push((t, dt) => {
      const riding = ctx.walker?.seated === seat;
      amp += ((riding ? 0.62 : 0.015 + 0.01 * Math.sin(t * 0.1 + i)) - amp) * Math.min(1, dt * (riding ? 0.35 : 0.5));
      ph += dt * Math.sqrt(32 / s.len) ; th = amp * Math.sin(ph);
      g.rotation.x = th;
      seat.y = s.y - s.len * Math.cos(th) + 2.6; seat.z = s.z - s.len * Math.sin(th);
    });
  });

  // The slide: E at the top, and down you go
  const sl = K.slide; let ride = -1;
  interact.push({ x: sl.x, y: PLAY.deck + 3.6, z: sl.top - 0.6, reach: 5, label: () => 'go down the slide', act: () => { ride = 0; } });
  // Monkey bars: E at the tower edge
  const mb = K.monkey; let swing = -1;
  interact.push({ x: mb.x0 + 0.6, y: PLAY.deck + 4.2, z: mb.z, reach: 5, label: () => 'swing across the monkey bars', act: () => { swing = 0; } });
  animated.push((t, dt) => {
    const w = ctx.walker; if (!w) return;
    if (ride >= 0) {
      ride += dt; const T = 1.9, u = Math.min(1, ride / T), e = u * u;
      const z = sl.top - 0.4 - (sl.top - sl.bottom - 0.6) * e, tt = THREE.MathUtils.clamp((sl.top - z) / (sl.top - sl.bottom), 0, 1);
      w.pos.set(sl.x, sl.h(tt) + 0.1, z); w.yaw = 0; w.pitch = THREE.MathUtils.lerp(-0.45, -0.1, u); w.grounded = true; w.vy = 0; w.seated = null; w.apply();
      if (u >= 1) { ride = -1; w.pos.z = sl.bottom - 2.2; w.pos.y = 0; w.apply(); }
    }
    if (swing >= 0) {
      swing += dt; const T = 6.5, u = Math.min(1, swing / T), x = mb.x0 + 0.6 + (mb.x1 - mb.x0 - 1.2) * u;
      w.pos.set(x, mb.y - 5.6 + 0.25 * Math.abs(Math.sin(u * Math.PI * 10)), mb.z + 0.15 * Math.sin(u * Math.PI * 10)); w.yaw = -Math.PI / 2; w.pitch = 0.05; w.grounded = true; w.vy = 0; w.seated = null; w.apply();
      if (u >= 1) { swing = -1; w.pos.x = mb.x1 + 1.4; w.grounded = false; w.apply(); }
    }
  });

  // A faded pennant
  {
    const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
    g.fillStyle = '#a8584a'; g.beginPath(); g.moveTo(0, 0); g.lineTo(256, 64); g.lineTo(0, 128); g.fill();
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const geo = new THREE.PlaneGeometry(2.6, 1.3, 8, 1); geo.translate(1.3, 0, 0);
    const flag = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 }));
    flag.position.set(K.flag.x, K.flag.y - 0.7, K.flag.z); flag.rotation.y = -Math.PI / 2 + 0.3; scene.add(flag);
    const base = geo.attributes.position.array.slice();
    animated.push(t => { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = base[i * 3]; p.setZ(i, Math.sin(t * 1.1 + x * 1.5) * 0.04 * (0.4 + 0.6 * Math.max(0, Math.sin(t * 0.13))) * x / 2.6); } p.needsUpdate = true; });
  }
}
