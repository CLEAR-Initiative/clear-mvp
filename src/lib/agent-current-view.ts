/**
 * The Current view: what the user is looking at when they send a turn to the
 * CLEAR Agent — the page, the Event/Signal/Crisis on screen, and the active
 * map or detection filters — as identifiers and filters, never as data.
 *
 * Pages publish what they show with `useAgentCurrentView`; the Agent's
 * transport reads the latest at send time. The newest publisher wins, and a
 * page that unmounts withdraws what it published.
 */

import { useEffect, useRef, useSyncExternalStore } from "react";
import {
  CURRENT_VIEW_MAX_LIST,
  type CurrentViewEntityKind,
  type CurrentViewFilterKey,
  type CurrentViewFilters,
  type CurrentViewFilterValue,
} from "~/lib/agent-current-view-contract";
import type { DetectionNavContext } from "~/lib/detection-nav-context";
import type { MapNavContext } from "~/lib/map-nav-context";

export type { CurrentViewEntityKind, CurrentViewFilterValue } from "~/lib/agent-current-view-contract";

export interface CurrentViewEntity {
  kind: CurrentViewEntityKind;
  id: string;
}

export interface CurrentView {
  /** The page path, e.g. `/event/abc`. */
  route: string;
  entity?: CurrentViewEntity;
  /** The user's active team, which the pages scope to. */
  teamId?: string;
  filters?: CurrentViewFilters;
}

/** An entity with its display name, which stays on screen and is never sent with a turn. */
export interface LabelledEntity extends CurrentViewEntity {
  label?: string;
}

/** What a page publishes: the Current view's parts, the entity with its name. */
export interface PublishedView {
  entity?: LabelledEntity;
  filters?: CurrentViewFilters;
}

/** The Current view as the Agent drawer shows it: with the entity's name. */
export interface DisplayedCurrentView extends Omit<CurrentView, "teamId"> {
  entity?: LabelledEntity;
}

/** The app section a route belongs to: its first path segment (`/map/x` → `map`). */
export function sectionOf(route: string): string {
  return route.split("/")[1] ?? "";
}

/** Filter keys that narrow what is shown: the team is its own scope, and the sort isn't a filter. */
export type NarrowingFilterKey = Exclude<CurrentViewFilterKey, "teamId" | "orderBy">;

/** The filters that narrow what is shown, leaving out "any" (null or empty). */
export function narrowingFilters(
  filters: CurrentViewFilters | undefined,
): Array<[NarrowingFilterKey, CurrentViewFilterValue]> {
  return Object.entries(filters ?? {}).filter(
    (entry): entry is [NarrowingFilterKey, CurrentViewFilterValue] => {
      const [key, value] = entry;
      if (key === "teamId" || key === "orderBy") return false;
      if (value === null || value === undefined || value === "") return false;
      return !Array.isArray(value) || value.length > 0;
    },
  );
}

interface Entry {
  token: symbol;
  view: PublishedView;
}

// Module state: one browser tab, one Current view. A stack, so a drawer
// over a page hands the view back to the page when it closes.
let published: Entry[] = [];
const listeners = new Set<() => void>();

function setPublished(next: Entry[]): void {
  published = next;
  for (const listener of listeners) listener();
}

function publish(view: PublishedView): symbol {
  const token = Symbol("current-view");
  setPublished([...published, { token, view }]);
  return token;
}

function withdraw(token: symbol): void {
  setPublished(published.filter((e) => e.token !== token));
}

/** Rename a published entity where it stands: a new title never moves it up the stack. */
function relabel(token: symbol, label: string | undefined): void {
  const index = published.findIndex((e) => e.token === token);
  const entity = published[index]?.view.entity;
  if (!entity || entity.label === label) return;
  const next = [...published];
  next[index] = { token, view: { ...published[index]!.view, entity: withLabel(entity, label) } };
  setPublished(next);
}

