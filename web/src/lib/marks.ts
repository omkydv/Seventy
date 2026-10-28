import type { MarkReading } from "./types";

export type MarkStatus = "marked" | "unmarked" | "unknown";
export type MarkKind = "paint" | "collar" | "notch" | "none" | "unknown";

/** Map a reading to the walk's question: vaccinated (paint/collar) or sterilized (ear notch). */
export function classify(
  r: Pick<MarkReading, "is_dog" | "paint" | "collar" | "ear_notch" | "view_quality">,
  target: "vaccination" | "sterilization",
  markTypes: string[],
): { status: MarkStatus; kind: MarkKind } {
  if (!r.is_dog) return { status: "unknown", kind: "unknown" };
  if (target === "sterilization") {
    if (r.ear_notch.status === "present") return { status: "marked", kind: "notch" };
    if (r.ear_notch.status === "absent" && r.view_quality !== "poor") return { status: "unmarked", kind: "none" };
    return { status: "unknown", kind: "unknown" };
  }
  const usePaint = markTypes.includes("paint");
  const useCollar = markTypes.includes("collar");
  if (usePaint && r.paint.status === "present") return { status: "marked", kind: "paint" };
  if (useCollar && r.collar.status === "present") return { status: "marked", kind: "collar" };
  const seen = [usePaint ? r.paint.status : "absent", useCollar ? r.collar.status : "absent"];
  if (seen.every((s) => s === "absent") && r.view_quality !== "poor") return { status: "unmarked", kind: "none" };
  return { status: "unknown", kind: "unknown" };
}

