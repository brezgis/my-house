import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Builder } from './builder.js';
import { makeMaterials } from './materials.js';
import { buildHouse } from './house.js';
import { furnish } from './furnish.js';
import * as gardenModule from './garden.js';
const { plantGarden, TREES } = gardenModule;
import { makeTrees } from './trees.js';
import { bringToLife } from './life.js';
import { Walker, eyeHeight, setEyeHeight } from './walk.js';
import { buildSky } from './sky.js';
import { makeSound } from './sound.js';
import { makeAbout } from './about.js';
import { namedView, statsDump, VIEWS } from './perf.js';
import { makeVisibility } from './visibility.js';
import { chooseQuality, rememberSlow, QUALITY_OPTIONS, storedChoice, chooseTier } from './quality.js';
import { setTextureTier } from './materials.js';
import { installHouseLight, setHourLight, makeLampPool, makeExposure, makeWindowGlow, makeVignette, makeHalos } from './lighting.js';

const Q = new URLSearchParams(location.search);
const $ = id => document.getElementById(id);
const lerp = THREE.MathUtils.lerp, clamp = THREE.MathUtils.clamp;
const sound = makeSound();

// ---- Renderer -------------------------------------------------------------------
// Sharpness is traded for speed automatically: the drawing resolution starts
// modest and drops further if the frame rate cannot keep up.
// The quality tier (quality.js) sets the starting resolution, antialiasing, shadow detail
// and texture sizes; ?quality=low|medium|high forces one.
const QUALITY = chooseQuality(Q);
setTextureTier(QUALITY.tex);
const MAX_RATIO = Math.min(devicePixelRatio, Number(Q.get('ratio') ?? QUALITY.ratio));
let ratio = MAX_RATIO;
const renderer = new THREE.WebGLRenderer({ antialias: QUALITY.antialias, powerPreference: 'high-performance' });
renderer.setPixelRatio(ratio);
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = QUALITY.softShadow ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.25, 3000);

// ---- Sky, sun and the hour ---------------------------------------------------------
// The light follows the visitor's own clock (see sky.js).
const sky = buildSky(scene, renderer, new THREE.Vector3(0, 8, -22));
const sun = sky.sun, day = sky.state;
sun.shadow.mapSize.set(QUALITY.shadow, QUALITY.shadow);
const now = new Date();
let hour = Q.has('time') ? Number(Q.get('time')) : now.getHours() + now.getMinutes() / 60;
function setHour(h) {
  sky.setHour(h); hour = day.hour;
  setHourLight(day, materials);
  const hh = Math.floor(hour), mm = String(Math.floor((hour % 1) * 60)).padStart(2, '0');
  const part = hour < 5 ? 'at night' : hour < 12 ? 'in the morning' : hour < 17 ? 'in the afternoon' : hour < 21 ? 'in the evening' : 'at night';
  $('clock').textContent = `${((hh + 11) % 12) + 1}:${mm} ${part}`;
}

// ---- The house, its furniture, garden and trees ---------------------------------------
const builder = new Builder();
builder.zone = 'shell';                                   // the house itself is always drawn (see visibility.js)
const STAGE = {}, mark = k => { STAGE[k] = Math.round(performance.now()); };      // start-up timings, for perf.js
mark('start');
const house = buildHouse(builder); mark('house');
installHouseLight();                                      // indoor light, patched into the shaders before anything compiles (lighting.js)
const { surfaces, rooms, lamps, spawn } = house;
const vis = makeVisibility({ rooms, portals: house.portals ?? [], quality: QUALITY });
builder.zone = null; builder.zoner = vis.zoner;          // furniture and garden go to the zone they stand in
for (const l of lamps) l.kind = l.fire ? 'fire' : (l.kind ?? 'fill');
const items = furnish(builder, house); mark('furnish');
lamps.push(...items.lamps); items.lamps = lamps;
const garden = Q.get('garden') === '0' ? null : plantGarden(builder, items); mark('garden');
const materials = makeMaterials(renderer, QUALITY);
const zoned = builder.finalize(scene, materials); mark('finalize');
// Everything outdoors hangs from one group, hidden whenever no window or outside door is in view.
const outdoors = new THREE.Group(); outdoors.name = 'outdoors'; scene.add(outdoors);

if (Q.get('trees') !== '0') makeTrees(outdoors, materials, builder.colliders, TREES);
mark('trees');

