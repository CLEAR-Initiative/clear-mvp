"use client";

import { useState, useMemo, useCallback } from "react";
import { Box, Tabs, Button, Group } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { useTeam } from "~/providers/team-provider";
import type { MapMarker } from "~/components/map/crisis-map";
import { dateOptions, parseDateFilter } from "~/lib/constants/country-config";
import { useLocations } from "~/hooks/use-locations";
import { alertsToMarkers, eventsToMarkers, signalsToMarkers } from "../map/_components/map-markers-data";
import { PageHeader, FilterBar } from "~/components/ui";

import { DetectionKpiRow } from "~/components/detection/detection-kpi-row";
import { LiveAlertsTab } from "./_components/live-alerts-tab";
import { HistoryTab } from "./_components/history-tab";
import { EventsTab } from "./_components/events-tab";
import { SignalsTab } from "./_components/signals-tab";
import { CreateAlertModal } from "./_components/create-alert-modal";

export default function DetectionPage() {
  const [activeTab, setActiveTab] = useState<string | null>("live");
  const [selectedCountry, setSelectedCountry] = useState("Sudan");
  const [selectedRegion, setSelectedRegion] = useState("All Regions");
  const [selectedDate, setSelectedDate] = useState(dateOptions[0] ?? "Last 30 days");
  const [createModalOpened, { open: openCreateModal, close: closeCreateModal }] = useDisclosure(false);

  const { activeTeamId } = useTeam();
  const { countries, getRegions, getCenter, getZoom } = useLocations();
  const alertsQuery = api.alerts.getAlerts.useQuery({ activeOnly: true, teamId: activeTeamId });
  const historyQuery = api.alerts.getAlerts.useQuery(
    { activeOnly: false, teamId: activeTeamId },
    { enabled: activeTab === "history" },
  );
  const eventsQuery = api.events.list.useQuery(
    { teamId: activeTeamId },
    { enabled: activeTab === "events" },
  );
  const signalsQuery = api.signals.list.useQuery(
    { teamId: activeTeamId },
    { enabled: activeTab === "signals" },
  );

  const regions = getRegions(selectedCountry);

  const allAlerts = useMemo(() => {
    const raw = alertsQuery.data?.alerts ?? [];
    return [...raw].sort((a, b) => b.event.rank - a.event.rank);
  }, [alertsQuery.data?.alerts]);

  // Region + date filtered alerts passed down to KPI cards and list
  const alerts = useMemo(() => {
    if (allAlerts.length === 0) return [];
    const regionNames = regions.map((r) => r.toLowerCase());
    const countryLower = selectedCountry.toLowerCase();
    const regionLower = selectedRegion !== "All Regions" ? selectedRegion.toLowerCase() : null;
    const dateRange = parseDateFilter(selectedDate);

    return allAlerts.filter((alert) => {
      const alertDate = new Date(alert.event.firstSignalCreatedAt).getTime();
      if (alertDate < dateRange.start.getTime() || alertDate > dateRange.end.getTime()) return false;

      const loc = alert.event.generalLocation ?? alert.event.originLocation ?? alert.event.destinationLocation;
      const locName = loc?.name.toLowerCase() ?? "";
      const matchesCountry =
        regionNames.some((r) => r !== "all regions" && locName.includes(r)) ||
        locName.includes(countryLower) ||
        (alert.event.description?.toLowerCase().includes(countryLower) ?? false) ||
        alert.event.types.some((t) => t.toLowerCase().includes(countryLower));

      if (!matchesCountry) return false;

      if (regionLower) {
        return (
          locName.includes(regionLower) ||
          (alert.event.description?.toLowerCase().includes(regionLower) ?? false)
        );
      }
      return true;
    });
  }, [allAlerts, regions, selectedCountry, selectedRegion, selectedDate]);

  const historyAlerts = historyQuery.data?.alerts ?? [];

  const mapMarkers: MapMarker[] = useMemo(() => alertsToMarkers(alerts), [alerts]);
  const eventMapMarkers: MapMarker[] = useMemo(
    () => eventsToMarkers(eventsQuery.data ?? []),
    [eventsQuery.data],
  );
  const signalMapMarkers: MapMarker[] = useMemo(
    () => signalsToMarkers(signalsQuery.data ?? []),
    [signalsQuery.data],
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
        title="Crisis Detection"
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
        <Group gap={8}>
          <Button
            size="xs"
            leftSection={<IconPlus size={14} />}
            onClick={openCreateModal}
            style={{ background: "#E85D3D", borderColor: "#E85D3D", fontSize: 13 }}
          >
            Create Manual Alert
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
          events={eventsQuery.data ?? []}
          onNavigateToAlerts={() => setActiveTab("live")}
        />

        {activeTab === "live" && (
          <LiveAlertsTab
            alerts={alerts}
            alertsLoading={alertsQuery.isLoading}
            mapMarkers={mapMarkers}
            mapCenter={mapCenter}
            mapZoom={mapZoom}
          />
        )}

        {activeTab === "signals" && (
          <SignalsTab
            signals={signalsQuery.data ?? []}
            loading={signalsQuery.isLoading}
            mapMarkers={signalMapMarkers}
            mapCenter={mapCenter}
            mapZoom={mapZoom}
          />
        )}

        {activeTab === "history" && (
          <HistoryTab
            alerts={historyAlerts}
            loading={historyQuery.isLoading}
            total={historyAlerts.length}
            count={historyAlerts.length}
          />
        )}

        {activeTab === "events" && (
          <EventsTab
            events={eventsQuery.data ?? []}
            loading={eventsQuery.isLoading}
            mapMarkers={eventMapMarkers}
            mapCenter={mapCenter}
            mapZoom={mapZoom}
          />
        )}
      </Box>

      <CreateAlertModal
        opened={createModalOpened}
        onClose={closeCreateModal}
        onSuccess={handleAlertCreated}
      />
    </Box>
  );
}
