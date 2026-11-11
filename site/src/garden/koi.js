// The koi, drawn. One instanced mesh for the whole school.
//
// The fish itself is an existing model: a rudd (a carp-family fish, like koi)
// by XaosXV, CC0 (assets/models/v_fish_rudd, see assets/CREDITS.md). It is used
// as a still mesh: rounded out a little to a koi's build, given smooth normals,
// its own fins sorted out (tail, dorsal, the two pectorals, the rest) so they
// can fan, trail and, for the butterfly koi, be drawn out long; two barbels are
// added. Its skeleton is not used: the swimming wave, the bend in a turn and
// the fins are done in the vertex shader from four numbers per fish that
// koi_school.js supplies, so twenty fish cost one draw call and no bones.
//
// Koi are a matter of pattern, seen from above. Each fish has its own strip in
// one small atlas, painted here at load: red where the hi (red) lies, green
// where the sumi (black) lies, blue for a second ground colour, as soft blobs
// that the shader cuts to a crisp edge at any distance. The colours themselves
// come from a small table per fish, so one painted strip serves gold, white,
// blue or yellow fish alike.

import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { POND } from './pond_shape.js';
import { rng } from './koi_school.js';
import { sink, U } from './pond_water.js';

// ---- the varieties: ground, hi, sumi, second ground; metal sheen; scale net; and how the strip is painted ----
const WHITE = [0.93, 0.91, 0.86], RED = [0.80, 0.13, 0.05], ORANGE = [0.90, 0.32, 0.06], INK = [0.035, 0.035, 0.05];
export const KINDS = {
  kohaku: { base: WHITE, hi: RED, net: 0.07, paint: 'steps' },
  sanke: { base: WHITE, hi: RED, sumi: INK, net: 0.07, paint: 'steps+spots' },
  showa: { base: WHITE, hi: RED, sumi: INK, net: 0.05, paint: 'steps+bands' },
  tancho: { base: WHITE, hi: [0.84, 0.1, 0.05], net: 0.06, paint: 'crown' },
  tanchosanke: { base: WHITE, hi: [0.84, 0.1, 0.05], sumi: INK, net: 0.06, paint: 'crown+spots' },
  bekko: { base: WHITE, sumi: INK, net: 0.07, paint: 'spots' },
  kiutsuri: { base: [0.93, 0.74, 0.16], sumi: INK, net: 0.08, paint: 'bands' },
  yamabuki: { base: [0.93, 0.66, 0.13], alt: [0.98, 0.83, 0.42], metal: 0.75, net: 0.2, paint: 'sheen' },
  orenji: { base: [0.92, 0.36, 0.05], alt: [0.98, 0.58, 0.2], metal: 0.6, net: 0.18, paint: 'sheen' },
  platinum: { base: [0.86, 0.87, 0.86], alt: [0.97, 0.97, 0.95], metal: 0.8, net: 0.16, paint: 'sheen' },
  chagoi: { base: [0.5, 0.27, 0.12], alt: [0.62, 0.38, 0.18], net: 0.34, paint: 'sheen' },
  asagi: { base: [0.36, 0.47, 0.62], hi: [0.82, 0.3, 0.1], alt: [0.86, 0.87, 0.84], net: 0.6, paint: 'asagi' },
  shusui: { base: [0.66, 0.76, 0.84], hi: [0.84, 0.3, 0.1], sumi: [0.08, 0.14, 0.3], alt: [0.9, 0.92, 0.92], net: 0, paint: 'shusui' },
  kumonryu: { base: [0.92, 0.92, 0.9], sumi: INK, net: 0, paint: 'clouds' },
};
const CW = 256, CH = 64, COLS = 2;

