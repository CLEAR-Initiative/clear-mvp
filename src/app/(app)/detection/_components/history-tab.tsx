"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Box,
  Text,
  Group,
  TextInput,
  Menu,
  ActionIcon,
  Loader,
} from "@mantine/core";
import {
  IconSearch,
  IconSortDescending,
  IconX,
} from "@tabler/icons-react";
import { mapSeverity } from "~/lib/types/graphql";
import type { GqlAlert, GqlEvent, GqlSignal } from "~/lib/types/graphql";
import { CardSection, DataTable, Table, SeverityBadge } from "~/components/ui";
import { getDisasterPills } from "~/lib/disaster-types";
import { resolveLocationName } from "~/lib/location";

type SortOrder = "sev-desc" | "sev-asc" | "newest" | "oldest";

const SORT_LABELS: Record<SortOrder, string> = {
  "sev-desc": "Severity: High to Low",
  "sev-asc":  "Severity: Low to High",
  "newest":   "Newest first",
  "oldest":   "Oldest first",
};

// Discriminated union for a unified history row
type HistoryRow =
  | { kind: "alert"; id: string; data: GqlAlert }
  | { kind: "event"; id: string; data: GqlEvent }
  | { kind: "signal"; id: string; data: GqlSignal };

function rowDate(row: HistoryRow): number {
  if (row.kind === "alert") return new Date(row.data.event.firstSignalCreatedAt).getTime();
  if (row.kind === "event") return new Date(row.data.firstSignalCreatedAt).getTime();
  return new Date(row.data.publishedAt).getTime();
}

function rowRank(row: HistoryRow): number {
  if (row.kind === "alert") return row.data.event.severity ?? row.data.event.rank * 5;
  if (row.kind === "event") return row.data.severity ?? row.data.rank * 5;
  return row.data.severity ?? 0;
}

function rowSeverity(row: HistoryRow): ReturnType<typeof mapSeverity> {
  if (row.kind === "alert") return mapSeverity(row.data.event.severity);
  if (row.kind === "event") return mapSeverity(row.data.severity);
  return mapSeverity(row.data.severity ?? 0);
}

interface HistoryTabProps {
  alerts: GqlAlert[];
  events: GqlEvent[];
  signals: GqlSignal[];
  loading: boolean;
  hasMore?: boolean;
  isFetchingMore?: boolean;
  totalCount?: number;
  onLoadMore?: () => void;
}

const CLASS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  alert:  { bg: "var(--color-critical-light)",  color: "var(--color-critical)",   label: "Alert" },
  event:  { bg: "var(--color-warning-light)",   color: "var(--color-warning)",    label: "Event" },
  signal: { bg: "var(--color-info-light)",      color: "var(--color-info)",       label: "Signal" },
};

const columns = [
  { label: "Title" },
  { label: "Class" },
  { label: "Type" },
  { label: "Severity" },
  { label: "Source" },
  { label: "Date" },
  { label: "Location" },
];

