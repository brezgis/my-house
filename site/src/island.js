// The ground: a floating island. Mown grass out to the barrier where the walker stops (0.965 of
// the outline, walk.js), a soft shoulder of rough grass a few feet wide rolling over, a ragged
// lip of overhanging sod fringed with long grass and trailing roots, earth and stone below it,
// and then rock tapering down to a point in the clouds, with clumps of grass and a few small
// trees clinging under the lip.
//
// Three draws: the land (lawn, rough grass, the sod lip), the fringe (long grass over the edge,
// roots, clumps of grass on the cliff, a few little trees) and the cliff (earth, stone strata,
// rock). They are plain MeshStandardMaterials with a small shader change: the land blends grass, rough grass and
// earth by weights painted on its vertices; the fringe cuts its blades of grass out of plain
// strips in the shader; the cliff is textured from the world position on all three axes
// (triplanar), so nothing is stretched down the steep faces, and banded into strata. No new
// textures (grass, meadow, soil and flagstone are shared with materials.js) and no work per frame.
//
// Everything is measured outward from the barrier curve along its (smoothed) normal, so the
// shoulder is the same few feet wide on the tongues and in the bays. The land is level (y 0.03,
// as it always was) to BASE feet past the barrier; if the garden has planted anything further
// out than that (the chapel's meadow does), the level ground is let out under it once the
// garden is up (fit, below).

import * as THREE from 'three';

const TAU = Math.PI * 2;

