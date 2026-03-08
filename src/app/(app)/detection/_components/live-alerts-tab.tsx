"use client";

import dynamic from "next/dynamic";
import {
  Box,
  Text,
  Card,
  Group,
  Badge,
  Button,
  Loader,
} from "@mantine/core";
import {
  IconDatabase,
  IconRefresh,
  IconPointFilled,
} from "@tabler/icons-react";
import Link from "next/link";
import { mapSeverity, severityColor } from "~/lib/types/graphql";
import type { DjangoPipelineSource, DjangoPipelineStatistics } from "~/lib/types/django";
import type { GqlAlert } from "~/lib/types/graphql";
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

interface LiveAlertsTabProps {
  alerts: GqlAlert[];
  sources: DjangoPipelineSource[];
  pipelineStats: DjangoPipelineStatistics | undefined;
  selectedCountry: string;
  selectedRegion: string;
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
  selectedCountry,
  selectedRegion,
  alertsLoading,
  mapMarkers,
  mapCenter,
  mapZoom,
  onRefresh,
}: LiveAlertsTabProps) {
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
            background:
              "linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)",
          }}
        >
          <Box px={16} py={12} className="border-b border-[#2563EB30]">
            <Group justify="space-between">
              <Group gap={8}>
                <IconDatabase size={16} color="#2563EB" />
                <Text fw={600} c="#171717" style={{ fontSize: 14 }}>
                  EWAS Sudan Pipeline
                </Text>
                <Badge
                  size="xs"
                  style={{ background: "#D1FAE5", color: "#059669" }}
                >
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
                  {src.name}{" "}
                  {src.variable_count ? `(${src.variable_count})` : ""}
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
          <Box
            px={16}
            py={12}
            className="border-b border-[#E5E5E5]"
            style={{ flexShrink: 0 }}
          >
            <Group justify="space-between">
              <Box>
                <Text fw={600} c="#171717" style={{ fontSize: 14 }}>
                  Active Alerts ({alerts.length})
                </Text>
                <Text size="xs" c="#737373">
                  {selectedCountry}
                  {selectedRegion !== "All Regions"
                    ? ` \u2014 ${selectedRegion}`
                    : ""}{" "}
                  \u2014 sorted by severity
                </Text>
              </Box>
              {alertsLoading && <Loader size="xs" />}
            </Group>
          </Box>
          <Box
            style={{
              maxHeight: "calc(100vh - 400px)",
              overflowY: "auto",
            }}
          >
            {alerts.length === 0 && !alertsLoading && (
              <Box px={16} py={32} style={{ textAlign: "center" }}>
                <Text c="#737373" size="sm">
                  No active alerts at this time.
                </Text>
              </Box>
            )}
            {alerts.map((alert) => {
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
                      style={{
                        width: 4,
                        background: sevColor,
                        flexShrink: 0,
                      }}
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
                          <Badge size="xs" variant="light" color="gray" style={{ fontSize: 9 }}>
                            {alert.status}
                          </Badge>
                        </Group>
                        <Text size="xs" c="#A3A3A3">
                          {formatTimeAgo(alert.updatedAt)}
                        </Text>
                      </Group>
                      <Text fw={600} size="sm" c="#171717" mb={2}>
                        {alert.title}
                      </Text>
                      <Text size="xs" c="#737373" mb={8} lineClamp={1}>
                        {location ? location.location.name : ""}{" "}
                        {alert.events.length > 0
                          ? `\u2022 ${alert.events.length} event${alert.events.length !== 1 ? "s" : ""}`
                          : ""}
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
                            Created:{" "}
                          </Text>
                          <Text span size="xs" fw={500} c="#171717">
                            {new Date(
                              alert.createdAt,
                            ).toLocaleDateString()}
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
