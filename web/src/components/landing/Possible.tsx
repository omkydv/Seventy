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
    title: "Zero by 30",
    body: "WHO and its partners aim for zero human deaths from dog rabies by 2030. Reaching it depends on knowing where vaccination reached. Seventy makes that check cheap enough to run after every drive.",
    art: <Squares total={60} filled={52} size={8} columns={15} />,
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
