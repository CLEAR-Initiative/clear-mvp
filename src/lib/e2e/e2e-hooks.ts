/**
 * Hooks for the hermetic Playwright stack. They do nothing unless the image
 * was built with NEXT_PUBLIC_E2E=1 (docker-compose.e2e.yml sets it), so a dev
 * or prod build never exposes the map or throws from here.
 */

/** True only in the E2E image. Next.js inlines the value at build time. */
export function isE2EBuild(): boolean {
  return process.env.NEXT_PUBLIC_E2E === "1";
}

declare global {
  interface Window {
    /** The live Mapbox map of the page, for specs that drive the real canvas. */
    __clearE2EMap?: unknown;
  }
}

/**
 * Give Playwright the Mapbox map instance. A spec needs it to turn a
 * longitude and latitude into a pixel to hover and click, and to wait for the
 * map to finish drawing. Pass null when the map is removed.
 */
export function exposeMapForE2E(map: unknown): void {
  if (!isE2EBuild() || typeof window === "undefined") return;
  if (map) window.__clearE2EMap = map;
  else delete window.__clearE2EMap;
}

/**
 * Make an error that app code reported and continued past fail the E2E test
 * that is running. It rethrows on a timer, outside any `try`, so the
 * Playwright crash guard (e2e/support/test.ts) sees an uncaught exception.
 */
export function failE2ETest(error: Error): void {
  if (!isE2EBuild() || typeof window === "undefined") return;
  setTimeout(() => {
    throw error;
  }, 0);
}
