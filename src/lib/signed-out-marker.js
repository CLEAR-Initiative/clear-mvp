// Plain JS, no imports: shared by the page (sign-out) and next.config.js (the
// service worker's routes). The worker's plugin functions repeat these two
// strings as literals, because they are copied into sw.js as source text;
// src/lib/pwa-runtime-caching.test.ts checks the copies match.

/** Cache holding the time of the last sign-out on this browser. Sign-out keeps it. */
export const SIGNED_OUT_CACHE = "clear-signed-out-at";

/** The one entry in that cache. Its body is `Date.now()` at sign-out. */
export const SIGNED_OUT_KEY = "/__clear-signed-out-at";
