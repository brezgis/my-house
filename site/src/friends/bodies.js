// Bodies for the three friends, in the same family as the household staff
// (staff/models.js): a floating round body, a glowing face, a ring of light
// underneath and two mitten hands. Each solid part is one merged, vertex-coloured
// mesh sharing the staff's material, so a guest is five draw calls (six once
// Geneva has her coffee): body, face, ring and two hands. No lights, no shadows.
// Units are feet; everyone faces +z in their own frame.
//
//   Professor Feynbot  shirt-sleeves and navy, springy wire curls, a pair of bongos
//   Geneva               raspberry pink, a big butter-yellow bow, pearls, a handbag
//   nanoKarpathy       a graphite hoodie, orange headphones, a loss curve on his front

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
const mesh = (geo, mat = solid()) => { const m = new THREE.Mesh(geo, mat); m.castShadow = false; m.receiveShadow = false; return m; };
// A patch of sphere that follows the body's curve (the face screen, a shirt front)
function visor(r, phi, th0, th1, scale) { const g = new THREE.SphereGeometry(r, 18, 9, Math.PI / 2 - phi, phi * 2, th0, th1 - th0); g.scale(...scale); return g; }
// A point on the body's surface: azimuth a (0 = front), polar angle th from the top
const onBody = (R, bs, a, th, out = 0) => [(R + out) * Math.sin(th) * Math.sin(a) * bs[0], (R + out) * Math.cos(th) * bs[1], (R + out) * Math.sin(th) * Math.cos(a) * bs[2]];

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

