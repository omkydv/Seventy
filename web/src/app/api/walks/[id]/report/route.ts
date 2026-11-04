import { canReadWalk, ownsWalk, workspaceFrom } from "@/lib/server/auth";
import { fail, handle, json, jsonShared } from "@/lib/server/http";
import { isSample } from "@/lib/server/samples";
import { latestReport, writeReport } from "@/lib/server/report";
import { checkBudget } from "@/lib/server/walks";

export const runtime = "nodejs";
export const maxDuration = 180;

export const GET = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  if (isSample(id)) return jsonShared({ report: await latestReport(id) });
  const ws = await workspaceFrom(req);
  if (!(await canReadWalk(id, ws))) return fail("That walk doesn’t exist, or it belongs to another workspace.", 404);
  return json({ report: await latestReport(id) });
});

/** Muse Wonder writes the program report, citing the rules it finds. */
export const POST = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const ws = await workspaceFrom(req);
  if (!(await ownsWalk(id, ws))) return fail("Only the workspace that recorded this walk can write its report.", 403);
  if (ws) await checkBudget(ws, 0.3);
  const { body } = await writeReport(id);
  return json({ report: body });
});
