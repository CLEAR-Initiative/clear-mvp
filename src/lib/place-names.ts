import type {
  GqlPlaceAlias,
  GqlPlaceNameSuggestion,
  GqlUnresolvedPlaceName,
  PlaceAliasCountry,
} from "~/lib/types/graphql";

/**
 * Unresolved place names in the Inbox (clear-api ADR-0019): a place name, as
 * written in Signals, that geocoding could not place. A decider resolves it
 * once: the answer becomes a place alias in clear-api, and the Signals that
 * wait on it move.
 */

/** How a decider answers a row (clear-api `UnresolvedPlaceNameResolutionKind`). */
export const PLACE_NAME_RESOLUTION_KINDS = ["LOCATION", "GEONAMES", "POINT", "NOT_A_PLACE", "AMBIGUOUS"] as const;
export type PlaceNameResolutionKind = (typeof PLACE_NAME_RESOLUTION_KINDS)[number];

/** One answer, as `placeNames.resolve` takes it. */
export type PlaceNameResolution =
  | { kind: "LOCATION"; locationId: string }
  | { kind: "GEONAMES"; geonamesId: number }
  | { kind: "POINT"; point: { lat: number; lng: number; name?: string } }
  | { kind: "NOT_A_PLACE" }
  | { kind: "AMBIGUOUS" };

/** The answer that uses a suggestion: a CLEAR place by its id, a GeoNames
 *  place by its GeoNames id. Null for a suggestion that carries neither. */
export function resolutionForSuggestion(s: GqlPlaceNameSuggestion): PlaceNameResolution | null {
  if (s.kind === "LOCATION" && s.locationId) return { kind: "LOCATION", locationId: s.locationId };
  if (s.kind === "GEONAMES" && s.geonamesId != null) return { kind: "GEONAMES", geonamesId: s.geonamesId };
  return null;
}

/** A stable key for a suggestion in a list. */
export function suggestionKey(s: GqlPlaceNameSuggestion): string {
  return s.kind === "LOCATION" ? `l:${s.locationId}` : `g:${s.geonamesId}`;
}

/** The area a row's answer must fall in for a team admin: its state, or its
 *  country for a row with no state. Used as the point picker's area. */
export function placeNameHomeArea(row: Pick<GqlUnresolvedPlaceName, "stateLocationId" | "countryLocationId">): { id: string }[] {
  const home = row.stateLocationId ?? row.countryLocationId;
  return home ? [{ id: home }] : [];
}

/** The toast after a row is resolved, by kind. */
export type PlaceResolvedToastKey = "place.toast.resolved" | "place.toast.notAPlace" | "place.toast.ambiguous";
export function placeResolvedToastKey(kind: PlaceNameResolutionKind): PlaceResolvedToastKey {
  if (kind === "NOT_A_PLACE") return "place.toast.notAPlace";
  if (kind === "AMBIGUOUS") return "place.toast.ambiguous";
  return "place.toast.resolved";
}

export type PlaceErrorKey =
  | "place.errors.forbidden"
  | "place.errors.badPlace"
  | "place.errors.conflict"
  | "place.errors.failed";

/** The `inbox` message for a failed resolution, by the tRPC code clear-api's
 *  error mapped to. CONFLICT: resolved already, or the spelling has an alias.
 *  NOT_FOUND: gone, the same to the decider. */
export function placeErrorKey(code: string | null | undefined): PlaceErrorKey {
  switch (code) {
    case "FORBIDDEN":
      return "place.errors.forbidden";
    case "BAD_REQUEST":
      return "place.errors.badPlace";
    case "CONFLICT":
    case "NOT_FOUND":
      return "place.errors.conflict";
    default:
      return "place.errors.failed";
  }
}

/** A short excerpt of a Signal for the pane: its description, else its title. */
export function signalExcerpt(signal: { title: string | null; description: string | null } | null, max = 280): string | null {
  const text = (signal?.description?.trim() || signal?.title?.trim() || "").replace(/\s+/g, " ");
  if (!text) return null;
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/* ─── The alias list ─── */

/** Where an alias came from (clear-api `PlaceAliasSource`). */
export const PLACE_ALIAS_SOURCES = ["REVIEW", "SEED", "MANUAL"] as const;
export type PlaceAliasSource = (typeof PLACE_ALIAS_SOURCES)[number];

/** A country's name without its long official form: "Venezuela (Bolivarian
 *  Republic of)" and "the Sudan" match "Venezuela" and "Sudan". */
function countryKey(name: string): string {
  return name
    .replace(/\([^)]*\)/g, "")
    .trim()
    .toLowerCase()
    .replace(/^the\s+/, "");
}

/**
 * The countries an alias can belong to, each with its states, from clear-api's
 * pipeline countries (which carry the ISO-2 code an alias needs) and its
 * level-0 and level-1 locations. A country location is matched by its P-Code,
 * else by name: a P-Code is missing on many installs. A country with no
 * matching location still lists, with no states: a country-wide alias needs
 * only the code.
 */
export function aliasCountries(data: {
  pipelineCountries: { name: string; pcode: string }[];
  countries: { id: string; name: string; pCode: string | null }[];
  states: { id: string; name: string; parent: { id: string } | null }[];
}): PlaceAliasCountry[] {
  return (data.pipelineCountries ?? []).map((country) => {
    const code = country.pcode.toUpperCase();
    const location =
      (data.countries ?? []).find((l) => l.pCode?.toUpperCase() === code) ??
      (data.countries ?? []).find((l) => countryKey(l.name) === countryKey(country.name)) ??
      null;
    const states = location
      ? (data.states ?? [])
          .filter((s) => s.parent?.id === location.id)
          .map((s) => ({ id: s.id, name: s.name }))
          .sort((a, b) => a.name.localeCompare(b.name))
      : [];
    return { countryCode: code, name: country.name, countryLocationId: location?.id ?? null, states };
  });
}

/** An alias's target as a path, finest first: "Um Dabakir, Kadugli, South
 *  Kordofan". The country is left out: the list shows one country's aliases
 *  side by side with their scope. */
export function aliasTargetPath(alias: Pick<GqlPlaceAlias, "location">): string | null {
  const location = alias.location;
  if (!location) return null;
  const above = [...location.ancestors].filter((a) => a.level > 0).sort((a, b) => b.level - a.level);
  return [location.name, ...above.map((a) => a.name)].join(", ");
}

export type AliasErrorKey =
  | "aliases.errors.forbidden"
  | "aliases.errors.badInput"
  | "aliases.errors.conflict"
  | "aliases.errors.gone"
  | "aliases.errors.failed";

/** The `inbox` message for a refused alias write, by the tRPC code. */
export function aliasErrorKey(code: string | null | undefined): AliasErrorKey {
  switch (code) {
    case "FORBIDDEN":
      return "aliases.errors.forbidden";
    case "BAD_REQUEST":
      return "aliases.errors.badInput";
    case "CONFLICT":
      return "aliases.errors.conflict";
    case "NOT_FOUND":
      return "aliases.errors.gone";
    default:
      return "aliases.errors.failed";
  }
}
