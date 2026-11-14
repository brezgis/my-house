// S'mores at the fire pit. A small brass bell hangs from an iron crook stuck in the ground beside the pit:
// ring it and a gardener walks over with a board of s'mores things (marshmallows, graham crackers, a bar of
// chocolate, two roasting sticks), sets it down by the fire, says a word and goes back to work
// (staff/gardeners.js: canBring, smores). The nearest gardener who is free comes; if neither can (it is night
// and they are tucked up, one is seeing to her, the staff are not in), the board is simply found by the fire a
// few seconds later. It stays for the visit; ringing again only rings.
//
// From the board: "toast a marshmallow" puts one on a stick in the hand. Held within a few feet of the lit
// fire it browns in about five seconds. It is eaten as all food is (hands/carry.js); or, once golden, the
// board offers "make a s'more", and that is in the hand instead.
//
// The hand is the house's own (hands/carry.js, through window.__hands): the stick and the s'more are two
// "portions" (hands/things.js: smores_stick, smores_makings) taken from two stand-ins the size of a pea, kept
// out of sight under the island, which is how carry.js knows a plate one takes from. What carry.js puts in
// the hand is then given its proper shape here.
//
// Cost: three small draws (crook, bell, board), about 900 triangles in all, no textures; nothing is done per
// frame unless the bell is swinging or a marshmallow is in the hand.

import * as THREE from 'three';

const RADIUS = 7.5, SECS = 5;                       // how near the fire it toasts, and how long it takes
const WHITE = new THREE.Color(0xf4efe6), GOLD = new THREE.Color(0xb9772e);

// several geometries as one, each in its own colour (position, normal, colour: nothing else)
function merged(parts) {
  const gs = parts.map(([g]) => (g.index ? g.toNonIndexed() : g)), n = gs.reduce((a, g) => a + g.attributes.position.count, 0);
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), col = new Float32Array(n * 3), c = new THREE.Color(); let o = 0;
  gs.forEach((g, i) => {
    pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); c.set(parts[i][1]);
    for (let k = 0; k < g.attributes.position.count; k++) col.set([c.r, c.g, c.b], (o + k) * 3);
    o += g.attributes.position.count;
  });
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); out.setAttribute('color', new THREE.BufferAttribute(col, 3));
  return out;
}
const box = (w, h, d, x, y, z, ry = 0) => new THREE.BoxGeometry(w, h, d).rotateY(ry).translate(x, y, z);
const cyl = (r, h, x, y, z, seg = 8, r2 = r) => new THREE.CylinderGeometry(r2, r, h, seg).translate(x, y, z);
const rod = (r, a, b, seg = 5) => { const A = new THREE.Vector3(...a), d = new THREE.Vector3(...b).sub(A), L = d.length(); return new THREE.CylinderGeometry(r, r, L, seg).translate(0, L / 2, 0).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())).translate(A.x, A.y, A.z); };

