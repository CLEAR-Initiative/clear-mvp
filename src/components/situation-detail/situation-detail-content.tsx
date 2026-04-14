"use client";

import { useMemo, useState } from "react";
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
  Tabs,
  Select,
  Checkbox,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconMap,
  IconMapPin,
  IconCalendar,
  IconUsers,
  IconUsersGroup,
  IconHome2,
  IconAlertTriangle,
  IconLayersIntersect,
  IconTrendingUp,
  IconTrendingDown,
  IconMinus,
} from "@tabler/icons-react";
import { mapSeverity, severityColor } from "~/lib/types/graphql";
import { severityColors, severityLabels } from "~/lib/constants/severity";
import { getDisasterPills } from "~/lib/disaster-types";
import { IASC_CLUSTERS } from "~/lib/constants/iasc-clusters";
import type { MockSituation, MockSituationEvent, MockSituationNeed } from "~/lib/mocks/situations";
import type { MapMarker } from "~/components/map/crisis-map";

const CrisisMap = dynamic(
  () => import("~/components/map/crisis-map").then((m) => m.CrisisMap),
  { ssr: false, loading: () => <Box w="100%" h={360} bg="var(--color-bg-muted)" /> },
);

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

/** Rank needs by severity * PiN so the most pressing sit at the top. */
function rankNeeds(needs: MockSituationNeed[]): MockSituationNeed[] {
  return [...needs].sort((a, b) => {
    const aScore = a.severity * (a.peopleInNeed ?? 1);
    const bScore = b.severity * (b.peopleInNeed ?? 1);
    return bScore - aScore;
  });
}

function TrendIcon({ trend }: { trend?: "up" | "flat" | "down" }) {
  if (trend === "up") return <IconTrendingUp size={12} color="var(--color-critical)" />;
  if (trend === "down") return <IconTrendingDown size={12} color="var(--color-success)" />;
  if (trend === "flat") return <IconMinus size={12} color="var(--color-text-muted)" />;
  return null;
}

// ── Component ────────────────────────────────────────────────────────────────

interface SituationDetailContentProps {
  situation: MockSituation | null | undefined;
  loading: boolean;
  mode: "page" | "drawer";
  relatedSituations?: MockSituation[];
}

