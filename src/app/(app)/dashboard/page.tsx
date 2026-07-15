"use client";

import { useState, useMemo, useCallback } from "react";
import { Box } from "@mantine/core";
import dynamic from "next/dynamic";
import { api } from "~/trpc/react";
import { useTeam } from "~/providers/team-provider";
import { useLocations } from "~/hooks/use-locations";
import {
  alertsToMarkers,
  eventsToMarkers,
  crisesToMarkers,
  type CrisisMarker,
} from "~/app/(app)/map/_components/map-markers-data";
import { MapMarkerDetail } from "~/app/(app)/map/_components/map-marker-detail";
import { MapPanelBar } from "~/app/(app)/map/_components/map-panel-bar";
import type { DataView } from "~/app/(app)/map/_components/map-layers-panel";
import type { BoundaryLevel } from "~/app/(app)/map/_components/map-settings-popover";
import type { MapMarker, MarkerScreenPoint } from "~/components/map/crisis-map";
import { RightPanel } from "./_components/right-panel";
import { useIsDark } from "~/hooks/use-is-dark";

function MapLoadingPlaceholder() {
  const isDark = useIsDark();
  return (
    <Box 
      w="100%" 
      h="100%" 
      style={{ 
        background: isDark ? "#111111" : "#FAFAFA",
      }} 
    />
  );
}

const CrisisMap = dynamic(
  () => import("~/components/map/crisis-map").then((m) => m.CrisisMap),
  { ssr: false, loading: MapLoadingPlaceholder },
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
  const [detailAnchor, setDetailAnchor] = useState<MarkerScreenPoint | null>(null);
  const [detailChromeActive, setDetailChromeActive] = useState(false);
  const [dataView, setDataView] = useState<DataView>("alert");
  const [showPopulation, setShowPopulation] = useState(false);
  const [boundaryLevel, setBoundaryLevel] = useState<BoundaryLevel>("A1");

  const alertsQuery = api.alerts.alertsForMap.useQuery(
    { activeOnly: true, teamId: activeTeamId },
    { enabled: dataView === "alert", placeholderData: (prev) => prev },
  );
  const eventsQuery = api.alerts.eventsForMap.useQuery(
    { teamId: activeTeamId ?? undefined },
    { enabled: dataView === "event", placeholderData: (prev) => prev },
  );
  const crisesQuery = api.alerts.getCrises.useQuery(
    undefined,
    { enabled: dataView === "crisis", placeholderData: (prev) => prev },
  );

  // ── Admin-boundary + population overlay queries ─────────────────────────
  // Mirrors the /map page so the layers panel here behaves identically.
  // Each query is gated on the corresponding panel state to avoid burning
  // bandwidth when the layer is off.
  const a1Query = api.locations.getAdminBoundaries.useQuery(
    { level: 1, countryId: sudanId ?? undefined },
    { enabled: boundaryLevel === "A1" && !!sudanId, staleTime: 1000 * 60 * 60, refetchOnWindowFocus: false },
  );
  const a2Query = api.locations.getAdminBoundaries.useQuery(
    { level: 2, countryId: sudanId ?? undefined },
    { enabled: boundaryLevel === "A2" && !!sudanId, staleTime: 1000 * 60 * 60, refetchOnWindowFocus: false },
  );
  const adminBoundaries = useMemo(() => {
    if (boundaryLevel === "A1") return a1Query.data ?? [];
    if (boundaryLevel === "A2") return a2Query.data ?? [];
    return [];
  }, [boundaryLevel, a1Query.data, a2Query.data]);
  const adminBoundaryLevel =
    boundaryLevel === "A1" ? 1 : boundaryLevel === "A2" ? 2 : undefined;

  const populationQuery = api.locations.getPopulationBoundaries.useQuery(
    { countryId: sudanId ?? undefined },
    { enabled: showPopulation && !!sudanId, staleTime: Infinity, refetchOnWindowFocus: false },
  );
  const populationBoundaries = useMemo(
    () => (showPopulation ? (populationQuery.data ?? []) : []),
    [showPopulation, populationQuery.data],
  );

  const markers = useMemo(() => {
    if (dataView === "alert")  return alertsToMarkers(alertsQuery.data?.alerts ?? []);
    if (dataView === "event")  return eventsToMarkers(eventsQuery.data?.events ?? []);
    if (dataView === "crisis") return crisesToMarkers(crisesQuery.data?.crises ?? []);
    return [];
  }, [dataView, alertsQuery.data, eventsQuery.data, crisesQuery.data]);

  const handleMarkerClick = useCallback((marker: MapMarker, screenPoint: MarkerScreenPoint) => {
    const full = markers.find((m) => m.id === marker.id);
    setSelectedMarker(full ?? null);
    setDetailAnchor(screenPoint);
  }, [markers]);


  return (
    <Box style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <Box 
        style={{ 
          position: "relative", 
          flex: 1, 
          minWidth: 0, 
          overflow: "hidden",
          background: "var(--color-bg-primary)",
        }}
      >
        <CrisisMap
          markers={markers}
          center={[30.0, 15.5]}
          zoom={5.0}
          focusCountryPCode="SD"
          focusCountryName="Sudan"
          focusCountryGeometry={focusCountryGeometry}
          adminBoundaries={adminBoundaries}
          adminBoundaryLevel={adminBoundaryLevel as 1 | 2 | undefined}
          populationBoundaries={populationBoundaries}
          className="w-full h-full"
          onMarkerClick={handleMarkerClick}
          hoveredMarkerId={
            detailChromeActive && selectedMarker ? selectedMarker.id : null
          }
        />
        {selectedMarker && (
          <MapMarkerDetail
            marker={selectedMarker}
            anchor={detailAnchor}
            onChromeActiveChange={setDetailChromeActive}
            onClose={() => {
              setSelectedMarker(null);
              setDetailAnchor(null);
              setDetailChromeActive(false);
            }}
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
