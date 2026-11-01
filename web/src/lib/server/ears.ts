import "server-only";

import sharp from "sharp";
import { samImageCost, segmentImage } from "./sam";

const BOX = /(?:^|,|f>)(\d+)<\|box;x1=(\d+);y1=(\d+);x2=(\d+);y2=(\d+);w=(\d+);h=(\d+)(?:;c=([\d.]+))?/g;

/**
 * SAM 3.1 finds the dog's ears on a close-up; return the clearest one enlarged,
 * so a small tag or notch is big enough to read. An ear zoom is a bonus: when
 * SAM finds no ear, the reading goes on without it.
 */
export async function earZoom(jpeg: Uint8Array): Promise<{ ear: Buffer | null; cost: number; ms: number }> {
  const started = Date.now();
  const text = await segmentImage("dog ear", `data:image/jpeg;base64,${Buffer.from(jpeg).toString("base64")}`);
  const boxes = [...text.matchAll(BOX)].map((m) => {
    const [w, h] = [Number(m[6]), Number(m[7])];
    return { conf: m[8] ? Number(m[8]) : 0.5, l: Number(m[2]) / w, t: Number(m[3]) / h, r: Number(m[4]) / w, b: Number(m[5]) / h };
  });
  boxes.sort((a, b) => b.conf - a.conf);
  const best = boxes[0];
  const cost = samImageCost(1);
  if (!best) return { ear: null, cost, ms: Date.now() - started };
  const img = sharp(jpeg);
  const { width = 0, height = 0 } = await img.metadata();
  const padX = (best.r - best.l) * 0.5;
  const padY = (best.b - best.t) * 0.5;
  const left = Math.max(0, Math.floor((best.l - padX) * width));
  const top = Math.max(0, Math.floor((best.t - padY) * height));
  const right = Math.min(width, Math.ceil((best.r + padX) * width));
  const bottom = Math.min(height, Math.ceil((best.b + padY) * height));
  if (right - left < 8 || bottom - top < 8) return { ear: null, cost, ms: Date.now() - started };
  const scale = Math.max(1, 320 / Math.min(right - left, bottom - top));
  const ear = await img
    .extract({ left, top, width: right - left, height: bottom - top })
    .resize({ width: Math.round((right - left) * scale), kernel: "lanczos3" })
    .jpeg({ quality: 88 })
    .toBuffer();
  return { ear, cost, ms: Date.now() - started };
}

/** SAM 3.1 looks for a mark itself (a collar, an ear tag): the second opinion on Muse Spark's reading. */
export async function lookFor(concept: string, jpeg: Uint8Array): Promise<{ found: boolean; conf: number | null; cost: number; ms: number }> {
  const started = Date.now();
  const text = await segmentImage(concept, `data:image/jpeg;base64,${Buffer.from(jpeg).toString("base64")}`);
  const confs = [...text.matchAll(BOX)].map((m) => (m[8] ? Number(m[8]) : 0.5));
  const best = confs.length ? Math.max(...confs) : null;
  return { found: best != null && best >= 0.35, conf: best, cost: samImageCost(1), ms: Date.now() - started };
}
