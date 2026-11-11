// Easter eggs of nature: a snail on a pot by the front door, a hare in the
// lettuces, a red squirrel on the tree seat, a jay at the bird bath (these
// three are low-poly models from the village project), butterflies by day,
// dragonflies over the pond, fireflies over the meadow at night.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { rng, cardMaterials, atlasTexture, cellUV } from './cards.js';

// Merge coloured parts into one mesh (vertex colours)
function critter(parts, o = {}) {
  const geos = parts.map(([geo, color]) => {
    const g = (geo.index ? geo.toNonIndexed() : geo).clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal'].includes(k)) g.deleteAttribute(k);
    const n = g.attributes.position.count, c = new Float32Array(n * 3), col = new THREE.Color(color);
    for (let i = 0; i < n; i++) col.toArray(c, i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    return g;
  });
  const m = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: o.rough ?? 0.8 }));
  m.castShadow = false; m.receiveShadow = true;
  return m;
}
const S = (r, w = 10, h = 8) => new THREE.SphereGeometry(r, w, h);
const at = (g, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => { g.scale(sx, sy, sz); g.rotateX(rx); g.rotateY(ry); g.rotateZ(rz); g.translate(x, y, z); return g; };

function snail() {
  const pts = []; for (let i = 0; i <= 60; i++) { const t = i / 60, a = t * Math.PI * 5, rr = 0.12 * (1 - t * 0.85); pts.push(new THREE.Vector3(Math.cos(a) * rr, Math.sin(a) * rr + 0.13, t * 0.06)); }
  const shell = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.05, 6).toNonIndexed();
  const sp = shell.attributes.position, sc = new Float32Array(sp.count * 3);
  for (let i = 0; i < sp.count; i++) { const band = Math.sin(i * 0.05) > 0.6; new THREE.Color(band ? 0x5a3a1e : 0xb0884a).toArray(sc, i * 3); }
  const body = at(S(0.06), 0.02, 0.03, 0.03, 3.2, 0.6, 1);
  const stalks = [-1, 1].map(s => at(new THREE.CylinderGeometry(0.008, 0.01, 0.1, 4), 0.2, 0.09, 0.03 + s * 0.02, 1, 1, 1, s * 0.3, 0, -0.5));
  const eyes = [-1, 1].map(s => at(S(0.015, 5, 4), 0.23, 0.14, 0.03 + s * 0.035));
  const m = critter([[body, 0x9a8a6a], ...stalks.map(g => [g, 0x8a7a5a]), ...eyes.map(g => [g, 0x2a2420])]);
  const sg = shell; for (const k of Object.keys(sg.attributes)) if (!['position', 'normal'].includes(k)) sg.deleteAttribute(k); sg.setAttribute('color', new THREE.BufferAttribute(sc, 3));
  const sh = new THREE.Mesh(sg, m.material); m.add(sh);
  return m;
}
function hedgehog(r) {
  const parts = [[at(S(0.45, 12, 8), 0, 0.25, 0, 1.3, 0.75, 1), 0x6a5038], [at(new THREE.ConeGeometry(0.18, 0.42, 8), 0.62, 0.2, 0, 1, 1, 1, 0, 0, -Math.PI / 2), 0xb89a78], [at(S(0.05, 6, 4), 0.84, 0.21, 0), 0x0c0a08]];
  for (const s of [-1, 1]) parts.push([at(S(0.035, 6, 4), 0.6, 0.32, s * 0.11), 0x0c0a08]);
  for (let i = 0; i < 90; i++) { const a = r() * Math.PI * 2, b = r() * 1.2, x = Math.cos(a) * Math.sin(b) * 0.55 - 0.05, y = 0.25 + Math.cos(b) * 0.32, z = Math.sin(a) * Math.sin(b) * 0.45; if (x > 0.45) continue; const g = new THREE.ConeGeometry(0.03, 0.22, 3); g.rotateX(Math.PI / 2); g.lookAt(new THREE.Vector3(x * 2, (y - 0.15) * 2, z * 2)); parts.push([at(g, x, y, z), r() < 0.5 ? 0x3a2a1c : 0xc8b090]); }
  return critter(parts);
}
function rabbit() {
  const g = new THREE.Group();
  const body = critter([[at(S(0.42, 12, 10), 0, 0.42, 0, 1.15, 1, 0.85), 0x8a7a68], [at(S(0.26, 12, 10), 0.42, 0.85, 0), 0x8f7f6c], [at(S(0.13), -0.5, 0.4, 0), 0xf2efe6], [at(S(0.05, 6, 4), 0.62, 0.85, 0), 0x6a4a4a],
    [at(S(0.045, 6, 4), 0.55, 0.92, 0.17), 0x120e0c], [at(S(0.045, 6, 4), 0.55, 0.92, -0.17), 0x120e0c], [at(S(0.16, 8, 6), 0.25, 0.12, 0.22, 1.6, 0.5, 0.8), 0x7a6a58], [at(S(0.16, 8, 6), 0.25, 0.12, -0.22, 1.6, 0.5, 0.8), 0x7a6a58]]);
  g.add(body);
  const ears = [-1, 1].map(s => { const e = critter([[at(S(0.12, 8, 6), 0, 0.3, 0, 0.6, 2.6, 0.3), 0x8f7f6c], [at(S(0.1, 8, 6), 0.02, 0.3, 0, 0.4, 2.2, 0.2), 0xc8a0a0]]); e.position.set(0.36, 1.0, s * 0.1); e.rotation.x = s * 0.25; g.add(e); return e; });
  g.userData.ears = ears;
  return g;
}
function bird({ body, breast, head, beak = 0x2a2620, size = 1 }) {
  const parts = [[at(S(0.13, 10, 8), 0, 0.15, 0, 1.3, 1, 0.95), body], [at(S(0.1, 8, 6), 0.05, 0.13, 0, 1.1, 0.95, 0.9), breast], [at(S(0.085, 10, 8), 0.14, 0.27, 0), head],
    [at(new THREE.ConeGeometry(0.025, 0.08, 5), 0.24, 0.27, 0, 1, 1, 1, 0, 0, -Math.PI / 2), beak], [at(new THREE.BoxGeometry(0.2, 0.02, 0.09), -0.2, 0.17, 0, 1, 1, 1, 0, 0, 0.35), body],
    [at(S(0.016, 5, 4), 0.19, 0.3, 0.055), 0x050505], [at(S(0.016, 5, 4), 0.19, 0.3, -0.055), 0x050505], [at(new THREE.CylinderGeometry(0.008, 0.008, 0.08, 3), 0.02, 0.02, 0.03), 0x6a5a4a], [at(new THREE.CylinderGeometry(0.008, 0.008, 0.08, 3), 0.02, 0.02, -0.03), 0x6a5a4a]];
  const m = critter(parts, { rough: 0.6 }); m.scale.setScalar(size); return m;
}
function squirrel() {
  const tail = []; for (let i = 0; i <= 12; i++) { const t = i / 12; tail.push(new THREE.Vector3(-0.3 - Math.sin(t * 2.6) * 0.45, 0.2 + t * 0.7, 0)); }
  return critter([[at(S(0.22, 10, 8), 0, 0.25, 0, 1.4, 0.8, 0.8), 0x9a5a32], [at(S(0.14, 10, 8), 0.33, 0.36, 0), 0x9a5a32], [at(S(0.1, 8, 6), 0.08, 0.18, 0, 1.4, 0.6, 0.7), 0xe0c8a8],
    [new THREE.TubeGeometry(new THREE.CatmullRomCurve3(tail), 16, 0.14, 6), 0xa8663a], [at(new THREE.ConeGeometry(0.04, 0.1, 4), 0.33, 0.52, 0.06), 0x9a5a32], [at(new THREE.ConeGeometry(0.04, 0.1, 4), 0.33, 0.52, -0.06), 0x9a5a32],
    [at(S(0.025, 5, 4), 0.42, 0.4, 0.07), 0x050505], [at(S(0.025, 5, 4), 0.42, 0.4, -0.07), 0x050505]]);
}
function owl(eyeMat) {
  const g = new THREE.Group();
  g.add(critter([[at(S(0.42, 12, 10), 0, 0.5, 0, 0.95, 1.25, 0.9), 0x7a5a3a], [at(S(0.34, 12, 10), 0.1, 0.45, 0, 0.8, 1.1, 0.95), 0xc9a878], [at(S(0.34, 12, 10), 0.05, 1.12, 0, 0.95, 0.85, 1.05), 0x7a5a3a], [at(S(0.28, 10, 8), 0.2, 1.1, 0, 0.45, 0.9, 1.0), 0xd8c09a],
    [at(new THREE.ConeGeometry(0.05, 0.14, 5), 0.37, 1.02, 0, 1, 1, 1, 0, 0, Math.PI), 0x3a3028], [at(new THREE.ConeGeometry(0.08, 0.22, 4), 0.02, 1.42, 0.17, 1, 1, 1, 0.2), 0x6a4a2e], [at(new THREE.ConeGeometry(0.08, 0.22, 4), 0.02, 1.42, -0.17, 1, 1, 1, -0.2), 0x6a4a2e]]));
  for (const s of [-1, 1]) { const e = new THREE.Mesh(S(0.08, 10, 8), eyeMat); e.position.set(0.3, 1.16, s * 0.14); e.scale.set(0.5, 1, 1); g.add(e); const p = new THREE.Mesh(S(0.035, 6, 4), new THREE.MeshBasicMaterial({ color: 0x050505 })); p.position.set(0.34, 1.16, s * 0.14); g.add(p); }
  return g;
}

