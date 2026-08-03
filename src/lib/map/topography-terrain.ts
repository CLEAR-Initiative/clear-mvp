/**
 * Topography terrain controller — DEM source, hillshade, and Mapbox
 * `setTerrain` mesh lifecycle. Pure Mapbox wiring lives here so crisis-map
 * can call a small enable/leave API and unit tests can mock the map surface.
 *
 * Visual exaggeration is Country-band boosted (stronger at z5–8, relaxes
 * toward Site). That is paint/mesh only — Point altitude samples unexaggerated
 * DEM metres elsewhere.
 */

export const TERRAIN_DEM_SOURCE_ID = "terrain-dem";
export const TERRAIN_HILLSHADE_LAYER_ID = "terrain-hillshade";
export const TERRAIN_DEM_TILESET = "mapbox://mapbox.mapbox-terrain-dem-v1";

/** Minimal map surface the controller needs (Mapbox Map subset). */
export type TopographyTerrainMap = {
  getStyle: () => { layers?: Array<{ id: string; type: string }> };
  getLayer: (id: string) => unknown;
  getSource: (id: string) => unknown;
  addSource: (id: string, source: Record<string, unknown>) => void;
  addLayer: (layer: Record<string, unknown>, beforeId?: string) => void;
  removeLayer: (id: string) => void;
  removeSource: (id: string) => void;
  setTerrain: (
    terrain: { source: string; exaggeration?: unknown } | null,
  ) => void;
};

export type TopographyTerrainOptions = {
  isDark: boolean;
  /** Layer id to insert hillshade before (roads / symbols). */
  beforeId?: string;
};

/** Zoom-interpolated hillshade exaggeration — strongest at Country band. */
export function hillshadeExaggerationExpression(
  isDark: boolean,
): unknown[] {
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    4,
    isDark ? 1.15 : 1.05,
    8,
    isDark ? 1.05 : 0.95,
    10,
    isDark ? 0.7 : 0.6,
    14,
    0.35,
  ];
}

/**
 * Zoom-interpolated terrain-mesh exaggeration for `setTerrain`.
 * Country-band boosted; relaxes toward Site. Visual only.
 */
export function terrainMeshExaggerationExpression(): unknown[] {
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    4,
    2.4,
    8,
    2.1,
    10,
    1.4,
    14,
    1.0,
  ];
}

export function hillshadePaint(isDark: boolean): Record<string, unknown> {
  return {
    "hillshade-exaggeration": hillshadeExaggerationExpression(isDark),
    "hillshade-shadow-color": isDark ? "#000000" : "#57534E",
    "hillshade-highlight-color": isDark ? "#6B6B78" : "#FFFFFF",
  };
}

export function findHillshadeBeforeId(
  layers: Array<{ id: string; type: string }> | undefined,
  isRoadLayerId: (id: string) => boolean,
): string | undefined {
  if (!layers?.length) return undefined;
  return (
    layers.find((l) => isRoadLayerId(l.id))?.id ??
    layers.find((l) => l.type === "symbol")?.id
  );
}

/** Clear hillshade + DEM source + terrain mesh. Safe if already absent. */
export function disableTopographyTerrain(map: TopographyTerrainMap): void {
  try {
    map.setTerrain(null);
  } catch {
    /* ignore */
  }
  try {
    if (map.getLayer(TERRAIN_HILLSHADE_LAYER_ID)) {
      map.removeLayer(TERRAIN_HILLSHADE_LAYER_ID);
    }
  } catch {
    /* ignore */
  }
  try {
    if (map.getSource(TERRAIN_DEM_SOURCE_ID)) {
      map.removeSource(TERRAIN_DEM_SOURCE_ID);
    }
  } catch {
    /* ignore */
  }
}

/**
 * Enable DEM source + hillshade + `setTerrain` together (Hybrid Topography).
 * Idempotent: clears any prior Topography stack first.
 */
export function enableTopographyTerrain(
  map: TopographyTerrainMap,
  options: TopographyTerrainOptions,
): void {
  disableTopographyTerrain(map);

  const beforeId =
    options.beforeId ??
    findHillshadeBeforeId(map.getStyle().layers, (id) => {
      const lower = id.toLowerCase();
      return (
        lower.includes("road") ||
        lower.includes("street") ||
        lower.includes("bridge") ||
        lower.includes("tunnel")
      );
    });

  map.addSource(TERRAIN_DEM_SOURCE_ID, {
    type: "raster-dem",
    url: TERRAIN_DEM_TILESET,
    tileSize: 512,
    maxzoom: 14,
  });

  map.addLayer(
    {
      id: TERRAIN_HILLSHADE_LAYER_ID,
      type: "hillshade",
      source: TERRAIN_DEM_SOURCE_ID,
      paint: hillshadePaint(options.isDark),
    },
    beforeId,
  );

  map.setTerrain({
    source: TERRAIN_DEM_SOURCE_ID,
    exaggeration: terrainMeshExaggerationExpression(),
  });
}

/**
 * Sync Topography terrain to basemap selection.
 * Only `"topography"` enables the stack; Simple / Satellite stay flat.
 */
export function syncTopographyTerrain(
  map: TopographyTerrainMap,
  baseMapType: "simple" | "topography" | "satellite",
  options: TopographyTerrainOptions,
): void {
  if (baseMapType === "topography") {
    enableTopographyTerrain(map, options);
  } else {
    disableTopographyTerrain(map);
  }
}
