import "server-only";

import { walkStats, type StatDog } from "@/lib/stats";
import { pickSamples, stitchChunks, type ChunkInput } from "@/lib/tracks";
import { db, getBytes, getText, putText, signedReadUrl, signedReadUrls, signedUploadUrl } from "./db";
import { isSample } from "./samples";
import { classify, MARK_MODEL, readMarks, sparkCost, type MarkReading } from "./marks";
import { earZoom, lookFor } from "./ears";
import { SECOND_OPINION } from "@/lib/marks";
import { checkRepeats } from "./repeats";
import { checkJob, compactTracks, samVideoCost, submitVideoJob, type ChunkTracks } from "./sam";
import type { Workspace } from "./auth";
import { env } from "./env";

export type WalkInput = {
  mode: "plan" | "check";
  title?: string;
  areaName?: string;
  country?: string;
  targetMark?: "vaccination" | "sterilization";
  markTypes?: string[];
  recordedAt?: string | null;
  durationS: number;
  srcWidth: number;
  srcHeight: number;
  srcFps?: number | null;
  sourceName?: string;
  procFps?: number;
  chunkSeconds?: number;
  route?: { points: [number, number, number, number][] } | null;
};

const OVERLAP_S = 2;

export function planChunks(duration: number, chunkSeconds = 60, overlap = OVERLAP_S) {
  const plan: { idx: number; start: number; end: number }[] = [];
  let start = 0;
  let idx = 0;
  while (start < duration - 0.05) {
    let end = Math.min(duration, start + chunkSeconds + (idx > 0 ? overlap : 0));
    // Fold a short tail into this chunk rather than sending a tiny one.
    if (duration - end < 10) end = duration;
    plan.push({ idx, start, end });
    if (end >= duration) break;
    start = end - overlap;
    idx++;
  }
  return plan;
}

type Usage = { workspace_id: string; walk_id: string; model: string; units: number; unit: string; cost_usd: number; stage?: string; calls?: number; seconds?: number | null };

async function logUsage(row: Usage) {
  await db().from("usage_log").insert(row);
}

export async function spentToday(workspaceId: string): Promise<number> {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data } = await db().from("usage_log").select("cost_usd").eq("workspace_id", workspaceId).gte("created_at", since);
  return (data ?? []).reduce((s, r) => s + Number(r.cost_usd ?? 0), 0);
}

export async function createWalk(ws: Workspace, input: WalkInput) {
  if (!(input.durationS > 0)) throw new UserError("That video has no length. Try exporting it again.");
  if (input.durationS > 20 * 60) throw new UserError("Walks can be up to 20 minutes. Split longer recordings.");
  const procFps = input.procFps ?? 5;
  // Dogs and people are tracked as two jobs over the same frames (pieces overlap by 2 s in 30); readings and the report add about 60 cents.
  const estimate = 2 * samVideoCost(input.durationS * procFps * 1.07) + 0.6;
  if (!ws.isDemo && (await spentToday(ws.id)) + estimate > env.dailyCapUsd) {
    throw new UserError("This workspace has used today’s processing allowance. Try again tomorrow, or open a sample survey.");
  }

  const { data: walk, error } = await db()
    .from("walks")
    .insert({
      workspace_id: ws.id,
      mode: input.mode,
      title: input.title?.trim() || null,
      area_name: input.areaName?.trim() || null,
      country: input.country?.trim() || "Not given",
      target_mark: input.targetMark ?? "vaccination",
      mark_types: input.markTypes?.length ? input.markTypes : ["paint"],
      recorded_at: input.recordedAt ?? null,
      duration_s: input.durationS,
      src_width: input.srcWidth,
      src_height: input.srcHeight,
      src_fps: input.srcFps ?? null,
      source_name: input.sourceName ?? null,
      proc_fps: procFps,
      route: input.route?.points?.length ? { points: input.route.points } : null,
      chunk_seconds: input.chunkSeconds ?? 30,
      overlap_seconds: OVERLAP_S,
      status: "uploading",
      progress: { stage: "uploading" },
    })
    .select("*")
    .single();
  if (error || !walk) throw new Error(`Could not create walk: ${error?.message}`);

  const plan = planChunks(input.durationS, input.chunkSeconds ?? 30);
  const rows = plan.map((c) => ({
    walk_id: walk.id,
    idx: c.idx,
    start_s: c.start,
    end_s: c.end,
    storage_path: `${walk.id}/chunks/${String(c.idx).padStart(3, "0")}.mp4`,
  }));
  const { error: chunkErr } = await db().from("chunks").insert(rows);
  if (chunkErr) throw new Error(`Could not plan chunks: ${chunkErr.message}`);

  const uploads = await Promise.all(rows.map(async (r) => ({ idx: r.idx, ...(await signedUploadUrl(r.storage_path)) })));
  return { walk, chunks: plan, uploads };
}

