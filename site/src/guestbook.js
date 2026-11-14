// The guest book, read and written at the mailbox by the gate (garden/mailbox.js), and on the pink
// computer in the office (hands/screens.js), which shows and signs the same book.
//
// Notes live in a small service of Anna's own (guestbook/ at the top of the repository: one
// Python file, with its deployment notes). GUESTBOOK_URL below is its address; while it is
// empty the mailbox is still a mailbox, and its card says the guest book is not open yet.
// Nothing is fetched until a visitor comes near the mailbox. Notes are drawn with
// textContent only, never as HTML.
//
// It is one book with several doors: this mailbox (place 'house') and the guestbook page of the
// recursite (recursite.brezgis.com/guestbook/). Every note from every door is shown here; those
// written elsewhere carry a small line saying so.
//
// Kept in this browser (localStorage): the newest note already seen (for the red flag) and the
// visitor's own notes that Anna has not read yet, so they are still there on the next visit.
//
// Test hooks: ?uiguest opens the card. Away from house.brezgis.com, ?guestbook=http://127.0.0.1:PORT
// (or localhost, or this page's own host) points the card at a local copy of the service.
// window.__guestbook = { open, peek, state }.

export const GUESTBOOK_URL = 'https://guestbook.brezgis.com';                         // e.g. 'https://guestbook.brezgis.com' once it is running

const Q = new URLSearchParams(location.search);
const base = (() => {
  const o = Q.get('guestbook');
  if (o && location.hostname !== 'house.brezgis.com') {
    try { const u = new URL(o); if (/^https?:$/.test(u.protocol) && ['localhost', '127.0.0.1', location.hostname].includes(u.hostname)) return u.origin; } catch { /* not a URL */ }
  }
  return GUESTBOOK_URL.replace(/\/+$/, '');
})();

const store = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private window */ } },
};
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// a note's day, in the visitor's own time zone (the service sends the full UTC time as 'at')
const fmtDate = (at, day) => { const t = new Date(at ?? ''); if (!isNaN(t)) return `${t.getDate()} ${MONTHS[t.getMonth()]} ${t.getFullYear()}`; const m = /^(\d{4})-(\d\d)-(\d\d)/.exec(day ?? ''); return m ? `${+m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}` : ''; };
const wait = ms => new Promise(r => setTimeout(r, ms));
const today = () => new Date().toISOString().slice(0, 10);
// One book, several doors: notes written elsewhere say where they came from
const FROM = { recursite: 'from the recursite, by way of 1996', town: 'from the town' };
const WHOLE_BOOK = 'https://recursite.brezgis.com/guestbook/';

// ---- Talking to the service -------------------------------------------------------------------
const state = { configured: !!base, reachable: null, pages: 1, page: 1, notes: [], latest: '', form: null, loading: null, unread: false };
const listeners = new Set();
const changed = () => { for (const f of listeners) f(state); };

