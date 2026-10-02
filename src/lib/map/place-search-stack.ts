/**
 * Stacked map-search filters.
 *
 * "sudan" then "national museum" must geocode as one query, biased to the
 * committed country, and pin the closest in-country hit — not every National
 * Museum on earth.
 */

import { shortCountryName } from "~/lib/constants/country-config";
import type { GeocodeHit } from "~/lib/map/geocode-lookup";

export type PlaceSearchFilter = {
  id: string;
  /** Token the user committed ("sudan", "national museum"). */
  text: string;
  hit: GeocodeHit;
};

const SPECIFICITY = [
  "poi",
  "landmark",
  "address",
  "neighborhood",
  "locality",
  "place",
  "district",
  "region",
  "country",
] as const;

export function composeStackedPlaceQuery(tokens: readonly string[]): string {
  return tokens
    .map((t) => t.trim())
    .filter(Boolean)
    .join(" ");
}

export function anchorFromHit(hit: GeocodeHit): {
  center: [number, number];
  countryCode?: string;
  countryName?: string;
} {
  return {
    center: hit.center,
    ...(hit.countryCode ? { countryCode: hit.countryCode } : {}),
    ...(hit.countryName ? { countryName: hit.countryName } : {}),
  };
}

/** Bias later searches toward the last committed filter. */
export function searchBiasFromFilters(filters: readonly PlaceSearchFilter[]): {
  country?: string;
  proximity?: [number, number];
} {
  const last = filters[filters.length - 1]?.hit;
  if (!last) return {};
  const country = last.countryCode?.trim().toLowerCase();
  return {
    ...(country && /^[a-z]{2}$/.test(country) ? { country } : {}),
    proximity: last.center,
  };
}

function specificityRank(placeTypes: readonly string[]): number {
  let best: number = SPECIFICITY.length;
  for (const t of placeTypes) {
    const i = SPECIFICITY.indexOf(t as (typeof SPECIFICITY)[number]);
    if (i >= 0 && i < best) best = i;
  }
  return best;
}

function haversineKm(a: [number, number], b: [number, number]): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const [lng1, lat1] = a;
  const [lng2, lat2] = b;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLng / 2);
  const h =
    s1 * s1 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * s2 * s2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function hitMatchesAnchorCountry(
  hit: GeocodeHit,
  anchor: { countryCode?: string; countryName?: string },
): boolean {
  if (hit.placeTypes.includes("coordinate")) return true;

  const anchorIso = anchor.countryCode?.trim().toUpperCase() || null;
  const hitIso = hit.countryCode?.trim().toUpperCase() || null;
  if (anchorIso && hitIso) return hitIso === anchorIso;

  const anchorName = shortCountryName(anchor.countryName ?? "").toLowerCase();
  if (!anchorName) return !anchorIso;
  const hitName = shortCountryName(hit.countryName ?? "").toLowerCase();
  if (hitName && (hitName === anchorName || hitName.includes(anchorName))) {
    return true;
  }
  return hit.label.toLowerCase().includes(anchorName);
}

/**
 * Same-country hits only (when the anchor has a country), then more specific
 * place types, then closest to the anchor. Null when every hit is elsewhere.
 */
export function rankStackedPlaceHits(
  hits: readonly GeocodeHit[],
  anchor?: { center: [number, number]; countryCode?: string; countryName?: string } | null,
): GeocodeHit[] {
  if (!anchor) return [...hits];

  const inCountry = hits.filter((h) => hitMatchesAnchorCountry(h, anchor));
  const hasCountry = !!(anchor.countryCode || anchor.countryName);
  if (hasCountry && inCountry.length === 0) return [];

  const pool = inCountry.length > 0 ? inCountry : [...hits];
  return [...pool].sort((a, b) => {
    const spec = specificityRank(a.placeTypes) - specificityRank(b.placeTypes);
    if (spec !== 0) return spec;
    return haversineKm(a.center, anchor.center) - haversineKm(b.center, anchor.center);
  });
}

