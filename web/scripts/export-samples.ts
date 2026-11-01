/**
 * Copy the sample surveys' media (video pieces, SAM output, people to blur, close-ups)
 * from Supabase Storage into public/m/, so the site serves them from its own CDN
 * instead of signing a storage link for each file on every visit.
 *
 *   npx tsx scripts/export-samples.ts
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import samples from "../src/content/samples.json";

for (const line of readFileSync(path.join(__dirname, "..", ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
const OUT = path.join(__dirname, "..", "public", "m");

async function copy(p: string) {
  const { data, error } = await db.storage.from("walks").download(p);
  if (error || !data) throw new Error(`download ${p}: ${error?.message}`);
  const file = path.join(OUT, p);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, Buffer.from(await data.arrayBuffer()));
  return data.size;
}

async function main() {
  let total = 0;
  for (const s of samples.samples) {
    const walkId = s.walk;
    const { data: chunks } = await db.from("chunks").select("idx, status, people_path").eq("walk_id", walkId);
    const { data: dogs } = await db.from("dogs").select("crops").eq("walk_id", walkId);
    const paths = new Set<string>();
    for (const c of chunks ?? []) {
      const pad = String(c.idx).padStart(3, "0");
      paths.add(`${walkId}/chunks/${pad}.mp4`);
      if (c.status === "done") paths.add(`${walkId}/sam/${pad}.txt`);
      if (c.people_path) paths.add(c.people_path as string);
    }
    for (const d of dogs ?? []) for (const c of (d.crops ?? []) as { path: string }[]) paths.add(c.path);
    for (const p of paths) total += await copy(p);
    console.log(`${s.title}: ${paths.size} files`);
  }
  console.log(`${(total / 1e6).toFixed(1)} MB in public/m`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
