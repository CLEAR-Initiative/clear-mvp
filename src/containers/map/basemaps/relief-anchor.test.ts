import { describe, expect, it } from "vitest";
import { findReliefAnchorId } from "./relief-anchor";

const layer = (id: string, featureComponent?: string) => ({
  id,
  type: "line",
  metadata: featureComponent ? { "mapbox:featureComponent": featureComponent } : undefined,
});

describe("findReliefAnchorId", () => {
  it("puts relief above land and water and below everything drawn on top of them", () => {
    const layers = [
      layer("land", "land-and-water"),
      layer("water", "land-and-water"),
      layer("aeroway-polygon", "transit"),
      layer("road-simple", "road-network"),
    ];

    expect(findReliefAnchorId(layers)).toBe("aeroway-polygon");
  });

  it("skips layers without Mapbox feature metadata, such as our own data layers", () => {
    expect(findReliefAnchorId([layer("land", "land-and-water"), layer("signals")])).toBeUndefined();
  });
});
