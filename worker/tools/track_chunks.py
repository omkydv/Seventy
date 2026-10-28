"""Track a concept through several video files in parallel with SAM 3.1 and save the raw output.

Usage: python tools/track_chunks.py <out_dir> <concept> <chunk1.mp4> [<chunk2.mp4> ...]
Writes <out_dir>/<chunk name>.txt (protocol text) and prints timings.
"""

from __future__ import annotations

import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
load_dotenv(ROOT / ".env.local")
sys.path.insert(0, str(ROOT / "worker"))

from seventy import sam  # noqa: E402


def run(path: Path, concept: str, out: Path) -> str:
    t0 = time.time()
    fid = sam.upload_file(path)
    t1 = time.time()
    tracks, info = sam.track_video(fid, concept)
    (out / f"{path.stem}.txt").write_text(info["raw_text"])
    return f"{path.name}: upload {t1 - t0:.1f}s, sam {time.time() - t1:.1f}s, objects {len(tracks)}"


def main() -> None:
    out = Path(sys.argv[1])
    concept = sys.argv[2]
    files = [Path(p) for p in sys.argv[3:]]
    out.mkdir(parents=True, exist_ok=True)
    t0 = time.time()
    with ThreadPoolExecutor(max_workers=len(files)) as pool:
        for line in pool.map(lambda p: run(p, concept, out), files):
            print(line, flush=True)
    print(f"all done in {time.time() - t0:.1f}s")


if __name__ == "__main__":
    main()
