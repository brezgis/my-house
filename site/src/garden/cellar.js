// Two small things that have to do with what is under the island.
//
// The cellar doors. Outside, in the angle where the living room's west wall meets the office's south wall (plan
// X 19, Y 30), a cellar bulkhead built with the house: cheek walls in the same brick as the base they stand
// against, capped with dark-stained timber plates; a timber head under a strip of copper flashing where it meets
// the shakes, a timber sill at the low end; and two slanted leaves of boards running down the slope, framed on
// the face and ledged and braced beneath, on wrought-iron strap hinges, with a ring pull each and a weather strip
// over the meeting edge. Nothing says what it is for. E swings the leaves open (the one with the weather strip
// first) on the head of the basement's own stair: dark slate
// treads between walls of pale coursed stone, a moss-green runner with a cream edge and a line of ochre laid down
// the middle, all of it going down under the house and into the dark, so that only the first four or five steps are
// seen and beyond them nothing. The walker can go down them (the island's lawn has no hole in it, so the walker is
// given the stair's floor here, and what lies below the lawn is drawn as the pond's is: see deep() below). A few
// steps down, where the light gives out, the view fades to black and you are taken to the basement (E, "go down",
// does the same from anywhere on the flight). E on an open leaf closes them again.
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
import { drawSkylightGlass, EYE, CAPTION } from './skylight_glass.js';

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
const HW = 2.3;                                   // half the frame's width: the leaves' hinge lines
const CH = 2.45, CI = 1.95, CL = 6.15;            // the brick cheeks: half width outside and inside, length
// Stand two feet beyond the end of the curb, looking back at the cellar doors.
export function cellarArrival() {
  const distance = CL + 2.25;
  return { walk: [AT.x + Math.sin(AT.yaw) * distance, 0, AT.z + Math.cos(AT.yaw) * distance, AT.yaw, -0.43] };
}
const TOP = 3.0, LOW = 0.75, Z0 = 0.3, Z1 = 5.75; // the leaves' slope: TOP at Z0 by the wall, down to LOW at Z1
const SLOPE = Math.atan2(TOP - LOW, Z1 - Z0), LEAF = Math.hypot(Z1 - Z0, TOP - LOW) + 0.06;
const OPEN = 1.66;                                // how far the leaves swing (a little past upright)
const MOUTH = 5.6;                                // the well runs from the wall (z 0) to here
const RISE = 0.6, BOTTOM = -6 * RISE;             // six risers walked; the eye at the bottom is still above the lawn
const STEPS = 7, UNDER = -STEPS * RISE - 0.8;     // (one more is drawn, in the dark, and the slab under it all)
const HINGES = [0.75, LEAF - 0.75];                 // the strap hinges, down the slope from the head
const TREAD = [MOUTH, 4.75, 3.95, 3.15, 2.35, 1.55, 0.75, -0.05];       // tread i (1..7) runs from TREAD[i] to TREAD[i - 1]
const FEET = [[MOUTH, 0.05], [5.15, -0.6], [4.35, -1.2], [3.55, -1.8], [2.75, -2.4], [1.95, -3.0], [1.5, -3.6], [0, -3.6]];      // the walker's floor down the flight
const PLANE = 0.3;                                // below this the stair is drawn through its mouth only
const FADE = [1.5, 3.6], HOP = 2.75;              // the light gives out between these (z, toward the house: black from the first on); and where the walker is taken below (on the fourth step)
const IRON = PAINT.iron, BLACK = 'c#050404/1';
// Below the lawn everything is plain colour (see sinkGeometry): these are the basement's own stair (basement_spa
// spanya.js and furnish/stair_hall.js) as it comes out on screen there: its walls' pale warm stone in long thin
// courses ('coursed'), its slate treads ('slate_floor'), and its runner's wools, moss green, cream and ochre
const STONES = ['c#e2c8a2', 'c#d4b890', 'c#ead4b2', 'c#c8ac86', 'c#dcc09a', 'c#bfa27c'], GROUT = 'c#9c8462', SLATE = ['c#86745e', 'c#7e6d58', 'c#8e7c66'];
const WOOL = { m: 'c#3e5232', b: 'c#e6dcc4', o: 'c#c4902e' }, RUG = 1.3, BANDS = [[0, 0.2, 'b'], [0.2, 0.28, 'o'], [0.28, 2 * RUG - 0.28, 'm'], [2 * RUG - 0.28, 2 * RUG - 0.2, 'o'], [2 * RUG - 0.2, 2 * RUG, 'b']];      // the runner: its bands across, as the basement's (which is 3.2 ft wide in a 6 ft stair; this one 2.6 in 3.9)
const COURSE = 0.3;                               // a course of the stone

