// Trees. Each is grown from a seed by a species recipe: old spreading oaks,
// upright maples and a copper beech, multi-stemmed white birches, apples in
// the orchard, cherries, magnolias and lilacs in flower, a weeping willow by
// the pond, a red Japanese maple, and white pines. All the crowns are one painted atlas of leaf sprigs
// (see garden/paint.js), drawn as instanced cards: a few draw calls in all.
//
// places: [{ x, z, kind, seed, height, trunk, y, collide }], kind defaults to 'oak'.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { rng, CardSet, starGeo, crossGeo, cardMaterials, atlasTexture, cellUV, place } from './garden/cards.js';
import { paintTrees } from './garden/paint.js';

// How each kind grows. Lengths are fractions of the tree's height.
const SPECIES = {
  oak:      { cell: 'oak', H: 46, trunk: 2.1, bole: 0.22, kids0: 4, depth: 4, lift0: [0.42, 0.3], lift: [0.12, 0.38], follow0: 0.15, follow: 0.42, len0: [0.27, 0.07], tufts: 4, tuft: [11.5, 7], spread: 5 },
  maple:    { cell: 'maple', H: 44, trunk: 1.5, bole: 0.3, kids0: 4, depth: 4, lift0: [0.62, 0.25], lift: [0.3, 0.4], follow0: 0.3, follow: 0.55, len0: [0.24, 0.06], tufts: 4, tuft: [10.5, 6], spread: 4 },
  copper:   { cell: 'copper', H: 48, trunk: 1.9, bole: 0.2, kids0: 5, depth: 4, lift0: [0.5, 0.25], lift: [0.2, 0.4], follow0: 0.2, follow: 0.5, len0: [0.27, 0.06], tufts: 4, tuft: [11.5, 6], spread: 5, smooth: true },
  birch:    { cell: 'birch', H: 36, trunk: 0.55, bole: 0.45, kids0: 3, depth: 3, lift0: [0.7, 0.2], lift: [0.4, 0.4], follow0: 0.5, follow: 0.6, len0: [0.18, 0.06], tufts: 5, tuft: [6.5, 4], spread: 3, stems: 3, bark: 'birch' },
  apple:    { cell: 'apple', H: 16, trunk: 0.55, bole: 0.3, kids0: 4, depth: 3, lift0: [0.35, 0.25], lift: [0.2, 0.4], follow0: 0.2, follow: 0.4, len0: [0.3, 0.08], tufts: 5, tuft: [5, 2.5], spread: 2.2 },
  cherry:   { cell: 'cherry', H: 22, trunk: 0.8, bole: 0.28, kids0: 4, depth: 3, lift0: [0.45, 0.25], lift: [0.25, 0.4], follow0: 0.25, follow: 0.45, len0: [0.3, 0.06], tufts: 9, tuft: [5.5, 3], spread: 2.6, smooth: true },
  magnolia: { cell: 'magnolia', H: 18, trunk: 0.5, bole: 0.12, kids0: 3, depth: 3, lift0: [0.55, 0.25], lift: [0.3, 0.4], follow0: 0.3, follow: 0.5, len0: [0.3, 0.06], tufts: 9, tuft: [4.5, 2.5], spread: 2.4, stems: 3, smooth: true },
  lilac:    { cell: 'lilac', H: 13, trunk: 0.3, bole: 0.1, kids0: 3, depth: 3, lift0: [0.7, 0.2], lift: [0.4, 0.3], follow0: 0.5, follow: 0.6, len0: [0.3, 0.05], tufts: 8, tuft: [3.6, 2], spread: 1.8, stems: 4 },
  jmaple:   { cell: 'jmaple', H: 14, trunk: 0.5, bole: 0.18, kids0: 4, depth: 3, lift0: [0.3, 0.2], lift: [0.05, 0.2], follow0: 0.1, follow: 0.3, len0: [0.38, 0.08], tufts: 9, tuft: [4.2, 2.5], spread: 2.4, stems: 2, smooth: true, flat: true },
  willow:   { cell: 'willow', H: 40, trunk: 1.9, bole: 0.2, kids0: 5, depth: 3, lift0: [0.55, 0.2], lift: [0.25, 0.35], follow0: 0.25, follow: 0.4, len0: [0.3, 0.06], tufts: 4, tuft: [9, 4], spread: 4, weep: true },
  pine:     { cell: 'pine', H: 56, trunk: 1.3, conifer: true },
};

