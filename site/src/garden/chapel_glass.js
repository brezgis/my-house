// The chapel's windows, drawn as leaded glass: each piece of glass cut and filled with its own
// colour (a little lighter or darker than its neighbours, streaked, with a seed bubble or two),
// shaded at its edges with paint, lettering painted on a banderole, and the leads laid over
// everything. Plain 2D canvas, no three.js, so the windows can be looked at on their own.
//
// The canvas is what the glass lets through: lead is black, pale glass nearly white. The chapel
// (chapel.js) lights it from behind with the sky.
//
//   W1 murmuration      starlings over reeds at dusk, the round window over the door
//   W2 broken symmetry  roundels with compass needles: hot and disordered above, cold, packed and
//                       all pointing one chosen way below (Anderson's crystal and magnet)
//   W3 Life             Conway's game on the quarries; the only window that moves (lifeStep)
//   W4 Turing           a daisy head over an animal's coat, spots running into stripes
//   W5 eigen-behaviour  a tangle smoothed by the same operation again and again until a ball
//   W6 the neuron       a pyramidal cell in black paint on amber, after Ramón y Cajal
//   W7 ingressing minds pure shapes descending into a flatworm, a cell, a frog and a machine
//   W8 a strange loop   a ring of steps that climbs all the way round to where it began, Gödel's
//                       numbering on its treads, the ring again inside it, a clear roundel at the heart
//
// Every window carries words, in one hand and one size (inscription(), below), large enough to read
// from the middle of the floor; the round one has them in a ring round its edge.
//
// Some of the drawing is slow-ish (the Turing coat is grown by reaction and diffusion), so every
// window is drawn by a generator that yields now and then: chapel.js spreads the work over frames.

const TAU = Math.PI * 2;
export const FONT = '"Goudy House", "Sorts Mill Goudy", "Iowan Old Style", Palatino, Georgia, serif';
export const rng = seed => { let s = (seed >>> 0) || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// ---- colours: [hue, saturation, lightness] ------------------------------------------------------
const C = {
  blue: [222, 70, 30], deep: [228, 72, 20], azure: [206, 64, 46], ruby: [350, 78, 34], rose: [348, 55, 62],
  amber: [38, 88, 50], gold: [46, 90, 60], straw: [48, 60, 82], white: [70, 22, 88], green: [128, 48, 30],
  emerald: [160, 70, 28], leaf: [96, 46, 40], violet: [276, 48, 32], purple: [290, 40, 24], umber: [24, 60, 18],
  flesh: [20, 58, 74], teal: [184, 58, 30], ice: [200, 40, 82], orange: [24, 86, 48], grey: [210, 10, 55],
};
const hsl = ([h, s, l], a = 1) => `hsla(${h.toFixed(1)},${clamp(s, 0, 100).toFixed(1)}%,${clamp(l, 0, 100).toFixed(1)}%,${a})`;
const lerpC = (a, b, t) => { let dh = b[0] - a[0]; if (dh > 180) dh -= 360; if (dh < -180) dh += 360; return [(a[0] + dh * t + 360) % 360, mix(a[1], b[1], t), mix(a[2], b[2], t)]; };
const shift = ([h, s, l], dh = 0, ds = 0, dl = 0) => [(h + dh + 360) % 360, s + ds, l + dl];

// ---- polygons ----------------------------------------------------------------------------------
const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
const circle = (cx, cy, r, n = 40, rot = 0) => Array.from({ length: n }, (_, i) => [cx + Math.cos(rot + (i / n) * TAU) * r, cy + Math.sin(rot + (i / n) * TAU) * r]);
const ellipse = (cx, cy, rx, ry, rot = 0, n = 36) => Array.from({ length: n }, (_, i) => { const a = (i / n) * TAU, x = Math.cos(a) * rx, y = Math.sin(a) * ry; return [cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]; });
function centroid(p) { let x = 0, y = 0; for (const q of p) { x += q[0]; y += q[1]; } return [x / p.length, y / p.length]; }
function area(p) { let a = 0; for (let i = 0; i < p.length; i++) { const [x0, y0] = p[i], [x1, y1] = p[(i + 1) % p.length]; a += x0 * y1 - x1 * y0; } return Math.abs(a) / 2; }
// keep the part of a convex-or-not polygon where a*x + b*y <= c
function clipHalf(poly, a, b, c) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const P = poly[i], Q = poly[(i + 1) % poly.length], dp = a * P[0] + b * P[1] - c, dq = a * Q[0] + b * Q[1] - c;
    if (dp <= 0) out.push(P);
    if ((dp < 0 && dq > 0) || (dp > 0 && dq < 0)) { const t = dp / (dp - dq); out.push([P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t]); }
  }
  return out;
}
// Voronoi cells of the sites inside a convex outline: the irregular hand-cut pieces of a background
function voronoi(sites, outline) {
  return sites.map((s, i) => {
    let p = outline;
    for (let j = 0; j < sites.length && p.length > 2; j++) {
      if (j === i) continue;
      const o = sites[j], dx = o[0] - s[0], dy = o[1] - s[1];
      if (dx * dx + dy * dy > 6e4) continue;
      p = clipHalf(p, dx, dy, (dx * (s[0] + o[0]) + dy * (s[1] + o[1])) / 2);
    }
    return p;
  }).filter(p => p.length > 2);
}
// Sites spread evenly but not regularly (a few relaxation passes of dart throwing)
function sitesIn(test, bx0, by0, bx1, by1, n, r, minD) {
  const out = [];
  for (let k = 0; k < n * 40 && out.length < n; k++) {
    const x = bx0 + r() * (bx1 - bx0), y = by0 + r() * (by1 - by0);
    if (!test(x, y)) continue;
    const d = typeof minD === 'function' ? minD(x, y) : minD;
    if (out.some(q => (q[0] - x) ** 2 + (q[1] - y) ** 2 < d * d)) continue;
    out.push([x, y]);
  }
  return out;
}
// Inset a convex polygon (counter-clockwise or clockwise) by d
function inset(poly, d) {
  const n = poly.length, sgn = signedArea(poly) > 0 ? 1 : -1, lines = [];
  for (let i = 0; i < n; i++) {
    const [x0, y0] = poly[i], [x1, y1] = poly[(i + 1) % n], len = Math.hypot(x1 - x0, y1 - y0), nx = -(y1 - y0) / len * sgn, ny = (x1 - x0) / len * sgn;
    lines.push([x0 + nx * d, y0 + ny * d, x1 - x0, y1 - y0]);
  }
  return lines.map((L, i) => { const M = lines[(i + n - 1) % n]; const den = M[2] * L[3] - M[3] * L[2]; const t = ((L[0] - M[0]) * L[3] - (L[1] - M[1]) * L[2]) / den; return [M[0] + M[2] * t, M[1] + M[3] * t]; });
}
function signedArea(p) { let a = 0; for (let i = 0; i < p.length; i++) { const [x0, y0] = p[i], [x1, y1] = p[(i + 1) % p.length]; a += x0 * y1 - x1 * y0; } return a / 2; }
const path = (g, polys) => { g.beginPath(); for (const p of polys) { g.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) g.lineTo(p[i][0], p[i][1]); g.closePath(); } };
const inPolyPt = (x, y, p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, yi] = p[i], [xj, yj] = p[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };

// ---- the glazier's hand ---------------------------------------------------------------------------
// One piece of glass: its colour varies a little, it is streaky and seedy as blown glass is, and the
// painter has shaded it toward its edges. polys: one outline, or several (holes, by even-odd).
function glass(g, polys, col, r, o = {}) {
  if (!polys.length || !polys[0].length) return;
  if (!Array.isArray(polys[0][0])) polys = [polys];
  polys = polys.filter(p => p.length > 2); if (!polys.length) return;
  const c = shift(col, (r() - 0.5) * (o.hj ?? 7), (r() - 0.5) * 8, (r() - 0.5) * (o.lj ?? 9));
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const p of polys) for (const [x, y] of p) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const w = x1 - x0, h = y1 - y0, sz = Math.max(w, h);
  g.save(); path(g, polys); g.clip('evenodd');
  // thicker and thinner across the sheet
  const a = r() * TAU, gr = g.createLinearGradient(x0 + w / 2 - Math.cos(a) * sz / 2, y0 + h / 2 - Math.sin(a) * sz / 2, x0 + w / 2 + Math.cos(a) * sz / 2, y0 + h / 2 + Math.sin(a) * sz / 2);
  gr.addColorStop(0, hsl(shift(c, 0, 4, 7))); gr.addColorStop(0.55, hsl(c)); gr.addColorStop(1, hsl(shift(c, 2, 6, -9)));
  g.fillStyle = gr; g.fillRect(x0 - 2, y0 - 2, w + 4, h + 4);
  // streaks, all one way in a sheet, wavering
  const sa = r() * TAU, ns = Math.min(18, 3 + (w * h) / 900), ca = Math.cos(sa), sa2 = Math.sin(sa);
  for (let i = 0; i < ns; i++) {
    const off = (r() - 0.5) * sz * 1.4, cx = x0 + w / 2 - sa2 * off, cy = y0 + h / 2 + ca * off;
    g.strokeStyle = r() < 0.55 ? `rgba(255,250,235,${0.05 + r() * 0.09})` : `rgba(20,10,0,${0.04 + r() * 0.08})`;
    g.lineWidth = 0.8 + r() * (o.streak ?? 3.5); g.beginPath();
    g.moveTo(cx - ca * sz, cy - sa2 * sz);
    g.bezierCurveTo(cx - ca * sz * 0.3 + (r() - 0.5) * 10, cy - sa2 * sz * 0.3 + (r() - 0.5) * 10, cx + ca * sz * 0.3 + (r() - 0.5) * 10, cy + sa2 * sz * 0.3 + (r() - 0.5) * 10, cx + ca * sz, cy + sa2 * sz);
    g.stroke();
  }
  // seeds: little bubbles
  for (let i = 0, n = Math.floor((w * h) / 2500 * r()); i < n; i++) { g.fillStyle = `rgba(255,255,240,${0.2 + r() * 0.3})`; g.beginPath(); g.ellipse(x0 + r() * w, y0 + r() * h, 0.6 + r() * 1.4, 0.5 + r(), r() * 3, 0, TAU); g.fill(); }
  // the painter's shading toward the edges (a matt of brown paint, brushed off the middle)
  if (o.matt !== 0) { g.strokeStyle = `rgba(48,30,14,${o.matt ?? 0.32})`; g.lineWidth = o.mattW ?? 12; g.lineJoin = 'round'; path(g, polys); g.stroke(); g.lineWidth = (o.mattW ?? 12) * 0.4; g.strokeStyle = `rgba(40,24,10,${(o.matt ?? 0.32) * 0.8})`; g.stroke(); }
  g.restore();
}
// Leads over the joins: a black came, slightly irregular
function leads(g, polys, w, r) {
  g.lineJoin = 'round'; g.lineCap = 'round';
  for (const p of polys) {
    if (!p.length || !p[0].length) continue;
    const ps = Array.isArray(p[0][0]) ? p : [p];
    g.strokeStyle = '#0d0b09'; g.lineWidth = w * (0.85 + r() * 0.3); path(g, ps); g.stroke();
  }
}
// Paint: grisaille lines and washes
const paint = (a = 0.85) => `rgba(28,17,9,${a})`;

