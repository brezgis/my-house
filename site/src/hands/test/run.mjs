// node site/src/hands/test/run.mjs   (node 18+). Tests the parts of "hands" that are plain arithmetic and data.
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { aimAny, aimSpot, clearSpot, raySoup, dropSoup, headroom, feel } from '../place.js';
import { makeBookIndex } from '../aim.js';
import { contentFor, bookKey } from '../bookcontent.js';
import { QUOTES } from '../quotes.js';
import { NOTES } from '../notes.js';
import { makeShell, MENU, tokenize, parse, plural } from '../shell.js';
import { THINGS, SNACKS } from '../things.js';
const here = new URL('.', import.meta.url);
const { colliders, surfaces } = JSON.parse(readFileSync(new URL('fixture.json', here)));
const books = JSON.parse(readFileSync(new URL('../../../assets/books.json', here)));
let n = 0; const ok = (name, f) => { f(); n++; console.log('ok  ', name); };
const unit = (x, y, z) => { const l = Math.hypot(x, y, z); return [x / l, y / l, z / l]; };

// ---- setting down: the house's own boxes and floors (fixture.json, taken from the running house) ----
ok('office desk top: looking down at it from the chair side gives its top, foot kept on it', () => {
  // desk: fr(25.0, 38.9) in plan = world x 3.335, z -38.9; top 2.5 above the ground floor (1.6)
  const desk = colliders.find(c => Math.abs(c.y1 - 4.1) < 0.01 && c.x0 < 3.3 && c.x1 > 3.4 && c.z0 < -37 && c.z1 > -38.5); assert(desk, 'desk collider');
  const out = {}; const [dx, dy, dz] = unit(0, -0.8, -1);
  const s = aimSpot(out, 3.3, 6.45, -35.2, dx, dy, dz, colliders, surfaces, 0.3, 0.6);
  assert(s && s.c === desk, 'hit the desk'); assert.equal(s.y, desk.y1);
  assert(s.x >= desk.x0 + 0.3 - 1e-9 && s.x <= desk.x1 - 0.3 + 1e-9 && s.z >= desk.z0 + 0.3 - 1e-9 && s.z <= desk.z1 - 0.3 + 1e-9);
});
ok('the living-room floor: straight down gives the ground floor at 1.6', () => {
  const out = {}; const s = aimSpot(out, -6, 6.45, -8, ...unit(0.05, -1, -0.3), colliders, surfaces, 0.3, 0.6);
  assert(s && !s.c); assert(Math.abs(s.y - 1.6) < 1e-9);
});
ok('upstairs floor from upstairs; the garden lawn outside', () => {
  const out = {}; let s = aimSpot(out, -10, 15.65, -15, ...unit(0, -1, -0.2), colliders, surfaces, 0.3, 0.6);
  assert(s && Math.abs(s.y - 10.8) < 1e-6, 'upper floor');
  s = aimSpot(out, -80, 4.9, 60, ...unit(0, -1, -0.5), colliders, surfaces, 0.3, 0.6);
  assert(s && Math.abs(s.y - 0.03) < 1e-9, 'lawn');
});
ok('a wall is not a place: looking level at the front wall from inside gives no spot', () => {
  const out = {}; assert.equal(aimSpot(out, -10, 6.45, -3, 0, 0, 1, colliders, surfaces, 0.3, 0.6), null);
  assert(aimAny(out, -10, 6.45, -3, 0, 0, 1, colliders, surfaces) && !out.top, 'but the look does meet it');
});
ok('nothing within reach: looking at the sky', () => { assert.equal(aimAny({}, -80, 4.9, 60, 0, 1, 0, colliders, surfaces), null); });
ok('every low table-like top in the house takes a small thing without it ending inside a neighbour', () => {
  let tried = 0, placed = 0;
  for (const c of colliders) {
    if (c.off || c.staff || c.y1 - c.y0 > 3.6 || c.y1 - c.y0 < 1.2 || Math.min(c.x1 - c.x0, c.z1 - c.z0) < 1) continue;
    const cx = (c.x0 + c.x1) / 2, cz = (c.z0 + c.z1) / 2; tried++;
    const out = {}; const s = aimSpot(out, cx, c.y1 + 3, cz + 0.01, ...unit(0, -1, -0.001), colliders, surfaces, 0.25, 0.5);
    if (!s) continue; placed++;
    assert(s.y >= c.y1 - 1e-9, 'not sunk in');
    for (const k of colliders) { if (k === s.c || k.off || k.staff || k.y1 <= s.y + 0.08 || k.y0 >= s.y + 0.5) continue; const nx = Math.max(k.x0, Math.min(s.x, k.x1)), nz = Math.max(k.z0, Math.min(s.z, k.z1)); assert(Math.hypot(s.x - nx, s.z - nz) >= 0.25 - 1e-6, 'clear of the box beside it'); }
  }
  assert(tried > 30 && placed > tried * 0.6, `placed ${placed} of ${tried}`); console.log(`       (${placed} of ${tried} tops)`);
});
ok('clearSpot pushes a foot out of a wall and refuses a slot too narrow', () => {
  const walls = [{ x0: 0, x1: 1, y0: 0, y1: 8, z0: -5, z1: 5 }]; const s = { x: 1.1, y: 0, z: 0, c: null };
  assert(clearSpot(s, 0.3, 1, walls)); assert(Math.abs(s.x - 1.3) < 1e-9);
  const slot = [...walls, { x0: 1.4, x1: 2, y0: 0, y1: 8, z0: -5, z1: 5 }]; assert.equal(clearSpot({ x: 1.2, y: 0, z: 0, c: null }, 0.3, 1, slot), false);
});

