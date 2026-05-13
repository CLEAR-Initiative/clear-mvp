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
  Menu,
  ActionIcon,
  Divider,
  Stack,
} from "@mantine/core";
import {
  IconSearch,
  IconSortDescending,
  IconX,
  IconExternalLink,
} from "@tabler/icons-react";
import type { GqlSignal } from "~/lib/types/graphql";
import { mapSeverity, severityColor } from "~/lib/types/graphql";
import { severityColors, severityLabels } from "~/lib/constants/severity";
import type { MapMarker } from "~/components/map/crisis-map";
import { MapSettingsPopover, type BoundaryLevel } from "~/app/(app)/map/_components/map-settings-popover";
import { useMarkerHover } from "~/hooks/use-marker-hover";
import { formatTimeAgo } from "~/lib/utils";
import { resolveLocationName } from "~/lib/location";

const CrisisMap = dynamic(
  () => import("~/components/map/crisis-map").then((m) => m.CrisisMap),
  { ssr: false, loading: () => <Box w="100%" h="100%" bg="#F5F5F5" /> },
);

// "source" sort was previously client-side only and would only sort the
// current page. Removed for now — re-add once the SignalOrderBy enum on the
// server gains a source-name option.
type SortOrder = "newest" | "oldest";

const SORT_LABELS: Record<SortOrder, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

interface SignalsTabProps {
  signals: GqlSignal[];
  loading: boolean;
  mapMarkers: MapMarker[];
  mapCenter: [number, number];
  mapZoom: number;
  fitBoundsGeometry?: unknown;
  adminBoundaries?: Array<{ id: string; name: string; geometry: unknown }>;
  adminBoundaryLevel?: 1 | 2;
  boundaryLevel?: BoundaryLevel;
  onBoundaryLevelChange?: (level: BoundaryLevel) => void;
  focusCountryPCode?: string;
  focusCountryName?: string;
  focusCountryGeometry?: unknown;
  activeSeverities?: Set<string>;
  activeSources?: Set<string> | null;
  // Lifted to the parent — drives the signalsPage orderBy.
  sortOrder: SortOrder;
  onSortOrderChange: (o: SortOrder) => void;
}

