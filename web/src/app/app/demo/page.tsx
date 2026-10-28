import { redirect } from "next/navigation";
import { db } from "@/lib/server/db";

export const dynamic = "force-dynamic";

/** The sample survey judges and visitors land on. */
export default async function DemoPage() {
  let target = "/app";
  try {
    const { data: demo } = await db().from("workspaces").select("id").eq("is_demo", true);
    const ids = (demo ?? []).map((d) => d.id);
    if (ids.length) {
      const { data } = await db()
        .from("walks")
        .select("id")
        .in("workspace_id", ids)
        .in("status", ["done", "review"])
        .order("created_at", { ascending: false })
        .limit(1);
      if (data?.[0]) target = `/app/walks/${data[0].id}`;
    }
  } catch {
    /* no database yet: fall back to the walk list */
  }
  redirect(target);
}