export function smoresLife(ctx, K, items) {
  const f = K.fire; if (!f) return;
  const scene = ctx.scene, root = scene.parent ?? scene, camera = ctx.camera;
  const note = (t, ms) => window.houseUI?.toast?.(t, ms);
  const paint = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 });
  const at = (a, r) => ({ x: f.x + Math.cos(a) * r, z: f.z + Math.sin(a) * r });

  // ---- the bell on its crook, between two of the logs
  const B = { ...at(0.93, 3.6), y: 3.05 }, IRON = 0x2b2a28;
  const crook = new THREE.Mesh(merged([[rod(0.045, [0, 0, 0], [0, 3.5, 0]), IRON], [rod(0.035, [0, 3.5, 0], [0.22, 3.62, 0]), IRON], [rod(0.035, [0.22, 3.62, 0], [0.42, 3.46, 0]), IRON], [rod(0.014, [0.42, 3.46, 0], [0.42, 3.3, 0], 4), IRON]]), paint);
  const out0 = Math.atan2(B.z - f.z, B.x - f.x); crook.position.set(B.x - Math.cos(out0) * 0.42, 0.05, B.z - Math.sin(out0) * 0.42); crook.rotation.y = -out0; crook.name = 'smores crook'; scene.add(crook);
  const bell = new THREE.Mesh(
    merged([[new THREE.LatheGeometry([[0.01, 0], [0.07, -0.01], [0.115, -0.07], [0.135, -0.2], [0.19, -0.3], [0.2, -0.34]].map(([a, b]) => new THREE.Vector2(a, b)), 12), 0xffffff], [new THREE.SphereGeometry(0.035, 6, 4).translate(0, -0.33, 0), 0xffffff]]),
    new THREE.MeshStandardMaterial({ color: 0xb08d4a, roughness: 0.32, metalness: 1, envMapIntensity: 1, side: THREE.DoubleSide }));
  bell.position.set(B.x, B.y + 0.3, B.z); bell.name = 'smores bell'; scene.add(bell);

  // ---- the board of things: made now, shown when it is brought
  const S = { ...at(2.18, 4.3), y: 0.1 };                                   // where it is set down, on the swept earth by the fire
  const things = new THREE.Mesh(merged([
    [box(1.3, 0.06, 0.8, 0, 0.03, 0), 0x8a6a44],                                                                    // the board
    ...[[-0.42, -0.16], [-0.27, -0.2], [-0.36, -0.03], [-0.2, -0.06], [-0.3, 0.1], [-0.45, 0.12]].map(([x, z]) => [cyl(0.055, 0.1, x, 0.11, z), 0xf4efe6]), [cyl(0.055, 0.1, -0.32, 0.21, -0.1), 0xf4efe6],      // marshmallows, in a heap
    ...[0, 1, 2, 3].map(i => [box(0.26, 0.022, 0.26, 0.1, 0.073 + i * 0.024, -0.12, i * 0.13), 0xc08a4e]),                   // graham crackers
    [box(0.34, 0.035, 0.16, 0.14, 0.078, 0.2, 0.25), 0x4a2a18], [box(0.2, 0.037, 0.165, 0.2, 0.079, 0.217, 0.25), 0xb9b4a8],      // a bar of chocolate, half out of its foil
    [rod(0.012, [-0.55, 0.075, 0.3], [0.62, 0.075, 0.33]), 0x6a4a2c], [rod(0.012, [-0.5, 0.075, 0.36], [0.6, 0.085, 0.27]), 0x6a4a2c],      // two roasting sticks
  ]), paint);
  things.name = 'smores things'; things.userData.staff = true;      // (carried by a gardener it is shown and hidden with them: main.js)

  // ---- what carry.js takes one from: two stand-ins under the island (see the top of this file)
  for (const id of ['smores_stick', 'smores_makings']) {
    const o = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.01), paint); o.visible = false; o.userData.cat = 'model:' + id; o.position.set(S.x, -900, S.z); root.add(o);
    items.models.push({ id, x: S.x, y: -900, z: S.z, rotY: 0, outdoor: true });
  }

  let state = 'none', swing = 0, swingV = 0, stick = null, brown = 0, told = false;      // state: none, coming, out
  const mallow = new THREE.MeshStandardMaterial({ color: WHITE.clone(), roughness: 0.9 });
  const hands = () => window.__hands, lit = () => items.lamps.some(l => l.kind === 'fire' && l.x === f.x && l.z === f.z && l.power > 0);

  function arrive(by) {
    if (state === 'out') return; state = 'out';
    things.removeFromParent(); things.position.set(S.x, S.y, S.z); things.rotation.set(0, 0.4 - out0, 0); things.scale.setScalar(1); things.visible = true; scene.add(things);
    if (!by) note('Somebody has left a board of s’mores things by the fire.');
  }
  function ring() {
    ctx.sound?.note?.(93, 0, 1.6, 0.16); ctx.sound?.note?.(100, 0.02, 1.2, 0.06); swingV += 2.4;
    if (state !== 'none') return;
    state = 'coming';
    const H = window.__staff?.H ?? ctx.staff?.H, g = (H?.gardeners ?? []).filter(g => g.canBring?.()).sort((a, b) => Math.hypot(a.x - f.x, a.z - f.z) - Math.hypot(b.x - f.x, b.z - f.z))[0];
    const stand = at(2.18, 6.0);
    if (g) { g.run('smores', g.smores({ things, x: stand.x, z: stand.z, tx: S.x, tz: S.z, arrive: () => arrive(g) }), false); note('The bell rings out over the meadow.'); }
    else setTimeout(() => arrive(null), 6000);
  }
  ctx.interact.push({ x: B.x, y: B.y, z: B.z, reach: 7, size: 0.7, label: () => (state === 'none' ? 'ring for s’mores' : 'ring the bell'), act: ring });

  // What carry.js has just put in the hand, given its proper shape (its own stand-in shape is taken away)
  function dress(name, parts, extra) {
    if (hands()?.held !== name) return null;
    const o = camera.children.filter(c => c.userData.cat === 'held').pop(), body = o?.children[0]; if (!body) return null;
    body.clear(); body.position.set(0, 0, 0);
    body.add(new THREE.Mesh(merged(parts), paint)); if (extra) body.add(extra);
    return o;
  }
  async function toast() {
    const h = hands(); if (!h?.hold) return;
    await h.hold('smores_stick', false);
    const m = new THREE.Mesh(cyl(0.055, 0.11, 0, 0, 0).rotateX(0.35 - Math.PI / 2).translate(0, 0.085, -0.235), mallow);
    stick = dress('marshmallow', [[rod(0.011, [0, -0.1, 0.28], [0, 0.1, -0.28]), 0x6a4a2c]], m);
    brown = 0; mallow.color.copy(WHITE);
  }
  async function make() {
    const h = hands(); if (!h?.hold || !h.setDown) return;
    h.setDown(false, { x: S.x, y: -4000, z: S.z }, 'here'); stick = null;      // the stick goes back (out of the way, under the island)
    await h.hold('smores_makings', false);
    dress('s’more', [[box(0.26, 0.022, 0.26, 0, -0.05, 0), 0xc08a4e], [box(0.2, 0.03, 0.2, 0, -0.024, 0, 0.1), 0x4a2a18], [cyl(0.105, 0.05, 0, 0.016, 0, 10, 0.095), GOLD.getHex()], [box(0.26, 0.022, 0.26, 0, 0.052, 0, 0.12), 0xc08a4e]]);
  }
  const golden = () => !!stick && brown >= 1 && hands()?.held === 'marshmallow';
  ctx.interact.push({ x: S.x, y: S.y + 0.15, z: S.z, reach: 6, size: 1.0,
    label: () => (state !== 'out' || !hands()?.hold ? '' : hands().held == null ? 'toast a marshmallow' : golden() ? 'make a s’more' : ''),
    act: () => { if (state !== 'out') return; if (hands()?.held == null) toast(); else if (golden()) make(); } });

  ctx.animated.push((t, dt) => {
    if (swing || swingV) {                                                  // the bell, until it hangs still again
      swingV += (-swing * 30 - swingV * 1.6) * dt; swing += swingV * dt;
      if (Math.abs(swing) + Math.abs(swingV) < 0.004) swing = swingV = 0;
      bell.rotation.z = swing * 0.35;
    }
    if (!stick || brown >= 1 || hands()?.held !== 'marshmallow') return;
    const p = camera.position;
    if (Math.hypot(p.x - f.x, p.z - f.z) > RADIUS) return;
    if (!lit()) { if (!told) { told = true; note('The fire is not lit.'); } return; }
    brown = Math.min(1, brown + dt / SECS); mallow.color.copy(WHITE).lerp(GOLD, brown * brown);
    if (brown >= 1) note('Golden. Eat it as it is, or take it back to the board for a s’more.', 5000);
  });

  if (typeof window !== 'undefined') window.__smores = { ring, arrive: () => arrive(null), toast, make, get state() { return state; }, get brown() { return brown; }, bell: B, board: S };      // for the checks
}
