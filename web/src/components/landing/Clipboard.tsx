/** Why the check after a drive is the weak step: one campaign, three standard methods, three answers. */
export function Clipboard() {
  return (
    <section className="bg-surface py-24 md:py-32">
      <div className="shell">
        <div className="max-w-4xl">
          <h2 className="display text-[2rem] sm:text-4xl md:text-[4.25rem] md:leading-[1.02]">Every vaccination drive ends with one question: did we reach 70?</h2>
          <p className="lede mt-8 max-w-2xl">
            Today the answer comes from surveyors walking the streets a day or two after the drive, tallying every dog they pass as marked or not. The
            method is sound. The number it produces can’t be checked afterwards, and different methods disagree.
          </p>
        </div>
        <figure className="panel mt-16 p-7 md:p-10">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {(
              [
                ["47%", "Counting dogs on two days"],
                ["32%", "From the ratio of people to dogs"],
                ["19%", "From an estimate of dog density"],
              ] as const
            ).map(([n, how]) => (
              <div key={n}>
                <p className="display num text-6xl md:text-7xl">{n}</p>
                <p className="mt-2 text-ink-2">{how}</p>
              </div>
            ))}
          </div>
          <figcaption className="mt-8 max-w-3xl">
            <p className="text-lg font-semibold leading-snug tracking-[-0.01em]">
              The same campaign, measured three standard ways. A drive that missed the 70% line looks exactly like one that reached it, until someone is
              bitten.
            </p>
            <p className="mt-2 text-[0.875rem]">
              <a href="https://www.frontiersin.org/journals/microbiology/articles/10.3389/fmicb.2025.1696281/full" target="_blank" rel="noreferrer" className="link text-ink-3">
                Frontiers in Microbiology, 2025
              </a>
            </p>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
