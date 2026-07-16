/**
 * Slim marker cache for instant map paint on hard refresh.
 *
 * Persists only the minimal marker payload needed for rendering:
 * id, coordinates, severity, title, and classification fields.
 * Does NOT cache full GeoJSON boundaries or detailed entity data.
 *
 * Strategy: seed from cache on mount, write-through on success,
 * soft "Updating…" state while network revalidates.
 */

import type { CrisisMarker } from "~/app/(app)/map/_components/map-markers-data";

const CACHE_VERSION = 1;
const CACHE_KEY_PREFIX = "clear-map-markers";
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedMarkerPayload {
  version: number;
  savedAt: number;
  teamId: string | null;
  dataView: string;
  markers: CrisisMarker[];
}

function getCacheKey(teamId: string | null | undefined, dataView: string): string {
  return `${CACHE_KEY_PREFIX}:${teamId ?? "global"}:${dataView}`;
}

/**
 * Read markers from localStorage cache. Returns null if cache miss,
 * expired, or version mismatch.
 */
export function readMarkerCache(
  teamId: string | null | undefined,
  dataView: string,
): CrisisMarker[] | null {
  if (typeof window === "undefined") return null;
  
  try {
    const key = getCacheKey(teamId, dataView);
    const raw = localStorage.getItem(key);
    if (!raw) return null;

    const payload: CachedMarkerPayload = JSON.parse(raw);

    // Version mismatch → discard
    if (payload.version !== CACHE_VERSION) {
      localStorage.removeItem(key);
      return null;
    }

    // Expired → discard
    const age = Date.now() - payload.savedAt;
    if (age > TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }

    return payload.markers;
  } catch {
    // Parse error or localStorage unavailable (private browsing)
    return null;
  }
}

/**
 * Write markers to localStorage cache. Silently ignores errors
 * (e.g. quota exceeded, private browsing).
 */
export function writeMarkerCache(
  teamId: string | null | undefined,
  dataView: string,
  markers: CrisisMarker[],
): void {
  if (typeof window === "undefined") return;

  try {
    const key = getCacheKey(teamId, dataView);
    const payload: CachedMarkerPayload = {
      version: CACHE_VERSION,
      savedAt: Date.now(),
      teamId: teamId ?? null,
      dataView,
      markers,
    };
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Quota exceeded or localStorage unavailable — ignore
  }
}

/**
 * Clear all map marker caches (useful for manual cleanup or logout).
 */
export function clearMarkerCache(): void {
  if (typeof window === "undefined") return;

  try {
    const keys = Object.keys(localStorage);
    for (const key of keys) {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    // ignore
  }
}
