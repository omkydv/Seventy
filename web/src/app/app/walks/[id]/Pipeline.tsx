"use client";

import { useEffect, useState } from "react";
import type { Chunk, WalkState } from "@/lib/types";

export type LocalStage = {
  kind: "preparing" | "uploading" | "cropping" | "sending";
  index: number;
  total: number;
  progress: number;
  chunk: number;
};

type Step = { key: string; name: string; who: string; detail?: string; state: "done" | "now" | "next" };

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [active]);
  return now;
}

function ChunkCell({ c, now }: { c: Chunk; now: number }) {
  const started = c.submitted_at ? new Date(c.submitted_at).getTime() : null;
  const ended = c.completed_at ? new Date(c.completed_at).getTime() : null;
  const secs = started ? Math.round(((ended ?? now) - started) / 1000) : null;
  const tone =
    c.status === "done"
      ? "bg-ink text-paper border-ink"
      : c.status === "failed"
        ? "border-warn bg-warn-soft text-ink"
        : c.status === "submitted"
          ? "border-ink text-ink"
          : "border-line-strong text-ink-3";
  return (
    <li className={`rounded-[6px] border px-3 py-2.5 transition-colors duration-300 ${tone}`}>
      <p className="label num" style={{ color: "inherit" }}>
        Minute {c.idx + 1}
      </p>
      <p className="num mt-1 text-sm">
        {c.status === "done" && `${c.objects ?? 0} ${c.objects === 1 ? "dog" : "dogs"} · ${secs}s`}
        {c.status === "submitted" && `Tracking · ${secs ?? 0}s`}
        {c.status === "failed" && "Failed"}
        {(c.status === "pending" || c.status === "uploaded") && "Waiting"}
      </p>
    </li>
  );
}

export function Pipeline({ state, local }: { state: WalkState; local: LocalStage | null }) {
  const { walk, chunks, dogs } = state;
  const now = useNow(true);
  const order = ["uploading", "tracking", "stitching", "needs_crops", "reading"];
  const at = order.indexOf(walk.status);
  const tracked = chunks.filter((c) => c.status === "done").length;
  const submitted = chunks.filter((c) => c.status === "submitted" || c.status === "done").length;
  const read = dogs.filter((d) => d.mark != null).length;

  const steps: Step[] = [
    {
      key: "prepare",
      name: "Prepare the video on this device",
      who: "Browser",
      detail:
        local?.kind === "preparing"
          ? `Minute ${local.chunk + 1} of ${chunks.length}, ${Math.round(local.progress * 100)}%`
          : submitted
            ? `${submitted} of ${chunks.length} minutes sent`
            : undefined,
      state: at > 0 || (walk.status === "uploading" && submitted === chunks.length) ? "done" : "now",
    },
    {
      key: "track",
      name: "Track every dog",
      who: "SAM 3.1",
      detail: at >= 1 ? `${tracked} of ${chunks.length} minutes tracked` : undefined,
      state: at > 1 ? "done" : at === 1 || (at === 0 && submitted > 0) ? "now" : "next",
    },
    {
      key: "join",
      name: "Join the minutes into one count",
      who: "Seventy",
      detail: at > 2 ? `${dogs.length} different dogs` : undefined,
      state: at > 2 ? "done" : at === 2 ? "now" : "next",
    },
    {
      key: "crops",
      name: "Cut full-resolution close-ups",
      who: "Browser",
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
      who: "Muse Spark 1.3",
      detail: at === 4 ? `${read} of ${dogs.length} dogs read` : undefined,
      state: at === 4 ? "now" : at > 4 ? "done" : "next",
    },
  ];

  return (
    <section className="mt-10 grid grid-cols-12 gap-x-6 gap-y-10" aria-live="polite">
      <ol className="col-span-12 lg:col-span-5">
        {steps.map((st, i) => (
          <li key={st.key} className="grid grid-cols-[2rem_1fr] gap-x-3 border-b border-line py-4 last:border-b-0">
            <span
              aria-hidden
              className={`num mt-0.5 flex size-6 items-center justify-center rounded-full border text-xs ${
                st.state === "done" ? "border-ink bg-ink text-paper" : st.state === "now" ? "border-accent text-accent" : "border-line-strong text-ink-3"
              }`}
            >
              {i + 1}
            </span>
            <div>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className={st.state === "next" ? "text-ink-3" : "font-semibold"}>{st.name}</p>
                <span className="label">{st.who}</span>
              </div>
              {st.detail && <p className="num mt-1 text-sm text-ink-2">{st.detail}</p>}
              {st.state === "now" && local && (st.key === "prepare" || st.key === "crops") && (
                <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-paper-3">
                  <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${Math.round(local.progress * 100)}%` }} />
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
      <div className="col-span-12 lg:col-span-6 lg:col-start-7">
        <p className="label mb-3">The walk, minute by minute</p>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {chunks.map((c) => (
            <ChunkCell key={c.idx} c={c} now={now} />
          ))}
        </ul>
        <p className="mt-4 text-sm text-ink-3">
          Each minute is tracked separately and at the same time. Minutes overlap by two seconds, so a dog crossing from
          one into the next is matched and counted once.
        </p>
      </div>
    </section>
  );
}