// ---- the border shared by all the windows ----------------------------------------------------------
// A narrow fillet of pale glass, then a band of deep blue cut in lengths, a ruby or amber jewel at
// every joint. Returns the inner outline and the pieces' outlines (for the leads).
function border(g, outline, r, unit, o = {}) {
  const pieces = [], n = outline.length, d1 = unit * 0.5, d2 = unit * 1.55;
  const A = outline, B = inset(outline, d1), Cc = inset(outline, d2), D = inset(outline, d2 + unit * 0.22);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, len = Math.hypot(A[j][0] - A[i][0], A[j][1] - A[i][1]), segs = Math.max(1, Math.round(len / (unit * 4.2)));
    for (let s = 0; s < segs; s++) {
      const t0 = s / segs, t1 = (s + 1) / segs, L = (P, Q, t) => [P[0] + (Q[0] - P[0]) * t, P[1] + (Q[1] - P[1]) * t];
      const fil = [L(A[i], A[j], t0), L(A[i], A[j], t1), L(B[i], B[j], t1), L(B[i], B[j], t0)];
      glass(g, fil, o.fillet ?? C.white, r, { matt: 0.18, mattW: 5 }); pieces.push(fil);
      // the band, with a square jewel at its start
      const tj = Math.min(0.3 * (t1 - t0), unit * 1.05 / len);
      const jewel = [L(B[i], B[j], t0), L(B[i], B[j], t0 + tj), L(Cc[i], Cc[j], t0 + tj), L(Cc[i], Cc[j], t0)];
      const band = [L(B[i], B[j], t0 + tj), L(B[i], B[j], t1), L(Cc[i], Cc[j], t1), L(Cc[i], Cc[j], t0 + tj)];
      glass(g, band, o.band ?? C.blue, r, { mattW: 8 }); pieces.push(band);
      glass(g, jewel, (i + s) % 2 ? (o.jewelA ?? C.ruby) : (o.jewelB ?? C.amber), r, { mattW: 6 }); pieces.push(jewel);
    }
    const inner = [Cc[i], Cc[j], D[j], D[i]];
    glass(g, inner, o.inner ?? C.gold, r, { matt: 0.2, mattW: 4 }); pieces.push(inner);
  }
  return { inner: D, pieces };
}
// A round border: a ring of alternating pieces
function ringBorder(g, cx, cy, R, r, unit) {
  const pieces = [], n = 20, r1 = R - unit * 0.5, r2 = R - unit * 1.6, r3 = r2 - unit * 0.22;
  const arc = (ra, rb, a0, a1) => { const p = []; for (let k = 0; k <= 6; k++) { const a = a0 + (a1 - a0) * k / 6; p.push([cx + Math.cos(a) * ra, cy + Math.sin(a) * ra]); } for (let k = 6; k >= 0; k--) { const a = a0 + (a1 - a0) * k / 6; p.push([cx + Math.cos(a) * rb, cy + Math.sin(a) * rb]); } return p; };
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * TAU - Math.PI / 2, a1 = ((i + 1) / n) * TAU - Math.PI / 2, am = a0 + (a1 - a0) * 0.22;
    const f = arc(R, r1, a0, a1); glass(g, f, C.white, r, { matt: 0.18, mattW: 5 }); pieces.push(f);
    const j = arc(r1, r2, a0, am); glass(g, j, i % 2 ? C.ruby : C.amber, r, { mattW: 6 }); pieces.push(j);
    const b = arc(r1, r2, am, a1); glass(g, b, C.blue, r, { mattW: 8 }); pieces.push(b);
    const k = arc(r2, r3, a0, a1); glass(g, k, C.gold, r, { matt: 0.2, mattW: 4 }); pieces.push(k);
  }
  return { r: r3, pieces };
}

// ---- lettering ----------------------------------------------------------------------------------------
// Set by hand: each letter placed, small capitals made from capitals, spaced a little open.
function setLine(g, text, x, y, size, o = {}) {
  const caps = o.caps, italic = o.italic, track = o.track ?? 0.04;
  const runs = [];
  for (const ch of text) {
    if (caps && ch !== ch.toUpperCase()) runs.push([ch.toUpperCase(), size * 0.76]); else runs.push([ch, size]);
  }
  const font = s => `${italic ? 'italic ' : ''}${s.toFixed(1)}px ${FONT}`;
  let w = 0; for (const [ch, s] of runs) { g.font = font(s); w += g.measureText(ch).width + s * track; }
  w -= (runs.at(-1)?.[1] ?? 0) * track;
  if (o.measure) return w;
  let cx = o.align === 'left' ? x : x - w / 2;
  g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  for (const [ch, s] of runs) { g.font = font(s); const cw = g.measureText(ch).width, yy = y + (o.yAt ? o.yAt(cx + cw / 2) : 0); g.fillText(ch, cx, yy); if (o.bold) { g.lineWidth = s * o.bold; g.lineJoin = 'round'; g.strokeText(ch, cx, yy); } cx += cw + s * track; }
  return w;
}
// A banderole: a ribbon of pale glass with its ends turned under, lettered in brown paint.
// lines: [{ text, size, caps, italic }]. Returns its pieces.
function banderole(g, x0, x1, yc, h, lines, r, o = {}) {
  const pieces = [], fold = o.fold ?? h * 0.5, wave = o.wave ?? h * 0.05, n = 1;
  const top = x => yc - h / 2 + Math.sin((x - x0) / (x1 - x0) * Math.PI * 2) * wave, bot = x => top(x) + h;
  // the turned-under ends, in a deeper tone (the back of the ribbon)
  for (const s of [-1, 1]) {
    const xe = s < 0 ? x0 : x1, yt = top(xe) + h * 0.32, p = [[xe, yt], [xe + s * fold * 1.25, yt - h * 0.12], [xe + s * fold * 0.8, yt + h * 0.45], [xe + s * fold * 1.25, yt + h * 1.0], [xe, yt + h * 0.95]];
    glass(g, p, o.back ?? shift(C.straw, -8, 10, -22), r, { mattW: 7 }); pieces.push(p);
  }
  for (let i = 0; i < n; i++) {
    const a = x0 + (x1 - x0) * i / n, b = x0 + (x1 - x0) * (i + 1) / n, p = [];
    for (let k = 0; k <= 8; k++) { const x = a + (b - a) * k / 8; p.push([x, top(x)]); }
    for (let k = 8; k >= 0; k--) { const x = a + (b - a) * k / 8; p.push([x, bot(x)]); }
    glass(g, p, o.col ?? [46, 38, 90], r, { matt: 0.14, mattW: 7, lj: 2, hj: 3, streak: 1.2 }); pieces.push(p);
  }
  // a painted rule along each edge, as on a scroll
  g.strokeStyle = paint(0.55); g.lineWidth = 1.2;
  for (const f of [x => top(x) + h * 0.12, x => bot(x) - h * 0.12]) { g.beginPath(); for (let x = x0 + 6; x <= x1 - 6; x += 4) { const y = f(x); x === x0 + 6 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); }
  // the letters follow the ribbon's wave; the block of lines is fitted to the ribbon and centred on it
  g.fillStyle = paint(1); g.strokeStyle = paint(1);
  const room = h * 0.8, block = ls => ls[0].size * 0.7 + ls.slice(1).reduce((s2, l) => s2 + l.size * (l.lead ?? 1.15), 0) + ls.at(-1).size * 0.18;
  let k = Math.min(1, room / block(lines));
  const fit = lines.map(l => ({ ...l, size: l.size * k })), xm = (x0 + x1) / 2;
  for (const l of fit) { const w = setLine(g, l.text, 0, 0, l.size, { ...l, measure: true }); if (w > (x1 - x0) * 0.86) l.size *= (x1 - x0) * 0.86 / w; }
  let y = yc - block(fit) / 2 + fit[0].size * 0.7;
  fit.forEach((l, i) => {
    if (i) y += l.size * (l.lead ?? 1.15);
    setLine(g, l.text, xm, y, l.size, { ...l, bold: 0.035, yAt: x => top(x) - (yc - h / 2) });
  });
  return pieces;
}

// The words of a window: its lines in italic, then the credit in small capitals, all at one size in
// every window (TXT and CR, in the window's units, a seventeenth of its width), or a title in capitals.
// Returns the lines as banderole() takes them, the ribbon's height, and its options.
const TXT = 1.3, CR = 0.7;
function inscription(unit, lines, credit, title) {
  const ls = [];
  for (const t of [].concat(title ?? [])) ls.push({ text: t, size: unit * 1.2, track: 0.14, lead: ls.length ? 1.0 : 1 });
  for (const t of lines ?? []) ls.push({ text: t, size: unit * TXT, italic: true, lead: ls.length ? 1.04 : 1 });
  ls.push({ text: credit, size: unit * CR, caps: true, track: 0.12, lead: 1.3 });
  const block = ls[0].size * 0.7 + ls.slice(1).reduce((s2, l) => s2 + l.size * l.lead, 0) + ls.at(-1).size * 0.18;
  return { lines: ls, h: block / 0.8 + unit * 0.3, o: { fold: unit * 0.75, wave: unit * 0.15 } };
}
// Words set once round a circle, clockwise, their feet toward the middle, the first run centred at the
// top (so it reads the right way up; the rest comes round underneath): runs [[text, font]]
function ringWords(g, cx, cy, rad, runs, fit) {
  const chars = []; for (const [t, font] of runs) for (const ch of t) { g.font = font; chars.push([ch, font, g.measureText(ch).width]); }
  const total = chars.reduce((a2, c) => a2 + c[2], 0), sp = (fit - total) / chars.length;     // spaced to go exactly once round
  const first = [...runs[0][0]].length, w0 = chars.slice(0, first).reduce((a2, c) => a2 + c[2] + sp, 0);
  let a = -Math.PI / 2 - (w0 / rad) / 2;
  for (const [ch, font, w] of chars) {
    const am = a + (w / 2 + sp / 2) / rad;
    g.save(); g.translate(cx, cy); g.rotate(am + Math.PI / 2); g.font = font; g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.fillText(ch, 0, -rad); g.strokeText(ch, 0, -rad); g.restore();
    a += (w + sp) / rad;
  }
}

// ---- W1: a murmuration ----------------------------------------------------------------------------
function* murmuration(g, S, seed = 11) {
  const r = rng(seed), cx = S / 2, cy = S / 2, R = S / 2 - 2, unit = S / 34;
  const ring = ringBorder(g, cx, cy, R, r, unit), tb = unit * 3.1, Ri = ring.r - tb;
  const disc = circle(cx, cy, Ri, 64);
  // dusk: deep blue above, violet, rose, then a band of gold at the horizon
  const skyAt = y => { const t = (y - (cy - Ri)) / (2 * Ri); return t < 0.45 ? lerpC(C.deep, C.violet, t / 0.45) : t < 0.66 ? lerpC(C.violet, shift(C.rose, 0, 0, -6), (t - 0.45) / 0.21) : lerpC(C.rose, C.gold, Math.min(1, (t - 0.66) / 0.12)); };
  const land = x => cy + Ri * 0.56 + Math.sin(x * 0.05) * unit * 0.4 + Math.sin(x * 0.013 + 1) * unit * 1.1;
  const sites = sitesIn((x, y) => inPolyPt(x, y, disc) && y < land(x) + unit, cx - Ri, cy - Ri, cx + Ri, cy + Ri, 70, r, unit * 2.9);
  const sky = voronoi(sites, disc).map(p => p.map(([x, y]) => [x, y]));
  const pieces = [...ring.pieces];
  // the ring of words: one piece of pale glass, lettered in brown paint
  {
    const band = [circle(cx, cy, ring.r, 72), circle(cx, cy, Ri, 72)];
    glass(g, band, [46, 38, 90], r, { matt: 0.14, mattW: 7, lj: 2, hj: 3, streak: 1.2 }); pieces.push(...band);
    const sz = tb * 0.78, f = (i, c) => `${i ? 'italic ' : ''}${c ? (sz * 0.8).toFixed(1) : sz.toFixed(1)}px ${FONT}`;
    g.fillStyle = paint(1); g.strokeStyle = paint(1); g.lineWidth = tb * 0.026; g.lineJoin = 'round';
    ringWords(g, cx, cy, Ri + tb * 0.26, [['at each level of complexity entirely new properties appear', f(1)], ['  ·  ', f(0)], ['P. W. ANDERSON  ·  1972', f(0, 1)], ['  ·  ', f(0)]], Math.PI * 2 * (Ri + tb * 0.26));
  }
  for (const p of sky) { const [x, y] = centroid(p); glass(g, p, skyAt(y + (r() - 0.5) * unit * 1.2), r, { mattW: 10 }); pieces.push(p); }
  yield;
  // the land: reeds and a line of trees, in dark green and purple
  {
    const pts = []; for (let x = cx - Ri; x <= cx + Ri; x += 6) pts.push([x, land(x)]);
    const ground = clipPoly([...pts, [cx + Ri, cy + Ri + 4], [cx - Ri, cy + Ri + 4]], disc);
    glass(g, ground, shift(C.purple, -20, -10, -6), r, { mattW: 14 }); pieces.push(ground);
    const near = []; for (let x = cx - Ri; x <= cx + Ri; x += 6) near.push([x, land(x) + unit * 1.6 + Math.sin(x * 0.09) * unit * 0.4]);
    const g2 = clipPoly([...near, [cx + Ri, cy + Ri + 4], [cx - Ri, cy + Ri + 4]], disc);
    glass(g, g2, shift(C.green, 0, -10, -12), r, { mattW: 12 }); pieces.push(g2);
    // reeds painted on
    g.strokeStyle = paint(0.75);
    for (let i = 0; i < 70; i++) { const x = cx - Ri + r() * 2 * Ri, y0 = land(x) + unit * (0.6 + r() * 2.2); if (!inPolyPt(x, y0, disc)) continue; const hgt = unit * (0.8 + r() * 1.8), lean = (r() - 0.4) * unit * 0.6; g.lineWidth = 1 + r(); g.beginPath(); g.moveTo(x, y0); g.quadraticCurveTo(x + lean * 0.3, y0 - hgt * 0.6, x + lean, y0 - hgt); g.stroke(); if (r() < 0.25) { g.fillStyle = paint(0.8); g.beginPath(); g.ellipse(x + lean, y0 - hgt, 1.6, 4, lean * 0.02, 0, TAU); g.fill(); } }
  }
  yield;
  // the flock: a wash of paint where it is thick, then thousands of small painted birds, the
  // sheet of them folding over on itself (darkest where it is seen edge-on)
  const P = Array.from({ length: 80 }, (_, i) => { const t = i / 79, a = t * Math.PI * 1.7 - 0.5; return [cx - Ri * 0.66 + t * Ri * 1.36 + Math.sin(a * 1.4) * Ri * 0.1, cy - Ri * 0.2 + Math.sin(a * 1.15 + 0.5) * Ri * 0.26 - Math.sin(t * Math.PI) * Ri * 0.1]; });
  const wid = t => Ri * (0.06 + 0.15 * Math.sin(Math.PI * t) ** 0.8) * (1 - 0.72 * Math.exp(-((t - 0.5) ** 2) / 0.005));
  const dens = (x, y) => { let d = 0; for (let i = 0; i < 80; i += 2) { const [px, py] = P[i], w = wid(i / 79) + 2, dd = ((x - px) ** 2 + (y - py) ** 2) / (w * w); if (dd < 9) d += Math.exp(-dd) * (0.4 + Ri * 0.035 / w); } return d; };
  g.save(); path(g, [disc]); g.clip();
  for (let i = 0; i < 80; i++) { const [px, py] = P[i], w = wid(i / 79) * 1.1 + 3, k = Math.min(0.2, 0.05 + Ri * 0.003 / w); const gr = g.createRadialGradient(px, py, 0, px, py, w); gr.addColorStop(0, `rgba(30,14,24,${k})`); gr.addColorStop(1, 'rgba(30,14,24,0)'); g.fillStyle = gr; g.fillRect(px - w, py - w, 2 * w, 2 * w); }
  g.restore();
  g.strokeStyle = paint(0.9); g.lineCap = 'round'; g.lineJoin = 'round';
  let n = 0;
  for (let k = 0; k < 90000 && n < 6500; k++) {
    const x = cx - Ri * 0.95 + r() * Ri * 1.9, y = cy - Ri * 0.8 + r() * Ri * 1.2;
    const d = dens(x, y); if (r() > d * d * 0.35 || !inPolyPt(x, y, disc) || y > land(x) - 2) continue;
    n++;
    const s = 1.1 + r() * 1.1, a = Math.sin(x * 0.02 + y * 0.03) * 0.6 + (r() - 0.5) * 0.5, up = 0.2 + r() * 0.9;
    const c = Math.cos(a), sn = Math.sin(a);
    g.lineWidth = 0.8 + s * 0.2; g.beginPath();
    g.moveTo(x - c * s * 1.5 + sn * s * up, y - sn * s * 1.5 - c * s * up); g.lineTo(x, y); g.lineTo(x + c * s * 1.5 + sn * s * up, y + sn * s * 1.5 - c * s * up); g.stroke();
  }
  // a few stragglers out on their own
  for (let k = 0; k < 50; k++) { const x = cx - Ri * 0.8 + r() * Ri * 1.6, y = cy - Ri * 0.7 + r() * Ri * 0.9; if (!inPolyPt(x, y, disc) || y > land(x) - 6 || dens(x, y) > 0.3) continue; const s = 2; g.lineWidth = 1.1; g.beginPath(); g.moveTo(x - s * 1.5, y - s * 0.6); g.lineTo(x, y); g.lineTo(x + s * 1.5, y - s * 0.6); g.stroke(); }
  leads(g, pieces, unit * 0.36, r);
  return pieces;
}
// A starling in flight, from below: a pointed head, swept triangular wings, a short square tail
function bird(x, y, s, a) {
  const half = [[1.25, 0], [1.0, 0.1], [0.55, 0.16], [0.05, 1.3], [-0.25, 1.22], [-0.2, 0.22], [-0.75, 0.18], [-1.05, 0.3], [-1.1, 0]];
  const pts = [...half, ...half.slice(1, -1).reverse().map(([u, v]) => [u, -v])];
  return pts.map(([u, v]) => [x + (u * Math.cos(a) - v * Math.sin(a)) * s, y + (u * Math.sin(a) + v * Math.cos(a)) * s]);
}
// intersect any polygon with a convex outline
function clipPoly(p, outline) {
  let q = p; const sgn = signedArea(outline) > 0 ? 1 : -1;
  for (let i = 0; i < outline.length && q.length; i++) { const [x0, y0] = outline[i], [x1, y1] = outline[(i + 1) % outline.length], nx = -(y1 - y0) * sgn, ny = (x1 - x0) * sgn; q = clipHalf(q, -nx, -ny, -(nx * x0 + ny * y0)); }
  return q;
}

