// Delivery: Twine, the catalogue's porter, and the parcel. Twine is one of the family (robokit): a
// small square-ish robot done up like a parcel, in brown paper and red string with a bow on top,
// who flies in low round the island (the airship's way), lands by the gate, comes up the front walk with the parcel balanced overhead,
// sets it on the porch before the door, and waits beside it (delighted to be seen) until it is untied.
//
// The parcel is untied where it stands (E). What was ordered is left standing on the opened paper;
// once that has been picked up, Twine gathers the paper and string, salutes, goes back down the walk and flies off the way the airship does. (The house's
// own staff cannot reach the porch: the butlers keep indoors and the gardeners to the grass.)
//
// Cost: nothing exists until the first order. Twine is three draw calls and is taken out of the
// scene when gone; the parcel is two. One function is on the frame list only while there is a
// delivery, a parcel or loose paper about.

import { useThree, paint, solid, makeFace } from '../staff/models.js';
import { makeShell } from '../robokit/shell.js';
import { makeFaceLife } from '../robokit/face.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const CX = 1.885;                                   // the middle of the front walk and of the porch steps (garden/front_walk.js)
const PORCH_Y = 1.45, STEP_TOP = 12, STEP_FOOT = 15.45, GATE = 70.5;
export const SPOT = { x: CX - 0.1, y: PORCH_Y, z: 5.6 };      // where the parcel is set down: in the middle of the porch floor, before the door and five feet from it, clear of the chairs and the pots
const STAND = { x: SPOT.x + 0.25, z: SPOT.z + 1.75 };            // where Twine stands to do it
const groundAt = z => (z >= STEP_FOOT ? 0.1 : z <= STEP_TOP ? PORCH_Y : 0.1 + (PORCH_Y - 0.1) * (STEP_FOOT - z) / (STEP_FOOT - STEP_TOP));
const HOVER = 1.25, SPEED = 5.2;
const SAY = {
  here: ['*toot toot!* Parcel for the house!', '*toot!* One parcel, as ordered. It is not heavy. I am simply small.', '*toot toot!* Special delivery. They are all special.'],
  bye: ['*a small, proud salute*', 'Sign here. (There is nowhere to sign. I like to say it.)', '*spins once, for luck*'],
  paper: ['*toot.* I will take the paper. We use it again.', 'Brown paper and string! Mine, I think. *tidies*'],
};