// ---- setting down: exact, on triangles. A table 2 ft high (x 0..4, z 0..2), a wall at x = 4, a shelf over part of it at 3 ft, the floor ----
const quad = (a, b, c, d) => [...a, ...b, ...c, ...a, ...c, ...d];
const soupA = [
  ...quad([-10, 0, -10], [-10, 0, 10], [10, 0, 10], [10, 0, -10]),                // floor
  ...quad([0, 2, 0], [0, 2, 2], [4, 2, 2], [4, 2, 0]),                          // table top
  ...quad([0, 0, 2], [4, 0, 2], [4, 2, 2], [0, 2, 2]),                          // its front apron
  ...quad([4, 0, -10], [4, 8, -10], [4, 8, 10], [4, 0, 10]),                    // wall
  ...quad([3, 3, 0], [3, 3, 2], [4, 3, 2], [4, 3, 0]),                          // shelf over the table's far end
  ...quad([3, 2.9, 0], [4, 2.9, 0], [4, 2.9, 2], [3, 2.9, 2]),                  // its underside
];
const soup = new Float32Array(soupA), N = soup.length / 9;
ok('raySoup: the table top from above (normal up), the wall level (normal sideways)', () => {
  const h = {}; assert(raySoup(h, soup, N, 1, 5, 4, ...unit(0, -3, -3))); assert(Math.abs(h.y - 2) < 1e-5 && h.ny > 0.99 && Math.abs(h.z - 1) < 1e-5);
  assert(raySoup(h, soup, N, 1, 5, 5, 1, 0, 0)); assert(Math.abs(h.x - 4) < 1e-5 && Math.abs(h.ny) < 1e-6);
  assert.equal(raySoup(h, soup, N, 1, 5, 4, 0, 1, 0), null);
});
ok('dropSoup: rests on the table, not in it and not above it; half off the edge it reports where the table is', () => {
  const d = {}; assert(dropSoup(d, soup, N, 1, 1, 2.3, 0.3)); assert(Math.abs(d.y - 2) < 1e-6 && d.on === 5 && d.mid);
  assert(dropSoup(d, soup, N, 1, 1.95, 2.3, 0.3)); assert(Math.abs(d.y - 2) < 1e-6 && d.on === 4 && d.mz < 1.95);      // one of the five is over the floor
  assert(dropSoup(d, soup, N, 1, 5, 0.3, 0.3)); assert(Math.abs(d.y) < 1e-6 && d.on === 5);                            // the floor
  assert.equal(dropSoup(d, soup, N, 50, 50, 0.3, 0.3), null);                                                          // nothing there
});
ok('headroom: a tall vase does not fit under the shelf; a short one does; anything fits in the open', () => {
  assert.equal(headroom(soup, N, 3.5, 1, 2, 1.4, 0.2), false); assert.equal(headroom(soup, N, 3.5, 1, 2, 0.8, 0.2), true); assert.equal(headroom(soup, N, 1, 1, 2, 1.4, 0.2), true);
});
ok('feel: too near the wall it is pushed away by the overlap; in the open nothing', () => {
  const p = {}; const w = feel(p, soup, N, 3.9, 2.3, 1, 0.3); assert(Math.abs(w - 0.2) < 1e-4 && Math.abs(p.x + 0.2) < 0.01 && Math.abs(p.z) < 0.01);
  assert.equal(feel(p, soup, N, 1, 2.3, 1, 0.3), 0);
});

