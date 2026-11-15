// Turning to the visitor as she comes up: the eyes first, then the head, then the body, and back to what it was
// doing when she has gone. One small function with nothing in it that knows a house, a shop or a school. It is
// the lab's attendVisitor (school faculty/manners.js), unchanged, so that every robot in the three places has the
// same manners.
//
//   attendVisitor(st, me, v, dt, o)  ->  st
//     st   its own state: pass {} the first time and the same object every frame after (it is filled in and returned)
//     me   { x, z, yaw }: where the robot stands and the way its body faces now (radians, 0 = +z)
//     v    the visitor: { present, x, z, speed } and, optionally, fx, fz (the way she is looking) or dx, dz (walking)
//     dt   seconds since the last call
//     o    { reach: 10 (feet), keepWorking: false (eyes and head only), talking: false (full attention, up to
//          reach * 1.5), hold: false (full attention at any distance, and it never lets go while this is set: pass
//          engageVisitor's st.on), busy: false (hands full: slower to come), level: true (false: she is on another floor) }
//   It reads:  st.looking (attending), st.w (0..1, eased), st.eye (-1..1 across the face, for the eyes),
//              st.eyeBody (the same, measured from the body: use it if nothing turns the head),
//              st.head (radians, within +-0.6, for whatever turns the head; a robot with no neck turns its upper body),
//              st.yaw (the body's yaw it wants, or null: leave the body to its task), st.rate (how fast to turn the
//              body), st.rel (her bearing from the way the body faces).
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
export function attendVisitor(st, me, v, dt, o = {}) {
  st ??= {};
  if (o.hold) o = { ...o, talking: true };                                                 // (held: everything below is as for talking)
  if (st.w === undefined) Object.assign(st, { looking: false, w: 0, eye: 0, eyeBody: 0, head: 0, yaw: null, rel: 0, since: 0, away: 0, rate: 2 });
  const reach = o.reach ?? 10, k = x => Math.min(1, dt * x);
  let want = false, dist = Infinity;
  if (v?.present && o.level !== false) {
    const dx = me.x - v.x, dz = me.z - v.z; dist = Math.hypot(dx, dz);
    st.rel = wrap(Math.atan2(-dx, -dz) - me.yaw);
    if (o.hold) want = true;
    else if (o.talking) want = dist < reach * 1.5;
    else if (dist < reach) {
      // is she looking this way (within about 25 degrees; 40 once it has noticed), standing near, or walking right up?
      const fx = v.fx ?? v.dx ?? 0, fz = v.fz ?? v.dz ?? 0, fl = Math.hypot(fx, fz);
      const off = fl > 1e-3 && dist > 1e-3 ? Math.acos(Math.max(-1, Math.min(1, (fx * dx + fz * dz) / (fl * dist)))) : Math.PI;
      const facing = off < (st.looking ? 0.7 : 0.44) + Math.min(0.3, 1.2 / Math.max(dist, 1));
      want = facing || (dist < reach * 0.6 && (v.speed ?? 0) < 0.6) || dist < 4.5;
    }
  }
  // a little hysteresis: it notices after a breath, and lets go a moment after she has turned away
  if (want) { st.away = 0; st.since += dt; if (!st.looking && st.since > (o.busy ? 0.6 : 0.15)) { st.looking = true; st.held = 0; } }
  else { st.since = 0; st.away += dt; if (st.looking && st.away > (o.talking ? 0 : 1.2)) st.looking = false; }
  st.held = st.looking ? (st.held ?? 0) + dt : 0;                                          // (the stages are timed from when it noticed her, not from her last glance)
  st.w += ((st.looking ? 1 : 0) - st.w) * k(st.looking ? 3 : 1.5);
  const behind = Math.abs(st.rel) > 2.4 && !o.talking;                                // straight behind it: the eyes cannot, the head will not
  const headT = st.looking && !behind && st.held > 0.25 ? Math.max(-0.6, Math.min(0.6, st.rel * (o.busy ? 0.5 : 0.8))) : 0;
  st.head += (headT - st.head) * k(st.looking ? 3.2 : 2);                                  // the head after a moment
  const eyeT = st.looking && !behind ? Math.max(-1, Math.min(1, st.rel * 1.2)) : 0;
  st.eyeBody += (eyeT - st.eyeBody) * k(9);                                                // the eyes first
  st.eye = Math.max(-1, Math.min(1, st.eyeBody - st.head * 1.2));                          // (as seen from the head, once it has turned)
  st.yaw = st.looking && !o.keepWorking && (o.talking || st.held > (o.busy ? 2 : 0.9)) && (o.hold || dist < reach * 1.5) ? me.yaw + st.rel : null;      // then the body
  st.rate = o.talking ? 2.2 : 1.4;
  return st;
}

