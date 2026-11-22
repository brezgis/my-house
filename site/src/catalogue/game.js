// Sir Reginald's Rounds: the game on the disc from the catalogue, played on the pink computer.
// Sir Reginald (the vacuum, staff/roomba.js) trundles in a straight line until he meets
// something, hoovering every crumb he passes over. Clear the room; par is the fewest moves.
//
//   GAME                              { title, blurb } for the desktop icon
//   mountGame(el, { sound, onQuit })  builds the game inside el; returns { destroy() }
//
// The top half is the rules and the rooms, with no DOM in it, so that game.test.mjs can
// solve every level in node:   node site/src/catalogue/game.test.mjs
// Three twists, met one at a time: a rug stops him; a butler floats to his next spot after
// every move and is in the way wherever he is; a sock, if eaten, jams him (undo or restart).
// Progress is kept in localStorage under 'catalogue:game'. Nothing is loaded or sent.

export const GAME = { title: "Sir Reginald's Rounds", blurb: 'Twelve rooms, a great many crumbs, and one vacuum who goes until he bumps.' };

// ---- The rooms ---------------------------------------------------------------------------
// 9 x 7 tiles.  R Reginald   o crumb   = rug   % crumb on a rug   s sock   1 2 3 the butler's
// round (he starts at 1)   . floor.   Furniture, all solid: T table  P plant  B bookcase
// C chair  K counter  D bed  M the desk with the pink computer  # wall.
// par is the fewest moves there is; the test checks every one against a solver.
export const COLS = 9, ROWS = 7;
export const LEVELS = [
  { name: 'Hall', par: 3, say: 'Arrow keys, or a swipe. He goes until something stops him. Crumbs are the whole point.',
    map: ['..o......', '.Po....T.', '.........', '....T....', '.........', '.T..oRoP.', '.........'] },
  { name: 'Dining room', par: 4, say: 'Somebody had toast in here. Reginald does not ask who. It was A.',
    map: ['...o...o.', '..C.C.C..', '..TTTTT..', '.oC.C.C..', '.........', 'P..oRo..K', '......KKK'] },
  { name: 'Back hall', par: 5, say: 'Boots, coats, and the crumbs people believe they left outside.',
    map: ['###...###', '###.P.###', '......o..', '.T.oRo.B.', 'o....o...', '###...###', '###...###'] },
  { name: 'Library', par: 5, say: 'Biscuits among the first editions. Quietly, please.',
    map: ['BBBB.BBBB', '.......o.', '.B..C.oB.', '.B.....B.', '....T....', '.C..oRoP.', 'BB.o...BB'] },
  { name: 'Living room', par: 5, say: 'A rug stops him dead. He regards rugs as a personal matter.',
    map: ['P..CCC...', '.......o.', '...==.o.C', '...T=o..C', '....o....', '....R=...', 'B.....oP.'] },
  { name: 'Coffee bar', par: 6, say: 'Biscotti: of all the biscuits, the most widely scattered.',
    map: ['KKKKKK..P', '.......oo', '.C.C.C...', '.o..R..=.', '..T....o.', '.....T.=o', 'P........'] },
  { name: 'Kitchen', par: 6, who: 'Mortimer', say: 'Mortimer floats to his next spot after every move. He will not be going round you.',
    map: ['KKKKKKK..', '........K', 'o.1...2.K', '.o.KKK.o.', '..R....oK', '.3.......', 'KK....P.o'] },
  { name: 'Office', par: 8, who: 'Bartholomew', say: 'Bartholomew is supervising. A. is at the pink computer, playing something about a vacuum.',
    map: ['BB..TM..P', '...o.....', '.1.....2.', '..R==o...', '.o.==..C.', '.T.......', 'o.o.3.o.B'] },
  { name: 'Upstairs hall', par: 7, say: 'Fig carried him upstairs. He was not consulted. Do not let him eat a sock.',
    map: ['###...P.o', '###......', '....s....', '.To.R..o.', 'o.o...s..', '..P....B.', '.........'] },
  { name: 'Guest room', par: 9, say: 'Guests eat in bed. One does not mention it. One hoovers.',
    map: ['P.DD.....', '..DD...T.', '.........', '.==..s...', 'o==..R.o.', '.o....C..', 'Boo.so..P'] },
  { name: 'Dressing room', par: 10, who: 'Fig', say: 'Fig is putting the socks away. Some of the socks have not been told.',
    map: ['BBB...BBB', '....s.o.o', 'o1...Ro2.', '...C.....', '.s...o.s.', '....3.o..', 'P..TT...B'] },
  { name: 'Bedroom', par: 12, who: 'Fig', say: 'A rug, two socks and Fig, all at once. Reginald has trained for this.',
    map: ['B..DDD..P', '...DDD...', 'o1..=..2R', 's...=..o.', '...oo..so', '.To.3..C.', '....B.o..'] },
];

