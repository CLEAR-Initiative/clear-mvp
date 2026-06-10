"use client";

import Link from "next/link";
import { Box, Text, Group, Badge, Loader } from "@mantine/core";
import { IconLayersIntersect } from "@tabler/icons-react";
import { api } from "~/trpc/react";
import { mapSeverity, severityColor } from "~/lib/types/graphql";
import { severityColors, severityLabels } from "~/lib/constants/severity";
import { resolveLocationName } from "~/lib/location";
import { getDisasterPills } from "~/lib/disaster-types";
import { CardSection } from "~/components/ui";

interface ReportsTabProps {
  selectedCountry: string;
  selectedRegion: string;
  summaryStats: { critical: number; total: number; types: string[] };
  realSituationItems: string[] | null;
}

export function ReportsTab({
  selectedCountry,
  selectedRegion,
  summaryStats,
}: ReportsTabProps) {
  const crisesQuery = api.crises.list.useQuery();
  const crises = crisesQuery.data ?? [];

  const criticalCount = crises.filter((c) => mapSeverity(c.severity) === "critical").length;

  return (
    <Box mb={24}>
      <CardSection
        title="Active Crises"
        subtitle={`${selectedCountry}${selectedRegion !== "All Regions" ? ` - ${selectedRegion}` : ""}`}
        action={
          criticalCount > 0 ? (
            <Badge size="xs" style={{ background: "var(--color-critical-light)", color: "var(--color-critical)" }}>
              {criticalCount} Critical
            </Badge>
          ) : summaryStats.critical > 0 ? (
            <Badge size="xs" style={{ background: "var(--color-critical-light)", color: "var(--color-critical)" }}>
              {summaryStats.critical} Critical
            </Badge>
          ) : null
        }
        noPadding
      >
        {crisesQuery.isLoading && (
          <Box p={32} style={{ display: "flex", justifyContent: "center" }}>
            <Loader size="sm" />
          </Box>
        )}

        {!crisesQuery.isLoading && crises.length > 0 &&
          crises.map((crisis) => {
            const sev = mapSeverity(crisis.severity);
            const colors = severityColors[sev] ?? severityColors.medium!;
            const dotColor = severityColor(crisis.severity);
            const locationName = resolveLocationName(crisis.generalLocation);
            const eventCount = crisis.events?.length ?? 0;
            const allTypes = [...new Set(crisis.events?.flatMap((e) => e.types ?? []) ?? [])];
            const pills = getDisasterPills(allTypes);

            return (
              <Link key={crisis.id} href={`/crisis/${crisis.id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                <Box
                  px={16}
                  py={20}
                  className="hover:bg-[var(--color-bg-muted)]"
                  style={{
                    borderBottom: "1px solid var(--color-border)",
                    display: "flex",
                    gap: 14,
                    cursor: "pointer",
                    transition: "background 120ms ease-out",
                  }}
                >
                  <Box style={{ width: 12, height: 12, background: dotColor, flexShrink: 0, marginTop: 4 }} />

                  <Box style={{ flex: 1, minWidth: 0 }}>
                    <Group justify="space-between" mb={6} gap={12} align="flex-start">
                      <Text fw={700} size="sm" c="var(--color-text-primary)">
                        {crisis.title ?? "Untitled crisis"}
                      </Text>
                      <Badge
                        size="xs"
                        style={{
                          background: colors.bg,
                          color: colors.text,
                          border: `1px solid ${colors.text}40`,
                          fontWeight: 700,
                          letterSpacing: "0.04em",
                          flexShrink: 0,
                        }}
                      >
                        {severityLabels[sev].toUpperCase()}
                      </Badge>
                    </Group>

                    {locationName && (
                      <Text size="xs" c="var(--color-text-muted)" mb={8}>{locationName}</Text>
                    )}

                    {crisis.summary && (() => {
                      try {
                        const obj = JSON.parse(crisis.summary) as Record<string, unknown>;
                        if (Array.isArray(obj.tldr) && (obj.tldr as unknown[]).length > 0) {
                          return (
                            <Box mb={12}>
                              {(obj.tldr as string[]).map((bullet, i) => (
                                <Group key={i} gap={6} wrap="nowrap" align="flex-start" mb={2}>
                                  <Box style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--color-text-muted)", flexShrink: 0, marginTop: 7 }} />
                                  <Text size="xs" c="var(--color-text-secondary)" style={{ lineHeight: 1.55 }}>{bullet}</Text>
                                </Group>
                              ))}
                            </Box>
                          );
                        }
                      } catch { /* fall through */ }
                      return (
                        <Text size="sm" c="var(--color-text-secondary)" mb={12} style={{ lineHeight: 1.6 }}>
                          {crisis.summary}
                        </Text>
                      );
                    })()}

                    {pills.length > 0 && (
                      <Group gap={6} mb={12}>
                        {pills.map((pill) => (
                          <Badge key={pill.label} size="xs" style={{ background: pill.bg, color: pill.color, fontWeight: 600, fontSize: 10 }}>
                            {pill.label}
                          </Badge>
                        ))}
                      </Group>
                    )}

                    <Group gap={6} align="center">
                      <IconLayersIntersect size={13} color="var(--color-text-muted)" />
                      <Text size="xs" c="var(--color-text-muted)" fw={500}>
                        {eventCount} {eventCount === 1 ? "event" : "events"}
                      </Text>
                    </Group>
                  </Box>
                </Box>
              </Link>
            );
          })
        }

        {!crisesQuery.isLoading && crises.length === 0 && (
          <Box p={32} style={{ textAlign: "center" }}>
            <Text size="sm" c="var(--color-text-muted)">No active crises.</Text>
          </Box>
        )}
      </CardSection>
    </Box>
  );
}
