/**
 * Detection navigation context - shared filter state for event prev/next navigation.
 * Written by detection page, read by event page to maintain consistent ordering.
 */

export interface DetectionNavContext {
  teamId: string | null;
  locationId: string | null;
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

export function getDefaultDetectionNavContext(
  getLocationId: (name: string) => string | null,
  teamId: string | null = null,
): DetectionNavContext {
  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);
  
  return {
    teamId,
    locationId: getLocationId("Sudan"),
    from: thirtyDaysAgo.toISOString(),
    to: now.toISOString(),
    orderBy: "LAST_SIGNAL_DESC",
  };
}
