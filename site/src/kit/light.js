// Lamps, candles and the light fittings the house has but does not use: turned and
// ceramic lamp bases, pleated and drum shades that glow from inside, brass candlesticks,
// jar candles, wall sconces and ceiling lanterns (unlit unless asked).

import { lathe, loft, sweep, bev, merge, xf, disc, rng, TAU } from './geom.js';
import { BRASS, OLD_BRASS, BRONZE, IRON, GLASS, WALNUT } from './mats.js';

const glaze = c => { const m = /^c#([0-9a-f]{6})/i.exec(c); return m ? `c#${m[1]}/0.2` : c; };
const tri = t => { const x = (t / TAU) % 1; return 1 - Math.abs(x * 2 - 1); };

export function makeLight(K) {
  const { put } = K;

  // A lampshade: bottom radius r0 at z0, top r1 at z1. kind 'pleat' | 'drum' | 'empire'. The outside is
  // the house's glowing 'shade'; a brighter lining shows from above and below, with the bulb inside.
  function shadeAt(f, x, y, z0, z1, r0, r1, kind = 'pleat', o = {}) {
    const pleats = Math.round((r0 + r1) * 28), pl = kind === 'pleat' ? (t) => 1 + 0.035 * tri(t * pleats) : null;
    const prof = kind === 'drum' ? [[r0, z0], [r0, z1]] : [[r0, z0], [(r0 * 2 + r1) / 3, z0 + (z1 - z0) / 3], [(r0 + r1 * 2) / 3, z0 + 2 * (z1 - z0) / 3], [r1, z1]];
    const seg = kind === 'pleat' ? pleats * 2 : 28;
    put(f, o.mat ?? 'shade', lathe(prof, { seg, mod: pl }), { at: [x, y, 0] });
    put(f, o.lining ?? 'e#ffe2b4/1.7', lathe(prof.map(([r, z]) => [r * 0.975, z]), { seg: 24, flip: true }), { at: [x, y, 0] });
    const trim = o.trim ?? 'c#cdbb98/0.8';
    for (const [r, z] of [[r0, z0], [r1, z1]]) put(f, trim, lathe([[r * (kind === 'pleat' ? 1.04 : 1.01), z - 0.012], [r * (kind === 'pleat' ? 1.045 : 1.015), z + 0.012]], { seg: 28 }), { at: [x, y, 0] });
    // spider and bulb
    put(f, BRASS, merge([0, 1, 2].map(i => { const a = i / 3 * TAU; return sweep([[0, 0, z1 - 0.02], [Math.cos(a) * r1 * 0.97, Math.sin(a) * r1 * 0.97, z1 - 0.02]], 0.006, { seg: 4 }); })), { at: [x, y, 0] });
  }
  const bulb = (f, x, y, z) => put(f, 'e#fff4e0/3', lathe([[0, -0.08], [0.05, -0.06], [0.07, 0.0], [0.05, 0.06], [0.025, 0.09], [0.025, 0.12], [0, 0.12]], { seg: 10 }), { at: [x, y, z] });

  // A table lamp at (x, y) standing on height z: a glazed ginger-jar base (colour), brass neck,
  // pleated shade. o: { base: 'jar' | 'gourd' | 'column' | 'stick', shade: 'pleat' | 'drum' | 'empire' }
  function tableLamp(f, x, y, z, color = 'c#6f7f8c/0.4', o = {}) {
    const kind = o.base ?? 'jar', g = glaze(color);
    const prof = kind === 'gourd'
      ? [[0, 0], [0.13, 0], [0.14, 0.03], [0.24, 0.16], [0.25, 0.26], [0.2, 0.38], [0.12, 0.46], [0.15, 0.56], [0.13, 0.66], [0.06, 0.7], [0, 0.7]]
      : kind === 'column'
      ? [[0, 0], [0.19, 0], [0.19, 0.05], [0.15, 0.07], [0.12, 0.1], [0.1, 0.4], [0.11, 0.62], [0.13, 0.66], [0.13, 0.7], [0, 0.7]]
      : [[0, 0], [0.15, 0], [0.155, 0.03], [0.145, 0.04], [0.21, 0.14], [0.245, 0.3], [0.235, 0.44], [0.19, 0.56], [0.12, 0.63], [0.105, 0.66], [0.11, 0.7], [0, 0.7]];
    put(f, kind === 'column' ? (o.wood ?? WALNUT) : g, lathe(prof, { seg: 22 }), { at: [x, y, z] });
    put(f, BRASS, lathe([[0, 0], [0.12, 0], [0.12, 0.03], [0.06, 0.05], [0.03, 0.06], [0.025, 0.2], [0.045, 0.21], [0.045, 0.3], [0.035, 0.31], [0, 0.31]], { seg: 12 }), { at: [x, y, z + 0.69] });
    put(f, BRASS, sweep([[-0.17, 0, 1.0], [-0.18, 0, 1.25], [-0.12, 0, 1.6], [0, 0, 1.68], [0.12, 0, 1.6], [0.18, 0, 1.25], [0.17, 0, 1.0]], 0.008, { seg: 4 }), { at: [x, y, z] });
    put(f, BRASS, lathe([[0, 0], [0.03, 0], [0.04, 0.03], [0.02, 0.06], [0.025, 0.08], [0, 0.1]], { seg: 10 }), { at: [x, y, z + 1.66] });
    shadeAt(f, x, y, z + 0.95, z + 1.65, 0.52, 0.34, o.shade ?? 'pleat');
    bulb(f, x, y, z + 1.2);
    K.lampAt(f, x, y, z + 1.25, 0.95);
    K.lamps[K.lamps.length - 1].halo = 0.85;                          // a soft glow round the shade after dark (lighting.js)
  }
  // A floor lamp at (x, y): weighted base, turned brass column with knops, a drum or pleated shade.
  function floorLamp(f, x, y, o = {}) {
    put(f, o.base ?? BRONZE, lathe([[0, 0], [0.46, 0], [0.48, 0.02], [0.46, 0.06], [0.36, 0.09], [0.2, 0.12], [0.08, 0.16], [0.05, 0.22], [0, 0.22]], { seg: 24 }), { at: [x, y, 0] });
    const col = [[0.045, 0.2]];
    for (const k of [1.4, 2.9]) col.push([0.045, k - 0.08], [0.07, k - 0.04], [0.075, k], [0.07, k + 0.04], [0.045, k + 0.08]);
    col.push([0.04, 4.45], [0.06, 4.5], [0.06, 4.58], [0, 4.58]);
    put(f, BRASS, lathe([[0, 0.2], ...col], { seg: 10 }), { at: [x, y, 0] });
    put(f, BRASS, lathe([[0, 0], [0.04, 0], [0.04, 0.3], [0, 0.3]], { seg: 8 }), { at: [x, y, 4.56] });
    shadeAt(f, x, y, 4.55, 5.4, 0.66, 0.44, o.shade ?? 'drum');
    bulb(f, x, y, 4.85);
    K.lampAt(f, x, y, 4.9, 1.15);
    K.lamps[K.lamps.length - 1].halo = 1;
    f.block(x - 0.3, x + 0.3, y - 0.3, y + 0.3, 0, 5.0);
  }

  // A taper in a turned brass candlestick; the flame sits where it always has.
  function candle(f, x, y, z, tall = 0.55) {
    put(f, BRASS, lathe([[0, 0], [0.13, 0], [0.13, 0.015], [0.11, 0.03], [0.05, 0.05], [0.035, 0.07], [0.05, 0.09], [0.035, 0.11], [0.03, 0.13], [0.06, 0.14], [0.065, 0.155], [0.035, 0.16], [0, 0.16]], { seg: 16 }), { at: [x, y, z] });
    put(f, 'c#f1e7cf/0.6', lathe([[0, 0.15], [0.05, 0.15], [0.046, 0.15 + tall * 0.95], [0.04, 0.16 + tall], [0.02, 0.155 + tall], [0, 0.152 + tall]], { seg: 10 }), { at: [x, y, z] });
    put(f, 'c#1b1612/0.9', lathe([[0.005, 0.15 + tall], [0.004, 0.2 + tall], [0, 0.2 + tall]], { seg: 4 }), { at: [x, y, z] });
    const [a, b] = K.world(f, x, y);
    K.candles.push({ x: a, y: f.h + z + 0.2 + tall, z: b });
  }
  // A three-wick jar candle with a label and its lid set beside it. Visitors can light it.
  function jarCandle(f, x, y, z, o = {}) {
    const r = o.r ?? 0.17, tall = o.tall ?? 0.36, wax = o.wax ?? 'c#efe6d2/0.6';
    put(f, GLASS, lathe([[0, 0], [r - 0.01, 0], [r, 0.012], [r, tall - 0.01], [r - 0.004, tall], [r - 0.012, tall - 0.005], [r - 0.012, 0.02], [0, 0.02]], { seg: 22 }), { at: [x, y, z] });
    put(f, wax, lathe([[0, 0.02], [r - 0.013, 0.02], [r - 0.013, tall * 0.72], [r * 0.6, tall * 0.7], [0, tall * 0.68]], { seg: 20 }), { at: [x, y, z] });
    if (o.label) put(f, o.label, lathe([[r + 0.003, tall * 0.22], [r + 0.003, tall * 0.62]], { seg: 22 }), { at: [x, y, z] });
    for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; put(f, 'c#1b1612/0.9', lathe([[0.004, 0], [0.003, 0.05], [0, 0.05]], { seg: 3 }), { at: [x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.45, z + tall * 0.68] }); }
    if (o.lid !== false) put(f, o.lidColour ?? 'c#b9b4aa/0.3/1', lathe([[0, 0], [r + 0.012, 0], [r + 0.012, 0.04], [r - 0.01, 0.05], [0.04, 0.052], [0.035, 0.08], [0, 0.085]], { seg: 22 }), { at: [x + r * 2.3, y + 0.05, z] });
    const [a, b] = K.world(f, x, y);
    K.candles.push({ x: a, y: f.h + z + tall * 0.74, z: b, big: true });
  }
  // A pillar candle on a plate (x, y, z). Lightable.
  function pillarCandle(f, x, y, z, tall = 0.5, r = 0.13, wax = 'c#efe6d2/0.6') {
    put(f, 'c#ddd7cb/0.3', lathe([[0, 0], [r + 0.08, 0], [r + 0.1, 0.03], [r + 0.08, 0.035], [0, 0.02]], { seg: 20 }), { at: [x, y, z] });
    put(f, wax, lathe([[0, 0.02], [r, 0.02], [r, tall], [r - 0.02, tall + 0.01], [r * 0.5, tall - 0.02], [0, tall - 0.025]], { seg: 18 }), { at: [x, y, z] });
    const [a, b] = K.world(f, x, y); K.candles.push({ x: a, y: f.h + z + tall - 0.0, z: b });
  }

  // A wall sconce on the wall behind the frame's origin, centred at (x, z). kind: 'tulip' (frosted glass
  // shade on a brass arm), 'shade' (a small fabric shade), 'lantern' (an Arts-and-Crafts box lantern).
  // Unlit unless o.lit.
  function sconce(f, x, z, o = {}) {
    const kind = o.kind ?? 'tulip', metal = o.metal ?? (kind === 'lantern' ? BRONZE : BRASS);
    put(f, metal, lathe([[0, 0], [0.18, 0], [0.18, 0.02], [0.14, 0.04], [0.06, 0.06], [0, 0.06]], { seg: 16, sy: 1.35 }), { rx: -Math.PI / 2, at: [x, 0.0, z] });
    if (kind === 'lantern') {
      put(f, metal, sweep([[0, 0.05, 0], [0, 0.32, 0.02], [0, 0.42, 0.12]], 0.02, { seg: 6 }), { at: [x, 0, z] });
      lanternBody(f, x, 0.42, z - 0.55, 0.32, 0.5, metal, o.glass ?? 'c#d9c08a/0.35');
    } else {
      const arm = [[0, 0.05, -0.05], [0, 0.22, -0.08], [0, 0.36, 0.0], [0, 0.4, 0.12]];
      put(f, metal, sweep(arm, 0.018, { seg: 6 }), { at: [x, 0, z] });
      put(f, metal, lathe([[0, 0], [0.07, 0], [0.08, 0.03], [0.04, 0.05], [0.035, 0.12], [0, 0.12]], { seg: 12 }), { at: [x, 0.4, z + 0.1] });
      if (kind === 'shade') {
        put(f, o.shadeMat ?? (o.lit ? 'shade' : 'linen#e7dcc6'), lathe([[0.2, 0], [0.13, 0.32]], { seg: 20 }), { at: [x, 0.4, z + 0.18] });
        put(f, o.shadeMat ?? (o.lit ? 'shade' : 'linen#e7dcc6'), lathe([[0.13, 0.32], [0.2, 0]].map(([r, h]) => [r * 0.98, h]), { seg: 20 }), { at: [x, 0.4, z + 0.18] });
      } else {
        const g = lathe([[0.045, 0], [0.06, 0.03], [0.12, 0.14], [0.17, 0.27], [0.19, 0.3], [0.18, 0.305], [0.16, 0.28], [0.11, 0.15], [0.05, 0.035], [0.04, 0.01]], { seg: 18, mod: t => 1 + 0.05 * Math.max(0, Math.cos(t * 6)) });
        put(f, o.lit ? 'e#f6e7cf/1.4' : (o.glass ?? 'c#eee6d6/0.25'), g, { at: [x, 0.4, z + 0.13] });
      }
    }
    if (o.lit) { K.lampAt(f, x, 0.45, z + 0.25, o.power ?? 0.5); K.lamps[K.lamps.length - 1].halo = 0.55; }
  }
  // An Arts-and-Crafts lantern body: tapering box with four glass panels and an overhanging cap,
  // centred at (x, y), bottom at z, w wide at the top and h tall.
  function lanternBody(f, x, y, z, w, h, metal, glass) {
    const b = w * 0.78, frame = [];
    put(f, glass, loft([{ a: b / 2, b: b / 2, z }, { a: w / 2 - 0.01, b: w / 2 - 0.01, z: z + h }], { seg: 4, th0: Math.PI / 4, th1: Math.PI / 4 + TAU, e: 2 }), { at: [x, y, 0] });
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) frame.push(sweep([[sx * b / 2 * 0.72, sy * b / 2 * 0.72, z], [sx * w / 2 * 0.72, sy * w / 2 * 0.72, z + h]], 0.016, { seg: 4 }));
    put(f, metal, merge(frame), { at: [x, y, 0] });
    put(f, metal, bev(-b / 2 * 0.75, b / 2 * 0.75, -b / 2 * 0.75, b / 2 * 0.75, z - 0.04, z + 0.02, 0.01), { at: [x, y, 0] });
    put(f, metal, lathe([[w * 0.62, z + h], [w * 0.62, z + h + 0.03], [w * 0.2, z + h + 0.16], [0.04, z + h + 0.2], [0, z + h + 0.21]], { seg: 4, th0: Math.PI / 4, th1: Math.PI / 4 + TAU }), { at: [x, y, 0] });
    // the overlay: a band of cut-out cloud lifts, here a cross rail on each face
    for (const s of [-1, 1]) { put(f, metal, bev(-w * 0.34, w * 0.34, s * w * 0.33 - 0.01, s * w * 0.33 + 0.01, z + h * 0.68, z + h * 0.74, 0.004), { at: [x, y, 0] }); put(f, metal, bev(s * w * 0.33 - 0.01, s * w * 0.33 + 0.01, -w * 0.34, w * 0.34, z + h * 0.68, z + h * 0.74, 0.004), { at: [x, y, 0] }); }
  }
  // A ceiling fitting hanging from the ceiling at height zc above the frame, at (x, y). kind:
  // 'lantern' (Arts-and-Crafts, amber glass, bronze), 'schoolhouse' (milk-glass globe, brass),
  // 'bowl' (alabaster bowl on chains). Unlit unless o.lit. drop: how far it hangs.
  function ceilingLight(f, x, y, zc, o = {}) {
    const kind = o.kind ?? 'lantern', metal = o.metal ?? (kind === 'lantern' ? BRONZE : BRASS), drop = o.drop ?? (kind === 'lantern' ? 2.2 : 1.6);
    put(f, metal, lathe([[0, -0.08], [0.06, -0.08], [0.2, -0.04], [0.22, 0], [0, 0]], { seg: 16 }), { at: [x, y, zc - 0.01] });
    const bottom = zc - drop;
    if (kind === 'lantern') {
      const links = []; for (let z = zc - 0.12; z > bottom + 0.75; z -= 0.12) links.push(xf(lathe(Array.from({ length: 5 }, (_, i) => { const a = i / 4 * TAU; return [0.035 + 0.008 * Math.cos(a), 0.06 * Math.sin(a) * 0.9]; }), { seg: 6, sy: 0.5 }), { ry: Math.PI / 2, rz: (Math.round((zc - z) / 0.12) % 2) * Math.PI / 2, at: [0, 0, z] }));
      put(f, metal, merge(links), { at: [x, y, 0] });
      lanternBody(f, x, y, bottom, 0.62, 0.68, metal, o.lit ? 'e#f2c77e/1.2' : (o.glass ?? 'c#c9a868/0.3'));
    } else if (kind === 'schoolhouse') {
      put(f, metal, lathe([[0.012, bottom + 0.62], [0.012, zc - 0.08]], { seg: 6 }), { at: [x, y, 0] });
      put(f, metal, lathe([[0.15, bottom + 0.5], [0.16, bottom + 0.52], [0.16, bottom + 0.58], [0.06, bottom + 0.63], [0, bottom + 0.64]], { seg: 18 }), { at: [x, y, 0] });
      const gl = []; for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + i / 10 * Math.PI * 0.82; gl.push([0.3 * Math.cos(a) * (1 - 0.1 * (i / 10)), bottom + 0.3 + 0.3 * Math.sin(a)]); }
      gl[0] = [0, bottom]; gl.push([0.14, bottom + 0.52]);
      put(f, o.lit ? 'e#fbf3e4/1.4' : 'c#efebe2/0.18', lathe(gl, { seg: 22 }), { at: [x, y, 0] });
    } else {
      for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + 0.5; put(f, metal, sweep([[0, 0, zc - 0.06], [Math.cos(a) * 0.62, Math.sin(a) * 0.62, bottom + 0.3]], 0.008, { seg: 3 }), { at: [x, y, 0] }); }
      put(f, o.lit ? 'e#f6e3c4/1.3' : 'marble#e8dcc8', lathe([[0, bottom], [0.3, bottom + 0.02], [0.55, bottom + 0.15], [0.66, bottom + 0.3], [0.64, bottom + 0.31], [0.52, bottom + 0.18], [0.28, bottom + 0.07], [0, bottom + 0.05]], { seg: 28 }), { at: [x, y, 0] });
    }
    if (o.lit) { K.lampAt(f, x, y, bottom + 0.3, o.power ?? 0.8); K.lamps[K.lamps.length - 1].halo = 0.8; }
  }

  return { tableLamp, floorLamp, candle, jarCandle, pillarCandle, sconce, ceilingLight, shadeAt };
}
