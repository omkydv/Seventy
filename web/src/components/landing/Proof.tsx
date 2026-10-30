import data from "@/content/samples.json";

/** The sample clips counted by hand, frame by frame, against what Seventy found. */
export function Proof() {
  const hand = data.samples.reduce((n, s) => n + s.hand, 0);
  const seventy = data.samples.reduce((n, s) => n + s.seventy, 0);
  const cost = data.samples.reduce((n, s) => n + s.cost, 0);
  return (
    <section id="proof" className="scroll-mt-6 bg-surface py-28 md:py-40">
      <div className="shell">
        <div className="grid grid-cols-12 gap-y-8 lg:gap-x-8">
          <h2 className="display col-span-12 text-[2rem] sm:text-4xl md:text-[4.25rem] md:leading-[1.02] lg:col-span-6">Checked by hand.</h2>
          <p className="lede col-span-12 self-end lg:col-span-6">
            Every clip was also counted by a person, frame by frame, without looking at Seventy’s answer. Here is how close it came.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="panel p-7">
            <p className="display num text-6xl">
              {seventy}
              <span className="text-ink-3"> / {hand}</span>
            </p>
            <p className="mt-3 text-ink-2">Dogs found by Seventy, against a careful hand count across the four clips.</p>
          </div>
          <div className="panel p-7">
            <p className="display num text-6xl">1</p>
            <p className="mt-3 text-ink-2">
              Ear tag on a distant dog. Muse Spark said it couldn’t be sure; a person confirmed it in one look at SAM’s enlarged ear.
            </p>
          </div>
          <div className="panel p-7">
            <p className="display num text-6xl">${cost.toFixed(2)}</p>
            <p className="mt-3 text-ink-2">Model cost for all four clips: tracking, blurring, ear zoom, readings and repeat checks.</p>
          </div>
        </div>

        <div className="panel mt-5 overflow-x-auto">
          <table className="num w-full min-w-[620px] text-left text-[0.9375rem]">
            <thead className="text-[0.8125rem] text-ink-3">
              <tr>
                <th className="px-6 py-3 font-medium md:px-8">Clip</th>
                <th className="px-3 py-3 text-right font-medium">By hand</th>
                <th className="px-3 py-3 text-right font-medium">Seventy</th>
                <th className="px-6 py-3 font-medium md:px-8">What differed</th>
              </tr>
            </thead>
            <tbody>
              {data.samples.map((s) => (
                <tr key={s.slug} className="border-t border-line">
                  <td className="px-6 py-3 font-medium md:px-8">{s.title}</td>
                  <td className="px-3 py-3 text-right">{s.hand}</td>
                  <td className="px-3 py-3 text-right font-semibold">{s.seventy}</td>
                  <td className="px-6 py-3 text-ink-2 md:px-8">{"missed" in s && s.missed ? `Missed: ${s.missed.charAt(0).toLowerCase()}${s.missed.slice(1)}` : "Nothing"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 max-w-3xl text-[0.875rem] text-ink-3">
          Four short clips are a small test, and we say so. The next test is a full ten-minute walk, counted the same way by two people.
        </p>
      </div>
    </section>
  );
}
