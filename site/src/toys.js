// Three things in the house that really work:
//   the chess set in the library (you play White; Fig, one of the butlers, plays Black),
//   the telescope on the sleeping porch (look through it; the wheel zooms),
//   the globe in the library (spin it and see where your finger lands).
// Test hooks: ?toy=chess, ?toy=chess:e2e4 (also plays a move), ?toy=scope, ?toy=scope:moon, ?toy=globe.

import * as THREE from 'three';
import { F2 } from './house.js';
import { start, legal, make, status, reply, inCheck, squareName, NAMES } from './chess_rules.js';

const Q = new URLSearchParams(location.search), TOY = Q.get('toy') ?? '';
const note = t => window.houseUI?.toast?.(t);
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private window */ } };

export function setupToys(ctx) {
  const modes = [];                       // each toy may hold the visitor: { active, click(), hint(), leave() }
  ctx.capture = () => { const m = modes.find(m => m.active); if (!m) return false; return m.click?.() ?? false; };
  ctx.hint = () => modes.find(m => m.active)?.hint?.() ?? null;
  // Standing up (any step) ends whatever you were doing
  ctx.animated.push(() => { for (const m of modes) if (m.active && !ctx.walker.seated) { m.active = false; m.leave?.(); } });
  const hold = (m, seat, pitch) => { for (const o of modes) if (o.active && o !== m) { o.active = false; o.leave?.(); } ctx.walker.sit(seat); ctx.walker.pitch = pitch; m.active = true; };

  chess(ctx, modes, hold).catch(e => console.warn('chess', e));
  telescope(ctx, modes, hold);
  globe(ctx);
  import('./jigsaw.js').then(m => m.setupJigsaw(ctx, modes, hold)).catch(e => console.warn('jigsaw', e));      // the jigsaw on the dining table
}

