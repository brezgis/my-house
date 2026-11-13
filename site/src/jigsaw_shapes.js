// The jigsaw on the dining table, the parts that are plain arithmetic: where it lies, how the
// picture is cut (interlocking knobs and sockets, a little irregular, the same curve shared by the
// two pieces either side of a cut), and the rules of play (dragging groups, snapping to a true
// neighbour or to the true place, groups joining, stacking, sorting, saving). No three.js here, so
// it can be tested in node: site/src/jigsaw_test.mjs.
//
// Puzzle space: feet, in the plane of the board. u runs to the picture's right, v down the picture
// (towards whoever sits at the board); (0,0) is the true place of the picture's top-left corner.

// ---- Where it lies (the dining table's own frame: rooms/dining.js, fr(36.3, 8.5, F1, 0)) ----------
// x runs along the table (north), y across it (west, towards the chairs on that side), z up from the
// floor. The picture's right runs along -x and its foot along +y, so a guest sitting on the west side
// sees it the right way up.
export const PLACE = {
  table: { X: 36.3, Y: 8.5 },
  z: 2.52,                                  // the top of the table's runner, where things stand
  cx: 1.1, cy: 1.06,                        // the board's middle (= the picture's middle)
  bw: 1.64, bd: 1.29, bz: 0.02,             // the board: along x, across y, thick
  W: 1.4, H: 1.05,                          // the picture, 4:3
  // where loose pieces may lie, on the table round the board (clear of the tea things, the candles
  // and the lid against the jug)
  x0: -0.3, x1: 2.42, y0: 0.25, y1: 1.63,
  lid: { x: 3.02, y: 1.16, w: 0.96, h: 0.72, rim: 0.07, lean: 1.2, turn: 0.42 },
};
// table frame -> puzzle space and back
export const toPuzzle = (x, y) => [PLACE.W / 2 + (PLACE.cx - x), PLACE.H / 2 + (y - PLACE.cy)];
export const toTable = (u, v) => [PLACE.cx - (u - PLACE.W / 2), PLACE.cy + (v - PLACE.H / 2)];
// the board and the table's free part, in puzzle space
export const BOARD_UV = (() => { const [a, b] = toPuzzle(PLACE.cx + PLACE.bw / 2, PLACE.cy - PLACE.bd / 2), [c, d] = toPuzzle(PLACE.cx - PLACE.bw / 2, PLACE.cy + PLACE.bd / 2); return { u0: a, v0: b, u1: c, v1: d }; })();
export const REGION = (() => { const [a, b] = toPuzzle(PLACE.x1, PLACE.y0), [c, d] = toPuzzle(PLACE.x0, PLACE.y1); return { u0: a, v0: b, u1: c, v1: d }; })();

export const SIZES = [24, 54, 96];

// ---- A small seeded random ------------------------------------------------------------------------
export function rng(seed) {
  let s = (Math.abs(Math.floor(seed)) % 2147483646) + 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}
export const hash = str => { let h = 2166136261; for (const ch of String(str)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; } return h; };

// About n pieces for a picture of this shape, with pieces as near square as can be
export function gridFor(n, aspect) {
  let best = null;
  for (let rows = 2; rows <= 20; rows++) for (let cols = 2; cols <= 24; cols++) {
    const cell = (aspect / cols) / (1 / rows), err = Math.abs(cols * rows - n) / n * 3 + Math.abs(Math.log(cell));
    if (!best || err < best.err) best = { cols, rows, err };
  }
  return { cols: best.cols, rows: best.rows };
}

// ---- The cuts -------------------------------------------------------------------------------------
// Each inner edge is one curve (after Draradech's jigsaw generator: three cubic Béziers, a neck and a
// round knob), with its own small irregularities; `flip` says which side the knob goes. Consecutive
// edges along one cut line share their end tangents, so a line runs on smoothly through the corners.
export function makeCuts(cols, rows, seed) {
  const r = rng(seed), j = 0.045, J = () => (r() * 2 - 1) * j;
  const one = prevE => { const e = J(); return { flip: r() < 0.5 ? -1 : 1, t: 0.085 + r() * 0.03, a: -prevE, b: J(), c: J(), d: J(), e }; };
  const h = [], v = [];       // h[r][c]: the cut under row r (r < rows-1); v[r][c]: the cut right of column c (c < cols-1)
  for (let y = 0; y < rows - 1; y++) { h.push([]); let e = 0; for (let x = 0; x < cols; x++) { const c = one(e); e = c.e; h[y].push(c); } }
  for (let y = 0; y < rows; y++) v.push([]);
  for (let x = 0; x < cols - 1; x++) { let e = 0; for (let y = 0; y < rows; y++) { const c = one(e); e = c.e; v[y][x] = c; } }
  return { h, v };
}

