import { Box, Text, SimpleGrid, Group, Badge, Button } from "@mantine/core";
import { IconBuildingSkyscraper } from "@tabler/icons-react";
import { CardSection, DataTable, Table, StatusIndicator, ResourceBar } from "~/components/ui";
import {
  nrcCapacity,
  comparativeAdvantages,
  operations,
  fieldTeams,
  resources,
} from "./operations-data";

export function ActiveOpsTab() {
  return (
    <Box>
      {/* NRC Capacity + Comparative Advantage */}
      <SimpleGrid cols={2} spacing={16} mb={24}>
        <CardSection
          title="NRC Ethiopia Capacity"
          subtitle={`Established ${nrcCapacity.established}`}
          icon={<IconBuildingSkyscraper size={16} color="#2563EB" />}
        >
          <SimpleGrid cols={3} spacing={12} mb={12}>
            <Box p={10} style={{ background: "#F5F5F5", textAlign: "center" }}>
              <Text size="lg" fw={700} c="#171717">{nrcCapacity.totalStaff}</Text>
              <Text size="xs" c="#737373">Total Staff</Text>
            </Box>
            <Box p={10} style={{ background: "#F5F5F5", textAlign: "center" }}>
              <Text size="lg" fw={700} c="#171717">{nrcCapacity.national}</Text>
              <Text size="xs" c="#737373">National</Text>
            </Box>
            <Box p={10} style={{ background: "#F5F5F5", textAlign: "center" }}>
              <Text size="lg" fw={700} c="#171717">{nrcCapacity.international}</Text>
              <Text size="xs" c="#737373">International</Text>
            </Box>
          </SimpleGrid>
          <Group gap={16}>
            <Box>
              <Text size="xs" c="#737373">Offices</Text>
              <Text fw={600}>{nrcCapacity.offices}</Text>
            </Box>
            <Box>
              <Text size="xs" c="#737373">Active Programs</Text>
              <Text fw={600}>{nrcCapacity.activePrograms}</Text>
            </Box>
          </Group>
        </CardSection>

        <CardSection
          title="NRC Comparative Advantage"
          subtitle="Core competencies in Ethiopia"
        >
          <Box style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {comparativeAdvantages.map((item) => (
              <Box key={item.label} p={10} style={{ background: "#F5F5F5" }}>
                <Text size="sm" fw={600} c="#171717" mb={2}>{item.label}</Text>
                <Text size="xs" c="#737373">{item.desc}</Text>
              </Box>
            ))}
          </Box>
        </CardSection>
      </SimpleGrid>

      {/* Active Response Operations */}
      <CardSection
        title="Active Response Operations"
        subtitle="Currently mobilized responses"
        noPadding
        style={{ marginBottom: 24 }}
      >
        {operations.map((op, i) => (
          <Box key={op.opId} px={20} py={20} className={i < operations.length - 1 ? "border-b border-[#E5E5E5]" : ""}>
            <Group gap={16} align="flex-start">
              <Box style={{ width: 4, background: op.barColor, alignSelf: "stretch" }} />
              <Box style={{ flex: 1 }}>
                <Group justify="space-between" mb={12}>
                  <Box>
                    <Group gap={8}>
                      <Text fw={600} c="#171717">{op.name}</Text>
                      <Badge size="xs" style={{ background: op.severityBg, color: op.severityColor }}>{op.severity}</Badge>
                    </Group>
                    <Text size="xs" c="#A3A3A3" mt={4}>Activated {op.activated} {"\u2022"} Operation ID: {op.opId}</Text>
                  </Box>
                  <Button size="xs" variant="light" color={op.severity === "Critical" ? "red" : "gray"}>View Details</Button>
                </Group>
                <SimpleGrid cols={4} spacing={16} mb={16}>
                  {[
                    { label: "Teams", value: op.teams },
                    { label: "Staff", value: op.staff },
                    { label: "Coverage", value: op.coverage },
                    { label: "Budget", value: op.budget },
                  ].map((item) => (
                    <Box key={item.label}>
                      <Text size="xs" c="#A3A3A3" tt="uppercase">{item.label}</Text>
                      <Text fw={600} c="#171717">{item.value}</Text>
                    </Box>
                  ))}
                </SimpleGrid>
                <Group gap={8}>
                  {op.tags.map((tag) => (
                    <Text key={tag.label} size="xs" px={8} py={4} style={{ background: tag.bg, color: tag.color }}>
                      {tag.label}
                    </Text>
                  ))}
                </Group>
              </Box>
            </Group>
          </Box>
        ))}
      </CardSection>

      {/* Field Teams + Resource Status */}
      <SimpleGrid cols={2} spacing={16}>
        <CardSection
          title="Field Teams"
          subtitle="Currently deployed"
          action={<Button size="xs" variant="outline" color="gray">+ Deploy Team</Button>}
          noPadding
        >
          <DataTable
            columns={[
              { label: "Team" },
              { label: "Location" },
              { label: "Status" },
              { label: "Last Check-in" },
            ]}
            data={fieldTeams}
            renderRow={(team) => (
              <Table.Tr key={team.name}>
                <Table.Td>
                  <Text fw={500} style={{ fontSize: 13 }}>{team.name}</Text>
                  <Text c="#A3A3A3" style={{ fontSize: 12 }}>{team.members}</Text>
                </Table.Td>
                <Table.Td><Text c="#525252" style={{ fontSize: 13 }}>{team.location}</Text></Table.Td>
                <Table.Td>
                  <StatusIndicator status={team.status} color={team.statusColor} />
                </Table.Td>
                <Table.Td><Text c="#525252" style={{ fontSize: 13 }}>{team.lastCheckin}</Text></Table.Td>
              </Table.Tr>
            )}
          />
        </CardSection>

        <CardSection
          title="Resource Status"
          subtitle="Critical supplies"
          action={<Button size="xs" variant="outline" color="gray">Request Resources</Button>}
        >
          {resources.map((res) => (
            <ResourceBar
              key={res.name}
              name={res.name}
              current={res.current}
              total={res.total}
              color={res.barColor}
              status={res.status}
              statusColor={res.statusColor}
            />
          ))}
        </CardSection>
      </SimpleGrid>
    </Box>
  );
}
