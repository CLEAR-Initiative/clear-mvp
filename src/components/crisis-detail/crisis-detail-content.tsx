"use client";

import { useMemo, useState } from "react";
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
import { api } from "~/trpc/react";
import { mapSeverity, severityColor } from "~/lib/types/graphql";
import type { GqlEvent, GqlLocation } from "~/lib/types/graphql";
import { severityColors, severityLabels } from "~/lib/constants/severity";
import { getDisasterPills } from "~/lib/disaster-types";
import { resolveLocationName } from "~/lib/location";
import { useLocations } from "~/hooks/use-locations";
import { IASC_CLUSTERS, type IASCClusterCode } from "~/lib/constants/iasc-clusters";
import type { GqlCrisis } from "~/server/api/routers/crises";
import type { MapMarker } from "~/components/map/crisis-map";
import { MinimapCard } from "~/components/map/minimap-card";
import { CommentsSection } from "~/components/comments-section";
import { NeedsAssessmentPanel } from "~/components/crisis-detail/needs-assessment-panel";

/** Humanitarian need row - parsed from a crisis's free-form `needs` JSON. */
interface ClusterNeed {
  cluster: IASCClusterCode;
  severity: number;
  peopleInNeed?: number;
  peopleTargeted?: number;
  trend?: "up" | "flat" | "down";
  detail?: string;
}

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
function rankNeeds(needs: ClusterNeed[]): ClusterNeed[] {
  return [...needs].sort((a, b) => {
    const aScore = a.severity * (a.peopleInNeed ?? 1);
    const bScore = b.severity * (b.peopleInNeed ?? 1);
    return bScore - aScore;
  });
}

/**
 * Demo needs used as a placeholder visual while the backend has no real
 * IASC-cluster needs payloads populated yet. Shown when parseNeeds()
 * returns an empty array so the UI doesn't look broken.
 *
 * TODO: remove once the pipeline starts writing real `needs` JSON.
 */
const DEMO_NEEDS: ClusterNeed[] = [
  { cluster: "SHL", severity: 5, peopleInNeed: 127_000, peopleTargeted: 45_000, trend: "up", detail: "Emergency shelter for 15k+ households" },
  { cluster: "HLT", severity: 5, peopleInNeed: 180_000, peopleTargeted: 72_000, trend: "up", detail: "3 hospitals damaged, medical supplies depleted" },
  { cluster: "WSH", severity: 4, peopleInNeed: 180_000, peopleTargeted: 90_000, trend: "up", detail: "Primary water points offline" },
  { cluster: "FSL", severity: 4, peopleInNeed: 220_000, peopleTargeted: 80_000, trend: "up", detail: "Supply corridor cut" },
  { cluster: "PRO", severity: 4, peopleInNeed: 140_000, trend: "flat" },
  { cluster: "EDU", severity: 3, peopleInNeed: 58_000, trend: "flat" },
];

/**
 * Parse the backend's free-form `needs` JSON into a typed ClusterNeed[].
 * Invalid entries are silently dropped so a partially-bad payload still
 * renders what it can.
 */
function parseNeeds(json: unknown): ClusterNeed[] {
  if (!Array.isArray(json)) return [];
  const valid: ClusterNeed[] = [];
  for (const item of json) {
    if (typeof item !== "object" || item === null) continue;
    const rec = item as Record<string, unknown>;
    if (typeof rec.cluster !== "string" || !(rec.cluster in IASC_CLUSTERS)) continue;
    if (typeof rec.severity !== "number") continue;
    valid.push({
      cluster: rec.cluster as IASCClusterCode,
      severity: rec.severity,
      peopleInNeed: typeof rec.peopleInNeed === "number" ? rec.peopleInNeed : undefined,
      peopleTargeted: typeof rec.peopleTargeted === "number" ? rec.peopleTargeted : undefined,
      trend:
        rec.trend === "up" || rec.trend === "flat" || rec.trend === "down" ? rec.trend : undefined,
      detail: typeof rec.detail === "string" ? rec.detail : undefined,
    });
  }
  return valid;
}

