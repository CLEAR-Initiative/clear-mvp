"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Box,
  Text,
  Group,
  Select,
  Loader,
} from "@mantine/core";
import { DisasterTypePicker } from "~/components/disaster-type-picker";
import type { MapMarker } from "~/components/map/crisis-map";
import { api } from "~/trpc/react";
import { useTeam } from "~/providers/team-provider";
import {
  type CrisisMarker,
  alertsToMarkers,
  eventsToMarkers,
  crisesToMarkers,
} from "./_components/map-markers-data";
import { useLocations } from "~/hooks/use-locations";
import { MapPanelBar } from "./_components/map-panel-bar";
import type { HierarchyLevel1 } from "~/components/disaster-type-picker";
import { MapMarkerDetail } from "./_components/map-marker-detail";
import type { DataView } from "./_components/map-layers-panel";
import type { BoundaryLevel } from "./_components/map-settings-popover";

const CrisisMap = dynamic(
  () => import("~/components/map/crisis-map").then((m) => m.CrisisMap),
  { ssr: false, loading: () => <Box w="100%" h="100%" bg="#F5F5F5" /> },
);

/* ========== Label styles ========== */
const LABEL_STYLE = { fontSize: 10, letterSpacing: "0.05em" } as const;
const INPUT_STYLE = {
  fontWeight: 600,
  fontSize: 13,
  background: "var(--color-bg-muted)",
  border: "1px solid var(--color-border-dark)",
  boxShadow: "var(--shadow-sm)",
} as const;

function FilterLabel({ children }: { children: string }) {
  return (
    <Text size="xs" c="var(--color-text-muted)" tt="uppercase" style={LABEL_STYLE}>
      {children}
    </Text>
  );
}

