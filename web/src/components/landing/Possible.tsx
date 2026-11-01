import Image from "next/image";
import { DogGlyph } from "@/components/DogGlyph";

function Squares({ total, filled, size = 14, columns }: { total: number; filled: number; size?: number; columns: number }) {
  return (
    <div className="grid w-fit gap-1" style={{ gridTemplateColumns: `repeat(${columns}, ${size}px)` }} aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`block rounded-[3px] ${(i * 7) % total < filled ? "bg-mark" : "bg-transparent shadow-[inset_0_0_0_1.5px_var(--ink-3)]"}`}
          style={{ width: size, height: size }}
        />
      ))}
    </div>
  );
}

const rings = [
  {
    title: "One surveyor, one morning",
    body: "A street checked in a ten-minute walk. Every dog counted once, read, and kept as evidence, for about two dollars of model time.",
    art: <DogGlyph status="marked" size={44} />,
  },
  {
    title: "One city drive",
    body: "Every area checked within three days of vaccinating. The mop-up team goes back only where dogs were missed, and doses are ordered from a count instead of a guess.",
    art: (
      <div className="flex flex-wrap gap-1" aria-hidden>
        {Array.from({ length: 10 }, (_, i) => (
          <DogGlyph key={i} status={i % 4 === 3 ? "unmarked" : "marked"} size={20} />
        ))}
      </div>
    ),
  },
  {
    title: "One country",
    body: "Every district measured the same way, so coverage compares across districts, and a ministry or funder can open any number and see the dogs behind it.",
    art: <Squares total={24} filled={17} columns={8} />,
  },
  {
    title: "Beyond rabies drives",
    body: "The same walk reads sterilization ear notches for dog population programmes, and the clipped ear tips that mark sterilized street cats.",
    art: <p className="text-[0.875rem] text-ink-3">Notches, tags, tips</p>,
  },
];

export function Possible() {
  return (
    <section id="possible" className="scroll-mt-6 bg-canvas py-28 md:py-40">
      <div className="shell">
        <div className="max-w-4xl">
          <h2 className="display text-[2rem] sm:text-4xl md:text-[4.25rem] md:leading-[1.02]">What one walk could add up to.</h2>
          <p className="lede mt-8 max-w-2xl">
            Seventy is built for one team on one street. If programmes adopt it, the same check scales from a morning to a country.
          </p>
        </div>
        <ol className="mt-16 divide-y divide-line">
          {rings.map((r) => (
            <li key={r.title} className="grid grid-cols-1 gap-x-10 gap-y-4 py-8 md:grid-cols-[minmax(0,15rem)_minmax(0,22rem)_1fr] md:items-center">
              <div className="flex min-h-12 items-center">{r.art}</div>
              <h3 className="text-2xl font-semibold leading-tight tracking-[-0.015em]" style={{ fontStretch: "106%" }}>
                {r.title}
              </h3>
              <p className="max-w-xl text-ink-2">{r.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** The steps between today and 2030; the check is the one Seventy does. */
const chain = [
  { step: "Vaccinate", who: "Vaccination teams", what: "Reach 70% of the dogs in every district." },
  { step: "Check", who: "Seventy", what: "Walk every street with a phone and see where 70% was reached.", key: true, note: "Often skipped today" },
  { step: "Go back", who: "The same teams", what: "Return only to the streets that fell short." },
  { step: "Zero deaths", who: "WHO goal, 2030", what: "No more people dying from dog-mediated rabies." },
];

/** The goal the whole field is working to, and the step Seventy makes possible on the way there. */
export function ZeroBy30() {
  return (
    <section id="zero" className="relative isolate overflow-hidden bg-[#0b1621] text-white">
      <Image
        src="/photos/dogs-dusk.jpg"
        alt="Two street dogs on a rooftop at dusk, looking out over the city."
        fill
        sizes="100vw"
        className="-z-10 object-cover object-[30%_35%]"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(8_18_28/0.55)_0%,rgb(8_18_28/0.93)_55%)] md:bg-[linear-gradient(270deg,rgb(8_18_28/0.95)_0%,rgb(8_18_28/0.8)_42%,rgb(8_18_28/0.12)_78%)]"
      />
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 hidden h-[55%] bg-[linear-gradient(0deg,rgb(8_18_28/0.95)_10%,transparent)] md:block" />
      <div className="shell pb-20 pt-40 md:pb-24 md:pt-32">
        <div className="md:ml-auto md:w-[min(40rem,52%)]">
          <h2 className="display max-w-[44rem] text-[2.5rem] text-white sm:text-6xl md:text-[3.75rem] md:leading-[1.02]">
            The world has set a date to end rabies deaths: 2030.
          </h2>
          <p className="mt-7 max-w-[36rem] text-xl leading-relaxed text-white/85">
            Getting there means vaccinating 70% of dogs in every district, and knowing it happened. That check is the weak link: slow, often skipped for
            lack of budget, and impossible to verify afterwards.
          </p>
          <p className="mt-6 max-w-[36rem] text-xl font-semibold leading-snug">
            Seventy turns it into a ten-minute walk with a phone, cheap enough to run after every drive, in every district.
          </p>
        </div>
        <ol className="mt-16 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {chain.map((c, i) => (
            <li
              key={c.step}
              className={`flex flex-col rounded-[20px] p-5 ${c.key ? "bg-mark text-white shadow-[0_24px_60px_-24px_rgb(18_168_95/0.7)]" : "bg-[rgb(8_18_28/0.72)] ring-1 ring-white/12"}`}
            >
              <p className="flex items-center justify-between gap-3 text-[0.8125rem] font-semibold">
                <span className={c.key ? "text-white" : "text-white/60"}>
                  <span className="num">{i + 1}</span>. {c.who}
                </span>
                {c.note && <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[0.75rem]">{c.note}</span>}
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.015em]" style={{ fontStretch: "108%" }}>
                {c.step}
              </p>
              <p className={`mt-1.5 text-[0.9375rem] leading-snug ${c.key ? "text-white" : "text-white/75"}`}>{c.what}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-[0.875rem] text-white/60">
          <a
            href="https://www.who.int/publications/m/item/zero-by-30-the-global-strategic-plan-to-prevent-humandeaths-from-dog-transmitted-rabies-by-2030"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-white/40 underline-offset-4 hover:decoration-white"
          >
            WHO and partners, Zero by 30: the global strategic plan
          </a>
          <span className="text-white/45"> &nbsp;Photograph: Joydeb Biswas, Pexels</span>
        </p>
      </div>
    </section>
  );
}
