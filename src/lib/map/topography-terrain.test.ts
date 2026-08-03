import { describe, expect, it, vi } from "vitest";
import {
  TERRAIN_DEM_SOURCE_ID,
  TERRAIN_DEM_TILESET,
  TERRAIN_HILLSHADE_LAYER_ID,
  disableTopographyTerrain,
  enableTopographyTerrain,
  findHillshadeBeforeId,
  hillshadeExaggerationExpression,
  syncTopographyTerrain,
  terrainMeshExaggerationExpression,
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
} {
  const sources = new Set<string>();
  const layerIds = new Set<string>();
  let terrain: { source: string; exaggeration?: unknown } | null = null;

  return {
    sources,
    layers: layerIds,
    get terrain() {
      return terrain;
    },
    getStyle: () => ({ layers }),
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
  };
}

describe("exaggeration curves", () => {
  it("boosts hillshade at Country band and relaxes toward Site", () => {
    const expr = hillshadeExaggerationExpression(false);
    // ["interpolate", ["linear"], ["zoom"], z, v, ...]
    const stops = Object.fromEntries(
      Array.from({ length: (expr.length - 3) / 2 }, (_, i) => [
        expr[3 + i * 2] as number,
        expr[4 + i * 2] as number,
      ]),
    );
    expect(stops[4]).toBeGreaterThan(stops[10]!);
    expect(stops[8]).toBeGreaterThan(stops[14]!);
    expect(stops[14]).toBeLessThan(0.5);
  });

  it("boosts terrain mesh at Country band and relaxes toward Site", () => {
    const expr = terrainMeshExaggerationExpression();
    const stops = Object.fromEntries(
      Array.from({ length: (expr.length - 3) / 2 }, (_, i) => [
        expr[3 + i * 2] as number,
        expr[4 + i * 2] as number,
      ]),
    );
    expect(stops[4]).toBeGreaterThan(stops[10]!);
    expect(stops[8]).toBeGreaterThan(stops[14]!);
    expect(stops[8]).toBeGreaterThan(2);
    expect(stops[14]).toBe(1);
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

    enableTopographyTerrain(map, { isDark: false });

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
    expect(setTerrain).toHaveBeenCalledWith({
      source: TERRAIN_DEM_SOURCE_ID,
      exaggeration: terrainMeshExaggerationExpression(),
    });
    expect(map.sources.has(TERRAIN_DEM_SOURCE_ID)).toBe(true);
    expect(map.layers.has(TERRAIN_HILLSHADE_LAYER_ID)).toBe(true);
    expect(map.terrain?.source).toBe(TERRAIN_DEM_SOURCE_ID);
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
