import { describe, expect, it } from "vitest";
import {
  easeInOutCubic,
  interpolateSeismicMapCollection,
  matchSeismicSlots,
  resampleLine,
} from "./seismic-transition";
import type { SeismicMapCollection, SeismicMapFeature } from "./usgs-earthquakes";

function pointFeature(
  id: string,
  lng: number,
  lat: number,
): SeismicMapFeature {
  return {
    type: "Feature",
    id,
    geometry: { type: "Point", coordinates: [lng, lat, 10] },
    properties: {
      id,
      mag: 5,
      mag_type: "mww",
      place: id,
      title: id,
      time: 1,
      updated: 1,
      depth_km: 10,
      alert: null,
      mmi: 4,
      url: null,
      has_shakemap: true,
      status: "reviewed",
      age_days: 1,
      stale: 0,
    },
  };
}

function collection(
  features: SeismicMapFeature[],
  shakemaps: SeismicMapCollection["shakemaps"] = [],
): SeismicMapCollection {
  return {
    type: "FeatureCollection",
    features,
    shakemaps,
    meta: {
      source: "usgs-spike",
      feature_count: features.length,
      min_magnitude: 4,
      window_days: 30,
      bbox: null,
      pulled_at: "2026-08-25T12:00:00.000Z",
      bytes_in: 1,
      bytes_out: 1,
      reduction_ratio: 1,
    },
  };
}

describe("easeInOutCubic", () => {
  it("is 0 at start and 1 at end", () => {
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBe(0.5);
  });
});

describe("resampleLine", () => {
  it("keeps endpoints", () => {
    const line = [
      [0, 0],
      [10, 0],
    ];
    const out = resampleLine(line, 5);
    expect(out[0]).toEqual([0, 0]);
    expect(out[out.length - 1]).toEqual([10, 0]);
    expect(out).toHaveLength(5);
  });
});

describe("matchSeismicSlots", () => {
  it("pairs the same USGS id across months", () => {
    const from = collection([pointFeature("eq-a", 69, 34)]);
    const to = collection([pointFeature("eq-a", 70, 35)]);
    expect(matchSeismicSlots(from, to)).toEqual([
      {
        from: expect.objectContaining({ id: "eq-a", lng: 69, lat: 34 }),
        to: expect.objectContaining({ id: "eq-a", lng: 70, lat: 35 }),
      },
    ]);
  });

  it("pairs nearest epicenters when ids differ", () => {
    const from = collection([pointFeature("old", 69, 34)]);
    const to = collection([pointFeature("new", 69.2, 34.1)]);
    const slots = matchSeismicSlots(from, to);
    expect(slots).toHaveLength(1);
    expect(slots[0]!.from?.id).toBe("old");
    expect(slots[0]!.to?.id).toBe("new");
  });
});

describe("interpolateSeismicMapCollection", () => {
  it("moves the epicenter halfway at t=0.5 (eased)", () => {
    const from = collection([pointFeature("old", 0, 0)]);
    const to = collection([pointFeature("new", 10, 0)]);
    const mid = interpolateSeismicMapCollection(from, to, 0.5)!;
    const lng = mid.features[0]!.geometry!.coordinates[0];
    expect(lng).toBe(5);
  });

  it("morphs ShakeMap rings toward the next event instead of dropping them", () => {
    const from = collection([pointFeature("old", 0, 0)], [
      {
        eventId: "old",
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { value: 5, units: "intensity" },
            geometry: {
              type: "LineString",
              coordinates: [
                [0, 1],
                [1, 0],
              ],
            },
          },
        ],
      },
    ]);
    const to = collection([pointFeature("new", 10, 0)], [
      {
        eventId: "new",
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { value: 5, units: "intensity" },
            geometry: {
              type: "LineString",
              coordinates: [
                [10, 1],
                [11, 0],
              ],
            },
          },
        ],
      },
    ]);
    const mid = interpolateSeismicMapCollection(from, to, 0.5)!;
    expect(mid.shakemaps?.[0]?.eventId).toBe("slot-0");
    const ring = mid.shakemaps![0]!.features[0]!.geometry;
    const coords: number[][] =
      ring.type === "MultiLineString"
        ? (ring.coordinates as number[][][])[0]!
        : (ring.coordinates as number[][]);
    const firstLng = coords[0]![0];
    expect(firstLng).toBeGreaterThan(0);
    expect(firstLng).toBeLessThan(10);
  });
});
