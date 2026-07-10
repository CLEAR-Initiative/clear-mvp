import { useMemo } from "react";
import { api } from "~/trpc/react";
import { useTeam } from "~/providers/team-provider";
import { useLocations } from "~/hooks/use-locations";
import { readDetectionNavContext, getDefaultDetectionNavContext } from "~/lib/detection-nav-context";
import type { GqlEvent, GqlLocation, GqlSignal } from "~/lib/types/graphql";

/**
 * Extract first point location from event for map centering.
 * Mirrors eventsToMarkers logic from map-markers-data.ts
 */
export function getEventMapCenter(event: GqlEvent | null | undefined): [number, number] | null {
  if (!event) return null;
  
  const locations: GqlLocation[] = [];
  if (event.generalLocation) locations.push(event.generalLocation);
  if (event.originLocation) locations.push(event.originLocation);
  if (event.destinationLocation) locations.push(event.destinationLocation);

  // Prefer event-level Point locations
  for (const loc of locations) {
    const geom = loc.geometry;
    if (geom?.type === "Point") {
      const coords = geom.coordinates as [number, number] | undefined;
      if (coords) return coords;
    }
  }

  // Fallback to signal locations if event has no points
  for (const signal of event.signals ?? []) {
    const signalLocs = [signal.generalLocation, signal.originLocation, signal.destinationLocation];
    for (const loc of signalLocs) {
      if (!loc) continue;
      const geom = loc.geometry;
      if (geom?.type === "Point") {
        const coords = geom.coordinates as [number, number] | undefined;
        if (coords) return coords;
      }
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

  // Read detection filter context or use defaults
  const navContext = useMemo(() => {
    const stored = readDetectionNavContext();
    return stored ?? getDefaultDetectionNavContext(getLocationId, activeTeamId);
  }, [getLocationId, activeTeamId]);

  // Query events with detection filters, limited to 500 (API max)
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

  const currentIndex = useMemo(() => {
    const items = eventsQuery.data?.items ?? [];
    return items.findIndex((e) => e.id === currentEventId);
  }, [eventsQuery.data, currentEventId]);

  const prevId = useMemo(() => {
    if (currentIndex <= 0) return null;
    const items = eventsQuery.data?.items ?? [];
    return items[currentIndex - 1]?.id ?? null;
  }, [currentIndex, eventsQuery.data]);

  const nextId = useMemo(() => {
    const items = eventsQuery.data?.items ?? [];
    if (currentIndex < 0 || currentIndex >= items.length - 1) return null;
    return items[currentIndex + 1]?.id ?? null;
  }, [currentIndex, eventsQuery.data]);

  const totalCount = eventsQuery.data?.totalCount ?? 0;

  return {
    prevId,
    nextId,
    hasPrev: currentIndex > 0,
    hasNext: currentIndex >= 0 && currentIndex < (eventsQuery.data?.items.length ?? 0) - 1,
    position: currentIndex >= 0 ? `${currentIndex + 1} / ${totalCount}` : "—",
    currentIndex,
    totalCount,
    isLoading: eventsQuery.isLoading,
    listItems: eventsQuery.data?.items ?? [],
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

  // Read detection filter context or use defaults
  const navContext = useMemo(() => {
    const stored = readDetectionNavContext();
    return stored ?? getDefaultDetectionNavContext(getLocationId, activeTeamId);
  }, [getLocationId, activeTeamId]);

  // Query signals with detection filters, limited to 500 (API max)
  const signalsQuery = api.alerts.signalsPage.useQuery({
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

  const currentIndex = useMemo(() => {
    const items = signalsQuery.data?.items ?? [];
    return items.findIndex((s) => s.id === currentSignalId);
  }, [signalsQuery.data, currentSignalId]);

  const prevId = useMemo(() => {
    if (currentIndex <= 0) return null;
    const items = signalsQuery.data?.items ?? [];
    return items[currentIndex - 1]?.id ?? null;
  }, [currentIndex, signalsQuery.data]);

  const nextId = useMemo(() => {
    const items = signalsQuery.data?.items ?? [];
    if (currentIndex < 0 || currentIndex >= items.length - 1) return null;
    return items[currentIndex + 1]?.id ?? null;
  }, [currentIndex, signalsQuery.data]);

  const totalCount = signalsQuery.data?.totalCount ?? 0;

  return {
    prevId,
    nextId,
    hasPrev: currentIndex > 0,
    hasNext: currentIndex >= 0 && currentIndex < (signalsQuery.data?.items.length ?? 0) - 1,
    position: currentIndex >= 0 ? `${currentIndex + 1} / ${totalCount}` : "—",
    currentIndex,
    totalCount,
    isLoading: signalsQuery.isLoading,
    listItems: signalsQuery.data?.items ?? [],
  };
}
