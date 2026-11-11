// Arriving. Nothing here is a tutorial: the picture dissolves gently from the view outside to
// the hall; a first-time visitor is met by Bartholomew with the offer of a drink (staff/robots.js
// reads window.__newcomer); and a handwritten card on the hall table says what there is to do.
// Test hooks: ?welcome=card (the card open), ?welcome=new (behave as a first visit), ?welcome=old.

import * as THREE from 'three';
import { F1 } from './house.js';

const Q = new URLSearchParams(location.search), W = Q.get('welcome');
const seen = (() => { try { return localStorage.getItem('welcomed') === '1'; } catch { return false; } })();
window.__newcomer = W === 'new' ? true : W === 'old' ? false : !seen;

const NOTE = [
  ['Darling,', 'salute'],
  ['you made it. I am out, so the house is yours.', 'p'],
  ['Ask Bartholomew for a drink. He will pretend it is a great deal of trouble.', 'li'],
  ['Croissants at the coffee bar, cake in the dining room.', 'li'],
  ['Sit anywhere. Light the candles. Play the piano, badly is fine.', 'li'],
  ['Upstairs there is a chess game Fig is winning, and a telescope for when the moon is up.', 'li'],
  ['The telephone by the stair rings friends round.', 'li'],
  ['Feed the koi. Let Bramble pick you a strawberry.', 'li'],
  ['Stay as long as you like.', 'p'],
  ['A.', 'sign'],
  ['P.S. H, if you are the sort who reads instructions.', 'ps'],
];

export function setupWelcome(ctx) {
  dissolve(ctx);
  card(ctx);
}

// ---- from the start screen into the hall: the last view outside fades into lamplight -------------
function dissolve(ctx) {
  const btn = document.getElementById('enter'); if (!btn) return;
  btn.addEventListener('click', () => {
    try { localStorage.setItem('welcomed', '1'); } catch { /* private window */ }
    const R = ctx.renderer, src = R.domElement;
    const veil = document.createElement('div'), snap = document.createElement('canvas');
    veil.style.cssText = 'position:fixed;inset:0;z-index:8;pointer-events:none;background:#1e1610;opacity:1;transition:opacity 2.2s cubic-bezier(.3,0,.2,1)';
    snap.width = Math.max(2, src.width >> 1); snap.height = Math.max(2, src.height >> 1);
    snap.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;opacity:1;transition:opacity .7s ease';
    try { R.render(ctx.scene, ctx.camera); snap.getContext('2d').drawImage(src, 0, 0, snap.width, snap.height); veil.appendChild(snap); } catch { /* no picture: a plain fade from dark */ }
    document.body.appendChild(veil);
    requestAnimationFrame(() => requestAnimationFrame(() => { snap.style.opacity = '0'; }));      // the garden view sinks into the dark...
    setTimeout(() => { veil.style.opacity = '0'; }, 800);                                         // ...and the hall comes up out of it
    setTimeout(() => veil.remove(), 3300);
  }, true);      // capture: this runs before the house steps you inside, so the last outside frame can be kept
}

