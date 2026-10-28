"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api, ensureWorkspace } from "@/lib/client/workspace";
import { day, duration } from "@/lib/format";
import type { Walk } from "@/lib/types";

type Row = Pick<Walk, "id" | "title" | "area_name" | "mode" | "target_mark" | "status" | "duration_s" | "recorded_at" | "created_at" | "stats">;

const STAGE: Record<string, string> = {
  uploading: "Uploading",
  tracking: "Tracking dogs",
  stitching: "Joining minutes",
  needs_crops: "Waiting for close-ups",
  reading: "Reading marks",
  review: "Needs review",
  done: "Done",
  failed: "Failed",
  created: "Starting",
};

function Result({ w }: { w: Row }) {
  const st = w.stats;
  if (!st) return <span className="text-ink-3">{STAGE[w.status]}</span>;
  if (w.mode === "plan") return <span className="num">{st.dogs} dogs</span>;
  return (
    <span className="num">
      <span className={st.status === "below" ? "text-warn" : "text-ink"}>{(st.ci.p * 100).toFixed(0)}%</span>
      <span className="text-ink-3"> of {st.readable} readable</span>
    </span>
  );
}

function Table({ rows, empty }: { rows: Row[]; empty: React.ReactNode }) {
  if (!rows.length) return <div className="border-t border-line py-6 text-ink-2">{empty}</div>;
  return (
    <ul className="border-t border-ink">
      {rows.map((w) => (
        <li key={w.id}>
          <Link
            href={`/app/walks/${w.id}`}
            className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-1 border-b border-line py-4 transition-colors hover:bg-paper-2 sm:grid-cols-[1fr_8rem_8rem_10rem]"
          >
            <span className="font-semibold">{w.area_name || w.title || "Untitled walk"}</span>
            <span className="label sm:order-none">{w.mode === "plan" ? "Plan" : "Check"}</span>
            <span className="num text-sm text-ink-2">{duration(w.duration_s)}</span>
            <span className="text-right text-sm">
              <Result w={w} />
              <span className="block text-xs text-ink-3">{day(w.recorded_at ?? w.created_at)}</span>
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
      .catch((e) => setError(e instanceof Error ? e.message : "Couldn’t load walks."));
  }, []);

  if (error) return <p className="mt-8 text-ink-2">{error}</p>;
  if (!data) return <p className="label mt-10">Loading</p>;

  return (
    <div className="mt-10 space-y-16">
      <section>
        <Table
          rows={data.mine}
          empty={
            <>
              No walks yet.{" "}
              <Link href="/app/new" className="link text-ink">
                Add your first walk
              </Link>
              , or open a sample survey below.
            </>
          }
        />
      </section>
      <section>
        <h2 className="display text-3xl">Sample surveys</h2>
        <p className="mt-2 max-w-xl text-ink-2">Real walks processed by Seventy, open to everyone.</p>
        <div className="mt-6">
          <Table rows={data.samples} empty="Sample surveys appear here once they are processed." />
        </div>
      </section>
    </div>
  );
}
