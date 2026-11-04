// Export the four sample surveys from Supabase into src/content/local-seed.json, so Seventy can
// run with no database at all (local mode) and still open with the samples.
//   node scripts/export-local-seed.mjs
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const f of [".env.local", "../.env.local"]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const samples = JSON.parse(readFileSync("src/content/samples.json", "utf8")).samples.map((s) => s.walk);
const all = async (q) => {
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return data ?? [];
};

const walks = await all(db.from("walks").select("*").in("id", samples));
const wsIds = [...new Set(walks.map((w) => w.workspace_id))];
const workspaces = (await all(db.from("workspaces").select("*").in("id", wsIds))).map((w) => ({ ...w, token_hash: "local-seed", is_demo: true }));
const chunks = await all(db.from("chunks").select("*").in("walk_id", samples));
const dogs = await all(db.from("dogs").select("*").in("walk_id", samples));
const dogIds = dogs.map((d) => d.id);
const matches = await all(db.from("matches").select("*").in("dog_b", dogIds));
const reports = await all(db.from("reports").select("*").in("walk_id", samples));
const usage_log = await all(db.from("usage_log").select("*").in("walk_id", samples));
const seed = { workspaces, walks, chunks, dogs, matches, reports, usage_log };
writeFileSync("src/content/local-seed.json", JSON.stringify(seed));
console.log(Object.fromEntries(Object.entries(seed).map(([k, v]) => [k, v.length])));
