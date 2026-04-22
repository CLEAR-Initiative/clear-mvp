"use client";

import { useState, useMemo, useCallback } from "react";
import { Box, Tabs, Button, Group, Switch, Text } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { useTeam } from "~/providers/team-provider";
import type { MapMarker } from "~/components/map/crisis-map";
import { dateOptions, parseDateFilter } from "~/lib/constants/country-config";
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
  const [activeTab, setActiveTab] = useState<string | null>("live");
  const [selectedCountry, setSelectedCountry] = useState("Sudan");
  const [selectedRegion, setSelectedRegion] = useState("All Regions");
  const [selectedDate, setSelectedDate] = useState(dateOptions[0] ?? "Last 30 days");
  const [createModalOpened, { open: openCreateModal, close: closeCreateModal }] = useDisclosure(false);
  const [includeDummy, setIncludeDummy] = useState(false);

  const { activeTeamId } = useTeam();
  const { countries, getRegions, getCenter, getZoom, getLocationId } = useLocations();

  const [boundaryLevel, setBoundaryLevel] = useState<"none" | "A0" | "A1" | "A2">("A1");
  const selectedCountryId = useMemo(() => getLocationId(selectedCountry), [selectedCountry, getLocationId]);

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
  const alertsQuery = api.alerts.getAlerts.useQuery({ activeOnly: true, teamId: activeTeamId, includeDummy });
  const historyQuery = api.alerts.getAlerts.useQuery(
    { activeOnly: false, teamId: activeTeamId, includeDummy },
    { enabled: activeTab === "history" },
  );
  const eventsQuery = api.events.list.useQuery(
    { teamId: activeTeamId, includeDummy },
  );
  const signalsQuery = api.signals.list.useQuery(
    { teamId: activeTeamId, includeDummy },
    { enabled: activeTab === "signals" || activeTab === "history" },
  );

  const regions = getRegions(selectedCountry);

  const allAlerts = useMemo(() => {
    const raw = alertsQuery.data?.alerts ?? [];
    return [...raw].sort((a, b) => b.event.rank - a.event.rank);
  }, [alertsQuery.data?.alerts]);

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
        subtitle="Detection"
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
        />
        <Group gap={12}>
          <Group gap={6}>
            <Switch
              size="xs"
              checked={includeDummy}
              onChange={(e) => setIncludeDummy(e.currentTarget.checked)}
              color="gray"
            />
            <Text size="xs" c="#737373" style={{ fontSize: 11 }}>Demo data</Text>
          </Group>
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
