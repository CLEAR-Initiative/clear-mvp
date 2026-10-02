/**
 * Better Auth session lookup for Route Handlers.
 *
 * `/api/*` is skipped by middleware (see `publicPaths` and the matcher in
 * src/middleware.ts), so any route handler that spends a server-side
 * credential must resolve the caller's session itself. tRPC does the same in
 * `enforceAuth` (src/server/api/trpc.ts).
 *
 * Fails closed: an unreachable auth backend is reported as `unavailable`, and
 * callers must refuse the request rather than let it through.
 */

import { API_URL } from "~/server/env";

const SESSION_TIMEOUT_MS = 5000;

export interface SessionUser {
  id: string;
  role: string;
}

export type SessionLookup =
  | { status: "authenticated"; user: SessionUser }
  | { status: "unauthenticated" }
  | { status: "unavailable" };

export async function getSessionUser(cookie: string | null): Promise<SessionLookup> {
  if (!cookie) return { status: "unauthenticated" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SESSION_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/auth/get-session`, {
      // Forward the full Cookie header so Better Auth can use its cookieCache.
      headers: { Cookie: cookie },
      signal: controller.signal,
    });
  } catch {
    return { status: "unavailable" };
  } finally {
    clearTimeout(timeout);
  }

  if (res.status === 401 || res.status === 403) return { status: "unauthenticated" };
  if (!res.ok) return { status: "unavailable" };

  let data: { session?: unknown; user?: { id?: unknown; role?: unknown } | null } | null;
  try {
    data = (await res.json()) as typeof data;
  } catch {
    return { status: "unavailable" };
  }

  // Better Auth returns `null` (or a null session/user) for an unknown cookie.
  if (!data?.session || !data.user || typeof data.user.id !== "string") {
    return { status: "unauthenticated" };
  }

  const role = typeof data.user.role === "string" ? data.user.role.toLowerCase() : "";
  return { status: "authenticated", user: { id: data.user.id, role } };
}
