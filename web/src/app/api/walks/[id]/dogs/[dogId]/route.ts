import { z } from "zod";
import { ownsWalk, workspaceFrom } from "@/lib/server/auth";
import { fail, handle, json } from "@/lib/server/http";
import { reviewDog, state } from "@/lib/server/walks";

export const runtime = "nodejs";

const Body = z.object({ status: z.enum(["marked", "unmarked", "unknown", "not_a_dog", "duplicate"]) });

/** A person’s call on one dog overrides the model’s reading. */
export const PATCH = handle(async (req: Request, ctx: { params: Promise<{ id: string; dogId: string }> }) => {
  const { id, dogId } = await ctx.params;
  const ws = await workspaceFrom(req);
  if (!(await ownsWalk(id, ws))) return fail("Only the workspace that recorded this walk can review it.", 403);
  const { status } = Body.parse(await req.json());
  await reviewDog(id, dogId, status);
  return json(await state(id));
});
