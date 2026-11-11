// The television. A real YouTube player sits on the screen (placed in the room
// with CSS 3D so it lines up with the set), cued with the owner's "amazing
// videos" list. E turns it on and skips to the next video; T turns it off.
// The picture is only shown while you are in front of the set and near it,
// because a web page element cannot be hidden behind walls.

import * as THREE from 'three';
import { CSS3DRenderer, CSS3DObject } from 'three/addons/renderers/CSS3DRenderer.js';

const VIDEOS = ['W92SB_SW9E0', 'VNM7Z7hir_I', 'sKqt6e7EcCs', '9mDngl11P3k', 'Bs8vLmo7Rsc', 'p2HipedgM3I', 'hRlmn_w1qck', 'P6GyeDQTZlk', 'cIGk_I6hLEU', '8cn0kf8mhS4'];

let api = null;
const ytApi = () => (api ??= new Promise(ok => {
  if (window.YT?.Player) return ok();
  const prev = window.onYouTubeIframeAPIReady; window.onYouTubeIframeAPIReady = () => { prev?.(); ok(); };
  const sc = document.createElement('script'); sc.src = 'https://www.youtube.com/iframe_api'; document.head.appendChild(sc);
}));

export function setupTV(ctx) {
  const spots = (ctx.items.spots ?? []).filter(s => s.action === 'tv');
  if (!spots.length) return;
  const css = new CSS3DRenderer();
  css.setSize(innerWidth, innerHeight);
  Object.assign(css.domElement.style, { position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '2' });
  document.body.appendChild(css.domElement);
  addEventListener('resize', () => css.setSize(innerWidth, innerHeight));
  const note = t => { if (window.houseUI) return window.houseUI.toast(t); const el = document.getElementById('clock'); if (el) el.textContent = t; };      // ui.js hook: notes go to the toast

  for (const sp of spots) {
    const PX = 640, el = document.createElement('div');
    el.style.cssText = `width:${PX}px;height:${Math.round(PX * sp.h / sp.w)}px;background:#000;`;
    const slot = document.createElement('div'); el.appendChild(slot);
    const obj = new CSS3DObject(el);
    obj.position.set(sp.x, sp.y, sp.z); obj.rotation.y = sp.rotY; obj.scale.setScalar(sp.w / PX); obj.visible = false;
    ctx.scene.add(obj);
    const facing = new THREE.Vector3(Math.sin(sp.rotY), 0, Math.cos(sp.rotY)), to = new THREE.Vector3();
    let on = false, player = null, index = Math.floor(Math.random() * VIDEOS.length), shown = false;

    const start = async () => {
      on = true; el.style.display = ''; ctx.sound.setDuck?.(true);
      await ytApi();
      if (!player) {
        player = new window.YT.Player(slot, {
          width: PX, height: Math.round(PX * sp.h / sp.w), videoId: VIDEOS[index], host: 'https://www.youtube-nocookie.com',
          playerVars: { autoplay: 1, rel: 0, playsinline: 1, controls: 0, modestbranding: 1 },
          events: {
            onReady: e => { e.target.setVolume(45); e.target.playVideo(); },
            onStateChange: e => { if (e.data === 0) next(); },
            onError: () => next(),
          },
        });
      } else player.playVideo?.();
    };
    const next = () => { index = (index + 1) % VIDEOS.length; player?.loadVideoById?.(VIDEOS[index]); };
    const off = () => { on = false; player?.pauseVideo?.(); obj.visible = false; shown = false; css.render(ctx.scene, ctx.camera); el.style.display = 'none'; ctx.sound.setDuck?.(false); note('television off'); };

    ctx.interact.push({ x: sp.x, y: sp.y, z: sp.z, reach: 8.5, label: () => (on ? 'next video · T turns the television off' : 'turn on the television'), act: () => { if (on) next(); else start(); } });
    addEventListener('keydown', e => { if (e.code === 'KeyT' && on) off(); });

    ctx.animated.push(() => {
      if (!on) return;
      const cam = ctx.camera.position; to.set(cam.x - sp.x, 0, cam.z - sp.z);
      const d = to.length(), inFront = to.normalize().dot(facing) > 0.25, sameFloor = Math.abs(cam.y - sp.y) < 6;
      const see = ctx.mode === 'walk' && d < 20 && inFront && sameFloor;
      if (see !== shown) { shown = see; obj.visible = see; if (!see && d > 34) player?.pauseVideo?.(); if (see) player?.playVideo?.(); }
      if (see) css.render(ctx.scene, ctx.camera);
    });
  }
}
