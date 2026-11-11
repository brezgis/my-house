// The water of the koi pond: the surface, and what makes things under it look
// under water.
//
// The pond is really dug: its bottom lies up to 3.4 ft below the lawn. The
// lawn itself is one unbroken sheet (main.js draws it), so everything below
// the surface is drawn with a small trick instead of a hole: sink() patches a
// material so that a fragment below the water is thrown away unless the line
// from the eye to it passes down through the pond's mouth, and is then given a
// depth just above the lawn (squashed into a thin slab, deeper things further
// back, so fish, stones and bottom still hide one another correctly). Nothing
// is rendered twice and there is no extra pass.
//
// Seen through water, things lose their red first and fade to a green murk
// with depth (sink() again); the sun throws moving caustics on them. The
// surface is one transparent sheet that mirrors the sky more the lower you
// look (fresnel), carries two layers of slow ripples, the rings fish make
// when they rise, and the trees of the far bank standing dark in it.

import * as THREE from 'three';
import { POND, rim, depthAtS } from './pond_shape.js';
import { rng } from './koi_school.js';

export const NRINGS = 12, NFISH = 20;
const SLAB = 0.09;                          // the squashed water sits between this height and the surface (the lawn is at 0.03)

// One small texture for everything: R,G ripple slope, B caustic light, A pebbles. It tiles.
function pondTexture(N = 256) {
  const r = rng(77), data = new Uint8Array(N * N * 4);
  const waves = []; for (let i = 0; i < 16; i++) { const k = 2 + Math.floor(r() * 7), a = r() * Math.PI * 2; waves.push([Math.round(Math.cos(a) * k), Math.round(Math.sin(a) * k), r() * 6.28, 1 / (1 + k * 0.6)]); }
  const cells = (M, seed) => { const q = rng(seed), p = []; for (let i = 0; i < M * M; i++) p.push(q(), q(), q()); return p; };
  const worley = (p, M, u, v) => {            // nearest and second nearest feature point, wrapping
    const cx = Math.floor(u * M), cy = Math.floor(v * M); let f1 = 9, f2 = 9, id = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const gx = cx + i, gy = cy + j, k = (((gy % M) + M) % M) * M + (((gx % M) + M) % M), dx = gx + p[k * 3] - u * M, dy = gy + p[k * 3 + 1] - v * M, d = Math.hypot(dx, dy);
      if (d < f1) { f2 = f1; f1 = d; id = p[k * 3 + 2]; } else if (d < f2) f2 = d;
    }
    return [f1, f2, id];
  };
  const ca = cells(5, 3), cb = cells(9, 4), pe = cells(22, 5);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N, o = (y * N + x) * 4;
    let gx = 0, gy = 0;
    for (const [kx, ky, ph, am] of waves) { const c = Math.cos((kx * u + ky * v) * Math.PI * 2 + ph) * am; gx += c * kx; gy += c * ky; }
    data[o] = Math.max(0, Math.min(255, 128 + gx * 9)); data[o + 1] = Math.max(0, Math.min(255, 128 + gy * 9));
    const wu = u + 0.02 * Math.sin(v * Math.PI * 4), wv = v + 0.02 * Math.sin(u * Math.PI * 6);
    const [a1, a2] = worley(ca, 5, wu, wv), [b1, b2] = worley(cb, 9, wu, wv);
    const line = (f1, f2, w) => { const e = Math.max(0, 1 - (f2 - f1) / w); return e * e; };
    data[o + 2] = Math.min(255, 255 * (0.75 * line(a1, a2, 0.22) + 0.4 * line(b1, b2, 0.3)));
    const [p1, p2, id] = worley(pe, 22, u, v);
    data[o + 3] = 255 * Math.min(1, (0.45 + 0.55 * id) * Math.min(1, (p2 - p1) * 3.2 + 0.25));
  }
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.anisotropy = 4; t.needsUpdate = true;
  return t;
}

// Uniforms shared by the water, the basin and the fish; pond.js keeps them up to date.
export const U = {
  uT: { value: 0 }, uPondTex: { value: null },
  uPond: { value: new THREE.Vector4(POND.x, POND.z, POND.rx, POND.rz) },
  uSurf: { value: new THREE.Vector2(POND.y, (POND.y - SLAB) / (POND.deep + 0.6)) },      // surface height, and how hard the depths are squashed
  uMurk: { value: new THREE.Color(0.02, 0.04, 0.03) },          // the colour deep water goes
  uCaus: { value: 0 },                                         // strength of the caustics (the sun)
  uSunSlope: { value: new THREE.Vector2() },                   // how far a shadow slides per foot of depth
  uBank: { value: new THREE.Color(0.03, 0.05, 0.03) },          // the far bank and trees, mirrored at a low angle
  uRings: { value: new Float32Array(NRINGS * 4).fill(-1000) },
  uSpout: { value: new THREE.Vector3(0, 0, 0) },
  uFishA: { value: new Float32Array(NFISH * 4) }, uFishB: { value: new Float32Array(NFISH * 4) }, uShade: { value: 0 },
};
export function pondTex() { return (U.uPondTex.value ??= pondTexture()); }

