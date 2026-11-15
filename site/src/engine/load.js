// Getting a place on screen quickly. Shared by the house, the town and the lab: site/src/engine/ is the start of the
// engine the three are to share. my_house is the source; the town's and the lab's copies are kept byte-identical (as
// airship/ and robokit/ are), so a change here is copied to all three.
//
//   gpuName, takeContext    the graphics card's name, asked of a context that is then handed to the renderer
//   decodedImage            a photo fetched and decoded off the main thread before the renderer is given it
//   dressed, markDressed    the moment the place's own photos are in, which what streams in after waits for
//   lateTexture             a texture made at once whose photo is fetched once the place is dressed

import * as THREE from 'three';

// ---- the graphics context -------------------------------------------------------------------------------------------
// The card's name (quality.js chooses a tier from it) is asked of a WebGL context of our own. Making one costs 100 to
// 150 ms, so it is kept and handed to the renderer (main.js: new THREE.WebGLRenderer({ ...takeContext(antialias) }))
// rather than thrown away and made again a moment later. It is made as three would make it, but opaque (three asks for
// an alpha channel and then draws as if there were none).
let probe = null;
const ATTRS = { alpha: false, depth: true, stencil: false, antialias: true, premultipliedAlpha: true, preserveDrawingBuffer: false, powerPreference: 'high-performance', failIfMajorPerformanceCaveat: false };
export function gpuName() {
  try {
    const c = document.createElement('canvas'); c.style.display = 'block';      // (as three's own canvas is)
    const gl = c.getContext('webgl2', ATTRS);
    if (!gl) return '';
    probe = { canvas: c, context: gl };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    return String(name || '');
  } catch { return ''; }
}
// { canvas, context } for the renderer when the kept context suits the tier (it is made antialiased; the low tier is not,
// and makes its own); otherwise {} and the kept one is let go.
export function takeContext(antialias) {
  const p = probe; probe = null;
  if (p && antialias && !p.context.isContextLost()) return p;
  p?.context.getExtension('WEBGL_lose_context')?.loseContext();
  return {};
}

// ---- photos -----------------------------------------------------------------------------------------------------------
// A photo is decoded before it is handed to the renderer (img.decode(), which every browser does off the main thread).
// Handed over undecoded, it was decoded on the main thread at the moment of its first upload: a fifth of a second of the
// first frame, and a hitch each time a full-size photo was swapped in. The loading manager is told of it as
// THREE.TextureLoader would tell it, so the threshold (main.js, on the default manager) still waits for these.
// If decode() gives up (a browser may refuse it for reasons that are not the photo's: Safari sometimes does), the photo is
// taken as it loads, undecoded, as before; only a photo that will not load at all counts as failed.
export function decodedImage(url, done, fail, manager = THREE.DefaultLoadingManager) {
  manager.itemStart(url);
  const img = new Image();
  const ok = () => { done(img); manager.itemEnd(url); };
  const bad = () => { fail?.(); manager.itemError(url); manager.itemEnd(url); };      // (fail first, as three's loaders do: it may start another load before the manager can count down to nothing)
  img.src = url;
  img.decode().then(ok, () => {
    if (img.complete) (img.naturalWidth ? ok : bad)();      // (already come, or already failed)
    else { img.addEventListener('load', ok, { once: true }); img.addEventListener('error', bad, { once: true }); }
  });
}

// ---- the gate -----------------------------------------------------------------------------------------------------------
// The photos a place is made of are what the threshold waits for. What streams in after them (models, paintings, photo
// frames: life.js) waits for them in turn, so as not to take their bandwidth: `dressed` resolves when they are in
// (main.js calls markDressed from the default manager's onLoad), or after six seconds whatever has happened.
let dressedOk;
export const dressed = new Promise(ok => { dressedOk = ok; setTimeout(ok, 6000); });
export const markDressed = () => dressedOk();

// A texture made at once, whose photo is fetched (with `loader`, a THREE.TextureLoader) once the place is dressed;
// ready(texture) is called when it has come.
export function lateTexture(loader, url, ready) {
  const t = new THREE.Texture();
  dressed.then(() => loader.load(url, l => { t.image = l.image; t.needsUpdate = true; ready?.(t); }));
  return t;
}
