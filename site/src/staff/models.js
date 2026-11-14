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
function mesh(geo, mat = solid()) { const m = new THREE.Mesh(geo, mat); m.castShadow = false; m.receiveShadow = true; return m; }
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

  root.traverse(o => { o.castShadow = false; o.receiveShadow = !!o.isMesh; o.userData.staff = true; });
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
// galvanised watering can (carried in her left hand). Thistle: a squat, mossy, sage-green dome crowned with a
// thistle in flower (green calyx, purple tuft), in a worn leather belt with a satchel on his right hip for his
// small tools and a hand fork stuck in beside it; the light under him is purple too.
// Each hand is a group holding one mesh per thing it can hold (the glove alone, or the glove merged with
// a tool); exactly one is visible, so a tool in the hand costs no draw call of its own. The tools' working
// ends are given in the hand's frame (TOOL_TIPS), so gardeners.js can put them where the work is.
export const GARDENER_SPECS = {
  bramble: { key: 'bramble', name: 'Bramble', short: 'Bramble', hover: 3.0, radius: 0.8, speed: 2.1,
    face: { eye: '#ffe9c0', gap: 42, eyeW: 34, eyeH: 42, blush: 'rgba(255,140,110,.5)', bg: '#0f140c' }, ring: 0xffd9a0, chirp: [62, 66, 69] },
  thistle: { key: 'thistle', name: 'Thistle', short: 'Thistle', hover: 2.6, radius: 0.85, speed: 1.9,
    face: { eye: '#d6f5b0', gap: 48, eyeW: 30, eyeH: 34, bg: '#0c120a' }, ring: 0xc9a2ee, chirp: [52, 55, 59] },
};
const mud = (base, y0, y1) => p => { const n = Math.sin(p.x * 23 + p.z * 17) * Math.sin(p.y * 31 + p.x * 9); return p.y < y0 + (y1 - y0) * (0.5 + 0.5 * n) ? '#5f4630' : base; };
const STEEL = '#c3c8cc', STEEL_D = '#8f969b', WOOD = '#9a7348', TIN = '#9aa4a8';
// The working end of each tool, in the hand's frame (feet; the glove is at the origin, +z is forward)
export const TOOL_TIPS = { can: [0, -0.085, 0.6], secateurs: [0, 0.0, 0.4], trowel: [0, -0.01, 0.46], smoker: [0, 0.33, 0.3], broom: [0, -2.62, 0] };
// Tools, built about the glove
const toolGeo = {
  can: () => [
    paint(T(cyl(0.17, 0.19, 0.34, 16), { p: [0, -0.3, 0] }), TIN),
    paint(T(cyl(0.172, 0.172, 0.03, 16), { p: [0, -0.14, 0] }), '#b5bdc0'),
    paint(T(cyl(0.175, 0.175, 0.025, 16), { p: [0, -0.4, 0] }), '#b5bdc0'),
    paint(T(new THREE.TorusGeometry(0.14, 0.022, 6, 14, Math.PI), { p: [0, -0.13, 0], r: [0, Math.PI / 2, 0] }), '#8a9498'),        // the handle, over the top
    paint(T(cyl(0.022, 0.034, 0.47, 8), { p: [0, -0.27, 0.34], r: [0.92, 0, 0] }), TIN),                                        // the spout
    paint(T(cyl(0.062, 0.03, 0.06, 12), { p: [0, -0.1, 0.56], r: [0.92, 0, 0] }), '#8a9498'),                                     // and its rose
    paint(T(cyl(0.058, 0.058, 0.008, 12), { p: [0, -0.083, 0.585], r: [0.92, 0, 0] }), '#6c767a'),
  ],
  secateurs: () => [
    paint(T(new THREE.BoxGeometry(0.035, 0.03, 0.24), { p: [-0.028, 0, 0.1], r: [0, 0.1, 0] }), '#b33a2a'),
    paint(T(new THREE.BoxGeometry(0.035, 0.03, 0.24), { p: [0.028, 0, 0.1], r: [0, -0.1, 0] }), '#b33a2a'),
    paint(T(cyl(0.025, 0.025, 0.05, 8), { p: [0, 0, 0.23] }), STEEL_D),
    paint(T(new THREE.BoxGeometry(0.018, 0.04, 0.17), { p: [-0.012, 0.004, 0.32], r: [0, -0.12, 0] }), STEEL),
    paint(T(new THREE.BoxGeometry(0.018, 0.03, 0.15), { p: [0.012, -0.004, 0.31], r: [0, 0.16, 0] }), STEEL_D),
  ],
  trowel: () => [
    paint(T(cyl(0.035, 0.03, 0.24, 8), { p: [0, 0, 0.02], r: [Math.PI / 2, 0, 0] }), WOOD),
    paint(T(cyl(0.03, 0.022, 0.06, 8), { p: [0, 0, 0.16], r: [Math.PI / 2, 0, 0] }), STEEL_D),
    paint(T(sph(1, 10, 6), { p: [0, -0.01, 0.31], s: [0.075, 0.018, 0.16] }), STEEL),
  ],
  smoker: () => [
    paint(T(new THREE.BoxGeometry(0.1, 0.06, 0.22), { p: [0, -0.04, 0.02] }), '#7b5434'),                    // the bellows, in the hand
    paint(T(new THREE.BoxGeometry(0.11, 0.025, 0.24), { p: [0, -0.085, 0.02] }), '#5b3d24'),
    paint(T(cyl(0.095, 0.095, 0.26, 14), { p: [0, 0.08, 0.17] }), '#b9b6ad'),                              // the fire can
    paint(T(new THREE.ConeGeometry(0.1, 0.1, 14), { p: [0, 0.26, 0.17] }), '#a19e95'),
    paint(T(cyl(0.022, 0.03, 0.11, 8), { p: [0, 0.3, 0.24], r: [0.9, 0, 0] }), '#8c897f'),                   // nozzle, bent forward
  ],
  broom: () => [
    paint(T(cyl(0.035, 0.035, 2.6, 8), { p: [0, -0.85, 0] }), WOOD),
    paint(T(cyl(0.07, 0.07, 0.12, 10), { p: [0, -2.15, 0] }), '#5b4630'),
    paint(T(new THREE.ConeGeometry(0.2, 0.48, 12, 1, true), { p: [0, -2.4, 0], s: [1, 1, 0.75] }), '#c2a35e'),       // a besom of birch twigs
    paint(T(cyl(0.2, 0.2, 0.02, 12), { p: [0, -2.635, 0], s: [1, 1, 0.75] }), '#a98a4c'),
  ],
};

