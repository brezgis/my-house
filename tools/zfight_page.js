// Run inside the page by tools/zfight.py after the house has settled. Finds pairs of large,
// near-coplanar, overlapping faces that belong to different pieces. Returns a JSON report.
// Pieces: every Builder.add call (tagged with its call stack by the copy of builder.js that
// zfight.py serves), and every other mesh in the scene (models, rugs, pictures, garden things).
(opts) => {
  const H = window.__house, THREE_ = H.ctx?.THREE;
  const EPS = opts.eps ?? 0.012, MIN_AREA = opts.minArea ?? 0.03, MIN_OVER = opts.minOverlap ?? 0.02;
  const pieces = [];       // { src, mat, mesh, flags }
  const faces = [];        // { piece, nx,ny,nz (canonical), sign, d, area, u0,u1,v0,v1, tris: [9 floats...] }
  const buckets = new Map();
  const skipName = /sky|halo|window light|steam|cloud|star|outline|collider/i;
  const tmp = [0, 0, 0];
  function axes(nx, ny, nz) {   // deterministic in-plane axes for a canonical normal
    const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
    let ux, uy, uz;
    if (ay >= ax && ay >= az) { ux = 1; uy = 0; uz = 0; } else { ux = 0; uy = 1; uz = 0; }
    const dot = ux * nx + uy * ny + uz * nz; ux -= dot * nx; uy -= dot * ny; uz -= dot * nz;
    const l = Math.hypot(ux, uy, uz); ux /= l; uy /= l; uz /= l;
    return [ux, uy, uz, ny * uz - nz * uy, nz * ux - nx * uz, nx * uy - ny * ux];
  }
  function addTris(P, pos, start, count, piece, pm) {   // pos: world-space flat array; triangles from start (vertex) count vertices
    const local = new Map();
    for (let i = start; i < start + count; i += 3) {
      const a = i * 3, x0 = pos[a], y0 = pos[a + 1], z0 = pos[a + 2], x1 = pos[a + 3], y1 = pos[a + 4], z1 = pos[a + 5], x2 = pos[a + 6], y2 = pos[a + 7], z2 = pos[a + 8];
      let nx = (y1 - y0) * (z2 - z0) - (z1 - z0) * (y2 - y0), ny = (z1 - z0) * (x2 - x0) - (x1 - x0) * (z2 - z0), nz = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
      const l = Math.hypot(nx, ny, nz); if (l < 1e-7) continue;
      const area = l / 2; nx /= l; ny /= l; nz /= l;
      // canonical sign: largest component positive
      const ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz), big = ay >= ax && ay >= az ? ny : ax >= az ? nx : nz;
      const sign = big < 0 ? -1 : 1; nx *= sign; ny *= sign; nz *= sign;
      const qx = Math.round(nx * 60), qy = Math.round(ny * 60), qz = Math.round(nz * 60);
      const d = nx * x0 + ny * y0 + nz * z0;
      const key = qx + ',' + qy + ',' + qz + '|' + sign + '|' + Math.round(d / 0.004);
      let f = local.get(key);
      if (!f) { f = { piece, q: qx + ',' + qy + ',' + qz, nx, ny, nz, sign, d, area: 0, u0: 1e9, u1: -1e9, v0: 1e9, v1: -1e9, tris: [] }; local.set(key, f); }
      f.area += area; f.tris.push(x0, y0, z0, x1, y1, z1, x2, y2, z2); if (pm?.uv && !f.uv) f.uv = [pm.uv[i * 2], pm.uv[i * 2 + 1], pm.uv[i * 2 + 2], pm.uv[i * 2 + 3], pm.uv[i * 2 + 4], pm.uv[i * 2 + 5]];
    }
    const pc = pieces[piece];
    if (pm) { pc.col = pm.col; pc.rep = pm.rep; }
    let axisAligned = true, bb = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
    for (let i = start * 3; i < (start + count) * 3; i += 3) for (let k = 0; k < 3; k++) { const q = pos[i + k]; if (q < bb[k]) bb[k] = q; if (q > bb[k + 3]) bb[k + 3] = q; }
    for (const f of local.values()) if (Math.max(Math.abs(f.nx), Math.abs(f.ny), Math.abs(f.nz)) < 0.9999) axisAligned = false;
    pc.bb = bb; pc.box = axisAligned && count === 36;
    for (const f of local.values()) {
      if (f.area < MIN_AREA) continue;
      const A = axes(...f.q.split(',').map(Number).map((v, i, arr) => v / Math.hypot(...arr)));
      const t2 = [];
      for (let i = 0; i < f.tris.length; i += 3) { const u = f.tris[i] * A[0] + f.tris[i + 1] * A[1] + f.tris[i + 2] * A[2], v = f.tris[i] * A[3] + f.tris[i + 1] * A[4] + f.tris[i + 2] * A[5]; t2.push(u, v); if (u < f.u0) f.u0 = u; if (u > f.u1) f.u1 = u; if (v < f.v0) f.v0 = v; if (v > f.v1) f.v1 = v; }
      f.c = [f.tris[0], f.tris[1], f.tris[2]]; f.t2 = t2; f.tris = null; f.A = A;
      faces.push(f);
      let b = buckets.get(f.q); if (!b) buckets.set(f.q, b = []); b.push(f);
    }
  }
  const v = new THREE_.Vector3(), m4 = new THREE_.Matrix4();
  let nMesh = 0, nTri = 0, skipped = [];
  H.scene.updateMatrixWorld(true);
  H.scene.traverse(o => {
    if (!o.isMesh || o.isSkinnedMesh || o.isSprite) return;
    let p = o, chain = []; while (p) { if (p.name) chain.push(p.name); p = p.parent; }
    const path = chain.reverse().join('/');
    if (skipName.test(path) || o.material?.isShaderMaterial && !o.userData.pieces) { return; }
    const mats = [].concat(o.material), mat0 = mats[0];
    if (mats.every(m => m.blending === THREE_.AdditiveBlending)) return;
    const g = o.geometry, pa = g.attributes.position; if (!pa) return;
    const idx = g.index, nv = idx ? idx.count : pa.count;
    const inst = o.isInstancedMesh ? o.count : 1;
    if (nv * inst > 900000) { skipped.push(path + ' ' + nv * inst); return; }
    if (opts.noInstanced && o.isInstancedMesh) return;
    nMesh++;
    const flagsOf = m => ({ name: m.name || o.name, po: !!m.polygonOffset, ds: m.side === 2, tr: !!m.transparent, dw: m.depthWrite !== false, at: m.alphaTest > 0, map: m.map ? (m.map.source?.data?.src ?? '').split('/').pop() || 'canvas' : '', col: m.color ? m.color.getHexString() : '', vc: !!m.vertexColors });
    for (let k = 0; k < inst; k++) {
      m4.copy(o.matrixWorld); if (o.isInstancedMesh) { const im = new THREE_.Matrix4(); o.getMatrixAt(k, im); m4.multiply(im); }
      const pos = new Float32Array(nv * 3), ua = g.attributes.uv, ca = g.attributes.color, uvs = ua ? new Float32Array(nv * 2) : null;
      if (ua) for (let i = 0; i < nv; i++) { const j = idx ? idx.getX(i) : i; uvs[i * 2] = ua.getX(j); uvs[i * 2 + 1] = ua.getY(j); }
      const colAt = i => { const j = idx ? idx.getX(i) : i; return ca && j < ca.count ? [ca.getX(j), ca.getY(j), ca.getZ(j)].map(x => x.toFixed(3)).join(',') + (g.attributes.rm ? '/' + g.attributes.rm.getX(j) + '/' + g.attributes.rm.getY(j) : '') : ''; };
      const repOf = m => (m.map ? [m.map.repeat.x, m.map.repeat.y] : null);
      for (let i = 0; i < nv; i++) { const j = idx ? idx.getX(i) : i; v.fromBufferAttribute(pa, j).applyMatrix4(m4); pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z; }
      nTri += nv / 3;
      if (o.userData.pieces && !idx) {
        let at = 0;
        for (const [src, n] of o.userData.pieces) { const piece = pieces.push({ src, mesh: o.name, zone: o.userData.zone, f: flagsOf(mat0) }) - 1; addTris(null, pos, at, n, piece, { uv: uvs, col: colAt(at), rep: repOf(mat0) }); at += n; }
      } else {
        const groups = g.groups.length && mats.length > 1 ? g.groups : [{ start: 0, count: nv, materialIndex: 0 }];
        for (const gr of groups) { const piece = pieces.push({ src: 'mesh:' + (o.userData.cat ?? '') + ':' + path + (inst > 1 ? '#' + k : ''), mesh: o.name, zone: o.userData.zone ?? '', f: flagsOf(mats[gr.materialIndex] ?? mat0), own: o.id }) - 1; addTris(null, pos, gr.start, Math.min(gr.count, nv - gr.start), piece, { uv: uvs, col: colAt(gr.start), rep: repOf(mats[gr.materialIndex] ?? mat0) }); }
      }
    }
  });
  // exact overlap of two triangle sets in 2D
  function clip(poly, ax, ay, bx, by) { const out = []; for (let i = 0; i < poly.length; i += 2) { const px = poly[i], py = poly[i + 1], j = (i + 2) % poly.length, qx = poly[j], qy = poly[j + 1]; const sp = (bx - ax) * (py - ay) - (by - ay) * (px - ax), sq = (bx - ax) * (qy - ay) - (by - ay) * (qx - ax); if (sp >= 0) out.push(px, py); if ((sp >= 0) !== (sq >= 0)) { const t = sp / (sp - sq); out.push(px + (qx - px) * t, py + (qy - py) * t); } } return out; }
  const areaOf = p => { let a = 0; for (let i = 0; i < p.length; i += 2) { const j = (i + 2) % p.length; a += p[i] * p[j + 1] - p[j] * p[i + 1]; } return Math.abs(a) / 2; };
  function overlap(A, B) {
    let s = 0;
    for (let i = 0; i < A.length; i += 6) {
      let ax0 = A[i], ay0 = A[i + 1], ax1 = A[i + 2], ay1 = A[i + 3], ax2 = A[i + 4], ay2 = A[i + 5];
      if ((ax1 - ax0) * (ay2 - ay0) - (ay1 - ay0) * (ax2 - ax0) < 0) { [ax1, ay1, ax2, ay2] = [ax2, ay2, ax1, ay1]; }
      const lo = Math.min(ax0, ax1, ax2), hi = Math.max(ax0, ax1, ax2), lo2 = Math.min(ay0, ay1, ay2), hi2 = Math.max(ay0, ay1, ay2);
      for (let j = 0; j < B.length; j += 6) {
        if (Math.max(B[j], B[j + 2], B[j + 4]) <= lo || Math.min(B[j], B[j + 2], B[j + 4]) >= hi || Math.max(B[j + 1], B[j + 3], B[j + 5]) <= lo2 || Math.min(B[j + 1], B[j + 3], B[j + 5]) >= hi2) continue;
        let p = [B[j], B[j + 1], B[j + 2], B[j + 3], B[j + 4], B[j + 5]];
        p = clip(p, ax0, ay0, ax1, ay1); if (p.length < 6) continue; p = clip(p, ax1, ay1, ax2, ay2); if (p.length < 6) continue; p = clip(p, ax2, ay2, ax0, ay0); if (p.length < 6) continue;
        const ar = areaOf(p); s += ar;
        if (ar > 0.004) { let cx = 0, cy = 0; for (let k = 0; k < p.length; k += 2) { cx += p[k]; cy += p[k + 1]; } samples.push([ar, cx / (p.length / 2), cy / (p.length / 2)]); }
      }
    }
    return s;
  }
  let samples = [];
  // box pieces, in a grid, for asking whether a point is buried inside something solid
  const CELLG = 6, grid = new Map(), gk = (x, y, z) => Math.floor(x / CELLG) + ',' + Math.floor(y / CELLG) + ',' + Math.floor(z / CELLG);
  pieces.forEach((p, i) => { if (!p.box) return; const b = p.bb; for (let x = Math.floor(b[0] / CELLG); x <= Math.floor(b[3] / CELLG); x++) for (let y = Math.floor(b[1] / CELLG); y <= Math.floor(b[4] / CELLG); y++) for (let z = Math.floor(b[2] / CELLG); z <= Math.floor(b[5] / CELLG); z++) { const k = x + ',' + y + ',' + z; let l = grid.get(k); if (!l) grid.set(k, l = []); l.push(i); } });
  const buried = (x, y, z, m = 0.002) => { for (const i of grid.get(gk(x, y, z)) ?? []) { const b = pieces[i].bb; if (x > b[0] + m && x < b[3] - m && y > b[1] + m && y < b[4] - m && z > b[2] + m && z < b[5] - m) return i; } return -1; };
  // uv of a face at a 2D point (affine from its first triangle)
  function uvAt(f, u, v) {
    if (!f.uv) return null; const t = f.t2, x0 = t[0], y0 = t[1], e1x = t[2] - x0, e1y = t[3] - y0, e2x = t[4] - x0, e2y = t[5] - y0, det = e1x * e2y - e1y * e2x; if (Math.abs(det) < 1e-9) return null;
    const a = ((u - x0) * e2y - (v - y0) * e2x) / det, b = ((v - y0) * e1x - (u - x0) * e1y) / det;
    return [f.uv[0] + a * (f.uv[2] - f.uv[0]) + b * (f.uv[4] - f.uv[0]), f.uv[1] + a * (f.uv[3] - f.uv[1]) + b * (f.uv[5] - f.uv[1])];
  }
  const pairs = [];
  let tested = 0;
  for (const list of buckets.values()) {
    list.sort((a, b) => a.d - b.d);
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      for (let j = i + 1; j < list.length && list[j].d - a.d < EPS; j++) {
        const b = list[j];
        if (a.piece === b.piece) continue;
        const pa = pieces[a.piece], pb = pieces[b.piece];
        if (pa.own !== undefined && pa.own === pb.own) continue;        // two material groups of one mesh
        const ou = Math.min(a.u1, b.u1) - Math.max(a.u0, b.u0), ov = Math.min(a.v1, b.v1) - Math.max(a.v0, b.v0);
        if (ou <= 0.02 || ov <= 0.02 || ou * ov < MIN_OVER) continue;
        // true plane distance (normals may differ a hair)
        const dd = Math.abs((b.c[0] - a.c[0]) * a.nx + (b.c[1] - a.c[1]) * a.ny + (b.c[2] - a.c[2]) * a.nz);
        if (dd > EPS) continue;
        tested++;
        if (a.t2.length * b.t2.length > 4e6) { pairs.push({ a: a.piece, b: b.piece, same: a.sign === b.sign, dd, over: ou * ov, approx: true, at: a.c, n: [a.nx, a.ny, a.nz] }); continue; }
        samples = [];
        const over = overlap(a.t2, b.t2);
        if (over < MIN_OVER) continue;
        samples.sort((p, q) => q[0] - p[0]); samples = samples.slice(0, 8);
        // exposed: is a point just in front of the faces free of any solid box?
        const A = a.A, same = a.sign === b.sign, dOut = same ? (a.sign > 0 ? Math.max(a.d, b.d) + 0.004 : Math.min(a.d, b.d) - 0.004) : 0;
        const at3 = (u, v, d) => [u * A[0] + v * A[3] + d * a.nx, u * A[1] + v * A[4] + d * a.ny, u * A[2] + v * A[5] + d * a.nz];
        let exposed = 0, hider = -1, where = null;
        if (same) for (const [, u, v] of samples) { const q = at3(u, v, dOut), h = buried(q[0], q[1], q[2]); if (h < 0) { exposed++; where ??= q; } else hider = h; }
        else { exposed = samples.length; }
        where ??= at3(samples[0]?.[1] ?? 0, samples[0]?.[2] ?? 0, a.d);
        // identical look: same material, colour, and texture coordinates that agree up to whole tiles
        let ident = false;
        if (pa.f.name === pb.f.name && pa.col === pb.col && pa.mesh === pb.mesh) {
          if (!pa.rep) ident = true;
          else if (samples.length) { const [, u, v] = samples[0]; ident = true; for (const [du, dv] of [[0, 0], [0.37, 0], [0, 0.41]]) { const ua = uvAt(a, u + du, v + dv), ub = uvAt(b, u + du, v + dv); if (!ua || !ub) { ident = false; break; } const ex = (ua[0] - ub[0]) * pa.rep[0], ey = (ua[1] - ub[1]) * pa.rep[1]; if (Math.abs(ex - Math.round(ex)) > 0.002 || Math.abs(ey - Math.round(ey)) > 0.002) { ident = false; break; } } }
        }
        pairs.push({ a: a.piece, b: b.piece, same, dd: +dd.toFixed(5), over: +over.toFixed(3), exposed, ns: samples.length, ident, hider: hider >= 0 ? pieces[hider].src.split(' < ').slice(0, 2).join('<') : '', c: where.map(x => +x.toFixed(2)), n: [a.nx, a.ny, a.nz].map(x => +x.toFixed(2)), sign: a.sign });
      }
    }
  }
  const used = new Set(); for (const p of pairs) { used.add(p.a); used.add(p.b); }
  const P = {}; for (const i of used) { const { bb, ...rest } = pieces[i]; P[i] = rest; }
  return { nMesh, nTri, nPieces: pieces.length, nFaces: faces.length, tested, skipped, pairs, pieces: P };
}
