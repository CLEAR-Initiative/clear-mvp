"use client";

import { api } from "~/trpc/react";
import { useOptionalTeam } from "~/providers/team-provider";
import { isPlatformAdmin } from "~/lib/roles";
import { canFileLocationChallenge, roleOnTeam } from "~/lib/location-challenge";

/**
 * Whether the reader may file a Location challenge, and the team it is filed
 * for: the active team, where they must be an analyst (or a platform admin).
 * Outside a TeamProvider (isolated tests) there is no team, so no filing.
 */
export function useLocationChallengeFiling() {
  const { data: authData } = api.auth.me.useQuery(undefined, { staleTime: 60_000 });
  const activeTeam = useOptionalTeam()?.activeTeam ?? null;
  const user = authData?.user;
  return {
    canFile: !!activeTeam && canFileLocationChallenge(user?.role, roleOnTeam(activeTeam, user?.id)),
    teamId: activeTeam?.id ?? null,
    teamLocations: activeTeam?.locations ?? null,
    /** A platform admin may place a Signal beyond the team's area. */
    canPlaceAnywhere: isPlatformAdmin(user?.role),
  };
}
