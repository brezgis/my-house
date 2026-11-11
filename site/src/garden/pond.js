// The koi pond, south of the terrace: a natural pond with a mossy stone edge,
// reeds in the shallows, a weathered plank bridge across the middle, water
// lilies, a bench under the willow, and a frog who lives on the biggest lily
// pad. The koi, ducks and frog are animated here.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { PAINT, GLOW } from './tools.js';
import { rng } from './cards.js';
import { inPoly } from './flora.js';

export const POND = { x: -68, z: 4, rx: 16, rz: 10.5, y: 0.42, bridgeX: -65 };

function outline(n = 64) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const f = 1 + 0.09 * Math.sin(a * 2 + 0.7) + 0.06 * Math.sin(a * 3 + 2.1) + 0.04 * Math.sin(a * 5 + 0.3);
    pts.push([POND.x + Math.cos(a) * POND.rx * f, POND.z + Math.sin(a) * POND.rz * f]);
  }
  return pts;
}
// z extent of the outline at a given x
function spanAt(pts, x) {
  let z0 = Infinity, z1 = -Infinity;
  for (let i = 0; i < pts.length; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % pts.length];
    if ((ax - x) * (bx - x) <= 0 && ax !== bx) { const z = az + (bz - az) * (x - ax) / (bx - ax); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  }
  return [z0, z1];
}
const shrink = (pts, k, dx = 0) => pts.map(([x, z]) => [POND.x + dx + (x - POND.x) * k, POND.z + (z - POND.z) * k]);

