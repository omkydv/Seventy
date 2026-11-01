"""Pull SAM 3.1's boxes for the labelled frames and draw the sheets a person can check.

Usage: python eval/extract.py <footage_dir>

<footage_dir> holds pexels/<video> and processed/<pexels id>/sam/c000.txt, SAM's
saved text output for the clip. Writes eval/sam_boxes.json and one sheet per clip
to web/public/eval/<slug>.jpg: SAM's boxes in green with their ids, dogs without a
box on that frame in amber, boxes on things that aren't dogs in red.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import cv2
import numpy as np

HERE = Path(__file__).resolve().parent
SHEETS = HERE.parent / "web" / "public" / "eval"
FPS = 10
WIDTH, GAP = 2000, 8
FRAME = re.compile(r"<(\d+)f>")
BOX = re.compile(r"(?:^|,|f>)(\d+)<\|box;x1=(\d+);y1=(\d+);x2=(\d+);y2=(\d+);w=(\d+);h=(\d+)")
GREEN, AMBER, RED = (95, 168, 18), (11, 158, 245), (60, 60, 230)


def boxes_by_frame(text: str) -> dict[int, list[tuple[str, float, float, float, float]]]:
    out: dict[int, list[tuple[str, float, float, float, float]]] = {}
    parts = FRAME.split(text)
    for i in range(1, len(parts) - 1, 2):
        body = re.sub(r"<\|mask;[^|]*\|>", "", parts[i + 1])
        for m in BOX.finditer(body):
            oid, x1, y1, x2, y2, w, h = m.groups()
            out.setdefault(int(parts[i]), []).append((oid, int(x1) / int(w), int(y1) / int(h), int(x2) / int(w), int(y2) / int(h)))
    return out


def label(img: np.ndarray, text: str, x: int, y: int, color: tuple[int, int, int], scale: float) -> None:
    (tw, th), _ = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, scale, 2)
    y = max(y, th + 6)
    cv2.rectangle(img, (x, y - th - 6), (x + tw + 8, y + 2), color, -1)
    cv2.putText(img, text, (x + 4, y - 3), cv2.FONT_HERSHEY_SIMPLEX, scale, (255, 255, 255), 2, cv2.LINE_AA)


def main() -> None:
    footage = Path(sys.argv[1])
    labels = json.loads((HERE / "labels.json").read_text(encoding="utf8"))
    SHEETS.mkdir(parents=True, exist_ok=True)
    saved = {}
    for clip in labels["clips"]:
        sam = boxes_by_frame((footage / "processed" / str(clip["pexels"]) / "sam" / "c000.txt").read_text(encoding="utf8"))
        cap = cv2.VideoCapture(str(footage / "pexels" / clip["video"]))
        frames, tiles = {}, []
        for lab in clip["frames"]:
            f = lab["frame"]
            boxes = sam.get(f, [])
            frames[str(f)] = [{"id": o, "box": [round(v, 4) for v in (l, t, r, b)]} for o, l, t, r, b in boxes]
            cap.set(cv2.CAP_PROP_POS_MSEC, f / FPS * 1000)
            ok, img = cap.read()
            if not ok:
                raise SystemExit(f"{clip['video']}: no frame at {f / FPS:.1f} s")
            tiles.append((lab, boxes, img))
        cap.release()
        H, W = tiles[0][2].shape[:2]
        cols = min(len(tiles), 5 if H > W else (2 if len(tiles) <= 4 else 4))
        tw = WIDTH // cols
        th = round(tw * H / W)
        k = tw / W
        rows = (len(tiles) + cols - 1) // cols
        sheet = np.full((rows * th + (rows - 1) * GAP, cols * tw + (cols - 1) * GAP, 3), 249, np.uint8)
        for i, (lab, boxes, img) in enumerate(tiles):
            img = cv2.resize(img, (tw, th), interpolation=cv2.INTER_AREA)
            for o, l, t, r, b in boxes:
                color = RED if o in lab["false"] else GREEN
                cv2.rectangle(img, (int(l * tw), int(t * th)), (int(r * tw), int(b * th)), color, 2)
                label(img, o, int(l * tw), int(t * th), color, 0.45)
            for m in lab["missed"]:
                x1, y1, x2, y2 = (round(v * k) for v in m["box"])
                cv2.rectangle(img, (x1 - 5, y1 - 5), (x2 + 5, y2 + 5), AMBER, 2)
                label(img, f"found at {m['found_at']:.1f} s" if "found_at" in m else "missed", x1 - 5, y1 - 5, AMBER, 0.45)
            label(img, f"{lab['frame'] / FPS:.1f} s", 8, 26, (40, 26, 12), 0.6)
            r, c = divmod(i, cols)
            sheet[r * (th + GAP):r * (th + GAP) + th, c * (tw + GAP):c * (tw + GAP) + tw] = img
        out = SHEETS / f"{clip['slug']}.jpg"
        cv2.imwrite(str(out), sheet, [cv2.IMWRITE_JPEG_QUALITY, 76])
        saved[clip["slug"]] = frames
        print(f"{clip['title']}: {len(tiles)} frames -> {out.relative_to(HERE.parent).as_posix()}")
    # One frame per line keeps the file short and its diffs readable.
    clips = [f'  "{slug}": {{\n' + ",\n".join(f'    "{f}": {json.dumps(b)}' for f, b in fr.items()) + "\n  }" for slug, fr in saved.items()]
    text = f'{{\n "fps": {FPS},\n "clips": {{\n' + ",\n".join(clips) + "\n }\n}\n"
    (HERE / "sam_boxes.json").write_text(text, encoding="utf8", newline="\n")


if __name__ == "__main__":
    main()