export class UserError extends Error {}

/** Called once a chunk's bytes are in storage: start SAM on it. */
export async function submitChunk(walkId: string, idx: number) {
  const { data: chunk } = await db().from("chunks").select("*").eq("walk_id", walkId).eq("idx", idx).single();
  if (!chunk) throw new UserError("No such chunk.");
  if (chunk.status === "submitted" || chunk.status === "done") return chunk;
  const url = await signedReadUrl(chunk.storage_path, 60 * 60 * 24);
  const { responseId, via } = await submitVideoJob({
    concept: "dog",
    videoUrl: url,
    loadBytes: () => getBytes(chunk.storage_path),
    filename: `chunk-${idx}.mp4`,
  });
  // SAM looks for people only so the replay can blur them. If this job can't start, the walk goes on.
  const people = await submitVideoJob({
    concept: "person",
    videoUrl: url,
    loadBytes: () => getBytes(chunk.storage_path),
    filename: `chunk-${idx}-people.mp4`,
  }).catch(() => null);
  await db()
    .from("chunks")
    .update({
      status: "submitted",
      sam_response_id: responseId,
      people_response_id: people?.responseId ?? null,
      submitted_at: new Date().toISOString(),
      attempts: chunk.attempts + 1,
      error: null,
    })
    .eq("id", chunk.id);
  await db().from("walks").update({ status: "tracking", progress: { stage: "tracking", via } }).eq("id", walkId);
  return { ...chunk, status: "submitted", sam_response_id: responseId };
}

type DogRow = {
  id: string;
  label: number;
  samples: { t: number; box: [number, number, number, number] }[];
  crops: { path: string; t: number; sharpness?: number }[];
  mark: MarkReading | null;
};

const secondsSince = (iso: string | null) => (iso ? (Date.now() - new Date(iso).getTime()) / 1000 : null);

/** Save each finished people job, whatever stage the walk is at. */
export async function collectPeople(walkId: string, workspaceId?: string) {
  if (!workspaceId) {
    const { data } = await db().from("walks").select("workspace_id").eq("id", walkId).single();
    workspaceId = String(data?.workspace_id ?? "");
  }
  const { data: chunks } = await db().from("chunks").select("id, idx, people_response_id, people_path, submitted_at, frames").eq("walk_id", walkId);
  const waiting = (chunks ?? []).filter((c) => c.people_response_id && !c.people_path);
  await Promise.all(
    waiting.map(async (c) => {
      const s = await checkJob(c.people_response_id).catch(() => null);
      if (!s || s.state === "running") return;
      if (s.state === "failed") {
        await db().from("chunks").update({ people_response_id: null }).eq("id", c.id);
        return;
      }
      const path = `${walkId}/sam/${String(c.idx).padStart(3, "0")}.people.txt`;
      await putText(path, s.text, "text/plain");
      await db().from("chunks").update({ people_path: path }).eq("id", c.id);
      const frames = Number(c.frames ?? 0);
      await logUsage({ workspace_id: workspaceId, walk_id: walkId, model: "sam-3.1", units: frames, unit: "frames", cost_usd: samVideoCost(frames), stage: "Find people to blur", calls: 1, seconds: secondsSince(c.submitted_at) });
    }),
  );
}