export default function MapPage() {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const update = () =>
      setIsDark(document.documentElement.getAttribute("data-mantine-color-scheme") === "dark");
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-mantine-color-scheme"] });
    return () => observer.disconnect();
  }, []);
  const mapStyle = isDark
    ? "mapbox://styles/mapbox/dark-v11"
    : "mapbox://styles/mapbox/light-v11";

  /* ---- Core state (must precede queries that depend on it) ---- */
  const [dataView, setDataView] = useState<DataView>("alert");

  /* ---- Fetch data ---- */
  const { activeTeamId, activeTeam } = useTeam();
  const { countries: apiCountries, getRegions, getCenter, getZoom, getLocationId } = useLocations();

  const alertsQuery = api.alerts.getAlerts.useQuery(
    { activeOnly: true, teamId: activeTeamId },
    { enabled: dataView === "alert" },
  );
  const eventsQuery = api.alerts.getEvents.useQuery(
    { teamId: activeTeamId ?? undefined },
    // No team → fetch the global feed (the API resolver permits this).
    { enabled: dataView === "event" },
  );
  const crisesQuery = api.alerts.getCrises.useQuery(
    undefined,
    { enabled: dataView === "crisis" },
  );
  const hierarchyQuery = api.alerts.getDisasterTypeHierarchy.useQuery(undefined, {
    staleTime: Infinity, refetchOnWindowFocus: false,
  });
  const hierarchy: HierarchyLevel1[] = hierarchyQuery.data ?? [];

  /* ---- Derive markers + regions based on active data view ---- */
  const allMarkers: CrisisMarker[] = useMemo(() => {
    if (dataView === "alert")  return alertsToMarkers(alertsQuery.data?.alerts ?? []);
    if (dataView === "event")  return eventsToMarkers(eventsQuery.data?.events ?? []);
    if (dataView === "crisis") return crisesToMarkers(crisesQuery.data?.crises ?? []);
    return [];
  }, [dataView, alertsQuery.data, eventsQuery.data, crisesQuery.data]);

  const allRegions = useMemo(() => {
    return [];
  }, []);



  /* ---- Filter state ---- */
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  const selectedTypeCodes = useMemo((): Set<string> | null => {
    if (selectedTypes.length === 0) return null;
    const codes = new Set<string>();
    for (const value of selectedTypes) {
      const [l1Name, l2Name] = value.split("::");
      const l1 = hierarchy.find((h) => h.name === l1Name);
      const l2 = l1?.groups.find((g) => g.name === l2Name);
      l2?.codes.forEach((c) => codes.add(c.toLowerCase()));
    }
    return codes;
  }, [selectedTypes, hierarchy]);

  // TODO: hardcoded to Sudan for the current single-team deployment.
  // When more teams join, remove this default and rely solely on the
  // useEffect below which sets the country from activeTeam.locations.
  // Requires teams to have a level-0 location configured in the DB.
  const [selectedCountry, setSelectedCountry] = useState("Sudan");
  const [selectedRegion, setSelectedRegion] = useState("All Regions");

  // Pre-select the team's country when the active team loads.
  useEffect(() => {
    const countryLoc = activeTeam?.locations.find((l) => l.level === 0);
    if (countryLoc) {
      setSelectedCountry(countryLoc.name);
      setSelectedRegion("All Regions");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTeam?.id]);
  const [selectedMarker, setSelectedMarker] = useState<CrisisMarker | null>(
    null,
  );
  const [boundaryLevel, setBoundaryLevel] = useState<BoundaryLevel>("A1");
  const [showPopulation, setShowPopulation] = useState(false);

  // Resolve Sudan's location ID for scoping admin boundary queries.
  const sudanId = useMemo(() => getLocationId("Sudan"), [getLocationId]);

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

  const adminBoundaryLevel = boundaryLevel === "A1" ? 1 : boundaryLevel === "A2" ? 2 : undefined;

  // Population layer: A2 districts with population, lazy-loaded when first enabled.
  const populationQuery = api.locations.getPopulationBoundaries.useQuery(
    { countryId: sudanId ?? undefined },
    { enabled: showPopulation && !!sudanId, staleTime: Infinity, refetchOnWindowFocus: false },
  );
  const populationBoundaries = useMemo(
    () => (showPopulation ? (populationQuery.data ?? []) : []),
    [showPopulation, populationQuery.data],
  );

  // Sudan L0 geometry - used for the country highlight instead of Mapbox's inaccurate tileset.
  const sudanL0Query = api.locations.getById.useQuery(
    { id: sudanId! },
    { enabled: !!sudanId, staleTime: Infinity, refetchOnWindowFocus: false },
  );
  const focusCountryGeometry = sudanL0Query.data?.geometry ?? undefined;

  // Region zoom: fetch selected region geometry and fit map to it.
  const selectedRegionId = useMemo(
    () => (selectedRegion !== "All Regions" ? getLocationId(selectedRegion) : null),
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

  /* ---- Derive country/region options from API locations ---- */
  const countryOptions = useMemo(
    () => ["All Countries", ...apiCountries],
    [apiCountries],
  );
  const regionOptions = useMemo(
    () => selectedCountry !== "All Countries" ? getRegions(selectedCountry) : ["All Regions"],
    [selectedCountry, getRegions],
  );

  /* ---- Map center ---- */
  const mapCenter: [number, number] = useMemo(() => {
    if (selectedCountry !== "All Countries") {
      return getCenter(selectedCountry);
    }
    if (allMarkers.length === 0) return [30.0, 15.5];
    const avgLng =
      allMarkers.reduce((sum, m) => sum + m.lng, 0) / allMarkers.length;
    const avgLat =
      allMarkers.reduce((sum, m) => sum + m.lat, 0) / allMarkers.length;
    return [avgLng, avgLat];
  }, [allMarkers, selectedCountry]);

  const mapZoom = useMemo(() => {
    if (selectedCountry !== "All Countries") {
      return getZoom(selectedCountry);
    }
    return 5;
  }, [selectedCountry]);

  /* ---- Resolve selected location for filtering ---- */
  const selectedLocationId = useMemo(() => {
    if (selectedRegion !== "All Regions") return getLocationId(selectedRegion);
    if (selectedCountry !== "All Countries") return getLocationId(selectedCountry);
    return null;
  }, [selectedCountry, selectedRegion, getLocationId]);

  const selectedLocationName = useMemo(() => {
    if (selectedRegion !== "All Regions") return selectedRegion;
    if (selectedCountry !== "All Countries") return selectedCountry;
    return null;
  }, [selectedCountry, selectedRegion]);

  /* ---- Filtered markers ---- */
  const currentMarkers: MapMarker[] = useMemo(() => {
    const filtered = allMarkers.filter((m) => {
      // Location filter (hierarchy + name fallback)
      if (selectedLocationId ?? selectedLocationName) {
        let matchesLocation = false;
        // Try ID-based hierarchy match
        if (selectedLocationId) {
          if (m.locationId === selectedLocationId) matchesLocation = true;
          else if (m.ancestorIds && m.ancestorIds.length > 0 && m.ancestorIds.includes(selectedLocationId)) matchesLocation = true;
        }
        // Fallback: name match on region
        if (!matchesLocation && selectedLocationName && m.region) {
          const regionLower = m.region.toLowerCase();
          const selectedLower = selectedLocationName.toLowerCase();
          matchesLocation = regionLower.includes(selectedLower) || selectedLower.includes(regionLower);
        }
        if (!matchesLocation) return false;
      }

      // Disaster type filter via L1/L2 hierarchy picker
      if (selectedTypeCodes !== null && selectedTypeCodes.size > 0) {
        const markerCodes = m.eventTypes ?? [];
        if (!markerCodes.some((c) => selectedTypeCodes.has(c))) return false;
      }

      return true;
    });
    return filtered;
  }, [
    allMarkers,
    selectedLocationId,
    selectedLocationName,
    selectedTypeCodes,
  ]);

  /* ---- Handlers ---- */
  const handleCountryChange = (value: string | null) => {
    setSelectedCountry(value ?? "All Countries");
    setSelectedRegion("All Regions");
    setSelectedMarker(null);
  };

  const handleRegionChange = (value: string | null) => {
    setSelectedRegion(value ?? "All Regions");
    setSelectedMarker(null);
  };


  const handleMarkerClick = useCallback(
    (marker: MapMarker) => {
      const full = allMarkers.find((m) => m.id === marker.id);
      setSelectedMarker(full ?? null);
    },
    [allMarkers],
  );

  const isLoading = alertsQuery.isLoading || eventsQuery.isLoading || crisesQuery.isLoading;

  return (
    <Box
      style={{
        position: "relative",
        height: "calc(100vh - 60px)",
        overflow: "hidden",
      }}
    >
      {/* ===== Filter Header Overlay ===== */}
      <Box
        className="absolute top-0 left-0 right-0 z-10"
        px={16}
        py={12}
        style={{
          background: "linear-gradient(to bottom, var(--map-overlay-from) 60%, var(--map-overlay-to))",
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          pointerEvents: "none",
        }}
      >
        <Group gap={12} style={{ pointerEvents: "auto" }}>
          <Select
            size="xs"
            value={selectedCountry}
            onChange={handleCountryChange}
            data={countryOptions}
            style={{ minWidth: 140 }}
            styles={{ input: INPUT_STYLE }}
            label={<FilterLabel>Country</FilterLabel>}
          />
          <Select
            size="xs"
            value={selectedRegion}
            onChange={handleRegionChange}
            data={regionOptions}
            style={{ minWidth: 140 }}
            styles={{ input: INPUT_STYLE }}
            label={<FilterLabel>Region</FilterLabel>}
          />
          <Box style={{ minWidth: 160 }}>
            <DisasterTypePicker
              label="Crisis Type"
              hierarchy={hierarchy}
              selected={selectedTypes}
              onChange={setSelectedTypes}
              size="xs"
            />
          </Box>
          {isLoading && <Loader size={14} mt={20} />}
        </Group>
      </Box>

      {/* ===== Mapbox Map ===== */}
      <CrisisMap
        markers={currentMarkers}
        regions={allRegions}
        center={mapCenter}
        zoom={mapZoom}
        className="w-full h-full"
        onMarkerClick={handleMarkerClick}
        focusCountryPCode="SD"
        focusCountryName="Sudan"
        focusCountryGeometry={focusCountryGeometry}
        adminBoundaries={adminBoundaries}
        adminBoundaryLevel={adminBoundaryLevel as 1 | 2 | undefined}
        fitBoundsGeometry={fitBoundsGeometry}
        populationBoundaries={populationBoundaries}
        mapStyle={mapStyle}
      />

      {/* ===== Left Panel Bar (Layers / Legend / Config) ===== */}
      <MapPanelBar
        dataView={dataView}
        onDataViewChange={setDataView}
        showPopulation={showPopulation}
        onShowPopulationChange={setShowPopulation}
        boundaryLevel={boundaryLevel}
        onBoundaryLevelChange={setBoundaryLevel}
      />

      {/* ===== Selected Marker Detail ===== */}
      {selectedMarker && (
        <MapMarkerDetail
          marker={selectedMarker}
          onClose={() => setSelectedMarker(null)}
        />
      )}

      {/* Pulse animation for critical markers */}
      <style>{`
        @keyframes pulse-dot {
          0%, 100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(220, 38, 38, 0); }
        }
      `}</style>
    </Box>
  );
}