export function buildPond(K) {
  const { B, G, F, r } = K, P = POND, pts = outline();
  // ---- Water, basin and the shelf down to it ----
  const ring = (inner, outer, y0, y1, mat) => {                    // a sloping band between two outlines
    const pos = [], n = inner.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, a = outer[i], b = outer[j], c = inner[j], d = inner[i];
      pos.push(a[0], y1, a[1], c[0], y0, c[1], b[0], y1, b[1], a[0], y1, a[1], d[0], y0, d[1], c[0], y0, c[1]);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    const uv = []; for (let i = 0; i < pos.length; i += 3) uv.push(pos[i] / 4, pos[i + 2] / 4); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals(); K.put(mat, g);
  };
  const inner = shrink(pts, 0.9), floor = shrink(pts, 0.62);
  ring(inner, pts, P.y - 0.35, P.y + 0.02, 'c#3a3a2c/1');
  ring(floor, inner, 0.09, P.y - 0.35, 'c#24281e/1');
  G.poly('soil', floor, { y: 0.09 });
  K.water = { pts: shrink(pts, 1.0), y: P.y };
  // pebbles and sunken stones on the bottom
  for (let i = 0; i < 26; i++) { const a = r() * 6.28, d = 0.2 + r() * 0.6; K.rock(PAINT.stoneDark, P.x + Math.cos(a) * P.rx * d, 0.12, P.z + Math.sin(a) * P.rz * d, 0.5 + r() * 0.8, 0.25, 0.5 + r() * 0.6); }

  // ---- Coping: boulders and flat slabs all round, the slabs where people stand ----
  const bx = P.bridgeX, [bz0, bz1] = spanAt(pts, bx);
  const slabsAt = [0.35, 1.25, 2.6, 4.2, 5.4];
  pts.forEach(([x, z], i) => {
    if (i % 2) return;
    if (Math.abs(x - bx) < 3.2) return;                            // leave the bridge ends clear
    const a = Math.atan2(z - P.z, x - P.x), ox = x + Math.cos(a) * 0.9, oz = z + Math.sin(a) * 0.9;
    const slab = slabsAt.some(s => Math.abs(((a + 6.283) % 6.283) - s) < 0.22);
    if (slab) K.rock(PAINT.moss, ox, 0.3, oz, 1.6, 0.4, 1.3, a);
    else K.rock(r() < 0.45 ? PAINT.moss : r() < 0.5 ? PAINT.stone : PAINT.stoneDark, ox, 0.3, oz, 1.0 + r() * 0.7, 0.55 + r() * 0.4, 0.9 + r() * 0.6);
    if (r() < 0.35) K.rock(PAINT.stoneDark, ox + Math.cos(a) * 1.3, 0.15, oz + Math.sin(a) * 1.3, 0.6 + r() * 0.5, 0.35, 0.6 + r() * 0.4);
  });
  // Pond colliders: strips across the water, leaving the bridge open
  for (let x = P.x - P.rx * 1.2; x < P.x + P.rx * 1.2; x += 2) {
    if (x + 2 > bx - 2.3 && x < bx + 2.3) continue;
    const [z0, z1] = spanAt(pts, x + 1); if (!isFinite(z0)) continue;
    K.collide(x, x + 2, z0 + 0.3, z1 - 0.3, 2.2);
  }

  // ---- At the far end a few old boulders, half sunk, mossy ----
  { const wx = P.x - P.rx * 1.02, wz = P.z + 1; for (const [dx, dz, sx, sy, sz] of [[0, 0, 2.6, 1.0, 2.4], [-1.6, 2.6, 1.8, 0.8, 1.6], [-1.2, -2.8, 2.0, 0.9, 1.8]]) K.rock(PAINT.moss, wx + dx, 0.3, wz + dz, sx, sy, sz); K.collide(wx - 3, wx + 2, wz - 4, wz + 4, 3); K.waterfall = []; }

  // ---- The bridge: an arched timber walk across the middle ----
  {
    const z0 = bz0 - 2.4, z1 = bz1 + 2.4, len = z1 - z0, rise = 1.1, w = 2.1, WOOD = 'c#857a6a/1';
    const h = z => 0.25 + rise * Math.sin(Math.PI * THREE.MathUtils.clamp((z - z0) / len, 0, 1));
    for (let z = z0; z < z1 - 0.3; z += 0.62) { const y = h(z + 0.27), sl = Math.atan2(h(z + 0.54) - h(z), 0.54); K.box(WOOD, bx - w, bx + w, y - 0.18, y, z, z + 0.56, { rot: [-sl, 0, 0] }); }
    for (const s of [-1, 1]) {                                     // stringers and rails
      const pts3 = []; for (let i = 0; i <= 16; i++) { const z = z0 + (len * i) / 16; pts3.push([bx + s * (w - 0.1), h(z) - 0.35, z]); }
      for (let i = 0; i < 16; i++) K.beam(WOOD, pts3[i], pts3[i + 1], 0.22, 0.5);
      for (let i = 0; i <= 6; i++) { const z = z0 + 0.3 + ((len - 0.6) * i) / 6, y = h(z); K.box(WOOD, bx + s * w - 0.17, bx + s * w + 0.17, y - 0.4, y + 2.6, z - 0.17, z + 0.17, undefined); }
      const top = []; for (let i = 0; i <= 16; i++) { const z = z0 + 0.3 + ((len - 0.6) * i) / 16; top.push([bx + s * w, h(z) + 2.5, z]); }
      for (let i = 0; i < 16; i++) K.beam(WOOD, top[i], top[i + 1], 0.26, 0.2);
      K.collide(bx + s * w - 0.15, bx + s * w + 0.15, z0, z1, 6);
    }
    // walkable: short ramps following the arch
    const N = 8;
    for (let i = 0; i < N; i++) { const za = z0 - 0.5 + ((len + 1) * i) / N, zb = z0 - 0.5 + ((len + 1) * (i + 1)) / N; K.surface(bx - w, bx + w, za, zb, h(zb), h(za)); }
    K.bridge = { x: bx, z0, z1 };
  }

  // ---- Lilies, and the plants at the water's edge ----
  const inWater = (x, z) => inPoly(x, z, shrink(pts, 0.82)) && Math.abs(x - bx) > 3;
  const pads = [];
  for (const [cx, cz, n] of [[P.x + 7, P.z - 4, 9], [P.x - 8, P.z + 4, 8], [P.x + 9, P.z + 5, 5], [P.x - 6, P.z - 5, 5]]) {
    for (let i = 0; i < n; i++) { const x = cx + (r() - 0.5) * 6, z = cz + (r() - 0.5) * 4; if (!inWater(x, z)) continue; F.add('lilypad', x, z, 0.8 + r() * 0.6, { y: P.y + 0.03 }); pads.push([x, z]); if (r() < 0.3) F.add('waterlily', x + 0.3, z + 0.2, 1, { y: P.y + 0.12 }); }
  }
  // the frog's pad, big and near the bench side
  K.frogPad = { x: P.x + 5, z: P.z + 5.5, y: P.y + 0.05 };
  F.add('lilypad', K.frogPad.x, K.frogPad.z, 1.5, { y: P.y + 0.035, rot: 0.6 });
  F.add('waterlily', K.frogPad.x - 0.9, K.frogPad.z - 0.6, 1.1, { y: P.y + 0.12 });
  pts.forEach(([x, z], i) => {
    if (Math.abs(x - bx) < 4.5 || i % 3) return;
    const a = Math.atan2(z - P.z, x - P.x), d = 2.4 + r() * 1.8, px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d;
    if (slabsAt.some(s => Math.abs(((a + 6.283) % 6.283) - s) < 0.3)) return;
    const k = r();
    if (k < 0.5) F.drift('grass', px, pz, 1.4, 1.4, 4, 1.25);
    else if (k < 0.55) F.add('grass', px, pz, 1.1);
    else if (k < 0.75) F.add('hosta', px, pz, 0.9);
    else F.add('fern', px, pz, 0.9);
  });

  // reeds standing in the shallows
  pts.forEach(([x, z], i) => { if (i % 5 || Math.abs(x - bx) < 5) return; const a = Math.atan2(z - P.z, x - P.x); F.drift('grass', x - Math.cos(a) * 1.2, z - Math.sin(a) * 1.2, 1.3, 1.3, 4, 1.45, { y: P.y - 0.2 }); });
  K.model('painted_wooden_bench', P.x - 9, P.z + P.rz + 5.5, Math.PI, { scale: 1.25, collide: true });
  K.seat(P.x - 9, 1.6, P.z + P.rz + 5.1, 0, 'sit by the pond');
  K.model('garden_gnome', P.x - 14, P.z - 9.5, 1.2, { scale: 0.8 });          // half lost in the ferns
  F.drift('fern', P.x - 14.5, P.z - 9.8, 1.5, 1.5, 3, 0.9);
  K.pondPts = pts;
}

