// Drawing only what can be seen. Everything in the scene belongs to a zone:
//
//   'shell'         the house itself: walls (both faces), floors, ceilings, windows, roof.
//                   Always drawn, so the house never looks hollow from anywhere.
//   'r:<room>'      what stands in a room (furniture, books, models, pictures, doors). Split by
//                   size: ':big' (furniture you would see through a window from the garden)
//                   and ':small' (the clutter).
//   'o:<i>,<j>'     the garden, in 160 ft cells (frustum culling does the rest).
//
// Every frame the visitor's room (or 'out') is found, and the rooms seen from it through
// openings (doorways, cased openings, windows, the stairwell, porch screens: house.js
// records them as portals) are found by walking from opening to opening, each one narrowing
// the part of the screen through which the next can be seen. From the garden, rooms are
// drawn through their windows: in full when close, their big furniture further off, and
// only the shell beyond that. The garden is drawn indoors only when a window or outside
// door is in view.

import * as THREE from 'three';

const OUTSIDE = new Set(['Terrace', 'Front porch']);       // room boxes that are really garden
export const CELL = 160;
const BIG = 1.6;                                          // half-diagonal (ft) above which a piece counts as furniture

export function makeVisibility({ rooms, portals, quality = {} }) {
  const R = rooms.filter(r => !OUTSIDE.has(r.name)).map(r => ({ ...r, id: 'r:' + r.name }));
  const ids = [...new Set(R.map(r => r.id))];
  const inRoom = (r, x, y, z, pad = 0, padY = 0) => x >= r.x0 - pad && x <= r.x1 + pad && z >= r.z0 - pad && z <= r.z1 + pad && y >= r.y0 - padY && y <= r.y1 + padY;
  const roomAt = (x, y, z, pad = 0) => R.find(r => inRoom(r, x, y, z, pad));
  // The house's outline, for telling the shell from the garden
  const H = R.reduce((b, r) => ({ x0: Math.min(b.x0, r.x0), x1: Math.max(b.x1, r.x1), z0: Math.min(b.z0, r.z0), z1: Math.max(b.z1, r.z1) }), { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity });
  const inHouse = (x, z, pad = 0) => x >= H.x0 - pad && x <= H.x1 + pad && z >= H.z0 - pad && z <= H.z1 + pad;
  const cellOf = (x, z) => 'o:' + Math.floor(x / CELL) + ',' + Math.floor(z / CELL);

  // Which zone a box (world min/max) belongs to. Room contents must lie wholly inside the
  // room's box (a little slack); anything else in the house's outline is shell.
  const box3 = new THREE.Box3();
  // byCentre: the room the box's centre is in (for whole pieces: models, pictures, rugs).
  function zoneOfBox(b, sized = true, byCentre = false) {
    const cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2;
    const r = byCentre ? roomAt(cx, (b.min.y + b.max.y) / 2, cz)
      : (() => {      // the slack in height lets a low thing on an upstairs floor also fit the room below: prefer the room its middle is in
        const fits = R.filter(r => b.min.x >= r.x0 - 0.2 && b.max.x <= r.x1 + 0.2 && b.min.z >= r.z0 - 0.2 && b.max.z <= r.z1 + 0.2 && b.min.y >= r.y0 - 0.4 && b.max.y <= r.y1 + 1.6), cy = (b.min.y + b.max.y) / 2;
        return fits.find(r => cy >= r.y0 - 0.05 && cy <= r.y1) ?? fits[0];
      })();
    if (r) return sized ? r.id + (b.min.distanceTo(b.max) / 2 > BIG ? ':big' : ':small') : r.id;
    if (inHouse(cx, cz, 0.3) && b.min.y < 40) return 'shell';
    return cellOf(cx, cz);
  }
  // Plain-coloured room contents (the bulk of the triangles) are further split into 8 ft cells,
  // so that a room seen through a doorway draws only the cells inside the doorway's outline.
  const zoner = (g, mat) => {
    g.computeBoundingBox(); const b = g.boundingBox, z = zoneOfBox(b);
    if (mat !== 'vc' || !z.startsWith('r:')) return z;
    return z + '@' + Math.floor((b.min.x + b.max.x) / 16) + ',' + Math.floor((b.min.z + b.max.z) / 16);
  };

  // ---- Portals: which zone lies on each side -------------------------------------------
  const P = [], adj = new Map();
  for (const p of portals) {
    const c = [(p.x0 + p.x1) / 2, (p.y0 + p.y1) / 2, (p.z0 + p.z1) / 2], k = { x: 0, y: 1, z: 2 }[p.n], d = k === 1 ? 1.6 : 1.3;
    const side = s => { const q = [...c]; q[k] += s * d; return roomAt(q[0], q[1], q[2])?.id ?? (k === 1 ? null : 'out'); };
    const a = side(-1), b = side(1);
    if (!a || !b || a === b) continue;
    const e = { a, b, k, at: c[k], box: new THREE.Box3(new THREE.Vector3(p.x0, p.y0, p.z0), new THREE.Vector3(p.x1, p.y1, p.z1)), kind: p.kind, centre: new THREE.Vector3(...c) };
    P.push(e);
    for (const z of [a, b]) { if (!adj.has(z)) adj.set(z, []); adj.get(z).push(e); }
  }

  // ---- Per frame -----------------------------------------------------------------------
  const frustum = new THREE.Frustum(), pv = new THREE.Matrix4(), v = new THREE.Vector4();
  const FULL = [-1, 1, -1, 1];
  function screenRect(box) {                                // NDC rect of a box, or FULL if it reaches behind the eye
    let x0 = 1, x1 = -1, y0 = 1, y1 = -1;
    for (let i = 0; i < 8; i++) {
      v.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z, 1).applyMatrix4(pv);
      if (v.w < 0.3) return FULL;
      const x = v.x / v.w, y = v.y / v.w;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    return [Math.max(-1, x0), Math.min(1, x1), Math.max(-1, y0), Math.min(1, y1)];
  }
  const cut = (a, b) => { const r = [Math.max(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.min(a[3], b[3])]; return r[0] < r[1] && r[2] < r[3] ? r : null; };
  const within = (a, b) => a[0] >= b[0] && a[1] <= b[1] && a[2] >= b[2] && a[3] <= b[3];

  const state = { seen: new Map(), out: true, here: [], eye: new THREE.Vector3(), ms: 0, frames: 0 };
  const REACH_FULL = quality.reachFull ?? 55, REACH_BIG = quality.reachBig ?? 150, MAXD = 4;
  const tmp = new THREE.Vector3();

  function update(camera) {
    const t0 = performance.now();
    camera.updateMatrixWorld();
    pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(pv);
    const eye = state.eye.copy(camera.position), seen = state.seen; seen.clear();
    // Where am I? (more than one room when standing in a doorway)
    const here = R.filter(r => inRoom(r, eye.x, eye.y, eye.z, 0.15, 0.5)).map(r => r.id);
    for (const p of P) if (p.box.distanceToPoint(eye) < 0.9) for (const z of [p.a, p.b]) if (!here.includes(z)) here.push(z);
    if (!here.length) here.push('out');
    const inside = !here.includes('out');
    const queue = [];
    for (const z of here) { seen.set(z, { rect: FULL, level: 2 }); queue.push([z, FULL, 0, 2]); }
    while (queue.length) {
      const [z, rect, d, level] = queue.shift();
      if (d >= MAXD || (z === 'out' && inside)) continue;      // from indoors, the garden is the end of the line
      if (!inside && z !== 'out' && (level < 2 || d >= 2)) continue;   // from outdoors: rooms seen from afar, or two rooms deep, go no further
      for (const p of adj.get(z) ?? []) {
        const other = p.a === z ? p.b : p.a;
        if ((eye.getComponent(p.k) - p.at) * (p.a === z ? -1 : 1) < -0.3) continue;   // the eye is beyond the opening: cannot look through it this way
        if (!frustum.intersectsBox(p.box)) continue;
        const r = cut(rect, screenRect(p.box)); if (!r) continue;
        let lv = level;
        if (!inside && z !== 'out') lv = Math.min(lv, 1);          // from outdoors, a room seen through another: its furniture only
        if (z === 'out') {
          const dist = p.box.distanceToPoint(eye); lv = dist < REACH_FULL ? 2 : dist < REACH_BIG ? 1 : 0;
          if (eye.y < p.box.min.y - 2.5) lv = Math.min(lv, 1);       // looking up into a window from below: only the furniture shows
          if (!lv) continue;
        }
        const was = seen.get(other);
        if (was && was.level >= lv && within(r, was.rect)) continue;
        const merged = was ? { rect: [Math.min(was.rect[0], r[0]), Math.max(was.rect[1], r[1]), Math.min(was.rect[2], r[2]), Math.max(was.rect[3], r[3])], level: Math.max(was.level, lv) } : { rect: r, level: lv };
        seen.set(other, merged);
        queue.push([other, merged.rect, d + 1, merged.level]);
      }
    }
    state.out = seen.has('out');
    state.here = here;
    state.ms += performance.now() - t0; state.frames++;
  }

  // A zone's name taken apart once ('r:Hall:small@0,-2' -> room 'r:Hall', big or not), not every frame
  const parts = new Map();
  const part = zone => {
    let p = parts.get(zone);
    if (!p) { const at = zone.indexOf('@'), z = at > 0 ? zone.slice(0, at) : zone, c = z.indexOf(':', 2); parts.set(zone, p = { room: c > 0 ? z.slice(0, c) : z, big: z.endsWith(':big'), small: z.endsWith(':small'), inRoom: zone.startsWith('r:'), out: zone.startsWith('o:') }); }
    return p;
  };
  // Is a zone to be drawn? level 2: everything; 1: big furniture only.
  function shows(zone) {
    if (!zone || zone === 'shell') return true;
    const p = part(zone);
    if (p.out) return state.out;
    const s = state.seen.get(p.room);
    return !!s && (s.level >= 2 || p.big);
  }
  // Can a box in this zone be seen through the openings that lead to its room?
  function inView(zone, box) {
    if (!zone) return true;
    const p = part(zone);
    if (!p.inRoom) return true;
    const s = state.seen.get(p.room);
    if (!s) return false;
    if (s.rect === FULL) return true;
    return !!cut(s.rect, screenRect(box));
  }
  const isSmall = zone => !!zone && part(zone).small;
  return { zoner, zoneOfBox, inView, isSmall, roomAt, cellOf, update, shows, state, portals: P, ids, inHouse,
    visMs: () => (state.frames ? +(state.ms / state.frames).toFixed(3) : null), resetMs: () => { state.ms = 0; state.frames = 0; } };
}
