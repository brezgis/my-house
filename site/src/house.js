// The house. Laid out from Greene & Greene's drawings for the Bentz house
// (July 1906, with the 1910 sleeping-porch addition), then made my own.
//
// Dimensions are in feet, in plan coordinates (see builder.js). Figures marked
// "read" are legible on the drawings; the rest are scaled from the scans or
// from photographs, and a few interior arrangements are simplified.

import { W, wx, wz } from './builder.js';

// ---- Levels ------------------------------------------------------------------
export const D = 30;            // main block depth, 30'-0" (read)
export const F1 = 1.6;          // first floor above grade
export const C1 = F1 + 8.2;     // first-floor ceiling (nomination: about 8')
export const F2 = F1 + 9.2;     // second floor
export const C2 = F2 + 8;       // second-floor ceiling, and the wall plate
const T = 0.5;                  // outside wall thickness
const TP = 0.4;                 // partition thickness
const PITCH = 0.47;             // roof rise over run, scaled from the elevations
const OH = 5;                   // eave overhang: 4'-6" plus the beam ends
const OHG = 4.5;                // overhang at the gables

// ---- Plan lines ----------------------------------------------------------------
const P1 = 19.0;                // living room | hall
const P2 = 27.6;                // hall | dining room
const DIN = 16.5;               // back of dining room
const PAN = 22.6;               // back of pantry and back hall
const KX = 30.8;                // bedroom no. 1 | kitchen
const KIT = 35.5;               // back of kitchen
const BED = 39.7;               // back of bedroom wing
const SCR = 46.33;              // back of screened porch (46'-4" overall, read)
const TER = 12;                 // terrace depth, 12'-0" (read)
const PA = 17.2, PB = 29.9;     // front porch, 12'-4" between piers (read)
const ST = { X0: 24.0, X1: 27.4, Y0: 5.3, Y1: 17.4 };  // the stair
const HOLE_Y0 = 7;              // where the stairwell opens in the upper floor