// The ground: a floating island. Lawn on top, a rounded meadow rim, and a rocky
// underside hanging in the clouds. Nothing lies beyond it but sky.
const ISLAND = gardenModule.ISLAND ?? { x: -5, z: -30, r: 250 };
function outlineAt(a) {                                 // smooth radius from ISLAND.outline at angle a
  const o = ISLAND.outline, n = o.length, t = ((a / (Math.PI * 2)) % 1 + 1) % 1 * n, i = Math.floor(t), f = t - i;
  const p0 = o[(i - 1 + n) % n], p1 = o[i % n], p2 = o[(i + 1) % n], p3 = o[(i + 2) % n];
  return 0.5 * ((2 * p1) + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
}
{
  // The island need not be round. garden.js may give ISLAND.outline: radii in feet at equal
  // angles round the centre (angle = atan2(z - centre.z, x - centre.x), starting at 0), which
  // are smoothly joined; otherwise it is a wobbly circle of radius r.
  const N = 160, wob = a => 1 + 0.03 * Math.sin(a * 7 + 2.3) + 0.018 * Math.sin(a * 13 + 0.7);
  const rimR = a => ISLAND.outline ? outlineAt(a) * 1.08 * wob(a) : ISLAND.r * 1.1 * wob(a) * (1 + 0.05 * Math.sin(a * 3 + 1));
  const ring = (scale, y, wob = 0) => Array.from({ length: N }, (_, i) => { const a = (i / N) * Math.PI * 2, r = rimR(a) * scale * (1 + wob * Math.sin(a * 5 + y)); return [ISLAND.x + Math.cos(a) * r, y, ISLAND.z + Math.sin(a) * r]; });
  const strip = (r0, r1, uvScale, vOf) => {                       // a band of triangles between two rings
    const pos = [], uv = [], idx = [];
    for (let i = 0; i < N; i++) { pos.push(...r0[i], ...r1[i]); uv.push(...vOf(r0[i], i, 0, uvScale), ...vOf(r1[i], i, 1, uvScale)); const a = i * 2, b = ((i + 1) % N) * 2; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
  };
  const flatUV = p => [p[0], p[2]], wallUV = (p, i, k, sc) => [(i / N) * 90 * 6.6 / sc, -p[1] * 6.6 / (sc * 1.2)];
  // Top: lawn out to nine-tenths, then long grass rolling over the edge
  const centre = Array.from({ length: N }, () => [ISLAND.x, 0.03, ISLAND.z]);
  const lawn = new THREE.Mesh(strip(centre, ring(0.9, 0.03), 1, flatUV), materials.grass);
  const rim = new THREE.Mesh(strip(ring(0.9, 0.03), ring(1.0, -1.2), 1, flatUV), materials.meadow);
  const lip = new THREE.Mesh(strip(ring(1.0, -1.2), ring(1.015, -9), 6, wallUV), materials.meadow);
  for (const m of [lawn, rim, lip]) { m.receiveShadow = true; m.userData.cat = 'island'; outdoors.add(m); }
  // Underside: rock narrowing to a hanging point
  const rock = materials.flagstone.clone(); rock.color.set(0x8a8478); rock.roughnessMap = null; rock.roughness = 1; rock.normalScale.set(2.2, 2.2);
  const levels = [[1.015, -9, 0], [0.96, -38, 0.03], [0.82, -82, 0.05], [0.62, -128, 0.07], [0.4, -172, 0.09], [0.2, -214, 0.1], [0.04, -250, 0]];
  const under = []; for (let k = 0; k < levels.length - 1; k++) { const [s0, y0, w0] = levels[k], [s1, y1, w1] = levels[k + 1]; under.push(strip(ring(s0, y0, w0), ring(s1, y1, w1), 14, wallUV)); }
  const rockMesh = new THREE.Mesh(mergeGeometries(under), rock); rockMesh.userData.cat = 'island'; outdoors.add(rockMesh);      // one draw for the whole underside
  const soil = new THREE.Mesh(strip(ring(1.012, -3), ring(1.015, -9), 6, wallUV), materials.soilbed); soil.scale.set(1.001, 1, 1.001); soil.userData.cat = 'island'; outdoors.add(soil);
}

mark('island');
const life = bringToLife({ scene, outdoors, vis, quality: QUALITY, renderer, camera, items, garden, materials, doors: house.doors, colliders: builder.colliders, onChange: () => { sun.shadow.needsUpdate = true; } });

// Hooks for the parts of the house that move and answer back. The garden may
// return setup(ctx); the staff (robots, cats) live in staff.js if it exists.
const ctx = { THREE, scene, camera, renderer, materials, house, items, garden, colliders: builder.colliders, interact: life.interact, animated: life.animated, loadModel: life.loadModel, track: life.track, zoneAt: life.zoneAt, sound, day, get walker() { return walker; }, get mode() { return mode; }, get aimed() { return aimed; }, get flashlight() { return torch.intensity > 0; } };
mark('life');
garden?.setup?.(Object.create(ctx, { scene: { value: outdoors } }));      // the garden's own things go in the outdoors group
mark('gardenSetup');
if (Q.get('staff') !== '0') import('./staff.js').then(m => m.hireStaff?.(ctx)).catch(() => {});
import('./tv.js').then(m => m.setupTV(ctx)).catch(e => console.warn('tv', e));
import('./toys.js').then(m => m.setupToys(ctx)).catch(e => console.warn('toys', e));      // chess, telescope, globe
import('./welcome.js').then(m => m.setupWelcome(ctx)).catch(e => console.warn('welcome', e));      // the fade into the hall, the card on the hall table
import('./reticle.js').then(m => m.setupReticle(ctx)).catch(e => console.warn('reticle', e));      // the mark in the middle, and the ring on what it has hold of
if (Q.get('friends') !== '0') import('./friends.js').then(m => m.setupFriends?.(ctx)).catch(() => {});      // the telephone, and the friends it brings round
if (Q.get('hands') !== '0') import('./hands.js').then(m => m.setupHands?.(ctx)).catch(() => {});      // picking things up, taking books down, using the computers

// ---- Lamps ---------------------------------------------------------------------------
// Only four lights are ever lit (three on the low tier), shared out among the lamps nearest
// you, the room you are in first; each fades out before it is moved, so nothing pops. By day
// soft fills stand in for daylight bouncing round the rooms; from dusk the lamps, candles and
// fire take over. Glows, indoor light and the window light are in lighting.js.
const lampPool = makeLampPool({ scene, lamps, vis, size: QUALITY.lamps, day, camera });
const winGlow = makeWindowGlow({ scene: outdoors, materials, windows: house.windows ?? [], rooms });
const vignette = makeVignette();
const halos = makeHalos({ scene, lamps, day });
const exposure = makeExposure(Q);

// ---- Two ways of looking: circling outside, and walking -----------------------------
const WALK_FOV = Number(Q.get('fov') ?? 56);
const walker = new Walker(camera, renderer.domElement, { colliders: builder.colliders, surfaces });
walker.rim = { x: ISLAND.x, z: ISLAND.z, r: ISLAND.r * 0.965, at: ISLAND.outline ? a => outlineAt(a) * 0.965 : null };

// A lantern to carry in the dark (F): a warm glow all round, with the lantern itself
// held low at the edge of view. Its light is one of the lamp pool's four while it is lit.
scene.add(camera);
const torch = { get intensity() { return lampPool.lanternOn ? 1 : 0; } };
const lanternMesh = new THREE.Group();
{
  const brass = new THREE.MeshStandardMaterial({ color: 0x6b5330, roughness: 0.5, metalness: 0.8 }), glow = new THREE.MeshBasicMaterial({ color: 0xffd9a0, toneMapped: false });
  const cage = (y, h, r) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 12), brass); m.position.y = y; lanternMesh.add(m); };
  cage(0.19, 0.03, 0.1); cage(-0.19, 0.04, 0.1); cage(0.26, 0.08, 0.04);
  for (let i = 0; i < 4; i++) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.36, 0.012), brass); p.position.set(Math.cos(i * Math.PI / 2 + 0.78) * 0.095, 0, Math.sin(i * Math.PI / 2 + 0.78) * 0.095); lanternMesh.add(p); }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.008, 6, 16), brass); ring.position.y = 0.36; lanternMesh.add(ring);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), glow); flame.scale.set(0.8, 1.5, 0.8); lanternMesh.add(flame);
  lanternMesh.position.set(0.62, -0.62, -1.25); lanternMesh.visible = false;
}
camera.add(lanternMesh);
if (Q.has('lantern')) { lampPool.setLantern(true, { at: [0.62, -0.42, -1.25] }); lanternMesh.visible = true; }      // ?lantern: lit from the start (test shots)
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.target.set(0, 11, -14); orbit.enableDamping = true; orbit.autoRotate = !matchMedia('(prefers-reduced-motion: reduce)').matches; orbit.autoRotateSpeed = 0.35;
orbit.maxPolarAngle = Math.PI / 2 + 0.25; orbit.minDistance = 40; orbit.maxDistance = 900;
camera.position.set(-34, 12, 58);

