"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import {
  Box,
  Text,
  Badge,
  Group,
  Card,
  Stack,
  Loader,
  Button,
  Skeleton,
  ActionIcon,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconMap,
  IconBookmark,
  IconLayoutGridAdd,
  IconAlertTriangle,
  IconMapPin,
  IconClock,
  IconCalendar,
  IconDatabase,
  IconExternalLink,
  IconRadar,
  IconLink,
  IconPhoto,
  IconFile,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { mapSeverity, severityColor } from "~/lib/types/graphql";
import type { GqlSignalDetail, GqlLocation } from "~/lib/types/graphql";
import { resolveLocationName } from "~/lib/location";
import { CommentsSection } from "~/components/comments-section";
import { FeedbackSection } from "~/components/feedback-section";
import { severityColors } from "~/lib/constants/severity";
import type { MapMarker } from "~/components/map/crisis-map";
import { api } from "~/trpc/react";
import { useLocations } from "~/hooks/use-locations";
import { MinimapCard } from "~/components/map/minimap-card";
import { SkeletonSlot } from "~/components/ui/skeleton-slot";
import { useNavigationMapDisplay } from "~/hooks/use-navigation-map-display";
import {
  ActionsCardSkeleton,
  DescriptionCardSkeleton,
  DiscussionCardSkeleton,
  EventGridCardsSkeleton,
  FeedbackCardSkeleton,
  MinimapCardSkeleton,
  SignalHeaderSkeleton,
  SignalSourceCardSkeleton,
  SystemDataCardSkeleton,
} from "~/components/ui/detail-navigation-skeletons";

// ─────────────────────────────────────────────────────────────────────────────

function signalLocations(signal: GqlSignalDetail): GqlLocation[] {
  const locs: GqlLocation[] = [];
  if (signal.generalLocation) locs.push(signal.generalLocation);
  if (signal.originLocation) locs.push(signal.originLocation);
  if (signal.destinationLocation) locs.push(signal.destinationLocation);
  return locs;
}

