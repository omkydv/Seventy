import type { Coverage } from "./stats";

export type WalkStatus = "created" | "uploading" | "tracking" | "stitching" | "needs_crops" | "reading" | "review" | "done" | "failed";

export type WalkStats = Coverage & { target: string; dogs: number; excluded: number; repeats?: number; puppies?: number; onLead?: number };

export type Walk = {
  id: string;
  workspace_id: string;
  title: string | null;
  area_name: string | null;
  mode: "plan" | "check";
  target_mark: "vaccination" | "sterilization";
  mark_types: string[];
  status: WalkStatus;
  progress: { stage?: string; dogs?: number; via?: string };
  error: string | null;
  duration_s: number | null;
  src_width: number | null;
  src_height: number | null;
  proc_width?: number | null;
  proc_height?: number | null;
  area_id?: string | null;
  proc_fps: number;
  recorded_at: string | null;
  created_at: string;
  stats: WalkStats | null;
};

export type Chunk = {
  idx: number;
  start_s: number;
  end_s: number;
  status: "pending" | "uploaded" | "submitted" | "done" | "failed";
  frames: number | null;
  objects: number | null;
  error: string | null;
  submitted_at: string | null;
  completed_at: string | null;
};

export type MarkReading = {
  is_dog: boolean;
  paint: { status: string; color: string | null; location: string | null };
  collar: { status: string; color: string | null };
  ear_notch: { status: string; side: string | null };
  /** Older readings predate these three fields. */
  ear_tag?: { status: string; color: string | null };
  life_stage?: "adult" | "puppy" | "unknown";
  lead?: { status: string };
  /** SAM 3.1 looking for the mark itself, as a second opinion on Muse Spark's reading. */
  second?: Partial<Record<"collar" | "ear_tag", { found: boolean; conf: number | null }>>;
  coat: string;
  view_quality: "good" | "fair" | "poor";
  confidence: number;
  reason: string;
};

export type Dog = {
  id: string;
  label: number;
  first_s: number;
  last_s: number;
  frames: number;
  mean_conf: number | null;
  segments: { chunk: number; objectId: string }[];
  samples: { t: number; box: [number, number, number, number] }[];
  crops: { path: string; t: number; sharpness?: number }[];
  mark: (MarkReading & { error?: string; skipped?: boolean }) | null;
  mark_status: "marked" | "unmarked" | "unknown" | null;
  mark_kind: string | null;
  review_status: string | null;
  review_note?: string | null;
  /** This dog is an earlier dog seen again, so it is counted once. */
  same_as?: number | null;
  reading_ms: number | null;
};

export type UsageRow = { stage: string; model: string; units: number; unit: string; calls: number; seconds: number | null; cost_usd: number };
export type Repeat = { dog_a: string; dog_b: string; verdict: string; reason: string };

export type WalkState = {
  walk: Walk;
  chunks: Chunk[];
  dogs: Dog[];
  owner: boolean;
  usage?: UsageRow[];
  repeats?: Repeat[];
  media: {
    chunks: { idx: number; video: string | null; sam: string | null; people?: string | null }[];
    crops: Record<string, string[]>;
    ears?: Record<string, string[]>;
  } | null;
};

export const effectiveStatus = (d: Dog) =>
  (d.same_as ? "duplicate" : (d.review_status ?? d.mark_status ?? "unknown")) as "marked" | "unmarked" | "unknown" | "not_a_dog" | "duplicate";