// ------------------------------------------------------------------------------------------
// Chess
// ------------------------------------------------------------------------------------------
async function chess(ctx, modes, hold) {
  const C = new THREE.Vector3(6.6 - 21.665, F2 + 1.7, -25.95);                  // the middle of the round table's top
  const set = await ctx.loadModel('chess_set');
  set.scale.multiplyScalar(0.95); set.position.copy(C);
  const centre = n => new THREE.Box3().setFromObject(n).getCenter(new THREE.Vector3());
  const find = name => { let f = null; set.traverse(n => { if (n.name === name) f = n; }); return f; };
  // Turn the board so that White sits on the side of the chair nearer the middle of the room (+x)
  set.updateMatrixWorld(true);
  { const d = centre(find('piece_king_black')).sub(centre(find('piece_king_white'))); set.rotation.y = Math.atan2(d.z, d.x) + Math.PI; }
  set.updateMatrixWorld(true);
  { const b = new THREE.Box3().setFromObject(set), c = b.getCenter(new THREE.Vector3()); set.position.x += C.x - c.x; set.position.z += C.z - c.z; set.position.y += C.y - b.min.y; }
  set.updateMatrixWorld(true);
  set.traverse(n => { if (n.isMesh) { n.castShadow = false; n.receiveShadow = true; } });
  set.userData.cat = 'model:chess_set'; ctx.scene.add(set); ctx.track?.(set, ctx.zoneAt?.(C.x, C.y, C.z, 1));

  // The squares, measured from the pieces as they stand in the model
  const wk = centre(find('piece_king_white')), wq = centre(find('piece_queen_white')), bk = centre(find('piece_king_black'));
  const fileV = wk.clone().sub(wq).setY(0), rankV = bk.clone().sub(wk).setY(0).multiplyScalar(1 / 7);
  const a1 = wq.clone().addScaledVector(fileV, -3); a1.y = 0;
  const SQ = fileV.length(), fileH = fileV.clone().normalize(), rankH = rankV.clone().normalize();
  const sqPos = sq => a1.clone().addScaledVector(fileV, sq & 7).addScaledVector(rankV, sq >> 3);
  const sqAt = p => { const d = p.clone().sub(a1), f = Math.round(d.dot(fileH) / SQ), r = Math.round(d.dot(rankH) / rankV.length()); return f < 0 || f > 7 || r < 0 || r > 7 ? -1 : r * 8 + f; };

  // Every piece: its node, what it is, where it stood in the model, and where it is now
  const LETTER = { pawn: 'p', knight: 'n', bishop: 'b', rook: 'r', queen: 'q', king: 'k' };
  const pieces = [];
  let top = Infinity;
  set.traverse(n => {
    const m = /^piece_([a-z]+)_(white|black)/.exec(n.name); if (!m) return;
    const box = new THREE.Box3().setFromObject(n), home = box.getCenter(new THREE.Vector3()); home.y = 0; top = Math.min(top, box.min.y);
    const letter = m[2] === 'white' ? LETTER[m[1]].toUpperCase() : LETTER[m[1]];
    pieces.push({ node: n, letter, home, base: n.position.clone(), inv: new THREE.Matrix3().setFromMatrix4(n.parent.matrixWorld).invert(), off: new THREE.Vector3(), goal: new THREE.Vector3(), sq: -1, spare: false });
  });
  // check the model really is a set standing at the start
  { const s0 = start(); for (const p of pieces) { const sq = sqAt(p.home); if (sq < 0 || s0.b[sq] !== p.letter) throw new Error('chess model is not at the starting position: ' + p.node.name); } }
  const spawnQueen = white => {            // a promoted pawn becomes a copy of that side's queen
    const src = pieces.find(p => p.letter === (white ? 'Q' : 'q') && !p.clone), node = src.node.clone(); src.node.parent.add(node);
    const p = { ...src, node, off: new THREE.Vector3(), goal: new THREE.Vector3(), sq: -1, clone: true }; pieces.push(p); return p;
  };

  // The game. Kept between visits; a fresh house finds a game left a few moves in.
  const opening = () => { let s = start(); for (const mv of ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5']) s = make(s, legal(s).find(m => squareName(m.from) + squareName(m.to) === mv)); return s; };
  let game = load('chess', null); if (!game?.b || game.b.length !== 64) game = opening();
  let selected = -1, thinking = false, over = '';
  // Stand every piece where the position says (used at the start and for a new game)
  function layout(snap) {
    const free = pieces.filter(p => !p.clone); for (const p of pieces) { p.sq = -1; if (p.clone) p.node.visible = false; }
    for (let sq = 0; sq < 64; sq++) {
      const L = game.b[sq]; if (!L) continue;
      let i = free.findIndex(p => p.letter === L && sqAt(p.home) === sq); if (i < 0) i = free.findIndex(p => p.letter === L);
      const p = i >= 0 ? free.splice(i, 1)[0] : (pieces.find(q => q.clone && q.letter === L && q.sq < 0) ?? spawnQueen(L === 'Q'));
      p.sq = sq; p.node.visible = true; p.goal.copy(sqPos(sq)).sub(p.home); if (snap) p.off.copy(p.goal);
    }
    for (const p of pieces) if (p.sq < 0) p.node.visible = false;
    const st = status(game); over = st === 'mate' || st === 'stalemate' ? st : '';
  }
  layout(true);
  const at = sq => pieces.find(p => p.sq === sq && p.node.visible);
  function play(m) {
    const p = at(m.from), white = game.turn === 'w', takenSq = m.ep ? m.to + (white ? -8 : 8) : m.to, taken = at(takenSq);
    if (taken) { taken.sq = -1; taken.fade = 1; }
    p.sq = m.to; p.goal.copy(sqPos(m.to)).sub(p.home); p.hop = 1;
    if (m.castle) { const r = at(m.castle === 'k' ? m.to + 1 : m.to - 2), to = m.castle === 'k' ? m.to - 1 : m.to + 1; r.sq = to; r.goal.copy(sqPos(to)).sub(r.home); r.hop = 1; }
    if (m.promo) p.promote = white ? 'Q' : 'q';
    game = make(game, m); save('chess', game);
    const st = status(game); over = st === 'mate' || st === 'stalemate' ? st : '';
    return { piece: NAMES[p.letter.toUpperCase()], taken: taken ? NAMES[taken.letter.toUpperCase()] : '', to: squareName(m.to), st, promo: !!m.promo, castle: m.castle };
  }
  const say = (who, r) => {
    const what = r.castle ? `${who} castle${who === 'You' ? '' : 's'}` : `${who} ${r.taken ? (who === 'You' ? 'take' : 'takes') + ` the ${r.taken} on` : (who === 'You' ? 'move' : 'plays') + ` ${r.piece} to`} ${r.to}`;
    const tail = r.st === 'mate' ? (who === 'You' ? '. Checkmate! Fig bows, deeply.' : '. Checkmate. Fig is insufferably gracious about it.') : r.st === 'stalemate' ? '. Stalemate: a draw.' : r.st === 'check' ? '. Check.' : r.promo ? ', and the pawn becomes a queen.' : '.';
    note(what + tail);
  };
  function figMoves() {
    if (over || game.turn !== 'b') return;
    thinking = true;
    setTimeout(() => { const m = reply(game, 3); thinking = false; if (m && game.turn === 'b') say('Fig', play(m)); }, TOY ? 0 : 900);
  }
  const newGame = () => { game = start(); save('chess', game); selected = -1; layout(false); note('A new game. You are White.'); };

  // Markers: the square you are looking at, the piece you hold, and where it may go
  const flat = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  const mk = (color, opacity) => { const m = new THREE.Mesh(flat, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, toneMapped: false })); m.scale.setScalar(SQ * 0.96); m.rotation.y = Math.atan2(-fileH.z, fileH.x); m.visible = false; m.renderOrder = 3; ctx.scene.add(m); return m; };
  const aimMark = mk(0xffd98a, 0.38), selMark = mk(0xe8a030, 0.55);
  const dots = new THREE.InstancedMesh(new THREE.CircleGeometry(SQ * 0.17, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x2f6a4a, transparent: true, opacity: 0.8, depthWrite: false, toneMapped: false }), 32);
  dots.count = 0; dots.frustumCulled = false; dots.renderOrder = 4; dots.visible = false; ctx.scene.add(dots);
  let targets = [];
  const mtx = new THREE.Matrix4();
  function select(sq) {
    selected = sq; targets = sq < 0 ? [] : legal(game).filter(m => m.from === sq);
    dots.count = targets.length; targets.forEach((m, i) => { const p = sqPos(m.to); dots.setMatrixAt(i, mtx.makeTranslation(p.x, top + 0.006, p.z)); }); dots.instanceMatrix.needsUpdate = true;
    selMark.visible = sq >= 0; if (sq >= 0) { const p = sqPos(sq); selMark.position.set(p.x, top + 0.004, p.z); }
  }

  // Where you are looking on the board
  const ray = new THREE.Raycaster(), mid = new THREE.Vector2(0, 0), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit = new THREE.Vector3();
  let aim = -1;
  const mode = {
    active: false,
    click() {
      if (over) { newGame(); return true; }
      if (thinking || game.turn !== 'w' || aim < 0) return true;
      const mv = targets.find(m => m.to === aim);
      if (mv) { select(-1); say('You', play(mv)); figMoves(); }
      else if (game.b[aim] && game.b[aim] <= 'Z' && aim !== selected) select(aim);
      else select(-1);
      return true;
    },
    hint() {
      if (over) return over === 'mate' ? `checkmate: ${game.turn === 'w' ? 'Fig wins' : 'you win'} · click for a new game` : 'stalemate · click for a new game';
      if (thinking || game.turn !== 'w') return 'Fig is thinking…';
      return (selected >= 0 ? 'look at a marked square and click to move' : `your move${inCheck(game) ? ' (you are in check)' : ''}: look at a white piece and click`) + ' · N new game · step away to stand';
    },
    leave() { select(-1); aimMark.visible = false; dots.visible = false; },
  };
  modes.push(mode);
  const seat = { x: C.x + 2.15, y: C.y + 2.1, z: C.z, yaw: Math.PI / 2, label: 'chess' };
  const sit = () => { hold(mode, seat, -0.74); dots.visible = true; if (game.turn === 'b') figMoves(); };
  ctx.interact.push({ x: C.x, y: C.y + 0.2, z: C.z, reach: 6.5, label: () => 'sit down to the chess game (you are White)', act: sit });
  addEventListener('keydown', e => { if (e.code === 'KeyN' && mode.active) newGame(); });

  ctx.animated.push((t, dt) => {
    // pieces glide to their squares, with a little hop; taken ones sink away
    for (const p of pieces) {
      if (p.fade) { p.fade -= dt * 2.2; if (p.fade <= 0) { p.fade = 0; p.node.visible = false; } }
      const d = p.goal.distanceTo(p.off);
      if (d > 1e-4 || p.hop || p.lift !== (p.sq === selected && selected >= 0 ? 1 : 0) || p.fade) {
        p.off.lerp(p.goal, Math.min(1, dt * 9));
        if (d < 0.004 && p.hop) { p.hop = 0; if (p.promote) { const q = spawnQueen(p.promote === 'Q'); q.sq = p.sq; q.node.visible = true; q.goal.copy(sqPos(q.sq)).sub(q.home); q.off.copy(q.goal); p.sq = -1; p.node.visible = false; p.promote = null; } }
        p.lift = (p.lift ?? 0) + ((p.sq === selected && selected >= 0 ? 1 : 0) - (p.lift ?? 0)) * Math.min(1, dt * 12); if (Math.abs(p.lift) < 0.002) p.lift = 0; else if (p.lift > 0.998) p.lift = 1;
        const up = p.lift * 0.07 + (p.hop ? Math.min(0.09, d * 0.6) : 0) - (p.fade ? 0 : 0);
        const v = new THREE.Vector3(p.off.x, up, p.off.z).applyMatrix3(p.inv);
        p.node.position.copy(p.base).add(v);
        if (p.fade) p.node.scale.setScalar(Math.max(0.01, p.fade)); else if (p.node.scale.x !== 1 && !p.clone) p.node.scale.setScalar(1);
      }
    }
    if (!mode.active) return;
    ray.setFromCamera(mid, ctx.camera); plane.constant = -top;
    aim = ray.ray.intersectPlane(plane, hit) ? sqAt(hit) : -1;
    aimMark.visible = aim >= 0 && !thinking && !over;
    if (aim >= 0) { const p = sqPos(aim); aimMark.position.set(p.x, top + 0.005, p.z); }
  });

  if (TOY.startsWith('chess')) setTimeout(() => {
    sit(); const mv = TOY.split(':')[1];
    if (mv === 'select') select(sqAt(sqPos(11)) >= 0 ? 11 : -1);
    else if (mv) { const m = legal(game).find(m => squareName(m.from) + squareName(m.to) === mv); if (m) { say('You', play(m)); figMoves(); } }
  }, 300);
}

