"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("cash.legend");

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
          <Box /* intentionally physical: map overlay */ style={{ position: "absolute", top: 12, left: 12, background: "var(--color-bg-white)", border: "1px solid var(--color-border)", padding: "10px 14px", zIndex: 5 }}>
            <Box style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 11 }}>
              {([
                { color: "#DC2626", labelKey: "critical" },
                { color: "#F59E0B", labelKey: "high" },
                { color: "#FBBF24", labelKey: "moderate" },
              ] as const).map((l) => (
                <Group key={l.labelKey} gap={8}>
                  <Box style={{ width: 10, height: 10, background: l.color }} />
                  <Text size="xs">{t(l.labelKey)}</Text>
                </Group>
              ))}
            </Box>
          </Box>
        </Box>
      </Card>
    </Box>
  );
}
