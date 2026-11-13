// Imported first by main.js, before anything paints. Every sign, label, book spine, rug, leaf atlas,
// robot face and pane of chapel glass here is a 2D canvas handed to WebGL as a texture. Browsers keep
// such canvases on the graphics card unless told otherwise, and a card short of memory can silently
// drop them: the canvas comes back blank, and trees lose their leaves, flowers vanish or signs go black
// (seen often in headless renders on a busy GPU; found and fixed first in the town, town_walk).
// Kept in ordinary memory they cannot be lost, and they upload to WebGL without a read-back.
const get = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function (type, opts) { return get.call(this, type, type === '2d' ? { willReadFrequently: true, ...opts } : opts); };
