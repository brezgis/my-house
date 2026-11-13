// The little free library, just inside the gate on the left of the front walk, turned to meet
// you as you come in. It is the house itself, small: a clinker-brick pier, a dark timber post
// on cloud-lift brackets, shingled walls, a deep-eaved gable on exposed rafter tails, an open
// porch gable on two posts, a clinker chimney with two pots, and a glazed door painted deep
// green with a brass latch. Inside, on two shelves, real books from the house's own list, the
// ones that hold a checked public-domain passage (hands/quotes.js). Under the porch hangs
// "Take a book, leave a book"; a tiny lantern on a bracket glows at dusk; a red step for
// small readers; two ceramic toadstools in the catmint.
//
// E on the door opens it; with it open, E on a spine takes the book down and shows it in the
// house's book card (window.__hands.takeDown, hands.js), or, if hands has not loaded, its title.
//
// Also here: place(), a frame for laying parts out turned and placed, used by mailbox.js and
// hives.js, and buildPart(), which makes one small moving mesh (a door, a flag) from such parts.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PAINT, GLOW } from './tools.js';
import { rng } from './cards.js';

// ---- A frame: local x to the right, y up, z toward the viewer; turned by yaw (facing +z turned
// by yaw, as a model does) and placed. Parts go into the garden's shared meshes, or into a sink. ----
const plain = m => /^c#/i.test(m);
function feetUV(g, k) {
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  if (!uv) return;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i));
    const [u, v] = ax > 0.5 ? [p.getZ(i), p.getY(i)] : ay > 0.5 ? [p.getX(i), p.getZ(i)] : [p.getX(i), p.getY(i)];
    uv.setXY(i, u * k, v * k);
  }
}
const T = (x, y, z, yaw = 0) => new THREE.Matrix4().makeRotationY(yaw).setPosition(x, y, z);
export function place(K, x, y, z, yaw = 0) { return frame(K, T(x, y, z, yaw), yaw, null); }
function frame(K, m, yaw, sink, rx = 0) {
  const out = (mat, g) => { g.applyMatrix4(m); if (sink) sink.push([mat, g]); else K.put(mat, g); };
  const f = {
    m, yaw, rx,
    w: (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(m),
    geo: out,
    box(mat, x0, x1, y0, y1, z0, z1, o = {}) {
      const g = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)).toNonIndexed();
      if (o.rot) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...o.rot)));
      g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
      if (!plain(mat)) feetUV(g, o.uv ?? 1);
      out(mat, g);
    },
    cyl(mat, x, y0, y1, z, r0, r1 = r0, seg = 12) { const g = new THREE.CylinderGeometry(r1, r0, y1 - y0, seg); g.translate(x, (y0 + y1) / 2, z); out(mat, g); },
    lathe(mat, x, y, z, prof, seg = 12, s = 1) { const g = new THREE.LatheGeometry(prof.map(([r, h]) => new THREE.Vector2(r * s, h * s)), seg); g.translate(x, y, z); out(mat, g); },
    sphere(mat, x, y, z, r, sy = 1, detail = 1, sx = 1, sz = 1) { const g = new THREE.IcosahedronGeometry(r, detail); g.scale(sx, sy, sz); g.translate(x, y, z); out(mat, g); },
    tube(mat, a, b, rad, seg = 6) { f.beam(mat, a, b, rad * 2, rad * 2, seg); },
    beam(mat, a, b, w, h = w, seg = 0) {
      const A = new THREE.Vector3(...a), d = new THREE.Vector3(...b).sub(A), len = d.length();
      const g = seg ? new THREE.CylinderGeometry(w / 2, w / 2, len, seg, 1, true) : new THREE.BoxGeometry(w, len, h).toNonIndexed();
      g.translate(0, len / 2, 0); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); g.translate(A.x, A.y, A.z);
      if (!plain(mat) && !seg) feetUV(g, 1);
      out(mat, g);
    },
    // a flat outline [[x, y], ...] (or a THREE.Shape) given thickness from z0 to z1
    prism(mat, pts, z0, z1, k = 1) {
      const s = pts instanceof THREE.Shape ? pts : new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
      const g = new THREE.ExtrudeGeometry(s, { depth: z1 - z0, bevelEnabled: false, curveSegments: 10 }); g.translate(0, 0, z0);
      if (k !== 1 && g.attributes.uv) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * k, uv.getY(i) * k); }
      out(mat, g);
    },
    // world-axis box round a local rectangle, for the walker and for plants
    aabb(x0, x1, z0, z1) {
      const c = [[x0, z0], [x1, z0], [x0, z1], [x1, z1]].map(([x, z]) => f.w(x, 0, z));
      return [Math.min(...c.map(p => p.x)), Math.max(...c.map(p => p.x)), Math.min(...c.map(p => p.z)), Math.max(...c.map(p => p.z))];
    },
    collide(x0, x1, z0, z1, y1, y0 = 0) { const [a, b, c, d] = f.aabb(x0, x1, z0, z1); K.collide(a, b, c, d, y1, y0); },
    keepOut(x0, x1, z0, z1) { (K.F.keepOut ??= []).push(f.aabb(x0, x1, z0, z1)); },
    // a drawn label on a face looking along local +z turned by dyaw (into the garden's label sheet)
    sign(draw, cw, ch, w, h, x, y, z, dyaw = 0) { const p = f.w(x, y, z); K.extras.push({ draw, cw, ch, w, h, x: p.x, y: p.y, z: p.z, rotY: yaw + dyaw, rough: 0.9, ...(rx ? { tilt: -rx } : {}) }); },
    // a frame within this one; rx leans it about its own x axis (positive tips its top toward +z)
    sub(x, y, z, dyaw = 0, rx = 0) { return frame(K, m.clone().multiply(T(x, y, z, dyaw)).multiply(new THREE.Matrix4().makeRotationX(rx)), yaw + dyaw, sink, rx); },
    // a part that moves: built about its own pivot (x, y, z in this frame), made a mesh at setup
    part(x, y, z, dyaw = 0) { const s = [], p = frame(K, new THREE.Matrix4(), 0, s); p.sink = s; p.world = m.clone().multiply(T(x, y, z, dyaw)); return p; },
  };
  return f;
}

