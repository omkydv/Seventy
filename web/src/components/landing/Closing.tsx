import Image from "next/image";
import Link from "next/link";
import { Wordmark } from "./Brand";

export function FinalCta() {
  return (
    <section className="tone-light relative isolate overflow-hidden bg-[#cfdfe8]">
      <Image
        src="/photos/fields-dawn-sky.jpg"
        alt="Wide green fields under a pale morning sky."
        fill
        sizes="100vw"
        className="object-cover object-[50%_12%]"
      />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-[rgb(242_246_249/0.72)] via-[rgb(242_246_249/0.3)] to-transparent" />
      <div className="shell relative flex min-h-[86svh] flex-col justify-start pb-40 pt-24 md:pt-28">
        <h2 className="display max-w-3xl text-5xl text-ink md:text-[5rem] md:leading-[0.98]">Walk one street tomorrow morning.</h2>
        <p className="lede mt-6 max-w-xl text-[#24364a]">Ten minutes with a phone, then the answer. Start with a real survey to see how it reads.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/app/demo" className="btn btn-primary">
            See a real survey
          </Link>
          <Link href="/app/new?sample=1" className="btn btn-light">
            Try it with our walk
          </Link>
        </div>
      </div>
    </section>
  );
}

const sources: [string, string][] = [
  ["WHO: rabies fact sheet (2026)", "https://www.who.int/news-room/fact-sheets/detail/rabies"],
  ["WHO: Zero by 30, the global plan to end dog-mediated rabies", "https://www.who.int/publications/m/item/zero-by-30-the-global-strategic-plan-to-prevent-humandeaths-from-dog-transmitted-rabies-by-2030"],
  ["Three ways to measure one campaign’s coverage (Frontiers in Microbiology, 2025)", "https://www.frontiersin.org/journals/microbiology/articles/10.3389/fmicb.2025.1696281/full"],
  ["Comparing coverage surveys, and the puppies transects miss (Frontiers in Veterinary Science, 2017)", "https://www.frontiersin.org/journals/veterinary-science/articles/10.3389/fvets.2017.00033/full"],
  ["Vaccinate–assess–move: mass dog vaccination with mobile data collection (BMC Infectious Diseases)", "https://bmcinfectdis.biomedcentral.com/articles/10.1186/s12879-015-1320-2"],
  ["A 2026 dog vaccination campaign and its post-vaccination survey (PLOS Neglected Tropical Diseases)", "https://journals.plos.org/plosntds/article?id=10.1371%2Fjournal.pntd.0014143"],
  ["Short-term marking of dogs for rabies control (Bothma et al.)", "https://pubmed.ncbi.nlm.nih.gov/26092723/"],
  ["Mark–resight surveys of roaming dogs (BMC Veterinary Research)", "https://link.springer.com/article/10.1186/1746-6148-7-46"],
  ["United Against Rabies: dog population estimation methods (2026)", "https://unitedagainstrabies.org/app/uploads/2026/04/2026_UAR_DogPopulationEstimationMethodologies_V2_Apr2026_EN.pdf"],
];

const photos: [string, string][] = [
  ["Village lane at dawn", "Mirza Zubair"],
  ["Dogs beside a car park", "Jafetbyrne Photos"],
  ["Fields under a morning sky", "Xeon jr."],
];

export function Footer() {
  return (
    <footer className="bg-canvas pb-16 pt-20 text-[0.9375rem] text-ink-2">
      <div className="shell grid grid-cols-12 gap-y-12 md:gap-x-8">
        <div className="col-span-12 md:col-span-4">
          <Wordmark />
          <p className="mt-4 max-w-xs text-ink-3">
            Rabies vaccination coverage, measured from a walk. Built for the Meta Global AI Developer Hackathon, 2026.
          </p>
          <p className="mt-4 max-w-xs text-ink-2">Built by one person in a rural village, with a laptop and a phone.</p>
        </div>
        <div className="col-span-12 md:col-span-5">
          <p className="mb-3 font-semibold text-ink">Sources</p>
          <ul className="space-y-2">
            {sources.map(([label, href]) => (
              <li key={href}>
                <a href={href} className="link" target="_blank" rel="noreferrer">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="col-span-12 md:col-span-3">
          <p className="mb-3 font-semibold text-ink">Photographs</p>
          <ul className="space-y-2 text-ink-3">
            {photos.map(([what, who]) => (
              <li key={what}>
                {what}, by {who} on{" "}
                <a href="https://unsplash.com" className="link" target="_blank" rel="noreferrer">
                  Unsplash
                </a>
              </li>
            ))}
            <li>Street clips from Pexels</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
