# Blender: the iMac G3 model, recoloured to the pink ("strawberry") one, sized to the real machine, origin bottom-centre.
#   blender --background --python tools/imac_pink.py -- <in.glb> <out.gltf>
import bpy, sys
from mathutils import Vector
src, dst = sys.argv[sys.argv.index('--') + 1:][:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
PINK = {'green1': ((1.0, 0.36, 0.55, 1), 0.25), 'green2': ((0.95, 0.27, 0.47, 1), 0.3), 'gray1': ((0.90, 0.89, 0.86, 1), 0.3)}
for m in bpy.data.materials:
    key = m.name.split('.')[0]
    bsdf = m.node_tree.nodes.get('Principled BSDF') if m.use_nodes else None
    if not bsdf: continue
    if key in PINK:
        col, rough = PINK[key]
        bsdf.inputs['Base Color'].default_value = col; bsdf.inputs['Roughness'].default_value = rough; bsdf.inputs['Alpha'].default_value = 1.0
        for l in list(bsdf.inputs['Alpha'].links): m.node_tree.links.remove(l)
    else:
        bsdf.inputs['Alpha'].default_value = 1.0
    try: m.blend_method = 'OPAQUE'
    except Exception: pass
    try: m.surface_render_method = 'DITHERED'
    except Exception: pass
meshes = [o for o in bpy.data.objects if o.type == 'MESH']
bpy.ops.object.select_all(action='DESELECT')
for o in meshes: o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
bpy.ops.object.join()
o = bpy.context.view_layer.objects.active
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
bb = [o.matrix_world @ Vector(c) for c in o.bound_box]
mn = Vector((min(v.x for v in bb), min(v.y for v in bb), min(v.z for v in bb))); mx = Vector((max(v.x for v in bb), max(v.y for v in bb), max(v.z for v in bb)))
print('BOUNDS', [round(v, 3) for v in mn], [round(v, 3) for v in mx])
k = 0.40 / (mx.z - mn.z)                                  # the computer stands 40 cm (15.8 in) tall
o.location = Vector((-(mn.x + mx.x) / 2, -(mn.y + mx.y) / 2, -mn.z)); bpy.ops.object.transform_apply(location=True)
o.scale = (k, k, k); bpy.ops.object.transform_apply(scale=True)
bpy.ops.object.shade_smooth()
o.name = 'imac_g3'
print('SIZE m', [round((mx - mn)[i] * k, 3) for i in range(3)], 'tris', sum(len(p.vertices) - 2 for p in o.data.polygons))
bpy.ops.export_scene.gltf(filepath=dst, export_format='GLTF_SEPARATE', export_apply=True, export_yup=True)
