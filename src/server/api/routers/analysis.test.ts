import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Router tests for the unified analysis page. graphqlFetch is mocked; the
 * assertions cover the frame sent to clear-api (matched exactly server-side)
 * and how cited reports and events are hydrated into the source list.
 */

const graphqlFetch = vi.fn();
vi.mock("~/server/api/graphql", () => ({
  graphqlFetch: (...args: unknown[]) => graphqlFetch(...args),
  cookieHeaders: () => ({ Cookie: "better-auth.session_token=x" }),
}));

const { createCaller } = await import("~/server/api/root");
const { countryFrame, mapFigures, toAnalysisEvent } = await import("~/server/api/routers/analysis");

function caller() {
  return createCaller({ headers: new Headers({ cookie: "better-auth.session_token=x" }) });
}

const row = {
  id: "a1",
  locationIds: ["sdn"],
  eventTypes: [],
  needSectors: [],
  windowStart: "2026-01-01T00:00:00.000Z",
  windowEnd: "2026-12-31T23:59:59.000Z",
  generatedByModel: "claude-sonnet-4-6",
  generatedAt: "2026-09-29T06:12:00.000Z",
  schemaVersion: "v4",
  sourceReportIds: ["r1", "r2", "event:e1"],
  data: {
    ai_summary: { text: "Sudan summary.", source_report_ids: ["r1", "event:e1"] },
    sources: { reports: [{ report_id: "r1", report_title: "Listed report", source_url: "https://rw/1" }] },
    scenarios: { most_likely: "More fighting.", source_report_ids: ["event:e1"] },
  },
};

