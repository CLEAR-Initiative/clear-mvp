import { type NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:4000";

/**
 * BFF proxy for GraphQL requests.
 * Forwards browser requests to the Apollo Server,
 * so the browser never makes cross-origin calls.
 */
export async function POST(request: NextRequest) {
  const headers = new Headers();
  for (const key of ["cookie", "content-type", "accept"]) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }

  try {
    const res = await fetch(`${API_URL}/graphql`, {
      method: "POST",
      headers,
      body: request.body,
      duplex: "half",
    } as RequestInit);

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
    console.error("[graphql-proxy]", err);
    return NextResponse.json(
      { error: "GraphQL proxy failed" },
      { status: 502 },
    );
  }
}
