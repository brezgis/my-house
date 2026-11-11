// Things that open over the view: a book taken down from a shelf, and the three computers
// (the office monitors: a small shell; the pink computer: a desktop of four things to open; the
// laptop on the dining table: A.'s unsent drafts). Loaded the first time one is opened.
//
// While one is open the pointer is let go, every key stops here (so letters type and nobody
// walks), Esc closes, and the pointer is taken back afterwards. Everything can be done by
// clicking or with the arrow keys and Enter; only the shell and the guest book take typing.
// Nothing is sent anywhere: there is no server. The guest book is kept in this browser only.

import { makeShell, MENU } from './shell.js';

const CSS = `
.hd-over.sheet { position: fixed; inset: 0; z-index: 30; display: none; place-items: center; padding: 16px; background: rgba(22,15,10,.62); animation: none; font-family: var(--serif, Georgia, serif); color: var(--ink, #2a1c13); }
.hd-over.sheet.on { display: grid; animation: hdIn .28s ease; }
@keyframes hdIn { from { opacity: 0; } }
.hd-over :focus-visible { outline: 2px solid var(--amber, #e2a647); outline-offset: 2px; }
.hd-over button { font: inherit; cursor: pointer; }
/* a book */
.hd-book { display: flex; gap: 0; align-items: stretch; max-width: min(860px, 100%); max-height: 90dvh; filter: drop-shadow(0 22px 40px rgba(0,0,0,.6)); animation: hdSlide .5s cubic-bezier(.2,.7,.2,1); }
@keyframes hdSlide { from { transform: translateY(40px) rotate(-3deg) scale(.86); opacity: 0; } }
.hd-cover { flex: 0 0 min(300px, 38vw); min-height: min(440px, 70dvh); box-sizing: border-box; padding: 34px 26px 26px; border-radius: 3px 0 0 3px; display: flex; flex-direction: column; text-align: center; position: relative;
  background-image: linear-gradient(90deg, rgba(0,0,0,.35), rgba(0,0,0,0) 9%, rgba(255,255,255,.07) 11%, rgba(0,0,0,0) 14%), linear-gradient(160deg, rgba(255,255,255,.1), rgba(0,0,0,.18)); }
.hd-cover::before { content: ''; position: absolute; inset: 14px 14px 14px 26px; border: 1px solid currentColor; opacity: .45; pointer-events: none; }
.hd-cover h2 { margin: auto 0 10px; font-weight: 400; font-size: clamp(21px, 3.2vw, 30px); line-height: 1.15; text-wrap: balance; }
.hd-cover .au { font-style: italic; font-size: 17px; opacity: .9; }
.hd-cover .yr { margin-top: auto; font-size: 14px; letter-spacing: .12em; opacity: .75; font-variant-numeric: lining-nums; }
.hd-page { flex: 1 1 380px; min-width: 0; box-sizing: border-box; padding: 34px 34px 20px; background: linear-gradient(90deg, #d9cdb2, #f3ead6 7%, #f6eedc); border-radius: 0 3px 3px 0; display: flex; flex-direction: column; overflow: auto; }
.hd-page .what { font-size: 13.5px; letter-spacing: .06em; text-transform: uppercase; color: var(--teak, #7a4b2a); margin: 0 0 16px; }
.hd-page .body { margin: auto 0; }
.hd-page .quote { font-size: 20px; line-height: 1.5; margin: 0; white-space: pre-line; text-wrap: pretty; }
.hd-page .src { font-size: 13.5px; font-style: italic; color: var(--ink-soft, #5b4636); margin: 18px 0 0; }
.hd-page .hand { font-style: italic; font-size: 21px; line-height: 1.45; color: #4a4a52; margin: 0; white-space: pre-line; transform: rotate(-1deg); }
.hd-page .by { text-align: right; font-style: italic; font-size: 16px; color: #5d5d66; margin: 10px 8px 0 0; }
.hd-page .paper { background: #fffdf4; box-shadow: 0 2px 7px rgba(60,40,20,.28); padding: 16px 18px; transform: rotate(1.4deg); font-size: 18px; line-height: 1.45; white-space: pre-line; margin: 4px 8px; }
.hd-page .paper.mono { font-family: ui-monospace, Menlo, Consolas, monospace; font-size: 14.5px; background: #fbfbf6; transform: rotate(-1.2deg); max-width: 250px; }
.hd-page .paper.card { background: #efe6cf; border: 1px solid rgba(122,75,42,.3); }
.hd-page .plate { border: 3px double var(--teak, #7a4b2a); padding: 18px; text-align: center; font-size: 17px; margin: 4px 30px; }
.hd-page svg.flower { display: block; width: 110px; height: 110px; margin: 0 auto 10px; opacity: .8; }
.hd-page .back:focus-visible { outline: none; text-decoration: underline; }
.hd-page .back { margin-top: 18px; padding: 12px 0 0; border: 0; border-top: 1px solid rgba(122,75,42,.25); background: none; color: var(--ink-soft, #5b4636); font-size: 15px; }
@media (max-width: 620px) { .hd-book { flex-direction: column; overflow: auto; } .hd-cover { flex: none; min-height: 0; padding: 22px 20px; border-radius: 3px 3px 0 0; } .hd-cover h2 { margin-top: 6px; } .hd-cover .yr { margin-top: 10px; } .hd-page { border-radius: 0 0 3px 3px; padding: 22px 20px 16px; } }
/* a screen */
.hd-mon { width: min(980px, 100%); max-height: 92dvh; display: flex; flex-direction: column; background: #1c1b1a; border-radius: 12px; padding: 14px 14px 10px; box-shadow: 0 24px 60px rgba(0,0,0,.65), inset 0 0 0 2px #2e2c2a; box-sizing: border-box; }
.hd-mon .bar { display: flex; align-items: center; gap: 10px; color: #9a948a; font: 13px ui-monospace, Menlo, Consolas, monospace; padding: 8px 4px 0; }
.hd-mon .bar span { flex: 1; } .hd-mon .bar button { color: #d9d2c4; background: #2e2c2a; border: 1px solid #4a4640; border-radius: 4px; padding: 5px 12px; font: inherit; }
.hd-term { display: grid; grid-template-columns: 1.55fr 1fr; gap: 10px; min-height: 0; flex: 1; }
.hd-term .scr { background: #0c1210; border-radius: 4px; color: #9fe6b0; font: 14.5px/1.45 ui-monospace, Menlo, Consolas, monospace; padding: 12px 14px; min-height: 0; height: min(52dvh, 430px); overflow: auto; box-shadow: inset 0 0 40px rgba(0,0,0,.6); }
.hd-term .log { white-space: pre-wrap; word-break: break-word; margin: 0; } .hd-term .log b { color: #e8d9a0; font-weight: 400; }
.hd-term form { display: flex; gap: 8px; margin: 2px 0 0; } .hd-term form label { color: #e8d9a0; }
.hd-term input { flex: 1; min-width: 0; background: none; border: 0; outline: 0; color: #d7ffe0; font: inherit; caret-color: #9fe6b0; padding: 0; }
.hd-term .two { color: #e6c98a; } .hd-term .two h4 { margin: 0 0 6px; font: inherit; color: #8a7f68; text-transform: uppercase; letter-spacing: .08em; font-size: 12px; } .hd-term .two pre { margin: 0 0 14px; font: inherit; white-space: pre-wrap; }
.hd-menu { display: flex; flex-wrap: wrap; gap: 6px; padding: 10px 2px 0; }
.hd-menu button { font: 13px ui-monospace, Menlo, Consolas, monospace; color: #cfe9d3; background: #17211c; border: 1px solid #2f4a3a; border-radius: 3px; padding: 5px 9px; }
.hd-menu button:hover, .hd-menu button.sel { background: #24382d; border-color: #9fe6b0; }
@media (max-width: 700px) { .hd-term { grid-template-columns: 1fr; } .hd-term .two { height: auto; max-height: 16dvh; } .hd-term .scr { height: min(38dvh, 320px); } }
/* the pink computer */
.hd-pink { background: linear-gradient(160deg, #ff8fb8, #f0609a 60%, #d94f86); border-radius: 26px; padding: 22px 22px 14px; box-shadow: 0 24px 60px rgba(0,0,0,.6), inset 0 2px 0 rgba(255,255,255,.45); }
.hd-pink .bar { color: #fff; font-family: 'Trebuchet MS', Verdana, sans-serif; } .hd-pink .bar button { background: rgba(255,255,255,.25); border-color: rgba(255,255,255,.6); color: #fff; border-radius: 12px; }
.hd-desk { position: relative; height: min(60dvh, 500px); border-radius: 8px; overflow: hidden; font: 13px Geneva, Verdana, 'Trebuchet MS', sans-serif; color: #111;
  background: #6f9ea8 repeating-linear-gradient(45deg, rgba(255,255,255,.07) 0 2px, transparent 2px 6px); box-shadow: inset 0 0 0 2px #222; }
.hd-desk .menu { display: flex; gap: 18px; align-items: center; height: 22px; padding: 0 12px; background: #eee; border-bottom: 1px solid #222; font-weight: bold; } .hd-desk .menu i { margin-left: auto; font-style: normal; font-weight: normal; }
.hd-desk .icons { position: absolute; right: 14px; top: 36px; display: grid; gap: 14px; justify-items: center; }
.hd-desk .icons button { display: grid; justify-items: center; gap: 4px; width: 92px; background: none; border: 0; color: #fff; font: inherit; text-shadow: 0 1px 2px #000; padding: 4px; border-radius: 4px; }
.hd-desk .icons button:hover, .hd-desk .icons button:focus-visible { background: rgba(0,0,40,.35); }
.hd-desk .icons svg { width: 40px; height: 40px; filter: drop-shadow(0 2px 2px rgba(0,0,0,.4)); }
.hd-win { position: absolute; left: 20px; top: 40px; width: min(540px, calc(100% - 150px)); max-height: calc(100% - 60px); display: none; flex-direction: column; background: #f4f4f0; border: 1px solid #222; box-shadow: 3px 4px 0 rgba(0,0,0,.45); }
.hd-win.on { display: flex; }
.hd-win .tb { display: flex; align-items: center; gap: 8px; height: 22px; padding: 0 5px; border-bottom: 1px solid #222; background: repeating-linear-gradient(#f4f4f0 0 2px, #9a9a96 2px 3px); }
.hd-win .tb b { background: #f4f4f0; padding: 0 8px; margin: 0 auto; } .hd-win .tb button { width: 14px; height: 14px; padding: 0; background: #f4f4f0; border: 1px solid #222; }
.hd-win .in { padding: 14px 16px; overflow: auto; line-height: 1.5; font-size: 14px; } .hd-win .in p { margin: 0 0 10px; } .hd-win .in h5 { font-size: 15px; margin: 0 0 8px; }
.hd-win .gb { list-style: none; margin: 0 0 12px; padding: 0; max-height: 170px; overflow: auto; border: 1px solid #999; background: #fff; } .hd-win .gb li { padding: 5px 9px; border-bottom: 1px dotted #bbb; } .hd-win .gb li.you { background: #fff3c4; }
.hd-win .chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 10px; } .hd-win .chips button, .hd-win form button, .hd-win .plain { font: inherit; background: #e4e4de; border: 1px solid #222; border-radius: 4px; padding: 4px 10px; box-shadow: 1px 1px 0 #222; }
.hd-win form { display: flex; gap: 6px; } .hd-win input { flex: 1; min-width: 0; font: inherit; padding: 4px 6px; border: 1px solid #222; background: #fff; }
.hd-win small { display: block; color: #555; margin-top: 10px; line-height: 1.35; }
@media (max-width: 620px) { .hd-desk .icons { right: 6px; } .hd-desk .icons button { width: 70px; font-size: 11px; } .hd-win { left: 8px; width: calc(100% - 96px); } }
/* the laptop */
.hd-mail { display: grid; grid-template-columns: 200px 1fr; height: min(58dvh, 460px); background: #f7f5ef; border-radius: 4px; overflow: hidden; font: 15px/1.5 Georgia, serif; }
.hd-mail nav { background: #e6e1d4; border-right: 1px solid #c9c2b0; padding: 10px 0; overflow: auto; } .hd-mail nav h4 { margin: 0 14px 8px; font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: #7a7466; }
.hd-mail nav button { display: block; width: 100%; text-align: left; background: none; border: 0; padding: 8px 14px; font: inherit; font-size: 14px; color: #2a2a2a; } .hd-mail nav button.sel, .hd-mail nav button:hover { background: #fff; }
.hd-mail nav button small { display: block; color: #7a7466; }
.hd-mail article { padding: 18px 22px; overflow: auto; } .hd-mail article .hd { color: #7a7466; font-size: 13.5px; border-bottom: 1px solid #ddd6c4; padding-bottom: 8px; margin-bottom: 12px; } .hd-mail article p { margin: 0 0 10px; }
.hd-mail .draft { color: #b0503a; font-size: 12.5px; letter-spacing: .06em; text-transform: uppercase; }
@media (max-width: 620px) { .hd-mail { grid-template-columns: 1fr; grid-template-rows: auto 1fr; } .hd-mail nav { display: flex; overflow-x: auto; padding: 0; border-right: 0; border-bottom: 1px solid #c9c2b0; } .hd-mail nav h4 { display: none; } .hd-mail nav button { white-space: nowrap; } }
@media (prefers-reduced-motion: reduce) { .hd-over.sheet.on, .hd-book { animation: none; } }
`;

