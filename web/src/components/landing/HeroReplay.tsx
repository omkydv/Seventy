"use client";

import { useState } from "react";
import { WalkReplay } from "@/components/WalkReplay";
import hero from "@/content/hero/mountain-village.json";
import { TARGET } from "@/lib/stats";

const chunks = [{ idx: 0, startS: 0, video: "/hero/mountain-village.mp4", sam: "/hero/mountain-village.dogs.txt", people: null }];
const dogs = hero.dogs.map((d) => ({ label: d.label, status: "counted", segments: d.segments }));
const doses = Math.ceil(TARGET * hero.dogs.length);

/** The product running: SAM 3.1's real output on a real walk, drawn in the browser, from the count to the answer a team gets. */
export function HeroReplay() {
  const [t, setT] = useState(0);
  const [still] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const seen = hero.dogs.filter((d) => d.firstS <= t + 0.04).length;
  const done = seen === hero.dogs.length;
  return (
    <figure className="relative">
      <WalkReplay
        chunks={chunks}
        dogs={dogs}
        aspect={2}
        narrowAspect={hero.width / hero.height}
        fit="cover"
        maxVh={0.75}
        autoPlay={!still}
        loop
        controls={false}
        rounded="rounded-[28px]"
        poster="/hero/mountain-village.jpg"
        onTime={setT}
      />
      {/* The count as it grows, then what the team does with it. Under the video on a phone, over it on larger screens. */}
      <div className="mt-3 flex flex-wrap items-center gap-2 md:pointer-events-none md:absolute md:bottom-0 md:left-0 md:mt-0 md:p-6" aria-live="off">
        <p className="rounded-full bg-ink px-4 py-2 text-[0.9375rem] font-semibold text-on-ink md:bg-white/94 md:text-[#0c1a28] md:shadow-[0_8px_24px_-10px_rgb(12_26_40/0.6)]">
          <span className="num inline-block min-w-[1.4ch] text-right">{seen}</span> {seen === 1 ? "dog" : "dogs"}, each counted once
        </p>
        <p
          className={`rounded-full bg-mark px-4 py-2 text-[0.9375rem] font-semibold text-white shadow-[0_8px_24px_-10px_rgb(12_26_40/0.6)] transition-opacity duration-500 ${done ? "opacity-100" : "opacity-0"}`}
        >
          Bring {doses} doses to reach 70%
        </p>
      </div>
    </figure>
  );
}
