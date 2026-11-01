"use client";

import { useMemo, useRef, useState } from "react";
import { CoverageMeter } from "@/components/CoverageMeter";
import { DogGlyph, type GlyphStatus } from "@/components/DogGlyph";
import { DogTimeline } from "@/components/DogTimeline";
import { WalkReplay, type ReplayHandle } from "@/components/WalkReplay";
import { api } from "@/lib/client/workspace";
import { clock, plural } from "@/lib/format";
import { disagrees, MARK_NAMES, type VaccinationMark } from "@/lib/marks";
import { TARGET, walkStats } from "@/lib/stats";
import { effectiveStatus, type Dog, type UsageRow, type WalkState, type WalkStats } from "@/lib/types";
import { ReportPanel } from "./ReportPanel";

const STATUS_TEXT: Record<string, string> = {
  marked: "Marked",
  unmarked: "Not marked",
  unknown: "Can’t tell",
  not_a_dog: "Not a dog",
  duplicate: "Seen again",
};

const glyphFor = (s: string): GlyphStatus =>
  s === "marked" ? "marked" : s === "unknown" ? "unknown" : s === "unmarked" || s === "counted" ? "unmarked" : "empty";

/**
 * Before a drive the question is how many dogs, not which are marked, so a dog
 * whose mark can't be read is drawn as simply counted.
 */
const shownStatus = (d: Dog, mode: string) => {
  const s = effectiveStatus(d);
  return mode === "plan" && (s === "unknown" || s === "unmarked") ? "counted" : s;
};

const CHIP_TONE: Record<string, string> = {
  marked: "bg-mark-soft",
  unmarked: "bg-canvas-2",
  unknown: "shadow-[inset_0_0_0_1px_var(--line-strong)]",
};

function StatusChip({ status }: { status: string }) {
  return (
    <span className={`pill text-ink ${CHIP_TONE[status] ?? "bg-canvas-2 text-ink-3"}`}>
      <DogGlyph status={glyphFor(status)} size={18} />
      {STATUS_TEXT[status]}
    </span>
  );
}

function Legend({ mode }: { mode: string }) {
  const items: [GlyphStatus, string][] =
    mode === "plan"
      ? [
          ["unmarked", "Counted"],
          ["marked", "Already marked"],
        ]
      : [
          ["marked", STATUS_TEXT.marked],
          ["unmarked", STATUS_TEXT.unmarked],
          ["unknown", STATUS_TEXT.unknown],
        ];
  return (
    <p className="flex flex-wrap gap-x-4 gap-y-1 text-[0.8125rem] text-ink-2">
      {items.map(([g, text]) => (
        <span key={text} className="flex items-center gap-1.5">
          <DogGlyph status={g} size={16} /> {text}
        </span>
      ))}
    </p>
  );
}

const NOUN: Record<VaccinationMark, string> = { paint: "paint", collar: "collar", ear_tag: "ear tag" };

/** What the reading says about the marks this walk is looking for, in one plain line. */
function markLine(d: Dog, target: string, markTypes: string[]): string {
  const m = d.mark;
  if (!m || m.error || m.skipped) return m?.error ? "The reading failed for this dog." : "No close-up was available.";
  if (!m.is_dog) return "The model doesn’t think this is a dog.";
  if (target === "sterilization") {
    return m.ear_notch.status === "present"
      ? `Ear notch${m.ear_notch.side && m.ear_notch.side !== "unknown" ? `, ${m.ear_notch.side} ear` : ""}`
      : m.ear_notch.status === "absent"
        ? "No ear notch"
        : d.mark_status === "unmarked"
          ? "No ear notch seen"
          : "Ears not visible";
  }
  const types = (["paint", "collar", "ear_tag"] as const).filter((k) => markTypes.includes(k));
  const parts = types.map((k) => {
    const status = k === "ear_tag" ? (m.ear_tag?.status ?? "not_visible") : m[k].status;
    const color = k === "ear_tag" ? m.ear_tag?.color : k === "collar" ? m.collar.color : m.paint.color;
    if (status === "present") return `${MARK_NAMES[k].split(" or ")[0]}${color ? `, ${color}` : ""}`;
    if (status === "absent") return `no ${NOUN[k]}`;
    // Seen well enough to count as not marked, though the mark's spot itself wasn't sharp.
    return d.mark_status === "unmarked" ? `no ${NOUN[k]} seen` : `${NOUN[k]} not visible`;
  });
  const line = parts.join(", ");
  return line.charAt(0).toUpperCase() + line.slice(1);
}

