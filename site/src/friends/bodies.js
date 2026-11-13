// Bodies for the three friends, in the same family as the household staff
// (staff/models.js): a floating round body, a glowing face, a ring of light
// underneath and two mitten hands. Each solid part is one merged, vertex-coloured
// mesh sharing the staff's material, so a guest is five draw calls: body, face, ring and two
// hands (six when Geneva has her coffee, six for Nano with his chest screen). No lights, no
// shadows cast; everything receives them. Units are feet; everyone faces +z in their own frame.
//
//   Professor Feynbot  shirt-sleeves and navy, springy wire curls, a pair of bongos
//   Geneva             raspberry pink, lashes, a long side-swept blowout with a balayage (espresso
//                      roots to blonde ends), tucked behind one ear to show a gold hoop; a fine
//                      gold chain with a heart, gold bangles, a lilac handbag, a heart of light
//   nanoKarpathy       tall, a graphite hoodie with drawstrings, orange headphones, and a live
//                      training run on a little screen on his front

import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { paint, solid, makeFace, useThree } from '../staff/models.js';

let THREE;
export function useThreeBodies(T) { THREE = T; useThree(T); }

export const GUEST_SPECS = {
  feyn: { key: 'feyn', hover: 3.5, radius: 0.8, speed: 2.5, face: { eye: '#ffd9a0', gap: 44, eyeW: 32, eyeH: 40, bg: '#14100b' }, ring: 0xffb866, chirp: [57, 62, 66] },
  gigi: { key: 'gigi', hover: 3.62, radius: 0.72, speed: 2.7, face: { eye: '#ffd3ea', gap: 42, eyeW: 36, eyeH: 44, blush: 'rgba(255,110,160,.6)', bg: '#1a0b14' }, ring: 0xff8fc0, chirp: [76, 81, 84] },
  nano: { key: 'nano', hover: 4.35, tall: 1.34, radius: 0.78, speed: 2.4, face: { eye: '#bfeaff', gap: 46, eyeW: 30, eyeH: 30, bg: '#0a1016' }, ring: 0x7fd4ff, chirp: [69, 72, 76] },
};

const Tf = (geo, { p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1] } = {}) =>
  geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...s)));
const merge = list => mergeGeometries(list, false);
const sph = (r, w = 20, h = 14) => new THREE.SphereGeometry(r, w, h);
const cyl = (r0, r1, h, s = 18) => new THREE.CylinderGeometry(r0, r1, h, s);
const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
const mesh = (geo, mat = solid()) => { const m = new THREE.Mesh(geo, mat); m.castShadow = false; m.receiveShadow = true; return m; };
// A patch of sphere that follows the body's curve (the face screen, a shirt front)
function visor(r, phi, th0, th1, scale) { const g = new THREE.SphereGeometry(r, 18, 9, Math.PI / 2 - phi, phi * 2, th0, th1 - th0); g.scale(...scale); return g; }
// A point on the body's surface: azimuth a (0 = front), polar angle th from the top
const onBody = (R, bs, a, th, out = 0) => [(R + out) * Math.sin(th) * Math.sin(a) * bs[0], (R + out) * Math.cos(th) * bs[1], (R + out) * Math.sin(th) * Math.cos(a) * bs[2]];

const sm = (e0, e1, x) => { const k = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return k * k * (3 - 2 * k); };
// Gold, a touch lighter on top, so it catches the light like metal even in a vertex-coloured mesh
const GOLD = '#e2ae3c';
const shine = c => { const lo = new THREE.Color(GOLD), hi = new THREE.Color('#ffe7a0'), o = new THREE.Color(); return p => o.lerpColors(lo, hi, sm(-0.02, 0.06, p.y - c[1])); };

