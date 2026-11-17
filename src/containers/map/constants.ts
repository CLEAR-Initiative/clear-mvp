export const PROJECTION = "globe";

export const ZOOM_RANGE = { min: 0, max: 22 } as const;

export const BASEMAP_STYLES = {
  simple: {
    light: "mapbox://styles/mapbox/light-v11",
    dark: "mapbox://styles/mapbox/dark-v11",
  },
} as const;
