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
    /** The week's events in range, counted plus excluded. Absent from a
     * clear-api that predates it (see `DETECTION_METRICS_QUERY_V1`). */
    eventsInRange?: number | null;
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
    /** counted / eventsInRange: how much of the range the TTD shares speak for. */
    measured: number | null;
  };
  histogram: Array<{
    daysAfterOnset: number;
    isOpenEnded: boolean;
    count: number;
    /** count / counted */
    share: number | null;
  }>;
  weekly: DetectionWeek[];
  exclusions: Array<{ reason: string; count: number }>;
}

/** One ISO week of the trend, with its shares. */
export interface DetectionWeek {
  isoWeek: string;
  weekStart: string;
  /** null when clear-api does not report it yet. */
  eventsInRange: number | null;
  counted: number;
  sameDay: number;
  byNextDay: number;
  isPartial: boolean;
  sameDayShare: number | null;
  byNextDayShare: number | null;
  /** counted / eventsInRange; null with no events or no `eventsInRange`. */
  measuredShare: number | null;
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
      measured: share(raw.counted, raw.eventsInRange),
    },
    histogram: raw.histogram.map((row) => ({ ...row, share: share(row.count, raw.counted) })),
    weekly: raw.weekly.map((week) => {
      const eventsInRange = week.eventsInRange ?? null;
      return {
        ...week,
        eventsInRange,
        sameDayShare: share(week.sameDay, week.counted),
        byNextDayShare: share(week.byNextDay, week.counted),
        measuredShare: eventsInRange === null ? null : share(week.counted, eventsInRange),
      };
    }),
    exclusions: raw.exclusions,
  };
}

/** A trend point over a window of weeks ending at `week`. */
export interface RollingWeek extends DetectionWeek {
  /** How many weeks the window holds: `ROLLING_WEEKS`, fewer at the start. */
  windowWeeks: number;
}

/** Weeks in a rolling window. A month smooths the week-to-week noise of a
 * few dozen events without hiding a change for long. */
export const ROLLING_WEEKS = 4;

/**
 * Each week with its counts summed over the `size` weeks ending there and
 * the shares recomputed from those sums: a share of all the window's events,
 * not an average of weekly shares, so a quiet week weighs what it holds.
 * Coverage is null for a window with any week lacking `eventsInRange`.
 */
export function rollingWeekly(weekly: DetectionWeek[], size = ROLLING_WEEKS): RollingWeek[] {
  return weekly.map((week, i) => {
    const window = weekly.slice(Math.max(0, i - size + 1), i + 1);
    const sum = (pick: (w: DetectionWeek) => number) => window.reduce((n, w) => n + pick(w), 0);
    const counted = sum((w) => w.counted);
    const sameDay = sum((w) => w.sameDay);
    const byNextDay = sum((w) => w.byNextDay);
    const eventsInRange = window.every((w) => w.eventsInRange !== null) ? sum((w) => w.eventsInRange!) : null;
    return {
      ...week,
      eventsInRange,
      counted,
      sameDay,
      byNextDay,
      sameDayShare: share(sameDay, counted),
      byNextDayShare: share(byNextDay, counted),
      measuredShare: eventsInRange === null ? null : share(counted, eventsInRange),
      windowWeeks: window.length,
    };
  });
}

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
/** clear-api's longest range (ADR-0011). */
export const MAX_SPAN_DAYS = 364;
/** The trend's shortest span: half a year, so a change has room to show. */
export const TREND_WEEKS = 26;

/** Monday 00:00 UTC of the ISO week `at` falls in, as clear-api counts it. */
export function startOfIsoWeek(at: Date): Date {
  const day = Math.floor(at.getTime() / DAY_MS);
  const weekday = (((day + 3) % 7) + 7) % 7;
  return new Date((day - weekday) * DAY_MS);
}

export interface MetricsRangeInput {
  from?: string;
  to?: string;
  locationId?: string;
}

/**
 * The trend's query: whole ISO weeks, at least `TREND_WEEKS` and at least
 * the picked range, ending at the picked `to` (or now), plus `leadWeeks`
 * before them so the first shown week's rolling window is full. Kept within
 * clear-api's 364 days by trimming the lead-in first, then the oldest weeks.
 * `showFrom` is the first week to draw.
 */
export function trendRange(
  input: MetricsRangeInput,
  now: Date,
  leadWeeks = ROLLING_WEEKS - 1,
): { input: MetricsRangeInput; showFrom: string } {
  const to = input.to ? new Date(input.to) : now;
  const lastWeek = startOfIsoWeek(to).getTime();
  let showFrom = lastWeek - (TREND_WEEKS - 1) * WEEK_MS;
  if (input.from) showFrom = Math.min(showFrom, startOfIsoWeek(new Date(input.from)).getTime());
  // The earliest Monday clear-api accepts for this `to`.
  const earliest = startOfIsoWeek(new Date(to.getTime() - MAX_SPAN_DAYS * DAY_MS)).getTime() + WEEK_MS;
  showFrom = Math.max(showFrom, earliest);
  const fetchFrom = Math.max(showFrom - leadWeeks * WEEK_MS, earliest);
  const out: MetricsRangeInput = { from: new Date(fetchFrom).toISOString() };
  if (input.to) out.to = input.to;
  if (input.locationId) out.locationId = input.locationId;
  return { input: out, showFrom: new Date(showFrom).toISOString() };
}

/** The range just before [from, to], of the same length: what the tiles
 * compare against. */
export function previousRange(range: { from: string; to: string }): { from: string; to: string } {
  const from = new Date(range.from).getTime();
  const to = new Date(range.to).getTime();
  const prevTo = from - 1;
  return { from: new Date(prevTo - (to - from)).toISOString(), to: new Date(prevTo).toISOString() };
}

/** The change from `previous` to `current` in whole percentage points, or
 * null when either has no denominator. Taken between the rounded percents,
 * so it always matches the two numbers on screen. */
export function deltaPoints(current: number | null, previous: number | null): number | null {
  return current === null || previous === null ? null : Math.round(current * 100) - Math.round(previous * 100);
}
