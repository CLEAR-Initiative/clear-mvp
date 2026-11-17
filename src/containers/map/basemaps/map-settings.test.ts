import { describe, expect, it } from "vitest";
import { isRestyledRoad, settingOf } from "./map-settings";

const layer = (id: string, type: string, featureComponent?: string) => ({
  id,
  type,
  metadata: featureComponent ? { "mapbox:featureComponent": featureComponent } : undefined,
});

describe("settingOf", () => {
  it("puts road lines, footpaths, road names and shields under Roads", () => {
    expect(settingOf(layer("road-simple", "line", "road-network"))).toBe("roads");
    expect(settingOf(layer("road-label-simple", "symbol", "road-network"))).toBe("roads");
    expect(settingOf(layer("road-number-shield", "symbol", "road-network"))).toBe("roads");
    expect(settingOf(layer("road-path", "line", "walking-cycling"))).toBe("roads");
    expect(settingOf(layer("path-pedestrian-label", "symbol", "walking-cycling"))).toBe("roads");
  });

  it("puts every other basemap text and icon under Labels, stations and airports included", () => {
    expect(settingOf(layer("settlement-label", "symbol", "place-labels"))).toBe("labels");
    expect(settingOf(layer("poi-label", "symbol", "point-of-interest-labels"))).toBe("labels");
    expect(settingOf(layer("water-line-label", "symbol", "natural-features"))).toBe("labels");
    expect(settingOf(layer("airport-label", "symbol", "transit"))).toBe("labels");
    expect(settingOf(layer("transit-label", "symbol", "transit"))).toBe("labels");
  });

  it("never toggles rail lines, land, water or boundaries", () => {
    expect(settingOf(layer("road-rail", "line", "transit"))).toBeUndefined();
    expect(settingOf(layer("water", "fill", "land-and-water"))).toBeUndefined();
    expect(settingOf(layer("admin-0-boundary", "line", "admin-boundaries"))).toBeUndefined();
  });

  it("never toggles our own layers, which carry no Mapbox feature metadata", () => {
    expect(settingOf(layer("signals-points", "symbol"))).toBeUndefined();
    expect(settingOf(layer("topography-contours", "line"))).toBeUndefined();
  });
});

describe("isRestyledRoad", () => {
  it("restyles road lines only, not footpaths or road names", () => {
    expect(isRestyledRoad(layer("road-simple", "line", "road-network"))).toBe(true);
    expect(isRestyledRoad(layer("road-path", "line", "walking-cycling"))).toBe(false);
    expect(isRestyledRoad(layer("road-label-simple", "symbol", "road-network"))).toBe(false);
  });
});