// ---- the card on the hall table ---------------------------------------------------------------------
function card(ctx) {
  const X = 19.66 - 21.665, Z = -15.15;      // on the console under the hall mirror, clear of the lamp, the key dish and the tulips
  const top = F1 + 2.7;                       // the console's top (kit console, 2.7 ft)

  // the card: a folded sheet standing like a tent, written on the side that faces the hall
  const c = document.createElement('canvas'); c.width = 384; c.height = 256; const g = c.getContext('2d');
  const paint = () => {
    g.fillStyle = '#f3ead6'; g.fillRect(0, 0, 384, 256);
    g.strokeStyle = 'rgba(122,75,42,.35)'; g.lineWidth = 2; g.strokeRect(12, 12, 360, 232);
    g.fillStyle = '#2a1c13'; g.textAlign = 'center';
    g.font = 'italic 62px "Goudy House", Georgia, serif'; g.fillText('for you', 192, 118);
    g.font = 'italic 30px "Goudy House", Georgia, serif'; g.fillStyle = '#7a4b2a'; g.fillText('(do read me)', 192, 176);
    tex.needsUpdate = true;
  };
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  paint(); document.fonts?.ready?.then(paint);
  const w = 0.46, h = 0.31, lean = 0.42;
  const front = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, side: THREE.DoubleSide }));
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color: 0xe9dfc8, roughness: 0.9, side: THREE.DoubleSide }));
  const up = Math.cos(lean) * h / 2, out = Math.sin(lean) * h / 2;
  front.position.set(0, up, out); front.rotation.x = -lean; back.position.set(0, up, -out); back.rotation.x = lean; back.rotation.y = Math.PI;
  const grp = new THREE.Group(); grp.add(front, back); grp.position.set(X, top + 0.004, Z); grp.rotation.y = Math.PI / 2 + 0.25;      // faces into the hall, a little askew
  grp.userData.cat = 'extras'; ctx.scene.add(grp); ctx.track?.(grp, ctx.zoneAt?.(X, top + 0.2, Z, 0.4));

  // the note itself, as a sheet of paper over the view
  const css = document.createElement('style');
  css.textContent = `
#note { position: fixed; inset: 0; z-index: 30; display: grid; place-items: center; padding: 18px; background: rgba(20,14,9,.5); opacity: 0; visibility: hidden; transition: opacity .35s ease, visibility 0s linear .35s; }
#note.on { opacity: 1; visibility: visible; transition: opacity .35s ease; }
#note .leaf { box-sizing: border-box; width: min(520px, 100%); max-height: min(88vh, 88dvh); overflow: auto; scrollbar-width: thin; padding: 30px 40px 24px; color: #2a1c13; background: #f3ead6;
  background-image: linear-gradient(rgba(122,75,42,.05), rgba(122,75,42,0) 30%), repeating-linear-gradient(transparent 0 31px, rgba(60,80,120,.07) 31px 32px);
  box-shadow: 0 18px 60px rgba(0,0,0,.55), 0 1px 0 rgba(255,255,255,.5) inset; border-radius: 2px; transform: rotate(-.6deg) translateY(8px); transition: transform .45s ease;
  font-family: "Goudy House", Georgia, serif; font-style: italic; font-size: 18px; line-height: 1.5; }
#note.on .leaf { transform: rotate(-.6deg); }
#note .salute { font-size: 30px; margin: 0 0 6px; }
#note p { margin: 0 0 10px; }
#note ul { margin: 4px 0 14px; padding: 0 0 0 1.1em; }
#note li { margin: 0 0 4px; }
#note li::marker { content: "~  "; color: #7a4b2a; }
#note .sign { font-size: 30px; text-align: right; margin: 2px 12px 10px 0; }
#note .ps { font-size: 16px; color: #5b4636; margin: 0; }
#note .close { font: inherit; font-style: normal; font-size: 15px; letter-spacing: .02em; color: #5b4636; background: none; border: 0; border-top: 1px solid rgba(122,75,42,.25); width: 100%; margin-top: 16px; padding: 12px 0 0; cursor: pointer; text-align: center; }
@media (max-width: 520px) { #note .leaf { padding: 26px 24px 22px; font-size: 17px; } }`;
  document.head.appendChild(css);
  const el = document.createElement('div'); el.id = 'note'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'A note left for you');
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  let html = '', inList = false;
  for (const [text, kind] of NOTE) {
    if (kind === 'li' && !inList) { html += '<ul>'; inList = true; }
    if (kind !== 'li' && inList) { html += '</ul>'; inList = false; }
    html += kind === 'li' ? `<li>${esc(text)}</li>` : `<p class="${kind}">${esc(text)}</p>`;
  }
  el.innerHTML = `<div class="leaf">${html}<button class="close">put the card back</button></div>`;
  document.body.appendChild(el);
  let open = false;
  const show = () => { open = true; el.classList.add('on'); document.exitPointerLock?.(); window.__newcomer = false; };
  const hide = () => { open = false; el.classList.remove('on'); };
  el.addEventListener('click', e => { if (e.target === el || e.target.classList.contains('close')) hide(); });
  addEventListener('keydown', e => { if (open && (e.code === 'Escape' || e.code === 'KeyE' || e.code === 'Enter')) { hide(); e.stopImmediatePropagation(); } }, true);
  ctx.interact.push({ x: X, y: top + 0.15, z: Z, reach: 6.5, label: () => 'read the card left for you', act: show });
  if (W === 'card') setTimeout(show, 400);
}
