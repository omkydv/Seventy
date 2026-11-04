"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { DogGlyph } from "@/components/DogGlyph";
import { rememberFile } from "@/lib/client/files";
import { rememberUploads, type UploadTicket } from "@/lib/client/uploads";
import { probeVideo, type Probe } from "@/lib/client/video";
import { api, ensureWorkspace } from "@/lib/client/workspace";
import { duration } from "@/lib/format";
import { cleanFixes, distanceText, totalDistance, type Fix } from "@/lib/route";
import { DEFAULT_TRY, findTryWalk, TRY_WALKS, type TryWalk } from "@/lib/tryWalks";
import { CountryPicker } from "./CountryPicker";
import { RecordWalk, type Recording } from "./RecordWalk";

type Mode = "plan" | "check";
type Mark = "paint" | "collar" | "ear_tag" | "notch";
type Source = "record" | "upload" | "sample";

const FPS = 5;

function Step({ n, title, children, done }: { n: number; title: string; children: React.ReactNode; done?: boolean }) {
  return (
    <section className="grid grid-cols-[2.5rem_1fr] gap-x-4">
      <span
        aria-hidden
        className={`num flex size-9 items-center justify-center rounded-full text-[0.9375rem] font-semibold transition-colors ${done ? "bg-mark text-white" : "bg-canvas-2 text-ink"}`}
      >
        {n}
      </span>
      <div className="min-w-0 pb-2">
        <h2 className="pt-1 text-xl font-semibold tracking-[-0.01em]">{title}</h2>
        <div className="mt-5">{children}</div>
      </div>
    </section>
  );
}

function Choice({
  checked,
  onSelect,
  title,
  body,
  art,
  name,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  body: string;
  art: React.ReactNode;
  name: string;
}) {
  return (
    <label
      className={`flex cursor-pointer flex-col gap-4 rounded-[18px] bg-surface p-5 transition-shadow ${checked ? "shadow-[inset_0_0_0_2px_var(--ink)]" : "shadow-[inset_0_0_0_1px_var(--line-strong)] hover:shadow-[inset_0_0_0_1px_var(--ink-3)]"}`}
    >
      <input type="radio" name={name} checked={checked} onChange={onSelect} className="sr-only" />
      <span className="flex items-center justify-between">
        <span className="text-lg font-semibold tracking-[-0.01em]">{title}</span>
        <span aria-hidden className={`size-5 rounded-full ${checked ? "border-[6px] border-ink" : "border border-line-strong"}`} />
      </span>
      <span className="flex gap-1" aria-hidden>
        {art}
      </span>
      <span className="text-[0.9375rem] text-ink-2">{body}</span>
    </label>
  );
}

function SourceCard({
  active,
  onClick,
  disabled,
  art,
  title,
  body,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  art: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`flex h-full w-full items-center gap-5 rounded-[20px] bg-surface p-5 text-left transition-shadow disabled:opacity-60 md:flex-col md:items-start md:gap-4 md:p-6 ${active ? "shadow-[inset_0_0_0_2px_var(--ink)]" : "shadow-[0_1px_0_rgb(var(--shadow)/0.04),0_18px_40px_-28px_rgb(var(--shadow)/0.35),inset_0_0_0_1px_var(--line)] hover:shadow-[0_1px_0_rgb(var(--shadow)/0.04),0_18px_40px_-24px_rgb(var(--shadow)/0.5),inset_0_0_0_1px_var(--line-strong)]"}`}
    >
      <span aria-hidden className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-[16px] bg-canvas-2">
        {art}
      </span>
      <span className="min-w-0">
        <span className="block text-lg font-semibold">{title}</span>
        <span className="mt-0.5 block text-[0.9375rem] text-ink-2">{body}</span>
      </span>
    </button>
  );
}

