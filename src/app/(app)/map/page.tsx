"use client";

import { useCallback, useEffect, useMemo, useRef, useState, Suspense } from "react";
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
import { notifications } from "@mantine/notifications";
import { useMediaQuery } from "@mantine/hooks";
import { IconX } from "@tabler/icons-react";
import { DisasterTypePicker } from "~/components/disaster-type-picker";
import type {
  CrisisMapApi,
  MapMarker,
  MarkerScreenPoint,
  BaseMapType,
} from "~/components/map/crisis-map";
import {
  shouldShowPointAltitude,
  type PointAltitudeResult,
} from "~/lib/map/point-altitude";
import { api } from "~/trpc/react";
import { useTeam } from "~/providers/team-provider";
import { useTeamCountry, useScopedCountryOptions } from "~/hooks/use-team-country";
import {
  type CrisisMarker,
  alertsToMarkers,
  eventsToMarkers,
  focusEventToMarkers,
  signalsToMarkers,
  crisesToMarkers,
  applyLocationChallengesToMarkers,
} from "./_components/map-markers-data";
import type { GqlSignalLocationChallenge } from "~/lib/types/graphql";
import { useLocations } from "~/hooks/use-locations";
import { resolveCountryConfig, shortCountryName, WORLD_VIEW } from "~/lib/constants/country-config";
import { MapPanelBar } from "./_components/map-panel-bar";
import type { HierarchyLevel1 } from "~/components/disaster-type-picker";
import { MapLoadingOverlay, MapPreloader } from "./_components/map-loading-overlay";
import { MapMarkerDetail } from "./_components/map-marker-detail";
import {
  MapPanelConnectors,
  type PanelGeometry,
} from "./_components/map-panel-connectors";
import type { DataView } from "./_components/map-layers-panel";
import type { BoundaryLevel } from "./_components/map-settings-popover";
import { MAP_FOCUS_ZOOM } from "~/lib/map-focus-href";
import {
  readMapViewState,
  writeMapViewState,
  type MapViewCamera,
  type MapViewStateV1,
} from "~/lib/map-view-state";
import {
  ALL_REGIONS,
  writeMapNavContext,
  writeMapNavEventIds,
  writeMapNavSignalIds,
} from "~/lib/map-nav-context";
import { useRouter, useSearchParams } from "next/navigation";
import { getAdjacentItem, orderByProximityTo } from "~/lib/detail-list-nav";
import { useDetailKeyboardNav } from "~/hooks/use-detail-keyboard-nav";
import {
  pickTourDemoMarker,
  TOUR_MAP_DEMO_EVENT,
  type TourMapDemoDetail,
} from "~/lib/onboarding/tour-map-demo";
import {
  blockagesHintFromMeta,
  fetchBlockagesMapCollection,
  isBlockagesUiEnabled,
} from "~/lib/map/fetch-blockages";
import {
  seismicSignalsHintFromMeta,
  fetchSeismicSignalsMapCollection,
  isSeismicSignalsUiEnabled,
} from "~/lib/map/fetch-usgs-earthquakes";
import { seismicQueryBboxForCountry } from "~/lib/map/usgs-fdsn-query";
const MAX_OPEN_PANELS = 4;

interface OpenMarkerPanel {
  marker: CrisisMarker;
  /** Null after arrow-nav until the user re-clicks a pin (fallback panel placement). */
  anchor: MarkerScreenPoint | null;
  /** FIFO age - set once when the panel is created. */
  openedAt: number;
  /** Bring-to-front order - bumped on open/focus/drag. */
  z: number;
  /**
   * Frozen proximity walk from the pin that opened/focused this panel:
   * origin first, then nearest → farthest. Stepping does not rebuild.
   */
  proximityOrderIds: number[];
}

