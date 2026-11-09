/** Briefs for unit tests: a draft, items and plain-English view labels. */
import type { Brief, BriefItem, EntityCount } from "./types";
import type { BriefViewLabels } from "./view";

export const LABELS: BriefViewLabels = {
  group: (kind) => ({ alert: "Alerts", event: "Events", signal: "Signals" })[kind],
  severity: (key) => key.toUpperCase(),
  type: (code) => `type:${code}`,
  date: (iso) => iso.slice(0, 10),
  dateTime: (iso) => iso.slice(0, 16),
  window: (start, end) => `${start} to ${end}`,
  earlier: (date) => `from ${date}`,
};

export const EMPTY: EntityCount = { total: 0, bySeverity: [], byType: [] };

export function item(over: Partial<BriefItem> & Pick<BriefItem, "id" | "kind" | "position">): BriefItem {
  return {
    briefId: "b1",
    entityId: `${over.id}-entity`,
    note: null,
    createdAt: "2026-10-30T00:00:00.000Z",
    updatedAt: "2026-10-30T00:00:00.000Z",
    ...over,
    snapshot: {
      title: over.id,
      severity: 4,
      locationName: "North Darfur",
      eventTypes: ["fl"],
      occurredAt: "2026-10-30T06:00:00.000Z",
      url: `https://app/event/${over.id}`,
      ...over.snapshot,
    },
  };
}

export function brief(over: Partial<Brief> = {}): Brief {
  return {
    id: "b1",
    cadence: "daily",
    status: "draft",
    title: "Daily Brief, Sudan",
    locationId: "sdn",
    locationName: "Sudan",
    windowStart: "2026-10-29T12:00:00.000Z",
    windowEnd: "2026-10-30T12:00:00.000Z",
    summary: "",
    closingNotes: "",
    items: [],
    counts: { signal: EMPTY, event: EMPTY, alert: EMPTY },
    createdById: "u1",
    sentAt: null,
    sentById: null,
    sentToListId: null,
    sentCount: null,
    failedCount: null,
    createdAt: "2026-10-30T12:00:00.000Z",
    updatedAt: "2026-10-30T12:00:00.000Z",
    ...over,
  };
}
