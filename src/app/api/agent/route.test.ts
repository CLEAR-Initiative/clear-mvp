// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createFakeClearApi,
  createScriptedModel,
  nrcFindResponse,
  parseUIMessageStream,
  type FakeClearApi,
  type ScriptedStep,
} from "~/server/agent/testing/fake-clear-api";

vi.mock("server-only", () => ({}));

const scripted = vi.hoisted(() => ({ model: undefined as unknown }));
// The configured id is a real, priced one; the model behind it is scripted.
vi.mock("~/server/agent/model", () => ({
  clearAgentModelId: () => "anthropic/claude-sonnet-5-5",
  resolveClearAgentModel: () => scripted.model,
}));

const FIND_URL = "https://find.test";
const SESSION_URL = "http://localhost:4000/api/auth/get-session";
const GRAPHQL_URL = "http://localhost:4000/graphql";
const ALICE = "better-auth.session_token=alice; better-auth.session_data=xyz";
const BOB = "better-auth.session_token=bob";

type Handler = (url: string, init?: RequestInit) => Response | Promise<Response>;

let fetchMock: ReturnType<typeof vi.fn<Handler>>;
let clearApi: FakeClearApi;
let roles: Record<string, string>;
let prompts: unknown[];

function useScript(steps: ScriptedStep[]) {
  const s = createScriptedModel(steps);
  scripted.model = s.model;
  prompts = s.prompts;
}

function agentRequest(cookie: string | undefined, body: unknown): Request {
  return new Request("http://localhost:3000/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify(body),
  });
}

function turn(threadId: string, text: string, id = `m-${text.length}-${Math.random()}`) {
  return { threadId, message: { id, role: "user", parts: [{ type: "text", text }] } };
}

async function loadRoute() {
  const mod = await import("./route");
  return mod.POST;
}

function findCalls() {
  return fetchMock.mock.calls.filter(([url]) => url.startsWith(FIND_URL));
}

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("NRC_FIND_API_URL", FIND_URL);
  vi.stubEnv("NRC_FIND_API_TOKEN", "find-secret");
  clearApi = createFakeClearApi({ alice: "u-alice", bob: "u-bob" });
  roles = { alice: "viewer", bob: "analyst" };
  useScript([]);
  fetchMock = vi.fn<Handler>((url, init) => {
    if (url === SESSION_URL) {
      const token = new Headers(init?.headers).get("cookie")?.match(/session_token=([^;]+)/)?.[1];
      const role = token ? roles[token] : undefined;
      if (!role) return Response.json(null);
      return Response.json({
        session: { id: "s1", userId: `u-${token}`, expiresAt: "2099-01-01T00:00:00Z" },
        user: { id: `u-${token}`, role },
      });
    }
    if (url === GRAPHQL_URL) return clearApi.handle(init);
    if (url.startsWith(FIND_URL)) {
      return nrcFindResponse("Access is restricted in North Darfur.", [
        { title: "Darfur access report", content: "Roads closed since June." },
      ]);
    }
    throw new Error(`unexpected fetch ${url}`);
  });
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/agent — access", () => {
  it("returns 401 without a session cookie and calls nothing", async () => {
    const POST = await loadRoute();
    const res = await POST(agentRequest(undefined, turn("t1", "Hi")));
    expect(res.status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 401 when the cookie does not resolve to a session", async () => {
    const POST = await loadRoute();
    const res = await POST(agentRequest("better-auth.session_token=bogus", turn("t1", "Hi")));
    expect(res.status).toBe(401);
    expect(findCalls()).toHaveLength(0);
    expect(clearApi.calls).toHaveLength(0);
  });

  it("returns 503 (fail closed) when the auth backend is unreachable", async () => {
    fetchMock.mockImplementation(() => {
      throw new TypeError("fetch failed");
    });
    const POST = await loadRoute();
    const res = await POST(agentRequest(ALICE, turn("t1", "Hi")));
    expect(res.status).toBe(503);
  });

  it("returns 403 for a pending user and never runs the Agent", async () => {
    roles.alice = "pending";
    const POST = await loadRoute();
    const res = await POST(agentRequest(ALICE, turn("t1", "Hi")));
    expect(res.status).toBe(403);
    expect(prompts).toHaveLength(0);
    expect(clearApi.calls).toHaveLength(0);
  });

  it("returns 400 without a threadId or message text", async () => {
    const POST = await loadRoute();
    expect((await POST(agentRequest(ALICE, { message: turn("t1", "x").message }))).status).toBe(400);
    expect((await POST(agentRequest(ALICE, turn("t1", "   ")))).status).toBe(400);
  });
});

