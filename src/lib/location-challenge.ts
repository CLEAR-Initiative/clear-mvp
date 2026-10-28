import { TEAM_ANALYST, isPlatformAdmin } from "~/lib/roles";

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
  const parts = [location, ...(location.ancestors ?? [])]
    .slice()
    .sort((a, b) => b.level - a.level)
    .map((l) => l.name.trim())
    .filter((name, i, all) => name.length > 0 && name !== all[i - 1]);
  return parts.length > 0 ? parts.join(", ") : null;
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
