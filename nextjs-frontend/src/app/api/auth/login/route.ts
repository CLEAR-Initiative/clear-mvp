import { type NextRequest, NextResponse } from "next/server";

const DJANGO_API_URL =
  process.env.DJANGO_API_URL ?? "http://localhost:8000";

/**
 * Proxy login to Django and forward Set-Cookie headers back to the browser.
 * tRPC cannot forward Set-Cookie, so we use a direct API route for login.
 */
export async function POST(request: NextRequest) {
  const body: unknown = await request.json();

  const djangoRes = await fetch(
    `${DJANGO_API_URL}/users/api/auth/login/`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );

  const data: unknown = await djangoRes.json();
  const response = NextResponse.json(data, { status: djangoRes.status });

  // Forward Set-Cookie headers from Django to browser.
  // Strip Domain attribute so the cookie is set for the app's origin (not Django's).
  // Otherwise the browser won't send it with requests to our app.
  const setCookieHeaders = djangoRes.headers.getSetCookie();
  for (const cookie of setCookieHeaders) {
    const rewritten = cookie
      .split(";")
      .map((part) => part.trim())
      .filter((part) => !part.toLowerCase().startsWith("domain="))
      .join("; ");
    response.headers.append("Set-Cookie", rewritten);
  }

  return response;
}
