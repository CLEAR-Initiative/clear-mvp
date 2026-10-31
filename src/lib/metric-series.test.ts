import { describe, expect, it } from "vitest";
import {
  beforeAfter,
  bucketEnd,
  bucketsOfGroup,
  comparisonFrom,
  defaultGranularity,
  definitionsByDimension,
  emphasisFor,
  latestMarkerInRange,
  markersByBucket,
  markersFor,
  markersInRange,
  totalsByBucket,
  utcInstantFromLocalInput,
  type MetricDefinition,
  type MetricSeries,
  type SeriesMarker,
} from "./metric-series";

const DEFINITIONS: MetricDefinition[] = [
  { key: "DETECTED_BY_NEXT_DAY", name: "Detected by next day", dimension: "TIMELINESS", unit: "EVENTS", description: "d", timeBasis: "t", groupable: false, adr: "ADR-0011" },
  { key: "DETECTED_SAME_DAY", name: "Detected same day", dimension: "TIMELINESS", unit: "EVENTS", description: "d", timeBasis: "t", groupable: false, adr: "ADR-0011" },
  { key: "DISTRICT_OR_FINER", name: "At district or finer", dimension: "ACCURACY", unit: "SIGNALS", description: "d", timeBasis: "t", groupable: true, adr: "ADR-0012" },
  { key: "SOURCES_ON_SCHEDULE", name: "Sources on schedule", dimension: "RELIABILITY", unit: "SIGNALS", description: "d", timeBasis: "t", groupable: false, adr: "ADR-0016" },
];

/** The 2026 changes as clear-api's `metricAnnotations` returns them on dev. */
const marker = (id: string, at: string, label: string, metricKeys: string[] = ["DISTRICT_OR_FINER"]): SeriesMarker => ({
  id,
  at,
  label,
  description: null,
  link: null,
  metricKeys,
});
const MARKERS: SeriesMarker[] = [
  marker("a4", "2026-10-31T13:45:00.000Z", "Arabic gazetteer names"),
  marker("a1", "2026-10-29T18:33:00.000Z", "Geocoding inside the model's area"),
  marker("a2", "2026-10-31T13:13:00.000Z", "darfur24 located from text"),
  marker("a3", "2026-10-31T13:13:00.000Z", "Incident site over impact area (prompt v3)"),
  marker("t1", "2026-10-30T09:00:00.000Z", "Onset parser fix", ["DETECTED_BY_NEXT_DAY"]),
];

const GROUPED: MetricSeries = {
  metric: "DISTRICT_OR_FINER",
  granularity: "DAY",
  from: "2026-10-27T00:00:00.000Z",
  to: "2026-10-28T23:59:59.999Z",
  groups: ["sudan-war-x", "dataminr"],
  buckets: [
    { start: "2026-10-27T00:00:00.000Z", label: "2026-10-27", isPartial: false, group: "sudan-war-x", numerator: 33, denominator: 85 },
    { start: "2026-10-28T00:00:00.000Z", label: "2026-10-28", isPartial: false, group: "sudan-war-x", numerator: 39, denominator: 99 },
    { start: "2026-10-27T00:00:00.000Z", label: "2026-10-27", isPartial: false, group: "dataminr", numerator: 10, denominator: 10 },
    { start: "2026-10-28T00:00:00.000Z", label: "2026-10-28", isPartial: false, group: "dataminr", numerator: 9, denominator: 10 },
  ],
};

describe("definitionsByDimension and emphasisFor", () => {
  it("groups the registry in the Notion table's dimension order, leaving empty dimensions out", () => {
    expect(definitionsByDimension(DEFINITIONS).map((g) => [g.dimension, g.definitions.map((d) => d.key)])).toEqual([
      ["TIMELINESS", ["DETECTED_BY_NEXT_DAY", "DETECTED_SAME_DAY"]],
      ["ACCURACY", ["DISTRICT_OR_FINER"]],
      ["RELIABILITY", ["SOURCES_ON_SCHEDULE"]],
    ]);
    expect(definitionsByDimension([])).toEqual([]);
  });

  it("emphasises the text-only feed on a grouped metric when it is among the groups", () => {
    expect(emphasisFor(DEFINITIONS[2], ["sudan-war-x", "dataminr"])).toBe("sudan-war-x");
    expect(emphasisFor(DEFINITIONS[2], ["dataminr"])).toBeNull();
    expect(emphasisFor(DEFINITIONS[0], ["sudan-war-x"])).toBeNull();
    expect(emphasisFor(null, ["sudan-war-x"])).toBeNull();
  });
});

describe("totalsByBucket and bucketsOfGroup", () => {
  it("adds the groups up per bucket, ascending, and picks one group's buckets", () => {
    expect(totalsByBucket(GROUPED)).toEqual([
      { start: "2026-10-27T00:00:00.000Z", label: "2026-10-27", isPartial: false, numerator: 43, denominator: 95 },
      { start: "2026-10-28T00:00:00.000Z", label: "2026-10-28", isPartial: false, numerator: 48, denominator: 109 },
    ]);
    expect(bucketsOfGroup(GROUPED, "dataminr").map((b) => b.numerator)).toEqual([10, 9]);
    const single: MetricSeries = {
      ...GROUPED,
      metric: "DETECTED_SAME_DAY",
      groups: [],
      buckets: [{ start: "2026-10-27T00:00:00.000Z", label: "2026-10-27", isPartial: true, group: null, numerator: 1, denominator: 4 }],
    };
    expect(totalsByBucket(single)).toEqual([{ start: "2026-10-27T00:00:00.000Z", label: "2026-10-27", isPartial: true, numerator: 1, denominator: 4 }]);
  });
});

