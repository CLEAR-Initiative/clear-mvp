"use client";

import Link from "next/link";
import {
  Box,
  Text,
  Badge,
  Button,
  Group,
  SimpleGrid,
  Stack,
  Loader,
} from "@mantine/core";
import {
  IconBolt,
  IconDatabase,
  IconRefresh,
} from "@tabler/icons-react";
import { cn } from "~/lib/utils";
import { CollapsibleSection } from "~/components/ui/collapsible-section";
import type { GqlEvent, GqlAlert } from "~/lib/types/graphql";

/* ========== Helpers ========== */

/** Derive a display title for an event from its signals' detection titles */
function eventTitle(event: GqlEvent): string {
  const titles = event.signals
    .map((s) => s.detection.title)
    .filter(Boolean);
  if (titles.length === 0) return "Untitled Event";
  if (titles.length === 1) return titles[0]!;
  return titles.slice(0, 2).join(" + ") + (titles.length > 2 ? ` (+${titles.length - 2})` : "");
}

/** Get the most recent detection date from an event */
function eventDate(event: GqlEvent): string {
  const dates = event.signals
    .map((s) => s.detection.detectedAt)
    .filter(Boolean)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  if (dates.length === 0) return "";
  const d = new Date(dates[0]!);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Get location names from event's signals' detections */
function eventLocations(event: GqlEvent): string {
  const locs = new Set<string>();
  for (const signal of event.signals) {
    for (const dl of signal.detection.locations) {
      locs.add(dl.location.name);
    }
  }
  return Array.from(locs).slice(0, 2).join(", ") || "Unknown location";
}

/** Compute severity from detection confidences */
function eventSeverity(event: GqlEvent): "critical" | "high" | "medium" {
  const maxConfidence = Math.max(
    ...event.signals.map((s) => s.detection.confidence ?? 0),
  );
  if (maxConfidence >= 0.8) return "critical";
  if (maxConfidence >= 0.5) return "high";
  return "medium";
}

const severityDotColors: Record<string, string> = {
  critical: "bg-[#DC2626]",
  high: "bg-[#D97706]",
  medium: "bg-[#D97706]",
};

const severityBadgeColors: Record<string, { bg: string; text: string }> = {
  critical: { bg: "#FEE2E2", text: "#DC2626" },
  high: { bg: "#FEF3C7", text: "#D97706" },
  medium: { bg: "#FEF3C7", text: "#D97706" },
};

/* ========== Disabled Section Placeholder ========== */

function DisabledSection({ title }: { title: string }) {
  return (
    <CollapsibleSection title={title}>
      <Box
        py={24}
        style={{ textAlign: "center", opacity: 0.5 }}
      >
        <Text c="#A3A3A3" fw={600} style={{ fontSize: 12 }}>
          Coming Soon
        </Text>
        <Text c="#A3A3A3" style={{ fontSize: 11 }} mt={4}>
          This section is under development
        </Text>
      </Box>
    </CollapsibleSection>
  );
}

/* ========== Props ========== */

interface RightPanelProps {
  selectedCountry: string;
  alerts: GqlAlert[];
  events: GqlEvent[];
  eventsLoading: boolean;
  alertsLoading: boolean;
  alertsUpdatedAt: number;
  alertCount: number;
  recent7Days: number;
  pipelineStats:
    | {
        overall: { total_sources: number; total_data_records: number };
      }
    | undefined;
  onCreateAlert: () => void;
}

export function RightPanel({
  selectedCountry,
  alerts,
  events,
  eventsLoading,
  alertsLoading,
  alertsUpdatedAt,
  alertCount,
  recent7Days,
  pipelineStats,
  onCreateAlert,
}: RightPanelProps) {
  return (
    <Box component="aside" className="bg-white border-l border-[#E5E5E5] overflow-y-auto flex flex-col">
      {/* Panel header */}
      <Box px={24} py={24} className="border-b border-[#E5E5E5] bg-[#F9FAFB]">
        <Group justify="space-between" align="flex-start" mb={4}>
          <Group gap={8}>
            <Text fw={700} style={{ fontSize: 24, letterSpacing: "-0.02em" }}>
              {selectedCountry}
            </Text>
            {alertsLoading && <Loader size={16} />}
          </Group>
          <Badge
            size="sm"
            tt="uppercase"
            style={{ fontSize: 10, fontWeight: 700, background: "#DC2626", color: "white" }}
          >
            {alertCount} Active
          </Badge>
        </Group>
        <Text size="sm" c="#E85D3D" style={{ fontSize: 13 }}>
          Humanitarian{" "}
          <Text component="span" c="#737373">
            | {new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" })}
          </Text>
        </Text>
      </Box>

      {/* Quick stats */}
      <SimpleGrid cols={3} spacing={8} px={24} py={16} className="bg-[#F9FAFB] border-b border-[#E5E5E5]">
        <Stack align="center" gap={0}>
          <Text size="xl" fw={700} c="#DC2626" lh={1}>{alertCount}</Text>
          <Text size="xs" c="#737373" tt="uppercase" style={{ letterSpacing: "0.03em", fontSize: 10 }}>Active Alerts</Text>
          <Text size="xs" c="#DC2626" style={{ fontSize: 10 }}>&uarr; +{recent7Days}</Text>
        </Stack>
        <Stack align="center" gap={0}>
          <Text size="xl" fw={700} c="#E85D3D" lh={1}>{events.length}</Text>
          <Text size="xs" c="#737373" tt="uppercase" style={{ letterSpacing: "0.03em", fontSize: 10 }}>Events</Text>
        </Stack>
        <Stack align="center" gap={0}>
          <Text size="xl" fw={700} c="#171717" lh={1}>
            {events.reduce((acc, e) => acc + e.signals.length, 0)}
          </Text>
          <Text size="xs" c="#737373" tt="uppercase" style={{ letterSpacing: "0.03em", fontSize: 10 }}>Signals</Text>
        </Stack>
      </SimpleGrid>

      {/* EWAS Pipeline Status */}
      {selectedCountry === "Sudan" && (() => {
        const ps = pipelineStats;
        return (
          <Box px={24} py={16} className="border-b border-[#E5E5E5]" style={{ background: "linear-gradient(to right, #FEF2F0, white)" }}>
            <Group justify="space-between" mb={8}>
              <Group gap={8}>
                <IconDatabase size={16} color="#E85D3D" />
                <Text fw={700} tt="uppercase" style={{ letterSpacing: "0.08em", fontSize: 11, color: "#525252" }}>EWAS Sudan Pipeline</Text>
              </Group>
              <Group gap={6}>
                <Box w={8} h={8} style={{ background: "#059669" }} className="animate-pulse" />
                <Text fw={600} style={{ fontSize: 10, color: "#059669" }}>CONNECTED</Text>
              </Group>
            </Group>
            <SimpleGrid cols={3} spacing={8} mb={8}>
              <Box p={8} style={{ background: "white", border: "1px solid #F0F0F0", textAlign: "center" }}>
                <Text fw={700} c="#E85D3D" style={{ fontSize: 14 }}>{ps?.overall.total_sources ?? "\u2014"}</Text>
                <Text c="#737373" tt="uppercase" style={{ fontSize: 8 }}>Sources</Text>
              </Box>
              <Box p={8} style={{ background: "white", border: "1px solid #F0F0F0", textAlign: "center" }}>
                <Text fw={700} c="#E85D3D" style={{ fontSize: 14 }}>{ps ? `${(ps.overall.total_data_records / 1000).toFixed(1)}k` : "\u2014"}</Text>
                <Text c="#737373" tt="uppercase" style={{ fontSize: 8 }}>Records</Text>
              </Box>
              <Box p={8} style={{ background: "white", border: "1px solid #F0F0F0", textAlign: "center" }}>
                <Text fw={700} c="#DC2626" style={{ fontSize: 14 }}>{alertCount}</Text>
                <Text c="#737373" tt="uppercase" style={{ fontSize: 8 }}>Alerts</Text>
              </Box>
            </SimpleGrid>
            <Group justify="space-between">
              <Group gap={4}>
                <IconRefresh size={12} color="#737373" />
                <Text c="#737373" style={{ fontSize: 10 }}>Last sync: {ps ? "5 min ago" : "\u2014"}</Text>
              </Group>
              <Text component={Link} href="/detection" c="#E85D3D" fw={500} style={{ fontSize: 10 }} className="no-underline">
                View sources &rarr;
              </Text>
            </Group>
          </Box>
        );
      })()}

      {/* Active Events */}
      <CollapsibleSection title={`Events (${events.length})`} defaultOpen>
        {eventsLoading ? (
          <Box py={24} style={{ textAlign: "center" }}>
            <Loader size={20} />
          </Box>
        ) : events.length === 0 ? (
          <Text size="sm" c="#A3A3A3" style={{ fontSize: 13 }}>
            No events detected yet.
          </Text>
        ) : (
          <Stack gap={8} style={{ maxHeight: 400, overflowY: "auto" }}>
            {events.map((event) => {
              const sev = eventSeverity(event);
              return (
                <Box
                  key={event.id}
                  p={12}
                  className="flex items-start gap-3 bg-[#F5F5F5] hover:bg-[#E5E5E5] transition-colors"
                >
                  <Box
                    w={10}
                    h={10}
                    mt={4}
                    className={cn(
                      "shrink-0",
                      severityDotColors[sev],
                      sev === "critical" && "animate-pulse-dot",
                    )}
                  />
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text fw={600} c="#171717" style={{ fontSize: 13 }} lineClamp={2}>
                      {eventTitle(event)}
                    </Text>
                    <Text c="#737373" style={{ fontSize: 11 }}>
                      {eventLocations(event)} &bull; {eventDate(event)}
                    </Text>
                    <Group gap={4} mt={4}>
                      <Badge
                        size="xs"
                        variant="light"
                        color="gray"
                        style={{ fontSize: 9 }}
                      >
                        {event.signals.length} signal{event.signals.length !== 1 ? "s" : ""}
                      </Badge>
                      {event.alerts.length > 0 && (
                        <Badge
                          size="xs"
                          variant="light"
                          color="red"
                          style={{ fontSize: 9 }}
                        >
                          In {event.alerts.length} alert{event.alerts.length !== 1 ? "s" : ""}
                        </Badge>
                      )}
                    </Group>
                  </Box>
                  <Badge
                    size="xs"
                    tt="uppercase"
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      backgroundColor: severityBadgeColors[sev]?.bg,
                      color: severityBadgeColors[sev]?.text,
                      flexShrink: 0,
                    }}
                  >
                    {sev}
                  </Badge>
                </Box>
              );
            })}
          </Stack>
        )}
      </CollapsibleSection>

      {/* Active Alerts */}
      <CollapsibleSection title={`Alerts (${alerts.length})`}>
        {alerts.length === 0 ? (
          <Text size="sm" c="#A3A3A3" style={{ fontSize: 13 }}>
            No alerts created yet.
          </Text>
        ) : (
          <Stack gap={8} style={{ maxHeight: 300, overflowY: "auto" }}>
            {alerts.map((alert) => (
              <Box
                key={alert.id}
                p={12}
                className="bg-[#F5F5F5] hover:bg-[#E5E5E5] transition-colors"
              >
                <Group justify="space-between" mb={4}>
                  <Text fw={600} c="#171717" style={{ fontSize: 13 }} lineClamp={1}>
                    {alert.title}
                  </Text>
                  <Badge
                    size="xs"
                    tt="uppercase"
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      backgroundColor: alert.severity >= 4 ? "#FEE2E2" : "#FEF3C7",
                      color: alert.severity >= 4 ? "#DC2626" : "#D97706",
                      flexShrink: 0,
                    }}
                  >
                    Sev {alert.severity}
                  </Badge>
                </Group>
                <Text c="#737373" style={{ fontSize: 11 }} lineClamp={2}>
                  {alert.description}
                </Text>
                <Group gap={4} mt={4}>
                  <Badge size="xs" variant="light" color={alert.status === "published" ? "green" : "gray"} style={{ fontSize: 9 }}>
                    {alert.status}
                  </Badge>
                  <Badge size="xs" variant="light" color="gray" style={{ fontSize: 9 }}>
                    {alert.events.length} event{alert.events.length !== 1 ? "s" : ""}
                  </Badge>
                </Group>
              </Box>
            ))}
          </Stack>
        )}
      </CollapsibleSection>

      {/* Disabled sections */}
      <DisabledSection title="AI Situation Analysis" />
      <DisabledSection title="Response Status" />
      <DisabledSection title="NRC Global Operations" />
      <DisabledSection title="Recent Activity" />

      {/* Action buttons */}
      <Group gap={8} px={24} py={16} className="border-t border-[#E5E5E5] mt-auto">
        <Button
          leftSection={<IconBolt size={14} />}
          variant="unstyled"
          onClick={onCreateAlert}
          style={{
            flex: 1,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            background: "#E85D3D",
            color: "white",
            border: "none",
            padding: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            cursor: "pointer",
          }}
        >
          Create Alert
        </Button>
      </Group>

      {/* Data source footer */}
      <Box px={24} py={16} className="border-t border-[#E5E5E5] bg-[#F5F5F5]">
        <Text size="xs" c="#737373" style={{ fontSize: 11 }}>
          Data:{" "}
          <Text component="span" c="#E85D3D" style={{ fontSize: 11 }}>GraphQL API</Text>
          {" "}| EWAS Pipeline
        </Text>
        <Text size="xs" c="#A3A3A3" mt={8} style={{ fontSize: 9 }}>
          {alertsUpdatedAt ? `Updated: ${Math.round((Date.now() - alertsUpdatedAt) / 60000)}m ago` : "Updated: —"}
        </Text>
      </Box>
    </Box>
  );
}
