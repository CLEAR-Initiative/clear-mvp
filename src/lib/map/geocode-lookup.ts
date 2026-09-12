/**
 * Place / coordinate lookup for the map search control.
 * Mapbox Geocoding v5 + a small lat/lng parser for raw coordinates.
 */

import {
  ALL_COUNTRIES,
  resolveCountryConfig,
  shortCountryName,
} from "~/lib/constants/country-config";

export type GeocodeHit = {
  id: string;
  label: string;
  center: [number, number]; // [lng, lat]
  /** west, south, east, north — when Mapbox returns a bbox */
  bbox?: [number, number, number, number];
  placeTypes: string[];
  /** Parent country display name from Mapbox (when known). */
  countryName?: string;
  /** ISO 3166-1 alpha-2 from Mapbox `short_code` (e.g. "sd"). */
  countryCode?: string;
};

const COORD_RE =
  /^\s*([+-]?\d+(?:\.\d+)?)\s*[,;\s]\s*([+-]?\d+(?:\.\d+)?)\s*$/;

/** Observe GPS chip / pasted DMS-ish: `33.4445°S 70.6452°W`, `15.5 N, 32.5 E`. */
const COORD_HEMISPHERE_RE =
  /^\s*([+-]?\d+(?:\.\d+)?)\s*°?\s*([NSns])?\s*[,;\s/]+\s*([+-]?\d+(?:\.\d+)?)\s*°?\s*([EWew])?\s*$/;

function isLat(n: number): boolean {
  return Number.isFinite(n) && n >= -90 && n <= 90;
}

function isLng(n: number): boolean {
  return Number.isFinite(n) && n >= -180 && n <= 180;
}

function coordHit(lat: number, lng: number): GeocodeHit {
  const label = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  return {
    id: `coord:${lng},${lat}`,
    label,
    center: [lng, lat],
    placeTypes: ["coordinate"],
  };
}

/**
 * Parse "lat, lng" or "lng, lat", including hemisphere suffixes from the
 * Observe GPS chip (`33.4445°S 70.6452°W`).
 * - Hemispheres present → signed lat/lng (S/W negative).
 * - Bare numbers: if only one ordering is valid, use it; if both are valid
 *   (both |n| ≤ 90), prefer **lat, lng** (e.g. `15.5, 32.5`).
 */