const HEAD_V = `
varying vec3 vPW; varying vec2 vPJ; varying float vDeep; uniform vec2 uSurf;`;
const HEAD_F = `
varying vec3 vPW; varying vec2 vPJ; varying float vDeep;
uniform float uT, uCaus; uniform sampler2D uPondTex; uniform vec4 uPond; uniform vec2 uSurf; uniform vec3 uMurk;
float pondCaustic(vec2 p) {
  float a = texture2D(uPondTex, p * 0.15 + uT * vec2(0.013, 0.007)).b, b = texture2D(uPondTex, p * 0.11 - uT * vec2(0.008, 0.014) + 0.31).b;
  return min(a, b) * 2.2 + a * b;
}`;
// Patch a MeshStandardMaterial's shader (inside its onBeforeCompile) so that it sits properly in the pond.
// caustics: how strongly the dancing light shows on it.
export function sink(sh, { caustics = 1 } = {}) {
  for (const k of ['uT', 'uCaus', 'uPondTex', 'uPond', 'uSurf', 'uMurk']) sh.uniforms[k] = U[k];
  pondTex();
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>' + HEAD_V)
    .replace('#include <project_vertex>', `#include <project_vertex>
  { vec4 pw = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    pw = instanceMatrix * pw;
  #endif
    vPW = (modelMatrix * pw).xyz; vPJ = vec2(projectionMatrix[2][2], projectionMatrix[3][2]);
    vDeep = uSurf.x - vPW.y;                 // true depth under the surface
    if (vDeep > 0.0) {                       // water bends the light: what lies under it is seen higher than it is, the more so the lower you look
      vec2 hv = vPW.xz - cameraPosition.xz; float hh = max(cameraPosition.y - uSurf.x, 0.05), hd = length(hv), si = hd / sqrt(hd * hd + hh * hh) / 1.33;
      vPW.y = uSurf.x - vDeep * (hd > 0.01 ? si / sqrt(1.0 - si * si) * hh / hd : 0.752);
      mvPosition = viewMatrix * vec4(vPW, 1.0); gl_Position = projectionMatrix * mvPosition;
    } }`);
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>' + HEAD_F)
    .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
  float pdUnder = uSurf.x - vPW.y;
  if (pdUnder > 0.0) {
    vec3 ray = vPW - cameraPosition;
    if (ray.y > -1e-4) discard;
    vec2 q = (cameraPosition.xz + ray.xz * ((uSurf.x - cameraPosition.y) / ray.y) - uPond.xy) / uPond.zw;
    float qa = atan(q.y, q.x);
    if (length(q) > (1.0 + 0.09 * sin(qa * 2.0 + 0.7) + 0.06 * sin(qa * 3.0 + 2.1) + 0.04 * sin(qa * 5.0 + 0.3)) * 1.004) discard;      // not seen through the pond's mouth
    float vz = -vViewPosition.z * ((uSurf.x - pdUnder * uSurf.y - cameraPosition.y) / ray.y);
    gl_FragDepth = (vPJ.x * vz + vPJ.y) / (-vz) * 0.5 + 0.5;
  } else gl_FragDepth = gl_FragCoord.z;`)
    .replace('#include <opaque_fragment>', `if (pdUnder > 0.0) {
    vec3 toEye = normalize(cameraPosition - vPW);
    float lit = 1.0 + uCaus * ${caustics.toFixed(2)} * (pondCaustic(vPW.xz) - 0.35) * smoothstep(0.0, 0.5, vDeep);
    vec3 tr = exp(-vDeep * (0.75 + 1.0 / max(toEye.y, 0.22)) * vec3(0.30, 0.17, 0.23));
    outgoingLight = outgoingLight * max(lit, 0.4) * tr + uMurk * (1.0 - tr.g);
  }
  #include <opaque_fragment>`);
}

