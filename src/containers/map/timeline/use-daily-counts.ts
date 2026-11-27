import { skipToken } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { reportHandledError } from "~/lib/report-handled-error";
import { api } from "~/trpc/react";
import type { DetectionKind } from "../selection";
import { TIMELINE_DAYS, barOfDay, type TimelineExtent } from "../timeframe/model";

export type DailyCountsStatus = "loading" | "error" | "ready" | "none";

export function dailyCountsInput(kind: DetectionKind | null, extent: TimelineExtent) {
  if (!kind) return null;
  return { entity: kind, groupBy: "day" as const, from: extent.from, to: extent.to, includeDummy: true };
}

export function useDailyCounts(
  extent: TimelineExtent,
  kind: DetectionKind | null,
): { counts: number[]; status: DailyCountsStatus } {
  const input = dailyCountsInput(kind, extent);
  const query = api.alerts.entityStats.useQuery(input ?? skipToken, {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  useEffect(() => {
    if (query.error) reportHandledError(query.error, { feature: "map-v2-timeframe", stage: "counts" });
  }, [query.error]);

  const data = input ? query.data : undefined;
  const counts = useMemo(() => {
    const out = new Array<number>(TIMELINE_DAYS).fill(0);
    for (const bucket of data?.buckets ?? []) {
      const index = barOfDay(bucket.key, extent);
      if (index >= 0 && index < TIMELINE_DAYS) out[index] = bucket.count;
    }
    return out;
  }, [data, extent]);

  const status = !input ? "none" : query.isError ? "error" : query.isPending ? "loading" : "ready";
  return { counts, status };
}
