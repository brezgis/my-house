#!/bin/bash
# Headless Chrome leaves a "scoped_dir" of about 70 MB in ~/.cache/google-chrome-headless on every
# launch and never removes it (on 2026-11-12 they had reached 65 GB and filled the system drive).
# Every tool here that starts Chrome calls this first: folders older than 20 minutes are not in use.
find "${XDG_CACHE_HOME:-$HOME/.cache}/google-chrome-headless" -mindepth 1 -maxdepth 1 -name 'scoped_dir*' -mmin +20 -exec rm -rf {} + 2>/dev/null
exit 0
