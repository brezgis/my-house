// The front walk, from the gate to the porch steps: old brick laid in herringbone, edged with a
// soldier course (bricks on end), the joints swept with sand and gone to moss toward the edges and
// under the house. It flares gently to meet the porch steps, opens into a round at the middle of
// the front garden where a round tile medallion with an A is set flush in the brick, and spreads into a little
// apron outside the gate. Lavender, catmint and thyme spill over the edges.
//
// The field is one mesh with a herringbone texture drawn here (true size: 4 by 8 inch bricks, a
// different brick every time for four feet each way), a bump map from the same drawing, and
// colours on its vertices for wear down the middle and moss at the edges. The soldier course, the
// ring round the medallion and a few bricks that have sunk or tipped are in the garden's shared painted
// mesh. The medallion (an A in the gate sign's lettering, a moth, a bee, a starling and a kitten in
// the border among leaves) is drawn here as glazed tile on one small disc of its own.
// It sits 0.09 ft above the lawn, the soldier bricks 0.12 (the house's old flat strip, house.js,
// lies hidden underneath; it could go).

import * as THREE from 'three';
import { PAINT } from './tools.js';
import { ownPlants } from './little_library.js';
import { rng } from './cards.js';

const CX = 1.885;                                    // the walk's middle (the front door's)
const Z0 = 15.45, Z1 = 72.0;                         // the foot of the porch steps; the end of the apron outside the gate
const ROUND = { z: 40, r: 4.3 }, STONE = 1.95;      // the round in the middle; the medallion is STONE + 0.045 in radius (four feet across)
const SOLDIER = 0.66, FIELD_Y = 0.088, TOP = 0.118;
const smooth = t => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
// half the walk's width at z, soldier course included
export function halfWidth(z) {
  let h = 3.0;
  if (z < 21) h = Math.max(h, 3.0 + 2.15 * (1 - (z - Z0) / 5.55) ** 2);                  // out to the width of the steps
  const dz = z - ROUND.z; if (Math.abs(dz) < ROUND.r) h = Math.max(h, Math.sqrt(ROUND.r * ROUND.r - dz * dz));
  if (z > 68.9) h = Math.max(h, 3.0 + 1.3 * smooth((z - 68.9) / 1.6));                  // the apron outside the gate
  return h;
}

