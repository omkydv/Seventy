import Image from "next/image";
import Link from "next/link";
import { PhotoCrop, regionAround } from "@/components/PhotoCrop";
import { SamPhoto } from "@/components/SamPhoto";
import { loadPhotoSegmentation } from "@/lib/sam/photos";
import { coverage } from "@/lib/stats";
import marks from "@/content/sam/lane-dawn-dog.marks.json";
import { CoverageMeter } from "./CoverageMeter";

function SectionHead({ index, kicker, title, children }: { index: string; kicker: string; title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="grid grid-cols-12 gap-x-6 gap-y-4">
      <div className="col-span-12 flex items-baseline gap-3 md:col-span-3">
        <span className="label num text-ink">{index}</span>
        <span className="label">{kicker}</span>
      </div>
      <div className="col-span-12 md:col-span-9 lg:col-span-8">
        <h2 className="display text-4xl leading-[1.04] md:text-6xl">{title}</h2>
        {children && <div className="mt-6 max-w-[40rem] text-lg leading-relaxed text-ink-2">{children}</div>}
      </div>
    </div>
  );
}

function Source({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} className="link text-ink-3" target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

/* 01 · The number ---------------------------------------------------------- */

export function NumberSection() {
  const facts = [
    {
      n: "59,000",
      text: "people die of rabies every year. Four in ten are children. Almost every case starts with a dog bite.",
      src: { href: "https://www.who.int/publications/m/item/zero-by-30-the-global-strategic-plan-to-prevent-humandeaths-from-dog-transmitted-rabies-by-2030", label: "WHO, Zero by 30" },
    },
    {
      n: "223,510",
      text: "animal bites were reported in Nepal in 2024/25, 96% of them from dogs, while clinics ran about 100,000 vials of human vaccine short.",
      src: { href: "https://english.ratopati.com/story/81352/animal-bites-in-nepal-are-alarming-there-is-not-enough-vaccination", label: "Ratopati, 2025" },
    },
    {
      n: "9.1 million",
      text: "animal bites a year in India, with an estimated 5,726 rabies deaths.",
      src: { href: "https://www.business-standard.com/health/over-9-million-animal-bites-rabies-deaths-india-icmr-study-125071400896_1.html", label: "ICMR-NIE, Lancet Infectious Diseases 2025" },
    },
  ];
  return (
    <section>
      <div className="relative isolate overflow-hidden bg-[#dfe6e6]">
      <Image
        src="/photos/fields-dawn-sky.jpg"
        alt="Flat green fields under a wide, pale morning sky."
        fill
        sizes="100vw"
        className="object-cover object-[50%_70%]"
      />
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-[rgb(244_240_231/0.5)] via-[rgb(244_240_231/0.2)] to-transparent" />
      <div className="shell relative pb-48 pt-24 md:pb-72 md:pt-36">
        <div className="grid grid-cols-12 gap-x-6 gap-y-10">
          <div className="col-span-12 lg:col-span-6">
            <p className="label text-[#3d4636]">01 · The line</p>
            <p className="display num mt-8 text-[9rem] leading-[0.82] text-[#161a12] md:mt-10 md:text-[15rem]">70%</p>
            <p className="display mt-4 max-w-md text-3xl leading-tight text-[#161a12] md:text-4xl">
              of dogs vaccinated, and rabies stops spreading.
            </p>
          </div>
          <div className="col-span-12 self-end lg:col-span-5 lg:col-start-8">
            <p className="text-lg leading-relaxed text-[#1f251a]">
              The World Health Organization’s target for dog vaccination is seventy percent. In October 2026, Nepal made it
              the national target in its new rabies strategy.{" "}
              <Source href="https://english.ratopati.com/story/82762/national-strategy-and-action-plan-for-rabies-prevention-approved">
                Ratopati
              </Source>
            </p>
          </div>
        </div>
      </div>
      </div>
      <div className="bg-paper">
        <ul className="shell grid grid-cols-1 md:grid-cols-3">
          {facts.map((f) => (
            <li key={f.n} className="border-b border-line py-8 md:border-b-0 md:border-r md:px-8 md:first:pl-0 md:last:border-r-0">
              <p className="display num text-5xl text-ink">{f.n}</p>
              <p className="mt-3 text-base leading-relaxed text-ink-2">{f.text}</p>
              <p className="mt-3 text-xs">
                <Source href={f.src.href}>{f.src.label}</Source>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* 02 · Today --------------------------------------------------------------- */

function TallyGate({ count }: { count: number }) {
  const strokes = Array.from({ length: Math.min(count, 4) });
  return (
    <svg viewBox="0 0 44 30" className="h-7 w-11 text-ink" aria-hidden>
      {strokes.map((_, i) => (
        <line key={i} x1={6 + i * 9} y1={3} x2={5 + i * 9} y2={27} stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
      ))}
      {count >= 5 && <line x1={1} y1={22} x2={40} y2={8} stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />}
    </svg>
  );
}

function TallyRow({ label, gates, rest }: { label: string; gates: number; rest: number }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] items-center border-b border-line py-3">
      <span className="text-sm text-ink-2">{label}</span>
      <span className="flex flex-wrap items-center gap-1.5">
        {Array.from({ length: gates }).map((_, i) => (
          <TallyGate key={i} count={5} />
        ))}
        {rest > 0 && <TallyGate count={rest} />}
      </span>
    </div>
  );
}

export function TodaySection() {
  const problems = [
    ["Counts change with the counter.", "In a field study, observers agreed on a mark’s colour barely better than chance (Cohen’s κ = 0.27)."],
    ["Marks hide and fade.", "Paint is hard to see on dark coats. Crayon lasts 10 to 13 days, spray about 24."],
    ["Nothing can be checked later.", "The tally is the only record. Nobody can recount a street from a sheet of strokes."],
    ["Nobody knows how many dogs live there.", "Budgets and dose orders start from a guess, so teams arrive short."],
  ];
  return (
    <section className="bg-paper py-24 md:py-32">
      <div className="shell">
        <SectionHead index="02" kicker="Today" title="The check is a clipboard.">
          <p>
            A day or two after a vaccination drive, two surveyors walk the ward and count dogs with a paint mark and dogs
            without one. If fewer than seven in ten carry the mark, the team goes back. Programs from Ranchi to the
            Cox’s Bazar camps use this method, and they do it by hand.
          </p>
        </SectionHead>
        <div className="mt-16 grid grid-cols-12 gap-x-6 gap-y-12">
          <figure className="col-span-12 lg:col-span-5 lg:col-start-4">
            <div className="rounded-[6px] border border-line bg-card p-6 shadow-[0_1px_0_rgb(var(--shadow-ink)/0.04),0_12px_32px_-18px_rgb(var(--shadow-ink)/0.25)]">
              <div className="flex items-baseline justify-between border-b-2 border-ink pb-2">
                <span className="label text-ink">Post-vaccination transect</span>
                <span className="label">Ward ____ · Date ____</span>
              </div>
              <TallyRow label="Marked" gates={3} rest={2} />
              <TallyRow label="Unmarked" gates={1} rest={4} />
              <div className="grid grid-cols-[7.5rem_1fr] py-3 text-sm text-ink-3">
                <span>Coverage</span>
                <span>_____ %</span>
              </div>
            </div>
            <figcaption className="mt-3 text-xs text-ink-3">The form surveyors fill in, drawn from the standard transect method.</figcaption>
          </figure>
          <ul className="col-span-12 lg:col-span-4 lg:col-start-9">
            {problems.map(([head, body]) => (
              <li key={head} className="border-t border-line py-5 first:border-t-0 first:pt-0">
                <p className="font-semibold text-ink">{head}</p>
                <p className="mt-1 text-ink-2">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* 03 · How ----------------------------------------------------------------- */

export async function HowSection() {
  const parking = await loadPhotoSegmentation("dogs-parking");
  const lane = await loadPhotoSegmentation("lane-dawn-dog");
  const ear = lane.outlines["dog ear"] ?? [];
  const earRegion = ear[0] ? regionAround(ear[0].box, lane.width, lane.height, 3.2, 4 / 3) : { left: 0, top: 0, right: 400, bottom: 300 };
  const parkingDogs = parking.outlines["dog"] ?? [];
  const example = coverage(284, 112, 0);
  const r = marks.reading;

  return (
    <section id="how" className="scroll-mt-8 border-t border-line bg-paper py-24 md:py-32">
      <div className="shell">
        <SectionHead index="03" kicker="How it works" title="Same walk. A phone instead of a clipboard.">
          <p>
            The surveyor walks the ward exactly as before, filming instead of counting. Everything below is real output
            from Meta’s models on real photographs.
          </p>
        </SectionHead>

        <ol className="mt-20 space-y-24 md:space-y-32">
          <li className="grid grid-cols-12 items-center gap-x-6 gap-y-8">
            <div className="col-span-12 lg:col-span-4">
              <p className="label num text-ink">Step 1</p>
              <h3 className="display mt-3 text-3xl md:text-4xl">Count every dog once.</h3>
              <p className="mt-4 text-ink-2">
                SAM 3.1 follows each dog through the video with a stable ID, from the single word “dog”. A dog that walks
                out of frame and back stays the same dog, so nothing is counted twice.
              </p>
              <p className="mt-4 text-sm text-ink-3">
                {parkingDogs.length} dogs found, confidence{" "}
                {parkingDogs
                  .map((d) => d.confidence?.toFixed(2))
                  .filter(Boolean)
                  .join(", ")}
                .
              </p>
            </div>
            <figure className="col-span-12 lg:col-span-8">
              <SamPhoto
                src="/photos/dogs-parking.jpg"
                alt="Four free-roaming dogs resting on a verge beside a car park, each outlined by SAM 3.1."
                width={parking.width}
                height={parking.height}
                outlines={parkingDogs}
                marks={parkingDogs.map((d) => ({ id: d.id, color: "#fff3e4" }))}
                focus={{ x: 0.5, y: 0.62 }}
                sizes="(min-width: 1024px) 60vw, 100vw"
                drawOnView
                delay={150}
                className="relative aspect-[16/10] rounded-[6px]"
              />
              <figcaption className="mt-3 text-xs text-ink-3">Photograph by Jafetbyrne Photos on Unsplash. Outlines: SAM 3.1.</figcaption>
            </figure>
          </li>

          <li className="grid grid-cols-12 items-center gap-x-6 gap-y-8">
            <figure className="order-2 col-span-12 lg:order-1 lg:col-span-6">
              <PhotoCrop
                src="/photos/lane-dawn-dog.jpg"
                alt="Close-up of the dog’s ear from the lane photograph, outlined by SAM 3.1."
                width={lane.width}
                height={lane.height}
                region={earRegion}
                outlines={ear}
                color="#d2441e"
                className="rounded-[6px]"
              />
              <figcaption className="mt-3 text-xs text-ink-3">The ear SAM 3.1 found in the photograph at the top of this page.</figcaption>
            </figure>
            <div className="order-1 col-span-12 lg:order-2 lg:col-span-5 lg:col-start-8">
              <p className="label num text-ink">Step 2</p>
              <h3 className="display mt-3 text-3xl md:text-4xl">Read the mark.</h3>
              <p className="mt-4 text-ink-2">
                For each dog, Seventy picks the sharpest frames. SAM finds the ears and back, and Muse Spark reads what is
                there: a paint mark, a collar, a sterilization notch, or “can’t tell”. When it can’t tell, it asks you.
              </p>
              <dl className="mt-6 grid grid-cols-[6rem_1fr] gap-y-2 border-t border-line pt-4 text-sm">
                <dt className="text-ink-3">Ear notch</dt>
                <dd>{r.ear_notch.status === "absent" ? "None, ear intact" : r.ear_notch.status}</dd>
                <dt className="text-ink-3">Paint</dt>
                <dd>{r.paint.status === "absent" ? "None" : r.paint.status}</dd>
                <dt className="text-ink-3">View</dt>
                <dd className="capitalize">{r.view_quality}</dd>
              </dl>
            </div>
          </li>

          <li className="grid grid-cols-12 items-center gap-x-6 gap-y-8">
            <div className="col-span-12 lg:col-span-4">
              <p className="label num text-ink">Step 3</p>
              <h3 className="display mt-3 text-3xl md:text-4xl">Decide, with an honest margin.</h3>
              <p className="mt-4 text-ink-2">
                Coverage comes with a 95% interval, and dogs it couldn’t read are reported, never hidden. A ward is
                complete when the estimate reaches 70, and certain when the whole interval clears it.
              </p>
            </div>
            <div className="col-span-12 lg:col-span-7 lg:col-start-6">
              <div className="border-t border-ink pt-6">
                <div className="flex flex-wrap items-baseline justify-between gap-4">
                  <p className="display num text-7xl md:text-8xl">{(example.ci.p * 100).toFixed(1)}%</p>
                  <p className="num text-right text-sm text-ink-2">
                    95% interval {(example.ci.low * 100).toFixed(1)} to {(example.ci.high * 100).toFixed(1)}
                    <br />
                    {example.marked} marked · {example.unmarked} unmarked
                  </p>
                </div>
                <div className="mt-8">
                  <CoverageMeter p={example.ci.p} low={example.ci.low} high={example.ci.high} />
                </div>
                <p className="mt-6 text-ink-2">
                  <span className="font-semibold text-ink">Complete, not yet certain.</span> The estimate clears the line;
                  the lower bound does not. One more street settles it.
                </p>
                <p className="mt-3 text-xs text-ink-3">
                  Worked example with the counts from the 2026 Cox’s Bazar camp survey.{" "}
                  <Source href="https://journals.plos.org/plosntds/article?id=10.1371%2Fjournal.pntd.0014143">PLOS NTD</Source>
                </p>
              </div>
            </div>
          </li>

          <li className="grid grid-cols-12 items-start gap-x-6 gap-y-8">
            <div className="col-span-12 lg:col-span-4">
              <p className="label num text-ink">Step 4</p>
              <h3 className="display mt-3 text-3xl md:text-4xl">Learn how many dogs live there.</h3>
            </div>
            <div className="col-span-12 lg:col-span-7 lg:col-start-6">
              <p className="text-lg leading-relaxed text-ink-2">
                Walk the same route on two mornings. Seventy recognises the dogs it has seen before and estimates the whole
                population with Chapman’s mark–resight formula, the method field ecologists use, without catching a single
                dog. It is the number every dose order and budget starts from, and today it is a guess.
              </p>
              <p className="num mt-8 border-y border-line py-5 font-mono text-base text-ink">
                N̂ = (n₁ + 1)(n₂ + 1) ÷ (m + 1) − 1
              </p>
              <p className="mt-3 text-sm text-ink-3">
                n₁ and n₂ are the dogs seen on each walk; m is the dogs seen on both.
              </p>
            </div>
          </li>
        </ol>
      </div>
    </section>
  );
}

/* 04 · Two modes ---------------------------------------------------------- */

export function ModesSection() {
  return (
    <section className="border-t border-line bg-paper-2 py-24 md:py-32">
      <div className="shell">
        <SectionHead index="04" kicker="Two modes" title="Before the drive, and after it.">
          <p>Most villages have never had a vaccination drive. Seventy is useful there too.</p>
        </SectionHead>
        <div className="mt-16 grid grid-cols-1 border-t border-ink md:grid-cols-2">
          {[
            {
              name: "Plan",
              when: "Before a drive",
              body: "Count the dogs, estimate how many live in the area, and work out how many doses the team should carry to reach seventy percent. No marks needed.",
            },
            {
              name: "Check",
              when: "One to three days after",
              body: "Read paint marks, collars and ear notches while they are fresh, measure coverage against the line, and list the streets the team should go back to.",
            },
          ].map((m) => (
            <div key={m.name} className="border-b border-line py-8 md:border-b-0 md:border-r md:px-8 md:first:pl-0 md:last:border-r-0">
              <div className="flex items-baseline justify-between">
                <h3 className="display text-5xl">{m.name}</h3>
                <span className="label">{m.when}</span>
              </div>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-ink-2">{m.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* 05 · Method and models --------------------------------------------------- */

export function ModelsSection() {
  const rows: [string, string, string][] = [
    ["SAM 3.1", "Video", "Follows every dog with a stable ID from the word “dog”. This is the count."],
    ["SAM 3.1", "Image", "Finds ears and backs on full-resolution frames, and blurs faces, number plates and signs before anything is shared."],
    ["Muse Spark 1.3", "Vision", "Reads paint, collar and notch into structured fields, and confirms when two sightings are the same dog."],
    ["Muse Wonder", "Reasoning", "Writes the program report and next steps, citing the rules it relies on."],
    ["Muse Voice Transcribe", "Speech", "Turns the surveyor’s spoken notes into timestamped pins on the walk."],
    ["DINOv3", "Open weights", "Describes each dog’s appearance as numbers, so the same dog can be found again on the next walk."],
  ];
  return (
    <section id="method" className="scroll-mt-8 border-t border-line bg-paper py-24 md:py-32">
      <div className="shell">
        <SectionHead index="05" kicker="Method" title="Every model has one job.">
          <p>
            Seventy is built on Meta’s models and Meta’s open-source SAM client libraries. Measurements come from
            segmentation and arithmetic, not from a model’s opinion of a number.
          </p>
        </SectionHead>
        <div className="mt-14 overflow-x-auto">
          <table className="w-full min-w-[40rem] border-t border-ink text-left">
            <thead>
              <tr className="border-b border-line">
                <th className="label py-3 pr-6 font-normal">Model</th>
                <th className="label py-3 pr-6 font-normal">Input</th>
                <th className="label py-3 font-normal">Job in Seventy</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([model, kind, job]) => (
                <tr key={model + kind} className="border-b border-line align-top">
                  <td className="py-4 pr-6 font-semibold whitespace-nowrap">{model}</td>
                  <td className="py-4 pr-6 text-ink-3 whitespace-nowrap">{kind}</td>
                  <td className="py-4 text-ink-2">{job}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

/* 06 · Privacy ------------------------------------------------------------- */

export function PrivacySection() {
  return (
    <section className="border-t border-line bg-paper py-24 md:py-32">
      <div className="shell grid grid-cols-12 gap-x-6 gap-y-8">
        <div className="col-span-12 flex items-baseline gap-3 md:col-span-3">
          <span className="label num text-ink">06</span>
          <span className="label">People</span>
        </div>
        <div className="col-span-12 md:col-span-9 lg:col-span-7">
          <h2 className="display text-4xl leading-[1.04] md:text-6xl">It never follows people.</h2>
          <div className="mt-8 grid gap-6 text-lg leading-relaxed text-ink-2 md:grid-cols-2">
            <p>Seventy only asks SAM to look for dogs. People are never tracked, counted or identified.</p>
            <p>
              Before anything leaves a team’s workspace, faces, number plates and shop signs are blurred. Raw video stays
              private to the team that recorded it.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* Closing ------------------------------------------------------------------ */

export function FinalCta() {
  return (
    <section className="relative isolate overflow-hidden bg-[#c9a48f]">
      <Image
        src="/photos/fields-pink-haze.jpg"
        alt="A field at sunrise in pink haze, a tractor small in the distance."
        fill
        sizes="100vw"
        className="object-cover"
      />
      <div aria-hidden className="absolute inset-0 bg-[rgb(26_18_14/0.18)]" />
      <div className="shell relative flex min-h-[70svh] flex-col justify-end py-20 md:py-28">
        <h2 className="display max-w-3xl text-5xl leading-[1.0] text-[#1d140f] md:text-7xl">Walk a ward tomorrow morning.</h2>
        <p className="mt-5 max-w-xl text-lg text-[#2a1d16]">
          Ten minutes with a phone, then the answer. Try it on a real survey first.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/app/demo" className="btn btn-primary">
            See a real survey
          </Link>
          <Link href="/app/new" className="btn btn-on-photo">
            Upload a walk
          </Link>
        </div>
      </div>
    </section>
  );
}
