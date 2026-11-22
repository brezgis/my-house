// The catalogue, open: a book. Closed, it shows its cover; opened, two facing pages with a gutter
// between them, the edges of the other leaves showing at the sides, index tabs down the fore-edge,
// and a leaf that turns over when the page is turned. Every spread is the same size (the book is one
// fixed shape, and its type is sized from its width). On a narrow screen it is one page at a time.
//
// Inside: a bookplate and the contents; a spread for each department; and at the back the order
// blank. One thing is ordered at a time: we take it easy here.
//
// It is shown on the same sheet as the books and the computers (hands/screens.js sheet()), so Esc
// closes it, the pointer is given back afterwards, and nobody walks while it is being read. The
// arrow keys turn the pages; everything can be done by clicking or with Tab and Enter.

import { PAGES, ITEMS, itemById, priceLine } from './list.js';
import { engrave, drawCover } from './engrave.js';

const CSS = `
.ct-wrap { --bw: min(980px, calc(100vw - 150px), calc((100dvh - 86px) * 1.42)); display: grid; justify-items: center; gap: 10px; font-family: "Goudy House", Georgia, serif; color: #2a1c13; }
.ct-book { position: relative; width: var(--bw); height: calc(var(--bw) / 1.42); font-size: calc(var(--bw) / 61); perspective: calc(var(--bw) * 2.6); animation: ctIn .45s cubic-bezier(.2,.7,.2,1); }
.ct-book:focus { outline: none; }
@keyframes ctIn { from { transform: translateY(30px) rotate(-1.5deg) scale(.94); opacity: 0; } }
/* the boards, and the edges of the leaves */
.ct-board { position: absolute; inset: 0; border-radius: .5em; background: #6f2a26 linear-gradient(90deg, rgba(0,0,0,.25), rgba(255,255,255,.06) 3%, rgba(0,0,0,0) 8%, rgba(0,0,0,0) 92%, rgba(255,255,255,.06) 97%, rgba(0,0,0,.25)); box-shadow: 0 1.6em 3.4em rgba(0,0,0,.6); }
.ct-board::before { content: ''; position: absolute; inset: .55em .5em .7em; border-radius: .2em; background: repeating-linear-gradient(90deg, #e9dfc6 0 1px, #cfc3a4 1px 2px); box-shadow: inset 0 -.25em .3em rgba(60,40,20,.35); }
.ct-pg { position: absolute; top: .55em; bottom: 1.0em; width: calc(50% - 1.15em); box-sizing: border-box; padding: 1.3em 1.7em 2em; overflow: hidden auto; scrollbar-width: none; background-color: #f3ead6; }
.ct-pg.l { left: 1.15em; border-radius: .15em 0 0 .15em; background-image: linear-gradient(90deg, rgba(122,75,42,.12), rgba(122,75,42,0) 6%, rgba(122,75,42,0) 86%, rgba(60,40,20,.22)); }
.ct-pg.r { right: 1.15em; border-radius: 0 .15em .15em 0; background-image: linear-gradient(270deg, rgba(122,75,42,.12), rgba(122,75,42,0) 6%, rgba(122,75,42,0) 86%, rgba(60,40,20,.22)); }
.ct-run { display: flex; justify-content: space-between; font-size: .72em; letter-spacing: .16em; text-transform: uppercase; color: #5b4636; border-bottom: 1px solid rgba(42,28,19,.4); padding-bottom: .35em; margin-bottom: .6em; white-space: nowrap; }
.ct-folio { position: absolute; bottom: .7em; font-size: .8em; font-style: italic; color: #5b4636; } .ct-pg.l .ct-folio { left: 1.9em; } .ct-pg.r .ct-folio { right: 1.9em; }
.ct-head { text-align: center; border-top: 3px double #2a1c13; border-bottom: 3px double #2a1c13; padding: .4em 0 .35em; margin: 0 0 .5em; }
.ct-head h2 { margin: 0; font-size: 1.42em; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; line-height: 1.12; text-wrap: balance; color: #2a1c13; font-style: normal; }
.ct-lead { text-align: center; font-style: italic; font-size: .88em; line-height: 1.3; margin: 0 0 .3em; text-wrap: balance; }
.ct-item { display: grid; grid-template-columns: 5.4em 1fr; gap: .8em; padding: .55em 0 .6em; border-top: 1px solid rgba(42,28,19,.35); align-items: start; }
.ct-run + .ct-item, .ct-lead + .ct-item, .ct-note + .ct-item { border-top: 0; }
.ct-item canvas { width: 5.4em; height: 5.4em; }
.ct-few .ct-item { grid-template-columns: 1fr; justify-items: center; text-align: center; padding-top: 1.2em; } .ct-few .ct-item canvas { width: 11em; height: 11em; }
.ct-item .no { font-size: .74em; letter-spacing: .12em; font-variant-numeric: lining-nums; }
.ct-item h3 { margin: .05em 0 .2em; font-size: 1.04em; line-height: 1.15; text-transform: uppercase; letter-spacing: .03em; text-wrap: balance; color: #7a3b22; }
.ct-item p { margin: 0 0 .3em; font-size: .86em; line-height: 1.3; text-wrap: pretty; }
.ct-item .how { font-style: italic; color: #5b4636; }
/* buttons on the paper are written, not boxed: like "put the book back" on the house's other sheets */
.ct-book .ct-btn { font: inherit; font-style: italic; font-size: .95em; color: var(--teak, #7a4b2a); background: none; border: 0; border-bottom: 1px solid rgba(122,75,42,.45); border-radius: 0; padding: 0 .1em .05em; cursor: pointer; }
.ct-book .ct-btn:hover, .ct-book .ct-btn:focus-visible { color: #2a1c13; border-bottom-color: #2a1c13; }
.ct-book .ct-btn.post { font-size: 1.1em; }
.ct-stamp { display: inline-block; font-size: .74em; letter-spacing: .14em; text-transform: uppercase; color: #9a2f22; border: 2px solid #9a2f22; border-radius: 3px; padding: .2em .6em .12em; transform: rotate(-4deg); opacity: .85; }
.ct-note { text-align: center; font-style: italic; font-size: .95em; margin: .4em 0 .8em; padding: .5em .7em; border: 1px dashed rgba(42,28,19,.5); }
/* the front of the book */
.ct-plate { margin: 2.2em auto 1.4em; width: 78%; border: 3px double #2a1c13; padding: 1.2em 1em; text-align: center; } .ct-plate small { display: block; font-size: .74em; letter-spacing: .18em; text-transform: uppercase; } .ct-plate b { display: block; font-size: 1.5em; font-weight: 400; font-style: italic; margin: .25em 0; }
.ct-how { font-size: .95em; line-height: 1.45; margin: 0 .6em; padding-left: 1.2em; } .ct-how li { margin: 0 0 .45em; }
.ct-index { list-style: none; margin: 1.6em 0 0; padding: 0; font-size: 1.02em; } .ct-index li { display: flex; align-items: baseline; margin: 0 0 .75em; }
.ct-index button { font: inherit; background: none; border: 0; color: #2a1c13; cursor: pointer; padding: 0; text-align: left; letter-spacing: .03em; } .ct-index button:hover { text-decoration: underline; }
.ct-index i { flex: 1; border-bottom: 2px dotted rgba(42,28,19,.5); margin: 0 .5em; transform: translateY(-.25em); } .ct-index span { font-variant-numeric: lining-nums; }
/* the order blank */
.ct-blank { font-size: .98em; line-height: 1.4; } .ct-blank label { display: block; font-size: .72em; letter-spacing: .12em; text-transform: uppercase; margin: 1em 0 .1em; }
.ct-blank .line { display: flex; gap: .5em; align-items: baseline; border-bottom: 1px solid #2a1c13; font-style: italic; padding: .16em .2em .08em; min-height: 1.45em; } .ct-blank .line span { flex: 1; min-width: 0; } .ct-blank .line small { font-style: normal; font-size: .74em; letter-spacing: .08em; }
.ct-blank .line .plain { font-style: normal; font-size: .74em; color: #9a2f22; }
.ct-blank .row { display: flex; gap: 1em; align-items: center; margin-top: 1.3em; flex-wrap: wrap; } .ct-blank .plain { font: inherit; font-style: italic; font-size: .9em; background: none; border: 0; color: #5b4636; cursor: pointer; }  .ct-blank .plain:hover { text-decoration: underline; }
/* the closed book */
.ct-book.shut .ct-board { left: 25%; right: 25%; } .ct-book.shut .ct-board::before, .ct-book.shut .ct-pg, .ct-book.shut .ct-tabs, .ct-book.shut .ct-gutter { display: none; }
.ct-front { display: none; position: absolute; left: 25%; right: 25%; top: 0; bottom: 0; border: 0; padding: 0; background: none; cursor: pointer; border-radius: .5em; overflow: hidden; transition: transform .2s; }
.ct-book.shut .ct-front { display: block; } .ct-front canvas { width: 100%; height: 100%; display: block; } .ct-front::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, rgba(60,30,10,.45), rgba(60,30,10,0) 7%, rgba(255,255,255,.12) 9%, rgba(0,0,0,0) 13%); }
.ct-front:hover { transform: rotate(-.6deg) translateY(-2px); }
.ct-gutter { position: absolute; left: calc(50% - 1px); top: .55em; bottom: 1em; width: 2px; background: rgba(60,40,20,.35); pointer-events: none; }
/* index tabs down the fore-edge */
.ct-tabs { position: absolute; left: calc(100% - .35em); top: 1.6em; display: grid; gap: .35em; }
.ct-tabs button { font: inherit; font-size: .76em; letter-spacing: .06em; white-space: nowrap; text-align: left; color: #2a1c13; background: #e3d6b6; border: 1px solid rgba(60,40,20,.45); border-left: 0; border-radius: 0 .5em .5em 0; padding: .42em .7em .34em .9em; cursor: pointer; box-shadow: 2px 2px 5px rgba(0,0,0,.3); }
.ct-tabs button:hover { background: #f3ead6; } .ct-tabs button.on { background: #f3ead6; padding-left: 1.3em; font-weight: 700; } .ct-tabs button.order { background: #c9d6c0; } .ct-tabs button.order.on { background: #dfe9d6; }
/* a leaf turning: one flat sheet swinging up to the gutter, then its other side swinging down (hands the work to the compositor; no nested 3D) */
.ct-leaf { position: absolute; top: .55em; bottom: 1em; width: calc(50% - 1.15em); z-index: 3; pointer-events: none; will-change: transform; backface-visibility: hidden; -webkit-backface-visibility: hidden; }
.ct-leaf.r { right: 1.15em; transform-origin: 0 50%; } .ct-leaf.l { left: 1.15em; transform-origin: 100% 50%; }
.ct-leaf::after { content: ''; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(90deg, rgba(40,25,10,.28), rgba(40,25,10,0) 60%); } .ct-leaf.l::after { transform: scaleX(-1); }
.ct-still { top: 0 !important; bottom: 0 !important; left: 0 !important; right: 0 !important; width: auto !important; overflow: hidden !important; }
.ct-leaf .ct-cov { position: absolute; inset: 0; width: 100%; height: 100%; border-radius: .3em; }
.ct-book.opening .ct-pg.l { visibility: hidden; } .ct-book.opening .ct-board { clip-path: inset(0 0 0 50%); }
.ct-hold { position: absolute; top: .55em; bottom: 1em; width: calc(50% - 1.15em); z-index: 2; pointer-events: none; } .ct-hold.l { left: 1.15em; } .ct-hold.r { right: 1.15em; }
/* under the book: the same quiet lettering as the house's own hints (ui.css #hint) */
.ct-foot { display: flex; align-items: center; gap: 1.6em; font-size: 14.5px; color: var(--cream, #f6eddc); text-shadow: 0 1px 2px rgba(20,12,6,.85), 0 0 12px rgba(20,12,6,.6); }
.ct-foot button { font: inherit; color: inherit; text-shadow: inherit; background: none; border: 0; padding: 4px 2px; cursor: pointer; white-space: nowrap; } .ct-foot button:disabled { opacity: .35; cursor: default; }
.ct-foot button:not(:disabled):hover { text-decoration: underline; } .ct-foot kbd { font-size: .85em; text-shadow: none; margin-right: 4px; }
.ct-foot span { font-style: italic; min-width: 9em; text-align: center; opacity: .85; }
/* a narrow screen: one page at a time */
@media (max-width: 720px) {
  .ct-wrap { --bw: min(calc(100vw - 20px), calc((100dvh - 86px) * .72)); }
  .ct-book { height: calc(var(--bw) / .72); font-size: calc(var(--bw) / 23.5); }
  .ct-pg.l, .ct-pg.r { left: .5em; right: .5em; width: auto; border-radius: .15em; } .ct-book.one-r .ct-pg.l, .ct-book.one-l .ct-pg.r { display: none; }
  .ct-gutter, .ct-tabs { display: none; } .ct-book.shut .ct-board, .ct-front { left: 0; right: 0; }
  .ct-foot { font-size: 13px; gap: .5em; } .ct-foot span { min-width: 0; }
}
@media (max-width: 720px) { .ct-leaf.l, .ct-leaf.r { left: .5em; right: .5em; width: auto; } }
@media (prefers-reduced-motion: reduce) { .ct-book { animation: none; } }
`;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const TAB = { coffee: 'Coffees', food: 'Provisions', pets: 'Pond & Vacuum', parlour: 'Parlour', novelty: 'Novelties' };

