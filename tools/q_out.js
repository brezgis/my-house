(() => { const H = window.__house, out = H.scene.children.find(o => o.name === 'outdoors'), rows = [];
  for (const c of out.children) { let n = 0, t = 0; c.traverse(m => { if (m.isMesh || m.isPoints) { n++; } }); rows.push(`${c.name || c.type}:${c.userData.cat ?? ''}:${n}`); }
  const other = []; H.scene.children.forEach(c => { if (!c.userData.cat && c.name !== 'outdoors' && (c.isMesh || c.isGroup || c.isSprite)) { let n = 0; c.traverse(m => { if (m.isMesh || m.isSprite) n++; }); other.push(`${c.name || c.type}:${n}`); } });
  return { outdoors: rows.join(' | '), other: other.join(' | ') }; })()
