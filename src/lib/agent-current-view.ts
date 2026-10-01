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

/** The Current view for a turn sent now, from `pathname`. */
export function currentViewFor(pathname: string): CurrentView {
  const top = published[published.length - 1]?.view;
  return { route: pathname, ...(top?.entity ? { entity: top.entity } : {}), ...(top?.filters ? { filters: top.filters } : {}) };
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
