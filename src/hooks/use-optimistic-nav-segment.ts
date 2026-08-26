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
 * Frost overlay only while actually on `/map`, or while a click is
 * optimistically heading there. Detail pages with `?from=map` still highlight
 * the Map tab via `deriveSettledNavSegment`, but must stay in-flow (solid
 * sidebar) so content does not mount under the glass.
 *
 * While still settled on `/map`, overlay stays on even if optimism points
 * elsewhere — dropping it early flex-resizes the Mapbox canvas (white flash).
 */
export function isMapNavOverlay(
  activeSegment: string,
  optimisticSegment: string | null,
): boolean {
  return activeSegment === "map" || optimisticSegment === "map";
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
