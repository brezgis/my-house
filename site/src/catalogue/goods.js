// The goods: each thing in the catalogue as an object that can be picked up (hands/carry.js add()),
// and what the house says about it. Built only when a parcel is opened, or when something kept from
// an earlier visit is put back where it was left. Units are feet.
//
//   makeGoods(ctx).build(id) -> { body, T }      (T as in hands/things.js, with the extras carry.js add() knows)

import { GLITTER } from './sparks.js';
import { drawLabel } from './engrave.js';

// ---- the coffees: what is in the cup --------------------------------------------------------------
// lo, hi: the colour at the bottom and at the top; sharp: how suddenly one becomes the other (0 a slow
// blend, 1 two layers); cap: a cloud of cream or foam on top; straw; and what it is like to drink.
const COFFEE = {
  'coffee-bsse': { n: 'brown sugar shaken espresso', lo: 0x6b3f22, hi: 0xc9a27a, sharp: 0.25, cap: 0xe6cfa8, straw: 0x2f6b4a, specks: 0x7a4a22,
    l: 'A brown sugar shaken espresso, sweating gently in its plastic cup. The ice is doing its best.',
    sips: ['Cold, sweet, and a little cinnamon at the back. You see Geneva’s point.', 'The oat milk has begun to marble into the espresso. It is a pity to disturb it. You disturb it.'] },
  'coffee-lavender': { n: 'iced lavender oat latte', lo: 0xb0907a, hi: 0xd3c2dc, sharp: 0.4, straw: 0x9a7fc4,
    l: 'An iced lavender oat latte, the colour of a very expensive paint chart.',
    sips: ['It tastes of a garden somebody else weeds.', 'Floral, milky, and faintly smug.'] },
  'coffee-pistachio': { n: 'pistachio cream cold brew', lo: 0x24140c, hi: 0x3a2014, sharp: 0.2, cap: 0xb9cf8e, capH: 0.22, straw: 0x1f1f1f,
    l: 'Pistachio cream cold brew. The green cloud is sinking through the dark, taking its time.',
    sips: ['Cold brew, strong enough to file your taxes for you, and then the cream arrives.', 'The cloud has made it half way down. You help.'] },
  'coffee-matcha': { n: 'strawberry matcha latte', lo: 0xf0a0b2, hi: 0x9fbd68, sharp: 0.85, mid: 0xf6f0e4, straw: 0xf6f0e4,
    l: 'A strawberry matcha latte: pink below, white between, green above. It is not coffee, and it knows you know.',
    sips: ['Strawberry first, then something grassy and calm.', 'You stir it with the straw and it goes the colour of a watercolour gone wrong. It tastes better than ever.'] },
  'coffee-caramel': { n: 'salted caramel cloud macchiato', lo: 0xead9c0, hi: 0x8a5a30, sharp: 0.6, cap: 0xf4ead8, capH: 0.2, drizzle: 0xc77a22, straw: 0x8a5a30,
    l: 'A salted caramel cloud macchiato with extra drizzle. The drizzle has been applied by eye, and with feeling.',
    sips: ['Mostly drizzle. You do not complain.', 'Milk at the bottom, espresso on top, salt somewhere, joy throughout.'] },
  'coffee-ube': { n: 'iced ube coconut latte', lo: 0xb69ad8, hi: 0x8c68c2, sharp: 0.3, straw: 0xf2e9ff,
    l: 'An iced ube coconut latte. It is purple. It is entirely purple.',
    sips: ['Vanilla, coconut, and a nuttiness you cannot place. The ube, presumably.', 'Still purple all the way down.'] },
};
const SIP_TAIL = ['About half gone. The ice has started to matter.', 'Mostly ice now, and still very good.', 'The straw makes the noise. You pretend it did not.'];