// Paint every fish's strip. u runs nose to tail; v goes round the body with the ridge of the back at the middle
// (v = 0.25 and 0.75 are the flanks at the lateral line, the edges are the belly).
function paintAtlas(cast) {
  const rows = Math.ceil(cast.length / COLS), c = document.createElement('canvas'); c.width = CW * COLS; c.height = CH * rows;
  const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
  g.globalCompositeOperation = 'lighter';
  cast.forEach((f, i) => {
    const K = KINDS[f.kind], r = rng((f.seed ?? 1) * 7919 + 13), x0 = (i % COLS) * CW, y0 = Math.floor(i / COLS) * CH;
    g.save(); g.beginPath(); g.rect(x0, y0, CW, CH); g.clip(); g.translate(x0, y0);
    // one soft blob; the shader cuts it at half strength, so several overlapping make one irregular patch
    const blob = (ch, u, v, ru, rv, k = 1) => {
      for (const dv of [0, -1, 1]) {                   // wraps round the belly
        const x = u * CW, y = (v + dv) * CH; if (y + rv * CH < 0 || y - rv * CH > CH) continue;
        g.save(); g.translate(x, y); g.scale(ru * CW, rv * CH);
        const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1), col = ch === 0 ? '255,0,0' : ch === 1 ? '0,255,0' : '0,0,255';
        gr.addColorStop(0, `rgba(${col},${k})`); gr.addColorStop(0.45, `rgba(${col},${k * 0.72})`); gr.addColorStop(1, `rgba(${col},0)`);
        g.fillStyle = gr; g.fillRect(-1, -1, 2, 2); g.restore();
      }
    };
    const patch = (ch, u, v, ru, rv, n = 5) => { blob(ch, u, v, ru, rv); for (let k = 0; k < n; k++) { const a = r() * 6.28, q = 0.45 + r() * 0.5; blob(ch, u + Math.cos(a) * ru * q, v + Math.sin(a) * rv * q, ru * (0.4 + r() * 0.4), rv * (0.4 + r() * 0.4), 0.9); } };
    const P = K.paint;
    if (P.includes('steps')) {                          // the stepped red of a kohaku: islands along the back
      const n = 2 + Math.floor(r() * 3); let u = 0.1 + r() * 0.05;
      for (let k = 0; k < n; k++) {
        const len = (0.78 - u) / (n - k) * (0.7 + r() * 0.5), mid = u + len / 2;
        patch(0, mid, 0.5 + (r() - 0.5) * 0.12, len * 0.62, 0.2 + r() * 0.12, 6);
        u += len + 0.04 + r() * 0.07;
      }
    }
    if (P.includes('crown')) blob(0, 0.105, 0.5, 0.062, 0.2, 1.25);             // the tancho's single red sun on the head
    if (P.includes('spots')) { const n = 5 + Math.floor(r() * 6); for (let k = 0; k < n; k++) patch(1, 0.24 + r() * 0.6, 0.5 + (r() - 0.5) * 0.36, 0.02 + r() * 0.035, 0.05 + r() * 0.07, 2); }
    if (P.includes('bands')) {                          // the wrapping black of showa and utsuri
      let u = 0.02 + r() * 0.08;
      while (u < 0.92) { const w = 0.05 + r() * 0.07, lean = (r() - 0.5) * 0.5; for (let q = 0; q <= 6; q++) { const v = 0.12 + q * 0.127; if (r() < 0.2) continue; blob(1, u + lean * (v - 0.5) * 0.4 + (r() - 0.5) * 0.03, v, w * (0.6 + r() * 0.6), 0.12, 1.1); } u += w * 2 + 0.07 + r() * 0.12; }
      blob(1, 0.03, 0.5, 0.03, 0.2, 0.9);                                      // a dark nose
    }
    if (P === 'clouds') { let u = 0.1; while (u < 0.9) { patch(1, u, 0.5 + (r() - 0.5) * 0.2, 0.05 + r() * 0.08, 0.14 + r() * 0.14, 5); u += 0.1 + r() * 0.16; } }
    if (P === 'asagi') {                                // blue net back, red flanks, cheeks and fin roots, a pale head
      for (let u = 0.2; u < 0.9; u += 0.05) { blob(0, u, 0.14 + r() * 0.03, 0.05, 0.1); blob(0, u, 0.86 - r() * 0.03, 0.05, 0.1); }
      blob(0, 0.14, 0.2, 0.05, 0.1); blob(0, 0.14, 0.8, 0.05, 0.1);
      blob(2, 0.06, 0.5, 0.1, 0.5, 1.2);
    }
    if (P === 'shusui') {                               // no scales but one row of big dark ones down the spine; red flanks; pale head
      for (let u = 0.2; u < 0.95; u += 0.034) blob(1, u, 0.5, 0.017, 0.085, 1.3);
      for (let u = 0.22; u < 0.9; u += 0.05) { blob(0, u, 0.2 + r() * 0.03, 0.05, 0.12); blob(0, u, 0.8 - r() * 0.03, 0.05, 0.12); }
      blob(2, 0.06, 0.5, 0.11, 0.5, 1.2);
    }
    if (P === 'sheen') { for (let u = 0.02; u < 1; u += 0.05) blob(2, u, 0.5, 0.05, 0.11, 0.9); blob(2, 0.07, 0.5, 0.09, 0.3, 0.8); }      // a lighter ridge and head
    g.restore();
  });
  const t = new THREE.CanvasTexture(c); t.flipY = false; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = 4; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter;
  return { tex: t, rows };
}