/** SAM 3.1's own search for the mark, in one plain line per mark it looked for. */
function secondLines(d: Dog): { text: string; split: boolean }[] {
  const second = d.mark?.second;
  if (!second || !d.mark) return [];
  return (["collar", "ear_tag"] as const)
    .filter((k) => second[k])
    // Once a dog's status is settled, an old disagreement is no longer news.
    .filter((k) => !disagrees(d.mark!, k) || effectiveStatus(d) === "unknown")
    .map((k) => {
      const split = disagrees(d.mark!, k);
      return {
        split,
        text: `SAM 3.1 also looked for ${k === "collar" ? "a collar" : "an ear tag"} and ${second[k]!.found ? "found one" : "found none"}.${split ? " The two models disagree, so a person decides." : ""}`,
      };
    });
}

/** Every dog on the walk, as the landing page draws them. */
function GlyphRow({ dogs, mode }: { dogs: Dog[]; mode: string }) {
  return (
    <div className="mt-6 border-t border-line pt-5">
      <Legend mode={mode} />
      <div className="mt-3 flex flex-wrap gap-0.5">
        {dogs
          .filter((d) => effectiveStatus(d) !== "duplicate")
          .map((d) => {
            const s = shownStatus(d, mode);
            return (
              <a key={d.id} href={`#dog-${d.label}`} className="rounded-md p-0.5 transition-colors hover:bg-canvas-2" aria-label={`Dog ${d.label}, ${STATUS_TEXT[s]}`}>
                <DogGlyph status={glyphFor(s)} size={26} />
              </a>
            );
          })}
      </div>
    </div>
  );
}

