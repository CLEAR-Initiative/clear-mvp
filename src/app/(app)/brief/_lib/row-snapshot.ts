import type { HistoryRow } from "../../detection/_components/history-tab";
import type { BriefItemKind, BriefItemSnapshot } from "~/lib/brief/types";
import { resolveLocationName } from "~/lib/location";

/**
 * What a ticked History row looks like in the Brief until clear-api answers
 * with the item it built. Display only: clear-api never takes a snapshot from
 * the client, and its own replaces this one as soon as the add returns.
 */
export function provisionalSnapshot(row: HistoryRow, untitled: string): BriefItemSnapshot {
  if (row.kind === "signal") {
    const s = row.data;
    return {
      title: s.title ?? s.description ?? untitled,
      severity: s.severity ?? null,
      locationName: resolveLocationName(s.generalLocation ?? s.originLocation ?? s.destinationLocation),
      eventTypes: [],
      occurredAt: s.publishedAt,
      url: `/signal/${s.id}`,
    };
  }
  const e = row.kind === "alert" ? row.data.event : row.data;
  return {
    title: e.title ?? e.description ?? e.types[0] ?? untitled,
    severity: e.severity ?? null,
    locationName: resolveLocationName(e.generalLocation ?? e.originLocation ?? e.destinationLocation),
    eventTypes: e.types,
    occurredAt: e.firstSignalCreatedAt,
    url: `/event/${e.id}`,
  };
}

/** The Brief item kind and entity id a History row stands for. */
export function rowEntity(row: HistoryRow): { kind: BriefItemKind; entityId: string } {
  return { kind: row.kind, entityId: row.id };
}
