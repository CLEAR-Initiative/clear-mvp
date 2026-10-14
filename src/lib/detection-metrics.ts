/**
 * Time to detection (TTD), as clear-api's `detectionMetrics` reports it
 * (clear-api ADR-0011, "Time to detection"). clear-api owns the definition
 * and returns counts only; this module adds the shares the /metrics page
 * shows and nothing else. Never recompute which events count here.
 */

/** Why an event in range is left out of the TTD counts (clear-api enum). */
export const EXCLUSION_REASONS = [
  "NO_INGESTED_SIGNAL",
  "NO_ONSET",
  "DATE_ONLY_FIRST_SIGNAL",
  "BEFORE_ONSET",
] as const;

export type ExclusionReason = (typeof EXCLUSION_REASONS)[number];

/** clear-api's `DetectionMetrics` payload, as fetched. */
export interface GqlDetectionMetrics {
  from: string;
  to: string;
  eventsInRange: number;
  withOnset: number;
  counted: number;
  sameDay: number;
  byNextDay: number;
  histogram: Array<{ daysAfterOnset: number; isOpenEnded: boolean; count: number }>;
  weekly: Array<{
    isoWeek: string;
    weekStart: string;
    counted: number;
    sameDay: number;
    byNextDay: number;
    isPartial: boolean;
  }>;
  exclusions: Array<{ reason: string; count: number }>;
}

/** What the /metrics page reads: the counts plus their shares. */
export interface DetectionMetrics {
  from: string;
  to: string;
  eventsInRange: number;
  withOnset: number;
  counted: number;
  sameDay: number;
  byNextDay: number;
  shares: {
    /** sameDay / counted */
    sameDay: number | null;
    /** byNextDay / counted */
    byNextDay: number | null;
    /** withOnset / eventsInRange */
    withOnset: number | null;
  };
  histogram: Array<{
    daysAfterOnset: number;
    isOpenEnded: boolean;
    count: number;
    /** count / counted */
    share: number | null;
  }>;
  weekly: Array<{
    isoWeek: string;
    weekStart: string;
    counted: number;
    sameDay: number;
    byNextDay: number;
    isPartial: boolean;
    sameDayShare: number | null;
    byNextDayShare: number | null;
  }>;
  exclusions: Array<{ reason: string; count: number }>;
}

/** `metrics.detection`'s result: the metrics, or clear-api not serving them yet. */
export type DetectionMetricsResult =
  | { status: "ok"; metrics: DetectionMetrics }
  | { status: "unavailable" };

/** numerator / denominator, or null when there is nothing to divide by. */
export function share(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

/** Add the shares to clear-api's counts. */
export function withShares(raw: GqlDetectionMetrics): DetectionMetrics {
  return {
    from: raw.from,
    to: raw.to,
    eventsInRange: raw.eventsInRange,
    withOnset: raw.withOnset,
    counted: raw.counted,
    sameDay: raw.sameDay,
    byNextDay: raw.byNextDay,
    shares: {
      sameDay: share(raw.sameDay, raw.counted),
      byNextDay: share(raw.byNextDay, raw.counted),
      withOnset: share(raw.withOnset, raw.eventsInRange),
    },
    histogram: raw.histogram.map((row) => ({ ...row, share: share(row.count, raw.counted) })),
    weekly: raw.weekly.map((week) => ({
      ...week,
      sameDayShare: share(week.sameDay, week.counted),
      byNextDayShare: share(week.byNextDay, week.counted),
    })),
    exclusions: raw.exclusions,
  };
}
