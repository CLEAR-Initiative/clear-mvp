"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Box, Text, Card, Group } from "@mantine/core";
import type { GqlEvent } from "~/lib/types/graphql";
import type { MapMarker, MapRegion } from "~/components/map/crisis-map";
import { MapSettingsPopover, type BoundaryLevel } from "~/app/(app)/map/_components/map-settings-popover";
import { MapPanelBar } from "~/app/(app)/map/_components/map-panel-bar";
import { useMarkerHover } from "~/hooks/use-marker-hover";
import { EventListCard } from "~/components/detection/event-list-card";

const CrisisMap = dynamic(
  () => import("~/components/map/crisis-map").then((m) => m.CrisisMap),
  { ssr: false, loading: () => <Box w="100%" h="100%" bg="#F5F5F5" /> },
);

interface EventsTabProps {
  events: GqlEvent[];
  loading: boolean;
  mapMarkers: MapMarker[];
  mapRegions?: MapRegion[];
  mapCenter: [number, number];
  mapZoom: number;
  fitBoundsGeometry?: unknown;
  adminBoundaries?: Array<{ id: string; name: string; geometry: unknown }>;
  adminBoundaryLevel?: 1 | 2;
  boundaryLevel?: BoundaryLevel;
  onBoundaryLevelChange?: (level: BoundaryLevel) => void;
  focusCountryPCode?: string;
  focusCountryName?: string;
  focusCountryGeometry?: unknown;
  activeSeverities?: Set<string>;
  expandedTypeCodes?: string[] | null;
  activeSources?: Set<string> | null;
}

export function EventsTab({
  events,
  loading,
  mapMarkers,
  mapRegions,
  mapCenter,
  mapZoom,
  fitBoundsGeometry,
  adminBoundaries,
  adminBoundaryLevel,
  boundaryLevel = "A1",
  onBoundaryLevelChange,
  focusCountryPCode,
  focusCountryName,
  focusCountryGeometry,
  activeSeverities: activeSeveritiesProp,
  expandedTypeCodes: expandedTypeCodesProp,
  activeSources: activeSourcesProp,
}: EventsTabProps) {
  const { hoveredMarkerId, getCardProps, onMarkerHover } = useMarkerHover(mapMarkers);
  const [showPopulation, setShowPopulation] = useState(false);

  return (
    <Box style={{ display: "flex", gap: 24 }}>
      <EventListCard
        events={events}
        loading={loading}
        showFilter={false}
        activeSeverities={activeSeveritiesProp}
        expandedTypeCodes={expandedTypeCodesProp}
        activeSources={activeSourcesProp}
        getCardProps={getCardProps}
        defaultSortOrder="sev-desc"
      />

      {/* Right: Crisis Map */}
      <Box style={{ width: 480, flexShrink: 0 }}>
        <Group mb={12} justify="space-between" align="center" style={{ minHeight: 32 }}>
          <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 14 }}>Crisis Map</Text>
          {onBoundaryLevelChange && (
            <MapSettingsPopover boundaryLevel={boundaryLevel} onBoundaryLevelChange={onBoundaryLevelChange} />
          )}
        </Group>
        <Card p={0} style={{ border: "1px solid var(--color-border)", position: "sticky", top: 24 }}>
          <Box style={{ height: 524, position: "relative" }}>
            <CrisisMap
              markers={mapMarkers}
              regions={mapRegions}
              center={mapCenter}
              zoom={mapZoom}
              className="w-full h-full"
              focusCountryPCode={focusCountryPCode}
              focusCountryName={focusCountryName}
              focusCountryGeometry={focusCountryGeometry}
              fitBoundsGeometry={fitBoundsGeometry}
              adminBoundaries={adminBoundaries}
              adminBoundaryLevel={adminBoundaryLevel}
              hoveredMarkerId={hoveredMarkerId}
              onMarkerHover={onMarkerHover}
            />
            <MapPanelBar
              dataView="event"
              onDataViewChange={() => {}}
              showPopulation={showPopulation}
              onShowPopulationChange={setShowPopulation}
              boundaryLevel={boundaryLevel ?? "A1"}
              onBoundaryLevelChange={onBoundaryLevelChange ?? (() => {})}
            />
          </Box>
        </Card>
      </Box>
    </Box>
  );
}
