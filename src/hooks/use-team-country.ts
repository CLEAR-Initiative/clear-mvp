"use client";

import { useMemo } from "react";
import { useTeam } from "~/providers/team-provider";
import { isoForCountryName } from "~/lib/constants/countries";

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

  /**
   * Every country in the team's scope, sorted by name. Sorting matters: the
   * API returns bindings in insertion order, so without it a multi-country
   * team would get a different "primary" country between loads.
   */
  const countries = useMemo(
    () =>
      (activeTeam?.locations ?? [])
        .filter((l) => l.level === 0)
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    [activeTeam],
  );

  // Alphabetically first country is the team's primary for defaulting purposes.
  const country = countries[0] ?? null;

  return {
    /** All level-0 countries in scope, alphabetical. Empty when unscoped. */
    countries,
    /** ISO 3166-1 alpha-2 of the primary country, or null when unresolved. */
    countryIso: isoForCountryName(country?.name),
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
 * Returns every country in the team's scope (a team can be bound to more than
 * one). An unscoped team gets all countries the API knows about, matching the
 * backend's "no location bindings = global monitoring" semantics in
 * `buildLocationFilterForTeam`.
 */
export function useScopedCountryOptions(allCountries: string[]): string[] {
  const { countries, hasCountryScope } = useTeamCountry();
  return useMemo(() => {
    if (!hasCountryScope) return allCountries;
    const scoped = new Set(countries.map((c) => c.name));
    return allCountries.filter((c) => scoped.has(c));
  }, [allCountries, countries, hasCountryScope]);
}
