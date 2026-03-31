"use client";

import { useMemo } from "react";
import { api } from "~/trpc/react";

/**
 * Hook that provides disaster type name lookup from glide numbers.
 * Fetches disaster types from the API and returns a mapping function.
 */
export function useDisasterTypes() {
  const query = api.subscriptions.disasterTypes.useQuery(undefined, {
    staleTime: 10 * 60 * 1000, // 10 min cache
    refetchOnWindowFocus: false,
  });

  const glideToName = useMemo(() => {
    const map = new Map<string, string>();
    for (const dt of query.data ?? []) {
      map.set(dt.glideNumber, dt.disasterType);
    }
    return map;
  }, [query.data]);

  /** Convert a glide number to its display name. Falls back to uppercase glide number. */
  const getTypeName = (glideNumber: string): string => {
    return glideToName.get(glideNumber) ?? glideNumber.toUpperCase();
  };

  /** Convert an array of glide numbers to display names. */
  const getTypeNames = (glideNumbers: string[]): string[] => {
    return glideNumbers.map(getTypeName);
  };

  return { getTypeName, getTypeNames, isLoading: query.isLoading };
}
