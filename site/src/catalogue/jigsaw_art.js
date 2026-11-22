// The catalogue's jigsaw pictures that are drawn here rather than photographed. Loaded only when one
// of them is first wanted (src/jigsaw.js: the table, the chooser, the catalogue's thumbnail); each is
// drawn once, 1024 x 768, the size the jigsaw holds its picture at, and kept.
//
//   paint('island_at_night')  ->  the canvas
//
// "The Island at Night": the island afloat with the house lit, under a clear sky. Everything but
// the stars and the lamplight is kept dark on purpose: the jigsaw shows this picture by its own
// light as well as the room's, so what is bright here is what glows on the table after dark.

const W = 1024, H = 768, TAU = Math.PI * 2;
const rng = seed => { let s = seed; return () => (s = (s * 16807) % 2147483647) / 2147483647; };
const made = new Map();

export function paint(id) {
  if (!made.has(id)) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    PAINT[id](c.getContext('2d')); made.set(id, c);
  }
  return made.get(id);
}

// The Plough, from its stars' places in the sky (right ascension in hours, declination in degrees, magnitude)
const PLOUGH = [[11.062, 61.75, 1.8], [11.031, 56.38, 2.4], [11.897, 53.69, 2.4], [12.257, 57.03, 3.3], [12.900, 55.96, 1.8], [13.399, 54.93, 2.2], [13.792, 49.31, 1.9]];

