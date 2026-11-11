// The two small cards for the friends: the telephone (who to ring, who is here,
// who to send home) and the chat box (type, or pick a suggestion). Paper and
// walnut ink, in the house's own tokens (ui.css); the styles are injected here.
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
.fr-card.sheet.on { display: block; animation: none; opacity: 1; visibility: visible; transform: none; transition: opacity .22s ease, transform .22s ease; }
.touch .fr-card.sheet.resting { opacity: 1; }
.fr-card.sheet.resting { opacity: .82; }
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

#fr-chat { right: max(16px, 4vw); bottom: max(84px, 13vh); width: min(430px, calc(100vw - 32px)); }
#fr-chat .fr-log { max-height: min(212px, 30vh); overflow-y: auto; overscroll-behavior: contain; scrollbar-width: thin; scrollbar-color: rgba(122, 75, 42, .45) transparent; margin: 0 0 9px; padding: 0 4px; font-size: 15.5px; }
#fr-chat .fr-log p { margin: 0 0 6px; display: grid; grid-template-columns: 4.6em 1fr; gap: 0 9px; }
#fr-chat .fr-log p b { font-weight: 400; font-style: italic; font-size: 13.5px; color: var(--teak, #7a4b2a); text-align: right; padding-top: 1.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
#fr-chat .fr-log p.you span { color: var(--ink-soft, #5b4636); }
#fr-chat .fr-log p.you b { color: var(--ink-soft, #5b4636); }
#fr-chat .fr-log p.note { display: block; font-style: italic; font-size: 13.5px; color: var(--ink-soft, #5b4636); text-align: center; }
#fr-chat .fr-log p.new { animation: frIn .3s ease; }
@keyframes frIn { from { opacity: 0; transform: translateY(3px); } }
#fr-chat .fr-chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 9px; }
#fr-chat .fr-chip { display: inline-flex; align-items: center; gap: 7px; font: inherit; font-size: 14.5px; color: var(--ink, #2a1c13); background: rgba(122, 75, 42, .08); border: 1px solid rgba(122, 75, 42, .32);
  border-radius: 2px; padding: 4px 10px 5px 5px; cursor: pointer; text-align: left; }
