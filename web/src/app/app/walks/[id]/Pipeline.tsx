"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { DogGlyph } from "@/components/DogGlyph";
import { WalkReplay } from "@/components/WalkReplay";
import { clock, plural } from "@/lib/format";
import { effectiveStatus, type Chunk, type Dog, type WalkState } from "@/lib/types";

export type LocalStage = {
  kind: "preparing" | "uploading" | "cropping" | "sending";
  index: number;
  total: number;
  progress: number;
  chunk: number;
};

export type Thumb = { dogId: string; url: string };

type StepState = "done" | "now" | "next";
type Step = { key: string; name: string; who: string; detail?: string; state: StepState };
type LogLine = { at: number; text: string; tone?: "model" | "device" | "done" };

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);
  return now;
}

/** A number that counts up to its new value instead of jumping. */
function Rolling({ value }: { value: number }) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    if (shown === value) return;
    const id = window.setTimeout(() => setShown((s) => s + Math.sign(value - s)), 120);
    return () => window.clearTimeout(id);
  }, [shown, value]);
  return <>{shown}</>;
}

function Piece({ c, now }: { c: Chunk; now: number }) {
  const started = c.submitted_at ? new Date(c.submitted_at).getTime() : null;
  const ended = c.completed_at ? new Date(c.completed_at).getTime() : null;
  const secs = started ? Math.max(0, Math.round(((ended ?? now) - started) / 1000)) : null;
  const tone =
    c.status === "done" ? "bg-ink text-on-ink" : c.status === "failed" ? "bg-amber-soft text-ink" : c.status === "submitted" ? "bg-surface text-ink shadow-[inset_0_0_0_1.5px_var(--ink)]" : "bg-canvas-2 text-ink-3";
  return (
    <li className={`relative overflow-hidden rounded-[14px] px-3.5 py-3 transition-colors duration-500 ${tone}`}>
      {c.status === "submitted" && <span aria-hidden className="pipeline-sheen absolute inset-0" />}
      <p className="num relative text-[0.8125rem] opacity-80">
        {clock(c.start_s)} to {clock(c.end_s)}
      </p>
      <p className="num relative mt-0.5 text-[0.9375rem] font-semibold">
        {c.status === "done" && `${c.objects ?? 0} ${c.objects === 1 ? "dog" : "dogs"} in ${secs ?? 0}s`}
        {c.status === "submitted" && `SAM 3.1 tracking, ${secs ?? 0}s`}
        {c.status === "failed" && "Stopped"}
        {(c.status === "pending" || c.status === "uploaded") && "Waiting"}
      </p>
    </li>
  );
}

const VERDICT: Record<string, { text: string; tone: string }> = {
  marked: { text: "Marked", tone: "bg-mark-soft text-ink" },
  unmarked: { text: "Not marked", tone: "bg-canvas-2 text-ink" },
  unknown: { text: "Can’t tell", tone: "bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line-strong)]" },
};

function ReadingCard({ d, img, ears, mode }: { d: Dog; img?: string; ears: string[]; mode: string }) {
  const read = d.mark != null;
  const s = effectiveStatus(d);
  const v = mode === "plan" && (s === "unmarked" || s === "unknown") ? { text: "Counted", tone: "bg-canvas-2 text-ink" } : VERDICT[s];
  return (
    <li className="panel overflow-hidden">
      <div className="relative aspect-[4/3] bg-canvas-2">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={`Close-up of dog ${d.label}`} className="size-full object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center">
            <DogGlyph status="empty" size={44} />
          </span>
        )}
        {!read && <span aria-hidden className="pipeline-sheen absolute inset-0" />}
        {ears.length > 0 && (
          <span className="absolute bottom-2 right-2 flex gap-1">
            {ears.slice(0, 2).map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt={`Dog ${d.label}'s ear, enlarged by SAM 3.1`} className="pipeline-pop size-12 rounded-[8px] object-cover ring-2 ring-white" />
            ))}
          </span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <span className="font-semibold">Dog {d.label}</span>
        {read && v ? (
          <span className={`pill pipeline-pop h-7 px-3 text-[0.8125rem] ${v.tone}`}>{v.text}</span>
        ) : (
          <span className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-ink-3">
            <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-amber" />
            Muse Spark reading
          </span>
        )}
      </div>
    </li>
  );
}

