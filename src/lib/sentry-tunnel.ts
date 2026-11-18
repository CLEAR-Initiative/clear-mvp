// Kept out of src/app/api/monitoring/route.ts: a Next.js route file may only
// export route handlers and route config, and `next build` rejects anything else.

/**
 * The GlitchTip envelope URL for an envelope whose header names `headerDsn`,
 * or null when that DSN is not ours.
 *
 * The URL carries our DSN's public key as `sentry_key`. GlitchTip reads the
 * key from the query string or an X-Sentry-Auth header, never from the
 * envelope's own `dsn`, and answers 403 "Denied" without one. The browser SDK
 * leaves both off when it posts to a tunnel.
 */
export function envelopeTarget(headerDsn: unknown, ourDsn: string | undefined): string | null {
  if (!ourDsn || typeof headerDsn !== "string") return null;
  let ours: URL;
  let theirs: URL;
  try {
    ours = new URL(ourDsn);
    theirs = new URL(headerDsn);
  } catch {
    return null;
  }
  if (theirs.host !== ours.host || theirs.pathname !== ours.pathname) return null;
  const projectId = ours.pathname.replace(/^\/+|\/+$/g, "");
  if (!/^\d+$/.test(projectId) || !ours.username) return null;
  const query = new URLSearchParams({ sentry_key: ours.username, sentry_version: "7" });
  return `${ours.protocol}//${ours.host}/api/${projectId}/envelope/?${query}`;
}

/**
 * The request body, or null once it passes `maxBytes`. Reads in chunks and
 * stops at the cap, so an oversized upload never sits in memory whole. A
 * declared Content-Length over the cap is refused before reading anything.
 */
export async function readCapped(request: Request, maxBytes: number): Promise<Uint8Array<ArrayBuffer> | null> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) return null;
  if (!request.body) return new Uint8Array();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}
