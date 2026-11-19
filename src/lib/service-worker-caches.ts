import { SIGNED_OUT_CACHE, SIGNED_OUT_KEY } from "./signed-out-marker";

/**
 * The service worker keeps the pages and `/api/*` responses this browser
 * loaded, so Observe opens offline. They belong to whoever was signed in, and
 * the worker serves them again whenever the network is slow or down: on a
 * shared device the next person could see the last person's pages and data.
 *
 * Sign-out records when it happened, then drops every cache except the
 * precache and that record. The precache holds only the build's static files
 * (scripts, styles, icons, the offline page), the same for every user, and
 * losing it would break the next offline start. The record is what lets the
 * worker refuse responses to requests that were still in flight at sign-out
 * (see `signedOutGuard` in ./pwa-runtime-caching.js), so it is written first.
 *
 * The two steps fail separately. Writing the record can fail when storage is
 * full, and that is exactly when the caches hold the most: the deletion still
 * runs. Without the record, only responses still in flight can come back.
 */
const PRECACHE_PREFIX = "workbox-precache";

export async function clearSignedInCaches(): Promise<void> {
  if (typeof caches === "undefined") return;

  try {
    const marker = await caches.open(SIGNED_OUT_CACHE);
    await marker.put(SIGNED_OUT_KEY, new Response(String(Date.now())));
  } catch {
    // Storage full or refused: still clear what is there, below.
  }

  try {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((name) => name !== SIGNED_OUT_CACHE && !name.startsWith(PRECACHE_PREFIX))
        .map((name) => caches.delete(name).catch(() => false)),
    );
  } catch {
    // Storage refused (some private windows): there is nothing stored to clear.
  }
}
