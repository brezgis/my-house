#!/bin/bash
# Rebuild the "before" copy used by tools/ab.sh from the last commit (the working tree's uncommitted
# changes are the "after"). Run again whenever someone else commits.
R="$(cd "$(dirname "$0")/.." && pwd)"; B="$R/research/shots_perf/site_before"
rm -rf "$B/src" "$B/index.html"; mkdir -p "$B"
git -C "$R" archive HEAD site/src site/index.html | tar -x -C "$B" --strip-components=1
ln -sfn ../../../site/assets "$B/assets"; ln -sfn ../../../site/vendor "$B/vendor"; ln -sfn ../research/shots_perf/site_before "$R/site/_before"
echo "before = $(git -C "$R" log --oneline -1)"
