"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { DogGlyph } from "@/components/DogGlyph";
import { rememberFile } from "@/lib/client/files";
import { rememberUploads, type UploadTicket } from "@/lib/client/uploads";
import { probeVideo, type Probe } from "@/lib/client/video";
import { api, ensureWorkspace } from "@/lib/client/workspace";
import { duration } from "@/lib/format";

type Mode = "plan" | "check";
type Mark = "paint" | "collar" | "notch";

const FPS = 5;
const COUNTRIES = ["Bangladesh", "Brazil", "Ethiopia", "Haiti", "India", "Indonesia", "Kenya", "Malawi", "Nepal", "Nigeria", "Pakistan", "Philippines", "South Africa", "Sri Lanka", "Tanzania", "Uganda", "Vietnam"];

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

export function NewWalkForm() {
  const router = useRouter();
  const ids = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [probe, setProbe] = useState<Probe | null>(null);
  const [probing, setProbing] = useState(false);
  const [area, setArea] = useState("");
  const [country, setCountry] = useState("");
  const [mode, setMode] = useState<Mode>("plan");
  const [mark, setMark] = useState<Mark>("paint");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function choose(f: File | undefined) {
    setError(null);
    setProbe(null);
    setFile(f ?? null);
    if (!f) return;
    if (!/\.(mp4|mov|m4v|webm|mkv)$/i.test(f.name) && !f.type.startsWith("video/")) {
      setError("That isn’t a video file. Choose the MP4 or MOV your phone recorded.");
      return;
    }
    setProbing(true);
    try {
      const p = await probeVideo(f);
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

  const frames = probe ? Math.round(probe.durationS * FPS) : 0;
  const pieces = probe ? Math.max(1, Math.ceil(probe.durationS / 30)) : 0;
  const minutes = probe ? Math.max(2, Math.round(1.5 + pieces * 0.15 + probe.durationS / 240)) : 0;

  return (
    <form onSubmit={submit} className="mt-12 space-y-12" noValidate>
      <Step n={1} title="Choose the walk video" done={!!probe && !error}>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="panel flex w-full items-center gap-5 p-6 text-left transition-shadow hover:shadow-[0_1px_0_rgb(var(--shadow)/0.04),0_18px_40px_-24px_rgb(var(--shadow)/0.5),inset_0_0_0_1px_var(--line-strong)]"
        >
          <span aria-hidden className="flex size-14 shrink-0 items-center justify-center rounded-[16px] bg-canvas-2">
            <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="var(--ink)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="6" width="13" height="12" rx="2.5" />
              <path d="m16 10.5 4.5-2.5v8L16 13.5" />
            </svg>
          </span>
          <span className="min-w-0">
            {file ? (
              <>
                <span className="block truncate text-lg font-semibold">{file.name}</span>
                <span className="num block text-[0.9375rem] text-ink-2">
                  {probing && "Reading the video"}
                  {probe &&
                    `${duration(probe.durationS)}, ${probe.width} by ${probe.height}${probe.fps ? `, ${Math.round(probe.fps)} frames a second` : ""}, ${(file.size / 1e6).toFixed(0)} MB`}
                </span>
                <span className="mt-1 block text-[0.875rem] font-semibold text-ink-3">Choose a different video</span>
              </>
            ) : (
              <>
                <span className="block text-lg font-semibold">Choose a walk video</span>
                <span className="block text-[0.9375rem] text-ink-2">MP4 or MOV from a phone, up to 20 minutes.</span>
              </>
            )}
          </span>
        </button>
        <input ref={inputRef} type="file" accept="video/*" className="sr-only" aria-label="Walk video" onChange={(e) => choose(e.target.files?.[0])} />
        {probe && !error && (
          <p className="num mt-4 text-[0.9375rem] text-ink-2">
            Seventy will send {frames.toLocaleString("en-US")} frames in {pieces} {pieces === 1 ? "piece" : "pieces"}, counted at the
            same time. Expect about {minutes} minutes.
          </p>
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
            art={Array.from({ length: 7 }, (_, i) => <DogGlyph key={i} status="unmarked" size={24} />)}
          />
          <Choice
            name="mode"
            checked={mode === "check"}
            onSelect={() => setMode("check")}
            title="Check a drive"
            body="Read the marks and measure coverage against the 70% line. Walk within three days, while marks are fresh."
            art={Array.from({ length: 7 }, (_, i) => <DogGlyph key={i} status={i < 5 ? "marked" : "unmarked"} size={24} />)}
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
            <input
              id={`${ids}-country`}
              list={`${ids}-countries`}
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Type a country"
              maxLength={60}
              className="field mt-2 placeholder:text-ink-3"
            />
            <datalist id={`${ids}-countries`}>
              {COUNTRIES.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
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
        <span className="text-[0.9375rem] text-ink-3">
          {probe && !error ? "Keep this tab open while the walk uploads." : "Choose a video to begin."}
        </span>
      </div>
    </form>
  );
}
