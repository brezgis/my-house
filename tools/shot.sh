#!/bin/bash
"$(dirname "$0")/clean_cache.sh"      # sweep up after earlier Chrome runs (see that file)
# Take a screenshot of the house with headless Chrome, rendered on the GPU (about a minute).
# ANGLE=swiftshader falls back to slow software rendering if the GPU is unavailable.
#   tools/shot.sh <out.png> "<query string>" [width height]
# Useful query parameters:
#   view=x,feetY,z,yaw,pitch   stand at world x,z with feet at feetY, looking yaw/pitch (radians)
#   time=13.5                  hour of the day        open       all doors open
#   shot                       outside circling view without the welcome fade
#   fov=40                     narrower lens          fps        draw-call and triangle counts
#   at=kitchen                 a named test viewpoint (site/src/perf.js)   quality=low|medium|high
#   page=modelcheck&ids=a,b    before/after of reduced models (see site/modelcheck.html)
# Console errors from the page are printed. VT=30000 raises the time allowed for loading.
[ -f "$(dirname "$0")/local.env" ] && . "$(dirname "$0")/local.env"      # optional: HOUSE_URL, HOUSE_LOCKS for this machine
BASE=${HOUSE_URL:-http://127.0.0.1:8791}
OUT=$1; W=${3:-1280}; H=${4:-760}
# "page=modelcheck&ids=..." opens site/modelcheck.html instead of the house
case "$2" in page=*) P=${2%%&*}; URL="$BASE/${P#page=}.html?${2#*&}" ;; *) URL="$BASE/?$2" ;; esac
# The machine is shared: at most two renders run at once; others wait their turn here.
LOCKDIR=${HOUSE_LOCKS:-/tmp/my_house_shot_locks}; mkdir -p "$LOCKDIR"
while :; do
  for n in 1 2; do exec 9>"$LOCKDIR/slot$n"; if flock -n 9; then break 2; fi; done
  sleep $((3 + RANDOM % 5))
done
nice -n 19 timeout ${TO:-240} google-chrome --headless=new --no-sandbox --password-store=basic --use-gl=angle --use-angle=${ANGLE:-gl-egl} --enable-unsafe-swiftshader --ignore-gpu-blocklist --window-size=$W,$H --virtual-time-budget=${VT:-25000} --enable-logging=stderr --v=0 --screenshot="$OUT" "$URL" 2>&1 | grep -E "CONSOLE|Uncaught|rror" | grep -v -E "dbus|gcm|GCM|registration|sandbox|DEPRECATED|Vulkan|vaapi|udev|radv|renderD" | head -12
ls -la "$OUT" | awk '{print $5, $9}'
