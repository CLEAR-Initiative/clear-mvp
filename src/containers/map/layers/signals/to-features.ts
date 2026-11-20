import { mapSeverity, type GqlLocation, type GqlSignal } from "~/lib/types/graphql";

export type SeverityBucket = ReturnType<typeof mapSeverity>;

export type SignalFeature = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: { id: string; title: string | null; severity: SeverityBucket };
};

export type SignalFeatureCollection = { type: "FeatureCollection"; features: SignalFeature[] };

function pointOf(location: GqlLocation | null): [number, number] | null {
  const geometry = location?.geometry;
  if (geometry?.type !== "Point" || !Array.isArray(geometry.coordinates)) return null;
  const [lng, lat] = geometry.coordinates as unknown[];
  return typeof lng === "number" && typeof lat === "number" && Number.isFinite(lng) && Number.isFinite(lat)
    ? [lng, lat]
    : null;
}

export function signalsToFeatures(signals: GqlSignal[]): SignalFeatureCollection {
  const features: SignalFeature[] = [];
  for (const signal of signals) {
    const coordinates =
      pointOf(signal.generalLocation) ?? pointOf(signal.originLocation) ?? pointOf(signal.destinationLocation);
    if (!coordinates) continue;
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates },
      properties: { id: signal.id, title: signal.title, severity: mapSeverity(signal.severity) },
    });
  }
  return { type: "FeatureCollection", features };
}
