// The gardeners: Bramble and Thistle, the outdoor branch of the family. Same
// manners as the house staff (they are Robots, see robots.js): unhurried, they
// turn to you to speak and hold still until you are done, keep a polite 5-6 ft,
// and only one robot attends you at a time. Outside, the policy is theirs:
//
//   - she steps outside: after a few moments the better-placed gardener greets her,
//     then lingers nearby, remarking on the season, the bees, the light
//   - asked for something, they pick it (a strawberry, a tomato, a sweet pea)
//     or fetch a lemonade from the kitchen door, and bring it in a trug
//   - otherwise their work: watering the beds, deadheading, the wheelbarrow
//     (Thistle), the hives, feeding the koi, a sit on a bench, looking out
//     from the rim; at night Bramble tucks herself by the glasshouse and
//     Thistle by the back porch, waking for a visitor with a lantern.

import { Robot } from './robots.js';
import { weighted } from './agent.js';
import { buildGardener, buildBarrow, GARDENER_SPECS } from './models.js';
import { GARDEN_GIFTS } from './drinks.js';
import { VOICE, GARDEN_FACTS, SEASON, PLACES } from './lines.js';
import { POND } from '../garden/pond.js';
import { ISLAND } from '../garden.js';

const TRAITS = {
  bramble: { host: 1.0, greeter: 2, chat: 1, rest: 0.7, home: 0, likes: [], work: { water: 6, deadhead: 4, hives: 1.5, koi: 2, bench: 2, rim: 1.5, ponder: 1 } },
  thistle: { host: 0.6, greeter: 1, chat: 0.7, rest: 0.8, home: 0, likes: [], work: { water: 3, deadhead: 2, cart: 5, hives: 4, koi: 3, bench: 2, rim: 2, ponder: 1 } },
};
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

// Where the work is, found on the garden's own plan at run time
export function gardenSpots(out, ctx) {
  const S = { beds: [], borders: [], hives: [], pond: [], benches: [], rim: [] };
  const snap = (x, z, r = 5, need = 1.2) => { const c = out.nearest(0, x, z, need, r); return c < 0 ? null : { x: out.cx(c), z: out.cz(c) }; };
  // raised beds in the potager: solid boxes about 2.4 ft high
  for (const c of ctx.colliders) {
    if (c.staff || c.x0 < 25 || c.x1 > 67 || c.z0 < -105 || c.z1 > -55 || Math.abs(c.y1 - 2.4) > 0.05 || (c.x1 - c.x0) * (c.z1 - c.z0) < 6) continue;
    const fx = (c.x0 + c.x1) / 2, fz = (c.z0 + c.z1) / 2, p = snap(fx, fz, 6); if (p) S.beds.push({ ...p, fx, fz });
  }
  for (const [x, z, fx, fz] of [[9, -60, 2, -60], [9, -75, 2, -75], [9, -95, 2, -95], [9, -112, 2, -112], [2, 30, 8.5, 30], [-12, 40, -6.5, 40], [-14, 55, -6.5, 52], [-19, 20, -19, 14.6]]) { const p = snap(x, z, 4); if (p) S.borders.push({ ...p, fx, fz }); }
  for (const h of ctx.garden?.hives ?? []) { const p = snap(h.x - 4, h.z, 4); if (p) S.hives.push({ ...p, fx: h.x, fz: h.z }); }
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, p = snap(POND.x + Math.cos(a) * (POND.rx + 4.5), POND.z + Math.sin(a) * (POND.rz + 4.5), 3); if (p) S.pond.push({ ...p, fx: POND.x, fz: POND.z }); }
  for (const s of ctx.items?.seats ?? []) {
    if (s.y > 4.5 || (s.x > -36 && s.x < 24 && s.z > -50 && s.z < 15)) continue;
    const p = snap(s.x, s.z, 4); if (!p) continue;
    const rimSeat = Math.hypot(s.x - ISLAND.x, s.z - ISLAND.z) > ISLAND.r * 0.75;
    (rimSeat ? S.rim : S.benches).push({ ...p, fx: s.x - Math.sin(s.yaw) * 8, fz: s.z - Math.cos(s.yaw) * 8 });
  }
  for (const a of [0.3, 1.9, 3.3, 4.6]) { const d = ISLAND.r - 22, p = snap(ISLAND.x + Math.cos(a) * d, ISLAND.z + Math.sin(a) * d, 6); if (p) S.rim.push({ ...p, fx: ISLAND.x + Math.cos(a) * (ISLAND.r + 40), fz: ISLAND.z + Math.sin(a) * (ISLAND.r + 40) }); }
  S.kitchenDoor = snap(15, -54, 6); if (S.kitchenDoor) Object.assign(S.kitchenDoor, { fx: 15, fz: -46 });
  S.night = { bramble: snap(46, -104, 5), thistle: snap(17, -58, 6) ?? snap(22, -60, 8) };
  return S;
}

