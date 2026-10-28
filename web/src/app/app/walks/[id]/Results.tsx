"use client";

import { useState } from "react";
import { CoverageMeter } from "@/components/CoverageMeter";
import { WalkReplay } from "@/components/WalkReplay";
import { ReportPanel } from "./ReportPanel";
import { api } from "@/lib/client/workspace";
import { clock, plural } from "@/lib/format";
import { TARGET } from "@/lib/stats";
import { effectiveStatus, type Dog, type WalkState } from "@/lib/types";

const STATUS_TEXT: Record<string, string> = {
  marked: "Marked",
  unmarked: "Unmarked",
  unknown: "Can’t tell",
  not_a_dog: "Not a dog",
  duplicate: "Duplicate",
};

function statusTone(s: string) {
  if (s === "marked") return "bg-accent text-accent-ink";
  if (s === "unmarked") return "bg-paper-3 text-ink";
  if (s === "unknown") return "border border-dashed border-line-strong text-ink-2";
  return "text-ink-3 line-through";
}

function markLine(d: Dog, target: string): string {
  const m = d.mark;
  if (!m || m.error || m.skipped) return m?.error ? "The reading failed for this dog." : "No close-up was available.";
  if (!m.is_dog) return "The model doesn’t think this is a dog.";
  if (target === "sterilization") {
    return m.ear_notch.status === "present"
      ? `Ear notch${m.ear_notch.side && m.ear_notch.side !== "unknown" ? `, ${m.ear_notch.side} ear` : ""}`
      : m.ear_notch.status === "absent"
        ? "No ear notch"
        : "Ears not visible";
  }
  const parts = [
    m.paint.status === "present" ? `Paint${m.paint.color ? `, ${m.paint.color}` : ""}${m.paint.location ? ` on ${m.paint.location}` : ""}` : m.paint.status === "absent" ? "No paint" : "Paint not visible",
    m.collar.status === "present" ? `Collar${m.collar.color ? `, ${m.collar.color}` : ""}` : m.collar.status === "absent" ? "no collar" : "collar not visible",
  ];
  return parts.join(", ");
}

function Summary({ state }: { state: WalkState }) {
  const { walk } = state;
  const st = walk.stats;
  if (!st) return null;
  if (walk.mode === "plan") {
    const n = st.dogs;
    return (
      <section className="mt-10 grid grid-cols-12 gap-x-6 gap-y-6 border-b border-line pb-10">
        <div className="col-span-12 md:col-span-6">
          <p className="label">Dogs on this walk</p>
          <p className="display num mt-2 text-8xl md:text-[8rem]">{n}</p>
          <p className="mt-2 text-ink-2">Each counted once, from the whole walk.</p>
        </div>
        <div className="col-span-12 self-end md:col-span-6">
          <p className="text-lg text-ink">
            To reach {Math.round(TARGET * 100)}% among the dogs seen, a team needs at least{" "}
            <span className="font-semibold">{plural(Math.ceil(TARGET * n), "dose")}</span>.
          </p>
          <p className="mt-2 text-ink-2">
            More dogs live here than one walk sees. Walk the same route on another morning and Seventy will estimate the
            whole population.
          </p>
          {st.marked > 0 && (
            <p className="num mt-4 text-sm text-ink-2">
              {plural(st.marked, "dog")} already carry a mark; {plural(st.unknown, "dog")} couldn’t be read.
            </p>
          )}
        </div>
      </section>
    );
  }
  const ci = st.ci;
  const sentence =
    st.status === "confident"
      ? "Complete. The whole interval clears the line."
      : st.status === "complete"
        ? "Complete on the estimate, not yet certain. One more street would settle it."
        : st.status === "below"
          ? `Below ${Math.round(TARGET * 100)}. About ${plural(st.toGo, "more dog")} to vaccinate among those seen.`
          : "Too few readable dogs to call. Walk more of the area.";
  return (
    <section className="mt-10 border-b border-line pb-10">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="label">{walk.target_mark === "sterilization" ? "Sterilization coverage" : "Vaccination coverage"}</p>
          <p className="display num mt-2 text-8xl md:text-[8rem]">{(ci.p * 100).toFixed(1)}%</p>
        </div>
        <dl className="num grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
          <dt className="text-ink-3">95% interval</dt>
          <dd>
            {(ci.low * 100).toFixed(1)} to {(ci.high * 100).toFixed(1)}
          </dd>
          <dt className="text-ink-3">Marked</dt>
          <dd>{st.marked}</dd>
          <dt className="text-ink-3">Unmarked</dt>
          <dd>{st.unmarked}</dd>
          <dt className="text-ink-3">Can’t tell</dt>
          <dd>{st.unknown}</dd>
        </dl>
      </div>
      <div className="mt-8">
        <CoverageMeter p={ci.p} low={ci.low} high={ci.high} />
      </div>
      <p className="mt-6 text-lg">
        <span className="font-semibold">{sentence}</span>
      </p>
      {st.unknown > 0 && (
        <p className="num mt-2 text-sm text-ink-2">
          If every dog it couldn’t read were marked, coverage would be {(st.best * 100).toFixed(0)}%; if none were, {(st.worst * 100).toFixed(0)}%.
        </p>
      )}
    </section>
  );
}

