"use client";

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { useLocale, useTranslations } from "next-intl";
import { api } from "~/trpc/react";
import { geometryBounds, isPaintableBoundaryGeometry } from "~/lib/geo/country-mask";
import { dedupeByProperty } from "~/lib/geo/dedupe-rendered-features";
import { useIsDark } from "~/hooks/use-is-dark";
import { countryConfig, staticCountryBounds, WORLD_VIEW } from "~/lib/constants/country-config";
import {
  aggregationModeForZoom,
  donutCenterCount,
  donutCenterLabel,
  donutSeveritySegments,
  heatmapOpacityForZoom,
  markerOpacityForZoom,
  markersShouldMount,
  type DensityAggregationMode,
  DENSITY_COUNTRY_BAND_MIN_ZOOM,
  DENSITY_DONUT_MAX_ZOOM,
  DENSITY_HEATMAP_MAX_ZOOM,
  DENSITY_HEATMAP_PEAK_OPACITY,
} from "~/lib/map/marker-density";
import { spiderfyCoincidentLngLats } from "~/lib/map/spiderfy-coincident";
import {
  SUDAN_NRC_OFFICES,
} from "~/lib/data/sudan-nrc-offices";
import {
  buildNrcOfficeMarkerElement,
  buildNrcOfficePopupHtml,
  paintNrcOfficeMarkerTheme,
} from "~/lib/map/nrc-office-markers";
import { BLOCKAGES_STALE_AFTER_DAYS } from "~/lib/map/logie-blockages";
import {
  interpolateSeismicMapCollection,
  prefersReducedMotion,
  SEISMIC_TRANSITION_MS,
} from "~/lib/map/seismic-transition";
import type { SeismicMapCollection } from "~/lib/map/usgs-earthquakes";
import {
  applyTopographyOptInTilt,
  syncTopographyPitch,
} from "~/lib/map/topography-pitch";
import {
  syncTopographyTerrain,
  updateTopographyTerrainExaggeration,
} from "~/lib/map/topography-terrain";
import {
  applyPinElevation,
  parseLocationPinRole,
  pinElevationFactor,
  shouldElevatePointPin,
} from "~/lib/map/pin-elevation";
import { bridgeMetaToCtrlForPitch } from "~/lib/map/meta-pitch-bridge";
import { flyToOrientation } from "~/lib/map/marker-detail-camera";
import { ensureGlobeProjection } from "~/lib/map/idle-globe-spin";
import {
  dismissTopographyTiltHint,
  isTopographyTiltHintDismissed,
  shouldShowTopographyTiltHint,
} from "~/lib/map/topography-tilt-hint";
import {
  formatAltitudeProbeLabel,
  isPointerOverTerrain,
  samplePointAltitude,
  shouldShowPointAltitude,
  type PointAltitudeResult,
} from "~/lib/map/point-altitude";
import { signalIconUrl } from "~/lib/signals/resolve-icon";

/** Softer clustering locally so sparse seed data still forms donuts. */
const CLUSTER_MIN_POINTS = process.env.NODE_ENV === "production" ? 5 : 2;

export interface MapMarker {
  id: number;
  lng: number;
  lat: number;
  title: string;
  severity: "critical" | "high" | "medium" | "low" | "unknown";
  type?: string;
  description?: string;
  popup?: string;
  markerKind?: "event" | "signal" | "crisis";
  /** CLEAR Signals SVG slug for type glyph on unclustered pins. */
  iconSlug?: string;
  /** Source pin challenged / correction queued (Location trust v1). */
  locationTrust?: "challenged" | "correction_queued";
  /** Proposed correction pin vs source pin for dual location display. */
  locationPinRole?: "source" | "proposed";
}

/** Pixel position of a marker inside the map container (from Mapbox `project`). */
export interface MarkerScreenPoint {
  x: number;
  y: number;
}

/** Live Mapbox camera including pitch/bearing (for round-trip restore). */
export type MapViewCameraSnapshot = {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
};

/** Imperative helpers for overlays that track pins (e.g. spaghetti connectors). */
export interface CrisisMapApi {
  /**
   * Project a marker to container pixels. Prefers the live Mapbox Marker
   * (spiderfy display position) when mounted; otherwise falls back to lng/lat.
   */
  projectMarker: (
    id: number,
    lng: number,
    lat: number,
  ) => MarkerScreenPoint | null;
  /** Unexaggerated DEM sample — meaningful while Topography terrain mesh is on. */
  samplePointAltitude: (lng: number, lat: number) => PointAltitudeResult;
  /** Current camera including pitch/bearing. */
  getViewCamera: () => MapViewCameraSnapshot | null;
  /** Instant restore (no fly) for map ↔ detail round-trips. */
  restoreViewCamera: (camera: MapViewCameraSnapshot) => void;
}

export interface MapRegion {
  id: string;
  /** GeoJSON geometry (Polygon or MultiPolygon) */
  geometry: { type: string; coordinates: unknown };
  severity: "critical" | "high" | "medium" | "low" | "unknown";
  title: string;
  /** Signal points within this region - if present, rendered as a heatmap. */
  signalPoints?: Array<{ lng: number; lat: number; title: string }>;
}

export interface AdminBoundary {
  id: string;
  name: string;
  geometry: unknown;
  population?: string | null;
}

interface CrisisMapProps {
  markers?: MapMarker[];
  /** Polygon/MultiPolygon regions to render on the map. */
  regions?: MapRegion[];
  center?: [number, number];
  zoom?: number;
  /** Initial pitch (degrees). Used for session restore; defaults to 0. */
  initialPitch?: number;
  /** Initial bearing (degrees). Used for session restore; defaults to 0. */
  initialBearing?: number;
  className?: string;
  onMarkerClick?: (
    marker: MapMarker,
    screenPoint: MarkerScreenPoint,
    /** Live Mapbox camera at click time (pre-focus), for layered zoom restore. */
    camera?: MapViewCameraSnapshot,
  ) => void;
  onMarkerHover?: (marker: MapMarker | null) => void;
  interactive?: boolean;
  /**
   * Country to visually emphasise (dim-mask the rest of the world, glow the
   * country's border, fit bounds). Resolves via backend locations by P-Code
   * first, then falls back to an exact name match. Omit to skip the focus
   * treatment. Example: `focusCountryPCode="SD"` with `focusCountryName="Sudan"`.
   */
  focusCountryPCode?: string;
  /** Country name used as a fallback when `pCode` doesn't resolve. */
  focusCountryName?: string;
  /** Admin boundary polygons to render (A1 states or A2 districts). */
  adminBoundaries?: AdminBoundary[];
  /** Level of admin boundaries being rendered - controls visual styling. */
  adminBoundaryLevel?: 1 | 2;
  /** GeoJSON geometry to fit the map bounds to (e.g. a selected region). */
  fitBoundsGeometry?: unknown;
  /** Our own L0 geometry for the focus country highlight (overrides Mapbox tileset). */
  focusCountryGeometry?: unknown;
  /** A2 district boundaries with population for choropleth layer. */
  populationBoundaries?: AdminBoundary[];
  /** Marker ID to highlight with a pulse (synced from list hover). */
  hoveredMarkerId?: number | null;
  /** Suppress the automatic fitBounds-to-country when a focus country loads. Default true. */
  fitBoundsOnFocus?: boolean;
  /** Bump to re-run country fitBounds (e.g. after closing a lone-marker detail). */
  countryFitNonce?: number;
  /** Enable WebGL canvas readback for print snapshots. Has a small GPU memory cost. */
  preserveDrawingBuffer?: boolean;
  /** Duration (ms) for programmatic flyTo when center/zoom props change. */
  flyDuration?: number;
  /**
   * Extra bottom padding (px) for flyTo — keeps a focused marker above a
   * mobile bottom sheet instead of under it.
   */
  flyPaddingBottom?: number;
  /**
   * Explicit flyTo pitch/bearing (close-restore). Omit to keep the live
   * camera orientation — never flatten because the bottom sheet added padding.
   */
  flyPitch?: number;
  flyBearing?: number;
  /**
   * Bump to force a flyTo to the current center/zoom props even when they
   * appear unchanged (used when closing a marker detail sheet).
   */
  forceFlyToken?: number;
  /** Fired when the camera settles (pan/zoom/cluster fitBounds). */
  onCameraChange?: (camera: MapViewCameraSnapshot) => void;
  /**
   * Fired when a donut cluster is tapped, with the camera *before* expand
   * and the number of markers in that cluster.
   */
  onClusterExpand?: (
    camera: MapViewCameraSnapshot,
    leafCount: number,
  ) => void;
  /** Show/hide boundaries layer */
  showBoundaries?: boolean;
  /** Show/hide markers layer */
  showMarkers?: boolean;
  /** Show/hide roads overlay (applies to all basemap types) */
  showRoads?: boolean;
  /**
   * Show NRC Sudan office/presence pins (city centroids from NRC Sudan Annual
   * Report 2025 — not street-level premises).
   */
  showNrcLocations?: boolean;
  /**
   * DEV / future #277: LogIE Blockages (roads + bridges). Inline FeatureCollection
   * from `/api/dev/logie-blockages` (smoke) or clear-api ingest (prod).
   */
  showBlockages?: boolean;
  blockagesGeoJson?: {
    type: "FeatureCollection";
    features: Array<{
      type: "Feature";
      geometry: unknown;
      properties: Record<string, unknown>;
    }>;
  } | null;
  /**
   * Seismic Signals (USGS earthquake epicenters).
   */
  showSeismicSignals?: boolean;
  seismicSignalsGeoJson?: {
    type: "FeatureCollection";
    features: Array<{
      type: "Feature";
      geometry: unknown;
      properties: Record<string, unknown>;
    }>;
  } | null;
  /** Basemap: simple (theme style), topography (hillshade + DEM terrain mesh), or satellite imagery */
  baseMapType?: BaseMapType;
  /**
   * Mutable ref filled with project helpers while the map is mounted.
   * Cleared on unmount. Used by `/map` spaghetti connectors.
   */
  mapApiRef?: MutableRefObject<CrisisMapApi | null>;
  /** Fired on every camera frame during pan/zoom/fly (not only moveend). */
  onMapMove?: () => void;
  /**
   * When true, marker DOM pins ignore pointer events so map clicks can place
   * a Location correction pin (crosshair cursor).
   */
  locationPickActive?: boolean;
  /** Map background click (lng/lat). Used while placing a Location correction. */
  onMapClick?: (lngLat: { lng: number; lat: number }) => void;
  /**
   * First-visit intro: start at WORLD_VIEW (globe) and fly to country. Skipped
   * on session restore / deep links. Requires fitBoundsOnFocus=true to work.
   */
  introFromGlobe?: boolean;
  /** Fired when the map fails to load (offline, style error, etc.). */
  onLoadError?: (error: { message: string; isOffline: boolean }) => void;
}

export type BaseMapType = "simple" | "topography" | "satellite";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const severityColors: Record<string, string> = {
  critical: "#DC2626",
  high: "#D97706",
  medium: "#FBBF24",
  low: "#059669",
};


/**
 * Load mapbox-gl from CDN to avoid webpack JSON.parse optimisation crash.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadMapboxGL(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as unknown as Record<string, unknown>).mapboxgl) {
      resolve((window as unknown as Record<string, unknown>).mapboxgl);
      return;
    }
    if (!document.querySelector('link[href*="mapbox-gl"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://api.mapbox.com/mapbox-gl-js/v3.9.4/mapbox-gl.css";
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = "https://api.mapbox.com/mapbox-gl-js/v3.9.4/mapbox-gl.js";
    script.onload = () => resolve((window as unknown as Record<string, unknown>).mapboxgl);
    script.onerror = () => reject(new Error("Failed to load Mapbox GL JS"));
    document.head.appendChild(script);
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MapboxGLAny = any;

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function parsePopulation(value: string | number | null | undefined): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (!value) return 0;
  const parsed = Number(value.replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function shakemapMmiStyle(value: number): { color: string; width: number; opacity: number } {
  if (value >= 9) return { color: "#8B0000", width: 8, opacity: 0.85 };
  if (value >= 8) return { color: "#DC2626", width: 12, opacity: 0.75 };
  if (value >= 7) return { color: "#F97316", width: 16, opacity: 0.7 };
  if (value >= 6) return { color: "#FB923C", width: 20, opacity: 0.65 };
  if (value >= 5) return { color: "#FDE047", width: 24, opacity: 0.6 };
  if (value >= 4) return { color: "#FACC15", width: 28, opacity: 0.5 };
  if (value >= 3) return { color: "#86EFAC", width: 32, opacity: 0.4 };
  return { color: "#D1FAE5", width: 36, opacity: 0.3 };
}

function removeShakeMapPaint(m: { getLayer: (id: string) => unknown; removeLayer: (id: string) => void; getSource: (id: string) => unknown; removeSource: (id: string) => void }, ids: Set<string>) {
  for (const id of ids) {
    try { if (m.getLayer(id)) m.removeLayer(id); } catch { /* ignore */ }
    try { if (m.getSource(id)) m.removeSource(id); } catch { /* ignore */ }
  }
  ids.clear();
}

function isRoadLayerId(id: string): boolean {
  const lower = id.toLowerCase();
  return (
    lower.includes("road") ||
    lower.includes("street") ||
    lower.includes("bridge") ||
    lower.includes("tunnel")
  );
}

// ── Donut cluster helpers ────────────────────────────────────────────────────

function arcSegment(
  cx: number, cy: number,
  outerR: number, innerR: number,
  startAngle: number, endAngle: number,
  color: string,
): string {
  const x1 = cx + outerR * Math.cos(startAngle), y1 = cy + outerR * Math.sin(startAngle);
  const x2 = cx + outerR * Math.cos(endAngle),   y2 = cy + outerR * Math.sin(endAngle);
  const x3 = cx + innerR * Math.cos(endAngle),   y3 = cy + innerR * Math.sin(endAngle);
  const x4 = cx + innerR * Math.cos(startAngle), y4 = cy + innerR * Math.sin(startAngle);
  const large = endAngle - startAngle > Math.PI ? 1 : 0;
  return `<path d="M ${x1} ${y1} A ${outerR} ${outerR} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${large} 0 ${x4} ${y4} Z" fill="${color}"/>`;
}

