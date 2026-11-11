// Speech bubbles: small DOM cards that float over a character's head, in the
// page's own voice (serif, cream on translucent dark brown).

const CSS = `
#staff-bubbles { position: fixed; inset: 0; pointer-events: none; overflow: hidden; z-index: 3; }
.staff-bubble { position: absolute; left: 0; top: 0; width: max-content; max-width: min(300px, 78vw); transform-origin: 50% 100%; will-change: transform; }
.staff-bubble .card { position: relative; padding: 8px 13px 9px; border-radius: 4px; background: rgba(24, 17, 12, .74); color: #f4ead8;
  font-family: var(--serif); font-size: 15.5px; line-height: 1.36; letter-spacing: .01em; text-shadow: 0 1px 2px rgba(0,0,0,.45);
  box-shadow: 0 3px 14px rgba(0,0,0,.2); opacity: 0; transform: translateY(7px); transition: opacity .9s ease, transform .9s ease; }
.staff-bubble.on .card { opacity: 1; transform: none; transition: opacity .45s ease, transform .45s cubic-bezier(.2,.7,.3,1); }
.staff-bubble .card::after { content: ''; position: absolute; left: 50%; bottom: -7px; margin-left: -7px; border: 7px solid transparent;
  border-bottom: 0; border-top-color: rgba(24, 17, 12, .74); }
.staff-bubble.moved .card::after { display: none; }
.staff-bubble .who { display: block; font-style: italic; font-size: 13px; color: #d9a77c; margin-bottom: 1px; }
@media (prefers-reduced-motion: reduce) { .staff-bubble .card, .staff-bubble.on .card { transition: opacity .3s ease; transform: none; } }
#staff-toast { position: fixed; left: 50%; bottom: calc(22% + 44px); transform: translateX(-50%); padding: 6px 14px; border-radius: 2px;
  background: rgba(24, 17, 12, .55); color: #f4ead8; font-size: 13.5px; font-style: italic; letter-spacing: .03em;
  opacity: 0; transition: opacity .5s ease; pointer-events: none; white-space: nowrap; z-index: 3; }
#staff-toast.on { opacity: .95; }
`;

export function makeBubbles(THREE, camera, headless = false) {
  const v = new THREE.Vector3();
  let root = null, toastEl = null, toastUntil = 0;
  if (!headless && typeof document !== 'undefined') {
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    root = document.createElement('div'); root.id = 'staff-bubbles'; document.body.appendChild(root);
    toastEl = document.createElement('div'); toastEl.id = 'staff-toast'; document.body.appendChild(toastEl);
  }
  const all = [];

  // How long a line needs: time to notice it, then a comfortable reading pace. Callers may ask for
  // longer, never shorter. A line is never replaced before it has had its minimum on screen: a
  // newer one waits its turn (only the newest waits; older waiting lines are dropped).
  const readTime = text => Math.min(15, 2.6 + text.length * 0.075);
  const minTime = text => Math.min(6, 1.3 + text.length * 0.04);

  function make(name, { cat = false } = {}) {
    const el = root ? document.createElement('div') : null, card = el ? document.createElement('div') : null;
    if (el) { el.className = 'staff-bubble' + (cat ? ' cat' : ''); card.className = 'card'; el.appendChild(card); root.appendChild(el); }
    const b = { name, text: '', until: 0, minUntil: 0, pending: null, el, card, shown: false, log: [] };
    const show = (text, secs, now) => {
      b.text = text; b.until = now + Math.max(secs ?? 0, readTime(text)); b.minUntil = now + minTime(text); b.pending = null;
      if (card) {
        card.innerHTML = `<span class="who">${name}</span>${escape(text)}`; b.w = null; b.h = null;
        if (b.shown) card.animate?.([{ opacity: 0.25, transform: 'translateY(5px)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: 'ease-out' });
      }
    };
    b.say = (text, secs, now) => {
      b.log.push([now, text]); if (b.log.length > 400) b.log.shift();
      if (b.shown && now < b.minUntil && text !== b.text) { b.pending = { text, secs }; b.until = Math.max(b.until, b.minUntil + readTime(text)); return; }
      show(text, secs, now);
    };
    b.tick = now => { if (b.pending && now >= b.minUntil) show(b.pending.text, b.pending.secs, now); };
    b.quiet = () => { b.until = 0; b.pending = null; };
    b.talking = now => now < b.until;
    all.push(b);
    return b;
  }

  // Bubbles placed this frame, so that a later one can step up clear of an earlier one
  const rects = []; let clearing = false;
  // pos: world point above the head. visible(): can the camera see the speaker at all?
  function place(b, pos, now, visible) {
    if (!b.el) return;
    b.tick(now);
    if (!clearing) { clearing = true; queueMicrotask(() => { rects.length = 0; clearing = false; }); }      // forgotten once this frame's work is done
    let on = now < b.until && visible;
    if (on) {
      v.copy(pos).project(camera);
      if (v.z > 1 || v.z < -1 || Math.abs(v.x) > 1.3 || Math.abs(v.y) > 1.3) on = false;
    }
    if (on) {
      const d = camera.position.distanceTo(pos), s = Math.max(0.78, Math.min(1.05, 11 / Math.max(d, 1)));
      const hw = (b.w ??= b.el.offsetWidth || 220) * s / 2, h = (b.h ??= b.el.offsetHeight || 60) * s;
      const W = innerWidth, H = innerHeight, floor = H * 0.7;                                   // keep clear of the prompt and the conversation card
      const x = Math.max(hw + 10, Math.min(W - hw - 10, (v.x + 1) / 2 * W));
      let y = Math.min(floor, Math.max(h + 12, (1 - v.y) / 2 * H - 10)), moved = false;
      for (let pass = 0; pass < 4; pass++) {
        let hit = null;
        for (const r of rects) if (x - hw < r.x1 && x + hw > r.x0 && y - h < r.y1 && y > r.y0) { hit = r; break; }
        if (!hit) break;
        const up = hit.y0 - 8, down = hit.y1 + h + 8;
        y = up - h >= 8 ? up : Math.min(floor, down); moved = true;
      }
      rects.push({ x0: x - hw, x1: x + hw, y0: y - h, y1: y });
      b.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%) scale(${s.toFixed(3)})`;
      if (moved !== b.moved) { b.moved = moved; b.el.classList.toggle('moved', moved); }
    }
    if (on !== b.shown) { b.shown = on; b.el.classList.toggle('on', on); }
  }

  function toast(text, now, secs = 4) {
    if (typeof window !== 'undefined' && window.houseUI?.toast) { window.houseUI.toast(text); return; }
    toastUntil = now + secs;
    if (toastEl) { toastEl.textContent = text; toastEl.classList.add('on'); }
  }
  function update(now) { if (toastEl && toastUntil && now > toastUntil) { toastEl.classList.remove('on'); toastUntil = 0; } }

  return { make, place, toast, update, all };
}

function escape(s) {
  return s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])).replace(/\*([^*]+)\*/g, '<i>$1</i>');
}
