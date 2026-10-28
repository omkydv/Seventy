import { frameIndexOf, recordsOfKind } from "@meta-sam/parser";
import { parseVideoText } from "./protocol";

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
