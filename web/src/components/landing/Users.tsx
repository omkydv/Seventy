import Link from "next/link";
import { DogGlyph } from "@/components/DogGlyph";

const teams = [
  {
    who: "Rabies vaccination programmes",
    asks: "Did this area reach 70%?",
    gets: "Coverage with an honest margin, every dog’s mark as evidence, and the stretch of the walk where the missed dogs were.",
    sample: { href: "/app/walks/887a06c9-3011-48c2-83ea-8ed9214ec3fe", label: "Open the ear-tag check" },
    art: Array.from({ length: 10 }, (_, i) => (i < 7 ? "marked" : "unmarked")) as ("marked" | "unmarked")[],
  },
  {
    who: "Dog sterilization programmes",
    asks: "What share of the dogs here is sterilized?",
    gets: "The same walk read for the ear notch that sterilized dogs carry, with unclear ears left out, never guessed.",
    sample: { href: "/#how", label: "See how ears are read" },
    art: Array.from({ length: 10 }, (_, i) => (i < 5 ? "marked" : "unmarked")) as ("marked" | "unmarked")[],
  },
  {
    who: "City animal services",
    asks: "How many roaming dogs, and where?",
    gets: "Every dog counted once along the route, owned dogs on a lead set apart, and a record anyone can check later.",
    sample: { href: "/app/walks/35ffd9de-fba1-4eca-b699-88778ea210eb", label: "Open the mountain count" },
    art: Array.from({ length: 10 }, () => "unmarked") as ("marked" | "unmarked")[],
  },
];

/** The same product answers three teams' questions; each links to a real survey. */
export function Users() {
  return (
    <section id="users" className="scroll-mt-6 bg-surface py-28 md:py-36">
      <div className="shell">
        <div className="max-w-4xl">
          <h2 className="display text-[2rem] sm:text-4xl md:text-[4.25rem] md:leading-[1.02]">One walk, three teams that need it.</h2>
          <p className="lede mt-8 max-w-2xl">
            Seventy is one product. What changes is the question the walk answers and the mark it reads.
          </p>
        </div>
        <ul className="mt-16 divide-y divide-line border-y border-line">
          {teams.map((t) => (
            <li key={t.who} className="grid grid-cols-1 gap-x-10 gap-y-4 py-9 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)_minmax(0,14rem)] md:items-center">
              <div>
                <h3 className="text-xl font-semibold leading-snug tracking-[-0.015em]" style={{ fontStretch: "106%" }}>
                  {t.who}
                </h3>
                <div className="mt-3 flex gap-0.5" aria-hidden>
                  {t.art.map((s, i) => (
                    <DogGlyph key={i} status={s} size={18} />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-lg font-semibold tracking-[-0.01em]">{t.asks}</p>
                <p className="mt-1.5 max-w-xl text-ink-2">{t.gets}</p>
              </div>
              <Link href={t.sample.href} className="link justify-self-start font-semibold md:justify-self-end">
                {t.sample.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
