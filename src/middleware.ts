import { type NextRequest, NextResponse } from "next/server";
import { isLocale, LOCALE_COOKIE } from "~/i18n/config";

const API_URL = process.env.API_URL ?? "http://localhost:4000";
const SESSION_VERIFY_TIMEOUT_MS = 3000;
const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Middleware to protect routes that require authentication.
 * Validates the Better Auth session by calling the auth backend,
 * and enforces role-based access for /admin routes.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require auth
  const publicPaths = ["/auth/login", "/auth/logout", "/auth/forgot-password", "/auth/reset-password", "/accept-invite", "/api/"];
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

  // Validate the session by calling the auth backend
  const session = await verifySession(sessionCookie.name, sessionCookie.value);

  if (!session) {
    return redirectToLogin(request, pathname);
  }

  // Server-side admin route protection
  if (pathname.startsWith("/admin") && session.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  const response = NextResponse.next();

  // Seed the locale cookie from the user's persisted language preference so
  // client components never need to trigger a router refresh to apply it.
  const cookieLang = request.cookies.get(LOCALE_COOKIE)?.value;
  if (isLocale(session.language) && session.language !== cookieLang) {
    response.cookies.set(LOCALE_COOKIE, session.language, {
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

async function verifySession(
  cookieName: string,
  cookieValue: string,
): Promise<{ role: string; language: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      SESSION_VERIFY_TIMEOUT_MS,
    );

    let res: Response;
    try {
      res = await fetch(`${API_URL}/api/auth/get-session`, {
        headers: { Cookie: `${cookieName}=${cookieValue}` },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) return null;

    const data = (await res.json()) as {
      session?: { id: string } | null;
      user?: { role?: string; language?: string } | null;
    };

    if (!data.session || !data.user) return null;

    return {
      role: data.user.role?.toLowerCase() ?? "viewer",
      language: data.user.language ?? "en",
    };
  } catch {
    return null;
  }
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files and Next.js internals.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|manifest.webmanifest|icons/|images/|api/).*)",
  ],
};
