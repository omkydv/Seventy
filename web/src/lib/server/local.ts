import "server-only";

import { createHmac, randomBytes, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import seed from "@/content/local-seed.json";

/**
 * Local mode: with no Supabase settings, Seventy keeps its data in `.local-data/` next to the
 * app, so it runs with nothing but a Meta Model API key. This is a small stand-in for the parts
 * of the Supabase client the app uses: table queries and one storage bucket.
 */
export const LOCAL = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY;

const DIR = process.env.LOCAL_DATA_DIR || path.join(process.cwd(), ".local-data");
const FILES = path.join(DIR, "files");
const DB_FILE = path.join(DIR, "db.json");

type Row = Record<string, unknown>;
type Tables = Record<string, Row[]>;

// Column defaults from supabase/migrations.
const DEFAULTS: Record<string, () => Row> = {
  workspaces: () => ({ is_demo: false }),
  walks: () => ({ proc_fps: 5, chunk_seconds: 60, overlap_seconds: 2, status: "created", progress: {}, is_public: false, target_mark: "vaccination", mark_types: ["paint"], country: "Not given", updated_at: new Date().toISOString() }),
  chunks: () => ({ status: "pending", attempts: 0 }),
  dogs: () => ({ segments: [], samples: [], crops: [] }),
  reports: () => ({ status: "pending" }),
  usage_log: () => ({ calls: 1 }),
};
// What goes when a row is deleted, as the schema's foreign keys cascade.
const CASCADE: Record<string, [string, string][]> = {
  walks: [["chunks", "walk_id"], ["dogs", "walk_id"], ["notes", "walk_id"], ["reports", "walk_id"], ["usage_log", "walk_id"]],
  dogs: [["matches", "dog_a"], ["matches", "dog_b"]],
};

const clone = <T>(v: T): T => (v === undefined ? v : JSON.parse(JSON.stringify(v)));

function tables(): Tables {
  const g = globalThis as { __seventyLocal?: Tables };
  if (!g.__seventyLocal) {
    mkdirSync(/*turbopackIgnore: true*/ FILES, { recursive: true });
    g.__seventyLocal = existsSync(/*turbopackIgnore: true*/ DB_FILE) ? JSON.parse(readFileSync(/*turbopackIgnore: true*/ DB_FILE, "utf8")) : (clone(seed) as unknown as Tables);
  }
  return g.__seventyLocal!;
}
const save = () => writeFileSync(/*turbopackIgnore: true*/ DB_FILE, JSON.stringify(tables()));
const rowsOf = (t: string) => (tables()[t] ??= []);

type Result = { data: unknown; error: { message: string } | null; count?: number | null };

class Query implements PromiseLike<Result> {
  private op: "select" | "insert" | "update" | "delete" = "select";
  private payload: unknown;
  private tests: ((r: Row) => boolean)[] = [];
  private joins: string[] = [];
  private sort: { col: string; asc: boolean } | null = null;
  private max: number | null = null;
  private one: "many" | "single" | "maybe" = "many";
  private returning = false;
  private counting = false;
  private headOnly = false;

  constructor(private table: string) {}

  select(cols = "*", opts: { count?: string; head?: boolean } = {}) {
    if (this.op === "select") {
      this.joins = [...cols.matchAll(/(\w+)!inner\(/g)].map((m) => m[1]);
      this.counting = Boolean(opts.count);
      this.headOnly = Boolean(opts.head);
    } else this.returning = true;
    return this;
  }
  insert(rows: Row | Row[]) {
    this.op = "insert";
    this.payload = rows;
    return this;
  }
  update(values: Row) {
    this.op = "update";
    this.payload = values;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  eq(c: string, v: unknown) {
    this.tests.push((r) => r[c] === v);
    return this;
  }
  neq(c: string, v: unknown) {
    this.tests.push((r) => r[c] !== v);
    return this;
  }
  in(c: string, vs: unknown[]) {
    this.tests.push((r) => vs.includes(r[c]));
    return this;
  }
  is(c: string, v: unknown) {
    this.tests.push((r) => (r[c] ?? null) === v);
    return this;
  }
  gte(c: string, v: unknown) {
    this.tests.push((r) => String(r[c] ?? "") >= String(v));
    return this;
  }
  match(o: Row) {
    for (const [k, v] of Object.entries(o)) this.eq(k, v);
    return this;
  }
  order(col: string, o: { ascending?: boolean } = {}) {
    this.sort = { col, asc: o.ascending !== false };
    return this;
  }
  limit(n: number) {
    this.max = n;
    return this;
  }
  single() {
    this.one = "single";
    return this;
  }
  maybeSingle() {
    this.one = "maybe";
    return this;
  }
  then<A = Result, B = never>(ok?: ((v: Result) => A | PromiseLike<A>) | null, bad?: ((e: unknown) => B | PromiseLike<B>) | null): PromiseLike<A | B> {
    return Promise.resolve()
      .then(() => this.run())
      .then(ok, bad);
  }

  private matching() {
    return rowsOf(this.table).filter((r) => this.tests.every((t) => t(r)));
  }

  private shape(rows: Row[]): Result {
    if (this.one === "single") return rows.length === 1 ? { data: rows[0], error: null } : { data: null, error: { message: `Expected one row in ${this.table}, found ${rows.length}` } };
    if (this.one === "maybe") return { data: rows[0] ?? null, error: null };
    return { data: rows, error: null };
  }

  private run(): Result {
    if (this.op === "insert") {
      const list = (Array.isArray(this.payload) ? this.payload : [this.payload]) as Row[];
      const table = rowsOf(this.table);
      const made = list.map((r) => {
        const id = this.table === "usage_log" ? table.reduce((n, x) => Math.max(n, Number(x.id) || 0), 0) + 1 : randomUUID();
        const row = { id, created_at: new Date().toISOString(), ...(DEFAULTS[this.table]?.() ?? {}), ...clone(r) };
        table.push(row);
        return row;
      });
      save();
      return this.returning ? this.shape(clone(made)) : { data: null, error: null };
    }
    if (this.op === "update") {
      const hit = this.matching();
      for (const r of hit) Object.assign(r, clone(this.payload as Row), this.table === "walks" ? { updated_at: new Date().toISOString() } : {});
      save();
      return this.returning ? this.shape(clone(hit)) : { data: null, error: null };
    }
    if (this.op === "delete") {
      const gone = (t: string, test: (r: Row) => boolean) => {
        const all = rowsOf(t);
        const out = all.filter(test);
        tables()[t] = all.filter((r) => !test(r));
        for (const [child, key] of CASCADE[t] ?? []) {
          const ids = new Set(out.map((r) => r.id));
          gone(child, (r) => ids.has(r[key]));
        }
      };
      gone(this.table, (r) => this.tests.every((t) => t(r)));
      save();
      return { data: null, error: null };
    }
    let rows = this.matching();
    for (const j of this.joins) {
      const key = `${j.replace(/s$/, "")}_id`;
      rows = rows
        .map((r) => {
          const other = rowsOf(j).find((x) => x.id === r[key]);
          return other ? { ...r, [j]: other } : null;
        })
        .filter((r): r is Row => r !== null);
    }
    if (this.sort) {
      const { col, asc } = this.sort;
      rows = [...rows].sort((a, b) => ((a[col] as number | string) > (b[col] as number | string) ? 1 : (a[col] as number | string) < (b[col] as number | string) ? -1 : 0) * (asc ? 1 : -1));
    }
    if (this.max != null) rows = rows.slice(0, this.max);
    const count = this.counting ? rows.length : null;
    if (this.headOnly) return { data: null, error: null, count };
    return { ...this.shape(clone(rows)), count };
  }
}

// ---------- storage: one bucket of files on disk, with signed links served by /api/local-files ----------
const SECRET_FILE = path.join(DIR, "secret");
function secret(): string {
  tables();
  if (!existsSync(/*turbopackIgnore: true*/ SECRET_FILE)) writeFileSync(/*turbopackIgnore: true*/ SECRET_FILE, randomBytes(24).toString("hex"));
  return readFileSync(/*turbopackIgnore: true*/ SECRET_FILE, "utf8");
}
export const signLocal = (p: string) => createHmac("sha256", secret()).update(p).digest("hex").slice(0, 32);
export const localUrl = (p: string) => `/api/local-files/${p.split("/").map(encodeURIComponent).join("/")}?t=${signLocal(p)}`;
export const localPath = (p: string) => {
  const full = path.resolve(FILES, p);
  if (!full.startsWith(path.resolve(FILES) + path.sep)) throw new Error("Path outside local storage");
  return full;
};

async function bytesOf(body: unknown): Promise<Buffer> {
  if (body instanceof Blob) return Buffer.from(await body.arrayBuffer());
  if (typeof body === "string") return Buffer.from(body);
  if (body instanceof ArrayBuffer) return Buffer.from(body);
  return Buffer.from(body as Uint8Array);
}

const bucket = {
  async upload(p: string, body: unknown) {
    const full = localPath(p);
    mkdirSync(/*turbopackIgnore: true*/ path.dirname(full), { recursive: true });
    writeFileSync(/*turbopackIgnore: true*/ full, await bytesOf(body));
    return { data: { path: p }, error: null };
  },
  async download(p: string) {
    const full = localPath(p);
    if (!existsSync(/*turbopackIgnore: true*/ full)) return { data: null, error: { message: `${p} not found` } };
    return { data: new Blob([readFileSync(/*turbopackIgnore: true*/ full)]), error: null };
  },
  async list(dir: string, o: { limit?: number; offset?: number } = {}) {
    const full = localPath(dir + "/x").slice(0, -2);
    if (!existsSync(/*turbopackIgnore: true*/ full)) return { data: [], error: null };
    const names = readdirSync(/*turbopackIgnore: true*/ full).sort();
    const items = names.map((name) => ({ name, id: statSync(/*turbopackIgnore: true*/ path.join(full, name)).isDirectory() ? null : name }));
    return { data: items.slice(o.offset ?? 0, (o.offset ?? 0) + (o.limit ?? 100)), error: null };
  },
  async remove(paths: string[]) {
    for (const p of paths) rmSync(/*turbopackIgnore: true*/ localPath(p), { force: true });
    return { data: [], error: null };
  },
  async createSignedUrl(p: string) {
    return existsSync(/*turbopackIgnore: true*/ localPath(p)) ? { data: { signedUrl: localUrl(p) }, error: null } : { data: null, error: { message: `${p} not found` } };
  },
  async createSignedUrls(paths: string[]) {
    return { data: paths.map((p) => (existsSync(/*turbopackIgnore: true*/ localPath(p)) ? { path: p, signedUrl: localUrl(p), error: null } : { path: p, signedUrl: "", error: "not found" })), error: null };
  },
  async createSignedUploadUrl(p: string) {
    return { data: { path: p, token: signLocal(p), signedUrl: localUrl(p) }, error: null };
  },
};

export const localClient = {
  from: (table: string) => new Query(table),
  storage: { from: () => bucket },
};
