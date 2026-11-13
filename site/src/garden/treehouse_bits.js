// The treehouse's helpers (treehouse.js): the oak's bones, and the one small sheet of drawings that every
// printed thing in it shares, on the one mesh of its own (its thin parts, its printed things, its lights,
// and the swing, the only thing in it that moves).

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng } from './cards.js';

// ---- The oak's bones ---------------------------------------------------------------------------------
// trees.js grows every tree from its seed and keeps nothing but the merged mesh. The treehouse has to sit
// on the real limbs, so the oak is grown again here from the same seed, step for step and draw for draw
// with trees.js's recipe (the oak's line in SPECIES, the root flare, grow() and tuft()): if that recipe
// changes, change this to match, or the deck and the limbs part company (gardentest.html ?treehouse=1
// checks the two agree).
const OAK = { H: 46, trunk: 2.1, bole: 0.22, kids0: 4, depth: 4, lift0: [0.42, 0.3], lift: [0.12, 0.38], follow0: 0.15, follow: 0.42, len0: [0.27, 0.07], tufts: 4, tuft: [11.5, 7], spread: 5 };
export function oakBones(p) {
  const sp = OAK, r = rng(p.seed ?? Math.round(p.x * 13 + p.z * 7)), Ht = p.height ?? sp.H, trunkR = p.trunk ?? sp.trunk * Ht / sp.H, y0 = p.y ?? 0;
  const limbs = [], V = THREE.Vector3;
  const tuft = () => { r(); r(); r(); r(); };                       // its shade, and the card's turn and tilt
  const grow = (a, dir, len, rad, depth) => {
    const b = a.clone().addScaledVector(dir, len);
    limbs.push({ a, b, r0: rad, r1: rad * 0.72, depth });
    if (depth >= 2) {
      const k = depth >= sp.depth ? sp.tufts : 1;
      for (let i = 0; i < k; i++) { r(); r(); r(); r(); r(); tuft(); }      // where along it, its offset (three), its size; then tuft()
    }
    if (depth >= sp.depth) return;
    const kids = depth === 0 ? sp.kids0 : 2 + (r() < 0.55 ? 1 : 0), turn = r() * Math.PI * 2;
    for (let i = 0; i < kids; i++) {
      const az = turn + (i / kids) * Math.PI * 2 + (r() - 0.5) * 0.9;
      const lift = depth === 0 ? sp.lift0[0] + r() * sp.lift0[1] : sp.lift[0] + r() * sp.lift[1];
      const d = new V(Math.cos(az), 0, Math.sin(az)).multiplyScalar(1 - lift).add(new V(0, lift, 0));
      d.lerp(dir, depth === 0 ? sp.follow0 : sp.follow).normalize();
      if (d.y < 0.05) d.y = 0.05 + r() * 0.1;
      grow(b, d.normalize(), depth === 0 ? Ht * (sp.len0[0] + r() * sp.len0[1]) : len * (0.74 + r() * 0.16), rad * 0.72 * (0.62 + r() * 0.14), depth + 1);
    }
  };
  const base = new V(p.x, y0 - 0.5, p.z);
  const lean = new V((r() - 0.5) * 0.22, 1, (r() - 0.5) * 0.22).normalize();
  limbs.push({ a: base.clone().add(new V(0, -0.5, 0)), b: base.clone().add(new V(0, 1.6, 0)), r0: trunkR * 1.5, r1: trunkR, depth: -1 });      // the root flare
  grow(base.clone().add(new V(0, 1.4, 0)), lean, Ht * sp.bole, trunkR, 0);
  return { limbs, trunkR };
}
// How far a point is inside the wood (negative: outside), counting the limbs given
export function inWood(limbs, x, y, z, pad = 0) {
  let best = -Infinity;
  for (const l of limbs) {
    const ax = l.a.x, ay = l.a.y, az = l.a.z, dx = l.b.x - ax, dy = l.b.y - ay, dz = l.b.z - az, L2 = dx * dx + dy * dy + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy + (z - az) * dz) / L2));
    const qx = ax + dx * t - x, qy = ay + dy * t - y, qz = az + dz * t - z, rr = l.r0 + (l.r1 - l.r0) * t + pad;
    best = Math.max(best, rr - Math.sqrt(qx * qx + qy * qy + qz * qz));
  }
  return best;
}

