"use client";

import { Box, Text, Button } from "@mantine/core";
import { CardSection } from "~/components/ui";
import { DataTable, Table } from "~/components/ui";
import { StatusIndicator } from "~/components/ui";
import type { DjangoPipelineSource } from "~/lib/types/django";

const columns = [
  { label: "Source" },
  { label: "Type" },
  { label: "Status" },
  { label: "Frequency" },
  { label: "Variables" },
];

interface DataSourcesTabProps {
  sources: DjangoPipelineSource[];
  loading: boolean;
}

export function DataSourcesTab({ sources, loading }: DataSourcesTabProps) {
  return (
    <CardSection
      title="Connected Data Sources"
      subtitle={`${sources.length} sources feeding the detection engine`}
      action={
        <Button size="xs" variant="outline" color="gray">
          + Connect Source
        </Button>
      }
      noPadding
    >
      <DataTable
        columns={columns}
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
                  <Text size="xs" c="#737373" lineClamp={1}>
                    {src.description}
                  </Text>
                )}
              </Box>
            </Table.Td>
            <Table.Td>
              <Text c="#525252" style={{ fontSize: 13 }}>
                {src.type}
              </Text>
            </Table.Td>
            <Table.Td>
              <StatusIndicator
                status={src.is_active ? "Online" : "Offline"}
                color={src.is_active ? "#059669" : "#D97706"}
              />
            </Table.Td>
            <Table.Td>
              <Text c="#525252" style={{ fontSize: 13 }}>
                {src.data_frequency}
              </Text>
            </Table.Td>
            <Table.Td>
              <Text c="#525252" style={{ fontSize: 13 }}>
                {src.variable_count ?? "\u2014"}
              </Text>
            </Table.Td>
          </Table.Tr>
        )}
      />
    </CardSection>
  );
}
