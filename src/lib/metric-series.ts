/**
 * One metric at a time, over time: the series behind the /metrics "Progress
 * over time" section. clear-api keeps the metric registry (its ADR-0015):
 * `metricDefinitions` lists what can be plotted and `metricSeries` reads any
 * entry as numerator over denominator per bucket, by day, ISO week or
 * calendar month (ADR-0014), optionally grouped by source. The changes that
 * should move a metric are rows too (`metricAnnotations`, ADR-0016). clear-api
 * owns every definition; this module only adds the reading aids: totals
 * across groups, the default bucket size for a range, markers per bucket, and
 * a before-and-after around the latest marker. Never recompute which events
 * or signals count here.
 */

import { share } from "./detection-metrics";
import { EMPHASIS_SOURCE } from "./location-precision";

export const GRANULARITIES = ["DAY", "WEEK", "MONTH"] as const;
export type Granularity = (typeof GRANULARITIES)[number];

/** The registry keys this app has translations for; any other key clear-api lists works with its English name. */
export const KNOWN_METRIC_KEYS = ["DETECTED_BY_NEXT_DAY", "DETECTED_SAME_DAY", "DISTRICT_OR_FINER"] as const;
export type KnownMetricKey = (typeof KNOWN_METRIC_KEYS)[number];
/** A `MetricKey` value from clear-api's registry. */
export type MetricKey = string;

/** The Notion Metrics table's dimensions, in its order. */
export const METRIC_DIMENSIONS = ["TIMELINESS", "ACCURACY", "COVERAGE", "RELIABILITY", "USEFULNESS"] as const;
export type MetricDimension = (typeof METRIC_DIMENSIONS)[number];

/** What a metric's denominator counts. */
export const METRIC_UNITS = ["EVENTS", "SIGNALS"] as const;
export type MetricUnit = (typeof METRIC_UNITS)[number];

/** The metric the section opens on, when clear-api lists it. */
export const DEFAULT_METRIC: MetricKey = "DISTRICT_OR_FINER";

/** One registry entry, as clear-api's `metricDefinitions` returns it. */
export interface MetricDefinition {
  key: MetricKey;
  /** clear-api's English name, shown when this app has no translation for the key. */
  name: string;
  dimension: MetricDimension;
  unit: MetricUnit;
  /** The method in one paragraph. */
  description: string;
  /** The instant that puts a row in a bucket. */
  timeBasis: string;
  /** True when the series can be read per data source. */
  groupable: boolean;
  /** The ADR that owns the definition. */
  adr: string;
}

/** `metrics.definitions`'s result: the registry, or clear-api not serving it yet. */
export type MetricDefinitionsResult = { status: "ok"; definitions: MetricDefinition[] } | { status: "unavailable" };

/** One bucket of one group: the metric is `numerator / denominator`. */
export interface SeriesBucket {
  /** Start of the bucket, ISO 8601 UTC. */
  start: string;
  /** clear-api's label: `2026-10-29`, `2026-W44` or `2026-10`. */
  label: string;
  /** True when the range covers only part of the bucket. */
  isPartial: boolean;
  /** The data source under `groupBy: SOURCE`, null for an ungrouped series. */
  group: string | null;
  numerator: number;
  denominator: number;
}

/** clear-api's `MetricSeries` payload: already the shape the page reads. */
export interface MetricSeries {
  metric: MetricKey;
  granularity: Granularity;
  from: string;
  to: string;
  /** Group names in clear-api's order (most signals first), empty when ungrouped. */
  groups: string[];
  /** Group by group, ascending buckets within each, zero-filled by clear-api. */
  buckets: SeriesBucket[];
}

/** `metrics.series`'s result: the series, or clear-api not serving it yet. */
export type MetricSeriesResult = { status: "ok"; series: MetricSeries } | { status: "unavailable" };

