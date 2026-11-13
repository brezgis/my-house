// node site/src/jigsaw_test.mjs   (node 18+). Tests the jigsaw's plain arithmetic (jigsaw_shapes.js):
// the cuts tile the picture, neighbours share their curves, snapping, groups, sorting, saving, solving.
import assert from 'node:assert/strict';
import { gridFor, makeCuts, outlines, pointInPoly, Puzzle, REGION, BOARD_UV, PLACE, toPuzzle, toTable, rng, SIZES } from './jigsaw_shapes.js';

let n = 0; const ok = (name, f) => { f(); n++; console.log('ok  ', name); };
const { W, H } = PLACE;
const make = size => { const { cols, rows } = gridFor(size, W / H), P = new Puzzle(cols, rows, W, H), cuts = makeCuts(cols, rows, 1234 + size); return { P, cols, rows, outl: outlines(cols, rows, P.cw, P.ch, cuts) }; };

ok('sizes: 24, 54 and 96 pieces on a 4:3 picture are 6x4, 9x6 and 12x8', () => {
  assert.deepEqual(gridFor(24, 4 / 3), { cols: 6, rows: 4 }); assert.deepEqual(gridFor(54, 4 / 3), { cols: 9, rows: 6 }); assert.deepEqual(gridFor(96, 4 / 3), { cols: 12, rows: 8 });
});
ok('table and puzzle coordinates go back and forth; the picture sits in the board, the board in the region', () => {
  const [u, v] = toPuzzle(...toTable(0.3, 0.9)); assert(Math.abs(u - 0.3) < 1e-12 && Math.abs(v - 0.9) < 1e-12);
  assert(BOARD_UV.u0 < 0 && BOARD_UV.v0 < 0 && BOARD_UV.u1 > W && BOARD_UV.v1 > H);
  assert(REGION.u0 < BOARD_UV.u0 + 0.2 && REGION.u1 > BOARD_UV.u1 && REGION.v0 < 0 && REGION.v1 > H);
});
for (const size of SIZES) ok(`${size}: the pieces tile the picture exactly (each point in exactly one piece)`, () => {
  const { outl } = make(size), r = rng(size);
  for (let k = 0; k < 4000; k++) {
    const u = 0.001 + r() * (W - 0.002), v = 0.001 + r() * (H - 0.002);
    const hits = outl.filter(p => pointInPoly(p, u, v)).length;
    assert.equal(hits, 1, `point ${u.toFixed(4)},${v.toFixed(4)} is in ${hits} pieces`);
  }
});
ok('neighbours share their cut point for point, and every inner cut has a knob', () => {
  const { P, outl, cols, rows } = make(54), key = (x, y) => `${x.toFixed(9)},${y.toFixed(9)}`;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols - 1; c++) {
    const a = outl[r * cols + c], b = outl[r * cols + c + 1], x1 = (c + 1) * P.cw;
    const set = new Set(); for (let i = 0; i < b.length; i += 2) set.add(key(b[i], b[i + 1]));
    // the points of a's right side (those off the cell's top and foot lines)
    const at = (x, y) => { for (let i = 0; i < a.length; i += 2) if (Math.abs(a[i] - x) < 1e-9 && Math.abs(a[i + 1] - y) < 1e-9) return i; return -1; };
    const i0 = at(x1, r * P.ch), i1 = at(x1, (r + 1) * P.ch); assert(i0 >= 0 && i1 > i0, 'corners on the outline');
    const right = []; for (let i = i0; i <= i1; i += 2) right.push([a[i], a[i + 1]]);
    assert(right.length >= 10); for (const [x, y] of right) assert(set.has(key(x, y)), 'shared point missing');
    const reach = Math.max(...right.map(([x]) => Math.abs(x - x1)));
    assert(reach > 0.18 * P.cw && reach < 0.42 * P.cw, 'knob size ' + reach / P.cw);
  }
});
ok('a piece dropped near its true neighbour joins it, exactly, and they move as one', () => {
  const { P } = make(24); P.scatter(REGION, 5);
  const a = P.p[7], b = P.p[8];        // b is right of a
  a.x = -0.5; a.y = 0.2; P.restack(a.g); b.x = a.x + P.cw + 0.02; b.y = a.y - 0.015;
  const res = P.drop(b.g);
  assert.equal(res.joined, 1); assert.equal(a.g, b.g); assert.equal(res.home, false);
  assert(Math.abs(b.x - a.x - P.cw) < 1e-12 && Math.abs(b.y - a.y) < 1e-12);
  P.shift(a.g, 0.3, 0.1); assert(Math.abs(b.x - a.x - P.cw) < 1e-12 && Math.abs(b.y - a.y) < 1e-12);
});
ok('a piece far from any neighbour stays loose; one near its place goes home', () => {
  const { P } = make(24); P.scatter(REGION, 6);
  const q = P.p[14]; q.x = -0.5; q.y = -0.2;
  assert.deepEqual([P.drop(q.g).joined, q.home], [0, false]);
  q.x = P.hx(14) + 0.03; q.y = P.hy(14) - 0.03; const r = P.drop(q.g);
  assert(r.home && q.home && q.x === P.hx(14) && q.y === P.hy(14));
});
ok('a loose group dropped into place merges with the home group it touches; groups do not double up', () => {
  const { P } = make(24); P.begin(REGION, 9);
  const homeN = P.placed(); assert(homeN >= 7 && homeN <= 11, 'about a third done: ' + homeN);
  const gs = P.groups(); assert(gs.size >= 2);
  // every group's members keep exact offsets
  for (const [, m] of gs) for (const q of m) { assert(Math.abs(q.x - m[0].x - (q.c - m[0].c) * P.cw) < 1e-9); assert(Math.abs(q.y - m[0].y - (q.r - m[0].r) * P.ch) < 1e-9); }
  // drop the next border piece next to the done part
  const next = P.p.find(q => !q.home && P.neighbours(q.i).some(k => P.p[k].home));
  P.shift(next.g, P.hx(next.i) - next.x + 0.02, P.hy(next.i) - next.y + 0.01);
  const r = P.drop(next.g); assert(r.home); assert.equal(P.groups().size, gs.size - 1);
  assert(P.members(r.g).every(q => q.home)); assert.equal(P.members(r.g).length, P.placed());
});
ok('the island lies beside the board, loose pieces lie in the region, home pieces in place', () => {
  for (const size of SIZES) {
    const { P } = make(size); P.begin(REGION, size);
    for (const q of P.p) {
      if (q.home) { assert.equal(q.x, P.hx(q.i)); continue; }
      assert(q.x >= REGION.u0 - 1e-9 && q.x + P.cw <= REGION.u1 + P.cw && q.y >= REGION.v0 - P.ch && q.y <= REGION.v1, `${size}: piece ${q.i} at ${q.x},${q.y}`);
    }
    assert(Math.abs(P.placed() / P.n - 1 / 3) < 0.15, `${size}: ${P.placed()} placed`);
  }
});
ok('sorting puts every loose single in the strips, edge pieces first, nothing on the picture', () => {
  for (const size of SIZES) {
    const { P } = make(size); P.begin(REGION, 3); P.tidy(REGION);
    const singles = P.p.filter(q => !q.home && P.members(q.g).length === 1);
    for (const q of singles) {
      const onPicture = q.x + P.cw > 0 && q.x < W && q.y + P.ch > 0 && q.y < H;
      assert(!onPicture, `${size}: piece ${q.i} sorted onto the picture`);
      assert(q.x >= REGION.u0 - 1e-9 && q.y >= REGION.v0 - 1e-9 && q.y + P.ch <= REGION.v1 + 1e-9);
    }
    // slots are filled in order: edges take the first ones
    const edges = singles.filter(q => P.edge(q.i)), inner = singles.filter(q => !P.edge(q.i));
    if (edges.length && inner.length) assert(Math.min(...edges.map(q => q.x)) <= Math.min(...inner.map(q => q.x)));
  }
});
ok('save and restore round-trip; bad saves are refused', () => {
  const { P, cols, rows } = make(96); P.begin(REGION, 11);
  const s = JSON.parse(JSON.stringify(P.save()));
  const Q = new Puzzle(cols, rows, W, H); assert(Q.restore(s));
  for (let i = 0; i < P.n; i++) { assert(Math.abs(P.p[i].x - Q.p[i].x) < 1e-3); assert.equal(P.p[i].g, Q.p[i].g); assert.equal(P.p[i].home, Q.p[i].home); }
  assert(!Q.restore({ v: 1, n: 24, p: [] })); assert(!Q.restore(null)); assert(!Q.restore({ ...s, p: s.p.map(a => [NaN, ...a.slice(1)]) }));
});
ok('solving: pieces dropped one by one at their places finish it, and only then', () => {
  const { P } = make(24); P.scatter(REGION, 2);
  const order = [...P.p].sort(() => 0).map(q => q.i);
  let last;
  for (const i of order) { const q = P.p[i]; if (q.home) continue; P.shift(q.g, P.hx(i) - q.x + 0.01, P.hy(i) - q.y - 0.01); last = P.drop(q.g); if (P.placed() < P.n) assert(!last.solved); }
  assert(last.solved && P.solved()); assert.equal(P.groups().size, 1);
});
ok('solveSome adds that many pieces to the done part', () => {
  const { P } = make(54); P.begin(REGION, 4); const before = P.placed(); P.solveSome(10); assert(P.placed() >= before + 10); assert.equal(new Set(P.p.filter(q => q.home).map(q => q.g)).size, 1);
});
console.log(`${n} passed`);