// ---- Life on the pond -------------------------------------------------------------------
export function pondLife(ctx, K) {
  const { scene, animated, interact } = ctx, P = POND, r = rng(808);
  let now = 0;
  const t0 = { value: 0 };

  // Water surface: dark, glossy, with a slow ripple in the normals
  {
    const shape = new THREE.Shape(K.water.pts.map(([x, z]) => new THREE.Vector2(x, -z)));
    const g = new THREE.ShapeGeometry(shape, 4); g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position; for (let i = 0; i < pos.count; i++) pos.setY(i, P.y);
    g.computeVertexNormals(); const n = g.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
    const c = document.createElement('canvas'); c.width = c.height = 256; const gg = c.getContext('2d');
    gg.fillStyle = 'rgb(128,128,255)'; gg.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 260; i++) { const x = r() * 256, y = r() * 256, rr = 6 + r() * 26; const grd = gg.createRadialGradient(x, y, 0, x, y, rr); const dx = (r() - 0.5) * 60, dy = (r() - 0.5) * 60; grd.addColorStop(0, `rgba(${128 + dx},${128 + dy},255,.5)`); grd.addColorStop(1, 'rgba(128,128,255,0)'); gg.fillStyle = grd; gg.fillRect(x - rr, y - rr, rr * 2, rr * 2); }
    const nt = new THREE.CanvasTexture(c); nt.wrapS = nt.wrapT = THREE.RepeatWrapping; nt.repeat.set(0.12, 0.12);
    const mat = new THREE.MeshStandardMaterial({ color: 0x0b1813, roughness: 0.3, metalness: 0.0, transparent: true, opacity: 0.84, envMapIntensity: 0.3, normalMap: nt, normalScale: new THREE.Vector2(0.35, 0.35), depthWrite: false });
    const water = new THREE.Mesh(g, mat); water.renderOrder = 2; water.receiveShadow = true; water.name = 'pond water';
    scene.add(water);
    animated.push((t) => { nt.offset.set(t * 0.004, t * 0.003); });
  }

  // Koi: one instanced school. Each fish steers smoothly toward a point that
  // runs ahead of it round its own gentle loop, turning slowly, never leaving
  // the water; tails wag gently in the shader.
  const swimArea = shrink(K.pondPts, 0.72), koi = [];
  {
    const prof = []; for (let i = 0; i <= 12; i++) { const t = i / 12; prof.push(new THREE.Vector2(Math.max(0.001, 0.19 * Math.sin(Math.PI * Math.pow(t, 0.75)) * (1 - 0.25 * t)), t * 1.5 - 0.95)); }
    const body = new THREE.LatheGeometry(prof, 10); body.rotateZ(-Math.PI / 2); body.scale(1, 0.62, 0.85);
    const tail = new THREE.PlaneGeometry(0.5, 0.42); tail.rotateX(Math.PI / 2); tail.translate(-1.12, 0, 0);
    const fins = new THREE.PlaneGeometry(0.2, 0.55); fins.rotateX(Math.PI / 2); fins.translate(0.25, -0.03, 0);
    const geo = mergeGeometries([body.toNonIndexed(), tail.toNonIndexed(), fins.toNonIndexed()]);
    const c = document.createElement('canvas'); c.width = 256; c.height = 64; const g = c.getContext('2d');
    g.fillStyle = '#f2eee4'; g.fillRect(0, 0, 256, 64);
    for (let i = 0; i < 8; i++) { g.fillStyle = '#d9561f'; g.beginPath(); g.ellipse(30 + r() * 200, 32 + (r() - 0.5) * 30, 12 + r() * 24, 10 + r() * 14, r() * 3, 0, 7); g.fill(); }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4, side: THREE.DoubleSide });
    mat.onBeforeCompile = sh => {
      sh.uniforms.uT = t0;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uT;').replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
      float ph = instanceMatrix[3][0] * 3.1 + instanceMatrix[3][2] * 1.7;
      float k = smoothstep(0.1, -1.3, position.x);
      transformed.z += sin(uT * 3.2 + ph - position.x * 2.0) * 0.07 * k;
      #endif`);
    };
    const tints = [[1, 1, 1], [1, 0.62, 0.35], [1, 1, 1], [1, 0.8, 0.4], [0.25, 0.23, 0.22], [1, 1, 1], [0.95, 0.85, 0.6]];
    const school = new THREE.InstancedMesh(geo, mat, tints.length); school.name = 'koi';
    const P0 = POND;
    tints.forEach((tc, i) => {
      school.setColorAt(i, new THREE.Color(...tc));
      const k = 0.25 + r() * 0.3, th = r() * 6.28, x = P0.x + Math.cos(th) * P0.rx * k * 0.8, z = P0.z + Math.sin(th) * P0.rz * k * 0.8;
      koi.push({ th, dir: i % 2 ? 1 : -1, k, x, z, head: th + (i % 2 ? 1.57 : -1.57), size: 0.6 + r() * 0.25, ph: r() * 6, sp: 0.55 + r() * 0.25 });
    });
    school.frustumCulled = false; school.castShadow = false; scene.add(school);
    let feeding = null;
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    animated.push((t, dt) => {
      t0.value = t; dt = Math.min(dt, 0.05);
      koi.forEach((f, i) => {
        // where it would like to be: a little way ahead round its own loop, or at the bread
        f.th += f.dir * dt * 0.09;
        const kk = f.k + 0.06 * Math.sin(t * 0.07 + f.ph);
        let tx = P0.x + Math.cos(f.th + f.dir * 0.5) * P0.rx * kk, tz = P0.z + Math.sin(f.th + f.dir * 0.5) * P0.rz * kk;
        const fed = feeding && t < feeding.until;
        if (fed) { tx = feeding.x + Math.cos(i * 2.4) * 1.3; tz = feeding.z + Math.sin(i * 2.4) * 0.9; }
        // turn toward it, slowly
        let want = Math.atan2(tz - f.z, tx - f.x), d = ((want - f.head + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
        f.head += THREE.MathUtils.clamp(d, -0.7 * dt, 0.7 * dt);
        const dist = Math.hypot(tx - f.x, tz - f.z), v = f.sp * (fed ? Math.min(1, dist / 2) : 1);
        const nx = f.x + Math.cos(f.head) * v * dt, nz = f.z + Math.sin(f.head) * v * dt;
        if (inPoly(nx, nz, swimArea)) { f.x = nx; f.z = nz; } else f.head += 1.2 * dt * f.dir;     // at the bank: keep turning
        p.set(f.x, P0.y - 0.16, f.z);
        q.setFromAxisAngle(up, -f.head); s3.setScalar(f.size);
        school.setMatrixAt(i, m.compose(p, q, s3));
      });
      school.instanceMatrix.needsUpdate = true;
    });
    const spot = { x: POND.x + 8, z: POND.z + POND.rz * 0.5 };
    interact.push({ x: spot.x, y: 1.2, z: spot.z + 3.5, reach: 9, label: () => 'feed the koi', act: () => { feeding = { x: spot.x, z: spot.z - 1, until: now + 14 }; } });
    animated.push(t => { now = t; });
  }

  // Two mallards (village animal models), paddling slowly round the far half
  const FT = 3.28084, loader = new GLTFLoader();
  const glb = id => new Promise((ok, bad) => loader.load(`assets/models/${id}/${id}.glb`, g => ok(g.scene), undefined, bad));
  const prep = (o, s, tint) => { o.scale.setScalar(FT * s); o.traverse(n => { if (n.isMesh) { n.castShadow = false; n.receiveShadow = true; if (tint) { n.material = n.material.clone(); n.material.color.multiply(new THREE.Color(tint)); } } }); return o; };
  glb('v_duck_mallard').then(src => {
    const ducks = [prep(src.clone(true), 1.0), prep(src.clone(true), 0.95, 0xb8a58a)];
    for (const d of ducks) scene.add(d);
    const loop = new THREE.CatmullRomCurve3([[-7, -3], [-10, 1], [-8, 5], [-3, 4.5], [-4, 0]].map(([dx, dz]) => new THREE.Vector3(POND.x + dx, 0, POND.z + dz)), true);
    const p = new THREE.Vector3(), tn = new THREE.Vector3();
    animated.push(t => ducks.forEach((d, i) => {
      const s = ((t * 0.005 + i * 0.07) % 1 + 1) % 1; loop.getPointAt(s, p); loop.getTangentAt(s, tn);
      d.position.set(p.x, POND.y - 0.2 + 0.01 * Math.sin(t * 2 + i), p.z); d.rotation.y = Math.atan2(tn.x, tn.z);     // the model faces +z
    }));
  }).catch(() => {});

  // The frog on the lily pad (village model): sits, and jumps in if you say hello
  glb('v_frog').then(src => {
    const fp = K.frogPad, g = prep(src.clone(true), 1.3); g.position.set(fp.x, fp.y, fp.z); g.rotation.y = Math.atan2(POND.x - fp.x, POND.z - fp.z) + Math.PI; scene.add(g);
    let hop = -1;
    interact.push({ x: fp.x, y: fp.y + 0.3, z: fp.z, reach: 10, label: () => (hop >= 0 ? 'the frog has gone for a swim' : 'say hello to the frog'), act: () => { if (hop < 0) hop = 0; } });
    const dx = POND.x - fp.x, dz = POND.z - fp.z, dl = Math.hypot(dx, dz), ux = dx / dl, uz = dz / dl;
    animated.push((t, dt) => {
      if (hop < 0) { g.scale.y = FT * 1.3 * (1 + 0.04 * Math.max(0, Math.sin(t * 4)) * (Math.sin(t * 0.6) > 0.4 ? 1 : 0)); return; }
      hop += dt;
      if (hop < 0.55) { const u = hop / 0.55; g.visible = true; g.rotation.y = Math.atan2(ux, uz); g.position.set(fp.x + ux * u * 2.6, fp.y + Math.sin(Math.PI * u) * 1.0 - u * 0.4, fp.z + uz * u * 2.6); }
      else if (hop < 8) g.visible = false;
      else if (hop < 8.6) { const u = (hop - 8) / 0.6; g.visible = true; g.position.set(fp.x, fp.y - 0.3 * (1 - u), fp.z); g.rotation.y = Math.atan2(POND.x - fp.x, POND.z - fp.z) + Math.PI; }
      else { hop = -1; g.position.set(fp.x, fp.y, fp.z); }
    });
  }).catch(() => {});
}
