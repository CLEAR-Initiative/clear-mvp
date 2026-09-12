/**
 * Optional Mapbox refinement for Observe pins.
 *
 * Catalog `@Khartoum` / free-text "Khartoum" only yields an admin centroid.
 * When the draft also names a landmark ("National Museum"), geocode the
 * compose text and, if Mapbox returns a POI/address, submit lat/lng so
 * clear-api `createPointLocation` lands on that point instead of the city
 * centroid.
 *
 * This is a FE stopgap. Named `landmark-geocoded` L4 rows (CLEAR ontology)
 * still require clear-api `findOrCreateLandmarkL4` / pipeline geoparser —
 * see docs/observe-pin-resolution.md.
 */

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

export function buildObserveGeocodeQuery(draft: string, locationLabel: string): string {
  const body = stripTrailingAtMention(draft).replace(/\s+/g, " ").trim();
  const place = locationLabel.trim();
  if (body && place) {
    // Avoid "Khartoum, Khartoum, Sudan" when the chip label already mirrors the body.
    if (body.toLowerCase().includes(place.split(",")[0]!.trim().toLowerCase())) {
      return body.length >= place.length ? body : place;
    }
    return `${body}, ${place}`;
  }
  return body || place;
}

/** Only POI/address/landmark — never bare city `place` (that's the catalog centroid). */
export function pickPreciseGeocodeHit(hits: readonly GeocodeHit[]): GeocodeHit | null {
  return (
    hits.find((h) => h.placeTypes.some((t) => PRECISE_PLACE_TYPES.has(t))) ?? null
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
  geocode: (query: string) => Promise<GeocodeHit[]>;
}): Promise<ObservePinFields> {
  if (input.gps) {
    return { lat: input.gps.lat, lng: input.gps.lng, pinSource: "gps" };
  }

  const query = buildObserveGeocodeQuery(input.draft, input.locationLabel);
  if (query.length >= 3) {
    try {
      const hits = await input.geocode(query);
      const precise = pickPreciseGeocodeHit(hits);
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
