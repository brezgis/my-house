// Picking things up, carrying them in the left hand, turning them over, eating the edible ones,
// and setting them down on whatever flat place is looked at. Loaded by hands.js once the visitor
// is walking; nothing here runs per frame unless something is held.
//
// A model in the house is drawn by life.js and shown or hidden by its home room, so the thing in
// the hand is a copy (a clone of the original: same merged geometry, same materials, so nothing
// new is compiled) and the original is dropped far below the island. The copy hangs from the
// camera, drawn small and close (which looks the same as full size at arm's length, but cannot
// poke through a wall). Set down, it joins a group that belongs to the room it is in.

import { THINGS, SNACKS } from './things.js';
import { aimAny, aimSpot, clearSpot, raySoup, dropSoup, headroom, feel } from './place.js';

const REACH = 6.5, MAXSIZE = 1.75;

export function setupCarry(ctx, api) {
  const { THREE, scene, camera } = ctx;
  const touch = 'ontouchstart' in window;
  const note = (t, ms) => window.houseUI?.toast?.(t, ms);
  const all = [];                       // every thing that can be handled: { T, m, ent, obj, state, ... }
  let held = null, inspecting = false, byButton = false, zoom = 1, snap = false, chew = -1, told = false;
  const seen = new Set();
  const FAR = 1e9;

  // ---- What can be picked up ---------------------------------------------------------------
  for (const m of ctx.items.models ?? []) {
    const T = THINGS[m.id]; if (!T || m.seat || m.collide || m.hang) continue;
    const it = { T, m, id: m.id, state: 'home', obj: null, orig: null, x: m.x, y: m.y + 0.2, z: m.z, tried: 0 };
    it.ent = { x: it.x, y: it.y, z: it.z, reach: 5.5, size: 0.6, label: () => (resolve(it) ? (T.portion ? T.take : `pick up the ${T.n}`) : ''), act: () => pickUp(it) };
    ctx.interact.push(it.ent); all.push(it);
  }
  // the original scene object of a placed model (they arrive as rooms are approached)
  function resolve(it) {
    if (it.orig || it.obj) return true;
    const now = performance.now(); if (now - it.tried < 600) return false; it.tried = now;
    const cat = 'model:' + it.id;
    for (const o of scene.children) if (o.userData.cat === cat && Math.abs(o.position.x - it.m.x) < 1e-3 && Math.abs(o.position.z - it.m.z) < 1e-3 && o.position.y > -1000) { it.orig = o; measure(it); return true; }
    return false;
  }
  const box = new THREE.Box3(), v = new THREE.Vector3(), v2 = new THREE.Vector3();
  function measure(it) {
    box.setFromObject(it.orig); box.getCenter(v); box.getSize(v2);
    it.ent.x = it.x = v.x; it.ent.y = it.y = v.y; it.ent.z = it.z = v.z; it.ent.size = Math.max(0.45, Math.max(v2.x, v2.y, v2.z));
    if (held) it.ent.x = FAR;
  }
  // now and then: find the originals near the visitor, so that the ring sits on the thing itself
  setInterval(() => {
    if (ctx.mode !== 'walk') return; const p = camera.position;
    for (const it of all) if (!it.orig && !it.obj && it.m && Math.abs(it.m.x - p.x) + Math.abs(it.m.z - p.z) < 30) resolve(it);
    for (const s of snacks) s.ent.x = held || (s.door && !s.door.isOpen) ? FAR : s.e.x;
  }, 1000);

  // Entries of the other things step aside while the hand is full
  function refresh() { for (const it of all) it.ent.x = held || it.state === 'gone' || it.state === 'held' ? FAR : it.x; for (const s of snacks) s.ent.x = held || (s.door && !s.door.isOpen) ? FAR : s.e.x; }

  // ---- Making the copy ---------------------------------------------------------------------
  function build(it) {
    const o = it.orig, body = o.clone();
    body.visible = true;                                   // (the original may be out of sight at this moment: life.js hides by room)
    body.position.set(0, 0, 0); body.rotation.set(0, 0, 0); body.updateMatrixWorld(true);
    box.setFromObject(body); box.getCenter(v); box.getSize(v2);
    if (Math.max(v2.x, v2.y, v2.z) > MAXSIZE) return false;
    body.position.set(-v.x, -v.y, -v.z);
    body.traverse(n => { if (n.isMesh) n.castShadow = false; });
    it.obj = new THREE.Group(); it.obj.add(body); it.obj.userData.cat = 'held';
    shape(it, v2.x, v2.y, v2.z);
    // where it came from: the middle of the original as it stood
    v.applyAxisAngle(v2.set(0, 1, 0), o.rotation.y);
    it.home = { x: o.position.x + v.x, y: o.position.y + v.y, z: o.position.z + v.z, rotY: o.rotation.y };
    o.position.y -= 5000;                                  // the original goes below the island for the rest of the visit
    return true;
  }
  function shape(it, w, h, d) { it.w = w; it.h = h; it.d = d; it.hh = h / 2; it.rad = Math.hypot(w, h, d) / 2; it.rf = Math.max(0.08, Math.min(0.6, (w + d) / 4)); }

  function pickUp(it) {
    if (held) { note(`Your hand is full: you have the ${held.T.n}.`); return; }
    if (it.T.portion) return takePortion(it);                                  // one from the plate: the plate stays
    if (!it.obj) { if (!resolve(it)) return; if (!build(it)) { all.splice(all.indexOf(it), 1); it.ent.x = FAR; note(`The ${it.T.n} is more than one hand can manage.`); return; } }
    take(it);
  }
  function take(it) {
    it.obj.removeFromParent(); camera.add(it.obj); it.state = 'held'; held = it; it.takenAt = performance.now(); inspecting = false; zoom = 1; chew = -1;
    if (!snap) { camera.updateMatrixWorld(); /* start where it was, so it comes to the hand rather than jumping */ }
    pose(true); it.obj.position.copy(goal); it.obj.scale.setScalar(goalS); it.obj.position.y -= 0.25;
    refresh(); hook(); bar?.classList.add('on'); bar?.classList.toggle('food', !!it.T.eat);
    if (it.home) { backEnt.x = it.home.x; backEnt.y = it.home.y; backEnt.z = it.home.z; backEnt.size = Math.max(0.6, it.w, it.d); }
    const first = !seen.has(it.T); seen.add(it.T);
    api.handled.push(it.T.n);
    if (first) note(it.T.l, 5200);
    if (!told) { told = true; setTimeout(() => { if (held) note(touch ? 'Tap a table, a shelf or the floor to set it down. The buttons at the left turn it over.' : `E sets it down where you are looking. R turns it over in your hand${it.T.eat ? ', Q takes a bite' : ''}.`, 6000); }, first ? 5400 : 300); }
    else if (first && it.T.eat && !toldEat) { toldEat = true; setTimeout(() => held === it && note(touch ? 'The button at the left takes a bite.' : 'Q takes a bite.'), 5400); }
  }
  let toldEat = false;

  // ---- In the hand --------------------------------------------------------------------------
  // The pose is worked out as if the thing were at arm's length (A), then drawn at 0.6 ft from the
  // eye and scaled to match: the same picture, inside the walker's own girth.
  const goal = new THREE.Vector3(); let goalS = 1;
  const qa = new THREE.Quaternion(), X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0);
  function pose() {
    const it = held, r = it.rad;
    if (inspecting) goal.set(0, -0.02, -(0.75 + 2.3 * r) * zoom);
    else goal.set(-0.6 - 0.4 * r, -0.5 - 0.3 * r, -(1.5 + 2.0 * r));
    if (chew >= 0) { const b = Math.sin(Math.PI * Math.min(1, chew)); goal.x += (0.05 - goal.x) * 0.8 * b; goal.y += (-0.2 - goal.y) * 0.8 * b; goal.z += (-(0.5 + r) - goal.z) * 0.6 * b; }
    const len = goal.length(), k = Math.min(0.62 / len, 0.3 / r);
    goal.multiplyScalar(k); goalS = k * (it.shrink ?? 1);
  }
  const dir = new THREE.Vector3(), spot = { x: 0, y: 0, z: 0, t: 0, top: false, c: null }, to = new THREE.Vector3();
  const putEnt = { x: FAR, y: 0, z: 0, reach: REACH + 0.5, size: 0.5, label: () => (held ? `set the ${held.T.n} down` : ''), act: () => setDown() };
  const backEnt = { x: FAR, y: 0, z: 0, reach: 6, size: 0.8, label: () => (held ? `put the ${held.T.n} back` : ''), act: () => setDown(true) };
  ctx.interact.push(putEnt, backEnt);
  const mine = new Set([putEnt]);

  ctx.animated.push((t, dt) => {
    const it = held;
    if (!it) { const o = otherIt(); if (o) { hook(); planDown(o); } else plan.how = plan.text = null; return; }
    const o = it.obj; o.visible = ctx.mode === 'walk';
    if (chew >= 0) { chew += dt / 0.9; if (chew > 0.5 && it.bitten) { it.bitten = false; if (!it.T.taste) it.shrink = Math.max(0.2, 1 - it.bites / ((it.T.eat === 'whole' ? it.T.bites ?? 3 : it.T.eat.length) + 0.6)); } if (chew >= 1) { chew = -1; if (it.eaten) return finish(it); } }
    pose();
    const k = snap ? 1 : Math.min(1, dt * 11);
    o.position.lerp(goal, k); o.scale.setScalar(o.scale.x + (goalS - o.scale.x) * k);
    if (inspecting) {
      const keys = ctx.walker.keys; if (keys.has('KeyW') || keys.has('KeyA') || keys.has('KeyS') || keys.has('KeyD')) look(false);
      return;
    }
    o.rotation.set(-camera.rotation.x, 0.5 + 0.02 * Math.sin(t * 1.3), 0, 'XYZ');      // upright, whichever way you look
    planDown(it);
  });

  // ---- Anything held can always be put down -------------------------------------------------
  // Every frame while something is held (in this hand, or a drink the staff gave her in the other:
  // ctx.otherHand, staff.js), what E will do with it: set it down where she looks; put it back, if she
  // looks at its place or at nothing with its place near; else set it down at her feet. That wins the
  // prompt and the E key (ctx.hint, ctx.capture) over sitting and over anything not squarely in view.
  // When E is pressed the exact place is found (setDown), falling back the same way if it will not go.
  const plan = { how: null, text: null };
  function planDown(it) {
    plan.how = plan.text = null; putEnt.x = FAR;
    if (inspecting || ctx.mode !== 'walk' || ctx.walker?.seated) return;
    camera.getWorldDirection(dir); const p = camera.position;
    for (const e of ctx.interact) {                                   // something else squarely in view comes first (a seat never does)
      if (e === putEnt || e.seat || e.x > 1e8) continue;
      to.set(e.x - p.x, e.y - p.y, e.z - p.z); const d = to.length(); if (d > e.reach || d < 1e-3) continue;
      const ang = Math.acos(Math.min(1, to.dot(dir) / d)), allow = Math.min(0.45, Math.atan((e.size ?? (e.reach >= 7 ? 1.7 : 1.05)) / d) + 0.09);
      if (ang >= allow * (e === backEnt ? 1 : 0.35)) continue;
      if (e === backEnt) { if (!it.other && it.home) { plan.how = 'back'; plan.text = `put the ${it.T.n} back`; } return; }
      let l = ''; try { l = e.label?.() ?? ''; } catch { /* not ours */ }
      if (l) return;
    }
    if (aimAny(spot, p.x, p.y, p.z, dir.x, dir.y, dir.z, ctx.colliders, ctx.house.surfaces, REACH) && spot.y < p.y + 0.4) { plan.how = 'aim'; plan.text = `set the ${it.T.n} down`; return; }
    if (touch) return;                                                 // (on a touch screen a tap at nothing is still a sip)
    const home = nearHome(it);
    plan.how = home ? 'back' : 'feet'; plan.text = home ? `put the ${it.T.n} back` : `set the ${it.T.n} down at your feet`;
  }
  const nearHome = it => !!it.home && Math.hypot(it.home.x - camera.position.x, it.home.z - camera.position.z) < 10 && Math.abs(it.home.y - camera.position.y) < 7;
  function doPlan() {
    const it = held ?? otherIt(); if (!it || !plan.how) return false;
    if (plan.how === 'back') return setDown(true);
    if (plan.how === 'feet') { camera.getWorldDirection(dir); return setDown(false, atFeet(it), 'feet'); }
    return setDown();
  }
  // The other hand: whatever staff.js says she holds there (a drink, a pastry a robot brought)
  let otherC = null;
  function otherIt() {
    const O = ctx.otherHand, n = O?.name?.(); if (!n) return null;
    if (!otherC || otherC.T.n !== n) { const { w, h, d } = O.size(); otherC = { T: { n }, other: true, home: null, x: 0, y: 0, z: 0 }; shape(otherC, w, h, d); }
    return otherC;
  }
  // The floor just in front of her feet, clear of the furniture (and, failing all else, where she stands)
  function atFeet(it) {
    const w = ctx.walker?.pos ?? { x: camera.position.x, y: camera.position.y - 4.85, z: camera.position.z }, hl = Math.hypot(dir.x, dir.z) || 1, fx = dir.x / hl, fz = dir.z / hl;
    for (const [d, a] of [[1.2, 0], [1.2, 0.7], [1.2, -0.7], [0.9, 1.5], [0.9, -1.5], [1.6, 0], [0.6, 3.1]]) {
      const c = Math.cos(a), sn = Math.sin(a), x = w.x + (fx * c - fz * sn) * d, z = w.z + (fx * sn + fz * c) * d, s = { x, y: w.y, z, c: null };
      if (clearSpot(s, it.rf, it.h, ctx.colliders) && Math.hypot(s.x - x, s.z - z) < 0.5) return { x: s.x, y: w.y, z: s.z };
    }
    return { x: w.x, y: w.y, z: w.z };
  }

  // ---- Turning it over ----------------------------------------------------------------------
  function look(on, button = false) {
    if (!held || on === inspecting) return;
    inspecting = on; byButton = on && button; ctx.walker.lookScale = on ? 0 : 1; zoom = 1;
    if (on) { putEnt.x = FAR; held.obj.quaternion.setFromAxisAngle(Y, 0.5); const T = held.T; if (!seen.has(T)) { seen.add(T); note(T.l, 5200); } }
    bar?.classList.toggle('looking', on);
  }
  function turn(dx, dy) { const o = held.obj; qa.setFromAxisAngle(Y, dx * 0.008); o.quaternion.premultiply(qa); qa.setFromAxisAngle(X, dy * 0.008); o.quaternion.premultiply(qa); }
  addEventListener('mousemove', e => { if (inspecting && (document.pointerLockElement || e.buttons)) turn(e.movementX, e.movementY); });
  addEventListener('wheel', e => { if (!inspecting) return; zoom = Math.max(0.55, Math.min(1.6, zoom * Math.exp(e.deltaY * 0.0012))); e.preventDefault(); }, { passive: false });
  addEventListener('mousedown', e => { if (e.button === 2 && held && !inspecting && ctx.mode === 'walk') look(true, true); });
  addEventListener('mouseup', e => { if (e.button === 2 && byButton) look(false); });
  addEventListener('contextmenu', e => { if (held) e.preventDefault(); });
  { let lx = 0, ly = 0, gap = 0; const dom = ctx.renderer.domElement;
    dom.addEventListener('touchstart', e => { const a = e.touches[0]; lx = a.clientX; ly = a.clientY; gap = e.touches.length > 1 ? Math.hypot(e.touches[1].clientX - lx, e.touches[1].clientY - ly) : 0; }, { passive: true });
    dom.addEventListener('touchmove', e => {
      if (!inspecting) return; const a = e.touches[0];
      if (e.touches.length > 1) { const g = Math.hypot(e.touches[1].clientX - a.clientX, e.touches[1].clientY - a.clientY); if (gap) zoom = Math.max(0.55, Math.min(1.6, zoom * gap / g)); gap = g; }
      else turn(a.clientX - lx, a.clientY - ly);
      lx = a.clientX; ly = a.clientY;
    }, { passive: true }); }
  addEventListener('keydown', e => {
    if (!held || e.repeat || ctx.mode !== 'walk' || /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName ?? '')) return;
    if (e.code === 'KeyR') look(!inspecting);
    if ((e.code === 'KeyB' || e.code === 'KeyQ') && !ctx.otherHand) eatOrSip();      // (with the staff in, staff.js listens for Q and B)
  });
  function eatOrSip() { return ctx.sip ? ctx.sip() : bite(); }

  // While something is being turned over, E or a click lowers it again; and with nothing aimed at,
  // E takes a bite of food in this hand if the other hand (staff.js) has nothing to sip.
  // toys.js owns ctx.capture and ctx.hint: its functions are called first, then these.
  let wrapC = null, wrapH = null, wrapS = null;
  function hook() {
    if (ctx.capture !== wrapC) { const prev = ctx.capture; wrapC = ctx.capture = () => { if (prev?.()) return true; if (inspecting) { look(false); return true; } if (plan.how && ctx.mode === 'walk' && !ctx.walker?.seated) { doPlan(); return true; } return false; }; }
    if (ctx.hint !== wrapH) { const prev = ctx.hint; wrapH = ctx.hint = () => prev?.() ?? (inspecting && held ? (touch ? `the ${held.T.n} · drag to turn it · pinch to bring it closer` : `the ${held.T.n} · move the mouse to turn it · the wheel brings it closer · <b>E</b>lowers it`) : plan.text && ctx.mode === 'walk' && !ctx.walker?.seated ? `<b>E</b>${plan.text}` : null); }
    if (ctx.sip !== wrapS) { const prev = ctx.sip; wrapS = ctx.sip = () => { const O = ctx.otherHand, mineFirst = held?.T.eat && (!O?.name?.() || (held.takenAt ?? 0) > (O.at?.() ?? 0)); return (mineFirst && bite()) || prev?.() || (held?.T.eat ? bite() : false); }; }      // (the one picked up last first)
  }

  // ---- Eating -------------------------------------------------------------------------------
  function bite() {
    const it = held, T = it?.T; if (!T?.eat || chew >= 0) return false;
    if (inspecting) look(false);
    it.bites = (it.bites ?? 0) + 1; chew = 0; it.bitten = true;
    if (T.eat === 'whole') { if (it.bites >= (T.bites ?? 3)) it.eaten = true; }
    else { const last = !T.taste && it.bites >= T.eat.length; if (last) it.eaten = true; else setTimeout(() => note(T.eat[Math.min(it.bites, T.eat.length) - 1]), 450); }      // (the last bite finishes it, with its done line)
    return true;
  }
  function finish(it) {
    camera.remove(it.obj); it.state = 'gone'; held = null; api.eaten.push(it.T.n);
    note(it.T.done ?? `You finish the ${it.T.n}.`); done();
  }
  function done() { putEnt.x = backEnt.x = FAR; refresh(); bar?.classList.remove('on', 'looking'); }

  // ---- Setting it down ----------------------------------------------------------------------
  // The triangles near where you are looking, gathered once when E is pressed (place.js does the rest)
  let soup = new Float32Array(9 * 8192), soupN = 0;
  const region = new THREE.Box3(), mb = new THREE.Box3(), P = new Float64Array(9);
  function gather(m) {
    const g = m.geometry, pos = g.attributes?.position; if (!pos) return;
    if (!g.boundingBox) g.computeBoundingBox();
    dbgS++; mb.copy(g.boundingBox).applyMatrix4(m.matrixWorld); if (!mb.intersectsBox(region)) return; dbgM++;
    const e = m.matrixWorld.elements, ix = g.index?.array, count = ix ? ix.length : pos.count;
    const plain = pos.array instanceof Float32Array && !pos.isInterleavedBufferAttribute && pos.itemSize === 3 && !pos.normalized, arr = pos.array;
    const lo = region.min, hi = region.max;
    for (let i = 0; i + 2 < count; i += 3) {
      for (let k = 0; k < 3; k++) {
        const vi = ix ? ix[i + k] : i + k;
        const x = plain ? arr[vi * 3] : pos.getX(vi), y = plain ? arr[vi * 3 + 1] : pos.getY(vi), z = plain ? arr[vi * 3 + 2] : pos.getZ(vi);
        P[k * 3] = e[0] * x + e[4] * y + e[8] * z + e[12]; P[k * 3 + 1] = e[1] * x + e[5] * y + e[9] * z + e[13]; P[k * 3 + 2] = e[2] * x + e[6] * y + e[10] * z + e[14];
      }
      if ((P[0] < lo.x && P[3] < lo.x && P[6] < lo.x) || (P[0] > hi.x && P[3] > hi.x && P[6] > hi.x) || (P[1] < lo.y && P[4] < lo.y && P[7] < lo.y) || (P[1] > hi.y && P[4] > hi.y && P[7] > hi.y) || (P[2] < lo.z && P[5] < lo.z && P[8] < lo.z) || (P[2] > hi.z && P[5] > hi.z && P[8] > hi.z)) continue;
      if (soupN * 9 + 9 > soup.length) { if (soupN > 120000) return; const n = new Float32Array(soup.length * 2); n.set(soup); soup = n; }
      soup.set(P, soupN * 9); soupN++;
    }
  }
  let dbgM = 0, dbgS = 0;
  const SKIP = new Set(['candles', 'steam', 'held']);
  function walk(o) {
    if (!o.visible || o === camera || o.name === 'staff' || o.userData.staff || o.name === 'friends' || SKIP.has(o.userData.cat)) return;
    if (o.isMesh && !o.isSkinnedMesh && !o.isInstancedMesh && o.name !== 'water') {
      const m = Array.isArray(o.material) ? o.material[0] : o.material;
      if (m && !(m.transparent && !m.depthWrite) && m.blending !== THREE.AdditiveBlending && m.side !== THREE.BackSide) gather(o);
    }
    for (const c of o.children) walk(c);
  }
  const hit = { t: 0, x: 0, y: 0, z: 0, ny: 0 }, drop = { y: 0, on: 0, mx: 0, mz: 0, mid: false }, push = { x: 0, z: 0 };
  function findRest(it) {
    const p = camera.position, r = it.rf; camera.getWorldDirection(dir);
    region.makeEmpty(); region.expandByPoint(p); region.expandByPoint(v.copy(p).addScaledVector(dir, REACH)); region.expandByScalar(1.3); region.min.y -= 5;
    soupN = 0; scene.updateMatrixWorld(); walk(scene);
    let x, z, y0; lastTop = false;
    api._dbg = { n: soupN, meshes: dbgM, seen: dbgS, hit: null }; dbgM = 0; dbgS = 0;
    if (raySoup(hit, soup, soupN, p.x, p.y, p.z, dir.x, dir.y, dir.z, REACH, 0.4)) {      // nothing solid is nearer than the visitor's own girth
      x = hit.x; z = hit.z; y0 = hit.y + 0.3; api._dbg.hit = { ...hit };
      if (hit.ny < -0.5) return 'There is nowhere to rest it there.';                      // the underside of something
      if (hit.ny < 0.7) { const hl = Math.hypot(dir.x, dir.z) || 1; x -= dir.x / hl * (r + 0.08); z -= dir.z / hl * (r + 0.08); }      // a wall, a row of spines: stand it in front
      else lastTop = true;
    } else {
      if (!aimSpot(spot, p.x, p.y, p.z, dir.x, dir.y, dir.z, ctx.colliders, ctx.house.surfaces, r, it.h, REACH)) return 'There is nowhere to rest it there.';
      return { x: spot.x, y: spot.y, z: spot.z };
    }
    const s = restAt(it, x, z, y0);
    if (typeof s !== 'string' && hit.y - s.y > 3.4) return 'There is nowhere to rest it there.';      // a bare wall: it would only drop to the floor
    return s;
  }
  let lastTop = false;
  // Rest it at (x, z) on whatever is under y0, in the triangles gathered by findRest: or say why not
  function restAt(it, x, z, y0) {
    const p = camera.position, r = it.rf;
    const settle = () => {
      for (let n = 0; n < 4; n++) {
        if (!dropSoup(drop, soup, soupN, x, z, y0, r, 6)) return false;
        if (drop.on >= 4 && drop.mid) return true;
        x += (drop.mx - x) * 1.3; z += (drop.mz - z) * 1.3;                    // half off an edge: move onto it
      }
      return false;
    };
    if (!settle()) return 'It will not sit steady there.';
    for (let n = 0; n < 2; n++) {
      if (feel(push, soup, soupN, x, drop.y + Math.min(it.hh, 0.3), z, r * 0.92) < 0.02) break;
      x += push.x; z += push.z; y0 = drop.y + 0.3; if (!settle()) return 'There is not quite room for it there.';
    }
    if (feel(push, soup, soupN, x, drop.y + Math.min(it.hh, 0.3), z, r * 0.92) > 0.08) return 'There is not quite room for it there.';
    for (let n = 0; !headroom(soup, soupN, x, z, drop.y, it.h, r); n++) {                    // under a shelf or a screen: try a little nearer
      if (n === 2) return `The ${it.T.n} is too tall to stand there.`;
      const hl = Math.hypot(dir.x, dir.z) || 1; x -= dir.x / hl * r; z -= dir.z / hl * r; y0 = drop.y + 0.3; if (!settle()) return `The ${it.T.n} is too tall to stand there.`;
    }
    if (Math.hypot(x - p.x, z - p.z) > REACH + 1) return 'That is out of reach.';
    return { x, y: drop.y, z };
  }
  // No room just where she looked: the nearest clear spot on the same top
  function restNear(it) {
    if (!lastTop) return null;
    const hx = hit.x, hy = hit.y, hz = hit.z;
    for (const rr of [0.3, 0.55, 0.8, 1.1, 1.4]) for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4 + rr, s = restAt(it, hx + Math.cos(a) * rr, hz + Math.sin(a) * rr, hy + 0.3);
      if (typeof s !== 'string' && Math.abs(s.y - hy) < 0.2) return s;
    }
    return null;
  }
  // Things set down belong to the room they are in: one group a room, shown and hidden with it
  const groups = new Map();
  function groupAt(x, y, z) {
    const zone = (ctx.zoneAt?.(x, y, z, 0.3) ?? '').replace(/:(small|big)$/, '');
    let g = groups.get(zone);
    if (!g) { g = new THREE.Group(); g.userData.cat = 'setdown'; scene.add(g); if (zone) ctx.track?.(g, zone); groups.set(zone, g); }
    return g;
  }
  function setDown(back = false, at = null, how = null) {
    const it = held ?? otherIt(); if (!it) return false;
    if (inspecting) look(false);
    let s, yaw = camera.rotation.y + 0.5;
    if (back && it.home) { s = { x: it.home.x, y: it.home.y - it.hh, z: it.home.z }; yaw = it.home.rotY; how = 'back'; }
    else if (at) s = at;
    else {
      s = findRest(it);
      if (typeof s === 'string') {                                    // will not go there: beside it, back home, or at her feet
        const why = s, n = restNear(it);
        if (n) { s = n; how = 'near'; }
        else if (nearHome(it)) return setDown(true);
        else { camera.getWorldDirection(dir); s = atFeet(it); how = 'feet'; }
        api._why = why;
      }
    }
    if (how === 'near') note(`No room just there: you set the ${it.T.n} down beside it.`, 2600);
    else if (how === 'feet' && !at) note(`You set the ${it.T.n} down at your feet.`, 2600);
    api.lastDown = { how: how ?? 'here', x: s.x, y: s.y, z: s.z, what: it.T.n };
    if (it.other) { ctx.otherHand.place(s, yaw); return true; }
    back = how === 'back';
    const o = it.obj; camera.remove(o);
    o.position.set(s.x, s.y + it.hh * (it.shrink ?? 1) + (back ? 0 : 0.004), s.z); o.rotation.set(0, yaw, 0); o.scale.setScalar(it.shrink ?? 1); o.visible = true;
    groupAt(o.position.x, o.position.y, o.position.z).add(o);
    it.state = back ? 'home' : 'down'; it.x = o.position.x; it.y = o.position.y; it.z = o.position.z; it.ent.y = it.y; it.ent.z = it.z;
    held = null; chew = -1; done();
    api.moved = all.filter(a => a.state === 'down').map(a => ({ what: a.T.n, x: +a.x.toFixed(2), y: +a.y.toFixed(2), z: +a.z.toFixed(2) }));
    return true;
  }

  // ---- Snacks: the packets the rooms draw. Take one; the shelf stays stocked ------------------
  const snacks = [];
  const doors = ctx.items.hinged ?? [];
  const addSnack = (S, e) => {
    const s = { S, e, door: doors.find(d => d.cx !== undefined && Math.hypot(d.cx - e.x, d.cz - e.z) < 1.3 && e.y > d.y0 && e.y < d.y1) ?? null };
    s.ent = { x: e.x, y: e.y, z: e.z, reach: 5.5, size: Math.max(0.4, e.w ?? 0.4, e.h ?? 0), label: () => S.take, act: () => takeSnack(s) };
    ctx.interact.push(s.ent); snacks.push(s);
  };
  for (const e of ctx.items.extras ?? []) { const S = e.draw && SNACKS[e.draw.name]; if (S) addSnack(S, e); }
  for (const sp of ctx.items.spots ?? []) if (sp.action === 'snack' && SNACKS[sp.name]) addSnack(SNACKS[sp.name], sp);      // if a room ever lists them outright
  function takeSnack(s) {
    if (held) { note(`Your hand is full: you have the ${held.T.n}.`); return; }
    const { S, e } = s, cw = e.cw ?? 128, ch = e.ch ?? 160, c = document.createElement('canvas'); c.width = cw; c.height = ch;
    const g = c.getContext('2d');
    if (e.draw) e.draw(g, cw, ch); else { g.fillStyle = '#e9dfc8'; g.fillRect(0, 0, cw, ch); g.fillStyle = '#2a1c13'; g.font = `${cw / 7}px Georgia, serif`; g.textAlign = 'center'; g.fillText(S.n, cw / 2, ch / 2, cw - 8); }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const k = Math.min(1, 0.46 / Math.max(e.w ?? 0.4, e.h ?? 0.5)), w = (e.w ?? 0.4) * k, h = (e.h ?? 0.5) * k, d = Math.max(0.035, Math.min(w, h) * 0.3);
    const geo = new THREE.BoxGeometry(w, h, d), uv = geo.attributes.uv;
    for (let f = 0; f < 4; f++) for (let n = 0; n < 4; n++) uv.setXY(f * 4 + n, 3 / cw, 0.5);                // the sides take the colour at the label's edge
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, envMapIntensity: 0.2 })); mesh.receiveShadow = true;
    const it = { T: S, snack: true, id: 'snack', state: 'held', obj: new THREE.Group(), home: null, x: 0, y: 0, z: 0 };
    it.obj.add(mesh); it.obj.userData.cat = 'held'; shape(it, w, h, d);
    it.ent = { x: FAR, y: 0, z: 0, reach: 5.5, size: 0.5, label: () => `pick up the ${S.n}`, act: () => pickUp(it) };
    ctx.interact.push(it.ent); all.push(it); take(it);
  }

  // ---- One from a plate, a stand or a bunch (things.js portion): a slice, a croissant, a banana --
  const tint = (c, r = 0.7) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
  function portionMesh(P) {
    const g = new THREE.Group(), add = (geo, c, y = 0) => { const m = new THREE.Mesh(geo, tint(c)); m.position.y = y; g.add(m); return m; };
    if (P.shape === 'slice') { const a = 0.8; add(new THREE.CylinderGeometry(0.36, 0.36, 0.24, 6, 1, false, -a / 2, a), P.color, 0.12); add(new THREE.CylinderGeometry(0.36, 0.36, 0.04, 6, 1, false, -a / 2, a), P.top ?? P.color, 0.26); }
    else if (P.shape === 'cake') { add(new THREE.CylinderGeometry(0.12, 0.13, 0.16, 14), P.color, 0.08); add(new THREE.SphereGeometry(0.035, 8, 6), P.top ?? P.color, 0.18); }
    else if (P.shape === 'long') { const m = add(new THREE.CapsuleGeometry(0.06, 0.42, 4, 8), P.color, 0.06); m.rotation.z = Math.PI / 2 - 0.25; }
    else { const m = add(new THREE.SphereGeometry(0.15, 14, 10), P.color, 0.15); m.scale.y = P.flat ?? 1; }
    return g;
  }
  async function takePortion(src) {
    const T = src.T, P = T.portion;
    let body = null;
    if (P.model && ctx.loadModel) { try { body = await ctx.loadModel(P.model); } catch { body = null; } }
    if (held) return false;                                                  // (something else was taken meanwhile)
    body ??= portionMesh(P);
    body.traverse(n => { if (n.isMesh) n.castShadow = false; });
    body.updateMatrixWorld(true); box.setFromObject(body); box.getCenter(v); box.getSize(v2); body.position.sub(v);
    const PT = src.PT ??= { n: P.n, l: P.l ?? T.l, eat: T.eat, bites: P.bites ?? T.bites, done: T.done, taste: T.taste };
    const it = { T: PT, snack: true, id: 'portion:' + src.id, state: 'held', obj: new THREE.Group(), home: null, x: 0, y: 0, z: 0 };
    it.obj.add(body); it.obj.userData.cat = 'held'; shape(it, v2.x, v2.y, v2.z);
    it.ent = { x: FAR, y: 0, z: 0, reach: 5.5, size: 0.5, label: () => `pick up the ${PT.n}`, act: () => pickUp(it) };
    ctx.interact.push(it.ent); all.push(it); take(it);
    return true;
  }

  // ---- Touch: two small buttons while something is held -------------------------------------
  let bar = null;
  if (touch) {
    const st = document.createElement('style');
    st.textContent = `#hd-bar { position: fixed; z-index: 7; left: calc(max(16px, env(safe-area-inset-left)) + 6px); bottom: calc(max(14px, env(safe-area-inset-bottom)) + 176px); display: none; gap: 8px; }
#hd-bar.on { display: flex; } #hd-bar button { font: 15px var(--serif, Georgia, serif); color: var(--cream, #f6eddc); background: var(--smoke, rgba(30,21,15,.74)); border: 1.5px solid rgba(246,237,220,.55); border-radius: 22px; padding: 9px 14px; }
#hd-bar .eat { display: none; } #hd-bar.food .eat { display: block; } #hd-bar.looking .turn { border-color: var(--amber, #e2a647); color: var(--amber, #e2a647); }`;
    document.head.appendChild(st);
    bar = document.createElement('div'); bar.id = 'hd-bar'; bar.innerHTML = '<button class="turn" type="button">Turn it over</button><button class="eat" type="button">Take a bite</button>';
    document.body.appendChild(bar);
    bar.querySelector('.turn').addEventListener('click', () => look(!inspecting));
    bar.querySelector('.eat').addEventListener('click', () => bite());
  }

  // ---- For the test pages and for other parts of the house -----------------------------------
  Object.defineProperties(api, { held: { get: () => (held ? held.T.n : null), configurable: true }, inspecting: { get: () => inspecting, configurable: true },
    holding: { get: () => (held ? { n: held.T.n, eat: !!held.T.eat, whole: held.T.eat === 'whole' } : null), configurable: true } });      // (what is in the hand, for staff/roomba.js)
  // A few crumbs off what is held (Reginald's treat): whole food gets a little smaller, never gone
  api.crumble = () => { const it = held; if (!it?.T.eat) return false; if (it.T.eat === 'whole') it.shrink = Math.max(0.2, (it.shrink ?? 1) - 0.05); return true; };
  Object.assign(api, {
    things: () => all.map(a => ({ id: a.id, name: a.T.n, state: a.state, x: a.x, y: a.y, z: a.z })),
    snacks: () => snacks.map(s => ({ name: s.S.n, x: s.e.x, y: s.e.y, z: s.e.z, shut: !!(s.door && !s.door.isOpen) })),
    // hold('jug_01'), hold('snack:cheezit'): pick it up from wherever it is (waits for the model to arrive)
    async hold(id, quick = true) {
      snap = quick;
      if (id.startsWith('snack:')) { const s = snacks.find(s => s.e.draw?.name === id.slice(6) || s.e.name === id.slice(6)); if (!s) return false; takeSnack(s); return true; }
      const it = all.find(a => a.id === id && a.state !== 'gone' && a.state !== 'held'); if (!it) return false;
      for (let n = 0; n < 150 && !it.obj; n++) { it.tried = 0; if (resolve(it)) break; await new Promise(r => setTimeout(r, 200)); }
      pickUp(it); return held === it;
    },
    look, bite, setDown, plan: () => ({ ...plan }), doPlan, turn: (dx, dy) => held && turn(dx, dy),
    rest: () => { const it = held; if (!it) return null; const s = findRest(it); return typeof s === 'string' ? s : { ...s, tris: soupN }; },
    cost: () => { let calls = 0, tris = 0; held?.obj.traverse(n => { if (n.isMesh) { calls++; tris += (n.geometry.index ? n.geometry.index.count : n.geometry.attributes.position.count) / 3; } }); return { calls, tris }; },
  });
  return api;
}
