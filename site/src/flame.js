// Flames for the hearth and the fire pit. A small shader on a few upright sheets, all one draw:
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
