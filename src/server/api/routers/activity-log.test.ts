import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The best-effort activity-log mutations (#1214): they forward to clear-api
 * with ids only, and swallow failures so the UI never waits on them.
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

describe("activity-log mutations", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            session: { id: "s", userId: "u", expiresAt: "2099-01-01" },
            user: { id: "u", email: "a@b.c", role: "user" },
          }),
          { status: 200 },
        ),
      ),
    );
  });
  afterEach(() => {
    graphqlFetch.mockReset();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("recordOnboardingCompleted calls clear-api with no variables", async () => {
    graphqlFetch.mockResolvedValueOnce({ recordOnboardingCompleted: true });
    await expect(caller().auth.recordOnboardingCompleted()).resolves.toBe(true);
    const [query, variables] = graphqlFetch.mock.calls[0]!;
    expect(query).toContain("recordOnboardingCompleted");
    expect(variables).toBeUndefined();
  });

  it("recordReportExported sends only the analysis id", async () => {
    graphqlFetch.mockResolvedValueOnce({ recordReportExported: true });
    await expect(caller().analysis.recordReportExported({ analysisId: "a1" })).resolves.toBe(true);
    const [query, variables] = graphqlFetch.mock.calls[0]!;
    expect(query).toContain("recordReportExported(analysisId: $analysisId)");
    expect(variables).toEqual({ analysisId: "a1" });
  });

  it("swallows clear-api failures (best-effort)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    graphqlFetch.mockRejectedValue(new Error("Cannot query field"));
    await expect(caller().auth.recordOnboardingCompleted()).resolves.toBe(false);
    await expect(caller().analysis.recordReportExported({ analysisId: "a1" })).resolves.toBe(false);
  });
});
