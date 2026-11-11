// Where a thing in the hand may be set down. Pure arithmetic (no three.js), so node can test it.
//
// Two levels of care:
//   aimAny / aimSpot   cheap, every frame while something is held: the centre of view against the
//                      house's collision boxes and floor surfaces. Enough to offer "set it down".
//   raySoup / dropSoup / headroom / feel
//                      exact, once, when E is pressed: against the real triangles near the spot
//                      (carry.js gathers them into a flat "soup": 9 numbers a triangle, world feet),
//                      so the thing rests on what is really there: not sunk in, not floating, not
//                      half inside a wall or a row of books.

// The first thing the centre of view meets within reach: a box (any face) or a floor.
// out: { x, y, z, t, top, c }   top: it met a box from above, or a floor;  c: the box, or null.
export function aimAny(out, ex, ey, ez, dx, dy, dz, colliders, surfaces, reach = 6.5, ground = 0.03) {
  let best = reach, top = false, hit = null, found = false;
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    if (c.off || c.staff) continue;
    if (ex > c.x0 && ex < c.x1 && ez > c.z0 && ez < c.z1 && ey > c.y0 && ey < c.y1) continue;      // standing inside it
    let t0 = 0, t1 = best, axis = -1, ok = true;
    // x
    if (Math.abs(dx) < 1e-9) { if (ex < c.x0 || ex > c.x1) continue; }
    else { let a = (c.x0 - ex) / dx, b = (c.x1 - ex) / dx; if (a > b) { const s = a; a = b; b = s; } if (a > t0) { t0 = a; axis = 0; } if (b < t1) t1 = b; if (t0 > t1) continue; }
    // y
    if (Math.abs(dy) < 1e-9) { if (ey < c.y0 || ey > c.y1) continue; }
    else { let a = (c.y0 - ey) / dy, b = (c.y1 - ey) / dy; if (a > b) { const s = a; a = b; b = s; } if (a > t0) { t0 = a; axis = 1; } if (b < t1) t1 = b; if (t0 > t1) continue; }
    // z
    if (Math.abs(dz) < 1e-9) { if (ez < c.z0 || ez > c.z1) ok = false; }
    else { let a = (c.z0 - ez) / dz, b = (c.z1 - ez) / dz; if (a > b) { const s = a; a = b; b = s; } if (a > t0) { t0 = a; axis = 2; } if (b < t1) t1 = b; if (t0 > t1) ok = false; }
    if (!ok || axis < 0) continue;
    best = t0; top = axis === 1 && dy < 0; hit = c; found = true;
  }
  if (dy < -1e-6) {
    for (let i = 0; i < surfaces.length; i++) {
      const s = surfaces[i]; if (s.ramp) continue;
      const t = (s.h - ey) / dy; if (t <= 0 || t >= best) continue;
      const x = ex + dx * t, z = ez + dz * t;
      if (x < s.x0 || x > s.x1 || z < s.z0 || z > s.z1) continue;
      best = t; top = true; hit = null; found = true;
    }
    const t = (ground - ey) / dy;
    if (t > 0 && t < best) { best = t; top = true; hit = null; found = true; }
  }
  if (!found) return null;
  out.t = best; out.x = ex + dx * best; out.y = ey + dy * best; out.z = ez + dz * best; out.top = top; out.c = hit;
  return out;
}

// A resting place from the boxes and floors alone (used when no triangles are to hand, and by the
// tests): the top of a low box or a floor, the thing's foot (radius r) kept on the top and clear of
// anything standing beside it. Returns out { x, y, z, c } or null.
export function aimSpot(out, ex, ey, ez, dx, dy, dz, colliders, surfaces, r = 0.3, h = 0.5, reach = 6.5) {
  if (!aimAny(out, ex, ey, ez, dx, dy, dz, colliders, surfaces, reach) || !out.top) return null;
  const c = out.c;
  if (c) {
    if (Math.min(c.x1 - c.x0, c.z1 - c.z0) < 0.35) return null;                 // a rail, a post: nothing stands on that
    const mx = Math.min(r, (c.x1 - c.x0) / 2 - 0.01), mz = Math.min(r, (c.z1 - c.z0) / 2 - 0.01);
    out.x = Math.max(c.x0 + mx, Math.min(c.x1 - mx, out.x)); out.z = Math.max(c.z0 + mz, Math.min(c.z1 - mz, out.z)); out.y = c.y1;
  }
  return clearSpot(out, r, h, colliders) ? out : null;
}

