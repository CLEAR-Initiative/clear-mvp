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
    expect(m.shares).toEqual({ sameDay: 0.25, byNextDay: 0.75, withOnset: 0.75 });
    expect(m.histogram[0]).toMatchObject({ daysAfterOnset: 0, count: 5, share: 0.25 });
    expect(m.histogram[8]).toMatchObject({ isOpenEnded: true, count: 5, share: 0.25 });
    expect(m.weekly[0]).toMatchObject({ sameDayShare: 0.25, byNextDayShare: 0.75 });
    expect(m.weekly[1]).toMatchObject({ isPartial: true, sameDayShare: null, byNextDayShare: null });
    expect(m.exclusions).toEqual(METRICS.exclusions);

    graphqlFetch.mockResolvedValueOnce({
      detectionMetrics: { ...METRICS, eventsInRange: 0, withOnset: 0, counted: 0, sameDay: 0, byNextDay: 0, histogram: HISTOGRAM },
    });
    const empty = await caller().metrics.detection();
    if (empty.status !== "ok") throw new Error("expected ok");
    expect(empty.metrics.shares).toEqual({ sameDay: null, byNextDay: null, withOnset: null });
    expect(empty.metrics.histogram.every((row) => row.share === null)).toBe(true);
  });

  it("rejects a non-admin without calling clear-api", async () => {
    for (const role of ["analyst", "viewer", "pending"]) {
      signedInAs(role);
      await expect(caller().metrics.detection()).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
    expect(graphqlFetch).not.toHaveBeenCalled();
  });

  it("returns the unavailable state while clear-api lacks the field", async () => {
    signedInAs("admin");
    graphqlFetch.mockRejectedValueOnce(
      new GraphQLRequestError('Cannot query field "detectionMetrics" on type "Query".', "GRAPHQL_VALIDATION_FAILED"),
    );
    await expect(caller().metrics.detection()).resolves.toEqual({ status: "unavailable" });

    graphqlFetch.mockRejectedValueOnce(
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

const PRECISION = {
  from: "2026-10-26T00:00:00.000Z",
  to: "2026-11-08T23:59:59.999Z",
  signalsInRange: 30,
  bySource: [
    { source: "sudan-war-x", total: 20, noLocation: 2, country: 4, state: 6, district: 6, point: 2 },
    { source: "dataminr", total: 10, noLocation: 0, country: 1, state: 0, district: 0, point: 9 },
  ],
  weekly: [
    { isoWeek: "2026-W44", weekStart: "2026-10-26T00:00:00.000Z", source: "sudan-war-x", total: 20, noLocation: 2, country: 4, state: 6, district: 6, point: 2, isPartial: false },
    { isoWeek: "2026-W44", weekStart: "2026-10-26T00:00:00.000Z", source: "dataminr", total: 10, noLocation: 0, country: 1, state: 0, district: 0, point: 9, isPartial: false },
  ],
  corrections: { open: 2, accepted: 1, corrected: 0, declined: 1, superseded: 0 },
};

describe("metrics.locationPrecision", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    graphqlFetch.mockReset();
  });

  it("forwards the range, location and sources as the query's input", async () => {
    signedInAs("admin");
    graphqlFetch.mockResolvedValueOnce({ locationPrecisionMetrics: PRECISION });
    await caller().metrics.locationPrecision({
      from: "2026-10-26T00:00:00.000Z",
      to: "2026-11-08T23:59:59.999Z",
      locationId: "loc-sdn",
      sourceNames: ["sudan-war-x", "dataminr"],
    });
    const [query, vars, headers] = graphqlFetch.mock.calls[0] as [string, Record<string, unknown>, Record<string, string>];
    expect(query).toContain("query LocationPrecisionMetrics($input: LocationPrecisionMetricsInput)");
    expect(query).toContain("locationPrecisionMetrics(input: $input)");
    expect(vars).toEqual({
      input: {
        from: "2026-10-26T00:00:00.000Z",
        to: "2026-11-08T23:59:59.999Z",
        locationId: "loc-sdn",
        sourceNames: ["sudan-war-x", "dataminr"],
      },
    });
    expect(headers).toEqual({ Cookie: "better-auth.session_token=x" });
  });

  it("leaves out what was not given, so clear-api applies its defaults", async () => {
    signedInAs("admin");
    graphqlFetch.mockResolvedValueOnce({ locationPrecisionMetrics: PRECISION });
    await caller().metrics.locationPrecision();
    expect(graphqlFetch.mock.calls[0]![1]).toEqual({ input: {} });
  });

  it("adds the shares and totals to clear-api's counts", async () => {
    signedInAs("admin");
    graphqlFetch.mockResolvedValueOnce({ locationPrecisionMetrics: PRECISION });
    const result = await caller().metrics.locationPrecision();
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.metrics.totals).toMatchObject({ total: 30, fine: 17 });
    expect(result.metrics.bySource[0]).toMatchObject({ source: "sudan-war-x", fineShare: 0.4 });
    expect(result.metrics.corrections).toMatchObject({ decided: 2, total: 4 });
  });

  it("rejects a non-admin without calling clear-api", async () => {
    for (const role of ["analyst", "viewer", "pending"]) {
      signedInAs(role);
      await expect(caller().metrics.locationPrecision()).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
    expect(graphqlFetch).not.toHaveBeenCalled();
  });

  it("returns the unavailable state while clear-api lacks the field", async () => {
    signedInAs("admin");
    graphqlFetch.mockRejectedValueOnce(
      new GraphQLRequestError('Cannot query field "locationPrecisionMetrics" on type "Query".', "GRAPHQL_VALIDATION_FAILED"),
    );
    await expect(caller().metrics.locationPrecision()).resolves.toEqual({ status: "unavailable" });
  });
});

const DETECTION_SERIES = {
  from: "2026-10-05T00:00:00.000Z",
  to: "2026-10-11T23:59:59.999Z",
  granularity: "DAY",
  series: [
    { start: "2026-10-05T00:00:00.000Z", label: "2026-10-05", isPartial: false, counted: 4, sameDay: 1, byNextDay: 3 },
    { start: "2026-10-06T00:00:00.000Z", label: "2026-10-06", isPartial: false, counted: 0, sameDay: 0, byNextDay: 0 },
  ],
};

const PRECISION_SERIES = {
  from: "2026-10-26T00:00:00.000Z",
  to: "2026-11-08T23:59:59.999Z",
  granularity: "WEEK",
  bySource: [
    { source: "sudan-war-x", total: 20 },
    { source: "dataminr", total: 10 },
  ],
  series: [
    { start: "2026-10-26T00:00:00.000Z", label: "2026-W44", isPartial: false, source: "sudan-war-x", total: 20, district: 6, point: 2 },
    { start: "2026-10-26T00:00:00.000Z", label: "2026-W44", isPartial: false, source: "dataminr", total: 10, district: 0, point: 9 },
  ],
};

describe("metrics.series", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    graphqlFetch.mockReset();
  });

  it("asks detectionMetrics for a time-to-detection metric, with the granularity, and reads the share", async () => {
    signedInAs("admin");
    graphqlFetch.mockResolvedValueOnce({ detectionMetrics: DETECTION_SERIES });
    const result = await caller().metrics.series({
      metric: "detectedSameDay",
      granularity: "DAY",
      from: "2026-10-05T00:00:00.000Z",
      to: "2026-10-11T23:59:59.999Z",
      locationId: "loc-sdn",
    });
    const [query, vars] = graphqlFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect(query).toContain("query DetectionSeries($input: DetectionMetricsInput)");
    expect(query).toContain("series { start label isPartial counted sameDay byNextDay }");
    expect(vars).toEqual({
      input: { from: "2026-10-05T00:00:00.000Z", to: "2026-10-11T23:59:59.999Z", locationId: "loc-sdn", granularity: "DAY" },
    });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.series).toMatchObject({ metric: "detectedSameDay", granularity: "DAY", groups: [] });
    expect(result.series.buckets[0]).toEqual({ start: "2026-10-05T00:00:00.000Z", label: "2026-10-05", isPartial: false, group: null, numerator: 1, denominator: 4 });
  });

  it("asks locationPrecisionMetrics for district or finer, per source, leaving out what was not given", async () => {
    signedInAs("admin");
    graphqlFetch.mockResolvedValueOnce({ locationPrecisionMetrics: PRECISION_SERIES });
    const result = await caller().metrics.series({ metric: "districtOrFiner" });
    const [query, vars] = graphqlFetch.mock.calls[0] as [string, Record<string, unknown>];
    expect(query).toContain("query LocationPrecisionSeries($input: LocationPrecisionMetricsInput)");
    expect(vars).toEqual({ input: {} });
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.series.groups).toEqual(["sudan-war-x", "dataminr"]);
    expect(result.series.buckets).toEqual([
      { start: "2026-10-26T00:00:00.000Z", label: "2026-W44", isPartial: false, group: "sudan-war-x", numerator: 8, denominator: 20 },
      { start: "2026-10-26T00:00:00.000Z", label: "2026-W44", isPartial: false, group: "dataminr", numerator: 9, denominator: 10 },
    ]);
  });

  it("rejects a non-admin without calling clear-api, and an unknown metric before that", async () => {
    signedInAs("analyst");
    await expect(caller().metrics.series({ metric: "districtOrFiner" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(graphqlFetch).not.toHaveBeenCalled();
    signedInAs("admin");
    await expect(
      caller().metrics.series({ metric: "somethingElse" as "districtOrFiner" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(graphqlFetch).not.toHaveBeenCalled();
  });

  it("returns the unavailable state while clear-api lacks the series field", async () => {
    signedInAs("admin");
    graphqlFetch.mockRejectedValueOnce(
      new GraphQLRequestError('Cannot query field "series" on type "DetectionMetrics".', "GRAPHQL_VALIDATION_FAILED"),
    );
    await expect(caller().metrics.series({ metric: "detectedByNextDay" })).resolves.toEqual({ status: "unavailable" });
  });
});
