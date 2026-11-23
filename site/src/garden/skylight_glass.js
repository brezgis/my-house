// The glass of the skylight: one round window that is seen from above in the garden of Anna's House (a ring of
// stones in the grass by the front birches) and from below in the chapel of Anna's Basement (the oculus over the
// table), and that colours the rim of the disc of light on the chapel's floor.
//
// THE SAME FILE IS IN BOTH PLACES: my_house/site/src/garden/skylight_glass.js and
// basement_spa/site/src/furnish/skylight_glass.js. Change one, copy it to the other.
//
// After F. G. Varela, H. R. Maturana and R. Uribe, "Autopoiesis: the organization of living systems, its
// characterization and a model", BioSystems 5 (1974), 187-196. Their model is a small world of three things, drawn in
// the paper with three marks, kept here: a catalyst (a star), substrate (small circles) and links (squares). Three
// things happen in it. A catalyst makes a link out of two substrates. Links bond to one another into a chain, which
// closes into a membrane round the catalyst that made them. And links decay back into substrate, so the membrane
// tears; but substrate passes through it, the catalyst inside goes on making links, and they drift out and mend the
// tear. Nothing in it is told to be a cell. It is a ring that keeps making itself.
//
// The window is that ring. The middle is left clear (the eye: sky from below, the chapel's candle from above), because
// the inside of the membrane is the one part of the picture that is not a thing: it is what the making is for.
// Round the eye, from the inside out: a gold fillet; the living interior in sea-greens, with the catalyst in it and a
// link just made beside it; the membrane, a closed chain of amber links, with one gap that a new link is about to
// close and one link cracking back into substrate; the world outside in deep blues, substrate drifting in through it;
// and a border of small ruby and gold quarries. Dark leading throughout, as the chapel's other windows.
//
//   drawSkylightGlass(size = 1024) -> canvas      the glass, transparent in the eye and outside the rim; the rim is at
//                                                 the canvas's edge (radius size / 2), the eye EYE of that
//   EYE                                           the eye's radius as a part of the whole (0.6)
//   CAPTION                                       { title, kicker, text, foot } for whoever shows a card or a line

export const EYE = 0.6;
export const CAPTION = {
  title: 'Autopoiesis',
  kicker: 'F. G. Varela, H. R. Maturana and R. Uribe, BioSystems, 1974',
  text: 'A catalyst (the star) turns substrate (the small green circles) into links (the amber squares). The links bond into a chain, and the chain closes round the catalyst that made them: a membrane. Links decay, and the membrane tears; new ones drift out from inside and mend it.\nNothing here was told to be a cell. It is a ring that keeps making itself. The middle is left clear on purpose.',
  foot: 'The same glass lies in the grass by the front birches at Anna\'s House, over the chapel in her basement.',
};

const TAU = Math.PI * 2;
const hash = (a, b = 0) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
const LEAD = '#14111a';

