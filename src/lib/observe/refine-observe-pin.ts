/**
 * Optional Mapbox refinement for Observe pins.
 *
 * Catalog `@Khartoum` / free-text "Khartoum" only yields an admin centroid.
 * When the draft also names a landmark ("National Museum"), geocode the
 * compose text and, if Mapbox returns a POI/address **in the same country**,
 * submit lat/lng so clear-api `createPointLocation` lands on that point.
 *
 * Without country anchoring, Mapbox often returns a different "National
 * Museum" (e.g. Beirut) — that regression is covered in tests.
 *
 * This is a FE stopgap. Named `landmark-geocoded` L4 rows (CLEAR ontology)
 * still require clear-api `findOrCreateLandmarkL4` / pipeline geoparser —
 * see docs/observe-pin-resolution.md.
 */

import {
  resolveCountryConfig,
  shortCountryName,
} from "~/lib/constants/country-config";
import type { GeocodeHit } from "~/lib/map/geocode-lookup";
import { stripTrailingAtMention } from "~/lib/observe/field-signal";

const PRECISE_PLACE_TYPES = new Set(["poi", "address", "landmark"]);

export type ObservePinFields = {
  locationId?: string;
  lat?: number;
  lng?: number;
  /** How the pin was chosen — useful for tests / future UI affordances. */
  pinSource: "gps" | "geocode" | "catalog" | "none";
};

export type ObserveGeocodeOpts = {
  /** ISO 3166-1 alpha-2 lowercased for Mapbox `country=` bias. */
  country?: string;
};

/** Last comma segment of "City, Region, Country" → country display name. */
export function catalogCountryFromLabel(locationLabel: string): string | null {
  const parts = locationLabel
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  return shortCountryName(parts[parts.length - 1]!);
}

export function catalogCountryIsoFromLabel(locationLabel: string): string | null {
  const name = catalogCountryFromLabel(locationLabel);
  if (!name) return null;
  const code = resolveCountryConfig(name)?.pCode;
  return code ? code.toLowerCase() : null;
}

/**
 * Build a Mapbox query that always keeps the catalog place (incl. country).
 * Never drop the country suffix when the draft already mentions the city —
 * that let "National Museum in Khartoum" resolve to Beirut.
 */
export function buildObserveGeocodeQuery(draft: string, locationLabel: string): string {
  const body = stripTrailingAtMention(draft).replace(/\s+/g, " ").trim();
  const place = locationLabel.trim();
  if (!body) return place;
  if (!place) return body;

  const placeLower = place.toLowerCase();
  const bodyLower = body.toLowerCase();
  if (bodyLower.includes(placeLower)) return body;
  // Body already ends with the city token from the label — still append country.
  const city = place.split(",")[0]?.trim() ?? place;
  const country = catalogCountryFromLabel(place);
  if (city && bodyLower.includes(city.toLowerCase()) && country) {
    if (bodyLower.includes(country.toLowerCase())) return body;
    return `${body}, ${country}`;
  }
  return `${body}, ${place}`;
}

export function geocodeHitMatchesCatalogCountry(
  hit: GeocodeHit,
  locationLabel: string,
): boolean {
  const catalogCountry = catalogCountryFromLabel(locationLabel);
  if (!catalogCountry) {
    // No country in the chip — require the city/place token to appear on the hit.
    const city = locationLabel.split(",")[0]?.trim().toLowerCase();
    if (!city) return true;
    return hit.label.toLowerCase().includes(city);
  }

  const catalogIso = catalogCountryIsoFromLabel(locationLabel);
  const hitIso = hit.countryCode?.trim().toUpperCase() ?? null;
  if (catalogIso && hitIso) return hitIso === catalogIso.toUpperCase();

  const catalogShort = catalogCountry.toLowerCase();
  const hitCountry = shortCountryName(hit.countryName ?? "")?.toLowerCase() ?? "";
  if (hitCountry && (hitCountry === catalogShort || hitCountry.includes(catalogShort))) {
    return true;
  }
  // Soft fallback: label must mention the catalog country (Mapbox place_name).
  return hit.label.toLowerCase().includes(catalogShort);
}

/** Only in-country POI/address/landmark — never bare city `place` or wrong-country POIs. */
export function pickPreciseGeocodeHit(
  hits: readonly GeocodeHit[],
  locationLabel: string,
): GeocodeHit | null {
  return (
    hits.find(
      (h) =>
        h.placeTypes.some((t) => PRECISE_PLACE_TYPES.has(t)) &&
        geocodeHitMatchesCatalogCountry(h, locationLabel),
    ) ?? null
  );
}

/**
 * GPS wins. Otherwise try Mapbox on the draft (+ catalog label), then fall
 * back to catalog `locationId`.
 */
export async function resolveObservePinFields(input: {
  draft: string;
  locationId: string;
  locationLabel: string;
  gps: { lat: number; lng: number } | null;
  geocode: (query: string, opts?: ObserveGeocodeOpts) => Promise<GeocodeHit[]>;
}): Promise<ObservePinFields> {
  if (input.gps) {
    return { lat: input.gps.lat, lng: input.gps.lng, pinSource: "gps" };
  }

  const query = buildObserveGeocodeQuery(input.draft, input.locationLabel);
  if (query.length >= 3) {
    try {
      const country = catalogCountryIsoFromLabel(input.locationLabel) ?? undefined;
      const hits = await input.geocode(query, country ? { country } : undefined);
      const precise = pickPreciseGeocodeHit(hits, input.locationLabel);
      if (precise) {
        const [lng, lat] = precise.center;
        return { lat, lng, pinSource: "geocode" };
      }
    } catch {
      // Soft-fail: catalog locationId still paints a coarse pin.
    }
  }

  if (input.locationId) {
    return { locationId: input.locationId, pinSource: "catalog" };
  }
  return { pinSource: "none" };
}
