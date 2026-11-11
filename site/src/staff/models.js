// Bodies for the staff, made from three.js primitives. Each solid part is one
// merged, vertex-coloured mesh, so a robot costs a handful of draw calls; the
// faces are small glowing canvases redrawn when the expression changes.
// Units are feet. Everyone faces +z in their own frame.

import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

let THREE;
export function useThree(T) { THREE = T; }

// ---- helpers ------------------------------------------------------------------------------
export function paint(geo, color) {
  const g = geo.index ? geo.toNonIndexed() : geo, n = g.attributes.position.count, a = new Float32Array(n * 3), c = new THREE.Color(), p = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    if (typeof color === 'function') { p.fromBufferAttribute(g.attributes.position, i); c.set(color(p)); } else c.set(color);
    a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k);
  return g;
}
const T = (geo, { p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1] } = {}) => {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...s));
  return geo.applyMatrix4(m);
};
const merge = list => mergeGeometries(list, false);
let solidMat = null;
export function solid() {
  return solidMat ??= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.12, envMapIntensity: 0.9 });
}
function mesh(geo, mat = solid()) { const m = new THREE.Mesh(geo, mat); m.castShadow = false; m.receiveShadow = false; return m; }
const sph = (r, w = 20, h = 14) => new THREE.SphereGeometry(r, w, h);
const cyl = (r0, r1, h, s = 18) => new THREE.CylinderGeometry(r0, r1, h, s);

