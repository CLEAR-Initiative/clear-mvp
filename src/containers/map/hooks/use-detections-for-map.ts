import { useMemo } from "react";
import type { GqlAlert, GqlEvent, GqlLocation, GqlSignal } from "~/lib/types/graphql";
import { api } from "~/trpc/react";
import { locationPoint, signalPoint } from "../layers/detections/to-features";
import { placeLocationId } from "../place/model";
import type { DetectionKind, LngLatPoint } from "../selection";
import { useMapFilters } from "./use-map-filters";
import { useMapPlace } from "./use-map-place";
import { useTimeframeQuery } from "./use-timeframe";

/** A signal, event or alert as the map places it: what a stack list and Show on map need. */
export type MapDetection = {
  id: string;
  title: string | null;
  /** The 1-5 score; `mapSeverity` turns it into a bucket. */
  severity: number | null;
  /** When it happened: a signal's publication, an event's (or alert's event's) first signal. ISO string. */
  date: string;
  /** Where the map draws it, if it has a point. */
  point: LngLatPoint | null;
  /** The location its place name comes from. */
  location: GqlLocation | null;
  /** An alert's event, whose detail the alert shows. */
  eventId?: string;
};

type MapSignal = Pick<
  GqlSignal,
  "id" | "title" | "severity" | "publishedAt" | "generalLocation" | "originLocation" | "destinationLocation"
>;
type MapEvent = Pick<GqlEvent, "id" | "title" | "severity" | "firstSignalCreatedAt" | "representativePoint">;
type MapAlert = Pick<GqlAlert, "id" | "representativePoint"> & { event: MapEvent };

export function signalDetection(signal: MapSignal): MapDetection {
  return {
    id: signal.id,
    title: signal.title,
    severity: signal.severity,
    date: signal.publishedAt,
    point: signalPoint(signal),
    location: signal.generalLocation ?? signal.originLocation ?? signal.destinationLocation ?? null,
  };
}

export function eventDetection(event: MapEvent): MapDetection {
  const location = event.representativePoint ?? null;
  return {
    id: event.id,
    title: event.title,
    severity: event.severity,
    date: event.firstSignalCreatedAt,
    point: locationPoint(location),
    location,
  };
}

/** An alert reads as its event, under the alert's own id and point. */
export function alertDetection(alert: MapAlert): MapDetection {
  const location = alert.representativePoint ?? alert.event.representativePoint ?? null;
  return {
    ...eventDetection(alert.event),
    id: alert.id,
    point: locationPoint(location),
    location,
    eventId: alert.event.id,
  };
}

export function detectionsQueryInput(
  kind: DetectionKind,
  range: { from: string; to?: string },
  locationId: string | null,
  eventTypes?: string[],
) {
  const input = { ...range, includeDummy: true as const, ...(locationId ? { locationId } : {}) };
  if (kind === "signal") return input;
  const filtered = eventTypes?.length ? { ...input, eventTypes } : input;
  return kind === "alert" ? { ...filtered, status: "published" as const } : filtered;
}

/**
 * The detections of `kind` the map shows for the timeline's range. Only the query for `kind` runs; the
 * signals one shares its cache with the Map panel.
 */
export function useDetectionsForMap(kind: DetectionKind | null) {
  const range = useTimeframeQuery();
  const { status, place } = useMapPlace();
  const locationId = placeLocationId(place);
  const { eventTypes, held } = useMapFilters();
  const placeReady = status !== "loading";
  const filtersReady = !held;
  const signals = api.signals.forMap.useQuery(detectionsQueryInput("signal", range, locationId), {
    placeholderData: (prev) => prev,
    enabled: kind === "signal" && placeReady,
  });
  const events = api.alerts.eventsForMap.useQuery(detectionsQueryInput("event", range, locationId, eventTypes), {
    placeholderData: (prev) => prev,
    enabled: kind === "event" && placeReady && filtersReady,
  });
  const alerts = api.alerts.alertsForMap.useQuery(detectionsQueryInput("alert", range, locationId, eventTypes), {
    placeholderData: (prev) => prev,
    enabled: kind === "alert" && placeReady && filtersReady,
  });

  const query = kind ? { signal: signals, event: events, alert: alerts }[kind] : null;
  const data = useMemo(() => {
    if (kind === "signal") return signals.data?.map(signalDetection);
    if (kind === "event") return events.data?.events.map(eventDetection);
    if (kind === "alert") return alerts.data?.alerts.map(alertDetection);
    return undefined;
  }, [kind, signals.data, events.data, alerts.data]);

  return {
    data,
    isPending: query?.isPending ?? false,
    isError: query?.isError ?? false,
    error: query?.error ?? null,
    isPlaceholderData: query?.isPlaceholderData ?? false,
  };
}
