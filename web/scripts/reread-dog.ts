/**
 * Read one dog again from new close-ups, with the pipeline's own steps: SAM 3.1 finds and
 * enlarges the ears, Muse Spark reads the marks, SAM 3.1 gives its second opinion, and the
 * mark rules classify the dog. For a sample survey the images are written under public/m/.
 *
 *   npx tsx --conditions=react-server scripts/reread-dog.ts <walkId> <label> <crop.jpg> [<crop.jpg> …]
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv(file: string) {
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadEnv(path.join(__dirname, "..", ".env.local"));

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
const dataUrl = (b: Uint8Array) => `data:image/jpeg;base64,${Buffer.from(b).toString("base64")}`;

async function main() {
  const { earZoom, lookFor } = await import("../src/lib/server/ears");
  const { readMarks } = await import("../src/lib/server/marks");
  const { classify, SECOND_OPINION } = await import("../src/lib/marks");
  const { walkStats } = await import("../src/lib/stats");
  const { isSample } = await import("../src/lib/server/samples");

  const [walkId, label, ...files] = process.argv.slice(2);
  const { data: walk } = await db.from("walks").select("id, title, target_mark, mark_types").eq("id", walkId).single();
  const { data: dog } = await db.from("dogs").select("id, label, crops").eq("walk_id", walkId).eq("label", Number(label)).single();
  if (!walk || !dog) throw new Error("No such walk or dog.");

  const bytes = files.map((f) => readFileSync(f));
  const ears: Buffer[] = [];
  for (const b of bytes.slice(0, 2)) {
    const z = await earZoom(b);
    if (z.ear) ears.push(z.ear);
  }
  console.log(`SAM 3.1 enlarged ${ears.length} ear(s)`);
  const { value } = await readMarks(bytes.map(dataUrl), ears.map(dataUrl));
  const types = ((walk.mark_types as string[]) ?? []).filter((k): k is "collar" | "ear_tag" => k === "collar" || k === "ear_tag");
  const second: Record<string, { found: boolean; conf: number | null }> = {};
  for (const k of types) {
    const look = await lookFor(SECOND_OPINION[k]!, k === "ear_tag" && ears.length ? ears[0] : bytes[0]);
    second[k] = { found: look.found, conf: look.conf };
  }
  const mark = { ...value, second };
  const cls = classify(mark, walk.target_mark, walk.mark_types as string[]);
  console.log(`Muse Spark: ${JSON.stringify({ paint: value.paint, collar: value.collar, ear_tag: value.ear_tag, view: value.view_quality, conf: value.confidence })}`);
  console.log(`Reason: ${value.reason}`);
  console.log(`Second opinion: ${JSON.stringify(second)} -> ${cls.status} (${cls.kind})`);

  // Store the images where the survey reads them: Storage for any walk, public/m/ as well for a sample.
  const name = (n: string) => `${walkId}/crops/${dog.label}-${n}.jpg`;
  const crops = [
    ...bytes.map((_, i) => ({ path: name(String(i)), t: 0, sharpness: 0 })),
    ...ears.map((_, i) => ({ path: name(`ear${i}`), t: 0, kind: "ear" as const })),
  ];
  const blobs = [...bytes, ...ears];
  for (const [i, c] of crops.entries()) {
    await db.storage.from("walks").upload(c.path, blobs[i], { upsert: true, contentType: "image/jpeg" });
    if (isSample(walkId)) {
      const out = path.join(__dirname, "..", "public", "m", c.path);
      mkdirSync(path.dirname(out), { recursive: true });
      writeFileSync(out, blobs[i]);
    }
  }
  await db.from("dogs").update({ mark, mark_status: cls.status, mark_kind: cls.kind, review_status: null, crops, best_crop: crops[0], ear_crop_path: ears.length ? crops[bytes.length].path : null }).eq("id", dog.id);
  const { data: all } = await db.from("dogs").select("mark_status, review_status, same_as, mark").eq("walk_id", walkId);
  const stats = walkStats(all as never, walk.target_mark);
  await db.from("walks").update({ stats }).eq("id", walkId);
  console.log(`${walk.title} Dog ${dog.label} stored: ${cls.status}. Walk: ${stats.marked} marked, ${stats.unmarked} not marked, ${stats.unknown} can't tell.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
