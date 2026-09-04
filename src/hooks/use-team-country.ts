"use client";

import { useMemo } from "react";
import { useWorkingCountry } from "~/providers/working-country-provider";
import { isTeamScopeReady } from "~/lib/team-scope-ready";

export { isTeamScopeReady };

/**
 * The active team's country scope and working country.
 *
 * Single source of truth for "which country is this user looking at" so the
 * dashboard, detection, map and insights pages all frame the same country
 * instead of each hardcoding one. A team with no level-0 binding is treated as
 * global monitoring: `countryName` is null and callers should fall back to
 * their unscoped behaviour rather than substituting a default country.
 *
 * Now backed by WorkingCountryProvider and a cookie for persistence.
 */
export function useTeamCountry() {
  return useWorkingCountry();
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
 *
 * While `scopeReady` is false, hold the pick — do not treat an empty
 * binding list as unscoped.
 */
export function resolveSelectedCountry(
  scopedCountryNames: readonly string[],
  pickedCountry: string,
  scopeReady = true,
): string {
  if (!scopeReady) return pickedCountry;
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
