type Lane = "phone" | "server" | "meta";
type Row = { lane: Lane; model?: "SAM 3.1" | "Muse Spark" | "Muse Wonder"; title: string; detail: string; figure: string };

// The mountain village sample as it ran, from its usage log: 71 model calls in all.
const rows: Row[] = [
  {
    lane: "phone",
    title: "Re-encodes the walk",
    detail: "WebCodecs in the browser: 960 px, 5 to 10 frames a second, 30-second pieces that overlap by two seconds. The original stays on the phone.",
    figure: "1 piece, 138 frames",
  },
  {
    lane: "server",
    title: "Takes the pieces and starts the jobs",
    detail: "Each piece goes straight to storage on a signed link and on to SAM as soon as it lands, so the pieces of a long walk are tracked in parallel.",
    figure: "2 video jobs",
  },
  { lane: "meta", model: "SAM 3.1", title: "Tracks “dog”", detail: "Video tracking through every frame: each dog keeps one id while it is in view.", figure: "57.9 s" },
  { lane: "meta", model: "SAM 3.1", title: "Finds “person”", detail: "Only to pixelate each person inside their own outline, frame by frame. No one is counted, named or identified.", figure: "20.1 s" },
  {
    lane: "server",
    title: "Stitches the pieces",
    detail: "Tracks in each overlap are joined when their boxes coincide (IoU of 0.35 or more). A dog in view for a moment counts only if SAM was sure of it.",
    figure: "13 dogs, each once",
  },
  {
    lane: "phone",
    title: "Cuts the close-ups",
    detail: "Back to the full-resolution video at the moments each dog was seen best; frames ranked by sharpness, the three best kept.",
    figure: "3 a dog",
  },
  { lane: "meta", model: "SAM 3.1", title: "Finds “dog ear”", detail: "Image segmentation on the two best close-ups; each ear found is enlarged for reading.", figure: "26 calls" },
  {
    lane: "meta",
    model: "Muse Spark",
    title: "Reads every mark",
    detail: "Close-ups and ears in, a fixed JSON schema out: paint, collar, ear tag, ear notch, puppy, lead, view quality, confidence and a reason.",
    figure: "13 readings",
  },
  { lane: "meta", model: "SAM 3.1", title: "Gives a second opinion", detail: "Looks for “collar” and “ear tag” itself. If it disagrees with Muse Spark, neither answer counts.", figure: "26 checks" },
  {
    lane: "meta",
    model: "Muse Spark",
    title: "Checks for repeats",
    detail: "When a track starts after another ended, compares the two dogs’ close-ups: same, different or unsure. Only a sure match is merged.",
    figure: "3 pairs, none merged",
  },
  {
    lane: "server",
    title: "Decides",
    detail: "The clear-view rule, two-model agreement, a Wilson 95% interval against the 70% line, at least ten readable dogs, and the doses to bring.",
    figure: "10 doses",
  },
  { lane: "meta", model: "Muse Wonder", title: "Writes the report", detail: "Reasoning with web search: the result, what to do tomorrow, and the WHO and national rules behind it, cited.", figure: "1 report" },
];

const LANES: { key: Lane; label: string; note: string }[] = [
  { key: "phone", label: "On the phone", note: "The heavy video work, so only small files travel" },
  { key: "server", label: "On the server", note: "A short step each time the page checks in" },
  { key: "meta", label: "Meta’s models", note: "The seeing, reading and writing" },
];
const COL: Record<Lane, string> = { phone: "lg:col-start-2", server: "lg:col-start-3", meta: "lg:col-start-4" };
const TINT: Record<NonNullable<Row["model"]>, string> = {
  "SAM 3.1": "bg-[#16314a] ring-[#3a6c96]/50",
  "Muse Spark": "bg-[#0f3a2a] ring-[#2f8f62]/50",
  "Muse Wonder": "bg-[#2a2347] ring-[#7a68c9]/50",
};

