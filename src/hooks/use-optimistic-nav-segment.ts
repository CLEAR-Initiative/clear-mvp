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

  return { displaySegment, setOptimisticSegment };
}
