import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const FIND_URL = "https://find.test";
const SESSION_URL = "http://localhost:4000/api/auth/get-session";

type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>;

function sessionResponse(role: string): Response {
  return Response.json({
    session: { id: "s1", userId: "u1", expiresAt: "2099-01-01T00:00:00Z" },
    user: { id: "u1", role },
  });
}

function agentRequest(cookie?: string): Request {
  return new Request("http://localhost:3000/api/agent", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: JSON.stringify({ prompt: "What is happening in Sudan?" }),
  });
}

let fetchMock: ReturnType<typeof vi.fn<Handler>>;

async function loadRoute() {
  // The route reads NRC_FIND_* at module load, so import after stubbing env.
  const mod = await import("./route");
  return mod.POST;
}

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NRC_FIND_API_URL", FIND_URL);
  vi.stubEnv("NRC_FIND_API_TOKEN", "find-secret");
  fetchMock = vi.fn<Handler>();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function upstreamCalls() {
  return fetchMock.mock.calls.filter(([url]) => url.startsWith(FIND_URL));
}

describe("POST /api/agent", () => {
  it("returns 401 without a session cookie and never calls NRC Find", async () => {
    const POST = await loadRoute();
    const res = await POST(agentRequest());

    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 401 when the cookie does not resolve to a session", async () => {
    fetchMock.mockImplementation(() => Response.json(null));
    const POST = await loadRoute();
    const res = await POST(agentRequest("better-auth.session_token=bogus"));

    expect(res.status).toBe(401);
    expect(upstreamCalls()).toHaveLength(0);
  });

  it("returns 503 (fail closed) when the auth backend is unreachable", async () => {
    fetchMock.mockImplementation(() => {
      throw new TypeError("fetch failed");
    });
    const POST = await loadRoute();
    const res = await POST(agentRequest("better-auth.session_token=abc"));

    expect(res.status).toBe(503);
    expect(upstreamCalls()).toHaveLength(0);
  });

  it("returns 403 for a pending user and never calls NRC Find", async () => {
    fetchMock.mockImplementation(() => sessionResponse("pending"));
    const POST = await loadRoute();
    const res = await POST(agentRequest("better-auth.session_token=abc"));

    expect(res.status).toBe(403);
    expect(upstreamCalls()).toHaveLength(0);
  });

  it("proxies an approved user's prompt to NRC Find with the server credential", async () => {
    fetchMock.mockImplementation((url) => {
      if (url === SESSION_URL) return sessionResponse("viewer");
      return new Response('{"answer":"ok"}\n', { status: 200 });
    });
    const POST = await loadRoute();
    const cookie = "better-auth.session_token=abc; better-auth.session_data=xyz";
    const res = await POST(agentRequest(cookie));

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/x-ndjson");
    expect(await res.text()).toBe('{"answer":"ok"}\n');

    const [sessionUrl, sessionInit] = fetchMock.mock.calls[0]!;
    expect(sessionUrl).toBe(SESSION_URL);
    expect(new Headers(sessionInit?.headers).get("Cookie")).toBe(cookie);

    const calls = upstreamCalls();
    expect(calls).toHaveLength(1);
    const [url, init] = calls[0]!;
    expect(url).toBe(`${FIND_URL}/api/v1/rag/answers`);
    expect(new Headers(init?.headers).get("X-App-Authorization")).toBe("find-secret");
    expect(JSON.parse(init?.body as string)).toMatchObject({
      prompt: "What is happening in Sudan?",
    });
  });
});