const BRICKS = ['#8a4a36', '#7e3f30', '#94553b', '#6f3a2e', '#9a6046', '#83483a', '#a07055', '#5a3a34', '#76402f', '#8e5040'];
const hash = (a, b) => { let h = Math.imul(a | 0, 374761393) ^ Math.imul(b | 0, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };

export function buildFrontWalk(K) {
  const r = rng(1906);
  // ---- the soldier course along both edges, and across both ends ----
  const brick = (x, z, yaw, o = {}) => {
    const k = r(), col = o.col ?? BRICKS[Math.floor(k * BRICKS.length)], top = TOP - (o.sink ?? 0);
    const g = new THREE.BoxGeometry(o.w ?? SOLDIER - 0.03, top + 0.03, o.d ?? 0.3).toNonIndexed();
    if (o.tip) g.rotateX(o.tip);
    g.translate(0, (top - 0.03) / 2, 0); g.rotateY(yaw); g.translate(x, 0, z);
    K.put('c#' + col.slice(1) + '/0.92', g);
  };
  const edge = s => {                                // walk the edge's midline, a brick every 0.33 ft along it
    const pts = []; for (let z = Z0 + 0.68; z <= Z1 - 0.68; z += 0.02) pts.push([CX + s * (halfWidth(z) - SOLDIER / 2), z]);
    let acc = 0.17, n = 0;
    for (let i = 1; i < pts.length; i++) {
      const [ax, az] = pts[i - 1], [bx, bz] = pts[i], d = Math.hypot(bx - ax, bz - az); acc += d;
      if (acc < 0.335) continue; acc = 0;
      const yaw = Math.atan2(bx - ax, bz - az), odd = (n++ * 7 + (s > 0 ? 3 : 0)) % 41;
      brick(bx, bz, yaw, odd === 5 ? { sink: 0.035 } : odd === 17 ? { tip: 0.08 } : {});
    }
  };
  edge(-1); edge(1);
  for (const [z, hz] of [[Z0 + 0.33, Z0 + 0.66], [Z1 - 0.33, Z1 - 0.66]]) {
    const h = halfWidth(hz) - 0.02;
    for (let x = CX - h + 0.17; x <= CX + h - 0.16; x += 0.335) brick(x, z, 0, { w: 0.3, d: 0.62, ...(hash(x * 9, z) < 0.06 ? { sink: 0.03 } : {}) });
  }
  // ---- the medallion's ring of bricks on end (the medallion itself is drawn in setup) ----
  { const x = CX, z = ROUND.z;
    const n = Math.round(2 * Math.PI * (STONE + 0.36) / 0.335);
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; brick(x + Math.sin(a) * (STONE + 0.36), z + Math.cos(a) * (STONE + 0.36), a + Math.PI / 2, { w: 0.62, d: 0.29 }); }
    (K.F.keepOut ??= []).push([x - ROUND.r, x + ROUND.r, z - ROUND.r, z + ROUND.r]);
  }
  (K.F.keepOut ??= []).push([CX - 3.0, CX + 3.0, Z0, Z1]);
  // ---- low things spilling over the edges ----
  ownPlants(K, 4404, F => {
    for (const s of [-1, 1]) for (let z = 21.5; z < 66; z += 1.7 + r() * 1.6) {
      if (Math.abs(z - ROUND.z) < ROUND.r + 0.6 || (s > 0 && z > 40 && z < 60 && r() < 0.4)) continue;
      const kind = r() < 0.4 ? 'lavender' : r() < 0.7 ? 'catmint' : 'herbs';
      F.add(kind, CX + s * (3.05 + r() * 0.35), z, kind === 'herbs' ? 0.55 : 0.62 + r() * 0.2);
    }
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, s = Math.sin(a), c = Math.cos(a); if (Math.abs(s) < 0.45) continue; F.add(r() < 0.5 ? 'catmint' : 'lavender', CX + s * (ROUND.r + 0.45), ROUND.z + c * (ROUND.r + 0.45), 0.7); }
    for (const s of [-1, 1]) for (const dz of [0.6, 2.2, 3.8]) F.add(s * dz > 0 ? 'catmint' : 'lavender', CX + s * (5.5 - dz * 0.35), Z0 + dz, 0.6);
  });
  // ---- the field: drawn and built when the materials exist ----
  K.setups.push(ctx => field(ctx));
}

