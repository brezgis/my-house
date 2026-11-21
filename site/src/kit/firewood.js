// Firewood for the two fires: the living-room hearth (life.js) and the fire pit in the meadow (garden.js).
// A log is shaped here rather than turned: a round with its bark on, or a wedge split from a bigger round
// (bark on the curved back, two pale split faces meeting at the heart, the very heart knocked off), a
// little oval and lumpy, tapering, bent, its saw cuts not quite square. The cut ends wear drawn end grain
// (rings round the pith, a few drying checks, a rim of bark); the split faces wear long grain.
// Logs are laid one at a time onto what is already there (a column height map of the grate, the ash and the
// logs before), so each comes to rest on what is under it, tipping onto its other end, and none floats or
// sinks in. Where the fire reaches them they are charred (the vertex colour) and glow in checks (an emissive map
// on a second set of UVs, shown as strongly as the vertex colour's alpha says: the heat).
// Everything draws on its own seeds, so nothing else in the scene moves.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng, TAU } from './geom.js';

const sat = v => Math.max(0, Math.min(1, v));
const smooth = (a, b, v) => { const t = sat((v - a) / (b - a)); return t * t * (3 - 2 * t); };
// a smooth value noise, for the char's patches
const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
export function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), u = x - xi, v = y - yi, w = z - zi;
  const f = t => t * t * (3 - 2 * t), a = f(u), b = f(v), c = f(w), h = (i, j, k) => hash(xi + i, yi + j, zi + k);
  const l = (p, q, t) => p + (q - p) * t;
  return l(l(l(h(0, 0, 0), h(1, 0, 0), a), l(h(0, 1, 0), h(1, 1, 0), a), b), l(l(h(0, 0, 1), h(1, 0, 1), a), l(h(0, 1, 1), h(1, 1, 1), a), b), c);
}

function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

