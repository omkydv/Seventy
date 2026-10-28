"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState } from "react";
import { rememberFile } from "@/lib/client/files";
import { rememberUploads, type UploadTicket } from "@/lib/client/uploads";
import { probeVideo, type Probe } from "@/lib/client/video";
import { api, ensureWorkspace } from "@/lib/client/workspace";
import { duration } from "@/lib/format";

type Mode = "plan" | "check";
type Target = "vaccination" | "sterilization";

const FPS = 5;

export function NewWalkForm() {
  const router = useRouter();
  const fileId = useId();
  const areaId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [probe, setProbe] = useState<Probe | null>(null);
  const [probing, setProbing] = useState(false);
  const [area, setArea] = useState("");
  const [mode, setMode] = useState<Mode>("plan");
  const [target, setTarget] = useState<Target>("vaccination");
  const [paint, setPaint] = useState(true);
  const [collar, setCollar] = useState(false);
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
      setError(e instanceof Error ? e.message : "Couldn’t read that video.");
    } finally {
      setProbing(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !probe) return setError("Choose a walk video first.");
    if (mode === "check" && target === "vaccination" && !paint && !collar) {
      return setError("Pick at least one kind of vaccination mark to look for.");
    }
    setBusy(true);
    setError(null);
    try {
      await ensureWorkspace();
      const res = await api<{ walk: { id: string }; uploads: UploadTicket[] }>("/api/walks", {
        method: "POST",
        json: {
          mode,
          areaName: area || undefined,
          title: area || undefined,
          targetMark: mode === "check" ? target : "vaccination",
          markTypes: mode === "check" && target === "vaccination" ? [paint && "paint", collar && "collar"].filter(Boolean) : ["paint"],
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
      setError(err instanceof Error ? err.message : "Couldn’t start this walk.");
      setBusy(false);
    }
  }

  const frames = probe ? Math.round(probe.durationS * FPS) : 0;
  const minutes = probe ? Math.max(1, Math.ceil(probe.durationS / 60)) : 0;

  return (
    <form onSubmit={submit} className="mt-10 space-y-10" noValidate>
      <div>
        <label htmlFor={fileId} className="block text-sm font-semibold">
          Walk video
        </label>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-2 flex w-full flex-col items-start rounded-[8px] border border-line-strong bg-card px-5 py-5 text-left transition-colors hover:border-ink"
        >
          {file ? (
            <>
              <span className="font-medium">{file.name}</span>
              <span className="num mt-1 text-sm text-ink-2">
                {probing && "Reading the video…"}
                {probe &&
                  `${duration(probe.durationS)} · ${probe.width}×${probe.height}${probe.fps ? ` · ${Math.round(probe.fps)} fps` : ""} · ${(file.size / 1e6).toFixed(0)} MB on this device`}
              </span>
            </>
          ) : (
            <>
              <span className="font-medium">Choose a walk video</span>
              <span className="mt-1 text-sm text-ink-3">MP4 or MOV from your phone, up to 20 minutes.</span>
            </>
          )}
        </button>
        <input
          ref={inputRef}
          id={fileId}
          type="file"
          accept="video/*"
          className="sr-only"
          onChange={(e) => choose(e.target.files?.[0])}
        />
        {probe && !error && (
          <p className="num mt-3 text-sm text-ink-2">
            Seventy will send {frames.toLocaleString("en-US")} frames in {minutes} {minutes === 1 ? "piece" : "pieces"}, tracked in
            parallel.
          </p>
        )}
      </div>

      <div>
        <label htmlFor={areaId} className="block text-sm font-semibold">
          Area or route
        </label>
        <input
          id={areaId}
          value={area}
          onChange={(e) => setArea(e.target.value)}
          placeholder="Ward 4, or Route A"
          maxLength={120}
          className="mt-2 h-11 w-full max-w-md rounded-[8px] border border-line-strong bg-card px-3.5 text-base outline-none placeholder:text-ink-3 focus:border-ink"
        />
        <p className="mt-2 text-sm text-ink-3">Use the same name each time you walk a route, so walks can be compared.</p>
      </div>

      <fieldset>
        <legend className="text-sm font-semibold">What is this walk for?</legend>
        <div className="mt-3 grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-2">
          {(
            [
              ["plan", "Plan", "Count the dogs before a drive and estimate how many live here."],
              ["check", "Check", "Read vaccination or sterilization marks after a drive."],
            ] as const
          ).map(([value, name, help]) => (
            <label
              key={value}
              className={`cursor-pointer rounded-[8px] border px-4 py-3.5 transition-colors ${mode === value ? "border-ink bg-card" : "border-line-strong hover:border-ink-3"}`}
            >
              <input type="radio" name="mode" value={value} checked={mode === value} onChange={() => setMode(value)} className="sr-only" />
              <span className="flex items-center gap-2 font-semibold">
                <span aria-hidden className={`size-3.5 rounded-full border ${mode === value ? "border-[5px] border-accent" : "border-line-strong"}`} />
                {name}
              </span>
              <span className="mt-1 block text-sm text-ink-2">{help}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {mode === "check" && (
        <fieldset>
          <legend className="text-sm font-semibold">Which mark?</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                ["vaccination", "Vaccination"],
                ["sterilization", "Sterilization (ear notch)"],
              ] as const
            ).map(([value, name]) => (
              <label
                key={value}
                className={`cursor-pointer rounded-full border px-4 py-2 text-sm transition-colors ${target === value ? "border-ink bg-ink text-paper" : "border-line-strong hover:border-ink-3"}`}
              >
                <input type="radio" name="target" value={value} checked={target === value} onChange={() => setTarget(value)} className="sr-only" />
                {name}
              </label>
            ))}
          </div>
          {target === "vaccination" && (
            <div className="mt-4 flex flex-wrap gap-5 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={paint} onChange={(e) => setPaint(e.target.checked)} className="size-4 accent-[var(--accent)]" />
                Paint or crayon mark
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={collar} onChange={(e) => setCollar(e.target.checked)} className="size-4 accent-[var(--accent)]" />
                Collar or band
              </label>
            </div>
          )}
        </fieldset>
      )}

      {error && (
        <p role="alert" className="rounded-[8px] border border-warn/40 bg-warn-soft px-4 py-3 text-sm text-ink">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-4 border-t border-line pt-8">
        <button type="submit" className="btn btn-primary disabled:opacity-50" disabled={!probe || !!error || busy}>
          {busy ? "Starting…" : "Count this walk"}
        </button>
        {probe && !error && (
          <span className="text-sm text-ink-3">Keep this tab open while the walk uploads. It takes a few minutes.</span>
        )}
      </div>
    </form>
  );
}
