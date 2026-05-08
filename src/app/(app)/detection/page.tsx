"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Box, Tabs, Button, Group, Popover, Text, Badge, ActionIcon, Divider } from "@mantine/core";
import { IconFilter } from "@tabler/icons-react";
import { DisasterTypePicker, expandSelectionsToCodes } from "~/components/disaster-type-picker";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { useTeam } from "~/providers/team-provider";
import type { MapMarker } from "~/components/map/crisis-map";
import { countryConfig, dateOptions, parseDateFilter } from "~/lib/constants/country-config";
import { useLocations } from "~/hooks/use-locations";
import { alertsToMarkers, alertsToRegions, eventsToMarkers, eventsToRegions, signalsToMarkers, type CrisisMarker } from "../map/_components/map-markers-data";
import { PageHeader, FilterBar } from "~/components/ui";
import type { GqlEvent, GqlAlert, GqlSignal } from "~/lib/types/graphql";

import { DetectionKpiRow } from "~/components/detection/detection-kpi-row";
import { LiveAlertsTab, type AlertSortOrder } from "./_components/live-alerts-tab";
import { HistoryTab } from "./_components/history-tab";
import { EventsTab, type EventSortOrder } from "./_components/events-tab";
import { SignalsTab, type SignalSortOrder } from "./_components/signals-tab";
import { CreateSignalModal } from "~/components/create-signal-modal";

const PAGE_SIZE = 25;

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
// "source" sort has no API equivalent; server gets PUBLISHED_DESC and the
// tab applies a client-side localeCompare on top of the loaded page.
const SIGNAL_ORDER_MAP: Record<SignalSortOrder, SignalOrderBy> = {
  "newest":   "PUBLISHED_DESC",
  "oldest":   "PUBLISHED_ASC",
  "sev-desc": "SEVERITY_DESC",
  "sev-asc":  "SEVERITY_ASC",
  "source":   "PUBLISHED_DESC",
};

