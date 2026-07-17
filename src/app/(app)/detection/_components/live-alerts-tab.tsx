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
import { mapSeverity, severityColor } from "~/lib/types/graphql";
import type { GqlAlert } from "~/lib/types/graphql";
import { MapSettingsPopover, type BoundaryLevel } from "~/app/(app)/map/_components/map-settings-popover";
import { MapPanelBar } from "~/app/(app)/map/_components/map-panel-bar";
import { getDisasterPills, getDisasterL2Pills } from "~/lib/disaster-types";
import { resolveLocationName } from "~/lib/location";
import type { MapMarker } from "~/components/map/crisis-map";
import { severityColors, severityLabels } from "~/lib/constants/severity";
import { useMarkerHover } from "~/hooks/use-marker-hover";

const CrisisMap = dynamic(
  () => import("~/components/map/crisis-map").then((m) => m.CrisisMap),
  { ssr: false, loading: () => <Box w="100%" h="100%" bg="#F5F5F5" /> },
);

export type AlertSortOrder = "sev-desc" | "sev-asc" | "newest" | "oldest";

// i18n keys under detection.sort.* - resolved via t() at render time.
export const ALERT_SORT_LABEL_KEYS: Record<AlertSortOrder, "sevDesc" | "sevAsc" | "newest" | "oldest"> = {
  "sev-desc": "sevDesc",
  "sev-asc":  "sevAsc",
  "newest":   "newest",
  "oldest":   "oldest",
};

