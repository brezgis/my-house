// The mark in the middle of the view. At rest it is a small dot. When something in front of you can
// be used, the dot itself opens into a soft ring, and that is all: the prompt beside it says what the
// thing is. (There used to be a second ring that travelled to the thing itself; with the prompt and
// the dot as well it was one mark too many.)

export function setupReticle(ctx) {
  const css = document.createElement('style');
  css.textContent = `
#dot { transition: opacity .3s ease, width .18s ease, height .18s ease, margin .18s ease, background-color .18s ease, border-color .18s ease, box-shadow .18s ease; box-sizing: border-box; border: 1.5px solid rgba(255, 244, 222, 0); }
#dot.aim { width: 24px; height: 24px; margin: -12px; background: rgba(255, 248, 235, 0); border-color: rgba(255, 232, 190, .9);
  box-shadow: 0 0 0 1px rgba(30, 22, 16, .3), 0 0 14px rgba(255, 200, 120, .45), inset 0 0 8px rgba(255, 210, 140, .25); animation: aim 2.4s ease-in-out infinite; }
.touch #dot.aim { opacity: 1 !important; }
@keyframes aim { 50% { box-shadow: 0 0 0 1px rgba(30, 22, 16, .3), 0 0 20px rgba(255, 200, 120, .7), inset 0 0 10px rgba(255, 210, 140, .4); } }
@media (prefers-reduced-motion: reduce) { #dot.aim { animation: none; } }`;
  document.head.appendChild(css);
  const dot = document.getElementById('dot');
  let shown = false;
  ctx.animated.push(() => {
    const on = ctx.mode === 'walk' && !!ctx.aimed;
    if (on !== shown) { shown = on; dot?.classList.toggle('aim', on); }
  });
}
