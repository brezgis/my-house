# Furnishing a room

Each room is one file here, a function `(kit) => { ... }` called once at start-up. It adds
geometry through the kit; nothing in a room file runs per frame. `furnish.js` lists the rooms.

## Coordinates

Plan feet, as on the 1906 drawings: **X** runs south (0) to north (43.33) along the street
front, **Y** runs from the street wall (0) back to the west, heights are feet above grade.
First floor is `F1` (1.6), second floor `F2` (10.8); ceilings are 8.2 and 8.0 above those.
World space (only needed for raw three.js): x = X - 21.665, y = up, z = -Y.

A **frame** `fr(X, Y, h, q)` places a piece at a point, turned in quarter turns:
q = 0 faces west (+Y), 1 south (-X), 2 east/street (-Y), 3 north (+X). Inside a frame,
x runs along the piece, y is depth with the front toward +y, z is height above the frame.
To put something against a wall, put the frame ON the wall's room-side face with q facing
into the room; then y = 0 is the wall and +y comes out into the room.

Frame methods: `box(mat, x0,x1, y0,y1, z0,z1, opts)`, `soft(mat, x0,x1, y0,y1, z0,z1, radius)`
(rounded), `cyl(mat, x, y, z0, z1, rBottom, rTop, segments)` (upright only),
`block(x0,x1,y0,y1,z0,z1)` (invisible obstacle), `sub(x, y, z, dq)` (a child frame).
`opts`: `{ grain: 'long' }` for boards (grain follows the long side), `{ rot: [rx,ry,rz] }`.

## Materials

Named textured materials (see materials.js): `fir` (interior trim wood), `timber` (dark
exterior wood), `floor`, `plaster`, `brick`, `clinker`, `tile`, `pavers`, `shade` (glowing
lampshade), `glass`, `drape`, `soot`, and any texture set the materials agent adds.
Plain colours are made from a name: `'c#rrggbb'`, optionally `'/roughness/metalness'`
(`'c#b08d4a/0.35/1'` is brass). `'e#rrggbb/2'` glows. Colour constants (LINEN, OAT, SAGE,
RUST, NAVY, MUSTARD, CREAM, ROSE, ENAMEL, BRASS, STEEL, BLACK, GREEN, MARBLE, DARK, WHITE)
are exported from kit.js. Plain colours render about 20% darker than typed; rooms are
exposed bright, so keep fabrics and paints mid-toned.

## Kit builders

