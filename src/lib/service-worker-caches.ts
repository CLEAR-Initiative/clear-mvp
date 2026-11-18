/**
 * The service worker keeps the pages and `/api/*` responses this browser
 * loaded, so Observe opens offline. They belong to whoever was signed in, and
 * the worker serves them again whenever the network is slow or down: on a
 * shared device the next person could see the last person's pages and data.
 *
 * Sign-out drops every cache except the precache. The precache holds only the
 * build's static files (scripts, styles, icons, the offline page), which are
 * the same for every user, and losing it would break the next offline start.
 */
const PRECACHE_PREFIX = "workbox-precache";

export async function clearSignedInCaches(): Promise<void> {
  if (typeof caches === "undefined") return;
  try {
    const names = await caches.keys();
    await Promise.all(
      names.filter((name) => !name.startsWith(PRECACHE_PREFIX)).map((name) => caches.delete(name)),
    );
  } catch {
    // Storage refused (some private windows): there is nothing stored to clear.
  }
}
