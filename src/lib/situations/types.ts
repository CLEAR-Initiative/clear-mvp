import type { GqlEvent } from "~/lib/types/graphql";

/** Soft cap for the Overview attention queue. */
export const SITUATION_SOFT_CAP = 8;

/** localStorage key for per-browser Overview last-seen timestamp (ISO). */
export const OVERVIEW_LAST_SEEN_KEY = "clear-overview-last-seen";

/** Fallback “new” window when last-seen is missing. */
export const NEW_FALLBACK_MS = 24 * 60 * 60 * 1000;

/** Boost weights applied on top of severity × freshness. */
export const ATTENTION_BOOSTS = {
  draft: 2,
  escalating: 1.5,
  newSinceVisit: 1,
} as const;

/**
 * A situation is **one event** plus its linked alerts/signals — the Overview
 * attention-queue unit. It is not a cluster of multiple events. Orphan
 * signals never become situations.
 */
export interface Situation {
  eventId: string;
  title: string;
  blurb: string;
  severity: number;
  lastSignalAt: string;
  firstSignalAt: string;
  signalCount: number;
  /** Non-archived alerts on the event. */
  alerts: Array<{ id: string; status: "draft" | "published" | "archived" | string }>;
  hasDraftAlert: boolean;
  hasPublishedAlert: boolean;
  isEscalating: boolean;
  isNewSinceVisit: boolean;
  attentionScore: number;
  /** Preferred geo for Map handoff / Overview globe pins. */
  locationId: string | null;
  lng: number | null;
  lat: number | null;
  /**
   * Event + signal locations for Overview globe heatmap (lava clusters).
   * Weights are relative within the situation; globe normalizes across queue.
   */
  heatPoints: Array<{ lng: number; lat: number; weight: number }>;
}

export type SituationInputEvent = Pick<
  GqlEvent,
  | "id"
  | "title"
  | "description"
  | "types"
  | "severity"
  | "rank"
  | "firstSignalCreatedAt"
  | "lastSignalCreatedAt"
  | "signals"
  | "alerts"
  | "generalLocation"
  | "originLocation"
  | "destinationLocation"
  | "representativePoint"
>;

export type SmartDestination =
  | { kind: "alert"; alertId: string; eventId: string; href: string }
  | { kind: "event"; eventId: string; href: string };

export interface AssembleSituationsOptions {
  events: SituationInputEvent[];
  /** ISO timestamp of last Overview visit, or null if never visited. */
  lastSeenAt: string | null;
  /** Wall clock for scoring / newness (injectable for tests). */
  now?: Date;
  /** Soft cap; defaults to {@link SITUATION_SOFT_CAP}. */
  softCap?: number;
  /**
   * Optional client-side country/location filter when the API was not
   * already scoped. Matches location id or ancestorIds.
   */
  locationId?: string | null;
}
