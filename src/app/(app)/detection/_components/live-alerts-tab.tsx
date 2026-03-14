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
import type { GqlAlert } from "~/lib/types/graphql";
import type { MapMarker } from "~/components/map/crisis-map";
import { severityColors, severityLabels } from "~/lib/constants/severity";

const CrisisMap = dynamic(
  () => import("~/components/map/crisis-map").then((m) => m.CrisisMap),
  { ssr: false, loading: () => <Box w="100%" h="100%" bg="#F5F5F5" /> },
);

type SeverityKey = "critical" | "high" | "medium" | "low";
type SortOrder = "sev-desc" | "sev-asc" | "newest" | "oldest";

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
  const [search, setSearch] = useState("");
  const [activeSeverities, setActiveSeverities] = useState<Set<SeverityKey>>(
    new Set(["critical", "high", "medium", "low"]),
  );
  const [activeTypes, setActiveTypes] = useState<Set<string> | null>(null); // null = all
  const [sortOrder, setSortOrder] = useState<SortOrder>("sev-desc");
  const [filterOpen, setFilterOpen] = useState(false);

  // Unique event types from current alert set
  const allTypes = useMemo(
    () => [...new Set(alerts.map((a) => a.eventType))].sort(),
    [alerts],
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
      // if all selected, treat as null (no filter)
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
    let result = alerts.filter((a) => {
      const sev = mapSeverity(a.severity);
      if (!activeSeverities.has(sev)) return false;
      if (activeTypes !== null && !activeTypes.has(a.eventType)) return false;
      if (q) {
        const title = (a.description ?? a.eventType).toLowerCase();
        const loc = a.locations[0]?.location.name.toLowerCase() ?? "";
        if (!title.includes(q) && !loc.includes(q)) return false;
      }
      return true;
    });

    result = [...result].sort((a, b) => {
      if (sortOrder === "sev-desc") return b.severity - a.severity;
      if (sortOrder === "sev-asc")  return a.severity - b.severity;
      if (sortOrder === "newest")
        return new Date(b.firstSignalCreatedAt ?? b.createdAt).getTime() - new Date(a.firstSignalCreatedAt ?? a.createdAt).getTime();
      return new Date(a.firstSignalCreatedAt ?? a.createdAt).getTime() - new Date(b.firstSignalCreatedAt ?? b.createdAt).getTime();
    });

    return result;
  }, [alerts, search, activeSeverities, activeTypes, sortOrder]);

  const listCountLabel =
    filtered.length === alerts.length
      ? String(alerts.length)
      : `${filtered.length}/${alerts.length}`;

  return (
    <Box style={{ display: "flex", gap: 24 }}>
      {/* Left: Alert List */}
      <Box style={{ flex: 1, minWidth: 0 }}>
        {/* Filter row */}
        <Group gap={8} mb={16}>
          <TextInput
            placeholder="Search alerts..."
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

          {/* Filter button */}
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

          {/* Sort button */}
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

        {/* Alert list */}
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
