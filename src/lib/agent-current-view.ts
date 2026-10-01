/**
 * The Current view: what the user is looking at when they send a turn to the
 * CLEAR Agent — the page, the Event/Signal/Crisis on screen, and the active
 * map or detection filters — as identifiers and filters, never as data.
 *
 * Pages publish what they show with `useAgentCurrentView`; the Agent's
 * transport reads the latest at send time. The newest publisher wins, and a
 * page that unmounts withdraws what it published.
 */

import { useEffect } from "react";
import type { DetectionNavContext } from "~/lib/detection-nav-context";
import type { MapNavContext } from "~/lib/map-nav-context";

export type CurrentViewEntityKind = "event" | "signal" | "crisis";

export interface CurrentViewEntity {
  kind: CurrentViewEntityKind;
  id: string;
}

/** Filter values are what the Map and Detection nav contexts store. */
export type CurrentViewFilterValue = string | number | boolean | null | string[];

export interface CurrentView {
  /** The page path, e.g. `/event/abc`. */
  route: string;
  entity?: CurrentViewEntity;
  filters?: Record<string, CurrentViewFilterValue>;
}

export type PublishedView = Omit<CurrentView, "route">;

interface Entry {
  token: symbol;
  view: PublishedView;
}

// Module state: one browser tab, one Current view. A stack, so a drawer
// over a page hands the view back to the page when it closes.
let published: Entry[] = [];

export function publishCurrentView(view: PublishedView): () => void {
  const token = Symbol("current-view");
  published = [...published, { token, view }];
  return () => {
    published = published.filter((e) => e.token !== token);
  };
}

/**
 * The Current view for a turn sent now, from `pathname`. Entity and filters
 * each come from the newest publisher that has one, so an event preview
 * drawer over Detection reports the event within Detection's filters.
 */
export function currentViewFor(pathname: string): CurrentView {
  const newestFirst = [...published].reverse();
  const entity = newestFirst.find((e) => e.view.entity)?.view.entity;
  const filters = newestFirst.find((e) => e.view.filters)?.view.filters;
  return { route: pathname, ...(entity ? { entity } : {}), ...(filters ? { filters } : {}) };
}

/**
 * Publish what this component shows to the CLEAR Agent while it is mounted.
 * Pass `null` to publish nothing (e.g. while the entity is still loading).
 */
export function useAgentCurrentView(view: PublishedView | null): void {
  // Keyed by content, so a re-render with the same view doesn't churn.
  const key = view ? JSON.stringify(view) : null;
  useEffect(() => {
    if (!key) return;
    return publishCurrentView(JSON.parse(key) as PublishedView);
  }, [key]);
}

/** Test seam: forget everything published. */
export function resetCurrentViews(): void {
  published = [];
}

// ── Filters from the pages' nav contexts ──────────────────────────────────

/** List filters are capped: the Agent needs the scope, not a dump. */
const MAX_LIST = 50;

function compactFilters(
  entries: Record<string, CurrentViewFilterValue | undefined>,
): Record<string, CurrentViewFilterValue> {
  const out: Record<string, CurrentViewFilterValue> = {};
  for (const [key, value] of Object.entries(entries)) {
    if (value === undefined) continue; // unset; null stays (e.g. "all time")
    out[key] = Array.isArray(value) ? value.slice(0, MAX_LIST) : value;
  }
  return out;
}

/** The Map's filters, from the shape it already writes for detail prev/next. */
export function mapFiltersForAgent(ctx: MapNavContext): Record<string, CurrentViewFilterValue> {
  return compactFilters({
    teamId: ctx.teamId,
    locationId: ctx.locationId,
    country: ctx.country,
    region: ctx.region,
    from: ctx.from,
    to: ctx.to,
  });
}

/** Detection's filters, from the shape it already writes for detail prev/next. */
export function detectionFiltersForAgent(
  ctx: DetectionNavContext,
): Record<string, CurrentViewFilterValue> {
  return compactFilters({
    teamId: ctx.teamId,
    locationId: ctx.locationId,
    country: ctx.country,
    from: ctx.from,
    to: ctx.to,
    severityMin: ctx.severityMin,
    severityMax: ctx.severityMax,
    eventTypes: ctx.eventTypes,
    sourceNames: ctx.sourceNames,
    orderBy: ctx.orderBy,
  });
}
