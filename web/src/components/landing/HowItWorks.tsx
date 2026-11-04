"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CoverageMeter } from "@/components/CoverageMeter";
import { DOG_PATH, DogGlyph } from "@/components/DogGlyph";
import Image from "next/image";
import Link from "next/link";
import { SamPhoto } from "@/components/SamPhoto";
import report from "@/content/report-sample.json";
import samples from "@/content/samples.json";
import { MarketReplay } from "./MarketReplay";

export type HowData = {
  example: { p: number; low: number; high: number; marked: number; unmarked: number };
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
      {/* The app's own upload step, as it reads for a ten-minute walk. */}
      <div className="absolute inset-x-5 bottom-5 rounded-[16px] bg-white/94 p-4 text-[#0c1a28]">
        <div className="flex items-center justify-between gap-3 text-[0.9375rem] font-semibold">
          <span>Sending 8 of 20 pieces</span>
          <span className="num font-normal text-[#3d4f63]">10 minutes of video</span>
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-[#e7eef3]">
          <div className="h-full w-[40%] rounded-full bg-[#0c1a28]" />
        </div>
        <p className="mt-3 text-[0.875rem] text-[#3d4f63]">
          The phone keeps the original. The browser sends a small copy, five frames a second, and counting starts on the first piece.
        </p>
      </div>
    </div>
  );
}

