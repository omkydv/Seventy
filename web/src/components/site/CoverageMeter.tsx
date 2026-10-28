"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  p: number;
  low: number;
  high: number;
  target?: number;
  caption?: string;
  /** Visual weight: "lg" for the landing, "sm" for tables. */
  size?: "lg" | "sm";
};

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

/** Coverage with its interval against the target line. The fill settles once, when the value arrives on screen. */
export function CoverageMeter({ p, low, high, target = 0.7, caption, size = "lg" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const h = size === "lg" ? "h-3" : "h-2";
  return (
    <div ref={ref} className="w-full">
      <div className={`relative ${h} w-full rounded-full bg-paper-3`}>
        <div
          className="absolute inset-y-0 rounded-full bg-accent-soft"
          style={{
            left: `${low * 100}%`,
            width: shown ? `${(high - low) * 100}%` : "0%",
            transition: "width 700ms var(--ease-out-field) 500ms",
          }}
        />
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-accent"
          style={{ width: shown ? `${p * 100}%` : "0%", transition: "width 1000ms var(--ease-out-field)" }}
        />
        <div className="absolute -inset-y-2 w-px bg-ink" style={{ left: `${target * 100}%` }} aria-hidden />
      </div>
      <div className="relative mt-2 h-4 text-xs">
        <span className="label absolute -translate-x-1/2 text-ink" style={{ left: `${target * 100}%` }}>
          {Math.round(target * 100)}
        </span>
      </div>
      {caption && <p className="mt-2 text-sm text-ink-2">{caption}</p>}
      <span className="sr-only">
        Coverage {pct(p)}, 95% interval {pct(low)} to {pct(high)}, target {Math.round(target * 100)}%.
      </span>
    </div>
  );
}
