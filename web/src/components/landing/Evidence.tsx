const models = [
  {
    name: "SAM 3.1",
    use: "Video tracking, dogs",
    job: "Follows every dog through the walk from the single word “dog”, keeping its number while it stays in view. This is the count.",
    without: "Dogs get counted twice, or missed.",
  },
  {
    name: "SAM 3.1",
    use: "Video tracking, people",
    job: "Finds every person in every frame for one reason: to pixelate them inside their own outline before anyone sees the replay.",
    without: "Footage of neighbours nobody should share.",
  },
  {
    name: "SAM 3.1",
    use: "Image segmentation",
    job: "Finds the ears on each close-up, so a small tag or notch can be enlarged and read.",
    without: "Small marks stay unreadable.",
  },
  {
    name: "SAM 3.1",
    use: "Image segmentation, second opinion",
    job: "Looks for the collar or ear tag on each close-up itself. When it and Muse Spark disagree about a dog, neither answer counts: the dog goes to a person.",
    without: "One model’s mistake becomes the result.",
  },
  {
    name: "Muse Spark",
    use: "Vision, structured output",
    job: "Reads paint, collars, ear tags and notches, notes puppies and dogs on a lead, says “can’t tell” when it can’t, and decides whether a dog that came back is one already counted.",
    without: "Marks read by eye, differently by every reader.",
  },
  {
    name: "Muse Wonder",
    use: "Reasoning, web search",
    job: "Writes the report for the office: the result, the next step, and the WHO and national rules it relies on, each cited.",
    without: "Numbers without a decision.",
  },
  {
    name: "Meta SAM client libraries",
    use: "Parsing and drawing",
    job: "Decode SAM’s output and draw every outline, label and blur on the video, frame by frame, in the browser.",
    without: "No replay anyone could check.",
  },
];

export function Evidence() {
  return (
    <section id="evidence" className="scroll-mt-6 bg-surface py-28 md:py-40">
      <div className="shell">
        <div className="grid grid-cols-12 gap-y-10 lg:gap-x-8">
          <div className="col-span-12 lg:col-span-5">
            <h2 className="display text-[2rem] sm:text-4xl md:text-[4rem] md:leading-[1.03]">Built on Meta’s models, one job each.</h2>
          </div>
          <div className="col-span-12 lg:col-span-6 lg:col-start-7">
            <p className="lede">
              The arithmetic stays in plain code: tracks stitched across pieces of a long walk, a Wilson interval for coverage, and doses worked out from the
              count. When a model can’t see a mark, it says so, and the dog is kept out of the coverage instead of guessed.
            </p>
            <p className="mt-6 text-ink-2">
              It never follows people. SAM 3.1 looks for people only to blur them; nobody is tracked, counted or identified, and the original video stays
              on the phone. A ten-minute walk costs about two US dollars of model time, blurring and the report included.
            </p>
          </div>
        </div>

        <div className="mt-16 overflow-hidden rounded-[24px] bg-canvas">
          <div className="hidden grid-cols-[13rem_1fr_16rem] gap-6 px-8 py-4 text-[0.875rem] font-semibold text-ink-3 md:grid">
            <span>Model</span>
            <span>Its job in Seventy</span>
            <span>Without it</span>
          </div>
          <ul>
            {models.map((m) => (
              <li
                key={m.name + m.use}
                className="grid grid-cols-1 gap-x-6 gap-y-2 border-t border-line px-6 py-6 md:grid-cols-[13rem_1fr_16rem] md:px-8"
              >
                <div>
                  <p className="text-lg font-semibold tracking-[-0.01em]" style={{ fontStretch: "108%" }}>
                    {m.name}
                  </p>
                  <p className="text-[0.875rem] text-ink-3">{m.use}</p>
                </div>
                <p className="text-ink-2">{m.job}</p>
                <p className="text-ink-3">{m.without}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
