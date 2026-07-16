import { type NextRequest, NextResponse } from "next/server";
import { isLocale, LOCALE_COOKIE } from "~/i18n/config";
import { isPlatformAdmin } from "~/lib/roles";

const API_URL = process.env.API_URL ?? "http://localhost:4000";
// 8s per attempt × 2 attempts = 16s total budget. Bumped from 3s after
// observing parallel middleware fan-out (1 page reload = multiple RSC
// + tRPC requests, each runs middleware) saturate the get-session path
// when Better Auth's cookieCache misses and falls through to Postgres.
// Even a slow ~700ms first call comfortably fits, and the eventual cookie-
// cache hit drops it to ~10ms — so the headroom is paid for by cold paths,
// not steady state.
const SESSION_VERIFY_TIMEOUT_MS = 8000;
const MAX_VERIFY_ATTEMPTS = 2;
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * verifySession returns a tri-state so middleware can distinguish
 *   - "unauthorized": cookie genuinely rejected by the backend → logout
 *   - "transient":    backend unreachable / 5xx after retries → fail-open
 *   - { ok: true }:   verified session
 *
 * Failing open on transient errors is deliberate: a backend deploy or DB
 * blip should not kick every signed-in user back to /auth/login.
 * Downstream resolvers still enforce auth via the cookie on every request,
 * so a fail-open here just means "don't preemptively log them out".
 */
type SessionResult =
  | { ok: true; role: string; language: string }
  | { ok: false; reason: "unauthorized" }
  | { ok: false; reason: "transient" };

/**
 * Middleware to protect routes that require authentication.
 * Validates the Better Auth session by calling the auth backend,
 * and enforces role-based access for /admin routes.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require auth. `/public/` covers the
  // shareable event link pages — those carry their own
  // (eventId, token) gate at the GraphQL layer and must work for
  // visitors with no CLEAR session at all.
  const publicPaths = [
    "/auth/login",
    "/auth/logout",
    "/auth/forgot-password",
    "/auth/reset-password",
    "/accept-invite",
    "/public/",
    "/api/",
  ];
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Better Auth uses __Secure- prefix when running on HTTPS
  const sessionCookie =
    request.cookies.get("__Secure-better-auth.session_token") ??
    request.cookies.get("better-auth.session_token");

  if (!sessionCookie) {
    return redirectToLogin(request, pathname);
  }

  // Forward the full Cookie header so Better Auth can use its in-cookie
  // session-data cache (configured in src/lib/auth.ts cookieCache). Forwarding
  // just the session_token forces every middleware call to hit the DB, which
  // is the root cause of timeout-driven logouts under load.
  const cookieHeader = request.headers.get("cookie") ?? "";
  const result = await verifySession(cookieHeader);

  if (!result.ok && result.reason === "unauthorized") {
    return redirectToLogin(request, pathname);
  }

  // Transient backend failure → let the request through. Downstream resolvers
  // enforce auth via the same cookie, so a real intruder still can't read data.
  if (!result.ok) {
    // result.reason === "transient"
    // Don't escalate to /admin without a verified role; bounce admins-only
    // paths to /dashboard so the page still loads instead of looping.
    if (pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // Server-side admin route protection
  if (pathname.startsWith("/admin") && !isPlatformAdmin(result.role)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const response = NextResponse.next();

  // Seed the locale cookie from the user's persisted language preference
  // ONLY if the cookie is missing. Once set, the cookie is the source of
  // truth - don't overwrite it on every request, as that would fight user
  // selections made via /api/locale (profile page language picker).
  const cookieLang = request.cookies.get(LOCALE_COOKIE)?.value;
  if (!cookieLang && isLocale(result.language)) {
    response.cookies.set(LOCALE_COOKIE, result.language, {
      path: "/",
      maxAge: LOCALE_COOKIE_MAX_AGE,
      sameSite: "lax",
    });
  }

  return response;
}

function redirectToLogin(request: NextRequest, pathname: string) {
  const loginUrl = new URL("/auth/login", request.url);
  loginUrl.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(loginUrl);
}

async function verifySession(cookieHeader: string): Promise<SessionResult> {
  let lastFailure: string | null = null;

  for (let attempt = 1; attempt <= MAX_VERIFY_ATTEMPTS; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        SESSION_VERIFY_TIMEOUT_MS,
      );

      let res: Response;
      try {
        res = await fetch(`${API_URL}/api/auth/get-session`, {
          headers: { Cookie: cookieHeader },
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      // Cookie really is bad — short-circuit, don't retry.
      if (res.status === 401 || res.status === 403) {
        return { ok: false, reason: "unauthorized" };
      }

      // 5xx / unexpected status — retry once, then fail open so a transient
      // backend issue doesn't log everyone out.
      if (!res.ok) {
        lastFailure = `status=${res.status}`;
        continue;
      }

      const data = (await res.json()) as {
        session?: { id: string } | null;
        user?: { role?: string; language?: string } | null;
      };

      // No session/user payload from the backend = cookie didn't resolve to a
      // valid session. Treat as unauthorized (not transient).
      if (!data.session || !data.user) {
        return { ok: false, reason: "unauthorized" };
      }

      return {
        ok: true,
        role: data.user.role?.toLowerCase() ?? "viewer",
        language: data.user.language ?? "en",
      };
    } catch (err) {
      // Abort/timeout or network error — retry.
      lastFailure = err instanceof Error ? err.message : String(err);
    }
  }

  console.warn(
    `[middleware] get-session failed after ${MAX_VERIFY_ATTEMPTS} attempts (${lastFailure}); failing open`,
  );
  return { ok: false, reason: "transient" };
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files and Next.js internals.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|manifest.webmanifest|icons/|images/|api/).*)",
  ],
};
