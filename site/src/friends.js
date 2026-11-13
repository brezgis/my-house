// The telephone in the front hall, and the friends it brings round.
//
// On a little oak stand at the foot of the stair stands a candlestick telephone. Use it
// (E, click or tap) for a small card: who to ring, who is already here, and who to ask
// to head home. Three friends can come, all at once if you like:
//
//   Professor Feynbot   a curious physicist robot with a pair of bongos (an affectionate
//                       homage to a certain physicist; not him, and he says so)
//   Geneva                a warm, gossipy best friend who runs on coffee (entirely invented)
//   nanoKarpathy        a cheerful explainer of neural nets, from scratch (an affectionate
//                       homage to a certain AI researcher; not him, and he says so)
//
// They arrive at the front door, come in, keep you company from room to room, wander off
// to the things they like, talk among themselves, dance if asked, and answer whatever you
// type (keyword matching: friends/brain.js; every line is in friends/cast.js). No network,
// no AI service: everything they say was written for this house.
//
// Cost: until somebody is rung this file adds three small meshes (the stand and telephone,
// its receiver, a soft shadow) and one thing to use; nothing runs per frame. The rest
// (friends/party.js, bodies.js, ui.js and the staff modules they borrow) loads on the first ring.
//
// Test hooks (with view=...):
//   ?friends=0                 no telephone, no friends
//   ?friends=phone             the telephone card, open         ?friends=phone:gigi   ...having rung Geneva
//   ?friends=demo              all three posed in front of the camera, saying hello  (demo:feyn,gigi for some)
//   ?friends=coffee            posed, each at their own fidget (bongos, coffee, typing)
//   ?friends=dance             posed, dancing
//   ?friends=chat:gigi:any gossip?     posed, with the conversation card open and that line said
//   ?friends=talk:gigi:any gossip?     the same, but live: the party runs on (&walkaway=6: after six seconds she turns and
//                                      walks off, to see the card and the bubble fade)
//   ?friends=here              rung and let in for real; ?friendtime=40 runs the party that many seconds first
//   ?friends=ring:nano         rung this instant (arrives at the porch at once)
//   ?friendseed=7              fix the dice
// Logic tests: site/friendtest.html (the house without rendering); the conversation engine
// runs under node (see the top of friends/brain.js).

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { F1 } from './house.js';

const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
const PLAN_W = 43.33, wx = X => X - PLAN_W / 2, wz = Y => -Y;
// The stand: plan X 22.78-23.62, Y 5.44-6.44, against the open balustrade at the foot of the
// stair, between the newel post and the snake plant (which already stands this far into the hall).
const AT = { X: 23.2, Y: 5.94, w: 1.0, d: 0.84, top: 2.5 };

