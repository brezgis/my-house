// Painted plants. Each function paints one plant (or one leaf, for rosettes)
// into a cell of an atlas canvas, standing on the bottom edge of the cell.
// Everything is drawn leaf by leaf and petal by petal, with seeded randomness.

import { rng } from './cards.js';

const hsl = (h, s, l, a = 1) => `hsla(${h},${s}%,${l}%,${a})`;

// A leaf from its base (0,0) toward -y (up), turned by ang. shape: 0 lance, 1 ovate, 2 heart
function leaf(g, x, y, len, wid, ang, fill, o = {}) {
  g.save(); g.translate(x, y); g.rotate(ang);
  const b = o.base ?? 0.3, t = o.tip ?? 0.78, hw = o.heart ? 1.25 : 1, hb = o.heart ? 0.2 : 1;
  g.beginPath(); g.moveTo(0, 0);
  g.bezierCurveTo(wid * hw, -len * b * hb, wid * 0.85, -len * t, 0, -len);
  g.bezierCurveTo(-wid * 0.85, -len * t, -wid * hw, -len * b * hb, 0, 0);
  g.fillStyle = fill; g.fill();
  if (o.light || o.rib || o.veins || o.edge) {
    g.save(); g.clip();
    if (o.light) { g.fillStyle = o.light; g.fillRect(0, -len, wid * 1.3, len); }
    if (o.veins) { g.strokeStyle = o.veins; g.lineWidth = Math.max(0.5, wid * 0.05); for (let k = 1; k < 7; k++) { const yy = -len * k / 7.5; for (const s of [-1, 1]) { g.beginPath(); g.moveTo(0, yy); g.quadraticCurveTo(s * wid * 0.4, yy - len * 0.05, s * wid * 1.1, yy - len * 0.16); g.stroke(); } } }
    if (o.rib) { g.strokeStyle = o.rib; g.lineWidth = Math.max(0.7, wid * 0.1); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(wid * 0.05, -len * 0.5, 0, -len * 0.95); g.stroke(); }
    if (o.edge) { g.strokeStyle = o.edge; g.lineWidth = (o.edgeW ?? Math.max(1, wid * 0.16)) * 2; g.stroke(); }
    g.restore();
  }
  g.restore();
}
function stem(g, x0, y0, x1, y1, bend, w, col) {
  g.strokeStyle = col; g.lineWidth = w; g.lineCap = 'round';
  g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo((x0 + x1) / 2 + bend, (y0 + y1) / 2, x1, y1); g.stroke();
}
// A point along that same curve
function along(x0, y0, x1, y1, bend, t) {
  const cx = (x0 + x1) / 2 + bend, cy = (y0 + y1) / 2, u = 1 - t;
  return [u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1];
}
// Daisy-like flower seen at an angle
function daisy(g, x, y, r, petal, centre, n = 12, tilt = 0.75, rot = 0, pw = 0.32) {
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(1, tilt);
  for (let i = 0; i < n; i++) { g.save(); g.rotate((i / n) * Math.PI * 2); g.beginPath(); g.ellipse(0, -r * 0.55, r * pw, r * 0.55, 0, 0, Math.PI * 2); g.fillStyle = petal; g.fill(); g.restore(); }
  g.beginPath(); g.arc(0, 0, r * 0.3, 0, Math.PI * 2); g.fillStyle = centre; g.fill();
  g.restore();
}
function mound(r, n, cx, cy, rx, ry, cb) {               // points spread over a half-ellipse mound
  for (let i = 0; i < n; i++) {
    const a = Math.PI + r() * Math.PI, d = Math.sqrt(r());
    cb(cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, d, i);
  }
}

