// Shade: soft dark patches on the floor under and around the furniture, indoors.
//
// The lamps cast no shadows and the room light is flat (lighting.js), so without these the
// furniture floats and the floor under a bed or a tub is as bright as the open floor. Each
// piece standing on a floor gets a soft rounded rectangle a little larger than its footprint,
// darkest underneath and fading out over a few inches to a foot (more for taller pieces). They
// are all one instanced draw, multiplied over what is already on screen, clipped to the room
// the piece stands in so that none shows through a wall, and are faint by day and deeper by
// lamplight. At night each patch also leans away from the lit lamps nearby, weighted by how
// bright each of the four pool lights is: as a light fades in or out the patches drift, so a
// change of lamps never makes them jump.
//
// Footprints come from what is already known: the colliders (kit furniture and models that
// block the way), and the bounding boxes of the furniture models as they arrive. The list is
// rebuilt when either grows, which stops once everything has loaded.

import * as THREE from 'three';
import { HL } from './lighting.js';

const OUTSIDE = new Set(['Terrace', 'Front porch']);
const LIFT = 0.055;                  // above the floor: over the rugs (kit.js lays them at +0.035)

export function makeShade({ scene, rooms, colliders, lampPool, camera }) {
  const N = 600;
  const geo = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(2, 2));
  const aRect = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4);   // centre x, z; half sizes
  const aInfo = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4);   // floor y, height, strength, spread
  const aClip = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4);   // the room: x0, x1, z0, z1
  geo.setAttribute('aRect', aRect); geo.setAttribute('aInfo', aInfo); geo.setAttribute('aClip', aClip);
  geo.instanceCount = 0;
  const uK = { value: 0 }, uLean = { value: 0 };
  const uL = { value: Array.from({ length: 4 }, () => new THREE.Vector4()) };      // pool lights: xyz, weight
  const mat = new THREE.ShaderMaterial({
    uniforms: { uK, uL, uLean },
    transparent: true, depthWrite: false, fog: false,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.ZeroFactor, blendDst: THREE.SrcColorFactor,
    blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4,
    vertexShader: `
attribute vec4 aRect, aInfo, aClip;
uniform vec4 uL[4];
uniform float uLean;
varying vec2 vP, vHalf;
varying vec4 vClip;
varying float vStr, vIn, vSpread;
void main() {
  vec2 c = aRect.xy, half_ = aRect.zw;
  float h = aInfo.y;
  // lean away from the lit lamps: a taller thing, a lamp further off and lower, a longer shadow
  vec2 off = vec2(0.0);
  for (int i = 0; i < 4; i++) {
    vec2 v = c - uL[i].xz;
    float d = length(v);
    if (d < 0.01 || uL[i].w <= 0.0) continue;
    float up = max(uL[i].y - aInfo.x - h * 0.6, 0.6);
    off += v / d * uL[i].w * min(h * 0.6 * d / up, 1.2) / (1.0 + d * d / 160.0);
  }
  float lo = length(off); if (lo > 1.0) off /= lo;
  off *= uLean * min(min(half_.x, half_.y) + 0.4, 1.0);
  vSpread = aInfo.w;
  vec2 grow = half_ + vSpread + abs(off);
  vec2 p = c + vec2(position.x, -position.y) * grow;      // the plane's y runs to -z, so that it faces up
  vP = p - c - off * 0.5; vHalf = half_ + abs(off) * 0.5;
  vStr = aInfo.z; vIn = min(min(half_.x, half_.y) * 0.7, 0.6);
  gl_Position = projectionMatrix * viewMatrix * vec4(p.x, aInfo.x, p.y, 1.0);
  // the room's sides, as distances from this corner (linear, so they interpolate exactly)
  vClip = vec4(aClip.x - p.x, aClip.y - p.x, aClip.z - p.y, aClip.w - p.y);
}`,
    fragmentShader: `
uniform float uK;
varying vec2 vP, vHalf;
varying vec4 vClip;
varying float vStr, vIn, vSpread;
void main() {
  // the room: x0 < x < x1 and z0 < z < z1, with x and z interpolated as offsets from the vertex
  if (vClip.x > 0.0 || vClip.y < 0.0 || vClip.z > 0.0 || vClip.w < 0.0) discard;
  float r = min(min(vHalf.x, vHalf.y), 0.5);
  vec2 q = abs(vP) - vHalf + r;
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;      // rounded box: < 0 under the piece
  float t = clamp((d + vIn) / (vIn + vSpread), 0.0, 1.0);
  float a = (1.0 - t); a = a * a * (3.0 - 2.0 * a) * 0.55 + a * a * 0.45;
  gl_FragColor = vec4(vec3(1.0 - a * vStr * uK), 1.0);
}`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false; mesh.renderOrder = 0; mesh.name = 'floor shade'; mesh.userData.cat = 'floor shade';
  scene.add(mesh);

  const roomAt = (x, y, z) => rooms.find(r => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1 && y >= r.y0 && y <= r.y1);
  // a footprint standing on an indoor floor, or null
  function foot(x0, x1, z0, z1, y0, y1) {
    const w = x1 - x0, l = z1 - z0, h = y1 - y0;
    if (!(Math.min(w, l) >= 0.45 && Math.max(w, l) <= 14 && h >= 0.5 && h <= 7.8)) return null;
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, r = roomAt(cx, y0 + 0.5, cz);
    if (!r || OUTSIDE.has(r.name)) return null;
    const floor = r.y0 + 1;
    if (Math.abs(y0 - floor) > 0.3) return null;                  // hung, or on a shelf
    return { x0, x1, z0, z1, h, floor, r };
  }
  const box = new THREE.Box3();
  let seenC = -1, seenM = -1, list = [], shelves = [];
  const slots = Array.from({ length: 6 }, () => ({ s: null, w: 0 }));
  function models() { return scene.children.filter(o => o.userData.cat?.startsWith?.('model:')); }
  function rebuild(ms) {
    const got = [];
    const add = f => {
      if (!f) return;
      const a = (f.x1 - f.x0) * (f.z1 - f.z0);
      for (const g of got) {                                       // the same piece twice (a model and its collider)
        const ox = Math.min(f.x1, g.x1) - Math.max(f.x0, g.x0), oz = Math.min(f.z1, g.z1) - Math.max(f.z0, g.z0);
        if (ox > 0 && oz > 0 && ox * oz > 0.7 * Math.min(a, (g.x1 - g.x0) * (g.z1 - g.z0)) && Math.abs(f.floor - g.floor) < 0.5) return;
      }
      got.push(f);
    };
    for (const o of ms) { box.setFromObject(o); add(foot(box.min.x, box.max.x, box.min.z, box.max.z, box.min.y, box.max.y)); }
    for (const c of colliders) add(foot(c.x0, c.x1, c.z0, c.z1, c.y0, c.y1));
    list = got.slice(0, N);
    // open shelves (bookcases and the like: tall, a foot or so deep), for the shade inside them
    shelves = got.filter(f => f.h >= 4 && Math.min(f.x1 - f.x0, f.z1 - f.z0) >= 0.7 && Math.min(f.x1 - f.x0, f.z1 - f.z0) <= 2 && Math.max(f.x1 - f.x0, f.z1 - f.z0) >= 1.8).map(f => {
      const alongZ = f.x1 - f.x0 < f.z1 - f.z0, r = f.r, k = 0.07;
      // the open side faces the room, away from the wall it stands against
      const side = alongZ ? (r.x1 - f.x1 > f.x0 - r.x0 ? 0 : 1) : (r.z1 - f.z1 > f.z0 - r.z0 ? 2 : 3);
      const b = [f.x0 + k, f.z0 + k, f.x1 - k, f.z1 - k];
      if (side === 0) b[2] = f.x1; if (side === 1) b[0] = f.x0; if (side === 2) b[3] = f.z1; if (side === 3) b[1] = f.z0;
      return { b, y0: f.floor + 0.15, y1: f.floor + f.h - 0.1, side, x: (f.x0 + f.x1) / 2, y: f.floor + 3, z: (f.z0 + f.z1) / 2 };
    });
    list.forEach((f, i) => {
      const hx = (f.x1 - f.x0) / 2, hz = (f.z1 - f.z0) / 2;
      aRect.setXYZW(i, (f.x0 + f.x1) / 2, (f.z0 + f.z1) / 2, hx, hz);
      const spread = THREE.MathUtils.clamp(0.3 + 0.12 * f.h, 0.35, 0.85);
      const str = THREE.MathUtils.clamp(0.6 + 0.12 * f.h, 0.65, 0.95);
      aInfo.setXYZW(i, f.floor + LIFT, f.h, str, spread);
      aClip.setXYZW(i, f.r.x0, f.r.x1, f.r.z0, f.r.z1);
    });
    geo.instanceCount = list.length;
    aRect.needsUpdate = aInfo.needsUpdate = aClip.needsUpdate = true;
  }
  let wait = 0;
  return {
    mesh,
    get count() { return list.length; },
    get shelves() { return shelves; },
    // on: how far the lamps are on (lighting.js lampOn); dt for the occasional recount
    update(on, dt = 0.016) {
      wait -= dt;
      if (wait <= 0) {
        wait = 1;
        const ms = models();
        if (ms.length !== seenM || colliders.length !== seenC) { seenM = ms.length; seenC = colliders.length; rebuild(ms); }
      }
      uK.value = THREE.MathUtils.lerp(0.35, 0.65, on);
      uLean.value = on;
      // the corner shade in every material's light (lighting.js): full on the room light, part on the lamps
      HL.sh.x = THREE.MathUtils.lerp(0.8, 1, on); HL.sh.y = THREE.MathUtils.lerp(0.4, 0.75, on);
      // the six shelves nearest the eye are shaded inside; one leaving fades out before another takes its place
      if (camera) {
        const e = camera.position, d = s => Math.hypot(s.x - e.x, s.z - e.z) + Math.abs(s.y - e.y) * 3;
        const near = shelves.filter(s => d(s) < 45).sort((a, b) => d(a) - d(b)).slice(0, 6);
        slots.forEach((o, i) => {
          const want = o.s && near.includes(o.s);
          o.w += ((want ? 1 : 0) - o.w) * Math.min(1, dt * 1.5);
          if (!want && o.w < 0.02) { o.s = near.find(s => !slots.some(q => q.s === s)) ?? null; o.w = 0; }
          const c = HL.cav, j = i * 8;
          if (o.s) { c.set(o.s.b, j); c[j + 4] = o.s.y0; c[j + 5] = o.s.y1; c[j + 6] = o.s.side; c[j + 7] = o.w; } else c[j + 7] = 0;
        });
      }
      const pool = lampPool?.pool ?? [];
      for (let i = 0; i < 4; i++) {
        const s = pool[i], v = uL.value[i];
        if (!s || !s.light.intensity) { v.w = 0; continue; }
        const p = s.light.position, I = s.light.intensity;
        v.set(p.x, p.y, p.z, I / (I + 12));
      }
    },
  };
}
