import { DogGlyph } from "@/components/DogGlyph";

type Step = { title: string; body: string; marked: number; result?: { text: string; tone: string } };

const steps: Step[] = [
  { title: "Count before the drive", body: "One walk per area. Seventy counts the dogs and says how many doses to bring.", marked: 0, result: { text: "10 dogs, bring at least 7 doses", tone: "bg-canvas-2" } },
  { title: "Vaccinate and mark", body: "The team’s usual work, with paint, a collar or an ear tag.", marked: 6 },
  { title: "Check after the drive", body: "The same walk, one to three days later. Seventy reads every mark.", marked: 6, result: { text: "60%, below the line", tone: "bg-amber-soft" } },
  { title: "Go back where it fell short", body: "Unmarked dogs bunch up in one stretch of the walk. The team returns there, not to the whole area.", marked: 8, result: { text: "80%, complete", tone: "bg-mark-soft" } },
  { title: "Report", body: "One page for the office. Every number links to the dogs behind it.", marked: 8 },
];

/** A drive as a programme would run it, drawn with the same dogs from start to finish. */
export function Programme() {
  return (
    <section id="programme" className="scroll-mt-6 bg-canvas py-28 md:py-40">
      <div className="shell">
        <div className="max-w-4xl">
          <h2 className="display text-[2rem] sm:text-4xl md:text-[4.25rem] md:leading-[1.02]">How a programme would use it.</h2>
          <p className="lede mt-8 max-w-2xl">
            Mass dog vaccination runs area by area: count, vaccinate, check, go back, report. Seventy takes the counting and the checking, and leaves
            the vaccinating to the team.
          </p>
        </div>
        <ol className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-5">
          {steps.map((s, i) => (
            <li key={s.title} className="panel flex flex-col p-6">
              <p className="num text-[0.875rem] font-semibold text-ink-3">Step {i + 1}</p>
              <h3 className="mt-2 text-lg font-semibold leading-snug tracking-[-0.01em]">{s.title}</h3>
              <div className="mt-4 grid w-fit grid-cols-5 gap-1" aria-hidden>
                {Array.from({ length: 10 }, (_, k) => (
                  <DogGlyph key={k} status={k < s.marked ? "marked" : "unmarked"} size={20} />
                ))}
              </div>
              <p className="mt-4 flex-1 text-[0.9375rem] text-ink-2">{s.body}</p>
              {s.result && <p className={`num mt-4 rounded-[10px] px-3 py-2 text-[0.875rem] font-semibold text-ink ${s.result.tone}`}>{s.result.text}</p>}
            </li>
          ))}
        </ol>
        <p className="mt-4 text-[0.875rem] text-ink-3">An illustration with ten dogs. Real areas have dozens to hundreds.</p>
      </div>
    </section>
  );
}
