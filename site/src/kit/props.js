// Small things: mugs and cups, flowers in a jar, framed pictures, plants, and the everyday
// clutter of a lived-in house (magazines, an open book, a laptop, a phone, the remote,
// tissues, lotions, perfume, soap, toothbrushes, an umbrella stand). Printed surfaces
// (covers, labels, screens) are drawn with K.sign.

import { lathe, loft, sweep, bev, softBox, sheet, pillow, merge, xf, tris, grid, moulding, rng, TAU } from './geom.js';
import { fab, BRASS, GLASS, PAPER, PORCELAIN, CLAY, INK, shade } from './mats.js';

// Two-sided thin surface (a petal, a leaf, a page)
function twoSided(g) {
  const a = g.index ? g.toNonIndexed() : g, b = a.clone();
  for (const [name, k] of [['position', 3], ['normal', 3], ['uv', 2]]) {
    const arr = b.attributes[name]?.array; if (!arr) continue;
    for (let t = 0; t < arr.length; t += 3 * k) for (let c = 0; c < k; c++) { const i1 = t + k + c, i2 = t + 2 * k + c, v = arr[i1]; arr[i1] = arr[i2]; arr[i2] = v; }
  }
  const n = b.attributes.normal.array; for (let i = 0; i < n.length; i++) n[i] = -n[i];
  return merge([a, b]);
}

