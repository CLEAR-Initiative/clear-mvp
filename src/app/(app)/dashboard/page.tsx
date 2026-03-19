"use client";

import { useState, useMemo } from "react";
import { Box } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import type { MapMarker } from "~/components/map/crisis-map";
import { api } from "~/trpc/react";
import { useTeam } from "~/providers/team-provider";
import { countryConfig, countries } from "~/lib/constants/country-config";
import { alertsToMarkers } from "../map/_components/map-markers-data";
import { MapSection } from "./_components/map-section";
import { RightPanel } from "./_components/right-panel";
import { CreateAlertModal } from "./_components/create-alert-modal";

/* ========== Main Page ========== */
export default function DashboardPage() {
  const [selectedCountry, setSelectedCountry] = useState("Sudan");
  const [selectedRegion, setSelectedRegion] = useState("All Regions");
  const [activeView, setActiveView] = useState("single");
  const [activeMonth, setActiveMonth] = useState(2);
  const [createAlertOpened, createAlertHandlers] = useDisclosure(false);

  // Team-scoped tRPC queries — GraphQL-backed
  const { activeTeamId } = useTeam();
  const alertsQuery = api.alerts.getAlerts.useQuery({ activeOnly: true, teamId: activeTeamId });
  const statsQuery = api.alerts.getStats.useQuery({ teamId: activeTeamId });
  const eventsQuery = api.events.list.useQuery({ teamId: activeTeamId });
  const pipelineStatsQuery = api.pipeline.getStatistics.useQuery(undefined, {
    retry: false,
  });

  const allAlerts = alertsQuery.data?.alerts ?? [];
  const allEvents = eventsQuery.data ?? [];
  const overview = statsQuery.data?.stats?.overview;

  const config = countryConfig[selectedCountry];

  const currentMarkers = useMemo<MapMarker[]>(
    () => alertsToMarkers(allAlerts),
    [allAlerts],
  );

  const mapCenter = useMemo<[number, number]>(() => {
    return config?.center ?? [40.5, 8.5];
  }, [config?.center]);

  const mapZoom = useMemo(() => {
    return config?.zoom ?? 5.5;
  }, [config?.zoom]);

  const handleCountryChange = (country: string | null) => {
    if (!country) return;
    setSelectedCountry(country);
    setSelectedRegion("All Regions");
  };

  const regionOptions = config?.regions ?? ["All Regions"];

  return (
    <Box className="flex-1 grid grid-cols-[1fr_380px]" style={{ height: "100vh" }}>
      <MapSection
        selectedCountry={selectedCountry}
        selectedRegion={selectedRegion}
        onCountryChange={handleCountryChange}
        onRegionChange={(v) => setSelectedRegion(v ?? "All Regions")}
        activeView={activeView}
        onViewChange={setActiveView}
        currentMarkers={currentMarkers}
        mapCenter={mapCenter}
        mapZoom={mapZoom}
        activeMonth={activeMonth}
        onMonthChange={setActiveMonth}
        countries={countries}
        regionOptions={regionOptions}
      />
      <RightPanel
        selectedCountry={selectedCountry}
        alerts={allAlerts}
        events={allEvents}
        eventsLoading={eventsQuery.isLoading}
        alertsLoading={alertsQuery.isLoading}
        alertsUpdatedAt={alertsQuery.dataUpdatedAt}
        alertCount={overview?.active_alerts ?? allAlerts.length}
        recent7Days={overview?.recent_7_days ?? 0}
        pipelineStats={pipelineStatsQuery.data as { overall: { total_sources: number; total_data_records: number } } | undefined}
        onCreateAlert={createAlertHandlers.open}
      />
      <CreateAlertModal
        opened={createAlertOpened}
        onClose={createAlertHandlers.close}
      />
    </Box>
  );
}
