// Dandelion, the airship on Line 6: a short, chubby yellow school bus slung under a cream envelope,
// and one of the robots. The bus is the robot: its windscreen is a dark glowing face screen with simple
// eyes (as Barty's, Mort's and Fig's), it floats on a ring of light, a pair of mitten hands bob beside
// its face, and the black-striped body is rounded like a toy. Wheels tucked up as if it never needed
// them, a stop-sign arm that swings out, red and amber lamps that flash in turn while the door is open,
// a folding door, a destination blind over the windscreen, two brass propellers, fins at the tail, a
// brass tuba bell on the roof for a horn. Inside: two rows of green bench seats, round windows (and a long one on the door side) to see
// out of, panelled walls, a ribbed floor, hand-straps, a map of the line, a brass rail, a ticket machine (the fare is a nice thought), and a mirror in which the bus's
// eyes look back at you.
//
// Shared by Anna's House and Vesper Street: it imports nothing but three. ONE draw call: every part is
// one merged, vertex-coloured mesh with one small canvas (512 x 512: the face, the blind, the lettering,
// the mirror, the ticket screen, the stop sign) as its texture; the moving parts (propellers, door
// leaves, stop arm, hands) are turned in the vertex shader, and the lamps, ring and screens glow by an
// attribute, so nothing needs a mesh of its own and nothing is a real light. About 10k triangles.
// It casts no shadow (the sun's shadows are not redrawn every frame, so a moving one would smear).
//
// Units feet. The bus's own frame: +z forward, y = 0 the cabin floor, its right side (the door) at -x,
// as the robots face +z with the right hand at -x.
//
//   const bus = buildBus({ ring: 0xa8d8ff });  scene.add(bus.root);
//   bus.update(t, dt, { light })  each frame (light 0 night .. 1 day: lamps and ring brighter after dark)
//   bus.setDoor(0..1), bus.setArm(0..1), bus.flash(on), bus.setBlind('ROUND THE ISLAND'), bus.setFace(expr), bus.look(-1..1)
//   bus.seat: the passenger's eye in the bus's frame (a Vector3); bus.door: just outside the door, at the floor

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// ---- the name and the lines (both places use these; each place adds its own) ----------------------
export const DANDELION = {
  name: 'Dandelion', line: 6, ring: 0xa8d8ff,
  lines: {
    rung: ['Coming. I am a bus, not a hare.', 'Heard you. On my way.'],
    coming: ['Nearly there. I can see you waving. Or that is a tree.', 'Still coming. Clouds are slow on a Tuesday.'],
    here: ['Still here. The door is the open bit.', 'I am right here. The big yellow thing.'],
    arrive: ['Line 6. Mind the gap; it goes a long way down.', 'Here I am. Hop on, if you are hopping.', 'All aboard who is coming aboard.'],
    board: ['Sit anywhere. Every seat is a window seat, more or less.', 'Fares, please. Oh, that is a lovely one. Thank you.', 'Welcome aboard. Hands inside the sky.'],
    depart: ['Off we go. Up is the direction.', 'Hold on to something. Or do not; I am very smooth.'],
    back: ['Right you are. Back to the stop.', 'Of course. Turning round. Nobody saw.'],
    alight: ['Here we are, where we started. The best kind of trip.', 'Thank you for flying with me. Do come again.'],
    landed: ['Mind the step. It is the important one.', 'Here we are. Off you hop, and mind the step.'],
    stay: ['Changed your mind? Very wise. The ground is lovely too.'],
    leave: ['I shall be round again. Ring if you want me.', 'Off I go. Ring the bell; I always hear it.'],
    transit: ['Next stop, the clouds. Then the other side of them.'],
  },
};

// ---- the canvas: where each picture lives (pixels; the canvas is 512 square) ----------------------
const S = 512;
const REG = {
  face: [0, 0, 384, 160], notice: [384, 0, 512, 80], photo: [384, 80, 512, 160],
  plate: [0, 160, 256, 192], tartan: [256, 160, 384, 192], tuft: [384, 160, 512, 192],
  map: [0, 192, 512, 256], blind: [0, 256, 512, 320], side: [0, 320, 512, 384],
  mirror: [0, 384, 160, 448], suitcase: [16, 448, 160, 512], white: [0, 496, 16, 512], six: [160, 384, 288, 512], ticket: [288, 384, 416, 512], stop: [416, 384, 512, 480],
};
const YELLOW = '#f3b21b', BLACK = '#1d1b1a', CREAM = '#efe4cf', BRASS = '#c9a45c', GREEN = '#2f6048', GREEN2 = '#264d3a', SILVER = '#bdbdb4', GLASS = '#1b2a30', ROPE = '#a8956c';
const FONT = '"Arial Narrow", "Helvetica Neue", Arial, sans-serif', SERIF = 'Georgia, "Times New Roman", serif';