// The herringbone, 45 degrees to the walk. In brick units (4 in) the pattern repeats every 4 both
// ways; turned 45 degrees it repeats every 4 * sqrt(2) units along x and z. The drawing covers two
// repeats each way, so a brick and its neighbours differ for nearly four feet.
const U = 1 / 3, PER = 4 * Math.SQRT2 * U, SPAN = 2 * PER, PX = 1024;
function drawHerringbone() {
  const col = document.createElement('canvas'), bump = document.createElement('canvas');
  col.width = col.height = bump.width = bump.height = PX;
  const g = col.getContext('2d'), b = bump.getContext('2d'), k = PX / SPAN, r = rng(77);
  g.fillStyle = '#6e6656'; g.fillRect(0, 0, PX, PX); b.fillStyle = '#000'; b.fillRect(0, 0, PX, PX);
  for (let i = 0; i < 900; i++) { g.fillStyle = r() < 0.55 ? `rgba(84,98,52,${0.25 + r() * 0.4})` : `rgba(150,138,110,${0.2 + r() * 0.3})`; g.beginPath(); g.arc(r() * PX, r() * PX, 2 + r() * 7, 0, 7); g.fill(); }
  const rot = (x, y) => [(x - y) / Math.SQRT2 * U * k, (x + y) / Math.SQRT2 * U * k];
  const N = Math.ceil(SPAN / U * 1.5) + 4, J = 0.045;                 // joint, in brick units
  for (let a = -N; a <= N; a++) for (let c = -N; c <= N; c++) {
    const d = ((c - a) % 4 + 4) % 4; if (d > 1) continue;
    const [w, h] = d === 0 ? [2, 1] : [1, 2];
    const corners = [[a + J, c + J], [a + w - J, c + J], [a + w - J, c + h - J], [a + J, c + h - J]].map(([x, y]) => rot(x, y));
    const cx = corners.reduce((s, p) => s + p[0], 0) / 4, cy = corners.reduce((s, p) => s + p[1], 0) / 4;
    if (cx < -60 || cy < -60 || cx > PX + 60 || cy > PX + 60) continue;
    const id = hash(Math.round(((cx % PX) + PX) % PX), Math.round(((cy % PX) + PX) % PX)), id2 = hash(Math.round(cy), 7);
    let fill = BRICKS[Math.floor(id * BRICKS.length)];
    const sunk = id2 < 0.05, worn = id2 > 0.92;
    const path = () => { g.beginPath(); for (const [x, y] of corners) g.lineTo(x, y); g.closePath(); };
    path(); g.fillStyle = fill; g.fill();
    // the face of each brick: a little light and dark mottling, a fired edge, chips
    const gr = g.createLinearGradient(corners[0][0], corners[0][1], corners[2][0], corners[2][1]);
    gr.addColorStop(0, `rgba(255,230,200,${0.04 + id * 0.08})`); gr.addColorStop(1, `rgba(30,10,5,${0.06 + id2 * 0.1})`);
    g.fillStyle = gr; g.fill();
    g.save(); g.clip();
    for (let s = 0; s < 14; s++) { g.fillStyle = r() < 0.5 ? 'rgba(40,20,12,.18)' : 'rgba(230,190,150,.12)'; g.fillRect(cx - 50 + r() * 100, cy - 50 + r() * 100, 2 + r() * 4, 2 + r() * 3); }
    if (sunk) { g.fillStyle = 'rgba(30,40,20,.35)'; g.fill(); }
    if (worn) { g.fillStyle = 'rgba(210,190,160,.16)'; g.fill(); }
    g.restore();
    g.strokeStyle = 'rgba(20,10,6,.35)'; g.lineWidth = 2; path(); g.stroke();
    // the bump: faces raised (sunk ones less), rounded at the arrises
    b.beginPath(); for (const [x, y] of corners) b.lineTo(x, y); b.closePath();
    const v = sunk ? 120 : 200 + Math.floor(id * 40); b.fillStyle = `rgb(${v},${v},${v})`; b.fill();
    b.strokeStyle = `rgb(${v - 70},${v - 70},${v - 70})`; b.lineWidth = 5; b.stroke();
  }
  // moss creeping into the joints here and there
  g.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 160; i++) { const x = r() * PX, y = r() * PX; g.fillStyle = `rgba(80,96,46,${0.08 + r() * 0.12})`; g.beginPath(); g.arc(x, y, 10 + r() * 40, 0, 7); g.fill(); }
  g.globalCompositeOperation = 'source-over';
  return { col, bump };
}

