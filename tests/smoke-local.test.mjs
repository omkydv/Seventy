// A fresh build with no settings, the way someone first meets it. Every sample survey
// has to open with its hand-checked dogs, the walk from the film has to have its map, and every
// sample walk's clip and picture have to be there.
//
//   cd web && npm ci && npm run build && cd .. && node --test tests/smoke-local.test.mjs
//
// Set SEVENTY_URL to check a copy that is already running, such as the Docker image.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

const WEB = join(dirname(fileURLToPath(import.meta.url)), "..", "web");
const samples = JSON.parse(readFileSync(join(WEB, "src/content/samples.json"), "utf8"));
const tryWalks = readFileSync(join(WEB, "src/lib/tryWalks.ts"), "utf8");
const PROMENADE_DOG = "4055a104-08ea-4651-a95c-41888266051d";
const PORT = "3099";

let base = process.env.SEVENTY_URL;
let server;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const getJson = async (path) => {
  const res = await fetch(base + path);
  assert.equal(res.status, 200, path);
  return res.json();
};

before(async () => {
  if (!base) {
    base = `http://localhost:${PORT}`;
    server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", PORT], {
      cwd: WEB,
      stdio: "ignore",
      env: {
        ...process.env,
        NODE_ENV: "production",
        MODEL_API_KEY: "",
        NEXT_PUBLIC_SUPABASE_URL: "",
        SUPABASE_SECRET_KEY: "",
        LOCAL_DATA_DIR: mkdtempSync(join(tmpdir(), "seventy-")),
      },
    });
  }
  for (let i = 0; i < 90; i++) {
    const up = await fetch(base + "/").then((r) => r.ok, () => false);
    if (up) return;
    await sleep(1000);
  }
  throw new Error(`Nothing answered at ${base}`);
});

after(() => server?.kill());

test("the main pages open", async () => {
  for (const path of ["/", "/app", "/app/demo", "/app/new"]) {
    const res = await fetch(base + path);
    assert.equal(res.status, 200, path);
  }
});

test("the four sample surveys hold the 28 dogs counted by hand", async () => {
  let total = 0;
  for (const s of samples.samples) {
    const { dogs } = await getJson(`/api/walks/${s.walk}`);
    assert.equal(dogs.length, s.hand, s.title);
    total += dogs.length;
  }
  assert.equal(samples.samples.length, 4);
  assert.equal(total, 28);
});

test("the promenade tag shows the reading and the person's review, both", async () => {
  const promenade = samples.samples.find((s) => s.slug === "seaside-promenade");
  const { dogs } = await getJson(`/api/walks/${promenade.walk}`);
  const dog = dogs.find((d) => d.id === PROMENADE_DOG);
  assert.equal(dog.mark_status, "unknown");
  assert.equal(dog.review_status, "marked");
  assert.ok(dog.review_note);
});

test("the walk from the film has its map, its report and its costs", async () => {
  const { walk, dogs } = await getJson(`/api/walks/${samples.filmWalk}`);
  assert.equal(dogs.length, 14);
  assert.ok(walk.route.points.length > 10);
  const { report } = await getJson(`/api/walks/${samples.filmWalk}/report`);
  assert.ok(report.headline);
});

test("a new walk on a copy with no key says how to add one", async () => {
  const ws = await (await fetch(`${base}/api/workspace`, { method: "POST" })).json();
  const res = await fetch(`${base}/api/walks`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-seventy-workspace": `${ws.id}.${ws.token}` },
    body: JSON.stringify({ mode: "plan", durationS: 6, srcWidth: 1280, srcHeight: 720 }),
  });
  assert.equal(res.status, 400);
  assert.match(await res.text(), /MODEL_API_KEY/);
});

test("sample media loads", async () => {
  for (const walk of [samples.samples[0].walk, samples.filmWalk]) {
    const res = await fetch(`${base}/m/${walk}/chunks/000.mp4`, { headers: { Range: "bytes=0-99" } });
    assert.ok(res.ok, walk);
    await res.body?.cancel();
  }
});

test("every sample walk has its clip and its picture", async () => {
  const files = [...tryWalks.matchAll(/file: "([^"]+)"/g)].map((m) => `/try/${m[1]}`);
  const thumbs = [...tryWalks.matchAll(/thumb: "([^"]+)"/g)].map((m) => m[1]);
  assert.ok(files.length >= 3);
  assert.equal(files.length, thumbs.length);
  for (const path of [...files, ...thumbs]) {
    const res = await fetch(base + path, { headers: { Range: "bytes=0-99" } });
    assert.ok(res.ok, path);
    await res.body?.cancel();
  }
});
