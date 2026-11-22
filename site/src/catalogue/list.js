// The catalogue: what is in it, and what it says about each thing. Pure words (no three.js), so the
// pages can open without loading anything else. The things themselves are made in goods.js, the
// drawings in engrave.js.
//
// Each entry: id, no (its catalogue number), name, copy (the paragraph), how (small print: what to
// do with it), page, art (which drawing, and its variant), and
//   once: true    it can be had only once (a jigsaw, a record, the game); kept for good
//   keep: true    it is kept between visits, where it was last set down (owned.js)
// Things with neither are used up: another can always be ordered.

export const PAGES = [
  { id: 'coffee', dept: 'Department of Elaborate Coffees', lead: 'Prepared to order by persons of patience, sealed under a domed lid, and delivered cold to your porch with a straw. In the clear plastic cup, naturally.' },
  { id: 'food', dept: 'Provisions of Distinction', lead: 'Supper, sent round. It arrives exactly as it left the kitchen, by means the Editors decline to explain.' },
  { id: 'pets', dept: 'For the Pond, and for the Vacuum', lead: 'Every member of a household deserves a treat, including those who live under water and those who live under the sideboard.' },
  { id: 'parlour', dept: 'Parlour Amusements', lead: 'For wet afternoons, long evenings, and guests who have run out of things to say.' },
  { id: 'novelty', dept: 'Novelties and Illuminations', lead: 'Modern marvels, sent in plain wrapping. The Editors accept no responsibility for excitement.' },
];

