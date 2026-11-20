// Curtains that draw, and shades that let down. Every window's two panels hang gathered at the ends of their rod (kit/soft.js builds them and
// lists them in K.drapery); aim at a window and press E to draw them across it, and again to open them. A panel is
// stretched from its outer edge, where it is fixed, toward the middle of the window, so its folds open out as cloth
// does when it is pulled along a rod. A Roman shade (the kitchen's, over the counters) is one flat panel let down from
// its folds, with the bar along its foot. What is drawn stays drawn on the next visit (kept in this browser).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export function setupDrapes({ scene, materials, life, list, flash, onChange }) {
  const saved = (() => { try { return new Set(JSON.parse(localStorage.getItem('drapes') ?? '[]')); } catch { return new Set(); } })();
  const save = () => { try { localStorage.setItem('drapes', JSON.stringify(all.map((d, i) => (d.to ? i : -1)).filter(i => i >= 0))); } catch { /* private window */ } };
  const all = [], moving = new Set(), p = new THREE.Vector3();
  list.forEach((d, i) => {
    const mat = materials[d.mat] ?? materials.make?.(d.mat) ?? materials.drape, group = new THREE.Group();
    group.matrixAutoUpdate = false; group.matrix.copy(d.frame); group.name = 'drapes'; group.userData.cat = 'drapes';
    let parts = [], blind = null;
    if (d.shade) {      // a Roman shade: one flat panel let down from the top, and the bar along its foot (frame: x along, y out, z up)
      const sh = d.shade, w = sh.half * 2;
      const cloth = new THREE.Mesh(new THREE.BoxGeometry(w, 0.025, 1).translate(0, sh.y, -0.5), mat), bar = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, 0.06).translate(0, sh.y, 0), materials.make?.(d.bar) ?? mat);
      cloth.position.z = sh.top; cloth.castShadow = cloth.receiveShadow = true; bar.castShadow = true; group.add(cloth, bar);
      blind = { cloth, bar, sh };
    } else parts = d.panels.map(pn => {
      const m = new THREE.Mesh(mergeGeometries(pn.cloth, false), mat);
      m.position.x = pn.anchor; m.castShadow = m.receiveShadow = true; group.add(m);
      return { m, wide: Math.max(1, pn.closed / pn.open) };
    });
    group.updateMatrixWorld(true); scene.add(group);
    p.set(...d.at).applyMatrix4(d.frame);
    life.track(group, life.zoneAt(p.x, p.y, p.z, 0.4));
    const it = { group, parts, k: saved.has(i) ? 1 : 0, to: saved.has(i) ? 1 : 0 };
    const set = () => {
      const e = it.k * it.k * (3 - 2 * it.k);
      for (const q of it.parts) { q.m.scale.x = 1 + (q.wide - 1) * e; q.m.updateMatrixWorld(true); }
      if (blind) { const drop = blind.sh.up + (blind.sh.down - blind.sh.up) * e; blind.cloth.scale.z = drop; blind.bar.position.z = blind.sh.top - drop - 0.03; group.updateMatrixWorld(true); }
    };
    set(); all.push(it);
    life.interact.push({ x: p.x, y: p.y, z: p.z, reach: 6.5, size: Math.min(1.6, 0.6 + d.wide * 0.3),
      label: () => (blind ? (it.to ? 'raise the shade' : 'lower the shade') : it.to ? 'open the curtains' : 'draw the curtains'),
      act: () => { it.to = it.to ? 0 : 1; moving.add(it); save(); } });
    it.set = set;
  });
  if (saved.size) onChange?.();
  life.animated.push((t, dt) => {
    if (!moving.size) return;
    for (const it of moving) {
      const step = Math.min(dt, 0.05) / 0.9;      // a little under a second, end to end
      it.k = it.to > it.k ? Math.min(it.to, it.k + step) : Math.max(it.to, it.k - step);
      it.set(); if (it.k === it.to) { moving.delete(it); onChange?.(); }      // (once it has stopped: the sun and the moon come through, or are shut out)
    }
  });
  return { all };
}
