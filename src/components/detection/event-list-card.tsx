"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Box,
  Text,
  Card,
  Group,
  Badge,
  Loader,
  TextInput,
  Menu,
  ActionIcon,
  Popover,
  Button,
  Divider,
} from "@mantine/core";
import { IconSearch, IconSortDescending, IconX, IconFilter } from "@tabler/icons-react";
import { mapSeverity, severityColor } from "~/lib/types/graphql";
import type { GqlEvent } from "~/lib/types/graphql";
import { getDisasterPills } from "~/lib/disaster-types";
import { DisasterTypePicker, expandSelectionsToCodes } from "~/components/disaster-type-picker";
import { resolveLocationName } from "~/lib/location";
import { severityColors, severityLabels } from "~/lib/constants/severity";
import { useDisasterTypes } from "~/hooks/use-disaster-types";
import { formatTimeAgo } from "~/lib/utils";
import { api } from "~/trpc/react";

type SortOrder = "sev-desc" | "sev-asc" | "newest" | "oldest";

const SORT_LABELS: Record<SortOrder, string> = {
  "sev-desc": "Severity: High to Low",
  "sev-asc": "Severity: Low to High",
  newest: "Newest first",
  oldest: "Oldest first",
};

const PAGE_SIZE = 5;

interface CardProps {
  style?: React.CSSProperties;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

export interface EventListCardProps {
  events: GqlEvent[];
  loading: boolean;
  /** When true (default), renders self-contained filter popover + load-more. */
  showFilter?: boolean;
  /** Controlled filter props — used when showFilter=false (e.g. Detection page). */
  activeSeverities?: Set<string>;
  expandedTypeCodes?: string[] | null;
  activeSources?: Set<string> | null;
  /** Optional: pass from useMarkerHover to sync hover state with a map. */
  getCardProps?: (id: string) => CardProps;
  defaultSortOrder?: SortOrder;
}

export function EventListCard({
  events,
  loading,
  showFilter = true,
  activeSeverities: activeSeveritiesProp,
  expandedTypeCodes: expandedTypeCodesProp,
  activeSources: activeSourcesProp,
  getCardProps,
  defaultSortOrder = "newest",
}: EventListCardProps) {
  const { getTypeNames } = useDisasterTypes();
  const [search, setSearch] = useState("");
  const [sortOrder, setSortOrder] = useState<SortOrder>(defaultSortOrder);
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [filterOpen, setFilterOpen] = useState(false);

  // Internal filter state — only active when showFilter=true
  const [internalSeverities, setInternalSeverities] = useState<Set<string>>(
    new Set(["critical", "high", "medium", "low"]),
  );
  const [internalTypeFilters, setInternalTypeFilters] = useState<string[]>([]);
  const [internalSources, setInternalSources] = useState<Set<string> | null>(null);

  const hierarchyQuery = api.alerts.getDisasterTypeHierarchy.useQuery(undefined, {
    enabled: showFilter,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const hierarchy = hierarchyQuery.data ?? [];

  // Resolve active filters — internal when self-contained, props when controlled
  const activeSeverities = showFilter
    ? internalSeverities
    : (activeSeveritiesProp ?? new Set(["critical", "high", "medium", "low"]));
  const internalExpandedCodes = useMemo(
    () =>
      internalTypeFilters.length > 0 ? expandSelectionsToCodes(internalTypeFilters, hierarchy) : null,
    [internalTypeFilters, hierarchy],
  );
  const activeTypeCodes = showFilter ? internalExpandedCodes : expandedTypeCodesProp;
  const activeSources = showFilter ? internalSources : (activeSourcesProp ?? null);

  const allSources = useMemo(
    () => [...new Set(events.flatMap((e) => e.signals.map((s) => s.source.name)))].sort(),
    [events],
  );

  const isFiltered = showFilter
    ? internalSeverities.size < 4 || internalTypeFilters.length > 0 || internalSources !== null
    : false;

  const filterCount =
    (internalSeverities.size < 4 ? 1 : 0) +
    (internalTypeFilters.length > 0 ? 1 : 0) +
    (internalSources !== null ? 1 : 0);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = events.filter((e) => {
      const sev = mapSeverity(e.severity);
      if (!activeSeverities.has(sev)) return false;
      if (activeTypeCodes && !e.types.some((t) => activeTypeCodes.includes(t))) return false;
      if (activeSources !== null && !e.signals.some((s) => activeSources.has(s.source.name)))
        return false;
      if (q) {
        const title = (e.title ?? e.description ?? e.types[0] ?? "").toLowerCase();
        const loc = (e.generalLocation?.name ?? e.originLocation?.name ?? "").toLowerCase();
        if (!title.includes(q) && !loc.includes(q)) return false;
      }
      return true;
    });

    result = [...result].sort((a, b) => {
      if (sortOrder === "sev-desc") return b.rank - a.rank;
      if (sortOrder === "sev-asc") return a.rank - b.rank;
      if (sortOrder === "newest")
        return new Date(b.firstSignalCreatedAt).getTime() - new Date(a.firstSignalCreatedAt).getTime();
      return new Date(a.firstSignalCreatedAt).getTime() - new Date(b.firstSignalCreatedAt).getTime();
    });

    return result;
  }, [events, search, activeSeverities, activeTypeCodes, activeSources, sortOrder]);

  // Reset page whenever filters change
  useEffect(() => {
    setDisplayCount(PAGE_SIZE);
  }, [search, activeSeverities, activeTypeCodes, activeSources, sortOrder]);

  const displayed = showFilter ? filtered.slice(0, displayCount) : filtered;
  const hasMore = showFilter && displayCount < filtered.length;
  const remaining = filtered.length - displayCount;

  const listCountLabel =
    filtered.length === events.length
      ? String(events.length)
      : `${filtered.length}/${events.length}`;

  const noGetCardProps = (_id: string): CardProps => ({});

  return (
    <Box style={{ flex: 1, minWidth: 0 }}>
      {/* Toolbar */}
      <Group gap={8} mb={12} align="center" style={{ minHeight: 32 }}>
        <Group gap={6} style={{ flexShrink: 0 }}>
          <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 14 }}>
            Events
          </Text>
          <Badge
            size="xs"
            style={{
              background: "var(--color-bg-muted)",
              color: "var(--color-text-secondary)",
              fontWeight: 600,
            }}
          >
            {listCountLabel}
          </Badge>
          {loading && <Loader size="xs" />}
        </Group>

