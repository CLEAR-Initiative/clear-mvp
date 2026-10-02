"use client";

import { useRef } from "react";
import { ALL_COUNTRIES } from "~/lib/constants/country-config";

/**
 * Last country the picker framed, surviving an All Countries zoom-out so the
 * globe stays centered on that country instead of jumping to WORLD_VIEW.
 */
export function useLastFocusedCountry(selectedCountry: string): string | null {
  const last = useRef<string | null>(null);
  if (selectedCountry && selectedCountry !== ALL_COUNTRIES) {
    last.current = selectedCountry;
  }
  return last.current;
}
