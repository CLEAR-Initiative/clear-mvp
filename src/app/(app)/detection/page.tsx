"use client";

import { useState, useMemo, useCallback, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Box, Tabs, Button, Group, Popover, Text, Badge, ActionIcon, Divider } from "@mantine/core";
import { IconFilter } from "@tabler/icons-react";
import { DisasterTypePicker, expandSelectionsToCodes } from "~/components/disaster-type-picker";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { useTeam } from "~/providers/team-provider";
import type { MapMarker } from "~/components/map/crisis-map";
import { countryConfig, parseDateFilter } from "~/lib/constants/country-config";
import { useLocations } from "~/hooks/use-locations";
import { alertsToMarkers, eventsToMarkers, signalsToMarkers, type CrisisMarker } from "../map/_components/map-markers-data";
import { PageHeader, FilterBar, RegionPicker } from "~/components/ui";
import type { GqlEvent, GqlAlert, GqlSignal } from "~/lib/types/graphql";
import { writeDetectionNavContext } from "~/lib/detection-nav-context";

import { LiveAlertsTab, type AlertSortOrder } from "./_components/live-alerts-tab";
import { HistoryTab, type HistorySortOrder } from "./_components/history-tab";
import { EventsTab, type EventSortOrder } from "./_components/events-tab";
import { SignalsTab, type SignalSortOrder } from "./_components/signals-tab";
import { CreateSignalModal } from "~/components/create-signal-modal";

const PAGE_SIZE = 25;
const HISTORY_PAGE_SIZE = 100;

// Map UI sort labels to API orderBy enum values.
// Types must match the z.enum() definitions in alerts.ts router exactly.
type EventOrderBy = "LAST_SIGNAL_DESC" | "LAST_SIGNAL_ASC" | "CREATED_DESC" | "CREATED_ASC" | "SEVERITY_DESC" | "SEVERITY_ASC";
type AlertOrderBy = "CREATED_DESC" | "CREATED_ASC" | "SEVERITY_DESC" | "SEVERITY_ASC";
type SignalOrderBy = "PUBLISHED_DESC" | "PUBLISHED_ASC" | "SEVERITY_DESC" | "SEVERITY_ASC";

const EVENT_ORDER_MAP: Record<EventSortOrder, EventOrderBy> = {
  "sev-desc": "SEVERITY_DESC",
  "sev-asc":  "SEVERITY_ASC",
  "newest":   "LAST_SIGNAL_DESC",
  "oldest":   "LAST_SIGNAL_ASC",
};
const ALERT_ORDER_MAP: Record<AlertSortOrder, AlertOrderBy> = {
  "sev-desc": "SEVERITY_DESC",
  "sev-asc":  "SEVERITY_ASC",
  "newest":   "CREATED_DESC",
  "oldest":   "CREATED_ASC",
};
const SIGNAL_ORDER_MAP: Record<SignalSortOrder, SignalOrderBy> = {
  "newest":   "PUBLISHED_DESC",
  "oldest":   "PUBLISHED_ASC",
  "sev-desc": "SEVERITY_DESC",
  "sev-asc":  "SEVERITY_ASC",
};

const VALID_TABS = new Set(["live", "events", "signals", "history"]);
const TAB_STORAGE_KEY = "detection-active-tab";
const FILTERS_STORAGE_KEY = "detection-filters";

// Persisted alongside the tab so filter selections survive a round trip
// through a signal/event detail page (which unmounts this component).
interface StoredFilters {
  country?: string;
  regionId?: string | null;
  date?: string;
  severities?: string[];
  typeFilters?: string[];
  sources?: string[] | null;
  boundaryLevel?: "none" | "A0" | "A1" | "A2";
}

function readStoredFilters(): StoredFilters {
  try {
    const raw = sessionStorage.getItem(FILTERS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredFilters) : {};
  } catch {
    return {}; // sessionStorage unavailable (SSR or private mode)
  }
}

