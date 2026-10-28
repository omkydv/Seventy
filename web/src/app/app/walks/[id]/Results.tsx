"use client";

import { useState } from "react";
import { CoverageMeter } from "@/components/CoverageMeter";
import { DogGlyph, type GlyphStatus } from "@/components/DogGlyph";
import { WalkReplay } from "@/components/WalkReplay";
import { api } from "@/lib/client/workspace";
import { clock, plural } from "@/lib/format";
import { TARGET } from "@/lib/stats";
import { effectiveStatus, type Dog, type WalkState } from "@/lib/types";
import { ReportPanel } from "./ReportPanel";

const STATUS_TEXT: Record<string, string> = {
  marked: "Marked",
  unmarked: "Not marked",
  unknown: "Can’t tell",
  not_a_dog: "Not a dog",
  duplicate: "Duplicate",
};

const glyphFor = (s: string): GlyphStatus => (s === "marked" ? "marked" : s === "unknown" ? "unknown" : s === "unmarked" ? "unmarked" : "empty");

const CHIP_TONE: Record<string, string> = {
  marked: "bg-mark-soft",
  unmarked: "bg-canvas-2",
  unknown: "shadow-[inset_0_0_0_1px_var(--line-strong)]",
};

function StatusChip({ status }: { status: string }) {
  return (
    <span className={`pill text-ink ${CHIP_TONE[status] ?? "bg-canvas-2 text-ink-3 line-through"}`}>
      <DogGlyph status={glyphFor(status)} size={18} />
      {STATUS_TEXT[status]}
    </span>
  );
}

function Legend() {
  return (
    <p className="flex flex-wrap gap-x-5 gap-y-1 text-[0.875rem] text-ink-2">
      {(["marked", "unmarked", "unknown"] as const).map((s) => (
        <span key={s} className="flex items-center gap-1.5">
          <DogGlyph status={s} size={18} /> {STATUS_TEXT[s]}
        </span>
      ))}
    </p>
  );
}

/** Every dog on the walk, as the landing page draws them, linked to its card. */
function DogRow({ dogs }: { dogs: Dog[] }) {
  return (
    <div className="-mx-7 -mb-7 mt-10 rounded-b-[24px] bg-surface-2 px-7 pb-7 pt-6 md:-mx-10 md:-mb-10 md:px-10 md:pb-9">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <p className="num text-[0.9375rem] font-semibold text-ink-2">{plural(dogs.length, "dog")} on this walk, each counted once</p>
        <Legend />
      </div>
      <div className="mt-4 flex flex-wrap gap-1">
        {dogs.map((d) => {
          const s = effectiveStatus(d);
          return (
            <a
              key={d.id}
              href={`#dog-${d.label}`}
              className="rounded-lg p-1 transition-colors hover:bg-canvas-2"
              aria-label={`Dog ${d.label}, ${STATUS_TEXT[s]}`}
            >
              <DogGlyph status={glyphFor(s)} size={34} />
            </a>
          );
        })}
      </div>
    </div>
  );
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
  const paint =
    m.paint.status === "present"
      ? `Paint${m.paint.color ? `, ${m.paint.color}` : ""}${m.paint.location ? ` on the ${m.paint.location}` : ""}`
      : m.paint.status === "absent"
        ? "No paint"
        : "Paint not visible";
  const collar =
    m.collar.status === "present" ? `collar${m.collar.color ? `, ${m.collar.color}` : ""}` : m.collar.status === "absent" ? "no collar" : "collar not visible";
  return `${paint}, ${collar}`;
}