export function drawSkylightGlass(size = 1024) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), R = size / 2, u = R;                    // u: one unit is the glass's radius
  g.translate(R, R);
  // angles are clockwise from the top, as a clock's
  const P = (r, a) => [Math.sin(a) * r * u, -Math.cos(a) * r * u];
  const arc = (r, a0, a1, acw = false) => g.arc(0, 0, r * u, a0 - Math.PI / 2, a1 - Math.PI / 2, acw);
  const R_EYE = EYE, R_FIL = 0.632, R_MEM = 0.795, R_BORD = 0.94;        // the eye, its gold fillet, the membrane, the border

  // ---- the ground: quarries of blue outside the membrane and sea-green inside it ------------------------------
  const tile = (r0, r1, a0, a1, colour) => { g.beginPath(); arc(r1, a0, a1); arc(r0, a1, a0, true); g.closePath(); g.fillStyle = colour; g.fill(); };
  const OUT = ['#16276d', '#1c3488', '#23429e', '#162f7c', '#2a4cab', '#1a2a72', '#31389a'], IN = ['#2a8f84', '#35a592', '#46b89c', '#2f9a8a', '#5cc7a6', '#3aa8a0'], GLOW = ['#8fdcb8', '#a9e6c4', '#7fd4b4', '#bdeccb'];
  const SECT = 30, cuts = [];                                              // every lead line, drawn after the colour
  const rowOf = (r0, r1, n, pal, seed, shift) => {
    for (let i = 0; i < n; i++) {
      const j0 = (hash(i, seed) - 0.5) * 0.4, j1 = (hash(i + 1, seed) - 0.5) * 0.4, a0 = (i + shift + j0) / n * TAU, a1 = (i + 1 + shift + j1) / n * TAU;
      tile(r0, r1, a0, a1, pal[Math.floor(hash(i, seed + 3) * pal.length)]); cuts.push([r0, r1, a0]);
    }
  };
  const mid = r => R_MEM + 0.012 * Math.sin(r);                           // (rows meet on wavering lines, not on circles)
  rowOf(0.868, R_BORD, SECT, OUT, 1, 0); rowOf(R_MEM, 0.868, SECT - 4, OUT, 2, 0.5);
  rowOf(0.71, R_MEM, SECT - 8, IN, 3, 0.25); rowOf(R_FIL, 0.71, SECT - 12, GLOW, 4, 0.7);
  // the glass is not flat colour: streaks, as pot metal has, and a light that gathers toward the eye
  g.save(); g.beginPath(); arc(R_BORD, 0, TAU); arc(R_FIL, TAU, 0, true); g.clip();
  for (let i = 0; i < 2600; i++) {
    const a = hash(i, 9) * TAU, r = R_FIL + hash(i, 10) * (R_BORD - R_FIL), [x, y] = P(r, a), L = (0.012 + 0.03 * hash(i, 11)) * u, t = a + (hash(i, 12) - 0.5) * 0.9;
    g.strokeStyle = hash(i, 13) > 0.45 ? `rgba(255,255,255,${0.035 + 0.05 * hash(i, 14)})` : `rgba(4,8,40,${0.05 + 0.07 * hash(i, 15)})`; g.lineWidth = (0.0015 + 0.003 * hash(i, 16)) * u;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(t) * L, y + Math.sin(t) * L); g.stroke();
  }
  { const gr = g.createRadialGradient(0, 0, R_FIL * u, 0, 0, R_BORD * u); gr.addColorStop(0, 'rgba(255,250,215,0.34)'); gr.addColorStop(0.42, 'rgba(255,250,215,0.06)'); gr.addColorStop(0.62, 'rgba(0,0,30,0)'); gr.addColorStop(1, 'rgba(0,0,30,0.22)'); g.fillStyle = gr; g.fillRect(-R, -R, size, size); }
  g.restore();
  // the leading between the quarries
  g.strokeStyle = LEAD; g.lineCap = 'round'; g.lineWidth = 0.0058 * u;
  for (const [r0, r1, a] of cuts) { g.beginPath(); g.moveTo(...P(r0, a)); g.lineTo(...P(r1, a)); g.stroke(); }
  for (const r of [0.868, 0.71]) { g.beginPath(); arc(r, 0, TAU); g.stroke(); }

  // ---- the three marks of the paper ----------------------------------------------------------------------------
  const substrate = (r, a, s = 1, alpha = 1) => {
    const [x, y] = P(r, a), q = 0.0165 * s * u; g.save(); g.globalAlpha = alpha;
    const gr = g.createRadialGradient(x - q * 0.3, y - q * 0.35, q * 0.1, x, y, q); gr.addColorStop(0, '#e9ffb8'); gr.addColorStop(0.55, '#9fe05e'); gr.addColorStop(1, '#4f9a2c');
    g.beginPath(); g.arc(x, y, q, 0, TAU); g.fillStyle = gr; g.fill(); g.lineWidth = 0.0042 * u; g.strokeStyle = LEAD; g.stroke(); g.restore();
  };
  const link = (r, a, o = {}) => {
    const [x, y] = P(r, a), q = (o.size ?? 0.058) * u / 2, turn = a + (o.turn ?? 0);
    g.save(); g.translate(x, y); g.rotate(turn); g.globalAlpha = o.alpha ?? 1;
    const gr = g.createLinearGradient(-q, -q, q, q); gr.addColorStop(0, o.pale ? '#fff2b8' : '#ffe07a'); gr.addColorStop(0.5, o.pale ? '#ffd778' : '#f6b12e'); gr.addColorStop(1, o.pale ? '#f0b452' : '#cf7a14');
    const rr = q * 0.34; g.beginPath(); g.moveTo(-q + rr, -q); g.arcTo(q, -q, q, q, rr); g.arcTo(q, q, -q, q, rr); g.arcTo(-q, q, -q, -q, rr); g.arcTo(-q, -q, q, -q, rr); g.closePath();
    g.fillStyle = gr; g.fill(); g.lineWidth = 0.0058 * u; g.strokeStyle = LEAD; g.stroke();
    g.beginPath(); g.moveTo(-q * 0.5, -q * 0.52); g.lineTo(q * 0.2, -q * 0.52); g.strokeStyle = 'rgba(255,255,240,.75)'; g.lineWidth = 0.004 * u; g.stroke();      // a light along one edge
    if (o.crack) { g.beginPath(); g.moveTo(-q * 0.15, -q); g.lineTo(q * 0.2, -q * 0.25); g.lineTo(-q * 0.22, q * 0.2); g.lineTo(q * 0.12, q); g.strokeStyle = LEAD; g.lineWidth = 0.0048 * u; g.stroke(); }
    g.restore();
  };
  const bond = (ra, aa, rb, ab) => {                                       // the bar between two links: gold, in a lead came
    g.beginPath(); g.moveTo(...P(ra, aa)); g.lineTo(...P(rb, ab)); g.lineCap = 'butt'; g.strokeStyle = LEAD; g.lineWidth = 0.021 * u; g.stroke(); g.strokeStyle = '#f2c14a'; g.lineWidth = 0.0105 * u; g.stroke(); g.lineCap = 'round';
  };
  const dotted = (pts, colour) => { g.save(); g.setLineDash([0.009 * u, 0.013 * u]); g.strokeStyle = colour; g.lineWidth = 0.0048 * u; g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(...p) : g.moveTo(...p))); g.stroke(); g.restore(); };

  // substrate, thick outside and near the membrane, a little of it through and inside: it passes where links cannot
  for (let i = 0; i < 64; i++) {
    const a = hash(i, 21) * TAU, k = Math.pow(hash(i, 22), 1.7), r = R_MEM + 0.035 + k * (R_BORD - R_MEM - 0.05);
    if (Math.abs(((a - 3.49 + Math.PI) % TAU + TAU) % TAU - Math.PI) < 0.16 && r < 0.9) continue;                  // (room for the two that are leaving)
    if (r > 0.862 && (Math.min(a, TAU - a) < 0.34 || Math.abs(a - Math.PI) < 0.5)) continue;                           // (and for the lettering at the head and the foot)
    substrate(r, a, 0.8 + 0.5 * hash(i, 23));
  }
  for (let i = 0; i < 12; i++) { const a = hash(i, 31) * TAU; if (Math.abs(a - 5.93) < 0.35) continue; substrate(0.655 + hash(i, 32) * 0.1, a, 0.85); }

  // ---- the membrane: a closed chain of links, but for one gap; and one link going --------------------------------
  const N = 28, GAP = 4, DYING = 16, mr = i => R_MEM + 0.011 * Math.sin(i * 1.7) + 0.006 * Math.sin(i * 0.6 + 1), ma = i => (i + 0.5) / N * TAU;
  for (let i = 0; i < N; i++) { const j = (i + 1) % N; if (i === GAP || j === GAP) continue; bond(mr(i), ma(i), mr(j), ma(j)); }
  for (let i = 0; i < N; i++) {
    if (i === GAP) continue;
    if (i === DYING) { link(mr(i), ma(i), { pale: true, crack: true, alpha: 0.9, turn: 0.12 }); continue; }
    link(mr(i), ma(i), { turn: (hash(i, 41) - 0.5) * 0.14 });
  }
  // substrate slipping between the links, here and there
  for (const i of [1, 8, 12, 20, 24]) substrate(mr(i) + 0.004, (i + 1) / N * TAU, 0.72);
  // the gap, and the link that is about to close it: made inside, drifting out, its way marked
  { const a = ma(GAP), a0 = a - 0.2;
    dotted([P(0.695, a0 - 0.16), P(0.725, a0 - 0.05), P(0.762, a - 0.012)], '#ffe9a0');
    link(0.765, a - 0.012, { pale: true, turn: 0.38, size: 0.055 });
    for (const [da, s] of [[-0.115, 1], [0.115, -1]]) { g.beginPath(); g.moveTo(...P(mr(GAP + (da < 0 ? -1 : 1)), a + da * 0.62)); g.lineTo(...P(R_MEM, a + da * 0.36)); g.strokeStyle = '#f2c14a'; g.lineWidth = 0.0075 * u; g.stroke(); void s; }      // the open bonds either side, reaching
  }
  // the link that is going: two substrates leaving it, outward
  { const a = ma(DYING);
    dotted([P(mr(DYING) + 0.03, a - 0.02), P(0.868, a - 0.075)], '#c9f29a'); dotted([P(mr(DYING) + 0.03, a + 0.02), P(0.875, a + 0.085)], '#c9f29a');
    substrate(0.878, a - 0.082, 0.95, 0.95); substrate(0.887, a + 0.093, 0.95, 0.95);
  }

  // ---- the catalyst, inside: a star; two substrates at its points, and the link it has just made of the two before ----
  { const a = 5.93, r = 0.698, [x, y] = P(r, a), q = 0.052 * u;
    const halo = g.createRadialGradient(x, y, 0, x, y, q * 2.3); halo.addColorStop(0, 'rgba(255,250,220,.75)'); halo.addColorStop(1, 'rgba(255,250,220,0)'); g.fillStyle = halo; g.beginPath(); g.arc(x, y, q * 2.3, 0, TAU); g.fill();
    g.beginPath(); for (let i = 0; i < 16; i++) { const t = (i / 16) * TAU + a, rr = i % 2 ? q * 0.42 : q; g.lineTo(x + Math.sin(t) * rr, y - Math.cos(t) * rr); } g.closePath();
    const gr = g.createRadialGradient(x, y, 0, x, y, q); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.5, '#fff3c4'); gr.addColorStop(1, '#f6c648'); g.fillStyle = gr; g.fill(); g.lineWidth = 0.0058 * u; g.strokeStyle = LEAD; g.stroke();
    g.beginPath(); g.arc(x, y, q * 0.24, 0, TAU); g.fillStyle = '#c22a36'; g.fill(); g.lineWidth = 0.0036 * u; g.stroke();
    substrate(r + 0.012, a - 0.105, 0.9); substrate(r - 0.03, a - 0.09, 0.9);
    dotted([P(r, a + 0.085), P(r + 0.004, a + 0.15)], '#ffe9a0');
    link(r + 0.006, a + 0.185, { pale: true, turn: 0.5, size: 0.05 });
    for (const t of [-0.5, 0, 0.5]) { const [sx, sy] = P(r + 0.006 + 0.047 * Math.cos(t), a + 0.185 + 0.062 * Math.sin(t) + 0.035); g.beginPath(); g.moveTo(sx, sy); const [ex, ey] = P(r + 0.006 + 0.062 * Math.cos(t), a + 0.185 + 0.085 * Math.sin(t) + 0.045); g.lineTo(ex, ey); g.strokeStyle = '#fff6cf'; g.lineWidth = 0.0042 * u; g.stroke(); }      // new: three small rays off it
  }

  // ---- the border, and the fillet round the eye -----------------------------------------------------------------
  { const n = 72; for (let i = 0; i < n; i++) tile(R_BORD, 0.994, i / n * TAU, (i + 1) / n * TAU, i % 6 === 0 ? '#c22a36' : i % 2 ? '#e9b53c' : '#1c2f80');
    g.strokeStyle = LEAD; g.lineWidth = 0.0048 * u; for (let i = 0; i < n; i++) { g.beginPath(); g.moveTo(...P(R_BORD, i / n * TAU)); g.lineTo(...P(0.994, i / n * TAU)); g.stroke(); }
    g.lineWidth = 0.0085 * u; for (const r of [R_BORD, 0.9935]) { g.beginPath(); arc(r, 0, TAU); g.stroke(); }
  }
  { const gr = g.createRadialGradient(0, 0, R_EYE * u, 0, 0, R_FIL * u); gr.addColorStop(0, '#fff3c0'); gr.addColorStop(0.5, '#f4cf62'); gr.addColorStop(1, '#d99a26');
    g.beginPath(); arc(R_FIL, 0, TAU); arc(R_EYE, TAU, 0, true); g.fillStyle = gr; g.fill('evenodd');
    g.strokeStyle = LEAD; g.lineWidth = 0.0075 * u; for (const r of [R_EYE + 0.003, R_FIL]) { g.beginPath(); arc(r, 0, TAU); g.stroke(); }
    g.lineWidth = 0.0036 * u; for (let i = 0; i < 24; i++) { g.beginPath(); g.moveTo(...P(R_EYE + 0.003, i / 24 * TAU)); g.lineTo(...P(R_FIL, i / 24 * TAU)); g.stroke(); }
  }
  // the name, cut small in the blue at the foot, and the year at the head: read from above, in the garden
  const letter = (text, r, a0, px, colour, flip) => {
    g.save(); g.font = `600 ${px}px Georgia, 'Times New Roman', serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = colour;
    const step = px * 0.86 / (r * u), n = text.length;
    for (let i = 0; i < n; i++) { const a = a0 + (i - (n - 1) / 2) * step * (flip ? -1 : 1), [x, y] = P(r, a); g.save(); g.translate(x, y); g.rotate(a + (flip ? Math.PI : 0)); g.fillText(text[i], 0, 0); g.restore(); }
    g.restore();
  };
  letter('AUTOPOIESIS', 0.905, Math.PI, 0.036 * u, '#f6dc8a', true); letter('MCMLXXIV', 0.905, 0, 0.03 * u, '#f6dc8a', false);
  return c;
}
