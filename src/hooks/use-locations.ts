"use client";

import { useMemo } from "react";
import { api } from "~/trpc/react";
import { countryConfig, resolveCountryConfig, WORLD_VIEW } from "~/lib/constants/country-config";
import { flattenLocationTree } from "~/lib/location";

interface LocationNode {
  id: string;
  name: string;
  level: number;
  ancestorIds: string[];
  parent: { id: string; name: string } | null;
}

interface CountryTree {
  id: string;
  name: string;
  states: Array<{
    id: string;
    name: string;
    districts: Array<{ id: string; name: string }>;
  }>;
}

/**
 * Hook that provides location data from the API for filter dropdowns.
 * Falls back to hardcoded country-config while loading.
 */
export function useLocations() {
  const treeQuery = api.locations.tree.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 min cache
    refetchOnWindowFocus: false,
  });

  const tree: CountryTree[] = treeQuery.data ?? [];

  /** Country names for the dropdown */
  const countries = useMemo(() => {
    if (tree.length > 0) return tree.map((c) => c.name).sort();
    // Fallback to hardcoded while loading
    return Object.keys(countryConfig).sort();
  }, [tree]);

  /** Get state/region names for a country */
  const getRegions = useMemo(() => {
    return (countryName: string): string[] => {
      const country = tree.find((c) => c.name === countryName);
      if (country) {
        return ["All Regions", ...country.states.map((s) => s.name).sort()];
      }
      // Fallback
      return resolveCountryConfig(countryName)?.regions ?? ["All Regions"];
    };
  }, [tree]);

  /** Get district names for a state within a country */
  const getDistricts = useMemo(() => {
    return (countryName: string, stateName: string): string[] => {
      const country = tree.find((c) => c.name === countryName);
      if (!country) return ["All Districts"];
      const state = country.states.find((s) => s.name === stateName);
      if (!state) return ["All Districts"];
      return ["All Districts", ...state.districts.map((d) => d.name).sort()];
    };
  }, [tree]);

  /** Get location ID by name (for API queries) */
  const getLocationId = useMemo(() => {
    return (name: string): string | null => {
      for (const country of tree) {
        if (country.name === name) return country.id;
        for (const state of country.states) {
          if (state.name === name) return state.id;
          for (const district of state.districts) {
            if (district.name === name) return district.id;
          }
        }
      }
      return null;
    };
  }, [tree]);

  /**
   * Map center for a country (from hardcoded config for now).
   * Unknown or unset country falls back to a world view rather than a specific
   * country, so a team whose country has no config entry is not silently shown
   * someone else's operation.
   */
  const getCenter = (countryName: string): [number, number] =>
    resolveCountryConfig(countryName)?.center ?? WORLD_VIEW.center;

  const getZoom = (countryName: string): number =>
    resolveCountryConfig(countryName)?.zoom ?? WORLD_VIEW.zoom;

  /**
   * Flattened id→{name,level} map for resolving location names from ancestorIds.
   * Used by map markers when full ancestor objects aren't in the GraphQL payload.
   */
  const locationById = useMemo(() => flattenLocationTree(tree), [tree]);

  return {
    countries,
    getRegions,
    getDistricts,
    getLocationId,
    getCenter,
    getZoom,
    locationById,
    isLoading: treeQuery.isLoading,
    tree,
  };
}