/** Do the next piece of work for a walk and return its state. Safe to call repeatedly. */
export async function advance(walkId: string) {
  const { data: walk } = await db().from("walks").select("*").eq("id", walkId).single();
  if (!walk) throw new UserError("No such walk.");
  await collectPeople(walkId, String(walk.workspace_id)).catch(() => {});

  if (walk.status === "tracking" || walk.status === "uploading") {
    const { data: chunks } = await db().from("chunks").select("*").eq("walk_id", walkId).order("idx");
    const running = (chunks ?? []).filter((c) => c.status === "submitted" && c.sam_response_id);
    await Promise.all(
      running.map(async (c) => {
        const s = await checkJob(c.sam_response_id);
        if (s.state === "running") return;
        if (s.state === "failed") {
          await db().from("chunks").update({ status: "failed", error: s.message }).eq("id", c.id);
          return;
        }
        const tracks = await compactTracks(s.text);
        const base = `${walkId}/sam/${String(c.idx).padStart(3, "0")}`;
        await putText(`${base}.txt`, s.text, "text/plain");
        await putText(`${base}.json`, JSON.stringify(tracks));
        await db()
          .from("chunks")
          .update({ status: "done", tracks_path: `${base}.json`, frames: tracks.frames, objects: Object.keys(tracks.objects).length, completed_at: new Date().toISOString() })
          .eq("id", c.id);
        await logUsage({
          workspace_id: String(walk.workspace_id),
          walk_id: walkId,
          model: "sam-3.1",
          units: tracks.frames,
          unit: "frames",
          cost_usd: samVideoCost(tracks.frames),
          stage: "Track every dog",
          calls: 1,
          seconds: secondsSince(c.submitted_at),
        });
      }),
    );
    const { data: after } = await db().from("chunks").select("*").eq("walk_id", walkId).order("idx");
    const all = after ?? [];
    if (all.length && all.every((c) => c.status === "done")) {
      await stitch(walkId, walk, all);
    } else if (all.some((c) => c.status === "failed")) {
      const failed = all.find((c) => c.status === "failed");
      await db().from("walks").update({ status: "failed", error: `Tracking failed on minute ${failed.idx + 1}: ${failed.error}` }).eq("id", walkId);
    }
  } else if (walk.status === "reading") {
    await readNextDogs(walkId, walk);
  }
  return state(walkId);
}

async function stitch(walkId: string, walk: Record<string, unknown>, chunks: Record<string, unknown>[]) {
  await db().from("walks").update({ status: "stitching", progress: { stage: "stitching" } }).eq("id", walkId);
  const inputs: ChunkInput[] = [];
  for (const c of chunks) {
    const t = JSON.parse(await getText(String(c.tracks_path))) as ChunkTracks;
    inputs.push({ idx: Number(c.idx), startS: Number(c.start_s), fps: Number(walk.proc_fps), ...t });
  }
  const dogs = stitchChunks(inputs);
  await db().from("dogs").delete().eq("walk_id", walkId);
  if (dogs.length) {
    const rows = dogs.map((d) => ({
      walk_id: walkId,
      label: d.label,
      first_s: d.firstS,
      last_s: d.lastS,
      frames: d.sightings.length,
      mean_conf: d.meanConf,
      segments: d.segments,
      samples: pickSamples(d).map((s) => ({ t: Number(s.t.toFixed(3)), box: s.box.map((v) => Number(v.toFixed(4))) })),
    }));
    const { error } = await db().from("dogs").insert(rows);
    if (error) throw new Error(`Could not save dogs: ${error.message}`);
  }
  await db()
    .from("walks")
    .update({
      status: dogs.length ? "needs_crops" : "done",
      progress: { stage: dogs.length ? "needs_crops" : "done", dogs: dogs.length },
      stats: dogs.length ? null : statsFrom([], String(walk.target_mark)),
    })
    .eq("id", walkId);
}

