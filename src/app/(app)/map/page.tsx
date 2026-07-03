"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useFormatter, useTranslations } from "next-intl";
import {
  Box,
  Text,
  Group,
  Select,
  Loader,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { DisasterTypePicker } from "~/components/disaster-type-picker";
import type { MapMarker } from "~/components/map/crisis-map";
import { api } from "~/trpc/react";
import { useTeam } from "~/providers/team-provider";
import {
  type CrisisMarker,
  alertsToMarkers,
  eventsToMarkers,
  crisesToMarkers,
  alertsToRegions,
  eventsToRegions,
} from "./_components/map-markers-data";
import { useLocations } from "~/hooks/use-locations";
import { countryConfig } from "~/lib/constants/country-config";
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
  const t = useTranslations("map");
  const format = useFormatter();
  const isMobile = useMediaQuery("(max-width: 48em)");
  /* ---- Core state (must precede queries that depend on it) ---- */
  const [dataView, setDataView] = useState<DataView>("alert");

  /* ---- Fetch data ---- */
  const { activeTeamId, activeTeam } = useTeam();
  const { countries: apiCountries, getRegions, getCenter, getZoom, getLocationId } = useLocations();

  // Fetch every alert (published + archived) instead of just the currently-
  // active ones. The timeline panel below lets the user scrub back through
  // previous months, which only works if historical alerts are loaded; the
  // active-only filter is still available downstream via the per-marker
  // `status` field if a "current alerts only" toggle ever gets added.
  const alertsQuery = api.alerts.getAlerts.useQuery(
    { teamId: activeTeamId },
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
    if (dataView === "alert") return alertsToRegions(alertsQuery.data?.alerts ?? []);
    if (dataView === "event") return eventsToRegions(eventsQuery.data?.events ?? []);
    // Crises don't have polygon regions in the current data model
    return [];
  }, [dataView, alertsQuery.data, eventsQuery.data]);



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
  
  // Map layer controls - with localStorage persistence
  const [showBoundaries, setShowBoundaries] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem("map-layer-preferences");
    if (stored) {
      try {
        const prefs = JSON.parse(stored);
        return prefs.showBoundaries ?? true;
      } catch {
        return true;
      }
    }
    return true;
  });
  
  const [showMarkers, setShowMarkers] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem("map-layer-preferences");
    if (stored) {
      try {
        const prefs = JSON.parse(stored);
        return prefs.showMarkers ?? true;
      } catch {
        return true;
      }
    }
    return true;
  });
  
  const [showRoads, setShowRoads] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem("map-layer-preferences");
    if (stored) {
      try {
        const prefs = JSON.parse(stored);
        return prefs.showRoads ?? true;
      } catch {
        return true;
      }
    }
    return true;
  });
  
  const [showSatellite, setShowSatellite] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = localStorage.getItem("map-layer-preferences");
    if (stored) {
      try {
        const prefs = JSON.parse(stored);
        return prefs.showSatellite ?? false;
      } catch {
        return false;
      }
    }
    return false;
  });
  
  // Persist map layer preferences to localStorage
  useEffect(() => {
    const prefs = {
      dataView,
      showPopulation,
      showBoundaries,
      showMarkers,
      showRoads,
      showSatellite,
    };
    localStorage.setItem("map-layer-preferences", JSON.stringify(prefs));
  }, [dataView, showPopulation, showBoundaries, showMarkers, showRoads, showSatellite]);

  // Resolve the currently-selected country's L0 ID for scoping admin
  // boundary queries and for the country highlight overlay. Null when the
  // user picked "All Countries" — in that case every country-scoped query
  // below is disabled and the highlight overlay is dropped.
  const focusCountryId = useMemo(
    () => (selectedCountry !== "All Countries" ? getLocationId(selectedCountry) : null),
    [selectedCountry, getLocationId],
  );

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

  const adminBoundaryLevel = boundaryLevel === "A1" ? 1 : boundaryLevel === "A2" ? 2 : undefined;

  // Population layer: A2 districts with population, lazy-loaded when first enabled.
  const populationQuery = api.locations.getPopulationBoundaries.useQuery(
    { countryId: focusCountryId ?? undefined },
    { enabled: showPopulation && !!focusCountryId, staleTime: Infinity, refetchOnWindowFocus: false },
  );
  const populationBoundaries = useMemo(
    () => (showPopulation ? (populationQuery.data ?? []) : []),
    [showPopulation, populationQuery.data],
  );

  // Country L0 geometry — used for the country highlight instead of Mapbox's
  // inaccurate tileset. Re-runs whenever the user switches country.
  const focusCountryL0Query = api.locations.getById.useQuery(
    { id: focusCountryId! },
    { enabled: !!focusCountryId, staleTime: Infinity, refetchOnWindowFocus: false },
  );
  const focusCountryGeometry = focusCountryL0Query.data?.geometry ?? undefined;

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

  // Timeline state. Stored as "YYYY-MM"; null means "all time".
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // Reset month when the data view changes — months derived from alerts
  // won't match months derived from signals, so a stale selection would
  // hide everything.
  useEffect(() => {
    setSelectedMonth(null);
  }, [dataView]);

  /* ---- Filtered markers (location + type, before time) ---- */
  // Split into two passes so the timeline can derive its month chips from
  // what's left after location/type filtering. That way picking Sudan
  // doesn't make the timeline show Afghan-only months and vice versa.
  const markersBeforeTime: CrisisMarker[] = useMemo(() => {
    return allMarkers.filter((m) => {
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
  }, [
    allMarkers,
    selectedLocationId,
    selectedLocationName,
    selectedTypeCodes,
  ]);

  // Distinct months present in the current location/type slice, sorted newest
  // first. Markers with no `occurredAt` (e.g. crisis aggregates) are skipped —
  // they show up regardless of which month is picked.
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    for (const m of markersBeforeTime) {
      if (!m.occurredAt) continue;
      const d = new Date(m.occurredAt);
      if (Number.isNaN(d.getTime())) continue;
      // YYYY-MM — UTC so a marker that arrived at 23:30 on Jun 30 doesn't
      // shift into July on east-of-UTC clients.
      const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      set.add(ym);
    }
    return [...set].sort().reverse();
  }, [markersBeforeTime]);

  // Auto-clear the month selection if it's no longer in the current option
  // set (happens when filtering down to a country/region that has no data
  // for the previously-picked month).
  useEffect(() => {
    if (selectedMonth && !availableMonths.includes(selectedMonth)) {
      setSelectedMonth(null);
    }
  }, [availableMonths, selectedMonth]);

  /* ---- Apply timeline filter on top ---- */
  const currentMarkers: MapMarker[] = useMemo(() => {
    if (!selectedMonth) return markersBeforeTime;
    return markersBeforeTime.filter((m) => {
      // Markers without a known timestamp pass through — see availableMonths
      // comment. Time-aware markers must match the picked YYYY-MM.
      if (!m.occurredAt) return true;
      const d = new Date(m.occurredAt);
      if (Number.isNaN(d.getTime())) return true;
      const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      return ym === selectedMonth;
    });
  }, [markersBeforeTime, selectedMonth]);

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
        height: isMobile ? "calc(100dvh - 56px - 72px)" : "calc(100vh - 60px)",
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
        <Group gap={12} style={{ pointerEvents: "auto", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "flex-start", width: isMobile ? "100%" : "auto" }}>
          <Select
            size="xs"
            value={selectedCountry}
            onChange={handleCountryChange}
            data={countryOptions.map((c) =>
              // "All Countries" is a logic sentinel - translate display label only.
              c === "All Countries" ? { value: c, label: t("filters.allCountries") } : c,
            )}
            style={{ minWidth: isMobile ? "100%" : 140 }}
            styles={{ input: INPUT_STYLE }}
            label={<FilterLabel>{t("filters.country")}</FilterLabel>}
          />
          <Select
            size="xs"
            value={selectedRegion}
            onChange={handleRegionChange}
            data={regionOptions.map((r) =>
              // "All Regions" is a logic sentinel - translate display label only.
              r === "All Regions" ? { value: r, label: t("filters.allRegions") } : r,
            )}
            style={{ minWidth: isMobile ? "100%" : 140 }}
            styles={{ input: INPUT_STYLE }}
            label={<FilterLabel>{t("filters.region")}</FilterLabel>}
          />
          <Box style={{ minWidth: isMobile ? "100%" : 160 }}>
            <DisasterTypePicker
              label={t("filters.crisisType")}
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
        focusCountryPCode={
          selectedCountry !== "All Countries"
            ? countryConfig[selectedCountry]?.pCode
            : undefined
        }
        focusCountryName={
          selectedCountry !== "All Countries" ? selectedCountry : undefined
        }
        focusCountryGeometry={focusCountryGeometry}
        adminBoundaries={adminBoundaries}
        adminBoundaryLevel={adminBoundaryLevel as 1 | 2 | undefined}
        fitBoundsGeometry={fitBoundsGeometry}
        populationBoundaries={populationBoundaries}
        showBoundaries={showBoundaries}
        showMarkers={showMarkers}
        showRoads={showRoads}
        showSatellite={showSatellite}
      />

      {/* ===== Left Panel Bar (Layers / Legend / Config) ===== */}
      <MapPanelBar
        dataView={dataView}
        onDataViewChange={setDataView}
        showPopulation={showPopulation}
        onShowPopulationChange={setShowPopulation}
        boundaryLevel={boundaryLevel}
        onBoundaryLevelChange={setBoundaryLevel}
        showBoundaries={showBoundaries}
        onShowBoundariesChange={setShowBoundaries}
        showMarkers={showMarkers}
        onShowMarkersChange={setShowMarkers}
        showRoads={showRoads}
        onShowRoadsChange={setShowRoads}
        showSatellite={showSatellite}
        onShowSatelliteChange={setShowSatellite}
      />

      {/* ===== Selected Marker Detail ===== */}
      {selectedMarker && (
        <MapMarkerDetail
          marker={selectedMarker}
          onClose={() => setSelectedMarker(null)}
        />
      )}

      {/* ===== Timeline (bottom overlay) ===== */}
      {availableMonths.length > 0 && (
        <Box
          className="absolute bottom-0 left-0 right-0 z-10"
          px={16}
          py={10}
          style={{
            background: "linear-gradient(to top, var(--map-overlay-from) 60%, var(--map-overlay-to))",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            pointerEvents: "none",
          }}
        >
          <Group
            gap={8}
            wrap="nowrap"
            style={{
              pointerEvents: "auto",
              overflowX: "auto",
              paddingBottom: 2,
            }}
          >
            <Text
              size="xs"
              c="var(--color-text-muted)"
              tt="uppercase"
              style={{ ...LABEL_STYLE, flexShrink: 0, marginInlineEnd: 8 }}
            >
              {t("timeline.title")}
            </Text>

            {/* "All time" sentinel — clears the month filter */}
            <button
              type="button"
              onClick={() => setSelectedMonth(null)}
              style={{
                flexShrink: 0,
                padding: "4px 12px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                border: "1px solid",
                borderColor: selectedMonth === null ? "var(--color-accent)" : "var(--color-border-dark)",
                background: selectedMonth === null ? "var(--color-accent)" : "var(--color-bg-white)",
                color: selectedMonth === null ? "white" : "var(--color-text-secondary)",
                whiteSpace: "nowrap",
              }}
            >
              {t("timeline.allTime")}
            </button>

            {/* Months — newest first (already sorted in availableMonths) */}
            {availableMonths.map((ym) => {
              // ym is "YYYY-MM"; build a Date on the 1st UTC so format.dateTime
              // gets a stable instant regardless of viewer timezone.
              const [yStr, mStr] = ym.split("-");
              const y = Number(yStr);
              const mo = Number(mStr);
              const date = new Date(Date.UTC(y, mo - 1, 1));
              const active = selectedMonth === ym;
              return (
                <button
                  key={ym}
                  type="button"
                  onClick={() => setSelectedMonth(ym)}
                  style={{
                    flexShrink: 0,
                    padding: "4px 12px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    border: "1px solid",
                    borderColor: active ? "var(--color-accent)" : "var(--color-border-dark)",
                    background: active ? "var(--color-accent)" : "var(--color-bg-white)",
                    color: active ? "white" : "var(--color-text-secondary)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {format.dateTime(date, { month: "short", year: "numeric" })}
                </button>
              );
            })}
          </Group>
        </Box>
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
