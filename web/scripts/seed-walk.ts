/**
 * Load a walk that was processed offline (tools/gate_test.sh) into the
 * database as a sample survey, with its real SAM output, close-ups and readings.
 *
 *   npx tsx scripts/seed-walk.ts <gate_dir> --title "Village lane" --mode check --target vaccination --marks paint,collar --country "Not given"
 *
 * <gate_dir> holds pieces/ (c000.mp4…, pieces.json), sam/ (c000.txt…), dogs.json and marks/ (marks.json, dogNN_i.jpg).
 */
import { randomBytes, createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { classify } from "../src/lib/marks";
import { compactTracks } from "../src/lib/sam/compact";
import { coverage } from "../src/lib/stats";

function loadEnv(file: string) {
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadEnv(path.join(__dirname, "..", ".env.local"));

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });

function arg(name: string, fallback?: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
}

async function demoWorkspace(): Promise<string> {
  const { data } = await db.from("workspaces").select("id").eq("is_demo", true).limit(1).maybeSingle();
  if (data) return data.id;
  const token = randomBytes(24).toString("base64url");
  const { data: ws, error } = await db
    .from("workspaces")
    .insert({ token_hash: createHash("sha256").update(token).digest("hex"), name: "Sample surveys", is_demo: true })
    .select("id")
    .single();
  if (error || !ws) throw error;
  // Keep the token locally so sample surveys can be managed from a browser later.
  writeFileSync(path.join(__dirname, "..", ".demo-workspace.json"), JSON.stringify({ id: ws.id, token }, null, 1));
  return ws.id;
}

async function put(p: string, body: Buffer | string, contentType: string) {
  const { error } = await db.storage.from("walks").upload(p, typeof body === "string" ? new Blob([body], { type: contentType }) : new Blob([new Uint8Array(body)], { type: contentType }), { upsert: true, contentType });
  if (error) throw new Error(`upload ${p}: ${error.message}`);
}

type OfflineDog = { label: number; firstS: number; lastS: number; meanConf: number | null; segments: { chunk: number; objectId: string }[]; samples: { t: number; box: number[] }[] };
type OfflineMark = { label: number; status: string; mark: Record<string, unknown> | null; seconds?: number };

async function main() {
  const dir = process.argv[2];
  const title = arg("title", "Sample walk")!;
  const mode = (arg("mode", "check") as "plan" | "check")!;
  const target = (arg("target", "vaccination") as "vaccination" | "sterilization")!;
  const markTypes = arg("marks", "paint")!.split(",");
  const country = arg("country", "Not given")!;

  const pieces = JSON.parse(readFileSync(path.join(dir, "pieces", "pieces.json"), "utf8")) as { duration: number; fps: number; piece: number; overlap: number; pieces: [number, number][] };
  const dogs = JSON.parse(readFileSync(path.join(dir, "dogs.json"), "utf8")) as OfflineDog[];
  const marks = JSON.parse(readFileSync(path.join(dir, "marks", "marks.json"), "utf8")) as OfflineMark[];
  const firstSam = readFileSync(path.join(dir, "sam", "c000.txt"), "utf8");
  const size = firstSam.match(/;w=(\d+);h=(\d+)/);

  const workspaceId = await demoWorkspace();
  const { data: walk, error } = await db
    .from("walks")
    .insert({
      workspace_id: workspaceId,
      mode,
      title,
      area_name: title,
      target_mark: target,
      mark_types: markTypes,
      country,
      duration_s: pieces.duration,
      src_width: size ? Number(size[1]) : null,
      src_height: size ? Number(size[2]) : null,
      proc_fps: pieces.fps,
      chunk_seconds: pieces.piece,
      overlap_seconds: pieces.overlap,
      status: "stitching",
    })
    .select("id")
    .single();
  if (error || !walk) throw error;
  const walkId = walk.id as string;
  console.log("walk", walkId);

  for (const [idx, [start, end]] of pieces.pieces.entries()) {
    const pad = String(idx).padStart(3, "0");
    const raw = readFileSync(path.join(dir, "sam", `c${pad}.txt`), "utf8");
    const tracks = await compactTracks(raw);
    await put(`${walkId}/chunks/${pad}.mp4`, readFileSync(path.join(dir, "pieces", `c${pad}.mp4`)), "video/mp4");
    await put(`${walkId}/sam/${pad}.txt`, raw, "text/plain");
    await put(`${walkId}/sam/${pad}.json`, JSON.stringify(tracks), "application/json");
    await db.from("chunks").insert({
      walk_id: walkId,
      idx,
      start_s: start,
      end_s: end,
      storage_path: `${walkId}/chunks/${pad}.mp4`,
      tracks_path: `${walkId}/sam/${pad}.json`,
      status: "done",
      frames: tracks.frames,
      objects: Object.keys(tracks.objects).length,
      submitted_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    });
  }

  const markByLabel = new Map(marks.map((m) => [m.label, m]));
  let marked = 0;
  let unmarked = 0;
  let unknown = 0;
  for (const d of dogs) {
    const crops: { path: string; t: number }[] = [];
    for (let i = 0; i < 3; i++) {
      const f = path.join(dir, "marks", `dog${String(d.label).padStart(2, "0")}_${i}.jpg`);
      if (!existsSync(f)) continue;
      const p = `${walkId}/crops/${d.label}-${i}.jpg`;
      await put(p, readFileSync(f), "image/jpeg");
      crops.push({ path: p, t: d.samples[i]?.t ?? d.firstS });
    }
    const m = markByLabel.get(d.label)?.mark ?? null;
    const cls = m ? classify(m as never, target, markTypes) : { status: "unknown" as const, kind: "unknown" as const };
    if (cls.status === "marked") marked++;
    else if (cls.status === "unmarked") unmarked++;
    else unknown++;
    await db.from("dogs").insert({
      walk_id: walkId,
      label: d.label,
      first_s: d.firstS,
      last_s: d.lastS,
      frames: d.samples.length,
      mean_conf: d.meanConf,
      segments: d.segments,
      samples: d.samples,
      crops,
      best_crop: crops[0] ?? null,
      mark: m,
      mark_status: cls.status,
      mark_kind: cls.kind,
      reading_ms: Math.round((markByLabel.get(d.label)?.seconds ?? 0) * 1000),
    });
  }

  const c = coverage(marked, unmarked, unknown);
  const stats = { target, dogs: dogs.length, excluded: 0, ...c };
  await db.from("walks").update({ status: unknown ? "review" : "done", stats, progress: { stage: "done" } }).eq("id", walkId);
  console.log(`seeded ${dogs.length} dogs: ${marked} marked, ${unmarked} unmarked, ${unknown} unknown`);
  console.log(`open http://localhost:3070/app/walks/${walkId}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