export class Gardener extends Robot {
  constructor(H, key, i, out) {
    super(H, key, i, { body: buildGardener(key), spec: GARDENER_SPECS[key], traits: TRAITS[key], nav: out, need: 1.2 });
    this.outdoor = true; this.memKey = 'gGreeted';
    if (key === 'thistle') { this.barrow = buildBarrow(); H.group.add(this.barrow); this.barrow.position.set(40, 0, -60); }
  }
  inDomain() { const v = this.H.visitor; return v.present && v.outside; }
  seeGuest() { const v = this.H.visitor; return this.nav.see(0, this.x, this.z, v.x, v.z); }
  helpDoors() {}
  lookTarget() { return this.pointAt && this.H.now < this.pointAt.until ? this.pointAt : null; }
  get spots() { return this.H.gspots; }
  wantsToGreet() {
    const H = this.H, v = H.visitor;
    if (!this.inDomain() || H.host || H.now - v.outSince < 4 || H.now - this.greetedAt < 300 || H.now - H.lastHostEnd < 45) return false;
    const d = this.visitorDist(); if (d > 45 || !this.seeGuest()) return false;
    return !H.gardeners.find(g => g !== this && g.interruptible && g.traits.greeter > this.traits.greeter && g.visitorDist() < d + 15);
  }
  think() {
    const H = this.H, R = H.rnd, v = H.visitor, night = H.day.light < 0.3;
    if (this.carrying) return this.run('deliver', this.deliver(), false);
    if (this.wantsToGreet()) return this.run('greet', this.greet(), false);
    const empty = H.empties.find(e => !e.claimed && e.outside);
    if (empty && (!H.host || H.host === this)) { empty.claimed = this; return this.run('clear', this.clear(empty), false); }
    if (night && !this.inDomain()) return this.run('tuck', this.tuck());
    const w = this.traits.work, opts = [
      ...Object.entries(w).map(([k, x]) => [k, x * (night ? (['bench', 'rim', 'ponder'].includes(k) ? 1.5 : 0.3) : 1)]),
    ].map(([k, x]) => [k, x * (0.55 + R() * 0.9)]);
    const k = weighted(opts, R) ?? 'water';
    if (k === 'host') { H.host = this; return this.run('host', this.host(false), false); }
    this.run(k, this.orLinger(this[k]()));
  }

