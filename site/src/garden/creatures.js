// Easter eggs of nature. Here: a snail creeping round a pot by the front door,
// a hare in the lettuces, a red squirrel on the tree seat, a jay at the bird
// bath, butterflies visiting the flowers by day, dragonflies patrolling the
// pond, fireflies over the meadow at night. The rest of the garden's animals
// (hedgehog, robin, sparrows, blackbird, owl, bats, bees, fox, heron,
// ducklings, rabbits, tortoise, mouse, swallows) are in creatures_more.js,
// loaded once the garden is first in view.
//
// Every animal is a member of one crew (creatureKit below): it loads its model
// only when the visitor is outdoors and within reach, thinks a few times a
// second, moves every frame only while she is near enough to see it, and is
// hidden (and costs nothing) otherwise. Nothing is allocated per frame.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { rng, cardMaterials, atlasTexture, cellUV } from './cards.js';
import { at as pondAt, sAt as pondS } from './pond_shape.js';

export const FT = 3.28084;
const TAU = Math.PI * 2;
export const wrapA = a => ((a + Math.PI) % TAU + TAU) % TAU - Math.PI;
export const turnTo = (a, b, k) => { const d = wrapA(b - a); return Math.abs(d) <= k ? b : a + Math.sign(d) * k; };
export const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
export const ease = u => u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u);

// ---- The crew: lazy loading, distance and hour gating, one think a quarter-second ----------
export function creatureKit(ctx) {
  const { scene, animated, day } = ctx, cam = ctx.camera.position, loader = new GLTFLoader();
  const files = new Map(), meshes = new Map(), crew = [];
  // a prepared animal (glTF, metres, facing +z, feet at y = 0), fetched once
  const glb = id => {
    if (!files.has(id)) files.set(id, new Promise((ok, bad) => loader.load(`assets/models/${id}/${id}.glb`, g => {
      g.scene.traverse(n => { if (n.isMesh) { n.castShadow = false; n.receiveShadow = true; n.userData.creature = true; } }); ok(g);
    }, undefined, bad)));
    return files.get(id);
  };
  // one plain mesh (geometry in feet) from a single-mesh model; geometry and material shared per (id, scale, tint)
  const mesh = async (id, s = 1, tint = null) => {
    const key = id + '|' + s + '|' + tint;
    if (!meshes.has(key)) meshes.set(key, glb(id).then(g => {
      let src = null; g.scene.updateMatrixWorld(true); g.scene.traverse(n => { if (n.isMesh && !src) src = n; });
      const geo = src.geometry.clone().applyMatrix4(src.matrixWorld); geo.scale(FT * s, FT * s, FT * s); geo.computeBoundingSphere();
      let mat = src.material; if (tint != null) { mat = mat.clone(); mat.color.multiply(new THREE.Color(tint)); }
      return { geo, mat };
    }));
    const { geo, mat } = await meshes.get(key);
    const m = new THREE.Mesh(geo, mat); m.castShadow = false; m.receiveShadow = true; m.userData.creature = true; return m;
  };

  // The ground (or whatever solid thing is there) under x, z: a ray down from `top` against
  // the plain meshes outdoors (not the plants, grass cards, instanced things or animals).
  // Only called when an animal picks a new spot, never per frame.
  const ray = new THREE.Raycaster(), hits = [], box = new THREE.Box3();
  ray.ray.direction.set(0, -1, 0);
  // (the island's own lawn, drawn by main.js, runs on under the pond at 0.03 ft: it is left out, and is the fallback height)
  const solid = n => n.isMesh && !n.isInstancedMesh && !n.isSkinnedMesh && !n.userData.creature && n.userData.cat !== 'island' && n.visible !== false &&
    !(Array.isArray(n.material) ? n.material : [n.material]).some(m => m.alphaTest > 0 || m.transparent || m.depthWrite === false);
  const ground = (x, z, top = 3, fallback = 0.03) => {      // (0.03: the island's lawn, drawn by main.js)
    ray.ray.origin.set(x, top, z); ray.far = top + 3; let best = -Infinity;
    scene.updateMatrixWorld();
    scene.traverse(n => {
      if (!solid(n)) return;
      const g = n.geometry; if (!g.boundingBox) g.computeBoundingBox();
      box.copy(g.boundingBox).applyMatrix4(n.matrixWorld);
      if (x < box.min.x || x > box.max.x || z < box.min.z || z > box.max.z || box.min.y > top) return;
      hits.length = 0; n.raycast(ray, hits);
      for (const h of hits) if (h.point.y > best && h.point.y <= top) best = h.point.y;
    });
    return best > -50 ? best : fallback;
  };
  // the same for a ray in any direction (a trunk's side, a branch): distance to the first solid thing, or Infinity
  const cast = (ox, oy, oz, dx, dy, dz, far = 20) => {
    ray.ray.origin.set(ox, oy, oz); ray.ray.direction.set(dx, dy, dz).normalize(); ray.far = far; let best = Infinity;
    scene.updateMatrixWorld();
    scene.traverse(n => { if (!solid(n)) return; hits.length = 0; n.raycast(ray, hits); for (const h of hits) best = Math.min(best, h.distance); });
    ray.ray.direction.set(0, -1, 0);
    return best;
  };
  // inside the footprint of something low the visitor bumps into (a bed, a bench, a pot)?
  const blocked = (x, z, pad = 0.15, below = 1.0) => ctx.colliders.some(c => c.y0 < below && x > c.x0 - pad && x < c.x1 + pad && z > c.z0 - pad && z < c.z1 + pad);
  const dist = (x, z) => Math.hypot(cam.x - x, cam.z - z);
  const dist3 = (x, y, z) => Math.hypot(cam.x - x, cam.y - y, cam.z - z);

  // A crew member: { name, x, z, load (ft), live (ft), when(), init() -> Promise, show(on), think(t, d), tick(t, dt), check() }
  const add = c => { Object.assign(c, { loaded: false, loading: false, on: false }); crew.push(c); return c; };
  let next = 0;
  const all = new URLSearchParams(location.search).has('allcreatures');      // tests: load and run everything, everywhere
  animated.push((t, dt) => {
    if (!scene.visible && !all) return;                                       // the garden is out of sight: nothing runs
    dt = Math.min(dt, 0.1);
    if (t >= next) {
      next = t + 0.25;
      for (const c of crew) {
        const d = dist(c.x, c.z), want = c.when ? c.when() : true;
        if (!c.loaded && !c.loading && (all || (want && d < (c.load ?? 150)))) {
          c.loading = true;
          c.init().then(() => { c.loaded = true; }).catch(e => { console.warn('creature', c.name, e?.message ?? e); });
        }
        const on = c.loaded && want && (all || d < (c.live ?? 100));
        if (on !== c.on) { c.on = on; c.show?.(on); }
        if (on) c.think?.(t, d);
      }
    }
    for (let i = 0; i < crew.length; i++) if (crew[i].on) crew[i].tick(t, dt);
  });
  // An animal's feet: the vertices within 0.015 ft of the lowest point of its geometry (in its own frame).
  // Only the middle of the body's footprint counts (a long tail hanging below a perch is not a foot).
  const central = (geo, i) => { if (!geo.boundingBox) geo.computeBoundingBox(); const b = geo.boundingBox, p = geo.attributes.position, cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2;
    return Math.abs(p.getX(i) - cx) < 0.4 * (b.max.x - b.min.x) && Math.abs(p.getZ(i) - cz) < 0.3 * (b.max.z - b.min.z); };
  // (the lower third of the body's middle: whichever of those is lowest in a pose, a foot or the breast as it stoops, meets the ground)
  const feet = geo => {
    const p = geo.attributes.position; let lo = Infinity, hi = -Infinity; for (let i = 0; i < p.count; i++) if (central(geo, i)) { lo = Math.min(lo, p.getY(i)); hi = Math.max(hi, p.getY(i)); }
    const pick = []; for (let i = 0; i < p.count; i++) if (central(geo, i) && p.getY(i) < lo + 0.3 * (hi - lo)) pick.push(i);
    const step = Math.max(1, Math.ceil(pick.length / 300)), out = [];
    for (let k = 0; k < pick.length; k++) { const i = pick[k]; if (k % step === 0 || p.getY(i) < lo + 0.015) out.push(p.getX(i), p.getY(i), p.getZ(i)); }
    return new Float32Array(out);
  };
  // Stand o on a surface at height y (plus lift, in a hop): whatever its pose (rotation, scale), its lowest foot
  // ends exactly at y. Its x, z are left alone. Cheap: a few dozen points, no allocation.
  const plant = (o, pts, y, lift = 0) => {
    o.position.y = 0; o.updateMatrix(); const e = o.matrix.elements; let lo = Infinity;
    for (let i = 0; i < pts.length; i += 3) { const v = e[1] * pts[i] + e[5] * pts[i + 1] + e[9] * pts[i + 2]; if (v < lo) lo = v; }
    o.position.y = y + lift - lo;
  };
  const kit = { ctx, day, cam, scene, glb, mesh, ground, cast, blocked, dist, dist3, add, crew, feet, plant, central };
  if (typeof window !== 'undefined') { window.__creatures = crew; window.__creatureKit = kit; }      // for tests (gardentest.html?creatures=1)
  return kit;
}

