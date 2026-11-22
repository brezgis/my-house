// Drawing, for the catalogue: the ink engravings on its pages (engrave), and the printed labels on
// the goods themselves (drawLabel). All drawn here on small canvases; no image is downloaded, and
// no real firm's packaging is copied.

const INK = '#2a1c13', PAPER = '#f3ead6';
const FONT = '"Goudy House", Georgia, serif';

// ---- engraving tools -------------------------------------------------------------------------------
// hatch the inside of a path with parallel lines (the engraver's shading)
function hatch(g, path, ang = 0.7, gap = 4, alpha = 0.55) {
  g.save(); g.clip(path); g.globalAlpha = alpha; g.lineWidth = 0.9; g.beginPath();
  const c = Math.cos(ang), s = Math.sin(ang);
  for (let d = -600; d < 600; d += gap) { g.moveTo(d * c - 600 * -s, d * s - 600 * c); g.lineTo(d * c + 600 * -s, d * s + 600 * c); }
  g.stroke(); g.restore();
}
const P = f => { const p = new Path2D(); f(p); return p; };
const line = (g, path, w = 1.6) => { g.lineWidth = w; g.stroke(path); };
function ground(g, x, y, w) { g.save(); g.lineWidth = 1; g.globalAlpha = 0.6; for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(x - w / 2 + i * 7, y + i * 2.4); g.lineTo(x + w / 2 - i * 9, y + i * 2.4); g.stroke(); } g.restore(); }
function star(g, x, y, r) { g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, q = i % 2 ? r * 0.35 : r; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } g.closePath(); g.fill(); }

// Reginald from above and a little to the front: a round vacuum with two eyes
function vacuum(g, x, y, r) {
  const body = P(p => p.ellipse(x, y, r, r * 0.62, 0, 0, 7));
  g.fillStyle = PAPER; g.fill(body); hatch(g, body, 0.5, 3, 0.8); line(g, body, 1.8);
  line(g, P(p => p.ellipse(x, y - r * 0.08, r * 0.72, r * 0.42, 0, 0, 7)), 1);
  for (const s of [-1, 1]) { g.fillStyle = PAPER; g.beginPath(); g.arc(x + s * r * 0.26, y + r * 0.3, r * 0.15, 0, 7); g.fill(); g.stroke(); g.fillStyle = INK; g.beginPath(); g.arc(x + s * r * 0.26 + r * 0.03, y + r * 0.33, r * 0.07, 0, 7); g.fill(); }
}