if (Q.has('cam')) { camera.position.set(...Q.get('cam').split(',').map(Number)); orbit.autoRotate = false; }      // a fixed outside viewpoint, for test shots
let mode = 'orbit';
function walk(place = true) {
  mode = 'walk'; orbit.enabled = false; walker.enabled = true; camera.fov = WALK_FOV; camera.updateProjectionMatrix();
  if (place) walker.place(spawn.x, spawn.y ?? 0, spawn.z, spawn.yaw);
  document.body.classList.add('walking');
}
function overview() {
  mode = 'orbit'; walker.enabled = false; walker.seated = null; orbit.enabled = true; camera.fov = 42; camera.updateProjectionMatrix();
  camera.position.set(-34, 12, 58); document.exitPointerLock?.(); document.body.classList.remove('walking');
}

const flash = text => { window.houseUI ? window.houseUI.toast(text) : ($('clock').textContent = text); };      // ui.js hook: passing notes go to the toast
sound.onNote = flash;

// The chalkboard: look at it and hold the mouse button to draw; X wipes it.
const ray = new THREE.Raycaster(), mid = new THREE.Vector2(0, 0);
let pressing = false, lastChalk = null, chalkDirty = false, atBoard = false;
addEventListener('mousedown', () => { pressing = true; });
addEventListener('mouseup', () => { pressing = false; lastChalk = null; if (chalkDirty) { life.chalkSave(); chalkDirty = false; } });
function chalking() {
  atBoard = false;
  if (mode !== 'walk' || !life.chalk) return;
  ray.setFromCamera(mid, camera);
  const hit = ray.intersectObject(life.chalk.mesh)[0];
  if (!hit || hit.distance > 8) { lastChalk = null; return; }
  atBoard = true;
  if (pressing) { if (lastChalk) { life.chalkStroke(lastChalk, hit.uv); chalkDirty = true; } lastChalk = hit.uv.clone(); } else lastChalk = null;
}

