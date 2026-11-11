// The gardeners: Bramble and Thistle, the outdoor branch of the family. Same
// manners as the house staff (they are Robots, see robots.js): unhurried, they
// turn to you to speak and hold still until you are done, keep a polite 5-6 ft,
// and only one robot attends you at a time. Outside, the policy is theirs:
//
//   - she steps outside: the nearer gardener finds some work in her part of the
//     garden (once per outing; they do not trail after her). When she lingers within
//     sight, that one walks over, stops a polite way off and introduces itself:
//     name, what it does here, a little of who it is. Each introduces itself once
//     in a visit (H.mem.met); after that it is "hello again".
//   - spoken to (E), they are company first and service second: the card leads with
//     something not yet talked about (what she is standing next to, themselves, each
//     other, the indoor staff, the bees, the koi, the weather, the hour) and every
//     answer offers follow-ups. The conversation is a small tree in lines.js
//     (GARDEN_TALK); what has been asked is remembered (H.mem.asked, "g.<who>.<id>").
//   - asked for something, they pick it at the nearest bed or border (a strawberry,
//     a tomato, a sweet pea), or produce one from under the hat if the beds are far,
//     or fetch a lemonade from the kitchen door, and bring it in a trug
//   - otherwise their work, as a round of nearby jobs rather than a criss-cross of
//     the island: watering the beds, deadheading, the wheelbarrow (Thistle), the
//     hives, feeding the koi, a sit on a bench, looking out from the rim, a word
//     with each other when their rounds cross; at night Bramble tucks herself by
//     the glasshouse and Thistle by the back porch, and they wake for a visitor.

import { Robot } from './robots.js';
import { weighted } from './agent.js';
import { shuffle } from '../shuffle.js';
import { buildGardener, buildBarrow, GARDENER_SPECS } from './models.js';
import { GARDEN_GIFTS } from './drinks.js';
import { VOICE, GARDEN_FACTS, PLACES, GARDEN_TALK, GARDEN_CATS, GARDEN_LEADS, GARDEN_NEAR, GARDEN_HOURS, GARDEN_BANTER, partOfDay } from './lines.js';
import { POND, feedKoi } from '../garden/pond.js';
import { ISLAND, islandEdge } from '../garden.js';

const TRAITS = {
  bramble: { host: 1.0, greeter: 2, chat: 1, rest: 0.7, home: 0, likes: [], work: { water: 6, deadhead: 4, hives: 1.5, koi: 2, bench: 2, rim: 1.5, ponder: 1 } },
  thistle: { host: 0.6, greeter: 1, chat: 0.7, rest: 0.8, home: 0, likes: [], work: { water: 3, deadhead: 2, cart: 5, hives: 4, koi: 3, bench: 2, rim: 2, ponder: 1 } },
};

