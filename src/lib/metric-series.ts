/**
 * One metric at a time, over time: the series behind the /metrics "Progress
 * over time" section. clear-api serves each metric's `series` by day, ISO week
 * or calendar month (clear-api ADR-0014) and owns every definition; this
 * module names the metrics the page can pick, turns each query's counts into
 * one bucket shape (numerator over denominator, per group), and adds the
 * reading aids: totals across groups, the default bucket size for a range,
 * deploy markers per bucket, and a before-and-after around the latest marker.
 * Never recompute which events or signals count here.
 */

import { share } from "./detection-metrics";
import { DEPLOY_MARKERS, EMPHASIS_SOURCE, type DeployMarkerKey } from "./location-precision";

export const GRANULARITIES = ["DAY", "WEEK", "MONTH"] as const;
export type Granularity = (typeof GRANULARITIES)[number];

export const METRIC_KEYS = ["detectedByNextDay", "detectedSameDay", "districtOrFiner"] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];

export type MetricDimension = "timeliness" | "accuracy";

/** What the page knows about a metric: where its series comes from and how it is grouped. */
export interface MetricDefinition {
  key: MetricKey;
  /** The Notion Metrics dimension the metric sits under; the selector groups by it. */
  dimension: MetricDimension;
  /** Which clear-api query serves the series. */
  source: "detection" | "locationPrecision";
  /** True when clear-api returns one series per data source. */
  perSource: boolean;
  /** The group to emphasise when drawing per-source lines. */
  emphasis: string | null;
}

export const METRICS: Record<MetricKey, MetricDefinition> = {
  detectedByNextDay: { key: "detectedByNextDay", dimension: "timeliness", source: "detection", perSource: false, emphasis: null },
  detectedSameDay: { key: "detectedSameDay", dimension: "timeliness", source: "detection", perSource: false, emphasis: null },
  districtOrFiner: { key: "districtOrFiner", dimension: "accuracy", source: "locationPrecision", perSource: true, emphasis: EMPHASIS_SOURCE },
};

/** One bucket of one group: the metric is `numerator / denominator`. */
export interface SeriesBucket {
  /** Start of the bucket, ISO 8601 UTC. */
  start: string;
  /** clear-api's label: `2026-10-29`, `2026-W44` or `2026-10`. */
  label: string;
  /** True when the range covers only part of the bucket. */
  isPartial: boolean;
  /** The data source for a per-source metric, null for a single series. */
  group: string | null;
  numerator: number;
  denominator: number;
}

export interface MetricSeries {
  metric: MetricKey;
  granularity: Granularity;
  from: string;
  to: string;
  /** Group names in clear-api's order (most signals first), empty for a single series. */
  groups: string[];
  /** Group by group, ascending buckets within each, zero-filled by clear-api. */
  buckets: SeriesBucket[];
}

/** `metrics.series`'s result: the series, or clear-api not serving it yet. */
export type MetricSeriesResult = { status: "ok"; series: MetricSeries } | { status: "unavailable" };

/** clear-api's `detectionMetrics`, as the series document selects it. */
export interface GqlDetectionSeries {
  from: string;
  to: string;
  granularity: Granularity;
  series: Array<{ start: string; label: string; isPartial: boolean; counted: number; sameDay: number; byNextDay: number }>;
}

/** clear-api's `locationPrecisionMetrics`, as the series document selects it. */
export interface GqlLocationPrecisionSeries {
  from: string;
  to: string;
  granularity: Granularity;
  bySource: Array<{ source: string; total: number }>;
  series: Array<{ start: string; label: string; isPartial: boolean; source: string; total: number; district: number; point: number }>;
}

/** A time-to-detection share per bucket: same day or by next day, over the counted events. */
export function detectionSeries(metric: "detectedSameDay" | "detectedByNextDay", raw: GqlDetectionSeries): MetricSeries {
  return {
    metric,
    granularity: raw.granularity,
    from: raw.from,
    to: raw.to,
    groups: [],
    buckets: raw.series.map((row) => ({
      start: row.start,
      label: row.label,
      isPartial: row.isPartial,
      group: null,
      numerator: metric === "detectedSameDay" ? row.sameDay : row.byNextDay,
      denominator: row.counted,
    })),
  };
}

/** District or finer per source and bucket, over the source's located signals. */
export function precisionSeries(raw: GqlLocationPrecisionSeries): MetricSeries {
  return {
    metric: "districtOrFiner",
    granularity: raw.granularity,
    from: raw.from,
    to: raw.to,
    groups: raw.bySource.map((row) => row.source),
    buckets: raw.series.map((row) => ({
      start: row.start,
      label: row.label,
      isPartial: row.isPartial,
      group: row.source,
      numerator: row.district + row.point,
      denominator: row.total,
    })),
  };
}

/** One bucket with every group added up: the "all sources" line. */
export interface TotalBucket {
  start: string;
  label: string;
  isPartial: boolean;
  numerator: number;
  denominator: number;
}

/** The groups summed per bucket, ascending; a single series is returned as is. */
export function totalsByBucket(series: MetricSeries): TotalBucket[] {
  const byStart = new Map<string, TotalBucket>();
  for (const bucket of series.buckets) {
    const total = byStart.get(bucket.start);
    if (total) {
      total.numerator += bucket.numerator;
      total.denominator += bucket.denominator;
      total.isPartial = total.isPartial || bucket.isPartial;
    } else {
      byStart.set(bucket.start, {
        start: bucket.start,
        label: bucket.label,
        isPartial: bucket.isPartial,
        numerator: bucket.numerator,
        denominator: bucket.denominator,
      });
    }
  }
  return [...byStart.values()].sort((a, b) => a.start.localeCompare(b.start));
}