async function call(path, opts = {}) {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), 9000);
  try {
    const r = await fetch(base + path, { ...opts, mode: 'cors', credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store', signal: ac.signal });
    let body = null; try { body = await r.json(); } catch { /* empty */ }
    return { status: r.status, body };
  } finally { clearTimeout(t); }
}
async function load(page = 1) {
  if (!state.configured) return state;
  try {
    const { status, body } = await call(`/notes?page=${page}`);
    if (status !== 200 || !Array.isArray(body?.notes)) throw new Error('status ' + status);
    state.reachable = true; state.page = body.page ?? page; state.pages = body.pages ?? 1; state.form = body.form ?? null; state.formAt = Date.now();
    state.notes = body.notes.filter(n => n && typeof n.text === 'string').map(n => ({ id: String(n.id ?? ''), name: String(n.name ?? ''), text: n.text, date: String(n.date ?? ''), at: String(n.at ?? ''), place: String(n.place ?? 'house') }));
    if (state.page === 1) state.latest = state.notes[0]?.id ?? '';
    // the visitor's own notes, once Anna has let them through, need no longer be kept here
    const mine = store.get('guestbook.mine', []), seen = new Set(state.notes.map(n => n.name + '\n' + n.text));
    const keep = mine.filter(m => !seen.has(m.name + '\n' + m.text) && Date.now() - (m.at ?? 0) < 90 * 864e5);
    if (keep.length !== mine.length) store.set('guestbook.mine', keep);
  } catch { state.reachable = false; }
  state.unread = !!(state.reachable && state.latest && state.latest !== String(store.get('guestbook.seen', '')));      // a newer note is on top
  changed();
  return state;
}
// A first look, made when a visitor comes near the mailbox: is there anything they have not read?
export function peek() { return (state.loading ??= load(1)); }
// Ask again, after the service could not be reached
export function refresh() { state.reachable = null; changed(); return (state.loading = load(1)); }
export function onChange(f) { listeners.add(f); return () => listeners.delete(f); }
export const markRead = () => { if (state.latest) store.set('guestbook.seen', state.latest); state.unread = false; changed(); };

// ---- The card -----------------------------------------------------------------------------------
let card = null, el = null, shownAt = 0;
const $ = s => el.querySelector(s);
const make = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

function build() {
  const ui = window.houseUI;
  if (!ui?.makeCard) return null;
  card = ui.makeCard('guestbook', 'The mailbox', `
    <p class="gb-lede">Leave Anna a note, and read the ones other visitors have left.</p>
    <div class="gb-shut" hidden><p class="gb-shut-text"></p><button class="link gb-retry" type="button" hidden>Try again</button></div>
    <div class="gb-open">
      <section class="gb-write" aria-labelledby="gb-write-h"><h3 id="gb-write-h">Leave a note</h3>
        <form class="gb-form" novalidate>
          <label for="gb-name">Your name <small>(if you like)</small></label>
          <input id="gb-name" name="name" type="text" maxlength="40" autocomplete="nickname" spellcheck="false" data-first>
          <label for="gb-text">Your note</label>
          <textarea id="gb-text" name="text" maxlength="400" rows="4" required></textarea>
          <div class="gb-hp" aria-hidden="true" inert><input name="gb-leave-empty" type="text" tabindex="-1" autocomplete="off" aria-hidden="true"></div>
          <div class="gb-row"><span class="gb-count" aria-live="off"></span><button class="gb-post" type="submit">post</button></div>
          <p class="gb-msg" role="status" aria-live="polite"></p>
        </form>
        <div class="gb-thanks" hidden><p class="gb-thanks-text"></p><button class="link gb-again" type="button">Write another</button></div>
        <p class="gb-fine">Notes go into the book straight away, for anyone to read, and Anna may take any of them down. We keep your name, your note and the day you wrote it, and for a month a scrambled trace of your connection to keep out spam: no email, no tracking.</p>
      </section>
      <section class="gb-read" aria-labelledby="gb-read-h"><h3 id="gb-read-h">Notes from visitors</h3>
        <ol class="gb-list" aria-live="polite"></ol>
        <div class="gb-pager"><button class="link gb-newer" type="button">Newer notes</button><span class="gb-pageno"></span><button class="link gb-older" type="button">Older notes</button></div>
        <p class="gb-whole">The whole book is also kept at <a href="${WHOLE_BOOK}" target="_blank" rel="noopener">recursite.brezgis.com/guestbook</a></p>
      </section>
    </div>`);
  el = card.wrap;
  const text = $('#gb-text'), count = $('.gb-count');
  const left = () => { const n = 400 - text.value.length; count.textContent = n < 400 ? `${n} letters left` : 'up to 400 letters'; };
  text.addEventListener('input', left); left();
  $('.gb-form').addEventListener('submit', e => { e.preventDefault(); post(); });
  $('.gb-again').addEventListener('click', () => { $('.gb-thanks').hidden = true; $('.gb-form').hidden = false; text.focus(); });
  $('.gb-retry').addEventListener('click', () => { $('.gb-retry').hidden = true; $('.gb-shut-text').textContent = 'Looking in the mailbox…'; load(1).then(render); });
  $('.gb-newer').addEventListener('click', () => turn(-1));
  $('.gb-older').addEventListener('click', () => turn(1));
  return card;
}
async function turn(d) {
  const p = Math.min(Math.max(1, state.page + d), state.pages); if (p === state.page) return;
  $('.gb-list').setAttribute('aria-busy', 'true'); await load(p); $('.gb-list').removeAttribute('aria-busy'); render();
  (d > 0 ? $('.gb-older') : $('.gb-newer')).focus({ preventScroll: true });
  if ($('.gb-older').disabled || $('.gb-newer').disabled) $('#gb-read-h').scrollIntoView?.({ block: 'nearest' });
}

function noteCard(n, i, waiting) {
  const li = make('li', 'gb-note' + (waiting ? ' gb-mine' : ''));
  li.style.setProperty('--tilt', `${(([...String(n.id || i)].reduce((a, c) => a + c.charCodeAt(0), 0) + i) * 37 % 7 - 3) * 0.22}deg`);
  li.append(make('p', 'gb-text', n.text));
  const by = make('p', 'gb-by');
  by.append(make('span', 'gb-name', n.name || 'A visitor'), make('span', 'gb-date', waiting ? 'waiting for Anna to read it' : fmtDate(n.at, n.date)));
  li.append(by);
  if (!waiting && n.place && n.place !== 'house') li.append(make('p', 'gb-from', FROM[n.place] ?? `left at ${n.place}`));
  if (!waiting && n.id) li.append(reportControl(n.id));
  return li;
}
// A quiet way to tell Anna a note should not be there: one click, then a yes or no
function reportControl(id) {
  const box = make('p', 'gb-report'), done = store.get('guestbook.reported', []);
  if (done.includes(id)) { box.textContent = 'Reported. Thank you.'; return box; }
  const ask = make('button', 'link gb-report-ask', 'report'); ask.type = 'button'; ask.setAttribute('aria-label', 'Report this note to Anna');
  ask.addEventListener('click', () => {
    const q = make('span', null, 'Tell Anna this note should not be here? '), yes = make('button', 'link', 'Yes'), no = make('button', 'link', 'No');
    yes.type = no.type = 'button';
    q.append(yes, ' · ', no); box.replaceChildren(q); yes.focus({ preventScroll: true });
    no.addEventListener('click', () => { box.replaceChildren(ask); ask.focus({ preventScroll: true }); });
    yes.addEventListener('click', async () => {
      box.textContent = 'Sending…';
      let ok = false; try { ok = (await call(`/notes/${encodeURIComponent(id)}/report`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ form: state.form }) })).status === 202; } catch { /* offline */ }
      if (ok) { const d = store.get('guestbook.reported', []); d.push(id); store.set('guestbook.reported', d.slice(-200)); }
      box.textContent = ok ? 'Reported. Thank you.' : 'That did not go through. Do try again later.';
      box.setAttribute('tabindex', '-1'); box.focus({ preventScroll: true });
    });
  });
  box.append(ask);
  return box;
}