// Geneva's hair: a long blowout with a deep side part. One smooth shell, a sheet lifted off the body
// (a string of spheres read as beads). In front it is a curtain down one side of her face and tucked
// behind the ear on the other, so the hoop shows. Behind, it must not read as a cap: the parting runs
// back over the crown as a groove the hair falls away from, the lengths hang longer and narrower than
// her widest point and taper in towards the ends, and the surface turns in broad curved bends (a
// blowout's waves) that finish in soft points along a U-shaped hem. Each column of the shell runs from
// the crown down to its own length; its lift goes under at the hem and thins to nothing at the face
// edge, so no edge shows as a cut sheet. Coloured as a balayage: deep espresso at the root, caramel
// through the lengths, cool pale-blonde ribbons on the crests of the waves (cooler than the gold, so
// the two do not merge at a distance) and two bright pieces framing the face.
const HAIR_CURTAIN = -0.95, HAIR_EAR = 0.95, HAIR_BACK = 2.1, HOOP_A = 1.36, PART_X = 0.115;
const wave = (a, t) => Math.cos(a * 7 - 1.7 * (t - 1.4));       // the bends, curving as they fall
function hair(R, bs) {
  const E1 = HAIR_CURTAIN, E2 = HAIR_EAR, E3 = HAIR_BACK;
  const line = a => (a > 0.4 ? 0.64 + 0.04 * sm(0.4, E2, a) : 0.64 + 0.05 * sm(0.4, E1, a));             // the hairline over the face, highest at the parting
  // a U-shaped hem, longest at the middle of the back, each bend ending in a soft point; behind the
  // ear it sweeps up over the hoop and back down again
  const back = a => { const A = Math.abs(a), L = 1.9 + 0.55 * sm(1.6, Math.PI, A); return L + 0.1 * Math.max(-0.4, wave(a, L)) * sm(1.5, 2.3, A); };
  const len = a => (a <= E1 ? back(a) + 0.1 * sm(-2.3, E1, a) : a < E2 ? line(a) : a < E3 ? line(E2) + (back(E3) - line(E2)) * sm(E2, E3, a) ** 1.8 : back(a));
  const cols = []; for (let i = 0; i < 60; i++) cols.push(-Math.PI + (i / 60) * Math.PI * 2);
  for (const e of [E1, E2]) for (const d of [-0.04, -0.012, 0.012, 0.04]) cols.push(e + d);
  cols.sort((p, q) => p - q);
  const NV = 22, pos = [], idx = [];
  for (const a of cols) {
    const L = len(a), edge = a <= E1 ? [E1 - a, line(E1 + 0.01)] : null, sleek = a > E2 && a < E3 ? 1 - 0.45 * Math.sin(Math.PI * (a - E2) / (E3 - E2)) : 1;
    const behind = sm(1.5, 2.4, Math.abs(a));                            // 0 at her sides and front, 1 down the back
    let rho = 0, yEq = 0;
    for (let i = 0; i <= NV; i++) {
      const v = i / NV, t = L * (0.55 * v + 0.45 * v * v);             // rows closer together over the crown, where the parting is
      let h = (0.04 + (0.03 - 0.024 * behind) * sm(0.15, 1.25, t) + 0.025 * sm(0.2, -1.4, a) * sm(0.1, 0.7, t)) * (t > 0.5 ? sleek : 1);
      h += (0.008 + 0.02 * behind) * wave(a, t) * sm(0.35 - 0.2 * behind, 1.1 - 0.3 * behind, t);       // from the crown down, behind
      if (edge) h *= 1 - (1 - sm(0, 0.35, edge[0])) * sm(edge[1] - 0.2, edge[1] + 0.02, t);    // the curtain thins to nothing beside the face, under the fringe
      let P = onBody(R, bs, a, t, h);
      // the parting: a groove from the front hairline back over the crown, fading behind it
      const g = Math.exp(-(((P[0] - PART_X) / 0.035) ** 2)) * sm(-0.32, -0.05, P[2]) * sm(0.15, 0.35, P[1]);
      if (g > 0.01) P = onBody(R, bs, a, t, h - 0.03 * g);
      // below her widest point the lengths fall instead of hugging the ball, and down the back they
      // draw in towards the ends, so from behind she is no wider than her body
      const r = Math.hypot(P[0], P[2]);
      if (r >= rho) { rho = r; yEq = P[1]; } else { const f = Math.max(r, rho - (0.12 + 0.42 * behind) * (yEq - P[1]), R * Math.sin(t) + 0.012) / r; P[0] *= f; P[2] *= f; }
      const k = sm(L > 1 ? 0.86 : 0.8, 1, v), B = onBody(R, bs, a, t, -0.012);
      pos.push(P[0] + (B[0] - P[0]) * k, P[1] + (B[1] - P[1]) * k, P[2] + (B[2] - P[2]) * k);
    }
  }
  const C = cols.length;
  for (let j = 0; j < C; j++) for (let i = 0; i < NV; i++) {
    const p = j * (NV + 1) + i, q = ((j + 1) % C) * (NV + 1) + i;
    idx.push(p, p + 1, q, q, p + 1, q + 1);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const ROOT = new THREE.Color('#3e2516'), MID = new THREE.Color('#8a5a33'), TIP = new THREE.Color('#f1e2c2'), o = new THREE.Color();
  return paint(g, p => {
    const a = Math.atan2(p.x, p.z), t = Math.atan2(Math.hypot(p.x, p.z), p.y / bs[1]);
    const u = sm(0.35, 1.8, t), crest = Math.max(0, wave(a, t)) ** 2, ribbon = Math.max(0, Math.sin(a * 11 + 1.3 * Math.sin(a * 3))) ** 2;
    const money = ((a < E1 ? 1 - sm(0, 0.3, E1 - a) : 0) + (a > E2 && a < E2 + 0.5 ? 1 - sm(0, 0.5, a - E2) : 0)) * sm(0.35, 0.8, t);
    const part = Math.exp(-(((p.x - PART_X) / 0.03) ** 2)) * sm(-0.32, -0.05, p.z) * sm(0.15, 0.35, p.y);
    o.lerpColors(ROOT, MID, sm(0.3, 1.1, t) * (1 - part)).lerp(TIP, Math.min(1, u * (0.3 + 0.35 * ribbon + 0.45 * crest) + 0.75 * money));
    return o.multiplyScalar(1 - 0.22 * Math.max(0, -wave(a, t)) * sm(0.25, 0.9, t) * sm(1.3, 2.2, Math.abs(a)));     // shadowed between the bends
  });
}

// The staff's faces, with a little extra drawn over the top (brows, lashes), and
// redrawn only when the expression really changes
function face(spec, extra) {
  const f = makeFace(spec), g = f.canvas.getContext('2d'), base = f.draw;
  let le = '', lq = 99, lb = null;
  f.draw = (expr = 'neutral', look = 0, blink = false) => {
    const q = Math.round(look * 4);
    if (expr === le && q === lq && blink === lb) return;
    le = expr; lq = q; lb = blink;
    base(expr, look, blink);
    if (extra) { g.save(); g.strokeStyle = g.fillStyle = spec.eye; g.lineCap = 'round'; g.shadowColor = spec.eye; g.shadowBlur = 8; extra(g, expr, 128 - spec.gap + look * 14, 128 + spec.gap + look * 14, 56, blink); g.restore(); f.mat.emissiveMap.needsUpdate = true; }
  };
  le = 'x'; f.draw('neutral', 0, false);
  return f;
}

// nanoKarpathy's chest: a live training run on a little screen. The loss draws itself left to right,
// noisy, falling fast then slowly, now and then a spike or a plateau before the learning-rate drop, a
// fainter validation line above it; when it has converged it ticks, rests, and a new run starts with a
// fresh seed. Redrawn from the panel's own onBeforeRender at most ~9 times a second, so it costs
// nothing when he is off screen, and nothing is allocated per frame (the runs and labels are made up
// front, the arrays are refilled in place). Dimmer than his face: it is a screen, not a lamp.
const LW = 128, LH = 96, LN = 90, X0 = 16, X1 = 122, Y0 = 13, Y1 = 80, LMAX = 3;
const STEP_LABELS = Array.from({ length: LN + 1 }, (_, i) => (i * 55 / 1000).toFixed(1) + 'k');
const RUN_LABELS = Array.from({ length: 100 }, (_, i) => 'run ' + (i + 1));
function lossPanel(geo) {
  const c = document.createElement('canvas'); c.width = LW; c.height = LH;
  const g = c.getContext('2d'), tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({ color: 0x040607, roughness: 0.2, metalness: 0, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.95, envMapIntensity: 0.8 });
  const m = mesh(geo, mat), train = new Float32Array(LN), val = new Float32Array(LN);
  const bg = g.createLinearGradient(0, 0, 0, LH); bg.addColorStop(0, '#0d1a1c'); bg.addColorStop(1, '#060b0d');
  let run = -1, i = 0, hold = 0, last = -1e9, fresh = false;
  const X = k => X0 + (X1 - X0) * k / (LN - 1), Y = l => Y1 - (Y1 - Y0) * Math.min(1, l / LMAX);
  function newRun() {
    run = (run + 1) % RUN_LABELS.length; i = 0; hold = 0;
    const R = Math.random, start = 2.5 + 0.4 * R(), floor = 0.28 + 0.25 * R(), tau = 8 + 9 * R();
    const spike = R() < 0.7 ? 22 + Math.floor(45 * R()) : -1, amp = 0.4 + 0.5 * R(), plateau = R() < 0.5 ? 0.25 + 0.2 * R() : 0, drop = 45 + 25 * R();
    let n = 0, nv = 0;
    for (let k = 0; k < LN; k++) {
      n = 0.55 * n + 0.45 * (R() - 0.5); nv = 0.8 * nv + 0.2 * (R() - 0.5);
      const ideal = floor + (start - floor) * Math.exp(-k / tau) + plateau / (1 + Math.exp((k - drop) / 2.5));
      train[k] = ideal + n * (0.12 + 0.12 * ideal) + (spike >= 0 && k >= spike ? amp * Math.exp(-(k - spike) / 2.5) : 0);
      val[k] = ideal * 1.06 + 0.16 + 0.35 * Math.max(0, k - 55) / LN + nv * 0.1;                  // and it starts to overfit, a little
    }
  }
  function draw() {
    g.fillStyle = bg; g.fillRect(0, 0, LW, LH);
    g.strokeStyle = 'rgba(140,200,190,.16)'; g.lineWidth = 1;
    g.beginPath(); for (let l = 1; l <= 2; l++) { g.moveTo(X0, Y(l) + 0.5); g.lineTo(X1, Y(l) + 0.5); } g.stroke();
    g.strokeStyle = 'rgba(160,215,205,.5)'; g.beginPath(); g.moveTo(X0 + 0.5, Y0 - 3); g.lineTo(X0 + 0.5, Y1 + 0.5); g.lineTo(X1 + 2, Y1 + 0.5);
    for (let k = 0; k <= 4; k++) { const x = Math.round(X0 + (X1 - X0) * k / 4) + 0.5; g.moveTo(x, Y1); g.lineTo(x, Y1 + 3); }
    for (let l = 0; l <= 3; l++) { g.moveTo(X0 - 3, Math.round(Y(l)) + 0.5); g.lineTo(X0, Math.round(Y(l)) + 0.5); }
    g.stroke();
    g.font = 'bold 10px ui-monospace, monospace'; g.textBaseline = 'alphabetic';
    g.fillStyle = 'rgba(170,225,215,.75)'; g.textAlign = 'left'; g.fillText('loss', X0 + 4, Y0 + 2);
    g.textAlign = 'right'; g.fillText(RUN_LABELS[run], X1, Y0 + 2); g.fillText(STEP_LABELS[i], X1, LH - 4);
    const n = Math.min(i, LN - 1);
    g.lineJoin = g.lineCap = 'round';
    g.strokeStyle = 'rgba(255,165,90,.75)'; g.lineWidth = 1.6; g.beginPath();                    // validation, every few steps
    for (let k = 0; k <= n; k += 3) k ? g.lineTo(X(k), Y(val[k])) : g.moveTo(X(k), Y(val[k])); g.stroke();
    g.strokeStyle = '#7dffa8'; g.lineWidth = 2.8; g.shadowColor = '#7dffa8'; g.shadowBlur = 5; g.beginPath();
    for (let k = 0; k <= n; k++) k ? g.lineTo(X(k), Y(train[k])) : g.moveTo(X(k), Y(train[k])); g.stroke();
    const on = hold === 0 || hold % 6 < 4;
    if (on) { g.fillStyle = '#e8fff0'; g.beginPath(); g.arc(X(n), Y(train[n]), hold ? 3.2 : 2.6, 0, 7); g.fill(); }
    g.shadowBlur = 0;
    g.fillStyle = '#7dffa8'; g.textAlign = 'center';
    if (hold > 8) g.fillText('converged', (X0 + X1) / 2, Y0 + 14); else if (i < 9 && hold === 0 && fresh) g.fillText('new run', (X0 + X1) / 2 + 6, (Y0 + Y1) / 2 + 4);
    tex.needsUpdate = true;
  }
  newRun(); i = 30 + Math.floor(Math.random() * 40); draw();
  m.onBeforeRender = () => {
    const now = performance.now(); if (now - last < 110) return; last = now;
    if (i < LN) i++; else if (++hold > 40) { newRun(); fresh = true; }
    draw();
  };
  return m;
}

export function buildGuest(key) {
  const S = GUEST_SPECS[key];
  const root = new THREE.Group(), bob = new THREE.Group(); root.add(bob); bob.position.y = S.hover; root.userData.staff = true;
  if (S.tall) bob.scale.set(0.95, S.tall, 0.95);      // a tall one: the same build, drawn up
  const parts = [], BRASS = '#c9a45c', CREAM = '#efe4cf';
  let R, bs, fc, ringY, handL, handR, handSize = 0.12, handCol = '#f4eee2', toolL = [], toolR = [], ringGeo = null, cup = null, panel = null, top;

  if (key === 'feyn') {
    R = 0.58; bs = [1, 1.12, 0.95];
    // a cream shirt over navy trousers, with a brass belt
    parts.push(paint(Tf(sph(R, 26, 18), { s: bs }), p => (p.y < -0.2 ? '#2f4257' : '#ece2cc')));
    parts.push(paint(Tf(new THREE.TorusGeometry(R * 0.955, 0.03, 6, 36), { p: [0, -0.2, 0], r: [Math.PI / 2, 0, 0], s: [1, 0.95, 1] }), BRASS));
    // open collar, no tie
    for (const sx of [-1, 1]) parts.push(paint(Tf(new THREE.ConeGeometry(0.075, 0.2, 8), { p: [sx * 0.1, 0.0, 0.565], r: [0.25, 0, sx * 2.5], s: [1, 1, 0.45] }), '#fbf5e6'));
    parts.push(paint(Tf(sph(0.026, 8, 6), { p: [0, -0.13, 0.55] }), '#d8cdb4'));
    // springy wire curls on top (a robot's idea of unruly hair)
    for (const [x, z, ry, rz, r] of [[-0.12, 0.05, 0.3, 0.5, 0.15], [0.05, 0.0, -0.5, -0.2, 0.19], [0.18, -0.04, 0.9, -0.7, 0.14], [-0.02, -0.12, 1.8, 0.3, 0.16], [0.1, 0.12, 2.5, -0.4, 0.12]])
      parts.push(paint(Tf(new THREE.TorusGeometry(r, 0.022, 5, 14, Math.PI * 1.25), { p: [x, R * 1.12 - 0.06, z], r: [0, ry, rz] }), '#3b3f47'));
    // the bongos, floating where his hands can find them
    const drum = (x, r, h) => [
      paint(Tf(cyl(r, r * 0.86, h, 18), { p: [x, 0, 0] }), '#9a4a2a'), paint(Tf(cyl(r * 0.94, r * 0.94, 0.02, 18), { p: [x, h / 2 + 0.008, 0] }), '#eadcc0'),
      paint(Tf(new THREE.TorusGeometry(r, 0.014, 5, 20), { p: [x, h / 2 - 0.015, 0], r: [Math.PI / 2, 0, 0] }), BRASS)];
    const bongos = [...drum(-0.2, 0.19, 0.3), ...drum(0.19, 0.155, 0.3), paint(Tf(box(0.12, 0.09, 0.08)), '#6f3520')].map(g => Tf(g, { p: [0, -0.56, 0.66], r: [0.28, 0, 0] }));
    parts.push(...bongos);
    parts.push(paint(Tf(new THREE.SphereGeometry(0.3, 18, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), { p: [0, -0.62, 0], s: [1, 0.6, 1] }), BRASS));
    // one eyebrow up
    fc = face(S.face, (g, expr, lx, rx, y) => {
      if (expr === 'sass') return;
      g.lineWidth = 6;
      g.beginPath(); g.moveTo(lx - 20, y - 36); g.lineTo(lx + 18, y - 33); g.stroke();
      g.beginPath(); g.moveTo(rx - 18, y - 37); g.quadraticCurveTo(rx + 2, y - 50, rx + 22, y - 40); g.stroke();
    });
    fc.mesh = mesh(visor(R + 0.008, 0.8, 0.62, 1.36, bs), fc.mat);
    ringY = -0.9; handL = [-0.8, -0.2, 0.14]; handR = [0.8, -0.2, 0.14]; top = S.hover + 0.95;
    toolR = [paint(Tf(cyl(0.02, 0.02, 0.17, 6), { p: [0.02, 0.1, 0.08], r: [0.5, 0, -0.3] }), '#fbfbf6')];       // a stub of chalk
  } else if (key === 'gigi') {
    R = 0.5; bs = [1, 1.08, 1];
    const PINK = '#e2598a';
    parts.push(paint(Tf(sph(R, 26, 18), { s: bs }), p => (p.y < -0.26 ? '#c9436f' : PINK)));
    parts.push(paint(Tf(new THREE.TorusGeometry(R * 0.865, 0.028, 6, 36), { p: [0, -0.265, 0], r: [Math.PI / 2, 0, 0] }), '#fbeede'));      // a cream sash
    parts.push(hair(R, bs));
    // gold, because gold sings against raspberry: a statement hoop on the side her hair is tucked behind,
    // a fine chain with a little heart (her light is a heart too), bangles on the bag hand. No pearls, no bow.
    {
      const a = HOOP_A, c = onBody(R, bs, a, 1.43, 0.045);
      parts.push(paint(Tf(Tf(new THREE.TorusGeometry(0.085, 0.015, 6, 22), { r: [-0.2, 0, 0] }), { p: c, r: [0, a - 0.55, 0] }), shine(c)));    // turned a little to the front, so it shows face on
      parts.push(paint(Tf(sph(0.022, 8, 6), { p: onBody(R, bs, a, 1.25, 0.008) }), GOLD));
      const pts = []; for (let i = 0; i < 40; i++) { const a = (i / 40) * Math.PI * 2; pts.push(new THREE.Vector3(...onBody(R, bs, a, 1.6 + 0.15 * Math.max(0, Math.cos(a)) ** 1.5, 0.01))); }
      parts.push(paint(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 64, 0.009, 3, true), GOLD));
      const h = new THREE.Shape(); h.moveTo(0, -0.04); h.bezierCurveTo(-0.06, -0.005, -0.035, 0.04, 0, 0.018); h.bezierCurveTo(0.035, 0.04, 0.06, -0.005, 0, -0.04);
      const hc = onBody(R, bs, 0, 1.84, 0.014), heart = Tf(new THREE.ExtrudeGeometry(h, { depth: 0.014, bevelEnabled: false, curveSegments: 5 }), { p: [0, 0, -0.007] });
      parts.push(paint(Tf(heart, { p: hc, r: [1.84 - Math.PI / 2 - 0.1, 0, 0] }), shine(hc)));
    }
    parts.push(paint(Tf(new THREE.SphereGeometry(0.24, 16, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), { p: [0, -R * 1.0, 0], s: [1, 0.6, 1] }), BRASS));
    // lashes
    fc = face(S.face, (g, expr, lx, rx, y, blink) => {
      if (blink || expr === 'love' || expr === 'surprised') return;
      g.lineWidth = 3.5;
      for (const [x, s] of [[lx, -1], [rx, 1]]) for (const [dx, dy, ex, ey] of [[15, -20, 24, -29], [19, -12, 30, -17], [9, -25, 14, -35]]) { g.beginPath(); g.moveTo(x + s * dx, y + dy); g.lineTo(x + s * ex, y + ey); g.stroke(); }
    });
    fc.mesh = mesh(visor(R + 0.007, 0.86, 0.7, 1.52, bs), fc.mat);
    ringY = -0.68; handL = [-0.66, -0.14, 0.14]; handR = [0.66, -0.14, 0.14]; handSize = 0.1; top = S.hover + 0.8;       // the crown of her hair is 0.58 up
    // a little lilac bag over the left hand
    toolL = [paint(Tf(box(0.24, 0.17, 0.1), { p: [0, -0.3, 0.02] }), '#b9a0e0'), paint(Tf(box(0.25, 0.05, 0.11), { p: [0, -0.225, 0.02] }), '#a58bd2'),
      paint(Tf(new THREE.TorusGeometry(0.1, 0.014, 5, 14, Math.PI), { p: [0, -0.2, 0.02] }), '#a58bd2'), paint(Tf(sph(0.022, 6, 5), { p: [0, -0.25, 0.075] }), GOLD),
      // and two gold bangles round the wrist above it, one fat, one fine
      paint(Tf(new THREE.TorusGeometry(0.1, 0.015, 5, 20), { p: [0, 0, -0.02], r: [0.12, 0.08, 0] }), shine([0, 0])), paint(Tf(new THREE.TorusGeometry(0.09, 0.009, 4, 20), { p: [0.004, -0.006, -0.062], r: [-0.1, -0.12, 0] }), GOLD)];
    // a heart of light underneath, instead of a ring
    const pts = []; for (let i = 0; i < 28; i++) { const t = (i / 28) * Math.PI * 2, x = 16 * Math.sin(t) ** 3, y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t); pts.push(new THREE.Vector3(x * 0.0185, 0, -y * 0.0185 - 0.03)); }
    ringGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 56, 0.03, 6, true);
    // her coffee, once she has been to the coffee bar
    cup = mesh(merge([paint(Tf(cyl(0.075, 0.058, 0.2, 14), { p: [0, 0.1, 0] }), '#f6eedf'), paint(Tf(cyl(0.074, 0.066, 0.085, 14), { p: [0, 0.1, 0] }), '#b98a5a'), paint(Tf(cyl(0.081, 0.081, 0.028, 14), { p: [0, 0.212, 0] }), '#fffaf1'),
      paint(Tf(cyl(0.05, 0.065, 0.016, 12), { p: [0, 0.232, 0] }), '#fffaf1')]));
    cup.position.set(0.0, 0.06, 0.1); cup.visible = false;
  } else {
    R = 0.52; bs = [1.05, 0.98, 1];
    const HOOD = '#56667d';
    parts.push(paint(Tf(sph(R, 26, 18), { s: bs }), p => (p.y < -0.33 ? '#3b4758' : HOOD)));                // the hoodie, with its hem
    parts.push(paint(Tf(new THREE.TorusGeometry(R * 0.7, 0.1, 7, 26), { p: [0, 0.2, -0.2], r: [Math.PI / 2 - 0.75, 0, 0], s: [1.08, 1, 1] }), '#63748c'));   // the hood, pushed back
    // the drawstrings of the hoodie, with silver tips
    for (const sx of [-1, 1]) {
      const pts = [1.47, 1.56, 1.66].map((th, i) => new THREE.Vector3(...onBody(R, bs, sx * (0.13 + 0.025 * i * i), th, 0.012)));
      parts.push(paint(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 6, 0.012, 4), '#e4e8ec'), paint(Tf(cyl(0.017, 0.014, 0.045, 6), { p: onBody(R, bs, sx * 0.23, 1.695, 0.014), r: [1.7 - Math.PI / 2, 0, -sx * 0.25] }), '#f0883a'));
    }
    // orange headphones
    const HP = '#f0883a';
    parts.push(paint(Tf(new THREE.TorusGeometry(R * 1.0, 0.036, 6, 22, Math.PI), { p: [0, 0.06, 0], s: [1.07, 1.04, 1] }), HP));
    for (const sx of [-1, 1]) {
      parts.push(paint(Tf(cyl(0.17, 0.17, 0.09, 16), { p: [sx * (R * 1.05 + 0.05), 0.06, 0], r: [0, 0, Math.PI / 2] }), HP));
      parts.push(paint(Tf(cyl(0.135, 0.135, 0.07, 16), { p: [sx * (R * 1.05 - 0.005), 0.06, 0], r: [0, 0, Math.PI / 2] }), '#23272e'));
    }
    parts.push(paint(Tf(new THREE.SphereGeometry(0.28, 16, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), { p: [0, -R * 0.9, 0], s: [1, 0.55, 1] }), '#23272e'));
    fc = face(S.face, null);
    fc.mesh = mesh(visor(R + 0.008, 0.84, 0.72, 1.46, bs), fc.mat);
    panel = lossPanel(visor(R + 0.006, 0.6, 1.74, 2.36, bs));
    ringY = -0.7; handL = [-0.74, -0.2, 0.16]; handR = [0.74, -0.2, 0.16]; handSize = 0.11; handCol = '#e9edf1'; top = S.hover + 0.9;
  }

  const body = mesh(merge(parts)); bob.add(body, fc.mesh); if (panel) bob.add(panel);
  const ring = new THREE.Mesh(ringGeo ?? Tf(new THREE.TorusGeometry(R * 0.5, 0.032, 8, 30), { r: [Math.PI / 2, 0, 0] }), new THREE.MeshBasicMaterial({ color: S.ring, toneMapped: false, transparent: true, opacity: 0.85 }));
  ring.position.y = ringY; bob.add(ring);
  const glove = () => paint(Tf(sph(handSize, 10, 7), { s: [1, 0.85, 1.15] }), handCol);
  const hands = [[handL, toolL], [handR, toolR]].map(([p, tool]) => {
    const h = new THREE.Group(); h.position.set(...p); h.userData.rest = p;
    h.add(mesh(tool.length ? merge([glove(), ...tool]) : glove())); bob.add(h); return h;
  });
  if (cup) hands[1].add(cup);
  // a book to take down off a shelf (the two who read): open, held across both hands from the right one
  let book = null;
  if (key !== 'gigi') {
    const col = key === 'feyn' ? '#7a2f2a' : '#2f4a5a';
    book = mesh(merge([paint(Tf(box(0.2, 0.012, 0.27), { p: [-0.1, 0, 0], r: [0, 0, 0.16] }), col), paint(Tf(box(0.2, 0.012, 0.27), { p: [0.1, 0, 0], r: [0, 0, -0.16] }), col),
      paint(Tf(box(0.185, 0.03, 0.25), { p: [-0.098, 0.02, 0], r: [0, 0, 0.16] }), '#f3ecd9'), paint(Tf(box(0.185, 0.03, 0.25), { p: [0.098, 0.02, 0], r: [0, 0, -0.16] }), '#f3ecd9')]));
    book.position.set(-0.19, 0.06, 0.02); book.rotation.x = -0.9; book.visible = false; hands[1].add(book);
  }
  root.traverse(o => { o.castShadow = false; o.receiveShadow = !!o.isMesh; o.userData.staff = true; });
  return { root, bob, body, face: fc, ring, hands, cup, book, panel, spec: S, R, bs, top, handSize };
}