export function buildGardener(key) {
  const S = GARDENER_SPECS[key];
  const root = new THREE.Group(), bob = new THREE.Group(); root.add(bob); bob.position.y = S.hover; root.userData.staff = true;
  const parts = [], BRASS = '#c9a45c';
  let face, R, ringY, handL, handR, trayAt, top, holster, tools;
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
    // a canvas pouch hung on the rim, front right: her secateurs and the koi food live in it
    const pa = -0.75, px = -0.4, pz = 0.4;
    parts.push(paint(T(new THREE.BoxGeometry(0.26, 0.24, 0.1), { p: [px, 0.2, pz], r: [0.08, pa, 0] }), '#cdbb8e'));
    parts.push(paint(T(new THREE.BoxGeometry(0.27, 0.09, 0.115), { p: [px, 0.3, pz + 0.005], r: [0.08, pa, 0] }), '#b8a676'));
    parts.push(paint(T(new THREE.BoxGeometry(0.03, 0.2, 0.03), { p: [px - 0.07, 0.43, pz - 0.07], r: [0, pa, 0] }), '#8a7a52'));
    parts.push(paint(T(new THREE.BoxGeometry(0.03, 0.2, 0.03), { p: [px + 0.07, 0.43, pz - 0.07], r: [0, pa, 0] }), '#8a7a52'));
    parts.push(paint(T(new THREE.BoxGeometry(0.025, 0.14, 0.03), { p: [px + 0.03, 0.39, pz + 0.02], r: [0.2, pa, 0.1] }), '#b33a2a'));      // a red handle peeping out
    holster = [px + 0.05, 0.3, pz + 0.12];
    face = makeFace(S.face); const vg = visor(R + 0.008, 0.85, 0.85, 1.75, hs); vg.translate(0, hy, 0); face.mesh = mesh(vg, face.mat);
    ringY = -0.75; handL = [-0.78, 0.0, 0.15]; handR = [0.78, 0.0, 0.15]; trayAt = [-0.55, 0.05, 0.5]; top = S.hover + 1.5;
    tools = [['secateurs'], ['can']];
  } else {
    R = 0.62; const bs = [1.15, 0.85, 1.05];
    parts.push(paint(T(sph(R, 24, 16), { s: bs }), p => { const m = Math.sin(p.x * 19) * Math.sin(p.z * 21 + p.y * 7); return p.y < -0.28 + 0.1 * m ? '#6a4f36' : m > 0.55 ? '#5f7f4a' : '#9bb09a'; }));        // weathered sage (greyer and cooler than Bramble's leaf green), mossy patches, mud below
    parts.push(paint(T(new THREE.TorusGeometry(R * 1.15 * 0.985, 0.045, 8, 40), { p: [0, -0.12, 0], r: [Math.PI / 2, 0, 0], s: [1, 1.05 / 1.15, 1] }), '#6b4a2e'));      // a worn leather belt
    parts.push(paint(T(new THREE.BoxGeometry(0.15, 0.12, 0.04), { p: [0, -0.12, R * 1.05 * 0.985 + 0.04] }), BRASS));                                                  // and its buckle
    parts.push(paint(T(new THREE.SphereGeometry(0.32, 16, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), { p: [0, -0.46, 0], s: [1, 0.55, 1] }), '#3f4a32'));
    // His own crown, where the bucket hat was: a thistle in flower. The ribbed green calyx, two rings of bracts
    // standing out from it, and a soft tuft of purple bristles: he is told from Bramble (and from the lawn) by
    // his outline and by the purple, from as far off as he can be seen.
    {
      const crown = [], v2 = ([a, b]) => new THREE.Vector2(a, b), spike = (r, h, tilt, a, rad, y) => new THREE.ConeGeometry(r, h, 4).translate(0, h / 2, 0).rotateZ(-tilt).translate(rad, y, 0).rotateY(-a);
      crown.push(paint(new THREE.LatheGeometry([[0.001, 0], [0.2, 0], [0.3, 0.09], [0.32, 0.21], [0.25, 0.33], [0.18, 0.4], [0.001, 0.4]].map(v2), 12), p => (Math.floor((Math.atan2(p.z, p.x) / (Math.PI * 2) + 0.5) * 12) % 2 ? '#47703f' : '#5f8a50')));
      for (const [y, rad, n, off] of [[0.1, 0.27, 8, 0], [0.24, 0.27, 8, 0.39]]) for (let i = 0; i < n; i++) crown.push(paint(spike(0.04, 0.17, 1.0, (i / n) * Math.PI * 2 + off, rad, y), '#3f6638'));
      const purple = p => (p.y > 0.66 ? '#c9a0ea' : '#8f52bd');
      crown.push(paint(new THREE.ConeGeometry(0.17, 0.44, 8).translate(0, 0.58, 0), purple));
      for (const [tilt, n, off] of [[0.16, 6, 0.2], [0.42, 12, 0]]) for (let i = 0; i < n; i++) crown.push(paint(spike(0.045, 0.5, tilt, (i / n) * Math.PI * 2 + off, 0.1, 0.36), purple));
      parts.push(...crown.map(g => T(g, { r: [-0.06, 0, -0.07] })).map(g => T(g, { p: [0, R * 0.85 - 0.07, 0] })));
    }
    // a leather satchel on the belt, right hip: secateurs, trowel, smoker, the koi food
    const pa = -1.03, px = -0.52, pz = 0.31;
    parts.push(paint(T(new THREE.BoxGeometry(0.34, 0.3, 0.14), { p: [px, -0.3, pz], r: [0.1, pa, 0] }), '#6b4a2e'));
    parts.push(paint(T(new THREE.BoxGeometry(0.35, 0.12, 0.155), { p: [px, -0.19, pz + 0.004], r: [0.1, pa, 0] }), '#5a3d25'));
    parts.push(paint(T(new THREE.BoxGeometry(0.05, 0.05, 0.03), { p: [px + 0.07, -0.22, pz + 0.07], r: [0.1, pa, 0] }), BRASS));
    parts.push(paint(T(cyl(0.022, 0.022, 0.16, 6), { p: [px + 0.04, -0.06, pz - 0.02], r: [0.15, 0, 0.2] }), WOOD));          // the trowel's handle
    for (const k of [-1, 0, 1]) parts.push(paint(T(new THREE.BoxGeometry(0.016, 0.17, 0.016), { p: [px - 0.07 + k * 0.035, -0.03, pz + 0.0 - k * 0.02], r: [0.1, 0, -0.12] }), STEEL));      // a hand fork, tines up
    parts.push(paint(T(new THREE.BoxGeometry(0.1, 0.022, 0.02), { p: [px - 0.07, -0.115, pz], r: [0.1, 0.5, -0.12] }), STEEL_D));
    holster = [px + 0.08, -0.12, pz + 0.12];
    face = makeFace(S.face); face.mesh = mesh(visor(R + 0.008, 0.95, 1.0, 1.55, bs), face.mat);
    ringY = -0.6; handL = [-0.9, -0.1, 0.15]; handR = [0.9, -0.1, 0.15]; trayAt = [0.6, -0.1, 0.55]; top = S.hover + 1.35;
    tools = [['secateurs', 'trowel', 'smoker', 'broom'], []];
  }
  const body = mesh(merge(parts)); bob.add(body, face.mesh);
  const ring = new THREE.Mesh(T(new THREE.TorusGeometry(R * 0.55, 0.032, 8, 30), { r: [Math.PI / 2, 0, 0] }), new THREE.MeshBasicMaterial({ color: S.ring, toneMapped: false, transparent: true, opacity: 0.85 }));
  ring.position.y = ringY; bob.add(ring);
  const glove = () => paint(T(sph(0.12, 10, 7), { s: [1, 0.85, 1.15] }), key === 'bramble' ? '#c9a46a' : '#b08a4e');       // leather gardening gloves, both
  // hands[0] is the right hand (-x: everyone faces +z), hands[1] the left
  const hands = [handL, handR].map((p, i) => {
    const h = new THREE.Group(); h.position.set(...p); h.userData.rest = p;
    const v = { glove: mesh(glove()) };
    for (const k of tools[i]) { v[k] = mesh(merge([glove(), ...toolGeo[k]()])); v[k].visible = false; }
    for (const k in v) h.add(v[k]);
    h.userData.variants = v; h.userData.holding = 'glove';
    bob.add(h); return h;
  });
  const tray = new THREE.Group(); tray.position.set(...trayAt); tray.visible = false; bob.add(tray);
  tray.add(mesh(merge([paint(T(new THREE.CylinderGeometry(0.3, 0.27, 0.06, 20)), '#8a6a44'), paint(T(new THREE.TorusGeometry(0.3, 0.025, 6, 22), { p: [0, 0.04, 0], r: [Math.PI / 2, 0, 0] }), '#6f5434')])));   // a trug
  const slot = new THREE.Group(); slot.position.y = 0.04; tray.add(slot);
  root.traverse(o => { o.castShadow = false; o.receiveShadow = !!o.isMesh; o.userData.staff = true; });
  return { root, bob, body, face, ring, hands, tray, slot, spec: S, R, top, holster, tool: hands[0] };
}
// Show what a hand holds ('glove' for nothing); returns false if this hand cannot hold it
export function holdInHand(hand, what) {
  const v = hand.userData.variants; if (!v[what]) return false;
  if (hand.userData.holding !== what) { v[hand.userData.holding].visible = false; v[what].visible = true; hand.userData.holding = what; }
  return true;
}