export function buildBus({ ring = DANDELION.ring, name = DANDELION.name, plank = 8 } = {}) {
  // ---- the canvas -------------------------------------------------------------------------------
  const cv = document.createElement('canvas'); cv.width = cv.height = S; const g = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  let expr = 'neutral', look = 0, blink = false, blindText = 'ROUND THE ISLAND', faceKey = '';
  const eyes = (x0, y0, w, h, sc, lk, ex, bl, col = '#ffe7b8') => {      // two eyes and a mouth in a box, the robots' way
    const cx = x0 + w / 2 + lk * 14 * sc, y = y0 + h * 0.44, gap = 50 * sc, ew = 40 * sc, eh = 52 * sc;
    g.save(); g.strokeStyle = g.fillStyle = col; g.lineCap = 'round'; g.shadowColor = col; g.shadowBlur = 16 * sc;
    const rr = (x, yy, ww, hh, r) => { g.beginPath(); g.roundRect(x - ww / 2, yy - hh / 2, ww, hh, r); g.fill(); };
    if (bl || ex === 'blink') { g.lineWidth = 8 * sc; for (const x of [cx - gap, cx + gap]) { g.beginPath(); g.moveTo(x - ew / 2, y + 6 * sc); g.lineTo(x + ew / 2, y + 6 * sc); g.stroke(); } }
    else if (ex === 'happy') { g.lineWidth = 10 * sc; for (const x of [cx - gap, cx + gap]) { g.beginPath(); g.arc(x, y + 10 * sc, ew * 0.6, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); } }
    else if (ex === 'sleepy') { g.lineWidth = 8 * sc; for (const x of [cx - gap, cx + gap]) { g.beginPath(); g.arc(x, y - 4 * sc, ew * 0.45, Math.PI * 0.2, Math.PI * 0.8); g.stroke(); } }
    else if (ex === 'wink') { rr(cx - gap, y, ew, eh, ew * 0.42); g.lineWidth = 10 * sc; g.beginPath(); g.arc(cx + gap, y - 10 * sc, ew * 0.6, Math.PI * 0.15, Math.PI * 0.85); g.stroke(); }
    else { rr(cx - gap, y, ew, eh, ew * 0.42); rr(cx + gap, y, ew, eh, ew * 0.42); }
    g.lineWidth = 6 * sc;
    if (ex === 'happy' || ex === 'wink') { g.beginPath(); g.arc(cx, y + 34 * sc, 15 * sc, Math.PI * 0.2, Math.PI * 0.8); g.stroke(); }
    g.restore();
  };
  const screen = (x0, y0, w, h) => { const gr = g.createRadialGradient(x0 + w / 2, y0 + h * 0.3, 10, x0 + w / 2, y0 + h / 2, w * 0.6); gr.addColorStop(0, '#2a2026'); gr.addColorStop(0.5, '#120b10'); gr.addColorStop(1, '#050304'); g.fillStyle = gr; g.fillRect(x0, y0, w, h); };
  function drawFace() {
    const key = `${expr}|${Math.round(look * 4)}|${blink}`; if (key === faceKey) return false; faceKey = key;
    const [x0, y0, x1, y1] = REG.face; screen(x0, y0, x1 - x0, y1 - y0);
    g.strokeStyle = 'rgba(255,231,184,.035)'; g.lineWidth = 2; for (let y = y0 + 8; y < y1; y += 8) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke(); }      // faint scan lines
    eyes(x0, y0 + 6, x1 - x0, y1 - y0, 1.45, look, expr, blink);
    const [m0, n0, m1, n1] = REG.mirror; g.fillStyle = '#c9a45c'; g.fillRect(m0, n0, m1 - m0, n1 - n0); screen(m0 + 4, n0 + 4, m1 - m0 - 8, n1 - n0 - 8);
    eyes(m0, n0 + 2, m1 - m0, n1 - n0, 0.5, -look, expr === 'happy' ? 'happy' : 'neutral', blink);      // in the mirror: the same eyes, looking back at you
    return true;
  }
  function drawBlind() {
    const [x0, y0, x1, y1] = REG.blind, w = x1 - x0, h = y1 - y0;
    g.fillStyle = '#0d0b0a'; g.fillRect(x0, y0, w, h);
    g.save(); g.fillStyle = '#ffb347'; g.shadowColor = '#ff9a2a'; g.shadowBlur = 8; g.textBaseline = 'middle';
    g.font = `bold ${h * 0.62}px ${FONT}`; g.textAlign = 'left'; g.fillText(String(DANDELION.line), x0 + 14, y0 + h / 2 + 2);
    g.fillRect(x0 + 52, y0 + 12, 3, h - 24);
    const t = blindText.toUpperCase(); let size = h * 0.5; g.font = `bold ${size}px ${FONT}`;
    while (g.measureText(t).width > w - 90 && size > 14) { size -= 1; g.font = `bold ${size}px ${FONT}`; }
    g.textAlign = 'center'; g.fillText(t, x0 + 52 + (w - 52) / 2, y0 + h / 2 + 2); g.restore();
  }
  function drawStatic() {
    { const [x0, y0, x1, y1] = REG.map, w = x1 - x0, h = y1 - y0, my = y0 + h * 0.42; g.fillStyle = '#efe6d0'; g.fillRect(x0, y0, w, h); g.fillStyle = '#2f4a40'; g.fillRect(x0, y0, 70, h);
      g.fillStyle = '#efe6d0'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `bold 13px ${FONT}`; g.fillText('LINE', x0 + 35, y0 + 18); g.font = `bold 30px ${SERIF}`; g.fillText('6', x0 + 35, y0 + 44);
      g.strokeStyle = '#2f4a40'; g.lineWidth = 5; g.beginPath(); g.moveTo(x0 + 100, my); g.lineTo(x0 + 470, my); g.stroke();
      g.lineWidth = 3; g.beginPath(); g.ellipse(x0 + 200, my - 1, 34, 13, 0, 0, 7); g.stroke();                                    // the loop round the island
      g.setLineDash([5, 5]); g.strokeStyle = '#a8361f'; g.beginPath(); g.moveTo(x0 + 300, my); g.lineTo(x0 + 400, my); g.stroke(); g.setLineDash([]);
      for (const [x, label, col] of [[100, 'Anna’s House', '#a8361f'], [200, 'round the island', null], [350, 'the clouds', null], [470, 'Vesper Street', '#24382f']]) {
        if (col) { g.fillStyle = '#efe6d0'; g.strokeStyle = col; g.lineWidth = 4; g.beginPath(); g.arc(x0 + x, my, 8, 0, 7); g.fill(); g.stroke(); }
        g.fillStyle = '#2a1c13'; g.font = `${col ? 'italic bold ' : 'italic '}13px ${SERIF}`; g.fillText(label, x0 + Math.min(x, 430), y0 + h - 12);
      } }
    { const [x0, y0, x1, y1] = REG.white; g.fillStyle = '#ffffff'; g.fillRect(x0, y0, x1 - x0, y1 - y0); }
    const txt = (t, x, y, size, col, font = SERIF, style = '') => { g.fillStyle = col; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `${style}${size}px ${font}`; g.fillText(t, x, y); };
    { const [x0, y0, x1, y1] = REG.notice, w = x1 - x0, h = y1 - y0; g.fillStyle = '#efe6d0'; g.fillRect(x0, y0, w, h); g.strokeStyle = '#a8361f'; g.lineWidth = 4; g.strokeRect(x0 + 4, y0 + 4, w - 8, h - 8);      // the town's notice, copied out
      txt('Please do not', x0 + w / 2, y0 + 25, 15, '#2a1c13', SERIF, 'italic '); txt('feed the clouds.', x0 + w / 2, y0 + 44, 15, '#2a1c13', SERIF, 'italic '); txt('LINE 6', x0 + w / 2, y0 + 64, 10, '#a8361f', FONT, 'bold '); }
    { const [x0, y0, x1, y1] = REG.photo, w = x1 - x0, h = y1 - y0, gr = g.createLinearGradient(0, y0, 0, y1);      // a little photograph of the island from the air
      g.fillStyle = '#b08d4a'; g.fillRect(x0, y0, w, h); gr.addColorStop(0, '#9cc0d8'); gr.addColorStop(1, '#e8eef0'); g.fillStyle = gr; g.fillRect(x0 + 6, y0 + 6, w - 12, h - 12);
      g.fillStyle = '#8a7a64'; g.beginPath(); g.moveTo(x0 + 26, y0 + 44); g.lineTo(x0 + 102, y0 + 44); g.lineTo(x0 + 66, y0 + 72); g.closePath(); g.fill();
      g.fillStyle = '#5f7f45'; g.beginPath(); g.ellipse(x0 + 64, y0 + 42, 40, 9, 0, 0, 7); g.fill(); for (const [x, r] of [[44, 7], [56, 9], [80, 8], [92, 6]]) { g.fillStyle = '#3f5f35'; g.beginPath(); g.arc(x0 + x, y0 + 36, r, 0, 7); g.fill(); }
      g.fillStyle = '#7a3a2c'; g.fillRect(x0 + 64, y0 + 31, 10, 7); g.fillStyle = '#4a3a30'; g.beginPath(); g.moveTo(x0 + 62, y0 + 32); g.lineTo(x0 + 69, y0 + 26); g.lineTo(x0 + 76, y0 + 32); g.fill(); }
    { const [x0, y0, x1, y1] = REG.plate, w = x1 - x0, h = y1 - y0, gr = g.createLinearGradient(0, y0, 0, y1);      // her maker's plate
      gr.addColorStop(0, '#e2c27a'); gr.addColorStop(0.5, '#b08d4a'); gr.addColorStop(1, '#8a6a2a'); g.fillStyle = gr; g.fillRect(x0, y0, w, h);
      txt(`${name.toUpperCase()}  ·  built for comfort`, x0 + w / 2, y0 + h / 2 + 1, 15, '#3a2a14', SERIF, 'bold '); for (const x of [8, w - 8]) { g.fillStyle = '#6b5020'; g.beginPath(); g.arc(x0 + x, y0 + h / 2, 3, 0, 7); g.fill(); } }
    { const [x0, y0, x1, y1] = REG.tartan, w = x1 - x0, h = y1 - y0; g.fillStyle = '#7a2a26'; g.fillRect(x0, y0, w, h);      // a red tartan
      for (let i = 0; i < w; i += 16) { g.fillStyle = 'rgba(30,60,40,.55)'; g.fillRect(x0 + i, y0, 7, h); } for (let j = 0; j < h; j += 16) { g.fillStyle = 'rgba(30,60,40,.45)'; g.fillRect(x0, y0 + j, w, 7); }
      g.fillStyle = 'rgba(240,210,120,.6)'; for (let i = 11; i < w; i += 16) g.fillRect(x0 + i, y0, 1, h); for (let j = 11; j < h; j += 16) g.fillRect(x0, y0 + j, w, 1); }
    { const [x0, y0, x1, y1] = REG.tuft, w = x1 - x0, h = y1 - y0; g.fillStyle = '#3a7356'; g.fillRect(x0, y0, w, h);      // buttoned green leather
      g.strokeStyle = 'rgba(15,40,28,.5)'; g.lineWidth = 1.5; for (let i = -h; i < w; i += 16) { g.beginPath(); g.moveTo(x0 + i, y0); g.lineTo(x0 + i + h, y1); g.stroke(); g.beginPath(); g.moveTo(x0 + i + h, y0); g.lineTo(x0 + i, y1); g.stroke(); }
      g.fillStyle = 'rgba(255,255,255,.12)'; for (let i = 0; i < w; i += 16) for (let j = 0; j < h; j += 16) { g.beginPath(); g.ellipse(x0 + i + 8, y0 + j + 8, 6, 4, 0, 0, 7); g.fill(); }
      g.fillStyle = '#183a28'; for (let i = 0; i < w; i += 16) for (let j = 0; j <= h; j += 16) { g.beginPath(); g.arc(x0 + i, y0 + j, 1.8, 0, 7); g.fill(); } }
    { const [x0, y0, x1, y1] = REG.suitcase, w = x1 - x0, h = y1 - y0; g.fillStyle = '#9a6a3a'; g.fillRect(x0, y0, w, h); g.fillStyle = '#6b4424'; for (const x of [0.28, 0.72]) g.fillRect(x0 + w * x - 3, y0, 6, h);      // a well-travelled suitcase
      const sticker = (x, y, wd, ht, bg, fg, t, round) => { g.fillStyle = bg; g.beginPath(); round ? g.ellipse(x0 + x, y0 + y, wd / 2, ht / 2, 0, 0, 7) : g.rect(x0 + x - wd / 2, y0 + y - ht / 2, wd, ht); g.fill(); txt(t, x0 + x, y0 + y, 8, fg, FONT, 'bold '); };
      sticker(30, 20, 46, 18, '#2f4a40', '#efe6d0', 'VESPER ST.'); sticker(96, 44, 52, 22, '#efe6d0', '#a8361f', 'ANNA’S HOUSE', true); sticker(118, 16, 30, 22, '#f3b21b', '#1d1b1a', 'LINE 6', true); sticker(40, 48, 40, 16, '#a8361f', '#efe6d0', 'ELSEWHERE?'); }
    { const [x0, y0, x1, y1] = REG.side, w = x1 - x0, h = y1 - y0; g.fillStyle = YELLOW; g.fillRect(x0, y0, w, h); g.fillStyle = BLACK; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `bold ${h * 0.5}px ${FONT}`;
      const t = `${name.toUpperCase()}  ·  LINE ${DANDELION.line}`; if ('letterSpacing' in g) g.letterSpacing = '3px'; g.fillText(t, x0 + w / 2, y0 + h / 2 + 2); if ('letterSpacing' in g) g.letterSpacing = '0px'; }
    { const [x0, y0, x1, y1] = REG.six, w = x1 - x0, cx = x0 + w / 2, cy = y0 + w / 2; g.fillStyle = YELLOW; g.fillRect(x0, y0, w, x1 - x0);
      g.fillStyle = BLACK; g.beginPath(); g.arc(cx, cy, w * 0.47, 0, 7); g.fill(); g.fillStyle = '#f6efe0'; g.beginPath(); g.arc(cx, cy, w * 0.4, 0, 7); g.fill();
      g.fillStyle = BLACK; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `bold ${w * 0.58}px ${SERIF}`; g.fillText(String(DANDELION.line), cx, cy + w * 0.04); }
    { const [x0, y0, x1, y1] = REG.ticket, w = x1 - x0, h = y1 - y0; g.fillStyle = '#7a6236'; g.fillRect(x0, y0, w, h); g.fillStyle = '#10140f'; g.fillRect(x0 + 6, y0 + 6, w - 12, h - 12);
      g.fillStyle = '#9fe0a8'; g.shadowColor = '#7fd08a'; g.shadowBlur = 6; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `bold 15px ${FONT}`; g.fillText('FARE', x0 + w / 2, y0 + 26);
      g.font = `italic 19px ${SERIF}`; g.fillText('a nice', x0 + w / 2, y0 + 58); g.fillText('thought', x0 + w / 2, y0 + 80); g.font = `12px ${FONT}`; g.fillText('THANK YOU', x0 + w / 2, y0 + 108); g.shadowBlur = 0; }
    { const [x0, y0, x1, y1] = REG.stop, w = x1 - x0, cx = x0 + w / 2, cy = y0 + w / 2; g.fillStyle = '#b3201c'; g.fillRect(x0, y0, w, y1 - y0);
      g.strokeStyle = '#f6efe0'; g.lineWidth = 4; g.beginPath(); for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + i * Math.PI / 4; g.lineTo(cx + Math.cos(a) * w * 0.44, cy + Math.sin(a) * w * 0.44); } g.closePath(); g.stroke();
      g.fillStyle = '#f6efe0'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `bold ${w * 0.3}px ${FONT}`; g.fillText('STOP', cx, cy + 2); }
  }
  drawStatic(); drawFace(); drawBlind();

  // ---- the parts --------------------------------------------------------------------------------
  const list = [], C = new THREE.Color(), P = new THREE.Vector3(), N = new THREE.Vector3();
  const uvOf = r => [r[0] / S, 1 - r[3] / S, r[2] / S, 1 - r[1] / S];        // [u0, v0, u1, v1]
  const WHITE = (() => { const [u0, v0, u1, v1] = uvOf(REG.white); return [(u0 + u1) / 2, (v0 + v1) / 2]; })();
  // add(geometry, colour or (p, n) => colour, { region, part, pivot, glow, perFace })
  //   part: 1 propeller (spins about z), 2 stop arm (turns about y), 3 and 4 the door's leaves, 5 the left hand (bobs),
  //   6 the gangplank (slides out by pivot.x), 7 the steering wheel (turns about z), 8 the right hand (bobs, and waves about z)
  //   glow: 1 ring, 2 red lamps, 3 amber lamps, 4 head, tail and cabin lamps, 5 screens (glow with their picture),
  //   6 the cabin's own walls (a little light of their own, so the inside is not grey under a blue sky), 7 her face (a screen
  //   outside, clear glass from inside); may be (p, n) => group
  function add(geo, col, o = {}) {
    if (!geo.attributes.normal) geo.computeVertexNormals();
    const gq = geo.index ? geo.toNonIndexed() : geo, n = gq.attributes.position.count, pos = gq.attributes.position, nor = gq.attributes.normal, src = o.region ? gq.attributes.uv : null;
    const color = new Float32Array(n * 3), uv = new Float32Array(n * 2), rig = new Float32Array(n * 4), glow = new Float32Array(n);
    const reg = o.region ? uvOf(REG[o.region]) : null, pv = o.pivot ?? [0, 0, 0];
    let bb = null; if (src && o.fit) { bb = [Infinity, Infinity, -Infinity, -Infinity]; for (let i = 0; i < n; i++) { bb[0] = Math.min(bb[0], src.getX(i)); bb[1] = Math.min(bb[1], src.getY(i)); bb[2] = Math.max(bb[2], src.getX(i)); bb[3] = Math.max(bb[3], src.getY(i)); } }
    for (let i = 0; i < n; i++) {
      if (typeof col === 'function') {
        if (o.perFace || typeof o.glow === 'function') { const f = i - (i % 3); P.set(0, 0, 0); for (let k = 0; k < 3; k++) P.x += pos.getX(f + k) / 3, P.y += pos.getY(f + k) / 3, P.z += pos.getZ(f + k) / 3; N.fromBufferAttribute(nor, f); }
        else { P.fromBufferAttribute(pos, i); N.fromBufferAttribute(nor, i); }
        C.set(col(P, N));
      } else C.set(col);
      color[i * 3] = C.r; color[i * 3 + 1] = C.g; color[i * 3 + 2] = C.b;
      if (src) { let u = src.getX(i), v = src.getY(i); if (bb) { u = (u - bb[0]) / (bb[2] - bb[0]); v = (v - bb[1]) / (bb[3] - bb[1]); } if (o.flipU) u = 1 - u; uv[i * 2] = reg[0] + u * (reg[2] - reg[0]); uv[i * 2 + 1] = reg[1] + v * (reg[3] - reg[1]); }
      else { uv[i * 2] = WHITE[0]; uv[i * 2 + 1] = WHITE[1]; }
      rig[i * 4] = pv[0]; rig[i * 4 + 1] = pv[1]; rig[i * 4 + 2] = pv[2]; rig[i * 4 + 3] = o.part ?? 0; glow[i] = typeof o.glow === 'function' ? o.glow(P, N) : o.glow ?? 0;
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', pos.clone()); out.setAttribute('normal', nor.clone()); out.setAttribute('color', new THREE.BufferAttribute(color, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); out.setAttribute('aRig', new THREE.BufferAttribute(rig, 4)); out.setAttribute('aGlow', new THREE.BufferAttribute(glow, 1));
    list.push(out);
  }
  const T = (geo, { p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1] } = {}) => geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...s)));
  const box = (x0, x1, y0, y1, z0, z1) => new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0).translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  const cylX = (r, len, seg = 14) => new THREE.CylinderGeometry(r, r, len, seg).rotateZ(Math.PI / 2);
  const cylZ = (r, len, seg = 14) => new THREE.CylinderGeometry(r, r, len, seg).rotateX(Math.PI / 2);
  const cylY = (r, len, seg = 14) => new THREE.CylinderGeometry(r, r, len, seg);
  const tube = (a, b, r, seg = 4) => { const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), d = B.clone().sub(A), g2 = new THREE.CylinderGeometry(r, r, d.length(), seg, 1, true); g2.translate(0, d.length() / 2, 0); g2.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); return g2.translate(A.x, A.y, A.z); };
  // a box with rounded edges and corners, its normals worked out exactly
  function rbox(w, h, d, r, n = 8, k = 0.5) {
    const g2 = new THREE.BoxGeometry(2, 2, 2, n, n, n), p = g2.attributes.position, nn = g2.attributes.normal, half = [w / 2 - r, h / 2 - r, d / 2 - r], t = [0, 0, 0], q = [0, 0, 0], dir = [0, 0, 0];
    for (let i = 0; i < p.count; i++) {
      t[0] = p.getX(i); t[1] = p.getY(i); t[2] = p.getZ(i);
      for (let a = 0; a < 3; a++) { const s = Math.sign(t[a]), m = Math.abs(t[a]); q[a] = s * Math.min(1, m / k) * half[a]; dir[a] = m > k ? s * (m - k) / (1 - k) : 0; }
      const L = Math.hypot(...dir) || 1; p.setXYZ(i, q[0] + dir[0] / L * r, q[1] + dir[1] / L * r, q[2] + dir[2] / L * r); nn.setXYZ(i, dir[0] / L, dir[1] / L, dir[2] / L);
    }
    return g2;
  }

  // The chassis, under the cabin floor (y -1.3 .. 0)
  add(T(rbox(8.1, 1.4, 18.5, 0.55, 6), { p: [0, -0.68, -0.5] }), (p) => (p.y < -1.05 ? '#2a2826' : YELLOW));
  const worn = (a, b) => p => (Math.abs(p.x) < 0.75 ? a : b);      // a path worn paler down the aisle
  add(box(-3.82, 3.82, -0.06, 0.04, -9.45, 8.45), worn('#55614f', '#3d4a3c'), { glow: 6, perFace: true });   // the floor: green rubber
  for (let z = -9.2; z < 8.4; z += 0.7) add(box(-3.75, 3.75, 0.04, 0.06, z, z + 0.1), '#2e3a2c', { glow: 6 });   // ribbed
  add(new THREE.PlaneGeometry(1.4, 17.4).rotateX(-Math.PI / 2).translate(0, 0.064, -0.45), '#55614f', { glow: 6 });      // and worn smooth down the aisle
  add(box(-3.95, -3.55, 0.04, 0.075, 5.05, 7.75), YELLOW, { glow: 6 });      // the step edge at the door
  // The sides: one panel each, cut with round windows (and on the right, the doorway)
  const HOLE_Z = [-7.5, -4.6, -1.7, 1.2], HOLE_Y = 4.0, HOLE_R = 1.15;
  const sidePanel = (side, z0, z1, holes, ribbon = null) => {
    const sh = new THREE.Shape(); const rb = 0.35;
    sh.moveTo(z0, rb); sh.quadraticCurveTo(z0, 0, z0 + rb, 0); sh.lineTo(z1 - rb, 0); sh.quadraticCurveTo(z1, 0, z1, rb); sh.lineTo(z1, 6.3); sh.lineTo(z0, 6.3); sh.closePath();
    for (const hz of holes) { const h = new THREE.Path(); h.absarc(hz, HOLE_Y, HOLE_R, 0, Math.PI * 2, true); sh.holes.push(h); }
    if (ribbon) { const [za, zb, r] = ribbon, h = new THREE.Path(); h.moveTo(za, HOLE_Y - r); h.lineTo(zb, HOLE_Y - r); h.absarc(zb, HOLE_Y, r, -Math.PI / 2, Math.PI / 2, false); h.lineTo(za, HOLE_Y + r); h.absarc(za, HOLE_Y, r, Math.PI / 2, Math.PI * 1.5, false); sh.holes.push(h);
      for (const y of [HOLE_Y - r - 0.08, HOLE_Y + r + 0.08]) add(box(side * 4.0, side * 4.1, y - 0.07, y + 0.07, za, zb), BRASS);
      for (const [zc, rz] of [[za, -Math.PI / 2], [zb, Math.PI / 2]]) add(T(new THREE.TorusGeometry(r + 0.08, 0.07, 3, 10, Math.PI).rotateZ(rz).rotateY(Math.PI / 2), { p: [side * 4.05, HOLE_Y, zc] }), BRASS); }
    const g2 = new THREE.ExtrudeGeometry(sh, { depth: 0.18, bevelEnabled: false, curveSegments: 10 });
    g2.rotateY(-Math.PI / 2); g2.translate(side > 0 ? 4.0 : -3.82, 0, 0);
    add(g2, (p, nrm) => (nrm.x * side > 0.5 ? YELLOW : nrm.x * side < -0.5 ? CREAM : '#2e2a26'), { perFace: true, glow: (p, nrm) => (nrm.x * side > 0.5 ? 0 : 6) });
    for (const hz of holes) add(T(new THREE.TorusGeometry(HOLE_R + 0.04, 0.08, 2, 12), { p: [side * 4.04, HOLE_Y, hz], r: [0, Math.PI / 2, 0] }), BRASS);
  };
  sidePanel(1, -9.5, 8.5, [...HOLE_Z, 4.1, 6.9]);
  sidePanel(-1, -9.5, 5.0, [], [-8.1, 3.75, 1.12]); sidePanel(-1, 7.8, 8.5, []);      // the island side: one long window with round ends
  add(box(-4.0, -3.82, 6.0, 6.3, 5.0, 7.8), YELLOW);                                                              // over the doorway
  // black rub rails, and the lettering above the windows
  for (const y of [1.2, 2.0, 2.62]) { add(box(4.0, 4.1, y, y + 0.15, -9.4, 8.4), BLACK); add(box(-4.1, -4.0, y, y + 0.15, -9.4, 4.95), BLACK); add(box(-4.1, -4.0, y, y + 0.15, 7.85, 8.4), BLACK); }
  for (const side of [1, -1]) { const pl = new THREE.PlaneGeometry(5.6, 0.7); pl.rotateY(side * Math.PI / 2); pl.translate(side * 4.03, 5.72, -1.9); add(pl, '#ffffff', { region: 'side' }); add(box(side > 0 ? 4.0 : -4.1, side > 0 ? 4.1 : -4.0, 5.32, 5.38, -9.4, side > 0 ? 8.4 : 4.95), BLACK); }
  // the roof: a low barrel, lined inside
  { const shell = new THREE.CylinderGeometry(1, 1, 18.2, 18, 1, true, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2); add(T(shell.clone(), { p: [0, 6.3, -0.5], s: [4.05, 1.25, 1] }), (p, nrm) => (nrm.y < -0.2 ? CREAM : YELLOW));
    add(T(shell, { p: [0, 6.3, -0.5], s: [3.84, 1.1, 0.99] }), p => (Math.abs(p.x) > 3.2 ? '#cfc2a8' : Math.abs(p.x) > 2.2 ? '#e2d7c0' : CREAM), { glow: 6, perFace: true });      // darker into the corners
    for (const z of [-8, -5, -2, 1, 4, 7]) { add(T(new THREE.TorusGeometry(1, 0.035, 2, 10, Math.PI), { p: [0, 6.3, z], s: [3.8, 1.07, 1] }), '#cbb994', { glow: 6 }); if (z % 2) add(T(new THREE.TorusGeometry(1, 0.025, 2, 10, Math.PI), { p: [0, 6.3, z + 0.02], s: [4.08, 1.27, 1] }), '#d9a018'); }      // riveted ribs inside, seams outside
    for (const s2 of [-1, 1]) add(box(s2 > 0 ? 4.02 : -4.14, s2 > 0 ? 4.14 : -4.02, 6.24, 6.36, -9.6, 8.6), '#d9a018');      // rain gutters
    for (const z of [8.6, -9.6]) add(T(new THREE.CircleGeometry(1, 24, 0, Math.PI), { p: [0, 6.3, z], s: [4.05, 1.25, 1] }), YELLOW);
    for (const z of [8.44, -9.44]) add(T(new THREE.CircleGeometry(1, 24, 0, Math.PI), { p: [0, 6.29, z], s: [3.86, 1.12, 1] }), CREAM, { glow: 6 });      // the ends, inside
    for (const z of [-7.5, -4.5, -1.5, 1.5, 4.5]) add(T(new THREE.SphereGeometry(0.2, 8, 3, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), { p: [0, 7.38, z] }), '#ffe2a8', { glow: 4 });   // a row of little dome lamps
  }
  // the front: a wall with the face screen on it, the blind above, the bonnet and bumper below
  { const sh = new THREE.Shape(), w = 6.5, h = 2.75, r = 0.55; sh.moveTo(-w / 2 + r, 0); sh.lineTo(w / 2 - r, 0); sh.quadraticCurveTo(w / 2, 0, w / 2, r); sh.lineTo(w / 2, h - r); sh.quadraticCurveTo(w / 2, h, w / 2 - r, h); sh.lineTo(-w / 2 + r, h); sh.quadraticCurveTo(-w / 2, h, -w / 2, h - r); sh.lineTo(-w / 2, r); sh.quadraticCurveTo(-w / 2, 0, -w / 2 + r, 0);
    add(new THREE.ShapeGeometry(sh, 6).translate(0, 3.45, 8.7), '#ffffff', { region: 'face', glow: 7, fit: true });      // glow 7: her face outside, clear glass inside
    const wall = new THREE.Shape(); wall.moveTo(-4, 0); wall.lineTo(4, 0); wall.lineTo(4, 6.3); wall.lineTo(-4, 6.3); wall.closePath();
    const hole = new THREE.Path(sh.getPoints(6).map(p => new THREE.Vector2(p.x, p.y + 3.45))); wall.holes.push(hole);
    add(new THREE.ExtrudeGeometry(wall, { depth: 0.2, bevelEnabled: false }).translate(0, 0, 8.45), (p, nrm) => (nrm.z > 0.5 ? YELLOW : nrm.z < -0.5 ? CREAM : '#2e2a26'), { perFace: true, glow: (p, nrm) => (nrm.z < -0.5 ? 6 : 0) });
    add(T(new THREE.TorusGeometry(1, 0.022, 4, 40), { p: [0, 3.45 + h / 2, 8.68], s: [w / 2 + 0.08, h / 2 + 0.08, 1] }), '#8a6a2a'); }
  add(box(-2.65, 2.65, 6.35, 7.2, 8.66, 8.85), BLACK);
  add(new THREE.PlaneGeometry(4.9, 0.62).translate(0, 6.78, 8.86), '#ffffff', { region: 'blind', glow: 5 });
  const lamp = (x, y, z, dz, glow, col) => { add(T(cylZ(0.21, 0.2, 10), { p: [x, y, z + dz * 0.1] }), col, { glow }); add(T(new THREE.CylinderGeometry(0.27, 0.27, 0.32, 6, 1, true, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2), { p: [x, y + 0.03, z + dz * 0.16], r: [0, dz < 0 ? Math.PI : 0, 0] }), BLACK); };
  for (const s of [-1, 1]) { lamp(s * 3.08, 6.62, 8.66, 1, 3, '#ffb020'); lamp(s * 3.62, 6.5, 8.66, 1, 2, '#ff3a26'); lamp(s * 3.08, 6.62, -9.76, -1, 3, '#ffb020'); lamp(s * 3.62, 6.5, -9.76, -1, 2, '#ff3a26'); }
  add(T(rbox(6.1, 2.9, 3.5, 0.6, 6), { p: [0, 1.85, 10.25] }), YELLOW);                                               // the bonnet
  add(box(-1.55, 1.55, 0.85, 2.95, 11.9, 12.02), '#262422');                                                       // grille
  for (let x = -1.3; x <= 1.31; x += 0.52) add(box(x - 0.05, x + 0.05, 0.95, 2.85, 12.0, 12.07), SILVER);
  for (const s of [-1, 1]) { add(T(cylZ(0.42, 0.18, 12), { p: [s * 2.15, 2.15, 11.98] }), '#fff3d8', { glow: 4 }); add(T(new THREE.TorusGeometry(0.45, 0.07, 4, 14), { p: [s * 2.15, 2.15, 12.06] }), SILVER); }
  add(T(rbox(7.0, 0.65, 0.7, 0.2, 4), { p: [0, 0.55, 12.3] }), BLACK);
  // the back: the emergency door, a round window, the line's number, tail lamps, a bumper
  add(box(-4.0, 4.0, 0, 6.3, -9.75, -9.5), (p, nrm) => (nrm.z > 0.5 ? CREAM : YELLOW), { glow: (p, nrm) => (nrm.z > 0.5 ? 6 : 0) });
  for (const [x0, x1, y0, y1] of [[-1.5, -1.38, 0.6, 5.9], [1.38, 1.5, 0.6, 5.9], [-1.5, 1.5, 5.8, 5.92], [-1.5, 1.5, 0.6, 0.72]]) add(box(x0, x1, y0, y1, -9.8, -9.74), BLACK);
  add(T(new THREE.CircleGeometry(0.85, 18), { p: [0, 4.2, -9.79], r: [0, Math.PI, 0] }), GLASS); add(T(new THREE.TorusGeometry(0.88, 0.07, 5, 20), { p: [0, 4.2, -9.8] }), BRASS);
  add(T(new THREE.CircleGeometry(0.8, 24), { p: [-2.7, 2.4, -9.79], r: [0, Math.PI, 0] }), '#ffffff', { region: 'six', fit: true });
  for (const s of [-1, 1]) add(T(cylZ(0.3, 0.14, 12), { p: [s * 3.25, 1.25, -9.8] }), '#d42a1e', { glow: 4 });
  add(T(rbox(7.6, 0.6, 0.6, 0.2, 4), { p: [0, 0.45, -10.0] }), BLACK);
  // wheels, tucked up into the body; the brass cap underneath, and the ring of light
  for (const s of [-1, 1]) for (const z of [-6.4, 5.2]) { add(T(new THREE.TorusGeometry(0.92, 0.36, 5, 12), { p: [s * 3.72, -1.15, z], r: [0, Math.PI / 2, 0] }), '#232323'); add(T(cylX(0.55, 0.5, 12), { p: [s * 3.75, -1.15, z] }), SILVER); add(T(cylX(0.2, 0.62, 8), { p: [s * 3.75, -1.15, z] }), BRASS); }
  add(T(new THREE.SphereGeometry(2.3, 14, 4, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), { p: [0, -1.28, -0.5], s: [1, 0.42, 1.5] }), BRASS);
  add(T(new THREE.TorusGeometry(3.3, 0.17, 6, 32), { p: [0, -2.45, -0.5], r: [Math.PI / 2, 0, 0], s: [1, 1.5, 1] }), new THREE.Color(ring).getStyle(), { glow: 1 });
  // the door: two leaves that fold in
  for (const [z0, z1, part, pv] of [[5.04, 6.4, 3, 5.0], [6.4, 7.76, 4, 7.8]]) {
    const o = { part, pivot: [-4.0, 0, pv] }, x0 = -4.06, x1 = -3.96;
    for (const [a, b] of [[z0, z0 + 0.14], [z1 - 0.14, z1]]) add(box(x0, x1, 0.05, 6.0, a, b), YELLOW, o);
    for (const [y0, y1] of [[0.05, 0.75], [2.85, 3.15], [5.7, 6.0]]) add(box(x0, x1, y0, y1, z0, z1), YELLOW, o);
    for (const [y0, y1] of [[0.75, 2.85], [3.15, 5.7]]) add(box(x0 + 0.03, x1 - 0.03, y0, y1, z0 + 0.14, z1 - 0.14), GLASS, o);
    add(box(x0 - 0.05, x0, 2.9, 3.1, z0 + 0.3, z1 - 0.3), BLACK, o);
  }
  // the stop arm, on the left, folded flat until the bus stops
  { const o = { part: 2, pivot: [4.12, 2.25, 7.6] };
    add(box(4.1, 4.18, 2.18, 2.32, 6.4, 7.6), BLACK, o);
    for (const s of [1, -1]) add(T(new THREE.CircleGeometry(0.7, 8, Math.PI / 8), { p: [4.22 + s * 0.02, 2.25, 5.75], r: [0, s * Math.PI / 2, 0] }), '#ffffff', { ...o, region: 'stop', fit: true });
    add(T(cylX(0.71, 0.03, 8).rotateX(Math.PI / 8), { p: [4.22, 2.25, 5.75] }), '#b3201c', o); }
  // her own gangplank: it slides out from under the floor at the door, level with the floor, when the door opens
  { const o = { part: 6, pivot: [plank, 0, 0] }, x0 = -4.05 - plank, x1 = -3.95;
    add(box(x0, x1, -0.2, -0.1, 5.3, 7.5), '#8a6f55', o);      // (just under the floor, so that stowed it is out of sight)
    for (let x = x0 + 0.25; x < x1; x += 0.5) add(box(x - 0.04, x + 0.04, -0.1, -0.075, 5.32, 7.48), '#6b5440', o);      // cleats
    for (const z of [5.25, 7.55]) for (let x = x0; x < x1 - 0.1; x += 0.6) add(box(x, Math.min(x1, x + 0.3), -0.21, -0.075, z - 0.05, z + 0.05), (Math.round((x - x0) / 0.6) % 2) ? BLACK : YELLOW, o);
  }
  // mitten hands, either side of the face
  for (const s of [-1, 1]) { const o = { part: s < 0 ? 8 : 5, pivot: [s * 4.6, 2.9, 8.95] }; add(T(new THREE.SphereGeometry(0.42, 9, 6), { p: [s * 4.6, 3.4, 8.95], s: [0.72, 1.05, 0.6] }), '#f4eee2', o); add(T(new THREE.SphereGeometry(0.17, 7, 5), { p: [s * 4.6 - s * 0.32, 3.3, 9.0], s: [0.8, 1.4, 0.8], r: [0, 0, s * 0.7] }), '#f4eee2', o); }      // mittens with a clear thumb
  // the horn: a tuba's bell on the roof, pointing forward
  add(T(new THREE.LatheGeometry([[0.07, 0], [0.09, 1.0], [0.16, 1.5], [0.3, 1.85], [0.58, 2.05], [0.6, 2.12]].map(([r, y]) => new THREE.Vector2(r, y)), 10), { p: [2.2, 7.35, 4.0], r: [Math.PI / 2, 0, 0] }), BRASS);
  add(T(new THREE.TorusGeometry(0.3, 0.07, 5, 14), { p: [2.2, 7.35, 3.6] }), BRASS);
  // the propellers: brass, on struts from the back of the roof, in little cream nacelles
  for (const s of [-1, 1]) {
    const hub = [s * 7.3, 5.4, -9.35];
    add(tube([s * 4.0, 5.9, -6.6], [s * 7.0, 5.45, -7.9], 0.11, 6), BRASS); add(tube([s * 4.0, 3.6, -7.2], [s * 7.0, 5.2, -8.1], 0.08, 6), BRASS);
    add(T(new THREE.CapsuleGeometry(0.55, 1.3, 2, 10).rotateX(Math.PI / 2), { p: [s * 7.3, 5.4, -8.2] }), CREAM);
    add(T(new THREE.TorusGeometry(0.56, 0.06, 4, 14), { p: [s * 7.3, 5.4, -8.2] }), BRASS);
    const o = { part: 1, pivot: hub };
    add(T(new THREE.ConeGeometry(0.32, 0.6, 12).rotateX(-Math.PI / 2), { p: [hub[0], hub[1], hub[2] - 0.35] }), BRASS, o);
    for (let k = 0; k < 3; k++) { const a = k * Math.PI * 2 / 3; add(T(new THREE.BoxGeometry(0.34, 1.9, 0.05).translate(0, 1.05, 0).rotateY(0.35 * s), { p: hub, r: [0, 0, a] }), '#b8913f', o); }
  }
  // inside: panelled lower walls, a route map over the windows, hand-straps
  for (const [sd, z1] of [[1, 7.5], [-1, 4.95]]) {
    add(box(sd > 0 ? 3.7 : -3.82, sd > 0 ? 3.82 : -3.7, 0.05, 2.7, -9.4, z1), GREEN, { glow: 6 });
    add(box(sd > 0 ? 3.62 : -3.84, sd > 0 ? 3.84 : -3.62, 2.7, 2.8, -9.4, z1), BRASS);
    for (let z = -8.6; z < z1 - 0.3; z += 1.45) add(box(sd > 0 ? 3.66 : -3.71, sd > 0 ? 3.71 : -3.66, 0.1, 2.7, z - 0.05, z + 0.05), GREEN2, { glow: 6 });
    if (sd > 0) add(new THREE.PlaneGeometry(5.6, 0.62).rotateY(-Math.PI / 2).translate(3.79, 5.64, 1.3), '#ffffff', { region: 'map', glow: 6 });      // across the aisle from the window seat
    add(box(sd > 0 ? 3.78 : -3.8, sd > 0 ? 3.8 : -3.78, 5.24, 5.28, -9.4, sd > 0 ? 8.4 : 4.95), '#8a3a2a', { glow: 6 });      // a painted pinstripe
    add(box(sd > 0 ? 3.62 : -3.7, sd > 0 ? 3.7 : -3.62, 0.06, 0.24, -9.4, z1), '#a8884a');      // a worn brass kick rail
    for (const z of [-6.6, -3.0, 0.4, 3.0]) { add(box(sd * 0.95 - 0.03, sd * 0.95 + 0.03, 5.62, 6.12, z - 0.07, z + 0.07), '#3a2a20'); add(T(new THREE.TorusGeometry(0.14, 0.025, 3, 8), { p: [sd * 0.95, 5.5, z], r: [0, Math.PI / 2, 0] }), '#3a2a20'); }
  }
  for (const hz of [...HOLE_Z, 4.1, 6.9]) add(box(3.56, 3.82, 2.8, 2.86, hz - 0.85, hz + 0.85), '#d9cdb4', { glow: 6 });      // sills
  add(box(-3.82, -3.52, 2.78, 2.86, -9.0, 4.7), '#d9cdb4', { glow: 6 });
  // the luggage rack over the windows on the left, with a suitcase, a hat box and an umbrella
  for (const x of [2.95, 3.72]) add(tube([x, 6.05, -9.0], [x, 6.05, 3.6], 0.035, 4), SILVER);
  for (let z = -8.8; z < 3.6; z += 1.1) add(box(2.95, 3.72, 6.02, 6.05, z - 0.04, z + 0.04), SILVER);
  add(box(3.0, 3.66, 6.06, 6.5, -6.6, -5.0), '#ffffff', { region: 'suitcase' }); add(tube([3.0, 6.36, -6.0], [3.0, 6.36, -5.6], 0.03, 4), '#3a2a20');
  add(T(new THREE.CylinderGeometry(0.32, 0.32, 0.38, 10), { p: [3.32, 6.25, -3.9] }), '#d9a3a8'); add(T(new THREE.CylinderGeometry(0.33, 0.33, 0.06, 10), { p: [3.32, 6.43, -3.9] }), '#8a3a4a');
  add(tube([3.3, 6.12, -2.6], [3.3, 6.12, 0.2], 0.03, 4), '#2a2622'); add(T(new THREE.ConeGeometry(0.11, 1.6, 6).rotateX(Math.PI / 2), { p: [3.3, 6.13, -1.7] }), '#24382f'); add(T(new THREE.TorusGeometry(0.09, 0.022, 2, 6, Math.PI), { p: [3.3, 6.05, 0.25], r: [0, Math.PI / 2, 0] }), '#7a4a2a');
  // on the back wall: the notice, and a little photograph of the island
  add(new THREE.PlaneGeometry(1.25, 0.78).translate(-2.3, 5.05, -9.43), '#ffffff', { region: 'notice', glow: 6 });
  add(new THREE.PlaneGeometry(0.95, 0.6).translate(2.3, 5.0, -9.43), '#ffffff', { region: 'photo', glow: 6 }); add(box(1.78, 2.82, 4.66, 5.34, -9.46, -9.44), '#6b5020');
  // the green bench seats (buttoned), the brass rail, the ticket machine, the mirror
  for (const c of [-7.3, -4.4, -1.5, 1.4]) for (const s of [-1, 1]) {
    const xa = s * 0.95, xb = s * 3.75, lo = Math.min(xa, xb), hi = Math.max(xa, xb);
    add(box(lo, hi, 1.05, 1.5, c - 0.68, c + 0.68), '#ffffff', { region: 'tuft', glow: 6 });
    add(T(box(lo, hi, -0.85, 0.85, -0.15, 0.15), { p: [0, 2.3, c - 0.72], r: [-0.08, 0, 0] }), '#ffffff', { region: 'tuft', glow: 6 });      // lower than before: you can see back over them
    add(tube([lo + 0.02, 3.17, c - 0.79], [hi - 0.02, 3.17, c - 0.79], 0.15, 6), SILVER); add(box(lo + 0.08, hi - 0.08, 1.12, 3.0, c - 0.92, c - 0.88), GREEN2);      // a chrome-edged top, a seam down the back
    add(T(new THREE.TorusGeometry(0.12, 0.024, 2, 6, Math.PI), { p: [s * 1.12, 3.3, c - 0.79], r: [0, Math.PI / 2, 0] }), BRASS);      // the grab handle on the aisle corner
    add(tube([s * 1.0, 0, c - 0.4], [s * 1.0, 1.05, c - 0.4], 0.05, 4), SILVER); add(tube([s * 1.0, 0, c + 0.45], [s * 1.0, 1.05, c + 0.45], 0.05, 4), SILVER);
  }
  add(T(new THREE.SphereGeometry(0.16, 6, 4), { p: [2.7, 1.6, -1.25], s: [1.3, 0.55, 1] }), '#b8452e'); add(T(cylX(0.11, 0.14, 6), { p: [2.48, 1.58, -1.25] }), '#e9e0cc');      // a forgotten knitted mitten
  add(box(-2.8, -2.38, 1.5, 2.12, -4.5, -4.18), '#c9a87a'); add(T(box(-0.21, 0.21, 0, 0.1, -0.16, 0.16), { p: [-2.59, 2.12, -4.34], r: [0.25, 0, 0.1] }), '#b8956a');      // a paper bag
  for (const s of [-1, 1]) { add(tube([s * 0.95, 6.15, -9.3], [s * 0.95, 6.15, 7.9], 0.05, 6), BRASS); for (const z of [-5.85, -0.05, 3.6]) add(tube([s * 0.95, 0, z], [s * 0.95, 6.15, z], 0.045, 6), BRASS); }
  add(tube([-3.2, 0, 4.85], [-3.2, 6.1, 4.85], 0.05, 6), BRASS);
  add(box(-3.8, -2.55, 2.4, 5.2, 7.95, 8.45), '#8a6a3c'); add(box(-3.85, -2.5, 5.2, 5.35, 7.9, 8.45), BRASS);
  add(new THREE.PlaneGeometry(0.95, 0.95).rotateY(Math.PI).translate(-3.17, 4.35, 7.93), '#ffffff', { region: 'ticket', glow: 5 });
  add(box(-3.4, -2.95, 3.3, 3.42, 7.9, 7.96), '#1a1714');                                                          // the slot for the thought
  // the cab: a low dashboard right across, two dials, toggles, her maker's plate, a speaking tube, a little fan, a bud vase
  // with one dandelion in it, a thermos; the big wheel on its column (it turns a little by itself in flight); the empty
  // driver's seat with a folded tartan blanket and a peaked cap on it; a framed rear-view mirror in which her eyes look back
  add(T(rbox(6.0, 0.85, 0.85, 0.25, 4), { p: [0.8, 2.98, 8.02] }), '#5a4636', { glow: 6 });
  add(box(-2.1, 3.7, 0.05, 2.62, 7.72, 8.45), '#3f5a46', { glow: 6 }); add(box(-2.12, 3.72, 0.05, 0.25, 7.7, 8.45), '#a8884a');      // the dashboard stands on a panelled console down to the floor
  add(new THREE.PlaneGeometry(1.7, 0.21).rotateY(Math.PI).translate(-0.4, 3.0, 7.585), '#ffffff', { region: 'plate' });
  for (const x of [1.95, 2.95]) { add(new THREE.CircleGeometry(0.17, 10).rotateY(Math.PI).translate(x, 3.05, 7.585), '#efe4cf', { glow: 6 }); add(T(new THREE.TorusGeometry(0.18, 0.025, 2, 10), { p: [x, 3.05, 7.58] }), BRASS); add(T(new THREE.BoxGeometry(0.02, 0.13, 0.01).translate(0, 0.06, 0), { p: [x, 3.05, 7.57], r: [0, 0, x < 2.5 ? 0.7 : -0.4] }), '#a8361f'); }
  for (let i = 0; i < 5; i++) { const x = 0.75 + i * 0.16; add(box(x - 0.04, x + 0.04, 2.66, 2.74, 7.58, 7.6), '#2a2622'); add(T(new THREE.BoxGeometry(0.025, 0.1, 0.025).translate(0, 0.05, 0), { p: [x, 2.7, 7.57], r: [-0.6 + (i % 2) * 1.2, 0, 0] }), SILVER); }
  add(tube([-1.75, 3.4, 8.25], [-1.75, 5.3, 8.3], 0.035, 5), BRASS); add(T(new THREE.CylinderGeometry(0.13, 0.04, 0.26, 8, 1, true).rotateX(-Math.PI / 2), { p: [-1.75, 5.3, 8.15] }), BRASS);
  add(T(cylZ(0.05, 0.25, 6), { p: [-1.1, 3.55, 8.15] }), '#2a2622'); add(T(new THREE.TorusGeometry(0.22, 0.015, 2, 12), { p: [-1.1, 3.72, 8.02] }), SILVER); add(T(new THREE.CircleGeometry(0.2, 6), { p: [-1.1, 3.72, 8.04], r: [0, Math.PI, 0] }), BRASS);
  add(T(new THREE.LatheGeometry([[0.01, 0], [0.07, 0.02], [0.08, 0.12], [0.03, 0.28], [0.04, 0.32]].map(([r, y]) => new THREE.Vector2(r, y)), 6), { p: [0.15, 3.4, 8.12] }), '#8ab0a8');
  add(tube([0.15, 3.6, 8.12], [0.19, 3.95, 8.1], 0.012, 3), '#5f7f3a'); add(T(new THREE.SphereGeometry(0.08, 6, 4), { p: [0.19, 3.98, 8.1] }), '#f3c21b', { glow: 6 });
  add(T(new THREE.CylinderGeometry(0.09, 0.09, 0.48, 8), { p: [-0.5, 3.64, 8.15] }), '#2f4a40'); add(T(new THREE.CylinderGeometry(0.095, 0.095, 0.12, 8), { p: [-0.5, 3.94, 8.15] }), SILVER);
  { const o = { part: 7, pivot: [2.45, 4.15, 7.22] };
    add(T(new THREE.TorusGeometry(0.62, 0.03, 3, 18), { p: [2.45, 4.15, 7.22] }), '#2a2622', o);
    for (let k = 0; k < 3; k++) add(T(new THREE.BoxGeometry(0.035, 0.6, 0.02).translate(0, 0.3, 0), { p: [2.45, 4.15, 7.22], r: [0, 0, k * Math.PI * 2 / 3] }), SILVER, o); }
  add(tube([2.45, 3.0, 7.75], [2.45, 4.15, 7.25], 0.05, 5), '#2a2622');
  add(box(1.55, 3.4, 1.05, 1.5, 5.4, 6.7), '#ffffff', { region: 'tuft', glow: 6 }); add(T(box(1.55, 3.4, -0.85, 0.85, -0.13, 0.13), { p: [0, 2.35, 5.3], r: [-0.08, 0, 0] }), '#ffffff', { region: 'tuft', glow: 6 });
  add(box(1.9, 3.0, 1.5, 1.68, 5.75, 6.5), '#ffffff', { region: 'tartan' });
  add(T(new THREE.CylinderGeometry(0.2, 0.22, 0.15, 10), { p: [2.6, 1.76, 6.15] }), '#24304a'); add(T(new THREE.CylinderGeometry(0.225, 0.225, 0.04, 10), { p: [2.6, 1.7, 6.15] }), BRASS); add(T(new THREE.CircleGeometry(0.22, 6, 0, Math.PI), { p: [2.6, 1.69, 6.32], r: [-Math.PI / 2 + 0.2, 0, 0], s: [1, 0.7, 1] }), '#1a1a22');
  add(new THREE.PlaneGeometry(1.6, 0.62).rotateY(Math.PI).translate(0, 5.95, 8.33), '#ffffff', { region: 'mirror', glow: 5 });
  for (const [x0, x1, y0, y1] of [[-0.86, 0.86, 6.25, 6.32], [-0.86, 0.86, 5.58, 5.65], [-0.86, -0.8, 5.58, 6.32], [0.8, 0.86, 5.58, 6.32]]) add(box(x0, x1, y0, y1, 8.3, 8.36), BRASS);
  add(tube([0, 6.32, 8.36], [0, 6.62, 8.4], 0.04, 4), BRASS);
  // the envelope: cream gores, ribs, a rope net over its lower half, and the ropes down to the roof
  const EC = [0, 18.5, -1], ER = [8.5, 7.5, 21];
  const gore = (p) => { const a = Math.atan2(p.y - EC[1], p.x); return Math.floor((a + Math.PI) / (Math.PI / 6)) % 2 ? '#efe6d2' : '#e5d8bd'; };
  add(T(new THREE.SphereGeometry(1, 20, 12).rotateX(Math.PI / 2), { p: EC, s: ER }), gore, { perFace: true });
  add(T(new THREE.SphereGeometry(0.9, 10, 6), { p: [0, EC[1], EC[2] + ER[2] - 0.3] }), BRASS);
  add(T(new THREE.SphereGeometry(0.55, 8, 5), { p: [0, EC[1], EC[2] - ER[2] + 0.2] }), BRASS);
  const sAt = z => Math.sqrt(Math.max(0, 1 - ((z - EC[2]) / ER[2]) ** 2));
  for (const z of [-12, 1, 13]) add(T(new THREE.TorusGeometry(1, 0.022, 3, 24), { p: [0, EC[1], z], s: [ER[0] * sAt(z) * 1.004, ER[1] * sAt(z) * 1.004, 1] }), '#d6c8aa');
  const surf = (phi, z, out = 0.07) => { const s = sAt(z); return new THREE.Vector3(Math.sin(phi) * (ER[0] * s + out), EC[1] - Math.cos(phi) * (ER[1] * s + out), z); };
  { const pos = []; const strand = (phi0, slope) => {
      let prev = null;
      for (let i = 0; i <= 14; i++) {
        const z = -15 + i * 2.05, phi = phi0 + slope * (z + 1), cur = Math.abs(phi) < 1.75 ? surf(phi, z) : null;
        if (prev && cur) { const d = cur.clone().sub(prev), nrm = new THREE.Vector3(cur.x / ER[0] ** 2, (cur.y - EC[1]) / ER[1] ** 2, (cur.z - EC[2]) / ER[2] ** 2).normalize(), w = d.clone().cross(nrm).normalize().multiplyScalar(0.07);
          pos.push(...prev.clone().add(w).toArray(), ...prev.clone().sub(w).toArray(), ...cur.clone().add(w).toArray(), ...cur.clone().add(w).toArray(), ...prev.clone().sub(w).toArray(), ...cur.clone().sub(w).toArray()); }
        prev = cur;
      }
    };
    for (let k = -5; k <= 5; k++) { strand(k * 0.48, 0.075); strand(k * 0.48, -0.075); }
    const ng = new THREE.BufferGeometry(); ng.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); ng.computeVertexNormals(); add(ng, ROPE);
  }
  for (const s of [-1, 1]) for (const z of [-8.5, -4.5, -0.5, 3.5, 7.0]) { const top = surf(s * 1.0, z, 0.05); add(tube(top.toArray(), [s * 3.7, 6.95, z * 0.95], 0.045, 4), ROPE); }
  // fins at the tail, school-bus yellow with black tips
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2, rr = z => (k % 2 ? ER[0] : ER[1]) * sAt(z), sh = new THREE.Shape();
    sh.moveTo(-11.5, rr(-11.5) - 0.6); sh.lineTo(-18.6, rr(-18.6) + 5.0); sh.lineTo(-22.9, rr(-18.6) + 5.0); sh.lineTo(-21.6, Math.max(0.4, rr(-21.6) - 0.3)); sh.closePath();
    const fg = new THREE.ExtrudeGeometry(sh, { depth: 0.24, bevelEnabled: false });
    fg.applyMatrix4(new THREE.Matrix4().set(0, 0, 1, -0.12, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1));
    const tip = box(-0.15, 0.15, rr(-18.6) + 4.2, rr(-18.6) + 5.05, -22.9, -18.6);
    for (const [geo, col] of [[fg, YELLOW], [tip, BLACK]]) { geo.rotateZ(-a); geo.translate(0, EC[1], 0); add(geo, col); }
  }
  // a big painted number on each side of the envelope, for being seen from a long way off
  for (const s of [-1, 1]) add(new THREE.CircleGeometry(2.4, 20).rotateY(s * Math.PI / 2).translate(s * (ER[0] + 0.06), EC[1] + 0.3, EC[2] + 4), '#ffffff', { region: 'six', fit: true });

  // ---- one mesh, one material -------------------------------------------------------------------
  const geo = mergeGeometries(list, false); for (const l of list) l.dispose();
  geo.computeBoundingSphere();
  const u = { uProp: { value: 0 }, uArm: { value: 0 }, uDoor: { value: 0 }, uHand: { value: 0 }, uPlank: { value: 0 }, uSteer: { value: 0 }, uWave: { value: 0 }, uRing: { value: 1.2 }, uRed: { value: 0 }, uAmber: { value: 0 }, uLamp: { value: 0.3 }, uScreen: { value: 1.3 }, uFill: { value: 0.3 } };
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, map: tex, roughness: 0.45, metalness: 0.1, envMapIntensity: 0.8, side: THREE.DoubleSide });
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
attribute vec4 aRig; attribute float aGlow; varying float vGlow;
uniform float uProp, uArm, uDoor, uHand, uPlank, uSteer, uWave;
mat3 rY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
mat3 rZ(float a) { float c = cos(a), s = sin(a); return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0); }`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
mat3 rigR = mat3(1.0); float part = aRig.w;
if (part > 0.5 && part < 1.5) rigR = rZ(uProp * sign(aRig.x));
else if (part > 1.5 && part < 2.5) rigR = rY(uArm);
else if (part > 2.5 && part < 3.5) rigR = rY(uDoor);
else if (part > 3.5 && part < 4.5) rigR = rY(-uDoor);
else if (part > 6.5 && part < 7.5) rigR = rZ(uSteer);
else if (part > 7.5 && part < 8.5) rigR = rZ(uWave);
objectNormal = rigR * objectNormal;
vGlow = aGlow;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
transformed = rigR * (transformed - aRig.xyz) + aRig.xyz;
if ((part > 4.5 && part < 5.5) || part > 7.5) transformed.y += uHand;
if (part > 5.5 && part < 6.5) { transformed.x += (1.0 - uPlank) * aRig.x; transformed.y += uPlank * 0.13; }      // out, and up flush with the ground`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vGlow;\nuniform float uRing, uRed, uAmber, uLamp, uScreen, uFill;')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
if (vGlow > 6.5) {      // her face: a screen from outside; from inside, clear glass with the faintest of her eyes in it
  if (gl_FrontFacing) { totalEmissiveRadiance += diffuseColor.rgb * uScreen; diffuseColor.rgb *= 0.08; }
  else { if (max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b)) < 0.45 || mod(floor(gl_FragCoord.x) + floor(gl_FragCoord.y), 3.0) > 0.5) discard; totalEmissiveRadiance += diffuseColor.rgb * 0.08 * uScreen; diffuseColor.rgb *= 0.0; }
} else if (vGlow > 0.5) {
  if (vGlow > 5.5) totalEmissiveRadiance += diffuseColor.rgb * uFill;
  else if (vGlow > 4.5) { totalEmissiveRadiance += diffuseColor.rgb * uScreen; diffuseColor.rgb *= 0.08; }
  else { float k = vGlow < 1.5 ? uRing : vGlow < 2.5 ? uRed : vGlow < 3.5 ? uAmber : uLamp; totalEmissiveRadiance += diffuseColor.rgb * k; }
}`);
  };
  mat.customProgramCacheKey = () => 'dandelion3';
  const mesh = new THREE.Mesh(geo, mat); mesh.castShadow = false; mesh.receiveShadow = false; mesh.name = 'airship'; mesh.userData.cat = 'airship';
  const root = new THREE.Group(); root.name = 'airship'; root.add(mesh);

  // ---- what it does -----------------------------------------------------------------------------
  let flashing = false, nextBlink = 2, blinkT = 0, door = 0, arm = 0, waveT = 0, lastYaw = null, steer = 0;
  const api = {
    root, mesh, material: mat, uniforms: u, tex,
    seat: new THREE.Vector3(-3.3, 3.95, 1.75),       // the passenger's eye: right-hand front seat, at the window end of the long window
    door: new THREE.Vector3(-3.7 - plank, 0, 6.4),   // the far end of her gangplank, where you step aboard
    length: 45, triangles: geo.attributes.position.count / 3,
    setDoor(v) { door = v; u.uDoor.value = 1.35 * v; const k = Math.min(1, Math.max(0, (v - 0.25) / 0.75)); u.uPlank.value = k * k * (3 - 2 * k); },      // the gangplank follows the door out
    setArm(v) { arm = v; u.uArm.value = -1.5 * v; },
    flash(on) { flashing = on; },
    wave() { waveT = 1.8; },      // the right mitten gives a little wave
    setBlind(text) { if (text === blindText) return; blindText = text; drawBlind(); tex.needsUpdate = true; },
    setFace(e) { expr = e; if (drawFace()) tex.needsUpdate = true; },
    look(v) { look = Math.max(-1, Math.min(1, v)); if (drawFace()) tex.needsUpdate = true; },
    get doorOpen() { return door; }, get armOut() { return arm; },
    update(t, dt, { light = 1, exposure = 1 } = {}) {
      u.uProp.value += dt * 9;
      u.uHand.value = 0.12 * Math.sin(t * 1.7);
      if (waveT > 0) { waveT -= dt; u.uWave.value = 0.5 * Math.sin(t * 11) * Math.min(1, waveT * 2); } else u.uWave.value = 0;
      const yaw = root.rotation.y; if (lastYaw !== null && dt > 0) { const d = Math.atan2(Math.sin(yaw - lastYaw), Math.cos(yaw - lastYaw)) / dt; steer += (THREE.MathUtils.clamp(d * 2.5, -0.9, 0.9) - steer) * Math.min(1, dt * 2); } lastYaw = yaw; u.uSteer.value = steer;
      const ph = Math.floor(t * 2.2) % 2;
      u.uRed.value = flashing && ph ? 3.2 : 0; u.uAmber.value = flashing && !ph ? 3.0 : 0;
      const dark = 1 - light;
      u.uRing.value = 1.0 + 1.4 * dark; u.uLamp.value = 0.25 + 1.8 * dark; u.uFill.value = 0.22 + 0.25 * dark;
      u.uScreen.value = 1.25 * Math.min(1, 1.7 / exposure);
      nextBlink -= dt; if (nextBlink <= 0) { blink = true; blinkT = 0.13; nextBlink = 2.5 + Math.random() * 3.5; if (drawFace()) tex.needsUpdate = true; }
      if (blink) { blinkT -= dt; if (blinkT <= 0) { blink = false; if (drawFace()) tex.needsUpdate = true; } }
    },
    dispose() { geo.dispose(); mat.dispose(); tex.dispose(); root.removeFromParent(); },
  };
  return api;
}
