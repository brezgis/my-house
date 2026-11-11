// Lighting: the indoor/outdoor split, the lamp pool, glows, and the eye's adaptation.
//
// The house is lit by a sun (or moon) with a static shadow map, an open-sky environment map
// and hemisphere light, a soft sky "fill", and a pool of four point lights shared out among
// the lamps nearest the visitor. Everything else here is cheap and mostly painted:
//
// - Indoors. Every MeshStandardMaterial gets a few lines of shader (patched in once, before
//   anything compiles) that ask whether the fragment lies inside the house's walls (five
//   boxes, compiled in as constants). Inside, the open-sky light is cut down to what windows
//   let in, the unshadowed sky fill is dropped (it shone through walls), and a soft warm
//   "room bounce" is added instead: strong by day, a low lamplit glow at night, so no room
//   is black even when none of its lamps are among the four. The sun and moon still come in
//   through the windows, with their shadows. The same glow makes the rooms show warm through
//   the windows when seen from the garden at night.
// - Glows. Lampshades, bulbs, lit fittings and lanterns are emissive; they are turned down by
//   day (unlit fabric and glass) and up from dusk. Window glass glows warm from outside after
//   dark, and soft additive cards lay the windows' light on the lawn and porch floors.
// - The pool (see pickLamps): by day the invisible daylight fills, from dusk the lamps, the
//   room you stand in first, then rooms you can see, with a little stickiness so lights do not
//   swap back and forth. Lamps make pools (inverse-square-ish falloff), fills are broad.
// - The hand lantern takes one of the four lights while it is lit.
// - Exposure: eyes adjust to indoors, porches and the garden, by day and night, quickly
//   toward darker (no blow-out on stepping outside), more slowly toward brighter.
// - A faint vignette (a CSS overlay, no GPU cost), a little stronger at night.

import * as THREE from 'three';
import { W, wx, wz } from './builder.js';
import { F1, F2, C2, D } from './house.js';

const lerp = THREE.MathUtils.lerp, clamp = THREE.MathUtils.clamp, smooth = THREE.MathUtils.smoothstep;

// ---- the house's inside, as boxes (plan feet; see house.js) ------------------------------
// Outside walls are built inward from these lines, so an inset of a tenth of a foot leaves
// every outer face outside and every inner face (half a foot in) inside. Boxes overlap where
// they meet so that no inner wall falls between them.
const P1 = 19.0, KX = 30.8, KIT = 35.5, BED = 39.7, SCR = 46.33, e = 0.1;
const BOXES = [
  // X0, X1, Y0, Y1, y0, y1
  [e, W - e, e, D - e, F1 - 1, C2 + 0.07],                      // the main block, both floors
  [P1 + e, W - e, D - 1, KIT - e, F1 - 1, F2 + 7.63],           // kitchen and office; dressing room and sleeping porch over them
  [P1 + e, KX - e, KIT - 1, BED - e, F1 - 1, F2 + 7.63],        // the back of the office and sleeping porch
  [KX - 1, W - e, KIT - 1, BED, F1 - 1.2, F1 + 7.85],           // screened porch, beside the office
  [KX + e, W - e, BED - 1, SCR - e, F1 - 1.2, F1 + 7.85],       // screened porch, the rest
];
const f = n => n.toFixed(3);
const boxGLSL = BOXES.map(([X0, X1, Y0, Y1, y0, y1]) => {
  const a = [wx(X0), y0, wz(Y1)], b = [wx(X1), y1, wz(Y0)];
  return `  m = max(m, hlBox(p, vec3(${a.map(f)}), vec3(${b.map(f)})));`;
}).join('\n');

// Shared uniform values. Plain objects (not THREE.Vector*) so that three's uniform cloning
// keeps a reference to them, and every material sees the same numbers.
export const HL = {
  amb: { x: 0, y: 0, z: 0 },       // warm room light added indoors (irradiance)
  k: { x: 1, y: 1, z: 1, w: 0 },   // indoors: sky diffuse scale, sky reflection scale, sky-fill cut
};

