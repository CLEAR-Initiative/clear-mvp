import { type NextRequest, NextResponse } from "next/server";

const DJANGO_API_URL =
  process.env.DJANGO_API_URL ?? "http://localhost:8000";

/**
 * Proxy logout to Django, forwarding the session cookie,
 * then clear the sessionid cookie on the browser.
 */
export async function POST(request: NextRequest) {
  const cookieHeader = request.headers.get("cookie") ?? "";

  try {
    await fetch(`${DJANGO_API_URL}/users/api/auth/logout/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: cookieHeader,
      },
    });
  } catch {
    // Proceed to clear cookies even if Django is unreachable
  }

  const response = NextResponse.json({ success: true });

  // Clear session cookie
  response.cookies.set("sessionid", "", {
    maxAge: 0,
    path: "/",
  });

  return response;
}
