// The staff: three floating robots who know perfectly well that they run the
// place. Each has a personality (a few weights and a voice) and they share one
// policy, checked every frame in this order:
//
//   1. Attention. When a robot speaks to the guest, or the guest speaks to it,
//      it stops, turns its whole body to her and holds still until the exchange
//      is over or she walks off. It never drifts away mid-sentence.
//   2. Promises. A drink asked for is made (visibly, at the coffee bar or the
//      kitchen), carried back on the tray and offered at arm's length until it
//      is taken. Empties are cleared, and a refill is offered.
//   3. Hosting. One robot at a time attends the guest: after giving her a
//      moment to arrive it greets her, then lingers at a respectful 5-6 ft, to
//      one side and out of her path and any doorway, backing off if she comes
//      closer, and now and then remarks on the room, the hour or what she is
//      looking at. After a few minutes it lets her be. The others keep to their
//      own business, keep their distance, and only glance over.
//   4. Their own business, weighted by temperament: slow rounds that linger,
//      tidying, straightening a picture, looking out of a window, thinking,
//      a word with a colleague, a rest, keeping an eye on Reginald.
//
// Each robot is an Agent whose current task is a generator (see agent.js).

import { Agent, weighted } from './agent.js';
import { Mover } from './nav.js';
import { buildRobot, ROBOT_SPECS } from './models.js';
import { menuFor, MENU } from './drinks.js';
import { VOICE, ROOMS, HOURS, FACTS, POIS, AIMED, REGGIE, BANTER, NOD, timeWords, partOfDay } from './lines.js';

const TRAITS = {
  barty: { host: 1.0, tidy: 0.6, whim: 1.3, chat: 1.2, rest: 0.6, home: 0, greeter: 3, likes: ['latte', 'phin', 'wine', 'oldfashioned', 'espresso'],
    round: ['Living room', 'Hall', 'Dining room', 'Coffee bar', 'Office', 'Kitchen'] },
  mort: { host: 0.5, tidy: 1.8, whim: 0.6, chat: 0.8, rest: 0.8, home: 0, greeter: 1, likes: ['tea', 'sparkling', 'apple', 'chamomile', 'espresso'],
    round: ['Kitchen', 'Coffee bar', 'Dining room', 'Office', 'Hall', 'Living room'] },
  fig: { host: 0.9, tidy: 1.1, whim: 1.3, chat: 1.0, rest: 0.8, home: 1, greeter: 2, likes: ['jasmine', 'apple', 'cocoa', 'latte', 'sparkling'],
    round: ['Upstairs hall', 'Library', 'Guest room', 'Little bedroom', 'Our bedroom', 'Sleeping porch', 'Bath', 'Dressing room'] },
};
const KEEP = 5.5;
// Favourite spots in their own territory, in plan feet [X, Y, floor]
const FAVS = {
  barty: [[23, 15], [12, 8], [14, 24], [33, 19.6], [35, 3.5], [21.5, 4]],
  mort: [[36, 25], [37.5, 33], [33, 19.6], [40, 12], [25, 30]],
  fig: [[24, 3, 1], [10, 24, 1], [35, 6, 1], [25, 34, 1], [22, 19, 1], [10, 8, 1]],
};                  // a respectful distance, in feet
const has = (name, key) => !!name && name.toLowerCase().includes(key.toLowerCase());
const roomLines = name => (name ? ROOMS[name] ?? Object.entries(ROOMS).find(([k]) => has(name, k))?.[1] : null);
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const a_an = s => (/^[aeiou]/i.test(s) ? 'an ' : 'a ') + s;

export class Robot extends Agent {
  // opts (for the gardeners): body, spec, traits, nav, need
  constructor(H, key, i, opts = {}) {
    super(H);
    this.key = key; this.i = i; this.spec = opts.spec ?? ROBOT_SPECS[key]; this.name = this.spec.short; this.traits = opts.traits ?? TRAITS[key];
    this.nav = opts.nav ?? H.nav;
    this.body = opts.body ?? buildRobot(key); H.group.add(this.body.root);
    this.m = new Mover(this.nav, { need: opts.need ?? 2, opener: !opts.nav, speed: this.spec.speed, turn: 2.2, ease: 1.6 });
    this.m.avoid = (x, z) => H.blocked(this, x, z, 1.25);
    this.m.onDoor = d => this.openDoor(d);
    this.bubble = H.bubbles.make(this.spec.short);
    this.expr = 'neutral'; this.exprUntil = 0; this.drop = 0; this.anim = null; this.spin = 0;
    this.carrying = null; this.fetching = null; this.drinkObj = null; this.forGuest = false;
    this.greetedAt = -1e9; this.hostEndedAt = -1e9; this.engagedUntil = 0; this.lastBackoff = 0;
    this.lastYaw = 0; this.blinkAt = 3; this.lastCheck = 0; this.lines = 0; this.glance = 0;
    this.inter = { x: 0, y: 0, z: 0, reach: 8, label: () => this.label(), act: () => this.act() };
    H.ctx.interact.push(this.inter);
  }
  get x() { return this.m.x; } get z() { return this.m.z; } get f() { return this.m.f; } get y() { return this.m.y; }
  // Indoor staff look after her indoors; the gardeners outside
  inDomain() { const v = this.H.visitor; return v.present && !v.outside; }
  visitorDist() { const v = this.H.visitor; return this.inDomain() && v.f === this.f ? Math.hypot(v.x - this.x, v.z - this.z) : Infinity; }
  seeGuest() { return this.H.see(this, this.H.visitor); }

