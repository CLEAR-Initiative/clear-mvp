"use client";

import {
  Box,
  Text,
  Card,
  Group,
  Badge,
  Button,
  SimpleGrid,
} from "@mantine/core";
import { IconAlertTriangle, IconUsers } from "@tabler/icons-react";
import { CardSection } from "~/components/ui";
import {
  currentSituation,
  populationImpact,
  situationReports,
  scenarios,
} from "./analysis-data";

interface ReportsTabProps {
  selectedCountry: string;
  selectedRegion: string;
  summaryStats: { critical: number; total: number };
  realSituationItems: string[] | null;
}

export function ReportsTab({
  selectedCountry,
  selectedRegion,
  summaryStats,
  realSituationItems,
}: ReportsTabProps) {
  return (
    <SimpleGrid cols={2} spacing={16} mb={24}>
      {/* Current Situation */}
      <CardSection
        title="Current Situation"
        subtitle={`${selectedCountry}${selectedRegion !== "All Regions" ? ` - ${selectedRegion}` : ""}`}
        action={
          summaryStats.critical > 0 ? (
            <Badge
              size="xs"
              style={{ background: "#FEE2E2", color: "#DC2626" }}
            >
              {summaryStats.critical} Critical
            </Badge>
          ) : (
            <Badge
              size="xs"
              style={{ background: "#FEE2E2", color: "#DC2626" }}
            >
              Active Outbreak
            </Badge>
          )
        }
      >
        {(realSituationItems ?? currentSituation).map((item, idx) => (
          <Group key={idx} gap={8} mb={8} align="flex-start" wrap="nowrap">
            <Box
              style={{
                width: 6,
                height: 6,
                background: "#DC2626",
                marginTop: 6,
                flexShrink: 0,
              }}
            />
            <Text size="sm" c="#525252" style={{ lineHeight: 1.5 }}>
              {item}
            </Text>
          </Group>
        ))}
      </CardSection>

      {/* Population Impact */}
      <CardSection title="Population Impact" subtitle="Affected demographics">
        <SimpleGrid cols={2} spacing={12} mb={16}>
          <Box
            p={12}
            style={{
              background: "#FEE2E2",
              borderLeft: "3px solid #DC2626",
              textAlign: "center",
            }}
          >
            <Text size="xl" fw={700} c="#DC2626">
              {populationImpact.households.toLocaleString()}
            </Text>
            <Text size="xs" c="#737373" tt="uppercase">
              Households Affected
            </Text>
          </Box>
          <Box
            p={12}
            style={{
              background: "#FEF3C7",
              borderLeft: "3px solid #F59E0B",
              textAlign: "center",
            }}
          >
            <Text size="xl" fw={700} c="#D97706">
              {populationImpact.totalDisplaced.toLocaleString()}
            </Text>
            <Text size="xs" c="#737373" tt="uppercase">
              Total Displaced
            </Text>
          </Box>
        </SimpleGrid>

        <Text
          size="xs"
          fw={600}
          c="#737373"
          tt="uppercase"
          mb={8}
          style={{ letterSpacing: "0.5px" }}
        >
          Vulnerable Groups
        </Text>
        <SimpleGrid cols={3} spacing={8} mb={16}>
          {[
            { label: "Children", value: populationImpact.children },
            { label: "Women", value: populationImpact.women },
            { label: "Elderly", value: populationImpact.elderly },
          ].map((g) => (
            <Box
              key={g.label}
              p={8}
              style={{ background: "#F5F5F5", textAlign: "center" }}
            >
              <Text size="lg" fw={700} c="#171717">
                {g.value.toLocaleString()}
              </Text>
              <Text size="xs" c="#737373">
                {g.label}
              </Text>
            </Box>
          ))}
        </SimpleGrid>

        <Group gap={8} mb={8}>
          <IconAlertTriangle size={14} color="#D97706" />
          <Text size="xs" c="#D97706">
            {populationImpact.infrastructureStress}
          </Text>
        </Group>
        <Group gap={8}>
          <IconUsers size={14} color="#DC2626" />
          <Text size="xs" c="#DC2626">
            {populationImpact.hostCapacity}
          </Text>
        </Group>
      </CardSection>

      {/* Situation Reports */}
      <CardSection
        title="Situation Reports"
        subtitle="AI-generated assessments"
        action={
          <Button size="xs" variant="outline" color="gray">
            View All
          </Button>
        }
      >
        <Box pl={8} style={{ position: "relative" }}>
          {/* Vertical timeline line */}
          <Box
            style={{
              position: "absolute",
              left: 6,
              top: 0,
              bottom: 0,
              width: 2,
              background: "#E5E5E5",
            }}
          />
          {situationReports.map((report) => (
            <Box
              key={report.title}
              mb={16}
              style={{ display: "flex", gap: 12, position: "relative" }}
            >
              <Box
                style={{
                  width: 10,
                  height: 10,
                  background: report.markerColor,
                  marginTop: 4,
                  flexShrink: 0,
                  borderRadius: "50%",
                  position: "relative",
                  zIndex: 1,
                }}
              />
              <Box style={{ flex: 1 }}>
                <Group justify="space-between" mb={4}>
                  <Box>
                    <Text fw={600} c="#171717" style={{ fontSize: 14 }}>
                      {report.title}
                    </Text>
                    <Text size="xs" c="#737373">
                      {report.meta}
                    </Text>
                  </Box>
                  <Badge
                    size="xs"
                    style={{
                      background: report.severityBg,
                      color: report.severityColor,
                    }}
                  >
                    {report.severity}
                  </Badge>
                </Group>
                <Text size="xs" c="#525252" mt={8}>
                  {report.description}
                </Text>
                <Text
                  size="xs"
                  c="#2563EB"
                  mt={8}
                  style={{ cursor: "pointer" }}
                >
                  Read full report &rarr;
                </Text>
              </Box>
            </Box>
          ))}
        </Box>
      </CardSection>

      {/* Scenario Planning (within reports tab) */}
      <CardSection
        title="Scenario Planning"
        subtitle="Projection models"
        action={
          <Button size="xs" variant="outline" color="gray">
            + New Scenario
          </Button>
        }
      >
        {scenarios.map((scenario) => (
          <Box
            key={scenario.name}
            p={16}
            mb={12}
            style={{
              background: "#F9FAFB",
              borderLeft: scenario.highlighted
                ? "3px solid #2563EB"
                : undefined,
            }}
          >
            <Group justify="space-between" mb={12}>
              <Box>
                <Text fw={600} c="#171717">
                  {scenario.name}
                </Text>
                <Text size="xs" c="#525252">
                  {scenario.sub}
                </Text>
              </Box>
              <Text
                size="xs"
                px={8}
                py={2}
                style={{
                  background: scenario.likelihoodBg,
                  color: scenario.likelihoodColor,
                }}
              >
                {scenario.likelihood}
              </Text>
            </Group>
            <Text size="sm" c="#525252" style={{ lineHeight: 1.5 }}>
              {scenario.description}
            </Text>
          </Box>
        ))}
      </CardSection>
    </SimpleGrid>
  );
}
