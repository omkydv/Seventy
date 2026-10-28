"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  p: number;
  low: number;
  high: number;
  target?: number;
  /** Fill on mount instead of when scrolled into view. */
  immediate?: boolean;
  size?: "lg" | "sm";
};

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;

/** Coverage against the target line, with its 95% interval as a lighter band. */
export function CoverageMeter({ p, low, high, target = 0.7, immediate = false, size = "lg" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(immediate);

  useEffect(() => {
    if (shown) return;
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
  }, [shown]);

  const bar = size === "lg" ? "h-4" : "h-2.5";
  return (
    <div ref={ref} className="w-full">
      <div className={`relative ${bar} w-full rounded-full bg-canvas-2`}>
        <div
          className="absolute inset-y-0 rounded-full bg-mark-soft"
          style={{ left: `${low * 100}%`, width: shown ? `${(high - low) * 100}%` : "0%", transition: "width 700ms var(--ease-out-quint) 600ms" }}
        />
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-mark"
          style={{ width: shown ? `${p * 100}%` : "0%", transition: "width 1100ms var(--ease-out-quint)" }}
        />
        <div className="absolute -inset-y-2 w-[2px] rounded-full bg-ink" style={{ left: `calc(${target * 100}% - 1px)` }} aria-hidden />
      </div>
      <div className="relative mt-2.5 h-5 text-[0.8125rem] font-semibold">
        <span className="absolute -translate-x-1/2 text-ink" style={{ left: `${target * 100}%` }}>
          {Math.round(target * 100)}% line
        </span>
      </div>
      <span className="sr-only">
        Coverage {pct(p)}, 95% interval {pct(low)} to {pct(high)}, target {Math.round(target * 100)}%.
      </span>
    </div>
  );
}
