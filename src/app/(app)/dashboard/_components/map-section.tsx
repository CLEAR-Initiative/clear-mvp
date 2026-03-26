"use client";

import dynamic from "next/dynamic";
import type { MapMarker, MapRegion } from "~/components/map/crisis-map";
import {
  Box,
  Text,
  Group,
  Stack,
  ActionIcon,
  Select,
  UnstyledButton,
} from "@mantine/core";
import {
  IconPlayerSkipBack,
  IconPlayerPlay,
  IconPlayerSkipForward,
} from "@tabler/icons-react";
import { cn } from "~/lib/utils";
import { nrcRegions } from "~/lib/constants/nrc-regions";

const CrisisMap = dynamic(
  () => import("~/components/map/crisis-map").then((m) => m.CrisisMap),
  { ssr: false, loading: () => <Box w="100%" h="100%" bg="#F5F5F5" /> },
);

/* ========== Timeline Data ========== */
const timelineMonths = [
  { label: "Sep", hasEvent: false },
  { label: "Oct", hasEvent: true },
  { label: "Nov", hasEvent: true },
  { label: "Dec", hasEvent: false },
  { label: "Jan", hasEvent: false },
  { label: "Feb", hasEvent: false },
];

const views = [
  { key: "single", label: "\u25FB Single" },
  { key: "compare", label: "\u25EB Compare" },
  { key: "timelapse", label: "\u25B6 Time" },
  { key: "nrc-global", label: "\uD83C\uDF0D NRC" },
];

/* ========== Props ========== */
interface MapSectionProps {
  selectedCountry: string;
  selectedRegion: string;
  onCountryChange: (country: string | null) => void;
  onRegionChange: (region: string | null) => void;
  activeView: string;
  onViewChange: (view: string) => void;
  currentMarkers: MapMarker[];
  currentRegions?: MapRegion[];
  mapCenter: [number, number];
  mapZoom: number;
  activeMonth: number;
  onMonthChange: (month: number) => void;
  countries: string[];
  regionOptions: string[];
}

