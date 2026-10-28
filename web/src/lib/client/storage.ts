"use client";

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  { auth: { persistSession: false } },
);

/** Upload bytes straight to storage with a one-time signed token from our server. */
export async function uploadSigned(path: string, token: string, blob: Blob, contentType: string) {
  const { error } = await supabase.storage.from("walks").uploadToSignedUrl(path, token, blob, { contentType, upsert: true });
  if (error) throw new Error(`Upload failed: ${error.message}`);
}
