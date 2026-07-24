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

/** Which ordered list powers detail prev/next. */
export type DetailListSource = "detection" | "map";

export interface DetailNavigationOptions {
  /**
   * `detection` (default): Detection Events/Signals tab order + session filters.
   * `map`: map feed (`eventsForMap` / `signals.forMap`) so map → detail arrows work
   * even when the entity is outside the Detection filter window.
   */
  listSource?: DetailListSource;
}

/**
 * Hook for event prev/next navigation.
 * Detection entry uses Detection list order; map entry uses the map events feed.
 */
export function useEventNavigation(
  currentEventId: string,
  options?: DetailNavigationOptions,
): DetailNavigationResult<GqlEvent> {
  const listSource = options?.listSource ?? "detection";
  const fromMap = listSource === "map";
  const { activeTeamId } = useTeam();
  const { getLocationId } = useLocations();

  const navContext = useMemo(() => {
    const stored = readDetectionNavContext();
    return stored ?? getDefaultDetectionNavContext(getLocationId, activeTeamId);
  }, [getLocationId, activeTeamId]);

  // Same filtered/ordered page as Detection Events tab (capped at API max).
  const detectionQuery = api.alerts.eventsPage.useQuery(
    {
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
    },
    { enabled: !fromMap },
  );

  // Map feed — no Detection location/severity filters so the opened pin is present.
  const mapQuery = api.alerts.eventsForMap.useQuery(
    { includeDummy: true },
    { enabled: fromMap, staleTime: 60_000 },
  );

  const items = useMemo(
    () => (fromMap ? (mapQuery.data?.events ?? []) : (detectionQuery.data?.items ?? [])),
    [fromMap, mapQuery.data?.events, detectionQuery.data?.items],
  );
  const ids = useMemo(() => items.map((e) => e.id), [items]);
  const nav = useMemo(
    () => getListNavigation(ids, currentEventId),
    [ids, currentEventId],
  );

  return {
    ...nav,
    isLoading: fromMap ? mapQuery.isLoading : detectionQuery.isLoading,
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
 * Hook for signal prev/next navigation.
 * Detection entry uses Detection list order; map entry uses the map signals feed.
 */
export function useSignalNavigation(
  currentSignalId: string,
  options?: DetailNavigationOptions,
): DetailNavigationResult<GqlSignal> {
  const listSource = options?.listSource ?? "detection";
  const fromMap = listSource === "map";
  const { activeTeamId } = useTeam();
  const { getLocationId } = useLocations();

  const navContext = useMemo(() => {
    const stored = readDetectionNavContext();
    return stored ?? getDefaultDetectionNavContext(getLocationId, activeTeamId);
  }, [getLocationId, activeTeamId]);

  const detectionQuery = api.signals.signalsPage.useQuery(
    {
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
    },
    { enabled: !fromMap },
  );

  const mapQuery = api.signals.forMap.useQuery(
    { includeDummy: true },
    { enabled: fromMap, staleTime: 60_000 },
  );

  const items = useMemo(
    () => (fromMap ? (mapQuery.data ?? []) : (detectionQuery.data?.items ?? [])),
    [fromMap, mapQuery.data, detectionQuery.data?.items],
  );
  const ids = useMemo(() => items.map((s) => s.id), [items]);
  const nav = useMemo(
    () => getListNavigation(ids, currentSignalId),
    [ids, currentSignalId],
  );

  return {
    ...nav,
    isLoading: fromMap ? mapQuery.isLoading : detectionQuery.isLoading,
    listItems: items,
  };
}
