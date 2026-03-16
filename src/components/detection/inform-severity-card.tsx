"use client";

import { Box, Text, Group, Skeleton } from "@mantine/core";
import { IconChartBar } from "@tabler/icons-react";
import { api } from "~/trpc/react";

const INFORM_COLORS = {
  5: { accent: "#DC2626", badge: "#FEF2F2", badgeBorder: "#FECACA", badgeText: "#DC2626" },
  4: { accent: "#EA580C", badge: "#FFF7ED", badgeBorder: "#FED7AA", badgeText: "#EA580C" },
  3: { accent: "#D97706", badge: "#FFFBEB", badgeBorder: "#FDE68A", badgeText: "#D97706" },
  2: { accent: "#16A34A", badge: "#F0FDF4", badgeBorder: "#BBF7D0", badgeText: "#16A34A" },
  1: { accent: "#16A34A", badge: "#F0FDF4", badgeBorder: "#BBF7D0", badgeText: "#16A34A" },
} as const;

function ScoreBar({ value, max = 10, color }: { value: number; max?: number; color: string }) {
  return (
    <Box style={{ height: 3, background: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden" }}>
      <Box style={{ height: "100%", width: `${(value / max) * 100}%`, background: color, borderRadius: 2 }} />
    </Box>
  );
}

interface InformSeverityCardProps {
  country: string;
}

export function InformSeverityCard({ country }: InformSeverityCardProps) {
  const informQuery = api.inform.getSeverity.useQuery(
    { country },
    { staleTime: 1000 * 60 * 60 * 12 },
  );

  const cardLabel = (
    <Group gap={6} mb={16}>
      <Box style={{ color: "#6B7280" }}><IconChartBar size={13} /></Box>
      <Text style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6B7280" }}>
        INFORM Severity
      </Text>
    </Group>
  );

  if (informQuery.isLoading) {
    return (
      <Box style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        {cardLabel}
        <Skeleton height={40} mb={8} radius={4} />
        <Skeleton height={12} width="60%" mb={16} radius={4} />
        <Box style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
          {[0, 1, 2].map((i) => <Skeleton key={i} height={20} radius={4} />)}
        </Box>
      </Box>
    );
  }

  const inform = informQuery.data;

  if (!inform) {
    return (
      <Box style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        {cardLabel}
        <Box style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 11, color: "#6B7280" }}>No data for {country}</Text>
        </Box>
      </Box>
    );
  }

  const catNum = (inform.categoryNumeric ?? 3) as keyof typeof INFORM_COLORS;
  const colors = INFORM_COLORS[catNum] ?? INFORM_COLORS[3];

  return (
    <Box style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {cardLabel}

      {/* score + category */}
      <Group align="flex-end" gap={8} mb={4}>
        <Text style={{
          fontSize: 34, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.03em",
          fontVariantNumeric: "tabular-nums", color: colors.accent,
        }}>
          {inform.score.toFixed(1)}
        </Text>
        <Box mb={4}>
          <Box style={{
            background: colors.badge, border: `1px solid ${colors.badgeBorder}`,
            borderRadius: 4, padding: "2px 7px",
          }}>
            <Text style={{ fontSize: 10, fontWeight: 700, color: colors.badgeText, letterSpacing: "0.04em" }}>
              {inform.category}
            </Text>
          </Box>
        </Box>
      </Group>

      <Text style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 500, marginBottom: 14, lineHeight: 1.3 }}
        lineClamp={2}>
        {inform.crisisName}
      </Text>

      {/* sub-dimension bars */}
      <Box style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          { label: "Impact",     value: inform.impact },
          { label: "Conditions", value: inform.conditions },
          { label: "Complexity", value: inform.complexity },
        ].map(({ label, value }) => (
          <Box key={label}>
            <Group justify="space-between" mb={3}>
              <Text style={{ fontSize: 10, color: "#6B7280", fontWeight: 500 }}>{label}</Text>
              <Text style={{ fontSize: 10, fontWeight: 700, color: "#E5E7EB", fontVariantNumeric: "tabular-nums" }}>
                {value.toFixed(1)}
              </Text>
            </Group>
            <ScoreBar value={value} color={colors.accent} />
          </Box>
        ))}
      </Box>

      {/* footer */}
      <Group justify="space-between" mt={12} align="center">
        <Text style={{ fontSize: 9, color: "#4B5563" }}>
          Updated {inform.lastUpdated}
        </Text>
        <Text style={{ fontSize: 9, color: "#4B5563", fontWeight: 600 }}>
          ACAPS · {inform.month}
        </Text>
      </Group>
    </Box>
  );
}
