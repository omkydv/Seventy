import type { MarkReading } from "./types";

export type MarkStatus = "marked" | "unmarked" | "unknown";
export type MarkKind = "paint" | "collar" | "ear_tag" | "notch" | "none" | "unknown";
export type VaccinationMark = "paint" | "collar" | "ear_tag";

export const MARK_NAMES: Record<VaccinationMark, string> = {
  paint: "Paint or crayon",
  collar: "Collar or band",
  ear_tag: "Ear tag",
};

/** Marks SAM 3.1 can look for by itself, and the words it is given. */
export const SECOND_OPINION: Partial<Record<VaccinationMark, string>> = { collar: "collar", ear_tag: "ear tag" };

/**
 * Do Muse Spark and SAM 3.1 disagree about a mark? Only a clear call counts:
 * "not visible" never disagrees, and a mark SAM wasn't asked about is left alone.
 */
export function disagrees(r: Pick<MarkReading, "collar" | "ear_tag" | "second">, k: "collar" | "ear_tag"): boolean {
  const sam = r.second?.[k];
  if (!sam) return false;
  const spark = k === "collar" ? r.collar.status : (r.ear_tag?.status ?? "not_visible");
  return (spark === "present" && !sam.found) || (spark === "absent" && sam.found);
}

/**
 * A view clear enough to call a dog not marked when no mark is found on it. Only a poor
 * view, or a reading Muse Spark itself rates below one in two, is too unsure to call.
 * Counting an unseen mark as no mark can only lower coverage, so an area is never passed too early.
 */
export function clearView(r: Pick<MarkReading, "view_quality" | "confidence">): boolean {
  return r.view_quality !== "poor" && !(typeof r.confidence === "number" && r.confidence < 0.5);
}

/** Map a reading to the walk's question: vaccinated (paint, collar or ear tag) or sterilized (ear notch). */
export function classify(
  r: Pick<MarkReading, "is_dog" | "paint" | "collar" | "ear_notch" | "ear_tag" | "view_quality" | "confidence" | "second">,
  target: "vaccination" | "sterilization",
  markTypes: string[],
): { status: MarkStatus; kind: MarkKind } {
  if (!r.is_dog) return { status: "unknown", kind: "unknown" };
  if (target === "sterilization") {
    if (r.ear_notch.status === "present") return { status: "marked", kind: "notch" };
    if (clearView(r)) return { status: "unmarked", kind: "none" };
    return { status: "unknown", kind: "unknown" };
  }
  const used = (["paint", "collar", "ear_tag"] as const).filter((k) => markTypes.includes(k));
  // When the two Meta models disagree about a mark this walk counts, a person decides.
  if (used.some((k) => k !== "paint" && disagrees(r, k))) return { status: "unknown", kind: "unknown" };
  const statusOf = (k: VaccinationMark) => (k === "ear_tag" ? r.ear_tag?.status : r[k].status);
  const hit = used.find((k) => statusOf(k) === "present");
  if (hit) return { status: "marked", kind: hit };
  // A reading made before ear tags were asked about can't settle an ear-tag survey.
  if (used.some((k) => statusOf(k) === undefined)) return { status: "unknown", kind: "unknown" };
  if (clearView(r)) return { status: "unmarked", kind: "none" };
  return { status: "unknown", kind: "unknown" };
}
