// Geometry memory by kind of mesh and by attribute (MB), and texture memory by family.
(() => { const H = window.__house, by = {}, attr = {}, seen = new Set(); let total = 0;
  H.scene.traverse(o => { const g = o.geometry; if (!g || seen.has(g)) return; seen.add(g);
    let cat = o.userData.cat, p = o; while (!cat && p.parent) { p = p.parent; cat = p.userData.cat ?? (p.name && !p.parent?.parent ? p.name : undefined); }
    cat = (cat ?? 'other').split(':')[0] + (o.userData.cat?.startsWith('b-') ? ':' + o.name.replace(/\/vc$/, '') : '');
    let b = 0; for (const [k, a] of Object.entries(g.attributes)) { const n = a.array?.byteLength ?? 0; b += n; if (o.userData.cat?.startsWith('b-')) attr[k] = (attr[k] ?? 0) + n; }
    if (g.index) { b += g.index.array.byteLength; if (o.userData.cat?.startsWith('b-')) attr.index = (attr.index ?? 0) + g.index.array.byteLength; }
    by[cat] = (by[cat] ?? 0) + b; total += b; });
  const mb = x => +(x / 1048576).toFixed(1);
  return { totalMB: mb(total), byKind: Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => k + ' ' + mb(v)).join(' | '), builderAttrs: Object.entries(attr).map(([k, v]) => k + ' ' + mb(v)).join(' | ') }; })()