// Sources and citations (I), also reachable from labels in the house
const about = makeAbout();
life.interact.push({ x: 1.6, y: 6.6, z: -12.2, reach: 8, label: () => 'read about these drawings', act: () => about.show('plans') });

// Things in the rooms that do something when used (rooms list them as kit.spots)
const platters = [];
for (const sp of items.spots ?? []) {
  if (sp.action === 'record') {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.02, 40), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.35 }));
    const lbl = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.022, 24), new THREE.MeshStandardMaterial({ color: 0xb8452e, roughness: 0.7 }));
    disc.add(lbl); disc.position.set(sp.x, sp.y, sp.z); scene.add(disc); platters.push(disc); disc.userData.cat = 'record'; life.track(disc, life.zoneAt(sp.x, sp.y, sp.z, 0.5));
    // The sleeve of the record that is always on first, propped against the wall beside the player
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d');
    g.fillStyle = '#0b0b0d'; g.fillRect(0, 0, 512, 512);
    const gold = g.createLinearGradient(0, 120, 0, 420); gold.addColorStop(0, '#fff3b0'); gold.addColorStop(0.45, '#d4a52a'); gold.addColorStop(0.55, '#8a5f10'); gold.addColorStop(1, '#f0cf6a');
    for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.5})`; const x = Math.random() * 512, y = Math.random() * 512, r = Math.random() * 1.6; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
    g.fillStyle = gold; g.strokeStyle = '#3a2a08'; g.lineWidth = 6;                                  // the house, in gold
    g.beginPath(); g.moveTo(96, 300); g.lineTo(256, 168); g.lineTo(416, 300); g.lineTo(384, 300); g.lineTo(384, 420); g.lineTo(128, 420); g.lineTo(128, 300); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#0b0b0d'; g.fillRect(228, 340, 56, 80); for (const x of [156, 316]) g.fillRect(x, 320, 44, 44);
    g.strokeStyle = gold; g.lineWidth = 9; g.beginPath(); g.arc(256, 150, 150, Math.PI * 0.12, Math.PI * 0.88); g.stroke();      // a chain
    g.font = '900 96px Impact, "Arial Black", sans-serif'; g.textAlign = 'center'; g.lineWidth = 8; g.strokeStyle = '#000'; g.fillStyle = gold;
    g.strokeText('MY HOUSE', 256, 112); g.fillText('MY HOUSE', 256, 112);
    g.font = 'italic 700 34px Georgia, serif'; g.fillStyle = '#f4ead8'; g.fillText("Anna's House Records", 256, 470);
    g.fillStyle = '#fff'; g.fillRect(360, 424, 132, 70); g.fillStyle = '#000'; g.fillRect(364, 428, 124, 62); g.fillStyle = '#fff'; g.font = '900 15px Arial, sans-serif';
    g.fillText('AUNTIE', 426, 446); g.fillText('ADVISORY', 426, 464); g.font = '700 10px Arial, sans-serif'; g.fillText('EXPLICIT COZINESS', 426, 481);
    const cover = new THREE.CanvasTexture(c); cover.colorSpace = THREE.SRGBColorSpace; cover.anisotropy = 8;
    // the sleeve: cover on one face, black card on the other five (two draws rather than six)
    const sg = new THREE.BoxGeometry(1.03, 1.03, 0.025); sg.clearGroups(); sg.addGroup(0, 24, 0); sg.addGroup(24, 6, 1); sg.addGroup(30, 6, 0);
    const sleeve = new THREE.Mesh(sg, [new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.6 }), new THREE.MeshStandardMaterial({ map: cover, roughness: 0.5, envMapIntensity: 0.2 })]);
    sleeve.position.set(sp.x + 0.66, sp.y - 1.9, sp.z - 3.6); sleeve.rotation.set(0, Math.PI / 2, 0); sleeve.rotateX(-0.2); scene.add(sleeve); sleeve.userData.cat = 'record'; life.track(sleeve, life.zoneAt(sp.x + 0.66, sp.y - 1.9, sp.z - 3.6, 0.5));      // leaning on the front of the crate
    life.interact.push({ x: sp.x, y: sp.y, z: sp.z, reach: 6, label: () => `put on another record${sound.nowPlaying() ? ' (now: ' + sound.nowPlaying() + ')' : ''}`, act: () => { sound.start().then(() => flash('now playing: ' + sound.next())); } });
  }
}

let aimed = null;
function use() {
  if (mode !== 'walk') return;
  if (ctx.capture?.()) return;                                   // a game in progress takes the click (toys.js)
  if (walker.seated) { walker.seated = null; return; }
  if (!aimed) { ctx.sip?.(); return; }                           // nothing in front of you: take a sip of what you are holding (staff.js)
  if (aimed.seat) walker.sit(aimed.seat); else aimed.act();
}
const touch = 'ontouchstart' in window;
$('enter').addEventListener('click', () => { walk(); sound.start(); if (!touch) renderer.domElement.requestPointerLock?.(); });
renderer.domElement.addEventListener('click', () => {
  if (mode !== 'walk') return;
  if (!touch && document.pointerLockElement !== renderer.domElement) { renderer.domElement.requestPointerLock?.(); return; }
  use();
});
addEventListener('keydown', e => {
  if (e.code === 'KeyO') mode === 'walk' ? overview() : walk();
  if (e.code === 'KeyI') about.toggle();
  if (e.code === 'Escape' && about.open) about.hide();
  if (about.open) return;
  if (e.code === 'KeyE') use();
  if (e.code === 'KeyF') { lampPool.setLantern(!lampPool.lanternOn, { at: [0.62, -0.42, -1.25] }); lanternMesh.visible = lampPool.lanternOn; flash(lampPool.lanternOn ? 'lantern lit' : 'lantern out'); }
  if (e.code === 'KeyM') flash(sound.toggleMute() ? 'sound off' : 'sound on');
  if (e.code === 'KeyX' && atBoard) life.chalkWipe();
  if (walker.seated?.label?.includes('piano')) { const n = '1234567890'.indexOf(e.key); if (n >= 0) sound.key(n); if (e.code === 'KeyP') sound.playPhrase(); }
  if (e.code === 'BracketRight') setHour(hour + 0.5);
  if (e.code === 'BracketLeft') setHour(hour - 0.5);
  if (e.code === 'Minus' || e.code === 'Equal') { const v = setEyeHeight(eyeHeight() + (e.code === 'Equal' ? 0.1 : -0.1)); flash(`eye height ${Math.floor(v)}'-${Math.round((v % 1) * 12)}"`); }      // ui.js hook: was a direct write to #clock
});