export function SituationDetailContent({
  situation,
  loading,
  mode,
  relatedSituations = [],
}: SituationDetailContentProps) {
  const [activeTab, setActiveTab] = useState<string | null>("overview");
  const [leftPanelTab, setLeftPanelTab] = useState<string | null>("events");
  const [layers, setLayers] = useState({ events: true, roads: false, population: false });

  const mapMarkers = useMemo<MapMarker[]>(() => {
    if (!situation) return [];
    const [lng, lat] = situation.location.coordinates;
    // Primary situation marker plus a marker per event (jittered around the centre).
    const markers: MapMarker[] = [
      {
        id: 0,
        lng,
        lat,
        title: situation.title,
        severity: mapSeverity(situation.severity),
        description: situation.location.name,
      },
    ];
    if (layers.events) {
      situation.events.forEach((e, idx) => {
        // Deterministic jitter so the markers don't overlap the centre pin.
        const angle = (idx / situation.events.length) * Math.PI * 2;
        markers.push({
          id: idx + 1,
          lng: lng + Math.cos(angle) * 0.25,
          lat: lat + Math.sin(angle) * 0.25,
          title: e.title,
          severity: mapSeverity(e.severity),
          description: e.location ?? situation.location.name,
          type: e.type,
        });
      });
    }
    return markers;
  }, [situation, layers.events]);

  if (loading) {
    return (
      <Box p={48} style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
        <Loader size="lg" />
      </Box>
    );
  }

  if (!situation) {
    return (
      <Box p={48} style={{ textAlign: "center" }}>
        <IconAlertTriangle size={40} color="var(--color-warning)" style={{ margin: "0 auto 16px" }} />
        <Text fw={600} size="lg">Situation not found</Text>
        <Text size="sm" c="var(--color-text-muted)" mt={8}>
          This situation may have been removed or the ID is invalid.
        </Text>
        {mode === "page" && (
          <Link
            href="/analysis"
            style={{
              display: "inline-block",
              marginTop: 16,
              color: "var(--color-accent)",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            &larr; Back to Analysis
          </Link>
        )}
      </Box>
    );
  }

  const sevColor = severityColor(situation.severity);
  const sev = mapSeverity(situation.severity);
  const isCompact = mode === "drawer";

  // Events sorted newest first. Mock data is already pre-sorted but guard anyway.
  const eventsNewestFirst = [...situation.events].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return (
    <Box>
      {/* Back nav + situation selector */}
      {mode === "page" && (
        <Box
          px={24}
          py={10}
          style={{ background: "var(--color-bg-white)", borderBottom: "1px solid var(--color-border)" }}
        >
          <Group justify="space-between">
            <Link href="/analysis" style={{ textDecoration: "none" }}>
              <Group gap={6} className="hover:opacity-70" style={{ cursor: "pointer" }}>
                <IconArrowLeft size={14} color="var(--color-text-secondary)" />
                <Text size="sm" c="var(--color-text-secondary)" fw={500}>
                  Back to Analysis
                </Text>
              </Group>
            </Link>
            <Group gap={12}>
              <Link href={`/map?situation=${situation.id}`} style={{ textDecoration: "none" }}>
                <Group gap={4} className="hover:opacity-70" style={{ cursor: "pointer" }}>
                  <IconMap size={14} color="var(--color-accent)" />
                  <Text size="xs" c="var(--color-accent)" fw={500}>
                    View on Crisis Map
                  </Text>
                </Group>
              </Link>
              {relatedSituations.length > 0 && (
                <Select
                  size="xs"
                  w={220}
                  placeholder="Switch situation"
                  data={relatedSituations.map((s) => ({ value: s.id, label: s.title }))}
                  value={null}
                  onChange={(val) => {
                    if (val) window.location.href = `/situation/${val}`;
                  }}
                />
              )}
            </Group>
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
          borderLeft: `4px solid ${sevColor}`,
        }}
      >
        <Group gap={6} mb={10}>
          <span
            style={{
              display: "inline-block",
              padding: "2px 10px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              background:
                sev === "critical"
                  ? "var(--color-critical-light)"
                  : sev === "low"
                    ? "var(--color-success-light)"
                    : "var(--color-warning-light)",
              color:
                sev === "critical"
                  ? "var(--color-critical)"
                  : sev === "low"
                    ? "var(--color-success)"
                    : "var(--color-warning)",
            }}
          >
            {severityLabels[sev]}
          </span>
          <Badge
            size="xs"
            variant="light"
            style={{ background: "var(--color-bg-muted)", color: "var(--color-text-secondary)" }}
          >
            Situation
          </Badge>
        </Group>

        <Group justify="space-between" align="flex-start" mb={10} wrap="nowrap" gap={16}>
          <Text
            fw={700}
            c="var(--color-text-primary)"
            style={{ fontSize: isCompact ? 18 : 22, lineHeight: 1.3, flex: 1 }}
          >
            {situation.title}
          </Text>
        </Group>

        <Group gap={16} wrap="wrap">
          <Group gap={4}>
            <IconMapPin size={13} color="var(--color-text-muted)" />
            <Text size="xs" c="var(--color-text-secondary)" fw={500}>
              {situation.location.name}
            </Text>
          </Group>
          <Group gap={4}>
            <IconCalendar size={13} color="var(--color-text-muted)" />
            <Text size="xs" c="var(--color-text-secondary)">
              Updated {formatDate(situation.updatedAt)}
            </Text>
          </Group>
          <Group gap={4}>
            <IconLayersIntersect size={13} color="var(--color-text-muted)" />
            <Text size="xs" c="var(--color-text-secondary)" fw={500}>
              {situation.events.length} event{situation.events.length !== 1 ? "s" : ""}
            </Text>
          </Group>
        </Group>
      </Box>

      {/* Tabs: Overview | Needs Assessment */}
      {!isCompact && (
        <Box
          px={24}
          style={{ background: "var(--color-bg-white)", borderBottom: "1px solid var(--color-border)" }}
        >
          <Tabs value={activeTab} onChange={setActiveTab} variant="default">
            <Tabs.List style={{ borderBottom: "none" }}>
              <Tabs.Tab value="overview">Overview</Tabs.Tab>
              <Tabs.Tab value="needs">Needs Assessment</Tabs.Tab>
            </Tabs.List>
          </Tabs>
        </Box>
      )}

      {activeTab === "needs" ? (
        <NeedsAssessmentPanel situation={situation} />
      ) : (
        <>
          {/* Body: two-column */}
          <Box
            p={isCompact ? 16 : 24}
            style={{
              display: "flex",
              gap: isCompact ? 16 : 24,
              flexDirection: isCompact ? "column" : "row",
              alignItems: "stretch",
            }}
          >
            {/* Left column */}
            <Box style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Summary card */}
              <Card p={0} style={{ border: "1px solid var(--color-border)" }}>
                <Box px={16} py={12} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <Group justify="space-between">
                    <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 14 }}>
                      Summary
                    </Text>
                    <Badge
                      size="xs"
                      style={{
                        background: "var(--color-ai-light)",
                        color: "var(--color-ai)",
                        border: "1px solid var(--color-ai-border)",
                        fontWeight: 600,
                      }}
                    >
                      ✦ AI generated
                    </Badge>
                  </Group>
                </Box>
                <Stack gap={12} p={16}>
                  <Text size="sm" c="var(--color-text-primary)" style={{ lineHeight: 1.6 }}>
                    {situation.summary}
                  </Text>
                  <Box style={{ height: 1, background: "var(--color-border)" }} />
                  <Text size="sm" c="var(--color-text-secondary)" style={{ lineHeight: 1.6 }}>
                    {situation.description}
                  </Text>
                </Stack>
              </Card>

              {/* Events / Demography / Sources tabs */}
              <Card p={0} style={{ border: "1px solid var(--color-border)", flex: 1 }}>
                <Tabs value={leftPanelTab} onChange={setLeftPanelTab}>
                  <Box px={8} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <Tabs.List style={{ borderBottom: "none" }}>
                      <Tabs.Tab value="events">Events</Tabs.Tab>
                      <Tabs.Tab value="demography">Demography</Tabs.Tab>
                      <Tabs.Tab value="sources">Sources</Tabs.Tab>
                    </Tabs.List>
                  </Box>
                  <Tabs.Panel value="events">
                    <EventsTimeline events={eventsNewestFirst} />
                  </Tabs.Panel>
                  <Tabs.Panel value="demography">
                    <Box p={24} style={{ textAlign: "center" }}>
                      <Text size="sm" c="var(--color-text-muted)">
                        Demography breakdown coming soon.
                      </Text>
                    </Box>
                  </Tabs.Panel>
                  <Tabs.Panel value="sources">
                    <Box p={24} style={{ textAlign: "center" }}>
                      <Text size="sm" c="var(--color-text-muted)">
                        Sources view coming soon.
                      </Text>
                    </Box>
                  </Tabs.Panel>
                </Tabs>
              </Card>
            </Box>

            {/* Right column */}
            <Box
              style={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {/* KPI row */}
              <Group gap={12} grow wrap="nowrap">
                <KpiCard
                  icon={<IconUsers size={18} color="var(--color-accent)" />}
                  iconBg="var(--color-accent-light)"
                  value={formatCount(situation.peopleAffected)}
                  label="People affected"
                />
                <KpiCard
                  icon={<IconUsersGroup size={18} color="var(--color-info)" />}
                  iconBg="var(--color-info-light)"
                  value={formatCount(situation.peopleDisplaced)}
                  label="People displaced"
                />
                <KpiCard
                  icon={<IconHome2 size={18} color="var(--color-warning)" />}
                  iconBg="var(--color-warning-light)"
                  value={situation.households ? formatCount(situation.households) : "-"}
                  label="Households"
                />
              </Group>

              {/* Map with layer control */}
              <Card
                p={0}
                style={{
                  border: "1px solid var(--color-border)",
                  position: "relative",
                  flex: 1,
                  minHeight: 360,
                  overflow: "hidden",
                }}
              >
                <CrisisMap
                  markers={mapMarkers}
                  center={situation.location.coordinates}
                  zoom={6}
                  className="w-full h-full"
                />
                {/* Layer control */}
                <Box
                  p={10}
                  style={{
                    position: "absolute",
                    bottom: 12,
                    right: 12,
                    background: "var(--color-bg-white)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 8,
                    boxShadow: "var(--shadow-sm)",
                    minWidth: 140,
                  }}
                >
                  <Text size="xs" fw={700} c="var(--color-text-secondary)" mb={6} style={{ textTransform: "uppercase", letterSpacing: "0.04em" }}>
                    Layers
                  </Text>
                  <Stack gap={4}>
                    <Checkbox
                      size="xs"
                      label="Events"
                      checked={layers.events}
                      onChange={(e) => setLayers((l) => ({ ...l, events: e.currentTarget.checked }))}
                    />
                    <Checkbox
                      size="xs"
                      label="Roads"
                      checked={layers.roads}
                      onChange={(e) => setLayers((l) => ({ ...l, roads: e.currentTarget.checked }))}
                    />
                    <Checkbox
                      size="xs"
                      label="Population"
                      checked={layers.population}
                      onChange={(e) => setLayers((l) => ({ ...l, population: e.currentTarget.checked }))}
                    />
                  </Stack>
                </Box>
              </Card>
            </Box>
          </Box>

          {/* Top humanitarian needs */}
          <Box px={isCompact ? 16 : 24} pb={isCompact ? 16 : 24}>
            <TopNeedsCard needs={rankNeeds(situation.needs).slice(0, 5)} />
          </Box>

          {/* Comments placeholder (full comments wiring requires backend `situation` entityType) */}
          <Box px={isCompact ? 16 : 24} pb={isCompact ? 24 : 32}>
            <CommentsPlaceholder />
          </Box>
        </>
      )}
    </Box>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  icon,
  iconBg,
  value,
  label,
}: {
  icon: React.ReactNode;
  iconBg: string;
  value: string;
  label: string;
}) {
  return (
    <Box
      p={16}
      style={{
        background: "var(--color-bg-white)",
        border: "1px solid var(--color-border)",
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
          background: iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box style={{ minWidth: 0 }}>
        <Text
          fw={700}
          c="var(--color-text-primary)"
          style={{ fontSize: 20, lineHeight: 1, letterSpacing: "-0.02em" }}
        >
          {value}
        </Text>
        <Text size="xs" c="var(--color-text-muted)" mt={2} truncate>
          {label}
        </Text>
      </Box>
    </Box>
  );
}

function TopNeedsCard({ needs }: { needs: MockSituationNeed[] }) {
  return (
    <Card p={0} style={{ border: "1px solid var(--color-border)" }}>
      <Box px={16} py={12} style={{ borderBottom: "1px solid var(--color-border)" }}>
        <Group justify="space-between">
          <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 14 }}>
            Top humanitarian needs
          </Text>
          <Text size="xs" c="var(--color-text-muted)">
            IASC clusters · ranked by severity &amp; PiN
          </Text>
        </Group>
      </Box>
      <Stack gap={0}>
        {needs.map((need, idx) => (
          <NeedRow key={need.cluster} need={need} isLast={idx === needs.length - 1} />
        ))}
      </Stack>
    </Card>
  );
}