/** The browser has uploaded close-ups for each dog; start reading marks. */
export async function registerCrops(walkId: string, crops: { dogId: string; path: string; t: number; sharpness?: number }[]) {
  const byDog = new Map<string, { path: string; t: number; sharpness?: number }[]>();
  for (const c of crops) {
    const list = byDog.get(c.dogId) ?? [];
    list.push({ path: c.path, t: c.t, sharpness: c.sharpness });
    byDog.set(c.dogId, list);
  }
  await Promise.all(
    [...byDog.entries()].map(([dogId, list]) =>
      db().from("dogs").update({ crops: list, best_crop: list[0] ?? null }).eq("id", dogId).eq("walk_id", walkId),
    ),
  );
  await db().from("walks").update({ status: "reading", progress: { stage: "reading" } }).eq("id", walkId);
}

export async function cropUploadUrls(walkId: string, items: { dogId: string; n: number }[]) {
  return Promise.all(
    items.map(async ({ dogId, n }) => {
      const path = `${walkId}/crops/${dogId}-${n}.jpg`;
      return { dogId, n, ...(await signedUploadUrl(path)) };
    }),
  );
}

const READ_BATCH = 6;

const jpegDataUrl = (b: Uint8Array) => `data:image/jpeg;base64,${Buffer.from(b).toString("base64")}`;