export function makeGoods(ctx) {
  const { THREE } = ctx;
  const toast = (t, ms) => window.houseUI?.toast?.(t, ms);
  const std = (color, roughness = 0.7, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; };
  const texture = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const printed = (w, h, kind, a) => new THREE.MeshStandardMaterial({ map: texture(w, h, (g, W, H) => drawLabel(g, W, H, kind, a)), roughness: 0.75, envMapIntensity: 0.2 });
  // a box whose top (or front) is a drawn label and whose other sides are a plain colour
  function labelled(w, h, d, face, mat, side) {
    const plain = std(side, 0.8), mats = [plain, plain, plain, plain, plain, plain]; mats[face] = mat;      // BoxGeometry faces: +x -x +y -y +z -z
    return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
  }

  // ---- a clear plastic cup, with a dome lid, a straw, ice, a sticker and something elaborate inside ----
  function cup(id) {
    const C = COFFEE[id], g = new THREE.Group();
    const H = 0.5, R0 = 0.105, R1 = 0.15, rAt = y => R0 + (R1 - R0) * y / H, FULL = 0.41;
    const clear = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.2, roughness: 0.06, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.4 });
    g.add(mesh(new THREE.CylinderGeometry(R1, R0, H, 26, 1, true), clear, 0, H / 2, 0));
    g.add(mesh(new THREE.CylinderGeometry(R0, R0, 0.012, 26), clear, 0, 0.006, 0));
    const lid = new THREE.SphereGeometry(R1 + 0.004, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2); lid.scale(1, 0.5, 1);
    g.add(mesh(lid, clear, 0, H, 0));
    g.add(mesh(new THREE.TorusGeometry(R1 + 0.004, 0.009, 6, 28).rotateX(Math.PI / 2), std(0xf2f2f0, 0.3), 0, H, 0));
    // what is in it: one cylinder, coloured up its height; it sinks as it is drunk
    const lg = new THREE.CylinderGeometry(rAt(FULL + 0.02) - 0.008, R0 - 0.008, 1, 22, 10), pos = lg.attributes.position, col = new Float32Array(pos.count * 3);
    const lo = new THREE.Color(C.lo), hi = new THREE.Color(C.hi), mid = C.mid != null ? new THREE.Color(C.mid) : null, c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const v = pos.getY(i) + 0.5, e = 0.5 - 0.48 * C.sharp, k = Math.min(1, Math.max(0, (v - 0.5 + e) / (2 * e))), s = k * k * (3 - 2 * k);
      c.copy(lo).lerp(hi, s); if (mid) c.lerp(mid, Math.max(0, 1 - Math.abs(v - 0.5) * 7));
      if (C.cap != null && v > 1 - (C.capH ?? 0.1)) c.setHex(C.cap);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    lg.setAttribute('color', new THREE.BufferAttribute(col, 3)); lg.translate(0, 0.5, 0);
    const drink = mesh(lg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35 }), 0, 0.016, 0); g.add(drink);
    // ice at the top of it, and whatever sits on the ice
    const top = new THREE.Group(); g.add(top);
    const ice = new THREE.MeshStandardMaterial({ color: 0xf4fbff, transparent: true, opacity: 0.55, roughness: 0.12, depthWrite: false });
    for (const [x, z, r] of [[0.05, 0.03, 0.4], [-0.05, 0.04, 1.1], [0, -0.06, 2.0], [-0.02, 0.0, 0.2]]) { const m = mesh(new THREE.BoxGeometry(0.075, 0.07, 0.075), ice, x, -0.02 + (x + z) * 0.2, z); m.rotation.set(r, r * 1.7, r * 0.6); top.add(m); }
    if (C.specks != null) for (let i = 0; i < 9; i++) { const a = i * 2.4, r = 0.03 + 0.08 * ((i * 7) % 5) / 5; top.add(mesh(new THREE.SphereGeometry(0.008, 5, 4), std(C.specks, 0.9), Math.cos(a) * r, 0.012, Math.sin(a) * r)); }
    if (C.drizzle != null) for (let i = 0; i < 4; i++) { const m = mesh(new THREE.TorusGeometry(0.03 + i * 0.027, 0.006, 5, 22).rotateX(Math.PI / 2), std(C.drizzle, 0.3), 0.004 * i, 0.012 + 0.001 * i, 0); m.scale.z = 0.85; top.add(m); }
    const straw = mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.74, 8), std(C.straw, 0.55), 0.035, 0.4, -0.02); straw.rotation.set(0.07, 0, -0.1); g.add(straw);
    // the sticker, round the front of the cup
    const lab = new THREE.CylinderGeometry(rAt(0.32) + 0.002, rAt(0.14) + 0.002, 0.18, 14, 1, true, -0.8, 1.6);
    g.add(mesh(lab, printed(256, 128, 'sticker', C.n), 0, 0.23, 0));
    let fill = 1;
    const level = () => { const y = 0.03 + (FULL - 0.03) * fill, k = rAt(y) / rAt(FULL + 0.02); drink.scale.set(k, y, k); top.position.y = y + 0.016; top.scale.setScalar(Math.min(1, (rAt(y) - 0.012) / (R1 - 0.03))); };
    level();
    const sips = [...C.sips, ...SIP_TAIL];
    const T = { n: C.n, l: C.l, eat: [...sips, ''], done: `You finish the ${C.n}. The ice rattles its applause, and the cup is somehow already in the recycling.`,
      drink: true, keep: true, q: 'takes a sip', button: 'Take a sip', onBite: (it, n) => { fill = Math.max(0.04, 1 - n / (sips.length + 1)); level(); } };
    return { body: g, T };
  }

  // ---- the tin of glittering koi food --------------------------------------------------------------
  function tin() {
    const g = new THREE.Group(), R = 0.17, H = 0.3;
    const side = new THREE.CylinderGeometry(R, R, H, 30, 1, true); side.rotateY(-Math.PI / 2 - 0.22);      // one of its two labels squarely to whoever holds it (the hand turns things half a radian)
    g.add(mesh(side, printed(512, 128, 'tin'), 0, H / 2, 0));
    const brass = std(0xc9a45c, 0.3, 0.9);
    g.add(mesh(new THREE.CylinderGeometry(R + 0.008, R + 0.008, 0.035, 30), brass, 0, H + 0.012, 0));
    g.add(mesh(new THREE.CylinderGeometry(R + 0.004, R + 0.004, 0.02, 30), brass, 0, 0.01, 0));
    g.add(mesh(new THREE.SphereGeometry(0.03, 10, 8), brass, 0, H + 0.04, 0));
    return { body: g, T: { n: 'tin of Stardust koi food', l: 'A tin of koi food, each pellet rolled in glitter. It rattles like a very small maraca. Take it to the pond.', glitter: 'koi' } };
  }
  // ---- Reginald Treats(TM) ---------------------------------------------------------------------------
  function treats() {
    const b = labelled(0.34, 0.46, 0.13, 4, printed(256, 352, 'treats'), 0xd24a7a);
    return { body: b, T: { n: 'box of Reginald Treats', treat: 'glitter', l: 'Reginald Treats™: assorted glitter, in seven colours, for the discerning vacuum. The vacuum on the box looks very pleased with itself. Sir Reginald is on the ground floor.' } };
  }
  // ---- the game, on a disc in a paper sleeve ---------------------------------------------------------
  function disc() {
    const g = new THREE.Group();
    g.add(labelled(0.44, 0.012, 0.44, 2, printed(256, 256, 'sleeve'), 0xf1ead8));
    return { body: g, T: { n: 'game disc', disc: 'game', l: '“Sir Reginald’s Rounds”, a compact disc in a paper sleeve. It wants the pink computer in the office.' } };
  }
  // ---- rockets, the box of six ---------------------------------------------------------------------
  function rockets() {
    const g = new THREE.Group(), red = 0xb8322a;
    const crate = labelled(0.5, 0.26, 0.34, 4, printed(256, 128, 'rockets'), red); crate.position.y = 0.13; g.add(crate);
    const sticks = [];
    for (let i = 0; i < 6; i++) {
      const r = new THREE.Group(), x = -0.17 + (i % 3) * 0.17, z = i < 3 ? -0.07 : 0.08, colr = GLITTER[i % GLITTER.length];
      r.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.62, 5), std(0xc9a878, 0.9), 0.03, 0.2, 0));
      r.add(mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.2, 10), std(colr, 0.6), 0, 0.44, 0));
      r.add(mesh(new THREE.ConeGeometry(0.046, 0.1, 10), std(0xf4ead8, 0.6), 0, 0.59, 0));
      r.position.set(x, 0.02, z); r.rotation.set((i % 2 ? 0.1 : -0.08), 0, (x) * 0.5); g.add(r); sticks.push(r);
    }
    let left = 6, fw = null;
    import('./fireworks.js').then(m => { fw = ctx.catalogueFireworks ??= m.makeFireworks(ctx); }).catch(e => console.warn('catalogue: fireworks', e));
    const dirV = new THREE.Vector3();
    const T = { n: 'box of rockets', q: 'lights a rocket', button: 'Light a rocket',
      l: 'Six rockets in a red box: peonies, willows, rings and crackles. For the garden, after dark.',
      done: 'That was the last rocket. The box is only a box now, and the garden smells faintly of bonfire night.',
      use() {
        const v = ctx.household?.visitor, light = ctx.day?.light ?? 0;
        if (v && !v.outside) { toast('Not in the house. Mortimer has views about scorch marks.', 4200); return false; }
        if (v?.room) { toast('Not under the porch roof. Step down onto the grass first.', 4200); return false; }
        if (light > 0.3) { toast('In daylight a rocket is merely loud. Wait until dark; the stars like the company.', 4800); return false; }
        if (!fw) { toast('The touch-paper is damp. Try again in a moment.'); return false; }
        const cam = ctx.camera; cam.getWorldDirection(dirV); const L = Math.hypot(dirV.x, dirV.z) || 1;
        fw.launch(cam.position.x + dirV.x / L * 14, cam.position.y - 4.5, cam.position.z + dirV.z / L * 14, dirV.x, dirV.z);
        left--; if (sticks[left]) sticks[left].visible = false;
        if (left === 5) toast('Whoosh. Look up.', 3000);
        return left <= 0 ? 'gone' : true;
      } };
    return { body: g, T };
  }
  // ---- a record in its sleeve (R: the record's entry in records.js), a jigsaw in its box (J) ---------
  function record(R) {
    const b = labelled(0.84, 0.02, 0.84, 2, printed(384, 384, 'record', R), 0xd9cdb2);
    return { body: b, T: { n: `record of ${R.short}`, l: R.line } };
  }
  function jigsawBox(J) {
    const b = labelled(0.92, 0.17, 0.7, 2, printed(384, 292, 'jigsaw', J), J.colour ?? 0x2f4a5a);
    return { body: b, T: { n: `jigsaw, ${J.short}`, l: J.line } };
  }

  // ---- provisions: each is a little still life whose pieces go one at a bite ---------------------------
  const silver = () => std(0xd6d8dc, 0.22, 0.95);
  function food(n, l, lines, done, pieces, g) {
    let left = pieces.length;
    return { body: g, T: { n, l, eat: [...lines, ''], done, keep: true, onBite: () => { if (left > 0) pieces[--left].visible = false; } } };
  }
  function oysters() {
    const g = new THREE.Group(), shells = [];
    g.add(mesh(new THREE.CylinderGeometry(0.42, 0.36, 0.05, 30), silver(), 0, 0.025, 0)); g.add(mesh(new THREE.TorusGeometry(0.42, 0.018, 6, 30).rotateX(Math.PI / 2), silver(), 0, 0.05, 0));
    const ice = mesh(new THREE.IcosahedronGeometry(0.38, 2), new THREE.MeshStandardMaterial({ color: 0xeef6fa, roughness: 0.35, flatShading: true }), 0, 0.05, 0); ice.scale.y = 0.14; g.add(ice);
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2, o = new THREE.Group();
      const sh = mesh(new THREE.SphereGeometry(0.1, 12, 8), std(0x8d8a80, 0.9)); sh.scale.set(1, 0.3, 1.35); o.add(sh);
      const meat = mesh(new THREE.SphereGeometry(0.07, 10, 6), std(0xe6dccb, 0.25), 0, 0.022, 0); meat.scale.set(1, 0.25, 1.3); o.add(meat);
      o.position.set(Math.cos(a) * 0.24, 0.11, Math.sin(a) * 0.24); o.rotation.y = -a + Math.PI / 2; g.add(o); shells.push(o);
    }
    const lemon = mesh(new THREE.SphereGeometry(0.07, 10, 8, 0, Math.PI), std(0xf2d24a, 0.5), 0, 0.13, 0); lemon.rotation.x = -Math.PI / 2; lemon.scale.z = 0.8; g.add(lemon);
    return food('oysters on ice', 'Half a dozen oysters on crushed ice, with lemon. They smell of a cold morning at the seaside.',
      ['The first oyster. Cold, clean, and gone before you have decided what it tasted of.', 'A squeeze of lemon on the second. It flinches. So, slightly, do you.', 'The third. You are getting the hang of the tilt.', 'The fourth, with great confidence.', 'The fifth. One left; you look at it fondly.'],
      'You finish the oysters. Six shells, a platter of ice, and a feeling of having been briefly very grand.', shells, g);
  }
  function macarons() {
    const g = new THREE.Group(), ms = [], cols = [0xf2a7b8, 0xb9cf8e, 0xf4e08a, 0xc9b3e6, 0xd9a05a, 0x5a3626];
    g.add(mesh(new THREE.BoxGeometry(0.62, 0.05, 0.44), std(0xf6d9e0, 0.8), 0, 0.025, 0));
    for (const [x, z, w, d] of [[0, 0.215, 0.62, 0.014], [0, -0.215, 0.62, 0.014], [0.305, 0, 0.014, 0.44], [-0.305, 0, 0.014, 0.44]]) g.add(mesh(new THREE.BoxGeometry(w, 0.12, d), std(0xf6d9e0, 0.8), x, 0.06, z));
    cols.forEach((c, i) => {
      const o = new THREE.Group(), x = -0.2 + (i % 3) * 0.2, z = i < 3 ? -0.1 : 0.1;
      for (const y of [0.016, 0.062]) { const half = mesh(new THREE.SphereGeometry(0.078, 14, 8), std(c, 0.75), 0, y, 0); half.scale.y = 0.34; o.add(half); }
      o.add(mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 14), std(0xfbf3e6, 0.6), 0, 0.039, 0));
      o.position.set(x, 0.055, z); g.add(o); ms.push(o);
    });
    ms.reverse();
    return food('box of macarons', 'Six macarons in a pink box, each a different colour and all of them looking at you.',
      ['The chocolate one first, to get the decision over with. Crisp, then not.', 'Salted caramel. You close your eyes, like a person in an advertisement.', 'Lavender. It tastes the way the linen cupboard smells, which seems to be a theme.', 'Lemon. Sharp enough to make the others seem like a dream.', 'Pistachio. Green, serious, excellent.'],
      'The rose one last, as is only right. The box is empty, and very pretty.', ms, g);
  }
  function board() {
    const g = new THREE.Group(), bits = [];
    g.add(mesh(new THREE.BoxGeometry(0.7, 0.045, 0.46), std(0x8a5c34, 0.6), 0, 0.022, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.046, 10), std(0x5a3a22, 0.6), 0.29, 0.022, -0.17));
    const rose = new THREE.Group();                                      // a rose of pepperoni: slices standing in rings
    for (let i = 0; i < 11; i++) { const a = i * 2.4, r = 0.02 + i * 0.008, s = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.008, 12), std(i % 2 ? 0xa8321f : 0xb8402a, 0.6), Math.cos(a) * r, 0.05, Math.sin(a) * r); s.rotation.set(Math.PI / 2 - 0.5, -a, 0); rose.add(s); }
    rose.position.set(-0.18, 0.045, 0.02); g.add(rose);
    const cheese = new THREE.Group(); for (let i = 0; i < 4; i++) { const c = mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.3, 8), std(0xf6efd8, 0.7), 0, 0.022 + (i > 2 ? 0.04 : 0), (i % 3) * 0.05 - 0.05); c.rotation.z = Math.PI / 2; c.rotation.y = 0.15 * i; cheese.add(c); }
    cheese.position.set(0.14, 0.045, 0.1); g.add(cheese);
    const crk = new THREE.Group(), crk2 = new THREE.Group(); for (let i = 0; i < 8; i++) (i < 4 ? crk : crk2).add(mesh(new THREE.BoxGeometry(0.075, 0.012, 0.075), std(0xe08a2a, 0.8), (i % 4) * 0.06 - 0.09, 0.008 + (i % 2) * 0.012, i < 4 ? 0 : 0.085));
    crk.position.set(0.12, 0.045, -0.14); crk2.position.set(0.12, 0.045, -0.14); crk.rotation.y = crk2.rotation.y = 0.2; g.add(crk, crk2);
    bits.push(rose, cheese, crk2, crk); bits.reverse();
    return food('charcuterie for one', 'A small oak board: a rose made of pepperoni, string cheese in ribbons, and a fan of square orange crackers. Somebody used tweezers.',
      ['A cracker. Salty, orange, correct, and somehow better on a board.', 'More crackers. The fan is a memory.', 'String cheese, peeled in strings, as is proper, though here they call them ribbons.'],
      'You take the pepperoni rose apart petal by petal, which feels like vandalism and tastes like pepperoni. The board is bare.', bits, g);
  }
  function fries() {
    const g = new THREE.Group(), tufts = [];
    g.add(mesh(new THREE.CylinderGeometry(0.17, 0.1, 0.34, 20, 1, true), Object.assign(silver(), { side: THREE.DoubleSide }), 0, 0.2, 0));
    g.add(mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.03, 20), silver(), 0, 0.015, 0)); g.add(mesh(new THREE.TorusGeometry(0.17, 0.012, 6, 22).rotateX(Math.PI / 2), silver(), 0, 0.37, 0));
    for (let k = 0; k < 4; k++) {
      const t = new THREE.Group();
      for (let i = 0; i < 7; i++) { const a = (k * 7 + i) * 2.4, r = 0.03 + ((i * 5) % 7) / 7 * 0.1, f = mesh(new THREE.BoxGeometry(0.028, 0.3 + (i % 3) * 0.05, 0.028), std(i % 3 ? 0xe9bf5a : 0xd9a441, 0.7), Math.cos(a) * r, 0.33 + (i % 2) * 0.03, Math.sin(a) * r); f.rotation.set(Math.sin(a) * 0.3, a, Math.cos(a) * 0.3); t.add(f); }
      for (let i = 0; i < 5; i++) { const a = (k * 5 + i) * 1.9; t.add(mesh(new THREE.SphereGeometry(0.012, 5, 4), std(i % 2 ? 0xfbf6e6 : 0x2a2420, 0.9), Math.cos(a) * 0.09, 0.5 + (i % 3) * 0.02, Math.sin(a) * 0.09)); }
      g.add(t); tufts.push(t);
    }
    return food('truffle fries', 'Truffle fries in a silver cup, under a small snowfall of parmesan. They smell of money and of chips.',
      ['A fry. Hot, salty, and unmistakably truffled. You understand the silver now.', 'Several fries at once, which is how fries are meant to be eaten.', 'The ones at the bottom have all the parmesan. You had suspected as much.'],
      'You finish the truffle fries, and run a finger round the cup when nobody is looking. Somebody was looking. It was Mortimer.', tufts, g);
  }

  function build(id, extra) {
    if (COFFEE[id]) return cup(id);
    if (id === 'food-oysters') return oysters();
    if (id === 'food-macarons') return macarons();
    if (id === 'food-board') return board();
    if (id === 'food-fries') return fries();
    if (id === 'koi-glitter') return tin();
    if (id === 'reginald-treats') return treats();
    if (id === 'game-disc') return disc();
    if (id === 'fireworks') return rockets();
    if (id.startsWith('record-') && extra) return record(extra);
    if (id.startsWith('jigsaw-') && extra) return jigsawBox(extra);
    return null;
  }
  return { build };
}