// ---- The basin: bottom, shelf and bank in one sheet (pond.js adds stones, piles, lilies and plants to it) ----
// Returns { pos, col, aux } arrays to which more can be appended; aux = [pebbles 0..1, sway (feet of travel at this vertex)].
export function basinSheet() {
  const P = POND, SEG = 80, rings = [0, 0.2, 0.4, 0.56, 0.64, 0.72, 0.8, 0.88, 0.93, 0.97, 1.0, 1.035, 1.1, 1.24];
  const yOf = s => (s <= 1 ? P.y - depthAtS(s) : s <= 1.035 ? P.y + 0.16 * (s - 1) / 0.035 : s <= 1.1 ? P.y + 0.16 - 0.04 * (s - 1.035) / 0.065 : -0.1);
  const mud = [0.07, 0.072, 0.055], gravel = [0.33, 0.3, 0.25], moss = [0.1, 0.12, 0.05], turf = [0.06, 0.11, 0.03], earth = [0.19, 0.16, 0.11];
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * Math.max(0, Math.min(1, t)));
  const cOf = s => (s < 0.6 ? mud : s < 0.9 ? mix(mud, gravel, (s - 0.6) / 0.3) : s <= 1.0 ? gravel : s < 1.04 ? mix(gravel, earth, (s - 1) / 0.03) : s < 1.11 ? mix(earth, moss, (s - 1.04) / 0.05) : mix(moss, turf, (s - 1.1) / 0.1));
  const pos = [], col = [], aux = [];
  const vert = (i, k) => { const a = (i / SEG) * Math.PI * 2, s = rings[k], f = rim(a) * s; return [P.x + Math.cos(a) * P.rx * f, yOf(s), P.z + Math.sin(a) * P.rz * f]; };
  for (let k = 0; k < rings.length - 1; k++) for (let i = 0; i < SEG; i++) {
    const a = vert(i, k), b = vert(i + 1, k), c = vert(i + 1, k + 1), d = vert(i, k + 1), ca = cOf(rings[k]), cc = cOf(rings[k + 1]);
    const pa = rings[k] <= 1.04 ? 1 : 0.8, pc = rings[k + 1] <= 1.04 ? 1 : 0.8;
    if (k > 0) { pos.push(...a, ...c, ...b); col.push(...ca, ...cc, ...ca); aux.push(pa, 0, pc, 0, pa, 0); }
    pos.push(...a, ...d, ...c); col.push(...ca, ...cc, ...cc); aux.push(pa, 0, pc, 0, pc, 0);
  }
  return { pos, col, aux };
}

export function basinMesh({ pos, col, aux }) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aAux', new THREE.Float32BufferAttribute(aux, 2));
  g.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, envMapIntensity: 0.55, side: THREE.DoubleSide });
  mat.onBeforeCompile = sh => {
    for (const k of ['uFishA', 'uFishB', 'uShade', 'uSunSlope']) sh.uniforms[k] = U[k];
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aAux; varying float vPeb; uniform float uT;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
  vPeb = aAux.x;
  { float ph = position.x * 0.31 + position.z * 0.23, sw = 0.4 + 0.6 * smoothstep(0.5, 1.0, sin(uT * 0.11 + ph * 0.05));       // leaves only gently stir
    transformed.x += aAux.y * sw * (sin(uT * 0.55 + ph) + 0.3 * sin(uT * 1.2 + ph * 2.0)); transformed.z += aAux.y * sw * 0.6 * cos(uT * 0.45 + ph * 1.3); }`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying float vPeb; uniform vec4 uFishA[${NFISH}]; uniform vec4 uFishB[${NFISH}]; uniform float uShade; uniform vec2 uSunSlope;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  { float pb = texture2D(uPondTex, vPW.xz * 0.37).a, pb2 = texture2D(uPondTex, vPW.zx * 0.071 + 0.5).a;
    diffuseColor.rgb *= mix(1.0, 0.62 + 0.62 * pb * (0.6 + 0.8 * pb2), vPeb); }`);
    sink(sh, { caustics: 1.5 });
    // the fish cast soft shadows on the bottom when the sun is up
    sh.fragmentShader = sh.fragmentShader.replace('if (pdUnder > 0.0) {\n    vec3 toEye', `if (vDeep > 0.3 && uShade > 0.0) {
    float sh2 = 0.0;
    for (int i = 0; i < ${NFISH}; i++) {
      vec4 fa = uFishA[i], fb = uFishB[i];
      float up = fb.y - (uSurf.x - vDeep); if (up < 0.0) continue;
      vec2 dd = vPW.xz - (fa.xy - uSunSlope * up);
      float al = dot(dd, fa.zw), la = dd.y * fa.z - dd.x * fa.w, L = fb.x;
      float e = (al * al) / (0.21 * L * L) + (la * la) / (0.016 * L * L);
      sh2 = max(sh2, (1.0 - smoothstep(0.45, 1.0 + up * 0.5, e)) / (1.0 + up * 0.35));
    }
    outgoingLight *= 1.0 - uShade * sh2;
  }
  if (pdUnder > 0.0) {\n    vec3 toEye`);
  };
  mat.customProgramCacheKey = () => 'pond-basin';
  const m = new THREE.Mesh(g, mat); m.name = 'pond basin'; m.receiveShadow = true; m.castShadow = false; m.renderOrder = 40;
  return m;
}