// ---- Faces --------------------------------------------------------------------------------
// expr: neutral happy sass wink love focus surprised sleepy blink
export function makeFace(spec) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d'), tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  let last = '';
  function draw(expr = 'neutral', look = 0, blink = false) {
    const key = `${expr}|${Math.round(look * 4)}|${blink}`; if (key === last) return; last = key;
    const bgc = spec.bg ?? '#0b0809', gr = g.createRadialGradient(128, 40, 10, 128, 64, 150);
    gr.addColorStop(0, '#2a1f26'); gr.addColorStop(0.5, bgc); gr.addColorStop(1, '#050304');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
    const col = spec.eye, lx = 128 - spec.gap + look * 14, rx = 128 + spec.gap + look * 14, y = 56;
    g.strokeStyle = g.fillStyle = col; g.lineCap = 'round'; g.lineJoin = 'round'; g.shadowColor = col; g.shadowBlur = 14;
    const rr = (x, yy, w, h, r) => { g.beginPath(); g.roundRect(x - w / 2, yy - h / 2, w, h, r); g.fill(); };
    const arc = (x, yy, w, up = true) => { g.lineWidth = 9; g.beginPath(); up ? g.arc(x, yy + 8, w, Math.PI * 1.15, Math.PI * 1.85) : g.arc(x, yy - 10, w, Math.PI * 0.15, Math.PI * 0.85); g.stroke(); };
    const heart = (x, yy, s) => { g.beginPath(); g.moveTo(x, yy + s * 0.9); g.bezierCurveTo(x - s * 1.4, yy - s * 0.1, x - s * 0.7, yy - s * 1.2, x, yy - s * 0.4); g.bezierCurveTo(x + s * 0.7, yy - s * 1.2, x + s * 1.4, yy - s * 0.1, x, yy + s * 0.9); g.fill(); };
    const ew = spec.eyeW, eh = spec.eyeH;
    if (blink || expr === 'blink') { g.lineWidth = 7; for (const x of [lx, rx]) { g.beginPath(); g.moveTo(x - ew / 2, y + 6); g.lineTo(x + ew / 2, y + 6); g.stroke(); } }
    else if (expr === 'happy') { arc(lx, y, ew * 0.62); arc(rx, y, ew * 0.62); }
    else if (expr === 'love') { heart(lx, y, ew * 0.55); heart(rx, y, ew * 0.55); }
    else if (expr === 'sleepy') { g.lineWidth = 7; for (const x of [lx, rx]) { g.beginPath(); g.arc(x, y - 4, ew * 0.45, Math.PI * 0.2, Math.PI * 0.8); g.stroke(); } }
    else if (expr === 'focus') { rr(lx, y, ew * 1.1, eh * 0.32, 6); rr(rx, y, ew * 1.1, eh * 0.32, 6); }
    else if (expr === 'surprised') { g.lineWidth = 7; for (const x of [lx, rx]) { g.beginPath(); g.arc(x, y, ew * 0.48, 0, 7); g.stroke(); } }
    else if (expr === 'wink') { rr(lx, y, ew, eh, ew * 0.42); arc(rx, y, ew * 0.6, false); }
    else if (expr === 'sass') {
      // half-lidded, one brow up: unimpressed, adoring
      for (const [x, h] of [[lx, 0.55], [rx, 0.62]]) rr(x, y + eh * (1 - h) / 2 + 4, ew, eh * h, ew * 0.3);
      g.lineWidth = 6;
      for (const [x, dy] of [[lx, eh * 0.62 - eh * 0.55 / 2 - 6], [rx, eh * 0.62 - eh * 0.62 / 2 - 8]]) { g.beginPath(); g.moveTo(x - ew * 0.62, y - dy + 10); g.lineTo(x + ew * 0.62, y - dy + 10); g.stroke(); }
      g.beginPath(); g.moveTo(rx - ew * 0.5, y - eh * 0.55); g.quadraticCurveTo(rx + 2, y - eh * 0.95, rx + ew * 0.6, y - eh * 0.62); g.stroke();
    } else { rr(lx, y, ew, eh, ew * 0.42); rr(rx, y, ew, eh, ew * 0.42); }
    // mouth
    g.lineWidth = 5;
    if (['happy', 'love', 'wink'].includes(expr)) { g.beginPath(); g.arc(128 + look * 10, y + 22, 13, Math.PI * 0.2, Math.PI * 0.8); g.stroke(); }
    else if (expr === 'sass') { g.beginPath(); g.moveTo(118 + look * 10, y + 38); g.quadraticCurveTo(134, y + 41, 146 + look * 10, y + 32); g.stroke(); }
    else if (expr === 'surprised') { g.beginPath(); g.arc(128, y + 38, 6, 0, 7); g.stroke(); }
    g.shadowBlur = 0;
    if (spec.specs) { g.strokeStyle = spec.specs; g.lineWidth = 3.5; for (const x of [lx, rx]) { g.beginPath(); g.arc(x, y, ew * 0.95, 0, 7); g.stroke(); } g.beginPath(); g.moveTo(lx + ew * 0.95, y - 4); g.quadraticCurveTo(128 + look * 14, y - 14, rx - ew * 0.95, y - 4); g.stroke(); }
    if (spec.blush) { g.fillStyle = spec.blush; for (const x of [lx - 8, rx + 8]) { g.beginPath(); g.ellipse(x, y + 30, 15, 7, 0, 0, 7); g.fill(); } }
    tex.needsUpdate = true;
  }
  draw();
  const mat = new THREE.MeshStandardMaterial({ color: 0x060405, roughness: 0.16, metalness: 0, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.25, envMapIntensity: 1.1 });
  return { draw, mat, canvas: c };
}

// A patch of sphere, for a face screen that follows the body's curve
function visor(r, phi, th0, th1, scale) {
  const g = new THREE.SphereGeometry(r, 18, 9, Math.PI / 2 - phi, phi * 2, th0, th1 - th0);
  g.scale(...scale);
  return g;
}