// ---------------------------------------------------------------------------------------
export const FLORA_PAINT = {
  fern(g, S, r) {
    const bx = S / 2, by = S;
    for (let f = 0; f < 13; f++) {
      const a = -1.25 + (f / 12) * 2.5 + (r() - 0.5) * 0.2, len = S * (0.55 + r() * 0.35) * (1 - Math.abs(a) * 0.18);
      const ex = bx + Math.sin(a) * len * 0.95, ey = by - Math.cos(a) * len * 0.75 - S * 0.02, bend = Math.sin(a) * len * 0.35;
      const hue = 88 + r() * 22, light = 24 + r() * 14;
      stem(g, bx, by, ex, ey, bend, 2.2, hsl(hue, 40, light - 8));
      const n = 22;
      for (let k = 2; k < n; k++) {
        const t = k / n, [px, py] = along(bx, by, ex, ey, bend, t), [qx, qy] = along(bx, by, ex, ey, bend, Math.min(1, t + 0.02));
        const dir = Math.atan2(qy - py, qx - px), pl = len * 0.16 * Math.sin(Math.PI * (0.15 + t * 0.85)) * (1.1 - t * 0.5);
        for (const s of [-1, 1]) leaf(g, px, py, pl, pl * 0.22, dir + Math.PI / 2 + s * 1.2 + s * 0.25, hsl(hue + (r() - 0.5) * 6, 45, light + t * 8 + (r() - 0.5) * 5), {});
      }
    }
  },
  hydrangea(g, S, r) {
    const bx = S / 2;
    mound(r, 260, bx, S, S * 0.48, S * 0.8, (x, y, d) => leaf(g, x, y + 10, 30 + r() * 16, 14 + r() * 6, (x - bx) / S * 2.4 + (r() - 0.5) * 0.8, hsl(105 + r() * 15, 38, 18 + (1 - d) * 4 + r() * 10), { rib: hsl(100, 30, 34), base: 0.35 }));
    const heads = 13, cols = [[60, 25, 88], [80, 22, 82], [215, 22, 74], [40, 15, 90]];
    for (let h = 0; h < heads; h++) {
      const a = Math.PI + 0.2 + r() * (Math.PI - 0.4), d = 0.4 + r() * 0.55;
      const hx = bx + Math.cos(a) * S * 0.37 * d, hy = S + Math.sin(a) * S * 0.6 * d - S * 0.05, hr = S * (0.06 + r() * 0.03);
      const [hu, sa, li] = cols[Math.floor(r() * cols.length)];
      g.beginPath(); g.arc(hx, hy, hr, 0, Math.PI * 2); g.fillStyle = hsl(hu, sa - 10, li - 30); g.fill();
      for (let i = 0; i < 70; i++) {
        const fa = r() * Math.PI * 2, fd = Math.sqrt(r()) * hr, fx = hx + Math.cos(fa) * fd, fy = hy + Math.sin(fa) * fd * 0.92, fr = 3 + r() * 2.5;
        const shade = (fy - hy) / hr;                 // darker underneath
        g.fillStyle = hsl(hu + (r() - 0.5) * 16, sa, li - shade * 9 + (r() - 0.5) * 8);
        for (let p = 0; p < 4; p++) { const pa = p * Math.PI / 2 + r(); g.beginPath(); g.ellipse(fx + Math.cos(pa) * fr * 0.55, fy + Math.sin(pa) * fr * 0.55, fr * 0.5, fr * 0.36, pa, 0, Math.PI * 2); g.fill(); }
      }
    }
  },
  rose(g, S, r) {
    const bx = S / 2;
    for (let i = 0; i < 9; i++) stem(g, bx + (r() - 0.5) * 30, S, bx + (r() - 0.5) * S * 0.8, S * (0.15 + r() * 0.35), (r() - 0.5) * 60, 3, hsl(30, 30, 22));
    mound(r, 330, bx, S, S * 0.47, S * 0.85, (x, y, d) => { const a = (r() - 0.5) * 3; for (let k = 0; k < 3; k++) leaf(g, x, y, 19 + r() * 8, 8 + r() * 3, a + (k - 1) * 0.6, hsl(110 + r() * 25, 35, 14 + r() * 12 + (1 - d) * 2), { rib: hsl(110, 25, 30) }); });
    const pal = [[345, 35, 84], [40, 40, 90], [20, 40, 84], [45, 30, 92], [335, 30, 80]];
    const [hu, sa, li] = pal[Math.floor(r() * 2)];
    for (let i = 0; i < 40; i++) {
      const a = Math.PI + 0.2 + r() * (Math.PI - 0.4), d = 0.3 + r() * 0.68;
      const x = bx + Math.cos(a) * S * 0.44 * d, y = S + Math.sin(a) * S * 0.78 * d, rr = 9 + r() * 7, c = r() < 0.25 ? pal[2 + Math.floor(r() * 3)] : [hu, sa, li];
      if (r() < 0.2) { g.beginPath(); g.ellipse(x, y, rr * 0.35, rr * 0.55, 0, 0, Math.PI * 2); g.fillStyle = hsl(c[0], c[1], c[2] - 18); g.fill(); continue; }
      for (let k = 0; k < 4; k++) { const kr = rr * (1 - k * 0.22); g.beginPath(); g.arc(x, y + k * 0.8, kr, 0, Math.PI * 2); g.fillStyle = hsl(c[0], c[1], c[2] - 14 + k * 5 + (r() - 0.5) * 4); g.fill(); g.strokeStyle = hsl(c[0], c[1], c[2] - 22, 0.5); g.lineWidth = 1; g.beginPath(); g.arc(x + (r() - 0.5) * 2, y + k, kr * 0.85, Math.PI * (0.1 + r() * 0.4), Math.PI * (0.9 + r() * 0.5)); g.stroke(); }
    }
  },
  shrub(g, S, r) {
    const bx = S / 2;
    mound(r, 1500, bx, S, S * 0.49, S * 0.96, (x, y, d) => leaf(g, x, y, 18 + r() * 10, 7 + r() * 4, r() * 6.3, hsl(95 + r() * 30, 30 + r() * 15, 12 + (1 - d) * 3 + r() * 13 + (S - y) / S * 6), { rib: r() < 0.3 ? hsl(90, 25, 32) : null }));
  },
  grass(g, S, r) {
    const bx = S / 2;
    for (let i = 0; i < 110; i++) {
      const x0 = bx + (r() - 0.5) * S * 0.2, a = (r() - 0.5) * 1.5, len = S * (0.45 + r() * 0.5);
      const x1 = x0 + Math.sin(a) * len, y1 = S - Math.cos(a) * len * 0.95;
      const hue = 60 + r() * 35, li = 26 + r() * 25;
      g.strokeStyle = hsl(hue, 35, li); g.lineWidth = 1.6 + r() * 2.2; g.beginPath(); g.moveTo(x0, S); g.quadraticCurveTo(x0 + Math.sin(a) * len * 0.3, S - len * 0.6, x1, y1); g.stroke();
      if (r() < 0.22) { g.fillStyle = hsl(40, 35, 62 + r() * 10); for (let k = 0; k < 7; k++) { g.beginPath(); g.ellipse(x1 + (r() - 0.5) * 6, y1 + k * 4, 2, 4.5, (r() - 0.5), 0, 7); g.fill(); } }
    }
  },
  wildflowers(g, S, r) {
    FLORA_PAINT.grass(g, S, r);
    for (let i = 0; i < 46; i++) {
      const x0 = S * (0.1 + r() * 0.8), h = S * (0.35 + r() * 0.55), x1 = x0 + (r() - 0.5) * 50, y1 = S - h;
      stem(g, x0, S, x1, y1, (r() - 0.5) * 20, 1.6, hsl(95, 35, 30));
      const k = r();
      if (k < 0.07) { for (let p = 0; p < 4; p++) { g.beginPath(); g.ellipse(x1 + Math.cos(p * 1.57 + 0.4) * 5, y1 + Math.sin(p * 1.57 + 0.4) * 3, 7, 5, p * 1.57, 0, 7); g.fillStyle = hsl(4 + r() * 8, 60, 50 + r() * 6); g.fill(); } g.beginPath(); g.arc(x1, y1, 2.5, 0, 7); g.fillStyle = '#1b1712'; g.fill(); }
      else if (k < 0.32) { for (let u = 0; u < 22; u++) { const ua = r() * 6.28, ud = Math.sqrt(r()) * 11; g.beginPath(); g.arc(x1 + Math.cos(ua) * ud, y1 + Math.sin(ua) * ud * 0.45, 1.8, 0, 7); g.fillStyle = '#f3f1e6'; g.fill(); } }
      else if (k < 0.55) daisy(g, x1, y1, 9, '#f6f4ec', '#e0b030', 13, 0.8, r());
      else if (k < 0.68) { for (let p = 0; p < 9; p++) { const pa = p / 9 * 6.28; g.beginPath(); g.ellipse(x1 + Math.cos(pa) * 5, y1 + Math.sin(pa) * 4, 4, 2, pa, 0, 7); g.fillStyle = hsl(222, 40, 62 + r() * 10); g.fill(); } }
      else if (k < 0.85) daisy(g, x1, y1, 6, hsl(52, 70, 62), hsl(45, 70, 42), 5, 0.8, r(), 0.5);
      else { for (let p = 0; p < 8; p++) { g.beginPath(); g.arc(x1 + (r() - 0.5) * 6, y1 - p * 3.5, 3, 0, 7); g.fillStyle = hsl(285 + r() * 20, 45, 55); g.fill(); } }
    }
  },
  lavender(g, S, r) {
    const bx = S / 2;
    for (let i = 0; i < 160; i++) { const x0 = bx + (r() - 0.5) * S * 0.5, a = (r() - 0.5) * 2.2, l = S * (0.12 + r() * 0.16); leaf(g, x0, S, l, 3, a, hsl(95 + r() * 30, 14 + r() * 10, 38 + r() * 14)); }
    for (let i = 0; i < 70; i++) {
      const x0 = bx + (r() - 0.5) * S * 0.3, a = (r() - 0.5) * 1.5, h = S * (0.55 + r() * 0.38);
      const x1 = x0 + Math.sin(a) * h, y1 = S - Math.cos(a) * h * 0.95;
      stem(g, x0, S - S * 0.1, x1, y1, (r() - 0.5) * 10, 1.4, hsl(95, 18, 42));
      const hu = 262 + r() * 18, li = 45 + r() * 14;
      for (let k = 0; k < 9; k++) { const t = k / 9; g.beginPath(); g.ellipse(x1 - Math.sin(a) * t * 30, y1 + Math.cos(a) * t * 30, 3.4 - t, 3, 0, 0, 7); g.fillStyle = hsl(hu, 45 + r() * 10, li - t * 10 + (r() - 0.5) * 8); g.fill(); }
    }
  },
  tomato(g, S, r) {
    const bx = S / 2;
    g.strokeStyle = '#8a6a44'; g.lineWidth = 5; g.beginPath(); g.moveTo(bx, S); g.lineTo(bx + 3, S * 0.02); g.stroke();
    for (let i = 0; i < 4; i++) stem(g, bx + (i - 1.5) * 8, S, bx + (i - 1.5) * 26, S * 0.08, (r() - 0.5) * 30, 2.5, hsl(95, 35, 28));
    mound(r, 110, bx, S * 1.02, S * 0.4, S * 0.95, (x, y, d) => { const a = (x - bx) / S * 3 + (r() - 0.5); for (let k = 0; k < 3; k++) leaf(g, x, y, 17 + r() * 6, 8, a + (k - 1) * 0.7, hsl(98 + r() * 18, 38, 19 + r() * 13), { veins: hsl(95, 28, 32), edge: hsl(98, 34, 16, 0.7), edgeW: 1 }); });
    for (let c = 0; c < 9; c++) {
      const cx = bx + (r() - 0.5) * S * 0.6, cy = S * (0.25 + r() * 0.62), n = 2 + Math.floor(r() * 4);
      for (let k = 0; k < n; k++) {
        const x = cx + (r() - 0.5) * 22, y = cy + k * 13 + r() * 4, rr = 8 + r() * 4, ripe = r();
        const col = ripe < 0.55 ? hsl(4 + r() * 6, 80, 44) : ripe < 0.75 ? hsl(22, 85, 50) : hsl(80, 50, 42);
        g.beginPath(); g.arc(x, y, rr, 0, 7); g.fillStyle = col; g.fill();
        g.beginPath(); g.arc(x - rr * 0.35, y - rr * 0.35, rr * 0.3, 0, 7); g.fillStyle = 'rgba(255,255,240,.35)'; g.fill();
        g.strokeStyle = hsl(100, 45, 25); g.lineWidth = 1.5; for (let p = 0; p < 5; p++) { const pa = p * 1.256; g.beginPath(); g.moveTo(x, y - rr * 0.9); g.lineTo(x + Math.cos(pa) * 5, y - rr * 0.9 + Math.sin(pa) * 3); g.stroke(); }
      }
    }
  },
  sunflower(g, S, r) {
    for (let s = 0; s < 3; s++) {
      const x0 = S * (0.3 + s * 0.2), h = S * (0.7 + r() * 0.25), x1 = x0 + (r() - 0.5) * 40, y1 = S - h;
      stem(g, x0, S, x1, y1, (r() - 0.5) * 20, 6, hsl(90, 35, 30));
      for (let k = 0; k < 6; k++) { const [lx, ly] = along(x0, S, x1, y1, 0, 0.15 + k * 0.13); leaf(g, lx, ly, 46 - k * 3, 26 - k * 2, (k % 2 ? 1 : -1) * (1.2 + r() * 0.3), hsl(95 + r() * 10, 40, 24 + r() * 8), { heart: true, rib: hsl(90, 30, 36), veins: hsl(90, 30, 32) }); }
      const fr = 34 + r() * 10;
      g.save(); g.translate(x1, y1); g.rotate((r() - 0.5) * 0.4); g.scale(1, 0.9);
      for (let i = 0; i < 26; i++) { g.save(); g.rotate(i / 26 * 6.283); g.beginPath(); g.ellipse(0, -fr * 0.72, fr * 0.13, fr * 0.36, 0, 0, 7); g.fillStyle = hsl(44 + r() * 8, 92, 50 + r() * 10); g.fill(); g.restore(); }
      g.beginPath(); g.arc(0, 0, fr * 0.46, 0, 7); g.fillStyle = '#3a2412'; g.fill();
      for (let i = 0; i < 60; i++) { const a = i * 2.4, d = Math.sqrt(i / 60) * fr * 0.43; g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, 1.6, 0, 7); g.fillStyle = '#5a3a1a'; g.fill(); }
      g.restore();
    }
  },
  spires(g, S, r) {
    const bx = S / 2;
    for (let i = 0; i < 40; i++) leaf(g, bx + (r() - 0.5) * S * 0.4, S, 40 + r() * 30, 13, (r() - 0.5) * 2.4, hsl(100 + r() * 15, 32, 20 + r() * 10), { rib: hsl(100, 25, 34) });
    for (let s = 0; s < 6; s++) {
      const x0 = bx + (s - 2.5) * 34 + (r() - 0.5) * 16, h = S * (0.75 + r() * 0.22), x1 = x0 + (r() - 0.5) * 24, y1 = S - h;
      stem(g, x0, S, x1, y1, (r() - 0.5) * 10, 3, hsl(100, 30, 30));
      const kind = s % 3, hu = kind === 0 ? 300 + r() * 15 : kind === 1 ? 320 + r() * 10 : 45 + r() * 10, sa = kind === 2 ? 25 : kind === 0 ? 22 : 32, li = kind === 2 ? 90 : kind === 0 ? 82 : 72;
      for (let k = 0; k < 18; k++) {
        const t = k / 18, [x, y] = along(x0, S, x1, y1, 0, 0.42 + t * 0.58), rr = (kind === 1 ? 9 : 8) * (1 - t * 0.55);
        for (const sd of [-1, 1]) {
          g.beginPath(); g.ellipse(x + sd * rr * 0.75, y, rr * (kind === 1 ? 0.7 : 0.85), rr * (kind === 1 ? 1.1 : 0.8), sd * 0.4, 0, 7); g.fillStyle = hsl(hu, sa, li - 8 + (r() - 0.5) * 10); g.fill();
          if (kind === 1) { g.beginPath(); g.arc(x + sd * rr * 0.75, y + rr * 0.4, 1.4, 0, 7); g.fillStyle = hsl(320, 40, 30); g.fill(); }
        }
      }
    }
  },
  cosmos(g, S, r) {
    const bx = S / 2;
    for (let i = 0; i < 70; i++) { const x0 = bx + (r() - 0.5) * S * 0.4, h = S * (0.3 + r() * 0.6), x1 = x0 + (r() - 0.5) * S * 0.7, y1 = S - h; stem(g, x0, S, x1, y1, (r() - 0.5) * 30, 1.2, hsl(100, 40, 34 + r() * 8)); for (let k = 0; k < 4; k++) { const [lx, ly] = along(x0, S, x1, y1, 0, r()); leaf(g, lx, ly, 18, 1.5, (r() - 0.5) * 3, hsl(100, 40, 35)); } }
    const pal = [[330, 35, 84], [0, 0, 96], [0, 0, 95], [340, 30, 88], [45, 25, 92]];
    for (let i = 0; i < 30; i++) {
      const c = pal[Math.floor(r() * pal.length)], x = S * (0.1 + r() * 0.8), y = S * (0.08 + r() * 0.5);
      stem(g, x + (r() - 0.5) * 20, y + 60, x, y, 0, 1.2, hsl(100, 40, 34));
      daisy(g, x, y, 13 + r() * 5, hsl(c[0], c[1], c[2]), hsl(48, 90, 50), 8, 0.6 + r() * 0.4, r() * 3, 0.42);
    }
  },
  // ---- small cells: one leaf each, base at the bottom, for rosettes ----
  lettuce(g, S, r) { leaf(g, S / 2, S, S * 0.95, S * 0.45, 0, hsl(85, 55, 48), { light: hsl(80, 60, 62, 0.35), rib: hsl(75, 40, 75), veins: hsl(80, 45, 62), edge: hsl(82, 50, 40), edgeW: 3 }); },
  lettuceRed(g, S, r) { leaf(g, S / 2, S, S * 0.95, S * 0.45, 0, hsl(95, 40, 38), { light: hsl(345, 45, 32, 0.6), rib: hsl(90, 40, 70), veins: hsl(345, 30, 40), edge: hsl(345, 50, 28), edgeW: 7 }); },
  kale(g, S, r) {
    leaf(g, S / 2, S, S * 0.95, S * 0.3, 0, hsl(170, 22, 30), { rib: hsl(150, 20, 70), veins: hsl(160, 15, 50), light: hsl(165, 20, 40, 0.4) });
    g.strokeStyle = hsl(168, 22, 30); g.lineWidth = 3; for (let k = 0; k < 40; k++) { const t = k / 40, y = S - t * S * 0.92, w = S * 0.3 * Math.sin(Math.PI * Math.min(1, t * 1.1)); for (const s of [-1, 1]) { g.beginPath(); g.arc(S / 2 + s * w * 0.85, y, 4 + r() * 3, 0, 7); g.stroke(); } }
  },
  chard(g, S, r) {
    const c = [[355, 75, 45], [45, 90, 50], [330, 70, 45]][Math.floor(r() * 3)];
    leaf(g, S / 2, S * 0.62, S * 0.6, S * 0.3, 0, hsl(110, 45, 25), { veins: hsl(c[0], c[1], c[2] - 5), light: hsl(110, 40, 35, 0.4), rib: hsl(c[0], c[1], c[2]) });
    g.strokeStyle = hsl(c[0], c[1], c[2]); g.lineWidth = 9; g.beginPath(); g.moveTo(S / 2, S); g.lineTo(S / 2, S * 0.5); g.stroke();
  },
  cabbage(g, S, r) { leaf(g, S / 2, S, S * 0.9, S * 0.48, 0, hsl(150, 25, 52), { heart: true, base: 0.45, rib: hsl(140, 25, 78), veins: hsl(140, 22, 70), light: hsl(150, 25, 62, 0.4) }); },
  squash(g, S, r) {
    g.strokeStyle = hsl(95, 30, 40); g.lineWidth = 8; g.beginPath(); g.moveTo(S / 2, S); g.lineTo(S / 2, S * 0.55); g.stroke();
    g.save(); g.translate(S / 2, S * 0.5); g.beginPath();
    for (let i = 0; i <= 200; i++) { const a = (i / 200) * Math.PI * 2, rr = S * 0.44 * (0.78 + 0.22 * Math.abs(Math.cos(a * 2.5))) * (1 - 0.25 * Math.max(0, Math.sin(a))); const x = Math.cos(a) * rr, y = Math.sin(a) * rr * 0.95; i ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.closePath(); g.fillStyle = hsl(108, 36, 27); g.fill(); g.save(); g.clip();
    g.strokeStyle = hsl(100, 25, 48); g.lineWidth = 2.5; for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * 0.75; g.beginPath(); g.moveTo(0, S * 0.15); g.lineTo(Math.cos(a) * S * 0.45, Math.sin(a) * S * 0.45 + S * 0.15); g.stroke(); }
    for (let i = 0; i < 50; i++) { g.fillStyle = hsl(90, 15, 72, 0.3); g.beginPath(); g.arc((r() - 0.5) * S * 0.7, (r() - 0.6) * S * 0.7, 2 + r() * 4, 0, 7); g.fill(); }
    g.restore(); g.restore();
  },
  lilypad(g, S, r) {
    g.save(); g.translate(S / 2, S / 2);
    g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, S * 0.47, -1.4, -1.4 + Math.PI * 1.9); g.closePath(); g.fillStyle = hsl(100, 38, 30); g.fill();
    g.strokeStyle = hsl(95, 30, 42); g.lineWidth = 2; for (let k = 0; k < 16; k++) { const a = -1.3 + k / 16 * Math.PI * 1.85; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * S * 0.44, Math.sin(a) * S * 0.44); g.stroke(); }
    g.beginPath(); g.arc(0, 0, S * 0.47, -1.4, -1.4 + Math.PI * 1.9); g.strokeStyle = hsl(345, 35, 32); g.lineWidth = 4; g.stroke();
    g.restore();
  },
  waterlily(g, S, r) {
    g.save(); g.translate(S / 2, S / 2);
    for (const [n, rr, l] of [[10, 0.46, 88], [9, 0.36, 82], [7, 0.24, 76]]) for (let i = 0; i < n; i++) { g.save(); g.rotate(i / n * 6.283 + rr * 3); g.beginPath(); g.ellipse(0, -S * rr * 0.55, S * rr * 0.22, S * rr * 0.55, 0, 0, 7); g.fillStyle = hsl(335, 70, l); g.fill(); g.strokeStyle = hsl(335, 60, l - 14); g.lineWidth = 1.2; g.stroke(); g.restore(); }
    g.beginPath(); g.arc(0, 0, S * 0.07, 0, 7); g.fillStyle = hsl(48, 95, 55); g.fill();
    g.restore();
  },
  carrot(g, S, r) {
    for (let i = 0; i < 10; i++) {
      const a = (r() - 0.5) * 1.6, l = S * (0.55 + r() * 0.4), x1 = S / 2 + Math.sin(a) * l, y1 = S - Math.cos(a) * l;
      stem(g, S / 2, S, x1, y1, (r() - 0.5) * 20, 1.5, hsl(100, 45, 34));
      for (let k = 3; k < 14; k++) { const [x, y] = along(S / 2, S, x1, y1, 0, k / 14); for (const s of [-1, 1]) for (let j = 0; j < 3; j++) leaf(g, x, y, 10, 1.6, a + s * (0.9 + j * 0.3), hsl(100 + r() * 10, 50, 32 + r() * 10)); }
    }
  },
  leek(g, S, r) { for (let i = 0; i < 8; i++) { const a = (i - 3.5) * 0.18 + (r() - 0.5) * 0.15; leaf(g, S / 2 + (r() - 0.5) * 8, S, S * (0.7 + r() * 0.28), 9, a, hsl(165, 22, 38 + r() * 10), { rib: hsl(160, 15, 55) }); } g.fillStyle = hsl(70, 20, 85); g.fillRect(S / 2 - 8, S * 0.82, 16, S * 0.18); },
  bean(g, S, r) {
    for (let s = 0; s < 3; s++) { const x0 = S * (0.3 + s * 0.2); stem(g, x0, S, x0 + (r() - 0.5) * 30, 0, (r() - 0.5) * 40, 2, hsl(100, 35, 30)); }
    for (let i = 0; i < 70; i++) { const x = S * (0.15 + r() * 0.7), y = S * r(); leaf(g, x, y, 22 + r() * 8, 13, (r() - 0.5) * 3, hsl(100 + r() * 15, 40, 26 + r() * 10), { heart: true, rib: hsl(100, 30, 38) }); }
    for (let i = 0; i < 26; i++) { const x = S * (0.15 + r() * 0.7), y = S * r(); if (r() < 0.6) { g.fillStyle = hsl(4, 80, 46); for (let p = 0; p < 4; p++) { g.beginPath(); g.ellipse(x + p * 3, y + p * 4, 3.5, 2.5, 0.3, 0, 7); g.fill(); } } else { g.strokeStyle = hsl(95, 50, 40); g.lineWidth = 3.5; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + 4, y + 14, x + 1, y + 30); g.stroke(); } }
  },
  herbs(g, S, r) {
    const bx = S / 2;
    mound(r, 420, bx, S, S * 0.47, S * 0.75, (x, y, d) => leaf(g, x, y, 12 + r() * 6, 4 + r() * 2, (x - bx) / S * 3 + (r() - 0.5) * 1.5, hsl(100 + r() * 40, 12 + r() * 15, 40 + r() * 15)));
    for (let i = 0; i < 26; i++) { const x = bx + (r() - 0.5) * S * 0.7, y = S * (0.3 + r() * 0.3); g.fillStyle = hsl(275 + r() * 20, 40, 62); for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x, y - k * 3, 2.5, 0, 7); g.fill(); } }
  },
  marigold(g, S, r) {
    const bx = S / 2;
    mound(r, 260, bx, S, S * 0.47, S * 0.7, (x, y, d) => { for (let k = 0; k < 3; k++) leaf(g, x, y, 12, 3, (r() - 0.5) * 3, hsl(110, 40, 22 + r() * 10)); });
    for (let i = 0; i < 22; i++) { const x = bx + (r() - 0.5) * S * 0.75, y = S * (0.4 + r() * 0.35), rr = 9 + r() * 5, hu = r() < 0.5 ? 28 : 40; for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(x, y + k, rr * (1 - k * 0.25), 0, 7); g.fillStyle = hsl(hu + k * 4, 65, 52 + k * 6); g.fill(); } g.strokeStyle = hsl(15, 80, 30, 0.6); g.lineWidth = 1; for (let k = 0; k < 8; k++) { const a = k * 0.8; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * rr * 0.8, y + Math.sin(a) * rr * 0.8); g.stroke(); } }
  },
  catmint(g, S, r) {
    const bx = S / 2;
    mound(r, 480, bx, S, S * 0.48, S * 0.8, (x, y, d) => leaf(g, x, y, 9 + r() * 4, 4, (x - bx) / S * 3 + (r() - 0.5) * 2, hsl(110 + r() * 30, 14, 42 + r() * 12)));
    for (let i = 0; i < 170; i++) { const a = Math.PI + r() * Math.PI, d = 0.4 + r() * 0.6, x = bx + Math.cos(a) * S * 0.47 * d, y = S + Math.sin(a) * S * 0.82 * d; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x + (r() - 0.5) * 3, y + k * 3, 2.2, 0, 7); g.fillStyle = hsl(245 + r() * 20, 40, 62 + r() * 10); g.fill(); } }
  },
  coneflower(g, S, r) {
    const bx = S / 2;
    for (let i = 0; i < 30; i++) leaf(g, bx + (r() - 0.5) * S * 0.4, S, 30 + r() * 20, 8, (r() - 0.5) * 2, hsl(100, 32, 22 + r() * 8));
    for (let i = 0; i < 16; i++) {
      const x0 = bx + (r() - 0.5) * S * 0.3, x1 = S * (0.1 + r() * 0.8), y1 = S * (0.1 + r() * 0.45);
      stem(g, x0, S, x1, y1, (r() - 0.5) * 20, 2, hsl(100, 30, 30));
      if (r() < 0.55) { g.save(); g.translate(x1, y1); for (let p = 0; p < 12; p++) { g.save(); g.rotate(p / 12 * 6.28); g.beginPath(); g.ellipse(0, 10, 3.5, 11, 0, 0, 7); g.fillStyle = hsl(322 + r() * 10, 28, 70); g.fill(); g.restore(); } g.beginPath(); g.arc(0, -2, 7, 0, 7); g.fillStyle = hsl(20, 70, 32); g.fill(); g.restore(); }
      else daisy(g, x1, y1, 15, '#f4f2ea', hsl(44, 70, 45), 13, 0.8, r(), 0.3);
    }
  },
  strawberry(g, S, r) {
    const bx = S / 2;
    mound(r, 26, bx, S, S * 0.45, S * 0.6, (x, y) => { for (let k = 0; k < 3; k++) leaf(g, x, y, 22, 11, (k - 1) * 0.8 + (r() - 0.5) * 0.4, hsl(105, 42, 24 + r() * 10), { veins: hsl(100, 30, 36), edge: hsl(100, 40, 20), edgeW: 1.2 }); });
    for (let i = 0; i < 14; i++) { const x = bx + (r() - 0.5) * S * 0.75, y = S * (0.7 + r() * 0.25); g.beginPath(); g.moveTo(x - 6, y - 4); g.quadraticCurveTo(x, y + 14, x + 6, y - 4); g.closePath(); g.fillStyle = r() < 0.7 ? hsl(355, 85, 45) : hsl(30, 60, 70); g.fill(); g.fillStyle = hsl(100, 40, 30); g.fillRect(x - 4, y - 6, 8, 3); }
    for (let i = 0; i < 6; i++) daisy(g, bx + (r() - 0.5) * S * 0.7, S * (0.55 + r() * 0.2), 6, '#f7f5ee', '#e6c030', 5, 0.85, 0, 0.5);
  },
  hosta(g, S, r) { leaf(g, S / 2, S, S * 0.92, S * 0.42, 0, hsl(150, 30, 34), { heart: true, base: 0.4, rib: hsl(140, 20, 55), veins: hsl(140, 20, 45), edge: hsl(60, 55, 78), edgeW: 7 }); },
  clover(g, S, r) {                                   // low ground cover with tiny flowers, for lawns' edges and paths
    for (let i = 0; i < 60; i++) { const x = S * r(), y = S * (0.35 + r() * 0.65); for (let k = 0; k < 3; k++) leaf(g, x, y, 9, 5, k * 2.1, hsl(110, 35, 26 + r() * 10)); }
    for (let i = 0; i < 18; i++) daisy(g, S * r(), S * (0.4 + r() * 0.5), 5, '#f6f4ee', '#e8c030', 9, 0.6, 0, 0.35);
  },
  wisteria(g, S, r) {                                  // a hanging raceme cluster (hang the card upside down)
    for (let i = 0; i < 14; i++) {
      const x = S * (0.1 + r() * 0.8), len = S * (0.35 + r() * 0.5);
      for (let k = 0; k < 16; k++) { const t = k / 16; g.beginPath(); g.ellipse(x + (r() - 0.5) * 6, S * 0.02 + t * len, 7 * (1 - t * 0.6), 5, 0, 0, 7); g.fillStyle = hsl(268 + r() * 12, 40, 62 + t * 12); g.fill(); }
    }
    for (let i = 0; i < 40; i++) leaf(g, S * r(), S * r() * 0.3, 20, 7, Math.PI + (r() - 0.5) * 2, hsl(95, 40, 30 + r() * 10));
  },
  boxwood(g, S, r) {                                  // clipped evergreen surface: dense tiny leaves edge to edge
    for (let i = 0; i < 1300; i++) leaf(g, S * r(), S * r(), 6 + r() * 4, 2.6 + r(), r() * 6.3, hsl(85 + r() * 30, 35 + r() * 15, 14 + r() * 16));
  },
};

