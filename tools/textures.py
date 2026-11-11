#!/usr/bin/env python3
"""Texture diet for the house.

  python3 tools/textures.py half              assets/tex/*.jpg -> assets/tex/512/*.jpg at half size
                                              (the medium and low quality tiers load these)
  python3 tools/textures.py models <placements.json> [--apply]
                                              size each model's textures to how big the model is
                                              (512 for props, 256 for trinkets, normal and
                                              roughness maps of trinkets dropped, their average
                                              baked into the material factors). Without --apply
                                              it only reports. Originals are copied first to
                                              research/asset_originals/models/<id>/.

placements.json: [[id, scale, outdoor], ...] as listed by the page (window.__house.items.models).
Run with nice; it is single-threaded.
"""
import json, os, re, shutil, sys
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SITE = os.path.join(ROOT, 'site')
ORIG = os.path.join(ROOT, 'research', 'asset_originals')


def half():
    src = os.path.join(SITE, 'assets', 'tex'); dst = os.path.join(src, '512'); os.makedirs(dst, exist_ok=True)
    n = 0
    for f in sorted(os.listdir(src)):
        if not f.endswith('.jpg'): continue
        im = Image.open(os.path.join(src, f)); w, h = im.size
        out = os.path.join(dst, f)
        if os.path.exists(out) and os.path.getmtime(out) > os.path.getmtime(os.path.join(src, f)): continue
        im.resize((max(1, w // 2), max(1, h // 2)), Image.LANCZOS).save(out, quality=90, optimize=True)
        n += 1
    print('half-size copies written:', n)


def gpu_mb(w, h): return w * h * 4 * 1.333 / 2**20


def catalog_sizes():
    sizes = {}
    for line in open(os.path.join(SITE, 'assets', 'models', 'CATALOG.md')):
        m = re.match(r'\|\s*([A-Za-z0-9_]+)\s*\|.*?\|\s*([\d.]+) x ([\d.]+) x ([\d.]+)\s*\|', line)
        if m: sizes[m.group(1)] = max(float(m.group(2)), float(m.group(3)), float(m.group(4)))
    return sizes


def models(placements_file, apply):
    pl = json.load(open(placements_file))
    size = catalog_sizes()
    biggest = {}
    for mid, scale, outdoor in pl:
        biggest[mid] = max(biggest.get(mid, 0), size.get(mid, 3) * scale)
    before = after = 0
    for mid in sorted(biggest):
        ft = biggest[mid]
        gpath = os.path.join(SITE, 'assets', 'models', mid, mid + '.gltf')
        if not os.path.exists(gpath): continue
        g = json.load(open(gpath))
        # Sizes: furniture keeps 1024 colour; props (< 2.5 ft) 512; trinkets (< 1 ft) 256 and no detail maps
        trinket = ft < 1.0
        cap_col = 256 if trinket else 512 if ft < 2.5 else 1024
        cap_det = 256 if ft < 2.5 else 512
        uses = {}                                         # image index -> 'col' | 'det'
        drop = set()                                      # image indices whose maps are removed (trinkets)
        for mat in g.get('materials', []):
            pbr = mat.get('pbrMetallicRoughness', {})
            def use(texinfo, kind):
                if texinfo is None: return
                img = g['textures'][texinfo['index']].get('source')
                if img is not None: uses[img] = 'col' if kind == 'col' or uses.get(img) == 'col' else 'det'
            use(pbr.get('baseColorTexture'), 'col'); use(mat.get('emissiveTexture'), 'col')
            use(pbr.get('metallicRoughnessTexture'), 'det'); use(mat.get('normalTexture'), 'det'); use(mat.get('occlusionTexture'), 'det')
            for ext in mat.get('extensions', {}).values():
                for k, v in ext.items():
                    if isinstance(v, dict) and 'index' in v: use(v, 'det')
        changed = False
        for mat in g.get('materials', []):
            if not trinket: continue
            pbr = mat.setdefault('pbrMetallicRoughness', {})
            mr = pbr.get('metallicRoughnessTexture')
            if mr is not None:
                img = g['textures'][mr['index']]['source']
                p = os.path.join(SITE, 'assets', 'models', mid, g['images'][img]['uri'])
                im = Image.open(p).convert('RGB').resize((16, 16))
                px = list(im.getdata()); rough = sum(q[1] for q in px) / len(px) / 255; metal = sum(q[2] for q in px) / len(px) / 255
                pbr['roughnessFactor'] = round(pbr.get('roughnessFactor', 1) * rough, 3); pbr['metallicFactor'] = round(pbr.get('metallicFactor', 1) * metal, 3)
                del pbr['metallicRoughnessTexture']; changed = True
                if mat.get('occlusionTexture', {}).get('index') == mr['index']: del mat['occlusionTexture']
            if 'normalTexture' in mat: del mat['normalTexture']; changed = True
        still = set()
        for mat in g.get('materials', []):
            for t in [mat.get('pbrMetallicRoughness', {}).get('baseColorTexture'), mat.get('pbrMetallicRoughness', {}).get('metallicRoughnessTexture'), mat.get('normalTexture'), mat.get('occlusionTexture'), mat.get('emissiveTexture')] + [v for e in mat.get('extensions', {}).values() for v in e.values() if isinstance(v, dict) and 'index' in v]:
                if t is not None: still.add(g['textures'][t['index']].get('source'))
        for i, im in enumerate(g.get('images', [])):
            uri = im.get('uri')
            if not uri: continue
            p = os.path.join(SITE, 'assets', 'models', mid, uri)
            if not os.path.exists(p): continue
            w, h = Image.open(p).size; before += gpu_mb(w, h)
            if i not in still: continue                     # dropped (or unused): costs nothing now
            cap = cap_col if uses.get(i, 'det') == 'col' else cap_det
            k = max(w, h) / cap
            nw, nh = (w, h) if k <= 1 else (max(1, round(w / k)), max(1, round(h / k)))
            after += gpu_mb(nw, nh)
            if apply and (nw, nh) != (w, h):
                backup(mid, uri)
                img = Image.open(p)
                img = img.resize((nw, nh), Image.LANCZOS)
                if p.lower().endswith(('.jpg', '.jpeg')): img.convert('RGB').save(p, quality=90, optimize=True)
                else: img.save(p, optimize=True)
        if apply and changed:
            backup(mid, mid + '.gltf')
            json.dump(g, open(gpath, 'w'), indent=1)
        print(f'{mid:34} {ft:5.1f} ft  colour<= {cap_col:4}  maps<= {cap_det:4}{"  trinket: detail maps dropped" if trinket and changed else ""}')
    print(f'model textures (GPU, all used models): before {before:.0f} MB, after {after:.0f} MB')


def backup(mid, rel):
    src = os.path.join(SITE, 'assets', 'models', mid, rel); dst = os.path.join(ORIG, 'models', mid, rel)
    if os.path.exists(dst): return
    os.makedirs(os.path.dirname(dst), exist_ok=True); shutil.copy2(src, dst)


if __name__ == '__main__':
    if sys.argv[1] == 'half': half()
    elif sys.argv[1] == 'models': models(sys.argv[2], '--apply' in sys.argv)