function limbGeometry(a, b, r0, r1, seg) {
  const dir = new THREE.Vector3().subVectors(b, a), len = dir.length();
  const g = new THREE.CylinderGeometry(r1, r0, len, seg ?? (r0 > 0.9 ? 9 : r0 > 0.3 ? 6 : 4), 1, true);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.max(1, Math.round(r0 * 2.2)), uv.getY(i) * len / 5);
  g.translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()));
  g.translate(a.x, a.y, a.z);
  return g;
}

function birchTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 512;
  const g = c.getContext('2d'), r = rng(77);
  g.fillStyle = '#c9c4b8'; g.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(${150 + r() * 40},${145 + r() * 40},${135 + r() * 40},${0.15 + r() * 0.25})`; g.fillRect(r() * 256, r() * 512, 10 + r() * 60, 1 + r() * 2); }
  for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(20,18,16,${0.55 + r() * 0.4})`; const w = 6 + r() * 40, x = r() * 256, y = r() * 512; g.beginPath(); g.ellipse(x, y, w, 1.5 + r() * 3.5, 0, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 0.5);
  return t;
}

export function makeTrees(scene, materials, colliders, places) {
  const atlas = paintTrees(512), W = atlas.canvas.width, H = atlas.canvas.height;
  const tex = atlasTexture(atlas.canvas, Object.values(atlas.rects));
  const mats = cardMaterials(tex, { sway: 0.35, roughness: 0.82, env: 0.65, alphaTest: 0.42 });
  const cell = name => cellUV(W, H, atlas.rects[name], 3);
  const shapes = { star: starGeo(), hang: (() => { const g = crossGeo(2); g.translate(0, -1, 0); return g; })() };
  const cards = new CardSet({ region: 160 }), ring = new CardSet({ region: 400 });
  const wood = { bark: [], birch: [] };
  const m = new THREE.Matrix4(), col = new THREE.Color();

  for (const p of places) {
    const sp = SPECIES[p.kind ?? 'oak'] ?? SPECIES.oak, r = rng(p.seed ?? Math.round(p.x * 13 + p.z * 7));
    const Ht = p.height ?? sp.H, trunkR = p.trunk ?? sp.trunk * Ht / sp.H, y0 = p.y ?? 0, uvc = cell(sp.cell);
    const limbs = wood[sp.bark ?? 'bark'];
    const tuft = (pos, size, shade) => {
      const k = THREE.MathUtils.clamp((pos.y - y0 - Ht * 0.3) / (Ht * 0.65), 0, 1);
      col.setScalar((0.74 + 0.5 * k + r() * 0.15) * (shade ?? 1));
      if (sp.cell === 'cherry' || sp.cell === 'magnolia' || sp.cell === 'lilac') col.setScalar(0.85 + 0.25 * k + r() * 0.1);
      cards.push('star', uvc, place(m, pos.x, pos.y, pos.z, size, size, size, r() * 6.28, (r() - 0.5) * 0.7, (r() - 0.5) * 0.7), col);
    };

    if (sp.conifer) {
      // A white pine: straight trunk, whorls of branches, sparser and wider low down
      const base = new THREE.Vector3(p.x, y0 - 0.5, p.z), top = new THREE.Vector3(p.x + (r() - 0.5) * 1.5, y0 + Ht, p.z + (r() - 0.5) * 1.5);
      limbs.push(limbGeometry(base, top, trunkR, trunkR * 0.15, 8));
      for (let y = Ht * 0.28; y < Ht; y += 2.6 + r() * 1.2) {
        const f = 1 - (y - Ht * 0.28) / (Ht * 0.72), reach = 3 + f * Ht * 0.22, n = 4 + Math.floor(r() * 3), turn = r() * 6.28;
        for (let i = 0; i < n; i++) {
          const a = turn + (i / n) * 6.28 + (r() - 0.5) * 0.5, c = new THREE.Vector3(p.x + Math.cos(a) * reach, y0 + y - reach * 0.18, p.z + Math.sin(a) * reach);
          const st = base.clone().lerp(top, (y + 0.5) / Ht);
          if (reach > 4) limbs.push(limbGeometry(st, c, Math.max(0.12, trunkR * 0.18 * f), 0.06, 4));
          for (let k = 0; k < 3; k++) { const t = 0.35 + k * 0.32, pos = st.clone().lerp(c, t); pos.y += (r() - 0.6) * 1.2; tuft(pos, 4.5 + f * 4 + r() * 2, 0.8 + 0.3 * k); }
        }
      }
      tuft(top.clone().add(new THREE.Vector3(0, -1.2, 0)), 4, 1.1);
    } else {
      const ends = [];
      const grow = (a, dir, len, rad, depth) => {
        const b = a.clone().addScaledVector(dir, len);
        limbs.push(limbGeometry(a, b, rad, rad * 0.72));
        if (depth >= 2) {
          const k = depth >= sp.depth ? sp.tufts : 1;
          for (let i = 0; i < k; i++) {
            const t = depth >= sp.depth ? 0.3 + r() * 0.8 : 0.7 + r() * 0.3, s = sp.spread * (Ht / sp.H) ** 0.5;
            tuft(a.clone().lerp(b, t).add(new THREE.Vector3((r() - 0.5) * s, r() * s * 0.6, (r() - 0.5) * s)), (sp.tuft[0] + r() * sp.tuft[1]) * (Ht / sp.H) ** 0.6);
          }
        }
        if (depth >= sp.depth) { ends.push(b); return; }
        const kids = depth === 0 ? sp.kids0 : 2 + (r() < 0.55 ? 1 : 0), turn = r() * Math.PI * 2;
        for (let i = 0; i < kids; i++) {
          const az = turn + (i / kids) * Math.PI * 2 + (r() - 0.5) * 0.9;
          const lift = depth === 0 ? sp.lift0[0] + r() * sp.lift0[1] : sp.lift[0] + r() * sp.lift[1];
          const d = new THREE.Vector3(Math.cos(az), 0, Math.sin(az)).multiplyScalar(1 - lift).add(new THREE.Vector3(0, lift, 0));
          d.lerp(dir, depth === 0 ? sp.follow0 : sp.follow).normalize();
          if (sp.flat) d.y = Math.min(d.y, 0.35);
          if (d.y < 0.05) d.y = 0.05 + r() * 0.1;
          grow(b, d.normalize(), depth === 0 ? Ht * (sp.len0[0] + r() * sp.len0[1]) : len * (0.74 + r() * 0.16), rad * 0.72 * (0.62 + r() * 0.14), depth + 1);
        }
      };
      const stems = sp.stems ?? 1;
      for (let s = 0; s < stems; s++) {
        const off = stems > 1 ? new THREE.Vector3((r() - 0.5) * 1.6, 0, (r() - 0.5) * 1.6) : new THREE.Vector3();
        const base = new THREE.Vector3(p.x, y0 - 0.5, p.z).add(off);
        const lean = new THREE.Vector3((r() - 0.5) * (stems > 1 ? 0.3 : 0.22) + off.x * 0.12, 1, (r() - 0.5) * (stems > 1 ? 0.3 : 0.22) + off.z * 0.12).normalize();
        const tr = trunkR / Math.sqrt(stems);
        if (stems === 1 && !sp.smooth) limbs.push(limbGeometry(base.clone().add(new THREE.Vector3(0, -0.5, 0)), base.clone().add(new THREE.Vector3(0, 1.6, 0)), tr * 1.5, tr));   // root flare
        grow(base.clone().add(new THREE.Vector3(0, stems === 1 ? 1.4 : 0, 0)), lean, Ht * sp.bole * (stems > 1 ? 1.6 : 1), tr, 0);
      }
      if (sp.weep) {
        // Curtains of willow, hanging from every outer branch nearly to the grass
        const wc = cell('willow');
        for (const e of ends) for (let k = 0; k < 6; k++) {
          const x = e.x + (r() - 0.5) * 6, z = e.z + (r() - 0.5) * 6, y = e.y + 1 + r() * 2.5, len = Math.max(6, y - y0 - 2.5 - r() * 5);
          col.setScalar(0.8 + r() * 0.35);
          cards.push('hang', wc, place(m, x, y, z, 3.5 + r() * 2.5, len, 3.5 + r() * 2.5, r() * 6.28), col);
        }
      }
    }
    if (p.collide !== false && !p.y) colliders.push({ x0: p.x - trunkR * 0.9, x1: p.x + trunkR * 0.9, z0: p.z - trunkR * 0.9, z1: p.z + trunkR * 0.9, y0: -1, y1: 12 });
  }

  const leaves = [...cards.build(scene, shapes, mats, { shadow: true }), ...ring.build(scene, shapes, mats, { shadow: false })];
  for (const l of leaves) l.name = 'tree leaves';
  const add = (list, mat) => { if (!list.length) return; const w = new THREE.Mesh(mergeGeometries(list), mat); w.castShadow = w.receiveShadow = true; w.name = 'tree wood'; scene.add(w); };
  add(wood.bark, materials.bark);
  add(wood.birch, new THREE.MeshStandardMaterial({ map: birchTexture(), roughness: 0.8, envMapIntensity: 0.6 }));
}