describe("analysis router", () => {
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
    graphqlFetch.mockReset();
  });

  it("builds the pipeline's calendar-year frame byte-for-byte", () => {
    expect(countryFrame("sdn", 2026)).toEqual({
      locationIds: ["sdn"],
      windowStart: "2026-01-01T00:00:00Z",
      windowEnd: "2026-12-31T23:59:59Z",
    });
  });

  it("reads the current year's country frame and hydrates cited reports and events", async () => {
    graphqlFetch.mockImplementation(async (query: string) => {
      if (query.includes("query Analysis(")) return { analysis: row };
      if (query.includes("query ReportMeta")) {
        return {
          r0: { reportId: "r1", reportTitle: "Listed report", sourceUrl: "https://rw/1", publishedAt: null, source: { name: "OCHA" } },
          r1: { reportId: "r2", reportTitle: "Cited report", sourceUrl: "https://rw/2", publishedAt: "2026-09-01", source: { name: "WFP" } },
        };
      }
      if (query.includes("query CitedEvents")) {
        return { e0: { id: "e1", title: "Shelling in El Fasher", firstSignalCreatedAt: "2026-09-20T00:00:00Z" } };
      }
      throw new Error(`unexpected query ${query.slice(0, 40)}`);
    });

    const result = await caller().analysis.current({ countryLocationId: "sdn", countryName: "Sudan" });

    const [, vars] = graphqlFetch.mock.calls[0]!;
    const year = new Date().getUTCFullYear();
    expect(vars).toEqual({ frame: countryFrame("sdn", year) });

    expect(result?.sources.map((s) => [s.id, s.title, s.url, s.publisher])).toEqual([
      ["r1", "Listed report", "https://rw/1", "OCHA"],
      ["r2", "Cited report", "https://rw/2", "WFP"],
      ["event:e1", "Shelling in El Fasher", "/event/e1", "CLEAR"],
    ]);
    expect(result?.eventSourceIds).toEqual(["event:e1"]);
    expect(result?.summaryRefs).toEqual([1, 3]);
    expect(result?.scenarios?.mostLikely).toBe("More fighting.");
    expect(result?.scenarios?.refs).toEqual([3]);
    expect(result?.scope).toMatchObject({ name: "Sudan", locationIds: ["sdn"] });
  });

  it("falls back to last year's frame, then to null", async () => {
    graphqlFetch.mockResolvedValue({ analysis: null });
    const result = await caller().analysis.current({ countryLocationId: "sdn", countryName: "Sudan" });
    expect(result).toBeNull();
    const year = new Date().getUTCFullYear();
    expect(graphqlFetch.mock.calls.map(([, v]) => (v as { frame: { windowStart: string } }).frame.windowStart)).toEqual([
      `${year}-01-01T00:00:00Z`,
      `${year - 1}-01-01T00:00:00Z`,
    ]);
  });

  it("pages the scope's events newest first and slims them for the map", async () => {
    graphqlFetch.mockResolvedValueOnce({
      eventsPage: {
        totalCount: 250,
        items: [
          {
            id: "e1",
            title: "Clashes",
            types: ["conflict"],
            severity: 4,
            firstSignalCreatedAt: "2026-09-20T00:00:00Z",
            lastSignalCreatedAt: "2026-09-21T00:00:00Z",
            casualties: null,
            populationDisplaced: "1200",
            representativePoint: { id: "p", name: "Town", level: 4, geometry: { type: "Point", coordinates: [25.3, 13.6] } },
            generalLocation: {
              id: "d",
              name: "El Fasher",
              level: 2,
              ancestors: [
                { id: "sdn", name: "Sudan", level: 0 },
                { id: "nd", name: "North Darfur", level: 1 },
              ],
            },
          },
        ],
      },
    });

    const result = await caller().analysis.events({ locationIds: ["sdn"], from: "2026-01-01T00:00:00.000Z" });

    expect(graphqlFetch.mock.calls[0]![1]).toEqual({
      input: { locationId: "sdn", from: "2026-01-01T00:00:00.000Z", orderBy: "CREATED_DESC", limit: 100 },
    });
    expect(result.totalCount).toBe(250);
    expect(result.items[0]).toMatchObject({
      id: "e1",
      point: [25.3, 13.6],
      populationDisplaced: 1200,
      locationName: "El Fasher",
      admin1: { id: "nd", name: "North Darfur" },
    });
  });

  it("leaves a geometry-less event off the map rather than guessing", () => {
    const e = toAnalysisEvent({
      id: "e2",
      title: null,
      types: [],
      severity: null,
      firstSignalCreatedAt: "2026-09-01T00:00:00Z",
      lastSignalCreatedAt: "2026-09-01T00:00:00Z",
      casualties: null,
      populationDisplaced: null,
      representativePoint: null,
      generalLocation: { id: "nd", name: "North Darfur", level: 1 },
    });
    expect(e.point).toBeNull();
    expect(e.admin1).toEqual({ id: "nd", name: "North Darfur" });
  });

  it("reads the all-time tier for stock figures and ranks sectors by people in need", async () => {
    graphqlFetch.mockResolvedValueOnce({
      aggregatedDatapoint: {
        data: {
          idp_stock: { value: 8583274, value_low: 8583274, value_high: 8685273, newest_report_at: "2026-08-31" },
          refugees: { value: 2821106 },
          overall_pin: { value: 33699770, value_low: 19000000, value_high: 33699770 },
          pin_health: { value: 20270955 },
          pin_wash: { value: 25512902 },
          pin_wash_male: { value: 1 },
          returnee_stock: null,
        },
      },
    });
    const result = await caller().analysis.figures({ locationId: "sdn" });
    const [query, vars] = graphqlFetch.mock.calls[0]!;
    expect(query).toContain('windowKind: "all"');
    expect(vars).toMatchObject({ locationId: "sdn", windowStart: "1970-01-01T00:00:00Z" });
    expect(result.idpStock).toEqual({ value: 8583274, low: 8583274, high: 8685273, newestAt: "2026-08-31" });
    expect(result.refugees?.value).toBe(2821106);
    expect(result.returneeStock).toBeNull();
    expect(result.overallPin).toMatchObject({ low: 19000000, high: 33699770 });
    expect(result.pinBySector.map((r) => r.sector)).toEqual(["wash", "health"]);
  });

  it("maps a missing bucket to empty figures", () => {
    expect(mapFigures(null)).toEqual({ idpStock: null, refugees: null, returneeStock: null, overallPin: null, pinBySector: [] });
  });

  it("rejects unauthenticated callers", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("null", { status: 200 })));
    await expect(caller().analysis.current({ countryLocationId: "sdn", countryName: "Sudan" })).rejects.toThrow();
  });

  it("lists the country frame and the team's automations with names and generation stamps", async () => {
    graphqlFetch.mockImplementation(async (query: string, vars: Record<string, unknown>) => {
      if (query.includes("query AnalysisAutomations")) {
        expect(vars).toEqual({ teamId: "t1" });
        return {
          analysisAutomations: [
            {
              id: "auto-1",
              locationIds: ["sheikan", "umrawaba"],
              eventTypes: [],
              needSectors: [],
              windowStart: "2026-07-01T00:00:00.000Z",
              cadence: "weekly",
              teamId: "t1",
              enabled: true,
              createdAt: "2026-09-28T00:00:00.000Z",
            },
          ],
        };
      }
      if (query.includes("query ScopeLocations")) {
        const chain = [
          { id: "sdn", name: "Sudan", level: 0 },
          { id: "nk", name: "North Kordofan", level: 1 },
        ];
        return {
          l0: { id: "sheikan", name: "Sheikan", level: 2, parent: { id: "nk", name: "North Kordofan" }, ancestors: chain },
          l1: { id: "umrawaba", name: "Um Rawaba", level: 2, parent: { id: "nk", name: "North Kordofan" }, ancestors: chain },
        };
      }
      if (query.includes("query AnalysisStamps")) {
        const year = new Date().getUTCFullYear();
        expect(vars.f0).toEqual(countryFrame("sdn", year));
        expect(vars.f1).toEqual(countryFrame("sdn", year - 1));
        expect(vars.f2).toEqual({
          locationIds: ["sheikan", "umrawaba"],
          eventTypes: [],
          needSectors: [],
          windowStart: "2026-07-01T00:00:00.000Z",
          windowEnd: null,
        });
        return { a0: null, a1: { id: "last-year", generatedAt: "2025-12-29T00:00:00Z" }, a2: null };
      }
      throw new Error(`unexpected query ${query.slice(0, 40)}`);
    });

    const result = await caller().analysis.scopes({ teamId: "t1", countries: [{ id: "sdn", name: "Sudan" }] });

    expect(result.countries).toEqual([
      { id: "sdn", name: "Sudan", analysisId: "last-year", generatedAt: "2025-12-29T00:00:00Z" },
    ]);
    expect(result.created[0]).toMatchObject({
      id: "auto-1",
      name: "Sheikan and Um Rawaba, North Kordofan, Sudan",
      countryId: "sdn",
      cadence: "weekly",
      analysisId: null,
      generatedAt: null,
    });
  });

  it("never lists automations without a team (clear-api would return every team's)", async () => {
    graphqlFetch.mockResolvedValue({ a0: null, a1: null });
    const result = await caller().analysis.scopes({ teamId: null, countries: [{ id: "sdn", name: "Sudan" }] });
    expect(result.created).toEqual([]);
    expect(graphqlFetch.mock.calls.some(([q]) => (q as string).includes("AnalysisAutomations"))).toBe(false);
  });

  it("reads a created analysis by its rolling frame", async () => {
    graphqlFetch.mockImplementation(async (query: string) => {
      if (query.includes("query Analysis(")) return { analysis: { ...row, locationIds: ["sheikan"], windowEnd: null } };
      if (query.includes("query ReportMeta")) return {};
      if (query.includes("query CitedEvents")) return {};
      throw new Error(`unexpected query ${query.slice(0, 40)}`);
    });
    const result = await caller().analysis.forFrame({
      locationIds: ["sheikan"],
      windowStart: "2026-07-01T00:00:00.000Z",
      name: "Sheikan, North Kordofan, Sudan",
    });
    expect(graphqlFetch.mock.calls[0]![1]).toEqual({
      frame: { locationIds: ["sheikan"], eventTypes: [], needSectors: [], windowStart: "2026-07-01T00:00:00.000Z", windowEnd: null },
    });
    expect(result?.scope).toMatchObject({ name: "Sheikan, North Kordofan, Sudan", windowEnd: null });
  });

  it("creates a rolling automation and requests its first version on the same frame", async () => {
    const automation = {
      id: "auto-9",
      locationIds: ["sheikan"],
      eventTypes: [],
      needSectors: [],
      windowStart: "2026-07-01T00:00:00.000Z",
    };
    graphqlFetch
      .mockResolvedValueOnce({ createAnalysisAutomation: automation })
      .mockResolvedValueOnce({ requestAnalysis: { id: "req-1", status: "PENDING" } });
    const result = await caller().analysis.create({ teamId: "t1", locationIds: ["sheikan"], cadence: "daily" });

    const [createQuery, createVars] = graphqlFetch.mock.calls[0]!;
    expect(createQuery).toContain("createAnalysisAutomation");
    const input = (createVars as { input: Record<string, unknown> }).input;
    expect(input).toMatchObject({ teamId: "t1", locationIds: ["sheikan"], cadence: "daily" });
    expect(input.windowStart).toMatch(/T00:00:00\.000Z$/);

    const [requestQuery, requestVars] = graphqlFetch.mock.calls[1]!;
    expect(requestQuery).toContain("requestAnalysis");
    expect(requestVars).toEqual({
      input: {
        teamId: "t1",
        locationIds: ["sheikan"],
        eventTypes: [],
        needSectors: [],
        windowStart: "2026-07-01T00:00:00.000Z",
        windowEnd: null,
      },
    });
    expect(result).toEqual({ id: "auto-9", firstVersionRequested: true });
  });

  it("still creates the analysis when the first-version request fails", async () => {
    graphqlFetch
      .mockResolvedValueOnce({
        createAnalysisAutomation: { id: "auto-9", locationIds: ["x"], eventTypes: [], needSectors: [], windowStart: "2026-07-01T00:00:00.000Z" },
      })
      .mockRejectedValueOnce(new Error("boom"));
    const result = await caller().analysis.create({ teamId: "t1", locationIds: ["x"], cadence: "weekly" });
    expect(result).toEqual({ id: "auto-9", firstVersionRequested: false });
  });

  it("rejects unknown cadences and empty scopes before calling clear-api", async () => {
    await expect(caller().analysis.create({ teamId: "t1", locationIds: ["x"], cadence: "hourly" as "daily" })).rejects.toThrow();
    await expect(caller().analysis.create({ teamId: "t1", locationIds: [], cadence: "weekly" })).rejects.toThrow();
    expect(graphqlFetch).not.toHaveBeenCalled();
  });

  it("removes an automation", async () => {
    graphqlFetch.mockResolvedValueOnce({ deleteAnalysisAutomation: true });
    await caller().analysis.remove({ id: "auto-1" });
    expect(graphqlFetch.mock.calls[0]![1]).toEqual({ id: "auto-1" });
  });

  it("merges a multi-district scope's events, newest first, without duplicates", async () => {
    const ev = (id: string, at: string) => ({
      id,
      title: id,
      types: [],
      severity: null,
      firstSignalCreatedAt: at,
      lastSignalCreatedAt: at,
      casualties: null,
      populationDisplaced: null,
      representativePoint: null,
      generalLocation: null,
    });
    graphqlFetch
      .mockResolvedValueOnce({ eventsPage: { totalCount: 2, items: [ev("a", "2026-09-10T00:00:00Z"), ev("shared", "2026-09-01T00:00:00Z")] } })
      .mockResolvedValueOnce({ eventsPage: { totalCount: 2, items: [ev("b", "2026-09-20T00:00:00Z"), ev("shared", "2026-09-01T00:00:00Z")] } });
    const result = await caller().analysis.events({ locationIds: ["d1", "d2"], from: "2026-07-01T00:00:00.000Z" });
    expect(graphqlFetch.mock.calls.map(([, v]) => (v as { input: { locationId: string } }).input.locationId)).toEqual(["d1", "d2"]);
    expect(result.items.map((e) => e.id)).toEqual(["b", "a", "shared"]);
    expect(result.totalCount).toBe(4);
  });
});
