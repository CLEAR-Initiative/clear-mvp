import { useMemo } from "react";
import { api } from "~/trpc/react";
import { useTeam } from "~/providers/team-provider";
import { useLocations } from "~/hooks/use-locations";
import {
  defaultMapNavTimeWindow,
  readDetectionNavEventIds,
  readDetectionNavSignalIds,
  resolveDetailNavIds,
  resolveDetectionNavContext,
} from "~/lib/detection-nav-context";
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
  /** Ordered ids for keyboard scrub / chevrons (Detection list when available). */
  orderedIds: string[];
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
 * Detection entry prefers the id list written by the Detection feed; map entry
 * uses the map events feed (with team + default 30d window).
 */
export function useEventNavigation(
  currentEventId: string,
  options?: DetailNavigationOptions,
): DetailNavigationResult<GqlEvent> {
  const listSource = options?.listSource ?? "detection";
  const fromMap = listSource === "map";
  const { activeTeamId } = useTeam();
  const { getLocationId } = useLocations();

  const navContext = useMemo(
    () => resolveDetectionNavContext(getLocationId, activeTeamId),
    [getLocationId, activeTeamId],
  );
  const hasLocationFilter = !!navContext.locationId;
  const mapWindow = useMemo(() => defaultMapNavTimeWindow(), []);

  // Same filtered/ordered page as Detection Events tab (capped at API max).
  // Do not query without locationId — that returns all countries and lets
  // arrow keys escape the active Detection country filter.
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
    { enabled: !fromMap && hasLocationFilter },
  );

  // Map feed — match map page defaults (team + 30d) so the opened pin is present.
  const mapQuery = api.alerts.eventsForMap.useQuery(
    {
      includeDummy: true,
      teamId: activeTeamId ?? undefined,
      from: mapWindow.from,
      to: mapWindow.to,
    },
    { enabled: fromMap, staleTime: 60_000 },
  );

  const items = useMemo(
    () => (fromMap ? (mapQuery.data?.events ?? []) : (detectionQuery.data?.items ?? [])),
    [fromMap, mapQuery.data?.events, detectionQuery.data?.items],
  );
  const queriedIds = useMemo(() => items.map((e) => e.id), [items]);
  const storedIds = useMemo(
    () => (fromMap ? null : readDetectionNavEventIds()),
    // Re-read when the committed event changes (after Detection wrote ids).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sessionStorage, not React state
    [fromMap, currentEventId],
  );
  const orderedIds = useMemo(
    () => resolveDetailNavIds(storedIds, queriedIds),
    [storedIds, queriedIds],
  );
  const nav = useMemo(
    () => getListNavigation(orderedIds, currentEventId),
    [orderedIds, currentEventId],
  );

  const hasStoredIds = !!storedIds && storedIds.length > 0;

  return {
    ...nav,
    orderedIds,
    isLoading: fromMap
      ? mapQuery.isLoading
      : hasStoredIds
        ? false
        : !hasLocationFilter || detectionQuery.isLoading,
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
 * Detection entry prefers the id list written by the Detection feed; map entry
 * uses the map signals feed (with team + default 30d window).
 */
export function useSignalNavigation(
  currentSignalId: string,
  options?: DetailNavigationOptions,
): DetailNavigationResult<GqlSignal> {
  const listSource = options?.listSource ?? "detection";
  const fromMap = listSource === "map";
  const { activeTeamId } = useTeam();
  const { getLocationId } = useLocations();

  const navContext = useMemo(
    () => resolveDetectionNavContext(getLocationId, activeTeamId),
    [getLocationId, activeTeamId],
  );
  const hasLocationFilter = !!navContext.locationId;
  const mapWindow = useMemo(() => defaultMapNavTimeWindow(), []);

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
    { enabled: !fromMap && hasLocationFilter },
  );

  const mapQuery = api.signals.forMap.useQuery(
    {
      includeDummy: true,
      teamId: activeTeamId ?? undefined,
      from: mapWindow.from,
      to: mapWindow.to,
    },
    { enabled: fromMap, staleTime: 60_000 },
  );

  const items = useMemo(
    () => (fromMap ? (mapQuery.data ?? []) : (detectionQuery.data?.items ?? [])),
    [fromMap, mapQuery.data, detectionQuery.data?.items],
  );
  const queriedIds = useMemo(() => items.map((s) => s.id), [items]);
  const storedIds = useMemo(
    () => (fromMap ? null : readDetectionNavSignalIds()),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sessionStorage, not React state
    [fromMap, currentSignalId],
  );
  const orderedIds = useMemo(
    () => resolveDetailNavIds(storedIds, queriedIds),
    [storedIds, queriedIds],
  );
  const nav = useMemo(
    () => getListNavigation(orderedIds, currentSignalId),
    [orderedIds, currentSignalId],
  );

  const hasStoredIds = !!storedIds && storedIds.length > 0;

  return {
    ...nav,
    orderedIds,
    isLoading: fromMap
      ? mapQuery.isLoading
      : hasStoredIds
        ? false
        : !hasLocationFilter || detectionQuery.isLoading,
    listItems: items,
  };
}
