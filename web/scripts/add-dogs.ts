/**
 * Add dogs to a sample survey that was seeded before they were counted: every dog in
 * <walk_dir>/dogs.json whose label the walk doesn't have yet gets its close-ups, its
 * reading, SAM 3.1's second opinion and its costs, and the walk's numbers are recomputed.
 *
 *   npx tsx scripts/add-dogs.ts <walkId> <walk_dir>
 *
 * <walk_dir> is laid out as for seed-walk.ts; marks/marks.json must already hold the new dogs' readings.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { classify, SECOND_OPINION } from "../src/lib/marks";
import { walkStats } from "../src/lib/stats";

function loadEnv(file: string) {
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadEnv(path.join(__dirname, "..", ".env.local"));

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
const API = process.env.MODEL_API_BASE ?? "https://api.meta.ai/v1";
const BOX = /(?:^|,|f>)(\d+)<\|box;x1=(\d+);y1=(\d+);x2=(\d+);y2=(\d+);w=(\d+);h=(\d+)(?:;c=([\d.]+))?/g;
const SAM_IMAGE = 2.5 / 1000;
const sparkCost = (u?: { input_tokens?: number; output_tokens?: number }) => ((u?.input_tokens ?? 0) * 1.25 + (u?.output_tokens ?? 0) * 4.25) / 1e6;

type OfflineDog = { label: number; firstS: number; lastS: number; meanConf: number | null; segments: { chunk: number; objectId: string }[]; samples: { t: number; box: number[] }[] };
type OfflineMark = { label: number; mark: Record<string, unknown> | null; seconds?: number; usage?: { input_tokens?: number; output_tokens?: number }; sam_image_calls?: number };
type Reid = { pairs: { a: number; b: number; seconds: number; usage?: { input_tokens?: number; output_tokens?: number } }[] };

async function look(concept: string, jpeg: Buffer) {
  const started = Date.now();
  const res = await fetch(`${API}/responses`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.MODEL_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "sam-3.1",
      input: [{ type: "message", role: "user", content: [{ type: "input_text", text: concept }, { type: "input_image", image_url: `data:image/jpeg;base64,${jpeg.toString("base64")}` }] }],
      metadata: { include_confidence: "true" },
    }),
  });
  if (!res.ok) throw new Error(`SAM ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const job = (await res.json()) as { output?: { type: string; content?: { text?: string }[] }[] };
  const text = (job.output ?? []).flatMap((o) => (o.type === "message" ? (o.content ?? []).map((c) => c.text ?? "") : [])).join("");
  const confs = [...text.matchAll(BOX)].map((m) => (m[8] ? Number(m[8]) : 0.5));
  const best = confs.length ? Math.max(...confs) : null;
  return { found: best != null && best >= 0.35, conf: best, ms: Date.now() - started };
}

async function put(p: string, body: Buffer) {
  const { error } = await db.storage.from("walks").upload(p, new Blob([new Uint8Array(body)], { type: "image/jpeg" }), { upsert: true, contentType: "image/jpeg" });
  if (error) throw new Error(`upload ${p}: ${error.message}`);
}

async function main() {
  const [walkId, dir] = process.argv.slice(2);
  const { data: walk } = await db.from("walks").select("id, workspace_id, mode, target_mark, mark_types").eq("id", walkId).single();
  if (!walk) throw new Error(`no walk ${walkId}`);
  const target = walk.target_mark as "vaccination" | "sterilization";
  const markTypes = (walk.mark_types as string[]) ?? ["paint"];
  const dogs = JSON.parse(readFileSync(path.join(dir, "dogs.json"), "utf8")) as OfflineDog[];
  const marks = new Map((JSON.parse(readFileSync(path.join(dir, "marks", "marks.json"), "utf8")) as OfflineMark[]).map((m) => [m.label, m]));
  const reid = existsSync(path.join(dir, "marks", "reid.json")) ? (JSON.parse(readFileSync(path.join(dir, "marks", "reid.json"), "utf8")) as Reid) : { pairs: [] };
  const { data: have } = await db.from("dogs").select("label").eq("walk_id", walkId);
  const known = new Set((have ?? []).map((d) => d.label as number));
  const added = dogs.filter((d) => !known.has(d.label));
  if (!added.length) return console.log("nothing to add");

  const looks = markTypes.filter((k): k is "collar" | "ear_tag" => k === "collar" || k === "ear_tag");
  let lookCalls = 0;
  let lookMs = 0;
  for (const d of added) {
    const label = String(d.label).padStart(2, "0");
    const crops: { path: string; t: number; kind?: "ear" }[] = [];
    for (let i = 0; i < 3; i++) {
      const f = path.join(dir, "marks", `dog${label}_${i}.jpg`);
      if (!existsSync(f)) continue;
      const p = `${walkId}/crops/${d.label}-${i}.jpg`;
      await put(p, readFileSync(f));
      crops.push({ path: p, t: d.samples[i]?.t ?? d.firstS });
    }
    for (let i = 0; i < 2; i++) {
      const f = path.join(dir, "marks", `dog${label}_ear${i}.jpg`);
      if (!existsSync(f)) continue;
      const p = `${walkId}/crops/${d.label}-ear${i}.jpg`;
      await put(p, readFileSync(f));
      crops.push({ path: p, t: d.samples[i]?.t ?? d.firstS, kind: "ear" });
    }
    let mark = marks.get(d.label)?.mark ?? null;
    if (mark && target !== "sterilization" && looks.length) {
      const second: Record<string, { found: boolean; conf: number | null }> = {};
      for (const k of looks) {
        const ear = path.join(dir, "marks", `dog${label}_ear0.jpg`);
        const body = path.join(dir, "marks", `dog${label}_0.jpg`);
        const r = await look(SECOND_OPINION[k]!, readFileSync(k === "ear_tag" && existsSync(ear) ? ear : body));
        second[k] = { found: r.found, conf: r.conf };
        lookCalls++;
        lookMs += r.ms;
      }
      mark = { ...mark, second };
    }
    const cls = mark ? classify(mark as never, target, markTypes) : { status: "unknown" as const, kind: "unknown" as const };
    const { error } = await db.from("dogs").insert({
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
      mark,
      mark_status: cls.status,
      mark_kind: cls.kind,
      reading_ms: Math.round((marks.get(d.label)?.seconds ?? 0) * 1000),
    });
    if (error) throw error;
    console.log(`Dog ${d.label}: ${cls.status}`);
  }

  const read = added.map((d) => marks.get(d.label)).filter((m): m is OfflineMark => !!m);
  const ears = read.reduce((n, m) => n + (m.sam_image_calls ?? 0), 0);
  const pairs = reid.pairs.filter((p) => added.some((d) => d.label === p.b));
  const usage = [
    ears && { stage: "Find the ears", model: "sam-3.1", units: ears, unit: "images", calls: ears, seconds: null, cost_usd: ears * SAM_IMAGE },
    read.length && {
      stage: "Read every mark",
      model: "muse-spark-1.3",
      units: read.reduce((n, m) => n + (m.usage?.input_tokens ?? 0) + (m.usage?.output_tokens ?? 0), 0),
      unit: "tokens",
      calls: read.length,
      seconds: read.reduce((n, m) => n + (m.seconds ?? 0), 0),
      cost_usd: read.reduce((n, m) => n + sparkCost(m.usage), 0),
    },
    lookCalls && { stage: "Second opinion on marks", model: "sam-3.1", units: lookCalls, unit: "images", calls: lookCalls, seconds: lookMs / 1000, cost_usd: lookCalls * SAM_IMAGE },
    pairs.length && {
      stage: "Check for repeats",
      model: "muse-spark-1.3",
      units: pairs.reduce((n, p) => n + (p.usage?.input_tokens ?? 0) + (p.usage?.output_tokens ?? 0), 0),
      unit: "tokens",
      calls: pairs.length,
      seconds: pairs.reduce((n, p) => n + p.seconds, 0),
      cost_usd: pairs.reduce((n, p) => n + sparkCost(p.usage), 0),
    },
  ].filter(Boolean) as Record<string, unknown>[];
  const { error: usageError } = await db.from("usage_log").insert(usage.map((u) => ({ workspace_id: walk.workspace_id, walk_id: walkId, ...u })));
  if (usageError) throw usageError;

  const { data: rows } = await db.from("dogs").select("mark_status, review_status, same_as, mark").eq("walk_id", walkId);
  const stats = walkStats((rows ?? []) as never, target);
  const needsReview = (rows ?? []).some((r) => !r.same_as && (r.review_status ?? r.mark_status) === "unknown");
  await db.from("walks").update({ stats, status: needsReview && walk.mode === "check" ? "review" : "done" }).eq("id", walkId);
  console.log(`added ${added.length}; the walk now has ${stats.dogs} dogs: ${stats.marked} marked, ${stats.unmarked} unmarked, ${stats.unknown} can't tell`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
