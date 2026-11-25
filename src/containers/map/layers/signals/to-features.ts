import { mapSeverity, type GqlLocation, type GqlSignal } from "~/lib/types/graphql";

export type SeverityBucket = ReturnType<typeof mapSeverity>;

export type SignalFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: { id: string; title: string | null; severity: SeverityBucket };
};

export type SignalFeatureCollection = { type: "FeatureCollection"; features: SignalFeature[] };

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

export function signalsToFeatures(signals: GqlSignal[]): SignalFeatureCollection {
  const features: SignalFeature[] = [];
  for (const signal of signals) {
    const coordinates = signalPoint(signal);
    if (!coordinates) continue;
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates },
      properties: { id: signal.id, title: signal.title, severity: mapSeverity(signal.severity) },
    });
  }
  return { type: "FeatureCollection", features };
}