// ---- W2: broken symmetry ------------------------------------------------------------------------
function* brokenSymmetry(g, W, H, seed = 22) {
  const r = rng(seed), unit = W / 17, b = border(g, rect(0, 0, W, H), r, unit, { band: C.violet });
  const [x0, y0] = b.inner[0], [x1, y1] = b.inner[2], pieces = [...b.pieces];
  const ins = inscription(unit, ['an entirely new', 'and very beautiful', 'symmetry'], 'P. W. Anderson · 1972'), bandY = y1 - unit * 0.45 - ins.h / 2, top = y0, bot = bandY - ins.h / 2 - unit * 0.45;
  // the ground behind the roundels: pale glass, warm above and cool below
  const ground = voronoi(sitesIn(() => true, x0, y0, x1, y1, 46, r, unit * 2.6), rect(x0, y0, x1, y1));
  for (const p of ground) { const [, y] = centroid(p), t = smooth(top, bot, y); glass(g, p, lerpC([40, 55, 80], [205, 35, 80], t), r, { mattW: 10 }); pieces.push(p); }
  leads(g, pieces, unit * 0.22, r); pieces.length = 0;
  yield;
  // a hexagonal lattice, turned to an angle of its own choosing, shaken loose toward the top
  const R0 = unit * 0.98, a0 = 0.33, dirA = -1.15;                       // the lattice's angle, and the way every needle comes to point
  const ax = [Math.cos(a0) * 2 * R0 * 1.06, Math.sin(a0) * 2 * R0 * 1.06], ay = [Math.cos(a0 + Math.PI / 3) * 2 * R0 * 1.06, Math.sin(a0 + Math.PI / 3) * 2 * R0 * 1.06];
  const pts = [];
  for (let i = -20; i <= 20; i++) for (let j = -20; j <= 20; j++) {
    let x = (x0 + x1) / 2 + i * ax[0] + j * ay[0], y = (top + bot) / 2 + 40 + i * ax[1] + j * ay[1];
    if (x < x0 - R0 || x > x1 + R0 || y < top - R0 || y > bot + R0) continue;
    const t = smooth(top + (bot - top) * 0.25, bot - (bot - top) * 0.25, y), heat = 1 - t;
    if (r() < 0.24 * heat) continue;                                         // the liquid is less dense
    x += (r() - 0.5) * 2.6 * R0 * heat; y += (r() - 0.5) * 2.6 * R0 * heat;
    pts.push({ x, y, heat, s: 0.82 + 0.18 * (1 - heat) + (r() - 0.5) * 0.3 * heat });
  }
  // let the shaken ones settle apart
  for (let it = 0; it < 30; it++) for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
    const p = pts[i], q = pts[j], dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1, m = R0 * (p.s + q.s) * 1.02;
    if (d < m && (p.heat > 0.02 || q.heat > 0.02)) { const k = (m - d) / d * 0.5; if (p.heat > 0.02) { p.x -= dx * k; p.y -= dy * k; } if (q.heat > 0.02) { q.x += dx * k; q.y += dy * k; } }
  }
  yield;
  // domains: a slowly varying field of directions in between
  const field = (x, y) => Math.sin(x * 0.013 + 1.3) * 1.7 + Math.cos(y * 0.011 - x * 0.006) * 1.9 + Math.sin(y * 0.031 + 2) * 0.6;
  for (const p of pts) {
    const rad = R0 * p.s;
    if (p.x - rad < x0 + 2 || p.x + rad > x1 - 2 || p.y - rad < top + 2 || p.y + rad > bot) continue;
    const hot = p.heat, dir = dirA + hot * (hot > 0.6 ? (r() - 0.5) * TAU : field(p.x, p.y) * hot * 1.4);
    const col = hot > 0.55 ? [[350, 75, 38], [24, 85, 47], [38, 88, 52], [8, 70, 42], [330, 50, 40]][Math.floor(r() * 5)] : lerpC([300, 50, 34], C.blue, smooth(0.55, 0.05, hot));
    const disc = circle(p.x, p.y, rad, 30);
    glass(g, disc, col, r, { mattW: rad * 0.5, matt: 0.28 });
    // crown glass: the faint rings of a spun roundel
    g.save(); path(g, [disc]); g.clip();
    for (let k = 1; k < 4; k++) { g.strokeStyle = `rgba(255,250,230,${0.07 + 0.04 * k})`; g.lineWidth = 1.2; g.beginPath(); g.arc(p.x, p.y, rad * k / 4.2, 0, TAU); g.stroke(); }
    g.restore();
    // the needle: one half silver stain (yellow), one half painted dark
    const L = rad * 0.78, wN = rad * 0.2, c = Math.cos(dir), s = Math.sin(dir), px = -s, py = c;
    g.fillStyle = 'rgba(255,214,90,.92)'; g.beginPath(); g.moveTo(p.x + c * L, p.y + s * L); g.lineTo(p.x + px * wN, p.y + py * wN); g.lineTo(p.x - px * wN, p.y - py * wN); g.closePath(); g.fill();
    g.fillStyle = paint(0.82); g.beginPath(); g.moveTo(p.x - c * L, p.y - s * L); g.lineTo(p.x + px * wN, p.y + py * wN); g.lineTo(p.x - px * wN, p.y - py * wN); g.closePath(); g.fill();
    g.fillStyle = paint(0.9); g.beginPath(); g.arc(p.x, p.y, rad * 0.09, 0, TAU); g.fill();
    pieces.push(disc);
  }
  yield;
  // the banderole across the foot
  pieces.push(...banderole(g, x0 + unit * 0.9, x1 - unit * 0.9, bandY, ins.h, ins.lines, r, ins.o));
  // below it, a band of the settled crystal running on
  leads(g, pieces, unit * 0.22, r);
  return pieces;
}

// ---- W3: Life -----------------------------------------------------------------------------------------
// The grid of quarries is the board. A stream of gliders runs down it on the diagonal (the board
// wraps round), past things that stay (a block, a beehive, a boat, a loaf) and things that blink.
// Cells born this step are gold, cells that stayed are ruby, cells that have just died keep a
// little warmth for one step. chapel.js calls lifeStep about once a second while it is in view.
export const LIFE = { cols: 22, rows: 44 };
const SEEDS = (() => {
  const L = [];
  const put = (ox, oy, rows) => rows.forEach((row, y) => [...row].forEach((c, x) => { if (c === 'O') L.push([ox + x, oy + y]); }));
  const glider = ['.O.', '..O', 'OOO'];
  for (const k of [0, 11, 22, 33]) put(1 + (k % 22), 1 + k, glider);   // all on the same diagonal band, eleven apart
  // things off the band (x - y away from the gliders' diagonal, modulo 22)
  put(13, 3, ['OO', 'OO']);                                              // block
  put(15, 16, ['.OO.', 'O..O', '.OO.']);                                  // beehive
  put(13, 26, ['OOO']);                                                    // blinker
  put(17, 31, ['OO.', 'O.O', '.O.']);                                     // boat
  put(14, 38, ['.OO.', 'O..O', '.O.O', '..O.']);                          // loaf
  put(19, 8, ['OOO']);                                                     // blinker
  put(5, 26, ['.OOO', 'OOO.']);                                            // toad
  put(3, 36, ['OO..', 'OO..', '..OO', '..OO']);                           // beacon
  put(7, 17, ['O', 'O', 'O']);                                              // blinker
  return L;
})();
export function makeLife(g, W, H, seed = 33) {
  const r = rng(seed), unit = W / 17, b = border(g, rect(0, 0, W, H), r, unit, { band: C.emerald, jewelA: C.ruby, jewelB: C.gold });
  const [x0, y0] = b.inner[0], [x1, y1] = b.inner[2], { cols, rows } = LIFE;
  const ins = inscription(unit, ['Three to be born.', 'Two or three to stay.'], 'Life · J. H. Conway · 1970'), bandH = ins.h / 0.86 + unit * 0.2, cw = (x1 - x0) / cols, ch = Math.min(cw, (y1 - y0 - bandH - unit * 0.9) / rows), gx = x0, gy = y0;
  const gridH = ch * rows, pieces = [...b.pieces];
  // under the board, a strip of plain quarries and the banderole
  const below = rect(x0, gy + gridH, x1, y1);
  glass(g, below, shift(C.white, 60, 10, -6), r, { mattW: 10 }); pieces.push(below);
  pieces.push(...banderole(g, x0 + unit * 0.9, x1 - unit * 0.9, (gy + gridH + y1) / 2, ins.h, ins.lines, r, ins.o));
  leads(g, pieces, unit * 0.22, r);
  // four sheets of the whole board, one per state; a step copies cells from them
  const mk = () => { const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(Math.ceil(cols * cw) + 2, Math.ceil(gridH) + 2) : Object.assign(document.createElement('canvas'), { width: Math.ceil(cols * cw) + 2, height: Math.ceil(gridH) + 2 }); return c; };
  const STATES = [
    (i, j) => { const f = Math.sin(i * 0.31 + j * 0.13) + Math.sin(j * 0.21 - i * 0.17 + 2) * 0.8, t = (f + 1.8) / 3.6; return lerpC(lerpC([196, 34, 82], [52, 46, 82], t), [140, 22, 84], ((i * 7 + j * 13) % 5) / 9); },   // dead: old quarry glass, greenish, straw, a little blue
    () => [44, 92, 56],                                                     // born
    () => [356, 74, 38],                                                    // stayed
    () => [30, 50, 74],                                                     // just died
  ];
  const sheets = STATES.map((col, k) => {
    const c = mk(), q = c.getContext('2d'), rr = rng(seed + 7);           // the same streaks in every sheet, so a cell changes colour only
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const p = rect(1 + i * cw, 1 + j * ch, 1 + (i + 1) * cw, 1 + (j + 1) * ch);
      glass(q, p, col(i, j), rr, { mattW: cw * 0.34, matt: k === 0 ? 0.22 : 0.3, streak: 2 });
      if (k === 1) { q.fillStyle = 'rgba(255,250,215,.35)'; q.beginPath(); q.arc(1 + (i + 0.5) * cw, 1 + (j + 0.5) * ch, cw * 0.18, 0, TAU); q.fill(); }
    }
    q.strokeStyle = '#0d0b09'; q.lineWidth = Math.max(2, cw * 0.3);
    for (let i = 0; i <= cols; i++) { q.beginPath(); q.moveTo(1 + i * cw, 0); q.lineTo(1 + i * cw, gridH + 2); q.stroke(); }
    for (let j = 0; j <= rows; j++) { q.beginPath(); q.moveTo(0, 1 + j * ch); q.lineTo(cols * cw + 2, 1 + j * ch); q.stroke(); }
    return c;
  });
  // the board
  const N = cols * rows, cur = new Uint8Array(N), nxt = new Uint8Array(N), shown = new Uint8Array(N).fill(255), state = new Uint8Array(N);
  for (const [x, y] of SEEDS) cur[((y % rows) * cols) + (x % cols)] = 1;
  for (let i = 0; i < N; i++) state[i] = cur[i] ? 2 : 0;
  const draw = () => {
    for (let k = 0; k < N; k++) {
      if (shown[k] === state[k]) continue;
      shown[k] = state[k];
      const i = k % cols, j = (k - i) / cols, sx = i * cw, sy = j * ch, w = cw + 2, h = ch + 2;
      g.drawImage(sheets[state[k]], sx, sy, w, h, gx - 1 + sx, gy - 1 + sy, w, h);
    }
  };
  const step = () => {
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      let n = 0;
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { if (!di && !dj) continue; n += cur[((j + dj + rows) % rows) * cols + ((i + di + cols) % cols)]; }
      const k = j * cols + i, alive = cur[k];
      nxt[k] = n === 3 || (alive && n === 2) ? 1 : 0;
      state[k] = nxt[k] ? (alive ? 2 : 1) : (alive ? 3 : 0);
    }
    cur.set(nxt);
    draw();
  };
  draw();
  return { step, pieces, cur, board: { x: gx, y: gy, w: cols * cw, h: gridH } };
}

