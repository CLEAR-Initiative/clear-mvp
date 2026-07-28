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