function NeedRow({ need, isLast }: { need: MockSituationNeed; isLast: boolean }) {
  const cluster = IASC_CLUSTERS[need.cluster];
  const sev = mapSeverity(need.severity);
  const colors = severityColors[sev] ?? severityColors.medium!;
  const ClusterIcon = cluster.icon;
  const coverage =
    need.peopleInNeed && need.peopleTargeted
      ? Math.round((need.peopleTargeted / need.peopleInNeed) * 100)
      : null;

  return (
    <Box
      px={16}
      py={14}
      style={{ borderBottom: isLast ? undefined : "1px solid var(--color-border)" }}
    >
      <Group gap={12} wrap="nowrap" align="center">
        <Box
          style={{
            width: 36,
            height: 36,
            borderRadius: 8,
            background: colors.bg,
            color: colors.text,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <ClusterIcon size={18} />
        </Box>

        <Box style={{ flex: 1, minWidth: 0 }}>
          <Group gap={8} wrap="nowrap" align="center" mb={2}>
            <Text fw={600} size="sm" c="var(--color-text-primary)">
              {cluster.shortLabel ?? cluster.label}
            </Text>
            <SeverityPill severity={sev} />
            <TrendIcon trend={need.trend} />
          </Group>
          {need.detail && (
            <Text size="xs" c="var(--color-text-muted)" style={{ lineHeight: 1.4 }}>
              {need.detail}
            </Text>
          )}
        </Box>

        {/* PiN + coverage (right-aligned, stable width) */}
        <Box style={{ textAlign: "right", flexShrink: 0, minWidth: 110 }}>
          {need.peopleInNeed !== undefined ? (
            <>
              <Text fw={700} size="sm" c="var(--color-text-primary)" style={{ letterSpacing: "-0.01em" }}>
                {formatCount(need.peopleInNeed)}
              </Text>
              <Text size="xs" c="var(--color-text-muted)">
                in need
                {coverage !== null ? ` · ${coverage}% covered` : ""}
              </Text>
            </>
          ) : (
            <Text size="xs" c="var(--color-text-muted)">No PiN estimate</Text>
          )}
        </Box>
      </Group>
    </Box>
  );
}

function SeverityPill({ severity }: { severity: "critical" | "high" | "medium" | "low" }) {
  const colors = severityColors[severity] ?? severityColors.medium!;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "1px 8px",
        borderRadius: 999,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        background: colors.bg,
        color: colors.text,
      }}
    >
      {severityLabels[severity]}
    </span>
  );
}

