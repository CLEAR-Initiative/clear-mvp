/**
 * Briefs as clear-api's GraphQL returns them (clear-api `brief.ts` typeDef).
 * The `briefs` tRPC router passes these through unchanged.
 */

export type BriefCadence = "daily" | "weekly" | "monthly";
export type BriefStatus = "draft" | "sent";
export type BriefItemKind = "alert" | "event" | "signal";

/** Groups in the order a Brief shows them. */
export const BRIEF_ITEM_KINDS: readonly BriefItemKind[] = ["alert", "event", "signal"];
export const BRIEF_CADENCES: readonly BriefCadence[] = ["daily", "weekly", "monthly"];

export interface BriefItemSnapshot {
  title: string;
  /** 1 to 5, or null when unknown. */
  severity: number | null;
  locationName: string | null;
  /** Disaster-type codes. */
  eventTypes: string[];
  /** Alerts and Events: their first Signal. Signals: publication. */
  occurredAt: string;
  /** The item's page in the CLEAR app (absolute). */
  url: string;
}

export interface BriefItem {
  id: string;
  briefId: string;
  kind: BriefItemKind;
  entityId: string;
  /** Order within its kind group, from 0. */
  position: number;
  note: string | null;
  snapshot: BriefItemSnapshot;
  createdAt: string;
  updatedAt: string;
}

export interface StatsBucket {
  key: string;
  count: number;
}

export interface EntityCount {
  total: number;
  /** Keys "1" to "5", "(unknown)" for none. */
  bySeverity: StatsBucket[];
  /** Disaster-type codes for Events and Alerts; data-source names for Signals. */
  byType: StatsBucket[];
}

export interface BriefCounts {
  signal: EntityCount;
  event: EntityCount;
  alert: EntityCount;
}

export interface Brief {
  id: string;
  cadence: BriefCadence;
  status: BriefStatus;
  title: string;
  locationId: string;
  locationName: string;
  windowStart: string;
  windowEnd: string;
  summary: string;
  closingNotes: string;
  items: BriefItem[];
  counts: BriefCounts;
  createdById: string;
  sentAt: string | null;
  sentById: string | null;
  sentToListId: string | null;
  sentCount: number | null;
  failedCount: number | null;
  createdAt: string;
  updatedAt: string;
}

/** A Brief in the list of past Briefs: no items or counts. */
export type BriefSummary = Omit<Brief, "items" | "counts" | "summary" | "closingNotes">;

export interface RecipientListMember {
  id: string;
  listId: string;
  email: string;
  unsubscribedAt: string | null;
  createdAt: string;
}

export interface RecipientList {
  id: string;
  name: string;
  members: RecipientListMember[];
  /** Members a send would reach: those who haven't unsubscribed. */
  recipientCount: number;
  createdById: string;
  createdAt: string;
  updatedAt: string;
}

export interface BriefSendResult {
  sent: number;
  failed: number;
}

/** A picked item's identity, the same string as `historyRowKey` for its row. */
export function briefItemKey(item: Pick<BriefItem, "kind" | "entityId">): string {
  return `${item.kind}:${item.entityId}`;
}
