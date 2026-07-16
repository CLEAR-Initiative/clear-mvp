"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Collapse,
  Tooltip,
  UnstyledButton,
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
  IconUsers,
  IconUsersGroup,
  IconTrendingUp,
  IconBellRinging,
  IconChevronDown,
  IconChevronUp,
  IconChevronLeft,
  IconChevronRight,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { useLocations } from "~/hooks/use-locations";
import { MinimapCard } from "~/components/map/minimap-card";
import type { MapMarker } from "~/components/map/crisis-map";
import { mapSeverity, severityColor } from "~/lib/types/graphql";
import type { GqlEvent, GqlLocation } from "~/lib/types/graphql";
import { getDisasterLabel, getDisasterPills, getDisasterL2Pills } from "~/lib/disaster-types";
import { resolveLocationName } from "~/lib/location";
import { CommentsSection } from "~/components/comments-section";
import { FeedbackSection } from "~/components/feedback-section";
import { AddToCrisisButton } from "~/components/event-detail/add-to-crisis-button";
import { ShareEventButton } from "~/components/event-detail/share-event-button";
import { severityColors } from "~/lib/constants/severity";
import { KpiStack } from "~/components/ui/kpi-stack";
import { SkeletonSlot } from "~/components/ui/skeleton-slot";
import { useNavigationMapDisplay } from "~/hooks/use-navigation-map-display";
import {
  ActionsCardSkeleton,
  DiscussionCardSkeleton,
  EventHeaderSkeleton,
  FeedbackCardSkeleton,
  KpiStripSkeleton,
  RelatedEventsCardSkeleton,
  SignalsListCardSkeleton,
  SummaryCardSkeleton,
  SystemDataCardSkeleton,
  MinimapCardSkeleton,
} from "~/components/ui/detail-navigation-skeletons";

