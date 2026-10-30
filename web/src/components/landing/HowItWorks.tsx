"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CoverageMeter } from "@/components/CoverageMeter";
import { DogGlyph } from "@/components/DogGlyph";
import { PhotoCropClient } from "@/components/PhotoCropClient";
import { SamPhoto } from "@/components/SamPhoto";
import type { Box, Outline } from "@/lib/sam/protocol";

export type HowData = {
  lane: { width: number; height: number; ear: Outline[]; earRegion: Box };
  parking: { width: number; height: number; dogs: Outline[] };
  reading: { reason: string; paint: string; ear: string; seconds: number };
  example: { p: number; low: number; high: number; marked: number; unmarked: number };
  population: { n1: number; n2: number; m: number; n: number; low: number; high: number };
};

function WalkVisual() {
  return (
    <div className="relative h-full w-full">
      <SamPhoto
        src="/photos/lane-dawn-dog.jpg"
        alt="The village lane at dawn, as seen through a phone during a survey walk."
        width={2400}
        height={1506}
        outlines={[]}
        focus={{ x: 0.35, y: 0.6 }}
        sizes="(min-width: 1024px) 55vw, 100vw"
        className="absolute inset-0"
      />
      <div className="absolute inset-x-5 bottom-5 rounded-[16px] bg-white/94 p-4 text-[#0c1a28]">
        <div className="flex items-center justify-between text-[0.9375rem] font-semibold">
          <span>Recording the walk</span>
          <span>4:12 of 10:00</span>
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-[#e7eef3]">
          <div className="h-full w-[42%] rounded-full bg-[#0c1a28]" />
        </div>
        <p className="mt-3 text-[0.875rem] text-[#3d4f63]">
          The phone keeps the original. It sends a small copy, five frames a second, for counting.
        </p>
      </div>
    </div>
  );
}

function CountVisual({ data }: { data: HowData["parking"] }) {
  return (
    <SamPhoto
      src="/photos/dogs-parking.jpg"
      alt="Four dogs resting on a verge beside a car park, each outlined by SAM 3.1."
      width={data.width}
      height={data.height}
      outlines={data.dogs}
      marks={data.dogs.map((d, i) => ({ id: d.id, color: "#ffffff", label: `Dog ${i + 1}` }))}
      focus={{ x: 0.5, y: 0.66 }}
      sizes="(min-width: 1024px) 55vw, 100vw"
      drawOnView
      delay={100}
      className="absolute inset-0"
    />
  );
}

function ReadVisual({ data, reading }: { data: HowData["lane"]; reading: HowData["reading"] }) {
  return (
    <div className="absolute inset-0 grid grid-rows-[1fr_auto] bg-[#14202c]">
      <PhotoCropClient
        src="/photos/lane-dawn-dog.jpg"
        alt="Close-up of the dog’s ear, outlined by SAM 3.1."
        width={data.width}
        height={data.height}
        region={data.earRegion}
        outlines={data.ear}
        color="#2fd47f"
        className="h-full w-full"
      />
      <div className="bg-white p-5 text-[#0c1a28]">
        <div className="grid grid-cols-3 gap-3 text-[0.9375rem]">
          <div>
            <p className="text-[#6e7f91]">Ear notch</p>
            <p className="font-semibold">{reading.ear}</p>
          </div>
          <div>
            <p className="text-[#6e7f91]">Paint mark</p>
            <p className="font-semibold">{reading.paint}</p>
          </div>
          <div>
            <p className="text-[#6e7f91]">Read in</p>
            <p className="font-semibold">{reading.seconds.toFixed(1)} s</p>
          </div>
        </div>
        <p className="mt-3 text-[0.875rem] text-[#3d4f63]">{reading.reason}</p>
      </div>
    </div>
  );
}

function DecideVisual({ e }: { e: HowData["example"] }) {
  const shownMarked = Math.round(e.p * 40);
  return (
    <div className="flex h-full flex-col justify-center bg-white p-7 text-[#0c1a28] sm:p-10">
      <p className="text-[0.9375rem] text-[#3d4f63]">Vaccination coverage</p>
      <p className="display mt-1 text-6xl sm:text-7xl">{(e.p * 100).toFixed(1)}%</p>
      <p className="mt-2 text-[0.9375rem] text-[#3d4f63]">
        95% interval {(e.low * 100).toFixed(1)} to {(e.high * 100).toFixed(1)}, from {e.marked} marked and {e.unmarked} unmarked dogs
      </p>
      <div className="mt-8">
        <CoverageMeter p={e.p} low={e.low} high={e.high} />
      </div>
      <div className="mt-6 grid w-fit grid-cols-[repeat(10,18px)] gap-1.5 sm:grid-cols-[repeat(20,18px)]" aria-hidden>
        {Array.from({ length: 40 }, (_, i) => (
          <DogGlyph key={i} status={i < shownMarked ? "marked" : "unmarked"} size={18} />
        ))}
      </div>
      <p className="mt-6 text-lg font-semibold">Complete, but not yet certain.</p>
      <p className="mt-1 text-[0.9375rem] text-[#3d4f63]">The estimate clears the line; the lower end of the interval does not.</p>
    </div>
  );
}

function PlanVisual({ p }: { p: HowData["population"] }) {
  const row = (n: number, matched: number) => (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: n }, (_, i) => (
        <DogGlyph key={i} status={i < matched ? "marked" : "unmarked"} size={18} />
      ))}
    </div>
  );
  return (
    <div className="flex h-full flex-col justify-center gap-6 bg-white p-7 text-[#0c1a28] sm:p-10">
      <div>
        <p className="text-[0.9375rem] font-semibold">Walk one, Tuesday</p>
        <p className="mb-2 text-[0.875rem] text-[#6e7f91]">{p.n1} dogs seen</p>
        {row(p.n1, p.m)}
      </div>
      <div>
        <p className="text-[0.9375rem] font-semibold">Walk two, Wednesday</p>
        <p className="mb-2 text-[0.875rem] text-[#6e7f91]">
          {p.n2} dogs seen, {p.m} recognised from walk one
        </p>
        {row(p.n2, p.m)}
      </div>
      <div className="rounded-[16px] bg-[#f2f6f9] p-5">
        <p className="text-[0.9375rem] text-[#3d4f63]">Dogs living on this route</p>
        <p className="display text-5xl">About {Math.round(p.n)}</p>
        <p className="mt-1 text-[0.875rem] text-[#6e7f91]">
          95% interval {Math.round(p.low)} to {Math.round(p.high)}. Worked example with illustrative counts.
        </p>
      </div>
    </div>
  );
}

