"""Cut full-resolution close-ups of each stitched dog and read its marks with Muse Spark.

Mirrors what the web app does in the browser and on the server, for offline
checks and evaluation.

Usage: python tools/read_marks.py <original_walk.mp4> <dogs.json> <out_dir> [vaccination|sterilization] [paint,collar]
"""

from __future__ import annotations

import base64
import json
import os
import sys
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import cv2
import httpx
import numpy as np
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[3]
load_dotenv(ROOT / ".env.local")
sys.path.insert(0, str(ROOT / "services" / "worker"))
sys.path.insert(0, str(ROOT / "services" / "worker" / "tools"))

from annotate_frames import BOX  # noqa: E402
from seventy import sam  # noqa: E402

API = os.environ.get("MODEL_API_BASE", "https://api.meta.ai/v1")
KEY = os.environ["MODEL_API_KEY"]

TRI = {"type": "string", "enum": ["present", "absent", "not_visible"]}
SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["is_dog", "paint", "collar", "ear_notch", "ear_tag", "life_stage", "lead", "coat", "view_quality", "confidence", "reason"],
    "properties": {
        "is_dog": {"type": "boolean"},
        "paint": {"type": "object", "additionalProperties": False, "required": ["status", "color", "location"],
                  "properties": {"status": TRI, "color": {"type": ["string", "null"]}, "location": {"type": ["string", "null"]}}},
        "collar": {"type": "object", "additionalProperties": False, "required": ["status", "color"],
                   "properties": {"status": TRI, "color": {"type": ["string", "null"]}}},
        "ear_notch": {"type": "object", "additionalProperties": False, "required": ["status", "side"],
                      "properties": {"status": TRI, "side": {"type": ["string", "null"], "enum": ["left", "right", "both", "unknown", None]}}},
        "ear_tag": {"type": "object", "additionalProperties": False, "required": ["status", "color"],
                    "properties": {"status": TRI, "color": {"type": ["string", "null"]}}},
        "life_stage": {"type": "string", "enum": ["adult", "puppy", "unknown"]},
        "lead": {"type": "object", "additionalProperties": False, "required": ["status"], "properties": {"status": TRI}},
        "coat": {"type": "string"},
        "view_quality": {"type": "string", "enum": ["good", "fair", "poor"]},
        "confidence": {"type": "number"},
        "reason": {"type": "string"},
    },
}
INSTRUCTIONS = " ".join([
    "You read field marks on free-roaming dogs for a rabies vaccination survey.",
    "Vaccinated dogs are marked for a few days with livestock paint or crayon (a coloured patch, usually on the head or back) or with a temporary collar or band.",
    "Sterilized dogs carry a permanent V-shaped notch or a clipped tip on one ear.",
    "Some city programmes clip a small plastic tag (often yellow, blue or white) into one ear of every dog they vaccinate. ear_tag is present only if you can see the tag; if one ear is hidden and the visible ear has no tag, use not_visible.",
    "life_stage: puppy for a dog clearly under about six months (small, round head, oversized paws); otherwise adult; unknown if you cannot judge.",
    "lead: present if the dog is on a lead or held by a person, which means it has an owner.",
    "Report only what you can see. If the body part that would carry a mark is not visible clearly enough to judge, use not_visible. Never guess.",
    "Natural coat patches are not paint: white, cream, tan, brown, grey and black patches are almost always the coat itself. Call paint present only for a colour no dog coat has (pink, purple, blue, green, bright red or orange) or a patch with hard painted edges in a colour the rest of the coat lacks.",
    "Ear sides are from the dog's own point of view.",
    "All images are crops of the same dog from one walk; some may be close-ups of an ear. Combine them.",
    "coat: one short phrase a surveyor could use to recognise this dog again (colour, markings, build).",
    "confidence: 0 to 1, your confidence in the overall reading. reason: one plain sentence a surveyor would write.",
])


def sharpness(img: np.ndarray) -> float:
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    scale = 160 / max(g.shape)
    g = cv2.resize(g, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    return float(cv2.Laplacian(g, cv2.CV_64F).var())


def crop_at(cap: cv2.VideoCapture, t: float, box: list[float]) -> np.ndarray | None:
    cap.set(cv2.CAP_PROP_POS_MSEC, t * 1000)
    ok, frame = cap.read()
    if not ok:
        return None
    H, W = frame.shape[:2]
    l, tp, r, b = box
    bw, bh = (r - l) * W, (b - tp) * H
    pad = 0.14
    x0, y0 = max(0, int(l * W - bw * pad)), max(0, int(tp * H - bh * pad))
    x1, y1 = min(W, int(r * W + bw * pad)), min(H, int(b * H + bh * pad))
    if x1 - x0 < 24 or y1 - y0 < 24:
        return None
    c = frame[y0:y1, x0:x1]
    s = min(1.0, 1024 / max(c.shape[:2]))
    return cv2.resize(c, None, fx=s, fy=s, interpolation=cv2.INTER_AREA) if s < 1 else c


def to_data_url(img: np.ndarray) -> str:
    ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 88])
    return "data:image/jpeg;base64," + base64.b64encode(buf.tobytes()).decode()


