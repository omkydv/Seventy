import Image from "next/image";
import { DogGlyph } from "@/components/DogGlyph";
import { GlyphGrid } from "./GlyphGrid";

function Source({ href, children, light = false }: { href: string; children: React.ReactNode; light?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={light ? "underline decoration-white/40 underline-offset-4 hover:decoration-white" : "link text-ink-3"}
    >
      {children}
    </a>
  );
}

/** The stakes, in one photograph and three sentences. */
export function Stakes() {
  return (
    <section id="problem" className="relative isolate scroll-mt-0 overflow-hidden bg-[#0b1621] text-on-ink">
      <Image
        src="/photos/dog-wet-road.jpg"
        alt="A street dog sitting on a wet road, looking into the camera."
        fill
        sizes="100vw"
        className="-z-10 object-cover object-[70%_45%]"
      />
      {/* Darkens the side the words sit on, so they read on any screen. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgb(8_18_28/0.35)_0%,rgb(8_18_28/0.88)_70%)] md:bg-[linear-gradient(90deg,rgb(8_18_28/0.9)_0%,rgb(8_18_28/0.72)_42%,rgb(8_18_28/0.08)_78%)]"
      />
      <div className="shell flex min-h-[86svh] flex-col justify-end pb-20 pt-48 md:justify-center md:py-32">
        <h2 className="display max-w-[42rem] text-[2.5rem] text-white sm:text-6xl md:text-[4.5rem] md:leading-[1.0]">
          Rabies kills tens of thousands of people every year.
        </h2>
        <p className="mt-7 max-w-[34rem] text-xl leading-relaxed text-white/85">
          Four in ten are children. Almost every case starts with a dog, and once symptoms begin it is almost always fatal.
        </p>
        <p className="mt-6 max-w-[34rem] text-xl font-semibold leading-snug text-white">Every one of those deaths can be prevented with a vaccine.</p>
        <p className="mt-8 text-[0.875rem] text-white/60">
          <Source href="https://www.who.int/news-room/fact-sheets/detail/rabies" light>
            World Health Organization, rabies fact sheet, 2026
          </Source>
        </p>
      </div>
      <p className="absolute bottom-4 right-5 text-[0.75rem] text-white/50">Photograph: Argho Basak, Pexels</p>
    </section>
  );
}

/** The known fix, shown: a field of dogs filling to 70 of 100. */
export function Problem() {
  return (
    <section className="bg-canvas py-28 md:py-36">
      <div className="shell">
        <div className="grid grid-cols-12 items-center gap-y-14 lg:gap-x-12">
          <div className="col-span-12 lg:col-span-5">
            <h2 className="display text-[2rem] sm:text-4xl md:text-[4rem] md:leading-[1.02]">The fix is known: vaccinate 70 of every 100 dogs.</h2>
            <p className="lede mt-8 max-w-xl">
              At that level the virus runs out of unprotected dogs to spread through, and human deaths fall with it. It is the target the World Health
              Organization sets for every dog vaccination drive.
            </p>
          </div>
          <div className="col-span-12 lg:col-span-7">
            <div className="panel p-6 sm:p-9">
              <GlyphGrid total={100} marked={70} columns={10} label="70 of 100 dogs vaccinated" />
              <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-[0.9375rem] text-ink-2">
                <span className="flex items-center gap-2">
                  <DogGlyph status="marked" size={22} /> Vaccinated
                </span>
                <span className="flex items-center gap-2">
                  <DogGlyph status="unmarked" size={22} /> Not vaccinated
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
