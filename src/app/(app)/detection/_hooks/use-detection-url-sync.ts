"use client";

import { useEffect, useRef } from "react";
import { DETECTION_DEEP_LINK_PARAMS } from "~/lib/agent-deep-link";
import { DEFAULT_DATE, SEVERITIES, dateKeyOf, dateOfKey } from "../_lib/detection-model";
import type { DetectionFilters } from "./use-detection-filters";

/** Query keys the map-first page writes: places, date, severities, types, sources. */
export const URL_KEYS = ["r", "d", "s", "t", "src"] as const;

/** The filters as query params; defaults are left out. */
export function filtersToParams(f: {
  locIds: readonly string[];
  date: string;
  severities: ReadonlySet<string>;
  typeFilters: readonly string[];
  sources: ReadonlySet<string> | null;
}): Record<(typeof URL_KEYS)[number], string | null> {
  const sev = SEVERITIES.filter((s) => f.severities.has(s));
  const key = dateKeyOf(f.date);
  return {
    r: f.locIds.length ? f.locIds.join("|") : null,
    d: f.date === DEFAULT_DATE ? null : key,
    s: sev.length === 0 || sev.length === SEVERITIES.length ? null : sev.join(","),
    t: f.typeFilters.length ? f.typeFilters.join("|") : null,
    src: f.sources && f.sources.size ? [...f.sources].join("|") : null,
  };
}

/**
 * Keep /detection's filters in the URL so a view can be shared: read once on
 * mount (after the saved filters, so a link wins), then write on change.
 * An Agent deep link (countryId and friends) owns the visit and is left
 * alone. Call right after `useDetectionFilters` so its restore runs first.
 */
export function useDetectionUrlSync(filters: DetectionFilters) {
  const applied = useRef(false);
  const { setLocIds, onDateChange, setSeverities, setTypeFilters, setSources } = filters;

  useEffect(() => {
    if (applied.current) return;
    applied.current = true;
    const params = new URLSearchParams(window.location.search);
    if (DETECTION_DEEP_LINK_PARAMS.some((k) => params.has(k))) return;
    const r = params.get("r");
    const d = params.get("d");
    const s = params.get("s");
    const t = params.get("t");
    const src = params.get("src");
    if (r) setLocIds(r.split("|").filter(Boolean));
    const date = d ? dateOfKey(d) : null;
    if (date) onDateChange(date);
    if (s) {
      const sev = s.split(",").filter((v) => (SEVERITIES as readonly string[]).includes(v));
      if (sev.length) setSeverities(new Set(sev));
    }
    if (t) setTypeFilters(t.split("|").filter((v) => v.includes("::")));
    if (src) setSources(new Set(src.split("|").filter(Boolean)));
  }, [setLocIds, onDateChange, setSeverities, setTypeFilters, setSources]);

  const next = filtersToParams({
    locIds: filters.locIds,
    date: filters.customRange ? DEFAULT_DATE : filters.date,
    severities: filters.severities,
    typeFilters: filters.typeFilters,
    sources: filters.sources,
  });
  const signature = JSON.stringify(next);

  useEffect(() => {
    if (!applied.current) return;
    const timer = window.setTimeout(() => {
      const url = new URL(window.location.href);
      if (DETECTION_DEEP_LINK_PARAMS.some((k) => url.searchParams.has(k))) return;
      const values = JSON.parse(signature) as Record<string, string | null>;
      for (const k of URL_KEYS) {
        const v = values[k];
        if (v) url.searchParams.set(k, v);
        else url.searchParams.delete(k);
      }
      if (url.href !== window.location.href) window.history.replaceState(window.history.state, "", url.href);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [signature]);
}