function Verdict({ state }: { state: WalkState }) {
  const { walk, dogs } = state;
  const st = walk.stats;
  if (!st) return null;

  if (walk.mode === "plan") {
    const n = st.dogs;
    return (
      <section className="panel mt-10 p-7 md:p-10">
        <div className="grid grid-cols-12 gap-y-6 md:gap-x-8">
          <div className="col-span-12 md:col-span-6">
            <p className="text-[0.9375rem] font-semibold text-ink-2">Dogs on this walk</p>
            <p className="display num mt-2 text-7xl md:text-8xl">{n}</p>
            <p className="mt-2 text-ink-2">Each one counted once, across the whole walk.</p>
          </div>
          <div className="col-span-12 self-end md:col-span-6">
            <p className="text-xl font-semibold tracking-[-0.01em]">Carry at least {plural(Math.ceil(TARGET * n), "dose")} to reach 70% of the dogs seen.</p>
            <p className="mt-3 text-ink-2">
              More dogs live here than one walk sees. Walk the same route on another morning and Seventy will estimate the whole population.
            </p>
            {st.marked > 0 && (
              <p className="num mt-4 text-[0.9375rem] text-ink-3">
                {plural(st.marked, "dog")} already carry a mark, and {plural(st.unknown, "dog")} couldn’t be read.
              </p>
            )}
          </div>
        </div>
        <DogRow dogs={dogs} />
      </section>
    );
  }

  const ci = st.ci;
  const pill =
    st.status === "confident"
      ? { text: "Complete", tone: "bg-mark-soft" }
      : st.status === "complete"
        ? { text: "Complete, not yet certain", tone: "bg-mark-soft" }
        : st.status === "below"
          ? { text: "Below the 70% line", tone: "bg-amber-soft" }
          : { text: "Too few dogs to call", tone: "bg-canvas-2" };
  const next =
    st.status === "confident"
      ? "The whole interval clears the line. The team can move on to the next area."
      : st.status === "complete"
        ? "The estimate clears the line but the interval does not. One more street would settle it."
        : st.status === "below"
          ? `Vaccinate about ${plural(st.toGo, "more dog")} among those seen to reach 70%, then check again.`
          : "Film a longer walk through the area before deciding.";
  // A percentage from a handful of dogs reads as a finding, so a thin walk leads with what is missing instead.
  const enough = st.status !== "insufficient";

  return (
    <section className="panel mt-10 p-7 md:p-10">
      <div className="flex flex-wrap items-start justify-between gap-x-10 gap-y-6">
        <div className="max-w-2xl">
          <p className="text-[0.9375rem] font-semibold text-ink-2">
            {walk.target_mark === "sterilization" ? "Sterilization coverage" : "Vaccination coverage"}
          </p>
          {enough ? (
            <>
              <p className="display num mt-2 text-7xl md:text-8xl">{(ci.p * 100).toFixed(1)}%</p>
              <span className={`pill mt-3 text-ink ${pill.tone}`}>{pill.text}</span>
            </>
          ) : (
            <>
              <p className="display mt-3 text-balance text-[2.5rem] sm:text-5xl md:text-6xl">Not enough dogs yet.</p>
              <p className="num mt-4 text-lg text-ink-2">
                Seventy could read {st.readable ? st.readable : "none"} of the {plural(st.dogs, "dog")} on this walk. It makes a call once it can read ten.
              </p>
            </>
          )}
        </div>
        <dl className="num grid grid-cols-[auto_auto] gap-x-8 gap-y-2 text-[0.9375rem]">
          <dt className="text-ink-3">95% interval</dt>
          <dd className="text-right font-semibold">
            {(ci.low * 100).toFixed(1)} to {(ci.high * 100).toFixed(1)}%
          </dd>
          <dt className="text-ink-3">Marked</dt>
          <dd className="text-right font-semibold">{st.marked}</dd>
          <dt className="text-ink-3">Not marked</dt>
          <dd className="text-right font-semibold">{st.unmarked}</dd>
          <dt className="text-ink-3">Can’t tell</dt>
          <dd className="text-right font-semibold">{st.unknown}</dd>
        </dl>
      </div>
      <div className="mt-10">
        <CoverageMeter p={ci.p} low={ci.low} high={ci.high} immediate />
      </div>
      <p className="mt-6 text-lg font-semibold tracking-[-0.01em]">{next}</p>
      {st.unknown > 0 && (
        <p className="num mt-2 text-[0.9375rem] text-ink-3">
          If every dog it couldn’t read were marked, coverage would be {(st.best * 100).toFixed(0)}%; if none were, {(st.worst * 100).toFixed(0)}%.
        </p>
      )}
      <DogRow dogs={dogs} />
    </section>
  );
}

