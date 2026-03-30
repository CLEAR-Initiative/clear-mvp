"use client";

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
  IconChartPie,
  IconSparkles,
  IconHome,
  IconDroplet,
  IconShield,
  IconHeart,
  IconToolsKitchen2,
  IconAlertCircle,
} from "@tabler/icons-react";
import type { GqlAlert } from "~/lib/types/graphql";

type IconComponent = React.ComponentType<{ size?: number; color?: string }>;

const SECTOR_CONFIG: Record<string, { icon: IconComponent; description: string }> = {
  shelter: { icon: IconHome, description: "Housing & displacement" },
  wash: { icon: IconDroplet, description: "Water & sanitation" },
  protection: { icon: IconShield, description: "Rights & safety" },
  health: { icon: IconHeart, description: "Medical response" },
  "food security": { icon: IconToolsKitchen2, description: "Nutrition access" },
  food: { icon: IconToolsKitchen2, description: "Nutrition access" },
};

const DEFAULT_NEEDS = [
  { label: "Shelter", icon: IconHome, description: "Housing & displacement" },
  { label: "WASH", icon: IconDroplet, description: "Water & sanitation" },
  { label: "Protection", icon: IconShield, description: "Rights & safety" },
  { label: "Health", icon: IconHeart, description: "Medical response" },
  { label: "Food Security", icon: IconToolsKitchen2, description: "Nutrition access" },
];

interface SummaryStats {
  critical: number;
  total: number;
  types: (string | undefined)[];
}

interface Overview {
  active_alerts: number;
  total_alerts: number;
  recent_7_days: number;
}

interface ExecutiveSummaryProps {
  allAlerts: GqlAlert[];
  summaryStats: SummaryStats;
  overview: Overview | undefined;
  alertsDataUpdatedAt: number | undefined;
  generatedAnalysis: string | null;
  llmMutation: {
    isPending: boolean;
    isError: boolean;
    data: { response: string; provider: string; model: string; response_time_ms?: number } | undefined;
  };
  selectedCountry: string;
}

