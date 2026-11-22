// What this visitor has had delivered from the catalogue, kept in their own browser (localStorage,
// key 'catalogue'). Nothing is sent anywhere: another visitor's house has only what they ordered.
// Pure and tiny, so that the jigsaw table, the record player and the pink computer can ask
// "has this come yet?" without loading the catalogue itself.
//
//   owns('jigsaw-night')      has it been delivered and unwrapped
//   grant('jigsaw-night')     it has (catalogue/delivery.js, when the parcel is opened)
//   onGrant(id => ...)        told when something arrives during this visit
//   place(id, {x,y,z,yaw})    where a thing that can be carried was last set down; placeOf(id) reads it
//
// Test hook: ?own=a,b grants those for this page only (nothing is saved); ?own=none starts with nothing.

const KEY = 'catalogue';
const Q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('own') : null;
let state = { owned: [], places: {} };
try { if (Q === null) { const s = JSON.parse(localStorage.getItem(KEY) ?? 'null'); if (s && Array.isArray(s.owned)) state = { owned: s.owned, places: s.places ?? {}, left: s.left ?? {} }; } } catch { /* a private window: this visit only */ }
if (Q && Q !== 'none') state.owned = Q.split(',');
const save = () => { if (Q !== null) return; try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* this visit only */ } };
const heard = [];

export const owns = id => state.owned.includes(id);
export const owned = () => [...state.owned];
export function grant(id) { if (owns(id)) return false; state.owned.push(id); save(); for (const f of heard) { try { f(id); } catch (e) { console.warn('catalogue', e); } } return true; }
export function revoke(id) { const i = state.owned.indexOf(id); if (i < 0) return; state.owned.splice(i, 1); delete state.places[id]; if (state.left) delete state.left[id]; save(); }
export function onGrant(f) { heard.push(f); }
export function place(id, p) { state.places[id] = p; save(); }
export const placeOf = id => state.places[id] ?? null;
// how much is left of a thing that runs out (the tin of koi food, Reginald's treats): left(id) reads, left(id, n) writes
export function left(id, n) { state.left ??= {}; if (n === undefined) return state.left[id] ?? null; state.left[id] = n; save(); return n; }
