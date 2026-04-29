"use client";

import { useState, useMemo, useCallback } from "react";
import { Box } from "@mantine/core";
import dynamic from "next/dynamic";
import { api } from "~/trpc/react";
import { useTeam } from "~/providers/team-provider";
import { useLocations } from "~/hooks/use-locations";
import {
  alertsToMarkers,
  alertsToRegions,
  eventsToMarkers,
  eventsToRegions,
  situationsToMarkers,
  type CrisisMarker,
} from "~/app/(app)/map/_components/map-markers-data";
import { MapMarkerDetail } from "~/app/(app)/map/_components/map-marker-detail";
import { MapPanelBar } from "~/app/(app)/map/_components/map-panel-bar";
import type { DataView } from "~/app/(app)/map/_components/map-layers-panel";
import type { BoundaryLevel } from "~/app/(app)/map/_components/map-settings-popover";
import type { MapMarker } from "~/components/map/crisis-map";
import { RightPanel } from "./_components/right-panel";

const CrisisMap = dynamic(
  () => import("~/components/map/crisis-map").then((m) => m.CrisisMap),
  { ssr: false, loading: () => <Box w="100%" h="100%" bg="#F5F5F5" /> },
);

export default function DashboardPage() {
  const { activeTeamId } = useTeam();
  const { getLocationId } = useLocations();
  const sudanId = useMemo(() => getLocationId("Sudan"), [getLocationId]);
  const sudanL0Query = api.locations.getById.useQuery(
    { id: sudanId! },
    { enabled: !!sudanId, staleTime: Infinity, refetchOnWindowFocus: false },
  );
  const focusCountryGeometry = sudanL0Query.data?.geometry ?? undefined;
  const [selectedCountry, setSelectedCountry] = useState("Sudan");
  const [selectedMarker, setSelectedMarker] = useState<CrisisMarker | null>(null);
  const [dataView, setDataView] = useState<DataView>("alert");
  const [showPopulation, setShowPopulation] = useState(false);
  const [boundaryLevel, setBoundaryLevel] = useState<BoundaryLevel>("none");

  const alertsQuery = api.alerts.getAlerts.useQuery(
    { activeOnly: true, teamId: activeTeamId },
    { enabled: dataView === "alert" },
  );
  const eventsQuery = api.alerts.getEvents.useQuery(
    { teamId: activeTeamId ?? undefined },
    { enabled: dataView === "event" && !!activeTeamId },
  );
  const situationsQuery = api.alerts.getSituations.useQuery(
    undefined,
    { enabled: dataView === "crisis" },
  );

  const markers = useMemo(() => {
    if (dataView === "alert")  return alertsToMarkers(alertsQuery.data?.alerts ?? []);
    if (dataView === "event")  return eventsToMarkers(eventsQuery.data?.events ?? []);
    if (dataView === "crisis") return situationsToMarkers(situationsQuery.data?.situations ?? []);
    return [];
  }, [dataView, alertsQuery.data, eventsQuery.data, situationsQuery.data]);

  const handleMarkerClick = useCallback((marker: MapMarker) => {
    const full = markers.find((m) => m.id === marker.id);
    setSelectedMarker(full ?? null);
  }, [markers]);

  const regions = useMemo(() => {
    if (dataView === "alert") return alertsToRegions(alertsQuery.data?.alerts ?? []);
    if (dataView === "event") return eventsToRegions(eventsQuery.data?.events ?? []);
    return [];
  }, [dataView, alertsQuery.data, eventsQuery.data]);

  return (
    <Box style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Box style={{ position: "relative", flex: 1, minWidth: 0, overflow: "hidden" }}>
        <CrisisMap
          markers={markers}
          regions={regions}
          center={[30.0, 15.5]}
          zoom={5.0}
          focusCountryPCode="SD"
          focusCountryName="Sudan"
          focusCountryGeometry={focusCountryGeometry}
          className="w-full h-full"
          onMarkerClick={handleMarkerClick}
        />
        {selectedMarker && (
          <MapMarkerDetail
            marker={selectedMarker}
            onClose={() => setSelectedMarker(null)}
          />
        )}
        <MapPanelBar
          dataView={dataView}
          onDataViewChange={setDataView}
          showPopulation={showPopulation}
          onShowPopulationChange={setShowPopulation}
          boundaryLevel={boundaryLevel}
          onBoundaryLevelChange={setBoundaryLevel}
        />
      </Box>
      <RightPanel
        selectedCountry={selectedCountry}
        onCountryChange={setSelectedCountry}
        onViewChange={() => {}}
        activeView="single"
      />
    </Box>
  );
}
