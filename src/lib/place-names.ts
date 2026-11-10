import type { GqlPlaceNameSuggestion, GqlUnresolvedPlaceName } from "~/lib/types/graphql";

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