async function readNextDogs(walkId: string, walk: Record<string, unknown>) {
  const { data: pending } = await db()
    .from("dogs")
    .select("id, label, crops")
    .eq("walk_id", walkId)
    .is("mark", null)
    .order("label")
    .limit(READ_BATCH);
  const list = (pending ?? []) as Pick<DogRow, "id" | "label" | "crops">[];
  const ws = String(walk.workspace_id);
  await Promise.all(
    list.map(async (d) => {
      const crops = (d.crops ?? []).filter((c) => (c as { kind?: string }).kind !== "ear").slice(0, 3);
      if (!crops.length) {
        await db().from("dogs").update({ mark: { skipped: true }, mark_status: "unknown", mark_kind: "unknown" }).eq("id", d.id);
        return;
      }
      // Images go to the models inline: a file uploaded a moment ago can't always be fetched by URL yet.
      const bytes = await Promise.all(crops.map((c) => getBytes(c.path)));
      const urls = bytes.map(jpegDataUrl);
      // SAM finds an ear on each of the two best close-ups, enlarged so a tag or notch can be read.
      const ears: { path: string; t: number; kind: "ear" }[] = [];
      const earUrls: string[] = [];
      const earBytes: Buffer[] = [];
      for (const [k, c] of crops.slice(0, 2).entries()) {
        try {
          const zoom = await earZoom(bytes[k]);
          await logUsage({ workspace_id: ws, walk_id: walkId, model: "sam-3.1", units: 1, unit: "images", cost_usd: zoom.cost, stage: "Find the ears", calls: 1, seconds: zoom.ms / 1000 });
          if (!zoom.ear) continue;
          const path = `${walkId}/crops/${d.id}-ear${k}.jpg`;
          earUrls.push(jpegDataUrl(zoom.ear));
          earBytes.push(zoom.ear);
          const { error } = await db().storage.from("walks").upload(path, zoom.ear, { upsert: true, contentType: "image/jpeg" });
          if (!error) ears.push({ path, t: c.t, kind: "ear" });
        } catch {
          /* no ear zoom for this close-up; the reading uses the close-ups alone */
        }
      }
      try {
        const { value, usage, ms } = await readMarks(urls, earUrls);
        // Second opinion: SAM 3.1 looks for the mark itself. If the two models disagree, the dog is can't tell.
        const types = ((walk.mark_types as string[]) ?? []).filter((k): k is "collar" | "ear_tag" => k === "collar" || k === "ear_tag");
        if (walk.target_mark !== "sterilization" && types.length) {
          const second: NonNullable<MarkReading["second"]> = {};
          for (const k of types) {
            try {
              const image = k === "ear_tag" && earBytes.length ? earBytes[0] : bytes[0];
              const look = await lookFor(SECOND_OPINION[k]!, image);
              second[k] = { found: look.found, conf: look.conf };
              await logUsage({ workspace_id: ws, walk_id: walkId, model: "sam-3.1", units: 1, unit: "images", cost_usd: look.cost, stage: "Second opinion on marks", calls: 1, seconds: look.ms / 1000 });
            } catch {
              /* without a second opinion the reading stands on its own */
            }
          }
          (value as MarkReading).second = second;
        }
        const cls = classify(value, walk.target_mark as "vaccination" | "sterilization", (walk.mark_types as string[]) ?? ["paint"]);
        await db()
          .from("dogs")
          .update({ mark: value, mark_status: cls.status, mark_kind: cls.kind, reading_ms: ms, crops: [...crops, ...ears], ear_crop_path: ears[0]?.path ?? null })
          .eq("id", d.id);
        await logUsage({
          workspace_id: ws,
          walk_id: walkId,
          model: MARK_MODEL,
          units: (usage?.input_tokens ?? 0) + (usage?.output_tokens ?? 0),
          unit: "tokens",
          cost_usd: sparkCost(usage),
          stage: "Read every mark",
          calls: 1,
          seconds: ms / 1000,
        });
      } catch (e) {
        await db().from("dogs").update({ mark: { error: String(e).slice(0, 300) }, mark_status: "unknown", mark_kind: "unknown" }).eq("id", d.id);
      }
    }),
  );
  const { count } = await db().from("dogs").select("id", { count: "exact", head: true }).eq("walk_id", walkId).is("mark", null);
  if (!count) {
    await checkRepeats(walkId, (row) => logUsage({ workspace_id: ws, walk_id: walkId, ...row })).catch(() => {});
    await finish(walkId, String(walk.target_mark));
  }
}


export const statsFrom = (dogs: StatDog[], target: string) => walkStats(dogs, target);

async function finish(walkId: string, target: string) {
  const { data: dogs } = await db().from("dogs").select("mark_status, review_status, same_as, mark").eq("walk_id", walkId);
  const stats = statsFrom((dogs ?? []) as StatDog[], target);
  const needsReview = (dogs ?? []).some((d) => !d.same_as && (d.review_status ?? d.mark_status) === "unknown");
  await db()
    .from("walks")
    .update({ status: needsReview ? "review" : "done", stats, progress: { stage: needsReview ? "review" : "done" } })
    .eq("id", walkId);
}

export async function reviewDog(walkId: string, dogId: string, status: string) {
  await db().from("dogs").update({ review_status: status }).eq("id", dogId).eq("walk_id", walkId);
  const { data: walk } = await db().from("walks").select("target_mark").eq("id", walkId).single();
  await finish(walkId, String(walk?.target_mark ?? "vaccination"));
}

/**
 * Remove a walk for good: its files in storage (pieces, SAM output, close-ups) and its rows.
 * Chunks, dogs and usage go with the walk row by cascade.
 */
