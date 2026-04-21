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
import type { MapMarker } from "~/components/map/crisis-map";
import { api } from "~/trpc/react";
import { useTeam } from "~/providers/team-provider";
import {
  type CrisisMarker,
  buildLayersFromShockTypes,
  buildCrisisTypeOptions,
  alertsToMarkers,
  alertsToRegions,
} from "./_components/map-markers-data";
import { useLocations } from "~/hooks/use-locations";
import { MapLayersPanel, type DataView } from "./_components/map-layers-panel";
import { MapLegendPanel } from "./_components/map-legend-panel";
import { MapMarkerDetail } from "./_components/map-marker-detail";
import { MapSettingsPopover, type BoundaryLevel } from "./_components/map-settings-popover";

const CrisisMap = dynamic(
  () => import("~/components/map/crisis-map").then((m) => m.CrisisMap),
  { ssr: false, loading: () => <Box w="100%" h="100%" bg="#F5F5F5" /> },
);

/* ========== Label styles ========== */
const LABEL_STYLE = { fontSize: 10, letterSpacing: "0.05em" } as const;
const INPUT_STYLE = {
  fontWeight: 600,
  fontSize: 13,
  border: "1px solid #E5E5E5",
} as const;

function FilterLabel({ children }: { children: string }) {
  return (
    <Text size="xs" c="#737373" tt="uppercase" style={LABEL_STYLE}>
      {children}
    </Text>
  );
}

export default function MapPage() {
  /* ---- Fetch alert data ---- */
  const { activeTeamId } = useTeam();
  const { countries: apiCountries, getRegions, getCenter, getZoom, getLocationId } = useLocations();
  const alertsQuery = api.alerts.getAlerts.useQuery({
    activeOnly: true,
    teamId: activeTeamId,
  });
  const shockTypesQuery = api.alerts.getShockTypes.useQuery();

  const allAlerts = alertsQuery.data?.alerts ?? [];
  const shockTypes = shockTypesQuery.data?.shock_types ?? [];

  /* ---- Derive layers and crisis type options from API data ---- */
  const layers = useMemo(
    () => buildLayersFromShockTypes(shockTypes),
    [shockTypes],
  );

  const crisisTypeOptions = useMemo(
    () => buildCrisisTypeOptions(shockTypes),
    [shockTypes],
  );

  /* ---- Transform alerts to map markers + regions ---- */
  const allMarkers: CrisisMarker[] = useMemo(
    () => alertsToMarkers(allAlerts),
    [allAlerts],
  );
  const allRegions = useMemo(
    () => alertsToRegions(allAlerts),
    [allAlerts],
  );

  /* ---- Filter state ---- */
  const [selectedCountry, setSelectedCountry] = useState("All Countries");
  const [selectedRegion, setSelectedRegion] = useState("All Regions");
  const [selectedShockType, setSelectedShockType] = useState("All Types");
  const [activeLayers, setActiveLayers] = useState<string[]>([]);
  // Sync active layers when shock types load (useState initializer runs before data arrives)
  useEffect(() => {
    if (layers.length > 0) {
      setActiveLayers((prev) => prev.length === 0 ? layers.map((l) => l.id) : prev);
    }
  }, [layers]);
  const [selectedMarker, setSelectedMarker] = useState<CrisisMarker | null>(
    null,
  );
  const [boundaryLevel, setBoundaryLevel] = useState<BoundaryLevel>("A1");
  const [showPopulation, setShowPopulation] = useState(false);
  const [dataView, setDataView] = useState<DataView>("alert");

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

      // Layer filter - only apply when layers are defined (shock types loaded)
      if (activeLayers.length > 0) {
        const markerType = m.type ?? "";
        if (!activeLayers.includes(markerType)) return false;
      }

      // Crisis type filter by name
      if (
        selectedShockType !== "All Types" &&
        m.shockTypeName !== selectedShockType
      )
        return false;

      return true;
    });
    return filtered;
  }, [
    allMarkers,
    selectedLocationId,
    selectedLocationName,
    activeLayers,
    selectedShockType,
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

  const handleShockTypeChange = (value: string | null) => {
    setSelectedShockType(value ?? "All Types");
  };

  const toggleLayer = (layerId: string) => {
    setActiveLayers((prev) =>
      prev.includes(layerId)
        ? prev.filter((l) => l !== layerId)
        : [...prev, layerId],
    );
  };

  const handleMarkerClick = useCallback(
    (marker: MapMarker) => {
      const full = allMarkers.find((m) => m.id === marker.id);
      setSelectedMarker(full ?? null);
    },
    [allMarkers],
  );

  const isLoading = alertsQuery.isLoading || shockTypesQuery.isLoading;

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
          background:
            "linear-gradient(to bottom, rgba(255,255,255,0.98), rgba(255,255,255,0))",
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
          <Select
            size="xs"
            value={selectedShockType}
            onChange={handleShockTypeChange}
            data={crisisTypeOptions}
            style={{ minWidth: 160 }}
            styles={{ input: INPUT_STYLE }}
            label={<FilterLabel>Crisis Type</FilterLabel>}
          />
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
        adminBoundaries={adminBoundaries}
        adminBoundaryLevel={adminBoundaryLevel as 1 | 2 | undefined}
        fitBoundsGeometry={fitBoundsGeometry}
        populationBoundaries={populationBoundaries}
      />

      {/* ===== Layers Panel ===== */}
      <MapLayersPanel
        layers={layers}
        activeLayers={activeLayers}
        onToggleLayer={toggleLayer}
        dataView={dataView}
        onDataViewChange={setDataView}
        showPopulation={showPopulation}
        onShowPopulationChange={setShowPopulation}
      />

      {/* ===== Map Settings (bottom-left) ===== */}
      <Box className="absolute z-10" style={{ bottom: 16, left: 16 }}>
        <MapSettingsPopover
          boundaryLevel={boundaryLevel}
          onBoundaryLevelChange={setBoundaryLevel}
        />
      </Box>

      {/* ===== Legend Panel ===== */}
      <MapLegendPanel layers={layers} />

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
