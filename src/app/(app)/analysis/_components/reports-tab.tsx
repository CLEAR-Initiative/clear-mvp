"use client";

import {
  Box,
  Text,
  Group,
  Badge,
  SimpleGrid,
} from "@mantine/core";
import { CardSection } from "~/components/ui";

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
  realSituationItems,
}: ReportsTabProps) {
  const hasData = realSituationItems && realSituationItems.length > 0;

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
          ) : null
        }
      >
        {hasData ? (
          realSituationItems.map((item, idx) => (
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
          ))
        ) : (
          <Text size="sm" c="#737373" ta="center" py={40}>
            No active alerts for this region. Monitoring in progress.
          </Text>
        )}
      </CardSection>

      {/* Summary Stats */}
      <CardSection title="Alert Summary" subtitle="Active monitoring">
        <SimpleGrid cols={2} spacing={12}>
          <Box
            p={16}
            style={{
              background: "#FEE2E2",
              borderLeft: "3px solid #DC2626",
              textAlign: "center",
            }}
          >
            <Text size="xl" fw={700} c="#DC2626">
              {summaryStats.critical}
            </Text>
            <Text size="xs" c="#737373" tt="uppercase">
              Critical Alerts
            </Text>
          </Box>
          <Box
            p={16}
            style={{
              background: "#DBEAFE",
              borderLeft: "3px solid #3B82F6",
              textAlign: "center",
            }}
          >
            <Text size="xl" fw={700} c="#1E40AF">
              {summaryStats.total}
            </Text>
            <Text size="xs" c="#737373" tt="uppercase">
              Total Alerts
            </Text>
          </Box>
        </SimpleGrid>
        {summaryStats.types.length > 0 && (
          <Box mt={16}>
            <Text size="xs" fw={600} c="#737373" tt="uppercase" mb={8}>
              Alert Types
            </Text>
            <Group gap={8}>
              {summaryStats.types.map((type, idx) => (
                <Badge key={idx} size="sm" variant="light" color="blue">
                  {type}
                </Badge>
              ))}
            </Group>
          </Box>
        )}
      </CardSection>
    </SimpleGrid>
  );
}
