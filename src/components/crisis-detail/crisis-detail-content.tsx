"use client";

import { useMemo, useState, useRef } from "react";
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
  Tabs,
  Select,
  Modal,
  Button,
  Menu,
  ActionIcon,
  Divider,
  Collapse,
  UnstyledButton,
  Tooltip,
  Textarea,
  TextInput,
} from "@mantine/core";
import {
  IconArrowLeft,
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
  IconChevronUp,
  IconChevronRight,
  IconFileText,
  IconUpload,
  IconTrash,
  IconDotsVertical,
  IconCheck,
  IconCircleDashed,
  IconInfoCircle,
  IconPencil,
  IconX,
} from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { isPlatformAdmin } from "~/lib/roles";
import { mapSeverity, severityColor } from "~/lib/types/graphql";
import type { GqlEvent, GqlLocation } from "~/lib/types/graphql";
import { severityColors, severityLabels } from "~/lib/constants/severity";
import { getDisasterPills } from "~/lib/disaster-types";
import { resolveLocationName } from "~/lib/location";
import { useTeamCountry } from "~/hooks/use-team-country";
import { resolveCountryConfig } from "~/lib/constants/country-config";
import { IASC_CLUSTERS, type IASCClusterCode } from "~/lib/constants/iasc-clusters";
import type { GqlCrisis } from "~/server/api/routers/crises";
import type { MapMarker } from "~/components/map/crisis-map";
import { mapFocusHref } from "~/lib/map-focus-href";
import { mapReturnHref } from "~/lib/map-view-state";
import { MinimapCard } from "~/components/map/minimap-card";
import { CommentsSection } from "~/components/comments-section";
import { NeedsAssessmentPanel } from "~/components/crisis-detail/needs-assessment-panel";
import { KpiStack } from "~/components/ui/kpi-stack";

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

/** Extract [lng, lat] from any GqlLocation geometry: Point directly, Polygon/MultiPolygon via centroid. */
function locationCoords(location: GqlLocation | null | undefined): [number, number] | null {
  const geom = location?.geometry as { type?: string; coordinates?: unknown } | null | undefined;
  if (!geom) return null;

  if (geom.type === "Point" && Array.isArray(geom.coordinates)) {
    const [lng, lat] = geom.coordinates as number[];
    if (typeof lng === "number" && typeof lat === "number") return [lng, lat];
  }

  if (geom.type === "Polygon") {
    const ring = (geom.coordinates as number[][][])?.[0];
    if (ring?.length) {
      const lng = ring.reduce((s, p) => s + (p[0] ?? 0), 0) / ring.length;
      const lat = ring.reduce((s, p) => s + (p[1] ?? 0), 0) / ring.length;
      return [lng, lat];
    }
  }

  if (geom.type === "MultiPolygon") {
    const pts = ((geom.coordinates as number[][][][]) ?? []).flatMap((p) => p[0] ?? []);
    if (pts.length) {
      const lng = pts.reduce((s, p) => s + (p[0] ?? 0), 0) / pts.length;
      const lat = pts.reduce((s, p) => s + (p[1] ?? 0), 0) / pts.length;
      return [lng, lat];
    }
  }

  return null;
}

/**
 * Pick the best location for an event marker.
 * Prefers a Point geometry over a Polygon/MultiPolygon district boundary,
 * since the event's generalLocation is often rolled up to an A2 district
 * while the underlying signals carry the precise geocoded Point.
 */
function pickEventLocation(event: GqlEvent): GqlLocation | null {
  const candidates = [
    event.generalLocation,
    event.originLocation,
    event.destinationLocation,
    // Signal locations are often level-4 Points - more precise than the district polygon
    ...(event.signals ?? []).map((s) => s.generalLocation),
  ].filter((l): l is GqlLocation => !!l);

  // Prefer the first Point geometry - it's an exact geocoded coordinate
  const point = candidates.find((l) => l.geometry?.type === "Point");
  if (point) return point;

  // Fall back to whatever is available
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
  referrer?: string;
}