// ---- which book is aimed at ----
ok('book index: picks the nearest box on the line of sight, nothing when looking away or out of reach', () => {
  const B = [{ x: 0, y: 5, z: -4, sx: 0.1, sy: 0.8, sz: 0.5 }, { x: 0.1, y: 5, z: -4, sx: 0.1, sy: 0.8, sz: 0.5 }, { x: 0, y: 5, z: -4.6, sx: 0.1, sy: 0.8, sz: 0.5 }, { x: 30, y: 5, z: 30, sx: 0.1, sy: 0.8, sz: 0.5 }];
  const ix = makeBookIndex(B);
  assert.equal(ix.pick(0.01, 5, 0, 0, 0, -1), 0); assert(Math.abs(ix.t - 3.75) < 1e-9);
  assert.equal(ix.pick(0.11, 5, 0, 0, 0, -1), 1); assert.equal(ix.pick(0, 5, 0, 0, 0, 1), -1); assert.equal(ix.pick(0, 5, 3, 0, 0, -1), -1);
  assert.equal(ix.pick(0, 5.2, -1, ...unit(0.01, -0.02, -1)), 0);
});

// ---- what a book contains: the honesty rule ----
ok(`every one of the ${books.length} books holds something, and the same thing every time`, () => {
  for (const b of books) { const a = contentFor(b), c = contentFor({ ...b }); assert(a && a.text && a.text.length > 2, b.title); assert.deepEqual(a, c); if (a.kind !== 'quote') assert(a.label && !/\{\w+\}/.test(a.text + a.label + (a.by ?? '')), 'unfilled: ' + b.title); }
});
ok('a passage of the book itself appears only where quotes.js marks it verified, with its source; everything else is the house\'s', () => {
  const titles = new Map(books.map(b => [b.title, b])); let quoted = 0;
  for (const [t, q] of Object.entries(QUOTES)) {
    assert(titles.has(t), 'not a book on the shelves: ' + t); const b = titles.get(t);
    assert.equal(q.author, b.author ?? '', 'author differs: ' + t); assert.equal(q.verified, true); assert(/^https:\/\/www\.gutenberg\.org\/cache\/epub\/\d+\/pg\d+\.txt$/.test(q.source), 'source: ' + t);
    assert(b.year < 1929, 'not before 1929: ' + t); assert(q.text.length > 10 && q.text.length < 420);
  }
  for (const b of books) { const c = contentFor(b); if (c.kind === 'quote') { quoted++; const q = QUOTES[b.title]; assert(q && q.verified && c.source === q.source && c.text === q.text); } else assert(!('source' in c)); }
  assert.equal(quoted, books.filter(b => QUOTES[b.title]).length); console.log(`       (${Object.keys(QUOTES).length} passages; ${quoted} books show one)`);
  // an unverified entry, or one whose author does not match, is never shown
  QUOTES.__t = { author: 'X', text: 'Not a real line at all.', source: 'https://example.org', verified: false };
  assert.notEqual(contentFor({ title: '__t', author: 'X', shelf: 'essays' }).kind, 'quote'); delete QUOTES.__t;
  assert.notEqual(contentFor({ title: 'Walden', author: 'Somebody Else', shelf: 'essays' }).kind, 'quote');
});
ok('notes: none claims to be the book; kinds are known; books from Anna\'s own shelf get the personal ones; shelves differ', () => {
  const kinds = new Set(['flyleaf', 'margin', 'slip', 'gift', 'flower', 'library', 'receipt', 'ticket', 'postcard', 'photo', 'plate']);
  const allNotes = [...NOTES.personal, ...NOTES.any, ...Object.values(NOTES.shelf).flat()];
  for (const x of allNotes) { assert(kinds.has(x.k), x.k); assert(!/\{(title|author)\}/.test(x.t)); }
  for (const s of new Set(books.map(b => b.shelf))) assert(NOTES.shelf[s]?.length >= 4, 'no notes for shelf ' + s);
  for (const b of books.filter(b => b.from_annas_shelf)) assert(NOTES.personal.some(p => contentFor(b).text === p.t), b.title);
  const seen = new Set(books.map(b => contentFor(b).text)); assert(seen.size > 400, 'variety: ' + seen.size); console.log(`       (${allNotes.length} notes written; ${seen.size} different things across the shelves)`);
});

