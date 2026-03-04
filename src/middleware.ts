import { type NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:4000";
const SESSION_VERIFY_TIMEOUT_MS = 3000;

/**
 * Middleware to protect routes that require authentication.
 * Validates the Better Auth session by calling the auth backend,
 * and enforces role-based access for /admin routes.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require auth
  const publicPaths = ["/auth/login", "/auth/logout", "/api/"];
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get("better-auth.session_token");

  if (!sessionCookie) {
    return redirectToLogin(request, pathname);
  }

  // Validate the session by calling the auth backend
  const session = await verifySession(sessionCookie.value);

  if (!session) {
    return redirectToLogin(request, pathname);
  }

  // Server-side admin route protection
  if (pathname.startsWith("/admin") && session.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

function redirectToLogin(request: NextRequest, pathname: string) {
  const loginUrl = new URL("/auth/login", request.url);
  loginUrl.searchParams.set("callbackUrl", pathname);
  return NextResponse.redirect(loginUrl);
}

async function verifySession(
  cookieValue: string
): Promise<{ role: string } | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), SESSION_VERIFY_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(`${API_URL}/api/auth/get-session`, {
        headers: { Cookie: `better-auth.session_token=${cookieValue}` },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) return null;

    const data = (await res.json()) as {
      session?: { id: string } | null;
      user?: { role?: string } | null;
    };

    if (!data.session || !data.user) return null;

    return { role: data.user.role?.toLowerCase() ?? "viewer" };
  } catch {
    return null;
  }
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files and Next.js internals.
     */
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