/**
 * A change that should move a metric, as clear-api's `metricAnnotations`
 * returns it (ADR-0016): a deploy, a data import, a prompt version. Drawn as a
 * marker in the bucket holding its instant.
 */
export interface SeriesMarker {
  id: string;
  /** When it reached this environment, ISO 8601 UTC. */
  at: string;
  label: string;
  description: string | null;
  link: string | null;
  /** The registry keys the change bears on. */
  metricKeys: string[];
}

/** `metrics.annotations`'s result: the markers, or clear-api not serving them yet. */
export type MetricAnnotationsResult = { status: "ok"; annotations: SeriesMarker[] } | { status: "unavailable" };

/** What the admin form sends to record a change. */
export interface NewSeriesMarker {
  at: string;
  label: string;
  link?: string;
  description?: string;
  metricKeys: string[];
}

/** The registry grouped for the selector, in the Notion table's dimension order; a dimension with no metric is left out. */
export function definitionsByDimension(definitions: readonly MetricDefinition[]): Array<{ dimension: MetricDimension; definitions: MetricDefinition[] }> {
  return METRIC_DIMENSIONS.map((dimension) => ({
    dimension,
    definitions: definitions.filter((definition) => definition.dimension === dimension),
  })).filter((group) => group.definitions.length > 0);
}

/** The line to emphasise on a grouped metric: the text-only feed the geocoding work exists for, when it is among the groups. */
export function emphasisFor(definition: MetricDefinition | null | undefined, groups: readonly string[]): string | null {
  return definition?.groupable && groups.includes(EMPHASIS_SOURCE) ? EMPHASIS_SOURCE : null;
}

/** One bucket with every group added up: the "all sources" line. */
export interface TotalBucket {
  start: string;
  label: string;
  isPartial: boolean;
  numerator: number;
  denominator: number;
}

/** The groups summed per bucket, ascending; an ungrouped series is returned as is. */
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

/** The markers that bear on `metric`, oldest first. */
export function markersFor(metric: MetricKey, markers: readonly SeriesMarker[]): SeriesMarker[] {
  return markers.filter((marker) => marker.metricKeys.includes(metric)).sort((a, b) => a.at.localeCompare(b.at));
}

/** The markers for the metric whose instant lies inside the range, oldest first. A bucket can reach past the selected dates; a marker outside them is not drawn. */
export function markersInRange(metric: MetricKey, from: string, to: string, markers: readonly SeriesMarker[]): SeriesMarker[] {
  return markersFor(metric, markers).filter((marker) => marker.at >= from && marker.at <= to);
}

/** The latest marker for the metric inside the range, or null. */
export function latestMarkerInRange(metric: MetricKey, from: string, to: string, markers: readonly SeriesMarker[]): SeriesMarker | null {
  const inRange = markersInRange(metric, from, to, markers);
  return inRange.length > 0 ? inRange[inRange.length - 1]! : null;
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
 * Where the before-and-after's daily read starts: 00:00 UTC seven days before
 * the marker's day, whatever the page's range starts on, so a range opened
 * close to the marker does not clip the baseline.
 */
export function comparisonFrom(marker: SeriesMarker): string {
  const markerDay = Math.floor(Date.parse(marker.at) / DAY_MS);
  return new Date((markerDay - BEFORE_AFTER_DAYS) * DAY_MS).toISOString();
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

/**
 * A `datetime-local` value (`2026-10-31T13:13`, seconds optional) read as UTC,
 * or an ISO instant with its own zone, as an ISO instant; null for anything
 * else. The shape is checked first: `Date` parses too much on its own.
 */
export function utcInstantFromLocalInput(value: string): string | null {
  const trimmed = value.trim();
  const local = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/;
  const zoned = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/;
  if (!local.test(trimmed) && !zoned.test(trimmed)) return null;
  const at = new Date(local.test(trimmed) ? `${trimmed}${trimmed.length === 16 ? ":00" : ""}Z` : trimmed);
  return Number.isNaN(at.getTime()) ? null : at.toISOString();
}
