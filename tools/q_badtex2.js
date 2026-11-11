// Which texture is "marked for update but has no image"? Hooks the warning and the renderer's draw
// call for three seconds and reports what was being drawn each time the warning fired.
() => new Promise(done => {
  const r = window.__house.renderer, orig = r.renderBufferDirect.bind(r), warn = console.warn, hits = new Map(); let cur = null, count = 0, frames = 0;
  r.renderBufferDirect = (camera, scene, geometry, material, object, group) => { cur = [object, material]; return orig(camera, scene, geometry, material, object, group); };
  console.warn = (...a) => {
    if (!String(a[0]).includes('no image data')) return warn(...a);
    count++; const [o, m] = cur ?? []; if (!o) return;
    let p = o, chain = []; while (p) { chain.push(p.name || p.type); p = p.parent; }
    const texs = []; for (const [k, t] of [...Object.entries(m), ...Object.entries(m.uniforms ?? {}).map(([k, u]) => ['u.' + k, u?.value])]) if (t && t.isTexture && t.version > 0 && !t.source?.data) texs.push(k + ':' + t.constructor.name + ' v' + t.version);
    const key = chain.reverse().join('/') + ' cat=' + (o.userData.cat ?? '') + ' mat=' + m.type + ':' + m.name + ' ' + texs.join(','); hits.set(key, (hits.get(key) ?? 0) + 1);
  };
  const tick = () => { if (++frames < 420) requestAnimationFrame(tick); else { console.warn = warn; r.renderBufferDirect = orig; done({ warnings: count, frames, what: [...hits] }); } }; tick();
})
