"use client";

import { useEffect, useRef, useState } from "react";

const methods = [
  { value: 47, how: "Counting dogs on two days" },
  { value: 32, how: "From the ratio of people to dogs" },
  { value: 19, how: "From an estimate of dog density" },
];

/** One campaign's coverage, measured three standard ways, against the 70% line. The bars grow when they come into view. */
export function MethodBars() {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  // Without motion the bars are drawn full from the start.
  const [still] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const shown = seen || still;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (still) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [still]);

  return (
    <div ref={ref} role="img" aria-label="One campaign measured three ways: 47%, 32% and 19%, against a 70% target." className="relative">
      <div className="space-y-7">
        {methods.map((m, i) => (
          <div key={m.value}>
            <div className="flex items-baseline gap-4">
              <p className="display num w-[7rem] shrink-0 text-4xl md:w-[8.75rem] md:text-5xl">{m.value}%</p>
              <p className="text-ink-2">{m.how}</p>
            </div>
            <div className="relative mt-3 h-3 rounded-full bg-canvas-2">
              <div
                className="h-full rounded-full bg-amber"
                style={{
                  width: shown ? `${m.value}%` : "0%",
                  transition: `width 1100ms var(--ease-out-quint) ${i * 140}ms`,
                }}
              />
              {/* Where the bar needed to reach. */}
              <span aria-hidden className="absolute -inset-y-1.5 left-[70%] w-0.5 -translate-x-1/2 rounded-full bg-ink" />
              {i === methods.length - 1 && (
                <span aria-hidden className="absolute left-[70%] top-6 -translate-x-1/2 whitespace-nowrap text-[0.75rem] font-semibold">
                  70% line
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