  // ---- speech ---------------------------------------------------------------------------------
  fill(text, extra = {}) {
    const H = this.H;
    const map = { drink: extra.drink ?? H.mem.lastDrink?.name ?? 'drink', time: timeWords(H.day.hour), other: extra.other ?? '', room: extra.room ?? (H.visitor.room ?? 'this room').toLowerCase() };
    return text.replace(/\{(\w)(\w*)\}/g, (_, a, b) => { const v = map[(a + b).toLowerCase()] ?? ''; return a === a.toUpperCase() ? cap(v) : v; });
  }
  // toGuest: turn to her and hold still while speaking (the default when she is near)
  say(text, { expr = null, secs = null, extra, toGuest = true } = {}) {
    const H = this.H, t = this.fill(text, extra);
    const dur = secs ?? Math.min(7.5, 2.4 + t.length * 0.055);
    this.bubble.say(t, dur, H.now);
    this.expr = expr ?? (/!/.test(t) ? 'happy' : /\?$/.test(t) ? 'surprised' : ['sass', 'neutral', 'happy', 'wink'][Math.floor(H.rnd() * 4)]);
    this.exprUntil = H.now + Math.min(6, 1.5 + t.length * 0.05);
    this.lines++; H.events.lines++;
    if (toGuest && this.visitorDist() < 14) this.engagedUntil = Math.max(this.engagedUntil, H.now + dur);
    if (H.near(this, 20)) H.chirp(this.spec.chirp, 0.05, this);
    return t;
  }
  line(pool, opts = {}) { const list = VOICE[this.key][pool]; if (!list) return null; return this.say(this.H.bag(`${this.key}.${pool}`, list), opts); }
  get engaged() { return this.H.now < this.engagedUntil || this.H.talk.robot === this; }

  // ---- talking with the guest -------------------------------------------------------------------
  label() {
    if (this.carrying && this.forGuest) return `take the ${this.carrying.name} from ${this.name}`;
    if (this.H.talk.robot === this) return 'next line (or 1–3)';
    return `talk to ${this.name}`;
  }
  act() {
    const H = this.H; H.events.asks++;
    if (this.carrying && this.forGuest) return this.giveDrink();
    if (H.talk.robot !== this) { this.engagedUntil = H.now + 1; if (H.talk.robot) H.talk.close(); }
    H.talk.press(this);
    if (!H.host && this.interruptible) { H.host = this; this.greetedAt = H.now; H.mem.greeted = true; this.run('host', this.host(true), false); H.host = this; }
  }
  // The card of things to say, built from what has happened so far in the visit
  dialogue() {
    const H = this.H, v = H.visitor, mem = H.mem, k = this.key, out = [];
    const reply = (pool, opts) => () => { this.line(pool, opts); return null; };
    // something to drink
    if (this.fetching) out.push({ text: `How is my ${this.fetching.name} coming along?`, act: reply('busy', { extra: { drink: this.fetching.name } }) });
    else if (v.holding) out.push({ text: `This ${v.holding.name} is lovely.`, act: reply('enjoying', { extra: { drink: v.holding.name }, expr: 'love' }) });
    else if (mem.lastDrink && mem.finished && !mem.lastDrink.gift) out.push({ text: 'Could I have another drink?', act: () => {
      this.line('refill', { extra: { drink: mem.lastDrink.name } });
      const others = this.drinkCard().filter(o => !o.text.includes(mem.lastDrink.name)).slice(0, 2);
      return [{ text: `Another ${mem.lastDrink.name}, please.`, act: () => { this.order(mem.lastDrink); return null; } }, ...others];
    } });
    else {
      const h = H.day.hour, ask = h < 11.5 ? 'Could I get a coffee?' : h < 17 ? 'Something to drink?' : h < 21 ? 'Something to drink, perhaps?' : 'Something warm, maybe?';
      out.push({ text: ask, act: () => { this.line('hello', { expr: 'happy' }); return this.drinkCard(); } });
    }
    // something to talk about: what she hasn't asked yet comes first
    const topics = [];
    if (H.day.light < 0.35 && !mem.asked.has('dark')) topics.push(['dark', "It's rather dark in here.", () => { mem.asked.add('dark'); this.line('dark', { expr: 'wink' }); H.lightNearbyLamp(); return null; }]);
    if (!mem.met.has(k)) topics.push(['met', 'Hello! Who are you?', () => { mem.met.add(k); this.line('hello', { expr: 'happy' }); return [
      { text: 'What do you do here?', act: () => { this.line('job'); return null; } },
      { text: 'Lovely to meet you.', act: () => { this.line('bye', { expr: 'happy' }); return null; } }]; }]);
    topics.push(['house', 'Tell me about the house.', () => { mem.asked.add('house'); this.say(H.bag('facts', FACTS), { secs: 7.5 }); return [
      { text: 'Tell me more.', act: () => { this.say(H.bag('facts', FACTS), { secs: 7.5 }); return null; } },
      { text: 'And this room?', act: () => { const rl = roomLines(v.room); this.say(rl ? H.bag('room.' + v.room, rl) : H.bag('facts', FACTS), { secs: 6.5 }); return null; } },
      { text: 'Thank you.', act: reply('bye') }]; }]);
    topics.push(['next', 'What should I see next?', () => { mem.asked.add('next'); this.suggest(); return null; }]);
    topics.push(['job', 'What do you do here?', () => { mem.asked.add('job'); this.line('job'); return null; }]);
    topics.push(['mood', 'How are you today?', () => { mem.asked.add('mood'); this.line('mood', { expr: 'happy' }); return null; }]);
    const fresh = topics.filter(([id]) => !mem.asked.has(id) || id === 'house');
    const pick = (fresh.length ? fresh : topics)[0];
    out.push({ text: pick[1], act: pick[2] });
    out.push({ text: "That's all, thank you.", act: reply('bye') });
    return out;
  }
  drinkCard() {
    const H = this.H, list = menuFor(H.day.hour, this.traits.likes, H.rnd);
    return list.map(d => ({ text: `${cap(a_an(d.name).replace(/^a cup of/, 'a cup of'))}, please.`, act: () => { this.order(d); return null; } }));
  }
  order(d) {
    const H = this.H;
    if (H.visitor.holding) { this.line('already', { expr: 'sass' }); return; }
    this.say(`${cap(a_an(d.name))}, ${d.note}. ${this.fill(H.bag(`${this.key}.offer`, VOICE[this.key].offer), { drink: d.name })}`, { expr: 'happy', secs: 5.5 });
    H.mem.lastDrink = d; H.mem.finished = false;
    const prev = this.taskName;
    this.run('fetch', this.fetchThenHost(d, prev === 'host' || prev === 'greet'), false);
    if (!H.host) H.host = this;
  }
  suggest() {
    const H = this.H, seen = H.mem.rooms;
    const all = [...new Set(H.ctx.house.rooms.filter(r => roomLines(r.name)).map(r => r.name))];
    const left = all.filter(n => !seen.has(n) && n !== H.visitor.room);
    if (!left.length) return this.line('suggestDone');
    const n = left[Math.floor(H.rnd() * left.length)];
    this.say(this.fill(H.bag(`${this.key}.suggest`, VOICE[this.key].suggest), { room: n.toLowerCase() }));
  }
  pickDrink() { return menuFor(this.H.day.hour, this.traits.likes, this.H.rnd)[0] ?? MENU[0]; }
  giveDrink() {
    const H = this.H, d = this.carrying, g = this.drinkObj;
    this.body.slot.remove(g); this.body.tray.visible = false; this.carrying = null; this.drinkObj = null; this.forGuest = false;
    H.hold(d, g);
    this.line('thanks', { expr: 'happy' });
    H.events.drinksTaken++;
  }
  dropDrink() {
    if (this.drinkObj) this.body.slot.remove(this.drinkObj);
    this.drinkObj = null; this.body.tray.visible = false; this.carrying = null; this.forGuest = false;
  }
  openDoor(d) {
    const H = this.H; if (d.isOpen) return;
    d.isOpen = true; d.stop.off = true; H.events.doors++;
    if (this.visitorDist() < 12 && H.rnd() < 0.4) this.line('door', { toGuest: false });
  }

