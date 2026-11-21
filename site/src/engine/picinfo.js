// What a picture is. Look at a hung picture and press E: its title, who made it and when, as a passing note. Shared by
// the house, the town and the lab (engine/: my_house is the source; the copies are kept byte-identical).
//
//   pictureInfo({ extras, interact, say })      extras: the hung pictures ({ file, x, y, z, w, h }: kit/props.js picture)
//                                               interact: the list E works on (life.js)      say: text => a note on the page
//
// The facts come from assets/art/manifest.json ([{ slug, title, short, artist, year }]): a picture with no title there offers
// nothing, and nor does one that already has something of its own to read at the same place (a caption, a case label).
export function pictureInfo({ extras, interact, say, url = 'assets/art/manifest.json' }) {
  fetch(url).then(r => (r.ok ? r.json() : [])).catch(() => []).then(list => {
    const facts = new Map((Array.isArray(list) ? list : []).map(m => [m.slug, m]));
    const mine = new Set();
    let seen = -1;
    const fresh = () => { if (interact.length !== seen) { seen = interact.length; for (const it of mine) it.taken = interact.some(o => !mine.has(o) && !o.seat && Math.hypot(o.x - it.x, o.y - it.y, o.z - it.z) < 0.9); } };
    for (const e of extras) {
      if (!e.file || e.canvas) continue;
      const m = facts.get(e.file) ?? facts.get(String(e.file).split('/').pop());
      if (!m || !m.title) continue;
      const name = m.short ?? m.title, by = [m.artist, m.year].filter(Boolean).join(', '), text = by ? `${name} · ${by}` : name;      // (short: a plain title, where the catalogue's own runs long or repeats the maker)
      const R = Math.max(6, Math.min(11, Math.max(e.w, e.h) * 2.2));
      const it = { x: e.x, y: e.y, z: e.z, size: Math.max(0.5, Math.min(e.w, e.h) * 0.5), taken: false, label: () => 'about this picture', act: () => say(text) };
      Object.defineProperty(it, 'reach', { get() { fresh(); return it.taken ? 0 : R; } });      // (things of the place's own arrive later than this: looked for each time the list grows)
      mine.add(it); interact.push(it);
    }
  });
}
