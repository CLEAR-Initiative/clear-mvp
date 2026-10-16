import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Router tests for metrics.detection: the variables sent to clear-api, the
 * shares added to its counts, the admin check that runs before any upstream
 * call, and the unavailable state while clear-api lacks the field.
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

const HISTOGRAM = [
  ...Array.from({ length: 8 }, (_, d) => ({ daysAfterOnset: d, isOpenEnded: false, count: 0 })),
  { daysAfterOnset: 8, isOpenEnded: true, count: 0 },
];

const METRICS = {
  from: "2026-07-20T00:00:00.000Z",
  to: "2026-10-14T12:00:00.000Z",
  eventsInRange: 40,
  withOnset: 30,
  counted: 20,
  sameDay: 5,
  byNextDay: 15,
  histogram: HISTOGRAM.map((row, i) => ({ ...row, count: i === 0 ? 5 : i === 1 ? 10 : i === 8 ? 5 : 0 })),
  weekly: [
    { isoWeek: "2026-W41", weekStart: "2026-10-05T00:00:00.000Z", counted: 4, sameDay: 1, byNextDay: 3, isPartial: false },
    { isoWeek: "2026-W42", weekStart: "2026-10-12T00:00:00.000Z", counted: 0, sameDay: 0, byNextDay: 0, isPartial: true },
  ],
  exclusions: [
    { reason: "NO_INGESTED_SIGNAL", count: 6 },
    { reason: "NO_ONSET", count: 10 },
    { reason: "DATE_ONLY_FIRST_SIGNAL", count: 3 },
    { reason: "BEFORE_ONSET", count: 1 },
  ],
};

describe("metrics router", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    graphqlFetch.mockReset();
  });

  it("forwards the range and location as the query's input", async () => {
    signedInAs("admin");
    graphqlFetch.mockResolvedValueOnce({ detectionMetrics: METRICS });
    await caller().metrics.detection({
      from: "2026-07-01T00:00:00.000Z",
      to: "2026-09-30T23:59:59.999Z",
      locationId: "loc-sdn",
    });
    const [query, vars, headers] = graphqlFetch.mock.calls[0] as [string, Record<string, unknown>, Record<string, string>];
    expect(query).toContain("query DetectionMetrics($input: DetectionMetricsInput)");
    expect(query).toContain("detectionMetrics(input: $input)");
    expect(query).toMatch(/weekly \{[^}]*eventsInRange/);
    expect(vars).toEqual({
      input: { from: "2026-07-01T00:00:00.000Z", to: "2026-09-30T23:59:59.999Z", locationId: "loc-sdn" },
    });
    expect(headers).toEqual({ Cookie: "better-auth.session_token=x" });
  });

  it("leaves out what was not given, so clear-api applies its default range", async () => {
    signedInAs("admin");
    graphqlFetch.mockResolvedValueOnce({ detectionMetrics: METRICS });
    await caller().metrics.detection();
    expect(graphqlFetch.mock.calls[0]![1]).toEqual({ input: {} });
  });

  it("adds the shares, null where the denominator is zero", async () => {
    signedInAs("admin");
    graphqlFetch.mockResolvedValueOnce({ detectionMetrics: METRICS });
    const result = await caller().metrics.detection();
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    const m = result.metrics;
    expect(m.counted).toBe(20);
    expect(m.shares).toEqual({ sameDay: 0.25, byNextDay: 0.75, withOnset: 0.75, measured: 0.5 });
    expect(m.histogram[0]).toMatchObject({ daysAfterOnset: 0, count: 5, share: 0.25 });
    expect(m.histogram[8]).toMatchObject({ isOpenEnded: true, count: 5, share: 0.25 });
    expect(m.weekly[0]).toMatchObject({ sameDayShare: 0.25, byNextDayShare: 0.75 });
    expect(m.weekly[1]).toMatchObject({ isPartial: true, sameDayShare: null, byNextDayShare: null });
    // A week without eventsInRange (an older clear-api) has no coverage.
    expect(m.weekly[0]).toMatchObject({ eventsInRange: null, measuredShare: null });
    expect(m.exclusions).toEqual(METRICS.exclusions);

    graphqlFetch.mockResolvedValueOnce({
      detectionMetrics: { ...METRICS, eventsInRange: 0, withOnset: 0, counted: 0, sameDay: 0, byNextDay: 0, histogram: HISTOGRAM },
    });
    const empty = await caller().metrics.detection();
    if (empty.status !== "ok") throw new Error("expected ok");
    expect(empty.metrics.shares).toEqual({ sameDay: null, byNextDay: null, withOnset: null, measured: null });
    expect(empty.metrics.histogram.every((row) => row.share === null)).toBe(true);
  });

  it("rejects a non-admin without calling clear-api", async () => {
    for (const role of ["analyst", "viewer", "pending"]) {
      signedInAs(role);
      await expect(caller().metrics.detection()).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
    expect(graphqlFetch).not.toHaveBeenCalled();
  });

  it("adds each week's coverage when clear-api reports its events in range", async () => {
    signedInAs("admin");
    graphqlFetch.mockResolvedValueOnce({
      detectionMetrics: { ...METRICS, weekly: [{ ...METRICS.weekly[0]!, eventsInRange: 10 }] },
    });
    const result = await caller().metrics.detection();
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.metrics.weekly[0]).toMatchObject({ eventsInRange: 10, measuredShare: 0.4 });
  });

  it("falls back to the query without weekly eventsInRange on a clear-api that predates it", async () => {
    signedInAs("admin");
    graphqlFetch
      .mockRejectedValueOnce(
        new GraphQLRequestError('Cannot query field "eventsInRange" on type "DetectionWeek".', "GRAPHQL_VALIDATION_FAILED"),
      )
      .mockResolvedValueOnce({ detectionMetrics: METRICS });
    const result = await caller().metrics.detection();
    expect(result.status).toBe("ok");
    expect(graphqlFetch).toHaveBeenCalledTimes(2);
    const fallback = graphqlFetch.mock.calls[1]![0] as string;
    expect(fallback).toMatch(/weekly \{ isoWeek weekStart counted/);
    expect(fallback).not.toContain("eventsInRange counted sameDay byNextDay isPartial");
  });

  it("returns the unavailable state while clear-api lacks the field", async () => {
    signedInAs("admin");
    // Both the query and its fallback are refused.
    graphqlFetch.mockRejectedValue(
      new GraphQLRequestError('Cannot query field "detectionMetrics" on type "Query".', "GRAPHQL_VALIDATION_FAILED"),
    );
    await expect(caller().metrics.detection()).resolves.toEqual({ status: "unavailable" });

    graphqlFetch.mockRejectedValue(
      new GraphQLRequestError('Unknown type "DetectionMetricsInput".', "GRAPHQL_VALIDATION_FAILED"),
    );
    await expect(caller().metrics.detection()).resolves.toEqual({ status: "unavailable" });
  });

  it("surfaces clear-api's range error as BAD_REQUEST with its message", async () => {
    signedInAs("admin");
    graphqlFetch.mockRejectedValueOnce(
      new GraphQLRequestError("The range can span at most 364 days", "BAD_USER_INPUT"),
    );
    await expect(caller().metrics.detection()).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "The range can span at most 364 days",
    });
  });
});
