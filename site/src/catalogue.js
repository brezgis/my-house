// The Island Catalogue: a fat mail-order catalogue on the shelf of the telephone table in the hall.
// Look through it, fill in the order blank at the back, and in a minute or so Twine the porter
// brings a parcel up the front walk and leaves it on the porch. Untie it; what was ordered is
// yours to carry about, and the staff clear the paper away.
//
//   catalogue/list.js       what is in it, and the words          catalogue/pages.js     the catalogue, open
//   catalogue/engrave.js    its drawings, and the goods' labels   catalogue/goods.js     the things themselves
//   catalogue/delivery.js   Twine, the parcel, the paper          catalogue/owned.js     what this visitor has had
//   catalogue/sparks.js, fireworks.js   glitter and rockets       catalogue/game.js      the game on the disc
// Elsewhere: garden/pond.js (the koi and their glitter), staff/roomba.js (Reginald and his),
// hands/carry.js add() (anything delivered is handled like the rest), hands/screens.js (the pink
// computer's new icon), jigsaw.js and sound.js (the jigsaws and records, once delivered).
//
// Only this file loads with the house: it puts the book on the shelf (one small mesh) and, for a
// visitor who has had things before, sets those back where they were left. Everything else is
// fetched when the catalogue is opened or a parcel comes. One order at a time; nothing is paid;
// what a visitor has is kept in their own browser and is nobody else's.
//
// Test hooks (?catalogue=..., several with commas):
//   open            the catalogue open at its cover      page:3        open at that page (the order blank is the last)
//   order:<id>+<id> that order, Twine at the gate at once        quick     orders take 4 s, not a minute
//   parcel:<id>     the parcel already on the porch       untie         untie it (after parcel: or order:)
//   give:<id>       the thing itself at your feet         hold:<id>     in your hand
//   fireworks       three rockets from where you stand (whatever the hour)
// window.__catalogue has: status(), order(id), owns(id), delivery, things (what has been set out), and the hooks' functions.

import { F1 } from './house.js';
import { wx, wz } from './builder.js';
import { owns, grant, owned, place, placeOf, revoke, left } from './catalogue/owned.js';
import { ITEMS, itemById } from './catalogue/list.js';
import { drawCover } from './catalogue/engrave.js';

const Q = new URLSearchParams(location.search), HOOK = (Q.get('catalogue') ?? '').split(',').filter(Boolean);
const AT = { X: 23.2, Y: 5.94, shelf: 0.745 };            // the telephone table (friends.js AT), and the top of its shelf
const sleep = ms => new Promise(r => setTimeout(r, ms));

