#!/usr/bin/env python3
"""The half-size photos (site/assets/tex/512/), made from the full ones (site/assets/tex/).

  python3 tools/tex512.py [--all]      writes those older than their full-size photo (--all: every one)

Every visit starts on these (materials.js loads them first and the threshold waits for them), so they are kept
light: a colour map at quality 80 (on the medium and high tiers the full one replaces it a few seconds later),
a normal map at 85 (it is the final copy on the medium tier), a roughness map at 75 (it only shades the sheen,
which has no edges to lose). At quality 90 they were a third heavier, with no difference anyone could see.
The same file is in the house, the town and the lab.
"""
import os, sys
from PIL import Image

SITE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'site')
QUALITY = {'color': 80, 'normal': 85, 'rough': 75}


def main(every):
    src = os.path.join(SITE, 'assets', 'tex'); dst = os.path.join(src, '512'); os.makedirs(dst, exist_ok=True)
    n = before = after = 0
    for f in sorted(os.listdir(src)):
        if not f.endswith('.jpg'): continue
        out = os.path.join(dst, f)
        if not os.path.exists(out): continue      # (a photo with no half-size copy is one that is always loaded whole: toys.js's globe)
        if not every and os.path.exists(out) and os.path.getmtime(out) > os.path.getmtime(os.path.join(src, f)): continue
        kind = f[:-4].rsplit('_', 1)[-1]
        before += os.path.getsize(out) if os.path.exists(out) else 0
        im = Image.open(os.path.join(src, f)).convert('RGB'); w, h = im.size
        im.resize((max(1, w // 2), max(1, h // 2)), Image.LANCZOS).save(out, 'JPEG', quality=QUALITY.get(kind, 85), optimize=True, progressive=True)
        after += os.path.getsize(out); n += 1
    print(f'half-size copies written: {n} ({before // 1024} KB -> {after // 1024} KB)')


if __name__ == '__main__':
    main('--all' in sys.argv)
