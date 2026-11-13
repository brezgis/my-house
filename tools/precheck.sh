#!/bin/bash
"$(dirname "$0")/clean_cache.sh"      # sweep up after earlier Chrome runs (see that file)
# Before a push: load the tree that is about to be published (the git index), not the working
# folder, and report page errors. Serves it for a moment on a spare port.
#   tools/precheck.sh [extra "query" ...]
[ -f "$(dirname "$0")/local.env" ] && . "$(dirname "$0")/local.env"
HOST=$(echo "${HOUSE_URL:-http://127.0.0.1:8791}" | sed -E 's|https?://([^:/]+).*|\1|'); PORT=${PRECHECK_PORT:-8794}
D=$(mktemp -d); git checkout-index -a --prefix="$D/" || exit 2
(cd "$D/site" && exec python3 -m http.server $PORT --bind $HOST >/dev/null 2>&1) & SRV=$!; sleep 1
bad=0
for q in "at=hall&time=14" "view=0,1.6,-9,0,-0.05&time=21&welcome=new" "at=pond&time=13" "at=library&time=14&toy=chess" "at=living&time=14&friends=demo" "at=street&time=21.5" "$@"; do
  out="$D/shot.png"; rm -f "$out"
  err=$(nice timeout 150 google-chrome --headless=new --no-sandbox --password-store=basic --use-gl=angle --use-angle=gl-egl --enable-unsafe-swiftshader --ignore-gpu-blocklist --window-size=900,560 --virtual-time-budget=25000 --enable-logging=stderr --v=0 --screenshot="$out" "http://$HOST:$PORT/?$q" 2>&1 | grep -E "Uncaught|SyntaxError|TypeError|ReferenceError" | grep -v -E "dbus|gcm|GCM" | head -3)
  size=$(stat -c %s "$out" 2>/dev/null || echo 0)
  if [ -n "$err" ] || [ "$size" -lt 200000 ]; then bad=1; echo "FAIL  $q  (picture $size bytes)"; echo "$err" | cut -c1-260; else echo "ok    $q  ($size bytes)"; fi
done
kill $SRV 2>/dev/null; rm -rf "$D"
[ $bad = 0 ] && echo "PRECHECK PASSED" || { echo "PRECHECK FAILED"; exit 1; }
