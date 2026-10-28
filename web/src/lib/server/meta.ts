import "server-only";

import { env } from "./env";

/** Thin client for the Meta Model API (OpenAI-compatible Responses API). */

export type ResponseJob = {
  id: string;
  status: "queued" | "in_progress" | "completed" | "failed" | "incomplete" | "cancelled";
  output?: Array<{ type: string; content?: Array<{ type: string; text?: string }> }>;
  usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number };
  error?: { message?: string; code?: string } | null;
  incomplete_details?: { reason?: string } | null;
};

async function call<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  const res = await fetch(`${env.modelBase}${path}`, {
    ...rest,
    headers: {
      Authorization: `Bearer ${env.modelKey}`,
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(rest.headers ?? {}),
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) {
    throw new MetaApiError(res.status, text.slice(0, 800));
  }
  return JSON.parse(text) as T;
}

export class MetaApiError extends Error {
  constructor(
    public status: number,
    public body: string,
  ) {
    super(`Meta Model API ${status}: ${body}`);
  }
}

export function outputText(job: ResponseJob): string {
  let text = "";
  for (const item of job.output ?? []) {
    if (item.type !== "message") continue;
    for (const c of item.content ?? []) if (c.type === "output_text" || c.type === "text") text += c.text ?? "";
  }
  return text;
}

export function createResponse(body: Record<string, unknown>): Promise<ResponseJob> {
  return call<ResponseJob>("/responses", { method: "POST", json: body });
}

export function getResponse(id: string): Promise<ResponseJob> {
  return call<ResponseJob>(`/responses/${encodeURIComponent(id)}`, { method: "GET" });
}

/** Upload media to the Files API so a request can reference it by id. */
export async function uploadFile(bytes: Uint8Array, filename: string, mime: string): Promise<string> {
  const form = new FormData();
  form.append("purpose", "user_data");
  form.append("file", new Blob([bytes as BlobPart], { type: mime }), filename);
  const res = await call<{ id: string }>("/files", { method: "POST", body: form });
  return res.id;
}

/** Ask a model for JSON that matches a schema, and parse it. */
export async function structured<T>(opts: {
  model: string;
  instructions: string;
  content: Array<Record<string, unknown>>;
  schemaName: string;
  schema: Record<string, unknown>;
  effort?: "minimal" | "low" | "medium" | "high";
}): Promise<{ value: T; usage: ResponseJob["usage"]; ms: number }> {
  const started = Date.now();
  const job = await createResponse({
    model: opts.model,
    instructions: opts.instructions,
    input: [{ role: "user", content: opts.content }],
    reasoning: { effort: opts.effort ?? "low" },
    text: { format: { type: "json_schema", name: opts.schemaName, schema: opts.schema, strict: true } },
  });
  const text = outputText(job);
  return { value: JSON.parse(text) as T, usage: job.usage, ms: Date.now() - started };
}
