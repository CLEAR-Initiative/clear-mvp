"use client";

import { useState, useMemo } from "react";
import { Box } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import type { MapMarker } from "~/components/map/crisis-map";
import type { MapRegion } from "~/components/map/crisis-map";
import { api } from "~/trpc/react";
import { useTeam } from "~/providers/team-provider";
import { useLocations } from "~/hooks/use-locations";
import { alertsToMarkers, alertsToRegions } from "../map/_components/map-markers-data";
import { MapSection } from "./_components/map-section";
import { RightPanel } from "./_components/right-panel";
import { CreateSignalModal } from "~/components/create-signal-modal";

/* ========== Main Page ========== */
export default function DashboardPage() {
  const [selectedCountry, setSelectedCountry] = useState("Sudan");
  const [selectedRegion, setSelectedRegion] = useState("All Regions");
  const [activeView, setActiveView] = useState("single");
  const [activeMonth, setActiveMonth] = useState(2);
  const [createAlertOpened, createAlertHandlers] = useDisclosure(false);

  const { countries, getRegions, getCenter, getZoom, getLocationId } = useLocations();

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

  // Resolve selected location for filtering
  const selectedLocationId = useMemo(() => {
    if (selectedRegion !== "All Regions") return getLocationId(selectedRegion);
    return getLocationId(selectedCountry);
  }, [selectedCountry, selectedRegion, getLocationId]);

  const selectedLocationName = useMemo(() => {
    return selectedRegion !== "All Regions" ? selectedRegion : selectedCountry;
  }, [selectedCountry, selectedRegion]);

  // Location-filtered alerts — uses ancestorIds when available, falls back to name matching.
  // Items with no location data are always included.
  const locationFilteredAlerts = useMemo(() => {
    if (!selectedLocationId && !selectedLocationName) return allAlerts;
    return allAlerts.filter((alert) => {
      const locs = [
        alert.event.generalLocation,
        alert.event.originLocation,
        alert.event.destinationLocation,
      ];
      // If event has no location data at all, include it
      const hasAnyLocation = locs.some((loc) => loc != null);
      if (!hasAnyLocation) return true;

      return locs.some((loc) => {
        if (!loc) return false;
        // Match by ID or ancestorIds (hierarchy)
        if (selectedLocationId) {
          if (loc.id === selectedLocationId) return true;
          if (loc.ancestorIds && loc.ancestorIds.length > 0 && loc.ancestorIds.includes(selectedLocationId)) return true;
        }
        // Fallback: match by location name (for when ancestorIds aren't populated)
        const locNameLower = loc.name.toLowerCase();
        const selectedLower = selectedLocationName.toLowerCase();
        return locNameLower.includes(selectedLower) || selectedLower.includes(locNameLower);
      });
    });
  }, [allAlerts, selectedLocationId, selectedLocationName]);

  const currentMarkers = useMemo<MapMarker[]>(
    () => alertsToMarkers(locationFilteredAlerts),
    [locationFilteredAlerts],
  );

  const currentRegions = useMemo<MapRegion[]>(
    () => alertsToRegions(locationFilteredAlerts),
    [locationFilteredAlerts],
  );

  const mapCenter = useMemo<[number, number]>(() => getCenter(selectedCountry), [selectedCountry, getCenter]);
  const mapZoom = useMemo(() => getZoom(selectedCountry), [selectedCountry, getZoom]);

  const handleCountryChange = (country: string | null) => {
    if (!country) return;
    setSelectedCountry(country);
    setSelectedRegion("All Regions");
  };

  const regionOptions = getRegions(selectedCountry);

  return (
    <Box className="flex-1 grid grid-cols-1 sm:grid-cols-[1fr_380px]" style={{ minHeight: "100vh" }}>
      <MapSection
        selectedCountry={selectedCountry}
        selectedRegion={selectedRegion}
        onCountryChange={handleCountryChange}
        onRegionChange={(v) => setSelectedRegion(v ?? "All Regions")}
        activeView={activeView}
        onViewChange={setActiveView}
        currentMarkers={currentMarkers}
        currentRegions={currentRegions}
        mapCenter={mapCenter}
        mapZoom={mapZoom}
        activeMonth={activeMonth}
        onMonthChange={setActiveMonth}
        countries={countries}
        regionOptions={regionOptions}
      />
      <RightPanel
        selectedCountry={selectedCountry}
        alerts={locationFilteredAlerts}
        events={allEvents}
        eventsLoading={eventsQuery.isLoading}
        alertsLoading={alertsQuery.isLoading}
        alertsUpdatedAt={alertsQuery.dataUpdatedAt}
        alertCount={overview?.active_alerts ?? locationFilteredAlerts.length}
        recent7Days={overview?.recent_7_days ?? 0}
        pipelineStats={pipelineStatsQuery.data as { overall: { total_sources: number; total_data_records: number } } | undefined}
        onCreateAlert={createAlertHandlers.open}
      />
      <CreateSignalModal
        opened={createAlertOpened}
        onClose={createAlertHandlers.close}
      />
    </Box>
  );
}
