import type {
  GqlPlaceAlias,
  GqlPlaceNameProposal,
  GqlPlaceNameResearch,
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
  | { kind: "POINT"; point: { lat: number; lng: number; name?: string }; proposalId?: string }
  | { kind: "NOT_A_PLACE" }
  | { kind: "AMBIGUOUS" };

/** The answer that uses a suggestion: a CLEAR place by its id, a GeoNames
 *  place by its GeoNames id. Null for a suggestion that carries neither. */
export function resolutionForSuggestion(s: GqlPlaceNameSuggestion): PlaceNameResolution | null {
  if (s.kind === "LOCATION" && s.locationId) return { kind: "LOCATION", locationId: s.locationId };
  if (s.kind === "GEONAMES" && s.geonamesId != null) return { kind: "GEONAMES", geonamesId: s.geonamesId };
  return null;
}

/* ─── Place research (clear-api D-0296) ─── */

/** Where the research of a row stands, as the pane shows it. */
export type PlaceResearchState =
  /** No Task and no proposal: the decider can request research. */
  | "none"
  /** A Task waits for a Worker. */
  | "waiting"
  /** A Worker has the Task. */
  | "running"
  /** The last Task failed, and no proposal is newer than it. */
  | "failed"
  | "found"
  | "not_found"
  | "not_a_place";

/** The state of a row's research. An open Task comes first: a decider who
 *  asked again waits for the new result. A failed Task counts only while no
 *  proposal is newer than it. */
export function placeResearchState(research: GqlPlaceNameResearch | null | undefined): PlaceResearchState {
  if (!research) return "none";
  if (research.taskStatus === "PENDING") return "waiting";
  if (research.taskStatus === "LEASED") return "running";
  const { latestTask, proposal } = research;
  const failed =
    latestTask?.status === "FAILED" &&
    (!proposal || new Date(latestTask.createdAt).getTime() > new Date(proposal.createdAt).getTime());
  if (failed) return "failed";
  return proposal?.outcome ?? "none";
}

/** Whether the pane asks clear-api again for the research of a row. */
export function placeResearchIsOpen(research: GqlPlaceNameResearch | null | undefined): boolean {
  return research?.taskStatus === "PENDING" || research?.taskStatus === "LEASED";
}

/** The list and map key of a researched suggestion. */
export function proposalKey(proposal: Pick<GqlPlaceNameProposal, "id">): string {
  return `r:${proposal.id}`;
}

/** The answer that uses a `found` proposal: its own point, with its id, so
 *  clear-api records who used it. Null for a proposal with no point. */
export function resolutionForProposal(proposal: GqlPlaceNameProposal): PlaceNameResolution | null {
  if (proposal.outcome !== "found" || proposal.latitude == null || proposal.longitude == null) return null;
  return {
    kind: "POINT",
    point: { lat: proposal.latitude, lng: proposal.longitude, name: proposal.nameFound ?? undefined },
    proposalId: proposal.id,
  };
}

/** A source link opens only when it is http(s): the URL comes from a Worker
 *  that read the open web. */
export function safeSourceHref(url: string): string | null {
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export type PlaceResearchErrorKey =
  | "place.research.errors.cap"
  | "place.research.errors.forbidden"
  | "place.research.errors.closed"
  | "place.research.errors.failed";

/** The `inbox` message for a failed research request, by tRPC code.
 *  TOO_MANY_REQUESTS is clear-api's per-person daily cap. */
export function placeResearchErrorKey(code: string | null | undefined): PlaceResearchErrorKey {
  switch (code) {
    case "TOO_MANY_REQUESTS":
      return "place.research.errors.cap";
    case "FORBIDDEN":
      return "place.research.errors.forbidden";
    case "CONFLICT":
    case "NOT_FOUND":
      return "place.research.errors.closed";
    default:
      return "place.research.errors.failed";
  }
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

/* ─── Looking a name up outside CLEAR ─── */

/** Where the pane's lookup links go. */
export const PLACE_LOOKUP_PROVIDERS = ["google_maps", "openstreetmap", "web_search"] as const;
export type PlaceLookupProvider = (typeof PLACE_LOOKUP_PROVIDERS)[number];

/** Where a map lookup opens: the middle of the row's area and a zoom that
 *  shows it. */
export type PlaceLookupView = { lat: number; lng: number; zoom: number };

/** What the lookup links search for: the Arabic spelling when the row has
 *  one, else the name as written, with the area's name (the row's state, or
 *  its country for a row with no state). */
export function placeLookupQuery(
  row: Pick<GqlUnresolvedPlaceName, "nameAsWritten" | "nameAr">,
  area: string,
): string {
  const name = row.nameAr?.trim() || row.nameAsWritten.trim();
  return [name, area.trim()].filter(Boolean).join(", ");
}

/** The view that shows an area, from its outline (a GeoJSON Polygon or
 *  MultiPolygon): the middle of its bounding box, and a web-map zoom that
 *  fits it. Null for an outline with no position. */
export function placeLookupView(outline: { coordinates: unknown } | null | undefined): PlaceLookupView | null {
  let south = Infinity;
  let north = -Infinity;
  let west = Infinity;
  let east = -Infinity;
  // Every [lng, lat] position in the coordinates tree.
  const walk = (node: unknown) => {
    if (!Array.isArray(node)) return;
    const [lng, lat] = node as unknown[];
    if (typeof lng === "number" && typeof lat === "number") {
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
      south = Math.min(south, lat);
      north = Math.max(north, lat);
      west = Math.min(west, lng);
      east = Math.max(east, lng);
      return;
    }
    for (const child of node) walk(child);
  };
  walk(outline?.coordinates);
  if (south > north) return null;
  // A zoom-z map is 360/2^z degrees wide per 256 px; a window is about four
  // tiles wide and half as tall in degrees of latitude.
  const span = Math.max(east - west, (north - south) * 2, 0.01);
  const zoom = Math.min(12, Math.max(3, Math.floor(Math.log2(360 / span)) + 1));
  const round = (n: number) => Math.round(n * 1e4) / 1e4;
  return { lat: round((south + north) / 2), lng: round((west + east) / 2), zoom };
}

/** The lookup links for a query. With a view, the two maps open on it, so
 *  results near the row's area come first. */
export function placeLookupLinks(
  query: string,
  view: PlaceLookupView | null,
): { provider: PlaceLookupProvider; href: string }[] {
  const q = encodeURIComponent(query);
  return [
    {
      provider: "google_maps",
      href: view
        ? `https://www.google.com/maps/search/${q}/@${view.lat},${view.lng},${view.zoom}z`
        : `https://www.google.com/maps/search/?api=1&query=${q}`,
    },
    {
      provider: "openstreetmap",
      href: `https://www.openstreetmap.org/search?query=${q}${view ? `#map=${view.zoom}/${view.lat}/${view.lng}` : ""}`,
    },
    { provider: "web_search", href: `https://www.google.com/search?q=${q}` },
  ];
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