// ---- W4: Turing -------------------------------------------------------------------------------------
function* turing(g, W, H, seed = 44) {
  const r = rng(seed), unit = W / 17, b = border(g, rect(0, 0, W, H), r, unit, { band: C.teal });
  const [x0, y0] = b.inner[0], [x1, y1] = b.inner[2], pieces = [...b.pieces];
  const ins = inscription(unit, ['a simplification and', 'an idealization, and', 'consequently a', 'falsification'], 'A. M. Turing · 1952'), bandY = y1 - unit * 0.45 - ins.h / 2, coatTop = y0 + (x1 - x0) * 0.82, coatBot = bandY - ins.h / 2 - unit * 0.45;
  // above: the daisy head on blue
  const dcx = (x0 + x1) / 2, dcy = y0 + (coatTop - y0) * 0.5, DR = (x1 - x0) * 0.4;
  const skyP = voronoi(sitesIn((x, y) => Math.hypot(x - dcx, y - dcy) > DR * 0.9, x0, y0, x1, coatTop, 26, r, unit * 2.4), rect(x0, y0, x1, coatTop));
  for (const p of skyP) { glass(g, p, shift(C.azure, 0, 0, -6 + r() * 6), r); pieces.push(p); }
  leads(g, pieces, unit * 0.22, r); pieces.length = 0;
  // ray florets, white tipped with rose
  const nr = 21;
  for (let i = 0; i < nr; i++) {
    const a = (i / nr) * TAU + 0.1, a0 = a - TAU / nr * 0.46, a1 = a + TAU / nr * 0.46, rin = DR * 0.5, rout = DR * (0.96 + r() * 0.04);
    const p = [[dcx + Math.cos(a0) * rin, dcy + Math.sin(a0) * rin], [dcx + Math.cos(a0) * rout * 0.86, dcy + Math.sin(a0) * rout * 0.86], [dcx + Math.cos(a) * rout, dcy + Math.sin(a) * rout], [dcx + Math.cos(a1) * rout * 0.86, dcy + Math.sin(a1) * rout * 0.86], [dcx + Math.cos(a1) * rin, dcy + Math.sin(a1) * rin]];
    glass(g, p, i % 3 ? C.white : shift(C.rose, 0, -20, 18), r, { mattW: 7 }); pieces.push(p);
    g.strokeStyle = paint(0.35); g.lineWidth = 1; g.beginPath(); g.moveTo(dcx + Math.cos(a) * rin * 1.1, dcy + Math.sin(a) * rin * 1.1); g.lineTo(dcx + Math.cos(a) * rout * 0.85, dcy + Math.sin(a) * rout * 0.85); g.stroke();
  }
  // the disc: florets set at the golden angle, so the spirals run 13 one way and 21 the other
  const discP = circle(dcx, dcy, DR * 0.5, 48);
  glass(g, discP, C.amber, r, { mattW: 16, matt: 0.4 }); pieces.push(discP);
  const GA = Math.PI * (3 - Math.sqrt(5)), NF = 230;
  for (let i = 1; i < NF; i++) {
    const rr = DR * 0.47 * Math.sqrt(i / NF), a = i * GA, x = dcx + Math.cos(a) * rr, y = dcy + Math.sin(a) * rr, s = DR * 0.026 + DR * 0.022 * Math.sqrt(i / NF);
    g.fillStyle = i / NF < 0.35 ? 'rgba(120,70,10,.55)' : paint(0.62); g.beginPath(); g.arc(x, y, s, 0, TAU); g.fill();
    g.fillStyle = 'rgba(255,230,140,.4)'; g.beginPath(); g.arc(x - s * 0.3, y - s * 0.3, s * 0.35, 0, TAU); g.fill();
  }
  yield;
  // below: the coat, grown by reaction and diffusion (Gray and Scott's version of Turing's
  // equations), its feed rate rising down the window so that spots run together into stripes
  const GW = 72, GH = Math.round(GW * (coatBot - coatTop) / (x1 - x0)), N = GW * GH;
  let u = new Float32Array(N).fill(1), v = new Float32Array(N), u2 = new Float32Array(N), v2 = new Float32Array(N);
  for (let i = 0; i < 46; i++) { const cx = Math.floor(r() * GW), cy = Math.floor(r() * GH); for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const k = ((cy + dy + GH) % GH) * GW + (cx + dx + GW) % GW; v[k] = 0.5 + r() * 0.2; u[k] = 0.5; } }
  const Fy = new Float32Array(GH), Ky = new Float32Array(GH);
  for (let y = 0; y < GH; y++) { const e = smooth(0.25, 0.8, y / GH); Fy[y] = mix(0.0367, 0.055, e); Ky[y] = mix(0.0649, 0.062, e); }
  for (let it = 0; it < 5200; it++) {
    for (let y = 0; y < GH; y++) {
      const ym = ((y - 1 + GH) % GH) * GW, yp = ((y + 1) % GH) * GW, yc = y * GW, F = Fy[y], K = Ky[y];
      for (let x = 0; x < GW; x++) {
        const xm = x === 0 ? GW - 1 : x - 1, xp = x === GW - 1 ? 0 : x + 1, i = yc + x, ui = u[i], vi = v[i];
        const uvv = ui * vi * vi;
        u2[i] = ui + 0.2 * (u[ym + x] + u[yp + x] + u[yc + xm] + u[yc + xp] - 4 * ui) - uvv + F * (1 - ui);
        v2[i] = vi + 0.1 * (v[ym + x] + v[yp + x] + v[yc + xm] + v[yc + xp] - 4 * vi) + uvv - (F + K) * vi;
      }
    }
    [u, u2] = [u2, u]; [v, v2] = [v2, v];
    if (it % 400 === 399) yield;
  }
  // the coat's ground, pale gold, and the markings traced round and leaded in
  const coat = rect(x0, coatTop, x1, coatBot);
  const ground = voronoi(sitesIn(() => true, x0, coatTop, x1, coatBot, 18, r, unit * 3), coat);
  for (const p of ground) { glass(g, p, shift(C.gold, -6, -14, 6), r, { mattW: 10 }); pieces.push(p); }
  leads(g, ground, unit * 0.22, r);
  const sx = (x1 - x0) / GW, sy = (coatBot - coatTop) / GH;
  const loops = contours(v, GW, GH, 0.22).map(l => smoothLoop(l, 2).map(([i, j]) => [x0 + i * sx, coatTop + j * sy])).filter(l => l.length > 4);
  const clipped = loops.map(l => clipPoly(l, coat)).filter(l => l.length > 2 && area(l) > 30);
  glass(g, clipped, [24, 62, 20], r, { mattW: 9, matt: 0.45, lj: 4 });
  pieces.push(...clipped);
  yield;
  pieces.push(...banderole(g, x0 + unit * 0.6, x1 - unit * 0.6, bandY, ins.h, ins.lines, r, ins.o));
  leads(g, pieces, unit * 0.22, r);
  return pieces;
}
// Marching squares: closed outlines of {f > level} on a grid (padded, so every outline closes)
function contours(f, W, H, level) {
  const at = (i, j) => (i < 0 || j < 0 || i >= W || j >= H) ? 0 : f[j * W + i];
  const segs = new Map(), key = (x, y) => `${Math.round(x * 64)},${Math.round(y * 64)}`;
  const edge = (ax, ay, bx, by) => { const va = at(ax, ay), vb = at(bx, by), t = (level - va) / (vb - va); return [ax + (bx - ax) * t, ay + (by - ay) * t]; };
  const add = (p, q) => { segs.set(key(...p), { p, q }); };
  for (let j = -1; j < H; j++) for (let i = -1; i < W; i++) {
    const a = at(i, j) > level, b2 = at(i + 1, j) > level, c = at(i + 1, j + 1) > level, d = at(i, j + 1) > level;
    const T = () => edge(i, j, i + 1, j), R = () => edge(i + 1, j, i + 1, j + 1), B = () => edge(i, j + 1, i + 1, j + 1), L = () => edge(i, j, i, j + 1);
    const code = (a ? 8 : 0) | (b2 ? 4 : 0) | (c ? 2 : 0) | (d ? 1 : 0);
    switch (code) {        // segments run with the inside on their left
      case 1: add(L(), B()); break; case 2: add(B(), R()); break; case 3: add(L(), R()); break; case 4: add(R(), T()); break;
      case 5: add(L(), T()); add(R(), B()); break; case 6: add(B(), T()); break; case 7: add(L(), T()); break; case 8: add(T(), L()); break;
      case 9: add(T(), B()); break; case 10: add(T(), R()); add(B(), L()); break; case 11: add(T(), R()); break; case 12: add(R(), L()); break;
      case 13: add(R(), B()); break; case 14: add(B(), L()); break; default: break;
    }
  }
  const loops = [];
  while (segs.size) {
    const [k0, s0] = segs.entries().next().value; segs.delete(k0);
    const loop = [s0.p]; let q = s0.q;
    for (let n = 0; n < 100000; n++) { const k = key(...q), s = segs.get(k); if (!s) break; segs.delete(k); loop.push(s.p); q = s.q; }
    loops.push(loop);
  }
  return loops;
}
const smoothLoop = (l, n) => { let p = l; for (let k = 0; k < n; k++) p = p.map((q, i) => { const a = p[(i - 1 + p.length) % p.length], b = p[(i + 1) % p.length]; return [(a[0] + 2 * q[0] + b[0]) / 4, (a[1] + 2 * q[1] + b[1]) / 4]; }); return p; };

