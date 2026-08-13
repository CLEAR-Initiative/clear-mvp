"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useFormatter, useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Box,
  Text,
  Card,
  Group,
  Badge,
  Loader,
} from "@mantine/core";
import {
  IconMapPin,
} from "@tabler/icons-react";
import { FeedToolbar } from "~/components/ui";
import { DetectionFeedListSkeleton } from "~/components/ui/detection-page-skeleton";
import { mapSeverity, severityColor } from "~/lib/types/graphql";
import type { GqlEvent } from "~/lib/types/graphql";
import { getDisasterPills, getDisasterL2Pills } from "~/lib/disaster-types";
import { resolveLocationName } from "~/lib/location";
import type { MapMarker } from "~/components/map/crisis-map";
import { severityColors, severityLabels } from "~/lib/constants/severity";
import { MapSettingsPopover, type BoundaryLevel } from "~/app/(app)/map/_components/map-settings-popover";
import { MapPanelBar } from "~/app/(app)/map/_components/map-panel-bar";
import { useMarkerHover } from "~/hooks/use-marker-hover";

const CrisisMap = dynamic(
  () => import("~/components/map/crisis-map").then((m) => m.CrisisMap),
  { ssr: false, loading: () => <Box w="100%" h="100%" bg="#F5F5F5" /> },
);

export type EventSortOrder = "sev-desc" | "sev-asc" | "newest" | "oldest";

// i18n keys under detection.sort.* - resolved via t() at render time.
export const EVENT_SORT_LABEL_KEYS: Record<EventSortOrder, "sevDesc" | "sevAsc" | "newest" | "oldest"> = {
  "sev-desc": "sevDesc",
  "sev-asc":  "sevAsc",
  "newest":   "newest",
  "oldest":   "oldest",
};

interface EventsTabProps {
  events: GqlEvent[];
  loading: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  totalCount: number;
  newCount: number;
  sortOrder: EventSortOrder;
  onSortChange: (order: EventSortOrder) => void;
  onLoadMore: () => void;
  onRefresh: () => void;
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
  expandedTypeCodes?: string[] | null;
  activeSources?: Set<string> | null;
}

