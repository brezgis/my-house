// Sky, sun and the hour. Ported from the village project's sky: three.js's
// analytic Sky dome driven by the sun's position, sunlight coloured by a
// Rayleigh/Mie transmittance integral (so light, haze and sky agree), shader
// cumulus lit toward the sun, a cirrus veil, and stars at deep dusk. Here the
// hour comes from the visitor's clock rather than a looping day, the sun's
// path is worked out for Pasadena's latitude and today's date, and the room
// reflections are re-made from the sky whenever the hour changes.
//
// Compass in this house: the street front faces east (+z); south is -x.

import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

const lerp = THREE.MathUtils.lerp, clamp = THREE.MathUtils.clamp, smoothstep = THREE.MathUtils.smoothstep;
const LAT = 34.15 * Math.PI / 180;

function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// ---- sun transmittance (drives the directional light colour) ---------------
const Rp = 6371e3, Ra = 6451e3, Hr = 8500, Hm = 1400;
const BR = [5.8e-6, 13.5e-6, 33.1e-6], BM = 8e-6;
function sunTransmittance(sunY, out) {
  const sy = Math.max(sunY, -0.08), sxz = Math.sqrt(Math.max(0, 1 - sy * sy));
  const oy = Rp + 200, b = oy * sy, c = oy * oy - Ra * Ra, tMax = -b + Math.sqrt(b * b - c);
  const N = 10, seg = tMax / N;
  let odR = 0, odM = 0;
  for (let i = 0; i < N; i++) { const t = (i + 0.5) * seg, h = Math.hypot(sxz * t, oy + sy * t) - Rp; odR += Math.exp(-h / Hr) * seg; odM += Math.exp(-h / Hm) * seg; }
  for (let k = 0; k < 3; k++) out[k] = Math.exp(-(BR[k] * odR + BM * 1.1 * odM));
  return out;
}

