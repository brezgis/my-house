// The place opens on a picture before it is furnished. Shared by the house, the town and the lab (the house's copy
// is the source: keep the three the same).
//
// A plain visit begins looking down on the island from above, where no room can be seen into. So main.js builds the
// outsides first (the buildings bare, the ground, the trees), draws that one still picture, and the threshold lifts
// on it as soon as the photos it is made of have come. What stands in the rooms is made behind the picture, a step at
// a time, and only then is everything else set going. Nothing moves in the picture, so it is drawn again only between
// steps, for the photos that have come since.
//
//   const stage = openStage({ mark, onEarlyEnter });      // BEFORE the materials are made: it counts the photos asked for from here
//   ... build the outsides, finalize ...
//   if (staged) await stage.furnish(steps, { picture: () => { ...draw one frame... }, each: step => { ... } });
//   ... everything else, as ever ...
//   DefaultLoadingManager.onStart = () => { ...; stage.loading(); };
//   DefaultLoadingManager.onLoad = () => { stage.loaded(); ... };  if (stage.photosIn) that handler is called by hand
//   load ui.js last, with a dynamic import, awaited; then stage.enterIfAsked();
//
// The threshold: ui.js lifts it, but ui.js is not loaded until everything is set going. lift() here is its open() and
// no more; ui.js then finds the threshold already lifting and finishes the job. "Take a walk" pressed before the place
// is ready is remembered, and pressed again for the visitor at the end (enterIfAsked).

import * as THREE from 'three';

export function openStage({ mark = () => {}, onEarlyEnter = null } = {}) {
  const M = THREE.DefaultLoadingManager, $ = id => document.getElementById(id);
  let photosIn = false, pictured = false, counting = true, left = 0, enterEarly = false;
  // Only the photos asked for before the first picture hold the threshold (the ground's, the walls', the roofs').
  // What the insides ask for a moment later is not waited for.
  const first = new Map(), s0 = M.itemStart, e0 = M.itemEnd;
  M.itemStart = u => { if (counting) { first.set(u, (first.get(u) ?? 0) + 1); left++; } s0(u); };
  M.itemEnd = u => { e0(u); const n = first.get(u); if (n) { first.set(u, n - 1); if (!--left && pictured) lift(); } };
  M.onStart = () => { photosIn = false; };
  M.onLoad = () => { photosIn = true; if (pictured) lift(); };

  function lift() {
    if (document.body.classList.contains('ready')) return;
    document.body.classList.add('ready');
    const L = $('loading'), g = $('glassFill'); if (!L) return;
    if (g) { const foot = Number(g.dataset.foot) || 43, h = Number(g.dataset.rise) || 20; g.setAttribute('y', foot - h); g.setAttribute('height', h); }
    if ($('ruleFill')) $('ruleFill').style.strokeDashoffset = 0;
    L.classList.add('lit'); if ($('loadCount')) $('loadCount').textContent = 'Come in';
    setTimeout(() => { L.classList.add('gone'); document.documentElement.classList.add('ui-open'); }, 650);
    // (onEarlyEnter: what must begin on the visitor's own press, since the press made for them later is not one a
    // browser trusts: the sound)
    $('enter')?.addEventListener('click', () => { enterEarly = !window.house; if (enterEarly) { try { onEarlyEnter?.(); } catch { /* the place goes on without it */ } } }, { once: true });
  }
  // (a hidden tab draws no frames: go on regardless)
  const frame = () => new Promise(ok => { let done = false; const go = () => { if (!done) { done = true; ok(); } }; requestAnimationFrame(go); setTimeout(go, 120); });

  // steps: an iterable (a generator) that does one piece of furnishing each time it is asked; picture(): draws the
  // still picture once; each(step): called after every step (to merge what a building's steps have made, say).
  async function furnish(steps, { picture, each } = {}) {
    const draw = () => {
      picture();
      if (!pictured) { pictured = true; counting = false; window.__pictureMs = Math.round(performance.now()); window.__firstPhotos = first.size; mark('picture'); }
      if (photosIn || !left) lift();
    };
    draw(); await frame();
    let t0 = performance.now();
    for (const step of steps) {
      each?.(step);
      if (performance.now() - t0 > 40) { draw(); await frame(); t0 = performance.now(); }
    }
    draw(); await frame();
    mark('furnished');
  }

  return {
    furnish, lift,
    get photosIn() { return photosIn; },
    loading() { photosIn = false; },      // (main.js's own onStart and onLoad take over from the two above: they tell the stage)
    loaded() { photosIn = true; },
    enterIfAsked() { if (enterEarly) { enterEarly = false; $('enter')?.click(); } },
  };
}