export async function deleteWalk(walkId: string) {
  if (isSample(walkId)) throw new UserError("Sample surveys can’t be deleted.");
  const bucket = db().storage.from("walks");
  const files: string[] = [];
  const walkDir = async (dir: string) => {
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await bucket.list(dir, { limit: 1000, offset });
      if (error) throw new Error(`Listing ${dir} failed: ${error.message}`);
      for (const f of data ?? []) {
        // Folders come back without an id.
        if (f.id) files.push(`${dir}/${f.name}`);
        else await walkDir(`${dir}/${f.name}`);
      }
      if (!data || data.length < 1000) break;
    }
  };
  await walkDir(walkId);
  for (let i = 0; i < files.length; i += 500) {
    const { error } = await bucket.remove(files.slice(i, i + 500));
    if (error) throw new Error(`Removing files failed: ${error.message}`);
  }
  const { error } = await db().from("walks").delete().eq("id", walkId);
  if (error) throw new Error(`Deleting the walk failed: ${error.message}`);
  return { files: files.length };
}

export async function state(walkId: string) {
  const [{ data: walk }, { data: chunks }, { data: dogs }, { data: usage }] = await Promise.all([
    db().from("walks").select("*").eq("id", walkId).single(),
    db().from("chunks").select("idx, start_s, end_s, status, frames, objects, error, submitted_at, completed_at, tracks_path, people_path").eq("walk_id", walkId).order("idx"),
    db()
      .from("dogs")
      .select("id, label, first_s, last_s, frames, mean_conf, segments, samples, crops, best_crop, mark, mark_status, mark_kind, review_status, review_note, same_as, reading_ms")
      .eq("walk_id", walkId)
      .order("label"),
    db().from("usage_log").select("stage, model, units, unit, calls, seconds, cost_usd").eq("walk_id", walkId).order("id"),
  ]);
  // Possible repeats a model couldn't settle; both dogs stay counted.
  const ids = (dogs ?? []).map((d) => d.id as string);
  const { data: matches } = ids.length
    ? await db().from("matches").select("dog_a, dog_b, verdict, reason").in("dog_b", ids)
    : { data: [] as { dog_a: string; dog_b: string; verdict: string; reason: string }[] };
  return { walk, chunks: chunks ?? [], dogs: dogs ?? [], usage: usage ?? [], repeats: matches ?? [] };
}

/**
 * URLs the browser needs to show a walk: chunk videos, SAM text, dog crops. Sample surveys
 * point at their copies on the site's CDN; any other walk gets short-lived links, signed in one request.
 */
export async function mediaUrls(walkId: string, s?: Awaited<ReturnType<typeof state>>) {
  const { chunks, dogs } = s ?? (await state(walkId));
  const want = chunks.map((c) => {
    const pad = String(c.idx).padStart(3, "0");
    return { idx: c.idx, video: `${walkId}/chunks/${pad}.mp4`, sam: c.status === "done" ? `${walkId}/sam/${pad}.txt` : null, people: (c.people_path as string) || null };
  });
  const dogPaths = dogs.map((d) => {
    const all = (d.crops ?? []) as { path: string; kind?: string }[];
    return { id: d.id as string, body: all.filter((c) => c.kind !== "ear").slice(0, 3).map((c) => c.path), ear: all.filter((c) => c.kind === "ear").slice(0, 2).map((c) => c.path) };
  });
  const paths = [...want.flatMap((c) => [c.video, c.sam, c.people]), ...dogPaths.flatMap((d) => [...d.body, ...d.ear])].filter((p): p is string => !!p);
  const urls = isSample(walkId) ? new Map(paths.map((p) => [p, `/m/${p}`])) : await signedReadUrls(paths, 3600);
  const url = (p: string | null) => (p ? (urls.get(p) ?? null) : null);
  const crops: Record<string, string[]> = {};
  const ears: Record<string, string[]> = {};
  for (const d of dogPaths) {
    crops[d.id] = d.body.map(url).filter((u): u is string => !!u);
    ears[d.id] = d.ear.map(url).filter((u): u is string => !!u);
  }
  return { chunks: want.map((c) => ({ idx: c.idx, video: url(c.video), sam: url(c.sam), people: url(c.people) })), crops, ears };
}
