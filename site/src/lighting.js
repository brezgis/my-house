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
import { CHAPEL } from './garden/chapel.js';

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
}).join('\n')
  // the chapel in the garden is a room too; its box is already in world feet (garden/chapel.js)
  + (({ x0, x1, y0, y1, z0, z1 }) => `\n  m = max(m, hlBox(p, vec3(${[x0, y0, z0].map(f)}), vec3(${[x1, y1, z1].map(f)})));`)(CHAPEL.inside);

// Shared uniform values. Plain objects (not THREE.Vector*) so that three's uniform cloning
// keeps a reference to them, and every material sees the same numbers.
// Every lamp lights its room. The pool has four lights, and a house of forty lamps was lit four at a time: a room's
// pendant could hang glowing over a dark table because four lamps elsewhere stood nearer, and a lamp waited for a
// light to be handed over before it came on. So, while you are indoors, each lamp of the rooms nearest you that
// has no light from the pool lights its own room anyway, through a few lines of shader (diffuse only, no shadow,
// the pool's own falloff and colour, so a lamp handed to the pool or back does not change). The same is in the
// lab and the town (their lighting.js, roomLight). ?light=old shows the house as it was.
const SOFT = 16, NREG = 6;
const QS = new URLSearchParams(globalThis.location?.search ?? '');
export const LIGHT_OLD = QS.get('light') === 'old';
export const HL = {
  amb: { x: 0, y: 0, z: 0 },       // warm room light added indoors (irradiance)
  k: { x: 1, y: 1, z: 1, w: 0 },   // indoors: sky diffuse scale, sky reflection scale, sky-fill cut, how far whites are held back by lamplight
  sh: { x: 0, y: 0, z: 0, w: 0 },  // indoors: corner shade on the room light, and on the lamps (set by shade.js)
  cav: new Float32Array(6 * 8),    // up to six open shelves near the eye, shaded inside: per shelf x0, z0, x1, z1 and y0, y1, open side, weight (shade.js)
  reg: new Float32Array(NREG * 8), // the rooms nearest the eye, whose lamps all light them: x0, z0, x1, z1 and y0, y1, on, -
  soft: new Float32Array(SOFT * 4),// their lamps that the pool has not lit: x, y, z, strength
  softRoom: new Float32Array(SOFT),// ...for each, which of those rooms it is in
  softTint: { x: 1, y: 1, z: 1 },  // the lamps' colour (linear), as the pool's
  bounce: { x: 0, y: 0, z: 0 },    // the even light a lamplit room has of its own after dark (what its lamps throw back off walls and ceiling)
};