interface LiveAlertsTabProps {
  alerts: GqlAlert[];
  alertsLoading: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  totalCount: number;
  newCount: number;
  sortOrder: AlertSortOrder;
  onSortChange: (order: AlertSortOrder) => void;
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

export function LiveAlertsTab({
  alerts,
  alertsLoading,
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
}: LiveAlertsTabProps) {
  const t = useTranslations("detection");
  const format = useFormatter();
  const [search, setSearch] = useState("");
  const { hoveredMarkerId, getCardProps, onMarkerHover } = useMarkerHover(mapMarkers);
  const [showPopulation, setShowPopulation] = useState(false);

  const activeSeverities = activeSeveritiesProp ?? new Set(["critical", "high", "medium", "low"]);
  const activeSources = activeSourcesProp ?? null;

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

  // Client-side filtering only - sort is server-side.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return alerts.filter((a) => {
      const sev = mapSeverity(a.event.severity);
      if (!activeSeverities.has(sev)) return false;
      if (expandedTypeCodesProp && !a.event.types.some((t) => expandedTypeCodesProp.includes(t))) return false;
      if (activeSources !== null && !a.event.signals.some((s) => activeSources.has(s.source.name))) return false;
      if (q) {
        const title = (a.event.title ?? a.event.description ?? a.event.types[0] ?? "").toLowerCase();
        const loc = (a.event.generalLocation?.name ?? a.event.originLocation?.name ?? "").toLowerCase();
        if (!title.includes(q) && !loc.includes(q)) return false;
      }
      return true;
    });
  }, [alerts, search, activeSeverities, expandedTypeCodesProp, activeSources]);

  const countLabel = search || activeSeverities.size < 4 || activeSources !== null || expandedTypeCodesProp
    ? `${filtered.length} / ${format.number(totalCount)}`
    : format.number(totalCount);

  return (
    <Box style={{ display: "flex", gap: 24 }}>
      <Box style={{ flex: 1, minWidth: 0 }}>
        <FeedToolbar
          title={t("feed.alerts.title")}
          count={alertsLoading ? "..." : countLabel}
          loading={alertsLoading}
          search={search}
          onSearchChange={setSearch}
          sortOrder={sortOrder}
          sortLabels={Object.fromEntries(Object.entries(ALERT_SORT_LABEL_KEYS).map(([k, v]) => [k, t(`sort.${v}`)]))}
          onSortChange={(o) => onSortChange(o as AlertSortOrder)}
          newCount={newCount}
          onRefresh={onRefresh}
        />

        <Card p={0} style={{ border: "1px solid var(--color-border)" }}>
          <Box ref={scrollContainerRef} style={{ maxHeight: 524, overflowY: "auto" }}>
            {filtered.length === 0 && !alertsLoading && (
              <Box px={16} py={32} style={{ textAlign: "center" }}>
                <Text c="var(--color-text-muted)" size="sm">
                  {alerts.length === 0 ? t("feed.alerts.empty") : t("feed.alerts.noMatch")}
                </Text>
              </Box>
            )}

            {filtered.map((alert) => {
              const sev = mapSeverity(alert.event.severity);
              const sevCol = severityColor(alert.event.severity);
              const sevBg = severityColors[sev]?.bg ?? "var(--color-bg-muted)";
              const location = alert.event.generalLocation ?? alert.event.originLocation ?? alert.event.destinationLocation;
              const sourceName = alert.event.signals[0]?.source?.name;
              const displayTitle = alert.event.title ?? alert.event.description ?? alert.event.types[0] ?? t("feed.alerts.untitled");

              return (
                <Link key={alert.id} href={`/event/${alert.event.id}?from=detection`} style={{ textDecoration: "none", color: "inherit" }}>
                  <Box
                    px={16} py={12}
                    className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-muted)] cursor-pointer"
                    style={{ display: "flex", gap: 12, ...getCardProps(alert.event.id).style }}
                    onMouseEnter={getCardProps(alert.event.id).onMouseEnter}
                    onMouseLeave={getCardProps(alert.event.id).onMouseLeave}
                  >
                    <Box style={{ width: 3, background: sevCol, flexShrink: 0, borderRadius: 2 }} />
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Group justify="space-between" mb={4}>
                        <Group gap={6}>
                          <Badge size="xs" style={{ background: sevBg, color: sevCol, fontWeight: 700 }}>{severityLabels[sev]}</Badge>
                          {sourceName && <Badge size="xs" variant="light" color="gray" style={{ fontSize: 10 }}>{sourceName}</Badge>}
                        </Group>
                        <Text size="xs" c="var(--color-text-muted)" title={t("feed.firstSignal", { time: format.relativeTime(new Date(alert.event.firstSignalCreatedAt)) })}>
                          {format.relativeTime(new Date(alert.event.lastSignalCreatedAt))}
                        </Text>
                      </Group>
                      <Text fw={600} size="sm" c="var(--color-text-primary)" lineClamp={1} mb={4}>{displayTitle}</Text>
                      <Group gap={12}>
                        {resolveLocationName(location) && (
                          <Group gap={3} style={{ flexShrink: 0 }}>
                            <IconMapPin size={11} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
                            <Text size="xs" c="var(--color-text-muted)">{resolveLocationName(location)}</Text>
                          </Group>
                        )}
                        {(() => { const all = [...getDisasterPills(alert.event.types), ...getDisasterL2Pills(alert.event.types)]; return all.filter((p, i) => all.findIndex((q) => q.label === p.label) === i); })().map((pill) => (
                          <span key={pill.label} style={{ display: "inline-block", padding: "1px 7px", borderRadius: 999, fontSize: 10, fontWeight: 600, color: pill.color, background: pill.bg, letterSpacing: "0.01em", whiteSpace: "nowrap" }}>
                            {pill.label}
                          </span>
                        ))}
                      </Group>
                    </Box>
                  </Box>
                </Link>
              );
            })}

            {hasMore && filtered.length > 0 && <div ref={sentinelRef} style={{ height: 1 }} />}

            {isFetchingMore && (
              <Box py={12} style={{ display: "flex", justifyContent: "center" }}>
                <Loader size="xs" />
              </Box>
            )}

            {!hasMore && alerts.length > 0 && (
              <Box py={10} style={{ textAlign: "center" }}>
                <Text size="xs" c="var(--color-text-muted)">{t("feed.alerts.allLoaded", { count: totalCount })}</Text>
              </Box>
            )}
          </Box>
        </Card>
      </Box>

      <Box style={{ width: 480, flexShrink: 0 }}>
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
              dataView="alert"
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
