import { useTranslations } from "next-intl";
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
  const t = useTranslations("operations");

  return (
    <Box>
      {/* NRC Capacity + Comparative Advantage */}
      <SimpleGrid cols={2} spacing={16} mb={24}>
        <CardSection
          title={t("capacity.title")}
          subtitle={t("capacity.established", { year: nrcCapacity.established })}
          icon={<IconBuildingSkyscraper size={16} color="#2563EB" />}
        >
          <SimpleGrid cols={3} spacing={12} mb={12}>
            <Box p={10} style={{ background: "var(--color-bg-muted)", textAlign: "center" }}>
              <Text size="lg" fw={700} c="var(--color-text-primary)">{nrcCapacity.totalStaff}</Text>
              <Text size="xs" c="var(--color-text-muted)">{t("capacity.totalStaff")}</Text>
            </Box>
            <Box p={10} style={{ background: "var(--color-bg-muted)", textAlign: "center" }}>
              <Text size="lg" fw={700} c="var(--color-text-primary)">{nrcCapacity.national}</Text>
              <Text size="xs" c="var(--color-text-muted)">{t("capacity.national")}</Text>
            </Box>
            <Box p={10} style={{ background: "var(--color-bg-muted)", textAlign: "center" }}>
              <Text size="lg" fw={700} c="var(--color-text-primary)">{nrcCapacity.international}</Text>
              <Text size="xs" c="var(--color-text-muted)">{t("capacity.international")}</Text>
            </Box>
          </SimpleGrid>
          <Group gap={16}>
            <Box>
              <Text size="xs" c="var(--color-text-muted)">{t("capacity.offices")}</Text>
              <Text fw={600}>{nrcCapacity.offices}</Text>
            </Box>
            <Box>
              <Text size="xs" c="var(--color-text-muted)">{t("capacity.activePrograms")}</Text>
              <Text fw={600}>{nrcCapacity.activePrograms}</Text>
            </Box>
          </Group>
        </CardSection>

        <CardSection
          title={t("advantage.title")}
          subtitle={t("advantage.subtitle")}
        >
          <Box style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {comparativeAdvantages.map((item) => (
              <Box key={item.label} p={10} style={{ background: "var(--color-bg-muted)" }}>
                <Text size="sm" fw={600} c="var(--color-text-primary)" mb={2}>{item.label}</Text>
                <Text size="xs" c="var(--color-text-muted)">{item.desc}</Text>
              </Box>
            ))}
          </Box>
        </CardSection>
      </SimpleGrid>

      {/* Active Response Operations */}
      <CardSection
        title={t("activeOps.title")}
        subtitle={t("activeOps.subtitle")}
        noPadding
        style={{ marginBottom: 24 }}
      >
        {operations.map((op, i) => (
          <Box key={op.opId} px={20} py={20} className={i < operations.length - 1 ? "border-b border-[var(--color-border)]" : ""}>
            <Group gap={16} align="flex-start">
              <Box style={{ width: 4, background: op.barColor, alignSelf: "stretch" }} />
              <Box style={{ flex: 1 }}>
                <Group justify="space-between" mb={12}>
                  <Box>
                    <Group gap={8}>
                      <Text fw={600} c="var(--color-text-primary)">{op.name}</Text>
                      <Badge size="xs" style={{ background: op.severityBg, color: op.severityColor }}>{op.severity}</Badge>
                    </Group>
                    <Text size="xs" c="var(--color-text-muted)" mt={4}>{t("activeOps.activatedLine", { time: op.activated, id: op.opId })}</Text>
                  </Box>
                  <Button size="xs" variant="light" color={op.severity === "Critical" ? "red" : "gray"}>{t("activeOps.viewDetails")}</Button>
                </Group>
                <SimpleGrid cols={4} spacing={16} mb={16}>
                  {[
                    { label: t("activeOps.labels.teams"), value: op.teams },
                    { label: t("activeOps.labels.staff"), value: op.staff },
                    { label: t("activeOps.labels.coverage"), value: op.coverage },
                    { label: t("activeOps.labels.budget"), value: op.budget },
                  ].map((item) => (
                    <Box key={item.label}>
                      <Text size="xs" c="var(--color-text-muted)" tt="uppercase">{item.label}</Text>
                      <Text fw={600} c="var(--color-text-primary)">{item.value}</Text>
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
          title={t("fieldTeams.title")}
          subtitle={t("fieldTeams.subtitle")}
          action={<Button size="xs" variant="outline" color="gray">{t("fieldTeams.deployTeam")}</Button>}
          noPadding
        >
          <DataTable
            columns={[
              { label: t("fieldTeams.columns.team") },
              { label: t("fieldTeams.columns.location") },
              { label: t("fieldTeams.columns.status") },
              { label: t("fieldTeams.columns.lastCheckin") },
            ]}
            data={fieldTeams}
            renderRow={(team) => (
              <Table.Tr key={team.name}>
                <Table.Td>
                  <Text fw={500} style={{ fontSize: 13 }}>{team.name}</Text>
                  <Text c="var(--color-text-muted)" style={{ fontSize: 12 }}>{team.members}</Text>
                </Table.Td>
                <Table.Td><Text c="var(--color-text-secondary)" style={{ fontSize: 13 }}>{team.location}</Text></Table.Td>
                <Table.Td>
                  <StatusIndicator status={team.status} color={team.statusColor} />
                </Table.Td>
                <Table.Td><Text c="var(--color-text-secondary)" style={{ fontSize: 13 }}>{team.lastCheckin}</Text></Table.Td>
              </Table.Tr>
            )}
          />
        </CardSection>

        <CardSection
          title={t("resourceStatus.title")}
          subtitle={t("resourceStatus.subtitle")}
          action={<Button size="xs" variant="outline" color="gray">{t("resourceStatus.requestResources")}</Button>}
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