def ear_zooms(crop: np.ndarray, limit: int = 2) -> tuple[list[np.ndarray], int]:
    """SAM 3.1 finds the ears on a close-up; return them enlarged, so a small tag or notch is readable."""
    try:
        _, info = sam.segment_image(to_data_url(crop), "dog ear")
    except Exception as e:  # an ear zoom is a bonus; the reading goes on without it
        print("ear zoom failed:", e)
        return [], 1
    found = []
    for m in BOX.finditer(info["raw_text"]):
        _, x1, y1, x2, y2, w, h = m.groups()
        W, H = float(w), float(h)
        conf = float(m.group(0).split("c=")[-1]) if "c=" in m.group(0) else 0.5
        found.append((conf, int(x1) / W, int(y1) / H, int(x2) / W, int(y2) / H))
    found.sort(reverse=True)
    out = []
    ch, cw = crop.shape[:2]
    for _, l, t, r, b in found[:limit]:
        pw, ph = (r - l) * 0.5, (b - t) * 0.5
        x0, y0 = max(0, int((l - pw) * cw)), max(0, int((t - ph) * ch))
        x1, y1 = min(cw, int((r + pw) * cw)), min(ch, int((b + ph) * ch))
        if x1 - x0 < 8 or y1 - y0 < 8:
            continue
        ear = crop[y0:y1, x0:x1]
        scale = max(1.0, 320 / min(ear.shape[:2]))
        out.append(cv2.resize(ear, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC))
    return out, 1


def read(images: list[np.ndarray], ears: list[np.ndarray] | None = None) -> tuple[dict, dict, float]:
    ears = ears or []
    prompt = "Read the marks on this dog."
    if ears:
        prompt += f" The last {len(ears)} images are enlarged close-ups of its ears, found by SAM 3.1; look there for a tag or a notch."
    body = {
        "model": "muse-spark-1.3",
        "instructions": INSTRUCTIONS,
        "input": [{"role": "user", "content": [{"type": "input_text", "text": prompt}]
                   + [{"type": "input_image", "image_url": to_data_url(i)} for i in images + ears]}],
        "reasoning": {"effort": "low"},
        "text": {"format": {"type": "json_schema", "name": "dog_marks", "schema": SCHEMA, "strict": True}},
    }
    t0 = time.time()
    r = httpx.post(f"{API}/responses", headers={"Authorization": f"Bearer {KEY}"}, json=body, timeout=180)
    r.raise_for_status()
    j = r.json()
    text = "".join(c.get("text", "") for o in j.get("output", []) if o.get("type") == "message" for c in o.get("content", []))
    return json.loads(text), j.get("usage") or {}, time.time() - t0


FIELD = {"paint": "paint", "collar": "collar", "ear_tag": "ear_tag"}


def clear_view(m: dict) -> bool:
    """Same rule as clearView in web/src/lib/marks.ts: only a poor view or a reading below 0.5 is too unsure to call."""
    return m["view_quality"] != "poor" and not (isinstance(m.get("confidence"), (int, float)) and m["confidence"] < 0.5)


def classify(m: dict, target: str, kinds: list[str]) -> str:
    """Same rules as web/src/lib/marks.ts."""
    if not m["is_dog"]:
        return "unknown"
    if target == "sterilization":
        return "marked" if m["ear_notch"]["status"] == "present" else "unmarked" if clear_view(m) else "unknown"
    used = [FIELD[k] for k in kinds if k in FIELD]
    if any(m[f]["status"] == "present" for f in used):
        return "marked"
    return "unmarked" if clear_view(m) else "unknown"


def main() -> None:
    video, dogs_json, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
    target = sys.argv[4] if len(sys.argv) > 4 else "vaccination"
    kinds = sys.argv[5].split(",") if len(sys.argv) > 5 else ["paint"]
    out.mkdir(parents=True, exist_ok=True)
    dogs = json.loads(dogs_json.read_text())
    cap = cv2.VideoCapture(str(video))
    per_dog: dict[int, list[np.ndarray]] = {}
    for d in dogs:
        crops = [c for c in (crop_at(cap, s["t"], s["box"]) for s in d["samples"]) if c is not None]
        crops.sort(key=lambda c: sharpness(c) * (c.shape[0] * c.shape[1]) ** 0.5, reverse=True)
        per_dog[d["label"]] = crops[:3]
        for i, c in enumerate(crops[:3]):
            cv2.imwrite(str(out / f"dog{d['label']:02d}_{i}.jpg"), c)
    cap.release()

    def work(d: dict) -> dict:
        imgs = per_dog.get(d["label"], [])
        if not imgs:
            return {"label": d["label"], "status": "unknown", "mark": None}
        ears: list[np.ndarray] = []
        sam_calls = 0
        for c in imgs[:2]:
            found, calls = ear_zooms(c, limit=1)
            ears += found
            sam_calls += calls
        for i, e in enumerate(ears):
            cv2.imwrite(str(out / f"dog{d['label']:02d}_ear{i}.jpg"), e)
        mark, usage, secs = read(imgs, ears)
        return {"label": d["label"], "status": classify(mark, target, kinds), "mark": mark, "seconds": round(secs, 1),
                "usage": usage, "ears": len(ears), "sam_image_calls": sam_calls}

    with ThreadPoolExecutor(max_workers=6) as pool:
        results = list(pool.map(work, dogs))
    (out / "marks.json").write_text(json.dumps(results, indent=1))
    counts: dict[str, int] = {}
    for r in results:
        counts[r["status"]] = counts.get(r["status"], 0) + 1
        m = r["mark"] or {}
        print(f"Dog {r['label']:02d}: {r['status']:8s} | {m.get('reason', '')}")
    print("totals:", counts)


if __name__ == "__main__":
    main()