#fr-chat .fr-chip:hover { background: rgba(122, 75, 42, .18); }
#fr-chat form { display: flex; gap: 7px; margin: 0; }
#fr-chat input { flex: 1; min-width: 0; font: inherit; font-size: 16px; color: var(--ink, #2a1c13); background: rgba(255, 252, 244, .6); border: 1px solid rgba(122, 75, 42, .45); border-radius: 2px; padding: 6px 9px 7px; }
#fr-chat input::placeholder { color: rgba(91, 70, 54, .7); font-style: italic; }
#fr-chat input:focus { outline: 2px solid var(--verdigris, #3d6151); outline-offset: 1px; background: rgba(255, 252, 244, .9); }
.touch #fr-chat { bottom: auto; top: max(58px, 9vh); }
.touch .fr-card .fr-keys, .touch .fr-key { display: none; }
.touch #fr-chat .fr-chip { padding: 8px 12px; }
.touch #fr-phone .fr-who { padding: 13px 4px; }
@media (max-width: 560px) {
  #fr-phone { right: 16px; }
  #fr-chat { right: 16px; }
  #fr-chat .fr-log { max-height: 24vh; }
}
@media (prefers-reduced-motion: reduce) { .fr-card.sheet, #fr-chat .fr-log p.new { transition: none; animation: none; } }
`;

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rich = s => esc(s).replace(/\*([^*]+)\*/g, '<i>$1</i>');
const RULE = '<svg class="fr-rule" aria-hidden="true"><use href="#cloudlift"/></svg>';

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
    if (!hadLock || touch || !canvas || phone.open || (chat.open && !chat.resting)) return;
    hadLock = false;
    try { const p = canvas.requestPointerLock?.(); p?.catch?.(() => {}); } catch { /* the browser kept the pointer: a click on the scene takes it back */ }
  };

  // ---- The telephone -----------------------------------------------------------------------
  const phoneEl = make('fr-phone', 'The telephone', `<button class="fr-x" type="button" aria-label="Hang up">×</button><h2>The telephone<small>Who shall we ring?</small></h2>${RULE}
    <div class="fr-list"></div><div class="fr-line" aria-live="polite"></div><div class="fr-foot"><span>Friends come to the front door.<span class="fr-keys"> Esc hangs up.</span></span></div>`);
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
          <span class="tg">${esc(r.tag)}${r.been && r.status === 'away' ? ' · was round earlier' : ''}</span></button>`;
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

  // ---- The chat box ------------------------------------------------------------------------
  const chatEl = make('fr-chat', 'Talking with a friend', `<button class="fr-x" type="button" aria-label="Step back">×</button><h2><span class="nm"></span><small></small></h2>${RULE}
    <div class="fr-log" role="log" aria-live="polite"></div><div class="fr-chips"></div>
    <form autocomplete="off"><input type="text" maxlength="140" enterkeyhint="send" autocapitalize="sentences" aria-label="Say something" placeholder="Say something…"><button class="fr-btn" type="submit">Say</button></form>
    <div class="fr-foot"><span class="fr-hint"></span><button class="fr-btn fr-dance" type="button">Dance</button></div>`);
  const log = chatEl.querySelector('.fr-log'), input = chatEl.querySelector('input'), chipsEl = chatEl.querySelector('.fr-chips'), hint = chatEl.querySelector('.fr-hint'), danceBtn = chatEl.querySelector('.fr-dance');
  const logs = new Map();                      // what has been said, kept per friend for the visit
  const chat = {
    open: false, resting: false, who: null, api: null, chips: [],
    // who: { id, name, short, tag }.  api: { say(id, text), dance(), dancing(), chips(id), closed() }
    show(who, api, focus = true) {
      if (phone.open) phone.hide();
      const again = chat.open && chat.who?.id === who.id;
      chat.who = who; chat.api = api; chat.open = true;
      if (!again) {
        chatEl.querySelector('.nm').textContent = who.name; chatEl.querySelector('small').textContent = who.tag;
        log.innerHTML = (logs.get(who.id) ?? []).join(''); log.scrollTop = log.scrollHeight;
        input.value = ''; input.placeholder = `Say something to ${who.short}…`;
        chat.setChips(api.chips(who.id));
      }
      chatEl.classList.add('on'); chat.rest(!focus || touch);
      if (focus && !touch) { release(); input.focus({ preventScroll: true }); }
      chat.sync();
    },
    // resting: the card stays up as a record of the talk while you walk about; E on the friend takes up the pen again
    rest(on) { chat.resting = on; chatEl.classList.toggle('resting', on); if (on && document.activeElement && chatEl.contains(document.activeElement)) document.activeElement.blur(); chat.sync(); },
    hide(quiet) { if (!chat.open) return; const api = chat.api; chat.open = false; chat.resting = false; chatEl.classList.remove('on', 'resting'); if (chatEl.contains(document.activeElement)) document.activeElement.blur(); if (!quiet) { api?.closed?.(); relock(); } },
    sync() {
      if (!chat.open) return;
      danceBtn.textContent = chat.api?.dancing?.() ? 'Stop dancing' : 'Dance';
      hint.innerHTML = touch ? 'Tap a line, or type your own.' : chat.resting ? `<span class="fr-key">E</span> on ${esc(chat.who.short)} to say more` : 'Enter says it · Esc steps back';
    },
    setChips(list) {
      chat.chips = (list ?? []).slice(0, 4);
      chipsEl.innerHTML = chat.chips.map((c, i) => `<button class="fr-chip" type="button" data-i="${i}"><span class="fr-key">${i + 1}</span>${esc(c)}</button>`).join('');
    },
    // kind: 'you' | 'them' | 'note'
    add(kind, who, text, forId = chat.who?.id) {
      const html = kind === 'note' ? `<p class="note new">${rich(text)}</p>` : `<p class="${kind} new"><b>${esc(who)}</b><span>${rich(text)}</span></p>`;
      const list = logs.get(forId) ?? []; list.push(html.replace(' new"', '"')); if (list.length > 40) list.shift(); logs.set(forId, list);
      if (chat.open && chat.who?.id === forId) { log.insertAdjacentHTML('beforeend', html); while (log.children.length > 40) log.firstChild.remove(); log.scrollTop = log.scrollHeight; }
    },
    send(text) {
      text = String(text ?? '').trim().slice(0, 140); if (!text || !chat.open) return;
      chat.add('you', 'You', text); input.value = '';
      chat.api.say(chat.who.id, text);
    },
  };
  chatEl.querySelector('form').addEventListener('submit', e => { e.preventDefault(); chat.send(input.value); if (!touch) input.focus({ preventScroll: true }); });
  chatEl.addEventListener('click', e => {
    const c = e.target.closest('.fr-chip');
    if (c) { chat.send(chat.chips[Number(c.dataset.i)]); if (!touch && !chat.resting) input.focus({ preventScroll: true }); }
    else if (e.target.closest('.fr-x')) chat.hide();
    else if (e.target.closest('.fr-dance')) { chat.api.dance(); chat.sync(); if (!touch && !chat.resting) input.focus({ preventScroll: true }); }
  });
  input.addEventListener('focus', () => { if (chat.open && chat.resting) { release(); chat.rest(false); } });
  chatEl.addEventListener('keydown', e => {
    if (e.code === 'Escape') { e.preventDefault(); chat.hide(); return; }
    const n = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3 }[e.code];
    if (n !== undefined && !input.value && n < chat.chips.length && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); chat.send(chat.chips[n]); }
  });
  // Clicking back into the scene takes the pointer again: the card rests, still readable
  document.addEventListener('pointerlockchange', () => { if (document.pointerLockElement) { hadLock = false; if (chat.open) chat.rest(true); if (phone.open) phone.hide(); } });

  return { phone, chat, relock };
}
