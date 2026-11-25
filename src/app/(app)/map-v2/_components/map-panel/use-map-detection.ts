import { useMemo } from "react";
import { useDetectionsForMap, type MapDetection } from "~/containers/map/hooks/use-detections-for-map";
import type { DetectionKind } from "~/containers/map/selection";

/**
 * A detection as the map has it: its point (null when it is outside the timeframe) and, for an alert, its
 * event. `isPending` is true until the map's data has loaded or failed.
 */
export function useMapDetection(kind: DetectionKind, id: string): { detection: MapDetection | null; isPending: boolean } {
  const { data, isPending } = useDetectionsForMap(kind);
  const detection = useMemo(() => data?.find((candidate) => candidate.id === id) ?? null, [data, id]);
  return { detection, isPending };
}
