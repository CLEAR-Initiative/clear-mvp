import { describe, expect, it, vi } from "vitest";
import {
  TERRAIN_DEM_SOURCE_ID,
  TERRAIN_DEM_TILESET,
  TERRAIN_HILLSHADE_LAYER_ID,
  disableTopographyTerrain,
  enableTopographyTerrain,
  ensureContinentScaleBorders,
  findHillshadeBeforeId,
  hillshadeExaggerationExpression,
  isAdmin0BoundaryLayerId,
  syncTopographyAtmosphere,
  syncTopographyTerrain,
  terrainMeshExaggerationForZoom,
  type TopographyTerrainMap,
} from "./topography-terrain";

function createMockMap(
  layers: Array<{ id: string; type: string }> = [
    { id: "land", type: "background" },
    { id: "road-primary", type: "line" },
    { id: "place-label", type: "symbol" },
  ],
): TopographyTerrainMap & {
  sources: Set<string>;
  layers: Set<string>;
  terrain: { source: string; exaggeration?: unknown } | null;
  fog: Record<string, unknown> | null;
} {
  const sources = new Set<string>();
  const layerIds = new Set<string>();
  let terrain: { source: string; exaggeration?: unknown } | null = null;
  let fog: Record<string, unknown> | null = null;

  return {
    sources,
    layers: layerIds,
    get terrain() {
      return terrain;
    },
    get fog() {
      return fog;
    },
    getStyle: () => ({ layers }),
    getZoom: () => 7.5,
    getTerrain: () => terrain,
    getLayer: (id) => (layerIds.has(id) ? { id } : undefined),
    getSource: (id) => (sources.has(id) ? { id } : undefined),
    addSource: (id) => {
      sources.add(id);
    },
    addLayer: (layer) => {
      layerIds.add(String(layer.id));
    },
    removeLayer: (id) => {
      layerIds.delete(id);
    },
    removeSource: (id) => {
      sources.delete(id);
    },
    setTerrain: (next) => {
      terrain = next;
    },
    setFog: (next) => {
      fog = next;
    },
    setLayoutProperty: () => {
      /* noop for tests */
    },
    setLayerZoomRange: () => {
      /* noop for tests */
    },
    setPaintProperty: () => {
      /* noop for tests */
    },
  };
}

describe("exaggeration curves", () => {
  it("fades hillshade at Region and boosts toward Country, then Site", () => {
    const expr = hillshadeExaggerationExpression(false);
    // ["interpolate", ["linear"], ["zoom"], z, v, ...]
    const stops = Object.fromEntries(
      Array.from({ length: (expr.length - 3) / 2 }, (_, i) => [
        expr[3 + i * 2] as number,
        expr[4 + i * 2] as number,
      ]),
    );
    expect(stops[2]).toBe(0);
    expect(stops[8]).toBeGreaterThan(stops[4]!);
    expect(stops[8]).toBeGreaterThan(stops[14]!);
    expect(stops[14]).toBeLessThan(0.5);
  });

  it("uses the same hillshade curve for dark and light (no dark crush)", () => {
    expect(hillshadeExaggerationExpression(true)).toEqual(
      hillshadeExaggerationExpression(false),
    );
  });

  it("boosts terrain mesh at Country band and relaxes toward Site (numeric)", () => {
    const country = terrainMeshExaggerationForZoom(7.5);
    const area = terrainMeshExaggerationForZoom(10);
    const site = terrainMeshExaggerationForZoom(14);
    expect(country).toBeGreaterThan(area);
    expect(area).toBeGreaterThan(site);
    expect(country).toBeGreaterThan(2.5);
    expect(typeof country).toBe("number");
  });

  it("keeps mesh off through Mapbox globe→mercator morph (z5–6)", () => {
    expect(terrainMeshExaggerationForZoom(3)).toBe(0);
    expect(terrainMeshExaggerationForZoom(5)).toBe(0);
    expect(terrainMeshExaggerationForZoom(6)).toBe(0);
    expect(terrainMeshExaggerationForZoom(6.5)).toBeGreaterThan(0);
    expect(terrainMeshExaggerationForZoom(6.5)).toBeLessThan(
      terrainMeshExaggerationForZoom(7.5),
    );
    expect(terrainMeshExaggerationForZoom(7.5)).toBeGreaterThan(2.5);
  });
});

describe("findHillshadeBeforeId", () => {
  it("prefers a road layer, then a symbol layer", () => {
    const isRoad = (id: string) => id.includes("road");
    expect(
      findHillshadeBeforeId(
        [
          { id: "land", type: "background" },
          { id: "road-primary", type: "line" },
          { id: "place-label", type: "symbol" },
        ],
        isRoad,
      ),
    ).toBe("road-primary");
    expect(
      findHillshadeBeforeId(
        [
          { id: "land", type: "background" },
          { id: "place-label", type: "symbol" },
        ],
        isRoad,
      ),
    ).toBe("place-label");
  });
});

