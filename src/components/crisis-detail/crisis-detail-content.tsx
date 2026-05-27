"use client";

import { useMemo, useState, useRef } from "react";
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
  Tabs,
  Select,
  Modal,
  Button,
  Menu,
  ActionIcon,
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
  IconChevronDown,
  IconChevronRight,
  IconFileText,
  IconUpload,
  IconTrash,
  IconDotsVertical,
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
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string | null>("overview");
  const [leftPanelTab, setLeftPanelTab] = useState<string | null>("events");
  const [confirmDeleteCrisis, setConfirmDeleteCrisis] = useState(false);

  const meQuery = api.auth.me.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const isAdmin = meQuery.data?.user?.role === "admin" || meQuery.data?.user?.role === "org_admin";

  const utils = api.useUtils();

  const deleteCrisis = api.crises.deleteCrisis.useMutation({
    onSuccess: () => {
      void utils.crises.list.invalidate();
      router.push("/analysis");
    },
  });

  const { getLocationId } = useLocations();
  const sudanId = useMemo(() => getLocationId("Sudan"), [getLocationId]);
  const sudanL0Query = api.locations.getById.useQuery(
    { id: sudanId! },
    { enabled: !!sudanId, staleTime: Infinity, refetchOnWindowFocus: false },
  );
  const sudanGeometry = sudanL0Query.data?.geometry ?? undefined;

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
      {/* Delete crisis confirmation modal */}
      <Modal
        opened={confirmDeleteCrisis}
        onClose={() => setConfirmDeleteCrisis(false)}
        title="Delete crisis"
        size="sm"
        centered
      >
        <Text size="sm" c="var(--color-text-secondary)" mb={20}>
          Permanently delete <strong>{crisis.title ?? "this crisis"}</strong>? This cannot be undone.
        </Text>
        <Group justify="flex-end" gap={8}>
          <Button variant="default" size="xs" onClick={() => setConfirmDeleteCrisis(false)}>
            Cancel
          </Button>
          <Button
            size="xs"
            color="red"
            loading={deleteCrisis.isPending}
            onClick={() => deleteCrisis.mutate({ id: crisis.id })}
          >
            Delete
          </Button>
        </Group>
      </Modal>

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
              {isAdmin && (
                <Menu position="bottom-end" withinPortal>
                  <Menu.Target>
                    <ActionIcon variant="subtle" color="gray" size="sm">
                      <IconDotsVertical size={16} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item
                      color="red"
                      leftSection={<IconTrash size={14} />}
                      onClick={() => setConfirmDeleteCrisis(true)}
                    >
                      Delete crisis
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
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
              <Tabs.Tab value="needs">Needs</Tabs.Tab>
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
                <CrisisSummaryBody summary={crisis.summary} />
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
                    <EventsTimeline events={eventsNewestFirst} isAdmin={isAdmin} crisisId={crisis.id} totalEventCount={events.length} />
                  </Tabs.Panel>
                  <Tabs.Panel value="demography">
                    <Box p={24} style={{ textAlign: "center" }}>
                      <Text size="sm" c="var(--color-text-muted)">
                        Demographic breakdown coming soon.
                      </Text>
                    </Box>
                  </Tabs.Panel>
                  <Tabs.Panel value="sources">
                    <SourcesList events={eventsNewestFirst} />
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

          {/* Scenario planning */}
          <Box px={isCompact ? 16 : 24} pb={isCompact ? 16 : 24}>
            <ScenarioComparisonCard scenarios={parseScenarios(crisis.scenarios)} />
          </Box>

          {/* Documents */}
          <Box px={isCompact ? 16 : 24} pb={isCompact ? 16 : 24}>
            <DocumentsSection crisis={crisis} />
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

// ── Crisis summary body ───────────────────────────────────────────────────────

function CrisisSummaryBody({ summary }: { summary: string | null }) {
  const parsed = useMemo(() => {
    if (!summary) return null;
    try {
      const obj = JSON.parse(summary) as Record<string, unknown>;
      if (typeof obj.description === "string" && Array.isArray(obj.tldr)) {
        return { description: obj.description, tldr: obj.tldr as string[] };
      }
    } catch { /* fall through */ }
    return { description: summary, tldr: [] };
  }, [summary]);

  if (!parsed) {
    return (
      <Box p={16}>
        <Text size="sm" c="var(--color-text-muted)">No summary available yet.</Text>
      </Box>
    );
  }

  return (
    <Stack gap={10} p={16}>
      <Text size="sm" c="var(--color-text-primary)" style={{ lineHeight: 1.65 }}>
        {parsed.description}
      </Text>
      {parsed.tldr.length > 0 && (
        <Stack gap={4} pt={4} style={{ borderTop: "1px solid var(--color-border)" }}>
          {parsed.tldr.map((bullet, i) => (
            <Group key={i} gap={8} wrap="nowrap" align="flex-start">
              <Box style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--color-text-muted)", flexShrink: 0, marginTop: 7 }} />
              <Text size="xs" c="var(--color-text-secondary)" style={{ lineHeight: 1.55 }}>{bullet}</Text>
            </Group>
          ))}
        </Stack>
      )}
    </Stack>
  );
}

// ── Scenario planning ────────────────────────────────────────────────────────

interface ScenarioPlan {
  label: string;
  subtitle: string;
  description: string;
}

const SCENARIO_STYLE: Record<string, { color: string; bg: string }> = {
  "Best Case":   { color: "var(--color-success)",  bg: "var(--color-success-light)" },
  "Most Likely": { color: "var(--color-info)",     bg: "var(--color-info-light)" },
  "Worst Case":  { color: "var(--color-critical)", bg: "var(--color-critical-light)" },
};

function parseScenarios(json: unknown): ScenarioPlan[] | null {
  if (json === null || json === undefined) return null;

  // Pipeline format: { most_likely, best_case, worst_case, description }
  if (typeof json === "object" && !Array.isArray(json)) {
    const r = json as Record<string, unknown>;
    if (typeof r.most_likely === "string" && typeof r.best_case === "string" && typeof r.worst_case === "string") {
      return [
        { label: "Best Case",   subtitle: "", description: r.best_case },
        { label: "Most Likely", subtitle: "", description: r.most_likely },
        { label: "Worst Case",  subtitle: "", description: r.worst_case },
      ];
    }
  }

  // Legacy array format: [{ label, subtitle, description }]
  if (!Array.isArray(json) || json.length === 0) return null;
  const result: ScenarioPlan[] = [];
  for (const item of json) {
    if (typeof item !== "object" || item === null) return null;
    const r = item as Record<string, unknown>;
    if (typeof r.label !== "string" || typeof r.description !== "string") return null;
    result.push({
      label: r.label,
      subtitle: typeof r.subtitle === "string" ? r.subtitle : "",
      description: r.description,
    });
  }
  return result.length > 0 ? result : null;
}

function ScenarioComparisonCard({ scenarios }: { scenarios: ScenarioPlan[] | null }) {
  return (
    <Card p={0} style={{ border: "1px solid var(--color-border)" }}>
      <Box px={16} py={12} style={{ borderBottom: "1px solid var(--color-border)" }}>
        <Group gap={8} align="center">
          <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 14 }}>
            Scenario Comparison
          </Text>
          {scenarios && (
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
          )}
        </Group>
      </Box>

      {scenarios ? (
        <Box p={16} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          {scenarios.map((s) => {
            const style = SCENARIO_STYLE[s.label] ?? { color: "var(--color-border)", bg: "var(--color-bg-muted)" };
            return (
              <Box
                key={s.label}
                p={16}
                style={{ border: `1px solid ${style.color}30`, background: style.bg }}
              >
                <Text fw={700} size="sm" c="var(--color-text-primary)" mb={2}>
                  {s.label}
                </Text>
                {s.subtitle && (
                  <Text size="xs" c="var(--color-text-muted)" mb={10} style={{ fontStyle: "italic" }}>
                    {s.subtitle}
                  </Text>
                )}
                <Text size="sm" c="var(--color-text-secondary)" style={{ lineHeight: 1.6 }}>
                  {s.description}
                </Text>
              </Box>
            );
          })}
        </Box>
      ) : (
        <Box p={24} style={{ textAlign: "center" }}>
          <Text size="sm" c="var(--color-text-muted)">
            Scenarios not yet generated for this crisis.
          </Text>
        </Box>
      )}
    </Card>
  );
}

