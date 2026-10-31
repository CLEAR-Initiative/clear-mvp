import { describe, expect, it } from "vitest";
import {
  MARKERS,
  beforeAfter,
  bucketEnd,
  bucketsOfGroup,
  defaultGranularity,
  detectionSeries,
  latestMarkerInRange,
  markersByBucket,
  markersFor,
  precisionSeries,
  totalsByBucket,
  type GqlDetectionSeries,
  type GqlLocationPrecisionSeries,
  type SeriesMarker,
} from "./metric-series";

const DETECTION: GqlDetectionSeries = {
  from: "2026-10-05T00:00:00.000Z",
  to: "2026-10-18T23:59:59.999Z",
  granularity: "WEEK",
  series: [
    { start: "2026-10-05T00:00:00.000Z", label: "2026-W41", isPartial: false, counted: 4, sameDay: 1, byNextDay: 3 },
    { start: "2026-10-12T00:00:00.000Z", label: "2026-W42", isPartial: true, counted: 0, sameDay: 0, byNextDay: 0 },
  ],
};

const PRECISION: GqlLocationPrecisionSeries = {
  from: "2026-10-27T00:00:00.000Z",
  to: "2026-10-28T23:59:59.999Z",
  granularity: "DAY",
  bySource: [
    { source: "sudan-war-x", total: 184 },
    { source: "dataminr", total: 20 },
  ],
  series: [
    { start: "2026-10-27T00:00:00.000Z", label: "2026-10-27", isPartial: false, source: "sudan-war-x", total: 85, district: 30, point: 3 },
    { start: "2026-10-28T00:00:00.000Z", label: "2026-10-28", isPartial: false, source: "sudan-war-x", total: 99, district: 35, point: 4 },
    { start: "2026-10-27T00:00:00.000Z", label: "2026-10-27", isPartial: false, source: "dataminr", total: 10, district: 0, point: 10 },
    { start: "2026-10-28T00:00:00.000Z", label: "2026-10-28", isPartial: false, source: "dataminr", total: 10, district: 1, point: 8 },
  ],
};

describe("detectionSeries", () => {
  it("reads same day or by next day over the counted events, as one ungrouped series", () => {
    const sameDay = detectionSeries("detectedSameDay", DETECTION);
    expect(sameDay).toMatchObject({ metric: "detectedSameDay", granularity: "WEEK", groups: [] });
    expect(sameDay.buckets).toEqual([
      { start: "2026-10-05T00:00:00.000Z", label: "2026-W41", isPartial: false, group: null, numerator: 1, denominator: 4 },
      { start: "2026-10-12T00:00:00.000Z", label: "2026-W42", isPartial: true, group: null, numerator: 0, denominator: 0 },
    ]);
    expect(detectionSeries("detectedByNextDay", DETECTION).buckets[0]).toMatchObject({ numerator: 3, denominator: 4 });
  });
});

describe("precisionSeries", () => {
  it("reads district plus point over the source's signals, grouped by source in clear-api's order", () => {
    const s = precisionSeries(PRECISION);
    expect(s.groups).toEqual(["sudan-war-x", "dataminr"]);
    expect(s.buckets[0]).toEqual({ start: "2026-10-27T00:00:00.000Z", label: "2026-10-27", isPartial: false, group: "sudan-war-x", numerator: 33, denominator: 85 });
    expect(s.buckets[3]).toMatchObject({ group: "dataminr", numerator: 9, denominator: 10 });
  });
});

describe("totalsByBucket and bucketsOfGroup", () => {
  it("adds the groups up per bucket, ascending, and picks one group's buckets", () => {
    const s = precisionSeries(PRECISION);
    expect(totalsByBucket(s)).toEqual([
      { start: "2026-10-27T00:00:00.000Z", label: "2026-10-27", isPartial: false, numerator: 43, denominator: 95 },
      { start: "2026-10-28T00:00:00.000Z", label: "2026-10-28", isPartial: false, numerator: 48, denominator: 109 },
    ]);
    expect(bucketsOfGroup(s, "dataminr").map((b) => b.numerator)).toEqual([10, 9]);
    // An ungrouped series comes back as is.
    const d = detectionSeries("detectedSameDay", DETECTION);
    expect(totalsByBucket(d).map((b) => [b.numerator, b.denominator])).toEqual([
      [1, 4],
      [0, 0],
    ]);
  });
});

