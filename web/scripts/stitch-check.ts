/**
 * Check chunk stitching on real SAM output: run with
 *   npx tsx scripts/stitch-check.ts <dir with c000.txt, c001.txt…> <chunkSeconds> <overlap> <fps> [out.json]
 * With out.json, writes the dogs and their sample frames for tools/read_marks.py.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { compactTracks } from "../src/lib/sam/compact";
import { pickSamples, stitchChunks, type ChunkInput } from "../src/lib/tracks";

async function main() {
  const [dir, chunkS = "10", overlapS = "2", fpsArg = "5", outJson] = process.argv.slice(2);
  const files = readdirSync(dir).filter((f) => /^c\d+\.txt$/.test(f)).sort();
  const chunkSeconds = Number(chunkS);
  const overlap = Number(overlapS);
  const fps = Number(fpsArg);
  const inputs: ChunkInput[] = [];
  let start = 0;
  for (const [i, f] of files.entries()) {
    const t = await compactTracks(readFileSync(path.join(dir, f), "utf8"));
    console.log(`${f}: ${t.width}x${t.height}, ${t.frames} frames, objects ${Object.keys(t.objects).join(", ")}`);
    inputs.push({ idx: i, startS: start, fps, ...t });
    start += chunkSeconds - overlap;
  }
  const dogs = stitchChunks(inputs);
  console.log(`\n${dogs.length} dogs after stitching`);
  if (outJson) {
    const out = dogs.map((d) => ({
      label: d.label,
      firstS: d.firstS,
      lastS: d.lastS,
      meanConf: d.meanConf,
      segments: d.segments,
      samples: pickSamples(d).map((s) => ({ t: s.t, box: s.box })),
    }));
    writeFileSync(outJson, JSON.stringify(out, null, 1));
    console.log(`wrote ${outJson}`);
  }
  for (const d of dogs) {
    const samples = pickSamples(d);
    console.log(
      `Dog ${d.label}: ${d.firstS.toFixed(1)}s to ${d.lastS.toFixed(1)}s, ${d.sightings.length} sightings, conf ${d.meanConf?.toFixed(2)}, pieces ${d.segments.map((s) => `${s.chunk}:${s.objectId}`).join(" + ")}, samples at ${samples.map((s) => s.t.toFixed(1)).join(", ")}`,
    );
  }
}

main();
