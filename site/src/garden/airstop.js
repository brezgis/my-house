// The airship stop: Line 6 · Anna's House. A request stop in a garden: at the tip of the front lookout,
// where the mown way from the gate runs out to the edge of the island, one slim iron post at the brink
// with a round enamel stop flag, a brass bell on a little bracket (ring it and the airship comes), a
// small enamel timetable plate, a ribbon of a windsock tied to the top, and one tiny lantern. On the
// ground nothing but a patch worn in the grass and three flat stones. Dandelion does the rest herself:
// she comes down level with the lawn just off the brink and runs out her own gangplank to the grass.
// The other end of the line is the Landing on Vesper Street (~/projects/town_walk places.js), which
// has the full mast, shelter and boards; this post answers it in the same colours and the same hand.
//
// The bus and its flying are shared with the town (airship/bus.js, airship/ride.js); what is this island's
// is here: where the stop stands, the paths in and out, the pleasure flight round the island and what
// Dandelion points out on it.
//
// TRANSIT.town is the town's address. While it is empty the bus only goes round the island; with an
// address, boarding flies out into the clouds and on to TRANSIT.town + '?from=house' (with &time= if the
// visitor has moved the hour here, &quality= if they chose one). A visitor from the town comes with
// ?from=town (or ?from=vesper) and starts aboard, coming down out of cloud to the brink (main.js puts
// them in walking view; arrive() below does the rest), and steps off onto the lawn by the post.
//
// Test hooks: ?airship=docked | coming:0.5 | tour:0.4 | pass:0.5 | arrive:0.6 (with a ?view= for walking).
// Cost: the post is in the garden's shared painted mesh, its flag and plate in the garden's label sheet
// (with the little library's), its lantern in the garden's lantern glow; its own draws are the bell and
// the ribbon (two). The bus is one draw, built only when the bell is rung or a fly-past is due.

import * as THREE from 'three';
import { GLOW_WARM } from './tools.js';
import { wind, rng } from './cards.js';
import { makeAirship } from '../airship/ride.js';
import { DANDELION } from '../airship/bus.js';

export const TRANSIT = { town: 'https://town.brezgis.com/site/' };       // the town's address; empty: the line is not running yet

const Q = new URLSearchParams(location.search);
const LINE_HEX = '#2f4a40', IRON = 'c#3b3a35/0.6', RUST = 'c#6b4a32/0.9', BRASS = 'c#b89148/0.4';
// where things stand (world feet). The island's rim (where walking stops) is at z 109.6 here; the land
// rolls over its shoulder and sod lip within about 7 ft beyond that, so the bus's side stands 8.5 ft out
// (hull, wheels and ring clear of the turf) and its 9 ft gangplank reaches back over the shoulder to the grass.
const POST = { x: -3.2, z: 107.5, top: 7.3 }, BELL = { x: POST.x - 0.62, y: 5.72, z: POST.z };
export const AIRSTOP = {
  dock: { x: 6.7, y: 0.04, z: 122.15, yaw: -Math.PI / 2 },                     // broadside to the mown way, door at its end, nose to the south
  alight: { x: 0.3, y: 0, z: 106.4, yaw: 0 },                                   // set down on the lawn by the post, facing the house
  post: POST,
};
const LINEUP = [[46, 6, 122.3], [24, 1.5, 122.15]];