export const ITEMS = [
  // ---- coffees -----------------------------------------------------------------------------------
  { id: 'coffee-bsse', page: 'coffee', no: '6C100', name: 'The Brown Sugar Shaken Espresso', art: ['cup', 'bsse'],
    copy: 'Three shots, brown sugar and cinnamon, shaken over ice until it gives in, then topped with oat milk. Miss Geneva takes no other, and says so.' },
  { id: 'coffee-lavender', page: 'coffee', no: '6C104', name: 'Iced Lavender Oat Latte', art: ['cup', 'lavender'],
    copy: 'Tastes the way a linen cupboard smells, and we mean this as the highest praise. Faintly lilac in the cup.' },
  { id: 'coffee-pistachio', page: 'coffee', no: '6C107', name: 'Pistachio Cream Cold Brew', art: ['cup', 'pistachio'],
    copy: 'Cold brew, steeped overnight, under a green cloud of pistachio cream which sinks slowly and looks magnificent doing it.' },
  { id: 'coffee-matcha', page: 'coffee', no: '6C111', name: 'Strawberry Matcha Latte', art: ['cup', 'matcha'],
    copy: 'Pink below, green above. The Editors concede that it is not coffee, and have included it on the grounds that it is pretty.' },
  { id: 'coffee-caramel', page: 'coffee', no: '6C115', name: 'Salted Caramel Cloud Macchiato, Extra Drizzle', art: ['cup', 'caramel'],
    copy: 'The drizzle is applied by eye and with feeling. Customers asking for “light drizzle” will be sent the usual amount.' },
  { id: 'coffee-ube', page: 'coffee', no: '6C119', name: 'Iced Ube Coconut Latte', art: ['cup', 'ube'],
    copy: 'Purple. Entirely purple. Tastes of vanilla, coconut, and getting one’s own way.' },
  // ---- provisions -----------------------------------------------------------------------------------
  { id: 'food-oysters', page: 'food', no: '9P006', name: 'Oysters, the Half-Dozen, on Ice', art: ['oysters'],
    copy: 'Opened within the hour and bedded on crushed ice, with a wedge of lemon. Six is the correct number for one person; the Editors will not be drawn on why.' },
  { id: 'food-macarons', page: 'food', no: '9P014', name: 'Macarons, a Box of Six', art: ['macarons'],
    copy: 'Rose, pistachio, lemon, lavender, salted caramel and one in chocolate, each no bigger than a watch. They do not travel well, and so are not asked to travel far.' },
  { id: 'food-board', page: 'food', no: '9P021', name: 'Charcuterie for One', art: ['board'],
    copy: 'A small oak board: a rose of sliced pepperoni, string cheese peeled into ribbons, and little square cheese crackers of a well-known orange. Plated with tweezers. Eaten with fingers.' },
  { id: 'food-fries', page: 'food', no: '9P030', name: 'Truffle Fries, in a Silver Cup', art: ['fries'],
    copy: 'Cut by hand, fried twice, and snowed under with parmesan and black truffle. Sent in silver, because a paper bag would be an admission.' },
  // ---- the pond and the vacuum -------------------------------------------------------------------
  { id: 'koi-glitter', page: 'pets', no: '12K040', name: '“Stardust” Koi Food, Glittering', art: ['tin'], keep: true,
    copy: 'A tin of our finest pellets, each one rolled in edible glitter. Koi go quite silly for it, and sparkle for some minutes afterwards. Harmless to fish, to ducks, and to reputations. Five generous handfuls to the tin.',
    how: 'Carry the tin to the pond and feed the koi.' },
  { id: 'reginald-treats', page: 'pets', no: '12R007', name: 'Reginald Treats™', art: ['treats'], keep: true,
    copy: 'For the discerning vacuum. Assorted glitter, coarse and fine, in seven colours. It has been observed that a vacuum offered the choice between a crumb and glitter does not hesitate. Five offerings to the box.',
    how: 'Hold the box, and offer some to Sir Reginald.' },
  // ---- parlour amusements (the jigsaws: jigsaw.js; the records: sound.js) ------------------------
  { id: 'jigsaw-moon', page: 'parlour', no: '15J069', name: '“The Moon”, a Round Jigsaw', art: ['jigsaw', 'moon'], once: true, keep: true,
    copy: 'Perfectly round, with not one straight edge to start from: the pieces lie in rings about a middle piece which is itself a circle. The picture is the full Moon as photographed from Apollo 11 on the way home, July 1969.',
    how: 'In 25, 49 or 81 pieces, at the dining table.' },
  { id: 'jigsaw-night', page: 'parlour', no: '15J114', name: '“The Island at Night”, a Luminous Jigsaw', art: ['jigsaw', 'night'], once: true, keep: true,
    copy: 'This very house on its island, every window lit, under the Plough and the Milky Way. The stars and the windows are printed to shine by their own light, so it may be done with the lamps low.',
    how: 'In 24, 54 or 96 pieces, at the dining table.' },
  { id: 'record-maple-leaf-rag', page: 'parlour', no: '18R190', name: '“Maple Leaf Rag”, a Ten-Inch Record', art: ['record'], once: true, keep: true,
    copy: 'Scott Joplin’s rag, played by the United States Marine Band and recorded for Victor in October 1906, the year this house was built. A genuine old record: the crackle is included at no extra charge.',
    how: 'It goes on the gramophone the moment it is unwrapped, and joins the others after.' },
  { id: 'record-el-choclo', page: 'parlour', no: '18R212', name: '“El Choclo”, Tango Argentino, a Ten-Inch Record', art: ['record'], once: true, keep: true,
    copy: 'Ángel Villoldo’s tango, played by the Victor Orchestra and recorded in October 1912. The title means “the corn cob”. Customers are advised to roll back the rug first.' },
  // ---- novelties ---------------------------------------------------------------------------------
  { id: 'game-disc', page: 'novelty', no: '22D233', name: '“Sir Reginald’s Rounds”, a Game on Compact Disc', art: ['disc'], once: true, keep: true,
    copy: 'For the home computer, pink or otherwise. Guide a vacuum of good family round twelve rooms, one straight line at a time. Requires 233 megahertz and a forgiving nature.',
    how: 'Put the disc in the pink computer in the office.' },
  { id: 'fireworks', page: 'novelty', no: '30F006', name: 'Rockets, the Box of Six', art: ['rockets'],
    copy: 'Peonies, willows, rings and crackles, assorted. For use out of doors and after dark; in daylight they are merely loud. Stand on the grass, look up, and mind the pergola.',
    how: 'Out in the garden at night, hold the box and light one.' },
];

export const itemById = id => ITEMS.find(i => i.id === id);
// a number as the old catalogues wrote them
export const priceLine = () => 'No charge. The house keeps an account.';
