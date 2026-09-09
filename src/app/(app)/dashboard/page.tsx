"use client";

import { useState, useMemo, useCallback } from "react";
import { Box } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import dynamic from "next/dynamic";
import { api } from "~/trpc/react";
import { useTeam } from "~/providers/team-provider";
import { useLocations } from "~/hooks/use-locations";
import { useLastFocusedCountry } from "~/hooks/use-last-focused-country";
import { browseMapCamera } from "~/lib/map/country-picker-camera";
import { ALL_COUNTRIES, resolveSelectedCountry, useTeamCountry } from "~/hooks/use-team-country";
import { useReportStaleCountryPick } from "~/lib/report-stale-country-pick";
import { resolveCountryConfig } from "~/lib/constants/country-config";
import { isoForCountryName } from "~/lib/constants/countries";
import { scopeIsosMissingPaintableBoundaries } from "~/lib/geo/country-mask";
import { locationInCountry } from "~/lib/location";
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

  // Frame the map on the working country. Multi-country unset = all assigned
  // countries and WORLD_VIEW. One binding still pins.
  const {
    countries: teamCountries,
    countryId: workingCountryId,
    countryName: workingCountryName,
    setWorkingCountry,
    scopeReady,
  } = useTeamCountry();

  const teamCountryNames = useMemo(() => teamCountries.map((c) => c.name), [teamCountries]);
  const selectedCountry = resolveSelectedCountry(
    teamCountryNames,
    workingCountryName ?? "",
    scopeReady,
  );
  const lastFocusedCountry = useLastFocusedCountry(selectedCountry);
  const browseCamera = browseMapCamera({
    selectedCountry,
    lastFocusedCountry,
    getCenter,
    getZoom,
  });
  useReportStaleCountryPick(
    teamCountryNames,
    workingCountryName ?? "",
    selectedCountry,
  );
  
  const handleCountryChange = useCallback(
    (value: string) => {
      if (value === ALL_COUNTRIES) {
        setWorkingCountry("", ALL_COUNTRIES);
        return;
      }
      const location = teamCountries.find((c) => c.name === value);
      if (location) {
        setWorkingCountry(location.id);
      }
    },
    [teamCountries, setWorkingCountry],
  );

  const focusCountryId = workingCountryId;
  const isGlobalBrowse = selectedCountry === ALL_COUNTRIES || !focusCountryId;
  const scopedCountryIds = useMemo(() => teamCountries.map((c) => c.id), [teamCountries]);
  const globalCountryIds = scopedCountryIds.length > 0 ? scopedCountryIds : undefined;
  const boundariesReady = isGlobalBrowse ? scopeReady : !!focusCountryId;
  const scopeCountryIsos = useMemo(
    () =>
      isGlobalBrowse
        ? teamCountries
            .map((c) => isoForCountryName(c.name))
            .filter((iso): iso is string => !!iso)
        : [],
    [isGlobalBrowse, teamCountries],
  );
  const focusCountryL0Query = api.locations.getById.useQuery(
    { id: focusCountryId! },
    { enabled: !!focusCountryId, staleTime: Infinity, refetchOnWindowFocus: false },
  );
  const focusCountryGeometry = focusCountryL0Query.data?.geometry ?? undefined;
  const focusCountryPCode = resolveCountryConfig(
    selectedCountry && selectedCountry !== ALL_COUNTRIES ? selectedCountry : undefined,
  )?.pCode;
  const [selectedMarker, setSelectedMarker] = useState<CrisisMarker | null>(null);
  const [detailAnchor, setDetailAnchor] = useState<MarkerScreenPoint | null>(null);
  const [detailChromeActive, setDetailChromeActive] = useState(false);
  const [dataView, setDataView] = useState<DataView>("alert");
  const [showPopulation, setShowPopulation] = useState(false);
  const [boundaryLevel, setBoundaryLevel] = useState<BoundaryLevel>("A1");
  const [showRoads, setShowRoads] = useState(true);
  const [showNrcLocations, setShowNrcLocations] = useState(false);
  const [baseMapType, setBaseMapType] = useState<BaseMapType>("simple");

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
  const a0Query = api.locations.getAdminBoundaries.useQuery(
    { level: 0, countryIds: globalCountryIds },
    { enabled: boundaryLevel === "A0" && isGlobalBrowse && scopeReady, staleTime: 1000 * 60 * 60, refetchOnWindowFocus: false },
  );
  const a1Query = api.locations.getAdminBoundaries.useQuery(
    isGlobalBrowse
      ? { level: 1, countryIds: globalCountryIds }
      : { level: 1, countryId: focusCountryId ?? undefined },
    { enabled: boundaryLevel === "A1" && boundariesReady, staleTime: 1000 * 60 * 60, refetchOnWindowFocus: false },
  );
  const a2Query = api.locations.getAdminBoundaries.useQuery(
    isGlobalBrowse
      ? { level: 2, countryIds: globalCountryIds }
      : { level: 2, countryId: focusCountryId ?? undefined },
    { enabled: boundaryLevel === "A2" && boundariesReady, staleTime: 1000 * 60 * 60, refetchOnWindowFocus: false },
  );
  const mapboxAdmin1Isos = useMemo(
    () =>
      boundaryLevel === "A1" && isGlobalBrowse && a1Query.isSuccess
        ? scopeIsosMissingPaintableBoundaries(
            teamCountries.map((c) => ({ id: c.id, iso: isoForCountryName(c.name) })),
            a1Query.data ?? [],
          )
        : [],
    [boundaryLevel, isGlobalBrowse, teamCountries, a1Query.isSuccess, a1Query.data],
  );
  const adminBoundaries = useMemo(() => {
    if (boundaryLevel === "A0" && isGlobalBrowse) return a0Query.data ?? [];
    if (boundaryLevel === "A1") return a1Query.data ?? [];
    if (boundaryLevel === "A2") return a2Query.data ?? [];
    return [];
  }, [boundaryLevel, isGlobalBrowse, a0Query.data, a1Query.data, a2Query.data]);
  const adminBoundaryLevel =
    boundaryLevel === "A0" ? 0 : boundaryLevel === "A1" ? 1 : boundaryLevel === "A2" ? 2 : undefined;

  const populationQuery = api.locations.getPopulationBoundaries.useQuery(
    { countryId: focusCountryId ?? undefined },
    { enabled: showPopulation && !!focusCountryId, staleTime: Infinity, refetchOnWindowFocus: false },
  );
  const populationBoundaries = useMemo(
    () => (showPopulation ? (populationQuery.data ?? []) : []),
    [showPopulation, populationQuery.data],
  );

  const markers = useMemo(() => {
    let allMarkers: CrisisMarker[] = [];
    if (dataView === "alert") allMarkers = alertsToMarkers(alertsQuery.data?.alerts ?? []);
    else if (dataView === "event") allMarkers = eventsToMarkers(eventsQuery.data?.events ?? []);
    else if (dataView === "crisis") allMarkers = crisesToMarkers(crisesQuery.data?.crises ?? []);
    
    // Filter markers to working country when scoped
    if (workingCountryId) {
      return allMarkers.filter((m) => {
        // Use the unified locationInCountry matcher
        const location = {
          id: m.locationId ?? "",
          ancestorIds: m.ancestorIds,
        };
        return locationInCountry(location, workingCountryId);
      });
    }
    
    return allMarkers;
  }, [dataView, alertsQuery.data, eventsQuery.data, crisesQuery.data, workingCountryId]);

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
          center={browseCamera.center}
          zoom={isMobile && selectedCountry !== ALL_COUNTRIES ? browseCamera.zoom - 1 : browseCamera.zoom}
          focusCountryPCode={focusCountryPCode}
          focusCountryName={
            selectedCountry && selectedCountry !== ALL_COUNTRIES
              ? selectedCountry
              : undefined
          }
          focusCountryGeometry={focusCountryGeometry}
          adminBoundaries={adminBoundaries}
          adminBoundaryLevel={adminBoundaryLevel}
          scopeCountryIsos={scopeCountryIsos}
          mapboxAdmin1Isos={mapboxAdmin1Isos}
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
          onCountryChange={handleCountryChange}
          onViewChange={() => {}}
          activeView="single"
        />
      </Box>
    </Box>
  );
}
