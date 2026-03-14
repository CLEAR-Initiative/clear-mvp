"use client";

import { useState } from "react";
import Link from "next/link";
import { Text } from "@mantine/core";
import { mapSeverity } from "~/lib/types/graphql";
import type { GqlAlert } from "~/lib/types/graphql";
import { CardSection, DataTable, Table, SeverityBadge } from "~/components/ui";
import { useListFilters } from "./use-list-filters";
import { ListFilterBar } from "./list-filter-bar";

interface HistoryTabProps {
  alerts: GqlAlert[];
  loading: boolean;
  total: number | undefined;
  count: number | undefined;
}

const columns = [
  { label: "Alert" },
  { label: "Severity" },
  { label: "Status" },
  { label: "Date" },
  { label: "Location" },
];

export function HistoryTab({ alerts, loading, total, count }: HistoryTabProps) {
  const [filterOpen, setFilterOpen] = useState(false);
  const {
    search, setSearch,
    activeSeverities, toggleSeverity,
    activeTypes, allTypes, toggleType,
    sortOrder, setSortOrder,
    isFiltered, clearFilters,
    filtered,
  } = useListFilters(alerts);

  const totalCount = total ?? count;
  const subtitle = isFiltered
    ? `${filtered.length} of ${totalCount ?? alerts.length} alerts`
    : totalCount
    ? `${totalCount} total alerts`
    : "Past alerts";

  return (
    <>
      <ListFilterBar
        search={search}
        onSearchChange={setSearch}
        activeSeverities={activeSeverities}
        onToggleSeverity={toggleSeverity}
        activeTypes={activeTypes}
        allTypes={allTypes}
        onToggleType={toggleType}
        sortOrder={sortOrder}
        onSortChange={setSortOrder}
        isFiltered={isFiltered}
        onClearFilters={clearFilters}
        filterOpen={filterOpen}
        onFilterOpenChange={setFilterOpen}
        searchPlaceholder="Search history..."
      />

      <CardSection title="Alert History" subtitle={subtitle} noPadding>
        <DataTable
          columns={columns}
          data={filtered}
          loading={loading}
          emptyMessage={alerts.length === 0 ? "No alert history available" : "No alerts match your filters."}
          renderRow={(alert) => {
            const sev = mapSeverity(alert.severity);
            return (
              <Table.Tr key={alert.id}>
                <Table.Td>
                  <Link href={`/event/${alert.id}`} style={{ textDecoration: "none" }}>
                    <Text fw={600} style={{ fontSize: 13, color: "#171717" }}>
                      {alert.description ?? alert.eventType}
                    </Text>
                  </Link>
                </Table.Td>
                <Table.Td>
                  <SeverityBadge severity={sev} />
                </Table.Td>
                <Table.Td>
                  <Text c="#525252" style={{ fontSize: 13 }}>{alert.status}</Text>
                </Table.Td>
                <Table.Td>
                  <Text c="#525252" style={{ fontSize: 13 }}>
                    {new Date(alert.createdAt).toLocaleDateString()}
                  </Text>
                </Table.Td>
                <Table.Td>
                  <Text c="#525252" style={{ fontSize: 13 }}>
                    {alert.locations?.[0]?.location.name ?? "\u2014"}
                  </Text>
                </Table.Td>
              </Table.Tr>
            );
          }}
        />
      </CardSection>
    </>
  );
}