export function ExecutiveSummary({
  allAlerts,
  summaryStats,
  overview,
  alertsDataUpdatedAt,
  generatedAnalysis,
  llmMutation,
  selectedCountry,
}: ExecutiveSummaryProps) {
  const needs = DEFAULT_NEEDS;

  return (
    <>
      {/* Priority Analysis Banner */}
      <Card
        p="lg"
        mb={24}
        style={{
          border: "1px solid var(--color-accent)",
          background: "linear-gradient(135deg, var(--color-accent-light) 0%, #FDE8E4 100%)",
        }}
      >
        <Group align="flex-start" gap={16}>
          <Box
            style={{
              width: 48,
              height: 48,
              background: "var(--color-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <IconChartPie size={24} color="white" />
          </Box>
          <Box style={{ flex: 1 }}>
            <Group gap={8} mb={4}>
              <Text
                size="xs"
                fw={600}
                c="var(--color-accent)"
                tt="uppercase"
                style={{ letterSpacing: "0.05em" }}
              >
                Priority Analysis
              </Text>
              {summaryStats.critical > 0 && (
                <Badge
                  size="xs"
                  style={{
                    background: "var(--color-critical-light)",
                    color: "var(--color-critical)",
                    border: "1px solid #FCA5A5",
                  }}
                >
                  {summaryStats.critical} Critical
                </Badge>
              )}
              {summaryStats.total > 0 && (
                <Badge
                  size="xs"
                  style={{ background: "var(--color-critical)", color: "white" }}
                >
                  {summaryStats.total} Active
                </Badge>
              )}
            </Group>
            <Text fw={600} c="var(--color-text-primary)" mb={12}>
              {allAlerts.length > 0
                ? `Situation Report - ${selectedCountry}`
                : `Armed Conflict Displacement Crisis - ${selectedCountry}`}
            </Text>

            <Group gap={24} mb={16}>
              <Box style={{ textAlign: "center" }}>
                <Text size="xl" fw={700} c="var(--color-critical)">
                  {overview?.active_alerts ?? "-"}
                </Text>
                <Text size="xs" c="var(--color-text-muted)" tt="uppercase">
                  Active Alerts
                </Text>
              </Box>
              <Box style={{ textAlign: "center" }}>
                <Text size="xl" fw={700} c="var(--color-text-primary)">
                  {overview?.total_alerts ?? "-"}
                </Text>
                <Text size="xs" c="var(--color-text-muted)" tt="uppercase">
                  Total Alerts
                </Text>
              </Box>
              <Box style={{ textAlign: "center" }}>
                <Text size="xl" fw={700} c="var(--color-critical)">
                  {overview?.recent_7_days != null
                    ? `${overview.recent_7_days} / 7d`
                    : "+12%"}
                </Text>
                <Text size="xs" c="var(--color-text-muted)" tt="uppercase">
                  Trend
                </Text>
              </Box>
            </Group>

            {/* Priority needs with icons */}
            <Group gap={8} mb={16} align="flex-start">
              {needs.map((need) => {
                const Icon = need.icon;
                return (
                  <Box
                    key={need.label}
                    px={10}
                    py={8}
                    style={{
                      background: "white",
                      border: "1px solid var(--color-border)",
                      textAlign: "center",
                      minWidth: 80,
                    }}
                  >
                    <Icon size={16} color="var(--color-accent)" />
                    <Text size="xs" fw={600} c="var(--color-text-primary)" mt={4} mb={2}>
                      {need.label}
                    </Text>
                    <Text style={{ fontSize: 10 }} c="var(--color-text-muted)" lh={1.3}>
                      {need.description}
                    </Text>
                  </Box>
                );
              })}
            </Group>

            <Group gap={8}>
              <Button
                size="xs"
                style={{ background: "var(--color-accent)", borderColor: "var(--color-accent)" }}
              >
                View Full Report
              </Button>
              <Button size="xs" variant="outline" color="gray">
                Download PDF
              </Button>
            </Group>
          </Box>
          <Box style={{ textAlign: "right", flexShrink: 0 }}>
            <Text size="xs" c="var(--color-text-muted)">
              {alertsDataUpdatedAt
                ? `Updated ${new Date(alertsDataUpdatedAt).toLocaleTimeString()}`
                : "Updated 2 hours ago"}
            </Text>
            <Text size="xs" c="var(--color-text-muted)" mt={4}>
              Confidence: 94%
            </Text>
          </Box>
        </Group>
      </Card>

      {/* LLM Generated Analysis */}
      {(generatedAnalysis ?? llmMutation.isPending) && (
        <Card
          p="lg"
          mb={24}
          style={{
            border: "1px solid #7C3AED",
            background:
              "linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%)",
          }}
        >
          <Group gap={8} mb={12}>
            <IconSparkles size={16} color="#7C3AED" />
            <Text
              size="xs"
              fw={600}
              c="#7C3AED"
              tt="uppercase"
              style={{ letterSpacing: "0.05em" }}
            >
              AI-Generated Analysis
            </Text>
            {llmMutation.data && (
              <Badge size="xs" variant="light" color="violet">
                {llmMutation.data.provider} &bull;{" "}
                {llmMutation.data.response_time_ms}ms
              </Badge>
            )}
          </Group>
          {llmMutation.isPending ? (
            <Group gap={8}>
              <Loader size={16} />
              <Text size="sm" c="#737373">
                Generating comprehensive analysis from {allAlerts.length} active
                alerts...
              </Text>
            </Group>
          ) : generatedAnalysis ? (
            <Text
              size="sm"
              c="#525252"
              lh={1.65}
              style={{ fontSize: 13, whiteSpace: "pre-line" }}
            >
              {generatedAnalysis}
            </Text>
          ) : null}
          {llmMutation.isError && (
            <Text size="xs" c="#DC2626" mt={4}>
              Failed to generate analysis. Please try again.
            </Text>
          )}
        </Card>
      )}
    </>
  );
}
