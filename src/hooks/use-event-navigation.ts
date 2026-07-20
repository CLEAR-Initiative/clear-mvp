import { useMemo } from "react";
import { api } from "~/trpc/react";
import { useTeam } from "~/providers/team-provider";
import { useLocations } from "~/hooks/use-locations";
import { readDetectionNavContext, getDefaultDetectionNavContext } from "~/lib/detection-nav-context";
import { getListNavigation } from "~/lib/detail-list-nav";
import type { GqlEvent, GqlLocation, GqlSignal } from "~/lib/types/graphql";

/**
 * Extract first point location from event for map centering.
 * Mirrors eventsToMarkers: representativePoint → event Points → signal Points.
 */
export function getEventMapCenter(event: GqlEvent | null | undefined): [number, number] | null {
  if (!event) return null;

  const tryPoint = (loc: GqlLocation | null | undefined): [number, number] | null => {
    if (!loc?.geometry || loc.geometry.type !== "Point") return null;
    const coords = loc.geometry.coordinates as [number, number] | undefined;
    return coords ?? null;
  };

  const fromRep = tryPoint(event.representativePoint ?? null);
  if (fromRep) return fromRep;

  for (const loc of [event.originLocation, event.destinationLocation, event.generalLocation]) {
    const hit = tryPoint(loc);
    if (hit) return hit;
  }

  for (const signal of event.signals ?? []) {
    for (const loc of [signal.originLocation, signal.destinationLocation, signal.generalLocation]) {
      const hit = tryPoint(loc);
      if (hit) return hit;
    }
  }

  return null;
}

export interface DetailNavigationResult<TItem = GqlEvent> {
  prevId: string | null;
  nextId: string | null;
  hasPrev: boolean;
  hasNext: boolean;
  position: string; // e.g. "3 / 47"
  currentIndex: number;
  totalCount: number;
  isLoading: boolean;
  listItems: TItem[];
}

/** @deprecated Use DetailNavigationResult */
export type EventNavigationResult = DetailNavigationResult<GqlEvent>;

/**
 * Hook for event prev/next navigation using Detection list order.
 * Reads filter context from sessionStorage (written by detection page).
 */
export function useEventNavigation(currentEventId: string): DetailNavigationResult<GqlEvent> {
  const { activeTeamId } = useTeam();
  const { getLocationId } = useLocations();

  const navContext = useMemo(() => {
    const stored = readDetectionNavContext();
    return stored ?? getDefaultDetectionNavContext(getLocationId, activeTeamId);
  }, [getLocationId, activeTeamId]);

  // Same filtered/ordered page as Detection Events tab (capped at API max).
  const eventsQuery = api.alerts.eventsPage.useQuery({
    teamId: navContext.teamId ?? undefined,
    locationId: navContext.locationId ?? undefined,
    from: navContext.from,
    to: navContext.to,
    severityMin: navContext.severityMin,
    severityMax: navContext.severityMax,
    eventTypes: navContext.eventTypes,
    orderBy: navContext.orderBy,
    limit: 500,
    offset: 0,
  });

  const items = eventsQuery.data?.items ?? [];
  const ids = useMemo(() => items.map((e) => e.id), [items]);
  const nav = useMemo(
    () => getListNavigation(ids, currentEventId),
    [ids, currentEventId],
  );

  return {
    ...nav,
    isLoading: eventsQuery.isLoading,
    listItems: items,
  };
}

/**
 * Extract first point location from signal for map centering.
 */
export function getSignalMapCenter(signal: GqlSignal | null | undefined): [number, number] | null {
  if (!signal) return null;

  const locations: GqlLocation[] = [];
  if (signal.generalLocation) locations.push(signal.generalLocation);
  if (signal.originLocation) locations.push(signal.originLocation);
  if (signal.destinationLocation) locations.push(signal.destinationLocation);

  for (const loc of locations) {
    const geom = loc.geometry;
    if (geom?.type === "Point") {
      const coords = geom.coordinates as [number, number] | undefined;
      if (coords) return coords;
    }
  }

  return null;
}

/**
 * Hook for signal prev/next navigation using Detection signals list order.
 * Reads filter context from sessionStorage (written by detection page).
 */
export function useSignalNavigation(currentSignalId: string): DetailNavigationResult<GqlSignal> {
  const { activeTeamId } = useTeam();
  const { getLocationId } = useLocations();

  const navContext = useMemo(() => {
    const stored = readDetectionNavContext();
    return stored ?? getDefaultDetectionNavContext(getLocationId, activeTeamId);
  }, [getLocationId, activeTeamId]);

  const signalsQuery = api.signals.signalsPage.useQuery({
    teamId: navContext.teamId ?? undefined,
    locationId: navContext.locationId ?? undefined,
    from: navContext.from,
    to: navContext.to,
    severityMin: navContext.severityMin,
    severityMax: navContext.severityMax,
    sourceNames: navContext.sourceNames,
    orderBy: navContext.signalOrderBy ?? "PUBLISHED_DESC",
    limit: 500,
    offset: 0,
  });

  const items = signalsQuery.data?.items ?? [];
  const ids = useMemo(() => items.map((s) => s.id), [items]);
  const nav = useMemo(
    () => getListNavigation(ids, currentSignalId),
    [ids, currentSignalId],
  );

  return {
    ...nav,
    isLoading: signalsQuery.isLoading,
    listItems: items,
  };
}
