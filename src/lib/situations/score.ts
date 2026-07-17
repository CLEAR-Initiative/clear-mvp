import { ATTENTION_BOOSTS } from "./types";
import type { SituationInputEvent } from "./types";

const MS_PER_HOUR = 60 * 60 * 1000;
const ESCALATING_RECENT_MS = 48 * MS_PER_HOUR;
const ESCALATING_SPAN_MS = 6 * MS_PER_HOUR;

/**
 * Freshness in (0, 1]: full weight at `now`, ~0.5 at 24h, approaching 0 after ~7d.
 * Uses last signal time as the activity clock.
 */
export function freshnessScore(lastSignalAt: string | Date, now: Date = new Date()): number {
  const t = typeof lastSignalAt === "string" ? Date.parse(lastSignalAt) : lastSignalAt.getTime();
  if (!Number.isFinite(t)) return 0.1;
  const ageHours = Math.max(0, (now.getTime() - t) / MS_PER_HOUR);
  // Half-life ≈ 24h
  return Math.max(0.05, Math.exp(-Math.LN2 * (ageHours / 24)));
}

/**
 * Escalating heuristic — API has no escalating flag.
 * High severity + multi-signal activity with a recent last signal and a
 * meaningful first→last span (ongoing development, not a single spike).
 */
export function isEscalatingSituation(
  event: Pick<
    SituationInputEvent,
    "severity" | "firstSignalCreatedAt" | "lastSignalCreatedAt" | "signals"
  >,
  now: Date = new Date(),
): boolean {
  const severity = event.severity ?? 0;
  if (severity < 4) return false;

  const signalCount = event.signals?.length ?? 0;
  if (signalCount < 2) return false;

  const last = Date.parse(event.lastSignalCreatedAt);
  const first = Date.parse(event.firstSignalCreatedAt);
  if (!Number.isFinite(last) || !Number.isFinite(first)) return false;

  const recent = now.getTime() - last <= ESCALATING_RECENT_MS;
  const span = last - first >= ESCALATING_SPAN_MS;
  return recent && span;
}

export function hasDraftAlert(
  alerts: SituationInputEvent["alerts"] | undefined,
): boolean {
  return (alerts ?? []).some((a) => a.status === "draft");
}

export function hasPublishedAlert(
  alerts: SituationInputEvent["alerts"] | undefined,
): boolean {
  return (alerts ?? []).some((a) => a.status === "published");
}

export function computeAttentionScore(input: {
  severity: number | null | undefined;
  lastSignalAt: string;
  hasDraftAlert: boolean;
  isEscalating: boolean;
  isNewSinceVisit: boolean;
  now?: Date;
}): number {
  const severity = Math.max(1, Math.min(5, input.severity ?? 1));
  const freshness = freshnessScore(input.lastSignalAt, input.now);
  let score = severity * freshness;
  if (input.hasDraftAlert) score += ATTENTION_BOOSTS.draft;
  if (input.isEscalating) score += ATTENTION_BOOSTS.escalating;
  if (input.isNewSinceVisit) score += ATTENTION_BOOSTS.newSinceVisit;
  return score;
}
