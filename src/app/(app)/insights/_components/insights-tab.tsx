import { Box, Text, Group, Button, SimpleGrid, Progress } from "@mantine/core";
import { IconPointFilled } from "@tabler/icons-react";
import { CardSection, DataTable, Table } from "~/components/ui";
import { insights, dataQuality } from "./analysis-data";

const DATA_QUALITY_COLUMNS = [
  { label: "Data Source" },
  { label: "Completeness" },
  { label: "Timeliness" },
  { label: "Confidence" },
  { label: "Last Update" },
];

export function InsightsTab() {
  return (
    <Box>
      {/* AI Insights */}
      <CardSection
        title="AI-Generated Insights"
        subtitle="Pattern detection and recommendations"
        action={
          <Group gap={8}>
            <Button size="xs" variant="outline" color="gray">
              Epidemiological
            </Button>
            <Button size="xs" variant="light" color="blue">
              All Types
            </Button>
            <Button size="xs" variant="outline" color="gray">
              Logistics
            </Button>
          </Group>
        }
      >
        <SimpleGrid cols={3} spacing={16}>
          {insights.map((insight) => {
            const Icon = insight.icon;
            return (
              <Box
                key={insight.title}
                p={16}
                style={{
                  background: "var(--color-bg-muted)",
                  borderLeft: `3px solid ${insight.borderColor}`,
                }}
              >
                <Group gap={8} mb={8}>
                  <Icon size={16} color={insight.typeColor} />
                  <Text
                    size="xs"
                    fw={600}
                    c={insight.typeColor}
                    tt="uppercase"
                  >
                    {insight.type}
                  </Text>
                </Group>
                <Text fw={600} c="var(--color-text-primary)" mb={8}>
                  {insight.title}
                </Text>
                <Text size="sm" c="var(--color-text-secondary)" style={{ lineHeight: 1.5 }}>
                  {insight.description}
                </Text>
              </Box>
            );
          })}
        </SimpleGrid>
      </CardSection>

      {/* Data Quality Table */}
      <CardSection
        title="Analysis Data Quality"
        subtitle="Source reliability metrics"
        noPadding
        style={{ marginTop: 24 }}
      >
        <DataTable
          columns={DATA_QUALITY_COLUMNS}
          data={dataQuality}
          renderRow={(row) => (
            <Table.Tr key={row.source}>
              <Table.Td>
                <Text fw={600} style={{ fontSize: 13 }}>
                  {row.source}
                </Text>
              </Table.Td>
              <Table.Td>
                <Group gap={8}>
                  <Progress
                    value={row.completeness}
                    size={4}
                    color={row.completeness >= 80 ? "green" : "yellow"}
                    style={{ flex: 1 }}
                  />
                  <Text c="var(--color-text-secondary)" style={{ fontSize: 13 }}>
                    {row.completeness}%
                  </Text>
                </Group>
              </Table.Td>
              <Table.Td>
                <Group gap={6}>
                  <IconPointFilled size={10} color={row.timelinessColor} />
                  <Text c="var(--color-text-secondary)" style={{ fontSize: 13 }}>
                    {row.timeliness}
                  </Text>
                </Group>
              </Table.Td>
              <Table.Td>
                <Text fw={500} c={row.confidenceColor} style={{ fontSize: 13 }}>
                  {row.confidence}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text c="var(--color-text-secondary)" style={{ fontSize: 13 }}>
                  {row.lastUpdate}
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
        />
      </CardSection>
    </Box>
  );
}
