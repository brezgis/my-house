// The shell of a robot's body, and everything that is laid on it. A robot is one smooth shell, and everything
// worn on it is made from the same surface: a scarf or a hat band is a strip of the shell itself lifted a little
// proud of it, an apron, a shirt front, a face screen and a name badge are patches of it, a hat crown is the top
// of the head grown outwards, and a hat, an ear or an earcup is seated on the surface where the surface really
// is. So nothing floats off the body and nothing pokes through it, whatever its shape. (They used to be tori and
// boxes set at fixed radii, which missed on every body but a round one.)
//
// Two kinds of shell, with the same tools on each:
//   makeShell(A, B, C, n = 2)   a superellipsoid |x/A|^n + |y/B|^n + |z/C|^n = 1 about the origin: at n = 2 an
//                               egg, a ball, a bean (the plain ellipsoid); above 2 a cushion, a rounded square with
//                               soft corners all round, like a tea caddy or a rice cooker (never a box)
//   makeLathe(pts, { sx, sz, sides })  turned from a profile [[r, y], ...] from the bottom up (a flowerpot, a
//                               bell, a teapot), stretched sx across and sz front to back; its surface is the
//                               outermost of the profile at each height. sides: 32 round, 6 or 8 faceted, 4 a
//                               rounded square (latheGeometry, which the lab's robots are turned with)
//   latheGeometry(pts, sides, sx, sz, turn), cornerR(a, b)   the turned solid alone
//
// Every shell S has (y up, azimuth az: 0 the front, +z; PI/2 the +x side; phi the angle down from the top):
//   S.at(y, az, off)         a point on the surface, lifted off along its normal     S.normal(p)   the outward normal
//   S.rho(y, az), S.side(y), S.front(y)   how far out the surface is              S.top, S.bottom   its heights
//   S.polar(phi, az, off), S.phiAt(y, az)                                         S.inside(p)   < 0 inside, > 0 out
//   S.body(w, h)             the shell itself (smooth normals)
//   S.band(ya, yb, off)      a strip round it (a belt, a hat band, a sash); off a number or off(v, u)
//   S.cap(ys, off)           the top from ys up (a beanie, a hat's crown)
//   S.patch(az0, az1, y0, y1, off)   a piece of the front (an apron, a pouch, a bib)
//   S.plate(yc, azc, aw, hh, off, { m, seg, rings, inner, grow })   a rounded-square plate (a badge, a pocket;
//                            with grow > 1, a ring round it: a bezel)
//   S.brim(y, w, {...})      a brim standing out from it        S.overTop(y, off, r)   a band over the top (headphones)
//   S.screen(yc, hh, aw, { seg, rings })   the face: { face, bezel, aw } (the face's UVs span it; paint the bezel)
//   S.place(geo, y, az, off, spin)   a thing built pointing up +y, stood on the surface there, along its normal
//                            (an ear, an earcup, a button, a stalk)
//   S.seat(r, { phi, az, sink })   a Matrix4 that sits a hat whose opening is r across (built with its opening at
//                            y = 0, up +y) down on the head, cocked phi towards az, sunk a little into it
//   S.scarf(y, {...}), S.badge(y, az, w, h), S.apron(yTop, {...})   worn things, as lists of geometries
// (sheets are built without minding their winding; each is turned to face out)

