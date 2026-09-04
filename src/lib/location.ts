import type { GqlLocation } from "~/lib/types/graphql";

/**
 * Flatten a locations tree (from api.locations.tree) into an id→{name,level} map.
 * Used to resolve location names from ancestorIds when full ancestor objects
 * aren't available on the location payload (e.g. map feeds).
 */
export function flattenLocationTree(
  tree: Array<{
    id: string;
    name: string;
    states: Array<{
      id: string;
      name: string;
      districts: Array<{ id: string; name: string }>;
    }>;
  }>,
): Map<string, { name: string; level: number }> {
  const map = new Map<string, { name: string; level: number }>();
  
  for (const country of tree) {
    map.set(country.id, { name: country.name, level: 0 });
    
    for (const state of country.states) {
      map.set(state.id, { name: state.name, level: 1 });
      
      for (const district of state.districts) {
        map.set(district.id, { name: district.name, level: 2 });
      }
    }
  }
  
  return map;
}

/**
 * Resolve a location name from ancestorIds using a pre-built id→name map.
 * Prefers the most specific admin level ≤ 2 (A2 > A1 > A0).
 * Returns null if no suitable ancestor is found.
 */
export function resolveNameFromAncestorIds(
  ancestorIds: string[] | null | undefined,
  locationById: Map<string, { name: string; level: number }>,
): string | null {
  if (!ancestorIds || ancestorIds.length === 0) return null;
  
  let bestMatch: { name: string; level: number } | null = null;
  
  for (const id of ancestorIds) {
    const loc = locationById.get(id);
    if (!loc || loc.level > 2) continue;
    
    // Keep the most specific (highest level ≤ 2)
    if (!bestMatch || loc.level > bestMatch.level) {
      bestMatch = loc;
    }
  }
  
  return bestMatch?.name ?? null;
}

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
 *   4. (NEW) If ancestors array is missing but ancestorIds is present, and a
 *      locationById lookup is provided, fall back to resolving from ancestorIds.
 */
export function resolveLocationName(
  location: GqlLocation | null | undefined,
  options?: {
    /** Optional id→name map for fallback when ancestors array is missing */
    locationById?: Map<string, { name: string; level: number }>;
  },
): string | null {
  if (!location) return null;
  if (location.pointType === "landmark-geocoded") return location.name;
  if (location.level <= 2) return location.name;
  
  // Level > 2 with non-landmark provenance: find nearest ancestor at level <= 2
  const ancestor = (location.ancestors ?? [])
    .filter((a) => a.level <= 2)
    .sort((a, b) => b.level - a.level)[0]; // highest level <= 2 = most specific
  
  if (ancestor) return ancestor.name;
  
  // Fallback: if ancestors array is missing but we have ancestorIds + lookup map
  if (options?.locationById && location.ancestorIds) {
    return resolveNameFromAncestorIds(location.ancestorIds, options.locationById);
  }
  
  return null;
}

/**
 * True when `location` is the country itself or sits under it.
 * Crisis list payloads ship `ancestorIds` without a full `ancestors` walk.
 */
export function locationInCountry(
  location:
    | {
        id: string;
        ancestorIds?: string[] | null;
        ancestors?: Array<{ id: string }> | null;
      }
    | null
    | undefined,
  countryId: string,
): boolean {
  if (!location || !countryId) return false;
  if (location.id === countryId) return true;
  if (location.ancestorIds?.includes(countryId)) return true;
  return location.ancestors?.some((a) => a.id === countryId) ?? false;
}
