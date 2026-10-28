import "server-only";

import { frameIndexOf, recordsOfKind } from "@meta-sam/parser";
import { parseVideoText } from "@/lib/sam/protocol";
import { createResponse, getResponse, MetaApiError, outputText, uploadFile } from "./meta";

export const SAM_MODEL = "sam-3.1";
/** $0.20 per 1,000 video frames, at least 50 frames a request. */
export const samVideoCost = (frames: number) => (Math.max(50, frames) / 1000) * 0.2;
/** $2.50 per 1,000 images. */
export const samImageCost = (images: number) => (images / 1000) * 2.5;

const videoRequest = (concept: string, video: Record<string, string>) => ({
  model: SAM_MODEL,
  background: true,
  input: [
    {
      type: "message",
      role: "user",
      content: [{ type: "input_text", text: concept }, { type: "input_video", ...video }],
    },
  ],
  metadata: { include_confidence: "true", mask_encoding: "one_bit" },
});

/**
 * Start tracking `concept` through a video in background mode. Prefers a
 * signed URL; if the API won't fetch it, uploads the bytes to the Files API.
 */
export async function submitVideoJob(opts: {
  concept: string;
  videoUrl: string;
  loadBytes: () => Promise<Uint8Array>;
  filename: string;
}): Promise<{ responseId: string; via: "url" | "file" }> {
  try {
    const job = await createResponse(videoRequest(opts.concept, { video_url: opts.videoUrl }));
    return { responseId: job.id, via: "url" };
  } catch (e) {
    if (!(e instanceof MetaApiError) || e.status >= 500) throw e;
    const fileId = await uploadFile(await opts.loadBytes(), opts.filename, "video/mp4");
    const job = await createResponse(videoRequest(opts.concept, { file_id: fileId }));
    return { responseId: job.id, via: "file" };
  }
}

export type JobState =
  | { state: "running" }
  | { state: "done"; text: string }
  | { state: "failed"; message: string };

export async function checkJob(responseId: string): Promise<JobState> {
  const job = await getResponse(responseId);
  if (job.status === "queued" || job.status === "in_progress") return { state: "running" };
  if (job.status === "completed") return { state: "done", text: outputText(job) };
  return {
    state: "failed",
    message: job.error?.message ?? job.incomplete_details?.reason ?? `ended ${job.status}`,
  };
}

/** Boxes and confidences per object for one chunk; masks stay in the raw text for playback. */
export type ChunkTracks = {
  width: number;
  height: number;
  frames: number;
  objects: Record<string, { f: number[]; b: [number, number, number, number][]; c: (number | null)[] }>;
};

export async function compactTracks(raw: string): Promise<ChunkTracks> {
  const sizeMatch = raw.match(/;w=(\d+);h=(\d+)/);
  const width = sizeMatch ? Number(sizeMatch[1]) : 0;
  const height = sizeMatch ? Number(sizeMatch[2]) : 0;
  const result = await parseVideoText(raw);
  const objects: ChunkTracks["objects"] = {};
  let maxFrame = -1;
  for (const box of recordsOfKind(result.records, "box")) {
    const f = frameIndexOf(box);
    if (f === undefined) continue;
    maxFrame = Math.max(maxFrame, f);
    const o = (objects[box.objectId] ??= { f: [], b: [], c: [] });
    o.f.push(f);
    o.b.push([box.left, box.top, box.right, box.bottom]);
    o.c.push(box.confidence ?? null);
  }
  // Frames can arrive out of order (forward then backward); keep each track sorted.
  for (const o of Object.values(objects)) {
    const order = o.f.map((_, i) => i).sort((a, z) => o.f[a] - o.f[z]);
    o.f = order.map((i) => o.f[i]);
    o.b = order.map((i) => o.b[i]);
    o.c = order.map((i) => o.c[i]);
  }
  return { width, height, frames: maxFrame + 1, objects };
}
