import { canReadWalk, ownsWalk, workspaceFrom } from "@/lib/server/auth";
import { fail, handle, json, jsonShared } from "@/lib/server/http";
import { isSample } from "@/lib/server/samples";
import { collectPeople, deleteWalk, mediaUrls, state } from "@/lib/server/walks";

export const runtime = "nodejs";

export const GET = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const withMedia = Boolean(new URL(req.url).searchParams.get("media"));
  // A sample survey reads the same for every visitor and is finished, so it skips the checks and is cached.
  if (isSample(id)) {
    const s = await state(id);
    return jsonShared({ ...s, media: withMedia ? await mediaUrls(id, s) : null, owner: false });
  }
  const ws = await workspaceFrom(req);
  if (!(await canReadWalk(id, ws))) return fail("That walk doesn’t exist, or it belongs to another workspace.", 404);
  // A walk can finish before its people job does; opening it saves the blur data that has arrived since.
  if (withMedia) await collectPeople(id).catch(() => {});
  const s = await state(id);
  const media = withMedia ? await mediaUrls(id, s) : null;
  const owner = Boolean(ws && s.walk && ws.id === s.walk.workspace_id);
  return json({ ...s, media, owner });
});

/** Delete one of your own surveys, with its files. Samples belong to everyone and stay. */
export const DELETE = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (isSample(id)) return fail("Sample surveys can’t be deleted.", 403);
  const ws = await workspaceFrom(req);
  if (!ws || ws.isDemo || !(await ownsWalk(id, ws))) return fail("That walk doesn’t exist, or it belongs to another workspace.", 404);
  return json({ deleted: id, ...(await deleteWalk(id)) });
});
