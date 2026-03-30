/**
 * Proxy for uploading files to the clear-api S3 upload endpoint.
 * Forwards the multipart form data along with the user's session cookie.
 */

import { NextRequest, NextResponse } from "next/server";
import { API_URL } from "~/server/env";

export async function POST(req: NextRequest) {
  try {
    // Forward the entire request body (multipart) to clear-api
    const body = await req.arrayBuffer();

    const resp = await fetch(`${API_URL}/api/upload`, {
      method: "POST",
      headers: {
        "Content-Type": req.headers.get("Content-Type") ?? "multipart/form-data",
        Cookie: req.headers.get("Cookie") ?? "",
      },
      body,
    });

    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json({ error: text }, { status: resp.status });
    }

    const data = await resp.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Upload proxy failed" }, { status: 500 });
  }
}
