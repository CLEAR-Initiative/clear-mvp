import type { MapMarker, MapRegion } from "~/components/map/crisis-map";
import type { GqlAlert, GqlEvent, GqlSignal, GqlCrisis } from "~/lib/types/graphql";
import { mapSeverity } from "~/lib/types/graphql";
import { resolveLocationName } from "~/lib/location";

export interface CrisisMarker extends MapMarker {
  region?: string;
  country?: string;
  /** Location ID for hierarchy-based filtering */
  locationId?: string;
  /** Ancestor location IDs (for hierarchy filtering) */
  ancestorIds?: string[];
  /** Disaster type glide codes (e.g. ["ba", "rv"]) - used for type filter */
  eventTypes?: string[];
  /** Original source entity ID (event.id / signal.id / crisis.id) for navigation and hover syncing */
  eventId?: string;
  /** Determines which detail page "View Details" navigates to */
  markerKind?: "event" | "signal" | "crisis";
  /**
   * ISO timestamp the marker actually happened at — events use
   * firstSignalCreatedAt, signals use publishedAt. Crisis markers don't
   * carry a date today, so the timeline filter skips them by treating
   * `undefined` as "always visible".
   */
  occurredAt?: string;
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

/** Extract lng/lat from a location when its geometry is a usable Point. */
function pointFromLocation(loc: GqlEvent["generalLocation"] | GqlEvent["representativePoint"]) {
  if (!loc?.geometry || loc.geometry.type !== "Point") return null;
  const [lng, lat] = loc.geometry.coordinates as [number, number];
  if (typeof lng !== "number" || typeof lat !== "number") return null;
  return { loc, lng, lat };
}

/**
 * Prefer clear-api `representativePoint` (first-signal location). Fall back to
 * event-level Points, then nested signal Points for list payloads that still
 * embed signals (e.g. Detection).
 */
function pointLocation(event: GqlEvent) {
  const fromRep = pointFromLocation(event.representativePoint ?? null);
  if (fromRep) return fromRep;

  for (const loc of [event.originLocation, event.destinationLocation, event.generalLocation]) {
    const hit = pointFromLocation(loc);
    if (hit) return hit;
  }

  for (const signal of event.signals ?? []) {
    for (const loc of [signal.originLocation, signal.destinationLocation, signal.generalLocation]) {
      const hit = pointFromLocation(loc);
      if (hit) return hit;
    }
  }
  return null;
}

function eventToMarker(event: GqlEvent, loc: NonNullable<ReturnType<typeof pointFromLocation>>): CrisisMarker {
  return {
    id: hashId(event.id, loc.loc.id),
    lng: loc.lng,
    lat: loc.lat,
    title: event.title ?? event.types[0] ?? "Event",
    severity: mapSeverity(event.severity),
    description: event.description ?? undefined,
    region: resolveLocationName(loc.loc) ?? undefined,
    locationId: loc.loc.id,
    ancestorIds: loc.loc.ancestorIds ?? [],
    eventTypes: event.types.map((t) => t.toLowerCase()),
    eventId: event.id,
    markerKind: "event",
    status: event.alerts[0]?.status,
    occurredAt: event.firstSignalCreatedAt,
  };
}

/** One map pin per entity — duplicate rows inflate Supercluster `point_count`. */
function dedupeMarkersByEntity(markers: CrisisMarker[]): CrisisMarker[] {
  const seen = new Set<string>();
  const out: CrisisMarker[] = [];
  for (const m of markers) {
    const key = m.eventId ?? String(m.id);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(m);
  }
  return out;
}

export function eventsToMarkers(events: GqlEvent[]): CrisisMarker[] {
  const markers: CrisisMarker[] = [];
  for (const event of events) {
    const point = pointLocation(event);
    if (point) markers.push(eventToMarker(event, point));
  }
  return dedupeMarkersByEntity(markers);
}

/**
 * Full Map deep-link for an event: the event pin plus each nested signal that
 * has a Point. Browse map feeds must not use this — they omit signal nests.
 */
export function focusEventToMarkers(event: GqlEvent): CrisisMarker[] {
  const eventMarkers = eventsToMarkers([event]);
  const signalMarkers = signalsToMarkers(event.signals ?? []);
  return [...eventMarkers, ...signalMarkers];
}

export function alertsToMarkers(alerts: GqlAlert[]): CrisisMarker[] {
  // Multiple alerts can wrap the same event — keep the entry with the best
  // representative point before dedupe (first-wins) in eventsToMarkers.
  const bestByEvent = new Map<string, GqlAlert>();
  for (const a of alerts) {
    const existing = bestByEvent.get(a.event.id);
    if (!existing) {
      bestByEvent.set(a.event.id, a);
      continue;
    }
    const existingPoint =
      existing.event.representativePoint ?? existing.representativePoint ?? null;
    const nextPoint = a.event.representativePoint ?? a.representativePoint ?? null;
    if (!existingPoint && nextPoint) bestByEvent.set(a.event.id, a);
  }
  return eventsToMarkers(
    [...bestByEvent.values()].map((a) => ({
      ...a.event,
      representativePoint: a.event.representativePoint ?? a.representativePoint ?? null,
      alerts: a.event.alerts?.length ? a.event.alerts : [{ id: a.id, status: a.status }],
    })),
  );
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
            eventId: signal.id,
            markerKind: "signal",
            occurredAt: signal.publishedAt,
          });
          break;
        }
      }
    }
  }
  return dedupeMarkersByEntity(markers);
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
    // Skip country-level locations - rendering the entire country polygon is not meaningful.
    if (polyLoc.level === 0) continue;

    // Collect signal point locations
    const signalPoints: Array<{ lng: number; lat: number; title: string }> = [];
    for (const signal of (event.signals ?? [])) {
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
      severity: mapSeverity(event.severity),
      title: event.title ?? event.types[0] ?? "Event",
      signalPoints,
    });
  }
  return regions;
}

export function alertsToRegions(alerts: GqlAlert[]): MapRegion[] {
  return eventsToRegions(alerts.map((a) => a.event));
}

export function crisesToMarkers(crises: GqlCrisis[]): CrisisMarker[] {
  const markers: CrisisMarker[] = [];
  for (const crisis of crises) {
    const loc = crisis.generalLocation;
    if (loc?.geometry?.type === "Point") {
      const [lng, lat] = loc.geometry.coordinates as [number, number];
      if (typeof lng === "number" && typeof lat === "number") {
        markers.push({
          id: Math.abs(crisis.id.split("").reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)),
          lng,
          lat,
          title: crisis.title ?? "Crisis",
          severity: mapSeverity(crisis.severity),
          locationId: loc.id,
          ancestorIds: loc.ancestorIds ?? [],
          eventTypes: crisis.events.flatMap((e) => e.types).map((t) => t.toLowerCase()),
          region: resolveLocationName(loc) ?? undefined,
          eventId: crisis.id,
          markerKind: "crisis",
        });
      }
    }
  }
  return dedupeMarkersByEntity(markers);
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
