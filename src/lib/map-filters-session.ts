/**
 * The Map's region and timeframe filters, for this tab (sessionStorage).
 *
 * Kept apart from the camera snapshot (map-view-state.ts) because they must
 * survive without a camera: no Mapbox token, or leaving before the map has
 * loaded. Tagged with the country they were chosen in, so they come back
 * only for that country (map → details → back, a reload, a revisit of an
 * Agent deep link, an Agent navigation's Back).
 */

export const MAP_FILTERS_SESSION_STORAGE_KEY = "clear.map.filters.v1";

export const MAP_FILTER_TIMEFRAMES = ["7d", "30d", "90d", "all"] as const;
export type MapFilterTimeframe = (typeof MAP_FILTER_TIMEFRAMES)[number];

export interface MapFiltersSession {
  country: string;
  /** Absent = All Regions. */
  region?: string;
  timeframe: MapFilterTimeframe;
}

export function readMapFiltersSession(): MapFiltersSession | null {
  try {
    const raw = sessionStorage.getItem(MAP_FILTERS_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (typeof o.country !== "string" || !o.country) return null;
    if (!(MAP_FILTER_TIMEFRAMES as readonly unknown[]).includes(o.timeframe)) return null;
    return {
      country: o.country,
      ...(typeof o.region === "string" && o.region ? { region: o.region } : {}),
      timeframe: o.timeframe as MapFilterTimeframe,
    };
  } catch {
    return null;
  }
}

export function writeMapFiltersSession({ country, region, timeframe }: MapFiltersSession): void {
  try {
    sessionStorage.setItem(
      MAP_FILTERS_SESSION_STORAGE_KEY,
      JSON.stringify({ country, ...(region && region !== "All Regions" ? { region } : {}), timeframe }),
    );
  } catch {
    /* private mode / quota */
  }
}