        <TextInput
          placeholder="Search events..."
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

        {/* Self-contained filter popover */}
        {showFilter && (
          <Popover
            opened={filterOpen}
            onChange={setFilterOpen}
            position="bottom-end"
            shadow="md"
            width={270}
            withinPortal
          >
            <Popover.Target>
              <ActionIcon
                variant="default"
                size={30}
                style={{
                  position: "relative",
                  border: `1px solid ${isFiltered ? "var(--color-accent)" : "#E5E5E5"}`,
                  borderRadius: 4,
                  flexShrink: 0,
                }}
                onClick={() => setFilterOpen((o) => !o)}
                title="Filter"
              >
                <IconFilter size={13} color={isFiltered ? "var(--color-accent)" : "var(--color-text-muted)"} />
                {isFiltered && (
                  <Box
                    style={{
                      position: "absolute",
                      top: -4,
                      right: -4,
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      background: "var(--color-accent)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontSize: 9, color: "white", fontWeight: 700, lineHeight: 1 }}>
                      {filterCount}
                    </Text>
                  </Box>
                )}
              </ActionIcon>
            </Popover.Target>
            <Popover.Dropdown p={14} onMouseDown={(e) => e.stopPropagation()}>
              <Group justify="space-between" mb={10}>
                <Text size="xs" fw={700} tt="uppercase" style={{ fontSize: 10, letterSpacing: "0.06em" }}>
                  Filters
                </Text>
                {isFiltered && (
                  <Button
                    size="compact-xs"
                    variant="subtle"
                    color="gray"
                    onClick={() => {
                      setInternalSeverities(new Set(["critical", "high", "medium", "low"]));
                      setInternalTypeFilters([]);
                      setInternalSources(null);
                    }}
                  >
                    Clear all
                  </Button>
                )}
              </Group>

              <Text size="xs" fw={700} c="var(--color-text-primary)" mb={8}>
                Severity
              </Text>
              <Group gap={6} mb={12} wrap="wrap">
                {(["critical", "high", "medium", "low"] as const).map((sev) => {
                  const active = internalSeverities.has(sev);
                  return (
                    <Badge
                      key={sev}
                      size="sm"
                      variant={active ? "filled" : "light"}
                      color={
                        sev === "critical"
                          ? "red"
                          : sev === "high"
                            ? "orange"
                            : sev === "medium"
                              ? "yellow"
                              : "green"
                      }
                      style={{ cursor: "pointer", textTransform: "capitalize" }}
                      onClick={() =>
                        setInternalSeverities((prev) => {
                          const next = new Set(prev);
                          next.has(sev) ? next.delete(sev) : next.add(sev);
                          return next;
                        })
                      }
                    >
                      {sev.charAt(0).toUpperCase() + sev.slice(1)}
                    </Badge>
                  );
                })}
              </Group>

              <Divider color="var(--color-border)" mb={10} />
              <Text size="xs" fw={700} c="var(--color-text-primary)" mb={8}>
                Event Type
              </Text>
              <DisasterTypePicker
                hierarchy={hierarchy}
                selected={internalTypeFilters}
                onChange={setInternalTypeFilters}
                size="xs"
              />

              {allSources.length > 0 && (
                <>
                  <Divider color="var(--color-border)" my={10} />
                  <Text size="xs" fw={700} c="var(--color-text-primary)" mb={8}>
                    Source
                  </Text>
                  <Group gap={6} wrap="wrap">
                    {allSources.map((src) => {
                      const active = internalSources === null || internalSources.has(src);
                      return (
                        <Badge
                          key={src}
                          size="sm"
                          variant={active ? "filled" : "light"}
                          color={active ? "dark" : "gray"}
                          style={{ cursor: "pointer", textTransform: "none" }}
                          onClick={() =>
                            setInternalSources((prev) => {
                              const base = prev ?? new Set(allSources);
                              const next = new Set(base);
                              next.has(src) ? next.delete(src) : next.add(src);
                              return next.size === allSources.length ? null : next;
                            })
                          }
                        >
                          {src}
                        </Badge>
                      );
                    })}
                  </Group>
                </>
              )}
            </Popover.Dropdown>
          </Popover>
        )}

        <Menu shadow="md" width={200} position="bottom-end">
          <Menu.Target>
            <button
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 30,
                height: 30,
                borderRadius: 6,
                border: `1px solid ${sortOrder !== defaultSortOrder ? "var(--color-accent)" : "var(--color-border)"}`,
                background: "var(--color-bg-white)",
                cursor: "pointer",
                color:
                  sortOrder !== defaultSortOrder
                    ? "var(--color-accent)"
                    : "var(--color-text-secondary)",
                flexShrink: 0,
              }}
            >
              <IconSortDescending size={13} />
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

