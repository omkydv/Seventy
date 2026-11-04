"""Cut a walk into overlapping 5 fps pieces, the same way the browser does.

Usage: python tools/split_walk.py <walk.mp4> <out_dir> [piece_seconds=30] [overlap=2] [fps=5]
Writes c000.mp4, c001.mp4, … and pieces.json with each piece's start and end.
"""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


def duration(path: Path) -> float:
    out = subprocess.check_output(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", str(path)]
    )
    return float(out.decode().strip())


def plan(total: float, piece: float, overlap: float) -> list[tuple[float, float]]:
    out: list[tuple[float, float]] = []
    start = 0.0
    idx = 0
    while start < total - 0.05:
        end = min(total, start + piece + (overlap if idx else 0))
        if total - end < 10:
            end = total
        out.append((start, end))
        if end >= total:
            break
        start = end - overlap
        idx += 1
    return out


def main() -> None:
    src = Path(sys.argv[1])
    out = Path(sys.argv[2])
    piece = float(sys.argv[3]) if len(sys.argv) > 3 else 30
    overlap = float(sys.argv[4]) if len(sys.argv) > 4 else 2
    fps = float(sys.argv[5]) if len(sys.argv) > 5 else 5
    out.mkdir(parents=True, exist_ok=True)
    total = duration(src)
    pieces = plan(total, piece, overlap)
    for i, (s, e) in enumerate(pieces):
        dst = out / f"c{i:03d}.mp4"
        subprocess.run(
            [
                "ffmpeg", "-v", "error", "-y", "-ss", f"{s:.3f}", "-to", f"{e:.3f}", "-i", str(src),
                "-vf", f"fps={fps},scale='if(gt(iw,ih),960,-2)':'if(gt(iw,ih),-2,960)'",
                "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "veryfast", "-b:v", "1200k",
                "-an", "-movflags", "+faststart", str(dst),
            ],
            check=True,
        )
        print(f"{dst.name}: {s:.1f}s to {e:.1f}s")
    (out / "pieces.json").write_text(json.dumps({"source": str(src), "duration": total, "piece": piece, "overlap": overlap, "fps": fps, "pieces": pieces}))


if __name__ == "__main__":
    main()
