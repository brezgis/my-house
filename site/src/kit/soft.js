// Soft furnishings: upholstery, bedding, cushions, throws, curtains, towels and clothes.
// Everything is built in the piece's frame (x along, y depth with the front at +y, z up)
// and placed with K.put. Fabrics are textured: plain 'c#rrggbb' colours passed in by rooms
// are woven into linen (see fab in mats.js).

import { lathe, loft, sweep, softBox, pillow, sheet, drapeMap, extrude, merge, xf, tris, rng, TAU, bev } from './geom.js';
import { fab, WALNUT, BRASS, COTTON, TICKING, TERRY, OAK, shade } from './mats.js';

export function makeSoft(K) {
  const { put } = K;
  const R = (f, ...k) => rng(f.X, f.Y, f.h, f.q, ...k);

  // ---- parts ------------------------------------------------------------------------------
  // A short turned leg, foot at z = 0. r is the widest radius.
  const turnedLeg = (h, r) => lathe([[0, 0], [r * 0.62, 0], [r * 0.66, 0.035], [r * 0.6, 0.05], [r * 0.72, h * 0.3], [r * 0.95, h * 0.72], [r, h * 0.8], [r * 1.08, h * 0.86], [r * 1.08, h], [0, h]], { seg: 8 });
  const taperLeg = (h, r) => lathe([[0, 0], [r * 0.6, 0], [r * 0.62, 0.02], [r, h * 0.92], [r * 1.05, h], [0, h]], { seg: 4, th0: Math.PI / 4, th1: Math.PI / 4 + TAU });

  // A stuffed pillow standing on a seat, leaning back by tilt; (x, y, z) is its bottom middle.
  function cushion(f, x, y, z, w, h, colour = K.SAGE, o = {}) {
    const r = R(f, x, y, z), t = o.thick ?? Math.min(0.5, 0.3 * Math.min(w, h)), tilt = o.tilt ?? 0.4;
    const g = pillow(w, h, t, { n: o.n ?? 7, pinch: 0.08, dent: (o.dent ?? 0.05) * Math.min(1, Math.min(w, h) / 1.4), lump: 0.02, rng: r });
    const ry = (r() - 0.5) * 0.12 + (o.roll ?? 0);
    put(f, fab(colour, o.base ?? 'linen'), g, { rx: -Math.PI / 2 + tilt, ry, rz: o.turn ?? 0, at: [x, y + Math.sin(tilt) * h / 2 * 0, z + Math.cos(tilt) * h / 2] });
    if (o.piping) put(f, fab(o.piping), sweep(rectPath(w * 0.96, h * 0.96, 18), 0.014, { seg: 4 }), { rx: -Math.PI / 2 + tilt, ry, rz: o.turn ?? 0, at: [x, y, z + Math.cos(tilt) * h / 2] });
  }
  const rectPath = (w, h, n) => { const p = []; for (let i = 0; i <= n; i++) { const a = i / n * TAU, c = Math.cos(a), s = Math.sin(a); p.push([Math.sign(c) * Math.abs(c) ** 0.45 * w / 2, Math.sign(s) * Math.abs(s) ** 0.45 * h / 2, 0]); } return p; };

  // Cloth laid over a box top a by b (half sizes) at height z, centred on (cx, cy), hanging
  // l, r (along -x, +x), bk, fr (along -y, +y) feet over the edges. Returns hem points for fringe.
  function cloth(f, mat, o) {
    const a = o.a, b = o.b, l = o.l ?? 0, rr = o.r ?? 0, bk = o.bk ?? 0, fr = o.fr ?? 0, res = o.res ?? 0.2;
    const m = drapeMap(a, b, o.z, o.rho ?? 0.07, o.folds ?? 0.05, o.freq ?? 1.3, o.ph ?? 0);
    const s0 = -a - l, s1 = a + rr, t0 = -b - bk, t1 = b + fr;
    const lumps = o.lumps ?? 0, ph = o.ph ?? 0;
    const fn = (u, v) => {
      const s = s0 + (s1 - s0) * u, t = t0 + (t1 - t0) * v, p = m(s, t);
      if (lumps && Math.abs(s) <= a && Math.abs(t) <= b) {
        const e = Math.min(1, (a - Math.abs(s)) / 0.25, (b - Math.abs(t)) / 0.25);
        p[2] += lumps * e * (0.6 + 0.4 * Math.sin(s * 3.1 + ph) * Math.sin(t * 2.3 + ph * 2) + 0.25 * Math.sin(s * 7.3 + t * 5.1 + ph));
      }
      if (o.wrinkle && Math.abs(s) <= a && Math.abs(t) <= b) {
        const e = Math.min(1, (a - Math.abs(s)) / 0.2, (b - Math.abs(t)) / 0.2);
        p[2] += o.wrinkle * e * (1 + 0.6 * Math.sin(6.5 * s + 3.1 * t + ph) + 0.4 * Math.sin(-4.3 * s + 7.7 * t + 2 * ph));
      }
      if (o.warp) o.warp(p, s, t);
      return p;
    };
    const nu = Math.max(4, Math.ceil((s1 - s0) / res)), nv = Math.max(4, Math.ceil((t1 - t0) / res));
    const g = sheet(fn, nu, nv, { thick: o.thick ?? 0.03 });
    const T = { rz: o.rz ?? 0, at: [o.cx ?? 0, o.cy ?? 0, 0] };
    put(f, mat, g, T);
    if (o.fringe) {
      const strands = [], len = o.fringe;
      const edge = (side) => {
        const n = Math.round(((side === 'l' || side === 'r') ? t1 - t0 : s1 - s0) / 0.06);
        for (let i = 0; i <= n; i++) {
          const k = i / n;
          const [u, v, du, dv] = side === 'l' ? [0, k, 0.02, 0] : side === 'r' ? [1, k, -0.02, 0] : side === 'b' ? [k, 0, 0, 0.02] : [k, 1, 0, -0.02];
          const p = fn(u, v), q = fn(u + du, v + dv), d = [p[0] - q[0], p[1] - q[1], p[2] - q[2]], dl = Math.hypot(...d) || 1;
          const e = [p[0] + d[0] / dl * len, p[1] + d[1] / dl * len, p[2] + d[2] / dl * len];
          const sx = side === 'l' || side === 'r' ? [0, 0.008, 0] : [0.008, 0, 0];
          const a1 = [p[0] - sx[0], p[1] - sx[1], p[2]], a2 = [p[0] + sx[0], p[1] + sx[1], p[2]], b1 = [e[0] - sx[0], e[1] - sx[1], e[2]], b2 = [e[0] + sx[0], e[1] + sx[1], e[2]];
          strands.push(a1, a2, b2, a1, b2, b1, a1, b2, a2, a1, b1, b2);
        }
      };
      for (const s of o.fringeSides ?? ['l', 'r']) edge(s);
      put(f, mat, tris(strands), T);
    }
  }

  // ---- sofa and armchair ---------------------------------------------------------------------
  // The rolled arm of an English sofa, as an outline across its thickness (q = 0 at the outer face).
  function armOutline(armW, zb, zt) {
    const q = [[0.02, zb], [armW, zb], [armW, zt - 0.5], [armW - 0.015, zt - 0.3], [armW - 0.06, zt - 0.15], [armW - 0.15, zt - 0.05], [armW - 0.28, zt],
      [0.22, zt - 0.005], [0.1, zt - 0.04], [0.01, zt - 0.11], [-0.045, zt - 0.2], [-0.05, zt - 0.29], [-0.025, zt - 0.37], [0.01, zt - 0.43], [0.025, zt - 0.5]];
    return q;
  }
  function rolledArm(f, fabric, side, w, armW, d, zb, zt) {
    const q = armOutline(armW, zb, zt), X0 = side < 0 ? -w / 2 : w / 2, pts = q.map(([u, z]) => [X0 - side * u, z]);
    if (side > 0) pts.reverse();
    put(f, fabric, extrude(pts, 0.1, d - 0.05, { bevel: 0.035 }));
    const welt = q.slice(2).map(([u, z]) => [X0 - side * u, d - 0.035, z]);
    put(f, fabric, sweep(welt, 0.017, { seg: 5 }));
  }
  // Seat height about 1.55, deep loose cushions, rolled arms, turned walnut legs.
  function upholstered(f, w, d, fabric, n, o = {}) {
    const r = R(f, w, d), legH = 0.36, armW = o.armW ?? 0.62, armTop = o.armTop ?? 2.08, back = o.backTop ?? 2.6;
    const wood = o.legs ?? WALNUT;
    for (const x of [-w / 2 + 0.28, w / 2 - 0.28]) {
      put(f, wood, turnedLeg(legH + 0.02, 0.085), { at: [x, d - 0.32, 0] });
      put(f, wood, taperLeg(legH + 0.02, 0.07), { at: [x, 0.3, 0] });
    }
    put(f, fabric, softBox(-w / 2 + armW - 0.1, w / 2 - armW + 0.1, 0.35, d - 0.03, legH, 1.13, 0.09, { n: [4, 1, 1], welt: 0.012, noBottom: true }));
    put(f, fabric, softBox(-w / 2 + 0.04, w / 2 - 0.04, 0.02, 0.66, legH, back, 0.16, { n: [4, 1, 2], welt: 0.012, crown: 0.03, noBottom: true }));
    rolledArm(f, fabric, -1, w, armW, d, legH, armTop); rolledArm(f, fabric, 1, w, armW, d, legH, armTop);
    f.armTop = armTop + 0.08;                                  // where a throw over the arm rests (see throwBlanket)
    const sw = (w - 2 * armW) / n, cushions = [];
    for (let i = 0; i < n; i++) {
      const x0 = -w / 2 + armW + i * sw, sag = [[(r() - 0.5) * 0.8, 0.1 + r() * 0.3, 0.035 + r() * 0.03, 0.6]];
      put(f, fabric, softBox(x0 + 0.012, x0 + sw - 0.012, 0.6, d + 0.07, 1.08, 1.56, 0.13, { n: [2, 2, 1], crown: 0.07, bulge: 0.03, welt: 0.014, sag, noBottom: true }));
      const L = o.backL ?? 0.6, t = 0.6, tilt = 0.22;
      const bc = softBox(-sw / 2 + 0.03, sw / 2 - 0.03, -L, L, -t / 2, t / 2, 0.2, { n: [2, 2, 1], crown: 0.09, welt: 0.012, sag: [[(r() - 0.5) * 0.6, (r() - 0.5) * 0.6, 0.03, 0.5]] });
      put(f, fabric, bc, { rx: -Math.PI / 2 + tilt, at: [x0 + sw / 2, 0.98, 1.52 + L * Math.cos(tilt)] });
      cushions.push(x0 + sw / 2);
    }
    return { armW, cushions, sw };
  }

  // The sofa: deep, low, loose-cushioned, English rolled arms. Front faces the frame's front.
  // o: { throw: material or false, legs }
  function sofa(f, w, fabric = K.LINEN, pillows = [K.SAGE, K.RUST, K.CREAM], o = {}) {
    const d = 3.3, n = w > 6 ? 3 : 2, F = fab(fabric), r = R(f, w, 1);
    const { armW, cushions } = upholstered(f, w, d, F, n, o);
    pillows.forEach((c, i) => {
      const side = i % 2 ? 1 : -1, inner = i > 1, size = inner ? 1.25 : 1.5;
      const x = side * (w / 2 - armW - (inner ? 1.45 : 0.78));
      cushion(f, x, inner ? 1.75 : 1.45, 1.5, size, size, c, { tilt: inner ? 0.5 : 0.42, turn: side * (inner ? 0.18 : 0.08) + (r() - 0.5) * 0.1, base: 'linen' });
    });
    cushions.forEach(x => seat(f, x, 2.1, 1.6));
    if (o.throw !== false) cloth(f, fab(o.throw ?? 'wool#a39678'), { cx: w / 2 - armW / 2 + 0.02, cy: 1.95, z: f.armTop, a: armW / 2 - 0.08, b: 0.72, r: 0.95, l: 0.42, rho: 0.16, folds: 0.045, freq: 1.1, rz: 0.06, thick: 0.035, fringe: 0.1, fringeSides: ['l', 'r'], ph: r() * 6, res: 0.24 });
    f.block(-w / 2, w / 2, 0, d, 0, 2);
  }
  function seat(f, x, y, z, label) { K.seat(f, x, y, z, label); }

  // An armchair to match the sofa: one deep seat cushion, a loose back cushion, a pillow.
  function armchair(f, fabric = K.OAT, pillowColour, o = {}) {
    const w = 3, d = 3, F = fab(fabric);
    upholstered(f, w, d, F, 1, { armW: 0.56, armTop: 2.05, backTop: 2.68, backL: 0.62, ...o });
    if (pillowColour) cushion(f, 0, 1.55, 1.52, 1.25, 1.1, pillowColour, { tilt: 0.42 });
    K.seat(f, 0, 1.9, 1.6); f.block(-w / 2, w / 2, 0, d, 0, 2);
  }

  // ---- ottoman and pouf ----------------------------------------------------------------------
  // An upholstered ottoman on turned legs, centred at (x, y). o: { w, d, h, fabric, legs, tray }
  function ottoman(f, x, y, o = {}) {
    const w = o.w ?? 2.6, d = o.d ?? 1.8, h = o.h ?? 1.45, F = fab(o.fabric ?? K.OAT), legH = 0.3, s = f.sub(x, y);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) put(s, o.legs ?? WALNUT, turnedLeg(legH + 0.02, 0.07), { at: [sx * (w / 2 - 0.2), sy * (d / 2 - 0.2), 0] });
    put(s, F, softBox(-w / 2, w / 2, -d / 2, d / 2, legH, h, 0.12, { n: [3, 2, 1], crown: 0.05, bulge: 0.025, welt: 0.014, sag: [[0.2, 0.1, 0.025, 0.7]], noBottom: true }));
    if (o.tray) { put(s, OAK, bev(-w * 0.32, w * 0.32, -d * 0.3, d * 0.3, h + 0.04, h + 0.08, 0.01)); for (const [a, b, c, e] of [[-1, 0, 0.32, 0.02], [1, 0, 0.32, 0.02]]) put(s, OAK, bev(a * w * 0.32 - (a > 0 ? 0.04 : 0), a * w * 0.32 + (a < 0 ? 0.04 : 0), -d * 0.3, d * 0.3, h + 0.04, h + 0.2, 0.01)); }
    s.block(-w / 2, w / 2, -d / 2, d / 2, 0, Math.max(h, 1.5));
    if (o.seat !== false) K.seat(s, 0, 0, h - 0.05, 'sit on the ottoman');
  }
  // A round pouf: knitted wool (style 'knit') or stitched leather ('leather'), centred at (x, y).
  function pouf(f, x, y, o = {}) {
    const r = o.r ?? 0.85, h = o.h ?? 1.2, knit = (o.style ?? 'knit') === 'knit', mat = o.fabric ?? (knit ? 'wool#b9ad96' : 'leather');
    const prof = []; for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + i / 10 * Math.PI, c = Math.cos(a), s = Math.sin(a); prof.push([r * Math.pow(Math.max(0, c), 0.22), h / 2 + Math.sign(s) * Math.pow(Math.abs(s), 0.8) * h / 2]); }
    prof[0] = [0, 0.0]; prof[10] = [0, h];
    put(f, mat, lathe(prof, { seg: 28, mod: knit ? (t, j) => 1 + 0.035 * Math.abs(Math.sin(t * 9)) * Math.sin(j / 10 * Math.PI) : (t, j) => 1 - 0.012 * Math.cos(t * 16) * Math.sin(j / 10 * Math.PI) }), { at: [x, y, 0] });
    f.block(x - r, x + r, y - r, y + r, 0, Math.max(h, 1.5));
  }

  // ---- the bed -------------------------------------------------------------------------------
  // A bed with the head at the frame's back. Square posts with pyramid caps, slatted head and
  // foot (or headboard: 'upholstered' with o.fabric), a deep mattress, a duvet with its top turned
  // down, sleeping pillows and Euro shams, a quilt folded across the foot.
  // o: { sham, accent, headboard, fabric, wood, foot (false: no footboard), duvet }
  function bed(f, w, quilt = K.SAGE, o = {}) {
    const len = 6.9, wood = o.wood ?? 'fir', r = R(f, w, 2), uph = o.headboard === 'upholstered';
    const post = (x, y, h) => {
      put(f, wood, bev(x - 0.135, x + 0.135, y - 0.12, y + 0.12, 0, h, 0.02, { grain: 'z' }));
      put(f, wood, lathe([[0.19, 0], [0.19, 0.035], [0.17, 0.05], [0, 0.16]], { seg: 4, th0: Math.PI / 4, th1: Math.PI / 4 + TAU, sy: 0.89 }), { at: [x, y, h] });
    };
    if (uph) {
      const F = fab(o.fabric ?? 'linen#5d6b78'), hw = w / 2 + 0.25, top = 4.4;
      const ch = Math.max(5, Math.round(w / 0.55));
      put(f, F, softBox(-hw, hw, -0.05, 0.32, 0.95, top, 0.12, { n: [ch * 2, 1, 4], welt: 0.016, deform: (q, U, V, W) => { if (V > 0.2) q[1] += 0.035 * Math.abs(Math.cos(((q[0] + hw) / (2 * hw)) * ch * Math.PI)) * Math.min(1, (1 - Math.abs(W)) * 4); return q; } }));
      for (const x of [-hw + 0.15, hw - 0.15]) put(f, WALNUT, taperLeg(0.98, 0.09), { at: [x, 0.13, 0] });
    } else {
      for (const s of [-1, 1]) post(s * (w / 2 + 0.015), 0.1, 3.9);
      put(f, wood, bev(-w / 2, w / 2, 0.03, 0.17, 3.25, 3.72, 0.025, { grain: 'x' }));
      put(f, wood, bev(-w / 2 - 0.02, w / 2 + 0.02, 0.0, 0.2, 3.7, 3.8, 0.02, { grain: 'x' }));
      put(f, wood, bev(-w / 2, w / 2, 0.04, 0.16, 1.3, 1.6, 0.02, { grain: 'x' }));
      for (let x = -w / 2 + 0.35; x < w / 2 - 0.2; x += 0.5) put(f, wood, bev(x - 0.1, x + 0.1, 0.07, 0.13, 1.6, 3.25, 0.012, { grain: 'z' }));
    }
    if (o.foot !== false) {
      for (const s of [-1, 1]) post(s * (w / 2 + 0.015), len - 0.09, 2.2);
      put(f, wood, bev(-w / 2, w / 2, len - 0.16, len - 0.02, 1.8, 2.05, 0.02, { grain: 'x' }));
      put(f, wood, bev(-w / 2, w / 2, len - 0.15, len - 0.03, 0.7, 0.95, 0.02, { grain: 'x' }));
      for (let x = -w / 2 + 0.35; x < w / 2 - 0.2; x += 0.5) put(f, wood, bev(x - 0.1, x + 0.1, len - 0.12, len - 0.06, 0.95, 1.8, 0.012, { grain: 'z' }));
    }
    for (const s of [-1, 1]) put(f, wood, bev(s * (w / 2 - 0.02) - 0.06, s * (w / 2 - 0.02) + 0.06, 0.2, len - 0.18, 0.72, 1.22, 0.02, { grain: 'y' }));
    if (o.foot === false) {
      for (const s of [-1, 1]) put(f, uph ? WALNUT : wood, taperLeg(1.0, 0.1), { at: [s * (w / 2 - 0.08), len - 0.3, 0] });
      put(f, uph ? WALNUT : wood, bev(-w / 2, w / 2, len - 0.36, len - 0.24, 0.72, 1.08, 0.02, { grain: 'x' }));
    }
    // mattress and box spring
    put(f, TICKING, softBox(-w / 2 + 0.05, w / 2 - 0.05, 0.24, len - 0.33, 1.08, 1.5, 0.08, { n: [3, 6, 1], welt: 0.01, noBottom: true }));
    put(f, COTTON, softBox(-w / 2 + 0.04, w / 2 - 0.04, 0.22, len - 0.32, 1.48, 1.96, 0.12, { n: [4, 8, 1], welt: 0.012, crown: 0.02, noBottom: true }));
    // duvet, turned down at the head
    const duvet = fab(o.duvet ?? 'curtain#e9e4d9', 'curtain'), yTurn = 2.05, yFoot = len - 0.32, b = (yFoot - yTurn) / 2;
    cloth(f, duvet, { cx: 0, cy: yTurn + b, z: 2.04, a: w / 2 - 0.02, b, l: 0.72, r: 0.72, fr: o.foot === false ? 0.75 : 0.22, rho: o.foot === false ? 0.14 : 0.1, folds: 0.07, freq: 0.75, lumps: 0.075, wrinkle: 0.015, ph: r() * 6, thick: 0.07, res: 0.3 });
    cloth(f, duvet, { cx: 0, cy: yTurn + 0.42, z: 2.13, a: w / 2 + 0.04, b: 0.42, l: 0.45, r: 0.45, bk: 0.12, rho: 0.07, folds: 0.03, freq: 1.0, ph: r() * 6, thick: 0.05, res: 0.26 });
    // quilt folded across the foot
    cloth(f, fab(quilt, 'wool'), { cx: 0, cy: len - 1.35, z: 2.19, a: w / 2 + 0.06, b: 0.82, l: 0.62, r: 0.62, rho: 0.12, folds: 0.07, freq: 0.7, ph: r() * 6, lumps: 0.03, wrinkle: 0.02, thick: 0.05, res: 0.3, rz: (r() - 0.5) * 0.03 });
    // pillows: Euro shams standing at the back, sleeping pillows in front, an accent in the middle
    const np = w > 4.4 ? 2 : 1, pw = (w - 0.3) / np;
    for (let i = 0; i < np; i++) {
      const x = -w / 2 + 0.15 + (i + 0.5) * pw, sz = Math.min(2.15, pw - 0.08);
      cushion(f, x, 0.36 + (uph ? 0.3 : 0), 1.93, sz, sz, o.sham ?? K.LINEN, { tilt: 0.3, thick: 0.55, dent: 0.03, turn: (r() - 0.5) * 0.05 });
      const sp = pillow(Math.min(2.6, pw - 0.15), 1.6, 0.5, { n: 6, pinch: 0.06, dent: 0.07, lump: 0.02, rng: r });
      put(f, COTTON, sp, { rx: -0.25 + (r() - 0.5) * 0.08, rz: (r() - 0.5) * 0.06, at: [x, 1.05 + (uph ? 0.25 : 0), 2.34] });
    }
    if (o.accent) cushion(f, 0, 1.6 + (uph ? 0.25 : 0), 2.02, 1.6, 0.95, o.accent, { tilt: 0.3, thick: 0.34, dent: 0.0 });
    K.seat(f, 0, len - 1.2, 2.2, 'sit on the bed'); f.block(-w / 2, w / 2, 0, len, 0, 2.2);
  }

  // ---- throws, quilts, cloths ----------------------------------------------------------------------
  // A throw blanket laid over x0..x1, y0..y1 at height z. Without o it lies there with soft folds,
  // its fringe hanging off the y0 edge and a fold turned back at y1. o.over: 'arm' (hangs both
  // x ends), 'foot' (laid across, hanging down both x sides), 'front' (hangs off the +y edge), or
  // give drops { l, r, f, b } in feet. o.fringe: strand length (0 for none).
  function throwBlanket(f, x0, x1, y0, y1, z, mat = K.OAT, o = {}) {
    const r = R(f, x0, y0, z), M = fab(mat, o.base ?? 'wool');
    if (o.over === 'arm' && f.armTop) z = Math.max(z, f.armTop - 0.02);   // rest on the arm of the sofa or chair built in this frame
    const a = (x1 - x0) / 2, b = (y1 - y0) / 2, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    let d = o.drop ?? (o.over === 'arm' ? { l: 0.7, r: 0.7 } : o.over === 'foot' ? { l: 0.6, r: 0.6 } : o.over === 'front' ? { f: 0.8 } : { b: 0.25 });
    const sides = o.over === 'front' ? ['f'] : d.l || d.r ? ['l', 'r'] : ['b'];
    cloth(f, M, { cx, cy, z: z + 0.02, a, b, l: d.l, r: d.r, fr: d.f, bk: d.b, rho: o.rho ?? (o.over === 'arm' ? 0.14 : o.over === 'foot' ? 0.1 : 0.05), folds: o.folds ?? 0.05, freq: 1.1, lumps: o.over ? 0.015 : 0.03, wrinkle: o.wrinkle ?? 0.022, res: 0.18, ph: r() * 6, thick: 0.035, fringe: o.fringe ?? 0.1, fringeSides: o.fringeSides ?? sides, rz: o.rz ?? 0 });
    if (!o.over && !o.drop) cloth(f, M, { cx, cy: y1 - 0.25, z: z + 0.07, a: a - 0.03, b: 0.25, fr: 0.06, rho: 0.03, folds: 0.01, thick: 0.03, res: 0.15, ph: r() * 6 });
  }
  // A table or bed cloth: a plain cloth over a box top centred at (x, y), half sizes a, b.
  const tablecloth = (f, x, y, z, a, b, mat = COTTON, drop = 0.6, o = {}) => cloth(f, fab(mat, 'curtain'), { cx: x, cy: y, z: z + 0.012, a, b, l: drop, r: drop, fr: drop, bk: drop, rho: 0.04, folds: o.folds ?? 0.03, freq: 1.4, thick: 0.015, ph: 1 });

  // ---- curtains -------------------------------------------------------------------------------------
  // Two pinch-pleated panels on rings and an iron rod. The frame sits on the wall face, front toward
  // the room; x0..x1 is the window opening, z0..z1 the hem and the rod.
  // o.maxLeft / o.maxRight: how far (feet) the rod and panel may reach past x0 / x1 before meeting a
  // wall (a window at a room corner: 0.1). Default: panels 0.55 past the opening, rod 0.78, finials.
  function drapes(f, x0, x1, z0, z1, mat = 'drape', o = {}) {
    const r = R(f, x0, z1), gather = o.gather ?? Math.min(1.5, 0.5 + (x1 - x0) * 0.13), out = 0.22, rodZ = z1 + 0.06, rod = o.rod ?? 'c#2a211a/0.5/0.5';
    const eL = o.maxLeft ?? Infinity, eR = o.maxRight ?? Infinity, pL = Math.min(0.55, eL - 0.04), pR = Math.min(0.55, eR - 0.04), rL = Math.min(0.78, eL - 0.03), rR = Math.min(0.78, eR - 0.03);
    put(f, rod, sweep([[x0 - rL, out, rodZ], [x1 + rR, out, rodZ]], 0.04, { seg: 8, caps: true }));
    for (const [x, ok] of [[x0 - 0.86, eL >= 0.9], [x1 + 0.86, eR >= 0.9]]) if (ok) put(f, rod, lathe([[0, -0.1], [0.05, -0.08], [0.075, -0.02], [0.06, 0.05], [0.025, 0.09], [0.035, 0.12], [0, 0.14]], { seg: 8 }), { ry: Math.PI / 2 * Math.sign(x - x0 - 0.1), at: [x + (x < x0 ? 0.1 : -0.1), out, rodZ] });
    for (const x of [x0 - Math.min(0.55, rL - 0.06), x1 + Math.min(0.55, rR - 0.06)]) { put(f, rod, sweep([[x, 0.0, rodZ], [x, out, rodZ]], 0.022, { seg: 6 })); put(f, rod, lathe([[0, 0], [0.07, 0], [0.07, 0.02], [0, 0.02]], { seg: 10 }), { rx: -Math.PI / 2, at: [x, 0.02, rodZ] }); }
    const ring = lathe(Array.from({ length: 4 }, (_, i) => { const a = i / 3 * TAU; return [0.065 + 0.012 * Math.cos(a), 0.012 * Math.sin(a)]; }), { seg: 7 });
    for (const [a, b] of [[x0 - pL, x0 - pL + gather], [x1 + pR - gather, x1 + pR]]) {
      const width = b - a, folds = Math.max(3, Math.round(width / 0.3)), ph = r() * 6, top = z1 - 0.03, H = top - z0;
      const nu = folds * 4, nv = Math.max(4, Math.round(H / 1.2));
      const g = sheet((u, v) => {
        const z = top - H * v, deep = 0.035 + 0.075 * Math.min(1, v * 1.6), flare = 0.06 * v * v;
        const x = a + width * u + (u - 0.5) * flare, w = Math.sin(u * folds * Math.PI * 2 + ph * 0.2) * (1 + 0.15 * Math.sin(u * 7 + ph));
        return [x, out - 0.02 + deep * (0.6 + 0.5 * w) + 0.012 * Math.sin(v * 5 + u * 11 + ph), z];
      }, nu, nv, {});
      put(f, mat, g);
      put(f, mat, sheet((u, v) => {                                        // the hem, turned up and stitched
        const z = z0 + 0.22 * v, x = a + width * u + (u - 0.5) * 0.06 * (1 - 0.05 * v);
        const w = Math.sin(u * folds * Math.PI * 2 + ph * 0.2) * (1 + 0.15 * Math.sin(u * 7 + ph)), deep = 0.11;
        return [x, out - 0.02 + deep * (0.6 + 0.5 * w) + 0.012 * Math.sin(1 * 5 + u * 11 + ph) + 0.012, z];
      }, nu, 1, {}));
      for (let k = 0; k <= folds; k++) put(f, rod, ring.clone(), { ry: Math.PI / 2, at: [a + width * k / folds, out, rodZ] });
    }
  }

  // ---- towels, mats, laundry ---------------------------------------------------------------------------
  // A towel folded in thirds and hung over a rail running along x at (y, z): front hangs down
  // drop feet, back a little less. w: towel width along the rail.
  function hangingTowel(f, x, y, z, w = 1.5, drop = 1.3, colour = TERRY, o = {}) {
    const r = R(f, x, z);
    cloth(f, fab(colour, 'wool'), { cx: x, cy: y, z: z + (o.rail ?? 0.035), a: w / 2, b: 0.001, fr: drop, bk: drop * (o.back ?? 0.75), rho: (o.rail ?? 0.035) + 0.02, folds: 0.025, freq: 1.4, ph: r() * 6, thick: 0.05, res: 0.14 });
  }
  // A stack of folded towels or linen at (x, y, z): n pieces, w by d each.
  function foldedStack(f, x, y, z, n = 3, colours = [TERRY], o = {}) {
    const r = R(f, x, y, z), w = o.w ?? 1.1, d = o.d ?? 0.8, t = o.t ?? 0.16;
    let h = z;
    for (let i = 0; i < n; i++) {
      const c = colours[i % colours.length], tt = t * (0.85 + r() * 0.3), dx = (r() - 0.5) * 0.06, dy = (r() - 0.5) * 0.05;
      put(f, fab(c, o.base ?? 'wool'), softBox(-w / 2, w / 2, -d / 2, d / 2, 0, tt, Math.min(tt / 2 - 0.002, 0.07), { k: 2, n: [2, 1, 1], crown: 0.01, bulge: 0.01, sag: [[0.4, 0, 0.012, 0.5]] }), { rz: (r() - 0.5) * 0.06, at: [x + dx, y + dy, h] });
      h += tt - 0.006;
    }
    return h;
  }
  // A thick bath mat or bedside rug centred at (x, y): w by d.
  function bathMat(f, x, y, w = 2.4, d = 1.6, colour = TERRY, o = {}) {
    const r = R(f, x, y);
    put(f, fab(colour, o.base ?? 'wool'), softBox(-w / 2, w / 2, -d / 2, d / 2, 0.005, 0.07, 0.03, { n: [5, 4, 1], noBottom: true, deform: (q) => { q[2] += 0.006 * Math.sin(q[0] * 9 + r() * 0.1) * Math.sin(q[1] * 7); return q; } }), { rz: o.turn ?? 0, at: [x, y, 0] });
  }

  // ---- clothes -------------------------------------------------------------------------------------
  // One garment on a wooden hanger, hook at (0, 0, 0), hanging down; the broad side faces +-x,
  // shoulders along y. kind: 'shirt' | 'dress' | 'coat' | 'jacket' | 'trousers' | 'sweater'.
  function garment(kind, r) {
    const L = { shirt: 2.45, dress: 3.7, coat: 3.35, jacket: 2.4, trousers: 2.0, sweater: 2.2 }[kind] ?? 2.4;
    const thick = { coat: 0.12, jacket: 0.09, sweater: 0.08, dress: 0.06, trousers: 0.05 }[kind] ?? 0.05;
    const sh = kind === 'dress' ? 0.5 : kind === 'coat' ? 0.74 : 0.68, hem = kind === 'dress' ? 0.95 : kind === 'coat' ? 0.8 : kind === 'sweater' ? 0.55 : sh * 0.9;
    const waist = kind === 'dress' ? 0.36 : kind === 'sweater' ? 0.6 : sh * 0.86, top = -0.22, N = 9, ph = r() * 6;
    const rows = [];
    if (kind === 'trousers') {
      for (let j = 0; j <= 5; j++) { const z = top - 0.12 - (L - 0.2) * (1 - j / 5); rows.push({ a: thick, b: 0.42 - 0.06 * (1 - j / 5), z }); }
    } else {
      for (let j = 0; j <= N; j++) {
        const k = j / N, z = top - L * (1 - k);                                       // k = 0 hem, 1 collar
        let b = k < 0.55 ? hem + (waist - hem) * Math.sin(k / 0.55 * Math.PI / 2) : k < 0.8 ? waist + (sh - waist) * (k - 0.55) / 0.25 : 0.17 + (sh - 0.17) * (1 - ((k - 0.8) / 0.2) ** 1.7);
        const a = thick * (k > 0.9 ? 0.75 : k < 0.3 ? 0.8 : 1);
        rows.push({ a, b, z });
      }
    }
    const parts = [loft(rows, { seg: 10, e: 2.6, warp: (p, t, j) => { const k = j / (rows.length - 1); p[0] += (1 - k) ** 1.4 * 0.045 * Math.sin(p[1] * 8 + ph) * (kind === 'dress' ? 2 : 1); return p; } })];
    if (kind !== 'dress' && kind !== 'trousers') {
      const cuff = kind === 'sweater' ? 0.35 : kind === 'shirt' ? 0.3 : 0.28;
      for (const s of [-1, 1]) { const z1 = top - L * 0.2 + 0.02, z0 = top - L * (1 - cuff); parts.push(loft([[0, 0.1], [0.5, 0.12], [0.85, 0.13], [0.97, 0.09], [1, 0.03]].map(([t, b]) => ({ a: thick * 0.7 + 0.015, b, x: 0.03, y: s * (sh - 0.13 + 0.05 * (1 - t)), z: z0 + (z1 - z0) * t })), { seg: 5 })); }
    }
    if (kind === 'coat' || kind === 'jacket') parts.push(loft([{ a: 0.005, b: 0.012, z: top - L * 0.98 }, { a: 0.005, b: 0.012, z: top - L * 0.22 }].map(q => ({ ...q, x: thick * 0.98 })), { seg: 4 }));
    const hanger = sweep([[0, -0.66, -0.3], [0, -0.35, -0.2], [0, 0, -0.14], [0, 0.35, -0.2], [0, 0.66, -0.3]], 0.03, { seg: 6, caps: true });
    const hook = sweep([[0, 0, -0.14], [0, 0, -0.05], [0, 0.03, 0.02], [0, 0.07, 0.05], [0, 0.11, 0.02], [0, 0.1, -0.02]], 0.01, { seg: 4 });
    return { cloth: merge(parts), hanger, hook };
  }
  const CLOTHES = ['linen#e8e1d3', 'linen#9aa7b4', 'linen#3c4a5e', 'wool#6d6a64', 'linen#b9a07a', 'wool#4a3b33', 'linen#c9b9a6', 'velvet#5b2f33', 'linen#6f7d64', 'wool#2e2f33', 'linen#d9cdb8', 'linen#a35d46'];
  // Clothes on hangers along a rail from x0 to x1, the rail at (y, z). o: { kinds, colours, gap }
  function clothes(f, x0, x1, y, z, o = {}) {
    const r = R(f, x0, y, z), kinds = o.kinds ?? ['shirt', 'shirt', 'dress', 'jacket', 'coat', 'shirt', 'trousers', 'sweater'], cols = o.colours ?? CLOTHES;
    const hangers = [], hooks = [];
    for (let x = x0 + 0.2; x < x1 - 0.1;) {
      const kind = kinds[Math.floor(r() * kinds.length)], g = garment(kind, r), th = { coat: 0.3, jacket: 0.24, sweater: 0.22 }[kind] ?? 0.16;
      x += th / 2; if (x > x1 - 0.1) break;
      const T = { rz: (r() - 0.5) * 0.25, at: [x, y, z] };
      put(f, cols[Math.floor(r() * cols.length)], g.cloth, T);
      hangers.push(xf(g.hanger, T)); hooks.push(xf(g.hook, T));
      x += th / 2 + (o.gap ?? 0.07) + r() * 0.08;
    }
    if (hangers.length) { put(f, o.hanger ?? 'oak_light#b08a60', merge(hangers)); put(f, o.hook ?? 'c#9a9590/0.3/1', merge(hooks)); }
  }
  // A coat on a peg: hangs from the peg at (x, y, z) with its back to the wall (broad side toward +y).
  function coatOnPeg(f, x, y, z, colour = 'wool#4a4038', kind = 'coat', o = {}) {
    const r = R(f, x, z), g = garment(kind, r);
    put(f, fab(colour, 'wool'), g.cloth, { rz: Math.PI / 2 + (r() - 0.5) * 0.15, s: [o.squash ?? 1.6, 1, 1], at: [x, y + 0.1, z + 0.18] });
  }
  // A scarf over a peg or rail at (x, y, z), its two tails hanging; along: the rail direction.
  function scarf(f, x, y, z, colour = 'wool#8a3b2c', o = {}) {
    const r = R(f, x, y, z), l1 = o.l1 ?? 1.6, l2 = o.l2 ?? 1.25, wd = o.w ?? 0.55, t = 0.025, M = fab(colour, 'wool');
    const shape = [[-wd / 2, -t], [wd / 2, -t], [wd / 2, t], [-wd / 2, t]], p = [], sx = (r() - 0.5) * 0.1;
    for (let i = 0; i <= 6; i++) p.push([sx * i / 6 + 0.015 * Math.sin(i), -0.07, -l1 + l1 * i / 6]);
    for (let i = 1; i < 6; i++) { const a = i / 6 * Math.PI; p.push([0, -0.07 * Math.cos(a), 0.07 * Math.sin(a)]); }
    for (let i = 0; i <= 6; i++) p.push([-sx * i / 6 + 0.015 * Math.sin(i * 1.3), 0.07, -l2 * i / 6]);
    const T = { rz: o.turn ?? 0, at: [x, y, z] };
    put(f, M, sweep(p, 1, { shape, up: [1, 0, 0] }), T);
    if (o.fringe !== false) {
      const st = [];
      for (const [yy, L] of [[-0.07, l1], [0.07, l2]]) for (let i = 0; i <= 8; i++) {
        const xx = -wd / 2 + wd * i / 8, a = [xx - 0.006, yy, -L], b = [xx + 0.006, yy, -L], c = [xx, yy, -L - 0.09];
        st.push(a, b, c, a, c, b);
      }
      put(f, M, tris(st), T);
    }
  }
  // A hat: 'fedora' or 'beanie' or 'cloche', resting with its crown up at (x, y, z).
  function hat(f, x, y, z, kind = 'fedora', colour = 'wool#5a4a3c', o = {}) {
    let g;
    if (kind === 'fedora') g = lathe([[0, 0.02], [0.34, 0.02], [0.36, 0.035], [0.34, 0.045], [0.24, 0.05], [0.22, 0.1], [0.21, 0.3], [0.17, 0.36], [0.06, 0.33], [0, 0.35]], { seg: 18, sy: 0.88, mod: (t, j) => j >= 7 ? 1 - 0.12 * Math.max(0, Math.cos(t * 2)) : 1 });
    else if (kind === 'cloche') g = lathe([[0, 0], [0.26, 0], [0.3, 0.04], [0.24, 0.1], [0.22, 0.25], [0.15, 0.36], [0, 0.39]], { seg: 16, sy: 0.9 });
    else g = lathe([[0, 0], [0.24, 0], [0.25, 0.1], [0.24, 0.22], [0.17, 0.36], [0.07, 0.42], [0, 0.43]], { seg: 14, mod: (t) => 1 + 0.02 * Math.sin(t * 24) });
    put(f, fab(colour, 'wool'), g, { rx: o.tilt ?? 0, rz: o.turn ?? 0, at: [x, y, z] });
    if (kind === 'fedora') put(f, 'c#2a2420/0.8', lathe([[0.222, 0.05], [0.218, 0.12]], { seg: 18, sy: 0.88 }), { rx: o.tilt ?? 0, rz: o.turn ?? 0, at: [x, y, z + 0.001] });
  }

  // ---- shoes ------------------------------------------------------------------------------------------
  // One shoe, toe toward +y, sole at z = 0. kind: 'loafer' | 'boot' | 'sneaker' | 'flat' | 'slipper'.
  function shoeGeo(kind) {
    const L = kind === 'flat' ? 0.82 : 0.95, Hh = kind === 'sneaker' ? 1.25 : kind === 'flat' ? 0.75 : kind === 'slipper' ? 1.1 : 1;
    // [k along the foot, half-width, half-height]; the sole is below z = 0.02
    const prof = [[0, 0, 0.075], [0.02, 0.1, 0.09], [0.12, 0.125, 0.1], [0.35, 0.135, 0.095], [0.6, 0.16, 0.085], [0.78, 0.155, 0.07], [0.9, 0.13, 0.055], [0.97, 0.09, 0.04], [1, 0.02, 0.03]];
    const ring = (k, a, b, z0 = 0.02) => ({ a, b: b * Hh, z: k * L, y: -(z0 + b * Hh) });
    const upper = xf(loft(prof.map(([k, a, b]) => ring(k, a, b)), { seg: 10, e: 2.4 }), { rx: -Math.PI / 2 });
    const st = kind === 'sneaker' ? 0.05 : 0.025;
    const sole = xf(loft(prof.map(([k, a]) => ({ a: a ? a * 1.05 + 0.008 : 0, b: st / 2, z: k * L * 1.01 - 0.005, y: -st / 2 })), { seg: 10, e: 3.2 }), { rx: -Math.PI / 2 });
    const open = prof.slice(1, 5).map(([k, a, b], i) => { const kk = 0.04 + i * 0.13, s = i === 0 || i === 3 ? 0.001 : 1; return { a: a * 0.72 * s, b: b * Hh * 0.75 * s, z: kk * L, y: -(0.02 + b * Hh + 0.25 * b * Hh + 0.004) }; });
    const parts = { upper, sole, hole: xf(loft(open, { seg: 10, e: 2.4 }), { rx: -Math.PI / 2 }) };
    if (kind === 'boot') parts.shaft = lathe([[0.12, 0.12], [0.125, 0.5], [0.12, 0.85], [0.105, 0.86], [0.1, 0.4]], { seg: 12, sy: 1.15, y: 0.2 * L });
    return parts;
  }
  const SHOE = { loafer: ['leather', 'c#2a1d16/0.7'], boot: ['leather#5a3a28', 'c#1f1813/0.8'], sneaker: ['linen#e9e5dc', 'c#e8e4dc/0.7'], flat: ['leather#2a2a2a', 'c#1a1714/0.7'], slipper: ['wool#a89a88', 'c#5a4a3e/0.9'] };
  // A pair of shoes at (x, y, z), toes toward +y (turn: extra yaw). colour overrides the upper.
  function shoes(f, x, y, z = 0, kind = 'loafer', colour, o = {}) {
    const r = R(f, x, y, z), g = shoeGeo(kind), [up, so] = SHOE[kind] ?? SHOE.loafer, U = colour ? fab(colour, 'leather') : up;
    for (const s of [-1, 1]) {
      const T = { rz: (o.turn ?? 0) + s * 0.06 + (r() - 0.5) * 0.12, at: [x + s * 0.2 + (r() - 0.5) * 0.03, y + (r() - 0.5) * 0.08, z] };
      put(f, U, g.upper.clone(), T); put(f, so, g.sole.clone(), T); put(f, 'c#2a231e/0.9', g.hole.clone(), T);
      if (g.shaft) put(f, U, g.shaft.clone(), T);
    }
  }
  const slippers = (f, x, y, z = 0, colour, o) => shoes(f, x, y, z, 'slipper', colour, o);

  // A canvas tote bag standing at (x, y, z), front toward +y; draw(g, w, h) prints its front.
  function toteBag(f, x, y, z = 0, colour = 'linen#d8ccb4', o = {}) {
    const w = o.w ?? 1.25, h = o.h ?? 1.3, d = 0.35, s = f.sub(x, y, z), r = R(f, x, y);
    put(s, fab(colour), softBox(-w / 2, w / 2, -d / 2, d / 2, 0, h, 0.06, { n: [3, 1, 3], bulge: 0.05, taper: -0.05, sag: [[0, 0, 0.0, 0.5]], deform: (q, U, V, W) => { if (W > 0.3) q[1] *= 1 - (W - 0.3) * 0.6; return q; } }), { rz: (r() - 0.5) * 0.2 });
    for (const sy of [-1, 1]) { const p = []; for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI; p.push([-0.3 * Math.cos(a), sy * d * 0.3, h + 0.75 * Math.sin(a) * (sy > 0 ? 1 : 0.92)]); } put(s, fab(colour), sweep(p, 1, { shape: [[0.02, -0.06], [0.02, 0.06], [-0.02, 0.06], [-0.02, -0.06]].map(([a, b]) => [a * 0.6, b * 0.6]), up: [0, 1, 0] }), { rz: (r() - 0.5) * 0.2, rx: sy * 0.15 }); }
    if (o.draw) K.sign(s, 0, d / 2 + 0.05, h * 0.5, w * 0.7, h * 0.55, o.draw, { cw: 256, ch: 256 });
  }

  return { cushion, cloth, sofa, armchair, ottoman, pouf, bed, throwBlanket, tablecloth, drapes, hangingTowel, foldedStack, bathMat, garment, clothes, coatOnPeg, scarf, hat, shoes, slippers, toteBag, turnedLeg, taperLeg };
}
