// The face: a small glowing screen, drawn on a canvas, and the life in it. One canvas per robot, redrawn only
// when something visible has changed (to the nearest step), so a face costs nothing while it holds still.
//
//   makeFace(spec) -> { draw, mat, canvas }        (put mat on the screen geometry: face.mesh = mesh(geo, face.mat))
//     spec   eye (colour), gap (between the eyes, px of 256), eyeW, eyeH, eyeR (corner radius; small for square
//            eyes), bg; and any of lashes, brows (tilt, -1..1), moustache (colour), freckles (colour), specs
//            (colour), monocle, blush (colour); round: cut the canvas's corners away to that radius (needs UVs that
//            span the screen; the material then alpha-tests); mouth: 'slot' for the lab's speaking mouth (a
//            rounded slot) instead of an oval; overlay(g, expr, lx, rx, y, blink, look): draw
//            something of the robot's own over the top (a raised brow, lashes), with the eyes' centres given.
//   draw(expr, look, blink, o)
//     expr   neutral happy sass wink love focus surprised sleepy blink
//     look   -1..1 where the eyes look across the face
//     blink  true / false, or how far shut (0..1: the lids come down rather than snapping to a line)
//     o      { ly: -1..1 down (+) at the work or up (-) at a high shelf, mouth: 0..1 how open (it moves while
//            the robot speaks) }.  The lab's older order draw(expr, look, blink, mouth, lookY) with lookY + up
//            is understood too.
//
//   makeFaceLife(id, now) -> life                   the face's own rhythm, after Vesper Street's clerks
//     life.step(now, dt, { w, eye, work, moveLook }) -> { shut, lx, ly }   every frame, then face.draw(expr, lx, shut, { ly, mouth })
//       w, eye   from attendVisitor (robokit/attend.js): how much it is attending to her, and where its eyes go
//       work     null, or where the eyes go at the work (-1..1 down): it looks at what its hands are doing
//       moveLook null, or -1..1: where it is going, while it moves (the eyes lead the turn)
//     Each robot blinks in its own rhythm (from its id: some often, some seldom, some twice), the lids easing
//     down and up; every few seconds it glances somewhere (across and up or down) and back; with her near, the
//     eyes are hers.
//   talkMouth(t) -> 0..1   a mouth moving with speech, for o.mouth while a line is being said

import { THREE } from './parts.js';