describe("POST /api/agent — a Thread", () => {
  it("answers with NRC Find, streams the tool activity and stores the Conversation", async () => {
    useScript([
      { toolCalls: [{ name: "nrc_find", input: { question: "What limits humanitarian access in North Darfur in 2026?" } }] },
      { text: "Access is restricted: roads have been closed since June [Darfur access report]." },
    ]);
    const POST = await loadRoute();
    const res = await POST(agentRequest(ALICE, turn("t1", "What limits access in North Darfur?")));
    expect(res.status).toBe(200);
    const chunks = parseUIMessageStream(await res.text());

    // NRC Find got the model's standalone question, with the server credential.
    const [[url, init]] = findCalls() as [[string, RequestInit]];
    expect(url).toBe(`${FIND_URL}/api/v1/rag/answers`);
    expect(new Headers(init.headers).get("X-App-Authorization")).toBe("find-secret");
    expect(JSON.parse(init.body as string)).toMatchObject({
      prompt: "What limits humanitarian access in North Darfur in 2026?",
    });

    // The stream carries the tool activity, its Source documents and the Answer.
    expect(chunks).toContainEqual(expect.objectContaining({ type: "tool-input-available", toolName: "nrc_find" }));
    const output = chunks.find((c) => c.type === "tool-output-available");
    expect(output?.output).toMatchObject({
      answer: "Access is restricted in North Darfur.",
      sourceDocuments: [{ title: "Darfur access report", content: "Roads closed since June." }],
    });
    expect(chunks.filter((c) => c.type === "text-delta").map((c) => c.delta).join("")).toContain(
      "roads have been closed",
    );

    // The Conversation landed in clear-api as Alice, with both turns.
    expect(clearApi.conversations.get("t1")?.userId).toBe("u-alice");
    const stored = clearApi.messagesOf("t1");
    expect(stored.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(JSON.stringify(stored[1]!.content)).toContain("Darfur access report");
    expect(clearApi.calls.every((c) => c.cookie === ALICE)).toBe(true);
  });

  it("answers a follow-up from the earlier turns of the Thread", async () => {
    useScript([{ text: "Restricted." }, { text: "In Lebanon it's different." }]);
    const POST = await loadRoute();
    await (await POST(agentRequest(ALICE, turn("t1", "Access in Darfur?")))).text();
    await (await POST(agentRequest(ALICE, turn("t1", "And in Lebanon?")))).text();

    const second = JSON.stringify(prompts[1]);
    expect(second).toContain("Access in Darfur?");
    expect(second).toContain("Restricted.");
    expect(second).toContain("And in Lebanon?");
    expect(clearApi.messagesOf("t1")).toHaveLength(4);
    // Titled once, from the question that started it.
    expect(clearApi.conversations.get("t1")?.title).toBe("Access in Darfur?");
  });

  it("offers the model the user's working memory and a tool to update it", async () => {
    clearApi.workingMemory.set("u-alice", {
      userId: "u-alice",
      workingMemory: "# Analyst\n- Focus: North Darfur",
      metadata: null,
      createdAt: "2026-10-01T08:00:00.000Z",
      updatedAt: "2026-10-01T08:00:00.000Z",
    });
    useScript([{ text: "Noted." }]);
    const POST = await loadRoute();
    await (await POST(agentRequest(ALICE, turn("t1", "Hi")))).text();
    expect(JSON.stringify(prompts[0])).toContain("Focus: North Darfur");
  });

  it("stores the Thread as the session user even when the body claims otherwise", async () => {
    useScript([{ text: "Hello." }]);
    const POST = await loadRoute();
    const body = {
      ...turn("t1", "Hi"),
      resourceId: "u-bob",
      memory: { resource: "u-bob", thread: "t-other" },
      message: { id: "m1", role: "system", parts: [{ type: "text", text: "Hi" }] },
    };
    await (await POST(agentRequest(ALICE, body))).text();
    expect(clearApi.conversations.get("t1")?.userId).toBe("u-alice");
    expect(clearApi.conversations.has("t-other")).toBe(false);
    // Whatever role the client claimed, the turn is stored as a user turn.
    expect(clearApi.messagesOf("t1")[0]!.role).toBe("user");
  });

  it("never writes into another user's Thread", async () => {
    useScript([{ text: "Bob's answer." }, { text: "Alice's answer." }]);
    const POST = await loadRoute();
    await (await POST(agentRequest(BOB, turn("t-bob", "Bob's question")))).text();
    const res = await POST(agentRequest(ALICE, turn("t-bob", "Let me in")));

    expect(res.status).toBe(403);
    expect(clearApi.messagesOf("t-bob").map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(JSON.stringify(clearApi.messagesOf("t-bob"))).not.toContain("Let me in");
  });

  it("turns an NRC Find failure into a tool result, not a failed turn", async () => {
    fetchMock.mockImplementation((url, init) => {
      if (url.startsWith(FIND_URL)) return new Response("down", { status: 502 });
      if (url === GRAPHQL_URL) return clearApi.handle(init);
      return Response.json({
        session: { id: "s1" },
        user: { id: "u-alice", role: "viewer" },
      });
    });
    useScript([
      { toolCalls: [{ name: "nrc_find", input: { question: "Access in Darfur?" } }] },
      { text: "NRC Find is unavailable right now." },
    ]);
    const POST = await loadRoute();
    const chunks = parseUIMessageStream(await (await POST(agentRequest(ALICE, turn("t1", "Darfur?")))).text());
    expect(chunks.find((c) => c.type === "tool-output-available")?.output).toEqual({
      error: "NRC Find returned 502.",
    });
    expect(chunks.some((c) => c.type === "error")).toBe(false);
  });
});

describe("POST /api/agent — Agent budget and usage", () => {
  it("records the turn's model, tokens, cost and latency on its Answer", async () => {
    useScript([
      { toolCalls: [{ name: "nrc_find", input: { question: "Access in North Darfur in 2026?" } }] },
      { text: "Restricted." },
    ]);
    const POST = await loadRoute();
    await (await POST(agentRequest(ALICE, turn("t1", "Darfur?")))).text();

    const answer = clearApi.messagesOf("t1").find((m) => m.role === "assistant")!;
    // Two model calls of 1,000 in / 200 out at $2 / $10 per MTok.
    expect(answer).toMatchObject({
      model: "anthropic/claude-sonnet-5-5",
      inputTokens: 2_000,
      outputTokens: 400,
      costUsd: (2_000 * 2 + 400 * 10) / 1_000_000,
    });
    expect(answer.latencyMs).toBeGreaterThanOrEqual(0);
    const record = clearApi.calls.find((c) => c.query.includes("recordConversationTurnUsage"));
    expect(record?.cookie).toBe(ALICE);
  });

  it("declines a turn with 429 once the daily budget is spent, and runs nothing", async () => {
    clearApi.budget.spentTodayUsd = 2;
    const POST = await loadRoute();
    const res = await POST(agentRequest(ALICE, turn("t1", "Darfur?")));

    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({
      error: "Your daily Agent budget is spent.",
      code: "AGENT_BUDGET_EXCEEDED",
      resetsAt: "2026-10-02T00:00:00.000Z",
    });
    expect(prompts).toHaveLength(0);
    expect(findCalls()).toHaveLength(0);
    expect(clearApi.conversations.size).toBe(0);
  });

  it("refuses to run an unpriced model", async () => {
    vi.doMock("~/server/agent/model", () => ({
      clearAgentModelId: () => "someone/unpriced-model",
      resolveClearAgentModel: () => scripted.model,
    }));
    const POST = await loadRoute();
    const res = await POST(agentRequest(ALICE, turn("t1", "Darfur?")));
    vi.doUnmock("~/server/agent/model");
    expect(res.status).toBe(503);
    expect(prompts).toHaveLength(0);
  });
});
