// The interface round the house: the threshold while it loads, the invitation,
// and, once inside, the caption, passing notes, the help and settings cards,
// the now-playing line and the touch controls. Styles are in ui.css.
//
// Loaded after main.js as its own module. main.js hands over what is needed as
// window.house = { ctx, setHour, hour }; everything else is read from the page.
// Other parts of the house can send a passing note with window.houseUI.toast(text).
//
// Query parameters that force a state, for screenshots:
//   uiload=0.4      hold the threshold at 40%          uihelp, uisettings, uiabout   open a card
//   uitoast=text    show a note                        uiprompt=text                 show the E prompt
//   uitouch         touch controls                     uiplaying=title               now-playing line
//   uinote          the "click to look" note           card                          the picture for shared links

import * as THREE from 'three';
import { eyeHeight, setEyeHeight } from './walk.js';
import { aboutPanel } from './about.js';

const Q = new URLSearchParams(location.search);
const $ = id => document.getElementById(id);
const html = document.documentElement, body = document.body;
const H = window.house;                                   // set by main.js; missing if main.js failed
const touch = Q.has('uitouch') || 'ontouchstart' in window;      // the same test main.js uses for pointer lock
html.classList.toggle('touch', touch);
const instant = Q.has('view') || Q.has('shot') || Q.has('at') || Q.has('card');

const el = (tag, attrs = {}, inner = '') => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); e.innerHTML = inner; return e; };
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtHour = h => {
  h = ((h % 24) + 24) % 24;
  const hh = Math.floor(h), mm = String(Math.floor((h % 1) * 60 + 1e-6)).padStart(2, '0');
  const part = h < 5 ? 'at night' : h < 12 ? 'in the morning' : h < 17 ? 'in the afternoon' : h < 21 ? 'in the evening' : 'at night';
  return `${((hh + 11) % 12) + 1}:${mm} ${part}`;
};
const fmtEye = v => `${Math.floor(v)}′ ${Math.round((v % 1) * 12)}″`;
const store = { get: (k, d) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private window */ } } };

// ---- The threshold -----------------------------------------------------------------
const loading = $('loading'), glass = $('glassFill'), ruleFill = $('ruleFill'), count = $('loadCount');
let shown = 0, opened = false;
function setProgress(p, done, total) {
  shown = Math.max(shown, Math.min(1, p));
  const h = 20 * shown;                                             // the lantern's glass fills from the bottom
  glass.setAttribute('y', 43 - h); glass.setAttribute('height', h);
  ruleFill.style.strokeDashoffset = 100 - shown * 100;
  if (total) count.textContent = `${done} of ${total} things brought in`;
}
function open() {
  if (opened) return; opened = true;
  setProgress(1);
  if (instant) { loading.remove(); html.classList.add('ui-open'); return; }
  loading.classList.add('lit'); count.textContent = 'Come in';
  setTimeout(() => { loading.classList.add('gone'); html.classList.add('ui-open'); }, 650);
  setTimeout(() => loading.remove(), 1700);
}
if (!H) {                                                           // main.js did not run: say so plainly
  loading.classList.add('failed');
  count.textContent = 'The house did not open this time. Reload the page to try again.';
} else if (Q.has('uiload')) {
  setProgress(Number(Q.get('uiload')) || 0, Math.round(140 * (Number(Q.get('uiload')) || 0)), 140);
} else {
  const M = THREE.DefaultLoadingManager;
  const chain = (k, f) => { const prev = M[k]; M[k] = (...a) => { try { prev?.(...a); } finally { f(...a); } }; };
  let after = false;                                                 // models that keep arriving after the door opens
  chain('onProgress', (url, done, total) => {
    if (!opened) setProgress(done / total, done, total);
    else { after = true; const t = $('trickle'); t.classList.toggle('on', done < total); t.style.setProperty('--p', `${Math.round(100 * done / total)}%`); }
  });
  chain('onLoad', () => { if (after) $('trickle').classList.remove('on'); });
  const check = () => { if (body.classList.contains('ready')) open(); };
  new MutationObserver(check).observe(body, { attributes: true, attributeFilter: ['class'] }); check();
  setTimeout(open, 45000);                                          // never keep a guest on the step for ever
}

