import type { GqlLocation } from "~/lib/types/graphql";

/**
 * Pick the best display name for a signal/event's location.
 *
 * Rules, in order:
 *   1. If the location IS a landmark-geocoded L4 (`pointType === 'landmark-geocoded'`),
 *      use its own name. The geoparser resolved this from text like "Nyala
 *      Airport" or "Khartoum" — those names are exactly what we want to show,
 *      and they're more specific than the A2 parent.
 *   2. If level <= 2 (admin polygon), use its own name.
 *   3. Otherwise (level 3 or 4 with non-landmark provenance — typically a
 *      coord-derived point), fall back to the nearest ancestor at level <= 2.
 *      This is the original behaviour for legacy "signal-title L4" rows
 *      created by createPointLocation, where the L4's own name is the signal
 *      title and not useful for display.
 */
export function resolveLocationName(location: GqlLocation | null | undefined): string | null {
  if (!location) return null;
  if (location.pointType === "landmark-geocoded") return location.name;
  if (location.level <= 2) return location.name;
  // Level > 2 with non-landmark provenance: find nearest ancestor at level <= 2
  const ancestor = (location.ancestors ?? [])
    .filter((a) => a.level <= 2)
    .sort((a, b) => b.level - a.level)[0]; // highest level <= 2 = most specific
  return ancestor?.name ?? null;
}
