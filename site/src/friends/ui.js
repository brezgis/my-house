// The two small cards for the friends: the telephone (who to ring, who is here,
// who to send home) and the conversation card. Paper and walnut ink, in the
// house's own tokens (ui.css); the styles are injected here.
//
// The conversation card is kept small on purpose (the owner found it busy): the
// friend's name, what they last said, two or three things to say back (1 to 3),
// and one line on how to leave (0, or simply walk away: party.js fades the card
// as she goes and lets the talk go once she has really gone). Their words also
// float over their head; the card is there for when the bubble is out of view.
//
// Typing and the house: the walker and main.js listen for keys on `window` and
// the mouse is pointer-locked while walking. So a card releases the pointer when
// it takes the keyboard, stops every key event at the card (so W A S D type
// letters and move nobody), closes on Esc, and hands the pointer back. The cards
// carry the class "sheet" only so that ui.js's own key watcher (H for help) lets
// their keys through; every .sheet style is overridden below.

const CSS = `
.fr-card.sheet { position: fixed; inset: auto; z-index: 7; display: block; box-sizing: border-box; padding: 15px 18px 12px; border-radius: 2px; place-items: initial;
  background: var(--pegs), var(--grain), linear-gradient(170deg, #f4ead6, var(--paper, #f0e5cf) 60%, #ebdfc6); color: var(--ink, #2a1c13); box-shadow: var(--lift, 0 12px 40px rgba(0,0,0,.5));
  font-family: var(--serif, Georgia, serif); font-size: 16px; line-height: 1.35; opacity: 0; visibility: hidden; transform: translateY(6px); transition: opacity .22s ease, transform .22s ease, visibility 0s .22s; animation: none; }
.fr-card.sheet.on { display: block; animation: none; opacity: var(--fade, 1); visibility: visible; transform: none; transition: opacity .22s ease, transform .22s ease; }
.fr-card.sheet.going { transition: opacity .7s ease, transform .7s ease, visibility 0s .7s; }
.fr-card :focus-visible { outline: 2px solid var(--verdigris, #3d6151); outline-offset: 2px; }
.fr-card.sheet h2 { margin: 0 34px 0 4px; font-weight: 400; font-size: 23px; line-height: 1.15; }
.fr-card.sheet h2 small { display: block; font-size: 14px; font-style: italic; color: var(--teak, #7a4b2a); margin-top: 2px; }
.fr-card .fr-rule { display: block; width: 120px; height: 9px; margin: 8px 0 10px 4px; color: var(--teak, #7a4b2a); }
.fr-card .fr-x { position: absolute; top: 8px; right: 10px; width: 36px; height: 36px; border: 0; background: none; cursor: pointer; color: var(--teak, #7a4b2a); font-size: 24px; line-height: 1; border-radius: 2px; }
.fr-card .fr-x:hover { color: var(--ink, #2a1c13); }
.fr-card .fr-foot { margin: 9px 4px 0; padding-top: 8px; border-top: 1px solid rgba(122, 75, 42, .22); font-size: 13px; font-style: italic; color: var(--ink-soft, #5b4636); display: flex; align-items: center; gap: 10px; }
.fr-card .fr-foot span { flex: 1; }
.fr-key { display: inline-flex; align-items: center; justify-content: center; min-width: 1.5em; height: 1.5em; flex: none; border-radius: 3px; background: var(--ink, #2a1c13); color: var(--paper, #f0e5cf);
  font-style: normal; font-size: .82em; font-variant-numeric: lining-nums; box-shadow: inset 0 1px 0 rgba(255, 240, 210, .22), inset 0 -2px 0 rgba(0, 0, 0, .45); }
.fr-btn { font: inherit; font-size: 14.5px; color: var(--ink, #2a1c13); background: rgba(122, 75, 42, .1); border: 1px solid rgba(122, 75, 42, .42); border-radius: 2px; padding: 5px 11px 6px; cursor: pointer; white-space: nowrap; }
.fr-btn:hover { background: rgba(122, 75, 42, .2); }
.fr-btn:disabled { opacity: .5; cursor: default; }

#fr-phone { right: max(16px, 4vw); top: 50%; width: min(400px, calc(100vw - 32px)); margin-top: -210px; }
#fr-phone .fr-who { display: grid; grid-template-columns: auto 1fr auto; gap: 2px 10px; align-items: center; width: 100%; text-align: left; font: inherit; color: inherit; background: none; border: 0;
  border-top: 1px solid rgba(122, 75, 42, .16); padding: 9px 4px 10px; cursor: pointer; border-radius: 2px; }
#fr-phone .fr-who:first-of-type { border-top: 0; }
#fr-phone .fr-who:hover:not(:disabled) { background: rgba(122, 75, 42, .09); }
#fr-phone .fr-who:disabled { cursor: default; }
#fr-phone .fr-who .nm { font-size: 18px; }
#fr-phone .fr-who .tg { grid-column: 2 / 4; font-size: 13.5px; font-style: italic; color: var(--ink-soft, #5b4636); }
#fr-phone .fr-who .do { font-size: 14px; color: var(--teak, #7a4b2a); white-space: nowrap; }
#fr-phone .fr-who[data-st=here] .do { color: var(--verdigris, #3d6151); }
#fr-phone .fr-who .do u { text-decoration: none; border-bottom: 1px solid currentColor; }
#fr-phone .fr-line { margin: 10px 4px 0; padding: 9px 12px 10px; background: rgba(122, 75, 42, .09); border-left: 2px solid var(--teak, #7a4b2a); font-size: 15.5px; min-height: 2.7em; }
#fr-phone .fr-line i { display: block; font-size: 13px; color: var(--teak, #7a4b2a); margin-bottom: 2px; }
#fr-phone .fr-line:empty { display: none; }

#fr-chat { right: max(16px, 4vw); bottom: max(84px, 13vh); width: min(360px, calc(100vw - 32px)); padding: 12px 16px 10px; }
#fr-chat h2 { font-size: 20px; margin-bottom: 6px; }
#fr-chat .fr-said { margin: 0 4px 10px; font-size: 15.5px; line-height: 1.4; max-height: 7.1em; overflow: hidden; }
#fr-chat .fr-said:empty { display: none; }
#fr-chat .fr-said.new { animation: frIn .3s ease; }
@keyframes frIn { from { opacity: 0; transform: translateY(3px); } }
#fr-chat .fr-chips { display: grid; gap: 5px; margin: 0; }
#fr-chat .fr-chip { display: flex; align-items: center; gap: 9px; font: inherit; font-size: 15px; color: var(--ink, #2a1c13); background: rgba(122, 75, 42, .07); border: 1px solid rgba(122, 75, 42, .26);
  border-radius: 2px; padding: 5px 10px 6px 6px; cursor: pointer; text-align: left; }
#fr-chat .fr-chip:hover { background: rgba(122, 75, 42, .17); }
#fr-chat .fr-foot { margin-top: 8px; padding-top: 6px; }
.touch #fr-chat { bottom: auto; top: max(58px, 9vh); }
.touch .fr-card .fr-keys, .touch .fr-key { display: none; }
.touch #fr-chat .fr-chip { padding: 9px 12px; }
.touch #fr-phone .fr-who { padding: 13px 4px; }
@media (max-width: 560px) {
  #fr-phone { right: 16px; }
  #fr-chat { right: 16px; }
}
@media (prefers-reduced-motion: reduce) { .fr-card.sheet, #fr-chat .fr-said.new { transition: none; animation: none; } }
`;

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rich = s => esc(s).replace(/\*([^*]+)\*/g, '<i>$1</i>');

