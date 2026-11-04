import Image from "next/image";
import type { ReactNode } from "react";

const MOUNTAIN = "/m/35ffd9de-fba1-4eca-b699-88778ea210eb/crops";

type Row = {
  today: string;
  todaySource?: { label: string; href: string };
  fix: string;
  models: string[];
  proof: ReactNode;
  proofCaption: string;
};

const rows: Row[] = [
  {
    today: "Dogs move, and so do surveyors. A tally sheet can’t tell a new dog from one already counted at the last corner, so the same dog is counted twice, or not at all.",
    fix: "SAM 3.1 follows every dog through every frame and gives it one number for the whole walk. When a dog walks back into view, Muse Spark compares it with the dogs already counted.",
    models: ["SAM 3.1", "Muse Spark"],
    proof: <Image src="/photos/why-count.jpg" alt="A pack of dogs in a village square, each boxed and numbered by SAM 3.1." fill sizes="(min-width: 1024px) 30vw, 100vw" className="object-cover" />,
    proofCaption: "A pack of 13 crossing a village square. 13 counted, each once.",
  },
  {
    today: "Vaccination marks are small, fade within weeks, and hide on dark coats. Mark colours were often misread, and agreement between observers on them was low (kappa 0.27).",
    todaySource: { label: "Conan et al., 2015", href: "https://pubmed.ncbi.nlm.nih.gov/26092723/" },
    fix: "SAM 3.1 finds each dog’s ears and enlarges them. Muse Spark reads paint, collars, tags and notches the same way every time. For collars and tags, a second look by SAM 3.1 has to agree.",
    models: ["SAM 3.1", "Muse Spark"],
    proof: (
      <div className="absolute inset-0 grid grid-cols-[1.4fr_1fr] gap-1 bg-[#14202c]">
        <div className="relative">
          <Image src="/photos/promenade-ear-tag-dog.jpg" alt="A cream street dog on a promenade." fill sizes="(min-width: 1024px) 18vw, 60vw" className="object-cover object-[62%_35%]" />
        </div>
        <div className="relative">
          <Image src="/m/887a06c9-3011-48c2-83ea-8ed9214ec3fe/crops/4-ear1.jpg" alt="Its ear, enlarged by SAM 3.1, with a yellow tag." fill sizes="(min-width: 1024px) 12vw, 40vw" className="object-cover" />
        </div>
      </div>
    ),
    proofCaption: "A municipal ear tag about 25 pixels across, made visible.",
  },
  {
    today: "The dogs hardest to see are the ones missed: puppies, dark coats, dogs lying still far away. Missing them makes coverage read about 10% too high.",
    todaySource: { label: "Frontiers in Veterinary Science, 2017", href: "https://www.frontiersin.org/journals/veterinary-science/articles/10.3389/fvets.2017.00033/full" },
    fix: "SAM 3.1 looks at every frame from the single word “dog”, near or far, moving or still, and it never gets tired at the end of a long street.",
    models: ["SAM 3.1"],
    proof: <Image src="/photos/why-far-dog.jpg" alt="A dark dog curled up far across a lawn, boxed by SAM 3.1." fill sizes="(min-width: 1024px) 30vw, 100vw" className="object-cover" />,
    proofCaption: "A dark dog curled up across a lawn, about 30 pixels long, found and counted.",
  },
  {
    today: "At the end of the day a tally is one number on paper. Nobody can check it afterwards, so a drive that missed 70% looks the same as one that reached it.",
    fix: "Every dog keeps its close-up, its moment in the video and what was read on it, so anyone can open the number and see the dogs behind it. Muse Wonder writes the report, with the rules it relies on cited.",
    models: ["SAM 3.1", "Muse Spark", "Muse Wonder"],
    proof: (
      <div className="absolute inset-0 grid grid-cols-3 gap-1 bg-[#14202c]">
        {[11, 8, 5].map((n) => (
          <div key={n} className="relative">
            <Image src={`${MOUNTAIN}/${n}-0.jpg`} alt={`Close-up of dog ${n}`} fill sizes="(min-width: 1024px) 10vw, 33vw" className="object-cover" />
            <span className="absolute left-2 top-2 rounded-full bg-white/94 px-2 py-0.5 text-[0.75rem] font-semibold text-[#0c1a28]">Dog {n}</span>
          </div>
        ))}
      </div>
    ),
    proofCaption: "Every number opens to the dogs behind it.",
  },
];

/** Why counting by eye can't answer the 70% question, and what each Meta model changes. */
export function WhyAI() {
  return (
    <section id="why" className="scroll-mt-6 bg-surface py-28 md:py-40">
      <div className="shell">
        <div className="grid grid-cols-12 gap-y-8 lg:gap-x-8">
          <h2 className="display col-span-12 text-[2rem] sm:text-4xl md:text-[4.25rem] md:leading-[1.02] lg:col-span-7">
            Counting dogs by eye breaks in four places. AI fixes each one.
          </h2>
          <p className="lede col-span-12 self-end lg:col-span-5">
            Surveyors do careful work. The method is the limit: nobody can hold hundreds of moving dogs in mind, read a tag 25 pixels wide, or leave a
            record someone else can check.
          </p>
        </div>

        <div className="mt-16 hidden grid-cols-[1fr_1fr_minmax(0,22rem)] gap-8 px-1 text-[0.875rem] font-semibold text-ink-3 lg:grid">
          <p>Counting by eye today</p>
          <p>With Seventy</p>
          <p>From a real walk</p>
        </div>
        <ol className="mt-4 divide-y divide-line border-y border-line">
          {rows.map((r, i) => (
            <li key={r.fix} className="grid grid-cols-1 gap-x-8 gap-y-6 py-10 lg:grid-cols-[1fr_1fr_minmax(0,22rem)]">
              <div className="flex gap-4">
                <span className="num mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-soft text-[0.875rem] font-semibold text-[#7a4b02]">
                  {i + 1}
                </span>
                <p className="text-lg leading-relaxed text-ink">
                  {r.today}
                  {r.todaySource && (
                    <>
                      {" "}
                      <a href={r.todaySource.href} target="_blank" rel="noreferrer" className="link text-[0.9375rem] text-ink-3">
                        {r.todaySource.label}
                      </a>
                    </>
                  )}
                </p>
              </div>
              <div>
                <p className="text-lg leading-relaxed text-ink-2">{r.fix}</p>
                <p className="mt-3 flex flex-wrap gap-1.5">
                  {r.models.map((m) => (
                    <span key={m} className="pill h-6 bg-mark-soft px-2.5 text-[0.75rem] text-mark-strong">
                      {m}
                    </span>
                  ))}
                </p>
              </div>
              <figure>
                <div className="relative aspect-[16/10] overflow-hidden rounded-[18px] bg-canvas-2">{r.proof}</div>
                <figcaption className="mt-2 text-[0.875rem] text-ink-3">{r.proofCaption}</figcaption>
              </figure>
            </li>
          ))}
        </ol>
        <p className="mt-10 max-w-3xl text-2xl font-semibold leading-snug tracking-[-0.015em]" style={{ fontStretch: "106%" }}>
          None of this asks for new staff, equipment or training. Teams already walk every street after a drive. Now the walk leaves evidence.
        </p>
      </div>
    </section>
  );
}
