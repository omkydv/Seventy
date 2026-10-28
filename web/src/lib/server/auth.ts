import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "./db";

export const WORKSPACE_HEADER = "x-seventy-workspace";

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function createWorkspace(name?: string) {
  const token = randomBytes(24).toString("base64url");
  const { data, error } = await db()
    .from("workspaces")
    .insert({ token_hash: hash(token), name: name ?? null })
    .select("id")
    .single();
  if (error || !data) throw new Error(`Could not create workspace: ${error?.message}`);
  return { id: data.id as string, token };
}

export type Workspace = { id: string; isDemo: boolean };

/** Resolve the caller's workspace from the `id.token` header, or null. */
export async function workspaceFrom(req: Request): Promise<Workspace | null> {
  const raw = req.headers.get(WORKSPACE_HEADER);
  if (!raw) return null;
  const dot = raw.indexOf(".");
  if (dot < 1) return null;
  const id = raw.slice(0, dot);
  const token = raw.slice(dot + 1);
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await db().from("workspaces").select("id, token_hash, is_demo").eq("id", id).maybeSingle();
  if (!data) return null;
  const a = Buffer.from(String(data.token_hash), "hex");
  const b = Buffer.from(hash(token), "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return { id: data.id as string, isDemo: Boolean(data.is_demo) };
}

/** A walk can be read by its workspace, or by anyone if it belongs to the demo workspace or is public. */
export async function canReadWalk(walkId: string, ws: Workspace | null): Promise<boolean> {
  const { data } = await db()
    .from("walks")
    .select("workspace_id, is_public, workspaces!inner(is_demo)")
    .eq("id", walkId)
    .maybeSingle();
  if (!data) return false;
  const demo = (data as unknown as { workspaces: { is_demo: boolean } }).workspaces?.is_demo;
  return Boolean(data.is_public || demo || (ws && ws.id === data.workspace_id));
}

export async function ownsWalk(walkId: string, ws: Workspace | null): Promise<boolean> {
  if (!ws) return false;
  const { data } = await db().from("walks").select("workspace_id").eq("id", walkId).maybeSingle();
  return Boolean(data && data.workspace_id === ws.id);
}
