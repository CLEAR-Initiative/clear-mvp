"use client";

import { useState, useMemo, useCallback } from "react";
import { Box, Tabs, Button, Group } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconPlus } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import type { MapMarker } from "~/components/map/crisis-map";
import { countryConfig, countries, dateOptions, parseDateFilter } from "~/lib/constants/country-config";
import { alertsToMarkers } from "../map/_components/map-markers-data";
import { PageHeader, FilterBar } from "~/components/ui";

import { KpiCards } from "./_components/kpi-cards";
import { LiveAlertsTab } from "./_components/live-alerts-tab";
import { HistoryTab } from "./_components/history-tab";
import { EventsTab } from "./_components/events-tab";
import { CreateAlertModal } from "./_components/create-alert-modal";

export default function DetectionPage() {
  const [activeTab, setActiveTab] = useState<string | null>("live");
  const [selectedCountry, setSelectedCountry] = useState("Sudan");
  const [selectedRegion, setSelectedRegion] = useState("All Regions");
  const [selectedDate, setSelectedDate] = useState(dateOptions[0] ?? "Last 30 days");
  const [createModalOpened, { open: openCreateModal, close: closeCreateModal }] = useDisclosure(false);

  const alertsQuery = api.alerts.getAlerts.useQuery({ activeOnly: true });
  const historyQuery = api.alerts.getAlerts.useQuery(
    { activeOnly: false },
    { enabled: activeTab === "history" },
  );
  const eventsQuery = api.events.list.useQuery(
    undefined,
    { enabled: activeTab === "events" },
  );

  const countryConf = countryConfig[selectedCountry];

  const allAlerts = useMemo(() => {
    const raw = alertsQuery.data?.alerts ?? [];
    return [...raw].sort((a, b) => b.severity - a.severity);
  }, [alertsQuery.data?.alerts]);

  // Region + date filtered alerts passed down to KPI cards and list
  const alerts = useMemo(() => {
    if (allAlerts.length === 0) return [];
    const regions = countryConf?.regions?.map((r) => r.toLowerCase()) ?? [];
    const countryLower = selectedCountry.toLowerCase();
    const regionLower = selectedRegion !== "All Regions" ? selectedRegion.toLowerCase() : null;
    const dateRange = parseDateFilter(selectedDate);

    return allAlerts.filter((alert) => {
      const alertDate = new Date(alert.createdAt).getTime();
      if (alertDate < dateRange.start.getTime() || alertDate > dateRange.end.getTime()) return false;

      const matchesCountry =
        alert.locations.some((loc) => {
          const locName = loc.location.name.toLowerCase();
          return (
            regions.some((r) => r !== "all regions" && locName.includes(r)) ||
            locName.includes(countryLower)
          );
        }) ||
        (alert.description?.toLowerCase().includes(countryLower) ?? false) ||
        alert.eventType.toLowerCase().includes(countryLower);

      if (!matchesCountry) return false;

      if (regionLower) {
        return (
          alert.locations.some((loc) =>
            loc.location.name.toLowerCase().includes(regionLower),
          ) ||
          (alert.description?.toLowerCase().includes(regionLower) ?? false)
        );
      }
      return true;
    });
  }, [allAlerts, selectedCountry, selectedRegion, selectedDate]);

  const historyAlerts = historyQuery.data?.alerts ?? [];

  const mapMarkers: MapMarker[] = useMemo(() => alertsToMarkers(alerts), [alerts]);
  const mapCenter = useMemo<[number, number]>(() => countryConf?.center ?? [30.0, 15.5], [selectedCountry]);
  const mapZoom = useMemo(() => countryConf?.zoom ?? 5, [selectedCountry]);

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
          regions={countryConf?.regions ?? ["All Regions"]}
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
            <Tabs.Tab value="live">Live Alerts</Tabs.Tab>
            <Tabs.Tab value="history">History</Tabs.Tab>
            <Tabs.Tab value="events">Events</Tabs.Tab>
          </Tabs.List>
        </Tabs>

        <KpiCards alerts={alerts} loading={alertsQuery.isLoading} />

        {activeTab === "live" && (
          <LiveAlertsTab
            alerts={alerts}
            alertsLoading={alertsQuery.isLoading}
            mapMarkers={mapMarkers}
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
