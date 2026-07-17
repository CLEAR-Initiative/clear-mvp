import type { GqlLocation } from "~/lib/types/graphql";
import { newnessCutoff } from "./last-seen";
import {
  computeAttentionScore,
  hasDraftAlert,
  hasPublishedAlert,
  isEscalatingSituation,
} from "./score";
import {
  SITUATION_SOFT_CAP,
  type AssembleSituationsOptions,
  type Situation,
  type SituationInputEvent,
  type SmartDestination,
} from "./types";

function blurbFromEvent(event: SituationInputEvent): string {
  const desc = event.description?.trim();
  if (desc) return desc.length > 160 ? `${desc.slice(0, 157)}…` : desc;
  const types = event.types?.filter(Boolean).join(", ");
  if (types) return types;
  return "Situation requiring attention";
}

function titleFromEvent(event: SituationInputEvent): string {
  const t = event.title?.trim();
  return t && t.length > 0 ? t : "Untitled situation";
}

function primaryLocation(event: SituationInputEvent): GqlLocation | null {
  return (
    event.representativePoint ??
    event.generalLocation ??
    event.originLocation ??
    event.destinationLocation ??
    null
  );
}

function pointCoords(loc: GqlLocation | null | undefined): { lng: number; lat: number } | null {
  if (!loc?.geometry || loc.geometry.type !== "Point") return null;
  const coords = loc.geometry.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  return { lng, lat };
}

function signalPointCoords(signal: NonNullable<SituationInputEvent["signals"]>[number]): {
  lng: number;
  lat: number;
} | null {
  return (
    pointCoords(signal.generalLocation) ??
    pointCoords(signal.originLocation) ??
    pointCoords(signal.destinationLocation)
  );
}

/**
 * Event representative point + each linked signal point for Overview heatmap.
 * Signals without geometry get a small deterministic offset around the event
 * so multi-signal situations still form a soft cluster (not a single pin).
 */
function heatPointsFromEvent(
  event: SituationInputEvent,
  eventPoint: { lng: number; lat: number } | null,
): Situation["heatPoints"] {
  const points: Situation["heatPoints"] = [];
  if (eventPoint) {
    points.push({ lng: eventPoint.lng, lat: eventPoint.lat, weight: 1 });
  }

  const signals = event.signals ?? [];
  signals.forEach((sig, i) => {
    const geo = signalPointCoords(sig);
    if (geo) {
      points.push({ lng: geo.lng, lat: geo.lat, weight: 0.65 });
      return;
    }
    if (!eventPoint) return;
    // Deterministic micro-cluster when signal has no point geometry.
    const a = ((i + 1) * 2.399) % (Math.PI * 2);
    const r = 0.18 + (i % 3) * 0.07;
    points.push({
      lng: eventPoint.lng + Math.cos(a) * r,
      lat: eventPoint.lat + Math.sin(a) * r,
      weight: 0.45,
    });
  });

  return points;
}

function matchesLocationScope(
  event: SituationInputEvent,
  locationId: string,
): boolean {
  const locs = [
    event.representativePoint,
    event.generalLocation,
    event.originLocation,
    event.destinationLocation,
  ];
  for (const loc of locs) {
    if (!loc) continue;
    if (loc.id === locationId) return true;
    if (loc.ancestorIds?.includes(locationId)) return true;
  }
  return false;
}

/**
 * Prefer a draft alert, else any published alert, else the event.
 * There is no dedicated `/alert/[id]` route today — both alert and event
 * destinations land on `/event/[eventId]` (Detection parity).
 */
export function smartDestination(situation: {
  eventId: string;
  alerts: Situation["alerts"];
}): SmartDestination {
  const draft = situation.alerts.find((a) => a.status === "draft");
  if (draft) {
    return {
      kind: "alert",
      alertId: draft.id,
      eventId: situation.eventId,
      href: `/event/${situation.eventId}`,
    };
  }
  const published = situation.alerts.find((a) => a.status === "published");
  if (published) {
    return {
      kind: "alert",
      alertId: published.id,
      eventId: situation.eventId,
      href: `/event/${situation.eventId}`,
    };
  }
  return {
    kind: "event",
    eventId: situation.eventId,
    href: `/event/${situation.eventId}`,
  };
}

export function eventToSituation(
  event: SituationInputEvent,
  opts: { lastSeenAt: string | null; now: Date },
): Situation {
  const cutoff = newnessCutoff(opts.lastSeenAt, opts.now);
  const lastSignalAt = event.lastSignalCreatedAt;
  const lastMs = Date.parse(lastSignalAt);
  const isNewSinceVisit = Number.isFinite(lastMs) && lastMs > cutoff.getTime();
  const draft = hasDraftAlert(event.alerts);
  const published = hasPublishedAlert(event.alerts);
  const escalating = isEscalatingSituation(event, opts.now);
  const severity = event.severity ?? 1;
  const loc = primaryLocation(event);
  const point =
    pointCoords(event.representativePoint ?? null) ??
    pointCoords(event.generalLocation) ??
    pointCoords(event.originLocation) ??
    pointCoords(event.destinationLocation);

  return {
    eventId: event.id,
    title: titleFromEvent(event),
    blurb: blurbFromEvent(event),
    severity,
    lastSignalAt,
    firstSignalAt: event.firstSignalCreatedAt,
    signalCount: event.signals?.length ?? 0,
    alerts: (event.alerts ?? []).map((a) => ({ id: a.id, status: a.status })),
    hasDraftAlert: draft,
    hasPublishedAlert: published,
    isEscalating: escalating,
    isNewSinceVisit,
    attentionScore: computeAttentionScore({
      severity,
      lastSignalAt,
      hasDraftAlert: draft,
      isEscalating: escalating,
      isNewSinceVisit,
      now: opts.now,
    }),
    locationId: loc?.id ?? null,
    lng: point?.lng ?? null,
    lat: point?.lat ?? null,
    heatPoints: heatPointsFromEvent(event, point),
  };
}

/**
 * Assemble, rank, and soft-cap situations from live events.
 * Orphan signals are never inputs — callers must pass events only.
 */
export function assembleSituations(options: AssembleSituationsOptions): Situation[] {
  const now = options.now ?? new Date();
  const softCap = options.softCap ?? SITUATION_SOFT_CAP;
  const locationId = options.locationId ?? null;

  let events = options.events;
  if (locationId) {
    events = events.filter((e) => matchesLocationScope(e, locationId));
  }

  const situations = events.map((e) =>
    eventToSituation(e, { lastSeenAt: options.lastSeenAt, now }),
  );

  situations.sort((a, b) => {
    if (b.attentionScore !== a.attentionScore) {
      return b.attentionScore - a.attentionScore;
    }
    // Tie-break: fresher last signal, then higher severity, then id
    const tb = Date.parse(b.lastSignalAt) - Date.parse(a.lastSignalAt);
    if (tb !== 0) return tb;
    if (b.severity !== a.severity) return b.severity - a.severity;
    return a.eventId.localeCompare(b.eventId);
  });

  return situations.slice(0, softCap);
}