let installed = false;
export function installHouseLight() {
  if (installed) return; installed = true;
  const head = `
#define HOUSE_LIGHT
uniform vec3 uInAmb;
uniform vec4 uInK;
uniform vec4 uInSh;
uniform vec4 uInCav[12];
uniform vec4 uInReg[${NREG * 2}];
uniform vec3 uInSoftTint, uInBounce;
uniform vec4 uInSoft[${SOFT}];
uniform vec4 uInSoftRoom[${SOFT / 4}];
// which of the rooms nearest the eye the point is in (-1: none)
int hlRegion(vec3 p) {
  for (int i = 0; i < ${NREG}; i++) {
    vec4 A = uInReg[i * 2], B = uInReg[i * 2 + 1];
    if (B.z < 0.5) break;
    if (p.x > A.x && p.x < A.z && p.z > A.y && p.z < A.w && p.y > B.x && p.y < B.y) return i;
  }
  return -1;
}
// The lamps of that room that have no light of their own from the pool: as a point light of the pool's (a lamp's
// cutoff and decay, the light dropped below the shade), diffuse only. Each lights only the room it is in.
vec3 hlSoftLamps(vec3 p, vec3 n, int room) {
  float s = 0.0;
  for (int i = 0; i < ${SOFT}; i++) {
    vec4 L = uInSoft[i];
    if (L.w <= 0.0) break;
    if (int(uInSoftRoom[i >> 2][i & 3]) != room) continue;
    vec3 d = L.xyz - p; float l = max(length(d), 0.05);
    float w = clamp(1.0 - pow(l / ${f(SHAPE.lamp[0])}, 4.0), 0.0, 1.0);
    s += L.w * w * w / max(pow(l, ${f(SHAPE.lamp[1])}), 0.01) * max(dot(n, d / l), 0.0);
  }
  return s * uInSoftTint;
}
float hlBox(vec3 p, vec3 a, vec3 b) { return (all(greaterThan(p, a)) && all(lessThan(p, b))) ? 1.0 : 0.0; }
float houseInside(vec3 p) {
  float m = 0.0;
${boxGLSL}
  return m;
}
// How open a spot indoors is, 1 in the open: less low on walls and on the sides of things (where
// they meet the floor), up under the ceiling, and on faces turned down (the undersides of things).
float houseShade(vec3 p, vec3 n, float inside) {
  if (inside < 0.5) return 1.0;
  bool up = p.y > ${f(F1 + 8.7)};
  float h = max(p.y - (up ? ${f(F2)} : ${f(F1)}), 0.0), c = max((up ? ${f(C2)} : ${f(F1 + 8.2)}) - p.y, 0.0);
  float side = 1.0 - abs(n.y);
  float a = 1.0 - side * (0.5 * exp(-1.8 * h) + 0.22 * exp(-3.0 * c));
  // inside an open shelf: darker toward the back (open side 0: +x, 1: -x, 2: +z, 3: -z)
  for (int i = 0; i < 6; i++) {
    vec4 A = uInCav[i * 2], B = uInCav[i * 2 + 1];
    if (B.w <= 0.0 || p.x < A.x || p.x > A.z || p.z < A.y || p.z > A.w || p.y < B.x || p.y > B.y) continue;
    float t = B.z < 0.5 ? (A.z - p.x) / (A.z - A.x) : B.z < 1.5 ? (p.x - A.x) / (A.z - A.x) : B.z < 2.5 ? (A.w - p.z) / (A.w - A.y) : (p.z - A.y) / (A.w - A.y);
    a *= 1.0 - B.w * 0.6 * smoothstep(0.05, 0.9, t);
  }
  return a * (1.0 + min(n.y, 0.0) * mix(0.55, 0.15, smoothstep(6.0, 7.5, h)));
}
`;
  const after = `
#ifdef HOUSE_LIGHT
  {
    float kd = mix(1.0, uInK.x, hlIn);
    float ao = mix(1.0, hlAO, uInSh.x);
    iblIrradiance *= kd * ao;
    vec3 hlA = uInAmb;
    int hlR = hlIn > 0.5 ? hlRegion(hlP) : -1;
    if (hlR >= 0) hlA += uInBounce * uInReg[hlR * 2 + 1].w + hlSoftLamps(hlP, inverseTransformDirection(normal, viewMatrix), hlR);
    irradiance = (irradiance * kd + hlIn * hlA) * ao;
    radiance *= mix(1.0, uInK.y, hlIn);
  }
#endif
`;
  for (const id of ['standard', 'physical']) {
    const S = THREE.ShaderLib[id];
    S.uniforms.uInAmb = { value: HL.amb };
    S.uniforms.uInK = { value: HL.k };
    S.uniforms.uInSh = { value: HL.sh };
    S.uniforms.uInCav = { value: HL.cav };
    S.uniforms.uInReg = { value: HL.reg };
    S.uniforms.uInSoft = { value: HL.soft };
    S.uniforms.uInSoftRoom = { value: HL.softRoom };
    S.uniforms.uInSoftTint = { value: HL.softTint };
    S.uniforms.uInBounce = { value: HL.bounce };
    S.fragmentShader = S.fragmentShader
      .replace('#include <common>', '#include <common>\n' + head)
      .replace('#include <lights_fragment_maps>', '#include <lights_fragment_maps>\n' + after);
  }
  // Where the fragment is, before any light is added (only where HOUSE_LIGHT is defined)
  let ch = THREE.ShaderChunk.lights_fragment_begin;
  ch = '#ifdef HOUSE_LIGHT\n\tvec3 hlP = cameraPosition + ( vec4( - vViewPosition, 0.0 ) * viewMatrix ).xyz;\n\tfloat hlIn = houseInside( hlP );\n\tfloat hlAO = houseShade( hlP, inverseTransformDirection( normal, viewMatrix ), hlIn );\n\tmaterial.diffuseColor /= 1.0 + uInK.w * hlIn * max( material.diffuseColor.r, max( material.diffuseColor.g, material.diffuseColor.b ) );\n#endif\n' + ch;
  // Indoors the sky fill (the second, unshadowed directional light) is dropped
  const dir = ch.indexOf('#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )');
  const re = ch.indexOf('RE_Direct( directLight', dir);
  // ...and a thing indoors that does not read the shadow map (a mesh without receiveShadow) gets no
  // sun or moon at all: unshadowed, they came straight through the roof, and pale things shone at night
  ch = ch.slice(0, re) + '#if defined( HOUSE_LIGHT ) && ( UNROLLED_LOOP_INDEX > 0 )\n\t\tdirectLight.color *= 1.0 - hlIn * uInK.z;\n\t\t#elif defined( HOUSE_LIGHT )\n\t\tif ( ! receiveShadow ) directLight.color *= 1.0 - hlIn;\n\t\t#endif\n\t\t' + ch.slice(re);
  // The lamps (the point lights, the first loop) are shaded in the corners too, a little
  ch = ch.replace('RE_Direct( directLight', '#ifdef HOUSE_LIGHT\n\t\tdirectLight.color *= mix( 1.0, hlAO, uInSh.y );\n\t\t#endif\n\t\tRE_Direct( directLight');
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
  // By lamplight the eye is wide open (exposure, below) and anything white near a lamp burns out to
  // paper white beside mid-toned walls, as if lit from within. The palest surfaces are held back a
  // little after dark (white about a third, mid-tones hardly at all); by day nothing changes.
  HL.k.w = 0.7 * on;
  amb.copy(AMB_NIGHT).multiplyScalar(0.075).lerp(amb.clone().copy(AMB_DAY).multiplyScalar(0.5), L);
  HL.amb.x = amb.r; HL.amb.y = amb.g; HL.amb.z = amb.b;
  // emissive glows: lamps and their shades
  for (const m of materials.glows ?? []) m.emissiveIntensity = m.userData.e0 * lerp(m.userData.day ?? 0.06, 1, on);
}