function MapLoadingPlaceholder() {
  return (
    <Box
      w="100%"
      h="100%"
      style={{
        position: "relative",
        background: "var(--color-bg-primary)",
      }}
    >
      <MapPreloader dataView="alert" showMessages />
    </Box>
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

function MapPageContent() {
  const t = useTranslations("map");
  const format = useFormatter();
  const isMobile = useMediaQuery("(max-width: 48em)");
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlFocusEventId = searchParams.get("event");
  const urlFocusSignalId = searchParams.get("signal");
  const urlFocusCrisisId = searchParams.get("crisis");
  /**
   * Session restore from map → detail → back. Skipped when the URL asks for
   * a solo-focus deep link (`?event=` / signal / crisis).
   */
  const [restoredView] = useState<MapViewStateV1 | null>(() => {
    if (typeof window === "undefined") return null;
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("event") || sp.get("signal") || sp.get("crisis")) return null;
    return readMapViewState();
  });
  /**
   * Session-restore seed for center/zoom props. Cleared on country/region
   * change. Never updated from live pans - that re-triggered flyTo and made
   * drag/tilt feel staggered.
   */
  const [cameraSeed, setCameraSeed] = useState<MapViewCamera | null>(
    () => restoredView?.camera ?? null,
  );
  const [pendingRestoreMarkerIds, setPendingRestoreMarkerIds] = useState<number[]>(
    () => restoredView?.openMarkerIds ?? [],
  );
  /** Block session writes until marker reopen finishes (avoids wiping openMarkerIds). */
  const [restoreReady, setRestoreReady] = useState(
    () => !restoredView || (restoredView.openMarkerIds.length === 0),
  );
  // Local dismiss so clearing solo focus swaps to browse markers immediately
  // without waiting on the soft URL replace (and without remounting the page).
  const [focusDismissed, setFocusDismissed] = useState(false);
  useEffect(() => {
    setFocusDismissed(false);
  }, [urlFocusEventId, urlFocusSignalId, urlFocusCrisisId]);
  const focusEventId = focusDismissed ? null : urlFocusEventId;
  const focusSignalId = focusDismissed ? null : urlFocusSignalId;
  const focusCrisisId = focusDismissed ? null : urlFocusCrisisId;
  const focusEntityId = focusEventId ?? focusSignalId ?? focusCrisisId;
  /* ---- Core state (must precede queries that depend on it) ---- */
  const [dataView, setDataView] = useState<DataView>(() => {
    if (urlFocusSignalId) return "signal";
    if (urlFocusCrisisId) return "crisis";
    if (urlFocusEventId) return "event";
    return "alert";
  });

  /** Map load error (offline / style load failure) */
  const [mapLoadError, setMapLoadError] = useState<{ message: string; isOffline: boolean } | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  const handleMapLoadError = useCallback((error: { message: string; isOffline: boolean }) => {
    setMapLoadError(error);
  }, []);

  const handleRetryMapLoad = useCallback(() => {
    setMapLoadError(null);
    setRetryNonce((prev) => prev + 1);
  }, []);

  /* ---- Fetch data ---- */
  const { activeTeamId, activeTeam } = useTeam();
  const { countries: apiCountries, getRegions, getCenter, getZoom, getLocationId, locationById } = useLocations();
  const { countryName: teamCountryName } = useTeamCountry();

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

  // Full Map / focused Back: solo mode paints only the deep-linked entity
  // (event + its signals, or one signal/crisis). Skip the browse feeds.
  const isFocusMode = !!focusEntityId;

  const clearSoloFocus = useCallback(() => {
    setFocusDismissed(true);
    router.replace("/map", { scroll: false });
  }, [router]);

  const focusEventQuery = api.events.forMapFocus.useQuery(
    { id: focusEventId! },
    { enabled: !!focusEventId, staleTime: 60_000 },
  );
  const focusSignalQuery = api.signals.get.useQuery(
    { id: focusSignalId! },
    { enabled: !!focusSignalId, staleTime: 60_000 },
  );
  const focusCrisisQuery = api.crises.get.useQuery(
    { id: focusCrisisId! },
    { enabled: !!focusCrisisId, staleTime: 60_000 },
  );

  const focusFilterLabel = useMemo(() => {
    if (focusEventId) {
      return focusEventQuery.data?.title?.trim() || t("timeline.focusFallbackEvent");
    }
    if (focusSignalId) {
      return focusSignalQuery.data?.title?.trim() || t("timeline.focusFallbackSignal");
    }
    if (focusCrisisId) {
      return focusCrisisQuery.data?.title?.trim() || t("timeline.focusFallbackCrisis");
    }
    return null;
  }, [
    focusEventId,
    focusSignalId,
    focusCrisisId,
    focusEventQuery.data,
    focusSignalQuery.data,
    focusCrisisQuery.data,
    t,
  ]);

  // Fetch data for active view ONLY (no parallel loading). Disabled in focus mode.
  // teamId is what actually enforces the team's location scope: the backend
  // ANDs in that team's locations (expanded to descendants). Without it the
  // full global dataset reaches the browser and the country picker below is
  // only cosmetic.
  const alertsQuery = api.alerts.alertsForMap.useQuery(
    {
      includeDummy: true,
      activeOnly: timeframe !== "all",
      from: timeframeRange.from,
      to: timeframeRange.to,
      teamId: activeTeamId,
    },
    { enabled: !isFocusMode && dataView === "alert", placeholderData: (prev) => prev },
  );
  const eventsQuery = api.alerts.eventsForMap.useQuery(
    {
      includeDummy: true,
      from: timeframeRange.from,
      to: timeframeRange.to,
      teamId: activeTeamId ?? undefined,
    },
    { enabled: !isFocusMode && dataView === "event", placeholderData: (prev) => prev },
  );
  const crisesQuery = api.alerts.getCrises.useQuery(
    undefined,
    { enabled: !isFocusMode && dataView === "crisis", placeholderData: (prev) => prev },
  );
  const signalsListQuery = api.signals.forMap.useQuery(
    {
      includeDummy: true,
      from: timeframeRange.from,
      to: timeframeRange.to,
      teamId: activeTeamId,
    },
    { enabled: !isFocusMode && dataView === "signal", staleTime: 60_000, placeholderData: (prev) => prev },
  );
  const locationChallengesQuery = api.locationChallenge.listForMap.useQuery(
    { teamId: activeTeamId ?? undefined, status: "consideration" },
    { enabled: dataView === "signal", staleTime: 60_000 },
  );
  const hierarchyQuery = api.alerts.getDisasterTypeHierarchy.useQuery(undefined, {
    staleTime: Infinity, refetchOnWindowFocus: false,
  });
  const hierarchy: HierarchyLevel1[] = hierarchyQuery.data ?? [];
  const utils = api.useUtils();
  const tChallenge = useTranslations("locationChallenge");
  const tToasts = useTranslations("common.toasts");

  /**
   * Place-on-map Location correction draft (started from challenge modal).
   * Visual ghost pin is merged into markers before clear-api persists.
   */
  const [locationCorrectionDraft, setLocationCorrectionDraft] = useState<{
    signalId: string;
    sourceMarkerId: number;
    phase: "picking" | "placed";
    note?: string;
    draftLat?: number;
    draftLng?: number;
    submitting?: boolean;
  } | null>(null);
  /** Local dual-pin overlay when submit succeeds visually but API is not shipped yet. */
  const [localCorrections, setLocalCorrections] = useState<
    Record<string, { lng: number; lat: number; name?: string; note?: string }>
  >({});
  /** Local bare Location challenge (no proposed point) before clear-api ships. */
  const [localBareChallenges, setLocalBareChallenges] = useState<
    Record<string, { note?: string }>
  >({});

  const submitLocationCorrection = api.locationChallenge.submit.useMutation();

  const handleUnavailableChallengeQueue = useCallback(
    (payload: {
      signalId: string;
      note?: string;
      proposedLat?: number;
      proposedLng?: number;
      proposedName?: string;
    }) => {
      const hasPoint =
        payload.proposedLat != null && payload.proposedLng != null;
      if (hasPoint) {
        setLocalCorrections((prev) => ({
          ...prev,
          [payload.signalId]: {
            lng: payload.proposedLng!,
            lat: payload.proposedLat!,
            name: payload.proposedName,
            note: payload.note,
          },
        }));
        setLocalBareChallenges((prev) => {
          if (!(payload.signalId in prev)) return prev;
          const next = { ...prev };
          delete next[payload.signalId];
          return next;
        });
        return;
      }
      setLocalBareChallenges((prev) => ({
        ...prev,
        [payload.signalId]: { note: payload.note },
      }));
    },
    [],
  );

  const signalChallengesForMap = useMemo((): GqlSignalLocationChallenge[] => {
    const bySignal = new Map<string, GqlSignalLocationChallenge>();
    for (const c of locationChallengesQuery.data ?? []) {
      bySignal.set(c.signalId, c);
    }
    for (const [signalId, bare] of Object.entries(localBareChallenges)) {
      if (bySignal.has(signalId)) continue;
      bySignal.set(signalId, {
        id: `local-bare-${signalId}`,
        signalId,
        status: "consideration",
        note: bare.note ?? null,
        proposedLng: null,
        proposedLat: null,
        proposedName: null,
        createdBy: "local",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        hasProposedPoint: false,
      });
    }
    for (const [signalId, pt] of Object.entries(localCorrections)) {
      const existing = bySignal.get(signalId);
      if (existing?.hasProposedPoint) continue;
      bySignal.set(signalId, {
        id: `local-${signalId}`,
        signalId,
        status: "consideration",
        note: pt.note ?? null,
        proposedLng: pt.lng,
        proposedLat: pt.lat,
        proposedName: pt.name ?? null,
        createdBy: "local",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        hasProposedPoint: true,
      });
    }
    if (locationCorrectionDraft) {
      const { signalId, draftLat, draftLng, phase, note } = locationCorrectionDraft;
      if (phase === "placed" && draftLat != null && draftLng != null) {
        bySignal.set(signalId, {
          id: `draft-${signalId}`,
          signalId,
          status: "consideration",
          note: note ?? null,
          proposedLng: draftLng,
          proposedLat: draftLat,
          proposedName: null,
          createdBy: "draft",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          hasProposedPoint: true,
        });
      } else if (phase === "picking" && !bySignal.has(signalId)) {
        bySignal.set(signalId, {
          id: `draft-${signalId}`,
          signalId,
          status: "consideration",
          note: note ?? null,
          proposedLng: null,
          proposedLat: null,
          proposedName: null,
          createdBy: "draft",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          hasProposedPoint: false,
        });
      }
    }
    return [...bySignal.values()];
  }, [
    locationChallengesQuery.data,
    localBareChallenges,
    localCorrections,
    locationCorrectionDraft,
  ]);

  /* ---- Derive markers: solo deep-link set OR browse feed ---- */
  const allMarkers: CrisisMarker[] = useMemo(() => {
    if (focusEventId) {
      return focusEventQuery.data ? focusEventToMarkers(focusEventQuery.data, locationById) : [];
    }
    if (focusSignalId) {
      return focusSignalQuery.data
        ? applyLocationChallengesToMarkers(
            signalsToMarkers([focusSignalQuery.data], locationById),
            signalChallengesForMap,
          )
        : [];
    }
    if (focusCrisisId) {
      return focusCrisisQuery.data ? crisesToMarkers([focusCrisisQuery.data], locationById) : [];
    }
    let markers: CrisisMarker[] = [];
    if (dataView === "alert")  markers = alertsToMarkers(alertsQuery.data?.alerts ?? [], locationById);
    if (dataView === "event")  markers = eventsToMarkers(eventsQuery.data?.events ?? [], locationById);
    if (dataView === "signal") {
      markers = applyLocationChallengesToMarkers(
        signalsToMarkers(signalsListQuery.data ?? [], locationById),
        signalChallengesForMap,
      );
    }
    if (dataView === "crisis") markers = crisesToMarkers(crisesQuery.data?.crises ?? [], locationById);
    return markers;
  }, [
    focusEventId,
    focusSignalId,
    focusCrisisId,
    focusEventQuery.data,
    focusSignalQuery.data,
    focusCrisisQuery.data,
    dataView,
    alertsQuery.data,
    eventsQuery.data,
    signalsListQuery.data,
    signalChallengesForMap,
    crisesQuery.data,
    locationById,
  ]);

  const focusMarker = useMemo(() => {
    if (!focusEntityId) return null;
    // Prefer the primary entity pin (event/crisis/signal id), not a child signal.
    return (
      allMarkers.find((m) => m.eventId === focusEntityId) ??
      allMarkers[0] ??
      null
    );
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

  // Country the user picked. Only consulted when the active team monitors
  // globally; a team bound to a country is pinned to it via selectedCountry
  // below, so "All Countries" is not reachable for them.
  const [pickedCountry, setPickedCountry] = useState("All Countries");
  const [selectedRegion, setSelectedRegion] = useState("All Regions");
  const selectedCountry = teamCountryName ?? pickedCountry;
  const setSelectedCountry = setPickedCountry;

  // Reset the region whenever the team (and therefore the country) changes.
  useEffect(() => {
    setSelectedRegion("All Regions");
  }, [activeTeam?.id]);
  const [openPanels, setOpenPanels] = useState<OpenMarkerPanel[]>([]);
  const [keepPanelsOpen, setKeepPanelsOpen] = useState(false);
  const [chromeActiveMarkerId, setChromeActiveMarkerId] = useState<number | null>(null);
  /** Desktop panel boxes for spaghetti connectors (marker id → geometry). */
  const [panelGeometries, setPanelGeometries] = useState<Record<number, PanelGeometry>>({});
  /** Live pin screen positions for open panels (reprojected on map move). */
  const [connectorPins, setConnectorPins] = useState<Record<number, MarkerScreenPoint>>({});
  const mapApiRef = useRef<CrisisMapApi | null>(null);
  const connectorRafRef = useRef<number | null>(null);
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
   * Decided at open - never mutated inside a setState updater (Strict Mode safe).
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

  const refreshConnectorPins = useCallback(() => {
    const api = mapApiRef.current;
    const panels = openPanelsRef.current;
    if (!api || panels.length === 0) {
      setConnectorPins((prev) => (Object.keys(prev).length === 0 ? prev : {}));
      return;
    }
    const next: Record<number, MarkerScreenPoint> = {};
    for (const panel of panels) {
      const pt = api.projectMarker(panel.marker.id, panel.marker.lng, panel.marker.lat);
      if (pt) next[panel.marker.id] = pt;
    }
    setConnectorPins(next);
  }, []);

  const handleMapMove = useCallback(() => {
    if (openPanelsRef.current.length === 0) return;
    if (connectorRafRef.current != null) return;
    connectorRafRef.current = window.requestAnimationFrame(() => {
      connectorRafRef.current = null;
      refreshConnectorPins();
    });
  }, [refreshConnectorPins]);

  useEffect(() => {
    refreshConnectorPins();
  }, [openPanels, refreshConnectorPins]);

  useEffect(() => {
    return () => {
      if (connectorRafRef.current != null) {
        window.cancelAnimationFrame(connectorRafRef.current);
      }
    };
  }, []);

  // Drop geometry for panels that closed (unmount also clears via callback).
  useEffect(() => {
    const openIds = new Set(openPanels.map((p) => p.marker.id));
    setPanelGeometries((prev) => {
      let changed = false;
      const next: Record<number, PanelGeometry> = {};
      for (const [idStr, geom] of Object.entries(prev)) {
        const id = Number(idStr);
        if (openIds.has(id)) next[id] = geom;
        else changed = true;
      }
      return changed ? next : prev;
    });
  }, [openPanels]);

  const handlePanelGeometryChange = useCallback(
    (markerId: number, geometry: PanelGeometry | null) => {
      setPanelGeometries((prev) => {
        if (geometry == null) {
          if (!(markerId in prev)) return prev;
          const next = { ...prev };
          delete next[markerId];
          return next;
        }
        return { ...prev, [markerId]: geometry };
      });
    },
    [],
  );

  const persistMapView = useCallback((camera?: MapViewCamera) => {
    const live =
      camera ??
      mapApiRef.current?.getViewCamera() ??
      (browseCameraRef.current
        ? {
            center: browseCameraRef.current.center,
            zoom: browseCameraRef.current.zoom,
            pitch: 0,
            bearing: 0,
          }
        : null);
    if (!live) return;
    writeMapViewState({
      camera: live,
      baseMapType: baseMapTypeRef.current,
      openMarkerIds: openPanelsRef.current.map((p) => p.marker.id),
    });
  }, []);

  const handleCameraChange = useCallback((camera: MapViewCamera) => {
    // Track browse camera only while not in a marker-detail focus fly.
    // Persist via refs/storage only - do not push camera into React state
    // (mapCenter/mapZoom props → flyTo loop → staggered drag/tilt).
    if (markerFocusRef.current) return;
    browseCameraRef.current = camera;
    layerCameraRef.current = camera;
    if (restoreReady) persistMapView(camera);
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
  }, [persistMapView, restoreReady]);

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
  const [showNrcLocations, setShowNrcLocations] = useState(false);
  const [baseMapType, setBaseMapType] = useState<BaseMapType>(
    () => restoredView?.baseMapType ?? "simple",
  );
  const baseMapTypeRef = useRef(baseMapType);
  baseMapTypeRef.current = baseMapType;

  // Persist basemap / open panels even when the camera is still.
  useEffect(() => {
    if (!restoreReady) return;
    persistMapView();
  }, [baseMapType, openPanels, persistMapView, restoreReady]);

  // Flush snapshot on leave so View details → Back always has a fresh copy.
  useEffect(() => {
    const flush = () => {
      if (!restoreReady) return;
      persistMapView();
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [persistMapView, restoreReady]);
  /** Marker-detail Point altitude samples (Topography only). */
  const [panelAltitudes, setPanelAltitudes] = useState<
    Record<number, PointAltitudeResult>
  >({});

  // Publish basemap so frost chrome (nav + Layers) can remap text contrast
  // on Simple / Topography / Satellite (GH #145). Cleared when leaving /map.
  useEffect(() => {
    document.body.dataset.mapBasemap = baseMapType;
    return () => {
      delete document.body.dataset.mapBasemap;
    };
  }, [baseMapType]);

  useEffect(() => {
    if (!shouldShowPointAltitude(baseMapType) || openPanels.length === 0) {
      setPanelAltitudes({});
      return;
    }
    const sample = () => {
      const api = mapApiRef.current;
      if (!api) return;
      const next: Record<number, PointAltitudeResult> = {};
      for (const panel of openPanelsRef.current) {
        next[panel.marker.id] = api.samplePointAltitude(
          panel.marker.lng,
          panel.marker.lat,
        );
      }
      setPanelAltitudes(next);
    };
    sample();
    // DEM tiles may land after setTerrain - retry briefly for open panels.
    const t1 = window.setTimeout(sample, 400);
    const t2 = window.setTimeout(sample, 1200);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [baseMapType, openPanels]);

  /**
   * Blockages UI: always on (BFF default). See `fetch-blockages.ts`.
   */
  const blockagesUiEnabled = isBlockagesUiEnabled();
  const [showBlockages, setShowBlockages] = useState(false);
  const [blockagesLoading, setBlockagesLoading] = useState(false);
  const [blockagesHint, setBlockagesHint] = useState<string | undefined>();
  const [blockagesGeoJson, setBlockagesGeoJson] = useState<{
    type: "FeatureCollection";
    features: Array<{
      type: "Feature";
      geometry: unknown;
      properties: Record<string, unknown>;
    }>;
  } | null>(null);

  useEffect(() => {
    if (!blockagesUiEnabled || !showBlockages) {
      setBlockagesGeoJson(null);
      setBlockagesHint(undefined);
      setBlockagesLoading(false);
      return;
    }
    let cancelled = false;
    setBlockagesLoading(true);
    setBlockagesHint(undefined);
    fetchBlockagesMapCollection()
      .then(({ collection, source }) => {
        if (cancelled) return;
        setBlockagesGeoJson(collection);
        setBlockagesHint(blockagesHintFromMeta(collection, source));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setBlockagesGeoJson(null);
        setBlockagesHint(
          err instanceof Error ? err.message : "Failed to load",
        );
      })
      .finally(() => {
        if (!cancelled) setBlockagesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [blockagesUiEnabled, showBlockages]);

  /**
   * Seismic Signals UI: always on (spike in dev/preview, BFF in prod). See `fetch-usgs-earthquakes.ts`.
   */
  const seismicSignalsUiEnabled = isSeismicSignalsUiEnabled();
  const [showSeismicSignals, setShowSeismicSignals] = useState(false);
  const [seismicSignalsLoading, setSeismicSignalsLoading] = useState(false);
  const [seismicSignalsHint, setSeismicSignalsHint] = useState<string | undefined>();
  const [seismicSignalsGeoJson, setSeismicSignalsGeoJson] = useState<{
    type: "FeatureCollection";
    features: Array<{
      type: "Feature";
      geometry: unknown;
      properties: Record<string, unknown>;
    }>;
  } | null>(null);

  useEffect(() => {
    if (!seismicSignalsUiEnabled || !showSeismicSignals) {
      setSeismicSignalsGeoJson(null);
      setSeismicSignalsHint(undefined);
      setSeismicSignalsLoading(false);
      return;
    }
    let cancelled = false;
    setSeismicSignalsLoading(true);
    setSeismicSignalsHint(undefined);
    fetchSeismicSignalsMapCollection({
      bbox: seismicQueryBboxForCountry(selectedCountry),
    })
      .then(({ collection, source }) => {
        if (cancelled) return;
        setSeismicSignalsGeoJson(collection);
        setSeismicSignalsHint(seismicSignalsHintFromMeta(collection, source));
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setSeismicSignalsGeoJson(null);
        setSeismicSignalsHint(
          err instanceof Error ? err.message : "Failed to load",
        );
      })
      .finally(() => {
        if (!cancelled) setSeismicSignalsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [seismicSignalsUiEnabled, showSeismicSignals, selectedCountry]);

  // Deep-link from detail Back / Full Map: align Layers data-view chrome only.
  // Markers come from the solo focus queries - do not widen timeframe or wipe
  // browse filters (#108 / show-this-pin).
  useEffect(() => {
    if (!focusEntityId) return;
    if (focusSignalId) setDataView("signal");
    else if (focusCrisisId) setDataView("crisis");
    else if (focusEventId) setDataView("event");
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
  // A team bound to a country gets only that country: no "All Countries"
  // escape hatch, since the data behind it is now scoped out anyway.
  const scopedCountries = useScopedCountryOptions(apiCountries);
  const countryOptions = useMemo(
    () => (teamCountryName ? scopedCountries : ["All Countries", ...apiCountries]),
    [teamCountryName, scopedCountries, apiCountries],
  );
  const regionOptions = useMemo(
    () => selectedCountry !== "All Countries" ? getRegions(selectedCountry) : ["All Regions"],
    [selectedCountry, getRegions],
  );

  /* ---- Map center ---- */
  const mapCenter: [number, number] = useMemo(() => {
    if (markerFocus) return [markerFocus.lng, markerFocus.lat];
    if (returnCamera) return returnCamera.center;
    // Initial restore seed only - live pans stay in Mapbox + sessionStorage.
    if (cameraSeed) return cameraSeed.center;
    if (focusMarker) return [focusMarker.lng, focusMarker.lat];
    if (selectedCountry !== "All Countries") {
      return getCenter(selectedCountry);
    }
    // Global browse: WORLD_VIEW, not marker-average + country zoom (that
    // framed a Sahel crop that looked like "random Mali").
    return WORLD_VIEW.center;
  }, [selectedCountry, focusMarker, markerFocus, returnCamera, cameraSeed, getCenter]);

  const mapZoom = useMemo(() => {
    if (markerFocus) return markerFocus.zoom;
    if (returnCamera) return returnCamera.zoom;
    if (cameraSeed) return cameraSeed.zoom;
    if (focusMarker) return MAP_FOCUS_ZOOM;
    if (selectedCountry !== "All Countries") {
      // Same country zoom on mobile and desktop - fitBounds owns framing when
      // geometry/bbox is available; this is the fallback before that lands.
      return getZoom(selectedCountry);
    }
    return WORLD_VIEW.zoom;
  }, [selectedCountry, focusMarker, markerFocus, returnCamera, cameraSeed, getZoom]);

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

  const handleStartLocationCorrection = useCallback(
    (marker: CrisisMarker, draft?: { note?: string }) => {
      if (marker.markerKind !== "signal" || !marker.eventId) return;
      setLocationCorrectionDraft({
        signalId: marker.eventId,
        sourceMarkerId: marker.id,
        phase: "picking",
        note: draft?.note,
      });
    },
    [],
  );

  const handleCancelLocationCorrection = useCallback(() => {
    setLocationCorrectionDraft(null);
  }, []);

  const handleRepickLocationCorrection = useCallback(() => {
    setLocationCorrectionDraft((prev) =>
      prev
        ? {
            signalId: prev.signalId,
            sourceMarkerId: prev.sourceMarkerId,
            phase: "picking",
            note: prev.note,
          }
        : null,
    );
  }, []);

  const handleLocationCorrectionMapClick = useCallback(
    (lngLat: { lng: number; lat: number }) => {
      setLocationCorrectionDraft((prev) => {
        if (!prev || prev.phase !== "picking") return prev;
        return {
          ...prev,
          phase: "placed",
          draftLat: lngLat.lat,
          draftLng: lngLat.lng,
        };
      });
    },
    [],
  );

  const handleConfirmLocationCorrection = useCallback(async () => {
    const draft = locationCorrectionDraft;
    if (
      !draft ||
      draft.phase !== "placed" ||
      draft.draftLat == null ||
      draft.draftLng == null
    ) {
      return;
    }
    setLocationCorrectionDraft({ ...draft, submitting: true });
    try {
      await submitLocationCorrection.mutateAsync({
        signalId: draft.signalId,
        note: draft.note,
        proposedLat: draft.draftLat,
        proposedLng: draft.draftLng,
      });
      await Promise.all([
        utils.locationChallenge.listForMap.invalidate(),
        utils.locationChallenge.getBySignal.invalidate({ signalId: draft.signalId }),
      ]);
      setLocalCorrections((prev) => {
        const next = { ...prev };
        delete next[draft.signalId];
        return next;
      });
      setLocationCorrectionDraft(null);
      notifications.show({
        title: tChallenge("modal.successTitle"),
        message: tChallenge("modal.successCorrection"),
        color: "green",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      const backendMissing = message.includes("LOCATION_CHALLENGE_BACKEND_UNAVAILABLE");
      if (backendMissing) {
        setLocalCorrections((prev) => ({
          ...prev,
          [draft.signalId]: {
            lng: draft.draftLng!,
            lat: draft.draftLat!,
            note: draft.note,
          },
        }));
        setLocationCorrectionDraft(null);
        notifications.show({
          title: tToasts("error"),
          message: tChallenge("errors.backendUnavailable"),
          color: "yellow",
        });
        return;
      }
      setLocationCorrectionDraft({ ...draft, submitting: false });
      notifications.show({
        title: tToasts("error"),
        message: tChallenge("errors.submitFailed"),
        color: "red",
      });
    }
  }, [
    locationCorrectionDraft,
    submitLocationCorrection,
    utils.locationChallenge.listForMap,
    utils.locationChallenge.getBySignal,
    tChallenge,
    tToasts,
  ]);

  useEffect(() => {
    setLocationCorrectionDraft(null);
  }, [dataView]);

  const closeOpenPanel = useCallback((markerId: number) => {
    const nextPanels = openPanelsRef.current.filter((p) => p.marker.id !== markerId);
    const closingLast =
      nextPanels.length === 0 && openPanelsRef.current.some((p) => p.marker.id === markerId);

    openPanelsRef.current = nextPanels;
    setOpenPanels(nextPanels);
    setChromeActiveMarkerId((prev) => (prev === markerId ? null : prev));
    setLocationCorrectionDraft((prev) =>
      prev?.sourceMarkerId === markerId ? null : prev,
    );

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

  /* ---- Apply timeline filter on top (skipped in solo focus mode) ---- */
  const currentMarkers: CrisisMarker[] = useMemo(() => {
    if (isFocusMode) return allMarkers;
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
  }, [isFocusMode, allMarkers, markersBeforeTime, selectedMonth]);

  // Persist map filter scope for event/signal detail prev/next. Mirrors
  // Detection nav-context: without this, detail arrows re-query the unscoped
  // map feed and jump across countries (e.g. Sudan → Venezuela).
  useEffect(() => {
    writeMapNavContext({
      teamId: activeTeamId,
      locationId: selectedLocationId,
      country: selectedCountry,
      region: selectedRegion !== ALL_REGIONS ? selectedRegion : undefined,
      // null = timeframe "all" (must survive JSON round-trip; undefined is dropped)
      from: timeframeRange.from ?? null,
      to: timeframeRange.to ?? null,
    });
  }, [
    activeTeamId,
    selectedLocationId,
    selectedCountry,
    selectedRegion,
    timeframeRange.from,
    timeframeRange.to,
  ]);

  // Persist the filtered marker id list the analyst actually sees so detail
  // arrows stay inside that set (country + region + type + timeline).
  useEffect(() => {
    if (isFocusMode) return;
    const ids = currentMarkers
      .map((m) => m.eventId)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
    if (dataView === "event") writeMapNavEventIds(ids);
    else if (dataView === "signal") writeMapNavSignalIds(ids);
  }, [isFocusMode, dataView, currentMarkers]);

  // Reopen marker panels from the session snapshot once markers are loaded.
  useEffect(() => {
    if (pendingRestoreMarkerIds.length === 0) {
      if (!restoreReady) setRestoreReady(true);
      return;
    }
    if (currentMarkers.length === 0) return;

    const byId = new Map(currentMarkers.map((m) => [m.id, m]));
    const panels: OpenMarkerPanel[] = [];
    for (const id of pendingRestoreMarkerIds) {
      const marker = byId.get(id);
      if (!marker) continue;
      const proximityOrderIds = orderByProximityTo(
        currentMarkers,
        marker.id,
        (m) => m.id,
      ).map((m) => m.id);
      panels.push({
        marker,
        anchor: null,
        openedAt: Date.now(),
        z: bumpPanelZ(),
        proximityOrderIds,
      });
    }
    if (panels.length > 0) {
      openPanelsRef.current = panels;
      setOpenPanels(panels);
    }
    setPendingRestoreMarkerIds([]);
    setRestoreReady(true);
  }, [currentMarkers, pendingRestoreMarkerIds, restoreReady, bumpPanelZ]);

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
                // Keep the frozen proximity walk - do not re-anchor mid-tour.
                proximityOrderIds: p.proximityOrderIds,
              }
            : p,
        );
      });

      // Mobile: keep detail zoom while the camera follows the stepped pin.
      // Desktop: panel swaps in place - leave the camera alone.
      if (isMobile) {
        const focusZoom = markerFocusRef.current?.zoom ?? MAP_FOCUS_ZOOM;
        const focus = { lng: target.lng, lat: target.lat, zoom: focusZoom };
        setMarkerFocus(focus);
        markerFocusRef.current = focus;
      }
      setChromeActiveMarkerId(target.id);
    },
    [openPanels, markersForPanelNav, bumpPanelZ, isMobile],
  );

  const topOpenPanel = useMemo(() => {
    if (openPanels.length === 0) return null;
    return openPanels.reduce((best, p) => (p.z >= best.z ? p : best));
  }, [openPanels]);

  const connectorLinks = useMemo(() => {
    if (isMobile || openPanels.length === 0) return [];
    const topZ = topOpenPanel?.z ?? 0;
    return openPanels.flatMap((panel) => {
      const pin = connectorPins[panel.marker.id];
      const geom = panelGeometries[panel.marker.id];
      if (!pin || !geom) return [];
      return [{
        id: panel.marker.id,
        pin,
        panel: geom,
        emphasized: panel.z === topZ,
      }];
    });
  }, [isMobile, openPanels, topOpenPanel, connectorPins, panelGeometries]);

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
    setCameraSeed(null);
    setForceFlyToken((n) => n + 1);
    clearOpenPanels();
  };

  const handleRegionChange = (value: string | null) => {
    setSelectedRegion(value ?? "All Regions");
    setCameraSeed(null);
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

      // Desktop: open the panel in place - do not fly/reposition the camera.
      // Mobile keeps focus-fly so the pin sits above the bottom sheet.
      if (isMobile) {
        // Click-time camera = group framing after donut expand, or country overview.
        const prior = camera ?? browseCameraRef.current ?? layerCameraRef.current;

        const countryZoom =
          selectedCountry !== "All Countries"
            ? getZoom(selectedCountry)
            : 4;

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
      } else {
        detailCloseIsGroupRef.current = false;
        detailRestoreCameraRef.current = null;
        setReturnCamera(null);
        returnCameraRef.current = null;
        setMarkerFocus(null);
        markerFocusRef.current = null;
      }

      // Re-anchor proximity walk from the clicked pin (nearest cluster first).
      const proximityOrderIds = orderByProximityTo(
        currentMarkers.length > 0 ? currentMarkers : [full],
        full.id,
        (m) => m.id,
      ).map((m) => m.id);

      // Mobile + Keep panels open off: classic single-panel replace.
      const accumulate = keepPanelsOpen && !isMobile;

      setOpenPanels((prev) => {
        const existing = prev.find((p) => p.marker.id === full.id);
        if (existing) {
          // Same pin again: focus only - keep placement so the panel does not jump.
          const z = bumpPanelZ();
          if (!accumulate) {
            return [{ ...existing, z, proximityOrderIds }];
          }
          return prev.map((p) =>
            p.marker.id === full.id ? { ...p, z, proximityOrderIds } : p,
          );
        }

        if (!accumulate) {
          return [{
            marker: full,
            anchor: screenPoint,
            openedAt: Date.now(),
            z: bumpPanelZ(),
            proximityOrderIds,
          }];
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
        // Soft max 4 - drop oldest by openedAt (FIFO).
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

  const currentMarkersRef = useRef(currentMarkers);
  currentMarkersRef.current = currentMarkers;
  const handleMarkerClickRef = useRef(handleMarkerClick);
  handleMarkerClickRef.current = handleMarkerClick;
  const clearOpenPanelsRef = useRef(clearOpenPanels);
  clearOpenPanelsRef.current = clearOpenPanels;

  // Product Tour step 4: zoom into a dense area and open a marker detail panel.
  // Re-entry (4→3→4) must clear then force-fly: CrisisMap skips flyTo when
  // center/zoom match prev props, and closing with fitBoundsOnFocus can leave
  // those prev props stuck on the first demo focus.
  useEffect(() => {
    let startTimer: number | null = null;

    const runDemoStart = () => {
      const markers = currentMarkersRef.current;
      const pick = pickTourDemoMarker(markers);
      if (!pick) return;

      const nearby = markers.filter(
        (o) => o.id !== pick.id && Math.hypot(o.lng - pick.lng, o.lat - pick.lat) < 0.4,
      ).length;
      const clusterZoom = nearby >= 1 ? 9.2 : 10.5;
      // Anchor on the right half so the detail panel opens to the LEFT of the pin
      // (placeNearMarker: x >= midpoint → panel on left) and does not cover it.
      const screenPoint: MarkerScreenPoint = {
        x: Math.round((typeof window !== "undefined" ? window.innerWidth : 1200) * 0.72),
        y: Math.round((typeof window !== "undefined" ? window.innerHeight : 800) * 0.38),
      };

      handleMarkerClickRef.current(pick, screenPoint, {
        center: [pick.lng, pick.lat],
        zoom: clusterZoom,
      });
      // Desktop marker clicks no longer fly the camera; the tour still needs to.
      if (!isMobile) {
        const focus = { lng: pick.lng, lat: pick.lat, zoom: clusterZoom };
        setMarkerFocus(focus);
        markerFocusRef.current = focus;
      }
      setForceFlyToken((n) => n + 1);
    };

    const onTourDemo = (event: Event) => {
      const detail = (event as CustomEvent<TourMapDemoDetail>).detail;
      if (detail?.action === "stop") {
        if (startTimer != null) {
          window.clearTimeout(startTimer);
          startTimer = null;
        }
        clearOpenPanelsRef.current();
        setForceFlyToken((n) => n + 1);
        return;
      }
      if (detail?.action !== "start") return;

      if (startTimer != null) {
        window.clearTimeout(startTimer);
        startTimer = null;
      }
      // Reset first so markerFocus null commits; then re-open (works every visit).
      clearOpenPanelsRef.current();
      startTimer = window.setTimeout(() => {
        startTimer = null;
        runDemoStart();
      }, 50);
    };

    window.addEventListener(TOUR_MAP_DEMO_EVENT, onTourDemo);
    return () => {
      if (startTimer != null) window.clearTimeout(startTimer);
      window.removeEventListener(TOUR_MAP_DEMO_EVENT, onTourDemo);
    };
  }, [isMobile]);

  const isLoading = isFocusMode
    ? (!!focusEventId && focusEventQuery.isLoading) ||
      (!!focusSignalId && focusSignalQuery.isLoading) ||
      (!!focusCrisisId && focusCrisisQuery.isLoading)
    : (dataView === "alert" && alertsQuery.isLoading) ||
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
      {/* Top filters bar - desktop only; mobile uses the Filters icon in MapPanelBar */}
      <Box
        visibleFrom="sm"
        className="absolute top-0 left-0 right-0 z-20"
        data-tour="map-filters"
        data-map-chrome-top
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
              c === "All Countries" ? { value: c, label: t("filters.allCountries") } : { value: c, label: shortCountryName(c) },
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

      {/* Map container with loading overlay - above timeline empty space for zoom hit-testing */}
      <Box
        data-tour="map-canvas"
        data-testid="map-browse-camera"
        data-center-lng={mapCenter[0]}
        data-center-lat={mapCenter[1]}
        data-zoom={mapZoom}
        data-country={selectedCountry}
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
          fitBoundsOnFocus={
            !focusEntityId && !markerFocus && !returnCamera && !cameraSeed
          }
          initialPitch={cameraSeed?.pitch ?? restoredView?.camera.pitch ?? 0}
          initialBearing={cameraSeed?.bearing ?? restoredView?.camera.bearing ?? 0}
          forceFlyToken={forceFlyToken}
          flyDuration={markerFocus ? 500 : (!cameraSeed && !focusEntityId && selectedCountry !== "All Countries" ? 1200 : 650)}
          // Keep pin above the ~45vh sheet + breathing room.
          flyPaddingBottom={
            markerFocus && isMobile
              ? Math.round((typeof window !== "undefined" ? window.innerHeight : 700) * 0.45) + 72
              : 0
          }
          introFromGlobe={
            !cameraSeed && !focusEntityId && selectedCountry !== "All Countries"
          }
          onCameraChange={handleCameraChange}
          onMapMove={handleMapMove}
          mapApiRef={mapApiRef}
          onClusterExpand={handleClusterExpand}
          populationBoundaries={populationBoundaries}
          showBoundaries={boundaryLevel !== "none"}
          showRoads={showRoads}
          showNrcLocations={showNrcLocations}
          showBlockages={blockagesUiEnabled && showBlockages}
          blockagesGeoJson={blockagesGeoJson}
          showSeismicSignals={seismicSignalsUiEnabled && showSeismicSignals}
          seismicSignalsGeoJson={seismicSignalsGeoJson}
          baseMapType={baseMapType}
          hoveredMarkerId={chromeActiveMarkerId}
          locationPickActive={locationCorrectionDraft?.phase === "picking"}
          onMapClick={handleLocationCorrectionMapClick}
          onLoadError={handleMapLoadError}
          key={retryNonce}
        />

        {/* Spinner while data loads; error overlay stays up even after queries settle. */}
        {(mapLoadError || (showLoadingOverlay && dataView !== "none")) && (
          <MapLoadingOverlay
            dataView={dataView === "none" ? "alert" : dataView}
            error={mapLoadError ? { message: mapLoadError.message, onRetry: handleRetryMapLoad } : null}
          />
        )}
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
        showNrcLocations={showNrcLocations}
        onShowNrcLocationsChange={setShowNrcLocations}
        showBlockages={blockagesUiEnabled ? showBlockages : undefined}
        onShowBlockagesChange={setShowBlockages}
        blockagesHint={blockagesUiEnabled ? blockagesHint : undefined}
        blockagesLoading={blockagesUiEnabled && blockagesLoading}
        showSeismicSignals={seismicSignalsUiEnabled ? showSeismicSignals : undefined}
        onShowSeismicSignalsChange={setShowSeismicSignals}
        seismicSignalsHint={seismicSignalsUiEnabled ? seismicSignalsHint : undefined}
        seismicSignalsLoading={seismicSignalsUiEnabled && seismicSignalsLoading}
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
                c === "All Countries" ? { value: c, label: t("filters.allCountries") } : { value: c, label: shortCountryName(c) },
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

      {/* ===== Spaghetti connectors (desktop; cleared with panels / data view) ===== */}
      {!isMobile && <MapPanelConnectors links={connectorLinks} />}

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
            pointAltitude={
              shouldShowPointAltitude(baseMapType)
                ? (panelAltitudes[panel.marker.id] ?? null)
                : null
            }
            anchor={panel.anchor}
            livePin={connectorPins[panel.marker.id] ?? null}
            stackZIndex={panel.z}
            onActivate={() => focusOpenPanel(panel.marker.id)}
            onChromeActiveChange={(active) =>
              handlePanelChromeActive(panel.marker.id, active)
            }
            onGeometryChange={(geometry) =>
              handlePanelGeometryChange(panel.marker.id, geometry)
            }
            onClose={() => closeOpenPanel(panel.marker.id)}
            onSwipePrev={
              prev ? () => stepOpenPanelMarker(panel.marker.id, "prev") : undefined
            }
            onSwipeNext={
              next ? () => stepOpenPanelMarker(panel.marker.id, "next") : undefined
            }
            locationCorrection={(() => {
              const draft = locationCorrectionDraft;
              if (!draft) return null;
              const matchesPanel =
                draft.sourceMarkerId === panel.marker.id ||
                draft.signalId === panel.marker.eventId;
              if (!matchesPanel) return null;
              return {
                phase: draft.phase,
                draftLat: draft.draftLat,
                draftLng: draft.draftLng,
                submitting: draft.submitting,
              };
            })()}
            onStartLocationCorrection={(draft) =>
              handleStartLocationCorrection(panel.marker, draft)
            }
            onCancelLocationCorrection={handleCancelLocationCorrection}
            onConfirmLocationCorrection={() => {
              void handleConfirmLocationCorrection();
            }}
            onRepickLocationCorrection={handleRepickLocationCorrection}
            onSwitchToSignalLayer={() => setDataView("signal")}
            onUnavailableChallengeQueue={handleUnavailableChallengeQueue}
          />
        );
      })}

      {/* ===== Timeline (bottom overlay) - desktop only; hide on mobile for map real estate ===== */}
      {(isFocusMode || availableMonths.length > 0) && !isMobile && (
        <Box
          className="absolute left-0 right-0 z-20"
          data-map-chrome-bottom
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

            {/* Solo-focus chip: dismiss to restore the full browse marker set. */}
            {isFocusMode && focusFilterLabel && (
              <button
                type="button"
                onClick={clearSoloFocus}
                aria-label={t("timeline.clearFocus")}
                title={focusFilterLabel}
                style={{
                  flexShrink: 0,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  maxWidth: 220,
                  padding: "4px 10px 4px 12px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "1px solid var(--color-accent)",
                  background: "var(--color-accent)",
                  color: "white",
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    minWidth: 0,
                  }}
                >
                  {focusFilterLabel}
                </span>
                <IconX size={14} stroke={2.25} style={{ flexShrink: 0 }} aria-hidden />
              </button>
            )}

            {/* "All time" sentinel - clears the month filter */}
            {!isFocusMode && (
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
            )}

            {/* Months - newest first (already sorted in availableMonths) */}
            {!isFocusMode &&
              availableMonths.map((ym) => {
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

export default function MapPage() {
  return (
    <Suspense fallback={null}>
      <MapPageContent />
    </Suspense>
  );
}
