"use client";

import { useTranslations } from "next-intl";
import { Box, Text, Button } from "@mantine/core";
import { CardSection } from "~/components/ui";
import { DataTable, Table } from "~/components/ui";
import { StatusIndicator } from "~/components/ui";
import type { DjangoPipelineSource } from "~/lib/types/django";

// i18n keys under detection.dataSources.columns.* - resolved via t() at render time.
const COLUMN_KEYS = ["source", "type", "status", "frequency", "variables"] as const;

interface DataSourcesTabProps {
  sources: DjangoPipelineSource[];
  loading: boolean;
}

export function DataSourcesTab({ sources, loading }: DataSourcesTabProps) {
  const t = useTranslations("detection");
  return (
    <CardSection
      title={t("dataSources.title")}
      subtitle={t("dataSources.subtitle", { count: sources.length })}
      action={
        <Button size="xs" variant="outline" color="gray">
          {t("dataSources.connectSource")}
        </Button>
      }
      noPadding
    >
      <DataTable
        columns={COLUMN_KEYS.map((k) => ({ label: t(`dataSources.columns.${k}`) }))}
        data={sources}
        loading={loading}
        renderRow={(src) => (
          <Table.Tr key={src.id}>
            <Table.Td>
              <Box>
                <Text fw={600} style={{ fontSize: 13 }}>
                  {src.name}
                </Text>
                {src.description && (
                  <Text size="xs" c="var(--color-text-muted)" lineClamp={1}>
                    {src.description}
                  </Text>
                )}
              </Box>
            </Table.Td>
            <Table.Td>
              <Text c="var(--color-text-secondary)" style={{ fontSize: 13 }}>
                {src.type}
              </Text>
            </Table.Td>
            <Table.Td>
              <StatusIndicator
                status={src.is_active ? t("dataSources.online") : t("dataSources.offline")}
                color={src.is_active ? "#059669" : "#D97706"}
              />
            </Table.Td>
            <Table.Td>
              <Text c="var(--color-text-secondary)" style={{ fontSize: 13 }}>
                {src.data_frequency}
              </Text>
            </Table.Td>
            <Table.Td>
              <Text c="var(--color-text-secondary)" style={{ fontSize: 13 }}>
                {src.variable_count ?? "-"}
              </Text>
            </Table.Td>
          </Table.Tr>
        )}
      />
    </CardSection>
  );
}
