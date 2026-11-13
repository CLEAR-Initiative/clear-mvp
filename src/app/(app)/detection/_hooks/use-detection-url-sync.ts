"use client";

import { useEffect, useRef } from "react";
import { DETECTION_DEEP_LINK_PARAMS } from "~/lib/agent-deep-link";
import { ALL_COUNTRIES } from "~/lib/map-nav-context";
import { DEFAULT_DATE, SEVERITIES, dateKeyOf, dateOfKey } from "../_lib/detection-model";
import type { DetectionFilters } from "./use-detection-filters";

/** Query keys the map-first page writes: country, places, date, severities, types, sources. */
export const URL_KEYS = ["c", "r", "d", "s", "t", "src"] as const;

/** The `c` value for "All Countries". */
export const ALL_COUNTRIES_PARAM = "all";

type Range = { from: string; to: string };

/** A custom range as whole UTC days: "2026-10-03..2026-11-02". */
export function rangeKey(range: Range): string {
  return `${range.from.slice(0, 10)}..${range.to.slice(0, 10)}`;
}

/** The custom range a `rangeKey` names (first day's start to last day's end, UTC), or null. */
export function rangeOfKey(key: string): Range | null {
  const m = key.match(/^(\d{4}-\d{2}-\d{2})\.\.(\d{4}-\d{2}-\d{2})$/);
  if (!m) return null;
  const from = `${m[1]}T00:00:00.000Z`;
  const to = `${m[2]}T23:59:59.999Z`;
  return Number.isNaN(Date.parse(from)) || Number.isNaN(Date.parse(to)) || from > to ? null : { from, to };
}

// A calendar month as the date filter names it ("Oct 2026", from the date
// picker FilterBar still offers) and as the URL does ("2026-10").
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Oct 2026" -> "2026-10"; null for anything but a calendar month. */
export function monthKeyOf(date: string): string | null {
  const m = date.match(/^([A-Z][a-z]{2}) (\d{4})$/);
  const idx = m ? MONTHS.indexOf(m[1]!) : -1;
  return m && idx >= 0 ? `${m[2]}-${String(idx + 1).padStart(2, "0")}` : null;
}

/** "2026-10" -> "Oct 2026"; null for anything else. */
export function monthOfKey(key: string): string | null {
  const m = key.match(/^(\d{4})-(\d{2})$/);
  const month = m ? MONTHS[Number(m[2]) - 1] : undefined;
  return m && month ? `${month} ${m[1]}` : null;
}

/** The filters as query params; defaults are left out. */
export function filtersToParams(f: {
  /** A country location id, ALL_COUNTRIES_PARAM, or null while unknown. */
  country: string | null;
  locIds: readonly string[];
  date: string;
  customRange: Range | null;
  severities: ReadonlySet<string>;
  typeFilters: readonly string[];
  sources: ReadonlySet<string> | null;
}): Record<(typeof URL_KEYS)[number], string | null> {
  const sev = SEVERITIES.filter((s) => f.severities.has(s));
  return {
    c: f.country,
    r: f.locIds.length ? f.locIds.join("|") : null,
    d: f.customRange ? rangeKey(f.customRange) : f.date === DEFAULT_DATE ? null : (dateKeyOf(f.date) ?? monthKeyOf(f.date)),
    s: sev.length === 0 || sev.length === SEVERITIES.length ? null : sev.join(","),
    t: f.typeFilters.length ? f.typeFilters.join("|") : null,
    src: f.sources && f.sources.size ? [...f.sources].join("|") : null,
  };
}

/** A shared view: everything a link sets, with each filter it leaves out at its default. */
export interface LinkedView {
  country: string | null;
  locIds: string[];
  date: string;
  customRange: Range | null;
  severities: Set<string>;
  typeFilters: string[];
  sources: Set<string> | null;
}

/**
 * The view a /detection link describes, or null when it names no filter (an
 * ordinary visit keeps the saved filters). The page writes every filter that
 * differs from its default, so a filter the link leaves out is at its default.
 */
export function viewFromParams(params: URLSearchParams): LinkedView | null {
  if (!URL_KEYS.some((k) => params.has(k))) return null;
  const d = params.get("d");
  const customRange = d ? rangeOfKey(d) : null;
  const severities = (params.get("s") ?? "").split(",").filter((v) => (SEVERITIES as readonly string[]).includes(v));
  const sources = (params.get("src") ?? "").split("|").filter(Boolean);
  return {
    country: params.get("c") || null,
    locIds: (params.get("r") ?? "").split("|").filter(Boolean),
    date: (!customRange && d ? (dateOfKey(d) ?? monthOfKey(d)) : null) ?? DEFAULT_DATE,
    customRange,
    severities: new Set(severities.length ? severities : SEVERITIES),
    typeFilters: (params.get("t") ?? "").split("|").filter((v) => v.includes("::")),
    sources: sources.length ? new Set(sources) : null,
  };
}

/**
 * Keep /detection's filters in the URL so a view can be shared: read once on
 * mount (after the saved filters, so a link wins), then write on change. A
 * link sets the whole view, country included: its country (or All Countries)
 * holds for the visit, where the team's scope allows it, without changing
 * the working country. An Agent deep link (countryId and friends) owns the
 * visit and is left alone. Call right after `useDetectionFilters` so its
 * restore runs first.
 */
export function useDetectionUrlSync(filters: DetectionFilters) {
  const applied = useRef(false);
  const {
    setLocIds, onDateChange, setCustomRange, setSeverities, setTypeFilters, setSources, setStartingArea, showAllCountriesForVisit,
  } = filters;

  useEffect(() => {
    if (applied.current) return;
    applied.current = true;
    const params = new URLSearchParams(window.location.search);
    if (DETECTION_DEEP_LINK_PARAMS.some((k) => params.has(k))) return;
    const view = viewFromParams(params);
    if (!view) return;
    if (view.country === ALL_COUNTRIES_PARAM) showAllCountriesForVisit();
    else if (view.country) setStartingArea(view.country);
    setLocIds(view.locIds);
    if (view.customRange) setCustomRange(view.customRange);
    else onDateChange(view.date);
    setSeverities(view.severities);
    setTypeFilters(view.typeFilters);
    setSources(view.sources);
  }, [setLocIds, onDateChange, setCustomRange, setSeverities, setTypeFilters, setSources, setStartingArea, showAllCountriesForVisit]);

  const next = filtersToParams({
    country: filters.country === ALL_COUNTRIES ? ALL_COUNTRIES_PARAM : (filters.countryLocationId ?? null),
    locIds: filters.locIds,
    date: filters.date,
    customRange: filters.customRange,
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