  // ---- decisions ------------------------------------------------------------------------------------
  // Greet once she has had a moment to arrive; the best-placed greeter on her floor does it
  wantsToGreet() {
    const H = this.H, v = H.visitor;
    if (!this.inDomain() || v.f !== this.f || H.host || H.now - v.since < 3.5 || H.now - this.greetedAt < 300 || H.now - H.lastHostEnd < 45) return false;
    const d = this.visitorDist(); if (d > 24 || !this.seeGuest()) return false;
    const better = H.robots.find(r => r !== this && r.f === v.f && r.interruptible && r.traits.greeter > this.traits.greeter && r.visitorDist() < 30);
    return !better;
  }
  think() {
    const H = this.H, v = H.visitor, R = H.rnd, tr = this.traits, night = 1 - H.day.light;
    if (this.carrying) return this.run('deliver', this.deliver(), false);
    if (this.wantsToGreet()) return this.run('greet', this.greet(), false);
    const empty = H.empties.find(e => !e.claimed && e.f === this.f && !!e.outside === !!this.outdoor);
    if (empty && (H.host === this || !H.host || H.host.taskName !== 'host')) { empty.claimed = this; return this.run('clear', this.clear(empty), false); }
    const partner = H.robots.find(r => r !== this && r.interruptible && !r.engaged && !r.carrying && H.host !== r && r.f === this.f && Math.hypot(r.x - this.x, r.z - this.z) < 30);
    const opts = [
      ['amble', 9],
      ['banter', partner && H.now - H.lastBanter > 90 ? 5 * tr.chat : 0],
      ['tidy', 5 * tr.tidy], ['patrol', this.f === tr.home ? 4 : 0], ['window', 2.5], ['picture', this.f === 0 ? 2 * tr.tidy : 0],
      ['ponder', 2.5 * tr.whim], ['reggie', this.f === 0 && H.roomba ? 0.8 : 0], ['twirl', 0.8 * tr.whim],
      ['rest', (night > 0.5 ? 6 : 1.2) * tr.rest], ['home', this.f !== tr.home ? 8 : 0],
    ].map(([k, w]) => [k, w * w * (0.55 + R() * 0.9)]);
    const k = weighted(opts, R) ?? 'patrol';
    if (k === 'host') { H.host = this; return this.run('host', this.host(false), false); }
    if (k === 'banter') return this.run('banter', this.banter(partner), false);
    this.run(k, this.orLinger(this[k]()));
  }
  // A route that fails never leaves a robot standing in a doorway
  *go(f, x, z, o = {}) {
    const ok = yield* super.go(f, x, z, { tries: this.H.nearDoor(this.f, this.x, this.z, 2.2) ? 1 : 3, ...o });
    if (!ok && !this.outdoor && this.H.nearDoor(this.f, this.x, this.z, 2.2)) { const p = this.politeSpot(this.x, this.z, 4, 3); if (p) yield* super.go(p.f, p.x, p.z, { tries: 1 }); }
    return ok;
  }
  // If a plan comes to nothing (no room to stand, no way through), stand and think instead
  *orLinger(gen) {
    const H = this.H, t0 = H.now; yield* gen;
    if (H.now - t0 < 1.5) {
      if (!this.outdoor && H.nearDoor(this.f, this.x, this.z, 2.2)) { const p = this.politeSpot(this.x, this.z, 4, 3); if (p) yield* this.go(p.f, p.x, p.z, { tries: 1 }); }
      yield* this.linger(3 + H.rnd() * 4);
    }
  }

