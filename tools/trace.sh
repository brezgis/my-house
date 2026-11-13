#!/bin/bash
"$(dirname "$0")/clean_cache.sh"      # sweep up after earlier Chrome runs (see that file)
# Real-time walk trace (see tools/trace.py). Holds the render lock, like tools/stats.sh.
#   tools/trace.sh <out.json> <stair|ground|garden|'[[t,x,z,yaw,pitch],...]'> ["<query>"]
[ -f "$(dirname "$0")/local.env" ] && . "$(dirname "$0")/local.env"
export HOUSE_URL=${HOUSE_URL:-http://127.0.0.1:8791}
LOCKDIR=${HOUSE_LOCKS:-/tmp/my_house_shot_locks}; mkdir -p "$LOCKDIR"
while :; do
  for n in 1 2; do exec 9>"$LOCKDIR/slot$n"; if flock -n 9; then break 2; fi; done
  sleep $((3 + RANDOM % 5))
done
nice -n 19 timeout ${TO:-600} python3 "$(dirname "$0")/trace.py" "$@"
