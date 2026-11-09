import { mapSeverity } from "~/lib/types/graphql";
import { BRIEF_ITEM_KINDS, type Brief, type BriefItem, type BriefItemKind, type EntityCount } from "./types";

/**
 * One view of a Brief for every place it is rendered: the composer, the PDF
 * and the clipboard copy all read this, so they show the same sections, in
 * the same order, with the same items. Pure: the caller passes the wording.
 */

export type SeverityKey = ReturnType<typeof mapSeverity>;
/** Severity buckets in the order a Brief lists them. */
export const SEVERITY_ORDER: readonly SeverityKey[] = ["critical", "high", "medium", "low", "unknown"];

/** Disaster types (or Signal sources) shown per kind before "+n more". */
export const TOP_TYPES = 6;

export interface BriefViewLabels {
  /** "Alerts", "Events", "Signals". */
  group: (kind: BriefItemKind) => string;
  severity: (key: SeverityKey) => string;
  /** A disaster-type code as a person reads it. */
  type: (code: string) => string;
  /** A date, for the "from <date>" mark. */
  date: (iso: string) => string;
  /** A date and time, for the window and item times. */
  dateTime: (iso: string) => string;
  /** "Covers <start> → <end>". */
  window: (start: string, end: string) => string;
  /** "from <date>": an item picked from before the window. */
  earlier: (date: string) => string;
}

export interface CountBucket {
  key: string;
  label: string;
  count: number;
}

export interface CountRow {
  kind: BriefItemKind;
  label: string;
  total: number;
  /** Non-empty severity buckets, most severe first. */
  bySeverity: (CountBucket & { key: SeverityKey })[];
  /** Disaster types for Alerts and Events, sources for Signals; the top `TOP_TYPES`. */
  byType: CountBucket[];
  /** Types (or sources) left out of `byType`. */
  moreTypes: number;
}

export interface ViewItem {
  id: string;
  key: string;
  kind: BriefItemKind;
  title: string;
  severity: SeverityKey;
  severityLabel: string;
  locationName: string | null;
  types: string[];
  occurredAt: string;
  occurredLabel: string;
  /** "from <date>" when the item happened before the Brief window, else null. */
  earlier: string | null;
  note: string | null;
  url: string;
}

export interface ViewGroup {
  kind: BriefItemKind;
  label: string;
  items: ViewItem[];
}

export interface BriefView {
  title: string;
  areaName: string;
  windowLabel: string;
  summary: string;
  counts: CountRow[];
  /** Always all three groups, Alerts → Events → Signals; a group may be empty. */
  groups: ViewGroup[];
  closingNotes: string;
}

/** A kind's counts as rows of labelled buckets. */
export function toCountRow(kind: BriefItemKind, count: EntityCount, labels: BriefViewLabels): CountRow {
  const bySeverity = new Map<SeverityKey, number>();
  for (const b of count.bySeverity) {
    const n = Number(b.key);
    const key = Number.isFinite(n) && b.key.trim() !== "" ? mapSeverity(n) : "unknown";
    bySeverity.set(key, (bySeverity.get(key) ?? 0) + b.count);
  }
  const types = [...count.byType].sort((a, b) => b.count - a.count);
  return {
    kind,
    label: labels.group(kind),
    total: count.total,
    bySeverity: SEVERITY_ORDER.flatMap((key) => {
      const n = bySeverity.get(key) ?? 0;
      return n > 0 ? [{ key, label: labels.severity(key), count: n }] : [];
    }),
    byType: types.slice(0, TOP_TYPES).map((b) => ({
      key: b.key,
      // Signals count by data source, which is already a name.
      label: kind === "signal" ? b.key : labels.type(b.key),
      count: b.count,
    })),
    moreTypes: Math.max(0, types.length - TOP_TYPES),
  };
}

/** A picked item as the Brief shows it. */
export function toViewItem(item: BriefItem, windowStart: string, labels: BriefViewLabels): ViewItem {
  const s = item.snapshot;
  const severity = mapSeverity(s.severity);
  const earlier = new Date(s.occurredAt).getTime() < new Date(windowStart).getTime();
  return {
    id: item.id,
    key: `${item.kind}:${item.entityId}`,
    kind: item.kind,
    title: s.title,
    severity,
    severityLabel: labels.severity(severity),
    locationName: s.locationName,
    types: [...new Set(s.eventTypes.map(labels.type))],
    occurredAt: s.occurredAt,
    occurredLabel: labels.dateTime(s.occurredAt),
    earlier: earlier ? labels.earlier(labels.date(s.occurredAt)) : null,
    note: item.note?.trim() ? item.note : null,
    url: s.url,
  };
}

export function toBriefView(brief: Brief, labels: BriefViewLabels): BriefView {
  return {
    title: brief.title,
    areaName: brief.locationName,
    windowLabel: labels.window(labels.dateTime(brief.windowStart), labels.dateTime(brief.windowEnd)),
    summary: brief.summary,
    counts: BRIEF_ITEM_KINDS.map((kind) => toCountRow(kind, brief.counts[kind], labels)),
    groups: BRIEF_ITEM_KINDS.map((kind) => ({
      kind,
      label: labels.group(kind),
      items: brief.items
        .filter((i) => i.kind === kind)
        .sort((a, b) => a.position - b.position)
        .map((i) => toViewItem(i, brief.windowStart, labels)),
    })),
    closingNotes: brief.closingNotes,
  };
}