// A walk along waypoints [[x, y, z], ...] at a speed, optionally in hops (stride, height): it
// moves its object every frame it is stepped and turns it to face the way it goes (+z forward).
export class Walk {
  constructor(o) { this.o = o; this.pts = []; this.i = 0; this.speed = 1; this.hop = 0; this.stride = 1; this.ph = 0; this.turn = 7; this.sx = 0; this.sy = 0; this.sz = 0; this.seg = 1; this.face = true; }
  go(pts, speed, hop = 0, stride = 1, turn = 7, base) { if (base != null) this.base = base; this.pts = pts; this.i = 0; this.speed = speed; this.hop = hop; this.stride = stride; this.turn = turn; this.begin(); return this; }
  begin() {
    const o = this.o.position; this.sx = o.x; this.sy = this.base ?? o.y; this.sz = o.z; this.ph = 0;
    const p = this.pts[this.i]; if (!p) return;
    const d = Math.hypot(p[0] - o.x, p[2] - o.z); this.seg = d;
    this.st = this.hop ? d / Math.max(1, Math.round(d / this.stride)) : 1;
  }
  get busy() { return this.i < this.pts.length; }
  step(dt) {
    if (!this.busy) return false;
    const p = this.pts[this.i], o = this.o.position, dx = p[0] - o.x, dz = p[2] - o.z, d = Math.hypot(dx, dz);
    let fwd = 1;
    if (this.face && d > 0.02) { const want = Math.atan2(dx, dz); this.o.rotation.y = turnTo(this.o.rotation.y, want, this.turn * dt); fwd = Math.max(0.2, Math.cos(wrapA(want - this.o.rotation.y))); }
    const mv = Math.min(d, this.speed * dt * fwd);                                // it goes the way its head points: turning first, never crabwise
    if (d > 1e-5) { o.x += dx / d * mv; o.z += dz / d * mv; }
    const f = this.seg > 1e-4 ? 1 - Math.max(0, d - mv) / this.seg : 1;
    this.ph += mv / this.st;
    this.base = this.sy + (p[1] - this.sy) * f; this.lift = this.hop ? this.hop * Math.abs(Math.sin(Math.PI * this.ph)) : 0;
    o.y = this.base + this.lift;
    if (d - mv < 1e-4) { o.y = this.base = p[1]; this.lift = 0; this.sy = p[1]; this.i++; this.begin(); }
    return true;
  }
}

// A flight from where it is to (x, y, z) in a few seconds, rising over an arc; returns the progress 0..1.
export class Flight {
  constructor(o) { this.o = o; this.a = new THREE.Vector3(); this.b = new THREE.Vector3(); this.u = 1; this.T = 1; this.lift = 1; }
  go(x, y, z, T, lift = 1) { this.a.copy(this.o.position); this.b.set(x, y, z); this.u = 0; this.T = T; this.lift = lift; return this; }
  get busy() { return this.u < 1; }
  step(dt) {
    if (this.u >= 1) return 1;
    this.u = Math.min(1, this.u + dt / this.T);
    const k = ease(this.u), o = this.o, a = this.a, b = this.b;
    o.position.set(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k + this.lift * 4 * k * (1 - k), a.z + (b.z - a.z) * k);
    if (Math.hypot(b.x - a.x, b.z - a.z) > 0.3) o.rotation.y = turnTo(o.rotation.y, Math.atan2(b.x - a.x, b.z - a.z), dt * 9);
    o.rotation.x = this.u < 0.8 ? -0.12 * Math.sin(Math.PI * this.u / 0.8) * Math.sign(b.y - a.y || 1) : -0.35 * Math.sin(Math.PI * (this.u - 0.8) / 0.2);   // flared to land
    return this.u;
  }
}

