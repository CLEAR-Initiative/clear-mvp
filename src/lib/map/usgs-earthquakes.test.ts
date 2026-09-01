import { describe, expect, it } from "vitest";
import {
  ageDaysSinceEpoch,
  filterSeismicMapCollection,
  formatSeismicFreshness,
  isSeismicEventStale,
  SEISMIC_STALE_AFTER_DAYS,
  seismicYearMonths,
  toSeismicMapCollection,
  utcYearMonthFromEpochMs,
  type SeismicMapCollection,
  type UsgsFdsnCollection,
} from "./usgs-earthquakes";

describe("toSeismicMapCollection", () => {
  // Relative to wall clock — slimProperties ages events with Date.now().
  const now = new Date();
  const recentMs = now.getTime() - 5 * 24 * 60 * 60 * 1000; // 5 days ago
  const staleMs = now.getTime() - 35 * 24 * 60 * 60 * 1000; // 35 days ago

  const input: UsgsFdsnCollection = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        id: "us6000tk74",
        geometry: {
          type: "Point",
          coordinates: [-28.9899, -60.2445, 10], // lng, lat, depth
        },
        properties: {
          id: "us6000tk74",
          mag: 6.0,
          magType: "mww",
          place: "South Sandwich Islands region",
          title: "M 6.0 - South Sandwich Islands region",
          time: recentMs,
          updated: recentMs + 1000,
          type: "earthquake",
          alert: "green",
          mmi: 3.402,
          url: "https://earthquake.usgs.gov/earthquakes/eventpage/us6000tk74",
          types: ",shakemap,moment-tensor,origin,",
          status: "reviewed",
          sig: 554,
          net: "us",
          code: "6000tk74",
          // fat props to drop:
          ids: ",usauto6000tk74,us6000tk74,",
          sources: ",usauto,us,",
          nst: 76,
          dmin: 7.224,
          rms: 0.56,
          gap: 64,
        },
      },
      {
        type: "Feature",
        id: "ci40123456",
        geometry: {
          type: "Point",
          coordinates: [-118.5, 34.2, 8.5],
        },
        properties: {
          id: "ci40123456",
          mag: 3.2,
          magType: "ml",
          place: "5 km NE of Los Angeles",
          title: "M 3.2 - Los Angeles area",
          time: staleMs,
          updated: staleMs + 500,
          type: "earthquake",
          alert: null,
          mmi: null,
          url: "https://earthquake.usgs.gov/earthquakes/eventpage/ci40123456",
          types: ",origin,phase-data,",
          status: "automatic",
        },
      },
      {
        type: "Feature",
        id: "quarry123",
        geometry: {
          type: "Point",
          coordinates: [-120, 35, 0],
        },
        properties: {
          id: "quarry123",
          mag: 2.1,
          magType: "ml",
          place: "Quarry blast",
          title: "M 2.1 - Quarry",
          time: recentMs,
          updated: recentMs,
          type: "quarry blast",
          alert: null,
          status: "automatic",
        },
      },
    ],
  };

  it("filters to earthquakes only and slims properties", () => {
    const out = toSeismicMapCollection(input, {
      source: "usgs-spike",
      minMagnitude: 5.5,
      windowDays: 30,
    });

    expect(out.features).toHaveLength(2);
    expect(out.features.map((f) => f.properties.id)).toEqual([
      "us6000tk74",
      "ci40123456",
    ]);

    // First feature (recent, has shakemap)
    const recent = out.features[0]!;
    expect(recent.properties.mag).toBe(6.0);
    expect(recent.properties.mag_type).toBe("mww");
    expect(recent.properties.place).toBe("South Sandwich Islands region");
    expect(recent.properties.depth_km).toBe(10);
    expect(recent.properties.alert).toBe("green");
    expect(recent.properties.mmi).toBe(3.402);
    expect(recent.properties.has_shakemap).toBe(true);
    expect(recent.properties.status).toBe("reviewed");
    expect(recent.properties.stale).toBe(0);

    // Should not have fat upstream props
    expect(recent.properties).not.toHaveProperty("sig");
    expect(recent.properties).not.toHaveProperty("nst");
    expect(recent.properties).not.toHaveProperty("dmin");
    expect(recent.properties).not.toHaveProperty("rms");
    expect(recent.properties).not.toHaveProperty("gap");

    // Second feature (stale, no shakemap)
    const stale = out.features[1]!;
    expect(stale.properties.mag).toBe(3.2);
    expect(stale.properties.has_shakemap).toBe(false);
    expect(stale.properties.status).toBe("automatic");
    expect(stale.properties.stale).toBe(1);
    expect(stale.properties.age_days).toBeGreaterThanOrEqual(SEISMIC_STALE_AFTER_DAYS);
  });

  it("excludes non-earthquake event types", () => {
    const out = toSeismicMapCollection(input, { source: "usgs-spike" });
    const ids = out.features.map((f) => f.properties.id);
    expect(ids).not.toContain("quarry123");
  });

  it("includes meta with reduction stats", () => {
    const out = toSeismicMapCollection(input, {
      source: "usgs-ingest",
      minMagnitude: 5.5,
      windowDays: 30,
      bbox: [-180, -90, 180, 90],
    });

    expect(out.meta.source).toBe("usgs-ingest");
    expect(out.meta.feature_count).toBe(2);
    expect(out.meta.min_magnitude).toBe(5.5);
    expect(out.meta.window_days).toBe(30);
    expect(out.meta.bbox).toEqual([-180, -90, 180, 90]);
    expect(out.meta.bytes_in).toBeGreaterThan(0);
    expect(out.meta.bytes_out).toBeGreaterThan(0);
    expect(out.meta.reduction_ratio).toBeLessThan(1);
    expect(out.meta.pulled_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("handles missing or null geometry gracefully", () => {
    const badInput: UsgsFdsnCollection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          id: "no-geom",
          geometry: null,
          properties: {
            id: "no-geom",
            mag: 5.0,
            type: "earthquake",
            time: recentMs,
          },
        },
      ],
    };

    const out = toSeismicMapCollection(badInput, { source: "usgs-spike" });
    expect(out.features).toHaveLength(0);
  });
});

