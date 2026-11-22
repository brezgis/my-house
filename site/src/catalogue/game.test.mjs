// node site/src/catalogue/game.test.mjs   (node 22). Sir Reginald's Rounds (game.js): every room
// can be solved, its par is the true fewest moves, none is trivial, they get harder, and each
// twist (rug, butler, sock) matters in the rooms that have it.
import assert from 'node:assert/strict';
import { GAME, LEVELS, COLS, ROWS, parse, begin, step, solved, solve, readBest, mountGame } from './game.js';

let n = 0;
const ok = (name, f) => { f(); n++; console.log('ok  ' + name); };
const without = (L, chars) => ({ map: L.map.map(r => r.replace(new RegExp(`[${chars}]`, 'g'), '.')) });
const sols = LEVELS.map(L => solve(L));

ok('the module imports in node and exports what the desktop needs', () => {
  assert.equal(typeof mountGame, 'function');
  assert.ok(GAME.title && GAME.blurb);
});

ok('twelve well-formed rooms', () => {
  assert.equal(LEVELS.length, 12);
  assert.equal(new Set(LEVELS.map(L => L.name)).size, 12);
  for (const L of LEVELS) {
    assert.equal(L.map.length, ROWS, L.name);
    for (const row of L.map) { assert.equal(row.length, COLS, L.name); assert.match(row, /^[.Ro=%s1-9TPBCKDM#]+$/, L.name); }
    assert.equal(L.map.join('').split('R').length, 2, L.name + ': one Reginald');
    const lv = parse(L);
    assert.ok(lv.crumbs.length >= 3 && lv.crumbs.length <= 12, L.name + ': crumbs');
    assert.equal(lv.spots.filter(s => s !== undefined).length, lv.spots.length, L.name + ": the butler's round has no gaps");
    assert.equal(!!lv.spots.length, !!L.who, L.name + ': a butler is named exactly when there is one');
    for (const s of lv.spots) assert.ok(!lv.crumbAt.has(s) && !lv.sock.has(s), L.name + ': nothing under the butler');
    assert.ok(L.say && !/—/.test(L.say), L.name + ': a line');
  }
});

ok('every room can be solved', () => {
  sols.forEach((s, i) => assert.ok(s, LEVELS[i].name));
});

ok('each par is the fewest moves there is', () => {
  sols.forEach((s, i) => assert.equal(LEVELS[i].par, s.n, LEVELS[i].name));
});

ok("the solver's own moves, played through step(), clear the room", () => {
  LEVELS.forEach((L, i) => {
    const lv = parse(L); let s = begin(lv);
    for (const d of sols[i].moves) { s = step(lv, s, d); assert.ok(s && !s.jam, L.name); }
    assert.ok(solved(lv, s), L.name);
  });
});

// "Broadly non-decreasing": par never drops by more than one from a room to the next, the first is
// the easiest, the last the hardest, and the last four average more than the first four.
ok('none trivial, and they get harder', () => {
  const par = LEVELS.map(L => L.par), sum = a => a.reduce((x, y) => x + y, 0);
  for (const p of par) assert.ok(p >= 3);
  for (let i = 1; i < par.length; i++) assert.ok(par[i] >= par[i - 1] - 1, `${LEVELS[i].name} is much easier than the room before`);
  assert.equal(Math.min(...par), par[0]);
  assert.equal(Math.max(...par), par.at(-1));
  assert.ok(sum(par.slice(-4)) > sum(par.slice(0, 4)));
});

ok('each twist matters where it appears, and they arrive one at a time', () => {
  const seen = [];
  LEVELS.forEach((L, i) => {
    const text = L.map.join('');
    for (const [twist, chars] of [['rug', '=%'], ['butler', '1-9'], ['sock', 's']]) {
      if (!new RegExp(`[${chars}]`).test(text)) continue;
      const bare = solve(without(L, twist === 'rug' ? '=' : chars));
      assert.notEqual(bare?.n, sols[i].n, `${L.name}: the ${twist} changes nothing`);
      if (!seen.includes(twist)) { seen.push(twist); assert.equal(text.replace(/[.Ro TPBCKDM#]/g, '').replace(new RegExp(`[${chars}]`, 'g'), ''), '', `${L.name}: the ${twist} is introduced alongside another twist`); }
    }
  });
  assert.deepEqual(seen, ['rug', 'butler', 'sock']);
});

ok('the rules: sliding, bumping, rugs, socks, the butler', () => {
  const lv = parse({ map: ['R.o.=.o.T', '.........', 's........', '.........', '.........', '.........', '.........'] });
  const s0 = begin(lv);
  assert.equal(step(lv, s0, 'U'), null, 'against the wall is not a move');
  assert.equal(step(lv, s0, 'L'), null);
  const a = step(lv, s0, 'R');
  assert.equal(a.p, 4, 'the rug stops him'); assert.equal(a.eaten, 1); assert.deepEqual(a.path, [1, 2, 3, 4]);
  const b = step(lv, a, 'R');
  assert.equal(b.p, 7, 'the table stops him'); assert.ok(solved(lv, b));
  const j = step(lv, s0, 'D');
  assert.equal(j.p, 2 * COLS, 'he stops on the sock'); assert.ok(j.jam); assert.equal(step(lv, j, 'R'), null, 'and goes nowhere after');
  assert.equal(s0.p, 0, 'states are not changed in place');

  const bl = parse({ map: ['R..1....o', '.........', '...2.....', '.........', '.........', '.........', '.........'] });
  const c = step(bl, begin(bl), 'R');
  assert.equal(c.p, 2, 'the butler is in the way'); assert.equal(c.ph, 1, 'then floats on');
  const d = step(bl, c, 'R');
  assert.equal(d.p, 8, 'and the way is clear'); assert.equal(d.ph, 0);
  const w = parse({ map: ['R.....o..', '.........', '1.2......', '.........', '.........', '.........', '.........'] });
  const e = step(w, begin(w), 'D');
  assert.equal(e.p, COLS, 'stopped above the butler'); assert.equal(e.ph, 1);
  const f = step(w, step(w, e, 'R'), 'L');
  assert.equal(f.ph, 1, "he waits a turn rather than land on Reginald's tile");
});

ok('what is remembered survives nonsense', () => {
  assert.deepEqual(readBest(null), LEVELS.map(() => null));
  assert.deepEqual(readBest('{{'), LEVELS.map(() => null));
  assert.deepEqual(readBest('{"best":"lots"}'), LEVELS.map(() => null));
  assert.deepEqual(readBest('{"best":[3,null,-2,"x",5.5,7]}').slice(0, 6), [3, null, null, null, null, 7]);
});

console.log(`\n${n} checks passed`);
console.log(LEVELS.map((L, i) => `${String(i + 1).padStart(2)}  ${L.name.padEnd(14)} par ${String(L.par).padStart(2)}  ${sols[i].moves.padEnd(12)}  ${sols[i].ways} way${sols[i].ways > 1 ? 's' : ''}`).join('\n'));
