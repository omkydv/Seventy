import { z } from "zod";
import { ownsWalk, workspaceFrom } from "@/lib/server/auth";
import { fail, handle, json } from "@/lib/server/http";
import { cropUploadUrls, registerCrops } from "@/lib/server/walks";

export const runtime = "nodejs";

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("urls"),
    items: z.array(z.object({ dogId: z.string().uuid(), n: z.number().int().min(0).max(5) })).max(400),
  }),
  z.object({
    action: z.literal("done"),
    crops: z
      .array(
        z.object({
          dogId: z.string().uuid(),
          path: z.string().max(300),
          t: z.number(),
          sharpness: z.number().optional(),
        }),
      )
      .max(400),
  }),
]);

export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const ws = await workspaceFrom(req);
  if (!(await ownsWalk(id, ws))) return fail("Only the workspace that recorded this walk can add close-ups.", 403);
  const body = Body.parse(await req.json());
  if (body.action === "urls") return json({ uploads: await cropUploadUrls(id, body.items) });
  if (body.crops.some((c) => !c.path.startsWith(`${id}/crops/`))) return fail("Close-ups must be stored under this walk.");
  await registerCrops(id, body.crops);
  return json({ ok: true });
});
