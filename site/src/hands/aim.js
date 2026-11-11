// Which book is under the centre of view. Pure (no three.js), so node can test it.
// The books (about two thousand boxes) are sorted once into 6 ft squares of floor; a look tests
// only the books in the nine squares round the eye, so it costs next to nothing where there are
// no shelves, and a few dozen box tests where there are.

const CELL = 6;
const key = (ix, iz) => (ix + 2048) * 4096 + (iz + 2048);

export function makeBookIndex(books) {
  const cells = new Map();
  for (let i = 0; i < books.length; i++) {
    const b = books[i], k = key(Math.floor(b.x / CELL), Math.floor(b.z / CELL));
    let list = cells.get(k); if (!list) cells.set(k, list = []);
    list.push(i);
  }
  const index = {
    t: 0,                                   // how far along the look the last pick was
    // The nearest book whose box the ray (unit direction) passes through within reach: its index, or -1.
    pick(ex, ey, ez, dx, dy, dz, reach = 5.5) {
      const cx = Math.floor(ex / CELL), cz = Math.floor(ez / CELL);
      let best = reach, at = -1;
      for (let ix = cx - 1; ix <= cx + 1; ix++) for (let iz = cz - 1; iz <= cz + 1; iz++) {
        const list = cells.get(key(ix, iz)); if (!list) continue;
        for (let n = 0; n < list.length; n++) {
          const b = books[list[n]];
          const hx = b.sx / 2, hy = b.sy / 2, hz = b.sz / 2;
          if (Math.abs(b.y - ey) > best + hy) continue;
          let t0 = 0, t1 = best;
          if (Math.abs(dx) < 1e-9) { if (ex < b.x - hx || ex > b.x + hx) continue; }
          else { let a = (b.x - hx - ex) / dx, c = (b.x + hx - ex) / dx; if (a > c) { const s = a; a = c; c = s; } if (a > t0) t0 = a; if (c < t1) t1 = c; if (t0 > t1) continue; }
          if (Math.abs(dy) < 1e-9) { if (ey < b.y - hy || ey > b.y + hy) continue; }
          else { let a = (b.y - hy - ey) / dy, c = (b.y + hy - ey) / dy; if (a > c) { const s = a; a = c; c = s; } if (a > t0) t0 = a; if (c < t1) t1 = c; if (t0 > t1) continue; }
          if (Math.abs(dz) < 1e-9) { if (ez < b.z - hz || ez > b.z + hz) continue; }
          else { let a = (b.z - hz - ez) / dz, c = (b.z + hz - ez) / dz; if (a > c) { const s = a; a = c; c = s; } if (a > t0) t0 = a; if (c < t1) t1 = c; if (t0 > t1) continue; }
          best = t0; at = list[n];
        }
      }
      index.t = best;
      return at;
    },
    cells: cells.size,
  };
  return index;
}