export function HistoryTab({ alerts, events, signals, loading, hasMore, isFetchingMore, totalCount, onLoadMore }: HistoryTabProps) {
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");

  // Build the unified row list - alerts take priority; events already shown as
  // alerts are excluded; signals are always included separately.
  const allRows = useMemo<HistoryRow[]>(() => {
    const alertEventIds = new Set(alerts.map((a) => a.event.id));
    return [
      ...alerts.map((a): HistoryRow => ({ kind: "alert", id: a.id, data: a })),
      ...events
        .filter((e) => !alertEventIds.has(e.id))
        .map((e): HistoryRow => ({ kind: "event", id: e.id, data: e })),
      ...signals.map((s): HistoryRow => ({ kind: "signal", id: s.id, data: s })),
    ];
  }, [alerts, events, signals]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = allRows;

    if (q) {
      result = result.filter((row) => {
        let title = "";
        let loc = "";
        let src = "";
        if (row.kind === "alert") {
          title = (row.data.event.title ?? row.data.event.description ?? row.data.event.types[0] ?? "").toLowerCase();
          loc = (row.data.event.generalLocation?.name ?? row.data.event.originLocation?.name ?? "").toLowerCase();
          src = row.data.event.signals.map((s) => s.source.name).join(" ").toLowerCase();
        } else if (row.kind === "event") {
          title = (row.data.title ?? row.data.description ?? row.data.types[0] ?? "").toLowerCase();
          loc = (row.data.generalLocation?.name ?? row.data.originLocation?.name ?? "").toLowerCase();
          src = row.data.signals.map((s) => s.source.name).join(" ").toLowerCase();
        } else {
          title = (row.data.title ?? row.data.description ?? "").toLowerCase();
          loc = (row.data.generalLocation?.name ?? row.data.originLocation?.name ?? "").toLowerCase();
          src = row.data.source.name.toLowerCase();
        }
        return title.includes(q) || loc.includes(q) || src.includes(q);
      });
    }

    return [...result].sort((a, b) => {
      if (sortOrder === "sev-desc") return rowRank(b) - rowRank(a);
      if (sortOrder === "sev-asc")  return rowRank(a) - rowRank(b);
      if (sortOrder === "newest")   return rowDate(b) - rowDate(a);
      return rowDate(a) - rowDate(b);
    });
  }, [allRows, search, sortOrder]);

  const loadedCount = allRows.length;
  const total = totalCount ?? loadedCount;
  const isSearched = search.trim() !== "";
  const subtitle = isSearched
    ? `${filtered.length} of ${loadedCount} loaded`
    : loadedCount < total
      ? `${loadedCount} of ${total}`
      : `${loadedCount} items`;

  return (
    <CardSection title="History" subtitle={subtitle} noPadding>
      <Box px={16} pt={12}>
        <Group gap={8} mb={16}>
          <TextInput
            placeholder="Search history..."
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            leftSection={<IconSearch size={14} color="var(--color-text-muted)" />}
            rightSection={
              search ? (
                <ActionIcon size="xs" variant="subtle" color="gray" onClick={() => setSearch("")}>
                  <IconX size={12} />
                </ActionIcon>
              ) : null
            }
            size="xs"
            style={{ flex: 1 }}
            styles={{ input: { fontSize: 13 } }}
          />

          <Menu shadow="md" width={200} position="bottom-end">
            <Menu.Target>
              <button
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 10px",
                  borderRadius: 6,
                  border: `1px solid ${sortOrder !== "newest" ? "var(--color-accent)" : "var(--color-border)"}`,
                  background: "var(--color-bg-white)",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 500,
                  color: sortOrder !== "newest" ? "var(--color-accent)" : "var(--color-text-secondary)",
                }}
              >
                <IconSortDescending size={13} />
                Sort
              </button>
            </Menu.Target>
            <Menu.Dropdown>
              {(Object.entries(SORT_LABELS) as [SortOrder, string][]).map(([key, label]) => (
                <Menu.Item
                  key={key}
                  onClick={() => setSortOrder(key)}
                  style={{
                    fontSize: 12,
                    fontWeight: sortOrder === key ? 600 : 400,
                    color: sortOrder === key ? "var(--color-accent)" : "var(--color-text-primary)",
                  }}
                >
                  {label}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Box>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        emptyMessage={loadedCount === 0 ? "No history available." : "No items match your search."}
        renderRow={(row) => {
          const sev = rowSeverity(row);
          const cls = CLASS_STYLES[row.kind]!;

          let href = "#";
          let title = "Untitled";
          let types: string[] = [];
          let sources: string[] = [];
          let date = "";
          let location: ReturnType<typeof resolveLocationName> = null;

          if (row.kind === "alert") {
            const e = row.data.event;
            href = `/event/${e.id}`;
            title = e.title ?? e.description ?? e.types[0] ?? "Untitled";
            types = e.types;
            sources = [...new Set(e.signals.map((s) => s.source.name))];
            date = e.firstSignalCreatedAt;
            location = resolveLocationName(e.generalLocation ?? e.originLocation ?? e.destinationLocation);
          } else if (row.kind === "event") {
            const e = row.data;
            href = `/event/${e.id}`;
            title = e.title ?? e.description ?? e.types[0] ?? "Untitled";
            types = e.types;
            sources = [...new Set(e.signals.map((s) => s.source.name))];
            date = e.firstSignalCreatedAt;
            location = resolveLocationName(e.generalLocation ?? e.originLocation ?? e.destinationLocation);
          } else {
            const s = row.data;
            href = `/signal/${s.id}`;
            title = s.title ?? s.description ?? "Untitled signal";
            sources = [s.source.name];
            date = s.publishedAt;
            location = resolveLocationName(s.generalLocation ?? s.originLocation ?? s.destinationLocation);
          }

          const disasterPills = getDisasterPills(types);

          return (
            <Table.Tr key={row.id}>
              <Table.Td style={{ minWidth: 180, maxWidth: 280 }}>
                <Link href={href} style={{ textDecoration: "none" }}>
                  <Text fw={600} lineClamp={2} style={{ fontSize: 13, color: "var(--color-text-primary)", lineHeight: 1.4 }}>
                    {title}
                  </Text>
                </Link>
              </Table.Td>
              <Table.Td style={{ whiteSpace: "nowrap" }}>
                <span style={{
                  display: "inline-block",
                  padding: "2px 8px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.03em",
                  textTransform: "uppercase",
                  background: cls.bg,
                  color: cls.color,
                }}>
                  {cls.label}
                </span>
              </Table.Td>
              <Table.Td style={{ minWidth: 80 }}>
                <Group gap={4} wrap="wrap">
                  {disasterPills.map((pill) => (
                    <span
                      key={pill.label}
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 600,
                        color: pill.color,
                        background: pill.bg,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {pill.label}
                    </span>
                  ))}
                </Group>
              </Table.Td>
              <Table.Td style={{ whiteSpace: "nowrap" }}>
                <SeverityBadge severity={sev} />
              </Table.Td>
              <Table.Td style={{ minWidth: 100 }}>
                <Text c="var(--color-text-secondary)" style={{ fontSize: 12 }}>
                  {sources.length > 0 ? sources.join(", ") : "-"}
                </Text>
              </Table.Td>
              <Table.Td style={{ whiteSpace: "nowrap" }}>
                <Text c="var(--color-text-secondary)" style={{ fontSize: 13 }}>
                  {new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </Text>
              </Table.Td>
              <Table.Td style={{ minWidth: 100 }}>
                <Text c="var(--color-text-secondary)" style={{ fontSize: 13 }}>
                  {location ?? "-"}
                </Text>
              </Table.Td>
            </Table.Tr>
          );
        }}
      />
      {(hasMore || isFetchingMore) && (
        <Box px={16} py={12} style={{ borderTop: "1px solid var(--color-border)", display: "flex", justifyContent: "center" }}>
          {isFetchingMore ? (
            <Loader size="xs" color="gray" />
          ) : (
            <button
              onClick={onLoadMore}
              style={{
                padding: "6px 16px",
                borderRadius: 6,
                border: "1px solid var(--color-border)",
                background: "var(--color-bg-white)",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 500,
                color: "var(--color-text-secondary)",
              }}
            >
              Load more
            </button>
          )}
        </Box>
      )}
    </CardSection>
  );
}
