// The rules of chess, and a modest opponent. No drawing here: toys.js moves the pieces.
// A position is { b: 64 squares (rank * 8 + file, rank 0 is White's first), turn: 'w' | 'b',
// c: castling rights 'KQkq' subset, ep: en-passant target square or -1 }.
// Pieces are letters: PNBRQK for White, pnbrqk for Black, '' for an empty square.

export const start = () => ({
  b: [...'RNBQKBNR', ...'PPPPPPPP', ...Array(32).fill(''), ...'pppppppp', ...'rnbqkbnr'],
  turn: 'w', c: 'KQkq', ep: -1,
});

const white = p => p !== '' && p <= 'Z';
const side = p => (p === '' ? '' : white(p) ? 'w' : 'b');
const KN = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
const DIAG = [[1, 1], [1, -1], [-1, 1], [-1, -1]], ORTH = [[1, 0], [-1, 0], [0, 1], [0, -1]], ALL = [...DIAG, ...ORTH];

// Is square sq attacked by the given side?
export function attacked(b, sq, by) {
  const f = sq & 7, r = sq >> 3, P = by === 'w' ? 'P' : 'p', N = by === 'w' ? 'N' : 'n', B = by === 'w' ? 'B' : 'b', R = by === 'w' ? 'R' : 'r', Q = by === 'w' ? 'Q' : 'q', K = by === 'w' ? 'K' : 'k';
  const pr = r + (by === 'w' ? -1 : 1);
  if (pr >= 0 && pr < 8) { if (f > 0 && b[pr * 8 + f - 1] === P) return true; if (f < 7 && b[pr * 8 + f + 1] === P) return true; }
  for (const [df, dr] of KN) { const x = f + df, y = r + dr; if (x >= 0 && x < 8 && y >= 0 && y < 8 && b[y * 8 + x] === N) return true; }
  for (const [df, dr] of ALL) { const x = f + df, y = r + dr; if (x >= 0 && x < 8 && y >= 0 && y < 8 && b[y * 8 + x] === K) return true; }
  for (const [dirs, A] of [[DIAG, B], [ORTH, R]]) for (const [df, dr] of dirs) {
    let x = f + df, y = r + dr;
    while (x >= 0 && x < 8 && y >= 0 && y < 8) { const p = b[y * 8 + x]; if (p !== '') { if (p === A || p === Q) return true; break; } x += df; y += dr; }
  }
  return false;
}

export const inCheck = (s, who = s.turn) => attacked(s.b, s.b.indexOf(who === 'w' ? 'K' : 'k'), who === 'w' ? 'b' : 'w');

// Moves that obey how the pieces move, before asking whether the king is left in check.
function pseudo(s) {
  const { b, turn } = s, out = [], them = turn === 'w' ? 'b' : 'w';
  const add = (from, to, extra) => out.push({ from, to, ...extra });
  for (let from = 0; from < 64; from++) {
    const p = b[from]; if (side(p) !== turn) continue;
    const f = from & 7, r = from >> 3, k = p.toUpperCase();
    if (k === 'P') {
      const d = turn === 'w' ? 1 : -1, home = turn === 'w' ? 1 : 6, last = turn === 'w' ? 7 : 0, one = from + d * 8;
      if (b[one] === '') {
        add(from, one, r + d === last ? { promo: true } : null);
        if (r === home && b[one + d * 8] === '') add(from, one + d * 8, { two: true });
      }
      for (const df of [-1, 1]) {
        const x = f + df; if (x < 0 || x > 7) continue;
        const to = (r + d) * 8 + x;
        if (side(b[to]) === them) add(from, to, r + d === last ? { promo: true } : null);
        else if (to === s.ep) add(from, to, { ep: true });
      }
    } else if (k === 'N' || k === 'K') {
      for (const [df, dr] of k === 'N' ? KN : ALL) { const x = f + df, y = r + dr; if (x >= 0 && x < 8 && y >= 0 && y < 8 && side(b[y * 8 + x]) !== turn) add(from, y * 8 + x); }
      if (k === 'K') {
        const row = turn === 'w' ? 0 : 7, [ks, qs] = turn === 'w' ? ['K', 'Q'] : ['k', 'q'];
        if (from === row * 8 + 4 && !attacked(b, from, them)) {
          if (s.c.includes(ks) && b[from + 1] === '' && b[from + 2] === '' && !attacked(b, from + 1, them)) add(from, from + 2, { castle: 'k' });
          if (s.c.includes(qs) && b[from - 1] === '' && b[from - 2] === '' && b[from - 3] === '' && !attacked(b, from - 1, them)) add(from, from - 2, { castle: 'q' });
        }
      }
    } else {
      for (const [df, dr] of k === 'B' ? DIAG : k === 'R' ? ORTH : ALL) {
        let x = f + df, y = r + dr;
        while (x >= 0 && x < 8 && y >= 0 && y < 8) { const t = b[y * 8 + x]; if (side(t) === turn) break; add(from, y * 8 + x); if (t !== '') break; x += df; y += dr; }
      }
    }
  }
  return out;
}

