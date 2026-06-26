"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Text, Group } from "@mantine/core";
import { IconMapPin } from "@tabler/icons-react";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

// Load Mapbox GL from CDN (same pattern as CrisisMap - avoids webpack JSON.parse crash).
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

interface PublicEventMapProps {
  center: [number, number];
  markerCoords: [number, number] | null;
  locationName: string | null;
  /** Hex colour for the marker pin, derived from event severity. */
  markerColor: string;
}

/**
 * Non-interactive map for the public event share page.
 *
 * Uses preserveDrawingBuffer: true so the canvas can be snapshotted at
 * print time. The snapshot is captured once on first idle (tiles loaded)
 * and refreshed on beforeprint, then displayed via @media print CSS while
 * the WebGL canvas is hidden - avoiding the blank-canvas print bug.
 */
export function PublicEventMap({ center, markerCoords, locationName, markerColor }: PublicEventMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const snappedRef = useRef(false);
  const [snapshotSrc, setSnapshotSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let cancelled = false;

    loadMapboxGL().then((mapboxgl) => {
      if (cancelled || !containerRef.current) return;
      mapboxgl.accessToken = MAPBOX_TOKEN;

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/light-v11",
        center,
        zoom: 5,
        interactive: false,
        preserveDrawingBuffer: true,
        attributionControl: false,
      });

      mapRef.current = map;

      if (markerCoords) {
        new mapboxgl.Marker({ color: markerColor })
          .setLngLat(markerCoords)
          .addTo(map);
      }

      // Capture snapshot once after first full render (all tiles loaded).
      map.on("idle", () => {
        if (cancelled || snappedRef.current) return;
        snappedRef.current = true;
        setSnapshotSrc(map.getCanvas().toDataURL());
      });

      return () => {
        cancelled = true;
        map.remove();
        mapRef.current = null;
      };
    });

    const onBeforePrint = () => {
      const m = mapRef.current;
      if (m) setSnapshotSrc(m.getCanvas().toDataURL());
    };

    window.addEventListener("beforeprint", onBeforePrint);
    return () => {
      window.removeEventListener("beforeprint", onBeforePrint);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        {/* Snapshot shown only during print - invisible on screen via page.tsx styles */}
        {snapshotSrc && (
          <img
            src={snapshotSrc}
            alt={locationName ?? "Map"}
            className="public-map-snapshot"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "none" }}
          />
        )}
      </Box>
    </Box>
  );
}