// ?view=x,feetY,z,yaw,pitch drops you somewhere directly (used for test shots); ?at=name uses a named one (perf.js)
function setView(v) {
  if (v.walk) { walk(false); walker.place(...v.walk); }
  else { overview(); orbit.autoRotate = false; camera.position.set(...v.orbit.slice(0, 3)); orbit.target.set(...v.orbit.slice(3)); orbit.update(); }
}
if (Q.has('at') && namedView(Q.get('at'))) { setView(namedView(Q.get('at'))); if (Q.has('view') === false) Q.set('view', '1'); }
else if (Q.has('view')) {
  const [x, y, z, yaw = 0, pitch = 0] = Q.get('view').split(',').map(Number);
  walk(false); walker.place(x, y, z, yaw, pitch);
}
if (Q.has('view') && Q.has('open')) for (const d of house.doors) if (!d.fixed) { d.isOpen = true; d.stop.off = true; }

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ---- What to draw this frame (visibility.js) -------------------------------------------
// When the sun's shadows are to be redrawn, everything is shown for that one frame so that
// rooms and garden out of sight still cast their shadows.
const SMALL_NEAR = 34 * QUALITY.reach;                                 // clutter further off than this is not drawn
for (const m of zoned) { m.geometry.computeBoundingBox(); m.userData.box = m.geometry.boundingBox; }
function cullScene() {
  const all = sun.shadow.needsUpdate || Q.get('cull') === '0';
  vis.update(camera);
  const eye = camera.position;
  for (const m of zoned) { const z = m.userData.zone, b = m.userData.box; m.visible = all || (vis.shows(z) && (!/:small(@|$)/.test(z) || b.distanceToPoint(eye) < SMALL_NEAR) && vis.inView(z, b)); }
  outdoors.visible = all || vis.state.out;
  sky.setOutdoors?.(all || vis.state.out);
  life.cull(all);
  // The household staff (staff.js) move about: each one is drawn only where its room can be seen
  staffGroup ??= scene.children.find(o => o.name === 'staff') ?? null;
  if (staffGroup) for (const o of staffGroup.children) { const p = o.position; o.visible = all || vis.shows(life.zoneAt(p.x, p.y + 1.5, p.z, 0.4)); }
}
let staffGroup;