describe("enableTopographyTerrain", () => {
  it("enables DEM source + hillshade + setTerrain together", () => {
    const map = createMockMap();
    const addSource = vi.spyOn(map, "addSource");
    const addLayer = vi.spyOn(map, "addLayer");
    const setTerrain = vi.spyOn(map, "setTerrain");

    enableTopographyTerrain(map, { isDark: false, zoom: 7.5 });

    expect(addSource).toHaveBeenCalledWith(
      TERRAIN_DEM_SOURCE_ID,
      expect.objectContaining({
        type: "raster-dem",
        url: TERRAIN_DEM_TILESET,
      }),
    );
    expect(addLayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: TERRAIN_HILLSHADE_LAYER_ID,
        type: "hillshade",
        source: TERRAIN_DEM_SOURCE_ID,
      }),
      "road-primary",
    );
    const lastTerrainArg = setTerrain.mock.calls.at(-1)?.[0] as {
      source: string;
      exaggeration: unknown;
    };
    expect(lastTerrainArg).toEqual({
      source: TERRAIN_DEM_SOURCE_ID,
      exaggeration: terrainMeshExaggerationForZoom(7.5),
    });
    expect(typeof lastTerrainArg.exaggeration).toBe("number");
    expect(map.sources.has(TERRAIN_DEM_SOURCE_ID)).toBe(true);
    expect(map.layers.has(TERRAIN_HILLSHADE_LAYER_ID)).toBe(true);
    expect(map.terrain?.source).toBe(TERRAIN_DEM_SOURCE_ID);
  });

  it("leaves setTerrain null through the globe→mercator morph band", () => {
    const map = createMockMap();
    enableTopographyTerrain(map, { isDark: false, zoom: 5.5 });
    expect(map.sources.has(TERRAIN_DEM_SOURCE_ID)).toBe(true);
    expect(map.layers.has(TERRAIN_HILLSHADE_LAYER_ID)).toBe(true);
    expect(map.terrain).toBeNull();
  });
});

describe("disableTopographyTerrain", () => {
  it("clears setTerrain, hillshade, and DEM source", () => {
    const map = createMockMap();
    enableTopographyTerrain(map, { isDark: true });

    disableTopographyTerrain(map);

    expect(map.terrain).toBeNull();
    expect(map.layers.has(TERRAIN_HILLSHADE_LAYER_ID)).toBe(false);
    expect(map.sources.has(TERRAIN_DEM_SOURCE_ID)).toBe(false);
  });
});

describe("syncTopographyTerrain", () => {
  it("enables only for topography; Simple and Satellite stay flat", () => {
    const map = createMockMap();

    syncTopographyTerrain(map, "simple", { isDark: false });
    expect(map.terrain).toBeNull();
    expect(map.sources.has(TERRAIN_DEM_SOURCE_ID)).toBe(false);

    syncTopographyTerrain(map, "topography", { isDark: false });
    expect(map.terrain?.source).toBe(TERRAIN_DEM_SOURCE_ID);
    expect(map.layers.has(TERRAIN_HILLSHADE_LAYER_ID)).toBe(true);

    syncTopographyTerrain(map, "satellite", { isDark: false });
    expect(map.terrain).toBeNull();
    expect(map.sources.has(TERRAIN_DEM_SOURCE_ID)).toBe(false);

    syncTopographyTerrain(map, "simple", { isDark: true });
    expect(map.terrain).toBeNull();
  });

  it("leaving topography clears the mesh", () => {
    const map = createMockMap();
    syncTopographyTerrain(map, "topography", { isDark: false });
    expect(map.terrain).not.toBeNull();

    syncTopographyTerrain(map, "simple", { isDark: false });
    expect(map.terrain).toBeNull();
  });
});

describe("syncTopographyAtmosphere", () => {
  it("never applies custom fog — Topography matches Simple cartography", () => {
    const map = createMockMap();
    map.setFog?.({ "space-color": "#ff0000" });
    syncTopographyAtmosphere(map, "topography", true);
    expect(map.fog).toBeNull();

    syncTopographyAtmosphere(map, "topography", false);
    expect(map.fog).toBeNull();
  });

  it("enable dark Topography leaves fog cleared", () => {
    const map = createMockMap();
    enableTopographyTerrain(map, { isDark: true, zoom: 6 });
    expect(map.fog).toBeNull();

    disableTopographyTerrain(map);
    expect(map.fog).toBeNull();
  });
});

describe("isAdmin0BoundaryLayerId", () => {
  it("matches admin-0 line ids and rejects admin-1", () => {
    expect(isAdmin0BoundaryLayerId("admin-0-boundary")).toBe(true);
    expect(isAdmin0BoundaryLayerId("admin-0-boundary-bg")).toBe(true);
    expect(isAdmin0BoundaryLayerId("admin-1-boundary")).toBe(false);
    expect(isAdmin0BoundaryLayerId("road-primary")).toBe(false);
  });
});

describe("ensureContinentScaleBorders", () => {
  it("opens admin-0 to z0 without restyling paint (Simple color logic)", () => {
    const map = createMockMap([
      { id: "admin-0-boundary", type: "line" },
      { id: "admin-1-boundary", type: "line" },
      { id: "place-label", type: "symbol" },
    ]);
    const zoomRange = vi.spyOn(map, "setLayerZoomRange");
    const layout = vi.spyOn(map, "setLayoutProperty");
    const paint = vi.spyOn(map, "setPaintProperty");

    ensureContinentScaleBorders(map);

    expect(zoomRange).toHaveBeenCalledWith("admin-0-boundary", 0, 24);
    expect(layout).toHaveBeenCalledWith("admin-0-boundary", "visibility", "visible");
    expect(paint).not.toHaveBeenCalled();
    expect(zoomRange).not.toHaveBeenCalledWith("admin-1-boundary", 0, 24);
  });
});
