"use client";

import { useState, useMemo } from "react";
import { useFormatter, useTranslations } from "next-intl";
import Link from "next/link";
import {
  Box,
  Text,
  Card,
  Loader,
  Group,
} from "@mantine/core";
import { mapSeverity } from "~/lib/types/graphql";
import type { GqlAlert, GqlEvent, GqlSignal } from "~/lib/types/graphql";
import { DataTable, Table, SeverityBadge, FeedToolbar } from "~/components/ui";
import { getDisasterPills } from "~/lib/disaster-types";
import { resolveLocationName } from "~/lib/location";

export type HistorySortOrder = "sev-desc" | "sev-asc" | "newest" | "oldest";

// i18n keys under detection.sort.* - resolved via t() at render time.
export const HISTORY_SORT_LABEL_KEYS: Record<HistorySortOrder, "sevDesc" | "sevAsc" | "newest" | "oldest"> = {
  "sev-desc": "sevDesc",
  "sev-asc":  "sevAsc",
  "newest":   "newest",
  "oldest":   "oldest",
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
  sortOrder: HistorySortOrder;
  onSortChange: (order: HistorySortOrder) => void;
}

const CLASS_STYLES: Record<string, { bg: string; color: string }> = {
  alert:  { bg: "var(--color-critical-light)",  color: "var(--color-critical)" },
  event:  { bg: "var(--color-warning-light)",   color: "var(--color-warning)" },
  signal: { bg: "var(--color-info-light)",      color: "var(--color-info)" },
};

// i18n keys under detection.history.columns.* - resolved via t() at render time.
const COLUMN_KEYS = ["title", "class", "type", "severity", "source", "date", "location"] as const;

export function HistoryTab({ alerts, events, signals, loading, hasMore, isFetchingMore, totalCount, onLoadMore, sortOrder, onSortChange }: HistoryTabProps) {
  const t = useTranslations("detection");
  const format = useFormatter();
  const [search, setSearch] = useState("");

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

    // Client-side sort for correct interleaving of the merged feeds
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
  const count = isSearched
    ? t("history.searchCount", { filtered: filtered.length, loaded: loadedCount })
    : loadedCount < total
      ? `${loadedCount} / ${total}`
      : `${loadedCount}`;

  return (
    <Box>
      <FeedToolbar
        title={t("history.title")}
        count={count}
        loading={loading}
        search={search}
        onSearchChange={setSearch}
        sortOrder={sortOrder}
        sortLabels={Object.fromEntries(Object.entries(HISTORY_SORT_LABEL_KEYS).map(([k, v]) => [k, t(`sort.${v}`)]))}
        onSortChange={(o) => onSortChange(o as HistorySortOrder)}
      />

      <Card p={0} style={{ border: "1px solid var(--color-border)" }}>
        <DataTable
          columns={COLUMN_KEYS.map((k) => ({ label: t(`history.columns.${k}`) }))}
          data={filtered}
          loading={loading}
          emptyMessage={loadedCount === 0 ? t("history.empty") : t("history.noMatch")}
          renderRow={(row) => {
            const sev = rowSeverity(row);
            const cls = CLASS_STYLES[row.kind]!;

            let href = "#";
            let title = t("history.untitled");
            let types: string[] = [];
            let sources: string[] = [];
            let date = "";
            let location: ReturnType<typeof resolveLocationName> = null;

            if (row.kind === "alert") {
              const e = row.data.event;
              href = `/event/${e.id}`;
              title = e.title ?? e.description ?? e.types[0] ?? t("history.untitled");
              types = e.types;
              sources = [...new Set(e.signals.map((s) => s.source.name))];
              date = e.firstSignalCreatedAt;
              location = resolveLocationName(e.generalLocation ?? e.originLocation ?? e.destinationLocation);
            } else if (row.kind === "event") {
              const e = row.data;
              href = `/event/${e.id}`;
              title = e.title ?? e.description ?? e.types[0] ?? t("history.untitled");
              types = e.types;
              sources = [...new Set(e.signals.map((s) => s.source.name))];
              date = e.firstSignalCreatedAt;
              location = resolveLocationName(e.generalLocation ?? e.originLocation ?? e.destinationLocation);
            } else {
              const s = row.data;
              href = `/signal/${s.id}`;
              title = s.title ?? s.description ?? t("feed.signals.untitled");
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
                    {t(`history.classes.${row.kind}`)}
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
                    {format.dateTime(new Date(date), "short")}
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
                {t("history.loadMore")}
              </button>
            )}
          </Box>
        )}
      </Card>
    </Box>
  );
}
