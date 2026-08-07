/**
 * Topography terrain controller — DEM source, hillshade, and Mapbox
 * `setTerrain` mesh lifecycle. Pure Mapbox wiring lives here so crisis-map
 * can call a small enable/leave API and unit tests can mock the map surface.
 *
 * Visual exaggeration is Country-band boosted (stronger at z5–8, relaxes
 * toward Site). That is paint/mesh only — Point altitude samples unexaggerated
 * DEM metres elsewhere.
 *
 * `setTerrain` exaggeration uses a **number** (not a zoom expression). Zoom
 * expressions on terrain are flaky in Mapbox GL and can leave the mesh off
 * while hillshade still paints — matching “shades but no 3D”.
 */

export const TERRAIN_DEM_SOURCE_ID = "terrain-dem";
export const TERRAIN_HILLSHADE_LAYER_ID = "terrain-hillshade";
export const TERRAIN_DEM_TILESET = "mapbox://mapbox.mapbox-terrain-dem-v1";

/** Minimal map surface the controller needs (Mapbox Map subset). */
export type TopographyTerrainMap = {
  getStyle: () => { layers?: Array<{ id: string; type: string }> };
  getLayer: (id: string) => unknown;
  getSource: (id: string) => unknown;
  getZoom?: () => number;
  getTerrain?: () => { source?: string; exaggeration?: unknown } | null;
  addSource: (id: string, source: Record<string, unknown>) => void;
  addLayer: (layer: Record<string, unknown>, beforeId?: string) => void;
  removeLayer: (id: string) => void;
  removeSource: (id: string) => void;
  setTerrain: (
    terrain: { source: string; exaggeration?: unknown } | null,
  ) => void;
  setPaintProperty?: (layerId: string, name: string, value: unknown) => void;
};

export type TopographyTerrainOptions = {
  isDark: boolean;
  /** Layer id to insert hillshade before (roads / symbols). */
  beforeId?: string;
  /** Current map zoom — drives Country-band mesh exaggeration. */
  zoom?: number;
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
 * Country-band-boosted mesh exaggeration as a plain number for `setTerrain`.
 * Stronger at z5–8 so tilt reads clearly over Sudan plains; relaxes to Site.
 */
export function terrainMeshExaggerationForZoom(zoom: number): number {
  const z = Number.isFinite(zoom) ? zoom : 6;
  // Piecewise-linear through the band anchors (same shape as the old expression).
  const stops: Array<[number, number]> = [
    [4, 3.2],
    [8, 2.8],
    [10, 1.8],
    [14, 1.15],
  ];
  if (z <= stops[0]![0]) return stops[0]![1];
  if (z >= stops[stops.length - 1]![0]) return stops[stops.length - 1]![1];
  for (let i = 0; i < stops.length - 1; i++) {
    const [z0, v0] = stops[i]!;
    const [z1, v1] = stops[i + 1]!;
    if (z >= z0 && z <= z1) {
      const t = (z - z0) / (z1 - z0);
      return v0 + (v1 - v0) * t;
    }
  }
  return 2.8;
}

/** @deprecated Prefer terrainMeshExaggerationForZoom — kept for tests/docs. */
export function terrainMeshExaggerationExpression(): unknown[] {
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    4,
    3.2,
    8,
    2.8,
    10,
    1.8,
    14,
    1.15,
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

/** Update mesh exaggeration for the current zoom without rebuilding the stack. */
export function updateTopographyTerrainExaggeration(
  map: TopographyTerrainMap,
  zoom?: number,
): void {
  const z = zoom ?? map.getZoom?.() ?? 6;
  const exaggeration = terrainMeshExaggerationForZoom(z);
  try {
    const current = map.getTerrain?.();
    if (!current?.source) return;
    map.setTerrain({ source: current.source, exaggeration });
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

  const zoom = options.zoom ?? map.getZoom?.() ?? 6;
  map.setTerrain({
    source: TERRAIN_DEM_SOURCE_ID,
    exaggeration: terrainMeshExaggerationForZoom(zoom),
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

/** True when Mapbox reports an active terrain mesh on our DEM source. */
export function isTopographyTerrainMeshActive(map: TopographyTerrainMap): boolean {
  try {
    const terrain = map.getTerrain?.();
    return terrain?.source === TERRAIN_DEM_SOURCE_ID;
  } catch {
    return false;
  }
}