// ---- W5: eigen-behaviour -----------------------------------------------------------------------------
// The same operation, applied to what it last made: a tangled loop is smoothed and set back on its
// centre, again and again, and settles into the one form it does not change: a ball.
function* eigen(g, W, H, seed = 55) {
  const r = rng(seed), unit = W / 17, b = border(g, rect(0, 0, W, H), r, unit, { band: C.ruby, jewelA: C.blue, jewelB: C.gold });
  const [x0, y0] = b.inner[0], [x1, y1] = b.inner[2], pieces = [...b.pieces];
  const ins = inscription(unit, ['Objects: Tokens for', '(Eigen-)Behaviors'], 'H. von Foerster · for Jean Piaget · 1976'), bandY = y1 - unit * 0.45 - ins.h / 2;
  // the ground: lozenge quarries, as in old leaded lights
  const qw = unit * 1.7, qh = unit * 2.6, field = rect(x0, y0, x1, y1);
  for (let j = -1; j * qh / 2 < y1 - y0 + qh; j++) for (let i = -1; i * qw < x1 - x0 + qw; i++) {
    const cx = x0 + i * qw + (j % 2 ? qw / 2 : 0), cy = y0 + j * qh / 2;
    const p = clipPoly([[cx, cy - qh / 2], [cx + qw / 2, cy], [cx, cy + qh / 2], [cx - qw / 2, cy]], field);
    if (p.length < 3) continue;
    glass(g, p, shift([200, 26, 84], (r() - 0.5) * 20, 0, (r() - 0.5) * 6), r, { mattW: 6, matt: 0.2, streak: 2 }); pieces.push(p);
  }
  leads(g, pieces, unit * 0.2, r); pieces.length = 0;
  yield;
  // the operation: keep the loop's own shape, but less of every wrinkle, and centre it again
  const K = 9, coef = [];
  for (let k = -K; k <= K; k++) coef.push(k === 1 ? [1, 0] : k === 0 ? [0, 0] : [(r() - 0.5) * 1.5 / Math.sqrt(Math.abs(k)), (r() - 0.5) * 1.5 / Math.sqrt(Math.abs(k))]);
  const loopOf = (cf, cx, cy, R) => { const pts = []; for (let i = 0; i < 160; i++) { const t = (i / 160) * TAU; let x = 0, y = 0; for (let k = -K; k <= K; k++) { const [a, b2] = cf[k + K], c = Math.cos(k * t), s = Math.sin(k * t); x += a * c - b2 * s; y += a * s + b2 * c; } pts.push([x, y]); } const m = Math.max(...pts.map(([x, y]) => Math.hypot(x, y))); return pts.map(([x, y]) => [cx + x / m * R, cy + y / m * R]); };
  const T = cf => cf.map(([a, b2], i) => { const k = i - K; const f = k === 1 ? 1 : k === 0 ? 0 : Math.exp(-0.42 * Math.abs(k - 1)); return [a * f, b2 * f]; });
  const n = 4, top = y0 + unit * 0.6, bottom = bandY - unit * 1.8, mR = unit * 2.55, ballR = unit * 3.1;
  const ys = Array.from({ length: n }, (_, i) => top + mR + i * (bottom - top - 2 * ballR - mR * 2 - unit * 0.6) / (n - 1) * 1.0);
  const xs = [(x0 + x1) / 2 - unit * 1.4, (x0 + x1) / 2 + unit * 1.4, (x0 + x1) / 2 - unit * 1.4, (x0 + x1) / 2 + unit * 1.4];
  let cf = coef;
  for (let i = 0; i < n; i++) {
    const cx = xs[i], cy = ys[i], med = circle(cx, cy, mR, 44), inner = circle(cx, cy, mR * 0.84, 44);
    glass(g, [med, inner], C.gold, r, { mattW: 6 }); pieces.push(med);
    glass(g, inner, shift(C.violet, 0, 6, -4 + i * 3), r, { mattW: mR * 0.5, matt: 0.4 }); pieces.push(inner);
    // the loop, as a line of silver stain and paint
    const L = loopOf(cf, cx, cy, mR * 0.66);
    g.save(); path(g, [inner]); g.clip(); g.lineJoin = 'round';
    g.strokeStyle = 'rgba(30,14,4,.7)'; g.lineWidth = unit * 0.42; path(g, [L]); g.stroke();
    g.strokeStyle = 'rgba(255,214,110,.95)'; g.lineWidth = unit * 0.2; path(g, [L]); g.stroke();
    g.restore();
    // and to the next: a little ribbon of ruby glass, curling round
    if (i < n - 1) {
      const nx = xs[i + 1], ny = ys[i + 1], dx = nx - cx, dy = ny - cy, d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d;
      const a = [cx + ux * mR * 1.02, cy + uy * mR * 1.02], z = [nx - ux * mR * 1.02, ny - uy * mR * 1.02], w = unit * 0.2;
      const mid = [(a[0] + z[0]) / 2 + (i % 2 ? -1 : 1) * unit * 0.6, (a[1] + z[1]) / 2];
      const rib = [[a[0] - uy * w, a[1] + ux * w], [mid[0] - uy * w, mid[1] + ux * w], [z[0], z[1]], [mid[0] + uy * w, mid[1] - ux * w], [a[0] + uy * w, a[1] - ux * w]];
      glass(g, rib, C.ruby, r, { mattW: 3 }); pieces.push(rib);
    }
    cf = T(cf);
  }
  yield;
  // the last: the form it settles into, a ball, held in a child's hand
  {
    const cx = (x0 + x1) / 2, cy = bottom - ballR * 1.05;
    const med = circle(cx, cy, ballR + unit * 0.7, 56), inner = circle(cx, cy, ballR + unit * 0.48, 56);
    glass(g, [med, inner], C.gold, r, { mattW: 6 }); pieces.push(med);
    glass(g, inner, shift(C.ice, 0, 10, -8), r, { mattW: 14 }); pieces.push(inner);
    const br = ballR * 0.6, bx = cx + unit * 0.1, by = cy - ballR * 0.18, ball = circle(bx, by, br, 40);
    glass(g, ball, [354, 80, 40], r, { matt: 0.55, mattW: br * 0.9 }); pieces.push(ball);
    g.fillStyle = 'rgba(255,240,220,.55)'; g.beginPath(); g.ellipse(bx - br * 0.35, by - br * 0.38, br * 0.22, br * 0.14, -0.6, 0, TAU); g.fill();
    // the ball's loop, as it was in the others, now a perfect circle round its middle
    g.strokeStyle = 'rgba(255,214,110,.9)'; g.lineWidth = unit * 0.18; g.beginPath(); g.ellipse(bx, by, br * 0.98, br * 0.3, -0.12, 0, Math.PI); g.stroke();
    // the hand: palm under the ball, four fingers curled up its far side, the thumb on the near
    const s = ballR / 3.1;
    const palm = [[cx - 3.4 * s, cy + 1.3 * s], [cx - 2.4 * s, cy + 2.4 * s], [cx - 0.6 * s, cy + 2.9 * s], [cx + 1.6 * s, cy + 2.55 * s], [cx + 2.9 * s, cy + 1.4 * s], [cx + 2.2 * s, cy + 0.9 * s], [cx + 0.2 * s, cy + 1.62 * s], [cx - 1.8 * s, cy + 1.25 * s], [cx - 3.0 * s, cy + 0.8 * s]];
    glass(g, palm, C.flesh, r, { mattW: 9, matt: 0.3 }); pieces.push(palm);
    const fingers = [[2.25, 1.0, 2.95, 0.15, 0.36], [2.55, 0.15, 2.85, -0.75, 0.33], [2.55, -0.75, 2.45, -1.55, 0.3], [2.2, -1.55, 1.75, -2.1, 0.26]];
    for (const [ax, ay, bx2, by2, w] of fingers) {
      const A = [cx + ax * s, cy + ay * s], Bp = [cx + bx2 * s, cy + by2 * s], d = Math.hypot(Bp[0] - A[0], Bp[1] - A[1]), nx = -(Bp[1] - A[1]) / d * w * s * 1.4, ny = (Bp[0] - A[0]) / d * w * s * 1.4;
      const f = [[A[0] - nx * 0.2, A[1] - ny * 0.2], [A[0] + nx, A[1] + ny], [Bp[0] + nx * 0.8, Bp[1] + ny * 0.8], [Bp[0] + (Bp[0] - A[0]) / d * w * s, Bp[1] + (Bp[1] - A[1]) / d * w * s], [Bp[0] - nx * 0.3, Bp[1] - ny * 0.3]];
      glass(g, f, shift(C.flesh, 0, 0, -3), r, { mattW: 5, matt: 0.3 }); pieces.push(f);
      g.fillStyle = 'rgba(255,235,225,.5)'; g.beginPath(); g.ellipse(Bp[0] + nx * 0.2, Bp[1] + ny * 0.2, w * s * 0.35, w * s * 0.22, Math.atan2(Bp[1] - A[1], Bp[0] - A[0]), 0, TAU); g.fill();
    }
    const thumb = [[cx - 2.9 * s, cy + 0.9 * s], [cx - 2.6 * s, cy - 0.2 * s], [cx - 2.0 * s, cy - 0.9 * s], [cx - 1.45 * s, cy - 0.75 * s], [cx - 1.7 * s, cy + 0.1 * s], [cx - 2.0 * s, cy + 1.1 * s]];
    glass(g, thumb, shift(C.flesh, 0, 0, 2), r, { mattW: 5, matt: 0.3 }); pieces.push(thumb);
    g.strokeStyle = paint(0.45); g.lineWidth = 1.2;
    for (const k of [0.4, 0.8]) { g.beginPath(); g.moveTo(cx - 2.4 * s, cy + (1.6 + k) * s); g.quadraticCurveTo(cx - 0.4 * s, cy + (2.0 + k * 0.6) * s, cx + 1.8 * s, cy + (1.5 + k * 0.5) * s); g.stroke(); }
  }
  yield;
  pieces.push(...banderole(g, x0 + unit * 0.6, x1 - unit * 0.6, bandY, ins.h, ins.lines, r, ins.o));
  leads(g, pieces, unit * 0.22, r);
  return pieces;
}

// ---- W6: the neuron, after Cajal ------------------------------------------------------------------------
function* neuron(g, W, H, seed = 66) {
  const r = rng(seed), unit = W / 17, b = border(g, rect(0, 0, W, H), r, unit, { band: [24, 70, 26], jewelA: C.blue, jewelB: C.ruby, inner: C.straw });
  const [x0, y0] = b.inner[0], [x1, y1] = b.inner[2], pieces = [...b.pieces];
  const ins = inscription(unit, ['las misteriosas', 'mariposas del alma'], 'S. Ramón y Cajal · 1917'), bandY = y1 - unit * 0.45 - ins.h / 2, foot = bandY - ins.h / 2 - unit * 0.3;
  const cx = (x0 + x1) / 2 - unit * 0.3, cy = y0 + (foot - y0) * 0.6;
  // the paper of his drawings: pale amber glass, paler round the cell
  const bg = voronoi(sitesIn(() => true, x0, y0, x1, y1, 34, r, unit * 3.1), rect(x0, y0, x1, y1));
  for (const p of bg) { const [x, y] = centroid(p), d = Math.hypot(x - cx, (y - cy) * 0.6) / (x1 - x0); glass(g, p, lerpC([46, 62, 80], [36, 78, 56], smooth(0.1, 0.9, d)), r, { mattW: 12, matt: 0.26 }); pieces.push(p); }
  leads(g, pieces, unit * 0.22, r); pieces.length = 0;
  yield;
  // the cell, in black paint: a tapering line that wanders, forks, and carries spines
  const drawBranch = (x, y, a, len, w, depth, o) => {
    let px = x, py = y, dir = a; const steps = Math.max(4, Math.round(len / 5));
    for (let i = 0; i < steps; i++) {
      dir += (r() - 0.5) * 0.28 + (o.pull ?? 0) * Math.sin((o.toward ?? a) - dir) * 0.1;
      const nx = px + Math.cos(dir) * len / steps, ny = py + Math.sin(dir) * len / steps, ww = w * (1 - i / steps * 0.55);
      g.strokeStyle = paint(0.9); g.lineWidth = Math.max(0.6, ww); g.lineCap = 'round'; g.beginPath(); g.moveTo(px, py); g.lineTo(nx, ny); g.stroke();
      if (o.spines && ww < 3.2) for (let k = 0; k < 2; k++) if (r() < 0.55) { const sa = dir + (r() < 0.5 ? 1 : -1) * (1.1 + r() * 0.6), sl = 2 + r() * 3; g.lineWidth = 0.7; g.beginPath(); g.moveTo(nx, ny); g.lineTo(nx + Math.cos(sa) * sl, ny + Math.sin(sa) * sl); g.stroke(); g.fillStyle = paint(0.85); g.beginPath(); g.arc(nx + Math.cos(sa) * sl, ny + Math.sin(sa) * sl, 0.9, 0, TAU); g.fill(); }
      px = nx; py = ny;
      if (depth > 0 && i > 1 && r() < (o.fork ?? 0.12)) { const s = r() < 0.5 ? 1 : -1; drawBranch(px, py, dir + s * (0.35 + r() * 0.5), len * (0.35 + r() * 0.35) * (1 - i / steps), ww * 0.7, depth - 1, { ...o, toward: dir + s * 0.6 }); }
    }
    if (depth > 0 && (o.split ?? true)) { drawBranch(px, py, dir - 0.3 - r() * 0.3, len * 0.42, w * 0.45, depth - 1, o); drawBranch(px, py, dir + 0.3 + r() * 0.3, len * 0.42, w * 0.45, depth - 1, o); }
  };
  // the apical dendrite, up toward the surface, branching into a tuft
  drawBranch(cx, cy - unit * 0.6, -Math.PI / 2 + 0.05, (cy - y0) * 0.62, unit * 0.36, 3, { spines: true, fork: 0.1, pull: 0.6, toward: -Math.PI / 2 });
  // oblique and basal dendrites
  for (const a of [-2.5, -0.65, 2.75, 0.4, 1.9, 1.1, 2.3]) drawBranch(cx + Math.cos(a) * unit * 0.5, cy + Math.sin(a) * unit * 0.5, a + (r() - 0.5) * 0.3, unit * (2.6 + r() * 2.2), unit * 0.22, 2, { spines: true, fork: 0.14 });
  yield;
  // the axon, fine and smooth, straight down with collaterals at right angles
  {
    let px = cx + unit * 0.05, py = cy + unit * 0.7, d = Math.PI / 2;
    g.strokeStyle = paint(0.85);
    for (let i = 0; i < 60 && py < foot - unit * 0.6; i++) { d += (r() - 0.5) * 0.1 + (Math.PI / 2 - d) * 0.1; const nx = px + Math.cos(d) * 6, ny = py + Math.sin(d) * 6; g.lineWidth = 1.4; g.beginPath(); g.moveTo(px, py); g.lineTo(nx, ny); g.stroke(); px = nx; py = ny; if (i % 13 === 6) drawBranch(px, py, d + (i % 26 < 13 ? -1.35 : 1.35), unit * 2.2, 1.2, 1, { fork: 0.05, split: false }); }
  }
  // a small star of a cell beside it (an astrocyte), and the edge of a second neuron below
  { const ax = x0 + unit * 2.3, ay = y0 + (y1 - y0) * 0.3; g.fillStyle = paint(0.85); g.beginPath(); g.arc(ax, ay, unit * 0.32, 0, TAU); g.fill(); for (let k = 0; k < 14; k++) drawBranch(ax, ay, (k / 14) * TAU + r() * 0.3, unit * (1 + r() * 1.1), 1.6, 1, { fork: 0.25, split: false }); }
  { const bx = x1 - unit * 2.2, by = foot - unit * 2.6; g.fillStyle = paint(0.88); g.beginPath(); g.ellipse(bx, by, unit * 0.45, unit * 0.62, 0.3, 0, TAU); g.fill(); drawBranch(bx, by - unit * 0.5, -Math.PI / 2 - 0.25, unit * 6, unit * 0.18, 2, { spines: true }); for (const a of [2.2, 0.9, 1.6]) drawBranch(bx, by, a, unit * 2, unit * 0.14, 1, { spines: true }); }
  yield;
  // the body: a pyramid of darker glass, leaded in, with its nucleus painted
  const soma = [[cx, cy - unit * 1.25], [cx + unit * 0.72, cy + unit * 0.55], [cx + unit * 0.2, cy + unit * 0.8], [cx - unit * 0.55, cy + unit * 0.7], [cx - unit * 0.8, cy + unit * 0.45]];
  glass(g, soma, [28, 70, 22], r, { mattW: 10, matt: 0.5 }); pieces.push(soma);
  g.fillStyle = 'rgba(255,236,190,.42)'; g.beginPath(); g.ellipse(cx - unit * 0.05, cy + unit * 0.12, unit * 0.3, unit * 0.24, 0.2, 0, TAU); g.fill();
  g.fillStyle = paint(0.75); g.beginPath(); g.arc(cx - unit * 0.02, cy + unit * 0.12, unit * 0.08, 0, TAU); g.fill();
  // his words, from his memoirs (Recuerdos de mi vida, 1917), for the cells of the cortex
  pieces.push(...banderole(g, x0 + unit * 0.6, x1 - unit * 0.6, bandY, ins.h, ins.lines, r, ins.o));
  leads(g, pieces, unit * 0.22, r);
  return pieces;
}

