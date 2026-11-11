// Furnishing. The brief: contemporary but not modern; a couch you can sink
// into; books everywhere; warm lamps and candles, nothing overhead; Arts and
// Crafts bones left to show. Each room is its own file in src/rooms/, built
// with the kit (src/kit.js). Collected pieces (models), pictures, rugs and
// screens are listed for life.js to load after the house itself appears.

import { makeKit } from './kit.js';
import living from './rooms/living.js';
import hall from './rooms/hall.js';
import dining from './rooms/dining.js';
import coffee_bar from './rooms/coffee_bar.js';
import kitchen from './rooms/kitchen.js';
import office from './rooms/office.js';
import upstairs_hall from './rooms/upstairs_hall.js';
import our_bedroom from './rooms/our_bedroom.js';
import library from './rooms/library.js';
import guest_room from './rooms/guest_room.js';
import little_bedroom from './rooms/little_bedroom.js';
import dressing_room from './rooms/dressing_room.js';
import bath from './rooms/bath.js';
import sleeping_porch from './rooms/sleeping_porch.js';
import trinkets from './rooms/trinkets.js';
import back_hall from './rooms/back_hall.js';
import back_porch from './rooms/back_porch.js';

export function furnish(B, house = {}) {
  const kit = makeKit(B);
  kit.house = house;
  for (const room of [living, hall, dining, coffee_bar, kitchen, office, upstairs_hall, our_bedroom, library, guest_room, little_bedroom, dressing_room, bath, sleeping_porch, back_porch, back_hall, trinkets]) room(kit);
  // Curtains at every window: full length where the wall runs to the floor, sill length otherwise.
  for (const w of house.windows ?? []) {
    if (w.noDrape) continue;
    const mid = (w.u0 + w.u1) / 2, f = w.isX ? kit.fr(mid, w.c, w.fl, w.sg > 0 ? 0 : 2) : kit.fr(w.c, mid, w.fl, w.sg > 0 ? 3 : 1), half = (w.u1 - w.u0) / 2;
    // Where a window ends near a room corner, stop the rod and panel at the wall.
    const px = w.isX ? mid : w.c + w.sg * 0.6, py = w.isX ? w.c + w.sg * 0.6 : mid, X = px - 21.665, Z = -py;
    const room = (house.rooms ?? []).find(r => X >= r.x0 && X <= r.x1 && Z >= r.z0 && Z <= r.z1 && w.fl + 1 >= r.y0 && w.fl + 1 <= r.y1);
    const o = {};
    if (room) {
      const lo = w.isX ? room.x0 + 21.665 : -room.z1, hi = w.isX ? room.x1 + 21.665 : -room.z0;
      const roomLo = Math.max(0, w.u0 - lo - 0.5), roomHi = Math.max(0, hi - w.u1 - 0.5);          // rooms' boxes reach the wall centres
      const [mx, my] = f.map(-1, 0), leftIsLow = (w.isX ? mx : my) < (w.isX ? mid : mid);
      const left = leftIsLow ? roomLo : roomHi, right = leftIsLow ? roomHi : roomLo;
      if (left < 0.95) o.maxLeft = Math.max(0.05, left - 0.05);
      if (right < 0.95) o.maxRight = Math.max(0.05, right - 0.05);
    }
    kit.drapes(f, -half, half, w.sill > 2.6 ? w.sill - 0.55 : w.sill > 1.2 ? w.sill - 0.6 : 0.12, w.head + 0.52, undefined, o);
  }
  const { lamps, seats, candles, models, extras, books, steam } = kit;
  return { lamps, seats, candles, models, extras, books, steam, hinged: kit.hinged, spots: kit.spots ?? [] };
}
