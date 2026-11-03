import Image from "next/image";
import { DogGlyph } from "@/components/DogGlyph";

// Dog 4 of the market street sample, exactly as its record is stored: SAM 3.1's track, the
// close-ups the browser cut, the ears SAM found, Muse Spark's reading and SAM's second opinion.
const CROPS = "/m/d6c5b703-c632-43ba-b7dd-85fe07ad85e4/crops";
const reading: [string, string][] = [
  ["Paint", "Absent"],
  ["Collar", "Absent"],
  ["Ear tag", "Absent"],
  ["Ear notch", "Absent"],
  ["Adult or puppy", "Adult"],
  ["On a lead", "No"],
  ["View", "Good"],
  ["Confidence", "0.85"],
];

const MODEL_TONE: Record<string, string> = {
  "SAM 3.1": "bg-[#e3edf6] text-[#1d4e7a]",
  "Muse Spark": "bg-mark-soft text-mark-strong",
  Seventy: "bg-canvas-2 text-ink-2",
};

function Step({ n, who, how, asked, children }: { n: number; who: string; how: string; asked: string; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[2.25rem_1fr] gap-x-4 border-t border-line py-7 first:border-t-0 first:pt-0">
      <span aria-hidden className="num flex size-9 items-center justify-center rounded-full bg-ink text-[0.9375rem] font-semibold text-on-ink">
        {n}
      </span>
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.875rem]">
          <span className={`pill h-6 px-2.5 text-[0.75rem] ${MODEL_TONE[who]}`}>{who}</span>
          <span className="text-ink-3">{how}</span>
        </p>
        <p className="mt-2.5 text-lg font-semibold leading-snug tracking-[-0.01em]">{asked}</p>
        <div className="mt-2 text-ink-2">{children}</div>
      </div>
    </li>
  );
}

/** One real dog through the whole pipeline, with each model's own answer: the multi-model work made concrete. */
export function OneDog() {
  return (
    <section id="one-dog" className="scroll-mt-6 bg-surface py-28 md:py-40">
      <div className="shell">
        <div className="grid grid-cols-12 gap-y-8 lg:gap-x-8">
          <h2 className="display col-span-12 text-[2rem] sm:text-4xl md:text-[4.25rem] md:leading-[1.02] lg:col-span-7">
            One dog, as Meta’s models saw it.
          </h2>
          <p className="lede col-span-12 self-end lg:col-span-5">
            Dog 4 from the market walk: what Seventy asked each model, and what it answered, straight from the stored record. Every dog on every walk
            goes through the same six steps.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-12 gap-y-12 lg:gap-x-12">
          <figure className="col-span-12 lg:col-span-5">
            <div className="lg:sticky lg:top-[10vh]">
              <div className="relative aspect-[547/463] overflow-hidden rounded-[24px] bg-canvas-2">
                <Image src={`${CROPS}/4-0.jpg`} alt="A tan street dog with white legs, sniffing paper on a market street." fill sizes="(min-width: 1024px) 38vw, 100vw" className="object-cover" />
                <span className="absolute left-4 top-4 rounded-full bg-white/94 px-3 py-1 text-[0.875rem] font-semibold text-[#0c1a28]">Dog 4</span>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {[
                  [`${CROPS}/4-1.jpg`, "Close-up at 1.7 seconds"],
                  [`${CROPS}/4-2.jpg`, "Close-up at 2.9 seconds"],
                  [`${CROPS}/4-ear0.jpg`, "Ear enlarged by SAM 3.1"],
                  [`${CROPS}/4-ear1.jpg`, "Second ear view enlarged by SAM 3.1"],
                ].map(([src, alt]) => (
                  <div key={src} className="relative aspect-square overflow-hidden rounded-[14px] bg-canvas-2">
                    <Image src={src} alt={alt} fill sizes="(min-width: 1024px) 9vw, 25vw" className="object-cover" />
                  </div>
                ))}
              </div>
              <figcaption className="mt-3 text-[0.875rem] text-ink-3">
                The three sharpest close-ups and two enlarged ears, cut from the original video. The whole market walk, four dogs and a crowd blurred,
                cost $0.09 of model time.
              </figcaption>
            </div>
          </figure>

          <ol className="col-span-12 lg:col-span-7">
            <Step n={1} who="SAM 3.1" how="Video tracking" asked="Asked to find “dog” in all 62 frames of the walk.">
              It followed one object from the first second to the last, with an average confidence of 0.96. That track became Dog 4; the three other dogs
              in the frame got their own numbers, and the people were found separately, only to be blurred.
            </Step>
            <Step n={2} who="Seventy" how="In the browser" asked="Cut the three sharpest views of Dog 4 from the original video.">
              The phone went back to the full-resolution file, took a frame at each moment SAM saw the dog well, and kept the three sharpest, at 0.7,
              1.7 and 2.9 seconds. Nothing at full resolution leaves the phone except these close-ups.
            </Step>
            <Step n={3} who="SAM 3.1" how="Image segmentation" asked="Asked to find “dog ear” on the two best close-ups.">
              It found an ear on both. Seventy enlarged each one, so a small tag, a notch or a smear of paint is big enough to read.
            </Step>
            <Step n={4} who="Muse Spark" how="Vision, structured output" asked="Asked to read the close-ups and ears into fixed fields.">
              <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1.5 rounded-[16px] bg-canvas p-4 text-[0.9375rem] sm:grid-cols-4">
                {reading.map(([k, v]) => (
                  <div key={k}>
                    <dt className="text-[0.8125rem] text-ink-3">{k}</dt>
                    <dd className="num font-semibold text-ink">{v}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3">
                Its reason, in its own words: “Tan free-roaming dog with white legs shows no paint, collar, ear tag or ear notch in clear body views and ear
                close-ups.” It took 7.3 seconds.
              </p>
            </Step>
            <Step n={5} who="SAM 3.1" how="Second opinion" asked="Asked to find “collar” on the best close-up, and “ear tag” on the enlarged ear.">
              It found neither, so the two models agree. Had SAM found a collar that Muse Spark missed, neither answer would count and the dog would be
              left out rather than guessed.
            </Step>
            <Step n={6} who="Seventy" how="Decision rules" asked="A clear view, no mark, and two models in agreement.">
              <span className="mt-1 flex items-center gap-3">
                <DogGlyph status="unmarked" size={30} className="shrink-0" />
                <span>
                  <span className="font-semibold text-ink">Not marked.</span> A dog seen this clearly is never left as can’t tell, and a dog seen badly is
                  never guessed. Dog 4 goes into the coverage, the dose list and the map of where to go back.
                </span>
              </span>
            </Step>
          </ol>
        </div>
      </div>
    </section>
  );
}