  // ---- moving politely ----------------------------------------------------------------------------
  // A spot near p that is not in the guest's way: away from her, out of doorways, with room around it
  politeSpot(x, z, r = 3, minFromGuest = 8) {
    const H = this.H, nav = this.nav, v = H.visitor;
    const ok = c => {
      const px = nav.cx(c), pz = nav.cz(c);
      if (nav.floors[this.f].clear[c] < 2.6) return false;                                   // not wedged in a doorway or a gap
      if (H.nearDoor(this.f, px, pz, 2.6)) return false;
      if (v.present && v.f === this.f && H.host !== this && Math.hypot(px - v.x, pz - v.z) < minFromGuest) return false;
      return true;
    };
    const c = nav.nearest(this.f, x, z, 2, r + 2, true, ok);
    return c < 0 ? null : { f: this.f, x: nav.cx(c), z: nav.cz(c) };
  }
  // Where the host waits: 5-6 ft off, to her side, never ahead of her in her path
  hostSpot() {
    const H = this.H, v = H.visitor, nav = this.nav;
    this.side ??= H.rnd() < 0.5 ? 1 : -1;
    for (const [ang, dist] of [[1.0, KEEP], [-1.0, KEEP], [1.35, KEEP], [-1.35, KEEP], [0.75, KEEP + 0.5], [-0.75, KEEP + 0.5], [2.0, KEEP]]) {
      const a = Math.atan2(v.fx, v.fz) + ang * this.side, x = v.x + Math.sin(a) * dist, z = v.z + Math.cos(a) * dist;
      const c = nav.nearest(v.f, x, z, 2, 1.4, true, c => nav.floors[v.f].clear[c] >= 3 && !H.nearDoor(v.f, nav.cx(c), nav.cz(c), 2.6));
      if (c < 0) continue;
      const px = nav.cx(c), pz = nav.cz(c), d = Math.hypot(px - v.x, pz - v.z);
      if (d < 4.4 || d > 7.5 || !nav.see(v.f, v.x, v.z, px, pz)) continue;
      return { f: v.f, x: px, z: pz };
    }
    return null;
  }
  // Hold still for a while, looking at something (or, now and then, glancing at the guest)
  *linger(secs, look = null, opts = {}) {
    const H = this.H, end = H.now + secs;
    while (H.now < end) {
      if (opts.until?.()) return;
      const v = H.visitor, d = this.visitorDist();
      if (d < 16 && H.now < this.glance && this.seeGuest()) this.m.faceTo(v.x, v.z, H.dt * 0.6);
      else if (look) this.m.faceTo(look.x, look.z, H.dt * 0.6);
      if (H.now > this.glance + 6 && d < 16 && H.rnd() < H.dt * 0.08) this.glance = H.now + 2 + H.rnd() * 2;
      yield;
    }
  }

