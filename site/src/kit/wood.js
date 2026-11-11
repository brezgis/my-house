// Case furniture and joinery: tables, chairs, desks, chests, wardrobes, bookcases, the kitchen's
// cabinets and shelves, coat and shoe storage. Every board is a chamfered box (bev) with its grain
// running the long way; drawers and doors are separate fronts with a shadow gap; legs taper.
// The style is Arts and Crafts: fumed oak or the house's fir, square posts, exposed joinery,
// brass and wooden pulls.

import { lathe, loft, sweep, bev, softBox, extrude, merge, xf, sheet, rng, TAU } from './geom.js';
import { fab, woodOf, OAK, FIR, WALNUT, BRASS, OLD_BRASS, PAINT, PAINT_SAGE, PORCELAIN, ENAMEL, NICKEL, GLASS, MIRROR, IRON, shade } from './mats.js';

export function makeWood(K) {
  const { put } = K;
  const R = (f, ...k) => rng(f.X, f.Y, f.h, f.q, ...k);
  const bd = (f, m, x0, x1, y0, y1, z0, z1, e = 0.015, o) => put(f, m, bev(x0, x1, y0, y1, z0, z1, e, o));

  // ---- hardware ---------------------------------------------------------------------------------
  // A knob on a front face at depth y, sticking out toward +y.
  const knob = (f, x, y, z, m = BRASS, r = 0.045) => put(f, m, lathe([[0, 0], [r * 0.6, 0], [r * 0.45, r * 0.6], [r * 0.5, r * 0.9], [r, r * 1.4], [r * 0.95, r * 1.9], [r * 0.5, r * 2.15], [0, r * 2.2]], { seg: 10 }), { rx: -Math.PI / 2, at: [x, y, z] });
  // A cup (bin) pull, opening downward.
  const cupPull = (f, x, y, z, m = BRASS) => {
    put(f, m, bev(x - 0.17, x + 0.17, y, y + 0.012, z - 0.03, z + 0.05, 0.004));
    put(f, m, lathe([[0.13, 0], [0.135, 0.01], [0.13, 0.02], [0.12, 0.012]], { seg: 14, th0: 0, th1: Math.PI, sy: 0.5 }), { rx: Math.PI, at: [x, y + 0.012, z + 0.03] });
  };
  // A bail pull: two rosettes and a hanging bail.
  const bailPull = (f, x, y, z, m = OLD_BRASS, w = 0.32) => {
    for (const s of [-1, 1]) put(f, m, lathe([[0, 0], [0.04, 0], [0.035, 0.015], [0.015, 0.03], [0, 0.035]], { seg: 8 }), { rx: -Math.PI / 2, at: [x + s * w / 2, y, z] });
    const p = []; for (let i = 0; i <= 8; i++) { const a = i / 8 * Math.PI; p.push([x - Math.cos(a) * w / 2, y + 0.04, z - Math.sin(a) * 0.12]); }
    put(f, m, sweep(p, 0.011, { seg: 5 }));
  };
  const pullFor = (kind, f, x, y, z, m) => kind === 'bail' ? bailPull(f, x, y, z, m) : kind === 'cup' ? cupPull(f, x, y, z, m) : kind === 'wood' ? knob(f, x, y, z, m, 0.05) : knob(f, x, y, z, m);

  // A drawer front across x0..x1, z0..z1 with its face at depth y; one or two pulls.
  function drawer(f, m, x0, x1, z0, z1, y, o = {}) {
    bd(f, m, x0, x1, y - 0.07, y, z0, z1, 0.014, { grain: 'x' });
    const w = x1 - x0, zc = (z0 + z1) / 2 + (o.pullZ ?? 0), pm = o.pullMat ?? BRASS;
    if (o.pull === false) return;
    if (w > 2.2) for (const k of [0.25, 0.75]) pullFor(o.pull ?? 'knob', f, x0 + w * k, y, zc, pm);
    else pullFor(o.pull ?? 'knob', f, (x0 + x1) / 2, y, zc, pm);
  }
  // A shaker door (stiles, rails and a flat recessed panel), face at depth y.
  function shakerDoor(f, m, x0, x1, z0, z1, y, o = {}) {
    const s = Math.min(0.22, (x1 - x0) * 0.18), t = 0.065;
    bd(f, m, x0, x0 + s, y - t, y, z0, z1, 0.008, { grain: 'z' }); bd(f, m, x1 - s, x1, y - t, y, z0, z1, 0.008, { grain: 'z' });
    bd(f, m, x0 + s, x1 - s, y - t, y, z0, z0 + s, 0.008, { grain: 'x' }); bd(f, m, x0 + s, x1 - s, y - t, y, z1 - s, z1, 0.008, { grain: 'x' });
    if (o.glass) {
      put(f, GLASS, bev(x0 + s, x1 - s, y - t / 2 - 0.005, y - t / 2 + 0.005, z0 + s, z1 - s, 0.001));
      const mw = 0.035, cols = o.glass === 'prairie' ? 3 : 2, top = z1 - s - (z1 - z0 - 2 * s) * 0.3;
      for (let i = 1; i < cols; i++) { const x = x0 + s + (x1 - x0 - 2 * s) * i / cols; bd(f, m, x - mw / 2, x + mw / 2, y - t + 0.01, y - 0.01, o.glass === 'prairie' ? top : z0 + s, z1 - s, 0.006); }
      bd(f, m, x0 + s, x1 - s, y - t + 0.01, y - 0.01, top - mw / 2, top + mw / 2, 0.006);
    } else bd(f, m, x0 + s, x1 - s, y - t - 0.03, y - t + 0.02, z0 + s, z1 - s, 0.01, { grain: 'z' });
    if (o.knob !== false) knob(f, o.hinge === 'right' ? x0 + 0.13 : x1 - 0.13, y, o.knobZ ?? (z0 + z1) / 2, o.pullMat ?? BRASS);
  }
  // A square leg tapering toward the floor, centred at (x, y).
  const leg = (f, m, x, y, h, s = 0.17, taper = 0.3) => bd(f, m, x - s / 2, x + s / 2, y - s / 2, y + s / 2, 0, h, 0.012, { grain: 'z', taper });

  // ---- tables ---------------------------------------------------------------------------------------
  // A table centred on the frame: top w by d at height tall, apron rails, tapering legs.
  // mat: wood (plain colours become oak). o: { shelf, overhang }
  function table(f, w, d, tall, mat = 'fir', lg = 0.2, o = {}) {
    const m = woodOf(mat), ov = o.overhang ?? 0.2;
    bd(f, m, -w / 2, w / 2, -d / 2, d / 2, tall - 0.12, tall, 0.025);
    const ax = w / 2 - ov, ay = d / 2 - ov, at = 0.07;
    bd(f, m, -ax + lg * 0.5, ax - lg * 0.5, -ay + 0.03, -ay + 0.03 + at, tall - 0.42, tall - 0.12, 0.01, { grain: 'x' });
    bd(f, m, -ax + lg * 0.5, ax - lg * 0.5, ay - 0.03 - at, ay - 0.03, tall - 0.42, tall - 0.12, 0.01, { grain: 'x' });
    bd(f, m, -ax + 0.03, -ax + 0.03 + at, -ay + lg * 0.5, ay - lg * 0.5, tall - 0.42, tall - 0.12, 0.01, { grain: 'y' });
    bd(f, m, ax - 0.03 - at, ax - 0.03, -ay + lg * 0.5, ay - lg * 0.5, tall - 0.42, tall - 0.12, 0.01, { grain: 'y' });
    for (const x of [-ax + lg / 2, ax - lg / 2]) for (const y of [-ay + lg / 2, ay - lg / 2]) leg(f, m, x, y, tall - 0.12, lg, tall > 2 ? 0.28 : 0.18);
    if (o.shelf) bd(f, m, -ax + 0.02, ax - 0.02, -ay + 0.02, ay - 0.02, 0.45, 0.53, 0.012);
    f.block(-w / 2, w / 2, -d / 2, d / 2, 0, Math.max(tall, 1.5));
  }
  // A dining table centred on the frame: 'trestle' (keyed through-tenons) or 'legs'. Top at 2.5.
  function diningTable(f, w = 7.2, d = 3.5, o = {}) {
    const m = woodOf(o.wood ?? OAK), top = o.h ?? 2.5;
    if ((o.style ?? 'trestle') === 'legs') { table(f, w, d, top, m, 0.24, { overhang: 0.25 }); return; }
    bd(f, m, -w / 2, w / 2, -d / 2, d / 2, top - 0.17, top, 0.03);
    const ux = w / 2 - 1.0;
    for (const x of [-ux, ux]) {
      bd(f, m, x - 0.16, x + 0.16, -d / 2 + 0.35, d / 2 - 0.35, top - 0.42, top - 0.17, 0.02, { grain: 'y' });
      bd(f, m, x - 0.15, x + 0.15, -0.55, 0.55, 0.28, top - 0.42, 0.02, { grain: 'z' });
      bd(f, m, x - 0.2, x + 0.2, -d / 2 + 0.3, d / 2 - 0.3, 0.0, 0.28, 0.03, { grain: 'y', taper: -0.0 });
      for (const s of [-1, 1]) bd(f, m, x - 0.2, x + 0.2, s * (d / 2 - 0.3) - 0.12, s * (d / 2 - 0.3) + 0.12, -0.0, 0.05, 0.01);
    }
    bd(f, m, -ux - 0.45, ux + 0.45, -0.1, 0.1, 0.85, 1.25, 0.02, { grain: 'x' });
    for (const x of [-ux - 0.32, ux + 0.32]) bd(f, m, x - 0.04, x + 0.04, -0.17, 0.17, 0.78, 1.32, 0.012, { grain: 'z', taper: -0.15 });
    f.block(-w / 2, w / 2, -d / 2, d / 2, 0, top);
  }
  // A dining chair at (x, y) facing its frame's front (dq quarter turns more). back: 'ladder' |
  // 'spindle'. seat: a fabric or leather for the drop-in seat. arms: true for a carver.
  function diningChair(f, x, y, o = {}) {
    const s = f.sub(x, y, 0, o.dq ?? 0), m = woodOf(o.wood ?? OAK), w = o.arms ? 1.9 : 1.6, d = 1.5, sz = 1.42, bh = o.backH ?? 3.25;
    const fy = d / 2 - 0.07, by = -d / 2 + 0.07;
    for (const sx of [-1, 1]) {
      leg(s, m, sx * (w / 2 - 0.07), fy, sz, 0.13, 0.12);
      bd(s, m, sx * (w / 2 - 0.07) - 0.07, sx * (w / 2 - 0.07) + 0.07, by - 0.07, by + 0.07, 0, bh, 0.012, { grain: 'z' });
      put(s, m, lathe([[0.1, 0], [0.1, 0.02], [0.05, 0.08], [0, 0.09]], { seg: 4, th0: Math.PI / 4, th1: Math.PI / 4 + TAU }), { at: [sx * (w / 2 - 0.07), by, bh] });
      bd(s, m, sx * (w / 2 - 0.07) - 0.035, sx * (w / 2 - 0.07) + 0.035, by + 0.07, fy - 0.065, 0.45, 0.55, 0.008, { grain: 'y' });
      bd(s, m, sx * (w / 2 - 0.07) - 0.04, sx * (w / 2 - 0.07) + 0.04, by + 0.07, fy - 0.065, sz - 0.25, sz - 0.02, 0.008, { grain: 'y' });
      if (o.arms) { bd(s, m, sx * (w / 2 - 0.07) - 0.08, sx * (w / 2 - 0.07) + 0.08, by, fy + 0.1, 2.25, 2.33, 0.012, { grain: 'y' }); bd(s, m, sx * (w / 2 - 0.07) - 0.05, sx * (w / 2 - 0.07) + 0.05, fy - 0.05, fy + 0.05, sz, 2.25, 0.01, { grain: 'z' }); }
    }
    bd(s, m, -w / 2 + 0.14, w / 2 - 0.14, fy - 0.04, fy + 0.03, sz - 0.25, sz - 0.02, 0.008, { grain: 'x' });
    bd(s, m, -w / 2 + 0.14, w / 2 - 0.14, by - 0.035, by + 0.035, sz - 0.25, sz - 0.02, 0.008, { grain: 'x' });
    bd(s, m, -w / 2 + 0.14, w / 2 - 0.14, fy - 0.035, fy + 0.035, 0.6, 0.7, 0.008, { grain: 'x' });
    bd(s, m, -w / 2 + 0.14, w / 2 - 0.14, by - 0.035, by + 0.035, 0.6, 0.7, 0.008, { grain: 'x' });
    if ((o.back ?? 'ladder') === 'ladder') {
      for (const z of [bh - 0.42, bh - 0.95, bh - 1.45].slice(0, bh > 2.9 ? 3 : 2)) {
        const p = []; for (let i = 0; i <= 6; i++) { const u = i / 6; p.push([-w / 2 + 0.14 + (w - 0.28) * u, by - 0.08 * Math.sin(u * Math.PI), z]); }
        put(s, m, sweep(p, 1, { shape: [[-0.14, -0.03], [0.14, -0.03], [0.14, 0.03], [-0.14, 0.03]], up: [0, 0, 1] }));
      }
    } else {
      bd(s, m, -w / 2 + 0.14, w / 2 - 0.14, by - 0.04, by + 0.04, bh - 0.4, bh - 0.12, 0.01, { grain: 'x' });
      for (let i = 0; i < 5; i++) { const xx = -0.42 + i * 0.21; bd(s, m, xx - 0.03, xx + 0.03, by - 0.025, by + 0.025, sz + 0.05, bh - 0.4, 0.006, { grain: 'z' }); }
      bd(s, m, -w / 2 + 0.14, w / 2 - 0.14, by - 0.04, by + 0.04, sz + 0.02, sz + 0.12, 0.01, { grain: 'x' });
    }
    const st = fab(o.seat ?? 'leather', 'leather');
    put(s, st, softBox(-w / 2 + 0.1, w / 2 - 0.1, by + 0.03, fy + 0.05, sz - 0.04, sz + 0.13, 0.05, { n: [2, 2, 1], crown: 0.035, welt: 0.008, noBottom: true }));
    if (o.sit !== false) K.seat(s, 0, 0.1, sz + 0.13, 'sit');
    s.block(-w / 2, w / 2, -d / 2, d / 2, 0, sz + 0.1);
  }
  // A small table at (x, y): 'round' (turned pedestal on a cross foot), 'square' (a tabouret with
  // a shelf), 'drum' (round top, three legs, a shelf). Returns the top's height.
  function sideTable(f, x, y, o = {}) {
    const m = woodOf(o.wood ?? OAK), h = o.h ?? 2.0, kind = o.kind ?? 'square', s = f.sub(x, y);
    if (kind === 'round') {
      const r = o.r ?? 0.9;
      put(s, m, lathe([[0, h - 0.1], [r - 0.02, h - 0.1], [r, h - 0.08], [r, h - 0.02], [r - 0.02, h], [0, h]], { seg: 32, flat: false }));
      put(s, m, lathe([[0.1, 0.25], [0.13, 0.3], [0.09, 0.5], [0.08, 1.2], [0.11, 1.4], [0.08, 1.55], [0.075, h - 0.25], [0.18, h - 0.12], [0.2, h - 0.1]], { seg: 12 }));
      for (const a of [0, Math.PI / 2]) put(s, m, bev(-0.75, 0.75, -0.07, 0.07, 0, 0.26, 0.02, { grain: 'x' }), { rz: a });
      s.block(-r, r, -r, r, 0, Math.max(h, 1.5));
    } else if (kind === 'drum') {
      const r = o.r ?? 0.85;
      put(s, m, lathe([[0, h - 0.09], [r - 0.02, h - 0.09], [r, h - 0.07], [r, h - 0.02], [r - 0.02, h], [0, h]], { seg: 32 }));
      put(s, m, lathe([[0, 0.55], [r * 0.85, 0.55], [r * 0.85, 0.61], [0, 0.61]], { seg: 28 }));
      for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + 0.5; bd(s, m, Math.cos(a) * r * 0.7 - 0.06, Math.cos(a) * r * 0.7 + 0.06, Math.sin(a) * r * 0.7 - 0.06, Math.sin(a) * r * 0.7 + 0.06, 0, h - 0.09, 0.01, { grain: 'z', taper: 0.25 }); }
      s.block(-r, r, -r, r, 0, Math.max(h, 1.5));
    } else {
      const a = (o.w ?? 1.6) / 2;
      bd(s, m, -a, a, -a, a, h - 0.09, h, 0.02);
      for (const sx of [-1, 1]) for (const sy of [-1, 1]) leg(s, m, sx * (a - 0.15), sy * (a - 0.15), h - 0.09, 0.14, 0.15);
      bd(s, m, -a + 0.12, a - 0.12, -a + 0.12, a - 0.12, 0.45, 0.52, 0.012);
      for (const sy of [-1, 1]) bd(s, m, -a + 0.22, a - 0.22, sy * (a - 0.15) - 0.03, sy * (a - 0.15) + 0.03, h - 0.3, h - 0.09, 0.008, { grain: 'x' });
      for (const sx of [-1, 1]) bd(s, m, sx * (a - 0.15) - 0.03, sx * (a - 0.15) + 0.03, -a + 0.22, a - 0.22, h - 0.3, h - 0.09, 0.008, { grain: 'y' });
      s.block(-a, a, -a, a, 0, Math.max(h, 1.5));
    }
    return h;
  }
  // A tall plant stand at (x, y) with a potted plant on it.
  function plantStand(f, x, y, o = {}) {
    const m = woodOf(o.wood ?? OAK), h = o.h ?? 2.6, a = 0.55, s = f.sub(x, y);
    bd(s, m, -a, a, -a, a, h - 0.08, h, 0.015);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) bd(s, m, sx * (a - 0.1) - 0.06, sx * (a - 0.1) + 0.06, sy * (a - 0.1) - 0.06, sy * (a - 0.1) + 0.06, 0, h - 0.08, 0.008, { grain: 'z' });
    bd(s, m, -a + 0.06, a - 0.06, -a + 0.06, a - 0.06, 0.35, 0.41, 0.008);
    for (const z of [h - 0.35, 0.6]) for (const sy of [-1, 1]) { bd(s, m, -a + 0.15, a - 0.15, sy * (a - 0.1) - 0.025, sy * (a - 0.1) + 0.025, z, z + 0.08, 0.005, { grain: 'x' }); bd(s, m, sy * (a - 0.1) - 0.025, sy * (a - 0.1) + 0.025, -a + 0.15, a - 0.15, z, z + 0.08, 0.005, { grain: 'y' }); }
    if (o.plant !== false) K.pottedPlant(s, 0, 0, h, o.plant ?? 'trailing', { size: 0.8, pot: o.pot });
    s.block(-a, a, -a, a, 0, h);
  }

  // ---- case pieces --------------------------------------------------------------------------------------
  // A carcass on corner posts: top overhanging, side and back panels, the front left open for
  // drawers and doors between z0 and the top. Returns its inner bounds.
  function carcass(f, m, w, d, h, o = {}) {
    const p = o.post ?? 0.16, top = o.topT ?? 0.1, ov = o.overhang ?? 0.08, foot = o.foot ?? 0.32;
    bd(f, m, -w / 2 - ov, w / 2 + ov, -0.0, d + ov, h - top, h, 0.025);
    for (const sx of [-1, 1]) for (const y of [p / 2, d - p / 2]) leg(f, m, sx * (w / 2 - p / 2), y, h - top, p, o.taper ?? 0.12);
    for (const sx of [-1, 1]) bd(f, m, sx * (w / 2 - p / 2) - 0.03, sx * (w / 2 - p / 2) + 0.03, p, d - p, foot, h - top, 0.008, { grain: 'z' });
    bd(f, m, -w / 2 + p, w / 2 - p, 0.03, 0.08, foot, h - top, 0.008, { grain: 'z' });
    bd(f, m, -w / 2 + p, w / 2 - p, 0.08, d - 0.05, foot, foot + 0.06, 0.008);
    bd(f, m, -w / 2 + p, w / 2 - p, d - 0.1, d - 0.02, foot - 0.12, foot + 0.04, 0.01, { grain: 'x' });
    return { x0: -w / 2 + p, x1: w / 2 - p, z0: foot + 0.04, z1: h - top, front: d - 0.01 };
  }
  // A chest of drawers: two small drawers over three graduated ones. w, tall; o: { d, wood, pull }
  function dresser(f, w = 4.2, tall = 3.1, o = {}) {
    const m = woodOf(o.wood ?? OAK), d = o.d ?? 1.75, c = carcass(f, m, w, d, tall, o), gap = 0.025;
    const rows = o.rows ?? [0.33, 0.27, 0.22, 0.18].map(k => k * (c.z1 - c.z0));
    let z = c.z0;
    rows.forEach((hgt, i) => {
      const z1 = z + hgt, top = i === rows.length - 1 && w > 3;
      if (top) { const xm = (c.x0 + c.x1) / 2; drawer(f, m, c.x0 + gap, xm - gap / 2, z + gap, z1 - gap, c.front, o); drawer(f, m, xm + gap / 2, c.x1 - gap, z + gap, z1 - gap, c.front, o); }
      else drawer(f, m, c.x0 + gap, c.x1 - gap, z + gap, z1 - gap, c.front, { ...o, pull: o.pull ?? 'bail' });
      if (i) bd(f, m, c.x0, c.x1, c.front - 0.1, c.front - 0.04, z - 0.02, z + 0.02, 0.005, { grain: 'x' });
      z = z1;
    });
    bd(f, m, c.x0, c.x1, c.front - 0.12, c.front - 0.06, c.z0, c.z1, 0.004);
    f.block(-w / 2, w / 2, 0, d, 0, tall);
    return tall;
  }
  // A nightstand: a drawer under the top, an open shelf, a low shelf. Front toward the frame's front.
  function nightstand(f, o = {}) {
    const m = woodOf(o.wood ?? OAK), w = o.w ?? 1.8, d = o.d ?? 1.45, h = o.h ?? 2.15, c = carcass(f, m, w, d, h, { ...o, foot: 0.4, overhang: 0.06 });
    drawer(f, m, c.x0 + 0.025, c.x1 - 0.025, c.z1 - 0.48, c.z1 - 0.06, c.front, { pull: o.pull ?? 'wood', pullMat: o.pullMat ?? m });
    bd(f, m, c.x0, c.x1, 0.08, c.front - 0.02, c.z1 - 0.56, c.z1 - 0.5, 0.008);
    bd(f, m, c.x0 - 0.06, c.x1 + 0.06, c.front - 0.02, c.front + 0.0, c.z0 - 0.1, c.z0 + 0.02, 0.005, { grain: 'x' });
    f.block(-w / 2, w / 2, 0, d, 0, h);
    return h;
  }
  // A writing desk: top at 2.5, three apron drawers, tapered legs, an optional letter gallery.
  function desk(f, w = 4.6, d = 2.3, o = {}) {
    const m = woodOf(o.wood ?? OAK), top = 2.5, lg = 0.17;
    bd(f, m, -w / 2, w / 2, 0, d, top - 0.1, top, 0.025);
    const ax = w / 2 - 0.12;
    for (const sx of [-1, 1]) for (const y of [0.12 + lg / 2, d - 0.12 - lg / 2]) leg(f, m, sx * (ax - lg / 2), y, top - 0.1, lg, 0.28);
    bd(f, m, -ax + lg, ax - lg, 0.14, 0.2, top - 0.5, top - 0.1, 0.01, { grain: 'x' });
    for (const sx of [-1, 1]) { bd(f, m, sx * (ax - lg / 2) - 0.035, sx * (ax - lg / 2) + 0.035, 0.12 + lg, d - 0.12 - lg, top - 0.5, top - 0.1, 0.01, { grain: 'y' }); bd(f, m, sx * (ax - lg / 2) - 0.03, sx * (ax - lg / 2) + 0.03, 0.12 + lg, d - 0.12 - lg, 0.45, 0.55, 0.008, { grain: 'y' }); }
    const fy = d - 0.12, dw = (2 * ax - 2 * lg) / 3;
    for (let i = 0; i < 3; i++) { const x0 = -ax + lg + i * dw; drawer(f, m, x0 + 0.02, x0 + dw - 0.02, top - 0.46, top - 0.13, fy, { pull: o.pull ?? 'wood', pullMat: m }); }
    bd(f, m, -ax + lg, ax - lg, 0.2, fy - 0.07, top - 0.48, top - 0.44, 0.005);
    if (o.gallery !== false) {
      bd(f, m, -w / 2 + 0.2, w / 2 - 0.2, 0.05, 0.12, top, top + 0.55, 0.01, { grain: 'x' });
      for (const sx of [-1, 1]) bd(f, m, sx * (w / 2 - 0.25) - 0.04, sx * (w / 2 - 0.25) + 0.04, 0.05, 0.55, top, top + 0.55, 0.01, { grain: 'y' });
      bd(f, m, -w / 2 + 0.25, w / 2 - 0.25, 0.05, 0.55, top + 0.25, top + 0.29, 0.006);
      for (const x of [-0.6, 0, 0.6]) bd(f, m, x - 0.02, x + 0.02, 0.12, 0.55, top, top + 0.25, 0.004, { grain: 'y' });
    }
    f.block(-w / 2, w / 2, 0, d, 0, top);
    return top;
  }
  // A hall console: narrow top at 2.7, one long drawer, a low shelf, tapering legs.
  function console_(f, w = 4, o = {}) {
    const m = woodOf(o.wood ?? OAK), d = o.d ?? 1.15, top = o.h ?? 2.7, lg = 0.15;
    bd(f, m, -w / 2, w / 2, 0, d, top - 0.09, top, 0.02);
    for (const sx of [-1, 1]) for (const y of [0.08 + lg / 2, d - 0.08 - lg / 2]) leg(f, m, sx * (w / 2 - 0.1 - lg / 2), y, top - 0.09, lg, 0.25);
    const fy = d - 0.08;
    drawer(f, m, -w / 2 + 0.1 + lg + 0.02, w / 2 - 0.1 - lg - 0.02, top - 0.42, top - 0.12, fy, { pull: o.pull ?? 'wood', pullMat: m });
    bd(f, m, -w / 2 + 0.1 + lg, w / 2 - 0.1 - lg, 0.1, 0.16, top - 0.42, top - 0.09, 0.008, { grain: 'x' });
    for (const sx of [-1, 1]) bd(f, m, sx * (w / 2 - 0.1 - lg / 2) - 0.03, sx * (w / 2 - 0.1 - lg / 2) + 0.03, 0.08 + lg, d - 0.08 - lg, top - 0.42, top - 0.09, 0.008, { grain: 'y' });
    bd(f, m, -w / 2 + 0.12, w / 2 - 0.12, 0.12, d - 0.12, 0.5, 0.57, 0.01);
    f.block(-w / 2, w / 2, 0, d, 0, top);
    return top;
  }
  // A sideboard: drawers over cupboards, a low back rail. o: { open: doors open with E }
  function sideboard(f, w = 6, o = {}) {
    const m = woodOf(o.wood ?? OAK), d = o.d ?? 1.8, h = o.h ?? 3.0, c = carcass(f, m, w, d, h, { ...o, foot: 0.55 });
    const n = Math.max(2, Math.round((c.x1 - c.x0) / 1.6)), bw = (c.x1 - c.x0) / n, zm = c.z1 - 0.6;
    for (let i = 0; i < n; i++) {
      const x0 = c.x0 + i * bw;
      drawer(f, m, x0 + 0.025, x0 + bw - 0.025, zm + 0.04, c.z1 - 0.04, c.front, { pull: o.pull ?? 'cup' });
      if (o.open) K.hingedDoor(f, x0 + 0.025, x0 + bw - 0.025, c.front - 0.035, c.z0 + 0.04, zm - 0.03, { hinge: i % 2 ? 'right' : 'left', mat: m, label: 'cupboard' });
      else shakerDoor(f, m, x0 + 0.025, x0 + bw - 0.025, c.z0 + 0.04, zm - 0.03, c.front, { hinge: i % 2 ? 'right' : 'left' });
      if (i) bd(f, m, x0 - 0.03, x0 + 0.03, c.front - 0.1, c.front - 0.02, c.z0, c.z1, 0.005, { grain: 'z' });
    }
    bd(f, m, c.x0, c.x1, c.front - 0.1, c.front - 0.02, zm - 0.03, zm + 0.04, 0.005, { grain: 'x' });
    bd(f, m, c.x0, c.x1, 0.1, c.front - 0.08, zm - 0.02, zm + 0.02, 0.004);
    bd(f, m, -w / 2, w / 2, 0.02, 0.12, h, h + 0.4, 0.015, { grain: 'x' });
    f.block(-w / 2, w / 2, 0, d, 0, h);
    return h;
  }

  // ---- storage for clothes, coats and shoes ----------------------------------------------------------
  // A wardrobe (armoire) against a wall: two doors visitors open with E, a rail of clothes and a
  // shelf of folded jumpers inside, two drawers below, plinth, cornice. o: { d, wood, clothes }
  function wardrobe(f, w = 4, tall = 6.9, o = {}) {
    const m = woodOf(o.wood ?? OAK), d = o.d ?? 2, inside = o.inside ?? shade(m, 0.8);
    bd(f, m, -w / 2 + 0.06, w / 2 - 0.06, 0.06, d - 0.06, 0.05, 0.4, 0.015, { grain: 'x' });
    for (const sx of [-1, 1]) for (const y of [0.06, d - 0.06]) bd(f, m, sx * (w / 2 - 0.2) - 0.2, sx * (w / 2 - 0.2) + 0.2, y - 0.06, y + 0.06, 0, 0.42, 0.02, { grain: 'x' });
    for (const sx of [-1, 1]) bd(f, m, sx * (w / 2 - 0.06) - 0.06, sx * (w / 2 - 0.06) + 0.06, 0, d, 0.4, tall - 0.32, 0.01, { grain: 'z' });
    bd(f, inside, -w / 2 + 0.12, w / 2 - 0.12, 0.0, 0.06, 0.4, tall - 0.32, 0.005, { grain: 'z' });
    bd(f, m, -w / 2 + 0.12, w / 2 - 0.12, 0.06, d, 0.4, 0.48, 0.005);
    const dz = 1.25;
    for (const [x0, x1] of [[-w / 2 + 0.14, -0.015], [0.015, w / 2 - 0.14]]) drawer(f, m, x0, x1, 0.52, dz - 0.04, d, { pull: o.pull ?? 'bail' });
    bd(f, m, -w / 2 + 0.12, w / 2 - 0.12, 0.06, d - 0.02, dz, dz + 0.08, 0.008);
    bd(f, m, -w / 2 + 0.12, w / 2 - 0.12, d - 0.1, d, dz - 0.04, dz + 0.1, 0.008, { grain: 'x' });
    bd(f, m, -w / 2, w / 2, 0, d, tall - 0.32, tall - 0.22, 0.015);
    bd(f, m, -w / 2 - 0.07, w / 2 + 0.07, 0, d + 0.07, tall - 0.22, tall - 0.1, 0.02);
    bd(f, m, -w / 2 - 0.12, w / 2 + 0.12, 0, d + 0.12, tall - 0.1, tall, 0.03);
    bd(f, m, -w / 2 + 0.12, w / 2 - 0.12, d - 0.1, d, tall - 0.5, tall - 0.32, 0.008, { grain: 'x' });
    // inside: a shelf, the rail and clothes
    const rz = tall - 1.05;
    bd(f, inside, -w / 2 + 0.12, w / 2 - 0.12, 0.06, d - 0.15, rz + 0.35, rz + 0.41, 0.006);
    put(f, BRASS, sweep([[-w / 2 + 0.12, d / 2, rz], [w / 2 - 0.12, d / 2, rz]], 0.025, { seg: 8 }));
    if (o.clothes !== false) K.clothes(f, -w / 2 + 0.15, w / 2 - 0.15, d / 2, rz, o);
    K.foldedStack(f, -w / 4, d / 2, rz + 0.41, 3, ['wool#7d8a9a', 'wool#c9b9a6', 'wool#6b4a3a'], { w: 1.1, d: 1.0, t: 0.2, base: 'wool' });
    K.foldedStack(f, w / 4, d / 2, rz + 0.41, 2, ['linen#e8e1d3', 'wool#4a5a4a'], { w: 1.1, d: 1.0, t: 0.2, base: 'wool' });
    for (const [x0, x1, hinge] of [[-w / 2 + 0.12, -0.005, 'left'], [0.005, w / 2 - 0.12, 'right']]) K.hingedDoor(f, x0, x1, d - 0.035, dz + 0.1, tall - 0.5, { hinge, mat: m, label: 'wardrobe', thick: 0.07 });
    f.block(-w / 2, w / 2, 0, d, 0, tall);
  }
  // An open closet rail with a shelf above (on Arts-and-Crafts brackets) and clothes hanging; a row of
  // shoes on the floor if o.shoes. The frame is on the wall, front toward the room.
  function closetRail(f, w = 5, o = {}) {
    const m = woodOf(o.wood ?? PAINT), z = o.z ?? 5.5, sz = z + 0.4, d = 1.3;
    bd(f, m, -w / 2, w / 2, 0.0, d, sz, sz + 0.08, 0.01, { grain: 'x' });
    for (const x of [-w / 2 + 0.1, w / 2 - 0.1]) bracket(f, m, x, sz, d * 0.85, 0.75);
    if (w > 5) bracket(f, m, 0, sz, d * 0.85, 0.75);
    for (const x of [-w / 2 + 0.1, w / 2 - 0.1]) put(f, BRASS, lathe([[0, 0], [0.07, 0], [0.065, 0.025], [0.03, 0.04], [0, 0.04]], { seg: 10 }), { rx: -Math.PI / 2, at: [x, 0.0, z] });
    put(f, BRASS, sweep([[-w / 2 + 0.1, 0.95, z], [w / 2 - 0.1, 0.95, z]], 0.028, { seg: 8 }));
    for (const x of [-w / 2 + 0.1, w / 2 - 0.1]) put(f, BRASS, sweep([[x, 0.0, z], [x, 0.95, z]], 0.02, { seg: 6 }));
    if (o.clothes !== false) K.clothes(f, -w / 2 + 0.15, w / 2 - 0.15, 0.95, z, o);
    if (o.boxes !== false) {
      const r = R(f, w, z); let x = -w / 2 + 0.3;
      while (x < w / 2 - 1.2) { const bw = 0.9 + r() * 0.5, bh = 0.5 + r() * 0.35; put(f, r() < 0.5 ? 'linen#c9b9a0' : 'wicker', softBox(x, x + bw, 0.1, 1.15, sz + 0.08, sz + 0.08 + bh, 0.03, { k: 1, n: [1, 1, 1] })); x += bw + 0.15 + r() * 0.3; if (r() < 0.5) { K.foldedStack(f, x + 0.5, 0.65, sz + 0.08, 2 + Math.floor(r() * 2), ['wool#7d8a9a', 'wool#c9b9a6', 'linen#e8e1d3'], { w: 0.95, d: 0.9, t: 0.18 }); x += 1.1; } }
    }
    if (o.shoes) shoeRow(f, -w / 2 + 0.4, w / 2 - 0.4, 1.0, 0, o.shoes);
    f.block(-w / 2, w / 2, 0, d, sz, sz + 0.1);
  }
  // A wall bracket (Arts-and-Crafts corbel) under a shelf at height z, reaching out to depth u.
  function bracket(f, m, x, z, u = 0.7, h = 0.65, t = 0.1) {
    const out = [[0, 0], [u, 0], [u, -0.07], [u * 0.78, -0.09], [u * 0.62, -0.16], [u * 0.5, -0.3], [u * 0.28, -0.48], [u * 0.12, -h + 0.06], [0.06, -h], [0, -h]];
    put(f, m, extrude(out.reverse(), -t / 2, t / 2, { bevel: 0.008 }), { rz: Math.PI / 2, at: [x, 0, z - 0.008] });
  }
  // Pairs of shoes in a row along x0..x1 at depth y and height z. kinds: list to choose from.
  function shoeRow(f, x0, x1, y, z = 0, n = 4, kinds = ['loafer', 'boot', 'sneaker', 'flat']) {
    const r = R(f, x0, y, z), step = (x1 - x0) / Math.max(1, n);
    for (let i = 0; i < n; i++) K.shoes(f, x0 + step * (i + 0.5), y - 0.45, z, kinds[Math.floor(r() * kinds.length)], undefined, { turn: (r() - 0.5) * 0.2 });
  }
  // A two-tier slatted shoe rack w wide, against a wall; pairs of shoes on both tiers.
  function shoeRack(f, w = 2.8, o = {}) {
    const m = woodOf(o.wood ?? OAK), d = 1.05, tiers = [0.22, 0.85];
    for (const sx of [-1, 1]) bd(f, m, sx * (w / 2 - 0.04) - 0.04, sx * (w / 2 - 0.04) + 0.04, 0.05, d, 0, 1.4, 0.01, { grain: 'z' });
    for (const z of tiers) for (let k = 0; k < 4; k++) bd(f, m, -w / 2 + 0.08, w / 2 - 0.08, 0.1 + k * 0.25, 0.25 + k * 0.25, z - 0.04, z, 0.006, { grain: 'x' });
    bd(f, m, -w / 2, w / 2, 0.02, d + 0.02, 1.4, 1.48, 0.012);
    const kinds = (o.kinds ?? ['loafer', 'sneaker', 'flat', 'loafer']).filter(k => k !== 'boot'), n = Math.max(1, Math.floor(w / 0.75)), r = R(f, w);   // boots are too tall for the tiers: use bootTray
    for (const z of tiers) for (let i = 0; i < n; i++) K.shoes(f, -w / 2 + 0.1 + (w - 0.2) * (i + 0.5) / n, d * 0.5 - 0.42 + 0.05, z, kinds[Math.floor(r() * kinds.length)], undefined, { turn: (r() - 0.5) * 0.15 });
    f.block(-w / 2, w / 2, 0, d, 0, 1.5);
  }
  // A boot tray at (x, y): a low black tray with boots and wellies standing in it.
  function bootTray(f, x, y, w = 2.4, o = {}) {
    const s = f.sub(x, y), d = 1.3;
    put(s, 'c#26241f/0.75', loft([{ a: w / 2 - 0.02, b: d / 2 - 0.02, z: 0 }, { a: w / 2, b: d / 2, z: 0.12 }, { a: w / 2 - 0.04, b: d / 2 - 0.04, z: 0.12 }, { a: w / 2 - 0.05, b: d / 2 - 0.05, z: 0.025 }, { a: 0.001, b: 0.001, z: 0.025 }], { seg: 24, e: 6 }));
    const kinds = o.kinds ?? ['boot', 'boot'], r = R(f, x, y);
    kinds.forEach((k, i) => K.shoes(s, -w / 2 + (w / kinds.length) * (i + 0.5), -0.45, 0.025, k, o.colours?.[i], { turn: (r() - 0.5) * 0.3 }));
    s.block(-w / 2, w / 2, -d / 2, d / 2, 0, 1.5);
  }
  // A hall tree: a bench with a shoe shelf, a framed mirror, a rail of hooks with coats, a scarf and
  // a hat. Seat at 1.55. The frame is on the wall.
  function hallTree(f, w = 3.4, o = {}) {
    const m = woodOf(o.wood ?? OAK), d = 1.4, sz = 1.5;
    for (const sx of [-1, 1]) {
      bd(f, m, sx * (w / 2 - 0.08) - 0.08, sx * (w / 2 - 0.08) + 0.08, 0.02, 0.18, 0, 6.5, 0.015, { grain: 'z' });
      bd(f, m, sx * (w / 2 - 0.08) - 0.06, sx * (w / 2 - 0.08) + 0.06, 0.18, d, 0, 2.3, 0.012, { grain: 'z' });
      bd(f, m, sx * (w / 2 - 0.08) - 0.07, sx * (w / 2 - 0.08) + 0.07, d - 0.18, d + 0.02, 0, 2.35, 0.012, { grain: 'z' });
      put(f, m, lathe([[0.11, 0], [0.11, 0.03], [0.05, 0.1], [0, 0.11]], { seg: 4, th0: Math.PI / 4, th1: Math.PI / 4 + TAU }), { at: [sx * (w / 2 - 0.08), 0.1, 6.5] });
    }
    bd(f, m, -w / 2 + 0.16, w / 2 - 0.16, 0.18, d + 0.02, sz - 0.1, sz, 0.015, { grain: 'x' });
    bd(f, m, -w / 2 + 0.16, w / 2 - 0.16, d - 0.1, d - 0.02, sz - 0.42, sz - 0.1, 0.01, { grain: 'x' });
    bd(f, m, -w / 2 + 0.16, w / 2 - 0.16, 0.18, d - 0.1, 0.32, 0.38, 0.008);
    bd(f, m, -w / 2 + 0.16, w / 2 - 0.16, 0.05, 0.12, sz, 2.4, 0.01, { grain: 'x' });
    put(f, fab(o.cushion ?? 'linen#7d8a74'), softBox(-w / 2 + 0.2, w / 2 - 0.2, 0.2, d - 0.02, sz, sz + 0.2, 0.06, { n: [3, 2, 1], crown: 0.03, welt: 0.01, noBottom: true }));
    // back: rails, mirror, hooks
    for (const z of [2.4, 5.0, 6.1]) bd(f, m, -w / 2 + 0.16, w / 2 - 0.16, 0.05, 0.15, z, z + 0.25, 0.01, { grain: 'x' });
    bd(f, m, -w / 2 - 0.04, w / 2 + 0.04, 0.0, 0.25, 6.35, 6.47, 0.015, { grain: 'x' });
    put(f, MIRROR, bev(-w / 2 + 0.16, w / 2 - 0.16, 0.08, 0.1, 2.65, 5.0, 0.002));
    const hooks = []; const hx = [-0.36, -0.12, 0.12, 0.36].map(k => k * w);
    for (const x of hx) { hooks.push(sweep([[x, 0.15, 5.6], [x, 0.3, 5.62], [x, 0.38, 5.72], [x, 0.37, 5.8]], 0.016, { seg: 5 })); hooks.push(sweep([[x, 0.15, 5.5], [x, 0.25, 5.45], [x, 0.32, 5.38], [x, 0.33, 5.32]], 0.013, { seg: 5 })); hooks.push(xf(lathe([[0, 0], [0.05, 0], [0.04, 0.02], [0, 0.025]], { seg: 8 }), { rx: -Math.PI / 2, at: [x, 0.15, 5.55] })); }
    put(f, o.hooks ?? OLD_BRASS, merge(hooks));
    if (o.coats !== false) {
      K.coatOnPeg(f, hx[0], 0.15, 5.75, 'wool#5a4a3e', 'coat');
      K.coatOnPeg(f, hx[2], 0.18, 5.75, 'wool#3f4a56', 'jacket');
      K.scarf(f, hx[1], 0.32, 5.74, 'wool#8a3b2c', { l1: 1.5, l2: 1.1 });
      K.hat(f, hx[3], 0.42, 5.72, 'fedora', 'wool#6a5848', { tilt: -0.5 });
      K.toteBag(f, hx[3], 0.6, 0.38, 'linen#d8ccb4', { w: 1.0, h: 1.1 });
    }
    if (o.shoes !== false) { K.shoes(f, -w / 4, 0.85, 0.38, 'boot'); K.shoes(f, w / 4 - 0.3, 0.85, 0.38, 'loafer'); }
    K.seat(f, 0, 0.9, sz + 0.2, 'sit on the bench');
    f.block(-w / 2, w / 2, 0, d, 0, sz + 0.2);
  }
  // A freestanding coat tree at (x, y): turned post, splayed feet, pegs; coats, a hat and a scarf.
  function coatRack(f, x, y, o = {}) {
    const m = woodOf(o.wood ?? WALNUT), s = f.sub(x, y), h = 6.0;
    put(s, m, lathe([[0, 0.25], [0.12, 0.25], [0.12, 0.35], [0.08, 0.4], [0.065, 0.9], [0.07, 3.5], [0.06, 5.6], [0.09, 5.65], [0.09, 5.75], [0.06, 5.8], [0.07, h - 0.1], [0.04, h], [0, h + 0.02]], { seg: 10 }));
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU + Math.PI / 4; put(s, m, sweep([[0, 0, 0.5], [Math.cos(a) * 0.4, Math.sin(a) * 0.4, 0.22], [Math.cos(a) * 0.95, Math.sin(a) * 0.95, 0.04]], (t) => 0.06 - t * 0.025, { seg: 6, caps: true })); }
    const pegs = [];
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU, z = i % 2 ? 5.3 : 5.7; pegs.push(sweep([[0, 0, z], [Math.cos(a) * 0.32, Math.sin(a) * 0.32, z + 0.12]], 0.028, { seg: 6 })); pegs.push(xf(lathe([[0, -0.04], [0.045, 0], [0, 0.045]], { seg: 8 }), { at: [Math.cos(a) * 0.33, Math.sin(a) * 0.33, z + 0.13] })); }
    put(s, m, merge(pegs));
    if (o.coats !== false) {
      K.coatOnPeg(s, 0.0, 0.2, 5.65, o.coat ?? 'wool#4f4338', 'coat', { squash: 1.4 });
      K.coatOnPeg(s.sub(0, 0, 0, 2), 0.0, 0.2, 5.3, 'linen#8e8a6e', 'jacket', { squash: 1.3 });
      K.hat(s, 0, 0, h + 0.0, 'fedora', 'wool#5a4a3c', { tilt: 0.05 });
      K.scarf(s.sub(0, 0, 0, 1), 0, 0.33, 5.83, 'wool#9a7a3a', { l1: 1.4, l2: 1.0, w: 0.45 });
    }
    s.block(-0.6, 0.6, -0.6, 0.6, 0, h);
  }

  // ---- bookcase ----------------------------------------------------------------------------------------------
  // Fir bookcase standing with its back to a wall; front faces the frame's front. Plinth, cornice,
  // face frame, lipped shelves; every book gets a real printed spine. The cornice tops out at
  // tall + 0.12 and overhangs 0.07: under the picture rail (6.95 above the floor) keep tall <= 6.8.
  function bookcase(f, w, tall, o = {}) {
    const d = o.d ?? 0.95, t = 0.09, pitch = o.pitch ?? 1.08, m = o.wood ?? 'fir';
    bd(f, m, -w / 2, -w / 2 + t, 0, d, 0, tall, 0.012, { grain: 'z' }); bd(f, m, w / 2 - t, w / 2, 0, d, 0, tall, 0.012, { grain: 'z' });
    bd(f, m, -w / 2 + t - 0.01, w / 2 - t + 0.01, 0, 0.04, 0, tall, 0.006, { grain: 'z' });      // the back and the plinth sit between the sides (their ends used to lie in the sides' outer faces, and flickered there)
    bd(f, m, -w / 2 - 0.03, w / 2 + 0.03, 0, d + 0.03, tall, tall + 0.06, 0.012, { grain: 'x' });
    bd(f, m, -w / 2 - 0.07, w / 2 + 0.07, 0, d + 0.07, tall + 0.05, tall + 0.12, 0.02, { grain: 'x' });
    bd(f, m, -w / 2 + t - 0.01, w / 2 - t + 0.01, 0, d - 0.04, 0, 0.28, 0.01, { grain: 'x' });
    bd(f, m, -w / 2 + t, w / 2 - t, d - 0.06, d, 0.02, 0.26, 0.012, { grain: 'x' });
    for (const sx of [-1, 1]) bd(f, m, sx * (w / 2 - t / 2) - t / 2 - 0.015, sx * (w / 2 - t / 2) + t / 2 + 0.015, d - 0.01, d + 0.025, 0, tall, 0.008, { grain: 'z' });
    const bays = Math.max(1, Math.round(w / 3.4)), bw = (w - t) / bays;
    for (let i = 1; i < bays; i++) { bd(f, m, -w / 2 + i * bw, -w / 2 + i * bw + t, 0, d, 0.28, tall, 0.01, { grain: 'z' }); bd(f, m, -w / 2 + i * bw - 0.015, -w / 2 + i * bw + t + 0.015, d - 0.01, d + 0.02, 0.28, tall, 0.006, { grain: 'z' }); }
    for (let z = 0.28; z < tall - 0.6; z += pitch) {
      if (z > 0.3) { bd(f, m, -w / 2 + t, w / 2 - t, 0.04, d - 0.06, z - 0.06, z, 0.006, { grain: 'x' }); bd(f, m, -w / 2 + t, w / 2 - t, d - 0.06, d - 0.0, z - 0.1, z, 0.012, { grain: 'x' }); }
      for (let i = 0; i < bays; i++) K.bookRow(f, -w / 2 + i * bw + t + 0.03, -w / 2 + (i + 1) * bw - 0.03, 0.04, z, Math.min(pitch - 0.07, tall - z), o.fill ?? 0.9);
    }
    f.block(-w / 2, w / 2, 0, d, 0, tall);
  }

  // ---- kitchen --------------------------------------------------------------------------------------------------
  // Base cabinets against a wall, counter at 3.0: toe kick, painted face frame, shaker doors under
  // drawers, brass knobs and cup pulls, a counter with thickness and overhang. o: { d, top (counter
  // material), paint, sink: { x, w, d, depth, apron, tap, basin }, open (doors open with E) }
  function cabinets(f, w, o = {}) {
    const d = o.d ?? 2, n = Math.max(1, Math.round(w / 1.6)), dw = w / n, paint = o.paint ?? PAINT_SAGE, top = o.top === 'marble' || o.top === K.MARBLE ? 'marble' : woodOf(o.top ?? 'c#b88a5a/0.5');
    const front = d - 0.06, sink = o.sink === true ? {} : o.sink;
    bd(f, 'c#2a2420/0.8', -w / 2 + 0.02, w / 2 - 0.02, 0.15, d - 0.28, 0, 0.32, 0.004, { grain: 'x' });
    bd(f, paint, -w / 2, w / 2, 0, front - 0.065, 0.3, 2.88, 0.01, { grain: 'z' });
    for (const sx of [-1, 1]) bd(f, paint, sx * w / 2 - (sx > 0 ? 0.08 : 0), sx * w / 2 + (sx < 0 ? 0.08 : 0), 0, front, 0.3, 2.88, 0.008, { grain: 'z' });
    bd(f, paint, -w / 2, w / 2, front - 0.08, front, 0.3, 0.42, 0.006, { grain: 'x' });
    bd(f, paint, -w / 2, w / 2, front - 0.08, front, 2.12, 2.2, 0.006, { grain: 'x' });
    bd(f, paint, -w / 2, w / 2, front - 0.08, front, 2.8, 2.88, 0.006, { grain: 'x' });
    const sx0 = sink ? (sink.x ?? 0) - (sink.w ?? 2.4) / 2 : 0, sx1 = sink ? (sink.x ?? 0) + (sink.w ?? 2.4) / 2 : 0;
    for (let i = 0; i < n; i++) {
      const x0 = -w / 2 + i * dw, x1 = x0 + dw, underSink = sink && x1 > sx0 + 0.1 && x0 < sx1 - 0.1;
      if (i) bd(f, paint, x0 - 0.05, x0 + 0.05, front - 0.08, front, 0.3, 2.88, 0.006, { grain: 'z' });
      const a = x0 + (i ? 0.05 : 0.08) + 0.012, b = x1 - (i < n - 1 ? 0.05 : 0.08) - 0.012;
      if (!(underSink && sink.apron !== false)) drawer(f, paint, a, b, 2.21, 2.79, front + 0.005, { pull: underSink ? false : 'cup' });
      if (o.open) K.hingedDoor(f, a, b, front - 0.03, 0.43, 2.11, { hinge: i % 2 ? 'right' : 'left', mat: paint, label: 'cupboard' });
      else shakerDoor(f, paint, a, b, 0.43, 2.11, front + 0.005, { hinge: i % 2 ? 'right' : 'left', knobZ: 1.85 });
    }
    // counter, cut round the sink if there is one
    const T0 = 2.88, T1 = 3.02, cy0 = -0.02, cy1 = d + 0.08;
    if (!sink) bd(f, top, -w / 2 - 0.05, w / 2 + 0.05, cy0, cy1, T0, T1, 0.025, { grain: 'x' });
    else {
      const sw = sink.w ?? 2.4, sd = sink.d ?? 1.6, sx = sink.x ?? 0, apron = sink.apron !== false, depth = sink.depth ?? 0.75;
      const by0 = apron ? cy1 - 0.06 - sd : 0.3, by1 = apron ? cy1 - 0.06 : by0 + Math.min(sd, d - 0.75);
      bd(f, top, -w / 2 - 0.05, sx - sw / 2, cy0, cy1, T0, T1, 0.02, { grain: 'x' });
      bd(f, top, sx + sw / 2, w / 2 + 0.05, cy0, cy1, T0, T1, 0.02, { grain: 'x' });
      bd(f, top, sx - sw / 2 - 0.01, sx + sw / 2 + 0.01, cy0, by0, T0, T1, 0.02, { grain: 'x' });
      if (!apron) bd(f, top, sx - sw / 2 - 0.01, sx + sw / 2 + 0.01, by1, cy1, T0, T1, 0.02, { grain: 'x' });
      basin(f, sink.basin ?? (apron ? PORCELAIN : 'c#d9d6cf/0.2/0.9'), sx, (by0 + by1) / 2, apron ? T1 - 0.005 : T0 - 0.005, sw / 2 - (apron ? 0.0 : -0.05), (by1 - by0) / 2 + (apron ? 0.0 : 0.05), depth, { rim: apron ? 0.09 : 0.03, apron });
      tap(f, sx, by0 - 0.22, T1, { mat: sink.tap ?? BRASS, reach: (by1 - by0) / 2 + 0.05, height: 1.25 });
    }
    f.block(-w / 2, w / 2, 0, d, 0, 3);
  }
  // A basin: a rounded-rectangle bowl with real depth, rim top at z, half sizes a by b, centred at (x, y).
  function basin(f, m, x, y, z, a, b, depth, o = {}) {
    const rim = o.rim ?? 0.06, e = o.e ?? 5, z0 = z - depth - rim;
    const R2 = (s, zz) => ({ a: Math.max(0.004, a - s), b: Math.max(0.004, b - s), z: zz });
    const rows = [R2(b - 0.004, z0), R2(0.06, z0), R2(0.0, z0 + 0.06), R2(0, z - 0.02), R2(0.01, z), R2(rim - 0.01, z), R2(rim, z - 0.02), R2(rim, z0 + rim + 0.12), R2(rim + 0.07, z0 + rim + 0.02), R2(b - 0.004, z0 + rim)];
    put(f, m, loft(rows, { seg: 32, e }), { at: [x, y, 0] });
    put(f, 'c#8f8a82/0.25/1', lathe([[0, 0], [0.07, 0], [0.075, 0.008], [0.06, 0.01], [0, 0.004]], { seg: 12 }), { at: [x, y, z0 + rim + 0.022] });
  }
  // A bridge or gooseneck tap standing at (x, y) on a surface at z, spout reaching toward +y.
  function tap(f, x, y, z, o = {}) {
    const m = o.mat ?? BRASS, H = o.height ?? 1.1, reach = o.reach ?? 0.6, s = f.sub(x, y, z);
    put(s, m, lathe([[0, 0], [0.09, 0], [0.09, 0.03], [0.055, 0.06], [0.045, 0.3], [0.05, 0.32], [0.04, 0.34], [0, 0.34]], { seg: 12 }));
    const p = [[0, 0, 0.3], [0, 0, H * 0.75], [0, reach * 0.15, H * 0.97], [0, reach * 0.5, H], [0, reach * 0.85, H * 0.9], [0, reach, H * 0.72], [0, reach, H * 0.62]];
    put(s, m, sweep(p, 0.032, { seg: 8 }));
    put(s, m, lathe([[0.035, 0], [0.04, -0.04], [0, -0.045]], { seg: 8 }), { at: [0, reach, H * 0.62] });
    for (const sx of [-1, 1]) {
      put(s, m, sweep([[0, 0, 0.22], [sx * 0.25, 0, 0.22]], 0.025, { seg: 6 }));
      put(s, m, lathe([[0, 0], [0.05, 0], [0.045, 0.12], [0.03, 0.14], [0.03, 0.2], [0, 0.2]], { seg: 10 }), { at: [sx * 0.3, 0, 0.0] });
      put(s, m, merge([0, 1, 2, 3].map(k => { const a = k / 4 * TAU + Math.PI / 4; return sweep([[0, 0, 0.2], [Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0.22]], 0.012, { seg: 4 }); })), { at: [sx * 0.3, 0, 0] });
      put(s, PORCELAIN, lathe([[0, 0], [0.025, 0], [0.025, 0.03], [0, 0.03]], { seg: 8 }), { at: [sx * 0.3, 0, 0.215] });
    }
  }
  // Upper cabinets on the wall, bottom at o.z (4.6), tall (2.6), d (1.1); shaker or glazed doors
  // (o.glass: true or 'prairie') with plates and glasses inside; crown moulding.
  function upperCabinets(f, w, o = {}) {
    const z0 = o.z ?? 4.6, tall = o.tall ?? 2.6, d = o.d ?? 1.1, paint = o.paint ?? PAINT_SAGE, z1 = z0 + tall, front = d;
    bd(f, paint, -w / 2, w / 2, 0.0, d - 0.065, z0, z1, 0.008, { grain: 'z' });
    for (const sx of [-1, 1]) bd(f, paint, sx * w / 2 - (sx > 0 ? 0.08 : 0), sx * w / 2 + (sx < 0 ? 0.08 : 0), 0, front, z0, z1, 0.006, { grain: 'z' });
    bd(f, paint, -w / 2, w / 2, front - 0.08, front, z0, z0 + 0.1, 0.005, { grain: 'x' });
    bd(f, paint, -w / 2, w / 2, front - 0.08, front, z1 - 0.12, z1, 0.005, { grain: 'x' });
    bd(f, paint, -w / 2 - 0.04, w / 2 + 0.04, 0, d + 0.04, z1, z1 + 0.06, 0.01, { grain: 'x' });
    bd(f, paint, -w / 2 - 0.1, w / 2 + 0.1, 0, d + 0.1, z1 + 0.06, z1 + 0.18, 0.03, { grain: 'x' });
    const n = Math.max(1, Math.round(w / 1.5)), dw = w / n;
    if (o.glass) {
      bd(f, shade(paint, 0.95), -w / 2 + 0.08, w / 2 - 0.08, 0.06, front - 0.1, z0 + tall * 0.48, z0 + tall * 0.48 + 0.05, 0.005);
      const r = R(f, w, z0);
      for (let i = 0; i < n * 3; i++) { const x = -w / 2 + 0.25 + (w - 0.5) * (i + 0.5) / (n * 3); put(f, PORCELAIN, lathe([[0, 0], [0.42, 0], [0.42, 0.025], [0, 0.025]], { seg: 16 }), { rx: -Math.PI / 2 + 0.12, at: [x, 0.3, z0 + 0.12 + 0.42] }); }
      for (let i = 0; i < n * 4; i++) K.cup(f, -w / 2 + 0.25 + (w - 0.5) * (i + 0.5) / (n * 4), 0.55, z0 + tall * 0.48 + 0.05, r() < 0.5 ? 'c#e9e4da/0.25' : GLASS);
    }
    for (let i = 0; i < n; i++) {
      const x0 = -w / 2 + i * dw, x1 = x0 + dw;
      if (i) bd(f, paint, x0 - 0.05, x0 + 0.05, front - 0.08, front, z0, z1, 0.005, { grain: 'z' });
      shakerDoor(f, paint, x0 + (i ? 0.05 : 0.08) + 0.012, x1 - (i < n - 1 ? 0.05 : 0.08) - 0.012, z0 + 0.112, z1 - 0.132, front + 0.005, { hinge: i % 2 ? 'right' : 'left', glass: o.glass, knobZ: z0 + 0.35 });
    }
  }
  // Open shelves on Arts-and-Crafts brackets, w long, at the heights in zs. o.fill: set out crockery.
  function openShelves(f, w, zs = [4.6, 5.8], o = {}) {
    const m = woodOf(o.wood ?? OAK), d = o.d ?? 0.85, r = R(f, w, zs[0]);
    for (const z of zs) {
      bd(f, m, -w / 2, w / 2, 0.0, d, z, z + 0.1, 0.015, { grain: 'x' });
      const nb = Math.max(2, Math.round(w / 3) + 1);
      for (let i = 0; i < nb; i++) bracket(f, m, -w / 2 + 0.3 + (w - 0.6) * i / (nb - 1), z, d * 0.8, 0.55, 0.09);
      if (o.fill !== false) {
        let x = -w / 2 + 0.25;
        while (x < w / 2 - 0.3) {
          const k = r();
          if (k < 0.35) { for (let j = 0; j < 5; j++) K.plate(f, x + 0.25, 0.45, z + 0.1 + j * 0.045, 0.3, j % 2 ? PORCELAIN : 'c#d8d2c4/0.2'); x += 0.7; }
          else if (k < 0.65) { for (let j = 0; j < 3 && x < w / 2 - 0.3; j++) { K.cup(f, x + 0.12, 0.45, z + 0.1, ['c#e9e4da/0.25', 'c#9fb0a4/0.25', 'c#c98f8a/0.25'][Math.floor(r() * 3)]); x += 0.32; } x += 0.1; }
          else if (k < 0.85) { K.vase(f, x + 0.2, 0.42, z + 0.1, 0.55 + r() * 0.3, 0.17, r() < 0.5 ? GLASS : 'c#c9b9a0/0.3', 'jar'); x += 0.5; }
          else { K.bookStack(f, x + 0.4, 0.45, z + 0.1, 2); x += 0.9; }
        }
      }
    }
  }
  // A wall plate rack w wide, its bottom at o.z (4.4): dowels, a drip tray, plates standing in it.
  function plateRack(f, w = 2.6, o = {}) {
    const m = woodOf(o.wood ?? OAK), z = o.z ?? 4.4, h = 1.7, d = 0.7;
    for (const sx of [-1, 1]) bd(f, m, sx * (w / 2 - 0.05) - 0.05, sx * (w / 2 - 0.05) + 0.05, 0.02, d, z, z + h, 0.01, { grain: 'z' });
    bd(f, m, -w / 2, w / 2, 0.02, d, z, z + 0.08, 0.01, { grain: 'x' });
    bd(f, m, -w / 2 - 0.04, w / 2 + 0.04, 0.0, d + 0.04, z + h, z + h + 0.08, 0.012, { grain: 'x' });
    for (const zz of [z + 0.55, z + 1.2]) bd(f, m, -w / 2 + 0.1, w / 2 - 0.1, 0.02, 0.08, zz, zz + 0.12, 0.008, { grain: 'x' });
    const dowels = [];
    for (let x = -w / 2 + 0.2; x < w / 2 - 0.15; x += 0.16) { dowels.push(sweep([[x, d - 0.12, z + 0.08], [x, d - 0.12, z + 0.75]], 0.016, { seg: 5 })); dowels.push(sweep([[x, 0.25, z + 0.08], [x, 0.25, z + 1.1]], 0.016, { seg: 5 })); }
    put(f, m, merge(dowels));
    const n = Math.floor((w - 0.4) / 0.16);
    for (let i = 0; i < n; i++) { const x = -w / 2 + 0.28 + i * 0.16; put(f, i % 3 === 2 ? 'c#b6c3c8/0.2' : PORCELAIN, lathe([[0, 0], [0.34, 0], [0.4, 0.03], [0.39, 0.04], [0.33, 0.02], [0, 0.018]], { seg: 20 }), { ry: Math.PI / 2, rx: 0, rz: 0, at: [x, d * 0.45, z + 0.5] }); }
  }
  // A pot rail along the wall at height z with S-hooks: pans, a saucepan, a ladle, a whisk.
  function potRail(f, w = 4, z = 5.4, o = {}) {
    const m = o.mat ?? BRASS, y = 0.22;
    put(f, m, sweep([[-w / 2, y, z], [w / 2, y, z]], 0.03, { seg: 8 }));
    for (const x of [-w / 2 + 0.15, w / 2 - 0.15]) { put(f, m, sweep([[x, 0, z], [x, y, z]], 0.02, { seg: 6 })); put(f, m, lathe([[0, 0], [0.07, 0], [0.06, 0.03], [0, 0.03]], { seg: 10 }), { rx: -Math.PI / 2, at: [x, 0, z] }); }
    const items = o.items ?? ['pan', 'saucepan', 'ladle', 'pan', 'whisk', 'saucepan'], step = (w - 0.6) / items.length;
    items.forEach((k, i) => {
      const x = -w / 2 + 0.3 + step * (i + 0.5);
      put(f, IRON, sweep([[x, y, z + 0.02], [x, y + 0.04, z + 0.05], [x, y + 0.07, z], [x, y + 0.04, z - 0.06], [x, y + 0.02, z - 0.12], [x, y + 0.05, z - 0.18], [x, y + 0.08, z - 0.13]], 0.009, { seg: 4 }));
      const hz = z - 0.15, mat = o.copper === false ? IRON : 'copper';
      if (k === 'pan' || k === 'saucepan') {
        const r = k === 'pan' ? 0.42 : 0.3, dp = k === 'pan' ? 0.16 : 0.3, hl = k === 'pan' ? 0.8 : 0.65;
        const body = lathe([[0, 0], [r * 0.85, 0], [r, dp], [r - 0.015, dp + 0.01], [r * 0.85 - 0.02, 0.015], [0, 0.015]], { seg: 20 });
        const handle = sweep([[0, -r, dp * 0.9], [0, -r - hl * 0.5, dp * 1.1], [0, -r - hl, dp * 1.3]], 0.025, { seg: 6, caps: true });
        const T = { rx: -Math.PI / 2, at: [x, y + 0.12, hz - r - hl - 0.05] };
        put(f, mat, body, T); put(f, k === 'pan' ? IRON : BRASS, handle, T);
      } else if (k === 'ladle') {
        put(f, 'c#c9c6c0/0.25/1', merge([sweep([[0, 0, 0], [0, 0, -1.05]], 0.015, { seg: 5 }), xf(lathe([[0, 0], [0.12, 0.02], [0.14, 0.1], [0.13, 0.1], [0.11, 0.03], [0, 0.015]], { seg: 12 }), { at: [0, 0.08, -1.18] })]), { at: [x, y + 0.08, hz] });
      } else {
        const wires = []; for (let k2 = 0; k2 < 6; k2++) { const a = k2 / 6 * Math.PI, p = []; for (let j = 0; j <= 8; j++) { const t = j / 8 * Math.PI; p.push([Math.cos(a) * Math.sin(t) * 0.11, Math.sin(a) * Math.sin(t) * 0.11, -0.5 - (1 - Math.cos(t)) * 0.22]); } wires.push(sweep(p, 0.004, { seg: 3 })); }
        wires.push(sweep([[0, 0, 0], [0, 0, -0.5]], 0.025, { seg: 6, caps: true }));
        put(f, 'c#c9c6c0/0.25/1', merge(wires), { at: [x, y + 0.08, hz] });
      }
    });
  }
  // A range hood: 'plaster' (a tapering chimney breast with a mantel shelf) or 'copper', over a
  // stove w wide; bottom at o.z (5.4) and up to the ceiling at o.top (8.15).
  function rangeHood(f, w = 3.2, o = {}) {
    const z0 = o.z ?? 5.4, top = o.top ?? 8.15, d = o.d ?? 2.0, m = o.mat ?? ((o.kind ?? 'plaster') === 'copper' ? 'copper' : 'plaster');
    const rect = (A, B, z) => ({ a: A / Math.SQRT1_2, b: B / Math.SQRT1_2, z, y: B });
    put(f, m, loft([rect(w / 2 - 0.02, d / 2 - 0.02, z0), rect(w / 2, d / 2, z0 + 0.02), rect(w / 2, d / 2, z0 + 0.45), rect(w * 0.3, d * 0.33, z0 + 1.5), rect(w * 0.3, d * 0.33, top)], { seg: 4, th0: Math.PI / 4, th1: Math.PI / 4 + TAU, flat: true }));
    put(f, 'c#2a2622/0.6', bev(-w / 2 + 0.06, w / 2 - 0.06, 0.06, d - 0.06, z0 - 0.002, z0 + 0.01, 0.002));
    const trim = (o.kind ?? 'plaster') === 'copper' ? BRASS : woodOf(o.wood ?? OAK);
    bd(f, trim, -w / 2 - 0.06, w / 2 + 0.06, 0, d + 0.06, z0 + 0.45, z0 + 0.55, 0.015, { grain: 'x' });
    if (m === 'copper') for (let x = -w / 2 + 0.1; x < w / 2; x += 0.25) put(f, BRASS, lathe([[0, 0], [0.02, 0], [0, 0.015]], { seg: 6 }), { rx: -Math.PI / 2, at: [x, d + 0.002, z0 + 0.3] });
  }

  return { knob, cupPull, bailPull, drawer, shakerDoor, leg, table, diningTable, diningChair, sideTable, plantStand, carcass, dresser, nightstand, desk, console: console_, sideboard, wardrobe, closetRail, bracket, shoeRow, shoeRack, bootTray, hallTree, coatRack, bookcase, cabinets, basin, tap, upperCabinets, openShelves, plateRack, potRail, rangeHood };
}