// ---- Passing notes --------------------------------------------------------------------
const toastEl = el('div', { id: 'toast', role: 'status', 'aria-live': 'polite' }); body.append(toastEl);
let toastTimer = 0;
function toast(text, ms) {
  text = String(text ?? '').trim(); if (!text) return;
  const np = /^now playing:\s*/i.exec(text);
  if (np) toastEl.innerHTML = `<i>Now playing</i>&ensp;${esc(text.slice(np[0].length))}`;
  else toastEl.textContent = text[0].toUpperCase() + text.slice(1);
  toastEl.classList.add('on'); clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('on'), ms ?? Math.min(6500, 2200 + text.length * 45));
}

// ---- Caption extras: now playing, the help whisper, the look note ----------------------------
const playing = el('div', { id: 'playing', 'aria-live': 'off' }); body.append(playing);
const hint = el('button', { id: 'hint', type: 'button', 'aria-label': 'Help: how to get about' }, touch ? '?' : '<kbd>H</kbd>for help'); body.append(hint);
const lookNote = el('div', { id: 'looknote', 'aria-hidden': 'true' }, 'Click to look around again'); body.append(lookNote);
let hintTimer = 0;
const walking = () => body.classList.contains('walking');

// ---- Cards ---------------------------------------------------------------------------------
const cards = [];
function makeCard(id, title, inner) {
  const wrap = el('div', { id, class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': id + '-title' },
    `<div class="paper"><button class="close" type="button" aria-label="Close">×</button><h2 id="${id}-title">${title}</h2>
     <svg class="rule" aria-hidden="true"><use href="#cloudlift"/></svg>${inner}</div>`);
  body.append(wrap);
  let back = null;
  const card = {
    wrap, get open() { return wrap.classList.contains('on'); },
    show() {
      for (const c of cards) if (c !== card && c.open) c.hide(true);
      if (aboutPanel?.open) aboutPanel.hide();
      back = document.activeElement; wrap.classList.add('on'); document.exitPointerLock?.(); card.onShow?.();
      (wrap.querySelector('[data-first]') ?? wrap.querySelector('.close')).focus({ preventScroll: true });
    },
    hide(swap) { wrap.classList.remove('on'); if (!swap && back?.isConnected && back !== body) back.focus?.({ preventScroll: true }); else if (!swap) document.activeElement?.blur?.(); },
  };
  wrap.addEventListener('click', e => { if (e.target === wrap || e.target.closest('.close')) card.hide(); });
  wrap.addEventListener('keydown', e => {
    cardKey(e, card); e.stopPropagation();                           // the house does not hear keys meant for the card
    if (e.key !== 'Tab') return;                                     // keep Tab inside the card
    const f = [...wrap.querySelectorAll('button, input, select, a[href]')].filter(x => !x.disabled && x.offsetParent);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
    else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
  });
  cards.push(card); return card;
}

const row = (keys, what) => `<dt>${keys}</dt><dd>${what}</dd>`;
const k = s => s.split(' ').map(x => `<kbd>${x}</kbd>`).join('');
const help = makeCard('help', 'How to get about', `
  <div class="groups keys-only">
    <section><h3>Walking</h3><dl>
      ${row(k('W A S D'), 'walk; the arrow keys work too')}
      ${row(k('W W'), 'tap twice and hold to run <small>(or hold Shift)</small>')}
      ${row(k('Space'), 'jump')}
      ${row(k('C'), 'crouch, while held')}
      ${row(k('− ='), 'lower or raise your eyes')}
    </dl></section>
    <section><h3>Looking</h3><dl>
      ${row('mouse', 'look around <small>(click once to let the house have the pointer)</small>')}
      ${row(k('Esc'), 'have the pointer back')}
      ${row(k('O'), 'step outside to the view from above, and back')}
    </dl></section>
    <section><h3>Using things</h3><dl>
      ${row(k('E') + ' or click', 'open, sit, light, talk to the staff; upstairs, play chess, spin the globe, use the telescope')}
      ${row(k('1 2 3'), 'choose what to say to a robot')}
      ${row(k('1') + '…' + k('0'), 'play notes, sitting at the piano; ' + k('P') + ' plays a phrase')}
      ${row(k('X'), 'wipe the chalkboard')}
      ${row(k('Q'), 'sip your drink, or take a bite')}
    </dl></section>
    <section><h3>The house</h3><dl>
      ${row(k('F'), 'carry a lantern')}
      ${row(k('N'), 'a new game, at the chess table')}
      ${row(k('T'), 'turn the television off')}
      ${row('telephone', 'in the hall: ring a friend round')}
      ${row(k('[ ]'), 'turn the clock back or on, half an hour at a time')}
      ${row(k('M'), 'sound on or off')}
      ${row(k('I'), 'about this house and its sources')}
    </dl></section>
  </div>
  <div class="groups touch-only">
    <section><h3>Walking and looking</h3><dl>
      ${row('left thumb', 'press and slide to walk')}
      ${row('right thumb', 'drag to look around')}
      ${row('Jump', 'hop over a step')}
    </dl></section>
    <section><h3>Using things</h3><dl>
      ${row('tap', 'open, sit, light, talk to whatever you face')}
      ${row('Lantern', 'carry a light in the dark')}
      ${row('?', 'this card')}
    </dl></section>
  </div>
  <div class="foot">
    <button class="link" type="button" data-go="settings"  data-first>Settings</button>
    <button class="link" type="button" data-go="about">About this house &amp; sources</button>
  </div>`);

const settings = makeCard('settings', 'Settings', `
  <div class="row"><label for="set-sound">Sound</label>
    <div class="pair"><input id="set-sound" class="switch" type="checkbox" role="switch"  data-first><input id="set-vol" type="range" min="0" max="100" step="1" aria-label="Volume"></div>
    <div class="val"><span id="set-vol-val"></span></div></div>
  <div class="row"><label for="set-hour">Time of day</label>
    <input id="set-hour" type="range" min="0" max="23.75" step="0.25">
    <div class="val"><span id="set-hour-val" aria-live="off"></span><button class="link" type="button" id="set-now">Go back to now</button></div></div>
  <div class="row"><label for="set-eye">Eye height</label>
    <input id="set-eye" type="range" min="4.2" max="6.4" step="0.0833">
    <div class="val"><span id="set-eye-val"></span><button class="link" type="button" id="set-eye-reset">Reset</button></div></div>
  <div class="row" id="set-q-row" hidden><label for="set-q">Picture</label><select id="set-q"></select>
    <div class="val"><span>Lower draws faster on small machines.</span></div></div>
  <div class="foot"><button class="link" type="button" data-go="help">All the keys</button><span class="note">Volume and eye height are kept for your next visit.</span></div>`);

for (const b of document.querySelectorAll('[data-go]')) b.addEventListener('click', () => {
  const go = b.dataset.go;
  if (go === 'help') help.show(); else if (go === 'settings') settings.show();
  else { for (const c of cards) c.hide(true); aboutPanel?.show(); }
});
hint.addEventListener('click', () => help.show());

// Settings, wired to the house
const sound = H?.ctx?.sound;
const fill = r => r.style.setProperty('--fill', `${(100 * (r.value - r.min)) / (r.max - r.min)}%`);
const sSound = $('set-sound'), sVol = $('set-vol'), sHour = $('set-hour'), sEye = $('set-eye');
function syncSettings() {
  const muted = sound?.isMuted?.() ?? false;
  sSound.checked = !muted; sVol.value = Math.round(100 * (sound?.volume?.() ?? 1)); sVol.disabled = muted || !sound?.setVolume;
  $('set-vol-val').textContent = muted ? 'Off' : `Volume ${sVol.value}`;
  sHour.value = (((H?.hour ?? 12) % 24) + 24) % 24; $('set-hour-val').textContent = fmtHour(Number(sHour.value));
  sEye.value = eyeHeight(); $('set-eye-val').textContent = `${fmtEye(eyeHeight())} at the eye`;
  for (const r of [sVol, sHour, sEye]) fill(r);
  const q = H?.quality;                                               // offered if the renderer exposes a choice
  if (q?.options?.length) {
    $('set-q-row').hidden = false;
    $('set-q').innerHTML = q.options.map(o => `<option value="${esc(o.value)}">${esc(o.label)}</option>`).join(''); $('set-q').value = q.get();
  }
}
settings.onShow = syncSettings;
sSound.addEventListener('change', () => { if (!sound) return; if ((sound.isMuted?.() ?? false) === sSound.checked) sound.toggleMute(); syncSettings(); });
sVol.addEventListener('input', () => { sound?.setVolume?.(sVol.value / 100); store.set('volume', sVol.value / 100); syncSettings(); });
sHour.addEventListener('input', () => { H?.setHour(Number(sHour.value)); syncSettings(); });
$('set-now').addEventListener('click', () => { const d = new Date(); H?.setHour(d.getHours() + d.getMinutes() / 60); syncSettings(); });
sEye.addEventListener('input', () => { setEyeHeight(Number(sEye.value)); syncSettings(); });
$('set-eye-reset').addEventListener('click', () => { setEyeHeight(4.85); syncSettings(); });
$('set-q').addEventListener('change', e => { H?.quality?.set(e.target.value); });
if (sound?.setVolume) sound.setVolume(Number(store.get('volume', 1)));

// ---- Keys ------------------------------------------------------------------------------------
// While a card is open, the house does not hear the keyboard (so typing in a card does not
// walk you into a wall). H or ? opens and closes help; Esc closes whatever is open.
// Keys pressed inside a card are stopped by the card itself; these are the ones that arrive
// while focus is elsewhere.
const anyCard = () => cards.find(c => c.open);
const isHelpKey = e => e.code === 'KeyH' || e.key === '?';
function cardKey(e, c) {
  if (e.code === 'Escape' || (isHelpKey(e) && c === help)) { e.preventDefault(); c.hide(); }
  else if (isHelpKey(e) && c === settings) { e.preventDefault(); help.show(); }
}
addEventListener('keydown', e => {
  if (e.target.closest?.('.sheet')) return;
  const c = anyCard();
  if (c) { cardKey(e, c); e.stopPropagation(); return; }
  if (aboutPanel?.open) { if (e.code !== 'KeyI' && e.code !== 'Escape') e.stopPropagation(); return; }
  if (isHelpKey(e) && opened && !e.repeat) { e.preventDefault(); help.show(); e.stopPropagation(); }
}, true);

// ---- The pointer ------------------------------------------------------------------------------
let lockedOnce = false;
document.addEventListener('pointerlockchange', () => {
  if (document.pointerLockElement) {
    if (!lockedOnce) toast('Your mouse now turns your head. Esc gives the pointer back.', 5200);
    lockedOnce = true;
  }
});
document.addEventListener('pointerlockerror', () => toast('This browser kept the pointer. Hold the mouse button and drag to look around.', 6000));

// ---- Entering ---------------------------------------------------------------------------------
$('enter').addEventListener('click', () => {
  $('enter').blur();                                                  // or Space would press it again
  clearTimeout(hintTimer); hint.classList.remove('faded');
  hintTimer = setTimeout(() => hint.classList.add('faded'), 16000);
  if (touch) toast('Left thumb to walk, right thumb to look. Tap things to use them.', 5200);
});

// ---- Touch controls ---------------------------------------------------------------------------
let pad = null, useBtn = null, lampBtn = null;
if (touch) {
  const t = el('div', { id: 'touch' }, `<div id="pad" aria-hidden="true"><i></i><span>walk</span></div>
    <div id="tbtns"><button class="lamp" type="button" data-code="KeyF">Lantern</button><button class="jump" type="button" data-code="Space">Jump</button><button class="use" type="button" data-code="KeyE">Use</button></div>`);
  body.append(t); pad = t.querySelector('#pad i'); useBtn = t.querySelector('.use'); lampBtn = t.querySelector('.lamp');
  const send = (type, code) => dispatchEvent(new KeyboardEvent(type, { code, key: code === 'Space' ? ' ' : code.slice(-1).toLowerCase(), bubbles: true }));
  for (const b of t.querySelectorAll('button')) {
    b.addEventListener('pointerdown', e => { e.preventDefault(); b.classList.add('down'); send('keydown', b.dataset.code); });
    const up = () => { if (!b.classList.contains('down')) return; b.classList.remove('down'); send('keyup', b.dataset.code); };
    b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up);
    b.addEventListener('click', e => e.preventDefault());
  }
}