import { mergeVertices, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { THREE } from './parts.js';

const TAU = Math.PI * 2;
const pw = (x, n) => Math.pow(Math.abs(x), n);
// Turn a made surface's triangles to face the way ref(p) says is out (they are built without minding which
// way round they wind), so that it is not culled from the side that shows.
function orient(g, ref) {
  const P = g.attributes.position, N = g.attributes.normal; let s = 0;
  for (let i = 0; i < P.count; i++) { const r = ref([P.getX(i), P.getY(i), P.getZ(i)]); s += N.getX(i) * r[0] + N.getY(i) * r[1] + N.getZ(i) * r[2]; }
  if (s < 0) { const I = g.index.array; for (let i = 0; i < I.length; i += 3) { const t = I[i + 1]; I[i + 1] = I[i + 2]; I[i + 2] = t; } g.index.needsUpdate = true; g.computeVertexNormals(); }
  return g;
}

export function makeShell(A, B, C, n = 2) {
  const S = { A, B, C, n, kind: 'shell' };
  // where the ray from the middle in direction d meets the surface
  S.ray = (dx, dy, dz) => { const t = Math.pow(pw(dx / A, n) + pw(dy / B, n) + pw(dz / C, n), -1 / n); return [dx * t, dy * t, dz * t]; };
  // the outward normal at a point on the surface
  S.normal = p => { const g = [Math.sign(p[0]) * pw(p[0] / A, n - 1) / A, Math.sign(p[1]) * pw(p[1] / B, n - 1) / B, Math.sign(p[2]) * pw(p[2] / C, n - 1) / C], l = Math.hypot(...g) || 1; return [g[0] / l, g[1] / l, g[2] / l]; };
  const lift = (p, off) => { if (!off) return p; const q = S.normal(p); return [p[0] + q[0] * off, p[1] + q[1] * off, p[2] + q[2] * off]; };
  // how far out the surface is at height y, in the horizontal direction az (0 = the front, +z; PI/2 = +x)
  S.rho = (y, az) => { const f = Math.pow(Math.max(0, 1 - pw(y / B, n)), 1 / n); return f / Math.pow(pw(Math.sin(az) / A, n) + pw(Math.cos(az) / C, n), 1 / n); };
  S.at = (y, az, off = 0) => { const r = S.rho(y, az); return lift([r * Math.sin(az), Math.max(-B, Math.min(B, y)), r * Math.cos(az)], off); };
  S.side = y => S.rho(y, Math.PI / 2); S.front = y => S.rho(y, 0);
  // from the top: the point at polar angle phi (0 = straight up), azimuth az
  S.polar = (phi, az, off = 0) => lift(S.ray(Math.sin(phi) * Math.sin(az), Math.cos(phi), Math.sin(phi) * Math.cos(az)), off);
  // the polar angle at which the surface is at height y (along azimuth az)
  S.phiAt = (y, az) => { let lo = 0, hi = Math.PI; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (S.polar(m, az)[1] > y) lo = m; else hi = m; } return (lo + hi) / 2; };

  // how far inside (< 0) or outside (> 0) the surface a point is (not a distance: only its sign and its zero matter)
  S.inside = p => pw(p[0] / A, n) + pw(p[1] / B, n) + pw(p[2] / C, n) - 1;
  // the body itself: a sphere pushed out onto the surface, its normals averaged across the seam so it shades smoothly
  S.body = (w = 40, h = 28) => {
    let g = new THREE.SphereGeometry(1, w, h); const P = g.attributes.position;
    for (let i = 0; i < P.count; i++) { const p = S.ray(P.getX(i), P.getY(i), P.getZ(i)); P.setXYZ(i, ...p); }
    g.deleteAttribute('uv'); g.deleteAttribute('normal'); g = mergeVertices(g); g.computeVertexNormals();
    return g;
  };
  S.top = B; S.bottom = -B;
  return dress(S);
}

