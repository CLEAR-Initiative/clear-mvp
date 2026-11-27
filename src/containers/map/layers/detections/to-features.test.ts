import { describe, expect, it } from "vitest";
import type { MapDetection } from "../../hooks/use-detections-for-map";
import { detectionsToFeatures } from "./to-features";

function detection(overrides: Partial<MapDetection>): MapDetection {
  return {
    id: "d1",
    title: null,
    severity: 3,
    date: "2026-11-01T00:00:00Z",
    point: null,
    location: null,
    ...overrides,
  };
}

describe("detectionsToFeatures", () => {
  it("places a detection at its point with its title and severity bucket", () => {
    const { features } = detectionsToFeatures([
      detection({ id: "a", title: "Flood in Juba", severity: 5, point: [10, 20] }),
    ]);
    expect(features).toEqual([
      {
        type: "Feature",
        geometry: { type: "Point", coordinates: [10, 20] },
        properties: { id: "a", title: "Flood in Juba", severity: "critical" },
      },
    ]);
  });

  it("skips a detection with no point", () => {
    expect(detectionsToFeatures([detection({})]).features).toEqual([]);
  });

  it("puts a detection without severity in the unknown bucket", () => {
    const { features } = detectionsToFeatures([detection({ severity: null, point: [0, 0] })]);
    expect(features[0]?.properties.severity).toBe("unknown");
  });
});
