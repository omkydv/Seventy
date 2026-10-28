import { ownsWalk, workspaceFrom } from "@/lib/server/auth";
import { db, signedUploadUrl } from "@/lib/server/db";
import { fail, handle, json } from "@/lib/server/http";

export const runtime = "nodejs";

/** Fresh upload URLs for chunks that haven't started tracking, so an interrupted upload can resume. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const ws = await workspaceFrom(req);
  if (!(await ownsWalk(id, ws))) return fail("Only the workspace that recorded this walk can upload to it.", 403);
  const { data: chunks } = await db().from("chunks").select("idx, storage_path, status").eq("walk_id", id).order("idx");
  const open = (chunks ?? []).filter((c) => c.status === "pending" || c.status === "uploaded");
  const uploads = await Promise.all(open.map(async (c) => ({ idx: c.idx, ...(await signedUploadUrl(c.storage_path)) })));
  return json({ uploads });
});
