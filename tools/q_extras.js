(() => { const E = window.__house.items.extras, c = {}; let px = 0;
  for (const e of E) { const k = e.draw ? (e.glow ? 'draw-glow' : e.flat ? 'draw-flat' : 'draw') : e.rug ? 'rug' : e.canvas ? 'canvas:' + e.canvas : 'file'; c[k] = (c[k] ?? 0) + 1; if (e.draw) px += e.cw * e.ch; }
  const rough = {}; for (const e of E) if (e.draw) rough[e.rough ?? 'def'] = (rough[e.rough ?? 'def'] ?? 0) + 1;
  return { n: E.length, kinds: c, drawMpx: (px / 1e6).toFixed(1), rough, errs: window.__errs }; })()
