// Photographic materials. Textures are CC0, from Poly Haven and ambientCG
// (see assets/CREDITS.md). `size` is how many feet one texture tile covers.

import * as THREE from 'three';

// Each photo is loaded once and shared: materials that use the same photo at different
// scales get clones, which share one copy in GPU memory. On the lower quality tiers some
// or all photos come from assets/tex/512/, half the size (tools/textures.py makes them).
const shared = new Map();
let texTier = 'full';
export function setTextureTier(t) { texTier = t ?? 'full'; }
export function sharedTexture(file) {
  const half = texTier === 'half' || (texTier === 'detail' && /_(rough|normal)$/.test(file));
  const url = `assets/tex/${half ? '512/' : ''}${file}.jpg`;
  let e = shared.get(url);
  if (!e) {
    e = { clones: [], loaded: false };
    e.base = new THREE.TextureLoader().load(url, () => { e.loaded = true; for (const c of e.clones) c.needsUpdate = true; });
    shared.set(url, e);
  }
  // (a clone is born "needing an update"; until the photo has arrived that only made the renderer
  // warn, every frame, that there was nothing to upload)
  const t = e.base.clone(); if (e.loaded) t.needsUpdate = true; else t.version = 0; e.clones.push(t);
  return t;
}

export function makeMaterials(renderer, quality = {}) {
  const aniso = Math.min(quality.aniso ?? 8, renderer.capabilities.getMaxAnisotropy());

  function tex(file, size, srgb) {
    const t = sharedTexture(file);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    const [su, sv] = Array.isArray(size) ? size : [size, size];
    t.repeat.set(1 / su, 1 / sv);
    t.anisotropy = aniso;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  function pbr(name, size, o = {}) {
    return new THREE.MeshStandardMaterial({
      map: tex(name + '_color', size, true),
      normalMap: tex(name + '_normal', size),
      roughnessMap: o.flat ? null : tex(name + '_rough', size),
      color: o.color ?? 0xffffff,
      roughness: o.roughness ?? 1,
      metalness: 0,
      normalScale: new THREE.Vector2(o.bump ?? 1, o.bump ?? 1),
      envMapIntensity: o.env ?? 1,
    });
  }

  // Indoor surfaces take less of the open-sky light than outdoor ones. NB: three r170 ignores a
  // material's envMapIntensity when the light comes from scene.environment (it uses
  // scene.environmentIntensity for all), so these numbers do nothing; lighting.js cuts the sky
  // light inside the house's walls instead, by where a surface is rather than what it is.
  const IN = 0.09;

  // Plain painted, upholstered or metal surfaces are made on demand from a
  // name: 'c#rrggbb', optionally '/roughness/metalness'. 'e#rrggbb/strength' glows.
  const made = {};
  function make(name) {
    if (made[name]) return made[name];
    if (name === 'vc') {
      // Every plain colour in the house: colour, roughness and metalness come from the vertices
      // (attributes 'color' and 'rm', painted by the Builder), so one material draws them all.
      const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
      m.onBeforeCompile = sh => {
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 rm;\nvarying vec2 vRM;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvRM = rm;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 vRM;')
          .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vRM.x;').replace('#include <metalnessmap_fragment>', 'float metalnessFactor = vRM.y;');
      };
      m.customProgramCacheKey = () => 'vc-rm';
      return (made[name] = m);
    }
    const vc = /^vc\/([\d.]+)\/([01])$/.exec(name);
    if (vc) return (made[name] = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: Number(vc[1]), metalness: Number(vc[2]), envMapIntensity: vc[2] === '1' ? 0.9 : 0.1 }));
    const m = /^([ce])#([0-9a-f]{6})(?:\/([\d.]+))?(?:\/([\d.]+))?$/i.exec(name);
    if (!m) {
      // A textured material in another colour: 'linen#8a9a7b', 'velvet#2f3b52', 'painted_wood#66755e' ...
      const t = /^([a-z_]+)#([0-9a-f]{6})$/i.exec(name);
      if (!t || !all[t[1]]) return null;
      made[name] = all[t[1]].clone(); made[name].color.set(parseInt(t[2], 16)).multiplyScalar(TINT_GAIN[t[1]] ?? 1.5);
      return made[name];
    }
    const color = m[1] === 'e' ? parseInt(m[2], 16) : new THREE.Color(parseInt(m[2], 16)).multiplyScalar(0.78);
    made[name] = m[1] === 'e'
      ? new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: Number(m[3] ?? 1.5), roughness: 0.7 })
      : new THREE.MeshStandardMaterial({ color, roughness: Number(m[3] ?? 0.85), metalness: Number(m[4] ?? 0), envMapIntensity: Number(m[4] ?? 0) > 0.5 ? 0.9 : 0.1 });
    if (m[1] === 'e') glowing(made[name], m[2].toLowerCase());
    return made[name];
  }

  // Lamp glows (bulbs, shade linings, lit fittings, lanterns, string lights) are turned down by day
  // and up after dark by lighting.js: e0 is the full strength, day the fraction left by day. The
  // fridge's light and the garden's own bulbs (which garden.js dims itself) are left alone.
  const glows = [];
  const DAY_GLOW = { ffd9a0: 0.25, ffcf8a: 0.1, fff4e0: 0.12, ffe2b4: 0.06 };
  function glowing(mat, hex) {
    if (['fff1d0', 'ffd49a', 'ffb866'].includes(hex)) return;
    mat.userData.e0 = mat.emissiveIntensity; mat.userData.day = DAY_GLOW[hex] ?? 0.1; glows.push(mat);
  }

  // How much to lift a tint so that it lands near the colour typed (the base photos are mid-toned)
  const TINT_GAIN = { linen: 1.5, wool: 2.2, velvet: 2.4, curtain: 1.2, leather: 2.2, painted_wood: 1.2, wicker: 1.5, oak_light: 1.4, marble: 1.1 };
  const all = {
    make,
    // Outside
    shake: pbr('shake', 7.33, { color: 0xf2d2b6, bump: 1.8, env: 3.2 }),   // 11" to the weather
    roof: pbr('roof', 5.5, { color: 0xc4b4a4, bump: 1.4, env: 1.6 }),
    brick: pbr('brick', 3.3, { color: 0xdcbcac, env: 2 }),
    clinker: pbr('clinker', 3.4, { color: 0xc9b3a6, env: 0.6 }),
    pavers: pbr('pavers', 5, { color: 0xa89384 }),
    tile: pbr('tile', 6, { color: 0xe6cdbd, roughness: 0.85 }),
    timber: pbr('fir', 2.2, { color: new THREE.Color().setRGB(2.9, 5.2, 9.2, THREE.LinearSRGBColorSpace), roughness: 0.88, flat: true, env: 2.6 }),      // the fir photo is near black-red: lifted to a dark weathered brown // dark-stained outside
    grass: pbr('grass', 9, { color: 0xd9dc9c, flat: true, roughness: 1, bump: 0.6 }),
    sash: pbr('fir', 2.2, { color: 0xa48a70, roughness: 0.8, flat: true, env: 0.6 }),
    bark: pbr('bark', 1, { color: 0x9a8f84, bump: 1.5 }),
    hedge: pbr('grass', 3, { color: 0x5d7a4a, bump: 2.5, flat: true, roughness: 1 }),
    soil: new THREE.MeshStandardMaterial({ color: 0x3b2a1f, roughness: 1 }),
    water: new THREE.MeshStandardMaterial({ color: 0x1f3b3a, roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.82, envMapIntensity: 1.6 }),
    shade: new THREE.MeshStandardMaterial({ color: 0xf6e3bd, emissive: 0xffc070, emissiveIntensity: 1.25, roughness: 0.9, side: THREE.DoubleSide }),
    stone: new THREE.MeshStandardMaterial({ color: 0x8f8a80, roughness: 0.95 }),

    // Inside
    floor: pbr('floor', [9, 3.2], { color: 0xfff0d8, roughness: 0.62, env: 0.3, bump: 0.5 }),
    fir: pbr('fir', 2.2, { color: 0xcdb48e, roughness: 0.78, flat: true, env: IN }),
    plaster: pbr('plaster', 7, { color: 0xeadbbb, env: IN, bump: 0.5 }),
    ceil: pbr('plaster', 7, { color: 0xf3ead6, env: IN, bump: 0.35 }),
    door: pbr('fir', [2.2, 2.2], { color: 0xcdb48e, roughness: 0.78, flat: true, env: IN }),
    soot: new THREE.MeshStandardMaterial({ color: 0x15110e, roughness: 1, envMapIntensity: 0.2 }),

    glass: new THREE.MeshStandardMaterial({
      color: 0x56646a, transparent: true, opacity: 0.3, roughness: 0.04, metalness: 0,
      envMapIntensity: 5, depthWrite: false, side: THREE.DoubleSide,
    }),
    screen: new THREE.MeshStandardMaterial({
      color: 0x2a2622, transparent: true, opacity: 0.2, roughness: 1, depthWrite: false, side: THREE.DoubleSide,
    }),
    copper: new THREE.MeshStandardMaterial({ color: 0x4a3426, roughness: 0.5, metalness: 0.8 }),
    glow: new THREE.MeshStandardMaterial({ color: 0xffe2a8, emissive: 0xffb65c, emissiveIntensity: 2.2, roughness: 0.6 }),

    // Upholstery, cloth and furniture surfaces (tile sizes in feet; see assets/tex/TEXTURES.md)
    linen: pbr('linen', 1.3, { color: 0xb9b0a0, env: IN, bump: 1.2 }),
    wool: pbr('wool', 0.9, { color: 0xb4b0aa, env: IN, bump: 1.2 }),
    velvet: pbr('velvet', 0.9, { color: 0xa8a0a0, env: IN }),
    curtain: pbr('curtain', 1.5, { color: 0xb8b2a6, env: IN }),
    leather: pbr('leather', 1.3, { color: 0xb09a88, roughness: 0.9, env: 0.3 }),
    marble: pbr('marble', 3, { color: 0xc9c6c0, roughness: 0.55, env: 0.5 }),
    tile_hex: pbr('tile_hex', 1.5, { color: 0xc4c0b8, env: 0.4 }),
    tile_subway: pbr('tile_subway', 2, { color: 0xc4c0b8, env: 0.4 }),
    painted_wood: pbr('painted_wood', 3, { color: 0xb8b2a4, env: IN }),
    oak_light: pbr('oak_light', 2.5, { color: 0xb8a98e, roughness: 0.8, env: IN }),
    wicker: pbr('wicker', 1.5, { color: 0xb8a98e, env: IN }),
    // Ground
    gravel: pbr('gravel', 6.6, { color: 0xd0cabc, env: 0.8 }),
    flagstone: pbr('flagstone', 6.6, { color: 0xc8c2b6, env: 0.8 }),
    soilbed: pbr('soil', 6.6, { color: 0xb0a090, env: 0.6 }),
    mulch: pbr('mulch', 6.9, { color: 0xb0a090, env: 0.6 }),
    meadow: pbr('meadow', 6.6, { color: 0xc8cc98, flat: true, roughness: 1, env: 0.8 }),
  };
  all.drape = all.curtain.clone(); all.drape.side = THREE.DoubleSide;
  // The lampshade fabric glows from the bulb after dark and is plain cream linen by day
  all.shade.userData.e0 = 0.95; all.shade.userData.day = 0.03; glows.push(all.shade);          // full strength after dark (was 1.25 always: chalk white at night)
  all.glow.userData.e0 = 0.45; all.glow.userData.day = 0.08; glows.push(all.glow);                // the porch lantern's amber glass (was 2.2: blown white)
  all.glows = glows;
  // The Builder paints tints onto vertices: tint(name, hex) is the colour make('name#hex') would
  // have given the material (or the plain material's own colour), and vc(name) the one shared
  // vertex-coloured copy of the material that all of them are drawn with (vcOf; not 'vc',
  // which is the name of the plain-colour material that make('vc') returns).
  const vcs = {};
  all.tint = (name, hex) => (hex === undefined ? all[name].color.clone() : new THREE.Color(hex).multiplyScalar(TINT_GAIN[name] ?? 1.5));
  all.vcOf = name => (vcs[name] ??= Object.assign(all[name].clone(), { vertexColors: true, color: new THREE.Color(1, 1, 1) }));
  return all;
}