let installed = false;
export function installHouseLight() {
  if (installed) return; installed = true;
  const head = `
#define HOUSE_LIGHT
uniform vec3 uInAmb;
uniform vec4 uInK;
float hlBox(vec3 p, vec3 a, vec3 b) { return (all(greaterThan(p, a)) && all(lessThan(p, b))) ? 1.0 : 0.0; }
float houseInside(vec3 p) {
  float m = 0.0;
${boxGLSL}
  return m;
}
`;
  const after = `
#ifdef HOUSE_LIGHT
  {
    float kd = mix(1.0, uInK.x, hlIn);
    iblIrradiance *= kd;
    irradiance = irradiance * kd + hlIn * uInAmb;
    radiance *= mix(1.0, uInK.y, hlIn);
  }
#endif
`;
  for (const id of ['standard', 'physical']) {
    const S = THREE.ShaderLib[id];
    S.uniforms.uInAmb = { value: HL.amb };
    S.uniforms.uInK = { value: HL.k };
    S.fragmentShader = S.fragmentShader
      .replace('#include <common>', '#include <common>\n' + head)
      .replace('#include <lights_fragment_maps>', '#include <lights_fragment_maps>\n' + after);
  }
  // Where the fragment is, before any light is added (only where HOUSE_LIGHT is defined)
  let ch = THREE.ShaderChunk.lights_fragment_begin;
  ch = '#ifdef HOUSE_LIGHT\n\tfloat hlIn = houseInside( cameraPosition + ( vec4( - vViewPosition, 0.0 ) * viewMatrix ).xyz );\n#endif\n' + ch;
  // Indoors the sky fill (the second, unshadowed directional light) is dropped
  const dir = ch.indexOf('#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )');
  const re = ch.indexOf('RE_Direct( directLight', dir);
  ch = ch.slice(0, re) + '#if defined( HOUSE_LIGHT ) && ( UNROLLED_LOOP_INDEX > 0 )\n\t\tdirectLight.color *= 1.0 - hlIn * uInK.z;\n\t\t#endif\n\t\t' + ch.slice(re);
  THREE.ShaderChunk.lights_fragment_begin = ch;
}
// A material that should be lit as if outdoors wherever it is (window glass)
export function outdoorLit(m) {
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, r) => { prev?.call(m, sh, r); sh.fragmentShader = sh.fragmentShader.replace('#define HOUSE_LIGHT', ''); };
  const key = m.customProgramCacheKey?.bind(m);
  m.customProgramCacheKey = () => (key ? key() : '') + '|out';
}

// ---- what the hour asks for ----------------------------------------------------------------
// lampOn: 0 by day, rising through the golden hour, 1 after dark.
export function lampOn(day) { return 1 - smooth(day.light, 0.42, 0.97); }

const AMB_DAY = new THREE.Color(0.95, 0.86, 0.72), AMB_NIGHT = new THREE.Color(1.0, 0.62, 0.32), amb = new THREE.Color();
export function setHourLight(day, materials) {
  const on = lampOn(day), L = day.light;
  // indoors: how much of the sky comes in, and the room's own light
  HL.k.x = lerp(0.12, 0.42, L);           // sky diffuse
  HL.k.y = lerp(0.1, 0.3, L);             // sky reflections
  HL.k.z = 1;                              // no sky fill through walls
  amb.copy(AMB_NIGHT).multiplyScalar(0.075).lerp(amb.clone().copy(AMB_DAY).multiplyScalar(0.5), L);
  HL.amb.x = amb.r; HL.amb.y = amb.g; HL.amb.z = amb.b;
  // emissive glows: lamps and their shades
  for (const m of materials.glows ?? []) m.emissiveIntensity = m.userData.e0 * lerp(m.userData.day ?? 0.06, 1, on);
}

