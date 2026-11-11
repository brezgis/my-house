// Planting: where every perennial, shrub, fern and vegetable goes. Plants are
// recorded during layout (before any material exists) and built in setup()
// as instanced cards from the painted atlas in paint.js.

import * as THREE from 'three';
import { CardSet, crossGeo, rosetteGeo, flatGeo, starGeo, cardMaterials, atlasTexture, cellUV, place, rng } from './cards.js';
import { paintFlora } from './paint.js';

// kind: [atlas cell, shape, width, height]
export const KINDS = {
  fern: ['fern', 'x', 3.2, 2.4], hydrangea: ['hydrangea', 'x', 4.6, 4.2], rose: ['rose', 'x', 3.6, 4.2], shrub: ['shrub', 'x', 7, 7.5],
  grass: ['grass', 'x', 2.8, 3.4], wildflowers: ['wildflowers', 'x', 3.2, 3.0], lavender: ['lavender', 'x', 2.5, 2.3], tomato: ['tomato', 'x', 2.4, 5.4],
  sunflower: ['sunflower', 'x', 3.4, 8], spires: ['spires', 'x', 3.2, 5.6], cosmos: ['cosmos', 'x', 3.6, 3.8], bean: ['bean', 'x', 1.6, 7.2], wisteria: ['wisteria', 'hang', 2.2, 4.5],
  lettuce: ['lettuce', 'r', 0.75, 0.75], lettuceRed: ['lettuceRed', 'r', 0.75, 0.75], kale: ['kale', 'r', 1.2, 1.9], chard: ['chard', 'r', 1.1, 1.8], cabbage: ['cabbage', 'r', 1.0, 1.0],
  squash: ['squash', 'r', 1.6, 1.8], hosta: ['hosta', 'r', 1.3, 1.3], lilypad: ['lilypad', 'f', 1.6, 1.6], waterlily: ['waterlily', 'f', 0.8, 0.8],
  carrot: ['carrot', 'x', 1.0, 1.1], leek: ['leek', 'x', 0.8, 1.7], herbs: ['herbs', 'x', 1.8, 1.4], marigold: ['marigold', 'x', 1.4, 1.1], catmint: ['catmint', 'x', 2.6, 1.9],
  coneflower: ['coneflower', 'x', 2.4, 3.0], strawberry: ['strawberry', 'x', 1.3, 0.8],
};

