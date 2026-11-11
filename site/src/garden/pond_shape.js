// The pond's shape, as plain numbers: where the water is, how deep it is, and
// what stands in it. No three.js here, so the koi's swimming (koi_school.js)
// can be tested on its own with node.
//
// The water's edge is a wobbly ellipse. s is the "normalised radius" of a
// point: 0 at the middle, 1 at the water's edge, the same in every direction.

export const POND = { x: -68, z: 4, rx: 16, rz: 10.5, y: 0.3, bridgeX: -65, deep: 3.4 };

// The edge's wobble at parameter angle a (the same formula is in the shaders of pond_water.js)
export const rim = a => 1 + 0.09 * Math.sin(a * 2 + 0.7) + 0.06 * Math.sin(a * 3 + 2.1) + 0.04 * Math.sin(a * 5 + 0.3);
export function sAt(x, z) {
  const dx = (x - POND.x) / POND.rx, dz = (z - POND.z) / POND.rz;
  return Math.hypot(dx, dz) / rim(Math.atan2(dz, dx));
}
// The point at normalised radius s in direction a
export const at = (a, s = 1) => { const f = rim(a) * s; return [POND.x + Math.cos(a) * POND.rx * f, POND.z + Math.sin(a) * POND.rz * f]; };
export function outline(n = 64, s = 1) { const pts = []; for (let i = 0; i < n; i++) pts.push(at((i / n) * Math.PI * 2, s)); return pts; }

// Depth of the water (feet) at normalised radius s: a planting shelf at the
// edge, a slope, and a deep middle.
const sm = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export function depthAtS(s) {
  if (s >= 1) return 0;
  return 0.75 * sm(1.0, 0.93, s) + (POND.deep - 1.0) * sm(0.88, 0.56, s) + 0.25 * (1 - Math.min(1, s / 0.56));
}
export const depthAt = (x, z) => depthAtS(sAt(x, z));

// z extent of the water at a given x (for the bridge and the colliders)
export function spanAt(x, n = 96) {
  const pts = outline(n); let z0 = Infinity, z1 = -Infinity;
  for (let i = 0; i < n; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % n];
    if ((ax - x) * (bx - x) <= 0 && ax !== bx) { const z = az + (bz - az) * (x - ax) / (bx - ax); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  }
  return [z0, z1];
}

// Things standing in the water that a fish must swim round: [x, z, radius].
// The bridge's four piles, and the old boulders standing in the shallows.
export const BRIDGE = (() => {
  const x = POND.bridgeX, [a, b] = spanAt(x), z0 = a - 2.6, z1 = b + 2.6, w = 2.15;
  return { x, z0, z1, w, rise: 1.55, base: 0.42, piles: [[x - w + 0.2, POND.z - 3.6], [x + w - 0.2, POND.z - 3.6], [x - w + 0.2, POND.z + 3.9], [x + w - 0.2, POND.z + 3.9]], pileR: 0.3 };
})();
export const BOULDERS = [
  // direction round the pond, normalised radius, radius at the waterline, height above water, seed: they stand on the shelf
  [3.05, 0.9, 1.7, 1.3, 3], [3.5, 0.93, 1.0, 0.6, 5], [-0.5, 0.92, 1.3, 0.75, 8], [-1.95, 0.93, 0.95, 0.45, 11], [2.25, 0.95, 0.8, 0.35, 14],
].map(([a, s, r, h, seed]) => [...at(a, s), r, h, seed]);
export const OBSTACLES = [...BRIDGE.piles.map(([x, z]) => [x, z, BRIDGE.pileR]), ...BOULDERS.map(([x, z, r]) => [x, z, r * 1.12])];