function EventsTimeline({ events }: { events: MockSituationEvent[] }) {
  if (events.length === 0) {
    return (
      <Box p={24} style={{ textAlign: "center" }}>
        <Text size="sm" c="var(--color-text-muted)">
          No events linked to this situation.
        </Text>
      </Box>
    );
  }
  return (
    <Box p={0}>
      {events.map((event, idx) => {
        const sev = mapSeverity(event.severity);
        const dotColor = severityColor(event.severity);
        const isLast = idx === events.length - 1;
        return (
          <Link
            key={event.id}
            href={`/event/${event.id}`}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <Box
              px={16}
              py={14}
              className="hover:bg-[var(--color-bg-muted)]"
              style={{
                borderBottom: isLast ? undefined : "1px solid var(--color-border)",
                cursor: "pointer",
                display: "flex",
                gap: 12,
                position: "relative",
              }}
            >
              {/* Timeline rail */}
              <Box
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  flexShrink: 0,
                  width: 12,
                  position: "relative",
                }}
              >
                <Box
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: dotColor,
                    marginTop: 4,
                    zIndex: 1,
                  }}
                />
                {!isLast && (
                  <Box
                    style={{
                      position: "absolute",
                      top: 14,
                      bottom: -14,
                      width: 2,
                      background: "var(--color-border)",
                    }}
                  />
                )}
              </Box>
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Group justify="space-between" wrap="nowrap" gap={8} mb={4}>
                  <Text fw={600} size="sm" c="var(--color-text-primary)" style={{ flex: 1 }}>
                    {event.title}
                  </Text>
                  <Text size="xs" c="var(--color-text-muted)" style={{ flexShrink: 0 }}>
                    {formatTimeAgo(event.date)}
                  </Text>
                </Group>
                <Group gap={6} mb={6} wrap="wrap">
                  {getDisasterPills([event.type]).map((pill) => (
                    <span
                      key={pill.label}
                      style={{
                        display: "inline-block",
                        padding: "1px 8px",
                        borderRadius: 999,
                        fontSize: 10,
                        fontWeight: 600,
                        color: pill.color,
                        background: pill.bg,
                      }}
                    >
                      {pill.label}
                    </span>
                  ))}
                  <span
                    style={{
                      display: "inline-block",
                      padding: "1px 8px",
                      borderRadius: 999,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      background: severityColors[sev]?.bg,
                      color: severityColors[sev]?.text,
                    }}
                  >
                    {severityLabels[sev]}
                  </span>
                  {event.location && (
                    <Group gap={3}>
                      <IconMapPin size={11} color="var(--color-text-muted)" />
                      <Text size="xs" c="var(--color-text-muted)">
                        {event.location}
                      </Text>
                    </Group>
                  )}
                  <Text size="xs" c="var(--color-text-muted)">
                    {formatDateTime(event.date)}
                  </Text>
                </Group>
                <Text size="xs" c="var(--color-text-secondary)" style={{ lineHeight: 1.5 }}>
                  {event.summary}
                </Text>
              </Box>
            </Box>
          </Link>
        );
      })}
    </Box>
  );
}