const SEGS = [4, 7, 4];      // points sampled on each of the three curves (the knob needs most)
// One cut as points (along, across) in units of the cell: along 0..1, across signed (+ = the knob's side)
export function edgeCurve(c) {
  const { t, a, b, c: cc, d, e, flip } = c;
  const P = [[0, 0], [0.2, a], [0.5 + b + d, -t + cc], [0.5 - t + b, t + cc],
    [0.5 - 2 * t + b - d, 3 * t + cc], [0.5 + 2 * t + b - d, 3 * t + cc], [0.5 + t + b, t + cc],
    [0.5 + b + d, -t + cc], [0.8, e], [1, 0]];
  const out = [];
  for (let k = 0; k < 3; k++) {
    const [p0, p1, p2, p3] = [P[k * 3], P[k * 3 + 1], P[k * 3 + 2], P[k * 3 + 3]], n = SEGS[k];
    for (let i = 1; i <= n; i++) {
      const s = i / n, m = 1 - s, w0 = m * m * m, w1 = 3 * m * m * s, w2 = 3 * m * s * s, w3 = s * s * s;
      out.push([w0 * p0[0] + w1 * p1[0] + w2 * p2[0] + w3 * p3[0], (w0 * p0[1] + w1 * p1[1] + w2 * p2[1] + w3 * p3[1]) * flip]);
    }
  }
  return out;     // from just after (0,0) up to and including (1,0)
}

// Every piece's outline in puzzle space at its true place, as a flat [u0,v0,u1,v1,...] going round
// top (left to right), right side (down), foot (right to left), left side (up). The shared cuts are
// computed once each, so neighbours fit exactly.
export function outlines(cols, rows, cw, ch, cuts) {
  const H = cuts.h.map(row => row.map(edgeCurve)), V = cuts.v.map(row => row.map(c => c && edgeCurve(c)));
  const list = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x0 = c * cw, y0 = r * ch, x1 = x0 + cw, y1 = y0 + ch, pts = [x0, y0];
    // top: the cut under row r-1, walked forwards (across + is down the picture)
    if (r > 0) for (const [s, w] of H[r - 1][c]) pts.push(x0 + s * cw, y0 + w * ch); else pts.push(x1, y0);
    // right: the cut right of column c, walked downwards (across + is to the right)
    if (c < cols - 1) for (const [s, w] of V[r][c]) pts.push(x1 + w * cw, y0 + s * ch); else pts.push(x1, y1);
    // foot: the cut under row r, walked backwards
    if (r < rows - 1) { const e = H[r][c]; for (let i = e.length - 2; i >= 0; i--) pts.push(x0 + e[i][0] * cw, y1 + e[i][1] * ch); pts.push(x0, y1); } else pts.push(x0, y1);
    // left: the cut right of column c-1, walked upwards
    if (c > 0) { const e = V[r][c - 1]; for (let i = e.length - 2; i >= 0; i--) pts.push(x0 + e[i][1] * cw, y0 + e[i][0] * ch); }
    // (the last point would be (x0, y0) again: left open)
    list.push(pts);
  }
  return list;
}

