import { type NextRequest, NextResponse } from "next/server";
import { API_URL } from "~/server/env";

/**
 * BFF proxy for LogIE Blockages GeoJSON.
 *
 * Browser stays same-origin (`/api/logie/blockages`); this route forwards the
 * session cookie to clear-api `GET /api/logie/blockages` (auth required).
 * Map client defaults to this path outside development. Optional override:
 * `NEXT_PUBLIC_LOGIE_BLOCKAGES_URL` (plain env only — Sensitive vars do not
 * inline into the client bundle at build time).
 */
export async function GET(request: NextRequest) {
  const incoming = request.nextUrl.searchParams;
  const upstream = new URL(`${API_URL}/api/logie/blockages`);
  for (const [key, value] of incoming.entries()) {
    upstream.searchParams.set(key, value);
  }
  if (!upstream.searchParams.has("iso3")) {
    upstream.searchParams.set("iso3", "SDN");
  }

  const headers = new Headers();
  for (const key of ["cookie", "accept", "authorization"]) {
    const value = request.headers.get(key);
    if (value) headers.set(key, value);
  }
  if (!headers.has("accept")) headers.set("accept", "application/json");

  try {
    const res = await fetch(upstream.toString(), {
      method: "GET",
      headers,
      cache: "no-store",
    });

    const body = await res.arrayBuffer();
    const responseHeaders = new Headers();
    const contentType = res.headers.get("content-type");
    if (contentType) responseHeaders.set("content-type", contentType);
    responseHeaders.set("cache-control", "private, max-age=60");
    responseHeaders.set("x-logie-blockages-source", "clear-api-bff");

    return new NextResponse(body, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error("[logie-blockages-proxy]", err);
    return NextResponse.json(
      { error: "Blockages proxy failed" },
      { status: 502 },
    );
  }
}