// ---- the shell ----
ok('every command answers; unknown ones answer in character; the menu is all real commands', () => {
  let played = 0;
  const sh = makeShell({ hour: () => 14.5, next: () => { played++; return 'A Record'; }, robots: () => [{ who: 'Mortimer', room: 'Library', task: 'dusting' }], books: () => ['Walden, Henry David Thoreau'], guests: () => ['Ines: lovely'], held: () => 'apple' });
  for (const c of sh.commands) { const r = sh.run(c); assert(Array.isArray(r.out) && r.out.every(l => typeof l === 'string'), c); if (c !== 'clear') assert(r.out.length, c); }
  for (const m of MENU) assert(sh.commands.includes(m.split(' ')[0]), m);
  for (const f of sh.files) assert(sh.run('cat ' + f).out.length > 0, f);
  assert(/14:30, afternoon/.test(sh.run('date').out[0])); assert(played >= 1 && /A Record/.test(sh.run('play').out[0]));
  assert(/Mortimer/.test(sh.run('robots').out[0])); assert(/Walden/.test(sh.run('books').out.join())); assert(/Ines/.test(sh.run('cat guestbook.txt').out.join()));
  assert(sh.run('ls').out[0].includes('todo.txt') && !sh.run('ls').out[0].includes('.diary') && sh.run('ls -a').out[0].includes('.diary') && sh.run('ls thesis').out[0].includes('abstract.txt'));
  assert(sh.run('exit').exit && sh.run('clear').clear); assert(/no such file/.test(sh.run('cat nope').out[0]));
  const u1 = sh.run('frobnicate').out[0], u2 = sh.run('frobnicate').out[0]; assert(u1.includes('frobnicate') && u1 !== u2);
  assert.deepEqual(sh.run('').out, []); assert(sh.run('constructor').out[0].includes('constructor'));
  const bare = makeShell(); for (const c of bare.commands) assert(Array.isArray(bare.run(c).out), 'bare ' + c);
});
ok('the toys: tokens, trees, plurals', () => {
  assert.deepEqual(tokenize("Don't panic, it's fine."), ["Don't", 'panic', ',', "it's", 'fine', '.']);
  assert.equal(parse('the old butler brings warm tea to the porch'), '[S [NP [D the] [A old] [N butler]] [VP [V brings] [NP [A warm] [N tea]] [PP [P to] [NP [D the] [N porch]]]]]');
  assert(parse('the old man the boats').startsWith('[S [NP [D the] [N old]] [VP [V man] [NP [D the] [N boats]]]]')); assert.equal(parse('of of of'), null);
  assert(plural('wug')[0].startsWith('wugs')); assert(plural('bus')[0].startsWith('buses')); assert(plural('cat')[0].includes('/-s/'));
});
ok('data: every thing has a name and a line; food is marked; no cats', () => {
  for (const [id, T] of Object.entries({ ...THINGS, ...SNACKS })) { assert(T.n && (T.l || T.take), id); if (T.eat) assert(T.eat === 'whole' || (Array.isArray(T.eat) && T.eat.length), id); assert(!/\bcats?\b/i.test(id + ' ' + T.n + ' ' + (T.l ?? '')), id); }
  for (const id of ['croissant', 'st_bread_1', 'st_cake_stand', 'chess_set', 'st_vintage_phone']) assert(!THINGS[id], id + ' belongs to another part of the house');
});
console.log(`\n${n} groups passed`);