// ---- Paint, and the sheet ------------------------------------------------------------------------------
// The garden's painted parts (tools.js Paint) are one shared mesh; the treehouse adds its ordinary timber
// there. Its thin things (ropes, nets, wires: no shadows wanted from them) and its parts out past x = 119.5
// (where the shared paint would start a new region, and a new draw) go into a mesh of its own, which also
// carries the printed things (the map, the drawings, the book spines, the sign) from one 512 sheet.
export const isPaint = name => /^c#[0-9a-f]{6}(\/[\d.]+)?(\/0?\.?[0-4]\d*)?$/i.test(name) && !/\/[\d.]+\/(0\.[5-9]|1)/.test(name);
export const paintColour = mat => new THREE.Color(parseInt(/^c#([0-9a-f]{6})/i.exec(mat)[1], 16)).multiplyScalar(0.78);
export const SHEET = 512;
export const RECT = {
  map: [0, 0, 256, 256], d1: [256, 0, 128, 128], d2: [384, 0, 128, 128], d3: [256, 128, 128, 128],
  sign: [384, 192, 128, 64], books: [0, 256, 256, 128], tin: [256, 256, 128, 128],
  net: [0, 384, 128, 128], white: [480, 480, 32, 32],
  glow: [448, 448, 32, 32],      // the cabin's ceiling: cream by day, warm with lamplight after dark (the glow map)
  bulb: [416, 448, 32, 32],      // bulbs and lantern glass: they glow in full (the glow map)
};
// The glow map: the sheet's layout at an eighth of the size, black but for the ceiling's square
export function drawGlow() {
  const c = document.createElement('canvas'); c.width = c.height = SHEET / 8; const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height);
  for (const [r, c] of [[RECT.glow, '#4a3218'], [RECT.bulb, '#ffd9a0']]) { const [x, y, w, h] = r; g.fillStyle = c; g.fillRect(x / 8 + 0.5, y / 8 + 0.5, w / 8 - 1, h / 8 - 1); }
  return c;
}
// A geometry made ready for the sheet's material: position, normal, uv (into the sheet), colour
export function prep(g, colour, rect) {
  const q = g.index ? g.toNonIndexed() : g.clone();
  for (const k of Object.keys(q.attributes)) if (!['position', 'normal', 'uv'].includes(k)) q.deleteAttribute(k);
  if (!q.attributes.normal) q.computeVertexNormals();
  const n = q.attributes.position.count, uv = new Float32Array(n * 2), c = new Float32Array(n * 3);
  if (rect && q.attributes.uv) {
    const [x, y, w, h] = rect, s = q.attributes.uv;
    for (let i = 0; i < n; i++) { uv[i * 2] = (x + 1 + s.getX(i) * (w - 2)) / SHEET; uv[i * 2 + 1] = 1 - (y + 1 + (1 - s.getY(i)) * (h - 2)) / SHEET; }
  } else {
    const [x, y, w, h] = RECT.white, u = (x + w / 2) / SHEET, v = 1 - (y + h / 2) / SHEET;
    for (let i = 0; i < n; i++) { uv[i * 2] = u; uv[i * 2 + 1] = v; }
  }
  for (let i = 0; i < n; i++) { c[i * 3] = colour.r; c[i * 3 + 1] = colour.g; c[i * 3 + 2] = colour.b; }
  q.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); q.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return q;
}
export class Sheet {
  constructor() { this.list = []; }
  paint(mat, g) { this.list.push(prep(g, paintColour(mat), null)); }
  print(g, rect, k = 0.92) { this.list.push(prep(g, new THREE.Color(k, k, k), rect)); }
  build() { return this.list.length ? mergeGeometries(this.list) : null; }
}
// A flat rectangle: centre c, unit vectors u (right) and v (up), w by h; uv 0..1 across it
export function quad(c, u, v, w, h) {
  const p = [], at = (a, b) => [c[0] + u[0] * a + v[0] * b, c[1] + u[1] * a + v[1] * b, c[2] + u[2] * a + v[2] * b];
  const A = at(-w / 2, -h / 2), B = at(w / 2, -h / 2), C = at(w / 2, h / 2), Dd = at(-w / 2, h / 2);
  p.push(...A, ...B, ...C, ...A, ...C, ...Dd);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1], 2));
  g.computeVertexNormals(); return g;
}
// A sheet of net over a surface P(s, t) (s, t in 0..1), in tiles of about `tile` feet, each showing the
// whole net cell of the sheet (the pattern meets itself at the tile edges)
export function netPatch(P, ls, lt, tile = 1.3) {
  const ns = Math.max(1, Math.round(ls / tile)), nt = Math.max(1, Math.round(lt / tile)), pos = [], uv = [];
  for (let i = 0; i < ns; i++) for (let j = 0; j < nt; j++) {
    const a = P(i / ns, j / nt), b = P((i + 1) / ns, j / nt), c = P((i + 1) / ns, (j + 1) / nt), d = P(i / ns, (j + 1) / nt);
    pos.push(...a, ...b, ...c, ...a, ...c, ...d); uv.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
  return g;
}

// ---- What moves, in the same mesh ------------------------------------------------------------------------
// Each moving part is a run of vertices after the static ones, kept in its own local frame; set(part, m) writes
// that run out through the matrix m, and only that run is sent to the graphics card.
export function makeMovers() {
  const parts = [], v = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3();
  const api = {
    parts,
    part(pieces) { const p = { g: mergeGeometries(pieces) }; parts.push(p); return p; },
    build(material, base, centre, radius) {
      let at = base ? base.attributes.position.count : 0;
      for (const p of parts) { p.start = at; p.count = p.g.attributes.position.count; at += p.count; p.base = p.g.attributes.position.array.slice(); p.nbase = p.g.attributes.normal.array.slice(); }
      const geo = mergeGeometries([...(base ? [base] : []), ...parts.map(p => p.g)]);
      geo.attributes.position.setUsage(THREE.DynamicDrawUsage); geo.attributes.normal.setUsage(THREE.DynamicDrawUsage);
      geo.boundingSphere = new THREE.Sphere(centre, radius);
      api.mesh = new THREE.Mesh(geo, material);
      for (const p of parts) p.g.dispose();
      return api.mesh;
    },
    set(p, m) {
      const P = api.mesh.geometry.attributes.position, N = api.mesh.geometry.attributes.normal; nm.getNormalMatrix(m);
      for (let i = 0; i < p.count; i++) {
        v.fromArray(p.base, i * 3).applyMatrix4(m); P.setXYZ(p.start + i, v.x, v.y, v.z);
        n.fromArray(p.nbase, i * 3).applyMatrix3(nm).normalize(); N.setXYZ(p.start + i, n.x, n.y, n.z);
      }
      P.addUpdateRange(p.start * 3, p.count * 3); N.addUpdateRange(p.start * 3, p.count * 3);
      P.needsUpdate = N.needsUpdate = true;
    },
  };
  return api;
}

// ---- The sheet: drawn once, when the treehouse is first set up ------------------------------------------
const HAND = '"Bradley Hand", "Segoe Print", "Comic Sans MS", "Chalkboard SE", cursive';
const SERIF = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';
export const BOOKS = [      // from the house's own list (assets/books.json), the children's shelf and the tree books
  ['The Baron in the Trees', 'Italo Calvino', 1957, '#e0d6bd'], ['Swallows and Amazons', 'Arthur Ransome', 1930, '#d98a6a'],
  ['The Summer Book', 'Tove Jansson', 1972, '#8b7d5c'], ['Finn Family Moomintroll', 'Tove Jansson', 1948, '#2f6f8f'],
  ['The Little Prince', 'Antoine de Saint-Exupéry', 1943, '#e3b23c'], ['Wind, Sand and Stars', 'Antoine de Saint-Exupéry', 1939, '#e2d2a8'],
  ['A Child\'s Garden of Verses', 'Robert Louis Stevenson', 1885, '#7a5aa0'], ['The Wind in the Willows', 'Kenneth Grahame', 1908, '#7a5aa0'],
];
export function drawSheet(L) {
  const c = document.createElement('canvas'); c.width = c.height = SHEET;
  const g = c.getContext('2d'), r = rng(906);
  const jitter = (k = 1) => (r() - 0.5) * k;
  g.clearRect(0, 0, SHEET, SHEET);
  g.fillStyle = '#ffffff'; g.fillRect(...RECT.white);
  g.fillStyle = '#e2c9a2'; g.fillRect(...RECT.glow); g.fillStyle = '#fff1cc'; g.fillRect(...RECT.bulb);

  // -- the map of the island, from the garden's own layout (L: outline(a), trees, the places)
  {
    const [X, Y, W, H] = RECT.map; g.save(); g.translate(X, Y);
    const grd = g.createRadialGradient(W / 2, H / 2, 40, W / 2, H / 2, 190); grd.addColorStop(0, '#efe3c4'); grd.addColorStop(1, '#d6c39a');
    g.fillStyle = grd; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 14; i++) { g.fillStyle = `rgba(150,110,60,${0.04 + r() * 0.05})`; g.beginPath(); g.ellipse(r() * W, r() * H, 6 + r() * 20, 4 + r() * 14, r() * 3, 0, 7); g.fill(); }
    const s = 0.6, cx = W / 2 + 6, cy = H / 2 + 8;                   // north (+x) up, east (+z) to the right
    const P = (x, z) => [cx + (z - L.cz) * s, cy - (x - L.cx) * s];
    // the sky round it: a few clouds, and a warning
    g.strokeStyle = 'rgba(90,110,140,.55)'; g.lineWidth = 1.2;
    for (const [x, y] of [[22, 40], [222, 30], [30, 214], [214, 220], [236, 126]]) { g.beginPath(); for (let k = 0; k < 3; k++) g.arc(x + k * 8 - 8, y - (k === 1 ? 4 : 0), 6, Math.PI, 0); g.stroke(); }
    // the island
    g.beginPath();
    for (let i = 0; i <= 120; i++) { const a = (i / 120) * Math.PI * 2, rr = L.outline(a), [px, py] = P(L.cx + Math.cos(a) * rr, L.cz + Math.sin(a) * rr); i ? g.lineTo(px, py) : g.moveTo(px, py); }
    g.closePath(); g.fillStyle = 'rgba(122,150,82,.45)'; g.fill(); g.strokeStyle = '#4b3a28'; g.lineWidth = 1.6; g.stroke();
    g.save(); g.clip(); g.strokeStyle = 'rgba(70,90,40,.18)'; g.lineWidth = 1; for (let k = -W; k < W * 2; k += 7) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k - H, H); g.stroke(); } g.restore();
    // the brick walk to the gate
    g.strokeStyle = 'rgba(150,80,50,.8)'; g.lineWidth = 2.2; g.beginPath(); g.moveTo(...P(2, 2)); g.lineTo(...P(2, 68)); g.stroke();
    // trees: a scribbled ball on a stalk
    for (const t of L.trees) {
      const [px, py] = P(t.x, t.z), rr = Math.max(1.6, Math.min(5.5, (t.height ?? 30) / 9));
      g.fillStyle = t.kind === 'pine' ? 'rgba(50,80,50,.75)' : t.kind === 'apple' || t.kind === 'cherry' ? 'rgba(120,140,60,.75)' : 'rgba(70,100,50,.7)';
      g.beginPath(); g.arc(px, py, rr, 0, 7); g.fill(); g.strokeStyle = 'rgba(40,50,30,.6)'; g.lineWidth = 0.7; g.stroke();
    }
    // the pond, the potager, the play set, the chapel, the house
    { const [px, py] = P(L.pond.x, L.pond.z); g.fillStyle = 'rgba(80,130,160,.85)'; g.beginPath(); g.ellipse(px, py, L.pond.rz * s, L.pond.rx * s, 0.15, 0, 7); g.fill(); g.strokeStyle = '#3b4e5a'; g.lineWidth = 1; g.stroke(); }
    { const [ax, ay] = P(L.pot.x1, L.pot.z0), [bx, by] = P(L.pot.x0, L.pot.z1); g.strokeStyle = '#6a7b4a'; g.lineWidth = 1.2; g.strokeRect(ax, ay, bx - ax, by - ay); for (let k = 1; k < 4; k++) { g.beginPath(); g.moveTo(ax + 3, ay + (by - ay) * k / 4); g.lineTo(bx - 3, ay + (by - ay) * k / 4); g.stroke(); } }
    { const [px, py] = P(L.play.x, L.play.z); g.strokeStyle = '#4b3a28'; g.lineWidth = 1.2; g.strokeRect(px - 3, py - 3, 6, 6); g.beginPath(); g.moveTo(px - 3, py + 3); g.lineTo(px - 3, py + 10); g.stroke(); }
    { const [px, py] = P(L.chapel.x, L.chapel.z); g.fillStyle = '#7a5a3a'; g.fillRect(px - 6, py - 4, 11, 7); g.fillStyle = '#4b3a28'; g.fillRect(px - 0.5, py - 9, 1, 5); g.fillRect(px - 2, py - 7.5, 4, 1); }
    { const [ax, ay] = P(21.7, -46), [bx, by] = P(-21.7, 0); g.fillStyle = '#8a5a3c'; g.fillRect(ax, ay, bx - ax, by - ay); g.strokeStyle = '#3a2618'; g.lineWidth = 1.2; g.strokeRect(ax, ay, bx - ax, by - ay); g.strokeStyle = 'rgba(40,20,10,.5)'; for (let k = ay + 3; k < by; k += 3) { g.beginPath(); g.moveTo(ax, k); g.lineTo(bx, k); g.stroke(); } }
    // the treehouse: X marks it
    { const [px, py] = P(L.here.x, L.here.z); g.strokeStyle = '#b3261e'; g.lineWidth = 2.6; g.beginPath(); g.moveTo(px - 5, py - 5); g.lineTo(px + 5, py + 5); g.moveTo(px + 5, py - 5); g.lineTo(px - 5, py + 5); g.stroke(); }
    g.fillStyle = '#3b2a1a'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const label = (t, x, z, dx = 0, dy = 0, px = 9) => { const [a, b] = P(x, z); g.font = `${px}px ${HAND}`; g.fillText(t, a + dx, b + dy); };
    label('the house', 0, -23, 0, 14, 9); label('pond', L.pond.x, L.pond.z, 0, 12); label('veg', L.pot.cx, L.pot.cz, 0, 0); label('chapel', L.chapel.x, L.chapel.z, 0, 11);
    label('swings', L.play.x, L.play.z, -16, 0); label('US!', L.here.x, L.here.z, -14, 6, 10); label('bees', 86, -100, 0, 0, 8); label('gate', 2, 70, 12, 0, 8);
    g.font = `italic 15px ${SERIF}`; g.fillText('Our Island', W / 2, 15);
    g.font = `9px ${HAND}`; g.fillStyle = 'rgba(60,70,100,.9)'; g.fillText('here be clouds', 48, H - 12); g.fillText('(do not fall off)', 196, H - 12);
    // the compass
    g.save(); g.translate(W - 26, 44); g.strokeStyle = '#3b2a1a'; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, 10, 0, 7); g.stroke();
    g.beginPath(); g.moveTo(0, -15); g.lineTo(3, 0); g.lineTo(0, 15); g.lineTo(-3, 0); g.closePath(); g.fillStyle = '#7a3a28'; g.fill(); g.font = `bold 8px ${SERIF}`; g.fillStyle = '#3b2a1a'; g.fillText('N', 0, -20); g.restore();
    g.strokeStyle = 'rgba(80,55,30,.6)'; g.lineWidth = 2; g.strokeRect(3, 3, W - 6, H - 6);
    g.restore();
  }

  // -- three crayon drawings, done by a child at the window seat
  const crayon = (pts, colour, w = 3, close = false, fill = false) => {
    for (let pass = 0; pass < 2; pass++) {
      g.strokeStyle = colour; g.lineWidth = w * (pass ? 0.6 : 1); g.globalAlpha = pass ? 0.6 : 0.85; g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); pts.forEach(([x, y], i) => { const px = x + jitter(1.6), py = y + jitter(1.6); i ? g.lineTo(px, py) : g.moveTo(px, py); }); if (close) g.closePath();
      if (fill && !pass) { g.fillStyle = colour; g.globalAlpha = 0.35; g.fill(); g.globalAlpha = 0.85; }
      g.stroke();
    }
    g.globalAlpha = 1;
  };
  const paper = ([X, Y, W, H], tint = '#fbf8f0') => { g.save(); g.translate(X, Y); g.fillStyle = tint; g.fillRect(0, 0, W, H); g.fillStyle = 'rgba(0,0,0,.05)'; g.fillRect(0, H - 6, W, 6); };
  {
    paper(RECT.d1);      // the house, the sun, and everybody
    crayon([[20, 100], [20, 62], [64, 34], [108, 62], [108, 100]], '#7a4a2a', 4, true, true);
    crayon([[52, 100], [52, 78], [70, 78], [70, 100]], '#3f6a4a', 3, true, true);
    crayon([[30, 70], [44, 70], [44, 82], [30, 82]], '#e3b23c', 3, true, true); crayon([[82, 70], [96, 70], [96, 82], [82, 82]], '#e3b23c', 3, true, true);
    g.strokeStyle = '#e8a020'; g.lineWidth = 3; g.beginPath(); g.arc(104, 22, 11, 0, 7); g.stroke(); for (let k = 0; k < 8; k++) { const a = k * 0.785; crayon([[104 + Math.cos(a) * 15, 22 + Math.sin(a) * 15], [104 + Math.cos(a) * 21, 22 + Math.sin(a) * 21]], '#e8a020', 2); }
    crayon([[6, 110], [122, 110]], '#4a8a3a', 5);
    g.fillStyle = '#3a3a8a'; g.font = `12px ${HAND}`; g.fillText('our house', 10, 18);
    g.restore();
    paper(RECT.d2, '#f4f1ff');      // the treehouse in the oak, the flag flying
    crayon([[60, 124], [62, 70], [58, 50]], '#6a4a2a', 9); crayon([[60, 70], [30, 40]], '#6a4a2a', 6); crayon([[61, 66], [96, 38]], '#6a4a2a', 6);
    g.fillStyle = 'rgba(70,140,60,.55)'; for (let k = 0; k < 9; k++) { g.beginPath(); g.arc(30 + r() * 70, 18 + r() * 34, 12 + r() * 8, 0, 7); g.fill(); }
    crayon([[34, 78], [92, 78]], '#8a5a3a', 5); crayon([[44, 78], [44, 58], [66, 46], [86, 58], [86, 78]], '#8a5a3a', 3, true, true);
    crayon([[86, 46], [86, 24]], '#333', 2); crayon([[86, 24], [104, 29], [86, 34]], '#c0392b', 2, true, true);
    crayon([[38, 80], [36, 122]], '#a07a4a', 2); for (let y = 86; y < 122; y += 7) crayon([[33, y], [41, y]], '#a07a4a', 2);
    g.fillStyle = '#c0392b'; g.font = `11px ${HAND}`; g.fillText('MINE', 8, 112);
    g.restore();
    paper(RECT.d3, '#fffbe8');      // the island in the sky, with a balloon
    crayon([[14, 70], [114, 70], [96, 90], [70, 112], [50, 96], [26, 88]], '#7a6a5a', 3, true, true);
    crayon([[14, 70], [114, 70]], '#3f8a3a', 6);
    for (const [x, h] of [[30, 26], [48, 34], [92, 30]]) { crayon([[x, 70], [x, 70 - h * 0.5]], '#6a4a2a', 3); g.fillStyle = 'rgba(60,130,50,.7)'; g.beginPath(); g.arc(x, 70 - h * 0.6, 9, 0, 7); g.fill(); }
    crayon([[64, 70], [64, 56], [76, 48], [88, 56], [88, 70]], '#8a5a3a', 3, true, true);
    g.fillStyle = 'rgba(220,60,60,.8)'; g.beginPath(); g.ellipse(104, 22, 10, 13, 0, 0, 7); g.fill(); crayon([[104, 35], [100, 52]], '#555', 1);
    g.strokeStyle = 'rgba(120,150,200,.8)'; g.lineWidth = 2; for (const [x, y] of [[20, 26], [64, 16]]) { g.beginPath(); g.arc(x, y, 7, Math.PI, 0); g.arc(x + 10, y, 7, Math.PI, 0); g.stroke(); }
    g.fillStyle = '#3a6a9a'; g.font = `10px ${HAND}`; g.fillText('to Auntie', 34, 122);
    g.restore();
  }

  // -- the sign on the door
  {
    const [X, Y, W, H] = RECT.sign; g.save(); g.translate(X, Y);
    g.fillStyle = '#b08a5e'; g.fillRect(0, 0, W, H); for (let k = 0; k < 9; k++) { g.strokeStyle = `rgba(80,50,25,${0.15 + r() * 0.15})`; g.lineWidth = 1; g.beginPath(); g.moveTo(0, 6 + k * 6 + jitter(3)); g.bezierCurveTo(40, k * 6 + jitter(6), 80, 8 + k * 6 + jitter(6), W, 5 + k * 6); g.stroke(); }
    g.fillStyle = '#3a2214'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = `bold 15px ${HAND}`; g.fillText('NO GROWN-UPS', W / 2, 22); g.font = `12px ${HAND}`; g.fillText('without biscuits', W / 2, 44);
    g.restore();
  }
  // -- book spines, lying: one per 16 px row
  {
    const [X, Y, W] = RECT.books;
    BOOKS.forEach(([title, author, , colour], i) => {
      g.save(); g.translate(X, Y + i * 16); g.fillStyle = colour; g.fillRect(0, 0, W, 16);
      const col = new THREE.Color(colour), ink = 0.3 * col.r + 0.59 * col.g + 0.11 * col.b > 0.5 ? '#1c1a17' : '#f1e9d6';
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(0, 0, W, 2); g.fillRect(0, 14, W, 2);
      g.fillStyle = ink; g.textBaseline = 'middle'; g.font = `11px ${SERIF}`; g.textAlign = 'left'; g.fillText(title, 10, 8.5);
      g.font = `8px ${SERIF}`; g.textAlign = 'right'; g.fillText(author.split(' ').pop().toUpperCase(), W - 8, 8.5);
      g.restore();
    });
  }
  // -- the biscuit tin's lid
  {
    const [X, Y, W, H] = RECT.tin; g.save(); g.translate(X, Y);
    g.fillStyle = '#c9a24a'; g.fillRect(0, 0, W, H); g.fillStyle = '#1f3a5f'; g.beginPath(); g.arc(W / 2, H / 2, 56, 0, 7); g.fill();
    g.strokeStyle = '#e0c070'; g.lineWidth = 3; g.beginPath(); g.arc(W / 2, H / 2, 50, 0, 7); g.stroke();
    for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; g.fillStyle = k % 2 ? '#b3261e' : '#e0c070'; g.beginPath(); g.arc(W / 2 + Math.cos(a) * 42, H / 2 + Math.sin(a) * 42, 3, 0, 7); g.fill(); }
    g.fillStyle = '#f3e6c4'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `italic 19px ${SERIF}`; g.fillText('Shortbread', W / 2, H / 2 - 4); g.font = `9px ${SERIF}`; g.fillText('ALL BUTTER', W / 2, H / 2 + 14);
    g.restore();
  }
  // -- net: rope in diamonds on nothing (the tile edges meet)
  {
    const [X, Y, W, H] = RECT.net; g.save(); g.translate(X, Y); g.clearRect(0, 0, W, H);
    const P = W / 3;      // three diamonds across a tile, so a tile's edges meet the next tile's
    g.strokeStyle = '#d2bf94'; g.lineWidth = 4; g.lineCap = 'round';
    for (let k = -6; k <= 6; k++) { g.beginPath(); g.moveTo(0, k * P); g.lineTo(W, k * P + W); g.stroke(); g.beginPath(); g.moveTo(0, k * P); g.lineTo(W, k * P - W); g.stroke(); }
    g.fillStyle = '#b39a68'; for (let i = 0; i <= 6; i++) for (let j = 0; j <= 6; j++) if ((i + j) % 2 === 0) { g.beginPath(); g.arc(i * P / 2, j * P / 2, 4, 0, 7); g.fill(); }
    g.restore();
  }
  return c;
}
