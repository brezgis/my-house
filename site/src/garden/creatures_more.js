// More of the garden's animals, loaded by creatures.js once the garden is first seen.
// Each is a member of the same crew (creatureKit): loaded when the visitor comes within
// reach at the right hour, thinking four times a second, moving only while she is near.
//
//   hedgehog   the front border, dusk and night: snuffles along, roots about, curls up if you come close
//   robin      the spade handle in the carrot bed, by day: bobs, drops to the soil for a worm, faces you
//   sparrows   by the orchard picnic table, on the mown path, by day: hop and peck; all up into the apple trees if you come near
//   blackbird  the front lawn, by day: runs, stops, listens, stabs and tugs; runs or flies off
//   barn owl   on the oak's tyre-swing limb, at night: turns its head to follow you
//   bats       over the front lawn by the old oak and the meadow's edge, dusk into night
//   bees       the hives (K.hives) and the flowers near them, by day
//   fox        on the wild rim of the island, at dusk and dawn: trots, sniffs, sits; slips away if approached
//   heron      in the pond shallows, early morning: stands, steps, strikes; stalks off, or flies if you come close
//   ducklings  four in a line behind the brown duck, following her real track, by day
//   rabbits    two on the lawn by the long border at dawn: graze, hop, sit up; bolt into the border
//   tortoise   the kitchen garden, by day: ambles up and down between the beds; head in if you come close
//   mouse      the compost bays, dusk and night: darts, freezes, washes; into the heap if you come close
//   swallows   high over the meadow, by day
//
// Models: see assets/CREDITS.md (Poly Pizza; "v_" Poly by Google and others, CC-BY 3.0; "q_fox" Quaternius, CC0).

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FT, Walk, Flight, wingPair, turnTo, wrapA, ease } from './creatures.js';
import { rng } from './cards.js';
import { POND, at as pondAt, sAt as pondS, depthAt } from './pond_shape.js';
import { ISLAND, islandEdge } from '../garden.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const FLOWERS = new Set(['cosmos', 'lavender', 'catmint', 'coneflower', 'wildflowers', 'rose', 'marigold', 'spires', 'hydrangea', 'sunflower']);

