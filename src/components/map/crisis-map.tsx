"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "~/trpc/react";
import { geometryBounds } from "~/lib/geo/country-mask";

export interface MapMarker {
  id: number;
  lng: number;
  lat: number;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  type?: string;
  description?: string;
  popup?: string;
}

export interface MapRegion {
  id: string;
  /** GeoJSON geometry (Polygon or MultiPolygon) */
  geometry: { type: string; coordinates: unknown };
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  /** Signal points within this region - if present, rendered as a heatmap. */
  signalPoints?: Array<{ lng: number; lat: number; title: string }>;
}

interface AdminBoundary {
  id: string;
  name: string;
  geometry: unknown;
}

interface CrisisMapProps {
  markers?: MapMarker[];
  /** Polygon/MultiPolygon regions to render on the map. */
  regions?: MapRegion[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  onMarkerClick?: (marker: MapMarker) => void;
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


// ── Component ────────────────────────────────────────────────────────────────

export function CrisisMap({
  markers = [],
  regions = [],
  center = [30, 14],
  zoom = 5.5,
  className,
  onMarkerClick,
  interactive = true,
  focusCountryPCode,
  focusCountryName,
  adminBoundaries,
  adminBoundaryLevel,
  fitBoundsGeometry,
}: CrisisMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<MapboxGLAny>(null);
  const mbRef = useRef<MapboxGLAny>(null);
  const onMarkerClickRef = useRef(onMarkerClick);
  useEffect(() => { onMarkerClickRef.current = onMarkerClick; }, [onMarkerClick]);
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
        style: "mapbox://styles/mapbox/light-v11",
        center,
        zoom,
        interactive,
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
      map.current?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    const cleanup = () => {
      for (const id of ["focus-mask-fill", "focus-highlight-fill", "focus-border-line"]) {
        try { if (m.getLayer(id)) m.removeLayer(id); } catch { /* ignore */ }
      }
      try { if (m.getSource(COUNTRY_SOURCE)) m.removeSource(COUNTRY_SOURCE); } catch { /* ignore */ }
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

    // Near-white wash over every country EXCEPT the focus.
    m.addLayer(
      {
        id: "focus-mask-fill",
        type: "fill",
        source: COUNTRY_SOURCE,
        "source-layer": "country_boundaries",
        filter: ["!=", ["get", "iso_3166_1"], focusIso],
        paint: {
          "fill-color": "#FFFFFF",
          "fill-opacity": 0.9,
        },
      },
      fillBeforeId,
    );

    // Blue tint across the focus country.
    m.addLayer(
      {
        id: "focus-highlight-fill",
        type: "fill",
        source: COUNTRY_SOURCE,
        "source-layer": "country_boundaries",
        filter: ["==", ["get", "iso_3166_1"], focusIso],
        paint: {
          "fill-color": "#1E40AF",
          "fill-opacity": 0.35,
        },
      },
      fillBeforeId,
    );

    // Crisp country border - rendered ABOVE admin-1 lines but BELOW labels.
    m.addLayer(
      {
        id: "focus-border-line",
        type: "line",
        source: COUNTRY_SOURCE,
        "source-layer": "country_boundaries",
        filter: ["==", ["get", "iso_3166_1"], focusIso],
        paint: {
          "line-color": "#1D4ED8",
          "line-width": 1.25,
          "line-opacity": 0.85,
        },
      },
      borderBeforeId,
    );

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
            m.setPaintProperty(layer.id, "line-color", "#475569");
            m.setPaintProperty(layer.id, "line-width", 1.4);
            m.setPaintProperty(layer.id, "line-opacity", 0.85);
            m.setPaintProperty(layer.id, "line-dasharray", [3, 2]);
            m.setLayoutProperty(layer.id, "visibility", "visible");
          } catch { /* ignore */ }
        } else {
          try { m.setLayoutProperty(layer.id, "visibility", "none"); } catch { /* ignore */ }
        }
      }

