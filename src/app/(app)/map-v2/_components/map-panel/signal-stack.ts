import { SEVERITY_BUCKETS } from "~/containers/map/layers/signals/severity-tokens";
import type { SeverityBucket } from "~/containers/map/layers/signals/to-features";
import { resolveLocationName } from "~/lib/location";
import { signalLocationOf } from "~/lib/location-challenge";
import { mapSeverity, type GqlSignal } from "~/lib/types/graphql";

type StackSignal = Pick<
  GqlSignal,
  "id" | "severity" | "publishedAt" | "generalLocation" | "originLocation" | "destinationLocation"
>;

const bucketRank = (signal: StackSignal) => SEVERITY_BUCKETS.indexOf(mapSeverity(signal.severity));

/** Most severe first (unknown last), then newest first. */
export function sortStackSignals<T extends StackSignal>(signals: T[]): T[] {
  return [...signals].sort(
    (a, b) => bucketRank(a) - bucketRank(b) || Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  );
}

export type SeverityCount = { bucket: SeverityBucket; count: number };

/** How many signals fall in each severity bucket, in bucket order, without empty buckets. */
export function severityCounts(signals: StackSignal[]): SeverityCount[] {
  return SEVERITY_BUCKETS.map((bucket) => ({
    bucket,
    count: signals.filter((signal) => mapSeverity(signal.severity) === bucket).length,
  })).filter(({ count }) => count > 0);
}

/** The place name most of the signals share; ties go to the first signal's. */
export function commonLocationName(
  signals: StackSignal[],
  locationById: Map<string, { name: string; level: number }>,
): string | null {
  const counts = new Map<string, number>();
  for (const signal of signals) {
    const name = resolveLocationName(signalLocationOf(signal), { locationById });
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  let best: string | null = null;
  for (const [name, count] of counts) {
    if (best === null || count > (counts.get(best) ?? 0)) best = name;
  }
  return best;
}

/** The range the signals were fetched for. `to` left out means "up to now". ISO strings. */
export type SignalsRange = { from: string; to?: string };

export type StackPeriod = { kind: "lastDays"; days: number } | { kind: "range"; from: Date; to: Date };

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * The period the range covers, worded relative to today when it is a run of whole days that ends
 * today ("the last 30 days"), and as dates otherwise.
 */
export function stackPeriod(range: SignalsRange, now: Date): StackPeriod {
  const from = new Date(range.from);
  const to = range.to ? new Date(range.to) : now;
  const today = startOfDay(now);
  const endsToday = to >= today;
  const fromMidnight = from.getTime() === startOfDay(from).getTime();
  const days = Math.round((today.getTime() - from.getTime()) / DAY_MS);
  if (endsToday && fromMidnight && days >= 1) return { kind: "lastDays", days };
  return { kind: "range", from, to };
}
