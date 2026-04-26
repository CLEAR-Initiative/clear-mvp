"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Box,
  Text,
  Card,
  Group,
  Badge,
  Loader,
  TextInput,
  Popover,
  Menu,
  ActionIcon,
  Divider,
  Stack,
} from "@mantine/core";
import {
  IconSearch,
  IconFilter,
  IconSortDescending,
  IconX,
} from "@tabler/icons-react";
import { mapSeverity, severityColor } from "~/lib/types/graphql";
import type { GqlAlert } from "~/lib/types/graphql";
import { MapSettingsPopover, type BoundaryLevel } from "~/app/(app)/map/_components/map-settings-popover";
import { getDisasterPills, getDisasterLabel } from "~/lib/disaster-types";
import { resolveLocationName } from "~/lib/location";
import type { MapMarker, MapRegion } from "~/components/map/crisis-map";
import { severityColors, severityLabels } from "~/lib/constants/severity";
import { useDisasterTypes } from "~/hooks/use-disaster-types";
import { useMarkerHover } from "~/hooks/use-marker-hover";
import { formatTimeAgo } from "~/lib/utils";

const CrisisMap = dynamic(
  () => import("~/components/map/crisis-map").then((m) => m.CrisisMap),
  { ssr: false, loading: () => <Box w="100%" h="100%" bg="#F5F5F5" /> },
);

type SeverityKey = "critical" | "high" | "medium" | "low";
type SortOrder = "sev-desc" | "sev-asc" | "newest" | "oldest";

const SORT_LABELS: Record<SortOrder, string> = {
  "sev-desc": "Severity: High to Low",
  "sev-asc":  "Severity: Low to High",
  "newest":   "Newest first",
  "oldest":   "Oldest first",
};

interface LiveAlertsTabProps {
  alerts: GqlAlert[];
  alertsLoading: boolean;
  mapMarkers: MapMarker[];
  mapRegions?: MapRegion[];
  mapCenter: [number, number];
  mapZoom: number;
  fitBoundsGeometry?: unknown;
  adminBoundaries?: Array<{ id: string; name: string; geometry: unknown }>;
  adminBoundaryLevel?: 1 | 2;
  boundaryLevel?: BoundaryLevel;
  onBoundaryLevelChange?: (level: BoundaryLevel) => void;
  focusCountryPCode?: string;
  focusCountryName?: string;
}

