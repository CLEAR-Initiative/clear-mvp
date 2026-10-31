import { describe, expect, it } from "vitest";
import { EMPTY_URL_STATE, filtersFromUrl, metricsUrlSearch, parseMetricsUrl } from "./metrics-url-state";

describe("parseMetricsUrl", () => {
  it("reads every key, normalising the bucket size and splitting the sources", () => {
    const state = parseMetricsUrl(
      new URLSearchParams("from=2026-10-25&to=2026-10-31&location=loc-sdn&metric=DISTRICT_OR_FINER&granularity=Day&lines=all&sources=sudan-war-x,%20dataminr,sudan-war-x"),
    );
    expect(state).toEqual({
      from: "2026-10-25",
      to: "2026-10-31",
      locationId: "loc-sdn",
      metric: "DISTRICT_OR_FINER",
      granularity: "DAY",
      lines: "all",
      sources: ["sudan-war-x", "dataminr"],
    });
  });

  it("treats anything malformed as unset", () => {
    expect(parseMetricsUrl(new URLSearchParams(""))).toEqual(EMPTY_URL_STATE);
    expect(
      parseMetricsUrl(new URLSearchParams("from=yesterday&to=2026-13-45&metric=drop%20table&granularity=hourly&lines=maybe&location=%20%20")),
    ).toEqual(EMPTY_URL_STATE);
    expect(parseMetricsUrl(new URLSearchParams("metric=detected_same_day")).metric).toBeNull();
    expect(parseMetricsUrl(new URLSearchParams("sources=,,")).sources).toEqual([]);
  });
});

describe("metricsUrlSearch", () => {
  it("writes a patch over the current search, removing what the patch empties", () => {
    const current = new URLSearchParams("from=2026-10-25&to=2026-10-31&metric=DISTRICT_OR_FINER&lines=source&sources=a,b");
    expect(metricsUrlSearch({ granularity: "WEEK", lines: "all" }, current)).toBe("from=2026-10-25&to=2026-10-31&metric=DISTRICT_OR_FINER&lines=all&sources=a%2Cb&granularity=week");
    expect(metricsUrlSearch({ from: "", to: "", sources: [] }, current)).toBe("metric=DISTRICT_OR_FINER&lines=source");
    expect(metricsUrlSearch({ locationId: "loc-sdn" })).toBe("location=loc-sdn");
    expect(metricsUrlSearch({ locationId: null }, new URLSearchParams("location=loc-sdn"))).toBe("");
    expect(metricsUrlSearch({})).toBe("");
  });

  it("round-trips through parseMetricsUrl", () => {
    const state = { from: "2026-10-25", to: "2026-10-31", locationId: "loc-sdn", metric: "DETECTED_SAME_DAY", granularity: "MONTH" as const, lines: "source" as const, sources: ["sudan-war-x"] };
    expect(parseMetricsUrl(new URLSearchParams(metricsUrlSearch(state)))).toEqual(state);
  });
});

describe("filtersFromUrl", () => {
  it("picks the page's filters out of the URL state", () => {
    expect(filtersFromUrl({ ...EMPTY_URL_STATE, from: "2026-10-25", locationId: "loc-sdn" })).toEqual({ from: "2026-10-25", to: "", locationId: "loc-sdn" });
    expect(filtersFromUrl(EMPTY_URL_STATE)).toEqual({ from: "", to: "", locationId: null });
  });
});
