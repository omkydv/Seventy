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
  /** For the next walk; reports written before Nov 1 carry `limits` instead. */
  notes?: string[];
  limits?: string[];
  sources: { title: string; url: string; supports: string }[];
};

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["headline", "decision", "next_steps", "context", "notes", "sources"],
  properties: {
    headline: { type: "string" },
    decision: { type: "string" },
    next_steps: { type: "array", items: { type: "string" } },
    context: { type: "string" },
    notes: { type: "array", items: { type: "string" } },
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

const INSTRUCTIONS = `You write the programme report for one survey walk, for a district veterinary officer or a rabies programme manager.

Rules:
- Every number about this walk must come from the facts you are given. Do not compute new statistics. Do not round differently.
- Write every fact in plain words. Never quote a field name, a key, a status code or anything with an underscore, and never put a value in quotation marks.
- A count walk ("purpose": a count before a drive) answers how many dogs there are and how many doses to bring. Do not mention coverage or percentages of dogs marked for a count walk.
- A check walk with "coverage" null has fewer readable dogs than Seventy needs to call coverage. Say how many dogs were read and that a longer walk through the area gives enough to call it. Do not state a coverage percentage.
- Use web search to find the rules and targets that apply in the walk's country right now: national rabies strategy targets, dog vaccination or sterilization rules, and the WHO 70% coverage guidance. Cite what you use in "sources", with the exact page URL and one line on what it supports.
- headline: one sentence with the result and its main number, as the team would say it.
- decision: two or three sentences on what this means for the team tomorrow.
- next_steps: three to five concrete actions, each one sentence, using the walk's numbers (for example how many doses to bring, or how many more dogs to vaccinate among those seen). Never recommend culling or removing dogs.
- context: one short paragraph that places the result against the national target and the rules you found. Mark each claim from a source with [1], [2] in the order of "sources".
- notes: one or two practical notes for the team's next walk of this area (for example the time of day dogs are out, or walking the side streets).
- Plain, calm, confident language. No marketing words, no exclamation marks, no em dashes.`;

type Facts = Record<string, unknown>;

const MARK_WORDS: Record<string, string> = { paint: "paint", collar: "collar", ear_tag: "ear tag" };
const STATUS_WORDS: Record<string, string> = {
  confident: "complete: the whole 95% interval is above the line",
  complete: "complete, though the lower end of the 95% interval is below the line",
  below: "below the 70% line",
  insufficient: "too few readable dogs to call yet; Seventy calls coverage from ten",
};

/** The walk's facts in words a model can repeat without leaking field names or codes. */
export function factsFor(walk: Record<string, unknown>, stats: Record<string, unknown> | null, dogs: number): Facts {
  const ci = (stats?.ci ?? {}) as { p?: number; low?: number; high?: number };
  const seconds = walk.duration_s ? Math.round(Number(walk.duration_s)) : null;
  const length = seconds == null ? "not recorded" : seconds < 90 ? `${seconds} seconds` : `${Math.round(seconds / 60)} minutes`;
  const when = new Date(String(walk.recorded_at ?? walk.created_at));
  const common = {
    area: walk.area_name ?? walk.title ?? "an unnamed route",
    country: walk.country && walk.country !== "Not given" ? walk.country : "not given, so use WHO global guidance",
    date: Number.isNaN(when.getTime()) ? "not recorded" : when.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
    length_of_video: length,
    dogs_counted_once: dogs,
    target: `${TARGET * 100}% of dogs vaccinated`,
  };
  if (walk.mode === "plan") {
    return { ...common, purpose: "a count before a vaccination drive", doses_to_reach_70_percent_of_dogs_seen: Math.ceil(TARGET * dogs) };
  }
  const marks = ((walk.mark_types as string[]) ?? []).map((k) => MARK_WORDS[k] ?? k).join(" or ") || "paint";
  const enough = stats?.status !== "insufficient" && ci.p != null;
  return {
    ...common,
    purpose: "a check after a vaccination drive",
    question: walk.target_mark === "sterilization" ? "the share of dogs sterilized, read from the ear notch" : `the share of dogs vaccinated, read from the ${marks}`,
    dogs_marked: stats?.marked ?? 0,
    dogs_not_marked: stats?.unmarked ?? 0,
    dogs_too_far_or_blurred_to_read: stats?.unknown ?? 0,
    coverage: enough ? `${Math.round(ci.p! * 1000) / 10}% (95% interval ${Math.round(ci.low! * 1000) / 10}% to ${Math.round(ci.high! * 1000) / 10}%)` : null,
    result: STATUS_WORDS[String(stats?.status)] ?? "not yet known",
    more_dogs_to_vaccinate_among_those_seen: enough ? (stats?.toGo ?? null) : null,
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
      calls: 1,
      stage: "Write the report",
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