/** BigInt field comes back from GraphQL as a string (or null). */
function bigIntStrToNumber(s: string | null | undefined): number | null {
  if (s === null || s === undefined) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Extract [lng, lat] from a GqlLocation's Point geometry, if present. */
function locationCoords(location: GqlLocation | null | undefined): [number, number] | null {
  const geom = location?.geometry as
    | { type?: string; coordinates?: unknown }
    | null
    | undefined;
  if (!geom || geom.type !== "Point" || !Array.isArray(geom.coordinates)) return null;
  const [lng, lat] = geom.coordinates as unknown as number[];
  if (typeof lng !== "number" || typeof lat !== "number") return null;
  return [lng, lat];
}

/** Pick the best representative location for an event. */
function pickEventLocation(event: GqlEvent): GqlLocation | null {
  return event.generalLocation ?? event.originLocation ?? event.destinationLocation ?? null;
}

function TrendIcon({ trend }: { trend?: "up" | "flat" | "down" }) {
  if (trend === "up") return <IconTrendingUp size={12} color="var(--color-critical)" />;
  if (trend === "down") return <IconTrendingDown size={12} color="var(--color-success)" />;
  if (trend === "flat") return <IconMinus size={12} color="var(--color-text-muted)" />;
  return null;
}

// ── Component ────────────────────────────────────────────────────────────────

interface CrisisDetailContentProps {
  crisis: GqlCrisis | null | undefined;
  loading: boolean;
  mode: "page" | "drawer";
  relatedCrises?: GqlCrisis[];
}

export function CrisisDetailContent({
  crisis,
  loading,
  mode,
  relatedCrises = [],
}: CrisisDetailContentProps) {
  const [activeTab, setActiveTab] = useState<string | null>("overview");
  const [leftPanelTab, setLeftPanelTab] = useState<string | null>("events");

  const { getLocationId } = useLocations();
  const sudanId = useMemo(() => getLocationId("Sudan"), [getLocationId]);
  const sudanL0Query = api.locations.getById.useQuery(
    { id: sudanId! },
    { enabled: !!sudanId, staleTime: Infinity, refetchOnWindowFocus: false },
  );
  const sudanGeometry = sudanL0Query.data?.geometry ?? undefined;

  const parsedNeeds = useMemo(() => parseNeeds(crisis?.needs), [crisis?.needs]);
  // Fall back to demo data when the backend hasn't populated needs yet.
  const needs = parsedNeeds.length > 0 ? parsedNeeds : DEMO_NEEDS;
  const needsAreDemo = parsedNeeds.length === 0;
  const events = crisis?.events ?? [];

  // Pick a primary coordinate for the map centre. Prefer the crisis's own
  // generalLocation, fall back to the first event with a resolvable location,
  // finally default to a Sudan-wide view.
  const primaryCoords = useMemo<[number, number]>(() => {
    const fromCrisis = locationCoords(crisis?.generalLocation);
    if (fromCrisis) return fromCrisis;
    for (const e of events) {
      const c = locationCoords(pickEventLocation(e));
      if (c) return c;
    }
    return [30, 14];
  }, [crisis, events]);

  const mapMarkers = useMemo<MapMarker[]>(() => {
    if (!crisis) return [];
    const markers: MapMarker[] = [
      {
        id: 0,
        lng: primaryCoords[0],
        lat: primaryCoords[1],
        title: crisis.title ?? "Crisis",
        severity: mapSeverity(crisis.severity),
        description: resolveLocationName(crisis.generalLocation) ?? undefined,
      },
    ];
    events.forEach((e, idx) => {
      const c = locationCoords(pickEventLocation(e)) ?? primaryCoords;
      markers.push({
        id: idx + 1,
        lng: c[0],
        lat: c[1],
        title: e.title ?? e.types[0] ?? "Event",
        severity: mapSeverity(e.severity),
        description: resolveLocationName(pickEventLocation(e)) ?? undefined,
        type: e.types[0],
      });
    });
    return markers;
  }, [crisis, events, primaryCoords]);

  if (loading) {
    return (
      <Box p={48} style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 400 }}>
        <Loader size="lg" />
      </Box>
    );
  }

  if (!crisis) {
    return (
      <Box p={48} style={{ textAlign: "center" }}>
        <IconAlertTriangle size={40} color="var(--color-warning)" style={{ margin: "0 auto 16px" }} />
        <Text fw={600} size="lg">Crisis not found</Text>
        <Text size="sm" c="var(--color-text-muted)" mt={8}>
          This crisis may have been removed or the ID is invalid.
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

  const sevColor = severityColor(crisis.severity);
  const sev = mapSeverity(crisis.severity);
  const isCompact = mode === "drawer";

  const title = crisis.title ?? "Untitled crisis";
  const locationName =
    resolveLocationName(crisis.generalLocation) ??
    resolveLocationName(events[0] ? pickEventLocation(events[0]) : null);
  const populationAffected = bigIntStrToNumber(crisis.populationAffected);
  const populationInArea = bigIntStrToNumber(crisis.populationInArea);

  const updatedAt: string | null = events.reduce<string | null>((latest, e) => {
    const d = e.lastSignalCreatedAt || e.firstSignalCreatedAt;
    if (!d) return latest;
    if (!latest) return d;
    return new Date(d).getTime() > new Date(latest).getTime() ? d : latest;
  }, null);

  // Events sorted newest first using their lastSignalCreatedAt timestamp.
  const eventsNewestFirst = [...events].sort((a, b) => {
    const dateA = new Date(a.lastSignalCreatedAt || a.firstSignalCreatedAt).getTime();
    const dateB = new Date(b.lastSignalCreatedAt || b.firstSignalCreatedAt).getTime();
    return dateB - dateA;
  });

  return (
    <Box>
      {/* Back nav + crisis selector */}
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
              <Link href={`/map?crisis=${crisis.id}`} style={{ textDecoration: "none" }}>
                <Group gap={4} className="hover:opacity-70" style={{ cursor: "pointer" }}>
                  <IconMap size={14} color="var(--color-accent)" />
                  <Text size="xs" c="var(--color-accent)" fw={500}>
                    View on Crisis Map
                  </Text>
                </Group>
              </Link>
              {relatedCrises.length > 0 && (
                <Select
                  size="xs"
                  w={220}
                  placeholder="Switch crisis"
                  data={relatedCrises.map((s) => ({
                    value: s.id,
                    label: s.title ?? "Untitled crisis",
                  }))}
                  value={null}
                  onChange={(val) => {
                    if (val) window.location.href = `/crisis/${val}`;
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
            Crisis
          </Badge>
        </Group>

        <Group justify="space-between" align="flex-start" mb={10} wrap="nowrap" gap={16}>
          <Text
            fw={700}
            c="var(--color-text-primary)"
            style={{ fontSize: isCompact ? 18 : 22, lineHeight: 1.3, flex: 1 }}
          >
            {title}
          </Text>
        </Group>

        <Group gap={16} wrap="wrap">
          {locationName && (
            <Group gap={4}>
              <IconMapPin size={13} color="var(--color-text-muted)" />
              <Text size="xs" c="var(--color-text-secondary)" fw={500}>
                {locationName}
              </Text>
            </Group>
          )}
          {updatedAt && (
            <Group gap={4}>
              <IconCalendar size={13} color="var(--color-text-muted)" />
              <Text size="xs" c="var(--color-text-secondary)">
                Updated {formatDate(updatedAt)}
              </Text>
            </Group>
          )}
          <Group gap={4}>
            <IconLayersIntersect size={13} color="var(--color-text-muted)" />
            <Text size="xs" c="var(--color-text-secondary)" fw={500}>
              {events.length} event{events.length !== 1 ? "s" : ""}
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
        <NeedsAssessmentPanel crisis={crisis} />
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
                    {crisis.summary ?? "No summary available yet."}
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
                  value={populationAffected !== null ? formatCount(populationAffected) : "-"}
                  label="People affected"
                />
                <KpiCard
                  icon={<IconUsersGroup size={18} color="var(--color-info)" />}
                  iconBg="var(--color-info-light)"
                  value={populationInArea !== null ? formatCount(populationInArea) : "-"}
                  label="Population in area"
                />
                <KpiCard
                  icon={<IconHome2 size={18} color="var(--color-warning)" />}
                  iconBg="var(--color-warning-light)"
                  value="-"
                  label="Households"
                />
              </Group>

              {/* Map */}
              <MinimapCard
                markers={mapMarkers}
                center={primaryCoords}
                sudanGeometry={sudanGeometry}
                sudanId={sudanId ?? null}
                locationGeometry={crisis.generalLocation?.geometry}
                locationName={locationName ?? undefined}
                fullMapHref={`/map?crisis=${crisis.id}`}
              />
            </Box>
          </Box>

          {/* Top humanitarian needs */}
          <Box px={isCompact ? 16 : 24} pb={isCompact ? 16 : 24}>
            <TopNeedsCard needs={rankNeeds(needs).slice(0, 5)} isDemo={needsAreDemo} />
          </Box>

          {/* Discussion - reads from backend; compose is disabled until the
              AddCommentInput mutation accepts a crisisId. */}
          <Box px={isCompact ? 16 : 24} pb={isCompact ? 24 : 32}>
            <Card p={0} style={{ border: "1px solid var(--color-border)" }}>
              <CommentsSection entityId={crisis.id} entityType="crisis" />
            </Card>
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

function DemoBadge() {
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
        background: "var(--color-bg-muted)",
        color: "var(--color-text-muted)",
      }}
    >
      Sample
    </span>
  );
}

function TopNeedsCard({ needs, isDemo }: { needs: ClusterNeed[]; isDemo?: boolean }) {
  return (
    <Card p={0} style={{ border: "1px solid var(--color-border)" }}>
      <Box px={16} py={12} style={{ borderBottom: "1px solid var(--color-border)" }}>
        <Group justify="space-between" wrap="nowrap">
          <Group gap={8}>
            <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 14 }}>
              Top humanitarian needs
            </Text>
            {isDemo && <DemoBadge />}
          </Group>
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

function NeedRow({ need, isLast }: { need: ClusterNeed; isLast: boolean }) {
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

function SeverityPill({ severity }: { severity: "critical" | "high" | "medium" | "low" | "unknown" }) {
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

function EventsTimeline({ events }: { events: GqlEvent[] }) {
  if (events.length === 0) {
    return (
      <Box p={24} style={{ textAlign: "center" }}>
        <Text size="sm" c="var(--color-text-muted)">
          No events linked to this crisis.
        </Text>
      </Box>
    );
  }
  return (
    <Box py={12} px={4}>
      {events.map((event, idx) => (
        <TimelineRow
          key={event.id}
          event={event}
          isFirst={idx === 0}
          isLast={idx === events.length - 1}
        />
      ))}
    </Box>
  );
}

function TimelineRow({
  event,
  isFirst,
  isLast,
}: {
  event: GqlEvent;
  isFirst: boolean;
  isLast: boolean;
}) {
  const sev = mapSeverity(event.severity);
  const dotColor = severityColor(event.severity);
  const dateStr = event.lastSignalCreatedAt || event.firstSignalCreatedAt;
  const displayTitle = event.title ?? event.types[0] ?? "Event";
  const primaryType = event.types[0];
  const locationLabel = resolveLocationName(pickEventLocation(event));

  const dateObj = dateStr ? new Date(dateStr) : null;
  const dateMonthDay = dateObj
    ? dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "";
  const dateYear = dateObj ? dateObj.getFullYear() : null;
  const nowYear = new Date().getFullYear();

  return (
    <Box
      style={{
        display: "grid",
        gridTemplateColumns: "72px 24px 1fr",
        alignItems: "stretch",
        columnGap: 10,
      }}
    >
      {/* Date column - vertically centred to align with the rail dot. */}
      <Box
        style={{
          textAlign: "right",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
      >
        <Text fw={600} size="xs" c="var(--color-text-primary)" style={{ lineHeight: 1.2 }}>
          {dateMonthDay}
        </Text>
        {dateYear && dateYear !== nowYear && (
          <Text size="xs" c="var(--color-text-muted)" style={{ lineHeight: 1.2 }}>
            {dateYear}
          </Text>
        )}
      </Box>

      {/* Rail column */}
      <Box style={{ position: "relative" }}>
        {/* Upper line (hidden on first) */}
        <Box
          style={{
            position: "absolute",
            left: "50%",
            top: 0,
            bottom: "50%",
            width: 2,
            transform: "translateX(-50%)",
            background: isFirst ? "transparent" : "var(--color-border)",
          }}
        />
        {/* Lower line (hidden on last) */}
        <Box
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            bottom: 0,
            width: 2,
            transform: "translateX(-50%)",
            background: isLast ? "transparent" : "var(--color-border)",
          }}
        />
        {/* Dot */}
        <Box
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: dotColor,
            border: "2px solid var(--color-bg-white)",
            boxShadow: "0 0 0 1px var(--color-border)",
            zIndex: 1,
          }}
        />
      </Box>

      {/* Card column */}
      <Box py={6}>
        <Link
          href={`/event/${event.id}`}
          style={{ textDecoration: "none", color: "inherit" }}
        >
          <Box
            className="hover:bg-[var(--color-bg-muted)]"
            style={{
              border: "1px solid var(--color-border)",
              borderRadius: 8,
              padding: "10px 12px",
              background: "var(--color-bg-white)",
              cursor: "pointer",
              transition: "box-shadow 120ms ease-out",
            }}
          >
            {/* Row 1: title */}
            <Text
              fw={600}
              size="sm"
              c="var(--color-text-primary)"
              truncate
              mb={4}
              style={{ lineHeight: 1.3 }}
            >
              {displayTitle}
            </Text>
            {/* Row 2: severity + type + location */}
            <Group gap={6} wrap="nowrap" align="center" style={{ overflow: "hidden" }}>
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
                  flexShrink: 0,
                }}
              >
                {severityLabels[sev]}
              </span>
              {primaryType &&
                getDisasterPills([primaryType]).map((pill) => (
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
                      flexShrink: 0,
                    }}
                  >
                    {pill.label}
                  </span>
                ))}
              {locationLabel && (
                <Group gap={3} wrap="nowrap" style={{ minWidth: 0 }}>
                  <IconMapPin size={11} color="var(--color-text-muted)" />
                  <Text size="xs" c="var(--color-text-muted)" truncate>
                    {locationLabel}
                  </Text>
                </Group>
              )}
            </Group>
          </Box>
        </Link>
      </Box>
    </Box>
  );
}