export function makeFace(spec) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d'), tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  let last = '';
  function draw(expr = 'neutral', look = 0, blink = false, o = {}, lookY = 0) {
    if (typeof o === 'number') o = { mouth: o, ly: -lookY };                                  // (the lab's order: mouth, then up-and-down with + up)
    const shut = blink === true ? 1 : blink === false ? 0 : Math.round(Math.max(0, Math.min(1, blink)) * 4) / 4, ly = Math.round((o.ly ?? 0) * 3) / 3, mo = Math.round((o.mouth ?? 0) * 3) / 3;
    const key = `${expr}|${Math.round(look * 5)}|${shut}|${ly}|${mo}`; if (key === last) return; last = key;
    blink = shut >= 1;
    const bgc = spec.bg ?? '#0b0809', gr = g.createRadialGradient(128, 40, 10, 128, 64, 150);
    gr.addColorStop(0, '#2a1f26'); gr.addColorStop(0.5, bgc); gr.addColorStop(1, '#050304');
    if (spec.round) { g.clearRect(0, 0, 256, 128); g.fillStyle = gr; g.beginPath(); g.roundRect(1, 1, 254, 126, spec.round); g.fill(); }      // (a screen with its corners cut away)
    else { g.fillStyle = gr; g.fillRect(0, 0, 256, 128); }
    const col = spec.eye, lx = 128 - spec.gap + look * 16, rx = 128 + spec.gap + look * 16, y = 56 + ly * 9;
    g.strokeStyle = g.fillStyle = col; g.lineCap = 'round'; g.lineJoin = 'round'; g.shadowColor = col; g.shadowBlur = 14;
    // the eyes drawn as rounded rectangles, the lids part way down when shut is between 0 and 1
    const rr = (x, yy, w, h, r) => { if (shut > 0 && shut < 1) { const h2 = Math.max(4, h * (1 - shut)); yy += (h - h2) / 2; h = h2; r = Math.min(r, h / 2); } g.beginPath(); g.roundRect(x - w / 2, yy - h / 2, w, h, r); g.fill(); };
    const arc = (x, yy, w, up = true) => { g.lineWidth = 9; g.beginPath(); up ? g.arc(x, yy + 8, w, Math.PI * 1.15, Math.PI * 1.85) : g.arc(x, yy - 10, w, Math.PI * 0.15, Math.PI * 0.85); g.stroke(); };
    const heart = (x, yy, s) => { g.beginPath(); g.moveTo(x, yy + s * 0.9); g.bezierCurveTo(x - s * 1.4, yy - s * 0.1, x - s * 0.7, yy - s * 1.2, x, yy - s * 0.4); g.bezierCurveTo(x + s * 0.7, yy - s * 1.2, x + s * 1.4, yy - s * 0.1, x, yy + s * 0.9); g.fill(); };
    const ew = spec.eyeW, eh = spec.eyeH;
    const er = spec.eyeR ?? ew * 0.42;      // corner radius: small for square eyes, large for round
    if (blink || expr === 'blink') { g.lineWidth = 7; for (const x of [lx, rx]) { g.beginPath(); g.moveTo(x - ew / 2, y + 6); g.lineTo(x + ew / 2, y + 6); g.stroke(); } }
    else if (expr === 'happy') { arc(lx, y, ew * 0.62); arc(rx, y, ew * 0.62); }
    else if (expr === 'love') { heart(lx, y, ew * 0.55); heart(rx, y, ew * 0.55); }
    else if (expr === 'sleepy') { g.lineWidth = 7; for (const x of [lx, rx]) { g.beginPath(); g.arc(x, y - 4, ew * 0.45, Math.PI * 0.2, Math.PI * 0.8); g.stroke(); } }
    else if (expr === 'focus') { rr(lx, y, ew * 1.1, eh * 0.32, 6); rr(rx, y, ew * 1.1, eh * 0.32, 6); }
    else if (expr === 'surprised') { g.lineWidth = 7; for (const x of [lx, rx]) { g.beginPath(); g.arc(x, y, ew * 0.48, 0, 7); g.stroke(); } }
    else if (expr === 'wink') { rr(lx, y, ew, eh, ew * 0.42); arc(rx, y, ew * 0.6, false); }
    else if (expr === 'sass') {
      // half-lidded, one brow up: unimpressed, adoring
      for (const [x, h] of [[lx, 0.55], [rx, 0.62]]) rr(x, y + eh * (1 - h) / 2 + 4, ew, eh * h, ew * 0.3);
      g.lineWidth = 6;
      for (const [x, dy] of [[lx, eh * 0.62 - eh * 0.55 / 2 - 6], [rx, eh * 0.62 - eh * 0.62 / 2 - 8]]) { g.beginPath(); g.moveTo(x - ew * 0.62, y - dy + 10); g.lineTo(x + ew * 0.62, y - dy + 10); g.stroke(); }
      g.beginPath(); g.moveTo(rx - ew * 0.5, y - eh * 0.55); g.quadraticCurveTo(rx + 2, y - eh * 0.95, rx + ew * 0.6, y - eh * 0.62); g.stroke();
    } else { rr(lx, y, ew, eh, er); rr(rx, y, ew, eh, er); }
    // mouth: open and moving while it speaks, else after the expression
    g.lineWidth = 5;
    if (mo > 0 && spec.mouth === 'slot') { const mx = 128 + look * 10, my = y + (spec.moustache ? 46 : 30), w = expr === 'happy' || expr === 'love' ? 30 : 22, h = 4 + mo * 16; g.beginPath(); g.roundRect(mx - w / 2, my - h / 2 + (expr === 'happy' ? 2 : 0), w, h, Math.min(h / 2, 8)); g.fill(); }      // (the lab's: a rounded slot, wider for a happy face, under the moustache)
    else if (mo > 0) { const mx = 128 + look * 10, my = y + 30 + (expr === 'sass' ? 4 : 0), mw = 9 + 3 * mo, mh = 3 + 9 * mo; g.beginPath(); g.ellipse(mx, my, mw, mh, 0, 0, 7); g.fill(); }
    else if (['happy', 'love', 'wink'].includes(expr)) { g.beginPath(); g.arc(128 + look * 10, y + 22, 13, Math.PI * 0.2, Math.PI * 0.8); g.stroke(); }
    else if (expr === 'sass') { g.beginPath(); g.moveTo(118 + look * 10, y + 38); g.quadraticCurveTo(134, y + 41, 146 + look * 10, y + 32); g.stroke(); }
    else if (expr === 'surprised') { g.beginPath(); g.arc(128, y + 38, 6, 0, 7); g.stroke(); }
    g.shadowBlur = 0;
    if (spec.lashes && !blink) { g.strokeStyle = col; g.lineWidth = 4; for (const [x, s] of [[lx, -1], [rx, 1]]) for (const k of [0, 1, 2]) { g.beginPath(); g.moveTo(x + s * (ew * 0.3 + k * 5), y - eh * 0.42 + k * 4); g.lineTo(x + s * (ew * 0.5 + k * 7), y - eh * 0.62 + k * 7); g.stroke(); } }
    if (spec.brows) { g.strokeStyle = col; g.lineWidth = 7; for (const [x, s] of [[lx, 1], [rx, -1]]) { g.beginPath(); g.moveTo(x - ew * 0.6, y - eh * 0.72 - s * spec.brows * 6); g.lineTo(x + ew * 0.6, y - eh * 0.72 + s * spec.brows * 6); g.stroke(); } }
    if (spec.moustache) { g.fillStyle = spec.moustache; const mx = 128 + look * 10, my = y + 34 + (spec.mouth === 'slot' ? mo * 6 : 0); g.beginPath(); g.moveTo(mx, my - 4); g.bezierCurveTo(mx - 14, my - 14, mx - 34, my - 2, mx - 44, my - 12); g.bezierCurveTo(mx - 36, my + 10, mx - 14, my + 8, mx, my + 2); g.bezierCurveTo(mx + 14, my + 8, mx + 36, my + 10, mx + 44, my - 12); g.bezierCurveTo(mx + 34, my - 2, mx + 14, my - 14, mx, my - 4); g.fill(); }
    if (spec.freckles) { g.fillStyle = spec.freckles; for (const [dx, dy] of [[-10, 26], [-2, 32], [6, 25], [14, 31]]) for (const x of [lx - 6, rx - 6]) { g.beginPath(); g.arc(x + dx, y + dy, 2.2, 0, 7); g.fill(); } }
    if (spec.specs) { g.strokeStyle = spec.specs; g.lineWidth = 3.5; for (const x of (spec.monocle ? [rx] : [lx, rx])) { g.beginPath(); g.arc(x, y, Math.max(ew, eh) * 0.62 + 8, 0, 7); g.stroke(); } if (spec.monocle) { g.lineWidth = 2; g.beginPath(); g.moveTo(rx + 20, y + 22); g.quadraticCurveTo(rx + 34, y + 50, rx + 22, y + 70); g.stroke(); } else { g.beginPath(); g.moveTo(lx + Math.max(ew, eh) * 0.62 + 8, y - 4); g.quadraticCurveTo(128 + look * 14, y - 14, rx - Math.max(ew, eh) * 0.62 - 8, y - 4); g.stroke(); } }
    if (spec.blush) { g.fillStyle = spec.blush; for (const x of [lx - 8, rx + 8]) { g.beginPath(); g.ellipse(x, y + 30, 15, 7, 0, 0, 7); g.fill(); } }
    if (spec.overlay) { g.save(); g.strokeStyle = g.fillStyle = col; g.lineCap = 'round'; g.shadowColor = col; g.shadowBlur = 8; spec.overlay(g, expr, lx, rx, y, blink, look); g.restore(); }
    tex.needsUpdate = true;
  }
  draw();
  const mat = new THREE.MeshStandardMaterial({ color: 0x060405, roughness: 0.16, metalness: 0, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 1.25, envMapIntensity: 1.1 });
  if (spec.round) { mat.map = tex; mat.alphaTest = 0.5; }
  return { draw, mat, canvas: c };
}

