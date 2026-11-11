# Run inside Blender (tools/decimate.py does this):
#   blender -b --factory-startup --python tools/decimate_blender.py -- <in.gltf> <out.json> <target_tris>
# Imports the model, reduces every mesh with the Decimate modifier (collapse, which keeps UV
# seams and borders), carries the original shading normals across with a Data Transfer
# modifier, and writes the reduced triangles per glTF mesh and material as JSON (glTF axes:
# y up, v measured from the top). tools/decimate.py puts them back into the original file,
# so materials, textures and extensions are left exactly as they were.
import bpy, sys, json, base64
import numpy as np

argv = sys.argv[sys.argv.index('--') + 1:]
src, out, target = argv[0], argv[1], int(argv[2])
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src, merge_vertices=True)
objs = [o for o in bpy.context.scene.objects if o.type == 'MESH']
tris = lambda me: sum(len(p.vertices) - 2 for p in me.polygons)
total = sum(tris(m) for m in {o.data for o in objs})
ratio = min(1.0, target / max(1, total))
done, result = set(), {}
for o in objs:
    me = o.data
    if me.name in done: continue
    done.add(me.name)
    ref = o.copy(); ref.data = me.copy(); bpy.context.scene.collection.objects.link(ref)
    if ratio < 0.999:
        d = o.modifiers.new('dec', 'DECIMATE'); d.decimate_type = 'COLLAPSE'; d.ratio = ratio; d.use_collapse_triangulate = True
        t = o.modifiers.new('nor', 'DATA_TRANSFER'); t.object = ref; t.use_loop_data = True; t.data_types_loops = {'CUSTOM_NORMAL'}; t.loop_mapping = 'POLYINTERP_NEAREST'
    deps = bpy.context.evaluated_depsgraph_get()
    em = o.evaluated_get(deps).to_mesh()
    em.calc_loop_triangles()
    n = em.corner_normals
    uvl = em.uv_layers.active.data if em.uv_layers.active else None
    prims = {}
    for tri in em.loop_triangles:
        slot = o.material_slots[tri.material_index].material if tri.material_index < len(o.material_slots) else None
        key = slot.name if slot else ''
        p = prims.setdefault(key, {'v': {}, 'pos': [], 'nor': [], 'uv': [], 'idx': []})
        for li, vi in zip(tri.loops, tri.vertices):
            co = em.vertices[vi].co; nn = n[li].vector; uv = uvl[li].uv if uvl else (0, 0)
            g = (co.x, co.z, -co.y); gn = (nn.x, nn.z, -nn.y); gu = (uv[0], 1 - uv[1])
            k = (round(g[0], 6), round(g[1], 6), round(g[2], 6), round(gn[0], 3), round(gn[1], 3), round(gn[2], 3), round(gu[0], 5), round(gu[1], 5))
            j = p['v'].get(k)
            if j is None:
                j = p['v'][k] = len(p['pos']) // 3
                p['pos'] += g; p['nor'] += gn; p['uv'] += gu
            p['idx'].append(j)
    enc = lambda a, t: base64.b64encode(np.asarray(a, dtype=t).tobytes()).decode()
    result[me.name] = {k: {'pos': enc(p['pos'], np.float32), 'nor': enc(p['nor'], np.float32), 'uv': enc(p['uv'], np.float32), 'idx': enc(p['idx'], np.uint32), 'tris': len(p['idx']) // 3} for k, p in prims.items()}
    o.evaluated_get(deps).to_mesh_clear()
json.dump({'before': total, 'ratio': ratio, 'meshes': result}, open(out, 'w'))
print('DECIMATED', src, total, '->', sum(p['tris'] for m in result.values() for p in m.values()))