// ---- The robots -----------------------------------------------------------------------------
export const ROBOT_SPECS = {
  barty: {
    key: 'barty', name: 'Bartholomew', short: 'Barty', hover: 3.55, radius: 0.85, speed: 2.4,
    face: { eye: '#ffe2b0', gap: 46, eyeW: 38, eyeH: 50, bg: '#170c13' }, ring: 0x8fe3d1, chirp: [67, 71, 74],
  },
  mort: {
    key: 'mort', name: 'Mortimer', short: 'Mort', hover: 2.75, radius: 0.9, speed: 2.0,
    face: { eye: '#b8f5d0', gap: 50, eyeW: 32, eyeH: 36, specs: 'rgba(184,245,208,.55)', bg: '#0b1410' }, ring: 0xa8f0c0, chirp: [55, 59, 62],
  },
  fig: {
    key: 'fig', name: 'Fig', short: 'Fig', hover: 3.9, radius: 0.7, speed: 2.7,
    face: { eye: '#ffd0dc', gap: 42, eyeW: 38, eyeH: 46, blush: 'rgba(255,120,150,.55)', bg: '#170b0f' }, ring: 0xffb3c7, chirp: [79, 83, 86],
  },
};

export function buildRobot(key) {
  const S = ROBOT_SPECS[key];
  const root = new THREE.Group(), bob = new THREE.Group(); root.add(bob); bob.position.y = S.hover;
  root.userData.staff = true;
  const parts = [];
  let bodyScale, R, face, ringY, handL, handR, trayAt, extra = {};
  const BRASS = '#c9a45c', CREAM = '#efe4cf';

  if (key === 'barty') {
    R = 0.6; bodyScale = [1, 1.2, 0.95];
    const PLUM = '#8a3d6b';
    parts.push(paint(T(sph(R, 26, 18), { s: bodyScale }), PLUM));
    parts.push(paint(visor(R + 0.006, 0.62, 1.62, 2.55, bodyScale), CREAM));                 // shirt front
    parts.push(paint(T(new THREE.TorusGeometry(R + 0.012, 0.034, 8, 44), { p: [0, -0.02, 0], r: [Math.PI / 2, 0, 0], s: [1, 0.95, 1] }), BRASS));
    // bow tie
    parts.push(paint(T(new THREE.ConeGeometry(0.085, 0.17, 10), { p: [-0.085, 0.07, 0.56], r: [0, 0, -Math.PI / 2], s: [1, 1, 0.55] }), '#c9932e'));
    parts.push(paint(T(new THREE.ConeGeometry(0.085, 0.17, 10), { p: [0.085, 0.07, 0.56], r: [0, 0, Math.PI / 2], s: [1, 1, 0.55] }), '#c9932e'));
    parts.push(paint(T(sph(0.045, 10, 8), { p: [0, 0.07, 0.585] }), '#b07f25'));
    // buttons on the shirt front
    for (const y of [-0.18, -0.34]) parts.push(paint(T(sph(0.03, 8, 6), { p: [0, y, 0.55 - (y < -0.3 ? 0.06 : 0.02)] }), BRASS));
    // underside cap
    parts.push(paint(T(new THREE.SphereGeometry(0.3, 18, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), { p: [0, -0.62, 0], s: [1, 0.6, 1] }), BRASS));
    // the top hat, at an angle
    const hat = [
      paint(T(cyl(0.3, 0.3, 0.03, 26), { p: [0, 0.015, 0] }), '#1d181b'),
      paint(T(cyl(0.19, 0.2, 0.36, 22), { p: [0, 0.2, 0] }), '#1d181b'),
      paint(T(cyl(0.204, 0.204, 0.07, 22), { p: [0, 0.07, 0] }), '#b04060'),
      paint(T(cyl(0.192, 0.192, 0.012, 22), { p: [0, 0.385, 0] }), '#2a2327'),
    ].map(g => T(g, { r: [0.05, 0, -0.24] })).map(g => T(g, { p: [0.1, 0.69, -0.02] }));
    parts.push(...hat);
    face = makeFace(S.face); face.mesh = mesh(visor(R + 0.008, 0.82, 0.62, 1.36, bodyScale), face.mat);
    ringY = -0.84; handL = [-0.8, -0.18, 0.12]; handR = [0.8, -0.18, 0.12]; trayAt = [0.56, -0.2, 0.5];
  } else if (key === 'mort') {
    R = 0.66; bodyScale = [1.18, 0.8, 1.05];
    const GREEN = '#3d6e5e';
    parts.push(paint(T(sph(R, 26, 16), { s: bodyScale }), p => (p.y < -0.13 ? CREAM : GREEN)));
    parts.push(paint(T(new THREE.TorusGeometry(R * 1.18 * 0.985, 0.036, 8, 44), { p: [0, -0.12, 0], r: [Math.PI / 2, 0, 0], s: [1, 1.05 / 1.18, 1] }), BRASS));
    parts.push(paint(T(cyl(0.05, 0.07, 0.1, 12), { p: [0, R * 0.8 + 0.03, 0] }), BRASS));
    parts.push(paint(T(sph(0.085, 12, 10), { p: [0, R * 0.8 + 0.13, 0] }), BRASS));
    for (const sx of [-1, 1]) parts.push(paint(T(cyl(0.13, 0.13, 0.06, 18), { p: [sx * R * 1.16, 0.02, 0], r: [0, 0, Math.PI / 2] }), BRASS));
    for (let i = 0; i < 7; i++) { const a = -0.9 + i * 0.3; parts.push(paint(T(sph(0.022, 6, 5), { p: [Math.sin(a) * R * 1.17, -0.24, Math.cos(a) * R * 1.04] }), BRASS)); }   // apron buttons
    parts.push(paint(T(new THREE.SphereGeometry(0.34, 18, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), { p: [0, -0.45, 0], s: [1, 0.55, 1] }), '#2c4f44'));
    face = makeFace(S.face); face.mesh = mesh(visor(R + 0.008, 1.0, 0.9, 1.5, bodyScale), face.mat);
    ringY = -0.66; handL = [-0.92, -0.12, 0.18]; handR = [0.92, -0.12, 0.18]; trayAt = [0.6, -0.12, 0.55];
  } else {
    R = 0.42; bodyScale = [1, 1.02, 1];
    const ROSE = '#e3957f';
    parts.push(paint(T(sph(R, 22, 16), { s: bodyScale }), ROSE));
    parts.push(paint(visor(R + 0.005, 0.7, 1.75, 2.6, bodyScale), '#f6e6d6'));             // a pale tummy
    parts.push(paint(T(cyl(0.012, 0.016, 0.12, 6), { p: [0.02, R + 0.05, 0], r: [0, 0, -0.2] }), '#5b4630'));
    parts.push(paint(T(sph(0.2, 14, 8), { p: [0.1, R + 0.12, 0.02], r: [0.2, 0.4, -0.55], s: [0.75, 0.12, 1.1] }), '#6f8f4a'));
    parts.push(paint(T(sph(0.12, 12, 6), { p: [-0.06, R + 0.1, -0.06], r: [-0.3, -0.6, 0.5], s: [0.7, 0.12, 1.1] }), '#81a356'));
    parts.push(paint(T(new THREE.SphereGeometry(0.2, 16, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), { p: [0, -R * 0.92, 0], s: [1, 0.6, 1] }), BRASS));
    face = makeFace(S.face); face.mesh = mesh(visor(R + 0.006, 0.86, 0.72, 1.55, bodyScale), face.mat);
    ringY = -0.58; handL = [-0.56, -0.16, 0.14]; handR = [0.56, -0.16, 0.14]; trayAt = [0.4, -0.2, 0.42];
    const wingGeo = paint(T(sph(0.2, 14, 10), { p: [0, 0.06, -0.16], s: [0.14, 0.9, 1.3] }), '#fbf3e6');
    for (const sx of [-1, 1]) { const w = new THREE.Group(); w.position.set(sx * R * 0.92, 0.1, -0.08); w.add(mesh(wingGeo)); bob.add(w); extra[sx < 0 ? 'wingL' : 'wingR'] = w; }
  }

  const body = mesh(merge(parts)); bob.add(body, face.mesh);
  const ring = new THREE.Mesh(T(new THREE.TorusGeometry(R * 0.5, 0.032, 8, 30), { r: [Math.PI / 2, 0, 0] }), new THREE.MeshBasicMaterial({ color: S.ring, toneMapped: false, transparent: true, opacity: 0.85 }));
  ring.position.y = ringY; bob.add(ring);
  // little floating mitten hands
  const handSize = key === 'fig' ? 0.085 : 0.12;
  const handGeo = paint(T(sph(handSize, 10, 7), { s: [1, 0.85, 1.15] }), key === 'mort' ? '#e8dcc4' : '#f4eee2');
  const hands = [handL, handR].map(p => { const h = new THREE.Group(); h.position.set(...p); h.userData.rest = p; h.add(mesh(handGeo)); bob.add(h); return h; });
  // Mort's cleaning kit: a spray bottle in the left hand, a folded yellow cloth in the right
  if (key === 'mort') {
    const bottle = mesh(merge([
      paint(T(cyl(0.075, 0.08, 0.26, 14), { p: [0, 0.2, 0.04] }), '#8cc4dc'),
      paint(T(cyl(0.07, 0.07, 0.1, 14), { p: [0, 0.19, 0.04] }), '#bfe3f0'),                 // the liquid line
      paint(T(cyl(0.03, 0.045, 0.06, 10), { p: [0, 0.36, 0.04] }), '#f4f1ea'),
      paint(T(new THREE.BoxGeometry(0.09, 0.08, 0.17), { p: [0, 0.42, 0.08] }), '#f4f1ea'),     // trigger head
      paint(T(cyl(0.012, 0.012, 0.05, 6), { p: [0, 0.42, 0.18], r: [Math.PI / 2, 0, 0] }), '#d9d4c8'),
      paint(T(new THREE.BoxGeometry(0.03, 0.1, 0.03), { p: [0, 0.34, 0.14], r: [0.3, 0, 0] }), '#f4f1ea'),
    ]));
    bottle.scale.setScalar(1.35); hands[0].add(bottle);
    const cloth = mesh(merge([
      paint(T(new THREE.BoxGeometry(0.3, 0.04, 0.22), { p: [0, -0.1, 0.06] }), '#e8c547'),
      paint(T(new THREE.BoxGeometry(0.3, 0.035, 0.2), { p: [0.01, -0.065, 0.065], r: [0, 0.06, 0] }), '#d9b43a'),
      paint(T(new THREE.BoxGeometry(0.06, 0.12, 0.2), { p: [0.16, -0.13, 0.06], r: [0, 0, 0.3] }), '#e8c547'),   // a corner hanging down
    ]));
    cloth.scale.setScalar(1.35); hands[1].add(cloth);
  }
  // The tray, and a place on it for a drink
  const tray = new THREE.Group(); tray.position.set(...trayAt); tray.visible = false; bob.add(tray);
  const ts = key === 'fig' ? 0.24 : 0.34;
  tray.add(mesh(merge([paint(T(cyl(ts, ts * 0.92, 0.03, 28)), BRASS), paint(T(new THREE.TorusGeometry(ts, 0.018, 6, 30), { p: [0, 0.025, 0], r: [Math.PI / 2, 0, 0] }), '#b8914a')])));
  const slot = new THREE.Group(); slot.position.y = 0.02; tray.add(slot);

  root.traverse(o => { o.castShadow = false; o.receiveShadow = false; o.userData.staff = true; });
  return { root, bob, body, face, ring, hands, tray, slot, spec: S, R, bodyScale, top: S.hover + (key === 'barty' ? 1.15 : key === 'mort' ? 0.75 : 0.75), ...extra };
}

