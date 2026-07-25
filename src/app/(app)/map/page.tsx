"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useFormatter, useTranslations } from "next-intl";
import {
  Box,
  Text,
  Group,
  Stack,
  Select,
  Loader,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { DisasterTypePicker } from "~/components/disaster-type-picker";
import type { MapMarker, MarkerScreenPoint } from "~/components/map/crisis-map";
import { api } from "~/trpc/react";
import { useTeam } from "~/providers/team-provider";
import {
  type CrisisMarker,
  alertsToMarkers,
  eventsToMarkers,
  signalsToMarkers,
  crisesToMarkers,
} from "./_components/map-markers-data";
import { useLocations } from "~/hooks/use-locations";
import { resolveCountryConfig } from "~/lib/constants/country-config";
import { MapPanelBar } from "./_components/map-panel-bar";
import type { HierarchyLevel1 } from "~/components/disaster-type-picker";
import { MapLoadingOverlay } from "./_components/map-loading-overlay";
import { MapMarkerDetail } from "./_components/map-marker-detail";
import type { DataView } from "./_components/map-layers-panel";
import type { BoundaryLevel } from "./_components/map-settings-popover";
import type { BaseMapType } from "~/components/map/crisis-map";
import { useIsDark } from "~/hooks/use-is-dark";
import { MAP_FOCUS_ZOOM } from "~/lib/map-focus-href";
import { useSearchParams } from "next/navigation";
import { getAdjacentItem, orderByProximityTo } from "~/lib/detail-list-nav";
import { useDetailKeyboardNav } from "~/hooks/use-detail-keyboard-nav";

const MAX_OPEN_PANELS = 4;

interface OpenMarkerPanel {
  marker: CrisisMarker;
  /** Null after arrow-nav until the user re-clicks a pin (fallback panel placement). */
  anchor: MarkerScreenPoint | null;
  /** FIFO age — set once when the panel is created. */
  openedAt: number;
  /** Bring-to-front order — bumped on open/focus/drag. */
  z: number;
  /**
   * Frozen proximity walk from the pin that opened/focused this panel:
   * origin first, then nearest → farthest. Stepping does not rebuild.
   */
  proximityOrderIds: number[];
}

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
  const searchParams = useSearchParams();
  const focusEventId = searchParams.get("event");
  const focusSignalId = searchParams.get("signal");
  const focusCrisisId = searchParams.get("crisis");
  const focusEntityId = focusEventId ?? focusSignalId ?? focusCrisisId;

  /* ---- Core state (must precede queries that depend on it) ---- */
  const [dataView, setDataView] = useState<DataView>(() => {
    if (focusSignalId) return "signal";
    if (focusCrisisId) return "crisis";
    if (focusEventId) return "event";
    return "alert";
  });

  /* ---- Fetch data ---- */
  const { activeTeamId, activeTeam } = useTeam();
  const { countries: apiCountries, getRegions, getCenter, getZoom, getLocationId } = useLocations();

  // Timeline state. Stored as "YYYY-MM"; null means "all time".
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);

  // Timeframe window. Rolling windows fetch only active (published) alerts;
  // "all" additionally pulls archived history so the timeline can scrub
  // back through past months. Default is a 30-day window - the archived
  // backlog is ~5x the published set and dominated page load time.
  const [timeframe, setTimeframe] = useState<"7d" | "30d" | "90d" | "all">("30d");
  
  // Compute from/to dates for server-side filtering
  const timeframeRange = useMemo(() => {
    if (timeframe === "all") return { from: undefined, to: undefined };
    const days = timeframe === "7d" ? 7 : timeframe === "30d" ? 30 : 90;
    const now = new Date();
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    return {
      from: from.toISOString(),
      to: now.toISOString(),
    };
  }, [timeframe]);

  // Fetch data for active view ONLY (no parallel loading)
  const alertsQuery = api.alerts.alertsForMap.useQuery(
    { 
      includeDummy: true, 
      activeOnly: timeframe !== "all",
      from: timeframeRange.from,
      to: timeframeRange.to,
    },
    { enabled: dataView === "alert", placeholderData: (prev) => prev },
  );
  const eventsQuery = api.alerts.eventsForMap.useQuery(
    { 
      includeDummy: true,
      from: timeframeRange.from,
      to: timeframeRange.to,
    },
    { enabled: dataView === "event", placeholderData: (prev) => prev },
  );
  const crisesQuery = api.alerts.getCrises.useQuery(
    undefined,
    { enabled: dataView === "crisis", placeholderData: (prev) => prev },
  );
  const signalsListQuery = api.signals.forMap.useQuery(
    { 
      includeDummy: true,
      from: timeframeRange.from,
      to: timeframeRange.to,
    },
    { enabled: dataView === "signal", staleTime: 60_000, placeholderData: (prev) => prev },
  );
  const hierarchyQuery = api.alerts.getDisasterTypeHierarchy.useQuery(undefined, {
    staleTime: Infinity, refetchOnWindowFocus: false,
  });
  const hierarchy: HierarchyLevel1[] = hierarchyQuery.data ?? [];

  /* ---- Derive markers based on active data view (markers-only; no region heatmaps) ---- */
  const allMarkers: CrisisMarker[] = useMemo(() => {
    let markers: CrisisMarker[] = [];
    if (dataView === "alert")  markers = alertsToMarkers(alertsQuery.data?.alerts ?? []);
    if (dataView === "event")  markers = eventsToMarkers(eventsQuery.data?.events ?? []);
    if (dataView === "signal") markers = signalsToMarkers(signalsListQuery.data ?? []);
    if (dataView === "crisis") markers = crisesToMarkers(crisesQuery.data?.crises ?? []);
    
    return markers;
  }, [dataView, alertsQuery.data, eventsQuery.data, signalsListQuery.data, crisesQuery.data]);

  const focusMarker = useMemo(() => {
    if (!focusEntityId) return null;
    return allMarkers.find((m) => m.eventId === focusEntityId) ?? null;
  }, [allMarkers, focusEntityId]);

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
  const [openPanels, setOpenPanels] = useState<OpenMarkerPanel[]>([]);
  const [keepPanelsOpen, setKeepPanelsOpen] = useState(false);
  const [chromeActiveMarkerId, setChromeActiveMarkerId] = useState<number | null>(null);
  /** When set, camera flies to this marker; closing restores `returnCamera`. */
  const [markerFocus, setMarkerFocus] = useState<{ lng: number; lat: number; zoom: number } | null>(null);
  /** Camera to restore when closing a marker sheet (usually the prior cluster/donut layer). */
  const [returnCamera, setReturnCamera] = useState<{ center: [number, number]; zoom: number } | null>(null);
  /** Bumped on detail close so CrisisMap always flies back to returnCamera. */
  const [forceFlyToken, setForceFlyToken] = useState(0);
  const panelZRef = useRef(10);
  /** Live browse camera from Mapbox (includes cluster fitBounds not tracked by React props). */
  const browseCameraRef = useRef<{ center: [number, number]; zoom: number } | null>(null);
  /** Last browse camera while not in marker focus. */
  const layerCameraRef = useRef<{ center: [number, number]; zoom: number } | null>(null);
  /** Donut-level camera captured when a cluster is tapped (before expand). */
  const donutCameraRef = useRef<{ center: [number, number]; zoom: number } | null>(null);
  /** True after a donut cluster is expanded (until detail closes / panels clear). */
  const openedFromClusterRef = useRef(false);
  /** How many markers were in the last expanded cluster (0 = none). */
  const clusterLeafCountRef = useRef(0);
  /**
   * Camera to restore when the last detail panel closes (group pins → expanded
   * cluster framing). Lonely pins keep the detail zoom on close.
   * Decided at open — never mutated inside a setState updater (Strict Mode safe).
   */
  const detailRestoreCameraRef = useRef<{ center: [number, number]; zoom: number } | null>(null);
  /** True when the open detail should close back to group zoom. */
  const detailCloseIsGroupRef = useRef(false);
  const openPanelsRef = useRef(openPanels);
  openPanelsRef.current = openPanels;
  const returnCameraRef = useRef(returnCamera);
  returnCameraRef.current = returnCamera;
  const markerFocusRef = useRef(markerFocus);
  markerFocusRef.current = markerFocus;

  const handleCameraChange = useCallback((camera: { center: [number, number]; zoom: number }) => {
    // Track browse camera only while not in a marker-detail focus fly.
    if (markerFocusRef.current) return;
    browseCameraRef.current = camera;
    layerCameraRef.current = camera;
    // If the user zooms back out to donut/regional depth, drop group context
    // so the next pin is treated as lonely (close → global).
    const donut = donutCameraRef.current;
    if (
      openedFromClusterRef.current &&
      donut &&
      camera.zoom <= donut.zoom + 0.5
    ) {
      openedFromClusterRef.current = false;
      clusterLeafCountRef.current = 0;
      donutCameraRef.current = null;
    }
  }, []);

  const handleClusterExpand = useCallback((
    camera: { center: [number, number]; zoom: number },
    leafCount: number,
  ) => {
    donutCameraRef.current = camera;
    openedFromClusterRef.current = true;
    clusterLeafCountRef.current = leafCount;
  }, []);
  const [boundaryLevel, setBoundaryLevel] = useState<BoundaryLevel>("A1");
  const [showPopulation, setShowPopulation] = useState(false);
  const [showRoads, setShowRoads] = useState(true);
  const [baseMapType, setBaseMapType] = useState<BaseMapType>("simple");

  // Deep-link from detail Back / Full Map: align data view + clear filters that
  // would hide the target marker (#108).
  useEffect(() => {
    if (!focusEntityId) return;
    if (focusSignalId) setDataView("signal");
    else if (focusCrisisId) setDataView("crisis");
    else if (focusEventId) setDataView("event");
    setSelectedMonth(null);
    setSelectedRegion("All Regions");
  }, [focusEntityId, focusSignalId, focusCrisisId, focusEventId]);

  // Pulse the deep-linked pin once markers are available.
  useEffect(() => {
    if (!focusMarker) return;
    setChromeActiveMarkerId(focusMarker.id);
  }, [focusMarker]);

  // Resolve the currently-selected country's L0 ID for scoping admin
  // boundary queries and for the country highlight overlay. Null when the
  // user picked "All Countries" - in that case every country-scoped query
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
  // Prefetching on country focus was racing the marker batch and bloating map load.
  const populationQuery = api.locations.getPopulationBoundaries.useQuery(
    { countryId: focusCountryId ?? undefined },
    { enabled: showPopulation && !!focusCountryId, staleTime: Infinity, refetchOnWindowFocus: false },
  );
  const populationBoundaries = useMemo(
    () => (showPopulation ? (populationQuery.data ?? []) : []),
    [showPopulation, populationQuery.data],
  );
  const populationLoading = showPopulation && populationQuery.isFetching && populationBoundaries.length === 0;

  // Country L0 geometry - country highlight paint only. Camera framing uses
  // static countryConfig so switches don't wait on this (often 2–5s) fetch.
  const focusCountryL0Query = api.locations.getById.useQuery(
    { id: focusCountryId! },
    { enabled: !!focusCountryId, staleTime: Infinity, refetchOnWindowFocus: false },
  );
  // Ignore stale prior-country payloads while the new id is in flight.
  const focusCountryGeometry =
    focusCountryL0Query.data?.id === focusCountryId
      ? (focusCountryL0Query.data.geometry ?? undefined)
      : undefined;

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
    if (markerFocus) return [markerFocus.lng, markerFocus.lat];
    if (returnCamera) return returnCamera.center;
    if (focusMarker) return [focusMarker.lng, focusMarker.lat];
    if (selectedCountry !== "All Countries") {
      return getCenter(selectedCountry);
    }
    if (allMarkers.length === 0) return [30.0, 15.5];
    const avgLng =
      allMarkers.reduce((sum, m) => sum + m.lng, 0) / allMarkers.length;
    const avgLat =
      allMarkers.reduce((sum, m) => sum + m.lat, 0) / allMarkers.length;
    return [avgLng, avgLat];
  }, [allMarkers, selectedCountry, focusMarker, markerFocus, returnCamera, getCenter]);

  const mapZoom = useMemo(() => {
    if (markerFocus) return markerFocus.zoom;
    if (returnCamera) return returnCamera.zoom;
    if (focusMarker) return MAP_FOCUS_ZOOM;
    if (selectedCountry !== "All Countries") {
      // Same country zoom on mobile and desktop — fitBounds owns framing when
      // geometry/bbox is available; this is the fallback before that lands.
      return getZoom(selectedCountry);
    }
    return isMobile ? 4 : 5;
  }, [selectedCountry, focusMarker, markerFocus, returnCamera, getZoom, isMobile]);

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

  // Reset month when the data view changes - months derived from alerts
  // won't match months derived from signals, so a stale selection would
  // hide everything. Also clear marker panels (Keep panels open is same-view only).
  useEffect(() => {
    setSelectedMonth(null);
    setOpenPanels([]);
    openPanelsRef.current = [];
    setMarkerFocus(null);
    markerFocusRef.current = null;
    setReturnCamera(null);
    detailRestoreCameraRef.current = null;
    detailCloseIsGroupRef.current = false;
    openedFromClusterRef.current = false;
    clusterLeafCountRef.current = 0;
    // Keep deep-link pin pulse when arriving via ?event|signal|crisis= (#108).
    if (!focusEntityId) setChromeActiveMarkerId(null);
  }, [dataView, focusEntityId]);

  const clearOpenPanels = useCallback(() => {
    setOpenPanels([]);
    openPanelsRef.current = [];
    setChromeActiveMarkerId(null);
    setMarkerFocus(null);
    markerFocusRef.current = null;
    setReturnCamera(null);
    donutCameraRef.current = null;
    openedFromClusterRef.current = false;
    clusterLeafCountRef.current = 0;
    detailRestoreCameraRef.current = null;
    detailCloseIsGroupRef.current = false;
  }, []);

  const bumpPanelZ = useCallback(() => {
    panelZRef.current += 1;
    return panelZRef.current;
  }, []);

  const focusOpenPanel = useCallback((markerId: number) => {
    const z = bumpPanelZ();
    setOpenPanels((prev) =>
      prev.map((p) => (p.marker.id === markerId ? { ...p, z } : p)),
    );
  }, [bumpPanelZ]);

  const handlePanelChromeActive = useCallback((markerId: number, active: boolean) => {
    setChromeActiveMarkerId((prev) => {
      if (active) return markerId;
      return prev === markerId ? null : prev;
    });
  }, []);

  const closeOpenPanel = useCallback((markerId: number) => {
    const nextPanels = openPanelsRef.current.filter((p) => p.marker.id !== markerId);
    const closingLast =
      nextPanels.length === 0 && openPanelsRef.current.some((p) => p.marker.id === markerId);

    openPanelsRef.current = nextPanels;
    setOpenPanels(nextPanels);
    setChromeActiveMarkerId((prev) => (prev === markerId ? null : prev));

    if (!closingLast) return;

    const restore = detailRestoreCameraRef.current;
    const wasGroup = detailCloseIsGroupRef.current;
    const focused = markerFocusRef.current;
    detailRestoreCameraRef.current = null;
    detailCloseIsGroupRef.current = false;

    // Keep cluster context after a group close so sibling pins still restore
    // group zoom; clear it after a lonely close.
    if (!wasGroup) {
      openedFromClusterRef.current = false;
      clusterLeafCountRef.current = 0;
      donutCameraRef.current = null;
    }

    setMarkerFocus(null);
    markerFocusRef.current = null;

    if (wasGroup && restore) {
      // Group pin → fly back to the expanded-group zoom.
      const target = {
        center: [restore.center[0], restore.center[1]] as [number, number],
        zoom: restore.zoom,
      };
      setReturnCamera(target);
      returnCameraRef.current = target;
      setForceFlyToken((n) => n + 1);
      return;
    }

    // Lonely pin → keep the detail zoom (do not zoom out to country overview).
    if (focused) {
      const target = {
        center: [focused.lng, focused.lat] as [number, number],
        zoom: focused.zoom,
      };
      setReturnCamera(target);
      returnCameraRef.current = target;
      return;
    }

    setReturnCamera(null);
    returnCameraRef.current = null;
  }, []);

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

      // Timeframe filtering is now handled server-side in the forMap queries

      return true;
    });
  }, [
    allMarkers,
    selectedLocationId,
    selectedLocationName,
    selectedTypeCodes,
  ]);

  // Distinct months present in the current location/type slice, sorted newest
  // first. Markers with no `occurredAt` (e.g. crisis aggregates) are skipped -
  // they show up regardless of which month is picked.
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    for (const m of markersBeforeTime) {
      if (!m.occurredAt) continue;
      const d = new Date(m.occurredAt);
      if (Number.isNaN(d.getTime())) continue;
      // YYYY-MM - UTC so a marker that arrived at 23:30 on Jun 30 doesn't
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
  const currentMarkers: CrisisMarker[] = useMemo(() => {
    if (!selectedMonth) return markersBeforeTime;
    return markersBeforeTime.filter((m) => {
      // Markers without a known timestamp pass through - see availableMonths
      // comment. Time-aware markers must match the picked YYYY-MM.
      if (!m.occurredAt) return true;
      const d = new Date(m.occurredAt);
      if (Number.isNaN(d.getTime())) return true;
      const ym = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
      return ym === selectedMonth;
    });
  }, [markersBeforeTime, selectedMonth]);

  /** Resolve a panel's frozen proximity order against the live filtered set. */
  const markersForPanelNav = useCallback(
    (panel: OpenMarkerPanel): CrisisMarker[] => {
      const byId = new Map(currentMarkers.map((m) => [m.id, m]));
      const ordered: CrisisMarker[] = [];
      for (const id of panel.proximityOrderIds) {
        const hit = byId.get(id);
        if (hit) ordered.push(hit);
      }
      // Any new filter members not in the frozen order append by proximity to current.
      if (ordered.length < currentMarkers.length) {
        const seen = new Set(ordered.map((m) => m.id));
        const extras = currentMarkers.filter((m) => !seen.has(m.id));
        if (extras.length > 0 && ordered[0]) {
          ordered.push(
            ...orderByProximityTo(extras, ordered[0].id, (m) => m.id),
          );
        } else {
          ordered.push(...extras);
        }
      }
      return ordered;
    },
    [currentMarkers],
  );

  const stepOpenPanelMarker = useCallback(
    (fromMarkerId: number, direction: "prev" | "next") => {
      const panel =
        openPanelsRef.current.find((p) => p.marker.id === fromMarkerId) ??
        openPanels.find((p) => p.marker.id === fromMarkerId);
      if (!panel) return;
      const ordered = markersForPanelNav(panel);
      const { prev, next } = getAdjacentItem(ordered, fromMarkerId, (m) => m.id);
      const target = direction === "prev" ? prev : next;
      if (!target) return;

      setOpenPanels((panels) => {
        const alreadyOpen = panels.some((p) => p.marker.id === target.id);
        if (alreadyOpen) {
          const z = bumpPanelZ();
          return panels
            .filter((p) => p.marker.id !== fromMarkerId)
            .map((p) => (p.marker.id === target.id ? { ...p, z } : p));
        }
        const z = bumpPanelZ();
        return panels.map((p) =>
          p.marker.id === fromMarkerId
            ? {
                ...p,
                marker: target,
                anchor: null,
                z,
                // Keep the frozen proximity walk — do not re-anchor mid-tour.
                proximityOrderIds: p.proximityOrderIds,
              }
            : p,
        );
      });

      // Keep current detail zoom while the camera follows the stepped pin.
      const focusZoom = markerFocusRef.current?.zoom ?? MAP_FOCUS_ZOOM;
      const focus = { lng: target.lng, lat: target.lat, zoom: focusZoom };
      setMarkerFocus(focus);
      markerFocusRef.current = focus;
      setChromeActiveMarkerId(target.id);
    },
    [openPanels, markersForPanelNav, bumpPanelZ],
  );

  const topOpenPanel = useMemo(() => {
    if (openPanels.length === 0) return null;
    return openPanels.reduce((best, p) => (p.z >= best.z ? p : best));
  }, [openPanels]);

  const topPanelAdjacent = useMemo(() => {
    if (!topOpenPanel) {
      return { hasPrev: false, hasNext: false };
    }
    const ordered = markersForPanelNav(topOpenPanel);
    const { prev, next } = getAdjacentItem(
      ordered,
      topOpenPanel.marker.id,
      (m) => m.id,
    );
    return {
      hasPrev: prev != null,
      hasNext: next != null,
    };
  }, [topOpenPanel, markersForPanelNav]);

  const navigateTopPanelPrev = useCallback(() => {
    if (topOpenPanel) stepOpenPanelMarker(topOpenPanel.marker.id, "prev");
  }, [topOpenPanel, stepOpenPanelMarker]);

  const navigateTopPanelNext = useCallback(() => {
    if (topOpenPanel) stepOpenPanelMarker(topOpenPanel.marker.id, "next");
  }, [topOpenPanel, stepOpenPanelMarker]);

  useDetailKeyboardNav({
    enabled: topOpenPanel != null,
    hasPrev: topPanelAdjacent.hasPrev,
    hasNext: topPanelAdjacent.hasNext,
    onPrev: navigateTopPanelPrev,
    onNext: navigateTopPanelNext,
  });

  /* ---- Handlers ---- */
  const handleCountryChange = (value: string | null) => {
    setSelectedCountry(value ?? "All Countries");
    setSelectedRegion("All Regions");
    clearOpenPanels();
  };

  const handleRegionChange = (value: string | null) => {
    setSelectedRegion(value ?? "All Regions");
    clearOpenPanels();
  };


  const handleMarkerClick = useCallback(
    (
      marker: MapMarker,
      screenPoint: MarkerScreenPoint,
      camera?: { center: [number, number]; zoom: number },
    ) => {
      const full =
        currentMarkers.find((m) => m.id === marker.id) ??
        allMarkers.find((m) => m.id === marker.id);
      if (!full) return;

      // Click-time camera = group framing after donut expand, or country overview.
      const prior = camera ?? browseCameraRef.current ?? layerCameraRef.current;

      const countryZoom =
        selectedCountry !== "All Countries"
          ? getZoom(selectedCountry)
          : (isMobile ? 4 : 5);

      // Group (≥2 markers from a donut): close returns to this group zoom.
      // Lonely pin: close keeps the detail zoom (no country fitBounds).
      const fromGroup =
        openedFromClusterRef.current &&
        clusterLeafCountRef.current >= 2 &&
        prior != null;

      detailCloseIsGroupRef.current = fromGroup;
      if (fromGroup) {
        const restore = {
          center: [prior.center[0], prior.center[1]] as [number, number],
          zoom: prior.zoom,
        };
        detailRestoreCameraRef.current = restore;
        setReturnCamera(restore);
        returnCameraRef.current = restore;
      } else {
        detailRestoreCameraRef.current = null;
        setReturnCamera(null);
        returnCameraRef.current = null;
      }

      // Zoom in past the current layer so close clearly returns outward.
      const focusZoom = Math.min(14.5, (prior?.zoom ?? countryZoom) + 2.5);
      setMarkerFocus({ lng: full.lng, lat: full.lat, zoom: focusZoom });
      markerFocusRef.current = { lng: full.lng, lat: full.lat, zoom: focusZoom };

      // Re-anchor proximity walk from the clicked pin (nearest cluster first).
      const proximityOrderIds = orderByProximityTo(
        currentMarkers.length > 0 ? currentMarkers : [full],
        full.id,
        (m) => m.id,
      ).map((m) => m.id);

      // Mobile + Keep panels open off: classic single-panel replace.
      const accumulate = keepPanelsOpen && !isMobile;

      setOpenPanels((prev) => {
        if (!accumulate) {
          return [{
            marker: full,
            anchor: screenPoint,
            openedAt: Date.now(),
            z: bumpPanelZ(),
            proximityOrderIds,
          }];
        }

        const existing = prev.find((p) => p.marker.id === full.id);
        if (existing) {
          // Focus existing — no duplicate; refresh proximity from this pin.
          return prev.map((p) =>
            p.marker.id === full.id
              ? { ...p, anchor: screenPoint, z: bumpPanelZ(), proximityOrderIds }
              : p,
          );
        }

        const next: OpenMarkerPanel[] = [
          ...prev,
          {
            marker: full,
            anchor: screenPoint,
            openedAt: Date.now(),
            z: bumpPanelZ(),
            proximityOrderIds,
          },
        ];
        // Soft max 4 — drop oldest by openedAt (FIFO).
        while (next.length > MAX_OPEN_PANELS) {
          let oldestIdx = 0;
          for (let i = 1; i < next.length; i++) {
            if (next[i]!.openedAt < next[oldestIdx]!.openedAt) oldestIdx = i;
          }
          next.splice(oldestIdx, 1);
        }
        return next;
      });
    },
    [allMarkers, currentMarkers, keepPanelsOpen, isMobile, bumpPanelZ, selectedCountry, getZoom],
  );

  const isLoading =
    (dataView === "alert" && alertsQuery.isLoading) ||
    (dataView === "event" && eventsQuery.isLoading) ||
    (dataView === "signal" && signalsListQuery.isLoading) ||
    (dataView === "crisis" && crisesQuery.isLoading);

  // Show loading overlay only on the initial fetch; timeframe/status
  // refetches keep the previous markers visible via placeholderData.
  const showLoadingOverlay = isLoading;

  // App shell reserves pt/pb gutters for mobile chrome; bleed the map through
  // them so the canvas fills the viewport edge-to-edge under the overlays.
  const mobileTopGutter = 56;
  const mobileBottomGutter = 72;

  return (
    <Box
      mt={{ base: -mobileTopGutter, sm: 0 }}
      mb={{ base: -mobileBottomGutter, sm: 0 }}
      h="100dvh"
      style={{
        position: "relative",
        flex: 1,
        minHeight: 0,
        width: "100%",
        overflow: "hidden",
        background: "var(--color-bg-primary)",
      }}
    >
      {/* Top filters bar — desktop only; mobile uses the Filters icon in MapPanelBar */}
      <Box
        visibleFrom="sm"
        className="absolute top-0 left-0 right-0 z-20"
        data-tour="map-filters"
        px={16}
        py={12}
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          pointerEvents: "none",
        }}
      >
        <Group gap={12} style={{ pointerEvents: "auto" }} wrap="wrap">
          <Select
            size="xs"
            value={selectedCountry}
            onChange={handleCountryChange}
            data={countryOptions.map((c) =>
              c === "All Countries" ? { value: c, label: t("filters.allCountries") } : c,
            )}
            style={{ minWidth: 140 }}
            styles={{ input: INPUT_STYLE }}
            label={<FilterLabel>{t("filters.country")}</FilterLabel>}
          />
          <Select
            size="xs"
            value={selectedRegion}
            onChange={handleRegionChange}
            data={regionOptions.map((r) =>
              r === "All Regions" ? { value: r, label: t("filters.allRegions") } : r,
            )}
            style={{ minWidth: 140 }}
            styles={{ input: INPUT_STYLE }}
            label={<FilterLabel>{t("filters.region")}</FilterLabel>}
          />
          <Box style={{ minWidth: 160 }}>
            <DisasterTypePicker
              label={t("filters.crisisType")}
              hierarchy={hierarchy}
              selected={selectedTypes}
              onChange={setSelectedTypes}
              size="xs"
            />
          </Box>
          <Select
            size="xs"
            value={timeframe}
            onChange={(v) => setTimeframe((v ?? "30d") as typeof timeframe)}
            data={[
              { value: "7d",  label: t("filters.last7days") },
              { value: "30d", label: t("filters.last30days") },
              { value: "90d", label: t("filters.last90days") },
              { value: "all", label: t("filters.allTime") },
            ]}
            style={{ minWidth: 130 }}
            styles={{ input: INPUT_STYLE }}
            label={<FilterLabel>{t("filters.timeframe")}</FilterLabel>}
          />
          {isLoading && <Loader size={14} mt={20} />}
        </Group>
      </Box>

      {/* Map container with loading overlay — above timeline empty space for zoom hit-testing */}
      <Box
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 10,
        }}
      >
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
              ? resolveCountryConfig(selectedCountry)?.pCode
              : undefined
          }
          focusCountryName={
            selectedCountry !== "All Countries" ? selectedCountry : undefined
          }
          focusCountryGeometry={focusCountryGeometry}
          adminBoundaries={adminBoundaries}
          adminBoundaryLevel={adminBoundaryLevel as 1 | 2 | undefined}
          fitBoundsGeometry={focusEntityId || markerFocus ? null : fitBoundsGeometry}
          fitBoundsOnFocus={!focusEntityId && !markerFocus && !returnCamera}
          forceFlyToken={forceFlyToken}
          flyDuration={markerFocus ? 500 : 650}
          // Keep pin above the ~45vh sheet + breathing room.
          flyPaddingBottom={
            markerFocus && isMobile
              ? Math.round((typeof window !== "undefined" ? window.innerHeight : 700) * 0.45) + 72
              : 0
          }
          onCameraChange={handleCameraChange}
          onClusterExpand={handleClusterExpand}
          populationBoundaries={populationBoundaries}
          showBoundaries={boundaryLevel !== "none"}
          showRoads={showRoads}
          baseMapType={baseMapType}
          hoveredMarkerId={chromeActiveMarkerId}
        />

        {/* Loading overlay - only shows when map is mounted and data is loading */}
        {showLoadingOverlay && <MapLoadingOverlay dataView={dataView} />}
      </Box>

      {/* ===== Left Panel Bar (Layers / Legend / mobile Filters) ===== */}
      <MapPanelBar
        dataView={dataView}
        onDataViewChange={setDataView}
        showPopulation={showPopulation}
        onShowPopulationChange={setShowPopulation}
        populationLoading={populationLoading}
        boundaryLevel={boundaryLevel}
        onBoundaryLevelChange={setBoundaryLevel}
        showRoads={showRoads}
        onShowRoadsChange={setShowRoads}
        baseMapType={baseMapType}
        onBaseMapTypeChange={setBaseMapType}
        keepPanelsOpen={keepPanelsOpen}
        onKeepPanelsOpenChange={setKeepPanelsOpen}
        filters={
          <Stack gap={10}>
            <Select
              size="xs"
              value={selectedCountry}
              onChange={handleCountryChange}
              data={countryOptions.map((c) =>
                c === "All Countries" ? { value: c, label: t("filters.allCountries") } : c,
              )}
              styles={{ input: INPUT_STYLE }}
              label={<FilterLabel>{t("filters.country")}</FilterLabel>}
            />
            <Select
              size="xs"
              value={selectedRegion}
              onChange={handleRegionChange}
              data={regionOptions.map((r) =>
                r === "All Regions" ? { value: r, label: t("filters.allRegions") } : r,
              )}
              styles={{ input: INPUT_STYLE }}
              label={<FilterLabel>{t("filters.region")}</FilterLabel>}
            />
            <DisasterTypePicker
              label={t("filters.crisisType")}
              hierarchy={hierarchy}
              selected={selectedTypes}
              onChange={setSelectedTypes}
              size="xs"
            />
            <Select
              size="xs"
              value={timeframe}
              onChange={(v) => setTimeframe((v ?? "30d") as typeof timeframe)}
              data={[
                { value: "7d",  label: t("filters.last7days") },
                { value: "30d", label: t("filters.last30days") },
                { value: "90d", label: t("filters.last90days") },
                { value: "all", label: t("filters.allTime") },
              ]}
              styles={{ input: INPUT_STYLE }}
              label={<FilterLabel>{t("filters.timeframe")}</FilterLabel>}
            />
            {isLoading && <Loader size={14} />}
          </Stack>
        }
      />

      {/* ===== Marker detail panel(s) ===== */}
      {openPanels.map((panel) => {
        const ordered = markersForPanelNav(panel);
        const { prev, next } = getAdjacentItem(
          ordered,
          panel.marker.id,
          (m) => m.id,
        );
        return (
          <MapMarkerDetail
            key={panel.marker.id}
            marker={panel.marker}
            anchor={panel.anchor}
            stackZIndex={panel.z}
            onActivate={() => focusOpenPanel(panel.marker.id)}
            onChromeActiveChange={(active) =>
              handlePanelChromeActive(panel.marker.id, active)
            }
            onClose={() => closeOpenPanel(panel.marker.id)}
            onSwipePrev={
              prev ? () => stepOpenPanelMarker(panel.marker.id, "prev") : undefined
            }
            onSwipeNext={
              next ? () => stepOpenPanelMarker(panel.marker.id, "next") : undefined
            }
          />
        );
      })}

      {/* ===== Timeline (bottom overlay) — desktop only; hide on mobile for map real estate ===== */}
      {availableMonths.length > 0 && !isMobile && (
        <Box
          className="absolute left-0 right-0 z-20"
          px={16}
          py={10}
          style={{
            bottom: 12,
            pointerEvents: "none",
          }}
        >
          <Group
            gap={8}
            wrap="nowrap"
            style={{
              // Fit content so empty space does not cover Mapbox zoom (+/−) on the right.
              pointerEvents: "auto",
              overflowX: "auto",
              paddingBottom: 2,
              width: "fit-content",
              maxWidth: "100%",
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

            {/* "All time" sentinel - clears the month filter */}
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

            {/* Months - newest first (already sorted in availableMonths) */}
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
