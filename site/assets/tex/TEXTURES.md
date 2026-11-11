# Textures

Every set has three maps, 1024 x 1024 px JPEG:
`<name>_color.jpg` (sRGB albedo), `<name>_normal.jpg` (OpenGL / +Y normal map) and
`<name>_rough.jpg` (greyscale roughness). All sets are **CC0 1.0** (public domain dedication).

"Tile size" is the real-world width one copy of the texture should cover (set
`texture.repeat` = surface width / tile size). Where the source publishes a physical
size it is used and marked *(src)*; otherwise the figure is my estimate from the image
and marked *(est.)*.

## Existing sets (identified from CREDITS.md)

| name | what it is | tile size | source | licence |
|---|---|---|---|---|
| roof | grey asphalt-style roof shingles | 26 ft *(src, 8 m)*, often looks better at 8-10 ft | Poly Haven `grey_roof_01` | CC0 |
| brick | red brick wall | 4.6 ft *(src, 1.4 m)* | Poly Haven `red_brick` | CC0 |
| clinker | rough clinker brick wall | 9.8 ft *(src, 3 m)* | Poly Haven `brick_wall_001` | CC0 |
| pavers | red brick pavers (paths, terrace) | 5.9 ft *(src, 1.8 m)* | Poly Haven `red_brick_pavers` | CC0 |
| tile | terracotta floor tiles | 6.8 ft *(src, 2.08 m)* | Poly Haven `terracotta_floor_tiles` | CC0 |
| floor | oak plank flooring | 3.9 ft *(src, 1.2 m)* | Poly Haven `oak_wood_planks` | CC0 |
| fir | dark stained wood (trim, built-ins) | 4.9 ft *(src, 1.5 m)* | Poly Haven `wood_table_001` | CC0 |
| plaster | painted plaster wall | 6.6 ft *(src, 2 m)* | Poly Haven `painted_plaster_wall` | CC0 |
| shake | wood shingle siding | 4.6 ft *(src, 140 cm)* | ambientCG `WoodSiding013` | CC0 |
| bark | brown tree bark | 3.3 ft *(src, 1 m)* | Poly Haven `bark_brown_02` | CC0 |
| grass | mown lawn | 4.6 ft *(src, 140 cm)* | ambientCG `Grass004` | CC0 |

## New sets

| name | what it is | tile size | source | licence |
|---|---|---|---|---|
| linen | natural oatmeal linen, open basket-like weave; sofa and chair upholstery, cushions | 1.3 ft *(src, 40 cm)* | ambientCG `Fabric066` | CC0 |
| wool | grey wool herringbone; armchair, ottoman, throw | 0.9 ft *(src, 0.27 m)* | Poly Haven `poly_wool_herringbone` | CC0 |
| velvet | deep raspberry-red velour velvet; a reading chair, cushions | 0.9 ft *(src, 0.28 m)* | Poly Haven `velour_velvet` | CC0 |
| curtain | fine, plain light-grey/off-white cotton weave; curtains, bed linen, lampshades | 1.5 ft *(est.)* | ambientCG `Fabric036` | CC0 |
| leather | brown leather; club chair, desk chair, book spines | 1.3 ft *(src, 0.4 m)* | Poly Haven `brown_leather` | CC0 |
| marble | white-grey Carrara-type marble; washstand top, fireplace hearth, kitchen counter | 3 ft *(est.)* | ambientCG `Marble012` | CC0 |
| tile_hex | small white hexagon mosaic, about 1.5 in per hex; bath floor | 1.5 ft *(src, 45 cm)* | ambientCG `Tiles071` | CC0 |
| tile_subway | white beveled offset ("subway") wall tile, about 6 x 4 in, faint veining; kitchen backsplash, bath wainscot | 2 ft *(est., 4 tiles across)* | ambientCG `Tiles010` | CC0 |
| painted_wood | cream/off-white painted wood with soft grain showing through; kitchen cabinets, painted bedroom furniture, beadboard | 3 ft *(est.)* | ambientCG `PaintedWood009C` | CC0 |
| oak_light | light honey oak veneer, fine straight grain; tables, bookcases, desk (distinct from the dark `fir`) | 6 ft *(src, 1.83 m)*; use 2-3 ft on small furniture for a finer grain | Poly Haven `oak_veneer_01` | CC0 |
| wicker | light natural rattan/wicker weave; porch chairs, baskets, laundry hamper | 1.5 ft *(est.)* | ambientCG `Wicker010A` | CC0 |
| gravel | fine light-grey pea gravel; garden path, drive | 6.6 ft *(src, 2 m)* | Poly Haven `gravel_floor_02` | CC0 |
| flagstone | irregular flagstone ("crazy paving") path | 6.6 ft *(src, 2 m)* | Poly Haven `stone_pathway` | CC0 |
| soil | dark tilled garden soil; vegetable and flower beds | 6.6 ft *(src, 2 m)* | Poly Haven `farm_soil` | CC0 |
| mulch | brown wood-chip mulch; shrub beds, tree rings | 6.9 ft *(src, 2.1 m)* | Poly Haven `wood_chip_path` | CC0 |
| meadow | rough mixed grass with leaf litter and brown patches; unmown edges, back garden (distinct from lawn `grass`) | 6.6 ft *(src, 2 m)* | Poly Haven `leafy_grass` | CC0 |

Notes:

- `wool` and `velvet` came from slightly non-square sources (1003 x 1024 and 1024 x 985) and were
  resampled to 1024 x 1024. That is a 2-4 % stretch and keeps the tiling seamless.
- Roughness maps were converted to single-channel greyscale. Poly Haven and ambientCG normal maps are
  the OpenGL (`nor_gl` / `NormalGL`) variants, which three.js expects.
- Source pages: `https://polyhaven.com/a/<id>` and `https://ambientcg.com/view?id=<id>`.
