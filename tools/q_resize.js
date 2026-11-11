// What does the canvas hold if the drawing resolution is changed after the frame has been drawn
// (as main.js did at the end of its frame callback)? Reads the middle of the canvas before and after.
() => new Promise(done => {
  const H = window.__house, r = H.renderer, gl = r.getContext(), px = new Uint8Array(4 * 64 * 64);
  const mid = () => { gl.readPixels(gl.drawingBufferWidth / 2 - 32, gl.drawingBufferHeight / 2 - 32, 64, 64, gl.RGBA, gl.UNSIGNED_BYTE, px); let s = 0, a = 0; for (let i = 0; i < px.length; i += 4) { s += px[i] + px[i + 1] + px[i + 2]; a += px[i + 3]; } return { rgb: +(s / (3 * 4096)).toFixed(1), alpha: +(a / 4096).toFixed(1) }; };
  requestAnimationFrame(() => requestAnimationFrame(() => {      // runs after the house's own frame callback in this frame
    const drawn = mid(), t0 = performance.now();
    r.setPixelRatio(r.getPixelRatio() - 0.2);
    const resizeMs = +(performance.now() - t0).toFixed(1), afterResize = mid();
    requestAnimationFrame(() => requestAnimationFrame(() => done({ drawn, afterResize, resizeMs, nextFrame: mid(), background: getComputedStyle(document.body).backgroundColor })));
  }));
})