export function buildIsland({ ISLAND, outlineAt, materials, outdoors }) {
  const C = { x: ISLAND.x, z: ISLAND.z };
  const R = a => (ISLAND.outline ? outlineAt(a) : ISLAND.r) * 0.965;      // the barrier, radially (as walker.rim in main.js)

  // ---- the barrier curve, resampled at equal steps along it, with smoothed outward normals ----
  const M = 2048, dense = [];
  for (let k = 0; k < M; k++) { const a = (k / M) * TAU, r = R(a); dense.push([C.x + Math.cos(a) * r, C.z + Math.sin(a) * r]); }
  const cum = [0]; for (let k = 1; k <= M; k++) cum.push(cum[k - 1] + Math.hypot(dense[k % M][0] - dense[k - 1][0], dense[k % M][1] - dense[k - 1][1]));
  const L = cum[M], N = Math.max(96, Math.round(L / 3.4 / 2) * 2);      // a step about every 3.4 ft along the edge
  const at = s => { s = ((s % L) + L) % L; let lo = 0, hi = M; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= s) lo = m; else hi = m; } const f = (s - cum[lo]) / (cum[lo + 1] - cum[lo]), p = dense[lo], q = dense[(lo + 1) % M]; return [p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f]; };
  const B = [], Nrm = [];
  for (let i = 0; i < N; i++) {
    const s = (i / N) * L, b = at(s); B.push(b);
    // the normal comes from the chord across 9 ft each way: the bays of the outline are tight
    // (6 ft in places), and offsetting out along the true normal would fold the shoulder there
    const p = at(s - 9), q = at(s + 9), l = Math.hypot(q[0] - p[0], q[1] - p[1]); let nx = (q[1] - p[1]) / l, nz = -(q[0] - p[0]) / l;
    if (nx * (b[0] - C.x) + nz * (b[1] - C.z) < 0) { nx = -nx; nz = -nz; }
    Nrm.push([nx, nz]);
  }

  // ---- variation round the edge, periodic so there is no seam (u = 0..1 once round) ----
  const wave = (u, terms) => terms.reduce((v, [amp, len, ph]) => v + amp * Math.sin(TAU * Math.max(1, Math.round(L / len)) * u + ph), 0);
  const U = i => i / N;
  const lipOut = i => wave(U(i), [[0.45, 31, 1.3], [0.3, 13, 4.1], [0.2, 7.3, 2.2]]);                              // the lip in and out, feet
  const width = i => 5 + wave(U(i), [[0.8, 47, 0.4], [0.3, 17, 2.9]]);                                              // the shoulder, feet
  const drop = i => 1.9 + wave(U(i), [[0.45, 39, 5.1], [0.2, 11, 0.6]]);                                            // how far it rolls down
  const bite = i => Math.min(1, Math.max(0, wave(U(i), [[0.6, 53, 2.0], [0.4, 19, 0.3]]) - 0.4) / 0.35);           // 0..1 where the sod has broken away
  const ledge = i => Math.max(0, wave(U(i), [[0.6, 43, 3.3], [0.4, 15, 1.1]]) - 0.15) * 3.2;                       // stone jutting out below the lip, feet
  const grain = (i, k) => wave(U(i), [[0.5, 19 + k * 3, k * 1.7], [0.35, 8.1 + k, k * 2.9 + 1], [0.25, 4.3 + k * 0.4, k * 0.7]]);

  // ---- materials and meshes (the geometry is made by build, and made again by fit) ----
  const tint = { grass: materials.grass.color.clone(), meadow: materials.meadow.color.clone(), soil: materials.soilbed.color.clone().multiplyScalar(1.25), rock: new THREE.Color().setRGB(1.25, 1.12, 0.95) };      // the flagstone photo is dark: lifted toward a pale sandstone
  const landMat = materials.grass.clone(); landMat.vertexColors = true; landMat.color.set(0xffffff);
  const lipMat = landMat.clone(); lipMat.side = THREE.DoubleSide;
  const cliffMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
  patchLand(landMat, materials, tint, false); patchLand(lipMat, materials, tint, true); patchCliff(cliffMat, materials, tint);
  const mesh = (mat, name) => { const m = new THREE.Mesh(new THREE.BufferGeometry(), mat); m.name = name; m.userData.cat = 'island'; m.matrixAutoUpdate = false; outdoors.add(m); return m; };
  const land = mesh(landMat, 'island-land'), lip = mesh(lipMat, 'island-fringe'), cliff = mesh(cliffMat, 'island-cliff');
  land.receiveShadow = lip.receiveShadow = true;

  function build(flat) {
    const P = (i, d, y) => [B[i][0] + Nrm[i][0] * d, y, B[i][1] + Nrm[i][1] * d];
    const out = i => Nrm[i];
    // land rings outward: [offset past the barrier, height, rough-grass weight, earth weight, colour]
    const landRing = (k, i) => {
      const f = flat[i], b = bite(i), W = width(i) - b * 1.6, D = drop(i), lo = lipOut(i);
      const rough = THREE.MathUtils.clamp(0.55 + 0.3 * grain(i, 1), 0, 1), dry = 0.9 + 0.1 * grain(i, 2);
      switch (k) {
        case 0: return [-7, 0.03, 0, 0, [1, 1, 1]];
        case 1: return [f, 0.03, rough, 0, [1, 1, 1]];                                                                // level to here
        case 2: return [f + W * 0.36, 0.03 - D * 0.13, Math.min(1, rough + 0.3), 0, [dry, dry, dry * 0.97]];          // the shoulder
        case 3: return [f + W * 0.7, 0.03 - D * 0.49, 1, b * 0.55, [dry, dry, dry * 0.95]];
        case 4: return [Math.min(f + W + lo * 0.5, f + W + 0.25 + lo), 0.03 - D, 1, 0.2 + b * 0.75, [0.92, 0.9, 0.82]];
        case 5: return [f + W + 0.5 + lo, -D - 0.35 - b * 0.3, 0.6 - b * 0.5, 0.45 + b * 0.5, [0.8, 0.76, 0.66]];     // the rounded nose of the sod
        case 6: return [f + W + 0.3 + lo, -D - 1.15 - b * 0.3, 0, 1, [0.5, 0.42, 0.36]];                               // its front: peat, dark
        default: return [f + W - 0.55 + lo, -D - 1.45 - b * 0.3, 0, 1, [0.32, 0.27, 0.23]];                           // and its underside, tucked back
      }
    };

    // ---- the land: a fan in the middle, then rings out over the shoulder and round the lip ----
    const lp = [], lc = [], lw = [], li = [], LR = 8;
    for (let k = 0; k < LR; k++) for (let i = 0; i < N; i++) { const [d, y, wr, we, col] = landRing(k, i); lp.push(...P(i, d, y)); lc.push(...col); lw.push(wr, we); }
    const centre = lp.length / 3; lp.push(C.x, 0.03, C.z); lc.push(1, 1, 1); lw.push(0, 0);
    for (let i = 0; i < N; i++) li.push(centre, (i + 1) % N, i);
    strips(li, 0, LR, N);
    const luv = []; for (let v = 0; v < lp.length / 3; v++) luv.push(lp[v * 3], lp[v * 3 + 2]);      // the grass lies flat (the steep part of the lip is earth)

    // ---- the cliff: earth under the sod, a stone ledge, then rock eased in toward a point ----
    const cp = [], cc = [], cw = [], ci = [], cr = [];
    for (let i = 0; i < N; i++) {
      const f = flat[i], b = bite(i), W = width(i) - b * 1.6, D = drop(i), lo = lipOut(i), r0 = landRing(LR - 1, i);
      cr.push([
        [P(i, r0[0], r0[1]), 0, 0.4],
        [P(i, f + W - 0.25 + lo * 0.6 + 0.35 * grain(i, 3), -D - 5 - 0.6 * grain(i, 4)), 0.08, 0.62],
        [P(i, f + W + 0.2 + ledge(i) + 0.5 * grain(i, 5), -D - 9 - 1.2 * grain(i, 6)), 0.6, 0.8],
        [P(i, f + W + 0.3 + ledge(i) * 0.5 + 0.9 * grain(i, 7), -D - 17 - 1.5 * grain(i, 8)), 1, 0.92],
      ]);
    }
    const ER = cr[0].length;
    for (let k = 0; k < ER; k++) for (let i = 0; i < N; i++) { const [p, w, ao] = cr[i][k]; cp.push(...p); cc.push(ao, ao * 0.97, ao * 0.94); cw.push(w); }
    strips(ci, 0, ER, N);
    // rock: every other column from here down, its shape eased toward a rounder one as it goes
    // (the outline's tongues would otherwise hang down as deep flutes)
    const H = N / 2, top = (ER - 1) * N, rad = [], ang = [];
    for (let j = 0; j < H; j++) { const p = cr[j * 2][ER - 1][0]; rad.push(Math.hypot(p[0] - C.x, p[2] - C.z)); ang.push(Math.atan2(p[2] - C.z, p[0] - C.x)); }
    const sw = Math.round(H / 5), round = rad.map((_, j) => { let s = 0; for (let q = -sw; q <= sw; q++) s += rad[(j + q + H) % H]; return s / (2 * sw + 1); });
    const levels = [[0.94, -38, 0.45, 2.2], [0.8, -76, 0.7, 3.5], [0.6, -122, 0.82, 4.5], [0.37, -172, 0.9, 4], [0.14, -222, 0.95, 2]];
    let prev = -1;
    levels.forEach(([k, y, ease, amp], n) => {
      const base = cp.length / 3;
      for (let j = 0; j < H; j++) {
        const r = k * THREE.MathUtils.lerp(rad[j], round[j], ease) + amp * grain(j * 2, 9 + n) + (n % 2 ? -0.2 : 0.2) * amp;
        cp.push(C.x + Math.cos(ang[j]) * r, y + amp * 1.5 * grain(j * 2, 20 + n), C.z + Math.sin(ang[j]) * r);
        const tone = 0.82 + 0.12 * grain(j * 2, 30 + n); cc.push(tone, tone * 0.98, tone * 0.95); cw.push(1);
      }
      if (prev < 0) for (let j = 0; j < H; j++) {      // from the full ring above to the half ring below: three triangles a pair
        const a = top + j * 2, b = a + 1, c = top + (j * 2 + 2) % N, lA = base + j, lB = base + (j + 1) % H;
        ci.push(a, b, lA, b, c, lB, b, lB, lA);
      } else strips(ci, prev, 2, H);
      prev = base;
    });
    const tip = cp.length / 3; cp.push(C.x + 6, -262, C.z - 4); cc.push(0.8, 0.78, 0.75); cw.push(1);
    for (let j = 0; j < H; j++) ci.push(prev + j, prev + (j + 1) % H, tip);

    // ---- the fringe: long grass on the lip and hanging over it, roots, clumps, little trees ----
    // pf: for the grass strips (u feet along, 1 + v up the blade), cut into blades in the shader
    const pp = [], pc = [], pw = [], pf = [], pn = [], pi = [];
    const V = (p, c, w, f, n) => { pp.push(...p); pc.push(...c); pw.push(...w); pf.push(...f); pn.push(...n); return pp.length / 3 - 1; };
    const norm = (x, y, z) => { const l = Math.hypot(x, y, z); return [x / l, y / l, z / l]; };
    const R0 = (() => { let s = 11; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();      // the same every build
    const lerpRing = (i, k0, k1, t) => { const a = landRing(k0, i), b = landRing(k1, i); return P(i, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t); };
    const fringe = (root, tipOf, col0, col1, u0) => {      // a strip once round, N + 1 columns so its u runs on without a jump
      let u = u0, s = pp.length / 3, last = null;
      for (let c = 0; c <= N; c++) {
        const i = c % N, a = root(i), t = tipOf(i, a), [ox, oz] = out(i), nrm = norm(ox * 0.4, 1, oz * 0.4);
        if (last) u += Math.hypot(a[0] - last[0], a[2] - last[2]); last = a;
        V(a, col0, [1, 0], [u, 1], nrm); V(t, col1, [1, 0], [u, 2], nrm);
      }
      for (let c = 0; c < N; c++) { const a = s + c * 2; pi.push(a, a + 2, a + 1, a + 2, a + 3, a + 1); }
    };
    // standing up from the nose and leaning out over the edge (shorter where the sod is torn)
    fringe(i => { const p = lerpRing(i, 4, 5, 0.35); p[1] -= 0.15; return p; },
      (i, a) => { const h = (1.1 + 0.35 * grain(i, 11)) * (1 - 0.8 * bite(i)), l = 0.35 + 0.25 * grain(i, 12); return [a[0] + out(i)[0] * l, a[1] + h, a[2] + out(i)[1] * l]; },
      [0.55, 0.6, 0.4], [1.02, 1, 0.72], 0);
    // and hanging down over the front of the lip
    fringe(i => { const p = lerpRing(i, 5, 6, 0.1); return [p[0] - out(i)[0] * 0.05, p[1] + 0.1, p[2] - out(i)[1] * 0.05]; },
      (i, a) => { const h = (0.9 + 0.45 * grain(i, 13)) * (1 - 0.5 * bite(i)); return [a[0] + out(i)[0] * 0.35, a[1] - h, a[2] + out(i)[1] * 0.35]; },
      [0.6, 0.62, 0.42], [0.85, 0.82, 0.55], 5000);
    // roots trailing from under the sod: thin strips, longer where it has broken away
    for (let i = 0; i < N; i++) {
      if (R0() < 0.45) continue;
      const r = landRing(7, i), a = P(i, r[0] + 0.25, r[1] + 0.05), [ox, oz] = out(i), tx = -oz, tz = ox;
      const len = 1.8 + R0() * 4 + bite(i) * 2.5, hw = 0.06 + R0() * 0.07, sway = (R0() - 0.5) * 0.9, b = [a[0] + ox * 0.45 + tx * sway, a[1] - len, a[2] + oz * 0.45 + tz * sway];
      const col = [0.78, 0.66, 0.52], w = [0, 1], f = [0, 0], n = norm(ox, 0.15, oz);
      const s = V([a[0] - tx * hw, a[1], a[2] - tz * hw], col, w, f, n); V([a[0] + tx * hw, a[1], a[2] + tz * hw], col, w, f, n); V([b[0] - tx * 0.012, b[1], b[2] - tz * 0.012], col, w, f, n); V([b[0] + tx * 0.012, b[1], b[2] + tz * 0.012], col, w, f, n);
      pi.push(s, s + 1, s + 2, s + 1, s + 3, s + 2);
    }
    // the little trees: crowns of leaf (lumpy blobs) on short leaning trunks
    const blob = (cx, cy, cz, rx, ry, rz, shade) => {
      const g = new THREE.IcosahedronGeometry(1, 1), pa = g.attributes.position, seed = cx * 7.1 + cz * 3.3;
      for (let v = 0; v < pa.count; v++) {
        const x = pa.getX(v), y = pa.getY(v), z = pa.getZ(v), j = 0.88 + 0.16 * Math.sin(x * 5.1 + seed) * Math.sin(z * 4.3 + y * 3.7 + seed), k = shade * (0.72 + 0.35 * (y + 1) / 2);      // lumpy, darker underneath
        pi.push(V([cx + x * rx * j, cy + y * ry * j, cz + z * rz * j], [0.55 * k, 0.68 * k, 0.42 * k], [0.15, 0], [0, 0], norm(x / rx, y / ry, z / rz)));
      }
      g.dispose();
    };
    const trunk = (a, b, r0, r1) => {      // a five-sided tapering stick
      const ax = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]), u = new THREE.Vector3().crossVectors(ax, new THREE.Vector3(0, 1, 0)).normalize(), v = new THREE.Vector3().crossVectors(u, ax).normalize(), s = pp.length / 3;
      for (let q = 0; q < 5; q++) { const t = (q / 5) * TAU, c = Math.cos(t), sn = Math.sin(t), n = [u.x * c + v.x * sn, u.y * c + v.y * sn, u.z * c + v.z * sn]; for (const [p, r] of [[a, r0], [b, r1]]) V([p[0] + n[0] * r, p[1] + n[1] * r, p[2] + n[2] * r], [0.4, 0.33, 0.27], [0, 1], [0, 0], n); }
      for (let q = 0; q < 5; q++) { const a0 = s + q * 2, b0 = s + ((q + 1) % 5) * 2; pi.push(a0, a0 + 1, b0, b0, a0 + 1, b0 + 1); }
    };
    // clumps of grass and fern clinging to the earth and stone: three crossed cards each, narrow at
    // the root and fanning out, cut into blades like the fringe
    for (let n = 0; n < 40; n++) {
      const i = Math.floor(R0() * N), [ox, oz] = out(i), k = 1 + Math.floor(R0() * 2), t = R0();
      const p = cr[i][k - 1][0], q = cr[i][k][0], r = [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
      const h = 2 + R0() * 1.8, w = 2.4 + R0() * 1.8, g = 0.85 + R0() * 0.35, u0 = R0() * 900;
      for (let c = 0; c < 3; c++) {
        const ang = (c / 3) * Math.PI + R0() * 0.4, tx = Math.cos(ang) * -oz + Math.sin(ang) * ox * 0.5, tz = Math.cos(ang) * ox + Math.sin(ang) * oz * 0.5, tl = Math.hypot(tx, tz);
        const ax = tx / tl, az = tz / tl, top = [r[0] + ox * h * 0.55, r[1] + h * 0.85, r[2] + oz * h * 0.55], nrm = norm(ox * 0.5, 1, oz * 0.5), s0 = pp.length / 3;
        V([r[0] - ax * 0.2, r[1], r[2] - az * 0.2], [0.42 * g, 0.5 * g, 0.32 * g], [0.3, 0], [u0, 1], nrm); V([r[0] + ax * 0.2, r[1], r[2] + az * 0.2], [0.42 * g, 0.5 * g, 0.32 * g], [0.3, 0], [u0 + w, 1], nrm);
        V([top[0] - ax * w / 2, top[1], top[2] - az * w / 2], [0.8 * g, 0.88 * g, 0.5 * g], [0.3, 0], [u0, 2], nrm); V([top[0] + ax * w / 2, top[1], top[2] + az * w / 2], [0.8 * g, 0.88 * g, 0.5 * g], [0.3, 0], [u0 + w, 2], nrm);
        pi.push(s0, s0 + 1, s0 + 2, s0 + 1, s0 + 3, s0 + 2);
      }
    }
    // and a few small trees, rooted in the ledge and leaning out, their crowns below the brink
    for (let n = 0; n < 4; n++) {
      const i = Math.floor(R0() * N), r = cr[i][2][0], [ox, oz] = out(i), y = r[1] + R0();
      const lean = 3 + R0() * 1.5, h = 3 + R0() * 2, t = [r[0] + ox * lean, y + h, r[2] + oz * lean], s = 1.6 + R0() * 1.0;
      trunk([r[0] - ox * 0.3, y - 0.5, r[2] - oz * 0.3], t, 0.3, 0.13);
      blob(t[0] + ox * 0.4, t[1] + s * 0.35, t[2] + oz * 0.4, s * 1.2, s * 0.8, s * 1.2, 0.9);
      blob(t[0] - ox * 0.6 + oz * 0.8, t[1] + s * 0.1, t[2] - oz * 0.6 - ox * 0.8, s * 0.9, s * 0.65, s * 0.9, 0.75);
    }

    // ---- into the meshes ----
    const geo = (attrs, index, normals) => {
      const g = new THREE.BufferGeometry();
      for (const [name, arr, n] of attrs) g.setAttribute(name, new THREE.Float32BufferAttribute(arr, n));
      g.setIndex(index); if (normals) g.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3)); else g.computeVertexNormals();
      g.computeBoundingSphere(); return g;
    };
    const set = (m, g) => { m.geometry.dispose(); m.geometry = g; };
    set(land, geo([['position', lp, 3], ['color', lc, 3], ['islW', lw, 2], ['uv', luv, 2]], li));
    set(cliff, geo([['position', cp, 3], ['color', cc, 3], ['islW', cw, 1]], ci));
    const puv = []; for (let v = 0; v < pp.length / 3; v++) puv.push(pp[v * 3] + pp[v * 3 + 1] * 0.6, pp[v * 3 + 2] - pp[v * 3 + 1] * 0.6);
    set(lip, geo([['position', pp, 3], ['color', pc, 3], ['islW', pw, 2], ['islF', pf, 2], ['uv', puv, 2]], pi, pn));
  }

  // ---- level reach past the barrier: BASE feet, or further out under anything planted there ----
  const BASE = 1.3, flat = new Array(N).fill(BASE);
  build(flat);

  // Once the garden has set itself out (its plants are made after this, in garden.setup), look for
  // anything growing past the barrier further out than the shoulder begins, and let the level
  // ground out under it, easing back to the usual shoulder either side.
  function fit() {
    const need = [], m4 = new THREE.Matrix4(), v = new THREE.Vector3();
    outdoors.updateMatrixWorld(true);
    outdoors.traverse(o => {
      if (!o.isInstancedMesh) return;
      for (let k = 0; k < o.count; k++) {
        o.getMatrixAt(k, m4); v.setFromMatrixPosition(m4).applyMatrix4(o.matrixWorld);
        if (v.y > 0.6 || v.y < -0.5) continue;
        const past = Math.hypot(v.x - C.x, v.z - C.z) - R(Math.atan2(v.z - C.z, v.x - C.x));
        if (past > BASE - 1.2 && past < 30) need.push([v.x, v.z, past + 1.4]);
      }
    });
    let changed = 0;
    for (let i = 0; i < N; i++) {
      let f = BASE;
      for (const [x, z, p] of need) f = Math.max(f, p - Math.max(0, Math.hypot(x - B[i][0], z - B[i][1]) - p) * 0.35);
      if (f > flat[i] + 0.01) { flat[i] = f; changed++; }
    }
    if (!changed) return 0;
    for (let pass = 0; pass < 3; pass++) { const c = flat.slice(); for (let i = 0; i < N; i++) flat[i] = Math.max(c[i], (c[(i + N - 1) % N] + 2 * c[i] + c[(i + 1) % N]) / 4); }
    build(flat);
    return changed;
  }
  setTimeout(() => { try { fit(); } catch (e) { console.warn('island fit', e); } }, 0);

  return { land, lip, cliff, fit, N, flat };
}