// ---- W7: ingressing minds --------------------------------------------------------------------------
// The window in the west gable: five feet wide, ten tall, its head following the roof. Above, a
// field of pure forms in pale and gold on deep blue; from four of them light comes down through
// the glass into bodies: a flatworm, a cell, a frog, and a pair of gears.
export const W7_SHOULDER = 0.68;          // the head's slope starts at this fraction of the height, from the top
export function w7Outline(W, H) { const s = H * (1 - W7_SHOULDER); return [[W / 2, 0], [W, s], [W, H], [0, H], [0, s]]; }
function* ingression(g, W, H, seed = 77) {
  const r = rng(seed), unit = W / 15, LW = unit * 0.13, out = w7Outline(W, H), b = border(g, out, r, unit, { band: C.deep, jewelA: C.gold, jewelB: C.ruby });
  const inner = b.inner, x0 = inner[4][0], x1 = inner[2][0], y1 = inner[2][1], X = f => x0 + (x1 - x0) * f;
  leads(g, b.pieces, LW * 1.3, r);
  const yBand = H * 0.455, yFoot = y1 - unit * 0.95;
  // four forms, and the bodies they come down into
  const forms = [
    { kind: 'spiral', x: X(0.2), y: H * 0.335, s: unit * 1.0, glow: [44, 88, 66], to: [X(0.25), H * 0.835] },
    { kind: 'pair', x: X(0.38), y: H * 0.215, s: unit * 0.95, glow: [52, 60, 84], to: [X(0.3), H * 0.6] },
    { kind: 'circle', x: X(0.62), y: H * 0.215, s: unit * 1.0, glow: [52, 60, 84], to: [X(0.71), H * 0.6] },
    { kind: 'star', x: X(0.8), y: H * 0.335, s: unit * 1.0, glow: [44, 88, 66], to: [X(0.74), H * 0.835] },
  ];
  const along = (f, t) => [f.x + (f.to[0] - f.x) * t + Math.sin(t * Math.PI) * unit * 0.5 * (f.x < W / 2 ? -1 : 1), f.y + (f.to[1] - f.y) * t];
  // the ground: one sheet of irregular pieces, deep blue above and water-green below, and the
  // light coming down picked out in pale gold pieces along its way
  const pts = sitesIn((x, y) => inPolyPt(x, y, inner) && y < yFoot, x0, 0, x1, yFoot, 300, r, (x, y) => unit * (y < yBand ? 0.85 : 1.05));
  const cells = voronoi(pts, clipPoly(rect(x0, 0, x1, yFoot), inner)), bg = [];
  for (const p of cells) {
    const [x, y] = centroid(p), t = smooth(yBand - unit * 2, yBand + unit * 2, y);
    let col = t < 1 ? lerpC(lerpC(shift(C.azure, 0, 0, 4), C.deep, smooth(H * 0.05, H * 0.42, y)), shift(C.teal, 6, 0, 0), t) : C.teal;
    if (y > yBand) col = lerpC(shift(C.teal, 6, 0, 0), shift(C.green, -8, -4, -4), smooth(yBand, y1, y));
    let glow = 0, gc = null;
    for (const f of forms) {
      let d = 1e9, tt = 0; for (let k = 0; k <= 24; k++) { const [px, py] = along(f, k / 24), dd = Math.hypot(x - px, y - py); if (dd < d) { d = dd; tt = k / 24; } }
      const w = unit * (1.15 - 0.55 * tt), k = smooth(w, w * 0.2, d) * (1 - 0.3 * tt);
      if (k > glow) { glow = k; gc = f.glow; }
    }
    if (gc) col = shift(col, 0, -8 * glow, 12 * glow);
    glass(g, p, col, r, { mattW: 7, matt: 0.3 }); bg.push(p);
  }
  yield;
  // painted on the field: smaller pure forms in gold stain and white, and points of light
  const minor = [];
  for (let k = 0; k < 40; k++) { const x = X(0.08 + r() * 0.84), y = H * 0.06 + r() * (yBand - unit * 2.2 - H * 0.06); if (!inPolyPt(x, y, inset(inner, unit * 0.5)) || forms.some(f => Math.hypot(x - f.x, y - f.y) < unit * 1.9) || minor.some(m => Math.hypot(x - m[0], y - m[1]) < unit * 1.15)) continue; minor.push([x, y, k]); }
  for (const [x, y, k] of minor) {
    const s = unit * (0.26 + r() * 0.22), kind = k % 7;
    g.strokeStyle = k % 3 ? 'rgba(255,232,150,.92)' : 'rgba(240,248,255,.9)'; g.lineWidth = 1.5; g.beginPath();
    if (kind < 4) { const n = [3, 4, 5, 6][kind], a0 = r() * TAU; for (let i = 0; i <= n; i++) { const a = a0 + (i / n) * TAU; i ? g.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s) : g.moveTo(x + Math.cos(a) * s, y + Math.sin(a) * s); } }
    else if (kind === 4) { for (let i = 0; i <= 40; i++) { const t = (i / 40) * TAU, d = 1 + Math.sin(t) ** 2; const px = x + s * 1.3 * Math.cos(t) / d, py = y + s * 1.3 * Math.sin(t) * Math.cos(t) / d; i ? g.lineTo(px, py) : g.moveTo(px, py); } }
    else if (kind === 5) { const d = s * 0.45; g.rect(x - s * 0.6, y - s * 0.6 + d * 0.3, s, s); g.rect(x - s * 0.6 + d, y - s * 0.6 - d * 0.4, s, s); for (const [ax, ay] of [[0, 0], [s, 0], [0, s], [s, s]]) { g.moveTo(x - s * 0.6 + ax, y - s * 0.6 + d * 0.3 + ay); g.lineTo(x - s * 0.6 + d + ax, y - s * 0.6 - d * 0.4 + ay); } }
    else { for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + (i / 10) * TAU, rr = i % 2 ? s * 0.4 : s; i ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } }
    g.stroke();
  }
  for (let k = 0; k < 140; k++) { const x = X(r()), y = H * 0.03 + r() * (yBand - H * 0.05); if (!inPolyPt(x, y, inner)) continue; g.fillStyle = `rgba(255,250,225,${0.35 + r() * 0.5})`; g.beginPath(); g.arc(x, y, 0.6 + r() * 1.1, 0, TAU); g.fill(); }
  // haloes round the four forms
  for (const f of forms) for (let k = 1; k <= 3; k++) { g.strokeStyle = `rgba(255,240,190,${0.45 - k * 0.1})`; g.lineWidth = 1.2; g.beginPath(); g.arc(f.x, f.y, f.s * (1.15 + k * 0.22), 0, TAU); g.stroke(); }
  // water and weed painted in the lower part
  g.strokeStyle = 'rgba(210,255,240,.22)'; g.lineWidth = 1.2;
  for (let k = 0; k < 26; k++) { const x = X(r()), y = yBand + unit * 2 + r() * (yFoot - yBand - unit * 4), l = unit * (0.6 + r() * 1.2); g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + l / 2, y - unit * 0.18, x + l, y); g.stroke(); }
  g.strokeStyle = 'rgba(10,40,20,.45)'; g.lineWidth = 2;
  for (let k = 0; k < 22; k++) { const x = X(r()), y = yFoot - r() * unit * 0.6, h = unit * (1 + r() * 2.2); g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + unit * 0.3, y - h * 0.3, x - unit * 0.3, y - h * 0.6, x + (r() - 0.5) * unit * 0.6, y - h); g.stroke(); }
  leads(g, bg, LW, r);
  yield;
  const pieces = [];
  // the descents: a long tapering beam of pale gold from each form to its body, fading as it goes
  for (const f of forms) {
    const n = 26, L = [], R = [], tEnd = 1 - unit * 1.25 / Math.hypot(f.to[0] - f.x, f.to[1] - f.y);
    for (let i = 0; i <= n; i++) {
      const t = i / n * tEnd, [px, py] = along(f, t), [qx, qy] = along(f, Math.min(1, t + 0.01)), d = Math.hypot(qx - px, qy - py) || 1, w = unit * (0.62 - 0.36 * t);
      L.push([px - (qy - py) / d * w, py + (qx - px) / d * w]); R.push([px + (qy - py) / d * w, py - (qx - px) / d * w]);
    }
    const beam = [...L, ...R.reverse()];
    glass(g, beam, f.glow, r, { mattW: 5, matt: 0.15, hj: 3, lj: 3 });
    g.save(); path(g, [beam]); g.clip();
    const gr = g.createLinearGradient(0, f.y, 0, f.to[1]); gr.addColorStop(0, 'rgba(255,250,220,.35)'); gr.addColorStop(0.5, 'rgba(255,240,190,0)'); gr.addColorStop(1, 'rgba(20,90,80,.45)');
    g.fillStyle = gr; g.fillRect(0, Math.min(f.y, f.to[1]) - unit * 2, W, Math.abs(f.to[1] - f.y) + unit * 4);
    g.strokeStyle = 'rgba(255,255,240,.3)'; g.lineWidth = 1; for (let k = -2; k <= 2; k++) { g.beginPath(); for (let i = 0; i <= n; i++) { const [px, py] = along(f, i / n * tEnd); i ? g.lineTo(px + k * unit * 0.12 * (1 - i / n * 0.5), py) : g.moveTo(px + k * unit * 0.12, py); } g.stroke(); }
    g.restore();
    pieces.push(beam);
  }
  leads(g, pieces, LW, r); pieces.length = 0;
  // the forms, cut in luminous glass
  for (const f of forms) {
    if (f.kind === 'circle') { const c = circle(f.x, f.y, f.s, 40), c2 = circle(f.x, f.y, f.s * 0.56, 40); glass(g, [c, c2], C.white, r, { mattW: 6 }); glass(g, c2, C.gold, r, { mattW: 6 }); pieces.push(c, c2); }
    if (f.kind === 'star') { const p = []; for (let i = 0; i < 14; i++) { const a = -Math.PI / 2 + (i / 14) * TAU, rr = i % 2 ? f.s * 0.5 : f.s; p.push([f.x + Math.cos(a) * rr, f.y + Math.sin(a) * rr]); } glass(g, p, C.gold, r, { mattW: 6 }); pieces.push(p); const c = circle(f.x, f.y, f.s * 0.3, 20); glass(g, c, C.ruby, r, { mattW: 4 }); pieces.push(c); }
    if (f.kind === 'pair') { const p = [[f.x, f.y - f.s * 1.1], [f.x + f.s * 0.95, f.y + f.s * 0.62], [f.x - f.s * 0.95, f.y + f.s * 0.62]]; glass(g, p, C.white, r, { mattW: 6 }); pieces.push(p); for (const s2 of [-1, 1]) { const e = circle(f.x + s2 * f.s * 0.28, f.y + f.s * 0.12, f.s * 0.16, 16); glass(g, e, C.blue, r, { mattW: 3 }); pieces.push(e); } }
    if (f.kind === 'spiral') { const c = circle(f.x, f.y, f.s, 40); glass(g, c, C.gold, r, { mattW: 6 }); pieces.push(c); g.strokeStyle = paint(0.8); g.lineWidth = 2; g.beginPath(); for (let i = 0; i <= 160; i++) { const t = i / 160 * 3.4 * TAU, rr = f.s * 0.05 * Math.exp(0.15 * t); if (rr > f.s * 0.9) break; const px = f.x + Math.cos(t) * rr, py = f.y + Math.sin(t) * rr; i ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke(); }
  }
  yield;
  // a planarian: an arrow-headed worm, its two eyespots looking inward
  {
    const [wx, wy] = forms[1].to, L = unit * 4.4, Wd = unit * 1.15, a = -0.22, P = (u, v) => [wx + Math.cos(a) * u - Math.sin(a) * v, wy + Math.sin(a) * u + Math.cos(a) * v];
    const half = t => Wd * (t < 0.7 ? 0.32 + 0.18 * Math.sin(Math.PI * t / 0.7) : t < 0.8 ? 0.42 - (t - 0.7) * 1.2 : t < 0.88 ? 0.3 + (t - 0.8) * 3.0 : 0.54 - (t - 0.88) * 4.4);
    const side = s2 => Array.from({ length: 31 }, (_, i) => { const t = i / 30; return P(-L / 2 + L * t, s2 * Math.max(0.02 * Wd, half(t)) + Math.sin(t * 6) * unit * 0.07); });
    const outline = [...side(-1), ...side(1).reverse()];
    glass(g, outline, [26, 58, 48], r, { mattW: 12, matt: 0.42 }); pieces.push(outline);
    g.strokeStyle = 'rgba(60,28,8,.45)'; g.lineWidth = unit * 0.14; g.beginPath(); for (let i = 0; i <= 14; i++) { const [px, py] = P(-L / 2 + L * 0.8 * i / 14, Math.sin(i * 0.43) * unit * 0.05); i ? g.lineTo(px, py) : g.moveTo(px, py); } g.stroke();
    g.fillStyle = 'rgba(255,230,190,.35)'; for (let i = 0; i < 18; i++) { const [px, py] = P(-L / 2 + L * 0.8 * r(), (r() - 0.5) * Wd * 0.4); g.beginPath(); g.arc(px, py, 1 + r() * 1.4, 0, TAU); g.fill(); }
    for (const s2 of [-1, 1]) { const [ex, ey] = P(L * 0.36, s2 * Wd * 0.13); g.fillStyle = 'rgba(255,250,235,.95)'; g.beginPath(); g.ellipse(ex, ey, unit * 0.15, unit * 0.11, a, 0, TAU); g.fill(); const [qx, qy] = P(L * 0.36, s2 * Wd * 0.13 - s2 * unit * 0.05); g.fillStyle = paint(0.95); g.beginPath(); g.arc(qx, qy, unit * 0.065, 0, TAU); g.fill(); }
  }
  // a cell: membrane, the cytoplasm, the nucleus and its nucleolus, mitochondria
  {
    const [cx, cy] = forms[2].to, R = unit * 1.75, mem = ellipse(cx, cy, R, R * 0.9, 0.3, 44), cyto = ellipse(cx, cy, R * 0.87, R * 0.78, 0.3, 44), nuc = ellipse(cx + R * 0.15, cy - R * 0.08, R * 0.38, R * 0.33, 0.6, 30);
    glass(g, [mem, cyto], C.emerald, r, { mattW: 5 }); glass(g, [cyto, nuc], [86, 50, 70], r, { mattW: 16, matt: 0.25 }); glass(g, nuc, C.violet, r, { mattW: 8 }); pieces.push(mem, cyto, nuc);
    g.fillStyle = 'rgba(255,220,240,.6)'; g.beginPath(); g.arc(cx + R * 0.2, cy - R * 0.12, R * 0.09, 0, TAU); g.fill();
    for (let k = 0; k < 8; k++) { const a = r() * TAU, d = R * (0.5 + r() * 0.22), mx = cx + Math.cos(a) * d, my = cy + Math.sin(a) * d * 0.85; g.fillStyle = 'rgba(205,110,20,.8)'; g.beginPath(); g.ellipse(mx, my, R * 0.11, R * 0.05, a + 1.2, 0, TAU); g.fill(); g.strokeStyle = paint(0.5); g.lineWidth = 0.8; g.stroke(); }
    g.strokeStyle = 'rgba(30,60,20,.45)'; g.lineWidth = 1; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(cx + R * 0.15, cy - R * 0.08, R * (0.48 + k * 0.08), 2.2, 4.0); g.stroke(); }
  }
  yield;
  // a frog, sitting side-on on a lily pad, with its gold eye
  {
    const [fx, fy] = forms[0].to, s = unit * 1.25;
    const pad = ellipse(fx + 0.1 * s, fy + 1.1 * s, 2.0 * s, 0.34 * s, 0, 30);
    glass(g, pad, C.leaf, r, { mattW: 8 }); pieces.push(pad);
    const body = [[-1.35, 0.55], [-1.3, 0.05], [-0.9, -0.42], [-0.2, -0.62], [0.35, -0.78], [0.62, -1.05], [0.95, -1.02], [1.15, -0.72], [1.55, -0.45], [1.62, -0.25], [1.25, 0.0], [0.7, 0.25], [0.3, 0.72], [-0.6, 0.85]].map(([u, v]) => [fx + u * s, fy + v * s]);
    const thigh = [[-1.45, 0.62], [-1.05, -0.05], [-0.25, 0.1], [-0.05, 0.55], [-0.5, 0.86]].map(([u, v]) => [fx + u * s, fy + v * s]);
    const foot = [[-0.55, 0.82], [-0.05, 0.55], [0.6, 0.88], [0.75, 1.0], [-0.4, 1.0]].map(([u, v]) => [fx + u * s, fy + v * s]);
    const arm = [[0.55, 0.25], [0.85, 0.2], [1.0, 0.95], [1.25, 1.02], [0.7, 1.02]].map(([u, v]) => [fx + u * s, fy + v * s]);
    glass(g, body, [104, 56, 40], r, { mattW: 12, matt: 0.4 }); glass(g, thigh, [100, 52, 34], r, { mattW: 9, matt: 0.42 }); glass(g, foot, [96, 50, 30], r, { mattW: 6 }); glass(g, arm, [102, 50, 36], r, { mattW: 6 });
    pieces.push(body, thigh, foot, arm);
    const eye = circle(fx + 0.8 * s, fy - 0.78 * s, 0.22 * s, 18); glass(g, eye, C.gold, r, { mattW: 3 }); pieces.push(eye);
    g.fillStyle = paint(0.95); g.beginPath(); g.ellipse(fx + 0.82 * s, fy - 0.78 * s, 0.12 * s, 0.06 * s, 0, 0, TAU); g.fill();
    g.strokeStyle = paint(0.55); g.lineWidth = 1.3; g.beginPath(); g.moveTo(fx + 1.58 * s, fy - 0.3 * s); g.quadraticCurveTo(fx + 1.15 * s, fy - 0.2 * s, fx + 0.7 * s, fy - 0.42 * s); g.stroke();
    g.beginPath(); g.moveTo(fx - 1.0 * s, fy - 0.3 * s); g.quadraticCurveTo(fx - 0.2 * s, fy - 0.55 * s, fx + 0.6 * s, fy - 0.62 * s); g.stroke();
    for (let k = 0; k < 10; k++) { g.fillStyle = 'rgba(30,40,10,.4)'; g.beginPath(); g.arc(fx + (r() - 0.7) * 1.6 * s, fy + (r() - 0.65) * 0.9 * s, 0.06 * s + r() * 0.06 * s, 0, TAU); g.fill(); }
  }
  // a machine: two gears, one turning the other
  {
    const [mx, my] = forms[3].to, gear = (x, y, R, n, ph) => { const p = []; for (let i = 0; i < n * 4; i++) { const a = ph + (i / (n * 4)) * TAU, rr = (i % 4 < 2) ? R : R * 0.8; p.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]); } return p; };
    const R1 = unit * 1.35, R2 = unit * 0.85, ax = mx - unit * 0.45, ay = my, bx = ax + (R1 + R2) * 0.92 * Math.cos(-0.9), by = ay + (R1 + R2) * 0.92 * Math.sin(-0.9);
    const ga = gear(ax, ay, R1, 12, 0), gb = gear(bx, by, R2, 8, 0.25), ha = circle(ax, ay, R1 * 0.26, 20), hb = circle(bx, by, R2 * 0.3, 16);
    glass(g, [ga, ha], C.amber, r, { mattW: 9, matt: 0.4 }); glass(g, ha, C.blue, r, { mattW: 4 });
    glass(g, [gb, hb], [205, 18, 62], r, { mattW: 7, matt: 0.4 }); glass(g, hb, C.ruby, r, { mattW: 4 }); pieces.push(ga, ha, gb, hb);
    g.strokeStyle = paint(0.55); g.lineWidth = 1.4; for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + 0.2; g.beginPath(); g.moveTo(ax + Math.cos(a) * R1 * 0.3, ay + Math.sin(a) * R1 * 0.3); g.lineTo(ax + Math.cos(a) * R1 * 0.68, ay + Math.sin(a) * R1 * 0.68); g.stroke(); }
    g.beginPath(); g.arc(ax, ay, R1 * 0.7, 0, TAU); g.stroke();
  }
  leads(g, pieces, LW, r); pieces.length = 0;
  yield;
  // the banderole across the middle, and the credit at the foot
  pieces.push(...banderole(g, X(0.04), X(0.96), yBand, unit * 1.35, [
    { text: 'INGRESSING  MINDS', size: unit * 0.74, track: 0.24, lead: 1.0 },
  ], r, { wave: unit * 0.14 }));
  const foot = clipPoly(rect(x0, yFoot, x1, y1 + 2), inner);
  glass(g, foot, C.straw, r, { mattW: 6, matt: 0.15 }); pieces.push(foot);
  g.fillStyle = paint(0.85); setLine(g, 'after M. Levin · the word is Whitehead’s', (x0 + x1) / 2, (yFoot + y1) / 2 + unit * 0.14, unit * 0.36, { italic: true, track: 0.06 });
  leads(g, pieces, LW, r);
  return pieces;
}

