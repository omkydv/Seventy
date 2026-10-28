import { canReadWalk, workspaceFrom } from "@/lib/server/auth";
import { fail, handle, json } from "@/lib/server/http";
import { advance } from "@/lib/server/walks";

export const runtime = "nodejs";
export const maxDuration = 120;

/** Poll target: checks SAM jobs, stitches tracks, reads the next batch of marks. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const ws = await workspaceFrom(req);
  if (!(await canReadWalk(id, ws))) return fail("That walk doesn’t exist, or it belongs to another workspace.", 404);
  return json(await advance(id));
});