export function pointInPoly(pts, x, y) {
  let inside = false;
  for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
    const xi = pts[i], yi = pts[i + 1], xj = pts[j], yj = pts[j + 1];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// ---- Play -----------------------------------------------------------------------------------------
// Each piece: where its true-place corner now lies (x, y), its group (g: the lowest piece number in
// it), whether that group is in its true place on the board (home: such groups stay put), and how
// high it lies in a pile (layer). Members of a group keep their exact offsets from one another.
export class Puzzle {
  constructor(cols, rows, W, H) {
    this.cols = cols; this.rows = rows; this.n = cols * rows; this.W = W; this.H = H; this.cw = W / cols; this.ch = H / rows;
    this.tol = 0.3 * Math.min(this.cw, this.ch);
    this.p = Array.from({ length: this.n }, (_, i) => ({ i, c: i % cols, r: Math.floor(i / cols), x: (i % cols) * this.cw, y: Math.floor(i / cols) * this.ch, g: i, home: false, layer: 0 }));
  }
  hx(i) { return this.p[i].c * this.cw; }
  hy(i) { return this.p[i].r * this.ch; }
  edge(i) { const q = this.p[i]; return q.c === 0 || q.r === 0 || q.c === this.cols - 1 || q.r === this.rows - 1; }
  members(g) { return this.p.filter(q => q.g === g); }
  groups() { const s = new Map(); for (const q of this.p) { if (!s.has(q.g)) s.set(q.g, []); s.get(q.g).push(q); } return s; }
  neighbours(i) { const { c, r } = this.p[i], out = []; if (c > 0) out.push(i - 1); if (c < this.cols - 1) out.push(i + 1); if (r > 0) out.push(i - this.cols); if (r < this.rows - 1) out.push(i + this.cols); return out; }
  placed() { return this.p.filter(q => q.home).length; }
  solved() { return this.p.every(q => q.home); }
  shift(g, dx, dy) { for (const q of this.p) if (q.g === g) { q.x += dx; q.y += dy; } }
  // a group's box, knobs and all
  box(g, list = this.members(g)) {
    const m = 0.24 * Math.max(this.cw, this.ch); let u0 = Infinity, v0 = Infinity, u1 = -Infinity, v1 = -Infinity;
    for (const q of list) { u0 = Math.min(u0, q.x - m); v0 = Math.min(v0, q.y - m); u1 = Math.max(u1, q.x + this.cw + m); v1 = Math.max(v1, q.y + this.ch + m); }
    return { u0, v0, u1, v1 };
  }
  // keep a group on the table: its middle inside the region
  clamp(g, R) {
    const b = this.box(g), mx = (b.u0 + b.u1) / 2, my = (b.v0 + b.v1) / 2;
    const dx = Math.min(Math.max(mx, R.u0), R.u1) - mx, dy = Math.min(Math.max(my, R.v0), R.v1) - my;
    if (dx || dy) this.shift(g, dx, dy);
  }
  merge(into, from) { const home = this.p.some(q => (q.g === into || q.g === from) && q.home), g = Math.min(into, from); for (const q of this.p) if (q.g === into || q.g === from) { q.g = g; q.home = home; } return g; }

  // Let go of a group: it joins any true neighbour lying close to where it should, and settles into
  // its true place if it is near it. Returns { joined, home, solved, g }.
  drop(g) {
    let joined = 0, home = false;
    for (let again = true; again;) {
      again = false;
      for (const q of this.members(g)) {
        for (const k of this.neighbours(q.i)) {
          const o = this.p[k]; if (o.g === g) continue;
          const ex = (o.x - q.x) - (o.c - q.c) * this.cw, ey = (o.y - q.y) - (o.r - q.r) * this.ch;
          if (Math.hypot(ex, ey) < this.tol) { this.shift(g, ex, ey); g = this.merge(g, o.g); joined++; again = true; break; }
        }
        if (again) break;
      }
    }
    const list = this.members(g);
    if (!list[0].home) {
      const q = list.find(q => Math.hypot(q.x - this.hx(q.i), q.y - this.hy(q.i)) < this.tol);
      if (q) {
        this.shift(g, this.hx(q.i) - q.x, this.hy(q.i) - q.y); for (const m of list) m.home = true; home = true;
        // home groups touching it are one with it now
        for (const m of this.members(g)) for (const k of this.neighbours(m.i)) { const o = this.p[k]; if (o.home && o.g !== g) g = this.merge(g, o.g); }
      }
    } else home = true;
    this.restack(g);
    return { joined, home, solved: this.solved(), g };
  }
  // Lay a group on top of whatever it overlaps (home groups lie flat on the board)
  restack(g) {
    const list = this.members(g), b = this.box(g, list), all = this.groups();
    const over = (a, c) => a.u0 < c.u1 && c.u0 < a.u1 && a.v0 < c.v1 && c.v0 < a.v1;
    if (list[0].home) {
      for (const q of list) q.layer = 0;
      for (const [k, m] of all) if (k !== g && !m[0].home && m[0].layer < 1 && over(b, this.box(k, m))) for (const q of m) q.layer = 1;
      return;
    }
    let top = -1;
    for (const [k, m] of all) if (k !== g && over(b, this.box(k, m))) top = Math.max(top, m[0].home ? 0 : m[0].layer);
    const layer = Math.min(6, top + 1);
    for (const q of list) q.layer = layer;
  }
  // The topmost movable piece under a point
  pick(u, v, outlines) {
    let best = -1, bl = -1;
    for (const q of this.p) {
      if (q.home) continue;
      const lu = u - (q.x - this.hx(q.i)), lv = v - (q.y - this.hy(q.i));
      if (q.layer > bl && pointInPoly(outlines[q.i], lu, lv)) { best = q.i; bl = q.layer; }
    }
    return best;
  }

  // ---- Laying out ----
  // Places for loose pieces, row by row, in strips round the board: the left side first, then the
  // right, then along the top, and if need be over the board's empty margin
  slots(R, need, spacing) {
    const cw = this.cw, ch = this.ch;
    for (let k = spacing; k > 0.55; k -= 0.05) {
      const sx = cw * k, sy = ch * k, m = 0.08 * Math.max(cw, ch), out = [];
      const strip = (u0, u1, v0, v1) => { for (let v = v0; v + ch <= v1 + 1e-9; v += sy) for (let u = u0; u + cw <= u1 + 1e-9; u += sx) out.push([u, v]); };
      const L = { u0: R.u0 + m, u1: -0.25 * cw - m }, Rt = { u0: this.W + 0.25 * cw + m, u1: R.u1 - m };
      strip(L.u0, L.u1, R.v0 + m, R.v1 - m);
      strip(Rt.u0, Rt.u1, R.v0 + m, R.v1 - m);
      strip(0, this.W, R.v0 + m, -0.25 * ch - m);
      if (out.length >= need) return out;
    }
    return null;
  }
  // Sort: every loose group (one piece or several) to the sides, edge pieces first (nearest the left)
  tidy(R) {
    const loose = [...this.groups()].filter(([, m]) => !m[0].home);
    const singles = loose.filter(([, m]) => m.length === 1).map(([g]) => g);
    singles.sort((a, b) => (this.edge(b) - this.edge(a)) || (a - b));
    const slots = this.slots(R, singles.length, 1.5) ?? this.slots(R, 0, 0.6);
    const laid = [], over = (a, c) => a.u0 < c.u1 && c.u0 < a.u1 && a.v0 < c.v1 && c.v0 < a.v1;
    singles.forEach((g, k) => {
      const s = slots[Math.min(k, slots.length - 1)], q = this.p[g]; q.x = s[0] + (k >= slots.length ? (k - slots.length + 1) * 0.01 : 0); q.y = s[1];
      // where knobs reach over a neighbour, one of the two lies a card's thickness higher
      const b = this.box(g, [q]), used = new Set(laid.filter(o => over(b, o.b)).map(o => o.q.layer));
      q.layer = [0, 1, 2, 3].find(l => !used.has(l)) ?? 0; laid.push({ q, b });
    });
    // bigger loose groups stay where they are, laid on top
    for (const [g, m] of loose) if (m.length > 1) { this.clamp(g, R); this.restack(g); }
  }
  // A fresh start: everything scattered (seeded, so the same picture always starts the same way)
  scatter(R, seed) {
    for (const q of this.p) { q.g = q.i; q.home = false; q.layer = 0; }
    const r = rng(seed), order = this.p.map(q => q.i);
    for (let i = order.length - 1; i > 0; i--) { const k = Math.floor(r() * (i + 1)); [order[i], order[k]] = [order[k], order[i]]; }
    const slots = this.slots(R, order.length, 1.32) ?? this.slots(R, 0, 0.6);
    for (let i = slots.length - 1; i > 0; i--) { const k = Math.floor(r() * (i + 1)); [slots[i], slots[k]] = [slots[k], slots[i]]; }
    order.forEach((i, k) => {
      const s = slots[k % slots.length], q = this.p[i];
      q.x = s[0] + (r() - 0.5) * this.cw * 0.28 + (k >= slots.length ? this.cw * 0.4 : 0); q.y = s[1] + (r() - 0.5) * this.ch * 0.28;
      q.x = Math.min(Math.max(q.x, R.u0), R.u1 - this.cw); q.y = Math.min(Math.max(q.y, R.v0), R.v1 - this.ch);
    });
    for (const [g] of this.groups()) this.restack(g);
  }
  // The state a visitor first finds: about a third done, the frame begun from the top-left corner and
  // carried on (edges first), one little island of pieces put together but not yet placed, the rest
  // scattered round the board and a few on its empty part.
  begin(R, seed) {
    this.scatter(R, seed);
    const want = Math.round(this.n / 3), ring = [];
    for (let c = 0; c < this.cols; c++) ring.push(c);
    for (let r = 1; r < this.rows; r++) ring.push(r * this.cols + this.cols - 1);
    for (let c = this.cols - 2; c >= 0; c--) ring.push((this.rows - 1) * this.cols + c);
    for (let r = this.rows - 2; r > 0; r--) ring.push(r * this.cols);
    const done = new Set(ring.slice(0, want));
    // and a few pieces inside the corner, as people do
    for (let r = 1; r < this.rows - 1 && done.size < want + Math.round(this.n / 12); r++) for (let c = 1; c < 3 && done.size < want + Math.round(this.n / 12); c++) done.add(r * this.cols + c);
    for (const i of done) { const q = this.p[i]; q.x = this.hx(i); q.y = this.hy(i); q.home = true; q.g = 0; q.layer = 0; }
    // the island: a 2 x 2 block from the middle, put together and left lying beside the board
    const r0 = Math.floor(this.rows / 2) - 1, c0 = Math.floor(this.cols / 2), isl = [r0 * this.cols + c0, r0 * this.cols + c0 + 1, (r0 + 1) * this.cols + c0, (r0 + 1) * this.cols + c0 + 1].filter(i => !done.has(i));
    if (isl.length === 4) { const g = Math.min(...isl), ou = this.W * 0.62, ov = this.H * 0.55; for (const i of isl) { const q = this.p[i]; q.g = g; q.x = this.hx(i) - this.hx(isl[0]) + ou; q.y = this.hy(i) - this.hy(isl[0]) + ov; } }
    // a few loose pieces lie on the empty part of the board, as they do
    const r = rng(seed + 7), loose = this.p.filter(q => !q.home && this.members(q.g).length === 1);
    const empty = this.p.filter(q => !q.home && q.c > 0 && q.r > 0 && q.c < this.cols - 1 && q.r < this.rows - 1 && !isl.includes(q.i));
    for (let k = 0; k < Math.round(this.n / 10) && loose.length && empty.length; k++) {
      const q = loose.splice(Math.floor(r() * loose.length), 1)[0], at = empty.splice(Math.floor(r() * empty.length), 1)[0];
      q.x = this.hx(at.i) + (r() - 0.5) * this.cw * 0.3; q.y = this.hy(at.i) + (r() - 0.5) * this.ch * 0.3;
    }
    for (const [g] of this.groups()) this.restack(g);
    this.restack(0);
  }
  // Put n more pieces in their true places (test shots: ?toy=jigsaw:solve-N), nearest the done part first
  solveSome(k) {
    const order = this.p.filter(q => !q.home).sort((a, b) => (a.r + a.c) - (b.r + b.c));
    for (const q of order.slice(0, k)) { for (const m of this.members(q.g)) { m.x = this.hx(m.i); m.y = this.hy(m.i); m.home = true; } }
    const homes = this.p.filter(q => q.home); for (const q of homes) { q.g = homes[0].i; q.layer = 0; }
    for (const [g, m] of this.groups()) if (!m[0].home) this.restack(g);
  }

  // ---- Saving ----
  save() { return { v: 1, n: this.n, p: this.p.map(q => [Math.round(q.x * 1e4) / 1e4, Math.round(q.y * 1e4) / 1e4, q.g, q.home ? 1 : 0, q.layer]) }; }
  restore(s) {
    if (!s || s.v !== 1 || s.n !== this.n || !Array.isArray(s.p) || s.p.length !== this.n) return false;
    if (!s.p.every(a => Array.isArray(a) && a.length === 5 && a.every(Number.isFinite) && a[2] >= 0 && a[2] < this.n)) return false;
    s.p.forEach(([x, y, g, home, layer], i) => Object.assign(this.p[i], { x, y, g, home: !!home, layer }));
    // repair anything inconsistent (a group's members keep exact offsets; its id is its lowest member)
    for (const [g, m] of this.groups()) { const lo = Math.min(...m.map(q => q.i)); const a = m[0]; for (const q of m) { q.g = lo; q.home = a.home; q.x = a.x + (q.c - a.c) * this.cw; q.y = a.y + (q.r - a.r) * this.ch; } if (a.home) for (const q of m) { q.x = this.hx(q.i); q.y = this.hy(q.i); } }
    return true;
  }
}
