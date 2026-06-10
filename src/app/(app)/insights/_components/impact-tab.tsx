import { Box, Text, Group, Badge, SimpleGrid } from "@mantine/core";
import { IconAlertTriangle, IconShield } from "@tabler/icons-react";
import { CardSection, DataTable, Table } from "~/components/ui";
import {
  impactAssessment,
  environmentalFactors,
  protectionConcerns,
  secondaryEffects,
} from "./analysis-data";

const SECTOR_COLUMNS = [
  { label: "Sector" },
  { label: "Severity" },
  { label: "Affected" },
  { label: "Details" },
];

export function ImpactTab() {
  return (
    <Box>
      {/* Sector Impact Table */}
      <CardSection
        title="Sector Impact Assessment"
        subtitle="Humanitarian needs by sector"
        noPadding
      >
        <DataTable
          columns={SECTOR_COLUMNS}
          data={impactAssessment}
          renderRow={(item) => {
            const Icon = item.icon;
            return (
              <Table.Tr key={item.sector}>
                <Table.Td>
                  <Group gap={8}>
                    <Box
                      style={{
                        width: 32,
                        height: 32,
                        background: item.severityBg,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon size={16} color={item.severityColor} />
                    </Box>
                    <Text fw={600} style={{ fontSize: 13 }}>
                      {item.sector}
                    </Text>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Badge
                    size="xs"
                    style={{
                      background: item.severityBg,
                      color: item.severityColor,
                      border: `1px solid ${item.severityColor}30`,
                      textTransform: "uppercase",
                    }}
                  >
                    {item.severity}
                  </Badge>
                </Table.Td>
                <Table.Td>
                  <Text fw={700} c={item.severityColor} style={{ fontSize: 13 }}>
                    {item.number.toLocaleString()} {item.unit}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text c="var(--color-text-secondary)" style={{ fontSize: 13 }}>
                    {item.description}
                  </Text>
                </Table.Td>
              </Table.Tr>
            );
          }}
        />
      </CardSection>

      <SimpleGrid cols={2} spacing={16} mt={24} mb={24}>
        {/* Environmental Factors */}
        <CardSection
          title="Environmental Factors"
          subtitle="Climate and environmental risks"
        >
          <Box style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Box
              p={12}
              style={{
                background: "#FEF3C7",
                borderLeft: "3px solid #F59E0B",
              }}
            >
              <Text size="xs" fw={700} c="var(--color-warning)" tt="uppercase" mb={4}>
                Flood Risk
              </Text>
              <Text size="sm" c="var(--color-text-secondary)">
                {environmentalFactors.floodRisk}
              </Text>
            </Box>
            <Box
              p={12}
              style={{
                background: "#DBEAFE",
                borderLeft: "3px solid #3B82F6",
              }}
            >
              <Text size="xs" fw={700} c="var(--color-info)" tt="uppercase" mb={4}>
                Rainfall Forecast
              </Text>
              <Text size="sm" c="var(--color-text-secondary)">
                {environmentalFactors.rainfallForecast}
              </Text>
            </Box>
            <Box
              p={12}
              style={{
                background: "#FEE2E2",
                borderLeft: "3px solid #DC2626",
              }}
            >
              <Text size="xs" fw={700} c="var(--color-critical)" tt="uppercase" mb={4}>
                Secondary Risk
              </Text>
              <Text size="sm" c="var(--color-text-secondary)">
                {environmentalFactors.secondaryRisk}
              </Text>
            </Box>
          </Box>
        </CardSection>

        {/* Protection Concerns */}
        <CardSection
          title="Protection Concerns"
          subtitle="Identified vulnerabilities"
        >
          <Box style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {protectionConcerns.map((concern, idx) => (
              <Group
                key={idx}
                gap={8}
                p={8}
                align="flex-start"
                wrap="nowrap"
                style={{
                  background: "#F5F3FF",
                  borderLeft: "3px solid #7C3AED",
                }}
              >
                <IconShield
                  size={16}
                  color="#7C3AED"
                  style={{ marginTop: 2, flexShrink: 0 }}
                />
                <Text size="sm" c="var(--color-text-secondary)" style={{ lineHeight: 1.5 }}>
                  {concern}
                </Text>
              </Group>
            ))}
          </Box>
        </CardSection>
      </SimpleGrid>

      {/* Secondary Effects */}
      <CardSection
        title="Secondary Effects"
        subtitle="Anticipated cascading impacts"
      >
        <SimpleGrid cols={3} spacing={12}>
          {secondaryEffects.map((effect, idx) => (
            <Box
              key={idx}
              p={12}
              style={{ background: "var(--color-bg-muted)", border: "1px solid var(--color-border)" }}
            >
              <Group gap={8} align="flex-start" wrap="nowrap">
                <IconAlertTriangle
                  size={16}
                  color="#F59E0B"
                  style={{ marginTop: 2, flexShrink: 0 }}
                />
                <Text size="sm" c="var(--color-text-secondary)" style={{ lineHeight: 1.5 }}>
                  {effect}
                </Text>
              </Group>
            </Box>
          ))}
        </SimpleGrid>
      </CardSection>
    </Box>
  );
}
