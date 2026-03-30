"use client";

import {
  Box,
  Text,
  Group,
  Badge,
  SimpleGrid,
  Button,
} from "@mantine/core";
import {
  IconPlus,
  IconHome,
  IconDroplet,
  IconShield,
  IconHeart,
  IconToolsKitchen2,
} from "@tabler/icons-react";
import { CardSection } from "~/components/ui";
import { scenarios, situationReports } from "./analysis-data";
import { getDisasterPills } from "~/lib/disaster-types";

type IconComponent = React.ComponentType<{ size?: number; color?: string }>;

const NEED_ICONS: Record<string, IconComponent> = {
  shelter: IconHome,
  wash: IconDroplet,
  protection: IconShield,
  health: IconHeart,
  "food security": IconToolsKitchen2,
};

interface ReportsTabProps {
  selectedCountry: string;
  selectedRegion: string;
  summaryStats: { critical: number; total: number; types: string[] };
  realSituationItems: string[] | null;
}

export function ReportsTab({
  selectedCountry,
  selectedRegion,
  summaryStats,
}: ReportsTabProps) {
  return (
    <SimpleGrid cols={2} spacing={16} mb={24}>
      {/* Active Situations */}
      <CardSection
        title="Active Situations"
        subtitle={`${selectedCountry}${selectedRegion !== "All Regions" ? ` - ${selectedRegion}` : ""}`}
        action={
          summaryStats.critical > 0 ? (
            <Badge
              size="xs"
              style={{ background: "var(--color-critical-light)", color: "var(--color-critical)" }}
            >
              {summaryStats.critical} Critical
            </Badge>
          ) : null
        }
        noPadding
      >
        {situationReports.map((report, idx) => {
          const pills = getDisasterPills(report.types);
          return (
            <Box
              key={idx}
              px={16}
              py={20}
              style={{ borderBottom: "1px solid var(--color-border)", display: "flex", gap: 14 }}
            >
              {/* Severity square marker */}
              <Box
                style={{
                  width: 12,
                  height: 12,
                  background: report.markerColor,
                  flexShrink: 0,
                  marginTop: 4,
                }}
              />

              <Box style={{ flex: 1, minWidth: 0 }}>
                {/* Title + severity badge */}
                <Group justify="space-between" mb={6} gap={12} align="flex-start">
                  <Text fw={700} size="sm" c="var(--color-text-primary)">
                    {report.title}
                  </Text>
                  <Badge
                    size="xs"
                    style={{
                      background: report.severityBg,
                      color: report.severityColor,
                      border: `1px solid ${report.severityColor}40`,
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      flexShrink: 0,
                    }}
                  >
                    {report.severity.toUpperCase()}
                  </Badge>
                </Group>

                {/* Location */}
                <Text size="xs" c="var(--color-text-muted)" mb={8}>{report.meta}</Text>

                {/* Summary */}
                <Text size="sm" c="var(--color-text-secondary)" mb={12} style={{ lineHeight: 1.6 }}>
                  {report.description}
                </Text>

                {/* Disaster type pills */}
                <Group gap={6} mb={12}>
                  {pills.map((pill) => (
                    <Badge
                      key={pill.label}
                      size="xs"
                      style={{
                        background: pill.bg,
                        color: pill.color,
                        fontWeight: 600,
                        fontSize: 10,
                      }}
                    >
                      {pill.label}
                    </Badge>
                  ))}
                </Group>

                {/* Stats row: event count + needs icons */}
                <Group gap={16} align="center">
                  <Text size="xs" c="var(--color-text-muted)" fw={500}>
                    {report.eventCount} {report.eventCount === 1 ? "Event" : "Events"}
                  </Text>
                  <Box
                    style={{
                      width: 1,
                      height: 12,
                      background: "var(--color-border-dark)",
                      flexShrink: 0,
                    }}
                  />
                  <Group gap={6} align="center">
                    {report.needs.map((needKey) => {
                      const Icon = NEED_ICONS[needKey];
                      if (!Icon) return null;
                      return (
                        <Box
                          key={needKey}
                          title={needKey.charAt(0).toUpperCase() + needKey.slice(1)}
                        >
                          <Icon size={14} color="var(--color-text-muted)" />
                        </Box>
                      );
                    })}
                  </Group>
                </Group>
              </Box>
            </Box>
          );
        })}
      </CardSection>

      {/* Scenario Planning */}
      <CardSection
        title="Scenario Planning"
        subtitle="Projection models"
        action={
          <Button
            size="xs"
            variant="outline"
            color="gray"
            leftSection={<IconPlus size={12} />}
            style={{ fontSize: 12 }}
          >
            New Scenario
          </Button>
        }
      >
        <Box style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {scenarios.map((scenario) => (
            <Box
              key={scenario.name}
              p={12}
              style={{
                border: `1px solid ${scenario.likelihoodColor}30`,
                background: `${scenario.likelihoodBg}60`,
                cursor: "pointer",
              }}
            >
              <Group justify="space-between" mb={6}>
                <Text fw={600} size="sm" c="var(--color-text-primary)">
                  {scenario.name}
                </Text>
                <Badge
                  size="xs"
                  style={{
                    background: scenario.likelihoodBg,
                    color: scenario.likelihoodColor,
                    fontWeight: 700,
                  }}
                >
                  {scenario.likelihood}
                </Badge>
              </Group>
              <Text size="xs" c="var(--color-text-muted)" mb={6}>{scenario.sub}</Text>
              <Text size="xs" c="var(--color-text-secondary)" style={{ lineHeight: 1.5 }}>
                {scenario.description}
              </Text>
            </Box>
          ))}
        </Box>
      </CardSection>
    </SimpleGrid>
  );
}
