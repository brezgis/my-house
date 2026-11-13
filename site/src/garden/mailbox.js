// The mailbox, outside the gate on the right of the mown way in, where the post would come: an
// American rural mailbox on a cedar post, painted deep green-blue, with a cream panel on the side
// hand-lettered "Anna's House" among painted forget-me-nots (no number: the address never
// appears), a red flag, and a climbing rose up the post.
//
// The flag is up when the guest book has notes this visitor has not read (guestbook.js asks the
// service once, when someone comes within fifty feet). E opens the little door and the guest book
// card; closing the card shuts the door. After posting a note the flag goes down.

import * as THREE from 'three';
import { PAINT } from './tools.js';
import { place, buildPart, swinger, ownPlants } from './little_library.js';
import { open as openGuestbook, peek, onChange, state as gb } from '../guestbook.js';

const AT = { x: 7.6, z: 70.8, yaw: -0.25 };       // the door looks down the way in, a little toward the lane
const Y0 = 3.42, R = 0.285, L = 0.86;               // the floor of the box, the radius of its arched top, half its length
const BODY = 'c#3f6b6a/0.5', INSIDE = 'c#6d706a/0.6/0.6', RED = 'c#b3352a/0.45', CEDAR = 'c#8a6f55/1';
const FONT = '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, serif';

// the D-shaped end of the box: straight sides, an arched top
const dShape = (r, h, Shape) => { const s = new Shape(); s.moveTo(-r, 0); s.lineTo(r, 0); s.lineTo(r, h); s.absarc(0, h, r, 0, Math.PI, false); s.lineTo(-r, 0); return s; };

