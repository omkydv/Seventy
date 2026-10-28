import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";
import { outlinesFromImageText, type Outline } from "./protocol";

type StoredPhoto = {
  width: number;
  height: number;
  concepts: Record<string, { raw: string }>;
};

export type PhotoSegmentation = {
  width: number;
  height: number;
  outlines: Record<string, Outline[]>;
};

/** Load SAM 3.1 output that was recorded for a photo in src/content/sam. */
export async function loadPhotoSegmentation(name: string): Promise<PhotoSegmentation> {
  const file = path.join(process.cwd(), "src", "content", "sam", `${name}.json`);
  const stored = JSON.parse(await readFile(file, "utf8")) as StoredPhoto;
  const outlines: Record<string, Outline[]> = {};
  for (const [concept, { raw }] of Object.entries(stored.concepts)) {
    outlines[concept] = await outlinesFromImageText(raw);
  }
  return { width: stored.width, height: stored.height, outlines };
}
