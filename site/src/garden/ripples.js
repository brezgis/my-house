// Still water that answers a touch: the bowl in the chapel and the bird bath. E on the water sends three rings
// out across it, fading as they reach the rim. Nothing runs unless a ring is moving.
import * as THREE from 'three';

export function rippleLife(ctx, waters) {
  const geo = new THREE.RingGeometry(0.93, 1, 48).rotateX(-Math.PI / 2);
  for (const w of waters) {
    const rings = [0, 1, 2].map(() => {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xeaf4f2, transparent: true, opacity: 0, depthWrite: false, fog: false }));
      m.position.set(w.x, w.y + 0.008, w.z); m.visible = false; m.renderOrder = 2; m.userData.cat = 'ripples'; ctx.scene.add(m); return m;
    });
    let t0 = -1, going = false;
    const run = t => {
      if (t0 < 0) t0 = t;
      let live = false;
      rings.forEach((m, i) => {
        const u = (t - t0 - i * 0.3) / 1.6;
        if (u < 0) { live = true; m.visible = false; return; }
        if (u > 1) { m.visible = false; return; }
        live = true; m.visible = true;
        const s = w.r * (0.06 + 0.92 * u); m.scale.set(s, 1, s); m.material.opacity = 0.55 * (1 - u) * (1 - u);
      });
      if (!live) { going = false; const k = ctx.animated.indexOf(run); if (k >= 0) ctx.animated.splice(k, 1); }
    };
    ctx.interact.push({ x: w.x, y: w.y, z: w.z, reach: w.reach ?? 6, size: Math.min(1, w.r), label: () => 'touch the water',
      act: () => { t0 = -1; if (!going) { going = true; ctx.animated.push(run); } } });
  }
}