// Push a foot of radius r standing at out (x, y, z), h tall, out of every box that rises through
// it; false if it cannot be got clear, or has been pushed off the box it stands on.
export function clearSpot(out, r, h, colliders) {
  const sup = out.c;
  for (let pass = 0; pass < 4; pass++) {
    let moved = false;
    for (let i = 0; i < colliders.length; i++) {
      const c = colliders[i];
      if (c === sup || c.off || c.staff || c.y1 <= out.y + 0.08 || c.y0 >= out.y + h) continue;
      const nx = Math.max(c.x0, Math.min(out.x, c.x1)), nz = Math.max(c.z0, Math.min(out.z, c.z1));
      const ddx = out.x - nx, ddz = out.z - nz, d2 = ddx * ddx + ddz * ddz;
      if (d2 >= r * r - 1e-9) continue;
      if (d2 > 1e-10) { const d = Math.sqrt(d2), k = (r - d) / d; out.x += ddx * k; out.z += ddz * k; }
      else {
        const l = out.x - c.x0, rr = c.x1 - out.x, n = out.z - c.z0, f = c.z1 - out.z, m = Math.min(l, rr, n, f);
        if (m === l) out.x = c.x0 - r; else if (m === rr) out.x = c.x1 + r; else if (m === n) out.z = c.z0 - r; else out.z = c.z1 + r;
      }
      moved = true;
    }
    if (!moved) break;
    if (pass === 3) return false;
  }
  if (sup && (out.x < sup.x0 - 1e-6 || out.x > sup.x1 + 1e-6 || out.z < sup.z0 - 1e-6 || out.z > sup.z1 + 1e-6)) return false;
  return true;
}

// ---- Exact tests against a triangle soup (Float32Array, 9 numbers a triangle, n triangles) ------

// The nearest triangle along a ray. out: { t, x, y, z, ny } (ny: the upward part of the unit
// normal, sign taken to face the eye). Returns out or null.
export function raySoup(out, soup, n, ex, ey, ez, dx, dy, dz, reach = 6.5, near = 0.05) {
  let best = reach, bn = 0, found = false;
  for (let i = 0, o = 0; i < n; i++, o += 9) {
    const ax = soup[o], ay = soup[o + 1], az = soup[o + 2];
    const e1x = soup[o + 3] - ax, e1y = soup[o + 4] - ay, e1z = soup[o + 5] - az;
    const e2x = soup[o + 6] - ax, e2y = soup[o + 7] - ay, e2z = soup[o + 8] - az;
    const px = dy * e2z - dz * e2y, py = dz * e2x - dx * e2z, pz = dx * e2y - dy * e2x;
    const det = e1x * px + e1y * py + e1z * pz;
    if (det > -1e-10 && det < 1e-10) continue;
    const inv = 1 / det, tx = ex - ax, ty = ey - ay, tz = ez - az;
    const u = (tx * px + ty * py + tz * pz) * inv; if (u < 0 || u > 1) continue;
    const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x;
    const v = (dx * qx + dy * qy + dz * qz) * inv; if (v < 0 || u + v > 1) continue;
    const t = (e2x * qx + e2y * qy + e2z * qz) * inv; if (t < near || t >= best) continue;
    let nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x;
    const len = Math.hypot(nx, ny, nz) || 1; ny /= len;
    if ((nx * dx + ny * len * dy + nz * dz) > 0) ny = -ny;      // turn it to face the eye
    best = t; bn = ny; found = true;
  }
  if (!found) return null;
  out.t = best; out.x = ex + dx * best; out.y = ey + dy * best; out.z = ez + dz * best; out.ny = bn;
  return out;
}