// ---- Reginald, the vacuum ------------------------------------------------------------------------
export function buildRoomba() {
  const root = new THREE.Group(); root.userData.staff = true;
  const R = 0.55, parts = [
    paint(T(cyl(R, R * 0.97, 0.2, 36), { p: [0, 0.12, 0] }), '#2b2b30'),
    paint(T(cyl(R * 0.96, R * 0.96, 0.02, 36), { p: [0, 0.225, 0] }), '#3d4047'),
    paint(T(new THREE.TorusGeometry(R * 0.72, 0.014, 6, 40), { p: [0, 0.235, 0], r: [Math.PI / 2, 0, 0] }), '#b9bec4'),
    paint(T(new THREE.CylinderGeometry(R + 0.03, R + 0.03, 0.12, 30, 1, false, -1.25, 2.5), { p: [0, 0.1, 0] }), '#8f959b'),
    paint(T(cyl(0.09, 0.09, 0.025, 20), { p: [0, 0.24, 0.2] }), '#6f747a'),
    paint(T(cyl(0.2, 0.2, 0.01, 24), { p: [0, 0.237, -0.12] }), '#34363c'),
  ];
  // googly eyes, stuck on by Fig
  for (const sx of [-1, 1]) {
    parts.push(paint(T(cyl(0.075, 0.075, 0.02, 18), { p: [sx * 0.12, 0.245, 0.36] }), '#f6f3ec'));
    parts.push(paint(T(cyl(0.035, 0.035, 0.022, 12), { p: [sx * 0.12 + 0.012, 0.248, 0.38] }), '#111'));
  }
  const body = mesh(merge(parts)); root.add(body);
  const led = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), new THREE.MeshBasicMaterial({ color: 0x6dff9a, toneMapped: false }));
  led.position.set(0, 0.25, 0.2); root.add(led);
  const brush = mesh(paint(merge([0, 1, 2].map(i => T(new THREE.BoxGeometry(0.22, 0.01, 0.02), { p: [0.11, 0, 0], r: [0, (i * Math.PI * 2) / 3, 0] }))), '#c9b26a'));
  brush.position.set(-0.32, 0.025, 0.32); root.add(brush);
  root.traverse(o => { o.userData.staff = true; });
  return { root, body, led, brush, top: 0.25, R };
}


