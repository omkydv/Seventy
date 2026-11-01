/**
 * Write the programme report again for sample surveys, after the facts or the
 * instructions change. The new report replaces the old one, and its cost row
 * replaces the old report's, so a survey's cost table still shows one report.
 *
 *   npx tsx --conditions=react-server scripts/write-reports.ts <walkId> [<walkId> …]
 */
import { readFileSync } from "node:fs";
import path from "node:path";

for (const line of readFileSync(path.join(__dirname, "..", ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

async function main() {
  const { db } = await import("../src/lib/server/db");
  const { writeReport, REPORT_MODEL } = await import("../src/lib/server/report");
  for (const walkId of process.argv.slice(2)) {
    const { data: old } = await db().from("usage_log").select("id").eq("walk_id", walkId).eq("model", REPORT_MODEL);
    const { body } = await writeReport(walkId);
    const ids = (old ?? []).map((r) => r.id);
    if (ids.length) await db().from("usage_log").delete().in("id", ids);
    console.log(`\n${walkId}\n  ${body.headline}\n  ${body.decision}\n  next: ${body.next_steps.join(" | ")}\n  notes: ${(body.notes ?? []).join(" | ")}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
