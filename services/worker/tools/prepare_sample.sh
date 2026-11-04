#!/usr/bin/env bash
# Prepare a sample walk end to end, offline: split, track dogs (and people, only to blur them),
# stitch, cut close-ups and read marks. Load the result with web/scripts/seed-walk.ts.
# Usage: bash worker/tools/prepare_sample.sh <walk.mp4> <out_dir> [fps=10] [vaccination|sterilization] [paint,collar,ear_tag]
set -euo pipefail
here="$(cd "$(dirname "$0")/../.." && pwd)"
walk="$1"; out="$2"; fps="${3:-10}"; target="${4:-vaccination}"; kinds="${5:-paint,collar,ear_tag}"
py="$here/worker/.venv/Scripts/python"
[ -x "$py" ] || py="$here/worker/.venv/bin/python"
mkdir -p "$out"
out="$(cd "$out" && pwd)"
walk="$(cd "$(dirname "$walk")" && pwd)/$(basename "$walk")"
"$py" "$here/worker/tools/split_walk.py" "$walk" "$out/pieces" 30 2 "$fps"
"$py" -u "$here/worker/tools/track_chunks.py" "$out/sam" dog "$out"/pieces/c*.mp4 &
dogs=$!
"$py" -u "$here/worker/tools/track_chunks.py" "$out/people" person "$out"/pieces/c*.mp4 &
people=$!
wait "$dogs"
(cd "$here/web" && npx tsx scripts/stitch-check.ts "$out/sam" 30 2 "$fps" "$out/dogs.json")
"$py" "$here/worker/tools/read_marks.py" "$walk" "$out/dogs.json" "$out/marks" "$target" "$kinds"
wait "$people"
echo "prepared $out"
