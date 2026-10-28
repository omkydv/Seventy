import Link from "next/link";
import { SamPhoto } from "@/components/SamPhoto";
import { loadPhotoSegmentation } from "@/lib/sam/photos";
import marks from "@/content/sam/lane-dawn-dog.marks.json";
import { SiteHeader } from "./SiteHeader";

const yesNo = (s: string) => (s === "absent" ? "None" : s === "present" ? "Present" : "Can’t tell");

export async function Hero() {
  const seg = await loadPhotoSegmentation("lane-dawn-dog");
  const dog = seg.outlines["dog"] ?? [];
  const r = marks.reading;
  const dogConf = dog[0]?.confidence ?? null;

  return (
    <section className="relative isolate min-h-[min(100svh,980px)] overflow-hidden bg-[#3a2e1c] text-[#1b1914]">
      <SamPhoto
        src="/photos/lane-dawn-dog.jpg"
        alt="A black dog sits beside a lamp post on an empty village lane at dawn, the air gold with haze."
        width={seg.width}
        height={seg.height}
        outlines={dog}
        marks={[{ id: dog[0]?.id ?? "0", color: "#f7efdf", label: "Dog 01" }]}
        focus={{ x: 0.26, y: 0.6 }}
        priority
        delay={500}
        className="absolute inset-0"
      />
      {/* Lift the hazy upper right just enough for ink type, without hiding the photograph. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(120%_80%_at_85%_10%,rgb(244_236_220/0.62),rgb(244_236_220/0.12)_55%,transparent_75%)]"
      />
      <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[rgb(26_20_12/0.55)] to-transparent" />

      <div className="relative z-10 flex min-h-[min(100svh,980px)] flex-col">
        <SiteHeader onPhoto />

        <div className="shell grid flex-1 grid-cols-12 items-start gap-x-6 pt-4 md:pt-8 lg:pt-12">
          <div className="col-span-12 md:col-span-8 md:col-start-5 lg:col-span-7 lg:col-start-6">
            <p className="label mb-5 text-[#5b4c33]">Rabies vaccination coverage, from a walk</p>
            <h1 className="display text-[3.4rem] leading-[0.96] sm:text-7xl xl:text-8xl">
              Seventy percent <br className="hidden md:block" />
              ends rabies.
            </h1>
            <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-[#2c261c] md:text-xl md:leading-[1.6]">
              When seven in ten dogs in an area are vaccinated, the virus stops spreading. Seventy tells a vaccination
              team whether a ward got there, from a ten-minute walk with a phone.
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
        </div>

        <div className="shell pb-6 md:pb-10">
          <div className="grid grid-cols-12 items-end gap-6">
            <figure className="col-span-12 md:col-span-6 md:col-start-7 lg:col-span-5 lg:col-start-8">
              <div className="rounded-[10px] border border-[rgb(246_240_228/0.28)] bg-[rgb(22_19_14/0.72)] p-4 text-[#efe7d8] md:p-5">
                <div className="flex items-baseline justify-between gap-4 border-b border-white/10 pb-3">
                  <span className="label text-[#efe7d8]">Dog 01</span>
                  <span className="label text-[#efe7d8]/70">
                    SAM 3.1{dogConf != null ? ` · ${dogConf.toFixed(2)}` : ""}
                  </span>
                </div>
                <dl className="grid grid-cols-[6.5rem_1fr] gap-y-1.5 py-3 text-sm">
                  <dt className="text-[#efe7d8]/60">Ear</dt>
                  <dd>{r.ear_notch.status === "absent" ? "Intact, no notch" : yesNo(r.ear_notch.status)}</dd>
                  <dt className="text-[#efe7d8]/60">Paint</dt>
                  <dd>{yesNo(r.paint.status)}</dd>
                  <dt className="text-[#efe7d8]/60">Collar</dt>
                  <dd>{yesNo(r.collar.status)}</dd>
                  <dt className="text-[#efe7d8]/60">Reading</dt>
                  <dd className="font-semibold">Unmarked</dd>
                </dl>
                <blockquote className="border-t border-white/10 pt-3 font-display text-[1.05rem] italic leading-snug text-[#efe7d8]/90">
                  “{r.reason}”
                </blockquote>
                <p className="label mt-3 text-[#efe7d8]/55">
                  Muse Spark 1.3 · {marks.seconds.toFixed(1)} s
                </p>
              </div>
              <figcaption className="mt-3 text-xs leading-relaxed text-[#f3ead9]/80">
                Photograph by Mirza Zubair on Unsplash. The outline and the reading are unedited output from SAM 3.1 and
                Muse Spark 1.3, run on this image.
              </figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}
