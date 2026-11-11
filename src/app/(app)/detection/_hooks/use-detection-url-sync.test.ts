import { describe, expect, it } from "vitest";
import { filtersToParams, rangeKey, rangeOfKey, viewFromParams } from "./use-detection-url-sync";

const ALL_SEV = new Set(["critical", "high", "medium", "low"]);

describe("filtersToParams", () => {
  it("leaves defaults out of the URL, keeping the country", () => {
    expect(
      filtersToParams({
        country: "c-sd",
        locIds: [],
        date: "Last 7 days",
        customRange: null,
        severities: ALL_SEV,
        typeFilters: [],
        sources: null,
      }),
    ).toEqual({ c: "c-sd", r: null, d: null, s: null, t: null, src: null });
  });

  it("writes places, date key, severities, types and sources", () => {
    expect(
      filtersToParams({
        country: "all",
        locIds: ["s-nd", "d-tawila"],
        date: "Last 12 days",
        customRange: null,
        severities: new Set(["high", "critical"]),
        typeFilters: ["Conflict::battles", "Flood::flood"],
        sources: new Set(["ACLED"]),
      }),
    ).toEqual({ c: "all", r: "s-nd|d-tawila", d: "c12", s: "critical,high", t: "Conflict::battles|Flood::flood", src: "ACLED" });
  });

  it("writes a timeline range as whole days, over the rolling date", () => {
    const customRange = { from: "2026-10-03T00:00:00.000Z", to: "2026-11-02T23:59:59.999Z" };
    expect(filtersToParams({ country: null, locIds: [], date: "Last 30 days", customRange, severities: ALL_SEV, typeFilters: [], sources: null }).d).toBe(
      "2026-10-03..2026-11-02",
    );
  });
});

describe("range keys", () => {
  it("round-trips a range of whole UTC days", () => {
    const range = { from: "2026-10-03T00:00:00.000Z", to: "2026-11-02T23:59:59.999Z" };
    expect(rangeOfKey(rangeKey(range))).toEqual(range);
  });

  it("rejects anything else", () => {
    expect(rangeOfKey("7d")).toBeNull();
    expect(rangeOfKey("2026-11-02..2026-10-03")).toBeNull();
    expect(rangeOfKey("2026-13-40..2026-14-01")).toBeNull();
  });
});

describe("viewFromParams", () => {
  it("is null for an ordinary visit, so the saved filters hold", () => {
    expect(viewFromParams(new URLSearchParams(""))).toBeNull();
    expect(viewFromParams(new URLSearchParams("tab=events"))).toBeNull();
  });

  it("sets every filter a link names and resets the ones it leaves out", () => {
    const view = viewFromParams(new URLSearchParams("c=c-sd&s=high"));
    expect(view).toEqual({
      country: "c-sd",
      locIds: [],
      date: "Last 7 days",
      customRange: null,
      severities: new Set(["high"]),
      typeFilters: [],
      sources: null,
    });
  });

  it("reads places, a date key or a range, types and sources", () => {
    const view = viewFromParams(new URLSearchParams("r=s-nd|d-tawila&d=c12&t=conflict::battles|bad&src=ACLED|INSO"));
    expect(view).toMatchObject({ locIds: ["s-nd", "d-tawila"], date: "Last 12 days", customRange: null, typeFilters: ["conflict::battles"], sources: new Set(["ACLED", "INSO"]) });
    expect(viewFromParams(new URLSearchParams("d=2026-10-03..2026-11-02"))).toMatchObject({
      date: "Last 7 days",
      customRange: { from: "2026-10-03T00:00:00.000Z", to: "2026-11-02T23:59:59.999Z" },
    });
  });

  it("falls back to every severity when a link's list holds none it knows", () => {
    expect(viewFromParams(new URLSearchParams("s=extreme"))?.severities).toEqual(ALL_SEV);
  });
});
