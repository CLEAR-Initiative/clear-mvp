import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Router tests for the hotline inbox procedures. graphqlFetch and the auth
 * session fetch are mocked; the assertions cover the query shape sent to
 * clear-api and the filtering/flattening done in the tRPC layer.
 */

const graphqlFetch = vi.fn();
vi.mock("~/server/api/graphql", () => ({
  graphqlFetch: (...args: unknown[]) => graphqlFetch(...args),
  cookieHeaders: () => ({ Cookie: "better-auth.session_token=x" }),
}));

const { createCaller } = await import("~/server/api/root");

function caller() {
  return createCaller({ headers: new Headers({ cookie: "better-auth.session_token=x" }) });
}

const sources = [
  { id: "hot1", name: "Hotline A", kind: "hotline", reviewerRoles: [], privacyDefault: "private", isActive: true },
  { id: "hot2", name: "Hotline off", kind: "hotline", reviewerRoles: [], privacyDefault: "private", isActive: false },
  { id: "grp", name: "Staff group", kind: "staff_group", reviewerRoles: [], privacyDefault: "private", isActive: true },
];

describe("ground.hotlineInbox", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            session: { id: "s", userId: "u", expiresAt: "2099-01-01" },
            user: { id: "u", email: "a@b.c", role: "admin" },
          }),
          { status: 200 },
        ),
      ),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    graphqlFetch.mockReset();
  });

  it("queries only active hotline sources and flattens threads and messages", async () => {
    graphqlFetch
      .mockResolvedValueOnce({ groundSources: sources })
      .mockResolvedValueOnce({
        groundThreads: [{ id: "t1", groundSourceId: "hot1" }],
        groundMessages: [{ id: "m1", threadId: "t1", mediaUrls: ["https://s3/a.jpg"] }],
      });

    const result = await caller().ground.hotlineInbox();

    expect(result.sources.map((s) => s.id)).toEqual(["hot1"]);
    expect(result.threads.map((t) => t.id)).toEqual(["t1"]);
    expect(result.messages[0]!.mediaUrls).toEqual(["https://s3/a.jpg"]);

    // Second call is the per-source query, scoped to unverified threads.
    expect(graphqlFetch).toHaveBeenCalledTimes(2);
    const [query, vars] = graphqlFetch.mock.calls[1] as [string, Record<string, unknown>];
    expect(query).toContain('reviewState: "unverified"');
    expect(query).toContain("mediaUrls");
    expect(vars).toMatchObject({ groundSourceId: "hot1", limit: 500 });
  });

  it("returns empty collections when no hotline source is active", async () => {
    graphqlFetch.mockResolvedValueOnce({ groundSources: [sources[1], sources[2]] });
    const result = await caller().ground.hotlineInbox();
    expect(result).toEqual({ sources: [], threads: [], messages: [] });
    expect(graphqlFetch).toHaveBeenCalledTimes(1);
  });

  it("translation stubs report unavailable until clear-api ships the entity", async () => {
    const c = caller();
    await expect(c.ground.requestTranslation({ threadId: "t1", locale: "en" })).resolves.toEqual({
      status: "unavailable",
      text: null,
    });
    await expect(c.ground.translation({ threadId: "t1", locale: "en" })).resolves.toEqual({
      status: "unavailable",
      text: null,
    });
    expect(graphqlFetch).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated callers", async () => {
    const anon = createCaller({ headers: new Headers() });
    await expect(anon.ground.hotlineInbox()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("signals.updateSeverity / updateLocation", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            session: { id: "s", userId: "u", expiresAt: "2099-01-01" },
            user: { id: "u", email: "a@b.c", role: "admin" },
          }),
          { status: 200 },
        ),
      ),
    );
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    graphqlFetch.mockReset();
  });

  it("forwards severity to updateSignalSeverity", async () => {
    graphqlFetch.mockResolvedValueOnce({ updateSignalSeverity: { id: "sig", severity: 4 } });
    const result = await caller().signals.updateSeverity({ id: "sig", severity: 4 });
    expect(result).toEqual({ id: "sig", severity: 4 });
    const [query, vars] = graphqlFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect(query).toContain("updateSignalSeverity");
    expect(vars).toEqual({ id: "sig", severity: 4 });
  });

  it("rejects severity outside 1-5 before calling the API", async () => {
    await expect(caller().signals.updateSeverity({ id: "sig", severity: 9 })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    expect(graphqlFetch).not.toHaveBeenCalled();
  });

  it("forwards locationId to updateSignalLocation", async () => {
    graphqlFetch.mockResolvedValueOnce({
      updateSignalLocation: { id: "sig", generalLocation: { id: "loc", name: "Kassala" } },
    });
    const result = await caller().signals.updateLocation({ id: "sig", locationId: "loc" });
    expect(result.generalLocation?.name).toBe("Kassala");
    const [query, vars] = graphqlFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect(query).toContain("updateSignalLocation");
    expect(vars).toEqual({ id: "sig", locationId: "loc" });
  });
});