// ---- the mesh: the rudd, made koi ---------------------------------------------------------------
// Model space: +x the nose, +y up, +z the fish's left; one unit long (nose 0.5, tail tip -0.5).
// aBase: for a fin vertex, the root of its fin (for a body vertex, itself).  aFin: (how far out along the fin 0..1, which fin).
const TAIL = 1, DORSAL = 2, PEC_L = 3, PEC_R = 4, OTHER = 5;
function koiGeometry(gltf) {
  const prims = []; gltf.scene.traverse(o => { if (o.isMesh) prims.push(o); });
  const body = prims.find(o => o.material.name === 'Fish'), fins = prims.find(o => o.material.name === 'Fish-PL');
  const weld = m => { const g = new THREE.BufferGeometry(); g.setAttribute('position', m.geometry.attributes.position.clone()); g.setIndex(m.geometry.index.clone()); return mergeVertices(g, 1e-4); };
  const gb = weld(body), gf = weld(fins);
  gb.computeBoundingBox(); gf.computeBoundingBox();
  const zN = gb.boundingBox.max.z, zT = gf.boundingBox.min.z, span = zN - zT, zMid = (zN + zT) / 2;
  const yC = 0.17 * (gb.boundingBox.max.y - gb.boundingBox.min.y) / 3.2;      // the spine's height in the model
  // to koi space: longer and lower than a rudd, a touch broader, a blunter head
  const conv = (p, i, out, fin) => {
    const x = (p.getZ(i) - zMid) / span, y = (p.getY(i) - yC) / span, z = -p.getX(i) / span;
    const t = 0.5 - x, broad = fin ? 1 : 1.24 + 0.2 * Math.max(0, 1 - Math.abs(t - 0.14) / 0.14);
    out.push(x, y * (fin ? 0.84 : 0.76), z * broad);
  };
  const pos = [], base = [], fin = [], idx = [];
  const pb = gb.attributes.position; { const o = []; for (let i = 0; i < pb.count; i++) conv(pb, i, o, false); pos.push(...o); base.push(...o); for (let i = 0; i < pb.count; i++) fin.push(0, 0); idx.push(...gb.index.array); }
  // fins: each connected piece is one fin
  const pf = gf.attributes.position, nF = pf.count, par = Array.from({ length: nF }, (_, i) => i), find = i => (par[i] === i ? i : (par[i] = find(par[i])));
  const fi = gf.index.array; for (let i = 0; i < fi.length; i += 3) { par[find(fi[i])] = find(fi[i + 1]); par[find(fi[i + 1])] = find(fi[i + 2]); }
  const fp = []; for (let i = 0; i < nF; i++) conv(pf, i, fp, true);
  const groups = new Map(); for (let i = 0; i < nF; i++) { const k = find(i); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(i); }
  const off = pb.count, fBase = new Float32Array(nF * 3), fFin = new Float32Array(nF * 2);
  for (const list of groups.values()) {
    let cx = 0, cy = 0, cz = 0; for (const i of list) { cx += fp[i * 3]; cy += fp[i * 3 + 1]; cz += fp[i * 3 + 2]; } cx /= list.length; cy /= list.length; cz /= list.length;
    const kind = cx < -0.3 ? TAIL : cy > 0.05 && Math.abs(cz) < 0.03 ? DORSAL : cx > 0.05 && Math.abs(cz) > 0.03 && cy > -0.12 ? (cz > 0 ? PEC_L : PEC_R) : OTHER;
    // the root: the part of the fin nearest the body (for the tail, its front)
    const near = i => (kind === TAIL ? -fp[i * 3] : Math.hypot(fp[i * 3 + 1] * (kind === DORSAL ? 1 : 0.8), fp[i * 3 + 2]));
    const sorted = [...list].sort((a, b) => near(a) - near(b)), nb = Math.max(1, Math.round(list.length * 0.25));
    let bx = 0, by = 0, bz = 0; for (const i of sorted.slice(0, nb)) { bx += fp[i * 3]; by += fp[i * 3 + 1]; bz += fp[i * 3 + 2]; } bx /= nb; by /= nb; bz /= nb;
    let far = 1e-6; for (const i of list) far = Math.max(far, Math.hypot(fp[i * 3] - bx, fp[i * 3 + 1] - by, fp[i * 3 + 2] - bz));
    for (const i of list) { fBase.set([bx, by, bz], i * 3); fFin[i * 2] = Math.hypot(fp[i * 3] - bx, fp[i * 3 + 1] - by, fp[i * 3 + 2] - bz) / far; fFin[i * 2 + 1] = kind; }
  }
  pos.push(...fp); base.push(...fBase); fin.push(...fFin); for (const i of fi) idx.push(i + off);
  // two barbels at the corners of the mouth (not in the model: koi have them, rudd do not)
  for (const s of [1, -1]) {
    const n = pos.length / 3, a = [0.462, -0.034, s * 0.034], tip = [0.425, -0.075, s * 0.085];
    pos.push(a[0] + 0.008, a[1], a[2], a[0] - 0.008, a[1], a[2], ...tip); base.push(...a, ...a, ...a); fin.push(0, OTHER, 0, OTHER, 1, OTHER); idx.push(n, n + 1, n + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aBase', new THREE.Float32BufferAttribute(base, 3)); g.setAttribute('aFin', new THREE.Float32BufferAttribute(fin, 2));
  g.setIndex(idx); g.computeVertexNormals();
  // fins are lit like the back they grow from, whichever way they face
  const nr = g.attributes.normal; for (let i = 0; i < nr.count; i++) if (fin[i * 2 + 1] > 0) { const v = new THREE.Vector3(nr.getX(i) * 0.35, 0.85, nr.getZ(i) * 0.35).normalize(); nr.setXYZ(i, v.x, v.y, v.z); }
  return g;
}

const VERT_HEAD = `
attribute vec3 aBase; attribute vec2 aFin; attribute vec4 aSwim;
uniform vec4 uTrait[NK];
varying vec3 vPat; varying vec3 vRest; varying vec2 vFinW; varying float vId;`;
const VERT_BODY = `
  vec4 trait = uTrait[gl_InstanceID];
  float fk = aFin.y, fw = aFin.x, isFin = step(0.5, fk);
  vec3 p = position;
  // butterfly koi: the fins drawn out long
  p = aBase + (p - aBase) * (1.0 + (trait.x - 1.0) * isFin * (fk < 1.5 ? 0.75 : 1.0));
  // pectorals: fanned out wide when it idles, swept back at speed, sculling a little
  if (fk > 2.5 && fk < 4.5) {
    float side = fk < 3.5 ? 1.0 : -1.0, a = side * (-0.15 + 0.95 * aSwim.w + 0.14 * sin(aSwim.x * 0.5 + side)), ca = cos(a), sa = sin(a);
    vec3 d = p - aBase; d = vec3(d.x * ca + d.z * sa, d.y * (1.0 - 0.5 * aSwim.w), d.z * ca - d.x * sa); p = aBase + d;
  }
  // the tail fin lies over and fans, as a koi's does seen from above; the dorsal leans a little
  if (fk > 0.5 && fk < 2.5) { float a = fk < 1.5 ? 1.0 + 0.25 * sin(aSwim.x - 5.0) : 0.45, ca = cos(a), sa = sin(a); vec3 d = p - aBase; p = aBase + vec3(d.x, d.y * ca - d.z * sa, d.y * sa + d.z * ca); }
  float tt = 0.5 - p.x;                                  // 0 at the nose, 1 at the tail tip
  float A = aSwim.y * (0.010 + 0.085 * tt * tt), ph = aSwim.x - 6.2 * tt;
  p.z += A * sin(ph) + aSwim.z * 0.36 * (tt - 0.33) * (tt - 0.33);
  // the tail fin twists as it sweeps, and long fins trail and furl
  if (fk > 0.5 && fk < 1.5) p.z += fw * (p.y * 2.6) * aSwim.y * 0.07 * cos(ph) + fw * fw * (trait.x - 1.0) * 0.05 * sin(ph - 1.2);
  if (fk > 1.5) p.z += fw * (trait.x - 1.0) * 0.035 * sin(ph - 0.9);
  transformed = p;
  vPat = mix(position, aBase, isFin); vRest = position; vFinW = vec2(fw * isFin, fk); vId = float(gl_InstanceID);`;
const FRAG_HEAD = `
varying vec3 vPat; varying vec3 vRest; varying vec2 vFinW; varying float vId;
uniform vec3 uBase[NK], uHi[NK], uSumi[NK], uAlt[NK]; uniform vec4 uTrait[NK]; uniform sampler2D uKoiTex; uniform float uRows;
float koiMetal;`;
const FRAG_COLOR = `
  {
    int id = int(vId + 0.5); vec4 trait = uTrait[id];
    float u = clamp(0.5 - vPat.x, 0.004, 0.996), ang = atan(vPat.z, vPat.y), v = clamp(0.5 + ang / 6.2832, 0.03, 0.97);
    vec2 cell = vec2(mod(vId + 0.5, 2.0) < 1.0 ? 0.0 : 0.5, floor((vId + 0.5) / 2.0) / uRows);
    vec3 m = texture2D(uKoiTex, cell + vec2(u * 0.5, v / uRows)).rgb;
    float e = 0.07, hi = smoothstep(0.42 - e, 0.42 + e, m.r), su = smoothstep(0.42 - e, 0.42 + e, m.g), al = smoothstep(0.2, 0.6, m.b);
    vec3 col = mix(uBase[id], uAlt[id], al);
    col = mix(col, uHi[id], hi);
    // scales: a net of darker edges (strong on an asagi, a hint on the rest), in rows that follow the body
    float back = smoothstep(0.02, 0.2, v) * smoothstep(0.98, 0.8, v) * smoothstep(0.13, 0.2, u) * smoothstep(0.93, 0.8, u);
    vec2 sc = vec2(u * 30.0, v * 26.0); sc.x += 0.5 * floor(mod(sc.y, 2.0));
    vec2 sf = fract(sc) - vec2(0.62, 0.5); float scale = smoothstep(0.2, 0.52, length(sf * vec2(1.0, 0.9)));
    col *= 1.0 - trait.z * scale * back * (1.0 - su) * (1.0 - 0.7 * hi);
    col = mix(col, uSumi[id], su * 0.96);
    // belly paler, back a little deeper
    float belly = smoothstep(0.24, 0.06, v) + smoothstep(0.76, 0.94, v);
    col = mix(col, mix(col, vec3(0.92, 0.89, 0.82), 0.6), belly * (1.0 - su));
    // fins: the colour at their root thinning to clear, with rays
    if (vFinW.y > 0.5) {
      float rays = 0.82 + 0.18 * sin((vRest.y + vRest.z * 1.7 + vRest.x * 0.6) * 240.0);
      vec3 finc = mix(col, mix(uBase[id], vec3(0.93, 0.92, 0.88), 0.55), smoothstep(0.1, 0.55, vFinW.x) * (1.0 - 0.6 * su));
      col = finc * rays;
    }
    // eyes
    float eye = length(vec2(vRest.x - 0.421, vRest.y - 0.016));
    col = mix(col, vec3(0.02), smoothstep(0.017, 0.011, eye) * step(0.045, abs(vRest.z)) * (1.0 - step(0.5, vFinW.y)));
    diffuseColor.rgb = col;
    koiMetal = trait.y * (1.0 - su) * (1.0 - step(0.5, vFinW.y) * 0.6);
  }`;

// Make the school's mesh. cast: the fish (koi_school.CAST). Returns a promise of { mesh, update(S) }.
export function makeKoi(cast) {
  const N = cast.length, { tex, rows } = paintAtlas(cast);
  const arr = k => new Float32Array(N * k), uBase = arr(3), uHi = arr(3), uSumi = arr(3), uAlt = arr(3), uTrait = arr(4);
  cast.forEach((f, i) => {
    const K = KINDS[f.kind]; uBase.set(K.base, i * 3); uHi.set(K.hi ?? K.base, i * 3); uSumi.set(K.sumi ?? INK, i * 3); uAlt.set(K.alt ?? K.base, i * 3);
    uTrait.set([f.fins ?? 1, K.metal ?? 0, K.net ?? 0.07, 0], i * 4);
  });
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5, metalness: 0, envMapIntensity: 0.45, side: THREE.DoubleSide });
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, { uBase: { value: uBase }, uHi: { value: uHi }, uSumi: { value: uSumi }, uAlt: { value: uAlt }, uTrait: { value: uTrait }, uKoiTex: { value: tex }, uRows: { value: rows } });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>' + VERT_HEAD.replace(/NK/g, N)).replace('#include <begin_vertex>', '#include <begin_vertex>' + VERT_BODY);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>' + FRAG_HEAD.replace(/NK/g, N))
      .replace('#include <map_fragment>', FRAG_COLOR)
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n  metalnessFactor = koiMetal * 0.75;')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n  roughnessFactor = mix(0.5, 0.34, koiMetal);');
    sink(sh, { caustics: 0.9 });
  };
  mat.customProgramCacheKey = () => 'koi' + N;
  return new GLTFLoader().loadAsync('assets/models/v_fish_rudd/v_fish_rudd.glb').then(gltf => {
    const geo = koiGeometry(gltf);
    const swim = new THREE.InstancedBufferAttribute(arr(4), 4); swim.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('aSwim', swim);
    const mesh = new THREE.InstancedMesh(geo, mat, N); mesh.name = 'koi'; mesh.frustumCulled = false; mesh.castShadow = false; mesh.receiveShadow = false; mesh.renderOrder = 42;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const M = mesh.instanceMatrix.array, W = swim.array, FA = U.uFishA.value, FB = U.uFishB.value;
    // Write the school into the instance buffers (no allocation)
    const update = S => {
      for (let i = 0; i < N; i++) {
        const h = S.h[i], pt = S.pitch[i], rl = S.roll[i], L = S.len[i], ch = Math.cos(h), sh = Math.sin(h), cp = Math.cos(pt), sp = Math.sin(pt), cr = Math.cos(rl), sr = Math.sin(rl);
        const fx = ch * cp, fy = sp, fz = sh * cp, lx = -sh, lz = ch, ux = -ch * sp, uy = cp, uz = -sh * sp, o = i * 16, y = POND.y - S.d[i];
        M[o] = fx * L; M[o + 1] = fy * L; M[o + 2] = fz * L; M[o + 3] = 0;
        M[o + 4] = (ux * cr - lx * sr) * L; M[o + 5] = uy * cr * L; M[o + 6] = (uz * cr - lz * sr) * L; M[o + 7] = 0;
        M[o + 8] = (lx * cr + ux * sr) * L; M[o + 9] = uy * sr * L; M[o + 10] = (lz * cr + uz * sr) * L; M[o + 11] = 0;
        M[o + 12] = S.x[i]; M[o + 13] = y; M[o + 14] = S.z[i]; M[o + 15] = 1;
        const q = i * 4; W[q] = S.phase[i]; W[q + 1] = S.amp[i]; W[q + 2] = S.bend[i]; W[q + 3] = S.fin[i];
        FA[q] = S.x[i]; FA[q + 1] = S.z[i]; FA[q + 2] = ch; FA[q + 3] = sh; FB[q] = L; FB[q + 1] = y;
      }
      mesh.instanceMatrix.needsUpdate = true; swim.needsUpdate = true;
    };
    return { mesh, update, tex };
  });
}
