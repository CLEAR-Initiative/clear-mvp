import * as Sentry from "@sentry/nextjs";

/**
 * Report an error that map code caught and chose to continue past.
 *
 * The map component wraps most Mapbox calls in `try { … } catch {}`, because
 * two failures are normal: the map was removed (unmount, cleanup order), or
 * the style is reloading (basemap or theme switch). An empty catch hides
 * every other failure too. Call this from the catch instead: it ignores the
 * two normal cases and reports the rest to GlitchTip.
 *
 * It never throws and never changes control flow, so a catch that calls it
 * behaves as the empty catch did.
 */

/**
 * The map as the call site holds it. Typed loosely on purpose: call sites
 * pass a real Mapbox map, a narrowed interface of one, or null.
 */
export type MapLike = unknown;

/** True when the failure is one of the two normal cases. */
export function isExpectedMapError(map: MapLike, error: unknown): boolean {
  // Removed or never created: every call fails, and nothing is left to fix.
  const live = map as { _removed?: boolean; style?: unknown } | null | undefined;
  if (!live || live._removed === true || live.style == null) return true;
  const message = error instanceof Error ? error.message : String(error);
  // Mapbox throws this from most style methods while a style loads.
  return /style is not done loading/i.test(message);
}

/** One report per site and message in a page session, and a hard cap. */
const MAX_REPORTS = 25;
const reported = new Set<string>();

/** Test hook: forget what was reported. */
export function resetReportedMapErrors(): void {
  reported.clear();
}

/**
 * `site` names the Mapbox call that failed (for example "removeLayer"). It
 * becomes a tag and part of the fingerprint, so one failing call is one
 * GlitchTip issue.
 */
export function reportMapError(map: MapLike, error: unknown, site: string): void {
  try {
    if (isExpectedMapError(map, error)) return;
    const err = error instanceof Error ? error : new Error(String(error));
    // Hover and render paths can fail on every frame. Report each once.
    const key = `${site}|${err.name}|${err.message}`;
    if (reported.has(key) || reported.size >= MAX_REPORTS) return;
    reported.add(key);
    Sentry.captureException(err, {
      level: "warning",
      tags: { feature: "map", stage: "swallowed", site, handled: "true" },
      fingerprint: ["map-swallowed", site, err.name, err.message.replace(/\d+/g, "N")],
    });
  } catch {
    /* reporting must never break the map */
  }
}
