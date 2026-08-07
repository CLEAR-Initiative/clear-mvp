"use client";

import { useMemo } from "react";
import { useTeam } from "~/providers/team-provider";

/**
 * The active team's country scope (level-0 location binding).
 *
 * Single source of truth for "which country is this user looking at" so the
 * dashboard, detection, map and insights pages all frame the same country
 * instead of each hardcoding one. A team with no level-0 binding is treated as
 * global monitoring: `countryName` is null and callers should fall back to
 * their unscoped behaviour rather than substituting a default country.
 */
export function useTeamCountry() {
  const { activeTeam, isLoading } = useTeam();

  const country = useMemo(
    () => activeTeam?.locations.find((l) => l.level === 0) ?? null,
    [activeTeam],
  );

  return {
    /** Location id of the team's country, or null when unscoped. */
    countryId: country?.id ?? null,
    /**
     * Country name as stored in `locations` (the long COD/UN form, e.g.
     * "Venezuela (Bolivarian Republic of)"). Pass through
     * `resolveCountryConfig` for centre/zoom/pCode - it handles the aliasing.
     */
    countryName: country?.name ?? null,
    /** False while teams are still loading, or when the team monitors globally. */
    hasCountryScope: country !== null,
    isLoading,
  };
}

/**
 * Country names the active team may switch between.
 *
 * Returns the team's own country only. An unscoped team gets every country the
 * API knows about, matching the backend's "no location bindings = global
 * monitoring" semantics in `buildLocationFilterForTeam`.
 */
export function useScopedCountryOptions(allCountries: string[]): string[] {
  const { countryName, hasCountryScope } = useTeamCountry();
  return useMemo(() => {
    if (!hasCountryScope || !countryName) return allCountries;
    return allCountries.filter((c) => c === countryName);
  }, [allCountries, countryName, hasCountryScope]);
}
