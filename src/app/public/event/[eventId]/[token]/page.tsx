import { notFound } from "next/navigation";
import { Box, Stack, Text, Group, Badge, Card } from "@mantine/core";
import { GRAPHQL_URL } from "~/server/env";
import { getDisasterLabel } from "~/lib/disaster-types";
import { mapSeverity, severityColor } from "~/lib/types/graphql";
import { severityColors, severityLabels } from "~/lib/constants/severity";
import { PublicEventHeader } from "./_components/public-event-header";

/**
 * Shape of the cached snapshot returned by clear-api's
 * `publicEvent(eventId, token)` query. Kept in sync with the
 * GraphQL `PublicEvent` type.
 */
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
  populationAffected: string | null;
  populationDisplaced: string | null;
  sharedAt: string;
  expiresAt: string;
}

/**
 * Fetch the public snapshot directly from clear-api — no cookie, no
 * cross-call retry. The page is unauthenticated so we deliberately
 * avoid going through the tRPC client; this lets the page render even
 * when the visitor has no CLEAR session at all.
 */
async function fetchPublicEvent(
  eventId: string,
  token: string,
): Promise<PublicEvent | null> {
  const query = `
    query PublicEvent($eventId: String!, $token: String!) {
      publicEvent(eventId: $eventId, token: $token) {
        id
        title
        description
        severity
        validFrom
        validTo
        types
        primaryLocationName
        primaryLocationCoords
        populationAffected
        populationDisplaced
        sharedAt
        expiresAt
      }
    }
  `;

  let res: Response;
  try {
    res = await fetch(GRAPHQL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        variables: { eventId, token },
      }),
      // Public snapshots are immutable inside Redis for their TTL,
      // so a short fetch cache is a free latency win for popular
      // links. Revalidate every 5 min so revocations propagate quickly.
      next: { revalidate: 300 },
    });
  } catch {
    return null;
  }

  if (!res.ok) return null;
  const json = (await res.json()) as {
    data?: { publicEvent: PublicEvent | null } | null;
  } | null;
  return json?.data?.publicEvent ?? null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatNumber(s: string | null): string | null {
  if (!s) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return new Intl.NumberFormat(undefined).format(n);
}

export default async function PublicEventPage({
  params,
}: {
  params: Promise<{ eventId: string; token: string }>;
}) {
  const { eventId, token } = await params;
  const event = await fetchPublicEvent(eventId, token);

  if (!event) {
    notFound();
  }

  const sevTier = mapSeverity(event.severity);
  const sevCol = severityColor(event.severity);
  const sevBg = severityColors[sevTier]?.bg ?? "var(--color-bg-muted)";
  const sevLabel = severityLabels[sevTier] ?? "Unknown";

  const populationAffected = formatNumber(event.populationAffected);
  const populationDisplaced = formatNumber(event.populationDisplaced);

  const title =
    event.title ?? event.primaryLocationName ?? `CLEAR Event ${event.id}`;

  return (
    <Box style={{ minHeight: "100vh", background: "var(--color-bg-primary)" }}>
      <PublicEventHeader title={title} />

      <Box
        className="public-event-body"
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "32px 24px 64px",
        }}
      >
        <Stack gap={20}>
          {/* Title block */}
          <Stack gap={8}>
            <Group gap={8}>
              <Badge
                size="md"
                style={{
                  background: sevBg,
                  color: sevCol,
                  fontWeight: 700,
                }}
              >
                {sevLabel}
              </Badge>
              {event.types.slice(0, 3).map((t) => (
                <Badge
                  key={t}
                  size="md"
                  variant="light"
                  color="gray"
                  style={{ fontWeight: 500 }}
                >
                  {getDisasterLabel(t)}
                </Badge>
              ))}
            </Group>
            <Text
              fz={28}
              fw={700}
              lh={1.2}
              style={{ color: "var(--color-text-primary)" }}
            >
              {title}
            </Text>
            {event.primaryLocationName && (
              <Text size="sm" c="var(--color-text-muted)">
                {event.primaryLocationName}
              </Text>
            )}
          </Stack>

          {/* Description */}
          {event.description && (
            <Card
              p={20}
              radius="md"
              style={{
                border: "1px solid var(--color-border)",
                background: "var(--color-bg-white)",
              }}
            >
              <Text
                size="md"
                style={{
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.6,
                  color: "var(--color-text-primary)",
                }}
              >
                {event.description}
              </Text>
            </Card>
          )}

          {/* Facts */}
          <Card
            p={20}
            radius="md"
            style={{
              border: "1px solid var(--color-border)",
              background: "var(--color-bg-white)",
            }}
          >
            <Stack gap={12}>
              <Fact
                label="Valid period"
                value={`${formatDate(event.validFrom)} — ${formatDate(event.validTo)}`}
              />
              {populationAffected && (
                <Fact label="Population affected" value={populationAffected} />
              )}
              {populationDisplaced && (
                <Fact label="Population displaced" value={populationDisplaced} />
              )}
              <Fact label="Shared on" value={formatDateTime(event.sharedAt)} />
              <Fact
                label="Link expires"
                value={formatDateTime(event.expiresAt)}
              />
            </Stack>
          </Card>

          <Text
            size="xs"
            c="var(--color-text-muted)"
            ta="center"
            mt={8}
            className="public-event-footer-note"
          >
            Generated by the CLEAR platform · A snapshot of public event data ·
            Sharing this URL grants the recipient view access until the link
            expires.
          </Text>
        </Stack>
      </Box>

      {/* Print-specific styles — strip the header/buttons, widen the body,
          drop the dark backgrounds for ink-friendly output. */}
      <style>{`
        @media print {
          @page { margin: 14mm 12mm; }
          .public-event-header { display: none !important; }
          .public-event-footer-note { color: #555 !important; }
          .public-event-body { padding: 0 !important; max-width: 100% !important; }
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
      <Text
        size="sm"
        fw={500}
        ta="right"
        style={{ color: "var(--color-text-primary)" }}
      >
        {value}
      </Text>
    </Group>
  );
}
