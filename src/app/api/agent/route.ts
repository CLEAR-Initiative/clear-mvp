/**
 * Proxy route for the NRC Find RAG API.
 *
 * Keeps the NRC Find client credential (`X-App-Authorization`) server-side and
 * streams the upstream NDJSON response straight back to the browser, so the
 * token is never exposed to the client.
 *
 * Upstream: POST {NRC_FIND_API_URL}/api/v1/rag/answers
 * Auth:     X-App-Authorization: <NRC_FIND_API_TOKEN>  (client_id "clear-platform")
 */

const NRC_FIND_API_URL = process.env.NRC_FIND_API_URL ?? "https://find.app.nrc-dev.no";
const NRC_FIND_API_TOKEN = process.env.NRC_FIND_API_TOKEN;

interface AgentRequestBody {
  prompt?: unknown;
}

export async function POST(req: Request): Promise<Response> {
  if (!NRC_FIND_API_TOKEN) {
    return Response.json(
      { error: "NRC_FIND_API_TOKEN is not configured on the server." },
      { status: 500 },
    );
  }

  let body: AgentRequestBody;
  try {
    body = (await req.json()) as AgentRequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt) {
    return Response.json({ error: "A non-empty `prompt` is required." }, { status: 400 });
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${NRC_FIND_API_URL}/api/v1/rag/answers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-App-Authorization": NRC_FIND_API_TOKEN,
      },
      body: JSON.stringify({
        prompt,
        search_kwargs: {},
        additional_file_list: [],
      }),
    });
  } catch (err) {
    return Response.json(
      { error: `Failed to reach NRC Find: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  if (!upstream.ok || !upstream.body) {
    const detail = await upstream.text().catch(() => "");
    return Response.json(
      { error: `NRC Find returned ${upstream.status}`, detail: detail.slice(0, 500) },
      { status: upstream.status === 401 ? 502 : upstream.status },
    );
  }

  // Stream the NDJSON body straight through to the client.
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
