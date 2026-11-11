# Garden models

Models fetched for the garden (Poly Haven, 1k glTF). Textures were reduced to
1024 px (foliage) or 512 px (props), JPEG, except alpha-masked foliage, whose
diffuse map was rebuilt as PNG with the published alpha map merged in (the
Poly Haven JPEG variant drops the alpha channel). Sizes are the overall
bounding box in feet (x by y-height by z), as loaded at scale 1.

| id | what | size (ft) | triangles | licence | source |
|---|---|---|---|---|---|
| fern_02 | Garden fern clumps, several variants in one file, alpha-masked fronds. The garden uses one variant, instanced. | 6.47 x 1.40 x 5.66 | 6,232 | CC0 | https://polyhaven.com/a/fern_02 |
| shrub_sorrel_01 | Wood sorrel clumps with pink flowers (variants), alpha leaves (fetched; not placed, 11 meshes is too many draw calls) | 1.16 x 0.19 x 0.48 | 3,319 | CC0 | https://polyhaven.com/a/shrub_sorrel_01 |
| stone_fire_pit | Low ring of stacked fieldstones; the meadow fire pit | 4.75 x 1.27 x 4.70 | 3,887 | CC0 | https://polyhaven.com/a/stone_fire_pit |
| fishermans_hat | Khaki canvas bucket hat; worn by the scarecrow | 1.06 x 0.41 x 1.15 | 10,304 | CC0 | https://polyhaven.com/a/fishermans_hat |
| rusted_spade_01 | Rusty spade with wooden handle; stuck in a potager bed, a robin on it | 0.55 x 3.61 x 0.15 | 11,436 | CC0 | https://polyhaven.com/a/rusted_spade_01 |
| trowel_01 | Garden trowel; on a raised-bed edge | 0.33 x 0.34 x 1.14 | 5,242 | CC0 | https://polyhaven.com/a/trowel_01 |
| garden_gloves_01 | Teal and grey garden gloves; on a raised-bed edge | 0.74 x 0.25 x 0.98 | 6,822 | CC0 | https://polyhaven.com/a/garden_gloves_01 |
| seeding_tray_01 | Seed tray with seedlings; glasshouse potting bench | 0.72 x 0.20 x 0.72 | 8,334 | CC0 | https://polyhaven.com/a/seeding_tray_01 |
| football | Worn leather football; on the north lawn by the play set | 1.67 x 0.73 x 0.73 | 4,296 | CC0 | https://polyhaven.com/a/football |
| planter_box_02 | Long rustic wooden trough; glasshouse bench, herbs in it | 4.11 x 1.49 x 1.53 | 10,944 | CC0 | https://polyhaven.com/a/planter_box_02 |
| shrub_03 | Sparse wild shrub sprigs, alpha leaves (fetched, not placed) | 4.48 x 1.32 x 0.50 | 8,287 | CC0 | https://polyhaven.com/a/shrub_03 |
| weed_plant_02 | Weed/wild plant clumps, alpha leaves (fetched, not placed) | 6.97 x 0.25 x 0.95 | 11,116 | CC0 | https://polyhaven.com/a/weed_plant_02 |
| moon_rock_02 | Pale grey rock scan (fetched, not placed; the pond and walls use procedural stones) | 0.81 x 0.66 x 0.82 | 3,304 | CC0 | https://polyhaven.com/a/moon_rock_02 |

Other catalogue models placed in the garden (fetched by others, see CATALOG.md):
painted_wooden_bench, painted_wooden_chair_01, garden_gnome, watering_can_metal_01,
wooden_lantern_01, Lantern_01, Rockingchair_01, outdoor_table_chair_set_01,
wooden_picnic_table, vintage_day_bed, side_table_01, vintage_oil_lamp,
ArmChair_01, wicker_basket_01, metal_jug, dead_tree_trunk_02.

Everything else outdoors (trees, shrubs, flowers, vegetables, the pond, play
set, glasshouse, summerhouse, creatures) is built in code; plant leaves and
flowers are painted at start-up (src/garden/paint.js).

## Animals from the village project

Copied unchanged from the author's village project (assets-src/animals) (see SOURCES.md there),
saved as `v_<name>/v_<name>.glb` and loaded directly with GLTFLoader by the garden (they are
GLB, not .gltf, so they are not meant for the `models` list). All face +Z, feet at y = 0, metres.

| id | what | size (m) | triangles | licence | author / source |
|---|---|---|---|---|---|
| v_frog | green frog (smooth), on the big lily pad | 0.09 x 0.05 x 0.09 (shown at 1.3x) | 904 | CC0 1.0 | AssetQuest, https://poly.pizza/m/yK6MyLkuob |
| v_duck_mallard | mallard; two on the pond, one tinted brown | 0.21 x 0.40 x 0.55 | 656 | CC-BY 3.0 | Poly by Google, https://poly.pizza/m/frSLi6b6Vid |
| v_hare | jackrabbit, sitting in the lettuces (shown at 0.62x, tinted) | 0.26 x 0.55 x 0.55 | 994 | CC-BY 3.0 | Poly by Google, https://poly.pizza/m/biNOm96olTH |
| v_squirrel | squirrel, tinted rufous, on the tree seat | 0.13 x 0.20 x 0.40 | 716 | CC-BY 3.0 | Poly by Google, https://poly.pizza/m/caxos24uWC9 |
| v_dragonfly | dragonfly, two darting over the pond (shown at 2.2x) | 0.10 x 0.03 x 0.07 | 466 | CC-BY 3.0 | Poly by Google, https://poly.pizza/m/0myA_BOcZrD |
| v_kingfisher_bluejay | blue jay, at the bird bath | 0.08 x 0.12 x 0.24 | 884 | CC-BY 3.0 | jeremy, https://poly.pizza/m/dWfeVtr7M49 |

CC-BY 3.0 models need credit on the site's sources page (authors as above).
