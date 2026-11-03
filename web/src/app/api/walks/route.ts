import { z } from "zod";
import { workspaceFrom } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { fail, handle, json } from "@/lib/server/http";
import { createWalk } from "@/lib/server/walks";

export const runtime = "nodejs";

const LIST_FIELDS = "id, title, area_name, mode, target_mark, status, duration_s, recorded_at, created_at, stats, workspace_id";

export const GET = handle(async (req: Request) => {
  const ws = await workspaceFrom(req);
  const { data: demo } = await db().from("workspaces").select("id").eq("is_demo", true);
  const demoIds = (demo ?? []).map((d) => d.id);
  const [{ data: mine }, { data: samples }] = await Promise.all([
    ws
      ? db().from("walks").select(LIST_FIELDS).eq("workspace_id", ws.id).order("created_at", { ascending: false }).limit(50)
      : Promise.resolve({ data: [] as unknown[] }),
    demoIds.length
      ? db().from("walks").select(LIST_FIELDS).in("workspace_id", demoIds).in("status", ["done", "review"]).order("created_at", { ascending: false }).limit(12)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);
  return json({ mine: mine ?? [], samples: samples ?? [] });
});

const CreateWalk = z.object({
  mode: z.enum(["plan", "check"]),
  title: z.string().max(120).optional(),
  areaName: z.string().max(120).optional(),
  country: z.string().trim().max(60).optional(),
  targetMark: z.enum(["vaccination", "sterilization"]).optional(),
  markTypes: z.array(z.enum(["paint", "collar", "ear_tag"])).max(3).optional(),
  recordedAt: z.string().datetime().nullable().optional(),
  durationS: z.number().positive().max(20 * 60),
  srcWidth: z.number().int().positive(),
  srcHeight: z.number().int().positive(),
  srcFps: z.number().positive().nullable().optional(),
  sourceName: z.string().max(200).optional(),
  procFps: z.number().min(2).max(10).optional(),
  // Recorded in Seventy: where the phone was, [seconds into the video, lat, lon, accuracy in metres].
  route: z
    .object({ points: z.array(z.tuple([z.number().min(0), z.number().min(-90).max(90), z.number().min(-180).max(180), z.number().min(0)])).max(5000) })
    .nullable()
    .optional(),
});

export const POST = handle(async (req: Request) => {
  const ws = await workspaceFrom(req);
  if (!ws) return fail("Open the app once to create a workspace, then try again.", 401);
  const body = CreateWalk.parse(await req.json());
  const created = await createWalk(ws, body);
  return json(created, 201);
});