const ART = {
  // an iced drink in a clear cup: the variant decides what is on top and how it is layered
  cup(g, w, h, v) {
    const cx = w / 2, top = h * 0.3, bot = h * 0.86, rt = w * 0.2, rb = w * 0.145;
    ground(g, cx, bot + 4, w * 0.6);
    const body = P(p => { p.moveTo(cx - rt, top); p.lineTo(cx - rb, bot); p.quadraticCurveTo(cx, bot + 7, cx + rb, bot); p.lineTo(cx + rt, top); p.closePath(); });
    const lvl = top + (bot - top) * 0.16, half = top + (bot - top) * (v === 'matcha' || v === 'caramel' ? 0.52 : 0.6);
    const rAt = y => rt + (rb - rt) * (y - top) / (bot - top);
    const lower = P(p => { p.moveTo(cx - rAt(half), half); p.lineTo(cx - rb, bot); p.quadraticCurveTo(cx, bot + 7, cx + rb, bot); p.lineTo(cx + rAt(half), half); p.closePath(); });
    const upper = P(p => { p.moveTo(cx - rAt(lvl), lvl); p.lineTo(cx - rAt(half), half); p.lineTo(cx + rAt(half), half); p.lineTo(cx + rAt(lvl), lvl); p.closePath(); });
    const dark = { bsse: [0.9, 0.35], lavender: [0.45, 0.25], pistachio: [1, 1], matcha: [0.3, 0.7], caramel: [0.2, 0.85], ube: [0.6, 0.6] }[v] ?? [0.6, 0.4];
    hatch(g, lower, 0.6, 3.2, dark[0]); if (dark[0] > 0.8) hatch(g, lower, -0.6, 3.2, 0.6);
    hatch(g, upper, v === 'matcha' ? -0.6 : 0.6, 4.4, dark[1]); if (dark[1] > 0.8) hatch(g, upper, -0.6, 3.2, 0.6);
    // ice
    for (const [dx, dy, a] of [[-0.09, 0.2, 0.3], [0.07, 0.24, -0.4], [0.0, 0.31, 0.8]]) { g.save(); g.translate(cx + dx * w, top + dy * h * 0.5 + 6); g.rotate(a); g.fillStyle = PAPER; g.fillRect(-7, -7, 14, 14); g.lineWidth = 1; g.strokeRect(-7, -7, 14, 14); g.restore(); }
    if (v === 'pistachio' || v === 'caramel') { const cl = P(p => { p.moveTo(cx - rAt(lvl), lvl); p.bezierCurveTo(cx - rt * 0.5, lvl + 16, cx - rt * 0.2, lvl + 6, cx, lvl + 14); p.bezierCurveTo(cx + rt * 0.3, lvl + 22, cx + rt * 0.6, lvl + 8, cx + rAt(lvl), lvl); p.closePath(); }); g.fillStyle = PAPER; g.fill(cl); line(g, cl, 1); }
    line(g, body, 1.8);
    // the dome and the straw
    const dome = P(p => { p.moveTo(cx - rt - 3, top); p.bezierCurveTo(cx - rt, top - h * 0.14, cx + rt, top - h * 0.14, cx + rt + 3, top); p.closePath(); });
    line(g, dome, 1.6); g.lineWidth = 1; g.beginPath(); g.moveTo(cx - rt * 0.6, top - h * 0.06); g.quadraticCurveTo(cx - rt * 0.3, top - h * 0.095, cx, top - h * 0.1); g.stroke();
    g.lineWidth = 5; g.beginPath(); g.moveTo(cx + 6, bot - 14); g.lineTo(cx + 15, top - h * 0.24); g.stroke(); g.strokeStyle = PAPER; g.lineWidth = 2.2; g.stroke(); g.strokeStyle = INK;
    if (v === 'caramel') { g.lineWidth = 1.4; g.beginPath(); for (let i = 0; i < 26; i++) g.lineTo(cx - rt * 0.8 + i * rt * 0.064, lvl - 2 + (i % 2 ? 5 : -3)); g.stroke(); }
    if (v === 'bsse') { g.fillStyle = INK; for (let i = 0; i < 12; i++) g.fillRect(cx - rt * 0.7 + (i * 37 % 50) / 50 * rt * 1.4, lvl + 2 + (i * 13 % 9), 1.6, 1.6); }
    // drops of the cold on the outside
    g.lineWidth = 1; for (const [dx, dy] of [[-0.8, 0.5], [0.72, 0.62], [-0.6, 0.78], [0.5, 0.4]]) { g.beginPath(); g.ellipse(cx + dx * rAt(top + (bot - top) * dy), top + (bot - top) * dy, 1.6, 2.6, 0, 0, 7); g.stroke(); }
  },
  oysters(g, w, h) {
    const cx = w / 2, cy = h * 0.6, rx = w * 0.4, ry = rx * 0.36;
    ground(g, cx, cy + ry + 8, w * 0.8);
    const plate = P(p => p.ellipse(cx, cy, rx, ry, 0, 0, 7)); g.fillStyle = PAPER; g.fill(plate); line(g, plate, 1.8); line(g, P(p => p.ellipse(cx, cy - 3, rx * 0.9, ry * 0.86, 0, 0, 7)), 0.9);
    g.save(); g.clip(P(p => p.ellipse(cx, cy - 3, rx * 0.9, ry * 0.86, 0, 0, 7))); g.lineWidth = 0.8; g.globalAlpha = 0.5; for (let i = 0; i < 60; i++) { const x = cx - rx + (i * 53 % 100) / 100 * rx * 2, y = cy - ry + (i * 31 % 100) / 100 * ry * 2; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 5, y + 3); g.lineTo(x + 1, y + 6); g.stroke(); } g.restore();
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.3, x = cx + Math.cos(a) * rx * 0.55, y = cy - 4 + Math.sin(a) * ry * 0.55; g.save(); g.translate(x, y); g.rotate(a + 1.57); const sh = P(p => { p.moveTo(0, -17); p.bezierCurveTo(14, -12, 13, 9, 0, 13); p.bezierCurveTo(-13, 9, -14, -12, 0, -17); }); g.fillStyle = PAPER; g.fill(sh); hatch(g, sh, 0.4, 3.5, 0.5); line(g, sh, 1.4); g.fillStyle = PAPER; g.beginPath(); g.ellipse(0, -1, 5.5, 8, 0, 0, 7); g.fill(); g.lineWidth = 0.9; g.stroke(); g.restore(); }
    const lem = P(p => { p.moveTo(cx - 10, cy - 2); p.quadraticCurveTo(cx, cy - 16, cx + 10, cy - 2); p.closePath(); }); g.fillStyle = PAPER; g.fill(lem); line(g, lem, 1.3);
  },
  macarons(g, w, h) {
    const x0 = w * 0.14, y0 = h * 0.42, bw = w * 0.72, bh = h * 0.34, dx = w * 0.06, dy = h * 0.09;
    ground(g, w / 2, y0 + bh + 8, w * 0.85);
    const back = P(p => { p.moveTo(x0 + dx, y0 - dy); p.lineTo(x0 + bw + dx, y0 - dy); p.lineTo(x0 + bw, y0); p.lineTo(x0, y0); p.closePath(); }); hatch(g, back, 0.2, 3, 0.6); line(g, back, 1.5);
    for (let i = 0; i < 6; i++) { const x = x0 + bw * (0.2 + (i % 3) * 0.3) + (i < 3 ? dx * 0.6 : 0), y = y0 + (i < 3 ? -4 : bh * 0.42); const top = P(p => p.ellipse(x, y, bw * 0.12, 9, 0, Math.PI, 0)), bot = P(p => p.ellipse(x, y + 7, bw * 0.12, 9, 0, 0, Math.PI)); g.fillStyle = PAPER; g.fill(top); g.fill(bot); if (i % 2) hatch(g, top, 0.8, 3, 0.7); else hatch(g, top, -0.5, 5, 0.4); line(g, top, 1.4); line(g, bot, 1.4); g.lineWidth = 2.4; g.beginPath(); g.moveTo(x - bw * 0.11, y + 3.5); g.lineTo(x + bw * 0.11, y + 3.5); g.stroke(); }
    const front = P(p => p.rect(x0, y0 + bh * 0.62, bw, bh * 0.38)); g.fillStyle = PAPER; g.fill(front); line(g, front, 1.8);
    g.fillStyle = INK; g.textAlign = 'center'; g.font = `italic ${Math.round(bh * 0.22)}px ${FONT}`; g.fillText('six, assorted', x0 + bw / 2, y0 + bh * 0.9);
  },
  board(g, w, h) {
    const x0 = w * 0.1, y0 = h * 0.4, bw = w * 0.8, bh = h * 0.36;
    ground(g, w / 2, y0 + bh + 12, w * 0.85);
    const bd = P(p => { p.moveTo(x0 + 16, y0); p.lineTo(x0 + bw, y0); p.lineTo(x0 + bw - 16, y0 + bh); p.lineTo(x0, y0 + bh); p.closePath(); }); g.fillStyle = PAPER; g.fill(bd); hatch(g, bd, 0.05, 7, 0.25); line(g, bd, 1.8);
    g.lineWidth = 1.4; g.beginPath(); g.moveTo(x0, y0 + bh); g.lineTo(x0, y0 + bh + 6); g.lineTo(x0 + bw - 16, y0 + bh + 6); g.lineTo(x0 + bw, y0 + 6); g.lineTo(x0 + bw, y0); g.stroke();
    const rx = x0 + bw * 0.3, ry = y0 + bh * 0.5; for (let k = 4; k >= 0; k--) { const r = 7 + k * 6, c = P(p => p.ellipse(rx, ry, r, r * 0.55, k * 0.5, 0, 7)); g.fillStyle = PAPER; g.fill(c); if (k % 2) hatch(g, c, 0.8, 2.6, 0.75); line(g, c, 1.2); }
    for (let i = 0; i < 3; i++) { g.lineWidth = 6; g.beginPath(); g.moveTo(x0 + bw * 0.52, y0 + bh * (0.62 + i * 0.1)); g.lineTo(x0 + bw * 0.85, y0 + bh * (0.5 + i * 0.1)); g.stroke(); g.strokeStyle = PAPER; g.lineWidth = 3.4; g.stroke(); g.strokeStyle = INK; }
    for (let i = 0; i < 4; i++) { g.save(); g.translate(x0 + bw * (0.55 + i * 0.085), y0 + bh * 0.26); g.rotate(0.3 + i * 0.12); g.fillStyle = PAPER; g.fillRect(-9, -9, 18, 18); g.lineWidth = 1.2; g.strokeRect(-9, -9, 18, 18); g.fillStyle = INK; g.fillRect(-1, -1, 2, 2); g.restore(); }
  },
  fries(g, w, h) {
    const cx = w / 2, top = h * 0.46, bot = h * 0.86, rt = w * 0.2, rb = w * 0.12;
    ground(g, cx, bot + 6, w * 0.6);
    for (let i = 0; i < 13; i++) { const x = cx - rt * 0.8 + i * rt * 0.135, a = (i - 6) * 0.07 + ((i * 7) % 5 - 2) * 0.03, len = h * (0.22 + ((i * 5) % 4) * 0.035); g.save(); g.translate(x, top + 6); g.rotate(a); g.fillStyle = PAPER; g.fillRect(-4, -len, 8, len); g.lineWidth = 1.2; g.strokeRect(-4, -len, 8, len); if (i % 3 === 0) { g.lineWidth = 0.8; g.beginPath(); g.moveTo(-2, -len + 4); g.lineTo(-2, -6); g.stroke(); } g.restore(); }
    const cup = P(p => { p.moveTo(cx - rt, top); p.lineTo(cx - rb, bot); p.lineTo(cx + rb, bot); p.lineTo(cx + rt, top); p.closePath(); }); g.fillStyle = PAPER; g.fill(cup); hatch(g, cup, Math.PI / 2, 5, 0.5); line(g, cup, 1.8);
    line(g, P(p => p.ellipse(cx, top, rt, 5, 0, 0, Math.PI)), 1.4); line(g, P(p => p.rect(cx - rb - 5, bot, rb * 2 + 10, 6)), 1.5);
    g.fillStyle = INK; for (const [dx, dy, r] of [[-0.2, -0.3, 2], [0.1, -0.36, 1.6], [0.24, -0.26, 2], [-0.05, -0.22, 1.5], [0.3, -0.34, 1.4], [-0.3, -0.38, 1.6]]) { g.beginPath(); g.arc(cx + dx * w, top + dy * h * 0.5, r, 0, 7); g.fill(); }
  },
  tin(g, w, h) {
    const cx = w / 2, cy = h * 0.6, rx = w * 0.26, ry = rx * 0.3, tall = h * 0.34;
    ground(g, cx, cy + tall / 2 + ry + 2, w * 0.7);
    const side = P(p => { p.moveTo(cx - rx, cy - tall / 2); p.lineTo(cx - rx, cy + tall / 2); p.ellipse(cx, cy + tall / 2, rx, ry, 0, Math.PI, 0, true); p.lineTo(cx + rx, cy - tall / 2); p.ellipse(cx, cy - tall / 2, rx, ry, 0, 0, Math.PI, false); });
    hatch(g, side, Math.PI / 2, 4, 0.45); line(g, side, 1.8);
    const lid = P(p => p.ellipse(cx, cy - tall / 2, rx, ry, 0, 0, 7)); g.fillStyle = PAPER; g.fill(lid); line(g, lid, 1.8); line(g, P(p => p.ellipse(cx, cy - tall / 2, rx * 0.8, ry * 0.8, 0, 0, 7)), 0.8);
    // the label: a fish
    g.fillStyle = PAPER; g.fillRect(cx - rx * 0.72, cy - tall * 0.2, rx * 1.44, tall * 0.62); g.lineWidth = 1; g.strokeRect(cx - rx * 0.72, cy - tall * 0.2, rx * 1.44, tall * 0.62);
    const fy = cy + tall * 0.11, fish = P(p => { p.moveTo(cx - rx * 0.5, fy); p.quadraticCurveTo(cx - rx * 0.1, fy - 11, cx + rx * 0.3, fy); p.lineTo(cx + rx * 0.52, fy - 8); p.lineTo(cx + rx * 0.52, fy + 8); p.lineTo(cx + rx * 0.3, fy); p.quadraticCurveTo(cx - rx * 0.1, fy + 11, cx - rx * 0.5, fy); });
    hatch(g, fish, 0.9, 2.6, 0.8); line(g, fish, 1.2);
    // glitter rising from it
    g.fillStyle = INK; for (const [dx, dy, r] of [[-0.3, -0.52, 5], [0.05, -0.68, 7], [0.34, -0.5, 4], [-0.1, -0.42, 3], [0.2, -0.82, 3.5], [-0.38, -0.78, 3]]) star(g, cx + dx * w, cy + dy * h * 0.62, r);
  },
  treats(g, w, h) {
    const x0 = w * 0.2, y0 = h * 0.14, bw = w * 0.38, bh = h * 0.6, dx = w * 0.07, dy = h * 0.045;
    ground(g, w * 0.5, y0 + bh + dy + 4, w * 0.8);
    const front = P(p => p.rect(x0, y0 + dy, bw, bh)), sideP = P(p => { p.moveTo(x0 + bw, y0 + dy); p.lineTo(x0 + bw + dx, y0); p.lineTo(x0 + bw + dx, y0 + bh); p.lineTo(x0 + bw, y0 + bh + dy); p.closePath(); }), topP = P(p => { p.moveTo(x0, y0 + dy); p.lineTo(x0 + dx, y0); p.lineTo(x0 + bw + dx, y0); p.lineTo(x0 + bw, y0 + dy); p.closePath(); });
    hatch(g, sideP, 0.4, 3, 0.8); line(g, sideP, 1.6); line(g, topP, 1.6); line(g, front, 1.8);
    g.fillStyle = INK; g.textAlign = 'center'; g.font = `bold ${Math.round(bw * 0.2)}px ${FONT}`; g.fillText('REGINALD', x0 + bw / 2, y0 + dy + bh * 0.2); g.font = `italic ${Math.round(bw * 0.2)}px ${FONT}`; g.fillText('Treats', x0 + bw / 2, y0 + dy + bh * 0.36);
    vacuum(g, x0 + bw / 2, y0 + dy + bh * 0.66, bw * 0.33);
    // and the gentleman himself, with some on the floor
    vacuum(g, w * 0.76, h * 0.74, w * 0.14);
    g.fillStyle = INK; for (const [sx, sy, r] of [[0.66, 0.5, 4], [0.8, 0.44, 6], [0.9, 0.56, 3.5], [0.72, 0.36, 3], [0.88, 0.3, 4]]) star(g, sx * w, sy * h, r);
  },
  disc(g, w, h) {
    const cx = w / 2, cy = h * 0.52, r = Math.min(w, h) * 0.36;
    ground(g, cx, cy + r + 6, w * 0.7);
    const d = P(p => p.arc(cx, cy, r, 0, 7)); g.fillStyle = PAPER; g.fill(d);
    g.save(); g.clip(d); g.lineWidth = 0.8; g.globalAlpha = 0.7; for (let a = 0; a < 60; a++) { const t = -0.9 + a * 0.012 + (a > 30 ? 2.4 : 0); g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(t) * r, cy + Math.sin(t) * r); g.stroke(); } g.restore();
    line(g, d, 1.8); g.fillStyle = PAPER; g.beginPath(); g.arc(cx, cy, r * 0.34, 0, 7); g.fill(); g.stroke(); g.beginPath(); g.arc(cx, cy, r * 0.1, 0, 7); g.stroke();
    vacuum(g, cx, cy - r * 0.62, r * 0.2);
  },
  rockets(g, w, h) {
    ground(g, w / 2, h * 0.9, w * 0.7);
    for (const [x, y, a, s] of [[0.3, 0.62, -0.25, 1], [0.5, 0.56, 0.02, 1.15], [0.7, 0.64, 0.28, 0.95]]) {
      g.save(); g.translate(x * w, y * h); g.rotate(a); g.scale(s, s);
      g.lineWidth = 1.6; g.beginPath(); g.moveTo(5, 0); g.lineTo(5, h * 0.3); g.stroke();
      const body = P(p => p.rect(-8, -h * 0.2, 16, h * 0.2)), cone = P(p => { p.moveTo(-10, -h * 0.2); p.lineTo(0, -h * 0.31); p.lineTo(10, -h * 0.2); p.closePath(); });
      g.fillStyle = PAPER; g.fill(body); hatch(g, body, 0.9, 5, 0.9); line(g, body, 1.6); g.fill(cone); hatch(g, cone, 0, 2.4, 0.7); line(g, cone, 1.6);
      g.lineWidth = 1; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-7, 8, -3, 14); g.stroke();
      g.restore();
    }
    g.fillStyle = INK; for (const [sx, sy, r] of [[0.16, 0.2, 7], [0.5, 0.1, 9], [0.84, 0.18, 6], [0.3, 0.08, 3.5], [0.7, 0.06, 4], [0.92, 0.38, 3], [0.08, 0.4, 3]]) star(g, sx * w, sy * h, r);
  },
  // a ten-inch record, half out of its sleeve
  record(g, w, h) {
    const s = Math.min(w, h) * 0.56, x0 = w * 0.16, y0 = h * 0.2, cx = x0 + s * 0.86, cy = y0 + s / 2, r = s * 0.46;
    ground(g, w / 2, y0 + s + 5, w * 0.8);
    const disc = P(p => p.arc(cx, cy, r, 0, 7)); g.fillStyle = INK; g.fill(disc);
    g.strokeStyle = PAPER; g.lineWidth = 0.6; for (let k = 0.42; k < 0.98; k += 0.07) { g.beginPath(); g.arc(cx, cy, r * k, 0, 7); g.stroke(); } g.strokeStyle = INK;
    g.fillStyle = PAPER; g.beginPath(); g.arc(cx, cy, r * 0.34, 0, 7); g.fill(); g.stroke(); g.fillStyle = INK; g.beginPath(); g.arc(cx, cy, 2.2, 0, 7); g.fill();
    const sl = P(p => p.rect(x0, y0, s, s)); g.fillStyle = PAPER; g.fill(sl); hatch(g, sl, 0.78, 6, 0.3); line(g, sl, 1.8);
    g.fillStyle = PAPER; g.beginPath(); g.arc(x0 + s / 2, y0 + s / 2, s * 0.2, 0, 7); g.fill(); g.lineWidth = 1.2; g.stroke();
    g.fillStyle = INK; g.font = `italic ${Math.round(s * 0.12)}px ${FONT}`; g.textAlign = 'center'; g.fillText('78', x0 + s / 2, y0 + s / 2 + s * 0.04);
  },
  // a jigsaw: its box, and a few loose pieces. `thumb` (jigsaw.js) may paint the lid
  jigsaw(g, w, h, v, thumb) {
    const x0 = w * 0.14, y0 = h * 0.26, bw = w * 0.56, bh = h * 0.42, dx = w * 0.06, dy = h * 0.06;
    ground(g, w / 2, y0 + bh + 8, w * 0.8);
    const lid = P(p => p.rect(x0, y0, bw, bh)), sideP = P(p => { p.moveTo(x0, y0); p.lineTo(x0 + dx, y0 - dy); p.lineTo(x0 + bw + dx, y0 - dy); p.lineTo(x0 + bw + dx, y0 + bh - dy); p.lineTo(x0 + bw, y0 + bh); p.lineTo(x0 + bw, y0); p.closePath(); });
    hatch(g, sideP, 0.3, 3, 0.8); line(g, sideP, 1.6);
    g.fillStyle = PAPER; g.fill(lid);
    if (thumb) { g.save(); g.beginPath(); g.rect(x0 + 5, y0 + 5, bw - 10, bh - 10); g.clip(); g.translate(x0 + 5, y0 + 5); g.filter = 'grayscale(1) sepia(.55) contrast(1.15)'; try { thumb(g, bw - 10, bh - 10); } catch { /* the plain lid */ } g.restore(); g.filter = 'none'; }
    else hatch(g, P(p => p.rect(x0 + 6, y0 + 6, bw - 12, bh - 12)), -0.6, 5, 0.4);
    g.strokeStyle = INK; line(g, lid, 1.8);
    const piece = (x, y, a, s) => { g.save(); g.translate(x, y); g.rotate(a); g.scale(s, s); const p = P(q => { q.moveTo(-10, -10); q.lineTo(-3, -10); q.arc(0, -13, 3.6, 2.2, 0.94); q.lineTo(10, -10); q.lineTo(10, -3); q.arc(13, 0, 3.6, -2.5, 2.5); q.lineTo(10, 10); q.lineTo(3, 10); q.arc(0, 7, 3.6, 0.94, 2.2, true); q.lineTo(-10, 10); q.closePath(); }); g.fillStyle = PAPER; g.fill(p); hatch(g, p, 0.7, 3.4, 0.6); line(g, p, 1.3); g.restore(); };
    piece(w * 0.82, h * 0.5, 0.4, 1.1); piece(w * 0.86, h * 0.76, -0.5, 1); piece(w * 0.7, h * 0.84, 1.2, 0.95);
  },
};

