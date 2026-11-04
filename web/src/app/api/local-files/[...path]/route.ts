import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { LOCAL, localPath, signLocal } from "@/lib/server/local";

export const runtime = "nodejs";

const TYPES: Record<string, string> = { ".mp4": "video/mp4", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".txt": "text/plain; charset=utf-8", ".json": "application/json" };

/** Local mode's stand-in for signed storage links: files in .local-data, guarded by an HMAC of the path. */
async function open(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  if (!LOCAL) return { error: new Response("Not found", { status: 404 }) };
  const p = (await ctx.params).path.map(decodeURIComponent).join("/");
  if (new URL(req.url).searchParams.get("t") !== signLocal(p)) return { error: new Response("Bad link", { status: 403 }) };
  return { p, full: localPath(p) };
}

export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const o = await open(req, ctx);
  if (o.error) return o.error;
  if (!existsSync(/*turbopackIgnore: true*/ o.full)) return new Response("Not found", { status: 404 });
  const size = statSync(/*turbopackIgnore: true*/ o.full).size;
  const type = TYPES[path.extname(o.full).toLowerCase()] ?? "application/octet-stream";
  const range = req.headers.get("range")?.match(/bytes=(\d*)-(\d*)/);
  const buf = readFileSync(/*turbopackIgnore: true*/ o.full);
  if (range) {
    const start = range[1] ? Number(range[1]) : 0;
    const end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    return new Response(buf.subarray(start, end + 1), { status: 206, headers: { "Content-Type": type, "Content-Range": `bytes ${start}-${end}/${size}`, "Accept-Ranges": "bytes", "Content-Length": String(end - start + 1) } });
  }
  return new Response(buf, { headers: { "Content-Type": type, "Accept-Ranges": "bytes", "Content-Length": String(size) } });
}

export async function PUT(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const o = await open(req, ctx);
  if (o.error) return o.error;
  mkdirSync(/*turbopackIgnore: true*/ path.dirname(o.full), { recursive: true });
  writeFileSync(/*turbopackIgnore: true*/ o.full, Buffer.from(await req.arrayBuffer()));
  return Response.json({ path: o.p });
}
