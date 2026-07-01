import { notFound } from "next/navigation";
import { Box, Stack, Text, Group, Card } from "@mantine/core";
import { IconMapPin, IconCalendar } from "@tabler/icons-react";
import { GRAPHQL_URL } from "~/server/env";
import { mapSeverity, severityColor } from "~/lib/types/graphql";
import { getDisasterPills, getDisasterL2Pills } from "~/lib/disaster-types";
import { PublicEventHeader } from "./_components/public-event-header";
import { PublicEventMap, type AdminBoundary } from "./_components/public-event-map";
import { PublicKpiStrip } from "./_components/public-kpi-strip";

interface PublicEventSignalPoint {
  name: string | null;
  lng: number;
  lat: number;
}

interface PublicEvent {
  id: string;
  title: string | null;
  description: string | null;
  severity: number | null;
  validFrom: string;
  validTo: string;
  types: string[];
  primaryLocationName: string | null;
  primaryLocationCoords: [number, number] | null;
  signalPoints: PublicEventSignalPoint[];
  populationAffected: string | null;
  populationDisplaced: string | null;
  locationPopulation: string | null;
  locationPopulationLevel: number | null;
  locationPopulationName: string | null;
  locationIdp: string | null;
  locationIdpLevel: number | null;
  locationIdpName: string | null;
  sharedAt: string;
  expiresAt: string;
}

const LOCATIONS_WITH_GEOMETRY_QUERY = `
  query LocationsWithGeometry($level: Int) {
    locations(level: $level) {
      id name pCode ancestorIds geometry
    }
  }
`;

interface GqlLocationWithGeometry {
  id: string;
  name: string;
  pCode: string | null;
  ancestorIds: string[];
  geometry: unknown;
}

async function fetchSudanL0(): Promise<{ id: string; geometry: unknown } | null> {
  let res: Response;
  try {
    res = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: LOCATIONS_WITH_GEOMETRY_QUERY, variables: { level: 0 } }),
      next: { revalidate: 3600 },
    });
  } catch { return null; }
  if (!res.ok) return null;
  const json = (await res.json()) as { data?: { locations: GqlLocationWithGeometry[] } | null };
  const locations = json?.data?.locations ?? [];
  return locations.find((l) => l.pCode === "SD" || l.name === "Sudan") ?? null;
}

async function fetchA1Boundaries(sudanId: string): Promise<AdminBoundary[]> {
  let res: Response;
  try {
    res = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: LOCATIONS_WITH_GEOMETRY_QUERY, variables: { level: 1 } }),
      next: { revalidate: 3600 },
    });
  } catch { return []; }
  if (!res.ok) return [];
  const json = (await res.json()) as { data?: { locations: GqlLocationWithGeometry[] } | null };
  const locations = json?.data?.locations ?? [];
  return locations
    .filter((l) => l.ancestorIds.includes(sudanId))
    .map((l) => ({ id: l.id, name: l.name, geometry: l.geometry }));
}