// ---- the stop, laid out with the garden's kit ---------------------------------------------------------
export function buildAirstop(K) {
  const r = rng(606), open = !!TRANSIT.town, { x: px, z: pz, top } = POST;
  const keep = (x0, x1, z0, z1) => (K.F.keepOut ??= []).push([x0, x1, z0, z1]);
  keep(-2.5, 3.5, 103.5, 112); keep(px - 1.2, px + 1.2, pz - 1.2, pz + 1.2);
  for (let i = K.trees.length - 1; i >= 0; i--) { const t = K.trees[i]; if (t.x > -34 && t.x < 24 && t.z > 82 && !t.y) K.trees.splice(i, 1); }      // nothing grows up into the bus's way
  // a patch worn in the grass where people stand and wait, and three flat stones out to it from the bench
  K.G.blob('soil', 0.4, 106.6, 2.0, 1.3, { y: 0.045, wobble: 0.4, seed: 66 });
  for (const [x, z, s] of [[-1.3, 99.6, 41], [-0.7, 102.4, 42], [0.0, 105.0, 43]]) K.G.blob('flagstone', x, z, 1.15, 0.85, { y: 0.09, wobble: 0.22, seed: s });
  // the post: slim, iron, a little weathered; a cast collar at its foot and a ball on top
  K.cyl(IRON, px, 0, 0.45, pz, 0.2, 0.15, 10); K.cyl(IRON, px, 0.45, top, pz, 0.075, 0.07, 8); K.sphere(IRON, px, top + 0.06, pz, 0.1, 1, 1);
  for (const [y, a] of [[1.3, 0.4], [2.6, 2.2], [4.9, 4.1], [6.1, 1.0]]) K.box(RUST, px + Math.cos(a) * 0.07 - 0.03, px + Math.cos(a) * 0.07 + 0.03, y, y + 0.16 + r() * 0.2, pz + Math.sin(a) * 0.07 - 0.03, pz + Math.sin(a) * 0.07 + 0.03);
  K.collide(px - 0.25, px + 0.25, pz - 0.25, pz + 0.25, top);
  // the bell's bracket, with a little curl; the lantern's on the other side
  K.box(IRON, BELL.x - 0.04, px, BELL.y + 0.32, BELL.y + 0.38, pz - 0.03, pz + 0.03); K.beam(IRON, [px, BELL.y - 0.1, pz], [px - 0.4, BELL.y + 0.33, pz], 0.04, 0.04);
  K.tube(IRON, [BELL.x, BELL.y + 0.32, pz], [BELL.x, BELL.y + 0.05, pz], 0.02, 4);
  K.box(IRON, px, px + 0.3, 5.42, 5.47, pz - 0.025, pz + 0.025); K.tube(IRON, [px + 0.28, 5.44, pz], [px + 0.28, 5.3, pz], 0.012, 3);
  // the lantern: a little iron cage, a cap and a foot, and the glass inside it (the garden's lantern glow: soft by day, warm after dark)
  { const lx = px + 0.28, ly = 5.13; K.put(GLOW_WARM, new THREE.CylinderGeometry(0.07, 0.07, 0.2, 8).translate(lx, ly, pz)); K.cyl(IRON, lx, ly + 0.11, ly + 0.17, pz, 0.12, 0.05, 8); K.cyl(IRON, lx, ly - 0.15, ly - 0.11, pz, 0.1, 0.1, 8);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.78; K.box(IRON, lx + Math.cos(a) * 0.1 - 0.012, lx + Math.cos(a) * 0.1 + 0.012, ly - 0.12, ly + 0.12, pz + Math.sin(a) * 0.1 - 0.012, pz + Math.sin(a) * 0.1 + 0.012); } }
  // the stop flag: a round enamel plate on the top, both faces
  const flag = (g, w, h) => {
    const c = w / 2; g.fillStyle = '#efe6d0'; g.fillRect(0, 0, w, h);
    g.fillStyle = LINE_HEX; g.beginPath(); g.arc(c, c, c, 0, 7); g.fill(); g.fillStyle = '#d2ae62'; g.beginPath(); g.arc(c, c, c * 0.93, 0, 7); g.fill(); g.fillStyle = LINE_HEX; g.beginPath(); g.arc(c, c, c * 0.89, 0, 7); g.fill();
    g.fillStyle = '#efe6d0'; g.beginPath(); g.arc(c, c * 1.1, c * 0.55, 0, 7); g.fill();
    T(g, 'AIRSHIP', c, c * 0.36, c * 0.2, '#efe6d0', { f: COND, ls: 4, b: 1 });
    T(g, '6', c, c * 1.12, c * 0.72, '#1d1b1a', { f: SERIF, b: 1 });
    T(g, open ? 'Vesper St.' : 'request stop', c, c * 1.8, c * 0.12, '#d2ae62', { f: TYPE });
  };
  for (const [dz, rotY] of [[-0.035, Math.PI], [0.035, 0]]) K.extras.push({ draw: flag, cw: 256, ch: 256, w: 1.2, h: 1.2, round: true, x: px + 0.68, y: top - 0.6, z: pz + dz, rotY, rough: 0.9 });
  K.box(IRON, px, px + 0.1, top - 0.66, top - 0.54, pz - 0.03, pz + 0.03);      // the flag stands off the post on a little lug
  // the timetable: one small enamel plate at eye height, toward the lawn
  K.box(IRON, px - 0.43, px + 0.43, 3.76, 5.0, pz - 0.1, pz - 0.075);
  K.extras.push({ draw: (g, w, h) => {
    g.fillStyle = '#efe6d0'; g.fillRect(0, 0, w, h); g.strokeStyle = LINE_HEX; g.lineWidth = 6; g.strokeRect(5, 5, w - 10, h - 10);
    g.fillStyle = LINE_HEX; g.fillRect(5, 5, w - 10, h * 0.17); T(g, 'LINE 6  ·  ANNA’S HOUSE', w / 2, h * 0.095, h * 0.06, '#efe6d0', { f: COND, ls: 1, b: 1 });
    const rows = open ? [['to', 'Vesper Street'], ['arrives', 'when rung'], ['departs', 'when aboard'], ['journey', 'one cloud'], ['fare', 'a nice thought']] : [['arrives', 'when rung'], ['today', 'round the island'], ['Vesper St.', 'soon'], ['fare', 'a nice thought']];
    rows.forEach(([a, b], i) => { const yy = h * (0.285 + i * (rows.length > 4 ? 0.112 : 0.13)); T(g, a, w * 0.09, yy, h * 0.045, '#2a1c13', { f: TYPE, a: 'left' }); T(g, b, w * 0.91, yy, h * 0.045, '#2a1c13', { f: TYPE, a: 'right' }); g.strokeStyle = 'rgba(42,28,19,.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(w * 0.09, yy + h * 0.045); g.lineTo(w * 0.91, yy + h * 0.045); g.stroke(); });
    T(g, 'Please keep your hands inside the sky.', w / 2, h * 0.86, h * 0.042, '#a8361f', { f: SERIF, it: 1 });
    for (const [x, y] of [[14, 14], [w - 14, 14], [14, h - 14], [w - 14, h - 14]]) { g.fillStyle = '#8a8478'; g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); }      // its four screws
  }, cw: 220, ch: 300, w: 0.84, h: 1.15, x: px, y: 4.38, z: pz - 0.11, rotY: Math.PI, rough: 0.9 });
  K.airstop = { ribbon: { x: px, y: top - 0.05, z: pz } };
  // a little wildness round the foot of the post
  for (const [x, z, rx, rz, n, kind] of [[px - 1.6, pz + 0.6, 1.0, 0.8, 4, 'wildflowers'], [px + 1.2, pz - 1.4, 0.8, 0.6, 3, 'catmint'], [-6.5, 104.5, 2, 1.5, 6, 'wildflowers']]) K.F.drift(kind, x, z, rx, rz, n, 0.8);
}

