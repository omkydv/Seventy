import { Wordmark } from "./SiteHeader";

const sources: [string, string][] = [
  ["WHO, Zero by 30: the global strategic plan", "https://www.who.int/publications/m/item/zero-by-30-the-global-strategic-plan-to-prevent-humandeaths-from-dog-transmitted-rabies-by-2030"],
  ["Nepal’s National Strategy and Action Plan for Rabies Prevention (Ratopati)", "https://english.ratopati.com/story/82762/national-strategy-and-action-plan-for-rabies-prevention-approved"],
  ["Animal bites and vaccine shortfall in Nepal (Ratopati)", "https://english.ratopati.com/story/81352/animal-bites-in-nepal-are-alarming-there-is-not-enough-vaccination"],
  ["ICMR-NIE study of bites and rabies deaths in India", "https://www.business-standard.com/health/over-9-million-animal-bites-rabies-deaths-india-icmr-study-125071400896_1.html"],
  ["Vaccinate–assess–move in Ranchi (BMC Infectious Diseases)", "https://bmcinfectdis.biomedcentral.com/articles/10.1186/s12879-015-1320-2"],
  ["Dog vaccination in the Cox’s Bazar camps (PLOS NTD, 2026)", "https://journals.plos.org/plosntds/article?id=10.1371%2Fjournal.pntd.0014143"],
  ["Short-term marking of dogs for rabies control (Pretoria)", "https://pubmed.ncbi.nlm.nih.gov/26092723/"],
  ["Mark–resight dog surveys in Rajasthan (BMC Veterinary Research)", "https://link.springer.com/article/10.1186/1746-6148-7-46"],
  ["United Against Rabies, dog population methods (2026)", "https://unitedagainstrabies.org/app/uploads/2026/04/2026_UAR_DogPopulationEstimationMethodologies_V2_Apr2026_EN.pdf"],
];

const photos: [string, string][] = [
  ["Village lane at dawn", "Mirza Zubair"],
  ["Fields under a morning sky", "Xeon jr."],
  ["Dogs beside a car park", "Jafetbyrne Photos"],
  ["Field in pink haze", "Manish Patel"],
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-paper pb-16 pt-16 text-sm text-ink-2">
      <div className="shell grid grid-cols-12 gap-x-6 gap-y-10">
        <div className="col-span-12 md:col-span-3">
          <Wordmark />
          <p className="mt-3 max-w-[16rem] text-ink-3">
            A rabies vaccination survey you can run with a phone. Built for the Meta Global AI Developer Hackathon, 2026.
          </p>
        </div>
        <div className="col-span-12 md:col-span-6">
          <p className="label mb-3">Sources</p>
          <ul className="space-y-1.5">
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
          <p className="label mb-3">Photographs</p>
          <ul className="space-y-1.5 text-ink-3">
            {photos.map(([what, who]) => (
              <li key={what}>
                {what}: {who} on{" "}
                <a href="https://unsplash.com" className="link" target="_blank" rel="noreferrer">
                  Unsplash
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
