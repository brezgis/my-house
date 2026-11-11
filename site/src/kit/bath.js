// The bathroom: a claw-foot slipper bath with real depth and water, a pedestal basin, a washstand
// vanity with a sunk basin, a close-coupled toilet with a wooden seat, towel rails with towels, and
// mirrors. Porcelain is glossy, brass is unlacquered, the bath's outside is painted.

import { lathe, loft, sweep, bev, softBox, extrude, moulding, merge, xf, rng, TAU } from './geom.js';
import { fab, woodOf, OAK, BRASS, PORCELAIN, GLASS, MIRROR, TERRY, PAINT_GREEN, shade } from './mats.js';

export function makeBath(K) {
  const { put } = K;
  const R = (f, ...k) => rng(f.X, f.Y, f.h, ...k);
  const ENAMEL_IN = 'c#f1ede4/0.12';

  // ---- the bath --------------------------------------------------------------------------------
  // A double-ended slipper bath on ball-and-claw feet, long side along x, centred at (0, o.y) (1.5:
  // its back 0.25 off the wall), rim at o.rim (2.1). o: { len 5.4, w 2.5, outside (paint), feet
  // (metal), water (true), ends: 'double' | 'slipper' | 'flat', taps: 'end' | false }
  function clawTub(f, o = {}) {
    const L = o.len ?? 5.4, W = o.w ?? 2.5, cy = o.y ?? W / 2 + 0.25, A = L / 2, B = W / 2, z0 = 0.5, rz = o.rim ?? 2.1;
    const lift = o.ends === 'flat' ? 0 : 0.28, one = o.ends === 'slipper';
    const outer = [[B - 0.004, z0 + 0.02], [0.62, z0], [0.44, z0 + 0.025], [0.3, z0 + 0.1], [0.17, z0 + 0.33], [0.085, z0 + 0.7], [0.03, rz - 0.45], [0.0, rz - 0.2],
      [-0.035, rz - 0.13], [-0.05, rz - 0.07], [-0.045, rz - 0.02], [-0.025, rz + 0.012], [0.008, rz + 0.025]];
    const inner = [[0.008, rz + 0.025], [0.04, rz + 0.015], [0.062, rz - 0.025], [0.078, rz - 0.09], [0.1, rz - 0.35], [0.15, z0 + 0.78], [0.25, z0 + 0.36], [0.38, z0 + 0.17], [0.56, z0 + 0.1], [B - 0.004, z0 + 0.1]];
    const rows = list => list.map(([s, z]) => ({ a: A - s, b: Math.max(0.004, B - s), z, y: cy }));
    const lf = (t, j, r) => { const k = Math.max(0, Math.min(1, (r.z - z0 - 0.55) / (rz - z0 - 0.55))); const c = Math.cos(t); return lift * k * k * (one ? Math.max(0, c) ** 4 : Math.abs(c) ** 4); };
    const opt = { seg: 44, e: 2.35, lift: lf };
    put(f, o.outside ?? 'c#2f3f37/0.3', loft(rows(outer), opt));
    put(f, o.inside ?? ENAMEL_IN, loft(rows(inner), opt));
    if (o.water !== false) {
      const wz = z0 + 0.95, s = 0.135;
      put(f, GLASS, loft([{ a: A - s, b: B - s, z: wz, y: cy }, { a: A - B + 0.01, b: 0.004, z: wz, y: cy }], { seg: 44, e: 2.35 }));
    }
    // feet: a leg out of the belly, a ball, four talons
    const fm = o.feet ?? BRASS;
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      const px = sx * (A - 0.9), py = cy + sy * (B - 0.62), dx = sx * 0.75, dy = sy * 0.66, n = Math.hypot(dx, dy), ux = dx / n, uy = dy / n;
      const bx = px + ux * 0.2, by = py + uy * 0.2, bz = 0.1, parts = [];
      parts.push(sweep([[px, py, z0 + 0.12], [px + ux * 0.06, py + uy * 0.06, 0.48], [px + ux * 0.14, py + uy * 0.14, 0.32], [bx, by, 0.2]], t => 0.085 - 0.04 * t, { seg: 8 }));
      parts.push(xf(lathe(Array.from({ length: 7 }, (_, i) => { const a = -Math.PI / 2 + i / 6 * Math.PI; return [0.095 * Math.cos(a), 0.095 * Math.sin(a)]; }), { seg: 10 }), { at: [bx, by, bz] }));
      for (const k of [-1.2, -0.4, 0.4, 1.2]) {
        const c = Math.cos(k), s = Math.sin(k), dirx = ux * c - uy * s, diry = ux * s + uy * c, p = [];
        for (const el of [1.1, 0.75, 0.3, -0.15, -0.55, -0.85]) p.push([bx + dirx * 0.115 * Math.cos(el), by + diry * 0.115 * Math.cos(el), bz + 0.115 * Math.sin(el) + (el > 1 ? 0.03 : 0)]);
        p.push([bx + dirx * 0.07, by + diry * 0.07, 0.005]);
        parts.push(sweep(p, t => 0.032 - 0.022 * t, { seg: 5 }));
      }
      put(f, fm, merge(parts));
    }
    if (o.taps !== false) {
      const tx = A + 0.32, parts = [];
      for (const sy of [-1, 1]) {
        const ty = cy + sy * 0.22;
        parts.push(xf(lathe([[0, 0], [0.1, 0], [0.1, 0.03], [0.04, 0.06], [0, 0.06]], { seg: 12 }), { at: [tx, ty, 0] }));
        parts.push(sweep([[tx, ty, 0.03], [tx, ty, rz + 0.3]], 0.032, { seg: 8 }));
        parts.push(xf(lathe([[0, 0], [0.05, 0], [0.045, 0.1], [0, 0.1]], { seg: 8 }), { at: [tx, ty, rz + 0.3] }));
        for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + Math.PI / 4; parts.push(sweep([[tx, ty, rz + 0.38], [tx + Math.cos(a) * 0.11, ty + Math.sin(a) * 0.11, rz + 0.4]], 0.012, { seg: 4 })); }
      }
      parts.push(sweep([[tx, cy - 0.22, rz + 0.18], [tx, cy + 0.22, rz + 0.18]], 0.035, { seg: 8 }));
      parts.push(xf(lathe([[0, -0.08], [0.07, -0.06], [0.08, 0.06], [0, 0.1]], { seg: 10 }), { at: [tx, cy, rz + 0.18] }));
      parts.push(sweep([[tx, cy, rz + 0.2], [tx, cy, rz + 0.55], [tx - 0.08, cy, rz + 0.72], [tx - 0.28, cy, rz + 0.74], [tx - 0.48, cy, rz + 0.6], [tx - 0.52, cy, rz + 0.45]], 0.03, { seg: 8 }));
      parts.push(sweep([[tx, cy - 0.3, rz + 0.55], [tx, cy - 0.12, rz + 0.55]], 0.02, { seg: 5 }));
      parts.push(sweep([[tx + 0.02, cy - 0.32, rz + 0.58], [tx + 0.02, cy - 0.05, rz + 0.62]], 0.03, { seg: 8, caps: true }));
      parts.push(xf(lathe([[0, 0], [0.06, 0], [0.065, 0.06], [0.03, 0.09], [0, 0.09]], { seg: 10 }), { ry: -Math.PI / 2, at: [tx + 0.04, cy - 0.05, rz + 0.64] }));
      put(f, o.tapMat ?? BRASS, merge(parts));
      const hose = []; for (let i = 0; i <= 8; i++) { const t = i / 8; hose.push([tx + 0.06 + 0.08 * Math.sin(t * Math.PI), cy - 0.33 - 0.12 * Math.sin(t * Math.PI), rz + 0.58 - 0.65 * Math.sin(t * Math.PI * 0.9) + 0.0]); }
      put(f, 'c#9a8d78/0.45/0.8', sweep(hose, 0.016, { seg: 5 }));
    }
    f.block(-A, A + (o.taps !== false ? 0.45 : 0), cy - B, cy + B, 0, rz);
  }

  // ---- basins -------------------------------------------------------------------------------------
  // A pedestal basin on the wall, centred at x; rim at o.h (2.85).
  function pedestalSink(f, x = 0, o = {}) {
    const zt = o.h ?? 2.85, A = 0.95, B = 0.72, cy = B + 0.06, s = f.sub(x, 0), m = o.mat ?? PORCELAIN;
    const rows = [{ a: 0.2, b: 0.16, z: zt - 0.62, y: cy - 0.05 }, { a: A - 0.3, b: B - 0.26, z: zt - 0.5, y: cy }, { a: A - 0.06, b: B - 0.05, z: zt - 0.24, y: cy }, { a: A, b: B, z: zt - 0.1, y: cy }, { a: A, b: B, z: zt - 0.025, y: cy }, { a: A - 0.025, b: B - 0.025, z: zt, y: cy },
      { a: 0.72, b: 0.5, z: zt, y: cy + 0.1 }, { a: 0.69, b: 0.47, z: zt - 0.04, y: cy + 0.1 }, { a: 0.6, b: 0.38, z: zt - 0.25, y: cy + 0.1 }, { a: 0.38, b: 0.24, z: zt - 0.4, y: cy + 0.1 }, { a: 0.004, b: 0.004, z: zt - 0.42, y: cy + 0.1 }];
    put(s, m, loft(rows, { seg: 36, e: 2.8 }));
    put(s, m, lathe([[0, 0], [0.4, 0], [0.42, 0.04], [0.32, 0.18], [0.23, 0.55], [0.205, 1.4], [0.23, zt - 0.65], [0.27, zt - 0.55], [0, zt - 0.55]], { seg: 24, sy: 0.82, y: cy - 0.08 }));
    put(s, 'c#8f8a82/0.25/1', lathe([[0, 0], [0.06, 0], [0.065, 0.006], [0, 0.004]], { seg: 10 }), { at: [0, cy + 0.1, zt - 0.415] });
    K.tap(s, 0, cy - B + 0.17, zt, { mat: o.tap ?? BRASS, reach: 0.42, height: 0.62 });
    s.block(-A, A, 0, cy + B, 0, zt);
  }
  // A washstand vanity w wide: painted cabinet on legs, marble top and splash, a sunk basin with a
  // broad rim, two shaker doors, a tap.
  function vanity(f, w = 3.2, o = {}) {
    const m = woodOf(o.wood ?? PAINT_GREEN), d = o.d ?? 1.8, top = o.top ?? 'marble', zt = 2.75, c = K.carcass(f, m, w, d, zt, { overhang: -0.02, foot: 0.5, topT: 0.06 });
    const bw = (c.x1 - c.x0) / 2;
    for (let i = 0; i < 2; i++) K.shakerDoor(f, m, c.x0 + i * bw + 0.025, c.x0 + (i + 1) * bw - 0.025, c.z0 + 0.04, c.z1 - 0.06, c.front, { hinge: i ? 'right' : 'left' });
    const a = o.basinW ?? 0.78, b = 0.55, by = d / 2 + 0.08, ha = a - 0.14, hb = b - 0.14, T0 = zt, T1 = zt + 0.12, ov = 0.08;
    put(f, top, bev(-w / 2 - ov, -ha, -0.0, d + ov, T0, T1, 0.02, { grain: 'x' }));
    put(f, top, bev(ha, w / 2 + ov, -0.0, d + ov, T0, T1, 0.02, { grain: 'x' }));
    put(f, top, bev(-ha - 0.01, ha + 0.01, 0, by - hb, T0, T1, 0.02, { grain: 'x' }));
    put(f, top, bev(-ha - 0.01, ha + 0.01, by + hb, d + ov, T0, T1, 0.02, { grain: 'x' }));
    put(f, top, bev(-w / 2 - ov, w / 2 + ov, 0, 0.08, T1, T1 + 0.45, 0.015, { grain: 'x' }));
    K.basin(f, o.basin ?? PORCELAIN, 0, by, T1 + 0.02, a, b, 0.42, { rim: 0.15, e: 4 });
    K.tap(f, 0, 0.32, T1, { mat: o.tap ?? BRASS, reach: by - 0.3, height: 0.7 });
    f.block(-w / 2, w / 2, 0, d, 0, T1);
    return T1;
  }

  // ---- toilet ---------------------------------------------------------------------------------------------
  // A close-coupled toilet against the wall, centred at x: oval bowl, cistern with a lever, a wooden
  // seat with its lid up. o.seat: the seat's material.
  function toilet(f, x = 0, o = {}) {
    const s = f.sub(x, 0), m = o.mat ?? PORCELAIN, seatM = woodOf(o.seat ?? OAK);
    put(s, m, softBox(-0.8, 0.8, 0.05, 0.62, 1.55, 2.62, 0.07, { n: [2, 1, 2] }));
    put(s, m, softBox(-0.84, 0.84, 0.02, 0.66, 2.62, 2.73, 0.04, { n: [2, 1, 1], crown: 0.01 }));
    put(s, o.metal ?? BRASS, merge([xf(lathe([[0, 0], [0.05, 0], [0.04, 0.03], [0, 0.035]], { seg: 10 }), { rx: -Math.PI / 2, at: [-0.55, 0.62, 2.45] }), sweep([[-0.55, 0.65, 2.45], [-0.4, 0.68, 2.44], [-0.28, 0.69, 2.42]], 0.018, { seg: 5, caps: true })]));
    put(s, m, softBox(-0.32, 0.32, 0.45, 1.0, 0.0, 1.6, 0.12, { n: [2, 2, 3] }));
    const cy = 1.45, rows = [[0.3, 0.42, 0, 1.25], [0.29, 0.41, 0.06, 1.25], [0.25, 0.37, 0.45, 1.3], [0.35, 0.53, 0.92, 1.4], [0.45, 0.66, 1.2, cy], [0.47, 0.69, 1.28, cy], [0.45, 0.67, 1.31, cy],
      [0.39, 0.58, 1.31, cy], [0.36, 0.53, 1.22, cy], [0.26, 0.37, 0.98, cy + 0.04], [0.16, 0.2, 0.84, cy + 0.08], [0.004, 0.004, 0.83, cy + 0.08]];
    put(s, m, loft(rows.map(([a, b, z, y]) => ({ a, b, z, y })), { seg: 30, e: 2.2 }));
    put(s, GLASS, loft([{ a: 0.24, b: 0.33, z: 0.97, y: cy + 0.04 }, { a: 0.004, b: 0.004, z: 0.97, y: cy + 0.04 }], { seg: 20 }));
    const ring = [[0.47, 0.7, 1.325], [0.48, 0.71, 1.36], [0.46, 0.69, 1.39], [0.36, 0.55, 1.39], [0.34, 0.52, 1.36], [0.35, 0.53, 1.325], [0.47, 0.7, 1.325]];
    put(s, seatM, loft(ring.map(([a, b, z]) => ({ a, b, z, y: cy + 0.01 })), { seg: 30, e: 2.2 }));
    const lid = loft([{ a: 0.004, b: 0.004, z: 0 }, { a: 0.47, b: 0.68, z: 0 }, { a: 0.48, b: 0.7, z: 0.03 }, { a: 0.46, b: 0.67, z: 0.06 }, { a: 0.004, b: 0.004, z: 0.065 }], { seg: 30, e: 2.4 });
    const th = Math.PI / 2 + 0.14;
    put(s, seatM, lid, { rx: th, at: [0, 0.82 + 0.7 * Math.cos(th), 1.4 + 0.7 * Math.sin(th)] });
    put(s, m, bev(-0.25, 0.25, 0.7, 0.82, 1.33, 1.4, 0.02));
    s.block(-0.5, 0.5, 0, 2.2, 0, 1.5);
  }

  // ---- towels and mirrors --------------------------------------------------------------------------------
  // A brass towel rail on the wall, centred at x, height z, w long, with towels hanging over it.
  // towels: their colours (default two: cream and sage).
  function towelRail(f, x, z, w = 2.2, o = {}) {
    const m = o.mat ?? BRASS, y = 0.3, parts = [];
    for (const sx of [-1, 1]) { parts.push(xf(lathe([[0, 0], [0.07, 0], [0.065, 0.03], [0.03, 0.05], [0, 0.05]], { seg: 10 }), { rx: -Math.PI / 2, at: [x + sx * (w / 2), 0, z] })); parts.push(sweep([[x + sx * (w / 2), 0.04, z], [x + sx * (w / 2), y, z]], 0.022, { seg: 6 })); parts.push(xf(lathe(Array.from({ length: 7 }, (_, i) => { const a = -Math.PI / 2 + i / 6 * Math.PI; return [0.04 * Math.cos(a), 0.04 * Math.sin(a)]; }), { seg: 8 }), { at: [x + sx * (w / 2), y, z] })); }
    parts.push(sweep([[x - w / 2, y, z], [x + w / 2, y, z]], 0.024, { seg: 8 }));
    put(f, m, merge(parts));
    const cols = o.towels ?? ['wool#e6e0d4', 'wool#8d9a82'], n = cols.length, tw = (w - 0.2) / n;
    cols.forEach((c, i) => K.hangingTowel(f, x - w / 2 + 0.1 + tw * (i + 0.5), y, z, tw - 0.08, (o.drop ?? 1.25) - i * 0.15, c, { rail: 0.026 }));
  }
  // A mirror on the wall behind the frame's origin, centred at (x, z), w by h. kind: 'rect' (moulded
  // frame), 'arch' (round-topped), 'round' (h ignored). o.frame: material; o.border: its width.
  function mirror(f, x, z, w = 2, h = 3, o = {}) {
    const kind = o.kind ?? 'rect', fm = o.frame ?? 'fir', b = o.border ?? 0.16;
    if (kind === 'round') {
      const r = w / 2;
      put(f, fm, lathe([[r - 0.01, 0.0], [r - 0.01, 0.06], [r + b * 0.2, 0.1], [r + b * 0.6, 0.11], [r + b, 0.07], [r + b, 0.0]], { seg: 48 }), { rx: -Math.PI / 2, at: [x, 0, z] });
      put(f, MIRROR, lathe([[r, 0], [r, 0.04], [0, 0.04]], { seg: 40 }), { rx: -Math.PI / 2, at: [x, 0.0, z] });
    } else if (kind === 'arch') {
      const out = [], hw = w / 2, spring = h / 2 - hw;
      for (let i = 0; i <= 16; i++) { const a = i / 16 * Math.PI; out.push([hw * Math.cos(a), spring + hw * Math.sin(a)]); }
      out.push([-hw, -h / 2], [hw, -h / 2]);
      put(f, MIRROR, extrude(out, 0.02, 0.05), { at: [x, 0, z] });
      const path = [[hw, 0.07, -h / 2], [hw, 0.07, spring]]; for (let i = 1; i <= 16; i++) { const a = i / 16 * Math.PI; path.push([hw * Math.cos(a), 0.07, spring + hw * Math.sin(a)]); }
      path.push([-hw, 0.07, -h / 2], [hw, 0.07, -h / 2]);
      put(f, fm, sweep(path, 1, { shape: [[-b / 2, -0.05], [b / 2, -0.05], [b / 2 * 0.8, 0.05], [-b / 2 * 0.6, 0.06]].map(([u, v]) => [v, u]), up: [0, 1, 0] }), { at: [x, 0, z] });
    } else {
      put(f, fm, moulding(w, h, [[-0.01, 0.03], [-0.01, 0.06], [0, 0.075], [b * 0.3, 0.09], [b * 0.6, 0.085], [b * 0.85, 0.1], [b, 0.085], [b, 0]]), { at: [x, 0, z] });
      put(f, MIRROR, bev(-w / 2 - 0.02, w / 2 + 0.02, 0.02, 0.045, -h / 2 - 0.02, h / 2 + 0.02, 0.003), { at: [x, 0, z] });
    }
  }

  return { clawTub, pedestalSink, vanity, toilet, towelRail, mirror };
}
