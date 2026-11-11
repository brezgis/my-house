// Speech bubbles: small DOM cards that float over a character's head, in the
// page's own voice (serif, cream on translucent dark brown).

const CSS = `
#staff-bubbles { position: fixed; inset: 0; pointer-events: none; overflow: hidden; z-index: 3; }
.staff-bubble { position: absolute; left: 0; top: 0; max-width: 250px; width: max-content; padding: 7px 12px 8px;
  border-radius: 3px; background: rgba(24, 17, 12, .66); color: #f4ead8; font-family: var(--serif); font-size: 15px; line-height: 1.32;
  letter-spacing: .01em; text-shadow: 0 1px 2px rgba(0,0,0,.45); box-shadow: 0 3px 14px rgba(0,0,0,.18);
  opacity: 0; transition: opacity .35s ease; transform-origin: 50% 100%; will-change: transform, opacity; }
.staff-bubble.on { opacity: 1; }
.staff-bubble::after { content: ''; position: absolute; left: 50%; bottom: -7px; margin-left: -7px; border: 7px solid transparent;
  border-bottom: 0; border-top-color: rgba(24, 17, 12, .66); }
.staff-bubble .who { display: block; font-style: italic; font-size: 13px; color: #d9a77c; margin-bottom: 1px; }
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

  function make(name, { cat = false } = {}) {
    const el = root ? document.createElement('div') : null;
    if (el) { el.className = 'staff-bubble' + (cat ? ' cat' : ''); root.appendChild(el); }
    const b = { name, text: '', until: 0, el, shown: false, log: [] };
    b.say = (text, secs, now) => {
      b.text = text; b.until = now + (secs ?? Math.min(7.5, 2.4 + text.length * 0.055));
      b.log.push([now, text]); if (b.log.length > 400) b.log.shift();
      if (el) { el.innerHTML = `<span class="who">${name}</span>${escape(text)}`; b.w = null; }
    };
    b.quiet = () => { b.until = 0; };
    b.talking = now => now < b.until;
    all.push(b);
    return b;
  }

  // pos: world point above the head. visible(): can the camera see the speaker at all?
  function place(b, pos, now, visible) {
    if (!b.el) return;
    let on = now < b.until && visible;
    if (on) {
      v.copy(pos).project(camera);
      if (v.z > 1 || v.z < -1 || Math.abs(v.x) > 1.3 || Math.abs(v.y) > 1.3) on = false;
    }
    if (on) {
      const d = camera.position.distanceTo(pos), s = Math.max(0.72, Math.min(1.05, 11 / Math.max(d, 1)));
      const w = (b.w ??= b.el.offsetWidth || 200) * s / 2 + 10;
      const x = Math.max(w, Math.min(innerWidth - w, (v.x + 1) / 2 * innerWidth)), y = Math.max(70, (1 - v.y) / 2 * innerHeight - 10);
      b.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%) scale(${s.toFixed(3)})`;
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
