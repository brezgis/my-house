// Working taps. The kit's tap (kit/wood.js) leaves one handle off every tap that has a basin under it
// and lists it in kit.taps; here that handle is hung as its own small mesh, and E turns the tap on
// and off: the handle swings round, a thin thread of water falls from the spout's mouth to the basin
// and spreads in a ring where it lands, and (sound.js) water is heard running nearby. A tap left
// running turns itself off. All the streams share one geometry, one texture and one material, made
// the first time a tap is turned on; nothing here runs per frame unless a tap is on or its handle
// is still swinging back.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const RUNS = 25;          // seconds before a tap left running is turned off

export function setupTaps({ scene, camera, materials, taps, interact, animated, track, zoneAt }) {
  if (!taps?.length) return;
  const sound = v => window.house?.ctx?.sound?.water?.(v);
  let water = null;       // { geo, mat, tex }: the shared thread of water

  function makeWater() {
    // One foot of falling water (stretched to each tap's own fall) and the ring where it lands.
    const fall = new THREE.CylinderGeometry(0.012, 0.009, 1, 6, 1, true).translate(0, -0.5, 0);
    const ring = new THREE.RingGeometry(0.009, 0.085, 12, 1).rotateX(-Math.PI / 2).translate(0, -0.988, 0);
    const paint = (g, alpha) => { const n = g.attributes.position.count, c = new Float32Array(n * 4); for (let i = 0; i < n; i++) c.set([1, 1, 1, alpha(i)], i * 4); g.setAttribute('color', new THREE.BufferAttribute(c, 4)); };
    paint(fall, () => 1);
    const rp = ring.attributes.position, ruv = ring.attributes.uv;
    paint(ring, i => (Math.hypot(rp.getX(i), rp.getZ(i)) < 0.05 ? 1 : 0));                                   // fades to nothing at its rim
    for (let i = 0; i < rp.count; i++) { const r = Math.hypot(rp.getX(i), rp.getZ(i)); ruv.setXY(i, Math.atan2(rp.getZ(i), rp.getX(i)) / 6.2832 + 0.5, r < 0.05 ? 1 : 0.55); }   // ripples run outward
    const geo = mergeGeometries([fall, ring]);
    // Soft bright bands on clear: scrolled down the thread, they are its shimmer; across the ring, its ripples.
    const c = document.createElement('canvas'); c.width = 16; c.height = 64;
    const g = c.getContext('2d'), img = g.createImageData(16, 64);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 16; x++) {
      const v = y / 64 * 6.2832, a = 0.5 + 0.22 * Math.sin(v * 2 + Math.sin(x * 0.785) * 0.9) + 0.18 * Math.sin(v * 5 + x * 0.785) + 0.1 * Math.sin(v * 9 - x * 1.571);
      img.data.set([226, 238, 244, Math.round(255 * Math.max(0.12, Math.min(1, a)))], (y * 16 + x) * 4);
    }
    g.putImageData(img, 0, 0);
    const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshStandardMaterial({ map: tex, vertexColors: true, transparent: true, opacity: 0.62, roughness: 0.12, metalness: 0, depthWrite: false, side: THREE.DoubleSide });
    return { geo, mat, tex };
  }

  const M = new THREE.Matrix4(), live = [];
  for (const t of taps) {
    const base = t.frame.clone().multiply(M.makeTranslation(...t.pivot));
    const handle = new THREE.Mesh(t.geo, materials.make(t.mat)); handle.matrixAutoUpdate = false; handle.matrix.copy(base);
    handle.castShadow = handle.receiveShadow = true; handle.userData.cat = 'taps'; scene.add(handle);
    const mouth = new THREE.Vector3(...t.mouth).applyMatrix4(t.frame), at = new THREE.Vector3(...t.at).applyMatrix4(t.frame);
    const zone = zoneAt(at.x, at.y, at.z, 0.3); track(handle, zone);
    const w = { t, base, handle, mouth, zone, on: false, a: 0, left: 0, stream: null };
    live.push(w);
    interact.push({ x: at.x, y: at.y, z: at.z, reach: 5.5, size: 0.8, label: () => (w.on ? 'turn off the tap' : 'turn on the tap'), act: () => set(w, !w.on) });
  }

  let ticking = false;
  function set(w, on) {
    w.on = on; w.left = RUNS;
    if (on && !w.stream) {
      water ??= makeWater();
      w.stream = new THREE.Mesh(water.geo, water.mat); w.stream.position.copy(w.mouth); w.stream.scale.set(1, w.t.fall, 1);
      w.stream.renderOrder = 3; w.stream.userData.cat = 'taps'; scene.add(w.stream); track(w.stream, w.zone, () => w.on);
    }
    if (w.stream) w.stream.visible = on;
    if (!ticking) { ticking = true; if (!animated.includes(tick)) animated.push(tick); }
  }
  // Runs only while a tap is on (or a handle is still turning): the handles, the shimmer, how near the sound is.
  function tick(t, dt) {
    let busy = false, near = 0;
    for (const w of live) {
      if (w.on && (w.left -= dt) <= 0) set(w, false);
      const aim = w.on ? w.t.turn : 0;
      if (w.a !== aim) {
        w.a = Math.abs(aim - w.a) < 2e-3 ? aim : w.a + (aim - w.a) * Math.min(1, dt * 9);
        w.handle.matrix.copy(w.base).multiply(M.makeRotationZ(w.a)); w.handle.matrixWorldNeedsUpdate = true; busy = true;
      }
      if (w.on) { busy = true; near = Math.max(near, 1 / (1 + (camera.position.distanceTo(w.mouth) / 8) ** 2)); }
    }
    if (water) water.tex.offset.y = (t * 1.7) % 1;
    sound(near);
    if (!busy) { ticking = false; queueMicrotask(() => { const i = animated.indexOf(tick); if (!ticking && i >= 0) animated.splice(i, 1); }); }
  }
}