function Verdict({ walk, st, dogs }: { walk: WalkState["walk"]; st: WalkStats; dogs: Dog[] }) {
  const short = (walk.duration_s ?? 0) < 90;
  const extras = [
    st.repeats ? `${plural(st.repeats, "dog")} seen again, counted once` : null,
    st.puppies ? `${plural(st.puppies, "puppy", "puppies")} among them` : null,
    st.onLead ? `${plural(st.onLead, "dog")} on a lead, with an owner` : null,
  ].filter(Boolean) as string[];

  if (walk.mode === "plan") {
    const n = st.dogs;
    return (
      <section className="panel p-6 md:p-7">
        <p className="text-[0.9375rem] font-semibold text-ink-2">Dogs on this walk</p>
        <p className="display num mt-1 text-7xl">{n}</p>
        <p className="mt-1 text-ink-2">Each one counted once.</p>
        <p className="mt-5 text-lg font-semibold leading-snug tracking-[-0.01em]">Bring at least {plural(Math.ceil(TARGET * n), "dose")} to reach 70% of the dogs seen.</p>
        {extras.length > 0 && (
          <ul className="num mt-4 space-y-1 text-[0.9375rem] text-ink-2">
            {extras.map((e) => (
              <li key={e}>{e.charAt(0).toUpperCase() + e.slice(1)}.</li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-[0.875rem] leading-relaxed text-ink-3">
          More dogs live here than one walk sees; two walks of the same route give a population estimate.
        </p>
        <GlyphRow dogs={dogs} mode="plan" />
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
          : { text: "Needs ten readable dogs", tone: "bg-canvas-2" };
  const next =
    st.status === "confident"
      ? "The whole interval clears the line. The team can move on to the next area."
      : st.status === "complete"
        ? "The estimate clears the line but the interval does not. One more street would settle it."
        : st.status === "below"
          ? `Vaccinate about ${plural(st.toGo, "more dog")} among those seen to reach 70%, then check again.`
          : short
            ? "A full ten-minute walk through the area gives Seventy enough dogs to call it."
            : "A longer walk through the area gives Seventy enough dogs to call it.";
  // A percentage from a handful of dogs reads as a finding, so a thin walk leads with what is missing instead.
  const enough = st.status !== "insufficient";
  const mark = walk.mark_types?.length === 1 ? MARK_NAMES[walk.mark_types[0] as VaccinationMark] : null;

  return (
    <section className="panel p-6 md:p-7">
      <p className="text-[0.9375rem] font-semibold text-ink-2">
        {walk.target_mark === "sterilization" ? "Sterilization coverage" : "Vaccination coverage"}
        {mark ? <span className="font-normal text-ink-3">, read from the {mark.toLowerCase()}</span> : null}
      </p>
      {enough ? (
        <>
          <p className="display num mt-1 text-7xl">{(ci.p * 100).toFixed(0)}%</p>
          <span className={`pill mt-2 text-ink ${pill.tone}`}>{pill.text}</span>
        </>
      ) : (
        <>
          <p className="display mt-2 text-balance text-[2.25rem] leading-[1.04]">Coverage is called from ten readable dogs.</p>
          <p className="num mt-3 text-ink-2">
            Seventy read {st.readable ? st.readable : "none"} of the {plural(st.dogs, "dog")} on this walk, so it doesn’t guess a percentage yet.
          </p>
        </>
      )}
      <dl className="num mt-5 grid grid-cols-[1fr_auto] gap-y-1.5 text-[0.9375rem]">
        <dt className="text-ink-3">Marked</dt>
        <dd className="text-right font-semibold">{st.marked}</dd>
        <dt className="text-ink-3">Not marked</dt>
        <dd className="text-right font-semibold">{st.unmarked}</dd>
        <dt className="text-ink-3">Can’t tell</dt>
        <dd className="text-right font-semibold">{st.unknown}</dd>
        {enough && (
          <>
            <dt className="text-ink-3">95% interval</dt>
            <dd className="text-right font-semibold">
              {(ci.low * 100).toFixed(0)} to {(ci.high * 100).toFixed(0)}%
            </dd>
          </>
        )}
      </dl>
      {enough && (
        <div className="mt-6">
          <CoverageMeter p={ci.p} low={ci.low} high={ci.high} immediate />
        </div>
      )}
      <p className="mt-5 font-semibold leading-snug tracking-[-0.01em]">{next}</p>
      {extras.length > 0 && <p className="num mt-2 text-[0.875rem] text-ink-3">{extras.join(". ")}.</p>}
      <GlyphRow dogs={dogs} mode="check" />
    </section>
  );
}

function SurveyPlayer({
  state,
  dogs,
  selected,
  onSelect,
  replayRef,
}: {
  state: WalkState;
  dogs: Dog[];
  selected: number | null;
  onSelect: (label: number) => void;
  replayRef: React.RefObject<ReplayHandle | null>;
}) {
  const [time, setTime] = useState(0);
  const media = state.media?.chunks ?? [];
  const chunks = state.chunks
    .map((c) => {
      const m = media.find((x) => x.idx === c.idx);
      return m?.video && m.sam ? { idx: c.idx, startS: c.start_s, video: m.video, sam: m.sam, people: m.people ?? null } : null;
    })
    .filter((c): c is NonNullable<typeof c> => c != null);
  const mode = state.walk.mode;
  const replayDogs = useMemo(() => dogs.map((d) => ({ label: d.label, status: shownStatus(d, mode), segments: d.segments ?? [] })), [dogs, mode]);
  if (!chunks.length) return null;
  const w = state.walk;
  const aspect = w.proc_width && w.proc_height ? w.proc_width / w.proc_height : w.src_width && w.src_height ? w.src_width / w.src_height : 16 / 9;
  const people = media.some((m) => m.people);
  return (
    <section aria-label="The walk, as SAM 3.1 tracked it">
      <WalkReplay ref={replayRef} chunks={chunks} dogs={replayDogs} aspect={aspect} selected={selected} onTime={setTime} />
      <div className="mt-6 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
        <h2 className="font-semibold">Every dog, one line each</h2>
        <p className="text-[0.875rem] text-ink-3">
          From the first frame SAM 3.1 sees a dog to the last.{people ? " People are blurred." : ""}
        </p>
      </div>
      <div className="mt-3">
        <DogTimeline
          dogs={dogs.map((d) => ({ label: d.label, status: shownStatus(d, mode), first_s: d.first_s, last_s: d.last_s }))}
          duration={w.duration_s ?? Math.max(...dogs.map((d) => d.last_s), 1)}
          time={time}
          selected={selected}
          onPick={(label, at) => {
            onSelect(label);
            replayRef.current?.seek(at);
          }}
        />
      </div>
    </section>
  );
}

function DogCard({
  d,
  crop,
  ears,
  target,
  markTypes,
  canReview,
  busy,
  selected,
  repeatOf,
  repeatReason,
  onReview,
  onShow,
}: {
  d: Dog;
  crop?: string;
  ears: string[];
  target: string;
  markTypes: string[];
  canReview: boolean;
  busy: boolean;
  selected: boolean;
  repeatOf: number | null;
  repeatReason: string | null;
  onReview: (status: string) => void;
  onShow: () => void;
}) {
  const s = effectiveStatus(d);
  const facts = [d.mark?.lead?.status === "present" ? "On a lead" : null, d.mark?.life_stage === "puppy" ? "Puppy" : null].filter(Boolean) as string[];
  const askRepeat = repeatOf != null && !d.review_status;
  return (
    <li id={`dog-${d.label}`} className={`panel scroll-mt-24 overflow-hidden transition-shadow ${selected ? "ring-2 ring-focus/50" : ""}`}>
      <div className="relative aspect-[4/3] bg-canvas-2">
        {crop ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={crop} alt={`Close-up of dog ${d.label}`} className="size-full object-cover" loading="lazy" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center">
            <DogGlyph status={glyphFor(s)} size={56} />
          </span>
        )}
        {ears.length > 0 && (
          <span className="absolute bottom-3 right-3 flex gap-1.5">
            {ears.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt={`Ear ${i + 1} of dog ${d.label}, enlarged`} className="size-16 rounded-[10px] object-cover shadow-[0_4px_14px_-4px_rgb(12_26_40/0.6)] ring-2 ring-white" />
            ))}
          </span>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <button type="button" onClick={onShow} className="text-lg font-semibold tracking-[-0.01em] hover:text-ink-2" title="Show this dog in the video">
            Dog {d.label}
          </button>
          <StatusChip status={s} />
        </div>
        {facts.length > 0 && (
          <p className="mt-2 flex flex-wrap gap-1.5">
            {facts.map((f) => (
              <span key={f} className="pill h-6 bg-canvas-2 px-2.5 text-[0.75rem] text-ink-2">
                {f}
              </span>
            ))}
          </p>
        )}
        <p className="mt-2 text-[0.9375rem] text-ink-2">{markLine(d, target, markTypes)}</p>
        {d.mark && !d.mark.error && !d.mark.skipped && <p className="mt-2 text-[0.9375rem] text-ink-3">{d.mark.reason}</p>}
        {secondLines(d).map((l) => (
          <p key={l.text} className={`mt-2 text-[0.875rem] ${l.split ? "font-medium text-ink" : "text-ink-3"}`}>
            {l.text}
          </p>
        ))}
        {d.review_note && (
          <p className="mt-3 rounded-[12px] bg-mark-soft px-3 py-2 text-[0.875rem] text-ink">
            <span className="font-semibold">Checked by a person.</span> {d.review_note.replace(/\s*Checked by a person\.?$/, "")}
          </p>
        )}
        {d.same_as != null && <p className="mt-3 text-[0.875rem] text-ink-3">The same dog as Dog {d.same_as}, so it is counted once.</p>}
        {askRepeat && (
          <div className="mt-3 rounded-[12px] bg-canvas px-3 py-2.5 text-[0.875rem]">
            <p>
              <span className="font-semibold">Might be Dog {repeatOf} again.</span> <span className="text-ink-2">{repeatReason}</span>
            </p>
            {canReview && (
              <div className="mt-2 flex gap-2">
                <button type="button" disabled={busy} onClick={() => onReview("duplicate")} className="btn btn-secondary btn-sm h-8">
                  Same dog
                </button>
                <button type="button" disabled={busy} onClick={() => onReview(d.mark_status ?? "unknown")} className="btn btn-secondary btn-sm h-8">
                  Different dogs
                </button>
              </div>
            )}
          </div>
        )}
        <p className="num mt-3 text-[0.8125rem] text-ink-3">
          Seen {clock(d.first_s)} to {clock(d.last_s)}
        </p>
        {canReview && d.same_as == null && (
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

const STAGE_ORDER = ["Track every dog", "Find people to blur", "Find the ears", "Read every mark", "Second opinion on marks", "Check for repeats", "Write the report"];
const MODEL_NAME: Record<string, string> = { "sam-3.1": "SAM 3.1", "muse-spark-1.3": "Muse Spark", "muse-wonder-1.0": "Muse Wonder" };

function UsagePanel({ usage, walk }: { usage: UsageRow[]; walk: WalkState["walk"] }) {
  if (!usage.length) return null;
  // The server logs one row per call; the table shows one row per step.
  const byStage = new Map<string, UsageRow>();
  for (const u of usage) {
    // Reports written before stages were logged carry none.
    const stage = u.stage ?? (u.model.startsWith("muse-wonder") ? "Write the report" : "Other");
    const key = `${stage}|${u.model}`;
    const prev = byStage.get(key);
    byStage.set(
      key,
      prev
        ? { ...prev, units: prev.units + u.units, calls: prev.calls + (u.calls ?? 1), seconds: u.seconds == null ? prev.seconds : (prev.seconds ?? 0) + u.seconds, cost_usd: prev.cost_usd + u.cost_usd }
        : { ...u, stage, calls: u.calls ?? 1 },
    );
  }
  const rows = [...byStage.values()].sort((a, b) => STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage));
  const total = rows.reduce((n, r) => n + r.cost_usd, 0);
  const amount = (r: UsageRow) =>
    r.unit === "frames" ? `${r.units.toLocaleString("en-US")} frames` : r.unit === "images" ? plural(r.units, "close-up") : `${plural(r.calls, "call")}, ${r.units.toLocaleString("en-US")} tokens`;
  return (
    <section className="mt-16" aria-labelledby="made">
      <h2 id="made" className="text-xl font-semibold tracking-[-0.01em]">
        How this survey was made
      </h2>
      <p className="mt-1 text-ink-2">
        Every step, the Meta model that did it, and what it cost. {walk.proc_fps ? `The video was tracked at ${walk.proc_fps} frames a second.` : ""}
      </p>
      <div className="panel mt-5 overflow-x-auto">
        <table className="num w-full min-w-[560px] text-left text-[0.9375rem]">
          <thead className="text-[0.8125rem] text-ink-3">
            <tr>
              <th className="px-5 py-3 font-medium md:px-7">Step</th>
              <th className="px-3 py-3 font-medium">Model</th>
              <th className="px-3 py-3 font-medium">Work</th>
              <th className="px-3 py-3 text-right font-medium">Time</th>
              <th className="px-5 py-3 text-right font-medium md:px-7">Cost</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.stage}|${r.model}`} className="border-t border-line">
                <td className="px-5 py-3 font-medium md:px-7">{r.stage}</td>
                <td className="px-3 py-3 text-ink-2">{MODEL_NAME[r.model] ?? r.model}</td>
                <td className="px-3 py-3 text-ink-2">{amount(r)}</td>
                <td className="px-3 py-3 text-right text-ink-2">{r.seconds != null ? `${Math.round(r.seconds)} s` : "–"}</td>
                <td className="px-5 py-3 text-right md:px-7">${r.cost_usd.toFixed(3)}</td>
              </tr>
            ))}
            <tr className="border-t border-line-strong">
              <td className="px-5 py-3 font-semibold md:px-7" colSpan={4}>
                Total
              </td>
              <td className="px-5 py-3 text-right font-semibold md:px-7">${total.toFixed(2)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-[0.875rem] text-ink-3">Stages ran in parallel where they could, so the walk took less time than the sum. SAM 3.1 looked for people only to blur them.</p>
    </section>
  );
}

export function Results({ state, onChange }: { state: WalkState; onChange: (s: WalkState) => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unknown">("all");
  const [selected, setSelected] = useState<number | null>(null);
  // On a sample survey anyone can try the review; their calls stay in this browser.
  const [local, setLocal] = useState<Record<string, string>>({});
  const replayRef = useRef<ReplayHandle | null>(null);
  const target = state.walk.target_mark;
  const markTypes = state.walk.mark_types ?? [];
  const crops = state.media?.crops ?? {};
  const ears = state.media?.ears ?? {};

  const dogs = useMemo(() => state.dogs.map((d) => (local[d.id] ? { ...d, review_status: local[d.id] } : d)), [state.dogs, local]);
  const stats = useMemo(
    () => (Object.keys(local).length ? (walkStats(dogs, target) as WalkStats) : state.walk.stats),
    [dogs, local, target, state.walk.stats],
  );
  const labelOf = useMemo(() => new Map(state.dogs.map((d) => [d.id, d.label])), [state.dogs]);
  const repeatFor = useMemo(() => new Map((state.repeats ?? []).map((r) => [r.dog_b, r])), [state.repeats]);
  const unknown = dogs.filter((d) => effectiveStatus(d) === "unknown");
  const shown = filter === "unknown" ? unknown : dogs;
  const canReview = state.owner || state.walk.mode === "check" || Boolean(state.repeats?.length);
  const tried = Object.keys(local).length > 0;

  async function review(dogId: string, status: string) {
    if (!state.owner) {
      setLocal((l) => ({ ...l, [dogId]: status }));
      return;
    }
    setBusy(dogId);
    try {
      const next = await api<WalkState>(`/api/walks/${state.walk.id}/dogs/${dogId}`, { method: "PATCH", json: { status } });
      onChange({ ...state, ...next, media: state.media, owner: state.owner });
    } finally {
      setBusy(null);
    }
  }

  function show(label: number) {
    setSelected(label);
    const d = state.dogs.find((x) => x.label === label);
    if (d) replayRef.current?.seek(d.first_s);
    document.getElementById("survey-video")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <>
      <div className="mt-8 grid grid-cols-12 gap-y-8 lg:gap-x-8">
        <div id="survey-video" className="order-2 col-span-12 scroll-mt-24 lg:order-1 lg:col-span-8">
          <SurveyPlayer state={state} dogs={dogs} selected={selected} onSelect={setSelected} replayRef={replayRef} />
        </div>
        <aside className="order-1 col-span-12 lg:order-2 lg:col-span-4">
          <div className="lg:sticky lg:top-24">{stats && <Verdict walk={state.walk} st={stats} dogs={dogs} />}</div>
        </aside>
      </div>

      {unknown.length > 0 && state.walk.mode === "check" && (
        <div className="mt-10 flex flex-col gap-3 rounded-[18px] bg-surface px-6 py-5 shadow-[inset_0_0_0_1px_var(--line-strong)] sm:flex-row sm:items-center sm:justify-between">
          <p>
            <span className="font-semibold">{plural(unknown.length, "dog")} too far away to read.</span>{" "}
            <span className="text-ink-2">
              Seventy keeps them out of the coverage instead of guessing. Open their close-ups to settle any you can.
              {!state.owner ? " This is a sample survey: try it, and your choices stay in this browser." : ""}
            </span>
          </p>
          <button type="button" onClick={() => setFilter(filter === "unknown" ? "all" : "unknown")} className="btn btn-secondary btn-sm shrink-0">
            {filter === "unknown" ? "Show every dog" : "Show them"}
          </button>
        </div>
      )}
      {tried && (
        <p className="mt-4 text-[0.9375rem] text-ink-2">
          Your review changed the numbers above.{" "}
          <button type="button" className="link font-medium" onClick={() => setLocal({})}>
            Put the model’s readings back
          </button>
        </p>
      )}

      <section className="mt-14">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-xl font-semibold tracking-[-0.01em]">{filter === "unknown" ? "Dogs to review" : "Every dog, once"}</h2>
          <p className="num text-[0.9375rem] text-ink-3">{plural(shown.length, "dog")}</p>
        </div>
        <ul className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy={busy != null}>
          {shown.map((d) => {
            const r = repeatFor.get(d.id);
            return (
              <DogCard
                key={d.id}
                d={d}
                crop={crops[d.id]?.[0]}
                ears={ears[d.id] ?? []}
                target={target}
                markTypes={markTypes}
                canReview={canReview}
                busy={busy === d.id}
                selected={selected === d.label}
                repeatOf={r ? (labelOf.get(r.dog_a) ?? null) : null}
                repeatReason={r?.reason ?? null}
                onReview={(st) => review(d.id, st)}
                onShow={() => show(d.label)}
              />
            );
          })}
        </ul>
      </section>
      <UsagePanel usage={state.usage ?? []} walk={state.walk} />
      <ReportPanel walkId={state.walk.id} owner={state.owner} />
    </>
  );
}
