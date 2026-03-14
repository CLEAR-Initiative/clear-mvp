"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Box,
  Text,
  Card,
  Group,
  Badge,
  Loader,
  SegmentedControl,
} from "@mantine/core";
import { mapSeverity, severityColor } from "~/lib/types/graphql";
import type { GqlEvent } from "~/lib/types/graphql";
import { severityColors, severityLabels } from "~/lib/constants/severity";
import { useListFilters } from "./use-list-filters";
import { ListFilterBar } from "./list-filter-bar";

type ViewMode = "all" | "alerts";

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const hours = Math.floor(diff / 3_600_000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface EventsTabProps {
  events: GqlEvent[];
  loading: boolean;
}

export function EventsTab({ events, loading }: EventsTabProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [filterOpen, setFilterOpen] = useState(false);

  const alertCount = events.filter((e) => e.isAlert).length;
  const baseEvents = viewMode === "alerts" ? events.filter((e) => e.isAlert) : events;

  const {
    search, setSearch,
    activeSeverities, toggleSeverity,
    activeTypes, allTypes, toggleType,
    sortOrder, setSortOrder,
    isFiltered, clearFilters,
    filtered,
  } = useListFilters(baseEvents);

  const listCountLabel =
    filtered.length === baseEvents.length
      ? String(baseEvents.length)
      : `${filtered.length}/${baseEvents.length}`;

  return (
    <Box>
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
        searchPlaceholder="Search events..."
      >
        <SegmentedControl
          value={viewMode}
          onChange={(v) => setViewMode(v as ViewMode)}
          size="xs"
          data={[
            { label: `All Events (${events.length})`, value: "all" },
            { label: `Alerts (${alertCount})`, value: "alerts" },
          ]}
          styles={{
            root: { background: "#F5F5F5" },
            label: { fontSize: 12, fontWeight: 500 },
          }}
        />
      </ListFilterBar>

      <Card p={0} style={{ border: "1px solid #E5E5E5" }}>
        <Box px={16} py={12} style={{ borderBottom: "1px solid #E5E5E5" }}>
          <Group justify="space-between">
            <Group gap={8}>
              <Text fw={600} c="#171717" style={{ fontSize: 14 }}>
                {viewMode === "alerts" ? "Events flagged as Alerts" : "All Events"}
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
            {loading && <Loader size="xs" />}
          </Group>
        </Box>

        <Box style={{ maxHeight: "calc(100vh - 460px)", overflowY: "auto" }}>
          {filtered.length === 0 && !loading && (
            <Box px={16} py={32} style={{ textAlign: "center" }}>
              <Text c="#A3A3A3" size="sm">
                {events.length === 0
                  ? "No events found."
                  : baseEvents.length === 0
                  ? "No events flagged as alerts."
                  : "No events match your filters."}
              </Text>
            </Box>
          )}
          {filtered.map((event) => {
            const sev = mapSeverity(event.severity);
            const sevCol = severityColor(event.severity);
            const sevBg = severityColors[sev]?.bg ?? "#F5F5F5";
            const location = event.locations[0];
            const sourceName = event.signals[0]?.source?.dataSource?.name;
            const detectedAt = event.firstSignalCreatedAt ?? event.createdAt;
            const displayTitle = event.description ?? event.eventType;

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
                        {event.isAlert && (
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
                      <Text size="xs" c="#A3A3A3">{event.eventType}</Text>
                      <Text size="xs" c="#737373" style={{ marginLeft: "auto" }}>
                        {event.signals.length} signal{event.signals.length !== 1 ? "s" : ""}
                        {" "}&bull;{" "}
                        Severity: <Text span fw={600} c="#171717">{event.severity}/5</Text>
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
  );
}