export class Flora {
  constructor(seed = 99) { this.list = []; this.r = rng(seed); }
  // One plant. s scales it; o: { w, h, rot, tilt, tint, y }
  add(kind, x, z, s = 1, o = {}) {
    const k = KINDS[kind]; if (!k) throw new Error('no plant kind ' + kind);
    const r = this.r, v = 0.85 + r() * 0.3;
    this.list.push({ kind, shape: k[1], x, z, y: o.y ?? 0, w: (o.w ?? k[2]) * s * v, h: (o.h ?? k[3]) * s * (0.85 + r() * 0.3), rot: o.rot ?? r() * 6.28, tilt: o.tilt ?? (k[1] === 'x' ? (r() - 0.5) * 0.12 : 0), tint: o.tint ?? 0.85 + r() * 0.25 });
  }
  // A naturalistic drift of n plants inside an ellipse
  drift(kind, cx, cz, rx, rz, n, s = 1, o = {}) {
    for (let i = 0; i < n; i++) { const a = this.r() * 6.28, d = Math.sqrt((i + this.r()) / n); this.add(kind, cx + Math.cos(a) * rx * d, cz + Math.sin(a) * rz * d, s * (0.8 + this.r() * 0.35), o); }
  }
  row(kind, x0, z0, x1, z1, step, s = 1, o = {}) {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / step));
    for (let i = 0; i <= n; i++) { const t = i / n; this.add(kind, x0 + (x1 - x0) * t + (this.r() - 0.5) * step * 0.2, z0 + (z1 - z0) * t + (this.r() - 0.5) * step * 0.2, s, o); }
  }
  // Fill a polygon (in x,z) with plants chosen from a weighted palette [[kind, weight, scale], ...]
  fill(poly, palette, spacing, o = {}) {
    let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
    for (const [x, z] of poly) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
    const tot = palette.reduce((a, p) => a + p[1], 0);
    for (let x = x0 + spacing / 2; x < x1; x += spacing) for (let z = z0 + spacing / 2; z < z1; z += spacing) {
      const px = x + (this.r() - 0.5) * spacing * 0.8, pz = z + (this.r() - 0.5) * spacing * 0.8;
      if (!inPoly(px, pz, poly)) continue;
      let w = this.r() * tot, p = palette[0];
      for (const q of palette) { w -= q[1]; if (w <= 0) { p = q; break; } }
      if (p[0]) this.add(p[0], px, pz, p[2] ?? 1, o);
    }
  }
  // A long mixed border along the polyline pts, planted in drifts: tall at the back, low at the front.
  // side: +1 or -1, which side of the line the border lies (the line is its front edge).
  border(pts, depth, side, { back, mid, front, step = 6 }) {
    const r = this.r;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], len = Math.hypot(bx - ax, bz - az), tx = (bx - ax) / len, tz = (bz - az) / len, nx = -tz * side, nz = tx * side;
      for (let d = r() * 2; d < len; d += step * (0.7 + r() * 0.6)) {
        const px = ax + tx * d, pz = az + tz * d;
        const lay = (pal, f0, f1, n, rx) => { const p = pal[Math.floor(r() * pal.length)]; const f = f0 + (f1 - f0) * r(); this.drift(p[0], px + nx * depth * f + tx * (r() - 0.5) * 2, pz + nz * depth * f + tz * (r() - 0.5) * 2, rx, rx * 0.6, n, p[1] ?? 1); };
        if (back) lay(back, 0.72, 0.88, 2 + Math.floor(r() * 2), step * 0.4);
        if (mid) lay(mid, 0.4, 0.6, 2 + Math.floor(r() * 3), step * 0.45);
        if (front) lay(front, 0.1, 0.22, 2 + Math.floor(r() * 3), step * 0.4);
      }
    }
  }

  build(scene) {
    const atlas = paintFlora(2048), W = atlas.canvas.width;
    const tex = atlasTexture(atlas.canvas, Object.values(atlas.rects));
    const mats = cardMaterials(tex, { sway: 0.06, roughness: 0.8, env: 0.7, alphaTest: 0.45 });
    const flat = cardMaterials(tex, { sway: 0.0, roughness: 0.5, env: 0.8, alphaTest: 0.45 });
    const shapes = { x: crossGeo(3), r: rosetteGeo(7, 0.62), f: flatGeo(), star: starGeo(), hang: (() => { const g = crossGeo(2); g.translate(0, -1, 0); return g; })() };
    const cells = {}; for (const [n, rect] of Object.entries(atlas.rects)) cells[n] = cellUV(W, W, rect, 2);
    const sets = { main: new CardSet({ region: 160 }), flat: new CardSet({ region: 400 }) };
    const m = new THREE.Matrix4(), c = new THREE.Color();
    for (const p of this.list) {
      const k = KINDS[p.kind]; c.setScalar(p.tint);
      if (p.shape === 'f') sets.flat.push('f', cells[k[0]], place(m, p.x, p.y, p.z, p.w, 1, p.w, p.rot), c);
      else if (p.shape === 'r') sets.main.push('r', cells[k[0]], place(m, p.x, p.y, p.z, p.w, p.h, p.w, p.rot), c);
      else if (p.shape === 'hang') sets.main.push('hang', cells[k[0]], place(m, p.x, p.y, p.z, p.w, p.h, p.w, p.rot), c);
      else sets.main.push('x', cells[k[0]], place(m, p.x, p.y, p.z, p.w, p.h, p.w, p.rot, p.tilt, p.tilt * 0.7), c);
    }
    const meshes = [...sets.main.build(scene, shapes, mats), ...sets.flat.build(scene, shapes, flat, { shadow: false })];
    for (const mesh of meshes) mesh.name = 'plants';
    return { meshes, count: this.list.length };
  }
}

export function inPoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i], [xj, zj] = poly[j];
    if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) inside = !inside;
  }
  return inside;
}
