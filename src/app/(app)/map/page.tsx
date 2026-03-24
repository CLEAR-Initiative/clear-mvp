"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Box,
  Text,
  Group,
  Select,
  Button,
  TextInput,
  ActionIcon,
  Stack,
  Loader,
} from "@mantine/core";
import {
  IconSearch,
  IconDownload,
  IconPlayerSkipBack,
  IconPlayerPlay,
  IconPlayerSkipForward,
} from "@tabler/icons-react";
import type { MapMarker } from "~/components/map/crisis-map";
import { api } from "~/trpc/react";
import { useTeam } from "~/providers/team-provider";
import {
  type CrisisMarker,
  buildLayersFromShockTypes,
  buildCrisisTypeOptions,
  alertsToMarkers,
} from "./_components/map-markers-data";
import { useLocations } from "~/hooks/use-locations";
import { MapLayersPanel } from "./_components/map-layers-panel";
import { MapLegendPanel } from "./_components/map-legend-panel";
import { MapMarkerDetail } from "./_components/map-marker-detail";

const CrisisMap = dynamic(
  () => import("~/components/map/crisis-map").then((m) => m.CrisisMap),
  { ssr: false, loading: () => <Box w="100%" h="100%" bg="#F5F5F5" /> },
);

/* ========== Timeline data ========== */
const timelineMonths = [
  { label: "Sep", hasEvent: false },
  { label: "Oct", hasEvent: true },
  { label: "Nov", hasEvent: true },
  { label: "Dec", hasEvent: false },
  { label: "Jan", hasEvent: false },
  { label: "Feb", hasEvent: false },
];

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
  const { countries: apiCountries, getRegions, getCenter, getZoom } = useLocations();
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

  /* ---- Transform alerts to map markers ---- */
  const allMarkers: CrisisMarker[] = useMemo(() => {
    const markers = alertsToMarkers(allAlerts);
    console.log("[MapPage] allAlerts:", allAlerts.length, "allMarkers:", markers.length);
    if (allAlerts.length > 0 && markers.length === 0) {
      // debug removed
    }
    return markers;
  }, [allAlerts]);

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
  const [activeMonth, setActiveMonth] = useState(5);

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

  /* ---- Filtered markers ---- */
  const currentMarkers: MapMarker[] = useMemo(() => {
    const filtered = allMarkers.filter((m) => {
      // Country filter
      if (selectedCountry !== "All Countries" && m.country !== selectedCountry)
        return false;

      // Region filter
      if (selectedRegion !== "All Regions" && m.region !== selectedRegion)
        return false;

      // Layer filter — only apply when layers are defined (shock types loaded)
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
    console.log("[MapPage] currentMarkers:", filtered.length, "activeLayers:", activeLayers);
    return filtered;
  }, [
    allMarkers,
    selectedCountry,
    selectedRegion,
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
        <Group gap={8} style={{ pointerEvents: "auto" }}>
          <TextInput
            placeholder="Search locations..."
            size="xs"
            leftSection={<IconSearch size={14} />}
            style={{ width: 220 }}
            styles={{ input: { boxShadow: "0 2px 4px rgba(0,0,0,0.1)" } }}
          />
          <Button
            variant="outline"
            color="gray"
            size="xs"
            leftSection={<IconDownload size={14} />}
            style={{
              background: "white",
              boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              fontSize: 13,
            }}
          >
            Export
          </Button>
        </Group>
      </Box>

      {/* ===== Mapbox Map ===== */}
      <CrisisMap
        markers={currentMarkers}
        center={mapCenter}
        zoom={mapZoom}
        className="w-full h-full"
        onMarkerClick={handleMarkerClick}
      />

      {/* ===== Layers Panel ===== */}
      <MapLayersPanel
        layers={layers}
        activeLayers={activeLayers}
        onToggleLayer={toggleLayer}
      />

      {/* ===== Legend Panel ===== */}
      <MapLegendPanel layers={layers} />

      {/* ===== Selected Marker Detail ===== */}
      {selectedMarker && (
        <MapMarkerDetail
          marker={selectedMarker}
          onClose={() => setSelectedMarker(null)}
        />
      )}

      {/* ===== Timeline Bar ===== */}
      <Box
        className="absolute bottom-0 left-0 right-0 z-10 bg-white border-t border-[#E5E5E5]"
        px={16}
        py={12}
      >
        <Group justify="space-between" mb={8}>
          <Text
            size="xs"
            fw={700}
            c="#737373"
            tt="uppercase"
            style={{ letterSpacing: "0.05em", fontSize: 11 }}
          >
            Timeline
          </Text>
          <Group gap={8}>
            <ActionIcon variant="light" color="gray" size="sm">
              <IconPlayerSkipBack size={12} />
            </ActionIcon>
            <ActionIcon
              variant="filled"
              size="sm"
              style={{ background: "#E85D3D" }}
            >
              <IconPlayerPlay size={12} />
            </ActionIcon>
            <ActionIcon variant="light" color="gray" size="sm">
              <IconPlayerSkipForward size={12} />
            </ActionIcon>
          </Group>
        </Group>
        <Group justify="space-between" className="relative" h={40}>
          <Box className="absolute top-1/2 left-0 right-0 h-1 bg-[#E5E5E5] -translate-y-1/2" />
          {timelineMonths.map((month, i) => (
            <Stack
              key={month.label}
              align="center"
              gap={4}
              className="cursor-pointer z-[1]"
              onClick={() => setActiveMonth(i)}
            >
              <Box
                w={i === activeMonth ? 14 : 8}
                h={i === activeMonth ? 14 : 8}
                style={{
                  backgroundColor:
                    i === activeMonth
                      ? "#E85D3D"
                      : month.hasEvent
                        ? "#D97706"
                        : "#E5E5E5",
                  marginTop: i === activeMonth ? 12 : 16,
                }}
              />
              <Text
                size="xs"
                fw={i === activeMonth ? 600 : 400}
                c={i === activeMonth ? "#171717" : "#737373"}
                style={{ fontSize: 9 }}
              >
                {month.label}
              </Text>
            </Stack>
          ))}
        </Group>
      </Box>

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
