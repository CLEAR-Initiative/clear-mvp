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
  Popover,
  ActionIcon,
  Badge,
  Button,
  Divider,
} from "@mantine/core";
import { IconFilter } from "@tabler/icons-react";
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

// Class filter is multi-select over the three discriminated row kinds.
type HistoryClass = HistoryRow["kind"];
const ALL_CLASSES: readonly HistoryClass[] = ["alert", "event", "signal"];

export function HistoryTab({ alerts, events, signals, loading, hasMore, isFetchingMore, totalCount, onLoadMore, sortOrder, onSortChange }: HistoryTabProps) {
  const t = useTranslations("detection");
  const format = useFormatter();
  const [search, setSearch] = useState("");

  // Tab-local filters. These narrow the rows further on top of whatever the
  // page-level filter already applied to the underlying queries — so a user
  // can e.g. flip between "alerts only" and "signals only" without losing
  // their global severity/region/date filters.
  //
  // Default to alerts-only: most history users are scanning escalated items,
  // not raw signals/events. They can broaden via the chip filter.
  const [activeClasses, setActiveClasses] = useState<Set<HistoryClass>>(
    () => new Set<HistoryClass>(["alert"]),
  );
  // null = "all sources allowed"; an empty Set explicitly excludes everything.
  const [activeSources, setActiveSources] = useState<Set<string> | null>(null);
  // Stored as L1 disaster *labels* (e.g. "Conflict", "Flood") — same string
  // the table cell renders via getDisasterPills, so the chip text the user
  // clicks and the pill text they see in the row line up exactly. null = all.
  const [activeEventTypes, setActiveEventTypes] = useState<Set<string> | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

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

  // Source names for every row in the merged feed — fed into the source
  // filter chips and into the search/filter passes below.
  const rowSources = (row: HistoryRow): string[] => {
    if (row.kind === "alert") return row.data.event.signals.map((s) => s.source.name);
    if (row.kind === "event") return row.data.signals.map((s) => s.source.name);
    return [row.data.source.name];
  };

  // Event-type tags. Signal rows have no `types` field, so they return [].
  const rowEventTypes = (row: HistoryRow): string[] => {
    if (row.kind === "alert") return row.data.event.types;
    if (row.kind === "event") return row.data.types;
    return [];
  };

  // Derived option lists for the filter chips, taken from whatever data is
  // currently loaded. New sources/types appear as soon as a row that
  // mentions them lands in the merged feed.
  const allDataSources = useMemo(() => {
    const set = new Set<string>();
    for (const row of allRows) for (const s of rowSources(row)) set.add(s);
    return [...set].sort();
  }, [allRows]);

  // L1 disaster labels for each row. Mirrors the cell renderer below
  // (getDisasterPills(types).map(p => p.label)) so the filter dedupes the
  // same way the table does — e.g. "ec" and "ac" both surface as a single
  // "Conflict" chip / cell pill instead of two raw codes.
  const rowEventLabels = (row: HistoryRow): string[] =>
    getDisasterPills(rowEventTypes(row)).map((p) => p.label);

  const allEventTypes = useMemo(() => {
    const set = new Set<string>();
    for (const row of allRows) for (const label of rowEventLabels(row)) set.add(label);
    return [...set].sort();
  }, [allRows]);

  // Whether the type-filter section is even reachable. Alerts wrap events
  // and carry the same `types[]`, so the filter is meaningful whenever
  // either class is in scope. Signals contribute no types — when only
  // signals are selected the section is hidden because there's nothing to
  // narrow against.
  const typeFilterApplicable = activeClasses.has("event") || activeClasses.has("alert");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = allRows;

    // Class filter — short-circuit early so source/type passes operate on
    // a smaller set when classes are narrowed.
    if (activeClasses.size < ALL_CLASSES.length) {
      result = result.filter((row) => activeClasses.has(row.kind));
    }

    // Source filter (null = no filter). A row passes if any of its sources
    // is in the active set; multi-signal events therefore stay visible as
    // long as one of their signals came from a permitted source.
    if (activeSources !== null) {
      result = result.filter((row) => rowSources(row).some((s) => activeSources.has(s)));
    }

    // Type filter — only meaningful when an "event" row could be in scope.
    // When typeFilterApplicable is false (signal-only view), this whole
    // block is skipped so toggling type chips while looking at signals
    // can't produce surprising hides. Compared against L1 *labels* so the
    // filter and the cell pill key off the same string.
    if (activeEventTypes !== null && typeFilterApplicable) {
      result = result.filter((row) => {
        // Signal rows have no types — they pass through untouched so the
        // event-type filter doesn't hide them when class includes signal.
        if (row.kind === "signal") return true;
        return rowEventLabels(row).some((label) => activeEventTypes.has(label));
      });
    }

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
  }, [allRows, search, sortOrder, activeClasses, activeSources, activeEventTypes, typeFilterApplicable]);

  // Compact summary of which filters are narrowing the view — drives the
  // badge counter on the filter button and the "Clear all" affordance.
  // "Filtering" means "narrower than show-everything", so the alerts-only
  // default reads as one active filter on first render and the badge
  // disappears once the user hits Clear all (which opens every class).
  const filterCount =
    (activeClasses.size < ALL_CLASSES.length ? 1 : 0) +
    (activeSources !== null ? 1 : 0) +
    (activeEventTypes !== null && typeFilterApplicable ? 1 : 0);
  const isFiltered = filterCount > 0;

  const resetFilters = () => {
    // True "clear all" — opens every class, drops the source and type
    // filters. The alerts-only default applies on mount only; once the user
    // chooses to clear, we don't re-impose it.
    setActiveClasses(new Set<HistoryClass>(ALL_CLASSES));
    setActiveSources(null);
    setActiveEventTypes(null);
  };

  const loadedCount = allRows.length;
  const total = totalCount ?? loadedCount;
  const isSearched = search.trim() !== "";
  const count = isSearched
    ? t("history.searchCount", { filtered: filtered.length, loaded: loadedCount })
    : loadedCount < total
      ? `${loadedCount} / ${total}`
      : `${loadedCount}`;

  const filterPopover = (
    <Popover opened={filterOpen} onChange={setFilterOpen} position="bottom-end" shadow="md" width={280} withinPortal>
      <Popover.Target>
        <ActionIcon
          variant="default"
          size={30}
          style={{ position: "relative", border: "1px solid var(--color-border)", borderRadius: 4 }}
          styles={{ root: { overflow: "visible" } }}
          onClick={() => setFilterOpen((o) => !o)}
          title={t("filters.filter")}
        >
          <IconFilter size={13} color={isFiltered ? "var(--color-accent)" : "var(--color-text-muted)"} />
          {isFiltered && (
            <Box style={{ position: "absolute", top: -4, insetInlineEnd: -4, width: 14, height: 14, borderRadius: "50%", background: "var(--color-accent)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2 }}>
              <Text style={{ fontSize: 9, color: "white", fontWeight: 700, lineHeight: 1 }}>{filterCount}</Text>
            </Box>
          )}
        </ActionIcon>
      </Popover.Target>
          <Popover.Dropdown p={14} onMouseDown={(e) => e.stopPropagation()}>
            <Group justify="space-between" mb={10}>
              <Text size="xs" fw={700} tt="uppercase" style={{ fontSize: 10, letterSpacing: "0.06em" }}>{t("filters.title")}</Text>
              {isFiltered && (
                <Button size="compact-xs" variant="subtle" color="gray" onClick={resetFilters}>
                  {t("filters.clearAll")}
                </Button>
              )}
            </Group>

            {/* Class — always shown */}
            <Text size="xs" fw={700} c="var(--color-text-primary)" mb={8}>{t("history.columns.class")}</Text>
            <Group gap={6} mb={12} wrap="wrap">
              {ALL_CLASSES.map((cls) => {
                const active = activeClasses.has(cls);
                return (
                  <Badge
                    key={cls}
                    size="sm"
                    variant={active ? "filled" : "light"}
                    color="dark"
                    style={{ cursor: "pointer", textTransform: "capitalize" }}
                    onClick={() => setActiveClasses((prev) => {
                      const next = new Set(prev);
                      // Don't allow zero classes — that would render an empty view
                      // with no clear way back. Re-arm the toggled class instead.
                      if (next.has(cls) && next.size === 1) return next;
                      if (next.has(cls)) next.delete(cls);
                      else next.add(cls);
                      return next;
                    })}
                  >
                    {t(`history.classes.${cls}`)}
                  </Badge>
                );
              })}
            </Group>

            {/* Source — derived from currently loaded rows */}
            {allDataSources.length > 0 && (
              <>
                <Divider color="var(--color-border)" mb={10} />
                <Text size="xs" fw={700} c="var(--color-text-primary)" mb={8}>{t("history.columns.source")}</Text>
                <Group gap={6} mb={12} wrap="wrap">
                  {allDataSources.map((src) => {
                    // Mirrors the page-level pattern: `null` means "all sources
                    // included", any explicit Set narrows. Toggling the last
                    // remaining source flips back to null so the chip stays
                    // visually active.
                    const active = activeSources === null || activeSources.has(src);
                    return (
                      <Badge
                        key={src}
                        size="sm"
                        variant={active ? "filled" : "light"}
                        color={active ? "dark" : "gray"}
                        style={{ cursor: "pointer", textTransform: "none" }}
                        onClick={() => setActiveSources((prev) => {
                          const base = prev ?? new Set(allDataSources);
                          const next = new Set(base);
                          if (next.has(src)) next.delete(src);
                          else next.add(src);
                          return next.size === allDataSources.length ? null : next;
                        })}
                      >
                        {src}
                      </Badge>
                    );
                  })}
                </Group>
              </>
            )}

            {/* Type — only when "event" class is in scope */}
            {typeFilterApplicable && allEventTypes.length > 0 && (
              <>
                <Divider color="var(--color-border)" mb={10} />
                <Text size="xs" fw={700} c="var(--color-text-primary)" mb={8}>{t("history.columns.type")}</Text>
                <Group gap={6} wrap="wrap">
                  {allEventTypes.map((label) => {
                    const active = activeEventTypes === null || activeEventTypes.has(label);
                    return (
                      <Badge
                        key={label}
                        size="sm"
                        variant={active ? "filled" : "light"}
                        color={active ? "dark" : "gray"}
                        style={{ cursor: "pointer", textTransform: "none" }}
                        onClick={() => setActiveEventTypes((prev) => {
                          const base = prev ?? new Set(allEventTypes);
                          const next = new Set(base);
                          if (next.has(label)) next.delete(label);
                          else next.add(label);
                          return next.size === allEventTypes.length ? null : next;
                        })}
                      >
                        {label}
                      </Badge>
                    );
                  })}
                </Group>
              </>
            )}
      </Popover.Dropdown>
    </Popover>
  );

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
        rightSlot={filterPopover}
      />

      <Card p={0} style={{ border: "1px solid var(--color-border)", overflow: "hidden" }}>
        <Box style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <Box style={{ minWidth: 760 }}>
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
              href = `/event/${e.id}?from=detection`;
              title = e.title ?? e.description ?? e.types[0] ?? t("history.untitled");
              types = e.types;
              sources = [...new Set(e.signals.map((s) => s.source.name))];
              date = e.firstSignalCreatedAt;
              location = resolveLocationName(e.generalLocation ?? e.originLocation ?? e.destinationLocation);
            } else if (row.kind === "event") {
              const e = row.data;
              href = `/event/${e.id}?from=detection`;
              title = e.title ?? e.description ?? e.types[0] ?? t("history.untitled");
              types = e.types;
              sources = [...new Set(e.signals.map((s) => s.source.name))];
              date = e.firstSignalCreatedAt;
              location = resolveLocationName(e.generalLocation ?? e.originLocation ?? e.destinationLocation);
            } else {
              const s = row.data;
              href = `/signal/${s.id}?from=detection`;
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
          </Box>
        </Box>

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
