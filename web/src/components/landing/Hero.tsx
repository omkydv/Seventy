import Link from "next/link";
import data from "@/content/samples.json";
import { LandingHeader } from "./Brand";
import { HeroReplay } from "./HeroReplay";

/**
 * The offer in one line, what it does and the two ways in; beside it, the proof that the
 * need is real and paid for; under it, the product doing the work on a real walk.
 */
export function Hero() {
  const hand = data.samples.reduce((n, s) => n + s.hand, 0);
  const found = data.samples.reduce((n, s) => n + s.seventy, 0);
  return (
    <section className="tone-light relative overflow-hidden bg-[linear-gradient(180deg,#dbe7f1_0%,#eaf1f6_38%,#f2f6f9_100%)] text-ink">
      <LandingHeader />
      <div className="shell pb-16 pt-8 md:pb-24 md:pt-10">
        {/* One sentence per line on wide screens: the size follows the page width so the first never wraps. */}
        <h1 className="display text-[2.6rem] sm:text-6xl lg:text-[length:min(4rem,calc((100vw_-_8rem)/19.5))] lg:leading-[1.04]">
          <span className="block text-rabies lg:whitespace-nowrap">Rabies hides in the dogs a drive missed.</span>
          <span className="block">
            Seventy{" "}
            <span className="relative inline-block">
              finds them
              <svg aria-hidden viewBox="0 0 200 16" preserveAspectRatio="none" className="hand-underline absolute -bottom-[0.14em] left-[-2%] h-[0.3em] w-[104%] overflow-visible">
                <path d="M3 10.5C38 6.2 92 4.4 140 5.6c20 .5 38 1.6 57 3.4" pathLength={1} />
                <path d="M22 13.2c40-3.4 92-4.6 150-2.4" pathLength={1} />
              </svg>
            </span>
            .
          </span>
        </h1>
        <div className="mt-8 grid grid-cols-1 gap-y-8 lg:grid-cols-12 lg:items-center lg:gap-x-10">
          <div className="lg:col-span-7">
            <p className="lede max-w-[36rem] text-[#24364a]">
              Seventy counts every dog on a phone video, reads each vaccination mark with Meta’s AI, and tells the team whether the street reached the 70%
              that stops rabies, and where the dogs still to vaccinate are.
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/app/demo" className="btn btn-primary">
                See a real survey
              </Link>
              <Link href="/app/new" className="btn btn-light">
                Try it now
              </Link>
            </div>
          </div>

          {/* The need is real: a city has already paid for this, at a price no rabies programme can. */}
          <aside className="rounded-[24px] bg-white/85 p-5 ring-1 ring-[#0c1a28]/8 shadow-[0_24px_60px_-36px_rgb(12_26_40/0.55)] lg:col-span-5 lg:p-6">
            <p className="text-[0.8125rem] font-semibold text-[#6e7f91]">
              <a
                href="https://www.ksat.com/news/local/2026/10/28/researchers-use-cell-phones-and-ai-to-count-loose-dogs-in-san-antonio/"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#0c1a28] hover:underline"
              >
                KSAT News, 28 October 2026
              </a>
            </p>
            <div className="mt-3 grid grid-cols-1 items-center gap-x-4 gap-y-1 rounded-[16px] sm:grid-cols-[8.25rem_1fr] bg-[#e7eef3] px-4 py-3">
              <p className="display num text-[1.75rem] leading-none text-[#0c1a28]">$99,000</p>
              <p className="text-[0.9375rem] leading-snug text-[#24364a]">San Antonio’s AI count of its street dogs, one city, filmed from city vehicles.</p>
            </div>
            <div className="mt-2 grid grid-cols-1 items-center gap-x-4 gap-y-1 rounded-[16px] sm:grid-cols-[8.25rem_1fr] bg-mark-soft px-4 py-3">
              <p className="display num text-[1.75rem] leading-none text-mark-strong">$2</p>
              <p className="text-[0.9375rem] leading-snug text-[#0c1a28]">
                Seventy, per walk: any phone, any street, with vaccination coverage too.
              </p>
            </div>
          </aside>
        </div>
        <div className="mt-12">
          <HeroReplay />
        </div>
        <p className="mt-4 text-center text-[0.9375rem] text-[#3d4f63]">
          Real SAM 3.1 output on a 20-second walk, drawn by Seventy’s replay.{" "}
          <a href="#proof" className="link font-semibold text-[#0c1a28]">
            {found} of {hand} dogs found in hand-checked videos.
          </a>
        </p>
      </div>
    </section>
  );
}
