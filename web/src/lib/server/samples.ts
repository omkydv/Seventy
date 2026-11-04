import samples from "@/content/samples.json";

/** The sample surveys on the landing page. Their media is served from public/m/ (scripts/export-samples.ts). */
export const SAMPLE_WALKS: ReadonlySet<string> = new Set([...samples.samples.map((s) => s.walk), samples.filmWalk]);

export const isSample = (walkId: string) => SAMPLE_WALKS.has(walkId);