// The wood: left half, end grain round a pith at its centre (u 0.25, v 0.5, the bark's edge at radius 0.24 x 0.48);
// right half, the long grain of a split face (u 0.52 at the heart to 0.98 at the bark, v along the log).
let woodTex = null, glowTex = null, ashTex = null;
function woodTexture() {
  if (woodTex) return woodTex;
  return (woodTex = canvasTex(512, 256, (g, W, H) => {
    const q = rng(7, 31), c = H / 2, R = H * 0.48;
    // end grain: darker heart, paler sapwood, the cambium's dark line and the bark
    const f = g.createRadialGradient(c, c, 0, c, c, R);
    for (const [s, col] of [[0, '#8a6440'], [0.5, '#a57c50'], [0.72, '#c39c6c'], [0.88, '#c9a675'], [0.9, '#6a4a30'], [0.94, '#3b2a1e'], [1, '#2a1e16']]) f.addColorStop(s, col);
    g.fillStyle = '#2a1e16'; g.fillRect(0, 0, W / 2, H); g.fillStyle = f; g.beginPath(); g.arc(c, c, R, 0, TAU); g.fill();
    g.save(); g.beginPath(); g.arc(c, c, R * 0.89, 0, TAU); g.clip();
    let rr = 0; const N = 22;
    for (let k = 0; k < N; k++) {
      rr += (1.5 - k / N) * (0.6 + q() * 0.8) / N * R * 0.88 * 1.05; const p1 = q() * TAU;
      g.beginPath(); for (let j = 0; j <= 48; j++) { const a = j / 48 * TAU, m = rr * (1 + 0.025 * Math.sin(3 * a + p1)); g.lineTo(c + Math.cos(a) * m, c + Math.sin(a) * m); }
      g.strokeStyle = `rgba(92,60,34,${0.25 + q() * 0.3})`; g.lineWidth = 0.8 + q() * 1.4; g.stroke();
    }
    g.fillStyle = 'rgba(60,40,24,0.85)'; g.beginPath(); g.arc(c, c, 2.5, 0, TAU); g.fill();                 // the pith
    for (let k = 0; k < 6; k++) {                                                                         // drying checks from the heart out
      const a = q() * TAU, r0 = k ? R * (0.3 + q() * 0.3) : 3, r1 = R * 0.9, ex = Math.cos(a), ey = Math.sin(a);
      g.beginPath(); g.moveTo(c + ex * r0, c + ey * r0);
      for (let s = 1; s <= 8; s++) { const d = r0 + (r1 - r0) * s / 8, j = (q() - 0.5) * 2; g.lineTo(c + ex * d - ey * j, c + ey * d + ex * j); }
      g.strokeStyle = 'rgba(40,26,16,0.8)'; g.lineWidth = 1 + q() * (k ? 1 : 2.5); g.stroke();
    }
    g.restore();
    // split face: pale long grain, streaks and torn fibres running along the log, the bark's edge on the right
    const x0 = W / 2, sw = W / 2, lg = g.createLinearGradient(x0, 0, x0 + sw, 0);
    for (const [s, col] of [[0, '#a07850'], [0.4, '#b48c5e'], [0.8, '#c8a372'], [0.92, '#bf9a6a'], [0.95, '#5a3f2a'], [1, '#2a1e16']]) lg.addColorStop(s, col);
    g.fillStyle = lg; g.fillRect(x0, 0, sw, H);
    for (let k = 0; k < 70; k++) {
      const x = x0 + q() * sw * 0.93, y = q() * H, len = 20 + q() * 120;
      g.strokeStyle = q() < 0.6 ? `rgba(90,60,34,${0.15 + q() * 0.25})` : `rgba(230,200,160,${0.12 + q() * 0.2})`; g.lineWidth = 0.6 + q() * 2;
      g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + (q() - 0.5) * 6, y + len / 3, x + (q() - 0.5) * 6, y + 2 * len / 3, x + (q() - 0.5) * 4, y + len); g.stroke();
    }
  }));
}
// The glow: char splits into small blocks as it burns ("alligatoring"), and the cracks between them glow. Long
// cracks run along the grain (v, along the log), shorter ones across; the blocks themselves a dull red. It tiles,
// and is read through uv1 (about four tiles to the foot); how strongly it shows is the vertex colour's alpha (the heat).
function glowTexture() {
  if (glowTex) return glowTex;
  glowTex = canvasTex(128, 128, (g, W, H) => {
    const q = rng(11, 5); g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    for (let k = 0; k < 60; k++) { const x = q() * W, y = q() * H, r = 6 + q() * 14, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(110,22,3,0.3)'); gr.addColorStop(1, 'rgba(110,22,3,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r); }
    const line = (pts, wd, col) => { for (const ox of [-W, 0, W]) for (const oy of [-H, 0, H]) { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x + ox, y + oy) : g.moveTo(x + ox, y + oy))); g.strokeStyle = col; g.lineWidth = wd; g.stroke(); } };
    // along the grain: wandering cracks of all lengths, a few long and bright, most short and dim
    const xs = [];
    for (let k = 0; k < 16; k++) {
      let x = q() * W, y = q() * H; const n = 2 + Math.floor(q() * q() * 14), pts = [[x, y]]; xs.push([x, y, n * 7]);
      for (let s = 0; s < n; s++) { x += (q() - 0.5) * 3.5; y += 5 + q() * 4; pts.push([x, y]); }
      const hot = q(); line(pts, 0.8 + hot * 1.6, `rgba(255,${(70 + hot * 110) | 0},${(10 + hot * 40) | 0},${0.5 + hot * 0.5})`);
    }
    // across: short, staggered, leaving the long cracks at an angle
    for (let k = 0; k < 55; k++) {
      const [x0, y0, L] = xs[Math.floor(q() * xs.length)], y = y0 + q() * L, dir = q() < 0.5 ? -1 : 1, l = 3 + q() * 9, hot = q();
      line([[x0, y], [x0 + dir * l * 0.5, y + (q() - 0.5) * 3], [x0 + dir * l, y + (q() - 0.5) * 4]], 0.6 + hot * 1.1, `rgba(255,${(60 + hot * 90) | 0},10,${0.4 + hot * 0.5})`);
    }
  });
  glowTex.wrapS = glowTex.wrapT = THREE.RepeatWrapping; glowTex.channel = 1;
  return glowTex;
}
// Ash: pale grey with charcoal crumbs; its emissive map is a scatter of coals (on the ash's own UVs)
function ashTextures() {
  if (ashTex) return ashTex;
  const q = rng(23, 9);
  const map = canvasTex(256, 256, (g, W) => {
    g.fillStyle = '#8f8b86'; g.fillRect(0, 0, W, W);
    for (let k = 0; k < 2400; k++) { const v = 90 + q() * 90 | 0; g.fillStyle = `rgba(${v},${v - 2},${v - 5},0.45)`; g.fillRect(q() * W, q() * W, 1 + q() * 2.5, 1 + q() * 2); }
    for (let k = 0; k < 160; k++) { g.fillStyle = `rgba(205,200,192,${0.3 + q() * 0.4})`; g.fillRect(q() * W, q() * W, 1, 1 + q()); }
    for (let k = 0; k < 90; k++) { g.fillStyle = `rgba(24,20,18,${0.4 + q() * 0.5})`; const r = 0.6 + q() * 1.8; g.beginPath(); g.ellipse(q() * W, q() * W, r * 1.4, r, q() * 3, 0, TAU); g.fill(); }
  });
  const glow = canvasTex(256, 256, (g, W) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, W);
    for (let k = 0; k < 260; k++) {
      const x = q() * W, y = q() * W, d = Math.hypot(x - W / 2, y - W / 2) / (W / 2); if (d > 0.6 * q() + 0.08) continue;
      const r = 0.6 + q() * q() * 3.5, gr = g.createRadialGradient(x, y, 0, x, y, r * 1.6); gr.addColorStop(0, 'rgba(255,150,40,1)'); gr.addColorStop(0.6, 'rgba(230,60,8,0.8)'); gr.addColorStop(1, 'rgba(120,20,0,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r * 1.6, 0, TAU); g.fill();
    }
  });
  map.wrapS = map.wrapT = THREE.RepeatWrapping; glow.channel = 1;      // the ash's map tiles by the foot (uv); its coals cover the bed once (uv1)
  return (ashTex = { map, glow });
}

