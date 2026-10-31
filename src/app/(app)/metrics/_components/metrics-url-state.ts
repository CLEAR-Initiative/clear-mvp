"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GRANULARITIES, type Granularity, type MetricKey } from "~/lib/metric-series";
import type { MetricsFilterValues } from "./metrics-filters";

/**
 * The /metrics page's state as its URL carries it (Exponential #1279), so a
 * view can be shared, reloaded, or linked from a Notion metric row:
 * `?from=2026-10-25&to=2026-10-31&location=<id>&metric=DISTRICT_OR_FINER&granularity=day&lines=source&sources=sudan-war-x,dataminr`.
 * Components keep their own state, read it from the URL once on mount and
 * write every change back; the URL is never re-read while the page lives.
 */
export interface MetricsUrlState {
  /** `YYYY-MM-DD` or "" for clear-api's default range. */
  from: string;
  to: string;
  locationId: string | null;
  /** A registry key, or null for the section's default. */
  metric: MetricKey | null;
  granularity: Granularity | null;
  /** Lines per source on the explorer, or one summed line. */
  lines: "source" | "all" | null;
  /** The location-precision section's source picker. */
  sources: string[];
}

export const EMPTY_URL_STATE: MetricsUrlState = { from: "", to: "", locationId: null, metric: null, granularity: null, lines: null, sources: [] };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const KEY = /^[A-Z][A-Z0-9_]{0,63}$/;

/** The state a URL's search carries; anything malformed reads as unset. */
export function parseMetricsUrl(params: URLSearchParams): MetricsUrlState {
  // A calendar day that exists: the shape, then a round trip through Date.
  const date = (name: string) => {
    const value = params.get(name)?.trim() ?? "";
    if (!DATE.test(value)) return "";
    const at = new Date(`${value}T00:00:00Z`);
    return Number.isNaN(at.getTime()) || at.toISOString().slice(0, 10) !== value ? "" : value;
  };
  const metric = params.get("metric")?.trim() ?? "";
  const granularity = params.get("granularity")?.trim().toUpperCase() ?? "";
  const lines = params.get("lines")?.trim().toLowerCase() ?? "";
  const sources = [...new Set((params.get("sources") ?? "").split(",").map((s) => s.trim()).filter(Boolean))].slice(0, 50);
  return {
    from: date("from"),
    to: date("to"),
    locationId: params.get("location")?.trim() || null,
    metric: KEY.test(metric) ? metric : null,
    granularity: (GRANULARITIES as readonly string[]).includes(granularity) ? (granularity as Granularity) : null,
    lines: lines === "source" || lines === "all" ? lines : null,
    sources,
  };
}

/** `current` with `patch` applied: a set value writes its key, an empty one removes it. Returns the search string without `?`. */
export function metricsUrlSearch(patch: Partial<MetricsUrlState>, current: URLSearchParams = new URLSearchParams()): string {
  const next = new URLSearchParams(current.toString());
  const put = (name: string, value: string | null | undefined) => {
    if (value) next.set(name, value);
    else next.delete(name);
  };
  if ("from" in patch) put("from", patch.from);
  if ("to" in patch) put("to", patch.to);
  if ("locationId" in patch) put("location", patch.locationId);
  if ("metric" in patch) put("metric", patch.metric);
  if ("granularity" in patch) put("granularity", patch.granularity?.toLowerCase());
  if ("lines" in patch) put("lines", patch.lines);
  if ("sources" in patch) put("sources", patch.sources && patch.sources.length > 0 ? patch.sources.join(",") : null);
  return next.toString();
}

/** The page's filter values a URL state asks for. */
export function filtersFromUrl(state: MetricsUrlState): MetricsFilterValues {
  return { from: state.from, to: state.to, locationId: state.locationId };
}

/** The URL state on mount, and a way to write a patch of it back without a scroll or a history entry. */
export function useMetricsUrl(): { state: MetricsUrlState; update: (patch: Partial<MetricsUrlState>) => void } {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const state = useMemo(() => parseMetricsUrl(new URLSearchParams(params?.toString() ?? "")), [params]);
  const update = useCallback(
    (patch: Partial<MetricsUrlState>) => {
      const search = metricsUrlSearch(patch, new URLSearchParams(params?.toString() ?? ""));
      router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
    },
    [params, pathname, router],
  );
  return { state, update };
}
