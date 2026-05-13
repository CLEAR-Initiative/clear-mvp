"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Box,
  Text,
  Card,
  Group,
  Badge,
  Loader,
  TextInput,
  Menu,
  ActionIcon,
  Divider,
  Stack,
} from "@mantine/core";
import {
  IconSearch,
  IconSortDescending,
  IconX,
} from "@tabler/icons-react";
import { mapSeverity, severityColor } from "~/lib/types/graphql";
import type { GqlEvent } from "~/lib/types/graphql";
import { getDisasterPills } from "~/lib/disaster-types";
import { DisasterTypePicker, expandSelectionsToCodes } from "~/components/disaster-type-picker";
import { api } from "~/trpc/react";
import { resolveLocationName } from "~/lib/location";
import type { MapMarker, MapRegion } from "~/components/map/crisis-map";
import { severityColors, severityLabels } from "~/lib/constants/severity";
import { useDisasterTypes } from "~/hooks/use-disaster-types";
import { MapSettingsPopover, type BoundaryLevel } from "~/app/(app)/map/_components/map-settings-popover";
import { MapPanelBar } from "~/app/(app)/map/_components/map-panel-bar";
import { useMarkerHover } from "~/hooks/use-marker-hover";
import { formatTimeAgo } from "~/lib/utils";

const CrisisMap = dynamic(
  () => import("~/components/map/crisis-map").then((m) => m.CrisisMap),
  { ssr: false, loading: () => <Box w="100%" h="100%" bg="#F5F5F5" /> },
);

type SortOrder = "sev-desc" | "sev-asc" | "newest" | "oldest";

