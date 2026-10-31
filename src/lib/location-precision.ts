/**
 * Location precision, as clear-api's `locationPrecisionMetrics` reports it
 * (clear-api ADR-0012). clear-api owns the definition and returns counts only;
 * this module adds the shares the /metrics page shows and nothing else.
 * Never recompute which signals count here.
 */

import { share } from "./detection-metrics";

/** The level buckets clear-api counts a signal under, coarse to fine. */
export const LEVELS = ["noLocation", "country", "state", "district", "point"] as const;
export type Level = (typeof LEVELS)[number];

export interface GqlLevelCounts {
  total: number;
  noLocation: number;
  country: number;
  state: number;
  district: number;
  point: number;
}

/** clear-api's `LocationPrecisionMetrics` payload, as fetched. */
export interface GqlLocationPrecisionMetrics {
  from: string;
  to: string;
  signalsInRange: number;
  bySource: Array<{ source: string } & GqlLevelCounts>;
  weekly: Array<{ isoWeek: string; weekStart: string; source: string; isPartial: boolean } & GqlLevelCounts>;
  corrections: { open: number; accepted: number; corrected: number; declined: number; superseded: number };
}

export interface LevelShares extends GqlLevelCounts {
  /** district + point: the signals grouping can key on. */
  fine: number;
  /** fine / total */
  fineShare: number | null;
  /** Each level's share of total. */
  shares: Record<Level, number | null>;
}

export interface SourcePrecision extends LevelShares {
  source: string;
}

export interface WeekPrecision extends LevelShares {
  isoWeek: string;
  weekStart: string;
  source: string;
  isPartial: boolean;
}

export interface LocationPrecisionMetrics {
  from: string;
  to: string;
  signalsInRange: number;
  /** Every source in range added up. */
  totals: LevelShares;
  /** Most signals first, as clear-api orders it. */
  bySource: SourcePrecision[];
  /** Flat, one row per source and ISO week, zero-filled by clear-api. */
  weekly: WeekPrecision[];
  corrections: GqlLocationPrecisionMetrics["corrections"] & { total: number; decided: number };
}

/** `metrics.locationPrecision`'s result: the metrics, or clear-api not serving them yet. */
export type LocationPrecisionResult =
  | { status: "ok"; metrics: LocationPrecisionMetrics }
  | { status: "unavailable" };

/** The source the weekly chart emphasises: the text-only feed the geocoding work exists for. */
export const EMPHASIS_SOURCE = "sudan-war-x";

function levelShares(counts: GqlLevelCounts): LevelShares {
  const fine = counts.district + counts.point;
  return {
    ...counts,
    fine,
    fineShare: share(fine, counts.total),
    shares: {
      noLocation: share(counts.noLocation, counts.total),
      country: share(counts.country, counts.total),
      state: share(counts.state, counts.total),
      district: share(counts.district, counts.total),
      point: share(counts.point, counts.total),
    },
  };
}

/** Add the shares to clear-api's counts. */
export function withShares(raw: GqlLocationPrecisionMetrics): LocationPrecisionMetrics {
  const sum = (level: keyof GqlLevelCounts) => raw.bySource.reduce((n, row) => n + row[level], 0);
  const totals = levelShares({
    total: sum("total"),
    noLocation: sum("noLocation"),
    country: sum("country"),
    state: sum("state"),
    district: sum("district"),
    point: sum("point"),
  });
  const decided = raw.corrections.accepted + raw.corrections.corrected + raw.corrections.declined;
  return {
    from: raw.from,
    to: raw.to,
    signalsInRange: raw.signalsInRange,
    totals,
    bySource: raw.bySource.map((row) => ({ source: row.source, ...levelShares(row) })),
    weekly: raw.weekly.map((row) => ({
      isoWeek: row.isoWeek,
      weekStart: row.weekStart,
      source: row.source,
      isPartial: row.isPartial,
      ...levelShares(row),
    })),
    corrections: { ...raw.corrections, decided, total: decided + raw.corrections.open + raw.corrections.superseded },
  };
}

/** The ISO week row a deploy marker falls in: `weekStart <= at < weekStart + 7 days`. */
export function weekOf(weekStarts: string[], at: string): string | null {
  const t = Date.parse(at);
  const week = 7 * 24 * 60 * 60 * 1000;
  return weekStarts.find((start) => {
    const s = Date.parse(start);
    return s <= t && t < s + week;
  }) ?? null;
}

/**
 * The metrics restricted to `sources` (all when empty): the chosen rows and
 * totals re-added from their counts. Shares are only ever numerator over
 * denominator; nothing about which signals count changes here.
 */
export function filterSources(metrics: LocationPrecisionMetrics, sources: string[]): LocationPrecisionMetrics {
  if (sources.length === 0) return metrics;
  const keep = new Set(sources);
  const bySource = metrics.bySource.filter((row) => keep.has(row.source));
  const sum = (level: keyof GqlLevelCounts) => bySource.reduce((n, row) => n + row[level], 0);
  return {
    ...metrics,
    totals: levelShares({
      total: sum("total"),
      noLocation: sum("noLocation"),
      country: sum("country"),
      state: sum("state"),
      district: sum("district"),
      point: sum("point"),
    }),
    bySource,
    weekly: metrics.weekly.filter((row) => keep.has(row.source)),
  };
}
