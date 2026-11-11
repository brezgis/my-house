// Shared helpers for laying out the garden: geometry through the house's
// Builder (batched by material), plus the lists every garden part fills in.

import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { Ground } from './ground.js';
import { Flora } from './flora.js';
import { rng } from './cards.js';

export const PAINT = {
  cream: 'c#ece4d0/0.75', sage: 'c#7f9077/0.7', iron: 'c#2a2926/0.45/0.7', terracotta: 'c#b8653f/0.92', terracottaOld: 'c#a8745a/0.95',
  rope: 'c#a8956c/1', canvas: 'c#ddd6c4/0.95', stripe: 'c#7d8a72/0.95', bark: 'c#4a3a2c/1', stone: 'c#9a948a/0.95', stoneDark: 'c#6d675e/0.95',
  slate: 'c#57595a/0.8', white: 'c#f1efe8/0.6', hive1: 'c#efe6cf/0.7', hive2: 'c#a9c2bb/0.7', hive3: 'c#e6bfa6/0.7', hive4: 'c#d9cf86/0.7',
  wire: 'c#1d1b19/0.6', sand: 'c#d9c79f/1', cedar: 'c#8d806e/0.9', blackPaint: 'c#1f2421/0.5', brass: 'c#b08d4a/0.35/1', moss: 'c#5d6b3a/1',
  boxwood: 'c#3f5a2e/1', sweater: 'c#8c3b2e/1', straw: 'c#cfae62/1', denim: 'c#3f5470/1',
};
export const GLOW = 'e#ffd49a/2.4';             // string lights, lanterns: dimmed by day in setup()
export const GLOW_WARM = 'e#ffb866/2.2';

// Plain painted things (every 'c#rrggbb' colour that is not metal) share one
// vertex-coloured material, split by region, instead of a draw call per colour.
export class Paint {
  constructor(region = 120) { this.region = region; this.parts = new Map(); }
  add(name, g) {
    const m = /^c#([0-9a-f]{6})/i.exec(name), col = new THREE.Color(parseInt(m[1], 16)).multiplyScalar(0.78);
    let q = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(q.attributes)) if (!['position', 'normal'].includes(k)) q.deleteAttribute(k);
    if (!q.attributes.normal) q.computeVertexNormals();
    const n = q.attributes.position.count, c = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; }
    q.setAttribute('color', new THREE.BufferAttribute(c, 3));
    q.computeBoundingBox(); const ctr = q.boundingBox.getCenter(new THREE.Vector3());
    const key = Math.floor(ctr.x / this.region) + ',' + Math.floor(ctr.z / this.region);
    if (!this.parts.has(key)) this.parts.set(key, []);
    this.parts.get(key).push(q);
  }
  build(scene, mergeGeometries) {
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.78, envMapIntensity: 0.7 });
    for (const list of this.parts.values()) { const m = new THREE.Mesh(mergeGeometries(list), mat); m.castShadow = m.receiveShadow = true; m.name = 'garden paint'; scene.add(m); }
  }
}
const isPaint = name => /^c#[0-9a-f]{6}(\/[\d.]+)?(\/0?\.?[0-4]\d*)?$/i.test(name) && !/\/[\d.]+\/(0\.[5-9]|1)/.test(name);