const SORT_LABELS: Record<SortOrder, string> = {
  "sev-desc": "Severity: High to Low",
  "sev-asc":  "Severity: Low to High",
  "newest":   "Newest first",
  "oldest":   "Oldest first",
};

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
  // Lifted to the parent — drives the server-side orderBy.
  sortOrder: SortOrder;
  onSortOrderChange: (o: SortOrder) => void;
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
  sortOrder,
  onSortOrderChange,
}: EventsTabProps) {
  const { getTypeNames } = useDisasterTypes();
  const [search, setSearch] = useState("");
  const { hoveredMarkerId, getCardProps, onMarkerHover } = useMarkerHover(mapMarkers);
  const [showPopulation, setShowPopulation] = useState(false);

  const allSources = useMemo(
    () => [...new Set(events.flatMap((e) => e.signals.map((s) => s.source.name)))].sort(),
    [events],
  );

  const activeSeverities = activeSeveritiesProp ?? new Set(["critical", "high", "medium", "low"]);
  const activeSources = activeSourcesProp ?? null;


  // Sorting is applied server-side by the parent's eventsPage query — local
  // .sort() would just shuffle the current page.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      const sev = mapSeverity(e.severity);
      if (!activeSeverities.has(sev)) return false;
      if (expandedTypeCodesProp && !e.types.some((t) => expandedTypeCodesProp.includes(t))) return false;
      if (activeSources !== null && !e.signals.some((s) => activeSources.has(s.source.name))) return false;
      if (q) {
        const title = (e.title ?? e.description ?? e.types[0] ?? "").toLowerCase();
        const loc = (e.generalLocation?.name ?? e.originLocation?.name ?? "").toLowerCase();
        if (!title.includes(q) && !loc.includes(q)) return false;
      }
      return true;
    });
  }, [events, search, activeSeverities, expandedTypeCodesProp, activeSources]);

  const listCountLabel =
    filtered.length === events.length
      ? String(events.length)
      : `${filtered.length}/${events.length}`;

  return (
    <Box style={{ display: "flex", gap: 24 }}>
      {/* Left: Event list */}
      <Box style={{ flex: 1, minWidth: 0 }}>
        {/* Toolbar row */}
        <Group gap={8} mb={12} align="center" style={{ minHeight: 32 }}>
          <Group gap={6} style={{ flexShrink: 0 }}>
            <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 14 }}>Events</Text>
            <Badge size="xs" style={{ background: "var(--color-bg-muted)", color: "var(--color-text-secondary)", fontWeight: 600 }}>
              {listCountLabel}
            </Badge>
            {loading && <Loader size="xs" />}
          </Group>

          <TextInput
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            leftSection={<IconSearch size={14} color="var(--color-text-muted)" />}
            rightSection={
              search ? (
                <ActionIcon size="xs" variant="subtle" color="gray" onClick={() => setSearch("")}>
                  <IconX size={12} />
                </ActionIcon>
              ) : null
            }
            size="xs"
            style={{ flex: 1 }}
            styles={{ input: { fontSize: 13 } }}
          />

          <Menu shadow="md" width={200} position="bottom-end">
            <Menu.Target>
              <button
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 30,
                  height: 30,
                  borderRadius: 6,
                  border: `1px solid ${sortOrder !== "sev-desc" ? "var(--color-accent)" : "var(--color-border)"}`,
                  background: "var(--color-bg-white)",
                  cursor: "pointer",
                  color: sortOrder !== "sev-desc" ? "var(--color-accent)" : "var(--color-text-secondary)",
                  flexShrink: 0,
                }}
              >
                <IconSortDescending size={13} />
              </button>
            </Menu.Target>
            <Menu.Dropdown>
              {(Object.entries(SORT_LABELS) as [SortOrder, string][]).map(([key, label]) => (
                <Menu.Item
                  key={key}
                  onClick={() => onSortOrderChange(key)}
                  style={{
                    fontSize: 12,
                    fontWeight: sortOrder === key ? 600 : 400,
                    color: sortOrder === key ? "var(--color-accent)" : "var(--color-text-primary)",
                  }}
                >
                  {label}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        </Group>

        {/* Event list - no card header */}
        <Card p={0} style={{ border: "1px solid var(--color-border)" }}>
          <Box style={{ maxHeight: 524, overflowY: "auto" }}>
            {filtered.length === 0 && !loading && (
              <Box px={16} py={32} style={{ textAlign: "center" }}>
                <Text c="var(--color-text-muted)" size="sm">
                  {events.length === 0 ? "No events found." : "No events match your filters."}
                </Text>
              </Box>
            )}
            {filtered.map((event) => {
              const sev = mapSeverity(event.severity);
              const sevCol = severityColor(event.severity);
              const sevBg = severityColors[sev]?.bg ?? "var(--color-bg-muted)";
              const location = event.generalLocation ?? event.originLocation ?? event.destinationLocation;
              const sourceName = event.signals[0]?.source?.name;
              const displayTitle = event.title ?? event.description ?? event.types[0] ?? "Untitled event";
              const isAlert = event.alerts.length > 0;

              return (
                <Link
                  key={event.id}
                  href={`/event/${event.id}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <Box
                    px={16}
                    py={12}
                    className="border-b border-[#E5E5E5] hover:bg-[#F9FAFB] cursor-pointer"
                    style={{ display: "flex", gap: 12, ...getCardProps(event.id).style }}
                    onMouseEnter={getCardProps(event.id).onMouseEnter}
                    onMouseLeave={getCardProps(event.id).onMouseLeave}
                  >
                    <Box style={{ width: 3, background: sevCol, flexShrink: 0, borderRadius: 2 }} />
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Group justify="space-between" mb={4}>
                        <Group gap={6}>
                          <Badge
                            size="xs"
                            style={{ background: sevBg, color: sevCol, fontWeight: 700 }}
                          >
                            {severityLabels[sev]}
                          </Badge>
                          {isAlert && (
                            <Badge size="xs" variant="filled" color="red" style={{ fontSize: 10 }}>
                              Alert
                            </Badge>
                          )}
                          {sourceName && (
                            <Badge size="xs" variant="light" color="gray" style={{ fontSize: 10 }}>
                              {sourceName}
                            </Badge>
                          )}
                        </Group>
                        <Text size="xs" c="var(--color-text-muted)">{formatTimeAgo(event.firstSignalCreatedAt)}</Text>
                      </Group>
                      <Text fw={600} size="sm" c="var(--color-text-primary)" lineClamp={1} mb={4}>
                        {displayTitle}
                      </Text>
                      <Group gap={12}>
                        {resolveLocationName(location) && (
                          <Text size="xs" c="var(--color-text-muted)">{resolveLocationName(location)}</Text>
                        )}
                        {event.types.length > 0 && (
                          <Group gap={4}>{getTypeNames(event.types).map((name) => (
                            <Badge key={name} size="xs" variant="light" color="violet" style={{ fontSize: 9 }}>{name}</Badge>
                          ))}</Group>
                        )}
                        {getDisasterPills(event.types).map((pill) => (
                          <span
                            key={pill.label}
                            style={{
                              display: "inline-block",
                              padding: "1px 7px",
                              borderRadius: 999,
                              fontSize: 10,
                              fontWeight: 600,
                              color: pill.color,
                              background: pill.bg,
                              letterSpacing: "0.01em",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {pill.label}
                          </span>
                        ))}
                        <Text size="xs" c="var(--color-text-muted)" style={{ marginLeft: "auto" }}>
                          {event.signals.length} signal{event.signals.length !== 1 ? "s" : ""}
                        </Text>
                      </Group>
                    </Box>
                  </Box>
                </Link>
              );
            })}
          </Box>
        </Card>
      </Box>

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
