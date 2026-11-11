(() => { const sc = window.__house.scene, out = {}; let n = 0;
  sc.traverse(o => { if (!o.isMesh) return; const k = o.userData.cat ?? ''; if (!k.startsWith('house:')) return; const g = o.geometry; out[k.slice(6)] = Math.round((g.index ? g.index.count : g.attributes.position.count) / 3); n++; });
  return { n, list: Object.entries(out).sort((a, b) => b[1] - a[1]).map(([k, v]) => k + ' ' + v).join(', ') }; })()