// ---- A slow watch over the page: now playing, the look note, touch states ------------------------
let lastTitle = '';
function watch() {
  const w = walking();
  const title = Q.get('uiplaying') ?? sound?.nowPlaying?.() ?? '';
  if (title !== lastTitle) { lastTitle = title; if (title) playing.innerHTML = `<i>Now playing</i>&ensp;${esc(title)}`; }
  playing.classList.toggle('on', !!title && w);
  playing.classList.toggle('over-card', !!$('record-card'));
  const free = w && !touch && lockedOnce && !document.pointerLockElement && !anyCard() && !aboutPanel?.open && !H?.ctx?.walker?.seated;
  lookNote.classList.toggle('on', Q.has('uinote') || free);
  if (touch) { useBtn?.classList.toggle('ready', $('prompt').classList.contains('on')); lampBtn?.classList.toggle('lit', !!H?.ctx?.flashlight); }
}
setInterval(watch, 400);
if (touch) (function knob() {                                         // the pad's knob follows the left thumb
  const m = H?.ctx?.walker?.touchMove ?? { x: 0, y: 0 };
  if (pad) pad.style.transform = `translate(${(m.x * 34).toFixed(1)}px, ${(m.y * 34).toFixed(1)}px)`;
  requestAnimationFrame(knob);
})();

