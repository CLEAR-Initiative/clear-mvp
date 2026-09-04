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
 * Country names the picker may list.
 *
 * A scoped team sees only its bindings. An unscoped team sees every country
 * the API knows about (global monitoring, same as `buildLocationFilterForTeam`).
 */
export function scopeCountryOptions(
  allCountries: readonly string[],
  scopedCountryNames: readonly string[],
): string[] {
  if (scopedCountryNames.length === 0) return [...allCountries];
  const scoped = new Set(scopedCountryNames);
  return allCountries.filter((c) => scoped.has(c));
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
  const { countries } = useTeamCountry();
  return useMemo(
    () => scopeCountryOptions(allCountries, countries.map((c) => c.name)),
    [allCountries, countries],
  );
}

/**
 * Country the picker should display.
 *
 * One binding pins the page (no escape hatch). Several bindings default to
 * the first name but honour a pick that is still in scope. No bindings
 * (global monitoring) use the pick as-is, including "All Countries".
 */
export function resolveSelectedCountry(
  scopedCountryNames: readonly string[],
  pickedCountry: string,
): string {
  if (scopedCountryNames.length === 1) return scopedCountryNames[0]!;
  if (scopedCountryNames.length > 1) {
    return scopedCountryNames.includes(pickedCountry)
      ? pickedCountry
      : scopedCountryNames[0]!;
  }
  return pickedCountry;
}

export type StaleCountryPick = {
  picked: string;
  selected: string;
  options: string[];
};

/**
 * True when the picker listed several countries, the user picked one of
 * them, and the page displayed something else. That is the Detection
 * "dropdown works but stays Afghanistan" failure — a logic pin, not a throw.
 *
 * Empty / out-of-scope picks are not stale: those default to the first
 * scoped name on purpose.
 */
export function staleCountryPick(args: {
  options: readonly string[];
  picked: string;
  selected: string;
}): StaleCountryPick | null {
  const { options, picked, selected } = args;
  if (options.length <= 1) return null;
  if (!picked) return null;
  if (!options.includes(picked)) return null;
  if (selected === picked) return null;
  return { picked, selected, options: [...options] };
}
