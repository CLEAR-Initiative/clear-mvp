"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Box,
  Text,
  Card,
  Group,
  Badge,
  Button,
  Loader,
  TextInput,
  ActionIcon,
  Popover,
  Indicator,
  Divider,
  UnstyledButton,
} from "@mantine/core";
import {
  IconDatabase,
  IconRefresh,
  IconPointFilled,
  IconSearch,
  IconFilter,
  IconArrowsSort,
  IconCheck,
} from "@tabler/icons-react";
import Link from "next/link";
import { mapSeverity, severityColor } from "~/lib/types/django";
import type { DjangoAlert, DjangoPipelineSource, DjangoPipelineStatistics } from "~/lib/types/django";
import type { MapMarker } from "~/components/map/crisis-map";
import { severityColors, severityLabels } from "~/lib/constants/severity";

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

function formatNumber(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

type SortOption = "severity-desc" | "severity-asc" | "newest" | "oldest";

const SORT_LABELS: Record<SortOption, string> = {
  "severity-desc": "Severity: High → Low",
  "severity-asc": "Severity: Low → High",
  "newest": "Newest first",
  "oldest": "Oldest first",
};

const SEVERITY_LEVELS = ["critical", "high", "medium", "low"] as const;

interface LiveAlertsTabProps {
  alerts: DjangoAlert[];
  sources: DjangoPipelineSource[];
  pipelineStats: DjangoPipelineStatistics | undefined;
  alertsLoading: boolean;
  mapMarkers: MapMarker[];
  mapCenter: [number, number];
  mapZoom: number;
  onRefresh: () => void;
}

export function LiveAlertsTab({
  alerts,
  sources,
  pipelineStats,
  alertsLoading,
  mapMarkers,
  mapCenter,
  mapZoom,
  onRefresh,
}: LiveAlertsTabProps) {
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string[]>([]);
  const [shockTypeFilter, setShockTypeFilter] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("severity-desc");

  const shockTypes = useMemo(() => {
    const seen = new Set<string>();
    for (const a of alerts) {
      if (a.shock_type?.name) seen.add(a.shock_type.name);
    }
    return Array.from(seen).sort();
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    let result = [...alerts];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.text?.toLowerCase().includes(q) ?? false) ||
          a.locations.some((l) => l.name.toLowerCase().includes(q)) ||
          (a.shock_type?.name.toLowerCase().includes(q) ?? false),
      );
    }

    if (severityFilter.length > 0) {
      result = result.filter((a) => severityFilter.includes(mapSeverity(a.severity)));
    }

    if (shockTypeFilter.length > 0) {
      result = result.filter(
        (a) => a.shock_type && shockTypeFilter.includes(a.shock_type.name),
      );
    }

    switch (sortBy) {
      case "severity-desc":
        result.sort((a, b) => b.severity - a.severity);
        break;
      case "severity-asc":
        result.sort((a, b) => a.severity - b.severity);
        break;
      case "newest":
        result.sort(
          (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
        );
        break;
      case "oldest":
        result.sort(
          (a, b) => new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
        );
        break;
    }

    return result;
  }, [alerts, search, severityFilter, shockTypeFilter, sortBy]);

  const activeFilterCount = severityFilter.length + shockTypeFilter.length;

  function toggleSeverity(sev: string) {
    setSeverityFilter((prev) =>
      prev.includes(sev) ? prev.filter((s) => s !== sev) : [...prev, sev],
    );
  }

  function toggleShockType(type: string) {
    setShockTypeFilter((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }

  function clearFilters() {
    setSeverityFilter([]);
    setShockTypeFilter([]);
  }

  const isFiltered = activeFilterCount > 0 || search.trim().length > 0;
  const countLabel = isFiltered
    ? `${filteredAlerts.length}/${alerts.length}`
    : String(alerts.length);

  return (
    <Box style={{ display: "flex", gap: 24 }}>
      {/* Left: Alerts List */}
      <Box style={{ flex: 1, minWidth: 0 }}>
        {/* EWAS Pipeline Card */}
        <Card
          p={0}
          mb={24}
          style={{
            border: "1px solid #2563EB",
            background: "linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)",
          }}
        >
          <Box px={16} py={12} className="border-b border-[#2563EB30]">
            <Group justify="space-between">
              <Group gap={8}>
                <IconDatabase size={16} color="#2563EB" />
                <Text fw={600} c="#171717" style={{ fontSize: 14 }}>
                  EWAS Sudan Pipeline
                </Text>
                <Badge size="xs" style={{ background: "#D1FAE5", color: "#059669" }}>
                  CONNECTED
                </Badge>
              </Group>
              <Group gap={8}>
                <Text size="xs" c="#737373">
                  Last sync: {pipelineStats ? "2 min ago" : "\u2014"}
                </Text>
                <Button
                  size="xs"
                  variant="subtle"
                  color="blue"
                  leftSection={<IconRefresh size={12} />}
                  style={{ fontSize: 11 }}
                  onClick={onRefresh}
                >
                  Refresh
                </Button>
              </Group>
            </Group>
          </Box>
          <Box p={16}>
            <Group gap={12} mb={12}>
              <Box>
                <Text size="xs" c="#737373">
                  Sources
                </Text>
                <Text fw={700} c="#2563EB" style={{ fontSize: 20 }}>
                  {pipelineStats?.overall.total_sources ?? sources.length}
                </Text>
              </Box>
              <Box>
                <Text size="xs" c="#737373">
                  Total Records
                </Text>
                <Text fw={700} c="#171717" style={{ fontSize: 20 }}>
                  {pipelineStats
                    ? formatNumber(pipelineStats.overall.total_data_records)
                    : "\u2014"}
                </Text>
              </Box>
              <Box>
                <Text size="xs" c="#737373">
                  Status
                </Text>
                <Group gap={4}>
                  <IconPointFilled size={10} color="#059669" />
                  <Text fw={600} size="sm" c="#059669">
                    {sources.every((s) => s.is_active)
                      ? "All Online"
                      : `${sources.filter((s) => s.is_active).length} Online`}
                  </Text>
                </Group>
              </Box>
            </Group>
            <Group gap={8} wrap="wrap">
              {sources.map((src) => (
                <Text
                  key={src.id}
                  size="xs"
                  px={8}
                  py={4}
                  fw={500}
                  style={{
                    background: src.is_active ? "#2563EB15" : "#D9770615",
                    color: src.is_active ? "#2563EB" : "#D97706",
                    border: `1px solid ${src.is_active ? "#2563EB30" : "#D9770630"}`,
                  }}
                >
                  {src.name} {src.variable_count ? `(${src.variable_count})` : ""}
                </Text>
              ))}
            </Group>
          </Box>
        </Card>

        {/* Active Alerts */}
        <Card
          p={0}
          style={{
            border: "1px solid #E5E5E5",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Card header: title + toolbar */}
          <Box
            px={16}
            pt={12}
            pb={10}
            className="border-b border-[#E5E5E5]"
            style={{ flexShrink: 0 }}
          >
            <Group justify="space-between" mb={8}>
              <Group gap={8} align="center">
                <Text fw={600} c="#171717" style={{ fontSize: 14 }}>
                  Active Alerts
                </Text>
                <Badge
                  size="sm"
                  variant="light"
                  style={{ background: "#F5F5F5", color: "#525252", fontWeight: 600 }}
                >
                  {countLabel}
                </Badge>
              </Group>
              {alertsLoading && <Loader size="xs" />}
            </Group>

            {/* Search + Filter + Sort toolbar */}
            <Group gap={6}>
              <TextInput
                flex={1}
                size="xs"
                placeholder="Search alerts…"
                leftSection={<IconSearch size={13} color="#A3A3A3" />}
                value={search}
                onChange={(e) => setSearch(e.currentTarget.value)}
                styles={{
                  input: {
                    background: "#F5F5F5",
                    border: "1px solid transparent",
                    fontSize: 12,
                    "&:focus": { borderColor: "#E5E5E5" },
                  },
                }}
              />

              {/* Filter button */}
              <Popover position="bottom-end" shadow="md" width={210} withinPortal>
                <Popover.Target>
                  <Indicator
                    size={6}
                    color="#E85D3D"
                    offset={3}
                    disabled={activeFilterCount === 0}
                  >
                    <ActionIcon
                      variant="default"
                      size={28}
                      radius={4}
                      aria-label="Filter alerts"
                      style={{ border: activeFilterCount > 0 ? "1px solid #E85D3D" : undefined }}
                    >
                      <IconFilter size={13} />
                    </ActionIcon>
                  </Indicator>
                </Popover.Target>
                <Popover.Dropdown p={12}>
                  <Text size="xs" fw={600} c="#737373" mb={6} style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Severity
                  </Text>
                  <Group gap={4} mb={12}>
                    {SEVERITY_LEVELS.map((sev) => {
                      const active = severityFilter.includes(sev);
                      return (
                        <UnstyledButton
                          key={sev}
                          onClick={() => toggleSeverity(sev)}
                          style={{
                            padding: "2px 8px",
                            fontSize: 11,
                            fontWeight: 600,
                            background: active
                              ? severityColors[sev]?.bg ?? "#F5F5F5"
                              : "#F5F5F5",
                            color: active
                              ? severityColors[sev]?.text ?? "#737373"
                              : "#737373",
                            border: `1px solid ${active ? (severityColors[sev]?.text ?? "#E5E5E5") + "40" : "#E5E5E5"}`,
                            cursor: "pointer",
                          }}
                        >
                          {severityLabels[sev]}
                        </UnstyledButton>
                      );
                    })}
                  </Group>

                  {shockTypes.length > 0 && (
                    <>
                      <Divider mb={10} color="#F0F0F0" />
                      <Text size="xs" fw={600} c="#737373" mb={6} style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        Shock Type
                      </Text>
                      <Box style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {shockTypes.map((type) => {
                          const active = shockTypeFilter.includes(type);
                          return (
                            <UnstyledButton
                              key={type}
                              onClick={() => toggleShockType(type)}
                              className="hover:bg-[#F5F5F5]"
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "4px 6px",
                                fontSize: 12,
                                color: active ? "#171717" : "#525252",
                                fontWeight: active ? 500 : 400,
                                cursor: "pointer",
                              }}
                            >
                              {type}
                              {active && <IconCheck size={12} color="#E85D3D" />}
                            </UnstyledButton>
                          );
                        })}
                      </Box>
                    </>
                  )}

                  {activeFilterCount > 0 && (
                    <>
                      <Divider mt={10} mb={8} color="#F0F0F0" />
                      <UnstyledButton
                        onClick={clearFilters}
                        style={{
                          width: "100%",
                          textAlign: "center",
                          fontSize: 11,
                          color: "#E85D3D",
                          fontWeight: 500,
                          padding: "2px 0",
                          cursor: "pointer",
                        }}
                      >
                        Clear filters
                      </UnstyledButton>
                    </>
                  )}
                </Popover.Dropdown>
              </Popover>

              {/* Sort button */}
              <Popover position="bottom-end" shadow="md" width={180} withinPortal>
                <Popover.Target>
                  <ActionIcon
                    variant="default"
                    size={28}
                    radius={4}
                    aria-label="Sort alerts"
                    style={{ border: sortBy !== "severity-desc" ? "1px solid #E85D3D" : undefined }}
                  >
                    <IconArrowsSort size={13} />
                  </ActionIcon>
                </Popover.Target>
                <Popover.Dropdown p={8}>
                  <Box style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {(Object.keys(SORT_LABELS) as SortOption[]).map((option) => {
                      const active = sortBy === option;
                      return (
                        <UnstyledButton
                          key={option}
                          onClick={() => setSortBy(option)}
                          className="hover:bg-[#F5F5F5]"
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "5px 8px",
                            fontSize: 12,
                            color: active ? "#171717" : "#525252",
                            fontWeight: active ? 500 : 400,
                            cursor: "pointer",
                          }}
                        >
                          {SORT_LABELS[option]}
                          {active && <IconCheck size={12} color="#E85D3D" />}
                        </UnstyledButton>
                      );
                    })}
                  </Box>
                </Popover.Dropdown>
              </Popover>
            </Group>
          </Box>

          {/* Alert list */}
          <Box style={{ maxHeight: "calc(100vh - 440px)", overflowY: "auto" }}>
            {filteredAlerts.length === 0 && !alertsLoading && (
              <Box px={16} py={32} style={{ textAlign: "center" }}>
                <Text c="#737373" size="sm">
                  {isFiltered ? "No alerts match your filters." : "No active alerts at this time."}
                </Text>
                {isFiltered && (
                  <UnstyledButton
                    onClick={() => { clearFilters(); setSearch(""); }}
                    style={{ fontSize: 12, color: "#E85D3D", fontWeight: 500, marginTop: 4, cursor: "pointer" }}
                  >
                    Clear all
                  </UnstyledButton>
                )}
              </Box>
            )}
            {filteredAlerts.map((alert) => {
              const sev = mapSeverity(alert.severity);
              const sevColor = severityColor(alert.severity);
              const sevBg = severityColors[sev]?.bg ?? "#F5F5F5";
              const location = alert.locations?.[0];
              return (
                <Link
                  key={alert.id}
                  href={`/crisis/${alert.id}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <Box
                    px={16}
                    py={12}
                    className="border-b border-[#E5E5E5] hover:bg-[#F9FAFB] cursor-pointer"
                    style={{ display: "flex", gap: 12 }}
                  >
                    <Box
                      style={{ width: 4, background: sevColor, flexShrink: 0 }}
                    />
                    <Box style={{ flex: 1 }}>
                      <Group justify="space-between" mb={4}>
                        <Group gap={8}>
                          <Badge
                            size="xs"
                            variant="light"
                            style={{
                              background: sevBg,
                              color: sevColor,
                              fontWeight: 600,
                            }}
                          >
                            {severityLabels[sev]}
                          </Badge>
                          {alert.data_source && (
                            <Text
                              size="xs"
                              px={6}
                              py={2}
                              style={{
                                background: `${sevColor}15`,
                                color: sevColor,
                                fontSize: 10,
                              }}
                            >
                              {alert.data_source.name}
                            </Text>
                          )}
                        </Group>
                        <Text size="xs" c="#A3A3A3">
                          {formatTimeAgo(alert.updated_at)}
                        </Text>
                      </Group>
                      <Text fw={600} size="sm" c="#171717" mb={2}>
                        {alert.title}
                      </Text>
                      <Text size="xs" c="#737373" mb={8} lineClamp={1}>
                        {location ? `${location.name}` : ""}{" "}
                        {alert.shock_type ? `\u2022 ${alert.shock_type.name}` : ""}
                      </Text>
                      <Group gap={16}>
                        <Text size="xs" c="#737373">
                          <Text span size="xs" c="#737373">
                            Severity:{" "}
                          </Text>
                          <Text span size="xs" fw={500} c="#171717">
                            {alert.severity}/5
                          </Text>
                        </Text>
                        <Text size="xs" c="#737373">
                          <Text span size="xs" c="#737373">
                            Shock date:{" "}
                          </Text>
                          <Text span size="xs" fw={500} c="#171717">
                            {new Date(alert.shock_date).toLocaleDateString()}
                          </Text>
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
        <Card
          p={0}
          style={{
            border: "1px solid #E5E5E5",
            position: "sticky",
            top: 24,
          }}
        >
          <Box px={16} py={12} className="border-b border-[#E5E5E5]">
            <Text fw={600} c="#171717" style={{ fontSize: 14 }}>
              Crisis Map
            </Text>
          </Box>
          <Box style={{ height: 400 }}>
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
