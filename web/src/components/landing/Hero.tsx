import Link from "next/link";
import { loadPhotoSegmentation } from "@/lib/sam/photos";
import marks from "@/content/sam/lane-dawn-dog.marks.json";
import { LandingHeader } from "./Brand";
import { HeroPhoto, type HeroReading } from "./HeroPhoto";

function readingFrom(): HeroReading {
  const r = marks.reading;
  const word = (s: string) => (s === "absent" ? "None" : s === "present" ? "Present" : "Can’t see");
  return {
    paint: word(r.paint.status),
    ear: r.ear_notch.status === "absent" ? "Intact, no notch" : word(r.ear_notch.status),
    collar: word(r.collar.status),
    reason: r.reason,
    seconds: marks.seconds,
  };
}

function Copy({ className = "" }: { className?: string }) {
  return (
    <div className={className}>
      <h1 className="display text-[2.9rem] sm:text-6xl xl:text-[5.25rem] xl:leading-[0.98]">
        Know when a street is safe from rabies.
      </h1>
      <p className="lede mt-6 max-w-[33rem] text-[#24364a]">
        Film a ten-minute walk with any phone. Seventy counts every dog once, reads each vaccination mark, and tells a
        vaccination team whether the area has reached the 70% that stops rabies.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/app/demo" className="btn btn-primary">
          See a real survey
        </Link>
        <Link href="/app/new" className="btn btn-light">
          Survey a walk
        </Link>
      </div>
      <p className="mt-6 max-w-[30rem] text-[0.875rem] leading-relaxed text-[#3d4f63] md:hidden">
        Counting by SAM 3.1, mark reading by Muse Spark, reports by Muse Wonder. All Meta models.
      </p>
    </div>
  );
}

export async function Hero() {
  const seg = await loadPhotoSegmentation("lane-dawn-dog");
  const dog = seg.outlines["dog"] ?? [];
  const ear = seg.outlines["dog ear"]?.[0]?.anchor ?? null;
  const reading = readingFrom();

  return (
    <>
      {/* Phones: the claim first, then the photograph as the instrument. */}
      <section className="tone-light bg-[linear-gradient(180deg,#e9f1f7_0%,#f2f6f9_100%)] text-ink md:hidden">
        <LandingHeader />
        <div className="shell pb-10 pt-6">
          <Copy />
        </div>
        <div className="relative">
          <HeroPhoto
            width={seg.width}
            height={seg.height}
            dog={dog}
            ear={ear}
            reading={reading}
            focus={{ x: 0.22, y: 0.62 }}
            className="relative aspect-[4/5] w-full"
            showCard={false}
          />
          <div className="shell relative pb-12 pt-6">
            <p className="text-[0.8125rem] text-[#3d4f63]">
              Photograph by Mirza Zubair on Unsplash. The outline and the reading are real output from SAM 3.1 and Muse
              Spark on this image.
            </p>
          </div>
        </div>
      </section>

      {/* Larger screens: one photograph, the claim set in its haze, the reading pinned to the dog. */}
      <section className="tone-light relative isolate hidden h-[min(100svh,940px)] min-h-[720px] overflow-hidden bg-[#c8b48c] text-ink md:block">
        <HeroPhoto
          width={seg.width}
          height={seg.height}
          dog={dog}
          ear={ear}
          reading={reading}
          focus={{ x: 0.28, y: 0.62 }}
          priority
          className="absolute inset-0"
          showCard={false}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_75%_at_88%_18%,rgb(242_246_249/0.78),rgb(242_246_249/0.28)_48%,transparent_72%)]"
        />
        <div className="relative z-10 flex h-full flex-col">
          <LandingHeader />
          <div className="shell grid flex-1 grid-cols-12 items-center pb-24">
            <Copy className="col-span-7 col-start-6 lg:col-span-6 lg:col-start-7" />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-[rgb(18_14_8/0.55)] to-transparent pb-5 pt-16">
          <p className="shell text-[0.875rem] text-white/90">
            The outline is real SAM 3.1 output on this photograph, and the reading is Muse Spark’s. Counting by SAM 3.1,
            mark reading by Muse Spark, reports by Muse Wonder: all Meta models. Photograph by Mirza Zubair on Unsplash.
          </p>
        </div>
      </section>
    </>
  );
}