/** The buckets of one group, ascending. */
export function bucketsOfGroup(series: MetricSeries, group: string | null): SeriesBucket[] {
  return series.buckets.filter((bucket) => bucket.group === group).sort((a, b) => a.start.localeCompare(b.start));
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** Up to this many days a range is read by day; beyond it by week. */
export const DAY_GRANULARITY_MAX_DAYS = 56;

/**
 * The bucket size to start from for a range: days up to eight weeks, weeks
 * beyond. With no dates clear-api applies its 12-week default, so weeks.
 */
export function defaultGranularity(from?: string | null, to?: string | null, now: Date = new Date()): Granularity {
  if (!from && !to) return "WEEK";
  const end = to ? Date.parse(to) : now.getTime();
  const start = from ? Date.parse(from) : end - 11 * 7 * DAY_MS;
  if (Number.isNaN(start) || Number.isNaN(end)) return "WEEK";
  const days = (end - start) / DAY_MS;
  return days <= DAY_GRANULARITY_MAX_DAYS ? "DAY" : "WEEK";
}

/** The first instant after the bucket that starts at `start`. */
export function bucketEnd(start: string, granularity: Granularity): number {
  const at = new Date(start);
  switch (granularity) {
    case "DAY":
      return at.getTime() + DAY_MS;
    case "WEEK":
      return at.getTime() + 7 * DAY_MS;
    case "MONTH":
      return Date.UTC(at.getUTCFullYear(), at.getUTCMonth() + 1, 1);
  }
}

/** A change that should move a metric, placed on its chart. */
export interface SeriesMarker {
  /** When it reached the pipeline, ISO 8601 UTC. */
  at: string;
  key: DeployMarkerKey;
  /** The metrics the change bears on. */
  metrics: readonly MetricKey[];
}

/** The deploy markers, tagged with the metric each one is expected to move. */
export const MARKERS: readonly SeriesMarker[] = DEPLOY_MARKERS.map((marker) => ({
  ...marker,
  metrics: ["districtOrFiner"] as const,
}));

/** The markers that bear on `metric`, oldest first. */
export function markersFor(metric: MetricKey, markers: readonly SeriesMarker[] = MARKERS): SeriesMarker[] {
  return markers.filter((marker) => marker.metrics.includes(metric)).sort((a, b) => a.at.localeCompare(b.at));
}

/** The markers that fall in each bucket, keyed by the bucket's label; buckets with none are left out. */
export function markersByBucket(
  buckets: ReadonlyArray<{ start: string; label: string }>,
  markers: readonly SeriesMarker[],
  granularity: Granularity,
): Map<string, SeriesMarker[]> {
  const grouped = new Map<string, SeriesMarker[]>();
  for (const marker of markers) {
    const at = Date.parse(marker.at);
    const bucket = buckets.find((b) => Date.parse(b.start) <= at && at < bucketEnd(b.start, granularity));
    if (!bucket) continue;
    const list = grouped.get(bucket.label) ?? [];
    list.push(marker);
    grouped.set(bucket.label, list);
  }
  return grouped;
}

/** Fewer measured units than this on either side and the comparison is not shown. */
export const BEFORE_AFTER_MIN_N = 10;
/** How many whole days before the marker's day make the "before". */
export const BEFORE_AFTER_DAYS = 7;

export interface BeforeAfter {
  marker: SeriesMarker;
  before: { numerator: number; denominator: number; share: number | null };
  after: { numerator: number; denominator: number; share: number | null };
  /** True when either side has fewer than `BEFORE_AFTER_MIN_N` units. */
  tooFew: boolean;
}

/**
 * The share over the seven whole days before the marker's day against the
 * days after it, from daily buckets. The marker's own day is left out: it
 * mixes the two states.
 */
export function beforeAfter(dayBuckets: readonly TotalBucket[], marker: SeriesMarker): BeforeAfter {
  const markerDay = Math.floor(Date.parse(marker.at) / DAY_MS);
  const before = { numerator: 0, denominator: 0 };
  const after = { numerator: 0, denominator: 0 };
  for (const bucket of dayBuckets) {
    const day = Math.floor(Date.parse(bucket.start) / DAY_MS);
    if (day >= markerDay - BEFORE_AFTER_DAYS && day < markerDay) {
      before.numerator += bucket.numerator;
      before.denominator += bucket.denominator;
    } else if (day > markerDay) {
      after.numerator += bucket.numerator;
      after.denominator += bucket.denominator;
    }
  }
  return {
    marker,
    before: { ...before, share: share(before.numerator, before.denominator) },
    after: { ...after, share: share(after.numerator, after.denominator) },
    tooFew: before.denominator < BEFORE_AFTER_MIN_N || after.denominator < BEFORE_AFTER_MIN_N,
  };
}

/** The latest marker for the metric inside the range, or null. */
export function latestMarkerInRange(metric: MetricKey, from: string, to: string, markers: readonly SeriesMarker[] = MARKERS): SeriesMarker | null {
  const inRange = markersFor(metric, markers).filter((marker) => marker.at >= from && marker.at <= to);
  return inRange.length > 0 ? inRange[inRange.length - 1]! : null;
}
