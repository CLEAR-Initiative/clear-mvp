import type { GeoJSONFeature } from "mapbox-gl";
import { SEVERITY_BUCKETS } from "./severity-tokens";
import type { SeverityBucket } from "./to-features";

export type HoveredSignal = {
  id: string;
  title: string | null;
  severity: SeverityBucket;
  coordinates: [number, number];
};

function isSeverityBucket(value: unknown): value is SeverityBucket {
  return SEVERITY_BUCKETS.includes(value as SeverityBucket);
}

export function toHoveredSignal(feature: GeoJSONFeature | undefined): HoveredSignal | null {
  if (feature?.geometry.type !== "Point") return null;
  const { id, title, severity } = feature.properties ?? {};
  const [lng, lat] = feature.geometry.coordinates;
  if (typeof id !== "string" || typeof lng !== "number" || typeof lat !== "number") return null;
  return {
    id,
    title: typeof title === "string" && title.trim() ? title : null,
    severity: isSeverityBucket(severity) ? severity : "unknown",
    coordinates: [lng, lat],
  };
}
