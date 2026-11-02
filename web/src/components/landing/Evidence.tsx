import { DOG_PATH } from "@/components/DogGlyph";

type Job = { what: string; mode: string; without: string };
type Stage = { model: string; tone: "sam" | "spark" | "wonder"; jobs: Job[] };

const stages: Stage[] = [
  {
    model: "SAM 3.1",
    tone: "sam",
    jobs: [
      { what: "Follows every dog through the walk from the single word “dog”. This is the count.", mode: "Video tracking", without: "Dogs counted twice, or missed" },
      { what: "Finds every person, only to pixelate them inside their own outline.", mode: "Video tracking", without: "Footage nobody should share" },
      { what: "Finds the ears on each close-up and enlarges them, so a small tag or notch can be read.", mode: "Image segmentation", without: "Small marks stay unreadable" },
      { what: "Looks for the collar or ear tag itself. If it disagrees with Muse Spark, the dog is left out.", mode: "Image segmentation", without: "One model’s mistake becomes the result" },
    ],
  },
  {
    model: "Muse Spark",
    tone: "spark",
    jobs: [
      { what: "Reads paint, collars, ear tags and notches into fixed fields, and notes puppies and dogs on a lead.", mode: "Vision, structured output", without: "Marks read differently by every reader" },
      { what: "Decides whether a dog that came back into view is one already counted.", mode: "Vision, comparison", without: "The same dog counted twice" },
    ],
  },
  {
    model: "Muse Wonder",
    tone: "wonder",
    jobs: [{ what: "Writes the report for the office, with the WHO and national rules it relies on found and cited.", mode: "Reasoning, web search", without: "Numbers without a decision" }],
  },
];

const TONE: Record<Stage["tone"], string> = {
  sam: "bg-[#e3edf6]",
  spark: "bg-mark-soft",
  wonder: "bg-[#efe9fb]",
};

/** The line from one stage down to the next. */
function Joint() {
  return (
    <div aria-hidden className="flex justify-center py-1.5">
      <span className="block h-7 w-px bg-line-strong" />
    </div>
  );
}

export function Evidence() {
  return (
    <section id="evidence" className="scroll-mt-6 bg-canvas py-28 md:py-40">
      <div className="shell">
        <div className="grid grid-cols-12 gap-y-10 lg:gap-x-8">
          <div className="col-span-12 lg:col-span-5">
            <h2 className="display text-[2rem] sm:text-4xl md:text-[4rem] md:leading-[1.03]">Built on Meta’s models, one job each.</h2>
          </div>
          <div className="col-span-12 lg:col-span-6 lg:col-start-7">
            <p className="lede">
              Three Meta models do the seeing, reading and writing. The arithmetic stays in plain code: tracks stitched across pieces of a long walk, a
              Wilson interval for coverage, and doses worked out from the count.
            </p>
            <p className="mt-6 text-ink-2">
              It never follows people. SAM 3.1 looks for people only to blur them; nobody is tracked, counted or identified, and the original video stays
              on the phone. A ten-minute walk costs about two US dollars of model time.
            </p>
          </div>
        </div>

        <div className="mt-16">
          <div className="flex items-center gap-5 rounded-[24px] bg-ink px-6 py-5 text-on-ink">
            <svg viewBox="0 0 36 24" width={36} height={24} aria-hidden className="shrink-0">
              <path d={DOG_PATH} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" />
            </svg>
            <p>
              <span className="text-lg font-semibold">A phone walk</span>
              <span className="ml-3 text-white/70">Any phone. Sent as small pieces, five frames a second, while the original stays on the phone.</span>
            </p>
          </div>
          <Joint />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[2fr_1fr_1fr]">
            {stages.map((st) => (
              <div key={st.model} className={`flex flex-col rounded-[24px] p-5 md:p-6 ${TONE[st.tone]}`}>
                <p className="text-xl font-semibold tracking-[-0.015em]" style={{ fontStretch: "108%" }}>
                  {st.model}
                </p>
                <ul className={`mt-4 grid flex-1 gap-3 ${st.jobs.length > 2 ? "sm:grid-cols-2" : ""}`}>
                  {st.jobs.map((j) => (
                    <li key={j.what} className="rounded-[16px] bg-white/85 p-4">
                      <p className="text-[0.8125rem] font-semibold text-ink-3">{j.mode}</p>
                      <p className="mt-1 text-[0.9375rem] leading-snug">{j.what}</p>
                      <p className="mt-2 text-[0.8125rem] text-ink-3">Without it: {j.without.charAt(0).toLowerCase() + j.without.slice(1)}.</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <Joint />
          <div className="flex items-center gap-5 rounded-[24px] bg-mark px-6 py-5 text-white">
            <svg viewBox="0 0 36 24" width={36} height={24} aria-hidden className="shrink-0">
              <path d={DOG_PATH} fill="currentColor" />
            </svg>
            <p>
              <span className="text-lg font-semibold">A decision</span>
              <span className="ml-3 text-white/85">Coverage with a 95% interval, the doses to bring, and the stretch of the walk to go back to.</span>
            </p>
          </div>
        </div>
        <p className="mt-6 text-[0.875rem] text-ink-3">
          Every outline, label and blur is drawn in the browser by Meta’s SAM client libraries: @meta-sam/parser, @meta-sam/graphics and @meta-sam/video.
        </p>
      </div>
    </section>
  );
}