      {/* List */}
      <Card p={0} style={{ border: "1px solid var(--color-border)" }}>
        <Box style={showFilter ? undefined : { maxHeight: 524, overflowY: "auto" }}>
          {displayed.length === 0 && !loading && (
            <Box px={16} py={32} style={{ textAlign: "center" }}>
              <Text c="var(--color-text-muted)" size="sm">
                {events.length === 0 ? "No events found." : "No events match your filters."}
              </Text>
            </Box>
          )}
          {displayed.map((event) => {
            const sev = mapSeverity(event.severity);
            const sevCol = severityColor(event.severity);
            const sevBg = severityColors[sev]?.bg ?? "var(--color-bg-muted)";
            const location =
              event.generalLocation ?? event.originLocation ?? event.destinationLocation;
            const sourceName = event.signals[0]?.source?.name;
            const displayTitle =
              event.title ?? event.description ?? event.types[0] ?? "Untitled event";
            const isAlert = event.alerts.length > 0;
            const cardProps = (getCardProps ?? noGetCardProps)(event.id);

            return (
              <Link
                key={event.id}
                href={`/event/${event.id}`}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <Box
                  px={16}
                  py={12}
                  className="border-b border-[#E5E5E5] hover:bg-[#F9FAFB] cursor-pointer"
                  style={{ display: "flex", gap: 12, ...cardProps.style }}
                  onMouseEnter={cardProps.onMouseEnter}
                  onMouseLeave={cardProps.onMouseLeave}
                >
                  <Box style={{ width: 3, background: sevCol, flexShrink: 0, borderRadius: 2 }} />
                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Group justify="space-between" mb={4}>
                      <Group gap={6}>
                        <Badge
                          size="xs"
                          style={{ background: sevBg, color: sevCol, fontWeight: 700 }}
                        >
                          {severityLabels[sev]}
                        </Badge>
                        {isAlert && (
                          <Badge size="xs" variant="filled" color="red" style={{ fontSize: 10 }}>
                            Alert
                          </Badge>
                        )}
                        {sourceName && (
                          <Badge size="xs" variant="light" color="gray" style={{ fontSize: 10 }}>
                            {sourceName}
                          </Badge>
                        )}
                      </Group>
                      <Text size="xs" c="var(--color-text-muted)">
                        {formatTimeAgo(event.firstSignalCreatedAt)}
                      </Text>
                    </Group>
                    <Text fw={600} size="sm" c="var(--color-text-primary)" lineClamp={1} mb={4}>
                      {displayTitle}
                    </Text>
                    <Group gap={12}>
                      {resolveLocationName(location) && (
                        <Text size="xs" c="var(--color-text-muted)">
                          {resolveLocationName(location)}
                        </Text>
                      )}
                      {event.types.length > 0 && (
                        <Group gap={4}>
                          {getTypeNames(event.types).map((name) => (
                            <Badge
                              key={name}
                              size="xs"
                              variant="light"
                              color="violet"
                              style={{ fontSize: 9 }}
                            >
                              {name}
                            </Badge>
                          ))}
                        </Group>
                      )}
                      {getDisasterPills(event.types).map((pill) => (
                        <span
                          key={pill.label}
                          style={{
                            display: "inline-block",
                            padding: "1px 7px",
                            borderRadius: 999,
                            fontSize: 10,
                            fontWeight: 600,
                            color: pill.color,
                            background: pill.bg,
                            letterSpacing: "0.01em",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {pill.label}
                        </span>
                      ))}
                      <Text size="xs" c="var(--color-text-muted)" style={{ marginLeft: "auto" }}>
                        {event.signals.length} signal{event.signals.length !== 1 ? "s" : ""}
                      </Text>
                    </Group>
                  </Box>
                </Box>
              </Link>
            );
          })}

          {/* Load more */}
          {hasMore && (
            <Box
              py={12}
              style={{ textAlign: "center", borderTop: "1px solid var(--color-border)" }}
            >
              <Button
                variant="subtle"
                color="gray"
                size="xs"
                onClick={() => setDisplayCount((c) => c + PAGE_SIZE)}
              >
                Load {Math.min(remaining, PAGE_SIZE)} more&ensp;
                <Text span c="var(--color-text-muted)" style={{ fontSize: 11 }}>
                  ({remaining} remaining)
                </Text>
              </Button>
            </Box>
          )}
        </Box>
      </Card>
    </Box>
  );
}
