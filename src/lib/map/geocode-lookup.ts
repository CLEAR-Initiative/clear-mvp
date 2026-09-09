/**
 * Place / coordinate lookup for the map search control.
 * Mapbox Geocoding v5 + a small lat/lng parser for raw coordinates.
 */

export type GeocodeHit = {
  id: string;
  label: string;
  center: [number, number]; // [lng, lat]
  /** west, south, east, north — when Mapbox returns a bbox */
  bbox?: [number, number, number, number];
  placeTypes: string[];
};

const COORD_RE =
  /^\s*([+-]?\d+(?:\.\d+)?)\s*[,;\s]\s*([+-]?\d+(?:\.\d+)?)\s*$/;

function isLat(n: number): boolean {
  return Number.isFinite(n) && n >= -90 && n <= 90;
}

function isLng(n: number): boolean {
  return Number.isFinite(n) && n >= -180 && n <= 180;
}

/**
 * Parse "lat, lng" or "lng, lat".
 * - If only one ordering is valid, use it.
 * - If both are valid (both |n| ≤ 90), prefer **lat, lng** (e.g. `15.5, 32.5`).
 */
export function parseCoordinateQuery(query: string): GeocodeHit | null {
  const m = COORD_RE.exec(query.trim());
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;

  const asLatLng = isLat(a) && isLng(b);
  const asLngLat = isLng(a) && isLat(b);

  let lat: number;
  let lng: number;
  if (asLatLng && asLngLat) {
    lat = a;
    lng = b;
  } else if (asLatLng) {
    lat = a;
    lng = b;
  } else if (asLngLat) {
    lng = a;
    lat = b;
  } else {
    return null;
  }

  const label = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  return {
    id: `coord:${lng},${lat}`,
    label,
    center: [lng, lat],
    placeTypes: ["coordinate"],
  };
}

/** Zoom framing by Mapbox place type (street-ish for addresses/POIs). */
export function zoomForPlaceTypes(placeTypes: string[]): number {
  if (placeTypes.includes("coordinate")) return 14;
  if (placeTypes.includes("country")) return 5;
  if (placeTypes.includes("region")) return 7;
  if (placeTypes.includes("district")) return 9;
  if (placeTypes.includes("place")) return 10;
  if (placeTypes.includes("locality") || placeTypes.includes("neighborhood")) {
    return 12;
  }
  if (placeTypes.includes("address") || placeTypes.includes("poi")) return 14;
  return 11;
}

type MapboxFeature = {
  id?: string;
  place_name?: string;
  center?: [number, number];
  bbox?: [number, number, number, number];
  place_type?: string[];
};

type MapboxGeocodeResponse = {
  features?: MapboxFeature[];
};

function featureToHit(f: MapboxFeature): GeocodeHit | null {
  if (!f.center || f.center.length !== 2) return null;
  const [lng, lat] = f.center;
  if (!isLng(lng) || !isLat(lat)) return null;
  const label = (f.place_name ?? "").trim();
  if (!label) return null;
  return {
    id: f.id ?? `mb:${lng},${lat}`,
    label,
    center: [lng, lat],
    ...(f.bbox ? { bbox: f.bbox } : {}),
    placeTypes: Array.isArray(f.place_type) ? f.place_type : [],
  };
}

/**
 * Forward-geocode a free-text query via Mapbox. Returns [] on empty query,
 * missing token, or network/API failure (caller shows a soft error).
 */
export async function geocodePlaceQuery(
  query: string,
  accessToken: string,
  opts?: { limit?: number; signal?: AbortSignal; language?: string },
): Promise<GeocodeHit[]> {
  const q = query.trim();
  if (!q || !accessToken) return [];

  const coord = parseCoordinateQuery(q);
  if (coord) return [coord];

  const limit = Math.min(Math.max(opts?.limit ?? 5, 1), 10);
  const params = new URLSearchParams({
    access_token: accessToken,
    limit: String(limit),
    autocomplete: "true",
  });
  if (opts?.language) params.set("language", opts.language);

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?${params}`;
  const res = await fetch(url, { signal: opts?.signal });
  if (!res.ok) return [];
  const data = (await res.json()) as MapboxGeocodeResponse;
  const features = Array.isArray(data.features) ? data.features : [];
  return features
    .map(featureToHit)
    .filter((h): h is GeocodeHit => h != null);
}
