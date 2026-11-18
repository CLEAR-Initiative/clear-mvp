import { afterEach, describe, expect, it, vi } from "vitest";
import { runtimeCaching, signedOutGuard } from "./pwa-runtime-caching";
import { clearSignedInCaches } from "./service-worker-caches";
import { FakeCacheStorage } from "./fake-cache-storage.test-helper";

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

describe("sign-out guard on the service worker's caches", () => {
  const request = new Request(`${APP_ORIGIN}/api/trpc/auth.me`);
  const response = () => new Response("{\"user\":\"previous person\"}");
  let now = 1_000;

  function setUp() {
    const storage = new FakeCacheStorage();
    vi.stubGlobal("caches", storage);
    vi.spyOn(Date, "now").mockImplementation(() => now);
    return storage;
  }

  /** What Workbox does for one request: note the start, then (later) try to cache. */
  async function startRequest() {
    const state: Record<string, unknown> = {};
    await signedOutGuard.requestWillFetch({ request, state } as never);
    return state;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    now = 1_000;
  });

  it("is on every route", () => {
    for (const entry of runtimeCaching) {
      expect(entry.options?.plugins).toContain(signedOutGuard);
    }
  });

  it("caches as before when nobody has signed out", async () => {
    setUp();
    const state = await startRequest();
    const res = response();
    expect(await signedOutGuard.cacheWillUpdate({ request, response: res, state } as never)).toBe(res);
  });

  it("refuses a response whose request was still in flight at sign-out", async () => {
    setUp();
    const state = await startRequest();
    now = 2_000;
    await clearSignedInCaches();
    now = 2_500;

    expect(await signedOutGuard.cacheWillUpdate({ request, response: response(), state } as never)).toBeNull();
  });

  it("caches the next person's requests, started after the sign-out", async () => {
    setUp();
    now = 2_000;
    await clearSignedInCaches();
    now = 3_000;
    const state = await startRequest();
    const res = response();

    expect(await signedOutGuard.cacheWillUpdate({ request, response: res, state } as never)).toBe(res);
  });

  it("removes the entry when the sign-out lands between the check and the write", async () => {
    const storage = setUp();
    const state = await startRequest();
    const res = response();
    // Checked before the sign-out, so the write goes ahead...
    expect(await signedOutGuard.cacheWillUpdate({ request, response: res, state } as never)).toBe(res);
    now = 2_000;
    await clearSignedInCaches();
    // ...and lands after it, reopening "apis" with the old user's response.
    await (await storage.open("apis")).put(request, res);
    expect(storage.entries("apis")).toEqual([request.url]);

    await signedOutGuard.cacheDidUpdate({ cacheName: "apis", request, state } as never);

    expect(storage.entries("apis")).toEqual([]);
  });
});
