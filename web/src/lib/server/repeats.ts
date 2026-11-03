import "server-only";

import { db, getBytes } from "./db";
import { MARK_MODEL, sparkCost } from "./marks";
import { structured, type ResponseJob } from "./meta";

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["verdict", "confidence", "reason"],
  properties: {
    verdict: { type: "string", enum: ["same", "different", "unsure"] },
    confidence: { type: "number" },
    reason: { type: "string" },
  },
};

const INSTRUCTIONS = [
  "You help count free-roaming dogs on a street survey so that no dog is counted twice.",
  "You see close-ups of dog A, then close-ups of dog B, from the same walk. Dog B first appears after dog A was last seen.",
  "Decide whether B is the same individual dog as A. Compare coat colour and pattern, markings, ears, tail, size and build.",
  "Many street dogs look alike: say same only when distinctive details match, different when any clear detail differs, and unsure otherwise.",
  "confidence: 0 to 1. reason: one plain sentence naming the details you compared.",
].join(" ");

type Row = {
  id: string;
  label: number;
  first_s: number;
  last_s: number;
  samples: { t: number; box: [number, number, number, number] }[] | null;
  crops: { path: string; kind?: string }[] | null;
  mark: { coat?: string } | null;
};

type Verdict = { verdict: "same" | "different" | "unsure"; confidence: number; reason: string };

const words = (s = "") => new Set((s.toLowerCase().match(/[a-z]+/g) ?? []).filter((w) => w.length > 2));
const centre = (b: [number, number, number, number]) => [(b[0] + b[2]) / 2, (b[1] + b[3]) / 2];

/**
 * SAM keeps a dog's number while it stays in view. When a track starts after
 * another one ended, Muse Spark compares their close-ups: a sure match is
 * counted once, an unsure one stays as two dogs.
 */
export async function checkRepeats(walkId: string, log: (row: { stage: string; model: string; units: number; unit: string; calls: number; seconds: number; cost_usd: number }) => Promise<void>) {
  const { data } = await db().from("dogs").select("id, label, first_s, last_s, samples, crops, mark").eq("walk_id", walkId).order("label");
  const dogs = (data ?? []) as Row[];
  const pairs: [Row, Row][] = [];
  for (const b of dogs) {
    const wb = words(b.mark?.coat);
    const first = b.samples?.[0]?.box;
    const score = (a: Row) => {
      let s = [...words(a.mark?.coat)].filter((w) => wb.has(w)).length;
      const last = a.samples?.at(-1)?.box;
      if (first && last && b.first_s - a.last_s < 1.5) {
        const [ax, ay] = centre(last);
        const [bx, by] = centre(first);
        if (Math.hypot(ax - bx, ay - by) < 0.3) s += 10;
      }
      return s;
    };
    const earlier = dogs.filter((a) => a.label !== b.label && a.last_s < b.first_s && b.first_s - a.last_s < 120).sort((x, y) => score(y) - score(x));
    for (const a of earlier.slice(0, 3)) pairs.push([a, b]);
  }
  if (!pairs.length) return;

  const body = (d: Row) => (d.crops ?? []).filter((c) => c.kind !== "ear").slice(0, 2);
  const results: { a: Row; b: Row; v: Verdict }[] = [];
  let usage = { units: 0, cost: 0, ms: 0 };
  const queue = pairs.slice(0, 15);
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      while (queue.length) {
        const [a, b] = queue.shift()!;
        const ca = body(a);
        const cb = body(b);
        if (!ca.length || !cb.length) continue;
        const urls = await Promise.all([...ca, ...cb].map(async (c) => `data:image/jpeg;base64,${Buffer.from(await getBytes(c.path)).toString("base64")}`));
        try {
          const { value, usage: u, ms } = await structured<Verdict>({
            model: MARK_MODEL,
            instructions: INSTRUCTIONS,
            content: [
              { type: "input_text", text: `Dog A: the first ${ca.length} images, last seen at ${a.last_s.toFixed(1)} s. Dog B: the last ${cb.length} images, first seen at ${b.first_s.toFixed(1)} s. Is B the same dog as A?` },
              ...urls.map((url) => ({ type: "input_image", image_url: url })),
            ],
            schemaName: "same_dog",
            schema: SCHEMA,
            effort: "low",
          });
          results.push({ a, b, v: value });
          usage = { units: usage.units + tokens(u), cost: usage.cost + sparkCost(u), ms: usage.ms + ms };
        } catch {
          /* a failed comparison leaves both dogs counted, which is the cautious side */
        }
      }
    }),
  );

  // Sure matches, most confident first; chains resolve to the first sighting.
  const sameAs = new Map<number, number>();
  for (const r of [...results].sort((x, y) => y.v.confidence - x.v.confidence)) {
    if (r.v.verdict !== "same" || r.v.confidence < 0.75 || sameAs.has(r.b.label)) continue;
    let root = r.a.label;
    while (sameAs.has(root)) root = sameAs.get(root)!;
    if (root !== r.b.label) sameAs.set(r.b.label, root);
  }
  await Promise.all(
    [...sameAs.entries()].map(([label, root]) => db().from("dogs").update({ same_as: root }).eq("walk_id", walkId).eq("label", label)),
  );
  const unsure = results.filter((r) => r.v.verdict === "unsure" && !sameAs.has(r.b.label));
  if (unsure.length) {
    await db()
      .from("matches")
      .insert(unsure.map((r) => ({ area_id: null, dog_a: r.a.id, dog_b: r.b.id, similarity: r.v.confidence, verdict: "unsure", verified_by: MARK_MODEL, reason: r.v.reason })));
  }
  await log({ stage: "Check for repeats", model: MARK_MODEL, units: usage.units, unit: "tokens", calls: results.length, seconds: usage.ms / 1000, cost_usd: usage.cost });
}

const tokens = (u: ResponseJob["usage"]) => (u?.input_tokens ?? 0) + (u?.output_tokens ?? 0);