// ---- glowing windows and their light on the ground, after dark ------------------------------
export function makeWindowGlow({ scene, materials, windows, rooms }) {
  const glass = materials.glass;
  outdoorLit(glass);
  // Lamplight on the panes. A pane is smooth, so each lit lamp left a soft bright smear on it: from indoors after
  // dark, pale blobs hung in every window, over the garden. The sun's glint by day is kept; the renderer's highlights
  // are faded out as the lamps come on (update, below), and the lamps are shown in the glass as GLINT draws them.
  // After dark a pane shows the lamps as a dark window does: each lit lamp as a small soft disc, the size its shade
  // would be in a mirror at that distance and a fraction as bright, where the eye would see it reflected. (The
  // renderer's own highlight of a lamp on smooth glass is a point of enormous brightness whose skirts spread into
  // a pale blob; that is what is faded out.)
  const GLINT = `
	reflectedLight.directSpecular *= uGlint;
	#if NUM_POINT_LIGHTS > 0
	if ( uGlint < 0.999 ) {
		vec3 glR = reflect( - geometryViewDir, normal );
		for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
			vec3 glD = pointLights[ i ].position - geometryPosition; float glL = length( glD );
			vec3 glC = pointLights[ i ].color; float glM = max( glC.r, max( glC.g, glC.b ) );
			if ( glM < 0.01 || glL > 18.0 || dot( normal, glD ) <= 0.0 ) continue;      // (a lamp on the eye's side of the pane, and near: not one in another room)
			float glA = acos( clamp( dot( glR, glD / glL ), - 1.0, 1.0 ) ), glS = 0.3 / max( glL, 1.0 ), glQ = glA / glS;
			float glK = exp( - glQ * glQ * 1.6 ) * ( 1.0 - smoothstep( 9.0, 18.0, glL ) );
			reflectedLight.directSpecular += ( 1.0 - uGlint ) * uGlintLamp * glK * smoothstep( 0.0, 6.0, glM ) * ( glC / glM ) / max( opacity, 0.05 );
		}
	}
	#endif
`;
  const glint = { value: 1 }, glintLamp = { value: Number(new URLSearchParams(globalThis.location?.search ?? '').get('lampglint') ?? 0.09) };
  { const prev = glass.onBeforeCompile, key = glass.customProgramCacheKey?.bind(glass);
    glass.onBeforeCompile = (sh, r) => { prev?.call(glass, sh, r); sh.uniforms.uGlint = glint; sh.uniforms.uGlintLamp = glintLamp; sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uGlint, uGlintLamp;').replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n' + GLINT); };
    glass.customProgramCacheKey = () => (key ? key() : '') + '|glint3'; }
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
      glint.value = new URLSearchParams(globalThis.location?.search ?? '').get('glint') === '1' ? 1 : 1 - Math.min(1, Number(glowsOn) || 0);      // (?glint=1: as it was)
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
export function makeLampPool({ scene, lamps, vis, size, day, camera, rooms = [] }) {
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
    // Coming into a room, its lamps must not wait their turn: a lamp of the room you stand in that has no
    // light yet takes one from a lamp elsewhere at once if that lamp's room is out of sight, and in a
    // fifth of a second if not. (Each light used to fade out over a second and a half first, and the
    // room stood dark, with only its shades glowing, while the eye had already adjusted to indoors.)
    const urgent = near.some(l => here(l) && !pool.some(o => o.lamp === l));
    const inSight = l => here(l) || (zoneOf(l) === 'o:' ? vis.state.out : vis.state.seen.has(l.zone));
    for (const s of slots) {
      if (s.lamp === 'lantern') { s.lamp = null; s.level = 0; }
      const wanted = s.lamp && near.includes(s.lamp), mine = s.lamp && here(s.lamp), hurry = urgent && s.lamp && !wanted && !mine;
      if (hurry && !inSight(s.lamp)) s.level = 0;
      s.level += ((wanted ? 1 : 0) - s.level) * Math.min(1, dt * (wanted ? (mine ? 10 : 5.5) : hurry ? 14 : 2.4));      // otherwise slow, so a change of lamp is a drift, not a blink
      if (!wanted && s.level < (hurry ? 0.06 : 0.02)) {
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
    if (REGIONS.length) roomUpdate(eye, dt);
  }
  // Every lamp lights its room (see HL, above). The rooms are the house's own, a room of several boxes taken as the
  // box round them all, let out a little into the walls (some wall faces lie exactly on a room's edge). The nearest
  // few to the eye are given to the shader with their lamps, each lit as far as the pool has not lit it. Coming in
  // from the garden this is taken up over a quarter of a second; from out of doors every room is as it was.
  const REGIONS = [];
  if (!LIGHT_OLD) {
    const by = new Map(), P = 0.2;
    for (const r of rooms) { if (!vis.roomAt((r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2, (r.z0 + r.z1) / 2)) continue; const q = by.get(r.name); if (!q) by.set(r.name, { name: r.name, x0: r.x0 - P, x1: r.x1 + P, z0: r.z0 - P, z1: r.z1 + P, y0: r.y0 - P, y1: r.y1 + P }); else { q.x0 = Math.min(q.x0, r.x0 - P); q.x1 = Math.max(q.x1, r.x1 + P); q.z0 = Math.min(q.z0, r.z0 - P); q.z1 = Math.max(q.z1, r.z1 + P); q.y0 = Math.min(q.y0, r.y0 - P); q.y1 = Math.max(q.y1, r.y1 + P); } }
    REGIONS.push(...by.values());
  }
  const regOf = l => (l.__reg === undefined ? (l.__reg = REGIONS.find(r => r.name === vis.roomAt(l.x, l.y, l.z)?.name) ?? REGIONS.find(r => l.x > r.x0 && l.x < r.x1 && l.z > r.z0 && l.z < r.z1 && l.y > r.y0 && l.y < r.y1) ?? null) : l.__reg);
  const softC = new THREE.Color(TINT.lamp);
  HL.softTint.x = softC.r; HL.softTint.y = softC.g; HL.softTint.z = softC.b;
  const away = (r, p) => Math.hypot(Math.max(r.x0 - p.x, 0, p.x - r.x1), Math.max(r.z0 - p.z, 0, p.z - r.z1), 3 * Math.max(r.y0 - p.y, 0, p.y - r.y1));
  const ROOM = { in: 0, act: [] };
  const BOUNCE = Number(QS.get('bounce') ?? 0.14), BOUNCE_TINT = new THREE.Color(1.0, 0.7, 0.42);
  function roomUpdate(eye, dt) {
    const indoors = !vis.state.here.includes('out');
    ROOM.in += ((indoors ? 1 : 0) - ROOM.in) * Math.min(1, dt * 4);
    // (A room joins or leaves the nearest few over a third of a second, never at a stroke: seen through a doorway,
    // its lamps and its own light would otherwise jump as you crossed the room before it.)
    const want = ROOM.in < 0.01 ? [] : REGIONS.map(r => [r, away(r, eye)]).filter(([, d]) => d < 60).sort((a, b) => a[1] - b[1]).slice(0, NREG).map(([r]) => r);
    for (const r of REGIONS) { const to = want.includes(r) ? 1 : 0; r.lv = (r.lv ?? 0) + (to - (r.lv ?? 0)) * Math.min(1, dt * 7); if (!to && r.lv < 0.02) r.lv = 0; }
    ROOM.act = REGIONS.filter(r => r.lv > 0).sort((a, b) => (want.includes(b) ? 1 : 0) - (want.includes(a) ? 1 : 0) || b.lv - a.lv).slice(0, NREG);
    HL.reg.fill(0);
    // A lamplit room is never only its pools: the lamps' light comes back off the walls and ceiling, and the room
    // between the pools is a dim warm dusk, not black. (One pendant over a dining table left the table and the
    // floor round it dark, and the kitchen with both its lamps on read as unlit.) Each room with a lamp on has
    // this even light of its own; a room with none keeps only the house's faint night light.
    for (const r of REGIONS) if (r.lit === undefined) r.lit = lamps.some(l => l.kind === 'lamp' && l.power > 0 && regOf(l) === r) ? 1 : 0;
    const on = lampOn(day) * ROOM.in;
    HL.bounce.x = BOUNCE_TINT.r * BOUNCE * on; HL.bounce.y = BOUNCE_TINT.g * BOUNCE * on; HL.bounce.z = BOUNCE_TINT.b * BOUNCE * on;
    ROOM.act.forEach((r, i) => HL.reg.set([r.x0, r.z0, r.x1, r.z1, r.y0, r.y1, 1, r.lit * r.lv], i * 8));
    const lvl = new Map(pool.map(s => [s.lamp, s.level])), w = ROOM.in;
    const hereNames = new Set(vis.state.here.map(z => z.replace(/^r:/, '')));
    const mine = ROOM.act.length ? lamps.filter(l => l.kind === 'lamp' && l.power > 0 && regOf(l) && ROOM.act.includes(l.__reg))
      .map(l => ({ l, d: Math.hypot(l.x - eye.x, l.y - eye.y, l.z - eye.z), s: strength(l) * (1 - (lvl.get(l) ?? 0)) * w * l.__reg.lv })).filter(o => o.s > 0.002)
      .sort((a, b) => a.d * (hereNames.has(a.l.__reg.name) ? 1 : 2.5) - b.d * (hereNames.has(b.l.__reg.name) ? 1 : 2.5)).slice(0, SOFT) : [];      // (the room the eye is in first)
    let i = 0;
    for (const { l, s } of mine) { HL.soft.set([l.x, l.y - DROP.lamp, l.z, LAMP * s], i * 4); HL.softRoom[i] = ROOM.act.indexOf(l.__reg); i++; }
    if (i < SOFT) HL.soft[i * 4 + 3] = 0;
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
// toward darker and almost as quick toward brighter, so stepping outside never whites out and a room is
// never left dark while the eye catches up.
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
      else { const k = aim < cur ? 3.4 : 3.6;      // (it used to take two or three seconds to brighten on coming indoors: a room stood dark while it did)
        cur = Math.exp(Math.log(cur) + (Math.log(aim) - Math.log(cur)) * Math.min(1, dt * k)); }
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