export function EventsTab({
  events,
  loading,
  isFetchingMore,
  hasMore,
  totalCount = 0,
  newCount = 0,
  sortOrder,
  onSortChange,
  onLoadMore,
  onRefresh,
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
  expandedTypeCodes: expandedTypeCodesProp,
  activeSources: activeSourcesProp,
}: EventsTabProps) {
  const t = useTranslations("detection");
  const format = useFormatter();
  const [search, setSearch] = useState("");
  const { hoveredMarkerId, getCardProps, onMarkerHover } = useMarkerHover(mapMarkers);
  const [showPopulation, setShowPopulation] = useState(false);

  const activeSeverities = activeSeveritiesProp ?? new Set(["critical", "high", "medium", "low"]);
  const activeSources = activeSourcesProp ?? null;

  // Lazy-load sentinel inside the scroll container
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const container = scrollContainerRef.current;
    if (!sentinel || !container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && hasMore && !isFetchingMore) {
          onLoadMore();
        }
      },
      { root: container, threshold: 0.1 },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isFetchingMore, onLoadMore]);

  // Client-side filtering only (search + severity + type + source).
  // Sort is handled server-side - no .sort() here.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      const sev = mapSeverity(e.severity);
      if (!activeSeverities.has(sev)) return false;
      if (expandedTypeCodesProp && !e.types.some((t) => expandedTypeCodesProp.includes(t))) return false;
      if (activeSources !== null && !e.signals.some((s) => activeSources.has(s.source.name))) return false;
      if (q) {
        const title = (e.title ?? e.description ?? e.types[0] ?? "").toLowerCase();
        const loc = (e.generalLocation?.name ?? e.originLocation?.name ?? "").toLowerCase();
        if (!title.includes(q) && !loc.includes(q)) return false;
      }
      return true;
    });
  }, [events, search, activeSeverities, expandedTypeCodesProp, activeSources]);

  const countLabel = search || activeSeverities.size < 4 || activeSources !== null || expandedTypeCodesProp
    ? `${filtered.length} / ${format.number(totalCount)}`
    : format.number(totalCount);

  return (
    <Box style={{ display: "flex", gap: 24 }}>
      {/* Left: Event list */}
      <Box style={{ flex: 1, minWidth: 0 }}>
        <FeedToolbar
          title={t("feed.events.title")}
          count={loading ? "..." : countLabel}
          loading={loading}
          search={search}
          onSearchChange={setSearch}
          sortOrder={sortOrder}
          sortLabels={Object.fromEntries(Object.entries(EVENT_SORT_LABEL_KEYS).map(([k, v]) => [k, t(`sort.${v}`)]))}
          onSortChange={(o) => onSortChange(o as EventSortOrder)}
          newCount={newCount}
          onRefresh={onRefresh}
        />

        <Card p={0} style={{ border: "1px solid var(--color-border)" }}>
          <Box ref={scrollContainerRef} style={{ maxHeight: 524, overflowY: "auto" }}>
            {filtered.length === 0 && !loading && (
              <Box px={16} py={32} style={{ textAlign: "center" }}>
                <Text c="var(--color-text-muted)" size="sm">
                  {events.length === 0 ? t("feed.events.empty") : t("feed.events.noMatch")}
                </Text>
              </Box>
            )}

            {loading && filtered.length === 0 && <DetectionFeedListSkeleton />}

            {filtered.map((event) => {
              const sev = mapSeverity(event.severity);
              const sevCol = severityColor(event.severity);
              const sevBg = severityColors[sev]?.bg ?? "var(--color-bg-muted)";
              const location = event.generalLocation ?? event.originLocation ?? event.destinationLocation;
              const sourceName = event.signals[0]?.source?.name;
              const displayTitle = event.title ?? event.description ?? event.types[0] ?? t("feed.events.untitled");
              const isAlert = event.alerts.length > 0;

              return (
                <Link key={event.id} href={`/event/${event.id}?from=detection`} style={{ textDecoration: "none", color: "inherit" }}>
                  <Box
                    px={16} py={12}
                    className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-muted)] cursor-pointer"
                    style={{ display: "flex", gap: 12, ...getCardProps(event.id).style }}
                    onMouseEnter={getCardProps(event.id).onMouseEnter}
                    onMouseLeave={getCardProps(event.id).onMouseLeave}
                  >
                    <Box style={{ width: 3, background: sevCol, flexShrink: 0, borderRadius: 2 }} />
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Group justify="space-between" mb={4}>
                        <Group gap={6}>
                          <Badge size="xs" style={{ background: sevBg, color: sevCol, fontWeight: 700 }}>
                            {severityLabels[sev]}
                          </Badge>
                          {isAlert && <Badge size="xs" variant="outline" style={{ fontSize: 10, borderColor: "var(--color-critical)", color: "var(--color-critical)" }}>{t("feed.alertBadge")}</Badge>}
                          {sourceName && <Badge size="xs" variant="light" color="gray" style={{ fontSize: 10 }}>{sourceName}</Badge>}
                        </Group>
                        <Text size="xs" c="var(--color-text-muted)" title={t("feed.firstSignal", { time: format.relativeTime(new Date(event.firstSignalCreatedAt)) })}>
                          {format.relativeTime(new Date(event.lastSignalCreatedAt))}
                        </Text>
                      </Group>
                      <Text fw={600} size="sm" c="var(--color-text-primary)" lineClamp={1} mb={4}>
                        {displayTitle}
                      </Text>
                      <Group gap={12}>
                        {resolveLocationName(location) && (
                          <Group gap={3} style={{ flexShrink: 0 }}>
                            <IconMapPin size={11} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
                            <Text size="xs" c="var(--color-text-muted)">{resolveLocationName(location)}</Text>
                          </Group>
                        )}
                        {(() => { const all = [...getDisasterPills(event.types), ...getDisasterL2Pills(event.types)]; return all.filter((p, i) => all.findIndex((q) => q.label === p.label) === i); })().map((pill) => (
                          <span key={pill.label} style={{ display: "inline-block", padding: "1px 7px", borderRadius: 999, fontSize: 10, fontWeight: 600, color: pill.color, background: pill.bg, letterSpacing: "0.01em", whiteSpace: "nowrap" }}>
                            {pill.label}
                          </span>
                        ))}
                        <Text size="xs" c="var(--color-text-muted)" style={{ marginInlineStart: "auto" }}>
                          {t("feed.signalCount", { count: event.signals.length })}
                        </Text>
                      </Group>
                    </Box>
                  </Box>
                </Link>
              );
            })}

            {/* Lazy-load sentinel - IntersectionObserver fires when this enters the scroll viewport */}
            {hasMore && filtered.length > 0 && <div ref={sentinelRef} style={{ height: 1 }} />}

            {isFetchingMore && (
              <Box py={12} style={{ display: "flex", justifyContent: "center" }}>
                <Loader size="xs" />
              </Box>
            )}

            {!hasMore && events.length > 0 && (
              <Box py={10} style={{ textAlign: "center" }}>
                <Text size="xs" c="var(--color-text-muted)">
                  {t("feed.events.allLoaded", { count: totalCount })}
                </Text>
              </Box>
            )}
          </Box>
        </Card>
      </Box>

      {/* Right: Map */}
      <Box style={{ width: 480, flexShrink: 0 }} hiddenFrom="base" visibleFrom="sm">
        <Group mb={12} justify="space-between" align="center" style={{ minHeight: 32 }}>
          <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 14 }}>{t("feed.crisisMap")}</Text>
          {onBoundaryLevelChange && (
            <MapSettingsPopover boundaryLevel={boundaryLevel} onBoundaryLevelChange={onBoundaryLevelChange} />
          )}
        </Group>
        <Card p={0} style={{ border: "1px solid var(--color-border)", position: "sticky", top: 24 }}>
          <Box style={{ height: 524, position: "relative" }}>
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
            <MapPanelBar
              dataView="event"
              onDataViewChange={() => {}}
              showPopulation={showPopulation}
              onShowPopulationChange={setShowPopulation}
              boundaryLevel={boundaryLevel ?? "A1"}
              onBoundaryLevelChange={onBoundaryLevelChange ?? (() => {})}
            />
          </Box>
        </Card>
      </Box>
    </Box>
  );
}
