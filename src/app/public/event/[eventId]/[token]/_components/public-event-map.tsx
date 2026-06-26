"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Box, Text, Group } from "@mantine/core";
import { IconMapPin } from "@tabler/icons-react";
import type { MapMarker, AdminBoundary } from "~/components/map/crisis-map";

const CrisisMap = dynamic(
  () => import("~/components/map/crisis-map").then((m) => m.CrisisMap),
  { ssr: false },
);

export type { AdminBoundary };

interface PublicEventMapProps {
  center: [number, number];
  markerCoords: [number, number] | null;
  markerSeverity: "critical" | "high" | "medium" | "low" | "unknown";
  locationName: string | null;
  sudanGeometry: unknown | null;
  adminBoundaries: AdminBoundary[];
}

export function PublicEventMap({
  center,
  markerCoords,
  markerSeverity,
  locationName,
  sudanGeometry,
  adminBoundaries,
}: PublicEventMapProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [snapshotSrc, setSnapshotSrc] = useState<string | null>(null);

  const markers: MapMarker[] = markerCoords
    ? [{ id: 1, lng: markerCoords[0], lat: markerCoords[1], title: locationName ?? "Event", severity: markerSeverity }]
    : [];

  useEffect(() => {
    const onBeforePrint = () => {
      const canvas = wrapperRef.current?.querySelector("canvas");
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

      <Box style={{ aspectRatio: "4/3", position: "relative" }}>
        <div ref={wrapperRef} className="public-map-canvas" style={{ width: "100%", height: "100%" }}>
          <CrisisMap
            markers={markers}
            center={center}
            zoom={4.5}
            className="w-full h-full"
            interactive={false}
            preserveDrawingBuffer={true}
            focusCountryPCode="SD"
            focusCountryName="Sudan"
            focusCountryGeometry={sudanGeometry}
            adminBoundaries={adminBoundaries}
            adminBoundaryLevel={1}
            fitBoundsOnFocus={false}
          />
        </div>
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
