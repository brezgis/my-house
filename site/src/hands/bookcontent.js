// What a book holds when it is taken down. Pure: node tests every record in books.json.
//
// The rule (it is about honesty, not style): a book shows a passage of its own text only if
// quotes.js has one for it, marked verified with the page it was checked against. Every other
// book shows something the house has left in it (notes.js), which is never the book's words
// and is never presented as such. The same book always holds the same thing.

import { QUOTES } from './quotes.js';
import { NOTES, CITIES, FRIENDS, SEASONS, FLOWERS } from './notes.js';

export const bookKey = rec => rec.title + '|' + (rec.author ?? '');
export function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

const LABEL = {
  flyleaf: () => 'Pencilled on the flyleaf',
  margin: p => `In the margin of page ${p.page}`,
  slip: p => `A slip of paper, tucked in at page ${p.page}`,
  gift: () => 'Written inside the cover',
  flower: p => `Pressed between pages ${p.page} and ${p.page + 1}: ${p.flower}`,
  library: () => 'A library slip, pasted inside the back cover',
  receipt: () => 'A receipt, used as a bookmark',
  ticket: p => `Marking page ${p.page}`,
  postcard: p => `A postcard at page ${p.page}`,
  photo: () => 'Something falls out',
  plate: () => 'The bookplate',
};

export function contentFor(rec) {
  const q = QUOTES[rec.title];
  if (q && q.verified === true && q.source && q.author === (rec.author ?? '')) return { kind: 'quote', text: q.text, verse: !!q.verse, where: q.where, source: q.source };
  const h = hash(bookKey(rec)), pick = (list, salt) => list[hash(salt + bookKey(rec)) % list.length];
  const own = NOTES.shelf[rec.shelf] ?? [];
  const pool = rec.from_annas_shelf ? NOTES.personal : (own.length && h % 100 < 62 ? own : NOTES.any);
  const n = pool[(h >>> 8) % pool.length];
  const p = { page: 12 + (h >>> 4) % 230, city: pick(CITIES, 'c'), friend: pick(FRIENDS, 'f'), season: pick(SEASONS, 's'), flower: pick(FLOWERS, 'w'),
    year: Math.max((rec.year ?? 1950) + 2, 1958 + (h >>> 12) % 55), title: rec.title };
  const fill = s => s.replace(/\{(\w+)\}/g, (m, k) => p[k] ?? m);
  return { kind: n.k, label: LABEL[n.k](p), text: fill(n.t), by: n.by ? fill(n.by) : (n.k === 'flyleaf' ? 'A.' : ''), page: p.page };
}