// A piece of the house's dark-stained timber, its grain along its length (or along axis o.along: 0 x, 1 y, 2 z)
function wood(fr, x0, x1, y0, y1, z0, z1, o = {}) {
  const d = [Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0)], g = new THREE.BoxGeometry(...d).toNonIndexed();
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  const L = o.along ?? d.indexOf(Math.max(...d)), p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv, off = o.u ?? 0;
  for (let i = 0; i < p.count; i++) {
    const P = [p.getX(i), p.getY(i), p.getZ(i)], N = [Math.abs(n.getX(i)), Math.abs(n.getY(i)), Math.abs(n.getZ(i))], A = N.indexOf(Math.max(...N));
    const rest = [0, 1, 2].filter(k => k !== A), v = rest.includes(L) ? L : rest[1], u = rest.find(k => k !== v);
    uv.setXY(i, P[u] + off, P[v] + off * 0.37);      // (the fir photo's grain runs along v)
  }
  fr.geo(o.mat ?? 'timber', g);
}

// ---- The skylight ------------------------------------------------------------------------------------------------
const SKY = { x: 37, z: 41 };                     // the front lawn, a few steps to the street side of the three birches: the side of the house the chapel really lies on (it stood in the south-west meadow, 180 ft from where the basement's plan puts it, and could not be found)
const RI = 2.45, RO = 3.3, RH = 1.0;              // the ring's inside and outside radius (6.6 ft across), its height
const SPLANE = 0.6, SDEEP = -19;                   // the shaft is drawn through the glass below SPLANE; its floor