function buildDonutEl(props: Record<string, number>): HTMLDivElement {
  const total = donutCenterCount(props);
  const size  = total < 10 ? 40 : total < 50 ? 46 : total < 200 ? 52 : 58;
  const outerR = size / 2 - 2;
  const innerR = outerR * 0.58;
  const cx = size / 2, cy = size / 2;

  const segments = donutSeveritySegments(props).map((s) => ({
    color: severityColors[s.severity],
    count: s.count,
  }));

  const denom = segments.reduce((sum, s) => sum + s.count, 0) || 1;

  let arcs = "";
  if (segments.length === 1) {
    // Full 360° arc is degenerate in SVG - use a stroked ring so the center
    // stays transparent (matches the multi-segment donut appearance).
    const mid = (outerR + innerR) / 2;
    const thickness = outerR - innerR;
    arcs = `<circle cx="${cx}" cy="${cy}" r="${mid}" fill="none" stroke="${segments[0].color}" stroke-width="${thickness}"/>`;
  } else {
    let angle = -Math.PI / 2;
    for (const seg of segments) {
      const sweep = (seg.count / denom) * 2 * Math.PI;
      arcs += arcSegment(cx, cy, outerR, innerR, angle, angle + sweep, seg.color);
      angle += sweep;
    }
  }

  const fontSize = size < 44 ? 10 : size < 50 ? 11 : 12;
  const label = donutCenterLabel(props);
  // Count sits on the top-right of the ring (hollow center stays open).
  const midR = (outerR + innerR) / 2;
  const badgeAngle = -Math.PI / 4; // NE
  const bx = cx + midR * Math.cos(badgeAngle);
  const by = cy + midR * Math.sin(badgeAngle);
  const badgeR = Math.max(8, fontSize * 0.85);

  const el = document.createElement("div");
  el.style.cssText = `cursor:pointer;width:${size}px;height:${size}px;filter:drop-shadow(0 2px 5px rgba(0,0,0,0.22));`;
  el.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${arcs}
    <circle cx="${bx}" cy="${by}" r="${badgeR}" fill="#111827" stroke="#FFFFFF" stroke-width="1.5"/>
    <text x="${bx}" y="${by}" text-anchor="middle" dominant-baseline="central" fill="#FFFFFF" font-weight="700" font-size="${fontSize}" font-family="system-ui,-apple-system,sans-serif">${label}</text>
  </svg>`;
  return el;
}

function buildPointEl(
  severity: string,
  opts?: {
    locationTrust?: "challenged" | "correction_queued";
    locationPinRole?: "source" | "proposed";
    iconSlug?: string;
    /**
     * Stem-capable pin (flat at low pitch; stem grows with tilt via
     * applyPinElevation). Same layout for Event, Signal, and Crisis pins
     * on Simple / Topography / Satellite.
     */
    elevated?: boolean;
    /** Initial pitch factor 0..1 when elevated (from pinElevationFactor). */
    elevationFactor?: number;
  },
): HTMLDivElement {
  const color = severityColors[severity] ?? "#737373";
  const proposed = opts?.locationPinRole === "proposed";
  const challenged =
    opts?.locationTrust === "challenged" || opts?.locationTrust === "correction_queued";
  const withGlyph = Boolean(opts?.iconSlug) && !proposed;
  const elevated = Boolean(opts?.elevated) && !proposed;
  // Glyph pins need a bit more surface; severity still drives size.
  const size = withGlyph
    ? severity === "critical"
      ? 28
      : severity === "high"
        ? 26
        : 24
    : severity === "critical"
      ? 18
      : severity === "high"
        ? 16
        : 14;
  // Reserve full stem height so bottom-anchor ground contact never jumps.
  const maxStem = elevated ? Math.max(10, Math.round(size * 0.9)) : 0;
  const totalH = size + maxStem;
  // Outer: Mapbox sets its positioning transform here - do not animate this element.
  // Do NOT set position:relative — Mapbox relies on .mapboxgl-marker { position:absolute }.
  // Inline relative overrides that and stacks pins in document flow.
  const outer = document.createElement("div");
  outer.style.cssText = `width:${size}px;height:${totalH}px;cursor:pointer;`;
  if (elevated) {
    outer.dataset.elevatedPin = "1";
    outer.dataset.maxStem = String(maxStem);
  }

  // Head hosts the disc / ping / trust ring.
  // Elevated: absolute; bottom rises with pitch factor (stem grows under it).
  const head = document.createElement("div");
  head.className = "marker-pin-head";
  head.style.cssText = elevated
    ? `position:absolute;left:0;bottom:0;width:${size}px;height:${size}px;`
    : `width:${size}px;height:${size}px;`;

  // Radar ping ring: expands outward in marker color, hidden until active.
  const ring = document.createElement("div");
  ring.className = "marker-ping-ring";
  ring.style.cssText = `position:absolute;inset:0;border-radius:50%;border:2.5px solid ${color};opacity:0;pointer-events:none;`;
  // Challenged affordance: dashed amber halo on the source pin (no second pin).
  if (challenged && !proposed) {
    const trustRing = document.createElement("div");
    trustRing.className = "marker-trust-ring";
    trustRing.style.cssText =
      "position:absolute;inset:-5px;border-radius:50%;border:2px dashed #D97706;pointer-events:none;opacity:0.95;";
    head.appendChild(trustRing);
  }
  // Inner dot: the colored circle, safe to scale independently.
  const inner = document.createElement("div");
  inner.className = "marker-dot";
  if (proposed) {
    // Ghost proposed pin for dual location display.
    inner.style.cssText =
      `width:100%;height:100%;border-radius:50%;background:transparent;border:2.5px dashed ${color};box-shadow:none;opacity:0.85;`;
  } else {
    inner.style.cssText = [
      `width:100%;height:100%;border-radius:50%;background:${color};`,
      `border:2.5px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);`,
      withGlyph ? "display:flex;align-items:center;justify-content:center;overflow:hidden;" : "",
    ].join("");
    if (withGlyph && opts?.iconSlug) {
      const img = document.createElement("img");
      img.src = signalIconUrl(opts.iconSlug);
      img.alt = "";
      img.draggable = false;
      // Medium discs are yellow (`#FBBF24`) — white glyphs wash out; use a dark glyph there.
      const lightDisc = severity === "medium";
      img.style.cssText = [
        "width:58%;height:58%;object-fit:contain;pointer-events:none;",
        lightDisc
          ? "filter:brightness(0);"
          : "filter:brightness(0) invert(1);",
      ].join("");
      inner.appendChild(img);
    }
  }
  head.appendChild(ring);
  head.appendChild(inner);
  outer.appendChild(head);

  if (elevated) {
    const stem = document.createElement("div");
    stem.className = "marker-pin-stem";
    stem.style.cssText = [
      "position:absolute;left:50%;bottom:0;",
      `width:2px;height:${maxStem}px;margin-left:-1px;`,
      `background:${color};`,
      "border-radius:1px 1px 0 0;",
      "box-shadow:0 0 0 1px rgba(255,255,255,0.9);",
      "pointer-events:none;",
      "transform-origin:bottom center;",
      "transform:scaleY(0);",
      "opacity:0;",
      "will-change:transform;",
    ].join("");
    outer.appendChild(stem);
    applyPinElevation(outer, opts?.elevationFactor ?? 0);
  }

  return outer;
}

// ── Component ────────────────────────────────────────────────────────────────