export function buildMailbox(K) {
  const f = place(K, AT.x, 0, AT.z, AT.yaw), H = 0.36;
  // the post, its mounting board and brace
  f.box('timber', -0.16, 0.16, 0, Y0 - 0.12, -0.32, 0);
  f.box('timber', -0.24, 0.24, Y0 - 0.12, Y0 - 0.01, -L + 0.05, L - 0.08);
  f.beam('timber', [0, Y0 - 0.95, -0.02], [0, Y0 - 0.12, 0.52], 0.12, 0.1);
  // the box: floor, straight sides, the arched top (outside painted, inside bare metal), the back
  f.box(BODY, -R, R, Y0, Y0 + 0.025, -L, L);
  for (const s of [-1, 1]) { f.box(BODY, s * (R - 0.012), s * R, Y0, Y0 + H, -L, L); f.box(INSIDE, s * (R - 0.022), s * (R - 0.012), Y0 + 0.025, Y0 + H, -L + 0.02, L); }
  const arch = (r, mat, flip) => {
    const g = new THREE.CylinderGeometry(r, r, 2 * L, 20, 1, true, Math.PI / 2, Math.PI).toNonIndexed(); g.rotateX(Math.PI / 2); g.translate(0, Y0 + H, 0);
    if (flip) { const p = g.attributes.position.array, n = g.attributes.normal.array; for (let i = 0; i < p.length; i += 9) for (const a of [p, n]) for (let k = 0; k < 3; k++) { const t = a[i + 3 + k]; a[i + 3 + k] = a[i + 6 + k]; a[i + 6 + k] = t; } for (let i = 0; i < n.length; i++) n[i] = -n[i]; }
    f.geo(mat, g);
  };
  arch(R, BODY, false); arch(R - 0.012, INSIDE, true);
  f.prism(BODY, dShape(R, H, THREE.Shape), -L - 0.02, -L); f.box(BODY, -R, R, Y0, Y0 + 0.02, -L - 0.02, -L);
  // two pressed ribs round the body, and a rim at the mouth
  for (const z of [-L + 0.18, L - 0.22]) { const rib = new THREE.TorusGeometry(R + 0.006, 0.009, 4, 20, Math.PI); rib.translate(0, Y0 + H, z); f.geo(BODY, rib); for (const s of [-1, 1]) f.box(BODY, s * R - 0.009, s * R + 0.009, Y0, Y0 + H, z - 0.009, z + 0.009); }
  // letters waiting inside, seen when the door is down
  f.box('c#efe8d8/0.9', -0.16, 0.12, Y0 + 0.026, Y0 + 0.036, 0.1, 0.62, { rot: [0, 0.12, 0] });
  f.box('c#e8d9c0/0.9', -0.1, 0.18, Y0 + 0.037, Y0 + 0.047, 0.22, 0.7, { rot: [0, -0.2, 0] });
  f.box('c#c9a27a/0.9', -0.08, 0.06, Y0 + 0.048, Y0 + 0.05, 0.4, 0.52, { rot: [0, -0.2, 0] });      // its stamp side down; a wax seal
  // the side panel: "Anna's House", painted by hand among forget-me-nots
  f.sign((g, w, h) => {
    g.fillStyle = '#ece0c4'; g.beginPath(); g.roundRect?.(6, 6, w - 12, h - 12, 40); g.fill();
    g.strokeStyle = '#8a6a3a'; g.lineWidth = 3; g.stroke();
    g.fillStyle = '#2e4a4a'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `italic 74px ${FONT}`; g.fillText('Anna’s House', w / 2, h / 2 + 4);
    const flower = (x, y, s) => { g.fillStyle = '#6f93c9'; for (let i = 0; i < 5; i++) { const a = i * 1.2566; g.beginPath(); g.arc(x + Math.cos(a) * 6 * s, y + Math.sin(a) * 6 * s, 5 * s, 0, 7); g.fill(); } g.fillStyle = '#f0d060'; g.beginPath(); g.arc(x, y, 3 * s, 0, 7); g.fill(); };
    g.strokeStyle = '#5f7f4a'; g.lineWidth = 3; g.beginPath(); g.moveTo(30, h - 30); g.bezierCurveTo(60, h - 70, 40, 40, 90, 30); g.stroke(); g.beginPath(); g.moveTo(w - 30, 30); g.bezierCurveTo(w - 60, 70, w - 40, h - 40, w - 90, h - 30); g.stroke();
    for (const [x, y, s] of [[34, h - 36, 1], [58, 70, 0.8], [88, 32, 1.1], [w - 34, 36, 1], [w - 58, h - 70, 0.8], [w - 88, h - 32, 1.1]]) flower(x, y, s);
  }, 720, 170, 1.2, 0.28, -R - 0.004, Y0 + 0.19, -0.02, -Math.PI / 2);
  // a little painted bee on the flag side
  f.sign((g, w, h) => {
    g.fillStyle = '#ece0c4'; g.fillRect(0, 0, w, h); g.strokeStyle = '#8a6a3a'; g.lineWidth = 4; g.strokeRect(3, 3, w - 6, h - 6);
    g.fillStyle = 'rgba(240,240,250,.85)'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(w / 2 + s * 10, h / 2 - 16, 14, 9, s * 0.5, 0, 7); g.fill(); }
    g.fillStyle = '#e8b830'; g.beginPath(); g.ellipse(w / 2, h / 2 + 4, 24, 15, 0, 0, 7); g.fill();
    g.fillStyle = '#2a2420'; for (const dx of [-8, 6]) g.fillRect(w / 2 + dx, h / 2 - 10, 6, 28);
  }, 96, 80, 0.13, 0.11, R + 0.004, Y0 + 0.2, 0.42, Math.PI / 2);
  // the climbing rose: a stem winding up the post, a few flowers on it
  const vine = []; for (let i = 0; i <= 26; i++) { const t = i / 26, a = t * Math.PI * 5.2; vine.push([Math.cos(a) * 0.2, 0.05 + t * (Y0 - 0.25), -0.16 + Math.sin(a) * 0.2]); }
  for (let i = 0; i < vine.length - 1; i++) f.tube('c#4f6a3a/1', vine[i], vine[i + 1], 0.018, 4);
  ownPlants(K, 7312, F => {
    for (const [y, s] of [[0.3, 0.5], [1.1, 0.45], [1.9, 0.42], [2.6, 0.36], [3.0, 0.3]]) { const p = f.w(0.12, 0, -0.1); F.add('rose', p.x, p.z, s, { y, w: 1.8, h: 1.8 }); }
    for (const [x, z, k, s] of [[-0.6, 0.3, 'catmint', 0.65], [0.6, -0.5, 'wildflowers', 0.6], [0.3, 0.7, 'lavender', 0.6], [-0.5, -0.8, 'wildflowers', 0.55]]) { const p = f.w(x, 0, z); F.add(k, p.x, p.z, s); }
  });
  { const p = f.w(0.45, 0, 0.35); K.rock(PAINT.moss, p.x, 0.08, p.z, 0.4, 0.3, 0.35); }
  f.collide(-0.35, 0.35, -0.95, 0.95, 4.3);
  f.keepOut(-0.5, 0.5, -0.6, 0.4); f.keepOut(-1.6, 1.6, 0.95, 2.4); f.keepOut(-1.8, -0.75, -1.4, 0.95);      // the long grass kept off the front and the lane side

  // the door, hinged along its bottom edge
  const d = f.part(0, Y0, L + 0.002);
  d.prism(BODY, dShape(R + 0.012, H, THREE.Shape), 0, 0.028);
  d.box('c#a7a9a4/0.4/1', -0.035, 0.035, H + R - 0.02, H + R + 0.05, 0.028, 0.06);         // the latch tab
  // the flag, pivoting on the right side toward the back
  const fl = f.part(R + 0.012, Y0 + 0.2, -0.42);
  fl.box(RED, 0, 0.022, -0.05, 0.6, -0.025, 0.025); fl.box(RED, 0, 0.018, 0.4, 0.6, 0.02, 0.27);
  f.cyl('c#a7a9a4/0.4/1', R + 0.02, Y0 + 0.19, Y0 + 0.21, -0.42, 0.03, 0.03, 8);
  K.setups.push(ctx => mailboxLife(ctx, f, d, fl));
}

function mailboxLife(ctx, f, d, fl) {
  const door = buildPart(ctx, d, 'mailbox door'), flag = buildPart(ctx, fl, 'mailbox flag');
  const sd = swinger(ctx, door, 'x', 0, 1.62, 3), sf = swinger(ctx, flag, 'x', Math.PI / 2, 0, 2.2);
  const at = f.w(0, Y0 + 0.35, 0.95);
  let busy = false;
  ctx.interact.push({ x: at.x, y: at.y, z: at.z, reach: 6.5, size: 0.7,
    label: () => (gb.unread ? 'open the mailbox (the flag is up: new notes)' : 'open the mailbox: the guest book'),
    act: () => { if (busy) return; busy = true; sd.set(true); setTimeout(() => openGuestbook(() => { sd.set(false); busy = false; }).then(c => { if (!c) { sd.set(false); busy = false; } }), 120); } });
  onChange(s => sf.set(!!s.unread));
  // ask the guest book once, when someone first comes near
  if (gb.configured) { const cam = ctx.camera, near = setInterval(() => { if (cam.position.distanceToSquared(at) < 50 * 50) { clearInterval(near); peek(); } }, 1500); }
  if (new URLSearchParams(location.search).has('mailopen')) sd.set(true);
}
