import { Box, Text, Group, Badge } from "@mantine/core";
import { IconCircleCheck, IconAlertTriangle } from "@tabler/icons-react";
import { CardSection, DataTable, Table, Timeline, type TimelineItem } from "~/components/ui";
import { responsePhases, timeline, riskAssessment } from "./operations-data";

const timelineItems: TimelineItem[] = timeline.map((item) => ({
  title: item.milestone,
  meta: item.day,
  color: item.color,
}));

export function StrategyTab() {
  return (
    <Box>
      {/* Phased Response Strategy */}
      <CardSection
        title="Phased Response Strategy"
        subtitle="Cholera Outbreak Response - Somali Region"
        style={{ marginBottom: 24 }}
      >
        {responsePhases.map((phase) => (
          <Box key={phase.name} mb={20} p={16} style={{ border: `1px solid ${phase.color}30`, borderLeft: `4px solid ${phase.color}`, background: `${phase.colorBg}30` }}>
            <Group justify="space-between" mb={12}>
              <Box>
                <Text fw={600} c="var(--color-text-primary)">{phase.name}</Text>
                <Text size="xs" c="var(--color-text-muted)">{phase.duration}</Text>
              </Box>
              <Text fw={600} c={phase.color} style={{ fontFamily: "monospace" }}>{phase.budget}</Text>
            </Group>
            <Box style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {phase.activities.map((activity, idx) => (
                <Group key={idx} gap={8} align="flex-start" wrap="nowrap">
                  <IconCircleCheck size={14} color={phase.color} style={{ marginTop: 2, flexShrink: 0 }} />
                  <Text size="sm" c="var(--color-text-secondary)">{activity}</Text>
                </Group>
              ))}
            </Box>
          </Box>
        ))}
      </CardSection>

      {/* Implementation Timeline */}
      <CardSection
        title="Implementation Timeline"
        subtitle="Key milestones"
        style={{ marginBottom: 24 }}
      >
        <Timeline items={timelineItems} />
      </CardSection>

      {/* Risk Assessment */}
      <CardSection
        title="Risk Assessment"
        subtitle="Identified risks and mitigations"
        icon={<IconAlertTriangle size={16} color="#F59E0B" />}
        noPadding
      >
        <DataTable
          columns={[
            { label: "Risk" },
            { label: "Severity" },
            { label: "Description" },
            { label: "Mitigation" },
          ]}
          data={riskAssessment}
          renderRow={(r) => (
            <Table.Tr key={r.risk}>
              <Table.Td><Text fw={600} style={{ fontSize: 13 }}>{r.risk}</Text></Table.Td>
              <Table.Td>
                <Badge size="xs" style={{ background: r.severityBg, color: r.severityColor, textTransform: "uppercase" }}>{r.severity}</Badge>
              </Table.Td>
              <Table.Td><Text c="var(--color-text-secondary)" style={{ fontSize: 13 }}>{r.description}</Text></Table.Td>
              <Table.Td><Text c="var(--color-text-secondary)" style={{ fontSize: 13 }}>{r.mitigation}</Text></Table.Td>
            </Table.Tr>
          )}
        />
      </CardSection>
    </Box>
  );
}
