import Link from "next/link";
import { LandingHeader } from "./Brand";
import { HeroReplay } from "./HeroReplay";

/**
 * The claim, then the product doing it: a real walk with every dog outlined and
 * numbered by SAM 3.1, drawn live from its saved output.
 */
export function Hero() {
  return (
    <section className="tone-light relative overflow-hidden bg-[linear-gradient(180deg,#dbe7f1_0%,#eaf1f6_38%,#f2f6f9_100%)] text-ink">
      <LandingHeader />
      <div className="shell pb-16 pt-8 md:pb-24 md:pt-14">
        <div className="max-w-[58rem]">
          <h1 className="display text-[2.75rem] sm:text-6xl xl:text-[5.5rem] xl:leading-[0.97]">Know when a street is safe from rabies.</h1>
          <p className="lede mt-6 max-w-[38rem] text-[#24364a]">
            Walk a street with any phone. Seventy counts every dog once, reads each vaccination mark, and tells the team whether the area has reached the
            70% that stops rabies.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/app/demo" className="btn btn-primary">
              See a real survey
            </Link>
            <Link href="/app/new" className="btn btn-light">
              Survey a walk
            </Link>
          </div>
        </div>
        <div className="mt-12 md:mt-16">
          <HeroReplay />
        </div>
        <p className="mt-4 max-w-[46rem] text-[0.875rem] leading-relaxed text-[#3d4f63]">
          Counting and blurring by SAM 3.1, mark reading by Muse Spark, reports by Muse Wonder. All Meta models.
        </p>
      </div>
    </section>
  );
}
