"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { Box } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import dynamic from "next/dynamic";
import { api } from "~/trpc/react";
import { useTeam } from "~/providers/team-provider";
import { useLocations } from "~/hooks/use-locations";
import { useTeamCountry } from "~/hooks/use-team-country";
import { resolveCountryConfig } from "~/lib/constants/country-config";
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
import type { BaseMapType, MapMarker, MarkerScreenPoint } from "~/components/map/crisis-map";
import { RightPanel } from "./_components/right-panel";
import { useIsDark } from "~/hooks/use-is-dark";

/** App shell reserves these gutters for mobile chrome - bleed the map through them. */
const MOBILE_TOP_GUTTER = 56;
const MOBILE_BOTTOM_GUTTER = 72;

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
  const { getLocationId, getCenter, getZoom } = useLocations();
  const isMobile = useMediaQuery("(max-width: 48em)") === true;

  // Frame the map on the active team's country rather than a fixed one. A team
  // with no level-0 binding monitors globally, so every country-scoped overlay
  // query below stays disabled and the camera keeps its world view.
  const { countryId: teamCountryId, countryName: teamCountryName } = useTeamCountry();
  const focusCountryId = useMemo(
    () => teamCountryId ?? (teamCountryName ? getLocationId(teamCountryName) : null),
    [teamCountryId, teamCountryName, getLocationId],
  );
  const focusCountryL0Query = api.locations.getById.useQuery(
    { id: focusCountryId! },
    { enabled: !!focusCountryId, staleTime: Infinity, refetchOnWindowFocus: false },
  );
  const focusCountryGeometry = focusCountryL0Query.data?.geometry ?? undefined;
  const focusCountryPCode = resolveCountryConfig(teamCountryName ?? undefined)?.pCode;
  const [selectedCountry, setSelectedCountry] = useState(teamCountryName ?? "");
  const [selectedMarker, setSelectedMarker] = useState<CrisisMarker | null>(null);
  const [detailAnchor, setDetailAnchor] = useState<MarkerScreenPoint | null>(null);
  const [detailChromeActive, setDetailChromeActive] = useState(false);
  const [dataView, setDataView] = useState<DataView>("alert");
  const [showPopulation, setShowPopulation] = useState(false);
  const [boundaryLevel, setBoundaryLevel] = useState<BoundaryLevel>("A1");
  const [showRoads, setShowRoads] = useState(true);
  const [showNrcLocations, setShowNrcLocations] = useState(false);
  const [baseMapType, setBaseMapType] = useState<BaseMapType>("simple");

  // Teams resolve after first paint, so the initial state above can be empty.
  // Adopt the team's country once it arrives.
  useEffect(() => {
    if (teamCountryName) setSelectedCountry(teamCountryName);
  }, [teamCountryName]);

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
    { level: 1, countryId: focusCountryId ?? undefined },
    { enabled: boundaryLevel === "A1" && !!focusCountryId, staleTime: 1000 * 60 * 60, refetchOnWindowFocus: false },
  );
  const a2Query = api.locations.getAdminBoundaries.useQuery(
    { level: 2, countryId: focusCountryId ?? undefined },
    { enabled: boundaryLevel === "A2" && !!focusCountryId, staleTime: 1000 * 60 * 60, refetchOnWindowFocus: false },
  );
  const adminBoundaries = useMemo(() => {
    if (boundaryLevel === "A1") return a1Query.data ?? [];
    if (boundaryLevel === "A2") return a2Query.data ?? [];
    return [];
  }, [boundaryLevel, a1Query.data, a2Query.data]);
  const adminBoundaryLevel =
    boundaryLevel === "A1" ? 1 : boundaryLevel === "A2" ? 2 : undefined;

  const populationQuery = api.locations.getPopulationBoundaries.useQuery(
    { countryId: focusCountryId ?? undefined },
    { enabled: showPopulation && !!focusCountryId, staleTime: Infinity, refetchOnWindowFocus: false },
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
    <Box
      style={{ display: "flex", overflow: "hidden" }}
      // Match /map: bleed through app-shell gutters so fitBounds frames the
      // visible viewport instead of a 100vh canvas clipped by chrome.
      mt={{ base: -MOBILE_TOP_GUTTER, sm: 0 }}
      mb={{ base: -MOBILE_BOTTOM_GUTTER, sm: 0 }}
      h={{ base: "100dvh", sm: "100vh" }}
    >
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
          center={getCenter(selectedCountry)}
          zoom={isMobile ? getZoom(selectedCountry) - 1 : getZoom(selectedCountry)}
          focusCountryPCode={focusCountryPCode}
          focusCountryName={selectedCountry || undefined}
          focusCountryGeometry={focusCountryGeometry}
          adminBoundaries={adminBoundaries}
          adminBoundaryLevel={adminBoundaryLevel as 1 | 2 | undefined}
          populationBoundaries={populationBoundaries}
          className="w-full h-full"
          onMarkerClick={handleMarkerClick}
          showRoads={showRoads}
          showNrcLocations={showNrcLocations}
          baseMapType={baseMapType}
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
          showRoads={showRoads}
          onShowRoadsChange={setShowRoads}
          showNrcLocations={showNrcLocations}
          onShowNrcLocationsChange={setShowNrcLocations}
          baseMapType={baseMapType}
          onBaseMapTypeChange={setBaseMapType}
        />
      </Box>
      <Box hiddenFrom="base" visibleFrom="sm">
        <RightPanel
          selectedCountry={selectedCountry}
          onCountryChange={setSelectedCountry}
          onViewChange={() => {}}
          activeView="single"
        />
      </Box>
    </Box>
  );
}