// The flora atlas: name -> [x, y, w, h] in 256-px units on a 2048 canvas
export const FLORA_CELLS = {
  fern: [0, 0, 2, 2], hydrangea: [2, 0, 2, 2], rose: [4, 0, 2, 2], shrub: [6, 0, 2, 2],
  grass: [0, 2, 2, 2], wildflowers: [2, 2, 2, 2], lavender: [4, 2, 2, 2], tomato: [6, 2, 2, 2],
  sunflower: [0, 4, 2, 2], spires: [2, 4, 2, 2], cosmos: [4, 4, 2, 2], bean: [6, 4, 1, 2], wisteria: [7, 4, 1, 2],
  lettuce: [0, 6, 1, 1], lettuceRed: [1, 6, 1, 1], kale: [2, 6, 1, 1], chard: [3, 6, 1, 1], cabbage: [4, 6, 1, 1], squash: [5, 6, 1, 1], lilypad: [6, 6, 1, 1], waterlily: [7, 6, 1, 1],
  carrot: [0, 7, 1, 1], leek: [1, 7, 1, 1], herbs: [2, 7, 1, 1], marigold: [3, 7, 1, 1], catmint: [4, 7, 1, 1], coneflower: [5, 7, 1, 1], strawberry: [6, 7, 1, 1], hosta: [7, 7, 1, 1],
};
// clover and boxwood share cells with nothing; they get their own small atlas row below if needed
export function paintFlora(size = 2048) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), U = size / 8, rects = {};
  let seed = 7;
  for (const [name, [cx, cy, cw, ch]] of Object.entries(FLORA_CELLS)) {
    const x = cx * U, y = cy * U, w = cw * U, h = ch * U;
    g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.translate(x, y);
    // paint in a square of the cell's width, stretched to tall cells
    if (h !== w) g.scale(1, h / w);
    FLORA_PAINT[name](g, w, rng(seed += 101));
    g.restore();
    rects[name] = [x, y, w, h];
  }
  return { canvas: c, rects };
}