export function makeProps(K) {
  const { put } = K;
  const R = (f, ...k) => rng(f.X, f.Y, f.h, ...k);

  // ---- vessels -------------------------------------------------------------------------------
  // A mug with a handle; hot: coffee steams.
  function mug(f, x, y, z, color = K.WHITE, hot = false, o = {}) {
    const c = /^c#/.test(color) ? color.replace(/\/[\d.]+.*$/, '') + '/0.25' : color;
    put(f, c, lathe([[0, 0], [0.12, 0], [0.13, 0.015], [0.135, 0.15], [0.14, 0.29], [0.135, 0.3], [0.125, 0.295], [0.122, 0.03], [0, 0.03]], { seg: 18 }), { rz: o.turn ?? 0.6, at: [x, y, z] });
    put(f, c, sweep([[0.13, 0, 0.24], [0.2, 0, 0.235], [0.235, 0, 0.18], [0.22, 0, 0.1], [0.13, 0, 0.075]], 0.018, { seg: 6 }), { rz: o.turn ?? 0.6, at: [x, y, z] });
    put(f, o.fill ?? 'c#6b4630/0.15', lathe([[0, 0], [0.123, 0], [0, 0.001]], { seg: 16 }), { at: [x, y, z + 0.255] });
    if (hot) { const [a, b] = K.world(f, x, y); K.steam.push({ x: a, y: f.h + z + 0.34, z: b }); }
  }
  // A small cup (espresso, tea), with a handle.
  function cup(f, x, y, z, c = K.WHITE, o = {}) {
    const m = /^c#/.test(c) ? c.replace(/\/[\d.]+.*$/, '') + '/0.25' : c, turn = o.turn ?? 1.2;
    put(f, m, lathe([[0, 0], [0.065, 0], [0.07, 0.01], [0.09, 0.05], [0.108, 0.18], [0.11, 0.2], [0.1, 0.198], [0.085, 0.06], [0.06, 0.03], [0, 0.03]], { seg: 12 }), { rz: turn, at: [x, y, z] });
    put(f, m, sweep([[0.1, 0, 0.16], [0.15, 0, 0.155], [0.165, 0, 0.12], [0.145, 0, 0.08], [0.09, 0, 0.07]], 0.013, { seg: 4 }), { rz: turn, at: [x, y, z] });
  }
  // A plate or saucer at (x, y, z), radius r.
  const plate = (f, x, y, z, r = 0.33, c = PORCELAIN) => put(f, c, lathe([[0, 0], [r * 0.6, 0], [r * 0.62, 0.012], [r * 0.7, 0.012], [r, 0.035], [r * 0.98, 0.045], [r * 0.7, 0.024], [0, 0.022]], { seg: 16 }), { at: [x, y, z] });
  // A glass bottle or vase: radius r, height h, at (x, y, z). Profile 'bud' | 'jar' | 'bottle'.
  function vase(f, x, y, z, h = 0.6, r = 0.15, mat = GLASS, kind = 'jar') {
    const p = kind === 'bottle' ? [[0, 0], [r, 0], [r, h * 0.6], [r * 0.4, h * 0.78], [r * 0.3, h], [r * 0.25, h], [0, h * 0.8]]
      : kind === 'bud' ? [[0, 0], [r * 0.8, 0], [r, h * 0.25], [r * 0.5, h * 0.75], [r * 0.45, h], [r * 0.38, h], [0, h * 0.2]]
      : [[0, 0], [r * 0.85, 0], [r, h * 0.12], [r, h * 0.82], [r * 0.82, h * 0.92], [r * 0.86, h], [r * 0.8, h], [r * 0.76, h * 0.92], [r * 0.9, h * 0.8], [r * 0.9, h * 0.1], [0, h * 0.05]];
    put(f, mat, lathe(p, { seg: 18 }), { at: [x, y, z] });
  }

  // ---- flowers ----------------------------------------------------------------------------------
  // A flower head opening toward +z at the origin: 'daisy' | 'ranunculus' | 'tulip' | 'sprig'.
  function bloom(kind, r) {
    if (kind === 'daisy') {
      const n = 11, petals = [];
      for (let i = 0; i < n; i++) {
        const a = i / n * TAU + r() * 0.2, c = Math.cos(a), s = Math.sin(a), L = 0.085 + r() * 0.015, w = 0.016;
        const g = sheet((u, v) => { const t = 0.025 + v * L, wd = w * Math.sin(Math.min(1, v * 1.3) * Math.PI * 0.85 + 0.3) * (u * 2 - 1); return [c * t - s * wd, s * t + c * wd, 0.012 - v * v * 0.02]; }, 1, 2);
        petals.push(g);
      }
      return { petals: twoSided(merge(petals)), heart: lathe([[0, -0.01], [0.03, 0], [0.026, 0.018], [0, 0.026]], { seg: 8 }) };
    }
    if (kind === 'tulip') {
      return { petals: lathe([[0, -0.02], [0.04, -0.01], [0.06, 0.04], [0.058, 0.1], [0.045, 0.14], [0.042, 0.135], [0.05, 0.1], [0.05, 0.04], [0, 0.0]], { seg: 12, mod: (t, j) => 1 - (j >= 3 && j <= 5 ? 0.12 * Math.abs(Math.sin(t * 1.5)) : 0), lift: (t, j) => (j >= 4 && j <= 5 ? 0.02 * Math.cos(t * 3) : 0) }) };
    }
    if (kind === 'sprig') {
      const buds = []; for (let i = 0; i < 5; i++) { const a = r() * TAU, d = r() * 0.05; buds.push(xf(lathe([[0, 0], [0.018, 0.01], [0.02, 0.025], [0, 0.04]], { seg: 6 }), { at: [Math.cos(a) * d, Math.sin(a) * d, r() * 0.04] })); }
      return { petals: merge(buds) };
    }
    // ranunculus: nested cups with scalloped rims
    const layers = [];
    for (let k = 0; k < 3; k++) {
      const s = 1 - k * 0.27;
      layers.push(lathe([[0, -0.03 * s], [0.05 * s, -0.02 * s], [0.075 * s, 0.015 * s], [0.08 * s, 0.04 * s], [0.07 * s, 0.045 * s], [0.06 * s, 0.02 * s], [0, 0.0]], { seg: 10, mod: t => 1 + 0.08 * Math.sin(t * (5 + k) + k), lift: (t, j) => (j >= 3 && j <= 4 ? 0.008 * Math.sin(t * (5 + k)) : 0) }));
    }
    return { petals: merge(layers) };
  }
  // Small flowers in a glass jar of water. colors: the flower colours (plain or textured names).
  function posy(f, x, y, z, colors = ['c#e7c64a/0.8', 'c#e58f7a/0.8', 'c#f2ead8/0.8'], o = {}) {
    const rr = R(f, x, y, z), stems = [], leaves = [], heads = {};
    put(f, o.jar ?? GLASS, lathe([[0, 0], [0.11, 0], [0.12, 0.01], [0.15, 0.2], [0.14, 0.38], [0.11, 0.43], [0.12, 0.45], [0.11, 0.452], [0.1, 0.43], [0.13, 0.37], [0.14, 0.2], [0.11, 0.02], [0, 0.015]], { seg: 18 }), { at: [x, y, z] });
    put(f, 'c#a7b8a6/0.05', lathe([[0, 0.015], [0.11, 0.02], [0.135, 0.2], [0.13, 0.3], [0, 0.3]], { seg: 14 }), { at: [x, y, z] });
    const kinds = o.kinds ?? ['ranunculus', 'daisy', 'tulip', 'sprig'];
    for (let i = 0; i < 9; i++) {
      const a = K.rnd() * 6.28, r = K.rnd() * 0.22, hh = 0.75 + K.rnd() * 0.35, col = K.pick(colors);
      const hx = Math.cos(a) * r, hy = Math.sin(a) * r, kind = kinds[i % kinds.length];
      const path = [[hx * 0.05, hy * 0.05, 0.03], [hx * 0.18, hy * 0.18, 0.35], [hx * 0.55, hy * 0.55, (0.45 + hh) / 2 + 0.05], [hx, hy, hh]];
      stems.push(sweep(path, 0.011, { seg: 4 }));
      const b = bloom(kind, rr), tilt = Math.atan2(r, hh - 0.4) * 1.3;
      const T = { rx: 0, ry: tilt, rz: a, at: [x + hx, y + hy, z + hh] };
      const key = kind === 'sprig' ? 'c#f2ead8/0.8' : col;
      (heads[key] = heads[key] ?? []).push(xf(b.petals, { ry: tilt, rz: a }).translate(hx, hy, hh));
      if (b.heart) (heads['c#c9922e/0.7'] = heads['c#c9922e/0.7'] ?? []).push(xf(b.heart, { ry: tilt, rz: a }).translate(hx, hy, hh));
      if (rr() < 0.6) { const la = a + (rr() - 0.5), lz = 0.55 + rr() * 0.2; leaves.push(xf(leafGeo(0.16, 0.05, rr), { ry: -0.9, rz: la, at: [hx * 0.4, hy * 0.4, lz] })); }
    }
    put(f, 'c#4f6b3c/0.8', merge(stems), { at: [x, y, z] });
    if (leaves.length) put(f, 'c#56743f/0.7', merge(leaves), { at: [x, y, z] });
    for (const [c, list] of Object.entries(heads)) put(f, c, merge(list), { at: [x, y, z] });
  }
  // A leaf L long, W wide, growing along +x from the origin, cupped and drooping.
  function leafGeo(L, W, r = Math.random, droop = 0.3) {
    return twoSided(sheet((u, v) => { const s = Math.sin(v * Math.PI) ** 0.8 * W * (u * 2 - 1), x = v * L; return [x, s, -droop * x * x / L + Math.abs(s) * 0.25 + (r() - 0.5) * 0.002]; }, 2, 4));
  }

  // ---- plants ------------------------------------------------------------------------------------------
  // A potted plant at (x, y, z). kind: 'leafy' (broad leaves on stems), 'snake' (upright blades),
  // 'trailing' (vines spilling over the rim), 'fern'. size scales it. pot: material of the pot.
  function pottedPlant(f, x, y, z = 0, kind = 'leafy', o = {}) {
    const r = R(f, x, y, z), s = o.size ?? 1, pr = 0.42 * s * (o.potScale ?? 1), ph = 0.7 * s * (o.potScale ?? 1);
    put(f, o.pot ?? CLAY, lathe([[0, 0], [pr * 0.7, 0], [pr * 0.75, 0.02], [pr * 0.95, ph * 0.85], [pr * 1.05, ph * 0.86], [pr * 1.05, ph], [pr * 0.98, ph], [pr * 0.9, ph * 0.88], [0, ph * 0.86]], { seg: 20 }), { at: [x, y, z] });
    put(f, 'soilbed', lathe([[0, ph * 0.86], [pr * 0.9, ph * 0.86], [0, ph * 0.9]], { seg: 14 }), { at: [x, y, z] });
    const leaves = [], stems = [], top = z + ph * 0.88;
    if (kind === 'snake') {
      for (let i = 0; i < 9; i++) { const a = r() * TAU, d = r() * pr * 0.5, H = (1.4 + r() * 0.9) * s; leaves.push(xf(twoSided(sheet((u, v) => { const w = 0.07 * s * Math.sin(Math.PI * (0.15 + 0.85 * (1 - v))) ** 0.5 * (u * 2 - 1); return [w, 0.02 * Math.sin(v * 3 + i) + Math.abs(w) * 0.4, v * H]; }, 1, 5)), { rx: (r() - 0.5) * 0.25, rz: a, at: [Math.cos(a) * d, Math.sin(a) * d, 0] })); }
    } else if (kind === 'trailing') {
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * TAU + r() * 0.5, L = (1 + r() * 1.4) * s, path = [];
        for (let k = 0; k <= 6; k++) { const t = k / 6, out = pr * 0.6 + Math.min(t * 3, 1) * pr * 0.6 + t * 0.15; path.push([Math.cos(a) * out, Math.sin(a) * out, 0.08 - (t > 0.25 ? (t - 0.25) * L : -t * 0.4)]); }
        stems.push(sweep(path, 0.01, { seg: 3 }));
        for (let k = 1; k <= 6; k++) { const p = path[k]; leaves.push(xf(leafGeo(0.2 * s, 0.09 * s, r, 0.1), { ry: -0.6 + r() * 0.4, rz: a + (k % 2 ? 1.3 : -1.3) + (r() - 0.5), at: p })); }
      }
      for (let i = 0; i < 8; i++) { const a = r() * TAU; leaves.push(xf(leafGeo(0.22 * s, 0.1 * s, r, 0.2), { ry: -0.5 - r() * 0.4, rz: a, at: [Math.cos(a) * pr * 0.3, Math.sin(a) * pr * 0.3, 0.05] })); }
    } else if (kind === 'fern') {
      for (let i = 0; i < 16; i++) {
        const a = i / 16 * TAU + r() * 0.3, L = (1.0 + r() * 0.5) * s, rise = 0.6 + r() * 0.5;
        leaves.push(xf(twoSided(sheet((u, v) => { const x = v * L, w = 0.12 * s * Math.sin(Math.PI * Math.min(1, v * 1.15)) * (u * 2 - 1); return [x, w * (1 + 0.35 * Math.sin(v * 40)), rise * x - x * x * 0.9 / s + Math.abs(w) * 0.2]; }, 2, 8)), { rz: a, at: [0, 0, 0.02] }));
      }
    } else {
      for (let i = 0; i < 11; i++) {
        const a = r() * TAU, H = (0.5 + r() * 1.1) * s, lean = 0.15 + r() * 0.3, end = [Math.cos(a) * lean * H, Math.sin(a) * lean * H, H];
        stems.push(sweep([[0, 0, 0], [end[0] * 0.3, end[1] * 0.3, H * 0.5], end], 0.012 * s, { seg: 3 }));
        leaves.push(xf(leafGeo(0.42 * s, 0.17 * s, r, 0.35), { ry: -0.5 - r() * 0.6, rz: a + (r() - 0.5) * 0.6, at: end }));
      }
    }
    if (stems.length) put(f, 'c#556b3a/0.8', merge(stems), { at: [x, y, top] });
    put(f, o.leaf ?? (kind === 'snake' ? 'c#4f6a3a/0.55' : 'c#4a6b38/0.5'), merge(leaves), { at: [x, y, top] });
    if (o.block !== false) f.block(x - pr, x + pr, y - pr, y + pr, z, z + Math.max(1.5, ph + 0.6 * s));
  }

  // ---- pictures ------------------------------------------------------------------------------------------
  // A framed picture hung on the wall behind the frame's origin, centred at (x, z). Profiled
  // moulding (frame: its material, border: its width), an optional bevel-cut mat (mat: width),
  // and glass over works on paper (anything with a mat, or o.glass).
  function picture(f, file, x, z, w, tall, o = {}) {
    const m = o.frame ?? 'fir', b = o.border ?? 0.16, mat = o.mat ?? 0, W = w + 2 * mat, H = tall + 2 * mat;
    const prof = [[-0.012, 0.055], [-0.012, 0.08], [0.0, 0.092], [b * 0.18, 0.1], [b * 0.35, 0.105], [b * 0.5, 0.098], [b * 0.62, 0.102], [b * 0.8, 0.112], [b * 0.92, 0.108], [b, 0.095], [b, 0.0]];
    put(f, m, moulding(W, H, prof), { at: [x, 0, z] });
    put(f, mat ? PAPER : 'c#2c2520/0.6', bev(-W / 2 - 0.005, W / 2 + 0.005, 0.015, 0.05, -H / 2 - 0.005, H / 2 + 0.005, 0.002), { at: [x, 0, z] });
    if (mat) put(f, PAPER, moulding(w, tall, [[0, 0.058], [0.012, 0.07], [mat + 0.006, 0.07], [mat + 0.006, 0.05]]), { at: [x, 0, z] });
    if ((mat || o.glass) && !o.canvas) put(f, GLASS, grid([[[-W / 2, 0.085, -H / 2], [W / 2, 0.085, -H / 2]], [[-W / 2, 0.085, H / 2], [W / 2, 0.085, H / 2]]]), { at: [x, 0, z] });
    const [a, c] = K.world(f, x, 0.062);
    K.extras.push({ file, x: a, y: f.h + z, z: c, rotY: K.yawOf(f.dir), w, h: tall, ...(o.canvas ? { canvas: o.canvas, glow: o.glow } : {}) });
  }

  // ---- printed things ----------------------------------------------------------------------------------------
  const PAL = [['#e9e1cf', '#8a3b2c'], ['#1f2a36', '#e3c46a'], ['#f2efe8', '#2d4a3a'], ['#c9b48a', '#1d1a17'], ['#3c4c5e', '#efe6d2'], ['#b8574a', '#f6efe0']];
  const TITLES = ['The World of Interiors', 'KINFOLK', 'Apartamento', 'THE NEW YORKER', 'Gardens Illustrated', 'Cabana', 'House & Garden', 'The Paris Review', 'GRANTA', 'Cereal'];
  function cover(title, [bg, fg], r) {
    return (g, w, h) => {
      g.fillStyle = bg; g.fillRect(0, 0, w, h);
      g.fillStyle = fg; g.globalAlpha = 0.85; const cy = h * (0.3 + r() * 0.2);
      g.fillRect(w * 0.08, cy, w * 0.84, h * 0.55); g.globalAlpha = 1;
      const grd = g.createLinearGradient(0, cy, 0, cy + h * 0.55); grd.addColorStop(0, 'rgba(255,255,255,.18)'); grd.addColorStop(1, 'rgba(0,0,0,.25)'); g.fillStyle = grd; g.fillRect(w * 0.08, cy, w * 0.84, h * 0.55);
      g.fillStyle = fg; g.textAlign = 'center'; g.font = `bold ${Math.floor(h * 0.075)}px Georgia, serif`;
      let px = Math.floor(h * 0.075); while (g.measureText(title).width > w * 0.9 && px > 8) { px--; g.font = `bold ${px}px Georgia, serif`; }
      g.fillText(title, w / 2, h * 0.14); g.font = `${Math.floor(h * 0.028)}px Helvetica, sans-serif`; g.fillText('AUTUMN ISSUE', w / 2, h * 0.21);
    };
  }
  // A stack of magazines at (x, y, z), n of them, each a little askew; the top cover is printed.
  function magazines(f, x, y, z, n = 3, o = {}) {
    const r = R(f, x, y, z); let h = z;
    for (let i = 0; i < n; i++) {
      const t = 0.018 + r() * 0.012, turn = (r() - 0.5) * 0.25 + (o.turn ?? 0), pal = PAL[Math.floor(r() * PAL.length)], s = f.sub(x + (r() - 0.5) * 0.05, y + (r() - 0.5) * 0.05, 0);
      put(s, PAPER, bev(-0.36, 0.36, -0.47, 0.47, h, h + t, 0.004), { rz: turn });
      put(s, 'c#' + pal[0].slice(1) + '/0.6', bev(-0.362, 0.362, -0.472, 0.472, h + t - 0.002, h + t + 0.001, 0.001), { rz: turn });
      if (i === n - 1) K.sign(s, 0, 0, h + t + 0.011, 0.72, 0.94, cover(TITLES[Math.floor(r() * TITLES.length)], pal, r), { flat: true, turn, cw: 192, ch: 256 });
      h += t + 0.002;
    }
    return h;
  }
  const textLines = (g, x0, x1, y0, y1, r) => { g.fillStyle = 'rgba(30,26,22,.55)'; for (let y = y0; y < y1; y += 9) { const w = (x1 - x0) * (y > y1 - 12 || r() < 0.08 ? 0.3 + r() * 0.5 : 0.94 + r() * 0.06); g.fillRect(x0, y, w, 3.2); } };
  // A book lying open at (x, y, z), its spine along y. o.cover: the cloth colour.
  function openBook(f, x, y, z, o = {}) {
    const r = R(f, x, y, z), s = f.sub(x, y, z, 0), turn = o.turn ?? 0, w = 0.5, d = 0.75, cov = o.cover ?? 'c#6b2a25/0.7';
    put(s, cov, bev(-w - 0.02, w + 0.02, -d / 2 - 0.02, d / 2 + 0.02, 0, 0.012, 0.004), { rz: turn });
    for (const sd of [-1, 1]) put(s, PAPER, grid([0, 1, 2, 3, 4].map(j => [0, 1, 2, 3, 4, 5, 6].map(i => { const u = i / 6, v = j / 4, xx = sd * (0.01 + u * (w - 0.02)); return [xx, -d / 2 + 0.01 + v * (d - 0.02), 0.012 + 0.05 * Math.sin(Math.min(1, u * 4.5) * Math.PI / 2) * (1 - u * 0.1)]; })), { flip: sd < 0 }), { rz: turn });
    K.sign(s, 0, 0, 0.0645, w * 2 - 0.12, d - 0.1, (g, W, H) => { g.fillStyle = '#efe9da'; g.fillRect(0, 0, W, H); textLines(g, 18, W / 2 - 22, 20, H - 26, r); textLines(g, W / 2 + 22, W - 18, 20, H - 26, r); const gr = g.createLinearGradient(W / 2 - 30, 0, W / 2 + 30, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(0.5, 'rgba(60,40,20,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(W / 2 - 30, 0, 60, H); }, { flat: true, turn, cw: 320, ch: 240 });
  }
  // A laptop at (x, y, z), keyboard toward +y. o.open (default true), o.colour, o.draw: the screen.
  function laptop(f, x, y, z, o = {}) {
    const s = f.sub(x, y, z), c = o.colour ?? 'c#b9bcbf/0.3/0.8', w = 1.0, d = 0.7, open = o.open !== false, turn = open ? 0 : (o.turn ?? 0);
    put(s, c, softBox(-w / 2, w / 2, -d / 2, d / 2, 0, 0.035, 0.015, { k: 2, n: [1, 1, 1] }), { rz: turn });
    if (!open) { put(s, c, softBox(-w / 2, w / 2, -d / 2, d / 2, 0.036, 0.06, 0.012, { k: 2, n: [1, 1, 1] }), { rz: turn }); return; }
    K.sign(s, 0, 0.03, 0.037, w * 0.86, d * 0.5, (g, W, H) => { g.fillStyle = '#9a9da0'; g.fillRect(0, 0, W, H); g.fillStyle = '#1d1e20'; for (let rr = 0; rr < 5; rr++) for (let k = 0; k < 13; k++) g.fillRect(6 + k * (W - 12) / 13, 6 + rr * (H * 0.62) / 5, (W - 12) / 13 - 3, H * 0.62 / 5 - 3); g.fillStyle = '#8c8f92'; g.fillRect(W * 0.3, H * 0.7, W * 0.4, H * 0.25); }, { flat: true, cw: 256, ch: 128 });
    const tilt = 0.1;
    put(s, c, softBox(-w / 2, w / 2, 0, 0.022, 0, d, 0.012, { k: 2, n: [1, 1, 1] }), { rx: tilt, at: [0, -d / 2, 0.035] });
    K.sign(s, 0, -d / 2 + 0.0245 * Math.cos(tilt) - Math.sin(tilt) * d / 2, 0.035 + 0.0245 * Math.sin(tilt) + Math.cos(tilt) * d / 2, w * 0.9, d * 0.84, o.draw ?? ((g, W, H) => { const gr = g.createLinearGradient(0, 0, W, H); gr.addColorStop(0, '#3b5a6e'); gr.addColorStop(1, '#c79a6a'); g.fillStyle = gr; g.fillRect(0, 0, W, H); g.fillStyle = 'rgba(255,255,255,.88)'; g.fillRect(W * 0.12, H * 0.16, W * 0.52, H * 0.64); g.fillStyle = 'rgba(40,40,40,.5)'; for (let i = 0; i < 9; i++) g.fillRect(W * 0.16, H * 0.23 + i * H * 0.058, W * (0.3 + (i % 3) * 0.05), H * 0.022); }), { glow: 0.9, cw: 256, ch: 160, tilt });      // on the lid's face, leaning back with it
  }
  // A phone lying face up at (x, y, z).
  function phone(f, x, y, z, o = {}) {
    const turn = o.turn ?? 0.3;
    put(f, o.colour ?? 'c#2a2b2d/0.3/0.5', softBox(-0.12, 0.12, -0.245, 0.245, 0, 0.026, 0.012, { k: 2, n: [1, 1, 1] }), { rz: turn, at: [x, y, z] });
    K.sign(f.sub(x, y, z), 0, 0, 0.0275, 0.22, 0.465, (g, W, H) => { g.fillStyle = '#0d0e10'; g.fillRect(0, 0, W, H); g.fillStyle = 'rgba(255,255,255,.07)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0); g.lineTo(0, H * 0.7); g.fill(); }, { flat: true, turn, cw: 64, ch: 128, rough: 0.15 });
  }
  // A television remote at (x, y, z).
  function remote(f, x, y, z, o = {}) {
    const turn = o.turn ?? -0.4;
    put(f, 'c#1f1e1d/0.5', softBox(-0.085, 0.085, -0.33, 0.33, 0, 0.065, 0.03, { k: 2, n: [1, 2, 1] }), { rz: turn, at: [x, y, z] });
    K.sign(f.sub(x, y, z), 0, 0, 0.067, 0.13, 0.56, (g, W, H) => { g.fillStyle = '#1f1e1d'; g.fillRect(0, 0, W, H); g.fillStyle = '#b5332b'; g.beginPath(); g.arc(W * 0.25, H * 0.07, W * 0.1, 0, 7); g.fill(); g.fillStyle = '#56544f'; for (let r = 0; r < 6; r++) for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(W * (0.25 + k * 0.25), H * (0.38 + r * 0.08), W * 0.08, 0, 7); g.fill(); } g.beginPath(); g.arc(W / 2, H * 0.22, W * 0.22, 0, 7); g.fill(); }, { flat: true, turn, cw: 48, ch: 192 });
  }
  // A box of tissues at (x, y, z), a tissue drawn up out of the slot.
  function tissueBox(f, x, y, z, o = {}) {
    const turn = o.turn ?? 0.2, s = f.sub(x, y, z), w = 0.75, d = 0.42, h = 0.36, pat = o.colour ?? '#8fa39a';
    const draw = (g, W, H) => { g.fillStyle = '#efe9dc'; g.fillRect(0, 0, W, H); g.strokeStyle = pat; g.lineWidth = 3; for (let i = -H; i < W; i += 14) { g.beginPath(); g.moveTo(i, H); g.lineTo(i + H, 0); g.stroke(); } };
    put(s, 'c#e6e0d2/0.8', bev(-w / 2, w / 2, -d / 2, d / 2, 0, h, 0.006), { rz: turn });
    for (const sd of [-1, 1]) { const [px, py] = [-Math.sin(turn) * sd * (d / 2 + 0.003), Math.cos(turn) * sd * (d / 2 + 0.003)]; K.sign(s, px, py, h / 2, w * 0.98, h * 0.96, draw, { turn: turn + (sd < 0 ? Math.PI : 0), cw: 128, ch: 64 }); }
    put(s, 'c#f6f3ec/0.9', twoSided(sheet((u, v) => [(u - 0.5) * 0.3 * (1 - v * 0.4), 0.03 * Math.sin(u * 6 + v * 3) + v * 0.05, h + v * 0.25 + 0.06 * Math.sin(u * Math.PI)], 4, 3)), { rz: turn });
  }
  // A squeeze tube (lotion, toothpaste) lying at (x, y, z), cap toward +x.
  function lotionTube(f, x, y, z, o = {}) {
    const turn = o.turn ?? 0.4, c = o.colour ?? 'c#e9e4da/0.4', L = o.len ?? 0.55;
    const rows = [[0, 0.085, 0.006], [0.08, 0.082, 0.022], [0.3, 0.072, 0.055], [0.7, 0.065, 0.06], [0.9, 0.058, 0.056], [1, 0.05, 0.05]];
    const g = loft(rows.map(([t, a, b]) => ({ a, b, z: t * L })), { seg: 12, e: 2.3 });
    put(f, c, g, { rx: Math.PI / 2, rz: Math.PI / 2 + turn, at: [x, y, z + 0.06] });
    put(f, o.cap ?? 'c#3d5a66/0.3', lathe([[0, 0], [0.05, 0], [0.045, 0.08], [0, 0.08]], { seg: 12 }), { ry: Math.PI / 2, rz: turn, at: [x + Math.cos(turn) * L, y + Math.sin(turn) * L, z + 0.06] });
  }
  // A pump bottle standing at (x, y, z): amber glass (or o.colour) with a label band and pump.
  function pumpBottle(f, x, y, z, o = {}) {
    const c = o.colour ?? 'c#6b3a18/0.08', h = o.h ?? 0.55, r = o.r ?? 0.11;
    put(f, c, lathe([[0, 0], [r - 0.01, 0], [r, 0.02], [r, h * 0.8], [r * 0.7, h * 0.9], [r * 0.32, h * 0.93], [r * 0.32, h], [0, h]], { seg: 16 }), { at: [x, y, z] });
    put(f, o.label ?? 'c#efe9da/0.8', lathe([[r + 0.003, h * 0.25], [r + 0.003, h * 0.62]], { seg: 16 }), { at: [x, y, z] });
    put(f, 'c#1f1d1b/0.4', lathe([[0, h], [0.045, h], [0.045, h + 0.05], [0.015, h + 0.06], [0.015, h + 0.12], [0.04, h + 0.12], [0.04, h + 0.16], [0, h + 0.16]], { seg: 12 }), { at: [x, y, z] });
    put(f, 'c#1f1d1b/0.4', sweep([[0, 0, h + 0.14], [0.1, 0, h + 0.14], [0.12, 0, h + 0.125]], 0.012, { seg: 4 }), { rz: o.turn ?? 0.8, at: [x, y, z] });
  }
  // A perfume bottle at (x, y, z): faceted glass, tinted juice, a gold or black cap.
  function perfume(f, x, y, z, o = {}) {
    const w = o.w ?? 0.18, h = o.h ?? 0.26, turn = o.turn ?? 0.3;
    put(f, GLASS, bev(-w / 2, w / 2, -w * 0.35, w * 0.35, 0, h, 0.02), { rz: turn, at: [x, y, z] });
    put(f, o.juice ?? 'c#d9a85a/0.1', bev(-w / 2 + 0.018, w / 2 - 0.018, -w * 0.35 + 0.018, w * 0.35 - 0.018, 0.018, h * 0.75, 0.01), { rz: turn, at: [x, y, z] });
    put(f, o.cap ?? 'c#b08d4a/0.25/1', lathe([[0, 0], [0.035, 0], [0.035, 0.03], [0.06, 0.035], [0.06, 0.1], [0.05, 0.11], [0, 0.11]], { seg: 6 }), { rz: turn, at: [x, y, z + h] });
  }
  // A little group of cosmetics at (x, y, z): lipsticks, a compact, a pot of cream.
  function cosmetics(f, x, y, z, o = {}) {
    const r = R(f, x, y, z);
    for (let i = 0; i < 2; i++) { const px = x - 0.18 + i * 0.09, py = y + (r() - 0.5) * 0.1; put(f, 'c#1d1b1a/0.3/0.4', lathe([[0, 0], [0.032, 0], [0.032, 0.18], [0, 0.18]], { seg: 10 }), { at: [px, py, z] }); put(f, 'c#b08d4a/0.25/1', lathe([[0.028, 0.18], [0.028, 0.21], [0, 0.21]], { seg: 10 }), { at: [px, py, z] }); }
    put(f, 'c#c8b9a4/0.3/0.6', lathe([[0, 0], [0.13, 0], [0.135, 0.01], [0.13, 0.05], [0, 0.055]], { seg: 18 }), { at: [x + 0.12, y + 0.1, z] });
    put(f, PORCELAIN, lathe([[0, 0], [0.09, 0], [0.095, 0.1], [0, 0.1]], { seg: 16 }), { at: [x + 0.1, y - 0.14, z] });
    put(f, 'c#d6c9b4/0.25/0.8', lathe([[0, 0.1], [0.1, 0.1], [0.1, 0.14], [0, 0.145]], { seg: 16 }), { at: [x + 0.1, y - 0.14, z] });
  }
  // A ceramic soap dish with a bar of soap at (x, y, z).
  function soapDish(f, x, y, z, o = {}) {
    const turn = o.turn ?? 0;
    put(f, o.dish ?? PORCELAIN, lathe([[0, 0], [0.15, 0], [0.2, 0.04], [0.24, 0.06], [0.23, 0.065], [0.18, 0.04], [0, 0.03]], { seg: 18, sy: 0.7 }), { rz: turn, at: [x, y, z] });
    put(f, o.soap ?? 'c#e7dcc4/0.6', softBox(-0.14, 0.14, -0.09, 0.09, 0.03, 0.11, 0.035, { k: 2, n: [1, 1, 1], crown: 0.01 }), { rz: turn, at: [x, y, z] });
  }
  // A cup of toothbrushes and a tube of toothpaste at (x, y, z).
  function toothbrushCup(f, x, y, z, o = {}) {
    put(f, o.cup ?? 'c#c7d1cc/0.2', lathe([[0, 0], [0.1, 0], [0.11, 0.33], [0.1, 0.335], [0.093, 0.02], [0, 0.02]], { seg: 16 }), { at: [x, y, z] });
    [['c#d8d2c6/0.4', 0.25], ['c#5f7a8a/0.4', -0.35]].forEach(([c, a]) => {
      const top = [Math.cos(a) * 0.12, Math.sin(a) * 0.12, 0.62];
      put(f, c, sweep([[Math.cos(a) * 0.02, Math.sin(a) * 0.02, 0.03], [top[0] * 0.6, top[1] * 0.6, 0.4], top], 0.017, { seg: 5 }), { at: [x, y, z] });
      put(f, 'c#f4f1ea/0.8', bev(-0.02, 0.02, -0.035, 0.035, 0, 0.09, 0.008), { rz: a, at: [x + top[0] + Math.cos(a) * 0.03, y + top[1] + Math.sin(a) * 0.03, z + 0.53] });
    });
  }
  // An umbrella stand at (x, y) with umbrellas and a walking stick.
  function umbrellaStand(f, x, y, o = {}) {
    const r = R(f, x, y);
    put(f, o.mat ?? 'c#4d5f55/0.3', lathe([[0, 0], [0.32, 0], [0.33, 0.04], [0.3, 0.12], [0.3, 1.75], [0.34, 1.8], [0.33, 1.83], [0.27, 1.8], [0.27, 0.06], [0, 0.06]], { seg: 22 }), { at: [x, y, 0] });
    const cols = o.colours ?? ['c#2b2d33/0.7', 'c#6b2a25/0.7', 'c#3d5a46/0.7'];
    cols.forEach((c, i) => {
      const a = i / cols.length * TAU + r(), lean = 0.12 + r() * 0.06, tx = Math.cos(a) * lean, ty = Math.sin(a) * lean;
      const g = loft([{ a: 0.005, b: 0.005, z: 0.1 }, { a: 0.06, b: 0.06, z: 0.8 }, { a: 0.085, b: 0.085, z: 1.75 }, { a: 0.07, b: 0.07, z: 2.2 }, { a: 0.03, b: 0.03, z: 2.3 }], { seg: 8, mod: t => 1 + 0.25 * Math.abs(Math.sin(t * 4)) });
      put(f, c, g, { ry: lean * Math.cos(a), rx: -lean * Math.sin(a), at: [x + tx * 0.2, y + ty * 0.2, 0] });
      const ca = Math.cos(a), sa = Math.sin(a), hp = [[0, 2.28], [0, 2.6], [0.03, 2.7], [0.1, 2.72], [0.15, 2.66], [0.15, 2.6]].map(([u, z]) => [u * ca, u * sa, z]);
      put(f, 'oak_light#8a5a3a', sweep(hp, 0.025, { seg: 6, caps: true }), { ry: lean * Math.cos(a), rx: -lean * Math.sin(a), at: [x + tx * 0.2, y + ty * 0.2, 0] });
    });
    f.block(x - 0.33, x + 0.33, y - 0.33, y + 0.33, 0, 1.8);
  }
  // Folded laundry: a stack of folded shirts and towels at (x, y, z).
  const laundry = (f, x, y, z, n = 4, o = {}) => K.foldedStack(f, x, y, z, n, o.colours ?? ['linen#e8e1d3', 'linen#9aa7b4', 'curtain#ece7dc', 'linen#6f7d64', 'wool#c9b9a6'], { w: 1.0, d: 0.75, t: 0.11, base: 'linen', ...o });

  return { mug, cup, plate, vase, bloom, posy, leafGeo, pottedPlant, picture, magazines, openBook, laptop, phone, remote, tissueBox, lotionTube, pumpBottle, perfume, cosmetics, soapDish, toothbrushCup, umbrellaStand, laundry, twoSided };
}
export { twoSided };