describe("ageDaysSinceEpoch", () => {
  const now = new Date("2026-08-01T12:00:00Z");
  const fiveDaysAgoMs = now.getTime() - 5 * 24 * 60 * 60 * 1000;
  const thirtyDaysAgoMs = now.getTime() - 30 * 24 * 60 * 60 * 1000;

  it("calculates age in days from ms epoch", () => {
    expect(ageDaysSinceEpoch(fiveDaysAgoMs, now)).toBe(5);
    expect(ageDaysSinceEpoch(thirtyDaysAgoMs, now)).toBe(30);
  });

  it("returns 0 for future timestamps", () => {
    const futureMs = now.getTime() + 1000 * 60 * 60;
    expect(ageDaysSinceEpoch(futureMs, now)).toBe(0);
  });

  it("returns null for invalid timestamps", () => {
    expect(ageDaysSinceEpoch(null, now)).toBe(null);
    expect(ageDaysSinceEpoch(undefined, now)).toBe(null);
    expect(ageDaysSinceEpoch(NaN, now)).toBe(null);
  });
});

describe("isSeismicEventStale", () => {
  it("marks events >= 30 days as stale", () => {
    expect(SEISMIC_STALE_AFTER_DAYS).toBe(30);
    expect(isSeismicEventStale(29)).toBe(false);
    expect(isSeismicEventStale(30)).toBe(true);
    expect(isSeismicEventStale(35)).toBe(true);
  });

  it("returns false for null age", () => {
    expect(isSeismicEventStale(null)).toBe(false);
  });
});

describe("formatSeismicFreshness", () => {
  const now = new Date("2026-08-01T12:00:00Z");
  const todayMs = now.getTime();
  const yesterdayMs = now.getTime() - 24 * 60 * 60 * 1000;
  const fiveDaysAgoMs = now.getTime() - 5 * 24 * 60 * 60 * 1000;

  it("formats earthquake age with date and relative time", () => {
    expect(formatSeismicFreshness(todayMs, 0)).toBe("2026-08-01 (today)");
    expect(formatSeismicFreshness(yesterdayMs, 1)).toBe("2026-07-31 (1 day ago)");
    expect(formatSeismicFreshness(fiveDaysAgoMs, 5)).toBe("2026-07-27 (5 days ago)");
  });

  it("returns fallback for unknown time", () => {
    expect(formatSeismicFreshness(null)).toBe("Time unknown");
    expect(formatSeismicFreshness(undefined)).toBe("Time unknown");
  });
});

describe("filterSeismicMapCollection", () => {
  const july = Date.parse("2026-07-28T08:00:00.000Z");
  const august = Date.parse("2026-08-10T08:00:00.000Z");

  const collection: SeismicMapCollection = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        id: "eq-jul",
        geometry: { type: "Point", coordinates: [69, 34, 10] },
        properties: {
          id: "eq-jul",
          mag: 5.2,
          mag_type: "mww",
          place: "Hindu Kush",
          title: "M 5.2 - Hindu Kush",
          time: july,
          updated: july,
          depth_km: 10,
          alert: null,
          mmi: 4,
          url: null,
          has_shakemap: true,
          status: "reviewed",
          age_days: 28,
          stale: 0,
        },
      },
      {
        type: "Feature",
        id: "eq-aug",
        geometry: { type: "Point", coordinates: [69.2, 34.5, 12] },
        properties: {
          id: "eq-aug",
          mag: 6.1,
          mag_type: "mww",
          place: "Kabul",
          title: "M 6.1 - Kabul",
          time: august,
          updated: august,
          depth_km: 12,
          alert: "yellow",
          mmi: 6,
          url: null,
          has_shakemap: true,
          status: "reviewed",
          age_days: 15,
          stale: 0,
        },
      },
    ],
    shakemaps: [
      { eventId: "eq-jul", type: "FeatureCollection", features: [] },
      { eventId: "eq-aug", type: "FeatureCollection", features: [] },
    ],
    meta: {
      source: "usgs-spike",
      feature_count: 2,
      min_magnitude: 4,
      window_days: 30,
      bbox: null,
      pulled_at: "2026-08-25T12:00:00.000Z",
      bytes_in: 1,
      bytes_out: 1,
      reduction_ratio: 1,
    },
  };

  it("maps USGS time to UTC YYYY-MM", () => {
    expect(utcYearMonthFromEpochMs(july)).toBe("2026-07");
    expect(utcYearMonthFromEpochMs(august)).toBe("2026-08");
    expect(utcYearMonthFromEpochMs(null)).toBeNull();
  });

  it("lists earthquake months newest first", () => {
    expect(seismicYearMonths(collection)).toEqual(["2026-08", "2026-07"]);
  });

  it("drops ShakeMaps whose epicenter is outside the selected month", () => {
    const augustOnly = filterSeismicMapCollection(collection, "2026-08");
    expect(augustOnly.features.map((f) => f.properties.id)).toEqual(["eq-aug"]);
    expect(augustOnly.shakemaps?.map((s) => s.eventId)).toEqual(["eq-aug"]);
    expect(augustOnly.meta.feature_count).toBe(1);
  });

  it("returns the full window when Entire period is selected", () => {
    expect(filterSeismicMapCollection(collection, null)).toBe(collection);
  });
});