// ---- W8: a strange loop -------------------------------------------------------------------------
// After Hofstadter, and Gödel whose numbering it is. A ring of twelve steps, each with its riser on
// the same side, so the stair climbs all the way round and arrives where it began. On the treads, one
// prime power to a step, is Gödel's number for a sentence of arithmetic, (∃x)(x = s0 + 0), coded as in
// Nagel and Newman's Gödel's Proof: ( 8, ∃ 4, x 13, ) 9, = 5, s 7, 0 6, + 11. Inside the ring the same
// ring again, smaller, regarding itself; at the heart a roundel of clear glass, with the sky in it (the
// texture is cut away there and chapel.js sets real glass behind it). Below, on a tablet, the sentence
// that speaks of itself: G ↔ ¬Prov(⌜G⌝), the signs drawn by hand, as a glass painter would.
export const LOOP_EYE = { u: 0.5, v: 0.31, r: 0.072 };      // the clear roundel: centre (fractions of the width and height), radius (of the width)
const LOOP_HUES = [46, 36, 24, 4, 340, 300, 268, 228, 206, 184, 158, 100];
const GODEL = [[2, 8], [3, 4], [5, 13], [7, 9], [11, 8], [13, 13], [17, 5], [19, 7], [23, 6], [29, 11], [31, 6], [37, 9]];
function* strangeLoop(g, W, H, seed = 88) {
  const r = rng(seed), unit = W / 17, b = border(g, rect(0, 0, W, H), r, unit, { band: [262, 46, 30], jewelA: C.gold, jewelB: C.teal });
  const [x0, y0] = b.inner[0], [x1, y1] = b.inner[2], pieces = [...b.pieces];
  const ins = inscription(unit, null, 'D. R. Hofstadter · 2007', ['I AM A', 'STRANGE LOOP']), bandY = y1 - unit * 0.45 - ins.h / 2;
  const cx = W * LOOP_EYE.u, cy = H * LOOP_EYE.v, eye = W * LOOP_EYE.r;
  // the ground: night above, deep violet round the ring, a dawn rose, and the sea's horizon below it
  // (this window looks south, out over the island's edge)
  const hy = bandY - ins.h / 2 - unit * 3.6;
  const bg = voronoi(sitesIn((x, y) => y < hy, x0, y0, x1, hy, 40, r, unit * 2.9), rect(x0, y0, x1, hy));
  for (const p of bg) {
    const [, y] = centroid(p), t = smooth(y0, bandY, y + (r() - 0.5) * unit * 2);
    glass(g, p, t < 0.55 ? lerpC(C.deep, shift(C.violet, -10, 6, 2), t / 0.55) : lerpC(shift(C.violet, -10, 6, 2), shift(C.rose, 4, -6, -16), (t - 0.55) / 0.45), r, { mattW: 12 });
    pieces.push(p);
  }
  // the sea, in long wavering strips, darker toward the foot
  for (let k = 0, ya = hy; k < 3; k++) {
    const yb = k === 2 ? y1 + 2 : hy + (bandY - hy) * (k + 1) * 0.36, wv = (y, ph) => { const p2 = []; for (let x = x0; x <= x1 + 0.1; x += (x1 - x0) / 10) p2.push([x, y + (k ? Math.sin(x * 0.05 + ph) * unit * 0.18 : 0)]); return p2; };
    const top2 = wv(ya, k), bot2 = wv(yb, k + 1).reverse(), strip = clipPoly([...top2, ...bot2], rect(x0, y0, x1, y1));
    glass(g, strip, lerpC(shift(C.azure, 0, -10, 6), C.deep, k / 2.4), r, { mattW: 9, streak: 2 }); pieces.push(strip);
    ya = yb;
  }
  // the light coming up behind the horizon, silver stain over the dawn
  { const gx = (x0 + x1) / 2 + unit * 2, gr = g.createRadialGradient(gx, hy, 0, gx, hy, unit * 6); gr.addColorStop(0, 'rgba(255,214,120,.75)'); gr.addColorStop(0.35, 'rgba(255,190,110,.35)'); gr.addColorStop(1, 'rgba(255,170,110,0)'); g.save(); path(g, [rect(x0, y0, x1, hy)]); g.clip(); g.fillStyle = gr; g.fillRect(x0, hy - unit * 6, x1 - x0, unit * 6); g.restore(); }
  // a few stars in the night, painted out of the matt
  for (let k = 0; k < 60; k++) { const x = x0 + r() * (x1 - x0), y = y0 + r() * (cy - y0) * 1.4; if (Math.hypot(x - cx, y - cy) < unit * 7) continue; g.fillStyle = `rgba(255,248,220,${0.3 + r() * 0.5})`; g.beginPath(); g.arc(x, y, 0.7 + r() * 1.4, 0, TAU); g.fill(); }
  leads(g, pieces, unit * 0.22, r); pieces.length = 0;
  yield;
  // a ring of steps: treads and risers as pieces of an annulus, the riser darker and on the same side
  // of every step, the tread shaded toward its foot, so each is a step up from the one before
  const wedge = (R0, R1, a0, a1, n = 8) => { const p = []; for (let k = 0; k <= n; k++) { const a = a0 + (a1 - a0) * k / n; p.push([cx + Math.cos(a) * R1, cy + Math.sin(a) * R1]); } for (let k = n; k >= 0; k--) { const a = a0 + (a1 - a0) * k / n; p.push([cx + Math.cos(a) * R0, cy + Math.sin(a) * R0]); } return p; };
  const stair = (R0, R1, turn, numerals) => {
    const N = 12, step = TAU / N, rise = step * 0.24;
    // the stringers, a fillet of gold glass inside and out
    for (const [ra, rb] of [[R1, R1 + unit * 0.42], [R0 - unit * 0.42, R0]]) { const ring = [circle(cx, cy, rb, 64), circle(cx, cy, ra, 64)]; glass(g, ring, C.gold, r, { matt: 0.3, mattW: 5 }); pieces.push(...ring); }
    for (let k = 0; k < N; k++) {
      const a0 = -Math.PI / 2 + turn + k * step, hue = LOOP_HUES[k];
      const riser = wedge(R0, R1, a0, a0 + rise, 3), tread = wedge(R0, R1, a0 + rise, a0 + step);
      glass(g, riser, [hue, 62, 20], r, { mattW: 8, matt: 0.5 }); pieces.push(riser);
      glass(g, tread, [hue, 66, 50], r, { mattW: (R1 - R0) * 0.3, matt: 0.28 }); pieces.push(tread);
      // the shadow each step casts on the tread below it, a wash of paint along its riser
      g.save(); path(g, [tread]); g.clip();
      const sa = a0 + rise, gr = g.createLinearGradient(cx + Math.cos(sa + 0.04) * (R0 + R1) / 2, cy + Math.sin(sa + 0.04) * (R0 + R1) / 2, cx + Math.cos(sa + step * 0.45) * (R0 + R1) / 2, cy + Math.sin(sa + step * 0.45) * (R0 + R1) / 2);
      gr.addColorStop(0, 'rgba(30,14,6,.55)'); gr.addColorStop(1, 'rgba(30,14,6,0)'); g.fillStyle = gr; path(g, [tread]); g.fill(); g.restore();
      // and its nosing, the edge of the step catching the light, on the far side of the tread
      g.save(); path(g, [tread]); g.clip(); g.strokeStyle = 'rgba(255,246,214,.5)'; g.lineWidth = (R1 - R0) * 0.07; g.beginPath(); const an = a0 + step - 0.012; g.moveTo(cx + Math.cos(an) * R0, cy + Math.sin(an) * R0); g.lineTo(cx + Math.cos(an) * R1, cy + Math.sin(an) * R1); g.stroke(); g.restore();
      if (numerals) {
        const [p, e] = GODEL[k], am = a0 + rise + (step - rise) * 0.5, rm = (R0 + R1) / 2, x = cx + Math.cos(am) * rm, y = cy + Math.sin(am) * rm, sz = (R1 - R0) * 0.42;
        g.fillStyle = paint(0.92); g.textBaseline = 'alphabetic'; g.textAlign = 'left';
        g.font = `${sz.toFixed(1)}px ${FONT}`; const wb = g.measureText(String(p)).width; g.font = `${(sz * 0.62).toFixed(1)}px ${FONT}`; const we = g.measureText(String(e)).width;
        const xl = x - (wb + we + sz * 0.04) / 2;
        g.font = `${sz.toFixed(1)}px ${FONT}`; g.fillText(String(p), xl, y + sz * 0.33);
        g.font = `${(sz * 0.62).toFixed(1)}px ${FONT}`; g.fillText(String(e), xl + wb + sz * 0.04, y - sz * 0.12);
      }
    }
  };
  const R1 = (x1 - x0) / 2 - unit * 0.75, R0 = R1 * 0.6;
  stair(R0, R1, 0, true);
  yield;
  // the ring again, inside itself, half a step turned
  const r1 = R0 - unit * 0.6, r0 = eye + unit * 0.65;
  stair(r0, r1, TAU / 24, false);
  // the clear roundel's fillet
  { const f = [circle(cx, cy, eye + unit * 0.4, 48), circle(cx, cy, eye, 48)]; glass(g, f, C.white, r, { matt: 0.2, mattW: 4 }); pieces.push(...f); }
  yield;
  // the tablet, and on it the sentence that speaks of itself
  {
    const tw = (x1 - x0) * 0.86, th = unit * 2.4, ty = cy + R1 + unit * 0.42 + (bandY - ins.h / 2 - (cy + R1 + unit * 0.42)) * 0.5, tx = (x0 + x1) / 2, c = unit * 0.55;
    const tab = [[tx - tw / 2 + c, ty - th / 2], [tx + tw / 2 - c, ty - th / 2], [tx + tw / 2, ty - th / 2 + c], [tx + tw / 2, ty + th / 2 - c], [tx + tw / 2 - c, ty + th / 2], [tx - tw / 2 + c, ty + th / 2], [tx - tw / 2, ty + th / 2 - c], [tx - tw / 2, ty - th / 2 + c]];
    glass(g, tab, [46, 38, 90], r, { matt: 0.14, mattW: 7, lj: 2, hj: 3, streak: 1.2 }); pieces.push(tab);
    g.strokeStyle = paint(0.55); g.lineWidth = 1.2; path(g, [inset(tab, unit * 0.28)]); g.stroke();
    formula(g, tx, ty + unit * 0.42, unit * 1.25, tw * 0.86);
  }
  pieces.push(...banderole(g, x0 + unit * 0.6, x1 - unit * 0.6, bandY, ins.h, ins.lines, r, ins.o));
  leads(g, pieces, unit * 0.22, r);
  // the roundel's middle is cut away: chapel.js glazes it with clear glass
  g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(cx, cy, eye - unit * 0.06, 0, TAU); g.fill(); g.restore();
  return pieces;
}
// G ↔ ¬Prov(⌜G⌝), centred on x with its baseline at y, at size s (shrunk to fit within maxW). The
// arrow, the not-sign and the corner quotes are drawn, not set: few faces have them.
function formula(g, x, y, s, maxW) {
  const items = [['t', 'G', true], ['gap', 0.22], ['arrow', 1.05], ['gap', 0.22], ['not', 0.55], ['gap', 0.06], ['t', 'Prov', false], ['t', '(', false], ['gap', 0.04], ['ql', 0.3], ['t', 'G', true], ['qr', 0.3], ['gap', 0.04], ['t', ')', false]];
  const widthAt = sz => items.reduce((w, [k, v, it]) => { if (k === 't') { g.font = `${it ? 'italic ' : ''}${sz}px ${FONT}`; return w + g.measureText(v).width; } return w + v * sz; }, 0);
  if (widthAt(s) > maxW) s *= maxW / widthAt(s);
  let cx = x - widthAt(s) / 2;
  g.fillStyle = paint(1); g.strokeStyle = paint(1); g.lineWidth = s * 0.08; g.lineCap = 'round'; g.lineJoin = 'round'; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
  const mid = y - s * 0.3, top = y - s * 0.7;
  for (const [k, v, it] of items) {
    if (k === 't') { g.font = `${it ? 'italic ' : ''}${s}px ${FONT}`; g.fillText(v, cx, y); g.save(); g.lineWidth = s * 0.04; g.strokeText(v, cx, y); g.restore(); cx += g.measureText(v).width; continue; }
    const w = v * s;
    g.beginPath();
    if (k === 'arrow') { const h = s * 0.16; g.moveTo(cx, mid); g.lineTo(cx + w, mid); g.moveTo(cx + h, mid - h); g.lineTo(cx, mid); g.lineTo(cx + h, mid + h); g.moveTo(cx + w - h, mid - h); g.lineTo(cx + w, mid); g.lineTo(cx + w - h, mid + h); }
    if (k === 'not') { g.moveTo(cx + s * 0.04, mid - s * 0.04); g.lineTo(cx + w - s * 0.06, mid - s * 0.04); g.lineTo(cx + w - s * 0.06, mid + s * 0.16); }
    if (k === 'ql') { g.moveTo(cx + w * 0.3, top + s * 0.28); g.lineTo(cx + w * 0.3, top); g.lineTo(cx + w * 0.85, top); }
    if (k === 'qr') { g.moveTo(cx + w * 0.15, top); g.lineTo(cx + w * 0.7, top); g.lineTo(cx + w * 0.7, top + s * 0.28); }
    if (k !== 'gap') g.stroke();
    cx += w;
  }
}

