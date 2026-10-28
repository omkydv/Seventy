import { createWorkspace } from "@/lib/server/auth";
import { handle, json } from "@/lib/server/http";

export const runtime = "nodejs";

export const POST = handle(async () => {
  const ws = await createWorkspace();
  return json(ws, 201);
});