function DogCard({
  d,
  crop,
  target,
  canReview,
  busy,
  onReview,
}: {
  d: Dog;
  crop?: string;
  target: string;
  canReview: boolean;
  busy: boolean;
  onReview: (status: string) => void;
}) {
  const s = effectiveStatus(d);
  return (
    <li id={`dog-${d.label}`} className="panel scroll-mt-24 overflow-hidden">
      <div className="relative aspect-[4/3] bg-canvas-2">
        {crop ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={crop} alt={`Close-up of dog ${d.label}`} className="size-full object-cover" loading="lazy" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center">
            <DogGlyph status={glyphFor(s)} size={56} />
          </span>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-lg font-semibold tracking-[-0.01em]">Dog {d.label}</p>
          <StatusChip status={s} />
        </div>
        <p className="mt-2 text-[0.9375rem] text-ink-2">{markLine(d, target)}</p>
        {d.mark && !d.mark.error && !d.mark.skipped && <p className="mt-2 text-[0.9375rem] text-ink-3">{d.mark.reason}</p>}
        <p className="num mt-3 text-[0.8125rem] text-ink-3">
          Seen {clock(d.first_s)} to {clock(d.last_s)}
          {d.review_status ? ", checked by a person" : ""}
        </p>
        {canReview && (
          <div className="mt-4 grid grid-cols-3 gap-1.5 rounded-[12px] bg-canvas p-1" role="group" aria-label={`Your call on dog ${d.label}`}>
            {(["marked", "unmarked", "unknown"] as const).map((v) => (
              <button
                key={v}
                type="button"
                disabled={busy}
                aria-pressed={s === v}
                onClick={() => onReview(v)}
                className={`h-9 rounded-[9px] text-[0.8125rem] font-semibold transition-colors ${s === v ? "bg-surface text-ink shadow-[0_1px_2px_rgb(var(--shadow)/0.15)]" : "text-ink-2 hover:text-ink"}`}
              >
                {STATUS_TEXT[v]}
              </button>
            ))}
          </div>
        )}
      </div>
    </li>
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
  const dogs = state.dogs.map((d) => ({
    label: d.label,
    status: effectiveStatus(d),
    segments: d.segments ?? [],
  }));
  return (
    <section className="mt-16">
      <h2 className="text-xl font-semibold tracking-[-0.01em]">The walk, as SAM 3.1 tracked it</h2>
      <p className="mt-1 text-ink-2">Each dog keeps its number from the first frame it appears to the last.</p>
      <div className="mt-5">
        <WalkReplay chunks={chunks} dogs={dogs} />
      </div>
    </section>
  );
}

export function Results({ state, onChange }: { state: WalkState; onChange: (s: WalkState) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unknown">("all");
  const target = state.walk.target_mark;
  const crops = state.media?.crops ?? {};
  const unknown = state.dogs.filter((d) => effectiveStatus(d) === "unknown");
  const shown = filter === "unknown" ? unknown : state.dogs;

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
      <Verdict state={state} />
      {state.owner && unknown.length > 0 && (
        <div className="mt-6 flex flex-col gap-3 rounded-[18px] bg-surface px-6 py-5 shadow-[inset_0_0_0_1px_var(--line-strong)] sm:flex-row sm:items-center sm:justify-between">
          <p>
            <span className="font-semibold">{plural(unknown.length, "dog")} need your eyes.</span>{" "}
            <span className="text-ink-2">The model couldn’t see their marks clearly. Look at each close-up and choose.</span>
          </p>
          <button type="button" onClick={() => setFilter(filter === "unknown" ? "all" : "unknown")} className="btn btn-secondary btn-sm">
            {filter === "unknown" ? "Show every dog" : "Review them"}
          </button>
        </div>
      )}
      <Replay state={state} />
      <section className="mt-16">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-[-0.01em]">{filter === "unknown" ? "Dogs to review" : "Every dog, once"}</h2>
          <p className="num text-[0.9375rem] text-ink-3">{plural(shown.length, "dog")}</p>
        </div>
        <ul className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy={busy != null}>
          {shown.map((d) => (
            <DogCard
              key={d.id}
              d={d}
              crop={crops[d.id]?.[0]}
              target={target}
              canReview={state.owner}
              busy={busy === d.id}
              onReview={(st) => review(d.id, st)}
            />
          ))}
        </ul>
      </section>
      <ReportPanel walkId={state.walk.id} owner={state.owner} />
    </>
  );
}