const PAINT = {
  island_at_night(g) {
    const r = rng(1906);
    const glow = (x, y, rad, col, a) => { const q = g.createRadialGradient(x, y, 0, x, y, rad); q.addColorStop(0, `rgba(${col},${a})`); q.addColorStop(1, `rgba(${col},0)`); g.fillStyle = q; g.fillRect(x - rad, y - rad, rad * 2, rad * 2); };
    const gauss = () => (r() + r() + r() + r() - 2) / 2;

    // ---- the sky: darkest overhead, a little light left low down ----
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#060d24'); sky.addColorStop(0.45, '#0b1a3c'); sky.addColorStop(0.74, '#1b3360'); sky.addColorStop(0.86, '#14274d'); sky.addColorStop(1, '#0a1430');
    g.fillStyle = sky; g.fillRect(0, 0, W, H);

    // ---- the Milky Way, a band from the lower left up to the right, with its dark lane ----
    const along = t => [-80 + t * 1240, 520 - t * 560], nx = 0.41, ny = 0.91;       // a point on the band, and the way across it
    // (worked out point by point on a quarter-size canvas and enlarged: washes laid over one another
    // at full size show their rounding as a weave)
    {
      const sw = W / 4, sh = H / 4, small = document.createElement('canvas'); small.width = sw; small.height = sh;
      const sg = small.getContext('2d'), im = sg.createImageData(sw, sh), px = im.data;
      const lat = Array.from({ length: 64 * 64 }, () => r());                           // a little lattice of chance, read smoothly
      const noise = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), at = (i, j) => lat[((j & 63) << 6) | (i & 63)];
        return (at(xi, yi) * (1 - sx) + at(xi + 1, yi) * sx) * (1 - sy) + (at(xi, yi + 1) * (1 - sx) + at(xi + 1, yi + 1) * sx) * sy; };
      for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) {
        const X = x * 4 + 80, Y = y * 4 - 520, t = (X * ny - Y * nx) / 1361, d = X * nx + Y * ny;      // along the band (0..1) and across it (px)
        const clump = 0.35 * noise(t * 9, d / 90) + 0.4 * noise(t * 21 + 7, d / 45 + 3) + 0.25 * noise(t * 50, d / 22);
        const wide = 58 + 26 * noise(t * 6 + 20, 0.5);
        let v = Math.exp(-d * d / (2 * wide * wide)) * (0.35 + 1.1 * clump);
        const dl = d - 6 - 30 * (noise(t * 8 + 40, 0.5) - 0.5), lane = Math.exp(-dl * dl / 420) * Math.min(1, Math.max(0, noise(t * 14 + 60, 0.5) * 2.6 - 0.7));
        v *= 1 - 0.8 * lane;
        const k = (y * sw + x) * 4, warm = noise(t * 5 + 80, d / 60);
        px[k] = v * (26 + 14 * warm); px[k + 1] = v * (31 + 6 * warm); px[k + 2] = v * 46; px[k + 3] = 255;
      }
      sg.putImageData(im, 0, 0);
      g.imageSmoothingQuality = 'high'; g.globalCompositeOperation = 'lighter'; g.drawImage(small, 0, 0, W, H); g.globalCompositeOperation = 'source-over';
    }

    // ---- the stars: a great many faint, a few bright; thicker along the band ----
    const TINT = ['255,255,255', '214,226,255', '255,244,224', '255,226,190', '190,208,255'];
    const star = (x, y, b, tint = TINT[Math.floor(r() * TINT.length)]) => {
      if (b > 0.7) glow(x, y, 2.5 + b * 4.5, tint, 0.06 + b * 0.2);
      g.fillStyle = `rgba(${tint},${Math.min(1, 0.26 + b * 0.9)})`; g.beginPath(); g.arc(x, y, 0.4 + b * 1.2, 0, TAU); g.fill();
    };
    for (let k = 0; k < 1700; k++) {
      let x = r() * W, y = r() * H;
      if (k % 5 < 2) { const [ax, ay] = along(r()), d = gauss() * 85; x = ax + nx * d; y = ay + ny * d; }
      star(x, y, Math.pow(r(), 9) * 0.9);
    }
    for (let k = 0; k < 7; k++) star(r() * W, r() * 540, 0.75 + r() * 0.3);
    { // the Plough, high on the left, handle down
      const turn = -0.55, s = 7.4, cx = 205, cy = 150, co = Math.cos(turn), si = Math.sin(turn);
      for (const [ra, dec, m] of PLOUGH) { const x = -(ra - 12.4) * 15 * Math.cos(55.5 * Math.PI / 180) * s, y = -(dec - 55.5) * s; star(cx + x * co - y * si, cy + x * si + y * co, 1.4 - m * 0.2, '236,240,255'); }
    }

    // ---- cloud far below, hardly lit ----
    for (let k = 0; k < 60; k++) { const x = r() * W, y = 640 + r() * 150; g.save(); g.translate(x, y); g.scale(2.6, 1); glow(0, 0, 30 + r() * 50, '70,92,138', 0.05 + r() * 0.05); g.restore(); }

    // ---- the island: a lawn on a rock that tapers to a point ----
    const top = 566, cxI = 512, rim = [];
    for (let k = 0; k <= 60; k++) { const a = Math.PI + (k / 60) * Math.PI, w = 1 + 0.05 * Math.sin(k * 0.9) + 0.03 * Math.sin(k * 2.3); rim.push([cxI + Math.cos(a) * 350 * w, top - Math.sin(-a) * 0]); }
    const under = [[862, top], [846, 590], [800, 612], [770, 640], [716, 652], [690, 684], [636, 700], [610, 728], [566, 752], [540, 764], [520, 742], [478, 726], [452, 692], [400, 680], [372, 648], [312, 636], [270, 606], [214, 596], [176, 578], [162, top]];
    const rock = g.createLinearGradient(0, top, 0, 764); rock.addColorStop(0, '#191512'); rock.addColorStop(0.5, '#0e0c0b'); rock.addColorStop(1, '#050505');
    g.fillStyle = rock; g.beginPath(); g.moveTo(162, top); for (const [x, y] of under.slice().reverse()) g.lineTo(x, y); g.closePath(); g.fill();
    g.save(); g.clip();                                                                 // strata, and the night's blue on the rock's left face
    g.strokeStyle = 'rgba(96,84,70,0.16)'; g.lineWidth = 1.2;
    for (let y = top + 12; y < 760; y += 9 + r() * 9) { g.beginPath(); g.moveTo(150, y + r() * 6); for (let x = 150; x <= 880; x += 40) g.lineTo(x, y + Math.sin(x * 0.02 + y) * 3 + r() * 3); g.stroke(); }
    const side = g.createLinearGradient(160, 0, 520, 0); side.addColorStop(0, 'rgba(60,84,130,0.3)'); side.addColorStop(1, 'rgba(60,84,130,0)'); g.fillStyle = side; g.fillRect(150, top, 400, 200);
    g.restore();
    // the lawn, seen nearly edge on, and the sod hanging over
    g.fillStyle = '#0b1a12'; g.beginPath(); g.ellipse(cxI, top, 350, 15, 0, 0, TAU); g.fill();
    g.strokeStyle = '#0b1a12'; g.lineWidth = 2;
    for (let x = 166; x < 860; x += 3 + r() * 4) { const e = Math.sqrt(Math.max(0, 1 - ((x - cxI) / 350) ** 2)) * 15; g.beginPath(); g.moveTo(x, top + e - 2); g.lineTo(x + (r() - 0.5) * 3, top + e + 2 + r() * 7); g.stroke(); }

    // ---- trees behind and beside the house ----
    const tree = (x, base, h, wide, shade = '#06110b') => {
      g.strokeStyle = '#050807'; g.lineWidth = Math.max(2, h * 0.045); g.beginPath(); g.moveTo(x, base); g.lineTo(x + h * 0.03, base - h * 0.55); g.stroke();
      g.fillStyle = shade;
      for (let k = 0; k < 16; k++) { const a = r() * TAU, d = Math.sqrt(r()); g.beginPath(); g.arc(x + Math.cos(a) * d * wide, base - h * 0.68 + Math.sin(a) * d * h * 0.3, h * (0.13 + r() * 0.1), 0, TAU); g.fill(); }
      g.fillStyle = 'rgba(70,100,140,0.05)';                                             // the sky's light on the crown
      for (let k = 0; k < 7; k++) { const a = Math.PI * (1.1 + r() * 0.5), d = 0.6 + r() * 0.4; g.beginPath(); g.arc(x + Math.cos(a) * d * wide, base - h * 0.7 + Math.sin(a) * d * h * 0.28, h * 0.08, 0, TAU); g.fill(); }
    };
    tree(300, 562, 150, 52); tree(372, 560, 118, 40); tree(700, 560, 172, 62); tree(770, 563, 112, 42); tree(236, 564, 92, 34); tree(628, 558, 128, 40, '#07130c');

    // ---- the house: two low storeys under wide eaves, a cross gable, a porch, every window lit ----
    const X = 430, B = 563, wall = '#0a0c10', roof = '#07080b';
    g.fillStyle = wall; g.fillRect(X, B - 78, 168, 78);                                 // the main block
    g.fillRect(X + 168, B - 44, 44, 44);                                                // the low wing (kitchen and sleeping porch)
    g.fillStyle = roof;
    g.beginPath(); g.moveTo(X - 16, B - 76); g.lineTo(X + 30, B - 100); g.lineTo(X + 150, B - 100); g.lineTo(X + 186, B - 76); g.closePath(); g.fill();     // the main roof
    g.beginPath(); g.moveTo(X + 86, B - 74); g.lineTo(X + 130, B - 112); g.lineTo(X + 174, B - 74); g.closePath(); g.fill();                                   // the cross gable
    g.beginPath(); g.moveTo(X + 160, B - 42); g.lineTo(X + 172, B - 52); g.lineTo(X + 222, B - 52); g.lineTo(X + 224, B - 42); g.closePath(); g.fill();        // the wing's roof
    g.fillRect(X + 44, B - 118, 12, 24);                                                // the chimney
    g.beginPath(); g.moveTo(X - 14, B - 38); g.lineTo(X + 84, B - 44); g.lineTo(X + 84, B - 38); g.closePath(); g.fill();                                      // the porch roof
    g.fillRect(X - 8, B - 38, 3, 38); g.fillRect(X + 34, B - 40, 3, 40); g.fillRect(X + 78, B - 42, 3, 42);                                                  // its posts
    g.strokeStyle = 'rgba(120,146,196,0.32)'; g.lineWidth = 1;                         // the sky's light along the ridges
    g.beginPath(); g.moveTo(X - 16, B - 76); g.lineTo(X + 30, B - 100); g.lineTo(X + 104, B - 100); g.moveTo(X + 106, B - 92); g.lineTo(X + 130, B - 112); g.lineTo(X + 174, B - 74); g.moveTo(X + 172, B - 52); g.lineTo(X + 222, B - 52); g.stroke();
    // windows: warm, each a little different, glazing bars across
    const lit = [];
    const win = (x, y, w, h, bars = 2) => {
      const warm = ['255,206,128', '255,190,104', '255,220,150'][Math.floor(r() * 3)];
      g.fillStyle = `rgb(${warm})`; g.fillRect(x, y, w, h);
      const q = g.createLinearGradient(0, y, 0, y + h); q.addColorStop(0, 'rgba(255,246,214,0.55)'); q.addColorStop(1, 'rgba(214,120,40,0.35)'); g.fillStyle = q; g.fillRect(x, y, w, h);
      g.fillStyle = wall; for (let k = 1; k <= bars; k++) g.fillRect(x + (w * k) / (bars + 1) - 0.6, y, 1.2, h); g.fillRect(x, y + h * 0.36, w, 1.1);
      lit.push([x + w / 2, y + h / 2, Math.max(w, h)]);
    };
    win(X + 12, B - 70, 22, 15); win(X + 50, B - 70, 22, 15); win(X + 112, B - 84, 36, 16, 3); win(X + 110, B - 60, 14, 12, 1); win(X + 136, B - 60, 14, 12, 1);
    win(X + 8, B - 30, 20, 20); win(X + 92, B - 31, 30, 21, 3); win(X + 134, B - 31, 24, 21); win(X + 178, B - 32, 26, 16, 3);
    g.fillStyle = 'rgb(255,214,140)'; g.fillRect(X + 48, B - 28, 11, 28); g.fillStyle = wall; g.fillRect(X + 53, B - 28, 1, 28);                             // the door, open as ever
    lit.push([X + 53, B - 14, 26]);
    // the light they throw: round each window, across the lawn, up under the eaves
    g.globalCompositeOperation = 'lighter';
    for (const [x, y, s] of lit) glow(x, y, s * 2.4, '255,170,80', 0.2);
    g.save(); g.translate(X + 80, B + 3); g.scale(1, 0.09); glow(0, 0, 190, '255,176,90', 0.3); g.restore();
    g.save(); g.translate(X + 53, B + 5); g.scale(1, 0.12); glow(0, 0, 70, '255,190,110', 0.35); g.restore();
    glow(X + 84, B - 50, 150, '255,160,70', 0.07);
    // a string of lamps from the wing to the oak, and the porch lantern
    for (let k = 0; k <= 9; k++) { const t = k / 9, x = X + 214 + t * 86, y = B - 46 + Math.sin(t * Math.PI) * 13 - t * 16; glow(x, y, 7, '255,214,150', 0.5); g.fillStyle = 'rgb(255,236,196)'; g.beginPath(); g.arc(x, y, 1.3, 0, TAU); g.fill(); }
    glow(X + 36, B - 34, 12, '255,200,120', 0.55);
    g.globalCompositeOperation = 'source-over';
    g.strokeStyle = 'rgba(8,10,12,0.9)'; g.lineWidth = 0.7; g.beginPath(); for (let k = 0; k <= 18; k++) { const t = k / 18, x = X + 214 + t * 86, y = B - 47 + Math.sin(t * Math.PI) * 13 - t * 16; k ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    // smoke from the chimney, just visible
    for (let k = 0; k < 14; k++) glow(X + 50 + k * 3.2 + Math.sin(k * 0.8) * 4, B - 124 - k * 8, 7 + k * 1.3, '120,134,170', 0.05);
  },
};
