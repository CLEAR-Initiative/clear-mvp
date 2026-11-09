import type { AlertSortOrder } from "../_components/live-alerts-tab";
import type { EventSortOrder } from "../_components/events-tab";
import type { SignalSortOrder } from "../_components/signals-tab";

/** Rows per page for every Detection feed. */
export const DETECTION_PAGE_SIZE = 25;

// Map UI sort labels to API orderBy enum values.
// Types must match the z.enum() definitions in alerts.ts router exactly.
type EventOrderBy = "LAST_SIGNAL_DESC" | "LAST_SIGNAL_ASC" | "CREATED_DESC" | "CREATED_ASC" | "SEVERITY_DESC" | "SEVERITY_ASC";
type AlertOrderBy = "CREATED_DESC" | "CREATED_ASC" | "SEVERITY_DESC" | "SEVERITY_ASC";
type SignalOrderBy = "PUBLISHED_DESC" | "PUBLISHED_ASC" | "SEVERITY_DESC" | "SEVERITY_ASC";

export const EVENT_ORDER_MAP: Record<EventSortOrder, EventOrderBy> = {
  "sev-desc": "SEVERITY_DESC",
  "sev-asc":  "SEVERITY_ASC",
  "newest":   "LAST_SIGNAL_DESC",
  "oldest":   "LAST_SIGNAL_ASC",
};
export const ALERT_ORDER_MAP: Record<AlertSortOrder, AlertOrderBy> = {
  "sev-desc": "SEVERITY_DESC",
  "sev-asc":  "SEVERITY_ASC",
  "newest":   "CREATED_DESC",
  "oldest":   "CREATED_ASC",
};
export const SIGNAL_ORDER_MAP: Record<SignalSortOrder, SignalOrderBy> = {
  "newest":   "PUBLISHED_DESC",
  "oldest":   "PUBLISHED_ASC",
  "sev-desc": "SEVERITY_DESC",
  "sev-asc":  "SEVERITY_ASC",
};