export function LiveAlertsTab({
  alerts,
  alertsLoading,
  mapMarkers,
  mapRegions,
  mapCenter,
  mapZoom,
  fitBoundsGeometry,
  adminBoundaries,
  adminBoundaryLevel,
  boundaryLevel = "A1",
  onBoundaryLevelChange,
  focusCountryPCode,
  focusCountryName,
}: LiveAlertsTabProps) {
  const { getTypeNames } = useDisasterTypes();
  const [search, setSearch] = useState("");
  const [activeSeverities, setActiveSeverities] = useState<Set<SeverityKey>>(
    new Set(["critical", "high", "medium", "low"]),
  );
  const [activeTypes, setActiveTypes] = useState<Set<string> | null>(null);
  const [activeSources, setActiveSources] = useState<Set<string> | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("sev-desc");
  const [filterOpen, setFilterOpen] = useState(false);
  const { hoveredMarkerId, getCardProps, onMarkerHover } = useMarkerHover(mapMarkers);

  const allTypes = useMemo(
    () => [...new Set(alerts.flatMap((a) => a.event.types))].sort(),
    [alerts],
  );

  const allSources = useMemo(
    () => [...new Set(alerts.flatMap((a) => a.event.signals.map((s) => s.source.name)))].sort(),
    [alerts],
  );

  function toggleSeverity(sev: SeverityKey) {
    setActiveSeverities((prev) => {
      const next = new Set(prev);
      next.has(sev) ? next.delete(sev) : next.add(sev);
      return next;
    });
  }

  function toggleType(type: string) {
    setActiveTypes((prev) => {
      const base = prev ?? new Set(allTypes);
      const next = new Set(base);
      next.has(type) ? next.delete(type) : next.add(type);
      return next.size === allTypes.length ? null : next;
    });
  }

  function toggleSource(src: string) {
    setActiveSources((prev) => {
      const base = prev ?? new Set(allSources);
      const next = new Set(base);
      next.has(src) ? next.delete(src) : next.add(src);
      return next.size === allSources.length ? null : next;
    });
  }

  function clearFilters() {
    setSearch("");
    setActiveSeverities(new Set(["critical", "high", "medium", "low"]));
    setActiveTypes(null);
    setActiveSources(null);
    setSortOrder("sev-desc");
  }

  const isFiltered =
    search.trim() !== "" ||
    activeSeverities.size < 4 ||
    activeTypes !== null ||
    activeSources !== null ||
    sortOrder !== "sev-desc";

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let result = alerts.filter((a) => {
      const sev = mapSeverity(a.event.severity);
      if (!activeSeverities.has(sev)) return false;
      if (activeTypes !== null && !a.event.types.some((t) => activeTypes.has(t))) return false;
      if (activeSources !== null && !a.event.signals.some((s) => activeSources.has(s.source.name))) return false;
      if (q) {
        const title = (a.event.title ?? a.event.description ?? a.event.types[0] ?? "").toLowerCase();
        const loc = (a.event.generalLocation?.name ?? a.event.originLocation?.name ?? "").toLowerCase();
        if (!title.includes(q) && !loc.includes(q)) return false;
      }
      return true;
    });

    result = [...result].sort((a, b) => {
      if (sortOrder === "sev-desc") return b.event.rank - a.event.rank;
      if (sortOrder === "sev-asc")  return a.event.rank - b.event.rank;
      if (sortOrder === "newest")
        return new Date(b.event.firstSignalCreatedAt).getTime() - new Date(a.event.firstSignalCreatedAt).getTime();
      return new Date(a.event.firstSignalCreatedAt).getTime() - new Date(b.event.firstSignalCreatedAt).getTime();
    });

    return result;
  }, [alerts, search, activeSeverities, activeTypes, activeSources, sortOrder]);

  const listCountLabel =
    filtered.length === alerts.length
      ? String(alerts.length)
      : `${filtered.length}/${alerts.length}`;

  return (
    <Box style={{ display: "flex", gap: 24 }}>
      {/* Left: Alert list */}
      <Box style={{ flex: 1, minWidth: 0 }}>
        {/* Toolbar row */}
        <Group gap={8} mb={12} align="center" style={{ minHeight: 32 }}>
          <Group gap={6} style={{ flexShrink: 0 }}>
            <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 14 }}>Alerts</Text>
            <Badge
              size="xs"
              style={{
                background: isFiltered ? "var(--color-accent-light)" : "var(--color-bg-muted)",
                color: isFiltered ? "var(--color-accent)" : "var(--color-text-secondary)",
                fontWeight: 600,
              }}
            >
              {listCountLabel}
            </Badge>
            {alertsLoading && <Loader size="xs" />}
          </Group>

          <TextInput
            placeholder="Search alerts..."
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

          <Popover
            opened={filterOpen}
            onChange={setFilterOpen}
            position="bottom-end"
            shadow="md"
            width={240}
          >
            <Popover.Target>
              <button
                onClick={() => setFilterOpen((o) => !o)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 30,
                  height: 30,
                  borderRadius: 6,
                  border: `1px solid ${isFiltered ? "var(--color-accent)" : "var(--color-border)"}`,
                  background: "var(--color-bg-white)",
                  cursor: "pointer",
                  color: isFiltered ? "var(--color-accent)" : "var(--color-text-secondary)",
                  position: "relative",
                  flexShrink: 0,
                }}
              >
                <IconFilter size={13} />
                {isFiltered && (
                  <Box
                    style={{
                      position: "absolute",
                      top: -3,
                      right: -3,
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      background: "var(--color-accent)",
                    }}
                  />
                )}
              </button>
            </Popover.Target>
            <Popover.Dropdown p={16}>
              <Text size="xs" fw={700} c="var(--color-text-primary)" mb={10}>Severity</Text>
              <Group gap={6} mb={14}>
                {(["critical", "high", "medium", "low"] as SeverityKey[]).map((sev) => {
                  const active = activeSeverities.has(sev);
                  const color = severityColor(sev === "critical" ? 5 : sev === "high" ? 4 : sev === "medium" ? 3 : 2);
                  return (
                    <button
                      key={sev}
                      onClick={() => toggleSeverity(sev)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        border: `1px solid ${active ? color : "var(--color-border)"}`,
                        background: active ? `${color}15` : "var(--color-bg-muted)",
                        color: active ? color : "var(--color-text-muted)",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                        textTransform: "capitalize",
                      }}
                    >
                      {sev}
                    </button>
                  );
                })}
              </Group>

              {allTypes.length > 0 && (
                <>
                  <Divider color="var(--color-border)" mb={10} />
                  <Text size="xs" fw={700} c="var(--color-text-primary)" mb={8}>Event Type</Text>
                  <Stack gap={4} mb={4}>
                    {allTypes.map((type) => {
                      const active = activeTypes === null || activeTypes.has(type);
                      return (
                        <button
                          key={type}
                          onClick={() => toggleType(type)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "5px 10px",
                            borderRadius: 6,
                            border: "1px solid",
                            borderColor: active ? "color-mix(in srgb, var(--color-accent) 20%, transparent)" : "var(--color-border)",
                            background: active ? "var(--color-accent-light)" : "var(--color-bg-muted)",
                            color: active ? "var(--color-accent)" : "var(--color-text-muted)",
                            fontSize: 12,
                            fontWeight: 500,
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          {getDisasterLabel(type)}
                          {active && (
                            <Box style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-accent)" }} />
                          )}
                        </button>
                      );
                    })}
                  </Stack>
                </>
              )}

              {allSources.length > 0 && (
                <>
                  <Divider color="var(--color-border)" mb={10} mt={10} />
                  <Text size="xs" fw={700} c="var(--color-text-primary)" mb={8}>Source</Text>
                  <Stack gap={4}>
                    {allSources.map((src) => {
                      const active = activeSources === null || activeSources.has(src);
                      return (
                        <button
                          key={src}
                          onClick={() => toggleSource(src)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "5px 10px",
                            borderRadius: 6,
                            border: "1px solid",
                            borderColor: active ? "color-mix(in srgb, var(--color-accent) 20%, transparent)" : "var(--color-border)",
                            background: active ? "var(--color-accent-light)" : "var(--color-bg-muted)",
                            color: active ? "var(--color-accent)" : "var(--color-text-muted)",
                            fontSize: 12,
                            fontWeight: 500,
                            cursor: "pointer",
                            textAlign: "left",
                          }}
                        >
                          {src}
                          {active && (
                            <Box style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--color-accent)" }} />
                          )}
                        </button>
                      );
                    })}
                  </Stack>
                </>
              )}

              {isFiltered && (
                <>
                  <Divider color="var(--color-border)" my={10} />
                  <button
                    onClick={clearFilters}
                    style={{
                      width: "100%",
                      padding: "6px",
                      borderRadius: 6,
                      border: "1px solid var(--color-border)",
                      background: "var(--color-bg-muted)",
                      color: "var(--color-text-secondary)",
                      fontSize: 12,
                      fontWeight: 500,
                      cursor: "pointer",
                    }}
                  >
                    Clear all filters
                  </button>
                </>
              )}
            </Popover.Dropdown>
          </Popover>

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
                  border: `1px solid ${sortOrder !== "sev-desc" ? "var(--color-accent)" : "var(--color-border)"}`,
                  background: "var(--color-bg-white)",
                  cursor: "pointer",
                  color: sortOrder !== "sev-desc" ? "var(--color-accent)" : "var(--color-text-secondary)",
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

        {/* Alert list - no card header */}
        <Card p={0} style={{ border: "1px solid var(--color-border)" }}>
          <Box style={{ maxHeight: 524, overflowY: "auto" }}>
            {filtered.length === 0 && !alertsLoading && (
              <Box px={16} py={32} style={{ textAlign: "center" }}>
                <Text c="var(--color-text-muted)" size="sm">
                  {alerts.length === 0 ? "No active alerts at this time." : "No alerts match your filters."}
                </Text>
              </Box>
            )}
            {filtered.map((alert) => {
              const sev = mapSeverity(alert.event.severity);
              const sevCol = severityColor(alert.event.severity);
              const sevBg = severityColors[sev]?.bg ?? "var(--color-bg-muted)";
              const location = alert.event.generalLocation ?? alert.event.originLocation ?? alert.event.destinationLocation;
              const sourceName = alert.event.signals[0]?.source?.name;
              const displayTitle = alert.event.title ?? alert.event.description ?? alert.event.types[0] ?? "Untitled alert";

              return (
                <Link
                  key={alert.id}
                  href={`/event/${alert.event.id}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <Box
                    px={16}
                    py={12}
                    className="border-b border-[#E5E5E5] hover:bg-[#F9FAFB] cursor-pointer"
                    style={{ display: "flex", gap: 12, ...getCardProps(alert.event.id).style }}
                    onMouseEnter={getCardProps(alert.event.id).onMouseEnter}
                    onMouseLeave={getCardProps(alert.event.id).onMouseLeave}
                  >
                    <Box style={{ width: 3, background: sevCol, flexShrink: 0, borderRadius: 2 }} />
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Group justify="space-between" mb={4}>
                        <Group gap={6}>
                          <Badge size="xs" style={{ background: sevBg, color: sevCol, fontWeight: 700 }}>
                            {severityLabels[sev]}
                          </Badge>
                          {sourceName && (
                            <Badge size="xs" variant="light" color="gray" style={{ fontSize: 10 }}>
                              {sourceName}
                            </Badge>
                          )}
                        </Group>
                        <Text size="xs" c="var(--color-text-muted)">{formatTimeAgo(alert.event.firstSignalCreatedAt)}</Text>
                      </Group>
                      <Text fw={600} size="sm" c="var(--color-text-primary)" lineClamp={1} mb={4}>
                        {displayTitle}
                      </Text>
                      <Group gap={12}>
                        {resolveLocationName(location) && (
                          <Text size="xs" c="var(--color-text-muted)">{resolveLocationName(location)}</Text>
                        )}
                        {alert.event.types.length > 0 && (
                          <Group gap={4}>{getTypeNames(alert.event.types).map((name) => (
                            <Badge key={name} size="xs" variant="light" color="violet" style={{ fontSize: 9 }}>{name}</Badge>
                          ))}</Group>
                        )}
                        {getDisasterPills(alert.event.types).map((pill) => (
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
                          Rank: <Text span fw={600} c="var(--color-text-primary)">{alert.event.rank.toFixed(1)}</Text>
                        </Text>
                      </Group>
                    </Box>
                  </Box>
                </Link>
              );
            })}
          </Box>
        </Card>
      </Box>

      {/* Right: Crisis Map */}
      <Box style={{ width: 480, flexShrink: 0 }}>
        <Group mb={12} justify="space-between" align="center" style={{ minHeight: 32 }}>
          <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 14 }}>Crisis Map</Text>
          {onBoundaryLevelChange && (
            <MapSettingsPopover boundaryLevel={boundaryLevel} onBoundaryLevelChange={onBoundaryLevelChange} />
          )}
        </Group>
        <Card p={0} style={{ border: "1px solid var(--color-border)", position: "sticky", top: 24 }}>
          <Box style={{ height: 524 }}>
            <CrisisMap
              markers={mapMarkers}
              regions={mapRegions}
              center={mapCenter}
              zoom={mapZoom}
              className="w-full h-full"
              focusCountryPCode={focusCountryPCode}
              focusCountryName={focusCountryName}
              fitBoundsGeometry={fitBoundsGeometry}
              adminBoundaries={adminBoundaries}
              adminBoundaryLevel={adminBoundaryLevel}
              hoveredMarkerId={hoveredMarkerId}
              onMarkerHover={onMarkerHover}
            />
          </Box>
        </Card>
      </Box>
    </Box>
  );
}
