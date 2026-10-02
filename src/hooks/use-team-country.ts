"use client";

import { useMemo } from "react";
import { useWorkingCountry } from "~/providers/working-country-provider";
import { isTeamScopeReady } from "~/lib/team-scope-ready";
import { ALL_COUNTRIES } from "~/lib/constants/country-config";

export { ALL_COUNTRIES };

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
 * Picker rows: scoped names, plus All Countries unless the team is pinned
 * to a single binding (that team gets a label, not a dropdown).
 */
export function pickerCountryOptions(
  allCountries: readonly string[],
  scopedCountryNames: readonly string[],
): string[] {
  const listed = scopeCountryOptions(allCountries, scopedCountryNames);
  if (scopedCountryNames.length === 1) {
    return listed.length > 0 ? listed : [...scopedCountryNames];
  }
  const names = listed.length > 0 ? listed : [...scopedCountryNames];
  return [ALL_COUNTRIES, ...names];
}

/**
 * Country the picker should display.
 *
 * One binding pins the page (no escape hatch). Several bindings honour an
 * in-scope pick; empty / All Countries / out-of-scope means all assigned
 * countries (world camera). No bindings (global monitoring) use the pick
 * as-is, defaulting to All Countries when ready.
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
      : ALL_COUNTRIES;
  }
  return pickedCountry || ALL_COUNTRIES;
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
 * Empty / out-of-scope picks are not stale: those resolve to All Countries
 * on a multi-country team (all assigned countries, world camera).
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
