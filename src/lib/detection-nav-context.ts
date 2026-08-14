/**
 * Detection navigation context - shared filter state for event prev/next navigation.
 * Written by detection page, read by event page to maintain consistent ordering.
 */

export interface DetectionNavContext {
  teamId: string | null;
  locationId: string | null;
  /** Country name used to recover locationId after the locations tree loads. */
  country?: string;
  from: string;
  to: string;
  severityMin?: number;
  severityMax?: number;
  eventTypes?: string[];
  orderBy: "LAST_SIGNAL_DESC" | "LAST_SIGNAL_ASC" | "CREATED_DESC" | "CREATED_ASC" | "SEVERITY_DESC" | "SEVERITY_ASC";
  signalOrderBy?: "PUBLISHED_DESC" | "PUBLISHED_ASC" | "SEVERITY_DESC" | "SEVERITY_ASC";
  sourceNames?: string[];
}

const STORAGE_KEY = "detection-nav-context";
const FILTERS_STORAGE_KEY = "detection-filters";
/** Ordered entity ids from the Detection feed the analyst actually saw. */
const EVENT_IDS_STORAGE_KEY = "detection-nav-event-ids";
const SIGNAL_IDS_STORAGE_KEY = "detection-nav-signal-ids";

export function writeDetectionNavContext(context: DetectionNavContext): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(context));
  } catch {
    // Ignore storage errors (private browsing, quota exceeded)
  }
}

export function readDetectionNavContext(): DetectionNavContext | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as DetectionNavContext;
  } catch {
    return null;
  }
}

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
    const ids = parsed.filter((id): id is string => typeof id === "string" && id.length > 0);
    return ids.length > 0 ? ids : null;
  } catch {
    return null;
  }
}

/** Persist Detection Events/Alerts order for detail prev/next (same-tab). */
export function writeDetectionNavEventIds(ids: readonly string[]): void {
  writeIdList(EVENT_IDS_STORAGE_KEY, ids);
}

export function readDetectionNavEventIds(): string[] | null {
  return readIdList(EVENT_IDS_STORAGE_KEY);
}

/** Persist Detection Signals order for detail prev/next (same-tab). */
export function writeDetectionNavSignalIds(ids: readonly string[]): void {
  writeIdList(SIGNAL_IDS_STORAGE_KEY, ids);
}

export function readDetectionNavSignalIds(): string[] | null {
  return readIdList(SIGNAL_IDS_STORAGE_KEY);
}

function readStoredFilterCountry(): string | null {
  try {
    const raw = sessionStorage.getItem(FILTERS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { country?: string };
    return parsed.country ?? null;
  } catch {
    return null;
  }
}

export function getDefaultDetectionNavContext(
  getLocationId: (name: string) => string | null,
  teamId: string | null = null,
): DetectionNavContext {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);
  const country = "Sudan";

  return {
    teamId,
    country,
    locationId: getLocationId(country),
    from: thirtyDaysAgo.toISOString(),
    to: now.toISOString(),
    orderBy: "LAST_SIGNAL_DESC",
  };
}

/**
 * Resolve a usable locationId for Detection prev/next queries.
 * Never returns a context that would query unfiltered (all countries) when a
 * country filter is intended — waits for the locations tree via null locationId.
 */
export function resolveDetectionNavContext(
  getLocationId: (name: string) => string | null,
  teamId: string | null = null,
): DetectionNavContext {
  const stored = readDetectionNavContext();
  const base = stored ?? getDefaultDetectionNavContext(getLocationId, teamId);

  if (base.locationId) {
    return base.teamId === teamId ? base : { ...base, teamId };
  }

  const country = base.country ?? readStoredFilterCountry() ?? "Sudan";
  const locationId = getLocationId(country);

  return {
    ...base,
    teamId: base.teamId ?? teamId,
    country,
    locationId,
  };
}

/** Default map browse window (matches map page timeframe default of 30d). */
export function defaultMapNavTimeWindow(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 30);
  return { from: from.toISOString(), to: to.toISOString() };
}

/**
 * Prefer the Detection feed id list the analyst saw; fall back to a re-queried
 * page of ids. Stored list wins whenever non-empty so load-more order and
 * filter drift cannot blank the chevrons.
 */
export function resolveDetailNavIds(
  storedIds: readonly string[] | null | undefined,
  queriedIds: readonly string[],
): string[] {
  if (storedIds && storedIds.length > 0) return [...storedIds];
  return [...queriedIds];
}
