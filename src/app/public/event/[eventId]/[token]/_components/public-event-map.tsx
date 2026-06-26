"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Text, Group } from "@mantine/core";
import { IconMapPin } from "@tabler/icons-react";
import { useIsDark } from "~/hooks/use-is-dark";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

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

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#DC2626",
  high: "#D97706",
  medium: "#FBBF24",
  low: "#059669",
};

function buildMarkerEl(severity: string): HTMLDivElement {
  const color = SEVERITY_COLORS[severity] ?? "#737373";
  const size = severity === "critical" ? 18 : severity === "high" ? 16 : 14;
  const outer = document.createElement("div");
  outer.style.cssText = `width:${size}px;height:${size}px;`;
  const inner = document.createElement("div");
  inner.style.cssText = `width:100%;height:100%;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);`;
  outer.appendChild(inner);
  return outer;
}

export interface PublicAdminBoundary {
  id: string;
  geometry: unknown;
}

interface PublicEventMapProps {
  center: [number, number];
  markerCoords: [number, number] | null;
  markerSeverity: string;
  locationName: string | null;
  sudanGeometry: unknown | null;
  adminBoundaries: PublicAdminBoundary[];
}

export function PublicEventMap({
  center,
  markerCoords,
  markerSeverity,
  locationName,
  sudanGeometry,
  adminBoundaries,
}: PublicEventMapProps) {
  const isDark = useIsDark();
  const mapStyle = isDark ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11";
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  const [snapshotSrc, setSnapshotSrc] = useState<string | null>(null);

  // Map init - reinitialises on dark/light toggle
  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    loadMapboxGL().then((mapboxgl) => {
      if (cancelled || !containerRef.current) return;
      mapboxgl.accessToken = MAPBOX_TOKEN;

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: mapStyle,
        center,
        zoom: 5,
        interactive: false,
        preserveDrawingBuffer: true,
        attributionControl: false,
      });

      mapRef.current = map;

      map.on("load", () => {
        if (cancelled) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const styleLayers = map.getStyle().layers as Array<{ id: string; type: string }>;
        const firstSymbolLayer = styleLayers.find((l: { type: string }) => l.type === "symbol");
        const firstAdminLayer = styleLayers.find(
          (l: { id: string }) => l.id === "admin-1-boundary-bg" || l.id === "admin-0-boundary-bg",
        );
        const fillBeforeId: string | undefined = firstAdminLayer?.id ?? firstSymbolLayer?.id;
        const lineBeforeId: string | undefined = firstSymbolLayer?.id;

        // Dim mask over all non-Sudan countries
        map.addSource("country-mask-src", {
          type: "vector",
          url: "mapbox://mapbox.country-boundaries-v1",
        });
        map.addLayer(
          {
            id: "country-mask",
            type: "fill",
            source: "country-mask-src",
            "source-layer": "country_boundaries",
            filter: ["!=", ["get", "iso_3166_1"], "SD"],
            paint: {
              "fill-color": isDark ? "#000000" : "#FFFFFF",
              "fill-opacity": isDark ? 0.55 : 0.9,
            },
          },
          fillBeforeId,
        );

        // Sudan country highlight - use accurate backend geometry when available
        if (sudanGeometry) {
          map.addSource("sudan-geojson", {
            type: "geojson",
            data: { type: "Feature", geometry: sudanGeometry as never, properties: {} },
          });
          map.addLayer(
            {
              id: "sudan-highlight",
              type: "fill",
              source: "sudan-geojson",
              paint: {
                "fill-color": isDark ? "#1E3A5F" : "#1E40AF",
                "fill-opacity": isDark ? 0.45 : 0.35,
              },
            },
            fillBeforeId,
          );
          map.addLayer(
            {
              id: "sudan-border",
              type: "line",
              source: "sudan-geojson",
              paint: {
                "line-color": isDark ? "#60A5FA" : "#1D4ED8",
                "line-width": isDark ? 1.5 : 1.25,
                "line-opacity": isDark ? 0.9 : 0.85,
              },
            },
            lineBeforeId,
          );
        } else {
          // Fallback to Mapbox built-in tileset
          map.addLayer(
            {
              id: "sudan-highlight",
              type: "fill",
              source: "country-mask-src",
              "source-layer": "country_boundaries",
              filter: ["==", ["get", "iso_3166_1"], "SD"],
              paint: {
                "fill-color": isDark ? "#1E3A5F" : "#1E40AF",
                "fill-opacity": isDark ? 0.45 : 0.35,
              },
            },
            fillBeforeId,
          );
          map.addLayer(
            {
              id: "sudan-border",
              type: "line",
              source: "country-mask-src",
              "source-layer": "country_boundaries",
              filter: ["==", ["get", "iso_3166_1"], "SD"],
              paint: {
                "line-color": isDark ? "#60A5FA" : "#1D4ED8",
                "line-width": isDark ? 1.5 : 1.25,
                "line-opacity": isDark ? 0.9 : 0.85,
              },
            },
            lineBeforeId,
          );
        }

        // A1 state boundary lines
        const boundaryFeatures = adminBoundaries
          .filter((b) => b.geometry != null)
          .map((b) => ({
            type: "Feature" as const,
            geometry: b.geometry as never,
            properties: { id: b.id },
          }));
        if (boundaryFeatures.length > 0) {
          map.addSource("admin-a1", {
            type: "geojson",
            data: { type: "FeatureCollection", features: boundaryFeatures },
          });
          map.addLayer(
            {
              id: "admin-a1-lines",
              type: "line",
              source: "admin-a1",
              paint: {
                "line-color": isDark ? "#60A5FA" : "#1D4ED8",
                "line-width": 1.5,
                "line-opacity": 0.85,
              },
            },
            lineBeforeId,
          );
        }

        // State labels - restrict to Sudan
        const stateLabel = styleLayers.find((l: { id: string }) => l.id === "state-label");
        if (stateLabel) {
          try {
            map.setLayerZoomRange("state-label", 0, 24);
            map.setFilter("state-label", ["==", ["get", "iso_3166_1"], "SD"]);
            map.setPaintProperty("state-label", "text-color", isDark ? "#CBD5E1" : "#374151");
            map.setPaintProperty("state-label", "text-halo-color", isDark ? "rgba(15,23,42,0.85)" : "#FFFFFF");
            map.setPaintProperty("state-label", "text-halo-width", 1.5);
          } catch { /* ignore */ }
        }

        // Event location marker
        if (markerCoords) {
          const el = buildMarkerEl(markerSeverity);
          new mapboxgl.Marker({ element: el, anchor: "center" })
            .setLngLat(markerCoords)
            .addTo(map);
        }
      });

      // Capture a snapshot once tiles are fully loaded - enables immediate print
      map.on("idle", () => {
        if (cancelled) return;
        const canvas = map.getCanvas() as HTMLCanvasElement | null;
        if (canvas) setSnapshotSrc(canvas.toDataURL());
      });
    }).catch(() => { /* silently ignore load errors */ });

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapStyle]);

  // Refresh print snapshot immediately before the browser renders the print dialog
  useEffect(() => {
    const onBeforePrint = () => {
      const canvas = containerRef.current?.querySelector("canvas");
      if (canvas) setSnapshotSrc(canvas.toDataURL());
    };
    window.addEventListener("beforeprint", onBeforePrint);
    return () => window.removeEventListener("beforeprint", onBeforePrint);
  }, []);

  return (
    <Box style={{ border: "1px solid var(--color-border)", background: "var(--color-bg-white)" }}>
      <Box px={16} py={10} style={{ borderBottom: "1px solid var(--color-border)" }}>
        <Group gap={6}>
          <IconMapPin size={14} color="var(--color-text-secondary)" />
          <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 13 }}>
            {locationName ?? "Location"}
          </Text>
        </Group>
      </Box>

      <Box style={{ position: "relative", aspectRatio: "4/3" }}>
        {/* WebGL canvas - hidden at print time via @media print in page.tsx */}
        <div
          ref={containerRef}
          className="public-map-canvas"
          style={{ width: "100%", height: "100%" }}
        />
        {/* Snapshot shown only during print */}
        {snapshotSrc && (
          <img
            src={snapshotSrc}
            alt={locationName ?? "Map"}
            className="public-map-snapshot"
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              display: "none",
            }}
          />
        )}
      </Box>
    </Box>
  );
}
