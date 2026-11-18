// Plain JS: next.config.js imports this, and it runs before TypeScript is set up.
import { runtimeCaching as nextPwaDefaults } from "@ducanh2912/next-pwa";

/**
 * Caches whose routes match requests to other sites. The service worker
 * proxies a matched request; when its own fetch fails (an ad blocker, a
 * proxy, a request cut off mid-navigation) and nothing is cached, the page
 * gets `net::ERR_FAILED` instead of the response. That left the Overview map
 * black after sign-in: every Mapbox request (script, stylesheet, style JSON,
 * tiles) went through `cross-origin`. A hard refresh skips the worker and
 * worked.
 *
 * The two Google Fonts routes never fire (next/font self-hosts our fonts),
 * so they go too. With no route, the browser fetches other sites itself.
 */
export const CROSS_ORIGIN_CACHE_NAMES = Object.freeze([
  "cross-origin",
  "google-fonts-webfonts",
  "google-fonts-stylesheets",
]);

/**
 * Keeps a response out of the cache when its request began before the last
 * sign-out. Sign-out (src/lib/service-worker-caches.ts) writes the time first
 * and then deletes the caches, but a request already in flight in another tab
 * finishes later, and Workbox would reopen `apis` or `pages` and save the old
 * user's response for the next person to be served offline.
 *
 * - `requestWillFetch` notes when the request started, in Workbox's
 *   per-request `state`.
 * - `cacheWillUpdate` refuses the write if a sign-out came after that.
 * - `cacheDidUpdate` checks again after the write and removes the entry. That
 *   covers a sign-out landing between the check and the write.
 *
 * Workbox copies these functions into sw.js as source text, so they cannot
 * use imports or anything outside their own body. That is why the check is
 * written out twice and the marker's cache name and key are literals: they
 * must equal SIGNED_OUT_CACHE and SIGNED_OUT_KEY in ./signed-out-marker.js.
 */
export const signedOutGuard = Object.freeze({
  requestWillFetch: async ({ request, state }) => {
    if (state) state.startedAt = Date.now();
    return request;
  },
  cacheWillUpdate: async ({ response, state }) => {
    const startedAt = state ? state.startedAt : undefined;
    if (typeof startedAt !== "number") return response;
    const marker = await caches.match("/__clear-signed-out-at", { cacheName: "clear-signed-out-at" });
    const signedOutAt = marker ? Number(await marker.text()) : 0;
    return startedAt <= signedOutAt ? null : response;
  },
  cacheDidUpdate: async ({ cacheName, request, state }) => {
    const startedAt = state ? state.startedAt : undefined;
    if (typeof startedAt !== "number") return;
    const marker = await caches.match("/__clear-signed-out-at", { cacheName: "clear-signed-out-at" });
    const signedOutAt = marker ? Number(await marker.text()) : 0;
    if (startedAt <= signedOutAt) await (await caches.open(cacheName)).delete(request);
  },
});

/**
 * next-pwa's default runtime routes, minus the ones that handle other sites,
 * each with the sign-out guard added. Same-origin pages and `/api/*` stay
 * cached: Observe has to open offline.
 */
export const runtimeCaching = nextPwaDefaults
  .filter((entry) => !CROSS_ORIGIN_CACHE_NAMES.includes(entry.options?.cacheName ?? ""))
  .map((entry) => ({
    ...entry,
    options: {
      ...entry.options,
      plugins: [...(entry.options?.plugins ?? []), signedOutGuard],
    },
  }));
