"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { recallFile, rememberFile } from "@/lib/client/files";
import { uploadSigned } from "@/lib/client/storage";
import { recallUploads, type UploadTicket } from "@/lib/client/uploads";
import { bestCrops, convertChunk, extractCrops, probeVideo, trackingSize } from "@/lib/client/video";
import { api, ensureWorkspace } from "@/lib/client/workspace";
import { day, duration } from "@/lib/format";
import type { WalkState } from "@/lib/types";
import { Pipeline, type LocalStage } from "./Pipeline";
import { Results } from "./Results";

const POLL_MS = 3500;

export function WalkView({ id }: { id: string }) {
  const [s, setS] = useState<WalkState | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [local, setLocal] = useState<LocalStage | null>(null);
  const [needFile, setNeedFile] = useState(false);
  const [workError, setWorkError] = useState<string | null>(null);
  const working = useRef(false);
  const polling = useRef(false);

  const load = useCallback(async () => {
    const st = await api<WalkState>(`/api/walks/${id}?media=1`);
    setS(st);
    return st;
  }, [id]);

  useEffect(() => {
    ensureWorkspace()
      .then(load)
      .catch((e) => setLoadError(e instanceof Error ? e.message : "Couldn’t load this walk."));
  }, [load]);

  const status = s?.walk.status;
  const owner = s?.owner ?? false;

  // Browser-side work: converting and uploading the walk, then cutting close-ups.
  const runUpload = useCallback(async (st: WalkState) => {
    const file = recallFile(id);
    if (!file) return setNeedFile(true);
    working.current = true;
    setWorkError(null);
    try {
      let tickets: UploadTicket[] | null = recallUploads(id);
      if (!tickets) tickets = (await api<{ uploads: UploadTicket[] }>(`/api/walks/${id}/uploads`, { method: "POST" })).uploads;
      const byIdx = new Map(tickets.map((t) => [t.idx, t]));
      const size = trackingSize(st.walk.src_width ?? 1920, st.walk.src_height ?? 1080);
      const open = st.chunks.filter((c) => c.status === "pending" || c.status === "uploaded");
      let uploading: Promise<void> = Promise.resolve();
      for (const [i, c] of open.entries()) {
        const ticket = byIdx.get(c.idx);
        if (!ticket) continue;
        setLocal({ kind: "preparing", index: i, total: open.length, progress: 0, chunk: c.idx });
        const blob = await convertChunk(file, c.start_s, c.end_s, {
          ...size,
          fps: st.walk.proc_fps,
          onProgress: (p) => setLocal({ kind: "preparing", index: i, total: open.length, progress: p, chunk: c.idx }),
        });
        // Upload this piece while the next one is being prepared.
        await uploading;
        uploading = (async () => {
          await uploadSigned(ticket.path, ticket.token, blob, "video/mp4");
          await api(`/api/walks/${id}/chunks/${c.idx}`, { method: "POST" });
        })();
      }
      setLocal({ kind: "uploading", index: open.length, total: open.length, progress: 1, chunk: -1 });
      await uploading;
      setLocal(null);
      await load();
    } catch (e) {
      setWorkError(e instanceof Error ? e.message : "The upload stopped.");
    } finally {
      working.current = false;
    }
  }, [id, load]);

  const runCrops = useCallback(async (st: WalkState) => {
    const file = recallFile(id);
    if (!file) return setNeedFile(true);
    working.current = true;
    setWorkError(null);
    try {
      const requests = st.dogs.flatMap((d) => d.samples.map((smp) => ({ dogId: d.id, t: smp.t, box: smp.box })));
      setLocal({ kind: "cropping", index: 0, total: requests.length, progress: 0, chunk: -1 });
      const crops = await extractCrops(file, requests, (done, total) =>
        setLocal({ kind: "cropping", index: done, total, progress: done / total, chunk: -1 }),
      );
      const best = bestCrops(crops, 3);
      const counters = new Map<string, number>();
      const items = best.map((c) => {
        const n = counters.get(c.dogId) ?? 0;
        counters.set(c.dogId, n + 1);
        return { crop: c, n };
      });
      const { uploads } = await api<{ uploads: { dogId: string; n: number; path: string; token: string }[] }>(
        `/api/walks/${id}/crops`,
        { method: "POST", json: { action: "urls", items: items.map((i) => ({ dogId: i.crop.dogId, n: i.n })) } },
      );
      const key = (dogId: string, n: number) => `${dogId}:${n}`;
      const ticketFor = new Map(uploads.map((u) => [key(u.dogId, u.n), u]));
      let done = 0;
      const queue = [...items];
      const workers = Array.from({ length: 4 }, async () => {
        while (queue.length) {
          const it = queue.shift()!;
          const t = ticketFor.get(key(it.crop.dogId, it.n))!;
          await uploadSigned(t.path, t.token, it.crop.blob, "image/jpeg");
          done++;
          setLocal({ kind: "sending", index: done, total: items.length, progress: done / items.length, chunk: -1 });
        }
      });
      await Promise.all(workers);
      await api(`/api/walks/${id}/crops`, {
        method: "POST",
        json: {
          action: "done",
          crops: items.map((i) => ({
            dogId: i.crop.dogId,
            path: ticketFor.get(key(i.crop.dogId, i.n))!.path,
            t: i.crop.t,
            sharpness: Math.round(i.crop.sharpness),
          })),
        },
      });
      setLocal(null);
      await load();
    } catch (e) {
      setWorkError(e instanceof Error ? e.message : "Cutting close-ups stopped.");
    } finally {
      working.current = false;
    }
  }, [id, load]);

  useEffect(() => {
    if (!s || !owner || working.current) return;
    const job =
      status === "uploading" && s.chunks.some((c) => c.status === "pending" || c.status === "uploaded")
        ? runUpload
        : status === "needs_crops"
          ? runCrops
          : null;
    if (!job) return;
    const t = window.setTimeout(() => job(s), 0);
    return () => window.clearTimeout(t);
  }, [s, status, owner, runUpload, runCrops]);

  // Server-side work advances on each poll.
  useEffect(() => {
    if (!status || !["uploading", "tracking", "stitching", "reading"].includes(status)) return;
    const timer = window.setInterval(async () => {
      if (polling.current) return;
      polling.current = true;
      try {
        const next = await api<WalkState>(`/api/walks/${id}/advance`, { method: "POST" });
        setS((prev) => (prev ? { ...prev, ...next, media: prev.media } : prev));
        if (next.walk.status !== status && ["needs_crops", "review", "done"].includes(next.walk.status)) await load();
      } catch {
        /* transient; the next poll retries */
      } finally {
        polling.current = false;
      }
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [status, id, load]);

  async function reopen(f: File | undefined) {
    if (!f || !s) return;
    try {
      const p = await probeVideo(f);
      if (s.walk.duration_s && Math.abs(p.durationS - s.walk.duration_s) > 1.5) {
        setWorkError(`That video is ${duration(p.durationS)}; this walk was ${duration(s.walk.duration_s)}. Choose the original file.`);
        return;
      }
      rememberFile(id, f);
      setNeedFile(false);
      setWorkError(null);
      if (status === "uploading") runUpload(s);
      else if (status === "needs_crops") runCrops(s);
    } catch (e) {
      setWorkError(e instanceof Error ? e.message : "Couldn’t read that video.");
    }
  }

  if (loadError) {
    return (
      <main className="shell py-16">
        <p className="label">Walk</p>
        <h1 className="display mt-3 text-4xl">This walk couldn’t be opened.</h1>
        <p className="mt-4 text-ink-2">{loadError}</p>
      </main>
    );
  }
  if (!s) {
    return (
      <main className="shell py-16">
        <p className="label">Loading the walk</p>
      </main>
    );
  }

  const w = s.walk;
  const processing = !["review", "done", "failed"].includes(w.status);
  return (
    <main className="shell pb-24 pt-10 md:pt-14">
      <header className="grid grid-cols-12 gap-x-6 gap-y-3 border-b border-line pb-8">
        <div className="col-span-12 md:col-span-8">
          <p className="label">
            {w.mode === "plan" ? "Plan" : w.target_mark === "sterilization" ? "Check · sterilization" : "Check · vaccination"}
            {w.recorded_at ? ` · ${day(w.recorded_at)}` : ` · ${day(w.created_at)}`}
          </p>
          <h1 className="display mt-3 text-5xl md:text-6xl">{w.area_name || w.title || "Untitled walk"}</h1>
        </div>
        <div className="col-span-12 self-end text-sm text-ink-2 md:col-span-4 md:text-right">
          <span className="num">{duration(w.duration_s)} of video</span>
          {s.dogs.length > 0 && <span className="num"> · {s.dogs.length} dogs tracked</span>}
        </div>
      </header>

      {needFile && owner && (
        <div className="mt-8 rounded-[8px] border border-line-strong bg-card p-5">
          <p className="font-semibold">This walk’s video isn’t open on this device.</p>
          <p className="mt-1 text-sm text-ink-2">Choose the same file to continue. The original never leaves your device.</p>
          <input type="file" accept="video/*" className="mt-4 text-sm" onChange={(e) => reopen(e.target.files?.[0])} />
        </div>
      )}
      {workError && (
        <p role="alert" className="mt-8 rounded-[8px] border border-warn/40 bg-warn-soft px-4 py-3 text-sm">
          {workError}
        </p>
      )}
      {w.status === "failed" && (
        <p role="alert" className="mt-8 rounded-[8px] border border-warn/40 bg-warn-soft px-4 py-3 text-sm">
          {w.error ?? "Processing failed."}
        </p>
      )}

      {processing ? <Pipeline state={s} local={local} /> : <Results state={s} onChange={setS} />}
    </main>
  );
}
