"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Box,
  Text,
  Card,
  Group,
  Badge,
  Loader,
} from "@mantine/core";
import { mapSeverity, severityColor } from "~/lib/types/graphql";
import type { GqlAlert } from "~/lib/types/graphql";
import type { MapMarker } from "~/components/map/crisis-map";
import { severityColors, severityLabels } from "~/lib/constants/severity";
import { useListFilters } from "./use-list-filters";
import { ListFilterBar } from "./list-filter-bar";

const CrisisMap = dynamic(
  () => import("~/components/map/crisis-map").then((m) => m.CrisisMap),
  { ssr: false, loading: () => <Box w="100%" h="100%" bg="#F5F5F5" /> },
);

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface LiveAlertsTabProps {
  alerts: GqlAlert[];
  alertsLoading: boolean;
  mapMarkers: MapMarker[];
  mapCenter: [number, number];
  mapZoom: number;
}

export function LiveAlertsTab({
  alerts,
  alertsLoading,
  mapMarkers,
  mapCenter,
  mapZoom,
}: LiveAlertsTabProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const {
    search, setSearch,
    activeSeverities, toggleSeverity,
    activeTypes, allTypes, toggleType,
    sortOrder, setSortOrder,
    isFiltered, clearFilters,
    filtered,
  } = useListFilters(alerts);

  const listCountLabel =
    filtered.length === alerts.length
      ? String(alerts.length)
      : `${filtered.length}/${alerts.length}`;

  return (
    <Box style={{ display: "flex", gap: 24 }}>
      {/* Left: Alert List */}
      <Box style={{ flex: 1, minWidth: 0 }}>
        <ListFilterBar
          search={search}
          onSearchChange={setSearch}
          activeSeverities={activeSeverities}
          onToggleSeverity={toggleSeverity}
          activeTypes={activeTypes}
          allTypes={allTypes}
          onToggleType={toggleType}
          sortOrder={sortOrder}
          onSortChange={setSortOrder}
          isFiltered={isFiltered}
          onClearFilters={clearFilters}
          filterOpen={filterOpen}
          onFilterOpenChange={setFilterOpen}
          searchPlaceholder="Search alerts..."
        />

        <Card p={0} style={{ border: "1px solid #E5E5E5" }}>
          <Box px={16} py={12} style={{ borderBottom: "1px solid #E5E5E5" }}>
            <Group justify="space-between">
              <Group gap={8}>
                <Text fw={600} c="#171717" style={{ fontSize: 14 }}>
                  Active Alerts
                </Text>
                <Badge
                  size="xs"
                  style={{
                    background: isFiltered ? "#FEF2F0" : "#F5F5F5",
                    color: isFiltered ? "#E85D3D" : "#525252",
                    fontWeight: 600,
                  }}
                >
                  {listCountLabel}
                </Badge>
              </Group>
              {alertsLoading && <Loader size="xs" />}
            </Group>
          </Box>

          <Box style={{ maxHeight: "calc(100vh - 460px)", overflowY: "auto" }}>
            {filtered.length === 0 && !alertsLoading && (
              <Box px={16} py={32} style={{ textAlign: "center" }}>
                <Text c="#A3A3A3" size="sm">
                  {alerts.length === 0 ? "No active alerts at this time." : "No alerts match your filters."}
                </Text>
              </Box>
            )}
            {filtered.map((alert) => {
              const sev = mapSeverity(alert.severity);
              const sevCol = severityColor(alert.severity);
              const sevBg = severityColors[sev]?.bg ?? "#F5F5F5";
              const location = alert.locations[0];
              const sourceName = alert.signals[0]?.source?.dataSource?.name;
              const detectedAt = alert.firstSignalCreatedAt ?? alert.createdAt;
              const displayTitle = alert.description ?? alert.eventType;

              return (
                <Link
                  key={alert.id}
                  href={`/event/${alert.id}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <Box
                    px={16}
                    py={12}
                    className="border-b border-[#E5E5E5] hover:bg-[#F9FAFB] cursor-pointer"
                    style={{ display: "flex", gap: 12 }}
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
                          {sourceName && (
                            <Badge size="xs" variant="light" color="gray" style={{ fontSize: 10 }}>
                              {sourceName}
                            </Badge>
                          )}
                        </Group>
                        <Text size="xs" c="#A3A3A3">{formatTimeAgo(detectedAt)}</Text>
                      </Group>
                      <Text fw={600} size="sm" c="#171717" lineClamp={1} mb={4}>
                        {displayTitle}
                      </Text>
                      <Group gap={12}>
                        {location && (
                          <Text size="xs" c="#737373">
                            {location.location.name}
                          </Text>
                        )}
                        <Text size="xs" c="#A3A3A3">{alert.eventType}</Text>
                        <Text size="xs" c="#737373" style={{ marginLeft: "auto" }}>
                          Severity: <Text span fw={600} c="#171717">{alert.severity}/5</Text>
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
      <Box style={{ width: 360, flexShrink: 0 }}>
        <Card p={0} style={{ border: "1px solid #E5E5E5", position: "sticky", top: 24 }}>
          <Box px={16} py={12} style={{ borderBottom: "1px solid #E5E5E5" }}>
            <Text fw={600} c="#171717" style={{ fontSize: 14 }}>Crisis Map</Text>
          </Box>
          <Box style={{ height: 420 }}>
            <CrisisMap
              markers={mapMarkers}
              center={mapCenter}
              zoom={mapZoom}
              className="w-full h-full"
            />
          </Box>
        </Card>
      </Box>
    </Box>
  );
}
