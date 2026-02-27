import { type NextRequest, NextResponse } from "next/server";

/**
 * Middleware to protect routes that require authentication.
 * Redirects unauthenticated users to /auth/login.
 *
 * For now this is a simple redirect based on the absence of a Django session cookie.
 * When Django is connected, the sessionid cookie will be present for logged-in users.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes that don't require auth
  const publicPaths = ["/auth/login", "/auth/logout", "/api/"];
  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Check for Django session cookie
  const sessionCookie = request.cookies.get("sessionid");

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
