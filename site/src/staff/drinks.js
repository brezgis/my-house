// The drinks menu and the vessels drinks come in. Each drink is a small group:
// china or metal parts (one vertex-coloured mesh), glass (one see-through mesh)
// and the liquid (one mesh, scaled from the bottom so it can fill while it is
// being made, and drained when it is finished). Units are feet.

import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { paint } from './models.js';

let THREE, glassMat, solidMat;
export function useThreeDrinks(T) { THREE = T; }

// h: hours when it is offered (24+ wraps past midnight). from: where it is made.
export const MENU = [
  { id: 'espresso', name: 'espresso', from: 'bar', vessel: 'demitasse', liquid: 0x3b2416, h: [6, 18], prep: 4, note: 'a short black, crema like velvet' },
  { id: 'latte', name: 'latte', from: 'bar', vessel: 'latte', liquid: 0xc9a27a, h: [6, 17], prep: 6, note: 'with a little heart on top' },
  { id: 'phin', name: 'Vietnamese iced coffee', from: 'bar', vessel: 'phin', liquid: 0x3a2214, h: [8, 18], prep: 8, note: 'dripped through a phin onto condensed milk, over ice' },
  { id: 'tea', name: 'cup of Earl Grey', from: 'bar', vessel: 'teacup', liquid: 0x9a5a2a, h: [6, 21], prep: 5, note: 'bergamot and a sliver of lemon' },
  { id: 'jasmine', name: 'jasmine tea', from: 'bar', vessel: 'teacup', liquid: 0xc9b25a, h: [10, 22], prep: 5, note: 'pale, fragrant, very calming' },
  { id: 'apple', name: 'apple juice', from: 'kitchen', vessel: 'tumbler', liquid: 0xd99a2b, h: [6, 20], prep: 3, note: 'pressed from the garden trees' },
  { id: 'sparkling', name: 'sparkling water', from: 'kitchen', vessel: 'highball', liquid: 0xcfe3e6, h: [0, 30], prep: 3, note: 'with lemon, very bubbly' },
  { id: 'wine', name: 'glass of red wine', from: 'kitchen', vessel: 'wine', liquid: 0x5a0f1c, h: [17, 26], prep: 4, note: 'something French and opinionated' },
  { id: 'oldfashioned', name: 'old fashioned', from: 'bar', vessel: 'rocks', liquid: 0xb0601e, h: [18, 26], prep: 6, note: 'one big cube, a twist of orange' },
  { id: 'chamomile', name: 'chamomile tea', from: 'bar', vessel: 'teacup', liquid: 0xd9b85a, h: [19, 29], prep: 5, note: 'for sleeping like a cat' },
  { id: 'cocoa', name: 'hot cocoa', from: 'kitchen', vessel: 'mug', liquid: 0x5a3020, h: [18, 30], prep: 5, note: 'with marshmallows, obviously' },
];
// What the gardeners can offer: picked on the spot, or lemonade fetched from the kitchen door
export const GARDEN_GIFTS = [
  { id: 'strawberry', name: 'strawberry', vessel: 'strawberry', gift: true, from: 'here', liquid: 0xc8202a, note: 'sun-warm, from the bed by the glasshouse', done: 'You eat the strawberry. It tastes of July.', last: 25 },
  { id: 'tomato', name: 'cherry tomato', vessel: 'tomato', gift: true, from: 'here', liquid: 0xd8321e, note: 'a Sungold, still warm', done: 'You eat the tomato. It bursts, sweet and green-smelling.', last: 25 },
  { id: 'sweetpea', name: 'sweet pea', vessel: 'flower', gift: true, from: 'here', liquid: 0xc77ab8, note: 'the scented sort', done: 'You tuck the sweet pea into your buttonhole.', last: 90 },
  { id: 'lemonade', name: 'glass of lemonade', vessel: 'highball', from: 'kitchenDoor', liquid: 0xf2e08a, h: [0, 30], prep: 4, note: 'fresh from the kitchen door, lemons from the tree' },
];
export function drinksFor(hour) {
  const h = hour < 6 ? hour + 24 : hour;
  return MENU.filter(d => h >= d.h[0] && h < d.h[1]);
}
// Three things to offer at this hour, the robot's favourites first
export function menuFor(hour, likes, rnd) {
  const ok = drinksFor(hour).sort(() => rnd() - 0.5);
  ok.sort((a, b) => (likes.includes(b.id) ? 1 : 0) - (likes.includes(a.id) ? 1 : 0));
  const out = ok.slice(0, 2);
  const calm = ok.find(d => !out.includes(d) && ['sparkling', 'apple', 'jasmine', 'chamomile', 'tea'].includes(d.id));
  if (calm) out.push(calm); else if (ok[2]) out.push(ok[2]);
  return out;
}

