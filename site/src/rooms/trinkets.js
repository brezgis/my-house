// Trinkets for the gaps on the bookshelves (runs last; see kit.nooks), and the small
// built props the ground-floor rooms and the library share (exported as props()).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { LINEN, OAT, SAGE, RUST, NAVY, MUSTARD, CREAM, ROSE, ENAMEL, BRASS, STEEL, BLACK, GREEN, MARBLE, DARK, WHITE, G, DIRS } from '../kit.js';
import { wx, wz } from '../builder.js';
import { F1, F2 } from '../house.js';

// A private random source, so these props never disturb the kit's shared sequence.
const rand = seed => { let s = seed >>> 0 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; };

// ---- Drawn things ------------------------------------------------------------------------
const hand = (g, px, face = '"Bradley Hand", "Segoe Print", "Comic Sans MS", cursive') => { g.font = `${px}px ${face}`; };
const SERIF = 'Georgia, "Times New Roman", serif', SANS = '"Helvetica Neue", Arial, sans-serif';
export const DRAWN = {
  // a family snapshot: sky, hills, two figures (or a cat), white border
  photo: (seed, kind = 'people') => (g, w, h) => {
    const r = rand(seed);
    g.fillStyle = '#f4efe4'; g.fillRect(0, 0, w, h);
    const b = w * 0.07, iw = w - 2 * b, ih = h - 2 * b;
    const sky = g.createLinearGradient(0, b, 0, b + ih); sky.addColorStop(0, ['#9fb8c8', '#e6b98a', '#b7c4b0'][Math.floor(r() * 3)]); sky.addColorStop(1, '#efe3cf');
    g.fillStyle = sky; g.fillRect(b, b, iw, ih);
    g.fillStyle = ['#6f8a5c', '#7f9a74', '#8a7a5a'][Math.floor(r() * 3)]; g.beginPath(); g.moveTo(b, b + ih * 0.62);
    for (let x = 0; x <= iw; x += iw / 8) g.lineTo(b + x, b + ih * (0.55 + r() * 0.12)); g.lineTo(b + iw, b + ih); g.lineTo(b, b + ih); g.fill();
    if (kind === 'cat') {
      g.fillStyle = ['#3a302a', '#c98a4a', '#888078', '#efe6d6'][Math.floor(r() * 4)];
      const cx = b + iw * 0.5, cy = b + ih * 0.72;
      g.beginPath(); g.ellipse(cx, cy, iw * 0.22, ih * 0.16, 0, 0, 7); g.fill();
      g.beginPath(); g.arc(cx + iw * 0.16, cy - ih * 0.14, iw * 0.1, 0, 7); g.fill();
      g.beginPath(); g.moveTo(cx + iw * 0.09, cy - ih * 0.2); g.lineTo(cx + iw * 0.11, cy - ih * 0.3); g.lineTo(cx + iw * 0.15, cy - ih * 0.22); g.fill();
      g.beginPath(); g.moveTo(cx + iw * 0.18, cy - ih * 0.22); g.lineTo(cx + iw * 0.23, cy - ih * 0.3); g.lineTo(cx + iw * 0.25, cy - ih * 0.18); g.fill();
    } else {
      for (let i = 0; i < 2; i++) {
        const x = b + iw * (0.38 + i * 0.24), y = b + ih * 0.5;
        g.fillStyle = ['#7a3b2e', '#2a3549', '#c2a35a', '#3d5a4a'][Math.floor(r() * 4)];
        g.beginPath(); g.ellipse(x, y + ih * 0.22, iw * 0.09, ih * 0.22, 0, 0, 7); g.fill();
        g.fillStyle = '#d9b49a'; g.beginPath(); g.arc(x, y - ih * 0.06, iw * 0.055, 0, 7); g.fill();
        g.fillStyle = ['#3a2a20', '#7a5a3a', '#d8c08a'][Math.floor(r() * 3)]; g.beginPath(); g.arc(x, y - ih * 0.09, iw * 0.058, Math.PI, 0); g.fill();
      }
    }
    g.fillStyle = 'rgba(255,240,210,0.12)'; g.fillRect(b, b, iw, ih);
  },
  // a magazine cover
  magazine: (title, colour, sub) => (g, w, h) => {
    g.fillStyle = '#efe8da'; g.fillRect(0, 0, w, h);
    const p = g.createLinearGradient(0, h * 0.2, 0, h); p.addColorStop(0, '#c9b49a'); p.addColorStop(1, '#7d6a55');
    g.fillStyle = p; g.fillRect(0, h * 0.18, w, h * 0.82);
    g.fillStyle = '#5d6f52'; g.beginPath(); g.ellipse(w * 0.55, h * 0.75, w * 0.32, h * 0.2, 0, 0, 7); g.fill();
    g.fillStyle = '#e9e1cf'; g.fillRect(w * 0.2, h * 0.42, w * 0.3, h * 0.3); g.fillStyle = '#b8452e'; g.fillRect(w * 0.24, h * 0.46, w * 0.22, h * 0.12);
    g.fillStyle = colour; g.font = `bold ${h * 0.14}px ${SERIF}`; g.textAlign = 'center'; g.fillText(title, w / 2, h * 0.15);
    g.fillStyle = '#fff'; g.font = `${h * 0.045}px ${SANS}`; g.fillText(sub, w / 2, h * 0.93);
  },
  // envelopes and letters
  letter: (seed, kind = 'env') => (g, w, h) => {
    const r = rand(seed);
    g.fillStyle = kind === 'env' ? ['#efe6d2', '#e8dcc4', '#f3efe6', '#dfe6e8'][Math.floor(r() * 4)] : '#f6f2e8'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#3a3530'; g.fillStyle = '#3a3530';
    if (kind === 'env') {
      g.fillStyle = ['#b8452e', '#2f6a8a', '#6a8a3a'][Math.floor(r() * 3)]; g.fillRect(w * 0.8, h * 0.1, w * 0.12, h * 0.22);
      g.fillStyle = '#2a2a3a'; hand(g, h * 0.1); g.fillText('Ms. A. —', w * 0.3, h * 0.55); g.fillText('Cambridge, MA', w * 0.3, h * 0.7);
    } else {
      hand(g, h * 0.05); g.fillStyle = '#2a2a4a';
      for (let i = 0; i < 14; i++) g.fillRect(w * 0.1, h * (0.12 + i * 0.058), w * (0.5 + r() * 0.3), h * 0.008);
    }
  },
  // a printed paper, first page
  paper: (title, seed) => (g, w, h) => {
    const r = rand(seed);
    g.fillStyle = '#f7f4ec'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1d1a17'; g.font = `bold ${h * 0.035}px ${SERIF}`; g.textAlign = 'center';
    title.split('\n').forEach((t, i) => g.fillText(t, w / 2, h * (0.09 + i * 0.04)));
    g.font = `${h * 0.02}px ${SERIF}`; g.fillText('Abstract', w / 2, h * 0.2);
    g.fillStyle = '#4a4540';
    for (let c = 0; c < 2; c++) for (let i = 0; i < 34; i++) { if (c === 0 && i < 4) continue; g.fillRect(w * (0.08 + c * 0.45), h * (0.23 + i * 0.021), w * (0.36 + (i % 7 === 6 ? -0.15 : 0)), h * 0.006); }
    g.strokeStyle = '#e0b030'; g.globalAlpha = 0.45; g.lineWidth = h * 0.012; g.beginPath(); g.moveTo(w * 0.08, h * (0.3 + r() * 0.2)); g.lineTo(w * 0.4, h * 0.36); g.stroke(); g.globalAlpha = 1;
    g.strokeStyle = '#c0392b'; g.lineWidth = 2; hand(g, h * 0.03); g.fillStyle = '#c0392b'; g.fillText('?!', w * 0.9, h * 0.4);
  },
  sticky: (text, colour) => (g, w, h) => {
    g.fillStyle = colour; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(0,0,0,0.06)'; g.fillRect(0, 0, w, h * 0.12);
    g.fillStyle = '#2a2a3a'; hand(g, h * 0.2); g.textAlign = 'center';
    text.split('\n').forEach((t, i) => g.fillText(t, w / 2, h * (0.42 + i * 0.26)));
  },
  // a jigsaw, half done: the finished part shows a landscape, the rest is loose pieces
  jigsaw: seed => (g, w, h) => {
    const r = rand(seed);
    g.fillStyle = '#2b2622'; g.fillRect(0, 0, w, h);                 // the table shows through as dark
    const cols = 16, rows = 10, pw = w / cols, ph = h / rows;
    const scene = (x, y) => { const t = y / h; return t < 0.45 ? `hsl(${205 + x / w * 20},${35 + t * 40}%,${70 - t * 30}%)` : t < 0.62 ? `hsl(${100 + x / w * 30},28%,${40 + r() * 8}%)` : `hsl(${40 + r() * 15},45%,${48 + r() * 10}%)`; };
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const done = (i < 3 || j < 2 || j > 7 || i > 13) || (i < 7 && j < 6);       // the frame and one corner
      if (!done) continue;
      g.fillStyle = scene(i * pw, j * ph); g.fillRect(i * pw + 1, j * ph + 1, pw - 1.5, ph - 1.5);
    }
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1;
    for (let k = 0; k < 26; k++) { const x = w * (0.3 + r() * 0.55), y = h * (0.3 + r() * 0.45); g.save(); g.translate(x, y); g.rotate(r() * 6); g.fillStyle = scene(r() * w, r() * h); g.fillRect(-pw / 2, -ph / 2, pw * 0.9, ph * 0.9); g.strokeRect(-pw / 2, -ph / 2, pw * 0.9, ph * 0.9); g.restore(); }
  },
  // a laptop screen: a notebook of code and a chat window
  laptop: (g, w, h) => {
    g.fillStyle = '#f5f2ea'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#d9d4c8'; g.fillRect(0, 0, w, h * 0.07);
    for (const [x, c] of [[0.03, '#e86b5f'], [0.06, '#f2be4f'], [0.09, '#61c454']]) { g.fillStyle = c; g.beginPath(); g.arc(w * x, h * 0.035, h * 0.018, 0, 7); g.fill(); }
    g.fillStyle = '#333'; g.font = `${h * 0.04}px ${SANS}`; g.fillText('recipes / jam tart — notes', w * 0.15, h * 0.05);
    g.fillStyle = '#2a2a2a'; g.font = `bold ${h * 0.06}px ${SERIF}`; g.fillText('Plum & cardamom tart', w * 0.07, h * 0.18);
    g.font = `${h * 0.035}px ${SANS}`; g.fillStyle = '#555';
    ['250 g flour, 125 g cold butter', '1 egg yolk, pinch of salt', '8 plums, halved', '½ tsp cardamom, 3 tbsp sugar', 'bake 190 °C, 35–40 min'].forEach((t, i) => g.fillText('• ' + t, w * 0.08, h * (0.28 + i * 0.07)));
    g.fillStyle = '#c9b49a'; g.fillRect(w * 0.6, h * 0.22, w * 0.33, h * 0.4); g.fillStyle = '#7a3b5e'; g.beginPath(); g.arc(w * 0.765, h * 0.42, h * 0.14, 0, 7); g.fill();
  },
  // a pinboard: cork with notes, photos, a postcard, a printed figure
  pinboard: (g, w, h) => {
    const r = rand(77);
    g.fillStyle = '#b48a5a'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2500; i++) { g.fillStyle = `rgba(${r() < 0.5 ? '90,60,30' : '230,200,150'},0.25)`; g.fillRect(r() * w, r() * h, 2, 2); }
    const pin = (x, y) => { g.fillStyle = ['#c0392b', '#2f6a8a', '#e0b030', '#3d7a4a'][Math.floor(r() * 4)]; g.beginPath(); g.arc(x, y, w * 0.008, 0, 7); g.fill(); };
    const card = (x, y, cw, ch, rot, fill, fn) => { g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(-cw / 2 + 3, -ch / 2 + 4, cw, ch); g.fillStyle = fill; g.fillRect(-cw / 2, -ch / 2, cw, ch); fn?.(cw, ch); g.restore(); pin(x, y - ch / 2 + 8); };
    const text = (lines, px, col = '#2a2a3a') => (cw, ch) => { g.fillStyle = col; hand(g, px); g.textAlign = 'center'; lines.forEach((t, i) => g.fillText(t, 0, -ch / 2 + px * 1.6 + i * px * 1.2)); };
    card(w * 0.16, h * 0.25, w * 0.2, h * 0.26, -0.05, '#fff59a', text(['ACL ddl', 'Feb 15!!'], h * 0.06));
    card(w * 0.42, h * 0.3, w * 0.24, h * 0.42, 0.03, '#f7f4ec', (cw, ch) => { g.fillStyle = '#333'; g.font = `bold ${h * 0.035}px ${SANS}`; g.textAlign = 'center'; g.fillText('attention heads, layer 6', 0, -ch / 2 + h * 0.05); for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) { g.fillStyle = `hsl(210,60%,${92 - (i === j ? 50 : r() * 35)}%)`; g.fillRect(-cw * 0.36 + i * cw * 0.12, -ch * 0.3 + j * ch * 0.12, cw * 0.11, ch * 0.11); } });
    card(w * 0.72, h * 0.24, w * 0.24, h * 0.3, 0.06, '#f4efe4', (cw, ch) => { const d = DRAWN.photo(5, 'people'); g.save(); g.translate(-cw / 2, -ch / 2); g.scale(cw / 256, ch / 256); d(g, 256, 256); g.restore(); });
    card(w * 0.86, h * 0.68, w * 0.18, h * 0.24, -0.08, '#a8d8ea', text(['tokenise', 'Ukr. corpus'], h * 0.045));
    card(w * 0.2, h * 0.7, w * 0.26, h * 0.34, 0.04, '#e9dcc8', (cw, ch) => { g.fillStyle = '#6a8aa0'; g.fillRect(-cw * 0.45, -ch * 0.42, cw * 0.9, ch * 0.55); g.fillStyle = '#f0e6d0'; g.font = `italic ${h * 0.04}px ${SERIF}`; g.textAlign = 'center'; g.fillText('Greetings from Lviv', 0, ch * 0.32); });
    card(w * 0.52, h * 0.78, w * 0.2, h * 0.22, -0.03, '#ffd1dc', text(['call mom', 'sun 11am'], h * 0.05));
    card(w * 0.66, h * 0.62, w * 0.12, h * 0.15, 0.1, '#c8f0c0', text(['BLEU', 'is not', 'enough'], h * 0.035));
  },
  // a clock face
  dial: (g, w, h) => {
    g.fillStyle = '#f2ecdf'; g.beginPath(); g.arc(w / 2, h / 2, w * 0.48, 0, 7); g.fill();
    g.fillStyle = '#2a2520'; g.font = `${w * 0.1}px ${SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    ['XII', 'III', 'VI', 'IX'].forEach((t, i) => g.fillText(t, w / 2 + Math.sin(i * Math.PI / 2) * w * 0.36, h / 2 - Math.cos(i * Math.PI / 2) * h * 0.36));
    g.strokeStyle = '#2a2520'; g.lineWidth = w * 0.025; g.lineCap = 'round';
    g.beginPath(); g.moveTo(w / 2, h / 2); g.lineTo(w / 2 + w * 0.18, h / 2 - h * 0.1); g.stroke();
    g.lineWidth = w * 0.015; g.beginPath(); g.moveTo(w / 2, h / 2); g.lineTo(w / 2 - w * 0.05, h / 2 - h * 0.34); g.stroke();
  },
};

// ---- Built props -----------------------------------------------------------------------------
export function props(kit) {
  const { B, world, sign, model, lampAt, posy, candle, jarCandle } = kit;

  // Put a geometry authored in a frame's own axes (x along, y out of the wall, z up) into the house.
  function put(f, mat, geo, x = 0, y = 0, z = 0, o = {}) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (o.rot) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...o.rot, o.order ?? 'XYZ')));
    g.translate(x, y, z);
    const [X0, Y0] = f.map(0, 0), [X1, Y1] = f.map(1, 0), [X2, Y2] = f.map(0, 1);
    const m = new THREE.Matrix4().makeBasis(new THREE.Vector3(X1 - X0, 0, -(Y1 - Y0)), new THREE.Vector3(X2 - X0, 0, -(Y2 - Y0)), new THREE.Vector3(0, 1, 0));
    m.setPosition(wx(X0), f.h, wz(Y0));
    g.applyMatrix4(m);
    B.mesh(mat, g);
  }
  const zUp = g => g.rotateX(Math.PI / 2);                 // three's y-up shapes to the frame's z-up
  // A turned piece: profile [[r, z], ...] from the bottom, out, up and back in at the top.
  const lathe = (f, mat, x, y, z, prof, seg = 24, o) => put(f, mat, zUp(new THREE.LatheGeometry(prof.map(([r, h]) => new THREE.Vector2(r, h)), seg)), x, y, z, o);
  // A rounded box centred at (x, y, z), turned by yaw (about z) and tilted.
  function rbox(f, mat, x, y, z, sx, sy, sz, r = 0.04, o = {}) {
    const g = new RoundedBoxGeometry(sx, sz, sy, o.seg ?? 1, Math.min(r, sx / 2.01, sy / 2.01, sz / 2.01));
    const uv = g.attributes.uv, n = g.attributes.normal;
    for (let i = 0; i < uv.count; i++) { const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)); const [su, sv] = ax > 0.5 ? [sy, sz] : ay > 0.5 ? [sx, sy] : [sx, sz]; uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); }
    g.rotateX(Math.PI / 2);                              // y-up box -> z-up box
    put(f, mat, g, x, y, z, { rot: [o.tilt ?? 0, o.roll ?? 0, o.yaw ?? 0], order: 'ZXY' });
  }
  // A plain thin board (a leaf, a sheet, a strap): 12 triangles, turned like rbox.
  const slab = (f, mat, x, y, z, sx, sy, sz, o = {}) => put(f, mat, new THREE.BoxGeometry(sx, sy, sz), x, y, z, { rot: [o.tilt ?? 0, o.roll ?? 0, o.yaw ?? 0], order: 'ZXY' });
  const torus = (f, mat, x, y, z, R, r, arc = Math.PI * 2, o) => put(f, mat, new THREE.TorusGeometry(R, r, 8, 20, arc), x, y, z, o);
  const tube = (f, mat, pts, r = 0.02, o = {}) => {
    const c = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
    put(f, mat, new THREE.TubeGeometry(c, o.n ?? 24, r, 8, false));
  };
  const sphere = (f, mat, x, y, z, r, sz = 1) => { const g = new THREE.SphereGeometry(r, 16, 12); g.scale(1, sz, 1); put(f, mat, zUp(g), x, y, z); };

  // ---- Tableware ----
  const GLAZE = ['c#e9e3d6/0.25', 'c#8fa8a0/0.3', 'c#c9d3d6/0.25', 'c#d8c4a8/0.3', 'c#2f4a5a/0.3', 'c#b86b52/0.35', 'c#efe6d0/0.2'];
  // A plate lying flat, or standing on a rail leaning back against the wall (lean: radians from upright).
  function plate(f, x, y, z, r = 0.42, mat = 'c#ebe6dc/0.2', o = {}) {
    const prof = [[0, 0], [r * 0.55, 0], [r * 0.6, 0.012], [r, r * 0.13], [r * 0.985, r * 0.15], [r * 0.6, r * 0.05], [0, r * 0.06]];
    if (!o.stand) { lathe(f, mat, x, y, z, prof, 28); if (o.rim) lathe(f, o.rim, x, y, z + 0.002, [[r * 0.8, r * 0.085], [r * 0.93, r * 0.12], [r * 0.9, r * 0.125], [r * 0.77, r * 0.09]], 28); return; }
    const g = zUp(new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(a, b)), 28));
    g.rotateX(-Math.PI / 2 + (o.lean ?? 0.2));            // face out of the wall, leaning back
    const py = y + r * Math.sin(o.lean ?? 0.2) + 0.04;
    put(f, mat, g, x, py, z + r * Math.cos(o.lean ?? 0.2));
    if (o.rim) { const h = zUp(new THREE.LatheGeometry([[r * 0.78, r * 0.07], [r * 0.93, r * 0.12], [r * 0.9, r * 0.13], [r * 0.76, r * 0.08]].map(([a, b]) => new THREE.Vector2(a, b)), 28)); h.rotateX(-Math.PI / 2 + (o.lean ?? 0.2)); put(f, o.rim, h, x, py + 0.002, z + r * Math.cos(o.lean ?? 0.2)); }
  }
  const cupSaucer = (f, x, y, z, mat = 'c#ebe6dc/0.2', tea = 'c#7a4a22/0.15') => {
    plate(f, x, y, z, 0.2, mat);
    lathe(f, mat, x, y, z + 0.025, [[0, 0], [0.06, 0], [0.1, 0.06], [0.125, 0.17], [0.118, 0.17], [0.09, 0.07], [0, 0.07]], 20);
    lathe(f, tea, x, y, z + 0.025, [[0, 0.14], [0.112, 0.14], [0, 0.141]], 16);
    torus(f, mat, x + 0.15, y, z + 0.13, 0.04, 0.012, Math.PI * 2, { rot: [Math.PI / 2, 0, 0] });
  };
  const teapot = (f, x, y, z, mat = 'c#e9e3d6/0.2') => {
    lathe(f, mat, x, y, z, [[0, 0], [0.16, 0], [0.24, 0.1], [0.26, 0.2], [0.2, 0.36], [0.1, 0.4], [0.11, 0.43], [0.04, 0.47], [0.05, 0.5], [0, 0.51]], 22);
    tube(f, mat, [[x + 0.22, y, z + 0.12], [x + 0.36, y, z + 0.26], [x + 0.42, y, z + 0.4]], 0.03);
    torus(f, mat, x - 0.27, y, z + 0.24, 0.1, 0.022, Math.PI * 2, { rot: [Math.PI / 2, 0, 0] });
  };
  const glass = (f, x, y, z, drink) => {
    lathe(f, 'glass', x, y, z, [[0, 0], [0.09, 0], [0.1, 0.3], [0.095, 0.3], [0.085, 0.01], [0, 0.01]], 16);
    if (drink) lathe(f, drink, x, y, z + 0.012, [[0, 0], [0.083, 0], [0.09, 0.2], [0, 0.2]], 16);
  };
  const pitcher = (f, x, y, z, mat = 'glass', drink) => {
    lathe(f, mat, x, y, z, [[0, 0], [0.2, 0], [0.22, 0.25], [0.17, 0.55], [0.19, 0.72], [0.175, 0.72], [0.155, 0.56], [0.2, 0.25], [0.18, 0.02], [0, 0.02]], 22);
    if (drink) lathe(f, drink, x, y, z + 0.02, [[0, 0], [0.18, 0], [0.2, 0.25], [0.16, 0.45], [0, 0.45]], 20);
    torus(f, mat, x - 0.22, y, z + 0.42, 0.13, 0.025, Math.PI * 2, { rot: [Math.PI / 2, 0, 0] });
  };
  const bowl = (f, x, y, z, r = 0.4, mat = 'c#e9e3d6/0.3') => lathe(f, mat, x, y, z, [[0, 0], [r * 0.45, 0], [r, r * 0.55], [r * 0.95, r * 0.57], [r * 0.42, r * 0.06], [0, r * 0.06]], 26);
  // ---- Vases and pots ----
  const VASES = {
    jug: [[0, 0], [0.5, 0], [0.75, 0.25], [0.8, 0.5], [0.55, 0.85], [0.4, 0.95], [0.45, 1], [0.4, 1], [0, 0.98]],
    bottle: [[0, 0], [0.55, 0], [0.7, 0.35], [0.6, 0.6], [0.22, 0.75], [0.18, 0.95], [0.24, 1], [0.18, 1], [0, 0.97]],
    ginger: [[0, 0], [0.55, 0], [0.8, 0.3], [0.78, 0.65], [0.55, 0.85], [0.5, 0.92], [0.3, 0.98], [0.06, 1], [0, 1]],
    cylinder: [[0, 0], [0.62, 0], [0.62, 1], [0.56, 1], [0, 0.97]],
    bud: [[0, 0], [0.6, 0], [0.75, 0.2], [0.35, 0.6], [0.2, 0.85], [0.3, 1], [0.22, 1], [0, 0.95]],
    urn: [[0, 0], [0.45, 0], [0.4, 0.1], [0.3, 0.16], [0.7, 0.45], [0.75, 0.6], [0.5, 0.85], [0.55, 1], [0.48, 1], [0, 0.95]],
  };
  const vase = (f, x, y, z, tall, mat, kind = 'jug', wide = 0.4) => lathe(f, mat, x, y, z, VASES[kind].map(([r, h]) => [r * tall * wide, h * tall]), 24);
  // Flowers in a vase: a few stems with soft heads
  function bouquet(f, x, y, z, tall, colours, seed = 1, n = 9, spread = 0.22) {
    const r = rand(seed);
    for (let i = 0; i < n; i++) {
      const a = r() * 6.28, d = r() * spread, hh = tall * (0.75 + r() * 0.35), tx = x + Math.cos(a) * d, ty = y + Math.sin(a) * d;
      tube(f, 'c#4f6b3c/0.9', [[x + Math.cos(a) * 0.03, y + Math.sin(a) * 0.03, z], [x + Math.cos(a) * d * 0.4, y + Math.sin(a) * d * 0.4, z + hh * 0.6], [tx, ty, z + hh]], 0.01, { n: 6 });
      const c = colours[Math.floor(r() * colours.length)], s = 0.07 + r() * 0.05;
      sphere(f, c, tx, ty, z + hh + s * 0.4, s, 0.7);
      if (r() < 0.5) slab(f, 'c#5f7d48/0.9', x + Math.cos(a) * d * 0.6, y + Math.sin(a) * d * 0.6, z + hh * 0.7, 0.16, 0.02, 0.07, { yaw: a, tilt: 0.4 });
    }
  }
  // A snake plant: upright blades in a pot. Grows to `tall` feet above z.
  function snakePlant(f, x, y, z, tall = 3.4, pot = 'c#b8755a/0.8', seed = 3) {
    const r = rand(seed), pr = 0.55 * Math.min(1, tall / 3.4) + 0.12;
    lathe(f, pot, x, y, z, [[0, 0], [pr * 0.78, 0], [pr, pr * 1.6], [pr * 1.06, pr * 1.68], [pr * 0.96, pr * 1.7], [0, pr * 1.55]], 24);
    const top = z + pr * 1.6, n = 15;
    for (let i = 0; i < n; i++) {
      const a = r() * 6.28, d = r() * pr * 0.6, h = (tall - pr * 1.6) * (0.55 + r() * 0.45), w = 0.18 + r() * 0.1;
      const col = r() < 0.3 ? 'c#7a8a3a/0.75' : r() < 0.5 ? 'c#3f5a34/0.7' : 'c#4d6b3a/0.7';
      const blade = new THREE.CylinderGeometry(0.004, w / 2, h, 4, 1); blade.rotateY(Math.PI / 4); blade.scale(1, 1, 0.12); blade.translate(0, h / 2, 0);
      put(f, col, zUp(blade), x + Math.cos(a) * d, y + Math.sin(a) * d, top - 0.1, { rot: [(r() - 0.5) * 0.3, (r() - 0.5) * 0.2, r() * 3.14], order: 'ZXY' });
    }
  }
  // A trailing pothos in a pot, for shelves and sills.
  function pothos(f, x, y, z, s = 1, pot = 'c#e8e2d4/0.4', seed = 5) {
    const r = rand(seed);
    lathe(f, pot, x, y, z, [[0, 0], [0.18 * s, 0], [0.24 * s, 0.32 * s], [0.25 * s, 0.34 * s], [0, 0.32 * s]], 20);
    for (let i = 0; i < 18; i++) {
      const a = r() * 6.28, d = 0.1 + r() * 0.2, hh = 0.32 + r() * 0.25;
      slab(f, r() < 0.5 ? 'c#4f7a3a/0.6' : 'c#6f9a4a/0.6', x + Math.cos(a) * d * s, y + Math.sin(a) * d * s, z + hh * s, 0.17 * s, 0.12 * s, 0.02, { yaw: a, tilt: 0.5 });
    }
    for (let k = 0; k < 3; k++) {                          // trailing vines over the front edge
      const a = -0.6 + k * 0.6, px = x + Math.sin(a) * 0.15 * s;
      for (let j = 0; j < 5; j++) slab(f, 'c#5a8a40/0.6', px + Math.sin(a) * j * 0.05, y + 0.22 * s + j * 0.02, z + 0.25 * s - j * 0.16 * s, 0.13 * s, 0.02, 0.1 * s, { yaw: j, tilt: 1.2 });
    }
  }

  // ---- Clothes and shoes ----
  // A coat on a peg: (x, y) is the peg, top is where it hangs from.
  function coat(f, x, y, top, mat, len = 2.6, w = 1.35) {
    const d = 0.17, body = len - 0.3;
    const g = new THREE.CylinderGeometry(w * 0.4, w * 0.5, body, 18, 1); g.scale(1, 1, d / (w * 0.45)); g.translate(0, -body / 2, 0);   // an A-line body
    put(f, mat, zUp(g), x, y + 0.27, top - 0.3);
    const sh = new THREE.SphereGeometry(w * 0.44, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2); sh.scale(1, 0.32, d / (w * 0.44) * 1.05);   // rounded shoulders
    put(f, mat, zUp(sh), x, y + 0.27, top - 0.31);
    rbox(f, mat, x, y + 0.22, top - 0.16, 0.34, 0.2, 0.26, 0.09);                         // collar bunched on the hook
    for (const s of [-1, 1]) {
      const sl = new THREE.CylinderGeometry(0.1, 0.13, len * 0.55, 10, 1); sl.translate(0, -len * 0.275, 0);
      put(f, mat, zUp(sl), x + s * w * 0.43, y + 0.29, top - 0.36, { rot: [0, s * 0.07, 0] });
    }
    for (let i = 0; i < 3; i++) rbox(f, 'c#2a2520/0.4', x + w * 0.03, y + 0.27 + d - 0.005, top - 0.85 - i * 0.42, 0.07, 0.03, 0.07, 0.03);   // buttons
  }
  const scarf = (f, x, y, top, mat, len = 2.2) => {
    rbox(f, mat, x, y + 0.13, top - 0.1, 0.36, 0.18, 0.22, 0.08);
    rbox(f, mat, x - 0.1, y + 0.16, top - len / 2, 0.24, 0.07, len - 0.2, 0.03, { roll: 0.05 });
    rbox(f, mat, x + 0.12, y + 0.2, top - len * 0.42, 0.24, 0.07, len * 0.8 - 0.2, 0.03, { roll: -0.06 });
    for (const dx of [-0.1, 0.12]) for (let i = 0; i < 5; i++) f.box(mat, x + dx - 0.1 + i * 0.045, x + dx - 0.08 + i * 0.045, y + 0.15, y + 0.19, top - len * (dx < 0 ? 1 : 0.82) - 0.1, top - len * (dx < 0 ? 1 : 0.82) + 0.02);
  };
  const tote = (f, x, y, top, mat = 'linen#d8ccb0', print) => {
    torus(f, mat, x, y + 0.1, top - 0.35, 0.32, 0.025, Math.PI, { rot: [Math.PI / 2, 0, 0] });
    rbox(f, mat, x, y + 0.16, top - 0.35 - 0.65, 1.1, 0.16, 1.3, 0.05);
    if (print) sign(f, x, y + 0.245, top - 1.0, 0.7, 0.7, print, { cw: 256, ch: 256 });
  };
  const hat = (f, x, y, z, mat = 'wool#5a4a3a', band = 'c#2a2520/0.6') => {
    lathe(f, mat, x, y, z, [[0, 0], [0.48, 0], [0.5, 0.03], [0.32, 0.04], [0.3, 0.35], [0.2, 0.42], [0, 0.4]], 26);
    lathe(f, band, x, y, z + 0.04, [[0.315, 0], [0.31, 0.09], [0, 0.09]], 26);
  };
  // A pair of shoes, toes toward +y. kind: shoe, sneaker, boot, heel, slipper.
  function shoes(f, x, y, z, colour, kind = 'shoe', yaw = 0) {
    const len = kind === 'boot' ? 0.95 : 0.88, sole = kind === 'sneaker' ? 'c#efece4/0.6' : 'c#2a2420/0.6';
    for (const s of [-1, 1]) {
      const sx = x + s * 0.2 + (s > 0 ? 0.03 : 0), sy = y + (s > 0 ? 0.06 : 0), a = yaw + s * 0.05;
      const c = Math.cos(a), si = Math.sin(a), at = (dx, dy) => [sx + dx * c - dy * si, sy + dx * si + dy * c];
      const [ax, ay] = at(0, 0);
      rbox(f, sole, ax, ay, z + 0.035, 0.32, len, 0.07, 0.03, { yaw: a });
      if (kind === 'boot') {
        const [bx, by] = at(0, 0.1); rbox(f, colour, bx, by, z + 0.2, 0.3, len * 0.8, 0.3, 0.12, { yaw: a });
        const [hx, hy] = at(0, -0.22); rbox(f, colour, hx, hy, z + 0.75, 0.3, 0.36, 1.0, 0.1, { yaw: a });
      } else if (kind === 'heel') {
        const [bx, by] = at(0, 0.12); rbox(f, colour, bx, by, z + 0.13, 0.27, len * 0.6, 0.16, 0.08, { yaw: a });
        const [hx, hy] = at(0, -0.32); f.cyl(colour, hx, hy, z, z + 0.3, 0.03, 0.05, 8);
      } else {
        const [bx, by] = at(0, -0.02); rbox(f, colour, bx, by, z + 0.16, 0.29, len * 0.92, kind === 'slipper' ? 0.16 : 0.24, 0.11, { yaw: a });
        if (kind === 'sneaker') { const [lx, ly] = at(0, 0.12); rbox(f, 'c#efece4/0.7', lx, ly, z + 0.26, 0.16, 0.3, 0.04, 0.015, { yaw: a, tilt: -0.3 }); }
        const [ox, oy] = at(0, -0.18); rbox(f, 'c#2a2420/0.8', ox, oy, z + (kind === 'slipper' ? 0.2 : 0.27), 0.18, 0.28, 0.04, 0.015, { yaw: a });   // the opening
      }
    }
  }
  // A closed umbrella standing in something, tip at z.
  const umbrella = (f, x, y, z, colour, tall = 2.9, lean = 0.08, yaw = 0) => {
    const g = new THREE.CylinderGeometry(0.11, 0.015, tall * 0.62, 10); g.translate(0, tall * 0.31 + 0.12, 0);
    const shaft = new THREE.CylinderGeometry(0.016, 0.016, tall, 6); shaft.translate(0, tall / 2, 0);
    const crook = new THREE.TorusGeometry(0.1, 0.022, 6, 12, Math.PI); crook.rotateZ(Math.PI); crook.translate(-0.1, tall, 0);
    for (const [m, gg] of [[colour, g], ['c#2a2520/0.4', shaft], ['fir', crook]]) { zUp(gg); put(f, m, gg, x, y, z, { rot: [lean * Math.cos(yaw), lean * Math.sin(yaw), yaw], order: 'ZXY' }); }
  };
  // Folded blankets or towels in a stack.
  const folded = (f, x, y, z, w, d, mats) => mats.forEach((m, i) => rbox(f, m, x + (i % 2 ? 0.02 : -0.02), y, z + 0.09 + i * 0.17, w, d, 0.16, 0.07));
  // A woven basket (open), with an optional cushion inside.
  function basket(f, x, y, z, r = 0.8, tall = 0.6, mat = 'wicker', o = {}) {
    lathe(f, mat, x, y, z, [[0, 0], [r * 0.85, 0], [r, tall], [r * 1.04, tall + 0.04], [r * 0.96, tall + 0.05], [r * 0.9, 0.08], [0, 0.08]], 28);
    if (o.cushion) rbox(f, o.cushion, x, y, z + 0.2, r * 1.5, r * 1.5, 0.22, 0.1);
    if (o.cushion) lathe(f, o.cushion, x, y, z + 0.1, [[r * 0.78, 0], [r * 0.9, 0.25], [r * 0.8, 0.42], [r * 0.6, 0.3], [r * 0.6, 0.1]], 24);
  }
  // A rectangular woven basket (lidless).
  const boxBasket = (f, x, y, z, w, d, h, mat = 'wicker') => {
    f.box(mat, x - w / 2, x + w / 2, y - d / 2, y - d / 2 + 0.05, z, z + h); f.box(mat, x - w / 2, x + w / 2, y + d / 2 - 0.05, y + d / 2, z, z + h);
    f.box(mat, x - w / 2, x - w / 2 + 0.05, y - d / 2 + 0.05, y + d / 2 - 0.05, z, z + h); f.box(mat, x + w / 2 - 0.05, x + w / 2, y - d / 2 + 0.05, y + d / 2 - 0.05, z, z + h);
    f.box(mat, x - w / 2 + 0.05, x + w / 2 - 0.05, y - d / 2 + 0.05, y + d / 2 - 0.05, z, z + 0.04);
    f.box('c#5a4430/0.6', x - w / 2 - 0.01, x + w / 2 + 0.01, y - d / 2 - 0.01, y + d / 2 + 0.01, z + h - 0.06, z + h + 0.012);   // rim proud of the weave (no shared top face)
  };
  // A standing photo frame with a drawn photo; faces the frame's front.
  const photoFrame = (f, x, y, z, w, h, seed, mat = 'c#2a2520/0.4', kind) => {
    f.box(mat, x - w / 2, x + w / 2, y - 0.03, y + 0.02, z, z + h); f.box(mat, x - 0.04, x + 0.04, y - 0.18, y - 0.03, z, z + h * 0.6);
    sign(f, x, y + 0.025, z + h / 2, w - 0.08, h - 0.08, DRAWN.photo(seed, kind), { cw: 192, ch: 192 });
  };
  // An open book lying face up, spine along y.
  const openBook = (f, x, y, z, w = 0.95, d = 0.65, cover = 'c#6b2a25/0.7', yaw = 0) => {
    const c = Math.cos(yaw), s = Math.sin(yaw);
    rbox(f, cover, x, y, z + 0.015, w + 0.06, d + 0.05, 0.03, 0.01, { yaw });
    for (const k of [-1, 1]) rbox(f, 'c#f1ead8/0.9', x + k * w * 0.25 * c, y + k * w * 0.25 * s, z + 0.055, w * 0.48, d, 0.05, 0.02, { yaw, roll: -k * 0.08 });
  };
  const glasses = (f, x, y, z, yaw = 0, mat = 'c#2a2520/0.3') => {
    for (const s of [-1, 1]) torus(f, mat, x + s * 0.11 * Math.cos(yaw), y + s * 0.11 * Math.sin(yaw), z + 0.012, 0.075, 0.009, Math.PI * 2, { rot: [0, 0, yaw] });
    rbox(f, mat, x, y, z + 0.012, 0.06, 0.012, 0.012, 0.004, { yaw });
    for (const s of [-1, 1]) rbox(f, mat, x + s * 0.19 * Math.cos(yaw) - 0.2 * Math.sin(yaw), y + s * 0.19 * Math.sin(yaw) + 0.2 * Math.cos(yaw), z + 0.012, 0.014, 0.42, 0.012, 0.004, { yaw: yaw + s * 0.06 });
  };
  const lettersPile = (f, x, y, z, n = 4, seed = 1, yaw = 0) => {
    const r = rand(seed);
    for (let i = 0; i < n; i++) {
      const a = yaw + (r() - 0.5) * 0.6, dx = (r() - 0.5) * 0.15, dy = (r() - 0.5) * 0.1;
      sign(f, x + dx, y + dy, z + 0.006 + i * 0.006, 0.62, 0.36, DRAWN.letter(seed * 10 + i, i === n - 1 && r() < 0.5 ? 'letter' : 'env'), { flat: true, turn: a, cw: 192, ch: 112 });
    }
  };
  const book = (f, x, y, z, w, d, t, cover) => { rbox(f, cover, x, y, z + t / 2, w, d, t, 0.01); f.box('c#efe6d2/0.9', x - w / 2 + 0.03, x + w / 2 - 0.01, y - d / 2 + 0.01, y + d / 2 - 0.01, z + 0.012, z + t - 0.012); };

  return { put, lathe, rbox, slab, torus, tube, sphere, plate, cupSaucer, teapot, glass, pitcher, bowl, vase, bouquet, snakePlant, pothos, coat, scarf, tote, hat, shoes, umbrella, folded, basket, boxBasket, photoFrame, openBook, glasses, lettersPile, book, GLAZE, rand };
}

// ---- The shelves -------------------------------------------------------------------------------
export default function (kit) {
  const { model, nooks, sign, jarCandle, candle } = kit;
  const P = props(kit), r = rand(424242);
  // Models that suit a shelf, with their native height and width in feet (from CATALOG.md).
  const SMALL = [                                                    // light models only (under ~7k triangles)
    ['si_ecphora_fossil_shell', 0.24, 0.21], ['st_duck_decoy', 0.4, 0.38], ['horse_statue_01', 0.72, 0.54], ['Camera_01', 0.26, 0.7],
    ['seadogs_compass', 0.28, 0.27], ['st_ceramic_jar', 0.64, 0.62], ['alarm_clock_01', 0.57, 0.43], ['st_vase_4', 0.99, 0.46],
    ['wooden_bowl_02', 0.24, 0.43], ['lambis_shell', 0.15, 0.46],
  ];
  const used = new Map();
  const tryModel = (n, maxH, maxW) => {
    for (let k = 0; k < SMALL.length; k++) {
      const [id, h, w] = SMALL[(n + k) % SMALL.length];
      const s = Math.min(1, maxH / h, maxW / w);
      if (s < 0.55 || (used.get(id) ?? 0) >= 1) continue;
      used.set(id, (used.get(id) ?? 0) + 1);
      return [id, s];
    }
    return null;
  };
  let mi = 0;
  nooks.forEach((nk, i) => {
    const { f, x, y, z, w, clear } = nk;
    const room = w - 0.14, hh = clear - 0.12;
    if (room < 0.45 || hh < 0.4) return;
    const roll = r();
    if (roll < 0.12) return;                                         // leave some gaps honestly empty
    const by = y - 0.08;                                             // a little back from the shelf edge
    if (roll < 0.3 && mi < 9) {                                    // a collected curiosity
      const pick = tryModel(mi++ * 7 + i, hh, room);
      if (pick) { model(pick[0], f, x, y, z + 0.005, 0, { scale: pick[1], turn: (r() - 0.5) * 0.8 }); return; }
    }
    const kind = Math.floor(r() * 7);
    if (kind === 0 && hh > 0.7) {                                    // a vase, sometimes with stems
      const t = Math.min(hh - 0.05, 0.6 + r() * 0.35), m = P.GLAZE[Math.floor(r() * P.GLAZE.length)];
      P.vase(f, x, by, z, t, m, ['jug', 'bottle', 'ginger', 'bud', 'urn'][Math.floor(r() * 5)], Math.min(0.42, room / (t * 1.7)));
      if (r() < 0.4 && hh > t + 0.35) P.bouquet(f, x, by, z + t * 0.8, Math.min(0.5, hh - t - 0.05), ['c#e7c64a/0.8', 'c#f2ead8/0.8', 'c#d98c6a/0.8'], i, 5, 0.1);
    } else if (kind === 1 && hh > 0.55) {                            // a framed photograph
      const ph = Math.min(hh - 0.05, 0.62), pw = Math.min(room - 0.05, ph * 0.8);
      P.photoFrame(f, x, by, z, pw, ph, i * 13 + 1, r() < 0.5 ? 'c#2a2520/0.4' : BRASS, 'people');
    } else if (kind === 2 && hh > 0.45 && z > 1.2) {                 // a small plant (not on a bottom shelf: it trails to the floor)
      P.pothos(f, x, by - 0.05, z, Math.min(1, hh / 0.6, room / 0.6), P.GLAZE[Math.floor(r() * 4)], i);
    } else if (kind === 3 && hh > 0.45) {                            // a jar candle and a little dish
      jarCandle(f, x - Math.min(0.15, room / 4), by, z, { r: 0.14, tall: 0.3, label: ['c#c9a8b8/0.6', 'c#a8b8a0/0.6', 'c#e0c8a0/0.6'][Math.floor(r() * 3)], lid: false });
      if (room > 0.6) P.bowl(f, x + 0.2, by, z, 0.13, P.GLAZE[Math.floor(r() * P.GLAZE.length)]);
    } else if (kind === 4 && room > 0.7) {                           // books lying flat with a thing on top
      for (let k = 0; k < 3; k++) P.book(f, x, by, z + k * 0.1, Math.min(room - 0.05, 0.75), 0.55, 0.095, ['c#6b2a25/0.7', 'c#2f4a3a/0.7', 'c#d9cdb2/0.8', 'c#26364f/0.7'][(i + k) % 4]);
      if (hh > 0.6) P.lathe(f, P.GLAZE[i % P.GLAZE.length], x, by, z + 0.3, [[0, 0], [0.1, 0], [0.13, 0.12], [0.08, 0.2], [0, 0.21]], 16);
    } else if (kind === 5 && hh > 0.45) {                            // a little bowl of shells and stones
      P.bowl(f, x, by, z, Math.min(0.22, room / 3), 'c#b8755a/0.8');
      for (let k = 0; k < 4; k++) P.sphere(f, ['c#d9cdb2/0.5', 'c#8a8078/0.6', 'c#c9a890/0.5'][k % 3], x + (r() - 0.5) * 0.15, by + (r() - 0.5) * 0.1, z + 0.09, 0.045, 0.6);
    } else {                                                         // a turned wooden box or a stone egg
      P.lathe(f, ['fir', 'c#8a6a4a/0.5', 'c#c9c5bc/0.3'][Math.floor(r() * 3)], x, by, z, [[0, 0], [0.16, 0], [0.18, 0.08], [0.18, 0.14], [0.12, 0.2], [0.04, 0.22], [0, 0.22]], 20);
    }
  });
}