// ---- glowing windows and their light on the ground, after dark ------------------------------
export function makeWindowGlow({ scene, materials, windows, rooms }) {
  const glass = materials.glass;
  outdoorLit(glass);
  glass.emissive = new THREE.Color(0xffb15e);
  glass.emissiveIntensity = 0;
  // cards on the ground below the ground-floor windows (one draw)
  const tex = (() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64; const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 18, 2, 32, 26, 40); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const t = new THREE.CanvasTexture(c); return t;
  })();
  const pos = [], uv = [], idx = [];
  const outside = ['Terrace', 'Front porch'];
  const floorAt = (x, z) => { const r = rooms.find(r => outside.includes(r.name) && x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1); return r ? r.y0 + 1 + 0.06 : 0.12; };
  for (const w of windows) {
    if (w.fl > F1 + 1) continue;                                       // ground floor only
    const out = -w.sg, len = 6.5, wide = (w.u1 - w.u0) + 2.2, mid = (w.u0 + w.u1) / 2;
    // plan: window wall is at c (on the axis across the wall); outward is -sg
    const P = (u, d) => (w.isX ? [wx(u), wz(w.c + out * d)] : [wx(w.c + out * d), wz(u)]);
    const [tx, tz] = P(mid, 2.5), y = floorAt(tx, tz);
    const n = pos.length / 3;
    for (const [u, d, a, b] of [[mid - wide / 2, 0.9, 0, 0], [mid + wide / 2, 0.9, 1, 0], [mid + wide / 2, len, 1, 1], [mid - wide / 2, len, 0, 1]]) { const [x, z] = P(u, d); pos.push(x, y, z); uv.push(a, 1 - b); }
    idx.push(n, n + 1, n + 2, n, n + 2, n + 3, n, n + 2, n + 1, n, n + 3, n + 2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
  const spillMat = new THREE.MeshBasicMaterial({ map: tex, color: 0xffb466, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const spill = new THREE.Mesh(geo, spillMat); spill.name = 'window light'; spill.userData.cat = 'window light'; spill.renderOrder = 1; spill.visible = false;
  scene.add(spill);
  return {
    // night: 0..1; outside: is the eye outdoors (glass glows only from outside)
    update(night, outside, glowsOn) {
      const k = Math.max(smooth(night, 0.25, 0.9), 0.6 * (Number(glowsOn) || 0));      // the windows begin to glow as the lamps come on at dusk
      glass.emissiveIntensity = outside ? 0.9 * k : 0.04 * k;
      spillMat.opacity = 0.22 * k; spill.visible = k > 0.01;
    },
  };
}

// ---- the lamp pool ------------------------------------------------------------------------
// lamps: { x, y, z, power, kind } (kind 'fill' | 'lamp' | 'candle' | 'fire'). Four point lights
// are shared out. Their falloff depends on the kind: lamps and candles make pools, fills and
// the fire spread wide.
const TINT = { fire: 0xff9a4a, candle: 0xffb060, lamp: 0xffcf96, fill: 0xffe6c8, lantern: 0xffc583 };
const SHAPE = { fill: [36, 1.0], lamp: [26, 1.9], candle: [12, 2.0], fire: [26, 1.5], lantern: [32, 1.35] };
const LAMP = 13;
// Where the light sits relative to the lamp's record: fills come down from near the ceiling (they
// left hot spots on it); lamps hang just below the shade's rim or the lantern's glass, since a light
// a few inches inside a shade lit the fabric chalk white whatever its glow.
const DROP = { fill: 1.8, lamp: 0.45 };
export function makeLampPool({ scene, lamps, vis, size, day, camera }) {
  const pool = Array.from({ length: size }, () => { const p = new THREE.PointLight(0xffdcb0, 0, 30, 1.7); scene.add(p); return { light: p, lamp: null, level: 0 }; });
  // how strong a lamp is at this hour
  const strength = l => {
    const on = lampOn(day);
    if (l.kind === 'fill') return l.power * 0.4 * smooth(day.light, 0.25, 0.9);
    if (l.kind === 'lamp') return l.power * on * 2.2;
    if (l.kind === 'candle') return l.power * (0.6 + 1.6 * on);
    return l.power * (1 + day.night);                   // fire
  };
  const zoneOf = l => (l.zone ??= vis.roomAt(l.x, l.y, l.z)?.id ?? 'o:');
  // "seen" is remembered for a few seconds, so that turning your head on a landing does not
  // keep trading one lamp for another (which pulsed the whole view)
  let nowT = 0;
  const seen = l => { if (zoneOf(l) === 'o:' ? vis.state.out : vis.state.seen.has(l.zone)) l.seenAt = nowT; return nowT - (l.seenAt ?? -1e9) < 6; };
  const here = l => vis.state.here.includes(zoneOf(l));
  // Smaller is better: distance (height counts triple, floors apart), less for strong lamps,
  // much less for the room you are in, more for lamps behind walls, and a little stickiness.
  function score(l, eye, held) {
    const s = strength(l);
    if (s <= 0.01) return Infinity;
    const d = Math.hypot(l.x - eye.x, l.z - eye.z) + Math.abs(l.y - eye.y) * 3;
    const outside = vis.state.here.includes('out'), indoorLamp = zoneOf(l) !== 'o:';
    return d / (0.4 + s) * (here(l) ? 0.55 : seen(l) ? 1 : 2.2) * (held ? 0.62 : 1)
      * (l.kind === 'fire' ? 0.5 : 1)                    // a lit fire is always worth one of the four
      * (outside && indoorLamp ? 1.8 : 1);               // from the garden, rooms glow by themselves (lighting.js); light the garden
  }
  let lantern = null;                                    // { pos: Vector3 } when carried
  const tmp = new THREE.Vector3();
  function choose(eye, n, held = new Set()) {
    return lamps.filter(l => l.power > 0)
      .map(l => ({ l, d: score(l, eye, held.has(l)) })).filter(o => o.d < Infinity)
      .sort((a, b) => a.d - b.d).slice(0, n).map(o => o.l);
  }
  function update(eye, dt, t) {
    nowT = t;
    const n = size - (lantern ? 1 : 0);
    const near = choose(eye, n, new Set(pool.map(s => s.lamp).filter(Boolean)));
    const slots = lantern ? pool.slice(0, n) : pool;
    for (const s of slots) {
      if (s.lamp === 'lantern') { s.lamp = null; s.level = 0; }
      const wanted = s.lamp && near.includes(s.lamp);
      s.level += ((wanted ? 1 : 0) - s.level) * Math.min(1, dt * (wanted ? 2.2 : 1.5));      // slow, so a change of lamp is a drift, not a blink
      if (!wanted && s.level < 0.02) {
        const free = near.find(l => !pool.some(o => o.lamp === l));
        s.lamp = free ?? null; s.level = free ? s.level : 0;
        if (free) { s.light.position.set(free.x, free.y - (DROP[free.kind] ?? 0), free.z); s.light.color.set(TINT[free.kind]); [s.light.distance, s.light.decay] = SHAPE[free.kind]; }
      }
      const live = s.lamp && (s.lamp.kind === 'fire' || s.lamp.kind === 'candle');
      const flicker = live ? 1 + 0.1 * Math.sin(t * 9.1 + s.lamp.x) + 0.07 * Math.sin(t * 23.7 + s.lamp.z) + 0.04 * Math.sin(t * 41.3) : 1;
      s.light.intensity = s.lamp ? LAMP * strength(s.lamp) * s.level * flicker : 0;
    }
    if (lantern) {
      const s = pool[size - 1];
      if (s.lamp !== 'lantern') { s.lamp = 'lantern'; s.level = 0; s.light.color.set(TINT.lantern); [s.light.distance, s.light.decay] = SHAPE.lantern; }
      s.level += (1 - s.level) * Math.min(1, dt * 4);
      camera.localToWorld(s.light.position.copy(lantern.at));
      const flick = 1 + 0.035 * Math.sin(t * 13.3) + 0.025 * Math.sin(t * 29.1);
      s.light.intensity = lantern.power * lerp(0.35, 1, day.night) * s.level * flick;
    } else if (pool[size - 1].lamp === 'lantern') { pool[size - 1].lamp = null; pool[size - 1].level = 0; pool[size - 1].light.intensity = 0; }
  }
  return {
    update, strength, pool, choose,
    describe: l => `${l.kind}${l.halo ? '*' : ''}@${(l.zone ?? zoneOf(l)).replace('r:', '')}:${strength(l).toFixed(2)}`,
    setLantern(on, o = {}) { lantern = on ? { at: new THREE.Vector3(...(o.at ?? [0.55, -0.42, -1.1])), power: o.power ?? 22 } : null; },
    get lanternOn() { return !!lantern; },
  };
}

// ---- eyes adjusting -----------------------------------------------------------------------
// Targets by where you are (in / half / out) and the hour; changes are made in log space, quick
// toward darker and slower toward brighter, so stepping outside never whites out and stepping
// in never goes black.
export function makeExposure(Q) {
  const inDay = Number(Q.get('exp') ?? 1.6);
  const T = { in: [inDay, 2.0, 2.6], half: [1.35, 1.9, 2.45], out: [0.8, 1.6, 2.2] };     // day, dusk, night
  let cur = null;
  function target(where, day) {
    const [a, b, c] = T[where] ?? T.out, on = lampOn(day);
    // day -> dusk as the lamps come on; dusk -> night as the sky goes dark
    return day.night > 0.5 ? lerp(b, c, smooth(day.night, 0.5, 1)) : lerp(a, b, Math.min(1, on * 1.4));
  }
  return {
    update(renderer, where, day, dt, snap) {
      const aim = target(where, day);
      if (cur === null || snap) cur = aim;
      else { const k = aim < cur ? 2.6 : 1.1; cur = Math.exp(Math.log(cur) + (Math.log(aim) - Math.log(cur)) * Math.min(1, dt * k)); }
      renderer.toneMappingExposure = cur;
    },
    target,
  };
}

// ---- vignette --------------------------------------------------------------------------------
export function makeVignette() {
  const v = document.createElement('div');
  v.setAttribute('aria-hidden', 'true');
  Object.assign(v.style, { position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '1', transition: 'opacity 1.5s', background: 'radial-gradient(ellipse at 50% 46%, rgba(0,0,0,0) 55%, rgba(12,8,4,.22) 82%, rgba(8,5,2,.42) 100%)' });
  const canvas = document.querySelector('canvas');
  (canvas?.parentNode ?? document.body).insertBefore(v, canvas?.nextSibling ?? null);
  return { set(night) { v.style.opacity = String(0.55 + 0.45 * night); } };
}

// ---- halos: the soft glow round a lit shade or a candle flame -------------------------------
// One instanced, camera-facing quad per lamp (a single draw), additive, faded in with the lamps.
// Lamps carry `halo` (a size in feet) where kit/light.js made a shade; candles get a small one
// while lit. Walls hide them as they hide anything else.
export function makeHalos({ scene, lamps, day }) {
  const list = () => lamps.filter(l => l.halo || l.kind === 'candle');
  let L = list();
  const N = Math.max(1, L.length + 16);
  const geo = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1, 1));
  const aPos = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4);            // xyz, size
  const aOn = new THREE.InstancedBufferAttribute(new Float32Array(N), 1);
  aPos.setUsage(THREE.DynamicDrawUsage); aOn.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aPos', aPos); geo.setAttribute('aOn', aOn); geo.instanceCount = 0;
  const uK = { value: 0 }, uT = { value: 0 };
  const mat = new THREE.ShaderMaterial({
    uniforms: { uK, uT }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    vertexShader: `attribute vec4 aPos; attribute float aOn; uniform float uT; varying vec2 vUv; varying float vA;
void main() { vUv = uv * 2.0 - 1.0; vA = aOn * (1.0 + 0.05 * sin(uT * 9.0 + aPos.x * 3.0) * step(aPos.w, 1.2));
  vec4 mv = viewMatrix * vec4(aPos.xyz, 1.0); mv.xy += position.xy * aPos.w; mv.z += 0.3 * aPos.w; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform float uK; varying vec2 vUv; varying float vA;
void main() { float r = dot(vUv, vUv); if (r > 1.0) discard; float g = (1.0 - r); g = g * g * g; gl_FragColor = vec4(vec3(1.0, 0.64, 0.33) * g * vA * uK, 1.0); }`,
  });
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 2; mesh.name = 'halos'; mesh.userData.cat = 'halos';
  scene.add(mesh);
  return {
    update(t) {
      if (L.length !== list().length) L = list();
      const on = lampOn(day);
      uK.value = 0.22 * on; uT.value = t;
      let n = 0;
      if (on > 0.01) for (const l of L) {
        if (n >= N) break;
        const candle = l.kind === 'candle';
        if (l.power <= 0) continue;
        aPos.setXYZW(n, l.x, l.y + (candle ? -0.12 : 0.05), l.z, candle ? 0.9 : (l.halo ?? 1) * 2.4); aOn.setX(n, candle ? 1.4 : 1); n++;
      }
      geo.instanceCount = n; mesh.visible = n > 0;
      aPos.needsUpdate = aOn.needsUpdate = true;
    },
  };
}
