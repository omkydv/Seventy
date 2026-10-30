/**
 * Load a walk that was processed offline (worker/tools/prepare_sample.sh, then reid.py) into
 * the database as a sample survey, with its real SAM output, close-ups, readings and costs.
 *
 *   npx tsx scripts/seed-walk.ts <walk_dir> --title "Mountain village square" --programme "Field samples" \
 *     --area "Mountain village" --mode plan --marks paint,collar,ear_tag --recorded 2026-10-30
 *
 * <walk_dir> holds pieces/ (c000.mp4…, pieces.json), sam/ (c000.txt…), people/ (c000.txt…, optional),
 * dogs.json, marks/ (marks.json, dogNN_i.jpg, dogNN_earK.jpg, reid.json), and optionally
 * reviews.json ([{ label, status, note }], what a person decided) and timing.json (SAM seconds).
 */
import { randomBytes, createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { classify } from "../src/lib/marks";
import { compactTracks } from "../src/lib/sam/compact";
import { walkStats } from "../src/lib/stats";

function loadEnv(file: string) {
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadEnv(path.join(__dirname, "..", ".env.local"));

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });

// Prices used for the cost log (USD): SAM 3.1 per frame and per image, Muse Spark per token.
const SAM_FRAME = 0.2 / 1000;
const SAM_IMAGE = 2.5 / 1000;
const sparkCost = (u?: { input_tokens?: number; output_tokens?: number }) => ((u?.input_tokens ?? 0) * 1.25 + (u?.output_tokens ?? 0) * 4.25) / 1e6;

function arg(name: string, fallback?: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
}

const readJson = <T>(file: string, fallback: T): T => (existsSync(file) ? (JSON.parse(readFileSync(file, "utf8")) as T) : fallback);

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

async function areaFor(workspaceId: string, programme: string, area: string, place: string | undefined): Promise<string> {
  let { data: prog } = await db.from("programmes").select("id").eq("workspace_id", workspaceId).eq("name", programme).maybeSingle();
  if (!prog) {
    const res = await db
      .from("programmes")
      .insert({ workspace_id: workspaceId, name: programme, description: arg("programme-note") ?? null })
      .select("id")
      .single();
    if (res.error) throw res.error;
    prog = res.data;
  }
  const { data: found } = await db.from("areas").select("id").eq("programme_id", prog!.id).eq("name", area).maybeSingle();
  if (found) return found.id;
  const { data: created, error } = await db
    .from("areas")
    .insert({ workspace_id: workspaceId, programme_id: prog!.id, name: area, place: place ?? null, kind: "route" })
    .select("id")
    .single();
  if (error) throw error;
  return created.id;
}

async function put(p: string, body: Buffer | string, contentType: string) {
  const blob = typeof body === "string" ? new Blob([body], { type: contentType }) : new Blob([new Uint8Array(body)], { type: contentType });
  const { error } = await db.storage.from("walks").upload(p, blob, { upsert: true, contentType });
  if (error) throw new Error(`upload ${p}: ${error.message}`);
}

type OfflineDog = { label: number; firstS: number; lastS: number; meanConf: number | null; segments: { chunk: number; objectId: string }[]; samples: { t: number; box: number[] }[] };
type OfflineMark = { label: number; status: string; mark: Record<string, unknown> | null; seconds?: number; usage?: { input_tokens?: number; output_tokens?: number }; ears?: number; sam_image_calls?: number };
type Reid = { pairs: { a: number; b: number; verdict: string; confidence: number; reason: string; seconds: number; usage?: { input_tokens?: number; output_tokens?: number } }[]; same_as: Record<string, number> };
type Timing = { dogs?: { upload_s: number; sam_s: number }; people?: { upload_s: number; sam_s: number } };