export function buildHouse(B) {
  const surfaces = [];          // where you can stand
  const rooms = [];             // names, for the caption
  const lamps = [];             // soft interior fill lights
  const doors = [];             // leaves that swing; built by life.js so they can open and close
  const windows = [];           // every window, for curtains
  const portals = [];           // every opening one can see through (visibility.js): world boxes, n = axis across
  const portal = (X0, X1, Y0, Y1, h0, h1, n, kind) => portals.push({ x0: wx(Math.min(X0, X1)), x1: wx(Math.max(X0, X1)), y0: h0, y1: h1, z0: wz(Math.max(Y0, Y1)), z1: wz(Math.min(Y0, Y1)), n, kind });

  const surf = (X0, X1, Y0, Y1, h, h2) => surfaces.push({ x0: wx(X0), x1: wx(X1), z0: wz(Y1), z1: wz(Y0), h, h2 });
  const room = (name, X0, X1, Y0, Y1, floor) => rooms.push({ name, x0: wx(X0), x1: wx(X1), z0: wz(Y1), z1: wz(Y0), y0: floor - 1, y1: floor + 8.5 });
  const lamp = (X, Y, h, power = 1) => lamps.push({ x: wx(X), y: h, z: wz(Y), power });

  // ============================================================================
  // Walls with openings
  // ============================================================================
  // spec: ax 'X' (wall runs along X at Y = c) or 'Y' (runs along Y at X = c)
  //       a, b     extent along the wall
  //       h0, h1   bottom and top;  ceil = ceiling height on the room side
  //       neg, pos what faces the lower / higher side of c:
  //                'ext' shakes, 'int' plaster, 'wains' plaster over panelling,
  //                'board' dark boards, 'none'
  //       opens    [{ at, w, sill, head, kind, ... }] heights above h0
  const FACE = { ext: 'shake', int: 'plaster', wains: 'plaster', board: 'timber', none: 'plaster' };

  function wall(s) {
    const t = s.t ?? TP, fl = s.h0, ceil = s.ceil ?? s.h1;
    const isX = s.ax === 'X';
    const L = (u0, u1, h0, h1, w0, w1, mat, o) => isX
      ? B.pbox(mat, u0, u1, s.c + w0, s.c + w1, h0, h1, o)
      : B.pbox(mat, s.c + w0, s.c + w1, u0, u1, h0, h1, o);
    const ctx = { ...s, t, fl, L, isX };

    const piece = (u0, u1, h0, h1) => {
      if (u1 - u0 < 0.01 || h1 - h0 < 0.01) return;
      const mn = FACE[s.neg], mp = FACE[s.pos];
      if (mn === mp) L(u0, u1, h0, h1, -t / 2, t / 2, mn, { collide: true });
      else {
        L(u0, u1, h0, h1, -t / 2, 0, mn, { collide: true });
        L(u0, u1, h0, h1, 0, t / 2, mp, { collide: true });
      }
    };

    const opens = [...(s.opens ?? [])].sort((p, q) => p.at - q.at);
    let u = s.a;
    const floorRuns = [];       // stretches where the wall meets the floor
    for (const o of opens) {
      piece(u, o.at, s.h0, s.h1);
      if (o.at > u) floorRuns.push([u, o.at]);
      const sill = o.sill ?? 0;
      if (sill > 0) { piece(o.at, o.at + o.w, s.h0, fl + sill); floorRuns.push([o.at, o.at + o.w, sill - 0.5]); }
      piece(o.at, o.at + o.w, fl + o.head, s.h1);
      fit(ctx, o);
      u = o.at + o.w;
    }
    piece(u, s.b, s.h0, s.h1);
    if (s.b > u) floorRuns.push([u, s.b]);

    for (const [sg, kind] of [[-1, s.neg], [1, s.pos]]) {
      if (kind !== 'int' && kind !== 'wains') continue;
      const f = sg * t / 2;
      for (const [r0, r1] of floorRuns) L(r0, r1, fl, fl + 0.62, f, f + sg * 0.055, 'fir', { grain: 'long' });
      if (ceil - fl > 7.6) {
        L(s.a, s.b, fl + 6.95, fl + 7.27, f, f + sg * 0.08, 'fir', { grain: 'long' });   // picture rail
        L(s.a, s.b, ceil - 0.58, ceil - 0.002, f, f + sg * 0.062, 'fir', { grain: 'long' });       // ceiling band
      }
      if (kind === 'wains') {
        for (const [r0, r1, lim] of floorRuns) {
          const top = fl + Math.min(5, lim ?? 5);
          L(r0, r1, fl + 0.62, top, f, f + sg * 0.03, 'fir', { grain: 'long' });
          for (let b = r0 + 0.12; b < r1; b += 1.45) L(b - 0.12, b + 0.12, fl + 0.62, top, f, f + sg * 0.048, 'fir', { grain: 'long' });
          if (lim !== undefined) continue;
          L(r0, r1, fl + 5, fl + 5.14, f, f + sg * 0.3, 'fir', { grain: 'long' });         // plate rail
          L(r0, r1, fl + 4.72, fl + 5, f, f + sg * 0.1, 'fir', { grain: 'long' });
        }
      }
    }
  }

  // ---- What goes in an opening ---------------------------------------------------
  function fit(c, o) {
    const { L, t, fl } = c;
    const u0 = o.at, u1 = o.at + o.w, hs = fl + (o.sill ?? 0), hh = fl + o.head;
    c.isX ? portal(u0, u1, c.c - t / 2, c.c + t / 2, hs, hh, 'z', o.kind) : portal(c.c - t / 2, c.c + t / 2, u0, u1, hs, hh, 'x', o.kind);
    const sides = [[-1, c.neg], [1, c.pos]];
    const wood = kind => (kind === 'ext' || kind === 'board' ? 'timber' : 'fir');
    const G = { grain: 'long' };

    // Liner and casings, shared by windows and doors
    L(u0, u0 + 0.09, hs, hh, -t / 2 - 0.02, t / 2 + 0.02, 'fir', G);
    L(u1 - 0.09, u1, hs, hh, -t / 2 - 0.02, t / 2 + 0.02, 'fir', G);
    L(u0, u1, hh - 0.09, hh, -t / 2 - 0.02, t / 2 + 0.02, 'fir', G);
    for (const [sg, kind] of sides) {
      if (kind === 'none') continue;
      const f = sg * t / 2, m = wood(kind);
      L(u0 - 0.36, u0, hs, hh, f, f + sg * 0.075, m, G);
      L(u1, u1 + 0.36, hs, hh, f, f + sg * 0.075, m, G);
      L(u0 - 0.58, u1 + 0.58, hh, hh + 0.44, f, f + sg * 0.1, m, G);       // long Craftsman head
      if (o.kind === 'win') {
        const out = kind === 'ext' ? 0.16 : 0.24;
        L(u0 - 0.46, u1 + 0.46, hs - 0.12, hs, f - sg * 0.04, f + sg * out, m, G);  // sill / stool
        L(u0 - 0.36, u1 + 0.36, hs - 0.5, hs - 0.12, f, f + sg * 0.066, m, G);       // apron
      }
    }

    if (o.kind === 'win') {
      c.isX ? B.block(u0, u1, c.c - 0.1, c.c + 0.1, fl, hh) : B.block(c.c - 0.1, c.c + 0.1, u0, u1, fl, hh);
      for (const [sg, kind] of sides) if (kind === 'int' || kind === 'wains') windows.push({ isX: c.isX, c: c.c + sg * t / 2, sg, u0, u1, fl, sill: hs - fl, head: hh - fl, n: o.n ?? 1 });
      L(u0, u1, hs, hs + 0.1, -t / 2, t / 2, 'fir', G);
      const n = o.n ?? 1, a = u0 + 0.09, b = u1 - 0.09, sw = (b - a) / n;
      for (let i = 0; i < n; i++) {
        const s0 = a + i * sw, s1 = s0 + sw;
        if (i) L(s0 - 0.08, s0 + 0.08, hs, hh, -0.14, 0.14, 'fir', G);
        sash(L, s0 + (i ? 0.08 : 0), s1 - (i < n - 1 ? 0.08 : 0), hs + 0.1, hh - 0.09);
      }
      return;
    }
    if (o.kind === 'cased') return;

    // A door leaf. Open leaves stand swung back; closed ones block the way.
    const glassy = o.kind === 'gdoor';
    const hingeU = o.hinge === 'b' ? u1 - 0.09 : u0 + 0.09;
    const sg = o.swing === 'neg' ? -1 : 1;
    const ang = o.angle ?? 1.62;
    const base = (c.isX ? 0 : Math.PI / 2) + (o.hinge === 'b' ? Math.PI : 0);
    const turn = (c.isX ? 1 : -1) * (o.hinge === 'b' ? -1 : 1) * sg * ang;
    const H = c.isX ? [hingeU, c.c] : [c.c, hingeU];
    const stop = c.isX
      ? { x0: wx(u0), x1: wx(u1), z0: wz(c.c + 0.1), z1: wz(c.c - 0.1), y0: fl, y1: hh }
      : { x0: wx(c.c - 0.1), x1: wx(c.c + 0.1), z0: wz(u1), z1: wz(u0), y0: fl, y1: hh };
    B.colliders.push(stop);
    doors.push({ x: wx(H[0]), z: wz(H[1]), closed: base, open: base + turn, w: o.w - 0.18, y0: fl + 0.03, y1: hh - 0.09, glassy, stop,
      cx: (stop.x0 + stop.x1) / 2, cz: (stop.z0 + stop.z1) / 2, fixed: o.fixed ?? false,
      exterior: !o.inside && (c.neg === 'ext' || c.pos === 'ext') });
  }

  // One casement: frame, glass, and the Greenes' light division - a transom
  // bar a quarter of the way down, with the upper light split in two.
  function sash(L, s0, s1, h0, h1) {
    const G = { grain: 'long' }, r = 0.15, d0 = -0.06, d1 = 0.06;
    L(s0, s0 + r, h0, h1, d0, d1, 'sash', G);
    L(s1 - r, s1, h0, h1, d0, d1, 'sash', G);
    L(s0 + r, s1 - r, h0, h0 + r + 0.05, d0, d1, 'sash', G);
    L(s0 + r, s1 - r, h1 - r, h1, d0, d1, 'sash', G);
    L(s0 + r, s1 - r, h0 + r, h1 - r, -0.01, 0.01, 'glass');
    const bar = h1 - r - (h1 - h0) * 0.24;
    L(s0 + r, s1 - r, bar - 0.035, bar + 0.035, -0.04, 0.04, 'sash', G);
    if (s1 - s0 > 1.6) L((s0 + s1) / 2 - 0.03, (s0 + s1) / 2 + 0.03, bar, h1 - r, -0.04, 0.04, 'sash', G);
  }

  // ---- Small builders ---------------------------------------------------------
  // Balustrade: square newels, two rails, square balusters.
  function rail(ax, c, a, b, base, o = {}) {
    const L = (u0, u1, h0, h1, w0, w1, mat, opt) => ax === 'X'
      ? B.pbox(mat, u0, u1, c + w0, c + w1, h0, h1, opt) : B.pbox(mat, c + w0, c + w1, u0, u1, h0, h1, opt);
    const m = o.mat ?? 'fir', G = { grain: 'long' }, top = o.top ?? 3.0;
    L(a, b, base + top - 0.2, base + top, -0.13, 0.13, m, G);
    L(a, b, base + 0.3, base + 0.45, -0.08, 0.08, m, G);
    for (let u = a + 0.42; u < b - 0.2; u += 0.42) L(u - 0.055, u + 0.055, base + 0.45, base + top - 0.2, -0.055, 0.055, m, G);
    for (const u of o.newels ?? [a, b]) L(u - 0.2, u + 0.2, base, base + top + 0.35, -0.2, 0.2, m, G);
    ax === 'X' ? B.block(a, b, c - 0.15, c + 0.15, base, base + top) : B.block(c - 0.15, c + 0.15, a, b, base, base + top);
  }

  // A brick pier sitting on arroyo boulders.
  function pier(X, Y, h, half = 1.15) {
    B.pbox('clinker', X - half, X + half, Y - half, Y + half, 0, h, { collide: true });
    B.pbox('brick', X - half - 0.1, X + half + 0.1, Y - half - 0.1, Y + half + 0.1, h, h + 0.22);
  }

  const timberX = (X0, X1, Y, h, wd, dp) => B.pbox('timber', X0, X1, Y - wd / 2, Y + wd / 2, h - dp, h, { grain: 'long' });
  const timberY = (X, Y0, Y1, h, wd, dp) => B.pbox('timber', X - wd / 2, X + wd / 2, Y0, Y1, h - dp, h, { grain: 'long' });

  // ============================================================================
  // Foundation and floors
  // ============================================================================
  const FOOT = [[0, W, 0, D], [P1, W, D, KIT], [P1, KX, KIT, BED]];
  for (const [X0, X1, Y0, Y1] of FOOT) {
    B.pbox('floor', X0, X1, Y0, Y1, F1 - 0.25, F1);
    surf(X0, X1, Y0, Y1, F1);
  }
  // Brick foundation showing below the shakes
  const brickBand = (X0, X1, Y0, Y1) => B.pbox('brick', X0, X1, Y0, Y1, 0, F1 - 0.25, { collide: true });
  brickBand(-0.06, W + 0.06, -0.06, 0.5); brickBand(-0.06, 0.5, 0, D); brickBand(W - 0.5, W + 0.06, 0, KIT);
  brickBand(0, P1 + 0.06, D - 0.5, D + 0.06); brickBand(P1 - 0.06, P1 + 0.5, D, BED); brickBand(P1, KX, BED - 0.5, BED + 0.06);
  brickBand(KX - 0.5, KX + 0.06, KIT, BED); brickBand(KX, W, KIT - 0.5, KIT + 0.06);

  // Upper floor, with the stairwell left open
  const upper = [[0, ST.X0, 0, D], [ST.X1, W, 0, D], [ST.X0, ST.X1, 0, HOLE_Y0], [ST.X0, ST.X1, ST.Y1, D]];
  for (const [X0, X1, Y0, Y1] of upper) {
    B.pbox('floor', X0, X1, Y0, Y1, F2 - 0.25, F2);
    B.pbox('ceil', X0 + 0.01, X1 - 0.01, Y0 + 0.01, Y1 - 0.01, C1, C1 + 0.14);
    surf(X0, X1, Y0, Y1, F2);
  }
  portal(ST.X0, ST.X1, HOLE_Y0, ST.Y1, C1 - 0.3, F2 + 0.1, 'y', 'stair');      // the stairwell, between the halls
  // Stairwell lining
  B.pbox('fir', ST.X0 - 0.06, ST.X0, HOLE_Y0, ST.Y1, C1 - 0.02, F2, { grain: 'long' });
  B.pbox('fir', ST.X0, ST.X1, HOLE_Y0 - 0.06, HOLE_Y0, C1 - 0.02, F2, { grain: 'long' });
  B.pbox('fir', ST.X1, ST.X1 + 0.06, HOLE_Y0, ST.Y1, C1 - 0.02, F2, { grain: 'long' });
  // Upper ceiling
  B.pbox('ceil', 0.3, W - 0.3, 0.3, D - 0.3, C2, C2 + 0.14);

  // ============================================================================
  // First floor
  // ============================================================================
  const WIN = { kind: 'win', sill: 2.3, head: 6.8 };
  const LOW = { kind: 'win', sill: 2.0, head: 6.8 };      // the living-room corner band
  const HIGH = { kind: 'win', sill: 3.4, head: 6.8 };     // over counters
  const DOOR = { kind: 'door', head: 6.9, open: true };
  const e1 = { h0: F1, h1: F2, ceil: C1, t: T };          // outside walls, first floor
  const i1 = { h0: F1, h1: C1 };                          // partitions, first floor

  // East, to the street
  wall({ ...e1, ax: 'X', c: T / 2, a: 0, b: P1, neg: 'ext', pos: 'int', opens: [{ ...WIN, at: 6.1, w: 7.6, n: 3 }] });
  wall({ ...e1, ax: 'X', c: T / 2, a: P1, b: P2, neg: 'ext', pos: 'int', opens: [
    { kind: 'gdoor', at: 20.1, w: 3.7, head: 6.9, open: true, hinge: 'a', swing: 'pos', angle: 1.5 },   // front door, 3'-8"
    { kind: 'gdoor', at: 24.4, w: 2.2, head: 6.9, fixed: true },                                       // its narrow companion
  ] });
  wall({ ...e1, ax: 'X', c: T / 2, a: P2, b: W, neg: 'ext', pos: 'wains', opens: [{ ...WIN, at: 33.0, w: 7.2, n: 3 }] });
  // South, to the terrace
  wall({ ...e1, ax: 'Y', c: T / 2, a: 0, b: D, neg: 'ext', pos: 'int', opens: [
    { kind: 'gdoor', at: 1.7, w: 2.6, head: 6.9, fixed: true },
    { kind: 'gdoor', at: 4.5, w: 2.6, head: 6.9, open: true, hinge: 'a', swing: 'pos' },
    { kind: 'gdoor', at: 7.3, w: 2.6, head: 6.9, fixed: true },
    { ...LOW, at: 19.3, w: 10.2, n: 4 },
  ] });
  // West wall of the living room: the other half of the corner band
  wall({ ...e1, ax: 'X', c: D - T / 2, a: 0, b: P1, neg: 'int', pos: 'ext', opens: [{ ...LOW, at: 0.5, w: 10.2, n: 4 }, { ...WIN, at: 13.2, w: 3.6, n: 2 }] });
  // North
  wall({ ...e1, ax: 'Y', c: W - T / 2, a: 0, b: DIN, neg: 'wains', pos: 'ext', opens: [{ ...WIN, at: 4.6, w: 7.2, n: 3 }] });
  wall({ ...e1, ax: 'Y', c: W - T / 2, a: DIN, b: PAN, neg: 'int', pos: 'ext', opens: [{ ...HIGH, at: 18.3, w: 2.6, n: 1 }] });
  wall({ ...e1, ax: 'Y', c: W - T / 2, a: PAN, b: KIT, neg: 'int', pos: 'ext', opens: [{ ...HIGH, at: 26.2, w: 5.6, n: 2 }] });
  // Bedroom-and-kitchen wing
  wall({ ...e1, ax: 'Y', c: P1 + T / 2, a: D, b: BED, neg: 'ext', pos: 'int', opens: [{ ...WIN, at: 32.3, w: 5.2, n: 2 }] });
  wall({ ...e1, ax: 'X', c: BED - T / 2, a: P1, b: KX, neg: 'int', pos: 'ext', opens: [{ ...WIN, at: 21.6, w: 6.6, n: 3 }] });
  wall({ ...e1, ax: 'Y', c: KX - T / 2, a: KIT, b: BED, neg: 'int', pos: 'ext' });
  wall({ ...e1, ax: 'X', c: KIT - T / 2, a: KX, b: W, neg: 'int', pos: 'ext', opens: [
    { ...DOOR, at: 32.0, w: 2.8, hinge: 'a', swing: 'neg', angle: 1.9 },
    { ...HIGH, at: 36.8, w: 4.6, n: 2 },
  ] });

  // Partitions
  wall({ ...i1, ax: 'Y', c: P1, a: T, b: D - T, neg: 'int', pos: 'int', opens: [{ kind: 'cased', at: 1.6, w: 10.6, head: 6.9 }] });
  wall({ ...i1, ax: 'Y', c: P2, a: T, b: DIN, neg: 'int', pos: 'wains', opens: [{ kind: 'cased', at: 0.9, w: 4.0, head: 6.9 }] });
  wall({ ...i1, ax: 'X', c: DIN, a: P2, b: W - T, neg: 'wains', pos: 'int', opens: [{ ...DOOR, at: 29.2, w: 2.7, hinge: 'a', swing: 'pos' }] });
  wall({ ...i1, ax: 'Y', c: P2, a: DIN, b: PAN, neg: 'int', pos: 'int', opens: [{ kind: 'cased', at: 18.3, w: 2.8, head: 6.9 }] });
  wall({ ...i1, ax: 'X', c: PAN, a: P1 + TP / 2, b: W - T, neg: 'int', pos: 'int', opens: [
    { ...DOOR, at: 20.1, w: 2.7, hinge: 'b', swing: 'pos' },
    { kind: 'cased', at: 33.2, w: 2.8, head: 6.9 },
  ] });
  wall({ ...i1, ax: 'Y', c: KX, a: PAN, b: KIT - T, neg: 'int', pos: 'int' });
  // The hall side of the stair is closed in above the first few steps
  wall({ ...i1, ax: 'Y', c: ST.X0 - TP / 2, a: HOLE_Y0, b: ST.Y1, neg: 'int', pos: 'int' });
  // Dropped beam carrying the upper west wall across the wing
  B.pbox('fir', P1 + TP / 2, W - T, D - 0.3, D + 0.3, C1 - 0.75, C1, { grain: 'long' });
  // Living-room ceiling beams
  for (const Y of [7.5, 15, 22.5]) B.pbox('fir', T, P1 - TP / 2, Y - 0.3, Y + 0.3, C1 - 0.5, C1, { grain: 'long' });

  room('Living room', 0, P1, 0, D, F1); room('Hall', P1, P2, 0, PAN, F1); room('Dining room', P2, W, 0, DIN, F1);
  room('Coffee bar', P2, W, DIN, PAN, F1); room('Kitchen', KX, W, PAN, KIT, F1); room('Office', P1, KX, PAN, BED, F1);
  lamp(9.5, 8, F1 + 6.2, 1.2); lamp(9.5, 22, F1 + 6.2, 1.2); lamp(23, 4, F1 + 6.2, 0.7); lamp(21.5, 19, F1 + 6.2, 0.6);
  lamp(35.5, 8.5, F1 + 6.2, 1.1); lamp(36, 19.5, F1 + 6.2, 0.5); lamp(37, 29, F1 + 6.2, 0.9); lamp(25, 31.5, F1 + 6.2, 0.9);

  // ---- Fireplace -------------------------------------------------------------------
  {
    const X0 = 16.7, X1 = P1 - TP / 2, Y0 = 14.3, Y1 = 21.3, o = { collide: true };
    B.pbox('clinker', X0, X1, Y0, 16.4, F1, C1, o);
    B.pbox('clinker', X0, X1, 19.2, Y1, F1, C1, o);
    B.pbox('clinker', X0, X1, 16.4, 19.2, F1 + 2.7, C1);
    B.pbox('soot', X1 - 0.5, X1, 16.4, 19.2, F1, F1 + 2.7, o);
    B.pbox('soot', X0 + 0.25, X1 - 0.5, 16.4, 19.2, F1, F1 + 0.03);
    B.pbox('tile', X0 - 1.7, X0, Y0 + 0.5, Y1 - 0.5, F1, F1 + 0.04);                     // hearth
    B.pbox('fir', X0 - 0.55, X0, Y0 - 0.3, Y1 + 0.3, F1 + 4.55, F1 + 4.8, { grain: 'long' }); // mantel
    for (const Y of [Y0 + 0.5, 17.8, Y1 - 0.5]) B.pbox('fir', X0 - 0.4, X0, Y - 0.15, Y + 0.15, F1 + 4.1, F1 + 4.55, { grain: 'long' });
    lamps.push({ x: wx(X0 - 0.3), y: F1 + 1, z: wz(17.8), power: 0.35, fire: true });
  }
  // Chimneys, rising through the house and out of the roof
  for (const [X0, X1, Y0, Y1] of [[16.9, P1 - 0.3, 14.9, 17.3], [KX + 0.2, KX + 2.2, 27.7, 29.7]]) {
    B.pbox('brick', X0, X1, Y0, Y1, C1 + 0.14, 33.6, { collide: true });
    B.pbox('brick', X0 - 0.15, X1 + 0.15, Y0 - 0.15, Y1 + 0.15, 33.6, 34.0);
    B.pbox('soot', X0 + 0.5, X1 - 0.5, Y0 + 0.5, Y1 - 0.5, 34.0, 34.02);
  }
  B.pbox('brick', KX + 0.2, KX + 2.2, 27.7, 29.7, F1, C1, { collide: true });            // kitchen range flue

  // ---- Stair -------------------------------------------------------------------------
  {
    const N = 15, rise = (F2 - F1) / N, run = (ST.Y1 - ST.Y0) / N;
    for (let i = 0; i < N - 1; i++) {
      const y = ST.Y0 + i * run, top = F1 + (i + 1) * rise;
      B.pbox('fir', ST.X0, ST.X1, y - 0.08, y + run, top - 0.1, top, { grain: 'long' });   // tread, with nosing
      B.pbox('fir', ST.X0, ST.X1, y, y + 0.06, top - rise, top - 0.1, { grain: 'long' });  // riser
      B.pbox('plaster', ST.X0, ST.X1, y + 0.06, y + run, F1, top - 0.1);                   // closed underneath
    }
    B.pbox('fir', ST.X0, ST.X1, ST.Y1 - 0.06, ST.Y1, F2 - rise - 0.1, F2 - 0.24, { grain: 'long' });      // the last riser
    B.pbox('fir', ST.X0, ST.X1, ST.Y1 - 0.1, ST.Y1 + 0.02, F2 - 0.26, F2 + 0.005, { grain: 'long' });       // landing nosing
    B.pbox('plaster', ST.X0, ST.X1, ST.Y1 - run, ST.Y1 - 0.06, F1, F2 - rise - 0.1);
    B.pbox('fir', ST.X0, ST.X1, ST.Y0 - 0.02, ST.Y0 + 0.06, F1, F1 + rise - 0.1, { grain: 'long' });        // first riser sits on the floor
    surfaces.push({ x0: wx(ST.X0), x1: wx(ST.X1), z0: wz(ST.Y1), z1: wz(ST.Y0), h: F1, h2: F2, ramp: true });
    // Open balustrade for the first steps, on the hall side
    B.pbox('fir', ST.X0 - 0.4, ST.X0, ST.Y0 - 0.5, ST.Y0 - 0.1, F1, F1 + 4, { grain: 'long', collide: true });
    B.pbox('fir', ST.X0 - 0.26, ST.X0 - 0.06, ST.Y0, HOLE_Y0, F1 + 3.98, F1 + 4.16, { rot: [Math.atan2(rise, run), 0, 0], grain: 'long' });
    B.block(ST.X0 - 0.2, ST.X0 - 0.1, ST.Y0, HOLE_Y0, F1, F1 + 5);
    for (let y = ST.Y0 + 0.3; y < HOLE_Y0; y += 0.42) {
      const base = F1 + ((y - ST.Y0) / run) * rise;
      B.pbox('fir', ST.X0 - 0.22, ST.X0 - 0.1, y - 0.06, y + 0.06, base, base + 3.35, { grain: 'long' });
    }
    // Guards round the well upstairs
    rail('Y', ST.X0 - 0.15, HOLE_Y0 - 0.3, ST.Y1 - 0.1, F2, { newels: [HOLE_Y0 - 0.15, ST.Y1 - 0.2] });
    rail('X', HOLE_Y0 - 0.15, ST.X0, ST.X1, F2, { newels: [] });
    rail('Y', ST.X1 + 0.1, 12.5, ST.Y1 - 0.1, F2, { newels: [ST.Y1 - 0.2] });
  }

  // ============================================================================
  // Second floor
  // ============================================================================
  const e2 = { h0: F2, h1: C2, t: T };
  const i2 = { h0: F2, h1: C2 };
  const HALL_N = 30.5, B5 = 12.5, B4 = 21, B2 = 14, B3 = 17.4;

  wall({ ...e2, ax: 'X', c: T / 2, a: 0, b: P1, neg: 'ext', pos: 'int', opens: [{ ...WIN, at: 6.1, w: 7.6, n: 3 }] });
  wall({ ...e2, ax: 'X', c: T / 2, a: P1, b: P2, neg: 'ext', pos: 'int', opens: [{ kind: 'win', sill: 0.7, head: 6.8, at: 20.2, w: 6.4, n: 3 }] });
  wall({ ...e2, ax: 'X', c: T / 2, a: P2, b: W, neg: 'ext', pos: 'int', opens: [{ ...WIN, at: 33.0, w: 7.2, n: 3 }] });
  wall({ ...e2, ax: 'Y', c: T / 2, a: 0, b: B2, neg: 'ext', pos: 'int', opens: [{ ...WIN, at: 2.9, w: 6.9, n: 3 }] });
  wall({ ...e2, ax: 'Y', c: T / 2, a: B2, b: B3, neg: 'ext', pos: 'int', opens: [{ ...WIN, at: 15.0, w: 1.4, n: 1 }] });
  wall({ ...e2, ax: 'Y', c: T / 2, a: B3, b: D, neg: 'ext', pos: 'int', opens: [{ ...WIN, at: 19.8, w: 6.9, n: 3 }] });
  wall({ ...e2, ax: 'X', c: D - T / 2, a: 0, b: P1, neg: 'int', pos: 'ext', opens: [{ ...WIN, at: 4.5, w: 7.2, n: 3 }] });
  wall({ ...e2, ax: 'X', c: D - T / 2, a: P1, b: P2, neg: 'int', pos: 'ext', opens: [{ ...HIGH, at: 21.8, w: 3.2, n: 2 }] });
  wall({ ...e2, ax: 'X', c: D - T / 2, a: P2, b: W, neg: 'int', pos: 'ext', opens: [
    { kind: 'gdoor', at: 27.95, w: 2.6, head: 6.9, open: true, hinge: 'b', swing: 'pos', angle: 1.55 },   // out to the sleeping porch
    { ...DOOR, at: 36.2, w: 2.6, hinge: 'a', swing: 'pos', inside: true },                              // dressing room
  ] });
  wall({ ...e2, ax: 'Y', c: W - T / 2, a: 0, b: B5, neg: 'int', pos: 'ext', opens: [{ ...WIN, at: 3.0, w: 7.2, n: 3 }] });
  wall({ ...e2, ax: 'Y', c: W - T / 2, a: B5, b: B4, neg: 'int', pos: 'ext' });
  wall({ ...e2, ax: 'Y', c: W - T / 2, a: B4, b: D, neg: 'int', pos: 'ext', opens: [{ ...WIN, at: 22.6, w: 5.6, n: 2 }] });

  wall({ ...i2, ax: 'Y', c: P1, a: T, b: D - T, neg: 'int', pos: 'int', opens: [
    { ...DOOR, at: 10.2, w: 2.7, hinge: 'b', swing: 'neg' },      // bedroom no. 2
    { ...DOOR, at: 17.9, w: 2.7, hinge: 'b', swing: 'neg' },      // bedroom no. 3
  ] });
  wall({ ...i2, ax: 'X', c: B2, a: T, b: P1 - TP / 2, neg: 'int', pos: 'int' });
  wall({ ...i2, ax: 'X', c: B3, a: T, b: P1 - TP / 2, neg: 'int', pos: 'int' });
  wall({ ...i2, ax: 'Y', c: P2, a: T, b: B5, neg: 'int', pos: 'int' });
  wall({ ...i2, ax: 'X', c: B5, a: P2 - TP / 2, b: W - T, neg: 'int', pos: 'int', opens: [{ ...DOOR, at: 27.85, w: 2.4, hinge: 'b', swing: 'neg' }] });  // no. 5
  wall({ ...i2, ax: 'Y', c: HALL_N, a: B5 + TP / 2, b: B4 - TP / 2, neg: 'int', pos: 'int' });
  wall({ ...i2, ax: 'X', c: B4, a: P1 + TP / 2, b: W - T, neg: 'int', pos: 'int', opens: [
    { ...DOOR, at: 21.6, w: 2.5, hinge: 'a', swing: 'pos' },      // bath
    { ...DOOR, at: 27.85, w: 2.4, hinge: 'a', swing: 'pos' },     // bedroom no. 4
  ] });
  wall({ ...i2, ax: 'Y', c: P2, a: B4 + TP / 2, b: D - T, neg: 'int', pos: 'int' });

  room('Upstairs hall', P1, HALL_N, 0, B4, F2); room('Our bedroom', 0, P1, 0, B2, F2); room('Library', 0, P1, B3, D, F2);
  room('Guest room', P2, W, 0, B5, F2); room('Little bedroom', P2, W, B4, D, F2); room('Bath', P1, P2, B4, D, F2);
  lamp(9.5, 7, F2 + 6.2, 1); lamp(9.5, 24, F2 + 6.2, 1); lamp(35.5, 6, F2 + 6.2, 1); lamp(36, 25.5, F2 + 6.2, 0.9);
  lamp(23.3, 25.5, F2 + 6.2, 0.6); lamp(22, 3.5, F2 + 6.2, 0.6); lamp(26, 19, F2 + 6.2, 0.6);

  // ============================================================================
  // The 1910 addition: sleeping porch and dressing room over the wing
  // ============================================================================
  {
    const top = F2 + 7.7;
    // Dressing room, over the kitchen
    B.pbox('floor', KX, W, D, KIT, F2 - 0.25, F2); B.pbox('ceil', KX, W, D, KIT, C1, C1 + 0.14); surf(KX, W, D, KIT, F2);
    const ad = { h0: F2, h1: top, t: T };
    wall({ ...ad, ax: 'X', c: KIT - T / 2, a: KX, b: W, neg: 'int', pos: 'ext', opens: [{ ...WIN, at: 33.6, w: 6.6, n: 3 }] });
    wall({ ...ad, ax: 'Y', c: W - T / 2, a: D, b: KIT, neg: 'int', pos: 'ext', opens: [{ ...WIN, at: 31.4, w: 2.6, n: 1 }] });
    wall({ ...ad, ax: 'Y', c: KX + T / 2, a: D, b: KIT, neg: 'ext', pos: 'int', opens: [{ ...WIN, at: 31.5, w: 2.4, n: 1 }] });
    B.pbox('ceil', KX + T, W - T, D, KIT - T, top - 0.14, top);
    room('Dressing room', KX, W, D, KIT, F2); lamp(37, 32.7, F2 + 5.8, 0.6);

    // Sleeping porch, over bedroom no. 1: a shingled parapet, posts, and screens all round
    B.pbox('timber', P1, KX, D, BED, F2 - 0.22, F2, { grain: 'long' });
    B.pbox('ceil', P1, KX, D, BED, C1, C1 + 0.14); surf(P1, KX, D, BED, F2);
    const par = { h0: F2, h1: F2 + 2.9, t: T };
    wall({ ...par, ax: 'Y', c: P1 + T / 2, a: D, b: BED, neg: 'ext', pos: 'board' });
    wall({ ...par, ax: 'X', c: BED - T / 2, a: P1, b: KX, neg: 'board', pos: 'ext' });
    wall({ ...par, ax: 'Y', c: KX - T / 2, a: KIT, b: BED, neg: 'board', pos: 'ext' });
    const s0 = F2 + 2.9, s1 = top - 0.6;
    const bay = (ax, c, a, b, n) => {
      const L = (u0, u1, h0, h1, w0, w1, m, o) => ax === 'X' ? B.pbox(m, u0, u1, c + w0, c + w1, h0, h1, o) : B.pbox(m, c + w0, c + w1, u0, u1, h0, h1, o);
      L(a, b, s0, s0 + 0.14, -0.38, 0.38, 'timber', { grain: 'long' });                 // sill cap
      L(a, b, s1, top - 0.14, -0.22, 0.22, 'timber', { grain: 'long' });                // plate
      L(a, b, s0, s1, -0.01, 0.01, 'screen');
      ax === 'X' ? portal(a, b, c - 0.25, c + 0.25, s0, s1, 'z', 'screen') : portal(c - 0.25, c + 0.25, a, b, s0, s1, 'x', 'screen');
      for (let i = 0; i <= n; i++) { const u = a + ((b - a) * i) / n; L(u - 0.19, u + 0.19, s0, s1, -0.19, 0.19, 'timber', { grain: 'long' }); }
      ax === 'X' ? B.block(a, b, c - 0.1, c + 0.1, s0, s1) : B.block(c - 0.1, c + 0.1, a, b, s0, s1);
    };
    bay('Y', P1 + T / 2, D + 0.2, BED - 0.2, 3); bay('X', BED - T / 2, P1 + 0.2, KX - 0.2, 4); bay('Y', KX - T / 2, KIT + 0.2, BED - 0.2, 1);
    B.pbox('timber', P1 + 0.3, KX - 0.3, D, BED - 0.3, top - 0.14, top - 0.06, { grain: 'long' });   // board ceiling
    for (let X = P1 + 1; X < KX; X += 2) timberY(X, D, BED + 2.6, top - 0.14, 0.17, 0.42);
    lamp(25, 34.5, F2 + 5.8, 0.4); room('Sleeping porch', P1, KX, D, BED, F2);

    // One low roof over both, tucked under the main gable
    B.pbox('timber', P1 - 2.6, W + 2.6, D, BED + 2.8, top, top + 0.1, { grain: 'long' });
    B.pbox('roof', P1 - 2.7, W + 2.7, D, BED + 2.9, top + 0.1, top + 0.3);
    for (let X = KX + 1.2; X < W + 2; X += 2) timberY(X, KIT, BED + 2.6, top, 0.17, 0.42);
    for (let Y = D + 1; Y < BED + 2; Y += 2) { timberX(P1 - 2.5, P1, Y, top, 0.17, 0.42); timberX(W, W + 2.5, Y, top, 0.17, 0.42); }
  }

  // ---- Screened porch behind the kitchen -----------------------------------------------
  {
    const fl = F1 - 0.1, top = F1 + 7.9;
    B.pbox('timber', KX, W, KIT, SCR, fl - 0.2, fl, { grain: 'long' }); surf(KX, W, KIT, SCR, fl);
    const low = { h0: 0, h1: fl + 3, t: T };
    wall({ ...low, ax: 'Y', c: KX + T / 2, a: BED, b: SCR, neg: 'ext', pos: 'board' });
    wall({ ...low, ax: 'Y', c: W - T / 2, a: KIT, b: SCR, neg: 'board', pos: 'ext' });
    wall({ ...low, ax: 'X', c: SCR - T / 2, a: KX, b: W, neg: 'board', pos: 'ext', opens: [{ kind: 'cased', at: 35.2, w: 3, head: fl + 6.9 }] });
    const posts = [[KX + 0.25, SCR - 0.25], [W - 0.25, SCR - 0.25], [35.0, SCR - 0.25], [38.4, SCR - 0.25], [KX + 0.25, BED + 0.25], [W - 0.25, KIT + 0.3]];
    for (const [X, Y] of posts) B.pbox('timber', X - 0.2, X + 0.2, Y - 0.2, Y + 0.2, fl + 3, top, { grain: 'long' });
    B.pbox('screen', KX + 0.24, KX + 0.26, BED, SCR, fl + 3, top); B.pbox('screen', W - 0.26, W - 0.24, KIT, SCR, fl + 3, top);
    B.pbox('screen', KX, 35.2, SCR - 0.26, SCR - 0.24, fl + 3, top); B.pbox('screen', 38.2, W, SCR - 0.26, SCR - 0.24, fl + 3, top);
    portal(KX, KX + 0.5, BED, SCR, fl + 3, top, 'x', 'screen'); portal(W - 0.5, W, KIT, SCR, fl + 3, top, 'x', 'screen');
    portal(KX, 35.2, SCR - 0.5, SCR, fl + 3, top, 'z', 'screen'); portal(38.2, W, SCR - 0.5, SCR, fl + 3, top, 'z', 'screen');
    B.pbox('timber', KX - 1.6, W + 2.2, KIT, SCR + 2.2, top, top + 0.1, { grain: 'long' });
    B.pbox('roof', KX - 1.7, W + 2.3, KIT, SCR + 2.3, top + 0.1, top + 0.3);
    for (let X = KX + 0.6; X < W + 1; X += 2) timberY(X, KIT, SCR + 2, top, 0.17, 0.42);
    // Back steps down to the garden
    for (let i = 0; i < 3; i++) B.pbox('timber', 35.0, 38.4, SCR + i * 1.0, SCR + (i + 1) * 1.0, 0, fl - (i + 1) * (fl / 4), { grain: 'long' });
    surfaces.push({ x0: wx(35.0), x1: wx(38.4), z0: wz(SCR + 3), z1: wz(SCR), h: fl, h2: fl / 4, ramp: true });
    room('Screened porch', KX, W, KIT, SCR, fl); lamp(37, 40.8, fl + 6, 1.1); lamp(34, 44, fl + 5, 0.6);
  }

  // ============================================================================
  // Roof
  // ============================================================================
  {
    const hw = W / 2, th = Math.atan(PITCH), cos = Math.cos(th), sin = Math.sin(th);
    const ridge = C2 + 0.14 + hw * PITCH;                 // underside of the roof at the ridge
    const span = hw + OH, len = span / cos, z0 = OHG, z1 = -(D + OHG), zc = (z0 + z1) / 2, dz = z0 - z1;
    for (const sg of [-1, 1]) {
      const layer = (mat, off, thick, extra, o) => {
        const cx = sg * (span / 2) + sg * sin * (off + thick / 2);
        const cy = ridge - (span / 2) * PITCH + cos * (off + thick / 2);
        B.wbox(mat, cx - (len + extra) / 2, cx + (len + extra) / 2, cy - thick / 2, cy + thick / 2, zc - dz / 2 - extra / 2, zc + dz / 2 + extra / 2, { rot: [0, 0, -sg * th], ...o });
      };
      layer('timber', 0.34, 0.08, 0, { swap: true });     // roof boards, seen from below at the eaves
      layer('roof', 0.42, 0.22, 0.25, { swap: true });    // shakes
      // Rafters, their tails showing under the eaves
      for (let z = z1 + 0.6; z < z0; z += 2) {
        const cx = sg * (span / 2) + sg * sin * 0.17, cy = ridge - (span / 2) * PITCH + cos * 0.17;
        B.wbox('timber', cx - len / 2 - 0.4, cx + len / 2 + 0.4, cy - 0.17, cy + 0.17, z - 0.09, z + 0.09, { rot: [0, 0, -sg * th], grain: 'long' });
      }
      // Barge boards at the gables
      for (const z of [z0 + 0.1, z1 - 0.1]) {
        const cx = sg * (span / 2) + sg * sin * 0.1, cy = ridge - (span / 2) * PITCH + cos * 0.1;
        B.wbox('timber', cx - len / 2, cx + len / 2, cy - 0.33, cy + 0.33, z - 0.09, z + 0.09, { rot: [0, 0, -sg * th], grain: 'long' });
      }
    }
    // Purlins and ridge beam, running out past the gables
    for (const x of [-hw + 0.25, -hw / 2, 0, hw / 2, hw - 0.25]) {
      const top = ridge - Math.abs(x) * PITCH - 0.02;
      B.wbox('timber', x - 0.27, x + 0.27, top - 0.85, top, z1 - 1.1, z0 + 1.1, { grain: 'long' });
      for (const z of [z1 - 1.12, z0 + 1.06]) B.wbox('copper', x - 0.29, x + 0.29, top - 0.87, top + 0.02, z, z + 0.06);
    }
    // Gable walls
    const gable = (za, zb) => B.prism('shake', [[-hw, C2], [hw, C2], [hw, C2 + 0.14], [0, ridge], [-hw, C2 + 0.14]], za, zb);
    gable(-T, 0); gable(-D, -D + T);
    for (const [z, s] of [[0, 1], [-D, -1]]) {
      const f = (a, b) => [Math.min(z + s * a, z + s * b), Math.max(z + s * a, z + s * b)];
      B.wbox('timber', -hw - 0.2, hw + 0.2, C2 - 0.1, C2 + 0.45, ...f(0, 0.14), { grain: 'long' });   // belt at the plate
      // Slatted attic vent, flanked by posts
      for (let y = C2 + 2.2; y < C2 + 6.3; y += 0.32) B.wbox('timber', -5, 5, y, y + 0.2, ...f(0, 0.1), { grain: 'long' });
      B.wbox('soot', -5, 5, C2 + 2.1, C2 + 6.3, ...f(0, 0.03));
      for (const x of [-5.2, 5.2]) B.wbox('timber', x - 0.22, x + 0.22, C2 + 0.45, C2 + 6.9, ...f(0, 0.16), { grain: 'long' });
      B.wbox('timber', -5.6, 5.6, C2 + 6.3, C2 + 6.75, ...f(0, 0.18), { grain: 'long' });
    }
    // Belt between the storeys, all round the main block
    B.pbox('timber', -0.09, W + 0.09, -0.09, 0, F2 - 0.55, F2 - 0.1, { grain: 'long' });
    B.pbox('timber', -0.09, 0, 0, D, F2 - 0.55, F2 - 0.1, { grain: 'long' });
    B.pbox('timber', W, W + 0.09, 0, D, F2 - 0.55, F2 - 0.1, { grain: 'long' });
    B.pbox('timber', -0.09, P1, D, D + 0.09, F2 - 0.55, F2 - 0.1, { grain: 'long' });
  }

  // ============================================================================
  // Front porch
  // ============================================================================
  {
    const fl = F1 - 0.15, top = F1 + 8.6, mid = (PA + PB) / 2;
    B.pbox('pavers', PA, PB, -TER, 0, fl - 0.12, fl); B.pbox('brick', PA, PB, -TER, 0, 0, fl - 0.12);
    surf(PA, PB, -TER, 0, fl);
    const steps = 4, tread = 1.15;
    for (let i = 0; i < steps - 1; i++) B.pbox('brick', PA + 1.2, PB - 1.2, -TER - (i + 1) * tread, -TER - i * tread, 0, fl - (i + 1) * (fl / steps));
    surfaces.push({ x0: wx(PA + 1.2), x1: wx(PB - 1.2), z0: wz(-TER), z1: wz(-TER - 3 * tread), h: fl / steps, h2: fl, ramp: true });
    for (const X of [PA, PB]) {
      pier(X, -TER, F1 + 2.9);
      B.pbox('timber', X - 0.27, X + 0.27, -TER - 0.27, -TER + 0.27, F1 + 3.1, top - 0.85, { grain: 'long' });
      timberY(X, -TER - 3.6, 0, top, 0.5, 0.85);                                   // purlins from the house
    }
    timberX(PA - 4.6, PB + 4.6, -TER, top - 0.85, 0.5, 0.7);                       // cross beam on the posts
    for (let X = PA - 4; X <= PB + 4.01; X += 2.2) timberY(X, -TER - 4.4, 0, top + 0.36, 0.2, 0.36);
    B.pbox('timber', PA - 4.6, PB + 4.6, -TER - 3.9, 0, top + 0.36, top + 0.44, { grain: 'long' });
    B.pbox('roof', PA - 4.7, PB + 4.7, -TER - 4.0, 0, top + 0.44, top + 0.6);
    // Deck rail above, outside the tall landing casements
    rail('X', -9, PA + 1.5, PB - 1.5, top + 0.6, { mat: 'timber', top: 2.6, newels: [PA + 1.5, mid, PB - 1.5] });
    rail('Y', PA + 1.5, -9, -0.2, top + 0.6, { mat: 'timber', top: 2.6, newels: [] });
    rail('Y', PB - 1.5, -9, -0.2, top + 0.6, { mat: 'timber', top: 2.6, newels: [] });
    // Hanging lantern
    B.pbox('copper', mid - 0.03, mid + 0.03, -6.03, -5.97, top - 1.5, top);
    B.pbox('copper', mid - 0.55, mid + 0.55, -6.55, -5.45, top - 1.62, top - 1.5);
    B.pbox('glow', mid - 0.38, mid + 0.38, -6.38, -5.62, top - 2.5, top - 1.62);
    B.pbox('copper', mid - 0.42, mid + 0.42, -6.42, -5.58, top - 2.56, top - 2.5);
    lamps.push({ x: wx(mid), y: top - 2.75, z: wz(-6), power: 2.2, kind: 'lamp', halo: 0.6 });      // the porch lantern is a lamp, lit from dusk (lighting.js)
    room('Front porch', PA, PB, -TER, 0, fl);
  }

  // ============================================================================
  // Terrace and pergola, wrapping the south-east corner
  // ============================================================================
  {
    const fl = F1 - 0.4;
    const slab = (X0, X1, Y0, Y1) => { B.pbox('tile', X0, X1, Y0, Y1, fl - 0.1, fl); B.pbox('brick', X0, X1, Y0, Y1, 0, fl - 0.1); surf(X0, X1, Y0, Y1, fl); };
    slab(-TER, 0, -TER, TER); slab(0, PA, -TER, 0);
    const piers = [[-TER, -TER], [-TER, 0], [-TER, TER], [2.4, -TER]];
    for (const [X, Y] of piers) pier(X, Y, fl + 2.6);
    // Timber rails between the piers, as the house has now
    const rails = (ax, c, a, b) => {
      for (const h of [fl + 1.15, fl + 2.2]) ax === 'X' ? timberX(a, b, c, h, 0.3, 0.26) : timberY(c, a, b, h, 0.3, 0.26);
      ax === 'X' ? B.block(a, b, c - 0.1, c + 0.1, 0, fl + 2.3) : B.block(c - 0.1, c + 0.1, a, b, 0, fl + 2.3);
    };
    rails('Y', -TER, -TER + 1.15, -1.15); rails('Y', -TER, 1.15, TER - 1.15);
    rails('X', -TER, -TER + 1.15, 2.4 - 1.15); rails('X', -TER, 2.4 + 1.15, PA - 1.15);
    // Steps off the back of the terrace into the garden
    for (let i = 0; i < 2; i++) B.pbox('brick', -TER + 1.5, -1.5, TER + i * 1.1, TER + (i + 1) * 1.1, 0, fl - (i + 1) * (fl / 3));
    surfaces.push({ x0: wx(-TER + 1.5), x1: wx(-1.5), z0: wz(TER + 2.2), z1: wz(TER), h: fl, h2: fl / 3, ramp: true });

    // Pergola over the south side
    const top = F1 + 8.3;
    for (const Y of [-TER, 0, TER]) B.pbox('timber', -TER - 0.25, -TER + 0.25, Y - 0.25, Y + 0.25, fl + 2.8, top - 0.7, { grain: 'long' });
    timberY(-TER, -TER - 1.6, TER + 1.6, top, 0.5, 0.7);
    timberY(-0.2, -TER - 1.6, TER + 1.6, top, 0.3, 0.7);
    for (let Y = -TER - 1; Y <= TER + 1.01; Y += 2) timberX(-TER - 2.2, 0, Y, top + 0.5, 0.2, 0.5);
    room('Terrace', -TER, 0, -TER, TER, fl); room('Terrace', 0, PA, -TER, 0, fl);
  }

  // Brick walk to the street
  B.pbox('pavers', (PA + PB) / 2 - 3, (PA + PB) / 2 + 3, -62, -TER - 3.4, -0.05, 0.06);

  return { surfaces, rooms, lamps, doors, windows, portals, spawn: { x: wx(21.8), y: F1, z: wz(3.2), yaw: 0 } };      // just inside the front door, in the hall
}