const quality: [string, string][] = [
  ["34", "unit tests on the counting, stitching, statistics, mark rules and route maths"],
  ["28", "hand-labelled frames, rescored against SAM 3.1’s boxes by CI on every push"],
  ["147", "model calls across the four sample walks, each logged with its time and cost"],
];

/** The engineering: what runs where, in order, on a real walk. */
export function UnderTheHood() {
  return (
    <section id="engineering" className="scroll-mt-6 bg-ink py-28 text-on-ink md:py-40">
      <div className="shell">
        <div className="grid grid-cols-12 gap-y-8 lg:gap-x-8">
          <h2 className="display col-span-12 text-[2rem] text-on-ink sm:text-4xl md:text-[4.25rem] md:leading-[1.02] lg:col-span-7">
            What runs between the walk and the answer.
          </h2>
          <p className="col-span-12 self-end text-lg leading-relaxed text-[#c9d6e2] lg:col-span-5">
            The mountain village walk, step by step, as it ran: 71 calls to three Meta models, $0.26 of model time for the count and every reading, and
            $0.12 more for the report.
          </p>
        </div>

        <div className="mt-16 hidden grid-cols-[3rem_1fr_1fr_1fr] gap-x-4 lg:grid">
          <span />
          {LANES.map((l) => (
            <div key={l.key} className="border-b border-white/15 pb-4">
              <p className="font-semibold">{l.label}</p>
              <p className="mt-1 text-[0.875rem] text-[#9fb1c2]">{l.note}</p>
            </div>
          ))}
        </div>
        <ol className="relative mt-10 space-y-3 lg:mt-4">
          {/* Lane guides behind the steps. */}
          <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 right-0 hidden grid-cols-[3rem_1fr_1fr_1fr] gap-x-4 lg:grid">
            <span className="mx-auto w-px bg-white/15" />
            <span className="rounded-[18px] bg-white/[0.025]" />
            <span className="rounded-[18px] bg-white/[0.025]" />
            <span className="rounded-[18px] bg-white/[0.025]" />
          </span>
          {rows.map((r, i) => (
            <li key={r.title} className="relative grid grid-cols-[2.25rem_1fr] items-start gap-x-4 lg:grid-cols-[3rem_1fr_1fr_1fr]">
              <span className="num relative z-10 mt-3 flex size-8 items-center justify-center justify-self-center rounded-full bg-[#21364a] text-[0.8125rem] font-semibold text-white ring-4 ring-ink">
                {i + 1}
              </span>
              <div className={`rounded-[18px] p-4 ring-1 ring-inset md:p-5 lg:row-start-1 ${COL[r.lane]} ${r.model ? TINT[r.model] : "bg-white/[0.06] ring-white/10"}`}>
                <p className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className="font-semibold">
                    {r.model && <span className="text-[#9fd8bd]">{r.model} </span>}
                    {r.title}
                  </span>
                  <span className="num text-[0.875rem] font-semibold text-white/90">{r.figure}</span>
                </p>
                <p className="mt-1.5 text-[0.9375rem] leading-snug text-[#c9d6e2]">{r.detail}</p>
                <p className="mt-2 text-[0.8125rem] text-[#9fb1c2] lg:hidden">{LANES.find((l) => l.key === r.lane)!.label}</p>
              </div>
            </li>
          ))}
        </ol>

        <dl className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-[24px] bg-white/10 sm:grid-cols-3">
          {quality.map(([n, what]) => (
            <div key={what} className="bg-ink px-7 py-8">
              <dt className="display num text-5xl text-on-ink">{n}</dt>
              <dd className="mt-3 text-[#c9d6e2]">{what}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-6 text-[0.9375rem] text-[#9fb1c2]">
          The code, the tests and the evaluation are public:{" "}
          <a href="https://github.com/omkydv/Seventy" target="_blank" rel="noreferrer" className="font-semibold text-white underline decoration-white/40 underline-offset-4 hover:decoration-white">
            github.com/omkydv/Seventy
          </a>
        </p>
      </div>
    </section>
  );
}