// Where the work is, found on the garden's own plan at run time
export function gardenSpots(out, ctx) {
  const S = { beds: [], borders: [], hives: [], pond: [], benches: [], rim: [] };
  const snap = (x, z, r = 5, need = 1.2) => { const c = out.nearest(0, x, z, need, r); return c < 0 ? null : { x: out.cx(c), z: out.cz(c) }; };
  // raised beds in the potager: solid boxes about 2.4 ft high
  for (const c of ctx.colliders) {
    if (c.staff || c.x0 < 25 || c.x1 > 67 || c.z0 < -105 || c.z1 > -55 || Math.abs(c.y1 - 2.4) > 0.05 || (c.x1 - c.x0) * (c.z1 - c.z0) < 6) continue;
    const fx = (c.x0 + c.x1) / 2, fz = (c.z0 + c.z1) / 2, p = snap(fx, fz, 6); if (p) S.beds.push({ ...p, fx, fz });
  }
  // borders are tended from the lawn side, never from the brick walk to the front door
  for (const [x, z, fx, fz] of [[9, -60, 2, -60], [9, -75, 2, -75], [9, -95, 2, -95], [9, -112, 2, -112], [14.5, 30, 8.5, 30], [-12, 40, -6.5, 40], [-14, 55, -6.5, 52], [-19, 20, -19, 14.6]]) { const p = snap(x, z, 4); if (p) S.borders.push({ ...p, fx, fz }); }
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

const KEEP_OFF = 12;                 // work is never picked closer to her than this
const TOPIC = Object.fromEntries(GARDEN_TALK.map(n => [n.id, n]));

export class Gardener extends Robot {
  constructor(H, key, i, out) {
    super(H, key, i, { body: buildGardener(key), spec: GARDENER_SPECS[key], traits: TRAITS[key], nav: out, need: 1.2 });
    this.outdoor = true; this.lastOut = 0; this.cameFor = -1; this.cameTries = 0; this.comeAgain = 0; this.greetTried = -1e9;
    this.m.avoid = (x, z) => H.blocked(this, x, z, this.carrying ? 1.25 : 2.5);      // a wide berth round her, unless handing something over
    if (key === 'thistle') { this.barrow = buildBarrow(); H.group.add(this.barrow); this.barrow.position.set(40, 0, -60); }
    // Speech bubbles outdoors. staff.js decides whether a bubble is in view with the house plan's line of sight
    // (nav.see), and that plan ends at the walls, so out here the answer was always "no" and the gardeners were
    // mute. Until staff.js asks the garden plan instead, a gardener's bubble answers for itself.
    this.bubble.inView = pos => {
      const cam = H.ctx.camera?.position;
      return !!cam && H.ctx.mode === 'walk' && cam.y < 14 && Math.hypot(pos.x - cam.x, pos.z - cam.z) < 34 && out.see(0, cam.x, cam.z, pos.x, pos.z);
    };
    if (!H.bubbles.placeIndoors) { const place = H.bubbles.placeIndoors = H.bubbles.place; H.bubbles.place = (b, pos, now, vis) => place(b, pos, now, vis || (!!b.inView && b.inView(pos))); }
  }
  inDomain() { const v = this.H.visitor; return v.present && v.outside; }
  seeGuest() { const v = this.H.visitor; return this.nav.see(0, this.x, this.z, v.x, v.z); }
  helpDoors() {}
  lookTarget() { return this.pointAt && this.H.now < this.pointAt.until ? this.pointAt : null; }
  speedScale() { return this.m.remaining() > 35 ? 1.3 : 1; }            // a long leg is walked a little more briskly
  get spots() { return this.H.gspots; }
  get other() { return this.H.gardeners.find(g => g !== this); }
  // long lines get the time they need to be read
  say(text, o = {}) {
    const H = this.H, v = H.visitor, t = super.say(text, { ...o, secs: o.secs ?? Math.min(10, 2.6 + text.length * 0.047) });
    // the little chirp: Robot.say asks the house plan whether she is in earshot, which fails outdoors (see the constructor)
    if (!H.near(this, 20) && v.present && Math.hypot(v.x - this.x, v.z - this.z) < 20 && this.nav.see(0, v.x, v.z, this.x, this.z)) H.chirp(this.spec.chirp, 0.05, this);
    return t;
  }
  label() { return this.H.talk.robot === this && !(this.carrying && this.forGuest) ? 'next line (or 1–4)' : super.label(); }
  // A place to stand near (x, z): not on top of her, and (open) with room around it, so never in the middle of
  // a path between two borders. Better to talk across the flowers than to stand in her way.
  nearSpot(x, z, r = 10, open = 0) {
    const v = this.H.visitor, nav = this.nav, clear = nav.floors[0].clear;
    const c = nav.nearest(0, x, z, 1.2, r, false, c => clear[c] >= open && Math.hypot(nav.cx(c) - v.x, nav.cz(c) - v.z) >= 4.8);
    return c < 0 ? null : { f: 0, x: nav.cx(c), z: nav.cz(c) };
  }
  roomHere() { const c = this.nav.cellOf(this.x, this.z); return c < 0 ? 0 : this.nav.floors[0].clear[c]; }
  // Is she looking roughly my way? (A bubble only shows on screen; nothing is said to the back of her head.)
  inHerView(cos = 0.6) { const v = this.H.visitor, dx = this.x - v.x, dz = this.z - v.z, d = Math.hypot(dx, dz) || 1; return (dx * v.fx + dz * v.fz) / d > cos; }
  // Where to stand to speak to her: in front and to one side, where she can see me, with room around me
  // (so not on a path between borders), a little farther off if the near ground is taken up by flowers
  standSpot() {
    const H = this.H, v = H.visitor, nav = this.nav, clear = nav.floors[0].clear, f0 = Math.atan2(v.fx, v.fz);
    this.side ??= H.rnd() < 0.5 ? 1 : -1;
    for (const dist of [6.5, 8.5, 10.5, 12]) for (const ang of [0.5, -0.5, 0.8, -0.8, 1.05, -1.05]) {
      const a = f0 + ang * this.side, x = v.x + Math.sin(a) * dist, z = v.z + Math.cos(a) * dist, c = nav.cellOf(x, z);
      if (c >= 0 && nav.free(0, c, 1.2) && clear[c] >= 3.2 && nav.see(0, v.x, v.z, x, z)) return { f: 0, x: nav.cx(c), z: nav.cz(c) };
    }
    return null;
  }
  // Is she by this place? near: { x, z, r } or { rim: true } (anywhere along the island's edge)
  isNear(n) {
    const v = this.H.visitor;
    if (n.rim) return Math.hypot(v.x - ISLAND.x, v.z - ISLAND.z) > islandEdge(Math.atan2(v.z - ISLAND.z, v.x - ISLAND.x)) - 34;
    return Math.hypot(v.x - n.x, v.z - n.z) < n.r;
  }

  // ---- decisions ---------------------------------------------------------------------------------
  // The one who looks after her just now: nobody, if she has only just had company; otherwise the nearer
  // (Bramble, the readier talker, by a head)
  attending() {
    const H = this.H, v = H.visitor, o = this.other;
    if (!v.present || H.gardeners.some(g => H.host === g || H.now - g.hostEndedAt < 100)) return false;
    const d = a => Math.hypot(a.x - v.x, a.z - v.z) - a.traits.greeter * 10;
    return !o || !!o.carrying || d(this) <= d(o);
  }
  wantsToGreet() {
    const H = this.H, v = H.visitor;
    if (!this.inDomain() || H.host || H.talk.robot || H.now - v.outSince < 4 || H.now - this.greetedAt < 300 || H.now - H.lastHostEnd < 45) return false;
    if (H.now - this.greetTried < 25 || H.now - (H.mem.gLastGreet ?? -1e9) < 90) return false;      // one welcome at a time
    const d = this.visitorDist(); if (d > 45 || !this.seeGuest()) return false;
    // the readier greeter goes, unless the other is clearly nearer; one who has already said hello does not count
    const rival = H.gardeners.find(g => g !== this && g.interruptible && H.now - g.greetedAt > 300 && g.visitorDist() < d + (g.traits.greeter > this.traits.greeter ? 15 : -15));
    return !rival;
  }
  // toward: she has just stepped out and nobody is near; find work in her part of the garden
  think(toward = false) {
    const H = this.H, R = H.rnd, night = H.day.light < 0.3;
    // The day begins with Bramble in the front garden, where a guest first looks out or steps out, and Thistle
    // up by the orchard (staff.js sets both down in the potager; this is before anyone has seen them)
    if (!this.begun) { this.begun = true; const s = this.key === 'bramble' && H.now < 5 && this.spots.borders.find(b => b.z > 25 && b.x < -5); if (s) this.m.place(s.x, s.z, 0); }
    if (this.carrying) return this.run('deliver', this.deliver(), false);
    if (this.wantsToGreet()) return this.run('greet', this.greet(), false);
    const empty = H.empties.find(e => !e.claimed && e.outside && !(e.skipUntil > H.now));
    if (empty && (!H.host || H.host === this)) { empty.claimed = this; return this.run('clear', this.clear(empty), false); }
    if (night && !this.inDomain()) return this.run('tuck', this.tuck());
    const o = this.other;
    if (o && !toward && o.interruptible && !o.engaged && !o.carrying && !H.host && o.taskName !== 'tuck' && H.now - (H.lastGBanter ?? -200) > 150
      && Math.hypot(o.x - this.x, o.z - this.z) < 45 && R() < 0.5 * this.traits.chat) return this.run('banter', this.banter(o), false);
    const plan = this.planWork(night, toward) ?? (toward ? this.planWork(night, false) : null);
    if (!plan || plan.k === 'ponder') return this.run('ponder', this.orLinger(this.ponder()));
    this.run(plan.k, this.orLinger(this[plan.k](plan.s)));
  }
  // What to do next, and where. Jobs are weighted by temperament; places by how near they are (a round,
  // not a criss-cross of the island), and, for the one attending her, by being in her part of the garden.
  planWork(night, toward) {
    const H = this.H, v = H.visitor, S = this.spots, w = this.traits.work;
    const lists = { water: S.beds.length ? S.beds : S.borders, deadhead: S.borders, hives: S.hives, koi: S.pond, bench: S.benches, rim: S.rim, cart: this.barrow ? [...S.beds, ...S.borders] : [] };
    const mine = this.attending(), opts = [], off = H.host && H.host !== this ? 26 : KEEP_OFF;       // well clear while the other has her company
    for (const k in lists) {
      const list = lists[k], base = (w[k] ?? 0) * (night ? (k === 'bench' || k === 'rim' ? 1.5 : 0.3) : 1);
      if (!base || !list.length) continue;
      for (const s of list) {
        const ds = Math.hypot(s.x - this.x, s.z - this.z);
        let q = (ds < 6 ? 0.15 : 1) / (1 + (ds / 70) ** 2);
        if (v.present) {
          const dv = Math.hypot(s.x - v.x, s.z - v.z);
          if (v.outside && dv < off) q *= 0.05;
          else if (toward) q = dv < 55 ? 1 / (1 + Math.abs(dv - 28) / 20) : 0;
          else if (mine && !v.outside) q = ((s.x - 0) * (v.x - 0) + (s.z + 23) * (v.z + 23) > 0 ? 1 : 0.06) / (1 + (Math.max(0, dv - 50) / 25) ** 2);     // she is indoors: on her side of the house, in view of her windows
          else if (mine) q *= 1 + 5 / (1 + (Math.max(0, dv - 30) / 30) ** 2);
        } else if (toward) q = 0;
        if (q > 0) opts.push([{ k, s }, (base * q) / list.length]);
      }
    }
    if (!toward) opts.push([{ k: 'ponder' }, (w.ponder ?? 0) * 0.25]);
    return weighted(opts, H.rnd);
  }

  // ---- meeting her --------------------------------------------------------------------------------
  // Walk over, unhurried, re-aiming as she moves, and speak only from a few feet away. If she walks on,
  // let her go and try another time; nothing is called across the garden.
  *greet() {
    const H = this.H, v = H.visitor, mem = H.mem, t0 = H.now, asks = H.events.asks;
    H.host = this; let replan = 0, held = 0;
    const giveUp = () => { this.greetTried = H.now; this.m.stop(); if (H.host === this) H.host = null; this.comeAgain = H.now + 20; };
    for (;;) {
      const d = this.visitorDist();
      if (d > 60 || H.now - t0 > 35) return giveUp();     // she has walked on: another time
      if (d < 8.5 && this.seeGuest() && this.roomHere() >= 3 && this.inHerView()) break;     // near enough, out of her path, and she can see me
      if (H.now > replan) {
        replan = H.now + 2.5;
        // on the terrace or a porch (not our ground) come to its edge; on our ground, stand where there is room
        const s = this.standSpot() ?? this.nearSpot(v.x, v.z, 13, this.nav.freeAt(0, v.x, v.z, 0.5) ? 3.2 : 1.2);
        if (s && Math.hypot(s.x - this.x, s.z - this.z) > 1.5) this.m.goTo(0, s.x, s.z);
        else if (d < 14 && this.seeGuest()) break;        // as near as good manners allow
      }
      this.m.update(H.dt, 1.2);
      held = this.m.v < 0.05 && d < 10 ? held + H.dt : 0;
      if (held > 3 && this.seeGuest()) break;             // she is in the way of where I meant to stand: this will do
      yield;
    }
    this.m.stop();
    yield* this.wait(0.6, () => { this.m.faceTo(v.x, v.z, H.dt); return false; });
    // if she is looking the other way, a small chirp, and a moment for her to turn round
    if (!this.inHerView() && this.visitorDist() < 14) { H.chirp(this.spec.chirp, 0.06, this); yield* this.wait(6, () => { this.m.faceTo(v.x, v.z, H.dt); return this.inHerView() || this.visitorDist() > 14; }); }
    if (this.visitorDist() > 14) return giveUp();
    if (this.visitorDist() < 4.6) { const s = this.standSpot(); if (s) yield* this.go(0, s.x, s.z, { tries: 1 }); }       // she came right up: a step back first
    this.greetedAt = H.now; mem.gLastGreet = H.now; mem.gHello = v.outSince; H.events.greets++;
    if (H.events.asks === asks) {                         // unless she spoke first on the way over
      if (!mem.met.has(this.key)) yield* this.introduce();
      else this.line('greet', { expr: 'happy' });
    }
    yield* this.wait(0.2);
    yield* this.host(true);
  }
  // First meeting: who I am, what I do here, a little of myself; then how to talk to me
  *introduce() {
    const H = this.H, mem = H.mem, pool = mem.met.has(this.other?.key) ? 'introAfter' : 'intro';
    const beats = H.bag(`${this.key}.${pool}`, VOICE[this.key][pool]), asks = H.events.asks;
    mem.met.add(this.key);
    for (let i = 0; i < beats.length; i++) {
      if (i) { yield* this.wait(0.5); if (H.events.asks !== asks || this.visitorDist() > 12) return; }     // she spoke first, or walked on
      this.say(beats[i], { expr: i ? 'wink' : 'happy' });
      yield;
    }
  }
  act() {
    const H = this.H;
    // spoken to before any introduction: say who you are first
    H.mem.gHello = H.visitor.outSince;
    if (!(this.carrying && this.forGuest) && H.talk.robot !== this && !H.mem.met.has(this.key)) { H.mem.met.add(this.key); this.line('introShort', { expr: 'happy' }); }
    super.act();
  }

  // ---- talking ---------------------------------------------------------------------------------
  // What a line resolves to in this gardener's voice (see GARDEN_TALK in lines.js)
  voice(v, bagKey) {
    const H = this.H, mem = H.mem, o = this.other;
    const c = { key: this.key, night: H.day.light < 0.35, hour: H.day.hour, met: k => mem.met.has(k), heard: id => mem.asked.has(`g.${o?.key}.${id}`), had: id => mem.drinks.includes(id) };
    for (let i = 0; i < 4 && v != null && typeof v !== 'string'; i++) v = typeof v === 'function' ? v(c) : Array.isArray(v) ? H.bag(`${this.key}.${bagKey}`, v) : v[this.key];
    return v ?? null;
  }
  asked(n) { return this.H.mem.asked.has(`g.${this.key}.${n.id}`); }
  // The card, kept to three lines: one thing to talk about (what she is standing by, or the next thing
  // on this gardener's own list), something from the garden, and goodbye
  dialogue() {
    const H = this.H, v = H.visitor, mem = H.mem, out = [];
    const reply = (pool, opts) => () => { this.line(pool, opts); return null; };
    if (H.day.light < 0.35 && !mem.asked.has('gdark')) out.push({ text: "It's dark out here.", act: () => { mem.asked.add('gdark'); this.line(H.ctx.flashlight ? 'lantern' : 'dark', { expr: 'wink' }); return this.followUps(null, null); } });
    else { const lead = this.leadTopic(); if (lead) out.push(this.topicOpt(lead, null)); }
    const coming = this.fetching ?? this.promised;
    if (coming) out.push({ text: `How's my ${coming.name} coming?`, act: reply('busy') });
    else if (v.holding) out.push({ text: `This ${v.holding.name} is lovely.`, act: reply(v.holding.food ? 'enjoyingFood' : v.holding.gift ? 'enjoying' : 'enjoyingDrink', { extra: { drink: v.holding.name }, expr: 'love' }) });
    else out.push({ text: 'Could I have something from the garden?', act: () => this.serviceCard() });
    out.push({ text: "That's all, thank you.", act: reply('bye') });
    return out;
  }
  // What leads the card: what she is standing by, then whatever has not come up yet (with anyone, then with me)
  leadTopic() {
    const mem = this.H.mem, any = n => !n.own && mem.asked.has(`g.${n.id}`);
    const here = GARDEN_TALK.find(n => n.near && !this.asked(n) && this.isNear(n.near));
    if (here) return here;
    const order = GARDEN_LEADS.map(id => TOPIC[id]).filter(Boolean);
    return order.find(n => !this.asked(n) && !any(n)) ?? order.find(n => !this.asked(n)) ?? null;
  }
  topicOpt(n, sibs) { return { text: this.voice(n.ask, n.id + '.ask'), act: () => this.answer(n, sibs) }; }
  answer(n, sibs) {
    const H = this.H, v = H.visitor, mem = H.mem;
    mem.asked.add(`g.${this.key}.${n.id}`); mem.asked.add(`g.${n.id}`);
    if (n.serve) return this.serviceCard();
    let more = null;
    if (n.where) more = this.suggestPlace() ? { text: 'And after that?', act: () => this.answer(n, sibs) } : null;
    else if (n.hour) { const p = partOfDay(H.day.hour); this.say(H.bag(`${this.key}.hour.${p}`, GARDEN_HOURS[p][this.key])); }
    else if (n.pool) this.line(n.pool, { expr: 'happy' });
    else {
      if (n.point && Math.hypot(n.point.x - v.x, n.point.z - v.z) > 30) this.pointAt = { x: n.point.x, z: n.point.z, until: H.now + 3.5 };
      this.say(this.voice(n.say, n.id));
    }
    return this.followUps(n.then ?? sibs, more);
  }
  // After an answer: one way on and a way out. The conversation is a path, not a menu: the way on
  // is what follows from what was just said, or else the next thing this gardener has not told her yet.
  followUps(group, more) {
    let on = more ?? null;
    if (!on) { const f = (group ?? []).find(f => !this.asked(f)); if (f) on = this.topicOpt(f, group); }
    if (!on) { const lead = this.leadTopic(); if (lead && !lead.serve) on = this.topicOpt(lead, null); }
    return [...(on ? [on] : []), { text: `Thank you, ${this.name}.`, act: () => { this.line('bye'); return null; } }];
  }
  catCard() { return [...GARDEN_CATS.map(([cat, text]) => ({ text, act: () => this.topicCard(cat) })), { text: "That's all, thank you.", act: () => { this.line('bye'); return null; } }]; }
  // Three topics at a time, what has not come up yet first; "Something else." turns the page, then goes back to the subjects
  topicCard(cat, page = 0) {
    const all = GARDEN_TALK.filter(n => n.cat === cat), list = [...all.filter(n => !this.asked(n)), ...all.filter(n => this.asked(n))];
    const more = list.length > (page + 1) * 3;
    return [...list.slice(page * 3, page * 3 + 3).map(n => this.topicOpt(n, null)), { text: 'Something else.', act: () => (more ? this.topicCard(cat, page + 1) : this.catCard()) }];
  }
  // Somewhere she has not been pointed to yet, a walk away from here
  suggestPlace() {
    const H = this.H, v = H.visitor, mem = H.mem;
    const left = PLACES.filter(p => !mem.asked.has('g.place.' + p.id) && Math.hypot(p.x - v.x, p.z - v.z) > 35);
    if (!left.length) { this.line('suggestDone'); return false; }
    const p = left[0]; mem.asked.add('g.place.' + p.id);
    this.pointAt = { x: p.x, z: p.z, until: H.now + 3.5 };
    this.say(p[this.key] ?? p.say);
    return left.length > 1;
  }
  // Something from the garden: two things to pick and the lemonade
  serviceCard() {
    const H = this.H, o = this.other;
    if (H.visitor.holding) { this.line('already', { expr: 'sass' }); return null; }
    if (this.fetching || this.promised || this.carrying) { this.line('busy'); return null; }
    if (o && (o.fetching || o.promised || (o.carrying && o.forGuest))) { this.say(this.key === 'bramble' ? `${o.name}'s already on his way with something for you, love. One treat at a time.` : `${o.name}'s fetching. One at a time.`); return null; }
    this.line('serve', { expr: 'happy' });
    const picks = shuffle(GARDEN_GIFTS.filter(g => g.gift), H.rnd).slice(0, 2);
    return [...[...picks, GARDEN_GIFTS.find(g => g.id === 'lemonade')].map(d => ({ text: d.id === 'lemonade' ? 'A glass of lemonade, please.' : `A ${d.name}, please.`, act: () => { this.order(d); return null; } })),
      { text: 'Not just now, thank you.', act: () => { this.line('bye'); return null; } }];
  }
  // Where a thing is picked: sweet peas in the borders, fruit in the raised beds; null if none is near
  pickingSpot(d) {
    if (!d.gift) return this.spots.kitchenDoor;
    const list = d.id === 'sweetpea' ? [...this.spots.borders, ...this.spots.beds] : this.spots.beds, far = d.id === 'sweetpea' ? 60 : 75;
    const near = list.map(s => [s, Math.hypot(s.x - this.x, s.z - this.z)]).sort((a, b) => a[1] - b[1])[0];
    return near && near[1] < far ? near[0] : null;
  }
  order(d) {
    const H = this.H;
    if (H.visitor.holding) { this.line('already', { expr: 'sass' }); return; }
    const pocket = d.gift && !this.pickingSpot(d);
    const pool = pocket ? 'pocket' : d.gift ? 'offer' : 'offerDrink';
    this.say(`${d.gift ? 'A ' + d.name : 'Lemonade'}${pocket ? '.' : ', ' + d.note + '.'} ${this.fill(H.bag(`${this.key}.${pool}`, VOICE[this.key][pool]))}`, { expr: 'happy' });
    H.mem.lastDrink = d; H.mem.finished = false; this.promised = d;
    const prev = this.taskName;
    this.run('fetch', this.fetchThenHost(d, prev === 'host' || prev === 'greet'), false);
    if (!H.host) H.host = this;
  }
  giveDrink() {
    const H = this.H, d = this.carrying, g = this.drinkObj;
    this.body.slot.remove(g); this.body.tray.visible = false; this.carrying = null; this.drinkObj = null; this.forGuest = false;
    H.hold(d, g);
    this.line(d.gift ? 'thanks' : 'thanksDrink', { expr: 'happy' });
    H.events.drinksTaken++;
  }
  // A remark while keeping her company: where she is standing, the offer of something, the hour, an opinion
  comment() {
    const H = this.H, v = H.visitor, mem = H.mem, k = this.key;
    if (!this.inHerView(0.5)) return false;                    // wait until she is looking this way
    if (H.day.light < 0.35 && !mem.gToldDark && !mem.asked.has('gdark')) { mem.gToldDark = true; this.line(H.ctx.flashlight ? 'lantern' : 'dark', { expr: 'wink' }); return true; }
    const said = (H.gNearSaid ??= {}), place = GARDEN_NEAR.find(p => H.now - (said[p.id] ?? -1e9) > 400 && this.isNear(p));
    if (place) { said[place.id] = H.now; this.say(H.bag(`${k}.near.${place.id}`, place[k])); return true; }
    if (!v.holding && !H.gardeners.some(g => g.fetching || g.carrying) && H.now - H.lastOffer > 150 && H.now - (mem.lastSip ?? -1e9) > 120) { H.lastOffer = H.now; this.line('offerHint'); return true; }
    const pick = weighted([['hour', H.now - (H.gHourSaid ?? -1e9) > 400 ? 3 : 0], ['aside', 2.5], ['fact', 1], ['season', 0.5]], H.rnd);
    if (pick === 'hour') { H.gHourSaid = H.now; const p = partOfDay(H.day.hour); this.say(H.bag(`${k}.hour.${p}`, GARDEN_HOURS[p][k])); }
    else if (pick === 'fact') this.say(H.bag(`${k}.gfacts`, GARDEN_FACTS.filter(f => !f.includes(this.name))));
    else if (pick === 'season') this.say(this.voice(TOPIC.season.say, 'season'));
    else this.line('aside');
    return true;
  }

  // ---- fetching: picked here, or lemonade from the kitchen door ----------------------------------
  *fetch(d) {
    const H = this.H, v = H.visitor;
    while (this.engaged) { this.m.faceTo(v.x, v.z, H.dt); yield; }
    this.fetching = d; this.promised = null; H.events.fetches++;
    try {
      const spot = this.pickingSpot(d);
      if (spot && (yield* this.go(0, spot.x, spot.z, { speed: 1.4 }))) {
        for (let t = 0; t < 0.8; t += H.dt) { this.m.faceTo(spot.fx, spot.fz, H.dt); yield; }
        if (d.gift && this.visitorDist() < 24) this.line('making', { toGuest: false });
      }
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
  // Bring it to her. On the terrace or a porch (not our ground) come to its edge and hold it out (she can take it from there); if she has
  // gone indoors, wait a minute where we stand, then let it go.
  *deliver() {
    const H = this.H, v = H.visitor, t0 = H.now;
    let arrived = 0, nextWait = H.now + 60, away = 0, replan = 0, edge = false;
    while (this.carrying) {
      if (!this.inDomain()) {
        away += H.dt; this.m.stop();
        if (away > (v.present ? 60 : 20)) { if (v.present) this.line('selfDrink', { extra: { drink: this.carrying.name }, toGuest: false }); this.dropDrink(); return; }
        yield; continue;
      }
      away = 0;
      const d = this.visitorDist();
      if (d > (edge ? 11.5 : 4.2)) {
        if (H.now > replan) {
          replan = H.now + 1.2; edge = false;
          const k = Math.max(0.01, d), tx = d < 40 ? v.x + ((this.x - v.x) / k) * 3.4 : v.x, tz = d < 40 ? v.z + ((this.z - v.z) / k) * 3.4 : v.z;
          if (!this.m.goTo(0, tx, tz)) {
            const s = this.nearSpot(v.x, v.z, 16);
            if (s && Math.hypot(s.x - this.x, s.z - this.z) > 1) { if (!this.m.goTo(0, s.x, s.z)) edge = true; } else edge = true;
          }
        }
        const st = this.m.update(H.dt, d > 12 ? 1.4 : 0.9);
        if (st === 'idle' || st === 'arrived') { edge = true; this.m.faceTo(v.x, v.z, H.dt); }
        if (edge && d < 30 && H.now > nextWait) { nextWait = H.now + 30; this.line('waiting', { extra: { drink: this.carrying.name }, toGuest: false }); }
      } else {
        this.m.stop(); this.m.faceTo(v.x, v.z, H.dt);
        if (!arrived) { arrived = H.now; nextWait = H.now + (edge ? 24 : 16); this.line(edge && d > 6 ? 'edge' : 'deliver', { extra: { drink: this.carrying.name }, expr: 'happy' }); H.events.deliveries++; }
        else if (H.now > nextWait) { nextWait = H.now + 16; this.line('waiting', { extra: { drink: this.carrying.name }, expr: 'sass' }); }
      }
      if ((arrived && H.now - arrived > 90) || H.now - t0 > 240) { this.line('selfDrink', { extra: { drink: this.carrying.name }, expr: 'sass' }); this.dropDrink(); return; }
      yield;
    }
    const s = this.hostSpot() ?? (this.roomHere() < 3 ? this.nearSpot(v.x, v.z, 13, 3.2) : null); if (s) yield* this.go(s.f, s.x, s.z, { tries: 1 });     // handed over: step back, out of her path
  }
  // An empty glass outdoors. One left on the terrace table is out of our reach: that is the house staff's.
  *clear(e) {
    const H = this.H, nav = this.nav;
    try {
      const c = nav.nearest(0, e.x, e.z, 1.2, 5), ok = c >= 0 && (yield* this.go(0, nav.cx(c), nav.cz(c)));
      if (!ok || Math.hypot(e.x - this.x, e.z - this.z) > 4.6) {
        if (e.inHand) e.skipUntil = H.now + 30; else { e.outside = false; if (this.visitorDist() < 14) this.line('passOn', { toGuest: false }); }
        return;
      }
      for (let t = 0; t < 0.8; t += H.dt) { this.m.faceTo(e.x, e.z, H.dt); yield; }
      this.anim = 'pick'; yield* this.wait(0.8); this.anim = null;
      if (!H.empties.includes(e)) return;
      H.takeEmpty(e, this);
      this.line('clear', { toGuest: this.visitorDist() < 10 });
      yield* this.linger(5);
      this.body.slot.clear(); this.body.tray.visible = false;
    } finally { e.claimed = null; this.anim = null; }
  }

  // ---- the work ----------------------------------------------------------------------------------------
  *at(s, anim, pool, secs, chance = 0.6) {
    const H = this.H; if (!s) return;
    if (!(yield* this.go(0, s.x, s.z))) return;
    for (let t = 0; t < 0.8; t += H.dt) { this.m.faceTo(s.fx, s.fz, H.dt); yield; }
    this.anim = anim;
    if (pool && H.rnd() < chance) this.line(H.day.light < 0.3 && VOICE[this.key][pool + 'Night'] ? pool + 'Night' : pool, { toGuest: false, expr: 'happy' });
    try { yield* this.linger(secs, { x: s.fx, z: s.fz }); } finally { this.anim = null; }
  }
  *water(s) { yield* this.at(s, 'water', 'water', 7 + this.H.rnd() * 5); this.H.events.tidies++; }
  *deadhead(s) { yield* this.at(s, 'snip', 'deadhead', 6 + this.H.rnd() * 5); }
  *hives(s) { yield* this.at(s, null, 'hives', 8 + this.H.rnd() * 6); }
  *koi(s) { feedKoi(s.x + (s.fx - s.x) * 0.45, s.z + (s.fz - s.z) * 0.45); yield* this.at(s, 'sprinkle', 'koi', 7); }      // the fish really come (pond.js keeps the food in open water)
  *rim(s) { yield* this.at(s, null, 'rim', 12 + this.H.rnd() * 8, 0.5); }
  *bench(s) {
    this.drop = 0.7;
    try { yield* this.at(s, null, 'bench', 18 + this.H.rnd() * 20, 0.4); } finally { this.drop = 0; }
  }
  *cart(dest) {
    const H = this.H, b = this.barrow, nav = this.nav; if (!b || !dest) return;
    const c = nav.nearest(0, b.position.x - Math.sin(b.rotation.y) * 2.3, b.position.z - Math.cos(b.rotation.y) * 2.3, 1.2, 6);
    if (c < 0 || !(yield* this.go(0, nav.cx(c), nav.cz(c)))) return;
    for (let t = 0; t < 1; t += H.dt) { this.m.faceTo(b.position.x, b.position.z, H.dt); yield; }      // take the handles
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
  // A word with the other gardener, when their rounds cross
  *banter(p) {
    const H = this.H;
    H.lastGBanter = H.now;
    const mineFirst = GARDEN_BANTER.filter(b => b.pair[0] === this.key), script = H.bag(`gbanter.${this.key}`, mineFirst.length ? mineFirst : GARDEN_BANTER);
    const mx = (this.x + p.x) / 2, mz = (this.z + p.z) / 2, dx = this.x - p.x, dz = this.z - p.z, L = Math.max(0.01, Math.hypot(dx, dz));
    const a = this.politeSpot(mx + (dx / L) * 2.5, mz + (dz / L) * 2.5, 4), b = this.politeSpot(mx - (dx / L) * 2.5, mz - (dz / L) * 2.5, 4);
    const convo = { ready: 0, done: false };
    p.run('banter', p.banterJoin(convo, this, b), false);
    try {
      if (a) yield* this.go(0, a.x, a.z, { tries: 1 });
      convo.ready++;
      yield* this.wait(20, () => convo.ready >= 2);
      if (Math.hypot(p.x - this.x, p.z - this.z) > 14) return;                           // never shouted across the lawn
      for (const [who, text] of script.lines) {
        const sp = who === 'a' ? this : p;
        const t = sp.say(text, { toGuest: false, secs: Math.min(6, 2.2 + text.length * 0.05) });
        const end = H.now + Math.min(6, 2.2 + t.length * 0.05);
        while (H.now < end) { this.m.faceTo(p.x, p.z, H.dt); yield; }
      }
      H.events.banter++;
    } finally { convo.done = true; }
  }

  update(dt, t, draw) {
    const H = this.H, v = H.visitor;
    // She is outside and nobody has said hello yet this outing: the one attending finds work in her part of the
    // garden (at most three times an outing; once she has been greeted, or has spoken to one of us, never)
    if (H.now - this.lastOut > 1) {
      this.lastOut = H.now;
      if (this.interruptible && v.present && v.outside && H.mem.gHello !== v.outSince && H.now - v.outSince > 3 && H.now > this.comeAgain && this.taskName !== 'demo') {
        if (this.cameFor !== v.outSince) { this.cameFor = v.outSince; this.cameTries = 0; }
        // not if one of us is already on the way, or near enough to see her and about to say hello
        const inHand = H.gardeners.some(g => g.taskName === 'greet' || (Math.hypot(g.x - v.x, g.z - v.z) < 45 && g.seeGuest() && g.wantsToGreet()));
        if (!inHand && this.cameTries < 3 && this.attending()) { this.cameTries++; this.comeAgain = H.now + 45; this.think(true); }
      }
    }
    super.update(dt, t, draw);
    const b = this.body, m = this.m;
    this.inter.reach = H.host === this || (this.carrying && this.forGuest) ? 12 : 8;      // within call across the terrace edge, where we cannot follow
    if (this.barrow && this.pushing) {
      // the barrow swings round in front of him as he takes the handles, then goes where he goes
      const bp = this.barrow.position, k = Math.min(1, dt * 5), da = m.yaw - this.barrow.rotation.y;
      bp.x += (m.x + Math.sin(m.yaw) * 2.3 - bp.x) * k; bp.z += (m.z + Math.cos(m.yaw) * 2.3 - bp.z) * k;
      this.barrow.rotation.y += Math.atan2(Math.sin(da), Math.cos(da)) * k;
    }
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
