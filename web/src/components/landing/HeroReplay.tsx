"use client";

import { useState } from "react";
import { WalkReplay } from "@/components/WalkReplay";
import hero from "@/content/hero/mountain-village.json";

const chunks = [{ idx: 0, startS: 0, video: "/hero/mountain-village.mp4", sam: "/hero/mountain-village.dogs.txt", people: null }];
const dogs = hero.dogs.map((d) => ({ label: d.label, status: "counted", segments: d.segments }));

/** The product running: SAM 3.1's real output on a real walk, drawn in the browser, with the count as it grows. */
export function HeroReplay() {
  const [t, setT] = useState(0);
  const [still] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const seen = hero.dogs.filter((d) => d.firstS <= t + 0.04).length;
  return (
    <figure className="relative">
      <WalkReplay
        chunks={chunks}
        dogs={dogs}
        aspect={hero.width / hero.height}
        autoPlay={!still}
        loop
        controls={false}
        rounded="rounded-[28px]"
        poster="/hero/mountain-village.jpg"
        onTime={setT}
      />
      {/* Under the video on a phone, over it on larger screens. */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 md:pointer-events-none md:absolute md:inset-x-0 md:bottom-0 md:mt-0 md:items-end md:p-6">
        <p
          className="rounded-full bg-ink px-4 py-2 text-[0.9375rem] font-semibold text-on-ink md:bg-white/92 md:text-[#0c1a28] md:shadow-[0_8px_24px_-10px_rgb(12_26_40/0.6)]"
          aria-live="off"
        >
          <span className="num inline-block min-w-[1.4ch] text-right">{seen}</span> {seen === 1 ? "dog" : "dogs"}, each counted once
        </p>
        <figcaption className="text-[0.8125rem] leading-snug text-ink-2 md:max-w-[22rem] md:rounded-[14px] md:bg-[rgb(8_18_28/0.62)] md:px-3.5 md:py-2 md:text-white/90">
          SAM 3.1 following a pack in a mountain village. Real output, drawn live in your browser.
        </figcaption>
      </div>
    </figure>
  );
}