export default function DetectionPage() {
  const [activeTab, setActiveTab] = useState<string | null>("events");
  const [selectedCountry, setSelectedCountry] = useState("Sudan");
  const [selectedRegion, setSelectedRegion] = useState("All Regions");
  const [selectedDate, setSelectedDate] = useState("Last 30 days");
  const [createModalOpened, { open: openCreateModal, close: closeCreateModal }] = useDisclosure(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeSeverities, setActiveSeverities] = useState<Set<string>>(new Set(["critical", "high", "medium", "low"]));
  const [selectedTypeFilters, setSelectedTypeFilters] = useState<string[]>([]);
  const hierarchyQuery = api.alerts.getDisasterTypeHierarchy.useQuery(undefined, { staleTime: Infinity, refetchOnWindowFocus: false });
  const hierarchy = hierarchyQuery.data ?? [];
  const expandedTypeCodes = selectedTypeFilters.length > 0 ? expandSelectionsToCodes(selectedTypeFilters, hierarchy) : null;
  const [activeSources, setActiveSources] = useState<Set<string> | null>(null);
  const isFiltered = activeSeverities.size < 4 || selectedTypeFilters.length > 0 || activeSources !== null;
  const filterCount = (activeSeverities.size < 4 ? 1 : 0) + (selectedTypeFilters.length > 0 ? 1 : 0) + (activeSources !== null ? 1 : 0);

  const { activeTeamId } = useTeam();
  const { countries, getRegions, getCenter, getZoom, getLocationId } = useLocations();

  const [boundaryLevel, setBoundaryLevel] = useState<"none" | "A0" | "A1" | "A2">("A1");
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
    if (selectedRegion !== "All Regions") return [];
    if (boundaryLevel === "A1") return a1BoundaryQuery.data ?? [];
    if (boundaryLevel === "A2") return a2BoundaryQuery.data ?? [];
    return [];
  }, [selectedRegion, boundaryLevel, a1BoundaryQuery.data, a2BoundaryQuery.data]);
  const adminBoundaryLevel = boundaryLevel === "A1" ? 1 : boundaryLevel === "A2" ? 2 : undefined;

  const selectedRegionId = useMemo(
    () => (selectedRegion !== "All Regions" ? getLocationId(selectedRegion) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedRegion, getLocationId],
  );
  const regionQuery = api.locations.getById.useQuery(
    { id: selectedRegionId! },
    { enabled: !!selectedRegionId, staleTime: 1000 * 60 * 60, refetchOnWindowFocus: false },
  );
  const fitBoundsGeometry = useMemo(
    () => (selectedRegion !== "All Regions" ? (regionQuery.data?.geometry ?? null) : null),
    [selectedRegion, regionQuery.data],
  );

  const selectedLocationId = useMemo(() => {
    if (selectedRegion !== "All Regions") return getLocationId(selectedRegion);
    return getLocationId(selectedCountry);
  }, [selectedCountry, selectedRegion, getLocationId]);

  const dateRange = useMemo(() => parseDateFilter(selectedDate), [selectedDate]);
  const fromIso = useMemo(() => dateRange.start.toISOString(), [dateRange]);
  const toIso = useMemo(() => dateRange.end.toISOString(), [dateRange]);

  // Snapshot time: freezes the upper bound of all feed queries so that new
  // items arriving mid-session don't shift offsets and cause duplicates when
  // the user loads more. Resets whenever filters or sort change.
  const [snapshotTime, setSnapshotTime] = useState(() => new Date().toISOString());
  // effectiveTo = min(dateFilter.to, snapshotTime) so custom date-range upper
  // bounds are still respected when they're earlier than the snapshot.
  const effectiveTo = toIso < snapshotTime ? toIso : snapshotTime;

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

  // ── Per-feed accumulated items + offset ───────────────────────────────────
  const [eventsItems, setEventsItems] = useState<GqlEvent[]>([]);
  const [eventsOffset, setEventsOffset] = useState(0);
  const [eventsTotalCount, setEventsTotalCount] = useState(0);
  const [eventsHasMore, setEventsHasMore] = useState(false);
  const eventsAppending = useRef(false);

  const [alertsItems, setAlertsItems] = useState<GqlAlert[]>([]);
  const [alertsOffset, setAlertsOffset] = useState(0);
  const [alertsTotalCount, setAlertsTotalCount] = useState(0);
  const [alertsHasMore, setAlertsHasMore] = useState(false);
  const alertsAppending = useRef(false);

  const [signalsItems, setSignalsItems] = useState<GqlSignal[]>([]);
  const [signalsOffset, setSignalsOffset] = useState(0);
  const [signalsTotalCount, setSignalsTotalCount] = useState(0);
  const [signalsHasMore, setSignalsHasMore] = useState(false);
  const signalsAppending = useRef(false);

  const sharedFilter = {
    teamId: activeTeamId,
    locationId: selectedLocationId ?? undefined,
    from: fromIso,
    to: effectiveTo,
    severityMin,
    severityMax,
    eventTypes: expandedTypeCodes ?? undefined,
  };

  // ── Main feed queries (staleTime: Infinity so tab switches don't re-fetch) ─
  const eventsQuery = api.alerts.eventsPage.useQuery(
    { ...sharedFilter, orderBy: EVENT_ORDER_MAP[eventsSort], limit: PAGE_SIZE, offset: eventsOffset },
    { enabled: activeTab === "events", staleTime: Infinity },
  );
  const alertsQuery = api.alerts.alertsPage.useQuery(
    { ...sharedFilter, status: "published", orderBy: ALERT_ORDER_MAP[alertsSort], limit: PAGE_SIZE, offset: alertsOffset },
    { enabled: activeTab === "live", staleTime: Infinity },
  );
  const signalsQuery = api.alerts.signalsPage.useQuery(
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
    },
    { enabled: activeTab === "signals", staleTime: Infinity },
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

  useEffect(() => {
    setSnapshotTime(new Date().toISOString());
    eventsAppending.current = false;
    setEventsOffset(0);
    setEventsItems([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...FILTER_DEPS]);

  useEffect(() => {
    eventsAppending.current = false;
    setEventsOffset(0);
    setEventsItems([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventsSort]);

  useEffect(() => {
    setSnapshotTime(new Date().toISOString());
    alertsAppending.current = false;
    setAlertsOffset(0);
    setAlertsItems([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...FILTER_DEPS]);

  useEffect(() => {
    alertsAppending.current = false;
    setAlertsOffset(0);
    setAlertsItems([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertsSort]);

  useEffect(() => {
    setSnapshotTime(new Date().toISOString());
    signalsAppending.current = false;
    setSignalsOffset(0);
    setSignalsItems([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...FILTER_DEPS, activeSources]);

  useEffect(() => {
    signalsAppending.current = false;
    setSignalsOffset(0);
    setSignalsItems([]);
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
  const refreshEvents = useCallback(() => {
    const now = new Date().toISOString();
    setSnapshotTime(now);
    eventsAppending.current = false;
    setEventsOffset(0);
    setEventsItems([]);
  }, []);

  const refreshAlerts = useCallback(() => {
    const now = new Date().toISOString();
    setSnapshotTime(now);
    alertsAppending.current = false;
    setAlertsOffset(0);
    setAlertsItems([]);
  }, []);

  const refreshSignals = useCallback(() => {
    const now = new Date().toISOString();
    setSnapshotTime(now);
    signalsAppending.current = false;
    setSignalsOffset(0);
    setSignalsItems([]);
  }, []);

  // ── "New items" polls: lightweight queries with from=snapshotTime ──────────
  // Only the active tab polls so we don't waste bandwidth on hidden tabs.
  const eventsNewQuery = api.alerts.eventsPage.useQuery(
    {
      teamId: activeTeamId,
      locationId: selectedLocationId ?? undefined,
      from: snapshotTime,
      limit: 1,
      orderBy: "LAST_SIGNAL_DESC",
    },
    { enabled: activeTab === "events", refetchInterval: 60_000, staleTime: 0 },
  );
  const alertsNewQuery = api.alerts.alertsPage.useQuery(
    {
      teamId: activeTeamId,
      locationId: selectedLocationId ?? undefined,
      from: snapshotTime,
      status: "published",
      limit: 1,
      orderBy: "CREATED_DESC",
    },
    { enabled: activeTab === "live", refetchInterval: 60_000, staleTime: 0 },
  );
  const signalsNewQuery = api.alerts.signalsPage.useQuery(
    {
      teamId: activeTeamId,
      locationId: selectedLocationId ?? undefined,
      from: snapshotTime,
      limit: 1,
      orderBy: "PUBLISHED_DESC",
    },
    { enabled: activeTab === "signals", refetchInterval: 60_000, staleTime: 0 },
  );

  const eventsNewCount = eventsNewQuery.data?.totalCount ?? 0;
  const alertsNewCount = alertsNewQuery.data?.totalCount ?? 0;
  const signalsNewCount = signalsNewQuery.data?.totalCount ?? 0;

  // ── History tab (intentionally unpaginated - roll-up view) ─────────────────
  const historyQuery = api.alerts.getAlerts.useQuery(
    { activeOnly: false, teamId: activeTeamId },
    { enabled: activeTab === "history" },
  );
  const historyEventsQuery = api.events.list.useQuery(
    { teamId: activeTeamId },
    { enabled: activeTab === "history" },
  );
  const historySignalsQuery = api.signals.list.useQuery(
    { teamId: activeTeamId },
    { enabled: activeTab === "history" },
  );

  const regions = getRegions(selectedCountry);

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
  const mapRegions = useMemo(() => alertsToRegions(alertsItems), [alertsItems]);
  const eventMapMarkers: MapMarker[] = useMemo(() => clipToRegion(eventsToMarkers(eventsItems)), [eventsItems, clipToRegion]);
  const eventMapRegions = useMemo(() => eventsToRegions(eventsItems), [eventsItems]);
  const signalMapMarkers: MapMarker[] = useMemo(() => clipToRegion(signalsToMarkers(signalsItems)), [signalsItems, clipToRegion]);

  const mapCenter = useMemo<[number, number]>(() => getCenter(selectedCountry), [selectedCountry]);
  const mapZoom = useMemo(() => getZoom(selectedCountry), [selectedCountry]);

  return (
    <Box>
      <PageHeader
        title="Event Detection"
        subtitle="Event Detection"
        breadcrumbs={["CLEAR", "Detection"]}
        loading={eventsQuery.isLoading || alertsQuery.isLoading}
      >
        <FilterBar
          country={selectedCountry}
          onCountryChange={(v) => { setSelectedCountry(v); setSelectedRegion("All Regions"); }}
          region={selectedRegion}
          onRegionChange={setSelectedRegion}
          countries={countries}
          regions={regions}
          date={selectedDate}
          onDateChange={setSelectedDate}
          dateOptions={dateOptions}
        >
          <Box>
            <Text size="xs" c="#737373" tt="uppercase" style={{ fontSize: 10, letterSpacing: "0.05em", marginBottom: 5 }}>Filter</Text>
            <Popover opened={filterOpen} onChange={setFilterOpen} position="bottom-start" shadow="md" width={270} withinPortal>
              <Popover.Target>
                <ActionIcon
                  variant="default" size={30}
                  style={{ position: "relative", border: "1px solid #E5E5E5", borderRadius: 4 }}
                  onClick={() => setFilterOpen((o) => !o)}
                  title="Filter"
                >
                  <IconFilter size={13} color={isFiltered ? "var(--color-accent)" : "var(--color-text-muted)"} />
                  {isFiltered && (
                    <Box style={{ position: "absolute", top: -4, right: -4, width: 14, height: 14, borderRadius: "50%", background: "var(--color-accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 9, color: "white", fontWeight: 700, lineHeight: 1 }}>{filterCount}</Text>
                    </Box>
                  )}
                </ActionIcon>
              </Popover.Target>
              <Popover.Dropdown p={14} onMouseDown={(e) => e.stopPropagation()}>
                <Group justify="space-between" mb={10}>
                  <Text size="xs" fw={700} tt="uppercase" style={{ fontSize: 10, letterSpacing: "0.06em" }}>Filters</Text>
                  {isFiltered && (
                    <Button size="compact-xs" variant="subtle" color="gray" onClick={() => { setActiveSeverities(new Set(["critical", "high", "medium", "low"])); setSelectedTypeFilters([]); setActiveSources(null); }}>
                      Clear all
                    </Button>
                  )}
                </Group>
                <Text size="xs" fw={700} c="var(--color-text-primary)" mb={8}>Severity</Text>
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
                        {sev.charAt(0).toUpperCase() + sev.slice(1)}
                      </Badge>
                    );
                  })}
                </Group>
                <Divider color="var(--color-border)" mb={10} />
                <Text size="xs" fw={700} c="var(--color-text-primary)" mb={8}>Event Type</Text>
                <DisasterTypePicker hierarchy={hierarchy} selected={selectedTypeFilters} onChange={setSelectedTypeFilters} size="xs" />
                {allSources.length > 0 && (
                  <>
                    <Divider color="var(--color-border)" my={10} />
                    <Text size="xs" fw={700} c="var(--color-text-primary)" mb={8}>Source</Text>
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
            Create Signal
          </Button>
        </Group>
      </PageHeader>

      <Box p={24}>
        <Tabs value={activeTab} onChange={setActiveTab} mb={24} styles={{ tab: { fontSize: 13, fontWeight: 500 } }}>
          <Tabs.List>
            <Tabs.Tab value="live">Alerts</Tabs.Tab>
            <Tabs.Tab value="events">Events</Tabs.Tab>
            <Tabs.Tab value="signals">Signals</Tabs.Tab>
            <Tabs.Tab value="history">History</Tabs.Tab>
          </Tabs.List>
        </Tabs>

        <DetectionKpiRow
          country={selectedCountry}
          alerts={alertsItems}
          events={eventsItems}
          onNavigateToAlerts={() => setActiveTab("live")}
        />

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
            mapRegions={mapRegions}
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
            mapRegions={eventMapRegions}
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
            alerts={historyQuery.data?.alerts ?? []}
            events={historyEventsQuery.data ?? []}
            signals={historySignalsQuery.data ?? []}
            loading={historyQuery.isLoading || historyEventsQuery.isLoading || historySignalsQuery.isLoading}
          />
        )}
      </Box>

      <CreateSignalModal opened={createModalOpened} onClose={closeCreateModal} />
    </Box>
  );
}
