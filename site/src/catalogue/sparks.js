// Sparks: one small pool of glowing points, for everything from the catalogue that glitters (the
// koi's glitter food, Sir Reginald's treats, the fireworks). One draw call, no lights; made the first
// time something sparkles and costing nothing while no spark is alive (the owner stops stepping it,
// and the points are hidden).
//
//   const S = makeSparks(THREE, 400);  scene.add(S.points)
//   S.spawn(x, y, z, vx, vy, vz, life, colourHex, size, { g, drag, twinkle })
//   S.step(dt) -> how many are still alive

export function makeSparks(THREE, N = 300) {
  const pos = new Float32Array(N * 3), col = new Float32Array(N * 3), size = new Float32Array(N);
  const vel = new Float32Array(N * 3), base = new Float32Array(N * 3), age = new Float32Array(N), life = new Float32Array(N).fill(0), grav = new Float32Array(N), drag = new Float32Array(N), tw = new Float32Array(N), big = new Float32Array(N);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    uniforms: { uScale: { value: 600 } },
    vertexShader: `attribute float aSize; attribute vec3 color; varying vec3 vC; uniform float uScale;
      void main() { vC = color; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv; gl_PointSize = aSize * uScale / max(0.5, -mv.z); }`,
    fragmentShader: `varying vec3 vC; void main() { vec2 p = gl_PointCoord - 0.5; float d = length(p); if (d > 0.5) discard;
      float a = smoothstep(0.5, 0.0, d); float star = max(0.0, 1.0 - 14.0 * abs(p.x * p.y)) * a;      // a soft dot with a little four-pointed glint
      gl_FragColor = vec4(vC * (a * a + star * 0.6), 1.0); }`,
  });
  const points = new THREE.Points(geo, mat); points.frustumCulled = false; points.visible = false; points.name = 'sparks'; points.userData.cat = 'steam';
  points.onBeforeRender = r => { mat.uniforms.uScale.value = r.domElement.height * 0.9; };
  let next = 0, alive = 0;
  const c = new THREE.Color();
  function spawn(x, y, z, vx, vy, vz, lifeS, hex, sz = 0.2, o = {}) {
    let i = next; for (let n = 0; n < N && life[i] > 0; n++) i = (i + 1) % N;      // a free one, or failing that the oldest slot in turn
    next = (i + 1) % N;
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z; vel[i * 3] = vx; vel[i * 3 + 1] = vy; vel[i * 3 + 2] = vz;
    c.setHex(hex); base[i * 3] = c.r; base[i * 3 + 1] = c.g; base[i * 3 + 2] = c.b;
    age[i] = 0; life[i] = lifeS; big[i] = sz; grav[i] = o.g ?? 0; drag[i] = o.drag ?? 0; tw[i] = o.twinkle ?? 0;
    points.visible = true;
  }
  function step(dt) {
    alive = 0;
    for (let i = 0; i < N; i++) {
      if (life[i] <= 0) continue;
      age[i] += dt;
      if (age[i] >= life[i]) { life[i] = 0; size[i] = 0; continue; }
      alive++;
      const k = Math.max(0, 1 - drag[i] * dt), o = i * 3;
      vel[o] *= k; vel[o + 1] = vel[o + 1] * k - grav[i] * dt; vel[o + 2] *= k;
      pos[o] += vel[o] * dt; pos[o + 1] += vel[o + 1] * dt; pos[o + 2] += vel[o + 2] * dt;
      const q = age[i] / life[i], fade = q < 0.1 ? q / 0.1 : 1 - Math.pow((q - 0.1) / 0.9, 2);
      const f = fade * (tw[i] ? 0.35 + 0.65 * Math.max(0, Math.sin(age[i] * tw[i] + i * 1.7)) : 1);
      col[o] = base[o] * f; col[o + 1] = base[o + 1] * f; col[o + 2] = base[o + 2] * f; size[i] = big[i] * (0.6 + 0.4 * fade);
    }
    geo.attributes.position.needsUpdate = geo.attributes.color.needsUpdate = geo.attributes.aSize.needsUpdate = true;
    points.visible = alive > 0;
    return alive;
  }
  return { points, spawn, step, get alive() { return alive; } };
}

// The colours of glitter
export const GLITTER = [0xff7ac8, 0xffd75e, 0x7ae0ff, 0xb693ff, 0x8dffb0, 0xffffff, 0xff9a5e];