async function main() {
  const dir = process.argv[2];
  const title = arg("title", "Sample walk")!;
  const mode = arg("mode", "check") as "plan" | "check";
  const target = arg("target", "vaccination") as "vaccination" | "sterilization";
  const markTypes = arg("marks", "paint")!.split(",");
  const programme = arg("programme", "Field samples")!;
  const area = arg("area", title)!;
  const place = arg("place");
  const recorded = arg("recorded");

  const pieces = JSON.parse(readFileSync(path.join(dir, "pieces", "pieces.json"), "utf8")) as { duration: number; fps: number; piece: number; overlap: number; pieces: [number, number][] };
  const dogs = JSON.parse(readFileSync(path.join(dir, "dogs.json"), "utf8")) as OfflineDog[];
  const marks = JSON.parse(readFileSync(path.join(dir, "marks", "marks.json"), "utf8")) as OfflineMark[];
  const reid = readJson<Reid>(path.join(dir, "marks", "reid.json"), { pairs: [], same_as: {} });
  const reviews = readJson<{ label: number; status: string; note?: string }[]>(path.join(dir, "reviews.json"), []);
  const timing = readJson<Timing>(path.join(dir, "timing.json"), {});
  const firstSam = readFileSync(path.join(dir, "sam", "c000.txt"), "utf8");
  const size = firstSam.match(/;w=(\d+);h=(\d+)/);

  const workspaceId = await demoWorkspace();
  const areaId = await areaFor(workspaceId, programme, area, place);
  const { data: walk, error } = await db
    .from("walks")
    .insert({
      workspace_id: workspaceId,
      area_id: areaId,
      mode,
      title,
      area_name: area,
      target_mark: target,
      mark_types: markTypes,
      country: "Not given",
      recorded_at: recorded ? new Date(recorded).toISOString() : null,
      duration_s: pieces.duration,
      proc_width: size ? Number(size[1]) : null,
      proc_height: size ? Number(size[2]) : null,
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

  const usage: { stage: string; model: string; units: number; unit: string; calls: number; seconds: number | null; cost_usd: number }[] = [];
  let frames = 0;
  for (const [idx, [start, end]] of pieces.pieces.entries()) {
    const pad = String(idx).padStart(3, "0");
    const raw = readFileSync(path.join(dir, "sam", `c${pad}.txt`), "utf8");
    const tracks = await compactTracks(raw);
    frames += tracks.frames;
    await put(`${walkId}/chunks/${pad}.mp4`, readFileSync(path.join(dir, "pieces", `c${pad}.mp4`)), "video/mp4");
    await put(`${walkId}/sam/${pad}.txt`, raw, "text/plain");
    await put(`${walkId}/sam/${pad}.json`, JSON.stringify(tracks), "application/json");
    const peopleFile = path.join(dir, "people", `c${pad}.txt`);
    const hasPeople = existsSync(peopleFile);
    if (hasPeople) await put(`${walkId}/sam/${pad}.people.txt`, readFileSync(peopleFile, "utf8"), "text/plain");
    const { error: chunkError } = await db.from("chunks").insert({
      walk_id: walkId,
      idx,
      start_s: start,
      end_s: end,
      storage_path: `${walkId}/chunks/${pad}.mp4`,
      tracks_path: `${walkId}/sam/${pad}.json`,
      people_path: hasPeople ? `${walkId}/sam/${pad}.people.txt` : null,
      status: "done",
      frames: tracks.frames,
      objects: Object.keys(tracks.objects).length,
      submitted_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    });
    if (chunkError) throw chunkError;
  }
  usage.push({ stage: "Track every dog", model: "sam-3.1", units: frames, unit: "frames", calls: pieces.pieces.length, seconds: timing.dogs?.sam_s ?? null, cost_usd: frames * SAM_FRAME });
  if (existsSync(path.join(dir, "people")))
    usage.push({ stage: "Find people to blur", model: "sam-3.1", units: frames, unit: "frames", calls: pieces.pieces.length, seconds: timing.people?.sam_s ?? null, cost_usd: frames * SAM_FRAME });

  const markByLabel = new Map(marks.map((m) => [m.label, m]));
  const reviewByLabel = new Map(reviews.map((r) => [r.label, r]));
  const rows: { mark_status: string; review_status: string | null; same_as: number | null; mark: Record<string, unknown> | null }[] = [];
  for (const d of dogs) {
    const crops: { path: string; t: number; kind?: "ear" }[] = [];
    const label = String(d.label).padStart(2, "0");
    for (let i = 0; i < 3; i++) {
      const f = path.join(dir, "marks", `dog${label}_${i}.jpg`);
      if (!existsSync(f)) continue;
      const p = `${walkId}/crops/${d.label}-${i}.jpg`;
      await put(p, readFileSync(f), "image/jpeg");
      crops.push({ path: p, t: d.samples[i]?.t ?? d.firstS });
    }
    for (let i = 0; i < 2; i++) {
      const f = path.join(dir, "marks", `dog${label}_ear${i}.jpg`);
      if (!existsSync(f)) continue;
      const p = `${walkId}/crops/${d.label}-ear${i}.jpg`;
      await put(p, readFileSync(f), "image/jpeg");
      crops.push({ path: p, t: d.samples[i]?.t ?? d.firstS, kind: "ear" });
    }
    const m = markByLabel.get(d.label)?.mark ?? null;
    const cls = m ? classify(m as never, target, markTypes) : { status: "unknown" as const, kind: "unknown" as const };
    const review = reviewByLabel.get(d.label);
    const sameAs = reid.same_as[String(d.label)] ?? null;
    const row = {
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
      ear_crop_path: crops.find((c) => c.kind === "ear")?.path ?? null,
      mark: m,
      mark_status: cls.status,
      mark_kind: cls.kind,
      review_status: review?.status ?? null,
      review_note: review?.note ?? null,
      same_as: sameAs,
      reading_ms: Math.round((markByLabel.get(d.label)?.seconds ?? 0) * 1000),
    };
    const { error: dogError } = await db.from("dogs").insert(row);
    if (dogError) throw dogError;
    rows.push(row);
  }

  const imageCalls = marks.reduce((n, m) => n + (m.sam_image_calls ?? 0), 0);
  if (imageCalls) usage.push({ stage: "Find the ears", model: "sam-3.1", units: imageCalls, unit: "images", calls: imageCalls, seconds: null, cost_usd: imageCalls * SAM_IMAGE });
  usage.push({
    stage: "Read every mark",
    model: "muse-spark-1.3",
    units: marks.reduce((n, m) => n + (m.usage?.input_tokens ?? 0) + (m.usage?.output_tokens ?? 0), 0),
    unit: "tokens",
    calls: marks.length,
    seconds: marks.reduce((n, m) => n + (m.seconds ?? 0), 0),
    cost_usd: marks.reduce((n, m) => n + sparkCost(m.usage), 0),
  });
  if (reid.pairs.length)
    usage.push({
      stage: "Check for repeats",
      model: "muse-spark-1.3",
      units: reid.pairs.reduce((n, p) => n + (p.usage?.input_tokens ?? 0) + (p.usage?.output_tokens ?? 0), 0),
      unit: "tokens",
      calls: reid.pairs.length,
      seconds: reid.pairs.reduce((n, p) => n + p.seconds, 0),
      cost_usd: reid.pairs.reduce((n, p) => n + sparkCost(p.usage), 0),
    });
  const { error: usageError } = await db.from("usage_log").insert(usage.map((u) => ({ workspace_id: workspaceId, walk_id: walkId, ...u })));
  if (usageError) throw usageError;
  // Possible repeats a model couldn't settle are kept for a person, as notes on the later dog.
  const unsure = reid.pairs.filter((p) => p.verdict === "unsure" && !reid.same_as[String(p.b)]);
  if (unsure.length) {
    const { data: ids } = await db.from("dogs").select("id, label").eq("walk_id", walkId);
    const idOf = new Map((ids ?? []).map((r) => [r.label as number, r.id as string]));
    await db.from("matches").insert(
      unsure.map((p) => ({ area_id: areaId, dog_a: idOf.get(p.a), dog_b: idOf.get(p.b), similarity: p.confidence, verdict: "unsure", verified_by: "muse-spark-1.3", reason: p.reason })),
    );
  }

  const stats = walkStats(rows, target);
  const needsReview = rows.some((r) => !r.same_as && (r.review_status ?? r.mark_status) === "unknown");
  await db.from("walks").update({ status: needsReview && mode === "check" ? "review" : "done", stats, progress: { stage: "done" } }).eq("id", walkId);
  console.log(`seeded ${dogs.length} tracks as ${stats.dogs} dogs: ${stats.marked} marked, ${stats.unmarked} unmarked, ${stats.unknown} unknown, ${stats.repeats} repeats`);
  console.log(`cost $${usage.reduce((n, u) => n + u.cost_usd, 0).toFixed(3)}; open http://localhost:3070/app/walks/${walkId}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
