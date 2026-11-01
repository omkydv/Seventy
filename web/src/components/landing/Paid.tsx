/** Proof the need is real: a city is paying for this kind of count right now. */
export function Paid() {
  return (
    <section id="paid" className="scroll-mt-6 bg-ink py-28 text-on-ink md:py-36">
      <div className="shell">
        <div className="grid grid-cols-12 gap-y-10 lg:gap-x-8">
          <h2 className="display col-span-12 text-[2rem] text-on-ink sm:text-4xl md:text-[4.25rem] md:leading-[1.02] lg:col-span-7">
            Cities already pay to count their dogs.
          </h2>
          <div className="col-span-12 self-end lg:col-span-5">
            <p className="text-lg leading-relaxed text-[#c9d6e2]">
              This October, San Antonio commissioned an AI count of its roaming dogs for about $99,000. Its volunteer counts had come back with blank
              sheets, and the city said they could not give a statistically reliable picture.
            </p>
          </div>
        </div>
        <dl className="mt-16 grid grid-cols-1 gap-px overflow-hidden rounded-[24px] bg-white/10 sm:grid-cols-3">
          {(
            [
              ["$99,000", "for one city’s AI count of its roaming dogs, from car-mounted phones"],
              ["Blank sheets", "from volunteer hand counts, even in streets known for dogs"],
              ["About $2", "a walk for Seventy: any phone, every dog counted once, every mark read"],
            ] as const
          ).map(([n, what]) => (
            <div key={n} className="bg-ink px-7 py-8">
              <dt className="display num text-5xl text-on-ink">{n}</dt>
              <dd className="mt-3 text-[#c9d6e2]">{what}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-8 max-w-3xl text-xl font-semibold leading-snug tracking-[-0.01em] text-on-ink">
          Rabies programmes in Asia and Africa face the same question on a fraction of that budget. Seventy gives them the count, and the vaccination
          coverage with it, from the walk they already do.
        </p>
        <p className="mt-4 text-[0.875rem] text-[#9fb1c2]">
          <a href="https://www.ksat.com/news/local/2026/10/28/researchers-use-cell-phones-and-ai-to-count-loose-dogs-in-san-antonio/" target="_blank" rel="noreferrer" className="underline decoration-white/40 underline-offset-4 hover:decoration-white">
            KSAT, 28 October 2026
          </a>
          {", "}
          <a href="https://www.swri.org/what-we-do/internal-research-development/2024/automotive-transportation/city-of-san-antonio-rd-league-computer-vision-unrestrained-dog-census-10-r633004" target="_blank" rel="noreferrer" className="underline decoration-white/40 underline-offset-4 hover:decoration-white">
            Southwest Research Institute
          </a>
        </p>
      </div>
    </section>
  );
}
