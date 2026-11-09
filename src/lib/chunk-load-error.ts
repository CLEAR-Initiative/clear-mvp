/**
 * A deploy replaces every hashed file under `/_next/static`. A tab still
 * running the previous build then asks for chunks that no longer exist (404),
 * or hits the frontend while the container restarts (502). Webpack and the
 * browser report that as a "chunk load" error. Reloading the page fetches the
 * new build's HTML and fixes it, so that's what we do, once.
 *
 * Next's router already reloads on its own when a navigation response comes
 * from a different build. These errors are the ones it can't see: lazy
 * `next/dynamic` chunks (the map on /detection) and RSC payloads prefetched
 * before the deploy.
 */

const CHUNK_ERROR_MESSAGES = [
  // webpack: `ChunkLoadError: Loading chunk 1234 failed.` Named chunks carry
  // route groups, e.g. `app/(app)/detection/page`.
  /Loading chunk \S+ failed/i,
  // webpack mini-css-extract: `Loading CSS chunk 1234 failed.`
  /Loading CSS chunk \S+ failed/i,
  // Native dynamic import(), per browser: Chrome, Safari, Firefox.
  /Failed to fetch dynamically imported module/i,
  /Importing a module script failed/i,
  /error loading dynamically imported module/i,
];

/** True when `error` means a JS or CSS chunk of this build couldn't be loaded. */
export function isChunkLoadError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const { name, message } = error as { name?: unknown; message?: unknown };
  if (name === "ChunkLoadError") return true;
  if (typeof message !== "string") return false;
  return CHUNK_ERROR_MESSAGES.some((pattern) => pattern.test(message));
}

/** sessionStorage key holding the time of the last chunk-error reload. */
export const CHUNK_RELOAD_KEY = "clear:chunk-reload-at";

/**
 * After a reload, a second chunk error inside this window means reloading
 * didn't help (the asset is really missing, or the server is still down).
 * Show the error instead of reloading in a loop.
 */
export const CHUNK_RELOAD_COOLDOWN_MS = 60_000;

type ReloadStorage = Pick<Storage, "getItem" | "setItem">;

/**
 * Decide whether to reload for a chunk error, and record the reload if so.
 *
 * Returns false without storage: with no record of the last reload there is
 * no loop guard, and an error screen beats a page that reloads forever.
 */
export function claimChunkReload(
  storage: ReloadStorage | null,
  now: number,
): boolean {
  if (!storage) return false;
  try {
    const last = Number(storage.getItem(CHUNK_RELOAD_KEY));
    if (Number.isFinite(last) && last > 0 && now - last < CHUNK_RELOAD_COOLDOWN_MS) {
      return false;
    }
    storage.setItem(CHUNK_RELOAD_KEY, String(now));
    return true;
  } catch {
    // Private mode, blocked site data, or a full quota.
    return false;
  }
}

/** sessionStorage, or null where reading it throws. */
export function sessionStorageOrNull(): ReloadStorage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * Reload the page if `error` is a chunk error and we haven't just reloaded
 * for one. Returns true when a reload was started.
 */
export function reloadOnceForChunkError(
  error: unknown,
  deps: {
    storage?: ReloadStorage | null;
    now?: number;
    reload?: () => void;
  } = {},
): boolean {
  if (!isChunkLoadError(error)) return false;
  const storage = deps.storage === undefined ? sessionStorageOrNull() : deps.storage;
  if (!claimChunkReload(storage, deps.now ?? Date.now())) return false;
  (deps.reload ?? (() => window.location.reload()))();
  return true;
}