// Draw calls and triangles for one body (for the cost report)
export function costOf(root) {
  let calls = 0, tris = 0;
  root.traverse(o => { if (!o.isMesh || !o.visible) return; calls++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; });
  return { calls, tris: Math.round(tris) };
}

// ---- Where the hands go ----------------------------------------------------------------------------
// Every gesture, in the body's own frame (feet; +z forward; hands[0] is on the -x side). Writes the two
// hand targets and a tip for each (radians about x: a cup tipped to the lips, a palm turned up) into
// out = [lx, ly, lz, rx, ry, rz, tipL, tipR]; party.js eases the hands towards them, so nothing snaps.
// t: seconds; beat: the dance clock (in beats, so playing keeps time with the record); a: an anchor in
// the body's frame (the keys, the board, a shelf) or null for a sensible default; k: a per-guest phase
// so no two guests move in step. The robots have no arms: mitten hands float near the body, so the
// gestures stay within about a foot of where the hands rest, and never pass through the body.
const GEST_TAP = (x, p) => Math.pow(Math.max(0, 1 - x / p), 3);          // a quick strike, then a slower lift
export function handPose(b, name, t, beat, a, out, k = 0) {
  const R = b.R, bs = b.bs, L = b.hands[0].userData.rest, Rr = b.hands[1].userData.rest, front = R * bs[2], top = R * bs[1];
  let lx = L[0], ly = L[1], lz = L[2], rx = Rr[0], ry = Rr[1], rz = Rr[2], tl = 0, tr = 0;
  const sw = 0.03 * Math.sin(t * 1.7 + k), sw2 = 0.03 * Math.sin(t * 1.3 + k + 2);
  switch (name) {
    case 'rest': ly += sw; ry += sw2; break;
    case 'clasp':                                                              // hands together in front: listening, waiting
      lx = -0.12; rx = 0.12; ly = ry = -0.42 * top + sw * 0.5; lz = rz = front * 0.8 + 0.18; break;
    case 'hips': lx = -(R + 0.13); rx = R + 0.13; ly = ry = -0.3 * top; lz = rz = 0.02; break;
    case 'behind': lx = -0.3; rx = 0.3; ly = ry = -0.45 * top; lz = rz = -(front * 0.75 + 0.12); break;    // looking out of a window, hands behind the back
    case 'open':                                                               // an open palm, offered
      rx = R * 0.62; ry = 0.02 + 0.05 * Math.sin(t * 2.3 + k); rz = front + 0.2; tr = -0.45; ly += sw; break;
    case 'open2':                                                              // both hands, a little out of step
      lx = -R * 0.75; ly = 0.0 + 0.05 * Math.sin(t * 2.1 + k + 1); lz = front + 0.16; rx = R * 0.75; ry = 0.03 + 0.05 * Math.sin(t * 2.6 + k); rz = front + 0.17; tl = tr = -0.35; break;
    case 'point': rx = 0.2; ry = 0.06; rz = front + 0.3 + 0.05 * Math.max(0, Math.sin(t * 3.2 + k)); ly += sw; break;
    case 'shrug': lx = -(R + 0.3); rx = R + 0.3; ly = ry = 0.16 + 0.03 * Math.sin(t * 2 + k); lz = rz = 0.14; tl = tr = -0.6; break;
    case 'count': {                                                            // counting off on the other hand
      const n = Math.floor(t * 1.4 + k) % 4, f = (t * 1.4 + k) % 1;
      lx = -0.3; ly = 0.02; lz = front + 0.2; tl = -0.3;
      rx = -0.21 + n * 0.045; ry = 0.05 + 0.06 * (1 - GEST_TAP(f, 0.6)); rz = front + 0.27; break;
    }
    case 'chin': rx = 0.1; ry = -0.2 * top; rz = front + 0.13; lx = -0.14; ly = -0.42 * top; lz = front * 0.75 + 0.16; break;      // thinking: a hand to the chin, the other across
    case 'wave': rx = R + 0.18 + 0.1 * Math.sin(t * 9); ry = 0.5; rz = 0.22; tr = -0.3; break;
    case 'knock': rx = 0.16; ry = 0.12; rz = front + 0.26 + 0.09 * Math.max(0, Math.sin(t * 14)); break;
    case 'carry': rx = 0.4; ry = -0.2 * top; rz = front * 0.6 + 0.16; break;          // a cup held out in front, steady
    case 'sip': {                                                              // to the lips, a sip, and down again
      const u = 0.5 - 0.5 * Math.cos(Math.min(1, ((t + k) % 6) / 3) * Math.PI * 2);
      rx = 0.4 - 0.32 * u; ry = -0.2 * top + 0.08 * top * u; rz = front * 0.6 + 0.16 + (front * 0.4 + 0.01) * u; tr = -0.6 * u; ly += sw; break;      // (the rim at the lower edge of the face)
    }
    case 'type': {                                                             // both hands on the keys, fingers going, out of step
      const ax = a ? a.x : 0, ay = a ? a.y : -0.62 * top, az = a ? a.z : front + 0.32;
      lx = ax - 0.16 + 0.02 * Math.sin(t * 2.1); ly = ay + 0.035 * Math.max(0, Math.sin(t * 16 + k)); lz = az + 0.02 * Math.sin(t * 3.3);
      rx = ax + 0.16 + 0.02 * Math.sin(t * 1.7 + 1); ry = ay + 0.035 * Math.max(0, Math.sin(t * 18.5 + k + 2.2)); rz = az + 0.02 * Math.sin(t * 2.9 + 1); break;
    }
    case 'draw': {                                                             // writing across the board, line by line, in loops
      const ax = a ? a.x : 0.25, ay = a ? a.y : 0.45, az = a ? a.z : front + 0.35, w = (t * 0.28 + k) % 3, u = w % 1, row = Math.floor(w);
      rx = ax - 0.45 + 0.9 * u + 0.05 * Math.cos(t * 8.5); ry = ay + 0.3 - 0.3 * row + 0.06 * Math.sin(t * 8.5); rz = az;
      lx = -(R + 0.12); ly = -0.3 * top; lz = 0.05; break;
    }
    case 'drum': {                                                             // his own bongos, on the beat: left on the beat, right on the off-beat
      const p = beat % 1, q = (beat + 0.5) % 1;
      lx = -0.2; ly = -0.39 + 0.16 * (1 - GEST_TAP(p, 0.45)); lz = 0.7; rx = 0.19; ry = -0.39 + 0.16 * (1 - GEST_TAP(q, 0.45)); rz = 0.7; break;
    }
    case 'piano': {                                                            // across the keys, in time, the hands wandering apart and together
      const ax = a ? a.x : 0, ay = a ? a.y : -0.5 * top, az = a ? a.z : front + 0.45, p = (beat * 2) % 1, q = (beat * 2 + 0.5) % 1, wide = 0.26 + 0.08 * Math.sin(beat * Math.PI / 4);
      lx = ax - wide + 0.06 * Math.sin(beat * Math.PI / 2); ly = ay + 0.02 + 0.07 * (1 - GEST_TAP(p, 0.5)); lz = az;
      rx = ax + wide + 0.06 * Math.sin(beat * Math.PI / 3 + 1); ry = ay + 0.02 + 0.07 * (1 - GEST_TAP(q, 0.5)); rz = az; break;
    }
    case 'reach': {                                                            // up to a shelf (or the globe)
      const ax = a ? a.x : 0.3, ay = a ? a.y : 0.7, az = a ? a.z : front + 0.45;
      rx = ax + 0.03 * Math.sin(t * 2); ry = ay + 0.03 * Math.sin(t * 2.6); rz = az; tr = -0.3; ly += sw; break;
    }
    case 'read':                                                               // a book open across both hands, a page turned now and then
    case 'holdbook': {
      const y = name === 'read' ? -0.1 : -0.35 * top, z = front + (name === 'read' ? 0.32 : 0.22), turn = name === 'read' ? GEST_TAP((t + k) % 7, 0.8) : 0;
      lx = -0.21 + 0.3 * turn; ly = y + 0.06 * turn; lz = z; rx = 0.19; ry = y; rz = z; tl = tr = -0.2; break;
    }
    case 'warm':                                                               // palms to the fire, rubbed now and then
      lx = -0.22 + 0.03 * Math.sin(t * 5); ly = -0.18; lz = front + 0.28; rx = 0.22 - 0.03 * Math.sin(t * 5); ry = -0.16; rz = front + 0.28; tl = tr = -0.5; break;
    case 'browse':                                                             // leafing through the records in the crate
      rx = 0.22; ry = -0.62 * top - 0.12; rz = front + 0.42 + 0.06 * Math.max(0, Math.sin(t * 4)); lx = -(R + 0.12); ly = -0.3 * top; lz = 0.05; break;
    case 'lean': {                                                             // over the chess board or the jigsaw: chin in one hand, the other trying a piece
      const ax = a ? a.x : 0.15, ay = a ? a.y : -0.7 * top, az = a ? a.z : front + 0.5;
      lx = -0.1; ly = -0.2 * top; lz = front + 0.13; rx = ax + 0.04 * Math.sin(t * 0.9 + k); ry = ay + 0.06 + 0.05 * Math.max(0, Math.sin(t * 1.3 + k)); rz = az; break;
    }
    case 'make':                                                               // at the espresso machine: a hand on the lever, the other on the cup
      lx = -0.2; lz = front + 0.38; ly = -0.05 + 0.05 * Math.sin(t * 6); rx = 0.22; rz = front + 0.4; ry = -0.12 + 0.03 * Math.sin(t * 4.3); break;
    case 'hair': rx = 0.24; ry = top + 0.02 + 0.02 * Math.sin(t * 5); rz = 0.1; ly += sw; break;    // (Geneva) fixing her hair, with the hand that is not holding the bag
    case 'sit': lx = -(R + 0.05); rx = R + 0.05; ly = -0.4 * top + sw * 0.4; ry = -0.4 * top + sw2 * 0.4; lz = rz = 0.3; break;     // hands resting, on the arms of the chair
  }
  if (b.spec.key === 'gigi') tl = 0;                                          // (her bag hangs plumb from that hand)
  out[0] = lx; out[1] = ly; out[2] = lz; out[3] = rx; out[4] = ry; out[5] = rz; out[6] = tl; out[7] = tr;
  keepOut(b, out);
  return out;
}
// No hand (nor Geneva's bag, which hangs below her left) inside the body: pushed out to its surface
export function keepOut(b, out) {
  const R = b.R, bs = b.bs, m = R + (b.handSize ?? 0.12) + 0.04;
  for (let i = 0; i < 2; i++) {
    for (let pass = 0; pass < 2; pass++) {
      const drop = pass === 1 && i === 0 && b.spec.key === 'gigi' ? 0.3 : 0, mm = drop ? R + 0.15 : m;
      if (pass === 1 && !drop) continue;
      const x = out[i * 3], y = out[i * 3 + 1] - drop, z = out[i * 3 + 2], e = Math.hypot(x / bs[0], y / bs[1], z / bs[2]);
      if (e < mm && e > 1e-4) { const s = mm / e; out[i * 3] = x * s; out[i * 3 + 1] = y * s + drop; out[i * 3 + 2] = z * s; }
    }
  }
  return out;
}
// The names, for the gesture sheet (friendtest.html?poses=gestures)
export const GESTURES = ['rest', 'clasp', 'hips', 'behind', 'open', 'open2', 'point', 'shrug', 'count', 'chin', 'wave', 'knock', 'carry', 'sip', 'type', 'draw', 'drum', 'piano', 'reach', 'read', 'warm', 'browse', 'lean', 'make', 'hair', 'sit'];
