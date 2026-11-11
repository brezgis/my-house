#!/bin/bash
# Before/after pictures of one view: the working tree against the copy kept in
# research/shots_perf/site_before (served through the symlink site/_before, which is not published).
#   tools/ab.sh <name> "<query>" [w h]      -> research/shots_perf/ab/<name>_before.png, _after.png, _pair.jpg
# Prints how much the two differ.
D="$(dirname "$0")"; OUT="$D/../research/shots_perf/ab"; mkdir -p "$OUT"
"$D/shot.sh" "$OUT/$1_before.png" "page=_before/index&ratio=1&$2" ${3:-1280} ${4:-760} | grep -v -E "png|Texture marked"
"$D/shot.sh" "$OUT/$1_after.png" "ratio=1&$2" ${3:-1280} ${4:-760} | grep -v -E "png|Texture marked"
python3 - "$OUT/$1" <<'PY'
import sys
from PIL import Image, ImageChops, ImageStat
a = Image.open(sys.argv[1] + '_before.png').convert('RGB'); b = Image.open(sys.argv[1] + '_after.png').convert('RGB')
d = ImageChops.difference(a, b); g = d.convert('L'); h = g.histogram(); n = a.size[0] * a.size[1]
print(f"{sys.argv[1].split('/')[-1]}: mean diff {ImageStat.Stat(g).mean[0]:.2f}/255, pixels differing by more than 12: {sum(h[13:]) / n:.2%}, more than 40: {sum(h[41:]) / n:.2%}; bbox of change {g.point(lambda v: 255 if v > 24 else 0).getbbox()}")
w, hh = a.size; pair = Image.new('RGB', (w * 2 + 8, hh), (255, 0, 255)); pair.paste(a, (0, 0)); pair.paste(b, (w + 8, 0)); pair.save(sys.argv[1] + '_pair.jpg', quality=88)
PY
