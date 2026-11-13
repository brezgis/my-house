// The kitchen garden, north-west of the kitchen: loved and used, not
// manicured. An old picket fence, gravel paths with things seeding into
// them, eight weathered raised beds (tomatoes in wire cages, lettuces, runner
// beans up hazel poles, kale and chard, cabbages and leeks, carrots and
// strawberries, squash and pumpkins, herbs), a rain barrel with the hose
// left beside it, sunflowers along the south fence, old espaliered apples
// along the north, a glasshouse, compost bays and a wheelbarrow;
// through the gate the orchard and the beehives (hives.js).

import * as THREE from 'three';
import { PAINT, GLOW } from './tools.js';
import { buildHives } from './hives.js';

export const POT = { x0: 26, x1: 66, z0: -104, z1: -56, cx: 46, cz: -80 };

export function buildPotager(K) {
  const { G, F, r } = K, P = POT, G0 = { grain: 'long' };
  const fenceMat = PAINT.sage;

  // ---- Ground: gravel throughout, soil in the beds ----
  G.rect('gravel', P.x0, P.x1, P.z0, P.z1);
  G.ribbon('gravel', [[15, -50.5], [20, -53.2], [32, -53.5], [44, -53.6], [46, -56.5]], 5);
  G.rect('gravel', 9.5, 21.5, -58, -49.2);
  G.ribbon('gravel', [[46, -103], [46, -107.5]], 5);
  G.ribbon('flagstone', [[26.5, -80], [16, -80], [7, -80]], 4.2);

  // ---- Picket fence, with four openings ----
  const fence = (ax, az, bx, bz) => {
    const len = Math.hypot(bx - ax, bz - az), tx = (bx - ax) / len, tz = (bz - az) / len, along = Math.abs(tx) > 0.5;
    const n = Math.max(1, Math.round(len / 6));
    for (let i = 0; i <= n; i++) { const x = ax + (bx - ax) * i / n, z = az + (bz - az) * i / n; K.box(fenceMat, x - 0.17, x + 0.17, 0, 3.7, z - 0.17, z + 0.17); K.sphere(fenceMat, x, 3.9, z, 0.2, 1, 1); }
    for (const y of [0.7, 2.6]) along ? K.box(fenceMat, ax, bx, y, y + 0.22, az - 0.06, az + 0.06) : K.box(fenceMat, ax - 0.06, ax + 0.06, y, y + 0.22, az, bz);
    for (let d = 0.3; d < len - 0.2; d += 0.42) { const x = ax + tx * d, z = az + tz * d; along ? K.box(fenceMat, x - 0.12, x + 0.12, 0.25, 3.3, z - 0.035 + 0.1, z + 0.035 + 0.1) : K.box(fenceMat, x - 0.035 + 0.1, x + 0.035 + 0.1, 0.25, 3.3, z - 0.12, z + 0.12); K.lathe(fenceMat, x + (along ? 0 : 0.1), 3.3, z + (along ? 0.1 : 0), [[0.12, 0], [0.01, 0.18]], 4); }
    K.collide(Math.min(ax, bx) - 0.15, Math.max(ax, bx) + 0.15, Math.min(az, bz) - 0.15, Math.max(az, bz) + 0.15, 4);
  };
  fence(P.x0, P.z1, 43.5, P.z1); fence(48.5, P.z1, P.x1, P.z1);             // east, the entrance
  fence(P.x0, P.z0, 43.5, P.z0); fence(48.5, P.z0, P.x1, P.z0);             // west, to the glasshouse
  fence(P.x0, P.z0, P.x0, -82.5); fence(P.x0, -77.5, P.x0, P.z1);          // south, toward the lawn
  fence(P.x1, P.z0, P.x1, P.z1);                                              // north
  // Rose arch over the entrance
  {
    const z = P.z1, R = 2.7;
    for (const x of [43.3, 48.7]) { K.box(PAINT.iron, x - 0.09, x + 0.09, 0, 6.6, z - 0.09, z + 0.09); K.box(PAINT.iron, x - 0.09, x + 0.09, 0, 6.6, z - 1.3, z - 1.12); }
    for (const dz of [0, -1.2]) for (let i = 0; i < 12; i++) { const a0 = Math.PI * i / 12, a1 = Math.PI * (i + 1) / 12; K.tube(PAINT.iron, [46 + Math.cos(a0) * R, 6.6 + Math.sin(a0) * R * 0.7, z + dz], [46 + Math.cos(a1) * R, 6.6 + Math.sin(a1) * R * 0.7, z + dz], 0.06, 5); }
    for (let i = 0; i < 9; i++) { const a = Math.PI * (i + 0.5) / 9; F.add('rose', 46 + Math.cos(a) * R, z - 0.6, 0.55, { y: 5.2 + Math.sin(a) * R * 0.7, w: 2.6, h: 2.4 }); }
    for (const x of [43.3, 48.7]) for (let y = 0; y < 5; y += 1.7) F.add('rose', x, z - 0.6, 0.5, { y, w: 2.4, h: 2.6 });
  }

  // ---- Raised beds ----
  const bed = (bx0, bx1, bz0, bz1) => {
    for (const [a, b, c, d] of [[bx0, bx1, bz0, bz0 + 0.18], [bx0, bx1, bz1 - 0.18, bz1], [bx0, bx0 + 0.18, bz0, bz1], [bx1 - 0.18, bx1, bz0, bz1]]) K.box(PAINT.cedar, a, b, 0, 1.15, c, d, G0);
    K.box(PAINT.cedar, bx0 - 0.08, bx1 + 0.08, 1.15, 1.25, bz0 - 0.08, bz0 + 0.3, G0); K.box(PAINT.cedar, bx0 - 0.08, bx1 + 0.08, 1.15, 1.25, bz1 - 0.3, bz1 + 0.08, G0);
    K.box(PAINT.cedar, bx0 - 0.08, bx0 + 0.3, 1.15, 1.25, bz0, bz1, G0); K.box(PAINT.cedar, bx1 - 0.3, bx1 + 0.08, 1.15, 1.25, bz0, bz1, G0);
    G.rect('soil', bx0 + 0.18, bx1 - 0.18, bz0 + 0.18, bz1 - 0.18, { y: 1.02 });
    K.collide(bx0, bx1, bz0, bz1, 2.4);
  };
  const Y = 1.0;
  const A = { x: [32.7, 36.7], z: [-76.5, -63.3] }, A2 = { x: [39.1, 43.1], z: A.z };
  const B1 = { x: [48.9, 52.9], z: A.z }, B2 = { x: [55.3, 59.3], z: A.z };
  const C1 = { x: [32.7, 36.7], z: [-96.7, -83.5] }, C2 = { x: [39.1, 43.1], z: C1.z };
  const D1 = { x: [48.9, 52.9], z: C1.z }, D2 = { x: [55.3, 59.3], z: C1.z };
  for (const b of [A, A2, B1, B2, C1, C2, D1, D2]) bed(b.x[0], b.x[1], b.z[0], b.z[1]);
  const each = (b, cols, step, fn) => { for (let c = 0; c < cols; c++) for (let z = b.z[0] + step / 2 + 0.3; z < b.z[1] - 0.3; z += step) fn(b.x[0] + 0.5 + (b.x[1] - b.x[0] - 1) * (cols > 1 ? c / (cols - 1) : 0.5), z, c); };
  // A: tomatoes on stakes
  each(A, 2, 1.9, (x, z) => { for (const [y, rad] of [[Y + 1.2, 0.5], [Y + 2.6, 0.62], [Y + 4.0, 0.74]]) { const g = new THREE.TorusGeometry(rad, 0.02, 4, 14); g.rotateX(Math.PI / 2); g.translate(x, y, z); K.put(PAINT.iron, g); } for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + 0.4; K.tube(PAINT.iron, [x + Math.cos(a) * 0.4, Y, z + Math.sin(a) * 0.4], [x + Math.cos(a) * 0.76, Y + 4.2, z + Math.sin(a) * 0.76], 0.02, 3); } F.add('tomato', x, z, 1, { y: Y }); });
  // A2: lettuces, a checkerboard of green and red
  each(A2, 4, 1.05, (x, z, c) => F.add(((c + Math.round(z)) % 2) ? 'lettuceRed' : 'lettuce', x, z, 1.15, { y: Y }));
  // B1: runner beans up two hazel teepees, marigolds at their feet
  for (const tz of [-67.2, -73.0]) {
    const cx = 50.9, top = Y + 7.6;
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2, bx = cx + Math.cos(a) * 1.6, bz = tz + Math.sin(a) * 1.6; K.tube('c#6e5a40/1', [bx, Y, bz], [cx + Math.cos(a) * 0.15, top, tz + Math.sin(a) * 0.15], 0.05, 4); F.add('bean', cx + Math.cos(a) * 1.05, tz + Math.sin(a) * 1.05, 1, { y: Y, rot: a + Math.PI / 2, h: 6.4, tilt: 0 }); }
    K.tube('c#a8956c/1', [cx, top - 0.6, tz - 0.3], [cx, top - 0.6, tz + 0.3], 0.08, 5);
  }
  each({ x: B1.x, z: [-70.6, -69.2] }, 3, 1.2, (x, z) => F.add('marigold', x, z, 1, { y: Y }));
  F.row('marigold', 49.4, -63.8, 52.4, -63.8, 1.4, 1, { y: Y }); F.row('marigold', 49.4, -76.0, 52.4, -76.0, 1.4, 1, { y: Y });
  // B2: kale and rainbow chard
  each(B2, 3, 1.5, (x, z, c) => F.add((Math.round(z / 1.5) % 2) ? 'kale' : 'chard', x, z, 1, { y: Y }));
  // C1: cabbages, then leeks
  each({ x: C1.x, z: [-96.7, -89] }, 3, 1.35, (x, z) => F.add('cabbage', x, z, 1.25, { y: Y }));
  each({ x: C1.x, z: [-88.6, -83.5] }, 5, 0.75, (x, z) => F.add('leek', x, z, 1, { y: Y }));
  // C2: carrots in rows, strawberries along the edges
  each({ x: [39.5, 42.7], z: [-95.5, -84.5] }, 4, 0.7, (x, z) => F.add('carrot', x, z, 0.9, { y: Y }));
  F.row('strawberry', 39.5, -96.2, 39.5, -84, 0.9, 1, { y: Y }); F.row('strawberry', 42.7, -96.2, 42.7, -84, 0.9, 1, { y: Y });
  // D1: squash and pumpkins sprawling over the edge
  each(D1, 2, 2.6, (x, z) => F.add('squash', x, z, 1.4, { y: Y }));
  const pumpkin = (x, y, z, s, col) => {
    const prof = []; for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + (i / 10) * Math.PI; prof.push([Math.max(0.02, Math.cos(a)), 0.75 * (Math.sin(a) + 1) / 2 * 1.6]); }
    const g = new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(a, b)), 20), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const ang = Math.atan2(p.getZ(i), p.getX(i)), k = 1 - 0.07 * Math.abs(Math.cos(ang * 5)); p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); }
    g.computeVertexNormals(); g.scale(s, s, s); g.translate(x, y, z); K.put(col, g);
    K.cyl('c#5a5a2a/1', x, y + 1.15 * s, y + 1.45 * s, z, 0.07 * s, 0.05 * s, 5);
  };
  pumpkin(50.2, Y, -86.0, 0.8, 'c#d9772a/0.7'); pumpkin(51.9, Y, -88.6, 0.6, 'c#e08a2e/0.7'); pumpkin(49.8, Y, -91.6, 0.55, 'c#d4c08a/0.7'); pumpkin(53.6, 0, -90.4, 0.75, 'c#d9772a/0.7'); pumpkin(51.4, Y, -94.6, 0.45, 'c#3d6a4a/0.7');
  // D2: herbs, nasturtiums (marigolds), parsley
  each(D2, 3, 1.8, (x, z, c) => F.add(c === 1 ? 'herbs' : (Math.round(z) % 2 ? 'marigold' : 'herbs'), x, z, 1.1, { y: Y }));

  // ---- Borders inside the fence ----
  // South: a cutting garden, sunflowers at the back
  for (const [za, zb] of [[-101, -83], [-77, -59.5]]) {
    F.row('sunflower', 26.9, za, 26.9, zb, 2.4, 1);
    F.fill([[27.6, za], [29.2, za], [29.2, zb], [27.6, zb]], [['cosmos', 3, 0.9], ['spires', 2, 0.8], ['coneflower', 3, 0.9], ['marigold', 1, 1]], 1.6);
  }
  // North: espaliered apples on the fence, rhubarb and strawberries
  for (let z = -100; z < -60; z += 9.5) {
    const x = P.x1 - 0.5;
    K.cyl(PAINT.bark, x, 0, 6.4, z, 0.16, 0.1, 6);
    for (const y of [1.8, 3.6, 5.4]) for (const s of [-1, 1]) {
      K.tube(PAINT.bark, [x, y - 0.3, z], [x, y, z + s * 0.6], 0.09, 5); K.tube(PAINT.bark, [x, y, z + s * 0.6], [x, y, z + s * 4.3], 0.07, 5);
      for (let d = 0.8; d < 4.3; d += 0.9) { F.add('rose', x - 0.25, z + s * d, 0.32, { y: y - 0.55, w: 1.5, h: 1.3, tint: 0.95 }); if (r() < 0.55) K.sphere(r() < 0.8 ? 'c#b82a22/0.45' : 'c#d8c040/0.45', x - 0.35, y - 0.25 - r() * 0.3, z + s * d + (r() - 0.5) * 0.4, 0.17, 1, 1); }
    }
  }
  for (const [za, zb] of [[-101, -83.5], [-76.5, -59.5]]) F.fill([[62.8, za], [64.6, za], [64.6, zb], [62.8, zb]], [['chard', 1, 1.6], ['strawberry', 3, 1], ['herbs', 1, 1]], 1.6);
  // East: roses, lavender and catmint either side of the arch
  for (const [xa, xb] of [[27, 42.5], [49.5, 65]]) { F.row('lavender', xa, -58.7, xb, -58.7, 1.5, 0.9); F.row('rose', xa + 1, -57.0, xb - 1, -57.0, 3.2, 0.9); F.drift('catmint', (xa + xb) / 2, -57.8, 3, 0.8, 3, 1); }
  // West: herbs and marigolds
  for (const [xa, xb] of [[27, 42.5], [49.5, 65]]) { F.fill([[xa, -103.6], [xb, -103.6], [xb, -101], [xa, -101]], [['herbs', 3, 1.1], ['marigold', 2, 1], ['lavender', 2, 0.9]], 1.4); }

  // ---- At the crossing: an old rain barrel and the hose, left where it was dropped ----
  {
    const x = P.cx + 1.6, z = P.cz + 1.6;
    K.lathe('c#6e5e4c/1', x, 0, z, [[0.01, 0], [1.0, 0], [1.12, 0.6], [1.18, 1.5], [1.12, 2.4], [1.02, 3.0], [0.95, 3.0], [0.01, 2.9]], 16);
    for (const y of [0.35, 1.5, 2.65]) K.cyl(PAINT.iron, x, y, y + 0.12, z, 1.13 + (y === 1.5 ? 0.07 : 0), 1.13 + (y === 1.5 ? 0.07 : 0), 16);
    K.cyl('c#22302a/0.1', x, 2.86, 2.9, z, 0.92, 0.92, 16);
    K.collide(x - 1.2, x + 1.2, z - 1.2, z + 1.2, 4);
    const hose = []; for (let i = 0; i <= 90; i++) { const t = i / 90, a = t * Math.PI * 7, rr = 0.9 + t * 0.6; hose.push([x - 2.4 + Math.cos(a) * rr, 0.14 + 0.05 * Math.sin(t * 40), z - 1.0 + Math.sin(a) * rr]); }
    for (let i = 0; i < 40; i++) { const t = i / 40; hose.push([x - 2.4 + 1.5 - t * 4, 0.12, z - 1.0 - t * 9 + Math.sin(t * 6) * 1.5]); }
    for (let i = 0; i < hose.length - 1; i++) K.tube('c#3d6b45/0.6', hose[i], hose[i + 1], 0.07, 5);
    K.model('metal_jug', x + 1.6, z - 1.2, 0.4);
  }
  // A bench at the north end of the cross path, looking back down it
  K.bench(P.x1 - 2.4, P.cz, -Math.PI / 2);
  K.seat(P.x1 - 2.8, 1.6, P.cz, Math.PI / 2, 'sit in the potager');

  for (let i = 0; i < 30; i++) r();      // (a scarecrow stood here once; these keep everything sown after it where it was)

  // ---- Self-seeded things in the gravel: it is loved, not manicured ----
  for (let i = 0; i < 70; i++) { const x = P.x0 + 3 + r() * (P.x1 - P.x0 - 6), z = P.z0 + 3 + r() * (P.z1 - P.z0 - 6), onPath = Math.abs(x - P.cx) < 2.6 || Math.abs(z - P.cz) < 2.6 || x < 32.3 || x > 59.7 || z > -62.3 || z < -97.7; if (onPath && Math.abs(x - P.cx) > 1.2 && Math.abs(z - P.cz) > 1.2) F.add(r() < 0.5 ? 'wildflowers' : 'grass', x, z, 0.35 + r() * 0.3); }
  // ---- A wheelbarrow by the compost, half full of weeds ----
  {
    const x = 55, z = -110.5, a = 0.5, c = Math.cos(a), s = Math.sin(a), P2 = (dx, dy, dz) => [x + dx * c - dz * s, dy, z + dx * s + dz * c];
    const tray = new THREE.CylinderGeometry(1.25, 0.8, 0.9, 4, 1, true); tray.rotateY(Math.PI / 4); tray.scale(1.3, 1, 0.85); tray.rotateY(a); tray.translate(x, 1.35, z); K.put('c#4f6a5e/0.7', tray);
    const bottom = new THREE.BoxGeometry(1.4, 0.05, 0.95); bottom.rotateY(a); bottom.translate(x, 0.92, z); K.put('c#4f6a5e/0.7', bottom);
    F.drift('grass', x, z, 0.6, 0.4, 3, 0.45, { y: 1.3 });
    K.tube(PAINT.iron, P2(-1.8, 1.1, -0.45), P2(1.5, 0.45, -0.4), 0.05, 5); K.tube(PAINT.iron, P2(-1.8, 1.1, 0.45), P2(1.5, 0.45, 0.4), 0.05, 5);
    K.tube(PAINT.iron, P2(-0.8, 0.9, -0.45), P2(-0.9, 0, -0.45), 0.04, 4); K.tube(PAINT.iron, P2(-0.8, 0.9, 0.45), P2(-0.9, 0, 0.45), 0.04, 4);
    const wheel = new THREE.TorusGeometry(0.42, 0.1, 6, 16); wheel.rotateY(a + Math.PI / 2); const [wx, , wz] = P2(1.55, 0, 0); wheel.translate(wx, 0.5, wz); K.put('c#202020/0.9', wheel);
    K.collide(x - 1.8, x + 1.8, z - 1.6, z + 1.6, 2.5);
  }
  // ---- Tools and small things ----
  K.model('watering_can_metal_01', 44.6, -65.2, 0.7, { scale: 1.35 });
  K.model('trowel_01', 42.7, -70.5, 1.2, { y: 1.25 });
  K.model('garden_gloves_01', 42.6, -72.5, 0.4, { y: 1.25 });
  K.model('rusted_spade_01', 41.1, -90.1, 0.35, { y: Y - 0.5, scale: 1.05 });
  K.robinOn = { x: 41.1, y: Y + 3.1, z: -90.1 };
  K.rabbitAt = { x: 37.8, z: -70.4 };

  // ---- The glasshouse ----
  {
    const gx0 = 38, gx1 = 54, gz0 = -122, gz1 = -108, eave = 7.2, ridge = 11.2, cx = 46, frame = PAINT.white;
    K.box('brick', gx0, gx1, 0, 1.5, gz0, gz0 + 0.5); K.box('brick', gx0, gx0 + 0.5, 0, 1.5, gz0, gz1); K.box('brick', gx1 - 0.5, gx1, 0, 1.5, gz0, gz1);
    K.box('brick', gx0, cx - 1.6, 0, 1.5, gz1 - 0.5, gz1); K.box('brick', cx + 1.6, gx1, 0, 1.5, gz1 - 0.5, gz1);
    K.box('pavers', gx0 + 0.5, gx1 - 0.5, 0, 0.1, gz0 + 0.5, gz1, {});
    G.rect('gravel', cx - 1.6, cx + 1.6, gz1 - 0.5, gz1 + 0.2, { y: 0.12 });
    // walls: posts, glazing bars, glass
    for (let x = gx0; x <= gx1 + 0.01; x += 2) for (const z of [gz0 + 0.25, gz1 - 0.25]) { if (z > gz1 - 1 && Math.abs(x - cx) < 1.7) continue; K.box(frame, x - 0.08, x + 0.08, 1.5, eave, z - 0.08, z + 0.08); }
    for (let z = gz0; z <= gz1 + 0.01; z += 2) for (const x of [gx0 + 0.25, gx1 - 0.25]) K.box(frame, x - 0.08, x + 0.08, 1.5, eave, z - 0.08, z + 0.08);
    K.box(frame, gx0, gx1, eave - 0.2, eave, gz0, gz0 + 0.5); K.box(frame, gx0, gx0 + 0.5, eave - 0.2, eave, gz0, gz1); K.box(frame, gx1 - 0.5, gx1, eave - 0.2, eave, gz0, gz1); K.box(frame, gx0, gx1, eave - 0.2, eave, gz1 - 0.5, gz1);
    for (const y of [1.5, 4.3]) { K.box(frame, gx0, gx1, y, y + 0.12, gz0 + 0.15, gz0 + 0.35); K.box(frame, gx0 + 0.15, gx0 + 0.35, y, y + 0.12, gz0, gz1); K.box(frame, gx1 - 0.35, gx1 - 0.15, y, y + 0.12, gz0, gz1); K.box(frame, gx0, cx - 1.6, y, y + 0.12, gz1 - 0.35, gz1 - 0.15); K.box(frame, cx + 1.6, gx1, y, y + 0.12, gz1 - 0.35, gz1 - 0.15); }
    K.box('glass', gx0 + 0.2, gx1 - 0.2, 1.6, eave - 0.2, gz0 + 0.22, gz0 + 0.28); K.box('glass', gx0 + 0.22, gx0 + 0.28, 1.6, eave - 0.2, gz0, gz1); K.box('glass', gx1 - 0.28, gx1 - 0.22, 1.6, eave - 0.2, gz0, gz1);
    K.box('glass', gx0, cx - 1.6, 1.6, eave - 0.2, gz1 - 0.28, gz1 - 0.22); K.box('glass', cx + 1.6, gx1, 1.6, eave - 0.2, gz1 - 0.28, gz1 - 0.22);
    K.box(frame, cx - 1.7, cx - 1.5, 0, 7.0, gz1 - 0.3, gz1 - 0.1); K.box(frame, cx + 1.5, cx + 1.7, 0, 7.0, gz1 - 0.3, gz1 - 0.1); K.box(frame, cx - 1.7, cx + 1.7, 6.8, 7.0, gz1 - 0.3, gz1 - 0.1);
    // the open door, swung back against the glass
    K.box(frame, cx + 1.7, cx + 4.6, 0.1, 6.8, gz1 + 0.05, gz1 + 0.2); K.box('glass', cx + 1.9, cx + 4.4, 1.0, 6.5, gz1 + 0.1, gz1 + 0.15);
    // gables and the roof
    for (const z of [gz0 + 0.25, gz1 - 0.25]) {
      const g = new THREE.BufferGeometry(), pos = [gx0, eave, z, gx1, eave, z, cx, ridge, z];
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0.5, 1], 2)); g.computeVertexNormals(); K.put('glass', g);
      K.beam(frame, [gx0, eave, z], [cx, ridge, z], 0.18, 0.18); K.beam(frame, [gx1, eave, z], [cx, ridge, z], 0.18, 0.18);
    }
    K.box(frame, cx - 0.15, cx + 0.15, ridge - 0.1, ridge + 0.2, gz0, gz1);
    for (const s of [-1, 1]) {
      const ex = s < 0 ? gx0 : gx1, len = Math.hypot(cx - ex, ridge - eave), ang = Math.atan2(ridge - eave, Math.abs(cx - ex));
      const roof = new THREE.BoxGeometry(len, 0.05, gz1 - gz0 + 0.6); roof.rotateZ(s < 0 ? ang : -ang); roof.translate((cx + ex) / 2, (ridge + eave) / 2 + 0.03, (gz0 + gz1) / 2);      // the glazing bars stand a clear quarter inch proud of the glass K.put('glass', roof);
      for (let z = gz0; z <= gz1 + 0.01; z += 2) K.beam(frame, [ex, eave, z], [cx, ridge, z], 0.12, 0.16);
      for (let k = 0; k < 9; k++) K.sphere(frame, cx, ridge + 0.35, gz0 + 0.5 + k * 1.6, 0.12, 1, 1);
    }
    // staging and pots of seedlings, a potting bench at the back
    for (const [sx0, sx1] of [[gx0 + 0.5, gx0 + 3], [gx1 - 3, gx1 - 0.5]]) {
      K.box('c#9a7a58/0.9', sx0, sx1, 2.75, 2.9, gz0 + 1, gz1 - 1.5, G0);
      for (const z of [gz0 + 1.2, gz1 - 1.7]) for (const x of [sx0 + 0.2, sx1 - 0.2]) K.box('c#9a7a58/0.9', x - 0.08, x + 0.08, 0, 2.75, z - 0.08, z + 0.08);
      K.box('c#9a7a58/0.9', sx0, sx1, 0.6, 0.7, gz0 + 1, gz1 - 1.5, G0);
      K.collide(sx0, sx1, gz0 + 1, gz1 - 1.5, 3.2);
      for (let z = gz0 + 1.6; z < gz1 - 1.8; z += 1.15) { const x = (sx0 + sx1) / 2 + (r() - 0.5) * 0.8; K.pot(x, 2.9, z, 0.38, [[K.pick(['herbs', 'marigold', 'lettuce', 'strawberry', 'catmint', 'tomato']), K.pick([1.1, 1.3])]], { collide: false }); }
    }
    K.box('c#9a7a58/0.9', cx - 3, cx + 3, 3.0, 3.2, gz0 + 0.6, gz0 + 2.4, G0);
    for (const x of [cx - 2.8, cx + 2.8]) K.box('c#9a7a58/0.9', x - 0.1, x + 0.1, 0, 3.0, gz0 + 0.8, gz0 + 2.2);
    K.collide(cx - 3, cx + 3, gz0 + 0.5, gz0 + 2.4, 3.4);
    K.model('seeding_tray_01', cx - 1.2, gz0 + 1.5, 0.1, { y: 3.2, scale: 1.4 });
    K.model('planter_box_02', cx + 1.6, gz0 + 1.6, 0, { y: 3.2, scale: 0.55 }); F.drift('herbs', cx + 1.6, gz0 + 1.6, 0.8, 0.2, 4, 0.5, { y: 3.65 });
    K.model('wooden_lantern_01', cx + 0.2, gz0 + 1.3, 0.3, { y: 3.2, scale: 0.9 }); K.lamp(cx, 4.4, gz0 + 1.6, 0.3);
    K.pot(gx0 + 1.4, 0.1, gz1 - 1.1, 1.3, [['tomato', 0.9]]); K.pot(gx1 - 1.4, 0.1, gz1 - 1.1, 1.3, [['fern', 0.9]]);
    // walls are solid; the door is open
    K.collide(gx0, gx1, gz0, gz0 + 0.5, 8); K.collide(gx0, gx0 + 0.5, gz0, gz1, 8); K.collide(gx1 - 0.5, gx1, gz0, gz1, 8);
    K.collide(gx0, cx - 1.6, gz1 - 0.5, gz1, 8); K.collide(cx + 1.6, gx1, gz1 - 0.5, gz1, 8);
    K.glasshouse = { x: cx, z: (gz0 + gz1) / 2 };
  }

  // ---- Compost bays ----
  {
    const z0 = -114, z1 = -108;
    for (let i = 0; i < 3; i++) {
      const x0 = 57 + i * 3.2, x1 = x0 + 3;
      for (let y = 0.1; y < 3; y += 0.55) { K.box('timber', x0 + 0.15, x1 - 0.15, y, y + 0.42, z0, z0 + 0.15, G0); K.box('timber', x0, x0 + 0.15, y, y + 0.42, z0, z1, G0); K.box('timber', x1 - 0.15, x1, y, y + 0.42, z0, z1, G0); }
      K.sphere('soil', (x0 + x1) / 2, 0.2, (z0 + z1) / 2 - 0.4, 1.4, 0.5 + i * 0.25, 1);
    }
    K.collide(57, 66.6, z0, z1, 4);
  }

  // ---- The orchard and the beehives, through the gate and north ----
  {
    const ox0 = 70, ox1 = 98, oz0 = -118, oz1 = -56;
    G.rect('meadow', ox0, ox1, oz0, oz1);
    const path = [[48, -106], [62, -106.5], [72, -104], [82, -108], [88, -113]];
    G.ribbon('lawn', path, 4.5, { wobble: 0.15 });
    G.ribbon('lawn', [[72, -104], [80, -92], [86, -76], [84, -60], [76, -50]], 4.2, { wobble: 0.15 });
    const curve = new THREE.CatmullRomCurve3([...path, [80, -92]].map(([x, z]) => new THREE.Vector3(x, 0, z)));
    const near = []; for (const pts of [path, [[72, -104], [80, -92], [86, -76], [84, -60], [76, -50]]]) { const c = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z))); for (let i = 0; i <= 80; i++) near.push(c.getPointAt(i / 80)); }
    const clear = (x, z, d) => near.every(p => Math.hypot(p.x - x, p.z - z) > d);
    for (const x of [76, 86]) for (const z of [-64, -79, -94, -109]) {
      const px = x + (r() - 0.5) * 3, pz = z + (r() - 0.5) * 3;
      if (!clear(px, pz, 4)) continue;
      K.trees.push({ kind: 'apple', x: px, z: pz, seed: Math.round(px * 7 - pz), height: 14 + r() * 5 });
    }
    for (let x = ox0 + 1; x < ox1; x += 3.1) for (let z = oz0 + 1; z < oz1; z += 3.1) {
      const px = x + (r() - 0.5) * 2.8, pz = z + (r() - 0.5) * 2.8;
      if (!clear(px, pz, 3.2)) continue;
      if (Math.hypot(px - 95, pz + 101.5) < 8) continue;
      F.add(r() < 0.55 ? 'grass' : 'wildflowers', px, pz, 0.75 + r() * 0.4);
    }
    // the beehives, the honesty stall and the skep (garden/hives.js)
    buildHives(K);
    F.drift('lavender', 89.5, -97.5, 2.5, 2, 10, 1); F.drift('catmint', 92, -88, 2, 2, 4, 1); F.drift('wildflowers', 95, -113, 3, 2, 6, 1);      // (as many as ever, so the plants sown after these stay put)
    K.model('wooden_picnic_table', 90, -66, 0.25, { collide: true }); K.seat(90.4, 1.45, -63.6, 0.25 + Math.PI, 'sit at the orchard table');
  }
}
