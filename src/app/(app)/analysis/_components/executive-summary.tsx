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
import { IconChartPie, IconSparkles } from "@tabler/icons-react";
import type { DjangoAlert, LLMQueryResponse } from "~/lib/types/django";

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
  allAlerts: DjangoAlert[];
  summaryStats: SummaryStats;
  overview: Overview | undefined;
  alertsDataUpdatedAt: number | undefined;
  generatedAnalysis: string | null;
  llmMutation: {
    isPending: boolean;
    isError: boolean;
    data: LLMQueryResponse | undefined;
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
  return (
    <>
      {/* Executive Summary Banner */}
      <Card
        p="lg"
        mb={24}
        style={{
          border: "1px solid #2563EB",
          background: "linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)",
        }}
      >
        <Group align="flex-start" gap={16}>
          <Box
            style={{
              width: 48,
              height: 48,
              background: "#2563EB",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <IconChartPie size={24} color="white" />
          </Box>
          <Box style={{ flex: 1 }}>
            <Group gap={8} mb={4}>
              <Text
                size="xs"
                fw={600}
                c="#2563EB"
                tt="uppercase"
                style={{ letterSpacing: "0.05em" }}
              >
                Latest AI Analysis
              </Text>
              {summaryStats.critical > 0 && (
                <Badge
                  size="xs"
                  style={{
                    background: "#FEE2E2",
                    color: "#DC2626",
                    border: "1px solid #FCA5A5",
                  }}
                >
                  {summaryStats.critical} Critical
                </Badge>
              )}
              {summaryStats.total > 0 && (
                <Badge
                  size="xs"
                  style={{ background: "#DC2626", color: "white" }}
                >
                  {summaryStats.total} Active
                </Badge>
              )}
            </Group>
            <Text fw={600} c="#171717" mb={8}>
              {allAlerts.length > 0
                ? `Situation Report — ${selectedCountry}`
                : `Cholera Outbreak Situation Report - ${selectedCountry}`}
            </Text>

            <Group gap={24} mb={12}>
              <Box style={{ textAlign: "center" }}>
                <Text size="xl" fw={700} c="#DC2626">
                  {overview?.active_alerts ?? "\u2014"}
                </Text>
                <Text size="xs" c="#737373" tt="uppercase">
                  Active Alerts
                </Text>
              </Box>
              <Box style={{ textAlign: "center" }}>
                <Text size="xl" fw={700} c="#171717">
                  {overview?.total_alerts ?? "\u2014"}
                </Text>
                <Text size="xs" c="#737373" tt="uppercase">
                  Total Alerts
                </Text>
              </Box>
              <Box style={{ textAlign: "center" }}>
                <Text size="xl" fw={700} c="#DC2626">
                  {overview?.recent_7_days != null
                    ? `${overview.recent_7_days} / 7d`
                    : "\u2191 23%"}
                </Text>
                <Text size="xs" c="#737373" tt="uppercase">
                  Trend
                </Text>
              </Box>
            </Group>

            <Group gap={6} mb={12}>
              {(summaryStats.types.length > 0
                ? summaryStats.types
                : [
                    "WASH",
                    "Health",
                    "Shelter",
                    "Food Security",
                    "Protection",
                  ]
              ).map((s) => (
                <Text
                  key={s}
                  size="xs"
                  px={8}
                  py={2}
                  style={{
                    background: "white",
                    border: "1px solid #E5E5E5",
                    color: "#525252",
                  }}
                >
                  {s}
                </Text>
              ))}
            </Group>

            <Group gap={8}>
              <Button size="xs" color="blue">
                View Full Report
              </Button>
              <Button size="xs" variant="outline" color="gray">
                Download PDF
              </Button>
            </Group>
          </Box>
          <Box style={{ textAlign: "right" }}>
            <Text size="xs" c="#A3A3A3">
              {alertsDataUpdatedAt
                ? `Updated ${new Date(alertsDataUpdatedAt).toLocaleTimeString()}`
                : "Updated 30 min ago"}
            </Text>
            <Text size="xs" c="#A3A3A3" mt={4}>
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
