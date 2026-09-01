"use client";

import { useEffect, useState } from "react";

const DETAIL_SEGMENTS = new Set(["event", "signal", "crisis"]);

/** Settled highlight when no click optimism is pending. */
export function deriveSettledNavSegment(
  activeSegment: string,
  referrer?: string | null,
): string {
  const isDetailPage = DETAIL_SEGMENTS.has(activeSegment);
  return isDetailPage && referrer ? referrer : activeSegment;
}

/**
 * Frost overlay only while the settled route is `/map`.
 *
 * Do **not** key off click optimism toward Map — that turns the sidebar into
 * glass over the outgoing page (blurred Detection cards) before the Map
 * preloader paints (#504). Detail `?from=map` still highlights Map via
 * `deriveSettledNavSegment` but must stay in-flow (solid sidebar).
 *
 * While settled on `/map`, overlay stays on even if nav optimism points
 * elsewhere — dropping it early flex-resizes the Mapbox canvas (white flash).
 */
export function isMapNavOverlay(activeSegment: string): boolean {
  return activeSegment === "map";
}

/**
 * Optimistic nav selection: click wins immediately; clears when the real
 * route segment settles. Detail `from=` referrer applies only while idle.
 */
export function useOptimisticNavSegment(
  activeSegment: string,
  referrer?: string | null,
) {
  const [optimisticSegment, setOptimisticSegment] = useState<string | null>(null);

  useEffect(() => {
    setOptimisticSegment(null);
  }, [activeSegment]);

  const settledSegment = deriveSettledNavSegment(activeSegment, referrer);
  const displaySegment = optimisticSegment ?? settledSegment;

  return { displaySegment, optimisticSegment, setOptimisticSegment };
}
