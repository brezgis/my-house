// The mark in the middle of the view, and what it has hold of. At rest it is a small dot. When
// something in front of you can be used, the dot opens into a ring, and a second, softer ring
// settles on the thing itself, so that you can see which thing the prompt is talking about.

import * as THREE from 'three';

export function setupReticle(ctx) {
  const css = document.createElement('style');
  css.textContent = `
#dot { transition: opacity .3s ease, width .16s ease, height .16s ease, margin .16s ease, background-color .16s ease, box-shadow .16s ease; box-sizing: border-box; }
#dot.aim { width: 16px; height: 16px; margin: -8px; background: rgba(255, 248, 235, 0); border: 1.5px solid rgba(255, 244, 222, .92); box-shadow: 0 0 0 1px rgba(30, 22, 16, .35), 0 0 10px rgba(255, 214, 150, .35); }
#dot.aim::after { content: ""; position: absolute; left: 50%; top: 50%; width: 3px; height: 3px; margin: -1.5px; border-radius: 50%; background: rgba(255, 248, 235, .95); }
#pip { position: fixed; left: 0; top: 0; z-index: 5; width: 26px; height: 26px; margin: -13px; border-radius: 50%; pointer-events: none; opacity: 0;
  border: 1.5px solid rgba(255, 226, 170, .85); box-shadow: 0 0 0 1px rgba(30, 22, 16, .3), 0 0 14px rgba(255, 200, 120, .45), inset 0 0 8px rgba(255, 210, 140, .25);
  transition: opacity .18s ease; will-change: transform, opacity; }
#pip.on { opacity: 1; animation: pip 2.4s ease-in-out infinite; }
@keyframes pip { 50% { box-shadow: 0 0 0 1px rgba(30, 22, 16, .3), 0 0 20px rgba(255, 200, 120, .7), inset 0 0 10px rgba(255, 210, 140, .4); } }
.ui-card #pip { display: none; }
@media (prefers-reduced-motion: reduce) { #pip.on { animation: none; } }`;
  document.head.appendChild(css);
  const dot = document.getElementById('dot'), pip = document.createElement('div'); pip.id = 'pip'; document.body.appendChild(pip);
  const v = new THREE.Vector3();
  let shown = false, was = null, px = 0, py = 0;
  ctx.animated.push((t, dt) => {
    const it = ctx.mode === 'walk' ? ctx.aimed : null;
    if (!!it !== shown) { shown = !!it; dot?.classList.toggle('aim', shown); pip.classList.toggle('on', shown); }
    if (!it) { was = null; return; }
    v.set(it.x, it.y, it.z).project(ctx.camera);
    if (v.z > 1) { pip.classList.remove('on'); shown = false; return; }
    const x = (v.x * 0.5 + 0.5) * innerWidth, y = (-v.y * 0.5 + 0.5) * innerHeight;
    const k = it === was ? Math.min(1, dt * 22) : 1;                    // glide while it is the same thing; jump to a new one
    px += (x - px) * k; py += (y - py) * k; was = it;
    const d = Math.hypot(it.x - ctx.camera.position.x, it.y - ctx.camera.position.y, it.z - ctx.camera.position.z);
    const s = Math.max(0.7, Math.min(1.9, 5.5 / Math.max(1.5, d)));      // nearer things get a larger ring
    pip.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) scale(${s.toFixed(2)})`;
  });
}
