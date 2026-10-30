import { DOG_PATH, DogGlyph } from "@/components/DogGlyph";

function FadingDog() {
  return (
    <svg viewBox="0 0 36 24" width={64} height={42.7} aria-hidden>
      <defs>
        <linearGradient id="fade" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="var(--mark)" stopOpacity="0.95" />
          <stop offset="0.55" stopColor="var(--mark)" stopOpacity="0.35" />
          <stop offset="1" stopColor="var(--mark)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={DOG_PATH} fill="url(#fade)" stroke="var(--ink)" strokeWidth={1.1} strokeLinejoin="round" />
    </svg>
  );
}

function Twice() {
  return (
    <div className="relative h-[43px] w-[88px]" aria-hidden>
      <span className="absolute left-0 top-0">
        <DogGlyph status="unmarked" size={64} />
      </span>
      <span className="absolute left-6 top-0 opacity-40">
        <DogGlyph status="unmarked" size={64} />
      </span>
    </div>
  );
}

function Disagree() {
  return (
    <div className="flex items-end gap-2" aria-hidden>
      <DogGlyph status="marked" size={48} />
      <DogGlyph status="unmarked" size={48} />
    </div>
  );
}

function Unknown() {
  return (
    <div className="flex items-end gap-1.5" aria-hidden>
      <DogGlyph status="unknown" size={34} />
      <DogGlyph status="unknown" size={34} />
      <DogGlyph status="unknown" size={34} />
    </div>
  );
}

const failures = [
  {
    art: <Twice />,
    title: "The same dog is counted twice.",
    body: "Dogs move, and so do surveyors. A tally sheet has no way to tell a new dog from one already counted at the last corner.",
  },
  {
    art: <Disagree />,
    title: "Two counters, two answers.",
    body: "In a field study, observers agreed on the colour of a mark barely better than chance (Cohen’s κ = 0.27).",
    source: { href: "https://pubmed.ncbi.nlm.nih.gov/26092723/", label: "Bothma et al." },
  },
  {
    art: <FadingDog />,
    title: "Marks fade and hide.",
    body: "Crayon marks last 10 to 13 days and spray about 24, and paint is hard to see on a dark coat.",
    source: { href: "https://pubmed.ncbi.nlm.nih.gov/26092723/", label: "Bothma et al." },
  },
  {
    art: <Unknown />,
    title: "Nobody knows how many dogs live there.",
    body: "Dose orders and budgets start from a guess, so teams run short or carry vaccine they can’t use.",
  },
];

export function Clipboard() {
  return (
    <section className="bg-surface py-28 md:py-40">
      <div className="shell">
        <div className="max-w-4xl">
          <h2 className="display text-[2rem] sm:text-4xl md:text-[4.25rem] md:leading-[1.02]">Every vaccination drive ends with one question: did we reach 70?</h2>
          <p className="lede mt-8 max-w-2xl">
            Today the answer comes from surveyors walking the streets a day or two after the drive, tallying every dog they pass as marked or not. The
            method is sound. The number it produces can’t be checked afterwards, and different methods disagree.
          </p>
        </div>
        <figure className="panel mt-16 p-7 md:p-10">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {(
              [
                ["47%", "Counting dogs on two days"],
                ["32%", "From the ratio of people to dogs"],
                ["19%", "From an estimate of dog density"],
              ] as const
            ).map(([n, how]) => (
              <div key={n}>
                <p className="display num text-6xl md:text-7xl">{n}</p>
                <p className="mt-2 text-ink-2">{how}</p>
              </div>
            ))}
          </div>
          <figcaption className="mt-8 max-w-3xl">
            <p className="text-lg font-semibold leading-snug tracking-[-0.01em]">
              The same campaign, measured three standard ways. A drive that missed the 70% line looks exactly like one that reached it, until someone is
              bitten.
            </p>
            <p className="mt-2 text-[0.875rem]">
              <a href="https://www.frontiersin.org/journals/microbiology/articles/10.3389/fmicb.2025.1696281/full" target="_blank" rel="noreferrer" className="link text-ink-3">
                Frontiers in Microbiology, 2025
              </a>
            </p>
          </figcaption>
        </figure>
        <div className="mt-20 grid grid-cols-1 gap-x-12 gap-y-14 md:grid-cols-2">
          {failures.map((f) => (
            <div key={f.title} className="grid grid-cols-1 items-start gap-x-6 gap-y-4 sm:grid-cols-[6rem_1fr]">
              <div className="flex h-14 items-end">{f.art}</div>
              <div>
                <h3 className="text-xl font-semibold tracking-[-0.015em]" style={{ fontStretch: "106%" }}>
                  {f.title}
                </h3>
                <p className="mt-2 text-ink-2">
                  {f.body}
                  {f.source && (
                    <>
                      {" "}
                      <a href={f.source.href} target="_blank" rel="noreferrer" className="link text-ink-3">
                        {f.source.label}
                      </a>
                    </>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
