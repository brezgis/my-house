// A puddle behind the compost bays, where the ground stays wet: a few feet of still brown water in a muddy
// rim, tadpoles in it, grass grown up round two sides so that it is found rather than seen, and a small frog
// (the pond frog's model) on the bank. Come within a few feet and the frog plops in and the tadpoles scatter;
// it climbs out again once you have gone. Nothing here moves unless the visitor is within forty feet.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from './cards.js';

export const PUDDLE = { x: 62.0, z: -117.6, rx: 2.0, rz: 1.3, y: 0.09 };
const P = PUDDLE;
// how far the water reaches in direction a (1 = the plain ellipse)
const reach = a => 1 + 0.17 * Math.sin(a * 2 + 1) + 0.1 * Math.sin(a * 3 + 4);
const edge = (a, k = 1) => [P.x + Math.cos(a) * P.rx * reach(a) * k, P.z + Math.sin(a) * P.rz * reach(a) * k];
const SEAT = -0.75;                                   // where the frog sits, on the far bank from the bays

export function buildPuddle(K) {
  K.G.blob('mud', P.x + 0.05, P.z, P.rx + 0.6, P.rz + 0.6, { wobble: 0.14, seed: 62 });      // the mud round it
  const q = rng(1176), was = K.F.r; K.F.r = q;
  for (const [a, k, s] of [[0.35, 1.3, 0.5], [0.85, 1.45, 0.42], [1.35, 1.3, 0.36], [2.75, 1.25, 0.46], [3.35, 1.35, 0.4], [-2.0, 1.4, 0.34]]) { const [x, z] = edge(a, k); K.F.add('grass', x, z, s); }
  K.F.r = was;
  K.setups.push(puddleLife);
}

function puddleLife(ctx) {
  const { scene, animated } = ctx, cam = ctx.camera.position, q = rng(404);
  // the water
  const shape = new THREE.Shape(Array.from({ length: 28 }, (_, i) => { const [x, z] = edge(i / 28 * Math.PI * 2); return new THREE.Vector2(x, -z); }));
  const wg = new THREE.ShapeGeometry(shape); wg.rotateX(-Math.PI / 2); wg.translate(0, P.y, 0);
  const water = new THREE.Mesh(wg, new THREE.MeshStandardMaterial({ color: 0x3d3a2b, roughness: 0.07, envMapIntensity: 1.1, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -12 }));
  water.receiveShadow = true; water.name = 'puddle'; scene.add(water);
  // the tadpoles: a round head and a tail, lying just under the surface
  const head = new THREE.SphereGeometry(0.05, 5, 3); head.scale(1, 0.55, 1.35);
  const tail = new THREE.ConeGeometry(0.03, 0.19, 4, 1, true); tail.rotateX(-Math.PI / 2); tail.scale(0.35, 1, 1); tail.translate(0, 0, -0.14);
  const N = 14, tad = new THREE.InstancedMesh(mergeGeometries([head, tail]), new THREE.MeshStandardMaterial({ color: 0x15120f, roughness: 0.45 }), N);
  tad.name = 'tadpoles'; tad.frustumCulled = false; scene.add(tad);
  const T = Array.from({ length: N }, () => { const a = q() * 6.28, [x, z] = edge(a, Math.sqrt(q()) * 0.75); return { x, z, h: q() * 6.28, v: 0.1, turn: 0, until: 0, ph: q() * 6.28, s: 1.1 + q() * 0.7 }; });
  const m = new THREE.Matrix4(), e = new THREE.Euler(), qt = new THREE.Quaternion(), sc = new THREE.Vector3(), pos = new THREE.Vector3();
  const inside = (x, z) => { const dx = (x - P.x) / P.rx, dz = (z - P.z) / P.rz; return Math.hypot(dx, dz) / reach(Math.atan2(dz, dx)); };
  const place = clock => {
    T.forEach((t, i) => { e.set(0, t.h + Math.sin(clock * 13 + t.ph) * 0.38 * Math.min(1, t.v * 5), 0); qt.setFromEuler(e); m.compose(pos.set(t.x, P.y + 0.004, t.z), qt, sc.setScalar(t.s)); tad.setMatrixAt(i, m); });
    tad.instanceMatrix.needsUpdate = true;
  };
  place(0);
  // the frog
  let frog = null, mode = 'sit', t0 = 0, clock = 0, fright = 0;
  const [sx, sz] = edge(SEAT, 1.22), [wx, wz] = edge(SEAT, 0.35), faceIn = Math.atan2(wx - sx, wz - sz);
  new GLTFLoader().load('assets/models/v_frog/v_frog.glb', g => {
    frog = g.scene; frog.scale.setScalar(3.28084 * 1.2); frog.traverse(n => { if (n.isMesh) { n.castShadow = false; n.receiveShadow = true; } });
    frog.position.set(sx, 0.07, sz); frog.rotation.y = faceIn + 0.5; frog.name = 'puddle frog'; scene.add(frog);
  });
  animated.push((t, dt) => {
    const dc = Math.hypot(cam.x - P.x, cam.z - P.z);
    if (dc > 40 || !scene.visible) return;
    dt = Math.min(dt, 0.05); clock += dt;
    for (const t of T) {
      if (clock > t.until) { t.until = clock + 0.6 + q() * 2.4; t.turn = (q() - 0.5) * 2.4; t.v = clock < fright ? 0.9 : q() < 0.3 ? 0 : 0.08 + q() * 0.3; }
      const far = inside(t.x, t.z);
      if (far > 0.72) { const home = Math.atan2(P.x - t.x, P.z - t.z), d = ((home - t.h + Math.PI * 3) % (Math.PI * 2)) - Math.PI; t.h += Math.sign(d) * Math.min(Math.abs(d), dt * 5); if (t.v < 0.1) t.v = 0.15; } else t.h += t.turn * dt;
      const nx = t.x + Math.sin(t.h) * t.v * dt, nz = t.z + Math.cos(t.h) * t.v * dt;
      if (inside(nx, nz) < 0.86) { t.x = nx; t.z = nz; }
    }
    place(clock);
    if (!frog) return;
    const df = Math.hypot(cam.x - sx, cam.z - sz), u = (clock - t0) / 0.45;
    if (mode === 'sit' && df < 5) { mode = 'plop'; t0 = clock; frog.rotation.y = faceIn; }
    else if (mode === 'plop') {
      const k = Math.min(1, u); frog.position.set(sx + (wx - sx) * k, 0.07 + Math.sin(Math.PI * k) * 0.55 - 0.1 * k, sz + (wz - sz) * k);
      if (k >= 1) { mode = 'under'; frog.visible = false; fright = clock + 1.5; for (const t of T) t.until = 0; }
    } else if (mode === 'under' && df > 13 && clock - t0 > 5) { mode = 'climb'; t0 = clock; frog.visible = true; frog.rotation.y = faceIn + Math.PI; }
    else if (mode === 'climb') {
      const k = Math.min(1, u); frog.position.set(wx + (sx - wx) * k, 0.07 + Math.sin(Math.PI * k) * 0.3, wz + (sz - wz) * k);
      if (k >= 1) { mode = 'sit'; frog.rotation.y = faceIn + 0.5; }
    }
  });
  window.__puddle = { T, get frog() { return frog; }, get mode() { return mode; } };
}