  // ---- talking ---------------------------------------------------------------------------------
  dialogue() {
    const H = this.H, v = H.visitor, mem = H.mem, out = [];
    const reply = (pool, opts) => () => { this.line(pool, opts); return null; };
    if (this.fetching) out.push({ text: `How's my ${this.fetching.name} coming?`, act: reply('busy') });
    else if (v.holding) out.push({ text: `This ${v.holding.name} is lovely.`, act: reply('enjoying', { extra: { drink: v.holding.name }, expr: 'love' }) });
    else out.push({ text: 'Could I have something from the garden?', act: () => {
      this.line('hello', { expr: 'happy' });
      const picks = GARDEN_GIFTS.filter(g => g.gift).sort(() => H.rnd() - 0.5).slice(0, 2);
      return [...picks, GARDEN_GIFTS.find(g => g.id === 'lemonade')].map(d => ({ text: d.id === 'lemonade' ? 'A glass of lemonade, please.' : `A ${d.name}, please.`, act: () => { this.order(d); return null; } }));
    } });
    const topics = [];
    if (H.day.light < 0.35 && !mem.asked.has('gdark')) topics.push(["It's dark out here.", () => { mem.asked.add('gdark'); this.line(H.ctx.flashlight ? 'lantern' : 'dark', { expr: 'wink' }); return null; }]);
    if (!mem.asked.has('season')) topics.push(["What's in season?", () => { mem.asked.add('season'); this.say(H.bag('season', SEASON), { secs: 7 }); return null; }]);
    const place = PLACES.filter(p => !mem.asked.has(p.id) && Math.hypot(p.x - v.x, p.z - v.z) > 35)[0];
    if (place) topics.push([place.ask, () => { mem.asked.add(place.id); this.pointAt = { x: place.x, z: place.z, until: H.now + 3.5 }; this.say(place.say, { secs: 7 }); return null; }]);
    topics.push(['Tell me about the garden.', () => { mem.asked.add('garden'); this.say(H.bag('gfacts', GARDEN_FACTS), { secs: 7 }); return [
      { text: 'Tell me more.', act: () => { this.say(H.bag('gfacts', GARDEN_FACTS), { secs: 7 }); return null; } },
      { text: 'What do you do out here?', act: reply('job') },
      { text: 'Thank you.', act: reply('bye') }]; }]);
    out.push({ text: topics[0][0], act: topics[0][1] });
    out.push({ text: "That's all, thank you.", act: reply('bye') });
    return out;
  }
  order(d) {
    const H = this.H;
    if (H.visitor.holding) { this.line('already', { expr: 'sass' }); return; }
    this.say(`${d.gift ? 'A ' + d.name : 'Lemonade'}, ${d.note}. ${this.fill(H.bag(`${this.key}.offer`, VOICE[this.key].offer))}`, { expr: 'happy', secs: 5.5 });
    H.mem.lastDrink = d; H.mem.finished = false;
    const prev = this.taskName;
    this.run('fetch', this.fetchThenHost(d, prev === 'host' || prev === 'greet'), false);
    if (!H.host) H.host = this;
  }
  comment() {
    const H = this.H, mem = H.mem;
    if (H.day.light < 0.35 && !mem.gToldDark) { mem.gToldDark = true; this.line(H.ctx.flashlight ? 'lantern' : 'dark', { expr: 'wink' }); return true; }
    if (!H.visitor.holding && !this.carrying && H.now - H.lastOffer > 150) {
      H.lastOffer = H.now; this.say(H.bag('gOffer', ['Fancy a strawberry? Warm off the plant. Press E.', "There's lemonade, if you'd like. I'll knock on the kitchen door.", 'The sweet peas want picking. Shall I pick you one?'])); return true;
    }
    const k = weighted([['fact', 2], ['season', 1], ['bees', 1]], H.rnd);
    if (k === 'fact') this.say(H.bag('gfacts', GARDEN_FACTS), { secs: 7 });
    else if (k === 'season') this.say(H.bag('season', SEASON), { secs: 7 });
    else this.line('hives');
    return true;
  }

  // ---- fetching: picked here, or lemonade from the kitchen door ----------------------------------
  *fetch(d) {
    const H = this.H, v = H.visitor;
    while (this.engaged) { this.m.faceTo(v.x, v.z, H.dt); yield; }
    this.fetching = d; H.events.fetches++;
    try {
      let spot = null;
      if (d.gift) {
        const near = [...this.spots.beds, ...this.spots.borders].sort((a, b) => Math.hypot(a.x - this.x, a.z - this.z) - Math.hypot(b.x - this.x, b.z - this.z))[0];
        if (near && Math.hypot(near.x - this.x, near.z - this.z) < 60) spot = near;
      } else spot = this.spots.kitchenDoor;
      if (spot && (yield* this.go(0, spot.x, spot.z))) for (let t = 0; t < 0.8; t += H.dt) { this.m.faceTo(spot.fx, spot.fz, H.dt); yield; }
      if (!d.gift && spot) this.say(this.key === 'bramble' ? '*taps on the kitchen door* Mort, love! One lemonade!' : '*knocks* Lemonade. Please.', { toGuest: false });
      const g = H.makeDrink(d); if (!d.gift) g.userData.making = true;
      this.anim = 'pick'; this.body.tray.visible = true;
      const T = d.prep ?? 2.5;
      for (let t = 0; t < T; t += H.dt) { if (t > T * 0.5 && !g.parent) this.body.slot.add(g); H.fill(g, Math.min(1, t / T), t); yield; }
      if (!g.parent) this.body.slot.add(g);
      g.userData.making = false; H.fill(g, 1); this.drinkObj = g;
      this.carrying = d; this.forGuest = true;
    } finally { this.fetching = null; this.anim = null; }
    yield* this.deliver();
  }