export function MapSection({
  selectedCountry,
  selectedRegion,
  onCountryChange,
  onRegionChange,
  activeView,
  onViewChange,
  currentMarkers,
  currentRegions,
  mapCenter,
  mapZoom,
  activeMonth,
  onMonthChange,
  countries,
  regionOptions,
}: MapSectionProps) {
  return (
    <Box className="relative h-[50vh] sm:h-full">
      {/* Map header overlay */}
      <Box
        className="absolute top-0 left-0 right-0 z-10 flex flex-col sm:flex-row justify-between items-start gap-2 sm:gap-0"
        px={{ base: 12, sm: 24 }}
        py={{ base: 8, sm: 16 }}
        style={{
          background: "linear-gradient(to bottom, rgba(255,255,255,0.98), rgba(255,255,255,0))",
        }}
      >
        <Group gap={8} wrap="wrap" style={{ flex: 1 }}>
          <Select
            size="xs"
            value={selectedCountry}
            onChange={onCountryChange}
            data={countries}
            style={{ minWidth: 120 }}
            styles={{
              input: { fontWeight: 600, fontSize: 13, border: "1px solid #E5E5E5" },
            }}
            label={<Text size="xs" c="#737373" tt="uppercase" style={{ letterSpacing: "0.05em", fontSize: 10 }}>Country</Text>}
          />
          <Select
            size="xs"
            value={selectedRegion}
            onChange={onRegionChange}
            data={regionOptions}
            style={{ minWidth: 120 }}
            styles={{
              input: { fontWeight: 600, fontSize: 13, border: "1px solid #E5E5E5" },
            }}
            label={<Text size="xs" c="#737373" tt="uppercase" style={{ letterSpacing: "0.05em", fontSize: 10 }}>Region</Text>}
          />
          <Box>
            <Text size="xs" c="#737373" tt="uppercase" style={{ letterSpacing: "0.05em", fontSize: 10 }}>Date</Text>
            <Box
              className="bg-white border border-[#E5E5E5] cursor-pointer"
              px={12}
              py={6}
              style={{ fontSize: 13, fontWeight: 600 }}
            >
              Feb 2026
            </Box>
          </Box>
        </Group>
        <Group gap={0} className="bg-white border border-[#E5E5E5] overflow-hidden" visibleFrom="sm">
          {views.map((view) => (
            <UnstyledButton
              key={view.key}
              onClick={() => onViewChange(view.key)}
              px={10}
              py={8}
              className={cn(
                "text-[11px] font-semibold cursor-pointer flex items-center gap-1.5 transition-all border-r border-[#E5E5E5] last:border-r-0",
                activeView === view.key
                  ? view.key === "nrc-global"
                    ? "bg-[#E85D3D] text-white"
                    : "bg-[#171717] text-white"
                  : "bg-transparent text-[#171717] hover:bg-[#F5F5F5]",
              )}
            >
              {view.label}
            </UnstyledButton>
          ))}
        </Group>
      </Box>

      {/* Mapbox map */}
      <CrisisMap
        markers={activeView === "nrc-global" ? [] : currentMarkers}
        regions={activeView === "nrc-global" ? [] : currentRegions}
        center={mapCenter}
        zoom={mapZoom}
        className="w-full h-full"
      />

      {/* Map Legend — hidden on mobile to avoid overlap, visible sm+ */}
      <Box
        className="absolute bottom-[100px] left-4 bg-white border border-[#E5E5E5] z-10"
        p={16}
        style={{ minWidth: 150 }}
        visibleFrom="sm"
      >
        <Text size="xs" fw={700} c="#737373" tt="uppercase" style={{ letterSpacing: "0.05em", fontSize: 10 }} mb={12}>
          {activeView === "nrc-global" ? "NRC Regions" : "Legend"}
        </Text>
        {activeView === "nrc-global" ? (
          <Stack gap={6}>
            {Object.entries(nrcRegions).map(([name, data]) => (
              <Group key={name} gap={8}>
                <Box w={10} h={10} style={{ backgroundColor: data.color, borderRadius: "50%" }} />
                <Text size="xs" style={{ fontSize: 11 }}>{name}</Text>
              </Group>
            ))}
          </Stack>
        ) : (
          <Stack gap={6}>
            {[
              { label: "Critical", color: "#DC2626" },
              { label: "High", color: "#D97706" },
              { label: "Medium", color: "#FBBF24" },
              { label: "Teams", color: "#059669" },
            ].map((item) => (
              <Group key={item.label} gap={8}>
                <Box w={10} h={10} style={{ backgroundColor: item.color }} />
                <Text size="xs" style={{ fontSize: 11 }}>{item.label}</Text>
              </Group>
            ))}
          </Stack>
        )}
      </Box>

      {/* Time Slider — hidden on mobile to avoid overlap with bottom nav */}
      <Box className="absolute bottom-4 left-4 right-4 bg-white border border-[#E5E5E5] z-10" p={16} visibleFrom="sm">
        <Group justify="space-between" mb={12}>
          <Text size="xs" fw={700} c="#737373" tt="uppercase" style={{ letterSpacing: "0.05em", fontSize: 11 }}>
            Timeline
          </Text>
          <Group gap={8}>
            <ActionIcon variant="light" color="gray" size="sm">
              <IconPlayerSkipBack size={12} />
            </ActionIcon>
            <ActionIcon variant="filled" size="sm" style={{ background: "#E85D3D" }}>
              <IconPlayerPlay size={12} />
            </ActionIcon>
            <ActionIcon variant="light" color="gray" size="sm">
              <IconPlayerSkipForward size={12} />
            </ActionIcon>
          </Group>
        </Group>
        <Group justify="space-between" className="relative" h={40}>
          <Box className="absolute top-1/2 left-0 right-0 h-1 bg-[#E5E5E5] -translate-y-1/2" />
          {timelineMonths.map((month, i) => (
            <Stack
              key={month.label}
              align="center"
              gap={4}
              className="cursor-pointer z-[1]"
              onClick={() => onMonthChange(i)}
            >
              <Box
                w={i === activeMonth ? 14 : 8}
                h={i === activeMonth ? 14 : 8}
                style={{
                  backgroundColor:
                    i === activeMonth
                      ? "#E85D3D"
                      : month.hasEvent
                        ? "#D97706"
                        : "#E5E5E5",
                  marginTop: i === activeMonth ? 12 : 16,
                }}
              />
              <Text
                size="xs"
                fw={i === activeMonth ? 600 : 400}
                c={i === activeMonth ? "#171717" : "#737373"}
                style={{ fontSize: 9 }}
              >
                {month.label}
              </Text>
            </Stack>
          ))}
        </Group>
      </Box>
    </Box>
  );
}
