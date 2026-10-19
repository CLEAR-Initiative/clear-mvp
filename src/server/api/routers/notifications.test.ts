import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Router tests for the notifications procedures: the documents and
 * variables sent to clear-api, and how its errors reach the client.
 */

const graphqlFetch = vi.fn();
vi.mock("~/server/api/graphql", async () => {
  const actual = await vi.importActual<typeof import("~/server/api/graphql")>("~/server/api/graphql");
  return {
    ...actual,
    graphqlFetch: (...args: unknown[]) => graphqlFetch(...args),
    cookieHeaders: () => ({ Cookie: "better-auth.session_token=x" }),
  };
});

const { createCaller } = await import("~/server/api/root");
const { GraphQLRequestError } = await import("~/server/api/graphql");

function caller() {
  return createCaller({ headers: new Headers({ cookie: "better-auth.session_token=x" }) });
}

const ROW = {
  id: "n-1",
  message: "Impact prior proposed — review it",
  notificationType: "task",
  actionUrl: "/event/evt-1",
  actionText: "View Event",
  status: "PENDING",
  createdAt: "2026-10-06T10:00:00.000Z",
  updatedAt: "2026-10-06T10:00:00.000Z",
};

describe("notifications router", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            session: { id: "s", userId: "u", expiresAt: "2099-01-01" },
            user: { id: "u", email: "a@b.c", role: "viewer" },
          }),
          { status: 200 },
        ),
      ),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    graphqlFetch.mockReset();
  });

  it("bell returns the bell's cut: task rows newest first, capped, with every unread one counted", async () => {
    const rows = [
      ...Array.from({ length: 25 }, (_, i) => ({ ...ROW, id: `t-${i}`, createdAt: `2026-10-0${1 + (i % 5)}T10:00:00.000Z` })),
      { ...ROW, id: "read", status: "READ", createdAt: "2026-10-09T10:00:00.000Z" },
      { ...ROW, id: "alert", notificationType: "alert", createdAt: "2026-10-09T11:00:00.000Z" },
    ];
    graphqlFetch.mockResolvedValueOnce({ notifications: rows });
    const result = await caller().notifications.bell();
    expect(result.rows).toHaveLength(20);
    expect(result.rows[0]!.id).toBe("read");
    expect(result.rows.some((r) => r.id === "alert")).toBe(false);
    expect(result.unread).toBe(25);
    const [query, vars] = graphqlFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect(query).toContain("query Notifications");
    for (const field of ["message", "notificationType", "actionUrl", "actionText", "status", "createdAt"]) {
      expect(query).toContain(field);
    }
    expect(vars).toEqual({});
  });

  it("markRead sends the mutation and surfaces NOT_FOUND for another user's row", async () => {
    graphqlFetch.mockResolvedValueOnce({ markNotificationRead: { ...ROW, status: "READ" } });
    const result = await caller().notifications.markRead({ id: "n-1" });
    expect(result.status).toBe("READ");
    const [query, vars] = graphqlFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect(query).toContain("mutation MarkNotificationRead");
    expect(query).toContain("markNotificationRead(id: $id)");
    expect(vars).toEqual({ id: "n-1" });

    graphqlFetch.mockRejectedValueOnce(new GraphQLRequestError("Notification not found", "NOT_FOUND"));
    await expect(caller().notifications.markRead({ id: "n-2" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
