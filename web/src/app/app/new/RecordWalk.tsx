"use client";

import { useEffect, useRef, useState } from "react";
import { clock } from "@/lib/format";
import { distanceText, metres, type Fix } from "@/lib/route";

export type Recording = { file: File; route: Fix[]; durationS: number; startedAt: string };

// Walks can be up to 20 minutes; finish just short so the file never runs over.
const MAX_S = 20 * 60 - 2;
// MP4 where the browser can record it (Safari, recent Chrome), WebM elsewhere; both run through the same pipeline.
const TYPES = ["video/mp4;codecs=avc1.640028", "video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];
const pickType = () => (typeof MediaRecorder === "undefined" ? null : (TYPES.find((t) => MediaRecorder.isTypeSupported(t)) ?? ""));

type Gps = { state: "finding" | "ok" | "off"; acc?: number };

/**
 * Film the walk inside Seventy. The camera records the street while the phone's location is
 * saved alongside, second by second, so every dog counted can be put on a map where it was seen.
 * Nothing leaves the phone until the survey starts.
 */
export function RecordWalk({ onDone, onClose }: { onDone: (r: Recording) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const parts = useRef<Blob[]>([]);
  const fixes = useRef<Fix[]>([]);
  const anchor = useRef<Fix | null>(null);
  const lastPos = useRef<GeolocationPosition | null>(null);
  const started = useRef<number | null>(null);
  const wake = useRef<{ release: () => Promise<void> } | null>(null);
  const [phase, setPhase] = useState<"starting" | "ready" | "recording" | "saving" | "error">("starting");
  const [error, setError] = useState<string | null>(null);
  const [gps, setGps] = useState<Gps>({ state: "finding" });
  const [elapsed, setElapsed] = useState(0);
  const [walked, setWalked] = useState(0);

  // Camera and location, as soon as the recorder opens.
  useEffect(() => {
    let watch: number | null = null;
    let gone = false;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia || pickType() === null) {
        setError("This browser can’t record video. Open Seventy in Chrome or Safari on the phone, or upload a video instead.");
        setPhase("error");
        return;
      }
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
          audio: false,
        });
        if (gone) return s.getTracks().forEach((t) => t.stop());
        stream.current = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          await videoRef.current.play().catch(() => {});
        }
        setPhase("ready");
      } catch (e) {
        const name = e instanceof DOMException ? e.name : "";
        setError(name === "NotAllowedError" ? "Seventy needs the camera to film the walk. Allow it in the browser’s site settings, or upload a video instead." : "The camera couldn’t be opened. Upload a video instead.");
        setPhase("error");
        return;
      }
      if (!navigator.geolocation) return setGps({ state: "off" });
      watch = navigator.geolocation.watchPosition(
        (pos) => {
          lastPos.current = pos;
          setGps({ state: "ok", acc: pos.coords.accuracy });
          if (started.current == null) return;
          const t = Math.max(0, (pos.timestamp - started.current) / 1000);
          const fix: Fix = [Number(t.toFixed(2)), pos.coords.latitude, pos.coords.longitude, Math.round(pos.coords.accuracy)];
          const prev = fixes.current[fixes.current.length - 1];
          if ((prev && fix[0] - prev[0] < 0.9) || fixes.current.length >= 5000) return;
          fixes.current.push(fix);
          // Count a step only once the phone has clearly moved, so standing still doesn't add metres.
          if (fix[3] > 35) return;
          const a = anchor.current;
          if (!a) anchor.current = fix;
          else if (metres([a[1], a[2]], [fix[1], fix[2]]) > Math.max(4, fix[3] * 0.6)) {
            setWalked((w) => w + metres([a[1], a[2]], [fix[1], fix[2]]));
            anchor.current = fix;
          }
        },
        () => setGps({ state: "off" }),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 },
      );
    })();
    return () => {
      gone = true;
      document.body.style.overflow = overflow;
      if (watch != null) navigator.geolocation.clearWatch(watch);
      stream.current?.getTracks().forEach((t) => t.stop());
      wake.current?.release().catch(() => {});
    };
  }, []);

  useEffect(() => {
    if (phase !== "recording") return;
    const id = window.setInterval(() => {
      const s = started.current ? (Date.now() - started.current) / 1000 : 0;
      setElapsed(s);
      if (s >= MAX_S) stop();
    }, 250);
    return () => window.clearInterval(id);
  }, [phase]);

  async function start() {
    const s = stream.current;
    const type = pickType();
    if (!s || type === null) return;
    parts.current = [];
    fixes.current = [];
    anchor.current = null;
    const rec = new MediaRecorder(s, { ...(type ? { mimeType: type } : {}), videoBitsPerSecond: 6_000_000 });
    rec.ondataavailable = (e) => {
      if (e.data.size) parts.current.push(e.data);
    };
    rec.onstop = () => {
      const t0 = started.current ?? Date.now();
      const mime = rec.mimeType || type || "video/webm";
      const stamp = new Date(t0).toISOString().slice(0, 16).replace(/[-:T]/g, "");
      const file = new File(parts.current, `walk-${stamp}.${mime.includes("mp4") ? "mp4" : "webm"}`, { type: mime.split(";")[0] });
      onDone({ file, route: fixes.current, durationS: (Date.now() - t0) / 1000, startedAt: new Date(t0).toISOString() });
    };
    recorder.current = rec;
    rec.start(1000);
    started.current = Date.now();
    // A fix from just before the start marks where the walk began.
    const p = lastPos.current;
    if (p && Date.now() - p.timestamp < 15000) {
      const first: Fix = [0, p.coords.latitude, p.coords.longitude, Math.round(p.coords.accuracy)];
      fixes.current.push(first);
      if (first[3] <= 35) anchor.current = first;
    }
    setWalked(0);
    setElapsed(0);
    setPhase("recording");
    try {
      const nav = navigator as Navigator & { wakeLock?: { request: (t: "screen") => Promise<{ release: () => Promise<void> }> } };
      wake.current = (await nav.wakeLock?.request("screen")) ?? null;
    } catch {
      /* the screen may dim; the recording carries on */
    }
  }

  function stop() {
    if (recorder.current?.state !== "recording") return;
    setPhase("saving");
    recorder.current.stop();
    wake.current?.release().catch(() => {});
  }

  const gpsText = gps.state === "ok" ? `Location ±${Math.round(gps.acc ?? 0)} m` : gps.state === "finding" ? "Finding location" : "No location";
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#05090d] text-white" role="dialog" aria-modal="true" aria-label="Record a walk">
      <video ref={videoRef} muted playsInline className="absolute inset-0 size-full object-cover" />
      <div className="relative flex items-center justify-between gap-3 bg-gradient-to-b from-black/60 to-transparent px-4 pb-10 pt-[max(1rem,env(safe-area-inset-top))]">
        <button type="button" onClick={phase === "recording" ? stop : onClose} className="rounded-full bg-black/55 px-4 py-2 text-[0.9375rem] font-semibold">
          {phase === "recording" ? "Finish" : "Cancel"}
        </button>
        {phase === "recording" && <span className="num rounded-full bg-[#b42318] px-3.5 py-1.5 text-[0.9375rem] font-semibold">{clock(elapsed)}</span>}
        {phase !== "error" && (
          <span className="flex items-center gap-2 rounded-full bg-black/55 px-3.5 py-2 text-[0.8125rem] font-semibold" aria-live="polite">
            <span aria-hidden className={`size-2 rounded-full ${gps.state === "ok" ? "bg-white" : gps.state === "finding" ? "animate-pulse bg-white/60" : "bg-white/25"}`} />
            {gpsText}
          </span>
        )}
      </div>

      <div className="relative mt-auto flex flex-col items-center gap-4 bg-gradient-to-t from-black/70 to-transparent px-6 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-16">
        {phase === "error" ? (
          <div className="max-w-sm rounded-[18px] bg-black/70 p-5 text-center">
            <p className="text-[0.9375rem]">{error}</p>
            <button type="button" onClick={onClose} className="btn btn-light mt-4">
              Upload a video instead
            </button>
          </div>
        ) : (
          <>
            {phase === "recording" && (
              <p className="num text-[0.9375rem] font-medium text-white/85">
                {gps.state === "off" ? "Filming without location" : `${distanceText(walked)} walked`}
              </p>
            )}
            <button
              type="button"
              onClick={phase === "recording" ? stop : start}
              disabled={phase === "starting" || phase === "saving"}
              aria-label={phase === "recording" ? "Finish the walk" : "Start filming"}
              className="flex size-20 items-center justify-center rounded-full ring-4 ring-white/90 transition-transform active:scale-95 disabled:opacity-50"
            >
              <span className={`block bg-[#e5484d] transition-all ${phase === "recording" ? "size-8 rounded-[8px]" : "size-16 rounded-full"}`} />
            </button>
            <p className="max-w-xs text-center text-[0.875rem] text-white/80">
              {phase === "starting" && "Opening the camera"}
              {phase === "ready" && "Hold the phone sideways at chest height and walk slowly. Film every dog you pass."}
              {phase === "recording" && "Seventy is saving the route with the video. Tap the square to finish."}
              {phase === "saving" && "Saving the walk"}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