export function setupFriends(ctx) {
  const phone = buildPhone(ctx);
  let ui = null, party = null, loading = null;
  const seed = Q.get('friendseed');
  if (seed) { let s = Number(seed) >>> 0 || 1; ctx.friendsRnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

  const loadUI = () => (ui ? Promise.resolve(ui) : import('./friends/ui.js').then(m => (ui ??= m.makeUI({ canvas: ctx.renderer?.domElement }))));
  const loadParty = () => (loading ??= loadUI().then(() => import('./friends/party.js')).then(m => (party = m.makeParty(ctx, ui))));
  // Before anybody has been rung the card only needs names; cast.js is plain data
  let cast = null;
  const loadCast = () => (cast ? Promise.resolve(cast) : import('./friends/cast.js').then(m => (cast = m)));
  const api = {
    list: () => party?.list() ?? cast.ORDER.map(id => ({ id, name: cast.CAST[id].name, short: cast.CAST[id].short, tag: cast.CAST[id].tag, status: 'away', been: false })),
    ring: async id => { ring(); const p = await loadParty(); return p.ring(id); },
    sendHome: async id => (await loadParty()).sendHome(id),
    onOpen: () => { phone.receiver.visible = false; },
    onClose: () => { phone.receiver.visible = true; },
  };
  const ring = () => { for (let i = 0; i < 2; i++) for (let k = 0; k < 7; k++) ctx.sound?.note?.(k % 2 ? 88 : 84, i * 1.1 + k * 0.055, 0.09, 0.035); };
  const openPhone = async () => { await Promise.all([loadUI(), loadCast()]); ui.phone.show(api); };
  ctx.interact.push({ x: phone.x, y: F1 + AT.top + 0.55, z: phone.z, reach: 6.5, label: () => 'use the telephone', act: () => { openPhone().catch(e => console.warn('friends', e)); } });

  // ---- test hooks ----------------------------------------------------------------------------------
  const hook = Q.get('friends') ?? '';
  if (hook && hook !== '1' && typeof window !== 'undefined') {
    const [kind, a, ...rest] = hook.split(':'), text = rest.join(':');
    const ids = list => (list ? list.split(',').filter(id => ['feyn', 'gigi', 'nano'].includes(id)) : ['feyn', 'gigi', 'nano']);
    let since = 0, done = false;
    const run = async () => {
      if (kind === 'phone') { await openPhone(); if (a) await ui.phone.use(a); return; }
      const p = await loadParty();
      if (kind === 'demo' || kind === 'coffee' || kind === 'dance') p.stage(kind, ids(a));
      else if (kind === 'act') {      // ?friends=act:feyn:chalkboard  (&side=1.2: the camera that many radians round to their side)
        const at = p.stageAct(a, text); const w = ctx.walker;
        if (at && w?.place) { const ang = at.yaw + Math.PI + Number(Q.get('side') ?? 0.9), d = Number(Q.get('dist') ?? 6.5), x = at.x - Math.sin(ang + Math.PI) * d, z = at.z - Math.cos(ang + Math.PI) * d; w.place(x, at.y, z, Math.atan2(-(at.x - x), -(at.z - z)), -0.12); }
      }
      else if (kind === 'chat' || kind === 'talk') { const who = ids(a)[0] ?? 'gigi'; p.stage(kind === 'talk' ? 'live' : 'chat', [who, ...ids('feyn,gigi,nano').filter(id => id !== who)], text); }
      else if (kind === 'here' || kind === 'ring') {
        ctx.friendsDelay = 0; for (const id of ids(a)) p.ring(id); ctx.friendsDelay = undefined;
        const secs = Number(Q.get('friendtime') ?? (kind === 'here' ? 40 : 0)); for (let i = 0; i < secs * 15; i++) p.step(1 / 15, false);
      }
    };
    let walked = false;
    const away = Number(Q.get('walkaway') ?? 0);
    ctx.animated.push((t, dt) => {
      if (done && away && !walked && since > away) {      // she turns round (over a second) and strolls off (three feet a second, for four seconds)
        const w = ctx.walker, s = since - away; if (!w?.place) walked = true;
        else { w.yaw0 ??= w.yaw; const yaw = w.yaw0 + Math.PI * Math.min(1, s), go = Math.max(0, s - 1) * 3, fx = -Math.sin(w.yaw0 + Math.PI), fz = -Math.cos(w.yaw0 + Math.PI); w.pos0 ??= w.pos.clone(); w.place(w.pos0.x + fx * go, w.pos0.y, w.pos0.z + fz * go, yaw, 0); if (s > 5) walked = true; }
      }
      if (done) { since += dt; return; }
      since += dt;
      const staffReady = Q.get('staff') === '0' || window.__staff || since > 6;
      if ((window.__ready || since > 14) && staffReady) { done = true; since = 0; run().catch(e => console.warn('friends hook', e)); }
    });
  }
  const out = { phone, openPhone, loadParty, get party() { return party; }, get ui() { return ui; } };
  if (typeof window !== 'undefined') window.__friendsSetup = out;
  return out;
}

// ---- The telephone and its stand ---------------------------------------------------------------
// Built here from primitives: one merged, vertex-coloured mesh for the stand and the telephone,
// one for the receiver (so that it can be lifted), and a soft shadow on the floor.
function buildPhone(ctx) {
  const x = wx(AT.X), z = wz(AT.Y), parts = [], rec = [];
  const col = new THREE.Color();
  const put = (list, geo, color, p = [0, 0, 0], r = [0, 0, 0]) => {
    const g = geo.index ? geo.toNonIndexed() : geo;
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(1, 1, 1)));
    const n = g.attributes.position.count, a = new Float32Array(n * 3); col.set(color);
    for (let i = 0; i < n; i++) { a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.deleteAttribute('uv');
    list.push(g); return g;
  };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d), cyl = (r0, r1, h, s = 16) => new THREE.CylinderGeometry(r0, r1, h, s);
  const OAK = ['#8f6239', '#86592f', '#96683d'], BLACK = '#1c1b1d', BRASS = '#c2a05a', T = AT.top, hw = AT.w / 2, hd = AT.d / 2;
  // the stand: a square-legged oak telephone table with slatted sides and a shelf for the directory
  put(parts, box(AT.w, 0.07, AT.d), OAK[0], [0, T - 0.035, 0]);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) put(parts, box(0.09, T - 0.07, 0.09), OAK[1], [sx * (hw - 0.085), (T - 0.07) / 2, sz * (hd - 0.085)]);
  for (const sz of [-1, 1]) put(parts, box(AT.w - 0.26, 0.14, 0.04), OAK[2], [0, T - 0.15, sz * (hd - 0.085)]);
  for (const sx of [-1, 1]) {
    put(parts, box(0.04, 0.14, AT.d - 0.26), OAK[2], [sx * (hw - 0.085), T - 0.15, 0]);
    put(parts, box(0.04, 0.1, AT.d - 0.26), OAK[2], [sx * (hw - 0.085), 0.72, 0]);
    for (const k of [-0.13, 0, 0.13]) put(parts, box(0.026, T - 0.99, 0.075), OAK[0], [sx * (hw - 0.085), (T - 0.22 + 0.77) / 2, k]);
  }
  put(parts, box(AT.w - 0.2, 0.045, AT.d - 0.2), OAK[1], [0, 0.72, 0]);
  // the directory on the shelf
  put(parts, box(0.44, 0.1, 0.32), '#7a2f2a', [0.04, 0.795, 0.02], [0, 0.12, 0]);
  put(parts, box(0.42, 0.072, 0.31), '#efe6d2', [0.047, 0.795, 0.034], [0, 0.12, 0]);
  // a linen mat, a notepad and a pencil
  put(parts, cyl(0.3, 0.3, 0.012, 28), '#d6ccb4', [-0.13, T + 0.006, -0.04]);
  put(parts, box(0.3, 0.028, 0.22), '#f3ecd9', [0.31, T + 0.014, 0.2], [0, -0.2, 0]);
  put(parts, box(0.3, 0.034, 0.045), '#7a2f2a', [0.293, T + 0.017, 0.115], [0, -0.2, 0]);
  put(parts, cyl(0.011, 0.011, 0.3, 6), '#e0b23c', [0.3, T + 0.04, 0.22], [0, 0.55, Math.PI / 2]);
  // the telephone: a black candlestick with a dial in its foot, facing the hall
  const P = (list, geo, color, p, r) => put(list, geo, color, [p[0] - 0.13, p[1] + T + 0.012, p[2] - 0.04], r);
  P(parts, cyl(0.2, 0.235, 0.07, 26), BLACK, [0, 0.035, 0]);
  P(parts, cyl(0.07, 0.19, 0.09, 22), BLACK, [0, 0.115, 0]);
  P(parts, cyl(0.062, 0.062, 0.028, 16), BRASS, [0, 0.172, 0]);
  P(parts, cyl(0.04, 0.052, 0.5, 14), BLACK, [0, 0.43, 0]);
  P(parts, cyl(0.052, 0.052, 0.028, 16), BRASS, [0, 0.69, 0]);
  P(parts, new THREE.SphereGeometry(0.062, 14, 10), BLACK, [0, 0.74, 0]);
  const tilt = Math.PI / 2 - 0.22;                                   // the mouthpiece, tipped up a little
  P(parts, cyl(0.105, 0.045, 0.13, 18), BLACK, [0, 0.765, 0.105], [tilt, 0, 0]);
  P(parts, new THREE.TorusGeometry(0.105, 0.013, 6, 22), BRASS, [0, 0.779, 0.168], [-0.22, 0, 0]);
  // the dial, on the slope of the foot
  const dial = (geo, color, up, r = 0, a = 0) => { const s = 0.62, off = [Math.cos(a) * r, 0, Math.sin(a) * r]; geo.applyMatrix4(new THREE.Matrix4().makeTranslation(off[0], up, off[2])); P(parts, geo, color, [0, 0.105, 0.135], [s, 0, 0]); };
  dial(cyl(0.118, 0.125, 0.03, 22), BLACK, 0.015); dial(cyl(0.1, 0.1, 0.044, 22), '#efe6d2', 0.022); dial(cyl(0.088, 0.088, 0.056, 22), BRASS, 0.028); dial(cyl(0.034, 0.034, 0.07, 12), BLACK, 0.035);
  for (let i = 0; i < 10; i++) dial(cyl(0.0125, 0.0125, 0.064, 8), '#2a2622', 0.032, 0.063, 0.5 + i * 0.5);
  // the hook, and the receiver hanging in it
  P(parts, box(0.2, 0.028, 0.034), BRASS, [-0.13, 0.52, 0]);
  P(parts, new THREE.TorusGeometry(0.052, 0.013, 6, 14, Math.PI * 1.3), BRASS, [-0.245, 0.52, 0], [Math.PI / 2, 0, -0.5]);
  P(rec, cyl(0.088, 0.05, 0.085, 16), BLACK, [-0.245, 0.6, 0]);
  P(rec, cyl(0.07, 0.088, 0.02, 16), BLACK, [-0.245, 0.652, 0]);
  P(rec, cyl(0.044, 0.03, 0.36, 12), BLACK, [-0.245, 0.38, 0]);
  const cord = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[-0.245, 0.2, 0], [-0.26, 0.08, -0.03], [-0.2, 0.012, -0.14], [-0.08, 0.016, -0.24], [0, 0.03, -0.2]].map(p => new THREE.Vector3(...p))), 20, 0.011, 6);
  P(rec, cord, '#4a3324', [0, 0, 0]);

  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.52, metalness: 0.08, envMapIntensity: 0.5 });
  const group = new THREE.Group(); group.name = 'telephone'; group.userData.cat = 'telephone';
  group.position.set(x, F1, z); group.rotation.y = -Math.PI / 2;     // its front to the hall (west)
  const strip = g => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k); return g; };
  const stand = new THREE.Mesh(mergeGeometries(parts.map(strip), false), mat), receiver = new THREE.Mesh(mergeGeometries(rec.map(strip), false), mat);
  stand.castShadow = false; stand.receiveShadow = true; receiver.castShadow = false;
  group.add(stand, receiver);
  // a soft shadow where it stands (the sun's shadow map is drawn once, before this arrives)
  if (typeof document !== 'undefined') {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 6, 32, 32, 32);
    gr.addColorStop(0, 'rgba(20,12,6,.5)'); gr.addColorStop(0.6, 'rgba(20,12,6,.24)'); gr.addColorStop(1, 'rgba(20,12,6,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(AT.w + 0.7, AT.d + 0.7).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false, toneMapped: false }));
    sh.position.set(x, F1 + 0.055, z); sh.renderOrder = 1; sh.userData.cat = 'telephone'; ctx.scene.add(sh); ctx.track?.(sh, ctx.zoneAt?.(x, F1 + 1.4, z, 0.6));
  }
  ctx.scene.add(group);
  ctx.track?.(group, ctx.zoneAt?.(x, F1 + 1.4, z, 0.6));
  // the visitor walks round it (and so do the staff: their plan is made from these boxes)
  ctx.colliders.push({ x0: x - AT.d / 2, x1: x + AT.d / 2, y0: F1, y1: F1 + AT.top + 0.1, z0: z - AT.w / 2, z1: z + AT.w / 2 });
  return { group, stand, receiver, x, z };
}
