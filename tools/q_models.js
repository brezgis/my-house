(() => { const M = window.__house.items.models, by = {};
  for (const m of M) { const k = m.id; by[k] ??= { n: 0, out: 0 }; by[k].n++; if (m.outdoor) by[k].out++; }
  const meshes = {}; window.__house.scene.traverse(o => { const c = o.userData.cat; if (c && c.startsWith('model:')) { let n = 0, t = 0; o.traverse(q => { if (q.isMesh) { n++; t += (q.geometry.index ? q.geometry.index.count : q.geometry.attributes.position.count) / 3; } }); meshes[c.slice(6)] = [n, Math.round(t)]; } });
  return { placements: M.length, ids: Object.keys(by).length, rows: Object.entries(by).map(([k, v]) => [k, v.n, v.out, ...(meshes[k] ?? [])]).sort((a, b) => b[1] * (b[4] ?? 0) - a[1] * (a[4] ?? 0)).map(r => r.join(' ')) }; })()
