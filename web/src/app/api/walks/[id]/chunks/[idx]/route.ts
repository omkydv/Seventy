import { ownsWalk, workspaceFrom } from "@/lib/server/auth";
import { fail, handle, json } from "@/lib/server/http";
import { submitChunk } from "@/lib/server/walks";

export const runtime = "nodejs";
export const maxDuration = 120;

/** The browser calls this after uploading a chunk; it starts SAM 3.1 tracking on it. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string; idx: string }> }) => {
  const { id, idx } = await ctx.params;
  const ws = await workspaceFrom(req);
  if (!(await ownsWalk(id, ws))) return fail("Only the workspace that recorded this walk can add to it.", 403);
  const n = Number(idx);
  if (!Number.isInteger(n) || n < 0) return fail("Chunk number must be a whole number.");
  const chunk = await submitChunk(id, n);
  return json({ ok: true, status: chunk.status });
});