// ── Documents section ────────────────────────────────────────────────────────

interface CrisisDoc {
  id: string;
  name: string;
  url: string;
}

function nameFromAttachmentUrl(url: string): string {
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").pop() ?? "Document");
  } catch {
    return url.split("/").pop()?.split("?")[0] ?? "Document";
  }
}

function keyFromAttachmentUrl(url: string): string {
  try {
    return new URL(url).pathname.slice(1);
  } catch {
    return url;
  }
}

function DocumentsSection({ crisis }: { crisis: GqlCrisis }) {
  const [collapsed, setCollapsed] = useState(false);
  const [docs, setDocs] = useState<CrisisDoc[]>(() =>
    crisis.attachments.map((url) => ({ id: crypto.randomUUID(), name: nameFromAttachmentUrl(url), url }))
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<CrisisDoc | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const utils = api.useUtils();

  const addAttachments = api.crises.addAttachments.useMutation({
    onSuccess: (data) => {
      setDocs(data.attachments.map((url) => ({ id: crypto.randomUUID(), name: nameFromAttachmentUrl(url), url })));
      void utils.crises.get.invalidate({ id: crisis.id });
    },
  });

  const removeAttachment = api.crises.removeAttachment.useMutation({
    onSuccess: (data) => {
      setRemoveError(null);
      setDocs(data.attachments.map((url) => ({ id: crypto.randomUUID(), name: nameFromAttachmentUrl(url), url })));
      void utils.crises.get.invalidate({ id: crisis.id });
    },
    onError: (err) => {
      setRemoveError(err.message ?? "Remove failed. Please try again.");
    },
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    e.target.value = "";
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("files", f));
      const resp = await fetch("/api/proxy/upload", { method: "POST", body: formData });
      if (!resp.ok) throw new Error("Upload failed");
      const { keys } = (await resp.json()) as { keys: string[] };
      await addAttachments.mutateAsync({ id: crisis.id, keys });
    } catch {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  function confirmRemove() {
    if (!pendingRemove) return;
    const key = keyFromAttachmentUrl(pendingRemove.url);
    removeAttachment.mutate({ id: crisis.id, key });
    setPendingRemove(null);
  }

  return (
    <>
      <Modal
        opened={pendingRemove !== null}
        onClose={() => setPendingRemove(null)}
        title="Remove document"
        size="sm"
        centered
      >
        <Text size="sm" c="var(--color-text-secondary)" mb={20}>
          Remove <strong>{pendingRemove?.name}</strong>? This cannot be undone.
        </Text>
        <Group justify="flex-end" gap={8}>
          <Button variant="default" size="xs" onClick={() => setPendingRemove(null)}>
            Cancel
          </Button>
          <Button
            size="xs"
            color="red"
            loading={removeAttachment.isPending}
            onClick={confirmRemove}
          >
            Remove
          </Button>
        </Group>
      </Modal>

      <Card p={0} style={{ border: "1px solid var(--color-border)" }}>
        {/* Header */}
        <Box
          px={16} py={12}
          onClick={() => setCollapsed((c) => !c)}
          className="hover:bg-[var(--color-bg-muted)]"
          style={{
            borderBottom: collapsed ? undefined : "1px solid var(--color-border)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            transition: "background 100ms",
          }}
        >
          <Group gap={8} align="center">
            <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 14 }}>Documents</Text>
            {docs.length > 0 && (
              <Badge size="xs" style={{ background: "var(--color-bg-muted)", color: "var(--color-text-muted)" }}>
                {docs.length}
              </Badge>
            )}
          </Group>
          {collapsed
            ? <IconChevronRight size={14} color="var(--color-text-muted)" />
            : <IconChevronDown size={14} color="var(--color-text-muted)" />
          }
        </Box>

        {!collapsed && (
          <>
            {/* Document list */}
            {docs.map((doc, idx) => (
              <Box
                key={doc.id}
                px={16} py={10}
                style={{
                  borderBottom: idx < docs.length - 1 ? "1px solid var(--color-border)" : undefined,
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <IconFileText size={14} color="var(--color-text-muted)" style={{ flexShrink: 0 }} />
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ flex: 1, minWidth: 0, textDecoration: "none" }}
                >
                  <Text
                    size="sm"
                    c="var(--color-text-primary)"
                    truncate
                    className="hover:underline"
                    style={{ cursor: "pointer" }}
                  >
                    {doc.name}
                  </Text>
                </a>
                <button
                  onClick={() => setPendingRemove(doc)}
                  title="Remove"
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "none", border: "none", padding: 4, cursor: "pointer",
                    color: "var(--color-text-muted)", borderRadius: 4, flexShrink: 0,
                  }}
                  className="hover:text-[var(--color-critical)]"
                >
                  <IconTrash size={13} />
                </button>
              </Box>
            ))}

            {/* Error */}
            {removeError && (
              <Box px={16} py={8} style={{ borderTop: "1px solid var(--color-border)" }}>
                <Text size="xs" c="var(--color-critical)">{removeError}</Text>
              </Box>
            )}

            {/* Empty state + upload */}
            <Box
              px={16} py={12}
              style={{ borderTop: docs.length > 0 || removeError ? "1px solid var(--color-border)" : undefined, display: "flex", alignItems: "center", gap: 8 }}
            >
              {docs.length === 0 && !uploading && (
                <Text size="xs" c="var(--color-text-muted)" style={{ flex: 1 }}>No documents attached.</Text>
              )}
              {uploadError && (
                <Text size="xs" c="var(--color-critical)" style={{ flex: 1 }}>{uploadError}</Text>
              )}
              <input ref={inputRef} type="file" multiple onChange={handleUpload} style={{ display: "none" }} />
              <button
                onClick={() => !uploading && inputRef.current?.click()}
                disabled={uploading}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "none", border: "1px solid var(--color-border)",
                  borderRadius: 4, padding: "4px 10px", cursor: uploading ? "default" : "pointer",
                  color: uploading ? "var(--color-text-muted)" : "var(--color-text-secondary)",
                  fontSize: 12, fontWeight: 600, marginLeft: "auto",
                  opacity: uploading ? 0.6 : 1,
                }}
                className={uploading ? undefined : "hover:bg-[var(--color-bg-muted)]"}
              >
                {uploading ? <Loader size={12} /> : <IconUpload size={12} />}
                {uploading ? "Uploading..." : "Upload"}
              </button>
            </Box>
          </>
        )}
      </Card>
    </>
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

