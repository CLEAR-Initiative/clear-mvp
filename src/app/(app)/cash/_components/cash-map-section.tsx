"use client";

import dynamic from "next/dynamic";
import { Box, Text, Card, Group } from "@mantine/core";
import type { MapMarker } from "~/components/map/crisis-map";

const CrisisMap = dynamic(
  () => import("~/components/map/crisis-map").then((m) => m.CrisisMap),
  { ssr: false, loading: () => <Box w="100%" h="100%" bg="#F5F5F5" /> },
);

interface CashMapSectionProps {
  mapMarkers: MapMarker[];
  center: [number, number];
  onMarkerClick: (marker: MapMarker) => void;
}

export function CashMapSection({ mapMarkers, center, onMarkerClick }: CashMapSectionProps) {
  return (
    <Box style={{ flex: "0 0 65%" }}>
      <Card p={0} style={{ border: "1px solid var(--color-border)", overflow: "hidden" }}>
        <Box style={{ height: 500, position: "relative" }}>
          <CrisisMap
            markers={mapMarkers}
            center={center}
            zoom={6.5}
            className="w-full h-full"
            onMarkerClick={onMarkerClick}
          />

          {/* Map Legend */}
          <Box style={{ position: "absolute", top: 12, left: 12, background: "var(--color-bg-white)", border: "1px solid var(--color-border)", padding: "10px 14px", zIndex: 5 }}>
            <Box style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11 }}>
              {[
                { color: "#DC2626", label: "Critical Exposure" },
                { color: "#F59E0B", label: "High Exposure" },
                { color: "#FBBF24", label: "Moderate Exposure" },
              ].map((l) => (
                <Group key={l.label} gap={8}>
                  <Box style={{ width: 10, height: 10, background: l.color }} />
                  <Text size="xs">{l.label}</Text>
                </Group>
              ))}
            </Box>
          </Box>
        </Box>
      </Card>
    </Box>
  );
}