// ---- Loop -----------------------------------------------------------------------------
const FIRE_AT = new THREE.Vector3(-4.5, 3, -17.8), CLOCK_AT = new THREE.Vector3(3.9, 5, -21.7);
const clock = new THREE.Clock();
let caption = '', frames = 0, since = 0, settled = 0, shown = '', fast = 0, slow = 0;
const OUTDOORS = new Set(['Terrace', 'Front porch']), HALF = new Set(['Sleeping porch', 'Screened porch']);
const fpsBox = Q.has('fps') ? $('room') : null;
setHour(hour);

renderer.setAnimationLoop(() => {
  const raw = clock.getDelta(), dt = Math.min(raw, 0.05), t = clock.elapsedTime;
  let where = 'out';
  if (mode === 'walk') {
    walker.update(dt);
    const p = walker.pos;
    const r = rooms.find(r => p.x >= r.x0 && p.x <= r.x1 && p.z >= r.z0 && p.z <= r.z1 && p.y >= r.y0 && p.y <= r.y1);
    const name = r ? r.name : 'Garden';
    if (name !== caption && !fpsBox) { caption = name; $('room').textContent = name; }
    where = !r || OUTDOORS.has(name) ? 'out' : HALF.has(name) ? 'half' : 'in';
    aimed = walker.seated ? null : life.target(camera);
    chalking();
    const atPiano = walker.seated?.label?.includes('piano');
    const toyHint = ctx.hint?.();
    const text = toyHint ? toyHint : atPiano ? 'keys 1 to 0 play notes · P plays a phrase · step away to stand' : walker.seated ? 'stand up' : aimed ? aimed.label() : atBoard ? 'hold the mouse button to draw · X wipes the board' : '';
    if (text !== shown) { shown = text; $('prompt').innerHTML = text ? (toyHint || atPiano || (atBoard && !aimed && !walker.seated) ? text : `<b>E</b>${text}`) : ''; $('prompt').classList.toggle('on', !!text); }
  } else orbit.update();
  // Eyes adjust: rooms are far dimmer than the garden, and night dimmer still (lighting.js).
  exposure.update(renderer, where, day, dt, Q.has('view'));
  lampPool.update(camera.position, Q.has('view') ? 1 : dt, t);
  winGlow.update(day.night, where === 'out', 1 - THREE.MathUtils.smoothstep(day.light, 0.42, 0.97));      // third: how far the lamps are on (as lighting.js lampOn)
  vignette.set(day.night);
  halos.update(t);
  life.update(t, dt);
  if (sound.nowPlaying()) for (const d of platters) d.rotation.y -= dt * 3.49;      // 33 1/3 rpm
  sound.update(dt, { where, light: day.light, near: { fire: camera.position.distanceTo(FIRE_AT), clock: camera.position.distanceTo(CLOCK_AT) } });
  sky.update(dt, t, camera);
  cullScene();
  renderer.render(scene, camera);
  perf.frames++; perf.lastCalls = renderer.info.render.calls; perf.lastTris = renderer.info.render.triangles;
  if (perf.firstFrameMs === undefined) perf.firstFrameMs = Math.round(performance.now());

  // Keep it quick: if a second of frames runs slow, draw at a lower resolution.
  frames++; since += raw;
  if (since >= 1) {
    const fps = frames / since; frames = 0; since = 0; settled++;
    if (fpsBox) fpsBox.textContent = `${fps.toFixed(0)} fps · ×${ratio.toFixed(2)} · ${QUALITY.name} · ${renderer.info.render.calls} calls · ${(renderer.info.render.triangles / 1000).toFixed(0)}k tris · ${(renderer.info.memory.textures)} tex`;
    if (settled > 3 && fps < 48 && ratio > 0.7 && !Q.has('ratio')) { ratio = Math.max(0.7, ratio - 0.2); renderer.setPixelRatio(ratio); fast = 0; }
    // ...and sharpens again, slowly, when there is time to spare
    fast = fps > 58 ? fast + 1 : 0;
    if (fast >= 4 && ratio < MAX_RATIO && !Q.has('ratio')) { ratio = Math.min(MAX_RATIO, ratio + 0.1); renderer.setPixelRatio(ratio); fast = 0; }
    // Still slow at the lowest resolution: the next visit starts at a lower quality tier
    slow = ratio <= 0.7 && fps < 30 ? slow + 1 : 0;
    if (slow === 8 && !QUALITY.forced) rememberSlow(QUALITY.name);
  }
});

