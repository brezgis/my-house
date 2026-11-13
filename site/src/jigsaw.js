// The jigsaw on the dining table: a real one. The pieces are cut with knobs and sockets (the cut
// arithmetic and the rules of play are in jigsaw_shapes.js), lie where they were left, and can be
// picked up, dragged and dropped; a piece let go near its true place, or near a true neighbour, clicks
// into it, and joined pieces move together. The box lid leans against the jug of roses, picture out.
//
// To play: look at it and press E. The view settles over the board and the mouse (or a finger) is
// free to move pieces. T sorts the loose pieces to the sides (edge pieces first), L shows the lid, P
// chooses the picture and the size, N starts again, Esc (or E, or a step) stands you up. Progress is
// kept in this browser per picture and size.
//
// Cost: the pieces and the lid are one mesh with one material (one draw call), textured with the one
// picture in use, held at 1024 x 768 on the graphics card (about 4 MB with its mipmaps). The picture is
// fetched only when you first come near the dining room or sit down to it. Nothing runs per frame
// unless you are playing (or the finishing flourish is playing). A soft shadow under the piece in your
// hand is a second, small mesh, drawn only while you hold one.
//
// For guests (friends.js): JIGSAW is the board's middle and size in world feet, and where to stand.
// Test hooks: ?toy=jigsaw, ?toy=jigsaw:solve-N, :done, :drag, :snap, :sort, :choose, :lid;
// &jpic=<picture id or 0-3>&jsize=24|54|96 choose; &jfresh ignores what was saved.

import * as THREE from 'three';
import { F1 } from './house.js';
import { wx, wz } from './builder.js';
import { PLACE, REGION, BOARD_UV, SIZES, gridFor, makeCuts, outlines, Puzzle, hash } from './jigsaw_shapes.js';

export const PICTURES = [
  { id: 'ronner_kittens_basket', title: 'Playing Kittens', by: 'Henriëtte Ronner-Knip, about 1890', where: 'Museum Boijmans Van Beuningen, Rotterdam' },
  { id: 'ronner_cat_at_play', title: 'Cat at Play', by: 'Henriëtte Ronner-Knip, about 1860–78', where: 'Rijksmuseum, Amsterdam' },
  { id: 'ronner_cat_with_kittens', title: 'Cat with Kittens', by: 'Henriëtte Knip, 1844', where: 'Rijksmuseum, Amsterdam' },
  { id: 'ronner_infatigables', title: 'Infatigables', by: 'Henriëtte Ronner-Knip, 1895', where: 'RISD Museum, Providence' },
];

// ---- Where it is, in world feet ---------------------------------------------------------------------
const tw = (x, y) => [wx(PLACE.table.X + x), wz(PLACE.table.Y + y)];
const TOP = F1 + PLACE.z;                                       // the table top (its runner), world height
const [BX, BZ] = tw(PLACE.cx, PLACE.cy);
export const JIGSAW = {
  x: BX, y: TOP + PLACE.bz, z: BZ,                              // the middle of the board's top
  w: PLACE.bw, d: PLACE.bd,                                     // its size along world x and world z
  picture: { w: PLACE.W, d: PLACE.H },                          // the picture's size on it
  stand: (() => { const [x, z] = tw(PLACE.cx, PLACE.cy + PLACE.bd / 2 + 1.0); return { x, z, face: Math.PI }; })(),   // the side to lean over it from (facing +z: yaw PI)
  lid: (() => { const [x, z] = tw(PLACE.lid.x, PLACE.lid.y); return { x, y: TOP, z }; })(),
};

const Q = new URLSearchParams(location.search), TOY = Q.get('toy') ?? '';
const T = 0.0065;                     // card thickness (2 mm)
const BEVEL = 0.0042, DROP = 0.0016;  // the rounded top edge of the card
const LIFT = 0.09;                    // a piece in the hand
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private window */ } };
const keyOf = (pic, size) => `jigsaw:${pic}:${size}`;

