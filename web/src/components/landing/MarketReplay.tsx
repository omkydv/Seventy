"use client";

import { useEffect, useRef, useState } from "react";
import { WalkReplay } from "@/components/WalkReplay";
import walk from "@/content/walks/market-street.json";

const dogs = walk.dogs.map((d) => ({ ...d, status: "counted" }));

/**
 * The market street walk as the survey shows it: four dogs outlined and numbered, the crowd behind
 * them pixelated inside their own outlines. It mounts only once it is on screen, so the page runs one replay at a time.
 */
export function MarketReplay() {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setOn(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className="absolute inset-0 flex flex-col justify-center bg-[#08121c]">
      {on ? (
        <WalkReplay chunks={walk.chunks} dogs={dogs} aspect={4 / 3} fit="cover" maxVh={0.66} autoPlay loop controls={false} rounded="rounded-none" />
      ) : null}
      <div className="absolute inset-x-5 bottom-5 flex flex-wrap gap-2">
        <span className="rounded-full bg-white/94 px-3.5 py-1.5 text-[0.875rem] font-semibold text-[#0c1a28]">4 dogs, each counted once</span>
        <span className="rounded-full bg-[rgb(8_18_28/0.7)] px-3.5 py-1.5 text-[0.875rem] font-medium text-white">Every person blurred</span>
      </div>
    </div>
  );
}