function withLabel(entity: CurrentViewEntity, label: string | undefined): LabelledEntity {
  return label === undefined ? { kind: entity.kind, id: entity.id } : { kind: entity.kind, id: entity.id, label };
}

export function publishCurrentView(view: PublishedView): () => void {
  const token = publish(view);
  return () => withdraw(token);
}

/** The newest published entity and filters, each from whoever has one. */
function newest(): PublishedView {
  const newestFirst = [...published].reverse();
  const entity = newestFirst.find((e) => e.view.entity)?.view.entity;
  const filters = newestFirst.find((e) => e.view.filters)?.view.filters;
  return { ...(entity ? { entity } : {}), ...(filters ? { filters } : {}) };
}

/**
 * The Current view for a turn sent now, from `pathname`. Entity and filters
 * each come from the newest publisher that has one, so an event preview
 * drawer over Detection reports the event within Detection's filters.
 */
export function currentViewFor(pathname: string, teamId?: string | null): CurrentView {
  const { entity, filters } = newest();
  return {
    route: pathname,
    // Identifiers only: the display name stays on screen.
    ...(entity ? { entity: { kind: entity.kind, id: entity.id } } : {}),
    ...(teamId ? { teamId } : {}),
    ...(filters ? { filters } : {}),
  };
}

/** The Current view as the Agent drawer shows it, entity names included. */
export function displayedCurrentView(pathname: string): DisplayedCurrentView {
  return { route: pathname, ...newest() };
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
const snapshot = () => published;

/** The Current view as shown, re-rendering whenever a page publishes or withdraws. */
export function useDisplayedCurrentView(pathname: string): DisplayedCurrentView {
  // Subscribing to the stack itself: a new array on every change.
  useSyncExternalStore(subscribe, snapshot, snapshot);
  return displayedCurrentView(pathname);
}

/**
 * Publish what this component shows to the CLEAR Agent while it is mounted.
 * Pass `null` to publish nothing (e.g. while the entity is still loading).
 */
export function useAgentCurrentView(view: PublishedView | null): void {
  // Keyed by content, so a re-render with the same view doesn't churn — and
  // without the entity's name: a renamed entity is relabelled in place, never
  // re-published on top of a drawer opened after it.
  const label = view?.entity?.label;
  const key = view ? JSON.stringify(view.entity ? { ...view, entity: withLabel(view.entity, undefined) } : view) : null;
  const labelRef = useRef(label);
  labelRef.current = label;
  const token = useRef<symbol | null>(null);
  useEffect(() => {
    if (!key) return;
    const parsed = JSON.parse(key) as PublishedView;
    const own = publish(parsed.entity ? { ...parsed, entity: withLabel(parsed.entity, labelRef.current) } : parsed);
    token.current = own;
    return () => {
      token.current = null;
      withdraw(own);
    };
  }, [key]);
  useEffect(() => {
    if (token.current) relabel(token.current, label);
  }, [label]);
}

/** Test seam: forget everything published. */
export function resetCurrentViews(): void {
  setPublished([]);
}

// ── Filters from the pages' nav contexts ──────────────────────────────────

/** Keys come from the shared contract, so the route accepts every one. */
function compactFilters(entries: Partial<Record<CurrentViewFilterKey, CurrentViewFilterValue | undefined>>): CurrentViewFilters {
  const out: CurrentViewFilters = {};
  for (const [key, value] of Object.entries(entries) as Array<[CurrentViewFilterKey, CurrentViewFilterValue | undefined]>) {
    if (value === undefined) continue; // unset; null stays (e.g. "all time")
    out[key] = Array.isArray(value) ? value.slice(0, CURRENT_VIEW_MAX_LIST) : value;
  }
  return out;
}

/** The Map's filters, from the shape it already writes for detail prev/next. */
export function mapFiltersForAgent(ctx: MapNavContext): CurrentViewFilters {
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
export function detectionFiltersForAgent(ctx: DetectionNavContext): CurrentViewFilters {
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
