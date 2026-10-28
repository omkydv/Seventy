import { DogGlyph } from "@/components/DogGlyph";

function Row({ marked, total }: { marked: number; total: number }) {
  return (
    <div className="flex flex-wrap gap-1.5" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <DogGlyph key={i} status={i < marked ? "marked" : "unmarked"} size={22} />
      ))}
    </div>
  );
}

const facts = [
  ["Any phone", "No special camera. The phone your team already carries."],
  ["Light on data", "Only a small copy is uploaded, under 10 MB a minute of walking."],
  ["Checkable later", "Every dog has its own close-up, so any count can be audited."],
  ["About a dollar a walk", "Model time for a ten-minute walk, at published prices."],
];

export function Teams() {
  return (
    <section className="bg-canvas py-28 md:py-40">
      <div className="shell">
        <div className="max-w-3xl">
          <h2 className="display text-4xl md:text-[4.25rem] md:leading-[1.02]">Made for the teams who vaccinate dogs.</h2>
          <p className="lede mt-8 max-w-2xl">
            City veterinary departments, health ministries and the charities that run vaccination drives, in the more than
            150 countries where dog rabies still kills.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="panel p-8 md:p-10">
            <h3 className="display-quiet text-3xl">Plan</h3>
            <p className="mt-1 text-ink-3">Before a drive</p>
            <p className="mt-6 text-lg text-ink-2">
              Count the dogs, estimate how many live in the area, and work out how many doses to carry to reach 70%. No marks
              needed, so it works where no drive has ever been.
            </p>
            <div className="mt-8 rounded-[16px] bg-canvas p-5">
              <Row marked={0} total={18} />
              <p className="mt-4 font-semibold">18 dogs seen. At least 13 doses for 70%.</p>
              <p className="text-[0.875rem] text-ink-3">Illustration</p>
            </div>
          </div>
          <div className="panel p-8 md:p-10">
            <h3 className="display-quiet text-3xl">Check</h3>
            <p className="mt-1 text-ink-3">One to three days after</p>
            <p className="mt-6 text-lg text-ink-2">
              Read paint marks, collars and ear notches while they are fresh, measure coverage against the line, and see
              which streets the team should go back to.
            </p>
            <div className="mt-8 rounded-[16px] bg-canvas p-5">
              <Row marked={11} total={18} />
              <p className="mt-4 font-semibold">11 of 18 marked. Below the line by 2 dogs.</p>
              <p className="text-[0.875rem] text-ink-3">Illustration</p>
            </div>
          </div>
        </div>

        <dl className="mt-16 grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {facts.map(([term, desc]) => (
            <div key={term}>
              <dt className="text-lg font-semibold tracking-[-0.01em]">{term}</dt>
              <dd className="mt-1 text-ink-2">{desc}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