// quads between ring k and ring k + 1 (n vertices a ring, closed round), rings from `first`
function strips(index, first, rings, n) {
  for (let k = 0; k < rings - 1; k++) for (let i = 0; i < n; i++) { const a = first + k * n + i, b = first + k * n + (i + 1) % n; index.push(a, b, a + n, b, b + n, a + n); }
}

// ---- shaders ----
// world position and world normal, for the fragment shader
function worldVaryings(sh) {
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nvarying vec3 vIslP;\nvarying vec3 vIslN;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvIslP = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvIslN = normalize(mat3(modelMatrix) * objectNormal);');
}
const TRI = `
varying vec3 vIslP;
varying vec3 vIslN;
vec3 islBlend(vec3 n) { vec3 b = pow(abs(n), vec3(4.0)); return b / (b.x + b.y + b.z); }
vec3 islTri(sampler2D t, vec3 p, vec3 b) {      // a texture projected along all three axes, blended by the normal
  vec3 c = vec3(0.0); float s = 0.0;
  if (b.x > 0.02) { c += texture2D(t, p.zy).rgb * b.x; s += b.x; }
  if (b.y > 0.02) { c += texture2D(t, p.xz).rgb * b.y; s += b.y; }
  if (b.z > 0.02) { c += texture2D(t, p.xy).rgb * b.z; s += b.z; }
  return c / max(s, 0.0001);
}
`;
// Blades of grass cut out of a strip: u feet along it, v 0..1 up the blade. Three rows of blades,
// about seven, five and three to the foot, of random height, width and lean, tapering to a point.
const BLADES = `
bool islBlade(float u, float v, float per, float seed) {
  float a = u * per + seed, ia = floor(a), fa = fract(a);
  float r1 = fract(sin(ia * 12.9898 + seed) * 43758.5453), r2 = fract(sin(ia * 78.233 + seed) * 43758.5453), r3 = fract(sin(ia * 39.346 + seed) * 43758.5453);
  float h = 0.3 + 0.7 * r1 * r1 + 0.15 * r3, lean = (r2 - 0.5) * 0.7, mid = 0.5 + (r3 - 0.5) * 0.3;
  return v < h && abs(fa - mid - lean * v * v) < (0.2 + 0.25 * r2) * (1.0 - v / h);
}
`;
function patchLand(m, materials, tint, fringe) {
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, { uMeadow: { value: materials.meadow.map }, uSoil: { value: materials.soilbed.map }, uTG: { value: tint.grass }, uTM: { value: tint.meadow }, uTS: { value: tint.soil } });
    worldVaryings(sh);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 islW;\nvarying vec2 vIslW;' + (fringe ? '\nattribute vec2 islF;\nvarying vec2 vIslF;' : ''))
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvIslW = islW;' + (fringe ? '\nvIslF = islF;' : ''));
    sh.fragmentShader = sh.fragmentShader.replace('#define HOUSE_LIGHT', '')      // never indoors
      .replace('#include <common>', '#include <common>\n' + TRI + (fringe ? BLADES + 'varying vec2 vIslF;\n' : '') + 'varying vec2 vIslW;\nuniform sampler2D uMeadow;\nuniform sampler2D uSoil;\nuniform vec3 uTG;\nuniform vec3 uTM;\nuniform vec3 uTS;')
      .replace('#include <map_fragment>', (fringe ? `
  if (vIslF.y > 0.5 && !islBlade(vIslF.x, vIslF.y - 1.0, 7.0, 0.0) && !islBlade(vIslF.x, vIslF.y - 1.0, 5.0, 0.37) && !islBlade(vIslF.x, vIslF.y - 1.0, 3.1, 0.71)) discard;` : '') + `
  vec3 islC = texture2D(map, vMapUv).rgb * uTG;
  if (vIslW.x > 0.01) islC = mix(islC, texture2D(uMeadow, vIslP.xz / 6.6).rgb * uTM, vIslW.x);
  if (vIslW.y > 0.01) islC = mix(islC, islTri(uSoil, vIslP / 5.0, islBlend(vIslN)) * uTS, vIslW.y);
  diffuseColor.rgb *= islC;`);
    // grass seen from behind is lit as from in front (a blade is thin)
    if (fringe) sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n  if (vIslF.y > 0.5) normal = normalize(vNormal);');
  };
  m.customProgramCacheKey = () => (fringe ? 'island-fringe' : 'island-land');
}
function patchCliff(m, materials, tint) {
  const rock = materials.flagstone;
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, { uSoil: { value: materials.soilbed.map }, uRock: { value: rock.map }, uRockN: { value: rock.normalMap }, uTS: { value: tint.soil }, uTR: { value: tint.rock } });
    worldVaryings(sh);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float islW;\nvarying float vIslW;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvIslW = islW;');
    sh.fragmentShader = sh.fragmentShader.replace('#define HOUSE_LIGHT', '')
      .replace('#include <common>', '#include <common>\n' + TRI + 'varying float vIslW;\nuniform sampler2D uSoil;\nuniform sampler2D uRock;\nuniform sampler2D uRockN;\nuniform vec3 uTS;\nuniform vec3 uTR;')
      .replace('#include <map_fragment>', `
  vec3 islB = islBlend(vIslN), islC = vec3(0.0);
  if (vIslW < 0.99) islC += islTri(uSoil, vIslP / 5.0, islB) * uTS * (1.0 - vIslW);
  if (vIslW > 0.01) {
    vec3 rc = islTri(uRock, vIslP * vec3(0.04, 0.12, 0.04), islB) * uTR;      // the flags drawn out flat, as stone in courses
    // strata: bands of paler and darker stone, wandering a little
    float st = sin(vIslP.y * 0.9 + sin(vIslP.x * 0.045) * 2.5 + sin(vIslP.z * 0.05 + 1.0) * 2.5);
    float st2 = sin(vIslP.y * 0.23 + sin(vIslP.z * 0.02) * 3.0);
    rc *= (0.9 + 0.1 * st) * (0.92 + 0.12 * st2) * vec3(1.0, 0.985 + 0.02 * st2, 0.96 + 0.05 * st2);
    float patchy = smoothstep(0.2, 0.9, sin(vIslP.x * 0.071 + sin(vIslP.y * 0.11) * 1.5) * sin(vIslP.z * 0.063 - vIslP.y * 0.05));
    rc *= mix(vec3(1.0), vec3(0.78, 0.8, 0.84), patchy);      // greyer weathered patches
    islC += rc * vIslW;
  }
  diffuseColor.rgb *= islC;`)
      .replace('#include <normal_fragment_maps>', `
  if (vIslW > 0.01) {      // the flagstone's normal map, projected as its colour is (whiteout blend)
    vec3 p = vIslP * vec3(0.04, 0.12, 0.04), n = normalize(vIslN);
    vec3 tx = texture2D(uRockN, p.zy).xyz * 2.0 - 1.0, ty = texture2D(uRockN, p.xz).xyz * 2.0 - 1.0, tz = texture2D(uRockN, p.xy).xyz * 2.0 - 1.0;
    float k = 1.6 * vIslW;
    tx = vec3(tx.xy * k + n.zy, abs(tx.z) * n.x); ty = vec3(ty.xy * k + n.xz, abs(ty.z) * n.y); tz = vec3(tz.xy * k + n.xy, abs(tz.z) * n.z);
    normal = normalize((viewMatrix * vec4(normalize(tx.zyx * islB.x + ty.xzy * islB.y + tz.xyz * islB.z), 0.0)).xyz);
  }`);
  };
  m.customProgramCacheKey = () => 'island-cliff';
}