// The turned solid itself, from the lab (school faculty/body.js), where most robots are made this way:
// A solid of revolution from a profile [[r, y], ...] (bottom to top), round or with a few flat sides (then r is
// the half-width across the flats, a flat faces the front, and it is shaded flat); stretched sx across, sz deep.
export function latheGeometry(pts, sides = 24, sx = 1, sz = 1, turn = 0) {
  if (sides === 4 && !turn) return squircle(pts, sx, sz);
  const poly = sides <= 8, k = poly ? 1 / Math.cos(Math.PI / sides) : 1;
  let g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(Math.max(r * k, 1e-4), y)), sides);
  g.rotateY(poly ? Math.PI / sides + turn : turn); g.scale(sx, 1, sz);
  if (poly) { g = g.toNonIndexed(); g.computeVertexNormals(); }
  return g;
}
// The corner radius of a four-sided body's section at half-widths a and b: a rounded square, never a hard box
export const cornerR = (a, b) => Math.min(0.2, 0.3 * Math.min(a, b));
// A four-sided solid of revolution, as latheGeometry() has it (r: half the width across the flats; a flat to the front), but
// with a rounded-square section, so that its upright edges are rounded, and smooth normals. Where the profile turns
// sharply (a flat top meeting the side, more than about 40 degrees) the shading is split; a small chamfer in the
// profile is shaded smooth into the side, which reads as a real bevel.
function squircle(pts, sx = 1, sz = 1) {
  const K = 5, segN = i => { const [r0, y0] = pts[i], [r1, y1] = pts[i + 1], nr = y1 - y0, ny = -(r1 - r0), l = Math.hypot(nr, ny) || 1; return [nr / l, ny / l]; };
  const rows = [];      // [r, y, nr, ny]
  for (let i = 0; i < pts.length; i++) {
    const a = i > 0 ? segN(i - 1) : null, b = i < pts.length - 1 ? segN(i) : null, [r, y] = pts[i];
    if (a && b && a[0] * b[0] + a[1] * b[1] > 0.77) { const l = Math.hypot(a[0] + b[0], a[1] + b[1]) || 1; rows.push([r, y, (a[0] + b[0]) / l, (a[1] + b[1]) / l]); }
    else { if (a) rows.push([r, y, ...a]); if (b) rows.push([r, y, ...b]); }
  }
  const ring = [];      // the section's corners, counter-clockwise from +x+z: [cos, sin, signx, signz]
  for (const [qx, qz, th0] of [[1, 1, 0], [-1, 1, Math.PI / 2], [-1, -1, Math.PI], [1, -1, Math.PI * 1.5]]) for (let k = 0; k <= K; k++) { const th = th0 + (k / K) * Math.PI / 2; ring.push([Math.cos(th), Math.sin(th), qx, qz]); }
  const n = ring.length, pos = [], nor = [], idx = [];
  for (const [r, y, nr, ny] of rows) {
    const a = Math.max(r, 1e-4) * sx, b = Math.max(r, 1e-4) * sz, c = cornerR(a, b);
    for (const [cs, sn, qx, qz] of ring) {
      pos.push(qx * (a - c) + c * cs, y, qz * (b - c) + c * sn);
      const vx = cs * nr, vz = sn * nr, l = Math.hypot(vx, ny, vz) || 1; nor.push(vx / l, ny / l, vz / l);
    }
  }
  for (let j = 0; j < rows.length - 1; j++) { if (rows[j][1] === rows[j + 1][1] && rows[j][0] === rows[j + 1][0]) continue; for (let i = 0; i < n; i++) { const p = j * n + i, q = j * n + (i + 1) % n, P = p + n, Q = q + n; idx.push(p, P, q, q, P, Q); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setIndex(idx);
  // (the winding is checked once against the outward normal, and turned if it faces in)
  const A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), Nn = new THREE.Vector3();
  for (let t = 0; t < idx.length; t += 3) { A.fromArray(pos, idx[t] * 3); B.fromArray(pos, idx[t + 1] * 3); C.fromArray(pos, idx[t + 2] * 3); const f = B.sub(A).cross(C.sub(A)); if (f.lengthSq() < 1e-10) continue; Nn.fromArray(nor, idx[t] * 3); if (f.dot(Nn) < 0) { for (let u = 0; u < idx.length; u += 3) { const w = idx[u + 1]; idx[u + 1] = idx[u + 2]; idx[u + 2] = w; } g.setIndex(idx); } break; }
  return g;
}

export function makeLathe(pts, { sx = 1, sz = 1, sides = 32 } = {}) {
  const P = pts.map(([r, y]) => [r, y]), ys = P.map(p => p[1]), y0 = Math.min(...ys), y1 = Math.max(...ys);
  // the outermost radius of the profile at height y
  const rad = y => { let r = 0; for (let i = 1; i < P.length; i++) { const [r0, a] = P[i - 1], [r1, b] = P[i], lo = Math.min(a, b), hi = Math.max(a, b); if (y >= lo - 1e-6 && y <= hi + 1e-6) r = Math.max(r, hi - lo < 1e-6 ? Math.max(r0, r1) : r0 + (r1 - r0) * (y - a) / (b - a)); } return r; };
  const S = { kind: 'lathe', pts: P, sx, sz, rad, top: y1, bottom: y0, A: Math.max(...P.map(p => p[0])) * sx, B: (y1 - y0) / 2, C: Math.max(...P.map(p => p[0])) * sz };
  S.inside = p => Math.hypot(p[0] / sx, p[2] / sz) - rad(Math.max(y0, Math.min(y1, p[1]))) + (p[1] < y0 ? y0 - p[1] : p[1] > y1 ? p[1] - y1 : 0);
  S.normal = p => {
    const y = Math.max(y0 + 1e-3, Math.min(y1 - 1e-3, p[1])), e = 0.01, dr = (rad(Math.min(y1, y + e)) - rad(Math.max(y0, y - e))) / (2 * e);
    const az = Math.atan2(p[0] / sx, p[2] / sz), g = [Math.sin(az) / sx, -dr, Math.cos(az) / sz], l = Math.hypot(...g) || 1; return [g[0] / l, g[1] / l, g[2] / l];
  };
  S.rho = (y, az) => rad(Math.max(y0, Math.min(y1, y))) * Math.hypot(Math.sin(az) * sx, Math.cos(az) * sz);
  S.at = (y, az, off = 0) => { const yy = Math.max(y0, Math.min(y1, y)), r = rad(yy), p = [r * Math.sin(az) * sx, yy, r * Math.cos(az) * sz]; if (!off) return p; const q = S.normal(p); return [p[0] + q[0] * off, p[1] + q[1] * off, p[2] + q[2] * off]; };
  S.side = y => rad(y) * sx; S.front = y => rad(y) * sz;
  // from the top down, by height (a lathe's top is flat or open, so phi is measured along its height)
  S.polar = (phi, az, off = 0) => S.at(y1 - (y1 - y0) * Math.max(0, Math.min(1, phi / Math.PI)), az, off);
  S.phiAt = y => Math.PI * (y1 - y) / (y1 - y0);
  S.ray = (dx, dy, dz) => S.at(dy, Math.atan2(dx, dz));
  S.body = (segs = sides) => latheGeometry(P, segs, sx, sz);      // (the tools above follow its round section; on four sides, S.front and S.side are its flats)
  return dress(S);
}

// The tools every shell has, made only from S.at, S.polar, S.phiAt, S.normal and S.inside
function dress(S) {
  // a grid of points (cols round, rows down) made into a smooth surface; wrap: the columns close round
  const sheet = (cols, rows, fn, wrap, uvfn) => {
    const pos = [], uv = [], idx = [], W = wrap ? cols : cols + 1;
    for (let j = 0; j <= rows; j++) for (let i = 0; i < W; i++) { pos.push(...fn(i / cols, j / rows)); uv.push(...(uvfn ? uvfn(i / cols, j / rows) : [i / cols, j / rows])); }
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const a = j * W + i, b = j * W + (wrap ? (i + 1) % W : i + 1), c = a + W, d = b + W; idx.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    return orient(g, S.normal);
  };
  S.sheet = sheet;

  // a strip round the body between heights ya and yb, lifted off(v) from it (v runs 0 at ya to 1 at yb):
  // a belt, a hat band, a scarf (which bulges in the middle and tucks into the body at its edges)
  S.band = (ya, yb, off, cols = 48, rows = 6) => sheet(cols, rows, (u, v) => S.at(ya + (yb - ya) * (1 - v), u * TAU, typeof off === 'function' ? off(1 - v, u) : off), true);
  // the top of the head from height ys up, lifted off(v) (v = 0 at ys, 1 at the crown): a hat's crown
  S.cap = (ys, off, cols = 32, rows = 8) => sheet(cols, rows, (u, v) => { const az = u * TAU, ph = S.phiAt(ys, az) * (1 - v) + 1e-4 * v; return S.polar(ph, az, typeof off === 'function' ? off(v, az) : off); }, true);
  // a patch on the front: azimuths az0..az1, heights y1 (top) down to y0, lifted off; an apron, a bib, a pocket
  S.patch = (az0, az1, y0, y1, off, cols = 14, rows = 8) => sheet(cols, rows, (u, v) => S.at(y1 + (y0 - y1) * v, az0 + (az1 - az0) * u, typeof off === 'function' ? off(u, v) : off), false);
  // a rounded-square plate on the surface about (yc, azc), aw across (radians) and hh up and down (feet),
  // lifted off; m is how square it is (2 an ellipse, 4 a squircle, 8 nearly a rectangle). UVs span the plate.
  // grow > 1 makes a ring from scale `inner` to `grow` (a bezel), off then a function of how far out (0..1).
  S.plate = (yc, azc, aw, hh, off, { m = 4, seg = 48, rings = 6, inner = 0, grow = 1 } = {}) => {
    const pos = [], uv = [], idx = [], ring = grow > 1;
    const edge = th => 1 / Math.pow(pw(Math.cos(th), m) + pw(Math.sin(th), m), 1 / m);
    const pt = (k, th) => { const s = ring ? inner + (grow - inner) * k : k, e = edge(th) * s, ux = Math.cos(th) * e, uy = Math.sin(th) * e;
      return { p: S.at(yc + uy * hh, azc + ux * aw, typeof off === 'function' ? off(k) : off), uv: [0.5 + ux / 2, 0.5 + uy / 2] }; };
    if (!ring) { const c = pt(0, 0); pos.push(...c.p); uv.push(0.5, 0.5); }
    const k0 = ring ? 0 : 1;
    for (let k = k0; k <= rings; k++) for (let i = 0; i < seg; i++) { const q = pt(k / rings, i / seg * TAU); pos.push(...q.p); uv.push(...q.uv); }
    const at = (k, i) => (ring ? 0 : 1) + (k - k0) * seg + (i % seg);
    for (let i = 0; i < seg; i++) { if (!ring) idx.push(0, at(1, i), at(1, i + 1)); }
    for (let k = k0; k < rings; k++) for (let i = 0; i < seg; i++) { const a = at(k, i), b = at(k, i + 1), c = at(k + 1, i), d = at(k + 1, i + 1); idx.push(a, c, b, b, c, d); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    return orient(g, S.normal);
  };
  // a flat-ish brim standing out from the surface at height y: a band of width w outward from the body over
  // azimuths az0..az1 (the whole way round for a straw hat), drooping a little, with an upper and a lower face
  // so it reads from below as well; widthFn(az) shapes it (a cap's peak is widest at the front)
  S.brim = (y, w, { az0 = 0, az1 = TAU, droop = 0.04, th = 0.025, off = 0.02, widthFn = () => 1, cols = 36 } = {}) => {
    const full = az1 - az0 >= TAU - 1e-6;
    const pt = (u, k, dy) => { const az = az0 + (az1 - az0) * u, b = S.at(y, az, off), r = Math.hypot(b[0], b[2]) || 1, ww = w * widthFn(az) * k;
      return [b[0] + b[0] / r * ww, y - droop * k * k + dy, b[2] + b[2] / r * ww]; };
    const top = sheet(cols, 2, (u, v) => pt(u, v, th / 2), full), bot = sheet(cols, 2, (u, v) => pt(u, v, -th / 2), full), rim = sheet(cols, 1, (u, v) => pt(u, 1, th / 2 - th * v), full);
    for (const g of [top, bot, rim]) g.deleteAttribute('uv');
    orient(top, () => [0, 1, 0]); orient(bot, () => [0, -1, 0]); orient(rim, p => [p[0], 0, p[2]]);
    return mergeGeometries([top, bot, rim], false);
  };
  // a tube lying along the surface, through the points [y, az] given, lifted off (a headphone band over the top
  // is better made with S.overTop)
  S.overTop = (y, off, r = 0.035) => {
    const pts = []; const t0 = S.phiAt(y, Math.PI / 2);
    for (let i = 0; i <= 24; i++) { const t = -t0 + 2 * t0 * i / 24, p = S.polar(Math.abs(t), t < 0 ? -Math.PI / 2 : Math.PI / 2, off); pts.push(new THREE.Vector3(...p)); }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 28, r, 6, false);
  };
  // the face screen, a rounded square about yc, hh up and down, aw across (radians; by default about twice as
  // wide as it is tall), in a soft dark bezel: { face, bezel, aw }
  S.screen = (yc, hh, aw = Math.min(1.0, (2 * hh) / S.front(yc)), { m = 4, lift = 0.012, seg = 48, rings = 6 } = {}) => ({
    aw, face: S.plate(yc, 0, aw, hh, lift, { m, rings, seg }),
    bezel: S.plate(yc, 0, aw, hh, k => 0.004 + 0.022 * roll(k), { m, seg, inner: 0.95, grow: 1.13, rings: rings - 1 }) });
  // a thing built standing on y = 0 and pointing up +y, stood on the surface at (y, az), lifted off, turned spin about its own axis
  S.place = (geo, y, az, off = 0, spin = 0) => {
    const p = S.at(y, az, off), q = S.normal(S.at(y, az)), m = new THREE.Matrix4();
    const turn = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...q)).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spin));
    return geo.applyMatrix4(m.compose(new THREE.Vector3(...p), turn, new THREE.Vector3(1, 1, 1)));
  };
  // where a hat sits: its opening, a circle r across built at y = 0 about the +y axis, let down along its own axis
  // (cocked phi from upright, towards azimuth az) until the circle lies on the head, and sunk a little into it
  S.seat = (r, { phi = 0, az = 0, sink = 0.015 } = {}) => {
    const n = new THREE.Vector3(Math.sin(phi) * Math.sin(az), Math.cos(phi), Math.sin(phi) * Math.cos(az)).normalize();
    const e1 = new THREE.Vector3().crossVectors(n, Math.abs(n.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0)).normalize(), e2 = new THREE.Vector3().crossVectors(n, e1);
    const mean = h => { let s = 0; for (let i = 0; i < 16; i++) { const t = i / 16 * TAU, c = Math.cos(t) * r, d = Math.sin(t) * r; s += S.inside([n.x * h + e1.x * c + e2.x * d, n.y * h + e1.y * c + e2.y * d, n.z * h + e1.z * c + e2.z * d]); } return s / 16; };
    let lo = 0, hi = Math.max(S.top, S.A, S.C) * 2 + r;                                  // (from the origin, which must be inside the shell)
    for (let i = 0; i < 40; i++) { const m = (lo + hi) / 2; if (mean(m) < 0) lo = m; else hi = m; }
    const h = (lo + hi) / 2 - sink, q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
    return new THREE.Matrix4().compose(n.clone().multiplyScalar(h), q, new THREE.Vector3(1, 1, 1));
  };
  // a scarf round the neck at y: a soft roll of the body's own surface, a tail laid down the front from tail[0]
  // to tail[1] (azimuths), and its knot
  S.scarf = (y, { w = 0.07, puff = 0.065, tail = [0.3, 0.58], len = 0.44, knot = 0.075, cols = 56, rows = 8 } = {}) => [
    S.band(y - w, y + w, v => 0.005 + puff * roll(v), cols, rows),
    S.patch(tail[0], tail[1], y - len, y, (u, v) => 0.006 + 0.045 * roll(u) * (1 - 0.4 * v), 6, 8),
    ...(knot ? [new THREE.SphereGeometry(knot, 10, 8).translate(...S.at(y - 0.02, (tail[0] + tail[1]) / 2, 0.07))] : [])];
  // a name badge at (y, az): a plate w across (feet) and h up and down, and its card; [plate, card]
  S.badge = (y, az, w = 0.3, h = 0.055) => { const bw = (w / 2) / S.front(y); return [S.plate(y, az, bw, h, 0.012, { m: 6, rings: 2, seg: 28 }), S.plate(y, az, bw * 0.78, h - 0.019, 0.018, { m: 6, rings: 2, seg: 28 })]; };
  // an apron, in the proportions of the shell (about its middle, y = 0): the skirt from the waist down, a bib up
  // to yTop if there is room for one (none when yTop is null or low), the strings round the waist, and a pocket.
  // { cloth: [skirt, bib, strings], pocket }
  S.apron = (yTop = null, { wide = 0.95, bibWide = 0.42 } = {}) => {
    const top = S.top, hem = (u, v, t) => 0.004 + t * Math.min(1, 6 * Math.min(u, 1 - u, v, 1 - v));
    const cloth = [S.patch(-wide, wide, -top * 0.8, -top * 0.02, (u, v) => hem(u, v, 0.008), 18, 9)];
    if (yTop !== null && yTop > top * 0.08) cloth.push(S.patch(-bibWide, bibWide, -top * 0.06, yTop, (u, v) => hem(u, v, 0.008), 10, 5));
    cloth.push(S.band(-top * 0.06, -top * 0.0, v => 0.006 + 0.012 * roll(v), 48, 3));
    return { cloth, pocket: S.plate(-top * 0.42, 0, 0.28, top * 0.1, k => 0.016 - 0.008 * k, { m: 6, rings: 3, seg: 28 }) };
  };
  return S;
}

// roll(v): a rounded profile for a strip, 0 at its edges and 1 in the middle
export const roll = v => Math.sin(Math.PI * Math.max(0, Math.min(1, v)));
