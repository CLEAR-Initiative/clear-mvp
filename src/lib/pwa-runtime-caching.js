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
 * next-pwa's default runtime routes, minus the ones that handle other sites.
 * Same-origin pages and `/api/*` stay cached: Observe has to open offline.
 */
export const runtimeCaching = nextPwaDefaults.filter(
  (entry) => !CROSS_ORIGIN_CACHE_NAMES.includes(entry.options?.cacheName ?? ""),
);
