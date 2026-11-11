// Talking to the staff. Pressing E on a robot opens a small card of two or
// three things to say. Keys 1-3 choose at once; pressing E again moves down the
// list, and the highlighted line is said after a moment's pause. Replies may
// lead to a second card. The card closes when you walk away.

const CSS = `
#staff-talk { position: fixed; right: max(16px, 5vw); bottom: calc(16% + 10px); min-width: 240px; max-width: min(400px, calc(100vw - 32px));
  padding: 10px 14px 9px; border-radius: 3px; background: var(--grain), var(--paper, #f0e5cf); color: var(--ink, #2a1c13); box-shadow: var(--lift);
  font-family: var(--serif); font-size: 15.5px; line-height: 1.35; opacity: 0; transition: opacity .25s ease; pointer-events: none; z-index: 4; }
#staff-talk.on { opacity: 1; pointer-events: auto; }
#staff-talk .who { font-style: italic; font-size: 13px; color: var(--teak, #7a4b2a); margin-bottom: 4px; }
#staff-talk .opt { position: relative; padding: 4px 6px 5px 36px; border-radius: 2px; cursor: pointer; opacity: .82; }
#staff-talk .opt b { position: absolute; left: 6px; top: 4px; display: inline-flex; align-items: center; justify-content: center; min-width: 1.5em; height: 1.5em;
  border-radius: 3px; background: var(--ink, #2a1c13); color: var(--paper, #f0e5cf); font-weight: 400; font-size: .85em; font-variant-numeric: lining-nums;
  box-shadow: inset 0 1px 0 rgba(255, 240, 210, .22), inset 0 -2px 0 rgba(0, 0, 0, .45); }
#staff-talk .opt.hi { opacity: 1; background: rgba(122, 75, 42, .12); }
#staff-talk .opt .bar { position: absolute; left: 36px; right: 6px; bottom: 1px; height: 1.5px; background: var(--teak, #7a4b2a); transform-origin: left; transform: scaleX(0); }
#staff-talk .hint { font-size: 12px; color: var(--ink-soft, #5b4636); margin-top: 5px; font-style: italic; }
`;
const PICK_AFTER = 1.3;          // seconds after the last E before the highlighted line is said

export function makeTalk(H, headless) {
  let el = null;
  if (!headless && typeof document !== 'undefined') {
    const st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st);
    el = document.createElement('div'); el.id = 'staff-talk'; document.body.appendChild(el);
    el.addEventListener('click', e => { const o = e.target.closest('.opt'); if (o) choose(Number(o.dataset.i)); });
    addEventListener('keydown', e => {
      if (!S.robot) return;
      const n = { Digit1: 0, Digit2: 1, Digit3: 2, Numpad1: 0, Numpad2: 1, Numpad3: 2 }[e.code];
      if (n !== undefined && n < S.opts.length) { e.stopImmediatePropagation(); choose(n); }
      if (e.code === 'Escape') close();
    }, true);
  }
  const S = { robot: null, opts: [], idx: 0, lastE: 0, pending: false, since: 0, drawn: '' };

  function render() {
    if (!el) return;
    if (!S.robot) { el.classList.remove('on'); S.drawn = ''; return; }
    const key = S.robot.name + S.idx + S.opts.map(o => o.text).join('|');
    if (key !== S.drawn) {
      S.drawn = key;
      el.innerHTML = `<div class="who">${S.robot.spec.name}</div>` + S.opts.map((o, i) => `<div class="opt${i === S.idx ? ' hi' : ''}" data-i="${i}"><b>${i + 1}</b>${o.text}<span class="bar"></span></div>`).join('') +
        `<div class="hint">1–${S.opts.length} to choose · E for the next line</div>`;
    }
    el.classList.add('on');
    const bar = el.querySelector('.opt.hi .bar');
    if (bar) bar.style.transform = `scaleX(${S.pending ? Math.min(1, (H.now - S.lastE) / PICK_AFTER).toFixed(3) : 0})`;
  }
  function open(robot, opts) { S.robot = robot; S.opts = opts.slice(0, 3); S.idx = 0; S.pending = false; S.since = H.now; render(); }
  function close() { S.robot = null; S.opts = []; S.pending = false; render(); }
  // E on a robot: open its card, or move down it
  function press(robot) {
    if (S.robot !== robot) { open(robot, robot.dialogue()); return; }
    S.idx = (S.idx + 1) % S.opts.length; S.lastE = H.now; S.pending = true; S.since = H.now; render();
  }
  function choose(i) {
    const r = S.robot, o = S.opts[i]; if (!r || !o) return;
    H.events.choices++;
    const next = o.act();
    if (Array.isArray(next) && next.length) open(r, next); else close();
  }
  function update() {
    if (!S.robot) return;
    const v = H.visitor, r = S.robot;
    const far = !v.present || v.f !== r.f || Math.hypot(v.x - r.x, v.z - r.z) > 12;
    if (far) { r.line('walkedOff', { toGuest: false }); close(); return; }
    if (S.pending && H.now - S.lastE > PICK_AFTER) { S.pending = false; choose(S.idx); return; }
    if (H.now - S.since > 20) { close(); return; }
    render();
  }
  return { press, choose, open, close, update, get robot() { return S.robot; }, get options() { return S.opts; } };
}
