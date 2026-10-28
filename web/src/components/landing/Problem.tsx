import { DogGlyph } from "@/components/DogGlyph";
import { GlyphGrid } from "./GlyphGrid";

function Source({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="link text-ink-3">
      {children}
    </a>
  );
}

export function Problem() {
  return (
    <section id="problem" className="scroll-mt-6 bg-canvas py-28 md:py-40">
      <div className="shell">
        <div className="grid grid-cols-12 gap-x-8 gap-y-16">
          <div className="col-span-12 lg:col-span-6">
            <h2 className="display text-4xl md:text-[4.25rem] md:leading-[1.02]">Rabies kills 59,000 people every year.</h2>
            <p className="lede mt-8 max-w-xl">
              Four in ten are children. Almost every case starts with a dog bite, and every death is preventable: once
              symptoms begin, rabies is almost always fatal, but a vaccinated dog cannot pass it on.
            </p>
            <p className="mt-4 text-[0.875rem]">
              <Source href="https://www.who.int/publications/m/item/zero-by-30-the-global-strategic-plan-to-prevent-humandeaths-from-dog-transmitted-rabies-by-2030">
                World Health Organization, Zero by 30
              </Source>
            </p>
          </div>
          <div className="col-span-12 lg:col-span-6">
            <div className="panel p-6 sm:p-8">
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
            <h3 className="display-quiet mt-10 text-2xl md:text-3xl">The fix is known: vaccinate 70 of every 100 dogs.</h3>
            <p className="mt-4 max-w-xl text-ink-2">
              At that level the virus runs out of unprotected dogs to spread through, and human deaths fall with it. It is
              the target WHO sets for every dog vaccination drive.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
