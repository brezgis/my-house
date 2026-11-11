(() => { const H = window.__house, props = H.renderer.properties, seen = new Map();
  const KEYS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap', 'bumpMap', 'clearcoatMap', 'clearcoatNormalMap', 'clearcoatRoughnessMap', 'sheenColorMap', 'sheenRoughnessMap', 'transmissionMap', 'thicknessMap', 'specularIntensityMap', 'specularColorMap'];
  H.scene.traverse(o => { let cat = o.userData.cat, p = o; while (!cat && p.parent) { p = p.parent; cat = p.userData.cat ?? (p.name && !p.parent?.parent ? p.name : undefined); }
    for (const m of [].concat(o.material ?? [])) for (const k of KEYS) { const t = m[k]; if (!t) continue; const id = t.source.uuid; if (seen.has(id)) continue;
      const src = t.source.data; const w = src?.width ?? 0, h = src?.height ?? 0; const url = src?.currentSrc ?? src?.src ?? '';
      seen.set(id, { cat: (cat ?? 'other').split(':')[0], k, w, h, mb: w * h * 4 * 1.333 / 1048576, up: !!props.get(t).__webglTexture, url: url.replace(/^.*assets\//, '') }); } });
  const by = {}; for (const v of seen.values()) { const key = v.cat + (v.url.startsWith('tex/') ? ':tex' : v.url.startsWith('art/') ? ':art' : v.url.startsWith('models/') ? ':models' : ':canvas'); by[key] ??= [0, 0, 0]; by[key][0]++; by[key][1] += v.mb; if (v.up) by[key][2] += v.mb; }
  const byKey = {}; for (const v of seen.values()) { if (!v.url.startsWith('models/')) continue; byKey[v.k] ??= [0, 0]; byKey[v.k][0]++; byKey[v.k][1] += v.mb; }
  const big = [...seen.values()].filter(v => !v.url.startsWith('models/') && !v.url.startsWith('tex/')).sort((a, b) => b.mb - a.mb).slice(0, 12).map(v => `${v.cat} ${v.k} ${v.w}x${v.h} ${v.url.slice(0, 40)}`);
  return { n: seen.size, by: Object.fromEntries(Object.entries(by).map(([k, v]) => [k, `${v[0]} tex, ${v[1].toFixed(0)} MB, uploaded ${v[2].toFixed(0)} MB`])), modelMaps: byKey, big }; })()
