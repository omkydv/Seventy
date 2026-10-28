"use client";

import { useEffect, useState } from "react";
import { clock } from "@/lib/format";
import type { Chunk, WalkState } from "@/lib/types";

export type LocalStage = {
  kind: "preparing" | "uploading" | "cropping" | "sending";
  index: number;
  total: number;
  progress: number;
  chunk: number;
};

type StepState = "done" | "now" | "next";
type Step = { key: string; name: string; who: string; detail?: string; state: StepState };

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

function Piece({ c, now }: { c: Chunk; now: number }) {
  const started = c.submitted_at ? new Date(c.submitted_at).getTime() : null;
  const ended = c.completed_at ? new Date(c.completed_at).getTime() : null;
  const secs = started ? Math.max(0, Math.round(((ended ?? now) - started) / 1000)) : null;
  const tone =
    c.status === "done" ? "bg-ink text-on-ink" : c.status === "failed" ? "bg-amber-soft text-ink" : c.status === "submitted" ? "bg-surface text-ink shadow-[inset_0_0_0_1.5px_var(--ink)]" : "bg-canvas-2 text-ink-3";
  const range = `${clock(c.start_s)} to ${clock(c.end_s)}`;
  return (
    <li className={`rounded-[14px] px-3.5 py-3 transition-colors duration-500 ${tone}`} title={range}>
      <p className="num text-[0.8125rem] opacity-80">{range}</p>
      <p className="num mt-0.5 text-[0.9375rem] font-semibold">
        {c.status === "done" && `${c.objects ?? 0} ${c.objects === 1 ? "dog" : "dogs"}`}
        {c.status === "submitted" && `Counting, ${secs ?? 0}s`}
        {c.status === "failed" && "Stopped"}
        {(c.status === "pending" || c.status === "uploaded") && "Waiting"}
      </p>
    </li>
  );
}

export function Pipeline({ state, local }: { state: WalkState; local: LocalStage | null }) {
  const { walk, chunks, dogs } = state;
  const now = useNow();
  const order = ["uploading", "tracking", "stitching", "needs_crops", "reading"];
  const at = Math.max(0, order.indexOf(walk.status));
  const tracked = chunks.filter((c) => c.status === "done").length;
  const sent = chunks.filter((c) => c.status === "submitted" || c.status === "done").length;
  const read = dogs.filter((d) => d.mark != null).length;
  const allSent = sent === chunks.length && chunks.length > 0;

  const steps: Step[] = [
    {
      key: "prepare",
      name: "Prepare the video on this phone",
      who: "This device",
      detail:
        local?.kind === "preparing"
          ? `Piece ${local.index + 1} of ${local.total}, ${Math.round(local.progress * 100)}%`
          : `${sent} of ${chunks.length} pieces sent`,
      state: at > 0 || allSent ? "done" : "now",
    },
    {
      key: "track",
      name: "Track every dog",
      who: "SAM 3.1",
      detail: sent ? `${tracked} of ${chunks.length} pieces counted` : undefined,
      state: at > 1 ? "done" : sent > 0 ? "now" : "next",
    },
    {
      key: "join",
      name: "Join the pieces into one count",
      who: "Seventy",
      detail: at > 2 ? `${dogs.length} different dogs` : undefined,
      state: at > 2 ? "done" : at === 2 ? "now" : "next",
    },
    {
      key: "crops",
      name: "Cut full-resolution close-ups",
      who: "This device",
      detail:
        local?.kind === "cropping"
          ? `${local.index} of ${local.total} frames`
          : local?.kind === "sending"
            ? `Sending ${local.index} of ${local.total}`
            : undefined,
      state: at > 3 ? "done" : at === 3 ? "now" : "next",
    },
    {
      key: "read",
      name: "Read each dog’s marks",
      who: "Muse Spark",
      detail: at === 4 ? `${read} of ${dogs.length} dogs read` : undefined,
      state: at === 4 ? "now" : "next",
    },
  ];

  const current = steps.find((s) => s.state === "now") ?? steps[0];
  const headline =
    current.key === "prepare"
      ? "Preparing the walk"
      : current.key === "track" || current.key === "join"
        ? "Counting the dogs on this walk"
        : current.key === "crops"
          ? "Cutting a close-up of every dog"
          : "Reading every vaccination mark";

  return (
    <section className="mt-10 grid grid-cols-12 gap-y-8 lg:gap-x-8" aria-live="polite">
      <div className="panel col-span-12 p-7 md:p-9 lg:col-span-7">
        <p className="text-[0.9375rem] font-semibold text-mark-strong">In progress</p>
        <h2 className="display-quiet mt-2 text-3xl md:text-4xl">{headline}</h2>
        <p className="mt-3 text-ink-2">
          {current.who === "This device" ? "Keep this tab open. " : ""}
          {current.detail ?? "Starting"}
        </p>
        {local && (local.kind === "preparing" || local.kind === "cropping" || local.kind === "sending") && (
          <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-canvas-2" role="progressbar" aria-valuenow={Math.round(local.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-ink transition-[width] duration-300" style={{ width: `${Math.round(local.progress * 100)}%` }} />
          </div>
        )}

        <h3 className="mt-10 text-[0.9375rem] font-semibold">The walk, in thirty-second pieces</h3>
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {chunks.map((c) => (
            <Piece key={c.idx} c={c} now={now} />
          ))}
        </ul>
        <p className="mt-4 text-[0.875rem] text-ink-3">
          Pieces are counted at the same time and overlap by two seconds, so a dog crossing from one piece into the next is
          matched and counted once.
        </p>
      </div>

      <ol className="col-span-12 lg:col-span-5">
        {steps.map((st, i) => (
          <li key={st.key} className="grid grid-cols-[2.25rem_1fr] gap-x-4 py-3.5">
            <span
              aria-hidden
              className={`num flex size-8 items-center justify-center rounded-full text-[0.875rem] font-semibold transition-colors ${
                st.state === "done" ? "bg-mark text-white" : st.state === "now" ? "bg-ink text-on-ink" : "bg-canvas-2 text-ink-3"
              }`}
            >
              {st.state === "done" ? (
                <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3.5 8.5 3 3 6-7" />
                </svg>
              ) : (
                i + 1
              )}
            </span>
            <div className="pt-0.5">
              <p className={`font-semibold ${st.state === "next" ? "text-ink-3" : "text-ink"}`}>{st.name}</p>
              <p className="text-[0.875rem] text-ink-3">
                {st.who}
                {st.state !== "next" && st.detail ? `, ${st.detail}` : ""}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