export function CrisisDetailContent({
  crisis,
  loading,
  mode,
  relatedCrises = [],
  referrer = "insights",
}: CrisisDetailContentProps) {
  const t = useTranslations("crisisDetail");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string | null>("overview");
  const [leftPanelTab, setLeftPanelTab] = useState<string | null>("events");
  const [confirmDeleteCrisis, setConfirmDeleteCrisis] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingMeta, setEditingMeta] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftSummary, setDraftSummary] = useState("");

  const meQuery = api.auth.me.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  // Platform admin only. Org-scoped edit rights would need an org lookup;
  // `org_admin` no longer doubles as a global role after the taxonomy split.
  const isAdmin = isPlatformAdmin(meQuery.data?.user?.role);

  const utils = api.useUtils();

  const updateMeta = api.crises.updateMeta.useMutation({
    onSuccess: (updated) => {
      utils.crises.get.setData({ id: updated.id }, (prev) =>
        prev ? { ...prev, title: updated.title, summary: updated.summary } : prev,
      );
      void utils.crises.list.invalidate();
      setEditingTitle(false);
      setEditingMeta(false);
    },
  });

  const deleteCrisis = api.crises.deleteCrisis.useMutation({
    onSuccess: () => {
      void utils.crises.list.invalidate();
      router.push("/insights");
    },
  });

  // Country context for the minimap comes from the active team, not a
  // fixed country. Null when the team monitors globally.
  const { countryId: focusCountryId, countryName: focusCountryName } = useTeamCountry();
  const focusCountryL0Query = api.locations.getById.useQuery(
    { id: focusCountryId! },
    { enabled: !!focusCountryId, staleTime: Infinity, refetchOnWindowFocus: false },
  );
  const focusCountryGeometry = focusCountryL0Query.data?.geometry ?? undefined;
  const focusCountryPCode = resolveCountryConfig(focusCountryName ?? undefined)?.pCode;

  const events = crisis?.events ?? [];

  // Pick a primary coordinate for the map centre. Prefer the crisis's own
  // generalLocation, fall back to the first event with a resolvable location,
  // finally centre on the active team's country.
  const primaryCoords = useMemo<[number, number]>(() => {
    const fromCrisis = locationCoords(crisis?.generalLocation);
    if (fromCrisis) return fromCrisis;
    for (const e of events) {
      const c = locationCoords(pickEventLocation(e));
      if (c) return c;
    }
    return resolveCountryConfig(focusCountryName ?? undefined)?.center ?? [10, 20];
  }, [crisis, events, focusCountryName]);

  // For the minimap zoom, use the first event location that has a proper parent
  // chain (A2 district with A1 state parent). The crisis's own generalLocation
  // is often a synthetic point without hierarchy, but event locations are real
  // A2 districts that map to A1 states - the same data the detection page uses.
  const mapZoomLocation = useMemo(() => {
    for (const e of events) {
      const loc = pickEventLocation(e);
      if (loc?.parent?.id) return loc;
      if (loc?.level === 1) return loc;
    }
    return crisis?.generalLocation ?? null;
  }, [crisis, events]);

  const mapMarkers = useMemo<MapMarker[]>(() => {
    if (!crisis) return [];
    if (events.length === 0) {
      return [{
        id: 0,
        lng: primaryCoords[0],
        lat: primaryCoords[1],
        title: crisis.title ?? t("crisisBadge"),
        severity: mapSeverity(crisis.severity),
        description: resolveLocationName(crisis.generalLocation) ?? undefined,
      }];
    }
    return events.map((e, idx) => {
      const c = locationCoords(pickEventLocation(e)) ?? primaryCoords;
      return {
        id: idx,
        lng: c[0],
        lat: c[1],
        title: e.title ?? e.types[0] ?? t("eventFallback"),
        severity: mapSeverity(e.severity),
        description: resolveLocationName(pickEventLocation(e)) ?? undefined,
        type: e.types[0],
      };
    });
  }, [crisis, events, primaryCoords, t]);

  // Sum populationDisplaced across all linked events.
  const populationDisplaced = useMemo(() => {
    const total = events.reduce((sum, e) => {
      const n = bigIntStrToNumber(e.populationDisplaced);
      return sum + (n ?? 0);
    }, 0);
    return total > 0 ? total : null;
  }, [events]);

  // Resolve IDP displacement count from event location metadata (A2 -> A1 -> A0 fallback).
  const crisisIdpData = useMemo(() => {
    const popInArea = crisis?.populationInArea ? Number(crisis.populationInArea) : null;
    for (const event of events) {
      const loc = pickEventLocation(event);
      if (!loc) continue;
      const candidates = [loc, ...(loc.ancestors ?? [])];
      for (const level of [2, 1, 0]) {
        const candidate = candidates.find((c) => c.level === level);
        if (!candidate) continue;
        const meta = candidate.metadata?.find((m) => m.type === "iom_dtm_displacement");
        if (!meta?.data) continue;
        const displaced = (meta.data as Record<string, unknown>).population_displaced as number | undefined;
        if (typeof displaced !== "number" || !isFinite(displaced)) continue;
        const pop = candidate.population ? Number(candidate.population) : popInArea;
        const ratio = pop ? displaced / pop : null;
        return { displaced, ratio, name: candidate.name };
      }
    }
    return null;
  }, [crisis, events]);

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
        <Text fw={600} size="lg">{t("notFound.title")}</Text>
        <Text size="sm" c="var(--color-text-muted)" mt={8}>
          {t("notFound.description")}
        </Text>
        {mode === "page" && (
          <Link
            href={referrer === "map" ? mapReturnHref() : "/insights"}
            style={{
              display: "inline-block",
              marginTop: 16,
              color: "var(--color-accent)",
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            &larr; {t("backToAnalysis")}
          </Link>
        )}
      </Box>
    );
  }

  const sevColor = severityColor(crisis.severity);
  const sev = mapSeverity(crisis.severity);
  const isCompact = mode === "drawer";

  const title = crisis.title ?? t("untitledCrisis");
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
        title={t("deleteModal.title")}
        size="sm"
        centered
      >
        <Text size="sm" c="var(--color-text-secondary)" mb={20}>
          {t.rich("deleteModal.confirm", {
            title: crisis.title ?? t("deleteModal.fallbackName"),
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </Text>
        <Group justify="flex-end" gap={8}>
          <Button variant="default" size="xs" onClick={() => setConfirmDeleteCrisis(false)}>
            {tCommon("actions.cancel")}
          </Button>
          <Button
            size="xs"
            color="red"
            loading={deleteCrisis.isPending}
            onClick={() => deleteCrisis.mutate({ id: crisis.id })}
          >
            {tCommon("actions.delete")}
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
            <Link
              href={referrer === "map" ? mapReturnHref() : "/insights"}
              style={{ textDecoration: "none" }}
            >
              <Group gap={6} className="hover:opacity-70" style={{ cursor: "pointer" }}>
                <IconArrowLeft size={14} color="var(--color-text-secondary)" />
                <Text size="sm" c="var(--color-text-secondary)" fw={500}>
                  {t("backToAnalysis")}
                </Text>
              </Group>
            </Link>
            <Group gap={12}>
              {relatedCrises.length > 0 && (
                <Select
                  size="xs"
                  w={220}
                  placeholder={t("switchCrisis")}
                  data={relatedCrises.map((s) => ({
                    value: s.id,
                    label: s.title ?? t("untitledCrisis"),
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
                      {t("deleteModal.menuItem")}
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
          borderInlineStart: `4px solid ${sevColor}`,
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
            {tCommon(`severities.${sev}`)}
          </span>
          <Badge
            size="xs"
            variant="light"
            style={{ background: "var(--color-bg-muted)", color: "var(--color-text-secondary)" }}
          >
            {t("crisisBadge")}
          </Badge>
        </Group>

        <Group justify="space-between" align="flex-start" mb={10} wrap="nowrap" gap={16}>
          {editingTitle ? (
            <Group gap={8} style={{ flex: 1 }} wrap="nowrap">
              <TextInput
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.currentTarget.value)}
                style={{ flex: 1 }}
                size="sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") updateMeta.mutate({ id: crisis.id, title: draftTitle });
                  if (e.key === "Escape") setEditingTitle(false);
                }}
              />
              <ActionIcon size="sm" variant="filled" color="green" loading={updateMeta.isPending} onClick={() => updateMeta.mutate({ id: crisis.id, title: draftTitle })}>
                <IconCheck size={14} />
              </ActionIcon>
              <ActionIcon size="sm" variant="subtle" onClick={() => setEditingTitle(false)}>
                <IconX size={14} />
              </ActionIcon>
            </Group>
          ) : (
            <Group gap={8} align="center" style={{ flex: 1 }} wrap="nowrap">
              <Text fw={700} c="var(--color-text-primary)" style={{ fontSize: isCompact ? 18 : 22, lineHeight: 1.3 }}>
                {title}
              </Text>
              {isAdmin && (
                <ActionIcon size="xs" variant="subtle" color="gray" onClick={() => { setDraftTitle(crisis.title ?? ""); setEditingTitle(true); }}>
                  <IconPencil size={13} />
                </ActionIcon>
              )}
            </Group>
          )}
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
                {t("updatedDate", { date: format.dateTime(new Date(updatedAt), "short") })}
              </Text>
            </Group>
          )}
          <Group gap={4}>
            <IconLayersIntersect size={13} color="var(--color-text-muted)" />
            <Text size="xs" c="var(--color-text-secondary)" fw={500}>
              {t("eventCount", { count: events.length })}
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
              <Tabs.Tab value="overview">{t("tabs.overview")}</Tabs.Tab>
              <Tabs.Tab value="needs">{t("tabs.needs")}</Tabs.Tab>
            </Tabs.List>
          </Tabs>
        </Box>
      )}

      {activeTab === "needs" ? (
        <NeedsAssessmentPanel crisis={crisis} />
      ) : (
        <>
          {/* Full-width KPI row */}
          <Box px={isCompact ? 16 : 24} pt={isCompact ? 16 : 24}>
            <KpiStack
              sections={[
                {
                  title: t("kpi.impact"),
                  items: [
                    {
                      icon: <IconUsers size={14} color="var(--color-accent)" />,
                      iconBg: "var(--color-accent-light)",
                      value: populationAffected !== null ? format.number(populationAffected, "compact") : "-",
                      label: t("kpi.peopleAffected"),
                    },
                    {
                      icon: <IconUsersGroup size={14} color="var(--color-warning)" />,
                      iconBg: "var(--color-warning-light)",
                      value: populationDisplaced !== null ? format.number(populationDisplaced, "compact") : "-",
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
                      value: populationInArea !== null ? format.number(populationInArea, "compact") : "-",
                      label: t("kpi.peopleInArea"),
                    },
                    {
                      icon: <IconTrendingUp size={14} color="var(--color-text-muted)" />,
                      iconBg: "var(--color-bg-muted)",
                      value:
                        crisisIdpData?.ratio != null
                          ? `${(crisisIdpData.ratio * 100).toFixed(1)}%`
                          : crisisIdpData?.displaced != null
                            ? format.number(crisisIdpData.displaced, "compact")
                            : "-",
                      label: crisisIdpData ? t("kpi.idpPerCapitaIn", { name: crisisIdpData.name }) : t("kpi.idpPerCapita"),
                    },
                  ],
                },
              ]}
            />
          </Box>

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
            <Box style={{ flex: 1, minWidth: 0 }}>
              {/* Summary card */}
              <Card p={0} style={{ border: "1px solid var(--color-border)" }}>
                <Box px={16} py={12} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <Group justify="space-between">
                    <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 14 }}>
                      {t("summary.title")}
                    </Text>
                    <Group gap={6}>
                      {isAdmin && !editingMeta && (
                        <ActionIcon size="xs" variant="subtle" color="gray" onClick={() => { setDraftSummary(crisis.summary ?? ""); setEditingMeta(true); }}>
                          <IconPencil size={13} />
                        </ActionIcon>
                      )}
                      {!editingMeta && (
                        <Badge
                          size="xs"
                          style={{
                            background: "var(--color-ai-light)",
                            color: "var(--color-ai)",
                            border: "1px solid var(--color-ai-border)",
                            fontWeight: 600,
                          }}
                        >
                          {tCommon("badges.aiGenerated")}
                        </Badge>
                      )}
                    </Group>
                  </Group>
                </Box>
                {editingMeta ? (
                  <Box p={16}>
                    <Textarea
                      value={draftSummary}
                      onChange={(e) => setDraftSummary(e.currentTarget.value)}
                      onKeyDown={(e) => {
                        if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !updateMeta.isPending) {
                          updateMeta.mutate({ id: crisis.id, summary: draftSummary });
                        }
                        if (e.key === "Escape") setEditingMeta(false);
                      }}
                      autosize
                      minRows={4}
                      maxRows={16}
                      size="sm"
                      autoFocus
                    />
                    <Group gap={8} mt={10} justify="flex-end">
                      <Button size="xs" variant="subtle" onClick={() => setEditingMeta(false)}>{tCommon("actions.cancel")}</Button>
                      <Button size="xs" loading={updateMeta.isPending} onClick={() => updateMeta.mutate({ id: crisis.id, summary: draftSummary })}>{tCommon("actions.save")}</Button>
                    </Group>
                  </Box>
                ) : (
                  <CrisisSummaryBody summary={crisis.summary} />
                )}
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
              {/* Map */}
              <MinimapCard
                markers={mapMarkers}
                center={primaryCoords}
                countryGeometry={focusCountryGeometry}
                countryId={focusCountryId ?? null}
                countryName={focusCountryName ?? undefined}
                countryPCode={focusCountryPCode}
                location={mapZoomLocation}
                locationName={locationName ?? undefined}
                fullMapHref={mapFocusHref("crisis", crisis.id)}
              />
            </Box>
          </Box>

          {/* Events / Demography / Sources tabs - full width */}
          <Box px={isCompact ? 16 : 24} pb={isCompact ? 16 : 24}>
            <Card p={0} style={{ border: "1px solid var(--color-border)" }}>
              <Tabs value={leftPanelTab} onChange={setLeftPanelTab}>
                <Box px={8} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <Tabs.List style={{ borderBottom: "none" }}>
                    <Tabs.Tab value="events">{t("tabs.events")}</Tabs.Tab>
                    <Tabs.Tab value="demography">{t("tabs.demography")}</Tabs.Tab>
                    <Tabs.Tab value="sources">{t("tabs.sources")}</Tabs.Tab>
                    <Tabs.Tab value="confidence">{t("tabs.confidence")}</Tabs.Tab>
                  </Tabs.List>
                </Box>
                <Tabs.Panel value="events" style={{ height: 300, overflowY: "auto" }}>
                  <EventsTimeline events={eventsNewestFirst} isAdmin={isAdmin} crisisId={crisis.id} totalEventCount={events.length} />
                </Tabs.Panel>
                <Tabs.Panel value="demography" style={{ height: 300, overflowY: "auto" }}>
                  <DemographyPanel crisis={crisis} />
                </Tabs.Panel>
                <Tabs.Panel value="sources" style={{ height: 300, overflowY: "auto" }}>
                  <SourcesPanel events={eventsNewestFirst} crisis={crisis} />
                </Tabs.Panel>
                <Tabs.Panel value="confidence" style={{ height: 300, overflowY: "auto" }}>
                  <ConfidencePanel crisis={crisis} />
                </Tabs.Panel>
              </Tabs>
            </Card>
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
  const t = useTranslations("crisisDetail");
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
        <Text size="sm" c="var(--color-text-muted)">{t("summary.empty")}</Text>
      </Box>
    );
  }

  return (
    <Stack gap={0} p={16}>
      {parsed.tldr.length > 0 && (
        <>
          <Stack gap={4} pb={12}>
            {parsed.tldr.map((bullet, i) => (
              <Group key={i} gap={8} wrap="nowrap" align="flex-start">
                <Box style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--color-text-muted)", flexShrink: 0, marginTop: 7 }} />
                <Text size="sm" c="var(--color-text-primary)" style={{ lineHeight: 1.55 }}>{bullet}</Text>
              </Group>
            ))}
          </Stack>
          <Divider mb={12} />
        </>
      )}
      <Text size="sm" c="var(--color-text-secondary)" style={{ lineHeight: 1.65 }}>
        {parsed.description}
      </Text>
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

