// Hands: picking things up and handling them, taking books down from the shelves, and using
// the computers. This file is all that loads with the house, and it does next to nothing until
// asked: the rest (src/hands/) is fetched when the visitor is walking and the page is idle
// (carrying, the book index), or the first time a book or a screen is opened.
//
//   hands/carry.js        pick up, carry in the left hand, turn over (R), bite (B), set down (E)
//   hands/things.js       what can be handled and the line each has; the drawn snacks
//   hands/place.js        where a thing may be set down (pure; tested by node)
//   hands/aim.js          which book is under the centre of view (pure)
//   hands/bookcontent.js  what a book holds: a verified public-domain passage (quotes.js) or
//                         something the house left in it (notes.js); never an invented quotation
//   hands/screens.js      the book card and the three computers; hands/shell.js the shell (pure)
//   hands/test/run.mjs    node tests
//
// Test hooks (?hands=...; several with commas):
//   hold:<model id>   hold:snack:<name>   look (turn it over)   bite   put (set it down where the view points)   back
//   book (take down the aimed book)   book:<part of a title>
//   imac   imac:read|about|guest|music   term   term:<command>;<command>   laptop   laptop:<n>
// window.__hands has: taken (books taken down this visit), handled, eaten, moved, held, open, and the functions the hooks use.

const Q = new URLSearchParams(location.search), HOOK = Q.get('hands') ?? '';
const esc = s => String(s ?? '').replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

export function setupHands(ctx) {
  const { camera } = ctx;
  const api = window.__hands = { taken: [], handled: [], eaten: [], moved: [], held: null, open: null, ready: false };
  const FAR = 1e9;

  // ---- Screens (loaded on first use) ----------------------------------------------------------
  let screens = null;
  const getScreens = () => (screens ??= import('./hands/screens.js').then(m => m.makeScreens(ctx, api)));
  const extras = ctx.items.extras ?? [];
  const at = (e, label, act, size = 1.3) => e && ctx.interact.push({ x: e.x, y: e.y, z: e.z, reach: 6.5, size, label: () => label, act });
  const useTerm = () => getScreens().then(s => s.term());
  at(extras.find(e => e.canvas === 'screenA'), 'use the computer', useTerm);
  at(extras.find(e => e.canvas === 'screenB'), 'use the computer', useTerm);
  at(extras.find(e => e.canvas === 'imac'), 'use the pink computer', () => getScreens().then(s => s.imac()), 1.1);
  at(extras.find(e => e.draw?.name === 'laptop'), 'look at the laptop', () => getScreens().then(s => s.laptop()), 0.9);

  // ---- Books: one entry that moves to whichever book is under the centre of view ----------------
  const books = ctx.items.books ?? [];
  let index = null, aimed = -1, clock = 0, content = null;
  const dir = new ctx.THREE.Vector3();
  const bookEnt = { x: FAR, y: 0, z: 0, reach: 5.6, size: 0.35,
    label: () => { const r = books[aimed]?.rec; return r ? `take down <i>${esc(r.title)}</i>${r.author ? ', ' + esc(r.author) : ''}` : ''; },
    act: () => takeDown(books[aimed]?.rec) };
  ctx.interact.push(bookEnt);
  ctx.animated.push((t, dt) => {
    if (!index || (clock += dt) < 0.14) return; clock = 0;
    if (ctx.mode !== 'walk' || api.held || api.open) { aimed = -1; bookEnt.x = FAR; return; }
    camera.getWorldDirection(dir); const p = camera.position;
    aimed = index.pick(p.x, p.y, p.z, dir.x, dir.y, dir.z, 5.5);
    const b = aimed >= 0 ? books[aimed] : null;
    if (b?.rec) { bookEnt.x = b.x; bookEnt.y = b.y; bookEnt.z = b.z; } else { aimed = -1; bookEnt.x = FAR; }
  });
  async function takeDown(rec) {
    if (!rec) return false;
    content ??= import('./hands/bookcontent.js');
    const [{ contentFor }, s] = await Promise.all([content, getScreens()]);
    const c = contentFor(rec);
    if (!api.taken.some(b => b.title === rec.title && b.author === rec.author)) api.taken.push({ title: rec.title, author: rec.author ?? '', year: rec.year ?? null, shelf: rec.shelf, held: c.kind });
    s.book(rec, c);
    return true;
  }
  api.takeDown = takeDown;
  api.aimedBook = () => books[aimed]?.rec ?? null;

  // ---- The rest arrives once the visitor is walking and the page has a quiet moment --------------
  const idle = f => (window.requestIdleCallback ? requestIdleCallback(f, { timeout: 2500 }) : setTimeout(f, 300));
  let carry = null;
  const wait = setInterval(() => {
    if (ctx.mode !== 'walk' || !(window.__ready || performance.now() > 20000)) return;
    clearInterval(wait);
    idle(() => {
      carry = import('./hands/carry.js').then(m => { m.setupCarry(ctx, api); api.ready = true; }).catch(e => console.warn('hands: carry', e));
      const tryIndex = () => { if (!books.length) return; if (!books.some(b => b.rec)) return setTimeout(tryIndex, 1000); import('./hands/aim.js').then(m => { index = m.makeBookIndex(books); }); };
      tryIndex();
      if (HOOK) carry.then(() => hooks().catch(e => console.warn('hands: hook', e)));
    });
  }, 500);

  // ---- Test hooks -----------------------------------------------------------------------------
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function hooks() {
    for (const h of HOOK.split(',')) {
      const i = h.indexOf(':'), k = i < 0 ? h : h.slice(0, i), a = i < 0 ? '' : h.slice(i + 1);
      if (k === 'hold') await api.hold(a);
      else if (k === 'look') { api.look(true); api.turn(60, 25); }
      else if (k === 'bite') { api.bite(); await sleep(1100); }
      else if (k === 'put') { await sleep(200); api.setDown(); }
      else if (k === 'back') api.setDown(true);
      else if (k === 'book') {
        let rec = null;
        for (let n = 0; n < 100 && !rec; n++) { rec = a ? books.find(b => b.rec?.title.toLowerCase().includes(a.toLowerCase()))?.rec : (index && (camera.getWorldDirection(dir), books[index.pick(camera.position.x, camera.position.y, camera.position.z, dir.x, dir.y, dir.z, 6)]?.rec)); if (!rec) await sleep(200); }
        await takeDown(rec);
      }
      else if (k === 'imac') (await getScreens()).imac(a || null);
      else if (k === 'term') (await getScreens()).term(a ? a.split(';') : null);
      else if (k === 'laptop') (await getScreens()).laptop(Number(a) || 0);
      else if (k === 'close') (await getScreens()).close();
    }
    api.hooked = true;
  }
  api.screens = getScreens;
  return api;
}