// An engraving for the page: ink on the page's own paper. art = [kind, variant]; extra as the kind needs
export function engrave(g, w, h, art, extra) {
  g.clearRect(0, 0, w, h); g.strokeStyle = INK; g.fillStyle = INK; g.lineJoin = 'round'; g.lineCap = 'round';
  const f = ART[art?.[0]]; if (f) f(g, w, h, art[1], extra);
}

// ---- what is printed on the goods ---------------------------------------------------------------------
const wrap = (g, text, x, y, maxW, lh) => { const words = text.split(' '); let ln = ''; for (const wd of words) { if (g.measureText(ln + wd).width > maxW && ln) { g.fillText(ln.trim(), x, y); y += lh; ln = ''; } ln += wd + ' '; } g.fillText(ln.trim(), x, y); return y; };
const LABEL = {
  // the cup's sticker: what was ordered, in the bar's shorthand
  sticker(g, W, H, name) {
    g.fillStyle = '#fbf8f0'; g.fillRect(0, 0, W, H); g.fillStyle = '#1f1a17'; g.textAlign = 'left';
    g.font = `bold 15px ui-monospace, Menlo, monospace`; g.fillText('THE CATALOGUE · DEPT. 6', 12, 22);
    g.font = `bold 21px ui-monospace, Menlo, monospace`; wrap(g, name.toUpperCase(), 12, 50, W - 24, 23);
    g.font = `14px ui-monospace, Menlo, monospace`; g.fillText('FOR: THE HOUSE   ICE: YES', 12, H - 12);
  },
  tin(g, W, H) {
    g.fillStyle = '#1f3a5a'; g.fillRect(0, 0, W, H);
    const cols = ['#ff7ac8', '#ffd75e', '#7ae0ff', '#b693ff', '#8dffb0', '#ffffff'];
    for (let i = 0; i < 90; i++) { g.fillStyle = cols[i % cols.length]; star(g, (i * 97) % W, (i * 53) % H, 1.5 + (i * 7 % 5) * 0.7); }
    for (const x0 of [W * 0.25, W * 0.75]) {
      g.fillStyle = '#f6eedc'; g.beginPath(); g.ellipse(x0, H / 2, W * 0.19, H * 0.42, 0, 0, 7); g.fill(); g.strokeStyle = '#c9a45c'; g.lineWidth = 4; g.stroke();
      g.fillStyle = '#1f3a5a'; g.textAlign = 'center'; g.font = `bold 25px ${FONT}`; g.fillText('STARDUST', x0, H * 0.42); g.font = `italic 19px ${FONT}`; g.fillText('glittering koi food', x0, H * 0.62);
      g.fillStyle = '#e8743a'; g.beginPath(); g.ellipse(x0 - 8, H * 0.8, 22, 8, 0, 0, 7); g.fill(); g.beginPath(); g.moveTo(x0 + 12, H * 0.8); g.lineTo(x0 + 28, H * 0.72); g.lineTo(x0 + 28, H * 0.88); g.fill();
    }
  },
  treats(g, W, H) {
    g.fillStyle = '#e25a8a'; g.fillRect(0, 0, W, H);
    const cols = ['#ffd75e', '#7ae0ff', '#ffffff', '#8dffb0', '#b693ff', '#ff9a5e', '#ffc2dc'];
    for (let i = 0; i < 70; i++) { g.fillStyle = cols[i % cols.length]; star(g, (i * 89) % W, (i * 61) % H, 2 + (i * 5 % 4)); }
    g.fillStyle = '#fff8e8'; g.beginPath(); g.roundRect(18, 30, W - 36, 128, 14); g.fill();
    g.fillStyle = '#7a1f45'; g.textAlign = 'center'; g.font = `bold 42px ${FONT}`; g.fillText('REGINALD', W / 2, 84); g.font = `italic 44px ${FONT}`; g.fillText('Treats', W / 2 - 8, 134); g.font = `13px ${FONT}`; g.fillText('TM', W / 2 + 62, 112);
    // the gentleman on the box
    const cx = W / 2, cy = 236; g.fillStyle = '#2b2b30'; g.beginPath(); g.ellipse(cx, cy, 78, 50, 0, 0, 7); g.fill(); g.strokeStyle = '#b9bec4'; g.lineWidth = 3; g.beginPath(); g.ellipse(cx, cy - 6, 56, 33, 0, 0, 7); g.stroke();
    for (const s of [-1, 1]) { g.fillStyle = '#f6f3ec'; g.beginPath(); g.arc(cx + s * 22, cy + 24, 13, 0, 7); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(cx + s * 22 + 3, cy + 27, 6, 0, 7); g.fill(); }
    g.fillStyle = '#fff8e8'; g.font = `italic 19px ${FONT}`; g.fillText('assorted glitter · seven colours', W / 2, H - 22);
  },
  sleeve(g, W, H) {
    g.fillStyle = '#f1ead8'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#e25a8a'; g.fillRect(0, 0, W, 54); g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = `bold 22px 'Trebuchet MS', Verdana, sans-serif`; g.fillText('SIR REGINALD’S ROUNDS', W / 2, 35);
    const cx = W / 2, cy = 150; const gr = g.createRadialGradient(cx, cy, 8, cx, cy, 78); gr.addColorStop(0, '#f4f4f4'); gr.addColorStop(0.5, '#b9d7e8'); gr.addColorStop(0.75, '#e8c7dd'); gr.addColorStop(1, '#d8d8d8');
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, 78, 0, 7); g.fill(); g.fillStyle = '#f1ead8'; g.beginPath(); g.arc(cx, cy, 15, 0, 7); g.fill(); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, 78, 0, 7); g.stroke(); g.beginPath(); g.arc(cx, cy, 26, 0, 7); g.stroke();
    g.fillStyle = '#2a1c13'; g.font = `13px 'Trebuchet MS', Verdana, sans-serif`; g.fillText('a game for the home computer · twelve rooms', W / 2, H - 14);
  },
  rockets(g, W, H) {
    g.fillStyle = '#b8322a'; g.fillRect(0, 0, W, H); g.strokeStyle = '#f4d98a'; g.lineWidth = 4; g.strokeRect(8, 8, W - 16, H - 16);
    g.fillStyle = '#f4d98a'; g.textAlign = 'center'; g.font = `bold 44px ${FONT}`; g.fillText('ROCKETS', W / 2, 62); g.font = `italic 20px ${FONT}`; g.fillText('six · assorted · after dark', W / 2, 94);
    for (const [x, y] of [[26, 30], [W - 26, 30], [26, H - 26], [W - 26, H - 26]]) star(g, x, y, 9);
  },
  // a record sleeve: plain paper with the label showing through the round window. R: { title, by, label }
  record(g, W, H, R) {
    g.fillStyle = '#d9cdb2'; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(90,60,30,.07)'; for (let i = 0; i < 400; i++) g.fillRect((i * 131) % W, (i * 71) % H, 2, 1);
    g.strokeStyle = 'rgba(60,40,20,.45)'; g.lineWidth = 2; g.strokeRect(14, 14, W - 28, H - 28);
    const cx = W / 2, cy = H / 2, r = W * 0.24; g.fillStyle = '#17120f'; g.beginPath(); g.arc(cx, cy, r + 8, 0, 7); g.fill();
    g.fillStyle = R?.colour ?? '#7a1f1f'; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); g.fillStyle = '#17120f'; g.beginPath(); g.arc(cx, cy, 5, 0, 7); g.fill();
    g.fillStyle = '#f0dfae'; g.textAlign = 'center'; g.font = `bold 17px ${FONT}`; wrap(g, (R?.title ?? '').toUpperCase(), cx, cy - r * 0.42, r * 1.5, 18);
    g.font = `italic 14px ${FONT}`; wrap(g, R?.by ?? '', cx, cy + r * 0.38, r * 1.5, 15);
    g.fillStyle = '#3a2a1c'; g.font = `italic 19px ${FONT}`; g.fillText(R?.label ?? '', cx, H - 34);
  },
  // a jigsaw box lid. J: { title, pieces, thumb(g, w, h) }
  jigsaw(g, W, H, J) {
    g.fillStyle = J?.css ?? '#2f4a5a'; g.fillRect(0, 0, W, H);
    g.save(); g.translate(18, 18); try { J?.thumb?.(g, W - 36, H - 78); } catch { /* a plain lid */ } g.restore();
    g.strokeStyle = '#f0dfae'; g.lineWidth = 2; g.strokeRect(18, 18, W - 36, H - 78);
    g.fillStyle = '#f0dfae'; g.textAlign = 'center'; g.font = `bold 22px ${FONT}`; g.fillText((J?.title ?? '').toUpperCase(), W / 2, H - 32, W - 30); g.font = `italic 15px ${FONT}`; g.fillText(J?.pieces ?? '', W / 2, H - 12);
  },
};
export function drawLabel(g, W, H, kind, a) { LABEL[kind]?.(g, W, H, a); }