  // ---- tasks: the guest --------------------------------------------------------------------------------
  *greet() {
    const H = this.H, v = H.visitor;
    H.host = this; this.greetedAt = H.now;
    // come within a polite distance first, unhurried
    const s = this.hostSpot();
    if (s && this.visitorDist() > 8) yield* this.go(s.f, s.x, s.z, { tries: 1, until: () => this.visitorDist() < 7 });
    yield* this.wait(0.6, () => { this.m.faceTo(v.x, v.z, H.dt); return false; });
    const mk = this.memKey ?? 'greeted', first = !H.mem[mk]; H.mem[mk] = true;
    this.line(first ? 'greetFirst' : 'greet', { expr: 'happy' });
    H.events.greets++;
    yield* this.wait(0.2);
    while (this.engaged) yield;
    if (first) this.line('talkHint', { expr: 'wink' });
    yield* this.host(true);
  }
  *host(already) {
    // Brief, and local: a remark or two while she is nearby, then back to work. A host does not follow
    // her out of the room; she can always call it back with E.
    const H = this.H, v = H.visitor, start = H.now, len = 45 + H.rnd() * 30;
    H.host = this; H.events.hosts++;
    let next = H.now + (already ? 12 : 3) + H.rnd() * 6, replan = 0, lost = 0, still = 0, lastVx = v.x, lastVz = v.z, remarks = 0, home = { x: this.x, z: this.z };
    try {
      while (v.present && H.now - start < len) {
        if (!this.inDomain()) { H.lastHostEnd = H.now - 60; return; }
        const d = this.visitorDist();
        if (d === Infinity || d > 16 || Math.hypot(v.x - home.x, v.z - home.z) > 24) {
          lost += H.dt; if (lost > 2) { H.lastHostEnd = H.now - 30; return; }      // she has moved on: let her go
          yield; continue;
        }
        lost = 0;
        const moved = Math.hypot(v.x - lastVx, v.z - lastVz); lastVx = v.x; lastVz = v.z;
        still = moved < H.dt * 0.5 ? still + H.dt : 0;
        // only move when she has gone out of comfortable range, or come too close
        if (H.now > replan && (d > 9.5 || d < 4.2 || !this.seeGuest())) {
          replan = H.now + 1.5;
          const s = this.hostSpot();
          if (s && Math.hypot(s.x - this.x, s.z - this.z) > 1.2) { if (!this.m.goTo(s.f, s.x, s.z)) this.side = -this.side; }
          else if (!s) this.side = -this.side;
        }
        const st = this.m.update(H.dt, d < 4.2 ? 0.7 : 0.85);
        if (st === 'idle' || st === 'arrived') this.m.faceTo(v.x, v.z, H.dt * 0.8);
        this.helpDoors();
        // remarks, only when she has paused a moment
        if (H.now > next && still > 1.2 && d < 10 && !H.busyTalking()) { if (this.comment()) { remarks++; next = H.now + 18 + H.rnd() * 12; } else next = H.now + 4; }
        if (remarks >= 2 && !this.engaged) break;
        yield;
      }
      if (v.present && this.visitorDist() < 14) this.line('hostEnd');
    } finally {
      if (H.host === this) { H.host = null; H.lastHostEnd = H.now; }
      this.hostEndedAt = H.now;
    }
  }
  helpDoors() {
    const H = this.H, v = H.visitor;
    if (!v.present) return;
    for (const d of this.nav.doors) {
      if (d.isOpen || d.staffFloor !== v.f || d.outside) continue;
      const dx = d.cx - v.x, dz = d.cz - v.z, dist = Math.hypot(dx, dz);
      if (dist > 3.6 || dist < 0.3 || (dx * v.fx + dz * v.fz) / dist < 0.6) { d.wantSince = 0; continue; }
      d.wantSince ||= H.now;
      if (H.now - d.wantSince > 0.7) { d.isOpen = true; d.stop.off = true; H.events.doors++; this.line('door', { expr: 'wink' }); d.wantSince = 0; }
    }
  }
  comment() {
    const H = this.H, v = H.visitor, mem = H.mem;
    const rl = roomLines(v.room);
    if (rl && v.room !== this.saidRoom && H.now - v.roomSince > 2 && H.now - (H.roomSaid[v.room] ?? -1e9) > 240) {
      this.saidRoom = v.room; H.roomSaid[v.room] = H.now; this.say(H.bag('room.' + v.room, rl)); return true;
    }
    if (v.poi && H.now - v.poiSince > 1.6 && H.now - (H.poiSaid.get(v.poi) ?? -1e9) > 300) {
      H.poiSaid.set(v.poi, H.now); this.say(H.bag('poi.' + POIS.indexOf(v.poi), v.poi.lines)); H.events.looks++; return true;
    }
    if (v.aimed && H.now - (H.aimSaid ?? -1e9) > 150) {
      const hit = AIMED.find(([re]) => re.test(v.aimed));
      if (hit) { H.aimSaid = H.now; this.say(H.bag('aim.' + hit[0], hit[1])); return true; }
    }
    if (H.day.light < 0.35 && !mem.asked.has('dark') && !mem.toldDark) { mem.toldDark = true; this.line('dark', { expr: 'wink' }); H.lightNearbyLamp(); return true; }
    if (!v.holding && !this.carrying && !H.robots.some(r => r.fetching) && H.now - H.lastOffer > 150 && H.now - (mem.lastSip ?? -1e9) > 120) {
      H.lastOffer = H.now;
      if (mem.lastDrink && mem.finished) this.line('refill', { extra: { drink: mem.lastDrink.name } });
      else this.say(H.bag('offerHint', [`Can I get you anything? ${H.day.hour < 11.5 ? 'Coffee is the obvious answer.' : H.day.hour > 17 ? 'The evening calls for a glass of something.' : 'Talk to me. Press E.'}`, "Thirsty? Ask. That's what I'm for. Well, that and glamour."]));
      return true;
    }
    const reggie = H.roomba && H.roomba.f === v.f && Math.hypot(H.roomba.x - v.x, H.roomba.z - v.z) < 14;
    const k = weighted([['hour', H.now - H.hourSaid > 400 ? 3 : 0], ['fact', 1.5], ['reggie', reggie ? 1.2 : 0], ['think', 1]], H.rnd);
    if (k === 'hour') { H.hourSaid = H.now; const p = partOfDay(H.day.hour); this.say(H.bag('hour.' + p, HOURS[p])); }
    else if (k === 'fact') this.say(H.bag('facts', FACTS), { secs: 7.5 });
    else if (k === 'reggie') this.say(H.bag('reggie', REGGIE));
    else this.line('think');
    return true;
  }
  *fetchThenHost(d, resume) {
    yield* this.fetch(d);
    const H = this.H; if (resume && (!H.host || H.host === this) && H.visitor.present) yield* this.host(true);
  }
  *fetch(d) {
    const H = this.H, spot = H.spots[d.from] ?? H.spots.bar;
    while (this.engaged) { this.m.faceTo(H.visitor.x, H.visitor.z, H.dt); yield; }     // finish the sentence first
    this.fetching = d; H.events.fetches++;
    try {
      let ok = false;
      if (spot) ok = yield* this.go(spot.f, spot.x, spot.z);
      if (ok) for (let t = 0; t < 1; t += H.dt) { this.m.faceTo(spot.fx, spot.fz, H.dt); yield; }
      // made on the tray, in front of you if you followed: the glass fills, the phin drips
      const g = H.makeDrink(d); g.userData.making = true; this.drinkObj = g; this.body.slot.add(g); this.body.tray.visible = true;
      this.anim = 'make';
      if (this.visitorDist() < 16 || H.rnd() < 0.3) this.line('making', { expr: 'focus', toGuest: false });
      const T = d.prep ?? 5;
      for (let t = 0; t < T; t += H.dt) { this.expr = 'focus'; this.exprUntil = H.now + 0.5; H.fill(g, Math.min(1, t / (T * 0.9)), t); yield; }
      g.userData.making = false; H.fill(g, 1);
      this.anim = null; this.carrying = d; this.forGuest = true;
    } finally { this.fetching = null; this.anim = null; }
    yield* this.deliver();
  }
  *deliver() {
    const H = this.H, v = H.visitor;
    let arrived = 0, nextWait = 0, away = 0, replan = 0;
    while (this.carrying) {
      if (!v.present) { away += H.dt; if (away > 20) { this.dropDrink(); return; } yield; continue; }
      away = 0;
      const d = this.visitorDist();
      if (d > 4.2) {
        if (H.now > replan) {
          replan = H.now + 1.2;
          const k = Math.max(0.01, d), tx = d < 40 ? v.x + ((this.x - v.x) / k) * 3.4 : v.x, tz = d < 40 ? v.z + ((this.z - v.z) / k) * 3.4 : v.z;
          if (!this.m.goTo(v.f, tx, tz)) this.m.goTo(v.f, v.x, v.z);
        }
        this.m.update(H.dt, d > 12 ? 1.3 : 0.9);
        if (arrived && d > 9 && H.now > nextWait) { nextWait = H.now + 16; this.line('waiting', { extra: { drink: this.carrying.name }, toGuest: false }); }
      } else {
        this.m.stop(); this.m.faceTo(v.x, v.z, H.dt);
        if (!arrived) { arrived = H.now; nextWait = H.now + 16; this.line('deliver', { extra: { drink: this.carrying.name }, expr: 'happy' }); H.events.deliveries++; }
        else if (H.now > nextWait) { nextWait = H.now + 16; this.line('waiting', { extra: { drink: this.carrying.name }, expr: 'sass' }); }
      }
      if (arrived && H.now - arrived > 90) { this.line('selfDrink', { extra: { drink: this.carrying.name }, expr: 'sass' }); this.dropDrink(); return; }
      yield;
    }
    // handed over: step back to a polite distance
    const s = this.hostSpot(); if (s) yield* this.go(s.f, s.x, s.z, { tries: 1 });
  }
  // Collect an empty from a table (or from her hand) and offer another
  *clear(e) {
    const H = this.H;
    try {
      const c = this.nav.nearest(e.f, e.x, e.z, 2, 4, true);
      if (c >= 0) yield* this.go(e.f, this.nav.cx(c), this.nav.cz(c));
      for (let t = 0; t < 0.8; t += H.dt) { this.m.faceTo(e.x, e.z, H.dt); yield; }
      this.anim = 'reach'; yield* this.wait(0.8); this.anim = null;
      if (!H.empties.includes(e)) return;
      H.takeEmpty(e, this);
      this.line('clear', { toGuest: this.visitorDist() < 10 });
      yield* this.wait(1.5);
      if (H.mem.lastDrink && this.visitorDist() < 14 && !H.visitor.holding) { H.lastOffer = H.now; this.line('refill', { extra: { drink: H.mem.lastDrink.name } }); }
      yield* this.linger(4);
      this.body.slot.clear(); this.body.tray.visible = false;
    } finally { e.claimed = null; this.anim = null; }
  }

