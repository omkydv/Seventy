/**
 * Apply the current mark rules (src/lib/marks.ts) to walks that were read under older ones:
 * each dog's stored reading is classified again, and the walk's numbers are recomputed.
 * No model is called.
 *
 *   npx tsx scripts/reclassify.ts <walkId> [<walkId> …]
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { classify } from "../src/lib/marks";
import { walkStats } from "../src/lib/stats";

function loadEnv(file: string) {
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadEnv(path.join(__dirname, "..", ".env.local"));

const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });

async function main() {
  for (const walkId of process.argv.slice(2)) {
    const { data: walk } = await db.from("walks").select("id, title, mode, target_mark, mark_types").eq("id", walkId).single();
    if (!walk) continue;
    const { data: dogs } = await db.from("dogs").select("id, label, mark, mark_status, review_status, same_as").eq("walk_id", walkId).order("label");
    const rows = [];
    for (const d of dogs ?? []) {
      if (!d.mark || d.mark.error || d.mark.skipped) {
        rows.push(d);
        continue;
      }
      const cls = classify(d.mark, walk.target_mark, (walk.mark_types as string[]) ?? ["paint"]);
      if (cls.status !== d.mark_status) {
        await db.from("dogs").update({ mark_status: cls.status, mark_kind: cls.kind }).eq("id", d.id);
        console.log(`${walk.title} Dog ${d.label}: ${d.mark_status} -> ${cls.status}`);
      }
      rows.push({ ...d, mark_status: cls.status });
    }
    const stats = walkStats(rows as never, walk.target_mark);
    const needsReview = rows.some((r) => !r.same_as && (r.review_status ?? r.mark_status) === "unknown");
    await db.from("walks").update({ stats, status: needsReview && walk.mode === "check" ? "review" : "done" }).eq("id", walkId);
    console.log(`${walk.title}: ${stats.dogs} dogs, ${stats.marked} marked, ${stats.unmarked} not marked, ${stats.unknown} can't tell`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
