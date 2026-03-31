import type { MapMarker, MapRegion } from "~/components/map/crisis-map";
import type { GqlAlert, GqlEvent, GqlSignal } from "~/lib/types/graphql";
import { mapSeverity } from "~/lib/types/graphql";
import { resolveLocationName } from "~/lib/location";

export interface CrisisMarker extends MapMarker {
  region?: string;
  country?: string;
  /** Location ID for hierarchy-based filtering */
  locationId?: string;
  /** Ancestor location IDs (for hierarchy filtering) */
  ancestorIds?: string[];
  affectedPopulation?: number;
  cases?: number;
  status?: string;
  members?: number;
  shockTypeName?: string;
  dataSource?: string;
  shockDate?: string;
}

/* ========== Layer definitions ========== */
export interface LayerDef {
  id: string;
  label: string;
  color: string;
  defaultChecked: boolean;
}

/** Build layer definitions from shock types returned by the API */
export function buildLayersFromShockTypes(
  shockTypes: Array<{ id: number; name: string; color: string }>,
): LayerDef[] {
  return shockTypes.map((st) => ({
    id: st.name,
    label: st.name,
    color: st.color,
    defaultChecked: true,
  }));
}

/* ========== Crisis types for filter dropdown ========== */
export function buildCrisisTypeOptions(
  shockTypes: Array<{ id: number; name: string }>,
): string[] {
  return ["All Types", ...shockTypes.map((st) => st.name)];
}

/* ========== Transform GraphQL alerts to map markers ========== */

/** Simple numeric hash from two string ids for MapMarker.id */
function hashId(a: string, b: string): number {
  let h = 0;
  for (const c of a + b) {
    h = ((h << 5) - h + c.charCodeAt(0)) | 0;
  }
  return Math.abs(h);
}

/** Return the first location on an event that has a usable Point geometry */
function pointLocation(event: GqlEvent) {
  const candidates = [event.originLocation, event.destinationLocation, event.generalLocation];
  for (const loc of candidates) {
    if (loc?.geometry?.type === "Point") {
      const [lng, lat] = loc.geometry.coordinates as [number, number];
      if (typeof lng === "number" && typeof lat === "number") return { loc, lng, lat };
    }
  }
  return null;
}

export function eventsToMarkers(events: GqlEvent[]): CrisisMarker[] {
  const markers: CrisisMarker[] = [];
  for (const event of events) {
    const point = pointLocation(event);
    if (!point) continue;
    const { loc, lng, lat } = point;
    markers.push({
      id: hashId(event.id, loc.id),
      lng,
      lat,
      title: event.title ?? event.types[0] ?? "Event",
      severity: mapSeverity(event.rank, event.severity),
      description: event.description ?? undefined,
      region: resolveLocationName(loc) ?? undefined,
      locationId: loc.id,
      ancestorIds: loc.ancestorIds ?? [],
      status: event.alerts[0]?.status,
    });
  }
  return markers;
}

export function alertsToMarkers(alerts: GqlAlert[]): CrisisMarker[] {
  return eventsToMarkers(alerts.map((a) => a.event));
}

export function signalsToMarkers(signals: GqlSignal[]): CrisisMarker[] {
  const markers: CrisisMarker[] = [];
  for (const signal of signals) {
    const candidates = [signal.generalLocation, signal.originLocation, signal.destinationLocation];
    for (const loc of candidates) {
      if (loc?.geometry?.type === "Point") {
        const [lng, lat] = loc.geometry.coordinates as [number, number];
        if (typeof lng === "number" && typeof lat === "number") {
          markers.push({
            id: hashId(signal.id, loc.id),
            lng,
            lat,
            title: signal.title ?? signal.source.name ?? "Signal",
            severity: signal.severity ? mapSeverity(signal.severity) : "medium",
            description: signal.description ?? undefined,
            region: resolveLocationName(loc) ?? undefined,
            locationId: loc.id,
            ancestorIds: loc.ancestorIds ?? [],
            dataSource: signal.source.name,
          });
          break;
        }
      }
    }
  }
  return markers;
}

/* ========== Extract polygon regions from events ========== */

/** Check if a geometry is a polygon type (Polygon or MultiPolygon) */
function isPolygonGeometry(geo: { type: string } | null | undefined): boolean {
  return geo?.type === "Polygon" || geo?.type === "MultiPolygon";
}

/**
 * Extract polygon regions from events whose location has a Polygon/MultiPolygon geometry.
 * Each region includes the signal points belonging to that event.
 */
export function eventsToRegions(events: GqlEvent[]): MapRegion[] {
  const regions: MapRegion[] = [];
  for (const event of events) {
    // Find a polygon geometry on the event's locations
    const candidates = [event.generalLocation, event.originLocation, event.destinationLocation];
    const polyLoc = candidates.find((loc) => loc?.geometry && isPolygonGeometry(loc.geometry));
    if (!polyLoc?.geometry) continue;

    // Collect signal point locations
    const signalPoints: Array<{ lng: number; lat: number; title: string }> = [];
    for (const signal of event.signals) {
      const sigCandidates = [signal.generalLocation, signal.originLocation, signal.destinationLocation];
      for (const loc of sigCandidates) {
        if (loc?.geometry?.type === "Point") {
          const [lng, lat] = loc.geometry.coordinates as [number, number];
          if (typeof lng === "number" && typeof lat === "number") {
            signalPoints.push({
              lng,
              lat,
              title: signal.title ?? signal.source.name ?? "Signal",
            });
            break;
          }
        }
      }
    }

    regions.push({
      id: event.id,
      geometry: polyLoc.geometry as { type: string; coordinates: unknown },
      severity: mapSeverity(event.rank, event.severity),
      title: event.title ?? event.types[0] ?? "Event",
      signalPoints,
    });
  }
  return regions;
}

export function alertsToRegions(alerts: GqlAlert[]): MapRegion[] {
  return eventsToRegions(alerts.map((a) => a.event));
}

/* ========== Derive filter options from markers ========== */
export function deriveCountryOptions(markers: CrisisMarker[]): string[] {
  const unique = new Set<string>();
  markers.forEach((m) => { if (m.country) unique.add(m.country); });
  return ["All Countries", ...Array.from(unique).sort()];
}

export function deriveRegionOptions(
  markers: CrisisMarker[],
  country: string,
): string[] {
  const filtered =
    country === "All Countries"
      ? markers
      : markers.filter((m) => m.country === country);
  const unique = new Set<string>();
  filtered.forEach((m) => { if (m.region) unique.add(m.region); });
  return ["All Regions", ...Array.from(unique).sort()];
}
