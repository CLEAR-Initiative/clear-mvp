import type { MapMarker } from "~/components/map/crisis-map";
import type { DjangoAlert, DjangoShockType } from "~/lib/types/django";
import { mapSeverity } from "~/lib/types/django";
import { countryConfig } from "~/lib/constants/country-config";

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
  shockTypes: DjangoShockType[],
): LayerDef[] {
  return shockTypes.map((st) => ({
    id: String(st.id),
    label: st.name,
    color: st.color,
    defaultChecked: true,
  }));
}

/** Fallback static layers used when API shock types aren't available */
export const fallbackLayers: LayerDef[] = [
  { id: "1", label: "Disease Outbreak", color: "#DC2626", defaultChecked: true },
  { id: "2", label: "Flood", color: "#2563EB", defaultChecked: true },
  { id: "3", label: "Drought", color: "#D97706", defaultChecked: true },
  { id: "4", label: "Conflict", color: "#DC2626", defaultChecked: true },
];

/* ========== Crisis types for filter dropdown ========== */
export function buildCrisisTypeOptions(
  shockTypes: DjangoShockType[],
): string[] {
  return ["All Types", ...shockTypes.map((st) => st.name)];
}

export const fallbackCrisisTypes = [
  "All Types",
  "Disease Outbreak",
  "Flood",
  "Drought",
  "Conflict",
];

/* ========== geo_id prefix → country name ========== */
const geoIdToCountry: Record<string, string> = {
  SD: "Sudan",
  ET: "Ethiopia",
  SS: "South Sudan",
  SO: "Somalia",
  YE: "Yemen",
  AF: "Afghanistan",
  UA: "Ukraine",
  IQ: "Iraq",
  SY: "Syria",
  CO: "Colombia",
};

function countryFromGeoId(geoId: string): string | undefined {
  const prefix = geoId.split("_")[0] ?? "";
  return geoIdToCountry[prefix];
}

/**
 * Reverse-lookup country from coordinates by finding the closest countryConfig center.
 * Used as fallback when geo_id doesn't map to a known country (e.g. OSM_* ids).
 */
function countryFromCoords(lng: number, lat: number): string {
  let best = "Unknown";
  let bestDist = Infinity;
  for (const [name, cfg] of Object.entries(countryConfig)) {
    const dx = cfg.center[0] - lng;
    const dy = cfg.center[1] - lat;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      best = name;
    }
  }
  return best;
}

/* ========== Transform Django alerts to map markers ========== */
export function alertsToMarkers(alerts: DjangoAlert[]): CrisisMarker[] {
  const markers: CrisisMarker[] = [];

  alerts.forEach((alert) => {
    alert.locations.forEach((loc, i) => {
      // Extract coordinates: prefer point.coordinates, fallback to lat/lng fields
      let lng: number | undefined;
      let lat: number | undefined;

      if (loc.point?.coordinates) {
        [lng, lat] = loc.point.coordinates;
      } else {
        lng = loc.longitude;
        lat = loc.latitude;
      }

      if (lng == null || lat == null) return;

      // Derive country from geo_id, fallback to nearest country center
      const country = countryFromGeoId(loc.geo_id) ?? countryFromCoords(lng, lat);

      markers.push({
        id: alert.id * 1000 + i,
        lng,
        lat,
        title: alert.title,
        severity: mapSeverity(alert.severity),
        type: String(alert.shock_type.id),
        description: alert.text,
        region: loc.name,
        country,
        shockTypeName: alert.shock_type.name,
        dataSource: alert.data_source?.name,
        shockDate: alert.shock_date,
      });
    });
  });

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