// ---------------------------------------------------------------------------------------
// Tree crowns: sprigs seen from all sides, centred in the cell.
function sprig(g, S, r, { n = 300, len = [20, 12], wid = 0.38, hue = [80, 34], sat = [32, 22], lig = [13, 21], shape = {}, spread = 0.84, extra } = {}) {
  const c = S / 2;
  for (let i = 0; i < 5; i++) { const a = r() * 6.28; stem(g, c, c, c + Math.cos(a) * S * 0.3, c + Math.sin(a) * S * 0.26, (r() - 0.5) * 30, 1.4, hsl(45, 22, 20)); }
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * S * 0.42 * spread;
    const x = c + Math.cos(a) * d, y = c + Math.sin(a) * d * 0.82, l = len[0] + r() * len[1];
    leaf(g, x, y, l, l * wid, r() * 6.283, hsl(hue[0] + r() * hue[1], sat[0] + r() * sat[1], lig[0] + r() * lig[1] + (1 - d / (S * 0.42)) * 4), shape);
  }
  extra?.(g, S, r);
}
export const TREE_PAINT = {
  oak(g, S, r) { sprig(g, S, r, { n: 560, len: [24, 18], wid: 0.42, shape: { tip: 0.7 } }); },
  maple(g, S, r) {
    const c = S / 2;
    for (let i = 0; i < 230; i++) {
      const a = r() * 6.28, d = Math.sqrt(r()) * S * 0.38, x = c + Math.cos(a) * d, y = c + Math.sin(a) * d * 0.85, s = 15 + r() * 10, col = hsl(88 + r() * 30, 35 + r() * 15, 16 + r() * 20);
      for (let k = 0; k < 5; k++) leaf(g, x, y, s * (k === 2 ? 1.1 : 0.85), s * 0.35, (k - 2) * 0.62 + r() * 6.28 * 0, col);
    }
  },
  birch(g, S, r) { sprig(g, S, r, { n: 380, len: [14, 9], wid: 0.55, hue: [70, 25], sat: [40, 20], lig: [24, 22], spread: 0.95 }); },
  pine(g, S, r) {
    const c = S / 2;
    for (let i = 0; i < 44; i++) {
      const a = (i / 44) * 6.28 + r() * 0.2, l = S * (0.22 + r() * 0.24), x1 = c + Math.cos(a) * l, y1 = c + Math.sin(a) * l * 0.7;
      stem(g, c, c, x1, y1, 0, 3, hsl(25, 30, 22));
      for (let k = 0; k < 110; k++) { const [x, y] = along(c, c, x1, y1, 0, 0.1 + 0.9 * r()); g.strokeStyle = hsl(120 + r() * 40, 25 + r() * 15, 12 + r() * 18); g.lineWidth = 2.2; const na = a + (r() - 0.5) * 2.4; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(na) * 16, y + Math.sin(na) * 16); g.stroke(); }
    }
  },
  magnolia(g, S, r) {
    sprig(g, S, r, { n: 160, len: [22, 10], wid: 0.45, hue: [88, 20], sat: [35, 15], lig: [22, 14] });
    const c = S / 2;
    for (let i = 0; i < 40; i++) {
      const a = r() * 6.28, d = Math.sqrt(r()) * S * 0.4, x = c + Math.cos(a) * d, y = c + Math.sin(a) * d * 0.8, s = 13 + r() * 7, tilt = (r() - 0.5) * 0.8;
      g.save(); g.translate(x, y); g.rotate(tilt);
      for (const [px, w, l] of [[-0.42, 0.42, 82], [0.42, 0.42, 82], [0, 0.5, 90], [-0.2, 0.36, 94], [0.2, 0.36, 94]]) {
        const grd = g.createLinearGradient(0, s * 0.6, 0, -s * 0.9); grd.addColorStop(0, hsl(322, 55, 48)); grd.addColorStop(0.5, hsl(328, 50, 72)); grd.addColorStop(1, hsl(330, 40, l));
        g.fillStyle = grd; g.beginPath(); g.ellipse(px * s, -s * 0.15, s * w, s * 0.75, px * 0.6, 0, 7); g.fill();
      }
      g.restore();
    }
  },
  cherry(g, S, r) {
    sprig(g, S, r, { n: 120, len: [18, 8], wid: 0.4, hue: [85, 25], lig: [20, 14] });
    const c = S / 2;
    for (let i = 0; i < 260; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * S * 0.42, x = c + Math.cos(a) * d, y = c + Math.sin(a) * d * 0.82; daisy(g, x, y, 7 + r() * 3, hsl(340 + r() * 12, 30 + r() * 15, 86 + r() * 8), hsl(340, 60, 55), 5, 0.9, r() * 6, 0.6); }
  },
  apple(g, S, r) {
    sprig(g, S, r, { n: 420, len: [20, 10], wid: 0.45, hue: [85, 30], lig: [16, 20] });
    const c = S / 2;
    for (let i = 0; i < 11; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * S * 0.36, x = c + Math.cos(a) * d, y = c + Math.sin(a) * d * 0.8, rr = 8 + r() * 3; g.beginPath(); g.arc(x, y, rr, 0, 7); g.fillStyle = r() < 0.75 ? hsl(358, 70, 40 + r() * 10) : hsl(55, 70, 52); g.fill(); g.beginPath(); g.arc(x - 3, y - 3, 3, 0, 7); g.fillStyle = 'rgba(255,240,220,.4)'; g.fill(); }
  },
  willow(g, S, r) {                                    // hanging strands, top of the cell is the branch
    for (let i = 0; i < 40; i++) {
      const x0 = S * (0.05 + r() * 0.9), y0 = S * r() * 0.35, len = S * (0.5 + r() * 0.48) - y0 * 0.5, sway = (r() - 0.5) * 30;
      stem(g, x0, y0, x0 + sway, y0 + len, sway * 0.3, 1.4, hsl(60, 35, 38));
      for (let k = 0; k < 26; k++) { const t = k / 26, [x, y] = along(x0, y0, x0 + sway, y0 + len, sway * 0.3, t); for (const s of [-1, 1]) leaf(g, x, y, 15 + r() * 6, 2.8, Math.PI + s * (0.35 + r() * 0.3), hsl(78 + r() * 18, 40, 30 + r() * 18)); }
    }
  },
  jmaple(g, S, r) {
    const c = S / 2;
    for (let i = 0; i < 210; i++) {
      const a = r() * 6.28, d = Math.sqrt(r()) * S * 0.42, x = c + Math.cos(a) * d, y = c + Math.sin(a) * d * 0.7, s = 11 + r() * 7, col = hsl(358 + r() * 26, 65 + r() * 20, 36 + r() * 18);
      for (let k = 0; k < 7; k++) leaf(g, x, y, s * (k === 3 ? 1.1 : 0.8 + (k % 2) * 0.1), s * 0.22, (k - 3) * 0.5, col);
    }
  },
  far(g, S, r) { sprig(g, S, r, { n: 700, len: [26, 18], wid: 0.5, hue: [85, 40], sat: [25, 20], lig: [12, 16], spread: 1 }); },
  copper(g, S, r) { sprig(g, S, r, { n: 560, len: [22, 14], wid: 0.5, hue: [335, 25], sat: [25, 20], lig: [14, 16], shape: { tip: 0.7 } }); },
  lilac(g, S, r) {
    sprig(g, S, r, { n: 380, len: [22, 10], wid: 0.55, hue: [90, 25], lig: [16, 16], shape: { heart: true } });
    const c = S / 2;
    for (let i = 0; i < 26; i++) { const a = r() * 6.28, d = Math.sqrt(r()) * S * 0.36, x = c + Math.cos(a) * d, y = c + Math.sin(a) * d * 0.8, hu = 265 + r() * 25; for (let k = 0; k < 40; k++) { const t = r(); g.beginPath(); g.arc(x + (r() - 0.5) * 22 * (1 - t), y - t * 46, 3.2, 0, 7); g.fillStyle = hsl(hu, 45, 55 + r() * 20); g.fill(); } }
  },
};
export const TREE_CELLS = ['oak', 'maple', 'birch', 'pine', 'magnolia', 'cherry', 'apple', 'willow', 'jmaple', 'far', 'copper', 'lilac'];
export function paintTrees(size = 512) {
  const c = document.createElement('canvas'); c.width = size * 4; c.height = size * 3;
  const g = c.getContext('2d'), rects = {};
  TREE_CELLS.forEach((name, i) => {
    const x = (i % 4) * size, y = Math.floor(i / 4) * size;
    g.save(); g.beginPath(); g.rect(x, y, size, size); g.clip(); g.translate(x, y);
    TREE_PAINT[name](g, size, rng(31 + i * 977));
    g.restore(); rects[name] = [x, y, size, size];
  });
  return { canvas: c, rects };
}

// A clipped evergreen surface that tiles (yew or box hedges, topiary): opaque.
export function paintHedge(kind = 'yew', size = 512) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), r = rng(kind === 'yew' ? 5 : 9);
  const [h0, s0, l0] = kind === 'yew' ? [120, 30, 10] : [88, 38, 15];
  g.fillStyle = hsl(h0, s0, l0 - 4); g.fillRect(0, 0, size, size);
  for (let i = 0; i < 9000; i++) {
    const x = r() * size, y = r() * size, l = (kind === 'yew' ? 9 : 7) + r() * 6, a = r() * 6.3, col = hsl(h0 + (r() - 0.5) * 30, s0 + r() * 15, l0 + r() * 20);
    for (const [dx, dy] of [[0, 0], [size, 0], [-size, 0], [0, size], [0, -size]]) leaf(g, x + dx, y + dy, l, kind === 'yew' ? 2 : 3.2, a, col);
  }
  return c;
}
