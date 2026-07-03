"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { api } from "~/trpc/react";
import { geometryBounds } from "~/lib/geo/country-mask";
import { useIsDark } from "~/hooks/use-is-dark";

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
  className?: string;
  onMarkerClick?: (marker: MapMarker) => void;
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
  /** Enable WebGL canvas readback for print snapshots. Has a small GPU memory cost. */
  preserveDrawingBuffer?: boolean;
  /** Duration (ms) for programmatic flyTo when center/zoom props change. */
  flyDuration?: number;
  /** Show/hide boundaries layer */
  showBoundaries?: boolean;
  /** Show/hide markers layer */
  showMarkers?: boolean;
  /** Show/hide roads layer */
  showRoads?: boolean;
  /** Toggle satellite imagery base map */
  showSatellite?: boolean;
}

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

const SEVERITY_ORDER = ["critical", "high", "medium", "low"] as const;

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
  const total = props.point_count ?? 0;
  const size  = total < 10 ? 40 : total < 50 ? 46 : total < 200 ? 52 : 58;
  const outerR = size / 2 - 2;
  const innerR = outerR * 0.58;
  const cx = size / 2, cy = size / 2;

  const segments = SEVERITY_ORDER
    .map((s) => ({ color: severityColors[s], count: Math.max(0, props[s] ?? 0) }))
    .filter((s) => s.count > 0);

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

  const fontSize = size < 44 ? 11 : size < 50 ? 12 : 13;
  const label = total > 999 ? "999+" : String(total);

  const el = document.createElement("div");
  el.style.cssText = `cursor:pointer;width:${size}px;height:${size}px;filter:drop-shadow(0 2px 5px rgba(0,0,0,0.22));`;
  el.innerHTML = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    ${arcs}
    <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" fill="#1F2937" font-weight="700" font-size="${fontSize}" font-family="system-ui,-apple-system,sans-serif">${label}</text>
  </svg>`;
  return el;
}

function buildPointEl(severity: string): HTMLDivElement {
  const color = severityColors[severity] ?? "#737373";
  const size  = severity === "critical" ? 18 : severity === "high" ? 16 : 14;
  // Outer: Mapbox sets its positioning transform here - do not animate this element.
  const outer = document.createElement("div");
  outer.style.cssText = `width:${size}px;height:${size}px;cursor:pointer;`;
  // Radar ping ring: expands outward in marker color, hidden until active.
  const ring = document.createElement("div");
  ring.className = "marker-ping-ring";
  ring.style.cssText = `position:absolute;inset:0;border-radius:50%;border:2.5px solid ${color};opacity:0;pointer-events:none;`;
  // Inner dot: the colored circle, safe to scale independently.
  const inner = document.createElement("div");
  inner.className = "marker-dot";
  inner.style.cssText = `width:100%;height:100%;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);`;
  outer.appendChild(ring);
  outer.appendChild(inner);
  return outer;
}

// ── Component ────────────────────────────────────────────────────────────────

export function CrisisMap({
  markers = [],
  regions = [],
  center = [30, 14],
  zoom = 5.5,
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
  preserveDrawingBuffer = false,
  flyDuration = 1500,
  showBoundaries = true,
  showMarkers = true,
  showRoads = true,
  showSatellite = false,
}: CrisisMapProps) {
  const t = useTranslations("map");
  const isDark = useIsDark();
  
  // Calculate map style based on satellite and roads toggles
  const mapStyle = (() => {
    if (showSatellite) {
      // Satellite imagery - with or without roads
      return showRoads
        ? "mapbox://styles/mapbox/satellite-streets-v12"
        : "mapbox://styles/mapbox/satellite-v9";
    }
    // Regular street map - light or dark theme
    return isDark
      ? "mapbox://styles/mapbox/dark-v11"
      : "mapbox://styles/mapbox/light-v11";
  })();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<MapboxGLAny>(null);
  const mbRef = useRef<MapboxGLAny>(null);
  const onMarkerClickRef = useRef(onMarkerClick);
  const onMarkerHoverRef = useRef(onMarkerHover);
  useEffect(() => { onMarkerClickRef.current = onMarkerClick; }, [onMarkerClick]);
  useEffect(() => { onMarkerHoverRef.current = onMarkerHover; }, [onMarkerHover]);
  const clusterDomMarkers = useRef<Map<string, MapboxGLAny>>(new Map());
  const markersDataRef = useRef<MapMarker[]>(markers);
  const hoveredMarkerIdRef = useRef<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  // Tracks Mapbox built-in admin-1 layer IDs we've mutated so we can reset them.
  const admin1LayerIds = useRef<string[]>([]);

  // Fetch the focus country's geometry (only when requested).
  const focusQuery = api.locations.getCountryByPCode.useQuery(
    { pCode: focusCountryPCode, name: focusCountryName },
    {
      enabled: !!(focusCountryPCode || focusCountryName),
      staleTime: 1000 * 60 * 60,
    },
  );
  const focusCountry = focusQuery.data;

  // ── Map init ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainer.current || !MAPBOX_TOKEN) return;
    let cancelled = false;

    loadMapboxGL().then((mapboxgl) => {
      if (cancelled || !mapContainer.current) return;
      mbRef.current = mapboxgl;
      mapboxgl.accessToken = MAPBOX_TOKEN;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: mapStyle,
        center,
        zoom,
        interactive,
        preserveDrawingBuffer,
        attributionControl: false,
      });

      map.current.on("load", () => {
        if (!cancelled) setLoaded(true);
      });

      map.current.addControl(
        new mapboxgl.NavigationControl({ showCompass: false }),
        "bottom-right",
      );
    });

    return () => {
      cancelled = true;
      setLoaded(false);
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapStyle]);

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
    //   (1) mask + highlight fills render BELOW admin-1 lines, so state
    //       borders stay visible inside the focus country.
    //   (2) focus country border line renders ABOVE admin-1 but below
    //       label symbols, so the country outline stays crisp.
    const styleLayers = m.getStyle().layers as Array<{ id: string; type: string }>;
    const firstAdminLayer = styleLayers.find((l) =>
      l.id === "admin-1-boundary-bg" || l.id === "admin-0-boundary-bg",
    );
    const firstSymbolLayer = styleLayers.find((l) => l.type === "symbol");
    const fillBeforeId: string | undefined = firstAdminLayer?.id ?? firstSymbolLayer?.id;
    const borderBeforeId: string | undefined = firstSymbolLayer?.id;

    // Mapbox's public country polygons tileset (free with any token).
    m.addSource(COUNTRY_SOURCE, {
      type: "vector",
      url: "mapbox://mapbox.country-boundaries-v1",
    });

    // Mask over every country EXCEPT the focus.
    // Light: near-white wash. Dark: black overlay so non-focus areas recede further.
    m.addLayer(
      {
        id: "focus-mask-fill",
        type: "fill",
        source: COUNTRY_SOURCE,
        "source-layer": "country_boundaries",
        filter: ["!=", ["get", "iso_3166_1"], focusIso],
        paint: {
          "fill-color": isDark ? "#000000" : "#FFFFFF",
          "fill-opacity": isDark ? 0.55 : 0.9,
        },
      },
      fillBeforeId,
    );

    // Blue tint + border for the focus country.
    // Prefer our own DB geometry (accurate OCHA boundaries) over Mapbox's tileset.
    const highlightColor = isDark ? "#1E3A5F" : "#1E40AF";
    const highlightOpacity = isDark ? 0.45 : 0.35;
    const borderColor = isDark ? "#60A5FA" : "#1D4ED8";
    const borderWidth = isDark ? 1.5 : 1.25;
    const borderOpacity = isDark ? 0.9 : 0.85;

    if (focusCountryGeometry) {
      m.addSource(FOCUS_GEOJSON_SOURCE, {
        type: "geojson",
        data: { type: "Feature", geometry: focusCountryGeometry as never, properties: {} },
      });
      m.addLayer(
        { id: "focus-highlight-fill", type: "fill", source: FOCUS_GEOJSON_SOURCE,
          paint: { "fill-color": highlightColor, "fill-opacity": highlightOpacity } },
        fillBeforeId,
      );
      m.addLayer(
        { id: "focus-border-line", type: "line", source: FOCUS_GEOJSON_SOURCE,
          paint: { "line-color": borderColor, "line-width": borderWidth, "line-opacity": borderOpacity } },
        borderBeforeId,
      );
    } else {
      // Fallback: use Mapbox tileset (may have inaccurate boundaries for some countries).
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
        if (adminBoundaryLevel === 1 && (!adminBoundaries || adminBoundaries.length === 0)) {
          try {
            m.setFilter(layer.id, [
              "all",
              ["==", ["get", "admin_level"], 1],
              ["==", ["get", "maritime"], "false"],
              ["==", ["get", "iso_3166_1"], focusIso],
            ]);
            m.setLayerZoomRange(layer.id, 0, 24);
            m.setPaintProperty(layer.id, "line-color", isDark ? "#94A3B8" : "#475569");
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
  }, [focusIso, focusCountryGeometry, loaded, adminBoundaries, adminBoundaryLevel, isDark]);

  // Fit bounds to the focus country once its backend bbox is available.
  // Skips when fitBoundsGeometry is set (a more specific region is focused).
  useEffect(() => {
    if (!map.current || !loaded || !focusCountry || fitBoundsGeometry || !fitBoundsOnFocus) return;
    const bounds = geometryBounds(focusCountry.geometry as never);
    if (!bounds) return;
    map.current.fitBounds(
      [[bounds[0], bounds[1]], [bounds[2], bounds[3]]],
      { padding: 40, duration: 800 },
    );
  }, [focusCountry, loaded, fitBoundsGeometry, fitBoundsOnFocus]);

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
  useEffect(() => {
    if (!map.current || !loaded) return;
    // Skip flyTo when a focus country is driving the framing; let fitBounds own it.
    if (focusCountry) return;
    if (
      prevCenter.current[0] === center[0] &&
      prevCenter.current[1] === center[1] &&
      prevZoom.current === zoom
    ) return;
    prevCenter.current = center;
    prevZoom.current = zoom;
    map.current.flyTo({ center, zoom, duration: flyDuration });
  }, [center, zoom, loaded, focusCountry, flyDuration]);

  // ── Markers (donut cluster DOM markers) ─────────────────────────────────
  useEffect(() => {
    if (!map.current || !loaded) return;
    if (!showMarkers) {
      // Clear markers if showMarkers is false
      for (const mk of clusterDomMarkers.current.values()) {
        try { mk.remove(); } catch { /* ignore */ }
      }
      clusterDomMarkers.current.clear();
      const SOURCE = "crisis-markers";
      const CLUSTER_GHOST = "cluster-ghost";
      const POINT_GHOST = "point-ghost";
      for (const id of [CLUSTER_GHOST, POINT_GHOST]) {
        try { if (map.current.getLayer(id)) map.current.removeLayer(id); } catch { /* ignore */ }
      }
      try { if (map.current.getSource(SOURCE)) map.current.removeSource(SOURCE); } catch { /* ignore */ }
      return;
    }
    const m = map.current;
    const mb = mbRef.current;
    const SOURCE = "crisis-markers";
    const CLUSTER_GHOST = "cluster-ghost";
    const POINT_GHOST = "point-ghost";

    // Keep markersDataRef current for click handlers that close over it.
    markersDataRef.current = markers;

    const clearDomMarkers = () => {
      for (const mk of clusterDomMarkers.current.values()) {
        try { mk.remove(); } catch { /* ignore */ }
      }
      clusterDomMarkers.current.clear();
    };

    const removeLayers = () => {
      for (const id of [CLUSTER_GHOST, POINT_GHOST]) {
        try { if (m.getLayer(id)) m.removeLayer(id); } catch { /* ignore */ }
      }
      try { if (m.getSource(SOURCE)) m.removeSource(SOURCE); } catch { /* ignore */ }
    };

    clearDomMarkers();
    removeLayers();

    m.addSource(SOURCE, {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: markers.map((mk) => ({
          type: "Feature" as const,
          properties: {
            id: mk.id, title: mk.title, severity: mk.severity,
            type: mk.type ?? "", description: mk.description ?? "",
            marker_kind: mk.markerKind ?? "",
            is_critical: mk.severity === "critical" ? 1 : 0,
            is_high:     mk.severity === "high"     ? 1 : 0,
            is_medium:   mk.severity === "medium"   ? 1 : 0,
            is_low:      mk.severity === "low"      ? 1 : 0,
          },
          geometry: { type: "Point" as const, coordinates: [mk.lng, mk.lat] },
        })),
      },
      cluster: true,
      clusterMinPoints: 5,
      clusterMaxZoom: 8,
      clusterRadius: 30,
      clusterProperties: {
        critical: ["+", ["get", "is_critical"]],
        high:     ["+", ["get", "is_high"]],
        medium:   ["+", ["get", "is_medium"]],
        low:      ["+", ["get", "is_low"]],
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

    const update = () => {
      clearDomMarkers();

      const clusterFeats = m.queryRenderedFeatures({ layers: [CLUSTER_GHOST] }) as MapboxGLAny[];
      const pointFeats   = m.queryRenderedFeatures({ layers: [POINT_GHOST] })   as MapboxGLAny[];

      for (const feat of clusterFeats) {
        const coords = feat.geometry.coordinates as [number, number];
        const props  = feat.properties as Record<string, number>;
        const cid    = props.cluster_id;
        const el     = buildDonutEl(props);
        el.addEventListener("click", () => {
          // Fetch all leaves so we can fitBounds to the full set - guarantees
          // every member of the cluster is visible after expanding.
          (m.getSource(SOURCE) as MapboxGLAny).getClusterLeaves(cid, Infinity, 0, (err: unknown, leaves: MapboxGLAny[]) => {
            if (err || !leaves?.length) return;
            const lngs = leaves.map((f: MapboxGLAny) => f.geometry.coordinates[0] as number);
            const lats = leaves.map((f: MapboxGLAny) => f.geometry.coordinates[1] as number);
            const sw: [number, number] = [Math.min(...lngs), Math.min(...lats)];
            const ne: [number, number] = [Math.max(...lngs), Math.max(...lats)];
            m.fitBounds([sw, ne], { padding: 80, maxZoom: 13, duration: 600 });
          });
        });
        clusterDomMarkers.current.set(
          `c-${cid}`,
          new mb.Marker({ element: el, anchor: "center" }).setLngLat(coords).addTo(m),
        );
      }

      for (const feat of pointFeats) {
        const coords = feat.geometry.coordinates as [number, number];
        const props  = feat.properties as Record<string, unknown>;
        const el     = buildPointEl(props.severity as string);
        if (hoveredMarkerIdRef.current != null && (props.id as number) === hoveredMarkerIdRef.current) {
          el.querySelector(".marker-ping-ring")?.classList.add("active");
          el.querySelector(".marker-dot")?.classList.add("active");
        }
        el.addEventListener("click", () => {
          const found = markersDataRef.current.find((mk) => mk.id === (props.id as number));
          if (found) onMarkerClickRef.current?.(found);
        });
        el.addEventListener("mouseenter", () => {
          const found = markersDataRef.current.find((mk) => mk.id === (props.id as number));
          if (found) onMarkerHoverRef.current?.(found);
        });
        el.addEventListener("mouseleave", () => {
          onMarkerHoverRef.current?.(null);
        });
        clusterDomMarkers.current.set(
          `p-${props.id}`,
          new mb.Marker({ element: el, anchor: "center" }).setLngLat(coords).addTo(m),
        );
      }
    };

    let timer: ReturnType<typeof setTimeout> | null = null;
    const debounced = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(update, 60);
    };

    // sourcedata fires when cluster tiles finish computing - this drives the
    // initial render and any post-load updates.
    const onSourceData = (e: MapboxGLAny) => {
      if (e.sourceId === SOURCE && e.isSourceLoaded) debounced();
    };

    m.on("moveend", debounced);
    m.on("sourcedata", onSourceData);

    return () => {
      if (timer) clearTimeout(timer);
      clearDomMarkers();
      removeLayers();
      m.off("moveend", debounced);
      m.off("sourcedata", onSourceData);
    };
  }, [markers, loaded, showMarkers]);

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

  // ── Roads toggle (Mapbox style layers) ──────────────────────────────────
  useEffect(() => {
    if (!map.current || !loaded) return;
    const visibility = showRoads ? "visible" : "none";
    const layers = map.current.getStyle().layers as Array<{ id: string; type: string }> | undefined;
    for (const layer of layers ?? []) {
      if (!isRoadLayerId(layer.id)) continue;
      try {
        map.current.setLayoutProperty(layer.id, "visibility", visibility);
      } catch { /* ignore */ }
    }
  }, [loaded, showRoads]);

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

    const features = (populationBoundaries ?? [])
      .filter((b) => b.geometry != null)
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
  }, [isDark, populationBoundaries, loaded]);

  // ── Hide country highlight fill when population layer or region highlight is active ──
  useEffect(() => {
    if (!map.current || !loaded) return;
    const m = map.current;
    try {
      if (m.getLayer("focus-highlight-fill")) {
        const hide = (populationBoundaries ?? []).length > 0 || !!fitBoundsGeometry;
        m.setPaintProperty("focus-highlight-fill", "fill-opacity", hide ? 0 : 0.35);
      }
    } catch { /* ignore */ }
  }, [populationBoundaries, fitBoundsGeometry, loaded]);

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

    const features = (adminBoundaries ?? [])
      .filter((b) => b.geometry != null)
      .map((b) => ({ type: "Feature" as const, properties: { name: b.name, id: b.id }, geometry: b.geometry }));

    if (features.length === 0) return;

    const isA2 = adminBoundaryLevel === 2;
    const lineColor = isDark ? "#60A5FA" : "#1D4ED8";
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
  }, [adminBoundaries, adminBoundaryLevel, loaded, showBoundaries]);

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
        .marker-ping-ring.active {
          animation: marker-ping 1.1s cubic-bezier(0, 0, 0.4, 1) infinite;
        }
        .marker-dot.active {
          animation: marker-dot-pulse 1.1s ease-in-out infinite;
          z-index: 10 !important;
        }
      `}</style>
      <div ref={mapContainer} className={className} />
    </>
  );
}
