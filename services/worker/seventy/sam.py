"""SAM 3.1 client: upload media, stream segmentation, collect per-object tracks."""

from __future__ import annotations

import json
import os
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Iterator

import httpx
from meta_sam_parser import (
    CompletedOutcome,
    SegmentationBoxRecord,
    SegmentationMaskRecord,
    image_segmentation_format,
    video_segmentation_format,
)

API_BASE = os.environ.get("MODEL_API_BASE", "https://api.meta.ai/v1")


def _headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {os.environ['MODEL_API_KEY']}"}


@dataclass
class Detection:
    frame: int
    box: tuple[float, float, float, float]  # left, top, right, bottom in pixels
    confidence: float | None
    mask: SegmentationMaskRecord | None = None


@dataclass
class Track:
    object_id: str
    detections: dict[int, Detection] = field(default_factory=dict)

    @property
    def frames(self) -> list[int]:
        return sorted(self.detections)


def upload_file(path: Path) -> str:
    with path.open("rb") as fh:
        r = httpx.post(
            f"{API_BASE}/files",
            headers=_headers(),
            data={"purpose": "user_data"},
            files={"file": (path.name, fh, "video/mp4")},
            timeout=600,
        )
    r.raise_for_status()
    return r.json()["id"]


def _sse_events(response: httpx.Response) -> Iterator[dict]:
    data_lines: list[str] = []
    for line in response.iter_lines():
        if line.startswith("data:"):
            data_lines.append(line[5:].strip())
        elif line == "" and data_lines:
            payload = "\n".join(data_lines)
            data_lines = []
            if payload and payload != "[DONE]":
                yield json.loads(payload)
    if data_lines:
        payload = "\n".join(data_lines)
        if payload and payload != "[DONE]":
            yield json.loads(payload)


def _output_text(response_json: dict) -> str:
    parts = []
    for item in response_json.get("output", []):
        if item.get("type") == "message":
            for c in item.get("content", []):
                if c.get("type") in ("output_text", "text"):
                    parts.append(c.get("text", ""))
    return "".join(parts)


def _run_background(body: dict, on_progress: Callable[[int], None] | None) -> tuple[str, dict]:
    """Submit with background=true and poll. Long SSE streams get dropped on some networks."""
    r = httpx.post(f"{API_BASE}/responses", headers=_headers(), json={**body, "background": True}, timeout=120)
    if r.status_code >= 400:
        raise RuntimeError(f"SAM submit failed {r.status_code}: {r.text[:500]}")
    job = r.json()
    rid = job["id"]
    delay = 2.0
    while job.get("status") in ("queued", "in_progress"):
        time.sleep(delay)
        delay = min(delay * 1.3, 10)
        g = httpx.get(f"{API_BASE}/responses/{rid}", headers=_headers(), timeout=120)
        g.raise_for_status()
        job = g.json()
        if on_progress:
            on_progress(_output_text(job).count("\n"))
    if job.get("status") != "completed":
        raise RuntimeError(f"SAM job {rid} ended {job.get('status')}: {json.dumps(job.get('error'))[:500]}")
    return _output_text(job), job.get("usage") or {}


def _run_stream(body: dict, parser, on_progress: Callable[[int], None] | None) -> dict:
    usage: dict = {}
    lines_seen = 0
    with httpx.stream(
        "POST", f"{API_BASE}/responses", headers=_headers(), json={**body, "stream": True},
        timeout=httpx.Timeout(900, connect=30),
    ) as response:
        if response.status_code >= 400:
            response.read()
            raise RuntimeError(f"SAM request failed {response.status_code}: {response.text[:500]}")
        for event in _sse_events(response):
            kind = event.get("type", "")
            if kind == "response.output_text.delta":
                delta = event.get("delta", "")
                parser.push(delta, emit=False)
                if on_progress and "\n" in delta:
                    lines_seen += delta.count("\n")
                    on_progress(lines_seen)
            elif kind == "response.completed":
                usage = event.get("response", {}).get("usage") or {}
            elif kind in ("response.failed", "error"):
                raise RuntimeError(f"SAM stream error: {json.dumps(event)[:500]}")
    return usage


def _segment(
    content: list[dict],
    media: str,
    metadata: dict[str, str],
    on_progress: Callable[[int], None] | None,
    mode: str = "background",
) -> tuple[dict[str, Track], dict]:
    fmt = video_segmentation_format() if media == "video" else image_segmentation_format()
    parser = fmt.create_parser()
    body = {
        "model": "sam-3.1",
        "input": [{"type": "message", "role": "user", "content": content}],
        "metadata": metadata,
    }
    raw_text = ""
    if mode == "stream":
        usage = _run_stream(body, parser, on_progress)
    else:
        raw_text, usage = _run_background(body, on_progress)
        parser.push(raw_text, emit=False)
    result = parser.finish(CompletedOutcome()).result

    tracks: dict[str, Track] = {}
    for rec in result.records:
        if not isinstance(rec, (SegmentationBoxRecord, SegmentationMaskRecord)):
            continue
        frame = rec.frame.frame_index if rec.frame else 0
        track = tracks.setdefault(rec.object_id, Track(rec.object_id))
        det = track.detections.get(frame)
        if isinstance(rec, SegmentationBoxRecord):
            box = (rec.left, rec.top, rec.right, rec.bottom)
            if det is None:
                track.detections[frame] = Detection(frame, box, rec.confidence)
            else:
                det.box = box
                det.confidence = rec.confidence if rec.confidence is not None else det.confidence
        else:
            if det is None:
                b = rec.bounds
                det = Detection(frame, (b.left, b.top, b.right, b.bottom), rec.confidence)
                track.detections[frame] = det
            det.mask = rec
    return tracks, {
        "usage": usage,
        "diagnostics": [d.message for d in result.diagnostics][:20],
        "raw_text": raw_text or result.raw_output,
    }


def track_video(
    file_id: str,
    concept: str,
    on_progress: Callable[[int], None] | None = None,
) -> tuple[dict[str, Track], dict]:
    content = [
        {"type": "input_text", "text": concept},
        {"type": "input_video", "file_id": file_id},
    ]
    metadata = {"include_confidence": "true", "mask_encoding": "one_bit"}
    return _segment(content, "video", metadata, on_progress)


def segment_image(image_url: str, concept: str) -> tuple[dict[str, Track], dict]:
    content = [
        {"type": "input_text", "text": concept},
        {"type": "input_image", "image_url": image_url},
    ]
    return _segment(content, "image", {"include_confidence": "true"}, None)
