"""Run SAM 3.1 on a still photo for each concept and save the raw protocol text.

The web app re-parses this text with @meta-sam/parser and draws it with
@meta-sam/graphics, so what the landing page shows is the model's own output.

Usage: python tools/precompute_photo.py <photo.jpg> <out.json> dog "dog ear"
"""

from __future__ import annotations

import base64
import json
import sys
from pathlib import Path

from dotenv import load_dotenv
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
load_dotenv(ROOT / ".env.local")
sys.path.insert(0, str(ROOT / "services" / "worker"))

from seventy import sam  # noqa: E402


def main() -> None:
    photo, out, *concepts = sys.argv[1:]
    img = Image.open(photo)
    width, height = img.size
    data_url = "data:image/jpeg;base64," + base64.b64encode(Path(photo).read_bytes()).decode()
    result: dict = {"width": width, "height": height, "concepts": {}}
    for concept in concepts:
        tracks, info = sam.segment_image(data_url, concept)
        result["concepts"][concept] = {
            "raw": info["raw_text"],
            "objects": [
                {
                    "id": t.object_id,
                    "box": [round(v, 1) for v in t.detections[0].box],
                    "confidence": t.detections[0].confidence,
                }
                for t in tracks.values()
            ],
        }
        print(concept, "->", len(tracks), "objects", [o["confidence"] for o in result["concepts"][concept]["objects"]])
    Path(out).parent.mkdir(parents=True, exist_ok=True)
    Path(out).write_text(json.dumps(result))


if __name__ == "__main__":
    main()
