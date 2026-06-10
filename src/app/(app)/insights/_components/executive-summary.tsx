"use client";

import { useFormatter, useTranslations } from "next-intl";
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

// labelKey: i18n keys under analysis.executiveSummary.needs.* - resolved via t() at render time.
const DEFAULT_NEEDS = [
  { labelKey: "shelter", icon: IconHome },
  { labelKey: "wash", icon: IconDroplet },
  { labelKey: "protection", icon: IconShield },
  { labelKey: "health", icon: IconHeart },
  { labelKey: "foodSecurity", icon: IconToolsKitchen2 },
] as const;

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
  const t = useTranslations("analysis");
  const format = useFormatter();
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
                {t("executiveSummary.priorityAnalysis")}
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
                  {t("executiveSummary.criticalBadge", { count: summaryStats.critical })}
                </Badge>
              )}
              {summaryStats.total > 0 && (
                <Badge
                  size="xs"
                  style={{ background: "var(--color-critical)", color: "white" }}
                >
                  {t("executiveSummary.activeBadge", { count: summaryStats.total })}
                </Badge>
              )}
            </Group>
            <Text fw={600} c="var(--color-text-primary)" mb={12}>
              {allAlerts.length > 0
                ? t("executiveSummary.situationReport", { country: selectedCountry })
                : t("executiveSummary.defaultReportTitle", { country: selectedCountry })}
            </Text>

            <Group gap={24} mb={16}>
              <Box style={{ textAlign: "center" }}>
                <Text size="xl" fw={700} c="var(--color-critical)">
                  {overview?.active_alerts ?? "-"}
                </Text>
                <Text size="xs" c="var(--color-text-muted)" tt="uppercase">
                  {t("executiveSummary.activeAlerts")}
                </Text>
              </Box>
              <Box style={{ textAlign: "center" }}>
                <Text size="xl" fw={700} c="var(--color-text-primary)">
                  {overview?.total_alerts ?? "-"}
                </Text>
                <Text size="xs" c="var(--color-text-muted)" tt="uppercase">
                  {t("executiveSummary.totalAlerts")}
                </Text>
              </Box>
              <Box style={{ textAlign: "center" }}>
                <Text size="xl" fw={700} c="var(--color-critical)">
                  {overview?.recent_7_days != null
                    ? `${overview.recent_7_days} / 7d`
                    : "+12%"}
                </Text>
                <Text size="xs" c="var(--color-text-muted)" tt="uppercase">
                  {t("executiveSummary.trend")}
                </Text>
              </Box>
            </Group>

            {/* Priority needs with icons */}
            <Group gap={8} mb={16} align="flex-start">
              {needs.map((need) => {
                const Icon = need.icon;
                return (
                  <Box
                    key={need.labelKey}
                    px={10}
                    py={8}
                    style={{
                      background: "var(--color-bg-white)",
                      border: "1px solid var(--color-border)",
                      textAlign: "center",
                      minWidth: 80,
                    }}
                  >
                    <Icon size={16} color="var(--color-accent)" />
                    <Text size="xs" fw={600} c="var(--color-text-primary)" mt={4} mb={2}>
                      {t(`executiveSummary.needs.${need.labelKey}.label`)}
                    </Text>
                    <Text style={{ fontSize: 10 }} c="var(--color-text-muted)" lh={1.3}>
                      {t(`executiveSummary.needs.${need.labelKey}.description`)}
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
                {t("executiveSummary.viewFullReport")}
              </Button>
              <Button size="xs" variant="outline" color="gray">
                {t("executiveSummary.downloadPdf")}
              </Button>
            </Group>
          </Box>
          <Box style={{ textAlign: "end", flexShrink: 0 }}>
            <Text size="xs" c="var(--color-text-muted)">
              {alertsDataUpdatedAt
                ? t("executiveSummary.updatedAt", { time: format.dateTime(new Date(alertsDataUpdatedAt), "time") })
                : t("executiveSummary.updatedFallback")}
            </Text>
            <Text size="xs" c="var(--color-text-muted)" mt={4}>
              {t("executiveSummary.confidence", { pct: 94 })}
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
              c="var(--color-ai)"
              tt="uppercase"
              style={{ letterSpacing: "0.05em" }}
            >
              {t("executiveSummary.aiGeneratedAnalysis")}
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
              <Text size="sm" c="var(--color-text-muted)">
                {t("executiveSummary.generating", { count: allAlerts.length })}
              </Text>
            </Group>
          ) : generatedAnalysis ? (
            <Text
              size="sm"
              c="var(--color-text-secondary)"
              lh={1.65}
              style={{ fontSize: 13, whiteSpace: "pre-line" }}
            >
              {generatedAnalysis}
            </Text>
          ) : null}
          {llmMutation.isError && (
            <Text size="xs" c="#DC2626" mt={4}>
              {t("executiveSummary.generateFailed")}
            </Text>
          )}
        </Card>
      )}
    </>
  );
}