// ---- The rules (pure) --------------------------------------------------------------------
const SOLID = 'TPBCKDM#';
const DXY = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };

export function parse(level) {
  const kind = [], crumbs = [], rug = new Set(), sock = new Set(), spots = [];
  let start = 0;
  level.map.forEach((row, y) => [...row].forEach((ch, x) => {
    const i = y * COLS + x;
    kind[i] = SOLID.includes(ch) ? ch : '';
    if (ch === 'R') start = i;
    if (ch === 'o' || ch === '%') crumbs.push(i);
    if (ch === '=' || ch === '%') rug.add(i);
    if (ch === 's') sock.add(i);
    if (ch >= '1' && ch <= '9') spots[+ch - 1] = i;
  }));
  return { kind, crumbs, rug, sock, spots, start, crumbAt: new Map(crumbs.map((c, n) => [c, n])), all: (1 << crumbs.length) - 1 };
}
// A state: p his tile, eaten a bit per crumb, ph where the butler is on his round, jam a sock eaten
export const begin = lv => ({ p: lv.start, eaten: 0, ph: 0, jam: false });
export const solved = (lv, s) => !s.jam && s.eaten === lv.all;

// One press of an arrow. Returns the new state (with path, the tiles crossed, and got, the
// crumbs' tiles), or null if he cannot move that way at all: that is not a move, and the
// butler stays where he is.
export function step(lv, s, dir) {
  if (s.jam || !DXY[dir]) return null;
  const [dx, dy] = DXY[dir], path = [], got = [];
  let x = s.p % COLS, y = (s.p / COLS) | 0, eaten = s.eaten, jam = false;
  for (;;) {
    const nx = x + dx, ny = y + dy, n = ny * COLS + nx;
    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || lv.kind[n] || lv.spots[s.ph] === n) break;
    x = nx; y = ny; path.push(n);
    const c = lv.crumbAt.get(n);
    if (c !== undefined && !(eaten >> c & 1)) { eaten |= 1 << c; got.push(n); }
    if (lv.sock.has(n)) { jam = true; break; }
    if (lv.rug.has(n)) break;
  }
  if (!path.length) return null;
  // the butler moves on, unless Reginald has stopped on his next spot (then he waits a turn)
  const p = y * COLS + x, next = lv.spots.length ? (s.ph + 1) % lv.spots.length : 0;
  return { p, eaten, jam, ph: jam || lv.spots[next] === p ? s.ph : next, path, got };
}

// Breadth-first: the fewest moves, one such solution, and how many there are. null if none.
export function solve(level) {
  const lv = level.kind ? level : parse(level), s0 = begin(lv), key = s => (s.p * 16 + s.ph) * 4096 + s.eaten;
  const ways = new Map([[key(s0), 1]]);
  let q = [[s0, '']], n = 0;
  while (q.length) {
    const done = q.filter(([s]) => solved(lv, s));
    if (done.length) return { n, moves: done[0][1], ways: done.reduce((a, [s]) => a + ways.get(key(s)), 0), states: ways.size };
    const next = new Map();
    for (const [s, m] of q) for (const d of 'UDLR') {
      const t = step(lv, s, d);
      if (!t || t.jam) continue;
      const k = key(t);
      if (!next.has(k)) { if (ways.has(k)) continue; next.set(k, [t, m + d]); ways.set(k, 0); }
      ways.set(k, ways.get(k) + ways.get(key(s)));
    }
    q = [...next.values()]; n++;
  }
  return null;
}

// What is remembered: the best number of moves for each room solved (null: not yet)
const KEY = 'catalogue:game';
export function readBest(text) {
  let b = null;
  try { b = JSON.parse(text ?? 'null')?.best; } catch { /* nonsense: start afresh */ }
  return LEVELS.map((_, i) => (Array.isArray(b) && Number.isInteger(b[i]) && b[i] > 0 ? b[i] : null));
}

