/**
 * Download a Source document an Answer cited, from NRC Find.
 *
 * NRC Find's credential stays server-side, so the browser can't fetch the
 * file itself: this route fetches it for a signed-in user who may use the
 * CLEAR Agent (the same checks as a turn). The file is always sent as an
 * attachment of unknown type, so a document can never run as a page on
 * CLEAR's origin.
 */

import { canReadContent } from "~/lib/roles";
import { fileNameOf } from "~/server/agent/source-file-name";
import { readAgentFlags } from "~/server/agent/flag";
import { NRC_FIND_FILE_ID, nrcFindConfig } from "~/server/agent/nrc-find-tool";
import { getSessionUser } from "~/server/session";

const DOWNLOAD_TIMEOUT_MS = 60_000;

export async function GET(req: Request, { params }: { params: Promise<{ fileId: string }> }): Promise<Response> {
  const cookie = req.headers.get("cookie");
  const session = await getSessionUser(cookie);
  if (session.status === "unavailable") {
    return Response.json({ error: "Auth service unavailable." }, { status: 503 });
  }
  if (session.status === "unauthenticated" || !cookie) {
    return Response.json({ error: "Not authenticated." }, { status: 401 });
  }
  if (!canReadContent(session.user.role)) {
    return Response.json({ error: "Your account is awaiting admin approval." }, { status: 403 });
  }
  if (!(await readAgentFlags(cookie)).agent) {
    return Response.json({ error: "The CLEAR Agent is turned off.", code: "AGENT_DISABLED" }, { status: 404 });
  }

  const { fileId } = await params;
  if (!NRC_FIND_FILE_ID.test(fileId)) {
    return Response.json({ error: "Not a Source document id." }, { status: 400 });
  }
  const config = nrcFindConfig();
  if (!config.token) {
    return Response.json({ error: "NRC Find is not configured on this server." }, { status: 503 });
  }

  // The timeout covers reaching NRC Find, not the download: once headers
  // arrive it is cleared, so a large file on a slow link isn't cut off.
  const connect = new AbortController();
  const timer = setTimeout(() => connect.abort(new DOMException("timeout", "TimeoutError")), DOWNLOAD_TIMEOUT_MS);
  let upstream: Response;
  try {
    upstream = await fetch(`${config.url}/api/v1/common/files/${fileId}`, {
      headers: { "X-App-Authorization": config.token },
      signal: AbortSignal.any([req.signal, connect.signal]),
    });
  } catch (err) {
    console.warn("[agent] source download: NRC Find unreachable", (err as Error).name);
    return Response.json({ error: "NRC Find is unreachable." }, { status: 502 });
  } finally {
    clearTimeout(timer);
  }
  if (upstream.status === 404) {
    await upstream.body?.cancel();
    return Response.json({ error: "NRC Find no longer has this document." }, { status: 404 });
  }
  if (!upstream.ok || !upstream.body) {
    await upstream.body?.cancel();
    console.warn(`[agent] source download: NRC Find returned ${upstream.status}`);
    return Response.json({ error: `NRC Find returned ${upstream.status}.` }, { status: 502 });
  }

  const name = fileNameOf(upstream.headers.get("content-disposition"), fileId);
  const ascii = name.replace(/[^\x20-\x7e]|["\\]/g, "_");
  // fetch decodes a compressed body but keeps the compressed length; only a
  // plain body's length is still true.
  const length = upstream.headers.get("content-encoding") ? null : upstream.headers.get("content-length");
  return new Response(upstream.body, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
      ...(length ? { "Content-Length": length } : {}),
    },
  });
}