// ---- Thistle's wheelbarrow ---------------------------------------------------------------------------
// A small proper mechanism. root stands at the wheel's contact with the ground and turns with the barrow
// (+z toward the wheel); pivot sits at the axle and tips the barrow about it (rotation.x > 0 lifts the
// handles); the wheel spins in it. The body's geometry is swapped for the load it carries (each variant
// merged once, on first use), so a load costs no draw call; the wheel is the barrow's one extra.
export const BARROW = { wheelR: 0.44, grips: [[-0.43, 0.43, -2.78], [0.43, 0.43, -2.78]], legs: [[-0.37, -0.44, -1.62], [0.37, -0.44, -1.62]], tray: [0, 0.62, -1.0], len: 2.78 };
const LOADS = {
  weeds: () => { const out = []; for (let i = 0; i < 9; i++) { const a = i * 2.4, r = 0.12 + (i % 3) * 0.12; out.push(paint(T(new THREE.IcosahedronGeometry(0.17, 0), { p: [Math.cos(a) * r * 1.3, 0.62 + (i % 2) * 0.07, -1.0 + Math.sin(a) * r * 1.6], r: [i, i * 2, 0], s: [1.2, 0.6, 1] }), ['#5f7d3a', '#78944a', '#4f6a33', '#8a9a52'][i % 4])); }
    for (let i = 0; i < 5; i++) out.push(paint(T(cyl(0.012, 0.012, 0.4, 4), { p: [-0.2 + i * 0.1, 0.78, -1.05 + (i % 2) * 0.2], r: [0.6 + i * 0.3, i, 0.4] }), '#6a7d3c'));
    return out; },
  leaves: () => { const out = []; for (let i = 0; i < 12; i++) { const a = i * 2.1, r = 0.1 + (i % 4) * 0.1; out.push(paint(T(sph(0.13, 6, 4), { p: [Math.cos(a) * r * 1.4, 0.6 + (i % 3) * 0.05, -1.0 + Math.sin(a) * r * 1.7], r: [0.3 * i, i, 0], s: [1.3, 0.25, 1] }), ['#b8742e', '#c99a3e', '#8f5a2a', '#a8642c'][i % 4])); } return out; },
  compost: () => { const out = []; for (let i = 0; i < 10; i++) { const a = i * 2.3, r = 0.08 + (i % 3) * 0.12; out.push(paint(T(new THREE.IcosahedronGeometry(0.19, 0), { p: [Math.cos(a) * r * 1.3, 0.6 + (i % 2) * 0.08, -1.0 + Math.sin(a) * r * 1.6], r: [i, i * 1.7, 0], s: [1.3, 0.55, 1.1] }), ['#3e2c1e', '#4a3424', '#35271b', '#5a4330'][i % 4])); }
    for (let i = 0; i < 4; i++) out.push(paint(T(new THREE.BoxGeometry(0.02, 0.02, 0.22), { p: [-0.2 + i * 0.13, 0.74, -1.0 + (i % 2) * 0.25], r: [0.2, i * 0.8, 0.1] }), '#b59a5a'));      // bits of straw
    return out; },
};
export const BARROW_LOADS = Object.keys(LOADS);
export function buildBarrow() {
  const G = '#4f6b4a', G2 = '#5c7a56', IRON = '#2f3433', { wheelR: WR } = BARROW;
  // the tray: a pressed steel tub, deeper at the back, its front raked forward over the wheel
  const skew = g => { const a = g.attributes.position; for (let i = 0; i < a.count; i++) { const y = a.getY(i) + 0.26, z = a.getZ(i); if (z > 0) a.setZ(i, z + y * 0.55); } return g; };
  const tub = new THREE.CylinderGeometry(0.78, 0.5, 0.52, 4, 2, true); tub.rotateY(Math.PI / 4); tub.scale(1, 1, 1.32); skew(tub); tub.computeVertexNormals();
  const inner = tub.toNonIndexed(); inner.scale(-0.985, 1, 0.985); inner.computeVertexNormals();          // the inside, facing in (mirrored, so its faces turn inward)
  const rim = new THREE.TorusGeometry(0.78, 0.028, 5, 4); rim.rotateZ(Math.PI / 4); rim.scale(1, 1.32, 1); rim.rotateX(Math.PI / 2); rim.translate(0, 0.26, 0); skew(rim);
  const parts = [
    paint(T(tub, { p: [0, 0.48, -1.0] }), G), paint(T(inner, { p: [0, 0.48, -1.0] }), G2),
    paint(T(new THREE.BoxGeometry(0.7, 0.03, 0.92), { p: [0, 0.235, -1.0] }), G2),
    paint(T(rim, { p: [0, 0.48, -1.0] }), '#3f5a3c'),      // rolled rim
  ];
  // shafts: from the axle back under the tray to the grips; forks to the axle, legs, a stay
  for (const s of [-1, 1]) {
    const a = [s * 0.12, 0, 0.02], b = [s * 0.36, 0.2, -1.3], c = [s * 0.43, 0.43, -2.6];
    for (const [p, q, r] of [[a, b, 0.032], [b, c, 0.032]]) {
      const dx = q[0] - p[0], dy = q[1] - p[1], dz = q[2] - p[2], L = Math.hypot(dx, dy, dz), g = cyl(r, r, L, 7);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(dx / L, dy / L, dz / L)));
      parts.push(paint(T(g, { p: [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2] }), WOOD));
    }
    parts.push(paint(T(cyl(0.048, 0.044, 0.32, 8), { p: [s * 0.43, 0.43, -2.76], r: [Math.PI / 2 - 0.17, 0, 0] }), '#3a2f26'));          // rubber grips
    parts.push(paint(T(cyl(0.022, 0.022, 0.62, 6), { p: [s * 0.36, -0.13, -1.56], r: [-0.12, 0, 0] }), IRON));                           // legs
    parts.push(paint(T(new THREE.BoxGeometry(0.1, 0.03, 0.14), { p: [s * 0.37, -0.43, -1.62] }), IRON));
    parts.push(paint(T(cyl(0.016, 0.016, 0.62, 5), { p: [s * 0.2, 0.18, -0.4], r: [1.35, 0, -s * 0.2] }), IRON));                         // tray stay
  }
  parts.push(paint(T(cyl(0.02, 0.02, 0.74, 5), { p: [0, -0.13, -1.53], r: [0, 0, Math.PI / 2] }), IRON));                                   // leg brace
  parts.push(paint(T(cyl(0.03, 0.03, 0.3, 8), { p: [0, 0, 0], r: [0, 0, Math.PI / 2] }), IRON));                                           // axle
  const base = parts.map(g => g.index ? g.toNonIndexed() : g);
  const cache = {};
  const geoFor = (load, broom) => {
    const k = `${load}|${broom}`; if (cache[k]) return cache[k];
    const extra = [...(LOADS[load]?.() ?? [])];
    if (broom) extra.push(paint(T(cyl(0.032, 0.032, 2.2, 7), { p: [0.12, 0.78, -1.25], r: [1.438, 0, 0] }), WOOD), paint(T(new THREE.ConeGeometry(0.19, 0.45, 10, 1, true), { p: [0.12, 0.96, 0.09], r: [1.438 + Math.PI, 0, 0], s: [1, 1, 0.7] }), '#c2a35e'));      // the broom rides along, head over the wheel
    return (cache[k] = merge([...base, ...extra.map(g => g.index ? g.toNonIndexed() : g)]));
  };
  const root = new THREE.Group(), pivot = new THREE.Group(); pivot.position.y = WR; root.add(pivot);
  const body = mesh(geoFor('', false)); pivot.add(body);
  const wheel = mesh(merge([
    paint(T(new THREE.TorusGeometry(WR - 0.075, 0.075, 8, 22), { r: [0, Math.PI / 2, 0] }), '#232323'),
    paint(T(new THREE.TorusGeometry(WR - 0.15, 0.025, 5, 20), { r: [0, Math.PI / 2, 0] }), '#9a3a2a'),
    paint(T(cyl(0.07, 0.07, 0.16, 10), { r: [0, 0, Math.PI / 2] }), '#9a3a2a'),
    ...[0, 1, 2, 3, 4, 5].map(i => paint(T(new THREE.BoxGeometry(0.03, WR * 2 - 0.3, 0.03), { r: [(i * Math.PI) / 6, 0, 0] }), '#9a3a2a')),
  ].map(g => g.index ? g.toNonIndexed() : g)));
  pivot.add(wheel);
  root.userData.barrow = { pivot, body, wheel, load: '', broom: false, setLoad(load, broom = this.broom) { if (load === this.load && broom === this.broom) return; this.load = load; this.broom = broom; body.geometry = geoFor(load, broom); } };
  root.traverse(o => { o.castShadow = false; o.receiveShadow = !!o.isMesh; o.userData.staff = true; });
  return root;
}
