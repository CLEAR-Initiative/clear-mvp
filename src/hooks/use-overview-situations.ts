"use client";

import { useEffect, useMemo, useRef } from "react";
import { api } from "~/trpc/react";
import { useTeam } from "~/providers/team-provider";
import { useLocations } from "~/hooks/use-locations";
import type { GqlAlert, GqlEvent } from "~/lib/types/graphql";
import {
  assembleSituations,
  readOverviewLastSeen,
  writeOverviewLastSeen,
  SITUATION_SOFT_CAP,
  type Situation,
} from "~/lib/situations";

export interface OverviewSituationsResult {
  situations: Situation[];
  /** Pre-cap escalating count for strip chips. */
  escalatingCount: number;
  draftCount: number;
  newCount: number;
  /** Country-scoped events for Overview quick stats (trend). */
  events: GqlEvent[];
  /** Country-scoped alerts for Overview quick stats (trend / coverage). */
  alerts: GqlAlert[];
  isLoading: boolean;
  locationId: string | null;
}

/**
 * Shared Overview situations feed: country-scoped events → ranked queue.
 * Captures last-seen once per mount for “new” scoring, then stamps this visit.
 */
export function useOverviewSituations(selectedCountry: string): OverviewSituationsResult {
  const { activeTeamId } = useTeam();
  const { getLocationId } = useLocations();
  const locationId = useMemo(
    () => getLocationId(selectedCountry),
    [getLocationId, selectedCountry],
  );

  const lastSeenRef = useRef<string | null | undefined>(undefined);
  if (lastSeenRef.current === undefined) {
    lastSeenRef.current = readOverviewLastSeen();
  }
  useEffect(() => {
    writeOverviewLastSeen();
  }, []);

  const eventsQuery = api.alerts.eventsForOverview.useQuery(
    {
      teamId: activeTeamId,
      locationId: locationId ?? undefined,
      includeDummy: true,
      orderBy: "LAST_SIGNAL_DESC",
      limit: 100,
      offset: 0,
    },
    {
      enabled: !!locationId,
      placeholderData: (prev) => prev,
      staleTime: 60_000,
    },
  );

  const alertsQuery = api.alerts.alertsPage.useQuery(
    {
      teamId: activeTeamId,
      locationId: locationId ?? undefined,
      includeDummy: true,
      orderBy: "CREATED_DESC",
      limit: 100,
      offset: 0,
    },
    {
      enabled: !!locationId,
      placeholderData: (prev) => prev,
      staleTime: 60_000,
    },
  );

  const { situations, escalatingCount, draftCount, newCount } = useMemo(() => {
    const items = eventsQuery.data?.items ?? [];
    const lastSeenAt = lastSeenRef.current ?? null;
    // One assemble pass (uncapped for chip counts), then soft-cap for the queue.
    const all = assembleSituations({
      events: items,
      lastSeenAt,
      locationId: null,
      softCap: Math.max(items.length, 1),
    });
    return {
      situations: all.slice(0, SITUATION_SOFT_CAP),
      escalatingCount: all.filter((s) => s.isEscalating).length,
      draftCount: all.filter((s) => s.hasDraftAlert).length,
      newCount: all.filter((s) => s.isNewSinceVisit).length,
    };
  }, [eventsQuery.data?.items]);

  return {
    situations,
    escalatingCount,
    draftCount,
    newCount,
    events: eventsQuery.data?.items ?? [],
    alerts: alertsQuery.data?.items ?? [],
    isLoading: !locationId || eventsQuery.isLoading,
    locationId,
  };
}
