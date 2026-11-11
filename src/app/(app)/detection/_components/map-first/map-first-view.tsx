"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { EventDetailDrawer } from "~/components/event-detail";
import type { MapMarker } from "~/components/map/crisis-map";
import type { BoundaryLevel } from "~/app/(app)/map/_components/map-settings-popover";
import { DetectionFeedListSkeleton } from "~/components/ui/detection-page-skeleton";
import { useDetailKeyboardNav } from "~/hooks/use-detail-keyboard-nav";
import { getListNavigation } from "~/lib/detail-list-nav";
import { api } from "~/trpc/react";
import type { GqlAlert, GqlEvent, GqlSignal } from "~/lib/types/graphql";
import type { DetectionFilters } from "../../_hooks/use-detection-filters";
import { useFacetCounts, type CountScope, type CountVariant } from "../../_hooks/use-facet-counts";
import {
  DEFAULT_DATE,
  SEVERITIES,
  TIMELINE_DAYS,
  alertToItem,
  barIndexOf,
  rangeForDays,
  rangeToDate,
  dateForDays,
  dateKeyOf,
  dateOfKey,
  daysOf,
  eventToItem,
  involvesState,
  isDimActive,
  matchesSearch,
  normalizeTypeKeys,
  parseQuery,
  pickSeverity,
  placeName,
  placeState,
  signalToItem,
  sourceCounts,
  toggleInSet,
  toggleLocation,
  toggleTypeKey,
  typeSelectionLabels,
  type BarRange,
  type Dim,
  type FeedItem,
  type FeedTab,
  type FilterState,
  type QualifierKey,
} from "../../_lib/detection-model";
import { EventBulkBar } from "../event-bulk-bar";
import { CompactHeader, type HeaderTab } from "./compact-header";
import { FeedColumn, type FeedColumnHandle } from "./feed-column";
import { MapStage } from "./map-stage";
import type { PlaceLabel } from "./place-labels";
import { QueryBar, type QueryBarHandle, type QueryToken, type SortChoice, type TokenDim } from "./query-bar";
import { Timeline } from "./timeline";
import css from "./map-first.module.css";

/** The page's per-feed sort values (events add the two "published" ones). */
type SortKey = "newest" | "oldest" | "sev-desc" | "sev-asc" | "pub-desc" | "pub-asc";

/** Events sort by last activity, severity or published time; alerts and signals by published time or severity. */
const EVENT_SORTS: readonly SortChoice[] = [
  { key: "newest", group: "activity", dir: "desc" },
  { key: "oldest", group: "activity", dir: "asc" },
  { key: "sev-desc", group: "severity", dir: "desc" },
  { key: "pub-desc", group: "published", dir: "desc" },
  { key: "pub-asc", group: "published", dir: "asc" },
];
const PUBLISHED_SORTS: readonly SortChoice[] = [
  { key: "sev-desc", group: "severity", dir: "desc" },
  { key: "newest", group: "published", dir: "desc" },
  { key: "oldest", group: "published", dir: "asc" },
];

export interface FeedState<T> {
  items: T[];
  loading: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  total: number;
  newCount: number;
  onLoadMore: () => void;
  onRefresh: () => void;
  /** The feed's sort value; its menu only offers the values this feed takes. */
  sort: SortKey;
  onSortChange: (s: never) => void;
}

interface MapFirstViewProps {
  filters: DetectionFilters;
  title: string;
  tab: string | null;
  onTabChange: (tab: string) => void;
  alerts: FeedState<GqlAlert>;
  events: FeedState<GqlEvent>;
  signals: FeedState<GqlSignal>;
  /** The History tab's own table, shown full width. */
  history: ReactNode;
  updatedAt: number | null;
  onCreateSignal: () => void;
  focusCountryPCode?: string;
  focusCountryName?: string;
  focusCountryGeometry?: unknown;
  center: [number, number];
  zoom: number;
  /** The map pins per tab, built by the page as before; filtered here like the list. */
  markers: Record<"alerts" | "events" | "signals", DetectionMarker[]>;
  fitBoundsGeometry?: unknown;
  adminBoundaries?: { id: string; name: string; geometry: unknown }[];
  adminBoundaryLevel?: 0 | 1 | 2;
  scopeCountryIsos?: string[];
  mapboxAdmin1Isos?: string[];
  boundaryLevel?: BoundaryLevel;
  onBoundaryLevelChange?: (level: BoundaryLevel) => void;
  countryLocationId: string | null;
}

