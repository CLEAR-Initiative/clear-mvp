"use client";

import { createContext, useContext, useCallback, useMemo, useState, useEffect } from "react";
import { useTeam } from "~/providers/team-provider";
import { isoForCountryName } from "~/lib/constants/countries";
import { isTeamScopeReady } from "~/lib/team-scope-ready";
import {
  initialWorkingCountryMap,
  readWorkingCountryCookieFromDocument,
  resolveWorkingCountry,
  setWorkingCountryCookie,
  storedWorkingCountry,
} from "~/lib/working-country-cookie";
import type { TeamLocation } from "~/lib/types/teams";

type WorkingCountryContextType = {
  /** All L0 countries in scope, alphabetical. Empty when unscoped. */
  countries: readonly TeamLocation[];
  /** Location id of the working country, or null when unscoped/unresolved. */
  countryId: string | null;
  /** Country name (long UN form) of the working country, or null. */
  countryName: string | null;
  /** ISO 3166-1 alpha-2 of the working country, or null. */
  countryIso: string | null;
  /** False when unscoped or teams are still loading. */
  hasCountryScope: boolean;
  /** True when the country selector should be shown (2+ countries in scope). */
  showCountrySelector: boolean;
  /** Change the working country (writes cookie; name required when unscoped). */
  setWorkingCountry: (locationId: string, name?: string) => void;
  isLoading: boolean;
  /** True once we know this team's bindings (including "none"). */
  scopeReady: boolean;
};

const WorkingCountryContext = createContext<WorkingCountryContextType | null>(null);

type Props = {
  children: React.ReactNode;
  /** Server-side cookie value for SSR hydration. */
  initialCookieValue?: string;
};

export function WorkingCountryProvider({ children, initialCookieValue }: Props) {
  const { activeTeam, activeTeamId, teams, isLoading } = useTeam();
  const scopeReady = isTeamScopeReady({ isLoading, teams, activeTeam });

  const [cookieMap, setCookieMap] = useState(() =>
    initialWorkingCountryMap(initialCookieValue),
  );

  // Hot reload / client nav: merge whatever is on document.cookie.
  useEffect(() => {
    const fromDoc = readWorkingCountryCookieFromDocument();
    if (Object.keys(fromDoc).length === 0) return;
    setCookieMap((prev) => ({ ...prev, ...fromDoc }));
  }, []);

  const countries = useMemo(
    () =>
      (activeTeam?.locations ?? [])
        .filter((l) => l.level === 0)
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    [activeTeam],
  );

  const stored = storedWorkingCountry(cookieMap, activeTeamId);
  const working = resolveWorkingCountry(countries, stored, scopeReady);

  const setWorkingCountry = useCallback(
    (locationId: string, name?: string) => {
      if (!activeTeamId) return;
      if (name === "All Countries") {
        setCookieMap((prev) => {
          const next = { ...prev };
          delete next[activeTeamId];
          return next;
        });
        return;
      }
      const location = countries.find((c) => c.id === locationId);
      const entry = location
        ? { id: location.id, name: location.name }
        : name
          ? { id: locationId, name }
          : null;
      if (!entry) return;
      setCookieMap((prev) => ({ ...prev, [activeTeamId]: entry }));
      setWorkingCountryCookie(activeTeamId, entry);
    },
    [activeTeamId, countries],
  );

  const value: WorkingCountryContextType = {
    countries,
    countryId: working?.id ?? null,
    countryName: working?.name || null,
    countryIso: isoForCountryName(working?.name || null),
    hasCountryScope: countries.length > 0,
    showCountrySelector: countries.length > 1,
    setWorkingCountry,
    isLoading,
    scopeReady,
  };

  return (
    <WorkingCountryContext.Provider value={value}>
      {children}
    </WorkingCountryContext.Provider>
  );
}

export function useWorkingCountry() {
  const ctx = useContext(WorkingCountryContext);
  if (!ctx) throw new Error("useWorkingCountry must be used within WorkingCountryProvider");
  return ctx;
}
