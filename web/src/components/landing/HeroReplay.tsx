"use client";

import { useEffect, useRef, useState } from "react";
import { DogGlyph } from "@/components/DogGlyph";
import hero from "@/content/hero/mountain-village.json";
import { TARGET } from "@/lib/stats";

const doses = Math.ceil(TARGET * hero.dogs.length);
// Dogs in the order SAM first sees them, so the row fills the way the count grows.
const order = [...hero.dogs].sort((a, b) => a.firstS - b.firstS);
// The Meta models that worked on this walk's survey, in the order they run.
const models = [
  { model: "SAM 3.1", job: "Tracks every dog" },
  { model: "SAM 3.1", job: "Blurs every person" },
  { model: "SAM 3.1", job: "Enlarges each dog’s ears" },
  { model: "Muse Spark", job: "Reads every mark" },
  { model: "Muse Wonder", job: "Writes the report" },
];

function Status({ state, delay }: { state: "done" | "active" | "waiting"; delay: number }) {
  return (
    <span aria-hidden className="relative flex size-4 shrink-0 items-center justify-center">
      {state === "active" && <span className="absolute inset-0 animate-ping rounded-full bg-amber/40" />}
      <span
        className={`flex size-4 items-center justify-center rounded-full transition-colors duration-300 ${
          state === "done" ? "bg-mark" : state === "active" ? "bg-amber" : "bg-transparent ring-[1.5px] ring-inset ring-line-strong"
        }`}
        style={{ transitionDelay: `${delay}ms` }}
      >
        {state === "done" && (
          <svg viewBox="0 0 12 12" className="size-2.5" fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="m2.5 6.2 2.3 2.3 4.7-4.9" />
          </svg>
        )}
      </span>
    </span>
  );
}

/**
 * The product running, framed as the app shows it: SAM 3.1's real output on a real walk
 * (drawn by the app's own replay and saved as video), beside the answer it adds up to.
 * The video waits until the page and its headline have finished, so neither waits on it.
 */
export function HeroReplay() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [t, setT] = useState(0);
  const [still, setStill] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const id = window.setTimeout(() => setStill(true), 0);
      return () => window.clearTimeout(id);
    }
    let raf = 0;
    let timer = 0;
    const tick = () => {
      setT(v.currentTime);
      raf = requestAnimationFrame(tick);
    };
    const begin = () => {
      v.preload = "auto";
      v.src = "/hero/mountain-village-sam.mp4";
      v.play().catch(() => {});
    };
    const onPlaying = () => {
      setStarted(true);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(tick);
    };
    v.addEventListener("playing", onPlaying);
    // After the page has loaded and the headline's underline has drawn.
    const later = () => {
      timer = window.setTimeout(() => {
        const idle = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
        if (idle) idle(begin, { timeout: 800 });
        else begin();
      }, 1500);
    };
    if (document.readyState === "complete") later();
    else window.addEventListener("load", later, { once: true });
    return () => {
      window.removeEventListener("load", later);
      window.clearTimeout(timer);
      cancelAnimationFrame(raf);
      v.removeEventListener("playing", onPlaying);
    };
  }, []);

  const seen = still ? order.length : started ? order.filter((d) => d.firstS <= t + 0.04).length : 0;
  const done = seen === order.length;
  return (
    <figure className="overflow-hidden rounded-[28px] bg-surface shadow-[0_1px_0_rgb(12_26_40/0.05),0_40px_90px_-40px_rgb(12_26_40/0.55)] ring-1 ring-[#0c1a28]/8">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line px-5 py-3 md:px-6">
        <p className="flex min-w-0 items-center gap-3">
          <span className="truncate font-semibold tracking-[-0.01em]">Mountain village square</span>
          <span className="pill hidden h-6 bg-canvas-2 px-2.5 text-[0.75rem] text-ink-2 sm:inline-flex">Count before a drive</span>
        </p>
        <p className="flex items-center gap-2 text-[0.8125rem] font-medium text-ink-3">
          <span aria-hidden className={`size-2 rounded-full ${done ? "bg-mark" : "bg-amber"}`} />
          {done ? "Survey complete" : "Counting"}
        </p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="relative aspect-[16/9] bg-[#08121c]">
          <video
            ref={videoRef}
            className="absolute inset-0 size-full object-cover"
            poster="/hero/mountain-village-sam.jpg"
            muted
            playsInline
            loop
            preload="none"
            aria-label="A walk through a mountain village, every dog outlined and numbered by SAM 3.1"
          />
        </div>
        <div className="flex flex-col gap-5 border-t border-line p-6 lg:border-l lg:border-t-0" aria-live="off">
          <div>
            <p className="text-[0.875rem] font-semibold text-ink-2">Dogs counted, each once</p>
            <p className="display num mt-1 text-6xl leading-none">{seen}</p>
            <div className="mt-4 grid w-fit grid-cols-7 gap-x-1.5 gap-y-2" aria-hidden>
              {order.map((d, i) => (
                <DogGlyph key={d.label} status={i < seen ? "unmarked" : "empty"} size={24} />
              ))}
            </div>
          </div>
          <div>
            <p className="text-[0.875rem] font-semibold text-ink-2">Meta models on this walk</p>
            <ul className="mt-3 space-y-2.5">
              {models.map((m, i) => {
                const state = done ? "done" : i === 0 ? "active" : "waiting";
                return (
                  <li key={m.job} className="flex items-center gap-3 text-[0.875rem] leading-tight">
                    <Status state={state} delay={done ? i * 220 : 0} />
                    <span>
                      <span className="font-semibold">{m.model}</span> <span className="text-ink-3">{m.job.charAt(0).toLowerCase() + m.job.slice(1)}</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="mt-auto">
            <div className={`rounded-[16px] px-4 py-3.5 transition-colors duration-500 ${done ? "bg-mark-soft" : "bg-canvas-2"}`} aria-hidden={!done}>
              <p className="text-[0.8125rem] font-semibold text-ink-2">{done ? "Decision" : "Working"}</p>
              <p className="mt-0.5 font-semibold leading-snug">{done ? `Bring ${doses} doses to reach 70% of these dogs.` : "SAM 3.1 is following every dog."}</p>
            </div>
          </div>
        </div>
      </div>
    </figure>
  );
}
