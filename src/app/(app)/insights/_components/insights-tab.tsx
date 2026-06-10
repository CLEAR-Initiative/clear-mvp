import { useTranslations } from "next-intl";
import { Box, Text, Group, Button, SimpleGrid, Progress } from "@mantine/core";
import { IconPointFilled } from "@tabler/icons-react";
import { CardSection, DataTable, Table } from "~/components/ui";
import { insights, dataQuality } from "./analysis-data";

// i18n keys under analysis.insights.columns.* - resolved via t() at render time.
const DATA_QUALITY_COLUMN_KEYS = [
  "dataSource",
  "completeness",
  "timeliness",
  "confidence",
  "lastUpdate",
] as const;

export function InsightsTab() {
  const t = useTranslations("analysis");
  return (
    <Box>
      {/* AI Insights */}
      <CardSection
        title={t("insights.title")}
        subtitle={t("insights.subtitle")}
        action={
          <Group gap={8}>
            <Button size="xs" variant="outline" color="gray">
              {t("insights.filters.epidemiological")}
            </Button>
            <Button size="xs" variant="light" color="blue">
              {t("insights.filters.allTypes")}
            </Button>
            <Button size="xs" variant="outline" color="gray">
              {t("insights.filters.logistics")}
            </Button>
          </Group>
        }
      >
        <SimpleGrid cols={3} spacing={16}>
          {insights.map((insight) => {
            const Icon = insight.icon;
            return (
              <Box
                key={insight.key}
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
                    {t(`data.insights.${insight.key}.type`)}
                  </Text>
                </Group>
                <Text fw={600} c="var(--color-text-primary)" mb={8}>
                  {t(`data.insights.${insight.key}.title`)}
                </Text>
                <Text size="sm" c="var(--color-text-secondary)" style={{ lineHeight: 1.5 }}>
                  {t(`data.insights.${insight.key}.description`)}
                </Text>
              </Box>
            );
          })}
        </SimpleGrid>
      </CardSection>

      {/* Data Quality Table */}
      <CardSection
        title={t("insights.dataQualityTitle")}
        subtitle={t("insights.dataQualitySubtitle")}
        noPadding
        style={{ marginTop: 24 }}
      >
        <DataTable
          columns={DATA_QUALITY_COLUMN_KEYS.map((k) => ({ label: t(`insights.columns.${k}`) }))}
          data={dataQuality}
          renderRow={(row) => (
            <Table.Tr key={row.key}>
              <Table.Td>
                <Text fw={600} style={{ fontSize: 13 }}>
                  {t(`data.dataQuality.${row.key}.source`)}
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
                    {t(`data.dataQuality.${row.key}.timeliness`)}
                  </Text>
                </Group>
              </Table.Td>
              <Table.Td>
                <Text fw={500} c={row.confidenceColor} style={{ fontSize: 13 }}>
                  {t(`data.dataQuality.${row.key}.confidence`)}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text c="var(--color-text-secondary)" style={{ fontSize: 13 }}>
                  {t(`data.dataQuality.${row.key}.lastUpdate`)}
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
        />
      </CardSection>
    </Box>
  );
}