// ---- Drawing below the lawn ---------------------------------------------------------------------------------------
// The lawn is one unbroken sheet (main.js), so, as with the pond (pond_water.js, sink()), what is below it is drawn
// with a patched material: a fragment below `plane` is thrown away unless the line from the eye to it comes down
// through the mouth (a rectangle or a disc in the mouth's own frame), and is then given a depth between the mouth's
// plane and `floor` (just above the lawn), in order along that line (so near and far still hide one another
// correctly, and the lawn and everything else round the mouth lie behind). With the eye below the plane (crouched on
// the steps) the test is made just under the eye instead; with the eye down at the lawn or below it, what is below
// is drawn as it is. It also darkens with depth (`dark` per foot), and, given `fade` [z0, z1] (the mouth's own z), the
// whole mesh, above the plane as well, goes from its own light at z1 to black at z0 and beyond.
function deep(mat, { plane, floor, dark, mouth, size, disc, fade }) {
  const head = 'varying vec3 vDW; varying float vDZ; varying vec2 vDPJ;';
  mat.onBeforeCompile = sh => {
    sh.uniforms.uDeep = { value: new THREE.Vector3(plane, floor, dark) };
    sh.uniforms.uMouth = { value: mouth };
    sh.uniforms.uMouthSize = { value: new THREE.Vector3(...size) }; sh.uniforms.uFade = { value: new THREE.Vector2(...(fade ?? [0, 0])) };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\n' + head)
      .replace('#include <project_vertex>', `#include <project_vertex>
  vDW = (modelMatrix * vec4(transformed, 1.0)).xyz; vDZ = mvPosition.z; vDPJ = vec2(projectionMatrix[2][2], projectionMatrix[3][2]);`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
${head} uniform vec3 uDeep, uMouthSize; uniform vec2 uFade; uniform mat4 uMouth;`)
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
      .replace('#include <opaque_fragment>', `outgoingLight *= exp(-max(uDeep.x - vDW.y, 0.0) * uDeep.z)${fade ? ' * smoothstep(uFade.x, uFade.y, (uMouth * vec4(vDW, 1.0)).z)' : ''};
  #include <opaque_fragment>`);
  };
  mat.customProgramCacheKey = () => 'cellar-deep-' + (disc ? 'disc' : 'rect') + (fade ? '-fade' : '') + (mat.isMeshBasicMaterial ? '-basic' : '');
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
// A wall face of coursed stone, as boxes in a frame: the wall's body on the s side of x = x0 (s = 1: toward +x), its
// stones standing a little proud of that on the other, from z0 to z1, y0 to y1 (and no higher than top(z)), in long
// thin courses breaking joint, each stone its own tone
function stones(p, q, s, x0, z0, z1, y0, y1, top = () => Infinity) {
  const rows = Math.max(1, Math.round((y1 - y0) / COURSE)), rh = (y1 - y0) / rows;
  for (let i = 0; i < rows; i++) {
    let z = z0 - q() * 1.2;
    while (z < z1 - 0.05) {
      const len = 0.9 + q() * 1.5, a = Math.max(z0, z), b = Math.min(z1, z + len), ya = y0 + i * rh, yb = Math.min(ya + rh, top(a), top(b));
      if (b - a > 0.1 && yb - ya > 0.07) p.box(STONES[Math.floor(q() * STONES.length)], x0 - s * (0.03 + q() * 0.022), x0 + s * 0.1, ya + 0.01, yb - 0.01, a + 0.012, b - 0.012);
      z += len;
    }
  }
}

export function buildCellar(K) {
  const f = place(K, AT.x, 0, AT.z, AT.yaw);
  // ---- above ground: the brick cheeks and their timber plates, the head and its flashing, the sill ----
  const sl = f.sub(0, TOP, Z0, 0, SLOPE);      // the slope's own frame: x across, y square off the slope, z down it (as the leaves')
  const under = 0.17, yS = z => TOP - (z - Z0) * Math.tan(SLOPE);      // the brick stops this far under the leaves
  for (const s of [-1, 1]) {
    // the cheek: a brick wall off the base of the house, its top the slope (it runs back to the shakes above the base)
    f.sub(s > 0 ? CH : -CI, 0, 0, -Math.PI / 2).prism('brick', [[-0.06, -0.1], [MOUTH, -0.1], [MOUTH, yS(MOUTH) - under], [Z0, TOP - under], [-0.06, TOP - under]], 0, CH - CI);
    wood(sl, s > 0 ? CI - 0.05 : -CH - 0.05, s > 0 ? CH + 0.05 : -CI + 0.05, -0.16, -0.012, 0, LEAF - 0.02, { u: s * 0.7 });      // its plate, the leaf's seat
    for (const zl of HINGES) sl.box(IRON, s > 0 ? HW + 0.03 : -HW - 0.19, s > 0 ? HW + 0.19 : -HW - 0.03, -0.012, 0.006, zl - 0.14, zl + 0.14);      // the fixed half of each hinge
  }
  f.box('brick', -CH, CH, -0.1, 0.56, MOUTH, CL);                                             // the low end
  wood(f, -CH - 0.07, CH + 0.07, 0.56, 0.72, MOUTH - 0.08, CL + 0.07, { u: 1.3 });           // and its sill, where the leaves land
  wood(f, -CH - 0.05, CH + 0.05, TOP - under, TOP + 0.16, -0.06, Z0, { u: 0.4 });            // the head, against the shakes
  wood(f, -CI, CI, 2.62, TOP - under, -0.06, 0.22, { u: 2.1 });                               // the board under it (below it the stair goes in under the house: nothing but dark, see below)
  f.box('copper', -CH - 0.09, CH + 0.09, TOP + 0.16, TOP + 0.185, -0.06, Z0 + 0.04);         // copper flashing over the head,
  f.box('copper', -CH - 0.09, CH + 0.09, TOP + 0.185, TOP + 0.31, -0.06, -0.035);            // turned up behind the shakes
  // the sill at the low end, stepped over on the way in
  { const [a, b, c, d] = f.aabb(-CH, CH, MOUTH, CL); K.surface(a, b, c, d, LOW); }
  f.keepOut(-CH - 0.1, CH + 0.1, -0.1, CL + 0.1); f.keepOut(-1.7, 1.7, CL, CL + 2.2);      // nothing grows in it, or in the way in
  // a little grass and clover come up round the curb, on the side away from the office wall
  ownPlants(K, 4207, F => {
    for (const [x, z, k, s] of [[CH + 0.45, 1.0, 'grass', 0.55], [CH + 0.35, 4.4, 'grass', 0.5], [CH + 0.3, CL + 0.25, 'clover', 0.6], [-CH + 0.5, CL + 0.4, 'clover', 0.55], [CH + 0.6, 2.8, 'dandelion', 0.5]]) {
      const p = f.w(x, 0, z); F.add(k, p.x, p.z, s, k === 'clover' ? { y: 0.1 } : k === 'dandelion' ? { tilt: 0 } : {});
    }
  });

  // ---- inside: the head of the basement's stair (one mesh, drawn through the mouth below the lawn, and only while the doors are open) ----
  // Its walls of coursed stone from under the leaves' plates down, the slate treads and the runner on them, going on
  // down under the house at the pitch they have in the well. The light gives out toward the house (FADE), so a wall
  // of plain black across the house end, from the slab to the board under the head, is all there is beyond.
  const pit = f.part(0, 0, 0), q = rng(3301), top = z => yS(Math.max(z, Z0)) - under;
  // (every piece runs into the next, and a slab lies under it all: a crack anywhere would show the lawn through it)
  for (const s of [-1, 1]) {
    pit.box(GROUT, s * (CI - 0.012), s * (CI + 0.3), UNDER, PLANE, -0.3, MOUTH + 0.3);                                     // the wall's body below the lawn,
    pit.sub(s > 0 ? CI : -CI + 0.025, 0, 0, -Math.PI / 2).prism(GROUT, [[0, PLANE - 0.02], [MOUTH, PLANE - 0.02], [MOUTH, top(MOUTH)], [Z0, top(Z0)], [0, top(0)]], 0, 0.025);      // a skin of it over the cheek's brick above,
    stones(pit, q, s, s * CI, -0.3, MOUTH + 0.3, UNDER + 0.2, PLANE); stones(pit, q, s, s * CI, 0, MOUTH, PLANE, PLANE + Math.round((TOP - under - PLANE) / COURSE) * COURSE, top);      // and its stones, to the slope
  }
  { const fr = pit.sub(0, 0, MOUTH, -Math.PI / 2); fr.box(GROUT, -0.012, 0.3, -RISE - 0.3, PLANE, -CI - 0.1, CI + 0.1); fr.box(GROUT, -0.012, 0, PLANE, 0.56, -CI, CI); stones(fr, q, 1, 0, -CI, CI, -RISE - 0.3, 0.6, () => 0.57); }      // the outer end, above the top tread and up the curb to its sill
  pit.box(BLACK, -CI - 0.35, CI + 0.35, UNDER - 0.2, UNDER + 0.1, -0.5, MOUTH + 0.4);                                     // the slab
  pit.box(BLACK, -CI - 0.35, CI + 0.35, UNDER, PLANE, -0.5, 0.07); pit.box(BLACK, -CI + 0.02, CI - 0.02, PLANE, 2.62, -0.02, 0.07);      // the house end: nothing to see
  for (let i = 1; i <= STEPS; i++) {
    const y = -i * RISE, za = TREAD[i], zb = TREAD[i - 1], w = CI + 0.07;              // (the ends are built into the walls)
    pit.box(SLATE[i % 3], -w, w, y - 0.2, y, za - 0.07, zb);                             // the tread, its nose a little over the one below
    pit.box('c#62564a', -w, w, UNDER, y - 0.2, za, zb);                                  // and the stone under it: the riser
    for (const [a, b, k] of BANDS) {                                                     // the runner: over the tread, round its nose and down the riser
      pit.box(WOOL[k], a - RUG, b - RUG, y, y + 0.035, za - 0.105, zb - 0.02); pit.box(WOOL[k], a - RUG, b - RUG, y - 0.2, y + 0.035, za - 0.105, za - 0.07);
      if (i < STEPS) pit.box(WOOL[k], a - RUG, b - RUG, y - RISE, y - 0.2, za - 0.035, za);
    }
    pit.beam('c#7d6543', [-RUG - 0.12, y + 0.06, zb - 0.06], [RUG + 0.12, y + 0.06, zb - 0.06], 0.036, 0.036, 6);      // a bronze rod at the tread's back
  }

  // ---- the two leaves, each built about its hinge on the slope; right (s = -1) carries the weather strip ----
  // Boards down the slope, a frame planted on the face, three ledges and two braces beneath (seen when they stand
  // open), and a plain dark core in the joints (the one piece of a leaf that throws a shadow: see buildPart).
  const leaf = s => {
    const p = f.part(-s * HW, TOP, Z0); p.world.multiply(new THREE.Matrix4().makeRotationX(SLOPE));
    const bx = (mat, a, b, y0, y1, z0, z1, o) => p.box(mat, s > 0 ? a : -b, s > 0 ? b : -a, y0, y1, z0, z1, o);      // a and b: inward from the hinge
    const wd = (a, b, y0, y1, z0, z1, o) => wood(p, s > 0 ? a : -b, s > 0 ? b : -a, y0, y1, z0, z1, o);
    bx('c#1a1410/1', 0, HW - 0.006, 0.02, 0.07, 0.01, LEAF - 0.01);
    const N = 5, bw = (HW + 0.04 - 0.004) / N;
    for (let i = 0; i < N; i++) wd(-0.04 + i * bw + 0.007, -0.04 + (i + 1) * bw - 0.007, 0, 0.09 - (i % 2) * 0.004, 0, LEAF, { along: 2, u: i * 0.83 + (s > 0 ? 0 : 4.4) });
    // the frame on the face: two stiles, and three rails between them
    const FW = 0.3, FT = 0.125, mid = LEAF / 2;
    wd(0, FW, 0.086, FT, 0, LEAF, { along: 2, u: 0.31 + s }); wd(HW - FW - 0.008, HW - 0.008, 0.086, FT, 0, LEAF, { along: 2, u: 1.77 + s });
    for (const [z0, z1, u] of [[0, 0.34, 0.6], [mid - 0.16, mid + 0.16, 1.9], [LEAF - 0.34, LEAF, 3.3]]) wd(FW, HW - FW - 0.008, 0.086, FT - 0.006, z0, z1, { along: 0, u: u + s });
    if (s < 0) wd(HW - 0.085, HW + 0.085, FT, FT + 0.05, 0.03, LEAF - 0.03, { along: 2, u: 2.6 });      // the weather strip over the meeting edge
    // beneath: ledges under the hinges and the middle rail, and a brace in each bay, its foot at the hinge side
    const LED = [[HINGES[0] - 0.18, HINGES[0] + 0.18], [mid - 0.18, mid + 0.18], [HINGES[1] - 0.18, HINGES[1] + 0.18]];
    for (const [i, [z0, z1]] of LED.entries()) wd(0.5, HW - 0.1, -0.08, 0, z0, z1, { along: 0, u: 5.1 + i * 1.3 + s });
    for (const i of [0, 1]) {
      const a = [HW - 0.3, LED[i][1] - 0.06], b = [0.7, LED[i + 1][0] + 0.06], dx = s * (b[0] - a[0]), dz = b[1] - a[1];
      wood(p.sub(s * a[0], 0, a[1], Math.atan2(dx, dz)), -0.14, 0.14, -0.07, -0.004, 0, Math.hypot(dx, dz), { along: 2, u: 7.7 + i + s });
    }
    for (const zl of HINGES) {                                                        // wrought-iron strap hinges, bolted through the ledges
      bx(IRON, 0.02, FW, FT, FT + 0.02, zl - 0.09, zl + 0.09); bx(IRON, FW, 1.2, 0.088, FT + 0.02, zl - 0.09, zl + 0.09);
      bx(IRON, 1.2, 1.56, 0.088, FT + 0.02, zl - 0.06, zl + 0.06);
      bx(IRON, 1.56 - 0.085, 1.56 + 0.085, 0.088, FT + 0.02, zl - 0.085, zl + 0.085, { rot: [0, Math.PI / 4, 0] });      // the strap's spear end
      for (const a of [0.16, 0.55, 0.95, 1.35]) bx(IRON, a - 0.028, a + 0.028, FT + 0.02, FT + 0.034, zl - 0.028, zl + 0.028);      // bolt heads
      p.beam(IRON, [-s * 0.035, 0.03, zl - 0.17], [-s * 0.035, 0.03, zl + 0.17], 0.11, 0.11, 8);      // the knuckle
    }
    // the pull: an iron ring lying on its plate on the middle rail, in a staple
    const hx = s * (HW - 0.75), hy = FT - 0.006;
    p.box(IRON, hx - 0.075, hx + 0.075, hy, hy + 0.012, mid - 0.15, mid - 0.04);
    p.box(IRON, hx - 0.035, hx + 0.035, hy + 0.012, hy + 0.062, mid - 0.115, mid - 0.075);
    { const g = new THREE.TorusGeometry(0.13, 0.021, 6, 20); g.rotateX(Math.PI / 2 - 0.13); g.translate(hx, hy + 0.04, mid + 0.035); p.geo(IRON, g); }
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
    K.collide(SKY.x - RO, SKY.x + RO, SKY.z - RO, SKY.z + RO, RH + 0.04);      // (only as tall as the stones: a jump clears it, and one lands on the ring: cellarLife's floorAt)
    // longer grass and a few daisies grown up round it; the meadow's own plants kept off the stones
    const keep = [[-3.35, 3.35, -1.3, 1.3], [-1.3, 1.3, -3.35, 3.35], [-2.6, 2.6, -2.6, 2.6]];
    for (const [x0, x1, z0, z1] of keep) (K.F.keepOut ??= []).push([SKY.x + x0, SKY.x + x1, SKY.z + z0, SKY.z + z1]);
    const clear = (dx, dz) => !keep.some(([x0, x1, z0, z1]) => dx > x0 && dx < x1 && dz > z0 && dz < z1) && !(dz < 0 && Math.abs(dx) < 1.5);      // (and a mown way up to it from the birches' side, so that it can be found)
    ownPlants(K, 9061, F => {
      const sow = (n, d0, d1, kind, s0, s1, o = {}) => { for (let i = 0; i < n; i++) { const a = (i + F.r() * 0.7) / n * Math.PI * 2, d = d0 + F.r() * (d1 - d0), dx = Math.cos(a) * d, dz = Math.sin(a) * d; if (clear(dx, dz)) F.add(kind, SKY.x + dx, SKY.z + dz, s0 + F.r() * (s1 - s0), o); } };
      // a drift about twelve feet across thinning into the lawn: tall grasses, wildflowers (the daisies), lavender for the
      // blue of the glass, clover and a dandelion or two at its edge
      sow(30, 3.75, 6.3, 'grass', 0.8, 1.2); sow(16, 3.7, 5.7, 'wildflowers', 0.6, 0.85); sow(10, 3.9, 5.6, 'lavender', 0.55, 0.8); sow(8, 3.65, 5.0, 'clover', 0.5, 0.7, { y: 0.1 }); sow(4, 4.6, 6.2, 'dandelion', 0.5, 0.6, { tilt: 0 });
    });
  }

  K.setups.push(ctx => cellarLife(ctx, f, pit, leaves));
}

function cellarLife(ctx, f, pit, leafParts) {
  const scene = ctx.scene, Q = new URLSearchParams(location.search);
  // the stair's head, drawn only while the doors stand open
  const inv = f.m.clone().invert();
  const pitMesh = new THREE.Mesh(sinkGeometry(pit), deep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, envMapIntensity: 0.3 }), { plane: PLANE, floor: 0.16, dark: 0.2, mouth: inv, size: [CI, 0, MOUTH], disc: false, fade: FADE }));      // (its floor above the lamplight that the windows lay on the lawn after dark, 0.12 ft up: at 0.06 a bar of it lay across the dark of the stair)
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
    // (and the skylight can be stood on: its stones and its glass are a floor to anyone who has got up onto them)
    w.floorAt = (x, z, y) => ((open || y < -0.2) && inWell(x, z) ? stairY(local(x, z)[1]) : y > -0.4 && Math.hypot(x - SKY.x, z - SKY.z) < RO - 0.03 ? RH + 0.08 : base(x, z, y));
  };
  setTimeout(hook, 0);
  // the colliders: the shut doors, the sides of the well and the house end (each under 5.5 ft tall, so life.js does not
  // count them as walls in the way of what one is looking at)
  const box = (x0, x1, z0, z1, y0, y1) => { const [a, b, cz, d] = f.aabb(x0, x1, z0, z1), o = { x0: a, x1: b, z0: cz, z1: d, y0, y1 }; ctx.colliders.push(o); return o; };
  const shut = box(-CH, CH, 0, CL, -0.5, 3.1);
  for (const sx of [-1, 1]) box(sx > 0 ? CI : -CH - 0.15, sx > 0 ? CH + 0.15 : -CI, 0, CL, -3, 2.4);
  box(-CI, CI, -0.5, 0.75, -3, 2.4);      // (one stops on the sixth step, in the dark: by then the view has gone black, see `descend`)

  // the leaves' swing: the right one (with the weather strip) leads opening, the left one leads closing
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
  // E: on the shut doors, open them; on an open leaf, close them (not from down the steps); on the steps, go down
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
  const descend = () => {
    if (going) return; going = true;      // the view fades to black, then on to the site under the island
    const veil = document.createElement('div');
    veil.style.cssText = 'position:fixed;inset:0;z-index:7;pointer-events:none;background:#000;opacity:0;transition:opacity 1.2s ease-in';
    document.body.appendChild(veil); requestAnimationFrame(() => { veil.style.opacity = '1'; });
    addEventListener('pageshow', () => { going = false; veil.remove(); }, { once: true });
    setTimeout(() => { location.assign(basementAddress() + '?from=house'); }, 1300);
  };
  ctx.interact.push({ x: door.x, y: door.y, z: door.z, size: 1.3,
    get reach() { return open && below() ? 4.6 : 0; },
    label: () => 'go down', act: descend });
  // and without asking: coming down onto the fourth step, where the light gives out, one is taken below. (Only on the
  // way down: come back by the browser and found standing in the dark, one has to climb above it before it will take one again.)
  let above = false;
  ctx.animated.push(() => {
    const w = walker(); if (!w) return;
    const low = open && inWell(w.pos.x, w.pos.z) && local(w.pos.x, w.pos.z)[1] < HOP;
    if (low && above) descend();
    above = !low;
  });
  if (Q.has('cellaropen')) { set(true); k = 1; pose(); }

  // ---- the skylight: the shaft and the glow far down it, and the glass ----
  // Looking down through the clear eye you look down a shaft: nineteen feet of coursed stone, paler at the top where the
  // day gets in and darkening as it goes, and at the bottom the chapel as it is from straight above: its slate floor,
  // the stone table, the bronze bowl of dark water with the sky's disc in it, and the candles. (The lawn is one sheet
  // and lies under the glass too: everything seen through the ring's opening is drawn over it, so no grass shows in
  // the hole.)
  const toMouth = new THREE.Matrix4().makeTranslation(-SKY.x, 0, -SKY.z), sz = [RI - 0.02, 0, 0];
  const SEG = 28, ROWS = 46, wall = new THREE.CylinderGeometry(RI, RI * 0.985, SPLANE - SDEEP, SEG, ROWS, true);
  { const ix = wall.index.array; for (let i = 0; i < ix.length; i += 3) { const t = ix[i + 1]; ix[i + 1] = ix[i + 2]; ix[i + 2] = t; }      // turned inside out
    const n = wall.attributes.normal; for (let i = 0; i < n.count; i++) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i)); }
  { const g = wall.toNonIndexed(), p = g.attributes.position, col = new Float32Array(p.count * 3), H = SPLANE - SDEEP, hash = (a, b) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); };
    for (let i = 0; i < p.count; i += 3) {      // each stone its own tone, a course at a time, the courses breaking joint
      const yc = (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, row = Math.floor((H / 2 - yc) / (H / ROWS)), ac = Math.atan2((p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3, (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3);
      const stone = Math.floor((ac / (Math.PI * 2) + 1) * (SEG / 2) + (row % 2) * 0.5), v = 0.12 + 0.09 * hash(row, stone) - (hash(row, 99) > 0.8 ? 0.03 : 0);
      for (let k = 0; k < 3; k++) { col[(i + k) * 3] = v * 1.04; col[(i + k) * 3 + 1] = v * 0.98; col[(i + k) * 3 + 2] = v * 0.88; }
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.translate(SKY.x, (SPLANE + SDEEP) / 2, SKY.z); wall.dispose(); var wallG = g; }
  const shaft = new THREE.Mesh(wallG, deep(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, envMapIntensity: 0.15, flatShading: true }), { plane: SPLANE, floor: 0.35, dark: 0.15, mouth: toMouth, size: sz, disc: true }));
  shaft.name = 'skylight shaft'; scene.add(shaft);
  // the chapel from straight above, painted small
  const belowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), u = 256 / (RI * 2), X = x => 128 + x * u;
    g.fillStyle = '#17150f'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 6; j++) { g.fillStyle = (i + j) % 2 ? '#1c1a15' : '#141210'; g.fillRect(i * 44 - 4, j * 44 - 4, 43, 43); }      // slate flags
    g.fillStyle = '#6f675a'; g.fillRect(X(-1.95), X(-1.95), 3.9 * u, 3.9 * u); g.strokeStyle = '#8a8172'; g.lineWidth = 2; g.strokeRect(X(-1.95), X(-1.95), 3.9 * u, 3.9 * u);      // the table
    g.fillStyle = '#6a4a22'; g.beginPath(); g.arc(128, 128, 1.36 * u, 0, 7); g.fill(); g.fillStyle = '#08161a'; g.beginPath(); g.arc(128, 128, 1.2 * u, 0, 7); g.fill();      // the bowl, its water
    { const gr = g.createRadialGradient(128 - 6, 128 - 5, 1, 128 - 6, 128 - 5, 0.75 * u); gr.addColorStop(0, 'rgba(190,215,235,.95)'); gr.addColorStop(0.7, 'rgba(120,160,190,.5)'); gr.addColorStop(1, 'rgba(120,160,190,0)'); g.fillStyle = gr; g.beginPath(); g.arc(128, 128, 1.2 * u, 0, 7); g.fill(); }      // the sky's disc in it
    for (const [x, z] of [[-1.5, -1.5], [-1.25, -1.62], [-1.62, -1.2], [1.5, -1.45], [1.3, -1.6], [-1.45, 1.4]]) { const gr = g.createRadialGradient(X(x), X(z), 0, X(x), X(z), 0.55 * u); gr.addColorStop(0, 'rgba(255,225,150,1)'); gr.addColorStop(0.18, 'rgba(255,170,70,.75)'); gr.addColorStop(1, 'rgba(255,140,40,0)'); g.fillStyle = gr; g.beginPath(); g.arc(X(x), X(z), 0.55 * u, 0, 7); g.fill(); }      // the candles
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const floor = new THREE.CircleGeometry(RI, 40); floor.rotateX(-Math.PI / 2); floor.translate(SKY.x, SDEEP, SKY.z);
  const glowMat = deep(new THREE.MeshBasicMaterial({ map: belowTex }), { plane: SPLANE, floor: 0.35, dark: 0, mouth: toMouth, size: sz, disc: true });
  const glow = new THREE.Mesh(floor, glowMat); glow.name = 'skylight glow'; scene.add(glow);
  glow.onBeforeRender = () => { const v = 0.5 + 0.5 * (ctx.day?.night ?? 0); glowMat.color.setRGB(v, v, v); };      // the candles carry further after dark
  // The glass (skylight_glass.js: Varela, Maturana and Uribe's autopoiesis, a ring that makes itself). It lies flat in
  // the bronze rim: a clear eye in the middle, the chapel's shaft seen down through it, and round it the coloured ring.
  // Stained glass seen from its lit side, over a dark shaft, does not glow: by day it is deep-coloured and glossy, the
  // sky lying on it, and only what little light comes back up shows its colours. After dark the candles nineteen feet
  // down give it the faintest light from behind.
  const glassY = RH + 0.065, tex = new THREE.CanvasTexture(drawSkylightGlass(1024)); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const ringMat = new THREE.MeshStandardMaterial({ map: tex, color: 0x9a9a9a, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0, roughness: 0.07, metalness: 0, transparent: true, alphaTest: 0.5, envMapIntensity: 1.7, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(RI * EYE - 0.01, RI + 0.02, 96, 1).rotateX(-Math.PI / 2).rotateY(Math.PI).translate(SKY.x, glassY, SKY.z), ringMat); ring.name = 'skylight glass ring'; scene.add(ring);
  ring.onBeforeRender = () => { ringMat.emissiveIntensity = 0.13 * (ctx.day?.night ?? 0); };
  const glass = new THREE.Mesh(new THREE.CircleGeometry(RI * EYE, 48).rotateX(-Math.PI / 2).translate(SKY.x, glassY - 0.01, SKY.z), new THREE.MeshStandardMaterial({ color: 0xdde8ee, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.16, depthWrite: false, envMapIntensity: 1.4 }));
  glass.name = 'skylight glass'; scene.add(glass);
  const came = new THREE.Mesh(new THREE.TorusGeometry(RI * EYE, 0.03, 6, 48).rotateX(Math.PI / 2).translate(SKY.x, glassY + 0.01, SKY.z), new THREE.MeshStandardMaterial({ color: 0x7d6543, roughness: 0.4, metalness: 1 })); came.name = 'skylight came'; scene.add(came);
  ctx.interact.push({ x: SKY.x, y: RH + 0.3, z: SKY.z, reach: 7.5, size: 2.4, label: () => 'look at the glass', act: () => window.houseUI?.toast?.(`${CAPTION.title}. ${CAPTION.kicker}. A ring that keeps making itself: the star makes the amber links, the links close round it, and where one breaks another mends it. Through the clear middle, a long way down, a candle.`, 14000) });
}