// Pipeline-generated scenario labels -> i18n keys under crisisDetail.scenario.labels.*
// Legacy API-provided labels fall back to the raw string.
const SCENARIO_LABEL_KEYS: Record<string, "bestCase" | "mostLikely" | "worstCase"> = {
  "Best Case": "bestCase",
  "Most Likely": "mostLikely",
  "Worst Case": "worstCase",
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
  const t = useTranslations("crisisDetail");
  const tCommon = useTranslations("common");
  const [open, setOpen] = useState(false);

  return (
    <Card p={0} style={{ border: "1px solid var(--color-border)" }}>
      <UnstyledButton onClick={() => setOpen((o) => !o)} style={{ width: "100%" }}>
        <Box px={16} py={12} style={{ borderBottom: open ? "1px solid var(--color-border)" : undefined }}>
          <Group justify="space-between" align="center">
            <Group gap={8} align="center">
              <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 14 }}>
                {t("scenario.title")}
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
                  {tCommon("badges.aiGenerated")}
                </Badge>
              )}
            </Group>
            {open
              ? <IconChevronUp size={14} color="var(--color-text-muted)" />
              : <IconChevronDown size={14} color="var(--color-text-muted)" />}
          </Group>
        </Box>
      </UnstyledButton>

      <Collapse in={open}>
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
                    {SCENARIO_LABEL_KEYS[s.label] ? t(`scenario.labels.${SCENARIO_LABEL_KEYS[s.label]}`) : s.label}
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
              {t("scenario.empty")}
            </Text>
          </Box>
        )}
      </Collapse>
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
  const t = useTranslations("crisisDetail");
  const tCommon = useTranslations("common");
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
      setRemoveError(err.message ?? t("documents.removeFailed"));
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
      setUploadError(t("documents.uploadFailed"));
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
        title={t("documents.removeModalTitle")}
        size="sm"
        centered
      >
        <Text size="sm" c="var(--color-text-secondary)" mb={20}>
          {t.rich("documents.removeConfirm", {
            name: pendingRemove?.name ?? "",
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </Text>
        <Group justify="flex-end" gap={8}>
          <Button variant="default" size="xs" onClick={() => setPendingRemove(null)}>
            {tCommon("actions.cancel")}
          </Button>
          <Button
            size="xs"
            color="red"
            loading={removeAttachment.isPending}
            onClick={confirmRemove}
          >
            {t("documents.remove")}
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
            <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 14 }}>{t("documents.title")}</Text>
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
                  title={t("documents.remove")}
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
                <Text size="xs" c="var(--color-text-muted)" style={{ flex: 1 }}>{t("documents.empty")}</Text>
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
                  fontSize: 12, fontWeight: 600, marginInlineStart: "auto",
                  opacity: uploading ? 0.6 : 1,
                }}
                className={uploading ? undefined : "hover:bg-[var(--color-bg-muted)]"}
              >
                {uploading ? <Loader size={12} /> : <IconUpload size={12} />}
                {uploading ? t("documents.uploading") : t("documents.upload")}
              </button>
            </Box>
          </>
        )}
      </Card>
    </>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

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
  const format = useFormatter();
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
        <Box style={{ textAlign: "end", flexShrink: 0, minWidth: 110 }}>
          {need.peopleInNeed !== undefined ? (
            <>
              <Text fw={700} size="sm" c="var(--color-text-primary)" style={{ letterSpacing: "-0.01em" }}>
                {format.number(need.peopleInNeed, "compact")}
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

// ── Demography panel ──────────────────────────────────────────────────────────


type A2Location = { name: string; metadata: { type: string; data: unknown }[] };

// Like resolveA2Metadata but also returns the location name for display.
function resolveA2Location(crisis: GqlCrisis): A2Location | null {
  type LocLike = {
    name?: string;
    level: number;
    metadata?: { type: string; data: unknown }[] | null;
    ancestors?: { name?: string; level: number; metadata?: { type: string; data: unknown }[] | null }[] | null;
  };
  const candidates: LocLike[] = [
    crisis.generalLocation,
    ...((crisis.events ?? []) as { generalLocation?: LocLike | null; originLocation?: LocLike | null }[])
      .flatMap((e) => [e.generalLocation, e.originLocation]),
  ].filter(Boolean) as LocLike[];

  for (const loc of candidates) {
    if (loc.level === 2 && loc.metadata?.length) return { name: loc.name ?? "Unknown", metadata: loc.metadata };
    const a2 = loc.ancestors?.find((a) => a.level === 2);
    if (a2?.metadata?.length) return { name: a2.name ?? "Unknown", metadata: a2.metadata };
  }
  return null;
}

type WpBand = { male: number; female: number; total: number };

// Humanitarian vulnerable-group definitions (WorldPop age-band keys).
// labelKey: i18n keys under crisisDetail.demography.groups.* - resolved via t() at render time.
const VULN_GROUPS = [
  { labelKey: "childrenUnder5", keys: ["00", "01"] },
  { labelKey: "children5to14",  keys: ["05", "10"] },
  { labelKey: "women15to49",    keys: ["15", "20", "25", "30", "35", "40", "45"], femaleOnly: true },
  { labelKey: "elderly60plus",  keys: ["60", "65", "70", "75", "80", "85", "90"] },
] as const;

function DemographyPanel({ crisis }: { crisis: GqlCrisis }) {
  const t = useTranslations("crisisDetail");
  const a2 = useMemo(() => resolveA2Location(crisis), [crisis]);

  if (!a2) {
    return (
      <Box p={24} style={{ textAlign: "center" }}>
        <Text size="sm" c="var(--color-text-muted)">{t("demography.noData")}</Text>
      </Box>
    );
  }

  const wpMeta = a2.metadata.find((m) => m.type === "worldpop_age_sex_2026");

  if (!wpMeta) {
    return (
      <Box p={24} style={{ textAlign: "center" }}>
        <Text size="sm" c="var(--color-text-muted)">{t("demography.notYetAvailable", { name: a2.name })}</Text>
      </Box>
    );
  }

  const wp = wpMeta.data as Record<string, WpBand | Record<string, unknown>>;
  const src = wp._source as { year?: number; release?: string } | undefined;
  const band = (key: string) => wp[key] as WpBand | undefined;

  let totalPop = 0, totalMale = 0, totalFemale = 0;
  for (const [key, val] of Object.entries(wp)) {
    if (key === "_source" || typeof val !== "object" || val === null) continue;
    const b = val as WpBand;
    totalPop += b.total ?? 0;
    totalMale += b.male ?? 0;
    totalFemale += b.female ?? 0;
  }

  const fmt = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}k` : String(n);
  const pct = (n: number, total: number) => total > 0 ? `${Math.round((n / total) * 100)}%` : "-";

  return (
    <Box>
      {/* Location + total */}
      <Box px={16} py={10} style={{ borderBottom: "1px solid var(--color-border)" }}>
        <Group justify="space-between" align="center">
          <Box>
            <Text fw={600} size="sm" c="var(--color-text-primary)">{a2.name}</Text>
            <Text size="xs" c="var(--color-text-muted)">{t("demography.source", { year: src?.year ?? 2026, release: src?.release ? ` ${src.release}` : "" })}</Text>
          </Box>
          <Box style={{ textAlign: "end" }}>
            <Text fw={700} size="sm" c="var(--color-text-primary)">{fmt(totalPop)}</Text>
            <Text size="xs" c="var(--color-text-muted)">{t("demography.total")}</Text>
          </Box>
        </Group>
      </Box>

      {/* Vulnerable group KPIs */}
      <Box px={16} py={10} style={{ borderBottom: "1px solid var(--color-border)" }}>
        <Text style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-muted)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 8 }}>
          {t("demography.vulnerableGroups")}
        </Text>
        <Box style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {VULN_GROUPS.map((g) => {
            const count = g.keys.reduce((s, k) => {
              const b = band(k);
              return s + (b ? ("femaleOnly" in g && g.femaleOnly ? b.female : b.total) : 0);
            }, 0);
            return (
              <Box key={g.labelKey} p={10} style={{ background: "var(--color-bg-muted)", border: "1px solid var(--color-border)", borderRadius: 6 }}>
                <Text style={{ fontSize: 10, color: "var(--color-text-muted)", marginBottom: 4 }}>{t(`demography.groups.${g.labelKey}`)}</Text>
                <Text fw={700} size="lg" c="var(--color-text-primary)" style={{ lineHeight: 1.2 }}>{pct(count, totalPop)}</Text>
                <Text size="xs" c="var(--color-text-muted)">{fmt(count)}</Text>
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* Gender split */}
      <Box px={16} pt={10} pb={12}>
        <Text style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-muted)", letterSpacing: "0.05em", textTransform: "uppercase", marginBottom: 8 }}>
          {t("demography.genderSplit")}
        </Text>
        <Box style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {[
            { label: t("demography.male"),   count: totalMale },
            { label: t("demography.female"), count: totalFemale },
          ].map(({ label, count }) => (
            <Box key={label} p={10} style={{ background: "var(--color-bg-muted)", border: "1px solid var(--color-border)", borderRadius: 6 }}>
              <Text fw={700} size="lg" c="var(--color-text-primary)" style={{ lineHeight: 1.2 }}>{pct(count, totalPop)}</Text>
              <Text size="xs" c="var(--color-text-muted)">{fmt(count)}</Text>
              <Text style={{ fontSize: 10, color: "var(--color-text-muted)", marginTop: 2 }}>{label}</Text>
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

// ── Sources panel helpers ─────────────────────────────────────────────────────

// Dataminr signal titles end with ": [SourceCategory] via [Publisher]."
// Extract the publisher name so we show the original source, not "dataminr".
function extractPublisher(title: string): string | null {
  const match = title.match(/via ([^.]+)\.?\s*$/i);
  return match ? match[1]!.trim() : null;
}

function resolveA2Metadata(crisis: GqlCrisis): { type: string; data: unknown }[] {
  type LocLike = { level: number; metadata?: { type: string; data: unknown }[] | null; ancestors?: { level: number; metadata?: { type: string; data: unknown }[] | null }[] | null };
  const candidates: LocLike[] = [
    crisis.generalLocation,
    ...((crisis.events ?? []) as { generalLocation?: LocLike | null; originLocation?: LocLike | null }[])
      .flatMap((e) => [e.generalLocation, e.originLocation]),
  ].filter(Boolean) as LocLike[];

  for (const loc of candidates) {
    if (loc.level === 2 && loc.metadata?.length) return loc.metadata;
    const a2 = loc.ancestors?.find((a) => a.level === 2);
    if (a2?.metadata?.length) return a2.metadata;
  }
  return [];
}

// Derive human-readable context rows from raw location metadata.
interface ContextRow { label: string; detail: string }

// Translator bound to the "crisisDetail" namespace, passed in from the component.
type CrisisDetailT = ReturnType<typeof useTranslations<"crisisDetail">>;

type MetadataFormatter = (data: Record<string, unknown>, t: CrisisDetailT) => ContextRow[];

// Registry: maps metadata type keys to display formatters.
// Add new entries here as the pipeline introduces new metadata types.
const METADATA_REGISTRY: Record<string, MetadataFormatter> = {
  worldpop_age_sex_2026: (d, t) => {
    // Age-band keys are 2-digit strings ("00","01","05","10",...,"90"); _source holds dataset info.
    const src = d._source as Record<string, unknown> | undefined;
    const year = typeof src?.year === "number" ? src.year : 2026;
    const release = typeof src?.release === "string" ? ` ${src.release}` : "";
    let totalPop = 0, totalMale = 0, totalFemale = 0;
    for (const [key, val] of Object.entries(d)) {
      if (key === "_source" || typeof val !== "object" || val === null) continue;
      const band = val as Record<string, number>;
      totalPop += band.total ?? 0;
      totalMale += band.male ?? 0;
      totalFemale += band.female ?? 0;
    }
    const fmt = (n: number) => n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1)}k` : String(n);
    const mPct = totalPop > 0 ? Math.round((totalMale / totalPop) * 100) : 0;
    const fPct = 100 - mPct;
    return [
      { label: t("sources.context.population"), detail: t("sources.context.populationDetail", { value: fmt(totalPop), year, release }) },
      { label: t("sources.context.demographics"), detail: t("sources.context.demographicsDetail", { malePct: mPct, femalePct: fPct, year }) },
    ];
  },
  iom_dtm_displacement: (d, t) => {
    const parts: string[] = ["IOM DTM"];
    if (d.round_number) parts.push(t("sources.context.round", { number: String(d.round_number) }));
    if (typeof d.reporting_date === "string") parts.push(d.reporting_date.slice(0, 10));
    if (typeof d.operation === "string" && d.operation) parts.push(d.operation);
    return [{ label: t("sources.context.idp"), detail: parts.join(" - ") }];
  },
  msna_severity_082025: (d, t) => {
    const asOf = typeof d.as_of === "string" ? ` (${d.as_of})` : "";
    return [{ label: t("sources.context.needsBaseline"), detail: `MSNA 2025${asOf}` }];
  },
};

