// What the catalogue needs to know about the jigsaws and the records it sells, for the pages (a lid
// to draw) and the goods (a sleeve, a box, a line). The audio and its credits are in assets/audio
// (manifest.json, the entries with an "order"); the jigsaws are jigsaw.js's.

const RECORDS = {
  'record-maple-leaf-rag': { title: 'Maple Leaf Rag', by: 'United States Marine Band', label: 'Victor · 1906', colour: '#1c1a18', short: 'the Maple Leaf Rag',
    line: 'A ten-inch record in a paper sleeve: the Maple Leaf Rag, played by the United States Marine Band in 1906. It is as old as the house.' },
  'record-el-choclo': { title: 'El Choclo', by: 'Victor Orchestra · Tango argentino', label: 'Victor · 1912', colour: '#5a1f1c', short: 'El Choclo',
    line: 'A ten-inch record in a paper sleeve: El Choclo, a tango, played by the Victor Orchestra in 1912.' },
};
const JIGSAWS = {
  'jigsaw-moon': { title: 'The Moon', pieces: 'a round jigsaw · 25, 49 or 81 pieces', css: '#101014', colour: 0x101014, short: 'The Moon',
    line: 'A round jigsaw of the full Moon, with no straight edge anywhere.' },
  'jigsaw-night': { title: 'The Island at Night', pieces: 'a luminous jigsaw · 24, 54 or 96 pieces', css: '#1c2740', colour: 0x1c2740, short: 'The Island at Night',
    line: 'A jigsaw of this very house by night. The stars and the windows glow.' },
};

export async function parlour() {
  const J = {};
  // the lids, drawn once by the jigsaw's own module and kept as small pictures to stamp where wanted
  let thumb = null; try { ({ jigsawThumb: thumb } = await import('../jigsaw.js')); } catch { /* plain lids */ }
  for (const [id, j] of Object.entries(JIGSAWS)) {
    J[id] = { ...j };
    if (!thumb) continue;
    const c = document.createElement('canvas'); c.width = 320; c.height = 240;
    try { if (await thumb(id, c.getContext('2d'), 320, 240)) J[id].thumb = (g, w, h) => g.drawImage(c, 0, 0, w, h); } catch { /* a plain lid */ }
  }
  return { of: id => RECORDS[id] ?? J[id] ?? null };
}
