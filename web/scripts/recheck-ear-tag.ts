/**
 * Run SAM 3.1's ear-tag second opinion again for one dog, on a chosen enlarged ear,
 * and store what it finds. The dog's status is left as it is.
 *
 *   npx tsx scripts/recheck-ear-tag.ts <dogId> <ear.jpg>
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { SECOND_OPINION } from "../src/lib/marks";

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

async function look(concept: string, jpeg: Buffer) {
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
  return { found: best != null && best >= 0.35, conf: best };
}

async function main() {
  const [dogId, earFile] = process.argv.slice(2);
  const r = await look(SECOND_OPINION.ear_tag!, readFileSync(earFile));
  console.log(`SAM 3.1 "${SECOND_OPINION.ear_tag}" on ${path.basename(earFile)}: ${r.found ? "found" : "none"} (conf ${r.conf})`);
  if (!r.found) return;
  const { data: dog } = await db.from("dogs").select("mark").eq("id", dogId).single();
  const mark = { ...dog!.mark, second: { ...(dog!.mark?.second ?? {}), ear_tag: { found: true, conf: r.conf } } };
  const { error } = await db.from("dogs").update({ mark }).eq("id", dogId);
  console.log(error ? `update failed: ${error.message}` : "stored");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
