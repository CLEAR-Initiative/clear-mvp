/**
 * Route patterns for analytics: a pathname with every id-like segment
 * collapsed to `:id`, and never a query string, hash or free text.
 *
 * `/event/cmvtdzfl0000fl307lu5gzbq3` → `/event/:id`. A segment survives only
 * when it is a plain lower-case route word (`detection`, `notification-preferences`);
 * anything else (cuids, numbers, uuids, slugs with digits or capitals,
 * encoded text) becomes `:id`.
 */

/** Marker for a property that holds a route pattern (see routePattern). */
export const ROUTE = "route" as const;

/** The value when there was no earlier in-app route (opened by URL). */
export const DIRECT_ROUTE = "direct";

const ROUTE_WORD = /^[a-z]+(?:-[a-z]+)*$/;
/** Static app route words longer than this are treated as ids, too. */
const MAX_WORD = 32;
const PATTERN = /^\/(?:(?:[a-z]+(?:-[a-z]+)*|:id)(?:\/(?:[a-z]+(?:-[a-z]+)*|:id))*)?$/;

export function routePattern(pathname: string | null | undefined): string {
  if (!pathname) return DIRECT_ROUTE;
  const path = pathname.split(/[?#]/)[0] ?? "";
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) return "/";
  return `/${segments.map((s) => (ROUTE_WORD.test(s) && s.length <= MAX_WORD ? s : ":id")).join("/")}`;
}

/** Whether `value` is something routePattern can produce. */
export function isRoutePattern(value: string): boolean {
  return value === DIRECT_ROUTE || (value.length <= 200 && PATTERN.test(value));
}
