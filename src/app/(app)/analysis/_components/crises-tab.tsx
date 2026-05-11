"use client";

import { Box, Group, Loader, Stack, Text } from "@mantine/core";
import { api } from "~/trpc/react";
import type { GqlCrisis } from "~/server/api/routers/crises";
import { EventListCard } from "~/components/detection/event-list-card";

/* ── Helpers ─────────────────────────────────────────────────────── */

function matchesCountry(
  location: { name: string; ancestors?: Array<{ name: string }> } | null | undefined,
  country: string,
): boolean {
  if (!location) return false;
  const needle = country.toLowerCase();
  if (location.name.toLowerCase().includes(needle)) return true;
  return (location.ancestors ?? []).some((a) => a.name.toLowerCase().includes(needle));
}

function latestCrisisDate(crisis: GqlCrisis): number {
  const dates = (crisis.events ?? []).map((e) =>
    "lastSignalCreatedAt" in e && e.lastSignalCreatedAt
      ? new Date(e.lastSignalCreatedAt as string).getTime()
      : 0,
  );
  return dates.length ? Math.max(...dates) : 0;
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

function severityDot(severity: number | null) {
  const level = severity ?? 0;
  const color =
    level >= 4
      ? "var(--color-critical)"
      : level === 3
        ? "var(--color-warning)"
        : "var(--color-text-muted)";
  return (
    <Box
      style={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
        marginTop: 3,
      }}
    />
  );
}

/* ── Crisis row ──────────────────────────────────────────────────── */

function CrisisRow({ crisis }: { crisis: GqlCrisis }) {
  const latest = latestCrisisDate(crisis);
  const date = latest > 0 ? relativeTime(new Date(latest).toISOString()) : null;

  return (
    <Box
      p="10px 14px"
      style={{ border: "1px solid var(--color-border)", background: "var(--color-bg-white)" }}
    >
      <Group gap={10} align="flex-start" wrap="nowrap">
        {severityDot(crisis.severity)}
        <Box style={{ minWidth: 0, flex: 1 }}>
          <Group gap={8} justify="space-between" wrap="nowrap">
            <Text
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: "var(--color-text-primary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {crisis.title ?? "Untitled crisis"}
            </Text>
            {date && (
              <Text style={{ fontSize: 11, color: "var(--color-text-muted)", flexShrink: 0 }}>
                {date}
              </Text>
            )}
          </Group>
          {crisis.summary && (
            <Text
              style={{
                fontSize: 12,
                color: "var(--color-text-secondary)",
                marginTop: 3,
                lineHeight: 1.4,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {crisis.summary}
            </Text>
          )}
          {crisis.events?.length ? (
            <Text style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 5 }}>
              {crisis.events.length} event{crisis.events.length !== 1 ? "s" : ""}
            </Text>
          ) : null}
        </Box>
      </Group>
    </Box>
  );
}

/* ── Section heading ─────────────────────────────────────────────── */

function SectionHeading({ label, count }: { label: string; count: number }) {
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: 600,
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        color: "var(--color-text-muted)",
        marginBottom: 12,
      }}
    >
      {label} · {count}
    </Text>
  );
}

/* ── Main component ──────────────────────────────────────────────── */

interface CrisesTabProps {
  countryLabel: string;
}

export function CrisesTab({ countryLabel }: CrisesTabProps) {
  const { data: allCrises, isLoading: crisesLoading } = api.crises.list.useQuery();
  const { data: allEvents, isLoading: eventsLoading } = api.events.list.useQuery();

  const crises = (allCrises ?? [])
    .filter((c) => matchesCountry(c.generalLocation, countryLabel))
    .sort((a, b) => latestCrisisDate(b) - latestCrisisDate(a));

  const events = (allEvents ?? []).filter(
    (e) =>
      matchesCountry(e.generalLocation, countryLabel) ||
      matchesCountry(e.originLocation, countryLabel) ||
      matchesCountry(e.destinationLocation, countryLabel),
  );

  if (crisesLoading || eventsLoading) {
    return (
      <Box py={40} style={{ display: "flex", justifyContent: "center" }}>
        <Loader size="sm" />
      </Box>
    );
  }

  return (
    <Stack gap={32}>
      {/* Crises */}
      <Box>
        <SectionHeading label="Crises" count={crises.length} />
        {crises.length === 0 ? (
          <Text style={{ fontSize: 13, color: "var(--color-text-muted)" }}>
            No crises found for {countryLabel}.
          </Text>
        ) : (
          <Stack gap={8}>
            {crises.map((c) => (
              <CrisisRow key={c.id} crisis={c} />
            ))}
          </Stack>
        )}
      </Box>

      {/* Events — uses the same list component as the Detection page */}
      <Box>
        <SectionHeading label="Events" count={events.length} />
        <EventListCard
          events={events}
          loading={eventsLoading}
          defaultSortOrder="newest"
        />
      </Box>
    </Stack>
  );
}
