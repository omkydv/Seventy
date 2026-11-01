import "server-only";

import { structured } from "./meta";

export const MARK_MODEL = "muse-spark-1.3";

export type MarkReading = {
  is_dog: boolean;
  paint: { status: "present" | "absent" | "not_visible"; color: string | null; location: string | null };
  collar: { status: "present" | "absent" | "not_visible"; color: string | null };
  ear_notch: { status: "present" | "absent" | "not_visible"; side: "left" | "right" | "both" | "unknown" | null };
  ear_tag: { status: "present" | "absent" | "not_visible"; color: string | null };
  life_stage: "adult" | "puppy" | "unknown";
  lead: { status: "present" | "absent" | "not_visible" };
  /** Added after the reading: SAM 3.1's own search for the mark. */
  second?: Partial<Record<"collar" | "ear_tag", { found: boolean; conf: number | null }>>;
  coat: string;
  view_quality: "good" | "fair" | "poor";
  confidence: number;
  reason: string;
};

const tri = { type: "string", enum: ["present", "absent", "not_visible"] };

export const MARK_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["is_dog", "paint", "collar", "ear_notch", "ear_tag", "life_stage", "lead", "coat", "view_quality", "confidence", "reason"],
  properties: {
    is_dog: { type: "boolean" },
    paint: {
      type: "object",
      additionalProperties: false,
      required: ["status", "color", "location"],
      properties: { status: tri, color: { type: ["string", "null"] }, location: { type: ["string", "null"] } },
    },
    collar: {
      type: "object",
      additionalProperties: false,
      required: ["status", "color"],
      properties: { status: tri, color: { type: ["string", "null"] } },
    },
    ear_notch: {
      type: "object",
      additionalProperties: false,
      required: ["status", "side"],
      properties: {
        status: tri,
        side: { type: ["string", "null"], enum: ["left", "right", "both", "unknown", null] },
      },
    },
    ear_tag: {
      type: "object",
      additionalProperties: false,
      required: ["status", "color"],
      properties: { status: tri, color: { type: ["string", "null"] } },
    },
    life_stage: { type: "string", enum: ["adult", "puppy", "unknown"] },
    lead: { type: "object", additionalProperties: false, required: ["status"], properties: { status: tri } },
    coat: { type: "string" },
    view_quality: { type: "string", enum: ["good", "fair", "poor"] },
    confidence: { type: "number" },
    reason: { type: "string" },
  },
} as const;

const INSTRUCTIONS = [
  "You read field marks on free-roaming dogs for a rabies vaccination survey.",
  "Vaccinated dogs are marked for a few days with livestock paint or crayon (a coloured patch, usually on the head or back) or with a temporary collar or band.",
  "Sterilized dogs carry a permanent V-shaped notch or a clipped tip on one ear.",
  "Some city programmes clip a small plastic tag (often yellow, blue or white) into one ear of every dog they vaccinate. ear_tag is present only if you can see the tag; if one ear is hidden and the visible ear has no tag, use not_visible.",
  "life_stage: puppy for a dog clearly under about six months (small, round head, oversized paws); otherwise adult; unknown if you cannot judge.",
  "lead: present if the dog is on a lead or held by a person, which means it has an owner.",
  "Report only what you can see. If the body part that would carry a mark is not visible clearly enough to judge, use not_visible. Never guess.",
  "Natural coat patches are not paint: white, cream, tan, brown, grey and black patches are almost always the coat itself. Call paint present only for a colour no dog coat has (pink, purple, blue, green, bright red or orange) or a patch with hard painted edges in a colour the rest of the coat lacks.",
  "Ear sides are from the dog’s own point of view.",
  "All images are crops of the same dog from one walk; some may be close-ups of an ear. Combine them.",
  "coat: one short phrase a surveyor could use to recognise this dog again (colour, markings, build).",
  "confidence: 0 to 1, your confidence in the overall reading. reason: one plain sentence a surveyor would write.",
].join(" ");

export async function readMarks(imageUrls: string[], earUrls: string[] = []) {
  const prompt = earUrls.length
    ? `Read the marks on this dog. The last ${earUrls.length} images are enlarged close-ups of its ears, found by SAM 3.1; look there for a tag or a notch.`
    : "Read the marks on this dog.";
  return structured<MarkReading>({
    model: MARK_MODEL,
    instructions: INSTRUCTIONS,
    content: [{ type: "input_text", text: prompt }, ...[...imageUrls, ...earUrls].map((u) => ({ type: "input_image", image_url: u }))],
    schemaName: "dog_marks",
    schema: MARK_SCHEMA as unknown as Record<string, unknown>,
    effort: "low",
  });
}

export { classify, type MarkKind, type MarkStatus } from "@/lib/marks";

/** Rough per-call cost at standard pricing, for the spend log. */
export function sparkCost(usage?: { input_tokens?: number; output_tokens?: number }) {
  return ((usage?.input_tokens ?? 0) * 1.25 + (usage?.output_tokens ?? 0) * 4.25) / 1e6;
}
