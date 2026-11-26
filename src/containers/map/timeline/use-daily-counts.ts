import { useEffect, useMemo } from "react";
import { reportHandledError } from "~/lib/report-handled-error";
import { api } from "~/trpc/react";
import { TIMELINE_DAYS, barOfDay, type TimelineExtent } from "../timeframe/model";

export function useDailyCounts(extent: TimelineExtent): { counts: number[]; status: "loading" | "error" | "ready" } {
  const query = api.alerts.entityStats.useQuery(
    { entity: "signal", groupBy: "day", from: extent.from, to: extent.to, includeDummy: true },
    { staleTime: 60_000, refetchOnWindowFocus: false, retry: false, placeholderData: (prev) => prev },
  );

  useEffect(() => {
    if (query.error) reportHandledError(query.error, { feature: "map-v2-timeframe", stage: "counts" });
  }, [query.error]);

  const counts = useMemo(() => {
    const out = new Array<number>(TIMELINE_DAYS).fill(0);
    for (const bucket of query.data?.buckets ?? []) {
      const index = barOfDay(bucket.key, extent);
      if (index >= 0 && index < TIMELINE_DAYS) out[index] = bucket.count;
    }
    return out;
  }, [query.data, extent]);

  const status = query.isError ? "error" : query.isPending ? "loading" : "ready";
  return { counts, status };
}
