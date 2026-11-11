// Foliage cards. Every leafy thing outdoors (shrubs, perennials, vegetables,
// tree crowns) is drawn as small alpha-tested quads that show one cell of a
// painted atlas. Each instance carries its own atlas cell (aCell: u0, v0, du,
// dv), so one InstancedMesh can hold many species, and the whole garden costs
// a handful of draw calls. The vertex shader adds a gentle breeze.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const wind = { value: 0 };          // seconds; advanced by the garden's setup()

export function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// Patch a material so it reads its atlas cell per instance, sways, and is lit
// the same on both faces (cards are lit as if they faced the sky).
function patch(mat, sway) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uWind = wind;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 aCell;\nuniform float uWind;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv = aCell.xy + uv * aCell.zw;\n#endif')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
#ifdef USE_INSTANCING
{
  vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
  float ph = ip.x * 0.21 + ip.z * 0.17;
  float swell = 0.35 + 0.65 * smoothstep(0.55, 1.0, sin(uWind * 0.11 + ph * 0.03));   // an occasional gentle stir
  float k = ${(sway * 0.25).toFixed(4)} * uv.y * uv.y * swell;
  transformed.x += k * (sin(uWind * 0.55 + ph) + 0.3 * sin(uWind * 1.2 + ph * 2.0));
  transformed.z += k * 0.6 * cos(uWind * 0.45 + ph * 1.3);
}
#endif`);
    if (sh.fragmentShader.includes('gl_FrontFacing ? 1.0 : - 1.0')) sh.fragmentShader = sh.fragmentShader.replace('gl_FrontFacing ? 1.0 : - 1.0', '1.0');
  };
  mat.customProgramCacheKey = () => 'card2' + sway;
  return mat;
}

export function cardMaterials(map, { sway = 0.08, roughness = 0.85, env = 0.6, alphaTest = 0.5 } = {}) {
  const material = patch(new THREE.MeshStandardMaterial({ map, alphaTest, side: THREE.DoubleSide, roughness, metalness: 0, envMapIntensity: env }), sway);
  const depth = patch(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest }), sway);
  return { material, depth };
}

// ---- Card shapes, all of unit size ---------------------------------------------------
const up = new THREE.Vector3(0, 1, 0);
function soften(g, k = 0.75) {                       // bend normals toward the sky
  const n = g.attributes.normal, v = new THREE.Vector3();
  for (let i = 0; i < n.count; i++) { v.fromBufferAttribute(n, i).lerp(up, k).normalize(); n.setXYZ(i, v.x, v.y, v.z); }
  return g;
}
// Upright quads crossed like a star, standing on y = 0.
export function crossGeo(n = 3) {
  const qs = [];
  for (let i = 0; i < n; i++) { const q = new THREE.PlaneGeometry(1, 1); q.translate(0, 0.5, 0); q.rotateY((i * Math.PI) / n); qs.push(q); }
  return soften(mergeGeometries(qs), 0.7);
}
// Quads tilted out from a centre, like the leaves of a lettuce: each quad's base at the origin.
export function rosetteGeo(n = 6, tilt = 0.75) {
  const qs = [];
  for (let i = 0; i < n; i++) {
    const q = new THREE.PlaneGeometry(0.62, 1); q.translate(0, 0.5, 0); q.rotateX(-(Math.PI / 2 - tilt) * (0.85 + 0.3 * ((i * 7) % 3) / 2));
    q.rotateY((i / n) * Math.PI * 2 + (i % 2) * 0.3); qs.push(q);
  }
  // an upright heart in the middle
  const h = new THREE.PlaneGeometry(0.5, 0.7); h.translate(0, 0.35, 0); h.rotateX(-0.3); qs.push(h);
  const h2 = h.clone(); h2.rotateY(Math.PI * 0.6); qs.push(h2);
  return soften(mergeGeometries(qs), 0.55);
}
// One flat quad lying on the ground (lily pads, ground covers).
export function flatGeo() { const q = new THREE.PlaneGeometry(1, 1); q.rotateX(-Math.PI / 2); return q; }
// Three quads crossed in all directions around a centre (tree tufts, shrub masses).
export function starGeo() {
  const qs = [0, 1, 2].map(i => { const q = new THREE.PlaneGeometry(1, 1); q.rotateX(-Math.PI / 2 + (i - 1) * 0.9); q.rotateY((i * Math.PI) / 3); return q; });
  const g = mergeGeometries(qs), n = g.attributes.normal;
  for (let i = 0; i < n.count; i++) n.setXYZ(i, 0, 1, 0);
  return g;
}