export function makeKit(B, items, TREES) {
  const r = rng(4711);
  const P = new Paint();
  const put = (mat, g) => (isPaint(mat) ? P.add(mat, g) : B.mesh(mat, g));
  const K = {
    P, put,
    B, G: new Ground(), F: new Flora(1234), r, trees: TREES,
    models: items.models, seats: items.seats, lamps: items.lamps,
    surfaces: [], setups: [], hives: [], interact: [],
    pick: a => a[Math.floor(r() * a.length)],
    model: (id, x, z, rotY = 0, o = {}) => items.models.push({ id, x, y: o.y ?? 0, z, rotY, outdoor: true, ...o }),
    seat: (x, y, z, yaw, label = 'sit') => items.seats.push({ x, y: y + 2.45, z, yaw, label }),
    lamp: (x, y, z, power = 0.4, kind = 'lamp') => items.lamps.push({ x, y, z, power, kind }),
    collide: (x0, x1, z0, z1, y1 = 4, y0 = 0) => B.colliders.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), y0, y1 }),
    surface: (x0, x1, z0, z1, h, h2) => K.surfaces.push(h2 === undefined ? { x0, x1, z0, z1, h } : { x0, x1, z0, z1, h, h2, ramp: true }),
    box(mat, x0, x1, y0, y1, z0, z1, o) {
      if (!isPaint(mat)) return B.wbox(mat, x0, x1, y0, y1, z0, z1, o);
      const g = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0));
      if (o?.rot) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...o.rot)));
      g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); P.add(mat, g);
      if (o?.collide) B.colliders.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), y0: Math.min(y0, y1), y1: Math.max(y0, y1), z0: Math.min(z0, z1), z1: Math.max(z0, z1) });
    },
    cyl(mat, x, y0, y1, z, r0, r1 = r0, seg = 12) { const g = new THREE.CylinderGeometry(r1, r0, y1 - y0, seg); g.translate(x, (y0 + y1) / 2, z); put(mat, g); },
    // A round rod between two points
    tube(mat, a, b, rad, seg = 6) {
      const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), d = new THREE.Vector3().subVectors(Bv, A), len = d.length();
      const g = new THREE.CylinderGeometry(rad, rad, len, seg, 1, true); g.translate(0, len / 2, 0);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(A.x, A.y, A.z);
      put(mat, g);
    },
    // A square timber between two points (rafters, braces, A-frames)
    beam(mat, a, b, w, h = w) {
      const A = new THREE.Vector3(...a), Bv = new THREE.Vector3(...b), d = new THREE.Vector3().subVectors(Bv, A), len = d.length();
      const g = new THREE.BoxGeometry(w, len, h).toNonIndexed(); g.translate(0, len / 2, 0);
      const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w, uv.getY(i) * len);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
      g.applyQuaternion(q); g.translate(A.x, A.y, A.z); put(mat, g);
    },
    // Turned shapes: profile [[radius, height], ...] from the bottom up
    lathe(mat, x, y, z, profile, seg = 16, s = 1) {
      const g = new THREE.LatheGeometry(profile.map(([pr, py]) => new THREE.Vector2(pr * s, py * s)), seg);
      g.translate(x, y, z); put(mat, g);
    },
    sphere(mat, x, y, z, rad, sy = 1, detail = 1, sx = 1, sz = 1) { const g = new THREE.IcosahedronGeometry(rad, detail); g.scale(sx, sy, sz); g.translate(x, y, z); put(mat, g); },
    // A rough stone: a squashed, dented ball
    rock(mat, x, y, z, sx, sy, sz, rot = r() * 6.28, detail = 2) {
      let g = new THREE.IcosahedronGeometry(1, detail); g.deleteAttribute('uv'); g.deleteAttribute('normal'); g = mergeVertices(g);
      const p = g.attributes.position, rr = rng(Math.round(x * 97 + z * 61 + sy * 13)), ph = [rr() * 6, rr() * 6, rr() * 6];
      for (let i = 0; i < p.count; i++) {
        const px = p.getX(i), py = p.getY(i), pz = p.getZ(i);
        const k = 0.86 + 0.1 * Math.sin(px * 2.3 + ph[0]) * Math.cos(pz * 2.1 + ph[1]) + 0.07 * Math.sin(py * 3.7 + px * 1.3 + ph[2]) + 0.03 * Math.sin(px * 9 + pz * 7);
        p.setXYZ(i, px * k, Math.max(-0.35, py) * k, pz * k);
      }
      g.scale(sx, sy, sz); g.rotateY(rot); g.translate(x, y, z); g.computeVertexNormals(); g = g.toNonIndexed();
      if (mat === PAINT.stone || mat === PAINT.stoneDark || mat === PAINT.moss) K.G.mesh(mat === PAINT.stone ? 'rock' : mat === PAINT.moss ? 'rockMoss' : 'rockDark', g); else put(mat, g);
    },
    // A terracotta pot, with the plants in it. Returns the height of its rim.
    pot(x, y, z, size = 1, plants = [], o = {}) {
      const mat = o.mat ?? (r() < 0.5 ? PAINT.terracotta : PAINT.terracottaOld), s = size;
      K.lathe(mat, x, y, z, [[0.01, 0], [0.62, 0], [0.7, 0.08], [0.86, 1.0], [0.96, 1.04], [0.97, 1.2], [0.88, 1.22], [0.84, 1.1]], 18, s);
      K.cyl('soil', x, y + 1.0 * s, y + 1.06 * s, z, 0.82 * s, 0.84 * s, 14);
      const top = y + 1.06 * s;
      for (const [kind, k = 1, dx = 0, dz = 0] of plants) K.F.add(kind, x + dx * s, z + dz * s, k * s, { y: top - 0.05 });
      if (o.collide !== false && s > 0.9) K.collide(x - 0.8 * s, x + 0.8 * s, z - 0.8 * s, z + 0.8 * s, 3, y);
      return top;
    },
  };
  return K;
}