/** `flow` visuals are panels of text and figures: on phones they take their own height instead of a photo frame. */
type Step = { title: string; body: ReactNode; meta: string; visual: ReactNode; flow?: boolean };

export function HowItWorks({ data }: { data: HowData }) {
  const steps: Step[] = [
    {
      title: "Walk the street",
      body: "The surveyor walks the area as before, filming instead of counting. Any phone works. Ten minutes covers a typical ward.",
      meta: "A ten-minute walk is 3,000 frames at five a second.",
      visual: <WalkVisual />,
    },
    {
      title: "Count every dog once",
      body: "SAM 3.1 follows each dog through the video from the single word “dog”. When a dog leaves the frame and comes back, Muse Spark checks it against the dogs already counted, so nothing is counted twice.",
      meta: `${data.parking.dogs.length} dogs found in this photograph by SAM 3.1.`,
      visual: <CountVisual data={data.parking} />,
    },
    {
      title: "Read every mark",
      body: "For each dog, Seventy cuts the sharpest close-ups from the original video. SAM 3.1 finds the ears and enlarges them, and Muse Spark reads what is there: paint, a collar, an ear tag, a sterilization notch, or that it can’t see well enough to say.",
      meta: "When the model can’t tell, a person decides.",
      visual: <ReadVisual data={data.lane} reading={data.reading} />,
    },
    {
      title: "Decide with an honest margin",
      body: "Coverage comes with a 95% interval, and dogs that couldn’t be read are counted and shown, never hidden. The team sees whether the area is done, nearly done, or needs another round.",
      meta: "Example using counts from a published 2026 campaign survey.",
      visual: <DecideVisual e={data.example} />,
      flow: true,
    },
    {
      title: "Plan the next drive",
      body: "The matching that keeps a dog counted once can also recognise it on a second walk of the same route. Chapman’s mark–resight formula, a standard method in field ecology, turns two walks into an estimate of how many dogs live there, without catching a single one.",
      meta: "Worked example with illustrative counts. Muse Wonder then writes the report, with every rule it relies on cited.",
      visual: <PlanVisual p={data.population} />,
      flow: true,
    },
  ];

  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section id="how" className="scroll-mt-6 bg-canvas py-28 md:py-40">
      <div className="shell">
        <div className="max-w-3xl">
          <h2 className="display text-[2rem] sm:text-4xl md:text-[4.25rem] md:leading-[1.02]">Seventy turns the same walk into evidence.</h2>
          <p className="lede mt-8 max-w-2xl">
            Five steps from a phone video to a decision. Every picture in this section is real output from Meta’s models on
            real photographs.
          </p>
        </div>

        <div className="mt-20 grid grid-cols-12 lg:gap-x-10">
          <div className="col-span-12 hidden lg:col-span-7 lg:block">
            <div className="sticky top-[12vh] h-[76vh] max-h-[720px]">
              <div className="panel relative h-full overflow-hidden">
                {steps.map((s, i) => (
                  <div
                    key={s.title}
                    className="absolute inset-0"
                    aria-hidden={i !== active}
                    style={{
                      opacity: i === active ? 1 : 0,
                      transform: i === active ? "scale(1)" : "scale(0.985)",
                      transition: "opacity 520ms var(--ease-out-quint), transform 520ms var(--ease-out-quint)",
                    }}
                  >
                    {s.visual}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <ol className="col-span-12 lg:col-span-5">
            {steps.map((s, i) => (
              <li
                key={s.title}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                data-index={i}
                className="flex flex-col justify-center py-10 lg:min-h-[76vh] lg:py-0"
              >
                <div className={`panel relative mb-8 overflow-hidden lg:hidden ${s.flow ? "" : "aspect-[4/3]"}`}>{s.visual}</div>
                <div
                  className="transition-colors duration-500"
                  style={{ color: active === i ? "var(--ink)" : undefined }}
                >
                  <p className={`text-[0.9375rem] font-semibold ${active === i ? "text-mark-strong" : "text-ink-3"} lg:transition-colors`}>
                    Step {i + 1} of {steps.length}
                  </p>
                  <h3 className={`display-quiet mt-3 text-3xl md:text-[2.5rem] ${active === i ? "text-ink" : "lg:text-ink-3"}`}>{s.title}</h3>
                  <p className={`mt-5 text-lg leading-relaxed ${active === i ? "text-ink-2" : "lg:text-ink-3"}`}>{s.body}</p>
                  <p className="mt-4 text-[0.9375rem] text-ink-3">{s.meta}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