function NeedsAssessmentPanel({ situation }: { situation: MockSituation }) {
  const ranked = rankNeeds(situation.needs);
  return (
    <Box p={24}>
      <Card p={0} style={{ border: "1px solid var(--color-border)" }}>
        <Box px={16} py={12} style={{ borderBottom: "1px solid var(--color-border)" }}>
          <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 14 }}>
            Needs assessment (all clusters)
          </Text>
        </Box>
        <Stack gap={0}>
          {ranked.map((need, idx) => (
            <NeedRow key={need.cluster} need={need} isLast={idx === ranked.length - 1} />
          ))}
        </Stack>
      </Card>
    </Box>
  );
}

/**
 * Visual-only comments placeholder. The real `CommentsSection` component
 * requires `entityType: "event" | "signal"` on the backend - we'll switch
 * to it once the backend accepts `"situation"`.
 */
function CommentsPlaceholder() {
  return (
    <Card p={0} style={{ border: "1px solid var(--color-border)" }}>
      <Box px={16} py={12} style={{ borderBottom: "1px solid var(--color-border)" }}>
        <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 14 }}>
          Comments
        </Text>
      </Box>
      <Box p={24} style={{ textAlign: "center" }}>
        <Text size="sm" c="var(--color-text-muted)">
          Discussion on this situation will appear here.
        </Text>
        <Text size="xs" c="var(--color-text-muted)" mt={4}>
          (Pending backend support for situation comments.)
        </Text>
      </Box>
    </Card>
  );
}
