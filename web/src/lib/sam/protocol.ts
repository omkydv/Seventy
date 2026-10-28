import {
  decodeMaskToSVGPath,
  parseImageStream,
  parseVideoStream,
  recordsOfKind,
  type ImageSegmentationResult,
  type ResponsesEvent,
  type VideoSegmentationResult,
} from "@meta-sam/parser";

/** Wrap complete SAM output text as the Responses events the parser expects. */
async function* asEvents(text: string): AsyncIterable<ResponsesEvent> {
  const lane = { item_id: "output", output_index: 0, content_index: 0 };
  yield { type: "response.output_text.delta", ...lane, delta: text } as ResponsesEvent;
  yield { type: "response.output_text.done", ...lane, text } as ResponsesEvent;
  yield { type: "response.completed" } as ResponsesEvent;
}

export async function parseImageText(text: string): Promise<ImageSegmentationResult> {
  return parseImageStream(asEvents(text)).finalResult;
}

export async function parseVideoText(text: string): Promise<VideoSegmentationResult> {
  return parseVideoStream(asEvents(text)).finalResult;
}

export type Box = { left: number; top: number; right: number; bottom: number };

export type Outline = {
  id: string;
  confidence: number | null;
  box: Box;
  /** SVG path in the mask raster's own pixel space. */
  path: string;
  /** Raster size, so the path can be scaled into `box`. */
  rasterWidth: number;
  rasterHeight: number;
  /** Topmost point of the mask in image pixels, where a label reads naturally. */
  anchor: { x: number; y: number };
};

function topmost(path: string): Pt | null {
  let best: Pt | null = null;
  for (const ring of ringsOf(path)) {
    for (const p of ring) if (!best || p[1] < best[1]) best = p;
  }
  return best;
}

type Pt = [number, number];

/** Split an M/L/Z path from decodeMaskToSVGPath into closed rings. */
function ringsOf(path: string): Pt[][] {
  const rings: Pt[][] = [];
  let current: Pt[] = [];
  const re = /([MLZ])\s*(-?[\d.]+)?\s*(-?[\d.]+)?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(path))) {
    if (m[1] === "M") {
      if (current.length) rings.push(current);
      current = [[Number(m[2]), Number(m[3])]];
    } else if (m[1] === "L") {
      current.push([Number(m[2]), Number(m[3])]);
    } else if (current.length) {
      rings.push(current);
      current = [];
    }
  }
  if (current.length) rings.push(current);
  return rings;
}

function perpendicular(p: Pt, a: Pt, b: Pt): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  return Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / len;
}

/** Ramer–Douglas–Peucker, iterative so long contours don't blow the stack. */
function simplify(points: Pt[], epsilon: number): Pt[] {
  if (points.length < 4) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [s, e] = stack.pop()!;
    let maxD = 0;
    let idx = -1;
    for (let i = s + 1; i < e; i++) {
      const d = perpendicular(points[i], points[s], points[e]);
      if (d > maxD) {
        maxD = d;
        idx = i;
      }
    }
    if (idx !== -1 && maxD > epsilon) {
      keep[idx] = 1;
      stack.push([s, idx], [idx, e]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

/** One round of Chaikin corner cutting on a closed ring. */
function chaikin(points: Pt[]): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    out.push([0.75 * a[0] + 0.25 * b[0], 0.75 * a[1] + 0.25 * b[1]]);
    out.push([0.25 * a[0] + 0.75 * b[0], 0.25 * a[1] + 0.75 * b[1]]);
  }
  return out;
}

function ringArea(r: Pt[]): number {
  let a = 0;
  for (let i = 0; i < r.length; i++) {
    const [x1, y1] = r[i];
    const [x2, y2] = r[(i + 1) % r.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a / 2);
}

/** Turn the pixel-stepped mask contour into a clean, smooth outline. */
export function smoothMaskPath(path: string, rasterW: number, rasterH: number): string {
  const scale = Math.max(rasterW, rasterH);
  const epsilon = Math.max(0.8, scale / 600);
  const minArea = (scale * scale) / 4000;
  return ringsOf(path)
    .filter((r) => r.length > 2 && ringArea(r) >= minArea)
    .map((r) => {
      const s = chaikin(simplify(r, epsilon));
      return "M" + s.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join("L") + "Z";
    })
    .join("");
}

/** One outline per object for a still image, ready to draw as SVG over the photo. */
export async function outlinesFromImageText(text: string): Promise<Outline[]> {
  const result = await parseImageText(text);
  const boxes = new Map(recordsOfKind(result.records, "box").map((b) => [b.objectId, b]));
  return recordsOfKind(result.records, "mask").map((m) => {
    const b = boxes.get(m.objectId);
    const path = smoothMaskPath(decodeMaskToSVGPath(m.mask), m.mask.width, m.mask.height);
    const sx = (m.bounds.right - m.bounds.left) / m.mask.width;
    const sy = (m.bounds.bottom - m.bounds.top) / m.mask.height;
    const top = topmost(path);
    return {
      id: m.objectId,
      confidence: m.confidence ?? b?.confidence ?? null,
      box: { left: m.bounds.left, top: m.bounds.top, right: m.bounds.right, bottom: m.bounds.bottom },
      path,
      rasterWidth: m.mask.width,
      rasterHeight: m.mask.height,
      anchor: top
        ? { x: m.bounds.left + top[0] * sx, y: m.bounds.top + top[1] * sy }
        : { x: m.bounds.left, y: m.bounds.top },
    };
  });
}