// ---- vessels --------------------------------------------------------------------------------
const lathe = (pts, seg = 24) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
const tf = (g, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) => g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...s)));
const clean = g => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) n.deleteAttribute(k); if (!n.attributes.uv) n.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2)); return n; };
const CHINA = '#f4f0e8', STEEL = '#b9bcc0';

function latteArt() {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#b07a48'; g.fillRect(0, 0, 128, 128);
  const gr = g.createRadialGradient(64, 64, 10, 64, 64, 64); gr.addColorStop(0, 'rgba(176,122,72,0)'); gr.addColorStop(1, 'rgba(120,70,35,.9)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#f3e6d0'; g.beginPath(); g.moveTo(64, 92); g.bezierCurveTo(14, 60, 36, 22, 64, 46); g.bezierCurveTo(92, 22, 114, 60, 64, 92); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
let artTex = null;

export function buildDrink(d) {
  glassMat ??= new THREE.MeshStandardMaterial({ color: 0xe8f2f4, roughness: 0.04, metalness: 0, transparent: true, opacity: 0.32, depthWrite: false, envMapIntensity: 1.6 });
  solidMat ??= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.25, metalness: 0.05, envMapIntensity: 1 });
  const solid = [], glass = [], liquid = [], extras = new THREE.Group();
  const clear = d.id === 'sparkling';
  const liqMat = new THREE.MeshStandardMaterial({ color: d.liquid, roughness: 0.1, envMapIntensity: 0.8, transparent: clear, opacity: clear ? 0.35 : 1, depthWrite: !clear });
  let top = 0.2, fillH = 0.1;
  const saucer = (r = 0.17) => solid.push(paint(lathe([[0, 0], [r * 0.6, 0.004], [r, 0.02], [r * 1.02, 0.03], [r * 0.6, 0.016], [0, 0.016]], 26), CHINA));
  const handle = (x, y, r, t) => solid.push(paint(tf(new THREE.TorusGeometry(r, t, 6, 12, Math.PI * 1.3), [x, y, 0], [0, 0, -Math.PI * 0.65]), CHINA));
  switch (d.vessel) {
    case 'demitasse': {
      saucer(0.13);
      solid.push(paint(tf(lathe([[0, 0], [0.035, 0], [0.04, 0.01], [0.06, 0.06], [0.064, 0.11], [0.058, 0.11], [0.054, 0.06], [0.03, 0.025], [0, 0.025]]), [0, 0.016, 0]), CHINA));
      handle(0.07, 0.085, 0.022, 0.007);
      liquid.push(tf(new THREE.CylinderGeometry(0.056, 0.036, 0.075, 18).translate(0, 0.0375, 0), [0, 0.04, 0]));
      fillH = 0.075; top = 0.13; break;
    }
    case 'latte': {
      saucer(0.18);
      solid.push(paint(tf(lathe([[0, 0], [0.05, 0], [0.06, 0.01], [0.11, 0.07], [0.125, 0.13], [0.118, 0.13], [0.103, 0.07], [0.05, 0.022], [0, 0.022]]), [0, 0.016, 0]), CHINA));
      handle(0.13, 0.1, 0.03, 0.009);
      liquid.push(tf(new THREE.CylinderGeometry(0.116, 0.06, 0.1, 22).translate(0, 0.05, 0), [0, 0.04, 0]));
      artTex ??= latteArt();
      const art = new THREE.Mesh(new THREE.CircleGeometry(0.113, 24), new THREE.MeshStandardMaterial({ map: artTex, roughness: 0.4 }));
      art.rotation.x = -Math.PI / 2; art.position.y = 0.141; art.name = 'art'; extras.add(art);
      fillH = 0.1; top = 0.16; break;
    }
    case 'teacup': {
      saucer(0.17);
      solid.push(paint(tf(lathe([[0, 0], [0.04, 0], [0.05, 0.012], [0.1, 0.05], [0.115, 0.09], [0.108, 0.09], [0.093, 0.05], [0.045, 0.022], [0, 0.022]]), [0, 0.016, 0]), CHINA));
      solid.push(paint(tf(new THREE.TorusGeometry(0.111, 0.004, 4, 26), [0, 0.104, 0], [Math.PI / 2, 0, 0]), '#c9a45c'));     // a gilt rim
      handle(0.12, 0.07, 0.026, 0.008);
      liquid.push(tf(new THREE.CylinderGeometry(0.104, 0.05, 0.065, 22).translate(0, 0.0325, 0), [0, 0.04, 0]));
      if (d.id === 'tea') solid.push(paint(tf(new THREE.CylinderGeometry(0.035, 0.035, 0.006, 12), [0.03, 0.108, 0.02]), '#e8d44a'));
      fillH = 0.065; top = 0.12; break;
    }
    case 'mug': {
      solid.push(paint(lathe([[0, 0], [0.085, 0], [0.09, 0.01], [0.09, 0.22], [0.082, 0.22], [0.082, 0.012], [0, 0.012]]), '#b85c4a'));
      handle(0.1, 0.11, 0.045, 0.014);
      liquid.push(new THREE.CylinderGeometry(0.081, 0.081, 0.19, 20).translate(0, 0.095, 0).translate(0, 0.012, 0));
      for (let i = 0; i < 4; i++) solid.push(paint(tf(new THREE.BoxGeometry(0.035, 0.03, 0.035), [-0.035 + (i % 2) * 0.05, 0.205, -0.02 + (i >> 1) * 0.04], [0.2, i, 0.1]), '#fbf6ee'));
      fillH = 0.19; top = 0.25; break;
    }
    case 'tumbler': {
      glass.push(lathe([[0, 0], [0.085, 0], [0.095, 0.24], [0.088, 0.24], [0.078, 0.02], [0, 0.02]]));
      liquid.push(new THREE.CylinderGeometry(0.086, 0.077, 0.17, 20).translate(0, 0.085, 0).translate(0, 0.02, 0));
      fillH = 0.17; top = 0.26; break;
    }
    case 'highball': {
      glass.push(lathe([[0, 0], [0.075, 0], [0.08, 0.4], [0.073, 0.4], [0.069, 0.025], [0, 0.025]]));
      liquid.push(new THREE.CylinderGeometry(0.071, 0.068, 0.32, 18).translate(0, 0.16, 0).translate(0, 0.025, 0));
      for (let i = 0; i < 10; i++) solid.push(paint(tf(new THREE.SphereGeometry(0.008, 5, 4), [Math.sin(i * 2.4) * 0.04, 0.05 + i * 0.028, Math.cos(i * 2.4) * 0.04]), '#ffffff'));
      solid.push(paint(tf(new THREE.CylinderGeometry(0.055, 0.055, 0.01, 16), [0.02, 0.34, 0], [0, 0, 1.3]), '#e8d44a'));
      solid.push(paint(tf(new THREE.CylinderGeometry(0.008, 0.008, 0.5, 6), [-0.025, 0.36, 0], [0, 0, 0.18]), '#f1ece2'));
      fillH = 0.32; top = 0.42; break;
    }
    case 'phin': {
      glass.push(lathe([[0, 0], [0.072, 0], [0.08, 0.36], [0.073, 0.36], [0.066, 0.02], [0, 0.02]]));
      solid.push(paint(new THREE.CylinderGeometry(0.066, 0.064, 0.05, 18).translate(0, 0.045, 0), '#efe2c4'));          // condensed milk
      liquid.push(new THREE.CylinderGeometry(0.067, 0.066, 0.24, 18).translate(0, 0.12, 0).translate(0, 0.07, 0));
      for (let i = 0; i < 5; i++) glass.push(tf(new THREE.BoxGeometry(0.05, 0.05, 0.05), [Math.sin(i * 2.1) * 0.025, 0.14 + i * 0.045, Math.cos(i * 2.1) * 0.025], [i, i * 0.7, 0]));
      solid.push(paint(tf(new THREE.CylinderGeometry(0.008, 0.008, 0.48, 6), [0.03, 0.32, 0], [0, 0, -0.16]), '#2b5b4a'));
      // the phin itself sits on the glass while the coffee drips through
      const phin = new THREE.Mesh(clean(mergeGeometries([
        paint(lathe([[0, 0], [0.05, 0], [0.055, 0.1], [0.05, 0.1], [0.046, 0.006], [0, 0.006]], 18), STEEL),
        paint(tf(new THREE.CylinderGeometry(0.1, 0.1, 0.008, 22), [0, 0.004, 0]), STEEL),
        paint(tf(new THREE.CylinderGeometry(0.058, 0.058, 0.012, 18), [0, 0.106, 0]), STEEL),
        paint(tf(new THREE.SphereGeometry(0.015, 8, 5), [0, 0.12, 0]), STEEL),
      ].map(clean))), solidMat);
      phin.position.y = 0.36; phin.name = 'phin'; extras.add(phin);
      const drip = new THREE.Mesh(new THREE.SphereGeometry(0.008, 6, 4), liqMat); drip.name = 'drip'; extras.add(drip);
      fillH = 0.24; top = 0.4; break;
    }
    case 'strawberry': {
      solid.push(paint(tf(new THREE.SphereGeometry(0.07, 12, 9), [0, 0.07, 0], [Math.PI, 0, 0], [1, 1.25, 1]).translate(0, 0, 0), p => (p.y > 0.13 ? '#3f7a32' : '#c8202a')));
      for (let i = 0; i < 5; i++) solid.push(paint(tf(new THREE.ConeGeometry(0.025, 0.07, 4), [Math.cos(i * 1.26) * 0.035, 0.155, Math.sin(i * 1.26) * 0.035], [Math.sin(i * 1.26) * 1.2, 0, -Math.cos(i * 1.26) * 1.2]), '#3f7a32'));
      top = 0.17; break;
    }
    case 'tomato': {
      solid.push(paint(tf(new THREE.SphereGeometry(0.07, 12, 9), [0, 0.065, 0], [0, 0, 0], [1, 0.88, 1]), '#e0a020'));
      solid.push(paint(tf(new THREE.SphereGeometry(0.065, 12, 9), [0.11, 0.06, 0.02], [0, 0, 0], [1, 0.88, 1]), '#d8321e'));
      for (let i = 0; i < 5; i++) solid.push(paint(tf(new THREE.BoxGeometry(0.06, 0.006, 0.014), [Math.cos(i * 1.26) * 0.025, 0.125, Math.sin(i * 1.26) * 0.025], [0, -i * 1.26, 0]), '#3f7a32'));
      top = 0.13; break;
    }
    case 'flower': {
      solid.push(paint(tf(new THREE.CylinderGeometry(0.008, 0.01, 0.5, 5), [0, 0.25, 0], [0.15, 0, 0.1]), '#4f7a3a'));
      for (let i = 0; i < 4; i++) solid.push(paint(tf(new THREE.SphereGeometry(0.045, 8, 6), [0.04 + Math.cos(i * 1.6) * 0.03, 0.5 + i * 0.012, 0.03 + Math.sin(i * 1.6) * 0.03], [i, 0, 0.5], [1.2, 0.5, 1]), ['#c77ab8', '#e3a1cf', '#a65aa0', '#f0c2de'][i]));
      solid.push(paint(tf(new THREE.SphereGeometry(0.05, 6, 4), [-0.04, 0.28, 0], [0, 0, 0.6], [1.5, 0.15, 0.7]), '#5f8a42'));
      top = 0.55; break;
    }
    case 'wine': {
      glass.push(lathe([[0, 0], [0.075, 0], [0.075, 0.008], [0.01, 0.014], [0.008, 0.16], [0.05, 0.19], [0.085, 0.26], [0.07, 0.36], [0.066, 0.36], [0.08, 0.26], [0.046, 0.195], [0.008, 0.175]], 22));
      liquid.push(lathe([[0, 0], [0.04, 0.018], [0.072, 0.07], [0.079, 0.1], [0, 0.1]], 20).translate(0, 0.17, 0));
      fillH = 0.1; top = 0.36; break;
    }
    case 'rocks': {
      glass.push(lathe([[0, 0], [0.1, 0], [0.104, 0.2], [0.097, 0.2], [0.093, 0.03], [0, 0.03]]));
      liquid.push(new THREE.CylinderGeometry(0.094, 0.092, 0.11, 20).translate(0, 0.055, 0).translate(0, 0.03, 0));
      glass.push(tf(new THREE.BoxGeometry(0.11, 0.11, 0.11), [0, 0.1, 0], [0.15, 0.4, 0.1]));
      solid.push(paint(tf(new THREE.BoxGeometry(0.11, 0.012, 0.03), [0.03, 0.2, 0.02], [0.3, 0.6, 0.5]), '#e07a22'));
      fillH = 0.11; top = 0.22; break;
    }
  }
  const g = new THREE.Group(); g.userData.staff = true;
  if (solid.length) g.add(new THREE.Mesh(mergeGeometries(solid.map(clean)), solidMat));
  const liq = new THREE.Group(); liq.name = 'liquid'; g.add(liq);
  if (liquid.length) liq.add(new THREE.Mesh(mergeGeometries(liquid.map(clean)), liqMat));
  if (glass.length) { const m = new THREE.Mesh(mergeGeometries(glass.map(clean)), glassMat); m.renderOrder = 3; g.add(m); }
  g.add(extras);
  g.traverse(o => { o.castShadow = o.receiveShadow = false; o.userData.staff = true; });
  g.userData.drink = d; g.userData.top = top;
  setFill(g, 1);
  return g;
}

// 0 empty .. 1 full. While making, the phin drips and the latte art waits for the end.
export function setFill(g, f, t = 0) {
  const liq = g.getObjectByName('liquid'); if (!liq) return;
  const k = Math.max(0.02, f); liq.scale.set(1, k, 1); liq.visible = f > 0.03;
  const art = g.getObjectByName('art'); if (art) { art.visible = f > 0.97; }
  const phin = g.getObjectByName('phin'), drip = g.getObjectByName('drip');
  if (phin) phin.visible = f < 0.99 && g.userData.making;
  if (drip) { drip.visible = !!g.userData.making && f < 0.99; drip.position.set(0, 0.35 - ((t * 1.6) % 1) * (0.33 - 0.25 * f), 0); }
}