function field(ctx) {
  const T3 = ctx.THREE ?? THREE, { col, bump } = drawHerringbone();
  const tex = new T3.CanvasTexture(col), btx = new T3.CanvasTexture(bump);
  for (const t of [tex, btx]) { t.wrapS = t.wrapT = T3.RepeatWrapping; t.anisotropy = Math.min(8, ctx.renderer.capabilities.getMaxAnisotropy()); }
  tex.colorSpace = T3.SRGBColorSpace;
  // the field, between the soldier courses' inner edges, with a round hole for the medallion and its ring;
  // colours on its vertices: moss toward the edges and toward the house, wear down the middle
  const left = [], right = [];
  for (let z = Z0 + 0.65; z <= Z1 - 0.65 + 1e-6; z += 0.25) { const h = halfWidth(z) - SOLDIER + 0.02; left.push(new T3.Vector2(CX - h, z)); right.push(new T3.Vector2(CX + h, z)); }
  const shape = new T3.Shape([...left, ...right.reverse()]), hole = new T3.Path(), HR = STONE + 0.67;
  for (let i = 0; i <= 64; i++) { const a = -i / 64 * Math.PI * 2; hole.lineTo(CX + Math.cos(a) * HR, ROUND.z + Math.sin(a) * HR); }
  shape.holes.push(hole);
  const sg = new T3.ShapeGeometry(shape, 1), sp = sg.attributes.position, r = rng(31);
  const pos = [], uv = [], colr = [];
  for (let i = 0; i < sp.count; i++) {
    const x = sp.getX(i), z = sp.getY(i), e = Math.min(1, Math.abs(x - CX) / (halfWidth(z) - SOLDIER));
    pos.push(x, FIELD_Y, z); uv.push(x / SPAN, -z / SPAN);
    const near = Math.max(0, 1 - (z - Z0) / 14) * 0.3 + (r() - 0.5) * 0.1, moss = Math.min(1, e ** 3 * 0.8 + near), wear = Math.max(0, 1 - e * 1.6) * 0.08;
    colr.push(1.0 + wear - moss * 0.2, 1.0 + wear - moss * 0.06, 1.0 + wear - moss * 0.32);
  }
  const idx = Array.from(sg.index.array); for (let i = 0; i < idx.length; i += 3) [idx[i + 1], idx[i + 2]] = [idx[i + 2], idx[i + 1]];
  const geo = new T3.BufferGeometry();
  geo.setAttribute('position', new T3.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new T3.Float32BufferAttribute(uv, 2));
  geo.setAttribute('color', new T3.Float32BufferAttribute(colr, 3)); geo.setIndex(idx);
  geo.setAttribute('normal', new T3.Float32BufferAttribute(new Array(pos.length).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  const mat = new T3.MeshStandardMaterial({ map: tex, bumpMap: btx, bumpScale: 2.2, vertexColors: true, roughness: 0.92, envMapIntensity: 0.5, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -6 });
  const mesh = new T3.Mesh(geo, mat); mesh.receiveShadow = true; mesh.name = 'front walk';
  ctx.scene.add(mesh);
  medallion(ctx, mat);
}

// ---- The medallion: glazed tile, drawn here. Its top is toward the house, so the A reads walking in. ----
const SIGN_FONT = '"Iowan Old Style", Palatino, Georgia, serif';       // the gate sign's lettering (garden.js)
function drawMedallion() {
  const N = 1024, c = N / 2, R = N / 2 - 4, col = document.createElement('canvas'), bump = document.createElement('canvas');
  col.width = col.height = bump.width = bump.height = N;
  const g = col.getContext('2d'), b = bump.getContext('2d'), r = rng(1415);
  const GROUND = [47, 90, 92], CREAM = '#efe3c4', OCHRE = '#c9963a', GROUT = '#262320';
  const tint = (rgb, k) => `rgb(${rgb.map(v => Math.round(Math.min(255, v * k))).join(',')})`;
  const R1 = R * 0.62, R2 = R * 0.66, R3 = R * 0.965, RM = (R2 + R3) / 2;          // centre; border from R2 to R3; motifs on RM
  g.fillStyle = GROUT; g.fillRect(0, 0, N, N); b.fillStyle = '#000'; b.fillRect(0, 0, N, N);
  // a tile: its own shade, its edge a little uneven, a soft highlight; and its face in the bump drawing
  const tile = (path, rgb) => {
    g.save(); path(g); g.fillStyle = tint(rgb, 0.9 + r() * 0.2); g.fill(); g.clip();
    const gr = g.createRadialGradient(c - 200 + r() * 400, c - 200 + r() * 400, 10, c, c, R); gr.addColorStop(0, 'rgba(255,255,255,.07)'); gr.addColorStop(1, 'rgba(0,0,0,.08)');
    g.fillStyle = gr; g.fillRect(0, 0, N, N);
    for (let i = 0; i < 40; i++) { g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.06)'; g.beginPath(); g.arc(r() * N, r() * N, 2 + r() * 8, 0, 7); g.fill(); }
    g.restore();
    path(b); const v = 215 + Math.floor(r() * 30); b.fillStyle = `rgb(${v},${v},${v})`; b.fill();
  };
  const wob = () => (r() - 0.5) * 3;
  // the centre: a few larger shaped pieces, cut on a ring and seven radii
  const cuts = 7, a0 = r() * 6;
  for (let i = 0; i < cuts; i++) for (const [ra, rb] of [[0, R1 * 0.5], [R1 * 0.5, R1]]) {
    const A = a0 + i / cuts * Math.PI * 2, B = a0 + (i + 1) / cuts * Math.PI * 2, gap = 5.5;
    tile(x => { x.beginPath(); for (let k = 0; k <= 10; k++) { const a = A + (B - A) * k / 10; x.lineTo(c + Math.cos(a) * (rb - gap + wob()), c + Math.sin(a) * (rb - gap + wob())); }
      if (ra > 0) for (let k = 10; k >= 0; k--) { const a = A + (B - A) * k / 10; x.lineTo(c + Math.cos(a) * (ra + gap + wob()), c + Math.sin(a) * (ra + gap + wob())); } else x.lineTo(c, c);
      x.closePath(); }, GROUND);
  }
  // the border: small wedge tiles between two ochre lines
  const ring = (rad, w) => { for (const x of [g, b]) { x.beginPath(); x.arc(c, c, rad, 0, 7); x.lineWidth = w; } g.strokeStyle = OCHRE; g.stroke(); b.strokeStyle = '#d8d8d8'; b.stroke(); };
  const W = 56;
  for (let i = 0; i < W; i++) {
    const A = i / W * Math.PI * 2, B = (i + 1) / W * Math.PI * 2, d = 0.012;
    tile(x => { x.beginPath(); x.lineTo(c + Math.cos(A + d) * (R2 + 14), c + Math.sin(A + d) * (R2 + 14)); x.lineTo(c + Math.cos(A + d) * (R3 - 14 + wob()), c + Math.sin(A + d) * (R3 - 14 + wob()));
      x.lineTo(c + Math.cos(B - d) * (R3 - 14 + wob()), c + Math.sin(B - d) * (R3 - 14 + wob())); x.lineTo(c + Math.cos(B - d) * (R2 + 14), c + Math.sin(B - d) * (R2 + 14)); x.closePath(); }, [40, 78, 82]);
  }
  ring(R2 + 6, 9); ring(R3 - 6, 9); ring(R1 + 3, 6);
  // the vine running round between the roundels, leaves on alternate sides
  g.strokeStyle = '#d9c99a'; g.lineWidth = 5; g.beginPath();
  for (let k = 0; k <= 360; k++) { const a = k / 360 * Math.PI * 2, rr = RM + Math.sin(a * 16) * 12; g.lineTo(c + Math.cos(a) * rr, c + Math.sin(a) * rr); }
  g.stroke();
  for (let k = 0; k < 64; k++) {
    const a = (k + 0.5) / 64 * Math.PI * 2, s = k % 2 ? 1 : -1, rr = RM + Math.sin(a * 16) * 12 + s * 16;
    if (Math.min(...[0, 1, 2, 3].map(q => Math.abs(((a - q * Math.PI / 2 + Math.PI * 3) % (Math.PI * 2)) - Math.PI))) > Math.PI - 0.32) continue;
    g.save(); g.translate(c + Math.cos(a) * rr, c + Math.sin(a) * rr); g.rotate(a + s * 0.9); g.fillStyle = k % 3 ? '#cdbb84' : OCHRE; g.beginPath(); g.ellipse(0, 0, 15, 7, 0, 0, 7); g.fill(); g.restore();
  }
  // four roundels at the quarters: a moth (far, toward the house), a bee, a starling (near), a kitten
  const motif = { moth(x) {
      x.beginPath(); x.ellipse(-24, -10, 26, 18, -0.5, 0, 7); x.ellipse(24, -10, 26, 18, 0.5, 0, 7); x.fill();
      x.beginPath(); x.ellipse(-17, 16, 16, 12, 0.6, 0, 7); x.ellipse(17, 16, 16, 12, -0.6, 0, 7); x.fill();
      x.fillStyle = OCHRE; x.beginPath(); x.ellipse(0, 4, 7, 26, 0, 0, 7); x.fill();
      x.strokeStyle = OCHRE; x.lineWidth = 3; x.beginPath(); x.moveTo(-3, -20); x.quadraticCurveTo(-12, -40, -22, -42); x.moveTo(3, -20); x.quadraticCurveTo(12, -40, 22, -42); x.stroke();
      x.fillStyle = '#2f5a5c'; for (const s of [-1, 1]) { x.beginPath(); x.arc(s * 26, -12, 6, 0, 7); x.fill(); } },
    bee(x) {
      x.globalAlpha = 0.85; x.beginPath(); x.ellipse(-14, -18, 18, 11, -0.5, 0, 7); x.ellipse(14, -18, 18, 11, 0.5, 0, 7); x.fill(); x.globalAlpha = 1;
      x.fillStyle = OCHRE; x.beginPath(); x.ellipse(0, 6, 17, 27, 0, 0, 7); x.fill();
      x.fillStyle = '#2f5a5c'; for (const y of [-2, 12]) x.fillRect(-17, y, 34, 6); x.beginPath(); x.arc(0, -24, 9, 0, 7); x.fill(); },
    starling(x) {
      x.beginPath(); x.ellipse(-2, 6, 30, 17, -0.2, 0, 7); x.fill(); x.beginPath(); x.arc(24, -10, 12, 0, 7); x.fill();
      x.beginPath(); x.moveTo(33, -12); x.lineTo(50, -8); x.lineTo(33, -5); x.fill();
      x.beginPath(); x.moveTo(-26, 4); x.lineTo(-50, 18); x.lineTo(-44, 24); x.lineTo(-22, 16); x.fill();
      x.strokeStyle = OCHRE; x.lineWidth = 3; x.beginPath(); x.moveTo(0, 22); x.lineTo(-3, 36); x.moveTo(8, 22); x.lineTo(8, 36); x.stroke();
      x.fillStyle = OCHRE; for (const [px, py] of [[-8, 2], [4, 8], [-14, 12], [10, -2]]) { x.beginPath(); x.arc(px, py, 2.5, 0, 7); x.fill(); } },
    kitten(x) {
      x.beginPath(); x.ellipse(0, 14, 22, 24, 0, 0, 7); x.fill(); x.beginPath(); x.arc(0, -18, 15, 0, 7); x.fill();
      x.beginPath(); x.moveTo(-14, -24); x.lineTo(-12, -42); x.lineTo(-3, -30); x.moveTo(14, -24); x.lineTo(12, -42); x.lineTo(3, -30); x.fill();
      x.strokeStyle = CREAM; x.lineWidth = 7; x.lineCap = 'round'; x.beginPath(); x.moveTo(18, 30); x.quadraticCurveTo(44, 30, 38, 4); x.stroke();
      x.fillStyle = '#2f5a5c'; for (const s of [-1, 1]) { x.beginPath(); x.ellipse(s * 6, -19, 2.5, 4, 0, 0, 7); x.fill(); } } };
  [['moth', -Math.PI / 2], ['bee', 0], ['starling', Math.PI / 2], ['kitten', Math.PI]].forEach(([name, a]) => {
    const x0 = c + Math.cos(a) * RM, y0 = c + Math.sin(a) * RM, rr = (R3 - R2) * 0.5 + 6;
    tile(x => { x.beginPath(); x.arc(x0, y0, rr, 0, 7); }, [36, 70, 74]);
    g.strokeStyle = OCHRE; g.lineWidth = 6; g.beginPath(); g.arc(x0, y0, rr - 7, 0, 7); g.stroke();
    g.save(); g.translate(x0, y0); g.scale(1.25, 1.25); g.fillStyle = CREAM; motif[name](g); g.restore();
  });
  // the A, an inlaid cream piece outlined in grout: the gate sign's italic, large
  g.textAlign = 'center'; g.textBaseline = 'alphabetic'; g.font = `italic 560px ${SIGN_FONT}`;
  const m = g.measureText('A'), ya = c + ((m.actualBoundingBoxAscent ?? 380) - (m.actualBoundingBoxDescent ?? 0)) / 2;
  for (const [x, fill, line] of [[g, CREAM, GROUT], [b, '#f0f0f0', '#000']]) { x.font = g.font; x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.lineJoin = 'round'; x.strokeStyle = line; x.lineWidth = 12; x.strokeText('A', c, ya); x.fillStyle = fill; x.fillText('A', c, ya); }
  g.fillStyle = OCHRE; for (const s of [-1, 1]) { g.beginPath(); g.arc(c + s * R1 * 0.72, c + R1 * 0.5, 9, 0, 7); g.fill(); }
  // wear and dirt where feet go: a soft dulling down the line of the walk, a little grime in the grout
  const wear = g.createRadialGradient(c, c, 0, c, c, R * 0.9); wear.addColorStop(0, 'rgba(190,180,160,.16)'); wear.addColorStop(1, 'rgba(190,180,160,0)');
  g.save(); g.scale(0.55, 1); g.fillStyle = wear; g.fillRect(0, 0, N / 0.55, N); g.restore();
  for (let i = 0; i < 260; i++) { const x = c + (r() - 0.5) * R * 0.8, y = c + (r() - 0.5) * R * 1.8; g.fillStyle = `rgba(70,55,40,${0.04 + r() * 0.06})`; g.beginPath(); g.arc(x, y, 2 + r() * 6, 0, 7); g.fill(); }
  // outside the disc, grout (hidden under the bricks)
  for (const x of [g, b]) { x.globalCompositeOperation = 'destination-in'; x.beginPath(); x.arc(c, c, R + 2, 0, 7); x.fill(); x.globalCompositeOperation = 'source-over'; }
  return { col, bump };
}
function medallion(ctx, fieldMat) {
  const T3 = ctx.THREE ?? THREE, { col, bump } = drawMedallion();
  const tex = new T3.CanvasTexture(col), btx = new T3.CanvasTexture(bump);
  tex.colorSpace = T3.SRGBColorSpace; for (const t of [tex, btx]) t.anisotropy = Math.min(8, ctx.renderer.capabilities.getMaxAnisotropy());
  const geo = new T3.CircleGeometry(STONE + 0.045, 64); geo.rotateX(-Math.PI / 2); geo.translate(CX, 0.098, ROUND.z);      // canvas top toward the house: the A reads walking in
  const mat = new T3.MeshStandardMaterial({ map: tex, bumpMap: btx, bumpScale: 1.6, roughness: 0.45, envMapIntensity: 0.6, polygonOffset: true, polygonOffsetFactor: fieldMat.polygonOffsetFactor, polygonOffsetUnits: fieldMat.polygonOffsetUnits });
  const mesh = new T3.Mesh(geo, mat); mesh.receiveShadow = true; mesh.name = 'front walk medallion';
  ctx.scene.add(mesh);
}