// The catalogue's own cover (the book on the telephone table, and the first page)
export function drawCover(g, W, H) {
  g.fillStyle = '#e9d9b4'; g.fillRect(0, 0, W, H);
  g.fillStyle = 'rgba(120,80,40,.06)'; for (let i = 0; i < 500; i++) g.fillRect((i * 131) % W, (i * 79) % H, 3, 1);
  g.strokeStyle = INK; g.lineWidth = 5; g.strokeRect(14, 14, W - 28, H - 28); g.lineWidth = 1.5; g.strokeRect(24, 24, W - 48, H - 48);
  g.fillStyle = INK; g.textAlign = 'center';
  g.font = `italic ${W * 0.07}px ${FONT}`; g.fillText('The', W / 2, H * 0.17);
  g.font = `bold ${W * 0.135}px ${FONT}`; g.fillText('ISLAND', W / 2, H * 0.29); g.fillText('CATALOGUE', W / 2, H * 0.4, W - 70);
  g.lineWidth = 2; g.beginPath(); g.moveTo(W * 0.2, H * 0.44); g.lineTo(W * 0.8, H * 0.44); g.stroke();
  g.font = `italic ${W * 0.052}px ${FONT}`; g.fillText('Goods of every description,', W / 2, H * 0.5); g.fillText('delivered to your porch', W / 2, H * 0.55);
  // a parcel tied with string
  const cx = W / 2, cy = H * 0.72, s = W * 0.15; g.lineWidth = 3; g.strokeRect(cx - s, cy - s * 0.7, s * 2, s * 1.4); hatch(g, P(p => p.rect(cx - s, cy - s * 0.7, s * 2, s * 1.4)), 0.7, 7, 0.35);
  g.lineWidth = 2; g.beginPath(); g.moveTo(cx, cy - s * 0.7); g.lineTo(cx, cy + s * 0.7); g.moveTo(cx - s, cy); g.lineTo(cx + s, cy); g.stroke();
  g.beginPath(); g.ellipse(cx - 13, cy - s * 0.7 - 9, 14, 8, -0.5, 0, 7); g.ellipse(cx + 13, cy - s * 0.7 - 9, 14, 8, 0.5, 0, 7); g.stroke();
  g.font = `${W * 0.042}px ${FONT}`; g.fillText('No. 114 · THE CHEAPEST SUPPLY HOUSE ON ANY ISLAND', W / 2, H * 0.93, W - 60);
}
