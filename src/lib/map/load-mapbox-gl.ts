// Mapbox GL JS has no types installed here; the map code treats it as untyped.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MapboxGL = any;

const MAPBOX_GL_VERSION = "3.9.4";

let loading: Promise<MapboxGL> | null = null;

/**
 * Mapbox GL JS from Mapbox's CDN, loaded once per page: the same build the
 * map page and the dashboard load (their own loaders also leave it on
 * `window.mapboxgl`, so whichever runs first serves the others).
 */
export function loadMapboxGL(): Promise<MapboxGL> {
  const w = window as unknown as { mapboxgl?: MapboxGL };
  if (w.mapboxgl) return Promise.resolve(w.mapboxgl);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    if (!document.querySelector('link[href*="mapbox-gl"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_GL_VERSION}/mapbox-gl.css`;
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = `https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_GL_VERSION}/mapbox-gl.js`;
    script.onload = () => resolve(w.mapboxgl);
    script.onerror = () => {
      loading = null;
      reject(new Error("Failed to load Mapbox GL JS"));
    };
    document.head.appendChild(script);
  });
  return loading;
}
