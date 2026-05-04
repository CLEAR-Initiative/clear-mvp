"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Box, Tabs, Button, Group, Pagination, Popover, Text, Badge, ActionIcon, Divider } from "@mantine/core";
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

import { DetectionKpiRow } from "~/components/detection/detection-kpi-row";
import { LiveAlertsTab } from "./_components/live-alerts-tab";
import { HistoryTab } from "./_components/history-tab";
import { EventsTab } from "./_components/events-tab";
import { SignalsTab } from "./_components/signals-tab";
import { CreateSignalModal } from "~/components/create-signal-modal";

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

  // Fetch L0 geometry to use as the country mask - avoids Mapbox tileset inaccuracies (e.g. Sudan Red Sea cutoff)
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
    // Hide admin boundary lines when a region is focused - the region highlight already shows the boundary.
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
  // ── Pagination state (1-based to match Mantine's <Pagination>) ───────
  const PAGE_SIZE = 25;
  const [alertsPageNum, setAlertsPageNum] = useState(1);
  const [eventsPageNum, setEventsPageNum] = useState(1);
  const [signalsPageNum, setSignalsPageNum] = useState(1);

  // Resolve the focused location id (region overrides country). Drives the
  // server-side filter AND the client-side `clipToRegion` map clip.
  const selectedLocationId = useMemo(() => {
    if (selectedRegion !== "All Regions") return getLocationId(selectedRegion);
    return getLocationId(selectedCountry);
  }, [selectedCountry, selectedRegion, getLocationId]);

  // ── Server-side filter shape ─────────────────────────────────────────
  // Date preset → from/to bounds. Recompute only when the preset string
  // changes; the underlying dates are stable per preset.
  const dateRange = useMemo(() => parseDateFilter(selectedDate), [selectedDate]);
  const fromIso = useMemo(() => dateRange.start.toISOString(), [dateRange]);
  const toIso = useMemo(() => dateRange.end.toISOString(), [dateRange]);

  // Convert the severity Set ("critical"|"high"|"medium"|"low") to the
  // numeric (min, max) range the API takes. We only push to the server
  // when the user has actually narrowed the set — full-set means "no
  // filter". Tabs still apply their own client-side severity filter, so
  // a non-contiguous selection (e.g. just critical+low) over-fetches by
  // one step and gets trimmed in the tab.
  const SEV_NUM: Record<string, number> = { low: 2, medium: 3, high: 4, critical: 5 };
  const { severityMin, severityMax } = useMemo(() => {
    if (activeSeverities.size === 0 || activeSeverities.size === 4) {
      return { severityMin: undefined, severityMax: undefined };
    }
    const nums = [...activeSeverities].map((s) => SEV_NUM[s]).filter((n): n is number => typeof n === "number");
    if (nums.length === 0) return { severityMin: undefined, severityMax: undefined };
    // "low" maps to severity ≤ 2 — push min down to 1 so we catch severity 1 too.
    const min = Math.min(...nums) === 2 ? 1 : Math.min(...nums);
    return { severityMin: min, severityMax: Math.max(...nums) };
  }, [activeSeverities]);

  // Reset page → 1 whenever the underlying filter set changes — otherwise
  // narrowing the filter would leave the user on a non-existent page.
  useEffect(() => setAlertsPageNum(1), [
    selectedLocationId, fromIso, toIso, activeTeamId,
    severityMin, severityMax, expandedTypeCodes,
  ]);
  useEffect(() => setEventsPageNum(1), [
    selectedLocationId, fromIso, toIso, activeTeamId,
    severityMin, severityMax, expandedTypeCodes,
  ]);
  useEffect(() => setSignalsPageNum(1), [
    selectedLocationId, fromIso, toIso, activeTeamId,
    severityMin, severityMax, activeSources,
  ]);

  const sharedFilter = {
    teamId: activeTeamId,
    locationId: selectedLocationId ?? undefined,
    from: fromIso,
    to: toIso,
    severityMin,
    severityMax,
    eventTypes: expandedTypeCodes ?? undefined,
  };

  const alertsQuery = api.alerts.alertsPage.useQuery(
    {
      ...sharedFilter,
      status: "published",
      orderBy: "SEVERITY_DESC",
      limit: PAGE_SIZE,
      offset: (alertsPageNum - 1) * PAGE_SIZE,
    },
    { enabled: activeTab === "live" },
  );
  const eventsQuery = api.alerts.eventsPage.useQuery(
    {
      ...sharedFilter,
      orderBy: "SEVERITY_DESC",
      limit: PAGE_SIZE,
      offset: (eventsPageNum - 1) * PAGE_SIZE,
    },
    { enabled: activeTab === "events" },
  );
  // Signals don't carry an event-type array — drop eventTypes and forward
  // sourceNames (which alerts/events don't yet support server-side).
  const signalsQuery = api.alerts.signalsPage.useQuery(
    {
      teamId: activeTeamId,
      locationId: selectedLocationId ?? undefined,
      from: fromIso,
      to: toIso,
      severityMin,
      severityMax,
      sourceNames: activeSources ? [...activeSources] : undefined,
      orderBy: "PUBLISHED_DESC",
      limit: PAGE_SIZE,
      offset: (signalsPageNum - 1) * PAGE_SIZE,
    },
    { enabled: activeTab === "signals" },
  );

  // History tab keeps the existing unpaginated queries — it's a roll-up
  // view and isn't part of the pagination scope.
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

  // Source list for the popover. Only tells us about sources that show up
  // in the currently-loaded pages — when more pages load, more sources
  // appear. Acceptable trade-off vs an unpaginated "all sources" probe.
  const allSources = useMemo(() => {
    const s = new Set<string>();
    (alertsQuery.data?.items ?? []).forEach((a) => a.event.signals.forEach((sig) => s.add(sig.source.name)));
    (eventsQuery.data?.items ?? []).forEach((e) => e.signals.forEach((sig) => s.add(sig.source.name)));
    (signalsQuery.data?.items ?? []).forEach((sig) => s.add(sig.source.name));
    return [...s].sort();
  }, [alertsQuery.data, eventsQuery.data, signalsQuery.data]);

  const focusCountryPCode = countryConfig[selectedCountry]?.pCode;
  const focusCountryName = selectedCountry;

  // location + date are now applied server-side via the *Page query inputs.
  // The page just unwraps `items` and lets the tabs apply any remaining
  // client-side niceties (sort/search/source filter).
  const alerts = alertsQuery.data?.items ?? [];
  const filteredEvents = eventsQuery.data?.items ?? [];
  const filteredSignals = signalsQuery.data?.items ?? [];
  const historyAlerts = historyQuery.data?.alerts ?? [];

  const alertsTotalPages = Math.max(1, Math.ceil((alertsQuery.data?.totalCount ?? 0) / PAGE_SIZE));
  const eventsTotalPages = Math.max(1, Math.ceil((eventsQuery.data?.totalCount ?? 0) / PAGE_SIZE));
  const signalsTotalPages = Math.max(1, Math.ceil((signalsQuery.data?.totalCount ?? 0) / PAGE_SIZE));

  // Secondary clip: drop markers whose plotted Point location is outside the selected region.
  // An event can pass the text filter (via generalLocation) but be plotted at originLocation
  // coordinates that are in a different state entirely.
  const clipToRegion = useCallback((markers: CrisisMarker[]): CrisisMarker[] => {
    if (!selectedLocationId) return markers;
    return markers.filter((mk) => {
      if (!mk.locationId) return false;
      if (mk.locationId === selectedLocationId) return true;
      return mk.ancestorIds?.includes(selectedLocationId) ?? false;
    });
  }, [selectedLocationId]);

  const mapMarkers: MapMarker[] = useMemo(() => clipToRegion(alertsToMarkers(alerts)), [alerts, clipToRegion]);
  const mapRegions = useMemo(() => alertsToRegions(alerts), [alerts]);
  const eventMapMarkers: MapMarker[] = useMemo(
    () => clipToRegion(eventsToMarkers(filteredEvents)),
    [filteredEvents, clipToRegion],
  );
  const eventMapRegions = useMemo(() => eventsToRegions(filteredEvents), [filteredEvents]);
  const signalMapMarkers: MapMarker[] = useMemo(
    () => clipToRegion(signalsToMarkers(filteredSignals)),
    [filteredSignals, clipToRegion],
  );
  const mapCenter = useMemo<[number, number]>(() => getCenter(selectedCountry), [selectedCountry]);
  const mapZoom = useMemo(() => getZoom(selectedCountry), [selectedCountry]);

  const handleAlertCreated = useCallback(() => {
    void alertsQuery.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box>
      <PageHeader
        title="Event Detection"
        subtitle="Event Detection"
        breadcrumbs={["CLEAR", "Detection"]}
        loading={alertsQuery.isLoading}
      >
        <FilterBar
          country={selectedCountry}
          onCountryChange={(v) => {
            setSelectedCountry(v);
            setSelectedRegion("All Regions");
          }}
          region={selectedRegion}
          onRegionChange={setSelectedRegion}
          countries={countries}
          regions={regions}
          date={selectedDate}
          onDateChange={setSelectedDate}
          dateOptions={dateOptions}
        >
          {/* Filter popover - sits inline after Date at same height */}
          <Box>
            <Text size="xs" c="#737373" tt="uppercase" style={{ fontSize: 10, letterSpacing: "0.05em", marginBottom: 5 }}>Filter</Text>
            <Popover
              opened={filterOpen}
              onChange={setFilterOpen}
              position="bottom-start"
              shadow="md"
              width={270}
              withinPortal
            >
              <Popover.Target>
                <ActionIcon
                  variant="default"
                  size={30}
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
                        key={sev}
                        size="sm"
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
                <DisasterTypePicker
                  hierarchy={hierarchy}
                  selected={selectedTypeFilters}
                  onChange={setSelectedTypeFilters}
                  size="xs"
                />
                {allSources.length > 0 && (
                  <>
                    <Divider color="var(--color-border)" my={10} />
                    <Text size="xs" fw={700} c="var(--color-text-primary)" mb={8}>Source</Text>
                    <Group gap={6} wrap="wrap">
                      {allSources.map((src) => {
                        const active = activeSources === null || activeSources.has(src);
                        return (
                          <Badge
                            key={src}
                            size="sm"
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
        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          mb={24}
          styles={{ tab: { fontSize: 13, fontWeight: 500 } }}
        >
          <Tabs.List>
            <Tabs.Tab value="live">Alerts</Tabs.Tab>
            <Tabs.Tab value="events">Events</Tabs.Tab>
            <Tabs.Tab value="signals">Signals</Tabs.Tab>
            <Tabs.Tab value="history">History</Tabs.Tab>
          </Tabs.List>
        </Tabs>

        <DetectionKpiRow
          country={selectedCountry}
          alerts={alerts}
          events={filteredEvents}
          onNavigateToAlerts={() => setActiveTab("live")}
        />

        {activeTab === "live" && (
          <>
            <LiveAlertsTab
              alerts={alerts}
              alertsLoading={alertsQuery.isLoading}
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
            <PaginationFooter
              page={alertsPageNum}
              total={alertsQuery.data?.totalCount ?? 0}
              totalPages={alertsTotalPages}
              pageSize={PAGE_SIZE}
              onChange={setAlertsPageNum}
            />
          </>
        )}

        {activeTab === "signals" && (
          <>
            <SignalsTab
              signals={filteredSignals}
              loading={signalsQuery.isLoading}
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
            <PaginationFooter
              page={signalsPageNum}
              total={signalsQuery.data?.totalCount ?? 0}
              totalPages={signalsTotalPages}
              pageSize={PAGE_SIZE}
              onChange={setSignalsPageNum}
            />
          </>
        )}

        {activeTab === "history" && (
          <HistoryTab
            alerts={historyAlerts}
            events={historyEventsQuery.data ?? []}
            signals={historySignalsQuery.data ?? []}
            loading={
              historyQuery.isLoading ||
              historyEventsQuery.isLoading ||
              historySignalsQuery.isLoading
            }
          />
        )}

        {activeTab === "events" && (
          <>
            <EventsTab
              events={filteredEvents}
              loading={eventsQuery.isLoading}
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
            <PaginationFooter
              page={eventsPageNum}
              total={eventsQuery.data?.totalCount ?? 0}
              totalPages={eventsTotalPages}
              pageSize={PAGE_SIZE}
              onChange={setEventsPageNum}
            />
          </>
        )}
      </Box>

      <CreateSignalModal
        opened={createModalOpened}
        onClose={closeCreateModal}
      />
    </Box>
  );
}

// ── Pagination footer ─────────────────────────────────────────────────────
// Compact "Showing X–Y of Z · [< 1 2 3 >]" row rendered under each tab.
// Hides the controls when there's only one page; hides the whole row when
// there are no results at all.
function PaginationFooter({
  page,
  totalPages,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  if (total === 0) return null;
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  return (
    <Group justify="space-between" mt={16} px={4}>
      <Text size="xs" c="#737373">
        Showing {start.toLocaleString()}–{end.toLocaleString()} of{" "}
        {total.toLocaleString()}
      </Text>
      {totalPages > 1 && (
        <Pagination
          value={page}
          onChange={onChange}
          total={totalPages}
          size="sm"
          siblings={1}
        />
      )}
    </Group>
  );
}
