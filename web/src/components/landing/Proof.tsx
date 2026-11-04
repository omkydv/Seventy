import Image from "next/image";
import Link from "next/link";
import check from "@/content/eval.json";
import data from "@/content/samples.json";

/**
 * The four real walks, each with what a person found checking it by hand: every dog
 * counted against Seventy's count, and sampled frames scored one dog at a time
 * against SAM 3.1's boxes (eval/ in the repo).
 */
export function Proof() {
  const hand = data.samples.reduce((n, s) => n + s.hand, 0);
  const seventy = data.samples.reduce((n, s) => n + s.seventy, 0);
  const cost = data.samples.reduce((n, s) => n + s.cost, 0);
  const t = check.total;
  const stats: [string, string][] = [
    [`${seventy} / ${hand}`, "Dogs found and counted once across the four videos, matching a careful hand count dog for dog."],
    [`${Math.round(t.precision * 100)}%`, `Of SAM 3.1’s boxes were on a real dog, across ${t.frames} frames checked one dog at a time. Not one false alarm.`],
    ["1", "Ear tag on a distant dog, about 25 pixels across, made visible by SAM 3.1’s enlarged close-up of the ear."],
    [`$${cost.toFixed(2)}`, "Model cost for all four videos: tracking, blurring, ear zoom, readings, second opinions and repeat checks."],
  ];
  return (
    <section id="proof" className="scroll-mt-6 bg-surface py-28 md:py-40">
      <div className="shell">
        <div className="grid grid-cols-12 gap-y-8 lg:gap-x-8">
          <h2 className="display col-span-12 text-[2rem] sm:text-4xl md:text-[4.25rem] md:leading-[1.02] lg:col-span-6">
            Four real street videos, checked by hand.
          </h2>
          <p className="lede col-span-12 self-end lg:col-span-6">
            A mountain village, a seaside town, a city market and a village lane. A person counted every dog by hand, frame by frame, then
            checked {t.frames} frames one dog at a time against SAM 3.1’s boxes. Open any walk and check its work.
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

        <ul className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
          {data.samples.map((s) => {
            const c = check.clips.find((x) => x.slug === s.slug);
            return (
              <li key={s.slug} className="panel flex flex-col overflow-hidden">
                <Link href={`/app/walks/${s.walk}`} className="group relative block aspect-[16/9] overflow-hidden bg-canvas-2">
                  <Image
                    src={`/samples/${s.slug}.jpg`}
                    alt={`A close-up Seventy cut of one dog from the ${s.title.toLowerCase()} walk`}
                    fill
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 ease-[var(--ease-out-quint)] group-hover:scale-[1.03]"
                  />
                </Link>
                <div className="flex flex-1 flex-col p-6 md:p-7">
                  <p className="text-[0.875rem] text-ink-3">
                    {s.place}, {s.seconds} seconds, {s.mode.toLowerCase()}
                  </p>
                  <h3 className="mt-1 text-2xl font-semibold tracking-[-0.015em]" style={{ fontStretch: "106%" }}>
                    {s.title}
                  </h3>
                  <p className="mt-3 text-ink-2">{s.line}</p>
                  <dl className="num mt-5 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 border-t border-line pt-4 text-[0.9375rem] [&_dd]:text-right">
                    <dt className="text-ink-2">Dogs counted, against the hand count</dt>
                    <dd className="font-semibold">
                      {s.seventy} of {s.hand}
                    </dd>
                    {c && (
                      <>
                        <dt className="text-ink-2">False alarms in {c.frames} checked frames</dt>
                        <dd className="font-semibold">{c.false}</dd>
                      </>
                    )}
                  </dl>
                  {"found" in s && s.found ? <p className="mt-3 text-[0.9375rem] text-ink-3">{s.found}</p> : null}
                  <p className="mt-auto flex flex-wrap items-center gap-x-6 gap-y-2 pt-6">
                    <Link href={`/app/walks/${s.walk}`} className="font-semibold hover:underline">
                      Open the survey
                    </Link>
                    <a href={`/eval/${s.slug}.jpg`} target="_blank" rel="noreferrer" className="link text-ink-2">
                      See the checked frames
                    </a>
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
        <p className="mt-6 max-w-3xl text-[0.875rem] text-ink-3">
          Each walk ran through the same pipeline as a full ten-minute survey. The hand labels, SAM 3.1’s boxes and the script that scores them are
          public in the repository, and every change is scored again.{" "}
          <Link href="/app/new#samples" className="link font-semibold text-ink">
            Run one yourself and check the count
          </Link>
        </p>
      </div>
    </section>
  );
}