// ---- The surface ------------------------------------------------------------------------------
export function waterMesh() {
  const P = POND, SEG = 96, rings = [0, 0.5, 0.9, 0.975, 1.012], pos = [], edge = [], idx = [];
  for (let k = 0; k < rings.length; k++) for (let i = 0; i < SEG; i++) { const a = (i / SEG) * Math.PI * 2, f = rim(a) * rings[k]; pos.push(P.x + Math.cos(a) * P.rx * f, P.y, P.z + Math.sin(a) * P.rz * f); edge.push(k < 3 ? 1 : k === 3 ? 0.85 : 0); }
  for (let k = 0; k < rings.length - 1; k++) for (let i = 0; i < SEG; i++) { const a = k * SEG + i, b = k * SEG + (i + 1) % SEG, c = a + SEG, d = b + SEG; if (k > 0) idx.push(a, c, b); idx.push(b, c, d); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aEdge', new THREE.Float32BufferAttribute(edge, 1)); g.setIndex(idx);
  const nrm = new Float32Array(pos.length); for (let i = 1; i < nrm.length; i += 3) nrm[i] = 1; g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.16, transparent: true, depthWrite: false, envMapIntensity: 1.0 });
  mat.onBeforeCompile = sh => {
    for (const k of ['uT', 'uPondTex', 'uRings', 'uSpout', 'uBank']) sh.uniforms[k] = U[k];
    pondTex();
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aEdge; varying float vEdge; varying vec3 vPW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vEdge = aEdge; vPW = (modelMatrix * vec4(position, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
varying float vEdge; varying vec3 vPW; uniform float uT; uniform sampler2D uPondTex; uniform vec4 uRings[${NRINGS}]; uniform vec3 uSpout, uBank;
vec3 pondN; float pondH, pondSheen;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  {
    vec2 wp = vPW.xz;
    float far = 1.0 / (1.0 + 0.0006 * dot(vPW - cameraPosition, vPW - cameraPosition));       // ripples calm with distance, so the far water does not sparkle
    vec2 g = (texture2D(uPondTex, wp * 0.105 + uT * vec2(0.013, 0.007)).rg + texture2D(uPondTex, wp * 0.043 - uT * vec2(0.006, 0.011) + 0.37).rg - 1.0) * (0.10 + 0.22 * far);
    pondH = 0.0; pondSheen = min(0.1, dot(g, g) * 9.0);
    for (int i = 0; i < ${NRINGS}; i++) {
      vec4 e = uRings[i]; float age = uT - e.z; if (age < 0.0 || age > 8.0) continue;
      vec2 dv = wp - e.xy; float r = length(dv), x = r - age * 1.35;
      float env = e.w * exp(-age * 0.5) / (1.0 + r * 0.5) * smoothstep(0.0, 0.25, age), band = exp(-x * x * 5.0);
      g += dv / max(r, 0.001) * cos(x * 8.0) * band * env * 2.2; pondH += sin(x * 8.0) * band * env;
    }
    { vec2 dv = wp - uSpout.xy; float r = length(dv), env = uSpout.z * exp(-r * 0.6); g += dv / max(r, 0.001) * cos(r * 7.0 - uT * 5.0) * env * 0.5; pondH += sin(r * 7.0 - uT * 5.0) * env * 0.4; }
    pondN = normalize(vec3(-g.x, 1.0, -g.y));
    normal = normalize((viewMatrix * vec4(pondN, 0.0)).xyz);
  }`)
      .replace('#include <opaque_fragment>', `{
    vec3 toEye = normalize(cameraPosition - vPW);
    float c = clamp(dot(pondN, toEye), 0.0, 1.0), fres = 0.035 + 0.965 * pow(1.0 - c, 5.0);
    vec3 R = reflect(-toEye, pondN);
    vec3 refl = mix(outgoingLight, uBank, smoothstep(0.34, 0.1, R.y) * 0.8);
    float glint = max(0.0, max(refl.r, max(refl.g, refl.b)) - 1.2);
    outgoingLight = refl;
    diffuseColor.a = clamp(fres + 0.05 + pondSheen + pondH * 0.2 + glint * 0.25, 0.0, 1.0) * vEdge;
  }
  #include <opaque_fragment>`);
  };
  mat.customProgramCacheKey = () => 'pond-water';
  const m = new THREE.Mesh(g, mat); m.name = 'pond water'; m.renderOrder = 44; m.receiveShadow = true;
  return m;
}