// Height of the triangle's plane at (x, z) if (x, z) lies under it and it is not too steep; else NaN.
function under(soup, o, x, z, steep) {
  const ax = soup[o], ay = soup[o + 1], az = soup[o + 2], bx = soup[o + 3], by = soup[o + 4], bz = soup[o + 5], cx = soup[o + 6], cy = soup[o + 7], cz = soup[o + 8];
  if ((x < ax && x < bx && x < cx) || (x > ax && x > bx && x > cx) || (z < az && z < bz && z < cz) || (z > az && z > bz && z > cz)) return NaN;
  const d = (bz - cz) * (ax - cx) + (cx - bx) * (az - cz);
  if (d > -1e-12 && d < 1e-12) return NaN;                      // edge-on from above: a wall
  const u = ((bz - cz) * (x - cx) + (cx - bx) * (z - cz)) / d, v = ((cz - az) * (x - cx) + (ax - cx) * (z - cz)) / d, w = 1 - u - v;
  if (u < -1e-6 || v < -1e-6 || w < -1e-6) return NaN;
  if (steep > 0) {
    const nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay), ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az), nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (Math.abs(ny) < steep * Math.hypot(nx, ny, nz)) return NaN;
  }
  return u * ay + v * by + w * cy;
}

// Let a foot of radius r fall from height y0 at (x, z): five points (the middle and four round it)
// each find the highest near-level surface at or below y0 (no further down than `fall`).
// out: { y: where it rests (the highest of the five, so nothing sinks in), on: how many of the five
// found something within `level` of that, mx, mz: the middle of those that did }.
const SX = [0, 1, -1, 0, 0], SZ = [0, 0, 0, 1, -1], rest = new Float64Array(5);
export function dropSoup(out, soup, n, x, z, y0, r, fall = 3, level = 0.07) {
  const k = r * 0.6;
  rest.fill(-Infinity);
  for (let i = 0, o = 0; i < n; i++, o += 9) {
    for (let s = 0; s < 5; s++) {
      const y = under(soup, o, x + SX[s] * k, z + SZ[s] * k, 0.75);
      if (y === y && y <= y0 + 1e-4 && y >= y0 - fall && y > rest[s]) rest[s] = y;
    }
  }
  let top = -Infinity; for (let s = 0; s < 5; s++) if (rest[s] > top) top = rest[s];
  if (top === -Infinity) return null;
  let on = 0, mx = 0, mz = 0;
  for (let s = 0; s < 5; s++) if (top - rest[s] <= level) { on++; mx += x + SX[s] * k; mz += z + SZ[s] * k; }
  out.y = top; out.on = on; out.mx = mx / on; out.mz = mz / on; out.mid = top - rest[0] <= level;
  return out;
}

// Is there anything (a shelf above, a table top) in the way of something h tall standing at y?
export function headroom(soup, n, x, z, y, h, r) {
  const k = r * 0.6, lo = y + 0.09, hi = y + h - 0.03;
  if (hi <= lo) return true;
  for (let i = 0, o = 0; i < n; i++, o += 9) {
    for (let s = 0; s < 5; s++) {
      const yy = under(soup, o, x + SX[s] * k, z + SZ[s] * k, 0.2);
      if (yy === yy && yy > lo && yy < hi) return false;
    }
  }
  return true;
}

// Feel outwards from the middle of the thing, level, in eight directions; out.x/out.z are how far
// to move so that nothing (a wall, a row of books, a jar) is nearer than r. Returns the worst
// overlap found (0 when it stands clear).
const feelRay = { t: 0, x: 0, y: 0, z: 0, ny: 0 };
export function feel(out, soup, n, x, y, z, r) {
  let xp = 0, xn = 0, zp = 0, zn = 0, worst = 0;
  for (let a = 0; a < 8; a++) {
    const dx = Math.cos(a * Math.PI / 4), dz = Math.sin(a * Math.PI / 4);
    // start a little back from the middle so that a face exactly at the middle is still met
    if (!raySoup(feelRay, soup, n, x - dx * 0.06, y, z - dz * 0.06, dx, 0, dz, r + 0.06)) continue;
    const over = r - (feelRay.t - 0.06);
    if (over <= 0) continue;
    if (over > worst) worst = over;
    const ox = dx * over, oz = dz * over;                      // the deepest overlap each way, not their sum
    if (ox > xp) xp = ox; if (-ox > xn) xn = -ox; if (oz > zp) zp = oz; if (-oz > zn) zn = -oz;
  }
  const px = xn - xp, pz = zn - zp;
  out.x = px; out.z = pz;
  return worst;
}