function SourcesList({ events }: { events: GqlEvent[] }) {
  // Deduplicate sources across all signals from all events; count signals per source.
  const sources = useMemo(() => {
    const map = new Map<string, { id: string; name: string; type: string; baseUrl?: string | null; infoUrl?: string | null; signalCount: number }>();
    for (const event of events) {
      for (const signal of event.signals ?? []) {
        const src = signal.source;
        if (!src) continue;
        const existing = map.get(src.id);
        if (existing) {
          existing.signalCount += 1;
        } else {
          map.set(src.id, { id: src.id, name: src.name, type: src.type, baseUrl: src.baseUrl, infoUrl: src.infoUrl, signalCount: 1 });
        }
      }
    }
    return [...map.values()].sort((a, b) => b.signalCount - a.signalCount);
  }, [events]);

  if (sources.length === 0) {
    return (
      <Box p={24} style={{ textAlign: "center" }}>
        <Text size="sm" c="var(--color-text-muted)">No sources linked to this crisis.</Text>
      </Box>
    );
  }

  return (
    <Box py={4}>
      {sources.map((src, idx) => {
        const href = src.infoUrl ?? src.baseUrl ?? null;
        return (
          <Box
            key={src.id}
            px={16} py={12}
            style={{
              borderBottom: idx < sources.length - 1 ? "1px solid var(--color-border)" : undefined,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Box style={{ flex: 1, minWidth: 0 }}>
              {href ? (
                <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                  <Text size="sm" fw={500} c="var(--color-text-primary)" className="hover:underline" truncate>
                    {src.name}
                  </Text>
                </a>
              ) : (
                <Text size="sm" fw={500} c="var(--color-text-primary)" truncate>{src.name}</Text>
              )}
              <Text size="xs" c="var(--color-text-muted)" mt={1}>{src.type}</Text>
            </Box>
            <Badge
              size="xs"
              style={{ background: "var(--color-bg-muted)", color: "var(--color-text-muted)", flexShrink: 0 }}
            >
              {src.signalCount} signal{src.signalCount !== 1 ? "s" : ""}
            </Badge>
          </Box>
        );
      })}
    </Box>
  );
}

function EventsTimeline({ events, isAdmin, crisisId, totalEventCount }: { events: GqlEvent[]; isAdmin: boolean; crisisId: string; totalEventCount: number }) {
  const router = useRouter();
  const utils = api.useUtils();
  const [pendingRemoveEvent, setPendingRemoveEvent] = useState<GqlEvent | null>(null);

  const removeEvent = api.crises.removeEvent.useMutation({
    onSuccess: () => {
      if (totalEventCount <= 1) {
        // Last event removed - crisis was deleted by the backend
        void utils.crises.list.invalidate();
        router.push("/analysis");
      } else {
        void utils.crises.get.invalidate({ id: crisisId });
      }
    },
  });

  function confirmRemoveEvent() {
    if (!pendingRemoveEvent) return;
    removeEvent.mutate({ crisisId, eventId: pendingRemoveEvent.id });
    setPendingRemoveEvent(null);
  }

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
    <>
      <Modal
        opened={pendingRemoveEvent !== null}
        onClose={() => setPendingRemoveEvent(null)}
        title="Remove event from crisis"
        size="sm"
        centered
      >
        <Text size="sm" c="var(--color-text-secondary)" mb={8}>
          Remove <strong>{pendingRemoveEvent?.title ?? pendingRemoveEvent?.types[0] ?? "this event"}</strong> from the crisis?
        </Text>
        {totalEventCount <= 1 && (
          <Text size="xs" c="var(--color-critical)" mb={12}>
            This is the last event. Removing it will delete the entire crisis.
          </Text>
        )}
        <Group justify="flex-end" gap={8} mt={16}>
          <Button variant="default" size="xs" onClick={() => setPendingRemoveEvent(null)}>
            Cancel
          </Button>
          <Button size="xs" color="red" loading={removeEvent.isPending} onClick={confirmRemoveEvent}>
            {totalEventCount <= 1 ? "Remove and delete crisis" : "Remove"}
          </Button>
        </Group>
      </Modal>

      <Box py={12} px={4}>
        {events.map((event, idx) => (
          <TimelineRow
            key={event.id}
            event={event}
            isFirst={idx === 0}
            isLast={idx === events.length - 1}
            isAdmin={isAdmin}
            onRemove={() => setPendingRemoveEvent(event)}
          />
        ))}
      </Box>
    </>
  );
}

function TimelineRow({
  event,
  isFirst,
  isLast,
  isAdmin,
  onRemove,
}: {
  event: GqlEvent;
  isFirst: boolean;
  isLast: boolean;
  isAdmin: boolean;
  onRemove: () => void;
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
      <Box py={6} style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
        <Link
          href={`/event/${event.id}`}
          style={{ textDecoration: "none", color: "inherit", flex: 1, minWidth: 0 }}
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
        {isAdmin && (
          <Menu position="bottom-end" withinPortal>
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray" size="sm" mt={4} style={{ flexShrink: 0 }}>
                <IconDotsVertical size={14} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={onRemove}>
                Remove from crisis
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        )}
      </Box>
    </Box>
  );
}