// ---- the set -----------------------------------------------------------------------------------------
// id: [width px, height px, drawing]. The Life window is made by makeLife (it keeps its board).
export const WINDOWS = {
  murmuration: [512, 512, g => murmuration(g, 512)],
  symmetry: [512, 1024, g => brokenSymmetry(g, 512, 1024)],
  turing: [512, 1024, g => turing(g, 512, 1024)],
  eigen: [512, 1024, g => eigen(g, 512, 1024)],
  neuron: [512, 1024, g => neuron(g, 512, 1024)],
  ingression: [512, 1024, g => ingression(g, 512, 1024)],
  loop: [512, 1024, g => strangeLoop(g, 512, 1024)],
};

// A small blurred copy of a window, for the light it throws on the floor
export function poolCopy(src, w, h) {
  const a = document.createElement('canvas'); a.width = w * 4; a.height = h * 4; const ga = a.getContext('2d'); ga.fillStyle = '#fff'; ga.fillRect(0, 0, a.width, a.height); ga.drawImage(src, 0, 0, a.width, a.height);     // (white where a window is clear)
  const b = document.createElement('canvas'); b.width = w * 2; b.height = h * 2; b.getContext('2d').drawImage(a, 0, 0, b.width, b.height);
  const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(b, 0, 0, w, h);
  return c;
}
