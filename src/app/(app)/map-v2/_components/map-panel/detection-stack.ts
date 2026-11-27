import type { MapDetection } from "~/containers/map/hooks/use-detections-for-map";
import { isSamePoint } from "~/containers/map/layers/detections/clusters";
import { SEVERITY_BUCKETS } from "~/containers/map/layers/detections/severity-tokens";
import type { SeverityBucket } from "~/containers/map/layers/detections/to-features";
import type { LngLatPoint } from "~/containers/map/selection";
import type { Timeframe } from "~/containers/map/timeframe/model";
import { resolveLocationName } from "~/lib/location";
import { mapSeverity } from "~/lib/types/graphql";

type StackItem = Pick<MapDetection, "id" | "severity" | "date" | "location">;

/** The detections drawn at `point`: the members of a stack. */
export function detectionsAtPoint<T extends Pick<MapDetection, "point">>(items: T[], point: LngLatPoint): T[] {
  return items.filter((item) => item.point !== null && isSamePoint(item.point, point));
}

const bucketRank = (item: StackItem) => SEVERITY_BUCKETS.indexOf(mapSeverity(item.severity));

/** Most severe first (unknown last), then newest first. */
export function sortStackItems<T extends StackItem>(items: T[]): T[] {
  return [...items].sort((a, b) => bucketRank(a) - bucketRank(b) || Date.parse(b.date) - Date.parse(a.date));
}

export type SeverityCount = { bucket: SeverityBucket; count: number };

/** How many items fall in each severity bucket, in bucket order, without empty buckets. */
export function severityCounts(items: StackItem[]): SeverityCount[] {
  return SEVERITY_BUCKETS.map((bucket) => ({
    bucket,
    count: items.filter((item) => mapSeverity(item.severity) === bucket).length,
  })).filter(({ count }) => count > 0);
}

/** The place name most of the items share; ties go to the first item's. */
export function commonLocationName(
  items: StackItem[],
  locationById: Map<string, { name: string; level: number }>,
): string | null {
  const counts = new Map<string, number>();
  for (const item of items) {
    const name = resolveLocationName(item.location, { locationById });
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  let best: string | null = null;
  for (const [name, count] of counts) {
    if (best === null || count > (counts.get(best) ?? 0)) best = name;
  }
  return best;
}

export type StackPeriod = { kind: "lastDays"; days: number } | { kind: "range"; from: Date; to: Date };

const utcDay = (day: string) => new Date(`${day}T00:00:00Z`);

export function stackPeriod(timeframe: Timeframe): StackPeriod {
  if (timeframe.kind === "rolling") return { kind: "lastDays", days: timeframe.days };
  return { kind: "range", from: utcDay(timeframe.from), to: utcDay(timeframe.to) };
}
