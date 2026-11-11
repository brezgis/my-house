#!/bin/bash
# A screenshot in real time (Playwright + headless Chrome on the GPU), for pages that load more
# than shot.sh's virtual-time budget allows. Waits for window.__ready, then SETTLE seconds (6).
#   tools/pwshot.sh <out.png> "<query>" [width height] [page]     page: e.g. modelcheck (default: the house)
# Shares the render lock with shot.sh and stats.sh.
OUT=$1; Q=$2; W=${3:-1280} H=${4:-760}
SHOT=$(realpath -m "$OUT") W=$W H=$H PAGE=$5 exec "$(dirname "$0")/stats.sh" /dev/null "$Q"