export function SignalsTab({
  signals,
  loading,
  mapMarkers,
  mapCenter,
  mapZoom,
  fitBoundsGeometry,
  adminBoundaries,
  adminBoundaryLevel,
  boundaryLevel = "A1",
  onBoundaryLevelChange,
  focusCountryPCode,
  focusCountryName,
  focusCountryGeometry,
  activeSeverities: activeSeveritiesProp,
  activeSources: activeSourcesProp,
  sortOrder,
  onSortOrderChange,
}: SignalsTabProps) {
  const [search, setSearch] = useState("");
  const activeSources = activeSourcesProp ?? null;
  const activeSeverities = activeSeveritiesProp ?? new Set(["critical", "high", "medium", "low"]);
  const { hoveredMarkerId, getCardProps, onMarkerHover } = useMarkerHover(mapMarkers);



  // Sort is applied server-side by the parent's signalsPage query.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return signals.filter((s) => {
      const sev = mapSeverity(s.severity);
      if (!activeSeverities.has(sev)) return false;
      if (activeSources !== null && !activeSources.has(s.source.name)) return false;
      if (q) {
        const title = (s.title ?? s.description ?? "").toLowerCase();
        const loc = (resolveLocationName(s.generalLocation ?? s.originLocation ?? s.destinationLocation) ?? "").toLowerCase();
        const src = s.source.name.toLowerCase();
        if (!title.includes(q) && !loc.includes(q) && !src.includes(q)) return false;
      }
      return true;
    });
  }, [signals, search, activeSeverities, activeSources]);

  const listCountLabel =
    filtered.length === signals.length
      ? String(signals.length)
      : `${filtered.length}/${signals.length}`;

  return (
    <Box style={{ display: "flex", gap: 24 }}>
      {/* Left: Signal list */}
      <Box style={{ flex: 1, minWidth: 0 }}>
        {/* Toolbar row */}
        <Group gap={8} mb={12} align="center" style={{ minHeight: 32 }}>
          <Group gap={6} style={{ flexShrink: 0 }}>
            <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 14 }}>Signals</Text>
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
            placeholder="Search signals..."
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
                  justifyContent: "center",
                  width: 30,
                  height: 30,
                  borderRadius: 6,
                  border: `1px solid ${sortOrder !== "newest" ? "var(--color-accent)" : "var(--color-border)"}`,
                  background: "var(--color-bg-white)",
                  cursor: "pointer",
                  color: sortOrder !== "newest" ? "var(--color-accent)" : "var(--color-text-secondary)",
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
                  onClick={() => onSortOrderChange(key)}
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

        {/* Signal list - no card header */}
        <Card p={0} style={{ border: "1px solid var(--color-border)" }}>
          <Box style={{ maxHeight: 524, overflowY: "auto" }}>
            {filtered.length === 0 && !loading && (
              <Box px={16} py={32} style={{ textAlign: "center" }}>
                <Text c="var(--color-text-muted)" size="sm">
                  {signals.length === 0 ? "No signals found." : "No signals match your filters."}
                </Text>
              </Box>
            )}
            {filtered.map((signal) => {
              const sev = mapSeverity(signal.severity ?? 0);
              const sevCol = severityColor(signal.severity ?? 0);
              const sevBg = severityColors[sev]?.bg ?? "var(--color-bg-muted)";
              const location =
                signal.generalLocation ?? signal.originLocation ?? signal.destinationLocation;
              const displayTitle =
                signal.title ??
                (signal.description
                  ? signal.description.slice(0, 120) + (signal.description.length > 120 ? "..." : "")
                  : "Untitled signal");

              return (
                <Link
                  key={signal.id}
                  href={`/signal/${signal.id}`}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  <Box
                    px={16}
                    py={12}
                    className="border-b border-[#E5E5E5] hover:bg-[#F9FAFB] cursor-pointer"
                    style={{ display: "flex", gap: 12, ...getCardProps(signal.id).style }}
                    onMouseEnter={getCardProps(signal.id).onMouseEnter}
                    onMouseLeave={getCardProps(signal.id).onMouseLeave}
                  >
                    <Box
                      style={{
                        width: 3,
                        background: sevCol,
                        flexShrink: 0,
                        borderRadius: 2,
                      }}
                    />
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Group justify="space-between" mb={4}>
                        <Group gap={6}>
                          <Badge
                            size="xs"
                            style={{
                              background: sevBg,
                              color: sevCol,
                              fontWeight: 600,
                            }}
                          >
                            {severityLabels[sev]}
                          </Badge>
                          <Badge
                            size="xs"
                            style={{
                              background: "var(--color-bg-muted)",
                              color: "var(--color-text-secondary)",
                              fontWeight: 600,
                            }}
                          >
                            {signal.source.name}
                          </Badge>
                          <Badge
                            size="xs"
                            variant="outline"
                            style={{ color: "var(--color-text-muted)", borderColor: "var(--color-border-dark)", fontSize: 10 }}
                          >
                            {signal.source.type}
                          </Badge>
                        </Group>
                        <Text size="xs" c="var(--color-text-muted)">
                          {formatTimeAgo(signal.publishedAt)}
                        </Text>
                      </Group>
                      <Text fw={600} size="sm" c="var(--color-text-primary)" lineClamp={2} mb={4} style={{ lineHeight: 1.4 }}>
                        {displayTitle}
                      </Text>
                      <Group gap={12}>
                        {resolveLocationName(location) && (
                          <Text size="xs" c="var(--color-text-muted)">{resolveLocationName(location)}</Text>
                        )}
                        <Text size="xs" c="var(--color-text-muted)" style={{ marginLeft: "auto" }}>
                          {formatDate(signal.publishedAt)}
                        </Text>
                        {signal.url && (
                          <a
                            href={signal.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                              fontSize: 11,
                              color: "var(--color-accent)",
                              textDecoration: "none",
                            }}
                          >
                            <IconExternalLink size={11} />
                            Source
                          </a>
                        )}
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
              center={mapCenter}
              zoom={mapZoom}
              className="w-full h-full"
              focusCountryPCode={focusCountryPCode}
              focusCountryName={focusCountryName}
              focusCountryGeometry={focusCountryGeometry}
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
