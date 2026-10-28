import "server-only";

import { TARGET } from "@/lib/stats";
import { db } from "./db";
import { createResponse, type ResponseJob } from "./meta";

export const REPORT_MODEL = "muse-wonder-1.0";

export type Report = {
  headline: string;
  decision: string;
  next_steps: string[];
  context: string;
  limits: string[];
  sources: { title: string; url: string; supports: string }[];
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "decision", "next_steps", "context", "limits", "sources"],
  properties: {
    headline: { type: "string" },
    decision: { type: "string" },
    next_steps: { type: "array", items: { type: "string" } },
    context: { type: "string" },
    limits: { type: "array", items: { type: "string" } },
    sources: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "url", "supports"],
        properties: { title: { type: "string" }, url: { type: "string" }, supports: { type: "string" } },
      },
    },
  },
};

const INSTRUCTIONS = `You write the program report for one survey walk, for a district veterinary officer or a rabies program manager.

Rules:
- Every number about this walk must come from the facts you are given. Do not compute new statistics. Do not round differently.
- Use web search to find the rules and targets that apply in the walk's country right now: national rabies strategy targets, dog vaccination or sterilization rules, and the WHO 70% coverage guidance. Cite what you use in "sources", with the exact page URL and one line on what it supports.
- headline: one sentence that states the result with its main number.
- decision: two or three sentences on what this means for the team tomorrow.
- next_steps: three to five concrete actions, each one sentence, using the walk's numbers (for example how many more dogs to vaccinate among those seen). Never recommend culling or removing dogs.
- context: one short paragraph that places the result against the national target and the rules you found. Mark each claim from a source with [1], [2] in the order of "sources".
- limits: two to four honest limits of this walk (for example dogs that could not be read, a single route, time of day).
- Plain, calm language. No marketing words, no exclamation marks, no em dashes.`;

type Facts = Record<string, unknown>;

export function factsFor(walk: Record<string, unknown>, stats: Record<string, unknown> | null, dogs: number): Facts {
  const ci = (stats?.ci ?? {}) as { p?: number; low?: number; high?: number };
  return {
    area: walk.area_name ?? walk.title ?? "unnamed route",
    country: walk.country ?? "Nepal",
    date: walk.recorded_at ?? walk.created_at,
    walk_minutes: walk.duration_s ? Math.round((Number(walk.duration_s) / 60) * 10) / 10 : null,
    mode: walk.mode === "plan" ? "plan (before a vaccination drive)" : "check (after a drive)",
    question: walk.mode === "plan" ? "how many dogs are here" : walk.target_mark === "sterilization" ? "sterilization coverage (ear notch)" : "vaccination coverage (paint or collar marks)",
    dogs_counted_once: dogs,
    marked: stats?.marked ?? 0,
    unmarked: stats?.unmarked ?? 0,
    could_not_read: stats?.unknown ?? 0,
    coverage_percent: ci.p != null ? Math.round(ci.p * 1000) / 10 : null,
    interval_95_percent: ci.low != null && ci.high != null ? [Math.round(ci.low * 1000) / 10, Math.round(ci.high * 1000) / 10] : null,
    status: stats?.status ?? null,
    more_dogs_to_vaccinate_among_seen: stats?.toGo ?? null,
    doses_for_70_percent_of_dogs_seen: Math.ceil(TARGET * dogs),
    target_percent: TARGET * 100,
  };
}

function lastMessageText(job: ResponseJob): string {
  const messages = (job.output ?? []).filter((o) => o.type === "message");
  const last = messages[messages.length - 1];
  return (last?.content ?? []).map((c) => c.text ?? "").join("");
}

/** Find the JSON object in a message that may start with a sentence of preamble. */
function extractJson(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("The report model returned no JSON.");
  return text.slice(start, end + 1);
}

export async function writeReport(walkId: string): Promise<{ id: string; body: Report }> {
  const { data: walk } = await db().from("walks").select("*").eq("id", walkId).single();
  if (!walk) throw new Error("No such walk.");
  const { count } = await db().from("dogs").select("id", { count: "exact", head: true }).eq("walk_id", walkId);
  const facts = factsFor(walk, walk.stats, count ?? 0);
  const { data: row } = await db().from("reports").insert({ walk_id: walkId, status: "running" }).select("id").single();
  try {
    const job = await createResponse({
      model: REPORT_MODEL,
      instructions: INSTRUCTIONS,
      input: [{ role: "user", content: [{ type: "input_text", text: `Facts for this walk:\n${JSON.stringify(facts, null, 1)}` }] }],
      tools: [{ type: "web_search" }],
      reasoning: { effort: "low" },
      text: { format: { type: "json_schema", name: "walk_report", schema: SCHEMA, strict: true } },
    });
    const body = JSON.parse(extractJson(lastMessageText(job))) as Report;
    body.sources = body.sources.filter((s) => /^https?:\/\//.test(s.url));
    await db().from("reports").update({ status: "done", body, model_response_id: job.id }).eq("id", row!.id);
    const usage = job.usage ?? {};
    await db().from("usage_log").insert({
      workspace_id: walk.workspace_id,
      walk_id: walkId,
      model: REPORT_MODEL,
      units: (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0),
      unit: "tokens",
      cost_usd: ((usage.input_tokens ?? 0) * 4 + (usage.output_tokens ?? 0) * 20) / 1e6 + 0.0125,
    });
    return { id: row!.id, body };
  } catch (e) {
    await db().from("reports").update({ status: "failed", error: String(e).slice(0, 500) }).eq("id", row!.id);
    throw e;
  }
}

export async function latestReport(walkId: string): Promise<Report | null> {
  const { data } = await db()
    .from("reports")
    .select("body")
    .eq("walk_id", walkId)
    .eq("status", "done")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data?.body as Report) ?? null;
}