// Two flat wings for a bird that otherwise has its wings folded: hidden when it sits, beating in flight.
// Each wing hinges on the body's long axis (z), so the pair beats up and down about the back.
export function wingPair(span, chord, color, tip, at = [0, 0, 0]) {
  const g = new THREE.BufferGeometry(), c0 = new THREE.Color(color), c1 = new THREE.Color(tip);
  // root along z from +chord/2 (leading) to -chord/2, tip swept back at x = span/2
  const P = [0, 0, chord * 0.5, 0, 0, -chord * 0.5, span * 0.5, 0, -chord * 0.55, 0, 0, chord * 0.5, span * 0.5, 0, -chord * 0.55, span * 0.42, 0, chord * 0.05];
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute([...c0.toArray(), ...c0.toArray(), ...c1.toArray(), ...c0.toArray(), ...c1.toArray(), ...c1.toArray()], 3));
  g.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide });
  const grp = new THREE.Group(); grp.position.set(...at); grp.visible = false;
  const L = new THREE.Mesh(g, mat), R = new THREE.Mesh(g, mat); R.scale.x = -1;
  for (const w of [L, R]) { w.castShadow = false; w.userData.creature = true; w.userData.wing = true; grp.add(w); }
  grp.userData.flap = a => { L.rotation.z = a; R.rotation.z = -a; };      // a > 0: both tips up
  return grp;
}

// Merge coloured parts into one mesh (vertex colours)
function partsGeo(parts) {
  return mergeGeometries(parts.map(([geo, color]) => {
    const g = (geo.index ? geo.toNonIndexed() : geo).clone();
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal'].includes(k)) g.deleteAttribute(k);
    const n = g.attributes.position.count, c = new Float32Array(n * 3), col = new THREE.Color(color);
    for (let i = 0; i < n; i++) col.toArray(c, i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(c, 3));
    return g;
  }));
}
const S = (r, w = 10, h = 8) => new THREE.SphereGeometry(r, w, h);
const at = (g, x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) => { g.scale(sx, sy, sz); g.rotateX(rx); g.rotateY(ry); g.rotateZ(rz); g.translate(x, y, z); return g; };

// The snail: shell, foot and eye stalks apart, so it can pull in. Head toward +x, foot on y = 0.
function snail(mat) {
  const pts = []; for (let i = 0; i <= 60; i++) { const t = i / 60, a = t * Math.PI * 5, rr = 0.12 * (1 - t * 0.85); pts.push(new THREE.Vector3(Math.cos(a) * rr, Math.sin(a) * rr + 0.14, t * 0.06 - 0.03)); }
  const shellG = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.05, 6).toNonIndexed();
  const sp = shellG.attributes.position, sc = new Float32Array(sp.count * 3);
  for (let i = 0; i < sp.count; i++) { const band = Math.sin(i * 0.05) > 0.6; new THREE.Color(band ? 0x5a3a1e : 0xb0884a).toArray(sc, i * 3); }
  shellG.deleteAttribute('uv'); shellG.setAttribute('color', new THREE.BufferAttribute(sc, 3));
  const g = new THREE.Group();
  const shell = new THREE.Mesh(shellG, mat), body = new THREE.Mesh(partsGeo([[at(S(0.06), 0.03, 0.03, 0, 3.4, 0.55, 1.0), 0x9a8a6a], [at(S(0.04, 8, 6), 0.21, 0.045, 0, 1.2, 0.9, 0.9), 0x9a8a6a]]), mat);
  const stalkG = partsGeo([-1, 1].flatMap(s => [[at(new THREE.CylinderGeometry(0.008, 0.011, 0.11, 5), 0, 0.055, 0).rotateX(s * 0.35).rotateZ(-0.45), 0x8a7a5a],
    [at(S(0.016, 6, 4), 0, 0.11, 0).rotateX(s * 0.35).rotateZ(-0.45), 0x2a2420]]).map(([geo, c], i) => [geo.translate(0, 0, (i < 2 ? -1 : 1) * 0.022), c]));
  const stalks = new THREE.Mesh(stalkG, mat); stalks.position.set(0.23, 0.06, 0);
  for (const m of [shell, body, stalks]) { m.castShadow = false; m.receiveShadow = true; m.userData.creature = true; g.add(m); }
  g.userData = { body, stalks };
  return g;
}