// ---- The screen ----------------------------------------------------------------------------
const PARSED = LEVELS.map(parse);
const TILE = 16, EDGE = 4, LW = COLS * TILE + EDGE * 2, LH = ROWS * TILE + EDGE * 2;
const INK = '#3a2238', WHITE = '#fff', PINK = '#ff6f9f', PINKD = '#d9477c', PINKL = '#ffc4d8', MINT = '#7fd6bd', MINTD = '#3f9f88', MINTL = '#c6f0e3',
  YEL = '#ffd45e', WOOD = '#cf9150', WOODD = '#96602f', WOODL = '#e6b47a', FLOOR = ['#fff3df', '#fbe5c6'], CRUMB = '#b06a26', CRUMBL = '#e3a551',
  BODY = '#4b4759', BODYL = '#77728a', DUST = '#bfa58c';
const BUTLER = { Bartholomew: '#9a6fd6', Mortimer: '#6f9bd1', Fig: '#7cc46a' };
const CSS = `
.cg-root{--ink:${INK};box-sizing:border-box;min-height:100%;padding:8px;background:#ffe6ee;color:var(--ink);font:bold 11px/1.35 Chicago,Charcoal,Geneva,"Lucida Grande",Verdana,sans-serif;outline:none;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent}
.cg-root *{box-sizing:border-box}
.cg-main{display:flex;gap:10px}
.cg-canvas{display:block;flex:none;image-rendering:pixelated;touch-action:none;box-shadow:2px 2px 0 var(--ink)}
.cg-side{flex:1;min-width:0;display:flex;flex-direction:column;gap:5px}
.cg-title{display:flex;align-items:center;gap:5px;white-space:nowrap}
.cg-title::before,.cg-title::after{content:"";flex:1;height:9px;background:repeating-linear-gradient(var(--ink) 0 1px,transparent 1px 2px)}
.cg-room{font-size:13px}
.cg-stat,.cg-line{font-weight:normal;margin:0}
.cg-line{flex:1;min-height:5.4em}
.cg-b{font:inherit;color:var(--ink);background:#fff;border:2px solid var(--ink);border-radius:4px;box-shadow:2px 2px 0 var(--ink);padding:2px 7px;min-height:24px;margin:0;cursor:pointer}
.cg-b:active:not(:disabled){transform:translate(2px,2px);box-shadow:none}
.cg-b:disabled{opacity:.38;cursor:default}
.cg-b:focus-visible{outline:2px dotted ${PINKD};outline-offset:2px}
.cg-pad{display:grid;grid-template-columns:repeat(3,30px);grid-template-rows:26px 26px;gap:5px;justify-content:center;margin-bottom:3px}
.cg-pad .cg-b{padding:0}
.cg-ar{display:block;margin:auto;width:0;height:0;border:6px solid transparent}
.cg-U{border-top-width:0;border-bottom-color:var(--ink)}.cg-D{border-bottom-width:0;border-top-color:var(--ink)}
.cg-L{border-left-width:0;border-right-color:var(--ink)}.cg-R{border-right-width:0;border-left-color:var(--ink)}
.cg-acts{display:flex;gap:6px;flex-wrap:wrap;justify-content:center}
.cg-go:not(:disabled){background:${PINK};color:#fff}
.cg-levels{display:flex;flex-wrap:wrap;gap:6px;margin-top:11px;align-items:center}
.cg-lv{min-width:27px;padding:2px 0}
.cg-done{background:${MINTL}}.cg-par{background:${YEL}}.cg-cur{background:var(--ink);color:#fff}
.cg-quit{margin-left:auto}
.cg-narrow .cg-main{flex-direction:column;align-items:center}
.cg-narrow .cg-title{display:none}
.cg-narrow .cg-side{align-self:stretch;display:grid;grid-template-columns:1fr auto;grid-template-rows:auto auto 1fr;column-gap:8px}
.cg-narrow .cg-pad{grid-column:2;grid-row:1/4;align-self:center}
.cg-narrow .cg-line{min-height:4em}
.cg-narrow .cg-acts{grid-column:1/3}
`;

