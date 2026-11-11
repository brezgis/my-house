#!/usr/bin/env python3
"""Lighter versions of the heaviest models: fewer triangles, same look.

  nice python3 tools/decimate.py <id>=<target_tris> ...      e.g. mantel_clock_01=5000
  nice python3 tools/decimate.py <id>                         put the original geometry back

For each model: the original .gltf/.bin are kept in research/asset_originals/models/<id>/
(and always used as the source, so running again starts from the original), Blender
reduces the meshes (tools/decimate_blender.py), and the reduced triangles replace the
geometry in the original glTF. Materials, textures and extensions are untouched. Only
models without skins, animation or morph targets, with images stored as files, are done.
"""
import base64, json, os, shutil, subprocess, sys, tempfile
import numpy as np

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
MODELS = os.path.join(ROOT, 'site', 'assets', 'models')
ORIG = os.path.join(ROOT, 'research', 'asset_originals', 'models')


def original(mid, rel):
    src, dst = os.path.join(MODELS, mid, rel), os.path.join(ORIG, mid, rel)
    if not os.path.exists(dst):
        os.makedirs(os.path.dirname(dst), exist_ok=True); shutil.copy2(src, dst)
    return dst


def run(mid, target):
    g = json.load(open(original(mid, mid + '.gltf')))      # the original (texture diet edits are in the live file)
    live = json.load(open(os.path.join(MODELS, mid, mid + '.gltf')))
    if g.get('skins') or g.get('animations') or any('targets' in p for m in g['meshes'] for p in m['primitives']) or any('bufferView' in i for i in g.get('images', [])) or len(g['buffers']) != 1:
        print(mid, 'skipped (skins, animation, morphs or embedded images)'); return
    binname = g['buffers'][0]['uri']; original(mid, binname)
    # Blender reads the original glTF from a temporary copy beside the live textures
    tmp = tempfile.mkdtemp(prefix='dec_', dir=os.path.join(MODELS, mid))
    try:
        json.dump(g, open(os.path.join(tmp, 'src.gltf'), 'w'))
        shutil.copy2(os.path.join(ORIG, mid, binname), os.path.join(tmp, binname))
        for im in g.get('images', []):
            p = os.path.join(tmp, im['uri']); os.makedirs(os.path.dirname(p), exist_ok=True)
            shutil.copy2(os.path.join(MODELS, mid, im['uri']), p)
        out = os.path.join(tmp, 'out.json')
        r = subprocess.run(['nice', '-n', '19', 'blender', '-b', '--factory-startup', '--python', os.path.join(ROOT, 'tools', 'decimate_blender.py'), '--', os.path.join(tmp, 'src.gltf'), out, str(target)], capture_output=True, text=True, timeout=900)
        if not os.path.exists(out): print(mid, 'blender failed', r.stdout[-800:], r.stderr[-800:]); return
        res = json.load(open(out))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    # Build the new geometry buffer
    blob, views, accs = bytearray(), [], []
    def add(arr, kind, target_buf, comp, typ, mm=False):
        while len(blob) % 4: blob.append(0)
        off = len(blob); data = arr.tobytes(); blob.extend(data)
        views.append({'buffer': 0, 'byteOffset': off, 'byteLength': len(data), 'target': target_buf})
        a = {'bufferView': len(views) - 1, 'componentType': comp, 'count': len(arr) // {'VEC3': 3, 'VEC2': 2, 'SCALAR': 1}[typ], 'type': typ}
        if mm: v = arr.reshape(-1, 3); a['min'] = v.min(0).tolist(); a['max'] = v.max(0).tolist()
        accs.append(a); return len(accs) - 1
    dec = lambda s, t: np.frombuffer(base64.b64decode(s), dtype=t)
    names = list(res['meshes'].keys())
    after = 0
    for i, mesh in enumerate(g['meshes']):
        key = mesh.get('name')
        got = res['meshes'].get(key) if key in res['meshes'] else (res['meshes'][names[i]] if len(names) == len(g['meshes']) else None)
        if got is None: print(mid, 'no match for mesh', key, names); return
        prims = []
        for p in mesh['primitives']:
            mname = g['materials'][p['material']].get('name', '') if 'material' in p else ''
            q = got.get(mname) or (list(got.values())[0] if len(got) == 1 and len(mesh['primitives']) == 1 else None)
            if q is None:
                cands = [k for k in got if k.split('.')[0] == mname.split('.')[0]]
                q = got[cands[0]] if cands else None
            if q is None: print(mid, 'no match for material', mname, list(got)); return
            pos, nor, uv, idx = dec(q['pos'], np.float32), dec(q['nor'], np.float32), dec(q['uv'], np.float32), dec(q['idx'], np.uint32)
            np_ = {k: v for k, v in p.items() if k not in ('attributes', 'indices')}
            np_['attributes'] = {'POSITION': add(pos, 'p', 34962, 5126, 'VEC3', True), 'NORMAL': add(nor, 'n', 34962, 5126, 'VEC3'), 'TEXCOORD_0': add(uv, 'u', 34962, 5126, 'VEC2')}
            small = len(pos) // 3 < 65536
            np_['indices'] = add(idx.astype(np.uint16 if small else np.uint32), 'i', 34963, 5123 if small else 5125, 'SCALAR')
            after += len(idx) // 3
            prims.append(np_)
        live['meshes'][i]['primitives'] = prims
    live['accessors'], live['bufferViews'] = accs, views
    live['buffers'] = [{'uri': binname, 'byteLength': len(blob)}]
    open(os.path.join(MODELS, mid, binname), 'wb').write(bytes(blob))
    json.dump(live, open(os.path.join(MODELS, mid, mid + '.gltf'), 'w'), indent=1)
    print(f'{mid}: {res["before"]} -> {after} triangles')


def restore(mid):
    """Put the original geometry back (keeping any later material or texture edits)."""
    g = json.load(open(os.path.join(ORIG, mid, mid + '.gltf'))); live = json.load(open(os.path.join(MODELS, mid, mid + '.gltf')))
    for k in ('meshes', 'accessors', 'bufferViews', 'buffers'): live[k] = g[k]
    shutil.copy2(os.path.join(ORIG, mid, g['buffers'][0]['uri']), os.path.join(MODELS, mid, g['buffers'][0]['uri']))
    json.dump(live, open(os.path.join(MODELS, mid, mid + '.gltf'), 'w'), indent=1)
    print(mid, 'restored')


if __name__ == '__main__':
    for a in sys.argv[1:]:
        if '=' not in a: restore(a); continue                 # a bare id: put the original back
        mid, t = a.split('='); run(mid, int(t))