// The two materials of a fire's wood: the house's photographed bark (cloned, so the trees' own is untouched)
// and the drawn wood. Both are darkened by vertex colour where charred and glow through the shared map.
export function firewoodMaterials(bark) {
  const glow = glowTexture(), byHeat = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n#ifdef USE_COLOR_ALPHA\n  totalEmissiveRadiance *= vColor.a;\n#endif'); };
  const b = bark ? bark.clone() : new THREE.MeshStandardMaterial({ color: 0x5a4636 });
  b.vertexColors = true; b.emissive = new THREE.Color(0xffffff); b.emissiveMap = glow; b.emissiveIntensity = 0; b.color = new THREE.Color(0x9a8f84);
  const w = new THREE.MeshStandardMaterial({ map: woodTexture(), vertexColors: true, emissive: 0xffffff, emissiveMap: glow, emissiveIntensity: 0, roughness: 1, metalness: 0 });
  b.onBeforeCompile = w.onBeforeCompile = byHeat;
  return { bark: b, wood: w };
}
export function ashMaterial(tint = 0xffffff) {
  const { map, glow } = ashTextures();
  return new THREE.MeshStandardMaterial({ map, color: tint, vertexColors: true, roughness: 1, emissive: 0xffffff, emissiveMap: glow, emissiveIntensity: 0 });
}

