import Image from "next/image";
import Link from "next/link";
import data from "@/content/samples.json";

/** Four real clips, four very different streets, one pipeline. Each card opens the real survey. */
export function Places() {
  return (
    <section id="places" className="scroll-mt-6 bg-surface py-28 md:py-40">
      <div className="shell">
        <div className="grid grid-cols-12 gap-y-8 lg:gap-x-8">
          <h2 className="display col-span-12 text-[2rem] sm:text-4xl md:text-[4.25rem] md:leading-[1.02] lg:col-span-7">Four places, one method.</h2>
          <p className="lede col-span-12 self-end lg:col-span-5">
            A mountain village, a seaside town, a city market and a village lane. The same pipeline counted every dog in each. Open any of them and check
            its work.
          </p>
        </div>
        <ul className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2">
          {data.samples.map((s) => (
            <li key={s.slug}>
              <Link href={`/app/walks/${s.walk}`} className="group panel block overflow-hidden transition-shadow hover:shadow-[0_2px_4px_rgb(var(--shadow)/0.06),0_28px_60px_-28px_rgb(var(--shadow)/0.5)]">
                <div className="relative aspect-[16/10] overflow-hidden bg-canvas-2">
                  <Image
                    src={`/samples/${s.slug}.jpg`}
                    alt={`A close-up Seventy cut of one dog from the ${s.title.toLowerCase()} clip`}
                    fill
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="object-cover transition-transform duration-700 ease-[var(--ease-out-quint)] group-hover:scale-[1.03]"
                  />
                </div>
                <div className="p-6 md:p-7">
                  <p className="text-[0.875rem] text-ink-3">
                    {s.place}, {s.seconds} seconds
                  </p>
                  <div className="mt-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <h3 className="text-2xl font-semibold tracking-[-0.015em]" style={{ fontStretch: "106%" }}>
                      {s.title}
                    </h3>
                    <p className="num text-[0.9375rem] text-ink-2">
                      <span className="font-semibold text-ink">{s.seventy}</span> {s.seventy === 1 ? "dog" : "dogs"}
                    </p>
                  </div>
                  <p className="mt-3 text-ink-2">{s.line}</p>
                  <p className="mt-5 flex items-center justify-between gap-3">
                    <span className="pill bg-canvas-2 text-ink">{s.mode}</span>
                    <span className="font-semibold text-ink group-hover:underline">Open the survey</span>
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-6 text-[0.875rem] text-ink-3">Each clip ran through the same pipeline as a full ten-minute survey walk.</p>
      </div>
    </section>
  );
}
