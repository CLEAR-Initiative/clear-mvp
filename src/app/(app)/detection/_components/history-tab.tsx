"use client";

import { Text } from "@mantine/core";
import Link from "next/link";
import { mapSeverity } from "~/lib/types/django";
import type { DjangoAlert } from "~/lib/types/django";
import { CardSection, DataTable, Table, SeverityBadge } from "~/components/ui";

interface HistoryTabProps {
  alerts: DjangoAlert[];
  loading: boolean;
  total: number | undefined;
  count: number | undefined;
}

const columns = [
  { label: "Alert" },
  { label: "Severity" },
  { label: "Type" },
  { label: "Date" },
  { label: "Location" },
];

export function HistoryTab({ alerts, loading, total, count }: HistoryTabProps) {
  const subtitle = total ?? count
    ? `${total ?? count} total alerts`
    : "Past alerts";

  return (
    <CardSection
      title="Alert History"
      subtitle={subtitle}
      noPadding
    >
      <DataTable
        columns={columns}
        data={alerts}
        loading={loading}
        emptyMessage="No alert history available"
        renderRow={(alert) => {
          const sev = mapSeverity(alert.severity);
          return (
            <Table.Tr key={alert.id}>
              <Table.Td>
                <Link
                  href={`/crisis/${alert.id}`}
                  style={{ textDecoration: "none" }}
                >
                  <Text
                    fw={600}
                    style={{ fontSize: 13, color: "#171717" }}
                  >
                    {alert.title}
                  </Text>
                </Link>
              </Table.Td>
              <Table.Td>
                <SeverityBadge severity={sev} />
              </Table.Td>
              <Table.Td>
                <Text c="#525252" style={{ fontSize: 13 }}>
                  {alert.shock_type?.name ?? "\u2014"}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text c="#525252" style={{ fontSize: 13 }}>
                  {new Date(alert.shock_date).toLocaleDateString()}
                </Text>
              </Table.Td>
              <Table.Td>
                <Text c="#525252" style={{ fontSize: 13 }}>
                  {alert.locations?.[0]?.name ?? "\u2014"}
                </Text>
              </Table.Td>
            </Table.Tr>
          );
        }}
      />
    </CardSection>
  );
}
