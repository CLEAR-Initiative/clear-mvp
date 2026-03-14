import type { MapMarker } from "~/components/map/crisis-map";
import type { GqlAlert } from "~/lib/types/graphql";
import { mapSeverity } from "~/lib/types/graphql";

export interface CrisisMarker extends MapMarker {
  region?: string;
  country?: string;
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

export function alertsToMarkers(alerts: GqlAlert[]): CrisisMarker[] {
  const markers: CrisisMarker[] = [];
  for (const alert of alerts) {
    for (const loc of alert.locations) {
      const coords = loc.location.geometry?.coordinates;
      if (!coords) continue;
      const [lng, lat] = coords;
      markers.push({
        id: hashId(alert.id, loc.id),
        lng,
        lat,
        title: alert.description ?? alert.eventType,
        severity: mapSeverity(alert.severity),
        description: alert.description ?? undefined,
        region: loc.location.name,
        status: alert.status,
      });
    }
  }
  return markers;
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
