import { describe, expect, it } from "vitest";
import {
  DEFAULT_SATELLITE_IMAGERY_SOURCE,
  ESRI_WORLD_IMAGERY_LAYER_ID,
  ESRI_WORLD_IMAGERY_SOURCE_ID,
  findEsriRasterBeforeId,
  isSatelliteImagerySource,
  resolveMapStyleForBasemap,
  syncSatelliteImageryAb,
  type SatelliteImageryAbMap,
} from "./satellite-imagery-ab";

function createMockMap(
  layers: Array<{ id: string; type: string }> = [
    { id: "background", type: "background" },
    { id: "land", type: "fill" },
    { id: "road-primary", type: "line" },
    { id: "place-label", type: "symbol" },
  ],
): SatelliteImageryAbMap & {
  sources: Set<string>;
  layerIds: Set<string>;
  addedBefore: string | undefined;
} {
  const sources = new Set<string>();
  const layerIds = new Set<string>();
  let addedBefore: string | undefined;

  return {
    sources,
    layerIds,
    get addedBefore() {
      return addedBefore;
    },
    getStyle: () => ({ layers }),
    getLayer: (id) => (layerIds.has(id) ? { id } : undefined),
    getSource: (id) => (sources.has(id) ? { id } : undefined),
    addSource: (id) => {
      sources.add(id);
    },
    addLayer: (layer, beforeId) => {
      layerIds.add(String(layer.id));
      addedBefore = beforeId;
    },
    removeLayer: (id) => {
      layerIds.delete(id);
    },
    removeSource: (id) => {
      sources.delete(id);
    },
  };
}

describe("satellite-imagery-ab", () => {
  it("defaults to mapbox and validates sources", () => {
    expect(DEFAULT_SATELLITE_IMAGERY_SOURCE).toBe("mapbox");
    expect(isSatelliteImagerySource("mapbox")).toBe(true);
    expect(isSatelliteImagerySource("esri")).toBe(true);
    expect(isSatelliteImagerySource("planet")).toBe(false);
  });

  it("resolves Mapbox satellite styles vs Esri carrier styles", () => {
    expect(
      resolveMapStyleForBasemap({
        baseMapType: "satellite",
        satelliteImagerySource: "mapbox",
        showRoads: false,
        isDark: false,
      }),
    ).toBe("mapbox://styles/mapbox/satellite-v9");

    expect(
      resolveMapStyleForBasemap({
        baseMapType: "satellite",
        satelliteImagerySource: "mapbox",
        showRoads: true,
        isDark: false,
      }),
    ).toBe("mapbox://styles/mapbox/satellite-streets-v12");

    expect(
      resolveMapStyleForBasemap({
        baseMapType: "satellite",
        satelliteImagerySource: "esri",
        showRoads: true,
        isDark: true,
      }),
    ).toBe("mapbox://styles/mapbox/dark-v11");

    expect(
      resolveMapStyleForBasemap({
        baseMapType: "simple",
        satelliteImagerySource: "esri",
        showRoads: true,
        isDark: false,
      }),
    ).toBe("mapbox://styles/mapbox/light-v11");
  });

  it("places Esri raster above land fills, below roads/labels", () => {
    expect(
      findEsriRasterBeforeId([
        { id: "background", type: "background" },
        { id: "land", type: "fill" },
        { id: "water", type: "fill" },
        { id: "road-primary", type: "line" },
        { id: "place-label", type: "symbol" },
      ]),
    ).toBe("road-primary");

    expect(
      findEsriRasterBeforeId([
        { id: "background", type: "background" },
        { id: "land", type: "fill" },
        { id: "place-label", type: "symbol" },
      ]),
    ).toBe("place-label");
  });

  it("adds Esri raster only for satellite + esri, and removes otherwise", () => {
    const map = createMockMap();

    syncSatelliteImageryAb(map, {
      baseMapType: "satellite",
      satelliteImagerySource: "esri",
    });
    expect(map.sources.has(ESRI_WORLD_IMAGERY_SOURCE_ID)).toBe(true);
    expect(map.layerIds.has(ESRI_WORLD_IMAGERY_LAYER_ID)).toBe(true);
    expect(map.addedBefore).toBe("road-primary");

    syncSatelliteImageryAb(map, {
      baseMapType: "satellite",
      satelliteImagerySource: "mapbox",
    });
    expect(map.sources.has(ESRI_WORLD_IMAGERY_SOURCE_ID)).toBe(false);
    expect(map.layerIds.has(ESRI_WORLD_IMAGERY_LAYER_ID)).toBe(false);

    syncSatelliteImageryAb(map, {
      baseMapType: "simple",
      satelliteImagerySource: "esri",
    });
    expect(map.sources.has(ESRI_WORLD_IMAGERY_SOURCE_ID)).toBe(false);
  });
});