function DetectionPageContent() {
  const t = useTranslations("detection");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [storedFilters] = useState<StoredFilters>(() => readStoredFilters());

  // Priority: URL param (shareable link) > sessionStorage (browser back) > default
  const [activeTab, setActiveTab] = useState<string | null>(() => {
    const fromUrl = searchParams.get("tab");
    if (fromUrl && VALID_TABS.has(fromUrl)) return fromUrl;
    try {
      const stored = sessionStorage.getItem(TAB_STORAGE_KEY);
      if (stored && VALID_TABS.has(stored)) return stored;
    } catch { /* sessionStorage unavailable (SSR or private mode) */ }
    return "events";
  });

  const handleTabChange = useCallback((tab: string | null) => {
    if (!tab) return;
    setActiveTab(tab);
    try { sessionStorage.setItem(TAB_STORAGE_KEY, tab); } catch { /* ignore */ }
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.replace(`/detection?${params.toString()}`, { scroll: false });
  }, [router, searchParams]);
  const [selectedCountry, setSelectedCountry] = useState(storedFilters.country ?? "Sudan");
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(storedFilters.regionId ?? null);
  const [selectedDate, setSelectedDate] = useState(storedFilters.date ?? "Last 30 days");
  const localizedDateOptions = useMemo(() => {
    const now = new Date();
    const englishMonths = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const fmt = new Intl.DateTimeFormat(locale, { month: "short", year: "numeric" });
    const result: { value: string; label: string }[] = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      result.push({ value: `${englishMonths[d.getMonth()]} ${d.getFullYear()}`, label: fmt.format(d) });
    }
    result.push(
      { value: "Last 7 days",  label: t("filters.last7days") },
      { value: "Last 30 days", label: t("filters.last30days") },
      { value: "Last 90 days", label: t("filters.last90days") },
    );
    return result;
  }, [locale, t]);
  const [createModalOpened, { open: openCreateModal, close: closeCreateModal }] = useDisclosure(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeSeverities, setActiveSeverities] = useState<Set<string>>(new Set(storedFilters.severities ?? ["critical", "high", "medium", "low"]));
  const [selectedTypeFilters, setSelectedTypeFilters] = useState<string[]>(storedFilters.typeFilters ?? []);
  const hierarchyQuery = api.alerts.getDisasterTypeHierarchy.useQuery(undefined, { staleTime: Infinity, refetchOnWindowFocus: false });
  const hierarchy = hierarchyQuery.data ?? [];
  const expandedTypeCodes = selectedTypeFilters.length > 0 ? expandSelectionsToCodes(selectedTypeFilters, hierarchy) : null;
  const [activeSources, setActiveSources] = useState<Set<string> | null>(
    storedFilters.sources ? new Set(storedFilters.sources) : null,
  );
  const isFiltered = activeSeverities.size < 4 || selectedTypeFilters.length > 0 || activeSources !== null;
  const filterCount = (activeSeverities.size < 4 ? 1 : 0) + (selectedTypeFilters.length > 0 ? 1 : 0) + (activeSources !== null ? 1 : 0);

  const { activeTeamId } = useTeam();
  const { countries, getCenter, getZoom, getLocationId, tree, isLoading: isLocationsLoading } = useLocations();

  const [boundaryLevel, setBoundaryLevel] = useState<"none" | "A0" | "A1" | "A2">(storedFilters.boundaryLevel ?? "A1");

  // Mirror filter selections into sessionStorage so they survive navigating
  // to a signal/event detail page and back (that route change unmounts this
  // component, resetting the useState defaults above without this).
  useEffect(() => {
    try {
      const toStore: StoredFilters = {
        country: selectedCountry,
        regionId: selectedRegionId,
        date: selectedDate,
        severities: Array.from(activeSeverities),
        typeFilters: selectedTypeFilters,
        sources: activeSources ? Array.from(activeSources) : null,
        boundaryLevel,
      };
      sessionStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(toStore));
    } catch {
      /* sessionStorage unavailable (SSR or private mode) */
    }
  }, [selectedCountry, selectedRegionId, selectedDate, activeSeverities, selectedTypeFilters, activeSources, boundaryLevel]);

  const selectedCountryId = useMemo(() => getLocationId(selectedCountry), [selectedCountry, getLocationId]);

  const sudanId = useMemo(() => getLocationId("Sudan"), [getLocationId]);
  const sudanL0Query = api.locations.getById.useQuery(
    { id: sudanId! },
    { enabled: !!sudanId, staleTime: Infinity, refetchOnWindowFocus: false },
  );
  const focusCountryGeometry = sudanL0Query.data?.geometry ?? undefined;

  const a1BoundaryQuery = api.locations.getAdminBoundaries.useQuery(
    { level: 1, countryId: selectedCountryId ?? undefined },
    { enabled: boundaryLevel === "A1" && !!selectedCountryId, staleTime: 1000 * 60 * 60, refetchOnWindowFocus: false },
  );
  const a2BoundaryQuery = api.locations.getAdminBoundaries.useQuery(
    { level: 2, countryId: selectedCountryId ?? undefined },
    { enabled: boundaryLevel === "A2" && !!selectedCountryId, staleTime: 1000 * 60 * 60, refetchOnWindowFocus: false },
  );
  const adminBoundaries = useMemo(() => {
    if (selectedRegionId !== null) return [];
    if (boundaryLevel === "A1") return a1BoundaryQuery.data ?? [];
    if (boundaryLevel === "A2") return a2BoundaryQuery.data ?? [];
    return [];
  }, [selectedRegionId, boundaryLevel, a1BoundaryQuery.data, a2BoundaryQuery.data]);
  const adminBoundaryLevel = boundaryLevel === "A1" ? 1 : boundaryLevel === "A2" ? 2 : undefined;

  const regionQuery = api.locations.getById.useQuery(
    { id: selectedRegionId! },
    { enabled: !!selectedRegionId, staleTime: 1000 * 60 * 60, refetchOnWindowFocus: false },
  );
  const fitBoundsGeometry = useMemo(
    () => (selectedRegionId ? (regionQuery.data?.geometry ?? null) : null),
    [selectedRegionId, regionQuery.data],
  );

  const selectedLocationId = useMemo(
    () => selectedRegionId ?? getLocationId(selectedCountry),
    [selectedCountry, selectedRegionId, getLocationId],
  );

  // Don't fire feed queries until the location tree has loaded. Without this
  // guard, the queries fire with locationId=undefined (no filter) during the
  // brief window before the tree resolves, returning results from all countries.
  const locationsReady = !isLocationsLoading || !!selectedLocationId;

  const currentCountryStates = useMemo(
    () => tree.find((c) => c.name === selectedCountry)?.states ?? [],
    [tree, selectedCountry],
  );

  const dateRange = useMemo(() => parseDateFilter(selectedDate), [selectedDate]);
  const fromIso = useMemo(() => dateRange.start.toISOString(), [dateRange]);
  const toIso = useMemo(() => dateRange.end.toISOString(), [dateRange]);

  // Snapshot time: freezes the upper bound of all feed queries so that new
  // items arriving mid-session don't shift offsets and cause duplicates when
  // the user loads more. Resets whenever filters or sort change.
  const [snapshotTime, setSnapshotTime] = useState(() => new Date().toISOString());
  // Rolling presets ("Last N days") follow snapshotTime so refresh expands
  // the window to include new events. Fixed-range presets ("Mon YYYY") keep
  // their explicit upper bound - snapshotTime is irrelevant there because
  // the range is in the past and no new events can fall into it.
  const isRollingPreset = /^Last \d+ days$/i.test(selectedDate);
  const effectiveTo = isRollingPreset ? snapshotTime : toIso;

  const SEV_NUM: Record<string, number> = { low: 2, medium: 3, high: 4, critical: 5 };
  const { severityMin, severityMax } = useMemo(() => {
    if (activeSeverities.size === 0 || activeSeverities.size === 4) {
      return { severityMin: undefined, severityMax: undefined };
    }
    const nums = [...activeSeverities].map((s) => SEV_NUM[s]).filter((n): n is number => typeof n === "number");
    if (nums.length === 0) return { severityMin: undefined, severityMax: undefined };
    const min = Math.min(...nums) === 2 ? 1 : Math.min(...nums);
    return { severityMin: min, severityMax: Math.max(...nums) };
  }, [activeSeverities]);

  // ── Per-feed sort state ────────────────────────────────────────────────────
  const [eventsSort, setEventsSort] = useState<EventSortOrder>("newest");
  const [alertsSort, setAlertsSort] = useState<AlertSortOrder>("newest");
  const [signalsSort, setSignalsSort] = useState<SignalSortOrder>("newest");
  const [historySortOrder, setHistorySortOrder] = useState<HistorySortOrder>("newest");

  // Write detection nav context for event/signal page prev/next navigation
  useEffect(() => {
    writeDetectionNavContext({
      teamId: activeTeamId,
      locationId: selectedLocationId,
      from: fromIso,
      to: effectiveTo,
      severityMin,
      severityMax,
      eventTypes: expandedTypeCodes ?? undefined,
      orderBy: EVENT_ORDER_MAP[eventsSort],
      signalOrderBy: SIGNAL_ORDER_MAP[signalsSort],
      sourceNames: activeSources ? [...activeSources] : undefined,
    });
  }, [activeTeamId, selectedLocationId, fromIso, effectiveTo, severityMin, severityMax, expandedTypeCodes?.join(","), eventsSort, signalsSort, activeSources]);

  // ── Per-feed accumulated items + offset ───────────────────────────────────
  const [eventsItems, setEventsItems] = useState<GqlEvent[]>([]);
  const [eventsOffset, setEventsOffset] = useState(0);
  const [eventsTotalCount, setEventsTotalCount] = useState(0);
  const [eventsHasMore, setEventsHasMore] = useState(false);
  const eventsAppending = useRef(false);
  // Incremented on every reset so the React Query cache key always changes,
  // guaranteeing eventsQuery.data changes and the accumulation effect fires
  // even when offset stays 0 and staleTime would otherwise return a cached ref.
  const [eventsVersion, setEventsVersion] = useState(0);

  const [alertsItems, setAlertsItems] = useState<GqlAlert[]>([]);
  const [alertsOffset, setAlertsOffset] = useState(0);
  const [alertsTotalCount, setAlertsTotalCount] = useState(0);
  const [alertsHasMore, setAlertsHasMore] = useState(false);
  const alertsAppending = useRef(false);
  const [alertsVersion, setAlertsVersion] = useState(0);

  const [signalsItems, setSignalsItems] = useState<GqlSignal[]>([]);
  const [signalsOffset, setSignalsOffset] = useState(0);
  const [signalsTotalCount, setSignalsTotalCount] = useState(0);
  const [signalsHasMore, setSignalsHasMore] = useState(false);
  const signalsAppending = useRef(false);
  const [signalsVersion, setSignalsVersion] = useState(0);

  // History tab accumulation - same pattern as feeds but HISTORY_PAGE_SIZE = 100
  const [historyAlertsItems, setHistoryAlertsItems] = useState<GqlAlert[]>([]);
  const [historyEventsItems, setHistoryEventsItems] = useState<GqlEvent[]>([]);
  const [historySignalsItems, setHistorySignalsItems] = useState<GqlSignal[]>([]);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [historyAlertsTotalCount, setHistoryAlertsTotalCount] = useState(0);
  const [historyEventsTotalCount, setHistoryEventsTotalCount] = useState(0);
  const [historySignalsTotalCount, setHistorySignalsTotalCount] = useState(0);
  const [historyAlertsHasMore, setHistoryAlertsHasMore] = useState(false);
  const [historyEventsHasMore, setHistoryEventsHasMore] = useState(false);
  const [historySignalsHasMore, setHistorySignalsHasMore] = useState(false);
  const historyAppending = useRef(false);
  const [historyVersion, setHistoryVersion] = useState(0);

  const sharedFilter = {
    teamId: activeTeamId,
    locationId: selectedLocationId ?? undefined,
    from: fromIso,
    to: effectiveTo,
    severityMin,
    severityMax,
    eventTypes: expandedTypeCodes ?? undefined,
  };

  // ── Main feed queries ──────────────────────────────────────────────────────
  // staleTime: Infinity prevents re-fetching on tab switch.
  // _v (version) is part of the React Query cache key, so incrementing it on
  // reset forces a fresh fetch and guarantees the accumulation effect fires
  // via a data reference change. The router schema declares it optional and
  // strips it before forwarding to GraphQL - see alerts.ts.
  const eventsQuery = api.alerts.eventsPage.useQuery(
    { ...sharedFilter, orderBy: EVENT_ORDER_MAP[eventsSort], limit: PAGE_SIZE, offset: eventsOffset, _v: eventsVersion },
    { enabled: locationsReady && activeTab === "events", staleTime: Infinity },
  );
  const alertsQuery = api.alerts.alertsPage.useQuery(
    { ...sharedFilter, status: "published", orderBy: ALERT_ORDER_MAP[alertsSort], limit: PAGE_SIZE, offset: alertsOffset, _v: alertsVersion },
    { enabled: locationsReady && activeTab === "live", staleTime: Infinity },
  );
  const signalsQuery = api.signals.signalsPage.useQuery(
    {
      teamId: activeTeamId,
      locationId: selectedLocationId ?? undefined,
      from: fromIso,
      to: effectiveTo,
      severityMin,
      severityMax,
      sourceNames: activeSources ? [...activeSources] : undefined,
      orderBy: SIGNAL_ORDER_MAP[signalsSort],
      limit: PAGE_SIZE,
      offset: signalsOffset,
      _v: signalsVersion,
    },
    { enabled: locationsReady && activeTab === "signals", staleTime: Infinity },
  );

  // ── Accumulation effects ───────────────────────────────────────────────────
  useEffect(() => {
    if (!eventsQuery.data) return;
    const { items, totalCount, hasMore } = eventsQuery.data;
    setEventsTotalCount(totalCount);
    setEventsHasMore(hasMore);
    if (eventsAppending.current) {
      setEventsItems((prev) => [...prev, ...items]);
      eventsAppending.current = false;
    } else {
      setEventsItems(items);
    }
  }, [eventsQuery.data]);

  useEffect(() => {
    if (!alertsQuery.data) return;
    const { items, totalCount, hasMore } = alertsQuery.data;
    setAlertsTotalCount(totalCount);
    setAlertsHasMore(hasMore);
    if (alertsAppending.current) {
      setAlertsItems((prev) => [...prev, ...items]);
      alertsAppending.current = false;
    } else {
      setAlertsItems(items);
    }
  }, [alertsQuery.data]);

  useEffect(() => {
    if (!signalsQuery.data) return;
    const { items, totalCount, hasMore } = signalsQuery.data;
    setSignalsTotalCount(totalCount);
    setSignalsHasMore(hasMore);
    if (signalsAppending.current) {
      setSignalsItems((prev) => [...prev, ...items]);
      signalsAppending.current = false;
    } else {
      setSignalsItems(items);
    }
  }, [signalsQuery.data]);

  // ── Reset effects ──────────────────────────────────────────────────────────
  // FILTER changes: reset snapshot + items. A new snapshotTime means a new
  // frozen window, so the user sees results from the correct time range.
  // SORT changes: reset items only, keep the existing snapshotTime. This
  // ensures switching sort and switching back always queries the same dataset.
  const FILTER_DEPS = [selectedLocationId, fromIso, toIso, activeTeamId, severityMin, severityMax, expandedTypeCodes?.join(",")] as const;

  // Snapshot is shared across all three feeds, so we set it once. Previously
  // each per-feed reset effect called setSnapshotTime independently, which
  // scheduled three setState calls per filter change with three slightly
  // different timestamps.
  useEffect(() => {
    setSnapshotTime(new Date().toISOString());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...FILTER_DEPS, activeSources]);

  useEffect(() => {
    eventsAppending.current = false;
    setEventsOffset(0);
    setEventsItems([]);
    setEventsVersion((v) => v + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...FILTER_DEPS]);

  useEffect(() => {
    eventsAppending.current = false;
    setEventsOffset(0);
    setEventsItems([]);
    setEventsVersion((v) => v + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventsSort]);

  useEffect(() => {
    alertsAppending.current = false;
    setAlertsOffset(0);
    setAlertsItems([]);
    setAlertsVersion((v) => v + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...FILTER_DEPS]);

  useEffect(() => {
    alertsAppending.current = false;
    setAlertsOffset(0);
    setAlertsItems([]);
    setAlertsVersion((v) => v + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertsSort]);

  useEffect(() => {
    signalsAppending.current = false;
    setSignalsOffset(0);
    setSignalsItems([]);
    setSignalsVersion((v) => v + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...FILTER_DEPS, activeSources]);

  useEffect(() => {
    signalsAppending.current = false;
    setSignalsOffset(0);
    setSignalsItems([]);
    setSignalsVersion((v) => v + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signalsSort]);

  // ── Load-more callbacks ────────────────────────────────────────────────────
  const loadMoreEvents = useCallback(() => {
    if (!eventsHasMore || eventsQuery.isFetching) return;
    eventsAppending.current = true;
    setEventsOffset((prev) => prev + PAGE_SIZE);
  }, [eventsHasMore, eventsQuery.isFetching]);

  const loadMoreAlerts = useCallback(() => {
    if (!alertsHasMore || alertsQuery.isFetching) return;
    alertsAppending.current = true;
    setAlertsOffset((prev) => prev + PAGE_SIZE);
  }, [alertsHasMore, alertsQuery.isFetching]);

  const loadMoreSignals = useCallback(() => {
    if (!signalsHasMore || signalsQuery.isFetching) return;
    signalsAppending.current = true;
    setSignalsOffset((prev) => prev + PAGE_SIZE);
  }, [signalsHasMore, signalsQuery.isFetching]);

  // ── Refresh callbacks: new snapshot + full reset ───────────────────────────
  // Each refresh bumps *Version so the React Query cache key always changes,
  // even for fixed-range presets where effectiveTo wouldn't otherwise move.
  // Without it, the eventsQuery input is byte-identical, React Query returns
  // the cached value, the accumulation effect doesn't fire, and the list
  // we just cleared above stays blank.
  const refreshEvents = useCallback(() => {
    const now = new Date().toISOString();
    setSnapshotTime(now);
    eventsAppending.current = false;
    setEventsOffset(0);
    setEventsItems([]);
    setEventsVersion((v) => v + 1);
  }, []);

  const refreshAlerts = useCallback(() => {
    const now = new Date().toISOString();
    setSnapshotTime(now);
    alertsAppending.current = false;
    setAlertsOffset(0);
    setAlertsItems([]);
    setAlertsVersion((v) => v + 1);
  }, []);

  const refreshSignals = useCallback(() => {
    const now = new Date().toISOString();
    setSnapshotTime(now);
    signalsAppending.current = false;
    setSignalsOffset(0);
    setSignalsItems([]);
    setSignalsVersion((v) => v + 1);
  }, []);

  // ── "New items" polls: lightweight queries with from=snapshotTime ──────────
  // Only the active tab polls so we don't waste bandwidth on hidden tabs.
  // These spread the same filter shape as the main queries so the count
  // reflects what refresh will actually load - otherwise the banner can show
  // "100 new events" while a Critical-only filter would load 0.
  const eventsNewQuery = api.alerts.eventsPage.useQuery(
    {
      ...sharedFilter,
      from: snapshotTime,
      limit: 1,
      orderBy: "LAST_SIGNAL_DESC",
    },
    { enabled: locationsReady && activeTab === "events", refetchInterval: 60_000, staleTime: 0 },
  );
  const alertsNewQuery = api.alerts.alertsPage.useQuery(
    {
      ...sharedFilter,
      status: "published",
      from: snapshotTime,
      limit: 1,
      orderBy: "CREATED_DESC",
    },
    { enabled: locationsReady && activeTab === "live", refetchInterval: 60_000, staleTime: 0 },
  );
  const signalsNewQuery = api.signals.signalsPage.useQuery(
    {
      teamId: activeTeamId,
      locationId: selectedLocationId ?? undefined,
      severityMin,
      severityMax,
      sourceNames: activeSources ? [...activeSources] : undefined,
      from: snapshotTime,
      limit: 1,
      orderBy: "PUBLISHED_DESC",
    },
    { enabled: locationsReady && activeTab === "signals", refetchInterval: 60_000, staleTime: 0 },
  );

  const eventsNewCount = eventsNewQuery.data?.totalCount ?? 0;
  const alertsNewCount = alertsNewQuery.data?.totalCount ?? 0;
  const signalsNewCount = signalsNewQuery.data?.totalCount ?? 0;

  // ── History tab - paginated, 100 per page, all three sources accumulated ──────
  const historyAlertsQuery = api.alerts.alertsPage.useQuery(
    { ...sharedFilter, orderBy: ALERT_ORDER_MAP[historySortOrder], limit: HISTORY_PAGE_SIZE, offset: historyOffset, _v: historyVersion },
    { enabled: locationsReady && activeTab === "history", staleTime: Infinity },
  );
  const historyEventsQuery = api.alerts.eventsPage.useQuery(
    { ...sharedFilter, orderBy: EVENT_ORDER_MAP[historySortOrder], limit: HISTORY_PAGE_SIZE, offset: historyOffset, _v: historyVersion },
    { enabled: locationsReady && activeTab === "history", staleTime: Infinity },
  );
  const historySignalsQuery = api.signals.signalsPage.useQuery(
    { teamId: activeTeamId, locationId: selectedLocationId ?? undefined, from: fromIso, to: effectiveTo, severityMin, severityMax, orderBy: SIGNAL_ORDER_MAP[historySortOrder], limit: HISTORY_PAGE_SIZE, offset: historyOffset, _v: historyVersion },
    { enabled: locationsReady && activeTab === "history", staleTime: Infinity },
  );

  // ── History accumulation effects ───────────────────────────────────────────
  useEffect(() => {
    if (!historyAlertsQuery.data) return;
    const { items, totalCount, hasMore } = historyAlertsQuery.data;
    setHistoryAlertsTotalCount(totalCount);
    setHistoryAlertsHasMore(hasMore);
    if (historyAppending.current) {
      setHistoryAlertsItems((prev) => [...prev, ...items]);
    } else {
      setHistoryAlertsItems(items);
    }
  }, [historyAlertsQuery.data]);

  useEffect(() => {
    if (!historyEventsQuery.data) return;
    const { items, totalCount, hasMore } = historyEventsQuery.data;
    setHistoryEventsTotalCount(totalCount);
    setHistoryEventsHasMore(hasMore);
    if (historyAppending.current) {
      setHistoryEventsItems((prev) => [...prev, ...items]);
    } else {
      setHistoryEventsItems(items);
    }
  }, [historyEventsQuery.data]);

  useEffect(() => {
    if (!historySignalsQuery.data) return;
    const { items, totalCount, hasMore } = historySignalsQuery.data;
    setHistorySignalsTotalCount(totalCount);
    setHistorySignalsHasMore(hasMore);
    if (historyAppending.current) {
      setHistorySignalsItems((prev) => [...prev, ...items]);
      historyAppending.current = false;
    } else {
      setHistorySignalsItems(items);
    }
  }, [historySignalsQuery.data]);

  // Reset history on filter change
  useEffect(() => {
    historyAppending.current = false;
    setHistoryOffset(0);
    setHistoryAlertsItems([]);
    setHistoryEventsItems([]);
    setHistorySignalsItems([]);
    setHistoryVersion((v) => v + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...FILTER_DEPS]);

  // Reset history on sort change
  useEffect(() => {
    historyAppending.current = false;
    setHistoryOffset(0);
    setHistoryAlertsItems([]);
    setHistoryEventsItems([]);
    setHistorySignalsItems([]);
    setHistoryVersion((v) => v + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historySortOrder]);

  const historyHasMore = historyAlertsHasMore || historyEventsHasMore || historySignalsHasMore;
  const historyTotalCount = historyAlertsTotalCount + historyEventsTotalCount + historySignalsTotalCount;
  const historyIsFetching = historyAlertsQuery.isFetching || historyEventsQuery.isFetching || historySignalsQuery.isFetching;

  const loadMoreHistory = useCallback(() => {
    if (!historyHasMore || historyIsFetching) return;
    historyAppending.current = true;
    setHistoryOffset((prev) => prev + HISTORY_PAGE_SIZE);
  }, [historyHasMore, historyIsFetching]);

  const allSources = useMemo(() => {
    const s = new Set<string>();
    alertsItems.forEach((a) => a.event.signals.forEach((sig) => s.add(sig.source.name)));
    eventsItems.forEach((e) => e.signals.forEach((sig) => s.add(sig.source.name)));
    signalsItems.forEach((sig) => s.add(sig.source.name));
    return [...s].sort();
  }, [alertsItems, eventsItems, signalsItems]);

  const focusCountryPCode = countryConfig[selectedCountry]?.pCode;
  const focusCountryName = selectedCountry;

  const clipToRegion = useCallback((markers: CrisisMarker[]): CrisisMarker[] => {
    if (!selectedLocationId) return markers;
    return markers.filter((mk) => {
      if (!mk.locationId) return false;
      if (mk.locationId === selectedLocationId) return true;
      return mk.ancestorIds?.includes(selectedLocationId) ?? false;
    });
  }, [selectedLocationId]);

  const mapMarkers: MapMarker[] = useMemo(() => clipToRegion(alertsToMarkers(alertsItems)), [alertsItems, clipToRegion]);
  const eventMapMarkers: MapMarker[] = useMemo(() => clipToRegion(eventsToMarkers(eventsItems)), [eventsItems, clipToRegion]);
  const signalMapMarkers: MapMarker[] = useMemo(() => clipToRegion(signalsToMarkers(signalsItems)), [signalsItems, clipToRegion]);

  const mapCenter = useMemo<[number, number]>(() => getCenter(selectedCountry), [selectedCountry]);
  const mapZoom = useMemo(() => getZoom(selectedCountry), [selectedCountry]);

  return (
    <Box>
      <PageHeader
        title={t("header.title")}
        subtitle={t("header.title")}
        breadcrumbs={["CLEAR", t("header.breadcrumb")]}
        loading={eventsQuery.isLoading || alertsQuery.isLoading}
      >
        <FilterBar
          country={selectedCountry}
          onCountryChange={(v) => { setSelectedCountry(v); setSelectedRegionId(null); }}
          countries={countries}
          regionsContent={
            <RegionPicker
              states={currentCountryStates}
              value={selectedRegionId}
              onChange={setSelectedRegionId}
              label={t("filters.region")}
            />
          }
          date={selectedDate}
          onDateChange={setSelectedDate}
          dateOptions={localizedDateOptions}
        >
          <Box>
            <Text size="xs" c="#737373" tt="uppercase" style={{ fontSize: 10, letterSpacing: "0.05em", marginBottom: 5 }}>{t("filters.filter")}</Text>
            <Popover opened={filterOpen} onChange={setFilterOpen} position="bottom-start" shadow="md" width={270} withinPortal>
              <Popover.Target>
                <ActionIcon
                  variant="default" size={30}
                  style={{ position: "relative", border: "1px solid #E5E5E5", borderRadius: 4 }}
                  styles={{ root: { overflow: "visible" } }}
                  onClick={() => setFilterOpen((o) => !o)}
                  title={t("filters.filter")}
                  aria-label={t("filters.filter")}
                >
                  <IconFilter size={13} color={isFiltered ? "var(--color-accent)" : "var(--color-text-muted)"} />
                  {isFiltered && (
                    <Box style={{ position: "absolute", top: -4, insetInlineEnd: -4, width: 14, height: 14, borderRadius: "50%", background: "var(--color-accent)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
                      <Text style={{ fontSize: 9, color: "white", fontWeight: 700, lineHeight: 1 }}>{filterCount}</Text>
                    </Box>
                  )}
                </ActionIcon>
              </Popover.Target>
              <Popover.Dropdown p={14} onMouseDown={(e) => e.stopPropagation()}>
                <Group justify="space-between" mb={10}>
                  <Text size="xs" fw={700} tt="uppercase" style={{ fontSize: 10, letterSpacing: "0.06em" }}>{t("filters.title")}</Text>
                  {isFiltered && (
                    <Button size="compact-xs" variant="subtle" color="gray" onClick={() => { setActiveSeverities(new Set(["critical", "high", "medium", "low"])); setSelectedTypeFilters([]); setActiveSources(null); }}>
                      {t("filters.clearAll")}
                    </Button>
                  )}
                </Group>
                <Text size="xs" fw={700} c="var(--color-text-primary)" mb={8}>{t("filters.severity")}</Text>
                <Group gap={6} mb={12} wrap="wrap">
                  {(["critical", "high", "medium", "low"] as const).map((sev) => {
                    const active = activeSeverities.has(sev);
                    return (
                      <Badge
                        key={sev} size="sm"
                        variant={active ? "filled" : "light"}
                        color={sev === "critical" ? "red" : sev === "high" ? "orange" : sev === "medium" ? "yellow" : "green"}
                        style={{ cursor: "pointer", textTransform: "capitalize" }}
                        onClick={() => setActiveSeverities((prev) => {
                          const next = new Set(prev);
                          next.has(sev) ? next.delete(sev) : next.add(sev);
                          return next;
                        })}
                      >
                        {t(`filters.severities.${sev}`)}
                      </Badge>
                    );
                  })}
                </Group>
                <Divider color="var(--color-border)" mb={10} />
                <Text size="xs" fw={700} c="var(--color-text-primary)" mb={8}>{t("filters.eventType")}</Text>
                <DisasterTypePicker hierarchy={hierarchy} selected={selectedTypeFilters} onChange={setSelectedTypeFilters} size="xs" />
                {allSources.length > 0 && (
                  <>
                    <Divider color="var(--color-border)" my={10} />
                    <Text size="xs" fw={700} c="var(--color-text-primary)" mb={8}>{t("filters.source")}</Text>
                    <Group gap={6} wrap="wrap">
                      {allSources.map((src) => {
                        const active = activeSources === null || activeSources.has(src);
                        return (
                          <Badge
                            key={src} size="sm"
                            variant={active ? "filled" : "light"}
                            color={active ? "dark" : "gray"}
                            style={{ cursor: "pointer", textTransform: "none" }}
                            onClick={() => setActiveSources((prev) => {
                              const base = prev ?? new Set(allSources);
                              const next = new Set(base);
                              next.has(src) ? next.delete(src) : next.add(src);
                              return next.size === allSources.length ? null : next;
                            })}
                          >
                            {src}
                          </Badge>
                        );
                      })}
                    </Group>
                  </>
                )}
              </Popover.Dropdown>
            </Popover>
          </Box>
        </FilterBar>
        <Group gap={8}>
          <Button
            size="xs"
            leftSection={<IconPlus size={14} />}
            onClick={openCreateModal}
            style={{ background: "#E85D3D", borderColor: "#E85D3D", fontSize: 13 }}
          >
            {t("actions.createSignal")}
          </Button>
        </Group>
      </PageHeader>

      <Box px={{ base: 12, sm: 24 }} py={{ base: 16, sm: 24 }}>
        <Tabs
          value={activeTab}
          onChange={handleTabChange}
          mb={{ base: 16, sm: 24 }}
          styles={{
            tab: {
              fontSize: 13,
              fontWeight: 500,
              flex: 1,
              border: "none",
              paddingInline: 8,
              transition: "background-color 800ms cubic-bezier(0.4, 0, 0.2, 1)",
              "&[data-active]": {
                backgroundColor: "#f1f3f5",
              },
              "&:hover:not([data-active])": {
                backgroundColor: "#f8f9fa",
                transition: "background-color 200ms ease-out",
              },
            },
            list: {
              borderBottom: "none",
            },
          }}
        >
          <Tabs.List style={{ position: "relative", display: "flex", width: "100%" }}>
            <Tabs.Tab value="live">{t("tabs.alerts")}</Tabs.Tab>
            <Tabs.Tab value="events">{t("tabs.events")}</Tabs.Tab>
            <Tabs.Tab value="signals">{t("tabs.signals")}</Tabs.Tab>
            <Tabs.Tab value="history">{t("tabs.history")}</Tabs.Tab>
            <Box
              style={{
                position: "absolute",
                bottom: 0,
                left:
                  activeTab === "live" ? "0%" :
                  activeTab === "events" ? "25%" :
                  activeTab === "signals" ? "50%" : "75%",
                width: "25%",
                height: 2,
                background: "var(--color-accent)",
                transition: "left 350ms cubic-bezier(0.4, 0, 0.2, 1)",
                zIndex: 10,
              }}
            />
          </Tabs.List>
        </Tabs>

        {activeTab === "live" && (
          <LiveAlertsTab
            alerts={alertsItems}
            alertsLoading={alertsQuery.isLoading}
            isFetchingMore={alertsQuery.isFetching && alertsAppending.current}
            hasMore={alertsHasMore}
            totalCount={alertsTotalCount}
            newCount={alertsNewCount}
            sortOrder={alertsSort}
            onSortChange={setAlertsSort}
            onLoadMore={loadMoreAlerts}
            onRefresh={refreshAlerts}
            mapMarkers={mapMarkers}
            mapCenter={mapCenter}
            mapZoom={mapZoom}
            fitBoundsGeometry={fitBoundsGeometry}
            adminBoundaries={adminBoundaries}
            adminBoundaryLevel={adminBoundaryLevel as 1 | 2 | undefined}
            boundaryLevel={boundaryLevel}
            onBoundaryLevelChange={setBoundaryLevel}
            focusCountryPCode={focusCountryPCode}
            focusCountryName={focusCountryName}
            focusCountryGeometry={focusCountryGeometry}
            activeSeverities={activeSeverities}
            expandedTypeCodes={expandedTypeCodes}
            activeSources={activeSources}
          />
        )}

        {activeTab === "events" && (
          <EventsTab
            events={eventsItems}
            loading={eventsQuery.isLoading}
            isFetchingMore={eventsQuery.isFetching && eventsAppending.current}
            hasMore={eventsHasMore}
            totalCount={eventsTotalCount}
            newCount={eventsNewCount}
            sortOrder={eventsSort}
            onSortChange={setEventsSort}
            onLoadMore={loadMoreEvents}
            onRefresh={refreshEvents}
            mapMarkers={eventMapMarkers}
            mapCenter={mapCenter}
            mapZoom={mapZoom}
            fitBoundsGeometry={fitBoundsGeometry}
            adminBoundaries={adminBoundaries}
            adminBoundaryLevel={adminBoundaryLevel as 1 | 2 | undefined}
            boundaryLevel={boundaryLevel}
            onBoundaryLevelChange={setBoundaryLevel}
            focusCountryPCode={focusCountryPCode}
            focusCountryName={focusCountryName}
            focusCountryGeometry={focusCountryGeometry}
            activeSeverities={activeSeverities}
            expandedTypeCodes={expandedTypeCodes}
            activeSources={activeSources}
          />
        )}

        {activeTab === "signals" && (
          <SignalsTab
            signals={signalsItems}
            loading={signalsQuery.isLoading}
            isFetchingMore={signalsQuery.isFetching && signalsAppending.current}
            hasMore={signalsHasMore}
            totalCount={signalsTotalCount}
            newCount={signalsNewCount}
            sortOrder={signalsSort}
            onSortChange={setSignalsSort}
            onLoadMore={loadMoreSignals}
            onRefresh={refreshSignals}
            mapMarkers={signalMapMarkers}
            mapCenter={mapCenter}
            mapZoom={mapZoom}
            fitBoundsGeometry={fitBoundsGeometry}
            adminBoundaries={adminBoundaries}
            adminBoundaryLevel={adminBoundaryLevel as 1 | 2 | undefined}
            boundaryLevel={boundaryLevel}
            onBoundaryLevelChange={setBoundaryLevel}
            focusCountryPCode={focusCountryPCode}
            focusCountryName={focusCountryName}
            focusCountryGeometry={focusCountryGeometry}
            activeSeverities={activeSeverities}
            activeSources={activeSources}
          />
        )}

        {activeTab === "history" && (
          <HistoryTab
            alerts={historyAlertsItems}
            events={historyEventsItems}
            signals={historySignalsItems}
            loading={historyAlertsQuery.isLoading || historyEventsQuery.isLoading || historySignalsQuery.isLoading}
            hasMore={historyHasMore}
            isFetchingMore={historyIsFetching && historyAppending.current}
            totalCount={historyTotalCount}
            onLoadMore={loadMoreHistory}
            sortOrder={historySortOrder}
            onSortChange={setHistorySortOrder}
          />
        )}
      </Box>

      <CreateSignalModal opened={createModalOpened} onClose={closeCreateModal} />
    </Box>
  );
}

export default function DetectionPage() {
  return (
    <Suspense>
      <DetectionPageContent />
    </Suspense>
  );
}
