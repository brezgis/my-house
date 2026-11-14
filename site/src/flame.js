// Flames for the hearth and the fire pit, and (at the end) for the candles. A small shader on a few upright sheets, all one draw:
// rising noise eats a tapering body from the top and the sides, so tongues lick and part and a
// sheet's own edge never shows. `uT` is a shared { value: seconds } the caller advances.
//   sheets: [[yaw, x, z, width, height, seed], ...]   in the parent's own feet; y0 lifts them all
export const NOISE = `float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p) { float a = 0.5, s = 0.0; for (int k = 0; k < 4; k++) { s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }`;

export function makeFlames(THREE, mergeGeometries, uT, sheets, y0 = 0.12) {
  const geos = sheets.map(([yaw, x, z, wd, ht, seed]) => {
    const g = new THREE.PlaneGeometry(wd, ht).rotateY(yaw).translate(x, ht / 2 + y0, z);
    g.setAttribute('seed', new THREE.BufferAttribute(new Float32Array(4).fill(seed), 1)); return g;
  });
  const mesh = new THREE.Mesh(mergeGeometries(geos), new THREE.ShaderMaterial({
    uniforms: { uT }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    vertexShader: 'attribute float seed; varying vec2 vUv; varying float vS; void main() { vUv = uv; vS = seed; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uT; varying vec2 vUv; varying float vS;
${NOISE}
void main() {
  float t = uT * (1.0 + vS * 0.03), y = vUv.y;
  float n = fbm(vec2(vUv.x * 3.2 + vS, y * 2.4 - t * 1.7)), n2 = fbm(vec2(vUv.x * 7.0 - vS, y * 5.0 - t * 3.1));
  float x = (vUv.x * 2.0 - 1.0) + (n - 0.5) * 0.7 * y;                      // the tips sway
  float w = max(0.02, 0.9 * pow(1.0 - y, 0.6));                               // broad at the logs, drawn in above
  float body = 1.0 - smoothstep(w * 0.35, w, abs(x));
  float f = body * (0.5 + n * 1.25 + n2 * 0.35) - y * (0.95 + n2 * 1.0);
  f *= smoothstep(0.0, 0.07, y) * (1.0 - smoothstep(0.82, 0.98, y));
  float a = smoothstep(0.03, 0.42, f);
  vec3 c = mix(vec3(1.0, 0.16, 0.02), vec3(1.0, 0.5, 0.07), smoothstep(0.08, 0.4, f));
  c = mix(c, vec3(1.0, 0.9, 0.55), smoothstep(0.45, 0.95, f));
  gl_FragColor = vec4(c * a * 1.15, 1.0);
}`,
  }));
  mesh.renderOrder = 3; mesh.userData.cat = 'fire';
  return mesh;
}

// A candle's flame: the material for one small upright card (its foot at the wick, at the mesh's origin).
// The card turns about the wick to face the eye. Every candle shares this material; each flame takes its
// own rhythm from where it stands. `uT` is a shared { value: seconds }.
export function makeCandleFlame(THREE, uT) {
  return new THREE.ShaderMaterial({
    uniforms: { uT }, transparent: true, depthWrite: false, fog: false,
    vertexShader: `uniform float uT; varying vec2 vUv; varying float vS;
void main() {
  vUv = uv;
  vec3 c = modelMatrix[3].xyz; float s = length(modelMatrix[1].xyz);
  vS = fract(c.x * 3.71 + c.z * 5.37 + c.y * 1.13) * 40.0;
  vec3 right = normalize(vec3(viewMatrix[0][0], 0.0, viewMatrix[2][0]) + vec3(1e-5, 0.0, 0.0));      // the eye's right, kept level
  gl_Position = projectionMatrix * viewMatrix * vec4(c + right * position.x * s + vec3(0.0, position.y * s, 0.0), 1.0);
}`,
    fragmentShader: `uniform float uT; varying vec2 vUv; varying float vS;
${NOISE}
void main() {
  float t = uT + vS, y = vUv.y, x = (vUv.x - 0.5) * 2.0;
  float lean = noise(vec2(vS, t * 1.3)) - 0.5, quick = noise(vec2(vS + 9.0, t * 6.0)) - 0.5, lick = noise(vec2(x * 2.0 + vS, y * 3.0 - t * 4.5)) - 0.5;
  x -= (lean * 0.5 + quick * 0.16) * y * y + lick * 0.14 * y;               // the tip leans in the room's air, and trembles
  float yy = y / (0.84 + 0.1 * noise(vec2(vS + 3.0, t * 5.0)) + 0.06 * lean);   // ...and the flame stretches and shrinks a little
  if (yy >= 1.0) discard;
  float w = 1.1 * sqrt(yy) * pow(1.0 - yy, 0.75) + 0.05 * (1.0 - yy);       // a teardrop: narrow at the wick, full a third of the way up, drawn to a point
  float d = abs(x) / w;
  float a = (1.0 - smoothstep(0.5, 1.0, d)) * smoothstep(0.0, 0.05, yy) * (1.0 - smoothstep(0.86, 1.0, yy));
  vec3 col = mix(vec3(1.0, 0.82, 0.42), vec3(1.0, 0.42, 0.06), smoothstep(0.25, 1.0, d));                     // amber at the edge
  col = mix(col, vec3(1.0, 0.96, 0.82), (1.0 - smoothstep(0.0, 0.55, d)) * smoothstep(0.16, 0.42, yy) * (1.0 - smoothstep(0.55, 0.92, yy)));      // the pale heart
  float foot = 1.0 - smoothstep(0.02, 0.26, yy);
  col = mix(col, vec3(0.28, 0.42, 1.0), foot * 0.8);                         // blue, and thin, round the wick
  a *= mix(1.0, 0.5, foot);
  if (a < 0.01) discard;
  gl_FragColor = vec4(col * 1.2, a);
}`,
  });
}
