/**
 * Add SAM 3.1's second opinion to walks that were read before it existed:
 * for each dog, SAM looks for the walk's mark itself (a collar, an ear tag) on
 * the stored close-ups, and the walk's numbers are recomputed.
 *
 *   npx tsx scripts/second-opinion.ts <walkId> [<walkId> …]
 */
import { readFileSync } from "node:fs";
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

async function look(concept: string, jpeg: ArrayBuffer) {
  const started = Date.now();
  const res = await fetch(`${API}/responses`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.MODEL_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "sam-3.1",
      input: [{ type: "message", role: "user", content: [{ type: "input_text", text: concept }, { type: "input_image", image_url: `data:image/jpeg;base64,${Buffer.from(jpeg).toString("base64")}` }] }],
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

async function bytes(p: string) {
  const { data, error } = await db.storage.from("walks").download(p);
  if (error || !data) throw new Error(`download ${p}: ${error?.message}`);
  return data.arrayBuffer();
}

async function main() {
  for (const walkId of process.argv.slice(2)) {
    const { data: walk } = await db.from("walks").select("id, title, workspace_id, target_mark, mark_types").eq("id", walkId).single();
    if (!walk) continue;
    const types = ((walk.mark_types as string[]) ?? []).filter((k): k is "collar" | "ear_tag" => k === "collar" || k === "ear_tag");
    if (walk.target_mark === "sterilization" || !types.length) continue;
    const { data: dogs } = await db.from("dogs").select("id, label, crops, mark, review_status, same_as").eq("walk_id", walkId).order("label");
    let calls = 0;
    let ms = 0;
    const rows = [];
    for (const d of dogs ?? []) {
      const crops = (d.crops ?? []) as { path: string; kind?: string }[];
      const body = crops.find((c) => c.kind !== "ear");
      const ear = crops.find((c) => c.kind === "ear");
      if (!d.mark || d.mark.error || d.mark.skipped || !body) {
        rows.push(d);
        continue;
      }
      const second: Record<string, { found: boolean; conf: number | null }> = {};
      for (const k of types) {
        const r = await look(SECOND_OPINION[k]!, await bytes(k === "ear_tag" && ear ? ear.path : body.path));
        second[k] = { found: r.found, conf: r.conf };
        calls++;
        ms += r.ms;
      }
      const mark = { ...d.mark, second };
      const cls = classify(mark, walk.target_mark, walk.mark_types as string[]);
      await db.from("dogs").update({ mark, mark_status: cls.status, mark_kind: cls.kind }).eq("id", d.id);
      rows.push({ ...d, mark, mark_status: cls.status });
      console.log(`${walk.title} Dog ${d.label}: ${Object.entries(second).map(([k, v]) => `${k} ${v.found ? "found" : "none"}`).join(", ")} -> ${cls.status}`);
    }
    const stats = walkStats(rows as never, walk.target_mark);
    await db.from("walks").update({ stats }).eq("id", walkId);
    await db.from("usage_log").insert({ workspace_id: walk.workspace_id, walk_id: walkId, model: "sam-3.1", units: calls, unit: "images", calls, seconds: ms / 1000, cost_usd: calls * 0.0025, stage: "Second opinion on marks" });
    console.log(`${walk.title}: ${calls} looks, ${(ms / 1000).toFixed(0)} s`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