function render() {
  if (!el) return;
  const shut = $('.gb-shut'), open = $('.gb-open'), t = $('.gb-shut-text');
  if (!state.configured || state.reachable === false) {
    shut.hidden = false; open.hidden = true;
    t.textContent = !state.configured
      ? 'The guest book is not open yet. Anna is still putting up the mailbox; do come back and leave a note when it is.'
      : 'The mailbox cannot be reached just now. Perhaps the post is late, or the connection is. Do try again in a while.';
    $('.gb-retry').hidden = !state.configured;
    $('.gb-lede').hidden = true;
    return;
  }
  if (state.reachable === null) { shut.hidden = false; open.hidden = true; t.textContent = 'Looking in the mailbox…'; $('.gb-retry').hidden = true; return; }
  shut.hidden = true; open.hidden = false; $('.gb-lede').hidden = false;
  const list = $('.gb-list'); list.replaceChildren();
  const mine = state.page === 1 ? store.get('guestbook.mine', []) : [];
  mine.slice().reverse().forEach((m, i) => list.append(noteCard(m, i, true)));
  state.notes.forEach((n, i) => list.append(noteCard(n, i, false)));
  if (!list.children.length) list.append(make('li', 'gb-empty', 'No notes yet. Yours could be the first.'));
  const pager = $('.gb-pager'); pager.hidden = state.pages <= 1;
  $('.gb-newer').disabled = state.page <= 1; $('.gb-older').disabled = state.page >= state.pages;
  $('.gb-pageno').textContent = `${state.page} of ${state.pages}`;
}

