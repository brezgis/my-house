// Two small things that have to do with what is under the island.
//
// The cellar doors. Outside, in the angle where the living room's west wall meets the office's south wall (plan
// X 19, Y 30), a plain New England steel bulkhead against the living room's brick base: a low concrete curb,
// sloped steel cheeks, two slanted leaves in old dark-green paint with a handle each and strap hinges. Nothing
// says what it is for. E swings the leaves open (the one with the astragal first) on a flight of stone steps
// going down into the dark; the walker can go down them (the island's lawn has no hole in it, so the walker is
// given the stair's floor here, and what lies below the lawn is drawn as the pond's is: see deep() below). At the
// bottom is a dark doorway under the house; E there ("go down") fades the view to black and takes you to the basement. E on an open leaf closes them again.
//
// The skylight. Out in the meadow, well clear of the paths, a low ring of weathered stone in the long grass holding
// a shallow glass dome on a thin bronze rim: the top of a light shaft. Looking down through it there is only dark,
// and far below a faint warm glow (a little stronger after dark). It is solid; E on it ("look down") is one line.
//
//   ?cellaropen   start with the cellar doors open (for pictures)

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PAINT } from './tools.js';
import { place, buildPart, ownPlants } from './little_library.js';
import { rng } from './cards.js';

// The paired Tailscale previews serve each site's working tree at its own port.
function basementAddress() {
  const local = location.port === '8791' && /^(localhost|\[::1\]|[\d.]+|.+\.ts\.net)$/.test(location.hostname);
  return local ? location.protocol + '//' + location.hostname + ':5193/' : 'https://basement.brezgis.com/site/';
}

// ---- The bulkhead: where, and how big -------------------------------------------------------------------------
// Its frame: x across (+x away from the office wall), y up, z out from the wall. Its back stands on the brick
// base's face (plan Y 30.06), its curb 0.6 ft off the office wall's brick (plan X 18.94), so that the left leaf,
// standing open, clears the office window's sill.
const AT = { x: -5.8, z: -30.06, yaw: Math.PI };
const HW = 2.3;                                   // half the steel frame's width
const CH = 2.45, CI = 1.95, CL = 6.15, CY = 0.35; // the curb: half width outside and inside, length, height
// Stand two feet beyond the end of the curb, looking back at the cellar doors.
export function cellarArrival() {
  const distance = CL + 2.25;
  return { walk: [AT.x + Math.sin(AT.yaw) * distance, 0, AT.z + Math.cos(AT.yaw) * distance, AT.yaw, -0.43] };
}
const TOP = 3.0, LOW = 0.75, Z0 = 0.3, Z1 = 5.75; // the leaves' slope: TOP at Z0 by the wall, down to LOW at Z1
const SLOPE = Math.atan2(TOP - LOW, Z1 - Z0), LEAF = Math.hypot(Z1 - Z0, TOP - LOW) + 0.06;
const OPEN = 1.66;                                // how far the leaves swing (a little past upright)
const MOUTH = 5.6;                                // the areaway runs from the wall (z 0) to here
const RISE = 0.6, BOTTOM = -6 * RISE;             // six risers; the eye at the bottom is still above the lawn
const TREAD = [MOUTH, 4.75, 3.95, 3.15, 2.35, 1.55, 0];       // tread i (1..6) runs from TREAD[i] to TREAD[i - 1]
const FEET = [[MOUTH, 0.05], [5.15, -0.6], [4.35, -1.2], [3.55, -1.8], [2.75, -2.4], [1.95, -3.0], [1.5, -3.6], [0, -3.6]];      // the walker's floor down the flight
const PLANE = 0.3;                                // below this the areaway is drawn through its mouth only
const STEEL = 'c#3e4c41/0.55', STEEL2 = 'c#475447/0.55', RUST = 'c#4d4335/0.9', BLACK = 'c#050404/1';
const CONCRETE = ['c#8a8476/0.95', 'c#837d70/0.95', 'c#8f897b/0.95'];

// ---- The skylight ------------------------------------------------------------------------------------------------
const SKY = { x: -80, z: -68 };                   // the meadow: 18 ft from the nearest mown path, 17 from the birches
const RI = 2.45, RO = 3.3, RH = 1.0;              // the ring's inside and outside radius (6.6 ft across), its height
const SPLANE = 0.6, SDEEP = -4.5;                   // the shaft is drawn through the glass below SPLANE; its floor