export function buildGuest(key) {
  const S = GUEST_SPECS[key];
  const root = new THREE.Group(), bob = new THREE.Group(); root.add(bob); bob.position.y = S.hover; root.userData.staff = true;
  if (S.tall) bob.scale.set(0.95, S.tall, 0.95);      // a tall one: the same build, drawn up
  const parts = [], BRASS = '#c9a45c', CREAM = '#efe4cf';
  let R, bs, fc, ringY, handL, handR, handSize = 0.12, handCol = '#f4eee2', toolL = [], toolR = [], ringGeo = null, cup = null, top;

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
    // a high ponytail with a balayage: dark honey at the root, caramel through the middle, blonde at the ends,
    // gathered in a cream scrunchie (no pearls, no bow: she is a person, not a cut-out)
    {
      const top = R * 1.08, N = 11, mix = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k), hex = c => '#' + c.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
      const ROOT = [86, 56, 36], MID = [168, 116, 62], TIP = [236, 204, 148];
      for (let i = 0; i < N; i++) {
        const t = i / (N - 1), up = Math.sin(Math.PI * Math.min(1, t * 1.9)), fall = Math.max(0, t - 0.22);
        const y = top + 0.02 + 0.17 * up - 0.78 * Math.pow(fall, 1.25), z = -0.1 - 0.4 * Math.sin(Math.PI / 2 * Math.min(1, t * 1.7)) - 0.04 * t + 0.05 * Math.sin(t * 5), x = 0.03 * Math.sin(t * 7);
        const r = 0.125 * (1 - 0.6 * t) + 0.03, base = t < 0.45 ? mix(ROOT, MID, t / 0.45) : mix(MID, TIP, (t - 0.45) / 0.55);
        parts.push(paint(Tf(sph(r, 9, 7), { p: [x, y, z], s: [1.05, 1.25, 0.95] }), p => hex(mix(base, TIP, Math.max(0, Math.sin(Math.atan2(p.x - x, p.z - z) * 5 + i)) * (0.12 + 0.3 * t)))));
      }
      parts.push(paint(Tf(new THREE.TorusGeometry(0.115, 0.045, 6, 14), { p: [0, top + 0.1, -0.21], r: [1.05, 0, 0] }), '#f6ecd8'));      // the scrunchie
      // a sweep of the same hair over the crown, so the tail grows out of something
      parts.push(paint(Tf(new THREE.SphereGeometry(R * 1.015, 20, 6, 0, Math.PI * 2, 0, 0.62), { s: bs, p: [0, 0.004, -0.012] }), p => hex(mix(ROOT, MID, Math.max(0, Math.min(1, 0.35 + 0.5 * Math.sin(Math.atan2(p.x, p.z) * 7)))))));
    }
    parts.push(paint(Tf(new THREE.SphereGeometry(0.24, 16, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), { p: [0, -R * 1.0, 0], s: [1, 0.6, 1] }), BRASS));
    // lashes
    fc = face(S.face, (g, expr, lx, rx, y, blink) => {
      if (blink || expr === 'love' || expr === 'surprised') return;
      g.lineWidth = 3.5;
      for (const [x, s] of [[lx, -1], [rx, 1]]) for (const [dx, dy, ex, ey] of [[15, -20, 24, -29], [19, -12, 30, -17], [9, -25, 14, -35]]) { g.beginPath(); g.moveTo(x + s * dx, y + dy); g.lineTo(x + s * ex, y + ey); g.stroke(); }
    });
    fc.mesh = mesh(visor(R + 0.007, 0.86, 0.7, 1.52, bs), fc.mat);
    ringY = -0.68; handL = [-0.66, -0.14, 0.14]; handR = [0.66, -0.14, 0.14]; handSize = 0.1; top = S.hover + 0.95;
    // a little lilac bag over the left hand
    toolL = [paint(Tf(box(0.24, 0.17, 0.1), { p: [0, -0.3, 0.02] }), '#b9a0e0'), paint(Tf(box(0.25, 0.05, 0.11), { p: [0, -0.225, 0.02] }), '#a58bd2'),
      paint(Tf(new THREE.TorusGeometry(0.1, 0.014, 5, 14, Math.PI), { p: [0, -0.2, 0.02] }), '#a58bd2'), paint(Tf(sph(0.022, 6, 5), { p: [0, -0.25, 0.075] }), BRASS)];
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
    // the loss curve on his front: a dark panel and a line of dots going down
    parts.push(paint(visor(R + 0.006, 0.5, 1.76, 2.42, bs), '#0e151b'));
    for (let i = 0; i < 9; i++) { const a = -0.36 + i * 0.09, th = 1.84 + 0.46 * (1 - Math.exp(-i * 0.42)) + (i === 4 ? -0.03 : i === 6 ? 0.02 : 0); parts.push(paint(Tf(sph(0.024, 6, 5), { p: onBody(R, bs, a, th, 0.012) }), '#7dffa8')); }
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
    ringY = -0.7; handL = [-0.74, -0.2, 0.16]; handR = [0.74, -0.2, 0.16]; handSize = 0.11; handCol = '#e9edf1'; top = S.hover + 0.9;
  }

  const body = mesh(merge(parts)); bob.add(body, fc.mesh);
  const ring = new THREE.Mesh(ringGeo ?? Tf(new THREE.TorusGeometry(R * 0.5, 0.032, 8, 30), { r: [Math.PI / 2, 0, 0] }), new THREE.MeshBasicMaterial({ color: S.ring, toneMapped: false, transparent: true, opacity: 0.85 }));
  ring.position.y = ringY; bob.add(ring);
  const glove = () => paint(Tf(sph(handSize, 10, 7), { s: [1, 0.85, 1.15] }), handCol);
  const hands = [[handL, toolL], [handR, toolR]].map(([p, tool]) => {
    const h = new THREE.Group(); h.position.set(...p); h.userData.rest = p;
    h.add(mesh(tool.length ? merge([glove(), ...tool]) : glove())); bob.add(h); return h;
  });
  if (cup) hands[1].add(cup);
  root.traverse(o => { o.castShadow = false; o.receiveShadow = false; o.userData.staff = true; });
  return { root, bob, body, face: fc, ring, hands, cup, spec: S, R, bs, top };
}

// Draw calls and triangles for one body (for the cost report)
export function costOf(root) {
  let calls = 0, tris = 0;
  root.traverse(o => { if (!o.isMesh || !o.visible) return; calls++; const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3; });
  return { calls, tris: Math.round(tris) };
}