// ---- The gardeners --------------------------------------------------------------------------------
// Bramble: a terracotta flowerpot with a round green head growing out of it, a straw hat and a
// watering can. Thistle: a squat, mossy, weatherproof dome in a waxed bucket hat, secateurs in hand.
export const GARDENER_SPECS = {
  bramble: { key: 'bramble', name: 'Bramble', short: 'Bramble', hover: 3.0, radius: 0.8, speed: 2.1,
    face: { eye: '#ffe9c0', gap: 42, eyeW: 34, eyeH: 42, blush: 'rgba(255,140,110,.5)', bg: '#0f140c' }, ring: 0xffd9a0, chirp: [62, 66, 69] },
  thistle: { key: 'thistle', name: 'Thistle', short: 'Thistle', hover: 2.6, radius: 0.85, speed: 1.9,
    face: { eye: '#d6f5b0', gap: 48, eyeW: 30, eyeH: 34, bg: '#0c120a' }, ring: 0xb8f0a0, chirp: [52, 55, 59] },
};
const mud = (base, y0, y1) => p => { const n = Math.sin(p.x * 23 + p.z * 17) * Math.sin(p.y * 31 + p.x * 9); return p.y < y0 + (y1 - y0) * (0.5 + 0.5 * n) ? '#5f4630' : base; };