export function parseCoordinateQuery(query: string): GeocodeHit | null {
  const q = query.trim();
  if (!q) return null;

  const hem = COORD_HEMISPHERE_RE.exec(q);
  if (hem && (hem[2] || hem[4])) {
    const a = Number(hem[1]);
    const b = Number(hem[3]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    const h1 = (hem[2] ?? "").toUpperCase();
    const h2 = (hem[4] ?? "").toUpperCase();

    // N/S on first token (or E/W on second) → lat, lng order.
    // E/W on first token → lng, lat order.
    const firstIsLng = h1 === "E" || h1 === "W";
    let lat = firstIsLng ? b : a;
    let lng = firstIsLng ? a : b;
    const latHem = firstIsLng ? h2 : h1;
    const lngHem = firstIsLng ? h1 : h2;

    if (latHem === "S") lat = -Math.abs(lat);
    else if (latHem === "N") lat = Math.abs(lat);
    if (lngHem === "W") lng = -Math.abs(lng);
    else if (lngHem === "E") lng = Math.abs(lng);

    if (!isLat(lat) || !isLng(lng)) return null;
    return coordHit(lat, lng);
  }

  const m = COORD_RE.exec(q);
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

  return coordHit(lat, lng);
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

type MapboxContext = {
  id?: string;
  text?: string;
  short_code?: string;
};

type MapboxFeature = {
  id?: string;
  text?: string;
  place_name?: string;
  center?: [number, number];
  bbox?: [number, number, number, number];
  place_type?: string[];
  context?: MapboxContext[];
  properties?: { short_code?: string };
};

type MapboxGeocodeResponse = {
  features?: MapboxFeature[];
};

/** Normalize Mapbox short_code ("sd", "US") to ISO alpha-2. */
export function normalizeCountryCode(code: string | undefined | null): string | null {
  if (!code) return null;
  const cleaned = code.trim().toUpperCase();
  if (/^[A-Z]{2}$/.test(cleaned)) return cleaned;
  // Rare region-style codes — take the country prefix when present ("VE-A").
  const m = /^([A-Z]{2})(?:-|$)/.exec(cleaned);
  return m?.[1] ?? null;
}

/**
 * Pull parent country name/code from a Mapbox feature (feature itself or context).
 */
export function countryFromMapboxFeature(f: MapboxFeature): {
  countryName?: string;
  countryCode?: string;
} {
  const types = Array.isArray(f.place_type) ? f.place_type : [];
  if (types.includes("country")) {
    const name = (f.text ?? f.place_name ?? "").trim() || undefined;
    const code =
      normalizeCountryCode(f.properties?.short_code) ?? undefined;
    return {
      ...(name ? { countryName: name } : {}),
      ...(code ? { countryCode: code } : {}),
    };
  }

  const ctx = Array.isArray(f.context) ? f.context : [];
  for (const c of ctx) {
    if (typeof c.id === "string" && c.id.startsWith("country.")) {
      const name = (c.text ?? "").trim() || undefined;
      const code = normalizeCountryCode(c.short_code) ?? undefined;
      return {
        ...(name ? { countryName: name } : {}),
        ...(code ? { countryCode: code } : {}),
      };
    }
  }

  // Last comma segment of "City, Region, Country" as a soft fallback.
  const parts = (f.place_name ?? "")
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length >= 2) {
    const tail = parts[parts.length - 1]!;
    return { countryName: tail };
  }
  return {};
}

/**
 * Map a geocode country onto a picker option the user can select.
 * Returns null when the country is outside the assigned/available list
 * (search/fly-to still works; filter stays put).
 */
export function matchPickerCountry(
  pickerOptions: readonly string[],
  hit: { countryName?: string | null; countryCode?: string | null },
): string | null {
  const candidates = pickerOptions.filter((c) => c !== ALL_COUNTRIES);
  if (candidates.length === 0) return null;

  const iso = normalizeCountryCode(hit.countryCode);
  if (iso) {
    for (const opt of candidates) {
      if (resolveCountryConfig(opt)?.pCode === iso) return opt;
    }
  }

  const raw = hit.countryName?.trim();
  if (!raw) return null;
  const needle = shortCountryName(raw).toLowerCase();
  const hitCfg = resolveCountryConfig(raw);

  for (const opt of candidates) {
    if (opt.toLowerCase() === needle) return opt;
    if (shortCountryName(opt).toLowerCase() === needle) return opt;
    const optCfg = resolveCountryConfig(opt);
    if (hitCfg && optCfg && hitCfg.pCode && hitCfg.pCode === optCfg.pCode) {
      return opt;
    }
  }
  return null;
}

function featureToHit(f: MapboxFeature): GeocodeHit | null {
  if (!f.center || f.center.length !== 2) return null;
  const [lng, lat] = f.center;
  if (!isLng(lng) || !isLat(lat)) return null;
  const label = (f.place_name ?? "").trim();
  if (!label) return null;
  const country = countryFromMapboxFeature(f);
  return {
    id: f.id ?? `mb:${lng},${lat}`,
    label,
    center: [lng, lat],
    ...(f.bbox ? { bbox: f.bbox } : {}),
    placeTypes: Array.isArray(f.place_type) ? f.place_type : [],
    ...country,
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
  try {
    const res = await fetch(url, { signal: opts?.signal });
    if (!res.ok) return [];
    const data = (await res.json()) as MapboxGeocodeResponse;
    const features = Array.isArray(data.features) ? data.features : [];
    return features
      .map(featureToHit)
      .filter((h): h is GeocodeHit => h != null);
  } catch {
    return [];
  }
}