describe("defaultGranularity", () => {
  it("reads days up to eight weeks, weeks beyond, and weeks for clear-api's default range", () => {
    expect(defaultGranularity(undefined, undefined)).toBe("WEEK");
    expect(defaultGranularity("2026-10-27T00:00:00.000Z", "2026-10-31T23:59:59.999Z")).toBe("DAY");
    expect(defaultGranularity("2026-09-01T00:00:00.000Z", "2026-10-26T23:59:59.999Z")).toBe("DAY");
    expect(defaultGranularity("2026-08-01T00:00:00.000Z", "2026-10-31T23:59:59.999Z")).toBe("WEEK");
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
  it("keep to the metric they are tagged with, oldest first", () => {
    expect(markersFor("DISTRICT_OR_FINER", MARKERS).map((m) => m.id)).toEqual(["a1", "a2", "a3", "a4"]);
    expect(markersFor("DETECTED_BY_NEXT_DAY", MARKERS).map((m) => m.id)).toEqual(["t1"]);
    expect(markersFor("DETECTED_SAME_DAY", MARKERS)).toEqual([]);
  });

  it("fall into the bucket that holds their instant, several per bucket, none outside the buckets", () => {
    const byDay = markersByBucket(BUCKETS_OCT, markersFor("DISTRICT_OR_FINER", MARKERS), "DAY");
    expect([...byDay.keys()]).toEqual(["2026-10-29", "2026-10-31"]);
    expect(byDay.get("2026-10-31")!.map((m) => m.id)).toEqual(["a2", "a3", "a4"]);
    const byWeek = markersByBucket([{ start: "2026-10-26T00:00:00.000Z", label: "2026-W44" }], markersFor("DISTRICT_OR_FINER", MARKERS), "WEEK");
    expect(byWeek.get("2026-W44")).toHaveLength(4);
    expect(markersByBucket([{ start: "2026-10-19T00:00:00.000Z", label: "2026-W43" }], markersFor("DISTRICT_OR_FINER", MARKERS), "WEEK").size).toBe(0);
  });

  it("keep to the selected dates, and name the latest inside them", () => {
    expect(markersInRange("DISTRICT_OR_FINER", "2026-10-01T00:00:00.000Z", "2026-10-20T23:59:59.999Z", MARKERS)).toEqual([]);
    expect(markersInRange("DISTRICT_OR_FINER", "2026-10-25T00:00:00.000Z", "2026-10-30T23:59:59.999Z", MARKERS).map((m) => m.id)).toEqual(["a1"]);
    expect(latestMarkerInRange("DISTRICT_OR_FINER", "2026-10-25T00:00:00.000Z", "2026-10-30T23:59:59.999Z", MARKERS)?.id).toBe("a1");
    expect(latestMarkerInRange("DISTRICT_OR_FINER", "2026-10-25T00:00:00.000Z", "2026-11-05T23:59:59.999Z", MARKERS)?.id).toBe("a4");
    expect(latestMarkerInRange("DETECTED_SAME_DAY", "2026-10-01T00:00:00.000Z", "2026-11-05T23:59:59.999Z", MARKERS)).toBeNull();
  });
});

describe("beforeAfter", () => {
  const geocode = MARKERS[1]!;
  const day = (d: number, numerator: number, denominator: number) => ({
    start: `2026-10-${String(d).padStart(2, "0")}T00:00:00.000Z`,
    label: `2026-10-${d}`,
    isPartial: false,
    numerator,
    denominator,
  });

  it("starts its daily read seven days before the marker's day", () => {
    expect(comparisonFrom(geocode)).toBe("2026-10-22T00:00:00.000Z");
  });

  it("compares the seven days before the marker's day with the days after it, leaving the marker's day out", () => {
    const days = [day(21, 10, 100), day(22, 30, 100), day(27, 33, 85), day(28, 39, 99), day(29, 37, 110), day(30, 47, 74), day(31, 39, 60)];
    const c = beforeAfter(days, geocode);
    expect(c.before).toEqual({ numerator: 102, denominator: 284, share: 102 / 284 });
    expect(c.after).toEqual({ numerator: 86, denominator: 134, share: 86 / 134 });
    expect(c.tooFew).toBe(false);
  });

  it("is too few to show when either side has under ten units", () => {
    expect(beforeAfter([day(28, 3, 9), day(30, 47, 74)], geocode).tooFew).toBe(true);
    expect(beforeAfter([day(28, 30, 90)], geocode).tooFew).toBe(true);
    expect(beforeAfter([], geocode).before.share).toBeNull();
  });
});

describe("utcInstantFromLocalInput", () => {
  it("reads a datetime-local value as UTC and refuses anything that is not a date", () => {
    expect(utcInstantFromLocalInput("2026-10-31T13:13")).toBe("2026-10-31T13:13:00.000Z");
    expect(utcInstantFromLocalInput("2026-10-31T13:13:00Z")).toBe("2026-10-31T13:13:00.000Z");
    expect(utcInstantFromLocalInput("")).toBeNull();
    expect(utcInstantFromLocalInput("not a date")).toBeNull();
  });
});
