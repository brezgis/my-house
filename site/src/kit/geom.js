// Geometry for the furnishing kit. Every helper here builds a THREE.BufferGeometry
// in a piece's own frame: x along the piece, y depth (front toward +y), z up, in
// feet. Texture coordinates are in feet too, measured along the surface, so wood,
// linen and wool keep their true scale however a piece is shaped. kit.js moves
// the result into place with the frame's matrix (see put() there).
//
//   grid      a quad mesh through rows of points (the base of everything below)
//   loft      rings stacked up z: round, oval or superelliptic; lathe is its round case
//   sweep     a tube (or any cross-section) along a path: rails, handles, stems, wire
//   bev       a board with chamfered edges (44 triangles): all case furniture
//   softBox   a cushion: rounded box with crown, bulge, sag, lean and a welt seam
//   pillow    a stuffed pillow: two domed faces meeting at a seam, corners pulled out
//   sheet     cloth with thickness from a surface function; drapeMap lays cloth over a box
//   moulding  a profile swept round a rectangle with mitred corners (frames, panels)
//   extrude   a 2D outline in the x-z plane pushed along y, optionally bevelled

import * as THREE from 'three';

export const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);

// A small deterministic random source, so decoration never disturbs the kit's shared sequence.
export function rng(...keys) {
  let s = 2166136261;
  for (const k of keys) { s ^= Math.floor(k * 1000) | 0; s = Math.imul(s, 16777619); }
  s = (s >>> 0) % 2147483646 + 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

// ---- grid ------------------------------------------------------------------------------
// P[j][i]: rows j run along v, columns i along u. The front face is du x dv.
// closedU averages normals across the u seam. Rows whose points coincide (poles) get one
// smooth normal. Duplicate a row (or column) to make a crisp edge there.
export function grid(P, o = {}) {
  const nv = P.length, nu = P[0].length, N = nu * nv;
  const pos = new Float32Array(N * 3), uv = new Float32Array(N * 2), idx = [];
  for (let j = 0; j < nv; j++) {
    let s = 0;
    for (let i = 0; i < nu; i++) {
      const p = P[j][i], k = j * nu + i;
      if (i) s += dist(p, P[j][i - 1]);
      pos[k * 3] = p[0]; pos[k * 3 + 1] = p[1]; pos[k * 3 + 2] = p[2];
      uv[k * 2] = s * (o.su ?? 1) + (o.u0 ?? 0);
    }
  }
  for (let i = 0; i < nu; i++) {
    let s = 0;
    for (let j = 0; j < nv; j++) { if (j) s += dist(P[j][i], P[j - 1][i]); uv[(j * nu + i) * 2 + 1] = s * (o.sv ?? 1) + (o.v0 ?? 0); }
  }
  if (o.swapUV) for (let k = 0; k < N; k++) { const t = uv[k * 2]; uv[k * 2] = uv[k * 2 + 1]; uv[k * 2 + 1] = t; }
  for (let j = 0; j < nv - 1; j++) for (let i = 0; i < nu - 1; i++) {
    const a = j * nu + i, b = a + 1, c = a + nu, d = c + 1;
    if (o.flip) idx.push(a, d, b, a, c, d); else idx.push(a, b, d, a, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx); g.computeVertexNormals();
  const n = g.attributes.normal.array;
  const avg = ks => { let x = 0, y = 0, z = 0; for (const k of ks) { x += n[k * 3]; y += n[k * 3 + 1]; z += n[k * 3 + 2]; } const l = Math.hypot(x, y, z) || 1; for (const k of ks) { n[k * 3] = x / l; n[k * 3 + 1] = y / l; n[k * 3 + 2] = z / l; } };
  if (o.closedU) for (let j = 0; j < nv; j++) avg([j * nu, j * nu + nu - 1]);
  if (o.closedV) for (let i = 0; i < nu; i++) avg([i, (nv - 1) * nu + i]);
  for (let j = 0; j < nv; j++) {
    const r = P[j]; if (r.every(p => dist(p, r[0]) < 1e-6)) avg(r.map((_, i) => j * nu + i));
  }
  if (o.flat) { const h = g.toNonIndexed(); h.computeVertexNormals(); return h; }
  return g;
}

// ---- loft and lathe -------------------------------------------------------------------
// rows: [{ a, b, z, x?, y? }]: a ring of half-widths a (along x) and b (along y) at height z,
// centred at (x, y). Rings go bottom to top for an outward skin. Options: seg, e (superellipse
// exponent: 2 round, 3-4 a soft rectangle), th0/th1 (partial sweep), mod(t, j) a radial
// factor (pleats, flutes, petals), lift(t, j) a height offset (a slipper bath's raised end),
// warp(p, t, j) moves any point (folds in cloth).
export function loft(rows, o = {}) {
  const seg = o.seg ?? 24, e = o.e ?? 2, th0 = o.th0 ?? 0, th1 = o.th1 ?? TAU, full = th1 - th0 > TAU - 1e-6;
  const dirs = [];
  for (let i = 0; i <= seg; i++) {
    const t = th0 + (th1 - th0) * i / seg, c = Math.cos(t), s = Math.sin(t);
    dirs.push([t, e === 2 ? c : Math.sign(c) * Math.abs(c) ** (2 / e), e === 2 ? s : Math.sign(s) * Math.abs(s) ** (2 / e)]);
  }
  const P = rows.map((r, j) => dirs.map(([t, cx, cy]) => {
    const m = o.mod ? o.mod(t, j, r) : 1;
    const q = [(r.x ?? 0) + cx * r.a * m, (r.y ?? 0) + cy * r.b * m, r.z + (o.lift ? o.lift(t, j, r) : 0)];
    return o.warp ? o.warp(q, t, j, r) ?? q : q;
  }));
  return grid(P, { closedU: full, flip: o.flip, su: o.su, sv: o.sv, flat: o.flat });
}
// profile: [[r, z], ...] bottom to top (for a hollow vessel: outside up, over the lip, inside down).
export const lathe = (profile, o = {}) => loft(profile.map(([r, z]) => ({ a: r * (o.sx ?? 1), b: r * (o.sy ?? 1), z, x: o.x, y: o.y })), o);

// ---- sweep ----------------------------------------------------------------------------
// A tube along path [[x,y,z], ...]. r is a radius or r(t, j) with t in 0..1 along the path.
// shape: a closed 2D cross-section [[n, b], ...] (counter-clockwise) instead of a circle;
// sh(t) scales it. caps: close the ends. up: a hint for the first normal.
export function sweep(path, r = 0.03, o = {}) {
  const seg = o.seg ?? 8, n = path.length, V3 = (a) => new THREE.Vector3(...a);
  const pts = path.map(V3), T = [], N = [], Bn = [];
  const len = [0]; for (let j = 1; j < n; j++) len.push(len[j - 1] + pts[j].distanceTo(pts[j - 1]));
  for (let j = 0; j < n; j++) T.push(pts[Math.min(n - 1, j + 1)].clone().sub(pts[Math.max(0, j - 1)]).normalize());
  let up = o.up ? V3(o.up) : (Math.abs(T[0].z) < 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0));
  let nn = up.clone().sub(T[0].clone().multiplyScalar(up.dot(T[0]))).normalize();
  for (let j = 0; j < n; j++) {
    if (j) nn = nn.clone().sub(T[j].clone().multiplyScalar(nn.dot(T[j]))).normalize();
    N.push(nn); Bn.push(T[j].clone().cross(nn).normalize());
  }
  const shape = o.shape ?? Array.from({ length: seg }, (_, i) => [Math.cos(i / seg * TAU), Math.sin(i / seg * TAU)]);
  const ring = [...shape, shape[0]];
  const P = pts.map((c, j) => {
    const t = len[n - 1] ? len[j] / len[n - 1] : 0, rr = typeof r === 'function' ? r(t, j) : r;
    return ring.map(([a, b]) => [c.x + rr * (a * N[j].x + b * Bn[j].x), c.y + rr * (a * N[j].y + b * Bn[j].y), c.z + rr * (a * N[j].z + b * Bn[j].z)]);
  });
  const g = grid(P, { closedU: true });
  if (!o.caps) return g;
  const parts = [g];
  for (const [j, sgn] of [[0, -1], [n - 1, 1]]) {
    const row = P[j], c = pts[j], tri = [];
    for (let i = 0; i < row.length - 1; i++) sgn > 0 ? tri.push([c.x, c.y, c.z], row[i], row[i + 1]) : tri.push([c.x, c.y, c.z], row[i + 1], row[i]);
    parts.push(tris(tri));
  }
  return merge(parts);
}

// Flat-shaded triangles from a list of points (three per triangle), planar-projected UVs.
export function tris(list) {
  const pos = new Float32Array(list.length * 3), uv = new Float32Array(list.length * 2), nrm = new Float32Array(list.length * 3);
  for (let k = 0; k < list.length; k += 3) {
    const [a, b, c] = [list[k], list[k + 1], list[k + 2]];
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
    for (let m = 0; m < 3; m++) {
      const p = list[k + m], q = (k + m);
      pos[q * 3] = p[0]; pos[q * 3 + 1] = p[1]; pos[q * 3 + 2] = p[2];
      nrm[q * 3] = nx; nrm[q * 3 + 1] = ny; nrm[q * 3 + 2] = nz;
      const [u, v] = az >= ax && az >= ay ? [p[0], p[1]] : ax >= ay ? [p[1], p[2]] : [p[0], p[2]];
      uv[q * 2] = u; uv[q * 2 + 1] = v;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

// Join geometries (indexed or not) into one non-indexed geometry.
export function merge(list) {
  const gs = list.filter(Boolean).map(g => (g.index ? g.toNonIndexed() : g));
  let n = 0; for (const g of gs) n += g.attributes.position.count;
  const pos = new Float32Array(n * 3), nrm = new Float32Array(n * 3), uv = new Float32Array(n * 2);
  let k = 0;
  for (const g of gs) {
    if (!g.attributes.normal) g.computeVertexNormals();
    pos.set(g.attributes.position.array, k * 3); nrm.set(g.attributes.normal.array, k * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, k * 2);
    k += g.attributes.position.count;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}

// Move a geometry: scale s (number or [x,y,z]), then rotate about x by rx, then about y by ry,
// then about z by rz (radians, fixed axes through the origin), then translate to at.
const M = new THREE.Matrix4(), E = new THREE.Euler();
export function xf(g, o = {}) {
  const s = o.s ?? 1, S = Array.isArray(s) ? s : [s, s, s];
  if (S.some(v => v !== 1)) g.scale(...S);
  if (o.rx || o.ry || o.rz) { E.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0, 'ZYX'); g.applyMatrix4(M.makeRotationFromEuler(E)); }
  if (o.at) g.translate(...o.at);
  return g;
}

// ---- bevelled board --------------------------------------------------------------------
// A box with every edge chamfered by e. grain: 'x' | 'y' | 'z' | 'long' (default: the longest
// side), the axis the wood's grain (texture v) runs along. taper: the bottom is this fraction
// narrower (a tapered leg). 44 triangles.
export function bev(x0, x1, y0, y1, z0, z1, e = 0.02, o = {}) {
  if (x0 > x1) [x0, x1] = [x1, x0]; if (y0 > y1) [y0, y1] = [y1, y0]; if (z0 > z1) [z0, z1] = [z1, z0];
  const h = [(x1 - x0) / 2, (y1 - y0) / 2, (z1 - z0) / 2], c = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
  e = Math.max(0.0005, Math.min(e, h[0] * 0.45, h[1] * 0.45, h[2] * 0.45));
  const gax = o.grain === 'x' ? 0 : o.grain === 'y' ? 1 : o.grain === 'z' ? 2 : h.indexOf(Math.max(...h));
  const off = o.uvOff ?? [((c[0] * 7.13 + c[1] * 3.7) % 1.7), ((c[2] * 5.3 + c[0] * 1.9) % 2.1)];
  const vtx = (a, s) => { const p = [s[0] * (h[0] - e), s[1] * (h[1] - e), s[2] * (h[2] - e)]; p[a] = s[a] * h[a]; return p; };
  const polys = [], S = [-1, 1];
  for (let a = 0; a < 3; a++) for (const sa of S) {
    const b = (a + 1) % 3, cc = (a + 2) % 3, q = [];
    for (const [sb, sc] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const s = [0, 0, 0]; s[a] = sa; s[b] = sb; s[cc] = sc; q.push(vtx(a, s)); }
    polys.push(q);
  }
  for (let k = 0; k < 3; k++) { const i = (k + 1) % 3, j = (k + 2) % 3; for (const si of S) for (const sj of S) {
    const s = sk => { const r = [0, 0, 0]; r[i] = si; r[j] = sj; r[k] = sk; return r; };
    polys.push([vtx(i, s(-1)), vtx(i, s(1)), vtx(j, s(1)), vtx(j, s(-1))]);
  } }
  for (const sx of S) for (const sy of S) for (const sz of S) polys.push([vtx(0, [sx, sy, sz]), vtx(1, [sx, sy, sz]), vtx(2, [sx, sy, sz])]);
  const pos = [], nrm = [], uv = [];
  for (let p of polys) {
    const ce = p.reduce((m, v) => [m[0] + v[0] / p.length, m[1] + v[1] / p.length, m[2] + v[2] / p.length], [0, 0, 0]);
    const u = [p[1][0] - p[0][0], p[1][1] - p[0][1], p[1][2] - p[0][2]], v = [p[2][0] - p[0][0], p[2][1] - p[0][1], p[2][2] - p[0][2]];
    let n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    if (n[0] * ce[0] + n[1] * ce[1] + n[2] * ce[2] < 0) { p = [...p].reverse(); n = n.map(x => -x); }
    const l = Math.hypot(...n); n = n.map(x => x / l);
    const dom = n.map(Math.abs).indexOf(Math.max(...n.map(Math.abs)));
    const ax = [0, 1, 2].filter(x => x !== dom);                     // the two in-plane axes
    const vAx = ax.includes(gax) ? gax : ax[1], uAx = ax[0] === vAx ? ax[1] : ax[0];
    const tri = p.length === 3 ? [[0, 1, 2]] : [[0, 1, 2], [0, 2, 3]];
    for (const t of tri) for (const k of t) {
      const q = p[k], tk = o.taper ? 1 - o.taper * (h[2] - q[2]) / (2 * h[2]) : 1;
      pos.push(q[0] * tk + c[0], q[1] * tk + c[1], q[2] + c[2]); nrm.push(...n);
      uv.push(q[uAx] + c[uAx] + off[0], q[vAx] + c[vAx] + off[1]);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  return g;
}

// ---- soft box (cushions, mattresses, upholstered bodies) -------------------------------------
// Options: k segments round each edge (2), n: [nx, ny, nz] interior divisions, crown (the top
// domes up), bulge (the sides belly out), sag: [[u, v, depth, radius], ...] dents in the top
// (u, v in -1..1), welt (seam bead along the top and bottom edges), lean (y shift per foot of
// height), taper (top narrower by this fraction), noBottom, deform(p, U, V, W) for anything else.
export function softBox(x0, x1, y0, y1, z0, z1, r = 0.1, o = {}) {
  const hx = (x1 - x0) / 2, hy = (y1 - y0) / 2, hz = (z1 - z0) / 2, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2;
  r = Math.max(0.002, Math.min(r, hx - 1e-4, hy - 1e-4, hz - 1e-4));
  const k = o.k ?? 2, nn = o.n ?? [2, 2, 1], H = [hx, hy, hz];
  const ticks = (a) => {
    const h = H[a], inner = h - r, t = [];
    for (let m = 0; m < k; m++) t.push(-(inner + r * Math.tan(Math.PI / 4 * (1 - m / k))));
    const ni = inner > 1e-4 ? Math.max(1, nn[a]) : 0;
    for (let m = 0; m <= ni; m++) t.push(-inner + (2 * inner) * m / Math.max(1, ni));
    if (!ni) t.push(0);
    for (let m = k - 1; m >= 0; m--) t.push(inner + r * Math.tan(Math.PI / 4 * (1 - m / k)));
    return t.filter((v, i, arr) => i === 0 || Math.abs(v - arr[i - 1]) > 1e-6);
  };
  const T = [ticks(0), ticks(1), ticks(2)], parts = [];
  for (let a = 0; a < 3; a++) for (const sa of [-1, 1]) {
    if (o.noBottom && a === 2 && sa < 0) continue;
    const b = (a + 1) % 3, c = (a + 2) % 3;
    const P = T[c].map(tc => T[b].map(tb => {
      const p = [0, 0, 0]; p[a] = sa * H[a]; p[b] = tb; p[c] = tc;
      const inn = p.map((v, q) => clamp(v, -(H[q] - r), H[q] - r)), off = p.map((v, q) => v - inn[q]);
      const l = Math.hypot(...off) || 1, d = off.map(v => v / l);
      let q = inn.map((v, i) => v + d[i] * r);
      const U = q[0] / hx, V = q[1] / hy, W = q[2] / hz, up = (W + 1) / 2;
      if (o.crown) q[2] += o.crown * (1 - U * U) * (1 - V * V) * up;
      if (o.bulge) { const f = o.bulge * (1 - W * W); q[0] += Math.sign(U) * f * (1 - V * V) * Math.min(1, Math.abs(U) * 3); q[1] += Math.sign(V) * f * (1 - U * U) * Math.min(1, Math.abs(V) * 3); }
      if (o.sag) for (const [u0, v0, dep, rad] of o.sag) q[2] -= dep * Math.exp(-((U - u0) ** 2 + (V - v0) ** 2) / (rad * rad)) * up;
      if (o.taper) { q[0] *= 1 - o.taper * up; q[1] *= 1 - o.taper * up * 0.5; }
      if (o.welt && Math.abs(d[2]) > 0.6 && Math.abs(d[2]) < 0.8) q = q.map((v, i) => v + d[i] * o.welt);
      if (o.lean) q[1] += o.lean * (q[2] + hz);
      if (o.deform) q = o.deform(q, U, V, W) ?? q;
      return [q[0] + cx, q[1] + cy, q[2] + cz];
    }));
    // rows run along axis c, columns along axis b: du x dv points along +a; flip for the -a face
    parts.push(grid(P, { flip: sa < 0 }));
  }
  return weld(merge(parts));
}

// Average normals of vertices that share a position (smooth across separately built faces).
export function weld(g) {
  const p = g.attributes.position.array, n = g.attributes.normal.array, map = new Map();
  for (let i = 0; i < p.length / 3; i++) {
    const key = `${Math.round(p[i * 3] * 2e3)},${Math.round(p[i * 3 + 1] * 2e3)},${Math.round(p[i * 3 + 2] * 2e3)}`;
    let m = map.get(key); if (!m) map.set(key, (m = [0, 0, 0, []]));
    m[0] += n[i * 3]; m[1] += n[i * 3 + 1]; m[2] += n[i * 3 + 2]; m[3].push(i);
  }
  for (const [x, y, z, list] of map.values()) { const l = Math.hypot(x, y, z) || 1; for (const i of list) { n[i * 3] = x / l; n[i * 3 + 1] = y / l; n[i * 3 + 2] = z / l; } }
  return g;
}

// ---- pillow ------------------------------------------------------------------------------
// A stuffed pillow lying in the x-y plane, w by d, t thick at the middle, centred on the origin.
// pinch draws the sides in; corners stay pointed. Stand it up with xf(g, { rx }).
export function pillow(w, d, t, o = {}) {
  const n = o.n ?? 8, pinch = o.pinch ?? 0.07, lump = o.lump ?? 0, rr = o.rng ?? Math.random;
  const ph = [rr() * 6, rr() * 6];
  const tk = Array.from({ length: n + 1 }, (_, i) => Math.sin((i / n - 0.5) * Math.PI));   // denser at the edges
  const face = s => tk.map(V => tk.map(U => {
    const g = Math.pow(Math.max(0, 1 - Math.abs(U) ** 2.6), 0.55) * Math.pow(Math.max(0, 1 - Math.abs(V) ** 2.6), 0.55);
    const x = U * w / 2 * (1 - pinch * (1 - V * V)), y = V * d / 2 * (1 - pinch * (1 - U * U));
    let z = s * (t / 2 * g + 0.006) + (o.dent ? -o.dent * Math.exp(-(U * U + V * V) / 0.25) * (s > 0 ? 1 : 0.4) : 0);
    if (lump) z += s * lump * g * Math.sin(U * 3 + ph[0]) * Math.sin(V * 2.5 + ph[1]);
    return [x, y, z];
  }));
  return merge([grid(face(1)), grid(face(-1), { flip: true })]);
}

// ---- cloth -------------------------------------------------------------------------------
// fn(u, v) -> [x, y, z] for u, v in 0..1; the front is d/du x d/dv (flip to turn it). thick: the
// cloth gets a back face and a hem all round. us/vs: grid spacing.
export function sheet(fn, nu, nv, o = {}) {
  const P = [];
  for (let j = 0; j <= nv; j++) { const v = o.vs ? o.vs(j / nv) : j / nv, row = []; for (let i = 0; i <= nu; i++) row.push(fn(o.us ? o.us(i / nu) : i / nu, v)); P.push(row); }
  const front = grid(P, { flip: o.flip });
  if (!o.thick) return front;
  const n = front.attributes.normal.array, Q = P.map((row, j) => row.map((p, i) => { const k = (j * (nu + 1) + i) * 3; return [p[0] - n[k] * o.thick, p[1] - n[k + 1] * o.thick, p[2] - n[k + 2] * o.thick]; }));
  const back = grid(Q, { flip: !o.flip });
  const edge = [], loop = [];
  for (let i = 0; i <= nu; i++) loop.push([0, i]); for (let j = 1; j <= nv; j++) loop.push([j, nu]);
  for (let i = nu - 1; i >= 0; i--) loop.push([nv, i]); for (let j = nv - 1; j >= 1; j--) loop.push([j, 0]);
  loop.push(loop[0]);
  for (let m = 0; m < loop.length - 1; m++) {
    const [j0, i0] = loop[m], [j1, i1] = loop[m + 1], a = P[j0][i0], b = P[j1][i1], c = Q[j1][i1], d = Q[j0][i0];
    edge.push(a, b, c, a, c, d, a, c, b, a, d, c);                    // both windings: a hem seen from either side
  }
  return merge([front, back, tris(edge)]);
}

// Cloth laid over the top of a box (half-size a by b, top at height top, edge radius rho) and
// hanging down its sides: plane point (s, t) -> 3D. folds: amplitude of the hanging folds; freq:
// folds per foot; ph: phase.
export function drapeMap(a, b, top, rho = 0.08, folds = 0.05, freq = 1.6, ph = 0) {
  return (s, t) => {
    const dx = Math.max(Math.abs(s) - a, 0), dy = Math.max(Math.abs(t) - b, 0), d = Math.hypot(dx, dy);
    if (d < 1e-6) return [s, t, top];
    const ux = Math.sign(s) * dx / d, uy = Math.sign(t) * dy / d, ex = clamp(s, -a, a), ey = clamp(t, -b, b);
    let out, down;
    if (d < rho * Math.PI / 2) { const f = d / rho; out = rho * Math.sin(f); down = rho * (1 - Math.cos(f)); }
    else { out = rho; down = rho + d - rho * Math.PI / 2; }
    const wx = dx / (dx + dy), wy = dy / (dx + dy), per = wx * t + wy * s;
    const grow = Math.min(1, down / 0.5), fold = folds * grow * (0.55 + 0.45 * Math.sin(per * freq * TAU + ph) + 0.25 * Math.sin(per * freq * 2.7 * TAU + ph * 1.7));
    out += Math.max(0, fold) + 0.004;
    return [ex + ux * out, ey + uy * out, top - down];
  };
}

// ---- moulding round a rectangle --------------------------------------------------------------
// profile: [[o, d], ...] with o the outward offset from a w by h opening (in the x-z plane,
// centred at the origin) and d the depth toward +y. List it from the inner edge outward for
// a face that looks toward +y. Corners are mitred.
export function moulding(w, h, profile, o = {}) {
  const hw = w / 2, hh = h / 2;
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  const parts = [];
  for (let side = 0; side < 4; side++) {
    const c0 = corners[side], c1 = corners[(side + 1) % 4];
    const P = profile.map(([of, d]) => [c0, c1].map(([sx, sz]) => [sx * (hw + of), d, sz * (hh + of)]));
    parts.push(grid(P, { flip: o.flip, swapUV: side % 2 === 1 }));
  }
  return merge(parts);
}

// ---- extrusion -----------------------------------------------------------------------------
// outline: [[x, z], ...] counter-clockwise in the x-z plane (seen from the front); pushed from
// y0 to y1. bevel: soft edge size. Curves: pass more points.
export function extrude(outline, y0, y1, o = {}) {
  const shape = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, z)));
  const bv = o.bevel ?? 0;
  const g = new THREE.ExtrudeGeometry(shape, { depth: Math.max(0.001, y1 - y0 - 2 * bv), bevelEnabled: bv > 0, bevelThickness: bv, bevelSize: bv, bevelSegments: o.bevelSeg ?? 2, curveSegments: 4, steps: 1 });
  g.rotateX(Math.PI / 2);              // shape y -> z, extrusion z -> -y
  g.translate(0, y1 - bv, 0);
  return g.index ? g.toNonIndexed() : g;
}

// A disc or annulus lying flat (face up, or down with down: true).
export function disc(r0, r1, z, seg = 16, o = {}) {
  const P = [[], []];
  for (let i = 0; i <= seg; i++) { const t = i / seg * TAU, c = Math.cos(t), s = Math.sin(t); P[0].push([c * r0 * (o.sx ?? 1), s * r0 * (o.sy ?? 1), z]); P[1].push([c * r1 * (o.sx ?? 1), s * r1 * (o.sy ?? 1), z]); }
  // rows go outward (v), columns round (u): du x dv = round x outward = -z; flip for a face up
  return grid(P, { flip: !o.down, closedU: true });
}
