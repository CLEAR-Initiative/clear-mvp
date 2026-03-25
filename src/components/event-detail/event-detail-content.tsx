"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Box,
  Text,
  Badge,
  Group,
  Card,
  Stack,
  Loader,
  Textarea,
  Button,
  Avatar,
  Divider,
  Modal,
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
  IconSend,
  IconMessageCircle,
  IconThumbUp,
  IconThumbDown,
  IconCircleCheck,
  IconCircleOff,
  IconHistory,
  IconMapPinOff,
  IconRadar,
  IconUsers,
  IconShieldExclamation,
  IconWorld,
} from "@tabler/icons-react";
import { mapSeverity, severityColor } from "~/lib/types/graphql";
import type { GqlEvent, GqlLocation } from "~/lib/types/graphql";
import { CommentsSection } from "~/components/comments-section";
import { severityColors, severityLabels } from "~/lib/constants/severity";
import type { MapMarker } from "~/components/map/crisis-map";

const CrisisMap = dynamic(
  () => import("~/components/map/crisis-map").then((m) => m.CrisisMap),
  { ssr: false, loading: () => <Box w="100%" h={180} bg="#F5F5F5" /> },
);

// ── Mock data ─────────────────────────────────────────────────────────────────
// These fields don't exist in the current API response.
// Remove and replace with real fields when backend delivers them.
const MOCK = {
  title_is_ai: false, // Dataminr: false (source headline). ACLED: true (generated).
  primary_source_label: "Post on X (Twitter)",
  intermediary: "Dataminr",
  source_url: "https://x.com/SudanDoctorsNet/status/1896152842738958399",
  ai_summary:
    "An attack attributed to Rapid Support Forces targeted a hospital in al-Obeid, North Kordofan, resulting in 12 casualties including five medical personnel. The incident represents an escalation of attacks on protected medical facilities amid heightened RSF activity across the region since late February 2026.",
  original_text:
    "Sudan Doctors Network says 12 injured, including five medical personnel, in Rapid Support Forces attack on hospital in al-Obeid, Sudan: Blog via X.",
  intelligence_label: "Dataminr · Source analysis",
  event_descriptions: [
    {
      title: "Primary Cause",
      notes:
        "Armed attack on a functioning medical facility attributed to Rapid Support Forces (RSF) in al-Obeid.",
    },
    {
      title: "Casualties",
      notes:
        "12 injured, including 5 medical personnel. No fatalities reported at time of detection.",
    },
    {
      title: "Event Location",
      notes: "Al-Obeid Hospital, North Kordofan State, Sudan.",
    },
    {
      title: "Actors Involved",
      notes:
        "Rapid Support Forces (RSF) identified as perpetrators. Sudan Doctors Network as reporting source.",
    },
    {
      title: "Property Damage",
      notes:
        "Hospital infrastructure damaged. Facility reported as non-operational following the attack.",
    },
  ],
  ratings: {
    relevance: { value: 4.2, count: 5 },
    timeliness: { value: 4.8, count: 5 },
    accuracy: { value: 3.6, count: 5 },
  },
  comments: [
    {
      id: 1,
      initials: "U1",
      author: "User 1",
      role: "Placeholder role",
      timeAgo: "2h ago",
      text: "This is a placeholder comment to show the commentary feature.",
    },
    {
      id: 2,
      initials: "U2",
      author: "User 2",
      role: "Placeholder role",
      timeAgo: "1h ago",
      text: "Placeholder content as well.",
    },
  ],
};
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
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSubmitted, setModalSubmitted] = useState(false);
  const [helpfulSubmitted, setHelpfulSubmitted] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [modalComment, setModalComment] = useState("");
  const [feedbackPending, setFeedbackPending] = useState(false);

  // submitFeedback is a no-op stub until the backend exposes this mutation.
  // TODO: wire to api.alerts.submitFeedback once Masae exposes the mutation
  const submitFeedback = {
    mutateAsync: async (_args: { alertId: string; comment: string }) => {
      // no-op stub
    },
    isPending: feedbackPending,
  };

  // TODO: after Prisma migration use event.title directly; remove this fallback
  // TODO: after Prisma migration use event.types (list) instead of eventType
  const issueTags = [
    { id: "not_relevant", label: "Not relevant", icon: IconCircleOff },
    { id: "already_known", label: "Already known", icon: IconHistory },
    { id: "wrong_area", label: "Wrong area", icon: IconMapPinOff },
    { id: "inaccurate", label: "Inaccurate", icon: IconAlertTriangle },
  ];

  function toggleTag(id: string) {
    setSelectedTags((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );
  }

  async function handleHelpful() {
    if (!event) return;
    setFeedbackPending(true);
    try {
      await submitFeedback.mutateAsync({ alertId: event.id, comment: "helpful" });
      setHelpfulSubmitted(true);
    } catch (err) {
      console.error("Failed to submit feedback", err);
    } finally {
      setFeedbackPending(false);
    }
  }

  async function handleSubmitIssues() {
    if (!event) return;
    const parts = [selectedTags.join(", "), modalComment.trim()].filter(Boolean);
    setFeedbackPending(true);
    try {
      await submitFeedback.mutateAsync({ alertId: event.id, comment: parts.join(" | ") });
      setModalSubmitted(true);
    } catch (err) {
      console.error("Failed to submit feedback", err);
    } finally {
      setFeedbackPending(false);
    }
  }

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
        severity: mapSeverity(event.rank),
        description: loc.name,
      });
    }
    return markers;
  }, [event]);

  const mapCenter = useMemo<[number, number]>(() => {
    if (!mapMarkers.length) return [30, 15];
    return [mapMarkers[0]!.lng, mapMarkers[0]!.lat];
  }, [mapMarkers]);

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
  const eventRank = event.rank;
  const eventStatus = event.alerts[0]?.status ?? "active";
  // event.firstSignalCreatedAt replaces event.createdAt
  // event.lastSignalCreatedAt replaces event.updatedAt
  const eventCreatedAt = event.firstSignalCreatedAt;
  const eventUpdatedAt = event.lastSignalCreatedAt;
  // event.types[0] replaces event.eventType
  const eventType = event.types[0] ?? "";

  const sevColor = severityColor(eventRank);
  const sev = mapSeverity(eventRank);
  const sevBg = severityColors[sev]?.bg ?? "#F5F5F5";
  const isCompact = mode === "drawer";

  // signal.publishedAt replaces signal.source.detectedAt
  const detectedAt =
    event.signals?.[0]?.publishedAt ?? event.firstSignalCreatedAt;

  const locations = eventLocations(event);
  const primaryLocation = locations[0]?.name;

  // TODO: after Prisma migration: use `event.title` directly (remove fallback below)
  const displayTitle =
    // event.title ??  // uncomment after Prisma migration
    event.title ?? (primaryLocation ? `${eventType} — ${primaryLocation}` : eventType);

  // TODO: after Prisma migration: use `event.types` (string[]) directly
  const eventTypes: string[] = event.types.length > 0 ? event.types : [eventType];

  const signalCount = event.signals.length;
  const sourceCount = new Set(event.signals.map((s) => s.source.name)).size;

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
          background: "#FFF",
          borderBottom: "1px solid #E5E5E5",
          borderLeft: `4px solid ${sevColor}`,
        }}
      >
        {/* Title row — title left, active status right, both top-aligned */}
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
          {eventTypes.map((t) => (
            <Badge
              key={t}
              size="sm"
              radius="xl"
              variant="outline"
              style={{ color: "#525252", borderColor: "#52525240", fontWeight: 500 }}
            >
              {t}
            </Badge>
          ))}
        </Group>

        {/* Meta */}
        <Group gap={16} wrap="wrap">
          {locations.length > 0 && (
            <Group gap={4}>
              <IconMapPin size={13} color="#737373" />
              <Text size="xs" c="#525252" fw={500}>
                {locations.map((l) => l.name).join(", ")}
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

            {/* Population Affected */}
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
                  {event.populationAffected ?? "N/A"}
                </Text>
                <Text size="xs" c="#737373" mt={2}>Population affected</Text>
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
                <Group gap={6} align="baseline">
                  <Text fw={700} c="#171717" style={{ fontSize: 20, lineHeight: 1, letterSpacing: "-0.02em" }}>
                    ~2.1M
                  </Text>
                  <Text size="xs" c="#A3A3A3" style={{ fontStyle: "italic" }}>(mock)</Text>
                </Group>
                <Text size="xs" c="#737373" mt={2}>Population in affected area</Text>
              </Box>
            </Box>

            {/* Placeholder */}
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
                <Text fw={700} c="#A3A3A3" style={{ fontSize: 15, lineHeight: 1.3 }}>
                  Placeholder
                </Text>
                <Text size="xs" c="#A3A3A3" mt={2}>Coming soon</Text>
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

          {/* Intelligence details */}
          <Card p={0} mb={20} style={{ border: "1px solid #E5E5E5" }}>
            <Box px={16} py={12} className="border-b border-[#E5E5E5]">
              <Group justify="space-between">
                <Group gap={8}>
                  <Text fw={600} c="#171717" style={{ fontSize: 14 }}>
                    Intelligence Details
                  </Text>
                  <Text size="xs" c="#A3A3A3" style={{ fontStyle: "italic" }}>
                    (mock data currently)
                  </Text>
                </Group>
                <Text size="xs" c="#A3A3A3">
                  {MOCK.intelligence_label}
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
              {MOCK.event_descriptions.map((item, i) => (
                <Box
                  key={i}
                  p={12}
                  style={{
                    background: "#F9FAFB",
                    border: "1px solid #E5E5E5",
                    borderRadius: 6,
                  }}
                >
                  <Text
                    size="xs"
                    fw={700}
                    c="#A3A3A3"
                    mb={4}
                    style={{
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {item.title}
                  </Text>
                  <Text size="sm" c="#374151" style={{ lineHeight: 1.6 }}>
                    {item.notes}
                  </Text>
                </Box>
              ))}
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
                  <Link
                    key={sig.id}
                    href={`/signal/${sig.id}`}
                    style={{ textDecoration: "none", color: "inherit" }}
                  >
                    <Box
                      px={16}
                      py={12}
                      className="border-b border-[#E5E5E5] hover:bg-[#F9FAFB] cursor-pointer"
                      style={{ display: "flex", gap: 12 }}
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
                  </Link>
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
                const relSev = mapSeverity(related.rank);
                const relColor = severityColor(related.rank);
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
              <Card
                p={0}
                style={{
                  border: "1px solid #E5E5E5",
                  position: "sticky",
                  top: 24,
                }}
              >
                <Box px={16} py={10} className="border-b border-[#E5E5E5]">
                  <Group justify="space-between">
                    <Group gap={6}>
                      <IconMapPin size={14} color="#525252" />
                      <Text fw={600} c="#171717" style={{ fontSize: 13 }}>
                        Location
                      </Text>
                    </Group>
                    <Link
                      href={`/map?event=${event.id}`}
                      style={{ textDecoration: "none" }}
                    >
                      <Group gap={4} className="hover:opacity-70">
                        <IconMap size={12} color="#E85D3D" />
                        <Text size="xs" c="#E85D3D" fw={500}>
                          Full map
                        </Text>
                      </Group>
                    </Link>
                  </Group>
                </Box>
                <Box style={{ height: 180 }}>
                  <CrisisMap
                    markers={mapMarkers}
                    center={mapCenter}
                    zoom={8}
                    className="w-full h-full"
                    interactive={false}
                  />
                </Box>
              </Card>

              {/* Was this event helpful? */}
              <Card p={0} style={{ border: "1px solid #E5E5E5" }}>
                <Box px={16} py={10} className="border-b border-[#E5E5E5]">
                  <Text fw={600} c="#171717" style={{ fontSize: 13 }}>
                    Was this event helpful?
                  </Text>
                </Box>
                <Box p={16}>
                  {helpfulSubmitted ? (
                    <Group gap={6} justify="center">
                      <IconCircleCheck
                        size={15}
                        color="#059669"
                        style={{ strokeWidth: 1.5 }}
                      />
                      <Text size="xs" c="#059669" fw={500}>
                        Thanks for the feedback!
                      </Text>
                    </Group>
                  ) : (
                    <Group gap={8}>
                      <button
                        onClick={() => {
                          setModalOpen(true);
                          setModalSubmitted(false);
                          setSelectedTags([]);
                          setModalComment("");
                        }}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                        style={{
                          background: "#FEE2E2",
                          color: "#B91C1C",
                          border: "none",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "#FECACA")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "#FEE2E2")
                        }
                      >
                        <IconThumbDown size={13} />
                        Issues
                      </button>
                      <button
                        onClick={handleHelpful}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                        style={{
                          background: "#D1FAE5",
                          color: "#065F46",
                          border: "none",
                          cursor: "pointer",
                        }}
                        onMouseEnter={(e) =>
                          (e.currentTarget.style.background = "#A7F3D0")
                        }
                        onMouseLeave={(e) =>
                          (e.currentTarget.style.background = "#D1FAE5")
                        }
                      >
                        <IconThumbUp size={13} />
                        Helpful
                      </button>
                    </Group>
                  )}
                </Box>
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
                    <Button
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
                    </Button>
                    <Button
                      variant="light"
                      color="gray"
                      size="xs"
                      leftSection={<IconLayoutGridAdd size={12} />}
                      fullWidth
                      disabled
                      style={{ fontSize: 12 }}
                    >
                      Add to Crisis
                      <Text
                        component="span"
                        size="10px"
                        c="#A3A3A3"
                        ml={6}
                        style={{ fontWeight: 400 }}
                      >
                        coming soon
                      </Text>
                    </Button>
                  </Stack>
                </Box>
              </Card>

              {/* Alert details */}
              <Card p={0} style={{ border: "1px solid #E5E5E5" }}>
                <Box px={16} py={10} className="border-b border-[#E5E5E5]">
                  <Group gap={6}>
                    <IconDatabase size={14} color="#525252" />
                    <Text fw={600} c="#171717" style={{ fontSize: 13 }}>
                      Details
                    </Text>
                  </Group>
                </Box>
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
                    {/* TODO: after Prisma migration remove the italics/placeholder fallbacks below */}
                    <Group justify="space-between">
                      <Text size="xs" c="#737373">
                        Valid from
                      </Text>
                      {/* event.validFrom ? formatDate(alert.validFrom) : */}
                      <Text size="xs" fw={500} c="#A3A3A3" fs="italic">
                        pending
                      </Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="xs" c="#737373">
                        Valid until
                      </Text>
                      {/* event.validTo ? formatDate(alert.validTo) : */}
                      <Text size="xs" fw={500} c="#A3A3A3" fs="italic">
                        pending
                      </Text>
                    </Group>
                    {locations.length > 0 && (
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
                            const levelLabels: Record<number, string> = { 0: "Country", 1: "State", 2: "City" };
                            const levelLabel = levelLabels[loc.level];
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
                                {loc.name}
                                {levelLabel ? ` (${levelLabel})` : ""}
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
              </Card>
            </Stack>
          </Box>
        )}
      </Box>

      {/* Issues feedback modal */}
      <Modal
        opened={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalSubmitted ? undefined : "What was the issue?"}
        size="sm"
        centered
        styles={{
          header: { paddingBottom: 8 },
          body: { paddingTop: modalSubmitted ? 0 : 8 },
        }}
      >
        {modalSubmitted ? (
          <Stack align="center" gap={12} py={32}>
            <IconCircleCheck
              size={52}
              color="#059669"
              style={{ strokeWidth: 1.5 }}
            />
            <Text fw={700} size="lg" c="#171717">
              Thank you!
            </Text>
            <Text size="sm" c="#737373" ta="center" maw={260}>
              Your feedback helps improve alert quality for the whole team.
            </Text>
            <Button
              variant="subtle"
              color="gray"
              size="sm"
              mt={8}
              onClick={() => setModalOpen(false)}
            >
              Close
            </Button>
          </Stack>
        ) : (
          <Stack gap={16}>
            <Text size="sm" c="#737373">
              Select all issues that apply - this helps us improve the detection
              pipeline.
            </Text>

            <Stack gap={8}>
              {issueTags.map(({ id, label, icon: Icon }) => {
                const active = selectedTags.includes(id);
                return (
                  <button
                    key={id}
                    onClick={() => toggleTag(id)}
                    className="transition-colors"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 7,
                      width: "100%",
                      borderRadius: 999,
                      padding: "9px 16px",
                      fontSize: 13,
                      fontWeight: 500,
                      background: active ? "#FEE2E2" : "#F5F5F5",
                      color: active ? "#B91C1C" : "#525252",
                      border: active ? "1px solid #FECACA" : "1px solid #E5E5E5",
                      cursor: "pointer",
                    }}
                  >
                    <Icon size={14} strokeWidth={1.75} />
                    {label}
                  </button>
                );
              })}
            </Stack>

            <Divider color="#F5F5F5" />

            <Textarea
              label="Additional comments (optional)"
              placeholder="Anything else we should know about this alert…"
              value={modalComment}
              onChange={(e) => setModalComment(e.currentTarget.value)}
              minRows={3}
              maxLength={1000}
              size="sm"
              styles={{
                label: {
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#171717",
                  marginBottom: 6,
                },
              }}
            />

            <Group justify="flex-end">
              <Button
                variant="subtle"
                color="gray"
                size="sm"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={selectedTags.length === 0 && !modalComment.trim()}
                loading={feedbackPending}
                onClick={handleSubmitIssues}
                style={{ background: "#E85D3D", borderColor: "#E85D3D" }}
              >
                Send Feedback
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Box>
  );
}
