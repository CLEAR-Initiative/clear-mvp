"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  UnstyledButton,
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
  IconShieldExclamation,
  IconWorld,
  IconBellRinging,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { useLocations } from "~/hooks/use-locations";
import { MinimapCard } from "~/components/map/minimap-card";
import type { MapMarker } from "~/components/map/crisis-map";
import { mapSeverity, severityColor } from "~/lib/types/graphql";
import type { GqlEvent, GqlLocation } from "~/lib/types/graphql";
import { getDisasterPills } from "~/lib/disaster-types";
import { resolveLocationName } from "~/lib/location";
import { CommentsSection } from "~/components/comments-section";
import { FeedbackSection } from "~/components/feedback-section";
import { AddToCrisisButton } from "~/components/event-detail/add-to-crisis-button";
import { severityColors, severityLabels } from "~/lib/constants/severity";

// ── Mock data ─────────────────────────────────────────────────────────────────
// These fields don't exist in the current API response.
// Remove and replace with real fields when backend delivers them.
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
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
  mode: "page" | "drawer";
  relatedEvents?: GqlEvent[];
  relatedLoading?: boolean;
}

export function EventDetailContent({
  event,
  loading,
  mode,
  relatedEvents = [],
  relatedLoading = false,
}: EventDetailContentProps) {
  // TODO: after Prisma migration use event.title directly; remove this fallback
  // TODO: after Prisma migration use event.types (list) instead of eventType

  const router = useRouter();
  const isAlready = (event?.alerts?.length ?? 0) > 0;
  const [promoted, setPromoted] = useState(false);
  const [confirmPromote, setConfirmPromote] = useState(false);
  const [systemDataOpen, setSystemDataOpen] = useState(false);
  const promoteToAlert = api.alerts.promoteToAlert.useMutation({
    onSuccess: () => { setPromoted(true); setConfirmPromote(false); },
  });

  const mapMarkers = useMemo<MapMarker[]>(() => {
    if (!event) return [];
    const markers: MapMarker[] = [];
    let idx = 0;
    for (const loc of eventLocations(event)) {
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

  if (loading) {
    return (
      <Box
        p={48}
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 400,
        }}
      >
        <Loader size="lg" />
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
          Event not found
        </Text>
        <Text size="sm" c="#737373" mt={8}>
          This event may have been removed or the ID is invalid.
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
            &larr; Back to Events Overview
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

  const sevColor = severityColor(event.severity);
  const sev = mapSeverity(event.severity);
  const sevBg = severityColors[sev]?.bg ?? "#F5F5F5";
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
          style={{ background: "#FFF", borderBottom: "1px solid #E5E5E5" }}
        >
          <Group justify="space-between">
            <Link href="/detection" style={{ textDecoration: "none" }}>
              <Group
                gap={6}
                className="hover:opacity-70"
                style={{ cursor: "pointer" }}
              >
                <IconArrowLeft size={14} color="#525252" />
                <Text size="sm" c="#525252" fw={500}>
                  Back to Events Overview
                </Text>
              </Group>
            </Link>
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
                  View on Crisis Map
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
          background: isAlready || promoted ? "var(--color-critical-light)" : "#FFF",
          borderBottom: "1px solid #E5E5E5",
          borderLeft: `4px solid ${sevColor}`,
        }}
      >
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
            {severityLabels[sev]}
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
            c="#171717"
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
              {eventStatus === "published" ? "Active" : "Resolved"}
            </Text>
          </Group>
        </Group>

        {/* Type pills */}
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
        </Group>

        {/* Meta */}
        <Group gap={16} wrap="wrap">
          {locations.some((l) => resolveLocationName(l)) && (
            <Group gap={4}>
              <IconMapPin size={13} color="#737373" />
              <Text size="xs" c="#525252" fw={500}>
                {locations.map((l) => resolveLocationName(l)).filter(Boolean).join(", ")}
              </Text>
            </Group>
          )}
          <Group gap={4}>
            <IconCalendar size={13} color="#737373" />
            <Text size="xs" c="#525252">{formatDate(detectedAt)}</Text>
          </Group>
          <Group gap={4}>
            <IconClock size={13} color="#A3A3A3" />
            <Text size="xs" c="#A3A3A3">{formatTimeAgo(detectedAt)}</Text>
          </Group>
          <Box style={{ width: 1, height: 12, background: "#E5E5E5", alignSelf: "center" }} />
          <Group gap={4}>
            <IconRadar size={13} color="#737373" />
            <Text size="xs" c="#525252" fw={500}>
              {signalCount} signal{signalCount !== 1 ? "s" : ""}
            </Text>
          </Group>
          {sourceCount > 0 && (
            <Group gap={4}>
              <IconDatabase size={13} color="#737373" />
              <Text size="xs" c="#525252">
                {sourceCount} source{sourceCount !== 1 ? "s" : ""}
              </Text>
            </Group>
          )}
        </Group>
      </Box>

      {/* KPI strip */}
      {!isCompact && (
        <Box
          px={24}
          py={16}
          style={{ background: "#FAFAFA", borderBottom: "1px solid #E5E5E5" }}
        >
          <Group gap={12}>

            {/* Casualties */}
            <Box
              p={16}
              style={{
                flex: 1,
                background: "#FFF",
                border: "1px solid #E5E5E5",
                borderRadius: 8,
                display: "flex",
                gap: 12,
                alignItems: "center",
              }}
            >
              <Box
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: "#FEF2F0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <IconUsers size={18} color="#E85D3D" />
              </Box>
              <Box>
                <Text fw={700} c="#171717" style={{ fontSize: 20, lineHeight: 1, letterSpacing: "-0.02em" }}>
                  {event.casualties != null ? event.casualties.toLocaleString() : "N/A"}
                </Text>
                <Text size="xs" c="#737373" mt={2}>Casualties</Text>
              </Box>
            </Box>

            {/* Population in Area */}
            <Box
              p={16}
              style={{
                flex: 1,
                background: "#FFF",
                border: "1px solid #E5E5E5",
                borderRadius: 8,
                display: "flex",
                gap: 12,
                alignItems: "center",
              }}
            >
              <Box
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: "#EFF6FF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <IconWorld size={18} color="#2563EB" />
              </Box>
              <Box>
                <Text fw={700} c="#171717" style={{ fontSize: 20, lineHeight: 1, letterSpacing: "-0.02em" }}>
                  {areaPopulation ? Number(areaPopulation.value).toLocaleString() : "N/A"}
                </Text>
                <Text size="xs" c="#737373" mt={2}>
                  {areaPopulation ? `Population in ${areaPopulation.name}` : "Population in area"}
                </Text>
              </Box>
            </Box>

            {/* IDP per capita */}
            <Box
              p={16}
              style={{
                flex: 1,
                background: "#FFF",
                border: "1px solid #E5E5E5",
                borderRadius: 8,
                display: "flex",
                gap: 12,
                alignItems: "center",
              }}
            >
              <Box
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: "#FEF3C7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <IconShieldExclamation size={18} color="#D97706" />
              </Box>
              <Box>
                <Text fw={700} c="#171717" style={{ fontSize: 20, lineHeight: 1, letterSpacing: "-0.02em" }}>
                  {idpData?.ratio != null
                    ? `${(idpData.ratio * 100).toFixed(1)}%`
                    : idpData?.displaced != null
                      ? idpData.displaced.toLocaleString()
                      : "N/A"}
                </Text>
                <Text size="xs" c="#737373" mt={2}>
                  {idpData
                    ? `IDPs per capita in ${idpData.name} (${idpData.displaced.toLocaleString()} displaced)`
                    : "IDP per capita"}
                </Text>
              </Box>
            </Box>

          </Group>
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
          {/* Summary */}
          <Card p={0} mb={20} style={{ border: "1px solid #E5E5E5" }}>
            <Box px={16} py={12} className="border-b border-[#E5E5E5]">
              <Group justify="space-between">
                <Text fw={600} c="#171717" style={{ fontSize: 14 }}>
                  Summary
                </Text>
                <Badge
                  size="xs"
                  style={{
                    background: "#F3E8FF",
                    color: "#7C3AED",
                    border: "1px solid #7C3AED25",
                    fontWeight: 600,
                  }}
                >
                  ✦ AI generated
                </Badge>
              </Group>
            </Box>
            <Box p={16}>
              <Text size="sm" c="#374151" style={{ lineHeight: 1.75 }}>
                {event.description ?? "No summary available."}
              </Text>
            </Box>
          </Card>

          {/* Discussion */}
          <Card p={0} mb={20} style={{ border: "1px solid #E5E5E5" }}>
            <CommentsSection entityId={event.id} entityType="event" />
          </Card>

          {/* Source Signals */}
          <Card p={0} mb={20} style={{ border: "1px solid #E5E5E5" }}>
            <Box px={16} py={12} className="border-b border-[#E5E5E5]">
              <Group justify="space-between">
                <Group gap={8}>
                  <Text fw={600} c="#171717" style={{ fontSize: 14 }}>
                    Signals ({event.signals.length})
                  </Text>
                  <Text size="xs" c="#A3A3A3" style={{ fontWeight: 400 }}>
                    Source intelligence that triggered this event
                  </Text>
                </Group>
              </Group>
            </Box>
            <Box>
              {event.signals.length === 0 && (
                <Box px={16} py={24} style={{ textAlign: "center" }}>
                  <Text c="#A3A3A3" size="sm">No signals attached</Text>
                </Box>
              )}
              {event.signals.map((sig) => {
                const sigLocation = sig.generalLocation ?? sig.originLocation ?? sig.destinationLocation;
                const sigTitle =
                  sig.title ??
                  (sig.description ? sig.description.slice(0, 100) + (sig.description.length > 100 ? "…" : "") : `Signal ${sig.id}`);
                return (
                  <Box
                    key={sig.id}
                    px={16}
                    py={12}
                    className="border-b border-[#E5E5E5] hover:bg-[#F9FAFB] cursor-pointer"
                    style={{ display: "flex", gap: 12 }}
                    onClick={() => router.push(`/signal/${sig.id}`)}
                  >
                      <Box style={{ width: 3, background: "#737373", flexShrink: 0, borderRadius: 2 }} />
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Group justify="space-between" mb={4}>
                          <Group gap={6}>
                            <Badge size="xs" style={{ background: "#F5F5F5", color: "#525252", fontWeight: 600 }}>
                              {sig.source.name}
                            </Badge>
                            <Badge size="xs" variant="outline" style={{ color: "#737373", borderColor: "#73737340", fontSize: 10 }}>
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
                                Source
                              </a>
                            )}
                            <Text size="xs" c="#A3A3A3">{formatTimeAgo(sig.publishedAt)}</Text>
                          </Group>
                        </Group>
                        <Text fw={500} size="sm" c="#171717" lineClamp={2} style={{ lineHeight: 1.4 }} mb={sigLocation ? 2 : 0}>
                          {sigTitle}
                        </Text>
                        {sigLocation && (
                          <Text size="xs" c="#737373">{sigLocation.name}</Text>
                        )}
                      </Box>
                  </Box>
                );
              })}
            </Box>
          </Card>

          {/* Related Events */}
          <Card p={0} style={{ border: "1px solid #E5E5E5" }}>
            <Box px={16} py={12} className="border-b border-[#E5E5E5]">
              <Group justify="space-between">
                <Text fw={600} c="#171717" style={{ fontSize: 14 }}>
                  Related Events
                </Text>
                {relatedLoading && <Loader size={14} />}
              </Group>
            </Box>
            <Box>
              {relatedEvents.length === 0 && !relatedLoading && (
                <Box px={16} py={24} style={{ textAlign: "center" }}>
                  <Text c="#A3A3A3" size="sm">No related events found</Text>
                </Box>
              )}
              {relatedEvents.slice(0, 5).map((related) => {
                const relSev = mapSeverity(related.severity);
                const relColor = severityColor(related.severity);
                const relBg = severityColors[relSev]?.bg ?? "#F5F5F5";
                const relTitle = related.title ?? related.description ?? related.types[0] ?? "";
                return (
                  <Link
                    key={related.id}
                    href={`/event/${related.id}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <Box
                      px={16}
                      py={12}
                      className="border-b border-[#E5E5E5] hover:bg-[#F9FAFB] cursor-pointer"
                      style={{ display: "flex", gap: 12 }}
                    >
                      <Box style={{ width: 3, background: relColor, flexShrink: 0, borderRadius: 2 }} />
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Group justify="space-between" mb={2}>
                          <Badge size="xs" style={{ background: relBg, color: relColor, fontWeight: 600 }}>
                            {severityLabels[relSev]}
                          </Badge>
                          <Text size="xs" c="#A3A3A3">{formatTimeAgo(related.lastSignalCreatedAt)}</Text>
                        </Group>
                        <Text size="sm" fw={500} c="#171717" lineClamp={2} style={{ lineHeight: 1.4 }}>
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

        {/* Right sidebar */}
        {!isCompact && (
          <Box style={{ width: 300, flexShrink: 0 }}>
            <Stack gap={20}>
              {/* Location map */}
              <MinimapCard
                markers={mapMarkers}
                center={mapCenter}
                sudanGeometry={sudanGeometry}
                sudanId={sudanId}
              />

              {/* Was this event helpful? */}
              <Card p={0} style={{ border: "1px solid #E5E5E5" }}>
                <FeedbackSection entityId={event.id} entityType="event" />
              </Card>

              {/* Actions */}
              <Card p={0} style={{ border: "1px solid #E5E5E5" }}>
                <Box px={16} py={10} className="border-b border-[#E5E5E5]">
                  <Text fw={600} c="#171717" style={{ fontSize: 13 }}>
                    Actions
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
                        Alert
                      </Button>
                    ) : confirmPromote ? (
                      <Stack gap={6}>
                        <Text size="xs" c="var(--color-critical)" fw={600} style={{ textAlign: "center" }}>
                          Raise this event as an alert?
                        </Text>
                        <Group gap={6} grow>
                          <Button
                            variant="light"
                            color="gray"
                            size="xs"
                            style={{ fontSize: 12 }}
                            onClick={() => setConfirmPromote(false)}
                          >
                            Cancel
                          </Button>
                          <Button
                            variant="filled"
                            size="xs"
                            leftSection={promoteToAlert.isPending ? <Loader size={11} color="white" /> : <IconBellRinging size={13} />}
                            loading={promoteToAlert.isPending}
                            onClick={() => promoteToAlert.mutate({ eventId: event.id })}
                            style={{ fontSize: 12, background: "var(--color-critical)", border: "none" }}
                          >
                            Confirm
                          </Button>
                        </Group>
                        {promoteToAlert.isError && (
                          <Text size="xs" c="var(--color-critical)" style={{ textAlign: "center" }}>
                            Failed. Try again.
                          </Text>
                        )}
                      </Stack>
                    ) : (
                      <Button
                        variant="filled"
                        size="xs"
                        leftSection={<IconBellRinging size={13} />}
                        fullWidth
                        onClick={() => setConfirmPromote(true)}
                        style={{
                          fontSize: 12,
                          background: "var(--color-critical)",
                          border: "none",
                        }}
                      >
                        Turn into Alert
                      </Button>
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
                  </Stack>
                </Box>
              </Card>

              {/* System Data */}
              <Card p={0} style={{ border: "1px solid #E5E5E5" }}>
                <UnstyledButton
                  onClick={() => setSystemDataOpen((o) => !o)}
                  style={{ width: "100%" }}
                >
                  <Box px={16} py={10} className="border-b border-[#E5E5E5]">
                    <Group gap={6} justify="space-between">
                      <Group gap={6}>
                        <IconDatabase size={14} color="#525252" />
                        <Text fw={600} c="#171717" style={{ fontSize: 13 }}>
                          System Data
                        </Text>
                      </Group>
                      {systemDataOpen
                        ? <IconChevronUp size={13} color="#737373" />
                        : <IconChevronDown size={13} color="#737373" />}
                    </Group>
                  </Box>
                </UnstyledButton>
                <Collapse in={systemDataOpen}>
                <Box p={16}>
                  <Stack gap={8}>
                    <Group justify="space-between">
                      <Text size="xs" c="#737373">
                        Event ID
                      </Text>
                      <Text size="xs" fw={500} c="#171717">
                        #{event.id}
                      </Text>
                    </Group>
                    {event.signals?.[0]?.source && (
                      <Group justify="space-between">
                        <Text size="xs" c="#737373">
                          Source
                        </Text>
                        <Text size="xs" fw={500} c="#171717">
                          {event.signals[0].source.name}
                        </Text>
                      </Group>
                    )}
                    <Group justify="space-between">
                      <Text size="xs" c="#737373">
                        Detected
                      </Text>
                      <Text size="xs" fw={500} c="#171717">
                        {formatDate(detectedAt)}
                      </Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="xs" c="#737373">Valid from</Text>
                      <Text size="xs" fw={500}>
                        {event?.validFrom ? formatDate(event.validFrom) : "-"}
                      </Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="xs" c="#737373">Valid until</Text>
                      <Text size="xs" fw={500}>
                        {event?.validTo ? formatDate(event.validTo) : "-"}
                      </Text>
                    </Group>
                    {locations.some((l) => resolveLocationName(l)) && (
                      <Box
                        style={{ borderTop: "1px solid #F0F0F0" }}
                        pt={8}
                        mt={2}
                      >
                        <Text size="xs" c="#737373" mb={6}>
                          Affected Areas
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
                                  background: "#FEF2F0",
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
                      style={{ borderTop: "1px solid #F0F0F0" }}
                      pt={8}
                      mt={2}
                    >
                      <Group justify="space-between">
                        <Text size="xs" c="#737373">
                          Created
                        </Text>
                        <Text size="xs" fw={500} c="#171717">
                          {formatDateTime(eventCreatedAt)}
                        </Text>
                      </Group>
                    </Box>
                    <Group justify="space-between">
                      <Text size="xs" c="#737373">
                        Updated
                      </Text>
                      <Text size="xs" fw={500} c="#171717">
                        {formatDateTime(eventUpdatedAt)}
                      </Text>
                    </Group>
                  </Stack>
                </Box>
                </Collapse>
              </Card>
            </Stack>
          </Box>
        )}
      </Box>

    </Box>
  );
}
