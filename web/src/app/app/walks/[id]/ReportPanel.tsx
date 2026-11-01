"use client";

import { Fragment, useEffect, useState } from "react";
import { api } from "@/lib/client/workspace";

type Report = {
  headline: string;
  decision: string;
  next_steps: string[];
  context: string;
  notes?: string[];
  limits?: string[];
  sources: { title: string; url: string; supports: string }[];
};

/** Turn [1], [2] markers into links to the matching source. */
function Cited({ text, sources }: { text: string; sources: Report["sources"] }) {
  const parts = text.split(/(\[\d+\])/g);
  return (
    <>
      {parts.map((p, i) => {
        const m = p.match(/^\[(\d+)\]$/);
        const src = m ? sources[Number(m[1]) - 1] : null;
        if (!m || !src) return <Fragment key={i}>{p}</Fragment>;
        return (
          <a key={i} href={src.url} target="_blank" rel="noreferrer" className="num align-super text-[0.75rem] font-semibold text-mark-strong">
            {m[1]}
          </a>
        );
      })}
    </>
  );
}

export function ReportPanel({ walkId, owner }: { walkId: string; owner: boolean }) {
  const [report, setReport] = useState<Report | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ report: Report | null }>(`/api/walks/${walkId}/report`)
      .then((r) => setReport(r.report))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [walkId]);

  async function write() {
    setBusy(true);
    setError(null);
    try {
      const r = await api<{ report: Report }>(`/api/walks/${walkId}/report`, { method: "POST" });
      setReport(r.report);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The report couldn’t be written.");
    } finally {
      setBusy(false);
    }
  }

  if (!loaded || (!report && !owner)) return null;

  return (
    <section className="mt-16" aria-busy={busy}>
      <h2 className="text-xl font-semibold tracking-[-0.01em]">Programme report</h2>
      <p className="mt-1 text-ink-2">Written by Muse Wonder from this survey’s numbers, with the rules it relies on found by web search and cited.</p>
      {!report && (
        <div className="panel mt-5 flex flex-col items-start gap-4 p-7 sm:flex-row sm:items-center sm:justify-between">
          <p className="max-w-xl text-ink-2">One page for the district office: the result, what to do next, and why, with every rule cited.</p>
          <button type="button" onClick={write} disabled={busy} className="btn btn-primary disabled:opacity-60">
            {busy ? "Writing, about 20 seconds" : "Write the report"}
          </button>
        </div>
      )}
      {error && <p className="mt-3 rounded-[14px] bg-amber-soft px-5 py-3 text-[0.9375rem]">{error}</p>}
      {report && (
        <article className="panel mt-5 grid grid-cols-12 gap-y-8 p-7 lg:gap-x-10 md:p-10">
          <div className="col-span-12 lg:col-span-8">
            <p className="display-quiet text-2xl md:text-3xl">{report.headline}</p>
            <p className="mt-5 text-lg leading-relaxed text-ink-2">{report.decision}</p>
            <h3 className="mt-10 font-semibold">Next steps</h3>
            <ol className="mt-3 space-y-3">
              {report.next_steps.map((s, i) => (
                <li key={i} className="grid grid-cols-[2rem_1fr]">
                  <span className="num font-semibold text-ink-3">{i + 1}</span>
                  <span className="text-ink-2">{s}</span>
                </li>
              ))}
            </ol>
            <h3 className="mt-10 font-semibold">Context</h3>
            <p className="mt-3 leading-relaxed text-ink-2">
              <Cited text={report.context} sources={report.sources} />
            </p>
            {report.notes?.length ? (
              <>
                <h3 className="mt-10 font-semibold">For the next walk</h3>
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-ink-2 marker:text-ink-3">
                  {report.notes.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
          <aside className="col-span-12 lg:col-span-4">
            <h3 className="font-semibold">Sources</h3>
            <ol className="mt-3 space-y-4 text-[0.9375rem]">
              {report.sources.map((s, i) => (
                <li key={s.url} className="grid grid-cols-[1.5rem_1fr]">
                  <span className="num font-semibold text-mark-strong">{i + 1}</span>
                  <span>
                    <a href={s.url} target="_blank" rel="noreferrer" className="link font-medium">
                      {s.title}
                    </a>
                    <span className="mt-0.5 block text-ink-3">{s.supports}</span>
                  </span>
                </li>
              ))}
            </ol>
            {owner && (
              <button type="button" onClick={write} disabled={busy} className="btn btn-secondary btn-sm mt-6 disabled:opacity-60">
                {busy ? "Rewriting" : "Write it again"}
              </button>
            )}
          </aside>
        </article>
      )}
    </section>
  );
}
