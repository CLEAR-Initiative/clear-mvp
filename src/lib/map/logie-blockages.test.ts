import { describe, expect, it } from "vitest";
import {
  ageDaysSince,
  blockagesDisplayLabel,
  BLOCKAGES_STALE_AFTER_DAYS,
  formatBlockagesFreshness,
  isBlockagesStatusStale,
  normalizeBlockagesSourceName,
  simplifyLine,
  toBlockagesMapCollection,
  type LogieAccessCollection,
} from "./logie-blockages";

describe("simplifyLine", () => {
  it("keeps endpoints and drops colinear middles", () => {
    const line = [
      [0, 0],
      [0.5, 0.00001],
      [1, 0],
    ];
    const out = simplifyLine(line, 0.001);
    expect(out).toEqual([
      [0, 0],
      [1, 0],
    ]);
  });

  it("keeps a sharp corner", () => {
    const line = [
      [0, 0],
      [1, 1],
      [2, 0],
    ];
    const out = simplifyLine(line, 0.0001);
    expect(out.length).toBe(3);
  });
});

describe("toBlockagesMapCollection", () => {
  const input: LogieAccessCollection = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [30, 14],
            [30.001, 14],
            [30.002, 14],
            [30.01, 14],
          ],
        },
        properties: {
          feature_type: "road",
          route_id: "1",
          name: "Test",
          status_code: 4,
          status: "Not Passable",
          status_as_of: "2026-01-01T00:00:00Z",
          fclass: "2",
          status_remark: "drop me",
          admin1: "drop me",
        },
      },
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [30, 14] },
        properties: {
          feature_type: "bridge",
          route_id: "2",
          name: "Bridge",
          status_code: 3,
          status: "Passable with restrictions/Damanged",
          status_as_of: null,
        },
      },
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [31, 15] },
        properties: {
          feature_type: "crossing",
          route_id: "x",
          name: "Border",
          status_code: 3,
          status: "Closed",
        },
      },
    ],
  };

  it("keeps only roads + bridges with slim props", () => {
    const out = toBlockagesMapCollection(input, { source: "logie-spike-smoke" });
    expect(out.features).toHaveLength(2);
    expect(out.features.map((f) => f.properties.feature_type)).toEqual([
      "road",
      "bridge",
    ]);
    expect(out.features[0]!.properties).not.toHaveProperty("fclass");
    expect(out.features[0]!.properties).not.toHaveProperty("admin1");
    expect(out.features[0]!.properties.label).toBe("Test");
    expect(out.features[0]!.properties.stale).toBe(1);
    expect(out.features[0]!.properties.age_days).toBeGreaterThanOrEqual(
      BLOCKAGES_STALE_AFTER_DAYS,
    );
    expect(out.features[1]!.properties.label).toBe("Bridge");
    expect(out.features[1]!.properties.stale).toBe(0);
    expect(out.meta.feature_count).toBe(2);
    expect(out.meta.bytes_in).toBeGreaterThan(0);
    expect(out.meta.bytes_out).toBeGreaterThan(0);
  });

  it("falls back label when LogIE name is missing", () => {
    expect(
      blockagesDisplayLabel({
        feature_type: "road",
        name: null,
        status: "Not Passable",
        status_remark: "",
      }),
    ).toBe("Road · Not Passable");
    expect(
      blockagesDisplayLabel({
        feature_type: "road",
        name: null,
        status: "Not Passable",
        status_remark: "Zalingei - Garsila route. Extra detail.",
      }),
    ).toBe("Zalingei - Garsila route");
  });

  it("marks status stale at 15 days and formats freshness", () => {
    expect(BLOCKAGES_STALE_AFTER_DAYS).toBe(15);
    expect(isBlockagesStatusStale(14)).toBe(false);
    expect(isBlockagesStatusStale(15)).toBe(true);
    expect(normalizeBlockagesSourceName("WFP-LC")).toBe(
      "WFP Logistics Cluster",
    );
    expect(normalizeBlockagesSourceName("WFP-;C")).toBe(
      "WFP Logistics Cluster",
    );
    const now = new Date("2026-07-27T12:00:00Z");
    expect(ageDaysSince("2026-07-12T00:00:00Z", now)).toBe(15);
    expect(formatBlockagesFreshness("2026-07-12T00:00:00Z", 15)).toBe(
      "2026-07-12 (15 days ago)",
    );
  });

  it("simplifies road line vertices", () => {
    const out = toBlockagesMapCollection(input, {
      source: "logie-spike-smoke",
      simplifyToleranceDeg: 0.005,
    });
    const road = out.features.find((f) => f.properties.feature_type === "road")!;
    const coords = road.geometry!.coordinates as number[][];
    expect(coords.length).toBeLessThan(4);
  });
});