// One moving thing: its plain-painted parts in one vertex-coloured mesh, anything else (glass) apart
let vcMat = null;
export function buildPart(ctx, part, name) {
  const T3 = ctx.THREE ?? THREE, at = new T3.Group(), grp = new T3.Group(); grp.name = name; at.add(grp);      // placed outside, turned (swung) inside
  part.world.decompose(at.position, at.quaternion, at.scale);
  const groups = new Map();
  for (const [mat, g0] of part.sink) {
    let g = g0.index ? g0.toNonIndexed() : g0;
    const key = plain(mat) ? 'vc' : mat;
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', ...(key === 'vc' ? [] : ['uv'])].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.normal) g.computeVertexNormals();
    if (key === 'vc') {
      const c = new T3.Color(parseInt(/^c#([0-9a-f]{6})/i.exec(mat)[1], 16)).multiplyScalar(0.78), n = g.attributes.position.count, a = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
      g.setAttribute('color', new T3.BufferAttribute(a, 3));
    } else if (!g.attributes.uv) g.setAttribute('uv', new T3.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(g);
  }
  for (const [key, list] of groups) {
    const mat = key === 'vc' ? (vcMat ??= new T3.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, envMapIntensity: 0.7 })) : (ctx.materials[key] ?? ctx.materials.make(key));
    const mesh = new T3.Mesh(mergeGeometries(list), mat); mesh.castShadow = key === 'vc'; mesh.receiveShadow = true; mesh.name = name; grp.add(mesh);
  }
  ctx.scene.add(at);
  return grp;
}
// Swing an object's rotation about one axis toward open or shut; does nothing once it gets there
export function swinger(ctx, obj, axis, shut, open, speed = 2.6) {
  let cur = shut, to = shut;
  obj.rotation[axis] = cur;
  ctx.animated.push((t, dt) => {
    if (cur === to) return;
    const d = to - cur, step = Math.sign(d) * Math.min(Math.abs(d), speed * Math.min(dt, 0.1) * (0.35 + Math.min(1, Math.abs(d) * 1.5)));
    cur = Math.abs(d) < 1e-3 ? to : cur + step; obj.rotation[axis] = cur;
  });
  return { set(o) { to = o ? open : shut; }, get open() { return to === open; }, get value() { return cur; } };
}
// Plants laid out with a seed of their own, so nothing sown elsewhere in the garden moves
export function ownPlants(K, seed, fn) { const F = K.F, was = F.r; F.r = rng(seed); try { fn(F); } finally { F.r = was; } }

// ---- The books in it: from the house's list (assets/books.json), each with a passage of its own text ----
const BOOKS = {
  low: [
    ['Little Women', 'Louisa May Alcott', 1868, '#2f6f8f', 'children', 0.11, 0.76],
    ['The Secret Garden', 'Frances Hodgson Burnett', 1911, '#3a7ab0', 'children', 0.12, 0.68],
    ['Anne of Green Gables', 'L. M. Montgomery', 1908, '#f0e2c0', 'children', 0.13, 0.7],
    ['The Wind in the Willows', 'Kenneth Grahame', 1908, '#7a5aa0', 'children', 0.11, 0.64],
    ['Peter and Wendy', 'J. M. Barrie', 1911, '#d98a6a', 'children', 0.1, 0.66],
    ["Alice's Adventures in Wonderland", 'Lewis Carroll', 1865, '#3a7ab0', 'children', 0.09, 0.6],
    ['Winnie-the-Pooh', 'A. A. Milne', 1926, '#5a9a5a', 'children', 0.14, 0.62],
    ['Just So Stories', 'Rudyard Kipling', 1902, '#d98a6a', 'children', 0.12, 0.72],
  ],
  lowStack: [["A Child's Garden of Verses", 'Robert Louis Stevenson', 1885, '#7a5aa0', 'children', 0.42, 0.09], ['The Tale of Peter Rabbit', 'Beatrix Potter', 1902, '#c74a3a', 'children', 0.36, 0.07]],
  high: [
    ['Pride and Prejudice', 'Jane Austen', 1813, '#8b7d5c', 'literature', 0.12, 0.66],
    ['A Room with a View', 'E. M. Forster', 1908, '#384a5a', 'literature', 0.11, 0.7],
    ['Jane Eyre', 'Charlotte Brontë', 1847, '#2f4f3a', 'literature', 0.16, 0.74],
    ['The Book of Tea', 'Kakuzō Okakura', 1906, '#c0502e', 'cooking', 0.07, 0.56],
    ['Elizabeth and Her German Garden', 'Elizabeth von Arnim', 1898, '#6b7f4a', 'garden', 0.1, 0.62],
    ['Walden', 'Henry David Thoreau', 1854, '#5a3a86', 'essays', 0.13, 0.68],
    ['Travels with a Donkey in the Cévennes', 'Robert Louis Stevenson', 1879, '#5a7a4a', 'travel', 0.1, 0.6],
    ['The Importance of Being Earnest', 'Oscar Wilde', 1899, '#c9b07a', 'drama', 0.08, 0.58],
    ['Leaves of Grass', 'Walt Whitman', 1855, '#5a6b5a', 'poetry', 0.13, 0.72],
    ['A Shropshire Lad', 'A. E. Housman', 1896, '#9b5a4a', 'poetry', 0.07, 0.54],
    ['My First Summer in the Sierra', 'John Muir', 1911, '#a08050', 'nature', 0.11, 0.64],
  ],
};
const rec = b => ({ title: b[0], author: b[1], year: b[2], colour: b[3], shelf: b[4], size: 'small' });
const SPINE_FONT = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
function spine(b, lying) {
  return (g, w, h) => {
    const c = new THREE.Color(b[3]), lum = 0.3 * c.r + 0.59 * c.g + 0.11 * c.b, ink = lum > 0.5 ? '#1c1a17' : '#f1e9d6';
    g.fillStyle = b[3]; g.fillRect(0, 0, w, h);
    const sh = lying ? g.createLinearGradient(0, 0, 0, h) : g.createLinearGradient(0, 0, w, 0);
    sh.addColorStop(0, 'rgba(0,0,0,.3)'); sh.addColorStop(0.2, 'rgba(0,0,0,0)'); sh.addColorStop(0.8, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.3)');
    g.fillStyle = sh; g.fillRect(0, 0, w, h);
    g.fillStyle = ink; g.globalAlpha = 0.7;
    if (lying) { g.fillRect(10, 0, 2, h); g.fillRect(w - 12, 0, 2, h); } else { g.fillRect(0, 14, w, 2); g.fillRect(0, h - 16, w, 2); }
    g.globalAlpha = 1;
    const long = lying ? w : h, short = lying ? h : w, author = b[1].split(' ').pop();
    g.save(); if (!lying) { g.translate(w / 2, h / 2); g.rotate(Math.PI / 2); } else g.translate(w / 2, h / 2);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    let px = Math.min(22, short * 0.62); g.font = `${px}px ${SPINE_FONT}`;
    while (g.measureText(b[0]).width > long - 90 && px > 7) { px -= 1; g.font = `${px}px ${SPINE_FONT}`; }
    g.fillText(b[0], -24, 1);
    g.font = `${Math.max(7, px * 0.7)}px ${SPINE_FONT}`; g.globalAlpha = 0.85; g.textAlign = 'right'; g.fillText(author.toUpperCase(), long / 2 - 18, 1);
    g.restore(); g.globalAlpha = 1;
  };
}

// ---- Where it stands, and how it is made ----
const AT = { x: -4.7, z: 62.2, yaw: 0.9 };      // just inside the gate, on the left, its door turned toward the gate
const DOOR = { x0: -0.72, x1: 0.72, y0: 3.56, y1: 5.0, z: 0.8 };
const GREEN = 'c#4f6e5c/0.55', CREAM_IN = 'c#e6d8b8/0.9', STONE = 'c#8c867a/0.95', BRASS = 'c#b08d4a/0.35/1', IRON = PAINT.iron;
const ROOF = y => 6.0 - 0.73 * Math.abs(y);       // the roof line over x

export function buildLibrary(K) {
  const f = place(K, AT.x, 0, AT.z, AT.yaw);
  // the pier, the post and its brackets
  f.box('clinker', -0.55, 0.55, 0, 1.15, -0.55, 0.55);
  f.box(STONE, -0.64, 0.64, 1.15, 1.27, -0.64, 0.64);
  f.sphere(PAINT.moss, -0.42, 1.27, 0.3, 0.2, 0.25, 1, 1.3, 0.9);
  f.box('timber', -0.21, 0.21, 1.27, 3.32, -0.21, 0.21);
  for (const s of [-1, 1]) {
    for (const [a, b, y] of [[0.21, 0.5, 2.85], [0.5, 0.78, 3.02], [0.78, 0.98, 3.16]]) f.box('timber', s > 0 ? a : -b, s > 0 ? b : -a, y, 3.32, -0.12, 0.12);
    for (const [a, b, y] of [[0.21, 0.6, 2.98], [0.6, 0.86, 3.16]]) f.box('timber', -0.1, 0.1, y, 3.32, s > 0 ? a : -b, s > 0 ? b : -a);
  }
  // the floor, run out in front as a little porch
  f.box('timber', -1.18, 1.18, 3.32, 3.44, -0.86, 1.08);
  // shingled walls, lined inside with cream paint, trimmed in dark timber
  const SH = 4.4;                                   // shingles at a twelfth of the house's
  for (const s of [-1, 1]) f.box('shake', s * 0.95, s * 1.07, 3.44, 5.22, -0.78, 0.8, { uv: SH });
  f.box('shake', -1.07, 1.07, 3.44, 5.22, -0.78, -0.66, { uv: SH });
  f.box('shake', -1.07, -0.74, 3.54, 5.22, 0.68, 0.8, { uv: SH }); f.box('shake', 0.74, 1.07, 3.54, 5.22, 0.68, 0.8, { uv: SH });
  f.box('shake', -0.74, 0.74, 5.02, 5.22, 0.68, 0.8, { uv: SH });
  f.box('timber', -1.07, 1.07, 3.44, 3.56, 0.68, 0.83);                                      // the sill
  for (const s of [-1, 1]) { f.box('timber', s * 0.72, s * 0.84, 3.56, 5.1, 0.8, 0.83); f.box('timber', s * 1.03, s * 1.11, 3.44, 5.22, 0.72, 0.84); f.box('timber', s * 1.03, s * 1.11, 3.44, 5.22, -0.86, -0.74); }
  f.box('timber', -0.84, 0.84, 5.0, 5.1, 0.8, 0.83);
  for (const s of [-1, 1]) f.box(CREAM_IN, s * 0.93, s * 0.95, 3.44, 5.2, -0.66, 0.68);
  f.box(CREAM_IN, -0.93, 0.93, 3.44, 5.2, -0.66, -0.64); f.box(CREAM_IN, -0.93, 0.93, 5.18, 5.2, -0.64, 0.68);
  f.box('timber', -0.93, 0.93, 4.26, 4.31, -0.64, 0.6);                                       // the shelf
  // gables, the roof on its rafter tails, bargeboards and ridge
  for (const [z0, z1] of [[0.68, 0.8], [-0.78, -0.66]]) f.prism('shake', [[-1.07, 5.22], [1.07, 5.22], [0, 6.0]], z0, z1, SH);
  f.box('c#2b2a26/0.6', -0.17, 0.17, 5.42, 5.66, 0.8, 0.81); f.box(PAINT.cream, -0.2, 0.2, 5.38, 5.42, 0.8, 0.84); f.box(PAINT.cream, -0.2, 0.2, 5.66, 5.7, 0.8, 0.84);      // the attic window
  for (const x of [-0.2, 0, 0.2]) f.box(PAINT.cream, x - 0.02, x + 0.02, 5.42, 5.66, 0.8, 0.84);
  const ang = Math.atan2(0.73, 1), half = 1.52, len = Math.hypot(half, half * 0.73);
  for (const s of [-1, 1]) {
    const g = new THREE.BoxGeometry(len, 0.09, 2.36).toNonIndexed(); g.rotateZ(-s * ang); g.translate(s * half / 2, (ROOF(0) + ROOF(half)) / 2 + 0.045 / Math.cos(ang), 0.17);
    feetUV(g, 4); f.geo('roof', g);
    for (let z = -0.9; z <= 1.31; z += 0.37) f.beam('timber', [s * 0.95, ROOF(0.95) - 0.06, z], [s * 1.56, ROOF(1.56) - 0.06, z], 0.06, 0.1);
    for (const z of [1.35, -1.01]) f.beam('timber', [0, 6.02, z], [s * 1.57, ROOF(1.57) + 0.02, z], 0.15, 0.05);
    f.sphere(PAINT.moss, s * 1.25, ROOF(1.25) + 0.08, -0.5 + s * 0.4, 0.14, 0.3, 1, 1.5, 1.1);
  }
  f.box('timber', -0.08, 0.08, 6.0, 6.14, -1.05, 1.39);
  // the porch: two posts, a beam with a cloud lift, the open gable over it
  for (const s of [-1, 1]) { f.box('timber', s * 0.92, s * 1.02, 3.44, 5.12, 0.98, 1.08); f.box('timber', s * 0.78, s * 0.92, 5.0, 5.12, 1.0, 1.06); }
  f.box('timber', -1.06, 1.06, 5.12, 5.22, 0.97, 1.09);
  // the chimney
  f.box('clinker', 0.42, 0.72, 5.3, 6.55, -0.58, -0.26, { uv: 3 }); f.box(STONE, 0.38, 0.76, 6.55, 6.62, -0.62, -0.22);
  for (const dx of [0.5, 0.64]) f.lathe(PAINT.terracotta, dx, 6.62, -0.42, [[0.05, 0], [0.045, 0.14], [0.055, 0.17], [0.04, 0.17]], 8);
  // the door's latch keeper on the casing; hinges are on the door
  f.box(BRASS, 0.74, 0.8, 4.2, 4.3, 0.83, 0.86);
  // books
  const shelfBooks = (list, y0, front) => {
    let x = -0.86; const out = [];
    for (const b of list) {
      const [w, h] = [b[5], b[6]], c = 'c#' + b[3].slice(1) + '/0.85';
      f.box(c, x, x + w - 0.005, y0, y0 + h, -0.55, front);
      f.sign(spine(b, false), Math.max(16, Math.round(256 * w / h)), 256, w - 0.012, h - 0.01, x + w / 2 - 0.0025, y0 + h / 2, front + 0.004);
      out.push({ b, at: f.w(x + w / 2, y0 + h / 2, front + 0.02) });
      x += w + (b[0].length % 3 === 0 ? 0.01 : 0.003);
    }
    return { out, x };
  };
  const low = shelfBooks(BOOKS.low, 3.445, 0.42), high = shelfBooks(BOOKS.high, 4.312, 0.44);
  let y = 3.445;
  for (const b of BOOKS.lowStack) {                  // two lying flat at the end of the low shelf
    const [w, h] = [b[5], b[6]], x0 = 0.9 - w - 0.02, c = 'c#' + b[3].slice(1) + '/0.85';
    f.box(c, x0, x0 + w, y, y + h - 0.003, -0.4, 0.38);
    f.sign(spine(b, true), 256, Math.max(16, Math.round(256 * h / w)), w - 0.01, h - 0.012, x0 + w / 2, y + h / 2, 0.384);
    low.out.push({ b, at: f.w(x0 + w / 2, y + h / 2, 0.4) }); y += h;
  }
  f.sphere('c#7a6a50/0.9', 0.66, 4.312 + 0.07, 0.1, 0.09, 0.8, 1, 1.2, 1);      // a pine cone someone left
  // "Take a book, leave a book", hung under the porch
  for (const s of [-1, 1]) f.tube(IRON, [s * 0.55, 3.32, 0.95], [s * 0.55, 3.0, 0.95], 0.012, 4);
  f.box('c#e9dcc0/0.9', -0.68, 0.68, 2.6, 3.02, 0.92, 0.96);
  f.sign((g, w, h) => {
    g.fillStyle = '#efe3c6'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#6f8a6a'; g.lineWidth = 5; g.beginPath(); g.roundRect?.(12, 12, w - 24, h - 24, 18); g.stroke();
    g.fillStyle = '#3c4a3a'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `italic 58px ${SPINE_FONT}`; g.fillText('Take a book,', w / 2, h * 0.36);
    g.font = `italic 58px ${SPINE_FONT}`; g.fillText('leave a book', w / 2, h * 0.7);
    g.fillStyle = '#b5533c'; for (const [x, y2] of [[40, h - 34], [w - 40, 34]]) { g.beginPath(); g.arc(x, y2, 7, 0, 7); g.fill(); }
    g.fillStyle = '#6f8a6a'; for (const [x, y2, a] of [[56, h - 40, -0.6], [w - 58, 42, 2.5]]) { g.save(); g.translate(x, y2); g.rotate(a); g.beginPath(); g.ellipse(0, 0, 13, 5, 0, 0, 7); g.fill(); g.restore(); }
  }, 512, 156, 1.32, 0.4, 0, 2.81, 0.963);
  // the lantern, on a bracket from the right-hand porch post
  f.beam(IRON, [0.97, 4.92, 1.03], [1.36, 4.92, 1.03], 0.03, 0.03); f.tube(IRON, [1.02, 4.7, 1.03], [1.22, 4.92, 1.03], 0.01, 4);
  f.tube(IRON, [1.32, 4.92, 1.03], [1.32, 4.8, 1.03], 0.008, 3);
  f.lathe(IRON, 1.32, 4.66, 1.03, [[0.01, 0.0], [0.09, 0.0], [0.1, 0.03], [0.01, 0.14]], 4);
  f.lathe(GLOW, 1.32, 4.43, 1.03, [[0.01, 0], [0.05, 0.02], [0.065, 0.1], [0.05, 0.2], [0.01, 0.22]], 8);
  for (const [dx, dz] of [[-0.065, -0.065], [0.065, -0.065], [-0.065, 0.065], [0.065, 0.065]]) f.tube(IRON, [1.32 + dx, 4.41, 1.03 + dz], [1.32 + dx, 4.66, 1.03 + dz], 0.008, 3);
  f.box(IRON, 1.24, 1.4, 4.38, 4.42, 0.95, 1.11);
  // a pot of thyme on the porch, clear of the door
  f.lathe(PAINT.terracotta, 0.9, 3.44, 0.98, [[0.01, 0], [0.06, 0], [0.08, 0.12], [0.09, 0.14], [0.08, 0.14]], 10);
  // the step for small readers
  const STEP = 'c#a24b35/0.75';
  f.box(STEP, -0.6, 0.6, 0.7, 0.78, 1.5, 1.96); f.box(STEP, -0.6, 0.6, 0.33, 0.4, 1.96, 2.36);
  for (const s of [-1, 1]) { f.box(STEP, s * 0.5, s * 0.58, 0, 0.7, 1.52, 1.94); f.box(STEP, s * 0.5, s * 0.58, 0, 0.33, 1.98, 2.34); }
  f.box(STEP, -0.5, 0.5, 0.4, 0.7, 1.9, 1.96);
  f.sign((g, w, h) => { g.fillStyle = '#9a4533'; g.fillRect(0, 0, w, h); g.fillStyle = '#f3e6c8'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `italic 44px ${SPINE_FONT}`; g.fillText('for small readers', w / 2, h / 2 + 2); }, 400, 96, 0.9, 0.22, 0, 0.55, 1.965);
  // two ceramic toadstools in the catmint
  for (const [x, z, s] of [[-1.3, 0.95, 1.6], [-0.95, 1.35, 1.0]]) {
    f.lathe('c#efe6d2/0.35', x, 0, z, [[0.1, 0], [0.075, 0.08], [0.065, 0.25], [0.07, 0.33], [0.01, 0.34]], 10, s);
    f.lathe('c#e9dcc2/0.6', x, 0.3 * s, z, [[0.06, 0.02], [0.25, 0.0], [0.01, 0.05]], 12, s);
    f.lathe('c#b5352b/0.25', x, 0.3 * s, z, [[0.27, 0], [0.285, 0.03], [0.26, 0.11], [0.19, 0.19], [0.1, 0.235], [0.01, 0.245]], 14, s);
    for (let i = 0; i < 7; i++) { const a = i * 2.4 + x, r = (i % 3 === 0 ? 0.08 : 0.19) * s; f.sphere('c#f4eee2/0.35', x + Math.cos(a) * r, (0.3 + (i % 3 === 0 ? 0.225 : 0.165)) * s, z + Math.sin(a) * r, 0.032 * s, 0.45, 0); }
  }
  f.collide(-1.2, 1.2, -0.9, 1.12, 6.7);
  f.keepOut(-0.8, 0.8, -0.8, 0.8); f.keepOut(-0.65, 0.65, 1.45, 2.4);
  ownPlants(K, 6211, F => {
    for (const [x, z, k, s] of [[-1.15, 0.3, 'catmint', 0.75], [1.05, -0.2, 'catmint', 0.7], [-0.9, -0.9, 'lavender', 0.75], [0.9, 0.95, 'wildflowers', 0.55], [-1.6, 1.4, 'catmint', 0.6], [0.2, -1.2, 'herbs', 0.9]]) { const p = f.w(x, 0, z); F.add(k, p.x, p.z, s); }
    const t = f.w(0.9, 3.58, 0.98); F.add('herbs', t.x, t.z, 0.14, { y: t.y });
  });
  for (const [x, z, s] of [[0.95, 0.75, 0.42], [-0.7, -0.95, 0.5]]) { const p = f.w(x, 0, z); K.ferns.push([p.x, 0.05, p.z, s]); }

  // the door, built about its hinge
  const d = f.part(DOOR.x0, 0, DOOR.z), W = DOOR.x1 - DOOR.x0, { y0, y1 } = DOOR;
  d.box(GREEN, 0, 0.13, y0, y1, 0, 0.06); d.box(GREEN, W - 0.13, W, y0, y1, 0, 0.06);
  d.box(GREEN, 0.13, W - 0.13, y0, y0 + 0.16, 0, 0.06); d.box(GREEN, 0.13, W - 0.13, y1 - 0.14, y1, 0, 0.06);
  d.box(GREEN, 0.13, 0.48, y1 - 0.26, y1 - 0.14, 0, 0.06); d.box(GREEN, W - 0.48, W - 0.13, y1 - 0.26, y1 - 0.14, 0, 0.06);     // the cloud lift in the top rail
  for (const x of [0.53, W - 0.53]) d.box(GREEN, x - 0.018, x + 0.018, y0 + 0.16, y1 - 0.26, 0.012, 0.05);
  d.box(GREEN, 0.13, W - 0.13, 4.43, 4.465, 0.012, 0.05);
  d.box('glass', 0.13, W - 0.13, y0 + 0.16, y1 - 0.14, 0.026, 0.034);
  d.box(BRASS, W - 0.12, W - 0.04, 4.15, 4.35, 0.06, 0.075); d.sphere(BRASS, W - 0.08, 4.25, 0.11, 0.035, 1, 1);
  d.tube(BRASS, [W - 0.08, 4.25, 0.075], [W - 0.08, 4.25, 0.1], 0.012, 5);
  for (const y of [y0 + 0.2, y1 - 0.2]) d.box(BRASS, -0.02, 0.07, y - 0.05, y + 0.05, 0.06, 0.072);

  K.setups.push(ctx => libraryLife(ctx, d, f, [...low.out, ...high.out]));
}

function libraryLife(ctx, d, f, books) {
  const door = buildPart(ctx, d, 'little library door');
  const sw = swinger(ctx, door, 'y', 0, -1.72, 2.4);
  const FAR = 1e9, shut = f.w(0, 4.3, 0.92), ajar = f.w(-0.82, 4.3, 1.5);
  const ent = { x: shut.x, y: shut.y, z: shut.z, reach: 6.5, size: 0.75,
    label: () => (sw.open ? 'close the little library' : 'open the little library'),
    act: () => { sw.set(!sw.open); const p = sw.open ? ajar : shut; Object.assign(ent, { x: p.x, y: p.y, z: p.z, size: sw.open ? 0.3 : 0.75 }); for (const b of spines) b.reach = sw.open ? 4.8 : 0; } };
  ctx.interact.push(ent);
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const spines = books.map(({ b, at }) => ({ x: at.x, y: at.y, z: at.z, reach: 0, size: Math.min(0.09, b[5] * 0.6),
    label: () => `take out <i>${esc(b[0])}</i>, ${esc(b[1])}`,
    act: () => {
      const r = rec(b), h = window.__hands;
      if (h?.takeDown) h.takeDown(r).catch?.(() => window.houseUI?.toast?.(`${r.title}, by ${r.author}`));
      else window.houseUI?.toast?.(`${r.title}, by ${r.author} (${r.year}). Take it home, or leave another in its place.`);
    } }));
  for (const s of spines) ctx.interact.push(s);
  if (new URLSearchParams(location.search).has('libraryopen')) ent.act();
}
