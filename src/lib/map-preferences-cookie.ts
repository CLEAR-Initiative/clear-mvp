/**
 * Map preferences cookie — persist data view, boundary level, and other
 * map-specific UI state so the page remembers the user's last selection.
 *
 * Stored per team so switching teams doesn't leak another team's view state.
 */

import type { DataView } from "~/app/(app)/map/_components/map-layers-panel";
import type { BoundaryLevel } from "~/app/(app)/map/_components/map-settings-popover";
import type { BaseMapType } from "~/components/map/crisis-map";

export const MAP_PREFERENCES_COOKIE = "clear-map-prefs";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days (shorter than working country)

export type MapPreferences = {
  dataView?: DataView;
  boundaryLevel?: BoundaryLevel;
  showPopulation?: boolean;
  showRoads?: boolean;
  showNrcLocations?: boolean;
  baseMapType?: BaseMapType;
};

/** Per-team map preferences: `{ [teamId]: MapPreferences }`. */
export type MapPreferencesMap = Record<string, MapPreferences>;

export function parseMapPreferencesCookie(value: string | undefined): MapPreferencesMap {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    const map: MapPreferencesMap = {};
    for (const [teamId, prefs] of Object.entries(parsed)) {
      if (typeof prefs === "object" && prefs !== null && !Array.isArray(prefs)) {
        map[teamId] = prefs as MapPreferences;
      }
    }
    return map;
  } catch {
    return {};
  }
}

export function serializeMapPreferencesCookie(map: MapPreferencesMap): string {
  return JSON.stringify(map);
}

export function readMapPreferencesFromDocument(): MapPreferencesMap {
  if (typeof document === "undefined") return {};
  const raw = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${MAP_PREFERENCES_COOKIE}=`))
    ?.slice(MAP_PREFERENCES_COOKIE.length + 1);
  if (!raw) return {};
  try {
    return parseMapPreferencesCookie(decodeURIComponent(raw));
  } catch {
    return parseMapPreferencesCookie(raw);
  }
}

export function setMapPreferencesCookie(
  teamId: string,
  preferences: MapPreferences,
): void {
  if (typeof document === "undefined") return;
  const map = readMapPreferencesFromDocument();
  map[teamId] = { ...map[teamId], ...preferences };
  document.cookie = `${MAP_PREFERENCES_COOKIE}=${encodeURIComponent(
    serializeMapPreferencesCookie(map),
  )}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
}

export function getMapPreferences(
  teamId: string | null,
): MapPreferences | null {
  const map = readMapPreferencesFromDocument();
  
  // If we have a teamId, use that team's preferences
  if (teamId && map[teamId]) {
    return map[teamId]!;
  }
  
  // If no teamId yet but there's only one team in the cookie, use it
  // (handles initial render before activeTeamId hydrates)
  const entries = Object.values(map);
  if (!teamId && entries.length === 1) {
    return entries[0]!;
  }
  
  return null;
}

/**
 * Resolve defaults for missing preferences.
 */
export function resolveMapPreferences(
  stored: MapPreferences | null,
): Required<MapPreferences> {
  return {
    dataView: stored?.dataView ?? "alert",
    boundaryLevel: stored?.boundaryLevel ?? "A1",
    showPopulation: stored?.showPopulation ?? false,
    showRoads: stored?.showRoads ?? true,
    showNrcLocations: stored?.showNrcLocations ?? false,
    baseMapType: stored?.baseMapType ?? "simple",
  };
}
