#!/bin/bash
# Numbers for the test viewpoints (site/src/perf.js), from headless Chrome on the GPU, in real time.
#   tools/stats.sh <out.json> ["<query>"]       e.g. tools/stats.sh /tmp/s.json "statsdump=hall,kitchen&hours=13"
# Visits every named viewpoint (or those listed) by day and at night and prints, for each,
# draw calls, triangles, textures and geometries in GPU memory, estimated MB, and the
# CPU time of the visibility code. Shares the render lock with tools/shot.sh (one at a time).
# Also: tools/stats.sh <out.json> "eval=<js expression>&<query>" waits for the page to settle and prints the expression.
[ -f "$(dirname "$0")/local.env" ] && . "$(dirname "$0")/local.env"
export HOUSE_URL=${HOUSE_URL:-http://127.0.0.1:8791}
OUT=$1; Q=${2:-statsdump}
LOCKDIR=${HOUSE_LOCKS:-/tmp/my_house_shot_locks}; mkdir -p "$LOCKDIR"
while :; do
  for n in 1 2; do exec 9>"$LOCKDIR/slot$n"; if flock -n 9; then break 2; fi; done
  sleep $((3 + RANDOM % 5))
done
nice -n 19 timeout ${TO:-600} python3 "$(dirname "$0")/stats.py" "$OUT" "$Q"
