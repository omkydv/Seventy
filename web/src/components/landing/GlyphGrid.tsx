"use client";

import { useEffect, useRef, useState } from "react";
import { DOG_PATH } from "@/components/DogGlyph";

/**
 * A field of dogs, one glyph each, that scales to its container. When it
 * comes into view, dogs are marked one by one up to `marked`: the
 * vaccination drive, shown.
 */
export function GlyphGrid({
  total = 100,
  marked = 70,
  columns = 10,
  label,
}: {
  total?: number;
  marked?: number;
  columns?: number;
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [filled, setFilled] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let timer: number | undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        if (reduce) return setFilled(marked);
        let n = 0;
        timer = window.setInterval(() => {
          n += 1;
          setFilled(n);
          if (n >= marked) window.clearInterval(timer);
        }, 16);
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (timer) window.clearInterval(timer);
    };
  }, [marked]);

  // A fixed, irregular order so the marks spread across the field like a real drive.
  const order = Array.from({ length: total }, (_, i) => i).sort((a, b) => ((a * 37) % 101) - ((b * 37) % 101));
  const rank = new Map(order.map((idx, r) => [idx, r]));

  return (
    <div
      ref={ref}
      role="img"
      aria-label={label ?? `${marked} of ${total} dogs vaccinated`}
      className="grid gap-x-[3%] gap-y-[6%]"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: total }, (_, i) => {
        const on = rank.get(i)! < filled;
        return (
          <svg key={i} viewBox="0 0 36 24" className="block w-full" aria-hidden>
            <path
              d={DOG_PATH}
              fill={on ? "var(--mark)" : "none"}
              stroke={on ? "var(--mark)" : "var(--ink)"}
              strokeWidth={on ? 0 : 1.7}
              strokeLinejoin="round"
              style={{ transition: "fill 380ms var(--ease-out-quint), stroke 380ms var(--ease-out-quint)" }}
            />
          </svg>
        );
      })}
    </div>
  );
}
