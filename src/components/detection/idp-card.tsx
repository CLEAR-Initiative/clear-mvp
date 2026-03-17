"use client";

import { Box, Text, Group, Skeleton, Tooltip } from "@mantine/core";
import { IconWifiOff, IconInfoCircle, IconRefresh } from "@tabler/icons-react";
import {
  AreaChart,
  Area,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { api } from "~/trpc/react";

// ISO3 mapping for supported countries
const COUNTRY_ISO3: Record<string, string> = {
  Sudan:        "SDN",
  Ethiopia:     "ETH",
  "South Sudan": "SSD",
  Somalia:      "SOM",
  Yemen:        "YEM",
  Syria:        "SYR",
  Afghanistan:  "AFG",
  Myanmar:      "MMR",
};

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString();
}

function formatMonth(dateStr: unknown): string {
  if (typeof dateStr !== "string") return String(dateStr ?? "");
  const [year, month] = dateStr.split("-");
  if (!year || !month) return dateStr;
  const d = new Date(Number(year), Number(month) - 1, 1);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function freshnessColor(lastUpdated: string): string {
  const days = (Date.now() - new Date(lastUpdated).getTime()) / 86_400_000;
  if (days <= 30) return "#22C55E";
  if (days <= 90) return "#F59E0B";
  return "#EF4444";
}

interface SparkTooltipProps { active?: boolean; payload?: Array<{ value?: number }>; label?: string }
function SparkTooltip({ active, payload, label }: SparkTooltipProps) {
  if (!active || !payload?.[0]) return null;
  return (
    <Box style={{
      background: "#FFFFFF", border: "1px solid #E5E5E5",
      borderRadius: 6, padding: "6px 10px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    }}>
      <Text style={{ color: "#A3A3A3", fontSize: 10 }}>{label != null ? formatMonth(label) : ""}</Text>
      <Text style={{ color: "#171717", fontSize: 12, fontWeight: 700 }}>
        {payload[0].value !== undefined ? formatCount(payload[0].value) : ""}
      </Text>
    </Box>
  );
}

interface IdpCardProps {
  locationCode: string;
}

export function IdpCard({ locationCode }: IdpCardProps) {
  const query = api.hapi.getIdpTrend.useQuery(
    { locationCode },
    { staleTime: 1000 * 60 * 60, retry: 1 },
  );

  const cardLabel = (
    <Text style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#A3A3A3", marginBottom: 16 }}>
      IDP Displacement
    </Text>
  );

  if (query.isLoading) {
    return (
      <Box style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        {cardLabel}
        <Skeleton height={28} mb={8} radius={4} />
        <Skeleton height={12} width="60%" mb={16} radius={4} />
        <Box style={{ flex: 1 }}>
          <Skeleton height="100%" radius={4} />
        </Box>
      </Box>
    );
  }

  if (query.isError) {
    return (
      <Box style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        {cardLabel}
        <Box style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <IconWifiOff size={24} color="#6B7280" />
          <Text style={{ fontSize: 12, color: "#6B7280" }}>Data unavailable</Text>
          <button
            onClick={() => void query.refetch()}
            style={{
              fontSize: 10, fontWeight: 600, color: "#6B7280",
              background: "#F5F5F5", border: "1px solid #E5E5E5",
              borderRadius: 5, padding: "4px 10px", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            <IconRefresh size={10} /> Retry
          </button>
        </Box>
      </Box>
    );
  }

  const data = query.data;

  if (!data?.available) {
    return (
      <Box style={{ height: "100%", display: "flex", flexDirection: "column" }}>
        {cardLabel}
        <Box style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, textAlign: "center" }}>
          <Text style={{ fontSize: 22, color: "rgba(0,0,0,0.1)" }}>&#8862;</Text>
          <Text style={{ fontSize: 13, color: "#525252", fontWeight: 600 }}>No displacement data</Text>
          <Text style={{ fontSize: 11, color: "#737373", lineHeight: 1.4 }}>
            {locationCode} is not tracked in IOM DTM
          </Text>
          {/* TODO: show UNHCR fallback estimate when API access is available */}
          <Text style={{ fontSize: 10, color: "#A3A3A3", fontStyle: "italic", marginTop: 4 }}>
            Coverage varies by country
          </Text>
        </Box>
      </Box>
    );
  }

  const { current, delta, trend, lastUpdated, locationName } = data;
  const dot = freshnessColor(lastUpdated);

  return (
    <Box style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {cardLabel}

      {/* top section */}
      <Group justify="space-between" align="flex-start" mb={4}>
        <Box>
          <Text style={{
            fontSize: 34, fontWeight: 800, color: "#171717", lineHeight: 1,
            fontVariantNumeric: "tabular-nums", letterSpacing: "-0.03em",
          }}>
            {formatCount(current)}
          </Text>
          <Text style={{ fontSize: 11, color: "#737373", marginTop: 3 }}>
            Internally Displaced &middot; {locationName}
          </Text>
        </Box>
        {delta !== null && (
          <Box style={{
            padding: "3px 8px", borderRadius: 5, marginTop: 4,
            background: delta >= 0 ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
            border: `1px solid ${delta >= 0 ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
          }}>
            <Text style={{
              fontSize: 11, fontWeight: 700,
              color: delta >= 0 ? "#22C55E" : "#EF4444",
              fontVariantNumeric: "tabular-nums",
            }}>
              {delta >= 0 ? "+" : ""}{formatCount(Math.abs(delta))}
            </Text>
            <Text style={{ fontSize: 9, color: "#737373" }}>vs last month</Text>
          </Box>
        )}
      </Group>

      {/* sparkline */}
      <Box style={{ flex: 1, minHeight: 60 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trend} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="idpFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stopColor="#E85D3D" stopOpacity={0.8} />
                <stop offset="25%" stopColor="#E85D3D" stopOpacity={0.4} />
                <stop offset="60%" stopColor="#E85D3D" stopOpacity={0.08} />
                <stop offset="100%" stopColor="#E85D3D" stopOpacity={0} />
              </linearGradient>
            </defs>
            <RechartsTooltip content={<SparkTooltip />} />
            <Area
              type="monotone" dataKey="value"
              stroke="#E85D3D" strokeWidth={1.5}
              fill="url(#idpFill)" dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Box>

      {/* footer */}
      <Group justify="space-between" align="center" mt={10}>
        <Group gap={5} align="center">
          <Box style={{ width: 6, height: 6, borderRadius: "50%", background: dot }} />
          <Text style={{ fontSize: 9, color: "#A3A3A3" }}>
            IOM DTM via HAPI &middot; {formatMonth(lastUpdated)}
          </Text>
        </Group>
        <Tooltip
          label={
            <Box style={{ maxWidth: 200 }}>
              <Text size="xs" mb={4}>Conflict-induced displacement only.</Text>
              <Text size="xs" mb={4}>Flood and disaster displacement not included -- not tracked in IOM DTM for this country.</Text>
              <Text size="xs">Data covers IOM DTM monitoring footprint only -- may be incomplete.</Text>
            </Box>
          }
          position="top-end"
          multiline
          withArrow
        >
          <Box style={{ cursor: "help", color: "#A3A3A3", display: "flex" }}>
            <IconInfoCircle size={13} />
          </Box>
        </Tooltip>
      </Group>
    </Box>
  );
}
