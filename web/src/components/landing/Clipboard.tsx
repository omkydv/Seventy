import Image from "next/image";
import { MethodBars } from "./MethodBars";

/** Why the check after a drive is the weak step: one campaign, three standard methods, three answers, and the puppies a count misses. */
export function Clipboard() {
  return (
    <section className="bg-surface py-28 md:py-36">
      <div className="shell">
        <div className="max-w-4xl">
          <h2 className="display text-[2rem] sm:text-4xl md:text-[4.25rem] md:leading-[1.02]">Every drive ends with one question: did we reach 70?</h2>
          <p className="lede mt-8 max-w-2xl">
            Today the answer comes from surveyors tallying dogs on paper a day or two after the drive. The number can’t be checked afterwards, and
            different methods disagree.
          </p>
        </div>
        <div className="mt-16 grid grid-cols-12 gap-5">
          <figure className="panel col-span-12 p-7 md:p-10 lg:col-span-7">
            <MethodBars />
            <figcaption className="mt-14 max-w-xl">
              <p className="text-lg font-semibold leading-snug tracking-[-0.01em]">
                One campaign, measured three standard ways, and every answer below the line. A drive that missed 70% looks exactly like one that reached
                it, until someone is bitten.
              </p>
              <p className="mt-2 text-[0.875rem]">
                <a href="https://www.frontiersin.org/journals/microbiology/articles/10.3389/fmicb.2025.1696281/full" target="_blank" rel="noreferrer" className="link text-ink-3">
                  Frontiers in Microbiology, 2025
                </a>
              </p>
            </figcaption>
          </figure>
          <figure className="panel col-span-12 flex flex-col overflow-hidden lg:col-span-5">
            <div className="relative min-h-[18rem] flex-1">
              <Image
                src="/photos/mother-puppies.jpg"
                alt="A street dog lying on sandy ground, nursing her puppies."
                fill
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="object-cover object-[55%_60%]"
              />
              <p className="absolute bottom-3 right-4 text-[0.75rem] text-white/80 [text-shadow:0_1px_6px_rgb(0_0_0/0.6)]">Photograph: Soumyadip Adak, Pexels</p>
            </div>
            <figcaption className="p-7">
              <p className="text-lg font-semibold leading-snug tracking-[-0.01em]">Puppies are the dogs a street count misses.</p>
              <p className="mt-2 text-ink-2">
                They stay hidden and are often too young to have been vaccinated, so a tally that skips them reads about 10% too high.{" "}
                <a href="https://www.frontiersin.org/journals/veterinary-science/articles/10.3389/fvets.2017.00033/full" target="_blank" rel="noreferrer" className="link text-ink-3">
                  Frontiers in Veterinary Science, 2017
                </a>
              </p>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