/** A map pin; `eventId` is the event id (alerts, events) or the signal id (signals). */
type DetectionMarker = MapMarker & { eventId?: string };

function readStore(storage: "local" | "session", key: string): string | null {
  try {
    return (storage === "local" ? localStorage : sessionStorage).getItem(key);
  } catch {
    return null;
  }
}

function writeStore(storage: "local" | "session", key: string, value: string) {
  try {
    (storage === "local" ? localStorage : sessionStorage).setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName);
}

const DAY_MS = 86_400_000;

/** Desktop /detection: compact header, feed column and full-height map. */
export function MapFirstView(props: MapFirstViewProps) {
  const {
    filters, title, tab, onTabChange, alerts, events, signals, history, updatedAt, onCreateSignal,
    focusCountryPCode, focusCountryName, focusCountryGeometry, center, zoom, markers, fitBoundsGeometry,
    adminBoundaries, adminBoundaryLevel, scopeCountryIsos, mapboxAdmin1Isos, boundaryLevel, onBoundaryLevelChange,
    countryLocationId,
  } = props;
  const t = useTranslations("detection.mapFirst");
  const tDet = useTranslations("detection");
  const tMap = useTranslations("map");
  const locale = useLocale();
  const feedTab: FeedTab = tab === "alerts" || tab === "signals" || tab === "history" ? tab : "events";

  // ── UI state ──────────────────────────────────────────────────────────────
  // The query bar's text: free text searches the rows, "key:" opens a value list.
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [previewEventId, setPreviewEventId] = useState<string | null>(null);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(true);
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [checkedIds, setCheckedIds] = useState<string[]>([]);
  const [freshIds, setFreshIds] = useState<ReadonlySet<string>>(new Set());
  const feedRef = useRef<FeedColumnHandle>(null);
  const queryRef = useRef<QueryBarHandle>(null);
  const parsedQuery = parseQuery(query, locale);
  const search = parsedQuery.key ? "" : parsedQuery.value;

  useEffect(() => {
    setListOpen(readStore("session", "det-list-open") !== "0");
    setTimelineOpen(readStore("local", "det-tl-open") === "1");
  }, []);

  const setTimeline = useCallback((open: boolean) => {
    setTimelineOpen(open);
    writeStore("local", "det-tl-open", open ? "1" : "0");
  }, []);

  const toggleList = useCallback(() => {
    setListOpen((prev) => {
      writeStore("session", "det-list-open", prev ? "0" : "1");
      return !prev;
    });
  }, []);

  // ── Filters ───────────────────────────────────────────────────────────────
  const states = filters.regionStates;
  const hierarchy = filters.hierarchy;
  const country = filters.country;
  const isAllCountries = !countryLocationId && states.length === 0;
  const filterState: FilterState = useMemo(
    () => ({
      locIds: filters.locIds,
      severities: filters.severities,
      typeFilters: filters.typeFilters,
      sources: filters.sources,
      search,
    }),
    [filters.locIds, filters.severities, filters.typeFilters, filters.sources, search],
  );
  const active: Record<Dim, boolean> = {
    region: isDimActive("region", filterState),
    sev: isDimActive("sev", filterState),
    types: isDimActive("types", filterState) && feedTab !== "signals",
    sources: isDimActive("sources", filterState),
  };
  const dateIsDefault = filters.date === DEFAULT_DATE && !filters.customRange;

  // "El Fasher, Tawila", or "{n} places" from three on.
  const placesLabel = useMemo(() => {
    const names = filters.locIds.map((id) => placeName(id, states)).filter((n): n is string => n != null);
    if (filters.locIds.length === 0 || names.length === 0) return null;
    return filters.locIds.length <= 2 ? names.join(", ") : t("places", { count: filters.locIds.length });
  }, [filters.locIds, states, t]);
  const summary = useCallback(
    (dim: Dim): string => {
      switch (dim) {
        case "region":
          return placesLabel ?? country;
        case "sev": {
          const on = SEVERITIES.filter((s) => filters.severities.has(s));
          return on.length <= 2 ? on.map((s) => tMap(`severities.${s}`)).join(", ") : t("levels", { count: on.length });
        }
        case "types": {
          const labels = typeSelectionLabels(filters.typeFilters, hierarchy);
          return labels.length === 1 ? labels[0]! : t("typesCount", { count: labels.length });
        }
        case "sources": {
          const list = filters.sources ? [...filters.sources] : [];
          return list.length === 1 ? list[0]! : t("sourcesCount", { count: list.length });
        }
      }
    },
    [placesLabel, country, filters.severities, filters.typeFilters, filters.sources, hierarchy, t, tMap],
  );

  // Picking places moves the map to them (fitBoundsGeometry from the page).
  const onToggleLocation = useCallback(
    (id: string) => filters.setLocIds(toggleLocation(filters.locIds, id, states)),
    [filters, states],
  );
  // A name on the map: click filters to that place alone (again clears it);
  // shift-click adds or removes it.
  const onPickPlace = useCallback(
    (id: string, additive: boolean) => {
      if (additive) filters.setLocIds(toggleLocation(filters.locIds, id, states));
      else filters.setLocIds(filters.locIds.length === 1 && filters.locIds[0] === id ? [] : [id]);
    },
    [filters, states],
  );

  // ── Place names on the map ────────────────────────────────────────────────
  // States always; districts once the map is zoomed in (or one is picked):
  // their label points come from the server, not the 11 MB of shapes.
  const [districtZoom, setDistrictZoom] = useState(false);
  const pickedDistrict = filters.locIds.some((id) => !states.some((st) => st.id === id));
  const labelOpts = { staleTime: 60 * 60 * 1000, refetchOnWindowFocus: false } as const;
  const stateLabelsQ = api.locations.labelPoints.useQuery(
    { countryId: countryLocationId ?? "", level: 1 },
    { ...labelOpts, enabled: !!countryLocationId && feedTab !== "history" },
  );
  const districtLabelsQ = api.locations.labelPoints.useQuery(
    { countryId: countryLocationId ?? "", level: 2 },
    { ...labelOpts, enabled: !!countryLocationId && feedTab !== "history" && (districtZoom || pickedDistrict) },
  );
  const onDistrictZoom = useCallback(() => setDistrictZoom(true), []);
  const placeLabels: PlaceLabel[] = useMemo(() => {
    if (!countryLocationId) return [];
    const picked = filters.locIds;
    const out: PlaceLabel[] = [];
    for (const p of stateLabelsQ.data ?? []) {
      const state = states.find((st) => st.id === p.id);
      const on = state ? involvesState(state, picked) : picked.includes(p.id);
      out.push({ ...p, level: 1, selected: on, dimmed: picked.length > 0 && !on, early: false, title: t("mapLabel", { name: p.name }) });
    }
    for (const p of districtLabelsQ.data ?? []) {
      const state = placeState(p.id, states);
      const on = picked.includes(p.id) || (state != null && picked.includes(state.id));
      out.push({
        ...p,
        level: 2,
        selected: on,
        dimmed: picked.length > 0 && !on,
        early: state != null && involvesState(state, picked),
        title: t("mapLabel", { name: p.name }),
      });
    }
    return out;
  }, [countryLocationId, filters.locIds, stateLabelsQ.data, districtLabelsQ.data, states, t]);

  const allSourceNames = useRef<string[]>([]);
  const clearDim = useCallback(
    (dim: TokenDim) => {
      if (dim === "region") filters.setLocIds([]);
      if (dim === "sev") filters.setSeverities(new Set(SEVERITIES));
      if (dim === "types") filters.setTypeFilters([]);
      if (dim === "sources") filters.setSources(null);
      if (dim === "date") filters.onDateChange(DEFAULT_DATE);
    },
    [filters],
  );
  const clearAll = useCallback(() => {
    filters.setLocIds([]);
    filters.setSeverities(new Set(SEVERITIES));
    filters.setTypeFilters([]);
    filters.setSources(null);
    filters.onDateChange(DEFAULT_DATE);
  }, [filters]);

  // ── Feed items ────────────────────────────────────────────────────────────
  const untitled = tDet("feed.events.untitled");
  const feed = feedTab === "alerts" ? alerts : feedTab === "signals" ? signals : events;
  const allItems: FeedItem[] = useMemo(() => {
    if (feedTab === "alerts") return alerts.items.map((a) => alertToItem(a, states, untitled));
    if (feedTab === "signals") return signals.items.map((s) => signalToItem(s, states, untitled));
    return events.items.map((e) => eventToItem(e, states, untitled));
  }, [feedTab, alerts.items, events.items, signals.items, states, untitled]);

  // Region, date and type are server filters; severity (exact levels), sources and search apply here.
  const clientPass = useCallback(
    (it: FeedItem, except: "sources" | "search" | null = null) => {
      if (!(filters.severities.size === 0 || filters.severities.has(it.severity))) return false;
      if (except !== "sources" && feedTab !== "signals" && filters.sources && filters.sources.size > 0 && !it.sources.some((s) => filters.sources!.has(s))) return false;
      if (except !== "search" && !matchesSearch(it, search)) return false;
      return true;
    },
    [filters.severities, filters.sources, feedTab, search],
  );
  const items = useMemo(() => allItems.filter((it) => clientPass(it)), [allItems, clientPass]);
  // Pins follow the list: only items that pass every filter get one.
  const tabMarkers = feedTab === "alerts" ? markers.alerts : feedTab === "signals" ? markers.signals : markers.events;
  const itemByKey = useMemo(() => new Map(items.map((it) => [it.eventId ?? it.id, it])), [items]);
  const visibleMarkers = useMemo(
    () => tabMarkers.filter((m) => m.eventId != null && itemByKey.has(m.eventId)),
    [tabMarkers, itemByKey],
  );
  const narrowed = search.trim() !== "" || (feedTab !== "signals" && !!filters.sources) || (active.sev && filters.severities.size > 1);

  const sourceFacet = useMemo(() => sourceCounts(allItems, { ...filterState, locIds: [], typeFilters: [] }, hierarchy), [allItems, filterState, hierarchy]);
  allSourceNames.current = sourceFacet.map(([n]) => n);

  // ── Server scope and facet counts ─────────────────────────────────────────
  const base: CountScope = useMemo(
    () => ({
      teamId: filters.teamId,
      locationId: filters.selectedLocationId ?? undefined,
      locationIds: filters.multiLocIds,
      from: filters.fromIso,
      to: filters.effectiveTo,
      severityMin: filters.severityMin,
      severityMax: filters.severityMax,
      eventTypes: filters.expandedTypeCodes ?? undefined,
      sourceNames: feedTab === "signals" && filters.sources ? [...filters.sources] : undefined,
    }),
    [filters.teamId, filters.selectedLocationId, filters.multiLocIds, filters.fromIso, filters.effectiveTo, filters.severityMin, filters.severityMax, filters.expandedTypeCodes, filters.sources, feedTab],
  );
  const countryScope = countryLocationId ?? undefined;

  // Tab counts in the header: the active feed's own total, limit:1 queries for the others.
  const tabCountOpts = { staleTime: 60_000, refetchOnWindowFocus: false, enabled: filters.locationsReady };
  const { sourceNames: _sn, ...pageScope } = base;
  const alertsCountQ = api.alerts.alertsPage.useQuery({ ...pageScope, status: "published", limit: 1 }, { ...tabCountOpts, enabled: tabCountOpts.enabled && feedTab !== "alerts" });
  const eventsCountQ = api.alerts.eventsPage.useQuery({ ...pageScope, limit: 1 }, { ...tabCountOpts, enabled: tabCountOpts.enabled && feedTab !== "events" });
  const { eventTypes: _et, ...signalScope } = base;
  const signalsCountQ = api.signals.signalsPage.useQuery({ ...signalScope, limit: 1 }, { ...tabCountOpts, enabled: tabCountOpts.enabled && feedTab !== "signals" });
  const tabCounts = {
    alerts: feedTab === "alerts" ? (alerts.loading ? null : alerts.total) : (alertsCountQ.data?.totalCount ?? null),
    events: feedTab === "events" ? (events.loading ? null : events.total) : (eventsCountQ.data?.totalCount ?? null),
    signals: feedTab === "signals" ? (signals.loading ? null : signals.total) : (signalsCountQ.data?.totalCount ?? null),
  };

  // ── Timeline ──────────────────────────────────────────────────────────────
  const timelineWindow = useMemo(() => {
    const to = new Date();
    const from = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()) - (TIMELINE_DAYS - 1) * DAY_MS);
    return { from: from.toISOString(), to: to.toISOString() };
    // Recomputed when the frozen window moves (refresh or a new scope).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.snapshotTime]);
  // Events per UTC day of firstSignalCreatedAt, the field the list's date
  // filter uses. Days with no events have no bucket; they stay 0 below.
  const dailyQ = api.alerts.entityStats.useQuery(
    {
      entity: "event",
      groupBy: "day",
      teamId: filters.teamId,
      locationId: filters.selectedLocationId ?? undefined,
      locationIds: filters.multiLocIds,
      eventTypes: filters.expandedTypeCodes ?? undefined,
      severityMin: filters.severityMin,
      severityMax: filters.severityMax,
      from: timelineWindow.from,
      to: timelineWindow.to,
    },
    { enabled: filters.locationsReady && feedTab !== "history", staleTime: 60_000, refetchOnWindowFocus: false, retry: false },
  );
  const dailyCounts = useMemo(() => {
    const out = new Array<number>(TIMELINE_DAYS).fill(0);
    const rows = dailyQ.data?.buckets ?? [];
    const lastDay = Date.parse(`${timelineWindow.to.slice(0, 10)}T00:00:00Z`);
    for (const r of rows) {
      const idx = TIMELINE_DAYS - 1 - Math.round((lastDay - Date.parse(`${r.key}T00:00:00Z`)) / DAY_MS);
      if (idx >= 0 && idx < TIMELINE_DAYS) out[idx] = r.count;
    }
    return out;
  }, [dailyQ.data, timelineWindow.to]);

  const windowDays = filters.customRange ? null : daysOf(filters.date);
  const dateKey = filters.customRange ? null : dateKeyOf(filters.date);
  // A calendar month from the old date picker (saved filters); a handle-picked range has no label of its own.
  const fixedLabel =
    windowDays == null && !filters.customRange
      ? (filters.dateOptions.find((o) => o.value === filters.date)?.label ?? filters.date)
      : null;
  // The timeline's selection in bars; null when the filter lies wholly before the window.
  const windowStartMs = Date.parse(timelineWindow.from);
  const selRange: BarRange | null = useMemo(() => {
    if (windowDays != null) return rangeForDays(Math.min(windowDays, TIMELINE_DAYS));
    if (Date.parse(filters.effectiveTo) < windowStartMs) return null;
    return [barIndexOf(filters.fromIso, windowStartMs), barIndexOf(filters.effectiveTo, windowStartMs)];
  }, [windowDays, filters.fromIso, filters.effectiveTo, windowStartMs]);
  const customLabel = useMemo(() => {
    if (!filters.customRange) return null;
    const f = new Intl.DateTimeFormat(locale === "en" ? "en-GB" : locale, { day: "numeric", month: "short", timeZone: "UTC" });
    const from = f.format(new Date(filters.customRange.from));
    const to = f.format(new Date(filters.customRange.to));
    return from === to ? from : `${from} – ${to}`;
  }, [filters.customRange, locale]);
  const dateLabel =
    windowDays == null
      ? (customLabel ?? fixedLabel ?? "")
      : windowDays === 1
        ? t("last24h")
        : t("lastDays", { count: windowDays });
  const nounKey = feedTab === "alerts" ? "alerts" : feedTab === "signals" ? "signals" : "events";

  // ── Selection, hover and drawer ───────────────────────────────────────────
  const itemIds = useMemo(() => items.map((it) => it.id), [items]);
  useEffect(() => {
    if (selectedId && !itemIds.includes(selectedId)) setSelectedId(null);
  }, [itemIds, selectedId]);

  const previewIds = useMemo(() => items.map((it) => it.eventId).filter((v): v is string => !!v), [items]);
  const previewNav = useMemo(
    () => (previewEventId != null ? getListNavigation(previewIds, previewEventId) : null),
    [previewIds, previewEventId],
  );
  const goPrev = useCallback(() => {
    if (previewNav?.prevId) setPreviewEventId(previewNav.prevId);
  }, [previewNav?.prevId]);
  const goNext = useCallback(() => {
    if (previewNav?.nextId) setPreviewEventId(previewNav.nextId);
  }, [previewNav?.nextId]);
  useDetailKeyboardNav({
    enabled: previewEventId != null,
    hasPrev: previewNav?.hasPrev ?? false,
    hasNext: previewNav?.hasNext ?? false,
    onPrev: goPrev,
    onNext: goNext,
  });

  const onSelectRow = useCallback((it: FeedItem) => {
    setSelectedId(it.id);
    if (it.eventId) setPreviewEventId(it.eventId);
  }, []);

  // Row hover highlights its pin; pin hover highlights its row.
  const hoveredItem = hoverId ? items.find((it) => it.id === hoverId) : null;
  const hoveredMarkerId = hoveredItem
    ? (visibleMarkers.find((m) => m.eventId === (hoveredItem.eventId ?? hoveredItem.id))?.id ?? null)
    : null;
  const onMarkerHover = useCallback(
    (m: MapMarker | null) => {
      const key = (m as DetectionMarker | null)?.eventId;
      setHoverId(key ? (itemByKey.get(key)?.id ?? null) : null);
    },
    [itemByKey],
  );

  // ── Fresh rows after "n new" ──────────────────────────────────────────────
  const beforeRefresh = useRef<Set<string> | null>(null);
  const onRefresh = useCallback(() => {
    beforeRefresh.current = new Set(allItems.map((it) => it.id));
    feed.onRefresh();
  }, [allItems, feed]);
  useEffect(() => {
    const before = beforeRefresh.current;
    if (!before || allItems.length === 0) return;
    beforeRefresh.current = null;
    const fresh = new Set(allItems.filter((it) => !before.has(it.id)).map((it) => it.id));
    if (fresh.size === 0) return;
    setFreshIds(fresh);
    const timer = window.setTimeout(() => setFreshIds(new Set()), 1700);
    return () => window.clearTimeout(timer);
  }, [allItems]);

  // ── Empty-state recovery ──────────────────────────────────────────────────
  const empty = !feed.loading && items.length === 0;
  const recoveryVariants: CountVariant[] = useMemo(() => {
    const out: CountVariant[] = [];
    if (active.region) out.push({ key: "region", scope: { ...base, locationId: countryScope, locationIds: undefined } });
    if (!dateIsDefault) {
      const to = new Date();
      out.push({ key: "date", scope: { ...base, from: new Date(to.getTime() - 7 * DAY_MS).toISOString(), to: to.toISOString() } });
    }
    if (active.sev) out.push({ key: "sev", scope: { ...base, severityMin: undefined, severityMax: undefined } });
    if (active.types) out.push({ key: "types", scope: { ...base, eventTypes: undefined } });
    return out;
    // Recomputed when the result set empties; the window doesn't need to track the clock.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empty, base, active.region, active.sev, active.types, dateIsDefault, countryScope]);
  const recoveryCounts = useFacetCounts(feedTab, recoveryVariants, empty);
  const recovery = useMemo(() => {
    if (!empty) return null;
    const options: { key: string; label: string; count: number }[] = [];
    for (const v of recoveryVariants) {
      const n = recoveryCounts.get(v.key);
      if (n == null) continue;
      const label = v.key === "date" ? dateLabel : summary(v.key as Dim);
      options.push({ key: v.key, label, count: n });
    }
    if (active.sources) options.push({ key: "sources", label: summary("sources"), count: allItems.filter((it) => clientPass(it, "sources")).length });
    if (search.trim()) options.push({ key: "search", label: t("empty.search", { query: search.trim() }), count: allItems.filter((it) => clientPass(it, "search")).length });
    const best = options.filter((o) => o.count > 0).sort((a, b) => b.count - a.count)[0];
    return best ?? null;
  }, [empty, recoveryVariants, recoveryCounts, active.sources, search, allItems, clientPass, summary, dateLabel, t]);
  const onRecover = useCallback(() => {
    if (!recovery) return;
    if (recovery.key === "search") setQuery("");
    else if (recovery.key === "date") filters.onDateChange(DEFAULT_DATE);
    else clearDim(recovery.key as TokenDim);
  }, [recovery, filters, clearDim]);

  // ── Keyboard: / and F focus the query bar, T the timeline ────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      if (e.key === "/" || e.key === "f" || e.key === "F") {
        e.preventDefault();
        if (!listOpen) toggleList();
        queryRef.current?.focus();
      } else if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        setTimeline(!timelineOpen);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [listOpen, toggleList, timelineOpen, setTimeline]);

  // ── Query bar ─────────────────────────────────────────────────────────────
  const sortChoices = feedTab === "events" ? EVENT_SORTS : PUBLISHED_SORTS;
  const sortGroup = sortChoices.find((c) => c.key === feed.sort)?.group;
  const onSort = useCallback((key: string) => (feed.onSortChange as (s: string) => void)(key), [feed]);
  const typesLabel = typeSelectionLabels(filters.typeFilters, hierarchy).join(", ");
  // Older filters may hold whole level-2 groups; the bar works in detailed types.
  const typeKeys = useMemo(() => normalizeTypeKeys(filters.typeFilters, hierarchy), [filters.typeFilters, hierarchy]);
  const sevLabel = SEVERITIES.filter((s) => filters.severities.has(s)).map((s) => tMap(`severities.${s}`));
  const sourcesLabel = filters.sources ? [...filters.sources].join(", ") : "";
  const tokens: QueryToken[] = [];
  if (active.region && placesLabel) tokens.push({ dim: "region", key: "in", value: placesLabel });
  if (active.types) tokens.push({ dim: "types", key: "type", value: typesLabel });
  if (active.sources) tokens.push({ dim: "sources", key: "source", value: sourcesLabel });
  if (active.sev) tokens.push({ dim: "sev", key: "severity", value: sevLabel.map((l) => l.toLowerCase()).join(", ") });
  if (!dateIsDefault) {
    const k = dateKeyOf(filters.date);
    const since = filters.customRange ? null : k?.startsWith("c") ? `${k.slice(1)}d` : k;
    tokens.push({ dim: "date", key: "since", value: since ?? dateLabel });
  }
  const current: Partial<Record<QualifierKey, string>> = {
    in: placesLabel ?? undefined,
    type: active.types ? typesLabel : undefined,
    severity: active.sev ? sevLabel.join(", ") : undefined,
    source: active.sources ? sourcesLabel : undefined,
    since: dateIsDefault ? undefined : dateLabel,
  };

  const scopeLabel = placesLabel ?? (isAllCountries ? t("allCountries") : country);
  const refreshKey = `${filters.filterKey}|${filters.sources ? [...filters.sources].join(",") : ""}`;
  const checkedEvents = feedTab === "events" ? events.items.filter((e) => checkedIds.includes(e.id)) : [];

  const header = (
    <CompactHeader
      title={title}
      tab={tab}
      onTabChange={(next: HeaderTab) => onTabChange(next)}
      counts={tabCounts}
      updatedAt={updatedAt}
      onCreateSignal={onCreateSignal}
    />
  );

  if (feedTab === "history") {
    return (
      <div className={css.shell}>
        {header}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 24 }}>{history}</div>
      </div>
    );
  }

  return (
    <div className={css.shell}>
      {header}
      <div className={css.body}>
        <FeedColumn
          ref={feedRef}
          hidden={!listOpen}
          items={items}
          totalCount={feed.total}
          narrowed={narrowed}
          noun={nounKey}
          scopeLabel={scopeLabel}
          dateLabel={dateLabel}
          queryBar={
            <QueryBar
              ref={queryRef}
              value={query}
              onValueChange={setQuery}
              tab={feedTab}
              tokens={tokens}
              current={current}
              states={states}
              hierarchy={hierarchy}
              locIds={filters.locIds}
              typeFilters={typeKeys}
              severities={filters.severities}
              sources={filters.sources}
              sourceFacet={sourceFacet}
              dateKey={filters.customRange ? null : dateKeyOf(filters.date)}
              sortChoices={sortChoices}
              sortKey={feed.sort}
              searchCount={items.length}
              countBase={base}
              nowIso={filters.snapshotTime}
              onToggleLocation={onToggleLocation}
              onToggleType={(key) => filters.setTypeFilters(toggleTypeKey(filters.typeFilters, hierarchy, key))}
              onPickSeverity={(sev) => filters.setSeverities(pickSeverity(filters.severities, sev))}
              onToggleSource={(name) => {
                // From "all", picking one source isolates it; picking every one is "all" again.
                filters.setSources(toggleInSet(filters.sources, name, allSourceNames.current));
              }}
              onDate={(key) => {
                const d = dateOfKey(key);
                if (d) filters.onDateChange(d);
              }}
              onSort={onSort}
              onClearDim={clearDim}
              onClearAll={clearAll}
            />
          }
          sortChoices={sortChoices}
          sortKey={feed.sort}
          onSortChange={onSort}
          timeMode={sortGroup === "published" ? "published" : "activity"}
          newCount={feed.newCount}
          onRefresh={onRefresh}
          selectedId={selectedId}
          onSelect={onSelectRow}
          onHover={setHoverId}
          loading={feed.loading}
          isFetchingMore={feed.isFetchingMore}
          hasMore={feed.hasMore}
          onLoadMore={feed.onLoadMore}
          recovery={recovery ? { label: recovery.label, count: recovery.count } : null}
          onRecover={onRecover}
          refreshKey={dragging ? "drag" : refreshKey}
          freshIds={freshIds}
          checkedIds={checkedIds}
          onToggleCheck={
            feedTab === "events"
              ? (id) => setCheckedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
              : null
          }
          bulkBar={
            feedTab === "events" && checkedEvents.length > 0 ? (
              <EventBulkBar
                selectedIds={checkedEvents.map((e) => e.id)}
                suggestedTitle={checkedEvents[0]?.title ?? ""}
                defaultSeverity={checkedEvents.reduce((max, e) => Math.max(max, e.severity ?? 3), 3)}
                onClear={() => setCheckedIds([])}
              />
            ) : null
          }
          skeleton={<DetectionFeedListSkeleton />}
        />

        <MapStage
          markers={visibleMarkers}
          hoveredMarkerId={hoveredMarkerId}
          onMarkerHover={onMarkerHover}
          center={center}
          zoom={zoom}
          fitBoundsGeometry={fitBoundsGeometry}
          adminBoundaries={adminBoundaries}
          adminBoundaryLevel={adminBoundaryLevel}
          scopeCountryIsos={scopeCountryIsos}
          mapboxAdmin1Isos={mapboxAdmin1Isos}
          boundaryLevel={boundaryLevel}
          onBoundaryLevelChange={onBoundaryLevelChange}
          focusCountryPCode={focusCountryPCode}
          focusCountryName={focusCountryName}
          focusCountryGeometry={focusCountryGeometry}
          listHidden={!listOpen}
          onToggleList={toggleList}
          placeLabels={placeLabels}
          onPickPlace={onPickPlace}
          onDistrictZoom={onDistrictZoom}
        >
          <Timeline
            open={timelineOpen}
            onOpenChange={setTimeline}
            counts={dailyCounts}
            windowStartMs={windowStartMs}
            range={selRange}
            windowDays={windowDays}
            dateKey={dateKey}
            fixedLabel={fixedLabel}
            total={feed.total}
            noun={t(`noun.${nounKey}`, { count: feed.total })}
            isDefault={dateIsDefault}
            onPreset={(key) => {
              const d = dateOfKey(key);
              if (d) filters.onDateChange(d);
            }}
            onRangeCommit={(r) => {
              const d = rangeToDate(r, windowStartMs);
              if (d.kind === "rolling") filters.onDateChange(dateForDays(d.days));
              else filters.setCustomRange({ from: d.from, to: d.to });
            }}
            onDragChange={setDragging}
          />
        </MapStage>
      </div>

      <EventDetailDrawer
        eventId={previewEventId}
        opened={previewEventId != null}
        onClose={() => setPreviewEventId(null)}
        navigation={previewNav ?? undefined}
        onNavigatePrev={goPrev}
        onNavigateNext={goNext}
      />
    </div>
  );
}

