import { mapSeverity, type GqlLocation, type GqlSignal } from "~/lib/types/graphql";
import type { MapDetection } from "../../hooks/use-detections-for-map";

export type SeverityBucket = ReturnType<typeof mapSeverity>;

export type DetectionFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: { id: string; title: string | null; severity: SeverityBucket };
};

export type DetectionFeatureCollection = { type: "FeatureCollection"; features: DetectionFeature[] };

/** A location's coordinates when its geometry is a valid point. */
export function locationPoint(location: GqlLocation | null | undefined): [number, number] | null {
  const geometry = location?.geometry;
  if (geometry?.type !== "Point" || !Array.isArray(geometry.coordinates)) return null;
  const [lng, lat] = geometry.coordinates as unknown[];
  return typeof lng === "number" && typeof lat === "number" && Number.isFinite(lng) && Number.isFinite(lat)
    ? [lng, lat]
    : null;
}

type SignalLocations = Pick<GqlSignal, "generalLocation" | "originLocation" | "destinationLocation">;

/** Where a signal is drawn: its general location, else its origin, else its destination, if it is a point. */
export function signalPoint(signal: SignalLocations): [number, number] | null {
  return (
    locationPoint(signal.generalLocation) ??
    locationPoint(signal.originLocation) ??
    locationPoint(signal.destinationLocation)
  );
}

export function detectionsToFeatures(detections: MapDetection[]): DetectionFeatureCollection {
  const features: DetectionFeature[] = [];
  for (const detection of detections) {
    if (!detection.point) continue;
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: detection.point },
      properties: { id: detection.id, title: detection.title, severity: mapSeverity(detection.severity) },
    });
  }
  return { type: "FeatureCollection", features };
}