  // ---- tasks: their own business ----------------------------------------------------------------------
  // Amble to one of a few favourite spots in its own rooms, and stay a while
  *amble() {
    const H = this.H, favs = (FAVS[this.key] ?? []).filter(f => (f[2] ?? 0) === this.f);
    for (let n = 0; n < 1 + Math.floor(H.rnd() * 2); n++) {
      const f = favs[Math.floor(H.rnd() * favs.length)]; if (!f) return yield* this.patrol();
      const s = this.politeSpot(f[0] - 21.665, -f[1], 3); if (!s || !(yield* this.go(s.f, s.x, s.z))) continue;
      const y0 = this.m.yaw;
      yield* this.linger(8 + H.rnd() * 10, { x: this.x + Math.sin(y0 + (H.rnd() - 0.5) * 2) * 5, z: this.z + Math.cos(y0 + (H.rnd() - 0.5) * 2) * 5 });
    }
  }
  *patrol() {
    const H = this.H, rooms = H.ctx.house.rooms.filter(r => this.traits.round.some(n => has(r.name, n)) && this.nav.floorOf(r.y0 + 1) === this.f);
    for (let n = 0; n < 2; n++) {
      const room = rooms[Math.floor(H.rnd() * rooms.length)]; if (!room) return;
      const r = this.nav.randomSpot(this.f, 2, H.rnd, room, 4); if (!r) continue;
      const s = this.politeSpot(r.x, r.z, 3); if (!s) continue;
      if (!(yield* this.go(s.f, s.x, s.z))) continue;
      const y0 = this.m.yaw;
      yield* this.linger(4 + H.rnd() * 6, { x: this.x + Math.sin(y0 + 1) * 5, z: this.z + Math.cos(y0 + 1) * 5 });
    }
  }
  *tidy() {
    const H = this.H, F = this.nav.FLOORS[this.f], nav = this.nav;
    const pool = H.ctx.colliders.filter(c => !c.off && !c.staff && c.y0 <= F + 0.4 && c.y1 >= F + 1.2 && c.y1 <= F + 3.9 && (c.x1 - c.x0) * (c.z1 - c.z0) < 60 && nav.roomAt((c.x0 + c.x1) / 2, F + 1, (c.z0 + c.z1) / 2));
    for (let tries = 0; tries < 6; tries++) {
      const c = pool[Math.floor(H.rnd() * pool.length)]; if (!c) return;
      const cx = (c.x0 + c.x1) / 2, cz = (c.z0 + c.z1) / 2, s = this.politeSpot(cx, cz, 4.5);
      if (!s || !(yield* this.go(s.f, s.x, s.z))) continue;
      for (let t = 0; t < 0.8; t += H.dt) { this.m.faceTo(cx, cz, H.dt); yield; }
      this.anim = 'dust';
      if (H.rnd() < 0.6) this.line('tidy', { expr: this.key === 'mort' ? 'focus' : 'sass', toGuest: false });
      yield* this.linger(6 + H.rnd() * 5, { x: cx, z: cz });
      this.anim = null; H.events.tidies++;
      return;
    }
  }
  *picture() {
    const H = this.H, pics = POIS.filter(p => p.picture && p.floor === this.f);
    const p = pics[Math.floor(H.rnd() * pics.length)]; if (!p) return;
    const x = p.at[0] - 21.665, z = -p.at[1], s = this.politeSpot(x, z, 4);
    if (!s || !(yield* this.go(s.f, s.x, s.z))) return;
    for (let t = 0; t < 0.8; t += H.dt) { this.m.faceTo(x, z, H.dt); yield; }
    this.anim = 'adjust'; this.picY = p.h;
    yield* this.linger(2.5, { x, z });
    if (H.rnd() < 0.6) this.line('picture', { expr: 'focus', toGuest: false });
    yield* this.linger(3, { x, z });
    this.anim = null;
    yield* this.linger(2, { x, z });                                                  // step back and admire it
  }
  *window() {
    const H = this.H, wins = H.spots.lookouts.filter(w => w.f === this.f);
    const w = wins[Math.floor(H.rnd() * wins.length)]; if (!w) return;
    const s = this.politeSpot(w.ax, w.az, 2.5); if (!s || !(yield* this.go(s.f, s.x, s.z))) return;
    if (H.rnd() < 0.5) this.line(H.day.light > 0.4 ? 'window' : 'windowNight', { expr: 'happy', toGuest: false });
    yield* this.linger(10 + H.rnd() * 10, w, { until: () => this.wantsToGreet() });
  }
  *ponder() {
    const H = this.H;
    this.expr = 'focus'; this.exprUntil = H.now + 3;
    if (H.rnd() < 0.55) this.line('think', { expr: 'focus', toGuest: false });
    yield* this.linger(6 + H.rnd() * 6);
  }
  *reggie() {
    const H = this.H, rb = H.roomba; if (!rb || rb.f !== this.f) return;
    const s = this.politeSpot(rb.x, rb.z, 4); if (!s || !(yield* this.go(s.f, s.x, s.z))) return;
    if (H.rnd() < 0.6) this.say(H.bag('reggie', REGGIE), { expr: 'sass', toGuest: false });
    yield* this.linger(4, rb);
  }
  *twirl() {
    const H = this.H;
    if (this.visitorDist() < 10) return yield* this.ponder();      // not in front of guests
    for (let t = 0; t < 3.2; t += H.dt) { this.spin = Math.PI * 2 * Math.sin((t / 3.2) * Math.PI / 2); yield; }
    this.spin = 0;
  }
  *rest() {
    const H = this.H, s0 = H.spots.rest[this.key], s = s0 && s0.f === this.f ? s0 : this.politeSpot(this.x, this.z, 3);
    if (s) yield* this.go(s.f, s.x, s.z);
    this.drop = 0.6;
    if (H.rnd() < 0.3) this.line('rest', { expr: 'sleepy', toGuest: false });
    const end = H.now + (H.day.light < 0.4 ? 50 + H.rnd() * 60 : 20 + H.rnd() * 25);
    while (H.now < end) { this.expr = 'sleepy'; this.exprUntil = H.now + 1; if (this.wantsToGreet()) break; yield; }
    this.drop = 0; this.expr = 'blink';
  }
  *home() {
    const H = this.H, r = this.nav.randomSpot(this.traits.home, 2, H.rnd, null, 4); if (!r) return;
    yield* this.go(r.f, r.x, r.z);
  }
  *banter(p) {
    const H = this.H, nav = this.nav;
    H.lastBanter = H.now;
    const pairs = BANTER.filter(b => b.pair && b.pair[0] === this.key && b.pair[1] === p.key), any = BANTER.filter(b => !b.pair);
    const script = pairs.length && H.rnd() < 0.55 ? H.bag(`banter.${this.key}.${p.key}`, pairs) : H.bag('banter.any', any);
    const mx = (this.x + p.x) / 2, mz = (this.z + p.z) / 2, dx = this.x - p.x, dz = this.z - p.z, L = Math.max(0.01, Math.hypot(dx, dz));
    const a = this.politeSpot(mx + (dx / L) * 2, mz + (dz / L) * 2, 3), b = this.politeSpot(mx - (dx / L) * 2, mz - (dz / L) * 2, 3);
    const convo = { ready: 0, done: false };
    p.run('banter', p.banterJoin(convo, this, b), false);
    try {
      if (a) yield* this.go(this.f, a.x, a.z, { tries: 1 });
      convo.ready++;
      yield* this.wait(16, () => convo.ready >= 2);
      for (const [who, text] of script.lines) {
        const sp = who === 'a' ? this : p, other = who === 'a' ? p : this;
        const t = sp.say(text, { extra: { other: other.name }, toGuest: false });
        const end = H.now + Math.min(6.5, 2.4 + t.length * 0.05);
        while (H.now < end) { this.m.faceTo(p.x, p.z, H.dt); yield; }
      }
      H.events.banter++;
    } finally { convo.done = true; }
  }
  *banterJoin(convo, other, spot) {
    const H = this.H;
    if (spot) yield* this.go(this.f, spot.x, spot.z, { tries: 1, until: () => convo.done });
    convo.ready++;
    while (!convo.done) { this.m.faceTo(other.x, other.z, H.dt); yield; }
  }

