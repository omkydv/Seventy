"use client";

const KEY = "seventy.workspace.v1";

type Stored = { id: string; token: string };

function read(): Stored | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}

let pending: Promise<Stored> | null = null;

/** The browser's workspace. Created on first use and kept in localStorage. */
export async function ensureWorkspace(): Promise<Stored> {
  const existing = read();
  if (existing) return existing;
  pending ??= fetch("/api/workspace", { method: "POST" })
    .then(async (r) => {
      if (!r.ok) throw new Error("Could not create a workspace. Check your connection and reload.");
      const ws = (await r.json()) as Stored;
      try {
        localStorage.setItem(KEY, JSON.stringify(ws));
      } catch {
        /* private mode: the workspace lasts for this tab only */
      }
      return ws;
    })
    .finally(() => {
      pending = null;
    });
  return pending;
}

export function workspaceHeader(): Record<string, string> {
  const ws = read();
  return ws ? { "x-seventy-workspace": `${ws.id}.${ws.token}` } : {};
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, ...rest } = init;
  const res = await fetch(path, {
    ...rest,
    headers: {
      ...workspaceHeader(),
      ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(rest.headers ?? {}),
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((body as { error?: string }).error ?? `Request failed (${res.status}).`, res.status);
  return body as T;
}
