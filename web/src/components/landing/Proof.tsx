import Image from "next/image";
import check from "@/content/eval.json";
import data from "@/content/samples.json";

/**
 * Two hand checks of the sample clips: every dog counted against Seventy's count,
 * and sampled frames scored one dog at a time against SAM 3.1's boxes (eval/ in the repo).
 */
export function Proof() {
  const hand = data.samples.reduce((n, s) => n + s.hand, 0);
  const seventy = data.samples.reduce((n, s) => n + s.seventy, 0);
  const cost = data.samples.reduce((n, s) => n + s.cost, 0);
  const t = check.total;
  const stats: [string, string][] = [
    [`${seventy} / ${hand}`, "Dogs Seventy counted, each one once, against a careful hand count of the four clips."],
    [`${t.found} / ${t.sightings}`, `Dogs SAM 3.1 boxed in ${t.frames} frames checked one dog at a time. Not one of its boxes was on anything else.`],
    ["1", "Ear tag on a distant dog. Muse Spark said it couldn’t be sure; a person confirmed it in one look at SAM’s enlarged ear."],
    [`$${cost.toFixed(2)}`, "Model cost for all four clips: tracking, blurring, ear zoom, readings, second opinions and repeat checks. Each written report adds about 20 cents."],
  ];
  return (
    <section id="proof" className="scroll-mt-6 bg-surface py-28 md:py-40">
      <div className="shell">
        <div className="grid grid-cols-12 gap-y-8 lg:gap-x-8">
          <h2 className="display col-span-12 text-[2rem] sm:text-4xl md:text-[4.25rem] md:leading-[1.02] lg:col-span-6">Checked by hand.</h2>
          <p className="lede col-span-12 self-end lg:col-span-6">
            Every clip was counted by a person without looking at Seventy’s answer. Then {t.frames} frames were checked one dog at a time against SAM
            3.1’s boxes. Every frame is here to look at.
          </p>
        </div>

        <dl className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-2">
          {stats.map(([n, what]) => (
            <div key={what} className="panel p-7">
              <dt className="display num text-5xl sm:text-6xl">{n}</dt>
              <dd className="mt-3 max-w-md text-ink-2">{what}</dd>
            </div>
          ))}
        </dl>

        <ul className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {data.samples.map((s) => {
            const c = check.clips.find((x) => x.slug === s.slug);
            return (
              <li key={s.slug}>
                <a href={`/eval/${s.slug}.jpg`} target="_blank" rel="noreferrer" className="group panel flex h-full flex-col overflow-hidden">
                  <div className="relative aspect-[16/10] overflow-hidden bg-canvas-2">
                    <Image
                      src={`/eval/${s.slug}.jpg`}
                      alt={`Every checked frame of the ${s.title.toLowerCase()} clip, with SAM 3.1’s boxes in green and missed dogs in amber`}
                      fill
                      sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                      className="object-cover object-left-top"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="text-lg font-semibold tracking-[-0.01em]" style={{ fontStretch: "106%" }}>
                      {s.title}
                    </h3>
                    <dl className="num mt-3 grid grid-cols-[1fr_auto] gap-y-1 text-[0.9375rem]">
                      <dt className="text-ink-2">Dogs counted</dt>
                      <dd className="font-semibold">
                        {s.seventy} of {s.hand}
                      </dd>
                      {c && (
                        <>
                          <dt className="text-ink-2">Boxed in {c.frames} frames</dt>
                          <dd className="font-semibold">
                            {c.found} of {c.sightings}
                          </dd>
                        </>
                      )}
                    </dl>
                    <p className="mt-3 flex-1 text-[0.9375rem] text-ink-3">
                      {"missed" in s && s.missed ? `Missed: ${s.missed.charAt(0).toLowerCase()}${s.missed.slice(1)}` : "Nothing missed."}
                    </p>
                    <span className="mt-4 font-semibold group-hover:underline">See the frames</span>
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
        <p className="mt-6 max-w-3xl text-[0.875rem] text-ink-3">
          The frame check was made by one person with SAM’s boxes on screen, and four short clips are a small test. The labels and the script that
          scores them are in the repository. The next test is a full ten-minute walk, counted blind by two people.
        </p>
      </div>
    </section>
  );
}