export function makeUI({ canvas, touch = 'ontouchstart' in window } = {}) {
  const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
  const make = (id, label, html) => {
    const el = document.createElement('div'); el.id = id; el.className = 'fr-card sheet'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', label); el.innerHTML = html; document.body.appendChild(el);
    for (const type of ['keydown', 'keyup', 'keypress']) el.addEventListener(type, e => e.stopPropagation());      // the house does not hear keys meant for the card
    return el;
  };
  // The pointer: let go of it while a card has the keyboard, and take it back afterwards
  let hadLock = false;
  const release = () => { if (document.pointerLockElement) { hadLock = true; document.exitPointerLock?.(); } };
  const relock = () => {
    if (!hadLock || touch || !canvas || phone.open) return;
    hadLock = false;
    try { const p = canvas.requestPointerLock?.(); p?.catch?.(() => {}); } catch { /* the browser kept the pointer: a click on the scene takes it back */ }
  };

  // ---- The telephone -----------------------------------------------------------------------
  const phoneEl = make('fr-phone', 'The telephone', `<button class="fr-x" type="button" aria-label="Hang up">×</button><h2>Who shall we ring?</h2>
    <div class="fr-list"></div><div class="fr-line" aria-live="polite"></div>`);
  const phone = {
    open: false, api: null,
    show(api) {
      phone.api = api; phone.open = true; if (chat.open) chat.hide(true);
      release(); phone.draw(); phoneEl.classList.add('on');
      (phoneEl.querySelector('.fr-who:not(:disabled)') ?? phoneEl.querySelector('.fr-x')).focus({ preventScroll: true });
      api.onOpen?.();
    },
    hide() { if (!phone.open) return; phone.open = false; phoneEl.classList.remove('on'); document.activeElement?.blur?.(); phone.api?.onClose?.(); relock(); },
    draw() {
      if (!phone.open) return;
      const rows = phone.api.list(), focus = document.activeElement?.dataset?.id;
      phoneEl.querySelector('.fr-list').innerHTML = rows.map((r, i) => {
        const what = r.status === 'here' ? `here · <u>ask ${esc(r.short)} to head home</u>` : r.status === 'coming' ? 'on the way…' : r.status === 'leaving' ? 'just leaving…' : `<u>ring${r.been ? ' again' : ''}</u>`;
        return `<button class="fr-who" type="button" data-id="${r.id}" data-st="${r.status}"${r.status === 'coming' || r.status === 'leaving' ? ' disabled' : ''}><span class="fr-key">${i + 1}</span><span class="nm">${esc(r.name)}</span><span class="do">${what}</span>
          <span class="tg">${esc(r.tag)}</span></button>`;
      }).join('');
      if (focus) phoneEl.querySelector(`.fr-who[data-id="${focus}"]:not(:disabled)`)?.focus({ preventScroll: true });
    },
    say(who, text) { phoneEl.querySelector('.fr-line').innerHTML = text ? `<i>${esc(who)}</i>${rich(text)}` : ''; },
    async use(id) {
      const r = phone.api.list().find(x => x.id === id); if (!r) return;
      if (r.status === 'here') { const t = await phone.api.sendHome(id); phone.say(`${r.short}, across the room`, t); }
      else if (r.status === 'away') { phone.say(`Ringing ${r.short}…`, ' '); const t = await phone.api.ring(id); phone.say(`${r.short}, on the line`, t); }
      phone.draw();
    },
  };
  phoneEl.addEventListener('click', e => { const b = e.target.closest('.fr-who'); if (b && !b.disabled) phone.use(b.dataset.id); else if (e.target.closest('.fr-x')) phone.hide(); });
  phoneEl.addEventListener('keydown', e => {
    if (e.code === 'Escape') { e.preventDefault(); phone.hide(); return; }
    const n = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[e.code];
    if (n !== undefined) { const b = phoneEl.querySelectorAll('.fr-who')[n]; if (b && !b.disabled) { e.preventDefault(); phone.use(b.dataset.id); } }
    if (e.code === 'ArrowDown' || e.code === 'ArrowUp') { const bs = [...phoneEl.querySelectorAll('.fr-who:not(:disabled)')], i = bs.indexOf(document.activeElement); if (bs.length) { e.preventDefault(); bs[(i + (e.code === 'ArrowDown' ? 1 : bs.length - 1)) % bs.length].focus(); } }
  });

  // ---- The conversation card ----------------------------------------------------------------
  const chatEl = make('fr-chat', 'Talking with a friend', `<button class="fr-x" type="button" aria-label="Leave the conversation">×</button><h2><span class="nm"></span></h2>
    <p class="fr-said" aria-live="polite"></p><div class="fr-chips"></div><div class="fr-foot"><span class="fr-hint"></span></div>`);
  const said = chatEl.querySelector('.fr-said'), chipsEl = chatEl.querySelector('.fr-chips'), hint = chatEl.querySelector('.fr-hint');
  const last = new Map();                      // the last thing each friend said, for the visit
  let fadeK = 1;
  const chat = {
    open: false, resting: false, who: null, api: null, chips: [],
    // who: { id, name, short, tag }.  api: { say(id, text), dance(), dancing(), chips(id), closed() }
    show(who, api, focus = true) {
      if (phone.open) phone.hide();
      const again = chat.open && chat.who?.id === who.id;
      chat.who = who; chat.api = api; chat.open = true;
      if (!again) { chatEl.querySelector('.nm').textContent = who.name; said.innerHTML = last.get(who.id) ?? ''; chat.setChips(api.chips(who.id)); }
      chat.fade(1); chatEl.classList.remove('going'); chatEl.classList.add('on');
      chat.sync();
    },
    rest() {},                                 // (kept for callers: the card no longer has a resting state)
    // quiet: no "closed" call back; soft: a slow fade, as when she walks away
    hide(quiet, soft = false) {
      if (!chat.open) return; const api = chat.api; chat.open = false;
      chatEl.classList.toggle('going', soft); chatEl.classList.remove('on');
      if (chatEl.contains(document.activeElement)) document.activeElement.blur();
      if (!quiet) { api?.closed?.(); relock(); }
    },
    // 0..1 as she drifts off (party.js); written only when it changes
    fade(k) { k = Math.round(Math.max(0, Math.min(1, k)) * 20) / 20; if (k !== fadeK) { fadeK = k; chatEl.style.setProperty('--fade', k); } },
    sync() {
      if (!chat.open) return;
      const n = chat.chips.length;
      hint.innerHTML = touch ? 'Tap a line, or walk away to leave.' : `<span class="fr-key">1</span>${n > 1 ? `–<span class="fr-key">${n}</span>` : ''} answer · <span class="fr-key">0</span> goodbye, or just walk away`;
    },
    setChips(list) {
      chat.chips = (list ?? []).slice(0, 3);      // three at most: enough to steer by, few enough to read at a glance
      chipsEl.innerHTML = chat.chips.map((c, i) => `<button class="fr-chip" type="button" data-i="${i}"><span class="fr-key">${i + 1}</span>${esc(c)}</button>`).join('');
      chat.sync();
    },
    // kind: 'you' | 'them' | 'note'. The card shows only the friend's latest line (their bubble shows it too)
    add(kind, who, text, forId = chat.who?.id) {
      if (kind === 'you') return;
      const html = kind === 'note' ? `<i>${rich(text)}</i>` : rich(text);
      last.set(forId, html);
      if (chat.open && chat.who?.id === forId) { said.innerHTML = html; said.classList.remove('new'); void said.offsetWidth; said.classList.add('new'); }
    },
    send(text) {
      text = String(text ?? '').trim().slice(0, 140); if (!text || !chat.open) return;
      chat.api.say(chat.who.id, text);
    },
  };
  addEventListener('keydown', e => {
    if (!chat.open || phone.open || e.ctrlKey || e.metaKey || e.altKey || /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName ?? '')) return;
    const n = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[e.code];
    if (n !== undefined && n < chat.chips.length) { e.preventDefault(); e.stopImmediatePropagation(); chat.send(chat.chips[n]); }
    else if (e.code === 'Digit5' || e.code === 'Numpad5') { e.preventDefault(); e.stopImmediatePropagation(); chat.api.dance(); chat.sync(); }      // (still there for those who know it)
    else if (e.code === 'Digit0' || e.code === 'Numpad0') { e.preventDefault(); e.stopImmediatePropagation(); chat.send('Goodbye'); }
    else if (e.code === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); chat.hide(); }
  }, true);
  chatEl.addEventListener('click', e => {
    const c = e.target.closest('.fr-chip');
    if (c) { chat.send(chat.chips[Number(c.dataset.i)]); }
    else if (e.target.closest('.fr-x')) chat.hide();
  });
  // Clicking back into the scene takes the pointer again: the card rests, still readable
  document.addEventListener('pointerlockchange', () => { if (document.pointerLockElement) { hadLock = false; if (phone.open) phone.hide(); } });

  return { phone, chat, relock };
}