async function fetchPublicEvent(eventId: string, token: string): Promise<PublicEvent | null> {
  const query = `
    query PublicEvent($eventId: String!, $token: String!) {
      publicEvent(eventId: $eventId, token: $token) {
        id title description severity validFrom validTo types
        primaryLocationName primaryLocationCoords
        signalPoints { name lng lat }
        populationAffected populationDisplaced
        locationPopulation locationPopulationLevel locationPopulationName
        locationIdp locationIdpLevel locationIdpName
        sharedAt expiresAt
      }
    }
  `;

  let res: Response;
  try {
    res = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { eventId, token } }),
      next: { revalidate: 300 },
    });
  } catch {
    return null;
  }

  if (!res.ok) return null;
  const json = (await res.json()) as { data?: { publicEvent: PublicEvent | null } | null } | null;
  return json?.data?.publicEvent ?? null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export default async function PublicEventPage({
  params,
}: {
  params: Promise<{ eventId: string; token: string }>;
}) {
  const { eventId, token } = await params;
  const [event, sudan] = await Promise.all([
    fetchPublicEvent(eventId, token),
    fetchSudanL0(),
  ]);

  if (!event) notFound();

  const adminBoundaries = sudan ? await fetchA1Boundaries(sudan.id) : [];

  const sevTier = mapSeverity(event.severity);
  const sevCol = severityColor(event.severity);

  const title = event.title ?? event.primaryLocationName ?? `CLEAR Event ${event.id}`;

  const affectedNum = event.populationAffected ? Number(event.populationAffected) : null;
  const displacedNum = event.populationDisplaced ? Number(event.populationDisplaced) : null;

  const firstSignalPoint = event.signalPoints[0] ?? null;
  const markerCoords: [number, number] | null =
    event.primaryLocationCoords ??
    (firstSignalPoint ? [firstSignalPoint.lng, firstSignalPoint.lat] : null);
  const mapCenter: [number, number] = markerCoords ?? [30, 15];
  const mapZoom = markerCoords ? 7 : 4.5;
  const disasterPills = getDisasterPills(event.types);
  const disasterL2Pills = getDisasterL2Pills(event.types);

  return (
    <Box style={{ minHeight: "100vh", background: "var(--color-bg-primary)" }}>
      <PublicEventHeader title={title} />

      {/* Header - matches private event page header styling */}
      <Box
        px={24}
        pt={20}
        pb={20}
        style={{
          background: "var(--color-bg-white)",
          borderBottom: "1px solid var(--color-border)",
          borderInlineStart: `4px solid ${sevCol}`,
        }}
      >
        {/* Severity badge */}
        <Group gap={6} mb={10}>
          <span
            style={{
              display: "inline-block",
              padding: "2px 10px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase" as const,
              background:
                sevTier === "critical"
                  ? "var(--color-critical-light)"
                  : sevTier === "low"
                    ? "var(--color-success-light)"
                    : "var(--color-warning-light)",
              color:
                sevTier === "critical"
                  ? "var(--color-critical)"
                  : sevTier === "low"
                    ? "var(--color-success)"
                    : "var(--color-warning)",
            }}
          >
            {sevTier}
          </span>
        </Group>

        {/* Title */}
        <Text fw={700} c="var(--color-text-primary)" style={{ fontSize: 22, lineHeight: 1.3 }} mb={10}>
          {title}
        </Text>

        {/* Type pills */}
        <Group gap={6} mb={14} wrap="wrap">
          {disasterPills.map((pill) => (
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
          {disasterL2Pills.map((pill) => (
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
          {event.primaryLocationName && (
            <Group gap={4}>
              <IconMapPin size={13} color="var(--color-text-muted)" />
              <Text size="xs" c="var(--color-text-secondary)" fw={500}>
                {event.primaryLocationName}
              </Text>
            </Group>
          )}
          <Group gap={4}>
            <IconCalendar size={13} color="var(--color-text-muted)" />
            <Text size="xs" c="var(--color-text-secondary)">
              {formatDate(event.validFrom)} - {formatDate(event.validTo)}
            </Text>
          </Group>
        </Group>
      </Box>

      {/* KPI strip */}
      <Box px={24} pt={24}>
        <PublicKpiStrip
          affected={affectedNum}
          displaced={displacedNum}
          locationPopulation={event.locationPopulation ? Number(event.locationPopulation) : null}
          locationPopulationName={event.locationPopulationName}
          locationIdp={event.locationIdp ? Number(event.locationIdp) : null}
          locationIdpName={event.locationIdpName}
        />
      </Box>

      {/* Two-column body */}
      <Box p={24} style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
        {/* Left column */}
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Stack gap={20}>
            {/* Summary */}
            {event.description && (
              <Card p={0} style={{ border: "1px solid var(--color-border)" }}>
                <Box px={16} py={12} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 14 }}>
                    Summary
                  </Text>
                </Box>
                <Box p={16}>
                  <Text size="sm" c="var(--color-text-secondary)" style={{ lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
                    {event.description}
                  </Text>
                </Box>
              </Card>
            )}

            {/* Details */}
            <Card p={0} style={{ border: "1px solid var(--color-border)" }}>
              <Box px={16} py={12} style={{ borderBottom: "1px solid var(--color-border)" }}>
                <Text fw={600} c="var(--color-text-primary)" style={{ fontSize: 14 }}>
                  Details
                </Text>
              </Box>
              <Box p={16}>
                <Stack gap={12}>
                  <Fact label="Valid period" value={`${formatDate(event.validFrom)} - ${formatDate(event.validTo)}`} />
                  <Fact label="Shared on" value={formatDateTime(event.sharedAt)} />
                  <Fact label="Link expires" value={formatDateTime(event.expiresAt)} />
                </Stack>
              </Box>
            </Card>
          </Stack>
        </Box>

        {/* Right column */}
        <Box style={{ width: 300, flexShrink: 0 }}>
          <PublicEventMap
            center={mapCenter}
            zoom={mapZoom}
            markerCoords={markerCoords}
            markerSeverity={sevTier}
            locationName={event.primaryLocationName}
            sudanGeometry={sudan?.geometry ?? null}
            adminBoundaries={adminBoundaries}
          />
        </Box>
      </Box>

      <Text
        size="xs"
        c="var(--color-text-muted)"
        ta="center"
        py={32}
        className="public-event-footer-note"
      >
        Generated by the CLEAR platform - a snapshot of public event data - sharing this URL grants view access until the link expires.
      </Text>

      <style>{`
        @media print {
          @page { margin: 14mm 12mm; }
          .public-event-header { display: none !important; }
          .public-event-footer-note { color: #555 !important; }
          .public-map-canvas { display: none !important; }
          .public-map-snapshot { display: block !important; }
          body { background: white !important; }
        }
      `}</style>
    </Box>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <Group justify="space-between" wrap="nowrap" gap={16}>
      <Text size="sm" c="var(--color-text-muted)" style={{ flexShrink: 0 }}>
        {label}
      </Text>
      <Text size="sm" fw={500} ta="right" style={{ color: "var(--color-text-primary)" }}>
        {value}
      </Text>
    </Group>
  );
}