// ---- lettering for the boards (the house's fonts, with fallbacks for the town's faces) --------------------
const COND = '"Arial Narrow", "Helvetica Neue", Arial, sans-serif', TYPE = '"American Typewriter", "Courier New", Courier, monospace', SERIF = '"Goudy House", Georgia, serif';
function T(g, text, x, y, size, color, o = {}) {
  g.save(); g.fillStyle = color; g.textAlign = o.a ?? 'center'; g.textBaseline = 'middle';
  g.font = `${o.it ? 'italic ' : ''}${o.b ? 'bold ' : ''}${Math.round(size)}px ${o.f ?? SERIF}`;
  if (o.ls && 'letterSpacing' in g) g.letterSpacing = `${o.ls}px`;
  g.fillText(text, x, y); g.restore();
}
function paper(g, w, h) {
  g.fillStyle = '#efe7d2'; g.fillRect(0, 0, w, h);
  let s = 7; const rr = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(90,70,40,${0.03 + rr() * 0.04})`; g.fillRect(rr() * w, rr() * h, 1 + rr() * 2, 1 + rr() * 2); }
  g.strokeStyle = 'rgba(42,28,19,.35)'; g.lineWidth = 3; g.strokeRect(1.5, 1.5, w - 3, h - 3);
}

// ---- the things that move: windsock, bell, gate, and the airship itself ------------------------------------

// ---- the things that move: the ribbon, the bell, and the airship itself ------------------------------------
export function airstopLife(ctx, K) {
  const scene = ctx.scene, A = K.airstop;
  // a little windsock tied to the top of the post, red and cream as on the town's mast
  const wg = new THREE.CylinderGeometry(0.13, 0.05, 1.15, 8, 5, true); wg.rotateZ(Math.PI / 2); wg.translate(-0.6, 0, 0);
  const col = new Float32Array(wg.attributes.position.count * 3); for (let i = 0; i < wg.attributes.position.count; i++) { const k = Math.floor((-wg.attributes.position.getX(i)) / 0.24) % 2; col.set(k ? [0.85, 0.82, 0.74] : [0.72, 0.2, 0.12], i * 3); }
  wg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const sock = new THREE.Mesh(wg, new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.9 })); sock.position.set(A.ribbon.x, A.ribbon.y, A.ribbon.z); sock.name = 'airship ribbon'; scene.add(sock);
  // the bell: brass, on its bracket; it swings when rung
  const brass = new THREE.MeshStandardMaterial({ color: 0xb08d4a, roughness: 0.32, metalness: 1, envMapIntensity: 1 });
  const bellG = [new THREE.LatheGeometry([[0.02, 0], [0.12, -0.02], [0.2, -0.12], [0.24, -0.38], [0.36, -0.58], [0.4, -0.66], [0.38, -0.68]].map(([a, b]) => new THREE.Vector2(a * 0.62, b * 0.62)), 14), new THREE.SphereGeometry(0.05, 8, 6).translate(0, -0.37, 0), new THREE.CylinderGeometry(0.012, 0.012, 0.3, 5).translate(0, -0.22, 0), new THREE.TorusGeometry(0.05, 0.016, 5, 10).translate(0, 0.04, 0)];
  const bell = new THREE.Mesh(mergeAll(bellG), brass); bell.position.set(BELL.x, BELL.y, BELL.z); bell.name = 'airship bell'; scene.add(bell);
  let swing = 0, swingV = 0;

  const toast = t => window.houseUI?.toast?.(t);
  const say = t => toast(`${DANDELION.name}: ${t}`);
  // what to show while aboard, in place of "stand up" (main.js shows ctx.hint; toys.js sets it, so it is wrapped when needed)
  let hintText = null, prev = null; const mine = () => hintText ?? prev?.() ?? null;
  const hint = text => {
    hintText = text; const root = window.house?.ctx; if (!root) return;
    if (root.hint !== mine) { prev = root.hint; root.hint = mine; }
  };
  let h0 = null;
  const air = makeAirship(ctx, {
    dock: AIRSTOP.dock, alight: AIRSTOP.alight,
    approach: [[640, 175, 440], [300, 110, 260], [120, 40, 150], ...LINEUP],
    leave: [[-36, 8, 122], [-130, 50, 158], [-480, 160, 420], [-900, 230, 700]],
    tour: [
      // once round, just off the rim and high enough to see it all, the island always on the right (the window side)
      { p: [-40, 28, 130] }, { p: [-56, 70, 124] }, { p: [-120, 105, 72] },
      { p: [-153, 105, 2], say: 'Below us, the koi pond. From up here the koi look very small. Do not tell them.' },
      { p: [-150, 72, -63], say: 'There is the chapel. The starlings on the vane are pointing at us. They do that.' },
      { p: [-121, 140, -162] }, { p: [-5, 150, -209] },
      { p: [107, 125, -158], say: 'The kitchen garden. If Bramble waves, wave back; it costs nothing.' },
      { p: [140, 130, -63] }, { p: [136, 125, 27] },
      { p: [95, 105, 105], say: 'And the house. Somebody has left a light on. Somebody always does.' },
      { p: [78, 42, 132] }, ...LINEUP.map(p => ({ p })),
    ],
    transit: { url: TRANSIT.town, cloud: [[-40, 14, 127], [-150, 90, 285], [-330, 260, 620], [-520, 470, 980]], query: () => {
      let q = '?from=house'; const H = window.house;
      if (H && (Q.has('time') || (h0 !== null && Math.abs(H.hour - h0) > 0.01))) q += `&time=${(((H.hour % 24) + 24) % 24).toFixed(2)}`;
      const qv = H?.quality?.get?.(); if (['low', 'medium', 'high'].includes(qv)) q += `&quality=${qv}`;
      return q;
    } },
    arrive: [[640, 420, 900], [380, 230, 560], [170, 70, 240], ...LINEUP],
    passes: [[[-1100, 230, -520], [-200, 260, -760], [900, 220, -560]], [[1000, 170, 560], [100, 210, 780], [-1000, 190, 500]], [[-760, 150, 320], [-700, 180, -300], [-560, 200, -900]]],
    blind: { tour: 'ROUND THE ISLAND', transit: 'VESPER STREET', home: 'ANNA’S HOUSE' },
    secs: { tour: 115 },
    lines: { welcome: ['Anna’s House. The bungalow under the oaks. Mind the step.'] },
    lookOnBoard: -1.4, pitchOnBoard: -0.2, pitchOnTour: -0.62, lookOnArrive: -1.3, pitchOnArrive: -0.35,      // aboard, the window on the island side; aloft, the view tips down to it
    say, hint, bus: { plank: 9, drop: 0 },
    hintAboard: 'Esc · back to the stop · any step stands you up, and you can walk about',
    onStart: () => { h0 = window.house?.hour ?? null; },
  });
  window.__airship = air;

  ctx.interact.push({ x: BELL.x, y: BELL.y - 0.2, z: BELL.z, reach: 7, size: 0.9, label: () => 'ring for the airship', act: () => {
    ctx.sound?.note?.(81, 0, 2.4, 0.2); ctx.sound?.note?.(88, 0.02, 2.0, 0.08); swingV += 2.4;
    const r = air.call();
    if (r === 'rung') toast('The bell rings out across the sky. Somewhere, something yellow turns round.');
  } });
  // Boarding is on foot: walk up her gangplank from the grass (airship/ride.js). Esc asks her to turn back.
  addEventListener('keydown', e => { if (e.code === 'Escape' && air.aboard) air.getOff(); });

  ctx.animated.push((t, dt) => {
    sock.rotation.y = -2.1 + 0.35 * Math.sin(wind.value * 0.4) + 0.1 * Math.sin(wind.value * 1.7); sock.rotation.z = 0.5 + 0.15 * Math.sin(wind.value * 1.1);
    swingV += (-swing * 30 - swingV * 1.6) * dt; swing += swingV * dt; bell.rotation.z = swing * 0.35;
    if (hintText) { const root = window.house?.ctx; if (root && root.hint !== mine) { prev = root.hint; root.hint = mine; } }      // toys.js may have set its own since
  });

  // a visitor from Vesper Street arrives aboard; test views
  const from = Q.get('from'), stage = Q.get('airship');
  if (from === 'town' || from === 'vesper') setTimeout(() => air.arrive(), 0);
  else if (stage) setTimeout(() => { const [n, k] = stage.split(':'); air.stage(n, Number(k ?? 0.5)); }, 0);
}

function mergeAll(list) {
  const parts = list.map(g => { const q = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(q.attributes)) if (!['position', 'normal'].includes(k)) q.deleteAttribute(k); return q; });
  const n = parts.reduce((a, g) => a + g.attributes.position.count, 0), pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
  for (const g of parts) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); return out;
}
