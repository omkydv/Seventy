import { canReadWalk, ownsWalk, workspaceFrom } from "@/lib/server/auth";
import { fail, handle, json } from "@/lib/server/http";
import { latestReport, writeReport } from "@/lib/server/report";

export const runtime = "nodejs";
export const maxDuration = 180;

export const GET = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const ws = await workspaceFrom(req);
  if (!(await canReadWalk(id, ws))) return fail("That walk doesn’t exist, or it belongs to another workspace.", 404);
  return json({ report: await latestReport(id) });
});

/** Muse Wonder writes the program report, citing the rules it finds. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const ws = await workspaceFrom(req);
  if (!(await ownsWalk(id, ws))) return fail("Only the workspace that recorded this walk can write its report.", 403);
  const { body } = await writeReport(id);
  return json({ report: body });
});