// C (catalogue.js): { status() -> { phase, items }, owns(id), order(id), thumb(item) -> fn | null }
export function makePages(ctx, screens, C) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const touch = 'ontouchstart' in window, narrow = () => matchMedia('(max-width: 720px)').matches;
  // Spread 0 is the closed book; spread s shows pages 2s-1 (left) and 2s (right)
  const LAST = PAGES.length + 2;                      // the front matter, the departments, the order blank
  let spread = 0, side = 'l', chosen = [], root = null, book = null, sent = false, turning = false, adding = false, flips = 0;

  const waiting = () => { const s = C.status(); return s.phase === 'idle' ? null : s; };
  const notice = () => { const s = waiting(); if (!s) return ''; const it = itemById(s.items?.[0]);
    return `<p class="ct-note">${s.phase === 'porch' ? `Your parcel is waiting on the front porch${it ? ': ' + esc(it.name) : ''}. Untie it before ordering anything more.` : `One thing at a time, please. ${it ? esc(it.name) : 'Your order'} is on its way: listen for the bell at the front door.`}</p>`; };

  function itemHTML(it) {
    const have = C.owns(it.id), busy = !!waiting();
    const act = it.once && have ? '<span class="ct-stamp">Delivered</span>' : busy ? '' : `<button type="button" class="ct-btn" data-pick="${it.id}">order this</button>${have && it.keep ? ' <span class="ct-stamp">You have one</span>' : ''}`;
    return `<div class="ct-item"><canvas width="256" height="256" data-art="${it.id}" role="img" aria-label="An engraving of ${esc(it.name)}"></canvas><div><div class="no">No. ${it.no}</div><h3>${esc(it.name)}</h3><p>${esc(it.copy)}</p>${it.how ? `<p class="how">${esc(it.how)}</p>` : ''}${act}</div></div>`;
  }
  const run = (left, text) => `<div class="ct-run">${left ? `<span>The Island Catalogue</span><span>No. 114</span>` : `<span>No. 114</span><span>${esc(text)}</span>`}</div>`;
  // what is on each of the two pages of a spread
  function pageHTML(s, left) {
    const folio = `<div class="ct-folio">${2 * s - (left ? 1 : 0)}</div>`;
    if (s === 1) return left
      ? `<div class="ct-plate"><small>This catalogue is the property of</small><b>The House, on the Island</b><small>Kindly return it to the telephone table</small></div>
         <ol class="ct-how"><li>Turn the pages. When something takes your fancy, order it.</li><li>One thing at a time. We take it easy here.</li><li>Listen for the bell. The porter brings it to the front porch, presently.</li></ol>${folio}`
      : `${run(false, 'Contents')}<div class="ct-head"><h2>Contents</h2></div><ul class="ct-index">${PAGES.map((p, i) => `<li><button type="button" data-go="${i + 2}">${esc(p.dept)}</button><i></i><span>${2 * (i + 2) - 1}</span></li>`).join('')}<li><button type="button" data-go="${LAST}">The Order Blank</button><i></i><span>${2 * LAST}</span></li></ul>${folio}`;
    if (s === LAST) {
      if (left) return `${run(true)}<div class="ct-head"><h2>How It Comes</h2></div><p class="ct-lead">By porter, up the front walk, in brown paper and string.</p>
        <ol class="ct-how"><li>One thing at a time. Until the parcel has been untied, the Editors will not hear of another.</li><li>The porter is small. Kindly do not stand on the walk and stare; or do, it likes an audience.</li><li>The paper and the string go back with the porter. We use them again.</li><li>${priceLine()}</li></ol>${folio}`;
      const w = waiting(), its = chosen.map(itemById).filter(Boolean), it = its[0], more = its.length && its.length < C.MAX && its.every(i => i.page === 'coffee');
      if (sent || w) return `${run(false, 'Order blank')}<div class="ct-head"><h2>Order Blank</h2></div>${notice() || '<p class="ct-note">Your order has gone. Listen for the bell at the front door.</p>'}${folio}`;
      return `${run(false, 'Order blank')}<div class="ct-head"><h2>Order Blank</h2></div><div class="ct-blank">
        <label>Kindly send, by porter, to the porch of</label><div class="line"><span>The House, on the Island</span></div>
        <label>The following</label>${its.length ? its.map((i, n) => `<div class="line"><small>No. ${i.no}</small><span>${esc(i.name)}</span>${its.length > 1 ? `<button type="button" class="plain" data-strike="${n}">strike out</button>` : ''}</div>`).join('') : '<div class="line"><span style="opacity:.55">Nothing yet. Turn back and choose something.</span></div>'}
        ${more ? `<p class="how" style="margin:.5em 0 0;font-style:italic;font-size:.9em">Company? Coffees may come up to ${C.MAX} together. <button type="button" class="plain" data-more>Add another coffee</button></p>` : ''}
        <label>Remittance</label><div class="line"><span>${priceLine()}</span></div>
        <div class="row">${it ? '<button type="button" class="ct-btn post" data-post>post the order</button>' : ''}<button type="button" class="plain" data-go="1">${it ? 'Choose something else' : 'To the contents'}</button></div></div>${folio}`;
    }
    const P = PAGES[s - 2], items = ITEMS.filter(i => i.page === P.id), half = Math.ceil(items.length / 2), mine = left ? items.slice(0, half) : items.slice(half);
    const few = items.length <= 2 ? ' class="ct-few"' : '';
    return left ? `<div${few}>${run(true)}<div class="ct-head"><h2>${esc(P.dept)}</h2></div><p class="ct-lead">${esc(P.lead)}</p>${mine.map(itemHTML).join('')}</div>${folio}`
      : `<div${few}>${run(false, P.dept)}${notice()}${mine.map(itemHTML).join('')}</div>${folio}`;
  }
  function paint(el) {
    for (const c of el.querySelectorAll('canvas[data-art]')) { const it = itemById(c.dataset.art); engrave(c.getContext('2d'), 256, 256, it.art, C.thumb(it)); }
  }
  // a copy of a page as it looks now (a cloned canvas is blank until it is drawn on again)
  function copy(pg) {
    const k = pg.cloneNode(true), a = pg.querySelectorAll('canvas'), b = k.querySelectorAll('canvas');
    a.forEach((c, i) => { try { b[i].getContext('2d').drawImage(c, 0, 0); } catch { /* blank */ } });
    k.classList.add('ct-still'); return k;
  }
  function render() {
    if (!root) return;
    for (const el of book.querySelectorAll('.ct-leaf, .ct-hold')) el.remove();      // (never a stray leaf from a turn that was cut short)
    book.classList.toggle('shut', spread === 0); book.classList.toggle('one-l', side === 'l'); book.classList.toggle('one-r', side === 'r');
    const L = book.querySelector('.ct-pg.l'), R = book.querySelector('.ct-pg.r');
    if (spread > 0) { L.innerHTML = pageHTML(spread, true); R.innerHTML = pageHTML(spread, false); L.scrollTop = R.scrollTop = 0; paint(L); paint(R); }
    for (const b of book.querySelectorAll('.ct-tabs button')) b.classList.toggle('on', Number(b.dataset.go) === spread);
    const one = narrow();
    root.querySelector('.ct-foot span').textContent = spread === 0 ? 'The Island Catalogue' : one ? `page ${2 * spread - (side === 'l' ? 1 : 0)}` : `pages ${2 * spread - 1} and ${2 * spread}`;
    root.querySelector('[data-prev]').disabled = spread === 0; root.querySelector('[data-next]').disabled = spread === LAST && (!one || side === 'r');
  }
  const focus = () => book?.focus?.({ preventScroll: true });
  // Turn to a spread (or, on a narrow screen, to a page), a leaf going over. Opening the book turns the cover itself.
  function go(to, toSide = 'l') {
    to = Math.max(0, Math.min(LAST, to)); if (turning || !root || (to === spread && toSide === side)) return;
    const from = spread, fromSide = side, one = narrow(), still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    try { ctx.sound?.note?.(40 + (to % 3), 0, 0.06, 0.03); } catch { /* quiet */ }
    if (still || to === 0) { spread = to; side = toSide; render(); focus(); return; }
    const fwd = to > from || (to === from && toSide === 'r'), opening = from === 0;
    const pgNow = sd => book.querySelector(sd === 'l' ? '.ct-pg.l' : '.ct-pg.r');
    let cover = null; if (opening) { cover = document.createElement('canvas'); cover.width = 520; cover.height = 780; cover.className = 'ct-cov'; drawCover(cover.getContext('2d'), 520, 780); }
    const oldL = opening ? null : copy(pgNow('l')), oldR = opening ? null : copy(pgNow('r'));
    spread = to; side = toSide; render();
    // Two halves: the old page swings up from its side to stand on edge at the gutter; then the new facing page swings
    // down on the other side. While the first half runs the old facing page is held in place over the new one.
    const mk = (cls, kid) => { const el = document.createElement('div'); el.className = cls; if (kid) el.appendChild(kid); return el; };
    const A = mk('ct-leaf ' + (one ? 'r' : fwd ? 'r' : 'l'), opening ? cover : one ? (fromSide === 'l' ? oldL : oldR) : (fwd ? oldR : oldL));
    const hold = one || opening ? null : mk('ct-hold ' + (fwd ? 'l' : 'r'), fwd ? oldL : oldR);
    if (opening && !one) book.classList.add('opening');
    if (hold) book.append(hold); book.append(A); turning = true; ctx.quiet = true;
    const T = 330, s = fwd || one ? -1 : 1;
    const me = ++flips;                                                 // (only this turn may tidy up after itself: an older turn's timer must not cut a newer one short)
    const finish = () => { if (me !== flips || !turning) return; turning = false; for (const el of book?.querySelectorAll('.ct-leaf, .ct-hold') ?? []) el.remove(); book?.classList.remove('opening'); focus(); };
    const second = () => {
      A.remove(); if (me !== flips) return; if (one || !book) return finish();
      const B = mk('ct-leaf ' + (fwd ? 'l' : 'r'), copy(pgNow(fwd ? 'l' : 'r'))); book.classList.remove('opening'); book.append(B); hold?.remove();
      B.animate([{ transform: `rotateY(${-s * 90}deg)` }, { transform: 'rotateY(0deg)' }], { duration: T, easing: 'cubic-bezier(.2,.6,.3,1)' }).finished.then(finish, finish);
    };
    A.animate([{ transform: 'rotateY(0deg)' }, { transform: `rotateY(${s * 90}deg)` }], { duration: T, easing: 'cubic-bezier(.6,0,.9,.6)', fill: 'forwards' }).finished.then(second, second);
    setTimeout(finish, 1500);
  }
  function step(d) {
    if (narrow() && spread > 0) { if (d > 0 && side === 'l') return go(spread, 'r'); if (d < 0 && side === 'r') return go(spread, 'l'); return go(spread + d, d > 0 ? 'l' : 'r'); }
    go(spread + d);
  }
  const sideOf = s => (s === LAST ? 'r' : 'l');       // (narrow screens: the blank is the right-hand page)

  function open(at = null) {
    if (at !== null) { spread = Math.max(0, Math.min(LAST, at)); side = sideOf(spread); }
    sent = false; adding = false; chosen = chosen.filter(id => !(itemById(id)?.once && C.owns(id)));
    root = screens.sheet({ id: 'catalogue', name: 'The Island Catalogue', closed: () => { root = book = null; turning = false; flips++; ctx.quiet = false; },
      key: e => { if (e.code === 'ArrowRight' || e.code === 'PageDown') { step(1); e.preventDefault(); return true; } if (e.code === 'ArrowLeft' || e.code === 'PageUp') { step(-1); e.preventDefault(); return true; } return false; } },
      `<div class="ct-wrap"><div class="ct-book" tabindex="-1"><div class="ct-board"></div>
        <div class="ct-tabs">${PAGES.map((p, i) => `<button type="button" data-go="${i + 2}">${TAB[p.id] ?? esc(p.dept)}</button>`).join('')}<button type="button" class="order" data-go="${LAST}">Order blank</button></div>
        <div class="ct-pg l"></div><div class="ct-pg r"></div><div class="ct-gutter"></div>
        <button type="button" class="ct-front" data-go="1" aria-label="Open the catalogue"><canvas width="520" height="780"></canvas></button></div>
        <div class="ct-foot"><button type="button" data-prev>${touch ? '‹ back' : '<kbd>←</kbd>back a page'}</button><span></span><button type="button" data-next>${touch ? 'on ›' : '<kbd>→</kbd>on a page'}</button><button type="button" data-shut>${touch ? 'close' : '<kbd>Esc</kbd>put it back'}</button></div></div>`);
    book = root.querySelector('.ct-book');
    const cv = book.querySelector('.ct-front canvas'), g = cv.getContext('2d'); drawCover(g, 520, 780); document.fonts?.ready?.then(() => cv.isConnected && drawCover(g, 520, 780));
    root.querySelector('.ct-wrap').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b || b.disabled) return;
      if ('prev' in b.dataset) step(-1); else if ('next' in b.dataset) step(1); else if ('shut' in b.dataset) screens.close();
      else if (b.dataset.go) go(Number(b.dataset.go), sideOf(Number(b.dataset.go)));
      else if (b.dataset.pick) { const id = b.dataset.pick, cof = i => itemById(i)?.page === 'coffee'; chosen = adding && cof(id) && chosen.every(cof) && chosen.length < C.MAX ? [...chosen, id] : [id]; adding = false; go(LAST, 'r'); }
      else if ('more' in b.dataset) { adding = true; go(2); }
      else if (b.dataset.strike) { chosen.splice(Number(b.dataset.strike), 1); render(); }
      else if ('post' in b.dataset && chosen.length) { if (C.order([...chosen])) { sent = true; chosen = []; render(); setTimeout(() => root && screens.close(), 2200); } }
    });
    ctx.quiet = true; render(); focus();
  }
  return { open, get page() { return spread; }, refresh: render };
}