export function pickStackedPlaceHit(
  hits: readonly GeocodeHit[],
  anchor?: { center: [number, number]; countryCode?: string; countryName?: string } | null,
): GeocodeHit | null {
  return rankStackedPlaceHits(hits, anchor)[0] ?? null;
}

const CITY_TYPES = new Set(["place", "locality", "neighborhood", "district"]);
const LANDMARK_TYPES = new Set(["poi", "landmark", "address"]);

export function isCountryHit(hit: GeocodeHit): boolean {
  return hit.placeTypes.includes("country");
}

export function isCityHit(hit: GeocodeHit): boolean {
  return hit.placeTypes.some((t) => CITY_TYPES.has(t));
}

export function isLandmarkHit(hit: GeocodeHit): boolean {
  return hit.placeTypes.some((t) => LANDMARK_TYPES.has(t));
}

/** Country already committed, else the country of the last pill. */
export function committedCountry(
  filters: readonly PlaceSearchFilter[],
): { countryCode?: string; countryName?: string } | null {
  if (filters.length === 0) return null;
  const countryPill = filters.find((f) => isCountryHit(f.hit));
  const source = countryPill?.hit ?? filters[filters.length - 1]!.hit;
  if (isCountryHit(source)) {
    return {
      ...(source.countryCode ? { countryCode: source.countryCode } : {}),
      countryName: source.countryName ?? source.label,
    };
  }
  if (!source.countryCode && !source.countryName) return null;
  return {
    ...(source.countryCode ? { countryCode: source.countryCode } : {}),
    ...(source.countryName ? { countryName: source.countryName } : {}),
  };
}

export type StackDecision = "allow" | "conflict-country" | "reject";

/**
 * After a country is selected, only a city or landmark inside that country
 * may stack. A second country is a conflict — caller shakes and does not commit.
 */
export function decideStack(
  filters: readonly PlaceSearchFilter[],
  hit: GeocodeHit,
): StackDecision {
  if (filters.length === 0) return "allow";

  const anchor = committedCountry(filters);
  if (isCountryHit(hit)) {
    if (!anchor) return "reject";
    return hitMatchesAnchorCountry(hit, anchor) ? "reject" : "conflict-country";
  }

  if (anchor && !hitMatchesAnchorCountry(hit, anchor)) return "reject";
  if (isCityHit(hit) || isLandmarkHit(hit)) return "allow";
  return "reject";
}

/** Mapbox `types` after a country pill: cities and landmarks, not another country. */
const AFTER_COUNTRY_TYPES = "place,locality,district,neighborhood,poi,address";
/** After a city pill: landmarks and addresses inside that city. */
const AFTER_CITY_TYPES = "poi,address,neighborhood";

export type RecommendationScope = {
  country?: string;
  proximity?: [number, number];
  types?: string;
  bbox?: [number, number, number, number];
};

/**
 * Suggestions follow the typed token. The previous pill only scopes them:
 * a country limits hits to cities and landmarks in that country; a city
 * limits hits to landmarks inside that city.
 */
export function recommendationScope(
  filters: readonly PlaceSearchFilter[],
): RecommendationScope {
  if (filters.length === 0) return {};

  const city = [...filters].reverse().find((f) => isCityHit(f.hit));
  const country = [...filters].reverse().find((f) => isCountryHit(f.hit));
  const anchor = city?.hit ?? country?.hit ?? filters[filters.length - 1]!.hit;
  const iso = (anchor.countryCode ?? country?.hit.countryCode)?.trim().toLowerCase();

  const scope: RecommendationScope = {
    proximity: city?.hit.center ?? anchor.center,
    ...(iso && /^[a-z]{2}$/.test(iso) ? { country: iso } : {}),
  };

  if (city) {
    scope.types = AFTER_CITY_TYPES;
    if (city.hit.bbox) scope.bbox = city.hit.bbox;
    return scope;
  }
  if (country) {
    scope.types = AFTER_COUNTRY_TYPES;
    return scope;
  }
  return scope;
}
