import Link from "next/link";
import data from "@/content/samples.json";
import { LandingHeader } from "./Brand";
import { HeroReplay } from "./HeroReplay";

/**
 * The offer in one line, why 70 matters, and the product doing it: a real walk with
 * every dog outlined and numbered by SAM 3.1, drawn live from its saved output.
 */
export function Hero() {
  const hand = data.samples.reduce((n, s) => n + s.hand, 0);
  const found = data.samples.reduce((n, s) => n + s.seventy, 0);
  return (
    <section className="tone-light relative overflow-hidden bg-[linear-gradient(180deg,#dbe7f1_0%,#eaf1f6_38%,#f2f6f9_100%)] text-ink">
      <LandingHeader />
      <div className="shell pb-16 pt-8 md:pb-24 md:pt-10">
        <h1 className="display text-[2.6rem] sm:text-6xl lg:text-[4rem] lg:leading-[1.0] xl:text-[4.25rem]">
          Film one street. Know if its dogs are protected from rabies.
        </h1>
        <div className="mt-6 grid grid-cols-1 gap-y-7 lg:mt-8 lg:grid-cols-12 lg:items-start lg:gap-x-8">
          <p className="lede max-w-[38rem] text-[#24364a] lg:col-span-6">
            Rabies stops spreading when 70 of every 100 dogs are vaccinated. Seventy checks whether a street got there: walk it with any phone,
            Meta’s SAM 3.1 counts every dog once, and Muse Spark reads each vaccination mark.
          </p>
          <div className="lg:col-span-6 lg:col-start-7 lg:pt-1">
            <div className="flex flex-wrap gap-3">
              <Link href="/app/demo" className="btn btn-primary">
                See a real survey
              </Link>
              <Link href="/app/new?sample=1" className="btn btn-light">
                Try it with our walk
              </Link>
            </div>
            <p className="mt-5 max-w-[34rem] text-[1rem] leading-relaxed text-[#24364a]">
              In October a US city paid about $99,000 for an AI count of its street dogs.{" "}
              <a href="#paid" className="link font-semibold text-[#0c1a28]">
                Seventy does it with a phone, for about $2 a walk.
              </a>
            </p>
          </div>
        </div>
        <div className="mt-10">
          <HeroReplay />
        </div>
        <div className="mt-4 flex flex-col gap-x-8 gap-y-2 text-[0.9375rem] text-[#3d4f63] md:flex-row md:items-baseline md:justify-between">
          <p>Real SAM 3.1 output on a walk through a mountain village, drawn live in your browser.</p>
          <a href="#proof" className="link shrink-0 font-semibold text-[#0c1a28]">
            {found} of {hand} dogs found in hand-checked clips, and every box a real dog
          </a>
        </div>
      </div>
    </section>
  );
}
