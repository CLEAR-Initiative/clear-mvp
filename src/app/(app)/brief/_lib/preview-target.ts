import type { BriefItem } from "~/lib/brief/types";
import type { HistoryRow } from "../../detection/_components/history-tab";

/**
 * What opens when a row or a picked item is clicked: an Event (Alerts open
 * their Event) in the detail drawer, so the Brief stays on screen, or a
 * Signal's page in a new tab, as there is no Signal drawer.
 */
export type PreviewTarget = { kind: "event"; eventId: string } | { kind: "signal"; signalId: string };

export function rowPreviewTarget(row: HistoryRow): PreviewTarget {
  if (row.kind === "alert") return { kind: "event", eventId: row.data.event.id };
  if (row.kind === "event") return { kind: "event", eventId: row.id };
  return { kind: "signal", signalId: row.id };
}

/** An Alert item names the alert; its snapshot URL names the Event it raises. */
export function itemPreviewTarget(item: Pick<BriefItem, "kind" | "entityId" | "snapshot">): PreviewTarget | null {
  if (item.kind === "signal") return { kind: "signal", signalId: item.entityId };
  if (item.kind === "event") return { kind: "event", eventId: item.entityId };
  const eventId = /\/event\/([^/?#]+)/.exec(item.snapshot.url)?.[1];
  return eventId ? { kind: "event", eventId: decodeURIComponent(eventId) } : null;
}
