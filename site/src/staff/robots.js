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
//   Manners, over all of these: a robot in the line she is walking, or one she walks up to, steps
//      promptly aside to open floor (out of the hall if it can, never into a doorway or onto the
//      stair), turns to her, waits until she has passed, then picks up what it was doing. None is
//      left standing about in a hall, a doorway or at the stair: those are ways through.
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
const KEEP = 5.5;                  // a respectful distance, in feet
// Favourite spots in their own territory, in plan feet [X, Y, floor]
// Empties left about, and a second drink asked for while the first is still going: said sparingly
const DRY = {
  barty: { clear: ['Another fallen soldier.', 'I shall give it a decent burial. In the dishwasher.', '*retrieves the empty as if it were evidence*'],
    notice: ['There is a perfectly good {drink} over there with your name on it, but who am I to stand in the way of ambition.', 'The {drink} on the side is barely touched, darling. Still: coming up.'] },
  mort: { clear: ['Rings on the wood. We have discussed this, the house and I.', '*lifts the empty, inspects the surface underneath, approves of nothing*', 'Into the sink with you.'],
    notice: ['You have a {drink} not six feet away. I will make another. I will also remember.', 'Noted: the {drink} you left. Noted: you want another.'] },
  fig: { clear: ['Empty! I love an empty. It means it was good.', '*scoops up the empty and does a tiny spin*', 'This one is coming with me!'],
    notice: ["Ooh, there's still {drink} over there! But a fresh one, yes, okay!", 'Two drinks! Like a party for one!'] },
};
const FAVS = {
  barty: [[8, 20], [12, 8], [14, 24], [38, 8], [35, 3.5]],          // (in rooms: not the hall, nor the coffee-bar galley, which are ways through)
  mort: [[36, 25], [37.5, 33], [40, 30], [40, 12], [25, 30]],
  fig: [[10, 24, 1], [35, 6, 1], [25, 34, 1], [35, 26, 1], [5, 27, 1], [10, 8, 1]],      // (none in the upstairs hall: it is a way through)
};
const GOING = 1, HOLD = 2, BACK = 3;                     // stepping aside: on the way, waiting for her to pass, going back
const RADII = [2.5, 3.5, 4.5, 6];
const DET_C = new Int32Array(512), DET_W = new Uint8Array(512);       // cells briefly marked as furniture (planAround)
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
    this.aside = { phase: 0, x: 0, z: 0, f: 0, t0: 0, hold: true, back: false, bx: 0, bz: 0, goal: false, gf: 0, gx: 0, gz: 0, kind: 0 };
    this.asideEnd = -9; this.nextManners = i * 0.07; this.laneTime = 0;
    this.inter = { x: 0, y: 0, z: 0, reach: 8, label: () => this.label(), act: () => this.act() };
    H.ctx.interact.push(this.inter);
  }
  get x() { return this.m.x; } get z() { return this.m.z; } get f() { return this.m.f; } get y() { return this.m.y; }
  run(name, gen, interruptible) { if (this.aside?.phase) { this.aside.phase = 0; this.asideEnd = this.H.now; this.m.turnRate = 2.2; } this.m.strafe = false; if (name !== 'demo') { this.anim = null; this.workAt = null; this.reachTo = null; } super.run(name, gen, interruptible); }      // (a job cut short leaves no hand mid-air)
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
    if (typeof window !== 'undefined') window.__said?.push(`${this.name}: ${text}`);      // tests may collect what is said
    const H = this.H, t = this.fill(text, extra);
    const dur = Math.max(secs ?? 0, Math.min(15, 2.6 + t.length * 0.075));      // as bubbles.js: long enough to read
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

  // A first-ever visitor (welcome.js sets window.__newcomer) is welcomed properly by whoever has the
  // lines for it (Bartholomew): who he is, the card on the hall table, and the offer of a drink.
  welcomeNew() {
    const H = this.H;
    if (typeof window === 'undefined' || !window.__newcomer || !VOICE[this.key]?.welcomeNew) return false;
    window.__newcomer = false; H.mem[this.memKey ?? 'greeted'] = true; H.mem.met.add(this.key); H.events.greets++;
    this.line('welcomeNew', { expr: 'happy', secs: 10 }); this.engagedUntil = H.now + 4;
    H.talk.open(this, [...this.drinkCard().slice(0, 3).map(o => ({ text: o.text, act: () => { const r = o.act(); return r; } })),
      { text: 'Nothing just now, thank you.', act: () => { this.line('welcomeNo', { expr: 'happy', secs: 7 }); return null; } }]);
    return true;
  }
  // ---- talking with the guest -------------------------------------------------------------------
  label() {
    if (this.carrying && this.forGuest) return `take the ${this.carrying.name} from ${this.name}`;
    if (this.H.talk.robot === this) return 'next line (or 1–3)';
    return `talk to ${this.name}`;
  }
  act() {
    const H = this.H; H.events.asks++;
    if (this.welcomeNew()) return;
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
    const v = H.visitor;
    if (v.holding && !v.holding.gift) { this.line('already', { expr: 'sass' }); return; }
    const left = H.drinksDown.find(r => !r.d.food && !r.d.gift && r.fill > 0.15 && r.f === v.f && !!r.outside === !!v.outside && Math.hypot(r.x - v.x, r.z - v.z) < 16);
    if (left && DRY[this.key]) { this.say(this.fill(H.bag(`${this.key}.notice`, DRY[this.key].notice), { drink: left.d.name }), { expr: 'sass', secs: 5 }); H.events.noticed = (H.events.noticed ?? 0) + 1; }
    else this.say(`${cap(a_an(d.name))}, ${d.note}. ${this.fill(H.bag(`${this.key}.offer`, VOICE[this.key].offer), { drink: d.name })}`, { expr: 'happy', secs: 5.5 });
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
  // Handing it over: the tray goes out to her first (poseHands), then the glass travels to her hand
  giveDrink() { if (!this.handing && this.carrying) this.handing = { t0: this.H.now }; }
  finishGive() {
    const H = this.H, d = this.carrying, g = this.drinkObj; if (!d || !g) return;
    const from = g.getWorldPosition(new H.THREE.Vector3());
    this.body.slot.remove(g); this.body.tray.visible = false; this.carrying = null; this.drinkObj = null; this.forGuest = false;
    H.hold(d, g, { from });
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
    const empty = H.empties.find(e => !e.claimed && e.f === this.f && !!e.outside === !!this.outdoor && H.now - (e.t ?? 0) > (e.inHand ? 8 : 25) && this.nearestFree(e));      // (noticed after a little while, by whoever is free and nearest)
    if (empty && (H.host === this || !H.host || H.host.taskName !== 'host')) { empty.claimed = this; return this.run('clear', this.clear(empty), false); }
    const partner = H.robots.find(r => r !== this && r.interruptible && !r.engaged && !r.carrying && H.host !== r && r.f === this.f && Math.hypot(r.x - this.x, r.z - this.z) < 30);
    const opts = [
      ['amble', 9],
      ['banter', partner && H.now - H.lastBanter > 90 ? 5 * tr.chat : 0],
      ['tidy', 5 * tr.tidy], ['patrol', this.f === tr.home ? 4 : 0], ['window', 2.5], ['picture', this.f === 0 ? 2 * tr.tidy : 0],
      ['ponder', 2.5 * tr.whim], ['reggie', this.f === 0 && H.roomba ? 0.8 : 0], ['twirl', 0.8 * tr.whim],
      ['rest', (night > 0.5 ? 6 : 1.2) * tr.rest], ['home', this.f !== tr.home ? 8 : 0],
    ].map(([k, w]) => [k, w * w * (0.55 + R() * 0.9)]);
    let k = weighted(opts, R) ?? 'patrol';
    if ((k === 'ponder' || k === 'twirl') && this.inLane()) k = 'amble';                     // not standing thinking in a hall
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
      if (!this.outdoor && (H.nearDoor(this.f, this.x, this.z, 2.2) || this.inLane())) { const p = this.roomSpot(3) ?? this.politeSpot(this.x, this.z, 4, 3); if (p) yield* this.go(p.f, p.x, p.z, { tries: 1 }); }
      yield* this.linger(3 + H.rnd() * 4);
    }
  }

  // ---- moving politely ----------------------------------------------------------------------------
  // A spot near p that is not in the guest's way: away from her, out of doorways, with room around it
  // and not in a hall or on top of anybody: in the open if there is open floor near, else a little closer in
  politeSpot(x, z, r = 3, minFromGuest = 8) {
    const H = this.H, nav = this.nav, v = H.visitor, f = this.f, F = nav.floors[f], lane = F.lane;
    for (const [minClear, far] of [[3.6, 2], [2.6, 2], [2.2, 6]]) {
      const ok = c => {
        const px = nav.cx(c), pz = nav.cz(c);
        if (F.clear[c] < minClear || (lane && lane[c] && !(far === 6 && lane[c] === 4 && !this.narrowBusy(c)))) return false;      // not wedged in a gap, not in a hall (a narrow spot, at a pinch, if nobody else is in its narrow parts)
        if (H.nearDoor(f, px, pz, 2.6)) return false;
        if (v.present && v.f === f && H.host !== this && Math.hypot(px - v.x, pz - v.z) < minFromGuest) return false;
        if (!this.outdoor && H.taken(this, f, px, pz, 2.6)) return false;
        return true;
      };
      const c = nav.nearest(f, x, z, 2, r + far, true, ok);
      if (c >= 0) return { f, x: nav.cx(c), z: nav.cz(c) };
    }
    return null;
  }
  // The nearest place to wait that is a room, not a way through
  roomSpot(minFromGuest = 4.8) {
    const H = this.H, nav = this.nav, v = H.visitor, f = this.f, F = nav.floors[f];
    const c = nav.nearest(f, this.x, this.z, 2, 16, true, c => {
      if (F.clear[c] < 3 || F.lane[c]) return false;
      const px = nav.cx(c), pz = nav.cz(c);
      if (v.present && v.f === f && !v.outside && Math.hypot(px - v.x, pz - v.z) < minFromGuest) return false;
      return !H.taken(this, f, px, pz, 2.6);
    });
    return c < 0 ? null : { f, x: nav.cx(c), z: nav.cz(c) };
  }
  // A spot s near enough (x, z) to be working on it, and in sight of it
  within(s, x, z, r) { return !!s && Math.hypot(s.x - x, s.z - z) < r && this.nav.see(s.f, s.x, s.z, x, z); }
  inLane() { return !this.outdoor && !!this.nav.laneAt(this.f, this.x, this.z); }
  inNarrow() { return !this.outdoor && this.nav.laneAt(this.f, this.x, this.z) === 4; }
  roomOf(x, z) { return this.nav.roomAt(x, this.nav.FLOORS[this.f] + 1, z); }
  // Is somebody else already in (or on the way to) the narrow parts of the room this cell is in, or is she in that room?
  narrowBusy(c) {
    const H = this.H, nav = this.nav, x = nav.cx(c), z = nav.cz(c), room = this.roomOf(x, z), v = H.visitor; if (!room) return false;
    if (v.present && !v.outside && v.f === this.f && this.roomOf(v.x, v.z) === room) return true;
    for (const o of H.robots) {
      if (o === this || o.f !== this.f) continue;
      if (nav.laneAt(o.f, o.x, o.z) === 4 && o.roomOf(o.x, o.z) === room) return true;
      const g = o.m.goal; if (o.m.path && g && g.f === this.f && nav.laneAt(g.f, g.x, g.z) === 4 && o.roomOf(g.x, g.z) === room) return true;
    }
    return false;
  }
  // Out of an aisle when she comes in: by the far end, then a moment's pause, then on with the day
  *leave(p) {
    const H = this.H, v = H.visitor, m = this.m;
    if (!this.goAvoiding(this.f, p.x, p.z, v.x, v.z, 1.8) && !m.goTo(this.f, p.x, p.z)) return;
    m.turnRate = 4;
    for (let t = 0; t < 14; t += H.dt) { const s = m.update(H.dt, 1.15); if (s !== 'moving' && s !== 'waiting') break; yield; }
    m.stop(); m.turnRate = 2.2;
    yield* this.linger(2 + H.rnd() * 3, v.present && v.f === this.f ? v : null);
  }
  // Where the host waits: 5-6 ft off, to her side, never ahead of her in her path
  hostSpot() {
    const H = this.H, v = H.visitor, nav = this.nav;
    this.side ??= H.rnd() < 0.5 ? 1 : -1;
    const F = nav.floors[v.f], lane = F.lane;
    for (let pass = 0; pass < (lane ? 2 : 1); pass++) for (const [ang, dist] of [[1.0, KEEP], [-1.0, KEEP], [1.35, KEEP], [-1.35, KEEP], [0.75, KEEP + 0.5], [-0.75, KEEP + 0.5], [2.0, KEEP]]) {      // (out of the hall if there is anywhere else)
      const a = Math.atan2(v.fx, v.fz) + ang * this.side, x = v.x + Math.sin(a) * dist, z = v.z + Math.cos(a) * dist;
      const c = nav.nearest(v.f, x, z, 2, 1.4, true, c => F.clear[c] >= 3 && !(lane && lane[c] && (!pass || lane[c] === 2 || lane[c] === 3 || (lane[c] === 4 && F.clear[c] < 3.5))) && !H.nearDoor(v.f, nav.cx(c), nav.cz(c), 2.6) && (this.outdoor || !H.taken(this, v.f, nav.cx(c), nav.cz(c), 2.4)));
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
    const s = this.hostSpot() ?? (this.inLane() ? this.roomSpot(4) : null);
    if (s && (this.visitorDist() > 8 || this.inLane())) yield* this.go(s.f, s.x, s.z, { tries: 1, until: () => this.visitorDist() < 7 && !this.inLane() });      // (not greeting her from a doorway)
    yield* this.wait(0.6, () => { this.m.faceTo(v.x, v.z, H.dt); return false; });
    const mk = this.memKey ?? 'greeted', first = !H.mem[mk]; H.mem[mk] = true;
    if (first && this.welcomeNew()) { yield* this.wait(0.2); while (this.engaged) yield; }
    else {
      this.line(first ? 'greetFirst' : 'greet', { expr: 'happy' });
      H.events.greets++;
      yield* this.wait(0.2);
      while (this.engaged) yield;
      if (first) this.line('talkHint', { expr: 'wink' });
    }
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
        if (H.now > replan && (d > 9.5 || d < 4.2 || !this.seeGuest() || (!this.m.path && this.inLane() && !this.engaged))) {      // (nor waiting on her in a doorway)
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
  // Is this the free robot nearest to it (on its floor)? A busy one, or one she is talking to, leaves it
  nearestFree(e) {
    const H = this.H, d0 = Math.hypot(e.x - this.x, e.z - this.z);
    return !H.robots.some(o => o !== this && o.f === e.f && o.interruptible && !o.engaged && !o.carrying && H.host !== o && Math.hypot(e.x - o.x, e.z - o.z) < d0 - 1);
  }
  *clear(e) {
    const H = this.H;
    try {
      // a spot beside it, in reach, by the polite way (not bursting past her: the manners still apply)
      const c = e.inHand ? -1 : this.nav.nearest(e.f, e.x, e.z, 2, 3.5, true, c => !this.H.taken(this, e.f, this.nav.cx(c), this.nav.cz(c), 2.2));
      if (e.inHand) yield* this.go(e.f, e.x, e.z, { tries: 2, until: () => this.visitorDist() < 4.2 });
      else if (c >= 0) yield* this.go(e.f, this.nav.cx(c), this.nav.cz(c));
      if (!H.empties.includes(e)) return;
      if (Math.hypot(e.x - this.x, e.z - this.z) > 4.5) return;                                     // could not get to it: another time
      for (let t = 0; t < 0.8; t += H.dt) { this.m.faceTo(e.x, e.z, H.dt); yield; }
      this.anim = 'reach'; this.reachTo = e; yield* this.wait(0.8);
      if (!H.empties.includes(e)) return;
      const took = H.takeEmpty(e, this); this.reachTo = null; this.anim = null;
      if (took === false) return;                                                                    // (a guest's cup that was not to be had: on with the day)
      const near = this.visitorDist() < 12;
      if (near && DRY[this.key] && H.rnd() < 0.35) this.say(H.bag(`${this.key}.dry`, DRY[this.key].clear), { expr: 'sass', toGuest: false });
      else if (e.inHand) this.line('clear', { toGuest: true });
      yield* this.wait(1.2);
      if (H.mem.lastDrink && this.visitorDist() < 14 && !H.visitor.holding && H.rnd() < 0.5) { H.lastOffer = H.now; this.line('refill', { extra: { drink: H.mem.lastDrink.name } }); }
      // to the sink (the coffee bar, or the kitchen) where it is washed up and gone
      const sink = this.f === 0 ? (H.spots.bar ?? H.spots.kitchen) : null;
      if (sink) yield* this.go(sink.f, sink.x, sink.z, { tries: 2 });
      else yield* this.linger(3);
      this.anim = 'reach'; yield* this.wait(0.6);
      this.body.slot.clear(); this.body.tray.visible = false;
    } finally { e.claimed = null; this.anim = null; this.reachTo = null; if (this.body.tray.visible && !this.carrying) { this.body.slot.clear(); this.body.tray.visible = false; } }
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
    const H = this.H, rooms = H.ctx.house.rooms.filter(r => this.traits.round.some(n => has(r.name, n)) && this.nav.floorOf(r.y0 + 1) === this.f && !/hall/i.test(r.name));      // (through the halls, not round them)
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
      if (!this.within(s, cx, cz, 6) || !(yield* this.go(s.f, s.x, s.z))) continue;      // (a hall table is dusted in passing, not stood at)
      for (let t = 0; t < 0.8; t += H.dt) { this.m.faceTo(cx, cz, H.dt); yield; }
      this.workAt = { x: Math.max(c.x0 + 0.2, Math.min(c.x1 - 0.2, this.x)), y: c.y1, z: Math.max(c.z0 + 0.2, Math.min(c.z1 - 0.2, this.z)) };      // the near edge of the top: the cloth goes there
      this.anim = 'dust';
      if (H.rnd() < 0.6) this.line('tidy', { expr: this.key === 'mort' ? 'focus' : 'sass', toGuest: false });
      yield* this.linger(6 + H.rnd() * 5, { x: cx, z: cz });
      this.anim = null; this.workAt = null; H.events.tidies++;
      return;
    }
  }
  *picture() {
    const H = this.H, pics = POIS.filter(p => p.picture && p.floor === this.f);
    const p = pics[Math.floor(H.rnd() * pics.length)]; if (!p) return;
    const x = p.at[0] - 21.665, z = -p.at[1], s = this.politeSpot(x, z, 4);
    if (!this.within(s, x, z, 7) || !(yield* this.go(s.f, s.x, s.z))) return;
    for (let t = 0; t < 0.8; t += H.dt) { this.m.faceTo(x, z, H.dt); yield; }
    this.anim = 'adjust'; this.picY = p.h; this.workAt = { x, y: p.h, z };
    yield* this.linger(2.5, { x, z });
    if (H.rnd() < 0.6) this.line('picture', { expr: 'focus', toGuest: false });
    yield* this.linger(3, { x, z });
    this.anim = null; this.workAt = null;
    yield* this.linger(2, { x, z });                                                  // step back and admire it
  }
  *window() {
    const H = this.H, wins = H.spots.lookouts.filter(w => w.f === this.f);
    const w = wins[Math.floor(H.rnd() * wins.length)]; if (!w) return;
    const s = this.politeSpot(w.ax, w.az, 2.5); if (!this.within(s, w.x, w.z, 7) || !(yield* this.go(s.f, s.x, s.z))) return;
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
    const H = this.H, nav = this.nav;
    let r = null; for (let k = 0; k < 8 && !r; k++) { r = nav.randomSpot(this.traits.home, 2, H.rnd, null, 4); if (r && nav.laneAt(r.f, r.x, r.z)) r = null; }      // somewhere in a room
    if (!r) return;
    yield* this.go(r.f, r.x, r.z);
  }
  *banter(p) {
    const H = this.H, nav = this.nav;
    H.lastBanter = H.now;
    const pairs = BANTER.filter(b => b.pair && b.pair[0] === this.key && b.pair[1] === p.key), any = BANTER.filter(b => !b.pair);
    const script = pairs.length && H.rnd() < 0.55 ? H.bag(`banter.${this.key}.${p.key}`, pairs) : H.bag('banter.any', any);
    const mx = (this.x + p.x) / 2, mz = (this.z + p.z) / 2, dx = this.x - p.x, dz = this.z - p.z, L = Math.max(0.01, Math.hypot(dx, dz));
    const a = this.politeSpot(mx + (dx / L) * 2, mz + (dz / L) * 2, 3);
    let b = null;                                                                                    // (not the same spot as a: they used to stand nose to nose)
    for (const k of [2, 4, 6]) { const q = p.politeSpot(mx - (dx / L) * k, mz - (dz / L) * k, 3); if (q && (!a || Math.hypot(q.x - a.x, q.z - a.z) > 3.2)) { b = q; break; } }
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
    if (this.interruptible && !this.aside.phase && H.now - this.lastCheck > 1) { this.lastCheck = H.now; if (this.wantsToGreet()) this.run('greet', this.greet(), false); }
    if (!this.task) this.think();
    const d = this.visitorDist();
    // 1. attention: hold still and face her while speaking with her
    if (this.engaged && d < 12 && this.taskName !== 'deliver' && !(H.talk.robot !== this && (d < 2.4 || (v.speed > 1.2 && this.inHerWay())))) {      // (a remark does not stop it giving way)
      if (this.aside.phase) this.resume();
      const lk = this.lookTarget?.() ?? v; m.v = Math.max(0, m.v - dt * 3); m.faceTo(lk.x, lk.z, dt * 1.6);
    } else if (!this.outdoor) {
      if (this.engaged && d >= 12) { this.engagedUntil = 0; }
      // manners: a few times a second, not every frame
      if (H.now >= this.nextManners) { this.nextManners = H.now + 0.2; this.manners(); }
      if (this.aside.phase) this.stepAside(dt); else this.stepTask();
    } else {
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
    // a drink being handed over goes once the hand is out to her (drawn or not: the test pages do not draw)
    if (this.handing && !this.handing.hold && H.now - this.handing.t0 > 0.4) { this.handing = null; this.finishGive(); }
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
    this.poseHands(dt, t, ph, d);
    if (b.wingL) { const a = 0.35 + 0.28 * Math.sin(t * 14); b.wingL.rotation.z = a; b.wingR.rotation.z = -a; }
  }
  // ---- hands -----------------------------------------------------------------------------------------
  // Each mitten has somewhere it should be (in the body's own frame) and eases there: no snapping. At
  // work it reaches to the thing itself (the table it dusts, the frame it straightens, the empty it
  // picks up), as far as an arm goes; the tray eases in, comes forward when offered and goes out to her
  // as it is handed over; a hand that is talking moves with the mood of the line; neither goes through
  // the body; and the free hand keeps a little life in it.
  poseHands(dt, t, ph, d) {
    const H = this.H, b = this.body, m = this.m, THREE = H.THREE, [hl, hr] = b.hands, rl = hl.userData.rest, rr = hr.userData.rest;
    const talking = this.bubble.talking(H.now), ease = 1 - Math.exp(-dt * 9), moving = Math.min(1, m.v / 2);
    const P = this.handT ??= { l: new THREE.Vector3(), r: new THREE.Vector3(), w: new THREE.Vector3(), tray: null, trayT: new THREE.Vector3(), was: false };
    const sway = 0.035 * Math.sin(t * 1.8 + ph) * (1 + moving), tl = P.l, tr = P.r;
    tl.set(rl[0], rl[1] + sway, rl[2] + 0.04 * moving * Math.sin(t * 3 + ph)); tr.set(rr[0], rr[1] - sway, rr[2] - 0.04 * moving * Math.sin(t * 3 + ph));
    const reach = (out, h, w, maxR = 1.8) => {                                    // a point in the world, as far as the arm goes
      b.bob.updateWorldMatrix(true, false); out.set(w.x, w.y, w.z); b.bob.worldToLocal(out);
      const r0 = h.userData.rest, dx = out.x - r0[0], dy = out.y - r0[1], dz = out.z - r0[2], L = Math.hypot(dx, dy, dz);
      if (L > maxR) out.set(r0[0] + dx / L * maxR, r0[1] + dy / L * maxR, r0[2] + dz / L * maxR);
      return out;
    };
    // the tray
    const tray = b.tray; P.tray ??= tray.position.clone();
    const tt = P.trayT.copy(P.tray);
    if (this.carrying && this.forGuest && d < 4.8 && m.v < 0.3) { tt.z += 0.2; tt.y += 0.08; }          // offered
    if (this.handing) { const k = Math.min(1, (H.now - this.handing.t0) / 0.35); tt.z += 0.2 + 0.4 * k; tt.y += 0.08 + 0.14 * k; tt.x -= 0.18 * k; }      // handed over: out to her
    if (tray.visible && !P.was) { tray.scale.setScalar(0.4); tray.position.copy(P.tray).y -= 0.15; }
    P.was = tray.visible;
    if (tray.visible) {
      tray.position.lerp(tt, ease); tray.scale.setScalar(Math.min(1, tray.scale.x + dt * 2.5)); tray.rotation.z = 0.02 * Math.sin(t * 1.3);
      tr.set(tray.position.x, tray.position.y - 0.13, tray.position.z - 0.02);                      // flat under the tray
      tl.set(rl[0] * 0.92, rl[1] + sway, rl[2] + 0.08);
      if (this.handing) tl.set(tray.position.x - 0.45, tray.position.y + 0.02, tray.position.z - 0.05);    // the other hand steadies it on the way
    } else if (talking) {
      const ex = H.now < this.exprUntil ? this.expr : 'neutral', bt = Math.abs(Math.sin(t * 3.4 + ph));
      if (ex === 'happy') { tl.set(rl[0] - 0.04, rl[1] + 0.2 + 0.05 * Math.sin(t * 4.2), rl[2] + 0.28); tr.set(rr[0] + 0.04, rr[1] + 0.22 + 0.05 * Math.sin(t * 4.2 + 1.3), rr[2] + 0.28); }      // open, both hands
      else if (ex === 'sass' || ex === 'wink') { tr.set(rr[0] + 0.06, rr[1] + 0.3 + 0.1 * bt, rr[2] + 0.26); tl.set(rl[0] + 0.02, rl[1] - 0.1, rl[2] - 0.16); }      // a flick; the other on the hip
      else if (ex === 'sleepy') { tr.set(rr[0], rr[1] + 0.06 + 0.03 * bt, rr[2] + 0.12); }
      else { tr.set(rr[0] * 0.86, rr[1] + 0.18 + 0.06 * bt, rr[2] + 0.34); tl.y += 0.04 * Math.sin(t * 2.1); }      // making a point, unhurried
    }
    // at work
    const wa = this.workAt;
    if (this.anim === 'dust') {
      if (wa) { reach(tr, hr, P.w.set(wa.x, wa.y + 0.13, wa.z)); tr.x += 0.14 * Math.sin(t * 3); tr.z += 0.08 * Math.cos(t * 3); reach(tl, hl, P.w.set(wa.x, wa.y + 0.65, wa.z), 0.75); tl.y += 0.02 * Math.sin(t * 11); }
      else { tr.set(rr[0] + 0.12 * Math.sin(t * 3), rr[1] - 0.1, rr[2] + 0.4 + 0.1 * Math.cos(t * 3)); tl.set(rl[0], rl[1] + 0.15, rl[2] + 0.35); }
    }
    if (this.anim === 'make') { const s = tray.position; tl.set(s.x - 0.12, s.y + 0.32 + 0.05 * Math.sin(t * 6), s.z + 0.02 * Math.cos(t * 6)); }      // over the glass, stirring, pouring
    if (this.anim === 'reach') { if (this.reachTo) reach(tr, hr, P.w.set(this.reachTo.x, this.reachTo.y + 0.14, this.reachTo.z)); else tr.set(rr[0] - 0.1, rr[1] - 0.2, rr[2] + 0.5); }
    if (this.anim === 'adjust') {
      const fx = Math.sin(m.yaw), fz = Math.cos(m.yaw), sx = fz, sz = -fx;
      if (wa) {      // a hand to each side of the frame: whichever side is whose
        const A = reach(tl, hl, P.w.set(wa.x + sx * 0.5 - fx * 0.06, wa.y - 0.05 + 0.03 * Math.sin(t * 5), wa.z + sz * 0.5 - fz * 0.06), 1.5), ax_ = A.x;
        reach(tr, hr, P.w.set(wa.x - sx * 0.5 - fx * 0.06, wa.y - 0.05 + 0.03 * Math.sin(t * 5 + 2), wa.z - sz * 0.5 - fz * 0.06), 1.5);
        if (ax_ > tr.x) { const x = tl.x, y = tl.y, z = tl.z; tl.copy(tr); tr.set(x, y, z); }
      }
      else { const up = Math.min(1.2, Math.max(0, (this.picY ?? 6) - m.y - this.spec.hover)); tl.set(-0.35, up, 0.6); tr.set(0.35, up, 0.6); }
    }
    // never through the body (an ellipse round its middle, with a mitten's width to spare)
    const sc = b.bodyScale ?? [1, 1, 1], ax = b.R * sc[0] + 0.12, az = b.R * sc[2] + 0.12, ay = b.R * sc[1];
    for (const v of [tl, tr]) { const q = (v.x / ax) ** 2 + (v.z / az) ** 2; if (q < 1 && Math.abs(v.y) < ay) { const k = 1 / Math.sqrt(Math.max(q, 1e-4)); v.x *= k; v.z *= k; } }
    hl.position.lerp(tl, ease); hr.position.lerp(tr, ease);
  }
  // ---- manners --------------------------------------------------------------------------------------
  // Is she coming this way? 1: I am in the line she is walking and she is gaining on me; 2: she is
  // walking up to me; 3: she has stopped, too close (and I am not the one looking after her).
  inHerWay() {
    const H = this.H, v = H.visitor;
    if (!v.present || v.outside || v.f !== this.f || v.seated) return 0;
    const rx = this.x - v.x, rz = this.z - v.z, d = Math.hypot(rx, rz);
    if (d > 10) return 0;
    if (v.speed > 1.2) {
      const ahead = rx * v.dx + rz * v.dz, lat = rx * v.dz - rz * v.dx, mine = this.m.v * (Math.sin(this.m.yaw) * v.dx + Math.cos(this.m.yaw) * v.dz);
      if (ahead > -0.3 && ahead < 11 && Math.abs(lat) < 2.6 && v.speed - mine > 0.8) return 1;
      if (d < 3.6 && ahead > 0) return 2;
      return d < 2.4 ? 3 : 0;
    }
    return d < 2.4 || (d < 3.2 && H.host !== this && v.speed < 0.5) ? 3 : 0;      // (pressed up against her, even the host gives way)
  }
  // Somewhere close by, off her line and out of the doorways, reachable in a straight step
  // (from whoever is passing: her, or a colleague in a narrow place; o has x, z and a heading dx, dz)
  asideSpot(kind, o = this.H.visitor, keep = 4.4) {
    const H = this.H, v = o, nav = this.nav, f = this.f, F = nav.floors[f], walking = true;          // (stopped, she still faces the way she was going)
    const lat0 = (this.x - v.x) * v.dz - (this.z - v.z) * v.dx, side0 = Math.sign(lat0) || (this.i % 2 ? 1 : -1);
    nav.flood(f, this.x, this.z, 2, 24, v.x, v.z, Math.min(1.8, Math.hypot(this.x - v.x, this.z - v.z) - 0.3));      // where it can get to without squeezing past
    let best = -1, bs = -1e9;
    for (let j = 0; j < RADII.length; j++) for (let k = 0; k < 16; k++) {
      const r = RADII[j], a = (k / 16) * Math.PI * 2, x = this.x + Math.sin(a) * r, z = this.z + Math.cos(a) * r, c = nav.cellOf(x, z);
      if (c < 0 || !nav.free(f, c, 2, false) || F.door[c] >= 0 || F.lane[c] === 2 || F.lane[c] === 3 || F.clear[c] < 2.4) continue;
      const qx = nav.cx(c) - v.x, qz = nav.cz(c) - v.z, dv = Math.hypot(qx, qz);
      if (dv < keep) continue;                                                                  // not crowding her
      const ah = qx * v.dx + qz * v.dz, lt = qx * v.dz - qz * v.dx;
      if (walking && ah > -1.5 && Math.abs(lt) < 3.1) continue;                                   // still in her way
      const ux = nav.cx(c) - this.x, uz = nav.cz(c) - this.z, ox = this.x - v.x, oz = this.z - v.z;
      if (ux * ox + uz * oz < -0.25 * r * Math.hypot(ox, oz)) continue;                             // a step aside is not a step toward her
      const pd = nav.reachD(c); if (pd > r * 1.6 + 1.5) continue;                                  // (a step, not a trip round the houses or past her)
      if (H.taken(this, f, nav.cx(c), nav.cz(c), 2.4)) continue;
      const s = -pd * (this.engaged ? 1.3 : 0.55)                                                    // (mid-conversation: the smallest shuffle that will do) - Math.max(0, ah) * 0.3 + Math.min(F.clear[c], 6) * 0.25 - (F.lane[c] ? 2.5 : 0) + (walking && Math.sign(lt) === side0 ? 0.9 : 0) + Math.min(dv, 7) * 0.15;
      if (s > bs) { bs = s; best = c; }
    }
    if (best < 0) best = this.farEnd(v, keep, walking);        // nothing a step away (a hall, an aisle): out by the far end
    return best < 0 ? null : { x: nav.cx(best), z: nav.cz(best) };
  }
  // The nearest room floor it can walk to without passing her (call after nav.flood): out of a hall or
  // an aisle by the far end, not back past her. A spot in an aisle off her line will do if nothing else does.
  farEnd(v, keep, walking = true) {
    const H = this.H, nav = this.nav, f = this.f, F = nav.floors[f], R = Math.ceil(22 / nav.CELL), c0 = nav.cellOf(this.x, this.z);
    if (c0 < 0) return -1;
    let best = -1, bd = Infinity, best2 = -1, bd2 = Infinity;
    for (let dz = -R; dz <= R; dz++) for (let dx = -R; dx <= R; dx++) {
      const c = nav.cellOf(this.x + dx * nav.CELL, this.z + dz * nav.CELL); if (c < 0) continue;
      const pd = nav.reachD(c); if (pd === Infinity || F.door[c] >= 0 || F.lane[c] === 2 || F.lane[c] === 3) continue;
      const qx = nav.cx(c) - v.x, qz = nav.cz(c) - v.z, ah = qx * v.dx + qz * v.dz, lt = qx * v.dz - qz * v.dx;
      if (Math.hypot(qx, qz) < keep || (walking && ah > -1.5 && Math.abs(lt) < 3.1) || H.taken(this, f, nav.cx(c), nav.cz(c), 2.4)) continue;
      if (!F.lane[c] && F.clear[c] >= 2.6) { if (pd < bd) { bd = pd; best = c; } }
      else if (F.clear[c] >= 2 && pd + 6 < bd2 && !nav.clearLine(f, v.x, v.z, nav.cx(c), nav.cz(c), 1, false)) { bd2 = pd + 6; best2 = c; }      // (an aisle spot only round a corner from her, the island between: she will turn along an aisle)
    }
    return best >= 0 && bd <= bd2 + 8 ? best : best2 >= 0 ? best2 : best;
  }
  startAside(p, hold, back, kind, who = null) {
    const H = this.H, a = this.aside, m = this.m;
    a.who = who;
    if (!a.phase) {
      a.goal = !!(m.path && m.goal); if (a.goal) { a.gf = m.goal.f; a.gx = m.goal.x; a.gz = m.goal.z; }
      a.back = back && !a.goal && !this.inLane(); a.bx = this.x; a.bz = this.z; a.f = this.f;
    }
    a.x = p.x; a.z = p.z; a.hold = hold; a.kind = kind; a.t0 = H.now;
    const v = H.visitor, o = who ? who : v.present && v.f === this.f && !v.outside ? v : null;      // (the way round whoever it is making room for)
    if (!(o ? this.goAvoiding(this.f, p.x, p.z, o.x, o.z, 1.8) || m.goTo(this.f, p.x, p.z) : m.goTo(this.f, p.x, p.z))) { this.resume(); return false; }
    m.turnRate = 5;                                                                                   // (a brisk sidestep, not a slow about-turn)
    a.phase = GOING; H.events.asides = (H.events.asides ?? 0) + 1;
    return true;
  }
  // Back to what it was doing: the trip it was on, or the place it was standing (if that is still sensible)
  resume() {
    const H = this.H, a = this.aside, m = this.m, v = H.visitor;
    a.phase = 0; this.asideEnd = H.now; m.stop(); m.turnRate = 2.2; m.strafe = false;
    if (a.goal && a.f === this.f) m.goTo(a.gf, a.gx, a.gz);
    else if (a.back && Math.hypot(a.bx - this.x, a.bz - this.z) > 1 && !(v.present && v.f === this.f && Math.hypot(a.bx - v.x, a.bz - v.z) < 5.5) && !H.taken(this, this.f, a.bx, a.bz, 2.4) && m.goTo(this.f, a.bx, a.bz)) { a.phase = BACK; a.t0 = H.now; }
  }
  passed() {
    const H = this.H, a = this.aside, o = a.who;
    if (o) { const m = o.src.m; o.x = m.x; o.z = m.z; const rx = this.x - o.x, rz = this.z - o.z; return m.f !== this.f || !m.path || rx * o.dx + rz * o.dz < -1 || Math.hypot(rx, rz) > 8; }      // a colleague or a friend: by, or stopped
    const v = H.visitor;
    if (!v.present || v.outside || v.f !== this.f) return true;
    const rx = this.x - v.x, rz = this.z - v.z, d = Math.hypot(rx, rz);
    if (v.speed < 0.6) return d > 4.2 && H.now - a.t0 > 1.5;                                        // she has stopped, at a decent distance
    return rx * v.dx + rz * v.dz < -1.5 || d > 11;                                                    // she is past, or gone another way
  }
  stepAside(dt) {
    const H = this.H, a = this.aside, m = this.m, v = H.visitor;
    const talk = this.engaged && v.present && v.f === this.f;
    m.strafe = talk && a.phase !== HOLD;                                                              // speaking to her: a shuffle, still facing her
    if (a.phase === GOING) {
      const st = m.update(dt, talk ? 0.75 : 1.3);
      if (talk) m.faceTo(v.x, v.z, dt * 3);
      if (st === 'arrived' || st === 'idle' || st === 'failed' || H.now - a.t0 > 8) {
        const there = Math.hypot(a.x - this.x, a.z - this.z) < 1.2;
        m.stop(); if (a.hold && there) { a.phase = HOLD; a.t0 = H.now; } else { this.resume(); if (!there) this.asideEnd = H.now - 1; }      // (stopped short: not a place to wait; look again at once)
      }
    } else if (a.phase === HOLD) {
      m.v = Math.max(0, m.v - dt * 4);
      const o = a.who ?? v;
      if (a.who || (v.present && v.f === this.f)) m.faceTo(o.x, o.z, dt * (talk ? 4 : 1.4));        // turned to her (or him) as she goes by (at once, if talking)
      if (this.passed() || H.now - a.t0 > 10) this.resume();
    } else if (a.phase === BACK) {
      const st = m.update(dt, talk ? 0.6 : 0.9);
      if (talk) m.faceTo(v.x, v.z, dt * 3);
      if (st !== 'moving' && st !== 'waiting' || H.now - a.t0 > 10) { m.stop(); a.phase = 0; m.turnRate = 2.2; m.strafe = false; }
    }
  }
  // Plan the trip again with a colleague who is standing in the way marked as furniture (put back at once)
  planAround(o) {
    const m = this.m, g = m.goal; if (!g) return false;
    if (Math.hypot(g.x - o.x, g.z - o.z) < 1.9) return false;                                       // (it is standing on the very spot)
    const ok = this.goAvoiding(g.f, g.x, g.z, o.x, o.z, 1.9);
    if (!ok) m.goTo(g.f, g.x, g.z);
    return ok;
  }
  // Plan a trip with somebody's body (ox, oz, r) marked as furniture, so the way goes round them, not
  // through them (the cells are put back at once). False if there is no way round.
  goAvoiding(f, x, z, ox, oz, r) {
    const m = this.m, nav = this.nav, F = nav.floors[this.f], walk = F.walk, st = nav.stair; let n = 0;
    r = Math.min(r, Math.hypot(this.x - ox, this.z - oz) - 0.3);                                     // (never walled in where it stands)
    if (f !== this.f || r < 0.5) return m.goTo(f, x, z);
    for (let dz = -r; dz <= r; dz += nav.CELL) for (let dx = -r; dx <= r; dx += nav.CELL) {
      if (dx * dx + dz * dz > r * r || n >= DET_C.length) continue;
      const c = nav.cellOf(ox + dx, oz + dz); if (c < 0 || !walk[c] || (st && (c === st.lo || c === st.hi)) || Math.hypot(nav.cx(c) - this.x, nav.cz(c) - this.z) < 0.8) continue;
      DET_C[n] = c; DET_W[n] = walk[c]; walk[c] = 0; n++;
    }
    try { return m.goTo(f, x, z); } finally { for (let i = n - 1; i >= 0; i--) walk[DET_C[i]] = DET_W[i]; }
  }
  // Somewhere to stand aside for someone else on the move (a colleague, a friend): their heading from their path
  passer(src) {
    const m = src.m, p = m.path?.[m.i], L = p ? Math.hypot(p.x - m.x, p.z - m.z) : 0; if (L < 0.05) return null;
    const o = this.who ??= { src: null, x: 0, z: 0, dx: 0, dz: 0 };
    o.src = src; o.x = m.x; o.z = m.z; o.dx = (p.x - m.x) / L; o.dz = (p.z - m.z) / L;
    return this.asideSpot(1, o, 2.6);
  }
  manners() {
    const H = this.H, a = this.aside, m = this.m, v = H.visitor;
    if (this.taskName === 'deliver' || this.taskName === 'demo' || (this.carrying && this.forGuest) || H.talk.robot === this) return;
    const st = this.nav.stair; if (st && Math.abs(this.x - st.x) < 2.4 && this.z > st.zHi - 0.6 && this.z < st.zLo + 0.6 && m.path) return;      // nobody stops or turns back on the stair
    const w = this.inHerWay();
    const stuckGoing = a.phase === GOING && m.blockedFor > 0.4 && H.now - a.t0 > 0.6;
    const badHold = a.phase === HOLD && (this.inLane() || Math.hypot(a.x - this.x, a.z - this.z) > 1.2);      // waiting in a doorway, or not where it meant to wait
    let turned = false;                                                                              // she has turned along an aisle, and the spot it is going to is now on her way
    if (a.phase === GOING && !a.who && v.present && v.f === this.f && v.speed > 0.6 && this.nav.laneAt(this.f, a.x, a.z) === 4) { const qx = a.x - v.x, qz = a.z - v.z, ah = qx * v.dx + qz * v.dz, lt = qx * v.dz - qz * v.dx; turned = ah > -1.5 && ah < 12 && Math.abs(lt) < 3.1; }
    if (w && (a.phase === 0 || a.phase === BACK || stuckGoing || turned || (a.phase === HOLD && (w !== 3 || badHold))) && H.now - this.asideEnd > (a.phase ? 0.6 : 1.2) && (!turned || H.now - a.t0 > 0.8)) {
      const p = this.asideSpot(w);
      if (p && Math.hypot(p.x - this.x, p.z - this.z) > 0.8) { this.startAside(p, true, w !== 3, w); return; }
    }
    // in an aisle (round the kitchen island, a galley) when she comes into the room: leave it to her, by the far end
    if (!a.phase && this.interruptible && !this.engaged && H.host !== this && this.taskName !== 'leave' && this.inNarrow() && v.present && !v.outside && v.f === this.f) {
      const d = this.visitorDist();
      if (d < 5.5 || (d < 12 && this.roomOf(v.x, v.z) === this.roomOf(this.x, this.z))) {
        this.nav.flood(this.f, this.x, this.z, 2, 24, v.x, v.z, Math.min(1.8, d - 0.3));
        const c = this.farEnd(v, 6, v.speed > 0.6), nav = this.nav;
        if (c >= 0 && nav.floors[this.f].lane[c] !== 4) { this.run('leave', this.leave({ x: nav.cx(c), z: nav.cz(c) }), true); H.events.leaves = (H.events.leaves ?? 0) + 1; return; }
      }
    }
    // two meeting in a narrow place: the junior one (or the one standing) makes way; the other goes round a colleague who is standing
    if ((!a.phase || a.phase === GOING) && m.path && m.blockedFor > 0.7) {
      for (const o of H.robots) {
        if (o === this || o.f !== this.f || Math.hypot(o.x - this.x, o.z - this.z) > 3.2) continue;
        if (o.m.path && !o.aside.phase && o.i < this.i) {
          if (a.phase) continue;
          const q = this.passer(o); if (q) { m.blockedFor = 0; this.startAside(q, true, true, 4, this.who); return; }
        } else if (!o.m.path || o.aside.phase === HOLD) { m.blockedFor = 0; if (this.planAround(o)) { H.events.detours = (H.events.detours ?? 0) + 1; return; } }
      }
    }
    // a friend held up by me where I stand (at the coffee bar, at the head of the stair): I make way, as for her
    if (!a.phase && !m.path && !this.engaged) for (const g of H.guests()) {
      if (g.state !== 'here' || g.out || g.m.f !== this.f || !g.m.path || g.m.blockedFor < 0.3 || Math.hypot(g.m.x - this.x, g.m.z - this.z) > 3.8) continue;
      const q = this.passer(g); if (q) { this.startAside(q, true, true, 5, this.who); H.events.forFriends = (H.events.forFriends ?? 0) + 1; return; }
    }
    // nobody stands about in a hall, a doorway or at the stair; nor on top of a colleague or a friend
    const idle = !a.phase && !m.path && m.v < 0.15 && !this.engaged && !(H.host === this && this.visitorDist() < 12);
    let crowd = false;
    if (idle) {
      for (const o of H.robots) if (o !== this && o.i < this.i && o.f === this.f && Math.hypot(o.x - this.x, o.z - this.z) < 2.2) crowd = true;
      for (const g of H.guests()) if (g.state === 'here' && !g.out && g.m.f === this.f && Math.hypot(g.m.x - this.x, g.m.z - this.z) < 2.2) crowd = true;
    }
    const passage = this.inLane() && !this.inNarrow();                                                // (an aisle is left when she comes, above)
    this.laneTime = idle && (crowd || passage) ? this.laneTime + 0.2 : 0;
    if (this.laneTime > (crowd ? 1 : 2)) {
      this.laneTime = 0;
      const p = this.roomSpot(); if (p && this.startAside(p, false, false, 0)) H.events.moveAlong = (H.events.moveAlong ?? 0) + 1;
    }
  }
  *stepBack(x, z) {
    yield* this.go(this.f, x, z, { tries: 1, speed: 0.7 });
    yield* this.linger(3 + this.H.rnd() * 3);
  }
  headPos(out) { return out.set(this.m.x, this.m.y + this.body.top + 0.35 - (this.dropNow ?? 0), this.m.z); }
}
