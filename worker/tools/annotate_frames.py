"""Draw SAM 3.1 boxes and object ids on frames of a piece, for checking tracks by eye.

Usage: python tools/annotate_frames.py <piece.mp4> <sam.txt> <out.jpg> [every_n_frames=10] [columns=4]
Writes one contact sheet: every n-th frame with each object's box and id.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

import cv2
import numpy as np

FRAME = re.compile(r"<(\d+)f>")
BOX = re.compile(r"(?:^|,)(\d+)<\|box;x1=(\d+);y1=(\d+);x2=(\d+);y2=(\d+);w=(\d+);h=(\d+)")


def boxes_by_frame(text: str) -> dict[int, list[tuple[str, float, float, float, float]]]:
    out: dict[int, list[tuple[str, float, float, float, float]]] = {}
    parts = FRAME.split(text)
    # parts: [prefix, frame, body, frame, body, ...]
    for i in range(1, len(parts) - 1, 2):
        f = int(parts[i])
        body = re.sub(r"<\|mask;[^|]*\|>", "", parts[i + 1])
        for m in BOX.finditer(body):
            oid, x1, y1, x2, y2, w, h = m.groups()
            W, H = float(w), float(h)
            out.setdefault(f, []).append((oid, int(x1) / W, int(y1) / H, int(x2) / W, int(y2) / H))
    return out


def main() -> None:
    video, sam, dst = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
    every = int(sys.argv[4]) if len(sys.argv) > 4 else 10
    cols = int(sys.argv[5]) if len(sys.argv) > 5 else 4
    boxes = boxes_by_frame(sam.read_text())
    cap = cv2.VideoCapture(str(video))
    tiles: list[np.ndarray] = []
    f = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if f % every == 0:
            H, W = frame.shape[:2]
            for oid, l, t, r, b in boxes.get(f, []):
                p1, p2 = (int(l * W), int(t * H)), (int(r * W), int(b * H))
                cv2.rectangle(frame, p1, p2, (40, 220, 120), 2)
                cv2.putText(frame, oid, (p1[0] + 3, p1[1] + 18), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 4)
                cv2.putText(frame, oid, (p1[0] + 3, p1[1] + 18), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1)
            cv2.putText(frame, f"{f / 10:.1f}s", (8, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 0), 4)
            cv2.putText(frame, f"{f / 10:.1f}s", (8, 26), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
            tiles.append(frame)
        f += 1
    cap.release()
    h, w = tiles[0].shape[:2]
    rows = (len(tiles) + cols - 1) // cols
    sheet = np.zeros((rows * h, cols * w, 3), np.uint8)
    for i, t in enumerate(tiles):
        r, c = divmod(i, cols)
        sheet[r * h:(r + 1) * h, c * w:(c + 1) * w] = t
    cv2.imwrite(str(dst), sheet, [cv2.IMWRITE_JPEG_QUALITY, 82])
    print(f"{len(tiles)} frames, {len(boxes)} frames with boxes -> {dst}")


if __name__ == "__main__":
    main()
