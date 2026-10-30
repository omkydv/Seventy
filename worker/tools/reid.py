"""Re-identify dogs that leave the frame and come back, so each one is counted once.

SAM 3.1 keeps a dog's number while it stays in view. When a dog walks out and back,
or the camera turns away and back, it can start a new track. For every track that
begins after another one ended, Muse Spark compares the close-ups of the two
and says whether they show the same dog.

Usage: python tools/reid.py <walk_dir> [max_candidates=3]
<walk_dir> holds dogs.json, pieces/pieces.json, sam/c000.txt… and marks/. Writes marks/reid.json.
"""

from __future__ import annotations

import json
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import cv2
import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent))
from annotate_frames import boxes_by_frame  # noqa: E402
from read_marks import API, KEY, to_data_url  # noqa: E402

SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["verdict", "confidence", "reason"],
    "properties": {
        "verdict": {"type": "string", "enum": ["same", "different", "unsure"]},
        "confidence": {"type": "number"},
        "reason": {"type": "string"},
    },
}
INSTRUCTIONS = " ".join([
    "You help count free-roaming dogs on a street survey so that no dog is counted twice.",
    "You see close-ups of dog A, then close-ups of dog B, from the same walk. Dog B first appears after dog A was last seen.",
    "Decide whether B is the same individual dog as A. Compare coat colour and pattern, markings, ears, tail, size and build.",
    "Many street dogs look alike: say same only when distinctive details match, different when any clear detail differs, and unsure otherwise.",
    "confidence: 0 to 1. reason: one plain sentence naming the details you compared.",
])


def words(s: str) -> set[str]:
    return {w for w in re.findall(r"[a-z]+", (s or "").lower()) if len(w) > 2}


def ends(walk: Path, dogs: list[dict]) -> dict[int, tuple[tuple, tuple]]:
    """Each dog's first and last box, from the raw SAM output of its pieces."""
    pieces = json.loads((walk / "pieces" / "pieces.json").read_text())
    fps, starts = pieces["fps"], [s for s, _ in pieces["pieces"]]
    per_chunk = {}
    out = {}
    for d in dogs:
        seen = []
        for seg in d["segments"]:
            c = seg["chunk"]
            if c not in per_chunk:
                per_chunk[c] = boxes_by_frame((walk / "sam" / f"c{c:03d}.txt").read_text())
            for f, items in per_chunk[c].items():
                for oid, l, t, r, b in items:
                    if oid == str(seg["objectId"]):
                        seen.append((starts[c] + f / fps, (l, t, r, b)))
        if seen:
            seen.sort()
            out[d["label"]] = (seen[0][1], seen[-1][1])
    return out


def centre(box: tuple) -> tuple[float, float]:
    l, t, r, b = box
    return ((l + r) / 2, (t + b) / 2)


def candidates(dogs: list[dict], coats: dict[int, str], box_ends: dict, limit: int) -> list[tuple[dict, dict]]:
    """Earlier dogs that could be this one again: a track that ends just before this one
    starts, near where it starts, ranks first; then likeness of the coat descriptions."""
    pairs = []
    for b in dogs:
        earlier = [a for a in dogs if a["label"] != b["label"] and a["lastS"] < b["firstS"] and b["firstS"] - a["lastS"] < 120]
        wb = words(coats.get(b["label"], ""))

        def score(a: dict) -> float:
            s = len(words(coats.get(a["label"], "")) & wb)
            if a["label"] in box_ends and b["label"] in box_ends:
                (ax, ay), (bx, by) = centre(box_ends[a["label"]][1]), centre(box_ends[b["label"]][0])
                near = ((ax - bx) ** 2 + (ay - by) ** 2) ** 0.5
                if b["firstS"] - a["lastS"] < 1.5 and near < 0.3:
                    s += 10
            return s

        earlier.sort(key=score, reverse=True)
        pairs += [(a, b) for a in earlier[:limit]]
    return pairs


def compare(a: dict, b: dict, marks_dir: Path) -> dict:
    def crops(label: int) -> list:
        out = []
        for i in range(2):
            p = marks_dir / f"dog{label:02d}_{i}.jpg"
            if p.exists():
                out.append(cv2.imread(str(p)))
        return out

    ca, cb = crops(a["label"]), crops(b["label"])
    text = (f"Dog A: the first {len(ca)} images, last seen at {a['lastS']:.1f} s. "
            f"Dog B: the last {len(cb)} images, first seen at {b['firstS']:.1f} s. Is B the same dog as A?")
    body = {
        "model": "muse-spark-1.3",
        "instructions": INSTRUCTIONS,
        "input": [{"role": "user", "content": [{"type": "input_text", "text": text}]
                   + [{"type": "input_image", "image_url": to_data_url(i)} for i in ca + cb]}],
        "reasoning": {"effort": "low"},
        "text": {"format": {"type": "json_schema", "name": "same_dog", "schema": SCHEMA, "strict": True}},
    }
    t0 = time.time()
    r = httpx.post(f"{API}/responses", headers={"Authorization": f"Bearer {KEY}"}, json=body, timeout=180)
    r.raise_for_status()
    j = r.json()
    out = "".join(c.get("text", "") for o in j.get("output", []) if o.get("type") == "message" for c in o.get("content", []))
    v = json.loads(out)
    return {"a": a["label"], "b": b["label"], **v, "seconds": round(time.time() - t0, 1), "usage": j.get("usage") or {}}


def main() -> None:
    walk = Path(sys.argv[1])
    limit = int(sys.argv[2]) if len(sys.argv) > 2 else 3
    dogs = json.loads((walk / "dogs.json").read_text())
    marks_dir = walk / "marks"
    marks = json.loads((marks_dir / "marks.json").read_text())
    coats = {m["label"]: (m.get("mark") or {}).get("coat", "") for m in marks}
    pairs = candidates(dogs, coats, ends(walk, dogs), limit)
    with ThreadPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(lambda p: compare(p[0], p[1], marks_dir), pairs))
    # A dog repeats the earlier dog it matches best; chains resolve to the first sighting.
    same: dict[int, int] = {}
    for r in sorted(results, key=lambda r: -r["confidence"]):
        if r["verdict"] == "same" and r["confidence"] >= 0.75 and r["b"] not in same:
            root = r["a"]
            while root in same:
                root = same[root]
            if root != r["b"]:
                same[r["b"]] = root
    (marks_dir / "reid.json").write_text(json.dumps({"pairs": results, "same_as": same}, indent=1))
    for r in results:
        print(f"Dog {r['b']:02d} vs Dog {r['a']:02d}: {r['verdict']:9s} {r['confidence']:.2f} | {r['reason']}")
    print("same as:", same or "none")


if __name__ == "__main__":
    main()
