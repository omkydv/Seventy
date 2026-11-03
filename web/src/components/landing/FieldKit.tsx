import Image from "next/image";

function Phone({ src, alt }: { src: string; alt: string }) {
  return (
    <div className="mx-auto w-full max-w-[17rem] rounded-[2.6rem] bg-[#04080c] p-[0.5rem] shadow-[0_40px_80px_-36px_rgb(0_0_0/0.85)] ring-1 ring-white/12">
      <div className="relative aspect-[390/844] overflow-hidden rounded-[2.15rem] bg-black">
        <Image src={src} alt={alt} fill sizes="272px" className="object-cover object-top" />
      </div>
    </div>
  );
}

const screens = [
  {
    src: "/field/record.jpg",
    alt: "Seventy's recorder on a phone: the street on camera, 27 seconds in, location within 5 metres, 30 metres walked.",
    title: "Record the walk",
    body: "Film inside Seventy. The phone’s route is saved second by second with the video, and the screen stays awake for the whole walk.",
  },
  {
    src: "/field/live.jpg",
    alt: "The live screen while a walk is counted: SAM 3.1's outlines playing back, two pieces tracked at once, and Muse Spark reading each dog.",
    title: "Watch it count",
    body: "The pieces of the walk are tracked by SAM 3.1 at the same time. Its outlines play back as they arrive, and every dog’s reading appears as Muse Spark finishes it.",
  },
  {
    src: "/field/answer.jpg",
    alt: "A finished survey on a phone: four dogs, each counted once, and the doses to bring, above SAM 3.1's outlines on the walk.",
    title: "Get the answer, with the evidence",
    body: "The count, the doses to bring or the coverage against the 70% line, and every dog with its close-ups and its moment in the video. A recorded walk adds a map of where to go back.",
  },
];

const facts: [string, string][] = [
  ["Nothing to install", "Seventy runs in the phone’s browser, and can be added to the home screen like an app."],
  ["Small uploads", "The phone sends a five-frames-a-second copy, about 5 to 9 MB a minute. The original video stays on the phone."],
  ["Private by default", "Every person in the footage is pixelated inside their own outline. Nobody is counted or identified."],
  ["Straight to the team", "The list of dogs to go back to goes to the team’s chat in one tap, with walking directions for each."],
];

/** The product in a surveyor's hand: real screens, from filming to the finished record. */
export function FieldKit() {
  return (
    <section id="field" className="scroll-mt-6 bg-[#0b1621] py-28 text-on-ink md:py-40">
      <div className="shell">
        <div className="grid grid-cols-12 gap-y-8 lg:gap-x-8">
          <h2 className="display col-span-12 text-[2rem] text-white sm:text-4xl md:text-[4.25rem] md:leading-[1.02] lg:col-span-7">
            Built for the street, on the phone a surveyor already has.
          </h2>
          <p className="col-span-12 self-end text-lg leading-relaxed text-[#c9d6e2] lg:col-span-5">
            No app to install and no new equipment. Seventy films the walk, saves the route, and shows the count arriving while the team is still on
            the street.
          </p>
        </div>

        <ol className="mt-16 grid grid-cols-1 gap-x-8 gap-y-14 md:grid-cols-3">
          {screens.map((s, i) => (
            <li key={s.src}>
              <Phone src={s.src} alt={s.alt} />
              <div className="mx-auto mt-7 max-w-[19rem]">
                <p className="text-[0.9375rem] font-semibold text-[#9fd8bd]">
                  <span className="num">{i + 1}</span>. {s.title}
                </p>
                <p className="mt-2 text-[#c9d6e2]">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <dl className="mt-20 grid grid-cols-1 gap-x-8 gap-y-8 border-t border-white/12 pt-10 sm:grid-cols-2 lg:grid-cols-4">
          {facts.map(([k, v]) => (
            <div key={k}>
              <dt className="font-semibold text-white">{k}</dt>
              <dd className="mt-1.5 text-[0.9375rem] leading-relaxed text-[#9fb1c2]">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-10 text-[0.875rem] text-[#7f93a6]">
          Real screens from the app on a phone: a test walk filmed from sample footage with a simulated route, and the market street sample.
        </p>
      </div>
    </section>
  );
}