const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private window */ } };

export function makeScreens(ctx, api) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const touch = 'ontouchstart' in window, canvas = ctx.renderer.domElement;
  const root = document.createElement('div'); root.className = 'hd-over sheet'; root.setAttribute('role', 'dialog'); root.tabIndex = -1; document.body.appendChild(root);
  let open = null, hadLock = false, openedAt = 0;
  for (const type of ['keydown', 'keyup', 'keypress']) root.addEventListener(type, e => e.stopPropagation());      // the house does not hear keys meant for the screen
  root.addEventListener('keydown', e => {
    const typing = /^(INPUT|TEXTAREA)$/.test(e.target.tagName);
    if (e.code === 'Escape') { e.preventDefault(); close(); return; }
    if (open?.key?.(e, typing)) return;
    if (typing) return;
    if (['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.code)) {            // the arrows walk the buttons
      const f = [...root.querySelectorAll('button, input')].filter(b => b.offsetParent !== null), i = f.indexOf(document.activeElement), d = e.code === 'ArrowRight' || e.code === 'ArrowDown' ? 1 : -1;
      if (f.length) { e.preventDefault(); f[(i + d + f.length) % f.length].focus(); }
    }
  });
  // keys that land outside the screen while it is open (focus lost to the page) still do not walk anybody
  addEventListener('keydown', e => { if (!open || root.contains(e.target)) return; e.stopImmediatePropagation(); if (e.code === 'Escape' || (open.easy && (e.code === 'KeyE' || e.code === 'Enter') && performance.now() - openedAt > 350)) close(); else root.focus(); }, true);
  addEventListener('keyup', e => { if (open && !root.contains(e.target)) e.stopImmediatePropagation(); }, true);
  root.addEventListener('mousedown', e => { if (e.target === root) close(); });
  function show(o, html) {
    if (open) close(true);
    open = o; openedAt = performance.now(); root.innerHTML = html; root.setAttribute('aria-label', o.name); root.classList.add('on');
    hadLock = hadLock || !!document.pointerLockElement; document.exitPointerLock?.(); ctx.walker?.keys?.clear?.();
    api.open = o.id;
    (root.querySelector('[autofocus]') ?? root).focus({ preventScroll: true });
  }
  function close(swap = false) {
    if (!open) return; const o = open; open = null; api.open = null; root.classList.remove('on'); o.closed?.(); root.innerHTML = '';
    if (swap) return;
    document.activeElement?.blur?.();
    if (hadLock && !touch) { hadLock = false; try { canvas.requestPointerLock?.()?.catch?.(() => {}); } catch { /* a click on the scene takes it back */ } }
  }

  // ---- A book -------------------------------------------------------------------------------
  const FLOWER = '<svg class="flower" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 96C49 76 51 62 50 50" fill="none" stroke="#6f7a4a" stroke-width="2"/><path d="M50 74c-9-2-15-8-17-15 9 0 15 5 17 15Z" fill="#7d8a55"/><g fill="#8d6aa0" opacity=".85"><ellipse cx="50" cy="30" rx="9" ry="15"/><ellipse cx="50" cy="30" rx="9" ry="15" transform="rotate(72 50 46)"/><ellipse cx="50" cy="30" rx="9" ry="15" transform="rotate(144 50 46)"/><ellipse cx="50" cy="30" rx="9" ry="15" transform="rotate(216 50 46)"/><ellipse cx="50" cy="30" rx="9" ry="15" transform="rotate(288 50 46)"/></g><circle cx="50" cy="46" r="5" fill="#d9b24a"/></svg>';
  function book(rec, c, onClose) {
    const col = /^#[0-9a-f]{6}$/i.test(rec.colour ?? '') ? rec.colour : '#6b2a25', n = parseInt(col.slice(1), 16), lum = (0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255;
    let body;
    if (c.kind === 'quote') body = `<p class="what">From the book itself · ${esc(c.where)}</p><div class="body"><p class="quote">${esc(c.text)}</p><p class="src">Public domain. Checked, word for word, against the Project Gutenberg text.</p></div>`;
    else {
      const by = c.by ? `<p class="by">— ${esc(c.by)}</p>` : '';
      const inner = c.kind === 'flyleaf' || c.kind === 'margin' || c.kind === 'gift' ? `<p class="hand">${esc(c.text)}</p>${by}`
        : c.kind === 'flower' ? `${FLOWER}<p class="hand" style="text-align:center;font-size:18px">${esc(c.text)}</p>`
        : c.kind === 'receipt' ? `<div class="paper mono">${esc(c.text)}</div>`
        : c.kind === 'plate' ? `<div class="plate">${esc(c.text)}</div>`
        : `<div class="paper${c.kind === 'slip' ? '' : ' card'}">${esc(c.text)}</div>${by}`;
      body = `<p class="what">${esc(c.label)}</p><div class="body">${inner}</div>`;
    }
    show({ id: 'book', name: rec.title, easy: true, closed: onClose, key: e => { if ((e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') && performance.now() - openedAt > 350) { e.preventDefault(); close(); return true; } } },
      `<div class="hd-book"><div class="hd-cover" style="background-color:${col};color:${lum > 0.55 ? '#1c1a17' : '#f1e9d6'}"><h2>${esc(rec.title)}</h2><div class="au">${esc(rec.author ?? '')}</div><div class="yr">${rec.year ? (rec.year < 0 ? -rec.year + ' BC' : rec.year) : ''}</div></div>
       <div class="hd-page">${body}<button class="back" type="button" autofocus>put it back on the shelf</button></div></div>`);
    root.querySelector('.back').addEventListener('click', () => close());
  }

  // ---- The guest book (kept in this browser, nowhere else) -----------------------------------
  const GUESTS = [['Tante Odile', 'I came for tea in March. It is now June. Lovely house.'], ['Fig', 'I let them win at chess. Once.'], ['The piano tuner', 'The B above middle C and I have reached an understanding.'], ['Mortimer', 'Please use the coasters.'], ['A.', 'Welcome. Take a book. Bring it back, or do not.']];
  const CHIPS = ['What a lovely house.', 'The tart was excellent.', 'I moved the gnome. Sorry.', 'I was here, and I ate the apple.', 'Thank you for the tea.'];
  const mineOf = () => load('hands.guestbook', []).filter(s => typeof s === 'string').slice(-40);
  const sign = text => { text = String(text).replace(/\s+/g, ' ').trim().slice(0, 80); if (!text) return; const m = mineOf(); m.push(text); save('hands.guestbook', m); paintPink(); };
  api.guests = () => [...GUESTS.map(([w, t]) => `${w}: ${t}`), ...mineOf().map(t => `You: ${t}`)];

  // ---- The pink computer ---------------------------------------------------------------------
  const ICON = { read: '<svg viewBox="0 0 40 40"><path d="M8 3h17l8 8v26H8Z" fill="#fff" stroke="#222"/><path d="M25 3v8h8M13 17h14M13 22h14M13 27h9" fill="none" stroke="#222"/></svg>',
    about: '<svg viewBox="0 0 40 40"><path d="M4 20 20 6l16 14v15H4Z" fill="#f6d98a" stroke="#222"/><path d="M1 21 20 4l19 17" fill="none" stroke="#222" stroke-width="2"/><rect x="16" y="24" width="8" height="11" fill="#8a5a3a" stroke="#222"/></svg>',
    guest: '<svg viewBox="0 0 40 40"><rect x="5" y="6" width="30" height="28" rx="2" fill="#b33a4a" stroke="#222"/><rect x="9" y="10" width="22" height="20" fill="#fff" stroke="#222"/><path d="M12 16h16M12 21h16M12 26h9" stroke="#222"/></svg>',
    music: '<svg viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill="#222"/><circle cx="20" cy="20" r="6" fill="#e2a647"/><circle cx="20" cy="20" r="1.5" fill="#222"/></svg>' };
  const WINS = {
    read: ['Read Me', () => `<h5>Read me first (or last; I am not your mother)</h5><p>Hello. You have found the pink computer. It was bought in a fit of optimism and has outlived three sensible grey ones.</p><p>House rules, such as they are: eat what is out. Take books down. Pick things up and look at them properly; put them back roughly where they were, or somewhere better.</p><p>The butlers will bring you a drink if you stand still long enough. Fig cheats at chess. The telescope is on the sleeping porch.</p><p>Stay as long as you like.</p><p>— A.</p>`],
    about: ['About This House', () => `<h5>About This House</h5><p><b>Built:</b> 1906, with a sleeping porch added in 1910.<br><b>Style:</b> Arts and Crafts bungalow, after the Greenes.<br><b>Location:</b> an island, floating. Do not ask.<br><b>Memory:</b> long.<br><b>Books:</b> ${ctx.items.books?.length ?? 'many'} on the shelves, ${api.taken.length} taken down by you so far.<br><b>Staff:</b> three butlers, who hover.<br><b>The hour:</b> ${clock()}, by the house clock.</p><p>This computer: 233 megahertz of raw power, a round mouse nobody likes, and a handle on top, for carrying it to bed.</p>`],
    guest: ['Guest Book', () => `<h5>Guest Book</h5><ul class="gb">${GUESTS.map(([w, t]) => `<li><b>${esc(w)}:</b> ${esc(t)}</li>`).join('')}${mineOf().map(t => `<li class="you"><b>You:</b> ${esc(t)}</li>`).join('')}</ul>
      <div class="chips">${CHIPS.map(c => `<button type="button" data-chip="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      <form autocomplete="off"><input type="text" maxlength="80" aria-label="Or write a line of your own" placeholder="…or write a line of your own" enterkeyhint="done"><button type="submit">Sign</button></form>
      <small>Kept in this browser and nowhere else. There is no server behind this house: nobody else will ever read your line, not even A. ${mineOf().length ? '<button type="button" class="plain" data-tear>Tear out my lines</button>' : ''}</small>`],
    music: ['Records', () => `<h5>The record player</h5><p>${esc(ctx.sound?.nowPlaying?.() ? 'Now playing: ' + ctx.sound.nowPlaying() : 'Nothing is playing just now.')}</p><p><button type="button" class="plain" data-next>Put on the next record</button></p>`],
  };
  const clock = () => { const h = ((window.house?.hour ?? 12) % 24 + 24) % 24; return `${Math.floor(h)}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`; };
  const nextRecord = () => { try { ctx.sound?.start?.(); return ctx.sound?.next?.() || ''; } catch { return ''; } };
  function imac(first) {
    show({ id: 'imac', name: 'The pink computer', closed: paintPink }, `<div class="hd-mon hd-pink"><div class="hd-desk"><div class="menu"><span>File</span><span>Edit</span><span>Special</span><i>${clock()}</i></div>
      <div class="icons">${Object.entries(WINS).map(([k, [name]], i) => `<button type="button" data-win="${k}"${i ? '' : ' autofocus'}>${ICON[k]}<span>${name}</span></button>`).join('')}</div>
      <div class="hd-win"><div class="tb"><button type="button" data-shut aria-label="Close the window"></button><b></b></div><div class="in"></div></div></div>
      <div class="bar"><span>${touch ? 'Tap an icon.' : 'Click an icon, or use the arrow keys and Enter. Esc steps away.'}</span><button type="button" data-leave>Step away</button></div></div>`);
    const win = root.querySelector('.hd-win');
    const openWin = k => { if (!WINS[k]) return; win.dataset.k = k; win.querySelector('b').textContent = WINS[k][0]; win.querySelector('.in').innerHTML = WINS[k][1](); win.classList.add('on'); api.win = k; };
    root.querySelector('.hd-pink').addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.win) openWin(b.dataset.win);
      else if ('shut' in b.dataset) { win.classList.remove('on'); api.win = null; root.querySelector(`[data-win="${win.dataset.k}"]`)?.focus(); }
      else if ('leave' in b.dataset) close();
      else if (b.dataset.chip) { sign(b.dataset.chip); openWin('guest'); }
      else if ('tear' in b.dataset) { save('hands.guestbook', []); paintPink(); openWin('guest'); }
      else if ('next' in b.dataset) { nextRecord(); setTimeout(() => open?.id === 'imac' && win.dataset.k === 'music' && openWin('music'), 300); }
    });
    root.querySelector('.hd-pink').addEventListener('submit', e => { e.preventDefault(); const i = e.target.querySelector('input'); if (i.value.trim()) { sign(i.value); openWin('guest'); } });
    if (first) openWin(first);
  }
  // what the room sees on the pink computer afterwards: the desktop, and the last line in the guest book
  const screen = name => (ctx.items.extras ?? []).find(e => e.canvas === name && e.map?.image?.getContext);
  function paintPink() {
    const e = screen('imac'); if (!e) return; const c = e.map.image, g = c.getContext('2d'), W = c.width, H = c.height, m = mineOf();
    g.fillStyle = '#6f9ea8'; g.fillRect(0, 0, W, H); g.fillStyle = '#eee'; g.fillRect(0, 0, W, 44); g.fillStyle = '#111'; g.font = 'bold 26px Verdana, sans-serif'; g.textAlign = 'left'; g.fillText('File   Edit   Special', 24, 31);
    g.fillStyle = '#f4f4f0'; g.fillRect(70, 130, W - 260, 330); g.strokeStyle = '#222'; g.lineWidth = 3; g.strokeRect(70, 130, W - 260, 330); g.fillStyle = '#c9c9c4'; g.fillRect(70, 130, W - 260, 40); g.strokeRect(70, 130, W - 260, 40);
    g.fillStyle = '#111'; g.font = 'bold 24px Verdana, sans-serif'; g.textAlign = 'center'; g.fillText('Guest Book', 70 + (W - 260) / 2, 159);
    g.font = '26px Verdana, sans-serif'; g.textAlign = 'left';
    const last = m.length ? 'You: ' + m[m.length - 1] : 'A.: Welcome. Take a book.', words = last.split(' '); let line = '', y = 230;
    for (const w of words) { if (g.measureText(line + w).width > W - 320) { g.fillText(line, 96, y); y += 38; line = ''; } line += w + ' '; } g.fillText(line, 96, y);
    for (let i = 0; i < 4; i++) { g.fillStyle = ['#fff', '#f6d98a', '#b33a4a', '#222'][i]; g.fillRect(W - 130, 90 + i * 120, 64, 64); g.strokeRect(W - 130, 90 + i * 120, 64, 64); }
    e.map.needsUpdate = true;
  }

  // ---- The office monitors: a shell, and a second screen that keeps an eye on the house ---------
  const robots = () => { try { return (window.__staff?.status?.() ?? []).map(r => ({ who: r.who, room: r.room, task: r.carrying ? `${r.task} (carrying ${r.carrying})` : r.task })); } catch { return []; } };
  const shell = makeShell({ hour: () => window.house?.hour ?? 12, next: nextRecord, robots, books: () => api.taken.map(b => `${b.title}${b.author ? ', ' + b.author : ''}`), guests: () => api.guests(), held: () => api.held });
  const lines = [];
  function term(cmds) {
    let timer = 0, sel = -1;
    show({ id: 'term', name: 'The office computer', closed: () => { clearInterval(timer); paintTerm(); },
      key: (e, typing) => {
        if (!typing || (e.code !== 'ArrowUp' && e.code !== 'ArrowDown')) return false;
        e.preventDefault(); sel = (sel + (e.code === 'ArrowDown' ? 1 : MENU.length - 1) + (sel < 0 && e.code === 'ArrowUp' ? 1 : 0)) % MENU.length; input.value = MENU[sel];
        menu.querySelectorAll('button').forEach((b, i) => b.classList.toggle('sel', i === sel)); return true;
      } },
      `<div class="hd-mon"><div class="hd-term"><div class="scr one"><pre class="log" aria-live="polite"></pre><form autocomplete="off"><label for="hd-in">guest@office:~$</label><input id="hd-in" type="text" maxlength="120" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="go" autofocus></form></div>
       <div class="scr two"></div></div><div class="hd-menu">${MENU.map(m => `<button type="button" data-cmd="${m}">${m}</button>`).join('')}</div>
       <div class="bar"><span>${touch ? 'Tap a command, or type one.' : 'Type a command, click one, or choose with ↑ ↓ and Enter. Esc steps away.'}</span><button type="button" data-leave>Step away</button></div></div>`);
    const log = root.querySelector('.log'), input = root.querySelector('input'), two = root.querySelector('.two'), one = root.querySelector('.one'), menu = root.querySelector('.hd-menu');
    const draw = () => { log.innerHTML = lines.map(l => (l.startsWith('$ ') ? `<b>guest@office:~$</b> ${esc(l.slice(2))}` : esc(l))).join('\n'); one.scrollTop = one.scrollHeight; };
    const run = cmd => {
      const r = shell.run(cmd); if (!cmd.trim()) return;
      if (r.clear) lines.length = 0; else lines.push('$ ' + cmd.trim(), ...r.out);
      if (lines.length > 200) lines.splice(0, lines.length - 200);
      api.lastOutput = r.out; draw(); if (r.exit) setTimeout(() => open?.id === 'term' && close(), 700);
    };
    const second = () => {
      const d = ctx.day?.light ?? 0.5, n = Math.round(Math.max(0, Math.min(1, d)) * 16), rs = robots();
      two.innerHTML = `<h4>house</h4><pre>clock     ${clock()}\ndaylight  ${'▓'.repeat(n)}${'░'.repeat(16 - n)}\nrecord    ${esc(ctx.sound?.nowPlaying?.() || '(silence)')}\nin hand   ${esc(api.held ?? 'nothing')}</pre><h4>staff</h4><pre>${rs.length ? rs.map(r => `${esc(String(r.who).padEnd(11))} ${esc(r.room ?? '-')}\n  ${esc(r.task ?? '')}`).join('\n') : 'no word from the butlers'}</pre>`;
    };
    if (!lines.length) lines.push('samovar-the-lesser, office. Type help, or click a command below.', '');
    draw(); second(); timer = setInterval(second, 2000);
    root.querySelector('form').addEventListener('submit', e => { e.preventDefault(); run(input.value); input.value = ''; sel = -1; menu.querySelectorAll('.sel').forEach(b => b.classList.remove('sel')); });
    root.querySelector('.hd-mon').addEventListener('click', e => { const b = e.target.closest('button'); if (b?.dataset.cmd) { run(b.dataset.cmd); if (!touch) input.focus(); } else if (b && 'leave' in b.dataset) close(); else if (!touch && !b) input.focus(); });
    for (const c of cmds ?? []) run(c);
  }
  // what the room sees afterwards: the last of the shell on the left monitor, the house on the right
  function paintTerm() {
    const mono = (name, rows, colour) => {
      const e = screen(name); if (!e) return; const c = e.map.image, g = c.getContext('2d');
      g.fillStyle = '#0c1210'; g.fillRect(0, 0, c.width, c.height); g.font = '24px ui-monospace, Menlo, Consolas, monospace'; g.textBaseline = 'top'; g.fillStyle = colour;
      rows.slice(-15).forEach((l, i) => g.fillText(l.slice(0, 58), 26, 24 + i * 33)); e.map.needsUpdate = true;
    };
    mono('screenA', [...lines.map(l => (l.startsWith('$ ') ? 'guest@office:~' + l : l)), 'guest@office:~$ _'], '#9fe6b0');
    mono('screenB', ['HOUSE', `clock     ${clock()}`, `record    ${ctx.sound?.nowPlaying?.() || '(silence)'}`, '', 'STAFF', ...robots().flatMap(r => [`${r.who}`, `   ${r.room ?? '-'} · ${r.task ?? ''}`])], '#e6c98a');
  }

  // ---- The laptop on the dining table: three letters A. has not sent ----------------------------
  const DRAFTS = [
    { to: 'the piano tuner', sub: 'The B above middle C', body: ['Dear Mr. Halloran,', 'It has started again. I do not think it is the damp. I think it is listening to the kettle.', 'Could you come on a Thursday? Thursdays it behaves, and I should like you to see that I am not inventing it. No, that is the wrong way round. Come on a Wednesday.', 'There will be lemon tart either way.'] },
    { to: 'my niece', sub: 're: re: re: the thesis', body: ['Darling,', 'I have read chapter three twice. I understood the acknowledgements and the part about the wugs, and I cried at both.', 'You asked whether it is “any good”. I am not qualified to say, and so I asked Fig, who is not qualified either, and he said it was “the least wrong thing” he had read this year, which from Fig is a sonnet.', 'Your room is ready whenever. Your book is still on my shelf, and I am holding it hostage.'] },
    { to: 'the Island Preservation Committee', sub: 'Your letter of the 4th', body: ['Sirs,', 'I acknowledge receipt of your letter concerning “the altitude of the property”.', 'The house was at ground level when I bought it. What the ground has done since is between the ground and its conscience.', 'I remain, at whatever height,'] },
  ];
  function laptop(n = 0) {
    show({ id: 'laptop', name: 'The laptop' }, `<div class="hd-mon"><div class="hd-mail"><nav><h4>Drafts (${DRAFTS.length})</h4>${DRAFTS.map((d, i) => `<button type="button" data-d="${i}"${i === n ? ' autofocus' : ''}>${esc(d.sub)}<small>to ${esc(d.to)}</small></button>`).join('')}</nav><article></article></div>
      <div class="bar"><span>A. left it open. She will not mind.</span><button type="button" data-leave>Step away</button></div></div>`);
    const art = root.querySelector('article');
    const pick = i => { const d = DRAFTS[i]; art.innerHTML = `<div class="hd"><span class="draft">Draft · not sent</span><br>To: ${esc(d.to)}<br>Subject: ${esc(d.sub)}</div>${d.body.map(p => `<p>${esc(p)}</p>`).join('')}<p>A.</p>`; root.querySelectorAll('nav button').forEach((b, k) => b.classList.toggle('sel', k === i)); api.draft = i; };
    root.querySelector('.hd-mon').addEventListener('click', e => { const b = e.target.closest('button'); if (b?.dataset.d) pick(+b.dataset.d); else if (b && 'leave' in b.dataset) close(); });
    root.querySelector('nav').addEventListener('focusin', e => { if (e.target.dataset?.d) pick(+e.target.dataset.d); });
    pick(n);
  }

  return { book, imac, term, laptop, close, sign, paintPink, paintTerm, get open() { return open?.id ?? null; } };
}
