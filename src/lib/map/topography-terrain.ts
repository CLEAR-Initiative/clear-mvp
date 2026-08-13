/**
 * Topography terrain controller — DEM source, hillshade, and Mapbox
 * `setTerrain` mesh lifecycle. Pure Mapbox wiring lives here so crisis-map
 * can call a small enable/leave API and unit tests can mock the map surface.
 *
 * Visual exaggeration is Country-band boosted (stronger after the globe
 * settles into mercator, relaxes toward Site). Mesh stays **off through
 * Mapbox’s globe→mercator morph (z5–6)** and Region far-zoom — exaggeration 0
 * (and `setTerrain(null)`) so the sphere→plane unroll isn’t fighting a 3D
 * DEM mesh. That is paint/mesh only — Point altitude samples unexaggerated
 * DEM metres elsewhere.
 *
 * `setTerrain` exaggeration uses a **number** (not a zoom expression). Zoom
 * expressions on terrain are flaky in Mapbox GL and can leave the mesh off
 * while hillshade still paints — matching “shades but no 3D”. Callers update
 * the number on zoom (RAF-throttled) so Region fade applies mid-gesture.
 */

export const TERRAIN_DEM_SOURCE_ID = "terrain-dem";
export const TERRAIN_HILLSHADE_LAYER_ID = "terrain-hillshade";
export const TERRAIN_DEM_TILESET = "mapbox://mapbox.mapbox-terrain-dem-v1";

/**
 * Mapbox GL hardcodes globe→mercator morph between these zooms
 * (`GLOBE_ZOOM_THRESHOLD_MIN/MAX` in mapbox-gl). Not configurable.
 */
export const MAPBOX_GLOBE_MERCATOR_MORPH_MIN_ZOOM = 5;
export const MAPBOX_GLOBE_MERCATOR_MORPH_MAX_ZOOM = 6;

/**
 * Below this zoom, mesh exaggeration is 0 and terrain is detached.
 * Aligned to morph end (z6) so mesh doesn’t stack on the sphere→plane unroll.
 */
export const TERRAIN_MESH_REGION_FADE_ZOOM = MAPBOX_GLOBE_MERCATOR_MORPH_MAX_ZOOM;
/** Country-band mesh is fully boosted by this zoom (after morph has settled). */
export const TERRAIN_MESH_COUNTRY_FULL_ZOOM = 7.5;

/**
 * Void / pitched-sky shell — same as Simple so Topography does not invent
 * a separate dark globe palette (a11y: world view must match Simple).
 * @deprecated Prefer matching Simple shell `#111111`; kept for call sites.
 */
export const TOPOGRAPHY_DARK_VOID_COLOR = "#111111";

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
  setLayoutProperty?: (layerId: string, name: string, value: unknown) => void;
  setLayerZoomRange?: (layerId: string, minzoom: number, maxzoom: number) => void;
  /** Atmosphere / space behind the globe and pitched sky. */
  setFog?: (fog: Record<string, unknown> | null) => void;
};

export type TopographyTerrainOptions = {
  isDark: boolean;
  /** Layer id to insert hillshade before (roads / symbols). */
  beforeId?: string;
  /** Current map zoom — drives Country-band mesh exaggeration. */
  zoom?: number;
};

/**
 * Zoom-interpolated hillshade exaggeration.
 * Region (far zoom) → 0 so world view matches Simple cartography; Country
 * band brings relief back. Dark uses the same curve as light (never stronger)
 * so we do not crush dark-v11 land/water/coastlines.
 */
export function hillshadeExaggerationExpression(
  _isDark: boolean,
): unknown[] {
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    2,
    0,
    4,
    0.55,
    8,
    0.85,
    10,
    0.55,
    14,
    0.3,
  ];
}

/**
 * Country-band-boosted mesh exaggeration as a plain number for `setTerrain`.
 * Stronger once mercator has settled (after Mapbox z5–6 globe morph); relaxes
 * to Site. At/below morph end (z≤6) returns 0 so we can detach the mesh.
 */