/** A real mark, read: the promenade dog with a municipal ear tag, and the ear SAM 3.1 found and enlarged. */
function EarTagVisual() {
  return (
    <div className="grid grid-rows-[auto_auto] bg-[#14202c] lg:absolute lg:inset-0 lg:grid-rows-[1fr_auto]">
      <div className="relative aspect-[4/3] overflow-hidden lg:aspect-auto">
        <Image
          src="/photos/promenade-ear-tag-dog.jpg"
          alt="A cream street dog on a seaside promenade, a small yellow tag in its ear."
          fill
          sizes="(min-width: 1024px) 55vw, 100vw"
          className="object-cover object-[60%_30%]"
        />
        {/* Where the ear is, and what SAM 3.1 made of it. */}
        <span aria-hidden className="absolute left-[67.5%] top-[28%] size-14 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white shadow-[0_0_0_4px_rgb(8_18_28/0.35)]" />
        <figure className="absolute left-4 top-4 w-[30%] max-w-[11rem] overflow-hidden rounded-[16px] bg-white shadow-[0_12px_32px_-12px_rgb(8_18_28/0.7)]">
          <div className="relative aspect-[320/497]">
            <Image src="/m/887a06c9-3011-48c2-83ea-8ed9214ec3fe/crops/4-ear1.jpg" alt="The dog’s ear, enlarged, with the yellow tag." fill sizes="13rem" className="object-cover" />
          </div>
          <figcaption className="px-3 py-2 text-[0.75rem] font-semibold text-[#0c1a28]">Enlarged by SAM 3.1</figcaption>
        </figure>
      </div>
      <div className="bg-white p-5 text-[#0c1a28]">
        <div className="grid grid-cols-3 gap-3 text-[0.9375rem]">
          <div>
            <p className="text-[#6e7f91]">Mark</p>
            <p className="font-semibold">Ear tag, yellow</p>
          </div>
          <div>
            <p className="text-[#6e7f91]">In the frame</p>
            <p className="font-semibold">About 25 px</p>
          </div>
          <div>
            <p className="text-[#6e7f91]">Dog 4</p>
            <p className="font-semibold text-mark-strong">Marked, by a person</p>
          </div>
        </div>
        <p className="mt-3 text-[0.875rem] text-[#3d4f63]">A municipal ear tag on a dog far down a seaside promenade, too small to see until SAM 3.1 found the ear and enlarged it. Muse Spark called it too blurry to judge, and Seventy didn’t guess. A person settled it in one look.</p>
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

/**
 * The go-back map in the app's own map language: the route, each dog where it was first seen,
 * and the places with dogs to vaccinate ringed in amber. An illustration, not a recorded walk.
 */
function GoBackVisual() {
  const route = "M40 520 H430 V330 H650 V140 H780";
  const dogs: { x: number; y: number; marked: boolean }[] = [
    { x: 105, y: 520, marked: true },
    { x: 200, y: 520, marked: false },
    { x: 248, y: 520, marked: false },
    { x: 296, y: 520, marked: false },
    { x: 430, y: 455, marked: true },
    { x: 430, y: 385, marked: true },
    { x: 528, y: 330, marked: false },
    { x: 578, y: 330, marked: false },
    { x: 650, y: 255, marked: true },
    { x: 650, y: 185, marked: true },
    { x: 725, y: 140, marked: true },
  ];
  const label = { fontSize: 20, fontWeight: 600, fill: "#7a4b02", fontFamily: "var(--font-mona), system-ui, sans-serif", textAnchor: "middle" as const };
  return (
    <div className="flex h-full w-full flex-col bg-[#e8eef3] lg:relative lg:block lg:overflow-hidden">
      {/* On phones the map sits above its list; in the wide panel the list floats over the map. */}
      <div className="relative aspect-[5/4] lg:absolute lg:inset-0 lg:aspect-auto">
        <svg viewBox="0 0 800 640" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 size-full" aria-hidden>
          <g stroke="#ffffff" strokeWidth={26} strokeLinecap="round">
            {[520, 330, 140].map((y) => (
              <line key={`h${y}`} x1={-20} x2={820} y1={y} y2={y} />
            ))}
            {[170, 430, 650].map((x) => (
              <line key={`v${x}`} x1={x} x2={x} y1={-20} y2={660} />
            ))}
          </g>
          <circle cx={248} cy={520} r={74} fill="#f0a23a" fillOpacity={0.2} stroke="#c47a06" strokeWidth={2.5} />
          <circle cx={553} cy={330} r={58} fill="#f0a23a" fillOpacity={0.2} stroke="#c47a06" strokeWidth={2.5} />
          <path d={route} fill="none" stroke="#ffffff" strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
          <path d={route} fill="none" stroke="#0c1a28" strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={40} cy={520} r={8} fill="#ffffff" stroke="#0c1a28" strokeWidth={4} />
          <circle cx={780} cy={140} r={8} fill="#0c1a28" />
          {dogs.map((d) => (
            <g key={`${d.x}-${d.y}`}>
              <circle cx={d.x} cy={d.y} r={17} fill="#ffffff" stroke="rgb(12 26 40 / 0.16)" strokeWidth={1} />
              <path
                d={DOG_PATH}
                transform={`translate(${d.x - 10.5} ${d.y - 7}) scale(0.58)`}
                fill={d.marked ? "#12a85f" : "#ffffff"}
                stroke={d.marked ? "#12a85f" : "#0c1a28"}
                strokeWidth={2.6}
                strokeLinejoin="round"
              />
            </g>
          ))}
          <text x={248} y={428} {...label}>
            Place 1
          </text>
          <text x={553} y={254} {...label}>
            Place 2
          </text>
        </svg>
      </div>
      <div className="m-4 rounded-[16px] bg-white/95 p-4 text-[#0c1a28] shadow-[0_12px_32px_-16px_rgb(8_18_28/0.5)] lg:absolute lg:left-5 lg:top-5 lg:m-0 lg:w-[17.5rem]">
        <p className="font-semibold">Where to go back</p>
        <p className="mt-0.5 text-[0.875rem] text-[#3d4f63]">5 dogs not marked, in 2 places along the route.</p>
        <ol className="mt-3 space-y-2 text-[0.875rem]">
          {[
            ["Place 1", "3 dogs, 160 m from the start"],
            ["Place 2", "2 dogs, 420 m from the start"],
          ].map(([p, what]) => (
            <li key={p} className="flex items-center justify-between gap-3 rounded-[12px] bg-[#f2f6f9] px-3 py-2">
              <span>
                <span className="font-semibold">{p}</span>
                <span className="block text-[#3d4f63]">{what}</span>
              </span>
              <span className="font-semibold text-[#3d4f63]">Directions</span>
            </li>
          ))}
        </ol>
        <p className="mt-3 rounded-[10px] py-1.5 text-center text-[0.875rem] font-semibold shadow-[inset_0_0_0_1px_#c7d2dc]">Send to the team</p>
      </div>
    </div>
  );
}

function ReportVisual() {
  return (
    <div className="flex h-full flex-col justify-center gap-5 bg-white p-7 text-[#0c1a28] sm:p-10">
      <p className="text-[0.9375rem] text-[#3d4f63]">Programme report, written by Muse Wonder</p>
      <p className="display-quiet text-2xl leading-snug sm:text-[1.75rem]">{report.headline}</p>
      <ol className="space-y-2 text-[0.9375rem] text-[#3d4f63]">
        {report.next_steps.map((s, i) => (
          <li key={s} className="grid grid-cols-[1.5rem_1fr]">
            <span className="num font-semibold text-[#6e7f91]">{i + 1}</span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      <div className="rounded-[16px] bg-[#f2f6f9] p-5">
        <p className="text-[0.875rem] font-semibold">Sources found by web search</p>
        <ol className="mt-2 space-y-1 text-[0.875rem] text-[#3d4f63]">
          {report.sources.map((s, i) => (
            <li key={s} className="grid grid-cols-[1.5rem_1fr]">
              <span className="num font-semibold text-mark-strong">{i + 1}</span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/** `flow` visuals are panels of text and figures: on phones they take their own height instead of a photo frame. */
type Step = { title: string; body: ReactNode; meta: ReactNode; visual: ReactNode; flow?: boolean };

export function HowItWorks({ data }: { data: HowData }) {
  const steps: Step[] = [
    {
      title: "Walk the street",
      body: "The surveyor walks the area as before, filming instead of counting. Recording inside Seventy also saves the phone’s route; a video from any phone camera works too. Ten minutes covers a typical ward.",
      meta: "A ten-minute walk is 3,000 frames at five a second.",
      visual: <WalkVisual />,
    },
    {
      title: "Count every dog once",
      body: "SAM 3.1 follows each dog through the video from the single word “dog”. When a dog leaves the frame and comes back, Muse Spark checks it against the dogs already counted, so nothing is counted twice.",
      meta: "A city market walk, played back from SAM 3.1’s output: four dogs, and the crowd blurred.",
      visual: <MarketReplay />,
    },
    {
      title: "Read every mark",
      body: "For each dog, Seventy cuts the sharpest close-ups from the original video. SAM 3.1 finds the ears and enlarges them, and Muse Spark reads what is there: paint, a collar, an ear tag, a sterilization notch, or that it can’t see well enough to say. For collars and ear tags, SAM 3.1 looks for the mark too, as a second opinion.",
      meta: "A dog too far or blurred to read is kept out of the coverage, never guessed.",
      visual: <EarTagVisual />,
      flow: true,
    },
    {
      title: "Decide with an honest margin",
      body: "Coverage comes with a 95% interval, and dogs that couldn’t be read are counted and shown, never hidden. The team sees whether the area is done, nearly done, or needs another round.",
      meta: "Example using counts from a published 2026 campaign survey.",
      visual: <DecideVisual e={data.example} />,
      flow: true,
    },
    {
      title: "Go back where dogs were missed",
      body: "On a recorded walk, every dog sits on a map where it was first seen. The dogs still to vaccinate are grouped into places along the route, each with walking directions, and the list goes to the team’s chat in one tap. The mop-up goes only where it is needed.",
      meta: (
        <>
          An illustration of the go-back map. In the app it is drawn on real streets, from the phone’s GPS.{" "}
          <Link href={`/app/walks/${samples.filmWalk}#goback`} className="link font-semibold text-ink">
            Open the real map
          </Link>
        </>
      ),
      visual: <GoBackVisual />,
      flow: true,
    },
    {
      title: "Report to the office",
      body: "Muse Wonder writes one page for the district office: the result in a sentence, what to do tomorrow, and the WHO and national rules behind it, found by web search and cited.",
      meta: "From the report on the mountain village walk.",
      visual: <ReportVisual />,
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
            Six steps from a phone video to a decision, and to the streets the team still has to visit, shown with real output from Meta’s models.
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
                className="flex flex-col justify-center py-10 lg:min-h-[58vh] lg:py-0"
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
