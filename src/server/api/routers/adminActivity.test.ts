import { afterEach, describe, expect, it, vi } from "vitest";

/** Router tests for adminActivity: admin gate, variables, unavailable mapping, CSV export. */

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

function signedInAs(role: string) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(
        JSON.stringify({
          session: { id: "s", userId: "u", expiresAt: "2099-01-01" },
          user: { id: "u", email: "a@b.c", role },
        }),
        { status: 200 },
      ),
    ),
  );
}

const ACTIVITY = {
  from: "2026-10-01T00:00:00.000Z",
  to: "2026-10-29T00:00:00.000Z",
  totals: { total: 7, actions: [{ action: "page_view", count: 7 }] },
};
const AGENT = {
  from: ACTIVITY.from,
  to: ACTIVITY.to,
  turns: 3,
  answers: 2,
  distinctUsers: 1,
  costUsd: 0.12,
  inputTokens: 100,
  outputTokens: 50,
  byRoute: [],
  byDay: [],
};

describe("adminActivity router", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    graphqlFetch.mockReset();
  });

  it("forwards the range and returns both stats", async () => {
    signedInAs("admin");
    graphqlFetch.mockResolvedValueOnce({ activityStats: ACTIVITY, agentUsageStats: AGENT });
    const result = await caller().adminActivity.overview({ from: ACTIVITY.from, to: ACTIVITY.to });
    expect(graphqlFetch.mock.calls[0]![1]).toEqual({ from: ACTIVITY.from, to: ACTIVITY.to });
    expect(result).toEqual({ status: "ok", overview: { activity: ACTIVITY, agent: AGENT } });
  });

  it("rejects a non-admin without calling clear-api", async () => {
    for (const role of ["analyst", "viewer", "pending"]) {
      signedInAs(role);
      await expect(caller().adminActivity.overview()).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(caller().adminActivity.nrcExport()).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
    expect(graphqlFetch).not.toHaveBeenCalled();
  });

  it("returns the unavailable state while clear-api lacks the fields", async () => {
    signedInAs("admin");
    graphqlFetch.mockRejectedValueOnce(
      new GraphQLRequestError('Cannot query field "activityStats" on type "Query".', "GRAPHQL_VALIDATION_FAILED"),
    );
    await expect(caller().adminActivity.overview()).resolves.toEqual({ status: "unavailable" });
  });

  it("exports the CSV, defaulting to the last 12 months", async () => {
    signedInAs("admin");
    graphqlFetch.mockResolvedValueOnce({ nrcActivityExport: "month,org\n" });
    const result = await caller().adminActivity.nrcExport({ to: "2026-10-29T00:00:00.000Z" });
    expect(result).toEqual({ csv: "month,org\n" });
    expect(graphqlFetch.mock.calls[0]![1]).toEqual({
      from: "2025-10-29T00:00:00.000Z",
      to: "2026-10-29T00:00:00.000Z",
    });
  });
});
