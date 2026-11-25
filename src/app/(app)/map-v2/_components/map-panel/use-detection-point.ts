import { useMemo } from "react";
import { useDetectionsForMap } from "~/containers/map/hooks/use-detections-for-map";
import type { DetectionKind, LngLatPoint } from "~/containers/map/selection";

/** Where the map draws a detection, from the map's own data: null when it is outside the timeframe. */
export function useDetectionPoint(kind: DetectionKind, id: string): LngLatPoint | null {
  const { data } = useDetectionsForMap(kind);
  return useMemo(() => data?.find((detection) => detection.id === id)?.point ?? null, [data, id]);
}
