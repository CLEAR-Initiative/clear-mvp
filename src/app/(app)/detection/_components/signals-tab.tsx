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
  IconExternalLink,
  IconMapPin,
} from "@tabler/icons-react";
import { FeedToolbar } from "~/components/ui";
import type { GqlSignal } from "~/lib/types/graphql";
import { mapSeverity, severityColor } from "~/lib/types/graphql";
import { severityColors, severityLabels } from "~/lib/constants/severity";
import type { MapMarker } from "~/components/map/crisis-map";
import { MapSettingsPopover, type BoundaryLevel } from "~/app/(app)/map/_components/map-settings-popover";
import { useMarkerHover } from "~/hooks/use-marker-hover";
import { resolveLocationName } from "~/lib/location";

const CrisisMap = dynamic(
  () => import("~/components/map/crisis-map").then((m) => m.CrisisMap),
  { ssr: false, loading: () => <Box w="100%" h="100%" bg="#F5F5F5" /> },
);

// All options are handled server-side via the SignalOrderBy enum.
export type SignalSortOrder = "newest" | "oldest" | "sev-desc" | "sev-asc";

// i18n keys under detection.sort.* - resolved via t() at render time.
export const SIGNAL_SORT_LABEL_KEYS: Record<SignalSortOrder, "sevDesc" | "sevAsc" | "newest" | "oldest"> = {
  "newest":   "newest",
  "oldest":   "oldest",
  "sev-desc": "sevDesc",
  "sev-asc":  "sevAsc",
};

interface SignalsTabProps {
  signals: GqlSignal[];
  loading: boolean;
  isFetchingMore: boolean;
  hasMore: boolean;
  totalCount: number;
  newCount: number;
  sortOrder: SignalSortOrder;
  onSortChange: (order: SignalSortOrder) => void;
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
  activeSources?: Set<string> | null;
}

export function SignalsTab({
  signals,
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
  activeSources: activeSourcesProp,
}: SignalsTabProps) {
  const t = useTranslations("detection");
  const format = useFormatter();
  const [search, setSearch] = useState("");
  const activeSources = activeSourcesProp ?? null;
  const activeSeverities = activeSeveritiesProp ?? new Set(["critical", "high", "medium", "low"]);
  const { hoveredMarkerId, getCardProps, onMarkerHover } = useMarkerHover(mapMarkers);

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

  const countLabel = search || activeSeverities.size < 4 || activeSources !== null
    ? `${filtered.length} / ${format.number(totalCount)}`
    : format.number(totalCount);

  return (
    <Box style={{ display: "flex", gap: 24 }}>
      <Box style={{ flex: 1, minWidth: 0 }}>
        <FeedToolbar
          title={t("feed.signals.title")}
          count={loading ? "..." : countLabel}
          loading={loading}
          search={search}
          onSearchChange={setSearch}
          sortOrder={sortOrder}
          sortLabels={Object.fromEntries(Object.entries(SIGNAL_SORT_LABEL_KEYS).map(([k, v]) => [k, t(`sort.${v}`)]))}
          onSortChange={(o) => onSortChange(o as SignalSortOrder)}
          newCount={newCount}
          onRefresh={onRefresh}
        />

        <Card p={0} style={{ border: "1px solid var(--color-border)" }}>
          <Box ref={scrollContainerRef} style={{ maxHeight: 524, overflowY: "auto" }}>
            {filtered.length === 0 && !loading && (
              <Box px={16} py={32} style={{ textAlign: "center" }}>
                <Text c="var(--color-text-muted)" size="sm">
                  {signals.length === 0 ? t("feed.signals.empty") : t("feed.signals.noMatch")}
                </Text>
              </Box>
            )}

            {filtered.map((signal) => {
              const sev = mapSeverity(signal.severity ?? 0);
              const sevCol = severityColor(signal.severity ?? 0);
              const sevBg = severityColors[sev]?.bg ?? "var(--color-bg-muted)";
              const location = signal.generalLocation ?? signal.originLocation ?? signal.destinationLocation;
              const displayTitle =
                signal.title ??
                (signal.description
                  ? signal.description.slice(0, 120) + (signal.description.length > 120 ? "..." : "")
                  : t("feed.signals.untitled"));

              return (
                <Link key={signal.id} href={`/signal/${signal.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <Box
                    px={16} py={12}
                    className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-muted)] cursor-pointer"
                    style={{ display: "flex", gap: 12, ...getCardProps(signal.id).style }}
                    onMouseEnter={getCardProps(signal.id).onMouseEnter}
                    onMouseLeave={getCardProps(signal.id).onMouseLeave}
                  >
                    <Box style={{ width: 3, background: sevCol, flexShrink: 0, borderRadius: 2 }} />
                    <Box style={{ flex: 1, minWidth: 0 }}>
                      <Group justify="space-between" mb={4}>
                        <Group gap={6}>
                          <Badge size="xs" style={{ background: sevBg, color: sevCol, fontWeight: 600 }}>{severityLabels[sev]}</Badge>
                          <Badge size="xs" style={{ background: "var(--color-bg-muted)", color: "var(--color-text-secondary)", fontWeight: 600 }}>{signal.source.name}</Badge>
                          <Badge size="xs" variant="outline" style={{ color: "var(--color-text-muted)", borderColor: "var(--color-border-dark)", fontSize: 10 }}>{signal.source.type}</Badge>
                        </Group>
                        <Text size="xs" c="var(--color-text-muted)">{format.relativeTime(new Date(signal.publishedAt))}</Text>
                      </Group>
                      <Text fw={600} size="sm" c="var(--color-text-primary)" lineClamp={2} mb={4} style={{ lineHeight: 1.4 }}>
                        {displayTitle}
                      </Text>
                      <Group gap={12}>
                        {resolveLocationName(location) && (
                          <Group gap={3} style={{ flexShrink: 0 }}>
                            <IconMapPin size={11} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
                            <Text size="xs" c="var(--color-text-muted)">{resolveLocationName(location)}</Text>
                          </Group>
                        )}
                        <Text size="xs" c="var(--color-text-muted)" style={{ marginInlineStart: "auto" }}>{format.dateTime(new Date(signal.publishedAt), "short")}</Text>
                        {signal.url && (
                          <a href={signal.url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                            style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: "var(--color-accent)", textDecoration: "none" }}>
                            <IconExternalLink size={11} />
                            {t("feed.sourceLink")}
                          </a>
                        )}
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

            {!hasMore && signals.length > 0 && (
              <Box py={10} style={{ textAlign: "center" }}>
                <Text size="xs" c="var(--color-text-muted)">{t("feed.signals.allLoaded", { count: totalCount })}</Text>
              </Box>
            )}
          </Box>
        </Card>
      </Box>

      <Box style={{ width: 480, flexShrink: 0 }} hiddenFrom="base" visibleFrom="sm">
        <Group mb={12} justify="space-between" align="center" style={{ minHeight: 32 }}>
          <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 14 }}>{t("feed.crisisMap")}</Text>
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