export function mountGame(el, { sound, onQuit, save = true, level, moves } = {}) {
  const doc = el.ownerDocument, win = doc.defaultView;
  if (!doc.querySelector('style[data-cg]')) { const st = doc.createElement('style'); st.dataset.cg = ''; st.textContent = CSS; doc.head.appendChild(st); }
  const mk = (tag, cls, text, parent) => { const n = doc.createElement(tag); n.className = cls; if (text) n.textContent = text; parent?.appendChild(n); return n; };
  const button = (cls, text, title, parent, act) => { const b = mk('button', 'cg-b ' + cls, text, parent); b.type = 'button'; if (title) { b.title = title; b.setAttribute('aria-label', title); } b.addEventListener('click', act); return b; };

  const root = mk('div', 'cg-root'); root.tabIndex = 0; root.setAttribute('aria-label', GAME.title);
  const main = mk('div', 'cg-main', '', root), canvas = mk('canvas', 'cg-canvas', '', main), g = canvas.getContext('2d');
  const side = mk('div', 'cg-side', '', main);
  mk('div', 'cg-title', GAME.title, side);
  const roomEl = mk('div', 'cg-room', '', side), statEl = mk('div', 'cg-stat', '', side), lineEl = mk('p', 'cg-line', '', side);
  lineEl.setAttribute('aria-live', 'polite');
  const pad = mk('div', 'cg-pad', '', side);
  for (const [d, name, col, row] of [['U', 'Up', 2, 1], ['L', 'Left', 1, 2], ['D', 'Down', 2, 2], ['R', 'Right', 3, 2]]) {
    const b = button('', '', name, pad, () => go(d)); b.style.gridColumn = col; b.style.gridRow = row; mk('span', 'cg-ar cg-' + d, '', b);
  }
  const acts = mk('div', 'cg-acts', '', side);
  const undoB = button('', 'Undo', 'Undo (U)', acts, () => undo()), againB = button('', 'Restart', 'Restart (R)', acts, () => load(at));
  const nextB = button('cg-go', 'Next', 'Next room (N)', acts, () => next());
  const row = mk('div', 'cg-levels', '', root);
  const lvB = LEVELS.map((L, i) => button('cg-lv', String(i + 1), L.name, row, () => load(i)));
  if (onQuit) button('cg-quit', 'Quit', 'Quit', row, () => onQuit());
  el.appendChild(root);

  // ---- what is going on ----
  let best = LEVELS.map(() => null);
  if (save) try { best = readBest(win.localStorage.getItem(KEY)); } catch { /* no storage: this sitting only */ }
  const keep = () => { if (save) try { win.localStorage.setItem(KEY, JSON.stringify({ best })); } catch { /* this sitting only */ } };
  let at = 0, lv = PARSED[0], cur = begin(lv), hist = [], won = false, face = null;
  let anim = null, puffs = [], wiggle = 0, raf = 0, k = 2, dead = false;
  const blip = (...a) => { try { sound?.note?.(...a); } catch { /* silence is fine */ } };

  function load(i) {
    at = i; lv = PARSED[i]; cur = begin(lv); hist = []; won = false; face = null; anim = null; puffs = []; wiggle = 0;
    hud(); draw();
  }
  function hud() {
    const L = LEVELS[at], n = hist.length, b = best[at];
    roomEl.textContent = `${at + 1}. ${L.name}`;
    statEl.textContent = `Moves ${n}  ·  Par ${L.par}  ·  Best ${b ?? '–'}`;
    lineEl.textContent = cur.jam ? 'He has eaten a sock. He regrets it deeply. Undo (U) or start again (R).'
      : !won ? L.say
      : best.every(Boolean) && at === LEVELS.length - 1 ? `Every room done${n <= L.par ? ', and this one in par' : ''}. Reginald returns to his dock and thinks about nothing at all.`
      : n <= L.par ? 'Spotless, and in par. He permits himself a small wiggle.'
      : `Spotless in ${n}. It can be done in ${L.par}. Mortimer has made a note.`;
    undoB.disabled = !n; againB.disabled = !n;
    nextB.disabled = at === LEVELS.length - 1 || !(won || b);
    nextB.classList.toggle('cg-go', won);
    const f = doc.activeElement;                                      // a button that has just greyed out under the finger would swallow the keys
    if (f?.disabled && root.contains(f)) root.focus({ preventScroll: true });
    lvB.forEach((x, i) => { x.className = 'cg-b cg-lv' + (i === at ? ' cg-cur' : best[i] === null ? '' : best[i] <= LEVELS[i].par ? ' cg-par' : ' cg-done'); });
  }
  const centre = i => [EDGE + (i % COLS) * TILE + 8, EDGE + ((i / COLS) | 0) * TILE + 8];

  function go(dir, instant) {
    if (anim) settle();
    if (won || cur.jam) return;
    face = dir;
    const t = step(lv, cur, dir), now = win.performance.now();
    if (!t) { if (!instant) { anim = { nudge: dir, t0: now, durA: 130, durB: 0 }; kick(); } return; }
    hist.push(cur);
    const from = cur; cur = { p: t.p, eaten: t.eaten, ph: t.ph, jam: t.jam };
    statEl.textContent = statEl.textContent.replace(/\d+/, hist.length); undoB.disabled = againB.disabled = false;
    if (instant) { arrive(t, true); return; }
    anim = { from, t, dir, t0: now, durA: 80 + 55 * t.path.length, durB: from.ph !== t.ph ? 220 : 0 };
    puff(from.p, dir, -1, now);
    t.got.forEach((c, n) => blip(79 + 2 * n, t.path.indexOf(c) * 0.05, 0.3, 0.05));
    kick();
  }
  // the slide is over (or was cut short by the next key): dust where he bumped, and is that the room done?
  function settle() {
    const a = anim; anim = null;
    if (a?.t) arrive(a.t, false);
  }
  function arrive(t, instant) {
    const now = win.performance.now();
    if (!instant && !cur.jam) puff(cur.p, face, 1, now);
    if (cur.jam && !instant) blip(45, 0, 0.5, 0.07);
    if (solved(lv, cur)) {
      won = true; wiggle = instant ? 0 : now + 900;
      if (best[at] === null || hist.length < best[at]) { best[at] = hist.length; keep(); }
      if (!instant) [72, 76, 79].forEach((m, n) => blip(m, 0.05 + n * 0.09, 0.7, 0.07));
    }
    hud(); if (instant) draw(); else kick();
  }
  function undo() {
    if (anim) settle();
    if (!hist.length) return;
    cur = hist.pop(); won = false; wiggle = 0; face = null; hud(); draw();
  }
  function next() { if (anim) settle(); if (!nextB.disabled) load(at + 1); }
  function puff(i, dir, sign, now) { const [x, y] = centre(i), [dx, dy] = DXY[dir]; puffs.push({ x: x + dx * 7 * sign, y: y + dy * 7 * sign, dx: dy, dy: dx, t0: now }); }

  // ---- drawing: little rectangles, snapped to whole screen pixels ----
  // org() sets where a 16 x 16 drawing goes; for a floor tile it also notes the tile's exact size
  // on screen, so that at odd scales neighbouring tiles meet with no seam between them.
  let OX = 0, OY = 0, SW = 0, SH = 0;
  const sx = v => Math.round(v * k);
  const org = (x, y, tile) => { OX = sx(x); OY = sx(y); SW = tile ? sx(x + 16) - OX : sx(16); SH = tile ? sx(y + 16) - OY : sx(16); };
  const fit = (v, S) => (v >= 16 ? S + sx(v - 16) : Math.min(S, sx(v)));
  const r = (x, y, w, h, c) => { const x0 = fit(x, SW), y0 = fit(y, SH); g.fillStyle = c; g.fillRect(OX + x0, OY + y0, fit(x + w, SW) - x0, fit(y + h, SH) - y0); };
  const disc = (cx, cy, rad, c) => { for (let dy = -rad; dy < rad; dy++) { const w = Math.round(Math.sqrt(rad * rad - (dy + 0.5) ** 2)); r(cx - w, cy + dy, w * 2, 1, c); } };
  // a solid thing: its colour, a darker front edge, and an ink line wherever it does not carry on next door
  function block(same, fill, edge) {
    r(0, 0, 16, 16, fill);
    if (!same(0, 1)) { r(0, 13, 16, 2, edge); r(0, 15, 16, 1, INK); }
    if (!same(0, -1)) r(0, 0, 16, 1, INK);
    if (!same(-1, 0)) r(0, 0, 1, 16, INK);
    if (!same(1, 0)) r(15, 0, 1, 16, INK);
  }
  function furniture(ch, x, y, same) {
    if (ch === 'T') { block(same, WOOD, WOODD); r(2, 2, 12, 1, WOODL); disc(8, 8, 4, INK); disc(8, 8, 3, WHITE); r(7, 7, 2, 2, PINKL); }
    else if (ch === 'M') { block(same, WOOD, WOODD); r(2, 1, 12, 11, INK); r(3, 2, 10, 9, PINK); r(4, 3, 8, 6, MINTL); r(5, 4, 2, 1, WHITE); r(10, 10, 2, 1, WHITE); r(4, 12, 8, 1, PINKD); }
    else if (ch === 'P') { r(3, 13, 10, 2, 'rgba(58,34,56,.18)'); r(3, 0, 10, 10, INK); r(2, 1, 12, 8, INK); r(4, 1, 8, 8, MINTD); r(3, 2, 10, 6, MINTD); r(4, 2, 3, 2, MINT); r(9, 3, 3, 2, MINT); r(6, 6, 3, 2, MINT); r(4, 9, 8, 6, INK); r(5, 10, 6, 4, '#d9794a'); r(5, 10, 6, 1, '#f0a070'); }
    else if (ch === 'B') {
      block(same, '#7a4a2c', '#553018');
      const cols = [PINK, MINT, YEL, WHITE, PINKD, MINTD];
      for (const sy of [2, 8]) for (let n = 0; n < 6; n++) { const h = 4 - ((n + x + sy) % 3 === 0); r(2 + n * 2, sy + 4 - h, 2, h, cols[(n * 5 + x * 3 + y + sy) % 6]); }
    }
    else if (ch === 'C') { block(same, PINK, PINKD); r(1, 1, 14, 3, PINKD); if (!same(-1, 0)) r(1, 3, 3, 10, PINKD); if (!same(1, 0)) r(12, 3, 3, 10, PINKD); r(5, 6, 6, 5, PINKL); }
    else if (ch === 'K') { block(same, '#fff9ef', MINTD); r(same(-1, 0) ? 0 : 2, 3, 16 - (same(-1, 0) ? 0 : 2) - (same(1, 0) ? 0 : 2), 1, MINT); if ((x + y) % 2) { r(5, 6, 6, 5, INK); r(6, 7, 4, 3, WHITE); r(7, 8, 2, 1, WOODD); } }
    else if (ch === 'D') {
      if (!same(0, -1)) { block(same, WHITE, PINKD); r(2, 3, 12, 9, PINKL); r(3, 4, 10, 7, WHITE); }
      else { block(same, PINK, PINKD); r(0, 0, 16, 2, PINKL); r(3, 5, 2, 2, PINKL); r(10, 8, 2, 2, PINKL); if (!same(-1, 0)) r(0, 0, 1, 16, INK); if (!same(1, 0)) r(15, 0, 1, 16, INK); }
    }
    else { block(same, '#6d4a6c', '#4f3050'); r(1, 5, 14, 1, '#4f3050'); r(1, 10, 14, 1, '#4f3050'); r(8, 1, 1, 4, '#4f3050'); r(4, 6, 1, 4, '#4f3050'); r(11, 6, 1, 4, '#4f3050'); }
  }
  function reginald(x, y, dir, mood, now) {
    org(x - 8, y - 8);
    disc(8, 9, 7, 'rgba(58,34,56,.28)'); disc(8, 8, 7, INK); disc(8, 8, 6, BODY);
    r(4, 13, 8, 1, BODYL); r(7, 10, 2, 2, mood === 'jam' ? YEL : PINK);
    if (mood === 'jam') { r(10, 9, 7, 5, INK); r(10, 10, 6, 3, WHITE); r(14, 10, 2, 3, PINK); r(11, 10, 1, 3, PINK); }      // the sock, not quite gone
    [3, 9].forEach((ex, n) => {
      r(ex + 1, 3, 3, 5, WHITE); r(ex, 4, 5, 3, WHITE);
      if (mood === 'jam') { for (const [a, b] of [[1, 3], [3, 3], [2, 4], [1, 5], [3, 5]].map(([a, b]) => [a, b - 1])) r(ex + a, b + 1, 1, 1, INK); return; }
      let px = n ? 1 : 2, py = 2;                                    // at rest: very slightly cross-eyed
      if (mood === 'glad') { const a = now / 70 + n * 2.4; px = 1.5 + Math.cos(a) * 1.5; py = 1.5 + Math.sin(a) * 1.5; }
      else if (dir) { px = 1.5 + DXY[dir][0] * 1.5; py = 1.5 + DXY[dir][1] * 1.5; }
      r(ex + Math.round(px), 3 + Math.round(py), 2, 2, INK);
    });
  }
  function butler(x, y, col) {
    org(x - 8, y - 8);
    r(4, 14, 8, 2, 'rgba(58,34,56,.25)');
    r(4, -2, 8, 7, INK); r(5, -1, 6, 5, col); r(6, 0, 4, 3, INK); r(6, 1, 1, 1, MINTL); r(9, 1, 1, 1, MINTL);
    r(3, 5, 10, 6, INK); r(4, 5, 8, 5, col); r(5, 11, 6, 1, INK); r(7, 6, 2, 1, WHITE); r(6, 6, 1, 2, PINK); r(9, 6, 1, 2, PINK);
  }

  function draw(now = win.performance.now()) {
    if (dead) return;
    // where everything is just now
    let [rx, ry] = centre(cur.p), eaten = cur.eaten, ph = cur.ph, bfrom = null, bf = 1, fA = 1;
    if (anim?.nudge) { const [dx, dy] = DXY[anim.nudge], f = Math.sin(Math.max(0, Math.min(1, (now - anim.t0) / anim.durA)) * Math.PI) * 2; rx += dx * f; ry += dy * f; }
    else if (anim) {
      const { from, t } = anim; fA = Math.max(0, Math.min(1, (now - anim.t0) / anim.durA));
      const e = fA < 0.5 ? 2 * fA * fA : 1 - 2 * (1 - fA) ** 2, [x0, y0] = centre(from.p), gone = e * t.path.length;
      rx = x0 + (rx - x0) * e; ry = y0 + (ry - y0) * e;
      eaten = from.eaten; t.got.forEach(c => { if (t.path.indexOf(c) + 0.6 <= gone) eaten |= 1 << lv.crumbAt.get(c); });
      if (anim.durB) { bfrom = from.ph; bf = Math.max(0, Math.min(1, (now - anim.t0 - anim.durA) / anim.durB)); }
    }
    [[0, INK], [1, PINK], [3, INK]].forEach(([d, c]) => { g.fillStyle = c; g.fillRect(sx(d), sx(d), canvas.width - 2 * sx(d), canvas.height - 2 * sx(d)); });
    for (let i = 0; i < COLS * ROWS; i++) {
      const x = i % COLS, y = (i / COLS) | 0, ch = lv.kind[i];
      org(EDGE + x * TILE, EDGE + y * TILE, true); r(0, 0, 16, 16, FLOOR[(x + y) & 1]);
      const nb = set => (dx, dy) => x + dx >= 0 && x + dx < COLS && set(i + dx + dy * COLS);
      if (lv.rug.has(i)) {
        const same = nb(j => lv.rug.has(j));
        r(0, 0, 16, 16, MINT); r(7, 6, 2, 4, MINTL); r(6, 7, 4, 2, MINTL);
        if (!same(0, -1)) { r(0, 0, 16, 1, MINTD); r(1, 2, 14, 1, MINTL); } if (!same(0, 1)) { r(0, 15, 16, 1, MINTD); r(1, 13, 14, 1, MINTL); }
        if (!same(-1, 0)) { r(0, 0, 1, 16, MINTD); r(2, 1, 1, 14, MINTL); } if (!same(1, 0)) { r(15, 0, 1, 16, MINTD); r(13, 1, 1, 14, MINTL); }
      }
      if (ch) furniture(ch, x, y, nb(j => lv.kind[j] === ch));
      if (lv.sock.has(i) && !(cur.jam && cur.p === i && fA === 1)) { r(5, 1, 6, 9, INK); r(5, 8, 10, 6, INK); r(6, 2, 4, 8, WHITE); r(6, 9, 8, 4, WHITE); r(6, 3, 4, 1, PINK); r(6, 5, 4, 1, PINK); r(12, 9, 2, 4, PINK); }
      const c = lv.crumbAt.get(i);
      if (c !== undefined && !(eaten >> c & 1)) { r(5, 6, 4, 4, CRUMB); r(6, 6, 2, 2, CRUMBL); r(10, 9, 2, 2, CRUMB); r(10, 5, 1, 1, CRUMB); r(4, 11, 2, 1, CRUMB); r(8, 11, 1, 1, CRUMBL); }
    }
    if (lv.spots.length) {
      const col = BUTLER[LEVELS[at].who] ?? BUTLER.Fig, nextSpot = lv.spots[(ph + 1) % lv.spots.length];
      for (const s of lv.spots) {                                     // his round, marked on the floor; the next stop filled in
        if (s === lv.spots[ph] && bf === 1) continue;
        const [x, y] = centre(s); org(x - 8, y - 8, true); g.globalAlpha = 0.75;
        for (const [a, b] of [[2, 2], [11, 2], [2, 11], [11, 11]]) { r(a, b, 3, 1, col); r(a, b + 2, 3, 1, col); r(a === 2 ? 2 : 13, b, 1, 3, col); }
        if (s === nextSpot) r(6, 6, 4, 4, col);
        g.globalAlpha = 1;
      }
      const [x1, y1] = centre(lv.spots[ph]), [x0, y0] = bfrom === null ? [x1, y1] : centre(lv.spots[bfrom]);
      butler(x0 + (x1 - x0) * bf, y0 + (y1 - y0) * bf, col);
    }
    const glad = won && now < wiggle, left = glad ? (wiggle - now) / 900 : 0;
    reginald(rx + (glad ? Math.sin(now / 45) * 2 * left : 0), ry, face, cur.jam && fA === 1 ? 'jam' : glad ? 'glad' : '', now);
    puffs = puffs.filter(p => now - p.t0 < 340);
    for (const p of puffs) {
      const f = Math.max(0, (now - p.t0) / 340); g.globalAlpha = 0.8 * (1 - f); org(p.x, p.y);
      for (const s of [-1, 0, 1]) { const d = (4 + Math.abs(s)) * f; r(s * d * (p.dx || 0.6) + s * 2 * Math.abs(p.dx) - 1, s * d * (p.dy || 0.6) + s * 2 * Math.abs(p.dy) - 1 - f * 2, 2 + (s === 0), 2 + (s === 0), DUST); }
      g.globalAlpha = 1;
    }
  }
  // frames are drawn only while something moves
  function frame(now) {
    raf = 0; if (dead) return;
    if (anim && now - anim.t0 >= anim.durA + anim.durB) settle();
    draw(now);
    if (anim || puffs.length || now < wiggle) kick();
  }
  function kick() { if (!raf && !dead) raf = win.requestAnimationFrame(frame); }

  // ---- size: the board beside the buttons, or above them when the window is narrow ----
  function size() {
    const w = root.clientWidth; if (!w) return;
    const narrow = w < 430, dpr = win.devicePixelRatio || 1, avail = Math.max(120, narrow ? w - 16 : w - 16 - 178);
    root.classList.toggle('cg-narrow', narrow);
    k = avail * dpr / LW; if (k % 1 < 0.3 && k >= 1.3) k = Math.floor(k);
    canvas.width = Math.round(LW * k); canvas.height = Math.round(LH * k);
    canvas.style.width = canvas.width / dpr + 'px'; canvas.style.height = canvas.height / dpr + 'px';
    draw();
  }
  const ro = win.ResizeObserver ? new win.ResizeObserver(size) : null;
  ro?.observe(root);

  // ---- keys, taps and swipes ----
  const KEYS = { arrowup: 'U', arrowdown: 'D', arrowleft: 'L', arrowright: 'R', w: 'U', s: 'D', a: 'L', d: 'R' };
  function onKey(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const key = (e.key ?? '').toLowerCase();
    if (KEYS[key]) go(KEYS[key]);
    else if (key === 'r') load(at);
    else if (key === 'u' || key === 'z') undo();
    else if (key === 'n' || (key === 'enter' && won && e.target === root)) next();
    else return;                                                      // Escape, Tab and the rest are the window's
    e.preventDefault(); e.stopPropagation();
  }
  let down = null;
  function onDown(e) { down = [e.clientX, e.clientY]; root.focus({ preventScroll: true }); }
  function onUp(e) {
    if (!down) return;
    let dx = e.clientX - down[0], dy = e.clientY - down[1]; down = null;
    if (Math.hypot(dx, dy) < 14) {                                    // a tap: towards where it landed, from where he is
      const b = canvas.getBoundingClientRect(), [x, y] = centre(cur.p);
      dx = (e.clientX - b.left) / b.width * LW - x; dy = (e.clientY - b.top) / b.height * LH - y;
      if (Math.hypot(dx, dy) < 9) return;
    }
    go(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : dy > 0 ? 'D' : 'U');
  }
  const onCancel = () => { down = null; };
  root.addEventListener('keydown', onKey);
  canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onCancel);

  // begin at the first room not yet done (or where the test page says)
  const first = best.indexOf(null);
  load(Math.max(0, Math.min(LEVELS.length - 1, Number.isInteger(level) ? level : first < 0 ? 0 : first)));
  for (const d of moves ?? '') go(d, true);
  size();
  root.focus({ preventScroll: true });

  return {
    destroy() {
      dead = true; ro?.disconnect(); if (raf) win.cancelAnimationFrame(raf);
      root.removeEventListener('keydown', onKey);
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onCancel);
      root.remove();
    },
  };
}
