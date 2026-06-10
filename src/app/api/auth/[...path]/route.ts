import { type NextRequest, NextResponse } from "next/server";
import { API_URL } from "~/server/env";

/**
 * BFF proxy for Better Auth requests.
 * Forwards browser requests to the Apollo API server-to-server,
 * so the browser never makes cross-origin calls.
 */
async function handler(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;

  // Block open signup — users must be invited
  if (path.join("/") === "sign-up/email") {
    return NextResponse.json(
      { code: "SIGNUP_DISABLED", message: "Open signup is disabled. You must be invited." },
      { status: 403 },
    );
  }

  const upstream = `${API_URL.replace(/\/+$/, "")}/api/auth/${path.join("/")}`;

  // Forward query string if present
  const url = new URL(upstream);
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  // Forward relevant headers server-to-server. Omit "origin" so Better Auth's
  // trustedOrigins check sees the API's own origin (always trusted) rather than
  // the browser's localhost origin, which may not be in the staging allow-list.
  const headers = new Headers();
  for (const key of ["cookie", "content-type", "accept", "authorization", "referer"]) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }
  headers.set("origin", API_URL);

  const hasBody = request.method !== "GET" && request.method !== "HEAD";

  try {
    const res = await fetch(url.toString(), {
      method: request.method,
      headers,
      ...(hasBody && { body: request.body, duplex: "half" }),
    } as RequestInit);

    // Build the response, forwarding status, body, and Set-Cookie headers
    const responseHeaders = new Headers();
    res.headers.forEach((value, key) => {
      const skip = ["transfer-encoding", "connection", "keep-alive", "set-cookie"];
      if (!skip.includes(key.toLowerCase())) {
        responseHeaders.append(key, value);
      }
    });

    // Patch session cookies: add Max-Age if missing so iOS PWA doesn't clear them on app close
    const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
    const setCookies = res.headers.getSetCookie?.() ?? [];
    for (const cookie of setCookies) {
      const lower = cookie.toLowerCase();
      const hasExpiry = lower.includes("max-age=") || lower.includes("expires=");
      responseHeaders.append("set-cookie", hasExpiry ? cookie : `${cookie}; Max-Age=${SESSION_MAX_AGE}`);
    }

    return new NextResponse(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[auth-proxy]", request.method, url.toString(), message);
    return NextResponse.json(
      { message: "Auth proxy failed", code: "PROXY_ERROR" },
      { status: 500 },
    );
  }
}

export { handler as GET, handler as POST };
