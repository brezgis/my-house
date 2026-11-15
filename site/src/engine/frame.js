// Where a frame's time goes, for the ?fps caption (main.js). Shared by the house, the town and the lab (engine/: my_house is
// the source; the copies are kept byte-identical).
//
//   meter.begin()    first thing in the frame          meter.draw()   just before renderer.render
//   meter.end()      just after it                     meter.text()   'js 4.1 · draw 2.0 · frame 16.7 (worst 31) ms'
//
// js is the page's own work (walking, the robots, what is drawn where), draw the time spent handing the frame to the
// graphics card, frame the time from one frame to the next. When frame is far more than js and draw together, the
// graphics card is what holds the frame rate down; when it is not, the page's own work is.
export function makeFrameMeter() {
  let t0 = 0, t1 = 0, last = 0, js = 0, draw = 0, gap = 0, worst = 0, n = 0;
  let shown = { js: 0, draw: 0, frame: 0, worst: 0 };
  return {
    begin() {
      const t = performance.now();
      if (last) { const g = t - last; gap += g; worst = Math.max(worst, g); n++; }
      last = t; t0 = t;
      if (gap >= 1000 && n) { shown = { js: js / n, draw: draw / n, frame: gap / n, worst }; js = draw = gap = worst = n = 0; }
    },
    draw() { t1 = performance.now(); js += t1 - t0; },
    end() { draw += performance.now() - t1; },
    get last() { return shown; },
    text() { const s = shown; return `js ${s.js.toFixed(1)} · draw ${s.draw.toFixed(1)} · frame ${s.frame.toFixed(1)} (worst ${s.worst.toFixed(0)}) ms`; },
  };
}
