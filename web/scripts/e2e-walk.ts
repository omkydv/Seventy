/**
 * Run one walk through the live app's API end to end, as the browser would:
 * create a workspace and a walk, upload the piece, let SAM 3.1 track it, cut
 * close-ups, and poll until Muse Spark has read every dog. Prints what each step
 * produced. Needs the dev server running.
 *
 *   npx tsx scripts/e2e-walk.ts <video.mp4> [--base http://localhost:3070] [--mode check] [--marks paint]
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnv(file: string) {
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadEnv(path.join(__dirname, "..", ".env.local"));

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const BASE = arg("base", "http://localhost:3070");
const storage = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } }).storage.from("walks");
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let header = "";
async function api<T>(p: string, init: { method?: string; json?: unknown } = {}): Promise<T> {
  const res = await fetch(`${BASE}${p}`, {
    method: init.method ?? "GET",
    headers: { ...(header ? { "x-seventy-workspace": header } : {}), ...(init.json !== undefined ? { "Content-Type": "application/json" } : {}) },
    body: init.json !== undefined ? JSON.stringify(init.json) : undefined,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${p}: ${res.status} ${JSON.stringify(body).slice(0, 300)}`);
  return body as T;
}

function probe(file: string) {
  const out = execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration", "-of", "json", file]).toString();
  const j = JSON.parse(out);
  return { width: j.streams[0].width as number, height: j.streams[0].height as number, duration: Number(j.format.duration) };
}

type State = {
  walk: { id: string; status: string; stats: unknown; error: string | null };
  chunks: { idx: number; status: string; people_path?: string | null }[];
  dogs: { id: string; label: number; samples: { t: number; box: number[] }[]; crops: { path: string; kind?: string }[] | null; mark_status: string | null; same_as?: number | null; mark: { reason?: string; ear_tag?: { status: string } } | null }[];
  usage?: { stage: string; model: string; calls: number; cost_usd: number; seconds: number | null }[];
  repeats?: unknown[];
};

async function until(walkId: string, done: (s: State) => boolean, label: string) {
  const started = Date.now();
  for (;;) {
    const s = await api<State>(`/api/walks/${walkId}/advance`, { method: "POST" });
    if (done(s)) return s;
    if (s.walk.status === "failed") throw new Error(`walk failed: ${s.walk.error}`);
    if (Date.now() - started > 15 * 60 * 1000) throw new Error(`timed out waiting for ${label}`);
    await sleep(4000);
  }
}

async function main() {
  const video = process.argv[2];
  const work = mkdtempSync(path.join(tmpdir(), "seventy-e2e-"));
  const { width, height, duration } = probe(video);
  const t0 = Date.now();
  const stamp = () => `${((Date.now() - t0) / 1000).toFixed(0)} s`;

  const ws = await api<{ id: string; token: string }>("/api/workspace", { method: "POST" });
  header = `${ws.id}.${ws.token}`;
  const created = await api<{ walk: { id: string }; chunks: { idx: number; start: number; end: number }[]; uploads: { idx: number; path: string; token: string }[] }>("/api/walks", {
    method: "POST",
    json: { mode: arg("mode", "check"), title: "End-to-end test", markTypes: arg("marks", "paint").split(","), durationS: duration, srcWidth: width, srcHeight: height, procFps: 5 },
  });
  const walkId = created.walk.id;
  console.log(`[${stamp()}] walk ${walkId}, ${created.chunks.length} piece(s)`);

  for (const c of created.chunks) {
    const piece = path.join(work, `c${c.idx}.mp4`);
    execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", String(c.start), "-to", String(c.end), "-i", video, "-vf", "fps=5,scale='if(gt(iw,ih),960,-2)':'if(gt(iw,ih),-2,960)'", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-an", "-movflags", "+faststart", piece]);
    const ticket = created.uploads.find((u) => u.idx === c.idx)!;
    const { error } = await storage.uploadToSignedUrl(ticket.path, ticket.token, new Blob([readFileSync(piece)], { type: "video/mp4" }), { contentType: "video/mp4", upsert: true });
    if (error) throw error;
    await api(`/api/walks/${walkId}/chunks/${c.idx}`, { method: "POST" });
  }
  console.log(`[${stamp()}] pieces uploaded; SAM 3.1 is tracking dogs and people`);

  let s = await until(walkId, (x) => ["needs_crops", "done", "review"].includes(x.walk.status), "tracking");
  console.log(`[${stamp()}] tracking done: ${s.dogs.length} dogs`);

  if (s.walk.status === "needs_crops") {
    const items = s.dogs.flatMap((d) => d.samples.slice(0, 3).map((smp, n) => ({ d, smp, n })));
    const { uploads } = await api<{ uploads: { dogId: string; n: number; path: string; token: string }[] }>(`/api/walks/${walkId}/crops`, {
      method: "POST",
      json: { action: "urls", items: items.map((i) => ({ dogId: i.d.id, n: i.n })) },
    });
    const crops = [];
    for (const i of items) {
      const [l, t, r, b] = i.smp.box;
      const padW = (r - l) * 0.14;
      const padH = (b - t) * 0.14;
      const x = Math.max(0, Math.floor((l - padW) * width));
      const y = Math.max(0, Math.floor((t - padH) * height));
      const w = Math.min(width - x, Math.ceil((r - l + 2 * padW) * width));
      const h = Math.min(height - y, Math.ceil((b - t + 2 * padH) * height));
      const out = path.join(work, `${i.d.id}-${i.n}.jpg`);
      execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", String(i.smp.t), "-i", video, "-frames:v", "1", "-vf", `crop=${w}:${h}:${x}:${y}`, "-q:v", "3", out]);
      const ticket = uploads.find((u) => u.dogId === i.d.id && u.n === i.n)!;
      const { error } = await storage.uploadToSignedUrl(ticket.path, ticket.token, new Blob([readFileSync(out)], { type: "image/jpeg" }), { contentType: "image/jpeg", upsert: true });
      if (error) throw error;
      crops.push({ dogId: i.d.id, path: ticket.path, t: i.smp.t, sharpness: 100 });
    }
    await api(`/api/walks/${walkId}/crops`, { method: "POST", json: { action: "done", crops } });
    console.log(`[${stamp()}] ${crops.length} close-ups uploaded; Muse Spark is reading`);
    s = await until(walkId, (x) => ["done", "review"].includes(x.walk.status), "reading");
  }

  const full = await api<State>(`/api/walks/${walkId}?media=1`);
  console.log(`[${stamp()}] ${full.walk.status}: ${JSON.stringify(full.walk.stats)}`);
  for (const d of full.dogs) {
    const ears = (d.crops ?? []).filter((c) => c.kind === "ear").length;
    console.log(`  Dog ${d.label}: ${d.mark_status}${d.same_as ? `, same as Dog ${d.same_as}` : ""}, ${ears} ear zoom(s) | ${d.mark?.reason ?? ""}`);
  }
  console.log(`  people blur data: ${full.chunks.map((c) => (c.people_path ? "saved" : "missing")).join(", ")}`);
  console.log(`  possible repeats for a person: ${full.repeats?.length ?? 0}`);
  for (const u of full.usage ?? []) console.log(`  ${u.stage}: ${u.model}, $${u.cost_usd.toFixed(4)}${u.seconds != null ? `, ${u.seconds.toFixed(1)} s` : ""}`);
  console.log(`open ${BASE}/app/walks/${walkId}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