// ---- The picture for shared links ------------------------------------------------------------
if (Q.has('card')) {
  html.classList.add('ui-card');
  body.append(el('div', { id: 'social', 'aria-hidden': 'true' }, `<div><svg class="mark"><use href="#lantern"/></svg><h2>Anna's House</h2>
    <svg class="rule"><use href="#cloudlift"/></svg><p>An Arts-and-Crafts bungalow on a floating island. Come in.</p></div>`));
}

// ---- Forced states for screenshots ---------------------------------------------------------------
if (Q.has('uitoast')) setTimeout(() => toast(Q.get('uitoast'), 1e9), 50);
if (Q.has('uiprompt')) { const p = $('prompt'); setInterval(() => { p.innerHTML = `<b>E</b>${esc(Q.get('uiprompt'))}`; p.classList.add('on'); }, 200); }
if (Q.has('uihelp')) help.show();
if (Q.has('uisettings')) settings.show();
if (Q.has('uiabout')) aboutPanel?.show();
if (Q.has('uihint')) { hint.classList.remove('faded'); }
if (Q.has('uirecord')) body.append(el('div', { id: 'record-card', style: 'position:fixed;left:16px;bottom:64px;width:256px;height:144px;border-radius:3px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,.5);z-index:5;background:#111 linear-gradient(135deg,#3a2a1d,#0b0b0d)' }));
watch();

window.houseUI = { toast, help, settings };