// ---- shader cumulus ---------------------------------------------------------
// All 34 clouds are one instanced draw: each instance carries what used to be its own
// uniforms (seed, opacity, aspect, sharpness) and is turned to face the eye in the vertex
// shader, the same way Object3D.lookAt turned each cloud before.
const cloudVert = /* glsl */ `
attribute vec3 aPos; attribute vec2 aSize; attribute vec4 aParam;   // centre; half-width and height scale; seed, opacity, aspect, sharpness
uniform vec3 uCam, uSun; uniform float uOpK;
varying vec2 vUv; varying float vSeed, vOp, vAspect, vSharp; varying vec3 vSunL;
void main() {
  vUv = uv; vSeed = aParam.x; vOp = aParam.y * uOpK; vAspect = aParam.z; vSharp = aParam.w;
  vec3 F = normalize(uCam - aPos), R = normalize(cross(vec3(0.0, 1.0, 0.0), F)), U = cross(F, R);
  vSunL = normalize(vec3(dot(uSun, R) / aSize.x, dot(uSun, U) / aSize.y, dot(uSun, F)));
  gl_Position = projectionMatrix * viewMatrix * vec4(aPos + R * position.x * aSize.x + U * position.y * aSize.y, 1.0);
}`;
const cloudFrag = /* glsl */ `
varying vec2 vUv;
varying float vSeed, vOp, vAspect, vSharp; varying vec3 vSunL;
#define uSeed vSeed
#define uOp vOp
#define uAspect vAspect
#define uSharp vSharp
#define uSunL vSunL
uniform float uT;
uniform vec3 uLitCol, uShadeCol;
float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * vnoise(p); p = p * 2.03 + 17.7; a *= 0.5; } return v; }
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  p.x *= uAspect;
  float t = uT * 0.012 + uSeed * 9.0;
  vec2 bp = p * vec2(1.35, 2.4) + vec2(t * 1.6, uSeed * 7.0);
  float base = fbm(bp);
  float detail = fbm(p * vec2(4.2, 7.5) - vec2(t * 3.8, uSeed * 3.0));
  float env = 1.0 - length(vec2(p.x * 0.72, max(p.y, -0.12) * 1.5));
  float dens = clamp((env + base * 0.85 - 0.62 + (detail - 0.5) * 0.34 - max(0.0, -p.y - 0.25) * 1.4) * uSharp, 0.0, 1.0);
  if (dens < 0.006) discard;
  vec2 gdir = normalize(uSunL.xy + vec2(1e-4, 0.0));
  float dSun = fbm(bp + gdir * 0.15);
  float lit = clamp(0.72 + (dSun - base) * 2.2, 0.0, 1.2);
  float powder = 1.0 - exp(-dens * 2.8);
  vec3 col = mix(uShadeCol, uLitCol, lit) * (1.0 - powder * 0.28);
  col *= 0.68 + 0.32 * smoothstep(-0.7, 0.55, p.y);
  float rim = smoothstep(0.4, 0.02, dens) * max(0.0, -uSunL.z);
  col += uLitCol * rim * 0.55;
  gl_FragColor = vec4(col, dens * uOp);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

// uNight: the night sky's own glow (moonlit blue overhead, a little paler toward the horizon),
// added to the analytic sky, which is black once the sun is down; so the island stands out
// against the sky at night and the moonlit reflections are blue rather than nothing.
function makeDome(gain, night) {
  const sky = new Sky();
  sky.scale.setScalar(9000);
  const u = sky.material.uniforms;
  u.turbidity.value = 4.2; u.rayleigh.value = 1.35; u.mieCoefficient.value = 0.004; u.mieDirectionalG.value = 0.8;
  u.uGain = gain; u.uNight = night;
  sky.material.fragmentShader = sky.material.fragmentShader
    .replace('uniform float mieDirectionalG;', 'uniform float mieDirectionalG;\n\t\tuniform float uGain;\n\t\tuniform vec3 uNight;')
    .replace('gl_FragColor = vec4( retColor, 1.0 );', 'gl_FragColor = vec4( retColor * uGain + uNight * ( 0.55 + 0.75 * pow( 1.0 - abs( direction.y ), 3.0 ) ), 1.0 );');
  return sky;
}

export function buildSky(scene, renderer, centre) {
  const gain = { value: 0.55 }, nightSky = { value: new THREE.Color(0, 0, 0) };
  const dome = makeDome(gain, nightSky); dome.userData.cat = 'sky:dome'; scene.add(dome);
  // A second dome in a scene of its own, from which room reflections and soft sky light are taken.
  const envScene = new THREE.Scene(), envDome = makeDome(gain, nightSky); envScene.add(envDome);
  // Below the horizon the reflections see garden, not more sky; without this, ceilings glow.
  const envGround = new THREE.Mesh(new THREE.CircleGeometry(8000, 24), new THREE.MeshBasicMaterial({ color: 0x1c2114 }));
  envGround.rotation.x = -Math.PI / 2; envGround.position.y = -6; envScene.add(envGround);
  const pmrem = new THREE.PMREMGenerator(renderer);
  let envTarget = null;

  const sun = new THREE.DirectionalLight(0xffffff, 4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  Object.assign(sun.shadow.camera, { left: -270, right: 270, top: 270, bottom: -270, near: 20, far: 700 });
  sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.09; sun.shadow.radius = 2.2;
  sun.shadow.autoUpdate = false;                       // the scene is still; shadows are redrawn only when the sun moves
  sun.target.position.copy(centre);
  const hemi = new THREE.HemisphereLight(0xbcd4e8, 0x8a7a5c, 0.4);
  // Open-sky light on the side away from the sun, so shaded walls are dark but never black.
  const fill = new THREE.DirectionalLight(0xc8d8f0, 0);
  fill.target.position.copy(centre);
  scene.add(sun, sun.target, hemi, fill, fill.target);
  scene.fog = new THREE.Fog(0xcfe0e8, 500, 3400);

  // Colour keys across the day (hour of the clock)
  const stops = [
    { h: 0, fog: 0x0b1220, shade: 0x1b2333, hemi: 0.14 }, { h: 4.6, fog: 0x10192a, shade: 0x202a3c, hemi: 0.15 },
    { h: 6.2, fog: 0xb99a84, shade: 0x6f6a78, hemi: 0.24 }, { h: 8, fog: 0xd5e0da, shade: 0x97a4b6, hemi: 0.38 },
    { h: 12, fog: 0xcfe0e8, shade: 0x9aa9bd, hemi: 0.46 }, { h: 15.5, fog: 0xd3e2e6, shade: 0x9aa9bd, hemi: 0.44 },
    { h: 17.3, fog: 0xe6cba6, shade: 0x8b7f8a, hemi: 0.3 }, { h: 18.6, fog: 0x9a7660, shade: 0x4b4660, hemi: 0.14 },
    { h: 20, fog: 0x121a2b, shade: 0x1f2738, hemi: 0.15 }, { h: 24, fog: 0x0b1220, shade: 0x1b2333, hemi: 0.14 },
  ];
  const cA = new THREE.Color(), cB = new THREE.Color();
  function key(h, name, target) {
    let i = 0; while (i < stops.length - 2 && stops[i + 1].h < h) i++;
    const a = stops[i], b = stops[i + 1], u = clamp((h - a.h) / (b.h - a.h), 0, 1);
    if (name === 'hemi') return lerp(a.hemi, b.hemi, u);
    return target.copy(cA.set(a[name])).lerp(cB.set(b[name]), u);
  }

  // ---- cumulus fleet and a cirrus veil
  const uLitCol = { value: new THREE.Color(1, 1, 1) }, uShadeCol = { value: new THREE.Color(0.6, 0.66, 0.74) }, uTime = { value: 0 };
  const r = rng(55), C = [];
  for (let i = 0; i < 18; i++) {
    const aspect = 2.0 + r() * 1.6, seed = r() * 10, op = 0.6 + r() * 0.3, sharp = 2.2 + r() * 1.4;
    const s = 460 + r() * 620, pos = new THREE.Vector3((r() - 0.5) * 4400, 420 + r() * 420, (r() - 0.5) * 4400);
    C.push({ pos, sx: s * aspect * 0.5, sy: s * 0.42, seed, op, aspect, sharp, speed: 4 + r() * 6 });
  }
  // A sea of cloud below the island, so the land floats
  for (let i = 0; i < 16; i++) {
    const aspect = 2.4 + r() * 1.6, a = r() * Math.PI * 2, d = 420 + r() * 1900, seed = r() * 10, op = 0.75 + r() * 0.2, sharp = 2.0 + r() * 1.2;
    const s = 520 + r() * 700, pos = new THREE.Vector3(Math.cos(a) * d, -90 - r() * 330, Math.sin(a) * d);
    C.push({ pos, sx: s * aspect * 0.5, sy: s * 0.42, seed, op, aspect, sharp, speed: 2 + r() * 4 });
  }
  const cgeo = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1, 1)); cgeo.instanceCount = C.length;
  const aPos = new THREE.InstancedBufferAttribute(new Float32Array(C.length * 3), 3), aSize = new THREE.InstancedBufferAttribute(new Float32Array(C.length * 2), 2), aParam = new THREE.InstancedBufferAttribute(new Float32Array(C.length * 4), 4);
  for (const a of [aPos, aSize, aParam]) a.setUsage(THREE.DynamicDrawUsage);
  cgeo.setAttribute('aPos', aPos); cgeo.setAttribute('aSize', aSize); cgeo.setAttribute('aParam', aParam);
  const cloudUniforms = { uT: uTime, uLitCol, uShadeCol, uCam: { value: new THREE.Vector3() }, uSun: { value: new THREE.Vector3(0, 1, 0) }, uOpK: { value: 1 } };
  const clouds = new THREE.Mesh(cgeo, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, fog: false, vertexShader: cloudVert, fragmentShader: cloudFrag, uniforms: cloudUniforms }));
  clouds.renderOrder = -2; clouds.frustumCulled = false;
  clouds.userData.cat = 'sky:clouds'; scene.add(clouds);

  // ---- stars
  const stars = (() => {
    const s = rng(77), N = 1400, pos = new Float32Array(N * 3), cols = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const band = i > N * 0.55; let x, y, z;
      do {
        x = s() * 2 - 1; y = s(); z = s() * 2 - 1;
        if (band) { const a = s() * Math.PI * 2, off = (s() - 0.5) * 0.3; x = Math.cos(a); z = Math.sin(a) * 0.4 + off; y = Math.abs(Math.sin(a) * 0.85 + off * 0.5); }
      } while (Math.hypot(x, y, z) < 0.2 || y < 0.03);
      const l = Math.hypot(x, y, z), mag = band ? 0.25 + s() * 0.4 : 0.4 + s() * 0.7, warm = s();
      pos.set([(x / l) * 2700, (y / l) * 2700, (z / l) * 2700], i * 3);
      cols.set([mag * (0.85 + warm * 0.15), mag * (0.88 + warm * 0.06), mag * (1.0 - warm * 0.18)], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    pts.frustumCulled = false; pts.renderOrder = -3;
    return pts;
  })();
  scene.add(stars);

  // ---- moon
  const moon = new THREE.Mesh(new THREE.CircleGeometry(38, 72), new THREE.MeshBasicMaterial({ color: 0xf4f1e6, fog: false, transparent: true, toneMapped: false }));
  moon.renderOrder = -3; scene.add(moon);
  { // the moon's face: seas and craters, drawn once (it is worth a look through the telescope)
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
    let sd = 7; const rn = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, 512, 512);
    const blob = (x, y, r, a, col = '70,74,86') => { const gr = g.createRadialGradient(x, y, r * 0.2, x, y, r); gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(1, `rgba(${col},0)`); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); };
    for (const [x, y, r, a] of [[200, 150, 70, 0.5], [270, 140, 60, 0.45], [150, 220, 80, 0.55], [130, 300, 60, 0.4], [300, 210, 55, 0.5], [350, 170, 40, 0.45], [330, 270, 45, 0.4], [215, 250, 50, 0.3], [180, 100, 40, 0.3], [390, 230, 30, 0.35]]) for (let k = 0; k < 5; k++) blob(x + (rn() - 0.5) * r * 0.8, y + (rn() - 0.5) * r * 0.8, r * (0.5 + rn() * 0.6), a * 0.5);
    for (let i = 0; i < 260; i++) { const x = rn() * 512, y = rn() * 512, r = 2 + rn() * rn() * 16; if (Math.hypot(x - 256, y - 256) > 250) continue; blob(x, y, r, 0.16 + rn() * 0.14, '60,62,70'); g.strokeStyle = `rgba(255,255,255,${0.25 + rn() * 0.3})`; g.lineWidth = Math.max(1, r * 0.14); g.beginPath(); g.arc(x, y, r * 0.8, 0.6, 3.6); g.stroke(); }
    for (const [x, y, r] of [[250, 420, 15], [150, 170, 9], [305, 330, 8]]) { blob(x, y, r * 6, 0.0); g.strokeStyle = 'rgba(255,255,255,.22)'; for (let k = 0; k < 14; k++) { const a = rn() * 6.3, l = r * (3 + rn() * 9); g.lineWidth = 1.2; g.beginPath(); g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); } g.fillStyle = 'rgba(255,255,255,.75)'; g.beginPath(); g.arc(x, y, r * 0.7, 0, 7); g.fill(); }
    const limb = g.createRadialGradient(256, 256, 150, 256, 256, 256); limb.addColorStop(0, 'rgba(120,120,135,0)'); limb.addColorStop(1, 'rgba(120,120,135,.28)'); g.fillStyle = limb; g.fillRect(0, 0, 512, 512);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; moon.material.map = tex;
  }

  const state = { hour: 12, light: 1, night: 0, sunDir: new THREE.Vector3(0, 1, 0), low: 1, moonDir: new THREE.Vector3(0, 1, 0), moonUp: false };
  const T = [1, 1, 1], now = new Date();
  const doy = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 864e5);

  function setHour(h) {
    const hour = state.hour = ((h % 24) + 24) % 24;
    const dec = -0.409 * Math.cos((2 * Math.PI * (doy + 10)) / 365), ha = (hour - 12) * Math.PI / 12;
    const el = Math.asin(Math.sin(LAT) * Math.sin(dec) + Math.cos(LAT) * Math.cos(dec) * Math.cos(ha));
    const az = Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(LAT) - Math.tan(dec) * Math.cos(LAT));   // from south, westward positive
    const true3 = new THREE.Vector3(-Math.cos(az) * Math.cos(el), Math.sin(el), -Math.sin(az) * Math.cos(el));
    state.sunDir.copy(true3);
    state.light = smoothstep(el, -0.1, 0.2);
    // The colour keys below were set for a summer day (sunrise about 5:40, sunset about 18:40); they
    // are read at the hour that matches today's sun, so the golden hour is golden in November too.
    const h0 = Math.acos(clamp(-Math.tan(LAT) * Math.tan(dec), -1, 1)) * 12 / Math.PI, rise = 12 - h0, set = 12 + h0;
    const kh = hour < 12 ? 12 - (12 - hour) * (12 - 5.65) / (12 - rise) : 12 + (hour - 12) * (18.7 - 12) / (set - 12);
    state.night = 1 - state.light; state.low = clamp(el / 0.45, 0, 1);
    dome.material.uniforms.sunPosition.value.copy(true3); envDome.material.uniforms.sunPosition.value.copy(true3);
    gain.value = lerp(0.22, 0.55, state.light);

    const up = el > -0.03;
    // The lamp: the sun by day (never shining from below the eaves' horizon), the moon by night
    const lampDir = up ? new THREE.Vector3(true3.x, Math.max(true3.y, 0.1), true3.z).normalize() : new THREE.Vector3(-true3.x * 0.6, 0.72, -true3.z * 0.6).normalize();
    sun.position.copy(lampDir).multiplyScalar(320).add(centre);
    if (up) { sunTransmittance(Math.sin(Math.max(el, 0)), T); const m = Math.max(T[0], T[1], T[2]); sun.color.setRGB(T[0] / m, T[1] / m, T[2] / m); sun.intensity = 4.6 * smoothstep(el, -0.03, 0.09) * (0.45 + 0.55 * m); }      // full low sun by 5 degrees up: the golden hour
    else { sun.color.set(0xa8bde6); sun.intensity = 0.42 + 0.5 * smoothstep(-el, 0.02, 0.25); }      // moonlight, full once the twilight has gone
    fill.position.set(-lampDir.x, 0.5, -lampDir.z).normalize().multiplyScalar(300).add(centre); fill.intensity = 0.6 * state.light;
    moon.position.copy(lampDir).multiplyScalar(2650); moon.lookAt(0, 0, 0); moon.material.opacity = up ? 0 : 0.95; state.moonUp = !up; state.moonDir.copy(lampDir);

    hemi.intensity = key(kh, 'hemi') * 0.5; key(kh, 'fog', scene.fog.color); key(kh, 'shade', uShadeCol.value); uShadeCol.value.multiplyScalar(1 + 0.9 * state.light);
    hemi.color.copy(scene.fog.color).lerp(new THREE.Color(0xe6e2d6), 0.6 * state.light);
    // After dark the sky is a soft blue glow, so the garden is moonlit rather than black
    const dark = smoothstep(state.night, 0.4, 1);
    hemi.color.lerp(new THREE.Color(0x6f84b0), dark); hemi.groundColor.set(0x8a7a5c).lerp(new THREE.Color(0x2c2a2a), dark);
    hemi.intensity += 0.55 * dark;
    nightSky.value.setRGB(0.010, 0.018, 0.040).multiplyScalar(dark);
    uLitCol.value.copy(sun.color).multiplyScalar(up ? 0.8 + 1.9 * state.light : 0.16).lerp(uShadeCol.value, up ? 0 : 0.5);
    stars.material.opacity = smoothstep(state.night, 0.55, 1);
    cloudUniforms.uOpK.value = lerp(0.35, 1, state.light);

    envGround.material.color.set(0x394426).multiplyScalar(lerp(0.08, 1, state.light));
    envTarget?.dispose();
    envTarget = pmrem.fromScene(envScene, 0, 1, 12000);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = lerp(0.9, 1.25, state.light);
    sun.shadow.needsUpdate = true;
  }

  const v = new THREE.Vector3();
  function update(dt, t, camera) {
    uTime.value = t;
    // drift, then write the instances far to near, as the separate clouds used to be sorted
    for (const c of C) { c.pos.x += c.speed * 0.5 * dt; if (c.pos.x > 2300) c.pos.x = -2300; c.d = c.pos.distanceToSquared(camera.position); }
    C.sort((a, b) => b.d - a.d);
    C.forEach((c, i) => { aPos.setXYZ(i, c.pos.x, c.pos.y, c.pos.z); aSize.setXY(i, c.sx, c.sy); aParam.setXYZW(i, c.seed, c.op, c.aspect, c.sharp); });
    aPos.needsUpdate = aSize.needsUpdate = aParam.needsUpdate = true;
    cloudUniforms.uCam.value.copy(camera.position); cloudUniforms.uSun.value.copy(state.sunDir);
    dome.position.copy(camera.position).setY(0); stars.position.copy(dome.position);
  }

  // Indoors with no window in view, clouds, stars and moon need not be drawn
  const setOutdoors = on => { clouds.visible = on; stars.visible = on && stars.material.opacity > 0.001; moon.visible = on && moon.material.opacity > 0.001; };
  return { sun, hemi, state, setHour, update, setOutdoors };
}
