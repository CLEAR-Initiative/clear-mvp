import { type NextRequest, NextResponse } from "next/server";

/**
 * Middleware to protect routes that require authentication.
 * Redirects unauthenticated users to /auth/login.
 *
 * Checks for the Better Auth session cookie set by the clear-apollo backend.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require auth
  const publicPaths = ["/auth/login", "/auth/logout", "/api/"];
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check for Better Auth session cookie
  const sessionCookie = request.cookies.get("better-auth.session_token");

  if (!sessionCookie) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files and Next.js internals.
     */
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
