"use client";

import { Fragment, useEffect, useState } from "react";
import { api } from "@/lib/client/workspace";

type Report = {
  headline: string;
  decision: string;
  next_steps: string[];
  context: string;
  limits: string[];
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
        if (!m) return <Fragment key={i}>{p}</Fragment>;
        return src ? (
          <a key={i} href={src.url} target="_blank" rel="noreferrer" className="num align-super text-xs text-accent">
            [{m[1]}]
          </a>
        ) : (
          <Fragment key={i}>{p}</Fragment>
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

  if (!loaded) return null;
  if (!report && !owner) return null;

  return (
    <section className="mt-16 border-t border-ink pt-8" aria-busy={busy}>
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="display text-3xl">Program report</h2>
        <span className="label">Muse Wonder, with web search</span>
      </div>
      {!report && (
        <div className="mt-6 max-w-xl">
          <p className="text-ink-2">
            A one-page report for the district office: the result, what to do next, and the national rules it rests on,
            each one cited.
          </p>
          <button type="button" onClick={write} disabled={busy} className="btn btn-primary mt-5 disabled:opacity-60">
            {busy ? "Writing the report, about 20 seconds…" : "Write the report"}
          </button>
          {error && <p className="mt-3 text-sm text-warn">{error}</p>}
        </div>
      )}
      {report && (
        <article className="mt-8 grid grid-cols-12 gap-x-6 gap-y-8">
          <div className="col-span-12 lg:col-span-8">
            <p className="display text-3xl leading-tight md:text-4xl">{report.headline}</p>
            <p className="mt-5 text-lg leading-relaxed text-ink-2">{report.decision}</p>
            <h3 className="label mt-10">Next steps</h3>
            <ol className="mt-3 divide-y divide-line border-y border-line">
              {report.next_steps.map((s, i) => (
                <li key={i} className="grid grid-cols-[2rem_1fr] py-3">
                  <span className="num text-ink-3">{i + 1}</span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
            <h3 className="label mt-10">Context</h3>
            <p className="mt-3 leading-relaxed text-ink-2">
              <Cited text={report.context} sources={report.sources} />
            </p>
            <h3 className="label mt-10">Limits of this walk</h3>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-ink-2">
              {report.limits.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          </div>
          <aside className="col-span-12 lg:col-span-4">
            <h3 className="label">Sources</h3>
            <ol className="mt-3 space-y-3 text-sm">
              {report.sources.map((s, i) => (
                <li key={s.url} className="grid grid-cols-[1.75rem_1fr]">
                  <span className="num text-ink-3">[{i + 1}]</span>
                  <span>
                    <a href={s.url} target="_blank" rel="noreferrer" className="link">
                      {s.title}
                    </a>
                    <span className="mt-0.5 block text-ink-3">{s.supports}</span>
                  </span>
                </li>
              ))}
            </ol>
            {owner && (
              <button type="button" onClick={write} disabled={busy} className="btn btn-quiet mt-6 h-9 px-4 text-sm disabled:opacity-60">
                {busy ? "Rewriting…" : "Write it again"}
              </button>
            )}
          </aside>
        </article>
      )}
    </section>
  );
}