// A material whose wings beat: each vertex is turned about the body's long axis (z) by an angle
// that grows with its distance from it, tips up on the upstroke; the phase differs per instance.
function flapping(base, uT, amp, speed, glide = 0) {
  const m = base.clone();
  m.onBeforeCompile = sh => {
    sh.uniforms.uFlapT = uT;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uFlapT;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
{
  float id = float(gl_InstanceID);
  float beat = sin(uFlapT * ${speed.toFixed(2)} + id * 2.3);
  float on = ${glide > 0 ? `mix(1.0, 0.15, smoothstep(0.2, 0.6, sin(uFlapT * 0.45 + id * 1.7)))` : '1.0'};
  float a = ${amp.toFixed(3)} * beat * on * smoothstep(0.0, 0.06, abs(transformed.x));
  float x = transformed.x;
  transformed.x = x * cos(a);
  transformed.y += abs(x) * sin(a);
}`);
  };
  m.customProgramCacheKey = () => 'flap' + amp + speed + glide;
  return m;
}

// Split a mesh's geometry into the part above a height (a head) and the rest; the head's
// geometry is moved so that its pivot (px, py, pz) is at its origin.
function splitHead(geo, test, pivot) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone(), names = Object.keys(g.attributes), n = g.attributes.position.count / 3;
  const parts = [{}, {}].map(() => Object.fromEntries(names.map(k => [k, []])));
  const P = g.attributes.position;
  for (let t = 0; t < n; t++) {
    const cx = (P.getX(t * 3) + P.getX(t * 3 + 1) + P.getX(t * 3 + 2)) / 3, cy = (P.getY(t * 3) + P.getY(t * 3 + 1) + P.getY(t * 3 + 2)) / 3, cz = (P.getZ(t * 3) + P.getZ(t * 3 + 1) + P.getZ(t * 3 + 2)) / 3;
    const dst = parts[test(cx, cy, cz) ? 1 : 0];
    for (const k of names) { const A = g.attributes[k]; for (let v = 0; v < 3; v++) for (let c = 0; c < A.itemSize; c++) dst[k].push(A.array[(t * 3 + v) * A.itemSize + c]); }
  }
  const out = parts.map(p => { const b = new THREE.BufferGeometry(); for (const k of names) { const A = g.attributes[k]; b.setAttribute(k, new THREE.BufferAttribute(new A.array.constructor(p[k]), A.itemSize, A.normalized)); } return b; });
  out[1].translate(-pivot[0], -pivot[1], -pivot[2]);
  for (const b of out) b.computeBoundingSphere();
  return out;
}

const vcMat = (o = {}) => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, flatShading: true, ...o });
function coloured(geo, color) {
  const g = geo.index ? geo.toNonIndexed() : geo;
  for (const k of Object.keys(g.attributes)) if (k !== 'position') g.deleteAttribute(k);
  const n = g.attributes.position.count, c = new Float32Array(n * 3), col = typeof color === 'function' ? null : new THREE.Color(color), tmp = new THREE.Color();
  for (let i = 0; i < n; i++) (col ?? tmp.set(color(g.attributes.position.getX(i), g.attributes.position.getY(i), g.attributes.position.getZ(i)))).toArray(c, i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}
function tris(list, color) {           // [[x,y,z]x3, ...] -> a coloured geometry
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(list.flat(2), 3));
  return coloured(g, color);
}

export function moreCreatures(kit, K) {
  const { ctx, day, cam, scene, mesh, glb, ground, blocked, dist, dist3, add, feet, plant } = kit, r = rng(4242);
  const hour = () => day.hour ?? 12;
  const daytime = () => day.light > 0.35;
  const dusky = () => { const h = hour(); return (h >= 16.5 && h < 22) || (h >= 5.5 && h < 8); };          // dusk into the evening, and dawn
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sv = new THREE.Vector3(), pv = new THREE.Vector3();
  const show = o => on => { o.visible = on; };
  const here = (o, perch, err = 0) => () => ({ x: o.position.x, y: o.position.y, z: o.position.z, perch, err, hidden: !o.visible });

  // ---- Hedgehog: trundling along the front border at dusk and by night --------------------------
  if (K.hedgehogAt) {
    const H0 = K.hedgehogAt, box = { x0: -11.4, x1: -9.9, z0: 24.5, z1: 55 };      // the lawn side of the border, under the plants' skirts
    let o, w, fp, state = 'root', until = 0, curl = 0, safe = 0, gy = 0.03;
    add({
      name: 'hedgehog', x: H0.x, z: H0.z, load: 80, live: 60, when: () => day.light < 0.5,
      init: async () => {
        o = await mesh('v_hedgehog', 1, 0xffffff); o.material.color.setRGB(1.6, 1.45, 1.25); /* paler spines and face, to read at dusk */ fp = feet(o.geometry);
        gy = ground(H0.x, H0.z, 2); o.position.set(H0.x, gy, H0.z); o.rotation.y = H0.ry ?? 0; plant(o, fp, gy); scene.add(o); w = new Walk(o); w.base = gy;
      },
      show: on => { o.visible = on; },
      think: t => {
        const d = dist(o.position.x, o.position.z);
        if (d < 5) { if (state !== 'curl') { state = 'curl'; w.pts = []; w.i = 0; } safe = 0; return; }
        if (state === 'curl') { safe += d > 8 ? 0.25 : -safe; if (safe >= 4) { state = 'root'; until = t + 3; } return; }
        if (w.busy || t < until) return;
        if (r() < 0.5) { const p = o.position, x = clamp(p.x + (r() - 0.5) * 3, box.x0, box.x1), z = clamp(p.z + (r() < 0.5 ? -1 : 1) * (2 + r() * 5), box.z0, box.z1); w.go([[x, ground(x, z, 2), z]], 0.4, 0, 1, 1.2, gy); state = 'walk'; }
        else { state = 'root'; until = t + 3 + r() * 6; }
      },
      tick: (t, dt) => {
        curl += ((state === 'curl' ? 1 : 0) - curl) * Math.min(1, dt * 3);
        let pitch = 0, roll = 0;
        if (state === 'walk') { if (w.step(dt)) { gy = w.base; roll = 0.035 * Math.sin(t * 8); pitch = 0.02 * Math.sin(t * 16); } else state = 'root'; }
        else if (state === 'root') pitch = 0.07 + 0.03 * Math.sin(t * 13) * (Math.sin(t * 1.1) > 0 ? 1 : 0.2);        // nose down, snuffling
        o.rotation.x = pitch * (1 - curl) + curl * 0.2; o.rotation.z = roll; o.scale.set(1, 1 - 0.15 * curl, 1 - 0.1 * curl);
        plant(o, fp, gy);
      },
      check: () => here(o, 'ground')(),
    });
  }

  // ---- Robin on the spade handle in the carrot bed --------------------------------------------
  if (K.robinOn) {
    const R0 = K.robinOn; let o, fp, wings, fl, perchY = R0.y, state = 'perch', until = 0, bobAt = -9, look = 0, pecks = 0, peckAt = 0, safe = 0, soilY = 1.02, standY = R0.y, then = 'perch';
    const bed = { x0: 39.5, x1: 42.7, z0: -96.3, z1: -83.9 }, edges = [[43.0, -86.5], [39.2, -94.0]];
    // the top of the spade's handle, measured (the spade is a model that may load after the robin: until then, garden.js's figure)
    const handle = () => { const y = ground(R0.x, R0.z, R0.y + 0.8, R0.y); return y > R0.y - 0.4 ? y : R0.y; };
    const flyTo = (x, z, top, T, lift, next) => { const y = next === 'perch' ? (perchY = handle()) : ground(x, z, top, top - 0.5); fl.go(x, y, z, T, lift); then = next; state = 'fly'; standY = y; };
    add({
      name: 'robin', x: R0.x, z: R0.z, load: 70, live: 55, when: daytime,
      init: async () => {
        const body = await mesh('v_robin'); fp = feet(body.geometry); o = new THREE.Group(); o.add(body); wings = wingPair(0.72, 0.17, 0x6e5a42, 0x4a3a2a, [0, 0.2, 0]); o.add(wings);
        perchY = standY = handle();
        o.position.set(R0.x, perchY, R0.z); o.rotation.y = 1.2; plant(o, fp, perchY); scene.add(o); fl = new Flight(o);
      },
      show: on => { o.visible = on; },
      think: t => {
        const d = dist(o.position.x, o.position.z);
        if (state === 'fly') return;
        if (state === 'perch' && t > until) { const y = handle(); if (Math.abs(y - standY) > 0.01) { perchY = standY = y; plant(o, fp, y); } }
        if (d < 3 && state !== 'edge') { const e2 = edges[dist(edges[0][0], edges[0][1]) > dist(edges[1][0], edges[1][1]) ? 0 : 1]; flyTo(e2[0], e2[1], 2, 0.9, 0.8, 'edge'); return; }
        if (state === 'edge') { safe = d > 5.5 ? safe + 0.25 : 0; if (safe > 3) flyTo(R0.x, R0.z, perchY + 0.3, 0.9, 0.8, 'perch'); return; }
        if (t < until) return;
        if (state === 'perch' && r() < 0.15 && d > 5) {                                         // down for a worm
          const a = r() * TAU, x = clamp(R0.x + Math.cos(a) * 1.4, bed.x0, bed.x1), z = clamp(R0.z + Math.sin(a) * 1.4, bed.z0, bed.z1);
          flyTo(x, z, 2.5, 0.7, 0.4, 'forage'); return;
        }
        if (state === 'forage') { if (pecks <= 0) flyTo(R0.x, R0.z, perchY + 0.3, 0.8, 0.6, 'perch'); return; }
        if (r() < 0.5) bobAt = t; else look = (r() - 0.5) * 1.4;
        until = t + 1.5 + r() * 3;
      },
      tick: (t, dt) => {
        if (state === 'fly') {
          const u = fl.step(dt); wings.visible = true; wings.userData.flap(u > 0.8 ? 0.9 : 0.3 + 0.9 * Math.sin(t * 30));
          if (!fl.busy) { state = then; wings.visible = false; o.rotation.x = 0; if (state === 'forage') { pecks = 3 + Math.floor(r() * 3); peckAt = t; } until = t + 0.8; plant(o, fp, standY); }
          return;
        }
        if (state === 'forage') { const u = (t - peckAt) % 0.9; o.rotation.x = u < 0.25 ? 0.6 * Math.sin(Math.PI * u / 0.25) : 0; if (t - peckAt > 0.9) { pecks--; peckAt = t; } plant(o, fp, standY); return; }
        const toHer = Math.atan2(cam.x - o.position.x, cam.z - o.position.z);
        o.rotation.y = turnTo(o.rotation.y, dist(o.position.x, o.position.z) < 7 ? toHer : 1.2 + look, dt * 6);
        const u = t - bobAt; o.rotation.x = u >= 0 && u < 0.3 ? -0.25 * Math.sin(Math.PI * u / 0.3) : 0;     // the robin's bob and tail flick
        plant(o, fp, standY);
      },
      check: () => ({ x: o.position.x, y: o.position.y, z: o.position.z, perch: state === 'perch' ? 'spade' : state === 'edge' ? 'bed edge' : state === 'forage' ? 'soil' : 'air', air: state === 'fly' }),
    });
  }

  // ---- Sparrows round the orchard picnic table ---------------------------------------------
  {
    // on the mown path past the table and at the table's feet, where the crumbs fall (the long grass is cut back 3 ft either side)
    const C = { x: 86.5, z: -66 }, N = 6, inArea = (x, z) => x > 83 && x < 88.7 && z > -73 && z < -59 && !blocked(x, z, 0.3);
    const apples = (K.trees ?? []).filter(t => t.kind === 'apple').sort((a, b) => Math.hypot(a.x - C.x, a.z - C.z) - Math.hypot(b.x - C.x, b.z - C.z)).slice(0, 2);
    let inst, wingI, fp, scared = false, calm = 0; const B = [];
    const spot = () => { for (let k = 0; k < 60; k++) { const x = 83 + r() * 5.7, z = -73 + r() * 14; if (inArea(x, z)) return [x, z]; } return [85.5, -64]; };
    add({
      name: 'sparrows', x: C.x, z: C.z, load: 80, live: 60, when: daytime,
      init: async () => {
        const src = await mesh('v_sparrow'); fp = feet(src.geometry); inst = new THREE.InstancedMesh(src.geometry, src.material, N); inst.frustumCulled = false; inst.castShadow = false; inst.userData.creature = true;
        // wings that open in flight (one instanced mesh, two per bird, hinged on the back)
        const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.09, 0, 0, -0.08, 0.36, 0, -0.1, 0, 0, 0.09, 0.36, 0, -0.1, 0.3, 0, 0.03], 3)); wg.computeVertexNormals(); wg.translate(0, 0.16, 0.02);
        wingI = new THREE.InstancedMesh(wg, new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.9, side: THREE.DoubleSide }), N * 2); wingI.frustumCulled = false; wingI.userData.creature = true; wingI.userData.wing = true; scene.add(wingI);
        for (let i = 0; i < N; i++) { const [x, z] = spot(), y = ground(x, z, 2); B.push({ x, y, z, yaw: r() * TAU, pitch: 0, mode: 'peck', t0: 0, until: 0, ax: x, ay: y, az: z, bx: x, by: y, bz: z, T: 1, hops: 0, s: 1 }); }
        scene.add(inst);
      },
      show: on => { inst.visible = wingI.visible = on; },
      think: t => {
        const near = dist(C.x, C.z) < 11 || B.some(b => b.s > 0 && dist(b.x, b.z) < 8);
        if (near && !scared) {                                                                // all up into the apple trees
          scared = true; calm = 0;
          B.forEach((b, i) => { const tr = apples[i % Math.max(1, apples.length)] ?? { x: C.x - 8, z: C.z, height: 16 }; b.ax = b.x; b.ay = b.y; b.az = b.z; b.bx = tr.x + (r() - 0.5) * 3; b.by = (tr.height ?? 16) * 0.7; b.bz = tr.z + (r() - 0.5) * 3; b.T = 1.0 + r() * 0.5; b.t0 = t + r() * 0.3; b.mode = 'fly'; b.then = 'hidden'; });
          return;
        }
        if (scared) { calm = near ? 0 : calm + 0.25; if (calm > 8) { scared = false; B.forEach(b => { const [x, z] = spot(); b.ax = b.x; b.ay = b.y; b.az = b.z; b.bx = x; b.by = ground(x, z, 2); b.bz = z; b.T = 1.3 + r() * 0.6; b.t0 = t + r() * 3; b.mode = 'fly'; b.then = 'peck'; b.s = 1; }); } return; }
        for (const b of B) {
          if (b.mode === 'fly' || t < b.until) continue;
          const k = r();
          if (k < 0.4) { b.mode = 'peck'; b.until = t + 1 + r() * 2.5; }
          else if (k < 0.65) { b.mode = 'look'; b.until = t + 0.6 + r() * 1.5; b.yaw += (r() - 0.5) * 1.2; }
          else { const a = b.yaw + (r() - 0.5) * 1.5, x = b.x + Math.sin(a) * 1.2, z = b.z + Math.cos(a) * 1.2; if (inArea(x, z)) { b.mode = 'hop'; b.ax = b.x; b.az = b.z; b.bx = x; b.bz = z; b.by = ground(x, z, 2); b.t0 = t; b.T = 0.5; b.until = t + 0.6; } }
        }
      },
      tick: t => {
        for (let i = 0; i < N; i++) {
          const b = B[i];
          if (b.mode === 'fly') {
            const u = clamp((t - b.t0) / b.T, 0, 1), k = ease(u);
            b.x = b.ax + (b.bx - b.ax) * k; b.z = b.az + (b.bz - b.az) * k; b.y = b.ay + (b.by - b.ay) * k + 2 * Math.sin(Math.PI * u);
            if (u > 0) b.yaw = Math.atan2(b.bx - b.ax, b.bz - b.az); b.pitch = -0.2; b.s = 1;
            if (u >= 1) { b.mode = b.then; b.pitch = 0; b.s = b.then === 'hidden' ? 0 : 1; b.until = t + r(); b.y = b.by; }
          } else if (b.mode === 'hop') {
            const u = clamp((t - b.t0) / 0.5, 0, 1);                                       // three little hops
            b.x = b.ax + (b.bx - b.ax) * u; b.z = b.az + (b.bz - b.az) * u; b.y = b.by + 0.1 * Math.abs(Math.sin(Math.PI * u * 3)); b.yaw = Math.atan2(b.bx - b.ax, b.bz - b.az);
            if (u >= 1) { b.mode = 'peck'; b.y = b.by; b.until = t + 0.5 + r(); }
          } else if (b.mode === 'peck') { const u = (t * 2.6 + i * 0.7) % 1; b.pitch = u < 0.3 ? 0.7 * Math.sin(Math.PI * u / 0.3) : 0; }
          else b.pitch = 0;
          e.set(b.pitch, b.yaw, 0, 'YXZ'); q.setFromEuler(e); pv.set(b.x, 0, b.z); sv.setScalar(b.s); m4.compose(pv, q, sv);
          if (b.mode !== 'fly') {                                                       // feet on the ground: the lowest foot at the surface, plus the hop
            const el = m4.elements; let lo = Infinity; for (let j = 0; j < fp.length; j += 3) lo = Math.min(lo, el[1] * fp[j] + el[5] * fp[j + 1] + el[9] * fp[j + 2]);
            el[13] = b.by + (b.y - b.by) - lo;
          } else m4.elements[13] = b.y;
          inst.setMatrixAt(i, m4);
          const fly = b.mode === 'fly' && b.s > 0, beat = 0.2 + 1.0 * Math.sin(t * 28 + i);
          for (const side of [0, 1]) { e.set(b.pitch, b.yaw, side ? -beat : beat, 'YXZ'); q.setFromEuler(e); pv.set(b.x, b.y, b.z); sv.set(side ? -1 : 1, 1, 1).multiplyScalar(fly ? 1 : 0); wingI.setMatrixAt(i * 2 + side, m4.compose(pv, q, sv)); }
        }
        inst.instanceMatrix.needsUpdate = true; wingI.instanceMatrix.needsUpdate = true;
      },
      check: () => { const b = B.find(b => b.s > 0 && b.mode !== 'fly') ?? B[0]; return { x: b.x, y: b.y, z: b.z, perch: 'ground', hidden: b.s === 0, all: B.map(b => ({ x: b.x, y: b.y, z: b.z, hidden: b.s === 0 || b.mode === 'fly', air: b.mode === 'hop' && b.y - b.by > 0.005 })) }; },
    });
  }

  // ---- Blackbird on the front lawn: run, stop, listen, stab, tug -------------------------------
  {
    const box = { x0: -27, x1: -15, z0: 23, z1: 39 }, hide = [-10.0, 31];
    let o, fp, wings, w, fl, state = 'stop', until = 0, gy = 0.03, act = 0, gone = false, safe = 0;
    const pick = (fx, fz, d0) => { for (let k = 0; k < 20; k++) { const a = r() * TAU, d = d0 * (0.6 + r() * 0.6), x = clamp(fx + Math.cos(a) * d, box.x0, box.x1), z = clamp(fz + Math.sin(a) * d, box.z0, box.z1); if (!blocked(x, z, 0.3)) return [x, z]; } return [fx, fz]; };
    add({
      name: 'blackbird', x: -21, z: 31, load: 80, live: 60, when: () => day.light > 0.15,
      init: async () => { const body = await mesh('v_blackbird'); fp = feet(body.geometry); o = new THREE.Group(); o.add(body); wings = wingPair(1.25, 0.3, 0x1c1a18, 0x0c0b0a, [0, 0.36, 0]); o.add(wings); gy = ground(-21, 31, 2); o.position.set(-21, gy, 31); plant(o, fp, gy); scene.add(o); w = new Walk(o); w.base = gy; fl = new Flight(o); },
      show: on => { o.visible = on && !gone; },
      think: t => {
        const p = o.position, d = dist(p.x, p.z);
        if (gone) { safe = d > 12 && dist(box.x0, box.z0) > 10 ? safe + 0.25 : 0; if (safe > 10 && !fl.busy) { gone = false; o.visible = true; const [x, z] = pick(-21, 31, 4); gy = ground(x, z, 2); state = 'fly'; fl.go(x, gy, z, 1.4, 1.5); } return; }
        if (state === 'fly') return;
        if (d < 4.5) { gone = true; safe = 0; state = 'fly'; fl.go(hide[0], 2.2, hide[1], 1.1, 1.2); return; }
        if (d < 9 && state !== 'run') { const ax = p.x + (p.x - cam.x) / d * 7, az = p.z + (p.z - cam.z) / d * 7, [x, z] = pick(ax, az, 1.5); w.go([[x, ground(x, z, 2), z]], 6.5, 0.06, 0.35, 14, gy); state = 'run'; return; }
        if (w.busy || t < until) return;
        const k = r();
        if (state === 'run' || k < 0.3) { state = 'listen'; until = t + 0.8 + r() * 1.2; act = t; }
        else if (k < 0.55) { state = 'stab'; until = t + 2.2; act = t; }
        else { const [x, z] = pick(p.x, p.z, 3.5); w.go([[x, ground(x, z, 2), z]], 4.5, 0.05, 0.32, 14, gy); state = 'run'; }
      },
      tick: (t, dt) => {
        if (state === 'fly') { const u = fl.step(dt); wings.visible = true; wings.userData.flap(u > 0.8 ? 0.9 : 0.3 + 0.9 * Math.sin(t * 22)); if (!fl.busy) { wings.visible = false; o.rotation.set(0, o.rotation.y, 0); state = 'stop'; if (gone) o.visible = false; else { w.base = gy; plant(o, fp, gy); } } return; }
        if (w.step(dt)) { gy = w.base; o.rotation.x = 0.08; o.rotation.z = 0; plant(o, fp, gy, w.lift); return; }
        const u = t - act;
        if (state === 'listen') { o.rotation.z = 0.32 * Math.sin(Math.min(1, u * 3) * Math.PI / 2); o.rotation.x = 0.1; }
        else if (state === 'stab') {                                                          // stab, then tug at the worm, leaning back
          o.rotation.z = 0; o.rotation.x = u < 0.2 ? 0.8 * u / 0.2 : u < 1.6 ? 0.8 - 0.25 * Math.abs(Math.sin((u - 0.2) * 6)) : Math.max(0, 0.8 - (u - 1.6) * 3);
        } else { o.rotation.x = 0; o.rotation.z = 0; }
        plant(o, fp, gy);
      },
      check: () => ({ x: o.position.x, y: o.position.y, z: o.position.z, perch: gone ? 'hidden' : 'ground', hidden: gone, air: state === 'fly' || (w.busy && w.lift > 0.005) }),
    });
  }

  // ---- Barn owl on the tyre-swing limb of the old oak, at night: its head follows you ------------
  {
    const L0 = [-59, 15.6, 44], L1 = [-49, 17.5, 51], u = 0.3, P = [L0[0] + (L1[0] - L0[0]) * u, L0[1] + (L1[1] - L0[1]) * u + 0.35, L0[2] + (L1[2] - L0[2]) * u];
    const yaw0 = Math.atan2(7, -10);                                                  // across the limb, toward the house
    let o, head, fpO, hy = 0, hp = 0, scanAt = 0, perchY = P[1];
    add({
      name: 'owl', x: P[0], z: P[2], load: 90, live: 75, when: () => day.night > 0.55,
      init: async () => {
        const src = await mesh('v_owl_barn'); const g = src.geometry; g.computeBoundingBox(); const top = g.boundingBox.max.y, neck = top * 0.66;
        const [bodyG, headG] = splitHead(g, (x, y) => y > neck, [0, neck, -0.02]);
        o = new THREE.Group(); const body = new THREE.Mesh(bodyG, src.material); head = new THREE.Mesh(headG, src.material); head.position.set(0, neck, -0.02); fpO = feet(bodyG);
        for (const m of [body, head]) { m.userData.creature = true; m.castShadow = false; o.add(m); }
        const y = ground(P[0], P[2], P[1] + 1.2, P[1]); if (Math.abs(y - P[1]) < 0.8) perchY = y;
        o.position.set(P[0], perchY, P[2]); o.rotation.y = yaw0; plant(o, fpO, perchY); scene.add(o);
      },
      show: on => { o.visible = on; },
      tick: (t, dt) => {
        const dx = cam.x - o.position.x, dz = cam.z - o.position.z, d = Math.hypot(dx, dz);
        let want = 0, pitch = 0.15;
        if (d < 45) { want = clamp(wrapA(Math.atan2(dx, dz) - yaw0), -2.0, 2.0); pitch = clamp(Math.atan2(o.position.y + 1 - cam.y, d), -0.3, 0.6); }
        else { if (t > scanAt) scanAt = t + 3 + (Math.sin(t) + 1) * 2; want = 1.2 * Math.sin(Math.floor(scanAt) * 1.7); }
        hy = turnTo(hy, want, dt * 2.6); hp += (pitch - hp) * Math.min(1, dt * 3);
        head.rotation.set(hp, hy, 0.08 * Math.sin(t * 0.4), 'YXZ');
      },
      check: () => ({ x: o.position.x, y: o.position.y, z: o.position.z, perch: 'oak limb' }),
    });
  }

  // ---- Bats: flitting over the front lawn below the old oak and along the meadow's edge, dusk into night ----
  {
    const batX = ([cx, , R, , ph], s) => cx + R * (Math.sin(s + ph) + 0.35 * Math.sin(s * 2.7)), batZ = ([, cz, R, , ph], s) => cz + R * (Math.cos(s * 1.3 + ph) + 0.3 * Math.cos(s * 3.1));
    const N = 3, uT = { value: 0 }, beats = [[-38, 30, 8, 8, 0], [-22, 50, 9, 10, 2.1], [-46, -38, 10, 9, 4.2]];      // over open lawn, clear of the crowns
    let inst;
    add({
      name: 'bats', x: -35, z: 20, load: 110, live: 90, when: () => { const h = hour(); return day.light < 0.5 && (h >= 17 || h < 6.5); },
      init: async () => {
        const src = await mesh('v_bat', 1.0, 0x6a5240); inst = new THREE.InstancedMesh(src.geometry, flapping(src.material, uT, 0.75, 19), N);
        inst.frustumCulled = false; inst.castShadow = false; inst.userData.creature = true; scene.add(inst);
      },
      show: on => { inst.visible = on; },
      tick: t => {
        uT.value = t;
        for (let i = 0; i < N; i++) {
          const B = beats[i], a = t * 0.55 + B[4], b = a + 0.05;
          const x = batX(B, a), z = batZ(B, a), y = B[3] + 2 * Math.sin(a * 1.9) + 0.6 * Math.sin(a * 7.3), vx = batX(B, b) - x, vz = batZ(B, b) - z;
          e.set(0.1, Math.atan2(vx, vz), 0.3 * Math.sin(a * 2.2), 'YXZ'); q.setFromEuler(e); pv.set(x, y, z); sv.setScalar(1);
          inst.setMatrixAt(i, m4.compose(pv, q, sv));
        }
        inst.instanceMatrix.needsUpdate = true;
      },
      check: () => ({ x: beats[0][0], y: beats[0][3], z: beats[0][1], perch: 'air' }),
    });
  }

  // ---- Bees: out of the hives to the flowers near them and back, by day -------------------------
  {
    const hives = K.hives ?? [];
    if (hives.length) {
      const per = 8, N = hives.length * per, uT = { value: 0 };
      const cx = hives.reduce((s, h) => s + (h.entrance ?? h).x, 0) / hives.length, cz = hives.reduce((s, h) => s + (h.entrance ?? h).z, 0) / hives.length;
      let inst; const bees = [];
      add({
        name: 'bees', x: cx, z: cz, load: 70, live: 50, when: () => day.light > 0.45,
        init: async () => {
          // a bee, 0.07 ft long: a striped body and two pale wings (the wings shimmer in the shader)
          const body = coloured(new THREE.SphereGeometry(0.5, 6, 4).scale(0.36, 0.34, 0.5), (x, y, z) => (Math.floor((z + 0.5) * 5) % 2 ? 0x2a1e10 : 0xd8a020));
          const wingsG = tris([[[0, 0.15, 0.1], [0.55, 0.22, -0.05], [0.1, 0.15, -0.15]], [[0, 0.15, 0.1], [-0.1, 0.15, -0.15], [-0.55, 0.22, -0.05]]], 0xe8eef0);
          const geo = mergeGeometries([body, wingsG]); geo.scale(0.09, 0.09, 0.09);
          inst = new THREE.InstancedMesh(geo, flapping(vcMat({ side: THREE.DoubleSide }), uT, 0.6, 70), N); inst.frustumCulled = false; inst.castShadow = false; inst.userData.creature = true;
          hives.forEach((h, hi) => {
            const en = h.entrance ?? h, fl = (K.F?.list ?? []).filter(p => FLOWERS.has(p.kind) && Math.hypot(p.x - en.x, p.z - en.z) < 30).map(p => [p.x, p.y + Math.max(0.6, p.h * 0.9), p.z]);
            const list = fl.length ? fl : [[en.x - 6, 1.5, en.z], [en.x - 4, 1.2, en.z + 5]];
            for (let k = 0; k < per; k++) bees.push({ en, list, mode: 'in', t0: -r() * 6, T: 1 + r() * 5, ax: en.x, ay: en.y, az: en.z, bx: en.x, by: en.y, bz: en.z, visits: 0, ph: r() * 9, x: en.x, y: en.y, z: en.z, yaw: 0 });
          });
          scene.add(inst);
        },
        show: on => { inst.visible = on; },
        tick: t => {
          uT.value = t;
          for (let i = 0; i < bees.length; i++) {
            const b = bees[i], u = (t - b.t0) / b.T;
            if (u >= 1) {                                                           // next leg
              b.t0 = t; b.ax = b.x; b.ay = b.y; b.az = b.z;
              const go = n => { b.bx = n[0] + (Math.sin(i * 7.1 + t) * 0.3); b.by = n[1]; b.bz = n[2] + Math.cos(i * 3.3 + t) * 0.3; b.T = 0.5 + Math.hypot(b.bx - b.ax, b.bz - b.az) / 5; };
              const pickF = () => b.list[Math.floor(rng(i * 131 + Math.floor(t * 7))() * b.list.length)];
              if (b.mode === 'in') { b.mode = 'out'; go(pickF()); b.visits = 1 + (i % 3); }
              else if (b.mode === 'out' || b.mode === 'hop') { b.mode = 'work'; b.T = 1.5 + (i % 5) * 0.6; b.bx = b.x; b.by = b.y; b.bz = b.z; }
              else if (b.mode === 'work' && b.visits > 1) { b.visits--; b.mode = 'hop'; const n = pickF(); go(Math.hypot(n[0] - b.x, n[2] - b.z) < 8 ? n : [b.x + 1.5, b.y, b.z + 1]); }
              else if (b.mode === 'work') { b.mode = 'home'; b.bx = b.en.x; b.by = b.en.y; b.bz = b.en.z; b.T = 0.5 + Math.hypot(b.bx - b.ax, b.bz - b.az) / 5; }
              else { b.mode = 'in'; b.T = 2 + (i % 4) * 1.5; }
            }
            const k = clamp((t - b.t0) / b.T, 0, 1);
            if (b.mode === 'work') { b.x = b.ax + 0.12 * Math.sin(t * 5 + b.ph); b.y = b.ay + 0.06 * Math.sin(t * 7 + b.ph); b.z = b.az + 0.12 * Math.cos(t * 4 + b.ph); }
            else if (b.mode !== 'in') { const s = ease(k), wob = Math.sin(Math.PI * k); b.x = b.ax + (b.bx - b.ax) * s + 0.4 * wob * Math.sin(t * 3 + b.ph); b.z = b.az + (b.bz - b.az) * s + 0.4 * wob * Math.cos(t * 2.6 + b.ph); b.y = b.ay + (b.by - b.ay) * s + wob * 1.2; b.yaw = Math.atan2(b.bx - b.ax, b.bz - b.az); }
            e.set(0, b.yaw + (b.mode === 'work' ? Math.sin(t * 2 + b.ph) : 0), 0); q.setFromEuler(e); pv.set(b.x, b.y, b.z); sv.setScalar(b.mode === 'in' ? 0 : 1);
            inst.setMatrixAt(i, m4.compose(pv, q, sv));
          }
          inst.instanceMatrix.needsUpdate = true;
        },
        check: () => ({ x: cx, y: 1, z: cz, perch: 'air', hives: hives.length }),
      });
    }
  }

  // ---- Fox on the wild rim of the island, at dusk and dawn ------------------------------------
  {
    // the free stretches of rim: points at 0.86 of the island's radius, clear of everything the visitor bumps into
    const rim = []; for (let i = 0; i < 360; i++) { const a = i / 360 * TAU, d = islandEdge(a) * 0.86, x = ISLAND.x + Math.cos(a) * d, z = ISLAND.z + Math.sin(a) * d; rim.push({ a, x, z, free: !blocked(x, z, 1.4, 3) }); }
    const runs = []; { let cur = null; for (let k = 0; k < 720; k++) { const p = rim[k % 360]; if (p.free) { if (!cur) cur = []; if (cur.length < 360) cur.push(p); } else if (cur) { runs.push(cur); cur = null; } if (k >= 360 && !cur) break; } if (cur) runs.push(cur); }
    const long = runs.filter(r => r.length > 12).sort((a, b) => b.length - a.length).slice(0, 3);
    if (long.length) {
      const run0 = long[0], mid = run0[Math.floor(run0.length / 2)];
      let o, mixer, acts = {}, cur = null, run = run0, idx = Math.floor(run0.length / 2), dir = 1, state = 'sit', until = 0, gone = false, back = 0, goal = idx, speed = 0;
      const Y = p => (p.y ??= ground(p.x, p.z, 2)), low = {};                       // the ground at each rim point, measured when first reached
      const lowOf = a => { const tab = low[a.getClip().name], f = (a.time / a.getClip().duration % 1) * 16, i = Math.floor(f); return tab ? tab[i] + (tab[Math.min(16, i + 1)] - tab[i]) * (f - i) : 0; };
      const paws = () => !cur ? 0 : prev && prev.getEffectiveWeight() > 0.02 ? Math.min(lowOf(cur), lowOf(prev)) : lowOf(cur);      // while two clips blend, the lower
      let groundY = 0.03;
      let prev = null;
      const play = (n, ts = 1) => { const a = acts[n]; if (!a) return; a.timeScale = ts; if (cur === a) return; a.reset().fadeIn(0.35).play(); cur?.fadeOut(0.35); prev = cur; cur = a; };
      add({
        name: 'fox', x: mid.x, z: mid.z, load: 140, live: 120, when: dusky,
        init: async () => {
          const g = await glb('q_fox'); o = g.scene;
          // its five flat colours into one skinned mesh (vertex colours): one draw
          const parts = []; let skel = null, bindM = null, host = null;
          o.updateMatrixWorld(true);
          o.traverse(n => { if (n.isSkinnedMesh) { skel = n.skeleton; bindM = n.bindMatrix; host ??= n.parent; const geo = n.geometry.clone(); const c = n.material.color; const k = geo.attributes.position.count, col = new Float32Array(k * 3); for (let i = 0; i < k; i++) c.toArray(col, i * 3); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); for (const a of Object.keys(geo.attributes)) if (!['position', 'skinIndex', 'skinWeight', 'color'].includes(a)) geo.deleteAttribute(a); parts.push([n, geo]); } });
          if (parts.length > 1) {
            const merged = mergeGeometries(parts.map(p => p[1])), sm = new THREE.SkinnedMesh(merged, vcMat({ roughness: 0.9 }));
            sm.bind(skel, bindM); sm.castShadow = false; sm.userData.creature = true; host.add(sm);
            for (const [n] of parts) n.parent.remove(n);
          }
          o.scale.setScalar(FT); mixer = new THREE.AnimationMixer(o);
          for (const c of g.animations) acts[c.name] = mixer.clipAction(c);
          // how low its feet reach through each clip (17 poses a clip), so the paws, not the body, meet the ground
          { let sm = null; o.traverse(n => { if (n.isSkinnedMesh) sm = n; }); const pos = sm.geometry.attributes.position, v = new THREE.Vector3();
            o.updateMatrixWorld(true);
            for (const [name, act] of Object.entries(acts)) {
              const tab = new Float32Array(17); act.reset().play();
              for (let k = 0; k <= 16; k++) { act.time = act.getClip().duration * k / 16; mixer.update(0); o.updateMatrixWorld(true); sm.skeleton.update(); let lo = Infinity; for (let i = 0; i < pos.count; i += 2) { sm.getVertexPosition(i, v); v.applyMatrix4(sm.matrixWorld); if (v.y < lo) lo = v.y; } tab[k] = lo; }
              act.stop(); low[name] = tab;
            } }
          const p = run[idx]; groundY = Y(p); o.position.set(p.x, groundY, p.z); o.rotation.y = Math.atan2(ISLAND.x - p.x, ISLAND.z - p.z) + Math.PI; scene.add(o); play('Idle');
        },
        show: on => { o.visible = on && !gone; },
        think: t => {
          const p = o.position, d = dist(p.x, p.z);
          if (gone) { back += 0.25; if (back > 70) { const r2 = long[Math.floor(r() * long.length)], j = Math.floor(r() * r2.length), q2 = r2[j]; if (dist(q2.x, q2.z) > 55) { run = r2; idx = goal = j; gone = false; o.visible = true; groundY = Y(q2); o.position.set(q2.x, groundY, q2.z); state = 'sit'; play('Idle'); until = t + 3; } } return; }
          if (d < 20 && state !== 'flee') {                                         // off, away from her along the rim
            const ahead = run[clamp(idx + 8, 0, run.length - 1)], behind = run[clamp(idx - 8, 0, run.length - 1)];
            dir = dist(ahead.x, ahead.z) > dist(behind.x, behind.z) ? 1 : -1; goal = dir > 0 ? run.length - 1 : 0; state = 'flee'; speed = 11; play('Run', 1.1); return;
          }
          if (state === 'flee') return;
          if (state === 'trot' && idx === goal) { state = 'pause'; until = t + 3 + r() * 6; play(['Idle', 'Idle2', 'IdleHeadLow', 'Eat'][Math.floor(r() * 4)]); }
          if (state === 'pause' && d < 40 && Math.abs(wrapA(Math.atan2(cam.x - p.x, cam.z - p.z) - o.rotation.y)) > 0.7) { state = 'turn'; play('Walk', 0.7); return; }      // it has seen her
          if (t < until || state === 'trot' || state === 'turn') return;
          if (r() < 0.55) { goal = clamp(idx + Math.round((r() - 0.5) * 30), 0, run.length - 1); if (goal !== idx) { state = 'trot'; speed = 2.6; play('Walk', 1.0); } }
          else { state = 'pause'; until = t + 3 + r() * 5; play(['Idle', 'Idle2', 'IdleHeadLow', 'Eat'][Math.floor(r() * 4)]); }
        },
        tick: (t, dt) => {
          mixer.update(dt);
          if (state === 'trot' || state === 'flee') {
            const tgt = run[idx + Math.sign(goal - idx)] ?? run[idx], p = o.position, dx = tgt.x - p.x, dz = tgt.z - p.z, dd = Math.hypot(dx, dz), mv = speed * dt;
            if (dd <= mv || idx === goal) { p.set(tgt.x, Y(tgt), tgt.z); groundY = Y(tgt); idx = run.indexOf(tgt); if (idx === goal && state === 'flee') { gone = true; back = 0; o.visible = false; state = 'sit'; } }
            else { p.x += dx / dd * mv; p.z += dz / dd * mv; o.rotation.y = turnTo(o.rotation.y, Math.atan2(dx, dz), dt * 6); }
          }
          if (state === 'turn') {                                            // turning round to look at her, stepping as it turns
            const want = Math.atan2(cam.x - o.position.x, cam.z - o.position.z); o.rotation.y = turnTo(o.rotation.y, want, dt * 1.6);
            if (Math.abs(wrapA(want - o.rotation.y)) < 0.05) { state = 'pause'; until = t + 3 + r() * 4; play('Idle'); }
          }
          o.position.y = groundY - paws();                                           // the lowest paw on the ground, whatever the stride
        },
        check: () => ({ x: o.position.x, y: o.position.y, z: o.position.z, perch: 'ground', hidden: gone, air: state === 'flee' }),
      });
    }
  }

  // ---- Heron in the pond shallows, early in the morning ----------------------------------------
  {
    const A0 = 2.0, S0 = 0.9;
    const floor = new Float32Array(17);                                              // the pond's floor along its stretch (A0 +- 0.4), measured at load
    const spotAt = a => { const [x, z] = pondAt(a, S0), f = clamp((a - A0 + 0.4) / 0.05, 0, 15.999), i = Math.floor(f); return [x, floor[0] ? floor[i] + (floor[i + 1] - floor[i]) * (f - i) : POND.y - depthAt(x, z), z]; };
    let o, fp, wings, fl, standAt = NaN, standY = 0, a = A0, state = 'stand', until = 0, strikeAt = -9, gone = false, safe = 0, stepA = a, stepU = 1;
    const [hx0, , hz0] = spotAt(A0);
    add({
      name: 'heron', x: hx0, z: hz0, load: 110, live: 90, when: () => { const h = hour(); return h >= 5 && h < 10.5; },
      init: async () => {
        for (let i = 0; i <= 16; i++) { const [x, z] = pondAt(A0 - 0.4 + i * 0.05, S0); floor[i] = ground(x, z, POND.y - 0.05, POND.y - depthAt(x, z)); }
        const body = await mesh('v_heron'); fp = feet(body.geometry); o = new THREE.Group(); o.add(body); wings = wingPair(6.0, 1.3, 0x8a9096, 0x2a2c30, [0, 2.2, -0.1]); o.add(wings);
        const [x, y, z] = spotAt(a); o.position.set(x, y, z); o.rotation.y = a + Math.PI; plant(o, fp, y); scene.add(o); fl = new Flight(o);
      },
      show: on => { o.visible = on && !gone; },
      think: t => {
        const p = o.position, d = dist(p.x, p.z);
        if (gone) { safe = dist(hx0, hz0) > 45 ? safe + 0.25 : 0; if (safe > 20 && !fl.busy) { gone = false; o.visible = true; a = A0; const [x, y, z] = spotAt(a); o.position.set(x + 30, y + 25, z - 20); state = 'fly'; fl.go(x, y, z, 4, 3); } return; }
        if (state === 'fly') return;
        if (d < 12) { gone = true; safe = 0; state = 'fly'; const out = Math.atan2(p.z - cam.z, p.x - cam.x); fl.go(p.x + Math.cos(out) * 60, p.y + 30, p.z + Math.sin(out) * 60, 5, 4); return; }
        if (d < 22 && state !== 'step' && t > until) {                              // wary: a slow stalk away along the shallows, as far as its stretch goes
          const da = (wrapA(Math.atan2(cam.z - POND.z, cam.x - POND.x) - a) > 0 ? -1 : 1) * 0.25, to = clamp(a + da, A0 - 0.38, A0 + 0.38);
          if (Math.abs(to - a) > 0.05) { stepA = to; stepU = 0; state = 'step'; } else { state = 'stand'; until = t + 4; }
          return;
        }
        if (t < until || state === 'step') return;
        const k = r();
        if (k < 0.55) { state = 'stand'; until = t + 5 + r() * 12; }
        else if (k < 0.8) { state = 'strike'; strikeAt = t; until = t + 1.5; }
        else { stepA = clamp(a + (r() - 0.5) * 0.25, A0 - 0.38, A0 + 0.38); stepU = 0; state = 'step'; }
      },
      tick: (t, dt) => {
        if (state === 'fly') {
          fl.step(dt); wings.visible = true; wings.userData.flap(0.15 + 0.55 * Math.sin(t * 6.5)); o.rotation.x = -0.1;
          if (!fl.busy) { wings.visible = false; o.rotation.x = 0; if (gone) o.visible = false; else { state = 'stand'; until = t + 6; o.rotation.y = a + Math.PI; } }
          return;
        }
        if (state === 'step') {
          stepU = Math.min(1, stepU + dt * 0.35); a += (stepA - a) * Math.min(1, dt * 0.6);
          const [x, y, z] = spotAt(a); o.position.x = x; o.position.z = z; o.rotation.y = turnTo(o.rotation.y, a + Math.PI + Math.sign(stepA - a) * 1.4, dt * 1.5);
          plant(o, fp, y);
          if (stepU >= 1) { state = 'stand'; until = t + 4; }
          return;
        }
        const u = t - strikeAt; o.rotation.x = u < 0.12 ? 0.55 * u / 0.12 : u < 0.4 ? 0.55 : u < 0.9 ? 0.55 * (1 - (u - 0.4) / 0.5) : 0;
        if (standAt !== a) { standAt = a; standY = ground(o.position.x, o.position.z, POND.y - 0.05, spotAt(a)[1]); }      // the floor right under it, once it stands
        plant(o, fp, standY);
      },
      check: () => ({ x: o.position.x, y: o.position.y, z: o.position.z, perch: 'pond shallows', hidden: gone, air: state === 'fly', err: gone || state === 'fly' ? 0 : Math.abs(pondS(o.position.x, o.position.z) - S0) > 0.06 ? 1 : 0 }),
    });
  }

  // ---- Four ducklings in a line behind the brown duck (pond.js gives the ducks' live positions) --------------
  {
    const P = POND, N = 4, TR = 48, tx = new Float32Array(TR), tz = new Float32Array(TR); let inst, head = 0, filled = 0;
    const ky = new Float32Array(N), kx = new Float32Array(N), kz = new Float32Array(N), kyaw = new Float32Array(N);
    const mom = () => window.__pond?.ducks?.[1], WL = 0.082 * FT;          // the waterline, up from the feet: a third of the way up the body
    add({
      name: 'ducklings', x: P.x - 7, z: P.z, load: 90, live: 70, when: () => day.light > 0.3 && !!mom(),
      init: async () => {
        const src = await mesh('v_duckling', 1.0, 0xa88a58); inst = new THREE.InstancedMesh(src.geometry, src.material, N); inst.frustumCulled = false; inst.castShadow = false; inst.userData.creature = true; scene.add(inst);
        const m = mom(); for (let i = 0; i < TR; i++) { tx[i] = m.x; tz[i] = m.z; } filled = TR;            // close round her to begin with
        for (let k = 0; k < N; k++) { kx[k] = m.x - Math.sin(m.yaw) * 0.7 * (k + 1); kz[k] = m.z - Math.cos(m.yaw) * 0.7 * (k + 1); if (pondS(kx[k], kz[k]) > 0.88) { kx[k] = m.x; kz[k] = m.z; } kyaw[k] = m.yaw; }
      },
      show: on => { inst.visible = on; },
      tick: (t, dt) => {
        const m = mom(); if (!m) return;
        if (Math.hypot(m.x - tx[head], m.z - tz[head]) > 0.3) { head = (head + 1) % TR; tx[head] = m.x; tz[head] = m.z; filled = Math.min(TR, filled + 1); }   // her track, a crumb every 0.3 ft
        for (let k = 0; k < N; k++) {
          const j = (head - 3 * (k + 1) - (k % 2) + TR * 2) % TR, gx = tx[j] + 0.25 * Math.sin(t * 0.5 + k * 1.7), gz = tz[j] + 0.25 * Math.cos(t * 0.6 + k * 2.3);
          const dx = gx - kx[k], dz = gz - kz[k], d = Math.hypot(dx, dz), f = Math.min(1, dt * (d > 1.5 ? 2.5 : 1.2));
          if (pondS(kx[k] + dx * f, kz[k] + dz * f) < 0.9) { kx[k] += dx * f; kz[k] += dz * f; }       // never out of the water if (d > 0.05) kyaw[k] = turnTo(kyaw[k], Math.atan2(dx, dz), dt * 3);
          e.set(0.03 * Math.sin(t * 1.6 + k), kyaw[k], 0, 'YXZ'); q.setFromEuler(e); sv.setScalar(1);
          pv.set(0, WL, 0).applyQuaternion(q); pv.set(kx[k] - pv.x, P.y + 0.006 * Math.sin(t * 2 + k) - pv.y, kz[k] - pv.z);     // floating at the waterline, whatever the bob
          inst.setMatrixAt(k, m4.compose(pv, q, sv));
        }
        inst.instanceMatrix.needsUpdate = true; void ky;
      },
      check: () => ({ x: kx[0], y: P.y - WL, z: kz[0], perch: 'water', err: pondS(kx[0], kz[0]) > 0.95 ? 1 : 0, all: Array.from(kx, (x, k) => ({ x, y: P.y - 0.2, z: kz[k] })) }),
    });
  }

  // ---- Two rabbits on the lawn by the long border, at dawn -------------------------------------
  {
    const box = { x0: 9.5, x1: 22, zs: [[-99, -85], [-75.5, -62.5]] };
    const spot = () => { for (let k = 0; k < 30; k++) { const [z0, z1] = box.zs[Math.floor(r() * 2)], x = box.x0 + r() * (box.x1 - box.x0), z = z0 + r() * (z1 - z0); if (!blocked(x, z, 0.5)) return [x, z]; } return [15, -92]; };
    for (let n = 0; n < 2; n++) {
      const [x0, z0] = n ? [16, -70] : [13, -92];
      let o, w, fp, state = 'graze', until = 0, gone = false, back = 0, face = r() * TAU, look = face, gy = 0.03;
      add({
        name: 'rabbit' + (n + 1), x: x0, z: z0, load: 90, live: 70, when: () => { const h = hour(); return h >= 4.5 && h < 8.5; },
        init: async () => { o = await mesh('v_rabbit', 1.0, n ? 0xd0c0a8 : 0xffffff); fp = feet(o.geometry); gy = ground(x0, z0, 2); o.position.set(x0, gy, z0); o.rotation.y = face; plant(o, fp, gy); scene.add(o); w = new Walk(o); w.base = gy; },
        show: on => { o.visible = on && !gone; },
        think: t => {
          const p = o.position, d = dist(p.x, p.z);
          if (gone) { back += 0.25; if (back > 40) { const [x, z] = spot(); if (dist(x, z) > 30) { gone = false; o.visible = true; gy = w.base = ground(x, z, 2); o.position.set(x, gy, z); state = 'up'; until = t + 3; } } return; }
          if (d < 16 && state !== 'bolt') { const x = 4.2, z = clamp(p.z + (p.z - cam.z) * 0.3, -105, -58); w.go([[x, ground(x, z, 2), z]], 9, 0.4, 2.6, 10, gy); state = 'bolt'; return; }
          if (state === 'bolt') { if (!w.busy) { gone = true; back = 0; o.visible = false; } return; }
          if (w.busy || t < until) return;
          const k = r();
          if (k < 0.5) { state = 'graze'; until = t + 3 + r() * 6; }
          else if (k < 0.7) { state = 'up'; until = t + 2 + r() * 2; look = face + (r() - 0.5) * 0.9; }
          else { const a = face + (r() - 0.5) * 1.6, x = clamp(p.x + Math.sin(a) * 2.5, box.x0, box.x1), z = p.z + Math.cos(a) * 2.5; if (box.zs.some(([a0, a1]) => z > a0 && z < a1)) { w.go([[x, ground(x, z, 2), z]], 1.8, 0.22, 0.85, 6, gy); state = 'hop'; } }
        },
        tick: (t, dt) => {
          if (w.step(dt)) { gy = w.base; o.rotation.x = -0.1 * Math.sin(Math.PI * w.ph); plant(o, fp, gy, w.lift); return; }
          if (state === 'hop') { state = 'graze'; face = look = o.rotation.y; }
          const want = state === 'up' && dist(o.position.x, o.position.z) < 40 ? Math.atan2(cam.x - o.position.x, cam.z - o.position.z) : look;
          const ny = turnTo(o.rotation.y, want, dt * 1.6), turning = Math.abs(ny - o.rotation.y) > 1e-4; o.rotation.y = ny;
          const up = state === 'up' ? 1 : 0;
          o.rotation.x += ((up ? -0.32 : 0.14 + 0.04 * Math.max(0, Math.sin(t * 10 + n))) - o.rotation.x) * Math.min(1, dt * 5);
          plant(o, fp, gy, turning ? 0.03 * Math.abs(Math.sin(t * 14 + n)) : 0);
        },
        check: () => ({ x: o.position.x, y: o.position.y, z: o.position.z, perch: 'ground', hidden: gone, air: w.busy && w.lift > 0.005 }),
      });
    }
  }

  // ---- Tortoise in the kitchen garden: up and down the gravel between the kale and the beans ---
  {
    const gx = 54.1, z0 = -75.4, z1 = -64.6;
    let o, head, fp, w, state = 'pause', until = 0, k = 1, shy = 0, headZ = 0, gy = 0.03;
    add({
      name: 'tortoise', x: gx, z: -70, load: 70, live: 50, when: () => day.light > 0.5,
      init: async () => {
        const src = await mesh('v_tortoise'); const g = src.geometry; g.computeBoundingBox(); const bb = g.boundingBox, L = bb.max.z - bb.min.z;
        headZ = bb.max.z - L * 0.24;
        const [bodyG, headG] = splitHead(g, (x, y, z) => z > headZ && Math.abs(x) < 0.12, [0, 0, headZ]);
        o = new THREE.Group(); const body = new THREE.Mesh(bodyG, src.material); head = new THREE.Mesh(headG, src.material); head.position.z = headZ;
        for (const m of [body, head]) { m.userData.creature = true; o.add(m); }
        fp = feet(bodyG); gy = ground(gx, -70, 2); o.position.set(gx, gy, -70); o.rotation.y = Math.PI; plant(o, fp, gy); scene.add(o); w = new Walk(o); w.base = gy;
      },
      show: on => { o.visible = on; },
      think: t => {
        if (dist3(o.position.x, o.position.y, o.position.z) < 5.5) shy = t + 5;
        if (t < shy || w.busy || t < until) return;
        if (r() < 0.6) { const z = clamp(o.position.z + (r() < 0.5 ? -1 : 1) * (2 + r() * 4), z0, z1), x = gx + (r() - 0.5) * 0.6; w.go([[x, ground(x, z, 2), z]], 0.15, 0, 1, 0.5, gy); state = 'walk'; }
        else { state = 'pause'; until = t + 4 + r() * 8; }
      },
      tick: (t, dt) => {
        const hide = t < shy; k = hide ? Math.max(0, k - dt * 2) : Math.min(1, k + dt * 0.25);
        head.position.z = headZ - (1 - k) * 0.22; head.rotation.x = state === 'pause' ? 0.1 * Math.sin(t * 0.8) : 0;
        if (!hide && k > 0.95 && w.step(dt)) { gy = w.base; o.rotation.z = 0.025 * Math.sin(t * 2.4); } else o.rotation.z *= 0.9;
        plant(o, fp, gy);
      },
      check: () => here(o, 'ground')(),
    });
  }

  // ---- Mouse by the compost bays, dusk and night ---------------------------------------------
  {
    const spots = [[58.4, -107.4], [60.9, -107.2], [63.7, -107.5], [65.9, -107.3], [62.2, -106.6]], den = [61.6, -109.4];
    let o, w, fp, state = 'freeze', until = 0, gone = false, safe = 0, gy = 0.03, pitch = 0;
    add({
      name: 'mouse', x: 62, z: -107.5, load: 60, live: 40, when: () => day.light < 0.45,
      init: async () => { o = await mesh('v_mouse'); fp = feet(o.geometry); gy = ground(spots[1][0], spots[1][1], 2); o.position.set(spots[1][0], gy, spots[1][1]); plant(o, fp, gy); scene.add(o); w = new Walk(o); w.base = gy; },
      show: on => { o.visible = on && !gone; },
      think: t => {
        const p = o.position, d = dist(p.x, p.z);
        if (gone) { safe = d > 11 ? safe + 0.25 : 0; if (safe > 5) { gone = false; o.visible = true; o.position.set(den[0], gy, -107.75); const s = spots[Math.floor(r() * spots.length)]; w.go([[s[0], ground(s[0], s[1], 2), s[1]]], 3.5, 0.02, 0.2, 20, gy); state = 'dart'; } return; }
        if (d < 7 && state !== 'flee') { w.go([[den[0], gy, -107.75]], 5, 0.02, 0.2, 25, gy); state = 'flee'; return; }      // into the heap at the front of the bay
        if (state === 'flee') { if (!w.busy) { gone = true; safe = 0; o.visible = false; } return; }
        if (w.busy || t < until) return;
        const k = r();
        if (k < 0.45) { const s = spots[Math.floor(r() * spots.length)]; w.go([[s[0], ground(s[0], s[1], 2), s[1]]], 3.5, 0.02, 0.2, 20, gy); state = 'dart'; }
        else if (k < 0.75) { state = 'freeze'; until = t + 1 + r() * 3; }
        else { state = 'wash'; until = t + 2 + r() * 2; }
      },
      tick: (t, dt) => {
        if (w.step(dt)) { gy = w.base; pitch = 0; o.rotation.x = 0; plant(o, fp, gy, w.lift); return; }
        pitch += ((state === 'wash' ? -0.5 : 0) - pitch) * Math.min(1, dt * 6);                  // sits up to wash, smoothly
        o.rotation.x = pitch + (state === 'wash' ? 0.04 * Math.sin(t * 18) : 0);
        plant(o, fp, gy);
      },
      check: () => ({ x: o.position.x, y: o.position.y, z: o.position.z, perch: gone ? 'den' : 'ground', hidden: gone, air: w.busy && w.lift > 0.005 }),
    });
  }

  // ---- Swallows high over the meadow, by day ------------------------------------------------------
  {
    const N = 5, uT = { value: 0 }, cx = -66, cz = -82; let inst;
    const swX = (s, ph) => cx + 28 * Math.sin(s * 0.9 + ph) + 8 * Math.sin(s * 2.3), swZ = (s, ph) => cz + 22 * Math.cos(s * 0.7 + ph) + 6 * Math.cos(s * 1.9);
    add({
      name: 'swallows', x: cx, z: cz, load: 160, live: 150, when: () => day.light > 0.55,
      init: async () => {
        const top = 0x1c2440, belly = 0xe8e0cc, red = 0x8a2a1a;
        const body = tris([[[0, 0.03, 0.12], [-0.035, 0, 0.02], [0.035, 0, 0.02]], [[0, 0.03, 0.12], [0.035, 0, 0.02], [0, 0.02, -0.1]], [[0, 0.03, 0.12], [0, 0.02, -0.1], [-0.035, 0, 0.02]],
          [[-0.035, 0, 0.02], [0, 0.02, -0.1], [0.035, 0, 0.02]]], top);
        const under = tris([[[0, -0.025, 0.11], [0.035, 0, 0.02], [-0.035, 0, 0.02]], [[0, -0.025, 0.11], [-0.035, 0, 0.02], [0, -0.01, -0.1]], [[0, -0.025, 0.11], [0, -0.01, -0.1], [0.035, 0, 0.02]]], (x, y, z) => (z > 0.07 ? red : belly));
        const wingsG = tris([[[-0.03, 0.01, 0.07], [-0.03, 0.01, -0.03], [-0.5, 0.01, -0.12]], [[-0.03, 0.01, 0.07], [-0.5, 0.01, -0.12], [-0.27, 0.01, 0.06]],
          [[0.03, 0.01, 0.07], [0.5, 0.01, -0.12], [0.03, 0.01, -0.03]], [[0.03, 0.01, 0.07], [0.27, 0.01, 0.06], [0.5, 0.01, -0.12]]], top);
        const tail = tris([[[-0.01, 0.015, -0.09], [-0.1, 0.015, -0.36], [0.0, 0.015, -0.16]], [[0.01, 0.015, -0.09], [0.0, 0.015, -0.16], [0.1, 0.015, -0.36]]], top);
        inst = new THREE.InstancedMesh(mergeGeometries([body, under, wingsG, tail]), flapping(vcMat({ side: THREE.DoubleSide }), uT, 0.7, 13, 1), N);
        inst.frustumCulled = false; inst.castShadow = false; inst.userData.creature = true; scene.add(inst);
      },
      show: on => { inst.visible = on; },
      tick: t => {
        uT.value = t;
        for (let i = 0; i < N; i++) {
          const ph = i * 1.37, a = t * 0.32 + ph * 3;
          const x = swX(a, ph), z = swZ(a, ph), y = 20 + 7 * Math.sin(a * 1.1 + ph), x1 = swX(a + 0.02, ph), z1 = swZ(a + 0.02, ph), x2 = swX(a + 0.04, ph), z2 = swZ(a + 0.04, ph);
          const h0 = Math.atan2(x1 - x, z1 - z), h1 = Math.atan2(x2 - x1, z2 - z1);
          e.set(0.15 * Math.sin(a * 1.1 + ph), h0, clamp(wrapA(h1 - h0) * -12, -0.9, 0.9), 'YXZ'); q.setFromEuler(e); pv.set(x, y, z); sv.setScalar(1);
          inst.setMatrixAt(i, m4.compose(pv, q, sv));
        }
        inst.instanceMatrix.needsUpdate = true;
      },
      check: () => ({ x: cx, y: 20, z: cz, perch: 'air' }),
    });
  }
}
