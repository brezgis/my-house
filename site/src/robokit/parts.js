// The small things every robot body is made with, in all three places (Anna's House, Vesper Street, Cloud
// Spring Harbor). A robot is a few merged, vertex-coloured meshes sharing one material, so it costs a handful
// of draw calls; these are the helpers that make and colour the pieces. Units are feet; a robot faces +z.
//
// three.js is handed in, not imported, so that each site keeps its own copy of it: call useThree(THREE) once
// before building anything. The other robokit modules read it from here, so one call does for all of them.

import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export let THREE = null;
export function useThree(T) { THREE = T; }

// Colour a geometry: one colour, or a function of the point (a THREE.Vector3) for patterns. It comes back
// non-indexed with position, normal and colour only, so that anything painted merges with anything else.
export function paint(geo, color) {
  const g = geo.index ? geo.toNonIndexed() : geo, n = g.attributes.position.count, a = new Float32Array(n * 3), c = new THREE.Color(), p = new THREE.Vector3();
  for (let i = 0; i < n; i++) {
    if (typeof color === 'function') { p.fromBufferAttribute(g.attributes.position, i); c.set(color(p)); } else c.set(color);
    a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k);
  return g;
}
// Move, turn and stretch a geometry in place: p position, r Euler angles, s scale
export const xform = (geo, { p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1] } = {}) => {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(...p), new THREE.Quaternion().setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...s));
  return geo.applyMatrix4(m);
};
export const merge = list => mergeGeometries(list, false);
let solidMat = null;
// The one material all the bodies share (their colours are in the vertices)
export function solid() {
  return solidMat ??= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38, metalness: 0.12, envMapIntensity: 0.9 });
}
export function mesh(geo, mat = solid()) { const m = new THREE.Mesh(geo, mat); m.castShadow = false; m.receiveShadow = true; return m; }
export const sph = (r, w = 20, h = 14) => new THREE.SphereGeometry(r, w, h);
export const cyl = (r0, r1, h, s = 18) => new THREE.CylinderGeometry(r0, r1, h, s);
// A patch of sphere (the older face screens and shirt fronts; a shell's plate is better: robokit/shell.js)
export function visor(r, phi, th0, th1, scale) {
  const g = new THREE.SphereGeometry(r, 18, 9, Math.PI / 2 - phi, phi * 2, th0, th1 - th0);
  g.scale(...scale);
  return g;
}
