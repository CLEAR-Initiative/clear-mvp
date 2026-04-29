"use client";

import { useState, useMemo, useCallback } from "react";
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
  const alertsQuery = api.alerts.getAlerts.useQuery({ activeOnly: true, teamId: activeTeamId});
  const historyQuery = api.alerts.getAlerts.useQuery(
    { activeOnly: false, teamId: activeTeamId},
    { enabled: activeTab === "history" },
  );
  const eventsQuery = api.events.list.useQuery(
    { teamId: activeTeamId},
  );
  const signalsQuery = api.signals.list.useQuery(
    { teamId: activeTeamId},
    { enabled: activeTab === "signals" || activeTab === "history" },
  );

  const regions = getRegions(selectedCountry);

  const allAlerts = useMemo(() => {
    const raw = alertsQuery.data?.alerts ?? [];
    return [...raw].sort((a, b) => b.event.rank - a.event.rank);
  }, [alertsQuery.data?.alerts]);

  const allSources = useMemo(() => {
    const s = new Set<string>();
    allAlerts.forEach((a) => a.event.signals.forEach((sig) => s.add(sig.source.name)));
    (eventsQuery.data ?? []).forEach((e) => e.signals.forEach((sig) => s.add(sig.source.name)));
    (signalsQuery.data ?? []).forEach((sig) => s.add(sig.source.name));
    return [...s].sort();
  }, [allAlerts, eventsQuery.data, signalsQuery.data]);

  const focusCountryPCode = countryConfig[selectedCountry]?.pCode;
  const focusCountryName = selectedCountry;

  // Resolve selected location for filtering
  const selectedLocationId = useMemo(() => {
    if (selectedRegion !== "All Regions") return getLocationId(selectedRegion);
    return getLocationId(selectedCountry);
  }, [selectedCountry, selectedRegion, getLocationId]);

  const selectedLocationName = useMemo(() => {
    return selectedRegion !== "All Regions" ? selectedRegion : selectedCountry;
  }, [selectedCountry, selectedRegion]);

  /** Check if any location in the list matches the selected location (by ID hierarchy or name fallback).
   *  Items with NO location data at all are always included. */
  const matchesLocationFilter = useMemo(() => {
    if (!selectedLocationId && !selectedLocationName) return () => true;
    return (locs: Array<{ id: string; name: string; ancestorIds?: string[] } | null | undefined>) => {
      // If item has no location data at all, include it (don't filter out)
      const hasAnyLocation = locs.some((loc) => loc != null);
      if (!hasAnyLocation) return true;

      return locs.some((loc) => {
        if (!loc) return false;
        // Match by ID or ancestorIds
        if (selectedLocationId) {
          if (loc.id === selectedLocationId) return true;
          if (loc.ancestorIds && loc.ancestorIds.length > 0 && loc.ancestorIds.includes(selectedLocationId)) return true;
        }
        // Fallback: name matching
        const locNameLower = loc.name.toLowerCase();
        const selectedLower = selectedLocationName.toLowerCase();
        return locNameLower.includes(selectedLower) || selectedLower.includes(locNameLower);
      });
    };
  }, [selectedLocationId, selectedLocationName]);

  // Filter alerts by location + date range
  const alerts = useMemo(() => {
    if (allAlerts.length === 0) return [];
    const dateRange = parseDateFilter(selectedDate);

    return allAlerts.filter((alert) => {
      // Date filter
      const alertDate = new Date(alert.event.firstSignalCreatedAt).getTime();
      if (alertDate < dateRange.start.getTime() || alertDate > dateRange.end.getTime()) return false;

      // Location filter
      const locs = [
        alert.event.generalLocation,
        alert.event.originLocation,
        alert.event.destinationLocation,
      ];
      if (!matchesLocationFilter(locs)) return false;

      return true;
    });
  }, [allAlerts, matchesLocationFilter, selectedDate]);

  const historyAlerts = historyQuery.data?.alerts ?? [];

  // Filter events by location + date
  const filteredEvents = useMemo(() => {
    const events = eventsQuery.data ?? [];
    const dateRange = parseDateFilter(selectedDate);
    return events.filter((e) => {
      const eventDate = new Date(e.firstSignalCreatedAt).getTime();
      if (eventDate < dateRange.start.getTime() || eventDate > dateRange.end.getTime()) return false;
      return matchesLocationFilter([e.generalLocation, e.originLocation, e.destinationLocation]);
    });
  }, [eventsQuery.data, matchesLocationFilter, selectedDate]);

  // Filter signals by location + date
  const filteredSignals = useMemo(() => {
    const signals = signalsQuery.data ?? [];
    const dateRange = parseDateFilter(selectedDate);
    return signals.filter((s) => {
      const sigDate = new Date(s.publishedAt).getTime();
      if (sigDate < dateRange.start.getTime() || sigDate > dateRange.end.getTime()) return false;
      return matchesLocationFilter([s.generalLocation, s.originLocation, s.destinationLocation]);
    });
  }, [signalsQuery.data, matchesLocationFilter, selectedDate]);

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
        )}

        {activeTab === "signals" && (
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
        )}

        {activeTab === "history" && (
          <HistoryTab
            alerts={historyAlerts}
            events={filteredEvents}
            signals={filteredSignals}
            loading={historyQuery.isLoading || eventsQuery.isLoading || signalsQuery.isLoading}
          />
        )}

        {activeTab === "events" && (
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
        )}
      </Box>

      <CreateSignalModal
        opened={createModalOpened}
        onClose={closeCreateModal}
      />
    </Box>
  );
}
