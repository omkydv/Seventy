import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

let client: SupabaseClient | null = null;

/** Service client. Bypasses row-level security, so it never leaves the server. */
export function db(): SupabaseClient {
  if (!client) {
    client = createClient(env.supabaseUrl, env.supabaseSecret, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

export const BUCKET = "walks";

export async function signedReadUrl(path: string, seconds = 60 * 60 * 6): Promise<string> {
  const { data, error } = await db().storage.from(BUCKET).createSignedUrl(path, seconds);
  if (error || !data) throw new Error(`Could not sign ${path}: ${error?.message}`);
  return data.signedUrl;
}

/** Sign many paths in one request; a path that can't be signed comes back null. */
export async function signedReadUrls(paths: string[], seconds = 60 * 60 * 6): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>(paths.map((p) => [p, null]));
  if (!paths.length) return out;
  const { data, error } = await db().storage.from(BUCKET).createSignedUrls(paths, seconds);
  if (error || !data) throw new Error(`Could not sign ${paths.length} paths: ${error?.message}`);
  for (const r of data) if (r.path && r.signedUrl && !r.error) out.set(r.path, r.signedUrl);
  return out;
}

export async function signedUploadUrl(path: string): Promise<{ path: string; token: string; signedUrl: string }> {
  const { data, error } = await db().storage.from(BUCKET).createSignedUploadUrl(path, { upsert: true });
  if (error || !data) throw new Error(`Could not create upload URL for ${path}: ${error?.message}`);
  return data;
}

export async function putText(path: string, text: string, contentType = "application/json") {
  const { error } = await db()
    .storage.from(BUCKET)
    .upload(path, new Blob([text], { type: contentType }), { upsert: true, contentType });
  if (error) throw new Error(`Could not store ${path}: ${error.message}`);
}

export async function getText(path: string): Promise<string> {
  const { data, error } = await db().storage.from(BUCKET).download(path);
  if (error || !data) throw new Error(`Could not read ${path}: ${error?.message}`);
  return data.text();
}

export async function getBytes(path: string): Promise<Uint8Array> {
  const { data, error } = await db().storage.from(BUCKET).download(path);
  if (error || !data) throw new Error(`Could not read ${path}: ${error?.message}`);
  return new Uint8Array(await data.arrayBuffer());
}
