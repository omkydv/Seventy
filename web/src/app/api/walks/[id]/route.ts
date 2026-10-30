import { canReadWalk, workspaceFrom } from "@/lib/server/auth";
import { fail, handle, json } from "@/lib/server/http";
import { collectPeople, mediaUrls, state } from "@/lib/server/walks";

export const runtime = "nodejs";

export const GET = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const ws = await workspaceFrom(req);
  if (!(await canReadWalk(id, ws))) return fail("That walk doesn’t exist, or it belongs to another workspace.", 404);
  const url = new URL(req.url);
  // A walk can finish before its people job does; opening it saves the blur data that has arrived since.
  if (url.searchParams.get("media")) await collectPeople(id).catch(() => {});
  const [s, media] = await Promise.all([state(id), url.searchParams.get("media") ? mediaUrls(id) : Promise.resolve(null)]);
  const owner = Boolean(ws && s.walk && ws.id === s.walk.workspace_id);
  return json({ ...s, media, owner });
});