export function terrainMeshExaggerationForZoom(zoom: number): number {
  const z = Number.isFinite(zoom) ? zoom : 8;
  // Piecewise-linear through the band anchors.
  // z6 → 0 (through globe morph + Region), then ramp into Country boost.
  const stops: Array<[number, number]> = [
    [TERRAIN_MESH_REGION_FADE_ZOOM, 0],
    [TERRAIN_MESH_COUNTRY_FULL_ZOOM, 3.0],
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
    TERRAIN_MESH_REGION_FADE_ZOOM,
    0,
    TERRAIN_MESH_COUNTRY_FULL_ZOOM,
    3.0,
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
    // Soft shadows — pure #000 on dark-v11 crushes coastlines / continents.
    "hillshade-shadow-color": isDark ? "#1c1c22" : "#57534E",
    "hillshade-highlight-color": isDark ? "#a1a1aa" : "#FFFFFF",
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
  clearTopographyAtmosphere(map);
}

/**
 * Topography shares Simple’s cartography — no custom fog/space palette.
 * Always clear fog so dark world view matches Simple (tilt + pins + mesh only).
 */
export function syncTopographyAtmosphere(
  map: TopographyTerrainMap,
  _baseMapType: "simple" | "topography" | "satellite",
  _isDark: boolean,
): void {
  clearTopographyAtmosphere(map);
}

export function clearTopographyAtmosphere(map: TopographyTerrainMap): void {
  try {
    map.setFog?.(null);
  } catch {
    /* ignore */
  }
}

/** True for Mapbox style admin-0 (national) line layers. */
export function isAdmin0BoundaryLayerId(id: string): boolean {
  const lower = id.toLowerCase();
  if (!lower.includes("admin")) return false;
  return (
    lower.includes("admin-0") ||
    lower.includes("-0-") ||
    /admin[^a-z0-9]*0([^0-9]|$)/.test(lower)
  );
}

/**
 * Ensure admin-0 layers can draw from z0 (Mapbox often mins them higher).
 * Does **not** restyle colors/opacity — keep Simple’s border logic so
 * continent coastlines stay the style’s land/water edge, not a forced
 * country-border overlay.
 */
export function ensureContinentScaleBorders(map: TopographyTerrainMap): void {
  const layers = map.getStyle().layers;
  if (!layers?.length) return;

  for (const layer of layers) {
    if (layer.type !== "line") continue;
    if (!isAdmin0BoundaryLayerId(layer.id)) continue;
    try {
      map.setLayerZoomRange?.(layer.id, 0, 24);
      map.setLayoutProperty?.(layer.id, "visibility", "visible");
    } catch {
      /* ignore */
    }
  }
}

/** Update mesh exaggeration for the current zoom without rebuilding the stack. */
export function updateTopographyTerrainExaggeration(
  map: TopographyTerrainMap,
  zoom?: number,
): void {
  const z = zoom ?? map.getZoom?.() ?? 8;
  const exaggeration = terrainMeshExaggerationForZoom(z);
  try {
    if (exaggeration <= 0) {
      // Detach entirely during globe morph / far zoom — exaggeration 0 alone
      // still keeps the terrain pipeline fighting Mapbox’s sphere→plane unroll.
      if (map.getTerrain?.()) map.setTerrain(null);
      return;
    }
    if (!map.getSource(TERRAIN_DEM_SOURCE_ID)) return;
    map.setTerrain({
      source: TERRAIN_DEM_SOURCE_ID,
      exaggeration,
    });
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

  const zoom = options.zoom ?? map.getZoom?.() ?? 8;
  const exaggeration = terrainMeshExaggerationForZoom(zoom);
  if (exaggeration > 0) {
    map.setTerrain({
      source: TERRAIN_DEM_SOURCE_ID,
      exaggeration,
    });
  } else {
    map.setTerrain(null);
  }
  syncTopographyAtmosphere(map, "topography", options.isDark);
  ensureContinentScaleBorders(map);
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
