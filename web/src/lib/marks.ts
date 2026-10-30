import type { MarkReading } from "./types";

export type MarkStatus = "marked" | "unmarked" | "unknown";
export type MarkKind = "paint" | "collar" | "ear_tag" | "notch" | "none" | "unknown";
export type VaccinationMark = "paint" | "collar" | "ear_tag";

export const MARK_NAMES: Record<VaccinationMark, string> = {
  paint: "Paint or crayon",
  collar: "Collar or band",
  ear_tag: "Ear tag",
};

/** Map a reading to the walk's question: vaccinated (paint, collar or ear tag) or sterilized (ear notch). */
export function classify(
  r: Pick<MarkReading, "is_dog" | "paint" | "collar" | "ear_notch" | "ear_tag" | "view_quality">,
  target: "vaccination" | "sterilization",
  markTypes: string[],
): { status: MarkStatus; kind: MarkKind } {
  if (!r.is_dog) return { status: "unknown", kind: "unknown" };
  if (target === "sterilization") {
    if (r.ear_notch.status === "present") return { status: "marked", kind: "notch" };
    if (r.ear_notch.status === "absent" && r.view_quality !== "poor") return { status: "unmarked", kind: "none" };
    return { status: "unknown", kind: "unknown" };
  }
  const used = (["paint", "collar", "ear_tag"] as const).filter((k) => markTypes.includes(k));
  // A reading made before ear tags were asked about can't settle an ear-tag survey.
  const statusOf = (k: VaccinationMark) => (k === "ear_tag" ? (r.ear_tag?.status ?? "not_visible") : r[k].status);
  const hit = used.find((k) => statusOf(k) === "present");
  if (hit) return { status: "marked", kind: hit };
  if (used.every((k) => statusOf(k) === "absent") && r.view_quality !== "poor") return { status: "unmarked", kind: "none" };
  return { status: "unknown", kind: "unknown" };
}