  // ---- the work ----------------------------------------------------------------------------------------
  *at(list, anim, pool, secs, chance = 0.6) {
    const H = this.H, s = list[Math.floor(H.rnd() * list.length)]; if (!s) return;
    if (!(yield* this.go(0, s.x, s.z))) return;
    for (let t = 0; t < 0.8; t += H.dt) { this.m.faceTo(s.fx, s.fz, H.dt); yield; }
    this.anim = anim;
    if (pool && H.rnd() < chance) this.line(pool, { toGuest: false, expr: 'happy' });
    yield* this.linger(secs, { x: s.fx, z: s.fz });
    this.anim = null;
  }
  *water() { yield* this.at(this.spots.beds.length ? this.spots.beds : this.spots.borders, 'water', 'water', 7 + this.H.rnd() * 5); this.H.events.tidies++; }
  *deadhead() { yield* this.at(this.spots.borders, 'snip', 'deadhead', 6 + this.H.rnd() * 5); }
  *hives() { yield* this.at(this.spots.hives, null, 'hives', 8 + this.H.rnd() * 6); }
  *koi() { yield* this.at(this.spots.pond, 'sprinkle', 'koi', 7); }
  *rim() { yield* this.at(this.spots.rim, null, 'rim', 12 + this.H.rnd() * 8, 0.5); }
  *bench() {
    this.drop = 0.7;
    try { yield* this.at(this.spots.benches, null, 'bench', 18 + this.H.rnd() * 20, 0.4); } finally { this.drop = 0; }
  }
  *cart() {
    const H = this.H, b = this.barrow; if (!b) return;
    if (!(yield* this.go(0, b.position.x - Math.sin(b.rotation.y) * 2.3, b.position.z - Math.cos(b.rotation.y) * 2.3))) return;
    const dest = [...this.spots.beds, ...this.spots.borders][Math.floor(H.rnd() * (this.spots.beds.length + this.spots.borders.length))]; if (!dest) return;
    this.pushing = true; this.anim = 'push';
    if (H.rnd() < 0.5) this.line('barrow', { toGuest: false });
    try { yield* this.go(0, dest.x, dest.z, { speed: 0.7 }); yield* this.linger(3); }
    finally { this.pushing = false; this.anim = null; }
    yield* this.linger(4, { x: dest.fx, z: dest.fz });
  }
  *tuck() {
    const H = this.H, s = this.spots.night[this.key];
    if (s) yield* this.go(0, s.x, s.z);
    if (H.rnd() < 0.5) this.line('tuck', { toGuest: false, expr: 'sleepy' });
    this.drop = 0.9;
    try { while (H.day.light < 0.35) { this.expr = 'sleepy'; this.exprUntil = H.now + 1; if (this.wantsToGreet()) break; yield; } }
    finally { this.drop = 0; }
  }

  update(dt, t, draw) {
    super.update(dt, t, draw);
    const H = this.H, b = this.body, m = this.m;
    if (this.barrow && this.pushing) { this.barrow.position.set(m.x + Math.sin(m.yaw) * 2.3, 0, m.z + Math.cos(m.yaw) * 2.3); this.barrow.rotation.y = m.yaw; }
    if (!draw) return;
    const [hl, hr] = b.hands, tool = b.tool;
    tool.rotation.set(0, 0, 0);
    if (this.anim === 'water') { tool.position.z += 0.35; tool.rotation.x = 0.55 + 0.12 * Math.sin(t * 2); }
    if (this.anim === 'snip') { tool.position.z += 0.4; tool.position.y += 0.05 * Math.sin(t * 9); tool.rotation.z = 0.2 * Math.sin(t * 9); }
    if (this.anim === 'pick') { hl.position.z += 0.4; hr.position.z += 0.4; hl.position.y -= 0.2 + 0.05 * Math.sin(t * 5); }
    if (this.anim === 'sprinkle') { hr.position.z += 0.45; hr.position.y += 0.15 + 0.05 * Math.sin(t * 8); }
    if (this.anim === 'push') { hl.position.set(-0.45, -0.25, 0.75); hr.position.set(0.45, -0.25, 0.75); }
    if (this.lookTarget()) { hr.position.set(0.7, 0.45, 0.55); }
  }
}