// ---- Drawing below the lawn ---------------------------------------------------------------------------------------
// The lawn is one unbroken sheet (main.js), so, as with the pond (pond_water.js, sink()), what is below it is drawn
// with a patched material: a fragment below `plane` is thrown away unless the line from the eye to it comes down
// through the mouth (a rectangle or a disc in the mouth's own frame), and is then given a depth between the mouth's
// plane and `floor` (just above the lawn), in order along that line (so near and far still hide one another
// correctly, and the lawn and everything else round the mouth lie behind). With the eye below the plane (crouched on
// the steps) the test is made just under the eye instead; with the eye down at the lawn or below it, what is below
// is drawn as it is. It also darkens with depth (`dark` per foot).
function deep(mat, { plane, floor, dark, mouth, size, disc }) {
  const head = 'varying vec3 vDW; varying float vDZ; varying vec2 vDPJ;';
  mat.onBeforeCompile = sh => {
    sh.uniforms.uDeep = { value: new THREE.Vector3(plane, floor, dark) };
    sh.uniforms.uMouth = { value: mouth };
    sh.uniforms.uMouthSize = { value: new THREE.Vector3(...size) };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + head)
      .replace('#include <project_vertex>', `#include <project_vertex>
  vDW = (modelMatrix * vec4(transformed, 1.0)).xyz; vDZ = mvPosition.z; vDPJ = vec2(projectionMatrix[2][2], projectionMatrix[3][2]);`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
${head} uniform vec3 uDeep, uMouthSize; uniform mat4 uMouth;`)
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
  float hm = min(uDeep.x, cameraPosition.y - 0.02);
  if (vDW.y < hm && hm > uDeep.y + 0.01) {
    vec3 ray = vDW - cameraPosition;
    if (ray.y > -1e-4) discard;
    float tm = (hm - cameraPosition.y) / ray.y;
    vec2 q = (uMouth * vec4(cameraPosition + ray * tm, 1.0)).xz;
    ${disc ? 'if (length(q) > uMouthSize.x) discard;' : 'if (abs(q.x) > uMouthSize.x || q.y < uMouthSize.y || q.y > uMouthSize.z) discard;'}
    float past = length(ray) * (1.0 - tm), hf = hm - (hm - uDeep.y) * past / (past + 3.0);
    float vz = vDZ * (hf - cameraPosition.y) / ray.y;
    gl_FragDepth = (vDPJ.x * vz + vDPJ.y) / (-vz) * 0.5 + 0.5;
  } else gl_FragDepth = gl_FragCoord.z;`)
      .replace('#include <opaque_fragment>', `outgoingLight *= exp(-max(uDeep.x - vDW.y, 0.0) * uDeep.z);
  #include <opaque_fragment>`);
  };
  mat.customProgramCacheKey = () => 'cellar-deep-' + (disc ? 'disc' : 'rect') + (mat.isMeshBasicMaterial ? '-basic' : '');
  return mat;
}
// The plain-painted parts collected in a part's sink, as one vertex-coloured geometry in world space
function sinkGeometry(part) {
  const list = part.sink.map(([mat, g0]) => {
    const g = g0.index ? g0.toNonIndexed() : g0;
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.normal) g.computeVertexNormals();
    const c = new THREE.Color(parseInt(/^c#([0-9a-f]{6})/i.exec(mat)[1], 16)).multiplyScalar(0.78), n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3));
    return g;
  });
  return mergeGeometries(list).applyMatrix4(part.world);
}
// A stone wall face of rough courses, as boxes in a frame: the face at x = x0 looking toward -x (s = 1) or +x
// (s = -1), from z0 to z1, y0 to y1, with gaps of dark mortar
function courses(p, q, s, x0, z0, z1, y0, y1, skip = () => false) {
  const STONE = ['c#6d685e', 'c#615c53', 'c#78726a', 'c#5a564e', 'c#6a6152'];
  p.box('c#24211d', x0 + s * 0.05, x0 + s * 0.3, y0, y1, z0, z1);
  const rows = Math.max(1, Math.round((y1 - y0) / 0.52)), rh = (y1 - y0) / rows;
  for (let i = 0; i < rows; i++) {
    let z = z0 + (i % 2 ? 0 : -0.35 * q());
    while (z < z1 - 0.05) {
      const len = 0.7 + q() * 0.7, a = Math.max(z0, z), b = Math.min(z1, z + len), ya = y0 + i * rh, yb = ya + rh;
      if (b - a > 0.12 && !skip(a, b, ya, yb)) p.box(STONE[Math.floor(q() * STONE.length)] + '/1', x0 + s * (0.06 - q() * 0.05), x0 + s * 0.12, ya + 0.025, yb - 0.025, a + 0.025, b - 0.025);
      z += len;
    }
  }
}

export function buildCellar(K) {
  const f = place(K, AT.x, 0, AT.z, AT.yaw);
  // ---- above ground: the curb, the steel frame, the doorway in the house's base ----
  for (const s of [-1, 1]) f.box(CONCRETE[s > 0 ? 0 : 1], s > 0 ? CI : -CH, s > 0 ? CH : -CI, -0.1, CY, 0, CL);
  f.box(CONCRETE[2], -CI, CI, -0.1, CY, MOUTH, CL);
  for (const s of [-1, 1]) {
    // the cheek: a steel plate on the curb, its top edge the slope the leaves lie on, with a flange along it
    f.sub(s > 0 ? HW : -HW + 0.06, 0, 0, -Math.PI / 2).prism(STEEL, [[0, CY], [Z1, CY], [Z1, LOW], [Z0, TOP], [0, TOP]], 0, 0.06);
    f.beam(STEEL, [s * (HW + 0.02), TOP - 0.03, Z0], [s * (HW + 0.02), LOW - 0.03, Z1], 0.07, 0.09);
    f.box(STEEL, s > 0 ? HW - 0.14 : -HW - 0.06, s > 0 ? HW + 0.06 : -HW + 0.14, CY, CY + 0.035, 0, Z1);      // its foot, bolted to the curb
    for (const zl of [0.75, LEAF - 0.75]) {      // the fixed half of each strap hinge
      const z = Z0 + zl * Math.cos(SLOPE), y = TOP - zl * Math.sin(SLOPE);
      f.box(STEEL2, s > 0 ? HW : -HW - 0.025, s > 0 ? HW + 0.025 : -HW, y - 0.36, y - 0.03, z - 0.11, z + 0.11);
    }
  }
  f.box(STEEL, -HW, HW, TOP - 0.42, TOP + 0.08, 0, Z0 + 0.02);                 // the header against the wall
  f.box(STEEL, -HW - 0.12, HW + 0.12, TOP - 0.42, TOP + 0.3, 0, 0.035);       // and its flange, bolted to the shingles
  f.box(STEEL, -HW, HW, CY, LOW, Z1 - 0.06, Z1);                               // the low end
  f.box(STEEL, -HW - 0.05, HW + 0.05, CY, CY + 0.04, Z1 - 0.12, Z1 + 0.06);
  f.box(RUST, -HW + 0.3, -HW + 0.9, CY + 0.04, CY + 0.042, Z1 - 0.1, Z1 + 0.04); f.box(RUST, 0.6, 1.4, CY + 0.04, CY + 0.042, Z1 - 0.1, Z1 + 0.03);
  // the doorway in the base of the house, seen under the header: dark, in an old timber frame under a stone lintel
  f.box(BLACK, -1.2, 1.2, 0, 2.4, -0.02, 0.065);
  for (const s of [-1, 1]) f.box('timber', s > 0 ? 1.2 : -1.38, s > 0 ? 1.38 : -1.2, 0, 2.4, -0.02, 0.12);
  f.box('c#7a756b/0.95', -1.5, 1.5, 2.4, 2.62, -0.02, 0.15);
  // the sill at the low end, stepped over on the way in
  { const [a, b, c, d] = f.aabb(-CH, CH, MOUTH, CL); K.surface(a, b, c, d, LOW); }
  f.keepOut(-CH - 0.1, CH + 0.1, -0.1, CL + 0.1); f.keepOut(-1.7, 1.7, CL, CL + 2.2);      // nothing grows in it, or in the way in
  // a little grass and clover come up round the curb, on the side away from the office wall
  ownPlants(K, 4207, F => {
    for (const [x, z, k, s] of [[CH + 0.45, 1.0, 'grass', 0.55], [CH + 0.35, 4.4, 'grass', 0.5], [CH + 0.3, CL + 0.25, 'clover', 0.6], [-CH + 0.5, CL + 0.4, 'clover', 0.55], [CH + 0.6, 2.8, 'dandelion', 0.5]]) {
      const p = f.w(x, 0, z); F.add(k, p.x, p.z, s, k === 'clover' ? { y: 0.1 } : k === 'dandelion' ? { tilt: 0 } : {});
    }
  });

  // ---- below ground: the areaway, its stone steps and the doorway at the bottom (one mesh, drawn through the mouth) ----
  const pit = f.part(0, 0, 0), q = rng(3301);
  // (every piece runs into the next, and a slab lies under it all: a crack anywhere would show the lawn through it)
  for (const s of [-1, 1]) courses(pit, q, s, s * CI, -0.3, MOUTH + 0.3, BOTTOM - 0.4, PLANE);
  { const fr = pit.sub(0, 0, MOUTH, -Math.PI / 2); courses(fr, q, 1, 0, -CI - 0.1, CI + 0.1, -RISE - 0.3, PLANE); }      // the outer end, above the top tread
  { const fr = pit.sub(0, 0, 0, Math.PI / 2);                                                                              // the house end, round the doorway
    courses(fr, q, 1, 0, -CI - 0.1, CI + 0.1, BOTTOM - 0.4, PLANE, (a, b) => b > -1.38 && a < 1.38); }
  pit.box('c#2a2723/1', -CI - 0.35, CI + 0.35, BOTTOM - 0.6, BOTTOM - 0.3, -0.5, MOUTH + 0.4);
  for (let i = 1; i <= 6; i++) {
    const y = -i * RISE, za = TREAD[i], zb = TREAD[i - 1], w = CI + 0.07;              // (the ends are built into the walls)
    const stone = ['c#7f7a70', 'c#77736a', 'c#857f74'][i % 3] + '/1';
    pit.box(stone, -w, w, y - 0.2, y, za - (i < 6 ? 0.07 : 0), zb);                       // the tread, its nose a little over the one below
    pit.box('c#4f4b44/1', -w, w, BOTTOM - 0.35, y - 0.2, za, zb);                        // and the stone under it
  }
  pit.box(BLACK, -1.2, 1.2, BOTTOM, PLANE, -0.4, 0.065);                                 // the doorway: nothing to see
  for (const s of [-1, 1]) pit.box('c#3a3128/1', s > 0 ? 1.2 : -1.38, s > 0 ? 1.38 : -1.2, BOTTOM, PLANE, -0.02, 0.12);
  pit.box('c#2e2a25/1', -1.2, 1.2, BOTTOM - 0.05, BOTTOM + 0.04, -0.3, 0.12);           // a worn sill

  // ---- the two leaves, each built about its hinge on the slope; right (s = -1) carries the astragal ----
  const leaf = s => {
    const p = f.part(-s * HW, TOP, Z0); p.world.multiply(new THREE.Matrix4().makeRotationX(SLOPE));
    const bx = (mat, a, b, y0, y1, z0, z1) => p.box(mat, s > 0 ? a : -b, s > 0 ? b : -a, y0, y1, z0, z1);      // a and b: inward from the hinge
    bx(STEEL, -0.04, HW, 0, 0.05, 0, LEAF);                                           // the plate
    bx(STEEL, -0.04, 0, -0.16, 0.05, 0, LEAF); bx(STEEL, 0, HW, -0.12, 0.05, LEAF - 0.04, LEAF);      // turned down over the cheek and at the low end
    for (const z of [LEAF / 3, LEAF * 2 / 3]) bx(STEEL, 0.18, HW - 0.18, 0.05, 0.075, z - 0.05, z + 0.05);      // pressed stiffeners
    if (s < 0) bx(STEEL, HW - 0.03, HW + 0.1, 0.05, 0.12, 0.05, LEAF - 0.05);       // the astragal over the meeting edge
    for (const zl of [0.75, LEAF - 0.75]) {                                          // strap hinges
      bx(STEEL2, 0, 1.05, 0.05, 0.068, zl - 0.11, zl + 0.11);
      p.beam(STEEL2, [-s * 0.03, 0.0, zl - 0.17], [-s * 0.03, 0.0, zl + 0.17], 0.11, 0.11, 8);
      bx(RUST, 0.1, 0.55, 0.0505, 0.052, zl + 0.12, zl + 0.5);
    }
    bx(RUST, HW - 0.9, HW - 0.2, 0.0505, 0.052, LEAF - 0.5, LEAF - 0.05);
    const hx = s * (HW - 0.42), hz = LEAF * 0.55;                                    // the handle
    for (const dz of [-0.22, 0.22]) p.tube('c#2a2926/0.45', [hx, 0.05, hz + dz], [hx, 0.21, hz + dz], 0.03, 6);
    p.tube('c#2a2926/0.45', [hx, 0.21, hz - 0.25], [hx, 0.21, hz + 0.25], 0.032, 6);
    return p;
  };
  const leaves = [leaf(1), leaf(-1)];

  // ---- the skylight ----
  { const q2 = rng(6607), N = 11;
    for (let i = 0; i < N; i++) {      // the ring, in eleven dressed stones, each a little different
      const a0 = (i / N) * Math.PI * 2 + 0.01, a1 = ((i + 1) / N) * Math.PI * 2 - 0.01, h = RH + (q2() - 0.5) * 0.07, sh = new THREE.Shape();
      sh.absarc(0, 0, RO - 0.05, a0, a1, false); sh.absarc(0, 0, RI + 0.05, a1, a0, true);
      const g = new THREE.ExtrudeGeometry(sh, { depth: h + 0.1, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 1, curveSegments: 3 });
      g.rotateX(-Math.PI / 2); g.translate(SKY.x, -0.15, SKY.z);
      K.put(['c#958b7b/0.95', 'c#8a8172/0.95', 'c#9d9484/0.95', 'c#837a6b/0.95'][Math.floor(q2() * 4)], g);
    }
    for (const [a, top, sx] of [[0.4, 0, 0.45], [1.9, 0, 0.35], [2.6, 1, 0.22], [3.7, 0, 0.5], [4.6, 1, 0.18], [5.5, 0, 0.3]]) {      // moss in the joints and at the foot, lichen on top
      const r = top ? (RI + RO) / 2 : RO + 0.02; K.rock(PAINT.moss, SKY.x + Math.cos(a) * r, top ? RH + 0.02 : 0.06, SKY.z + Math.sin(a) * r, sx, top ? 0.05 : 0.16, sx * 0.7, -a, 1);
    }
    const rim = new THREE.TorusGeometry(RI + 0.03, 0.06, 6, 40); rim.rotateX(Math.PI / 2); rim.translate(SKY.x, RH + 0.04, SKY.z); K.put('c#7d6543/0.4/1', rim);      // the bronze rim
    K.collide(SKY.x - RO, SKY.x + RO, SKY.z - RO, SKY.z + RO, 1.9);
    // longer grass and a few daisies grown up round it; the meadow's own plants kept off the stones
    const keep = [[-3.35, 3.35, -1.3, 1.3], [-1.3, 1.3, -3.35, 3.35], [-2.6, 2.6, -2.6, 2.6]];
    for (const [x0, x1, z0, z1] of keep) (K.F.keepOut ??= []).push([SKY.x + x0, SKY.x + x1, SKY.z + z0, SKY.z + z1]);
    const clear = (dx, dz) => !keep.some(([x0, x1, z0, z1]) => dx > x0 && dx < x1 && dz > z0 && dz < z1);
    ownPlants(K, 9061, F => {
      const sow = (n, d0, d1, kind, s0, s1, o = {}) => { for (let i = 0; i < n; i++) { const a = (i + F.r() * 0.7) / n * Math.PI * 2, d = d0 + F.r() * (d1 - d0), dx = Math.cos(a) * d, dz = Math.sin(a) * d; if (clear(dx, dz)) F.add(kind, SKY.x + dx, SKY.z + dz, s0 + F.r() * (s1 - s0), o); } };
      sow(16, 3.75, 4.5, 'grass', 0.75, 1.05); sow(7, 3.7, 4.3, 'wildflowers', 0.55, 0.75); sow(6, 3.65, 4.0, 'clover', 0.5, 0.7, { y: 0.1 }); sow(3, 3.8, 4.4, 'dandelion', 0.5, 0.6, { tilt: 0 });
    });
  }

  K.setups.push(ctx => cellarLife(ctx, f, pit, leaves));
}

function cellarLife(ctx, f, pit, leafParts) {
  const scene = ctx.scene, Q = new URLSearchParams(location.search);
  // the areaway, drawn only while the doors stand open
  const inv = f.m.clone().invert();
  const pitMesh = new THREE.Mesh(sinkGeometry(pit), deep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, envMapIntensity: 0.3 }), { plane: PLANE, floor: 0.06, dark: 0.45, mouth: inv, size: [CI, 0, MOUTH], disc: false }));
  pitMesh.name = 'cellar steps'; pitMesh.receiveShadow = true; pitMesh.visible = false; scene.add(pitMesh);
  const leaves = leafParts.map((p, i) => buildPart(ctx, p, 'cellar door ' + (i ? 'right' : 'left')));
  // where a point (world x, z) is in the bulkhead's frame
  const c = Math.cos(AT.yaw), s = Math.sin(AT.yaw);
  const local = (x, z) => { const dx = x - AT.x, dz = z - AT.z; return [c * dx - s * dz, s * dx + c * dz]; };
  const inWell = (x, z) => { const [lx, lz] = local(x, z); return Math.abs(lx) < CI + 0.05 && lz > -0.1 && lz < MOUTH; };
  const stairY = lz => { for (let i = 1; i < FEET.length; i++) { const [za, ya] = FEET[i - 1], [zb, yb] = FEET[i]; if (lz >= zb) return yb + (ya - yb) * (lz - zb) / (za - zb); } return BOTTOM; };
  const walker = () => { try { return ctx.walker; } catch { return null; } };      // (made after the garden is set up)
  const below = () => { const w = walker(); return !!w && w.pos.y < -0.2 && inWell(w.pos.x, w.pos.z); };

  // the walker's floor down the flight: the stair here while the doors are open (or while anyone is still down it)
  let open = false;
  const hook = () => {
    const w = walker(); if (!w) { setTimeout(hook, 250); return; }
    const base = w.floorAt.bind(w);
    w.floorAt = (x, z, y) => ((open || y < -0.2) && inWell(x, z) ? stairY(local(x, z)[1]) : base(x, z, y));
  };
  setTimeout(hook, 0);
  // the colliders: the shut doors, the sides of the areaway and the house end (each under 5.5 ft tall, so life.js does not
  // count them as walls in the way of what one is looking at)
  const box = (x0, x1, z0, z1, y0, y1) => { const [a, b, cz, d] = f.aabb(x0, x1, z0, z1), o = { x0: a, x1: b, z0: cz, z1: d, y0, y1 }; ctx.colliders.push(o); return o; };
  const shut = box(-CH, CH, 0, CL, -0.5, 3.1);
  for (const sx of [-1, 1]) box(sx > 0 ? CI : -CH - 0.15, sx > 0 ? CH + 0.15 : -CI, 0, CL, -3, 2.4);
  box(-CI, CI, -0.5, 0.75, -3, 2.4);      // (one stops on the landing, a step back from the doorway)

  // the leaves' swing: the right one (with the astragal) leads opening, the left one leads closing
  let k = 0, aim = 0;
  const ease = t => { t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); };
  const pose = () => { leaves[1].rotation.z = -OPEN * ease(k * 1.45); leaves[0].rotation.z = OPEN * ease(k * 1.45 - 0.45); pitMesh.visible = k > 0.001; };
  let sun = null;
  ctx.animated.push((t, dt) => {
    if (k === aim) return;
    const d = aim - k, step = Math.min(Math.abs(d), Math.min(dt, 0.1) * 0.62);
    k = Math.abs(d) < 1e-3 ? aim : k + Math.sign(d) * step; pose();
    if (k !== aim) return;      // come to rest: the sun's shadows are drawn again, once (as the chapel door does)
    if (!sun) { let top = leaves[0]; while (top.parent) top = top.parent; top.traverse(o => { if (o.isDirectionalLight && o.castShadow) sun = o; }); }
    if (sun) sun.shadow.needsUpdate = true;
  });
  // E: on the shut doors, open them; on an open leaf, close them (not from down the steps); at the bottom, go down
  const centre = f.w(0, 2.0, 3.0), leafAt = i => {
    const m = new THREE.Matrix4().copy(leafParts[i].world).multiply(new THREE.Matrix4().makeRotationZ((i ? -1 : 1) * OPEN));
    return new THREE.Vector3((i ? -1 : 1) * 1.15, 0.1, LEAF * 0.5).applyMatrix4(m);
  };
  const openAt = [leafAt(0), leafAt(1)];
  const set = o => {
    open = o; aim = o ? 1 : 0; shut.off = o;
    for (const [i, e] of ents.entries()) { const p = o ? openAt[i] : centre; Object.assign(e, { x: p.x, y: p.y, z: p.z, size: o ? 1.1 : 1.6 }); }
  };
  const ents = [0, 1].map(i => ({ x: centre.x, y: centre.y, z: centre.z, size: 1.6,
    get reach() { return (i === 1 && !open) || below() ? 0 : 7; },
    label: () => (open ? 'close the cellar doors' : 'open the cellar doors'),
    act: () => { if (!below()) set(!open); } }));
  for (const e of ents) ctx.interact.push(e);
  const door = f.w(0, 0.6, 0.1);      // (about where the eye falls on it, standing at the bottom)
  let going = false;
  ctx.interact.push({ x: door.x, y: door.y, z: door.z, size: 1.3,
    get reach() { return open && below() ? 4.6 : 0; },
    label: () => 'go down',
    act: () => {
      if (going) return; going = true;      // the view fades to black, then on to the site under the island
      const veil = document.createElement('div');
      veil.style.cssText = 'position:fixed;inset:0;z-index:7;pointer-events:none;background:#000;opacity:0;transition:opacity 1.2s ease-in';
      document.body.appendChild(veil); requestAnimationFrame(() => { veil.style.opacity = '1'; });
      addEventListener('pageshow', () => { going = false; veil.remove(); }, { once: true });
      setTimeout(() => { location.assign(basementAddress() + '?from=house'); }, 1300);
    } });
  if (Q.has('cellaropen')) { set(true); k = 1; pose(); }

  // ---- the skylight: the shaft and the glow far down it, and the glass ----
  const toMouth = new THREE.Matrix4().makeTranslation(-SKY.x, 0, -SKY.z), sz = [RI, 0, 0];
  const wall = new THREE.CylinderGeometry(RI, RI, SPLANE - SDEEP, 24, 8, true);
  { const ix = wall.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }      // turned inside out
    const n = wall.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i));
    const p = wall.attributes.position, col = new Float32Array(p.count * 3), q = rng(7717);
    for (let i = 0; i < p.count; i++) { const v = 0.035 + q() * 0.03; col[i * 3] = v * 1.05; col[i * 3 + 1] = v; col[i * 3 + 2] = v * 0.9; }
    wall.setAttribute('color', new THREE.BufferAttribute(col, 3)); wall.translate(SKY.x, (SPLANE + SDEEP) / 2, SKY.z); }
  const shaft = new THREE.Mesh(wall, deep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, envMapIntensity: 0.2 }), { plane: SPLANE, floor: 0.35, dark: 0.75, mouth: toMouth, size: sz, disc: true }));
  shaft.name = 'skylight shaft'; scene.add(shaft);
  const floor = new THREE.RingGeometry(0.01, RI, 28, 8); floor.rotateX(-Math.PI / 2);
  { const p = floor.attributes.position, col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) { const r = Math.hypot(p.getX(i), p.getZ(i)), g = Math.exp(-((r / 0.8) ** 2)); col[i * 3] = 0.004 + g * 0.95; col[i * 3 + 1] = 0.003 + g * 0.45; col[i * 3 + 2] = 0.002 + g * 0.12; }
    floor.setAttribute('color', new THREE.BufferAttribute(col, 3)); floor.translate(SKY.x, SDEEP, SKY.z); }
  const glowMat = deep(new THREE.MeshBasicMaterial({ vertexColors: true }), { plane: SPLANE, floor: 0.35, dark: 0, mouth: toMouth, size: sz, disc: true });
  const glow = new THREE.Mesh(floor, glowMat); glow.name = 'skylight glow'; scene.add(glow);
  glow.onBeforeRender = () => { const v = 0.4 + 0.9 * (ctx.day?.night ?? 0); glowMat.color.setRGB(v, v, v); };      // a little stronger after dark
  const R = (RI * RI + 0.7 * 0.7) / (2 * 0.7), dome = new THREE.SphereGeometry(R, 32, 6, 0, Math.PI * 2, 0, Math.asin((RI + 0.03) / R));
  dome.translate(SKY.x, RH + 0.04 + 0.7 - R, SKY.z);
  const glass = new THREE.Mesh(dome, new THREE.MeshStandardMaterial({ color: 0xdde8ee, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.2, depthWrite: false, envMapIntensity: 1.4 }));
  glass.name = 'skylight glass'; scene.add(glass);
  ctx.interact.push({ x: SKY.x, y: RH + 0.3, z: SKY.z, reach: 7.5, size: 2.4, label: () => 'look down', act: () => window.houseUI?.toast?.('A long way down, a candle.') });
}
