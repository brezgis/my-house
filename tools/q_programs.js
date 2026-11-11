// Which shader programs does drawing everything need that warm-up compiling did not make?
(() => { const H = window.__house, r = H.renderer, key = p => p.cacheKey, before = new Map(r.info.programs.map(p => [key(p), p]));
  const hidden = []; H.scene.traverse(o => { if (!o.visible) { hidden.push(o); o.visible = true; } });
  r.render(H.scene, H.camera); for (const o of hidden) o.visible = false;
  const fresh = r.info.programs.filter(p => !before.has(key(p)));
  const near = k => { let best = null, bn = 1e9; const a = k.split(','); for (const b of before.keys()) { const c = b.split(','); if (c.length !== a.length) continue; let n = 0; const d = []; for (let i = 0; i < a.length; i++) if (a[i] !== c[i]) { n++; d.push(i + ':' + c[i].slice(0, 30) + '->' + a[i].slice(0, 30)); } if (n < bn) { bn = n; best = d; } } return best; };
  return { before: before.size, added: fresh.length, examples: fresh.slice(0, 14).map(p => ({ name: p.name, type: p.cacheKey.split(',').slice(0, 3).join(',').slice(0, 80), differsFromNearest: near(p.cacheKey)?.slice(0, 6) })) }; })()