describe("defaultGranularity", () => {
  it("reads days up to eight weeks, weeks beyond, and weeks for clear-api's default range", () => {
    expect(defaultGranularity(undefined, undefined)).toBe("WEEK");
    expect(defaultGranularity("2026-10-27T00:00:00.000Z", "2026-10-31T23:59:59.999Z")).toBe("DAY");
    expect(defaultGranularity("2026-09-01T00:00:00.000Z", "2026-10-26T23:59:59.999Z")).toBe("DAY");
    expect(defaultGranularity("2026-08-01T00:00:00.000Z", "2026-10-31T23:59:59.999Z")).toBe("WEEK");
    // Only one end given: the other defaults as clear-api does (now, or 11 weeks back).
    expect(defaultGranularity("2026-10-20T00:00:00.000Z", undefined, new Date("2026-10-31T12:00:00Z"))).toBe("DAY");
    expect(defaultGranularity(undefined, "2026-10-31T23:59:59.999Z")).toBe("WEEK");
    expect(defaultGranularity("not a date", "2026-10-31T23:59:59.999Z")).toBe("WEEK");
  });
});

describe("bucketEnd", () => {
  it("is the first instant after the bucket, for a day, a week and a month", () => {
    expect(new Date(bucketEnd("2026-10-29T00:00:00.000Z", "DAY")).toISOString()).toBe("2026-10-30T00:00:00.000Z");
    expect(new Date(bucketEnd("2026-10-26T00:00:00.000Z", "WEEK")).toISOString()).toBe("2026-11-02T00:00:00.000Z");
    expect(new Date(bucketEnd("2026-12-01T00:00:00.000Z", "MONTH")).toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
});

const BUCKETS_OCT = Array.from({ length: 7 }, (_, i) => {
  const day = 25 + i;
  return { start: `2026-10-${day}T00:00:00.000Z`, label: `2026-10-${day}` };
});

describe("markers", () => {
  it("bear on district or finer only, oldest first", () => {
    expect(markersFor("districtOrFiner").map((m) => m.key)).toEqual(["geocodeInArea", "darfur24Locator", "locationV3Prompt", "arabicGazetteer"]);
    expect(markersFor("detectedSameDay")).toEqual([]);
    expect(MARKERS.every((m) => m.metrics.includes("districtOrFiner"))).toBe(true);
  });

  it("fall into the bucket that holds their instant, several per bucket, none outside the range", () => {
    const byDay = markersByBucket(BUCKETS_OCT, markersFor("districtOrFiner"), "DAY");
    expect([...byDay.keys()]).toEqual(["2026-10-29", "2026-10-31"]);
    expect(byDay.get("2026-10-31")!.map((m) => m.key)).toEqual(["darfur24Locator", "locationV3Prompt", "arabicGazetteer"]);
    const byWeek = markersByBucket([{ start: "2026-10-26T00:00:00.000Z", label: "2026-W44" }], markersFor("districtOrFiner"), "WEEK");
    expect(byWeek.get("2026-W44")).toHaveLength(4);
    expect(markersByBucket([{ start: "2026-10-19T00:00:00.000Z", label: "2026-W43" }], markersFor("districtOrFiner"), "WEEK").size).toBe(0);
  });

  it("names the latest marker inside a range", () => {
    expect(latestMarkerInRange("districtOrFiner", "2026-10-25T00:00:00.000Z", "2026-10-30T23:59:59.999Z")?.key).toBe("geocodeInArea");
    expect(latestMarkerInRange("districtOrFiner", "2026-10-25T00:00:00.000Z", "2026-11-05T23:59:59.999Z")?.key).toBe("arabicGazetteer");
    expect(latestMarkerInRange("districtOrFiner", "2026-10-01T00:00:00.000Z", "2026-10-20T23:59:59.999Z")).toBeNull();
    expect(latestMarkerInRange("detectedByNextDay", "2026-10-01T00:00:00.000Z", "2026-11-05T23:59:59.999Z")).toBeNull();
  });
});

describe("beforeAfter", () => {
  const marker: SeriesMarker = { at: "2026-10-29T18:33:00Z", key: "geocodeInArea", metrics: ["districtOrFiner"] };
  const day = (d: number, numerator: number, denominator: number) => ({
    start: `2026-10-${String(d).padStart(2, "0")}T00:00:00.000Z`,
    label: `2026-10-${d}`,
    isPartial: false,
    numerator,
    denominator,
  });

  it("compares the seven days before the marker's day with the days after it, leaving the marker's day out", () => {
    const days = [day(21, 10, 100), day(22, 30, 100), day(27, 33, 85), day(28, 39, 99), day(29, 37, 110), day(30, 47, 74), day(31, 39, 60)];
    const c = beforeAfter(days, marker);
    // 22 to 28 Oct are the seven days before; 21 Oct is outside them, 29 Oct is the marker's day.
    expect(c.before).toEqual({ numerator: 102, denominator: 284, share: 102 / 284 });
    expect(c.after).toEqual({ numerator: 86, denominator: 134, share: 86 / 134 });
    expect(c.tooFew).toBe(false);
  });

  it("is too few to show when either side has under ten units", () => {
    expect(beforeAfter([day(28, 3, 9), day(30, 47, 74)], marker).tooFew).toBe(true);
    expect(beforeAfter([day(28, 30, 90)], marker).tooFew).toBe(true);
    expect(beforeAfter([], marker).before.share).toBeNull();
  });
});