// Play a move and return the new position (the old one is left alone).
export function make(s, m) {
  const b = s.b.slice(), p = b[m.from], w = s.turn === 'w';
  let c = s.c, ep = -1;
  b[m.to] = m.promo ? (w ? 'Q' : 'q') : p; b[m.from] = '';
  if (m.ep) b[m.to + (w ? -8 : 8)] = '';
  if (m.two) ep = (m.from + m.to) >> 1;
  if (m.castle === 'k') { b[m.to - 1] = b[m.to + 1]; b[m.to + 1] = ''; }
  if (m.castle === 'q') { b[m.to + 1] = b[m.to - 2]; b[m.to - 2] = ''; }
  if (c) {
    if (p === 'K') c = c.replace(/[KQ]/g, ''); if (p === 'k') c = c.replace(/[kq]/g, '');
    for (const [sq, flag] of [[0, 'Q'], [7, 'K'], [56, 'q'], [63, 'k']]) if (m.from === sq || m.to === sq) c = c.replace(flag, '');
  }
  return { b, turn: w ? 'b' : 'w', c, ep };
}

export function legal(s) {
  return pseudo(s).filter(m => { const n = make(s, m); return !inCheck(n, s.turn); });
}

// 'play', 'check', 'mate' or 'stalemate', for the side to move
export function status(s) {
  const any = legal(s).length > 0, chk = inCheck(s);
  return any ? (chk ? 'check' : 'play') : chk ? 'mate' : 'stalemate';
}

const FILES = 'abcdefgh';
export const squareName = sq => FILES[sq & 7] + ((sq >> 3) + 1);
export const moveName = m => squareName(m.from) + squareName(m.to);
export const NAMES = { P: 'pawn', N: 'knight', B: 'bishop', R: 'rook', Q: 'queen', K: 'king' };

// ---- The opponent: looks three half-moves ahead, likes the centre, is not a grandmaster ----
const VAL = { P: 100, N: 310, B: 325, R: 500, Q: 900, K: 0 };
function evaluate(s) {
  let v = 0;
  for (let i = 0; i < 64; i++) {
    const p = s.b[i]; if (p === '') continue;
    const k = p.toUpperCase(), f = i & 7, r = i >> 3, w = white(p);
    let x = VAL[k];
    const centre = 3.5 - Math.max(Math.abs(f - 3.5), Math.abs(r - 3.5));           // 0 at the rim, 3 in the middle
    if (k === 'N' || k === 'B') x += centre * 9;
    else if (k === 'P') x += (w ? r - 1 : 6 - r) * 7 + (f > 1 && f < 6 ? centre * 6 : 0);
    else if (k === 'K') x -= centre * 12;                                           // keep the king tucked away
    v += w ? x : -x;
  }
  return s.turn === 'w' ? v : -v;
}
function search(s, depth, alpha, beta) {
  if (depth === 0) return evaluate(s);
  const moves = legal(s);
  if (!moves.length) return inCheck(s) ? -100000 - depth : 0;
  moves.sort((a, b) => (s.b[b.to] !== '') - (s.b[a.to] !== ''));                    // captures first
  for (const m of moves) {
    const v = -search(make(s, m), depth - 1, -beta, -alpha);
    if (v >= beta) return beta;
    if (v > alpha) alpha = v;
  }
  return alpha;
}
export function reply(s, depth = 3, random = Math.random) {
  let best = null, bestV = -Infinity;
  for (const m of legal(s)) {
    const v = -search(make(s, m), depth - 1, -Infinity, Infinity) + random() * 14;
    if (v > bestV) { bestV = v; best = m; }
  }
  return best;
}
