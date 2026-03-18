"use client";

import { useState, useMemo, useCallback } from "react";
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
  IconLink,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import { mapSeverity, severityColor } from "~/lib/types/graphql";
import type { GqlSignalDetail, GqlLocation } from "~/lib/types/graphql";
import { severityColors, severityLabels } from "~/lib/constants/severity";
import type { MapMarker } from "~/components/map/crisis-map";

const CrisisMap = dynamic(
  () => import("~/components/map/crisis-map").then((m) => m.CrisisMap),
  { ssr: false, loading: () => <Box w="100%" h={180} bg="#F5F5F5" /> },
);

// ── Mock data ─────────────────────────────────────────────────────────────────
// Remove when backend delivers Comments and Feedback mutations.
const MOCK_COMMENTS = [
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
];
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

function signalLocations(signal: GqlSignalDetail): GqlLocation[] {
  const locs: GqlLocation[] = [];
  if (signal.generalLocation) locs.push(signal.generalLocation);
  if (signal.originLocation) locs.push(signal.originLocation);
  if (signal.destinationLocation) locs.push(signal.destinationLocation);
  return locs;
}

interface SignalDetailContentProps {
  signal: GqlSignalDetail | null | undefined;
  loading: boolean;
  mode: "page" | "drawer";
}

export function SignalDetailContent({
  signal,
  loading,
  mode,
}: SignalDetailContentProps) {
  const [comment, setComment] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSubmitted, setModalSubmitted] = useState(false);
  const [helpfulSubmitted, setHelpfulSubmitted] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [modalComment, setModalComment] = useState("");
  const [feedbackPending, setFeedbackPending] = useState(false);
  const [rawExpanded, setRawExpanded] = useState(false);

  const toggleRaw = useCallback(() => setRawExpanded((v) => !v), []);

  // submitFeedback stub — wire to real mutation once backend exposes it
  const submitFeedback = {
    mutateAsync: async (_args: { signalId: string; comment: string }) => {
      // no-op stub
    },
    isPending: feedbackPending,
  };

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
    if (!signal) return;
    setFeedbackPending(true);
    try {
      await submitFeedback.mutateAsync({ signalId: signal.id, comment: "helpful" });
      setHelpfulSubmitted(true);
    } catch (err) {
      console.error("Failed to submit feedback", err);
    } finally {
      setFeedbackPending(false);
    }
  }

  async function handleSubmitIssues() {
    if (!signal) return;
    const parts = [selectedTags.join(", "), modalComment.trim()].filter(Boolean);
    setFeedbackPending(true);
    try {
      await submitFeedback.mutateAsync({ signalId: signal.id, comment: parts.join(" | ") });
      setModalSubmitted(true);
    } catch (err) {
      console.error("Failed to submit feedback", err);
    } finally {
      setFeedbackPending(false);
    }
  }

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

  // Collect all signals from sibling events, deduplicated, excluding self
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

  if (!signal) {
    return (
      <Box p={48} style={{ textAlign: "center" }}>
        <IconAlertTriangle
          size={40}
          color="#D97706"
          style={{ margin: "0 auto 16px" }}
        />
        <Text fw={600} size="lg">
          Signal not found
        </Text>
        <Text size="sm" c="#737373" mt={8}>
          This signal may have been removed or the ID is invalid.
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

  const isCompact = mode === "drawer";
  const locations = signalLocations(signal);
  const primaryLocation = locations[0]?.name;

  // Count signals from this source across all sibling events (+ 1 for the current signal)
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

  const displayTitle =
    signal.title ??
    (signal.description ? signal.description.slice(0, 120) + (signal.description.length > 120 ? "…" : "") : null) ??
    (primaryLocation ? `Signal — ${primaryLocation}` : "Signal");

  const sourceTypeLabel = signal.source.type
    ? signal.source.type.charAt(0).toUpperCase() + signal.source.type.slice(1).toLowerCase()
    : "Unknown";

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
                    View on Crisis Map
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
          background: "#FFF",
          borderBottom: "1px solid #E5E5E5",
          borderLeft: "4px solid #737373",
        }}
      >
        {/* Title row */}
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
            <IconRadar size={13} color="#737373" />
            <Text size="xs" fw={500} c="#737373">
              Signal
            </Text>
          </Group>
        </Group>

        {/* Source type pill + "via source" + optional original link */}
        <Group gap={8} mb={14} wrap="wrap" align="center">
          <Badge
            size="sm"
            radius="xl"
            variant="outline"
            style={{ color: "#737373", borderColor: "#73737340", fontWeight: 500 }}
          >
            {sourceTypeLabel}
          </Badge>
          <Text size="xs" c="#525252" fw={500}>
            via {signal.source.name}
          </Text>
          {(signal.url ?? signal.source.infoUrl) && (
            <>
              <Text size="xs" c="#D4D4D4">·</Text>
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
                {signal.url ? "View original" : "View source"}
              </a>
            </>
          )}
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
            <Text size="xs" c="#525252">
              {formatDate(signal.publishedAt)}
            </Text>
          </Group>
          <Group gap={4}>
            <IconClock size={13} color="#A3A3A3" />
            <Text size="xs" c="#A3A3A3">
              {formatTimeAgo(signal.publishedAt)}
            </Text>
          </Group>
        </Group>
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
          {/* Description */}
          <Card p={0} mb={20} style={{ border: "1px solid #E5E5E5" }}>
            <Box px={16} py={12} className="border-b border-[#E5E5E5]">
              <Text fw={600} c="#171717" style={{ fontSize: 14 }}>
                Description
              </Text>
            </Box>
            <Box p={16}>
              <Text size="sm" c="#374151" style={{ lineHeight: 1.75 }}>
                {signal.description ?? "No description available."}
              </Text>
              <button
                onClick={toggleRaw}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  marginTop: 12,
                  fontSize: 12,
                  fontWeight: 500,
                  color: "#737373",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                {rawExpanded ? <IconChevronUp size={13} /> : <IconChevronDown size={13} />}
                {rawExpanded ? "Hide raw content" : "Show raw content"}
              </button>
              {rawExpanded && (
                <Box
                  mt={10}
                  p={12}
                  style={{
                    background: "#F9FAFB",
                    border: "1px solid #E5E5E5",
                    borderRadius: 6,
                    overflowX: "auto",
                  }}
                >
                  <pre
                    style={{
                      margin: 0,
                      fontSize: 11,
                      lineHeight: 1.65,
                      color: "#374151",
                      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      maxHeight: 400,
                      overflowY: "auto",
                    }}
                  >
                    {JSON.stringify(signal.rawData, null, 2)}
                  </pre>
                </Box>
              )}
            </Box>
          </Card>

          {/* Source details */}
          <Card p={0} mb={20} style={{ border: "1px solid #E5E5E5" }}>
            <Box px={16} py={12} className="border-b border-[#E5E5E5]">
              <Group gap={8}>
                <Text fw={600} c="#171717" style={{ fontSize: 14 }}>
                  Source Details
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
                style={{ background: "#F9FAFB", border: "1px solid #E5E5E5", borderRadius: 6 }}
              >
                <Text size="xs" fw={700} c="#A3A3A3" mb={4} style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Source Name
                </Text>
                <Text size="sm" c="#374151" style={{ lineHeight: 1.6 }}>
                  {signal.source.name}
                </Text>
              </Box>
              <Box
                p={12}
                style={{ background: "#F9FAFB", border: "1px solid #E5E5E5", borderRadius: 6 }}
              >
                <Text size="xs" fw={700} c="#A3A3A3" mb={4} style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Source Type
                </Text>
                <Text size="sm" c="#374151" style={{ lineHeight: 1.6 }}>
                  {sourceTypeLabel}
                </Text>
              </Box>
              <Box
                p={12}
                style={{ background: "#F9FAFB", border: "1px solid #E5E5E5", borderRadius: 6 }}
              >
                <Text size="xs" fw={700} c="#A3A3A3" mb={6} style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Source Activity
                </Text>
                <Group gap={6} align="baseline">
                  <Text fw={700} c="#171717" style={{ fontSize: 18, lineHeight: 1 }}>
                    {sourceSignalCount}
                  </Text>
                  <Text size="xs" c="#525252">
                    signal{sourceSignalCount !== 1 ? "s" : ""} from {signal.source.name}
                  </Text>
                </Group>
                <Text size="xs" c="#A3A3A3" mt={4}>in current detection context</Text>
              </Box>
              {signal.source.infoUrl && (
                <Box
                  p={12}
                  style={{ background: "#F9FAFB", border: "1px solid #E5E5E5", borderRadius: 6 }}
                >
                  <Text size="xs" fw={700} c="#A3A3A3" mb={4} style={{ textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Info URL
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

          {/* Discussion */}
          <Card p={0} mb={20} style={{ border: "1px solid #E5E5E5" }}>
            <Box px={16} py={12} className="border-b border-[#E5E5E5]">
              <Group gap={8}>
                <IconMessageCircle size={14} color="#525252" />
                <Text fw={600} c="#171717" style={{ fontSize: 14 }}>
                  Discussion
                </Text>
                <Badge size="xs" variant="light" color="gray" style={{ fontWeight: 600 }}>
                  {MOCK_COMMENTS.length}
                </Badge>
                <Text size="xs" c="#A3A3A3" style={{ fontStyle: "italic" }}>
                  (mock data currently)
                </Text>
              </Group>
            </Box>
            <Box>
              {MOCK_COMMENTS.map((c, i) => (
                <Box
                  key={c.id}
                  px={16}
                  py={12}
                  style={{
                    borderBottom:
                      i < MOCK_COMMENTS.length - 1 ? "1px solid #F5F5F5" : undefined,
                  }}
                >
                  <Group align="flex-start" gap={10}>
                    <Avatar
                      size={30}
                      radius="xl"
                      style={{
                        background: "#FEF2F0",
                        color: "#E85D3D",
                        fontSize: 11,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {c.initials}
                    </Avatar>
                    <Box style={{ flex: 1 }}>
                      <Group gap={8} mb={4}>
                        <Text size="xs" fw={600} c="#171717">{c.author}</Text>
                        <Text size="xs" c="#A3A3A3">{c.role}</Text>
                        <Text size="xs" c="#A3A3A3" style={{ marginLeft: "auto" }}>
                          {c.timeAgo}
                        </Text>
                      </Group>
                      <Text size="sm" c="#374151" style={{ lineHeight: 1.6 }}>
                        {c.text}
                      </Text>
                    </Box>
                  </Group>
                </Box>
              ))}

              {/* Comment input */}
              <Box px={16} py={12} style={{ borderTop: "1px solid #F5F5F5" }}>
                <Textarea
                  placeholder="Add a comment…"
                  value={comment}
                  onChange={(e) => setComment(e.currentTarget.value)}
                  minRows={2}
                  size="xs"
                  styles={{ input: { fontSize: 13 } }}
                  mb={8}
                />
                <Group justify="flex-end">
                  <Button
                    size="xs"
                    leftSection={<IconSend size={12} />}
                    disabled
                    title="Comments coming soon"
                    style={{
                      background: "#E85D3D",
                      borderColor: "#E85D3D",
                      fontSize: 12,
                      opacity: 0.5,
                    }}
                  >
                    Post
                  </Button>
                </Group>
              </Box>
            </Box>
          </Card>

          {/* Part of Events + Similar Signals — two columns */}
          <Box style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>

            {/* Part of Events */}
            <Card p={0} style={{ border: "1px solid #E5E5E5" }}>
              <Box px={16} py={12} className="border-b border-[#E5E5E5]">
                <Text fw={600} c="#171717" style={{ fontSize: 14 }}>
                  Part of Events ({signal.events.length})
                </Text>
              </Box>
              <Box>
                {signal.events.length === 0 && (
                  <Box px={16} py={24} style={{ textAlign: "center" }}>
                    <Text c="#A3A3A3" size="sm">
                      Not assigned to any event yet
                    </Text>
                  </Box>
                )}
                {signal.events.map((ev) => {
                  const relSev = mapSeverity(ev.rank);
                  const relColor = severityColor(ev.rank);
                  const relBg = severityColors[relSev]?.bg ?? "#F5F5F5";
                  const relTitle = ev.title ?? ev.types[0] ?? `Event ${ev.id}`;
                  return (
                    <Link
                      key={ev.id}
                      href={`/event/${ev.id}`}
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
                            <Text size="xs" c="#A3A3A3">{formatTimeAgo(ev.firstSignalCreatedAt)}</Text>
                          </Group>
                          <Text size="sm" fw={500} c="#171717" lineClamp={2} style={{ lineHeight: 1.4 }}>
                            {relTitle}
                          </Text>
                          {ev.types.length > 0 && (
                            <Group gap={4} mt={4}>
                              {ev.types.slice(0, 2).map((t) => (
                                <Badge key={t} size="xs" variant="outline" style={{ color: "#737373", borderColor: "#73737340", fontWeight: 400 }}>
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
            <Card p={0} style={{ border: "1px solid #E5E5E5" }}>
              <Box px={16} py={12} className="border-b border-[#E5E5E5]">
                <Text fw={600} c="#171717" style={{ fontSize: 14 }}>
                  Similar Signals ({relatedSignals.length})
                </Text>
              </Box>
              <Box>
                {relatedSignals.length === 0 && (
                  <Box px={16} py={24} style={{ textAlign: "center" }}>
                    <Text c="#A3A3A3" size="sm">
                      No co-detected signals found
                    </Text>
                  </Box>
                )}
                {relatedSignals.slice(0, 8).map((s) => {
                  const relTitle =
                    s.title ??
                    (s.description ? s.description.slice(0, 80) + (s.description.length > 80 ? "…" : "") : `Signal ${s.id}`);
                  return (
                    <Link
                      key={s.id}
                      href={`/signal/${s.id}`}
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
                          <Group justify="space-between" mb={2}>
                            <Badge size="xs" style={{ background: "#F5F5F5", color: "#525252", fontWeight: 600 }}>
                              {s.source.name}
                            </Badge>
                            <Text size="xs" c="#A3A3A3">{formatTimeAgo(s.publishedAt)}</Text>
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
        </Box>

        {/* Right sidebar */}
        {!isCompact && (
          <Box style={{ width: 300, flexShrink: 0 }}>
            <Stack gap={20}>
              {/* Location map */}
              {mapMarkers.length > 0 && (
                <Card
                  p={0}
                  style={{ border: "1px solid #E5E5E5", position: "sticky", top: 24 }}
                >
                  <Box px={16} py={10} className="border-b border-[#E5E5E5]">
                    <Group justify="space-between">
                      <Group gap={6}>
                        <IconMapPin size={14} color="#525252" />
                        <Text fw={600} c="#171717" style={{ fontSize: 13 }}>
                          Location
                        </Text>
                      </Group>
                      <Link href="/map" style={{ textDecoration: "none" }}>
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
              )}

              {/* Was this signal helpful? */}
              <Card p={0} style={{ border: "1px solid #E5E5E5" }}>
                <Box px={16} py={10} className="border-b border-[#E5E5E5]">
                  <Text fw={600} c="#171717" style={{ fontSize: 13 }}>
                    Was this signal helpful?
                  </Text>
                </Box>
                <Box p={16}>
                  {helpfulSubmitted ? (
                    <Group gap={6} justify="center">
                      <IconCircleCheck size={15} color="#059669" style={{ strokeWidth: 1.5 }} />
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
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#FECACA")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "#FEE2E2")}
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
                        onMouseEnter={(e) => (e.currentTarget.style.background = "#A7F3D0")}
                        onMouseLeave={(e) => (e.currentTarget.style.background = "#D1FAE5")}
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

              {/* Signal details */}
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
                      <Text size="xs" c="#737373">Signal ID</Text>
                      <Text size="xs" fw={500} c="#171717">#{signal.id}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="xs" c="#737373">Source</Text>
                      <Text size="xs" fw={500} c="#171717">{signal.source.name}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="xs" c="#737373">Published</Text>
                      <Text size="xs" fw={500} c="#171717">{formatDate(signal.publishedAt)}</Text>
                    </Group>
                    <Group justify="space-between">
                      <Text size="xs" c="#737373">Collected</Text>
                      <Text size="xs" fw={500} c="#171717">{formatDateTime(signal.collectedAt)}</Text>
                    </Group>
                    {locations.length > 0 && (
                      <Box style={{ borderTop: "1px solid #F0F0F0" }} pt={8} mt={2}>
                        <Text size="xs" c="#737373" mb={6}>Affected Areas</Text>
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
                                {loc.name}{levelLabel ? ` (${levelLabel})` : ""}
                              </Badge>
                            );
                          })}
                        </Group>
                      </Box>
                    )}
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
            <IconCircleCheck size={52} color="#059669" style={{ strokeWidth: 1.5 }} />
            <Text fw={700} size="lg" c="#171717">Thank you!</Text>
            <Text size="sm" c="#737373" ta="center" maw={260}>
              Your feedback helps improve signal quality for the whole team.
            </Text>
            <Button variant="subtle" color="gray" size="sm" mt={8} onClick={() => setModalOpen(false)}>
              Close
            </Button>
          </Stack>
        ) : (
          <Stack gap={16}>
            <Text size="sm" c="#737373">
              Select all issues that apply - this helps us improve the detection pipeline.
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
              placeholder="Anything else we should know about this signal…"
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
              <Button variant="subtle" color="gray" size="sm" onClick={() => setModalOpen(false)}>
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
