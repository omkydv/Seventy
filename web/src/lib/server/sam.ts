import "server-only";

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
  // A link Meta's servers can't reach (local mode runs on this machine): send the bytes instead.
  if (!/^https:\/\//.test(opts.videoUrl)) {
    const fileId = await uploadFile(await opts.loadBytes(), opts.filename, "video/mp4");
    return { responseId: (await createResponse(videoRequest(opts.concept, { file_id: fileId }))).id, via: "file" };
  }
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

/** Segment one still image and return SAM's output text. Images are quick, so this waits for the answer. */
export async function segmentImage(concept: string, imageUrl: string): Promise<string> {
  let job = await createResponse({
    model: SAM_MODEL,
    input: [{ type: "message", role: "user", content: [{ type: "input_text", text: concept }, { type: "input_image", image_url: imageUrl }] }],
    metadata: { include_confidence: "true" },
  });
  for (let i = 0; i < 30 && (job.status === "queued" || job.status === "in_progress"); i++) {
    await new Promise((r) => setTimeout(r, 1000));
    job = await getResponse(job.id);
  }
  if (job.status !== "completed") throw new Error(job.error?.message ?? `SAM ended ${job.status} on a close-up`);
  return outputText(job);
}

export { compactTracks, type ChunkTracks } from "@/lib/sam/compact";
