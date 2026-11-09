import { describe, expect, it } from "vitest";
import { filterSources, weekOf, withShares, type GqlLocationPrecisionMetrics } from "./location-precision";

const RAW: GqlLocationPrecisionMetrics = {
  from: "2026-10-26T00:00:00.000Z",
  to: "2026-11-08T23:59:59.999Z",
  signalsInRange: 30,
  bySource: [
    { source: "sudan-war-x", total: 20, noLocation: 2, country: 4, state: 6, district: 6, point: 2 },
    { source: "dataminr", total: 10, noLocation: 0, country: 1, state: 0, district: 0, point: 9 },
  ],
  weekly: [
    { isoWeek: "2026-W44", weekStart: "2026-10-26T00:00:00.000Z", source: "sudan-war-x", total: 12, noLocation: 2, country: 2, state: 4, district: 3, point: 1, isPartial: false },
    { isoWeek: "2026-W45", weekStart: "2026-11-02T00:00:00.000Z", source: "sudan-war-x", total: 8, noLocation: 0, country: 2, state: 2, district: 3, point: 1, isPartial: true },
    { isoWeek: "2026-W44", weekStart: "2026-10-26T00:00:00.000Z", source: "dataminr", total: 10, noLocation: 0, country: 1, state: 0, district: 0, point: 9, isPartial: false },
    { isoWeek: "2026-W45", weekStart: "2026-11-02T00:00:00.000Z", source: "dataminr", total: 0, noLocation: 0, country: 0, state: 0, district: 0, point: 0, isPartial: true },
  ],
  corrections: { open: 2, accepted: 1, corrected: 1, declined: 0, superseded: 1 },
};

describe("withShares", () => {
  it("adds up the sources and derives district-or-finer and each level's share", () => {
    const m = withShares(RAW);
    expect(m.totals).toMatchObject({ total: 30, fine: 17, noLocation: 2, country: 5, state: 6, district: 6, point: 11 });
    expect(m.totals.fineShare).toBeCloseTo(17 / 30);
    expect(m.totals.shares.noLocation).toBeCloseTo(2 / 30);
    expect(m.bySource[0]).toMatchObject({ source: "sudan-war-x", fine: 8, fineShare: 0.4 });
    expect(m.bySource[1]!.shares.point).toBe(0.9);
    expect(m.weekly[1]).toMatchObject({ isoWeek: "2026-W45", source: "sudan-war-x", fine: 4, fineShare: 0.5, isPartial: true });
    expect(m.weekly[3]!.fineShare).toBeNull();
    expect(m.corrections).toEqual({ open: 2, accepted: 1, corrected: 1, declined: 0, superseded: 1, decided: 2, total: 5 });
  });

  it("gives null shares with nothing in range", () => {
    const m = withShares({ ...RAW, signalsInRange: 0, bySource: [], weekly: [] });
    expect(m.totals.total).toBe(0);
    expect(m.totals.fineShare).toBeNull();
    expect(m.bySource).toEqual([]);
  });
});

describe("filterSources", () => {
  it("keeps the chosen sources and re-adds the totals from their counts", () => {
    const m = filterSources(withShares(RAW), ["dataminr"]);
    expect(m.bySource.map((row) => row.source)).toEqual(["dataminr"]);
    expect(m.weekly.every((row) => row.source === "dataminr")).toBe(true);
    expect(m.totals).toMatchObject({ total: 10, fine: 9, fineShare: 0.9 });
  });

  it("with no pick, returns the metrics unchanged", () => {
    const m = withShares(RAW);
    expect(filterSources(m, [])).toBe(m);
  });
});

describe("weekOf", () => {
  const weeks = ["2026-10-26T00:00:00.000Z", "2026-11-02T00:00:00.000Z"];
  it("finds the ISO week an instant falls in, or null outside every week", () => {
    expect(weekOf(weeks, "2026-10-29T18:33:00Z")).toBe("2026-10-26T00:00:00.000Z");
    expect(weekOf(weeks, "2026-11-02T00:00:00Z")).toBe("2026-11-02T00:00:00.000Z");
    expect(weekOf(weeks, "2026-11-09T00:00:00Z")).toBeNull();
    expect(weekOf(weeks, "2026-10-20T00:00:00Z")).toBeNull();
  });
});
