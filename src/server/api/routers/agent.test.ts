import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Router tests for the Agent page's history. graphqlFetch and the auth
 * session fetch are mocked; the assertions cover the query sent to clear-api
 * (as the caller, via the forwarded cookie), paging, and the conversion of
 * stored Mastra messages into `useChat` messages.
 */

const graphqlFetch = vi.fn();
vi.mock("~/server/api/graphql", () => ({
  graphqlFetch: (...args: unknown[]) => graphqlFetch(...args),
  cookieHeaders: () => ({ Cookie: "better-auth.session_token=x" }),
}));

const { createCaller } = await import("~/server/api/root");

function caller(cookie = "better-auth.session_token=x") {
  return createCaller({ headers: new Headers({ cookie }) });
}

const summary = (i: number) => ({
  id: `t${i}`,
  title: `Thread ${i}`,
  createdAt: "2026-10-01T08:00:00.000Z",
  updatedAt: "2026-10-01T09:00:00.000Z",
  cursor: `c${i}`,
});

describe("agent router", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({
          session: { id: "s", userId: "u", expiresAt: "2099-01-01" },
          user: { id: "u", email: "a@b.c", role: "viewer" },
        }),
      ),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    graphqlFetch.mockReset();
  });

  it("lists the caller's Conversations with the forwarded cookie", async () => {
    graphqlFetch.mockResolvedValueOnce({ myConversations: [summary(1), summary(2)] });
    const result = await caller().agent.listConversations();

    expect(result.items.map((c) => c.id)).toEqual(["t1", "t2"]);
    expect(result.nextCursor).toBeNull();
    const [query, variables, headers] = graphqlFetch.mock.calls[0]!;
    expect(query).toContain("myConversations(first: $first, after: $after)");
    expect(variables).toEqual({ first: 30, after: undefined });
    expect(headers).toEqual({ Cookie: "better-auth.session_token=x" });
  });

  it("pages with the last row's cursor", async () => {
    graphqlFetch.mockResolvedValueOnce({
      myConversations: Array.from({ length: 30 }, (_, i) => summary(i)),
    });
    const page = await caller().agent.listConversations({ cursor: "c-prev" });
    expect(graphqlFetch.mock.calls[0]![1]).toEqual({ first: 30, after: "c-prev" });
    expect(page.nextCursor).toBe("c29");
  });

  it("returns a Conversation's turns as useChat messages", async () => {
    graphqlFetch.mockResolvedValueOnce({
      conversation: {
        id: "t1",
        title: "Darfur",
        messages: [
          {
            id: "m1",
            conversationId: "t1",
            role: "user",
            type: "v2",
            content: { format: 2, parts: [{ type: "text", text: "Access in Darfur?" }] },
            createdAt: "2026-10-01T08:00:00.000Z",
          },
          {
            id: "m2",
            conversationId: "t1",
            role: "assistant",
            type: "v2",
            content: { format: 2, parts: [{ type: "text", text: "Restricted." }] },
            createdAt: "2026-10-01T08:00:05.000Z",
          },
        ],
      },
    });
    const result = await caller().agent.getConversation({ id: "t1" });

    expect(result?.title).toBe("Darfur");
    expect(result?.messages.map((m) => [m.id, m.role])).toEqual([
      ["m1", "user"],
      ["m2", "assistant"],
    ]);
    expect(result?.messages[1]!.parts).toContainEqual(
      expect.objectContaining({ type: "text", text: "Restricted." }),
    );
  });

  it("returns null for a Conversation that doesn't exist", async () => {
    graphqlFetch.mockResolvedValueOnce({ conversation: null });
    await expect(caller().agent.getConversation({ id: "nope" })).resolves.toBeNull();
  });

  it("rejects a call without a session", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Response.json(null)));
    await expect(caller("").agent.listConversations()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(graphqlFetch).not.toHaveBeenCalled();
  });
});