function DogRow({
  d,
  crop,
  target,
  canReview,
  onReview,
}: {
  d: Dog;
  crop?: string;
  target: string;
  canReview: boolean;
  onReview: (status: string) => void;
}) {
  const s = effectiveStatus(d);
  return (
    <li className="grid grid-cols-[5.5rem_1fr] gap-x-4 border-b border-line py-4 sm:grid-cols-[7rem_1fr_auto]">
      <div className="aspect-square overflow-hidden rounded-[6px] bg-paper-3">
        {crop ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={crop} alt={`Dog ${d.label}`} className="size-full object-cover" loading="lazy" />
        ) : null}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <p className="font-semibold">Dog {String(d.label).padStart(2, "0")}</p>
          <span className={`rounded-[4px] px-2 py-0.5 text-xs font-medium ${statusTone(s)}`}>{STATUS_TEXT[s]}</span>
          {d.review_status && <span className="label">Checked by a person</span>}
        </div>
        <p className="mt-1 text-sm text-ink-2">{markLine(d, target)}</p>
        {d.mark && !d.mark.error && !d.mark.skipped && (
          <p className="mt-1 text-sm italic text-ink-3">“{d.mark.reason}”</p>
        )}
        <p className="num mt-1 text-xs text-ink-3">
          Seen {clock(d.first_s)} to {clock(d.last_s)}
          {d.mark?.coat ? ` · ${d.mark.coat}` : ""}
        </p>
      </div>
      {canReview && (
        <div className="col-span-2 mt-3 flex flex-wrap gap-2 sm:col-span-1 sm:mt-0 sm:flex-col sm:items-end">
          {(["marked", "unmarked", "unknown", "not_a_dog"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onReview(v)}
              className={`h-8 rounded-[6px] border px-3 text-xs transition-colors ${s === v ? "border-ink bg-ink text-paper" : "border-line-strong hover:border-ink"}`}
            >
              {STATUS_TEXT[v]}
            </button>
          ))}
        </div>
      )}
    </li>
  );
}

function Timeline({ state }: { state: WalkState }) {
  const total = state.walk.duration_s ?? Math.max(1, ...state.dogs.map((d) => d.last_s));
  return (
    <section className="mt-12">
      <p className="label mb-3">Dogs along the walk</p>
      <div className="relative h-14 border-y border-line">
        {state.dogs.map((d) => {
          const s = effectiveStatus(d);
          const left = (d.first_s / total) * 100;
          const width = Math.max(0.6, ((d.last_s - d.first_s) / total) * 100);
          const lane = d.label % 3;
          return (
            <span
              key={d.id}
              title={`Dog ${d.label}: ${clock(d.first_s)} to ${clock(d.last_s)}`}
              className={`absolute h-2.5 rounded-full ${s === "marked" ? "bg-accent" : s === "unmarked" ? "bg-ink" : "bg-line-strong"}`}
              style={{ left: `${left}%`, width: `${width}%`, top: `${10 + lane * 14}px` }}
            />
          );
        })}
      </div>
      <div className="num mt-1 flex justify-between text-xs text-ink-3">
        <span>0:00</span>
        <span>{clock(total)}</span>
      </div>
    </section>
  );
}

function Replay({ state }: { state: WalkState }) {
  const media = state.media?.chunks ?? [];
  const chunks = state.chunks
    .map((c) => {
      const m = media.find((x) => x.idx === c.idx);
      return m?.video && m.sam ? { idx: c.idx, startS: c.start_s, video: m.video, sam: m.sam } : null;
    })
    .filter((c): c is NonNullable<typeof c> => c != null);
  if (!chunks.length) return null;
  const dogs = state.dogs.map((d) => ({ label: d.label, status: effectiveStatus(d), segments: d.segments ?? [] }));
  return (
    <section className="mt-12">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="label">The walk, as SAM 3.1 tracked it</p>
        <p className="label">
          <span className="text-accent">●</span> marked <span className="ml-2">○</span> unmarked
        </p>
      </div>
      <WalkReplay chunks={chunks} dogs={dogs} />
    </section>
  );
}

export function Results({ state, onChange }: { state: WalkState; onChange: (s: WalkState) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const target = state.walk.target_mark;
  const crops = state.media?.crops ?? {};
  const unknown = state.dogs.filter((d) => effectiveStatus(d) === "unknown");

  async function review(dogId: string, status: string) {
    setBusy(dogId);
    try {
      const next = await api<WalkState>(`/api/walks/${state.walk.id}/dogs/${dogId}`, { method: "PATCH", json: { status } });
      onChange({ ...state, ...next, media: state.media, owner: state.owner });
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <Summary state={state} />
      {state.owner && unknown.length > 0 && (
        <p className="mt-8 rounded-[8px] border border-line-strong bg-card px-4 py-3 text-sm">
          <span className="font-semibold">{plural(unknown.length, "dog")} need your eyes.</span> The model couldn’t read
          their marks. Look at each close-up and choose what you see.
        </p>
      )}
      <Replay state={state} />
      <Timeline state={state} />
      <section className="mt-12">
        <div className="flex items-baseline justify-between border-b border-ink pb-3">
          <h2 className="display text-3xl">Every dog, once</h2>
          <span className="label num">{plural(state.dogs.length, "dog")}</span>
        </div>
        <ul aria-busy={busy != null}>
          {state.dogs.map((d) => (
            <DogRow
              key={d.id}
              d={d}
              crop={crops[d.id]?.[0]}
              target={target}
              canReview={state.owner}
              onReview={(st) => review(d.id, st)}
            />
          ))}
        </ul>
      </section>
      <ReportPanel walkId={state.walk.id} owner={state.owner} />
    </>
  );
}