export function creatures(ctx, K) {
  const { scene, animated, day } = ctx, r = rng(31337);
  const put = (m, x, y, z, ry = 0, s = 1) => { m.position.set(x, y, z); m.rotation.y = ry; m.scale.multiplyScalar(s); scene.add(m); return m; };

  for (const sn of K.snails ?? []) { const m = put(snail(), sn.x, sn.y, sn.z, sn.ry ?? 0, sn.s ?? 1); if (sn.rz) m.rotation.z = sn.rz; }
  // Animals from the village project (low-poly, already rendered): each faces +z, feet at y = 0, metres
  const FT = 3.28084, loader = new GLTFLoader();
  const glb = (id, s, tint) => new Promise((ok, bad) => loader.load(`assets/models/${id}/${id}.glb`, g => {
    const o = g.scene; o.scale.setScalar(FT * s);
    o.traverse(n => { if (n.isMesh) { n.castShadow = false; n.receiveShadow = true; if (tint) { n.material = n.material.clone(); n.material.color.multiply(new THREE.Color(tint)); } } });
    ok(o);
  }, undefined, bad));
  // a hare sitting up in the lettuces, now and then turning to look
  if (K.rabbitAt) glb('v_hare', 0.62, 0xc9b8a0).then(o => { o.position.set(K.rabbitAt.x, 0.05, K.rabbitAt.z); scene.add(o); animated.push(t => { o.rotation.y = 2.2 + (Math.sin(t * 0.23) > 0.6 ? 0.7 : 0); }); }).catch(() => {});
  // a red squirrel on the tree seat round the old oak
  if (K.squirrelOn) glb('v_squirrel', 1.0, 0xd08a5a).then(o => { o.position.set(K.squirrelOn.x, K.squirrelOn.y, K.squirrelOn.z); o.rotation.y = K.squirrelOn.ry ?? 0; scene.add(o); animated.push(t => { o.rotation.y = (K.squirrelOn.ry ?? 0) + ((t % 7) < 1.2 ? 0.5 : 0); }); }).catch(() => {});
  // a jay at the bird bath, dipping now and then
  if (K.titOn) glb('v_kingfisher_bluejay', 1.0).then(o => { o.position.set(K.titOn.x, K.titOn.y, K.titOn.z); o.rotation.y = K.titOn.ry ?? 0; scene.add(o); animated.push(t => { o.rotation.x = (t % 4.1) < 0.35 ? 0.5 : 0; }); }).catch(() => {});
  // two dragonflies over the pond: hover, dart, hover
  glb('v_dragonfly', 2.2).then(src => {
    const pond = K.pondAt ?? { x: -68, z: 4, y: 0.5 }, flies = [src, src.clone(true)];
    flies.forEach(f => scene.add(f));
    animated.push(t => {
      const on = day.light > 0.25;
      flies.forEach((f, i) => {
        f.visible = on; if (!on) return;
        const u = t * 0.22 + i * 7.3, k = Math.floor(u), fr = u - k, ease = fr < 0.8 ? 0 : (1 - Math.cos(Math.PI * (fr - 0.8) / 0.2)) / 2;
        const pt = j => { const rr = rng(i * 1000 + j); return [pond.x + (rr() - 0.5) * 18, pond.z + (rr() - 0.5) * 11]; };
        const [ax, az] = pt(k), [bx, bz] = pt(k + 1);
        f.position.set(ax + (bx - ax) * ease, pond.y + 1.3 + 0.08 * Math.sin(t * 5 + i), az + (bz - az) * ease);
        f.rotation.y = Math.atan2(bx - ax, bz - az);
      });
    });
  }).catch(() => {});

  // ---- Butterflies and dragonflies: one instanced set of wings ----
  {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d');
    const wingPaint = (i, base, edge, spots) => {
      g.save(); g.translate(i * 128, 0);
      g.fillStyle = base; g.beginPath(); g.moveTo(4, 64); g.bezierCurveTo(20, 0, 110, -10, 120, 30); g.bezierCurveTo(124, 60, 90, 66, 60, 64); g.bezierCurveTo(100, 80, 104, 120, 70, 124); g.bezierCurveTo(40, 126, 14, 90, 4, 64); g.fill();
      g.strokeStyle = edge; g.lineWidth = 7; g.stroke(); g.lineWidth = 2; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(6, 64); g.lineTo(40 + k * 18, 10 + k * 22); g.stroke(); }
      g.fillStyle = spots; for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(100 + (k % 2) * 10, 25 + k * 6, 3, 0, 7); g.fill(); }
      g.restore();
    };
    wingPaint(0, '#e8862a', '#1a1410', '#f4f0e0');      // a monarch-ish orange
    wingPaint(1, '#f4f2ea', '#c8c4b8', '#3a3a3a');      // cabbage white
    wingPaint(2, '#7aa6e8', '#2a3a6a', '#f4f0e0');      // common blue
    // dragonfly, seen from above: body down the middle, four glassy wings
    g.save(); g.translate(384, 0);
    g.fillStyle = 'rgba(210,230,240,0.75)'; for (const [y, s] of [[44, 1], [70, 0.9]]) for (const d of [-1, 1]) { g.beginPath(); g.ellipse(64 + d * 34 * s, y, 32 * s, 9, d * 0.08, 0, 7); g.fill(); }
    g.fillStyle = '#1f6a7a'; g.fillRect(60, 30, 8, 92); g.beginPath(); g.arc(64, 30, 8, 0, 7); g.fill(); g.fillStyle = '#2a8a9a'; g.fillRect(58, 36, 12, 20);
    g.restore();
    const tex = atlasTexture(c, [[0, 0, 128, 128], [128, 0, 128, 128], [256, 0, 128, 128], [384, 0, 128, 128]]);
    const mats = cardMaterials(tex, { sway: 0, roughness: 0.6, env: 0.4, alphaTest: 0.4 });
    const wing = new THREE.PlaneGeometry(1, 1); wing.rotateX(-Math.PI / 2); wing.translate(0.5, 0, 0);
    const fly = new THREE.PlaneGeometry(1, 1); fly.rotateX(-Math.PI / 2);
    const homes = K.flowerSpots ?? [[0, 30]];
    const N = 14, D = 0;
    const bfly = new THREE.InstancedMesh(wing, mats.material, N * 2), cellsB = new Float32Array(N * 2 * 4);
    const flies = [];
    for (let i = 0; i < N; i++) { const sp = i % 3, cu = cellUV(512, 128, [sp * 128, 0, 128, 128], 1); cellsB.set(cu, i * 8); cellsB.set(cu, i * 8 + 4); const h = homes[i % homes.length]; flies.push({ hx: h[0], hz: h[1], ph: r() * 100, sp: 0.3 + r() * 0.3, rad: 2 + r() * 5, size: 0.28 + r() * 0.12 }); }
    wing.setAttribute('aCell', new THREE.InstancedBufferAttribute(cellsB, 4));
    const dfly = new THREE.InstancedMesh(fly, mats.material, D), cellsD = new Float32Array(D * 4);
    const darts = []; for (let i = 0; i < D; i++) { cellsD.set(cellUV(512, 128, [384, 0, 128, 128], 1), i * 4); darts.push({ ph: r() * 50 }); }
    fly.setAttribute('aCell', new THREE.InstancedBufferAttribute(cellsD, 4));
    for (const m of [bfly, dfly]) { m.frustumCulled = false; m.castShadow = false; scene.add(m); }
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
    const pond = K.pondAt ?? { x: -68, z: 4, y: 0.5 };
    animated.push((t) => {
      const on = day.light > 0.25; bfly.visible = dfly.visible = on; if (!on) return;
      flies.forEach((f, i) => {
        const a = t * f.sp + f.ph, x = f.hx + Math.cos(a) * f.rad + Math.sin(a * 2.3) * 1.2, z = f.hz + Math.sin(a * 1.3) * f.rad, y = 2.2 + Math.sin(a * 3.1) * 0.9 + Math.sin(a * 0.7) * 0.6;
        const head = Math.atan2(-(Math.cos(a * 1.3) * 1.3 * f.rad), -Math.sin(a) * f.rad), flap = 0.25 + 1.1 * Math.abs(Math.sin(t * 13 + i));
        for (const side of [0, 1]) {
          e.set(0, head, side ? flap : -flap, 'YXZ'); q.setFromEuler(e); s.set(side ? -f.size : f.size, 1, f.size);
          p.set(x, y, z); bfly.setMatrixAt(i * 2 + side, m4.compose(p, q, s));
        }
      });
      bfly.instanceMatrix.needsUpdate = true;
      darts.forEach((d, i) => {
        const u = t * 0.25 + d.ph, k = Math.floor(u), f = u - k, ease = f < 0.75 ? 0 : (f - 0.75) / 0.25;
        const pt = j => { const rr = rng(i * 1000 + j); return [pond.x + (rr() - 0.5) * 22, pond.z + (rr() - 0.5) * 14]; };
        const [ax, az] = pt(k), [bx, bz] = pt(k + 1);
        p.set(ax + (bx - ax) * ease, pond.y + 1.2 + 0.15 * Math.sin(t * 7 + i), az + (bz - az) * ease);
        e.set(0, Math.atan2(bx - ax, bz - az), 0); q.setFromEuler(e); s.setScalar(0.42 * (1 + 0.04 * Math.sin(t * 60)));
        dfly.setMatrixAt(i, m4.compose(p, q, s));
      });
      dfly.instanceMatrix.needsUpdate = true;
    });
  }

  // ---- Fireflies over the meadow and the pond, after dark ----
  {
    const spots = K.fireflySpots ?? [[-70, -80, 30]], N = 120, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), seeds = [];
    for (let i = 0; i < N; i++) { const [cx, cz, rad] = spots[i % spots.length]; seeds.push({ x: cx + (r() - 0.5) * rad * 2, z: cz + (r() - 0.5) * rad * 2, y: 0.8 + r() * 3.5, ph: r() * 20, sp: 0.2 + r() * 0.3 }); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const dot = (() => { const cc = document.createElement('canvas'); cc.width = cc.height = 32; const gg = cc.getContext('2d'); const gr = gg.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); gg.fillStyle = gr; gg.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(cc); })();
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.55, map: dot, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    pts.frustumCulled = false; scene.add(pts);
    animated.push(t => {
      const n = day.night; pts.visible = n > 0.15; if (!pts.visible) return;
      seeds.forEach((f, i) => {
        pos[i * 3] = f.x + Math.sin(t * f.sp + f.ph) * 2.5; pos[i * 3 + 1] = f.y + Math.sin(t * f.sp * 1.7 + f.ph) * 0.6; pos[i * 3 + 2] = f.z + Math.cos(t * f.sp * 0.8 + f.ph) * 2.5;
        const blink = Math.max(0, Math.sin(t * 1.3 + f.ph * 3)) ** 6 * n;
        col[i * 3] = 1.0 * blink; col[i * 3 + 1] = 0.95 * blink; col[i * 3 + 2] = 0.35 * blink;
      });
      geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
    });
  }
}
