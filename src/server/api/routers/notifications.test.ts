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

  it("list reads the signed-in user's notifications, optionally by status", async () => {
    graphqlFetch.mockResolvedValueOnce({ notifications: [ROW] });
    expect(await caller().notifications.list()).toEqual([ROW]);
    const [query, vars] = graphqlFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect(query).toContain("query Notifications($status: NotificationStatus)");
    expect(query).toContain("notifications(status: $status)");
    for (const field of ["message", "notificationType", "actionUrl", "actionText", "status", "createdAt"]) {
      expect(query).toContain(field);
    }
    expect(vars).toEqual({ status: undefined });

    graphqlFetch.mockResolvedValueOnce({ notifications: [] });
    await caller().notifications.list({ status: "READ" });
    expect((graphqlFetch.mock.calls[1] as [string, Record<string, unknown>])[1]).toEqual({ status: "READ" });
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
