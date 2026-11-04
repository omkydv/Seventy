#!/usr/bin/env bash
# Day-1 gate on a real walk, without the web app: split, track, stitch, cut close-ups, read marks.
# Usage: bash services/worker/tools/gate_test.sh <walk.mp4> <out_dir> [vaccination|sterilization] [paint,collar]
set -euo pipefail
here="$(cd "$(dirname "$0")/../../.." && pwd)"
walk="$1"; out="$2"; target="${3:-vaccination}"; kinds="${4:-paint,collar}"
py="$here/services/worker/.venv/Scripts/python"
[ -x "$py" ] || py="$here/services/worker/.venv/bin/python"
mkdir -p "$out"
"$py" "$here/services/worker/tools/split_walk.py" "$walk" "$out/pieces" 30 2 5
"$py" -u "$here/services/worker/tools/track_chunks.py" "$out/sam" dog "$out"/pieces/c*.mp4
(cd "$here/web" && npx tsx scripts/stitch-check.ts "$out/sam" 30 2 5 "$out/dogs.json")
"$py" "$here/services/worker/tools/read_marks.py" "$walk" "$out/dogs.json" "$out/marks" "$target" "$kinds"
