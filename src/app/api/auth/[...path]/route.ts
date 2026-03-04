import { type NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

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
  const upstream = `${API_URL}/api/auth/${path.join("/")}`;

  // Forward query string if present
  const url = new URL(upstream);
  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  // Build headers to forward — strip host so the upstream sees its own host.
  // Set origin to the API's own origin so Better Auth's trustedOrigins check passes
  // (this is a server-to-server call, not a browser cross-origin request).
  const headers = new Headers();
  for (const key of ["cookie", "content-type", "accept", "authorization"]) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }
  const apiOrigin = new URL(API_URL).origin;
  headers.set("origin", apiOrigin);

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
      const skip = ["transfer-encoding", "connection", "keep-alive"];
      if (!skip.includes(key.toLowerCase())) {
        responseHeaders.append(key, value);
      }
    });

    return new NextResponse(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[auth-proxy]", request.method, url.toString(), message);
    return NextResponse.json(
      { error: "Auth proxy failed" },
      { status: 502 },
    );
  }
}

export { handler as GET, handler as POST };
