"""Score SAM 3.1's dog boxes against the hand labels. Standard library only.

Usage: python eval/score.py

Checks that every SAM box on a labelled frame is accounted for, as a dog or as a
false box, then writes eval/results.json and the copy the landing page reads.
Exits non-zero if the labels and SAM's output disagree about which boxes exist.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent


def main() -> int:
    labels = json.loads((HERE / "labels.json").read_text(encoding="utf8"))
    sam = json.loads((HERE / "sam_boxes.json").read_text(encoding="utf8"))["clips"]
    problems, clips = [], []
    for clip in labels["clips"]:
        n = {"frames": 0, "sightings": 0, "found": 0, "missed": 0, "false": 0}
        for lab in clip["frames"]:
            boxes = {b["id"] for b in sam[clip["slug"]][str(lab["frame"])]}
            dogs, false = set(lab["dogs"]), set(lab["false"])
            where = f"{clip['title']} at frame {lab['frame']}"
            if dogs & false:
                problems.append(f"{where}: boxes {sorted(dogs & false)} are labelled both dog and false")
            if dogs | false != boxes:
                problems.append(f"{where}: SAM drew {sorted(boxes, key=int)}, labels cover {sorted(dogs | false, key=int)}")
            n["frames"] += 1
            n["found"] += len(dogs)
            n["missed"] += len(lab["missed"])
            n["false"] += len(false)
            n["sightings"] += len(dogs) + len(lab["missed"])
        clips.append({"slug": clip["slug"], "title": clip["title"], **n})
    if problems:
        print("\n".join(problems))
        return 1
    total = {k: sum(c[k] for c in clips) for k in ("frames", "sightings", "found", "missed", "false")}
    total["recall"] = round(total["found"] / total["sightings"], 4)
    total["precision"] = round(total["found"] / (total["found"] + total["false"]), 4)
    out = {"note": "Every dog in sampled frames of the four clips, marked by hand and matched to SAM 3.1's boxes. Built by eval/score.py from eval/labels.json.", "total": total, "clips": clips}
    text = json.dumps(out, indent=2) + "\n"
    for dst in (HERE / "results.json", HERE.parent / "web" / "src" / "content" / "eval.json"):
        dst.write_text(text, encoding="utf8", newline="\n")
    w = max(len(c["title"]) for c in clips)
    print(f"{'Clip':<{w}}  frames  dogs seen  found  missed  false boxes")
    for c in clips + [{"title": "All four", **total}]:
        print(f"{c['title']:<{w}}  {c['frames']:>6}  {c['sightings']:>9}  {c['found']:>5}  {c['missed']:>6}  {c['false']:>11}")
    print(f"\nFound {total['recall']:.1%} of the dogs a person can see; {total['precision']:.1%} of SAM's boxes are on a dog.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