// ---- The geometry: every piece (a card with a bevelled top edge) and the lid, one buffer ------------
function buildGeometry(P, outl) {
  const { W, H } = PLACE, pos = [], nor = [], uv = [], col = [], idx = [], ranges = [];
  const tmp = new THREE.Vector3(), ab = new THREE.Vector3(), ac = new THREE.Vector3();
  const vert = (x, y, z, nx, ny, nz, u, v, c) => { pos.push(x, y, z); nor.push(nx, ny, nz); uv.push(u, v); col.push(c, c, c); return pos.length / 3 - 1; };
  const UV = (u, v) => [Math.min(1, Math.max(0, u / W)), Math.min(1, Math.max(0, 1 - v / H))];
  // a triangle, wound so that its face looks along `want`
  const tri = (a, b, c, want) => {
    ab.set(pos[b * 3] - pos[a * 3], pos[b * 3 + 1] - pos[a * 3 + 1], pos[b * 3 + 2] - pos[a * 3 + 2]);
    ac.set(pos[c * 3] - pos[a * 3], pos[c * 3 + 1] - pos[a * 3 + 1], pos[c * 3 + 2] - pos[a * 3 + 2]);
    tmp.crossVectors(ab, ac); if (tmp.dot(want) >= 0) idx.push(a, b, c); else idx.push(a, c, b);
  };
  const want = new THREE.Vector3();
  for (let i = 0; i < P.n; i++) {
    const pts = outl[i], n = pts.length / 2, start = pos.length / 3;
    let area = 0; for (let k = 0; k < n; k++) { const j = (k + 1) % n; area += pts[k * 2] * pts[j * 2 + 1] - pts[j * 2] * pts[k * 2 + 1]; }
    const s = area > 0 ? 1 : -1;
    // outward normals at each point, and the point moved in by the bevel
    const N = [], I = [];
    for (let k = 0; k < n; k++) {
      const a = (k + n - 1) % n, b = (k + 1) % n;
      const e1x = pts[k * 2] - pts[a * 2], e1y = pts[k * 2 + 1] - pts[a * 2 + 1], e2x = pts[b * 2] - pts[k * 2], e2y = pts[b * 2 + 1] - pts[k * 2 + 1];
      const l1 = Math.hypot(e1x, e1y) || 1, l2 = Math.hypot(e2x, e2y) || 1;
      const n1x = s * e1y / l1, n1y = -s * e1x / l1, n2x = s * e2y / l2, n2y = -s * e2x / l2;
      let nx = n1x + n2x, ny = n1y + n2y; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      const miter = Math.min(2, 1 / Math.max(0.5, nx * n1x + ny * n1y));
      N.push([nx, ny]); I.push([pts[k * 2] - nx * BEVEL * miter, pts[k * 2 + 1] - ny * BEVEL * miter]);
    }
    // top face
    const top = I.map(([u, v]) => vert(u, T, v, 0, 1, 0, ...UV(u, v), 1));
    const tris = THREE.ShapeUtils.triangulateShape(I.map(([u, v]) => new THREE.Vector2(u, v)), []);
    want.set(0, 1, 0); for (const [a, b, c] of tris) tri(top[a], top[b], top[c], want);
    // the bevel, then the cut side
    const bi = [], bo = [], wt = [], wb = [];
    for (let k = 0; k < n; k++) {
      const [nx, ny] = N[k], u = pts[k * 2], v = pts[k * 2 + 1], bl = Math.hypot(0.75, 0.66);
      bi.push(vert(I[k][0], T, I[k][1], nx * 0.5 / bl * 1.2, 0.66 / bl * 1.2, ny * 0.5 / bl * 1.2, ...UV(I[k][0], I[k][1]), 0.97));
      bo.push(vert(u, T - DROP, v, nx * 0.75 / bl, 0.66 / bl, ny * 0.75 / bl, ...UV(u, v), 0.86));
      wt.push(vert(u, T - DROP, v, nx, 0, ny, ...UV(u, v), 0.5));
      wb.push(vert(u, 0, v, nx, 0, ny, ...UV(u, v), 0.36));
    }
    for (let k = 0; k < n; k++) {
      const j = (k + 1) % n, mx = (N[k][0] + N[j][0]) / 2, my = (N[k][1] + N[j][1]) / 2;
      want.set(mx, 0.9, my); tri(bi[k], bo[k], bo[j], want); tri(bi[k], bo[j], bi[j], want);
      want.set(mx, 0, my); tri(wt[k], wb[k], wb[j], want); tri(wt[k], wb[j], wt[j], want);
    }
    ranges.push([start, pos.length / 3]);
  }
  const pieceVerts = pos.length / 3;

  // The lid: the picture on top, wrapping over the rim, the inside plain card in shadow. Built lying
  // face up round its foot edge, then stood on that edge and leaned back against the jug.
  const L = PLACE.lid, [lu, lv] = (() => { const u = PLACE.W / 2 + (PLACE.cx - L.x), v = PLACE.H / 2 + (L.y - PLACE.cy); return [u, v]; })();
  const m = new THREE.Matrix4().makeTranslation(lu, 0, lv)
    .multiply(new THREE.Matrix4().makeRotationY(L.turn)).multiply(new THREE.Matrix4().makeRotationX(L.lean))
    .multiply(new THREE.Matrix4().makeTranslation(0, L.rim, -L.h / 2));
  const nm = new THREE.Matrix3().getNormalMatrix(m), p = new THREE.Vector3(), q = new THREE.Vector3();
  const lidVert = (x, y, z, nx, ny, nz, u, v, c) => { p.set(x, y, z).applyMatrix4(m); q.set(nx, ny, nz).applyMatrix3(nm).normalize(); return vert(p.x, p.y, p.z, q.x, q.y, q.z, u, v, c); };
  const lidQuad = (a, b, c, d, nrm) => { want.set(...nrm).applyMatrix3(nm); tri(a, b, c, want); tri(a, c, d, want); };
  const w2 = L.w / 2, h2 = L.h / 2, R = L.rim, band = 0.035, inset = 0.008, dark = [0.05, 0.5];
  const fu = x => x / L.w + 0.5, fv = z => 1 - (z / L.h + 0.5);
  { const a = lidVert(-w2, 0, -h2, 0, 1, 0, fu(-w2), fv(-h2), 1), b = lidVert(w2, 0, -h2, 0, 1, 0, fu(w2), fv(-h2), 1), c = lidVert(w2, 0, h2, 0, 1, 0, fu(w2), fv(h2), 1), d = lidVert(-w2, 0, h2, 0, 1, 0, fu(-w2), fv(h2), 1); lidQuad(a, b, c, d, [0, 1, 0]); }
  // the four sides of the rim, the picture's edge carried round
  const side = (x0, z0, x1, z1, nx, nz, uvA, uvB, uvA2, uvB2) => {
    const a = lidVert(x0, 0, z0, nx, 0, nz, ...uvA, 0.9), b = lidVert(x1, 0, z1, nx, 0, nz, ...uvB, 0.9), c = lidVert(x1, -R, z1, nx, 0, nz, ...uvB2, 0.8), d = lidVert(x0, -R, z0, nx, 0, nz, ...uvA2, 0.8);
    lidQuad(a, b, c, d, [nx, 0, nz]);
    // and its inside face, plain card
    const e = lidVert(x0 - nx * inset, 0, z0 - nz * inset, -nx, 0, -nz, ...dark, 0.3), f = lidVert(x1 - nx * inset, 0, z1 - nz * inset, -nx, 0, -nz, ...dark, 0.3), g = lidVert(x1 - nx * inset, -R, z1 - nz * inset, -nx, 0, -nz, ...dark, 0.24), h = lidVert(x0 - nx * inset, -R, z0 - nz * inset, -nx, 0, -nz, ...dark, 0.24);
    lidQuad(e, f, g, h, [-nx, 0, -nz]);
    // the rim's cut edge
    const i1 = lidVert(x0, -R, z0, 0, -1, 0, ...dark, 0.5), i2 = lidVert(x1, -R, z1, 0, -1, 0, ...dark, 0.5), i3 = lidVert(x1 - nx * inset, -R, z1 - nz * inset, 0, -1, 0, ...dark, 0.5), i4 = lidVert(x0 - nx * inset, -R, z0 - nz * inset, 0, -1, 0, ...dark, 0.5);
    lidQuad(i1, i2, i3, i4, [0, -1, 0]);
  };
  side(-w2, h2, w2, h2, 0, 1, [0, 0], [1, 0], [0, band], [1, band]);              // the foot (the picture's bottom edge)
  side(w2, -h2, -w2, -h2, 0, -1, [1, 1], [0, 1], [1, 1 - band], [0, 1 - band]);   // the head
  side(w2, h2, w2, -h2, 1, 0, [1, 0], [1, 1], [1 - band * 0.75, 0], [1 - band * 0.75, 1]);
  side(-w2, -h2, -w2, h2, -1, 0, [0, 1], [0, 0], [band * 0.75, 1], [band * 0.75, 0]);
  // underneath the lid's top: plain card
  { const y = -0.004, a = lidVert(-w2 + inset, y, -h2 + inset, 0, -1, 0, ...dark, 0.28), b = lidVert(w2 - inset, y, -h2 + inset, 0, -1, 0, ...dark, 0.28), c = lidVert(w2 - inset, y, h2 - inset, 0, -1, 0, ...dark, 0.2), d = lidVert(-w2 + inset, y, h2 - inset, 0, -1, 0, ...dark, 0.2); lidQuad(a, b, c, d, [0, -1, 0]); }

  const geo = new THREE.BufferGeometry();
  const pa = new Float32Array(pos);
  geo.setAttribute('position', new THREE.BufferAttribute(pa, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(pos.length / 3 > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(PLACE.W / 2 - 0.3, 0.3, PLACE.H / 2), 2.6);
  geo.boundingBox = new THREE.Box3(new THREE.Vector3(REGION.u0 - 1.4, 0, REGION.v0 - 0.5), new THREE.Vector3(REGION.u1, 0.8, REGION.v1));
  return { geo, base: pa.slice(0, pieceVerts * 3), ranges };
}

// ---- The picture: fetched when wanted, held at 1024 x 768 ---------------------------------------------
const TEX_W = 1024, TEX_H = 768;
function loadPicture(id) {
  return new Promise((ok, bad) => {
    const img = new Image(); img.decoding = 'async';
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = TEX_W; c.height = TEX_H;
      const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(img, 0, 0, TEX_W, TEX_H);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; ok(t);
    };
    img.onerror = bad; img.src = `assets/art/puzzles/${id}.jpg`;
  });
}

// ---- Looks: the little bar of buttons, the chooser, the lid held up ---------------------------------
const CSS = `
#jig-bar { position: fixed; z-index: 7; left: 50%; bottom: 14px; transform: translateX(-50%); display: none; gap: 6px; flex-wrap: wrap; justify-content: center; max-width: calc(100vw - 32px); }
#jig-bar.on { display: flex; }
#jig-bar button, .jig-card button { font-family: var(--serif); font-size: 15px; padding: 6px 12px 7px; border-radius: 2px; border: 0; cursor: pointer; color: var(--ink);
  background: var(--grain), var(--paper); box-shadow: 0 1px 0 rgba(255, 255, 255, .45) inset, 0 4px 12px -3px rgba(20, 12, 6, .55); }
#jig-bar button:hover, .jig-card button:hover { background: var(--grain), #f7eedb; }
#jig-bar button:focus-visible, .jig-card button:focus-visible { outline: 2px solid var(--verdigris); outline-offset: 2px; }
.jig-sheet { position: fixed; inset: 0; z-index: 30; display: none; place-items: center; padding: 16px; background: rgba(22, 15, 10, .45); }
.jig-sheet.on { display: grid; }
.jig-card { box-sizing: border-box; width: min(760px, 100%); max-height: 88vh; max-height: 88dvh; overflow: auto; padding: 20px 22px 18px; color: var(--ink); font-family: var(--serif);
  background: var(--grain), var(--paper); border-radius: 2px; box-shadow: var(--lift); }
.jig-card h2 { margin: 0 0 12px; font-weight: 400; font-size: 26px; }
.jig-pics { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
.jig-pic { display: block; text-align: left; padding: 6px !important; background: rgba(255, 255, 255, .35) !important; box-shadow: none !important; outline: 1.5px solid transparent; }
.jig-pic.on { outline-color: var(--teak); background: rgba(255, 255, 255, .7) !important; }
.jig-pic img { display: block; width: 100%; aspect-ratio: 4 / 3; object-fit: cover; border-radius: 1px; background: #8a7a64; }
.jig-pic b { display: block; font-weight: 400; font-size: 16px; margin-top: 5px; }
.jig-pic i { display: block; font-size: 13px; color: var(--teak); }
.jig-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-top: 14px; }
.jig-row .on { outline: 1.5px solid var(--teak); }
.jig-row small { color: var(--teak); font-size: 13px; }
.jig-lid { display: grid; gap: 8px; justify-items: center; color: var(--cream); font-family: var(--serif); text-align: center; text-shadow: 0 1px 3px rgba(0, 0, 0, .7); }
.jig-lid img { max-width: min(92vw, 1100px); max-height: 74vh; max-height: 74dvh; border: 10px solid #f2ead8; box-shadow: var(--lift); }
`;
const el = (tag, attrs = {}, html = '') => { const e = document.createElement(tag); for (const k in attrs) e.setAttribute(k, attrs[k]); e.innerHTML = html; return e; };

export function setupJigsaw(ctx, modes, hold) {
  const { W, H } = PLACE;
  const touch = 'ontouchstart' in window;
  // ---- State: which picture and size, and the pieces ----
  let choice = load('jigsaw', null);
  if (!choice || !PICTURES.some(p => p.id === choice.pic) || !SIZES.includes(choice.size)) choice = { pic: PICTURES[0].id, size: 96 };
  if (Q.has('jpic')) { const v = Q.get('jpic'), p = PICTURES[Number(v)] ?? PICTURES.find(p => p.id === v); if (p) choice.pic = p.id; }
  if (Q.has('jsize') && SIZES.includes(Number(Q.get('jsize')))) choice.size = Number(Q.get('jsize'));
  const fresh = Q.has('jfresh');
  let P, outl, G, layoutDirty = true;
  function setUp(pic, size, isNew) {
    const { cols, rows } = gridFor(size, W / H);
    P = new Puzzle(cols, rows, W, H);
    outl = outlines(cols, rows, P.cw, P.ch, makeCuts(cols, rows, hash(pic + ':' + size)));
    const saved = fresh ? null : load(keyOf(pic, size), null);
    if (!P.restore(saved)) {
      if (pic === PICTURES[0].id && size === 96 && !isNew) P.begin(REGION, hash(pic) % 100000);      // the one the house came with: a third done
      else P.scatter(REGION, (hash(pic + size) + Date.now()) % 100000);
    }
    G?.geo.dispose();
    G = buildGeometry(P, outl);
    if (mesh) mesh.geometry = G.geo;
    layoutDirty = true;
  }
  const remember = () => { save(keyOf(choice.pic, choice.size), P.save()); save('jigsaw', choice); };

  // ---- In the room ----
  const root = new THREE.Group(); root.name = 'jigsaw';
  root.position.set(BX, TOP, BZ); root.rotation.y = Math.PI;         // root x = the picture's right (world -x), root z = down the picture (world -z)
  const material = new THREE.MeshStandardMaterial({ color: 0xdcd7ce, roughness: 0.86, metalness: 0, envMapIntensity: 0.1, vertexColors: true });
  let mesh = null;
  setUp(choice.pic, choice.size, false);
  mesh = new THREE.Mesh(G.geo, material); mesh.position.set(-W / 2, 0, -H / 2); mesh.receiveShadow = true; mesh.castShadow = false; mesh.userData.cat = 'extras';
  root.add(mesh);
  // a soft shadow under a piece in the hand
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.34, depthWrite: false, toneMapped: false });
  const shadow = new THREE.Mesh(new THREE.BufferGeometry(), shadowMat); shadow.visible = false; shadow.renderOrder = 2; root.add(shadow);
  ctx.scene.add(root);
  let loaded = false, loading = null, texId = null;
  ctx.track?.(root, ctx.zoneAt?.(BX, TOP + 0.4, BZ, 1.6), () => loaded);
  root.visible = false;

  function ensurePicture() {
    if (texId === choice.pic && (loaded || loading)) return loading ?? Promise.resolve();
    const id = choice.pic; texId = id;
    loading = loadPicture(id).then(async t => {
      if (texId !== id) { t.dispose(); return; }
      const old = material.map; material.map = t; if (!old) material.needsUpdate = true; old?.dispose();
      if (!loaded) {          // made ready off the main thread where the browser can, so the first sight of it does not stall
        const was = root.visible; root.visible = true;
        try { await ctx.renderer.compileAsync?.(root, ctx.camera, ctx.scene); } catch { /* compiled on first draw instead */ }
        root.visible = was;
      }
      loaded = true; loading = null; layoutDirty = true;
    }).catch(e => { console.warn('jigsaw picture', e); loading = null; texId = null; });
    return loading;
  }

  // ---- Writing the pieces where the state says ----
  let dragG = -1, lift = 0, hop = null;
  const centreOnBoard = new Map();
  function layout() {
    const pa = G.geo.attributes.position.array, base = G.base;
    centreOnBoard.clear();
    for (const [g, m] of P.groups()) {
      let u = 0, v = 0; for (const q of m) { u += q.x + P.cw / 2; v += q.y + P.ch / 2; } u /= m.length; v /= m.length;
      centreOnBoard.set(g, u > BOARD_UV.u0 && u < BOARD_UV.u1 && v > BOARD_UV.v0 && v < BOARD_UV.v1);
    }
    for (const q of P.p) {
      const [s, e] = G.ranges[q.i], dx = q.x - P.hx(q.i), dz = q.y - P.hy(q.i);
      const y = (centreOnBoard.get(q.g) ? PLACE.bz : 0) + 0.0007 + q.layer * (T + 0.0006) + (q.g === dragG ? lift : 0) + (hop ? hop[q.i] : 0);
      for (let k = s * 3; k < e * 3; k += 3) { pa[k] = base[k] + dx; pa[k + 1] = base[k + 1] + y; pa[k + 2] = base[k + 2] + dz; }
    }
    G.geo.attributes.position.needsUpdate = true;
    if (dragG >= 0) { const a = P.p[dragG]; shadow.position.set(-W / 2 + a.x - P.hx(a.i) + 0.022, (centreOnBoard.get(dragG) ? PLACE.bz : 0) + 0.0012 + a.layer * (T + 0.0006), -H / 2 + a.y - P.hy(a.i) + 0.034); }
    layoutDirty = false;
  }
  function makeShadow(g) {
    const pts = [];
    for (const q of P.members(g)) {
      const o = outl[q.i], tris = THREE.ShapeUtils.triangulateShape(Array.from({ length: o.length / 2 }, (_, k) => new THREE.Vector2(o[k * 2], o[k * 2 + 1])), []);
      for (const [a, b, c] of tris) for (const k of [a, c, b]) pts.push(o[k * 2], 0, o[k * 2 + 1]);
    }
    shadow.geometry.dispose(); shadow.geometry = new THREE.BufferGeometry(); shadow.geometry.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    shadow.material.side = THREE.DoubleSide; shadow.visible = true;
  }

  // ---- Where the pointer is on the board ----
  const canvas = ctx.renderer.domElement, ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), hit = new THREE.Vector3();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -(TOP + PLACE.bz + T));
  function boardAt(e) {
    const r = canvas.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, ctx.camera); if (!ray.ray.intersectPlane(plane, hit)) return null;
    const l = root.worldToLocal(hit.clone()); return [l.x + W / 2, l.z + H / 2, hit.clone()];
  }

  // ---- The seat: a comfortable look down at the board from the west side ----
  const [sx, sz] = tw(PLACE.cx, PLACE.cy + 1.12);
  const seat0 = { x: sx, y: TOP + 2.3, z: sz, yaw: Math.PI, label: 'jigsaw' };
  const seat = { ...seat0 };
  const PITCH = -1.22;
  const note = t => window.houseUI?.toast?.(t);
  const click = () => { ctx.sound?.note?.(93, 0, 0.07, 0.035); ctx.sound?.note?.(88, 0.012, 0.09, 0.03); };

  // ---- Playing ----
  let drag = null, sheet = null, lidSheet = null, bar = null, againAt = 0, finished = P.solved();
  const mode = {
    active: false,
    click: () => false,                                 // E stands you up (main.js)
    hint() {
      if (sheet?.classList.contains('on')) return 'choose a picture and a size';
      if (finished) return `finished: all ${P.n} pieces · P for another picture or size · Esc to stand`;
      if (drag) return 'let go near where it belongs';
      return touch ? `${P.placed()} of ${P.n} in place · drag a piece with your finger` : `${P.placed()} of ${P.n} in place · drag pieces · T sorts · L the lid · P pictures · Esc to stand`;
    },
    leave() {
      if (drag) letGo();
      bar?.classList.remove('on'); sheet?.classList.remove('on'); lidSheet?.classList.remove('on');
      canvas.style.cursor = ''; Object.assign(seat, seat0);
    },
  };
  modes.push(mode);
  function sit() {
    ensurePicture();
    Object.assign(seat, seat0);
    hold(mode, seat, PITCH);
    document.exitPointerLock?.(); ctx.walker.keys?.clear?.();
    makeBar(); bar.classList.add('on');
  }
  ctx.interact.push({ x: BX, y: TOP + 0.35, z: BZ, reach: 6.5, size: 1.5, label: () => 'do the jigsaw', act: sit });

  function grab(e) {
    const at = boardAt(e); if (!at) return;
    const i = P.pick(at[0], at[1], outl); if (i < 0) return;
    const g = P.p[i].g;
    drag = { g, u: at[0], v: at[1], id: e.pointerId }; dragG = g; makeShadow(g);
    canvas.setPointerCapture?.(e.pointerId); canvas.style.cursor = 'grabbing'; layoutDirty = true;
  }
  function move(e) {
    const at = boardAt(e); if (!at) return;
    if (!drag) { canvas.style.cursor = P.pick(at[0], at[1], outl) >= 0 ? 'grab' : ''; return; }
    P.shift(drag.g, at[0] - drag.u, at[1] - drag.v); drag.u = at[0]; drag.v = at[1];
    P.clamp(drag.g, REGION); layoutDirty = true;
  }
  function letGo() {
    if (!drag) return;
    const g = drag.g; drag = null; dragG = -1; lift = 0; shadow.visible = false;
    P.clamp(g, REGION);
    const r = P.drop(g);
    if (r.joined || r.home) click();
    layoutDirty = true; canvas.style.cursor = '';
    remember();
    if (r.solved && !finished) flourish();
  }
  // The mouse and fingers belong to the puzzle while you sit at it: nothing reaches the walker
  const mine = e => mode.active && e.target === canvas;
  addEventListener('pointerdown', e => { if (!mine(e) || (e.button ?? 0) !== 0) return; e.stopPropagation(); e.preventDefault(); grab(e); }, { capture: true, passive: false });
  addEventListener('pointermove', e => { if (!mode.active || (e.target !== canvas && !drag)) return; move(e); }, { capture: true });
  addEventListener('pointerup', e => { if (!mode.active) return; if (drag) { move(e); letGo(); } }, { capture: true });
  addEventListener('pointercancel', () => { if (drag) letGo(); }, { capture: true });
  for (const t of ['mousedown', 'mouseup', 'click', 'dblclick', 'touchstart', 'touchmove', 'touchend', 'contextmenu'])
    addEventListener(t, e => { if (!mine(e)) return; e.stopPropagation(); if (t !== 'mouseup' && t !== 'touchend') e.preventDefault(); }, { capture: true, passive: false });
  // the wheel leans you in towards the pointer, and back
  addEventListener('wheel', e => {
    if (!mode.active) return;
    const at = boardAt(e);
    if (e.deltaY < 0 && at) {
      const p = at[2], k = 0.16; const nx = seat.x + (p.x - seat.x) * k, ny = seat.y + (p.y - seat.y) * k, nz = seat.z + (p.z - seat.z) * k;
      if (ny - (TOP + PLACE.bz) > 0.75) Object.assign(seat, { x: nx, y: ny, z: nz });
    } else if (e.deltaY > 0) { for (const k of ['x', 'y', 'z']) seat[k] += (seat0[k] - seat[k]) * 0.4; }
  }, { passive: true });
  addEventListener('keydown', e => {
    if (!mode.active || e.repeat) return;
    if (e.code === 'Escape') {
      if (sheet?.classList.contains('on')) sheet.classList.remove('on');
      else if (lidSheet?.classList.contains('on')) lidSheet.classList.remove('on');
      else ctx.walker.seated = null;
      e.preventDefault(); return;
    }
    if (sheet?.classList.contains('on')) return;
    if (e.code === 'KeyT') sortOut();
    if (e.code === 'KeyL') showLid(!lidSheet?.classList.contains('on'));
    if (e.code === 'KeyP') choose(true);
    if (e.code === 'KeyN') startAgain();
  });

  function sortOut() { P.tidy(REGION); layoutDirty = true; remember(); note(`The loose pieces are sorted to the sides, edge pieces first.`); }
  function startAgain() {
    if (performance.now() - againAt > 4000) { againAt = performance.now(); note('Press N again to break it up and start again.'); return; }
    againAt = 0; P.scatter(REGION, (Date.now() % 100000) + 1); finished = false; hop = null; layoutDirty = true; remember(); note('All the pieces are out on the table again.');
  }
  function switchTo(pic, size) {
    if (pic === choice.pic && size === choice.size) return;
    remember();
    choice = { pic, size }; finished = false; hop = null;
    setUp(pic, size, true); finished = P.solved(); remember();
    if (texId !== pic) ensurePicture();
    const p = PICTURES.find(p => p.id === pic); note(`${p.title}, ${P.n} pieces${P.placed() ? `: ${P.placed()} already in place` : ''}.`);
  }

  // ---- The finishing flourish: a little wave through the pieces and three notes ----
  let flourishT = -1;
  function flourish() {
    finished = true; flourishT = 0; hop = new Float32Array(P.n);
    const p = PICTURES.find(p => p.id === choice.pic);
    note(`Finished! ${p.title}, all ${P.n} pieces, done.`);
    const s = ctx.sound; if (s?.note) { s.note(72, 0, 1.4, 0.07); s.note(76, 0.14, 1.3, 0.07); s.note(79, 0.28, 1.3, 0.07); s.note(84, 0.46, 2.2, 0.08); }
  }

  ctx.animated.push((t, dt) => {
    if (!loaded && !loading) {       // fetch the picture when you first come near the dining room
      const c = ctx.camera.position;
      if (Math.abs(c.y - TOP) < 7 && Math.hypot(c.x - BX, c.z - BZ) < 26) ensurePicture();
    }
    if (drag) { const l = lift; lift += (LIFT - lift) * Math.min(1, dt * 14); if (Math.abs(lift - l) > 1e-5) layoutDirty = true; }
    if (flourishT >= 0) {
      flourishT += dt;
      for (const q of P.p) { const d = Math.hypot(q.c - P.cols / 2, q.r - P.rows / 2) * 0.09, k = (flourishT - d) / 0.42; hop[q.i] = k > 0 && k < 1 ? Math.sin(k * Math.PI) * 0.03 : 0; }
      if (flourishT > 2.2) { flourishT = -1; hop = null; }
      layoutDirty = true;
    }
    if (layoutDirty && G) layout();
  });

  // ---- The bar, the chooser, the lid ----
  function makeBar() {
    if (bar) return;
    document.head.appendChild(el('style', {}, CSS));
    bar = el('div', { id: 'jig-bar' });
    const b = (label, f) => { const x = el('button', { type: 'button' }, label); x.addEventListener('click', e => { e.preventDefault(); f(); x.blur(); }); bar.append(x); };
    b('Sort the pieces', sortOut); b('Look at the lid', () => showLid(true)); b('Pictures', () => choose(true)); b('Start again', startAgain); b('Stand up', () => { ctx.walker.seated = null; });
    document.body.append(bar);
  }
  function showLid(on) {
    makeBar();
    if (!lidSheet) {
      lidSheet = el('div', { class: 'jig-sheet' }); lidSheet.addEventListener('click', () => lidSheet.classList.remove('on')); document.body.append(lidSheet);
    }
    if (on) { const p = PICTURES.find(p => p.id === choice.pic); lidSheet.innerHTML = `<div class="jig-lid"><img alt="${p.title}" src="assets/art/puzzles/${p.id}.jpg"><div><i>${p.title}</i> · ${p.by} · ${p.where}</div></div>`; }
    lidSheet.classList.toggle('on', on);
  }
  function progress(pic, size) {
    if (pic === choice.pic && size === choice.size) return P.placed();
    const s = load(keyOf(pic, size), null); if (s?.p) return s.p.filter(a => a[3]).length;
    return pic === PICTURES[0].id && size === 96 ? Math.round(96 / 3) : 0;
  }
  function choose(on) {
    makeBar();
    if (!sheet) { sheet = el('div', { class: 'jig-sheet' }); sheet.addEventListener('click', e => { if (e.target === sheet) sheet.classList.remove('on'); }); document.body.append(sheet); }
    if (!on) { sheet.classList.remove('on'); return; }
    let pic = choice.pic, size = choice.size;
    const draw = () => {
      sheet.innerHTML = `<div class="jig-card" role="dialog" aria-label="Choose a jigsaw"><h2>Which jigsaw?</h2><div class="jig-pics">${PICTURES.map(p => `<button type="button" class="jig-pic${p.id === pic ? ' on' : ''}" data-pic="${p.id}"><img alt="" src="assets/art/puzzles/${p.id}.jpg"><b>${p.title}</b><i>${p.by}</i></button>`).join('')}</div>
        <div class="jig-row">${SIZES.map(n => { const d = progress(pic, n); return `<button type="button" data-size="${n}" class="${n === size ? 'on' : ''}">${n} pieces${d ? ` <small>· ${d === n ? 'finished' : d + ' in place'}</small>` : ''}</button>`; }).join('')}</div>
        <div class="jig-row"><button type="button" data-go>Do this one</button><button type="button" data-close>Back to the table</button></div></div>`;
      sheet.querySelectorAll('[data-pic]').forEach(x => x.addEventListener('click', () => { pic = x.dataset.pic; draw(); }));
      sheet.querySelectorAll('[data-size]').forEach(x => x.addEventListener('click', () => { size = Number(x.dataset.size); draw(); }));
      sheet.querySelector('[data-go]').addEventListener('click', () => { sheet.classList.remove('on'); switchTo(pic, size); });
      sheet.querySelector('[data-close]').addEventListener('click', () => sheet.classList.remove('on'));
    };
    draw(); sheet.classList.add('on');
  }

  // ---- For tests (tools/evaljs.sh) and the guests ----
  window.__jigsaw = { get P() { return P; }, get outl() { return outl; }, get choice() { return choice; }, get loaded() { return loaded; }, root, mesh, sit, sortOut, switchTo, flourish, ensurePicture, layout: () => layout(), remember,
    grabAt: (u, v) => { const i = P.pick(u, v, outl); if (i < 0) return -1; drag = { g: P.p[i].g, u, v }; dragG = drag.g; makeShadow(drag.g); layoutDirty = true; return i; },
    moveTo: (u, v) => { if (!drag) return; P.shift(drag.g, u - drag.u, v - drag.v); drag.u = u; drag.v = v; P.clamp(drag.g, REGION); lift = LIFT; layoutDirty = true; },
    letGo, info: () => ({ pic: choice.pic, size: choice.size, n: P.n, placed: P.placed(), groups: P.groups().size, solved: P.solved(), verts: G.geo.attributes.position.count, tris: G.geo.index.count / 3, tex: material.map ? [material.map.image.width, material.map.image.height] : null }) };

  if (TOY.startsWith('jigsaw')) setTimeout(async () => {
    const what = TOY.split(':')[1] ?? '';
    await ensurePicture();
    const m = /^solve-(\d+)$/.exec(what); if (m) { P.solveSome(Number(m[1])); layoutDirty = true; }
    if (what === 'done') { P.solveSome(P.n); layoutDirty = true; }
    sit();
    if (what === 'done') flourish();
    if (what === 'sort') sortOut();
    if (what === 'choose') choose(true);
    if (what === 'lid') showLid(true);
    if (what === 'drag' || what === 'snap') {
      // take a loose single whose right-hand or lower neighbour is loose too, and bring it to that neighbour
      const q = P.p.find(q => !q.home && P.members(q.g).length === 1 && P.neighbours(q.i).some(k => !P.p[k].home && P.members(P.p[k].g).length === 1));
      if (q) {
        const o = P.p[P.neighbours(q.i).find(k => !P.p[k].home && P.members(P.p[k].g).length === 1)];
        const api = window.__jigsaw; api.grabAt(q.x + P.cw / 2, q.y + P.ch / 2);
        const tx = o.x - (o.c - q.c) * P.cw + P.cw / 2, ty = o.y - (o.r - q.r) * P.ch + P.ch / 2;
        if (what === 'drag') api.moveTo(tx + P.cw * 0.6, ty + P.ch * 0.35);
        else { api.moveTo(tx + 0.012, ty - 0.01); letGo(); }
      }
    }
  }, 300);
}
