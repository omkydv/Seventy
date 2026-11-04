"use client";

import { createClient } from "@supabase/supabase-js";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
let supabase: ReturnType<typeof createClient> | null = null;

/** Upload bytes straight to storage with a one-time signed token from our server. */
export async function uploadSigned(path: string, token: string, blob: Blob, contentType: string) {
  if (!URL_) {
    // Local mode: the app's own file route, signed with the same token.
    const res = await fetch(`/api/local-files/${path.split("/").map(encodeURIComponent).join("/")}?t=${token}`, { method: "PUT", headers: { "Content-Type": contentType }, body: blob });
    if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
    return;
  }
  supabase ??= createClient(URL_, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } });
  const { error } = await supabase.storage.from("walks").uploadToSignedUrl(path, token, blob, { contentType, upsert: true });
  if (error) throw new Error(`Upload failed: ${error.message}`);
}
