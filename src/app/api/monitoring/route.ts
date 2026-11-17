/**
 * Sentry tunnel: the browser SDK posts its error envelopes here
 * (`tunnel` in instrumentation-client.ts) and we forward them to GlitchTip.
 *
 * Ad blockers and work proxies block requests to error-tracking hosts. Those
 * are the same users whose map fails because api.mapbox.com is blocked, so
 * without the tunnel their failures never reach us. Same-origin requests to
 * /api/monitoring get through.
 *
 * Middleware skips `/api/*`, so this is public. It is not an open relay: it
 * only forwards envelopes addressed to our own DSN, to that DSN's host.
 */

const MAX_ENVELOPE_BYTES = 1024 * 1024;

/**
 * The GlitchTip envelope URL for an envelope whose header names `headerDsn`,
 * or null when that DSN is not ours.
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
  if (!/^\d+$/.test(projectId)) return null;
  return `${ours.protocol}//${ours.host}/api/${projectId}/envelope/`;
}

function headerDsn(body: Uint8Array): unknown {
  const newline = body.indexOf(0x0a);
  const firstLine = new TextDecoder().decode(newline === -1 ? body : body.subarray(0, newline));
  try {
    return (JSON.parse(firstLine) as { dsn?: unknown }).dsn;
  } catch {
    return undefined;
  }
}

export async function POST(request: Request): Promise<Response> {
  const body = new Uint8Array(await request.arrayBuffer());
  if (body.byteLength === 0 || body.byteLength > MAX_ENVELOPE_BYTES) {
    return new Response(null, { status: 413 });
  }

  const target = envelopeTarget(headerDsn(body), process.env.NEXT_PUBLIC_SENTRY_DSN);
  if (!target) return new Response(null, { status: 400 });

  try {
    const upstream = await fetch(target, {
      method: "POST",
      headers: { "Content-Type": "application/x-sentry-envelope" },
      body,
    });
    return new Response(null, { status: upstream.status });
  } catch {
    return new Response(null, { status: 502 });
  }
}
