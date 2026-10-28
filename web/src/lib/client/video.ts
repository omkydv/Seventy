"use client";

import {
  ALL_FORMATS,
  BlobSource,
  BufferTarget,
  CanvasSink,
  Conversion,
  Input,
  Mp4OutputFormat,
  Output,
} from "mediabunny";

export type Probe = {
  durationS: number;
  width: number;
  height: number;
  fps: number | null;
  canDecode: boolean;
  recordedAt: string | null;
};

/** Read what we need from a phone video without decoding it. */
export async function probeVideo(file: File): Promise<Probe> {
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new Error("That file has no video track.");
    const [durationS, stats, canDecode, tags] = await Promise.all([
      input.computeDuration(),
      track.computePacketStats(150).catch(() => null),
      track.canDecode(),
      input.getMetadataTags().catch(() => ({}) as Record<string, unknown>),
    ]);
    const date = (tags as { date?: Date }).date;
    return {
      durationS,
      width: track.displayWidth,
      height: track.displayHeight,
      fps: stats?.averagePacketRate ? Math.round(stats.averagePacketRate * 100) / 100 : null,
      canDecode,
      recordedAt: date instanceof Date && !Number.isNaN(date.getTime()) ? date.toISOString() : null,
    };
  } finally {
    input.dispose();
  }
}

/** Output size for tracking: long side 960, even dimensions, same aspect as the source. */
export function trackingSize(width: number, height: number, longSide = 960) {
  const scale = Math.min(1, longSide / Math.max(width, height));
  const even = (n: number) => Math.max(2, Math.round((n * scale) / 2) * 2);
  return { width: even(width), height: even(height) };
}

/**
 * Re-encode one stretch of the walk for SAM: smaller, 5 frames a second,
 * rotation baked in, no audio. A minute of 1080p phone video comes out
 * around 5 to 9 MB, small enough for a village mobile connection.
 */
export async function convertChunk(
  file: File,
  start: number,
  end: number,
  opts: { width: number; height: number; fps: number; onProgress?: (p: number) => void },
): Promise<Blob> {
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target: new BufferTarget() });
  try {
    const conversion = await Conversion.init({
      input,
      output,
      trim: { start, end },
      video: {
        width: opts.width,
        height: opts.height,
        fit: "fill",
        frameRate: opts.fps,
        codec: "avc",
        bitrate: 1_200_000,
        keyFrameInterval: 2,
        forceTranscode: true,
        allowTransformationMetadata: false,
      },
      audio: { discard: true },
      tags: {},
      showWarnings: false,
    });
    if (!conversion.isValid) {
      throw new Error("This browser can’t re-encode that video. Try Chrome or Edge, or export the walk as MP4 (H.264).");
    }
    if (opts.onProgress) conversion.onProgress = opts.onProgress;
    await conversion.execute();
    const buffer = (output.target as BufferTarget).buffer;
    if (!buffer) throw new Error("Re-encoding produced no output.");
    return new Blob([buffer], { type: "video/mp4" });
  } finally {
    input.dispose();
  }
}

export type CropRequest = { dogId: string; t: number; box: [number, number, number, number] };
export type CropResult = { dogId: string; t: number; blob: Blob; sharpness: number; area: number };

/** Variance of the Laplacian on a small grey copy: higher means sharper. */
function sharpness(canvas: HTMLCanvasElement | OffscreenCanvas): number {
  const size = 160;
  const w = Math.max(8, Math.round((canvas.width / Math.max(canvas.width, canvas.height)) * size));
  const h = Math.max(8, Math.round((canvas.height / Math.max(canvas.width, canvas.height)) * size));
  const small = new OffscreenCanvas(w, h);
  const ctx = small.getContext("2d")!;
  ctx.drawImage(canvas as CanvasImageSource, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  const g = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) g[i] = 0.299 * data[i * 4] + 0.587 * data[i * 4 + 1] + 0.114 * data[i * 4 + 2];
  let sum = 0;
  let sum2 = 0;
  let n = 0;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const l = 4 * g[i] - g[i - 1] - g[i + 1] - g[i - w] - g[i + w];
      sum += l;
      sum2 += l * l;
      n++;
    }
  }
  const mean = sum / n;
  return sum2 / n - mean * mean;
}

/**
 * Pull full-resolution frames from the original file at each sample time and
 * crop the dog out of each, with some room around it so ears aren't clipped.
 */
export async function extractCrops(
  file: File,
  requests: CropRequest[],
  onProgress?: (done: number, total: number) => void,
): Promise<CropResult[]> {
  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new Error("That file has no video track.");
    const sink = new CanvasSink(track, { poolSize: 2 });
    const ordered = [...requests].sort((a, b) => a.t - b.t);
    const results: CropResult[] = [];
    let i = 0;
    for await (const wrapped of sink.canvasesAtTimestamps(ordered.map((r) => r.t))) {
      const req = ordered[i++];
      onProgress?.(i, ordered.length);
      if (!wrapped) continue;
      const frame = wrapped.canvas;
      const W = frame.width;
      const H = frame.height;
      const [l, t, r, b] = req.box;
      const bw = (r - l) * W;
      const bh = (b - t) * H;
      const pad = 0.14;
      const x0 = Math.max(0, Math.floor(l * W - bw * pad));
      const y0 = Math.max(0, Math.floor(t * H - bh * pad));
      const x1 = Math.min(W, Math.ceil(r * W + bw * pad));
      const y1 = Math.min(H, Math.ceil(b * H + bh * pad));
      const cw = x1 - x0;
      const ch = y1 - y0;
      if (cw < 24 || ch < 24) continue;
      const scale = Math.min(1, 1024 / Math.max(cw, ch));
      const out = new OffscreenCanvas(Math.round(cw * scale), Math.round(ch * scale));
      const octx = out.getContext("2d")!;
      octx.imageSmoothingQuality = "high";
      octx.drawImage(frame as CanvasImageSource, x0, y0, cw, ch, 0, 0, out.width, out.height);
      const blob = await out.convertToBlob({ type: "image/jpeg", quality: 0.88 });
      results.push({ dogId: req.dogId, t: req.t, blob, sharpness: sharpness(out), area: (r - l) * (b - t) });
    }
    return results;
  } finally {
    input.dispose();
  }
}

/** Keep the best `per` crops for each dog: sharp and large. */
export function bestCrops(crops: CropResult[], per = 3): CropResult[] {
  const byDog = new Map<string, CropResult[]>();
  for (const c of crops) byDog.set(c.dogId, [...(byDog.get(c.dogId) ?? []), c]);
  const out: CropResult[] = [];
  for (const list of byDog.values()) {
    const maxSharp = Math.max(...list.map((c) => c.sharpness), 1);
    const maxArea = Math.max(...list.map((c) => c.area), 1e-6);
    list.sort((a, b) => b.sharpness / maxSharp + b.area / maxArea - (a.sharpness / maxSharp + a.area / maxArea));
    out.push(...list.slice(0, per));
  }
  return out;
}