const icon = { className: "size-7", fill: "none", stroke: "var(--ink)", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

export function NewWalkForm() {
  const router = useRouter();
  const ids = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState<Source | null>(null);
  const [picked, setPicked] = useState<TryWalk | null>(null);
  const [route, setRoute] = useState<Fix[] | null>(null);
  const [recording, setRecording] = useState(false);
  const [probe, setProbe] = useState<Probe | null>(null);
  const [probing, setProbing] = useState(false);
  const [area, setArea] = useState("");
  const [country, setCountry] = useState("");
  const [mode, setMode] = useState<Mode>("plan");
  const [mark, setMark] = useState<Mark>("paint");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function choose(f: File | undefined, from: Source, rec?: Recording) {
    setError(null);
    setProbe(null);
    setFile(f ?? null);
    setSource(f ? from : null);
    if (from !== "sample") setPicked(null);
    setRoute(rec ? rec.route : null);
    if (!f) return;
    if (!/\.(mp4|mov|m4v|webm|mkv)$/i.test(f.name) && !f.type.startsWith("video/")) {
      setError("That isn’t a video file. Choose the MP4 or MOV your phone recorded.");
      return;
    }
    setProbing(true);
    try {
      const read = await probeVideo(f);
      // A browser recording can carry no duration or date in its header; the recorder knows both.
      const p = rec
        ? { ...read, durationS: Number.isFinite(read.durationS) && read.durationS > 0 ? read.durationS : rec.durationS, recordedAt: read.recordedAt ?? rec.startedAt }
        : read;
      if (!p.canDecode) {
        setError("This browser can’t read that video’s format. Open Seventy in Chrome or Edge, or export the walk as MP4 (H.264).");
      } else if (p.durationS > 20 * 60) {
        setError(`That walk is ${duration(p.durationS)}. Walks can be up to 20 minutes; trim it or split it in two.`);
      }
      setProbe(p);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That video couldn’t be read.");
    } finally {
      setProbing(false);
    }
  }

  // Anyone without a walk video can run the real pipeline on one of ours, and check the count.
  async function loadSample(walk: TryWalk) {
    setError(null);
    setProbing(true);
    setPicked(walk);
    try {
      const res = await fetch(`/try/${walk.file}`);
      if (!res.ok) throw new Error();
      const f = new File([await res.blob()], `${walk.slug}-sample.mp4`, { type: "video/mp4" });
      setArea(`${walk.title}, sample`);
      setMode(walk.mode);
      if (walk.mark) setMark(walk.mark);
      await choose(f, "sample");
    } catch {
      setProbing(false);
      setPicked(null);
      setError("The sample walk couldn’t be loaded. Check the connection and try again.");
    }
  }

  useEffect(() => {
    const asked = new URLSearchParams(window.location.search).get("sample");
    if (asked) {
      const t = window.setTimeout(() => loadSample(findTryWalk(asked === "1" ? DEFAULT_TRY : asked)), 0);
      return () => window.clearTimeout(t);
    }
    // Runs once, on arrival from a link to a sample walk.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !probe) return setError("Choose a walk video first.");
    setBusy(true);
    setError(null);
    try {
      await ensureWorkspace();
      const sterilization = mode === "check" && mark === "notch";
      const res = await api<{ walk: { id: string }; uploads: UploadTicket[] }>("/api/walks", {
        method: "POST",
        json: {
          mode,
          areaName: area || undefined,
          title: area || undefined,
          country: country.trim() || undefined,
          targetMark: sterilization ? "sterilization" : "vaccination",
          markTypes: mode === "check" && !sterilization ? [mark] : ["paint"],
          recordedAt: probe.recordedAt,
          durationS: probe.durationS,
          srcWidth: probe.width,
          srcHeight: probe.height,
          srcFps: probe.fps,
          sourceName: file.name,
          procFps: FPS,
          route: route && route.length >= 2 ? { points: route } : null,
        },
      });
      rememberFile(res.walk.id, file);
      rememberUploads(res.walk.id, res.uploads);
      router.push(`/app/walks/${res.walk.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "This survey couldn’t be started.");
      setBusy(false);
    }
  }

  const mapped = !!route && cleanFixes(route).length >= 2;
  const frames = probe ? Math.round(probe.durationS * FPS) : 0;
  const pieces = probe ? Math.max(1, Math.ceil(probe.durationS / 30)) : 0;
  const minutes = probe ? Math.max(2, Math.round(1.5 + pieces * 0.15 + probe.durationS / 240)) : 0;

  return (
    <form onSubmit={submit} className="mt-12 space-y-12" noValidate>
      <Step n={1} title="Film or choose the walk" done={!!probe && !error}>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <SourceCard
            active={source === "record"}
            onClick={() => setRecording(true)}
            disabled={probing || busy}
            title="Record a walk"
            body="Film it here. Seventy saves the route, so every dog lands on a map."
            art={
              <svg viewBox="0 0 24 24" {...icon}>
                <rect x="3" y="6" width="13" height="12" rx="2.5" />
                <path d="m16 10.5 4.5-2.5v8L16 13.5" />
                <circle cx="9.5" cy="12" r="2.3" fill="#e5484d" stroke="none" />
              </svg>
            }
          />
          <SourceCard
            active={source === "upload"}
            onClick={() => inputRef.current?.click()}
            disabled={probing || busy}
            title="Upload a walk"
            body="An MP4 or MOV from a phone, up to 20 minutes."
            art={
              <svg viewBox="0 0 24 24" {...icon}>
                <path d="M12 15V4.5m0 0-4 4m4-4 4 4" />
                <path d="M4.5 14v3a2.5 2.5 0 0 0 2.5 2.5h10a2.5 2.5 0 0 0 2.5-2.5v-3" />
              </svg>
            }
          />
        </div>
        <input ref={inputRef} type="file" accept="video/*" className="sr-only" aria-label="Walk video" onChange={(e) => choose(e.target.files?.[0], "upload")} />
        <div className="mt-8" id="samples">
          <h3 className="text-[0.9375rem] font-semibold">Or run a sample walk</h3>
          <p className="mt-1 text-[0.9375rem] text-ink-2">No camera needed. It goes through the same models, and each one has an answer you can check.</p>
          <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {TRY_WALKS.map((w) => (
              <li key={w.slug}>
                <button
                  type="button"
                  onClick={() => loadSample(w)}
                  disabled={probing || busy}
                  aria-pressed={picked?.slug === w.slug}
                  className={`flex h-full w-full items-start gap-4 rounded-[18px] bg-surface p-4 text-left transition-shadow disabled:opacity-60 ${picked?.slug === w.slug ? "shadow-[inset_0_0_0_2px_var(--ink)]" : "shadow-[inset_0_0_0_1px_var(--line)] hover:shadow-[inset_0_0_0_1px_var(--ink-3)]"}`}
                >
                  <span className="relative size-16 shrink-0 overflow-hidden rounded-[12px] bg-canvas-2">
                    <Image src={w.thumb} alt="" fill sizes="4rem" className="object-cover" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold">{w.title}</span>
                    <span className="num block text-[0.8125rem] font-semibold text-ink-2">
                      {w.seconds} s, {w.known}
                    </span>
                    <span className="mt-1 block text-[0.875rem] leading-snug text-ink-2">{w.line}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        {file && (
          <div className="mt-4 rounded-[18px] bg-canvas-2 px-5 py-4" aria-live="polite">
            <p className="truncate font-semibold">{file.name}</p>
            <p className="num mt-0.5 text-[0.9375rem] text-ink-2">
              {probing && "Reading the video"}
              {probe &&
                `${duration(probe.durationS)}, ${probe.width} by ${probe.height}${probe.fps ? `, ${Math.round(probe.fps)} frames a second` : ""}, ${Math.max(1, Math.round(file.size / 1e6))} MB`}
            </p>
            {source === "record" && (
              <p className="num mt-0.5 text-[0.9375rem] text-ink-2">
                {mapped
                  ? `Route saved along ${distanceText(totalDistance(cleanFixes(route!)))}. Every dog will be placed on the map.`
                  : "The phone found no location during the walk, so the dogs won’t be placed on a map."}
              </p>
            )}
            {probe && !error && (
              <p className="num mt-3 border-t border-line pt-3 text-[0.9375rem] text-ink-2">
                Seventy will send {frames.toLocaleString("en-US")} frames in {pieces} {pieces === 1 ? "piece" : "pieces"}, counted at the same time. Expect about{" "}
                {minutes} minutes.
              </p>
            )}
            {source === "sample" && picked && probe && !error && (
              <div className="mt-3 flex flex-wrap items-center gap-4 border-t border-line pt-3">
                <button type="submit" className="btn btn-primary btn-sm disabled:opacity-40" disabled={busy}>
                  {busy ? "Starting" : "Start counting"}
                </button>
                <span className="text-[0.9375rem] text-ink-2">The answer to check it against: {picked.known}.</span>
              </div>
            )}
          </div>
        )}
        {recording && (
          <RecordWalk
            onClose={() => setRecording(false)}
            onDone={(r) => {
              setRecording(false);
              choose(r.file, "record", r);
            }}
          />
        )}
      </Step>

      <Step n={2} title="What are you measuring?">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Choice
            name="mode"
            checked={mode === "plan"}
            onSelect={() => setMode("plan")}
            title="Plan a drive"
            body="Count the dogs and work out how many doses the team needs. Use it before a drive, or where none has been."
            art={Array.from({ length: 7 }, (_, i) => (
              <DogGlyph key={i} status="unmarked" size={24} />
            ))}
          />
          <Choice
            name="mode"
            checked={mode === "check"}
            onSelect={() => setMode("check")}
            title="Check a drive"
            body="Read the marks and measure coverage against the 70% line. Walk within three days, while marks are fresh."
            art={Array.from({ length: 7 }, (_, i) => (
              <DogGlyph key={i} status={i < 5 ? "marked" : "unmarked"} size={24} />
            ))}
          />
        </div>
        {mode === "check" && (
          <fieldset className="mt-6">
            <legend className="text-[0.9375rem] font-semibold">Which mark did the team use?</legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {(
                [
                  ["paint", "Paint or crayon"],
                  ["collar", "Collar or band"],
                  ["ear_tag", "Ear tag"],
                  ["notch", "Ear notch, for sterilization"],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className={`cursor-pointer rounded-full px-4 py-2 text-[0.9375rem] font-medium transition-colors ${mark === value ? "bg-ink text-on-ink" : "bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line-strong)] hover:shadow-[inset_0_0_0_1px_var(--ink-3)]"}`}
                >
                  <input type="radio" name="mark" value={value} checked={mark === value} onChange={() => setMark(value)} className="sr-only" />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </Step>

      <Step n={3} title="Where was the walk?">
        <div className="grid max-w-2xl grid-cols-1 gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor={`${ids}-area`} className="block text-[0.9375rem] font-semibold">
              Area or route name
            </label>
            <input
              id={`${ids}-area`}
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="Ward 4, or Market road"
              maxLength={120}
              className="field mt-2 placeholder:text-ink-3"
            />
            <p className="mt-2 text-[0.875rem] text-ink-3">Use the same name each time, so walks can be compared.</p>
          </div>
          <div>
            <label htmlFor={`${ids}-country`} className="block text-[0.9375rem] font-semibold">
              Country
            </label>
            <CountryPicker inputId={`${ids}-country`} value={country} onChange={setCountry} />
            <p className="mt-2 text-[0.875rem] text-ink-3">The report cites this country’s rabies rules.</p>
          </div>
        </div>
      </Step>

      {error && (
        <p role="alert" className="rounded-[14px] bg-amber-soft px-5 py-4 text-[0.9375rem] text-ink">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-5 border-t border-line pt-8">
        <button type="submit" className="btn btn-primary disabled:cursor-not-allowed disabled:opacity-40" disabled={!probe || !!error || busy}>
          {busy ? "Starting" : "Start counting"}
        </button>
        <span className="text-[0.9375rem] text-ink-3">{probe && !error ? "Keep this tab open while the walk uploads." : "Choose a video to begin."}</span>
      </div>
    </form>
  );
}
