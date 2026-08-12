import { type NextRequest, NextResponse } from "next/server";
import { API_URL } from "~/server/env";

/**
 * BFF proxy for USGS Seismic Signals GeoJSON.
 *
 * Browser stays same-origin (`/api/usgs/earthquakes`); this route forwards the
 * session cookie to clear-api `GET /api/usgs/earthquakes` (auth required).
 * Map client defaults to this path outside development. Optional override:
 * `NEXT_PUBLIC_USGS_EARTHQUAKES_URL` (plain env only).
 */
export async function GET(request: NextRequest) {
  const incoming = request.nextUrl.searchParams;
  const upstream = new URL(`${API_URL}/api/usgs/earthquakes`);
  for (const [key, value] of incoming.entries()) {
    upstream.searchParams.set(key, value);
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
    responseHeaders.set("x-usgs-earthquakes-source", "clear-api-bff");

    return new NextResponse(body, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error("[usgs-earthquakes-proxy]", err);
    return NextResponse.json(
      { error: "USGS earthquakes proxy failed" },
      { status: 502 },
    );
  }
}
