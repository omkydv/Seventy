const models = [
  {
    name: "SAM 3.1",
    use: "Video tracking",
    job: "Follows every dog through the walk with a stable identity, from the single word “dog”. This is the count.",
    without: "Dogs get counted twice, or missed.",
  },
  {
    name: "SAM 3.1",
    use: "Image segmentation",
    job: "Finds the ears and back on full-resolution close-ups, and blurs faces, number plates and signs before anything is shared.",
    without: "Small marks are unreadable, and privacy depends on luck.",
  },
  {
    name: "Muse Spark",
    use: "Vision, structured output",
    job: "Reads each dog’s paint mark, collar and ear notch into fixed fields, and says when it can’t see well enough to judge.",
    without: "Marks are read by eye, and every reader reads them differently.",
  },
  {
    name: "Muse Wonder",
    use: "Reasoning, web search",
    job: "Writes the program report: the result, the next steps, and the national and WHO rules it relies on, each cited.",
    without: "Numbers without a decision.",
  },
  {
    name: "Meta SAM client libraries",
    use: "Parsing and drawing",
    job: "Decode SAM’s output and draw every outline on the walk video, frame by frame, in the browser.",
    without: "No replay a manager can check.",
  },
];

export function Evidence() {
  return (
    <section id="evidence" className="scroll-mt-6 bg-surface py-28 md:py-40">
      <div className="shell">
        <div className="grid grid-cols-12 gap-x-8 gap-y-10">
          <div className="col-span-12 lg:col-span-5">
            <h2 className="display text-4xl md:text-[4rem] md:leading-[1.03]">Every number on the screen is a measurement.</h2>
          </div>
          <div className="col-span-12 lg:col-span-6 lg:col-start-7">
            <p className="lede">
              Seventy gives each of Meta’s models one job and keeps the arithmetic in plain code. Dogs are counted by
              segmentation and tracking, coverage by a Wilson interval, populations by Chapman’s formula. When a model can’t
              see something, it says so, and a person makes the call.
            </p>
            <p className="mt-6 text-ink-2">
              A ten-minute walk costs about one US dollar of model time: around 3,000 video frames for SAM, a few cents of
              reading for each dog, and one report.
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