export function makeDelivery(ctx) {
  const { THREE, scene, camera } = ctx;
  useThree(THREE);
  const H = () => ctx.household ?? null;
  const toast = (t, ms) => window.houseUI?.toast?.(t, ms);
  const chirp = (notes, v = 0.05, gap = 0.09) => { try { notes.forEach((n, i) => ctx.sound?.note?.(n, i * gap, 0.3, v)); } catch { /* quiet */ } };
  const T = (g, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1]) => g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...s)));
  const KRAFT = '#b98a58', STRING = '#c8402f', CREAM = '#f3ead6';

  // ---- brown paper: one small drawn texture for the parcel and the opened sheet ------------------
  let paperTex = null;
  function paper() {
    if (paperTex) return paperTex;
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    g.fillStyle = '#b98a58'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${i % 2 ? 60 : 255},${i % 2 ? 40 : 235},${i % 2 ? 20 : 200},${0.03 + (i % 7) * 0.006})`; g.fillRect((i * 131) % 256, (i * 71) % 256, 2 + (i % 5) * 5, 1); }
    g.strokeStyle = 'rgba(70,45,20,.22)'; g.lineWidth = 1; for (const [a, b, c2, d] of [[0, 60, 256, 80], [40, 0, 70, 256], [0, 190, 256, 170], [200, 0, 180, 256]]) { g.beginPath(); g.moveTo(a, b); g.lineTo(c2, d); g.stroke(); }
    // the label: who it is for, and a stamp
    g.fillStyle = '#f6eedc'; g.fillRect(64, 84, 128, 88); g.strokeStyle = 'rgba(42,28,19,.5)'; g.strokeRect(64.5, 84.5, 127, 87);
    g.fillStyle = '#2a1c13'; g.textAlign = 'left'; g.font = 'italic 17px Georgia, serif'; g.fillText('To the House', 74, 112); g.fillText('on the Island', 74, 134); g.font = '11px Georgia, serif'; g.fillText('WITH CARE · THIS WAY UP', 74, 160);
    g.fillStyle = '#c8402f'; g.fillRect(158, 90, 28, 34); g.fillStyle = '#f6eedc'; g.font = 'bold 15px Georgia, serif'; g.textAlign = 'center'; g.fillText('A', 172, 113);
    paperTex = new THREE.CanvasTexture(c); paperTex.colorSpace = THREE.SRGBColorSpace; paperTex.anisotropy = 4;
    return paperTex;
  }
  const paperMat = () => new THREE.MeshStandardMaterial({ map: paper(), roughness: 0.92, side: THREE.DoubleSide });
  const stringMat = new THREE.MeshStandardMaterial({ color: 0xc8402f, roughness: 0.8 });

  // ---- the parcel ----------------------------------------------------------------------------
  const PW = 0.95, PH = 0.6, PD = 0.72;
  function buildParcel() {
    const g = new THREE.Group(); g.userData.cat = 'parcel';
    const box = new THREE.Mesh(new THREE.BoxGeometry(PW, PH, PD), paperMat()); box.position.y = PH / 2; box.receiveShadow = true;
    // only the top shows the label: the sides take a plain corner of the paper
    const uv = box.geometry.attributes.uv; for (let f = 0; f < 6; f++) if (f !== 2) for (let n = 0; n < 4; n++) { const i = f * 4 + n; uv.setXY(i, uv.getX(i) * 0.22, uv.getY(i) * 0.22); }
    const s = [
      T(new THREE.BoxGeometry(PW + 0.016, PH + 0.016, 0.022), [0, PH / 2, 0]), T(new THREE.BoxGeometry(0.022, PH + 0.016, PD + 0.016), [0, PH / 2, 0]),
      T(new THREE.TorusGeometry(0.075, 0.012, 5, 14), [-0.075, PH + 0.03, 0], [1.2, 0, 0.5]), T(new THREE.TorusGeometry(0.075, 0.012, 5, 14), [0.075, PH + 0.03, 0], [1.2, 0, -0.5]),
      T(new THREE.SphereGeometry(0.03, 8, 6), [0, PH + 0.02, 0]),
    ].map(q => (q.index ? q.toNonIndexed() : q));
    const str = new THREE.Mesh(mergeGeometries(s, false), stringMat);
    g.add(box, str);
    return g;
  }
  // the paper once it is open: a creased sheet lying flat, the string loose on it
  function buildWrap() {
    const g = new THREE.Group(); g.userData.cat = 'parcel';
    const geo = new THREE.PlaneGeometry(1.75, 1.5, 7, 6); geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), edge = Math.max(Math.abs(x) / 0.875, Math.abs(z) / 0.75); p.setY(i, 0.012 + 0.05 * Math.abs(Math.sin(x * 7.1 + z * 3.3)) * edge * edge + (edge > 0.95 ? 0.04 : 0)); }
    geo.computeVertexNormals();
    const flat = new THREE.Mesh(geo, paperMat()); flat.receiveShadow = true;
    const curve = new THREE.CatmullRomCurve3([[-0.7, 0.03, 0.3], [-0.3, 0.05, 0.5], [0.1, 0.03, 0.35], [0.5, 0.05, 0.55], [0.75, 0.03, 0.2], [0.6, 0.04, -0.2]].map(q => new THREE.Vector3(...q)));
    const str = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.011, 5), stringMat);
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 1), paperMat()); ball.position.y = 0.19; ball.scale.set(1, 0.8, 0.9); ball.visible = false;
    { const q = ball.geometry.attributes.position; for (let i = 0; i < q.count; i++) { const k = 0.82 + 0.3 * Math.abs(Math.sin(i * 12.9898) * 43758.5453 % 1); q.setXYZ(i, q.getX(i) * k, q.getY(i) * k, q.getZ(i) * k); } ball.geometry.computeVertexNormals(); }
    g.add(flat, str, ball); g.userData.crumple = () => { flat.visible = str.visible = false; ball.visible = true; };
    return g;
  }

  // ---- Twine -----------------------------------------------------------------------------------
  let twine = null;
  function buildTwine() {
    const root = new THREE.Group(), bob = new THREE.Group(); root.add(bob); root.name = 'twine'; root.userData.staff = true;
    const A = 0.5, B = 0.46, C = 0.44, S = makeShell(A, B, C, 4.5), parts = [];
    parts.push(paint(S.body(30, 22), KRAFT));
    parts.push(paint(S.band(-0.05, 0.03, 0.012, 44, 3), STRING));                                               // string round the middle...
    parts.push(paint(S.overTop(0, 0.012, 0.04), STRING));                                                        // ...and over the top
    for (const sx of [-1, 1]) parts.push(paint(T(new THREE.TorusGeometry(0.12, 0.028, 6, 16), [sx * 0.12, B + 0.05, 0], [1.25, 0, sx * 0.5]), STRING));      // the bow
    parts.push(paint(T(new THREE.SphereGeometry(0.05, 10, 8), [0, B + 0.03, 0]), '#a8321f'));
    const stamp = S.plate(-0.2, Math.PI / 2, 0.42, 0.12, 0.008, { m: 6, rings: 2, seg: 20 }); parts.push(paint(stamp, CREAM));          // a postage stamp on one side
    const face = makeFace({ eye: '#ffe9b0', gap: 52, eyeW: 40, eyeH: 46, blush: 'rgba(255,140,110,.6)', bg: '#1a120c' });
    const sc = S.screen(0.14, 0.2, 0.62, { seg: 32, rings: 4 }); parts.push(paint(sc.bezel, '#2a1c13'));
    const body = new THREE.Mesh(mergeGeometries(parts, false), solid()), faceMesh = new THREE.Mesh(sc.face, face.mat);
    const ring = new THREE.Mesh(T(new THREE.TorusGeometry(0.26, 0.03, 8, 26), [0, 0, 0], [Math.PI / 2, 0, 0]), new THREE.MeshBasicMaterial({ color: 0xffd98a, toneMapped: false, transparent: true, opacity: 0.85 }));
    ring.position.y = -B - 0.12;
    const handGeo = paint(T(new THREE.SphereGeometry(0.1, 10, 7), [0, 0, 0], [0, 0, 0], [1, 0.85, 1.15]), CREAM);
    const hands = [-1, 1].map(sx => { const h = new THREE.Mesh(handGeo, solid()); h.userData.sx = sx; bob.add(h); return h; });
    const slot = new THREE.Group(); bob.add(slot);
    bob.add(body, faceMesh, ring);
    root.traverse(o => { o.castShadow = false; o.userData.staff = true; });
    root.scale.setScalar(0.92);
    return { root, bob, face, hands, slot, B, life: makeFaceLife('twine', 0), x: CX, z: GATE, yaw: Math.PI, expr: 'happy', spin: 0, hop: 0, lean: 0, carry: 1, bubble: null };
  }

  // ---- the run ---------------------------------------------------------------------------------
  // job: { kind: 'bring' | 'fetch', path, i, ... }. One at a time.
  let job = null, parcel = null, wrap = null, onOpen = null, ticking = false, clock = 0, said = 0, pending = null;
  let big = 1; const sizeFor = n => Math.min(1.45, 0.92 + 0.11 * n);      // more in the order, a bigger parcel
  const state = { phase: 'none' };                    // none | coming | porch (the parcel is waiting) | opened
  const parcelEnt = { x: 1e9, y: SPOT.y + 0.5, z: SPOT.z, reach: 6.5, size: 1.1, label: () => 'untie the parcel', act: () => open() };
  ctx.interact.push(parcelEnt);

  const pathIn = to => [[CX, GATE], [CX, 44], [CX, STEP_FOOT + 1.2], [CX + 0.5, STEP_TOP - 0.8], [to.x, to.z]];
  function begin(kind) {
    if (!twine) twine = buildTwine();
    if (!twine.bubble && H()) twine.bubble = H().bubbles.make('Twine');
    const tw = twine; tw.x = CX; tw.z = GATE - 8; tw.air = true; tw.ay = 40; tw.yaw = Math.PI; tw.carry = kind === 'bring' ? 1 : 0; tw.spin = 0; tw.hop = 0;
    scene.add(tw.root); tw.root.scale.setScalar(0.92);
    if (kind === 'bring') { parcel = buildParcel(); parcel.scale.setScalar(big); parcel.rotation.y = 0.25; tw.slot.add(parcel); }
    job = { kind, path: pathIn(STAND), i: 1, step: 'in', t: 0, seen: false, u: 0.62 };      // (first seen a little way off over the lane, coming in)
    start();
  }
  function start() { if (ticking) return; ticking = true; ctx.animated.push(tick); }
  function stop() { ticking = false; const i = ctx.animated.indexOf(tick); if (i >= 0) ctx.animated.splice(i, 1); }

  // glide toward a point, giving the visitor room; true when there
  function glide(tw, px, pz, dt, speed = SPEED) {
    const c = camera.position; let tx = px, tz = pz;
    const dvx = c.x - tw.x, dvz = c.z - tw.z, dv = Math.hypot(dvx, dvz), onWalk = Math.abs(c.y - 4.85 - groundAt(c.z)) < 3;
    if (onWalk && dv < 6.5 && Math.hypot(px - tw.x, pz - tw.z) > 2.5) {                // somebody in the way: round her, on the side with more room
      const ahead = (dvx * (px - tw.x) + dvz * (pz - tw.z)) / (Math.hypot(px - tw.x, pz - tw.z) || 1);
      if (ahead > 0) { const side = c.x > CX ? -1 : 1; tx = Math.max(CX - 2.4, Math.min(CX + 2.4, c.x + side * 3)); tz = tw.z + (pz > tw.z ? 1.5 : -1.5); if (dv < 2.2) speed = 0.6; }
    }
    const dx = tx - tw.x, dz = tz - tw.z, d = Math.hypot(dx, dz);
    if (Math.hypot(px - tw.x, pz - tw.z) < 0.15) { tw.lean += (0 - tw.lean) * Math.min(1, dt * 6); return true; }
    const want = Math.atan2(dx, dz); let da = want - tw.yaw; da = Math.atan2(Math.sin(da), Math.cos(da)); tw.yaw += da * Math.min(1, dt * 5);
    const stepLen = Math.min(d, speed * dt * Math.max(0.25, Math.cos(Math.min(1.4, Math.abs(da)))));
    tw.x += dx / (d || 1) * stepLen; tw.z += dz / (d || 1) * stepLen; tw.lean += (0.16 - tw.lean) * Math.min(1, dt * 4);
    return false;
  }
  const turnTo = (tw, x, z, dt) => { let da = Math.atan2(x - tw.x, z - tw.z) - tw.yaw; da = Math.atan2(Math.sin(da), Math.cos(da)); tw.yaw += da * Math.min(1, dt * 6); return Math.abs(da) < 0.06; };
  const say = (list, secs = 4) => { const line = list[said++ % list.length]; if (twine && !twine.bubble && H()) twine.bubble = H().bubbles.make('Twine'); if (twine?.bubble && H()) twine.bubble.say(line, secs, H().now); };
  const seesHer = tw => { const c = camera.position; return Math.hypot(c.x - tw.x, c.z - tw.z) < 26 && c.z > -1.5 && c.y < 9; };      // out of doors at the front, or in the open doorway

  const v3 = new THREE.Vector3();
  // The way through the air: off the walk by the gate, up over the lane and away low round the island to the west (the
  // airship's own way out: garden/airstop.js). Coming, it is flown the other way.
  const AIR = new THREE.CatmullRomCurve3([[CX, 0.1 + HOVER, GATE - 8], [CX - 3, 3.5, GATE + 10], [-36, 10, 122], [-130, 34, 158], [-330, 70, 290]].map(p => new THREE.Vector3(...p)), false, 'centripetal');
  function tick(t, dt) {
    dt = Math.min(dt, 0.05); clock += dt;
    const tw = twine, j = job;
    if (j && tw) {
      j.t += dt;
      if (j.step === 'in' && j.u > 0) {                                     // in low round the island, the way the airship comes, to land on the walk by the gate
        j.u = Math.max(0, j.u - dt * (0.07 + j.u * 0.42)); AIR.getPoint(j.u, v3); tw.air = j.u > 0; tw.x = v3.x; tw.z = v3.z; tw.ay = v3.y;
        AIR.getTangent(j.u, v3); tw.yaw = Math.atan2(-v3.x, -v3.z); tw.lean = 0.16 + j.u * 0.4;
      } else if (j.step === 'in') {                                         // then up the walk
        const [px, pz] = j.path[j.i];
        if (glide(tw, px, pz, dt)) { if (++j.i >= j.path.length) { j.step = j.kind === 'bring' ? 'face' : 'pick'; j.t = 0; } }
      } else if (j.step === 'face') {                                       // turn to the spot, and lower the parcel onto it
        if (turnTo(tw, SPOT.x, SPOT.z, dt) || j.t > 1.5) { j.step = 'lower'; j.t = 0; }
      } else if (j.step === 'lower') {
        tw.carry = Math.max(0, 1 - j.t / 1.1);
        if (j.t >= 1.1) {
          tw.slot.remove(parcel); parcel.position.set(SPOT.x, SPOT.y, SPOT.z); parcel.rotation.set(0, tw.yaw + 0.2, 0); scene.add(parcel);
          if (wrap) { wrap.userData.crumple(); wrap.removeFromParent(); wrap.position.set(0.5, -0.1, 0.25); wrap.rotation.set(0, 0, 0); wrap.scale.setScalar(0.7); tw.bob.add(wrap); j.old = wrap; wrap = null; pending = null; }      // the last parcel's paper is still here: tucked under one arm
          parcelEnt.x = SPOT.x; state.phase = 'porch'; j.step = 'wait'; j.t = 0;
          chirp([79, 84, 79, 84], 0.07, 0.16); toast('A bell at the front door. Something has come for you.', 5200);
        }
      } else if (j.step === 'wait') {                                       // beside the parcel until it has been untied: delighted when she first comes into view
        const c = camera.position, sees = seesHer(tw); if (sees) turnTo(tw, c.x, c.z, dt);
        if (sees && !j.seen && j.t > 0.6) { j.seen = true; j.joy = 0; say(SAY.here, 4.5); chirp([72, 76, 79, 84], 0.06); }
        if (j.joy != null) { j.joy += dt; tw.expr = 'love'; tw.hop = Math.abs(Math.sin(j.joy * 7)) * Math.max(0, 1 - j.joy / 1.6) * 0.5; tw.spin = j.joy > 0.5 && j.joy < 1.5 ? (j.joy - 0.5) * Math.PI * 2 : 0; if (j.joy > 3) { j.joy = null; tw.expr = 'happy'; tw.hop = tw.spin = 0; } }
        // untied: once what was in it has been picked up (or after a polite while), the paper
        if (j.joy == null && state.phase === 'opened' && wrap && pending && (pending.taken() || clock - pending.t > 40)) { pending = null; j.step = 'pick'; j.t = 0; }
      } else if (j.step === 'pick') {                                       // gather up the paper and the string
        if (wrap && j.t < 0.1) { say(SAY.paper, 4); }
        turnTo(tw, SPOT.x, SPOT.z, dt);
        if (j.t > 1.1) { if (wrap) { wrap.userData.crumple(); wrap.removeFromParent(); wrap.position.set(0, -0.12, 0); wrap.rotation.set(0, 0, 0); wrap.scale.setScalar(1); tw.slot.add(wrap); tw.carry = 1; } j.step = 'bye'; j.t = 0; if (seesHer(tw)) say(SAY.bye, 3); }
      } else if (j.step === 'bye') {                                        // a salute, then off
        if (seesHer(tw)) turnTo(tw, camera.position.x, camera.position.z, dt);
        if (j.t > 1.6) { j.step = 'out'; j.path = [[STAND.x, STAND.z], [CX + 0.5, STEP_TOP - 0.8], [CX, STEP_FOOT + 4], [CX, GATE - 8]]; j.i = 1; j.t = 0; }
      } else if (j.step === 'out') {                                        // down the steps and down the walk to the gate...
        const [px, pz] = j.path[j.i];
        if (glide(tw, px, pz, dt, SPEED * 1.15)) { if (++j.i >= j.path.length) { j.step = 'away'; j.u = 0; } }
      } else if (j.step === 'away') {                                       // ...then up and off, low round the island, the way the airship goes
        j.u += dt * (0.05 + j.u * 0.42); const u = Math.min(1, j.u); AIR.getPoint(u, v3); tw.air = true; tw.x = v3.x; tw.z = v3.z; tw.ay = v3.y;
        AIR.getTangent(u, v3); tw.yaw = Math.atan2(v3.x, v3.z); tw.lean = Math.min(0.5, 0.16 + j.u * 0.5);
        if (j.u >= 1) { scene.remove(tw.root); tw.bubble?.quiet?.(); if (wrap && wrap.parent === tw.slot) { tw.slot.remove(wrap); wrap = null; } tw.air = false; job = null; if (state.phase === 'opened') state.phase = 'none'; }
      }
      // the body: it bobs, leans into its going, and holds the parcel up with both hands
      const y = tw.air ? tw.ay + 0.07 * Math.sin(clock * 2.6) : groundAt(tw.z) + HOVER + 0.07 * Math.sin(clock * 2.6) + tw.hop;
      tw.root.position.set(tw.x, y, tw.z); tw.root.rotation.set(0, tw.yaw + tw.spin, 0); tw.bob.rotation.x = tw.lean;
      const up = tw.carry, sy = tw.B + 0.36 + 0.02 * Math.sin(clock * 5.1);      // (clear of the bow on its head)
      tw.slot.position.set(0, sy * up + (-0.75) * (1 - up), 0.95 * (1 - up) + 0.02); tw.slot.rotation.z = 0.04 * Math.sin(clock * 3.3) * up; tw.slot.rotation.x = -tw.lean * up;
      for (const h of tw.hands) {
        const sx = h.userData.sx, holding = tw.slot.children.length > 0;
        if (holding) h.position.set(sx * 0.52, tw.slot.position.y + 0.1, tw.slot.position.z + 0.02);
        else if ((j.joy != null || j.step === 'bye') && sx > 0 && !holding) h.position.set(0.42, 0.38 + 0.05 * Math.sin(clock * 14), 0.3);                    // the salute
        else h.position.set(sx * 0.6, -0.12 + 0.03 * Math.sin(clock * 2.6 + sx), 0.12);
      }
      const L = tw.life.step(clock, dt, { w: seesHer(tw) ? 1 : 0, eye: 0, moveLook: null });
      tw.face.draw(tw.expr, L.lx, L.shut, { ly: j.step === 'lower' || j.step === 'pick' ? 0.8 : L.ly, mouth: tw.bubble?.talking?.(H()?.now ?? 0) ? 0.5 + 0.5 * Math.sin(clock * 12) : 0 });
      if (tw.bubble && H()) H().bubbles.place(tw.bubble, v3.set(tw.x, y + 1.0, tw.z), H().now, true);
    }
    // ---- the paper, once the parcel has been opened: when what was in it has been picked up (or after a while), Twine comes back for it ----
    if (wrap && !job && pending && ((pending.taken() && clock - pending.t > 9) || clock - pending.t > 60)) { pending = null; begin('fetch'); }      // (only if it was untied with Twine away: the test hook's parcel)
    if (!job && !wrap && state.phase !== 'porch') stop();
  }

  // ---- untying it -------------------------------------------------------------------------------
  function open() {
    if (state.phase !== 'porch' || !parcel) return;
    parcelEnt.x = 1e9; state.phase = 'opened';
    scene.remove(parcel); const yaw = parcel.rotation.y; parcel = null;
    wrap?.removeFromParent();
    wrap = buildWrap(); wrap.scale.set(Math.max(1, big), 1, Math.max(1, big)); wrap.position.set(SPOT.x, SPOT.y, SPOT.z); wrap.rotation.y = yaw; scene.add(wrap);
    try { for (let i = 0; i < 5; i++) ctx.sound?.note?.(50 + (i * 5) % 9, i * 0.07, 0.08, 0.05); } catch { /* quiet */ }
    const f = onOpen; onOpen = null;
    pending = { t: clock, taken: () => false };
    Promise.resolve(f?.({ x: SPOT.x, y: SPOT.y + 0.03, z: SPOT.z, yaw })).then(its => { its = [].concat(its ?? []); if (its.length && pending) pending.taken = () => its.every(it => it.state !== 'down' || Math.hypot(it.x - SPOT.x, it.z - SPOT.z) > 1.6); }).catch(e => console.warn('catalogue: opening', e));
    start();
  }

  return {
    state, SPOT,
    // send Twine with a parcel; opened(where) is called when it is untied and puts the thing there (it may return the carried thing)
    bring(opened, n = 1) { if (job || state.phase === 'porch') return false; onOpen = opened; big = sizeFor(n); state.phase = 'coming'; begin('bring'); return true; },
    // (tests) the parcel at once, without the walk
    drop(opened, n = 1) { onOpen = opened; big = sizeFor(n); if (!parcel) { parcel = buildParcel(); parcel.scale.setScalar(big); parcel.position.set(SPOT.x, SPOT.y, SPOT.z); parcel.rotation.y = 0.4; scene.add(parcel); } parcelEnt.x = SPOT.x; state.phase = 'porch'; start(); },
    open, get twine() { return twine; }, get job() { return job; }, get wrap() { return wrap; },
  };
}