export function creatures(ctx, K) {
  const { scene, animated, day } = ctx, r = rng(31337);
  const kit = creatureKit(ctx), { add, mesh, ground, cast, dist, dist3, cam, feet, plant } = kit;
  const daytime = () => day.light > 0.3;

  // ---- The snail, creeping round the outside of the pot by the front door --------------------
  // (K.snails gives the snail's old spot, 0.75 ft out and 0.8 ft up from the pot's foot; the pot is
  // K.pot's lathe at size 0.95: its outer wall runs from radius 0.7 at 0.08 up to 0.86 at 1.0, then the lip.)
  {
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55 });
    for (const sn of K.snails ?? []) {
      const pot = sn.pot ?? { x: sn.x - 0.75, y: sn.y - 0.8, z: sn.z - 0.3, s: 0.95 }, s = pot.s;
      const wallR = h => 0.7 + 0.16 * (h - 0.08) / 0.92, slope = 0.16 / 0.92;
      let g = null, th = Math.atan2(sn.z - pot.z, sn.x - pot.x) + 0.6, ph = 1.2, k = 1, shyUntil = 0;
      const X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3(), M = new THREE.Matrix4();
      const height = p => 0.56 + 0.3 * Math.sin(p);                               // unscaled height up the wall: from near the foot to just under the lip
      const place = () => {
        const h = height(ph), cx = Math.cos(th), cz = Math.sin(th), R = wallR(h) * s;
        g.position.set(pot.x + cx * R, pot.y + h * s, pot.z + cz * R);
        Y.set(cx, -slope, cz).normalize();                                          // the wall's outward normal
        const dh = 0.16 * Math.cos(ph) * 0.35;                                       // creeping a little up or down as it goes
        X.set(-cz, 0, cx).multiplyScalar(R).add(Z.set(cx * slope, 1, cz * slope).multiplyScalar(dh * s));          // round the pot, a little up or down
        X.addScaledVector(Y, -X.dot(Y)).normalize(); Z.crossVectors(X, Y);
        g.quaternion.setFromRotationMatrix(M.makeBasis(X, Y, Z));
      };
      add({
        name: 'snail', x: pot.x, z: pot.z, load: 60, live: 45,
        init: async () => { g = snail(mat); g.scale.setScalar(0.85); place(); scene.add(g); },
        show: on => { g.visible = on; },
        think: t => { if (dist3(g.position.x, g.position.y, g.position.z) < 3.2) shyUntil = t + 4; },
        tick: (t, dt) => {
          const shy = t < shyUntil;
          k = shy ? Math.max(0, k - dt * 2.5) : Math.min(1, k + dt * 0.35);
          const { body, stalks } = g.userData;
          stalks.scale.setScalar(0.12 + 0.88 * k); body.scale.x = 0.45 + 0.55 * k;
          stalks.rotation.set(0.18 * Math.sin(t * 0.9), 0.15 * Math.sin(t * 0.6 + 1), 0.12 * Math.sin(t * 1.3));
          if (k > 0.97) { th += 0.03 * dt / (wallR(height(ph)) * s); ph += 0.03 * dt; place(); }
        },
        check: () => ({ x: g.position.x, y: g.position.y, z: g.position.z, perch: 'pot wall', err: Math.abs(Math.hypot(g.position.x - pot.x, g.position.z - pot.z) - wallR((g.position.y - pot.y) / s) * s) }),
      });
    }
  }

  // ---- The hare in the lettuces: nibbles, sits up and looks about, lollops off if you come close --
  if (K.rabbitAt) {
    const home = K.rabbitAt; let o = null, w = null, fp = null, state = 'nibble', until = 0, away = 0, gy = 0.03, face = Math.PI / 2, look = face, sy = 0.03;
    const gap = { x: home.x + 0.1, z0: -75.6, z1: -64.4 };                         // the gravel between the lettuce bed and the next
    const ESC = [[[gap.x, -62.6]], [[gap.x, -79.4], [30.2, -80], [24.6, -80], [19, -85]]];      // up the gap to the border, or out through the south gate
    let esc = null, fled = false;
    add({
      name: 'hare', x: home.x, z: home.z, load: 90, live: 70, when: () => day.light > 0.1,
      init: async () => { o = await mesh('v_hare', 0.62, 0xc9b8a0); fp = feet(o.geometry); gy = sy = ground(home.x, home.z, 2); o.position.set(home.x, gy, home.z); o.rotation.y = face; scene.add(o); w = new Walk(o); w.base = gy; },
      show: on => { o.visible = on; },
      think: (t, d) => {
        const p = o.position;
        if (!fled && dist(p.x, p.z) < 13) {                                          // too close: off, the long way from her
          const a = ESC[0], b = ESC[1], da = dist(a[0][0], a[0][1]), db = dist(b[0][0], b[0][1]);
          esc = da > db ? a : b; fled = true; away = 0;
          w.go(esc.map(([x, z]) => [x, ground(x, z, 2), z]), 7.5, 0.38, 2.2, 10, sy); state = 'run'; return;
        }
        if (fled) { if (!w.busy) { if (state === 'run') { state = 'alert'; sy = w.base; } away = dist(home.x, home.z) > 24 && dist(p.x, p.z) > 18 ? away + 0.25 : 0; }
          if (away > 15) { fled = false; state = 'back'; const back = esc.slice(0, -1).reverse().map(([x, z]) => [x, ground(x, z, 2), z]); back.push([home.x, gy, home.z]); w.go(back, 3.2, 0.25, 1.1, 6, sy); } return; }
        if (w.busy || t < until) return;
        const k = r();                                                               // what next: mostly eating
        if (k < 0.5) { state = 'nibble'; until = t + 4 + r() * 7; look = face; }
        else if (k < 0.72) { state = 'up'; until = t + 2.5 + r() * 3; look = face + (r() - 0.5) * 0.9; }
        else if (k < 0.85) { state = 'nibble'; until = t + 3; look = face + (r() - 0.5) * 0.6; }
        else { state = 'hop'; const z = Math.min(gap.z1, Math.max(gap.z0, p.z + (r() < 0.5 ? -1 : 1) * (1.5 + r() * 2.5))); w.go([[gap.x, gy, z]], 1.8, 0.22, 0.85, 6, sy); until = t + 1; }
      },
      tick: (t, dt) => {
        if (w.step(dt)) { o.rotation.x = -0.1 * Math.sin(Math.PI * w.ph); plant(o, fp, w.base, w.lift); sy = w.base; return; }
        if (state === 'hop' || state === 'back') { state = 'nibble'; o.rotation.y = turnTo(o.rotation.y, face, 0); }
        if (state === 'alert') look = Math.atan2(cam.x - o.position.x, cam.z - o.position.z);
        const dy = turnTo(o.rotation.y, look, dt * 1.6), turning = Math.abs(dy - o.rotation.y) > 1e-4; o.rotation.y = dy;
        const up = state === 'up' || state === 'alert' ? 1 : 0;
        o.rotation.x += ((up ? -0.3 : state === 'nibble' ? 0.12 + 0.04 * Math.max(0, Math.sin(t * 11)) : 0) - o.rotation.x) * Math.min(1, dt * 5);
        plant(o, fp, sy, turning ? 0.03 * Math.abs(Math.sin(t * 14)) : 0);            // turning round in small shuffles
      },
      check: () => ({ x: o.position.x, y: o.position.y, z: o.position.z, perch: 'ground', air: w.busy && w.lift > 0.005 }),
    });
  }

  // ---- The red squirrel on the tree seat: bounds along a plank of it, freezes, flicks its tail; up the trunk if
  // you come near. The seat (garden.js) is eight sides of four planks, at radius 3.4, 3.8, 4.2 and 4.6 ft round
  // the oak; the squirrel keeps to the middle of the third plank, and to the inner one before it leaps to the bark.
  if (K.squirrelOn) {
    const S0 = K.squirrelOn, ox = -62, oz = 42, PL = 4.2, IN = 3.4;
    let o = null, fp = null, seatIn = S0.y, seatY = S0.y, s = 0, aim = 0, state = 'sit', until = 0, flickAt = -9, safe = 0, lift = 0, ph = 0, h = 0, bark = null, rad = PL, look = 0;
    const X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3(), M = new THREE.Matrix4();
    // a point on an octagonal plank at radius rr, by distance s along it (perimeter 8 * edge), and the way along it there
    const vx = (rr, k) => ox + Math.cos(k * Math.PI / 4) * rr, vz = (rr, k) => oz + Math.sin(k * Math.PI / 4) * rr;
    const per = rr => 8 * 2 * rr * Math.sin(Math.PI / 8);
    const onPlank = (rr, ss) => { const L = per(rr) / 8, u = ((ss % per(rr)) + per(rr)) % per(rr), k = Math.floor(u / L), f = u / L - k; o.position.x = vx(rr, k) + (vx(rr, k + 1) - vx(rr, k)) * f; o.position.z = vz(rr, k) + (vz(rr, k + 1) - vz(rr, k)) * f; return Math.atan2(vx(rr, k + 1) - vx(rr, k), vz(rr, k + 1) - vz(rr, k)); };
    const angleOf = () => Math.atan2(o.position.z - oz, o.position.x - ox);
    const oct = a => { const u = ((a % (Math.PI / 4)) + Math.PI / 4) % (Math.PI / 4); return Math.cos(Math.PI / 8) / Math.cos(u - Math.PI / 8); };   // a plank's middle at angle a, as a share of its corner radius
    const barkAt = y => { const k = Math.max(0, Math.min(bark.length - 1, (y - 2) / 0.5)), i = Math.floor(k), f = k - i; return bark[i] + ((bark[Math.min(i + 1, bark.length - 1)] ?? bark[i]) - bark[i]) * f; };
    const onBark = (y, down) => {                                                  // belly to the bark, nose up (or down)
      const a = angleOf(), cx = Math.cos(a), cz = Math.sin(a), rr = barkAt(y);
      o.position.set(ox + cx * rr, y, oz + cz * rr);
      Y.set(cx, 0, cz); Z.set(0, down ? -1 : 1, 0); X.crossVectors(Y, Z); o.quaternion.setFromRotationMatrix(M.makeBasis(X, Y, Z));
    };
    add({
      name: 'squirrel', x: ox, z: oz, load: 90, live: 70, when: daytime,
      init: async () => {
        o = await mesh('v_squirrel', 1.0, 0xd08a5a); fp = feet(o.geometry);
        // start where garden.js put it, moved onto the middle of the third plank; the plank's top is measured
        const a0 = Math.atan2(S0.z - oz, S0.x - ox); s = ((a0 / (Math.PI * 2) + 1) % 1) * per(PL); onPlank(PL, s);
        seatY = ground(o.position.x, o.position.z, S0.y + 0.5, S0.y);
        o.rotation.set(0, S0.ry ?? 0, 0); plant(o, fp, seatY); scene.add(o);
      },
      show: on => { o.visible = on; },
      think: (t, d) => {
        const near = dist(o.position.x, o.position.z) < 11;
        if (near && (state === 'sit' || state === 'freeze' || state === 'run')) {
          // the bark's radius on this side, every half foot from 2 ft to 11 ft up (rays in toward the axis)
          const a = angleOf(); bark = []; for (let y = 2; y <= 11.01; y += 0.5) { const dd = cast(ox + Math.cos(a) * 7, y, oz + Math.sin(a) * 7, -Math.cos(a), 0, -Math.sin(a), 7); bark.push(Number.isFinite(dd) ? 7 - dd : 2.4); }
          state = 'in'; rad = Math.hypot(o.position.x - ox, o.position.z - oz);
          const ri = IN * oct(a); seatIn = ground(ox + Math.cos(a) * ri, oz + Math.sin(a) * ri, seatY + 0.4, seatY); return;      // the inner plank's top, measured
        }
        if (state === 'up') { safe = near || dist(ox, oz) < 16 ? 0 : safe + 0.25; if (safe > 12) { state = 'down'; } return; }
        if (state !== 'sit' && state !== 'freeze' || t < until) return;
        const k = r();
        if (k < 0.35) { state = 'run'; aim = s + (r() < 0.5 ? -1 : 1) * (2 + r() * 5); const L8 = per(PL) / 8, f = ((aim % L8) + L8) % L8; if (f < 0.5) aim += 0.5 - f; else if (f > L8 - 0.5) aim -= f - (L8 - 0.5); }
        else if (k < 0.75) { state = 'sit'; until = t + 3 + r() * 5; look = (r() - 0.5) * 1.2; }
        else { state = 'freeze'; until = t + 2 + r() * 3; }
        if (r() < 0.5) flickAt = t + r() * 1.5;
      },
      tick: (t, dt) => {
        if (state === 'run') {                                                     // a low bounding run along the plank
          const sp = 4.5 * dt, left = aim - s; s += Math.sign(left) * Math.min(Math.abs(left), sp); ph += sp / 0.55;
          const dir = onPlank(PL, s) + (left < 0 ? Math.PI : 0);
          o.rotation.set(-0.12 * Math.sin(Math.PI * 2 * ph), turnTo(o.rotation.y, dir, dt * 14), 0);
          lift = 0.1 * Math.abs(Math.sin(Math.PI * ph)); plant(o, fp, seatY, lift);
          if (Math.abs(aim - s) < 1e-3) { lift = 0; ph = 0; state = 'freeze'; until = t + 1.5 + r() * 2; o.rotation.x = 0; seatY = ground(o.position.x, o.position.z, seatY + 0.4, seatY); plant(o, fp, seatY); }
          return;
        }
        if (state === 'in' || state === 'out') {                                   // bound across the planks, in to the trunk or back out
          const a = angleOf(), sp = 4 * dt, inward = state === 'in', rin = IN * oct(a), rpl = PL * oct(a); rad = inward ? Math.max(rin, rad - sp) : Math.min(rpl, rad + sp); ph += sp / 0.4;
          o.position.x = ox + Math.cos(a) * rad; o.position.z = oz + Math.sin(a) * rad;
          o.rotation.set(-0.12 * Math.sin(Math.PI * 2 * ph), turnTo(o.rotation.y, Math.atan2((inward ? -1 : 1) * Math.cos(a), (inward ? -1 : 1) * Math.sin(a)), dt * 14), 0);
          lift = 0.1 * Math.abs(Math.sin(Math.PI * ph)); const sy = seatY + (seatIn - seatY) * clamp01((rpl - rad) / (rpl - rin)); plant(o, fp, sy, lift);
          if (inward && rad <= rin) { state = 'leap'; h = 0; lift = 0; }
          if (!inward && rad >= rpl) {                                              // back on its plank: where along it
            lift = 0; ph = 0; const k = Math.floor(((a / (Math.PI / 4)) % 8 + 8) % 8), f = (((a / (Math.PI / 4)) % 8 + 8) % 8) - k;
            s = (k + f) * per(PL) / 8; onPlank(PL, s); state = 'freeze'; until = t + 2; o.rotation.x = 0; seatY = ground(o.position.x, o.position.z, seatY + 0.4, seatY); plant(o, fp, seatY);
          }
          return;
        }
        if (state === 'leap' || state === 'drop') {                                // the jump between the inner plank and the bark
          h = Math.min(1, h + dt / 0.3); const a = angleOf(), u = state === 'leap' ? h : 1 - h, y0 = seatIn, y1 = seatIn + 1.1;
          const r0 = IN * oct(a), r1 = barkAt(y1), rr = r0 + (r1 - r0) * u, y = y0 + (y1 - y0) * u + 0.35 * Math.sin(Math.PI * h);
          o.position.set(ox + Math.cos(a) * rr, y, oz + Math.sin(a) * rr);
          Y.set(0, 1, 0).lerp(Z.set(Math.cos(a), 0, Math.sin(a)), u); Y.normalize(); Z.set(-Math.cos(a), 0, -Math.sin(a)).lerp(X.set(0, state === 'drop' ? -1 : 1, 0), u).normalize();
          X.crossVectors(Y, Z); Z.crossVectors(X, Y); o.quaternion.setFromRotationMatrix(M.makeBasis(X, Y, Z));           // turning from the plank to the bark in the air
          if (h >= 1) { if (state === 'leap') { state = 'climb'; h = y1; } else { state = 'out'; rad = IN * oct(a); o.rotation.x = o.rotation.z = 0; plant(o, fp, seatIn); } }
          return;
        }
        if (state === 'climb' || state === 'down') {                               // up the trunk in bounds; down head first
          ph += dt * 3.2; const go = Math.max(0, Math.sin(Math.PI * 2 * ph)) * 3.4 * dt;
          h += state === 'climb' ? go : -go;
          onBark(h, state === 'down');
          if (state === 'climb' && h >= 8.5) { state = 'up'; safe = 0; }
          if (state === 'down' && h <= seatIn + 1.1) { state = 'drop'; h = 0; }
          return;
        }
        if (state === 'up') { onBark(h, false); o.rotateY(0.3 * Math.sin(t * 0.5)); return; }       // clinging, peering round at her
        // sitting or frozen on the plank: a flick of the tail now and then; when frozen it watches her
        const f = t - flickAt; o.rotation.x = f > 0 && f < 0.3 ? -0.1 * Math.sin(Math.PI * f / 0.3) : 0;
        const want = state === 'freeze' && dist(o.position.x, o.position.z) < 30 ? Math.atan2(cam.x - o.position.x, cam.z - o.position.z) : o.rotation.y + 0;
        o.rotation.y = turnTo(o.rotation.y, want, dt * 4);
        plant(o, fp, seatY);
      },
      check: () => ({ x: o.position.x, y: o.position.y, z: o.position.z, state, perch: ['climb', 'down', 'up'].includes(state) ? 'trunk' : 'seat', air: ['leap', 'drop'].includes(state) || lift > 0.005 }),
    });
  }

  // ---- The jay at the bird bath: dips to drink, hops round the rim, flies up to the oak limb and back --
  if (K.titOn) {
    const T0 = K.titOn, bx = -34, bz = 46, rimR = Math.hypot(T0.x - bx, T0.z - bz);
    const limb = u => [-62 + 3 + 10 * u, 15.6 + 1.9 * u + 0.35, 42 + 2 + 7 * u];                       // the tyre-swing limb (garden.js), about its top
    let o = null, body = null, fp = null, wings = null, fl = null, a = Math.atan2(T0.z - bz, T0.x - bx), state = 'sit', until = 0, dipAt = 0, hopA = a, hopU = 1, gone = false, safe = 0, look = 0;
    let rimY = T0.y, perchY = 0, L = null;
    const sitRim = () => { o.position.x = bx + Math.cos(a) * rimR; o.position.z = bz + Math.sin(a) * rimR; };
    const toLimb = () => { const l = limb(0.7 + r() * 0.2); L = [l[0], ground(l[0], l[2], l[1] + 1, l[1]), l[2]]; fl.go(L[0], L[1], L[2], 2.4, 2.5); };
    add({
      name: 'jay', x: bx, z: bz, load: 90, live: 70, when: daytime,
      init: async () => {
        body = await mesh('v_kingfisher_bluejay', 1.0); fp = feet(body.geometry); o = new THREE.Group(); o.add(body);
        wings = wingPair(1.25, 0.32, 0x8a96a8, 0x2a3a6a, [0, 0.24, 0.02]); o.add(wings);
        sitRim(); rimY = ground(o.position.x, o.position.z, T0.y + 0.6, T0.y);                  // the rim's real top, measured
        o.rotation.y = T0.ry ?? 0; plant(o, fp, rimY); scene.add(o); fl = new Flight(o);
      },
      show: on => { o.visible = on; },
      think: (t) => {
        const near = dist(o.position.x, o.position.z) < 7;
        if (state === 'fly') return;
        if (gone) { safe = near || dist(bx, bz) < 11 ? 0 : safe + 0.25; if (safe > 6) { gone = false; state = 'fly'; fl.go(bx + Math.cos(a) * rimR, rimY, bz + Math.sin(a) * rimR, 2.2, 2); } return; }
        if (near || (t > until && r() < 0.06)) { gone = true; safe = 0; state = 'fly'; toLimb(); return; }
        if (t < until) return;
        const k = r();
        if (k < 0.35) { state = 'drink'; dipAt = t; until = t + (2 + Math.floor(r() * 3)) * 0.9 + 0.4; }
        else if (k < 0.6) { state = 'hop'; hopA = a + (r() < 0.5 ? -1 : 1) * (0.25 + r() * 0.3); hopU = 0; until = t + 0.6; }
        else { state = 'look'; until = t + 1.5 + r() * 2.5; look = (r() - 0.5) * 2.4; }
      },
      tick: (t, dt) => {
        if (state === 'fly') {
          const u = fl.step(dt); wings.visible = u < 0.97; wings.userData.flap(u > 0.8 ? 0.9 : 0.25 + 0.9 * Math.sin(t * 24));
          if (!fl.busy) { state = gone ? 'perch' : 'sit'; perchY = gone ? L[1] : rimY; wings.visible = false; o.rotation.x = 0; until = t + 1; plant(o, fp, perchY); }
          return;
        }
        if (state === 'perch') { o.rotation.y = turnTo(o.rotation.y, Math.atan2(cam.x - o.position.x, cam.z - o.position.z), dt * 3); plant(o, fp, perchY); return; }
        if (state === 'hop') {                                                     // one hop along the rim
          hopU = Math.min(1, hopU + dt * 3.5); a = a + (hopA - a) * Math.min(1, dt * 9); sitRim();
          o.rotation.y = turnTo(o.rotation.y, Math.atan2(-Math.sin(a) * Math.sign(hopA - a || 1), Math.cos(a) * Math.sign(hopA - a || 1)), dt * 12);
          plant(o, fp, rimY, 0.15 * Math.sin(Math.PI * hopU)); if (hopU >= 1) { a = hopA; state = 'sit'; plant(o, fp, rimY); }
          return;
        }
        const inward = Math.atan2(bx - o.position.x, bz - o.position.z);
        if (state === 'drink') { o.rotation.y = turnTo(o.rotation.y, inward, dt * 6); const u = (t - dipAt) % 0.9; o.rotation.x = u < 0.35 ? 0.5 * Math.sin(Math.PI * u / 0.35) : 0; }
        else { o.rotation.x = 0; o.rotation.y = turnTo(o.rotation.y, inward + look, dt * 5); }      // looking about in quick turns
        plant(o, fp, rimY);
      },
      check: () => ({ x: o.position.x, y: o.position.y, z: o.position.z, perch: state === 'fly' ? 'air' : gone ? 'limb' : 'bath rim', air: state === 'fly' || state === 'hop' }),
    });
  }

  // ---- Dragonflies over the pond: patrol a beat over the water, hover, dart ----
  {
    const P = K.pondAt ?? { x: -68, z: 4, y: 0.3 };
    let flies = null;
    const beat = (i, j) => { const q = rng(i * 7919 + j * 104729); const a = q() * TAU, s = 0.35 + q() * 0.5; return pondAt(a, s); };
    const st = [0, 1].map(i => ({ k: 0, t0: 0, hover: 2, ax: 0, az: 0, bx: 0, bz: 0, h: 1.4 + i * 0.4 }));
    add({
      name: 'dragonflies', x: P.x, z: P.z, load: 90, live: 70, when: () => day.light > 0.35,
      init: async () => { const src = await mesh('v_dragonfly', 2.2); flies = [src, src.clone()]; flies.forEach((f, i) => { const [x, z] = beat(i, 0); f.position.set(x, P.y + st[i].h, z); scene.add(f); st[i].ax = st[i].bx = x; st[i].az = st[i].bz = z; }); },
      show: on => { for (const f of flies) f.visible = on; },
      tick: (t, dt) => { for (let i = 0; i < 2; i++) {
        const f = flies[i], s = st[i], u = t - s.t0, dart = 0.55;
        if (u > s.hover + dart) { s.k++; s.t0 = t; s.ax = s.bx; s.az = s.bz; [s.bx, s.bz] = beat(i, s.k); s.hover = 1.5 + rng(i + s.k * 31)() * 3.5; }
        const e = u < s.hover ? 0 : ease((u - s.hover) / dart);
        f.position.set(s.ax + (s.bx - s.ax) * e + 0.05 * Math.sin(t * 9 + i), P.y + s.h + 0.1 * Math.sin(t * 5 + i) + 0.3 * Math.sin(Math.PI * e), s.az + (s.bz - s.az) * e + 0.05 * Math.cos(t * 7 + i));
        f.rotation.y = turnTo(f.rotation.y, Math.atan2(s.bx - s.ax, s.bz - s.az), dt * (e > 0 ? 12 : 1.5));
      } },
      check: () => { const f = flies[0]; return { x: f.position.x, y: f.position.y, z: f.position.z, perch: 'air', err: pondS(f.position.x, f.position.z) > 1 ? 1 : 0 }; },
    });
  }

  // ---- Butterflies: fly from flower to flower, settle with their wings closed, open them to the sun ----
  {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d');
    const wingPaint = (i, base, edge, spots) => {
      g.save(); g.translate(i * 128, 0);
      g.fillStyle = base; g.beginPath(); g.moveTo(4, 64); g.bezierCurveTo(20, 0, 110, -10, 120, 30); g.bezierCurveTo(124, 60, 90, 66, 60, 64); g.bezierCurveTo(100, 80, 104, 120, 70, 124); g.bezierCurveTo(40, 126, 14, 90, 4, 64); g.fill();
      g.strokeStyle = edge; g.lineWidth = 7; g.stroke(); g.lineWidth = 2; for (let k = 0; k < 5; k++) { g.beginPath(); g.moveTo(6, 64); g.lineTo(40 + k * 18, 10 + k * 22); g.stroke(); }
      g.fillStyle = spots; for (let k = 0; k < 6; k++) { g.beginPath(); g.arc(100 + (k % 2) * 10, 25 + k * 6, 3, 0, 7); g.fill(); }
      g.restore();
    };
    wingPaint(0, '#e8862a', '#1a1410', '#f4f0e0');      // a monarch-ish orange
    wingPaint(1, '#f4f2ea', '#c8c4b8', '#3a3a3a');      // cabbage white
    wingPaint(2, '#7aa6e8', '#2a3a6a', '#f4f0e0');      // common blue
    const tex = atlasTexture(c, [[0, 0, 128, 128], [128, 0, 128, 128], [256, 0, 128, 128]]);
    const mats = cardMaterials(tex, { sway: 0, roughness: 0.6, env: 0.4, alphaTest: 0.4 });
    // a wing: hinged on the body's long axis (z, the hinge at x = 0), reaching out along +x. The painted
    // forewing (the top of each cell) is toward -z, so -z is the butterfly's front.
    const wing = new THREE.PlaneGeometry(1, 1); wing.rotateX(-Math.PI / 2); wing.translate(0.5, 0, 0);
    const bodyG = new THREE.CylinderGeometry(0.045, 0.03, 0.7, 5); bodyG.rotateX(Math.PI / 2); bodyG.translate(0, -0.02, 0.02);
    const FLOWERS = new Set(['cosmos', 'lavender', 'catmint', 'coneflower', 'wildflowers', 'rose', 'marigold', 'spires', 'hydrangea', 'sunflower']);
    const homes = K.flowerSpots ?? [[0, 30]], N = 14;
    const flowers = (K.F?.list ?? []).filter(p => FLOWERS.has(p.kind));
    let bfly = null, body = null; const flies = [];
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3();
    const top = f => [f.x, f.y + Math.max(0.6, f.h * 0.92), f.z];
    add({
      name: 'butterflies', x: 0, z: -30, load: 400, live: 400, when: () => day.light > 0.35,
      init: async () => {
        bfly = new THREE.InstancedMesh(wing, mats.material, N * 2); const cells = new Float32Array(N * 2 * 4);
        body = new THREE.InstancedMesh(bodyG, new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.8 }), N);
        for (let i = 0; i < N; i++) {
          const sp = i % 3, cu = cellUV(512, 128, [sp * 128, 0, 128, 128], 1); cells.set(cu, i * 8); cells.set(cu, i * 8 + 4);
          const h = homes[i % homes.length], near = flowers.filter(f => Math.hypot(f.x - h[0], f.z - h[1]) < 11).slice(0, 40);
          const list = near.length ? near.map(top) : [[h[0], 1.6, h[1]], [h[0] + 2, 1.4, h[1] + 1.5], [h[0] - 1.5, 1.8, h[1] - 2]];
          const a = list[Math.floor(r() * list.length)];
          flies.push({ list, ax: a[0], ay: a[1], az: a[2], bx: a[0], by: a[1], bz: a[2], t0: -r() * 8, rest: 2 + r() * 6, fly: 2, size: 0.26 + r() * 0.1, head: r() * TAU, ph: r() * 9 });
        }
        wing.setAttribute('aCell', new THREE.InstancedBufferAttribute(cells, 4));
        for (const m of [bfly, body]) { m.frustumCulled = false; m.castShadow = false; m.userData.creature = true; scene.add(m); }
      },
      show: on => { bfly.visible = body.visible = on; },
      tick: (t) => {
        for (let i = 0; i < flies.length; i++) {
          const f = flies[i]; let u = t - f.t0, x, y, z, flap;
          if (u > f.rest + f.fly) {                                    // landed, rested: off to another flower nearby
            f.t0 = t; u = 0; f.ax = f.bx; f.ay = f.by; f.az = f.bz;
            const n = f.list[Math.floor(rng(i * 977 + Math.floor(t))() * f.list.length)];
            f.bx = n[0]; f.by = n[1]; f.bz = n[2]; f.fly = 1.5 + Math.hypot(f.bx - f.ax, f.bz - f.az) / 2.2; f.rest = 2 + rng(i + Math.floor(t * 3))() * 7;
          }
          if (u < f.rest) {                                            // resting on the flower: wings held up, opened now and then to bask
            x = f.ax; y = f.ay; z = f.az; const bask = Math.max(0, Math.sin(u * 0.9 + f.ph)); flap = 1.45 - 1.15 * bask * bask;
          } else {
            const k = (u - f.rest) / f.fly, sk = ease(k), wob = Math.sin(k * Math.PI);
            x = f.ax + (f.bx - f.ax) * sk + Math.sin(t * 3.1 + i) * 0.5 * wob; z = f.az + (f.bz - f.az) * sk + Math.cos(t * 2.7 + i) * 0.5 * wob;
            y = f.ay + (f.by - f.ay) * sk + wob * (1.2 + 0.4 * Math.sin(i)) + 0.18 * Math.sin(t * 7 + i);
            f.head = turnTo(f.head, Math.atan2(-(f.bx - f.ax), -(f.bz - f.az)), 0.08);      // its front (-z) toward where it goes
            flap = 0.15 + 1.25 * Math.abs(Math.sin(t * 14 + i));
          }
          f.px = x; f.py = y; f.pz = z; f.resting = u < f.rest;
          e.set(0, f.head, 0, 'YXZ'); q.setFromEuler(e); p.set(x, y, z);
          body.setMatrixAt(i, m4.compose(p, q, s.setScalar(f.size)));
          for (const side of [0, 1]) {                                 // both wings rise about the back together
            e.set(0, f.head, side ? -flap : flap, 'YXZ'); q.setFromEuler(e); s.set(side ? -f.size : f.size, 1, f.size);
            bfly.setMatrixAt(i * 2 + side, m4.compose(p, q, s));
          }
        }
        bfly.instanceMatrix.needsUpdate = true; body.instanceMatrix.needsUpdate = true;
      },
      check: () => ({ x: flies[0].px ?? flies[0].ax, y: flies[0].py ?? flies[0].ay, z: flies[0].pz ?? flies[0].az, perch: flies[0].resting ? 'flower' : 'air', all: flies.map(f => ({ x: f.px ?? f.ax, y: f.py ?? f.ay, z: f.pz ?? f.az, resting: f.resting })) }),
    });
  }

  // ---- Fireflies over the meadow and the pond, after dark ----
  {
    const spots = K.fireflySpots ?? [[-70, -80, 30]], N = 120, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), seeds = [];
    for (let i = 0; i < N; i++) { const [cx, cz, rad] = spots[i % spots.length]; seeds.push({ x: cx + (r() - 0.5) * rad * 2, z: cz + (r() - 0.5) * rad * 2, y: 0.8 + r() * 3.5, ph: r() * 20, sp: 0.2 + r() * 0.3 }); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const dot = (() => { const cc = document.createElement('canvas'); cc.width = cc.height = 32; const gg = cc.getContext('2d'); const gr = gg.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); gg.fillStyle = gr; gg.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(cc); })();
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.55, map: dot, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    pts.frustumCulled = false; pts.visible = false; pts.userData.creature = true; scene.add(pts);
    animated.push(t => {
      const n = day.night; pts.visible = n > 0.15 && scene.visible; if (!pts.visible) return;
      seeds.forEach((f, i) => {
        pos[i * 3] = f.x + Math.sin(t * f.sp + f.ph) * 2.5; pos[i * 3 + 1] = f.y + Math.sin(t * f.sp * 1.7 + f.ph) * 0.6; pos[i * 3 + 2] = f.z + Math.cos(t * f.sp * 0.8 + f.ph) * 2.5;
        const blink = Math.max(0, Math.sin(t * 1.3 + f.ph * 3)) ** 6 * n;
        col[i * 3] = 1.0 * blink; col[i * 3 + 1] = 0.95 * blink; col[i * 3 + 2] = 0.35 * blink;
      });
      geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true;
    });
  }

  // ---- The rest, loaded when the garden is first seen ----
  let more = false;
  animated.push(() => {
    if (more || !(scene.visible || kit.crew.length === 0)) return;
    more = true; import('./creatures_more.js').then(m => m.moreCreatures(kit, K)).catch(e => console.warn('creatures_more', e));
  });
}