export function setupCatalogue(ctx) {
  const { THREE, scene } = ctx;
  const toast = (t, ms) => window.houseUI?.toast?.(t, ms);
  const quick = HOOK.includes('quick');
  const st = { phase: 'idle', items: [], due: 0 };       // idle | ordered | coming | porch
  const things = new Map(), all = [];                     // the kept things by id, and the rest (coffees, rockets), as hands/carry.js add() made them

  // ---- the book on the shelf --------------------------------------------------------------------
  const x = wx(AT.X), z = wz(AT.Y), W = 0.5, D = 0.66, TH = 0.15;
  const c = document.createElement('canvas'); c.width = 260; c.height = 350; const g2 = c.getContext('2d'); drawCover(g2, 260, 350);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  document.fonts?.ready?.then(() => { drawCover(g2, 260, 350); tex.needsUpdate = true; });
  const edge = new THREE.MeshStandardMaterial({ color: 0xe6dcc2, roughness: 0.9 }), spine = new THREE.MeshStandardMaterial({ color: 0x7a2f2a, roughness: 0.7 });
  const book = new THREE.Mesh(new THREE.BoxGeometry(W, TH, D), [edge, spine, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }), edge, edge, edge]);
  // (the table faces west, into the hall: the book lies with its foot toward the hall and sticks out a little, to be seen)
  book.position.set(x - 0.1, F1 + AT.shelf + TH / 2 + 0.002, z + 0.02); book.rotation.y = -Math.PI / 2 + 0.1; book.receiveShadow = true; book.userData.cat = 'telephone';
  scene.add(book); ctx.track?.(book, ctx.zoneAt?.(x, F1 + 1.4, z, 0.6));
  ctx.interact.push({ x: book.position.x - 0.1, y: book.position.y + 0.1, z: book.position.z, reach: 7.5, size: 0.9, label: () => 'look through the catalogue', act: () => { openPages().catch(e => console.warn('catalogue', e)); } });

  // ---- the parts that load later ------------------------------------------------------------------
  let pagesP = null, goodsP = null, deliveryP = null, extraP = null;
  const hands = async () => { for (let n = 0; n < 300 && !window.__hands?.add; n++) await sleep(200); return window.__hands; };
  const getGoods = () => (goodsP ??= import('./catalogue/goods.js').then(m => m.makeGoods(ctx)));
  const getDelivery = () => (deliveryP ??= import('./catalogue/delivery.js').then(m => m.makeDelivery(ctx)));
  // what the jigsaw table and the record crate say about their own (a lid to draw, a title)
  const getExtra = () => (extraP ??= import('./catalogue/parlour.js').then(m => m.parlour(ctx)).catch(() => ({ of: () => null })));
  const C = {
    status: () => ({ phase: st.phase, items: [...st.items] }), owns, get MAX() { return MAX; },
    order: ids => order(ids),
    thumb: it => extra?.of(it.id)?.thumb ?? null,
  };
  let extra = null;
  async function openPages(at = null) {
    extra = await getExtra();
    pagesP ??= Promise.all([import('./catalogue/pages.js'), window.__hands.screens()]).then(([m, s]) => m.makePages(ctx, s, C));
    (await pagesP).open(at);
  }

  // ---- ordering -----------------------------------------------------------------------------------
  // An order is a list of things (MAX lines), sent as one parcel.
  const MAX = 3;                          // one thing at a time: we take it easy here. Only coffees may come up to three together, for guests
  const coffee = id => id.startsWith('coffee-');
  const tidy = ids => { const out = []; if (!ids.every(coffee)) ids = ids.slice(0, 1); for (const id of ids) { const it = itemById(id); if (!it || out.length >= MAX) continue; if ((it.once && owns(id)) || ((it.once || it.keep) && out.includes(id))) continue; out.push(id); } return out; };
  function order(ids, wait = quick ? 4 : 50 + Math.random() * 25) {
    ids = tidy([].concat(ids)); if (!ids.length || st.phase !== 'idle') return false;
    st.phase = 'ordered'; st.items = ids; st.due = performance.now() + wait * 1000;
    getDelivery(); getGoods();                                      // fetched while the order is in the post
    toast('The order is in the post. Listen for the bell at the front door.', 4800);
    setTimeout(() => send(ids), wait * 1000);
    return true;
  }
  async function send(ids) {
    const d = await getDelivery();
    while (d.job) await sleep(500);                                  // (Twine is still on the walk from the last errand)
    st.phase = 'coming';
    const watch = setInterval(() => { if (d.state.phase === 'porch') { st.phase = 'porch'; clearInterval(watch); } }, 300);
    d.bring(where => unwrap(ids, where), ids.length);
  }
  // The parcel is untied: everything in it stands on (and round) its paper, and is the visitor's from now on.
  // Flat things (jigsaw boxes, records, the disc) are stacked at the back; the rest stand in a row in front.
  const listOf = a => (a.length < 2 ? a.join('') : a.slice(0, -1).join(', ') + ' and ' + a.at(-1));
  async function unwrap(ids, where) {
    st.phase = 'idle'; st.items = [];
    const [G] = await Promise.all([getGoods(), hands()]); extra ??= await getExtra();
    const box = new THREE.Box3(), size = new THREE.Vector3(), made = [];
    for (const id of ids) { const m = G.build(id, extra.of(id)); if (!m) continue; box.setFromObject(m.body); box.getSize(size); made.push({ id, m, w: size.x, h: size.y, d: size.z, flat: size.y < 0.2 && size.x > 0.4 }); }
    const flats = made.filter(a => a.flat).sort((a, b) => b.w - a.w), rest = made.filter(a => !a.flat);
    const c = Math.cos(where.yaw), s = Math.sin(where.yaw), at = (x, z, y, yaw = 0) => ({ x: where.x + x * c + z * s, y: where.y + y, z: where.z - x * s + z * c, yaw: where.yaw + yaw });
    const out = []; let top = 0;
    const back = rest.length ? -0.3 : 0;
    for (const [k, a] of flats.entries()) { out.push(await setOut(a.id, at(0.04 * k, back, top, 0.12 * k - 0.1), false, a.m)); top += a.h + 0.004; }
    const total = rest.reduce((n, a) => n + Math.max(a.w, a.d) + 0.1, -0.1); let x = -total / 2;
    for (const a of rest) { const w = Math.max(a.w, a.d) + (rest.length > 1 ? 0.12 : 0); out.push(await setOut(a.id, at(x + w / 2, flats.length ? 0.48 : 0, 0, 0.2), false, a.m)); x += w + 0.1; }
    for (const id of ids) { const it = itemById(id); if (it.once || it.keep) grant(id); if (EMPTY[id]) left(id, USES); }
    const names = out.filter(Boolean).map(t => t.T.n), rec = ids.filter(id => id.startsWith('record-')), jig = ids.some(id => id.startsWith('jigsaw-'));
    let title = ''; for (const id of rec) title = ctx.sound?.putOn?.(id) || title;
    toast(`In the parcel: ${listOf(names)}.${title ? ` Bartholomew has ${title.split(' · ')[0]} on the gramophone before you have read the label.` : ''}${jig ? ' The jigsaw is in the choice of pictures at the dining table now (P).' : ''}`, 4200 + 1400 * ids.length);
    return out.filter(Boolean);
  }
  // Make the thing and stand it at a place (or put it in the hand)
  async function setOut(id, where, hold = false, ready = null) {
    const [G, H] = await Promise.all([getGoods(), hands()]); extra ??= await getExtra();
    if (!H?.add) return null;
    const made = ready ?? G.build(id, extra.of(id)); if (!made) return null;
    const it = itemById(id);
    if (it?.keep) made.T.onDown = (_t, p) => place(id, { x: +p.x.toFixed(3), y: +p.y.toFixed(3), z: +p.z.toFixed(3), yaw: +(p.yaw ?? 0).toFixed(2) });
    if (it?.keep) things.get(id)?.remove?.();                       // (one of each thing that is kept; any number of coffees)
    const thing = H.add(made.T, made.body, { key: id, at: where ? { ...where } : null, hold });
    if (it?.keep) things.set(id, thing); else all.push(thing);
    return thing;
  }
  // The treats run out: five handfuls to a tin, five offerings to a box, and then there is the catalogue again
  const USES = 5, EMPTY = { 'koi-glitter': 'That was the last of the Stardust. The tin is empty, and the koi have noticed. There is more in the catalogue.', 'reginald-treats': 'The box of Reginald Treats is empty. He has checked. There is more in the catalogue.' };
  function used(id) {
    const n = (left(id) ?? USES) - 1;
    if (n > 0) { left(id, n); if (n === 1) toast(id === 'koi-glitter' ? 'The tin is nearly empty: one more handful.' : 'The box is nearly empty: one more offering.', 3600); return n; }
    setTimeout(() => { things.get(id)?.remove?.(); things.delete(id); revoke(id); toast(EMPTY[id] ?? 'That was the last of it.', 5600); }, 2600);
    return 0;
  }
  // The disc has gone into the pink computer (hands.js): it stays there
  ctx.catalogueInsert = id => { things.get(id)?.remove?.(); things.delete(id); grant('game-installed'); };

  // ---- what was had on earlier visits, back where it was left ----------------------------------------
  (async () => {
    const mine = owned().filter(id => itemById(id)?.keep && !(id === 'game-disc' && owns('game-installed')));
    if (!mine.length) return;
    await hands(); const d = await import('./catalogue/delivery.js');
    mine.forEach((id, i) => setOut(id, placeOf(id) ?? { x: d.SPOT.x - 0.5 + (i % 3) * 0.6, y: d.SPOT.y, z: d.SPOT.z - 1.2 - Math.floor(i / 3) * 0.7, yaw: 0.3 * i }).catch(e => console.warn('catalogue', e)));      // (never set down: by the porch steps, where it came)
  })();

  // ---- for the test pages ---------------------------------------------------------------------------
  const api = window.__catalogue = { used, status: C.status, order, owns, grant, revoke, things, setOut, openPages, get delivery() { return deliveryP; }, hooked: false };
  (async () => {
    for (const h of HOOK) {
      const i = h.indexOf(':'), k = i < 0 ? h : h.slice(0, i), a = i < 0 ? '' : h.slice(i + 1);
      if (k === 'open') { await hands(); await openPages(0); }
      else if (k === 'page') { await hands(); await openPages(Number(a)); }
      else if (k === 'order') { st.phase = 'ordered'; st.items = a.split(/[+ ]/); await send(st.items); }
      else if (k === 'parcel') { const d = await getDelivery(); st.phase = 'porch'; st.items = a.split(/[+ ]/); d.drop(where => unwrap(st.items, where), st.items.length); }
      else if (k === 'untie') { const d = await getDelivery(); for (let n = 0; n < 600 && d.state.phase !== 'porch'; n++) await sleep(100); d.open(); await sleep(600); }
      else if (k === 'give' || k === 'hold') { await hands(); const cam = ctx.camera, v = new THREE.Vector3(); cam.getWorldDirection(v); const L = Math.hypot(v.x, v.z) || 1; await setOut(a, k === 'give' ? { x: cam.position.x + v.x / L * 2.6, y: (ctx.walker?.pos?.y ?? cam.position.y - 4.85), z: cam.position.z + v.z / L * 2.6, yaw: 0.4 } : null, k === 'hold'); }
      else if (k === 'fireworks') { const m = await import('./catalogue/fireworks.js'); const fw = ctx.catalogueFireworks ??= m.makeFireworks(ctx); const cam = ctx.camera, v = new THREE.Vector3(); cam.getWorldDirection(v); for (let n = 0; n < 3; n++) { fw.launch(cam.position.x + v.x * 14 + (n - 1) * 10, 0.5, cam.position.z + v.z * 14, v.x, v.z); await sleep(Number(a) || 700); } }
    }
    api.hooked = true;
  })().catch(e => console.warn('catalogue: hook', e));
  return api;
}