export function makeFaceLife(id = 'x', now = 0) {
  const h = [...String(id)].reduce((a, c) => a * 31 + c.charCodeAt(0), 7) >>> 0;
  const L = { gap: 2.6 + (h % 37) / 37 * 3.4, twice: 0.1 + (h % 7) / 7 * 0.3, at: now + Math.random() * 3, t: -1, n: 1, gl: { x: 0, y: 0, until: 0, next: now + 3 }, ly: 0, out: { shut: 0, lx: 0, ly: 0 } };
  L.step = (now, dt, o = {}) => {
    const w = o.w ?? 0, work = o.work ?? null;
    if (L.t < 0 && now > L.at) { L.t = 0; L.n = Math.random() < L.twice ? 2 : 1; }
    let shut = 0;
    if (L.t >= 0) {
      L.t += dt; const len = L.n === 2 ? 0.44 : 0.17, q = L.t / len, bump = x => (x > 0 && x < 1 ? 1 - Math.abs(2 * x - 1) : 0);
      shut = L.n === 2 ? Math.max(bump(q / 0.4), bump((q - 0.6) / 0.4)) : bump(q);
      if (q >= 1) { L.t = -1; L.at = now + L.gap * (0.6 + Math.random() * 0.8); }
    }
    const gl = L.gl; if (now > gl.next) { gl.until = now + 0.7 + Math.random() * 1.4; gl.next = gl.until + 3 + Math.random() * 6; gl.x = (Math.random() - 0.5) * 1.4; gl.y = (Math.random() - 0.5) * 0.8; }
    const glancing = now < gl.until && work === null && w < 0.3;
    let lx = w > 0.05 ? (o.eye ?? 0) : glancing ? gl.x : 0;
    const ly = w > 0.5 ? 0 : work !== null ? work : glancing ? gl.y : 0;
    if (o.moveLook != null && w < 0.5) lx = Math.max(-1, Math.min(1, o.moveLook));
    L.ly += (ly - L.ly) * Math.min(1, dt * 6);
    L.out.shut = shut; L.out.lx = lx; L.out.ly = L.ly; L.glancing = glancing;
    return L.out;
  };
  return L;
}
export const talkMouth = t => 0.35 + 0.65 * Math.abs(Math.sin(t * 9)) * (0.6 + 0.4 * Math.sin(t * 2.3));