// Send one note into the book (the mailbox card and the pink computer in the office both sign this way).
// A form is good for one note within two hours, and not in its first few seconds: if this one is old
// (a card left open all afternoon) or comes back stale, a fresh one is fetched quietly and the note sent again.
// Answers { ok, published } or { ok: false, form, error, offline }.
export async function sendNote(name, text, trap = '') {
  const fresh = async () => { await load(state.page); await wait(4500); };
  const send = () => call('/notes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, text, place: 'house', form: state.form, website: trap }) });
  let res = null;
  try {
    if (!state.form || Date.now() - (state.formAt ?? 0) > 100 * 60e3) await fresh();
    else if (Date.now() - state.formAt < 4500) await wait(4500 - (Date.now() - state.formAt));
    res = await send();
    if (res?.status === 400 && res.body?.code === 'form') { await fresh(); res = await send(); }
  } catch { /* offline */ }
  if (res?.status !== 202) return { ok: false, form: res?.status === 400 && res.body?.code === 'form', error: res?.body?.error ?? null, offline: !res };
  const published = res.body?.status === 'published';
  if (!published) { const mine = store.get('guestbook.mine', []); mine.push({ name, text, date: today(), at: Date.now() }); store.set('guestbook.mine', mine.slice(-20)); }
  await load(1);                                                     // (and a fresh form: each is good for one note)
  markRead();
  return { ok: true, published };
}

async function post() {
  const f = $('.gb-form'), msg = $('.gb-msg'), btn = $('.gb-post');
  const name = $('#gb-name').value.trim().slice(0, 40), text = $('#gb-text').value.trim();
  if (text.length < 2) { msg.textContent = 'Write a few words first.'; $('#gb-text').focus(); return; }
  if (text.length > 400) { msg.textContent = 'That is a little long: 400 letters at most.'; return; }
  btn.disabled = true; msg.textContent = 'Posting…';
  const r = await sendNote(name, text, f.elements['gb-leave-empty'].value);
  btn.disabled = false;
  if (r.ok) {
    f.reset(); $('#gb-text').dispatchEvent(new Event('input')); msg.textContent = '';
    $('.gb-thanks-text').textContent = r.published ? 'Thank you. It is in the book: there it is, at the top.' : 'Thank you. It is in the mailbox, and Anna will read it soon.';
    f.hidden = true; $('.gb-thanks').hidden = false;
    render(); $('.gb-again').focus({ preventScroll: true });
    window.houseUI?.toast?.(r.published ? 'Your note is in the book. Thank you.' : 'Your note is in the mailbox. Thank you.');
    return;
  }
  if (r.form) { msg.textContent = 'The mailbox has jammed for a moment. Your words are still here; please try posting again.'; return; }
  msg.textContent = r.error ?? (r.offline ? 'The note could not be sent: the connection seems to be away. Your words are still here; try again in a moment.' : 'The mailbox would not take it just now. Try again in a little while.');
}

export async function open(onClose) {
  if (!card && !build()) { window.houseUI?.toast?.('The mailbox is stuck. Try again in a moment.'); return null; }
  render();
  shownAt = performance.now();
  card.show();
  const settle = () => { if (!card.wrap.contains(document.activeElement) || !document.activeElement.offsetParent) { const r = card.wrap.querySelector('.gb-retry'); (r && !r.hidden && r.offsetParent ? r : card.wrap.querySelector('.close')).focus({ preventScroll: true }); } };
  settle();
  const was = card.hide;
  card.hide = (...a) => { card.hide = was; was(...a); onClose?.(); };
  if (state.configured) { if (state.reachable !== true) { state.reachable = null; render(); } await load(state.reachable ? state.page : 1); state.loading = Promise.resolve(state); render(); markRead(); }
  if (card.open) { if (document.activeElement === card.wrap.querySelector('.close') && !$('.gb-open').hidden) $('#gb-name').focus({ preventScroll: true }); else settle(); }
  return card;
}
export { state };
window.__guestbook = { open, peek, state, get opened() { return shownAt; } };
if (Q.has('uiguest')) { const go = () => (window.houseUI?.makeCard ? open() : setTimeout(go, 300)); setTimeout(go, 600); }
