import { TEAM_ANALYST, isPlatformAdmin, isTeamAdmin } from "~/lib/roles";
import type { GqlLocation } from "~/lib/types/graphql";

/**
 * Location challenges on Signals (Exponential #836): an analyst files one for
 * the active team, optionally with a corrected point, and that team's admin
 * accepts it, places a different point, or declines it. These are optimistic
 * UI gates; clear-api enforces the real rules (team role, the Signal and the
 * place within the team's area).
 */

/** The admin area a point falls in, with its ancestors (clear-api
 *  `locationPlacement`). */
export interface PlacedLocation {
  id: string;
  name: string;
  level: number;
  ancestors: { id: string; name: string; level: number }[];
}

/** The user's role on `team`, or null. */
export function roleOnTeam(
  team: { members?: { user: { id: string }; role: string }[] } | null | undefined,
  userId: string | null | undefined,
): string | null {
  if (!team || !userId) return null;
  return team.members?.find((m) => m.user.id === userId)?.role ?? null;
}

/** Whether to offer "Challenge location": a platform admin, or an analyst on
 *  the active team. */
export function canFileLocationChallenge(
  globalRole: string | null | undefined,
  activeTeamRole: string | null | undefined,
): boolean {
  return isPlatformAdmin(globalRole) || activeTeamRole === TEAM_ANALYST;
}

/** Whether the reader decides Location challenges in the Inbox: a platform
 *  admin, or a team admin (clear-api lists only their teams' challenges,
 *  their own included). */
export function canDecideLocationChallenges(
  globalRole: string | null | undefined,
  teamMemberships: { role: string }[] | null | undefined,
): boolean {
  return isPlatformAdmin(globalRole) || isTeamAdmin(teamMemberships);
}

/**
 * Whether a place (the admin area a point falls in, with its ancestors) is in
 * the team's area: one of the team's locations or anything under them. A team
 * with no locations is global monitoring and covers every place. Placing a
 * Signal beyond the team's area is for a platform admin.
 */
export function placementInTeamArea(
  placement: { id: string; ancestors?: { id: string }[] | null } | null | undefined,
  teamLocations: { id: string }[] | null | undefined,
): boolean {
  if (!placement) return false;
  if (!teamLocations || teamLocations.length === 0) return true;
  const area = new Set(teamLocations.map((l) => l.id));
  return [placement, ...(placement.ancestors ?? [])].some((l) => area.has(l.id));
}

type ChainLocation = {
  name: string;
  level: number;
  ancestors?: { name: string; level: number }[] | null;
};

/**
 * A location and its ancestors, most specific first, as readable text:
 * "Nyala, South Darfur, Sudan". Duplicate names in a row (a district named
 * like its state) are shown once.
 */
export function locationChain(location: ChainLocation | null | undefined): string | null {
  if (!location) return null;
  return chainText([location, ...(location.ancestors ?? [])]);
}

function chainText(locations: { name: string; level: number }[]): string | null {
  const parts = locations
    .slice()
    .sort((a, b) => b.level - a.level)
    .map((l) => l.name.trim())
    .filter((name, i, all) => name.length > 0 && name !== all[i - 1]);
  return parts.length > 0 ? parts.join(", ") : null;
}

/**
 * Where a Signal's location is, as readable text. A point's own name shows
 * only when the geoparser named it (landmark-geocoded); otherwise it is
 * usually the Signal's title, so the chain starts at its district. The same
 * rule as `resolveLocationName`.
 */
export function signalPlaceLabel(location: GqlLocation | null | undefined): string | null {
  if (!location) return null;
  const ownName = location.pointType === "landmark-geocoded" || location.level <= 2;
  return chainText([
    ...(ownName ? [location] : []),
    ...(location.ancestors ?? []).filter((a) => a.level <= 2),
  ]);
}

type SignalLocations = {
  generalLocation: GqlLocation | null;
  originLocation: GqlLocation | null;
  destinationLocation: GqlLocation | null;
};

/** The location a Signal is pinned at: its general location, else its origin
 *  or destination (the order the Signal page reads them in). */
export function signalLocationOf(signal: SignalLocations): GqlLocation | null {
  return signal.generalLocation ?? signal.originLocation ?? signal.destinationLocation ?? null;
}

/** The Signal's pin: the first of its locations that is a point, or null
 *  when it is placed on an area only. */
export function signalPin(signal: SignalLocations): { lat: number; lng: number } | null {
  for (const location of [signal.generalLocation, signal.originLocation, signal.destinationLocation]) {
    const geometry = location?.geometry;
    if (geometry?.type !== "Point" || !Array.isArray(geometry.coordinates)) continue;
    const [lng, lat] = geometry.coordinates as number[];
    if (typeof lat === "number" && typeof lng === "number") return { lat, lng };
  }
  return null;
}

/** The place's own name from a geocoder label ("Haya, Red Sea, Sudan" -> "Haya"). */
export function placeNameFromLabel(label: string): string {
  return label.split(",")[0]?.trim() || label.trim();
}

/** Whether typed coordinates moved off the source pin. The fields start at
 *  the source pin, so unchanged ones are no correction. */
export function movedFromSource(
  lat: number,
  lng: number,
  sourceLat: number | null | undefined,
  sourceLng: number | null | undefined,
): boolean {
  if (sourceLat == null || sourceLng == null) return true;
  return Math.abs(lat - sourceLat) > 1e-7 || Math.abs(lng - sourceLng) > 1e-7;
}

export type ChallengeErrorKey =
  | "errors.forbidden"
  | "errors.outsideCoverage"
  | "errors.conflict"
  | "errors.submitFailed";

/** The `locationChallenge` message for a failed filing, by the tRPC code
 *  clear-api's error mapped to. */
export function challengeErrorKey(code: string | null | undefined): ChallengeErrorKey {
  switch (code) {
    case "FORBIDDEN":
      return "errors.forbidden";
    case "BAD_REQUEST":
      return "errors.outsideCoverage";
    case "CONFLICT":
      return "errors.conflict";
    default:
      return "errors.submitFailed";
  }
}

/** How a decider decides a Location challenge (clear-api
 *  `SignalLocationChallengeDecision`). */
export const LOCATION_CHALLENGE_DECISIONS = ["ACCEPT", "CORRECT", "DECLINE"] as const;
export type LocationChallengeDecision = (typeof LOCATION_CHALLENGE_DECISIONS)[number];

export type DecisionErrorKey =
  | "location.errors.forbidden"
  | "location.errors.outsideCoverage"
  | "location.errors.conflict"
  | "location.errors.failed";

/** The `inbox` message for a failed decision, by the tRPC code clear-api's
 *  error mapped to. CONFLICT: decided already, or replaced by a newer
 *  challenge. NOT_FOUND: gone, the same to the decider. */
export function decisionErrorKey(code: string | null | undefined): DecisionErrorKey {
  switch (code) {
    case "FORBIDDEN":
      return "location.errors.forbidden";
    case "BAD_REQUEST":
      return "location.errors.outsideCoverage";
    case "CONFLICT":
    case "NOT_FOUND":
      return "location.errors.conflict";
    default:
      return "location.errors.failed";
  }
}
