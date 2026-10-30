const rows: [string, string, string][] = [
  ["What you have afterwards", "A number", "The number, with every dog’s close-up, its moment in the walk, and its reading"],
  ["Can someone check it later?", "No", "Yes, dog by dog, from anywhere"],
  ["A dog seen twice", "Counted twice", "One track, counted once"],
  ["Puppies", "Usually missed, so coverage reads about 10% high", "Counted, and shown apart"],
  ["A mark on a dark coat", "Observers often disagree", "One consistent reader, and “can’t tell” goes to a person"],
  ["Where to go back", "The whole area, again", "The stretch of the walk where unmarked dogs were seen"],
];

export function Compare() {
  return (
    <section id="compare" className="scroll-mt-6 bg-canvas py-28 md:py-40">
      <div className="shell">
        <div className="max-w-4xl">
          <h2 className="display text-[2rem] sm:text-4xl md:text-[4.25rem] md:leading-[1.02]">The walk stays. What it gives you changes.</h2>
          <p className="lede mt-8 max-w-2xl">
            Teams already walk every area after a drive. Seventy asks for nothing new in the field: the same walk, filmed instead of tallied.
          </p>
        </div>
        <div className="panel mt-16 overflow-hidden">
          <div className="hidden grid-cols-[15rem_1fr_1fr] gap-8 bg-surface-2 px-8 py-4 text-[0.875rem] font-semibold md:grid">
            <span className="text-ink-3">After a drive</span>
            <span className="text-ink-2">Today: a tally</span>
            <span className="text-mark-strong">With Seventy</span>
          </div>
          <ul>
            {rows.map(([what, today, seventy]) => (
              <li key={what} className="grid grid-cols-1 gap-x-8 gap-y-1 border-t border-line px-6 py-5 first:border-t-0 md:grid-cols-[15rem_1fr_1fr] md:px-8 md:first:border-t">
                <p className="font-semibold">{what}</p>
                <p className="text-ink-2">
                  <span className="text-ink-3 md:hidden">Today: </span>
                  {today}
                </p>
                <p className="text-ink">
                  <span className="font-medium text-mark-strong md:hidden">With Seventy: </span>
                  {seventy}
                </p>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-4 text-[0.875rem] text-ink-3">
          Puppies and the 10%:{" "}
          <a href="https://www.frontiersin.org/journals/veterinary-science/articles/10.3389/fvets.2017.00033/full" target="_blank" rel="noreferrer" className="link">
            Frontiers in Veterinary Science, 2017
          </a>
          . Observers disagreeing:{" "}
          <a href="https://pubmed.ncbi.nlm.nih.gov/26092723/" target="_blank" rel="noreferrer" className="link">
            Bothma et al.
          </a>
        </p>
      </div>
    </section>
  );
}