// A low mound of ash, rx by rz, hEdge high at its rim and hTop in the middle, its edge a little ragged and,
// thinning there, darkened toward `rim` (vertex colour) so it gives way to the earth or the firebox floor
export function ashBed(rx, rz, hEdge, hTop, seed = 1, seg = 20, rings = 4, rim = 1) {
  const q = rng(seed, 3), p = [q() * TAU, q() * TAU, q() * TAU], pos = [0, hTop, 0], uv = [0, 0], uv1 = [0.5, 0.5], col = [1, 1, 1], idx = [];
  for (let k = 1; k <= rings; k++) for (let j = 0; j < seg; j++) {
    const a = j / seg * TAU, s = k / rings, rag = 1 + (k === rings ? 0.09 * Math.sin(3 * a + p[0]) + 0.06 * Math.sin(7 * a + p[1]) + 0.05 * Math.sin(13 * a + p[2]) : 0);
    const x = Math.cos(a) * rx * s * rag, z = Math.sin(a) * rz * s * rag, y = hEdge + (hTop - hEdge) * (1 - s * s) + (k < rings ? (q() - 0.5) * 0.02 : 0);
    const c = 1 - (1 - rim) * smooth(0.45, 1, s); pos.push(x, y, z); col.push(c, c, c); uv.push(x, z); uv1.push(0.5 + Math.cos(a) * s * 0.5, 0.5 + Math.sin(a) * s * 0.5);
  }
  for (let j = 0; j < seg; j++) idx.push(0, 1 + (j + 1) % seg, 1 + j);
  for (let k = 1; k < rings; k++) for (let j = 0; j < seg; j++) {
    const a = 1 + (k - 1) * seg + j, b = 1 + (k - 1) * seg + (j + 1) % seg, c = a + seg, d = b + seg; idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('uv1', new THREE.Float32BufferAttribute(uv1, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx); g.computeVertexNormals();
  return g;
}

// ---- one log, in its own frame: along z, centred, its cross-section in x (across) and y (up) --------------------
// o: len, r (a round's radius, or the radius of the tree a wedge was split from), split (the wedge's angle; 0 for a
// round), taper, bend, seed. Returns { bark, wood } BufferGeometries with uv (texture) and uv1 (the glow's, in quarter feet).
function logParts(o) {
  const q = rng(o.seed, 17), len = o.len, R = o.r, split = o.split ?? 0, taper = o.taper ?? 0.1, bend = o.bend ?? 0.06;
  const TS = [0, 0.06, 0.28, 0.5, 0.72, 0.94, 1], NZ = TS.length - 1, NA = split ? 7 : 11, ph = [q() * TAU, q() * TAU, q() * TAU], ov = 0.05 + q() * 0.06;
  const bx = (q() - 0.5) * 2 * bend, by = (q() - 0.5) * 2 * bend * 0.6;
  // the saw cuts, a little off square
  const cut = [[(q() - 0.5) * 0.25, (q() - 0.5) * 0.25], [(q() - 0.5) * 0.25, (q() - 0.5) * 0.25]];
  const lump = Array.from({ length: NZ + 1 }, () => 1 + (q() - 0.5) * 0.09);
  const a0 = Math.PI / 2 - split / 2, rIn = R * 0.14;                                          // a wedge's bark runs a0..a0+split
  const radius = (a, k) => R * lump[k] * (1 - taper * (TS[k] - 0.5)) * (1 + ov * Math.cos(2 * (a - ph[0])) + 0.03 * Math.sin(3 * a + ph[1]) + 0.015 * Math.sin(7 * a + ph[2]));
  const zOf = (k, x, y) => { const t = TS[k], e = k === 0 ? cut[0] : k === NZ ? cut[1] : null; return -len / 2 + t * len + (e ? e[0] * x + e[1] * y : 0); };
  const off = k => { const t = 2 * TS[k] - 1; return [bx * (1 - t * t), by * (1 - t * t)]; };
  // the section's centre, so the log turns about its middle: a wedge's centroid sits out toward its bark
  const cy = split ? (2 * R * Math.sin(split / 2) / (1.5 * split)) * 0.9 : 0;
  const P = (x, y, k) => { const [ox, oy] = off(k); return [x + ox, y + oy - cy, zOf(k, x, y)]; };
  const parts = { bark: { pos: [], uv: [], uv1: [], idx: [] }, wood: { pos: [], uv: [], uv1: [], idx: [] } };
  const vert = (part, p, uv, u1, v1) => { const s = parts[part]; s.pos.push(...p); s.uv.push(...uv); s.uv1.push(u1, v1); return s.pos.length / 3 - 1; };
  const u1o = q() * 4;
  // bark
  const span = split || TAU, start = split ? a0 : q() * TAU, ring = [];
  for (let k = 0; k <= NZ; k++) { const row = []; for (let j = 0; j <= NA; j++) {
    const a = start + j / NA * span, r = radius(a, k), x = Math.cos(a) * r, y = Math.sin(a) * r;
    row.push(vert('bark', P(x, y, k), [j / NA * span * R * 2.2, TS[k] * len * 1.6 + o.seed * 0.37], u1o + j / NA * span * R * 4, TS[k] * len * 4)); }
    ring.push(row); }
  for (let k = 0; k < NZ; k++) for (let j = 0; j < NA; j++) { const a = ring[k][j], b = ring[k][j + 1], c = ring[k + 1][j], d = ring[k + 1][j + 1]; parts.bark.idx.push(a, b, c, b, d, c); }
  // the outline of the section at ring k (counter-clockwise seen from +z), with each point's distance from the pith
  const outline = k => {
    const pts = []; for (let j = 0; j < (split ? NA + 1 : NA); j++) { const a = start + j / NA * span, r = radius(a, k); pts.push([Math.cos(a) * r, Math.sin(a) * r]); }
    if (split) { const a1 = a0 + split; pts.push([Math.cos(a1) * rIn, Math.sin(a1) * rIn], [Math.cos(a0) * rIn, Math.sin(a0) * rIn]); }
    return pts;
  };
  // the cut ends: a fan from the section's middle, end grain centred on the pith
  for (const k of [0, NZ]) {
    const pts = outline(k), mx = pts.reduce((s, p) => s + p[0], 0) / pts.length, my = pts.reduce((s, p) => s + p[1], 0) / pts.length;
    const euv = (x, y) => [0.25 + x / R * 0.235, 0.5 + y / R * 0.47];
    const c = vert('wood', P(mx, my, k), euv(mx, my), u1o + mx * 4, my * 4), ids = pts.map(([x, y]) => vert('wood', P(x, y, k), euv(x, y), u1o + x * 4, y * 4));
    for (let j = 0; j < ids.length; j++) { const a = ids[j], b = ids[(j + 1) % ids.length]; if (k === 0) parts.wood.idx.push(c, b, a); else parts.wood.idx.push(c, a, b); }
  }
  // a wedge's split faces (and the narrow knocked-off heart between them): long grain, a little torn
  if (split) {
    const a1 = a0 + split, faces = [[a1, 'out'], [null, 'heart'], [a0, 'in']];
    for (const [a, kind] of faces) {
      const rows = [];
      for (let k = 0; k <= NZ; k++) {
        let pts;
        if (kind === 'heart') pts = [[Math.cos(a1) * rIn, Math.sin(a1) * rIn], [Math.cos(a0) * rIn, Math.sin(a0) * rIn]];
        else { const ro = radius(a, k), ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca, rm = (ro + rIn) / 2, tear = (q() - 0.5) * 0.025 * R / 0.25;
          pts = [[ca * ro, sa * ro], [ca * rm + nx * tear, sa * rm + ny * tear], [ca * rIn, sa * rIn]];
          if (kind === 'in') pts.reverse(); }
        rows.push(pts.map(([x, y]) => vert('wood', P(x, y, k), [0.52 + 0.46 * Math.min(1, Math.hypot(x, y) / R), 0.03 + 0.94 * TS[k]], u1o + Math.hypot(x, y) * 4, TS[k] * len * 4)));
      }
      for (let k = 0; k < NZ; k++) for (let j = 0; j < rows[k].length - 1; j++) { const a_ = rows[k][j], b = rows[k][j + 1], c = rows[k + 1][j], d = rows[k + 1][j + 1]; parts.wood.idx.push(a_, b, c, b, d, c); }
    }
  }
  const out = {};
  for (const n of ['bark', 'wood']) {
    const s = parts[n], g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(s.pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(s.uv, 2)); g.setAttribute('uv1', new THREE.Float32BufferAttribute(s.uv1, 2));
    g.setIndex(s.idx); g.computeVertexNormals(); out[n] = g;
  }
  return out;
}

// ---- a heap: a column height map (cell `cell` feet) of what logs can rest on ---------------------------------------
// floor: the height where nothing has been laid. lay(o) shapes a log, turns it (yaw about up, then pitch, roll about
// its own length), holds it above everything at (x, z), lowers it until it touches, then lets its free end down
// until that touches too. heat(x, y, z) -> 0..1 says how hot each point of it is.
export class Heap {
  constructor(floor = 0, cell = 0.03) { this.floor = floor; this.cell = cell; this.h = new Map(); this.logs = []; }
  at(x, z) { const c = this.cell, i = Math.floor(x / c), k = Math.floor(z / c); let m = this.floor; for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const v = this.h.get((i + a) * 100003 + (k + b)); if (v !== undefined && v > m) m = v; } return m; }
  // every triangle of g, sampled about every cell, written into the map
  add(g) {
    const p = g.attributes.position, ix = g.index ? g.index.array : null, n = ix ? ix.length : p.count, c = this.cell, A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3();
    for (let t = 0; t < n; t += 3) {
      A.fromBufferAttribute(p, ix ? ix[t] : t); B.fromBufferAttribute(p, ix ? ix[t + 1] : t + 1); C.fromBufferAttribute(p, ix ? ix[t + 2] : t + 2);
      const m = Math.max(2, Math.ceil(Math.max(A.distanceTo(B), B.distanceTo(C), C.distanceTo(A)) / c));
      for (let i = 0; i <= m; i++) for (let j = 0; j <= m - i; j++) {
        const u = i / m, v = j / m, w = 1 - u - v, x = A.x * w + B.x * u + C.x * v, y = A.y * w + B.y * u + C.y * v, z = A.z * w + B.z * u + C.z * v;
        const key = Math.floor(x / c) * 100003 + Math.floor(z / c), o = this.h.get(key); if (o === undefined || y > o) this.h.set(key, y);
      }
    }
  }
  lay(o, heat) {
    const parts = logParts(o), M = new THREE.Matrix4().compose(new THREE.Vector3(o.x, 10, o.z), new THREE.Quaternion().setFromEuler(new THREE.Euler(o.pitch ?? 0, o.yaw ?? 0, o.roll ?? 0, 'YXZ')), new THREE.Vector3(1, 1, 1));
    for (const g of Object.values(parts)) g.applyMatrix4(M);
    // samples of its surface, each with its place t along the log (0..1)
    const ax = new THREE.Vector3(0, 0, 1).transformDirection(M), half = o.len / 2, S = [];
    for (const g of Object.values(parts)) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) S.push([p.getX(i), p.getY(i), p.getZ(i)]); }
    // (the lower half of its bark, sampled finer, so it does not settle through the gap between two bars)
    { const g = parts.bark, p = g.attributes.position, ix = g.index.array;
      for (let t = 0; t < ix.length; t += 3) for (const [u, v] of [[1 / 3, 1 / 3], [0.5, 0], [0, 0.5], [0.5, 0.5], [0.2, 0.2], [0.6, 0.2], [0.2, 0.6]]) {
        const w = 1 - u - v, s = [0, 1, 2].map(c => p.getComponent(ix[t], c) * w + p.getComponent(ix[t + 1], c) * u + p.getComponent(ix[t + 2], c) * v); S.push(s); } }
    for (const s of S) s.push(((s[0] - o.x) * ax.x + (s[1] - 10) * ax.y + (s[2] - o.z) * ax.z + half) / o.len);
    // lowered whole until it touches; then about that touch, its other end down until that touches as well
    let a = Infinity, tk = 0.5; for (const s of S) { const d = s[1] - this.at(s[0], s[2]); if (d < a) { a = d; tk = s[3]; } }
    const far = tk < 0.5 ? 1 : -1; let b = Infinity;
    for (const s of S) { const dt = s[3] - tk; if (dt * far < 0.08) continue; const d = (s[1] - a - this.at(s[0], s[2])) / Math.abs(dt); if (d < b) b = d; }
    if (!isFinite(b)) b = 0; b = Math.min(b, o.maxTip ?? 0.6);
    for (const g of Object.values(parts)) {
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const t = ((p.getX(i) - o.x) * ax.x + (p.getY(i) - 10) * ax.y + (p.getZ(i) - o.z) * ax.z + half) / o.len; p.setY(i, p.getY(i) - a - b * Math.max(0, (t - tk) * far)); }
      g.computeVertexNormals();
    }
    // char and glow
    const sootK = o.soot ?? 0.85;
    for (const g of Object.values(parts)) {
      const p = g.attributes.position, col = new Float32Array(p.count * 4);
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i), h = sat(heat(x, y, z) + (vnoise(x * 5, y * 5, z * 5 + o.seed) - 0.5) * 0.35);
        const ch = smooth(0.06, 0.45, h), v = sootK * (1 - 0.96 * ch);
        col[i * 4] = v * (1 + 0.04 * ch); col[i * 4 + 1] = v; col[i * 4 + 2] = v * (1 - 0.05 * ch); col[i * 4 + 3] = smooth(0.55, 1, h) ** 1.5;
              }
      g.setAttribute('color', new THREE.BufferAttribute(col, 4));
    }
    this.add(parts.bark); this.add(parts.wood); this.logs.push(parts);
    return parts;
  }
  // all the logs laid, as one bark geometry and one wood geometry
  merged() { return { bark: mergeGeometries(this.logs.map(l => l.bark)), wood: mergeGeometries(this.logs.map(l => l.wood)) }; }
}