export function buildGardener(key) {
  const S = GARDENER_SPECS[key];
  const root = new THREE.Group(), bob = new THREE.Group(); root.add(bob); bob.position.y = S.hover; root.userData.staff = true;
  const parts = [], BRASS = '#c9a45c';
  let face, R, ringY, handL, handR, trayAt, tool = [], top;
  if (key === 'bramble') {
    // the pot
    const pot = new THREE.LatheGeometry([[0, -0.56], [0.42, -0.56], [0.5, -0.1], [0.56, 0.36], [0.64, 0.38], [0.65, 0.55], [0.5, 0.55], [0.5, 0.45], [0, 0.45]].map(([r, y]) => new THREE.Vector2(r, y)), 22);
    parts.push(paint(pot, mud('#b8643f', -0.56, -0.15)));
    parts.push(paint(T(cyl(0.5, 0.5, 0.02, 22), { p: [0, 0.47, 0] }), '#4a3424'));                    // soil
    // the head, growing out of it
    R = 0.42; const hs = [1, 0.95, 0.95], hy = 0.82;
    parts.push(paint(T(sph(R, 22, 14), { p: [0, hy, 0], s: hs }), '#7f9a5a'));
    parts.push(paint(T(cyl(0.012, 0.016, 0.16, 5), { p: [0.06, hy + 0.98 * R + 0.25, 0.05], r: [0.2, 0, -0.3] }), '#4f6b3a'));
    for (const [rx, rz, s] of [[0.5, -0.6, 1], [-0.4, 0.7, 0.8]]) parts.push(paint(T(sph(0.09, 8, 5), { p: [0.1 * s, hy + R + 0.3, 0.05], r: [rx, 0, rz], s: [1.6, 0.15, 0.8] }), '#6f9a4a'));
    // straw hat with a green ribbon
    const hat = [paint(T(cyl(0.72, 0.74, 0.03, 28), { p: [0, 0, 0] }), '#d9b866'), paint(T(cyl(0.3, 0.36, 0.26, 22), { p: [0, 0.14, 0] }), '#d4b25e'), paint(T(cyl(0.365, 0.365, 0.07, 22), { p: [0, 0.05, 0] }), '#5e7d4a')]
      .map(g => T(g, { r: [0.12, 0, 0.1] })).map(g => T(g, { p: [0, hy + 0.3, -0.04] }));
    parts.push(...hat);
    face = makeFace(S.face); const vg = visor(R + 0.008, 0.85, 0.85, 1.75, hs); vg.translate(0, hy, 0); face.mesh = mesh(vg, face.mat);
    ringY = -0.75; handL = [-0.78, 0.0, 0.15]; handR = [0.78, 0.0, 0.15]; trayAt = [0.55, 0.05, 0.5]; top = S.hover + 1.5;
    // a galvanised watering can
    tool = [paint(T(cyl(0.17, 0.19, 0.34, 16), { p: [0, -0.2, 0.12] }), '#9aa4a8'), paint(T(cyl(0.022, 0.035, 0.5, 8), { p: [0, -0.12, 0.42], r: [1.0, 0, 0] }), '#9aa4a8'),
      paint(T(cyl(0.06, 0.03, 0.06, 10), { p: [0, 0.02, 0.62], r: [1.0, 0, 0] }), '#8a9498'), paint(T(new THREE.TorusGeometry(0.13, 0.02, 6, 14, Math.PI), { p: [0, -0.03, 0.08], r: [0, Math.PI / 2, 0] }), '#8a9498')];
  } else {
    R = 0.62; const bs = [1.15, 0.85, 1.05];
    parts.push(paint(T(sph(R, 24, 16), { s: bs }), p => { const m = Math.sin(p.x * 19) * Math.sin(p.z * 21 + p.y * 7); return p.y < -0.28 + 0.1 * m ? '#5f4630' : m > 0.55 ? '#4f6b3a' : '#6e8656'; }));
    parts.push(paint(T(new THREE.TorusGeometry(R * 1.15 * 0.985, 0.035, 8, 40), { p: [0, -0.12, 0], r: [Math.PI / 2, 0, 0], s: [1, 1.05 / 1.15, 1] }), BRASS));
    parts.push(paint(T(new THREE.SphereGeometry(0.32, 16, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), { p: [0, -0.46, 0], s: [1, 0.55, 1] }), '#3f4a32'));
    // waxed bucket hat, a little battered
    const hat = [paint(T(cyl(0.34, 0.42, 0.3, 20), { p: [0, 0.15, 0] }), '#5b5a3a'), paint(T(cyl(0.62, 0.44, 0.08, 24), { p: [0, 0.02, 0] }), '#55543a'), paint(T(cyl(0.425, 0.425, 0.05, 20), { p: [0, 0.07, 0] }), '#3e3d29')]
      .map(g => T(g, { r: [-0.08, 0, -0.08] })).map(g => T(g, { p: [0, R * 0.85 - 0.08, 0] }));
    parts.push(...hat);
    face = makeFace(S.face); face.mesh = mesh(visor(R + 0.008, 0.95, 1.0, 1.55, bs), face.mat);
    ringY = -0.6; handL = [-0.9, -0.1, 0.15]; handR = [0.9, -0.1, 0.15]; trayAt = [0.6, -0.1, 0.55]; top = S.hover + 0.9;
    // secateurs, red handles
    tool = [paint(T(new THREE.BoxGeometry(0.03, 0.2, 0.05), { p: [-0.025, 0.12, 0.05], r: [0, 0, 0.12] }), '#b33a2a'), paint(T(new THREE.BoxGeometry(0.03, 0.2, 0.05), { p: [0.025, 0.12, 0.05], r: [0, 0, -0.12] }), '#b33a2a'),
      paint(T(new THREE.BoxGeometry(0.02, 0.13, 0.03), { p: [0, 0.28, 0.05] }), '#c9ccd0')];
  }
  const body = mesh(merge(parts)); bob.add(body, face.mesh);
  const ring = new THREE.Mesh(T(new THREE.TorusGeometry(R * 0.55, 0.032, 8, 30), { r: [Math.PI / 2, 0, 0] }), new THREE.MeshBasicMaterial({ color: S.ring, toneMapped: false, transparent: true, opacity: 0.85 }));
  ring.position.y = ringY; bob.add(ring);
  const glove = paint(T(sph(0.12, 10, 7), { s: [1, 0.85, 1.15] }), key === 'bramble' ? '#c9a46a' : '#3f5a36');
  const hands = [handL, handR].map((p, i) => {
    const h = new THREE.Group(); h.position.set(...p); h.userData.rest = p;
    h.add(mesh(i === (key === 'bramble' ? 1 : 0) ? merge([glove, ...tool]) : glove)); bob.add(h); return h;
  });
  const tray = new THREE.Group(); tray.position.set(...trayAt); tray.visible = false; bob.add(tray);
  tray.add(mesh(merge([paint(T(new THREE.CylinderGeometry(0.3, 0.27, 0.06, 20)), '#8a6a44'), paint(T(new THREE.TorusGeometry(0.3, 0.025, 6, 22), { p: [0, 0.04, 0], r: [Math.PI / 2, 0, 0] }), '#6f5434')])));   // a trug
  const slot = new THREE.Group(); slot.position.y = 0.04; tray.add(slot);
  root.traverse(o => { o.castShadow = false; o.receiveShadow = false; o.userData.staff = true; });
  return { root, bob, body, face, ring, hands, tray, slot, spec: S, R, top, tool: hands[key === 'bramble' ? 1 : 0] };
}

