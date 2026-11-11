// Warming up. A texture is sent to the graphics card, and a material's shader compiled, the
// first time something that uses it is drawn. Left to that, walking into a room for the first
// time stalls for a moment while everything in it is prepared at once. Instead a little is
// prepared each frame, nearest first, for the things within reach of the visitor, so that by
// the time a room is seen its pictures are already there. Things further off than `range`
// (or, for big things, than the distance they are drawn from) are left alone until one comes
// near, so the far end of the garden costs no memory on a visit that never goes there.

import * as THREE from 'three';

const MAPS = ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap', 'alphaMap', 'bumpMap'];

export function makeWarmer({ renderer, scene, camera, range = 60, budget = 2.5 }) {
  const props = renderer.properties;
  const waiting = new Map();                    // texture -> { box } for those not yet uploaded
  const known = new WeakSet(), fresh = [];      // objects already looked at; objects whose shaders are still to be compiled
  let scanIn = 0, idle = 0, uploads = 0;
  const batch = new THREE.Group();              // a stand-in parent, so one compile call covers a handful of new arrivals

  function scan() {
    scene.traverse(o => {
      if (!(o.isMesh || o.isPoints || o.isSprite) || known.has(o)) return;
      known.add(o); fresh.push(o);
      let box = null;
      for (const m of [].concat(o.material ?? [])) for (const k of MAPS) {
        const t = m[k];
        if (!t || !t.isTexture || t.isRenderTargetTexture || waiting.has(t)) continue;
        box ??= o.userData.box ?? new THREE.Box3().setFromObject(o);
        waiting.set(t, { box, reach: Math.max(range, box.min.distanceTo(box.max) * 45) });      // big things are drawn from further off (life.js), so are made ready from further off
      }
    });
  }
  const far = (box, eye) => {
    const dx = Math.max(box.min.x - eye.x, 0, eye.x - box.max.x), dy = Math.max(box.min.y - eye.y, 0, eye.y - box.max.y), dz = Math.max(box.min.z - eye.z, 0, eye.z - box.max.z);
    return Math.hypot(dx, dy, dz);
  };

  // Called once a frame, after drawing
  function update(dt) {
    const t0 = performance.now(), eye = camera.position;
    if ((scanIn -= dt) <= 0) { scanIn = 1; scan(); idle = 0; }
    // shaders for newly arrived things: asked for now, compiled in the background where the browser can
    if (fresh.length) { batch.children = fresh.splice(0, 40); renderer.compile(batch, camera, scene); batch.children = []; }
    if (!waiting.size || idle-- > 0) return;
    for (let n = 0; n < 6 && performance.now() - t0 < budget; n++) {
      let best = null, bestS = null, bd = Infinity;
      for (const [t, s] of waiting) {
        const p = props.get(t);
        if (p.__webglTexture && p.__version === t.version) { waiting.delete(t); continue; }      // drawn already
        const img = t.image;
        if (s.decoding || t.version === 0 || !img || img.complete === false || !(img.width > 0 || img.data)) continue;      // still loading
        const d = far(s.box, eye);
        if (d < s.reach && d < bd) { bd = d; best = t; bestS = s; }
      }
      if (!best) { idle = 20; return; }           // nothing within reach: look again in a third of a second
      const img = best.image;
      if (!bestS.decoded && typeof HTMLImageElement !== 'undefined' && img instanceof HTMLImageElement && img.decode) {
        // have the browser decode the picture off the main thread first; otherwise the upload decodes it there and then
        bestS.decoding = true; img.decode().catch(() => {}).then(() => { bestS.decoding = false; bestS.decoded = true; });
        continue;
      }
      renderer.initTexture(best); waiting.delete(best); uploads++;
    }
  }
  // After the whole scene has been compiled in one go (the first frame), nothing in it is new
  const settle = () => { scan(); fresh.length = 0; };
  return { update, settle, get waiting() { return waiting.size; }, get uploads() { return uploads; } };
}