// ------------------------------------------------------------------------------------------
// The telescope
// ------------------------------------------------------------------------------------------
function telescope(ctx, modes, hold) {
  const T = new THREE.Vector3(25.45 - 21.665, F2, -37.6);                       // where the tripod stands, on the sleeping porch
  const eye = { x: T.x, y: F2 + 15, z: T.z - 7, yaw: 0, label: 'telescope' };     // the view is taken from beyond the eaves, so the porch roof never fills the glass
  const ring = document.createElement('div');
  ring.style.cssText = 'position:fixed;inset:0;z-index:3;pointer-events:none;opacity:0;transition:opacity .35s;background:radial-gradient(circle at 50% 50%,transparent 0,transparent 39vmin,rgba(10,7,5,.55) 39.6vmin,#050403 41.5vmin)';
  document.body.appendChild(ring);
  let fov = 9, was = 56;
  const cam = ctx.camera;
  const setFov = v => { fov = Math.max(1.6, Math.min(24, v)); cam.fov = fov; cam.updateProjectionMatrix(); ctx.walker.lookScale = fov / 56; };
  const moonUp = () => ctx.day?.moonUp && ctx.day.moonDir.y > 0.08;
  const mode = {
    active: false,
    hint: () => 'the mouse aims · the wheel (or + and −) brings things closer · step away to stand',
    click: () => true,
    leave() { ring.style.opacity = '0'; cam.fov = was; cam.updateProjectionMatrix(); ctx.walker.lookScale = 1; cam.near = 0.25; },
  };
  modes.push(mode);
  const look = toMoon => {
    was = cam.fov > 30 ? cam.fov : 56;
    hold(mode, eye, 0.12); ring.style.opacity = '1'; setFov(9);
    if (toMoon ?? moonUp()) { const d = ctx.day.moonDir.clone().multiplyScalar(2650).sub(new THREE.Vector3(eye.x, eye.y, eye.z)).normalize(); ctx.walker.yaw = Math.atan2(-d.x, -d.z); ctx.walker.pitch = Math.asin(Math.max(-1, Math.min(1, d.y))); setFov(2.4); note('Someone has left it trained on the moon.'); }
  };
  ctx.interact.push({ x: T.x, y: F2 + 3.2, z: T.z, reach: 6.5, label: () => 'look through the telescope', act: () => look() });
  addEventListener('wheel', e => { if (mode.active) setFov(fov * (e.deltaY > 0 ? 1.12 : 0.89)); }, { passive: true });
  addEventListener('keydown', e => { if (!mode.active) return; if (e.code === 'Equal' || e.code === 'NumpadAdd') { setFov(fov * 0.8); e.stopImmediatePropagation(); } if (e.code === 'Minus' || e.code === 'NumpadSubtract') { setFov(fov * 1.25); e.stopImmediatePropagation(); } }, true);
  ctx.animated.push(() => { if (mode.active && cam.fov !== fov) setFov(fov); });
  if (TOY.startsWith('scope')) setTimeout(() => { look(TOY.endsWith('moon') ? true : false); const z = Number(Q.get('zoom')); if (z) setFov(z); const a = Q.get('aim'); if (a) { const [yaw, pitch] = a.split(',').map(Number); ctx.walker.yaw = yaw; ctx.walker.pitch = pitch; } }, 300);
}