  // ---- every frame ----------------------------------------------------------------------------------
  update(dt, t, draw) {
    const H = this.H, v = H.visitor, m = this.m;
    if (this.interruptible && H.now - this.lastCheck > 1) { this.lastCheck = H.now; if (this.wantsToGreet()) this.run('greet', this.greet(), false); }
    if (!this.task) this.think();
    const d = this.visitorDist();
    // 1. attention: hold still and face her while speaking with her
    if (this.engaged && d < 12 && this.taskName !== 'deliver') { const lk = this.lookTarget?.() ?? v; m.v = Math.max(0, m.v - dt * 3); m.faceTo(lk.x, lk.z, dt * 1.6); }
    else {
      if (this.engaged && d >= 12) { this.engagedUntil = 0; }
      // keep out of her way: a robot she walks up to (and is not talking to) eases back
      if (d < (H.host === this ? 3.2 : 4.5) && this.interruptible && H.now - this.lastBackoff > 2.5 && this.taskName !== 'step back') {
        this.lastBackoff = H.now;
        const a = Math.atan2(this.x - v.x, this.z - v.z), s = this.politeSpot(v.x + Math.sin(a) * (KEEP + 1.5), v.z + Math.cos(a) * (KEEP + 1.5), 2.5);
        if (s) this.run('step back', this.stepBack(s.x, s.z), true);
      }
      this.stepTask();
    }
    // passing a colleague
    if (H.now - H.lastNod > 30 && m.v > 0.4 && d > 10) for (const r of H.robots) if (r !== this && r.f === this.f && r.m.v > 0.3 && Math.hypot(r.x - this.x, r.z - this.z) < 4.5 && !r.bubble.talking(H.now) && !this.bubble.talking(H.now)) {
      H.lastNod = H.now; this.say(H.bag('nod', NOD), { extra: { other: r.name }, secs: 2.2, toGuest: false }); break;
    }
    const b = this.body;
    b.root.position.set(m.x, m.y, m.z);
    b.root.rotation.y = m.yaw + this.spin;
    this.inter.x = m.x; this.inter.y = m.y + this.spec.hover - this.drop; this.inter.z = m.z;
    if (this.drinkObj) H.fill(this.drinkObj, this.drinkObj.userData.fill ?? 1, t);
    if (!draw) return;
    const ph = this.i * 2.1;
    this.dropNow = (this.dropNow ?? 0) + (this.drop - (this.dropNow ?? 0)) * Math.min(1, dt * 1.5);
    b.bob.position.y = this.spec.hover - this.dropNow + 0.06 * Math.sin(t * 1.5 + ph);
    const dyaw = m.yaw + this.spin - this.lastYaw, turn = Math.atan2(Math.sin(dyaw), Math.cos(dyaw)) / Math.max(dt, 1e-3); this.lastYaw = m.yaw + this.spin;
    b.bob.rotation.x += (Math.min(0.14, m.v * 0.05) - b.bob.rotation.x) * Math.min(1, dt * 3);
    b.bob.rotation.z += (Math.max(-0.12, Math.min(0.12, -turn * 0.05)) - b.bob.rotation.z) * Math.min(1, dt * 3);
    b.ring.scale.setScalar(1 + 0.08 * Math.sin(t * 3 + ph));
    b.ring.material.opacity = 0.85 - this.dropNow * 0.8;
    // face: expression, gaze, blinking
    let look = 0;
    if (d < 16) { let a = Math.atan2(v.x - m.x, v.z - m.z) - m.yaw; a = Math.atan2(Math.sin(a), Math.cos(a)); look = Math.max(-1, Math.min(1, a * 1.2)); }
    this.blinkAt -= dt; const blink = this.blinkAt < 0; if (this.blinkAt < -0.13) this.blinkAt = 2.5 + H.rnd() * 4;
    const expr = H.now < this.exprUntil ? this.expr : this.anim === 'make' ? 'focus' : this.carrying ? 'happy' : this.drop > 0.5 ? 'sleepy' : H.talk.robot === this ? 'happy' : 'neutral';
    b.face.draw(expr, look, blink && expr !== 'sleepy');
    // hands
    const [hl, hr] = b.hands, talking = this.bubble.talking(H.now), rest = h => h.userData.rest, sway = 0.035 * Math.sin(t * 1.8 + ph);
    hl.position.set(rest(hl)[0], rest(hl)[1] + sway, rest(hl)[2]);
    hr.position.set(rest(hr)[0], rest(hr)[1] - sway, rest(hr)[2]);
    if (b.tray.visible) { const ta = b.tray.position; hr.position.set(ta.x + 0.05, ta.y - 0.1, ta.z - 0.05); b.tray.rotation.z = 0.02 * Math.sin(t * 1.3); }
    else if (talking) { hr.position.y += 0.1 + 0.07 * Math.abs(Math.sin(t * 4)); hr.position.z += 0.16; }
    if (this.anim === 'dust') { hl.position.z += 0.35; hl.position.y += 0.15 + 0.02 * Math.sin(t * 11); hr.position.x += 0.12 * Math.sin(t * 3); hr.position.z += 0.4 + 0.1 * Math.cos(t * 3); hr.position.y -= 0.1; }
    if (this.anim === 'make') { hl.position.x = b.tray.position.x - 0.3; hl.position.z = b.tray.position.z + 0.05; hl.position.y = b.tray.position.y + 0.25 + 0.05 * Math.sin(t * 6); }
    if (this.anim === 'reach') { hr.position.z += 0.45; hr.position.y -= 0.2; }
    if (this.anim === 'adjust') { const up = Math.min(1.2, Math.max(0, (this.picY ?? 6) - m.y - this.spec.hover)); for (const [h, s] of [[hl, -1], [hr, 1]]) { h.position.set(s * 0.35, up + 0.03 * Math.sin(t * 5 + s), 0.6); } }
    if (b.wingL) { const a = 0.35 + 0.28 * Math.sin(t * 14); b.wingL.rotation.z = a; b.wingR.rotation.z = -a; }
  }
  *stepBack(x, z) {
    yield* this.go(this.f, x, z, { tries: 1, speed: 0.7 });
    yield* this.linger(3 + this.H.rnd() * 3);
  }
  headPos(out) { return out.set(this.m.x, this.m.y + this.body.top + 0.35 - (this.dropNow ?? 0), this.m.z); }
}
