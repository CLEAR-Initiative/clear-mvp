/**
 * Map → detail navigation context.
 * Written by the map page so event/signal detail prev/next stays inside the
 * active country/region filter (and the filtered marker id list) instead of
 * re-querying the unscoped global map feed.
 */

import { defaultMapNavTimeWindow } from "~/lib/detection-nav-context";

export interface MapNavContext {
  teamId: string | null;
  /** Country or region location id; null when browsing All Countries. */
  locationId: string | null;
  /**
   * Selected country label (`"All Countries"` or a country name). Used to
   * recover locationId after the locations tree loads.
   */
  country: string;
  /** Optional region label when a region filter is active. */
  region?: string;
  /** ISO from; `null` means map timeframe "all" (no lower bound). */
  from?: string | null;
  /** ISO to; `null` means map timeframe "all" (no upper bound). */
  to?: string | null;
}

const STORAGE_KEY = "map-nav-context";
const EVENT_IDS_STORAGE_KEY = "map-nav-event-ids";
const SIGNAL_IDS_STORAGE_KEY = "map-nav-signal-ids";

export const ALL_COUNTRIES = "All Countries";
export const ALL_REGIONS = "All Regions";

function writeIdList(key: string, ids: readonly string[]): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(ids));
  } catch {
    /* private mode / quota */
  }
}

function readIdList(key: string): string[] | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const ids = parsed.filter(
      (id): id is string => typeof id === "string" && id.length > 0,
    );
    return ids.length > 0 ? ids : null;
  } catch {
    return null;
  }
}

export function writeMapNavContext(context: MapNavContext): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(context));
  } catch {
    /* private mode / quota */
  }
}

export function readMapNavContext(): MapNavContext | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as MapNavContext;
  } catch {
    return null;
  }
}

/** Persist filtered map Event marker order for detail prev/next (same-tab). */
export function writeMapNavEventIds(ids: readonly string[]): void {
  writeIdList(EVENT_IDS_STORAGE_KEY, ids);
}

export function readMapNavEventIds(): string[] | null {
  return readIdList(EVENT_IDS_STORAGE_KEY);
}

/** Persist filtered map Signal marker order for detail prev/next (same-tab). */
export function writeMapNavSignalIds(ids: readonly string[]): void {
  writeIdList(SIGNAL_IDS_STORAGE_KEY, ids);
}

export function readMapNavSignalIds(): string[] | null {
  return readIdList(SIGNAL_IDS_STORAGE_KEY);
}

export function getDefaultMapNavContext(
  teamId: string | null = null,
): MapNavContext {
  const window = defaultMapNavTimeWindow();
  return {
    teamId,
    locationId: null,
    country: ALL_COUNTRIES,
    from: window.from,
    to: window.to,
  };
}

/** True when the analyst selected a specific country (or region under one). */
export function isMapNavScoped(context: MapNavContext): boolean {
  return context.country !== ALL_COUNTRIES && context.country.length > 0;
}

/**
 * Resolve a usable locationId for map → detail prev/next queries.
 * When a country filter is active, never treat a missing locationId as
 * "query all countries" — wait for the locations tree instead.
 */
export function resolveMapNavContext(
  getLocationId: (name: string) => string | null,
  teamId: string | null = null,
): MapNavContext {
  const stored = readMapNavContext();
  const base = stored ?? getDefaultMapNavContext(teamId);

  if (base.locationId) {
    return base.teamId === teamId ? base : { ...base, teamId };
  }

  if (!isMapNavScoped(base)) {
    return { ...base, teamId: base.teamId ?? teamId, locationId: null };
  }

  // Prefer region name when present; fall back to country.
  const resolveName =
    base.region && base.region !== ALL_REGIONS ? base.region : base.country;
  const locationId = getLocationId(resolveName) ?? getLocationId(base.country);

  return {
    ...base,
    teamId: base.teamId ?? teamId,
    locationId,
  };
}

/**
 * Whether the map feed query is safe to run.
 * Scoped filters require a resolved locationId so arrows cannot escape the
 * active country.
 */
export function isMapNavQueryReady(context: MapNavContext): boolean {
  if (!isMapNavScoped(context)) return true;
  return !!context.locationId;
}
