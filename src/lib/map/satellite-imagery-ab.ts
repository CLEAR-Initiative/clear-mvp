/**
 * Temporary satellite imagery A/B — Mapbox Satellite vs Esri World Imagery.
 *
 * No new vendor SDK: Esri is a public XYZ raster that Mapbox GL can host as a
 * `raster` source. Remove this module once the evaluation is done (#137 Part B).
 */

export type SatelliteImagerySource = "mapbox" | "esri";

export const SATELLITE_IMAGERY_SOURCES: SatelliteImagerySource[] = [
  "mapbox",
  "esri",
];

export const DEFAULT_SATELLITE_IMAGERY_SOURCE: SatelliteImagerySource =
  "mapbox";

export const ESRI_WORLD_IMAGERY_SOURCE_ID = "ab-esri-world-imagery";
export const ESRI_WORLD_IMAGERY_LAYER_ID = "ab-esri-world-imagery";

/** Public ArcGIS Online World Imagery XYZ (no API key). */
export const ESRI_WORLD_IMAGERY_TILES = [
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
] as const;

export const ESRI_WORLD_IMAGERY_ATTRIBUTION =
  "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community";

export function isSatelliteImagerySource(
  v: unknown,
): v is SatelliteImagerySource {
  return v === "mapbox" || v === "esri";
}

/** Minimal Mapbox GL surface used by the Esri raster sync. */
export type SatelliteImageryAbMap = {
  getStyle: () => { layers?: Array<{ id: string; type: string }> };
  getLayer: (id: string) => unknown;
  getSource: (id: string) => unknown;
  addSource: (id: string, source: Record<string, unknown>) => void;
  addLayer: (layer: Record<string, unknown>, beforeId?: string) => void;
  removeLayer: (id: string) => void;
  removeSource: (id: string) => void;
};

/**
 * Insert raster above land/water fills and below roads/labels so imagery
 * reads as the basemap while Roads overlay still works.
 */
export function findEsriRasterBeforeId(
  layers: Array<{ id: string; type: string }>,
): string | undefined {
  const roadOrLabel = layers.find((l) => {
    if (l.type === "symbol") return true;
    if (l.type !== "line") return false;
    return /road|tunnel|bridge|street|path|rail|motorway|trunk/i.test(l.id);
  });
  return roadOrLabel?.id;
}

export function removeEsriWorldImagery(map: SatelliteImageryAbMap): void {
  if (map.getLayer(ESRI_WORLD_IMAGERY_LAYER_ID)) {
    map.removeLayer(ESRI_WORLD_IMAGERY_LAYER_ID);
  }
  if (map.getSource(ESRI_WORLD_IMAGERY_SOURCE_ID)) {
    map.removeSource(ESRI_WORLD_IMAGERY_SOURCE_ID);
  }
}

export function enableEsriWorldImagery(map: SatelliteImageryAbMap): void {
  if (!map.getSource(ESRI_WORLD_IMAGERY_SOURCE_ID)) {
    map.addSource(ESRI_WORLD_IMAGERY_SOURCE_ID, {
      type: "raster",
      tiles: [...ESRI_WORLD_IMAGERY_TILES],
      tileSize: 256,
      attribution: ESRI_WORLD_IMAGERY_ATTRIBUTION,
      maxzoom: 19,
    });
  }
  if (!map.getLayer(ESRI_WORLD_IMAGERY_LAYER_ID)) {
    const layers = map.getStyle().layers ?? [];
    const beforeId = findEsriRasterBeforeId(layers);
    map.addLayer(
      {
        id: ESRI_WORLD_IMAGERY_LAYER_ID,
        type: "raster",
        source: ESRI_WORLD_IMAGERY_SOURCE_ID,
        paint: {
          "raster-opacity": 1,
          "raster-fade-duration": 0,
        },
      },
      beforeId,
    );
  }
}

/**
 * Sync Esri World Imagery under the carrier style (light/dark) while Satellite
 * basemap + Esri A/B source are active. Mapbox path uses satellite styles and
 * needs no raster overlay.
 */
export function syncSatelliteImageryAb(
  map: SatelliteImageryAbMap,
  opts: {
    baseMapType: "simple" | "topography" | "satellite";
    satelliteImagerySource: SatelliteImagerySource;
  },
): void {
  const useEsri =
    opts.baseMapType === "satellite" &&
    opts.satelliteImagerySource === "esri";
  if (useEsri) {
    enableEsriWorldImagery(map);
  } else {
    removeEsriWorldImagery(map);
  }
}

/**
 * Mapbox style URL for the basemap triad + temporary imagery A/B.
 * Esri rides on light/dark so Roads can keep the existing boost path.
 */
export function resolveMapStyleForBasemap(opts: {
  baseMapType: "simple" | "topography" | "satellite";
  satelliteImagerySource: SatelliteImagerySource;
  showRoads: boolean;
  isDark: boolean;
}): string {
  if (opts.baseMapType === "satellite") {
    if (opts.satelliteImagerySource === "esri") {
      return opts.isDark
        ? "mapbox://styles/mapbox/dark-v11"
        : "mapbox://styles/mapbox/light-v11";
    }
    return opts.showRoads
      ? "mapbox://styles/mapbox/satellite-streets-v12"
      : "mapbox://styles/mapbox/satellite-v9";
  }
  return opts.isDark
    ? "mapbox://styles/mapbox/dark-v11"
    : "mapbox://styles/mapbox/light-v11";
}