function MediaThumbnail({ url, filename }: { url: string; filename: string }) {
  const [failed, setFailed] = useState(false);

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={filename}
      style={{ textDecoration: "none" }}
    >
      <Box
        style={{
          width: 100,
          height: 100,
          border: "1px solid var(--color-border)",
          borderRadius: 6,
          overflow: "hidden",
          background: "var(--color-bg-muted)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
        className="hover:opacity-80"
      >
        {failed ? (
          <>
            <IconFile size={28} color="var(--color-text-muted)" />
            <Text
              size="xs"
              c="var(--color-text-muted)"
              mt={4}
              style={{
                maxWidth: 88,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                textAlign: "center",
              }}
            >
              {filename}
            </Text>
          </>
        ) : (
          <img
            src={url}
            alt={filename}
            style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            onError={() => setFailed(true)}
          />
        )}
      </Box>
    </a>
  );
}

interface SignalDetailContentProps {
  signal: GqlSignalDetail | null | undefined;
  loading: boolean;
  isPending?: boolean;
  mode: "page" | "drawer";
  navigation?: {
    prevId: string | null;
    nextId: string | null;
    hasPrev: boolean;
    hasNext: boolean;
    position: string;
  };
  onNavigatePrev?: () => void;
  onNavigateNext?: () => void;
  navigationMapCenter?: [number, number];
}

export function SignalDetailContent({
  signal,
  loading,
  isPending = false,
  mode,
  navigation,
  onNavigatePrev,
  onNavigateNext,
  navigationMapCenter,
}: SignalDetailContentProps) {
  const t = useTranslations("signalDetail");
  const tCommon = useTranslations("common");
  const format = useFormatter();

  const mapMarkers = useMemo<MapMarker[]>(() => {
    if (!signal) return [];
    const markers: MapMarker[] = [];
    let idx = 0;
    for (const loc of signalLocations(signal)) {
      const geom = loc.geometry;
      if (!geom || geom.type !== "Point") continue;
      const coords = geom.coordinates as [number, number] | undefined;
      if (!coords) continue;
      const [lng, lat] = coords;
      markers.push({
        id: idx++,
        lng,
        lat,
        title: loc.name,
        severity: "medium",
        description: loc.name,
      });
    }
    return markers;
  }, [signal]);

  const mapCenter = useMemo<[number, number]>(() => {
    if (!mapMarkers.length) return [30, 15];
    return [mapMarkers[0]!.lng, mapMarkers[0]!.lat];
  }, [mapMarkers]);

  const { getLocationId } = useLocations();
  const sudanId = useMemo(() => getLocationId("Sudan"), [getLocationId]);
  const sudanL0Query = api.locations.getById.useQuery(
    { id: sudanId! },
    { enabled: !!sudanId, staleTime: Infinity, refetchOnWindowFocus: false },
  );
  const sudanGeometry = sudanL0Query.data?.geometry ?? undefined;

  // Collect all signals from sibling events
  const relatedSignals = useMemo(() => {
    if (!signal) return [];
    const seen = new Set<string>([signal.id]);
    const result: GqlSignalDetail["events"][number]["signals"] = [];
    for (const ev of signal.events) {
      for (const s of ev.signals) {
        if (!seen.has(s.id)) {
          seen.add(s.id);
          result.push(s);
        }
      }
    }
    return result.sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
  }, [signal]);

  const sourceSignalCount = useMemo(() => {
    if (!signal) return 1;
    const seen = new Set<string>([signal.id]);
    for (const ev of signal.events) {
      for (const s of ev.signals) {
        if (s.source.id === signal.source.id) seen.add(s.id);
      }
    }
    return seen.size;
  }, [signal]);

  const showPending = isPending && !!signal;
  const hookPrimaryMapLocation =
    signal?.generalLocation ?? signal?.originLocation ?? signal?.destinationLocation;

  const {
    displayMarkers: mapDisplayMarkers,
    displayLocation: mapDisplayLocation,
    displayCenter: mapDisplayCenter,
    holdRegionFit,
    flyDuration: mapFlyDuration,
  } = useNavigationMapDisplay({
    isPending: showPending,
    mapMarkers,
    primaryLocation: hookPrimaryMapLocation,
    sevColor: "var(--color-text-muted)",
    navigationMapCenter,
    resolvedMapCenter: mapCenter,
  });

  // Show skeleton UI on initial load (no signal data yet) - no spinning wheel
  if (loading && !signal) {
    return (
      <Box style={{ background: "var(--color-bg-white)" }}>
        {mode === "page" && (
          <Box px={24} py={16} style={{ borderBottom: "1px solid var(--color-border)" }}>
            <Group gap={16}>
              <Skeleton height={20} width={120} radius="sm" />
            </Group>
          </Box>
        )}

        {/* Header skeleton */}
        <Box
          px={24}
          py={20}
          style={{
            background: "var(--color-bg-white)",
            borderBottom: "1px solid var(--color-border)",
            borderInlineStart: "4px solid var(--color-border)",
          }}
        >
          <Skeleton height={18} width={80} mb={10} radius="xl" />
          <Skeleton height={24} width="85%" mb={12} />
          <Group gap={6} mb={12}>
            <Skeleton height={20} width={70} radius="xl" />
            <Skeleton height={20} width={90} radius="xl" />
          </Group>
          <Group gap={12}>
            <Skeleton height={12} width={100} />
            <Skeleton height={12} width={120} />
            <Skeleton height={12} width={90} />
          </Group>
        </Box>

        {/* Body with sidebar layout */}
        <Box p={24} style={{ display: "flex", gap: 20 }}>
          <Box style={{ flex: 1, minWidth: 0 }}>
            <DescriptionCardSkeleton />
            <SignalSourceCardSkeleton />
            <DiscussionCardSkeleton />
            <EventGridCardsSkeleton />
          </Box>

          {mode !== "drawer" && (
            <Box style={{ width: 300, flexShrink: 0 }}>
              <Stack gap={20}>
                <MinimapCardSkeleton />
                <FeedbackCardSkeleton />
                <ActionsCardSkeleton />
                <SystemDataCardSkeleton />
              </Stack>
            </Box>
          )}
        </Box>
      </Box>
    );
  }

  if (!signal) {
    return (
      <Box p={48} style={{ textAlign: "center" }}>
        <IconAlertTriangle
          size={40}
          color="#D97706"
          style={{ margin: "0 auto 16px" }}
        />
        <Text fw={600} size="lg">
          {t("notFound.title")}
        </Text>
        <Text size="sm" c="var(--color-text-muted)" mt={8}>
          {t("notFound.description")}
        </Text>
        {mode === "page" && (
          <Link
            href="/detection"
            style={{
              display: "inline-block",
              marginTop: 16,
              color: "#E85D3D",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            &larr; {t("backToEvents")}
          </Link>
        )}
      </Box>
    );
  }

  const isCompact = mode === "drawer";
  const locations = signalLocations(signal);
  const primaryLocation = resolveLocationName(locations[0]) ?? undefined;
  const sev = mapSeverity(signal.severity ?? 0);

  const displayTitle =
    signal.title ??
    (signal.description ? signal.description.slice(0, 120) + (signal.description.length > 120 ? "…" : "") : null) ??
    (primaryLocation ? t("fallbackTitleWithLocation", { location: primaryLocation }) : t("fallbackTitle"));

  const sourceTypeLabel = signal.source.type
    ? signal.source.type.charAt(0).toUpperCase() + signal.source.type.slice(1).toLowerCase()
    : t("unknownSourceType");

  return (
    <Box>
      {/* Back nav */}
      {mode === "page" && (
        <Box
          px={24}
          py={10}
          style={{ background: "var(--color-bg-white)", borderBottom: "1px solid var(--color-border)" }}
        >
          <Group justify="space-between">
            <Group gap={16}>
              <Link href="/detection" style={{ textDecoration: "none" }}>
                <Group
                  gap={6}
                  className="hover:opacity-70"
                  style={{ cursor: "pointer" }}
                >
                  <IconArrowLeft size={14} color="var(--color-text-secondary)" />
                  <Text size="sm" c="var(--color-text-secondary)" fw={500}>
                    {t("backToEvents")}
                  </Text>
                </Group>
              </Link>
              {navigation && (
                <Group gap={8}>
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    onClick={onNavigatePrev}
                    disabled={!navigation.hasPrev}
                    title={t("nav.previous")}
                    aria-label={t("nav.previous")}
                  >
                    <IconChevronLeft size={16} />
                  </ActionIcon>
                  <Text
                    size="xs"
                    c="var(--color-text-muted)"
                    fw={500}
                    style={{ minWidth: 60, textAlign: "center" }}
                  >
                    {navigation.position}
                  </Text>
                  <ActionIcon
                    variant="subtle"
                    size="sm"
                    onClick={onNavigateNext}
                    disabled={!navigation.hasNext}
                    title={t("nav.next")}
                    aria-label={t("nav.next")}
                  >
                    <IconChevronRight size={16} />
                  </ActionIcon>
                </Group>
              )}
            </Group>
            {locations.length > 0 && (
              <Link
                href={`/map`}
                style={{ textDecoration: "none" }}
              >
                <Group
                  gap={4}
                  className="hover:opacity-70"
                  style={{ cursor: "pointer" }}
                >
                  <IconMap size={14} color="#E85D3D" />
                  <Text size="xs" c="#E85D3D" fw={500}>
                    {t("viewOnCrisisMap")}
                  </Text>
                </Group>
              </Link>
            )}
          </Group>
        </Box>
      )}

      {/* Header */}
      <Box
        px={isCompact ? 20 : 24}
        pt={isCompact ? 16 : 20}
        pb={isCompact ? 16 : 20}
        style={{
          background: "var(--color-bg-white)",
          borderBottom: "1px solid var(--color-border)",
          borderInlineStart: "4px solid var(--color-text-muted)",
        }}
      >
        <SkeletonSlot pending={showPending} skeleton={<SignalHeaderSkeleton isCompact={isCompact} />}>
          <Group gap={6} mb={10}>
            <span style={{
              display: "inline-block",
              padding: "2px 10px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              background: sev === "critical" ? "var(--color-critical-light)" : sev === "low" ? "var(--color-success-light)" : "var(--color-warning-light)",
              color: sev === "critical" ? "var(--color-critical)" : sev === "low" ? "var(--color-success)" : "var(--color-warning)",
            }}>
              {tCommon(`severities.${sev}`)}
            </span>
          </Group>

          <Group
            justify="space-between"
            align="flex-start"
            mb={10}
            wrap="nowrap"
            gap={16}
          >
            <Text
              fw={700}
              c="var(--color-text-primary)"
              style={{ fontSize: isCompact ? 18 : 22, lineHeight: 1.3, flex: 1 }}
            >
              {displayTitle}
            </Text>
            <Group gap={6} style={{ flexShrink: 0, paddingTop: 3 }} wrap="nowrap">
              <IconRadar size={13} color="var(--color-text-muted)" />
              <Text size="xs" fw={500} c="var(--color-text-muted)">
                {t("signalBadge")}
              </Text>
            </Group>
          </Group>

          <Group gap={8} mb={14} wrap="wrap" align="center">
            <Badge
              size="sm"
              radius="xl"
              variant="outline"
              style={{ color: "var(--color-text-muted)", borderColor: "color-mix(in srgb, var(--color-text-muted) 25%, transparent)", fontWeight: 500 }}
            >
              {sourceTypeLabel}
            </Badge>
            <Text size="xs" c="var(--color-text-secondary)" fw={500}>
              {t("viaSource", { name: signal.source.name })}
            </Text>
            {(signal.url ?? signal.source.infoUrl) && (
              <>
                <Text size="xs" c="var(--color-text-muted)">·</Text>
                <a
                  href={signal.url ?? signal.source.infoUrl ?? ""}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#E85D3D",
                    textDecoration: "none",
                  }}
                >
                  <IconExternalLink size={12} />
                  {signal.url ? t("viewOriginal") : t("viewSource")}
                </a>
              </>
            )}
          </Group>

          <Group gap={16} wrap="wrap">
            {locations.some((l) => resolveLocationName(l)) && (
              <Group gap={4}>
                <IconMapPin size={13} color="var(--color-text-muted)" />
                <Text size="xs" c="var(--color-text-secondary)" fw={500}>
                  {locations.map((l) => resolveLocationName(l)).filter(Boolean).join(", ")}
                </Text>
              </Group>
            )}
            <Group gap={4}>
              <IconCalendar size={13} color="var(--color-text-muted)" />
              <Text size="xs" c="var(--color-text-secondary)">
                {format.dateTime(new Date(signal.publishedAt), "short")}
              </Text>
            </Group>
            <Group gap={4}>
              <IconClock size={13} color="var(--color-text-muted)" />
              <Text size="xs" c="var(--color-text-muted)">
                {format.relativeTime(new Date(signal.publishedAt))}
              </Text>
            </Group>
          </Group>
        </SkeletonSlot>
      </Box>

      {/* Body */}
      <Box
        p={isCompact ? 16 : 24}
        style={{
          display: "flex",
          gap: isCompact ? 16 : 24,
          flexDirection: isCompact ? "column" : "row",
        }}
      >
        {/* Left column */}
        <Box style={{ flex: 1, minWidth: 0 }}>
          <SkeletonSlot pending={showPending} skeleton={<DescriptionCardSkeleton />}>
          {/* Description */}
          <Card p={0} mb={20} style={{ border: "1px solid var(--color-border)" }}>
            <Box px={16} py={12} className="border-b border-[var(--color-border)]">
              <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 14 }}>
                {t("description.title")}
              </Text>
            </Box>
            <Box p={16}>
              <Text size="sm" c="var(--color-text-secondary)" style={{ lineHeight: 1.75 }}>
                {signal.description ?? t("description.empty")}
              </Text>
            </Box>
          </Card>
          </SkeletonSlot>

          <SkeletonSlot pending={showPending} skeleton={<SignalSourceCardSkeleton />}>
          {/* Source details */}
          <Card p={0} mb={20} style={{ border: "1px solid var(--color-border)" }}>
            <Box px={16} py={12} className="border-b border-[var(--color-border)]">
              <Group gap={8}>
                <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 14 }}>
                  {t("source.title")}
                </Text>
              </Group>
            </Box>
            <Box
              p={12}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              <Box
                p={12}
                style={{ background: "var(--color-bg-muted)", border: "1px solid var(--color-border)", borderRadius: 6 }}
              >
                <Text size="xs" fw={700} c="var(--color-text-muted)" mb={4} style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {t("source.name")}
                </Text>
                <Text size="sm" c="var(--color-text-secondary)" style={{ lineHeight: 1.6 }}>
                  {signal.source.name}
                </Text>
              </Box>
              <Box
                p={12}
                style={{ background: "var(--color-bg-muted)", border: "1px solid var(--color-border)", borderRadius: 6 }}
              >
                <Text size="xs" fw={700} c="var(--color-text-muted)" mb={4} style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {t("source.type")}
                </Text>
                <Text size="sm" c="var(--color-text-secondary)" style={{ lineHeight: 1.6 }}>
                  {sourceTypeLabel}
                </Text>
              </Box>
              <Box
                p={12}
                style={{ background: "var(--color-bg-muted)", border: "1px solid var(--color-border)", borderRadius: 6 }}
              >
                <Text size="xs" fw={700} c="var(--color-text-muted)" mb={6} style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {t("source.activity")}
                </Text>
                <Group gap={6} align="baseline">
                  <Text fw={700} c="var(--color-text-primary)" style={{ fontSize: 18, lineHeight: 1 }}>
                    {sourceSignalCount}
                  </Text>
                  <Text size="xs" c="var(--color-text-secondary)">
                    {t("source.signalsFrom", { count: sourceSignalCount, name: signal.source.name })}
                  </Text>
                </Group>
                <Text size="xs" c="var(--color-text-muted)" mt={4}>{t("source.activityContext")}</Text>
              </Box>
              {signal.source.infoUrl && (
                <Box
                  p={12}
                  style={{ background: "var(--color-bg-muted)", border: "1px solid var(--color-border)", borderRadius: 6 }}
                >
                  <Text size="xs" fw={700} c="var(--color-text-muted)" mb={4} style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    {t("source.infoUrl")}
                  </Text>
                  <a
                    href={signal.source.infoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#E85D3D", fontSize: 13, textDecoration: "none" }}
                  >
                    <IconLink size={12} />
                    {signal.source.infoUrl}
                  </a>
                </Box>
              )}
            </Box>
          </Card>
          </SkeletonSlot>

          {/* Media */}
          {!showPending && signal.media && signal.media.length > 0 && (
            <Card p={0} mb={20} style={{ border: "1px solid var(--color-border)" }}>
              <Box px={16} py={12} className="border-b border-[var(--color-border)]">
                <Group gap={8}>
                  <IconPhoto size={14} color="var(--color-text-secondary)" />
                  <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 14 }}>
                    {t("media.title", { count: signal.media.length })}
                  </Text>
                </Group>
              </Box>
              <Box p={16}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {signal.media.map((url, idx) => {
                    const filename = url.split("/").pop()?.split("?")[0] ?? `file-${idx + 1}`;
                    return (
                      <MediaThumbnail
                        key={idx}
                        url={url}
                        filename={filename}
                      />
                    );
                  })}
                </div>
              </Box>
            </Card>
          )}

          <SkeletonSlot pending={showPending} skeleton={<DiscussionCardSkeleton />}>
          {/* Discussion */}
          <Card p={0} mb={20} style={{ border: "1px solid var(--color-border)" }}>
            <CommentsSection entityId={signal.id} entityType="signal" />
          </Card>
          </SkeletonSlot>

          <SkeletonSlot pending={showPending} skeleton={<EventGridCardsSkeleton />}>
          {/* Part of Events + Similar Signals - two columns */}
          <Box style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

            {/* Part of Events */}
            <Card p={0} style={{ border: "1px solid var(--color-border)" }}>
              <Box px={16} py={12} className="border-b border-[var(--color-border)]">
                <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 14 }}>
                  {t("events.title", { count: signal.events.length })}
                </Text>
              </Box>
              <Box>
                {signal.events.length === 0 && (
                  <Box px={16} py={24} style={{ textAlign: "center" }}>
                    <Text c="var(--color-text-muted)" size="sm">
                      {t("events.empty")}
                    </Text>
                  </Box>
                )}
                {signal.events.map((ev) => {
                  // `rank` is a 0-1 urgency score; severity buckets need the
                  // 1-5 `severity` field. Passing rank would always bucket as
                  // "low" because rank <= 1 < 3.
                  const relSev = mapSeverity(ev.severity);
                  const relColor = severityColor(ev.severity);
                  const relBg = severityColors[relSev]?.bg ?? "var(--color-bg-muted)";
                  const relTitle = ev.title ?? ev.types[0] ?? t("events.fallbackTitle", { id: ev.id });
                  return (
                    <Link
                      key={ev.id}
                      href={`/event/${ev.id}`}
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      <Box
                        px={16}
                        py={12}
                        className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-muted)] cursor-pointer"
                        style={{ display: "flex", gap: 12 }}
                      >
                        <Box style={{ width: 3, background: relColor, flexShrink: 0, borderRadius: 2 }} />
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Group justify="space-between" mb={2}>
                            <Badge size="xs" style={{ background: relBg, color: relColor, fontWeight: 600 }}>
                              {tCommon(`severities.${relSev}`)}
                            </Badge>
                            <Text size="xs" c="var(--color-text-muted)">{format.relativeTime(new Date(ev.firstSignalCreatedAt))}</Text>
                          </Group>
                          <Text size="sm" fw={500} c="var(--color-text-primary)" lineClamp={2} style={{ lineHeight: 1.4 }}>
                            {relTitle}
                          </Text>
                          {ev.types.length > 0 && (
                            <Group gap={4} mt={4}>
                              {ev.types.slice(0, 2).map((t) => (
                                <Badge key={t} size="xs" variant="outline" style={{ color: "var(--color-text-muted)", borderColor: "color-mix(in srgb, var(--color-text-muted) 25%, transparent)", fontWeight: 400 }}>
                                  {t}
                                </Badge>
                              ))}
                            </Group>
                          )}
                        </Box>
                      </Box>
                    </Link>
                  );
                })}
              </Box>
            </Card>

            {/* Similar Signals */}
            <Card p={0} style={{ border: "1px solid var(--color-border)" }}>
              <Box px={16} py={12} className="border-b border-[var(--color-border)]">
                <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 14 }}>
                  {t("similar.title", { count: relatedSignals.length })}
                </Text>
              </Box>
              <Box>
                {relatedSignals.length === 0 && (
                  <Box px={16} py={24} style={{ textAlign: "center" }}>
                    <Text c="var(--color-text-muted)" size="sm">
                      {t("similar.empty")}
                    </Text>
                  </Box>
                )}
                {relatedSignals.slice(0, 8).map((s) => {
                  const relTitle =
                    s.title ??
                    (s.description ? s.description.slice(0, 80) + (s.description.length > 80 ? "…" : "") : t("similar.fallbackTitle", { id: s.id }));
                  return (
                    <Link
                      key={s.id}
                      href={`/signal/${s.id}`}
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      <Box
                        px={16}
                        py={12}
                        className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-muted)] cursor-pointer"
                        style={{ display: "flex", gap: 12 }}
                      >
                        <Box style={{ width: 3, background: "var(--color-text-muted)", flexShrink: 0, borderRadius: 2 }} />
                        <Box style={{ flex: 1, minWidth: 0 }}>
                          <Group justify="space-between" mb={2}>
                            <Badge size="xs" style={{ background: "var(--color-bg-muted)", color: "var(--color-text-secondary)", fontWeight: 600 }}>
                              {s.source.name}
                            </Badge>
                            <Text size="xs" c="var(--color-text-muted)">{format.relativeTime(new Date(s.publishedAt))}</Text>
                          </Group>
                          <Text size="sm" fw={500} c="var(--color-text-primary)" lineClamp={2} style={{ lineHeight: 1.4 }}>
                            {relTitle}
                          </Text>
                        </Box>
                      </Box>
                    </Link>
                  );
                })}
              </Box>
            </Card>

          </Box>
          </SkeletonSlot>
        </Box>

        {/* Right sidebar */}
        {!isCompact && (
          <Box style={{ width: 300, flexShrink: 0 }}>
            <Stack gap={20}>
              <MinimapCard
                markers={mapDisplayMarkers}
                center={mapDisplayCenter}
                sudanGeometry={sudanGeometry}
                sudanId={sudanId}
                location={mapDisplayLocation}
                holdRegionFit={holdRegionFit}
                flyDuration={mapFlyDuration}
              />

              <SkeletonSlot pending={showPending} skeleton={<FeedbackCardSkeleton />}>
              <Card p={0} style={{ border: "1px solid var(--color-border)" }}>
                <FeedbackSection entityId={signal.id} entityType="signal" />
              </Card>
              </SkeletonSlot>

              <SkeletonSlot pending={showPending} skeleton={<ActionsCardSkeleton />}>
              <Card p={0} style={{ border: "1px solid var(--color-border)" }}>
                <Box px={16} py={10} className="border-b border-[var(--color-border)]">
                  <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 13 }}>
                    {t("actions.title")}
                  </Text>
                </Box>
                <Box p={16}>
                  <Stack gap={8}>
                    {/* <Button
                      variant="light"
                      color="gray"
                      size="xs"
                      leftSection={<IconBookmark size={13} />}
                      fullWidth
                      disabled
                      title="Bookmarks coming soon"
                      style={{ fontSize: 12 }}
                    >
                      Bookmark
                    </Button> */}
                    <Button
                      variant="light"
                      color="gray"
                      size="xs"
                      leftSection={<IconLayoutGridAdd size={12} />}
                      fullWidth
                      disabled
                      style={{ fontSize: 12 }}
                    >
                      {t("actions.addToCrisis")}
                      <Text
                        component="span"
                        size="10px"
                        c="var(--color-text-muted)"
                        ms={6}
                        style={{ fontWeight: 400 }}
                      >
                        {t("actions.comingSoon")}
                      </Text>
                    </Button>
                  </Stack>
                </Box>
              </Card>
              </SkeletonSlot>

              <SkeletonSlot pending={showPending} skeleton={<SystemDataCardSkeleton />}>
              <Card p={0} style={{ border: "1px solid var(--color-border)" }}>
                <Box px={16} py={10} className="border-b border-[var(--color-border)]">
                  <Group gap={6}>
                    <IconDatabase size={14} color="var(--color-text-secondary)" />
                    <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 13 }}>
                      {t("details.title")}
                    </Text>
                  </Group>
                </Box>
                <Box p={16}>
                  <Stack gap={8}>
                    <Group justify="space-between">
                      <Text size="xs" c="var(--color-text-muted)">{t("details.signalId")}</Text>
                      <Text size="xs" fw={500} c="var(--color-text-primary)">#{signal.id}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="xs" c="var(--color-text-muted)">{t("details.source")}</Text>
                      <Text size="xs" fw={500} c="var(--color-text-primary)">{signal.source.name}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="xs" c="var(--color-text-muted)">{t("details.published")}</Text>
                      <Text size="xs" fw={500} c="var(--color-text-primary)">{format.dateTime(new Date(signal.publishedAt), "short")}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="xs" c="var(--color-text-muted)">{t("details.collected")}</Text>
                      <Text size="xs" fw={500} c="var(--color-text-primary)">{format.dateTime(new Date(signal.collectedAt), "dateTime")}</Text>
                    </Group>
                    {locations.some((l) => resolveLocationName(l)) && (
                      <Box style={{ borderTop: "1px solid var(--color-border)" }} pt={8} mt={2}>
                        <Text size="xs" c="var(--color-text-muted)" mb={6}>{t("details.affectedAreas")}</Text>
                        <Group gap={6} wrap="wrap">
                          {locations.map((loc) => {
                            const name = resolveLocationName(loc);
                            if (!name) return null;
                            return (
                              <Badge
                                key={loc.id}
                                size="sm"
                                variant="light"
                                style={{
                                  background: "var(--color-accent-light)",
                                  color: "#E85D3D",
                                  fontWeight: 500,
                                  border: "1px solid #E85D3D30",
                                  textTransform: "none",
                                }}
                              >
                                {name}
                              </Badge>
                            );
                          })}
                        </Group>
                      </Box>
                    )}
                  </Stack>
                </Box>
              </Card>
              </SkeletonSlot>
            </Stack>
          </Box>
        )}
      </Box>

    </Box>
  );
}
