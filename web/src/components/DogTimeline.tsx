"use client";

import { clock } from "@/lib/format";

export type TimelineDog = { label: number; status: string; first_s: number; last_s: number };

const BAR: Record<string, string> = {
  marked: "bg-mark",
  unmarked: "bg-ink",
  counted: "bg-ink",
  unknown: "border-[1.5px] border-dashed border-ink-3 bg-surface",
  duplicate: "bg-line-strong",
  not_a_dog: "bg-line-strong",
};

const WORD: Record<string, string> = {
  marked: "marked",
  unmarked: "not marked",
  counted: "counted",
  unknown: "can’t tell",
  duplicate: "seen again, counted once",
  not_a_dog: "not a dog",
};

/**
 * One line per dog, from the moment SAM 3.1 first sees it to the last, so
 * "counted once" is something you can see. The cursor follows the replay.
 */
export function DogTimeline({
  dogs,
  duration,
  time,
  selected,
  onPick,
}: {
  dogs: TimelineDog[];
  duration: number;
  time: number;
  selected: number | null;
  onPick: (label: number, at: number) => void;
}) {
  const span = Math.max(duration, 0.1);
  const pct = (s: number) => `${Math.min(100, Math.max(0, (s / span) * 100))}%`;
  const dense = dogs.length > 16;
  return (
    <div className="select-none">
      <div className="relative">
        <ul className={dense ? "space-y-0.5" : "space-y-1"}>
          {dogs.map((d) => {
            const on = selected === d.label;
            return (
              <li key={d.label}>
                <button
                  type="button"
                  onClick={() => onPick(d.label, d.first_s)}
                  aria-pressed={on}
                  aria-label={`Dog ${d.label}, ${WORD[d.status] ?? d.status}, seen ${clock(d.first_s)} to ${clock(d.last_s)}`}
                  className={`group grid w-full grid-cols-[3.75rem_1fr] items-center rounded-[8px] text-left transition-colors ${dense ? "h-5" : "h-7"} ${on ? "bg-canvas-2" : "hover:bg-canvas-2/70"}`}
                >
                  <span className={`num pl-2 text-[0.8125rem] ${on ? "font-semibold text-ink" : "text-ink-2"}`}>Dog {d.label}</span>
                  <span className="relative mr-2 block h-full">
                    <span
                      className={`absolute top-1/2 -translate-y-1/2 rounded-full ${dense ? "h-2" : "h-2.5"} ${BAR[d.status] ?? BAR.unknown} ${on ? "ring-2 ring-focus/40" : ""}`}
                      style={{ left: pct(d.first_s), width: `max(6px, ${pct(d.last_s - d.first_s)})` }}
                    />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-[3.75rem] right-2">
          <span className="absolute inset-y-0 w-px bg-focus" style={{ left: pct(time) }} />
        </div>
      </div>
      <div className="num ml-[3.75rem] mr-2 mt-2 flex justify-between text-[0.75rem] text-ink-3" aria-hidden>
        <span>0:00</span>
        <span>{clock(span / 2)}</span>
        <span>{clock(span)}</span>
      </div>
    </div>
  );
}