// ---- Measuring (perf.js): ?statsdump visits the test viewpoints and writes the numbers into the page
let loading = 0;
THREE.DefaultLoadingManager.onStart = () => { loading++; };
THREE.DefaultLoadingManager.onProgress = (url, done, total) => { loading = total - done; };
const perf = { quality: QUALITY.name, gpu: QUALITY.gpu, stages: STAGE, visTime: () => vis.visMs(), resetVisTime: () => vis.resetMs(), vis, frames: 0, items, renderer, scene, camera, setView, setHour: h => setHour(h), pending: () => loading + life.pending() };
window.__house = perf;
// Which lamps the pool would light at each test viewpoint, for checking its choices (?statsdump's eval=)
perf.lampChoice = (names = Object.keys(VIEWS), h) => { if (h !== undefined) setHour(h); const out = {}; for (const n of names) { setView(VIEWS[n]); camera.updateMatrixWorld(); vis.update(camera); out[n] = (vis.state.here.join('+') || 'out').replace(/r:/g, '') + ' -> ' + lampPool.choose(camera.position, QUALITY.lamps).map(lampPool.describe).join(', '); } return out; };
if (Q.has('statsdump')) statsDump(perf, Q.get('statsdump') || null, (Q.get('hours') ?? '13,22').split(',').map(Number));

THREE.DefaultLoadingManager.onLoad = () => { sun.shadow.needsUpdate = true; document.body.classList.add('ready'); window.__ready = true; };
if (Q.has('view') || Q.has('shot')) { renderer.domElement.style.transition = 'none'; document.body.classList.add('ready'); }
window.house = { ctx, setHour: h => setHour(h), get hour() { return hour; } };      // ui.js hook: what the settings card needs
// The quality choice for the settings card (quality.js); changing it reloads the page
window.house.quality = { options: QUALITY_OPTIONS, get: () => storedChoice() ?? 'auto', set: v => { chooseTier(v); location.reload(); }, get current() { return QUALITY.name; } };