function bigIntStrToNumber(s: string | null | undefined): number | null {
  if (s === null || s === undefined) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Collect the non-null location fields from a GqlEvent into a flat array. */
function eventLocations(event: GqlEvent): GqlLocation[] {
  const locs: GqlLocation[] = [];
  if (event.generalLocation) locs.push(event.generalLocation);
  if (event.originLocation) locs.push(event.originLocation);
  if (event.destinationLocation) locs.push(event.destinationLocation);
  return locs;
}

interface EventDetailContentProps {
  event: GqlEvent | null | undefined;
  loading: boolean;
  isPending?: boolean;
  mode: "page" | "drawer";
  relatedEvents?: GqlEvent[];
  relatedLoading?: boolean;
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
  referrer?: string;
}

export function EventDetailContent({
  event,
  loading,
  isPending = false,
  mode,
  relatedEvents = [],
  relatedLoading = false,
  navigation,
  onNavigatePrev,
  onNavigateNext,
  navigationMapCenter,
  referrer = "detection",
}: EventDetailContentProps) {
  // TODO: after Prisma migration use event.title directly; remove this fallback
  // TODO: after Prisma migration use event.types (list) instead of eventType

  const t = useTranslations("eventDetail");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const router = useRouter();
  const isAlready = (event?.alerts?.length ?? 0) > 0;
  const [promoted, setPromoted] = useState(false);
  const [confirmPromote, setConfirmPromote] = useState(false);
  const [systemDataOpen, setSystemDataOpen] = useState(false);
  const promoteToAlert = api.alerts.promoteToAlert.useMutation({
    onSuccess: () => { setPromoted(true); setConfirmPromote(false); },
  });
  // Promoting an event to an alert is gated to admin/analyst on the backend
  // (createAlert -> requireRole(["admin", "analyst"])). Mirror that here so
  // other roles don't see an action that always fails for them.
  const { data: authData } = api.auth.me.useQuery(undefined, { staleTime: 60_000 });
  const canPromote =
    authData?.user?.role === "admin" || authData?.user?.role === "analyst";

  const mapMarkers = useMemo<MapMarker[]>(() => {
    if (!event) return [];
    const markers: MapMarker[] = [];
    let idx = 0;
    // Prefer event-level Point locations; if none exist (e.g. all Polygons), use signal locations.
    const eventLocs = eventLocations(event);
    const hasEventPoints = eventLocs.some((l) => l.geometry?.type === "Point");
    const sourceLocs: GqlLocation[] = hasEventPoints
      ? eventLocs
      : (event.signals ?? []).flatMap((s) =>
          [s.generalLocation, s.originLocation, s.destinationLocation].filter((l): l is GqlLocation => !!l),
        );
    for (const loc of sourceLocs) {
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
        severity: mapSeverity(event.severity),
        description: loc.name,
      });
    }
    return markers;
  }, [event]);

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

  const showPending = isPending && !!event;
  const hookPrimaryMapLocation =
    event?.generalLocation ?? event?.originLocation ?? event?.destinationLocation;
  const hookSevColor = event ? severityColor(event.severity) : "var(--color-text-muted)";

  const {
    displayMarkers: mapDisplayMarkers,
    displayLocation: mapDisplayLocation,
    displaySevColor: headerBorderColor,
    displayCenter: mapDisplayCenter,
    holdRegionFit,
    flyDuration: mapFlyDuration,
  } = useNavigationMapDisplay({
    isPending: showPending,
    mapMarkers,
    primaryLocation: hookPrimaryMapLocation,
    sevColor: hookSevColor,
    navigationMapCenter,
    resolvedMapCenter: mapCenter,
  });

  // Show skeleton UI on initial load (no event data yet) - no spinning wheel
  if (loading && !event) {
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
            <KpiStripSkeleton />
            <SummaryCardSkeleton />
            <DiscussionCardSkeleton />
            <SignalsListCardSkeleton />
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

  if (!event) {
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
            href={referrer === "map" ? "/map" : "/detection"}
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

  // Field mappings from old schema to current GqlEvent schema
  const eventStatus = event.alerts[0]?.status ?? "active";
  // event.firstSignalCreatedAt replaces event.createdAt
  // event.lastSignalCreatedAt replaces event.updatedAt
  const eventCreatedAt = event.firstSignalCreatedAt;
  const eventUpdatedAt = event.lastSignalCreatedAt;
  // event.types[0] replaces event.eventType
  const eventType = event.types[0] ?? "";

  const sev = mapSeverity(event.severity);
  const sevBg = severityColors[sev]?.bg ?? "var(--color-bg-muted)";
  const isCompact = mode === "drawer";

  // signal.publishedAt replaces signal.source.detectedAt
  const detectedAt =
    event.signals?.[0]?.publishedAt ?? event.firstSignalCreatedAt;

  const locations = eventLocations(event);
  const primaryLocation = resolveLocationName(locations[0]) ?? undefined;

  // TODO: after Prisma migration: use `event.title` directly (remove fallback below)
  const displayTitle =
    // event.title ??  // uncomment after Prisma migration
    event.title ?? (primaryLocation ? `${eventType} - ${primaryLocation}` : eventType);

  // TODO: after Prisma migration: use `event.types` (string[]) directly
  const eventTypes: string[] = event.types.length > 0 ? event.types : [eventType];

  const signalCount = event.signals.length;
  const sourceCount = new Set(event.signals.map((s) => s.source.name)).size;

  // Resolve best available location population: prefer L2, fall back to L1, then L0.
  const areaPopulation = (() => {
    const primaryLoc = event.generalLocation ?? event.originLocation ?? event.destinationLocation;
    if (!primaryLoc) return null;
    const candidates = [primaryLoc, ...(primaryLoc.ancestors ?? [])];
    for (const level of [2, 1, 0]) {
      const loc = candidates.find((c) => c.level === level && c.population);
      if (loc) return { name: loc.name, value: loc.population! };
    }
    return null;
  })();

  // IDP per capita: find iom_dtm_displacement metadata, falling back A2 → A1 → A0.
  const idpData = (() => {
    const primaryLoc = event.generalLocation ?? event.originLocation ?? event.destinationLocation;
    if (!primaryLoc) return null;
    const candidates = [primaryLoc, ...(primaryLoc.ancestors ?? [])];
    for (const level of [2, 1, 0]) {
      const loc = candidates.find((c) => c.level === level);
      if (!loc) continue;
      const meta = loc.metadata?.find((m) => m.type === "iom_dtm_displacement");
      if (!meta) continue;
      const displaced = meta.data.population_displaced as number | undefined;
      if (!displaced) continue;
      const population = loc.population ? Number(loc.population) : null;
      const ratio = population ? displaced / population : null;
      return { displaced, population, ratio, name: loc.name };
    }
    return null;
  })();

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
              <Link href={referrer === "map" ? "/map" : "/detection"} style={{ textDecoration: "none" }}>
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
              
              {/* Prev/Next navigation */}
              {navigation && (
                <Group gap={8}>
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    onClick={onNavigatePrev}
                    disabled={!navigation.hasPrev}
                    title={t("nav.previous")}
                    aria-label={t("nav.previous")}
                  >
                    <IconChevronLeft size={16} />
                  </ActionIcon>
                  <Text size="xs" c="var(--color-text-muted)" fw={500} style={{ minWidth: 60, textAlign: "center" }}>
                    {navigation.position}
                  </Text>
                  <ActionIcon
                    size="sm"
                    variant="subtle"
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

            <Link
              href={`/map?event=${event.id}`}
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
          </Group>
        </Box>
      )}

      {/* Header */}
      <Box
        px={isCompact ? 20 : 24}
        pt={isCompact ? 16 : 20}
        pb={isCompact ? 16 : 20}
        style={{
          background: isAlready || promoted ? "var(--color-critical-light)" : "var(--color-bg-white)",
          borderBottom: "1px solid var(--color-border)",
          borderInlineStart: `4px solid ${headerBorderColor}`,
        }}
      >
        <SkeletonSlot pending={showPending} skeleton={<EventHeaderSkeleton isCompact={isCompact} />}>
        {/* Severity badge */}
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

        {/* Title row - title left, active status right, both top-aligned */}
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
            <Box
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: eventStatus === "published" ? "#059669" : "#A3A3A3",
                flexShrink: 0,
                marginTop: 1,
              }}
            />
            <Text
              size="xs"
              fw={500}
              c={eventStatus === "published" ? "#059669" : "#737373"}
            >
              {eventStatus === "published" ? t("status.active") : t("status.resolved")}
            </Text>
          </Group>
        </Group>

        {/* Type pills - L1 + L2 */}
        <Group gap={6} mb={14} wrap="wrap">
          {getDisasterPills(eventTypes).map((pill) => (
            <span
              key={pill.label}
              style={{
                display: "inline-block",
                padding: "2px 10px",
                borderRadius: 999,
                fontSize: 11,
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
          {getDisasterL2Pills(eventTypes).map((pill) => (
            <span
              key={pill.label}
              style={{
                display: "inline-block",
                padding: "2px 10px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 500,
                color: pill.color,
                background: "transparent",
                border: `1px solid ${pill.color}`,
                letterSpacing: "0.01em",
                whiteSpace: "nowrap",
                opacity: 0.75,
              }}
            >
              {pill.label}
            </span>
          ))}
        </Group>

        {/* Meta */}
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
            <Text size="xs" c="var(--color-text-secondary)">{format.dateTime(new Date(detectedAt), "short")}</Text>
          </Group>
          <Group gap={4}>
            <IconClock size={13} color="var(--color-text-muted)" />
            <Text size="xs" c="var(--color-text-muted)">{format.relativeTime(new Date(detectedAt))}</Text>
          </Group>
          <Box style={{ width: 1, height: 12, background: "var(--color-border)", alignSelf: "center" }} />
          <Group gap={4}>
            <IconRadar size={13} color="var(--color-text-muted)" />
            <Text size="xs" c="var(--color-text-secondary)" fw={500}>
              {t("signalCount", { count: signalCount })}
            </Text>
          </Group>
          {sourceCount > 0 && (
            <Group gap={4}>
              <IconDatabase size={13} color="var(--color-text-muted)" />
              <Text size="xs" c="var(--color-text-secondary)">
                {t("sourceCount", { count: sourceCount })}
              </Text>
            </Group>
          )}
        </Group>
        </SkeletonSlot>
      </Box>

      {/* KPI strip */}
      {!isCompact && (
        <Box px={24} pt={24}>
          <SkeletonSlot pending={showPending} skeleton={<KpiStripSkeleton />}>
          <KpiStack
            sections={[
              {
                title: t("kpi.impact"),
                items: [
                  {
                    icon: <IconUsers size={14} color="var(--color-accent)" />,
                    iconBg: "var(--color-accent-light)",
                    value: bigIntStrToNumber(event.populationAffected) !== null ? format.number(bigIntStrToNumber(event.populationAffected)!, "compact") : "-",
                    label: t("kpi.peopleAffected"),
                  },
                  {
                    icon: <IconUsersGroup size={14} color="var(--color-warning)" />,
                    iconBg: "var(--color-warning-light)",
                    value: bigIntStrToNumber(event.populationDisplaced) !== null ? format.number(bigIntStrToNumber(event.populationDisplaced)!, "compact") : "-",
                    label: t("kpi.peopleDisplaced"),
                  },
                ],
              },
              {
                title: t("kpi.areaContext"),
                items: [
                  {
                    icon: <IconUsersGroup size={14} color="var(--color-info)" />,
                    iconBg: "var(--color-info-light)",
                    value: areaPopulation ? format.number(Number(areaPopulation.value), "compact") : "-",
                    label: areaPopulation ? t("kpi.peopleInArea") : t("kpi.peopleInArea"),
                  },
                  {
                    icon: <IconTrendingUp size={14} color="var(--color-text-muted)" />,
                    iconBg: "var(--color-bg-muted)",
                    value:
                      idpData?.ratio != null
                        ? `${(idpData.ratio * 100).toFixed(1)}%`
                        : idpData?.displaced != null
                          ? format.number(idpData.displaced, "compact")
                          : "-",
                    label: idpData
                      ? t("kpi.idpPerCapitaIn", { name: idpData.name })
                      : t("kpi.idpPerCapita"),
                  },
                ],
              },
            ]}
          />
          </SkeletonSlot>
        </Box>
      )}

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
          <SkeletonSlot pending={showPending} skeleton={<SummaryCardSkeleton />}>
          {/* Summary */}
          <Card p={0} mb={20} style={{ border: "1px solid var(--color-border)" }}>
            <Box px={16} py={12} className="border-b border-[var(--color-border)]">
              <Group justify="space-between">
                <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 14 }}>
                  {t("summary.title")}
                </Text>
                <Badge
                  size="xs"
                  style={{
                    background: "var(--color-ai-light)",
                    color: "#7C3AED",
                    border: "1px solid #7C3AED25",
                    fontWeight: 600,
                  }}
                >
                  {tCommon("badges.aiGenerated")}
                </Badge>
              </Group>
            </Box>
            <Box p={16}>
              <Text size="sm" c="var(--color-text-secondary)" style={{ lineHeight: 1.75 }}>
                {event.description ?? t("summary.empty")}
              </Text>
            </Box>
          </Card>
          </SkeletonSlot>

          <SkeletonSlot pending={showPending} skeleton={<DiscussionCardSkeleton />}>
          {/* Discussion */}
          <Card p={0} mb={20} style={{ border: "1px solid var(--color-border)" }}>
            <CommentsSection entityId={event.id} entityType="event" />
          </Card>
          </SkeletonSlot>

          <SkeletonSlot pending={showPending} skeleton={<SignalsListCardSkeleton />}>
          {/* Source Signals */}
          <Card p={0} mb={20} style={{ border: "1px solid var(--color-border)" }}>
            <Box px={16} py={12} className="border-b border-[var(--color-border)]">
              <Group justify="space-between">
                <Group gap={8}>
                  <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 14 }}>
                    {t("signals.title", { count: event.signals.length })}
                  </Text>
                  <Text size="xs" c="var(--color-text-muted)" style={{ fontWeight: 400 }}>
                    {t("signals.subtitle")}
                  </Text>
                </Group>
              </Group>
            </Box>
            <Box>
              {event.signals.length === 0 && (
                <Box px={16} py={24} style={{ textAlign: "center" }}>
                  <Text c="var(--color-text-muted)" size="sm">{t("signals.empty")}</Text>
                </Box>
              )}
              {event.signals.map((sig) => {
                const sigLocation = sig.generalLocation ?? sig.originLocation ?? sig.destinationLocation;
                const sigTitle =
                  sig.title ??
                  (sig.description ? sig.description.slice(0, 100) + (sig.description.length > 100 ? "…" : "") : t("signals.fallbackTitle", { id: sig.id }));
                return (
                  <Box
                    key={sig.id}
                    px={16}
                    py={12}
                    className="border-b border-[var(--color-border)] hover:bg-[var(--color-bg-muted)] cursor-pointer"
                    style={{ display: "flex", gap: 12 }}
                    onClick={() => router.push(`/signal/${sig.id}`)}
                  >
                      <Box style={{ width: 3, background: "var(--color-text-muted)", flexShrink: 0, borderRadius: 2 }} />
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Group justify="space-between" mb={4}>
                          <Group gap={6}>
                            <Badge size="xs" style={{ background: "var(--color-bg-muted)", color: "var(--color-text-secondary)", fontWeight: 600 }}>
                              {sig.source.name}
                            </Badge>
                            <Badge size="xs" variant="outline" style={{ color: "var(--color-text-muted)", borderColor: "color-mix(in srgb, var(--color-text-muted) 25%, transparent)", fontSize: 10 }}>
                              {sig.source.type}
                            </Badge>
                          </Group>
                          <Group gap={8}>
                            {sig.url && (
                              <a
                                href={sig.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: "#E85D3D", textDecoration: "none" }}
                              >
                                <IconExternalLink size={11} />
                                {t("signals.sourceLink")}
                              </a>
                            )}
                            <Text size="xs" c="var(--color-text-muted)">{format.relativeTime(new Date(sig.publishedAt))}</Text>
                          </Group>
                        </Group>
                        <Text fw={500} size="sm" c="var(--color-text-primary)" lineClamp={2} style={{ lineHeight: 1.4 }} mb={sigLocation ? 2 : 0}>
                          {sigTitle}
                        </Text>
                        {sigLocation && (
                          <Text size="xs" c="var(--color-text-muted)">{sigLocation.name}</Text>
                        )}
                      </Box>
                  </Box>
                );
              })}
            </Box>
          </Card>
          </SkeletonSlot>

          <SkeletonSlot
            pending={showPending || relatedLoading}
            skeleton={<RelatedEventsCardSkeleton />}
          >
          {/* Related Events */}
          <Card p={0} style={{ border: "1px solid var(--color-border)" }}>
            <Box px={16} py={12} className="border-b border-[var(--color-border)]">
              <Group justify="space-between">
                <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 14 }}>
                  {t("related.title")}
                </Text>
                {relatedLoading && <Loader size={14} />}
              </Group>
            </Box>
            <Box>
              {relatedEvents.length === 0 && !relatedLoading && (
                <Box px={16} py={24} style={{ textAlign: "center" }}>
                  <Text c="var(--color-text-muted)" size="sm">{t("related.empty")}</Text>
                </Box>
              )}
              {relatedEvents.slice(0, 5).map((related) => {
                const relSev = mapSeverity(related.severity);
                const relColor = severityColor(related.severity);
                const relBg = severityColors[relSev]?.bg ?? "var(--color-bg-muted)";
                // Resolve the human label for the primary disaster type so the
                // title fallback shows e.g. "Pandemic" instead of the raw code
                // "pa", and feed the L1 pill so we can render the disaster
                // category alongside severity.
                const primaryTypeCode = related.types?.[0];
                const primaryTypeLabel = primaryTypeCode
                  ? getDisasterLabel(primaryTypeCode)
                  : null;
                const typePill = getDisasterPills(related.types ?? [])[0];
                const relTitle =
                  related.title ?? related.description ?? primaryTypeLabel ?? "";
                const relDate = related.lastSignalCreatedAt
                  ? new Date(related.lastSignalCreatedAt)
                  : null;
                const relDateLabel =
                  relDate && !Number.isNaN(relDate.getTime())
                    ? format.relativeTime(relDate)
                    : "-";
                return (
                  <Link
                    key={related.id}
                    href={`/event/${related.id}`}
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
                        <Group justify="space-between" mb={2} wrap="nowrap">
                          <Group gap={6} wrap="nowrap">
                            <Badge
                              size="xs"
                              style={{ background: relBg, color: relColor, fontWeight: 600 }}
                            >
                              {tCommon(`severities.${relSev}`)}
                            </Badge>
                            {typePill && (
                              <Badge
                                size="xs"
                                style={{ background: typePill.bg, color: typePill.color, fontWeight: 600 }}
                              >
                                {typePill.label}
                              </Badge>
                            )}
                          </Group>
                          <Text size="xs" c="var(--color-text-muted)">{relDateLabel}</Text>
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
                <FeedbackSection entityId={event.id} entityType="event" />
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
                    {isAlready || promoted ? (
                      <Button
                        variant="filled"
                        size="xs"
                        leftSection={<IconBellRinging size={13} />}
                        fullWidth
                        disabled
                        style={{
                          fontSize: 12,
                          background: "var(--color-critical-light)",
                          color: "var(--color-critical)",
                          border: "1px solid color-mix(in srgb, var(--color-critical) 20%, transparent)",
                          cursor: "default",
                        }}
                      >
                        {t("actions.alert")}
                      </Button>
                    ) : confirmPromote ? (
                      <Stack gap={6}>
                        <Text size="xs" c="var(--color-critical)" fw={600} style={{ textAlign: "center" }}>
                          {t("actions.confirmPrompt")}
                        </Text>
                        <Group gap={6} grow>
                          <Button
                            variant="light"
                            color="gray"
                            size="xs"
                            style={{ fontSize: 12 }}
                            onClick={() => setConfirmPromote(false)}
                          >
                            {tCommon("actions.cancel")}
                          </Button>
                          <Button
                            variant="filled"
                            size="xs"
                            leftSection={promoteToAlert.isPending ? <Loader size={11} color="white" /> : <IconBellRinging size={13} />}
                            loading={promoteToAlert.isPending}
                            onClick={() => promoteToAlert.mutate({ eventId: event.id })}
                            style={{ fontSize: 12, background: "var(--color-critical)", border: "none" }}
                          >
                            {tCommon("actions.confirm")}
                          </Button>
                        </Group>
                        {promoteToAlert.isError && (
                          <Text size="xs" c="var(--color-critical)" style={{ textAlign: "center" }}>
                            {t("actions.failed")}
                          </Text>
                        )}
                      </Stack>
                    ) : (
                      <Tooltip
                        label={t("actions.noPermission")}
                        disabled={canPromote}
                        position="top"
                        withArrow
                      >
                        <Button
                          variant="filled"
                          size="xs"
                          leftSection={<IconBellRinging size={13} />}
                          fullWidth
                          data-disabled={canPromote ? undefined : true}
                          onClick={(e) => {
                            if (!canPromote) { e.preventDefault(); return; }
                            setConfirmPromote(true);
                          }}
                          style={
                            canPromote
                              ? { fontSize: 12, background: "var(--color-critical)", border: "none" }
                              : { fontSize: 12 }
                          }
                        >
                          {t("actions.turnIntoAlert")}
                        </Button>
                      </Tooltip>
                    )}
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
                    <AddToCrisisButton
                      eventId={event.id}
                      defaultSeverity={
                        event.severity ?? Math.round((event.rank ?? 0) * 5)
                      }
                    />
                    <ShareEventButton eventId={event.id} />
                  </Stack>
                </Box>
              </Card>
              </SkeletonSlot>

              <SkeletonSlot pending={showPending} skeleton={<SystemDataCardSkeleton />}>
              <Card p={0} style={{ border: "1px solid var(--color-border)" }}>
                <UnstyledButton
                  onClick={() => setSystemDataOpen((o) => !o)}
                  style={{ width: "100%" }}
                >
                  <Box px={16} py={10} className="border-b border-[var(--color-border)]">
                    <Group gap={6} justify="space-between">
                      <Group gap={6}>
                        <IconDatabase size={14} color="var(--color-text-secondary)" />
                        <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 13 }}>
                          {t("systemData.title")}
                        </Text>
                      </Group>
                      {systemDataOpen
                        ? <IconChevronUp size={13} color="var(--color-text-muted)" />
                        : <IconChevronDown size={13} color="var(--color-text-muted)" />}
                    </Group>
                  </Box>
                </UnstyledButton>
                <Collapse in={systemDataOpen}>
                <Box p={16}>
                  <Stack gap={8}>
                    <Group justify="space-between">
                      <Text size="xs" c="var(--color-text-muted)">
                        {t("systemData.eventId")}
                      </Text>
                      <Text size="xs" fw={500} c="var(--color-text-primary)">
                        #{event.id}
                      </Text>
                    </Group>
                    {event.signals?.[0]?.source && (
                      <Group justify="space-between">
                        <Text size="xs" c="var(--color-text-muted)">
                          {t("systemData.source")}
                        </Text>
                        <Text size="xs" fw={500} c="var(--color-text-primary)">
                          {event.signals[0].source.name}
                        </Text>
                      </Group>
                    )}
                    <Group justify="space-between">
                      <Text size="xs" c="var(--color-text-muted)">
                        {t("systemData.detected")}
                      </Text>
                      <Text size="xs" fw={500} c="var(--color-text-primary)">
                        {format.dateTime(new Date(detectedAt), "short")}
                      </Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="xs" c="var(--color-text-muted)">{t("systemData.validFrom")}</Text>
                      <Text size="xs" fw={500}>
                        {event?.validFrom ? format.dateTime(new Date(event.validFrom), "short") : "-"}
                      </Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="xs" c="var(--color-text-muted)">{t("systemData.validUntil")}</Text>
                      <Text size="xs" fw={500}>
                        {event?.validTo ? format.dateTime(new Date(event.validTo), "short") : "-"}
                      </Text>
                    </Group>
                    {locations.some((l) => resolveLocationName(l)) && (
                      <Box
                        style={{ borderTop: "1px solid var(--color-border)" }}
                        pt={8}
                        mt={2}
                      >
                        <Text size="xs" c="var(--color-text-muted)" mb={6}>
                          {t("systemData.affectedAreas")}
                        </Text>
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
                    <Box
                      style={{ borderTop: "1px solid var(--color-border)" }}
                      pt={8}
                      mt={2}
                    >
                      <Group justify="space-between">
                        <Text size="xs" c="var(--color-text-muted)">
                          {t("systemData.created")}
                        </Text>
                        <Text size="xs" fw={500} c="var(--color-text-primary)">
                          {format.dateTime(new Date(eventCreatedAt), "dateTime")}
                        </Text>
                      </Group>
                    </Box>
                    <Group justify="space-between">
                      <Text size="xs" c="var(--color-text-muted)">
                        {t("systemData.updated")}
                      </Text>
                      <Text size="xs" fw={500} c="var(--color-text-primary)">
                        {format.dateTime(new Date(eventUpdatedAt), "dateTime")}
                      </Text>
                    </Group>
                  </Stack>
                </Box>
                </Collapse>
              </Card>
              </SkeletonSlot>
            </Stack>
          </Box>
        )}
      </Box>

    </Box>
  );
}
