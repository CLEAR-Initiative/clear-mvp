"use client";

import { useEffect, useRef, useState, useCallback } from "react";

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

interface CrisisMapProps {
  markers?: MapMarker[];
  center?: [number, number];
  zoom?: number;
  className?: string;
  onMarkerClick?: (marker: MapMarker) => void;
  interactive?: boolean;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

const severityColors: Record<string, string> = {
  critical: "#DC2626",
  high: "#D97706",
  medium: "#FBBF24",
  low: "#059669",
};

/** Colors by crisis type (matching wireframe) */
const typeColors: Record<string, string> = {
  cholera: "#DC2626",
  disease: "#DC2626",
  flooding: "#3B82F6",
  flood: "#3B82F6",
  drought: "#D97706",
  conflict: "#991B1B",
  displacement: "#9333EA",
  food_insecurity: "#EA580C",
  famine: "#EA580C",
  team: "#059669",
};

/** Icons by crisis type (matching wireframe) */
const typeIcons: Record<string, string> = {
  conflict: "\u2694",
  displacement: "\uD83D\uDC65",
  food_insecurity: "!",
  famine: "!",
  cholera: "\u2623",
  disease: "\u2623",
  flooding: "\uD83D\uDCA7",
  flood: "\uD83D\uDCA7",
  drought: "\u2600",
  team: "\u25CF",
};

const severitySizes: Record<string, number> = {
  critical: 32,
  high: 28,
  medium: 24,
  low: 24,
};

/**
 * Load mapbox-gl from CDN to avoid webpack JSON.parse optimization crash.
 * Returns the mapboxgl global object.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function loadMapboxGL(): Promise<any> {
  return new Promise((resolve, reject) => {
    // Already loaded
    if ((window as unknown as Record<string, unknown>).mapboxgl) {
      resolve((window as unknown as Record<string, unknown>).mapboxgl);
      return;
    }

    // Load CSS
    if (!document.querySelector('link[href*="mapbox-gl"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://api.mapbox.com/mapbox-gl-js/v3.9.4/mapbox-gl.css";
      document.head.appendChild(link);
    }

    // Load JS
    const script = document.createElement("script");
    script.src = "https://api.mapbox.com/mapbox-gl-js/v3.9.4/mapbox-gl.js";
    script.onload = () => {
      resolve((window as unknown as Record<string, unknown>).mapboxgl);
    };
    script.onerror = () => reject(new Error("Failed to load Mapbox GL JS"));
    document.head.appendChild(script);
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MapboxGLAny = any;

export function CrisisMap({
  markers = [],
  center = [40.5, 8.5],
  zoom = 5.5,
  className,
  onMarkerClick,
  interactive = true,
}: CrisisMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<MapboxGLAny>(null);
  const mapMarkers = useRef<MapboxGLAny[]>([]);
  const mbRef = useRef<MapboxGLAny>(null);
  const [loaded, setLoaded] = useState(false);

  // Initialize map
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

  // FlyTo when center/zoom props change (compare values, not array references)
  const prevCenter = useRef(center);
  const prevZoom = useRef(zoom);
  useEffect(() => {
    if (!map.current || !loaded) return;
    if (
      prevCenter.current[0] === center[0] &&
      prevCenter.current[1] === center[1] &&
      prevZoom.current === zoom
    ) return;
    prevCenter.current = center;
    prevZoom.current = zoom;
    map.current.flyTo({
      center,
      zoom,
      duration: 1500,
    });
  }, [center, zoom, loaded]);

  // Update markers
  const updateMarkers = useCallback(() => {
    const mapboxgl = mbRef.current;
    if (!map.current || !loaded || !mapboxgl) return;

    // Clear existing markers
    mapMarkers.current.forEach((m: MapboxGLAny) => m.remove());
    mapMarkers.current = [];

    markers.forEach((markerData) => {
      const isTeam = markerData.type?.toLowerCase() === "team";
      const size = isTeam ? 28 : (severitySizes[markerData.severity] ?? 24);
      const typeLower = markerData.type?.toLowerCase() ?? "";
      // Use severity color for crisis markers so low=green, medium=yellow, high=orange, critical=red
      const markerColor = isTeam
        ? (typeColors[typeLower] ?? "#059669")
        : (severityColors[markerData.severity] ?? "#737373");
      const icon = typeIcons[typeLower] ?? "!";

      const el = document.createElement("div");
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.cursor = "pointer";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.fontWeight = "700";
      el.style.fontSize = "10px";
      el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.15)";

      if (isTeam) {
        // Team markers: circle, solid color fill, white border
        el.style.borderRadius = "50%";
        el.style.backgroundColor = markerColor;
        el.style.border = "3px solid white";
        el.style.color = "white";
        el.innerHTML = icon;
      } else {
        // Crisis markers: square (4px radius), white bg, colored border
        el.style.borderRadius = "4px";
        el.style.backgroundColor = "white";
        el.style.border = `3px solid ${markerColor}`;
        el.style.color = markerColor;
        el.innerHTML = icon;
      }

      if (markerData.severity === "critical") {
        el.style.animation = "pulse-dot 2s ease-in-out infinite";
      }

      // Tooltip on hover
      const tooltip = document.createElement("div");
      tooltip.style.cssText = `
        position: absolute; bottom: 100%; left: 50%; transform: translateX(-50%);
        background: white; border: 1px solid #e5e7eb; padding: 8px 12px;
        white-space: nowrap; font-size: 11px; font-weight: 500;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-bottom: 8px;
        pointer-events: none; opacity: 0; transition: opacity 0.15s; z-index: 100;
      `;
      const severityColor = severityColors[markerData.severity] ?? "#737373";
      tooltip.innerHTML = `
        <div style="font-weight: 600; margin-bottom: 2px;">${markerData.title}</div>
        <div style="color: ${severityColor}; font-size: 10px; text-transform: uppercase;">${markerData.severity} severity</div>
      `;
      el.appendChild(tooltip);
      el.addEventListener("mouseenter", () => { tooltip.style.opacity = "1"; });
      el.addEventListener("mouseleave", () => { tooltip.style.opacity = "0"; });

      const marker = new mapboxgl.Marker({ element: el })
        .setLngLat([markerData.lng, markerData.lat])
        .addTo(map.current);

      el.addEventListener("click", () => {
        onMarkerClick?.(markerData);
      });

      mapMarkers.current.push(marker);
    });
  }, [markers, loaded, onMarkerClick]);

  useEffect(() => {
    updateMarkers();
  }, [updateMarkers]);

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
