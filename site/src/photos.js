// Anna's own photographs, for the picture frames about the house (assets/photos; small copies
// with no camera or location data). The frames are drawn onto shared label sheets as the house is put together;
// each is drawn again when its photograph has arrived. A photo that fails to
// load leaves the frame with its drawn stand-in.
const N = 9;
const one = i => new Promise(ok => {
  if (typeof Image === 'undefined') return ok(null);
  const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null);
  im.src = `assets/photos/p${String(i + 1).padStart(2, '0')}.jpg`;
});
export const PHOTOS = [];
// Nothing waits for these: a frame is drawn with its stand-in at once, and life.js draws it again when
// the photographs have arrived (a draw function may carry `late`, a promise, to ask for that).
export const photosReady = Promise.all(Array.from({ length: N }, (_, i) => one(i).then(im => { PHOTOS[i] = im; })));

// A draw function for a frame: photo number k (0-based, wraps), cropped to fill, with a thin white border
export function photoDraw(k, fallback) {
  const draw = (g, w, h) => {
    const im = PHOTOS[((k % N) + N) % N];
    if (!im) return fallback?.(g, w, h);
    const b = Math.round(Math.min(w, h) * 0.05), W = w - 2 * b, H = h - 2 * b;
    g.fillStyle = '#f6f1e6'; g.fillRect(0, 0, w, h);
    const s = Math.max(W / im.width, H / im.height), sw = W / s, sh = H / s;
    g.drawImage(im, (im.width - sw) / 2, Math.max(0, (im.height - sh) * 0.38), sw, sh, b, b, W, H);      // crop a little above centre: faces are usually there
  };
  draw.late = photosReady;
  return draw;
}

// Frames take the photographs in turn, in the order the house is put together
export const nextPhoto = (() => { let n = 0; return () => n++; })();