// Iterates over whatever metadata types are actually present - no hardcoded type checks.
function buildContextRows(metadata: { type: string; data: unknown }[], t: CrisisDetailT): ContextRow[] {
  const rows: ContextRow[] = [];
  for (const { type, data } of metadata) {
    const formatter = METADATA_REGISTRY[type];
    if (formatter) rows.push(...formatter(data as Record<string, unknown>, t));
  }
  return rows;
}

// ── Section header ─────────────────────────────────────────────────────────────

function SectionHeader({ children, open, onToggle }: { children: React.ReactNode; open?: boolean; onToggle?: () => void }) {
  const isCollapsible = onToggle !== undefined;
  return (
    <Box
      px={16} py={8}
      onClick={onToggle}
      style={{
        borderBottom: "1px solid var(--color-border)",
        background: "var(--color-bg-muted)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        cursor: isCollapsible ? "pointer" : undefined,
        userSelect: "none",
      }}
    >
      <Text style={{ fontSize: 10, fontWeight: 700, color: "var(--color-text-muted)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
        {children}
      </Text>
      {isCollapsible && (open ? <IconChevronUp size={12} color="var(--color-text-muted)" /> : <IconChevronDown size={12} color="var(--color-text-muted)" />)}
    </Box>
  );
}

// ── Sources panel ──────────────────────────────────────────────────────────────

function SourcesPanel({ events, crisis }: { events: GqlEvent[]; crisis: GqlCrisis }) {
  const t = useTranslations("crisisDetail");
  const format = useFormatter();
  const [signalsOpen, setSignalsOpen] = useState(true);
  const [enrichmentOpen, setEnrichmentOpen] = useState(false);
  const [contextOpen, setContextOpen] = useState(false);

  // Group by original publisher extracted from signal title
  const signalSources = useMemo(() => {
    const map = new Map<string, { publisher: string; aggregator: string | null; signalCount: number; href: string | null; latestPublishedAt: string | null }>();
    for (const event of events) {
      for (const signal of event.signals ?? []) {
        const extracted = extractPublisher(signal.title ?? "");
        const sourceName = signal.source?.name ?? null;
        const publisher = extracted ?? sourceName ?? "Unknown";
        // Only show aggregator label when the publisher was extracted from the title
        // (meaning it passed through an aggregator like Dataminr).
        const aggregator = extracted ? sourceName : null;
        const existing = map.get(publisher);
        if (existing) {
          existing.signalCount += 1;
          if (signal.publishedAt && (!existing.latestPublishedAt || signal.publishedAt > existing.latestPublishedAt)) {
            existing.latestPublishedAt = signal.publishedAt;
          }
        } else {
          map.set(publisher, { publisher, aggregator, signalCount: 1, href: signal.url ?? null, latestPublishedAt: signal.publishedAt ?? null });
        }
      }
    }
    return [...map.values()].sort((a, b) => b.signalCount - a.signalCount);
  }, [events]);

  const contextMetadata = useMemo(() => resolveA2Metadata(crisis), [crisis]);
  const contextRows = useMemo(() => buildContextRows(contextMetadata, t), [contextMetadata, t]);

  return (
    <Box>
      {/* ── Underlying Signals ── */}
      <SectionHeader open={signalsOpen} onToggle={() => setSignalsOpen((v) => !v)}>{t("sources.underlyingSignals")}</SectionHeader>
      <Collapse in={signalsOpen}>
        {signalSources.length === 0 ? (
          <Box p={16}><Text size="sm" c="var(--color-text-muted)">{t("sources.noSignalSources")}</Text></Box>
        ) : (
          signalSources.map((src, idx) => {
            const label = src.aggregator ? t("sources.viaAggregator", { publisher: src.publisher, aggregator: src.aggregator }) : src.publisher;
            const asOf = src.latestPublishedAt
              ? t("sources.asOf", { date: format.dateTime(new Date(src.latestPublishedAt), "short") })
              : null;
            return (
              <Box
                key={src.publisher}
                px={16} py={8}
                style={{ borderBottom: idx < signalSources.length - 1 ? "1px solid var(--color-border)" : undefined, display: "flex", alignItems: "center", gap: 12 }}
              >
                {src.href ? (
                  <a href={src.href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", flex: 1, minWidth: 0 }}>
                    <Text size="sm" fw={500} c="var(--color-text-primary)" truncate className="hover:underline">{label}</Text>
                  </a>
                ) : (
                  <Text size="sm" fw={500} c="var(--color-text-primary)" truncate style={{ flex: 1, minWidth: 0 }}>{label}</Text>
                )}
                {asOf && (
                  <Text size="xs" c="var(--color-text-muted)" style={{ flexShrink: 0 }}>{asOf}</Text>
                )}
                <Badge size="xs" style={{ background: "var(--color-bg-muted)", color: "var(--color-text-muted)", flexShrink: 0 }}>
                  {t("sources.signalCount", { count: src.signalCount })}
                </Badge>
              </Box>
            );
          })
        )}
      </Collapse>

      {/* ── Enrichment ── */}
      <SectionHeader open={enrichmentOpen} onToggle={() => setEnrichmentOpen((v) => !v)}>{t("sources.enrichmentSection")}</SectionHeader>
      <Collapse in={enrichmentOpen}>
        <Box p={16}>
          <Text size="sm" c="var(--color-text-muted)">
            {t("sources.noEnrichment")}
          </Text>
        </Box>
      </Collapse>

      {/* ── Context Data ── */}
      <SectionHeader open={contextOpen} onToggle={() => setContextOpen((v) => !v)}>{t("sources.contextData")}</SectionHeader>
      <Collapse in={contextOpen}>
        {contextRows.length === 0 ? (
          <Box p={16}><Text size="sm" c="var(--color-text-muted)">{t("sources.noContextData")}</Text></Box>
        ) : (
          contextRows.map((row, idx) => (
            <Box
              key={row.label}
              px={16} py={11}
              style={{ borderBottom: idx < contextRows.length - 1 ? "1px solid var(--color-border)" : undefined, display: "flex", alignItems: "baseline", gap: 12 }}
            >
              <Text size="sm" fw={500} c="var(--color-text-muted)" style={{ minWidth: 180, flexShrink: 0 }}>{row.label}</Text>
              <Text size="sm" c="var(--color-text-primary)">{row.detail}</Text>
            </Box>
          ))
        )}
      </Collapse>
    </Box>
  );
}

// ── Confidence panel ──────────────────────────────────────────────────────────

// key: i18n keys under crisisDetail.confidence.cols.* - resolved via t() at render time.
const CONFIDENCE_COLS = [
  { key: "baseline" },
  { key: "enriched" },
  { key: "reviewed" },
  { key: "validated" },
] as const;

type ConfidenceKey = (typeof CONFIDENCE_COLS)[number]["key"];

interface ConfidenceRow {
  labelKey: "description" | "scenarios" | "needs";
  baseline: boolean;
  enriched: boolean;
  reviewed: boolean;
  validated: boolean;
}

function ConfidenceSquare({ active }: { active: boolean }) {
  return (
    <Box
      style={{
        width: 12,
        height: 12,
        borderRadius: 3,
        background: active ? "var(--color-success)" : "var(--color-border-dark)",
        flexShrink: 0,
        position: "relative",
        zIndex: 1,
      }}
    />
  );
}

const COL_TEMPLATE = "260px repeat(4, 1fr)";

function ConfidencePanel({ crisis }: { crisis: GqlCrisis }) {
  const t = useTranslations("crisisDetail");
  const [legendOpen, setLegendOpen] = useState(false);

  const hasDescription = !!crisis.summary;
  const hasScenarios   = (parseScenarios(crisis.scenarios)?.length ?? 0) > 0;
  const hasNeeds       = parseNeeds(crisis.needs).length > 0;

  const rows: ConfidenceRow[] = [
    { labelKey: "description", baseline: hasDescription, enriched: false, reviewed: false, validated: false },
    { labelKey: "scenarios",   baseline: hasScenarios,   enriched: false, reviewed: false, validated: false },
    { labelKey: "needs",       baseline: hasNeeds,       enriched: false, reviewed: false, validated: false },
  ];

  return (
    <Box>
      {/* Header row */}
      <Box
        style={{
          display: "grid",
          gridTemplateColumns: COL_TEMPLATE,
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-bg-muted)",
          marginTop: 32,
        }}
      >
        <Box px={16} py={8} />
        {CONFIDENCE_COLS.map((col, colIdx) => (
          <Box key={col.key} px={8} py={8} style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 11, fontWeight: 700, color: "var(--color-text-primary)", letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
              {t(`confidence.cols.${col.key}.label`)}
            </Text>
            {colIdx < CONFIDENCE_COLS.length - 1 && (
              <Box style={{
                position: "absolute",
                insetInlineEnd: -5,
                top: "50%",
                transform: "translateY(-50%)",
                zIndex: 2,
                fontSize: 7,
                lineHeight: 1,
                color: "var(--color-text-muted)",
                userSelect: "none",
              }}>
                ▶
              </Box>
            )}
          </Box>
        ))}
      </Box>

      {/* Data rows */}
      {rows.map((row, idx) => (
        <Box
          key={row.labelKey}
          style={{
            display: "grid",
            gridTemplateColumns: COL_TEMPLATE,
            borderBottom: idx < rows.length - 1 ? "1px solid var(--color-border)" : undefined,
          }}
        >
          <Box px={16} py={10} style={{ display: "flex", alignItems: "center" }}>
            <Text size="sm" fw={500} c="var(--color-text-primary)">{t(`confidence.rows.${row.labelKey}`)}</Text>
          </Box>
          {CONFIDENCE_COLS.map((col, colIdx) => (
            <Box
              key={col.key}
              py={10}
              style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              {/* Connector line - spans full width except half-cells at each end */}
              <Box style={{
                position: "absolute",
                top: "50%",
                insetInlineStart: colIdx === 0 ? "50%" : 0,
                insetInlineEnd:   colIdx === CONFIDENCE_COLS.length - 1 ? "50%" : 0,
                height: 1,
                background: "var(--color-border-dark)",
                transform: "translateY(-50%)",
              }} />
              <ConfidenceSquare active={row[col.key as ConfidenceKey]} />
            </Box>
          ))}
        </Box>
      ))}

      {/* Bottom legend trigger */}
      <Box
        px={16} py={8}
        style={{ borderTop: "1px solid var(--color-border)", display: "flex", alignItems: "center", gap: 5 }}
      >
        <Text style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{t("confidence.legend")}</Text>
        <ActionIcon size={16} variant="transparent" onClick={() => setLegendOpen(true)} style={{ color: "var(--color-text-muted)" }}>
          <IconInfoCircle size={13} />
        </ActionIcon>
      </Box>

      {/* Legend modal */}
      <Modal opened={legendOpen} onClose={() => setLegendOpen(false)} title={t("confidence.modalTitle")} size="sm">
        <Stack gap={16}>
          {CONFIDENCE_COLS.map((col) => (
            <Box key={col.key}>
              <Text size="sm" fw={600} c="var(--color-text-primary)" mb={4}>{t(`confidence.cols.${col.key}.label`)}</Text>
              <Text size="sm" c="var(--color-text-muted)">{t(`confidence.cols.${col.key}.description`)}</Text>
            </Box>
          ))}
        </Stack>
      </Modal>
    </Box>
  );
}

function EventsTimeline({ events, isAdmin, crisisId, totalEventCount }: { events: GqlEvent[]; isAdmin: boolean; crisisId: string; totalEventCount: number }) {
  const t = useTranslations("crisisDetail");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const router = useRouter();
  const utils = api.useUtils();
  const [pendingRemoveEvent, setPendingRemoveEvent] = useState<GqlEvent | null>(null);

  const removeEvent = api.crises.removeEvent.useMutation({
    onSuccess: () => {
      if (totalEventCount <= 1) {
        // Last event removed - crisis was deleted by the backend
        void utils.crises.list.invalidate();
        router.push("/insights");
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
          {t("events.empty")}
        </Text>
      </Box>
    );
  }
  return (
    <>
      <Modal
        opened={pendingRemoveEvent !== null}
        onClose={() => setPendingRemoveEvent(null)}
        title={t("events.removeModalTitle")}
        size="sm"
        centered
      >
        <Text size="sm" c="var(--color-text-secondary)" mb={8}>
          {t.rich("events.removeConfirm", {
            title: pendingRemoveEvent?.title ?? pendingRemoveEvent?.types[0] ?? t("events.fallbackName"),
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </Text>
        {totalEventCount <= 1 && (
          <Text size="xs" c="var(--color-critical)" mb={12}>
            {t("events.lastEventWarning")}
          </Text>
        )}
        <Group justify="flex-end" gap={8} mt={16}>
          <Button variant="default" size="xs" onClick={() => setPendingRemoveEvent(null)}>
            {tCommon("actions.cancel")}
          </Button>
          <Button size="xs" color="red" loading={removeEvent.isPending} onClick={confirmRemoveEvent}>
            {totalEventCount <= 1 ? t("events.removeAndDelete") : t("events.remove")}
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
  const t = useTranslations("crisisDetail");
  const tCommon = useTranslations("common");
  const format = useFormatter();
  const [hovered, setHovered] = useState(false);
  const sev = mapSeverity(event.severity);
  const dotColor = severityColor(event.severity);
  const dateStr = event.lastSignalCreatedAt || event.firstSignalCreatedAt;
  const displayTitle = event.title ?? event.types[0] ?? t("eventFallback");
  const primaryType = event.types[0];
  const locationLabel = resolveLocationName(pickEventLocation(event));

  const dateObj = dateStr ? new Date(dateStr) : null;
  const dateMonthDay = dateObj
    ? format.dateTime(dateObj, { month: "short", day: "numeric" })
    : "";
  const dateYear = dateObj ? dateObj.getFullYear() : null;
  const nowYear = new Date().getFullYear();

  return (
    <Box
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
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
          textAlign: "end",
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
      <Box py={6} style={{ flex: 1, minWidth: 0 }}>
        <Box style={{ position: "relative" }}>
          <Link
            href={`/event/${event.id}`}
            style={{ textDecoration: "none", color: "inherit", display: "block" }}
          >
            <Box
              className="hover:bg-[var(--color-bg-muted)]"
              style={{
                border: "1px solid var(--color-border)",
                borderRadius: 8,
                padding: isAdmin ? "10px 36px 10px 12px" : "10px 12px",
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
                  {tCommon(`severities.${sev}`)}
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
            <Box
              style={{
                position: "absolute",
                top: 6,
                insetInlineEnd: 6,
                opacity: hovered ? 1 : 0,
                transition: "opacity 100ms",
                pointerEvents: hovered ? "auto" : "none",
              }}
            >
              <Menu position="bottom-end" withinPortal>
                <Menu.Target>
                  <ActionIcon
                    variant="default"
                    size="sm"
                    style={{ border: "1px solid var(--color-border)", background: "var(--color-bg-white)" }}
                    onClick={(e) => e.preventDefault()}
                  >
                    <IconDotsVertical size={13} />
                  </ActionIcon>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={onRemove}>
                    {t("events.removeFromCrisis")}
                  </Menu.Item>
                </Menu.Dropdown>
              </Menu>
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}


