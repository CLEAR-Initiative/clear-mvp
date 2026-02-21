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
    id: st.name,
    label: st.name,
    color: st.color,
    defaultChecked: true,
  }));
}

/* ========== Crisis types for filter dropdown ========== */
export function buildCrisisTypeOptions(
  shockTypes: DjangoShockType[],
): string[] {
  return ["All Types", ...shockTypes.map((st) => st.name)];
}

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
  // Try underscore-delimited prefix first (e.g. "SD_001" → "SD")
  const prefix = geoId.split("_")[0] ?? "";
  if (geoIdToCountry[prefix]) return geoIdToCountry[prefix];
  // Fallback: try first 2 characters for compact IDs (e.g. "SD13024043" → "SD")
  return geoIdToCountry[geoId.slice(0, 2)];
}

/**
 * Reverse-lookup country from coordinates using bounding-box containment.
 * Falls back to "Unknown" when the point is outside all configured countries,
 * preventing incorrect assignment to the nearest country center.
 */
function countryFromCoords(lng: number, lat: number): string {
  for (const [name, cfg] of Object.entries(countryConfig)) {
    const [lngMin, latMin, lngMax, latMax] = cfg.bbox;
    if (lng >= lngMin && lng <= lngMax && lat >= latMin && lat <= latMax) {
      return name;
    }
  }
  return "Unknown";
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
        type: alert.shock_type.name,
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
