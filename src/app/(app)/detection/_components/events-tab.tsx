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
  SegmentedControl,
  Popover,
  Menu,
  ActionIcon,
  Divider,
  Stack,
} from "@mantine/core";
import {
  IconSearch,
  IconFilter,
  IconSortDescending,
  IconX,
} from "@tabler/icons-react";
import { mapSeverity, severityColor } from "~/lib/types/graphql";
import type { GqlEvent } from "~/lib/types/graphql";
import type { MapMarker } from "~/components/map/crisis-map";
import { severityColors, severityLabels } from "~/lib/constants/severity";

const CrisisMap = dynamic(
  () => import("~/components/map/crisis-map").then((m) => m.CrisisMap),
  { ssr: false, loading: () => <Box w="100%" h="100%" bg="#F5F5F5" /> },
);

type SeverityKey = "critical" | "high" | "medium" | "low";
type SortOrder = "sev-desc" | "sev-asc" | "newest" | "oldest";
type ViewMode = "all" | "alerts";

const SORT_LABELS: Record<SortOrder, string> = {
  "sev-desc": "Severity: High to Low",
  "sev-asc":  "Severity: Low to High",
  "newest":   "Newest first",
  "oldest":   "Oldest first",
};

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
  mapMarkers: MapMarker[];
  mapCenter: [number, number];
  mapZoom: number;
}

