// Material names shared by the kit's builders. Textured materials come from
// materials.js; 'name#rrggbb' is that texture tinted (see materials.js make()).

// Woods
export const FIR = 'fir';                          // the house's own dark red-brown trim wood
export const OAK = 'oak_light#7a6450';             // fumed quarter-sawn oak, Stickley brown
export const HONEY = 'oak_light#c4a477';           // lighter oak, kitchen and bath
export const WALNUT = 'fir#7d5b45';                // legs, frames, small turned pieces
export const EBONY = 'fir#3a2c24';                 // near-black stained wood
// Paints
export const PAINT = 'painted_wood#d8d0bd';        // warm cream
export const PAINT_SAGE = 'painted_wood#87937a';   // kitchen sage
export const PAINT_GREEN = 'painted_wood#56664f';  // deep green (bath, dresser)
export const PAINT_BLUE = 'painted_wood#5d6f7c';   // grey-blue
// Metals and ceramics (plain colours: 'c#rrggbb/roughness/metalness')
export const BRASS = 'c#b08d4a/0.35/1', OLD_BRASS = 'c#9a7a45/0.45/1', BRONZE = 'c#5a4632/0.45/1';
export const NICKEL = 'c#c6c2ba/0.22/1', IRON = 'c#2b2724/0.55/0.7', CHROME = 'c#d4d6d8/0.12/1';
export const PORCELAIN = 'c#ebe6dc/0.18', ENAMEL = 'c#cfcbc2/0.35', CLAY = 'c#b8755a/0.8';
// Cloth
export const COTTON = 'curtain#ece7dc';            // sheets, pillowcases, shirts
export const TICKING = 'curtain#e3ddd0';
export const TERRY = 'wool#e6e0d4';                // towels, bath mats
// Glass, paper, misc
export const GLASS = 'glass', MIRROR = 'c#c3ced0/0.03/1', PAPER = 'c#efe9da/0.9', INK = 'c#1d1a17/0.5';

// Turn a plain colour into the same colour on a texture: fabrics on linen, woods on oak.
export const fab = (c, base = 'linen') => (/^c#[0-9a-f]{6}/i.test(c) ? `${base}#${c.slice(2, 8)}` : c);
export const woodOf = (c) => (/^c#[0-9a-f]{6}/i.test(c) ? `oak_light#${c.slice(2, 8)}` : c);
// A shade of a tinted or plain colour: k < 1 darker, > 1 lighter.
export function shade(name, k) {
  const m = /^(.*#)([0-9a-f]{6})(.*)$/i.exec(name); if (!m) return name;
  const v = parseInt(m[2], 16), ch = s => Math.max(0, Math.min(255, Math.round(((v >> s) & 255) * k)));
  return m[1] + ((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0') + m[3];
}