export function Pipeline({ state, local, fileUrl, thumbs }: { state: WalkState; local: LocalStage | null; fileUrl?: string | null; thumbs?: Thumb[] }) {
  const { walk, chunks, dogs } = state;
  const now = useNow();
  const order = ["uploading", "tracking", "stitching", "needs_crops", "reading"];
  const at = Math.max(0, order.indexOf(walk.status));
  const tracked = chunks.filter((c) => c.status === "done").length;
  const sent = chunks.filter((c) => c.status === "submitted" || c.status === "done").length;
  const read = dogs.filter((d) => d.mark != null).length;
  const allSent = sent === chunks.length && chunks.length > 0;
  const stitched = at > 2;
  const found = stitched ? dogs.length : chunks.reduce((n, c) => n + (c.status === "done" ? (c.objects ?? 0) : 0), 0);
  const frames = Math.round((walk.duration_s ?? 0) * (walk.proc_fps ?? 5));

  // A replay with SAM's real outlines as soon as a piece has them.
  const mediaChunks = state.media?.chunks;
  const replay = useMemo(() => {
    const media = mediaChunks ?? [];
    const ready = chunks
      .filter((c) => c.status === "done")
      .map((c) => {
        const m = media.find((x) => x.idx === c.idx);
        return m?.video && m.sam ? { idx: c.idx, startS: c.start_s, video: m.video, sam: m.sam, people: m.people ?? null } : null;
      })
      .filter((c): c is NonNullable<typeof c> => c != null);
    return ready.length ? ready.slice(-1) : null;
  }, [chunks, mediaChunks]);
  const replayDogs = useMemo(() => {
    if (!replay) return [];
    if (dogs.length) return dogs.map((d) => ({ label: d.label, status: "counted", segments: d.segments ?? [] }));
    // Before the pieces are joined, number SAM's objects in the order it reports them.
    const n = chunks.find((c) => c.idx === replay[0].idx)?.objects ?? 0;
    return Array.from({ length: n }, (_, i) => ({ label: i + 1, status: "counted", segments: [{ chunk: replay[0].idx, objectId: String(i) }] }));
  }, [replay, dogs, chunks]);

  // What has happened so far, one line per real event this page has seen.
  const [log, setLog] = useState<LogLine[]>([]);
  const t0 = useRef<number | null>(null);
  const prev = useRef<{ status: string; chunks: Map<number, string>; read: Set<string>; local: string | null } | null>(null);
  useEffect(() => {
    const lines: LogLine[] = [];
    if (t0.current == null) t0.current = Date.now();
    const since = () => (Date.now() - (t0.current ?? Date.now())) / 1000;
    const p = prev.current;
    if (!p) {
      lines.push({ at: 0, text: `Walk added: ${clock(walk.duration_s ?? 0)} of video, ${frames.toLocaleString("en-US")} frames to track at ${walk.proc_fps} a second.` });
    }
    for (const c of chunks) {
      const was = p?.chunks.get(c.idx);
      if (c.status === was) continue;
      if (c.status === "submitted") lines.push({ at: since(), text: `Piece ${c.idx + 1} sent to SAM 3.1 to track every dog, and every person to blur.`, tone: "model" });
      if (c.status === "done" && was)
        lines.push({ at: since(), text: `SAM 3.1 tracked ${c.frames ?? "the"} frames of piece ${c.idx + 1} and found ${plural(c.objects ?? 0, "dog")}.`, tone: "model" });
    }
    if (p && p.status !== walk.status) {
      if (walk.status === "needs_crops") lines.push({ at: since(), text: `Pieces joined: ${plural(dogs.length, "dog")}, each counted once.`, tone: "done" });
      if (walk.status === "reading") lines.push({ at: since(), text: `Close-ups sent. Muse Spark is reading every dog’s marks; SAM 3.1 enlarges each ear first.`, tone: "model" });
    }
    const key = local ? `${local.kind}:${local.index}` : null;
    if (local && p?.local !== key) {
      if (local.kind === "preparing" && local.index === 0 && local.progress === 0) lines.push({ at: since(), text: "Turning the walk into small pieces on this device. The original never leaves it.", tone: "device" });
      if (local.kind === "cropping" && local.index === 0) lines.push({ at: since(), text: `Cutting full-resolution close-ups of ${plural(dogs.length, "dog")} from the original video.`, tone: "device" });
    }
    for (const d of dogs) {
      if (!d.mark || p?.read.has(d.id) || !p) continue;
      const s = effectiveStatus(d);
      const verdict = walk.mode === "plan" ? "read" : s === "marked" ? "marked" : s === "unmarked" ? "not marked" : "can’t tell";
      lines.push({ at: since(), text: `Muse Spark read Dog ${d.label}: ${verdict}.${d.mark.reason ? ` “${d.mark.reason}”` : ""}`, tone: "model" });
    }
    prev.current = { status: walk.status, chunks: new Map(chunks.map((c) => [c.idx, c.status])), read: new Set(dogs.filter((d) => d.mark).map((d) => d.id)), local: key };
    if (lines.length) {
      const id = window.setTimeout(() => setLog((l) => [...l, ...lines].slice(-40)), 0);
      return () => window.clearTimeout(id);
    }
  }, [walk.status, walk.duration_s, walk.proc_fps, walk.mode, chunks, dogs, local, frames]);
  const logRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [log]);

  const steps: Step[] = [
    {
      key: "prepare",
      name: "Prepare the video on this phone",
      who: "This device",
      detail: local?.kind === "preparing" ? `Piece ${local.index + 1} of ${local.total}, ${Math.round(local.progress * 100)}%` : `${sent} of ${chunks.length} pieces sent`,
      state: at > 0 || allSent ? "done" : "now",
    },
    { key: "track", name: "Track every dog", who: "SAM 3.1", detail: sent ? `${tracked} of ${chunks.length} pieces counted` : undefined, state: at > 1 ? "done" : sent > 0 ? "now" : "next" },
    { key: "join", name: "Join the pieces into one count", who: "Seventy", detail: stitched ? `${dogs.length} different dogs` : undefined, state: stitched ? "done" : at === 2 ? "now" : "next" },
    {
      key: "crops",
      name: "Cut full-resolution close-ups",
      who: "This device",
      detail: local?.kind === "cropping" ? `${local.index} of ${local.total} frames` : local?.kind === "sending" ? `Sending ${local.index} of ${local.total}` : undefined,
      state: at > 3 ? "done" : at === 3 ? "now" : "next",
    },
    { key: "read", name: "Read each dog’s marks", who: "Muse Spark", detail: at === 4 ? `${read} of ${dogs.length} dogs read` : undefined, state: at === 4 ? "now" : "next" },
  ];
  const current = steps.find((s) => s.state === "now") ?? steps[0];
  const headline =
    current.key === "prepare"
      ? "Preparing the walk"
      : current.key === "track"
        ? "SAM 3.1 is tracking every dog"
        : current.key === "join"
          ? "Joining the pieces into one count"
          : current.key === "crops"
            ? "Cutting a close-up of every dog"
            : "Muse Spark is reading every mark";
  const progress =
    local && (local.kind === "preparing" || local.kind === "cropping" || local.kind === "sending")
      ? local.progress
      : current.key === "read" && dogs.length
        ? read / dogs.length
        : current.key === "track" && chunks.length
          ? tracked / chunks.length
          : null;
  const scanning = !replay && (current.key === "prepare" || current.key === "track");

  const crops = state.media?.crops ?? {};
  const ears = state.media?.ears ?? {};
  const thumbFor = new Map((thumbs ?? []).map((t) => [t.dogId, t.url]));
  const showCards = stitched && dogs.length > 0;

  return (
    <section className="mt-10" aria-live="polite">
      <div className="grid grid-cols-12 gap-y-8 lg:gap-x-8">
        <div className="col-span-12 lg:col-span-8">
          <div className="relative overflow-hidden rounded-[24px] bg-[#08121c]">
            {replay ? (
              <WalkReplay chunks={replay} dogs={replayDogs} aspect={walk.src_width && walk.src_height ? walk.src_width / walk.src_height : 16 / 9} maxVh={0.62} autoPlay loop controls={false} rounded="rounded-none" />
            ) : fileUrl ? (
              <video src={fileUrl} muted playsInline loop autoPlay className="block aspect-video w-full object-contain" />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center">
                <div className="grid grid-cols-8 gap-2 opacity-60">
                  {Array.from({ length: 24 }, (_, i) => (
                    <DogGlyph key={i} status="empty" size={26} />
                  ))}
                </div>
              </div>
            )}
            {scanning && (
              <>
                <span aria-hidden className="pipeline-grid pointer-events-none absolute inset-0" />
                <span aria-hidden className="pipeline-scan pointer-events-none absolute inset-x-0 h-24" />
              </>
            )}
            <div className="pointer-events-none absolute left-4 top-4 flex flex-wrap gap-2">
              <span className="pill h-7 bg-white/92 px-3 text-[0.8125rem] font-semibold text-ink">
                <span aria-hidden className={`size-2 rounded-full ${replay ? "bg-mark" : "animate-pulse bg-amber"}`} />
                {replay ? "SAM 3.1’s outlines, live" : current.who === "This device" ? "On this device" : `${current.who} at work`}
              </span>
            </div>
            {scanning && current.key === "track" && (
              <p className="pointer-events-none absolute bottom-4 left-4 right-4 text-center text-[0.875rem] font-medium text-white/85">
                Tracking every dog across {frames.toLocaleString("en-US")} frames, and finding every person to blur.
              </p>
            )}
          </div>
          {progress != null && (
            <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-canvas-2" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-ink transition-[width] duration-500" style={{ width: `${Math.max(3, Math.round(progress * 100))}%` }} />
            </div>
          )}
          {chunks.length > 1 && (
            <>
              <h3 className="mt-8 text-[0.9375rem] font-semibold">The walk, in thirty-second pieces, tracked at the same time</h3>
              <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {chunks.map((c) => (
                  <Piece key={c.idx} c={c} now={now} />
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="col-span-12 lg:col-span-4">
          <div className="panel p-6">
            <p className="text-[0.9375rem] font-semibold text-mark-strong">In progress</p>
            <h2 className="display-quiet mt-1 text-[1.75rem] leading-tight">{headline}</h2>
            <p className="mt-2 text-[0.9375rem] text-ink-2">
              {current.who === "This device" ? "Keep this tab open. " : ""}
              {current.detail ?? "Starting"}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-[14px] bg-canvas-2 px-4 py-3">
                <p className="text-[0.8125rem] font-semibold text-ink-2">Dogs found</p>
                <p className="display num mt-0.5 text-5xl leading-none">
                  <Rolling value={found} />
                </p>
              </div>
              <div className="rounded-[14px] bg-canvas-2 px-4 py-3">
                <p className="text-[0.8125rem] font-semibold text-ink-2">Marks read</p>
                <p className="display num mt-0.5 text-5xl leading-none">
                  <Rolling value={read} />
                </p>
              </div>
            </div>
            <ol className="mt-6">
              {steps.map((st, i) => (
                <li key={st.key} className="grid grid-cols-[2rem_1fr] gap-x-3 py-2">
                  <span
                    aria-hidden
                    className={`num relative flex size-7 items-center justify-center rounded-full text-[0.8125rem] font-semibold transition-colors ${
                      st.state === "done" ? "bg-mark text-white" : st.state === "now" ? "bg-ink text-on-ink" : "bg-canvas-2 text-ink-3"
                    }`}
                  >
                    {st.state === "now" && <span className="absolute inset-0 animate-ping rounded-full bg-ink/25" />}
                    {st.state === "done" ? (
                      <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="m3.5 8.5 3 3 6-7" />
                      </svg>
                    ) : (
                      i + 1
                    )}
                  </span>
                  <div className="pt-0.5">
                    <p className={`text-[0.9375rem] font-semibold ${st.state === "next" ? "text-ink-3" : "text-ink"}`}>{st.name}</p>
                    <p className="text-[0.8125rem] text-ink-3">
                      {st.who}
                      {st.state !== "next" && st.detail ? `, ${st.detail}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      {showCards && (
        <section className="mt-10">
          <h3 className="text-[0.9375rem] font-semibold">Every dog, as it is read</h3>
          <ul className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {dogs.map((d) => (
              <ReadingCard key={d.id} d={d} img={crops[d.id]?.[0] ?? thumbFor.get(d.id)} ears={ears[d.id] ?? []} mode={walk.mode} />
            ))}
          </ul>
        </section>
      )}

      <section className="mt-10">
        <h3 className="text-[0.9375rem] font-semibold">What’s happening</h3>
        <ol ref={logRef} className="panel mt-3 max-h-64 overflow-y-auto p-4 font-mono text-[0.8125rem] leading-relaxed">
          {log.map((l, i) => (
            <li key={i} className="pipeline-pop grid grid-cols-[3.25rem_1fr] gap-x-3 py-0.5">
              <span className="num text-ink-3">{clock(l.at)}</span>
              <span className={l.tone === "model" ? "text-ink" : l.tone === "done" ? "font-semibold text-mark-strong" : "text-ink-2"}>{l.text}</span>
            </li>
          ))}
        </ol>
      </section>
    </section>
  );
}
