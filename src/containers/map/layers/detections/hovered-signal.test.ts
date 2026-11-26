import type { GeoJSONFeature } from "mapbox-gl";
import { describe, expect, it } from "vitest";
import { toHoveredSignal } from "./hovered-signal";

function feature(properties: Record<string, unknown>): GeoJSONFeature {
  return {
    type: "Feature",
    geometry: { type: "Point", coordinates: [10, 20] },
    properties,
  } as unknown as GeoJSONFeature;
}

describe("toHoveredSignal", () => {
  it("reads the id, title, severity and point of a rendered signal", () => {
    expect(toHoveredSignal(feature({ id: "a", title: "Flood in Juba", severity: "high" }))).toEqual({
      id: "a",
      title: "Flood in Juba",
      severity: "high",
      coordinates: [10, 20],
    });
  });

  it("gives no title and an unknown severity when Mapbox dropped or garbled those properties", () => {
    expect(toHoveredSignal(feature({ id: "a", severity: "bogus" }))).toMatchObject({
      title: null,
      severity: "unknown",
    });
  });

  it("returns null when there is no feature under the pointer", () => {
    expect(toHoveredSignal(undefined)).toBeNull();
  });
});
