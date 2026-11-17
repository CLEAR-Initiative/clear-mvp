export const PROJECTION = "mercator";

export const WORLD_BOUNDS: [[number, number], [number, number]] = [
  [-180, -60],
  [180, 75],
];

export const ZOOM_RANGE = { min: 0, max: 22 } as const;

export const BASEMAP_IDS = ["simple", "satellite", "topography"] as const;

export type BasemapId = (typeof BASEMAP_IDS)[number];

export const DEFAULT_BASEMAP: BasemapId = "simple";

export const BASEMAP_STYLES: Record<BasemapId, { light: string; dark: string }> = {
  simple: {
    light: "mapbox://styles/mapbox/light-v11",
    dark: "mapbox://styles/mapbox/dark-v11",
  },
  topography: {
    light: "mapbox://styles/mapbox/light-v11",
    dark: "mapbox://styles/mapbox/dark-v11",
  },
  satellite: {
    light: "mapbox://styles/mapbox/satellite-streets-v12",
    dark: "mapbox://styles/mapbox/satellite-streets-v12",
  },
};
