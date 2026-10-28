import "server-only";

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { UserError } from "./walks";

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

export function fail(message: string, status = 400) {
  return json({ error: message }, status);
}

/** Wrap a handler so expected errors read well and unexpected ones are logged, not leaked. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (e) {
      if (e instanceof UserError) return fail(e.message, 400);
      if (e instanceof ZodError) return fail("Some fields were missing or the wrong type.", 400);
      console.error(e);
      return fail("The server hit a problem with this request. It has been logged; try again in a moment.", 500);
    }
  };
}