// Engaged with the visitor: the one question every behaviour asks before it moves. While she is talking to it,
// and when she comes up to it (near, and walking towards it or stopped and looking at it), a robot stops what it
// is doing, turns to her and waits; it lets go only once the conversation is over and she has stepped away (or
// has long since turned to something else). The caller passes st.on to attendVisitor as `hold`, and while it is
// set starts no errand, no trip home, no next job.
//
//   engageVisitor(st, me, v, dt, o)  ->  st
//     st   its own state ({} the first time, the same object after); me { x, z }; v the visitor { present, x, z, fx, fz }
//     o    { talking: false (a conversation is open: its card, its words, the order it is taking), near: 6, far: 8
//          (feet: it engages inside near, lets go beyond far), grace: 1.5 (seconds beyond far before it lets go),
//          after: 4 (seconds it stays with her after the conversation closes, though she has not moved),
//          ignored: 8 (seconds she may stand near with her back to it, not talking, before it goes back to work),
//          walkUp: 2.2 (ft/s: walking towards it faster than this she is passing, not coming up to it),
//          level: true }
//   It reads:  st.on (engaged), st.why ('talk' | 'after' | 'near' | null), st.toward (her speed towards it, ft/s),
//              st.give (she is coming straight at it at a stride: whatever is held, it gives way to her now, by its
//              own manners; a caller holds only while st.on && !st.give, unless a conversation is open)
export function engageVisitor(st, me, v, dt, o = {}) {
  st ??= {};
  if (st.on === undefined) Object.assign(st, { on: false, why: null, near: false, gone: 0, after: 0, away: 0, vx: 0, vz: 0, px: null, pz: null, toward: 0, talk: false });
  const near = o.near ?? 6, far = o.far ?? 8, here = !!v?.present && o.level !== false;
  let dist = Infinity, facing = false;
  if (here) {
    // how she is moving, from where she was (a jump, as when she is set down somewhere, is not walking)
    if (st.px !== null && dt > 1e-4) { let rx = (v.x - st.px) / dt, rz = (v.z - st.pz) / dt; if (Math.hypot(rx, rz) > 25) rx = rz = 0; const k = Math.min(1, dt * 6); st.vx += (rx - st.vx) * k; st.vz += (rz - st.vz) * k; }
    st.px = v.x; st.pz = v.z;
    const dx = me.x - v.x, dz = me.z - v.z; dist = Math.hypot(dx, dz);
    st.toward = dist > 1e-3 ? (dx * st.vx + dz * st.vz) / dist : 0;
    const fx = v.fx ?? 0, fz = v.fz ?? 0, fl = Math.hypot(fx, fz);
    facing = fl > 1e-3 && dist > 1e-3 && (fx * dx + fz * dz) / (fl * dist) > 0.8;           // (within about 35 degrees)
  } else { st.px = null; st.vx = st.vz = 0; st.toward = 0; }
  const speed = Math.hypot(st.vx, st.vz);
  st.give = here && dist < far && st.toward > (o.walkUp ?? 2.2);
  if (o.talking) { st.talk = true; st.on = true; st.why = 'talk'; st.near = here && dist < far; st.gone = 0; st.away = 0; return st; }
  if (st.talk) { st.talk = false; st.after = o.after ?? 4; st.near = here && dist < far; st.gone = 0; st.away = 0; }      // the conversation has just closed
  st.after = Math.max(0, st.after - dt);
  // she comes up to it: near, and walking up to it (slowing, as one does to speak to someone: at full stride she is
  // only passing, and that is the manners' business, stepping aside) or stopped and looking at it
  if (here && dist < near && ((st.toward > 0.7 && speed < (o.walkUp ?? 2.2)) || (speed < 0.6 && facing))) { st.near = true; st.away = 0; }
  if (st.near) {
    st.gone = here && dist < far ? 0 : st.gone + dt;
    st.away = facing || st.toward > 0.3 ? 0 : st.away + dt;                                // standing about near it, busy with something else
    if (st.gone > (o.grace ?? 1.5) || (st.after <= 0 && st.away > (o.ignored ?? 8))) st.near = false;
  }
  st.on = st.near; st.why = !st.on ? null : st.after > 0 ? 'after' : 'near';
  return st;
}
