import type { Coverage } from "./stats";

export type WalkStatus = "created" | "uploading" | "tracking" | "stitching" | "needs_crops" | "reading" | "review" | "done" | "failed";

export type WalkStats = Coverage & { target: string; dogs: number; excluded: number };

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
  samples: { t: number; box: [number, number, number, number] }[];
  crops: { path: string; t: number; sharpness?: number }[];
  mark: (MarkReading & { error?: string; skipped?: boolean }) | null;
  mark_status: "marked" | "unmarked" | "unknown" | null;
  mark_kind: string | null;
  review_status: string | null;
  reading_ms: number | null;
};

export type WalkState = {
  walk: Walk;
  chunks: Chunk[];
  dogs: Dog[];
  owner: boolean;
  media: { chunks: { idx: number; video: string | null; sam: string | null }[]; crops: Record<string, string[]> } | null;
};

export const effectiveStatus = (d: Dog) => (d.review_status ?? d.mark_status ?? "unknown") as "marked" | "unmarked" | "unknown" | "not_a_dog" | "duplicate";
