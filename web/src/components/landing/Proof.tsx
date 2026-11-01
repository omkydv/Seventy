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
    [`${seventy} / ${hand}`, "Dogs found and counted once across the four clips, matching a careful hand count dog for dog."],
    [`${Math.round(t.precision * 100)}%`, `Of SAM 3.1’s boxes were on a real dog, across ${t.frames} frames checked one dog at a time. Not one false alarm.`],
    ["1", "Ear tag on a distant dog. Muse Spark said it couldn’t be sure; a person confirmed it in one look at SAM’s enlarged ear."],
    [`$${cost.toFixed(2)}`, "Model cost for all four clips: tracking, blurring, ear zoom, readings, second opinions and repeat checks. Each written report adds about 20 cents."],
  ];
  return (
    <section id="proof" className="scroll-mt-6 bg-surface py-28 md:py-40">
      <div className="shell">
        <div className="grid grid-cols-12 gap-y-8 lg:gap-x-8">
          <h2 className="display col-span-12 text-[2rem] sm:text-4xl md:text-[4.25rem] md:leading-[1.02] lg:col-span-6">Checked by hand.</h2>
          <p className="lede col-span-12 self-end lg:col-span-6">
            A person counted every clip without looking at Seventy’s answer, then checked {t.frames} frames one dog at a time against SAM 3.1’s boxes.
            Seventy matched the hand count on every clip. Every frame is here to look at.
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
                    <dl className="num mt-3 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-[0.9375rem] [&_dd]:text-right">
                      <dt className="text-ink-2">Dogs counted</dt>
                      <dd className="font-semibold">
                        {s.seventy} of {s.hand}
                      </dd>
                      {c && (
                        <>
                          <dt className="text-ink-2">False alarms in {c.frames} frames</dt>
                          <dd className="font-semibold">{c.false}</dd>
                        </>
                      )}
                    </dl>
                    <p className="mt-3 flex-1 text-[0.9375rem] text-ink-3">{"found" in s && s.found ? s.found : "Every dog counted once."}</p>
                    <span className="mt-4 font-semibold group-hover:underline">See the frames</span>
                  </div>
                </a>
              </li>
            );
          })}
        </ul>
        <p className="mt-6 max-w-3xl text-[0.875rem] text-ink-3">
          The hand labels, SAM 3.1’s boxes and the script that scores them are public in the repository, and every change is scored again.
        </p>
      </div>
    </section>
  );
}