- `model(id, frame, x, y, z, dq, opts)` places a collected model (see
  assets/models/CATALOG.md) with its lowest point at height z. opts: `scale`, `turn`
  (extra yaw, radians), `seat` (seat height: makes it sittable), `collide`, `hang`
  (use z as the model's own origin height, for wall pieces), `outdoor`.
- `tableLamp(f, x, y, z, baseColour)`, `floorLamp(f, x, y)`: real, lit lamps.
- `candle(f, x, y, z, tall)` taper; `jarCandle(f, x, y, z, { label, wax, r, tall })`: lightable.
- `bookcase(f, w, tall, { d, pitch, fill })`, `bookRow`, `bookStack(f, x, y, z, n)`: every
  book gets a real printed spine automatically.
- `sofa(f, w, fabric, pillows)`, `armchair(f, fabric, pillow)`, `bed(f, w, quilt, opts)`,
  `table(f, w, d, tall, mat)`, `cabinets(f, w, opts)`, `mug`, `cup`, `posy` (flowers in a jar).
- `picture(f, file, x, z, w, tall, { frame, border, mat })`: `file` is a slug from
  assets/art/manifest.json; keep w:tall equal to the image's proportions.
- `rug(X0, X1, Y0, Y1, h, style)`: styles garden, tabriz, kilim, runner, mat.
- `drapes(...)`: added automatically at every window; `throwBlanket(f, x0,x1, y0,y1, z, mat)`.
- `sign(f, x, y, z, w, tall, draw, { cw, ch, flat, glow })`: anything drawn: a label, a
  package front, a magazine cover, a screen. `draw(g, w, h)` paints a canvas.
  `pack(f, x, y, z, w, d, tall, colour, draw)` is a box with a drawn front.
- `hingedDoor(f, x0, x1, y, z0, z1, { hinge, mat, label, swing })`: a cupboard, fridge or
  wardrobe door that visitors open with E.
- `seat(f, x, y, z, label)` makes a spot sittable; `lampAt(f, x, y, z, power)` adds light.
- Lists you may push to directly: `kit.lamps`, `kit.seats`, `kit.models`, `kit.extras`.

## Rules of the house

- Keep clear paths: 3 ft through doorways and between rooms; nothing within 3 ft in front
  of a door on either side. Doors, windows and wall positions are in house.js.
- Nothing may share a plane with a wall, floor or another piece (it flickers). Leave 0.02 ft.
- Budget: the whole furnished house should stay under about 1.2 million triangles; prefer
  light models, and build small clutter from a few boxes or cylinders rather than new models.
- Test with `tools/shot.sh` (see its header) and look at the picture before trusting it.

## The furniture kit in detail (src/kit/)

The builders above are now modelled pieces, not boxes: chamfered boards with the grain
running the long way, turned legs and lamp bases, cushions that crown, bulge and sag with a
welt at the seam, stuffed pillows, cloth that drapes with folds and fringe. Fabrics are
textured: the colour constants (LINEN, OAT, SAGE, RUST, NAVY, MUSTARD, CREAM, ROSE) are now
`linen#rrggbb` names, and any plain `c#` colour passed as a fabric is woven into linen
(as a wood, into oak). Every builder returns nothing unless noted; all are on the kit
object. More wood and metal names: `FIR, OAK, HONEY, WALNUT, EBONY, PAINT, PAINT_SAGE,
PAINT_GREEN, PAINT_BLUE, OLD_BRASS, BRONZE, NICKEL, IRON, CHROME, PORCELAIN, CLAY, COTTON,
TICKING, TERRY, GLASS, MIRROR, PAPER` (exported from kit.js). `MARBLE` is now the textured
`marble`.

Look at everything with `?showroom=soft|wood|kitchen|bath|light|props` (pieces laid out on
the front lawn against a plaster wall, each with a card giving its triangle count; stand at
`view=<x>,0,40,0,-0.1`). The page logs the counts to the console.

Frames, as before: (x along, y depth with the front at +y, z up). "on the wall" means the
frame sits on the wall face with q facing into the room.

**Upholstery and beds** (soft.js)
- `sofa(f, w, fabric, pillows, { throw, legs })` English rolled-arm sofa, 3.3 deep, seat 1.55.
  About 5k triangles. `throw: false` leaves the arm bare.
- `armchair(f, fabric, pillow)` 3 x 3, to match. ~3k.
- `ottoman(f, x, y, { w, d, h, fabric, tray })`, `pouf(f, x, y, { r, h, style: 'knit'|'leather' })`.
- `bed(f, w, quilt, { sham, accent, headboard: 'upholstered', fabric, wood, foot: false, duvet })`
  Posts and slats (or an upholstered channelled headboard), mattress, duvet turned down,
  Euro shams, sleeping pillows, a quilt across the foot. ~6-7k.
- `cushion(f, x, y, z, w, h, colour, { tilt, thick, turn, base })` a stuffed pillow
  standing on a seat at (x, y, z), leaning back by tilt.
- `throwBlanket(f, x0, x1, y0, y1, z, mat, { over: 'arm'|'foot'|'front', drop: {l,r,f,b}, fringe })`
  over a sofa arm (`over: 'arm'`, rect = the arm top; arm tops are 2.13 on the armchair and 2.16 on
  the sofa, and when the throw is given the same frame as the sofa or armchair it is raised onto the arm
  automatically, since that frame carries `f.armTop`), across the foot of a bed (`'foot'`,
  rect = a band across the bed), or off a front edge.
- `cloth(f, mat, { cx, cy, z, a, b, l, r, fr, bk, folds, fringe })` any cloth over a box top
  (half sizes a, b) hanging l/r/fr/bk feet over the edges. `tablecloth(f, x, y, z, a, b, mat, drop)`.
- `drapes(f, x0, x1, z0, z1, mat, { maxLeft, maxRight, gather })` pinch-pleated panels on rings, iron
  rod with finials, turned-up hem (placed automatically by furnish.js). Panels reach 0.55 and the rod
  0.78 (finials 0.9) past the opening; `maxLeft`/`maxRight` cap that on a side where a wall is near
  (a window at a room corner: `maxLeft: 0.1`); the finial is dropped when there is no room.
- `hangingTowel(f, x, y, z, w, drop, colour)` over a rail along x at (y, z);
  `foldedStack(f, x, y, z, n, colours, { w, d, t })`; `bathMat(f, x, y, w, d, colour)`.
- Clothes: `clothes(f, x0, x1, y, z, { kinds, colours })` hangers along a rail at (y, z);
  `garment(kind)`; `coatOnPeg(f, x, y, z, colour, kind)`; `scarf(f, x, y, z, colour)`;
  `hat(f, x, y, z, 'fedora'|'cloche'|'beanie', colour)`; `shoes(f, x, y, z, kind, colour)`
  (pair, toes toward +y; kinds loafer, boot, sneaker, flat, slipper); `slippers(...)`;
  `toteBag(f, x, y, z, colour, { draw })`.

**Wood** (wood.js) Arts-and-Crafts oak unless `wood:` says otherwise (plain colours become oak).
- `table(f, w, d, tall, mat, leg, { shelf, overhang })` as before, now with apron rails and tapered legs.
- `diningTable(f, w, d, { style: 'trestle'|'legs', wood })` top 2.5, centred on the frame.
- `diningChair(f, x, y, { dq, back: 'ladder'|'spindle', seat, arms, wood, sit })` faces its frame's
  front (dq more quarter turns). Seat 1.55, sittable. Use the same `wood` as the table for a set.
- `desk(f, w, d, { gallery })` top 2.5, three drawers; `dresser(f, w, tall, { d, pull: 'bail'|'knob'|'cup'|'wood' })`;
  `nightstand(f, { w, d, h })` (top 2.15, returns it); `console(f, w, { d, h })`;
  `sideboard(f, w, { d, h, open })`; `sideTable(f, x, y, { kind: 'square'|'round'|'drum', h })`
  (returns top height); `plantStand(f, x, y, { plant })`.
- `wardrobe(f, w, tall, { d, wood, clothes })` doors open with E, clothes and jumpers inside.
- `closetRail(f, w, { z, shoes, boxes })` on the wall; `hallTree(f, w)` bench, mirror, hooks,
  coats, hat, scarf, shoes, sittable; `coatRack(f, x, y)`; `shoeRack(f, w)`; `bootTray(f, x, y, w)`;
  `shoeRow(f, x0, x1, y, z, n)`. The shoe rack never takes boots (too tall for its tiers): use `bootTray`.
- `bookcase(f, w, tall, { d, pitch, fill, wood })` as before, with plinth, cornice and face frame.
  The cornice tops out at tall + 0.12 (overhang 0.07): under the picture rail (6.95) keep tall <= 6.8.
- Kitchen: `cabinets(f, w, { d, top, paint, open, sink: { x, w, d, depth, apron, tap, basin } })`
  (counter 3.02; `sink: true` gives a fireclay apron sink with a brass bridge tap; `apron: false`
  an undermount basin), `upperCabinets(f, w, { z, tall, d, glass: true|'prairie' })`,
  `openShelves(f, w, zs, { d, fill })`, `plateRack(f, w, { z })`, `potRail(f, w, z, { items })`,
  `rangeHood(f, w, { kind: 'plaster'|'copper', z, top })`, `basin(...)`, `tap(f, x, y, z, { reach, height, mat })`.
- Parts: `drawer`, `shakerDoor`, `leg`, `knob`, `cupPull`, `bailPull`, `bracket` (a corbel), `carcass`.

**Bathroom** (bath.js)
- `clawTub(f, { len, w, y, rim, outside, feet, water, ends: 'double'|'slipper'|'flat', taps })`
  slipper bath on ball-and-claw feet, long side along x, back 0.25 off the wall; floor-standing
  brass taps and hand shower at the +x end. Hollow, 1.5 deep inside, water optional.
- `pedestalSink(f, x, { h })`, `vanity(f, w, { wood, top, basin })` (returns the counter height),
  `toilet(f, x, { seat })`, `towelRail(f, x, z, w, { towels })`,
  `mirror(f, x, z, w, h, { kind: 'rect'|'arch'|'round', frame, border })` (on the wall).

**Light** (light.js) The house has ceiling fittings and sconces but they are not lit unless `lit: true`.
- `tableLamp(f, x, y, z, glaze, { base: 'jar'|'gourd'|'column', shade: 'pleat'|'drum'|'empire' })`,
  `floorLamp(f, x, y, { shade })`, `candle`, `jarCandle`, `pillarCandle(f, x, y, z, tall, r)`.
- `sconce(f, x, z, { kind: 'tulip'|'shade'|'lantern', lit })` on the wall;
  `ceilingLight(f, x, y, zc, { kind: 'lantern'|'schoolhouse'|'bowl', drop, lit })` hangs from a
  ceiling zc above the frame.

**Small things** (props.js)
- `mug(f, x, y, z, colour, hot)`, `cup`, `plate(f, x, y, z, r)`, `vase(f, x, y, z, h, r, mat, 'jar'|'bud'|'bottle')`,
  `posy(f, x, y, z, colours)` (ranunculus, daisies, tulips, sprigs in a glass jar).
- `pottedPlant(f, x, y, z, 'leafy'|'snake'|'fern'|'trailing', { size, pot })`.
- `picture(...)` as before: profiled moulding, bevelled mat, glass over anything with a mat (or `glass: true`).
- `magazines(f, x, y, z, n)`, `openBook(f, x, y, z, { cover })`, `laptop(f, x, y, z, { open, draw })`,
  `phone`, `remote`, `tissueBox`, `lotionTube`, `pumpBottle`, `perfume`, `cosmetics`, `soapDish`,
  `toothbrushCup`, `umbrellaStand(f, x, y)`, `laundry(f, x, y, z, n)` (all `(f, x, y, z, o)`; `o.turn` turns most).

**Collisions**: every solid piece from the kit carries an invisible block at least 1.5 tall (the
walker steps over anything lower than 1.4), including floor lamps, potted plants (`block: false` to
skip, e.g. on a shelf), ottomans, poufs, low tables, the shoe rack and the boot tray.

**Raw geometry**: `kit.put(f, material, geometry, { at, rx, ry, rz, s })` places any geometry
built in a frame's local feet; `kit.geom` has `bev, softBox, pillow, lathe, loft, sweep, sheet,
drapeMap, moulding, extrude`. Frames also have `f.bev(...)`, `f.cushion(...)` and `f.lathe(...)`.