// Thistle's wheelbarrow
export function buildBarrow() {
  const G = '#4f6b4a', parts = [
    paint(T(new THREE.CylinderGeometry(0.9, 0.55, 0.7, 4, 1, true), { p: [0, 1.1, 0], r: [0, Math.PI / 4, 0], s: [1, 1, 1.5] }), G),
    paint(T(new THREE.BoxGeometry(1.0, 0.06, 1.3), { p: [0, 0.76, 0] }), G),
    paint(T(new THREE.BoxGeometry(1.05, 0.08, 1.9), { p: [0, 1.38, 0], s: [1, 1, 1] }), '#4a3424'),               // a load of compost
    paint(T(new THREE.TorusGeometry(0.42, 0.1, 8, 18), { p: [0, 0.45, 1.25], r: [0, Math.PI / 2, 0] }), '#222'),
    paint(T(cyl(0.05, 0.05, 0.2, 6), { p: [0, 0.45, 1.25], r: [0, 0, Math.PI / 2] }), '#888'),
    ...[-0.45, 0.45].flatMap(x => [paint(T(cyl(0.04, 0.04, 2.6, 6), { p: [x, 0.95, -0.3], r: [Math.PI / 2 - 0.25, 0, 0] }), '#8a6a44'), paint(T(cyl(0.035, 0.035, 0.75, 6), { p: [x, 0.38, -0.55] }), '#5b4630')]),
  ];
  const m = mesh(merge(parts)); m.userData.staff = true; return m;
}
