// Everything that arrives after the walls: the collected furniture, pictures,
// rugs, books, and the things that move or respond - candle flames, the fire,
// steam off a cup, koi, bees, the swing, sitting down.

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { shuffle } from './shuffle.js';

const FT = 3.28084;
// Labels and pictures lie a hair in front of what they are printed on or framed in; drawn a touch
// nearer in depth, they do not flicker against it when seen from across the garden.
const DECAL = { polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 };

// ---- Drawn surfaces -------------------------------------------------------------------
function canvas(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
// A drawn surface's shape and turn. Plain signs are rectangles; e.round makes a disc (w across) whose
// UVs cover the canvas's inscribed circle, and e.tilt leans a standing sign back from upright by that
// many radians (top away from the viewer), for a plate propped on a rail.
const signGeo = e => (e.round ? new THREE.CircleGeometry(e.w / 2, 48) : new THREE.PlaneGeometry(e.w, e.h));
function orientSign(o, e) {
  if (e.flat) { o.rotation.order = 'YXZ'; o.rotation.set(-Math.PI / 2, e.rotY, 0); }
  else if (e.tilt) { o.rotation.order = 'YXZ'; o.rotation.set(-e.tilt, e.rotY, 0); }
  else o.rotation.y = e.rotY;
}
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

const DRAW = {
  chalk(g, w, h) {
    const r = rng(5);
    g.fillStyle = '#26302c'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,255,255,${0.012 + r() * 0.02})`; g.beginPath(); g.ellipse(r() * w, r() * h, 60 + r() * 220, 20 + r() * 60, r() * 3, 0, 7); g.fill(); }
    const chalk = (c = '#f1efe6') => { g.strokeStyle = c; g.fillStyle = c; g.lineWidth = 3.2; g.lineCap = 'round'; };
    const hand = px => { g.font = `${px}px "Bradley Hand", "Segoe Print", "Comic Sans MS", cursive`; };
    chalk(); hand(44); g.fillText('colorless green ideas sleep furiously', 40, 70);
    // a little syntax tree
    const node = (t, x, y) => { hand(34); const m = g.measureText(t).width; g.fillText(t, x - m / 2, y); };
    const edge = (a, b, c, d) => { g.beginPath(); g.moveTo(a, b + 8); g.lineTo(c, d - 30); g.stroke(); };
    node('S', 250, 150); node('NP', 150, 240); node('VP', 350, 240); node('Det', 90, 330); node('N', 210, 330); node('V', 300, 330); node('AdvP', 420, 330);
    edge(250, 150, 150, 240); edge(250, 150, 350, 240); edge(150, 240, 90, 330); edge(150, 240, 210, 330); edge(350, 240, 300, 330); edge(350, 240, 420, 330);
    hand(30); chalk('#f2d16b'); node('the', 90, 395); node('house', 210, 395); node('sleeps', 300, 395); node('soundly', 420, 395);
    chalk(); hand(38); g.fillText('⟦every⟧ = λP.λQ.∀x[P(x) → Q(x)]', 520, 170);
    hand(34); g.fillText('/haʊs/   /hoʊm/', 560, 240);
    chalk('#e58f9a'); hand(36); g.fillText('P(wᵢ | w₁ … wᵢ₋₁)', 560, 320); g.beginPath(); g.moveTo(555, 335); g.lineTo(880, 335); g.stroke();
    chalk(); hand(32); ['☑ espresso', '☐ feed the koi', '☐ water the tomatoes', '☐ light a candle'].forEach((t, i) => g.fillText(t, 960, 150 + i * 52));
    chalk('#e58f9a'); g.beginPath(); g.moveTo(1150, 430); g.bezierCurveTo(1110, 380, 1060, 440, 1150, 500); g.bezierCurveTo(1240, 440, 1190, 380, 1150, 430); g.stroke();
    chalk(); hand(30); g.fillText('welcome home', 1040, 560);
  },
  screenA(g, w, h) {
    const r = rng(9), cols = ['#c678dd', '#61afef', '#98c379', '#e5c07b', '#abb2bf', '#56b6c2', '#e06c75'];
    g.fillStyle = '#1e2127'; g.fillRect(0, 0, w, h); g.fillStyle = '#282c34'; g.fillRect(0, 0, w, 26); g.fillRect(0, 26, 150, h);
    for (let i = 0; i < 14; i++) { g.fillStyle = 'rgba(171,178,191,.45)'; g.fillRect(14 + (i % 3 ? 12 : 0), 44 + i * 22, 60 + r() * 60, 8); }
    for (let y = 44, ind = 0; y < h - 20; y += 20) {
      ind = Math.max(0, Math.min(4, ind + Math.floor(r() * 3) - 1)); let x = 172 + ind * 26;
      g.fillStyle = '#4b5263'; g.fillRect(156, y, 8, 8);
      for (let k = 0; k < 1 + r() * 5 && x < w - 60; k++) { const l = 18 + r() * 90; g.fillStyle = cols[Math.floor(r() * cols.length)]; g.fillRect(x, y, l, 9); x += l + 9; }
    }
  },
  screenB(g, w, h) {
    const r = rng(4);
    g.fillStyle = '#f6f3ea'; g.fillRect(0, 0, w, h); g.fillStyle = '#2b2b2b'; g.fillRect(70, 40, 300, 14);
    for (let y = 80; y < 210; y += 16) { g.fillStyle = '#8b8b86'; g.fillRect(70, y, 380 + r() * 120, 6); }
    g.strokeStyle = '#555'; g.lineWidth = 2; g.strokeRect(70, 240, 480, 220);
    for (const [c, a] of [['#c0563f', 0.9], ['#3f6f8f', 0.6]]) { g.strokeStyle = c; g.lineWidth = 4; g.beginPath(); for (let i = 0; i <= 24; i++) { const x = 70 + i * 20, y = 450 - 190 * (1 - Math.exp(-i * 0.16 * a)) - r() * 8; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
    for (let y = 70; y < 470; y += 16) { g.fillStyle = '#8b8b86'; g.fillRect(600, y, 180 + r() * 160, 6); }
  },
  imac(g, w, h) {
    g.fillStyle = '#5aa6a8'; g.fillRect(0, 0, w, h); g.fillStyle = '#e9e9e9'; g.fillRect(0, 0, w, 22);
    g.fillStyle = '#f4f4f4'; g.fillRect(w / 2 - 110, h / 2 - 105, 220, 190); g.strokeStyle = '#222'; g.lineWidth = 5; g.strokeRect(w / 2 - 110, h / 2 - 105, 220, 190);
    g.fillStyle = '#222'; g.fillRect(w / 2 - 50, h / 2 - 60, 10, 26); g.fillRect(w / 2 + 40, h / 2 - 60, 10, 26); g.beginPath(); g.lineWidth = 6; g.moveTo(w / 2, h / 2 - 50); g.lineTo(w / 2 - 12, h / 2 + 5); g.lineTo(w / 2 + 6, h / 2 + 5); g.stroke();
    g.beginPath(); g.arc(w / 2, h / 2 + 15, 46, 0.25, Math.PI - 0.25); g.stroke();
    g.font = 'italic 44px Georgia, serif'; g.fillStyle = '#fff'; g.fillText('hello', w / 2 - 48, h - 28);
  },
};

const PALETTES = {
  garden: ['#8f8468', '#7a3a26', '#55634c', '#232c3e', '#96702a'],
  tabriz: ['#5e211c', '#1a2538', '#a3977c', '#8a6633', '#44594b'],
  kilim: ['#9a8c70', '#7a3a26', '#232c3e', '#96702a', '#4f5f4e'],
  runner: ['#232c3e', '#7a3a26', '#a3977c', '#96702a', '#4f5f4e'],
  mat: ['#a8a290', '#55634c', '#a8a290', '#8f8468', '#a8a290'],
};
function rugTexture(style, w, d) {
  const S = 44, cw = Math.round(w * S), ch = Math.round(d * S), p = PALETTES[style], r = rng(style.length * 131 + Math.round(w * d));
  return canvas(cw, ch, g => {
    g.fillStyle = p[0]; g.fillRect(0, 0, cw, ch);
    const band = (inset, wd, c) => { g.strokeStyle = c; g.lineWidth = wd; g.strokeRect(inset, inset, cw - 2 * inset, ch - 2 * inset); };
    band(14, 28, p[1]); band(40, 10, p[3]); band(56, 16, p[2]);
    const diamond = (x, y, a, b, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(x, y - b); g.lineTo(x + a, y); g.lineTo(x, y + b); g.lineTo(x - a, y); g.closePath(); g.fill(); };
    for (let x = 30; x < cw - 20; x += 44) { diamond(x, 14, 12, 9, p[4]); diamond(x, ch - 14, 12, 9, p[4]); }
    for (let y = 30; y < ch - 20; y += 44) { diamond(14, y, 9, 12, p[4]); diamond(cw - 14, y, 9, 12, p[4]); }
    if (style === 'kilim' || style === 'runner') {
      const long = cw > ch, n = Math.max(3, Math.round((long ? cw : ch) / 190));
      for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, x = long ? 80 + t * (cw - 160) : cw / 2, y = long ? ch / 2 : 80 + t * (ch - 160), a = (long ? ch : cw) * 0.3; diamond(x, y, a * 0.9, a * 0.9, p[1 + (i % 2)]); diamond(x, y, a * 0.55, a * 0.55, p[0]); diamond(x, y, a * 0.25, a * 0.25, p[3]); }
    } else if (style !== 'mat') {
      diamond(cw / 2, ch / 2, cw * 0.3, ch * 0.3, p[1]); diamond(cw / 2, ch / 2, cw * 0.22, ch * 0.22, p[0]); diamond(cw / 2, ch / 2, cw * 0.1, ch * 0.1, p[2]);
      for (let x = 100; x < cw - 90; x += 62) for (let y = 100; y < ch - 90; y += 62) if (Math.abs(x - cw / 2) / (cw * 0.32) + Math.abs(y - ch / 2) / (ch * 0.32) > 1) diamond(x + ((y / 62) % 2) * 31, y, 5, 5, p[3 + ((x + y) % 2)]);
      for (const [x, y] of [[0.14, 0.16], [0.86, 0.16], [0.14, 0.84], [0.86, 0.84]]) { diamond(cw * x, ch * y, 40, 40, p[3]); diamond(cw * x, ch * y, 22, 22, p[2]); }
    }
    const img = g.getImageData(0, 0, cw, ch), dd = img.data;                       // wool: a little grain and wear
    for (let i = 0; i < dd.length; i += 4) { const n = (r() - 0.5) * 26; dd[i] += n; dd[i + 1] += n; dd[i + 2] += n; }
    g.putImageData(img, 0, 0);
  });
}

// ---- Models: merge a model's meshes that share a material -----------------------------
// Returns { root, box }: a Group of merged meshes in the model's own space, its bounding box.
// Skinned or morphing models are kept as they are. Materials are tuned for the house: a
// little less sky reflection indoors, and alpha-tested rather than blended leaves and cloth.
function prepareModel(src, outdoor) {
  src.updateMatrixWorld(true);
  const tuned = new Map(), tune = mat => {
    if (!tuned.has(mat)) { const m = mat.clone(); m.envMapIntensity = outdoor ? 0.8 : 0.3; if (m.transparent || m.alphaTest > 0) { m.transparent = false; m.alphaTest = 0.5; }
      // Refracting glass (a vase, a lens, a bottle) makes the renderer draw the whole scene a second time, into
      // a full-size texture, in every frame in which one such piece is in view. Plain clear glass instead.
      if (m.transmission > 0) { m.transmission = 0; m.thickness = 0; m.transparent = true; m.opacity = 0.32; m.depthWrite = false; }
      tuned.set(mat, m); }
    return tuned.get(mat);
  };
  let plain = true;
  src.traverse(n => { if (n.isSkinnedMesh || (n.isMesh && (n.morphTargetInfluences?.length || Array.isArray(n.material)))) plain = false; });
  let root;
  if (!plain) { root = src.clone(true); root.traverse(n => { if (n.isMesh && !Array.isArray(n.material)) n.material = tune(n.material); }); }
  else {
    const groups = new Map();
    src.traverse(n => {
      if (!n.isMesh) return;
      let g = n.geometry.clone();
      if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
      g.applyMatrix4(n.matrixWorld);
      if (n.matrixWorld.determinant() < 0) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; } }
      for (const k of Object.keys(g.morphAttributes)) delete g.morphAttributes[k];
      g.clearGroups();
      const key = n.material.uuid + '|' + Object.keys(g.attributes).sort().map(k => k + g.attributes[k].itemSize + (g.attributes[k].normalized ? 'n' : '') + g.attributes[k].array.constructor.name).join(',');
      if (!groups.has(key)) groups.set(key, { mat: n.material, list: [], name: n.name });
      groups.get(key).list.push(g);
    });
    root = new THREE.Group();
    for (const { mat, list, name } of groups.values()) {
      const geo = list.length > 1 ? mergeGeometries(list) : list[0];
      if (!geo) { console.warn('merge failed', name); continue; }
      const mesh = new THREE.Mesh(geo, tune(mat)); mesh.name = name; root.add(mesh);
    }
  }
  root.updateMatrixWorld(true);
  return { root, box: new THREE.Box3().setFromObject(root) };
}

// ---------------------------------------------------------------------------------------
export function bringToLife({ scene, outdoors = scene, vis = null, quality = {}, renderer, camera, items, garden, colliders, materials, doors = [], onChange }) {
  const { models, extras, books, candles, seats, lamps, steam } = items;
  const animated = [], interact = [];
  // Things drawn only when their zone can be seen (visibility.js); test: an extra condition
  const tracked = [];
  const track = (o, zone, test) => { if (vis) tracked.push({ o, zone, test }); };
  const zoneAt = (x, y, z, size = 0.5) => vis ? vis.zoneOfBox(new THREE.Box3(new THREE.Vector3(x - size, y - size, z - size), new THREE.Vector3(x + size, y + size, z + size)), true, true) : '';
  // Pictures and models load on a manager of their own, so the house appears (main.js waits
  // on the default manager: the house's own textures) without waiting for them.
  const lazy = new THREE.LoadingManager();
  const texLoader = new THREE.TextureLoader(lazy);

  // ---- Books: real ones. Every spine is printed with a title from assets/books.json ----
  // Spines are drawn into a few shared sheets (512 to a sheet), and each sheet's
  // books are one mesh, so two thousand books cost a handful of draw calls.
  (async () => {
    let list = [];
    try { list = await (await fetch('assets/books.json')).json(); } catch { /* shelves stay bare */ }
    if (!list.length) return;
    const r = rng(1906), CW = 32, CH = 256, SIZE = 2048, COLS = SIZE / CW, PER = COLS * (SIZE / CH);
    const pools = { small: [], medium: [], large: [], folio: [] };
    for (const b of list) (pools[b.size] ?? pools.medium).push(b);
    for (const k in pools) shuffle(pools[k], r);
    const taken = { small: 0, medium: 0, large: 0, folio: 0 };
    const choose = tall => { const k = tall > 0.92 ? 'folio' : tall > 0.82 ? 'large' : tall > 0.7 ? 'medium' : 'small', p = pools[k].length ? pools[k] : list; return p[taken[k]++ % p.length]; };
    const FONTS = ['Georgia, serif', '"Palatino Linotype", Palatino, serif', 'Helvetica, Arial, sans-serif', '"Gill Sans", "Trebuchet MS", sans-serif', '"Times New Roman", serif'];
    for (let start = 0; start < books.length; start += PER) {
      const batch = books.slice(start, start + PER), geos = new Map(), SH = Math.ceil(batch.length / COLS) * CH;   // the last sheet only as tall as it needs
      const tex = canvas(SIZE, SH, g => {
        g.fillStyle = '#e9e2d0'; g.fillRect(0, 0, SIZE, SH);
        batch.forEach((b, i) => {
          const rec = choose(b.lying ? b.sx + b.sz : b.sy); b.rec = rec;      /* which book this is (hands.js lets you take it down) */
          const cx = (i % COLS) * CW, cy = Math.floor(i / COLS) * CH;
          const col = new THREE.Color(rec.colour ?? '#6b2a25'), lum = 0.3 * col.r + 0.59 * col.g + 0.11 * col.b, ink = lum > 0.5 ? '#1c1a17' : '#f1e9d6';
          g.fillStyle = '#' + col.getHexString(); g.fillRect(cx, cy, CW, CH);
          const sh = g.createLinearGradient(cx, 0, cx + CW, 0); sh.addColorStop(0, 'rgba(0,0,0,.28)'); sh.addColorStop(0.18, 'rgba(0,0,0,0)'); sh.addColorStop(0.82, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.3)');
          g.fillStyle = sh; g.fillRect(cx, cy, CW, CH);
          const style = Math.floor(r() * 4);
          g.fillStyle = ink; g.globalAlpha = 0.75;
          if (style === 0) { g.fillRect(cx + 3, cy + 16, CW - 6, 1.5); g.fillRect(cx + 3, cy + CH - 18, CW - 6, 1.5); }
          if (style === 1) { g.fillRect(cx, cy + 12, CW, 5); g.fillRect(cx, cy + CH - 17, CW, 5); }
          if (style === 2) { g.globalAlpha = 0.9; g.fillStyle = lum > 0.5 ? '#f1e9d6' : '#1c1a17'; g.fillRect(cx, cy + 30, CW, CH - 96); g.fillStyle = lum > 0.5 ? '#1c1a17' : '#f1e9d6'; }
          g.globalAlpha = 1;
          const title = rec.spine_title ?? rec.title, author = (rec.author ?? '').split(/[ ,]+/).filter(Boolean).pop() ?? '';
          g.save(); g.translate(cx + CW / 2, cy + CH / 2); g.rotate(Math.PI / 2); g.textAlign = 'center'; g.textBaseline = 'middle';
          const font = FONTS[Math.floor(r() * FONTS.length)], weight = r() < 0.5 ? 'bold ' : '';
          let px = 17; g.font = `${weight}${px}px ${font}`;
          while (g.measureText(title).width > CH - 108 && px > 8) { px -= 1; g.font = `${weight}${px}px ${font}`; }
          g.fillText(title, -18, 1);
          g.font = `${Math.max(8, px - 5)}px ${font}`; g.globalAlpha = 0.85; g.textAlign = 'right'; g.fillText(author.toUpperCase().slice(0, 14), CH / 2 - 22, 1);
          g.restore(); g.globalAlpha = 1;

          // The box, with its spine face mapped to this cell
          const geo = new THREE.BoxGeometry(b.sx, b.sy, b.sz), uv = geo.attributes.uv, d = [[0, 1], [-1, 0], [0, -1], [1, 0]][b.q];
          const fx = d[0], fz = -d[1], spine = Math.abs(fx) > 0.5 ? (fx > 0 ? 0 : 1) : (fz > 0 ? 4 : 5);
          const u0 = cx / SIZE, u1 = (cx + CW) / SIZE, v1 = 1 - cy / SH, v0 = 1 - (cy + CH) / SH;
          const flat = [(cx + CW / 2) / SIZE, 1 - (cy + 5) / SH], cream = [1 - 4 / SIZE, 4 / SH];
          for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
            const n = f * 4 + k, a = uv.getX(n), c = uv.getY(n);
            if (f === spine) b.lying ? uv.setXY(n, u0 + (u1 - u0) * c, v0 + (v1 - v0) * (1 - a)) : uv.setXY(n, u0 + (u1 - u0) * a, v0 + (v1 - v0) * c);
            else { const edge = b.lying ? (f !== 2 && f !== 3) : (f === 2 || f === 3 || f === (spine ^ 1)); uv.setXY(n, ...(edge ? cream : flat)); }
          }
          geo.translate(b.x, b.y, b.z);
          const z = zoneAt(b.x, b.y, b.z, 0.3); if (!geos.has(z)) geos.set(z, []); geos.get(z).push(geo);
        });
        g.fillStyle = '#e9e2d0'; g.fillRect(SIZE - 8, SH - 8, 8, 8);
      });
      const mat = new THREE.MeshStandardMaterial({ map: tex, color: 0xb4b0a8, roughness: 0.85, envMapIntensity: 0.1 });
      for (const [z, list] of geos) {        // one mesh per room, so shelves in rooms out of sight cost nothing
        const mesh = new THREE.Mesh(mergeGeometries(list), mat);
        mesh.castShadow = mesh.receiveShadow = true; mesh.userData.cat = 'books'; scene.add(mesh); track(mesh, z);
      }
    }
    onChange();
  })();

  // ---- Pictures, screens, rugs ------------------------------------------------------------
  // Drawn labels, signs and covers (the plain ones) are painted into one atlas per room and
  // finish and drawn as one mesh each, instead of a texture and a draw call apiece.
  let chalk = null;
  const sheets = new Map(), art = new Map();
  for (const e of extras) {
    let map, mesh;
    if (e.draw && !e.glow && vis) {
      const key = zoneAt(e.x, e.y, e.z, Math.max(e.w, e.h) / 2) + '|label|' + (e.rough ?? 0.7);
      if (!sheets.has(key)) sheets.set(key, []);
      const c = document.createElement('canvas'); c.width = e.cw; c.height = e.ch; e.draw(c.getContext('2d'), e.cw, e.ch);
      sheets.get(key).push({ e, c, w: e.w, h: e.h });
      continue;
    }
    if (e.rug && vis) {                       // rugs likewise, one sheet per room
      const key = zoneAt(e.x, e.y, e.z, Math.max(e.w, e.d) / 2) + '|rug|1';
      if (!sheets.has(key)) sheets.set(key, []);
      sheets.get(key).push({ e, c: rugTexture(e.rug, e.w, e.d).image, w: e.w, h: e.d, rug: true });
      continue;
    }
    if (e.file && !e.glow && vis) {           // and the paintings, once a room's have all arrived
      const zone = zoneAt(e.x, e.y, e.z, Math.max(e.w, e.h) / 2);
      if (!art.has(zone)) art.set(zone, []);
      art.get(zone).push(e);
      continue;
    }
    if (e.draw) {
      map = canvas(e.cw, e.ch, e.draw);
      const mat = new THREE.MeshStandardMaterial({ map, roughness: e.rough ?? 0.7, envMapIntensity: 0.15 });
      if (e.glow) { mat.emissiveMap = map; mat.emissive.set(0xffffff); mat.emissiveIntensity = e.glow; mat.color.set(0x111111); }
      mesh = new THREE.Mesh(signGeo(e), mat);
      orientSign(mesh, e);
    } else if (e.rug) {
      map = rugTexture(e.rug, e.w, e.d);
      mesh = new THREE.Mesh(new THREE.PlaneGeometry(e.w, e.d), new THREE.MeshStandardMaterial({ map, color: 0xb0aaa0, roughness: 1, envMapIntensity: 0.08 }));
      mesh.rotation.x = -Math.PI / 2; mesh.receiveShadow = true;
    } else {
      map = e.canvas ? canvas(e.canvas === 'chalk' ? 1300 : 900, e.canvas === 'chalk' ? 766 : e.canvas === 'imac' ? 680 : 540, DRAW[e.canvas]) : texLoader.load(`assets/art/${e.file}.jpg`, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; });
      if (!e.canvas) map.colorSpace = THREE.SRGBColorSpace;
      const mat = new THREE.MeshStandardMaterial({ map, roughness: e.canvas === 'chalk' ? 0.95 : 0.6, envMapIntensity: 0.15 });
      e.map = map;      // kept so that a screen can be redrawn (hands.js)
      if (e.glow && e.canvas !== 'chalk') { mat.emissiveMap = map; mat.emissive.set(0xffffff); mat.emissiveIntensity = e.glow; mat.color.set(0x111111); }
      mesh = new THREE.Mesh(new THREE.PlaneGeometry(e.w, e.h), mat);
      mesh.rotation.y = e.rotY;
    }
    mesh.position.set(e.x, e.y, e.z); mesh.userData.cat = e.rug ? 'rugs' : 'extras'; scene.add(mesh);
    track(mesh, zoneAt(e.x, e.y, e.z, Math.max(e.w ?? 0.5, e.h ?? 0, e.d ?? 0) / 2));
    if (e.canvas === 'chalk') {
      chalk = { mesh, tex: map, canvas: map.image, ctx: map.image.getContext('2d') };
      try { const saved = localStorage.getItem('chalkboard'); if (saved) { const img = new Image(); img.onload = () => { chalk.ctx.drawImage(img, 0, 0); map.needsUpdate = true; }; img.src = saved; } } catch { /* private window */ }
    }
  }

  // Shelf packing, tallest first, 3 px of margin; returns the sheets' meshes' geometry and texture
  function packSheet(list) {
    list.sort((a, b) => b.c.height - a.c.height);
    const area = list.reduce((a, it) => a + (it.c.width + 6) * (it.c.height + 6), 0);
    const SW = Math.max(...list.map(it => it.c.width + 6), Math.ceil(Math.sqrt(area * 1.1) / 4) * 4);
    let x = 0, y = 0, rowH = 0;
    for (const it of list) { const w = it.c.width + 6, h = it.c.height + 6; if (x + w > SW) { x = 0; y += rowH; rowH = 0; } it.px = x + 3; it.py = y + 3; x += w; rowH = Math.max(rowH, h); }
    const SH = Math.ceil((y + rowH) / 4) * 4;
    const tex = canvas(SW, SH, g => {
      for (const it of list) {               // each picture with its edge pixels smeared into the margin, so mipmaps do not bleed
        for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-1, -1], [1, 1], [-1, 1], [1, -1]]) g.drawImage(it.c, it.px + dx, it.py + dy);
        g.drawImage(it.c, it.px, it.py);
      }
    });
    const geos = list.map(({ e, c, px, py, w, h, rug }) => {
      const geo = rug ? new THREE.PlaneGeometry(w, h) : signGeo({ ...e, w, h }), uv = geo.attributes.uv, cw = c.width, ch = c.height;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (px + uv.getX(i) * cw) / SW, 1 - (py + (1 - uv.getY(i)) * ch) / SH);
      const o = new THREE.Object3D();
      if (rug) o.rotation.x = -Math.PI / 2;
      else orientSign(o, e);
      o.position.set(e.x, e.y, e.z); o.updateMatrix(); geo.applyMatrix4(o.matrix);
      return geo;
    });
    return { geo: mergeGeometries(geos), tex };
  }
  for (const [key, list] of sheets) {
    const [zone, kind, rough] = key.split('|');
    const { geo, tex } = packSheet(list);
    const mat = kind === 'rug' ? new THREE.MeshStandardMaterial({ map: tex, color: 0xb0aaa0, roughness: 1, envMapIntensity: 0.08 }) : new THREE.MeshStandardMaterial({ map: tex, roughness: Number(rough), envMapIntensity: 0.15, ...DECAL });
    const mesh = new THREE.Mesh(geo, mat); mesh.receiveShadow = kind === 'rug';
    mesh.userData.cat = kind === 'rug' ? 'rugs' : 'extras'; scene.add(mesh); track(mesh, zone);
    for (const it of list) if (it.rug) it.c.width = it.c.height = 0;      // the rugs' own canvases are no longer needed
    // A label whose picture arrives later (the family photographs, photos.js) is drawn again when it has
    const late = list.filter(it => !it.rug && it.e?.draw?.late);
    if (late.length) Promise.all(late.map(it => it.e.draw.late)).then(() => {
      const sg = tex.image.getContext('2d');
      for (const it of late) {
        const g = it.c.getContext('2d'); g.clearRect(0, 0, it.c.width, it.c.height); it.e.draw(g, it.c.width, it.c.height);
        for (const [dx, dy] of [[-2, 0], [2, 0], [0, -2], [0, 2], [0, 0]]) sg.drawImage(it.c, it.px + dx, it.py + dy);
      }
      tex.needsUpdate = true; onChange?.();
    }).catch(() => {});
  }
  // Paintings: one sheet per room (no taller than the GPU allows), made when its pictures have loaded
  // On the lighter tiers the pictures are held a little smaller (they are a quarter of all texture memory at full size)
  const artScale = quality.tex === 'half' ? 0.55 : quality.tex === 'detail' ? 0.72 : 1;
  const artSize = img => { if (artScale === 1) return img; const c = document.createElement('canvas'); c.width = Math.round(img.width * artScale); c.height = Math.round(img.height * artScale); const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, c.width, c.height); return c; };
  const imgLoader = new THREE.ImageLoader(lazy), maxTex = Math.min(8192, renderer.capabilities.maxTextureSize);
  for (const [zone, list] of art) {
    Promise.all(list.map(e => new Promise(ok => imgLoader.load(`assets/art/${e.file}.jpg`, img => ok({ e, c: artSize(img), w: e.w, h: e.h }), undefined, () => ok(null))))).then(items => {
      items = items.filter(Boolean);
      const groups = [[]]; let h = 0;
      for (const it of items.sort((a, b) => b.c.height - a.c.height)) { if (h + it.c.height > maxTex * 0.9 && groups.at(-1).length) { groups.push([]); h = 0; } groups.at(-1).push(it); h += it.c.height / 2; }
      for (const g of groups) {
        if (!g.length) continue;
        const { geo, tex } = packSheet(g);
        const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, color: 0xd6d1c8, roughness: 0.95, envMapIntensity: 0.15, ...DECAL }));      // matt, and a little under white, so pale drawings do not glare in afternoon light
        mesh.userData.cat = 'extras'; scene.add(mesh); track(mesh, zone);
      }
    });
  }

  // ---- Collected furniture -------------------------------------------------------------------
  // Each piece belongs to a zone (visibility.js) and is drawn only when its room can be
  // seen; within that, small things are shown only within a distance that grows with their
  // size. Pieces load nearest first, a few at a time, so the room you stand in fills first
  // and nothing waits on the far end of the garden. A model's meshes that share a material
  // are merged once, when it first loads, so a bed is a few draw calls rather than thirty.
  const cull = [];
  let cullClock = 0;
  animated.push((t, dt) => {
    if (!camera || (cullClock += dt) < 0.2) return; cullClock = 0;
    const p = camera.position;
    for (const c of cull) {
      const d = Math.hypot(c.x - p.x, c.z - p.z), reach = Math.max(c.outdoor ? 60 : 30, c.r * (c.outdoor ? 90 : 60)) * (quality.reach ?? 1);
      const otherFloor = !c.outdoor && Math.abs(c.y + 4 - p.y) > 7.5;
      c.near = d < reach && !(otherFloor && (d > 16 || c.r < 1.2));
    }
  });
  // Called every frame after the visibility pass
  const shows = z => (Array.isArray(z) ? z.some(vis.shows) : vis.shows(z));
  function cullModels(all = false) {
    for (const c of cull) c.o.visible = all || (c.near && (!vis || (vis.shows(c.zone) && vis.inView(c.zone, c.box))));
    const p = camera.position;
    for (const t of tracked) {
      let on = all || shows(t.zone);
      if (on && !all && typeof t.zone === 'string' && t.zone.endsWith(':small')) { t.box ??= new THREE.Box3().setFromObject(t.o); on = t.box.distanceToPoint(p) < SMALL_NEAR; }
      t.o.visible = on && (!t.test || t.test());
    }
    placeHandles();
  }
  const SMALL_NEAR = 34 * (quality.reach ?? 1);                 // clutter further off than this is not drawn

  const loader = new GLTFLoader(lazy), cache = new Map(), ready = new Map();
  const load = id => { if (!cache.has(id)) cache.set(id, new Promise((ok, bad) => loader.load(`assets/models/${id}/${id}.gltf`, g => ok(g.scene), undefined, bad))); return cache.get(id); };
  // One prepared copy per model (and per indoor/outdoor tuning): meshes merged by material.
  const prepared = (id, outdoor) => {
    const key = id + (outdoor ? '|out' : '|in');
    if (!ready.has(key)) ready.set(key, load(id).then(src => prepareModel(src, outdoor)));
    return ready.get(key);
  };
  const queue = models.map(m => ({ m, started: false }));
  let active = 0, left = queue.length;
  const MAXLOAD = 4;
  function pump() {
    while (active < MAXLOAD) {
      const p = camera.position; let best = null, score = Infinity;
      for (const q of queue) {
        if (q.started) continue;
        const m = q.m, d = Math.hypot(m.x - p.x, m.z - p.z) + Math.abs(m.y - p.y) * 3 + (m.outdoor ? 25 : 0);
        if (d < score) { score = d; best = q; }
      }
      if (!best) return;
      best.started = true; active++;
      place(best.m).catch(err => console.warn('could not load', best.m.id, err)).finally(() => {
        active--; left--; registerSeats();
        if (!left) onChange();
        pump();
      });
    }
  }
  async function place(m) {
    const { root, box: tb, big } = await prepared(m.id, !!m.outdoor);
    const o = root.clone(), s = FT * (m.scale ?? 1);
    o.scale.setScalar(s); o.rotation.y = m.rotY; o.position.set(m.x, 0, m.z); o.updateMatrixWorld(true);
    const box = tb.clone().applyMatrix4(o.matrixWorld);
    o.position.y = m.hang ? m.y : m.y - box.min.y;
    const c = box.getCenter(new THREE.Vector3()), r = box.getSize(new THREE.Vector3()).length() / 2;
    // Only furniture-sized pieces (and things outdoors) throw sunlight shadows; trinkets do not
    const shadow = !!m.outdoor || r > 1.6;
    o.traverse(n => { if (n.isMesh) { n.castShadow = shadow; n.receiveShadow = true; } });
    o.userData.cat = 'model:' + m.id;
    await renderer.compileAsync(o, camera, scene);      // its shaders are compiled before it is shown, so its arrival does not stall a frame
    scene.add(o);
    const lifted = box.clone().translate(new THREE.Vector3(0, o.position.y, 0));
    cull.push({ o, box: lifted, x: c.x, y: m.y, z: c.z, r, outdoor: !!m.outdoor, near: true, zone: vis ? vis.zoneOfBox(lifted, true, true) : '' });
    if (m.collide) colliders.push({ x0: box.min.x, x1: box.max.x, z0: box.min.z, z1: box.max.z, y0: m.y, y1: m.y + Math.min(4, box.max.y - box.min.y) });
    if (m.seat) seats.push({ x: m.x, y: m.y + m.seat + 2.45, z: m.z, yaw: m.rotY + Math.PI, label: 'sit' });
  }
  if (queue.length) pump(); else Promise.resolve().then(() => onChange());

  // ---- Doors: shut when you arrive, opened and closed by hand ------------------------------
  // Every door's copper handle is one instance of a single mesh, moved with its door each frame
  const handles = [];
  for (const d of [...doors, ...(items.hinged ?? [])]) {
    const g = new THREE.Group(); g.position.set(d.x, 0, d.z); g.rotation.y = d.closed; g.userData.cat = 'doors'; scene.add(g);
    if (vis) {                                         // a door belongs to the rooms (or garden) on both its sides
      const ym = (d.y0 + d.y1) / 2, zs = new Set();
      if (d.slab) zs.add(zoneAt(d.cx, ym, d.cz, Math.max(0.5, d.w / 2)));
      else for (const [dx, dz] of [[1.3, 0], [-1.3, 0], [0, 1.3], [0, -1.3]]) { const r = vis.roomAt(d.cx + dx, ym, d.cz + dz); zs.add(r ? r.id + ':door' : vis.inHouse(d.cx + dx, d.cz + dz, -0.5) ? null : vis.cellOf(d.cx + dx, d.cz + dz)); }
      zs.delete(null); track(g, [...zs]);
    }
    const groups = { fir: [], glass: [], copper: [] };
    const part = (s0, s1, ya, yb, th, mat) => {
      const w = s1 - s0, h = yb - ya, geo = new THREE.BoxGeometry(w, h, th), uv = geo.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.max(w, th), uv.getY(i) * h);
      if (mat === 'copper' && vis) { handles.push({ g, at: new THREE.Matrix4().makeTranslation((s0 + s1) / 2, (ya + yb) / 2, 0), size: [w, h, th] }); return; }   // drawn together, below
      geo.translate((s0 + s1) / 2, (ya + yb) / 2, 0); groups[mat].push(geo);
    };
    const { w, y0: h0, y1: h1 } = d, st = 0.38;
    if (d.slab) {                                    // a plain cupboard-style panel
      // panel and its raised inset share a material: one mesh
      const panel = new THREE.BoxGeometry(w - 0.02, h1 - h0, d.slab.th), raised = new THREE.BoxGeometry(Math.max(0.05, w - 0.5), Math.max(0.05, h1 - h0 - 0.5), d.slab.th + 0.02);
      const body = new THREE.Mesh(mergeGeometries([panel, raised]), materials.make(d.slab.mat)); body.position.set(w / 2, (h0 + h1) / 2, 0); body.castShadow = body.receiveShadow = true;
      const pull = new THREE.Mesh(new THREE.BoxGeometry(0.05, Math.min(0.5, (h1 - h0) * 0.3), 0.12), materials.make(d.slab.handle)); pull.position.set(w - 0.16, (h0 + h1) / 2, 0.06 * Math.sign(d.open - d.closed) * -1);
      g.add(body, pull);
      d.isOpen = false;
      interact.push({ x: d.cx, y: (h0 + h1) / 2, z: d.cz, reach: 5.5, label: () => `${d.isOpen ? 'close' : 'open'} the ${d.label}`, act: () => { d.isOpen = !d.isOpen; } });
      animated.push((t, dt) => { const aim = d.isOpen ? d.open : d.closed, cur = g.rotation.y; if (Math.abs(aim - cur) > 1e-3) g.rotation.y = cur + (aim - cur) * Math.min(1, dt * 6); });
      continue;
    }
    part(0, st, h0, h1, 0.15, 'fir'); part(w - st, w, h0, h1, 0.15, 'fir'); part(st, w - st, h1 - 0.42, h1, 0.15, 'fir');
    if (d.glassy) {
      part(st, w - st, h0, h0 + 0.85, 0.15, 'fir'); part(st, w - st, h0 + 0.85, h1 - 0.42, 0.02, 'glass');
      const gh = h1 - 0.42 - (h0 + 0.85), gw = w - 2 * st, cols = gw > 2 ? 3 : 2;
      for (let i = 1; i < 4; i++) part(st, w - st, h0 + 0.85 + (gh * i) / 4 - 0.03, h0 + 0.85 + (gh * i) / 4 + 0.03, 0.09, 'fir');
      for (let i = 1; i < cols; i++) part(st + (gw * i) / cols - 0.03, st + (gw * i) / cols + 0.03, h0 + 0.85, h1 - 0.42, 0.09, 'fir');
    } else {
      part(st, w - st, h0, h1 - 0.42, 0.08, 'fir'); part(st, w - st, h0, h0 + 0.7, 0.15, 'fir');
      const ph = (h1 - 0.42 - (h0 + 0.7)) / 5;
      for (let i = 1; i < 5; i++) part(st, w - st, h0 + 0.7 + ph * i - 0.14, h0 + 0.7 + ph * i + 0.14, 0.15, 'fir');
    }
    part(w - 0.32, w - 0.14, h0 + 2.95, h0 + 3.1, 0.36, 'copper');
    for (const [name, geos] of Object.entries(groups)) if (geos.length) {
      const m = new THREE.Mesh(mergeGeometries(geos), materials[name === 'fir' ? 'door' : name]);
      m.castShadow = name !== 'glass'; m.receiveShadow = true; if (name === 'glass') m.renderOrder = 2; g.add(m);
    }
    if (d.fixed) continue;
    // Inside the house the doors stand open; the doors to outdoors are shut until someone opens them.
    d.isOpen = !d.exterior; d.stop.off = d.isOpen; if (d.isOpen) g.rotation.y = d.open;
    interact.push({ x: d.cx, y: (h0 + h1) / 2, z: d.cz, reach: 7, label: () => (d.isOpen ? 'close the door' : 'open the door'), act: () => { d.isOpen = !d.isOpen; d.stop.off = d.isOpen; } });
    animated.push((t, dt) => { const aim = d.isOpen ? d.open : d.closed, cur = g.rotation.y; if (Math.abs(aim - cur) > 1e-3) g.rotation.y = cur + (aim - cur) * Math.min(1, dt * 5); });
  }

  let handleMesh = null;
  if (handles.length) {
    const [hw, hh, ht] = handles[0].size;
    handleMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(hw, hh, ht), materials.copper, handles.length);
    handleMesh.castShadow = handleMesh.receiveShadow = true; handleMesh.frustumCulled = false; handleMesh.userData.cat = 'doors'; scene.add(handleMesh);
  }
  const hm = new THREE.Matrix4();
  function placeHandles() {                 // the handles of the doors being drawn, where their doors are now
    if (!handleMesh) return;
    let n = 0;
    for (const h of handles) { if (!h.g.visible) continue; h.g.updateMatrix(); handleMesh.setMatrixAt(n++, hm.multiplyMatrices(h.g.matrix, h.at)); }
    handleMesh.count = n; handleMesh.instanceMatrix.needsUpdate = true;
  }

  // ---- Candles --------------------------------------------------------------------------------
  const saved = (() => { try { return JSON.parse(localStorage.getItem('candles') ?? '[]'); } catch { return []; } })();
  const flameGeo = new THREE.SphereGeometry(0.045, 10, 8); flameGeo.scale(1, 2.3, 1); flameGeo.translate(0, 0.09, 0);
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffc56a, toneMapped: false });
  candles.forEach((c, i) => {
    const flame = new THREE.Mesh(flameGeo, flameMat); flame.userData.cat = 'candles'; flame.position.set(c.x, c.y, c.z); if (c.big) flame.scale.setScalar(1.25); scene.add(flame);
    const lamp = { x: c.x, y: c.y + 0.25, z: c.z, power: 0, kind: 'candle' }; lamps.push(lamp);
    track(flame, zoneAt(c.x, c.y, c.z, 0.2), () => c.lit);
    const set = lit => { c.lit = lit; flame.visible = lit; lamp.power = lit ? 0.42 : 0; };
    set(saved.includes(i));
    interact.push({ x: c.x, y: c.y, z: c.z, reach: 6.5, label: () => (c.lit ? 'blow out the candle' : 'light the candle'), act: () => { set(!c.lit); try { localStorage.setItem('candles', JSON.stringify(candles.map((k, j) => (k.lit ? j : -1)).filter(j => j >= 0))); } catch { /* private window */ } } });
    animated.push(t => { if (c.lit) { const k = 1 + 0.12 * Math.sin(t * 11 + i) + 0.08 * Math.sin(t * 27 + i * 3); flame.scale.set(1, k, 1); flame.position.x = c.x + 0.004 * Math.sin(t * 7 + i); } });
  });

  // ---- The fire ---------------------------------------------------------------------------------
  const fire = lamps.find(l => l.kind === 'fire');
  if (fire) {
    const tex = canvas(64, 128, (g, w, h) => { const gr = g.createRadialGradient(w / 2, h * 0.78, 2, w / 2, h * 0.6, h * 0.62); gr.addColorStop(0, 'rgba(255,244,200,1)'); gr.addColorStop(0.35, 'rgba(255,170,60,.9)'); gr.addColorStop(0.75, 'rgba(220,70,20,.35)'); gr.addColorStop(1, 'rgba(120,20,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
    const hearth = new THREE.Group(); hearth.position.set(fire.x + 1.0, fire.y - 1.0, fire.z); scene.add(hearth); track(hearth, zoneAt(fire.x + 1.0, fire.y - 0.5, fire.z, 0.4));
    const logMat = new THREE.MeshStandardMaterial({ color: 0x2a1a12, roughness: 1 });
    for (const [dz, dy, rot] of [[-0.45, 0.14, 0.2], [0.4, 0.14, -0.25], [0, 0.42, 0.05]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 1.9, 8), logMat); l.rotation.set(Math.PI / 2, 0, 0); l.rotation.y = rot; l.position.set(0, dy, dz); hearth.add(l); }
    const tongues = [0, 1, 2, 3, 4].map(i => { const f = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.5), mat); f.position.set((i % 2) * 0.15, 0.95, -0.7 + i * 0.35); f.rotation.y = Math.PI / 2 + (i - 2) * 0.25; hearth.add(f); return f; });
    animated.push(t => tongues.forEach((f, i) => { const k = 0.8 + 0.25 * Math.sin(t * (7 + i) + i * 2) + 0.12 * Math.sin(t * 19 + i); f.scale.set(0.8 + 0.2 * Math.sin(t * 5 + i), k, 1); f.position.y = 0.25 + 0.72 * k; }));
  }

  // ---- Steam off a hot cup ----------------------------------------------------------------------
  {
    const tex = canvas(64, 64, (g, w) => { const gr = g.createRadialGradient(w / 2, w / 2, 1, w / 2, w / 2, w / 2); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, w); });
    // Every puff of every cup is one instance of a single camera-facing quad (as a sprite was)
    const N = steam.length * 4, geo = new THREE.InstancedBufferGeometry().copy(new THREE.PlaneGeometry(1, 1));
    const aPos = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3), aScale = new THREE.InstancedBufferAttribute(new Float32Array(N), 1), aAlpha = new THREE.InstancedBufferAttribute(new Float32Array(N), 1);
    geo.setAttribute('aPos', aPos); geo.setAttribute('aScale', aScale); geo.setAttribute('aAlpha', aAlpha); geo.instanceCount = 0;
    const puffs = new THREE.Mesh(geo, new THREE.ShaderMaterial({
      uniforms: { map: { value: tex } }, transparent: true, depthWrite: false,
      vertexShader: 'attribute vec3 aPos; attribute float aScale, aAlpha; varying vec2 vUv; varying float vA;\nvoid main() { vUv = uv; vA = aAlpha; vec4 mv = viewMatrix * vec4(aPos, 1.0); mv.xy += position.xy * aScale; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform sampler2D map; varying vec2 vUv; varying float vA;\nvoid main() { vec4 c = texture2D(map, vUv); gl_FragColor = vec4(c.rgb, c.a * vA);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}',
    }));
    puffs.frustumCulled = false; puffs.userData.cat = 'steam'; scene.add(puffs);
    const cups = steam.map(s => ({ s, zone: zoneAt(s.x, s.y, s.z, 0.2) }));
    animated.push(t => {
      let n = 0; const p = camera.position;
      for (const { s, zone } of cups) {
        if (vis && !(shows(zone) && Math.hypot(s.x - p.x, s.y - p.y, s.z - p.z) < SMALL_NEAR)) continue;
        for (let i = 0; i < 4; i++) {
          const u = (t * 0.32 + i / 4) % 1;
          aPos.setXYZ(n, s.x + 0.05 * Math.sin(t * 1.3 + i * 2), s.y + u * 0.95, s.z + 0.05 * Math.cos(t * 1.1 + i)); aScale.setX(n, 0.16 + u * 0.3); aAlpha.setX(n, 0.42 * Math.sin(Math.PI * u)); n++;
        }
      }
      geo.instanceCount = n; puffs.visible = n > 0; aPos.needsUpdate = aScale.needsUpdate = aAlpha.needsUpdate = true;
    });
  }

  // ---- Bees ----------------------------------------------------------------------------------------
  if (garden?.hives) {
    const geo = new THREE.BufferGeometry(), n = garden.hives.length * 14, pos = new Float32Array(n * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    outdoors.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x3a2a10, size: 0.14 })));
    animated.push(t => {
      for (let i = 0; i < n; i++) { const h = garden.hives[i % garden.hives.length], a = t * (1.1 + (i % 5) * 0.3) + i * 2.4, r = 0.8 + ((i * 7) % 10) * 0.35; pos[i * 3] = h.x + Math.cos(a) * r; pos[i * 3 + 1] = h.y + 0.6 + Math.sin(a * 1.7 + i) * 0.9 + (i % 4) * 0.4; pos[i * 3 + 2] = h.z + 1 + Math.sin(a) * r * 0.8; }
      geo.attributes.position.needsUpdate = true;
    });
  }

  // ---- Swings ----------------------------------------------------------------------------------------
  for (const [i, s] of (garden?.swings ?? []).entries()) {
    const g = new THREE.Group(); g.position.set(s.x, s.y, s.z); outdoors.add(g);
    const rope = new THREE.MeshStandardMaterial({ color: 0x9a8a6a, roughness: 1 }), wood = new THREE.MeshStandardMaterial({ color: 0x5a4636, roughness: 0.9 });
    for (const dz of [-0.85, 0.85]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, s.len, 6), rope); r.position.set(0, -s.len / 2, dz); g.add(r); }
    const board = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.12, 2.0), wood); board.position.y = -s.len; board.castShadow = true; g.add(board);
    animated.push(t => { g.rotation.z = 0.16 * Math.sin(t * 1.25 + i * 1.9); });
  }

  // ---- Sitting ---------------------------------------------------------------------------------------
  let seatsDone = 0;
  function registerSeats() {
    for (; seatsDone < seats.length; seatsDone++) { const s = seats[seatsDone]; interact.push({ x: s.x, y: s.y - 1.4, z: s.z, reach: 6, seat: s, label: () => s.label ?? 'sit' }); }
  }
  registerSeats();

  // What, if anything, is in front of you to use
  const fwd = new THREE.Vector3(), to = new THREE.Vector3();
  let lastAim = null;
  // Is there a wall (or a shut door) between the eye and the thing? Only tall obstacles count,
  // and not one the thing itself sits in or against, so furniture never hides its own prompt.
  function walled(eye, it) {
    const dx = it.x - eye.x, dy = it.y - eye.y, dz = it.z - eye.z;
    for (const c of colliders) {
      if (c.off || c.y1 - c.y0 < 5.5) continue;
      if (it.x > c.x0 - 0.45 && it.x < c.x1 + 0.45 && it.z > c.z0 - 0.45 && it.z < c.z1 + 0.45) continue;
      if (eye.x > c.x0 - 0.1 && eye.x < c.x1 + 0.1 && eye.z > c.z0 - 0.1 && eye.z < c.z1 + 0.1) continue;
      let t0 = 0, t1 = 0.97, hit = true;
      for (const [o, d, lo, hi] of [[eye.x, dx, c.x0, c.x1], [eye.z, dz, c.z0, c.z1], [eye.y, dy, c.y0, c.y1]]) {
        if (Math.abs(d) < 1e-6) { if (o < lo || o > hi) { hit = false; break; } continue; }
        let a = (lo - o) / d, b = (hi - o) / d; if (a > b) [a, b] = [b, a];
        t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) { hit = false; break; }
      }
      if (hit) return true;
    }
    return false;
  }
  function target(camera) {
    camera.getWorldDirection(fwd);
    // A thing is aimed at when the centre of the view is within its own width of it (so a near
    // thing is easy to catch and a far one must be looked at), the nearest to the centre wins,
    // and the one already held keeps a little advantage so the choice does not flutter.
    let best = null, least = Infinity;
    for (const it of interact) {
      to.set(it.x - camera.position.x, it.y - camera.position.y, it.z - camera.position.z);
      const d = to.length(); if (d > it.reach || d < 1e-3) continue;
      const ang = Math.acos(Math.max(-1, Math.min(1, to.multiplyScalar(1 / d).dot(fwd))));
      const size = it.size ?? (it.seat ? 1.9 : it.reach >= 7 ? 1.7 : 1.05);            // feet: seats, doors and other big things are wider targets
      const allow = Math.min(0.45, Math.atan(size / d) + 0.09);
      if (ang > allow) continue;
      const err = ang / allow + d * 0.012 - (it === lastAim ? 0.2 : 0);
      if (err < least && !walled(camera.position, it)) { least = err; best = it; }
    }
    lastAim = best;
    return best;
  }

  // Chalk: draw a stroke between two points given in the board's own 0..1 coordinates
  function chalkStroke(a, b) {
    const { ctx, canvas: c, tex } = chalk, x = u => u.x * c.width, y = u => (1 - u.y) * c.height;
    ctx.strokeStyle = 'rgba(241,239,230,.9)'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x(a), y(a)); ctx.lineTo(x(b), y(b)); ctx.stroke(); tex.needsUpdate = true;
  }
  function chalkWipe() {
    const { ctx, canvas: c, tex } = chalk; ctx.fillStyle = '#26302c'; ctx.fillRect(0, 0, c.width, c.height);
    for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(255,255,255,${0.012 + Math.random() * 0.02})`; ctx.beginPath(); ctx.ellipse(Math.random() * c.width, Math.random() * c.height, 80 + Math.random() * 240, 20 + Math.random() * 60, Math.random() * 3, 0, 7); ctx.fill(); }
    tex.needsUpdate = true; chalkSave();
  }
  function chalkSave() { try { localStorage.setItem('chalkboard', chalk.canvas.toDataURL('image/jpeg', 0.7)); } catch { /* too big or private */ } }

  return { update: (t, dt = 0.016) => { for (const f of animated) f(t, dt); }, cull: cullModels, track, zoneAt, pending: () => left, target, interact, animated, get chalk() { return chalk; }, chalkStroke, chalkWipe, chalkSave,
    // A fresh copy of a collected model, scaled to feet, for things that move (staff, pets)
    loadModel: async id => { const o = (await load(id)).clone(true); o.scale.setScalar(FT); o.traverse(n => { if (n.isMesh) n.castShadow = n.receiveShadow = true; }); return o; } };
}
