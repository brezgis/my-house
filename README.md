# Anna's House

A house you can walk into, in the browser: a shingled Arts-and-Crafts bungalow on a small
floating island, furnished with books, pictures, a piano, a kitchen that can really cook, and
robot staff who bring you a drink. The door is open and the kettle is on.

The house is imagined, but its bones are real. The plan, the rooms and the timber details
follow Greene & Greene's house for Louise C. Bentz in Pasadena (1906) and the sleeping porch
added in 1910. The real house is a private home; this is a tribute, not a tour of it.

## Visiting

Open `site/index.html` through any static web server, for example:

    python3 -m http.server 8000 --directory site

then go to http://localhost:8000/. There is no build step. Walk with W A S D, look with the
mouse, press E to use things and H for all the keys. Upstairs you can play chess against one
of the butlers, spin the globe and look through the telescope.

## How it is made

- `site/` is the whole website: three.js (vendored in `site/vendor`), plain ES modules.
- `site/src/house.js` builds the house from the 1906 drawings, in feet.
- `site/src/rooms/` furnishes it, one file per room (see the README there).
- `site/src/garden.js`, `site/src/staff.js`, `site/src/sky.js`, `site/src/sound.js` and
  `site/src/toys.js` are the garden, the robots, the sky and weather, the music, and the
  things you can play with.
- `tools/` holds the screenshot and measuring scripts used while building.

## Sources and credits

Press I in the house (or "About this house & sources" on the welcome card) for the full list.

- Greene & Greene. Drawings for the residence of Mrs. Louise Bentz, Pasadena, 1906. Greene &
  Greene Architectural Records and Papers Collection, Avery Architectural & Fine Arts
  Library, Columbia University. The scans in `research/drawings/` are from that collection
  and are reproduced here as the cited source of the plan.
- National Park Service. *Louise C. Bentz House*, National Register of Historic Places
  Inventory–Nomination Form, 1977 (reference no. 77000299).
- Models, textures, pictures, music and typefaces are public-domain or CC0 unless noted;
  each is credited in `site/assets/CREDITS.md`.

Built by Anna with Claude.
