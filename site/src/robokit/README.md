# robokit: the robots' shared parts

The robots of Anna's House (`my_house`), Vesper Street (`town_walk`) and Cloud Spring Harbor Laboratory
(`school`) are one family: a floating shell with a glowing face, a ring of light underneath and two mitten
hands. This folder is what they share. It is **the same files in all three repositories**.

**The rule:** `my_house/site/src/robokit/` is the source. Change it there, then copy the folder unchanged
into `town_walk/site/src/robokit/` and `school/site/src/robokit/` (`diff -rq` between the three must be
clean). Nothing in here may import a site's own files; three.js is handed in with `useThree(THREE)`, and
`three/addons/utils/BufferGeometryUtils.js` comes from each site's import map. (`site/src/airship/` is
shared the same way and is kept separate; it does not use robokit.)

## parts.js: making and colouring the pieces

- `useThree(THREE)`: call once before building anything. The other modules read it from here.
- `THREE`: the live binding, for a site module that would rather not keep its own.
- `paint(geo, colour | p => colour)`: vertex colours; returns a non-indexed geometry with position, normal
  and colour only, so that anything painted merges with anything else.
- `xform(geo, { p, r, s })`: moves, turns and scales a geometry in place. `merge(list)`: one geometry.
- `solid()`: the one shared vertex-coloured material. `mesh(geo, mat = solid())`.
- `sph(r, w, h)`, `cyl(r0, r1, h, s)`, and `visor(...)`, the old sphere-patch screen. Prefer `S.screen`.

## shell.js: one smooth body, and what is worn on it

- `makeShell(A, B, C, n = 2)`: a superellipsoid about the origin. At n = 2 it is an egg, a ball or a bean.
  Above 2 it is a cushion: a rounded square with soft corners, never a box.
- `makeLathe(pts, { sx, sz, sides })`: turned from a profile `[[r, y], ...]` (a flowerpot, a bell, a teapot).
  `sides`: 32 is round, 6 or 8 faceted, 4 a rounded square with smooth upright edges.
- `latheGeometry(pts, sides, sx, sz, turn)` and `cornerR(a, b)`: the turned solid alone, as the lab's FORM kit
  (`faculty/body.js`) builds its robots.
- Each shell `S` has:
  - `at`, `normal`, `rho`, `side`, `front`, `polar`, `phiAt` and `inside`;
  - `body(w, h)`, with smooth normals;
  - `band(ya, yb, off)` for a belt, a sash or a hat band;
  - `cap(ys, off)` for a hat's crown;
  - `patch(az0, az1, y0, y1, off)` for an apron or a pouch;
  - `plate(yc, azc, aw, hh, off, { m, seg, rings, inner, grow })` for a badge, a pocket or a bezel;
  - `brim(y, w, {...})`;
  - `overTop(y, off, r)` for a headphone band.
- Fitted helpers:
  - `screen(yc, hh, aw, { seg, rings })` returns `{ face, bezel, aw }`. This is the face screen, a rounded
    square in a soft bezel; the face's UVs span it.
  - `place(geo, y, az, off, spin)` stands a thing built along +y on the surface along its normal (an ear, an
    earcup, a buckle, a knob).
  - `seat(r, { phi, az, sink })` returns a Matrix4 that sits a hat on the head: the hat's opening, r across,
    goes down onto the head, cocked phi towards az, and sinks in a little.
  - `scarf(y, {...})` gives the roll, the tail and the knot.
  - `badge(y, az, w, h)` gives the plate and the card.
  - `apron(yTop)` gives `{ cloth, pocket }`.
- `roll(v)`: a rounded profile, 0 at a strip's edges and 1 in the middle.

## face.js: the face, and the life in it

- `makeFace(spec)` returns `{ draw, mat, canvas }`. It uses one small canvas, redrawn only when something
  visible changes.
- `spec` takes:
  - `eye`, `gap`, `eyeW`, `eyeH`, `eyeR` and `bg`;
  - optionally `lashes`, `brows`, `moustache`, `freckles`, `specs`, `monocle` and `blush`;
  - `round`, an opt-in that cuts the screen's corners away; the material then alpha-tests;
  - `mouth: 'slot'`, an opt-in for the lab's speaking mouth (a rounded slot) instead of the town's oval;
  - `overlay(g, expr, lx, rx, y, blink, look)`, which draws a robot's own extras over the eyes.
- `draw(expr, look, blink, { ly, mouth })`:
  - `blink` is true or false, or 0..1 for lids part way down;
  - `ly` is -1..1, with + looking down at the work;
  - `mouth` is 0..1 and moves while speaking.
  - The older order `draw(expr, look, blink, mouth, lookY)`, with lookY + up, is understood too.
- `makeFaceLife(id, now)`: each robot's own rhythm, in its own blink tempo, sometimes blinking twice. It
  glances about, looks down at the work and leads a turn with its eyes.
  `life.step(now, dt, { w, eye, work, moveLook })` returns `{ shut, lx, ly }`. `life.glancing` says whether
  it is looking off somewhere.
- `talkMouth(t)`: a mouth moving with speech.

## Who uses what

- **Anna's House:** `staff/models.js` and `friends/bodies.js` (shells, screens, fitted hats and headphones),
  `staff/robots.js`, `staff/gardeners.js` and `friends/party.js` (attend, face life). `staff/models.js`
  re-exports `useThree`, `paint`, `solid` and `makeFace` for the rest of the house.
- **Vesper Street:** `clerks.js` (shells, screens, scarf, badge, apron, attend, face life); `clerks/models.js`
  re-exports the parts.
- **The lab:** `faculty/models.js` re-exports the parts, and its `makeFace` defaults to `round: 26, mouth: 'slot'`.
  `faculty/manners.js` re-exports `attendVisitor`. `faculty/body.js` turns its robots with `latheGeometry` and
  times its faces with `makeFaceLife` and `talkMouth`.

## attend.js: turning to the visitor

- `attendVisitor(st, me, v, dt, o)`: the lab's manners. As she comes up the eyes turn first, then the head
  (`st.head`; a robot without a neck turns its upper body), then the body (`st.yaw`). When she leaves, it
  goes back to its work. The full signature is documented at the top of the file.
- Give it `present: false` when she cannot be seen (another floor, through a wall).
- `hold: true` gives her its full attention at any distance and never lets go while it is set (no timeout).
- `engageVisitor(st, me, v, dt, o)`: the one "engaged with the visitor" state that every behaviour asks before
  it moves. On while a conversation is open (`o.talking`: the card, its answer, the order being taken); on when
  she comes up to it (inside 6 ft, walking towards it or stopped and looking at it); off only once the
  conversation is over and she is beyond 8 ft for 1.5 s (or has stood near with her back to it for 8 s). Pass
  `st.on` to `attendVisitor` as `hold`, and while it is on start no errand, no trip home, no next job. Sat down,
  a robot stays sat and turns its head. Used by the town's clerks, the lab's faculty, researchers and grounds
  staff, and the house's staff (its `engaged`).
