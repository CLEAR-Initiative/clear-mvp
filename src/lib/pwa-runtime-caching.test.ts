import { describe, expect, it } from "vitest";
import { runtimeCaching } from "./pwa-runtime-caching";

type Entry = (typeof runtimeCaching)[number];

const APP_ORIGIN = "https://app.clearinitiative.io";

/**
 * Whether a route would take this request, using Workbox's own rules: a
 * function pattern gets `sameOrigin`, and a RegExp only matches a request to
 * another site when it matches from the first character of the URL.
 */
function routeTakes(entry: Entry, href: string, headers: Record<string, string> = {}): boolean {
  const url = new URL(href);
  const sameOrigin = url.origin === APP_ORIGIN;
  const pattern = entry.urlPattern;
  if (typeof pattern === "function") {
    const request = new Request(href, { headers });
    return Boolean(pattern({ url, sameOrigin, request } as unknown as Parameters<typeof pattern>[0]));
  }
  if (pattern instanceof RegExp) {
    const match = pattern.exec(href);
    return match !== null && (sameOrigin || match.index === 0);
  }
  return typeof pattern === "string" && sameOrigin && url.pathname === pattern;
}

function cacheFor(href: string, headers?: Record<string, string>): string | undefined {
  return runtimeCaching.find((entry) => routeTakes(entry, href, headers))?.options?.cacheName ?? undefined;
}

describe("service worker runtime caching", () => {
  it.each([
    "https://api.mapbox.com/styles/v1/mapbox/dark-v11?access_token=pk.test",
    "https://api.mapbox.com/mapbox-gl-js/v3.9.4/mapbox-gl.js",
    "https://api.mapbox.com/mapbox-gl-js/v3.9.4/mapbox-gl.css",
    "https://api.mapbox.com/v4/mapbox.mapbox-streets-v8/3/4/3.vector.pbf",
    "https://fonts.gstatic.com/s/inter/v13/font.woff2",
    "https://fonts.googleapis.com/css2?family=Inter",
  ])("leaves %s to the browser", (href) => {
    expect(cacheFor(href)).toBeUndefined();
  });

  it("still caches same-origin API responses, which Observe reads offline", () => {
    expect(cacheFor(`${APP_ORIGIN}/api/trpc/locations.list`)).toBe("apis");
  });

  it("still caches same-origin pages, so Observe opens offline", () => {
    expect(cacheFor(`${APP_ORIGIN}/observe`)).toBe("pages");
  });
});
