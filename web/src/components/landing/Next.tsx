const groups: { title: string; items: string[] }[] = [
  {
    title: "In the field",
    items: [
      "Record inside Seventy with a GPS track, so every dog lands on a street map.",
      "Upload later, when the signal comes back.",
      "The app in the languages surveyors speak.",
    ],
  },
  {
    title: "For programmes",
    items: [
      "Team accounts: a manager’s laptop and five surveyors’ phones on one programme.",
      "Two walks of one route, matched dog by dog, for a population estimate.",
      "Export to the tools campaigns already use.",
    ],
  },
  {
    title: "For trust",
    items: [
      "A field trial next to a standard survey, on the same streets, published in full.",
      "A second Meta model reading every mark, with disagreements sent to a person.",
    ],
  },
];

export function Next() {
  return (
    <section id="next" className="scroll-mt-6 bg-surface py-28 md:py-36">
      <div className="shell">
        <h2 className="display text-[2rem] sm:text-4xl md:text-[4.25rem] md:leading-[1.02]">What comes next.</h2>
        <div className="mt-14 grid grid-cols-1 gap-x-10 gap-y-12 md:grid-cols-3">
          {groups.map((g) => (
            <div key={g.title}>
              <h3 className="font-semibold">{g.title}</h3>
              <ul className="mt-4 space-y-3 text-ink-2">
                {g.items.map((i) => (
                  <li key={i} className="grid grid-cols-[1.25rem_1fr]">
                    <span aria-hidden className="mt-[0.6em] block size-1.5 rounded-full bg-ink-3" />
                    <span>{i}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-16 max-w-3xl text-2xl font-semibold leading-snug tracking-[-0.015em] md:text-3xl" style={{ fontStretch: "106%" }}>
          Every dog counted once. Every number you can check. After every drive.
        </p>
      </div>
    </section>
  );
}