// ---- A set of instances, split by region so distant parts can be culled -------------------
export class CardSet {
  constructor({ region = 120 } = {}) { this.region = region; this.items = new Map(); }
  // cell: [u0, v0, du, dv] in atlas UV; m: Matrix4; c: Color
  push(shape, cell, m, c) {
    const key = shape + '|' + Math.floor(m.elements[12] / this.region) + '|' + Math.floor(m.elements[14] / this.region);
    if (!this.items.has(key)) this.items.set(key, { shape, list: [] });
    this.items.get(key).list.push({ cell, m: m.clone(), c: c.clone() });
  }
  build(scene, shapes, mats, { shadow = true } = {}) {
    const meshes = [];
    for (const { shape, list } of this.items.values()) {
      const geo = shapes[shape].clone();
      const cells = new Float32Array(list.length * 4);
      list.forEach((it, i) => cells.set(it.cell, i * 4));
      geo.setAttribute('aCell', new THREE.InstancedBufferAttribute(cells, 4));
      const mesh = new THREE.InstancedMesh(geo, mats.material, list.length);
      list.forEach((it, i) => { mesh.setMatrixAt(i, it.m); mesh.setColorAt(i, it.c); });
      mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      mesh.computeBoundingSphere();
      mesh.castShadow = shadow; mesh.receiveShadow = true; mesh.customDepthMaterial = mats.depth;
      scene.add(mesh); meshes.push(mesh);
    }
    return meshes;
  }
  get count() { let n = 0; for (const v of this.items.values()) n += v.list.length; return n; }
}

// Helpers for composing instance matrices
const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
export function place(m, x, y, z, sx, sy, sz, ry = 0, rx = 0, rz = 0) {
  _e.set(rx, ry, rz, 'YXZ'); _q.setFromEuler(_e); _s.set(sx, sy, sz); _p.set(x, y, z);
  return m.compose(_p, _q, _s);
}

// Turn a painted atlas canvas into a texture. Transparent pixels take the
// average colour of their cell, so leaves do not get dark fringes as the
// texture shrinks with distance. rects: [[x, y, w, h], ...] in pixels.
export function atlasTexture(c, rects) {
  const w = c.width, h = c.height, src = c.getContext('2d').getImageData(0, 0, w, h).data;
  const out = new Uint8Array(w * h * 4);
  for (const [x0, y0, cw, ch] of rects) {
    let r = 0, g = 0, b = 0, n = 0;
    for (let y = y0; y < y0 + ch; y += 2) for (let x = x0; x < x0 + cw; x += 2) { const i = (y * w + x) * 4; if (src[i + 3] > 128) { r += src[i]; g += src[i + 1]; b += src[i + 2]; n++; } }
    if (n) { r /= n; g /= n; b /= n; }
    for (let y = y0; y < y0 + ch; y++) for (let x = x0; x < x0 + cw; x++) {
      const i = (y * w + x) * 4, o = ((h - 1 - y) * w + x) * 4, a = src[i + 3];
      if (a > 8) { out[o] = src[i]; out[o + 1] = src[i + 1]; out[o + 2] = src[i + 2]; out[o + 3] = a; }
      else { out[o] = r; out[o + 1] = g; out[o + 2] = b; out[o + 3] = 0; }
    }
  }
  const t = new THREE.DataTexture(out, w, h, THREE.RGBAFormat);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
  t.needsUpdate = true;
  return t;
}
// Atlas UV of a pixel rect (v measured from the bottom, as the texture is stored flipped)
export function cellUV(W, H, [x, y, w, h], inset = 2) {
  return [(x + inset) / W, (H - y - h + inset) / H, (w - 2 * inset) / W, (h - 2 * inset) / H];
}