export function CrisisMap({
  markers = [],
  regions = [],
  center = [30, 14],
  zoom = 5.5,
  initialPitch = 0,
  initialBearing = 0,
  className,
  onMarkerClick,
  onMarkerHover,
  interactive = true,
  focusCountryPCode,
  focusCountryName,
  adminBoundaries,
  adminBoundaryLevel,
  fitBoundsGeometry,
  focusCountryGeometry,
  populationBoundaries,
  hoveredMarkerId,
  fitBoundsOnFocus = true,
  countryFitNonce = 0,
  preserveDrawingBuffer = false,
  flyDuration = 1500,
  flyPaddingBottom = 0,
  flyPitch,
  flyBearing,
  forceFlyToken = 0,
  onCameraChange,
  onClusterExpand,
  showBoundaries = true,
  showMarkers = true,
  showRoads = true,
  showNrcLocations = false,
  showBlockages = false,
  blockagesGeoJson = null,
  showSeismicSignals = false,
  seismicSignalsGeoJson = null,
  baseMapType = "simple",
  mapApiRef,
  onMapMove,
  locationPickActive = false,
  onMapClick,
  introFromGlobe = false,
  onLoadError,
}: CrisisMapProps) {
  const t = useTranslations("map");
  const locale = useLocale();
  const isDark = useIsDark();
  const tRef = useRef(t);
  const isDarkRef = useRef(isDark);
  tRef.current = t;
  isDarkRef.current = isDark;

  // Skip seed bbox rectangles / point "boundaries"; fall back to Mapbox tiles.
  const paintableFocusGeometry = useMemo(
    () => (isPaintableBoundaryGeometry(focusCountryGeometry as never) ? focusCountryGeometry : undefined),
    [focusCountryGeometry],
  );
  const paintableAdminBoundaries = useMemo(
    () => (adminBoundaries ?? []).filter((b) => isPaintableBoundaryGeometry(b.geometry as never)),
    [adminBoundaries],
  );
  const paintablePopulationBoundaries = useMemo(
    () => (populationBoundaries ?? []).filter((b) => isPaintableBoundaryGeometry(b.geometry as never)),
    [populationBoundaries],
  );

  // Basemap type picks the Mapbox style; roads are an overlay on every type.
  // Satellite has no separate road layers, so roads=on uses satellite-streets.
  const mapStyle = (() => {
    if (baseMapType === "satellite") {
      return showRoads
        ? "mapbox://styles/mapbox/satellite-streets-v12"
        : "mapbox://styles/mapbox/satellite-v9";
    }
    // Topography shares the theme style - relief comes from hillshade +
    // DEM terrain mesh (see topography-terrain sync below) instead of a
    // Mapbox style. outdoors-v12 was tried and rejected: pale landcover,
    // no dark-mode variant, and boundary overlays drowned in it.
    return isDark
      ? "mapbox://styles/mapbox/dark-v11"
      : "mapbox://styles/mapbox/light-v11";
  })();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<MapboxGLAny>(null);
  const mbRef = useRef<MapboxGLAny>(null);
  const onMarkerClickRef = useRef(onMarkerClick);
  const onMarkerHoverRef = useRef(onMarkerHover);
  const onCameraChangeRef = useRef(onCameraChange);
  const onClusterExpandRef = useRef(onClusterExpand);
  const onMapMoveRef = useRef(onMapMove);
  const onMapClickRef = useRef(onMapClick);
  const locationPickActiveRef = useRef(locationPickActive);
  useEffect(() => { onMarkerClickRef.current = onMarkerClick; }, [onMarkerClick]);
  useEffect(() => { onMarkerHoverRef.current = onMarkerHover; }, [onMarkerHover]);
  useEffect(() => { onCameraChangeRef.current = onCameraChange; }, [onCameraChange]);
  useEffect(() => { onClusterExpandRef.current = onClusterExpand; }, [onClusterExpand]);
  useEffect(() => { onMapMoveRef.current = onMapMove; }, [onMapMove]);
  useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);
  useEffect(() => { locationPickActiveRef.current = locationPickActive; }, [locationPickActive]);
  const clusterDomMarkers = useRef<Map<string, MapboxGLAny>>(new Map());
  /** Spiderfy display lng/lat by marker id — kept in sync with mounted pins. */
  const displayLngLatRef = useRef<Map<number, [number, number]>>(new Map());
  const markersDataRef = useRef<MapMarker[]>(markers);
  const hoveredMarkerIdRef = useRef<number | null>(null);
  const seismicDisplayedRef = useRef<SeismicMapCollection | null>(null);
  const seismicAnimRef = useRef<number | null>(null);
  const shakemapPaintIdsRef = useRef<Set<string>>(new Set());
  const shakemapHoverBoundRef = useRef<Set<string>>(new Set());
  const shakemapPopupRef = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [tiltHintDismissed, setTiltHintDismissed] = useState(() =>
    isTopographyTiltHintDismissed(),
  );
  const showTiltHint = shouldShowTopographyTiltHint({
    baseMapType,
    dismissed: tiltHintDismissed,
  });
  const onDismissTiltHint = () => {
    dismissTopographyTiltHint();
    setTiltHintDismissed(true);
  };
  const onTiltFromHint = () => {
    if (map.current) applyTopographyOptInTilt(map.current);
    dismissTopographyTiltHint();
    setTiltHintDismissed(true);
  };
  const showAltitudeProbe = shouldShowPointAltitude(baseMapType);
  /** Imperative probe DOM — no React state on mousemove/camera (keeps tilt/drag smooth). */
  const mapShellRef = useRef<HTMLDivElement | null>(null);
  const altitudeProbeElRef = useRef<HTMLDivElement | null>(null);
  const altitudeProbeLabelRef = useRef<HTMLSpanElement | null>(null);
  const altitudeProbeRafRef = useRef(0);
  const altitudeProbeLngLatRef = useRef<{ lng: number; lat: number } | null>(null);
  const altitudeUnavailableLabel = t("pointAltitude.unavailable");
  const mapReadyRef = useRef(false);
  const appliedStyleRef = useRef<string | null>(null);
  const mapStyleRef = useRef(mapStyle);
  mapStyleRef.current = mapStyle;
  // Tracks Mapbox built-in admin-1 layer IDs we've mutated so we can reset them.
  const admin1LayerIds = useRef<string[]>([]);

  // Convert focusCountryGeometry prop to a usable format (same structure as the query result).
  // This avoids the duplicate getCountryByPCode fetch when the page already passes geometry.
  // Paint layers still require isPaintableBoundaryGeometry; framing uses any polygon
  // (including seed bboxes) so countries without rich COD boundaries still fitBounds.
  const focusCountry = useMemo(() => {
    if (!focusCountryGeometry) return null;
    if (!isPaintableBoundaryGeometry(focusCountryGeometry as never)) return null;
    return { geometry: focusCountryGeometry };
  }, [focusCountryGeometry]);

  const focusCountryFitBounds = useMemo(() => {
    if (!focusCountryGeometry) return null;
    return geometryBounds(focusCountryGeometry as never);
  }, [focusCountryGeometry]);

  // ── Map init (once) ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainer.current || !MAPBOX_TOKEN) return;
    let cancelled = false;

    loadMapboxGL().then((mapboxgl) => {
      if (cancelled || !mapContainer.current || map.current) return;
      mbRef.current = mapboxgl;
      mapboxgl.accessToken = MAPBOX_TOKEN;

      // First-visit intro: start at WORLD_VIEW (globe) if introFromGlobe is true.
      // fitBounds will fly to the country afterwards (bumped duration for intro).
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: mapStyle,
        center: introFromGlobe ? WORLD_VIEW.center : center,
        zoom: introFromGlobe ? WORLD_VIEW.zoom : zoom,
        pitch: initialPitch,
        bearing: initialBearing,
        interactive,
        preserveDrawingBuffer,
        attributionControl: false,
      });

      // Only surface pre-load failures. Mapbox fires `error` for routine
      // tile 404s after the style is up — those must not replace the map.
      map.current.on("error", (e: { error?: { message?: string; status?: number } }) => {
        if (cancelled || mapReadyRef.current) return;
        const isOffline = !navigator.onLine || e.error?.status === 0;
        const message = isOffline
          ? "No internet connection detected. Please check your network and try again."
          : e.error?.message ?? "Failed to load map data. Please try again.";
        onLoadError?.({ message, isOffline });
      });

      // Right-click / Ctrl+click / ⌘+click must drive Mapbox pitch-rotate, not
      // the browser context menu (all basemap modes).
      const suppressBrowserMenu = (e: Event) => {
        e.preventDefault();
      };
      const canvas = map.current.getCanvas() as HTMLCanvasElement;
      canvas.addEventListener("contextmenu", suppressBrowserMenu);
      const removeMetaPitchBridge = bridgeMetaToCtrlForPitch(canvas);
      map.current.on("contextmenu", (e: { preventDefault?: () => void; originalEvent?: Event }) => {
        e.preventDefault?.();
        e.originalEvent?.preventDefault?.();
      });

      map.current.on("load", () => {
        if (!cancelled) {
          mapReadyRef.current = true;
          // Track the style the map was constructed with so the first user toggle
          // (basemap/roads/theme) actually calls setStyle instead of being skipped.
          appliedStyleRef.current = mapStyleRef.current;
          setLoaded(true);
        }
      });

      // Report settled camera so the page can restore prior zoom layers
      // (e.g. cluster view after closing a marker detail sheet).
      map.current.on("moveend", () => {
        if (cancelled || !map.current) return;
        const c = map.current.getCenter();
        onCameraChangeRef.current?.({
          center: [c.lng, c.lat],
          zoom: map.current.getZoom(),
          pitch: map.current.getPitch?.() ?? 0,
          bearing: map.current.getBearing?.() ?? 0,
        });
      });

      // Continuous frames for overlays (spaghetti connectors) during pan/fly.
      map.current.on("move", () => {
        if (cancelled) return;
        onMapMoveRef.current?.();
      });

      map.current.addControl(
        new mapboxgl.NavigationControl({ showCompass: false }),
        "bottom-right",
      );

      // Stash disposer on the map instance for effect cleanup below.
      (map.current as MapboxGLAny).__clearMetaPitchBridge = removeMetaPitchBridge;
    }).catch((err: Error) => {
      if (cancelled) return;
      const isOffline = !navigator.onLine;
      const message = isOffline
        ? "No internet connection detected. Please check your network and try again."
        : "Failed to load map library. Please refresh the page.";
      onLoadError?.({ message, isOffline });
    });

    return () => {
      cancelled = true;
      mapReadyRef.current = false;
      appliedStyleRef.current = null;
      setLoaded(false);
      if (mapApiRef) mapApiRef.current = null;
      try {
        (map.current as MapboxGLAny)?.__clearMetaPitchBridge?.();
      } catch {
        /* ignore */
      }
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Swap basemap style without tearing down the map so custom layers restore.
  useEffect(() => {
    if (!map.current || !mapReadyRef.current) return;
    if (appliedStyleRef.current === mapStyle) return;

    const m = map.current;
    setLoaded(false);
    const onStyleLoad = () => setLoaded(true);
    m.once("style.load", onStyleLoad);
    appliedStyleRef.current = mapStyle;
    m.setStyle(mapStyle);
    return () => {
      m.off("style.load", onStyleLoad);
    };
  }, [mapStyle]);

  // Hybrid Topography: hillshade + DEM terrain mesh (`setTerrain`) while
  // Topography is active. Mesh off through Mapbox globe→mercator morph (z5–6)
  // and far Region; Country boost after morph settles (numeric — zoom
  // expressions can leave the mesh off). Pitch gestures stay on for all
  // basemaps (hint is Topography-only; pitch is never reset on swap). Runs
  // before the focus effect so the dim mask lands above the relief outside
  // the focus country too.
  useEffect(() => {
    if (!map.current || !loaded) return;
    const m = map.current;
    try {
      syncTopographyTerrain(m, baseMapType, {
        isDark,
        zoom: typeof m.getZoom === "function" ? m.getZoom() : 6,
      });
      syncTopographyPitch(m, baseMapType);
    } catch (err) {
      // Surface failures — silent catch previously hid a dead setTerrain.
      console.warn("[topography] failed to sync terrain/pitch", err);
    }

    if (baseMapType !== "topography") {
      return () => {
        try {
          syncTopographyTerrain(m, "simple", { isDark });
          syncTopographyPitch(m, "simple");
        } catch {
          /* ignore */
        }
      };
    }

    // Update mid-gesture so Region fade (exaggeration → 0) applies before
    // zoomend — otherwise far-zoom can flash black with a stale Country boost.
    let zoomRaf = 0;
    const onZoom = () => {
      if (zoomRaf) return;
      zoomRaf = requestAnimationFrame(() => {
        zoomRaf = 0;
        try {
          updateTopographyTerrainExaggeration(m);
        } catch {
          /* ignore */
        }
      });
    };
    m.on?.("zoom", onZoom);
    m.on?.("zoomend", onZoom);
    return () => {
      if (zoomRaf) cancelAnimationFrame(zoomRaf);
      m.off?.("zoom", onZoom);
      m.off?.("zoomend", onZoom);
      try {
        syncTopographyTerrain(m, "simple", { isDark });
        syncTopographyPitch(m, "simple");
      } catch {
        /* ignore */
      }
    };
  }, [loaded, baseMapType, isDark]);

  // Enable globe projection for far zoom — static (no auto-spin).
  // Mapbox morphs globe↔mercator with zoom automatically.
  useEffect(() => {
    if (!map.current || !loaded) return;
    ensureGlobeProjection(map.current);
  }, [loaded]);

  // Pitch-linked pin stems on every basemap — flat ≤45°, full by ~70°.
  // Imperative DOM only (no remount) so tilt stays smooth.
  useEffect(() => {
    if (!map.current || !loaded) return;
    const m = map.current;
    let raf = 0;
    const syncPinElevation = () => {
      raf = 0;
      const factor = pinElevationFactor(
        typeof m.getPitch === "function" ? m.getPitch() : 0,
      );
      for (const [key, mk] of clusterDomMarkers.current) {
        if (!key.startsWith("p-")) continue;
        try {
          const el = (mk as MapboxGLAny).getElement?.() as HTMLElement | undefined;
          if (el?.dataset.elevatedPin) applyPinElevation(el, factor);
        } catch {
          /* ignore */
        }
      }
    };
    const onPitch = () => {
      if (raf) return;
      raf = requestAnimationFrame(syncPinElevation);
    };
    syncPinElevation();
    m.on?.("pitch", onPitch);
    m.on?.("pitchend", onPitch);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      m.off?.("pitch", onPitch);
      m.off?.("pitchend", onPitch);
    };
  }, [loaded]);

  // Topography hover probe — orange ground dot + altitude under the cursor.
  // All updates are imperative DOM writes so pan/tilt never re-render React.
  // Over pitched sky Mapbox clamps lngLat to the silhouette — detect that,
  // fade the probe, and restore the system cursor so filters stay reachable.
  useEffect(() => {
    if (!map.current || !loaded) return;
    const m = map.current;
    const PROBE_ACTIVE_CLASS = "topography-altitude-probe-active";

    const setProbeCursorActive = (active: boolean) => {
      const shell = mapShellRef.current;
      if (!shell) return;
      shell.classList.toggle(PROBE_ACTIVE_CLASS, active);
    };

    const hideProbe = () => {
      altitudeProbeLngLatRef.current = null;
      setProbeCursorActive(false);
      const el = altitudeProbeElRef.current;
      if (el) {
        el.style.opacity = "0";
        el.setAttribute("aria-hidden", "true");
      }
    };
    if (!showAltitudeProbe) {
      hideProbe();
      return;
    }

    const paintProbe = (lng: number, lat: number, sampleLabel: boolean) => {
      const el = altitudeProbeElRef.current;
      if (!el) return;
      const point = m.project([lng, lat]) as { x: number; y: number };
      el.style.left = `${point.x}px`;
      el.style.top = `${point.y}px`;
      el.style.opacity = "1";
      el.removeAttribute("aria-hidden");
      setProbeCursorActive(true);
      // DEM sample only on pointer moves — camera frames just reproject (smooth tilt).
      if (!sampleLabel) return;
      const labelEl = altitudeProbeLabelRef.current;
      if (!labelEl) return;
      const altitude = samplePointAltitude(m, lng, lat);
      const text = formatAltitudeProbeLabel(altitude, altitudeUnavailableLabel);
      labelEl.textContent = text;
      el.setAttribute("aria-label", text);
    };

    let pendingSampleLabel = false;
    const schedulePaint = (sampleLabel: boolean) => {
      pendingSampleLabel = pendingSampleLabel || sampleLabel;
      if (altitudeProbeRafRef.current) return;
      altitudeProbeRafRef.current = requestAnimationFrame(() => {
        altitudeProbeRafRef.current = 0;
        const ll = altitudeProbeLngLatRef.current;
        const wantLabel = pendingSampleLabel;
        pendingSampleLabel = false;
        if (!ll) return;
        paintProbe(ll.lng, ll.lat, wantLabel);
      });
    };

    const onMove = (e: {
      lngLat: { lng: number; lat: number };
      point: { x: number; y: number };
    }) => {
      // Sky: lngLat sticks on the horizon while the pointer keeps moving.
      if (!isPointerOverTerrain(m, e.point, e.lngLat)) {
        hideProbe();
        return;
      }
      altitudeProbeLngLatRef.current = {
        lng: e.lngLat.lng,
        lat: e.lngLat.lat,
      };
      schedulePaint(true);
    };

    const onCamera = () => {
      if (!altitudeProbeLngLatRef.current) return;
      schedulePaint(false);
    };

    m.on("mousemove", onMove);
    m.on("mouseout", hideProbe);
    m.on("move", onCamera);
    return () => {
      m.off("mousemove", onMove);
      m.off("mouseout", hideProbe);
      m.off("move", onCamera);
      if (altitudeProbeRafRef.current) {
        cancelAnimationFrame(altitudeProbeRafRef.current);
        altitudeProbeRafRef.current = 0;
      }
      hideProbe();
    };
  }, [loaded, showAltitudeProbe, altitudeUnavailableLabel]);

  // ── Country focus: dim mask + border glow + bounds ──────────────────────
  //
  // Uses Mapbox's public `mapbox.country-boundaries-v1` vector tileset for
  // real country polygons (keyed by ISO 3166-1 alpha-2 via the `iso_3166_1`
  // property). Backend geometry is used only to compute the bbox for
  // fitBounds - its own polygon may be a bbox rectangle, which is fine for
  // framing but not for rendering.
  const focusIso = focusCountryPCode?.toUpperCase();

  useEffect(() => {
    if (!map.current || !loaded) return;
    const m = map.current;
    const COUNTRY_SOURCE = "mapbox-countries";

    const FOCUS_GEOJSON_SOURCE = "focus-country-geojson";

    const cleanup = () => {
      for (const id of ["focus-mask-fill", "focus-highlight-fill", "focus-border-line"]) {
        try { if (m.getLayer(id)) m.removeLayer(id); } catch { /* ignore */ }
      }
      try { if (m.getSource(COUNTRY_SOURCE)) m.removeSource(COUNTRY_SOURCE); } catch { /* ignore */ }
      try { if (m.getSource(FOCUS_GEOJSON_SOURCE)) m.removeSource(FOCUS_GEOJSON_SOURCE); } catch { /* ignore */ }
      // Reset any Mapbox built-in admin-1 layers we mutated back to hidden.
      for (const id of admin1LayerIds.current) {
        try { m.setLayoutProperty(id, "visibility", "none"); } catch { /* ignore */ }
      }
      admin1LayerIds.current = [];
    };

    cleanup();

    if (!focusIso) return;

    // Layer ordering strategy:
    //   (1) mask + highlight fills render BELOW the road network (roads sit
    //       below admin lines and labels in Mapbox styles, so this also
    //       keeps state borders and labels above the fills). Anchoring to
    //       the admin layers instead used to bury every road line under
    //       the semi-transparent fills.
    //   (2) focus country border line renders ABOVE admin-1 but below
    //       label symbols, so the country outline stays crisp.
    const styleLayers = m.getStyle().layers as Array<{ id: string; type: string }>;
    const firstRoadLayer = styleLayers.find((l) => isRoadLayerId(l.id));
    const firstAdminLayer = styleLayers.find((l) =>
      l.id === "admin-1-boundary-bg" || l.id === "admin-0-boundary-bg",
    );
    const firstSymbolLayer = styleLayers.find((l) => l.type === "symbol");
    const fillBeforeId: string | undefined =
      firstRoadLayer?.id ?? firstAdminLayer?.id ?? firstSymbolLayer?.id;
    const borderBeforeId: string | undefined = firstSymbolLayer?.id;

    // Mapbox's public country polygons tileset (free with any token).
    m.addSource(COUNTRY_SOURCE, {
      type: "vector",
      url: "mapbox://mapbox.country-boundaries-v1",
    });

    // Mask over every country EXCEPT the focus.
    // Simple: near-white wash (light) / black overlay (dark) so non-focus
    // areas recede. Terrain/satellite: softer, always-dark mask - a white
    // wash over imagery reads as fog, and these basemaps carry real
    // information outside the focus country too.
    const maskColor =
      baseMapType === "simple" && !isDark ? "#FFFFFF" : "#000000";
    const maskOpacity =
      baseMapType === "simple" ? (isDark ? 0.55 : 0.9) : 0.4;
    m.addLayer(
      {
        id: "focus-mask-fill",
        type: "fill",
        source: COUNTRY_SOURCE,
        "source-layer": "country_boundaries",
        filter: ["!=", ["get", "iso_3166_1"], focusIso],
        paint: {
          "fill-color": maskColor,
          "fill-opacity": maskOpacity,
        },
      },
      fillBeforeId,
    );

    // Blue tint + border for the focus country.
    // The tint only earns its keep on the flat "simple" style - on
    // terrain/satellite it muddies exactly the detail those basemaps
    // exist to show, so there the focus is carried by border + mask only.
    const showHighlightFill = baseMapType === "simple";
    // Overlay lines contrast against the BASEMAP, not the app theme:
    // satellite imagery is always dark regardless of light/dark mode.
    const overlayOnDark = baseMapType === "satellite" || isDark;
    // Prefer paintable DB geometry (real OCHA polygons). Seed bboxes fall
    // through to Mapbox country tiles so local/dev doesn't paint squares.
    const highlightColor = isDark ? "#1E3A5F" : "#1E40AF";
    const highlightOpacity = isDark ? 0.45 : 0.35;
    const borderColor = overlayOnDark ? "#60A5FA" : "#1D4ED8";
    const borderWidth = overlayOnDark ? 1.5 : 1.25;
    const borderOpacity = overlayOnDark ? 0.9 : 0.85;

    if (paintableFocusGeometry) {
      m.addSource(FOCUS_GEOJSON_SOURCE, {
        type: "geojson",
        data: { type: "Feature", geometry: paintableFocusGeometry as never, properties: {} },
      });
      if (showHighlightFill) {
        m.addLayer(
          { id: "focus-highlight-fill", type: "fill", source: FOCUS_GEOJSON_SOURCE,
            paint: { "fill-color": highlightColor, "fill-opacity": highlightOpacity } },
          fillBeforeId,
        );
      }
      m.addLayer(
        { id: "focus-border-line", type: "line", source: FOCUS_GEOJSON_SOURCE,
          paint: { "line-color": borderColor, "line-width": borderWidth, "line-opacity": borderOpacity } },
        borderBeforeId,
      );
    } else {
      // Fallback: use Mapbox tileset (may have inaccurate boundaries for some countries).
      if (showHighlightFill) {
        m.addLayer(
          {
            id: "focus-highlight-fill",
            type: "fill",
            source: COUNTRY_SOURCE,
            "source-layer": "country_boundaries",
            filter: ["==", ["get", "iso_3166_1"], focusIso],
            paint: { "fill-color": highlightColor, "fill-opacity": highlightOpacity },
          },
          fillBeforeId,
        );
      }
      m.addLayer(
        {
          id: "focus-border-line",
          type: "line",
          source: COUNTRY_SOURCE,
          "source-layer": "country_boundaries",
          filter: ["==", ["get", "iso_3166_1"], focusIso],
          paint: { "line-color": borderColor, "line-width": borderWidth, "line-opacity": borderOpacity },
        },
        borderBeforeId,
      );
    }

    // Show admin-1 (state) borders only inside the focus country, and
    // surface mid-tier settlement labels (Port Sudan, El Obeid, Nyala,
    // etc.) by relaxing Mapbox's default filterrank cutoff.
    const allLayers = m.getStyle().layers as Array<{
      id: string;
      type: string;
      filter?: unknown;
    }>;

    for (const layer of allLayers) {
      const id = layer.id.toLowerCase();

      // Admin-1 state lines: always visit and explicitly control visibility.
      // Mapbox base style may show these at the current zoom, so we must
      // explicitly hide them unless we want the A1 fallback.
      if (
        layer.type === "line" &&
        id.includes("admin") &&
        (id.includes("-1-") || id.endsWith("-1"))
      ) {
        admin1LayerIds.current.push(layer.id);
        if (
          showBoundaries &&
          adminBoundaryLevel === 1 &&
          paintableAdminBoundaries.length === 0
        ) {
          try {
            m.setFilter(layer.id, [
              "all",
              ["==", ["get", "admin_level"], 1],
              ["==", ["get", "maritime"], "false"],
              ["==", ["get", "iso_3166_1"], focusIso],
            ]);
            m.setLayerZoomRange(layer.id, 0, 24);
            m.setPaintProperty(layer.id, "line-color", overlayOnDark ? "#94A3B8" : "#475569");
            m.setPaintProperty(layer.id, "line-width", 1.4);
            m.setPaintProperty(layer.id, "line-opacity", 0.85);
            m.setPaintProperty(layer.id, "line-dasharray", [3, 2]);
            m.setLayoutProperty(layer.id, "visibility", "visible");
          } catch { /* ignore */ }
        } else {
          try { m.setLayoutProperty(layer.id, "visibility", "none"); } catch { /* ignore */ }
        }
      }

      // State/province labels - show for focus country only at all zoom levels.
      if (layer.type === "symbol" && id === "state-label") {
        try {
          m.setLayerZoomRange(layer.id, 0, 24);
          m.setFilter(layer.id, ["==", ["get", "iso_3166_1"], focusIso] as unknown as never);
          m.setLayoutProperty(layer.id, "text-size", [
            "interpolate", ["linear"], ["zoom"],
            3, 11,
            6, 13,
            10, 15,
          ]);
          m.setPaintProperty(layer.id, "text-color", isDark ? "#CBD5E1" : "#374151");
          m.setPaintProperty(layer.id, "text-halo-color", isDark ? "rgba(15,23,42,0.85)" : "#FFFFFF");
          m.setPaintProperty(layer.id, "text-halo-width", 1.5);
          m.setPaintProperty(layer.id, "text-halo-blur", 0.5);
        } catch { /* ignore */ }
      }

      // Settlement labels - restrict to focus country only, and relax
      // filterrank so mid-tier cities (Port Sudan, Nyala, etc.) are visible.
      // All settlement labels outside the focus country are hidden; country
      // names on those areas are left to Mapbox's own country-label layer.
      if (
        layer.type === "symbol" &&
        (id === "settlement-minor-label" || id === "settlement-major-label")
      ) {
        try {
          m.setLayerZoomRange(layer.id, 0, 24);
          const existing = layer.filter as unknown[] | undefined;
          if (Array.isArray(existing) && existing[0] === "all") {
            const relaxed = (existing as unknown[]).map((clause) => {
              if (
                Array.isArray(clause) &&
                clause[0] === "<=" &&
                Array.isArray(clause[1]) &&
                clause[1][0] === "get" &&
                clause[1][1] === "filterrank"
              ) {
                return ["<=", ["get", "filterrank"], 4];
              }
              return clause;
            });
            // Append country filter so only the focus country's cities show.
            const withCountry = [...relaxed, ["==", ["get", "iso_3166_1"], focusIso]];
            m.setFilter(layer.id, withCountry as unknown as never);
          }
          m.setLayoutProperty(layer.id, "text-size", [
            "interpolate", ["linear"], ["zoom"],
            3, 11,
            6, 14,
            10, 17,
          ]);
          // Labels: dark text on light basemap, light text on dark basemap.
          m.setPaintProperty(layer.id, "text-color", isDark ? "#E2E8F0" : "#1F2937");
          m.setPaintProperty(layer.id, "text-halo-color", isDark ? "rgba(15,23,42,0.85)" : "#FFFFFF");
          m.setPaintProperty(layer.id, "text-halo-width", 1.5);
          m.setPaintProperty(layer.id, "text-halo-blur", 0.5);
        } catch { /* ignore */ }
      }
    }

    return cleanup;
  }, [focusIso, paintableFocusGeometry, loaded, paintableAdminBoundaries, adminBoundaryLevel, isDark, showBoundaries, baseMapType]);

  // Frame the focus country instantly from static countryConfig.
  // L0 GeoJSON (focusCountryFitBounds) is for highlight paint only — waiting
  // on it made Venezuela feel like a 2–5s "flight" (GH #112).
  // Skips when fitBoundsGeometry is set (a more specific region is focused).
  // A countryFitNonce bump always wins (lone-pin detail close → country overview),
  // even if fitBoundsOnFocus is briefly false in the same render batch.
  const prevCountryFitNonce = useRef(countryFitNonce);
  const prevFramedCountry = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!map.current || !loaded || fitBoundsGeometry) return;
    const nonceBumped = countryFitNonce !== prevCountryFitNonce.current;
    prevCountryFitNonce.current = countryFitNonce;
    if (!fitBoundsOnFocus && !nonceBumped) return;

    const cfgBounds = staticCountryBounds(focusCountryName);
    // Static config first (instant). Live bounds only if the country is missing
    // from countryConfig — never let late geometry restart a finished flight.
    const bounds = cfgBounds ?? focusCountryFitBounds;
    if (!bounds) return;

    const framedKey = focusCountryName ?? `bounds:${bounds.join(",")}`;
    if (!nonceBumped && prevFramedCountry.current === framedKey) return;
    prevFramedCountry.current = framedKey;

    // Narrow viewports: less padding so country fit stays country-level
    // (80px on a phone shrinks the usable canvas and looks global).
    const narrow =
      typeof window !== "undefined" && window.matchMedia("(max-width: 48em)").matches;
    const padding = narrow ? 36 : 80;

    try { map.current.stop(); } catch { /* ignore */ }
    map.current.fitBounds(
      [[bounds[0], bounds[1]], [bounds[2], bounds[3]]],
      { padding, duration: 800 },
    );
  }, [
    focusCountryFitBounds,
    focusCountryName,
    loaded,
    fitBoundsGeometry,
    fitBoundsOnFocus,
    countryFitNonce,
  ]);

  // Fit bounds to a specific geometry (e.g. selected region).
  useEffect(() => {
    if (!map.current || !loaded || !fitBoundsGeometry) return;
    const bounds = geometryBounds(fitBoundsGeometry as never);
    if (!bounds) return;
    map.current.fitBounds(
      [[bounds[0], bounds[1]], [bounds[2], bounds[3]]],
      { padding: 60, duration: 800 },
    );
  }, [fitBoundsGeometry, loaded]);

  // ── Region highlight: show selected region geometry, hide country fill ──
  useEffect(() => {
    if (!map.current || !loaded) return;
    const m = map.current;
    const REGION_SOURCE = "region-highlight-source";
    const REGION_FILL = "region-highlight-fill";
    const REGION_LINE = "region-highlight-line";

    const cleanup = () => {
      for (const id of [REGION_FILL, REGION_LINE]) {
        try { if (m.getLayer(id)) m.removeLayer(id); } catch { /* ignore */ }
      }
      try { if (m.getSource(REGION_SOURCE)) m.removeSource(REGION_SOURCE); } catch { /* ignore */ }
    };

    cleanup();

    if (fitBoundsGeometry) {
      // Suppress country-wide highlight while a region is focused.
      try {
        if (m.getLayer("focus-highlight-fill")) m.setPaintProperty("focus-highlight-fill", "fill-opacity", 0);
      } catch { /* ignore */ }

      const styleLayers = m.getStyle().layers as Array<{ id: string; type: string }>;
      const beforeId = styleLayers.find((l) => l.type === "symbol")?.id;
      try {
        m.addSource(REGION_SOURCE, {
          type: "geojson",
          data: { type: "Feature", geometry: fitBoundsGeometry as never, properties: {} },
        });
        m.addLayer({ id: REGION_FILL, type: "fill", source: REGION_SOURCE,
          paint: { "fill-color": isDark ? "#1D4ED8" : "#1E40AF", "fill-opacity": isDark ? 0.25 : 0.25 } }, beforeId);
        m.addLayer({ id: REGION_LINE, type: "line", source: REGION_SOURCE,
          paint: { "line-color": isDark ? "#60A5FA" : "#1D4ED8", "line-width": 2, "line-opacity": 1 } }, beforeId);
      } catch { /* ignore */ }
    } else {
      // Restore country highlight when no region is selected.
      try {
        if (m.getLayer("focus-highlight-fill")) m.setPaintProperty("focus-highlight-fill", "fill-opacity", 0.35);
      } catch { /* ignore */ }
    }

    return cleanup;
  }, [fitBoundsGeometry, loaded, isDark]);

  // ── FlyTo on center/zoom prop change ────────────────────────────────────
  const prevCenter = useRef(center);
  const prevZoom = useRef(zoom);
  const prevPadding = useRef(flyPaddingBottom);
  const prevForceFly = useRef(forceFlyToken);
  useEffect(() => {
    if (!map.current || !loaded) return;
    const forced = forceFlyToken !== prevForceFly.current;
    prevForceFly.current = forceFlyToken;
    // Country fitBounds owns framing whenever a focus country is selected —
    // including while L0 geometry is still loading. Otherwise flyTo races to
    // a wrong fallback center (e.g. Sudan for Venezuela) and fitBounds has to
    // restart mid-flight (GH #112). Forced restore always wins.
    if (!forced && focusCountryName && fitBoundsOnFocus && !fitBoundsGeometry) return;
    const paddingChanged = prevPadding.current !== flyPaddingBottom;
    if (
      !forced &&
      prevCenter.current[0] === center[0] &&
      prevCenter.current[1] === center[1] &&
      prevZoom.current === zoom &&
      !paddingChanged
    ) return;
    // Skip if Mapbox is already there (avoids stop()+flyTo fighting a live gesture
    // when parent props echo the settled camera).
    if (!forced && !paddingChanged) {
      try {
        const cur = map.current.getCenter?.();
        const z = map.current.getZoom?.();
        if (
          cur &&
          typeof z === "number" &&
          Math.abs(cur.lng - center[0]) < 1e-5 &&
          Math.abs(cur.lat - center[1]) < 1e-5 &&
          Math.abs(z - zoom) < 1e-3
        ) {
          prevCenter.current = center;
          prevZoom.current = zoom;
          prevPadding.current = flyPaddingBottom;
          return;
        }
      } catch {
        /* ignore */
      }
    }
    prevCenter.current = center;
    prevZoom.current = zoom;
    prevPadding.current = flyPaddingBottom;
    // Cancel any in-flight country fitBounds so a deep-link marker zoom wins.
    try { map.current.stop(); } catch { /* ignore */ }
    const { pitch, bearing } = flyToOrientation({
      currentPitch: map.current.getPitch?.() ?? 0,
      currentBearing: map.current.getBearing?.() ?? 0,
      restorePitch: flyPitch,
      restoreBearing: flyBearing,
    });
    map.current.flyTo({
      center,
      zoom,
      duration: flyDuration,
      pitch,
      bearing,
      padding: flyPaddingBottom > 0
        ? { top: 48, bottom: flyPaddingBottom, left: 24, right: 24 }
        : { top: 0, bottom: 0, left: 0, right: 0 },
    });
  }, [center, zoom, loaded, focusCountryName, flyDuration, fitBoundsOnFocus, fitBoundsGeometry, flyPaddingBottom, flyPitch, flyBearing, forceFlyToken]);

  // ── Markers (density ladder: heatmap → donuts → points) ─────────────────
  useEffect(() => {
    if (!map.current || !loaded) return;
    const m = map.current;
    const SOURCE = "crisis-markers";
    const HEAT_SOURCE = "crisis-markers-density-heat";
    const HEAT_LAYER = "crisis-markers-density-heat-layer";
    const CLUSTER_GHOST = "cluster-ghost";
    const POINT_GHOST = "point-ghost";

    // Remove tracked markers. Orphan sweep only on full teardown — sweeping
    // every frame during zoom caused empty flashes between heatmap ↔ donuts.
    const clearDomMarkers = (sweepOrphans = false) => {
      for (const mk of clusterDomMarkers.current.values()) {
        try { mk.remove(); } catch { /* ignore */ }
      }
      clusterDomMarkers.current.clear();
      displayLngLatRef.current = new Map();
      if (!sweepOrphans) return;
      try {
        m.getContainer()
          .querySelectorAll(".mapboxgl-marker")
          .forEach((el: Element) => el.remove());
      } catch { /* ignore */ }
    };

    const removeLayers = () => {
      for (const id of [HEAT_LAYER, CLUSTER_GHOST, POINT_GHOST]) {
        try { if (m.getLayer(id)) m.removeLayer(id); } catch { /* ignore */ }
      }
      for (const id of [HEAT_SOURCE, SOURCE]) {
        try { if (m.getSource(id)) m.removeSource(id); } catch { /* ignore */ }
      }
    };

    if (!showMarkers) {
      clearDomMarkers(true);
      removeLayers();
      return;
    }
    const mb = mbRef.current;

    // Keep markersDataRef current for click handlers that close over it.
    markersDataRef.current = markers;

    clearDomMarkers(true);
    removeLayers();

    const features = markers.map((mk) => ({
      type: "Feature" as const,
      properties: {
        id: mk.id, title: mk.title, severity: mk.severity,
        type: mk.type ?? "", description: mk.description ?? "",
        marker_kind: mk.markerKind ?? "",
        icon_slug: mk.iconSlug ?? "",
        location_trust: mk.locationTrust ?? "",
        location_pin_role: mk.locationPinRole ?? "",
        is_critical: mk.severity === "critical" ? 1 : 0,
        is_high:     mk.severity === "high"     ? 1 : 0,
        is_medium:   mk.severity === "medium"   ? 1 : 0,
        is_low:      mk.severity === "low"      ? 1 : 0,
        // Weight denser severity slightly so critical hotspots read at global zoom.
        heat_weight: mk.severity === "critical" ? 1 : mk.severity === "high" ? 0.85 : 0.65,
      },
      geometry: { type: "Point" as const, coordinates: [mk.lng, mk.lat] },
    }));

    m.addSource(SOURCE, {
      type: "geojson",
      data: { type: "FeatureCollection", features },
      cluster: true,
      clusterMinPoints: CLUSTER_MIN_POINTS,
      clusterMaxZoom: DENSITY_DONUT_MAX_ZOOM,
      clusterRadius: 30,
      clusterProperties: {
        critical: ["+", ["get", "is_critical"]],
        high:     ["+", ["get", "is_high"]],
        medium:   ["+", ["get", "is_medium"]],
        low:      ["+", ["get", "is_low"]],
      },
    });

    // Separate unclustered source so the global heatmap sees every active marker.
    m.addSource(HEAT_SOURCE, {
      type: "geojson",
      data: { type: "FeatureCollection", features },
    });
    m.addLayer({
      id: HEAT_LAYER,
      type: "heatmap",
      source: HEAT_SOURCE,
      // No Mapbox maxzoom — opacity is driven from zoom so the layer can
      // crossfade with donuts instead of vanishing mid-gesture.
      paint: {
        "heatmap-weight": ["coalesce", ["get", "heat_weight"], 0.7],
        "heatmap-intensity": [
          "interpolate", ["linear"], ["zoom"],
          0, 0.7,
          DENSITY_HEATMAP_MAX_ZOOM, 1.35,
        ],
        "heatmap-color": [
          "interpolate", ["linear"], ["heatmap-density"],
          0, "rgba(0,0,0,0)",
          0.15, "rgba(251,191,36,0.25)",
          0.4, "rgba(217,119,6,0.45)",
          0.7, "rgba(220,38,38,0.7)",
          1, "rgba(153,27,27,0.9)",
        ],
        "heatmap-radius": [
          "interpolate", ["linear"], ["zoom"],
          0, 12,
          DENSITY_HEATMAP_MAX_ZOOM, 28,
        ],
        "heatmap-opacity": DENSITY_HEATMAP_PEAK_OPACITY,
      },
    });

    // Ghost layers (opacity 0) - required for queryRenderedFeatures to return
    // cluster and point features so we can drive custom DOM donut markers.
    m.addLayer({ id: CLUSTER_GHOST, type: "circle", source: SOURCE,
      filter: ["has", "point_count"],
      paint: { "circle-radius": 1, "circle-opacity": 0, "circle-stroke-opacity": 0 } });
    m.addLayer({ id: POINT_GHOST, type: "circle", source: SOURCE,
      filter: ["!", ["has", "point_count"]],
      paint: { "circle-radius": 1, "circle-opacity": 0, "circle-stroke-opacity": 0 } });

    const isValidLngLat = (coords: unknown): coords is [number, number] => {
      if (!Array.isArray(coords) || coords.length < 2) return false;
      const lng = Number(coords[0]);
      const lat = Number(coords[1]);
      return (
        Number.isFinite(lng) &&
        Number.isFinite(lat) &&
        Math.abs(lng) <= 180 &&
        Math.abs(lat) <= 90
      );
    };

    // Zoom-driven crossfade: heatmap opacity ↔ DOM marker opacity stay
    // complementary across the country-band floor so zoom never blanks.
    let mountedMode: DensityAggregationMode | "none" = "none";
    let zoomRaf = 0;

    const setHeatOpacity = (opacity: number) => {
      try {
        if (m.getLayer(HEAT_LAYER)) {
          m.setPaintProperty(HEAT_LAYER, "heatmap-opacity", opacity);
        }
      } catch { /* ignore */ }
    };

    const setDomMarkerOpacity = (opacity: number) => {
      for (const mk of clusterDomMarkers.current.values()) {
        try {
          const el = (mk as MapboxGLAny).getElement?.() as HTMLElement | undefined;
          if (el) el.style.opacity = String(opacity);
        } catch { /* ignore */ }
      }
    };

    const renderMarkersForMode = (mode: DensityAggregationMode) => {
      clearDomMarkers(false);
      if (mode === "heatmap") {
        mountedMode = "none";
        return;
      }

      const clusterFeats = dedupeByProperty(
        m.queryRenderedFeatures({ layers: [CLUSTER_GHOST] }) as MapboxGLAny[],
        "cluster_id",
      );
      const pointFeats = dedupeByProperty(
        m.queryRenderedFeatures({ layers: [POINT_GHOST] }) as MapboxGLAny[],
        "id",
      );

      if (mode === "donut") {
        for (const feat of clusterFeats) {
          const coords = feat.geometry?.coordinates;
          const props  = feat.properties as Record<string, number>;
          const cid    = props.cluster_id;
          if (!isValidLngLat(coords) || cid == null || !Number.isFinite(Number(cid))) continue;
          const el = buildDonutEl(props);
          el.style.opacity = String(markerOpacityForZoom(m.getZoom()));
          el.addEventListener("click", () => {
            // Snapshot donut-level camera + cluster size before expanding.
            const c = m.getCenter();
            const leafCount = Number(props.point_count) || 0;
            onClusterExpandRef.current?.(
              {
                center: [c.lng, c.lat],
                zoom: m.getZoom(),
                pitch: m.getPitch?.() ?? 0,
                bearing: m.getBearing?.() ?? 0,
              },
              leafCount,
            );
            // Fetch all leaves so we can fitBounds to the full set - guarantees
            // every member of the cluster is visible after expanding.
            (m.getSource(SOURCE) as MapboxGLAny).getClusterLeaves(cid, Infinity, 0, (err: unknown, leaves: MapboxGLAny[]) => {
              if (err || !leaves?.length) return;
              const lngs = leaves.map((f: MapboxGLAny) => f.geometry.coordinates[0] as number);
              const lats = leaves.map((f: MapboxGLAny) => f.geometry.coordinates[1] as number);
              if (process.env.NODE_ENV !== "production") {
                // Manual QA helper: badge vs leaves vs what the eye can resolve.
                const positions = new Set(
                  leaves.map((f: MapboxGLAny) => {
                    const [lng, lat] = f.geometry.coordinates as [number, number];
                    // ~11m grid — stacked/near-identical pins collapse for the eye.
                    return `${lng.toFixed(4)},${lat.toFixed(4)}`;
                  }),
                );
                const propIds = leaves.map((f: MapboxGLAny) => String(f.properties?.id ?? ""));
                const uniquePropIds = new Set(propIds);
                const titles = leaves.map((f: MapboxGLAny) => String(f.properties?.title ?? ""));
                const diag = {
                  badge: leafCount,
                  leaves: leaves.length,
                  uniquePositions: positions.size,
                  uniquePropIds: uniquePropIds.size,
                  zoom: m.getZoom(),
                  titles,
                };
                // Use console.log so Default/Info filters in DevTools still show it.
                if (leaves.length !== leafCount || uniquePropIds.size < leaves.length) {
                  console.error("[map-density] cluster count anomaly", diag);
                } else if (positions.size < leaves.length) {
                  console.warn("[map-density] stacked pins (badge > visible dots)", diag);
                } else {
                  console.log("[map-density] cluster expand", diag);
                }
              }
              const sw: [number, number] = [Math.min(...lngs), Math.min(...lats)];
              const ne: [number, number] = [Math.max(...lngs), Math.max(...lats)];
              // Past donut band (z>8) so expand lands on individual pins, not re-clustered donuts.
              m.fitBounds([sw, ne], {
                padding: 80,
                maxZoom: 13,
                duration: 600,
              });
            });
          });
          clusterDomMarkers.current.set(
            `c-${cid}`,
            new mb.Marker({ element: el, anchor: "center" }).setLngLat(coords).addTo(m),
          );
        }
      }

      // Fan out coincident leaves so a badge of N can resolve to N visible pins
      // (shared representativePoint otherwise stacks them on one pixel).
      const spiderfyPoints: Array<{ id: number; lng: number; lat: number }> = [];
      for (const feat of pointFeats) {
        const coords = feat.geometry?.coordinates;
        if (!isValidLngLat(coords)) continue;
        const markerId = Number((feat.properties as Record<string, unknown> | null)?.id);
        if (!Number.isFinite(markerId)) continue;
        spiderfyPoints.push({ id: markerId, lng: coords[0], lat: coords[1] });
      }
      const displayLngLat = spiderfyCoincidentLngLats(spiderfyPoints);
      const nextDisplay = new Map<number, [number, number]>();
      for (const [id, ll] of displayLngLat) {
        const numericId = Number(id);
        if (!Number.isFinite(numericId)) continue;
        nextDisplay.set(numericId, [ll[0], ll[1]]);
      }
      // Also record non-spiderfied singles so projectMarker can prefer them.
      for (const feat of pointFeats) {
        const rawCoords = feat.geometry?.coordinates;
        if (!isValidLngLat(rawCoords)) continue;
        const markerId = Number((feat.properties as Record<string, unknown> | null)?.id);
        if (!Number.isFinite(markerId) || nextDisplay.has(markerId)) continue;
        nextDisplay.set(markerId, [rawCoords[0], rawCoords[1]]);
      }
      displayLngLatRef.current = nextDisplay;

      for (const feat of pointFeats) {
        const rawCoords = feat.geometry?.coordinates;
        if (!isValidLngLat(rawCoords)) continue;
        const props  = feat.properties as Record<string, unknown>;
        const markerId = Number(props.id);
        if (!Number.isFinite(markerId)) continue;
        const coords = displayLngLat.get(markerId) ?? rawCoords;
        const trust = props.location_trust as string;
        const pinRoleRaw = props.location_pin_role;
        // Stem-capable on every basemap — flat until pitch > 45°, then grows.
        // Pass the raw GeoJSON value so unknown roles fail closed (allowlist).
        const elevated = shouldElevatePointPin({
          locationPinRole: pinRoleRaw,
        });
        const elevationFactor = elevated
          ? pinElevationFactor(
              typeof m.getPitch === "function" ? m.getPitch() : 0,
            )
          : 0;
        const isCrisisMarker = props.marker_kind === "crisis";
        const el = buildPointEl(props.severity as string, {
          locationTrust:
            trust === "challenged" || trust === "correction_queued"
              ? trust
              : undefined,
          locationPinRole: parseLocationPinRole(pinRoleRaw),
          // Glyphs only in the point density band — Country/donut keeps severity discs.
          iconSlug:
            mode === "point" &&
            typeof props.icon_slug === "string" &&
            props.icon_slug
              ? props.icon_slug
              : undefined,
          elevated,
          elevationFactor,
        });
        // Crisis markers get enhanced visual weight
        if (isCrisisMarker) {
          el.classList.add("crisis-marker");
        }
        el.style.opacity = String(markerOpacityForZoom(m.getZoom()));
        // Pick mode: block pin clicks even after pan/zoom rebuilds markers.
        if (locationPickActiveRef.current) {
          el.style.pointerEvents = "none";
        }
        if (hoveredMarkerIdRef.current != null && markerId === hoveredMarkerIdRef.current) {
          el.querySelector(".marker-ping-ring")?.classList.add("active");
          el.querySelector(".marker-dot")?.classList.add("active");
        }
        el.addEventListener("click", () => {
          const found = markersDataRef.current.find((mk) => mk.id === markerId);
          if (!found) return;
          const projected = m.project(coords) as { x: number; y: number };
          const c = m.getCenter();
          onMarkerClickRef.current?.(found, { x: projected.x, y: projected.y }, {
            center: [c.lng, c.lat],
            zoom: m.getZoom(),
            pitch: m.getPitch?.() ?? 0,
            bearing: m.getBearing?.() ?? 0,
          });
        });
        el.addEventListener("mouseenter", () => {
          const found = markersDataRef.current.find((mk) => mk.id === markerId);
          if (found) onMarkerHoverRef.current?.(found);
        });
        el.addEventListener("mouseleave", () => {
          onMarkerHoverRef.current?.(null);
        });
        clusterDomMarkers.current.set(
          `p-${markerId}`,
          new mb.Marker({
            element: el,
            // Bottom = fixed ground contact while stem grows with pitch.
            anchor: elevated ? "bottom" : "center",
          }).setLngLat(coords).addTo(m),
        );
      }

      mountedMode = clusterDomMarkers.current.size > 0 ? mode : "none";
    };

    const syncDensityVisuals = (rebuildMarkers: boolean) => {
      const z = m.getZoom();
      const heatOp = heatmapOpacityForZoom(z);
      const markerOp = markerOpacityForZoom(z);
      setHeatOpacity(heatOp);
      setDomMarkerOpacity(markerOp);

      const wantMount = markersShouldMount(z);
      const mode = aggregationModeForZoom(z);
      // In the crossfade below the floor, settled mode is still "heatmap" but
      // markers must already be mounted (as donuts) so they can fade in.
      const renderMode: DensityAggregationMode =
        mode === "heatmap" ? "donut" : mode;

      if (!wantMount) {
        // Heatmap is already carrying the view — safe to drop DOM.
        if (clusterDomMarkers.current.size > 0) clearDomMarkers(false);
        mountedMode = "none";
        return;
      }

      const needsMount =
        rebuildMarkers ||
        mountedMode === "none" ||
        clusterDomMarkers.current.size === 0 ||
        mountedMode !== renderMode;

      if (needsMount) {
        renderMarkersForMode(renderMode);
        setDomMarkerOpacity(markerOp);
      }
    };

    const onZoomFrame = () => {
      zoomRaf = 0;
      // Opacity every frame; rebuild only when cluster tiles likely moved.
      syncDensityVisuals(false);
    };

    const scheduleZoomSync = () => {
      if (zoomRaf) return;
      zoomRaf = requestAnimationFrame(onZoomFrame);
    };

    const onZoomEnd = () => {
      syncDensityVisuals(true);
    };

    // sourcedata fires when cluster tiles finish computing - rebuild markers.
    const onSourceData = (e: MapboxGLAny) => {
      if (e.sourceId === SOURCE && e.isSourceLoaded) syncDensityVisuals(true);
    };

    m.on("zoom", scheduleZoomSync);
    m.on("zoomend", onZoomEnd);
    m.on("moveend", onZoomEnd);
    m.on("sourcedata", onSourceData);
    syncDensityVisuals(true);

    return () => {
      if (zoomRaf) cancelAnimationFrame(zoomRaf);
      clearDomMarkers(true);
      removeLayers();
      m.off("zoom", scheduleZoomSync);
      m.off("zoomend", onZoomEnd);
      m.off("moveend", onZoomEnd);
      m.off("sourcedata", onSourceData);
    };
  }, [markers, loaded, showMarkers, baseMapType]);

  // ── Marker hover pulse (synced from list) ────────────────────────────────
  useEffect(() => {
    hoveredMarkerIdRef.current = hoveredMarkerId ?? null;
    for (const [key, mk] of clusterDomMarkers.current) {
      if (!key.startsWith("p-")) continue;
      const id = Number(key.slice(2));
      const outerEl = (mk as MapboxGLAny).getElement() as HTMLElement;
      const ring = outerEl.querySelector(".marker-ping-ring");
      const dot  = outerEl.querySelector(".marker-dot");
      const on = hoveredMarkerId != null && id === hoveredMarkerId;
      ring?.classList.toggle("active", on);
      dot?.classList.toggle("active", on);
    }
  }, [hoveredMarkerId]);

  // ── NRC Sudan office centroids (HTML markers; separate from crisis pins) ─
  // Coordinates are city/locality centroids from NRC Sudan Annual Report 2025
  // — never treat as street-level premises.
  // Rebuild only when layer toggles / locale changes / map loads. Theme flips
  // paint borders in place (14 pins — avoid Mapbox tear-down on dark mode).
  const nrcOfficeMarkersRef = useRef<MapboxGLAny[]>([]);
  useEffect(() => {
    if (!map.current || !loaded || !mbRef.current) return;
    const mb = mbRef.current;
    const m = map.current;

    const clear = () => {
      for (const mk of nrcOfficeMarkersRef.current) {
        try {
          mk.remove();
        } catch {
          /* ignore */
        }
      }
      nrcOfficeMarkersRef.current = [];
    };

    clear();
    if (!showNrcLocations) return clear;

    const translate = tRef.current;
    const dark = isDarkRef.current;
    const centroidDisclaimer = translate("nrcOffices.centroidDisclaimer");

    for (const office of SUDAN_NRC_OFFICES) {
      const el = buildNrcOfficeMarkerElement(office, dark);
      const popupHtml = buildNrcOfficePopupHtml(office, {
        typeLabel: translate(`nrcOffices.types.${office.officeType}`),
        statusLabel: translate(`nrcOffices.statuses.${office.status}`),
        centroidDisclaimer,
      });
      const popup = new mb.Popup({ offset: 16, maxWidth: "280px" }).setHTML(popupHtml);
      const marker = new mb.Marker({ element: el })
        .setLngLat([office.longitude, office.latitude])
        .setPopup(popup)
        .addTo(m);
      nrcOfficeMarkersRef.current.push(marker);
    }

    return clear;
  }, [loaded, showNrcLocations, locale]);

  useEffect(() => {
    if (!showNrcLocations) return;
    for (const mk of nrcOfficeMarkersRef.current) {
      const root = mk.getElement?.() as HTMLElement | undefined;
      if (root) paintNrcOfficeMarkerTheme(root, isDark);
    }
  }, [isDark, showNrcLocations]);

  // ── Roads toggle (Mapbox style layers) ──────────────────────────────────
  // light-v11/dark-v11 draw roads camouflaged by design: 1-8% lightness off
  // the land color, 0.45px wide at z5 (0px for minor classes). Toggling
  // visibility alone therefore shows nothing - when roads are ON we also
  // boost color and width so the network actually reads. Satellite-streets
  // styles its own roads properly, so only visibility applies there.
  useEffect(() => {
    if (!map.current || !loaded) return;
    const m = map.current;
    const visibility = showRoads ? "visible" : "none";
    const boost = showRoads && baseMapType !== "satellite";
    // Corridor-first palette (docs/map-design.md): trunk corridors in warm
    // tan - the supply-route color - visible from the Country band (z5-8),
    // where "which corridor reaches this state" is the actual question.
    // Minor roads in neutral gray, fading in through the Area band.
    const corridorColor = isDark ? "hsl(33, 30%, 56%)" : "hsl(28, 35%, 44%)";
    const minorColor = isDark ? "hsl(0, 0%, 46%)" : "hsl(220, 6%, 70%)";
    const roadColor = [
      "match", ["get", "class"],
      ["motorway", "trunk", "primary"], corridorColor,
      minorColor,
    ];
    const byClass = (mtp: number, st: number, rest: number) =>
      ["match", ["get", "class"], ["motorway", "trunk", "primary"], mtp, ["secondary", "tertiary"], st, rest];
    // Width anchors per zoom band. First stop = country-band floor — same
    // zoom where heatmap yields to donuts (DENSITY_COUNTRY_BAND_MIN_ZOOM).
    const roadWidth = [
      "interpolate", ["exponential", 1.5], ["zoom"],
      DENSITY_COUNTRY_BAND_MIN_ZOOM, byClass(1.8, 0.6, 0),
      8,  byClass(2.4, 1.2, 0.4),
      11, byClass(3.0, 1.8, 1.0),
      14, byClass(4.5, 3.0, 2.0),
      16, byClass(7, 5, 3.5),
    ];
    const layers = m.getStyle().layers as Array<{ id: string; type: string }> | undefined;
    for (const layer of layers ?? []) {
      if (!isRoadLayerId(layer.id)) continue;
      try {
        m.setLayoutProperty(layer.id, "visibility", visibility);
        if (boost && layer.type === "line") {
          m.setPaintProperty(layer.id, "line-color", roadColor as never);
          m.setPaintProperty(layer.id, "line-width", roadWidth as never);
        }
      } catch { /* ignore */ }
    }
  }, [loaded, showRoads, isDark, baseMapType]);

  // ── LogIE Blockages (roads + bridges) — smoke / future #277 ─────────────
  useEffect(() => {
    if (!map.current || !loaded) return;
    const m = map.current;
    const SOURCE = "logie-blockages";
    const LINE_LAYER = "logie-blockages-line";
    const LINE_LAYER_STALE = "logie-blockages-line-stale";
    const LINE_HIT = "logie-blockages-line-hit";
    const POINT_LAYER = "logie-blockages-point";
    const HOVER_LAYERS = [LINE_HIT, LINE_LAYER, LINE_LAYER_STALE, POINT_LAYER];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mb = (window as unknown as { mapboxgl?: any }).mapboxgl;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let popup: any = null;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onMove = (e: any) => {
      const feats = m.queryRenderedFeatures(e.point, { layers: HOVER_LAYERS }) as Array<{
        properties?: Record<string, unknown>;
      }>;
      if (!feats.length) {
        popup?.remove();
        m.getCanvas().style.cursor = "";
        return;
      }
      m.getCanvas().style.cursor = "pointer";
      const p = feats[0]?.properties ?? {};
      const title = escapeHtml(String(p.label || p.name || "Access constraint"));
      const kind =
        p.feature_type === "bridge"
          ? "Bridge"
          : p.feature_type === "road"
            ? "Road"
            : "Segment";
      const status = escapeHtml(String(p.status ?? "—"));
      const ageRaw = p.age_days;
      const ageDays =
        typeof ageRaw === "number"
          ? ageRaw
          : typeof ageRaw === "string" && ageRaw !== ""
            ? Number(ageRaw)
            : null;
      const stale =
        p.stale === 1 ||
        p.stale === "1" ||
        (typeof ageDays === "number" &&
          !Number.isNaN(ageDays) &&
          ageDays >= BLOCKAGES_STALE_AFTER_DAYS);
      const freshness = (() => {
        if (p.status_as_of) {
          const day = String(p.status_as_of).slice(0, 10);
          if (ageDays == null || Number.isNaN(ageDays)) return `Status as of ${day}`;
          const ago =
            ageDays === 0
              ? "today"
              : ageDays === 1
                ? "1 day ago"
                : `${ageDays} days ago`;
          return `Status as of ${day} (${ago})`;
        }
        return "Status date unknown";
      })();
      const remark =
        typeof p.status_remark === "string" && p.status_remark.trim()
          ? escapeHtml(p.status_remark.trim().slice(0, 160))
          : null;
      // Colors only — chrome lives on `.mapboxgl-popup-content` (avoids white Mapbox default + nested card).
      const titleColor = isDark ? "#f8fafc" : "#0f172a";
      const secondary = isDark ? "#cbd5e1" : "#334155";
      const muted = isDark ? "#94a3b8" : "#64748b";
      const warn = isDark ? "#fbbf24" : "#b45309";
      const partner =
        (typeof p.source_label === "string" && p.source_label.trim()
          ? p.source_label.trim()
          : typeof p.source_name === "string" && p.source_name.trim()
            ? p.source_name.trim()
            : null);
      const partnerEsc = partner ? escapeHtml(partner) : null;
      const reliability =
        typeof p.source_reliability === "string" && p.source_reliability.trim()
          ? escapeHtml(p.source_reliability.trim())
          : null;
      const html = `
        <div style="padding:10px 12px;font-family:system-ui,-apple-system,sans-serif;min-width:180px;max-width:280px;color:${titleColor};">
          <div style="font-weight:700;font-size:13px;color:${titleColor};line-height:1.3;margin-bottom:6px;">${title}</div>
          <div style="font-size:11px;color:${secondary};margin-bottom:4px;">
            <span style="font-weight:600;">${kind}</span>
            <span style="opacity:0.55;"> · </span>
            <span>${status}</span>
          </div>
          <div style="font-size:10px;color:${stale ? warn : muted};font-weight:${stale ? 600 : 400};">
            ${escapeHtml(freshness)}
          </div>
          ${stale ? `<div style="font-size:10px;color:${warn};margin-top:4px;line-height:1.35;">Still probable this segment is constrained, but the LogIE status is ${ageDays != null && !Number.isNaN(ageDays) ? ageDays : `${BLOCKAGES_STALE_AFTER_DAYS}+`} days old and may no longer be accurate.</div>` : ""}
          ${remark && remark !== title ? `<div style="font-size:10px;color:${muted};margin-top:6px;line-height:1.4;">${remark}</div>` : ""}
          <div style="font-size:10px;color:${muted};margin-top:8px;padding-top:6px;border-top:1px solid ${isDark ? "rgba(148,163,184,0.25)" : "rgba(15,23,42,0.08)"};">
            Source: LogIE (WFP Logistics Cluster)${partnerEsc ? ` · ${partnerEsc}` : ""}
            ${reliability ? `<div style="margin-top:2px;">Reporter confidence: ${reliability}</div>` : ""}
          </div>
        </div>
      `;
      if (!popup && mb?.Popup) {
        popup = new mb.Popup({
          closeButton: false,
          closeOnClick: false,
          offset: 10,
          maxWidth: "280px",
          className: isDark
            ? "logie-blockages-popup logie-blockages-popup--dark"
            : "logie-blockages-popup logie-blockages-popup--light",
        });
      }
      popup?.setLngLat(e.lngLat).setHTML(html).addTo(m);
    };
    const onLeave = () => {
      popup?.remove();
      m.getCanvas().style.cursor = "";
    };

    const cleanup = () => {
      for (const id of HOVER_LAYERS) {
        m.off("mousemove", id, onMove);
        m.off("mouseleave", id, onLeave);
      }
      popup?.remove();
      popup = null;
      try { if (m.getLayer(LINE_LAYER)) m.removeLayer(LINE_LAYER); } catch { /* ignore */ }
      try { if (m.getLayer(LINE_LAYER_STALE)) m.removeLayer(LINE_LAYER_STALE); } catch { /* ignore */ }
      try { if (m.getLayer(LINE_HIT)) m.removeLayer(LINE_HIT); } catch { /* ignore */ }
      try { if (m.getLayer(POINT_LAYER)) m.removeLayer(POINT_LAYER); } catch { /* ignore */ }
      try { if (m.getSource(SOURCE)) m.removeSource(SOURCE); } catch { /* ignore */ }
      m.getCanvas().style.cursor = "";
    };

    cleanup();

    if (!showBlockages || !blockagesGeoJson?.features?.length) return;

    const styleLayers = m.getStyle().layers as Array<{ id: string; type: string }>;
    const beforeId = styleLayers.find((l) => l.type === "symbol")?.id;

    try {
      m.addSource(SOURCE, {
        type: "geojson",
        data: blockagesGeoJson as never,
      });

      // Status severity (road/bridge currstatus_physical). Coerce string props from Mapbox.
      const lineColor = [
        "match",
        ["to-number", ["get", "status_code"]],
        4, "#B91C1C", // Not Passable
        3, "#D97706", // Passable with restrictions / Damaged
        "#DC2626", // fallback
      ] as never;

      const isLine = [
        "in",
        ["geometry-type"],
        ["literal", ["LineString", "MultiLineString"]],
      ] as never;
      // GeoJSON props may arrive as number or string through Mapbox.
      const isStale = [
        "any",
        ["==", ["get", "stale"], 1],
        ["==", ["get", "stale"], "1"],
      ] as never;
      const isFresh = ["!", isStale] as never;

      // Wider invisible hit target so thin roads are easy to hover.
      m.addLayer(
        {
          id: LINE_HIT,
          type: "line",
          source: SOURCE,
          filter: isLine,
          paint: {
            "line-color": "#000000",
            "line-opacity": 0,
            "line-width": 14,
          },
          layout: { "line-cap": "round", "line-join": "round" },
        },
        beforeId,
      );

      m.addLayer(
        {
          id: LINE_LAYER,
          type: "line",
          source: SOURCE,
          filter: ["all", isLine, isFresh] as never,
          paint: {
            "line-color": lineColor,
            "line-width": [
              "interpolate", ["linear"], ["zoom"],
              4, 1.5,
              8, 3,
              12, 5,
            ],
            "line-opacity": 0.9,
          },
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
        },
        beforeId,
      );

      // Stale (≥15d): still painted, dashed + lower opacity — do not hide.
      m.addLayer(
        {
          id: LINE_LAYER_STALE,
          type: "line",
          source: SOURCE,
          filter: ["all", isLine, isStale] as never,
          paint: {
            "line-color": lineColor,
            "line-width": [
              "interpolate", ["linear"], ["zoom"],
              4, 1.25,
              8, 2.5,
              12, 4,
            ],
            "line-opacity": 0.45,
            "line-dasharray": [1.5, 1.5],
          },
          layout: {
            "line-cap": "round",
            "line-join": "round",
          },
        },
        beforeId,
      );

      // Bridges (and any Point leftovers) as circles.
      m.addLayer(
        {
          id: POINT_LAYER,
          type: "circle",
          source: SOURCE,
          filter: ["==", ["geometry-type"], "Point"],
          paint: {
            "circle-radius": [
              "interpolate", ["linear"], ["zoom"],
              4, 3,
              10, 6,
            ],
            "circle-color": lineColor,
            "circle-opacity": [
              "case",
              isStale,
              0.5,
              0.95,
            ],
            "circle-stroke-width": 1.5,
            "circle-stroke-color": isDark ? "#0f172a" : "#ffffff",
          },
        },
        beforeId,
      );

      for (const id of HOVER_LAYERS) {
        m.on("mousemove", id, onMove);
        m.on("mouseleave", id, onLeave);
      }
    } catch {
      /* style may be mid-swap */
    }

    return cleanup;
  }, [loaded, showBlockages, blockagesGeoJson, isDark]);

  // ── Seismic Signals (USGS earthquake epicenters) ────────────────────────
  useEffect(() => {
    if (!map.current || !loaded) return;
    const m = map.current;
    const SOURCE = "seismic-signals";
    const CLUSTER_LAYER = "seismic-cluster";
    const CLUSTER_COUNT_LAYER = "seismic-cluster-count";
    const UNCLUSTERED_LAYER = "seismic-unclustered";

    const cleanup = () => {
      try { if (m.getLayer(CLUSTER_COUNT_LAYER)) m.removeLayer(CLUSTER_COUNT_LAYER); } catch { /* ignore */ }
      try { if (m.getLayer(CLUSTER_LAYER)) m.removeLayer(CLUSTER_LAYER); } catch { /* ignore */ }
      try { if (m.getLayer(UNCLUSTERED_LAYER)) m.removeLayer(UNCLUSTERED_LAYER); } catch { /* ignore */ }
      try { if (m.getSource(SOURCE)) m.removeSource(SOURCE); } catch { /* ignore */ }
      removeShakeMapPaint(m, shakemapPaintIdsRef.current);
      shakemapHoverBoundRef.current.clear();
    };

    if (!showSeismicSignals) return;

    const styleLayers = m.getStyle().layers as Array<{ id: string; type: string }>;
    const beforeId = styleLayers.find((l) => l.type === "symbol")?.id;

    // Marker-only persistence: stay interactive while moving onto the popup,
    // then briefly hold (~700ms) and fade out so "More details" remains clickable.
    const POPUP_HOLD_MS = 700;
    const POPUP_FADE_MS = 220;
    const popup = new (window as any).mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      maxWidth: "300px",
    });
    let popupCloseTimer: ReturnType<typeof setTimeout> | null = null;
    let popupFadeTimer: ReturnType<typeof setTimeout> | null = null;

    const getPopupEl = () => popup.getElement?.() as HTMLElement | undefined;

    const cancelPopupClose = () => {
      if (popupCloseTimer) clearTimeout(popupCloseTimer);
      if (popupFadeTimer) clearTimeout(popupFadeTimer);
      popupCloseTimer = null;
      popupFadeTimer = null;
      const el = getPopupEl();
      if (el) {
        el.style.transition = "opacity 120ms ease-out";
        el.style.opacity = "1";
        el.style.pointerEvents = "auto";
      }
    };

    const fadeOutPopup = () => {
      const el = getPopupEl();
      if (!el) {
        popup.remove();
        return;
      }
      el.style.pointerEvents = "none";
      el.style.transition = `opacity ${POPUP_FADE_MS}ms ease-out`;
      el.style.opacity = "0";
      popupFadeTimer = setTimeout(() => {
        popup.remove();
        popupFadeTimer = null;
      }, POPUP_FADE_MS);
    };

    const schedulePopupClose = () => {
      cancelPopupClose();
      popupCloseTimer = setTimeout(fadeOutPopup, POPUP_HOLD_MS);
    };

    const makePopupInteractive = () => {
      const element = getPopupEl();
      if (!element) return;
      element.style.opacity = "1";
      element.style.pointerEvents = "auto";
      if (element.dataset.seismicInteractive === "true") return;
      element.dataset.seismicInteractive = "true";
      element.addEventListener("mouseenter", cancelPopupClose);
      element.addEventListener("mouseleave", schedulePopupClose);
    };

    try {
      m.addSource(SOURCE, {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      // Cluster circles (magnitude-based size from cluster properties)
      m.addLayer({
        id: CLUSTER_LAYER,
        type: "circle",
        source: SOURCE,
        filter: ["has", "point_count"],
        paint: {
          "circle-color": [
            "step",
            ["get", "point_count"],
            "#FFA500", // orange for small clusters
            10,
            "#FF6B00", // darker orange for medium
            25,
            "#FF4500", // red-orange for large
          ],
          "circle-radius": [
            "step",
            ["get", "point_count"],
            15, // small
            10,
            20, // medium
            25,
            25, // large
          ],
          "circle-stroke-width": 2,
          "circle-stroke-color": "#fff",
          "circle-opacity": 0.8,
        },
      }, beforeId);

      // Cluster count labels
      m.addLayer({
        id: CLUSTER_COUNT_LAYER,
        type: "symbol",
        source: SOURCE,
        filter: ["has", "point_count"],
        layout: {
          "text-field": "{point_count_abbreviated}",
          "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
          "text-size": 12,
        },
        paint: {
          "text-color": "#fff",
        },
      }, beforeId);

      // Individual earthquake epicenters
      // ShakeMap epicenters: prominent red circles (center of shockwave)
      // Others: color by PAGER alert level
      m.addLayer({
        id: UNCLUSTERED_LAYER,
        type: "circle",
        source: SOURCE,
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": [
            "case",
            ["==", ["get", "has_shakemap"], true], "#DC2626", // Bright red for ShakeMap epicenter
            ["==", ["get", "alert"], "red"], "#DC2626",
            ["==", ["get", "alert"], "orange"], "#F97316",
            ["==", ["get", "alert"], "yellow"], "#FBBF24",
            ["==", ["get", "alert"], "green"], "#10B981",
            "#9CA3AF", // gray for no alert
          ],
          "circle-radius": [
            "case",
            ["==", ["get", "has_shakemap"], true], 12, // Larger for ShakeMap epicenter (center of shockwave)
            [
              "interpolate", ["linear"], ["get", "mag"],
              3, 5,   // M3 → 5px
              5, 8,   // M5 → 8px
              7, 12,  // M7 → 12px
              9, 16,  // M9 → 16px
            ],
          ],
          "circle-stroke-width": [
            "case",
            ["==", ["get", "has_shakemap"], true], 4, // Thick border for epicenter
            2,
          ],
          "circle-stroke-color": "#fff",
          "circle-opacity": [
            "*",
            ["coalesce", ["get", "transition_opacity"], 1],
            [
              "case",
              ["==", ["get", "has_shakemap"], true], 1,
              ["==", ["get", "stale"], 1], 0.5,
              0.7,
            ],
          ],
        },
      }, beforeId);

      m.on("mouseenter", UNCLUSTERED_LAYER, (e: any) => {
        cancelPopupClose();
        m.getCanvas().style.cursor = "pointer";
        const coords = e.features?.[0]?.geometry?.coordinates as [number, number];
        const props = e.features?.[0]?.properties as Record<string, any>;
        if (!coords || !props) return;

        const mag = escapeHtml(props.mag ? `M ${props.mag}` : "Unknown magnitude");
        const place = escapeHtml(String(props.place || "Unknown location"));
        const depth = props.depth_km != null ? escapeHtml(`${props.depth_km} km depth`) : "";
        const alert = props.alert ? escapeHtml(`PAGER: ${props.alert}`) : "";
        const age = props.age_days != null ? escapeHtml(`${props.age_days} days ago`) : "";
        const url = typeof props.url === "string" && /^https:\/\//.test(props.url)
          ? escapeHtml(props.url)
          : "";

        const html = `
          <div style="font-size: 12px; line-height: 1.4;">
            <strong style="color: #DC2626; font-size: 14px;">${mag}</strong><br/>
            <span style="color: #6B7280;">${place}</span>
            ${depth ? `<br/><span style="color: #9CA3AF;">${depth}</span>` : ""}
            ${alert ? `<br/><span style="color: #F97316;">${alert}</span>` : ""}
            ${age ? `<br/><span style="color: #9CA3AF;">${age}</span>` : ""}
            ${url ? `<br/><a href="${url}" target="_blank" rel="noopener noreferrer" style="display: inline-block; margin-top: 8px; color: #2563EB; font-weight: 600; text-decoration: underline;">More details</a>` : ""}
          </div>
        `;

        popup.setLngLat(coords).setHTML(html).addTo(m);
        makePopupInteractive();
      });

      m.on("mouseleave", UNCLUSTERED_LAYER, () => {
        m.getCanvas().style.cursor = "";
        schedulePopupClose();
      });

      // Click to expand clusters
      m.on("click", CLUSTER_LAYER, (e: any) => {
        const features = m.queryRenderedFeatures(e.point, {
          layers: [CLUSTER_LAYER],
        });
        const clusterId = features[0]?.properties?.cluster_id;
        if (clusterId == null) return;

        const source = m.getSource(SOURCE) as any;
        source.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
          if (err) return;
          m.easeTo({
            center: features[0]!.geometry.coordinates as [number, number],
            zoom: zoom + 0.5,
          });
        });
      });

      m.on("mouseenter", CLUSTER_LAYER, () => {
        m.getCanvas().style.cursor = "pointer";
      });

      m.on("mouseleave", CLUSTER_LAYER, () => {
        m.getCanvas().style.cursor = "";
      });
    } catch (err) {
      console.error("[seismic-signals]", err);
      /* style may be mid-swap */
    }

    return () => {
      cancelPopupClose();
      popup.remove();
      cleanup();
    };
  }, [loaded, showSeismicSignals]);

  // ── ShakeMap + epicenter data (interpolate on timeframe/month change) ───
  useEffect(() => {
    if (!map.current || !loaded) return;
    const m = map.current;
    const SOURCE = "seismic-signals";
    const empty: SeismicMapCollection = {
      type: "FeatureCollection",
      features: [],
      shakemaps: [],
      meta: {
        source: "usgs-spike",
        feature_count: 0,
        min_magnitude: null,
        window_days: null,
        bbox: null,
        pulled_at: new Date().toISOString(),
        bytes_in: 0,
        bytes_out: 0,
        reduction_ratio: 1,
      },
    };

    const cancelAnim = () => {
      if (seismicAnimRef.current != null) {
        cancelAnimationFrame(seismicAnimRef.current);
        seismicAnimRef.current = null;
      }
    };

    if (!showSeismicSignals) {
      cancelAnim();
      seismicDisplayedRef.current = null;
      const src = m.getSource(SOURCE) as { setData?: (d: unknown) => void } | undefined;
      src?.setData?.({ type: "FeatureCollection", features: [] });
      removeShakeMapPaint(m, shakemapPaintIdsRef.current);
      shakemapHoverBoundRef.current.clear();
      shakemapPopupRef.current?.remove();
      return;
    }

    if (!shakemapPopupRef.current) {
      shakemapPopupRef.current = new (window as any).mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        maxWidth: "320px",
      });
    }
    const bandPopup = shakemapPopupRef.current;

    const styleLayers = (m.getStyle()?.layers ?? []) as Array<{ id: string; type: string }>;
    const beforeId = styleLayers.find((l) => l.type === "symbol")?.id;

    const bindBandHover = (layerId: string, color: string) => {
      if (shakemapHoverBoundRef.current.has(layerId)) return;
      shakemapHoverBoundRef.current.add(layerId);
      m.on("mouseenter", layerId, (e: any) => {
        m.getCanvas().style.cursor = "pointer";
        const coords = e.lngLat;
        const props = e.features?.[0]?.properties;
        if (!coords || !props) return;
        let distanceText = "";
        if (props.epicenterLng != null && props.epicenterLat != null) {
          const R = 6371;
          const dLat = ((props.epicenterLat - coords.lat) * Math.PI) / 180;
          const dLon = ((props.epicenterLng - coords.lng) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((coords.lat) * Math.PI / 180) *
              Math.cos((props.epicenterLat) * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          distanceText = `${Math.round(R * c)} km from epicenter`;
        }
        const mmi = props.mmi || 0;
        const mmiDesc =
          mmi >= 9 ? "Extreme shaking - widespread destruction" :
          mmi >= 8 ? "Severe shaking - heavy damage" :
          mmi >= 7 ? "Very strong shaking - considerable damage" :
          mmi >= 6 ? "Strong shaking - moderate damage" :
          mmi >= 5 ? "Moderate shaking - light damage" :
          mmi >= 4 ? "Light shaking - felt by most" :
          mmi >= 3 ? "Weak shaking - felt by some" :
          "Not felt or very weak";
        const mag = escapeHtml(props.mag ? `M ${props.mag}` : "Unknown magnitude");
        const place = escapeHtml(String(props.place || "Unknown location"));
        const depth = props.depth_km != null ? escapeHtml(`${props.depth_km} km depth`) : "";
        const coordsText = `${coords.lat.toFixed(4)}°, ${coords.lng.toFixed(4)}°`;
        const html = `
          <div style="font-size: 12px; line-height: 1.5;">
            <strong style="color: #DC2626; font-size: 14px;">${mag}</strong><br/>
            <span style="color: #6B7280;">${place}</span>
            ${depth ? `<br/><span style="color: #9CA3AF;">${depth}</span>` : ""}
            <br/>
            <div style="margin-top: 8px; padding: 6px; background: ${color}; border-radius: 4px; color: #000;">
              <strong>MMI ${mmi}</strong> — ${mmiDesc}
            </div>
            ${distanceText ? `<br/><span style="color: #9CA3AF;">${distanceText}</span>` : ""}
            <br/><span style="color: #9CA3AF; font-size: 11px;">${coordsText}</span>
          </div>
        `;
        bandPopup.setLngLat(coords).setHTML(html).addTo(m);
      });
      m.on("mouseleave", layerId, () => {
        m.getCanvas().style.cursor = "";
        bandPopup.remove();
      });
    };

    const paintShakeMaps = (collection: SeismicMapCollection | null) => {
      const nextIds = new Set<string>();
      const shakemaps = collection?.shakemaps ?? [];
      for (const shakemap of shakemaps) {
        const eventId = shakemap.eventId;
        const anchorId = shakemap.anchorId ?? eventId;
        const epicenter = collection?.features.find((f) => f.properties.id === anchorId);
        const epicenterCoords = epicenter?.geometry?.coordinates as [number, number] | undefined;
        const epicenterProps = (epicenter?.properties ?? {}) as Record<string, unknown>;
        const sorted = [...(shakemap.features ?? [])].sort(
          (a, b) => a.properties.value - b.properties.value,
        );
        for (const feature of sorted) {
          const mmiValue = feature.properties.value;
          const style = shakemapMmiStyle(mmiValue);
          const sourceId = `shakemap-${eventId}-${mmiValue}`;
          const layerId = `shakemap-band-${eventId}-${mmiValue}`;
          nextIds.add(layerId);
          nextIds.add(sourceId);
          const contourData = {
            type: "FeatureCollection",
            features: [{
              type: "Feature",
              properties: {
                mmi: mmiValue,
                eventId,
                mag: epicenterProps.mag,
                place: epicenterProps.place,
                depth_km: epicenterProps.depth_km,
                time: epicenterProps.time,
                alert: epicenterProps.alert,
                url: epicenterProps.url,
                epicenterLng: epicenterCoords?.[0],
                epicenterLat: epicenterCoords?.[1],
                transition_opacity: feature.properties.transition_opacity,
              },
              geometry: feature.geometry,
            }],
          };
          const existing = m.getSource(sourceId) as { setData?: (d: unknown) => void } | undefined;
          if (existing?.setData) {
            existing.setData(contourData);
          } else {
            m.addSource(sourceId, { type: "geojson", data: contourData as never });
            m.addLayer({
              id: layerId,
              type: "line",
              source: sourceId,
              paint: {
                "line-color": style.color,
                "line-width": style.width,
                "line-opacity": [
                  "*",
                  ["coalesce", ["get", "transition_opacity"], 1],
                  style.opacity,
                ],
                "line-blur": 4,
              },
            }, beforeId);
            bindBandHover(layerId, style.color);
          }
        }
      }
      for (const id of [...shakemapPaintIdsRef.current]) {
        if (nextIds.has(id)) continue;
        try { if (m.getLayer(id)) m.removeLayer(id); } catch { /* ignore */ }
        try { if (m.getSource(id)) m.removeSource(id); } catch { /* ignore */ }
        shakemapHoverBoundRef.current.delete(id);
      }
      shakemapPaintIdsRef.current = nextIds;
    };

    const applyCollection = (collection: SeismicMapCollection | null) => {
      seismicDisplayedRef.current = collection;
      const src = m.getSource(SOURCE) as { setData?: (d: unknown) => void } | undefined;
      src?.setData?.(collection ?? { type: "FeatureCollection", features: [] });
      paintShakeMaps(collection);
    };

    const to = (seismicSignalsGeoJson as SeismicMapCollection | null) ?? null;
    const from = seismicDisplayedRef.current;
    const fromHasPoints = !!from && from.features.length > 0;

    cancelAnim();

    if (!to || prefersReducedMotion() || !fromHasPoints) {
      applyCollection(to ? interpolateSeismicMapCollection(null, to, 1) : empty);
      return () => { cancelAnim(); };
    }

    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / SEISMIC_TRANSITION_MS);
      applyCollection(interpolateSeismicMapCollection(from, to, t));
      if (t < 1) seismicAnimRef.current = requestAnimationFrame(step);
      else seismicAnimRef.current = null;
    };
    seismicAnimRef.current = requestAnimationFrame(step);

    return () => {
      cancelAnim();
    };
  }, [loaded, showSeismicSignals, seismicSignalsGeoJson]);

  // ── Population choropleth (A2 districts, independent layer) ─────────────
  useEffect(() => {
    if (!map.current || !loaded) return;
    const m = map.current;
    const SOURCE = "population-boundaries";
    const FILL_LAYER = "population-fill";
    const LINE_LAYER = "population-line";

    const cleanup = () => {
      try { if (m.getLayer(LINE_LAYER)) m.removeLayer(LINE_LAYER); } catch { /* ignore */ }
      try { if (m.getLayer(FILL_LAYER)) m.removeLayer(FILL_LAYER); } catch { /* ignore */ }
      try { if (m.getSource(SOURCE)) m.removeSource(SOURCE); } catch { /* ignore */ }
    };

    cleanup();

    const features = paintablePopulationBoundaries
      .map((b) => ({
        type: "Feature" as const,
        properties: { name: b.name, id: b.id, population: parsePopulation(b.population) },
        geometry: b.geometry,
      }));

    if (features.length === 0) return;

    const styleLayers = m.getStyle().layers as Array<{ id: string; type: string }>;
    const beforeId = styleLayers.find((l) => l.type === "symbol")?.id;

    try {
      m.addSource(SOURCE, { type: "geojson", data: { type: "FeatureCollection", features } });

      // Choropleth fill: light -> dark blue scaled by population.
      m.addLayer({
        id: FILL_LAYER,
        type: "fill",
        source: SOURCE,
        paint: {
          "fill-color": [
            "case",
            ["==", ["get", "population"], 0],
            isDark ? "rgba(96,165,250,0.18)" : "rgba(191,219,254,0.25)",
            [
              "interpolate", ["linear"], ["get", "population"],
              1,       "#EFF7FF",
              10000,   "#BDD7EE",
              100000,  "#6AAED6",
              300000,  "#2F8ABE",
              600000,  "#0C5FA0",
              1200000, "#08306B",
            ],
          ],
          "fill-opacity": 0.8,
        },
      }, beforeId);

      // Thin district lines for readability.
      m.addLayer({
        id: LINE_LAYER,
        type: "line",
        source: SOURCE,
        paint: {
          "line-color": isDark ? "#FB923C" : "#C2410C",
          "line-width": 0.9,
          "line-opacity": 0.75,
        },
      }, beforeId);
    } catch { /* ignore */ }

    return cleanup;
  }, [isDark, paintablePopulationBoundaries, loaded]);

  // ── Hide country highlight fill when population layer or region highlight is active ──
  useEffect(() => {
    if (!map.current || !loaded) return;
    const m = map.current;
    try {
      if (m.getLayer("focus-highlight-fill")) {
        const hide = paintablePopulationBoundaries.length > 0 || !!fitBoundsGeometry;
        m.setPaintProperty("focus-highlight-fill", "fill-opacity", hide ? 0 : 0.35);
      }
    } catch { /* ignore */ }
  }, [paintablePopulationBoundaries, fitBoundsGeometry, loaded]);

  // ── Admin boundary polygons (A1 / A2 from backend) ─────────────────────
  useEffect(() => {
    if (!map.current || !loaded) return;
    const m = map.current;
    const ADMIN_SOURCE = "admin-boundaries";

    const cleanup = () => {
      try { if (m.getLayer("admin-boundaries-line")) m.removeLayer("admin-boundaries-line"); } catch { /* ignore */ }
      try { if (m.getSource(ADMIN_SOURCE)) m.removeSource(ADMIN_SOURCE); } catch { /* ignore */ }
    };

    cleanup();
    
    // Early exit if boundaries are hidden
    if (!showBoundaries) return;

    const features = paintableAdminBoundaries
      .map((b) => ({ type: "Feature" as const, properties: { name: b.name, id: b.id }, geometry: b.geometry }));

    if (features.length === 0) return;

    const isA2 = adminBoundaryLevel === 2;
    // Contrast against the basemap, not the app theme - satellite imagery
    // is always dark.
    const overlayOnDark = baseMapType === "satellite" || isDark;
    const lineColor = overlayOnDark ? "#60A5FA" : "#1D4ED8";
    const lineWidth = isA2 ? 1 : 1.5;
    const lineOpacity = isA2 ? 0.7 : 0.85;

    const styleLayers = m.getStyle().layers as Array<{ id: string; type: string }>;
    const beforeId = styleLayers.find((l) => l.type === "symbol")?.id;

    try {
      m.addSource(ADMIN_SOURCE, {
        type: "geojson",
        data: { type: "FeatureCollection", features },
      });
      m.addLayer({ id: "admin-boundaries-line", type: "line", source: ADMIN_SOURCE,
        paint: { "line-color": lineColor, "line-width": lineWidth, "line-opacity": lineOpacity } }, beforeId);
    } catch { /* ignore */ }

    return cleanup;
  }, [paintableAdminBoundaries, adminBoundaryLevel, loaded, showBoundaries, isDark, baseMapType]);

  // ── Regions (heatmap from signalPoints if present, else feathered fill) ─
  const regionLayerIds = useRef<string[]>([]);
  const regionMarkerRefs = useRef<MapboxGLAny[]>([]);

  useEffect(() => {
    if (!map.current || !loaded || !mbRef.current) return;
    const m = map.current;

    // Cleanup previous.
    for (const layerId of regionLayerIds.current) {
      for (const suffix of ["", "-outline-glow", "-outline", "-heat"]) {
        try { if (m.getLayer(`${layerId}${suffix}`)) m.removeLayer(`${layerId}${suffix}`); } catch { /* ignore */ }
      }
      try { if (m.getSource(layerId)) m.removeSource(layerId); } catch { /* ignore */ }
      try { if (m.getSource(`${layerId}-heat`)) m.removeSource(`${layerId}-heat`); } catch { /* ignore */ }
    }
    regionLayerIds.current = [];
    for (const rm of regionMarkerRefs.current) rm.remove();
    regionMarkerRefs.current = [];

    regions.forEach((region, idx) => {
      const sourceId = `region-${region.id}-${idx}`;
      const color = severityColors[region.severity] ?? "#6E7F9B";
      const hasHeatmap = !!region.signalPoints && region.signalPoints.length > 0;

      // Always add the polygon source for the outline/feathered fill.
      m.addSource(sourceId, {
        type: "geojson",
        data: { type: "Feature", properties: { title: region.title }, geometry: region.geometry },
      });

      if (hasHeatmap) {
        // Heatmap from signal points inside the region.
        const heatSource = `${sourceId}-heat`;
        m.addSource(heatSource, {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: region.signalPoints!.map((pt) => ({
              type: "Feature",
              properties: {},
              geometry: { type: "Point", coordinates: [pt.lng, pt.lat] },
            })),
          },
        });
        m.addLayer({
          id: `${sourceId}-heat`,
          type: "heatmap",
          source: heatSource,
          paint: {
            "heatmap-weight": 1,
            "heatmap-intensity": [
              "interpolate", ["linear"], ["zoom"],
              0, 1,
              9, 3,
            ],
            "heatmap-color": [
              "interpolate", ["linear"], ["heatmap-density"],
              0,   "rgba(0,0,0,0)",
              0.2, hexToRgba(color, 0.2),
              0.5, hexToRgba(color, 0.4),
              0.8, hexToRgba(color, 0.7),
              1,   hexToRgba(color, 0.95),
            ],
            "heatmap-radius": [
              "interpolate", ["linear"], ["zoom"],
              0, 15,
              9, 45,
            ],
            "heatmap-opacity": 0.85,
          },
        });
      } else {
        // Feathered fill (very subtle) for regions without signal points.
        m.addLayer({
          id: sourceId,
          type: "fill",
          source: sourceId,
          paint: {
            "fill-color": color,
            "fill-opacity": 0.08,
          },
        });
      }

      // Soft outer glow + crisp outline, for both cases.
      m.addLayer({
        id: `${sourceId}-outline-glow`,
        type: "line",
        source: sourceId,
        paint: {
          "line-color": color,
          "line-width": 6,
          "line-blur": 4,
          "line-opacity": 0.25,
        },
      });
      m.addLayer({
        id: `${sourceId}-outline`,
        type: "line",
        source: sourceId,
        paint: {
          "line-color": color,
          "line-width": 1.5,
          "line-opacity": 0.7,
          "line-dasharray": [4, 2],
        },
      });

      regionLayerIds.current.push(sourceId);
    });

    return () => {
      if (!map.current) return;
      for (const layerId of regionLayerIds.current) {
        for (const suffix of ["", "-outline-glow", "-outline", "-heat"]) {
          try { if (map.current.getLayer(`${layerId}${suffix}`)) map.current.removeLayer(`${layerId}${suffix}`); } catch { /* ignore */ }
        }
        try { if (map.current.getSource(layerId)) map.current.removeSource(layerId); } catch { /* ignore */ }
        try { if (map.current.getSource(`${layerId}-heat`)) map.current.removeSource(`${layerId}-heat`); } catch { /* ignore */ }
      }
      regionLayerIds.current = [];
      for (const rm of regionMarkerRefs.current) {
        try { rm.remove(); } catch { /* ignore */ }
      }
      regionMarkerRefs.current = [];
    };
  }, [regions, loaded]);

  // Sidebar collapse / flex layout changes grow the container without a window
  // resize — Mapbox keeps the old canvas width unless we call resize().
  // Debounce past the nav width transition (200ms) so we don't resize every
  // animation frame (that blanks satellite tiles mid-reflow).
  useEffect(() => {
    if (!loaded || !mapContainer.current || !map.current) return;
    const el = mapContainer.current;
    let timer = 0;
    const ro = new ResizeObserver(() => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = 0;
        try {
          map.current?.resize();
          onMapMoveRef.current?.();
        } catch {
          /* ignore */
        }
      }, 220);
    });
    ro.observe(el);
    return () => {
      ro.disconnect();
      if (timer) window.clearTimeout(timer);
    };
  }, [loaded]);

  // Expose project helpers for overlays (spaghetti connectors on /map).
  useEffect(() => {
    if (!mapApiRef) return;
    if (!loaded) {
      mapApiRef.current = null;
      return;
    }
    mapApiRef.current = {
      projectMarker: (id, lng, lat) => {
        const m = map.current;
        if (!m) return null;
        const mounted = clusterDomMarkers.current.get(`p-${id}`);
        if (mounted?.getLngLat) {
          const ll = mounted.getLngLat() as { lng: number; lat: number };
          const p = m.project([ll.lng, ll.lat]) as { x: number; y: number };
          return { x: p.x, y: p.y };
        }
        const display = displayLngLatRef.current.get(id);
        const coords = display ?? ([lng, lat] as [number, number]);
        if (!Number.isFinite(coords[0]) || !Number.isFinite(coords[1])) return null;
        const p = m.project(coords) as { x: number; y: number };
        return { x: p.x, y: p.y };
      },
      samplePointAltitude: (lng, lat) => samplePointAltitude(map.current, lng, lat),
      getViewCamera: () => {
        const m = map.current;
        if (!m) return null;
        const c = m.getCenter();
        return {
          center: [c.lng, c.lat],
          zoom: m.getZoom(),
          pitch: m.getPitch?.() ?? 0,
          bearing: m.getBearing?.() ?? 0,
        };
      },
      restoreViewCamera: (camera) => {
        const m = map.current;
        if (!m) return;
        try {
          m.jumpTo({
            center: camera.center,
            zoom: camera.zoom,
            pitch: camera.pitch,
            bearing: camera.bearing,
          });
        } catch {
          /* ignore */
        }
      },
    };
    return () => {
      mapApiRef.current = null;
    };
  }, [loaded, mapApiRef]);

  // Location-correction pick: map click + crosshair; pins don't steal the click.
  useEffect(() => {
    const m = map.current;
    if (!m || !loaded) return;
    const onClick = (e: { lngLat: { lng: number; lat: number } }) => {
      if (!locationPickActiveRef.current) return;
      onMapClickRef.current?.({ lng: e.lngLat.lng, lat: e.lngLat.lat });
    };
    m.on("click", onClick);
    return () => {
      try { m.off("click", onClick); } catch { /* ignore */ }
    };
  }, [loaded]);

  useEffect(() => {
    const m = map.current;
    if (!m || !loaded) return;
    try {
      m.getCanvas().style.cursor = locationPickActive ? "crosshair" : "";
    } catch { /* ignore */ }
    for (const mk of clusterDomMarkers.current.values()) {
      try {
        const el = (mk as MapboxGLAny).getElement?.() as HTMLElement | undefined;
        if (el) el.style.pointerEvents = locationPickActive ? "none" : "auto";
      } catch { /* ignore */ }
    }
  }, [locationPickActive, loaded, markers]);

  if (!MAPBOX_TOKEN) {
    return (
      <div
        className={`bg-bg-muted border border-border flex items-center justify-center text-text-muted text-sm ${className ?? ""}`}
      >
        {t("tokenMissing")}
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes marker-ping {
          0%   { transform: scale(1);   opacity: 0.8; }
          100% { transform: scale(4.5); opacity: 0;   }
        }
        @keyframes marker-dot-pulse {
          0%   { transform: scale(1);    }
          50%  { transform: scale(1.18); }
          100% { transform: scale(1);    }
        }
        @keyframes crisis-marker-pulse {
          0%   { transform: scale(1); box-shadow: 0 0 0 0 currentColor; }
          50%  { transform: scale(1.25); box-shadow: 0 0 8px 2px currentColor; }
          100% { transform: scale(1); box-shadow: 0 0 0 0 currentColor; }
        }
        .marker-ping-ring.active {
          animation: marker-ping 1.1s cubic-bezier(0, 0, 0.4, 1) infinite;
        }
        .marker-dot.active {
          animation: marker-dot-pulse 1.1s ease-in-out infinite;
          z-index: 10 !important;
        }
        /* Crisis marker enhancements — overflow visible so stems are not clipped */
        .crisis-marker {
          overflow: visible;
        }
        .crisis-marker .marker-dot {
          filter: brightness(1.1) saturate(1.15);
        }
        .crisis-marker:hover .marker-dot {
          transform: scale(1.15);
          filter: brightness(1.2) saturate(1.25) drop-shadow(0 2px 6px rgba(0,0,0,0.3));
          transition: all 0.2s ease-out;
        }
        .crisis-marker .marker-dot.active {
          animation: crisis-marker-pulse 1.4s ease-in-out infinite;
          z-index: 15 !important;
        }
        .crisis-marker .marker-ping-ring.active {
          opacity: 0.9;
        }
        /* Keep GL clear transparent so container basemap color shows if frames drop */
        .mapboxgl-canvas { background: transparent !important; }
        .mapboxgl-marker { overflow: visible; }
        /* Topography: hide grab hand only while the probe is over terrain.
           Over pitched sky we restore the system cursor so filters/menus
           stay easy to reach. Inline cursor:pointer from markers/blockages
           still overrides when set. */
        .topography-altitude-probe-active .mapboxgl-canvas-container.mapboxgl-interactive,
        .topography-altitude-probe-active .mapboxgl-canvas {
          cursor: none;
        }
        [data-testid="point-altitude-probe"] {
          transition: opacity 140ms ease;
        }
      `}</style>
      <div
        ref={mapShellRef}
        className={className}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          // Match basemap lightness so a brief WebGL clear never flashes
          // light chrome under dark satellite imagery. Topography uses the
          // same shell as Simple — no separate dark globe palette.
          background:
            baseMapType === "satellite"
              ? "#0a0a0a"
              : isDark
                ? "#111111"
                : "#FAFAFA",
          // Promote canvas without `isolation: isolate` — isolation blocks
          // sidebar/panel backdrop-filter from sampling Mapbox WebGL.
          transform: "translateZ(0)",
        }}
      >
        <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />
        {showTiltHint && (
          <div
            role="status"
            data-testid="topography-tilt-hint"
            style={{
              // Above map chrome siblings (filters/panel bar are z-20 on /map).
              position: "absolute",
              top: "max(72px, 12%)",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 40,
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              gap: 8,
              maxWidth: "min(400px, calc(100% - 24px))",
              padding: "12px 14px",
              borderRadius: 12,
              border: "1px solid var(--color-border-dark)",
              background: isDark
                ? "rgba(17, 17, 17, 0.88)"
                : "rgba(250, 250, 250, 0.92)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              color: "var(--color-text-primary)",
              fontSize: 13,
              fontWeight: 500,
              lineHeight: 1.4,
              boxShadow: "0 8px 28px rgba(0,0,0,0.18)",
              pointerEvents: "auto",
            }}
          >
            <span style={{ minWidth: 0 }}>{t("tiltHint.message")}</span>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={onDismissTiltHint}
                aria-label={t("tiltHint.dismiss")}
                style={{
                  border: "1px solid var(--color-border-dark)",
                  background: "transparent",
                  color: "var(--color-text-muted)",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  padding: "6px 10px",
                  borderRadius: 8,
                }}
              >
                {t("tiltHint.dismiss")}
              </button>
              <button
                type="button"
                onClick={onTiltFromHint}
                data-testid="topography-tilt-hint-action"
                style={{
                  border: "none",
                  background: "var(--color-accent)",
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "6px 12px",
                  borderRadius: 8,
                }}
              >
                {t("tiltHint.tilt")}
              </button>
            </div>
          </div>
        )}
        {showAltitudeProbe && (
          <div
            ref={altitudeProbeElRef}
            role="status"
            data-testid="point-altitude-probe"
            aria-hidden
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              zIndex: 25,
              // Anchor the orange dot on the ground point; label hangs below.
              transform: "translate(-50%, -50%)",
              width: 8,
              height: 8,
              opacity: 0,
              pointerEvents: "none",
              userSelect: "none",
              transition: "opacity 140ms ease",
            }}
          >
            <span
              aria-hidden
              style={{
                display: "block",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#EA580C",
                boxShadow:
                  "0 0 0 2px rgba(255,255,255,0.9), 0 1px 4px rgba(0,0,0,0.35)",
              }}
            />
            <span
              ref={altitudeProbeLabelRef}
              style={{
                position: "absolute",
                top: 12,
                left: "50%",
                transform: "translateX(-50%)",
                padding: "1px 5px",
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 700,
                fontVariantNumeric: "tabular-nums",
                letterSpacing: "0.01em",
                color: "#fff",
                background: "rgba(0,0,0,0.55)",
                textShadow: "0 1px 2px rgba(0,0,0,0.45)",
                whiteSpace: "nowrap",
              }}
            />
          </div>
        )}
      </div>
    </>
  );
}
