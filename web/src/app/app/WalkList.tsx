"use client";

import Image from "next/image";
import Link from "next/link";
import fieldSamples from "@/content/samples.json";
import { useEffect, useState } from "react";
import { DogGlyph } from "@/components/DogGlyph";
import { api, ensureWorkspace } from "@/lib/client/workspace";
import { day, duration, plural } from "@/lib/format";
import type { Walk } from "@/lib/types";

type Row = Pick<Walk, "id" | "title" | "area_name" | "mode" | "target_mark" | "status" | "duration_s" | "recorded_at" | "created_at" | "stats">;

const IN_PROGRESS: Record<string, string> = {
  created: "Starting",
  uploading: "Uploading",
  tracking: "Counting dogs",
  stitching: "Counting dogs",
  needs_crops: "Waiting for close-ups",
  reading: "Reading marks",
  failed: "Stopped",
};

function Summary({ w }: { w: Row }) {
  const st = w.stats;
  if (!st) return <span className="text-ink-3">{IN_PROGRESS[w.status] ?? "In progress"}</span>;
  if (w.mode === "plan") return <span className="num font-semibold">{plural(st.dogs, "dog")}</span>;
  if (st.status === "insufficient") return <span className="pill bg-canvas-2 text-ink">Too few dogs to call</span>;
  return (
    <span className={`pill num text-ink ${st.status === "below" ? "bg-amber-soft" : "bg-mark-soft"}`}>
      {(st.ci.p * 100).toFixed(0)}% {w.target_mark === "sterilization" ? "sterilized" : "vaccinated"}
    </span>
  );
}

function Strip({ w }: { w: Row }) {
  const st = w.stats;
  const n = Math.min(12, st?.dogs ?? 0);
  if (!st || !n) return <span className="flex gap-1" aria-hidden><DogGlyph status="empty" size={22} /><DogGlyph status="empty" size={22} /><DogGlyph status="empty" size={22} /></span>;
  // Up to twelve dogs in the walk's proportions: marked first, unreadable last.
  const marked = Math.round((st.marked / st.dogs) * n);
  const unknown = Math.min(n - marked, Math.round((st.unknown / st.dogs) * n));
  return (
    <span className="flex gap-1" aria-hidden>
      {Array.from({ length: n }, (_, i) => (
        <DogGlyph key={i} status={i < marked ? "marked" : i >= n - unknown ? "unknown" : "unmarked"} size={22} />
      ))}
    </span>
  );
}

function List({ rows }: { rows: Row[] }) {
  return (
    <ul className="panel divide-y divide-line overflow-hidden">
      {rows.map((w) => (
        <li key={w.id}>
          <Link
            href={`/app/walks/${w.id}`}
            className="grid grid-cols-1 items-center gap-x-6 gap-y-2 px-5 py-5 transition-colors hover:bg-surface-2 sm:grid-cols-[1fr_auto] md:grid-cols-[minmax(0,1fr)_17rem_11rem] md:px-7"
          >
            <span className="min-w-0">
              <span className="block truncate text-lg font-semibold tracking-[-0.01em]">{w.area_name || w.title || "Untitled walk"}</span>
              <span className="block text-[0.9375rem] text-ink-3">
                {w.mode === "plan" ? "Plan" : w.target_mark === "sterilization" ? "Check, sterilization" : "Check, vaccination"}, {duration(w.duration_s)},{" "}
                {day(w.recorded_at ?? w.created_at)}
              </span>
            </span>
            <span className="hidden md:block">
              <Strip w={w} />
            </span>
            <span className="text-left sm:text-right">
              <Summary w={w} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function WalkList() {
  const [data, setData] = useState<{ mine: Row[]; samples: Row[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ensureWorkspace()
      .then(() => api<{ mine: Row[]; samples: Row[] }>("/api/walks"))
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : "Surveys couldn’t be loaded."));
  }, []);

  if (error) return <p className="mt-10 text-ink-2">{error}</p>;
  if (!data) return <div className="panel mt-10 h-40 animate-pulse" aria-label="Loading surveys" />;

  return (
    <div className="mt-10 space-y-16">
      <section aria-labelledby="mine">
        <h2 id="mine" className="sr-only">
          Your surveys
        </h2>
        {data.mine.length ? (
          <List rows={data.mine} />
        ) : (
          <div className="panel flex flex-col items-start gap-6 p-8 md:flex-row md:items-center md:justify-between md:p-10">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-5">
              <span className="flex shrink-0 gap-1.5" aria-hidden>
                <DogGlyph status="unmarked" size={34} />
                <DogGlyph status="marked" size={34} />
                <DogGlyph status="unknown" size={34} />
              </span>
              <div>
                <p className="text-xl font-semibold tracking-[-0.01em]">No surveys yet</p>
                <p className="mt-1 text-ink-2">Film a slow walk through an area, then add the video here.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/app/new" className="btn btn-primary">
                New survey
              </Link>
              <Link href="/app/demo" className="btn btn-secondary">
                See a sample survey
              </Link>
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="samples">
        <h2 id="samples" className="display-quiet text-2xl md:text-3xl">
          Field samples
        </h2>
        <p className="mt-2 max-w-2xl text-ink-2">
          Four real street clips from four very different places, counted by Seventy and checked by hand. Open one to see every dog, try the review,
          and see what each step cost.
        </p>
        <ul className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {fieldSamples.samples.map((s) => (
            <li key={s.slug}>
              <Link href={`/app/walks/${s.walk}`} className="group panel block h-full overflow-hidden">
                <div className="relative aspect-[4/3] bg-canvas-2">
                  <Image src={`/samples/${s.slug}.jpg`} alt="" fill sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw" className="object-cover" />
                </div>
                <div className="p-5">
                  <p className="text-[0.8125rem] text-ink-3">{s.place}</p>
                  <p className="mt-0.5 font-semibold tracking-[-0.01em] group-hover:underline">{s.title}</p>
                  <p className="num mt-2 text-[0.9375rem] text-ink-2">
                    <span className="font-semibold text-ink">{s.seventy}</span> {s.seventy === 1 ? "dog" : "dogs"}, {s.mode.toLowerCase()}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
