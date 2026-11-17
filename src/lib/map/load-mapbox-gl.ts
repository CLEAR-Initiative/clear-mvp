// Mapbox GL JS has no types installed here; the map code treats it as untyped.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MapboxGL = any;

const MAPBOX_GL_VERSION = "3.9.4";
const MAPBOX_GL_JS = `https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_GL_VERSION}/mapbox-gl.js`;
const MAPBOX_GL_CSS = `https://api.mapbox.com/mapbox-gl-js/v${MAPBOX_GL_VERSION}/mapbox-gl.css`;

/**
 * Why a map could not start.
 * - `script`: Mapbox GL JS never arrived from the CDN (blocked domain, ad
 *   blocker, proxy, network).
 * - `webgl`: the browser has no WebGL (hardware acceleration off, GPU
 *   blocklisted, VM or remote desktop). Retrying won't help.
 * - `init`: the library loaded and WebGL is there, but the map still threw.
 */
export type MapLoadStage = "script" | "webgl" | "init";

export class MapLoadError extends Error {
  constructor(
    readonly stage: MapLoadStage,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "MapLoadError";
  }
}

let loading: Promise<MapboxGL> | null = null;

/**
 * Mapbox GL JS from Mapbox's CDN, loaded once per page. Rejects with a
 * `MapLoadError` at stage `script`, and forgets the failed attempt so a
 * retry loads it again.
 */
export function loadMapboxGL(): Promise<MapboxGL> {
  const w = window as unknown as { mapboxgl?: MapboxGL };
  if (w.mapboxgl) return Promise.resolve(w.mapboxgl);
  if (loading) return loading;
  loading = new Promise((resolve, reject) => {
    if (!document.querySelector('link[href*="mapbox-gl"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = MAPBOX_GL_CSS;
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = MAPBOX_GL_JS;
    const fail = (message: string) => {
      loading = null;
      script.remove();
      reject(new MapLoadError("script", message));
    };
    script.onload = () => {
      // A blocker can answer the request with an empty stub that "loads" fine.
      if (w.mapboxgl) resolve(w.mapboxgl);
      else fail("Mapbox GL JS loaded but did not define window.mapboxgl");
    };
    script.onerror = () => fail(`Failed to load Mapbox GL JS from ${MAPBOX_GL_JS}`);
    document.head.appendChild(script);
  });
  return loading;
}

/** Whether this browser can create a WebGL context at all. */
export function hasWebGL(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * `new gl.Map(options)`, with a failure turned into a `MapLoadError` that
 * says whether WebGL was the cause.
 */
export function createMapboxMap(gl: MapboxGL, options: Record<string, unknown>): MapboxGL {
  if (!hasWebGL()) {
    throw new MapLoadError("webgl", "WebGL is not available in this browser");
  }
  try {
    return new gl.Map(options);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const stage: MapLoadStage = /webgl/i.test(message) ? "webgl" : "init";
    throw new MapLoadError(stage, message, { cause: err });
  }
}

/** The stage of any error from loading or creating a map. */
export function mapLoadStage(err: unknown): MapLoadStage {
  return err instanceof MapLoadError ? err.stage : "init";
}