// ------------------------------------------------------------------------------------------
// The globe
// ------------------------------------------------------------------------------------------
const PLACES = [
  ['Cambridge, Massachusetts', 42.4, -71.1], ['Pasadena', 34.1, -118.1], ['Vilnius', 54.7, 25.3], ['Samarkand', 39.7, 66.9], ['Kyoto', 35.0, 135.8], ['Hanoi', 21.0, 105.8],
  ['Reykjavík', 64.1, -21.9], ['Lisbon', 38.7, -9.1], ['Marrakech', 31.6, -8.0], ['Timbuktu', 16.8, -3.0], ['Cairo', 30.0, 31.2], ['Zanzibar', -6.2, 39.2], ['Cape Town', -33.9, 18.4],
  ['Istanbul', 41.0, 29.0], ['Tbilisi', 41.7, 44.8], ['Isfahan', 32.7, 51.7], ['Jaipur', 26.9, 75.8], ['Kathmandu', 27.7, 85.3], ['Lhasa', 29.7, 91.1], ['Ulaanbaatar', 47.9, 106.9],
  ['Lake Baikal', 53.5, 108.0], ['Kamchatka', 56.0, 160.0], ['Vladivostok', 43.1, 131.9], ['Shanghai', 31.2, 121.5], ['Singapore', 1.35, 103.8], ['Bali', -8.4, 115.2], ['Hobart', -42.9, 147.3],
  ['Alice Springs', -23.7, 133.9], ['Wellington', -41.3, 174.8], ['Fiji', -17.7, 178.0], ['Tahiti', -17.6, -149.4], ['Honolulu', 21.3, -157.9], ['Easter Island', -27.1, -109.4], ['the Galápagos', -0.8, -91.1],
  ['Anchorage', 61.2, -149.9], ['Vancouver', 49.3, -123.1], ['Santa Fe', 35.7, -105.9], ['Oaxaca', 17.1, -96.7], ['Havana', 23.1, -82.4], ['New Orleans', 30.0, -90.1], ['Montréal', 45.5, -73.6],
  ['Nuuk', 64.2, -51.7], ['Cartagena', 10.4, -75.5], ['Cusco', -13.5, -72.0], ['Manaus', -3.1, -60.0], ['Rio de Janeiro', -22.9, -43.2], ['Buenos Aires', -34.6, -58.4], ['Patagonia', -47.0, -71.0], ['Tierra del Fuego', -54.5, -68.0],
  ['Edinburgh', 55.95, -3.2], ['Paris', 48.9, 2.35], ['Vienna', 48.2, 16.4], ['Florence', 43.8, 11.25], ['Athens', 38.0, 23.7], ['Stockholm', 59.3, 18.1], ['St Petersburg', 59.9, 30.3], ['Tromsø', 69.6, 19.0],
  ['Addis Ababa', 9.0, 38.75], ['Lagos', 6.5, 3.4], ['Nairobi', -1.3, 36.8], ['the Okavango', -19.3, 22.9], ['Madagascar', -19.0, 46.7], ['Muscat', 23.6, 58.4], ['Sri Lanka', 7.5, 80.7], ['Novosibirsk', 55.0, 82.9],
  ['Svalbard', 78.2, 15.6], ['the South Pole, more or less', -85, 0], ['St Helena', -15.95, -5.7], ['the Azores', 38.5, -28.0], ['Bermuda', 32.3, -64.8], ['Tristan da Cunha', -37.1, -12.3], ['Kerguelen', -49.3, 69.5],
  ['the middle of the Atlantic', 28, -42], ['the South Atlantic', -28, -18], ['the middle of the Pacific', 8, -150], ['the North Pacific', 38, -165], ['the South Pacific', -35, -130], ['the Coral Sea', -17, 155],
  ['the Indian Ocean', -22, 78], ['the Arabian Sea', 14, 64], ['the Bay of Bengal', 14, 88], ['the Southern Ocean', -60, 100], ['the Southern Ocean', -60, -120], ['the Arctic Ocean', 82, -150], ['the Tasman Sea', -38, 160], ['the Philippine Sea', 18, 133], ['the Sahara', 23, 10], ['the Gobi', 43, 104], ['Siberia', 64, 105], ['the Yukon', 64, -136], ['Hudson Bay', 60, -86],
];
function globe(ctx) {
  const G = new THREE.Vector3(4.7 - 21.665, F2 + 2.7, -21.0), R = 0.76;
  const tex = new THREE.TextureLoader().load('assets/tex/globe_antique.jpg'); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const tilt = new THREE.Group(); tilt.position.copy(G); tilt.rotation.z = 0;                      // the stand holds it upright in a horizon ring
  const ball = new THREE.Mesh(new THREE.SphereGeometry(R, 40, 28), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, metalness: 0, envMapIntensity: 0.3 }));
  ball.rotation.y = load('globe', 1.2); ball.receiveShadow = true; tilt.add(ball); tilt.userData.cat = 'extras'; ctx.scene.add(tilt); ctx.track?.(tilt, ctx.zoneAt?.(G.x, G.y, G.z, 1));
  let vel = 0, spinning = false;
  const landing = () => {
    const cam = ctx.camera.position, dx = cam.x - G.x, dz = cam.z - G.z, dist = Math.hypot(dx, dz);
    const lon = THREE.MathUtils.radToDeg(Math.atan2(-dz, dx) - ball.rotation.y);
    const lat = THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(Math.atan2(cam.y - G.y, dist)) * 0.8 + (Math.random() - 0.5) * 80, -70, 75);
    const rad = Math.PI / 180, wrap = d => ((d + 540) % 360) - 180;
    let best = PLACES[0], bd = Infinity;
    for (const p of PLACES) { const d = Math.hypot((p[1] - lat), wrap(p[2] - lon) * Math.cos(lat * rad)); if (d < bd) { bd = d; best = p; } }
    return (bd < 7 ? 'Your finger lands on ' : 'Your finger lands near ') + best[0] + '.';
  };
  const spin = () => { vel += 7 + Math.random() * 6; spinning = true; };
  ctx.interact.push({ x: G.x, y: G.y, z: G.z, reach: 6, label: () => (spinning ? 'spin it again' : 'spin the globe'), act: spin });
  ctx.animated.push((t, dt) => {
    if (!spinning) return;
    ball.rotation.y += vel * dt; vel *= Math.exp(-dt * 0.85);
    if (vel < 0.12) { vel = 0; spinning = false; ball.rotation.y %= Math.PI * 2; save('globe', ball.rotation.y); note(landing()); }
  });
  if (TOY === 'globe') setTimeout(spin, 300);
}