      // Settlement labels - relax the filterrank threshold from <=2 to <=4
      // so mid-tier cities in the focus country become visible, and slightly
      // bump text size at low zooms. Mapbox's own filterrank keeps Europe/US
      // from over-cluttering, and our ROW mask covers neighbour labels.
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
            m.setFilter(layer.id, relaxed as unknown as never);
          }
          m.setLayoutProperty(layer.id, "text-size", [
            "interpolate", ["linear"], ["zoom"],
            3, 11,
            6, 14,
            10, 17,
          ]);
          // Bold weight + dark colour with a bright halo so labels stay
          // readable on top of both the grey focus fill and basemap detail.
          m.setPaintProperty(layer.id, "text-color", "#1F2937");
          m.setPaintProperty(layer.id, "text-halo-color", "#FFFFFF");
          m.setPaintProperty(layer.id, "text-halo-width", 1.5);
          m.setPaintProperty(layer.id, "text-halo-blur", 0.5);
        } catch { /* ignore */ }
      }
    }

    return cleanup;
  }, [focusIso, loaded, adminBoundaries, adminBoundaryLevel]);

  // Fit bounds to the focus country once its backend bbox is available.
  // Skips when fitBoundsGeometry is set (a more specific region is focused).
  useEffect(() => {
    if (!map.current || !loaded || !focusCountry || fitBoundsGeometry) return;
    const bounds = geometryBounds(focusCountry.geometry as never);
    if (!bounds) return;
    map.current.fitBounds(
      [[bounds[0], bounds[1]], [bounds[2], bounds[3]]],
      { padding: 40, duration: 800 },
    );
  }, [focusCountry, loaded, fitBoundsGeometry]);

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
    map.current.flyTo({ center, zoom, duration: 1500 });
  }, [center, zoom, loaded, focusCountry]);

  // ── Markers (GeoJSON cluster source) ────────────────────────────────────
  useEffect(() => {
    if (!map.current || !loaded) return;
    const m = map.current;
    const SOURCE = "crisis-markers";
    const CLUSTER_LAYER = "cluster-circles";
    const CLUSTER_RING = "cluster-ring";
    const CLUSTER_COUNT = "cluster-count";
    const POINT_LAYER = "unclustered-point";

    const removeAll = () => {
      for (const id of [CLUSTER_COUNT, CLUSTER_LAYER, CLUSTER_RING, POINT_LAYER]) {
        try { if (m.getLayer(id)) m.removeLayer(id); } catch { /* ignore */ }
      }
      try { if (m.getSource(SOURCE)) m.removeSource(SOURCE); } catch { /* ignore */ }
    };

    const handleClusterClick = (e: MapboxGLAny) => {
      const feats = m.queryRenderedFeatures(e.point, { layers: [CLUSTER_LAYER] });
      if (!feats.length) return;
      const clusterId = feats[0].properties.cluster_id;
      (m.getSource(SOURCE) as MapboxGLAny).getClusterExpansionZoom(clusterId, (err: unknown, zoom: number) => {
        if (err) return;
        m.easeTo({ center: feats[0].geometry.coordinates, zoom: zoom + 0.5, duration: 500 });
      });
    };

    const handlePointClick = (e: MapboxGLAny) => {
      const feats = m.queryRenderedFeatures(e.point, { layers: [POINT_LAYER] });
      if (!feats.length) return;
      const props = feats[0].properties as Record<string, unknown>;
      const coords = feats[0].geometry.coordinates as number[];
      onMarkerClickRef.current?.({
        id: props.id as number,
        lng: coords[0],
        lat: coords[1],
        title: props.title as string,
        severity: props.severity as MapMarker["severity"],
        type: props.type as string | undefined,
        description: props.description as string | undefined,
      });
    };

    const setCursorPointer = () => { m.getCanvas().style.cursor = "pointer"; };
    const resetCursor = () => { m.getCanvas().style.cursor = ""; };

    removeAll();

    const features = markers.map((marker) => ({
      type: "Feature" as const,
      properties: {
        id: marker.id,
        title: marker.title,
        severity: marker.severity,
        type: marker.type ?? "",
        description: marker.description ?? "",
        is_critical: marker.severity === "critical" ? 1 : 0,
        is_high:     marker.severity === "high"     ? 1 : 0,
        is_medium:   marker.severity === "medium"   ? 1 : 0,
        is_low:      marker.severity === "low"      ? 1 : 0,
      },
      geometry: { type: "Point" as const, coordinates: [marker.lng, marker.lat] },
    }));

    m.addSource(SOURCE, {
      type: "geojson",
      data: { type: "FeatureCollection", features },
      cluster: true,
      clusterMaxZoom: 9,
      clusterRadius: 48,
      clusterProperties: {
        critical: ["+", ["get", "is_critical"]],
        high:     ["+", ["get", "is_high"]],
        medium:   ["+", ["get", "is_medium"]],
        low:      ["+", ["get", "is_low"]],
      },
    });

    const styleLayers = m.getStyle().layers as Array<{ id: string; type: string }>;
    const beforeId = styleLayers.find((l) => l.type === "symbol")?.id;

    // Dominant severity color for clusters (worst-first priority).
    const clusterColor: MapboxGLAny = ["case",
      [">", ["get", "critical"], 0], severityColors.critical,
      [">", ["get", "high"],     0], severityColors.high,
      [">", ["get", "medium"],   0], severityColors.medium,
      severityColors.low,
    ];

    // Cluster radius scales with point count.
    const clusterRadius: MapboxGLAny = ["step", ["get", "point_count"],
      18,   // < 5
      5,  22, // 5-19
      20, 26, // 20-49
      50, 30, // 50+
    ];

    // Subtle outer ring to visually distinguish clusters from individual points.
    m.addLayer({
      id: CLUSTER_RING,
      type: "circle",
      source: SOURCE,
      filter: ["has", "point_count"],
      paint: {
        "circle-color": "rgba(0,0,0,0)",
        "circle-radius": ["step", ["get", "point_count"], 23, 5, 27, 20, 31, 50, 35],
        "circle-stroke-width": 2,
        "circle-stroke-color": clusterColor,
        "circle-stroke-opacity": 0.35,
        "circle-opacity": 0,
      },
    }, beforeId);

    m.addLayer({
      id: CLUSTER_LAYER,
      type: "circle",
      source: SOURCE,
      filter: ["has", "point_count"],
      paint: {
        "circle-color": clusterColor,
        "circle-radius": clusterRadius,
        "circle-stroke-width": 2.5,
        "circle-stroke-color": "#FFFFFF",
        "circle-stroke-opacity": 0.95,
        "circle-opacity": 0.93,
      },
    }, beforeId);

    m.addLayer({
      id: CLUSTER_COUNT,
      type: "symbol",
      source: SOURCE,
      filter: ["has", "point_count"],
      layout: {
        "text-field": "{point_count_abbreviated}",
        "text-font": ["DIN Offc Pro Medium", "Arial Unicode MS Bold"],
        "text-size": 12,
      },
      paint: { "text-color": "#FFFFFF" },
    });

    // Individual (unclustered) points.
    const pointColor: MapboxGLAny = ["case",
      ["==", ["get", "severity"], "critical"], severityColors.critical,
      ["==", ["get", "severity"], "high"],     severityColors.high,
      ["==", ["get", "severity"], "medium"],   severityColors.medium,
      severityColors.low,
    ];

    m.addLayer({
      id: POINT_LAYER,
      type: "circle",
      source: SOURCE,
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": pointColor,
        "circle-radius": ["case",
          ["==", ["get", "severity"], "critical"], 9,
          ["==", ["get", "severity"], "high"],     8,
          ["==", ["get", "severity"], "medium"],   7,
          6,
        ],
        "circle-stroke-width": 2,
        "circle-stroke-color": "#FFFFFF",
        "circle-stroke-opacity": 0.95,
        "circle-opacity": 0.95,
      },
    }, beforeId);

    m.on("click", CLUSTER_LAYER, handleClusterClick);
    m.on("click", POINT_LAYER, handlePointClick);
    m.on("mouseenter", CLUSTER_LAYER, setCursorPointer);
    m.on("mouseleave", CLUSTER_LAYER, resetCursor);
    m.on("mouseenter", POINT_LAYER, setCursorPointer);
    m.on("mouseleave", POINT_LAYER, resetCursor);

    return () => {
      removeAll();
      m.off("click", CLUSTER_LAYER, handleClusterClick);
      m.off("click", POINT_LAYER, handlePointClick);
      m.off("mouseenter", CLUSTER_LAYER, setCursorPointer);
      m.off("mouseleave", CLUSTER_LAYER, resetCursor);
      m.off("mouseenter", POINT_LAYER, setCursorPointer);
      m.off("mouseleave", POINT_LAYER, resetCursor);
    };
  }, [markers, loaded]);

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

    const features = (adminBoundaries ?? [])
      .filter((b) => b.geometry != null)
      .map((b) => ({ type: "Feature" as const, properties: { name: b.name, id: b.id }, geometry: b.geometry }));

    if (features.length === 0) return;

    const isA2 = adminBoundaryLevel === 2;
    const lineColor = isA2 ? "#3B82F6" : "#1D4ED8";
    const lineWidth = isA2 ? 1 : 1.5;

    const styleLayers = m.getStyle().layers as Array<{ id: string; type: string }>;
    const beforeId = styleLayers.find((l) => l.type === "symbol")?.id;

    try {
      m.addSource(ADMIN_SOURCE, {
        type: "geojson",
        data: { type: "FeatureCollection", features },
      });
      m.addLayer({ id: "admin-boundaries-line", type: "line", source: ADMIN_SOURCE,
        paint: { "line-color": lineColor, "line-width": lineWidth, "line-opacity": 0.85, "line-dasharray": [4, 2] } }, beforeId);
    } catch { /* ignore */ }

    return cleanup;
  }, [adminBoundaries, adminBoundaryLevel, loaded]);

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
              0.2, `${color}33`,
              0.5, `${color}66`,
              0.8, `${color}B3`,
              1,   `${color}F2`,
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
        Mapbox token not configured. Set NEXT_PUBLIC_MAPBOX_TOKEN in .env
      </div>
    );
  }

  return <div ref={mapContainer} className={className} />;
}