export function EventsTab({
  events,
  loading,
  mapMarkers,
  mapCenter,
  mapZoom,
}: EventsTabProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [search, setSearch] = useState("");
  const [activeSeverities, setActiveSeverities] = useState<Set<SeverityKey>>(
    new Set(["critical", "high", "medium", "low"]),
  );
  const [activeTypes, setActiveTypes] = useState<Set<string> | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("sev-desc");
  const [filterOpen, setFilterOpen] = useState(false);

  const alertCount = events.filter((e) => e.alerts.length > 0).length;

  const baseEvents = useMemo(
    () => viewMode === "alerts" ? events.filter((e) => e.alerts.length > 0) : events,
    [events, viewMode],
  );

  const allTypes = useMemo(
    () => [...new Set(baseEvents.flatMap((e) => e.types))].sort(),
    [baseEvents],
  );

  function toggleSeverity(sev: SeverityKey) {
    setActiveSeverities((prev) => {
      const next = new Set(prev);
      next.has(sev) ? next.delete(sev) : next.add(sev);
      return next;
    });
  }

  function toggleType(type: string) {
    setActiveTypes((prev) => {
      const base = prev ?? new Set(allTypes);
      const next = new Set(base);
      next.has(type) ? next.delete(type) : next.add(type);
      return next.size === allTypes.length ? null : next;
    });
  }

  function clearFilters() {
    setSearch("");
    setActiveSeverities(new Set(["critical", "high", "medium", "low"]));
    setActiveTypes(null);
    setSortOrder("sev-desc");
  }

  const isFiltered =
    search.trim() !== "" ||
    activeSeverities.size < 4 ||
    activeTypes !== null ||
    sortOrder !== "sev-desc";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = baseEvents.filter((e) => {
      const sev = mapSeverity(e.rank);
      if (!activeSeverities.has(sev)) return false;
      if (activeTypes !== null && !e.types.some((t) => activeTypes.has(t))) return false;
      if (q) {
        const title = (e.title ?? e.description ?? e.types[0] ?? "").toLowerCase();
        const loc = (e.generalLocation?.name ?? e.originLocation?.name ?? "").toLowerCase();
        if (!title.includes(q) && !loc.includes(q)) return false;
      }
      return true;
    });

    result = [...result].sort((a, b) => {
      if (sortOrder === "sev-desc") return b.rank - a.rank;
      if (sortOrder === "sev-asc")  return a.rank - b.rank;
      if (sortOrder === "newest")
        return new Date(b.firstSignalCreatedAt).getTime() - new Date(a.firstSignalCreatedAt).getTime();
      return new Date(a.firstSignalCreatedAt).getTime() - new Date(b.firstSignalCreatedAt).getTime();
    });

    return result;
  }, [baseEvents, search, activeSeverities, activeTypes, sortOrder]);

  const listCountLabel =
    filtered.length === baseEvents.length
      ? String(baseEvents.length)
      : `${filtered.length}/${baseEvents.length}`;

  return (
    <Box style={{ display: "flex", gap: 24 }}>
      {/* Left: Event List */}
      <Box style={{ flex: 1, minWidth: 0 }}>
        {/* Filter row */}
        <Group gap={8} mb={16}>
          <SegmentedControl
            value={viewMode}
            onChange={(v) => setViewMode(v as ViewMode)}
            size="xs"
            data={[
              { label: `All (${events.length})`, value: "all" },
              { label: `Alerts (${alertCount})`, value: "alerts" },
            ]}
            styles={{
              root: { background: "#F5F5F5" },
              label: { fontSize: 12, fontWeight: 500 },
            }}
          />

          <TextInput
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            leftSection={<IconSearch size={14} color="#A3A3A3" />}
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

          <Popover
            opened={filterOpen}
            onChange={setFilterOpen}
            position="bottom-start"
            shadow="md"
            width={240}
          >
            <Popover.Target>
              <button
                onClick={() => setFilterOpen((o) => !o)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 10px",
                  borderRadius: 6,
                  border: `1px solid ${isFiltered ? "#E85D3D" : "#E5E5E5"}`,
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 500,
                  color: isFiltered ? "#E85D3D" : "#525252",
                  position: "relative",
                }}
              >
                <IconFilter size={13} />
                Filter
                {isFiltered && (
                  <Box
                    style={{
                      position: "absolute",
                      top: -3,
                      right: -3,
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "#E85D3D",
                    }}
                  />
                )}
              </button>
            </Popover.Target>
            <Popover.Dropdown p={16}>
              <Text size="xs" fw={700} c="#171717" mb={10}>Severity</Text>
              <Group gap={6} mb={14}>
                {(["critical", "high", "medium", "low"] as SeverityKey[]).map((sev) => {
                  const active = activeSeverities.has(sev);
                  const color = severityColor(sev === "critical" ? 5 : sev === "high" ? 4 : sev === "medium" ? 3 : 2);
                  return (
                    <button
                      key={sev}
                      onClick={() => toggleSeverity(sev)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        border: `1px solid ${active ? color : "#E5E5E5"}`,
                        background: active ? `${color}15` : "#F9FAFB",
                        color: active ? color : "#737373",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                        textTransform: "capitalize",
                      }}
                    >
                      {sev}
                    </button>
                  );
                })}
              </Group>

              {allTypes.length > 0 && (
                <>
                  <Divider color="#F0F0F0" mb={10} />
                  <Text size="xs" fw={700} c="#171717" mb={8}>Event Type</Text>
                  <Stack gap={4}>
                    {allTypes.map((type) => {
                      const active = activeTypes === null || activeTypes.has(type);
                      return (
                        <button
                          key={type}
                          onClick={() => toggleType(type)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "5px 10px",
                            borderRadius: 6,
                            border: "1px solid",
                            borderColor: active ? "#E85D3D30" : "#E5E5E5",
                            background: active ? "#FEF2F0" : "#F9FAFB",
                            color: active ? "#E85D3D" : "#737373",
                            fontSize: 12,
                            fontWeight: 500,
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          {type}
                          {active && (
                            <Box style={{ width: 6, height: 6, borderRadius: "50%", background: "#E85D3D" }} />
                          )}
                        </button>
                      );
                    })}
                  </Stack>
                </>
              )}

              {isFiltered && (
                <>
                  <Divider color="#F0F0F0" my={10} />
                  <button
                    onClick={clearFilters}
                    style={{
                      width: "100%",
                      padding: "6px",
                      borderRadius: 6,
                      border: "1px solid #E5E5E5",
                      background: "#F9FAFB",
                      color: "#525252",
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Clear all filters
                  </button>
                </>
              )}
            </Popover.Dropdown>
          </Popover>

          <Menu shadow="md" width={200} position="bottom-end">
            <Menu.Target>
              <button
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 10px",
                  borderRadius: 6,
                  border: `1px solid ${sortOrder !== "sev-desc" ? "#E85D3D" : "#E5E5E5"}`,
                  background: "#fff",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 500,
                  color: sortOrder !== "sev-desc" ? "#E85D3D" : "#525252",
                }}
              >
                <IconSortDescending size={13} />
                Sort
              </button>
            </Menu.Target>
            <Menu.Dropdown>
              {(Object.entries(SORT_LABELS) as [SortOrder, string][]).map(([key, label]) => (
                <Menu.Item
                  key={key}
                  onClick={() => setSortOrder(key)}
                  style={{
                    fontSize: 12,
                    fontWeight: sortOrder === key ? 600 : 400,
                    color: sortOrder === key ? "#E85D3D" : "#171717",
                  }}
                >
                  {label}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        </Group>

        {/* Event list */}
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
              const sev = mapSeverity(event.rank);
              const sevCol = severityColor(event.rank);
              const sevBg = severityColors[sev]?.bg ?? "#F5F5F5";
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
                        <Text size="xs" c="#A3A3A3">{formatTimeAgo(event.firstSignalCreatedAt)}</Text>
                      </Group>
                      <Text fw={600} size="sm" c="#171717" lineClamp={1} mb={4}>
                        {displayTitle}
                      </Text>
                      <Group gap={12}>
                        {location && (
                          <Text size="xs" c="#737373">{location.name}</Text>
                        )}
                        {event.types.length > 0 && (
                          <Text size="xs" c="#A3A3A3">{event.types.join(", ")}</Text>
                        )}
                        <Text size="xs" c="#737373" style={{ marginLeft: "auto" }}>
                          {event.signals.length} signal{event.signals.length !== 1 ? "s" : ""}
                          {" "}&bull;{" "}
                          Rank: <Text span fw={600} c="#171717">{event.rank.toFixed(1)}</Text>
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
        <Card p={0} style={{ border: "1px solid #E5E5E5", position: "sticky", top: 24 }}>
          <Box px={16} py={12} style={{ borderBottom: "1px solid #E5E5E5" }}>
            <Text fw={600} c="#171717" style={{ fontSize: 14 }}>Crisis Map</Text>
          </Box>
          <Box style={{ height: 480 }}>
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
